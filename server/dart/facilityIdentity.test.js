import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseDartRowsArtifact, parseDartRowsJson } from './parseDartRows.js';
import { identifyArtifactBytes } from './rawArtifact.js';
import { DartFacilityIdentityError, resolveFacilitySubject } from './facilityIdentity.js';

const root = path.resolve('data/dart-v0.9/fixtures/h8r1');
const at = relative => path.join(root, relative);
const adopted = { facility_subject_id: 'dcim_facility_subject:v1:ny:orangetown:75-third-ave-orangeburg-10962:orangetown-data-center' };

function fixture() {
  const parsed = parseDartRowsArtifact(at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_RESPONSE_BODY.json'), { relativeTo: root });
  const manifest = JSON.parse(fs.readFileSync(at('candidate/orangetown/SELECTED_ROWS.json')));
  return { parsed, manifest, facility: resolveFacilitySubject(parsed, manifest, adopted) };
}

function mutatedFixture(mutateRows) {
  const source = at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_RESPONSE_BODY.json');
  const rows = JSON.parse(fs.readFileSync(source));
  mutateRows(rows);
  const bytes = Buffer.from(JSON.stringify(rows));
  const parsed = parseDartRowsJson(bytes, { artifact: identifyArtifactBytes(bytes, source, { relativeTo: root }) });
  const manifest = JSON.parse(fs.readFileSync(at('candidate/orangetown/SELECTED_ROWS.json')));
  manifest.parent_bytes = parsed.artifact.byte_count;
  manifest.parent_sha256 = parsed.artifact.sha256;
  return { parsed, manifest };
}

describe('E13 facility identity and project-generation boundary', () => {
  it('resolves the four exact parent rows in manifest order without collapsing physical rows', () => {
    const { manifest, facility } = fixture();
    expect(facility.facility_subject_id).toBe(adopted.facility_subject_id);
    expect(facility.contributing_source_row_ids).toEqual(manifest.ordered_source_row_ids);
    expect(facility.source_rows).toHaveLength(4);
    expect(facility.source_values).toEqual({
      facility: ['ORANGETOWN DATA CENTER'],
      location: ['75 THIRD AVE Orangeburg 10962'],
      municipality: ['ORANGETOWN'],
      county: 'UNDERIVED',
    });
    expect(facility.applications).toEqual([{ application_id: '3-3924-00493/00001', dec_id: '3-3924-00493', permit_sequence: '00001' }]);
    expect(facility.dec_id).toBe('3-3924-00493');
  });

  it('makes exact variants and non-conflicts explicit and keeps unsupported identities unresolved', () => {
    const { facility } = fixture();
    expect(facility.variants.applicant).toEqual({ field: 'applicant', values: ['JP MORGAN CHASE BANK NA', 'Steve Del Toro'], conflict: true });
    expect(facility.variants.application_type).toEqual({ field: 'application_type', values: ['Modification', 'New', 'Modification Treat as New'], conflict: true });
    expect(facility.variants.status).toEqual({ field: 'status', values: ['Issued'], conflict: false });
    expect(facility.project_generation_id).toBe('NOT_ASSIGNED_BY_H6');
    expect(facility.processing_episode_id).toBe('UNRESOLVED');
    expect(facility.prohibited_inferences).toEqual(expect.arrayContaining(['ownership', 'operator', 'construction', 'operation', 'capacity', 'county', 'project_generation', 'data_center_confirmation']));
    expect(Object.isFrozen(facility)).toBe(true);
    expect(Object.isFrozen(facility.source_rows[0].raw)).toBe(true);
  });

  it('fails closed when the selected manifest does not bind to the exact parent', () => {
    const { parsed, manifest } = fixture();
    expect(() => resolveFacilitySubject(parsed, { ...manifest, parent_sha256: '0'.repeat(64) }, adopted)).toThrowError(expect.objectContaining({ code: 'PARENT_SHA256_MISMATCH' }));
    expect(() => resolveFacilitySubject(parsed, { ...manifest, parent_bytes: manifest.parent_bytes + 1 }, adopted)).toThrowError(expect.objectContaining({ code: 'PARENT_BYTE_COUNT_MISMATCH' }));
    expect(() => resolveFacilitySubject(parsed, { ...manifest, ordered_source_row_ids: ['missing'], ordered_parent_positions_zero_based: [0] }, adopted)).toThrow(DartFacilityIdentityError);
  });

  it('derives the ID and rejects wrong manifest or adopted identities', () => {
    const { parsed, manifest, facility } = fixture();
    expect(facility.facility_subject_granularity).toBe('normalized_facility_subject');
    expect(() => resolveFacilitySubject(parsed, { ...manifest, facility_subject_id: 'wrong' }, adopted)).toThrowError(expect.objectContaining({ code: 'MANIFEST_FACILITY_SUBJECT_ID_MISMATCH' }));
    expect(() => resolveFacilitySubject(parsed, manifest, { facility_subject_id: 'wrong' })).toThrowError(expect.objectContaining({ code: 'ADOPTED_FACILITY_SUBJECT_ID_MISMATCH' }));
  });

  it('rejects duplicate IDs, duplicate positions, and invalid governed manifest bindings', () => {
    const { parsed, manifest } = fixture();
    expect(() => resolveFacilitySubject(parsed, { ...manifest, ordered_source_row_ids: [manifest.ordered_source_row_ids[0], manifest.ordered_source_row_ids[0]], ordered_parent_positions_zero_based: [3, 4] }, adopted)).toThrowError(expect.objectContaining({ code: 'DUPLICATE_SELECTED_ROW_ID' }));
    expect(() => resolveFacilitySubject(parsed, { ...manifest, ordered_source_row_ids: manifest.ordered_source_row_ids.slice(0, 2), ordered_parent_positions_zero_based: [3, 3] }, adopted)).toThrowError(expect.objectContaining({ code: 'DUPLICATE_SELECTED_ROW_POSITION' }));
    for (const changed of [
      { canonical_origin_id: 'nysdec_dart:wrong' },
      { project_generation_id: 'invented' },
      { processing_episode_id: 'invented' },
      { first_observed_at: '2026-01-01T00:00:00Z' },
    ]) expect(() => resolveFacilitySubject(parsed, { ...manifest, ...changed }, adopted)).toThrow(DartFacilityIdentityError);
  });

  it('fails closed on a missing municipality, conflicting facility values, and normalized-key collision', () => {
    const missing = mutatedFixture(rows => { delete rows[3].town_or_city; });
    expect(() => resolveFacilitySubject(missing.parsed, missing.manifest, adopted)).toThrowError(expect.objectContaining({ code: 'FACILITY_COMPONENT_MISSING_OR_CONFLICTING' }));

    const conflict = mutatedFixture(rows => { rows[4].facility = 'DIFFERENT FACILITY'; });
    expect(() => resolveFacilitySubject(conflict.parsed, conflict.manifest, adopted)).toThrowError(expect.objectContaining({ code: 'FACILITY_COMPONENT_MISSING_OR_CONFLICTING' }));

    const collision = mutatedFixture(rows => { rows[4].facility = 'ORANGETOWN\u3000DATA CENTER'; });
    expect(() => resolveFacilitySubject(collision.parsed, collision.manifest, adopted)).toThrowError(expect.objectContaining({ code: 'FACILITY_COMPONENT_MISSING_OR_CONFLICTING' }));
  });
});
