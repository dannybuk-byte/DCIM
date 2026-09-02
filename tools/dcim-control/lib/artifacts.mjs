import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import {
  ControlPlaneError,
  canonicalJson,
  loadJson,
  sha256Bytes,
  validateManifest,
  writeJsonAtomic,
} from './base.mjs';
import { controlPaths } from './state.mjs';

export async function persistRunArtifacts(repoRoot, runDir, files) {
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

export async function findRun(repoRoot, runId) {
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
