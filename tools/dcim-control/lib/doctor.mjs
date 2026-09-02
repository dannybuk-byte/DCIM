import os from 'node:os';
import {
  manifestDigest,
  runtimeFingerprint,
  unsupportedCapabilities,
  validateManifest,
  loadJson,
} from './base.mjs';
import { resolveBaseCommit } from './git.mjs';
import { runProcess } from './process.mjs';
import { ensureRuntime, evaluateDrift } from './state.mjs';

export async function doctor(repoRoot, manifestPath) {
  const manifest = manifestPath ? validateManifest(await loadJson(manifestPath)) : null;
  const checks = [];
  const nodeMajor = Number(process.versions.node.split('.')[0]);
  checks.push({ id: 'node-version', result: nodeMajor >= 20 ? 'PASS' : 'FAIL', observed: process.versions.node });
  const gitVersion = await runProcess(['git', '--version'], { cwd: repoRoot, label: 'git --version' });
  checks.push({ id: 'git-available', result: gitVersion.exit_code === 0 ? 'PASS' : 'FAIL', observed: gitVersion.stdout.trim() });
  const paths = await ensureRuntime(repoRoot);
  checks.push({ id: 'durable-runtime-path', result: paths.runtime.startsWith(repoRoot) ? 'PASS' : 'FAIL', observed: paths.runtime });
  checks.push({ id: 'runtime-fingerprint', result: 'PASS', observed: await runtimeFingerprint() });
  if (manifest) {
    const baseCommit = await resolveBaseCommit(repoRoot, manifest);
    checks.push({ id: 'manifest-valid', result: 'PASS', manifest_sha256: manifestDigest(manifest) });
    checks.push({ id: 'base-commit-bound', result: 'PASS', observed: baseCommit });
    const unsupported = unsupportedCapabilities(manifest);
    checks.push({
      id: 'host-containment-boundary',
      result: unsupported.length ? 'FAIL' : 'PASS',
      unsupported_capabilities: unsupported,
    });
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
