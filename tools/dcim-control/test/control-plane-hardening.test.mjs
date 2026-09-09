import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  doctor,
  executeTask,
  promoteRun,
  sha256Bytes,
  validateManifest,
  verifyRun,
  writeJsonAtomic,
} from '../core.mjs';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

async function makeRepo() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'dcim-control-hardening-'));
  git(root, 'init', '-q');
  git(root, 'config', 'user.name', 'DCIM Test');
  git(root, 'config', 'user.email', 'dcim-test@example.invalid');
  await fsp.writeFile(path.join(root, '.gitignore'), '.dcim/runtime/\n', 'utf8');
  await fsp.writeFile(path.join(root, 'allowed.txt'), 'before\n', 'utf8');
  await fsp.writeFile(path.join(root, 'protected.txt'), 'protected\n', 'utf8');
  await fsp.mkdir(path.join(root, '.dcim', 'policy'), { recursive: true });
  await writeJsonAtomic(path.join(root, '.dcim', 'policy', 'drift-policy.json'), {
    max_control_artifacts_without_product_delta: 2,
    max_duplicate_digest_requests: 1,
    max_repair_depth: 2,
    max_approval_requests_per_task: 2,
    max_same_scope_correction_turns: 2,
  });
  git(root, 'add', '.gitignore', 'allowed.txt', 'protected.txt', '.dcim/policy/drift-policy.json');
  git(root, 'commit', '-qm', 'fixture');
  return root;
}

function manifest(root, taskId) {
  return {
    schema_version: 1,
    task_id: taskId,
    objective: 'Exercise one hardened DCIM control-plane boundary deterministically.',
    repository: { base_ref: 'HEAD', expected_commit: git(root, 'rev-parse', 'HEAD') },
    inputs: [],
    write_allowlist: ['allowed.txt'],
    protected_paths: ['protected.txt'],
    capabilities: {
      network: false,
      git_mutation: false,
      sockets: false,
      dependency_install: false,
      publication: false,
    },
    budgets: { correction_turns: 0 },
    writer: {
      mode: 'command',
      command: [process.execPath, '-e', "require('node:fs').writeFileSync('allowed.txt','after\\n')"],
      timeout_ms: 10_000,
    },
    gates: [{
      id: 'content',
      command: [
        process.execPath,
        '-e',
        "const fs=require('node:fs');process.exit(fs.readFileSync('allowed.txt','utf8')==='after\\n'?0:7)",
      ],
      timeout_ms: 10_000,
      expected_exit_code: 0,
    }],
    verification: { gates: [{
      id: 'content',
      command: [
        process.execPath,
        '-e',
        "const fs=require('node:fs');process.exit(fs.readFileSync('allowed.txt','utf8')==='after\\n'?0:7)",
      ],
      timeout_ms: 10_000,
      expected_exit_code: 0,
    }] },
    promotion: { commit_message: 'test: promote hardened fixture' },
  };
}

async function writeManifest(root, value, name) {
  const file = path.join(root, name);
  await writeJsonAtomic(file, value);
  return file;
}

test('manifest rejects unknown nested properties rather than silently ignoring them', () => {
  const value = {
    schema_version: 1,
    task_id: 'TEST-NESTED-1',
    objective: 'Reject an unknown nested manifest property.',
    repository: { base_ref: 'HEAD', unexpected: true },
    write_allowlist: ['allowed.txt'],
    protected_paths: ['protected.txt'],
    capabilities: {
      network: false,
      git_mutation: false,
      sockets: false,
      dependency_install: false,
      publication: false,
    },
    budgets: { correction_turns: 0 },
    writer: { mode: 'none' },
    gates: [{ id: 'pass', command: [process.execPath, '-e', 'process.exit(0)'] }],
  };
  assert.throws(() => validateManifest(value), (error) => {
    assert.equal(error.code, 'MANIFEST_INVALID');
    assert.match(error.message, /Unknown repository property/);
    return true;
  });
});

test('unqualified host capabilities fail closed before execution', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const value = manifest(root, 'TEST-CAPABILITY-1');
  value.capabilities.network = true;
  const file = await writeManifest(root, value, 'capability.json');
  await assert.rejects(() => executeTask(root, file), (error) => {
    assert.equal(error.code, 'HOST_CONTAINMENT_NOT_QUALIFIED');
    assert.deepEqual(error.details.unsupported_capabilities, ['network']);
    return true;
  });
  const report = await doctor(root, file);
  assert.equal(report.result, 'FAIL');
  assert.ok(report.checks.some((check) => check.id === 'host-containment-boundary' && check.result === 'FAIL'));
});

test('hash-bound inputs are verified in the exact base worktree, not from a dirty host copy', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const expected = sha256Bytes('protected\n');
  await fsp.writeFile(path.join(root, 'protected.txt'), 'host-dirty-but-preserved\n', 'utf8');
  const value = manifest(root, 'TEST-BASE-INPUT-1');
  value.inputs = [{ path: 'protected.txt', sha256: expected }];
  const file = await writeManifest(root, value, 'base-input.json');
  const result = await executeTask(root, file);
  assert.equal(result.execution_state, 'SUCCEEDED');
  assert.equal(await fsp.readFile(path.join(root, 'protected.txt'), 'utf8'), 'host-dirty-but-preserved\n');
});

test('writer Git mutation is detected inside its disposable worktree', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const value = manifest(root, 'TEST-GIT-MUTATION-1');
  value.writer.command = ['git', 'commit', '--allow-empty', '-m', 'unauthorized writer commit'];
  const file = await writeManifest(root, value, 'git-mutation.json');
  await assert.rejects(() => executeTask(root, file), (error) => {
    assert.equal(error.code, 'UNAUTHORIZED_GIT_MUTATION');
    return true;
  });
  assert.equal(git(root, 'rev-list', '--count', 'HEAD'), '1');
});

test('canonical repository mutation by a writer is detected and never reported as success', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const value = manifest(root, 'TEST-CANONICAL-MUTATION-1');
  value.writer.command = [
    process.execPath,
    '-e',
    "const fs=require('node:fs');const path=require('node:path');const cp=require('node:child_process');fs.writeFileSync('allowed.txt','after\\n');const common=cp.execFileSync('git',['rev-parse','--git-common-dir'],{encoding:'utf8'}).trim();const canonical=path.dirname(path.resolve(common));fs.writeFileSync(path.join(canonical,'protected.txt'),'corrupt\\n')",
  ];
  const file = await writeManifest(root, value, 'canonical-mutation.json');
  await assert.rejects(() => executeTask(root, file), (error) => {
    assert.equal(error.code, 'CANONICAL_REPOSITORY_MUTATION');
    return true;
  });
});

test('failed promotion removes its temporary branch after worktree cleanup', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  await fsp.mkdir(path.join(root, '.dcim', 'state'), { recursive: true });
  await fsp.writeFile(
    path.join(root, '.dcim', 'state', 'events.jsonl'),
    JSON.stringify({
      schema_version: 1,
      event_id: 'bootstrap',
      observed_at: '2026-09-02T00:00:00.000Z',
      type: 'CONTROL_PLANE_BOOTSTRAPPED',
      task_id: 'HARNESS-1',
      payload: {},
    }) + '\n',
    'utf8',
  );
  await writeJsonAtomic(path.join(root, '.dcim', 'state', 'current.generated.json'), {
    schema_version: 1,
    generated_at: '2026-09-02T00:00:00.000Z',
    tasks: {},
    artifacts: {},
  });
  git(root, 'add', '.dcim/state/events.jsonl', '.dcim/state/current.generated.json');
  git(root, 'commit', '-qm', 'add canonical state');
  const value = manifest(root, 'TEST-PROMOTION-FAIL-1');
  value.repository.expected_commit = git(root, 'rev-parse', 'HEAD');
  value.capabilities.git_mutation = true;
  value.promotion = {
    commit_message: 'test: should not be created',
    gates: [{ id: 'fail', command: [process.execPath, '-e', 'process.exit(9)'] }],
  };
  const file = await writeManifest(root, value, 'promotion-fail.json');
  const result = await executeTask(root, file);
  await verifyRun(root, result.run_id);
  const expectedBranch = `dcim/promote/${value.task_id.toLowerCase()}-${result.run_id.slice(-12)}`;
  await assert.rejects(
    () => promoteRun(root, result.run_id, {
      principal: 'Daniel Test',
      email: 'daniel-test@example.invalid',
      accept: `${value.task_id}:${result.run_id}`,
    }),
    (error) => {
      assert.equal(error.code, 'PROMOTION_GATES_FAILED');
      return true;
    },
  );
  assert.equal(git(root, 'branch', '--list', expectedBranch), '');
});
// H1A v0.1.2 canonical-lifecycle hardening.
test('H1A native lifecycle bounded model accepts exactly one complete ordering', async () => {
  const { runBoundedLifecycleModelCheck } = await import('../lib/promotion-lifecycle.mjs');
  const result = runBoundedLifecycleModelCheck();
  assert.equal(result.result, 'PASS');
  assert.equal(result.permutations_checked, 5040);
  assert.equal(result.accepted_orderings, 1);
  assert.equal(result.rejected_orderings, 5039);
  assert.equal(result.duplicate_event_test, 'PASS');
});

test('H1A lifecycle event identities are deterministic and reduce to complete accepted state', async () => {
  const {
    buildAcceptedLifecycle,
    assertCompleteAcceptedLifecycle,
    validateLedgerEvents,
  } = await import('../lib/promotion-lifecycle.mjs');
  const { reduceState } = await import('../lib/state.mjs');
  const taskId = 'TEST-H1A-LIFECYCLE-1';
  const runId = 'run-1';
  const runtime = (type, suffix, observedAt) => ({
    schema_version: 1,
    event_id: `runtime-${suffix}`,
    observed_at: observedAt,
    type,
    task_id: taskId,
    payload: { run_id: runId },
  });
  const runtimeEvidence = {
    execution_started: runtime('EXECUTION_STARTED', 'start', '2026-09-04T00:00:00.000Z'),
    execution_succeeded: runtime('EXECUTION_SUCCEEDED', 'success', '2026-09-04T00:00:01.000Z'),
    transport_present: runtime('TRANSPORT_PRESENT', 'transport', '2026-09-04T00:00:02.000Z'),
    verification_succeeded: runtime('VERIFICATION_SUCCEEDED', 'verify', '2026-09-04T00:00:03.000Z'),
  };
  const result = {
    task_id: taskId,
    run_id: runId,
    idempotency_key: 'a'.repeat(64),
    manifest_sha256: 'b'.repeat(64),
    base_commit: 'c'.repeat(40),
    runtime_fingerprint: { sha256: 'd'.repeat(64) },
    artifact: { bundle_sha256: 'e'.repeat(64) },
    changed_paths: ['allowed.txt'],
    changed_file_sha256: { 'allowed.txt': 'f'.repeat(64) },
  };
  const verification = {
    task_id: taskId,
    run_id: runId,
    verification_id: 'verify-1',
    governance_state: 'VERIFIED_PASS',
    read_only_invariants: 'PASS',
  };
  const args = {
    result,
    verification,
    runtimeEvidence,
    principal: 'Daniel Test',
    branch: 'dcim/promote/test',
    acceptedAt: '2026-09-04T12:00:00.000Z',
    patchSha256: '1'.repeat(64),
    resultSha256: '2'.repeat(64),
    verificationSha256: '3'.repeat(64),
    artifactVerification: { bundle_sha256: 'e'.repeat(64), files: { 'patch.diff': '1'.repeat(64) } },
  };
  const first = buildAcceptedLifecycle(args);
  const second = buildAcceptedLifecycle(args);
  assert.deepEqual(first, second);
  validateLedgerEvents(first, { requireCompleteNative: true });
  assert.equal(assertCompleteAcceptedLifecycle(first, taskId, runId).length, 7);
  const state = reduceState(first);
  assert.equal(state.tasks[taskId].execution_state, 'SUCCEEDED');
  assert.equal(state.tasks[taskId].governance_state, 'PRINCIPAL_ACCEPTED');
  assert.equal(state.tasks[taskId].transport_state, 'CONSUMED');
  assert.equal(state.tasks[taskId].latest_run_id, runId);
  assert.equal(state.generated_at, first.at(-1).observed_at);
});

test('H1A state validation rejects duplicate IDs and illegal native transition order', async () => {
  const {
    NATIVE_ACCEPTED_LIFECYCLE_PROFILE,
    NATIVE_ACCEPTED_LIFECYCLE_ORDER,
    validateLedgerEvents,
  } = await import('../lib/promotion-lifecycle.mjs');
  const make = (type, index) => ({
    schema_version: 1,
    event_id: `event-${index}`,
    observed_at: new Date(Date.parse('2026-09-04T00:00:00.000Z') + index).toISOString(),
    type,
    task_id: 'TEST-H1A-INVALID-1',
    payload: {
      lifecycle_profile: NATIVE_ACCEPTED_LIFECYCLE_PROFILE,
      lifecycle_sequence: index,
      lifecycle_event_count: 7,
      run_id: 'run-1',
    },
  });
  const valid = NATIVE_ACCEPTED_LIFECYCLE_ORDER.map((type, index) => make(type, index + 1));
  const duplicate = structuredClone(valid);
  duplicate[6].event_id = duplicate[0].event_id;
  assert.throws(
    () => validateLedgerEvents(duplicate, { requireCompleteNative: true }),
    (error) => error.code === 'EVENT_ID_DUPLICATE',
  );
  const outOfOrder = structuredClone(valid);
  [outOfOrder[2], outOfOrder[3]] = [outOfOrder[3], outOfOrder[2]];
  assert.throws(
    () => validateLedgerEvents(outOfOrder, { requireCompleteNative: true }),
    (error) => error.code === 'NATIVE_LIFECYCLE_TRANSITION_INVALID',
  );
});

test('H1A promotion creates exact lifecycle, exact staged path set, and idempotent reuse', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  await fsp.mkdir(path.join(root, '.dcim', 'state'), { recursive: true });
  await fsp.writeFile(
    path.join(root, '.dcim', 'state', 'events.jsonl'),
    JSON.stringify({
      schema_version: 1,
      event_id: 'bootstrap',
      observed_at: '2026-09-02T00:00:00.000Z',
      type: 'CONTROL_PLANE_BOOTSTRAPPED',
      task_id: 'HARNESS-1',
      payload: {},
    }) + '\n',
    'utf8',
  );
  await writeJsonAtomic(path.join(root, '.dcim', 'state', 'current.generated.json'), {
    schema_version: 1,
    generated_at: '2026-09-02T00:00:00.000Z',
    tasks: {},
    artifacts: {},
  });
  git(root, 'add', '.dcim/state/events.jsonl', '.dcim/state/current.generated.json');
  git(root, 'commit', '-qm', 'add canonical state');
  const base = git(root, 'rev-parse', 'HEAD');
  const value = manifest(root, 'TEST-H1A-PROMOTION-1');
  value.repository.expected_commit = base;
  value.capabilities.git_mutation = true;
  const file = await writeManifest(root, value, 'h1a-promotion.json');
  const result = await executeTask(root, file);
  await verifyRun(root, result.run_id);
  const first = await promoteRun(root, result.run_id, {
    principal: 'Daniel Test',
    email: 'daniel-test@example.invalid',
    accept: `${value.task_id}:${result.run_id}`,
  });
  assert.equal(first.promotion_state, 'CREATED');
  assert.equal(first.reused, false);
  const state = JSON.parse(git(root, 'show', `${first.commit_sha}:.dcim/state/current.generated.json`));
  assert.equal(state.tasks[value.task_id].execution_state, 'SUCCEEDED');
  assert.equal(state.tasks[value.task_id].governance_state, 'PRINCIPAL_ACCEPTED');
  assert.equal(state.tasks[value.task_id].transport_state, 'CONSUMED');
  const changed = git(root, 'diff', '--name-only', '-z', '--no-renames', base, first.commit_sha)
    .split('\u0000')
    .filter(Boolean)
    .sort();
  assert.deepEqual(changed, [
    '.dcim/state/current.generated.json',
    '.dcim/state/events.jsonl',
    'allowed.txt',
  ]);
  assert.throws(
    () => git(root, 'show', `${first.commit_sha}:.dcim/promotions/${value.task_id}.json`),
  );
  const second = await promoteRun(root, result.run_id, {
    principal: 'Daniel Test',
    email: 'daniel-test@example.invalid',
    accept: `${value.task_id}:${result.run_id}`,
  });
  assert.equal(second.promotion_state, 'REUSED');
  assert.equal(second.reused, true);
  assert.equal(second.commit_sha, first.commit_sha);
});

test('H1A promotion rehashes stored artifact bytes before branch creation', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  await fsp.mkdir(path.join(root, '.dcim', 'state'), { recursive: true });
  await fsp.writeFile(path.join(root, '.dcim', 'state', 'events.jsonl'), '', 'utf8');
  await writeJsonAtomic(path.join(root, '.dcim', 'state', 'current.generated.json'), {
    schema_version: 1, generated_at: null, tasks: {}, artifacts: {},
  });
  git(root, 'add', '.dcim/state/events.jsonl', '.dcim/state/current.generated.json');
  git(root, 'commit', '-qm', 'add canonical state');
  const value = manifest(root, 'TEST-H1A-ARTIFACT-TAMPER-1');
  value.repository.expected_commit = git(root, 'rev-parse', 'HEAD');
  value.capabilities.git_mutation = true;
  const file = await writeManifest(root, value, 'h1a-tamper.json');
  const result = await executeTask(root, file);
  await verifyRun(root, result.run_id);
  await fsp.writeFile(path.join(result.artifact.artifact_dir, 'patch.diff'), 'tampered\n', 'utf8');
  await assert.rejects(
    () => promoteRun(root, result.run_id, {
      principal: 'Daniel Test',
      accept: `${value.task_id}:${result.run_id}`,
    }),
    (error) => error.code === 'ARTIFACT_FILE_HASH_MISMATCH',
  );
  assert.equal(git(root, 'branch', '--list', `dcim/promote/${value.task_id.toLowerCase()}-${result.run_id.slice(-12)}`), '');
});

test('H1A promotion refuses gate-created extra paths and removes the temporary branch', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  await fsp.mkdir(path.join(root, '.dcim', 'state'), { recursive: true });
  await fsp.writeFile(path.join(root, '.dcim', 'state', 'events.jsonl'), '', 'utf8');
  await writeJsonAtomic(path.join(root, '.dcim', 'state', 'current.generated.json'), {
    schema_version: 1, generated_at: null, tasks: {}, artifacts: {},
  });
  git(root, 'add', '.dcim/state/events.jsonl', '.dcim/state/current.generated.json');
  git(root, 'commit', '-qm', 'add canonical state');
  const value = manifest(root, 'TEST-H1A-GATE-PATH-1');
  value.repository.expected_commit = git(root, 'rev-parse', 'HEAD');
  value.capabilities.git_mutation = true;
  value.promotion = {
    commit_message: 'test: must not commit',
    gates: [{
      id: 'extra-path',
      command: [process.execPath, '-e', "require('node:fs').writeFileSync('extra.txt','bad\\n')"],
      timeout_ms: 10_000,
      expected_exit_code: 0,
    }],
  };
  const file = await writeManifest(root, value, 'h1a-extra-path.json');
  const result = await executeTask(root, file);
  await verifyRun(root, result.run_id);
  const expectedBranch = `dcim/promote/${value.task_id.toLowerCase()}-${result.run_id.slice(-12)}`;
  await assert.rejects(
    () => promoteRun(root, result.run_id, {
      principal: 'Daniel Test',
      accept: `${value.task_id}:${result.run_id}`,
    }),
    (error) => error.code === 'PROMOTION_GATE_PATH_MUTATION',
  );
  assert.equal(git(root, 'branch', '--list', expectedBranch), '');
});


test('H1A state reduction rejects an event without event_id', async () => {
  const { reduceState } = await import('../lib/state.mjs');
  assert.throws(
    () => reduceState([{
      schema_version: 1,
      observed_at: '2026-09-04T00:00:00.000Z',
      type: 'EXECUTION_STARTED',
      task_id: 'TEST-H1A-MISSING-ID-1',
      payload: { run_id: 'run-1' },
    }]),
    (error) => error.code === 'LIFECYCLE_INVALID' && /event_id/.test(error.message),
  );
});

test('H1A state reduction rejects an event with invalid observed_at', async () => {
  const { reduceState } = await import('../lib/state.mjs');
  assert.throws(
    () => reduceState([{
      schema_version: 1,
      event_id: 'fixture-invalid-observed-at',
      observed_at: 'not-a-date',
      type: 'EXECUTION_STARTED',
      task_id: 'TEST-H1A-INVALID-TIME-1',
      payload: { run_id: 'run-1' },
    }]),
    (error) => error.code === 'LIFECYCLE_INVALID' && /observed_at/.test(error.message),
  );
});
