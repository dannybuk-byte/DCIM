import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

export class ControlPlaneError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ControlPlaneError';
    this.code = code;
    this.details = details;
  }
}

const EXECUTION_TERMINAL = new Set(['SUCCEEDED', 'FAILED', 'INTERRUPTED', 'REUSED']);
const GOVERNANCE_ORDER = [
  'DRAFT',
  'AUTHORIZED',
  'IMPLEMENTED_UNVERIFIED',
  'VERIFIED_PASS',
  'VERIFIED_FAIL',
  'PRINCIPAL_ACCEPTED',
  'PRINCIPAL_REJECTED',
  'SUPERSEDED',
];

export function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

export function sha256Bytes(value) {
  const bytes = Buffer.isBuffer(value) ? value : Buffer.from(String(value), 'utf8');
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

export async function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const stream = fs.createReadStream(filePath);
  await new Promise((resolve, reject) => {
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
  return hash.digest('hex');
}

export async function loadJson(filePath) {
  let text;
  try {
    text = await fsp.readFile(filePath, 'utf8');
  } catch (error) {
    throw new ControlPlaneError('FILE_UNREADABLE', `Cannot read JSON file: ${filePath}`, {
      cause: error.message,
    });
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new ControlPlaneError('JSON_INVALID', `Invalid JSON: ${filePath}`, {
      cause: error.message,
    });
  }
}

export async function writeJsonAtomic(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const temp = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  const data = canonicalJson(value);
  const handle = await fsp.open(temp, 'wx', 0o600);
  try {
    await handle.writeFile(data, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fsp.rename(temp, filePath);
}

export async function appendJsonlDurable(filePath, value) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const line = `${JSON.stringify(canonicalize(value))}\n`;
  const handle = await fsp.open(filePath, 'a', 0o600);
  try {
    await handle.write(line, null, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
}

export function assertRelativeRepoPath(input, fieldName = 'path') {
  if (typeof input !== 'string' || input.length === 0) {
    throw new ControlPlaneError('MANIFEST_INVALID', `${fieldName} must be a non-empty string`);
  }
  if (path.isAbsolute(input) || input.includes('\\') || input.split('/').includes('..')) {
    throw new ControlPlaneError('UNSAFE_PATH', `${fieldName} must be repository-relative: ${input}`);
  }
  const normalized = path.posix.normalize(input);
  if (normalized === '.' || normalized.startsWith('../') || normalized.startsWith('/')) {
    throw new ControlPlaneError('UNSAFE_PATH', `${fieldName} escapes repository root: ${input}`);
  }
  return normalized;
}

function requireObject(value, name) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ControlPlaneError('MANIFEST_INVALID', `${name} must be an object`);
  }
}

function requireBoolean(value, name) {
  if (typeof value !== 'boolean') {
    throw new ControlPlaneError('MANIFEST_INVALID', `${name} must be boolean`);
  }
}

function validateCommand(command, name, { forbidTransient = false } = {}) {
  if (!Array.isArray(command) || command.length === 0 || !command.every((v) => typeof v === 'string')) {
    throw new ControlPlaneError(
      'MANIFEST_INVALID',
      `${name} must be a non-empty argv array; shell strings are forbidden`,
    );
  }
  const joined = command.join('\u0000');
  if (forbidTransient && (joined.includes('/private/tmp') || joined.includes('/tmp/'))) {
    throw new ControlPlaneError(
      'TRANSIENT_DEPENDENCY_FORBIDDEN',
      `${name} may not depend on transient /tmp paths`,
    );
  }
}

function validateGate(gate, index, prefix = 'gates') {
  requireObject(gate, `${prefix}[${index}]`);
  if (!/^[A-Za-z0-9._-]+$/.test(gate.id ?? '')) {
    throw new ControlPlaneError('MANIFEST_INVALID', `${prefix}[${index}].id is invalid`);
  }
  validateCommand(gate.command, `${prefix}[${index}].command`, { forbidTransient: true });
  if (gate.timeout_ms !== undefined && (!Number.isInteger(gate.timeout_ms) || gate.timeout_ms < 100)) {
    throw new ControlPlaneError('MANIFEST_INVALID', `${prefix}[${index}].timeout_ms is invalid`);
  }
  if (
    gate.expected_exit_code !== undefined &&
    (!Number.isInteger(gate.expected_exit_code) || gate.expected_exit_code < 0)
  ) {
    throw new ControlPlaneError('MANIFEST_INVALID', `${prefix}[${index}].expected_exit_code is invalid`);
  }
}

export function validateManifest(manifest) {
  requireObject(manifest, 'manifest');
  const allowedTop = new Set([
    'schema_version',
    'task_id',
    'objective',
    'repository',
    'inputs',
    'write_allowlist',
    'protected_paths',
    'capabilities',
    'budgets',
    'writer',
    'gates',
    'verification',
    'promotion',
    'metadata',
  ]);
  for (const key of Object.keys(manifest)) {
    if (!allowedTop.has(key)) {
      throw new ControlPlaneError('MANIFEST_INVALID', `Unknown manifest property: ${key}`);
    }
  }
  if (manifest.schema_version !== 1) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'schema_version must equal 1');
  }
  if (!/^[A-Z0-9][A-Z0-9._-]{2,127}$/i.test(manifest.task_id ?? '')) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'task_id must be 3-128 safe characters');
  }
  if (typeof manifest.objective !== 'string' || manifest.objective.trim().length < 8) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'objective must be a substantive string');
  }
  requireObject(manifest.repository, 'repository');
  if (typeof manifest.repository.base_ref !== 'string' || !manifest.repository.base_ref.trim()) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'repository.base_ref is required');
  }
  if (
    manifest.repository.expected_commit !== undefined &&
    !/^[0-9a-f]{40}$/i.test(manifest.repository.expected_commit)
  ) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'repository.expected_commit must be a 40-hex SHA');
  }

  const writeAllowlist = manifest.write_allowlist ?? [];
  const protectedPaths = manifest.protected_paths ?? [];
  if (!Array.isArray(writeAllowlist) || !Array.isArray(protectedPaths)) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'write_allowlist and protected_paths must be arrays');
  }
  const normalizedAllow = writeAllowlist.map((v, i) => assertRelativeRepoPath(v, `write_allowlist[${i}]`));
  const normalizedProtected = protectedPaths.map((v, i) =>
    assertRelativeRepoPath(v, `protected_paths[${i}]`),
  );
  if (new Set(normalizedAllow).size !== normalizedAllow.length) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'write_allowlist contains duplicates');
  }
  if (new Set(normalizedProtected).size !== normalizedProtected.length) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'protected_paths contains duplicates');
  }
  const overlap = normalizedAllow.filter((item) => normalizedProtected.includes(item));
  if (overlap.length) {
    throw new ControlPlaneError('MANIFEST_INVALID', `Paths cannot be both writable and protected: ${overlap}`);
  }

  requireObject(manifest.capabilities, 'capabilities');
  for (const key of ['network', 'git_mutation', 'sockets', 'dependency_install', 'publication']) {
    requireBoolean(manifest.capabilities[key], `capabilities.${key}`);
  }

  requireObject(manifest.budgets, 'budgets');
  if (!Number.isInteger(manifest.budgets.correction_turns) || manifest.budgets.correction_turns < 0 || manifest.budgets.correction_turns > 2) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'budgets.correction_turns must be 0, 1, or 2');
  }

  requireObject(manifest.writer, 'writer');
  if (!['command', 'none'].includes(manifest.writer.mode)) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'writer.mode must be command or none');
  }
  if (manifest.writer.mode === 'command') {
    validateCommand(manifest.writer.command, 'writer.command', { forbidTransient: true });
  }
  if (manifest.writer.timeout_ms !== undefined && (!Number.isInteger(manifest.writer.timeout_ms) || manifest.writer.timeout_ms < 100)) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'writer.timeout_ms is invalid');
  }

  if (!Array.isArray(manifest.gates) || manifest.gates.length === 0) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'gates must contain at least one deterministic gate');
  }
  manifest.gates.forEach((gate, index) => validateGate(gate, index));

  if (manifest.verification !== undefined) {
    requireObject(manifest.verification, 'verification');
    if (manifest.verification.gates !== undefined) {
      if (!Array.isArray(manifest.verification.gates) || manifest.verification.gates.length === 0) {
        throw new ControlPlaneError('MANIFEST_INVALID', 'verification.gates must be a non-empty array');
      }
      manifest.verification.gates.forEach((gate, index) => validateGate(gate, index, 'verification.gates'));
    }
  }

  if (manifest.inputs !== undefined) {
    if (!Array.isArray(manifest.inputs)) {
      throw new ControlPlaneError('MANIFEST_INVALID', 'inputs must be an array');
    }
    for (const [index, input] of manifest.inputs.entries()) {
      requireObject(input, `inputs[${index}]`);
      assertRelativeRepoPath(input.path, `inputs[${index}].path`);
      if (!/^[0-9a-f]{64}$/i.test(input.sha256 ?? '')) {
        throw new ControlPlaneError('MANIFEST_INVALID', `inputs[${index}].sha256 must be 64 hex`);
      }
    }
  }

  const serialized = JSON.stringify(manifest);
  if (serialized.includes('/private/tmp') || serialized.includes('"/tmp/')) {
    throw new ControlPlaneError('TRANSIENT_DEPENDENCY_FORBIDDEN', 'Manifest contains a transient path dependency');
  }

  return {
    ...manifest,
    write_allowlist: normalizedAllow,
    protected_paths: normalizedProtected,
  };
}

export function manifestDigest(manifest) {
  return sha256Bytes(canonicalJson(validateManifest(manifest)));
}

export async function runProcess(argv, options = {}) {
  validateCommand(argv, options.label ?? 'command');
  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const timeoutMs = options.timeoutMs ?? 120_000;
  const child = spawn(argv[0], argv.slice(1), {
    cwd: options.cwd,
    env: { ...process.env, ...(options.env ?? {}) },
    shell: false,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');
  child.stdout.on('data', (chunk) => {
    stdout += chunk;
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk;
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    child.kill('SIGTERM');
    setTimeout(() => child.kill('SIGKILL'), 1_000).unref();
  }, timeoutMs);
  const result = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', (code, signal) => resolve({ code, signal }));
  }).finally(() => clearTimeout(timer));
  return {
    argv,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    duration_ms: Date.now() - startedMs,
    exit_code: result.code,
    signal: result.signal,
    timed_out: timedOut,
    stdout,
    stderr,
  };
}

async function git(repoRoot, args, options = {}) {
  const result = await runProcess(['git', ...args], {
    cwd: repoRoot,
    timeoutMs: options.timeoutMs ?? 120_000,
    env: options.env,
    label: `git ${args[0] ?? ''}`,
  });
  if (!options.allowFailure && result.exit_code !== 0) {
    throw new ControlPlaneError('GIT_COMMAND_FAILED', `git ${args.join(' ')} failed`, {
      exit_code: result.exit_code,
      stderr: result.stderr,
    });
  }
  return result;
}

export async function resolveRepoRoot(cwd = process.cwd()) {
  const result = await runProcess(['git', 'rev-parse', '--show-toplevel'], {
    cwd,
    label: 'git rev-parse --show-toplevel',
  });
  if (result.exit_code !== 0) {
    throw new ControlPlaneError('NOT_A_GIT_REPOSITORY', 'Current directory is not inside a Git repository');
  }
  return result.stdout.trim();
}

export function controlPaths(repoRoot) {
  return {
    root: path.join(repoRoot, '.dcim'),
    runtime: path.join(repoRoot, '.dcim', 'runtime'),
    runtimeEvents: path.join(repoRoot, '.dcim', 'runtime', 'events.jsonl'),
    runtimeRuns: path.join(repoRoot, '.dcim', 'runtime', 'runs'),
    worktrees: path.join(repoRoot, '.dcim', 'runtime', 'worktrees'),
    artifacts: path.join(repoRoot, '.dcim', 'runtime', 'artifacts', 'sha256'),
    canonicalEvents: path.join(repoRoot, '.dcim', 'state', 'events.jsonl'),
    canonicalState: path.join(repoRoot, '.dcim', 'state', 'current.generated.json'),
    driftPolicy: path.join(repoRoot, '.dcim', 'policy', 'drift-policy.json'),
  };
}

export async function ensureRuntime(repoRoot) {
  const paths = controlPaths(repoRoot);
  await Promise.all([
    fsp.mkdir(paths.runtimeRuns, { recursive: true }),
    fsp.mkdir(paths.worktrees, { recursive: true }),
    fsp.mkdir(paths.artifacts, { recursive: true }),
  ]);
  return paths;
}

export function newEvent(type, taskId, payload = {}) {
  return {
    schema_version: 1,
    event_id: crypto.randomUUID(),
    observed_at: new Date().toISOString(),
    type,
    task_id: taskId,
    payload,
  };
}

export async function appendRuntimeEvent(repoRoot, type, taskId, payload = {}) {
  const paths = await ensureRuntime(repoRoot);
  const event = newEvent(type, taskId, payload);
  await appendJsonlDurable(paths.runtimeEvents, event);
  return event;
}

export async function readJsonl(filePath, { allowMissing = true } = {}) {
  let text;
  try {
    text = await fsp.readFile(filePath, 'utf8');
  } catch (error) {
    if (allowMissing && error.code === 'ENOENT') return [];
    throw new ControlPlaneError('EVENT_LEDGER_UNREADABLE', `Cannot read event ledger: ${filePath}`, {
      cause: error.message,
    });
  }
  const events = [];
  for (const [index, line] of text.split(/\n/).entries()) {
    if (!line.trim()) continue;
    try {
      events.push(JSON.parse(line));
    } catch (error) {
      throw new ControlPlaneError('EVENT_LEDGER_INVALID', `Malformed JSONL at line ${index + 1}`, {
        cause: error.message,
      });
    }
  }
  return events;
}

export function reduceState(events) {
  const tasks = {};
  const artifacts = {};
  for (const event of events) {
    if (!event || event.schema_version !== 1 || typeof event.type !== 'string') {
      throw new ControlPlaneError('EVENT_INVALID', 'Event does not conform to schema version 1', { event });
    }
    const taskId = event.task_id ?? 'GLOBAL';
    tasks[taskId] ??= {
      task_id: taskId,
      execution_state: 'CREATED',
      governance_state: 'DRAFT',
      transport_state: 'NOT_MATERIALIZED',
      last_event_at: null,
      run_ids: [],
    };
    const task = tasks[taskId];
    task.last_event_at = event.observed_at;
    switch (event.type) {
      case 'TASK_AUTHORIZED':
        task.governance_state = 'AUTHORIZED';
        break;
      case 'EXECUTION_STARTED':
        task.execution_state = 'RUNNING';
        if (event.payload?.run_id) task.run_ids.push(event.payload.run_id);
        break;
      case 'EXECUTION_SUCCEEDED':
        task.execution_state = 'SUCCEEDED';
        task.governance_state = 'IMPLEMENTED_UNVERIFIED';
        task.latest_run_id = event.payload?.run_id;
        break;
      case 'EXECUTION_REUSED':
        task.execution_state = 'REUSED';
        task.latest_run_id = event.payload?.run_id;
        break;
      case 'EXECUTION_FAILED':
        task.execution_state = event.payload?.interrupted ? 'INTERRUPTED' : 'FAILED';
        task.latest_run_id = event.payload?.run_id;
        break;
      case 'VERIFICATION_SUCCEEDED':
        task.governance_state = 'VERIFIED_PASS';
        task.latest_verification_id = event.payload?.verification_id;
        break;
      case 'VERIFICATION_FAILED':
        task.governance_state = 'VERIFIED_FAIL';
        task.latest_verification_id = event.payload?.verification_id;
        break;
      case 'PRINCIPAL_ACCEPTED':
        task.governance_state = 'PRINCIPAL_ACCEPTED';
        break;
      case 'PRINCIPAL_REJECTED':
        task.governance_state = 'PRINCIPAL_REJECTED';
        break;
      case 'TASK_SUPERSEDED':
        task.governance_state = 'SUPERSEDED';
        break;
      case 'TRANSPORT_PRESENT':
        task.transport_state = 'PRESENT';
        break;
      case 'TRANSPORT_HASH_VERIFIED':
        task.transport_state = 'HASH_VERIFIED';
        break;
      case 'TRANSPORT_CONSUMED':
        task.transport_state = 'CONSUMED';
        break;
      default:
        break;
    }
    const digest = event.payload?.artifact_sha256;
    if (digest) {
      artifacts[digest] ??= { artifact_sha256: digest, requested: 0, present: 0, consumed: 0 };
      if (event.type === 'TRANSPORT_REQUESTED') artifacts[digest].requested += 1;
      if (event.type === 'TRANSPORT_PRESENT') artifacts[digest].present += 1;
      if (event.type === 'TRANSPORT_CONSUMED') artifacts[digest].consumed += 1;
    }
  }
  const generatedAt = events.length
    ? events.map((event) => event.observed_at).filter(Boolean).sort().at(-1) ?? null
    : null;
  return {
    schema_version: 1,
    generated_at: generatedAt,
    tasks,
    artifacts,
  };
}

export async function regenerateCanonicalState(repoRoot) {
  const paths = controlPaths(repoRoot);
  const events = await readJsonl(paths.canonicalEvents, { allowMissing: true });
  const state = reduceState(events);
  await writeJsonAtomic(paths.canonicalState, state);
  return state;
}

function repairDepth(taskId) {
  return (taskId.match(/(?:REPAIR|RESUME|CORRECTION)/gi) ?? []).length;
}

export async function evaluateDrift(repoRoot, taskId, extraEvents = []) {
  const paths = await ensureRuntime(repoRoot);
  const policy = await loadJson(paths.driftPolicy).catch(() => ({
    max_control_artifacts_without_product_delta: 2,
    max_duplicate_digest_requests: 1,
    max_repair_depth: 2,
    max_approval_requests_per_task: 2,
    max_same_scope_correction_turns: 2,
  }));
  const events = [...(await readJsonl(paths.runtimeEvents)), ...extraEvents].filter(
    (event) => event.task_id === taskId,
  );
  const counts = {
    control_artifacts: events.filter((e) => e.type === 'CONTROL_ARTIFACT_CREATED').length,
    product_deltas: events.filter((e) => e.type === 'PRODUCT_DELTA_CREATED').length,
    approval_requests: events.filter((e) => e.type === 'APPROVAL_REQUESTED').length,
  };
  const digestRequests = new Map();
  for (const event of events.filter((e) => e.type === 'TRANSPORT_REQUESTED')) {
    const digest = event.payload?.artifact_sha256;
    if (digest) digestRequests.set(digest, (digestRequests.get(digest) ?? 0) + 1);
  }
  const reasons = [];
  if (
    counts.control_artifacts - counts.product_deltas >
    policy.max_control_artifacts_without_product_delta
  ) {
    reasons.push('CONTROL_ARTIFACT_SPIRAL');
  }
  if (counts.approval_requests > policy.max_approval_requests_per_task) {
    reasons.push('APPROVAL_FATIGUE');
  }
  if (repairDepth(taskId) > policy.max_repair_depth) {
    reasons.push('NESTED_REPAIR_DEPTH_EXCEEDED');
  }
  for (const [digest, count] of digestRequests.entries()) {
    if (count > policy.max_duplicate_digest_requests) {
      reasons.push(`DUPLICATE_DIGEST_REQUEST:${digest}`);
    }
  }
  return {
    task_id: taskId,
    result: reasons.length ? 'BLOCK' : 'PASS',
    reasons,
    counts,
    repair_depth: repairDepth(taskId),
    policy,
  };
}

export function substituteArgs(argv, values) {
  return argv.map((arg) =>
    arg.replace(/(?<!\$)\{([A-Za-z0-9_]+)\}/g, (_match, key) => {
      if (!(key in values)) {
        throw new ControlPlaneError('PLACEHOLDER_UNRESOLVED', `Unknown command placeholder: {${key}}`);
      }
      return String(values[key]);
    }),
  );
}

async function resolveBaseCommit(repoRoot, manifest) {
  const result = await git(repoRoot, ['rev-parse', '--verify', `${manifest.repository.base_ref}^{commit}`]);
  const commit = result.stdout.trim();
  if (manifest.repository.expected_commit && commit !== manifest.repository.expected_commit) {
    throw new ControlPlaneError('BASE_COMMIT_MISMATCH', 'Resolved base commit differs from manifest', {
      expected: manifest.repository.expected_commit,
      observed: commit,
    });
  }
  return commit;
}

async function verifyInputs(repoRoot, manifest) {
  const results = [];
  for (const input of manifest.inputs ?? []) {
    const filePath = path.join(repoRoot, assertRelativeRepoPath(input.path));
    const observed = await sha256File(filePath).catch((error) => {
      throw new ControlPlaneError('INPUT_MISSING_OR_UNREADABLE', `Required input unavailable: ${input.path}`, {
        cause: error.message,
      });
    });
    if (observed !== input.sha256.toLowerCase()) {
      throw new ControlPlaneError('INPUT_HASH_MISMATCH', `Required input hash mismatch: ${input.path}`, {
        expected: input.sha256.toLowerCase(),
        observed,
      });
    }
    results.push({ path: input.path, sha256: observed, result: 'PASS' });
  }
  return results;
}

async function changedPaths(worktree) {
  const tracked = await git(worktree, ['diff', '--name-only', '-z', '--no-renames', 'HEAD']);
  const untracked = await git(worktree, ['ls-files', '--others', '--exclude-standard', '-z']);
  return [...new Set(`${tracked.stdout}${untracked.stdout}`.split('\u0000').filter(Boolean))].sort();
}

export function enforcePathBoundary(changed, manifest) {
  const allowed = new Set(manifest.write_allowlist);
  const protectedSet = new Set(manifest.protected_paths);
  const protectedTouched = changed.filter((item) => protectedSet.has(item));
  const unauthorized = changed.filter((item) => !allowed.has(item));
  if (protectedTouched.length) {
    throw new ControlPlaneError('PROTECTED_PATH_MUTATION', 'Protected paths were modified', {
      paths: protectedTouched,
    });
  }
  if (unauthorized.length) {
    throw new ControlPlaneError('WRITE_BOUNDARY_VIOLATION', 'Files outside write_allowlist were modified', {
      paths: unauthorized,
    });
  }
  return { result: 'PASS', changed_paths: changed };
}

async function snapshotChangedFileHashes(worktree, changed) {
  const hashes = {};
  for (const rel of changed) {
    const absolute = path.join(worktree, rel);
    try {
      const stat = await fsp.lstat(absolute);
      if (stat.isSymbolicLink()) {
        throw new ControlPlaneError('SYMLINK_FORBIDDEN', `Changed path may not be a symlink: ${rel}`);
      }
      if (!stat.isFile()) {
        throw new ControlPlaneError('SPECIAL_FILE_FORBIDDEN', `Changed path must be a regular file: ${rel}`);
      }
      hashes[rel] = await sha256File(absolute);
    } catch (error) {
      if (error.code === 'ENOENT') hashes[rel] = 'DELETED';
      else throw error;
    }
  }
  return hashes;
}

async function createPatch(worktree, baseCommit, changed) {
  const untrackedResult = await git(worktree, ['ls-files', '--others', '--exclude-standard', '-z']);
  const untracked = untrackedResult.stdout.split('\u0000').filter(Boolean);
  if (untracked.length) {
    await git(worktree, ['add', '-N', '--', ...untracked]);
  }
  const result = await git(worktree, [
    'diff',
    '--binary',
    '--full-index',
    '--no-ext-diff',
    '--no-renames',
    baseCommit,
    '--',
    ...changed,
  ]);
  return result.stdout;
}

async function addWorktree(repoRoot, worktreePath, baseCommit, { branch } = {}) {
  await fsp.mkdir(path.dirname(worktreePath), { recursive: true });
  try {
    await fsp.access(worktreePath);
    throw new ControlPlaneError('WORKTREE_ALREADY_EXISTS', `Worktree path already exists: ${worktreePath}`);
  } catch (error) {
    if (error instanceof ControlPlaneError) throw error;
    if (error.code !== 'ENOENT') throw error;
  }
  const args = branch
    ? ['worktree', 'add', '-b', branch, worktreePath, baseCommit]
    : ['worktree', 'add', '--detach', worktreePath, baseCommit];
  await git(repoRoot, args);
}

async function removeWorktree(repoRoot, worktreePath) {
  await git(repoRoot, ['worktree', 'remove', '--force', worktreePath], { allowFailure: true });
  await fsp.rm(worktreePath, { recursive: true, force: true });
}

async function runGates(gates, worktree, context, phase) {
  const results = [];
  for (const gate of gates) {
    const argv = substituteArgs(gate.command, context);
    const result = await runProcess(argv, {
      cwd: worktree,
      timeoutMs: gate.timeout_ms ?? 120_000,
      env: {
        DCIM_TASK_ID: context.task_id,
        DCIM_RUN_ID: context.run_id,
        DCIM_PHASE: phase,
      },
      label: `${phase}:${gate.id}`,
    });
    const expected = gate.expected_exit_code ?? 0;
    results.push({
      id: gate.id,
      phase,
      argv,
      expected_exit_code: expected,
      ...result,
      result: result.exit_code === expected && !result.timed_out ? 'PASS' : 'FAIL',
    });
    if (results.at(-1).result === 'FAIL') break;
  }
  return results;
}

async function persistRunArtifacts(repoRoot, runDir, files) {
  await fsp.mkdir(runDir, { recursive: true });
  const digests = {};
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(runDir, name);
    await fsp.mkdir(path.dirname(filePath), { recursive: true });
    const data = Buffer.isBuffer(content) ? content : Buffer.from(String(content), 'utf8');
    await fsp.writeFile(filePath, data, { mode: 0o600 });
    digests[name] = sha256Bytes(data);
  }
  const bundleDigest = sha256Bytes(canonicalJson(digests));
  const artifactDir = path.join(controlPaths(repoRoot).artifacts, bundleDigest);
  try {
    await fsp.mkdir(artifactDir, { recursive: false });
    for (const name of Object.keys(files)) {
      const source = path.join(runDir, name);
      const destination = path.join(artifactDir, name);
      await fsp.mkdir(path.dirname(destination), { recursive: true });
      await fsp.copyFile(source, destination, fs.constants.COPYFILE_EXCL);
    }
    await writeJsonAtomic(path.join(artifactDir, 'CHECKSUMS.json'), digests);
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = await loadJson(path.join(artifactDir, 'CHECKSUMS.json'));
    if (canonicalJson(existing) !== canonicalJson(digests)) {
      throw new ControlPlaneError('ARTIFACT_COLLISION', 'Content-addressed artifact directory mismatch');
    }
  }
  return { bundle_sha256: bundleDigest, files: digests, artifact_dir: artifactDir };
}

async function findRun(repoRoot, runId) {
  const runDir = path.join(controlPaths(repoRoot).runtimeRuns, assertSafeRunId(runId));
  const result = await loadJson(path.join(runDir, 'result.json'));
  const manifest = await loadJson(path.join(runDir, 'manifest.json'));
  return { runDir, result, manifest: validateManifest(manifest) };
}

function assertSafeRunId(runId) {
  if (!/^[A-Za-z0-9._-]+$/.test(runId ?? '')) {
    throw new ControlPlaneError('RUN_ID_INVALID', 'run_id contains unsafe characters');
  }
  return runId;
}

export async function executeTask(repoRoot, manifestPath) {
  const manifest = validateManifest(await loadJson(manifestPath));
  const paths = await ensureRuntime(repoRoot);
  const drift = await evaluateDrift(repoRoot, manifest.task_id);
  if (drift.result === 'BLOCK') {
    throw new ControlPlaneError('DRIFT_GUARD_BLOCK', 'Task blocked by drift guard', drift);
  }
  const baseCommit = await resolveBaseCommit(repoRoot, manifest);
  const digest = manifestDigest(manifest);
  const idempotencyKey = sha256Bytes(`${digest}:${baseCommit}`);
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
    repo_root: repoRoot,
  };
  await appendRuntimeEvent(repoRoot, 'EXECUTION_STARTED', manifest.task_id, {
    run_id: runId,
    idempotency_key: idempotencyKey,
    manifest_sha256: digest,
    base_commit: baseCommit,
  });

  let writerResults = [];
  let gateResults = [];
  let finalChanged = [];
  let patchText = '';
  try {
    await verifyInputs(repoRoot, manifest);
    await addWorktree(repoRoot, worktree, baseCommit);
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
        if (writerResult.exit_code !== 0 || writerResult.timed_out) {
          throw new ControlPlaneError('WRITER_FAILED', `Writer turn ${turn} failed`, {
            exit_code: writerResult.exit_code,
            timed_out: writerResult.timed_out,
          });
        }
      }
      finalChanged = await changedPaths(worktree);
      enforcePathBoundary(finalChanged, manifest);
      if (finalChanged.length === 0 && !manifest.metadata?.allow_empty_delta) {
        throw new ControlPlaneError('NO_PRODUCT_DELTA', 'Writer produced no file delta');
      }
      gateResults = await runGates(manifest.gates, worktree, context, 'execution');
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
      execution_state: 'SUCCEEDED',
      governance_state: 'IMPLEMENTED_UNVERIFIED',
      transport_state: 'PRESENT',
      changed_paths: finalChanged,
      changed_file_sha256: fileHashes,
      correction_turns_used: Math.max(0, writerResults.length - 1),
      writer_results: writerResults,
      gate_results: gateResults,
      completed_at: new Date().toISOString(),
    };
    const artifact = await persistRunArtifacts(repoRoot, runDir, {
      'manifest.json': canonicalJson(manifest),
      'result.json': canonicalJson(result),
      'patch.diff': patchText,
      'writer-results.json': canonicalJson(writerResults),
      'gate-results.json': canonicalJson(gateResults),
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
    const normalized =
      error instanceof ControlPlaneError
        ? error
        : new ControlPlaneError('UNEXPECTED_FAILURE', error.message, { stack: error.stack });
    const failure = {
      schema_version: 1,
      task_id: manifest.task_id,
      run_id: runId,
      idempotency_key: idempotencyKey,
      manifest_sha256: digest,
      base_commit: baseCommit,
      execution_state: normalized.code === 'PROCESS_TIMEOUT' ? 'INTERRUPTED' : 'FAILED',
      governance_state: 'AUTHORIZED',
      transport_state: 'PRESENT',
      failure: { code: normalized.code, message: normalized.message, details: normalized.details },
      writer_results: writerResults,
      gate_results: gateResults,
      completed_at: new Date().toISOString(),
    };
    const artifact = await persistRunArtifacts(repoRoot, runDir, {
      'manifest.json': canonicalJson(manifest),
      'result.json': canonicalJson(failure),
      'writer-results.json': canonicalJson(writerResults),
      'gate-results.json': canonicalJson(gateResults),
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

export async function verifyRun(repoRoot, runId) {
  const { runDir, result, manifest } = await findRun(repoRoot, runId);
  if (!['SUCCEEDED', 'REUSED'].includes(result.execution_state)) {
    throw new ControlPlaneError('RUN_NOT_VERIFIABLE', 'Only successful executions can be verified');
  }
  const patchPath = path.join(runDir, 'patch.diff');
  const patchHash = await sha256File(patchPath);
  const verificationId = `${runId}-verify-${Date.now()}`;
  const worktree = path.join(controlPaths(repoRoot).worktrees, result.idempotency_key, verificationId);
  const context = {
    task_id: manifest.task_id,
    run_id: runId,
    verification_id: verificationId,
    base_commit: result.base_commit,
    worktree,
    repo_root: repoRoot,
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
    const beforeChanged = await changedPaths(worktree);
    enforcePathBoundary(beforeChanged, manifest);
    const beforeHashes = await snapshotChangedFileHashes(worktree, beforeChanged);
    const gates = manifest.verification?.gates ?? manifest.gates;
    const gateResults = await runGates(gates, worktree, context, 'verification');
    const afterChanged = await changedPaths(worktree);
    enforcePathBoundary(afterChanged, manifest);
    const afterHashes = await snapshotChangedFileHashes(worktree, afterChanged);
    if (canonicalJson(beforeHashes) !== canonicalJson(afterHashes)) {
      throw new ControlPlaneError('VERIFIER_MUTATED_PATCH', 'Read-only verifier changed product bytes', {
        before: beforeHashes,
        after: afterHashes,
      });
    }
    if (!gateResults.every((gate) => gate.result === 'PASS')) {
      throw new ControlPlaneError('VERIFICATION_GATES_FAILED', 'Independent verification gates failed');
    }
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
    const normalized =
      error instanceof ControlPlaneError
        ? error
        : new ControlPlaneError('VERIFICATION_UNEXPECTED_FAILURE', error.message, {
            stack: error.stack,
          });
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

export async function promoteRun(repoRoot, runId, options) {
  const { runDir, result, manifest } = await findRun(repoRoot, runId);
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
  try {
    await addWorktree(repoRoot, worktree, result.base_commit, { branch });
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
    const beforeHashes = await snapshotChangedFileHashes(worktree, changed);
    const promotionGates = manifest.promotion?.gates ?? manifest.verification?.gates ?? manifest.gates;
    const gateResults = await runGates(
      promotionGates,
      worktree,
      { task_id: manifest.task_id, run_id: runId, worktree, repo_root: repoRoot },
      'promotion',
    );
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
    return {
      task_id: manifest.task_id,
      run_id: runId,
      governance_state: 'PRINCIPAL_ACCEPTED',
      branch,
      commit_sha: commitSha,
      commit_stdout: commit.stdout,
      gate_results: gateResults,
    };
  } catch (error) {
    await git(repoRoot, ['branch', '-D', branch], { allowFailure: true });
    throw error;
  } finally {
    await removeWorktree(repoRoot, worktree).catch(() => {});
  }
}

export async function recordTransport(repoRoot, taskId, action, digest) {
  if (!['requested', 'present', 'hash-verified', 'consumed'].includes(action)) {
    throw new ControlPlaneError('TRANSPORT_ACTION_INVALID', 'Unsupported transport action');
  }
  if (!/^[0-9a-f]{64}$/i.test(digest ?? '')) {
    throw new ControlPlaneError('ARTIFACT_DIGEST_INVALID', 'Transport digest must be SHA-256');
  }
  const type = {
    requested: 'TRANSPORT_REQUESTED',
    present: 'TRANSPORT_PRESENT',
    'hash-verified': 'TRANSPORT_HASH_VERIFIED',
    consumed: 'TRANSPORT_CONSUMED',
  }[action];
  const event = newEvent(type, taskId, { artifact_sha256: digest.toLowerCase() });
  const drift = await evaluateDrift(repoRoot, taskId, [event]);
  if (action === 'requested' && drift.result === 'BLOCK') {
    throw new ControlPlaneError('DUPLICATE_TRANSPORT_BLOCKED', 'Duplicate artifact request blocked', drift);
  }
  await appendJsonlDurable(controlPaths(repoRoot).runtimeEvents, event);
  return event;
}

export function compareMeasuredSummaries(left, right, fields = []) {
  const defaultFields = ['result', 'file_count', 'total_tests', 'passed_tests', 'failed_tests', 'success'];
  const selected = fields.length ? fields : defaultFields;
  const differences = [];
  for (const field of selected) {
    if (left?.[field] !== right?.[field]) {
      differences.push({ field, left: left?.[field], right: right?.[field] });
    }
  }
  return { result: differences.length ? 'FAIL' : 'PASS', fields: selected, differences };
}

export async function doctor(repoRoot, manifestPath) {
  const manifest = manifestPath ? validateManifest(await loadJson(manifestPath)) : null;
  const checks = [];
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({ id: 'node-version', result: nodeMajor >= 20 ? 'PASS' : 'FAIL', observed: process.versions.node });
  const gitVersion = await runProcess(['git', '--version'], { cwd: repoRoot, label: 'git --version' });
  checks.push({ id: 'git-available', result: gitVersion.exit_code === 0 ? 'PASS' : 'FAIL', observed: gitVersion.stdout.trim() });
  const paths = await ensureRuntime(repoRoot);
  checks.push({ id: 'durable-runtime-path', result: paths.runtime.startsWith(repoRoot) ? 'PASS' : 'FAIL', observed: paths.runtime });
  if (manifest) {
    const baseCommit = await resolveBaseCommit(repoRoot, manifest);
    checks.push({ id: 'manifest-valid', result: 'PASS', manifest_sha256: manifestDigest(manifest) });
    checks.push({ id: 'base-commit-bound', result: 'PASS', observed: baseCommit });
    const drift = await evaluateDrift(repoRoot, manifest.task_id);
    checks.push({ id: 'drift-guard', result: drift.result, reasons: drift.reasons });
  }
  return {
    schema_version: 1,
    result: checks.every((check) => check.result === 'PASS') ? 'PASS' : 'FAIL',
    repo_root: repoRoot,
    platform: `${os.platform()}-${os.arch()}`,
    checks,
  };
}

export { EXECUTION_TERMINAL, GOVERNANCE_ORDER };
