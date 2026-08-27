import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { DartRowParseError, parseDartRowsJson } from './parseDartRows.js';

function encoded(value) {
  const bytes = Buffer.from(JSON.stringify(value));
  return { bytes, artifact: { source_path: 'synthetic.json', byte_count: bytes.byteLength, sha256: crypto.createHash('sha256').update(bytes).digest('hex') } };
}

function parse(value, options = {}) {
  const { bytes, artifact } = encoded(value);
  return parseDartRowsJson(bytes, { artifact, ...options });
}

function codeFor(value, options) {
  try { parse(value, options); } catch (error) { return error.code; }
  return null;
}

describe('strict DART row-array intake and exact preservation', () => {
  it('rejects malformed top levels, rows, missing IDs, and duplicate physical IDs', () => {
    expect(codeFor({ ':id': 'one' })).toBe('TOP_LEVEL_NOT_ARRAY');
    expect(codeFor([null])).toBe('ROW_NOT_OBJECT');
    expect(codeFor([{ application_id: 'x' }])).toBe('MISSING_SOURCE_ROW_ID');
    expect(codeFor([{ ':id': 'one' }, { ':id': 'one' }])).toBe('DUPLICATE_SOURCE_ROW_ID');
    const malformed = Buffer.from('{');
    expect(() => parseDartRowsJson(malformed, { artifact: { source_path: 'bad.json', byte_count: 1, sha256: crypto.createHash('sha256').update(malformed).digest('hex') } })).toThrow(DartRowParseError);
  });

  it('preserves raw values, unknown fields, privacy-bearing fields, null, empty, and omission', () => {
    const input = [{ ':id': 'row-1', application_id: 'malformed-retain-me', applicant: 'Natural Person', dec_contact: 'Named Official', explicit_null: null, empty: '', future_source_field: { nested: true } }];
    const { bytes, artifact } = encoded(input);
    artifact.source_path = 'fixture.json';
    const parsed = parseDartRowsJson(bytes, { artifact });
    const row = parsed.rows[0];
    expect(row.raw).toEqual(input[0]);
    expect(row.raw.applicant).toBe('Natural Person');
    expect(row.raw.dec_contact).toBe('Named Official');
    expect(Object.hasOwn(row.raw, 'explicit_null')).toBe(true);
    expect(Object.hasOwn(row.raw, 'omitted')).toBe(false);
    expect(row.raw.empty).toBe('');
    expect(row.raw.future_source_field).toEqual({ nested: true });
    expect(row.field_warrants.future_source_field.warrant_status).toBe('UNKNOWN_FIELD_UNWARRANTED');
    expect(row.application_id).toBe('malformed-retain-me');
    expect(row).not.toHaveProperty('dec_id');
    expect(row.source_artifact_locator).toMatchObject({ source_path: 'fixture.json', byte_count: bytes.byteLength, sha256: artifact.sha256, source_array_index: 0 });
  });

  it('does not collapse distinct rows sharing an application ID', () => {
    const parsed = parse([{ ':id': 'physical-a', application_id: 'same' }, { ':id': 'physical-b', application_id: 'same' }]);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.by_source_row_id.get('physical-a').application_id).toBe('same');
    expect(parsed.by_source_row_id.get('physical-b').application_id).toBe('same');
    expect(parsed.by_source_row_id.size).toBe(2);
  });

  it('requires a complete and valid artifact descriptor', () => {
    const bytes = Buffer.from('[{":id":"row-1"}]');
    const valid = { source_path: 'source.json', byte_count: bytes.byteLength, sha256: 'a'.repeat(64) };
    expect(() => parseDartRowsJson(bytes)).toThrowError(expect.objectContaining({ code: 'MISSING_ARTIFACT_DESCRIPTOR' }));
    for (const artifact of [
      { ...valid, source_path: '' },
      { ...valid, byte_count: -1 },
      { ...valid, byte_count: 1.5 },
      { ...valid, sha256: 'A'.repeat(64) },
      { ...valid, sha256: 'a'.repeat(63) },
    ]) expect(() => parseDartRowsJson(bytes, { artifact })).toThrow(DartRowParseError);
  });

  it('rejects every present invalid :id under strict and legacy modes', () => {
    for (const invalid of [null, '', [], {}, 1, true, false]) {
      expect(codeFor([{ ':id': invalid }], { requireSourceRowId: false })).toBe('INVALID_SOURCE_ROW_ID');
      expect(codeFor([{ ':id': invalid }], { requireSourceRowId: true })).toBe('INVALID_SOURCE_ROW_ID');
    }
    expect(codeFor([{ application_id: 'legacy' }], { requireSourceRowId: false })).toBe(null);
    expect(codeFor([{ ':id': 'duplicate' }, { ':id': 'duplicate' }], { requireSourceRowId: false })).toBe('DUPLICATE_SOURCE_ROW_ID');
  });

  it('deep-freezes evidence and exposes a lookup without mutation operations', () => {
    const parsed = parse([{ ':id': 'row-1', application_id: 'app-1', nested: { array: [{ value: 'exact' }] } }]);
    const row = parsed.rows[0];
    expect(() => { row.raw.nested.array[0].value = 'changed'; }).toThrow(TypeError);
    expect(() => { row.application_id = 'changed'; }).toThrow(TypeError);
    expect(() => { row.source_artifact_locator.source_path = 'changed'; }).toThrow(TypeError);
    expect(() => { row.field_warrants.application_id.warrant_status = 'changed'; }).toThrow(TypeError);
    expect(() => { parsed.artifact.sha256 = '0'.repeat(64); }).toThrow(TypeError);
    expect(parsed.by_source_row_id.get('row-1')).toBe(row);
    expect(parsed.by_source_row_id).not.toHaveProperty('set');
    expect(parsed.by_source_row_id).not.toHaveProperty('delete');
    expect(parsed.by_source_row_id).not.toHaveProperty('clear');
    expect(() => { parsed.by_source_row_id.get = () => null; }).toThrow(TypeError);
  });
});
