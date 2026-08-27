import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export function identifyArtifactBytes(bytes, sourcePath, { relativeTo = process.cwd(), snapshotReference = null, retrievalReference = null } = {}) {
  const absolutePath = path.resolve(sourcePath);
  return Object.freeze({
    source_path: path.relative(relativeTo, absolutePath),
    byte_count: bytes.byteLength,
    sha256: crypto.createHash('sha256').update(bytes).digest('hex'),
    snapshot_reference: snapshotReference,
    retrieval_reference: retrievalReference,
  });
}

export function identifyRawArtifact(sourcePath, options = {}) {
  const readFile = options.readFile ?? fs.readFileSync;
  const absolutePath = path.resolve(sourcePath);
  const bytes = readFile(absolutePath);
  return identifyArtifactBytes(bytes, absolutePath, options);
}

export function readRawArtifact(sourcePath, options = {}) {
  const readFile = options.readFile ?? fs.readFileSync;
  const absolutePath = path.resolve(sourcePath);
  const bytes = readFile(absolutePath);
  return Object.freeze({ bytes, artifact: identifyArtifactBytes(bytes, absolutePath, options) });
}
