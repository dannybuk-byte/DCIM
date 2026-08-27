import { getFieldWarrant } from './fieldWarrants.js';
import { readRawArtifact } from './rawArtifact.js';

export class DartRowParseError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = 'DartRowParseError';
    this.code = code;
    this.details = details;
  }
}

function assertRows(value, { requireSourceRowId }) {
  if (!Array.isArray(value)) throw new DartRowParseError('TOP_LEVEL_NOT_ARRAY');
  const ids = new Set();
  value.forEach((row, rowIndex) => {
    if (row === null || typeof row !== 'object' || Array.isArray(row)) throw new DartRowParseError('ROW_NOT_OBJECT', { row_index: rowIndex });
    if (requireSourceRowId && !Object.hasOwn(row, ':id')) throw new DartRowParseError('MISSING_SOURCE_ROW_ID', { row_index: rowIndex });
    if (Object.hasOwn(row, ':id')) {
      if (typeof row[':id'] !== 'string' || row[':id'].length === 0) throw new DartRowParseError('INVALID_SOURCE_ROW_ID', { row_index: rowIndex });
      if (ids.has(row[':id'])) throw new DartRowParseError('DUPLICATE_SOURCE_ROW_ID', { row_index: rowIndex, source_row_id: row[':id'] });
      ids.add(row[':id']);
    }
  });
}

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const nested of Object.values(value)) deepFreeze(nested, seen);
  return Object.freeze(value);
}

function validateArtifact(artifact) {
  if (!artifact || typeof artifact !== 'object' || Array.isArray(artifact)) throw new DartRowParseError('MISSING_ARTIFACT_DESCRIPTOR');
  if (typeof artifact.source_path !== 'string' || artifact.source_path.length === 0) throw new DartRowParseError('INVALID_ARTIFACT_SOURCE_PATH');
  if (!Number.isInteger(artifact.byte_count) || artifact.byte_count < 0) throw new DartRowParseError('INVALID_ARTIFACT_BYTE_COUNT');
  if (typeof artifact.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(artifact.sha256)) throw new DartRowParseError('INVALID_ARTIFACT_SHA256');
  return deepFreeze({ ...artifact });
}

function readOnlyLookup(entries) {
  const lookup = new Map(entries);
  return Object.freeze({
    get: key => lookup.get(key),
    has: key => lookup.has(key),
    get size() { return lookup.size; },
    values: () => lookup.values(),
  });
}

export function parseDartRowsJson(sourceBytes, { artifact, requireSourceRowId = true } = {}) {
  const bytes = Buffer.isBuffer(sourceBytes) ? sourceBytes : Buffer.from(sourceBytes);
  const validatedArtifact = validateArtifact(artifact);
  let value;
  try { value = JSON.parse(bytes.toString('utf8')); } catch (cause) { throw new DartRowParseError('INVALID_JSON', { cause: cause.message }); }
  assertRows(value, { requireSourceRowId });
  const rows = value.map((raw, sourceArrayIndex) => deepFreeze({
    source_row_id: Object.hasOwn(raw, ':id') ? raw[':id'] : null,
    application_id: Object.hasOwn(raw, 'application_id') ? raw.application_id : undefined,
    raw,
    present_fields: Object.freeze(Object.keys(raw)),
    field_warrants: Object.freeze(Object.fromEntries(Object.keys(raw).map(key => [key, getFieldWarrant(key)]))),
    source_artifact_locator: { ...validatedArtifact, source_array_index: sourceArrayIndex },
  }));
  const bySourceRowId = readOnlyLookup(rows.filter(row => row.source_row_id !== null).map(row => [row.source_row_id, row]));
  return Object.freeze({ rows: Object.freeze(rows), by_source_row_id: bySourceRowId, artifact: validatedArtifact });
}

export function parseDartRowsArtifact(sourcePath, options = {}) {
  const { bytes, artifact } = readRawArtifact(sourcePath, options);
  return parseDartRowsJson(bytes, { artifact, requireSourceRowId: options.requireSourceRowId ?? true });
}
