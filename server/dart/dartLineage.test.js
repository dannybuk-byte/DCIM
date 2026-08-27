import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { admitCandidateSources } from '../admissionContract.js';
import { countIndependentOrigins } from '../scoringEngine.js';
import { parseDartRowsArtifact } from './parseDartRows.js';
import { resolveFacilitySubject } from './facilityIdentity.js';
import { assessAdditionalDecId, collapseDartLineageSources, createDartCountingSource, DartLineageConflictError } from './dartLineage.js';

const root = path.resolve('data/dart-v0.9/fixtures/h8r1');
const at = relative => path.join(root, relative);
const adopted = {
  facility_subject_id: 'dcim_facility_subject:v1:ny:orangetown:75-third-ave-orangeburg-10962:orangetown-data-center',
  canonical_origin_id: 'nysdec_dart:3-3924-00493',
};

function officialSource() {
  const parsed = parseDartRowsArtifact(at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_RESPONSE_BODY.json'), { relativeTo: root });
  const manifest = JSON.parse(fs.readFileSync(at('candidate/orangetown/SELECTED_ROWS.json')));
  return createDartCountingSource(resolveFacilitySubject(parsed, manifest, adopted), adopted);
}

describe('E14 canonical DART lineage collapse', () => {
  it('admits exact official fixture-backed evidence and counts exactly one origin', () => {
    const source = officialSource();
    expect(source.source_row_ids).toHaveLength(4);
    expect(source.origin_id).toBe('nysdec_dart:3-3924-00493');
    expect(source.provenance).not.toMatch(/^(fixture|synthetic|design)$/);
    expect(source.counts_toward_floor).not.toBe(false);
    const admission = admitCandidateSources([source]);
    expect(admission.counted).toHaveLength(1);
    expect(countIndependentOrigins(admission.counted)).toBe(1);
  });

  it('does not manufacture origins from rows, permit variants, snapshots, retrievals, or echoes', () => {
    const source = officialSource();
    const variants = ['physical-row', 'permit-sequence', 'applicant-variant', 'status-variant', 'snapshot', 'retrieval', 'dec-enb-echo', 'n6-reference', 'n2-n5-pointer']
      .map((kind, index) => ({ ...source, id: `${source.id}:${index}`, kind }));
    const collapsed = collapseDartLineageSources([source, ...variants]);
    expect(collapsed).toHaveLength(1);
    expect(countIndependentOrigins(admitCandidateSources([source, ...variants]).counted)).toBe(1);
  });

  it('does not automatically count a second DEC ID', () => {
    expect(assessAdditionalDecId('3-3924-00493', '3-3924-00493')).toEqual({ outcome: 'SAME_LINEAGE', count_delta: 0 });
    expect(assessAdditionalDecId('3-3924-00493', '3-3924-99999')).toEqual({ outcome: 'UNRESOLVED_REQUIRES_EXPLICIT_ALIAS_OR_LINEAGE_DECISION', count_delta: 0 });
  });

  it.each(['facility_subject_id', 'dec_id', 'bounded_proposition', 'provenance', 'counts_toward_floor'])('fails closed on a same-origin %s conflict', field => {
    const source = officialSource();
    const conflicting = { ...source, id: `${source.id}:conflict`, [field]: field === 'counts_toward_floor' ? false : 'different' };
    expect(() => collapseDartLineageSources([source, conflicting])).toThrow(DartLineageConflictError);
  });

  it('validates DEC stems and requires an explicit alias before treating another stem as the adopted origin', () => {
    for (const invalid of ['', null, 1, '3-3924-00493/00001', 'not-a-stem']) {
      expect(() => assessAdditionalDecId(invalid, invalid)).toThrow(/INVALID_DEC_STEM/);
    }
    expect(assessAdditionalDecId('3-3924-00493', '3-3924-99999')).toEqual({ outcome: 'UNRESOLVED_REQUIRES_EXPLICIT_ALIAS_OR_LINEAGE_DECISION', count_delta: 0 });
    expect(assessAdditionalDecId('3-3924-00493', '3-3924-99999', { '3-3924-99999': '3-3924-00493' })).toEqual({ outcome: 'SAME_LINEAGE', count_delta: 0 });
    const distinctOrigins = [{ ...officialSource(), origin_id: 'nysdec_dart:3-3924-00493' }, { ...officialSource(), id: 'other', origin_id: 'nysdec_dart:3-3924-99999' }];
    expect(countIndependentOrigins(distinctOrigins)).toBe(2);
    expect(countIndependentOrigins(collapseDartLineageSources([officialSource(), { ...officialSource(), id: 'aliased' }]))).toBe(1);
  });
});

describe('E15 support/owner deletion invariance', () => {
  it('keeps every required owner/entity/network/support form outside the count', () => {
    const official = officialSource();
    const support = [
      'owner_resolution_signal', 'rdap_signal', 'asn_signal', 'bgp_route_signal', 'peeringdb_signal',
    ].map((type, index) => ({ id: `support-${index}`, type, origin_id: `support:${index}` }));
    support.push(
      { id: 'explicit-false', type: 'official_facility_record', origin_id: 'support:false', counts_toward_floor: false },
      { id: 'fixture-provenance', type: 'official_facility_record', origin_id: 'support:fixture', provenance: 'fixture' },
      { id: 'synthetic-provenance', type: 'official_facility_record', origin_id: 'support:synthetic', provenance: 'synthetic' },
      { id: 'design-provenance', type: 'official_facility_record', origin_id: 'support:design', provenance: 'design' },
    );
    const withSupport = admitCandidateSources([official, ...support]);
    const deletedSupport = admitCandidateSources([official]);
    expect(withSupport.support).toHaveLength(support.length);
    expect(countIndependentOrigins(withSupport.counted)).toBe(1);
    expect(countIndependentOrigins(deletedSupport.counted)).toBe(1);
  });
});
