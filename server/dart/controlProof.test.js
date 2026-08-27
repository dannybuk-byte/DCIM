import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { DartControlProofError, deriveFrozenControlFacts } from './controlProof.js';

const root = path.resolve('data/dart-v0.9/fixtures/h8r1');

describe('fixture-derived H8-R1 control proof', () => {
  it('preserves all 82 frozen fixture checksums', () => {
    const entries = fs.readFileSync(path.join(root, 'CHECKSUMS_SHA256.txt'), 'utf8').trim().split('\n');
    expect(entries).toHaveLength(82);
    for (const entry of entries) {
      const [, expected, relative] = /^(\S{64})  (.+)$/.exec(entry);
      const actual = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, relative))).digest('hex');
      expect(actual, relative).toBe(expected);
    }
  });

  it('derives N1-N6 and P1 facts from exact frozen files', () => {
    expect(deriveFrozenControlFacts(root)).toEqual({
      N1: { physical_rows: 12, dec_stem: '5-1730-00016', maximum_dart_origins: 1 },
      N2_N5: { pointers: [1, 0], source_objects: 1, artifact_sha256: 'f70ba3bf7ba5df88c87ac856ef86a3c602089e428515987c41710ba584aaf0a4', maximum_dart_origins: 1 },
      N3: { facility_subject_id: 'UNRESOLVED', merge_with_bounded_facility: false },
      N4: { physical_rows: 3, parent_subjects: 2, parent_dec_stems: 2, aero_selected_subjects: 1, aero_dec_stems: 1, aero_maximum_dart_origins: 1 },
      N6: { physical_rows: 9, facility_subjects: 1, dec_stems: 1, source_duplicated: false, maximum_additional_origins: 0 },
      P1: { physical_rows: 39, unique_rows: 39, maximum_dart_publication_origins: 1, facility_subject_id: 'UNRESOLVED' },
    });
  });

  it('verifies and consumes the same exact Buffer for every governed input', () => {
    const reads = new Map();
    const n1Relative = 'controls/N1_winneys_park_mine/source/R5_DART_stem_5-1730-00016_SYSFIELDS_CORRECTED.json';
    const pointerRelative = 'controls/N2_certainteed/POINTER.txt';
    const manifestRelative = 'controls/N4_aero_marina_simmons/AERO_MARINA_SELECTED_ROWS.json';
    const readFile = file => {
      const relative = path.relative(root, file);
      const count = (reads.get(relative) ?? 0) + 1;
      reads.set(relative, count);
      const exact = fs.readFileSync(file);
      if (count === 1) return exact;
      if (relative === n1Relative) {
        const altered = JSON.parse(exact.toString('utf8'));
        return Buffer.from(JSON.stringify(altered.map(row => ({ ...row, application_id: row.application_id.replace(/^5-1730-00016/, '9-9999-99999') }))));
      }
      if (relative === pointerRelative) return Buffer.from('/9\n');
      if (relative === manifestRelative) return Buffer.from('{}\n');
      return exact;
    };

    expect(deriveFrozenControlFacts(root, { readFile }).N1.dec_stem).toBe('5-1730-00016');
    expect(reads.get(n1Relative)).toBe(1);
    expect(reads.get(pointerRelative)).toBe(1);
    expect(reads.get(manifestRelative)).toBe(1);
    expect([...reads.values()].every(count => count === 1)).toBe(true);
  });

  it.each([
    'controls/N1_winneys_park_mine/source/R5_DART_stem_5-1730-00016_SYSFIELDS_CORRECTED.json',
    'controls/N2_certainteed/POINTER.txt',
    'controls/N5_haeringer_property/POINTER.txt',
    'controls/N5_haeringer_property/SAME_SOURCE_AS_N2.txt',
    'controls/N3_all_county_roads_and_bridges/source/DART_mbk7-f2r2_sample3_vendored_2026-08-18.json',
    'controls/N4_aero_marina_simmons/source/R1_DART_mbk7-f2r2_sample3_20260822T042035Z.json',
    'controls/N4_aero_marina_simmons/AERO_MARINA_SELECTED_ROWS.json',
    'controls/N6_term_collision/SAME_SOURCE_AS_CANDIDATE.txt',
    'controls/N6_term_collision/SELECTED_ROWS.json',
    'controls/P1_greenidge/OBSERVATION_POSTURE.json',
    'controls/P1_greenidge/source/DCIM_T03H_H3_GREENIDGE_DART_OBSERVATION_20260824T165123Z.zip',
  ])('fails if frozen control input %s is altered', relative => {
    const target = path.join(root, relative);
    const readFile = file => file === target ? Buffer.concat([fs.readFileSync(file), Buffer.from(' ')]) : fs.readFileSync(file);
    expect(() => deriveFrozenControlFacts(root, { readFile })).toThrow(DartControlProofError);
  });
});
