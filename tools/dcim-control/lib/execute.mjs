import path from 'node:path';
import {
  ControlPlaneError,
  assertSupportedCapabilities,
  canonicalJson,
  loadJson,
  manifestDigest,
  runtimeFingerprint,
  sha256Bytes,
  validateManifest,
  writeJsonAtomic,
} from './base.mjs';
import {
  addWorktree,
  assertRepositoryInvariants,
  assertWorktreeBaseUnchanged,
  changedPaths,
  createPatch,
  enforcePathBoundary,
  removeWorktree,
  resolveBaseCommit,
  runGates,
  snapshotChangedFileHashes,
  snapshotRepositoryInvariants,
  substituteArgs,
  verifyInputs,
} from './git.mjs';
import { runProcess } from './process.mjs';
import {
  appendRuntimeEvent,
  ensureRuntime,
  evaluateDrift,
  readJsonl,
} from './state.mjs';
import { findRun, persistRunArtifacts } from './artifacts.mjs';

export async function executeTask(repoRoot, manifestPath) {
  const manifest = validateManifest(await loadJson(manifestPath));
  assertSupportedCapabilities(manifest);
  const paths = await ensureRuntime(repoRoot);
  const drift = await evaluateDrift(repoRoot, manifest.task_id);
  if (drift.result === 'BLOCK') {
    throw new ControlPlaneError('DRIFT_GUARD_BLOCK', 'Task blocked by drift guard', drift);
  }
  const baseCommit = await resolveBaseCommit(repoRoot, manifest);
  const digest = manifestDigest(manifest);
  const runtime = await runtimeFingerprint();
  const idempotencyKey = sha256Bytes(`${digest}:${baseCommit}:${runtime.sha256}`);
  const canonicalBefore = await snapshotRepositoryInvariants(repoRoot, manifest.protected_paths);
  const existingEvents = await readJsonl(paths.runtimeEvents);
  const priorSuccess = existingEvents.find(
    (event) =>
      event.type === 'EXECUTION_SUCCEEDED' && event.payload?.idempotency_key === idempotencyKey,
  );
  if (priorSuccess) {
    await appendRuntimeEvent(repoRoot, 'EXECUTION_REUSED', manifest.task_id, {
      run_id: priorSuccess.payload.run_id,
      idempotency_key: idempotencyKey,
    });
    return findRun(repoRoot, priorSuccess.payload.run_id).then(({ result }) => ({
      ...result,
      execution_state: 'REUSED',
      reused: true,
    }));
  }

  const runId = `${manifest.task_id}-${Date.now()}-${idempotencyKey.slice(0, 12)}`;
  const worktree = path.join(paths.worktrees, idempotencyKey, 'writer');
  const runDir = path.join(paths.runtimeRuns, runId);
  const context = {
    task_id: manifest.task_id,
    run_id: runId,
    base_commit: baseCommit,
    worktree,
  };
  await appendRuntimeEvent(repoRoot, 'EXECUTION_STARTED', manifest.task_id, {
    run_id: runId,
    idempotency_key: idempotencyKey,
    manifest_sha256: digest,
    base_commit: baseCommit,
    runtime_fingerprint_sha256: runtime.sha256,
  });

  let writerResults = [];
  let gateResults = [];
  let gateAttempts = [];
  let finalChanged = [];
  let patchText = '';
  try {
    await addWorktree(repoRoot, worktree, baseCommit);
    await verifyInputs(worktree, manifest);
    await assertWorktreeBaseUnchanged(worktree, baseCommit, 'pre-writer binding');
    const maxTurns = 1 + manifest.budgets.correction_turns;
    for (let turn = 1; turn <= maxTurns; turn += 1) {
      if (manifest.writer.mode === 'command') {
        const argv = substituteArgs(manifest.writer.command, { ...context, turn });
        await appendRuntimeEvent(repoRoot, 'WRITER_TURN_STARTED', manifest.task_id, {
          run_id: runId,
          turn,
        });
        const writerResult = await runProcess(argv, {
          cwd: worktree,
          timeoutMs: manifest.writer.timeout_ms ?? 300_000,
          env: {
            DCIM_TASK_ID: manifest.task_id,
            DCIM_RUN_ID: runId,
            DCIM_TURN: String(turn),
            DCIM_CORRECTION_TURN: String(Math.max(0, turn - 1)),
          },
          label: `writer-turn-${turn}`,
        });
        writerResults.push({ turn, argv, ...writerResult });
        await appendRuntimeEvent(repoRoot, 'WRITER_TURN_FINISHED', manifest.task_id, {
          run_id: runId,
          turn,
          exit_code: writerResult.exit_code,
          timed_out: writerResult.timed_out,
        });
        if (writerResult.timed_out) {
          throw new ControlPlaneError('PROCESS_TIMEOUT', `Writer turn ${turn} timed out`, {
            turn,
            timeout_ms: manifest.writer.timeout_ms ?? 300_000,
          });
        }
        if (writerResult.exit_code !== 0) {
          throw new ControlPlaneError('WRITER_FAILED', `Writer turn ${turn} failed`, {
            exit_code: writerResult.exit_code,
            timed_out: writerResult.timed_out,
          });
        }
      }
      await assertWorktreeBaseUnchanged(worktree, baseCommit, `writer turn ${turn}`);
      finalChanged = await changedPaths(worktree);
      enforcePathBoundary(finalChanged, manifest);
      if (finalChanged.length === 0 && !manifest.metadata?.allow_empty_delta) {
        throw new ControlPlaneError('NO_PRODUCT_DELTA', 'Writer produced no file delta');
      }
      gateResults = (await runGates(manifest.gates, worktree, context, 'execution')).map(
        (gate) => ({ ...gate, turn }),
      );
      gateAttempts.push(...gateResults);
      await assertWorktreeBaseUnchanged(worktree, baseCommit, `execution gates turn ${turn}`);
      if (gateResults.some((gate) => gate.timed_out)) {
        throw new ControlPlaneError('PROCESS_TIMEOUT', `Execution gate timed out on turn ${turn}`, {
          gate_results: gateResults.map(({ id, result, exit_code, timed_out }) => ({
            id,
            result,
            exit_code,
            timed_out,
          })),
        });
      }
      const allPass = gateResults.every((gate) => gate.result === 'PASS');
      if (allPass) break;
      if (turn === maxTurns) {
        throw new ControlPlaneError('GATES_FAILED', 'Deterministic gates failed after bounded corrections', {
          gate_results: gateResults.map(({ id, result, exit_code, timed_out }) => ({
            id,
            result,
            exit_code,
            timed_out,
          })),
        });
      }
      await appendRuntimeEvent(repoRoot, 'CORRECTION_TURN_CONSUMED', manifest.task_id, {
        run_id: runId,
        correction_turn: turn,
      });
    }
    finalChanged = await changedPaths(worktree);
    enforcePathBoundary(finalChanged, manifest);
    await assertWorktreeBaseUnchanged(worktree, baseCommit, 'pre-freeze');
    assertRepositoryInvariants(
      canonicalBefore,
      await snapshotRepositoryInvariants(repoRoot, manifest.protected_paths),
      'task execution',
    );
    patchText = await createPatch(worktree, baseCommit, finalChanged);
    if (!patchText && !manifest.metadata?.allow_empty_delta) {
      throw new ControlPlaneError('PATCH_EMPTY', 'Generated patch is empty');
    }
    const fileHashes = await snapshotChangedFileHashes(worktree, finalChanged);
    const result = {
      schema_version: 1,
      task_id: manifest.task_id,
      run_id: runId,
      idempotency_key: idempotencyKey,
      manifest_sha256: digest,
      base_commit: baseCommit,
      runtime_fingerprint: runtime,
      execution_state: 'SUCCEEDED',
      governance_state: 'IMPLEMENTED_UNVERIFIED',
      transport_state: 'PRESENT',
      changed_paths: finalChanged,
      changed_file_sha256: fileHashes,
      correction_turns_used: Math.max(0, writerResults.length - 1),
      writer_results: writerResults,
      gate_results: gateAttempts,
      completed_at: new Date().toISOString(),
    };
    const artifact = await persistRunArtifacts(repoRoot, runDir, {
      'manifest.json': canonicalJson(manifest),
      'result.json': canonicalJson(result),
      'patch.diff': patchText,
      'writer-results.json': canonicalJson(writerResults),
      'gate-results.json': canonicalJson(gateAttempts),
    });
    result.artifact = artifact;
    await writeJsonAtomic(path.join(runDir, 'result.json'), result);
    await appendRuntimeEvent(repoRoot, 'PRODUCT_DELTA_CREATED', manifest.task_id, {
      run_id: runId,
      changed_paths: finalChanged,
      artifact_sha256: artifact.bundle_sha256,
    });
    await appendRuntimeEvent(repoRoot, 'TRANSPORT_PRESENT', manifest.task_id, {
      run_id: runId,
      artifact_sha256: artifact.bundle_sha256,
    });
    await appendRuntimeEvent(repoRoot, 'EXECUTION_SUCCEEDED', manifest.task_id, {
      run_id: runId,
      idempotency_key: idempotencyKey,
      artifact_sha256: artifact.bundle_sha256,
    });
    return result;
  } catch (error) {
    let normalized =
      error instanceof ControlPlaneError
        ? error
        : new ControlPlaneError('UNEXPECTED_FAILURE', error.message, { stack: error.stack });
    try {
      assertRepositoryInvariants(
        canonicalBefore,
        await snapshotRepositoryInvariants(repoRoot, manifest.protected_paths),
        'failed task execution',
      );
    } catch (invariantError) {
      normalized = new ControlPlaneError(
        invariantError.code,
        invariantError.message,
        { ...invariantError.details, original_failure: { code: normalized.code, message: normalized.message } },
      );
    }
    const failure = {
      schema_version: 1,
      task_id: manifest.task_id,
      run_id: runId,
      idempotency_key: idempotencyKey,
      manifest_sha256: digest,
      base_commit: baseCommit,
      runtime_fingerprint: runtime,
      execution_state: normalized.code === 'PROCESS_TIMEOUT' ? 'INTERRUPTED' : 'FAILED',
      governance_state: 'AUTHORIZED',
      transport_state: 'PRESENT',
      failure: { code: normalized.code, message: normalized.message, details: normalized.details },
      writer_results: writerResults,
      gate_results: gateAttempts,
      completed_at: new Date().toISOString(),
    };
    const artifact = await persistRunArtifacts(repoRoot, runDir, {
      'manifest.json': canonicalJson(manifest),
      'result.json': canonicalJson(failure),
      'writer-results.json': canonicalJson(writerResults),
      'gate-results.json': canonicalJson(gateAttempts),
      'partial.patch.diff': patchText,
    });
    failure.artifact = artifact;
    await writeJsonAtomic(path.join(runDir, 'result.json'), failure);
    await appendRuntimeEvent(repoRoot, 'EXECUTION_FAILED', manifest.task_id, {
      run_id: runId,
      idempotency_key: idempotencyKey,
      failure_code: normalized.code,
      artifact_sha256: artifact.bundle_sha256,
      interrupted: normalized.code === 'PROCESS_TIMEOUT',
    });
    throw normalized;
  } finally {
    await removeWorktree(repoRoot, worktree).catch(() => {});
  }
}
