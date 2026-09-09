import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  ControlPlaneError,
  assertSupportedCapabilities,
  canonicalJson,
  loadJson,
  manifestDigest,
  sha256File,
  writeJsonAtomic,
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
  readJsonl,
  regenerateCanonicalState,
} from './state.mjs';
import { findRun } from './artifacts.mjs';
import {
  CANONICAL_LEDGER_PATH,
  CANONICAL_STATE_PATH,
  appendAcceptedLifecycleAtomic,
  assertAcceptedTaskState,
  assertCompleteAcceptedLifecycle,
  assertPromotionEvidenceBindings,
  buildAcceptedLifecycle,
  selectRuntimePromotionEvidence,
  verifyContentAddressedArtifact,
} from './promotion-lifecycle.mjs';

const RUNTIME_PROMOTION_RECORD = 'promotion.json';

function fail(code, message, details = {}) {
  throw new ControlPlaneError(code, message, details);
}

async function readOptionalJson(filePath) {
  let text;
  try {
    text = await fsp.readFile(filePath, 'utf8');
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    fail('PROMOTION_RECORD_INVALID', 'Runtime promotion record contains invalid JSON', {
      path: filePath,
      cause: error.message,
    });
  }
}

function promotionBranch(taskId, runId) {
  const safeTask = taskId.toLowerCase().replace(/[^a-z0-9._-]+/g, '-');
  return `dcim/promote/${safeTask}-${runId.slice(-12)}`;
}

async function branchHead(repoRoot, branch) {
  const ref = await git(repoRoot, ['show-ref', '--verify', '--hash', `refs/heads/${branch}`], {
    allowFailure: true,
  });
  return ref.exit_code === 0 ? ref.stdout.trim() : null;
}

async function reusePromotionIfPresent(
  repoRoot,
  runDir,
  result,
  manifest,
  verification,
  branch,
  patchSha256,
  resultSha256,
  verificationSha256,
  artifactSha256,
) {
  const recordPath = path.join(runDir, RUNTIME_PROMOTION_RECORD);
  const record = await readOptionalJson(recordPath);
  const existingHead = await branchHead(repoRoot, branch);
  if (!record) {
    if (existingHead) {
      fail('PROMOTION_BRANCH_CONFLICT', 'Promotion branch exists without a matching runtime promotion record', {
        branch,
        existing_head: existingHead,
      });
    }
    return null;
  }
  const expected = {
    task_id: result.task_id,
    run_id: result.run_id,
    base_commit: result.base_commit,
    branch,
    manifest_sha256: manifestDigest(manifest),
    patch_sha256: patchSha256,
    result_sha256: resultSha256,
    verification_sha256: verificationSha256,
    artifact_sha256: artifactSha256,
    verification_id: verification.verification_id,
  };
  for (const [key, value] of Object.entries(expected)) {
    if (record[key] !== value) {
      fail('PROMOTION_REUSE_CONFLICT', `Runtime promotion record differs at ${key}`, {
        expected: value,
        observed: record[key],
      });
    }
  }
  if (!/^[0-9a-f]{40}$/.test(record.commit_sha ?? '') || existingHead !== record.commit_sha) {
    fail('PROMOTION_REUSE_CONFLICT', 'Recorded promotion commit is missing or branch head differs', {
      recorded_commit: record.commit_sha,
      branch_head: existingHead,
    });
  }
  const parent = (await git(repoRoot, ['rev-parse', `${record.commit_sha}^`])).stdout.trim();
  if (parent !== result.base_commit) {
    fail('PROMOTION_REUSE_CONFLICT', 'Recorded promotion commit has an unexpected parent', {
      expected_parent: result.base_commit,
      observed_parent: parent,
    });
  }
  const observedTree = (await git(repoRoot, ['rev-parse', `${record.commit_sha}^{tree}`])).stdout.trim();
  if (record.commit_tree !== observedTree) {
    fail('PROMOTION_REUSE_CONFLICT', 'Recorded promotion tree differs from the branch commit', {
      recorded_tree: record.commit_tree,
      observed_tree: observedTree,
    });
  }
  const stateText = (await git(repoRoot, [
    'show',
    `${record.commit_sha}:${CANONICAL_STATE_PATH}`,
  ])).stdout;
  const state = JSON.parse(stateText);
  assertAcceptedTaskState(state, result.task_id, result.run_id);
  return {
    task_id: result.task_id,
    run_id: result.run_id,
    governance_state: 'PRINCIPAL_ACCEPTED',
    promotion_state: 'REUSED',
    reused: true,
    branch,
    commit_sha: record.commit_sha,
    commit_tree: record.commit_tree,
    gate_results: record.gate_results ?? [],
  };
}

export async function promoteRun(repoRoot, runId, options) {
  const { runDir, result, manifest } = await findRun(repoRoot, runId);
  assertSupportedCapabilities(manifest);
  const verificationPath = path.join(runDir, 'verification.json');
  const resultPath = path.join(runDir, 'result.json');
  const patchPath = path.join(runDir, 'patch.diff');
  const verification = await loadJson(verificationPath);
  if (verification.governance_state !== 'VERIFIED_PASS' || verification.read_only_invariants !== 'PASS') {
    fail('VERIFICATION_REQUIRED', 'Promotion requires VERIFIED_PASS with read-only invariants PASS');
  }
  const expectedToken = `${manifest.task_id}:${runId}`;
  if (options.accept !== expectedToken) {
    fail('PRINCIPAL_ACCEPTANCE_MISMATCH', 'Exact acceptance token mismatch', {
      expected: expectedToken,
    });
  }
  if (typeof options.principal !== 'string' || options.principal.trim().length < 2) {
    fail('PRINCIPAL_REQUIRED', 'Principal identity is required');
  }
  if (!manifest.capabilities.git_mutation) {
    fail('GIT_MUTATION_NOT_AUTHORIZED', 'Manifest does not authorize atomic branch promotion');
  }

  const patchSha256 = await sha256File(patchPath);
  const resultSha256 = await sha256File(resultPath);
  const verificationSha256 = await sha256File(verificationPath);
  const paths = controlPaths(repoRoot);
  const artifactDir = path.join(paths.artifacts, result.artifact?.bundle_sha256 ?? 'missing');
  const artifactVerification = await verifyContentAddressedArtifact(artifactDir, result.artifact);
  const runtimeEvents = await readJsonl(paths.runtimeEvents, { allowMissing: false });
  const runtimeEvidence = selectRuntimePromotionEvidence(
    runtimeEvents,
    result,
    verification,
    patchSha256,
  );
  assertPromotionEvidenceBindings({
    manifest,
    result,
    verification,
    patchSha256,
    runtimeEvidence,
    artifactVerification,
  });

  const branch = promotionBranch(manifest.task_id, runId);
  const existing = await reusePromotionIfPresent(
    repoRoot,
    runDir,
    result,
    manifest,
    verification,
    branch,
    patchSha256,
    resultSha256,
    verificationSha256,
    artifactVerification.bundle_sha256,
  );
  if (existing) return existing;

  const worktree = path.join(paths.worktrees, result.idempotency_key, 'promotion');
  const promotionRecordPath = path.join(runDir, RUNTIME_PROMOTION_RECORD);
  let promotionSucceeded = false;
  let promotionBranchCreated = false;
  let promotionRecordWritten = false;
  try {
    await addWorktree(repoRoot, worktree, result.base_commit, { branch });
    promotionBranchCreated = true;
    const apply = await runProcess(['git', 'apply', '--whitespace=error-all', patchPath], {
      cwd: worktree,
      label: 'git apply promotion patch',
    });
    if (apply.exit_code !== 0) {
      fail('PROMOTION_PATCH_APPLY_FAILED', 'Promotion patch could not be applied', {
        stderr: apply.stderr,
      });
    }

    const productPaths = await changedPaths(worktree);
    enforcePathBoundary(productPaths, manifest);
    if (canonicalJson(productPaths) !== canonicalJson(result.changed_paths)) {
      fail('PATCH_PATH_SET_MISMATCH', 'Promotion product path set differs from execution result', {
        expected: result.changed_paths,
        observed: productPaths,
      });
    }
    const productHashes = await snapshotChangedFileHashes(worktree, productPaths);
    if (canonicalJson(productHashes) !== canonicalJson(result.changed_file_sha256)) {
      fail('PROMOTION_PRODUCT_HASH_MISMATCH', 'Promotion product bytes differ from execution result', {
        expected: result.changed_file_sha256,
        observed: productHashes,
      });
    }

    const acceptedAt = new Date().toISOString();
    const lifecycleEvents = buildAcceptedLifecycle({
      result,
      verification,
      runtimeEvidence,
      principal: options.principal.trim(),
      branch,
      acceptedAt,
      patchSha256,
      resultSha256,
      verificationSha256,
      artifactVerification,
    });
    await appendAcceptedLifecycleAtomic(
      path.join(worktree, CANONICAL_LEDGER_PATH),
      lifecycleEvents,
    );
    const state = await regenerateCanonicalState(worktree);
    assertCompleteAcceptedLifecycle(
      await readJsonl(path.join(worktree, CANONICAL_LEDGER_PATH), { allowMissing: false }),
      manifest.task_id,
      runId,
    );
    const finalTaskState = assertAcceptedTaskState(state, manifest.task_id, runId);

    const expectedFinalPaths = [...new Set([
      ...productPaths,
      CANONICAL_LEDGER_PATH,
      CANONICAL_STATE_PATH,
    ])].sort();
    const finalPaths = await changedPaths(worktree);
    if (canonicalJson(finalPaths) !== canonicalJson(expectedFinalPaths)) {
      fail('PROMOTION_FINAL_PATH_SET_MISMATCH', 'Promotion created an unexpected path set', {
        expected: expectedFinalPaths,
        observed: finalPaths,
      });
    }

    const beforeHashes = await snapshotChangedFileHashes(worktree, finalPaths);
    const promotionGates = manifest.promotion?.gates ?? manifest.verification?.gates ?? manifest.gates;
    const gateResults = await runGates(
      promotionGates,
      worktree,
      { task_id: manifest.task_id, run_id: runId, worktree },
      'promotion',
    );
    if (gateResults.some((gate) => gate.timed_out)) {
      fail('PROCESS_TIMEOUT', 'Promotion gate timed out');
    }
    if (!gateResults.every((gate) => gate.result === 'PASS')) {
      fail('PROMOTION_GATES_FAILED', 'Promotion gates failed', {
        gate_results: gateResults.map(({ id, result, exit_code, timed_out }) => ({
          id,
          result,
          exit_code,
          timed_out,
        })),
      });
    }
    const afterPaths = await changedPaths(worktree);
    if (canonicalJson(afterPaths) !== canonicalJson(finalPaths)) {
      fail('PROMOTION_GATE_PATH_MUTATION', 'Promotion gates changed the final path set', {
        before: finalPaths,
        after: afterPaths,
      });
    }
    const afterHashes = await snapshotChangedFileHashes(worktree, afterPaths);
    if (canonicalJson(beforeHashes) !== canonicalJson(afterHashes)) {
      fail('PROMOTION_GATE_MUTATION', 'Promotion gates changed frozen product or canonical bytes', {
        before: beforeHashes,
        after: afterHashes,
      });
    }

    await git(worktree, ['reset', '--mixed', 'HEAD']);
    await git(worktree, ['add', '--', ...expectedFinalPaths]);
    const staged = await git(worktree, [
      'diff',
      '--cached',
      '--name-only',
      '-z',
      '--no-renames',
      'HEAD',
    ]);
    const stagedPaths = staged.stdout.split('\u0000').filter(Boolean).sort();
    if (canonicalJson(stagedPaths) !== canonicalJson(expectedFinalPaths)) {
      fail('PROMOTION_STAGED_PATH_SET_MISMATCH', 'Git index differs from exact promotion path set', {
        expected: expectedFinalPaths,
        observed: stagedPaths,
      });
    }

    const commitMessage = manifest.promotion?.commit_message ?? `chore(dcim): promote ${manifest.task_id}`;
    const commit = await git(worktree, ['commit', '-m', commitMessage], {
      env: {
        GIT_AUTHOR_NAME: options.principal.trim(),
        GIT_COMMITTER_NAME: options.principal.trim(),
        GIT_AUTHOR_EMAIL: options.email ?? 'principal@localhost',
        GIT_COMMITTER_EMAIL: options.email ?? 'principal@localhost',
      },
    });
    const commitSha = (await git(worktree, ['rev-parse', 'HEAD'])).stdout.trim();
    const commitTree = (await git(worktree, ['rev-parse', 'HEAD^{tree}'])).stdout.trim();
    const promotionRecord = {
      schema_version: 1,
      task_id: manifest.task_id,
      run_id: runId,
      base_commit: result.base_commit,
      branch,
      commit_sha: commitSha,
      commit_tree: commitTree,
      manifest_sha256: manifestDigest(manifest),
      patch_sha256: patchSha256,
      result_sha256: resultSha256,
      verification_sha256: verificationSha256,
      verification_id: verification.verification_id,
      artifact_sha256: artifactVerification.bundle_sha256,
      lifecycle_event_ids: lifecycleEvents.map((event) => event.event_id),
      final_state: {
        execution_state: finalTaskState.execution_state,
        governance_state: finalTaskState.governance_state,
        transport_state: finalTaskState.transport_state,
      },
      changed_paths: expectedFinalPaths,
      gate_results: gateResults.map(({ id, result, exit_code, timed_out }) => ({
        id,
        result,
        exit_code,
        timed_out,
      })),
      promoted_at: acceptedAt,
    };
    await writeJsonAtomic(promotionRecordPath, promotionRecord);
    promotionRecordWritten = true;
    await appendRuntimeEvent(repoRoot, 'PROMOTION_SUCCEEDED', manifest.task_id, {
      run_id: runId,
      branch,
      commit_sha: commitSha,
      commit_tree: commitTree,
      patch_sha256: patchSha256,
    });
    await appendRuntimeEvent(repoRoot, 'PRINCIPAL_ACCEPTED', manifest.task_id, {
      run_id: runId,
      principal: options.principal.trim(),
      branch,
      commit_sha: commitSha,
    });
    promotionSucceeded = true;
    return {
      task_id: manifest.task_id,
      run_id: runId,
      governance_state: 'PRINCIPAL_ACCEPTED',
      promotion_state: 'CREATED',
      reused: false,
      branch,
      commit_sha: commitSha,
      commit_tree: commitTree,
      commit_stdout: commit.stdout,
      gate_results: gateResults,
    };
  } finally {
    await removeWorktree(repoRoot, worktree).catch(() => {});
    if (!promotionSucceeded && promotionRecordWritten) {
      await fsp.rm(promotionRecordPath, { force: true }).catch(() => {});
    }
    if (promotionBranchCreated && !promotionSucceeded) {
      await git(repoRoot, ['branch', '-D', branch], { allowFailure: true });
    }
  }
}
