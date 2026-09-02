import path from 'node:path';
import {
  ControlPlaneError,
  appendJsonlDurable,
  assertSupportedCapabilities,
  canonicalJson,
  loadJson,
  sha256File,
} from './base.mjs';
import {
  addWorktree,
  changedPaths,
  enforcePathBoundary,
  git,
  removeWorktree,
  runGates,
  snapshotChangedFileHashes,
} from './git.mjs';
import { runProcess } from './process.mjs';
import {
  appendRuntimeEvent,
  controlPaths,
  newEvent,
  regenerateCanonicalState,
} from './state.mjs';
import { findRun } from './artifacts.mjs';

export async function promoteRun(repoRoot, runId, options) {
  const { runDir, result, manifest } = await findRun(repoRoot, runId);
  assertSupportedCapabilities(manifest);
  const verification = await loadJson(path.join(runDir, 'verification.json'));
  if (verification.governance_state !== 'VERIFIED_PASS') {
    throw new ControlPlaneError('VERIFICATION_REQUIRED', 'Promotion requires VERIFIED_PASS');
  }
  const expectedToken = `${manifest.task_id}:${runId}`;
  if (options.accept !== expectedToken) {
    throw new ControlPlaneError('PRINCIPAL_ACCEPTANCE_MISMATCH', 'Exact acceptance token mismatch', {
      expected: expectedToken,
    });
  }
  if (typeof options.principal !== 'string' || options.principal.trim().length < 2) {
    throw new ControlPlaneError('PRINCIPAL_REQUIRED', 'Principal identity is required');
  }
  if (!manifest.capabilities.git_mutation) {
    throw new ControlPlaneError(
      'GIT_MUTATION_NOT_AUTHORIZED',
      'Manifest does not authorize atomic branch promotion',
    );
  }
  const safeTask = manifest.task_id.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  const branch = `dcim/promote/${safeTask}-${runId.slice(-12)}`;
  const worktree = path.join(controlPaths(repoRoot).worktrees, result.idempotency_key, 'promotion');
  const patchPath = path.join(runDir, 'patch.diff');
  let promotionSucceeded = false;
  let promotionBranchCreated = false;
  try {
    await addWorktree(repoRoot, worktree, result.base_commit, { branch });
    promotionBranchCreated = true;
    const apply = await runProcess(['git', 'apply', '--index', '--whitespace=error-all', patchPath], {
      cwd: worktree,
      label: 'git apply promotion patch',
    });
    if (apply.exit_code !== 0) {
      throw new ControlPlaneError('PROMOTION_PATCH_APPLY_FAILED', 'Promotion patch could not be applied', {
        stderr: apply.stderr,
      });
    }
    const changed = await changedPaths(worktree);
    enforcePathBoundary(changed, manifest);
    if (canonicalJson(changed) !== canonicalJson(result.changed_paths)) {
      throw new ControlPlaneError('PATCH_PATH_SET_MISMATCH', 'Promotion patch path set differs from execution result', {
        expected: result.changed_paths,
        observed: changed,
      });
    }
    const beforeHashes = await snapshotChangedFileHashes(worktree, changed);
    const promotionGates = manifest.promotion?.gates ?? manifest.verification?.gates ?? manifest.gates;
    const gateResults = await runGates(
      promotionGates,
      worktree,
      { task_id: manifest.task_id, run_id: runId, worktree },
      'promotion',
    );
    if (gateResults.some((gate) => gate.timed_out)) {
      throw new ControlPlaneError('PROCESS_TIMEOUT', 'Promotion gate timed out');
    }
    if (!gateResults.every((gate) => gate.result === 'PASS')) {
      throw new ControlPlaneError('PROMOTION_GATES_FAILED', 'Promotion gates failed');
    }
    const afterChanged = await changedPaths(worktree);
    enforcePathBoundary(afterChanged, manifest);
    const afterHashes = await snapshotChangedFileHashes(worktree, afterChanged);
    if (canonicalJson(beforeHashes) !== canonicalJson(afterHashes)) {
      throw new ControlPlaneError('PROMOTION_GATE_MUTATION', 'Promotion gates changed frozen product bytes', {
        before: beforeHashes,
        after: afterHashes,
      });
    }
    const canonicalEvent = newEvent('PRINCIPAL_ACCEPTED', manifest.task_id, {
      run_id: runId,
      principal: options.principal,
      branch,
      accepted_patch_sha256: await sha256File(patchPath),
    });
    await appendJsonlDurable(path.join(worktree, '.dcim', 'state', 'events.jsonl'), canonicalEvent);
    await regenerateCanonicalState(worktree);
    await git(worktree, ['add', '--all']);
    const commitMessage = manifest.promotion?.commit_message ?? `chore(dcim): promote ${manifest.task_id}`;
    const commit = await git(worktree, ['commit', '-m', commitMessage], {
      env: {
        GIT_AUTHOR_NAME: options.principal,
        GIT_COMMITTER_NAME: options.principal,
        GIT_AUTHOR_EMAIL: options.email ?? 'principal@localhost',
        GIT_COMMITTER_EMAIL: options.email ?? 'principal@localhost',
      },
    });
    const commitSha = (await git(worktree, ['rev-parse', 'HEAD'])).stdout.trim();
    await appendRuntimeEvent(repoRoot, 'PRINCIPAL_ACCEPTED', manifest.task_id, {
      run_id: runId,
      principal: options.principal,
      branch,
      commit_sha: commitSha,
    });
    promotionSucceeded = true;
    return {
      task_id: manifest.task_id,
      run_id: runId,
      governance_state: 'PRINCIPAL_ACCEPTED',
      branch,
      commit_sha: commitSha,
      commit_stdout: commit.stdout,
      gate_results: gateResults,
    };
  } finally {
    await removeWorktree(repoRoot, worktree).catch(() => {});
    if (promotionBranchCreated && !promotionSucceeded) {
      await git(repoRoot, ['branch', '-D', branch], { allowFailure: true });
    }
  }
}

