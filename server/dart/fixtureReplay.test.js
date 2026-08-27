import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { identifyRawArtifact } from './rawArtifact.js';
import { parseDartRowsArtifact } from './parseDartRows.js';

const root = path.resolve('data/dart-v0.9/fixtures/h8r1');
const at = relative => path.join(root, relative);

describe('frozen Orangetown, P1, and N1-N6 fixture replay', () => {
  it('parses Orangetown and resolves the four candidate and nine N6 positions against one parent', () => {
    const source = at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_RESPONSE_BODY.json');
    const parsed = parseDartRowsArtifact(source, { relativeTo: root, retrievalReference: 'candidate/orangetown/RETRIEVAL_MANIFEST.tsv' });
    expect(parsed.rows).toHaveLength(16);
    expect(parsed.artifact).toMatchObject({ source_path: 'candidate/orangetown/source/R04_ROWS_DATA_CENTER_RESPONSE_BODY.json', byte_count: 26184, sha256: 'f8764a096f91bfac498f3e838a0e57382930dcb86a0bbf599db089b1398ba182' });
    const candidate = JSON.parse(fs.readFileSync(at('candidate/orangetown/SELECTED_ROWS.json')));
    candidate.ordered_source_row_ids.forEach((id, index) => {
      const row = parsed.by_source_row_id.get(id);
      expect(row.source_artifact_locator.source_array_index).toBe(candidate.ordered_parent_positions_zero_based[index]);
      expect(row.raw[':id']).toBe(id);
    });
    const n6 = JSON.parse(fs.readFileSync(at('controls/N6_term_collision/SELECTED_ROWS.json')));
    expect(n6.parent_response_order.map(id => parsed.by_source_row_id.get(id).source_artifact_locator.source_array_index)).toHaveLength(9);
  });

  it('preserves exact source-spelling and six exact absence traps', () => {
    const parsed = parseDartRowsArtifact(at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_RESPONSE_BODY.json'), { relativeTo: root });
    const spellingRow = parsed.by_source_row_id.get('row-rs95.4bfi_igpx').raw;
    expect(spellingRow.short_description).toContain('COMBUSION');
    expect(Object.hasOwn(spellingRow, 'permit_expration_date')).toBe(true);
    expect(Object.hasOwn(spellingRow, 'permit_expiration_date')).toBe(false);
    expect(Object.hasOwn(spellingRow, 'enivronmental_justice')).toBe(true);
    expect(Object.hasOwn(spellingRow, 'environmental_justice')).toBe(false);

    const absentRow = parsed.by_source_row_id.get('row-dfh4~rvxx~mbiv').raw;
    const exactAbsentKeys = ['complete_status', 'enb_publication_date', 'enivronmental_justice', 'shpa_status', 'upa_class', 'written_comments_due'];
    for (const key of exactAbsentKeys) {
      expect(Object.hasOwn(absentRow, key)).toBe(false);
      expect(absentRow[key]).toBeUndefined();
      expect(Object.keys(absentRow)).not.toContain(key);
    }
  });

  it('parses N1 with exact row identity and unmasked privacy-bearing values', () => {
    const parsed = parseDartRowsArtifact(at('controls/N1_winneys_park_mine/source/R5_DART_stem_5-1730-00016_SYSFIELDS_CORRECTED.json'), { relativeTo: root });
    expect(parsed.rows).toHaveLength(12);
    expect(parsed.by_source_row_id.size).toBe(12);
    expect(new Set(parsed.rows.map(row => row.application_id)).size).toBeLessThan(12);
    expect(parsed.rows.some(row => row.raw.applicant === 'JOHN C WINNEY')).toBe(true);
    expect(parsed.rows.some(row => row.raw.dec_contact === 'SUSAN L CLICKNER')).toBe(true);
  });

  it('reads the N2/N5 shared parent once and resolves both JSON pointers', () => {
    let readCount = 0;
    const readFile = sourcePath => { readCount += 1; return fs.readFileSync(sourcePath); };
    const parsed = parseDartRowsArtifact(at('controls/N2_certainteed/source/DART_recent3_notnull_vendored_2026-08-18.json'), { relativeTo: root, requireSourceRowId: false, readFile });
    const n2 = Number(fs.readFileSync(at('controls/N2_certainteed/POINTER.txt'), 'utf8').trim().slice(1));
    const n5 = Number(fs.readFileSync(at('controls/N5_haeringer_property/POINTER.txt'), 'utf8').trim().slice(1));
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[n2].raw.facility).toBe('CERTAINTEED GYPSUM BUCHANAN LLC');
    expect(parsed.rows[n5].raw.facility).toBe('Haeringer Property');
    expect(parsed.rows[n2].source_artifact_locator.sha256).toBe(parsed.rows[n5].source_artifact_locator.sha256);
    expect(readCount).toBe(1);
  });

  it('keeps N3 row /2 separate from its metadata object', () => {
    const rowsPath = at('controls/N3_all_county_roads_and_bridges/source/DART_mbk7-f2r2_sample3_vendored_2026-08-18.json');
    const metadataPath = at('controls/N3_all_county_roads_and_bridges/source/R2_DART_mbk7-f2r2_metadata_20260822T042035Z.json');
    const parsed = parseDartRowsArtifact(rowsPath, { relativeTo: root, requireSourceRowId: false });
    expect(parsed.rows[2].raw.facility).toBe('ALL COUNTY ROADS AND BRIDGES');
    expect(identifyRawArtifact(metadataPath, { relativeTo: root }).sha256).not.toBe(parsed.artifact.sha256);
  });

  it('parses the complete three-row N4 parent and resolves /1 and /2 without a subset body', () => {
    const parsed = parseDartRowsArtifact(at('controls/N4_aero_marina_simmons/source/R1_DART_mbk7-f2r2_sample3_20260822T042035Z.json'), { relativeTo: root, requireSourceRowId: false });
    expect(parsed.rows).toHaveLength(3);
    expect(parsed.rows[1].raw.application_id).toBe('7-3122-00147/00011');
    expect(parsed.rows[2].raw.application_id).toBe('7-3122-00147/00012');
    expect(parsed.rows[1]).not.toBe(parsed.rows[2]);
  });

  it('checksum-binds the exact nested P1 ZIP artifact without inventing nested parsing', () => {
    const locator = identifyRawArtifact(at('controls/P1_greenidge/source/DCIM_T03H_H3_GREENIDGE_DART_OBSERVATION_20260824T165123Z.zip'), { relativeTo: root, retrievalReference: 'controls/P1_greenidge/H3_RECEIPT.md' });
    const manifest = JSON.parse(fs.readFileSync(at('FIXTURE_MANIFEST.json')));
    const entry = manifest.files.find(file => file.path === locator.source_path);
    expect(entry).toBeTruthy();
    expect(locator).toMatchObject({ byte_count: entry.bytes, sha256: entry.sha256 });
  });
});
