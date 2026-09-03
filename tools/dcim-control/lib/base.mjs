import crypto from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export class ControlPlaneError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = 'ControlPlaneError';
    this.code = code;
    this.details = details;
  }
}

export const CONTROL_PLANE_VERSION = '0.1.1';

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

function assertOnlyKeys(value, allowed, name) {
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) {
      throw new ControlPlaneError('MANIFEST_INVALID', `Unknown ${name} property: ${key}`);
    }
  }
}

export function unsupportedCapabilities(manifest) {
  return ['network', 'sockets', 'dependency_install', 'publication'].filter(
    (key) => manifest.capabilities?.[key] === true,
  );
}

export function assertSupportedCapabilities(manifest) {
  const unsupported = unsupportedCapabilities(manifest);
  if (unsupported.length) {
    throw new ControlPlaneError(
      'HOST_CONTAINMENT_NOT_QUALIFIED',
      'This control-plane version fails closed when host-level containment would be required',
      { unsupported_capabilities: unsupported },
    );
  }
}

export function validateCommand(command, name, { forbidTransient = false } = {}) {
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
  assertOnlyKeys(
    gate,
    new Set(['id', 'command', 'timeout_ms', 'expected_exit_code']),
    `${prefix}[${index}]`,
  );
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
  assertOnlyKeys(manifest, allowedTop, 'manifest');
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
  assertOnlyKeys(manifest.repository, new Set(['base_ref', 'expected_commit']), 'repository');
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
  assertOnlyKeys(
    manifest.capabilities,
    new Set(['network', 'git_mutation', 'sockets', 'dependency_install', 'publication']),
    'capabilities',
  );
  for (const key of ['network', 'git_mutation', 'sockets', 'dependency_install', 'publication']) {
    requireBoolean(manifest.capabilities[key], `capabilities.${key}`);
  }

  requireObject(manifest.budgets, 'budgets');
  assertOnlyKeys(manifest.budgets, new Set(['correction_turns']), 'budgets');
  if (!Number.isInteger(manifest.budgets.correction_turns) || manifest.budgets.correction_turns < 0 || manifest.budgets.correction_turns > 2) {
    throw new ControlPlaneError('MANIFEST_INVALID', 'budgets.correction_turns must be 0, 1, or 2');
  }

  requireObject(manifest.writer, 'writer');
  assertOnlyKeys(manifest.writer, new Set(['mode', 'command', 'timeout_ms']), 'writer');
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
    assertOnlyKeys(manifest.verification, new Set(['gates']), 'verification');
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
      assertOnlyKeys(input, new Set(['path', 'sha256']), `inputs[${index}]`);
      assertRelativeRepoPath(input.path, `inputs[${index}].path`);
      if (!/^[0-9a-f]{64}$/i.test(input.sha256 ?? '')) {
        throw new ControlPlaneError('MANIFEST_INVALID', `inputs[${index}].sha256 must be 64 hex`);
      }
    }
  }

  if (manifest.promotion !== undefined) {
    requireObject(manifest.promotion, 'promotion');
    assertOnlyKeys(manifest.promotion, new Set(['commit_message', 'gates']), 'promotion');
    if (
      manifest.promotion.commit_message !== undefined &&
      (typeof manifest.promotion.commit_message !== 'string' || !manifest.promotion.commit_message.trim())
    ) {
      throw new ControlPlaneError('MANIFEST_INVALID', 'promotion.commit_message must be non-empty');
    }
    if (manifest.promotion.gates !== undefined) {
      if (!Array.isArray(manifest.promotion.gates) || manifest.promotion.gates.length === 0) {
        throw new ControlPlaneError('MANIFEST_INVALID', 'promotion.gates must be a non-empty array');
      }
      manifest.promotion.gates.forEach((gate, index) => validateGate(gate, index, 'promotion.gates'));
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

export async function runtimeFingerprint() {
  const toolRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
  const libRoot = path.join(toolRoot, 'lib');
  const moduleNames = (await fsp.readdir(libRoot))
    .filter((name) => name.endsWith('.mjs'))
    .sort();
  const files = ['VERSION', 'cli.mjs', 'core.mjs', ...moduleNames.map((name) => `lib/${name}`)];
  const fileSha256 = {};
  for (const relative of files) {
    const absolute = path.join(toolRoot, relative);
    try {
      fileSha256[relative] = await sha256File(absolute);
    } catch (error) {
      if (error.code === 'ENOENT') fileSha256[relative] = 'ABSENT';
      else throw error;
    }
  }
  const fingerprint = {
    control_plane_version: CONTROL_PLANE_VERSION,
    files: fileSha256,
    node: process.versions.node,
    platform: os.platform(),
    arch: os.arch(),
  };
  return { ...fingerprint, sha256: sha256Bytes(canonicalJson(fingerprint)) };
}

export { EXECUTION_TERMINAL, GOVERNANCE_ORDER };
