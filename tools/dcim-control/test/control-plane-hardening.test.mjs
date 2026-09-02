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
