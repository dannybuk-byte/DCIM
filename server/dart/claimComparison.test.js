import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { compareDartClaims } from './claimComparison.js';
import { parseDartRowsArtifact } from './parseDartRows.js';

const fixtureRoot = path.resolve('data/dart-v0.9/fixtures/h8r1');
const n1Path = path.join(fixtureRoot, 'controls/N1_winneys_park_mine/source/R5_DART_stem_5-1730-00016_SYSFIELDS_CORRECTED.json');

describe('deterministic full DART claim comparison', () => {
  it('distinguishes missing, null, and empty across all 26 fields', () => {
    const missingVsNull = compareDartClaims({}, { date_received: null });
    expect(missingVsNull.compared_field_count).toBe(26);
    expect(missingVsNull.equal).toBe(false);
    expect(missingVsNull.differences).toEqual([expect.objectContaining({ field: 'date_received', left: { presence: 'missing' }, right: { presence: 'present', value: null } })]);
    expect(compareDartClaims({ date_received: null }, { date_received: '' }).equal).toBe(false);
  });

  it('keeps all three Winney near-duplicate pairs distinct solely on applicant', () => {
    expect(fs.existsSync(n1Path)).toBe(true);
    const parsed = parseDartRowsArtifact(n1Path, { relativeTo: fixtureRoot });
    const pairs = [
      ['row-vjbk_bqyb-eqbu', 'row-25up~6yd9-p94w'],
      ['row-jmtp-sngn_ywmd', 'row-zhmf.frnt-8kzp'],
      ['row-hydn_bywm-4m7q', 'row-bw5d.5vqh-ittq'],
    ];
    for (const [a, b] of pairs) {
      const left = parsed.by_source_row_id.get(a).raw;
      const right = parsed.by_source_row_id.get(b).raw;
      const result = compareDartClaims(left, right);
      expect(result.equal).toBe(false);
      expect(result.compared_field_count).toBe(26);
      expect(result.differences.map(d => d.field)).toEqual(['applicant']);
      expect({ ...left, applicant: undefined, ':id': undefined, ':version': undefined }).toEqual({ ...right, applicant: undefined, ':id': undefined, ':version': undefined });
    }
  });
});
