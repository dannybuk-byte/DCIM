import path from 'node:path';
import {
  ControlPlaneError,
  assertSupportedCapabilities,
  canonicalJson,
  sha256File,
  writeJsonAtomic,
} from './base.mjs';
import {
  addWorktree,
  assertRepositoryInvariants,
  assertWorktreeBaseUnchanged,
  changedPaths,
  enforcePathBoundary,
  removeWorktree,
  runGates,
  snapshotChangedFileHashes,
  snapshotRepositoryInvariants,
} from './git.mjs';
import { runProcess } from './process.mjs';
import { appendRuntimeEvent, controlPaths } from './state.mjs';
import { findRun } from './artifacts.mjs';

export async function verifyRun(repoRoot, runId) {
  const { runDir, result, manifest } = await findRun(repoRoot, runId);
  assertSupportedCapabilities(manifest);
  if (!['SUCCEEDED', 'REUSED'].includes(result.execution_state)) {
    throw new ControlPlaneError('RUN_NOT_VERIFIABLE', 'Only successful executions can be verified');
  }
  const patchPath = path.join(runDir, 'patch.diff');
  const patchHash = await sha256File(patchPath);
  if (result.artifact?.files?.['patch.diff'] && result.artifact.files['patch.diff'] !== patchHash) {
    throw new ControlPlaneError('PATCH_HASH_MISMATCH', 'Frozen patch differs from execution artifact record', {
      expected: result.artifact.files['patch.diff'],
      observed: patchHash,
    });
  }
  const canonicalBefore = await snapshotRepositoryInvariants(repoRoot, manifest.protected_paths);
  const verificationId = `${runId}-verify-${Date.now()}`;
  const worktree = path.join(controlPaths(repoRoot).worktrees, result.idempotency_key, verificationId);
  const context = {
    task_id: manifest.task_id,
    run_id: runId,
    verification_id: verificationId,
    base_commit: result.base_commit,
    worktree,
  };
  await appendRuntimeEvent(repoRoot, 'VERIFICATION_STARTED', manifest.task_id, {
    run_id: runId,
    verification_id: verificationId,
    patch_sha256: patchHash,
  });
  try {
    await addWorktree(repoRoot, worktree, result.base_commit);
    const apply = await runProcess(['git', 'apply', '--index', '--whitespace=error-all', patchPath], {
      cwd: worktree,
      label: 'git apply verifier patch',
    });
    if (apply.exit_code !== 0) {
      throw new ControlPlaneError('PATCH_APPLY_FAILED', 'Verifier could not apply frozen patch', {
        stderr: apply.stderr,
      });
    }
    await assertWorktreeBaseUnchanged(worktree, result.base_commit, 'verification patch apply');
    const beforeChanged = await changedPaths(worktree);
    enforcePathBoundary(beforeChanged, manifest);
    if (canonicalJson(beforeChanged) !== canonicalJson(result.changed_paths)) {
      throw new ControlPlaneError('PATCH_PATH_SET_MISMATCH', 'Verifier patch path set differs from execution result', {
        expected: result.changed_paths,
        observed: beforeChanged,
      });
    }
    const beforeHashes = await snapshotChangedFileHashes(worktree, beforeChanged);
    const gates = manifest.verification?.gates ?? manifest.gates;
    const gateResults = await runGates(gates, worktree, context, 'verification');
    await assertWorktreeBaseUnchanged(worktree, result.base_commit, 'verification gates');
    const afterChanged = await changedPaths(worktree);
    enforcePathBoundary(afterChanged, manifest);
    const afterHashes = await snapshotChangedFileHashes(worktree, afterChanged);
    if (canonicalJson(beforeHashes) !== canonicalJson(afterHashes)) {
      throw new ControlPlaneError('VERIFIER_MUTATED_PATCH', 'Read-only verifier changed product bytes', {
        before: beforeHashes,
        after: afterHashes,
      });
    }
    if (gateResults.some((gate) => gate.timed_out)) {
      throw new ControlPlaneError('PROCESS_TIMEOUT', 'Independent verification gate timed out');
    }
    if (!gateResults.every((gate) => gate.result === 'PASS')) {
      throw new ControlPlaneError('VERIFICATION_GATES_FAILED', 'Independent verification gates failed');
    }
    assertRepositoryInvariants(
      canonicalBefore,
      await snapshotRepositoryInvariants(repoRoot, manifest.protected_paths),
      'independent verification',
    );
    const verification = {
      schema_version: 1,
      task_id: manifest.task_id,
      run_id: runId,
      verification_id: verificationId,
      patch_sha256: patchHash,
      execution_state: 'SUCCEEDED',
      governance_state: 'VERIFIED_PASS',
      read_only_invariants: 'PASS',
      changed_paths: afterChanged,
      gate_results: gateResults,
      completed_at: new Date().toISOString(),
    };
    await writeJsonAtomic(path.join(runDir, 'verification.json'), verification);
    await appendRuntimeEvent(repoRoot, 'VERIFICATION_SUCCEEDED', manifest.task_id, {
      run_id: runId,
      verification_id: verificationId,
      patch_sha256: patchHash,
    });
    return verification;
  } catch (error) {
    let normalized =
      error instanceof ControlPlaneError
        ? error
        : new ControlPlaneError('VERIFICATION_UNEXPECTED_FAILURE', error.message, {
            stack: error.stack,
          });
    try {
      assertRepositoryInvariants(
        canonicalBefore,
        await snapshotRepositoryInvariants(repoRoot, manifest.protected_paths),
        'failed independent verification',
      );
    } catch (invariantError) {
      normalized = new ControlPlaneError(
        invariantError.code,
        invariantError.message,
        { ...invariantError.details, original_failure: { code: normalized.code, message: normalized.message } },
      );
    }
    const verification = {
      schema_version: 1,
      task_id: manifest.task_id,
      run_id: runId,
      verification_id: verificationId,
      patch_sha256: patchHash,
      execution_state: 'FAILED',
      governance_state: 'VERIFIED_FAIL',
      failure: { code: normalized.code, message: normalized.message, details: normalized.details },
      completed_at: new Date().toISOString(),
    };
    await writeJsonAtomic(path.join(runDir, 'verification.json'), verification);
    await appendRuntimeEvent(repoRoot, 'VERIFICATION_FAILED', manifest.task_id, {
      run_id: runId,
      verification_id: verificationId,
      failure_code: normalized.code,
    });
    throw normalized;
  } finally {
    await removeWorktree(repoRoot, worktree).catch(() => {});
  }
}
