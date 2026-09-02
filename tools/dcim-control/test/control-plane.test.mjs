import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  ControlPlaneError,
  appendRuntimeEvent,
  compareMeasuredSummaries,
  controlPaths,
  doctor,
  evaluateDrift,
  executeTask,
  loadJson,
  manifestDigest,
  recordTransport,
  promoteRun,
  reduceState,
  validateManifest,
  verifyRun,
  writeJsonAtomic,
} from '../core.mjs';

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
}

async function makeRepo() {
  const root = await fsp.mkdtemp(path.join(os.tmpdir(), 'dcim-control-test-'));
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

function manifest(root, overrides = {}) {
  const commit = git(root, 'rev-parse', 'HEAD');
  const base = {
    schema_version: 1,
    task_id: 'TEST-TASK-1',
    objective: 'Change one allowed file and verify it deterministically.',
    repository: { base_ref: 'HEAD', expected_commit: commit },
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
    gates: [
      {
        id: 'content',
        command: [
          process.execPath,
          '-e',
          "const fs=require('node:fs');process.exit(fs.readFileSync('allowed.txt','utf8')==='after\\n'?0:7)",
        ],
        timeout_ms: 10_000,
        expected_exit_code: 0,
      },
    ],
    verification: { gates: [
      {
        id: 'content',
        command: [
          process.execPath,
          '-e',
          "const fs=require('node:fs');process.exit(fs.readFileSync('allowed.txt','utf8')==='after\\n'?0:7)",
        ],
        timeout_ms: 10_000,
        expected_exit_code: 0,
      },
    ] },
    promotion: { commit_message: 'test: promote fixture' },
  };
  return { ...base, ...overrides };
}

async function writeManifest(root, value, name = 'task.json') {
  const file = path.join(root, name);
  await writeJsonAtomic(file, value);
  return file;
}

test('manifest requires argv arrays and rejects shell strings', () => {
  const value = manifestObjectWithoutRepo();
  value.writer.command = 'node writer.js';
  assert.throws(() => validateManifest(value), (error) => {
    assert.equal(error.code, 'MANIFEST_INVALID');
    return true;
  });
});

test('manifest rejects transient /private/tmp dependency', () => {
  const value = manifestObjectWithoutRepo();
  value.writer.command = [process.execPath, '/private/tmp/writer.js'];
  assert.throws(() => validateManifest(value), (error) => {
    assert.equal(error.code, 'TRANSIENT_DEPENDENCY_FORBIDDEN');
    return true;
  });
});

test('manifest rejects transient gate dependencies', () => {
  const value = manifestObjectWithoutRepo();
  value.gates[0].command = [process.execPath, '/tmp/gate.js'];
  assert.throws(() => validateManifest(value), (error) => {
    assert.equal(error.code, 'TRANSIENT_DEPENDENCY_FORBIDDEN');
    return true;
  });
});

test('measured-summary comparison ignores stage labels but compares substantive fields', () => {
  const left = {
    mode: 'pre_candidate',
    result: 'PASS',
    file_count: 1,
    total_tests: 63,
    passed_tests: 63,
    failed_tests: 0,
    success: true,
  };
  const right = { ...left, mode: 'candidate' };
  assert.equal(compareMeasuredSummaries(left, right).result, 'PASS');
  right.failed_tests = 1;
  assert.equal(compareMeasuredSummaries(left, right).result, 'FAIL');
});

test('executor creates a deterministic bounded result and verifier passes read-only', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const task = manifest(root);
  const file = await writeManifest(root, task);
  const result = await executeTask(root, file);
  assert.equal(result.execution_state, 'SUCCEEDED');
  assert.deepEqual(result.changed_paths, ['allowed.txt']);
  assert.equal(result.correction_turns_used, 0);
  assert.match(result.artifact.bundle_sha256, /^[0-9a-f]{64}$/);
  assert.equal(await fsp.readFile(path.join(root, 'allowed.txt'), 'utf8'), 'before\n');
  const verification = await verifyRun(root, result.run_id);
  assert.equal(verification.governance_state, 'VERIFIED_PASS');
  assert.equal(verification.read_only_invariants, 'PASS');
  assert.equal(await fsp.readFile(path.join(root, 'allowed.txt'), 'utf8'), 'before\n');
});

test('idempotency reuses an already successful run instead of generating a resume', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const file = await writeManifest(root, manifest(root));
  const first = await executeTask(root, file);
  const second = await executeTask(root, file);
  assert.equal(second.execution_state, 'REUSED');
  assert.equal(second.run_id, first.run_id);
  assert.equal(second.reused, true);
});

test('write allowlist blocks unauthorized modifications', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const value = manifest(root);
  value.task_id = 'TEST-BOUNDARY-1';
  value.writer.command = [
    process.execPath,
    '-e',
    "require('node:fs').writeFileSync('unauthorized.txt','bad\\n')",
  ];
  const file = await writeManifest(root, value, 'boundary.json');
  await assert.rejects(() => executeTask(root, file), (error) => {
    assert.equal(error.code, 'WRITE_BOUNDARY_VIOLATION');
    return true;
  });
  assert.equal(fs.existsSync(path.join(root, 'unauthorized.txt')), false);
});

test('protected path mutation blocks execution', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const value = manifest(root);
  value.task_id = 'TEST-PROTECTED-1';
  value.write_allowlist = ['protected.txt'];
  value.protected_paths = ['allowed.txt'];
  value.writer.command = [
    process.execPath,
    '-e',
    "require('node:fs').writeFileSync('allowed.txt','bad\\n')",
  ];
  const file = await writeManifest(root, value, 'protected.json');
  await assert.rejects(() => executeTask(root, file), (error) => {
    assert.equal(error.code, 'PROTECTED_PATH_MUTATION');
    return true;
  });
  assert.equal(await fsp.readFile(path.join(root, 'allowed.txt'), 'utf8'), 'before\n');
});

test('missing or changed hash-bound input fails before writer execution', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const value = manifest(root);
  value.task_id = 'TEST-INPUT-1';
  value.inputs = [{ path: 'protected.txt', sha256: '0'.repeat(64) }];
  const file = await writeManifest(root, value, 'input.json');
  await assert.rejects(() => executeTask(root, file), (error) => {
    assert.equal(error.code, 'INPUT_HASH_MISMATCH');
    return true;
  });
});

test('bounded correction consumes at most two correction turns', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const value = manifest(root);
  value.task_id = 'TEST-CORRECTION-1';
  value.budgets.correction_turns = 2;
  value.writer.command = [
    process.execPath,
    '-e',
    "const fs=require('node:fs');const t=Number(process.env.DCIM_TURN);fs.writeFileSync('allowed.txt',t===3?'after\\n':`turn-${t}\\n`)",
  ];
  const file = await writeManifest(root, value, 'correction.json');
  const result = await executeTask(root, file);
  assert.equal(result.execution_state, 'SUCCEEDED');
  assert.equal(result.correction_turns_used, 2);
  assert.equal(result.writer_results.length, 3);
});

test('drift guard blocks nested repair chains and control-artifact spirals', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const taskId = 'T06-REPAIR-RESUME-CORRECTION';
  let result = await evaluateDrift(root, taskId);
  assert.equal(result.result, 'BLOCK');
  assert.ok(result.reasons.includes('NESTED_REPAIR_DEPTH_EXCEEDED'));

  const other = 'TASK-SPIRAL-1';
  await appendRuntimeEvent(root, 'CONTROL_ARTIFACT_CREATED', other, {});
  await appendRuntimeEvent(root, 'CONTROL_ARTIFACT_CREATED', other, {});
  await appendRuntimeEvent(root, 'CONTROL_ARTIFACT_CREATED', other, {});
  result = await evaluateDrift(root, other);
  assert.equal(result.result, 'BLOCK');
  assert.ok(result.reasons.includes('CONTROL_ARTIFACT_SPIRAL'));
});

test('transport ledger blocks requesting the same digest twice', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const digest = 'a'.repeat(64);
  await recordTransport(root, 'TASK-TRANSPORT-1', 'requested', digest);
  await assert.rejects(
    () => recordTransport(root, 'TASK-TRANSPORT-1', 'requested', digest),
    (error) => {
      assert.equal(error.code, 'DUPLICATE_TRANSPORT_BLOCKED');
      return true;
    },
  );
});

test('event reduction keeps execution, governance, and transport states independent', () => {
  const events = [
    { schema_version: 1, type: 'EXECUTION_STARTED', task_id: 'T', observed_at: '1', payload: { run_id: 'r' } },
    { schema_version: 1, type: 'EXECUTION_SUCCEEDED', task_id: 'T', observed_at: '2', payload: { run_id: 'r' } },
    { schema_version: 1, type: 'TRANSPORT_HASH_VERIFIED', task_id: 'T', observed_at: '3', payload: { artifact_sha256: 'b'.repeat(64) } },
    { schema_version: 1, type: 'VERIFICATION_SUCCEEDED', task_id: 'T', observed_at: '4', payload: { verification_id: 'v' } },
  ];
  const state = reduceState(events).tasks.T;
  assert.equal(state.execution_state, 'SUCCEEDED');
  assert.equal(state.governance_state, 'VERIFIED_PASS');
  assert.equal(state.transport_state, 'HASH_VERIFIED');
});


test('principal promotion creates an isolated branch and atomically records canonical acceptance', async (t) => {
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
  const value = manifest(root);
  value.task_id = 'TEST-PROMOTION-1';
  value.capabilities.git_mutation = true;
  const file = await writeManifest(root, value, 'promotion.json');
  const result = await executeTask(root, file);
  await verifyRun(root, result.run_id);
  const promotion = await promoteRun(root, result.run_id, {
    principal: 'Daniel Test',
    email: 'daniel-test@example.invalid',
    accept: `${value.task_id}:${result.run_id}`,
  });
  assert.equal(promotion.governance_state, 'PRINCIPAL_ACCEPTED');
  assert.match(promotion.commit_sha, /^[0-9a-f]{40}$/);
  assert.equal(await fsp.readFile(path.join(root, 'allowed.txt'), 'utf8'), 'before\n');
  const acceptedLedger = git(root, 'show', `${promotion.branch}:.dcim/state/events.jsonl`);
  assert.match(acceptedLedger, /PRINCIPAL_ACCEPTED/);
  assert.equal(git(root, 'show', `${promotion.branch}:allowed.txt`), 'after');
});

test('doctor verifies durable runtime and manifest binding', async (t) => {
  const root = await makeRepo();
  t.after(() => fsp.rm(root, { recursive: true, force: true }));
  const file = await writeManifest(root, manifest(root));
  const report = await doctor(root, file);
  assert.equal(report.result, 'PASS');
  assert.ok(report.checks.some((check) => check.id === 'durable-runtime-path' && check.result === 'PASS'));
});

function manifestObjectWithoutRepo() {
  return {
    schema_version: 1,
    task_id: 'TEST-MANIFEST-1',
    objective: 'Validate a deliberately synthetic control-plane manifest.',
    repository: { base_ref: 'HEAD' },
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
    writer: { mode: 'command', command: [process.execPath, '-e', 'process.exit(0)'] },
    gates: [{ id: 'pass', command: [process.execPath, '-e', 'process.exit(0)'] }],
  };
}
