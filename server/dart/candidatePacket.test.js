import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildDartClocks, parseSelectedResponseHeaders } from './dartClocks.js';
import {
  buildDartCandidatePacket,
  createDartReviewerSafeProjection,
  DartCandidatePacketError,
} from './candidatePacket.js';
import { createDartCountingSource, DartLineageConflictError } from './dartLineage.js';
import { resolveFacilitySubject } from './facilityIdentity.js';
import { parseDartRowsArtifact } from './parseDartRows.js';

const root = path.resolve('data/dart-v0.9/fixtures/h8r1');
const at = relative => path.join(root, relative);
const sourceRelative = 'candidate/orangetown/source/R04_ROWS_DATA_CENTER_RESPONSE_BODY.json';
const retrievalReference = 'candidate/orangetown/RETRIEVAL_MANIFEST.tsv';

function derived() {
  const parsed = parseDartRowsArtifact(at(sourceRelative), {
    relativeTo: root,
    snapshotReference: null,
    retrievalReference,
  });
  const manifest = JSON.parse(fs.readFileSync(at('candidate/orangetown/SELECTED_ROWS.json')));
  const facility = resolveFacilitySubject(parsed, manifest, {
    facility_subject_id: manifest.facility_subject_id,
  });
  const rows = manifest.ordered_source_row_ids.map(id => parsed.by_source_row_id.get(id));
  const response_headers = parseSelectedResponseHeaders(fs.readFileSync(
    at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_SELECTED_RESPONSE_HEADERS.txt'),
    'utf8',
  ));
  const clocks = buildDartClocks(rows, {
    response_headers,
    retrieval_started_at: fs.readFileSync(at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_START_UTC.txt'), 'utf8').trim(),
    retrieval_finished_at: fs.readFileSync(at('candidate/orangetown/source/R04_ROWS_DATA_CENTER_FINISH_UTC.txt'), 'utf8').trim(),
  });
  const official = createDartCountingSource(facility, {
    canonical_origin_id: manifest.canonical_origin_id,
  });
  const input = {
    facility,
    clocks,
    source_artifact: parsed.artifact,
    candidate_sources: [official],
  };
  return { parsed, manifest, facility, clocks, official, input };
}

function packet(overrides = {}) {
  const value = derived();
  return { ...value, packet: buildDartCandidatePacket({ ...value.input, ...overrides }) };
}

function keys(value, found = []) {
  if (!value || typeof value !== 'object') return found;
  for (const [key, nested] of Object.entries(value)) {
    found.push(key);
    keys(nested, found);
  }
  return found;
}

describe('E16 internal exact CandidatePacket', () => {
  it('derives the exact one-origin withheld decision through the real gate', () => {
    const { manifest, packet: actual } = packet();
    expect(actual).toMatchObject({
      packet_schema_version: 'dcim-dart-candidate-packet-v0.9',
      object_class: 'dart_candidate_packet',
      projection: 'INTERNAL_EXACT',
      canonical_origin_id: 'nysdec_dart:3-3924-00493',
      subtype: 'insufficient_sources',
      disposition: 'suppress',
      independent_origin_count: 1,
      required_origin_count: 2,
      corroborated: false,
      score: null,
      presentation_reason: 'WITHHELD_ONE_ORIGIN',
    });
    expect(actual.canonical_origin_id).toBe(manifest.canonical_origin_id);
    expect(actual.missing_evidence).toEqual({
      additional_independent_official_origins_required: 1,
      meaning: 'A second institutionally independent official facility-level record is required before corroboration.',
    });
    expect(Object.isFrozen(actual)).toBe(true);
  });

  it('retains only the complete parent artifact locator', () => {
    const { parsed, packet: actual } = packet();
    expect(actual.source_artifact).toEqual(parsed.artifact);
    expect(Object.keys(actual.source_artifact)).toEqual([
      'source_path', 'byte_count', 'sha256', 'snapshot_reference', 'retrieval_reference',
    ]);
    expect(actual.source_artifact.snapshot_reference).toBeNull();
    expect(actual.source_artifact.retrieval_reference).toBe(retrievalReference);
    expect(actual.source_artifact).not.toHaveProperty('source_array_index');
  });

  it('carries exact identities, variants, unknowns, and four clocks without raw rows', () => {
    const { facility, clocks, packet: actual } = packet();
    expect(actual.contributing_source_row_ids).toEqual(facility.contributing_source_row_ids);
    expect(actual.contributing_source_row_ids).toHaveLength(4);
    expect(actual.applications).toEqual(facility.applications);
    expect(actual.applications[0].application_id).not.toBe(actual.applications[0].dec_id);
    expect(actual.source_values).toEqual(facility.source_values);
    expect(actual.variants).toEqual(facility.variants);
    expect(actual.variants.applicant.conflict).toBe(true);
    expect(actual.variants.application_type.conflict).toBe(true);
    expect(actual.source_values.county).toBe('UNDERIVED');
    expect(actual.project_generation_id).toBe('NOT_ASSIGNED_BY_H6');
    expect(actual.processing_episode_id).toBe('UNRESOLVED');
    expect(actual.clocks).toEqual(clocks);
    expect(actual.clocks.first_observed_at).toBeNull();
    expect(actual.clocks.source_event_clocks.some(clock => Object.values(clock.fields).some(field => field.state === 'ABSENT'))).toBe(true);
    expect(actual.prohibited_inferences).toEqual(facility.prohibited_inferences);
    expect(keys(actual)).not.toContain('source_rows');
  });
});

describe('E17 reviewer-safe projection', () => {
  it('removes precise identity/location and masks every applicant while retaining the decision', () => {
    const { packet: internal } = packet();
    const before = JSON.stringify(internal);
    const safe = createDartReviewerSafeProjection(internal);
    expect(safe.projection).toBe('REVIEWER_SAFE');
    expect(safe).not.toHaveProperty('facility_subject_id');
    expect(safe.source_values).not.toHaveProperty('location');
    expect(safe.variants.applicant.values).toEqual(internal.variants.applicant.values.map(() => 'MASKED_APPLICANT'));
    const serialized = JSON.stringify(safe);
    expect(serialized).not.toContain(internal.facility_subject_id);
    for (const value of internal.source_values.location) expect(serialized).not.toContain(value);
    for (const value of internal.variants.applicant.values) expect(serialized).not.toContain(value);
    expect(safe).toMatchObject({
      canonical_origin_id: internal.canonical_origin_id,
      subtype: internal.subtype,
      disposition: internal.disposition,
      corroborated: false,
      score: null,
      presentation_reason: internal.presentation_reason,
    });
    expect(keys(safe)).not.toEqual(expect.arrayContaining([
      'dec_contact', 'short_description', 'source_rows', 'raw', 'field_warrants',
    ]));
    expect(JSON.stringify(internal)).toBe(before);
    expect(Object.isFrozen(safe)).toBe(true);
  });

  it('rejects anything other than an internal exact packet', () => {
    expect(() => createDartReviewerSafeProjection({})).toThrowError(expect.objectContaining({
      code: 'INVALID_DART_REVIEWER_SAFE_PROJECTION_INPUT',
    }));
  });
});
describe('CandidatePacket B4/B5 bounded repair', () => {
  const policy = ['ownership', 'operator', 'construction', 'operation', 'capacity', 'county', 'project_generation', 'data_center_confirmation'];

  it('rejects whitespace-only semantic evidence at every adopted boundary', () => {
    for (const mutate of [
      value => { value.facility.facility_subject_id = ' \t '; },
      value => { value.source_artifact.source_path = ' \n '; },
      value => { value.facility.source_rows[0].source_row_id = ' '; value.facility.contributing_source_row_ids[0] = ' '; value.clocks.source_event_clocks[0].source_row_id = ' '; },
      value => { value.facility.source_values.facility[0] = ' '; },
      value => { value.facility.source_values.location[0] = ' '; },
      value => { value.facility.source_values.municipality[0] = ' '; },
      value => { const app = value.facility.applications[0]; app.permit_sequence = ' '; app.application_id = `${app.dec_id}/ `; value.candidate_sources[0].application_ids[0] = app.application_id; },
      value => { value.candidate_sources[0].bounded_proposition = ' \t '; },
    ]) {
      const value = structuredClone(derived().input); mutate(value);
      expect(() => buildDartCandidatePacket(value)).toThrow(DartCandidatePacketError);
    }
  });

  it('requires and republishes the exact private prohibited-inference policy', () => {
    const nominal = structuredClone(derived().input); nominal.facility.prohibited_inferences = [...policy];
    const actual = buildDartCandidatePacket(nominal);
    expect(actual.prohibited_inferences).toEqual(policy);
    expect(actual.prohibited_inferences).not.toBe(nominal.facility.prohibited_inferences);
    for (const replacement of [[], policy.slice(0, -1), [...policy.slice(0, -1), 'replacement'], [...policy, 'extra'], [policy[1], policy[0], ...policy.slice(2)], [...policy.slice(0, 2), ' ', ...policy.slice(3)], [...policy.slice(0, 2), policy[1], ...policy.slice(3)]]) {
      const value = structuredClone(derived().input); value.facility.prohibited_inferences = replacement;
      expect(() => buildDartCandidatePacket(value)).toThrow(DartCandidatePacketError);
    }
    const tampered = structuredClone(actual); tampered.prohibited_inferences = policy.slice(1);
    expect(() => createDartReviewerSafeProjection(tampered)).toThrowError(expect.objectContaining({ code: 'INVALID_DART_REVIEWER_SAFE_PROJECTION_INPUT' }));
  });

  it('derives truthful variant conflicts while preserving exact literals and order', () => {
    for (const mutate of [
      x => { x.values = []; x.conflict = false; },
      x => { x.values = [' ']; x.conflict = false; },
      x => { x.values = ['Exact', 'Exact']; x.conflict = false; },
      x => { x.values = ['Alpha', 'Beta']; x.conflict = false; },
      x => { x.values = ['Alpha']; x.conflict = true; },
    ]) {
      const value = structuredClone(derived().input); mutate(value.facility.variants.status);
      expect(() => buildDartCandidatePacket(value)).toThrow(DartCandidatePacketError);
    }
    for (const [values, conflict] of [[[' E\u0301XAMPLE  LLC ', 'éxample llc'], false], [['Alpha LLC', 'Beta LLC'], true]]) {
      const value = structuredClone(derived().input); value.facility.variants.status = { field: 'status', values: [...values], conflict };
      const actual = buildDartCandidatePacket(value);
      expect(actual.variants.status).toEqual({ field: 'status', values, conflict });
      expect(actual.variants.status.values).not.toBe(value.facility.variants.status.values);
      expect(Object.isFrozen(value.facility.variants.status.values)).toBe(false);
    }
  });

  it('validates applicant truth before masking and preserves its length and conflict', () => {
    const { packet: internal } = packet();
    const safe = createDartReviewerSafeProjection(internal);
    expect(safe.variants.applicant.values).toEqual(internal.variants.applicant.values.map(() => 'MASKED_APPLICANT'));
    expect(safe.variants.applicant.conflict).toBe(internal.variants.applicant.conflict);
    for (const mutate of [
      value => { value.variants.applicant.conflict = !value.variants.applicant.conflict; },
      value => { value.variants.application_type.values = ['Same', ' same ']; value.variants.application_type.conflict = true; },
      value => { value.prohibited_inferences = [...policy].reverse(); },
    ]) {
      const value = structuredClone(internal); mutate(value);
      expect(() => createDartReviewerSafeProjection(value)).toThrow(DartCandidatePacketError);
    }
    expect(Object.isFrozen(internal)).toBe(true);
  });
});

describe('CandidatePacket origin and support invariants', () => {
  it('collapses same-origin duplicate and echo representations to one decision', () => {
    const { input, official } = derived();
    const baseline = buildDartCandidatePacket(input);
    const duplicates = ['row', 'permit', 'snapshot', 'retrieval', 'echo'].map((kind, index) => ({
      ...official, id: `${official.id}:${index}`, kind,
    }));
    const mutated = buildDartCandidatePacket({ ...input, candidate_sources: [official, ...duplicates] });
    for (const field of ['independent_origin_count', 'subtype', 'disposition', 'corroborated', 'score', 'presentation_reason']) {
      expect(mutated[field]).toEqual(baseline[field]);
    }
    expect(mutated.missing_evidence).toEqual(baseline.missing_evidence);
  });

  it.each([
    ['owner_resolution_signal', 'real'],
    ['rdap_signal', 'real'],
    ['asn_signal', 'real'],
    ['bgp_route_signal', 'real'],
    ['peeringdb_signal', 'real'],
    ['official_facility_record', 'fixture'],
    ['official_facility_record', 'synthetic'],
    ['official_facility_record', 'design'],
    ['app_derived_analysis', 'real'],
  ])('%s/%s support cannot change the decision', (type, provenance) => {
    const { input, official } = derived();
    const support = { id: `support-${type}-${provenance}`, type, provenance, origin_id: `support:${type}` };
    const actual = buildDartCandidatePacket({ ...input, candidate_sources: [official, support] });
    expect(actual).toMatchObject({ independent_origin_count: 1, corroborated: false, score: null });
  });

  it('keeps a distinct canonical support origin non-counting without a lineage conflict', () => {
    const { input, official } = derived();
    const support = { ...official, id: `${official.id}:support`, origin_id: 'other_official:support', counts_toward_floor: false };
    const actual = buildDartCandidatePacket({ ...input, candidate_sources: [official, support] });
    expect(actual).toMatchObject({
      independent_origin_count: 1,
      required_origin_count: 2,
      corroborated: false,
      score: null,
      presentation_reason: 'WITHHELD_ONE_ORIGIN',
      canonical_origin_id: official.origin_id,
    });
  });

  it('preserves null and explicit unresolved states rather than substituting zero', () => {
    const { packet: actual } = packet();
    expect(actual.score).toBeNull();
    expect(actual.clocks.first_observed_at).toBeNull();
    expect(actual.source_values.county).toBe('UNDERIVED');
    expect(actual.processing_episode_id).toBe('UNRESOLVED');
    expect(actual.project_generation_id).toMatch(/^NOT_ASSIGNED/);
  });

  it.each(['facility_subject_id', 'dec_id', 'bounded_proposition', 'provenance', 'counts_toward_floor'])(
    'propagates an existing same-origin %s conflict',
    field => {
      const { input, official } = derived();
      const changed = field === 'counts_toward_floor' ? false : 'different';
      expect(() => buildDartCandidatePacket({
        ...input,
        candidate_sources: [official, { ...official, id: `${official.id}:conflict`, [field]: changed }],
      })).toThrow(DartLineageConflictError);
    },
  );

  it('fails closed for zero eligible origins', () => {
    const { input } = derived();
    expect(() => buildDartCandidatePacket({ ...input, candidate_sources: [] })).toThrowError(expect.objectContaining({
      code: 'DART_CANDIDATE_PACKET_NOT_ONE_ORIGIN_WITHHELD',
    }));
  });

  it('fails closed when a second independent official origin crosses the real gate', () => {
    const { input, official } = derived();
    const second = { ...official, id: `${official.id}:second`, origin_id: 'other_official:second' };
    expect(() => buildDartCandidatePacket({ ...input, candidate_sources: [official, second] })).toThrowError(expect.objectContaining({
      code: 'DART_CANDIDATE_PACKET_NOT_ONE_ORIGIN_WITHHELD',
    }));
  });
});

describe('CandidatePacket binding, gate, and production guards', () => {
  it.each([
    ['sha256', '0'.repeat(64)],
    ['byte_count', 1],
    ['source_path', 'different'],
    ['retrieval_reference', 'different'],
  ])('rejects a mismatched artifact %s', (field, value) => {
    const { input } = derived();
    expect(() => buildDartCandidatePacket({
      ...input,
      source_artifact: { ...input.source_artifact, [field]: value },
    })).toThrowError(expect.objectContaining({ code: 'DART_CANDIDATE_PACKET_IDENTITY_MISMATCH' }));
  });

  it('rejects counted-origin facility, DEC, and selected-row identity mismatches', () => {
    const { input, official } = derived();
    for (const changed of [
      { facility_subject_id: 'different' },
      { dec_id: '1-1111-11111' },
      { source_row_ids: official.source_row_ids.slice(1) },
    ]) expect(() => buildDartCandidatePacket({
      ...input,
      candidate_sources: [{ ...official, ...changed }],
    })).toThrowError(expect.objectContaining({ code: 'DART_CANDIDATE_PACKET_IDENTITY_MISMATCH' }));
  });

  it('rejects malformed inputs without emitting a packet', () => {
    const { input } = derived();
    expect(() => buildDartCandidatePacket({ ...input, candidate_sources: 'invalid' })).toThrow(DartCandidatePacketError);
    expect(() => buildDartCandidatePacket()).toThrowError(expect.objectContaining({
      code: 'INVALID_DART_CANDIDATE_PACKET_INPUT',
    }));
  });

  it('keeps production generic, pure, and independent of fixture metadata', () => {
    const source = fs.readFileSync(path.resolve('server/dart/candidatePacket.js'), 'utf8');
    for (const forbidden of [
      'node:fs', 'node:path', 'node:crypto', 'readFile', 'process.', 'data/dart-v0.9',
      'CHECKSUMS_SHA256.txt', 'SELECTED_ROWS.json',
      ['LINEAGE', 'AND', 'EXPECTED', 'POSTURE'].join('_'),
      'orangetown', '3-3924-00493', sourceRelative,
    ]) expect(source.toLowerCase()).not.toContain(forbidden.toLowerCase());
    expect(source).not.toMatch(/new Date\s*\(\s*\)/);
    expect(source).not.toContain('Date.now()');
  });
});

describe('CandidatePacket repair adversarial coverage', () => {
  it.each([
    ['origin_id', 'wrong_namespace:value'],
    ['type', 'wrong_type'],
    ['provenance', 'wrong_provenance'],
    ['id', 'wrong_id'],
    ['application_ids', ['wrong_application']],
  ])('rejects wrong exact DART binding %s', (field, value) => {
    const { input, official } = derived();
    expect(() => buildDartCandidatePacket({ ...input, candidate_sources: [{ ...official, [field]: value }] }))
      .toThrowError(expect.objectContaining({ code: 'DART_CANDIDATE_PACKET_IDENTITY_MISMATCH' }));
  });

  it('fails closed on a rejected raw row and duplicate source IDs', () => {
    const { input, official } = derived();
    for (const sources of [[official, { id: 'rejected' }], [official, { ...official }]]) {
      expect(() => buildDartCandidatePacket({ ...input, candidate_sources: sources }))
        .toThrowError(expect.objectContaining({ code: 'DART_CANDIDATE_PACKET_GATE_SHAPE_INVALID' }));
    }
  });

  it('rejects unexpected safe-projection top-level and nested keys', () => {
    const { packet: internal } = packet();
    for (const changed of [
      { ...internal, dec_contact: 'injected' },
      { ...internal, source_values: { ...internal.source_values, raw: true } },
      { ...internal, variants: { ...internal.variants, field_warrants: true } },
    ]) expect(() => createDartReviewerSafeProjection(changed))
      .toThrowError(expect.objectContaining({ code: 'INVALID_DART_REVIEWER_SAFE_PROJECTION_INPUT' }));
  });

  it('uses exact internal and reviewer-safe controlled schemas', () => {
    const { packet: internal } = packet(); const safe = createDartReviewerSafeProjection(internal);
    expect(Object.keys(internal)).toEqual([
      'packet_schema_version', 'object_class', 'projection', 'facility_subject_id', 'facility_subject_granularity', 'canonical_origin_id', 'source_artifact', 'contributing_source_row_ids', 'applications', 'dec_id', 'source_values', 'variants', 'project_generation_id', 'processing_episode_id', 'clocks', 'prohibited_inferences', 'subtype', 'disposition', 'independent_origin_count', 'required_origin_count', 'corroborated', 'score', 'presentation_reason', 'missing_evidence',
    ]);
    expect(Object.keys(safe)).toEqual(Object.keys(internal).filter(key => key !== 'facility_subject_id'));
    expect(Object.keys(internal.applications[0])).toEqual(['application_id', 'dec_id', 'permit_sequence']);
    expect(Object.keys(internal.variants.applicant)).toEqual(['field', 'values', 'conflict']);
  });

  it('deep-copies before recursively freezing', () => {
    const { input } = derived(); const mutable = structuredClone(input); const actual = buildDartCandidatePacket(mutable);
    expect(Object.isFrozen(actual.clocks.source_event_clocks[0].fields)).toBe(true);
    expect(Object.isFrozen(mutable.facility)).toBe(false); expect(Object.isFrozen(mutable.clocks)).toBe(false);
    mutable.facility.source_values.facility.push('independently mutable');
    expect(actual.source_values.facility).not.toContain('independently mutable');
  });

  it.each([
    ['county', input => { input.facility.source_values.county = 'invented'; }],
    ['project', input => { input.facility.project_generation_id = 'invented'; }],
    ['episode', input => { input.facility.processing_episode_id = 'invented'; }],
    ['first observation', input => { input.clocks.first_observed_at = 'invented'; }],
    ['null-state value', input => { const state = Object.values(input.clocks.source_event_clocks[0].fields).find(value => value.state !== 'PRESENT_EXACT'); state.value = 'invented'; }],
  ])('rejects invalid governed unknown state: %s', (_name, mutate) => {
    const { input } = derived(); const mutable = structuredClone(input); mutate(mutable);
    expect(() => buildDartCandidatePacket(mutable)).toThrow(DartCandidatePacketError);
  });
});

describe('CandidatePacket IV1 bounded repair regressions', () => {
  it('rejects object-valued reviewer-safe scalar leaves without freezing caller objects', () => {
    const { packet: internal } = packet();
    for (const mutate of [
      value => { value.facility_subject_granularity = {}; },
      value => { value.canonical_origin_id = {}; },
      value => { value.dec_id = {}; },
      value => { value.missing_evidence.meaning = {}; },
    ]) {
      const value = structuredClone(internal); mutate(value);
      expect(() => createDartReviewerSafeProjection(value)).toThrow(DartCandidatePacketError);
    }
    const injected = { dec_contact: 'private' };
    const value = structuredClone(internal); value.clocks.retrieval_clock.primary.value = injected;
    expect(() => createDartReviewerSafeProjection(value)).toThrow(DartCandidatePacketError);
    expect(Object.isFrozen(injected)).toBe(false);
  });

  it('rejects invalid reviewer-safe arrays, meanings, clock states, and unknown keys', () => {
    const { packet: internal } = packet();
    for (const mutate of [
      value => { value.contributing_source_row_ids = 'row'; },
      value => { value.prohibited_inferences = 'inference'; },
      value => { value.missing_evidence.additional_independent_official_origins_required = 0; },
      value => { value.clocks.source_event_clocks[0].fields.date_received = { state: 'PRESENT_EXACT', value: {} }; },
      value => { value.clocks.source_event_clocks[0].fields.date_received = { state: 'ABSENT', value: 'date' }; },
      value => { value.clocks.source_event_clocks[0].fields.date_received = { state: 'PRESENT_NULL', value: 'date' }; },
      value => { value.unknown = true; },
      value => { value.clocks.retrieval_clock.primary.unknown = true; },
    ]) {
      const value = structuredClone(internal); mutate(value);
      expect(() => createDartReviewerSafeProjection(value)).toThrow(DartCandidatePacketError);
    }
  });

  it('rejects vacuous evidence and each independently empty governed evidence collection', () => {
    const { input } = derived();
    const empty = structuredClone(input);
    empty.source_artifact.byte_count = 0;
    empty.facility.source_rows = [];
    empty.facility.contributing_source_row_ids = [];
    empty.facility.applications = [];
    empty.facility.source_values.facility = [];
    empty.facility.source_values.location = [];
    empty.facility.source_values.municipality = [];
    empty.clocks.source_event_clocks = [];
    expect(() => buildDartCandidatePacket(empty)).toThrow(DartCandidatePacketError);
    for (const mutate of [
      value => { value.source_artifact.byte_count = 0; },
      value => { value.facility.source_rows = []; value.facility.contributing_source_row_ids = []; value.clocks.source_event_clocks = []; },
      value => { value.facility.applications = []; },
      value => { value.facility.source_values.facility = []; },
      value => { value.facility.source_values.location = []; },
      value => { value.facility.source_values.municipality = []; },
      value => { value.clocks.source_event_clocks = []; },
    ]) {
      const value = structuredClone(input); mutate(value);
      expect(() => buildDartCandidatePacket(value)).toThrow(DartCandidatePacketError);
    }
  });

  it('rejects duplicate and inconsistent physical, application, DEC, and clock identities', () => {
    const { input } = derived();
    for (const mutate of [
      value => { value.facility.source_rows[1].source_row_id = value.facility.source_rows[0].source_row_id; value.facility.contributing_source_row_ids[1] = value.facility.contributing_source_row_ids[0]; value.clocks.source_event_clocks[1].source_row_id = value.clocks.source_event_clocks[0].source_row_id; },
      value => {
        const first = structuredClone(value.facility.applications[0]);
        value.facility.applications = [first, structuredClone(first)];
        value.candidate_sources[0].application_ids = [first.application_id, first.application_id];
      },
      value => { value.facility.dec_id = 'invalid'; },
      value => { value.facility.applications[0].application_id = 'wrong'; },
      value => { value.facility.applications[0].dec_id = '1-1111-11111'; value.facility.applications[0].application_id = `1-1111-11111/${value.facility.applications[0].permit_sequence}`; },
    ]) {
      const value = structuredClone(input); mutate(value);
      expect(() => buildDartCandidatePacket(value)).toThrow(DartCandidatePacketError);
    }
  });

  it('selects the exact canonical DART source independently of compatible echo order', () => {
    const { input, official } = derived(); const baseline = buildDartCandidatePacket(input);
    const echoes = [1, 2].map(index => ({ ...official, id: `${official.id}:echo-${index}`, source_row_ids: ['echo'], application_ids: ['echo'] }));
    const permutations = [
      [official, ...echoes], [official, echoes[1], echoes[0]], [echoes[0], official, echoes[1]],
      [echoes[0], echoes[1], official], [echoes[1], official, echoes[0]], [echoes[1], echoes[0], official],
    ];
    for (const candidate_sources of permutations) expect(buildDartCandidatePacket({ ...input, candidate_sources })).toEqual(baseline);
  });

  it('keeps compatible echoes and distinct support non-counting while a second counted origin blocks emission', () => {
    const { input, official } = derived();
    const echo = { ...official, id: `${official.id}:echo`, source_row_ids: ['echo'], application_ids: ['echo'] };
    const support = { ...official, id: `${official.id}:support`, origin_id: 'other_official:support', counts_toward_floor: false };
    expect(buildDartCandidatePacket({ ...input, candidate_sources: [echo, support, official] })).toMatchObject({ independent_origin_count: 1, corroborated: false });
    const second = { ...official, id: `${official.id}:second`, origin_id: 'other_official:second' };
    expect(() => buildDartCandidatePacket({ ...input, candidate_sources: [echo, official, second] }))
      .toThrowError(expect.objectContaining({ code: 'DART_CANDIDATE_PACKET_NOT_ONE_ORIGIN_WITHHELD' }));
    expect(() => buildDartCandidatePacket({ ...input, candidate_sources: [echo, { ...official, id: `${official.id}:conflict`, counts_toward_floor: false }, official] }))
      .toThrow(DartLineageConflictError);
  });
});

describe('CandidatePacket FB-036 exact-literal source-value uniqueness', () => {
  const sourceValueFields = ['facility', 'location', 'municipality'];

  function expectGovernedError(run, code) {
    let error;
    try { run(); } catch (caught) { error = caught; }
    expect(error).toBeInstanceOf(DartCandidatePacketError);
    expect(error.code).toBe(code);
    expect(error.details).toEqual({ field: 'source_values' });
  }

  it.each(sourceValueFields)('rejects exact duplicate %s source values through internal construction', field => {
    const value = structuredClone(derived().input);
    const literal = value.facility.source_values[field][0];
    value.facility.source_values[field] = [literal, literal];
    expectGovernedError(
      () => buildDartCandidatePacket(value),
      'INVALID_DART_CANDIDATE_PACKET_INPUT',
    );
  });

  it.each(sourceValueFields)('rejects exact duplicate %s source values before reviewer-safe projection', field => {
    const { packet: internal } = packet();
    const value = structuredClone(internal);
    const literal = value.source_values[field][0];
    value.source_values[field] = [literal, literal];
    expectGovernedError(
      () => createDartReviewerSafeProjection(value),
      'INVALID_DART_REVIEWER_SAFE_PROJECTION_INPUT',
    );
  });

  it('preserves case-distinct and trailing-space-distinct source literals and their order', () => {
    for (const field of sourceValueFields) {
      const value = structuredClone(derived().input);
      const literal = value.facility.source_values[field][0];
      const distinct = [literal, literal.toLowerCase(), `${literal} `];
      value.facility.source_values[field] = distinct;
      const actual = buildDartCandidatePacket(value);
      expect(actual.source_values[field]).toEqual(distinct);
      expect(actual.source_values[field]).not.toBe(value.facility.source_values[field]);
    }
  });

  it('preserves safe-visible distinct literals and accepts omitted-location variants without mutating the internal packet', () => {
    for (const field of sourceValueFields) {
      const { packet: internal } = packet();
      const value = structuredClone(internal);
      const literal = value.source_values[field][0];
      const distinct = [literal, literal.toLowerCase(), `${literal} `];
      value.source_values[field] = distinct;
      const before = structuredClone(value.source_values);
      const safe = createDartReviewerSafeProjection(value);
      if (field === 'location') expect(safe.source_values).not.toHaveProperty('location');
      else expect(safe.source_values[field]).toEqual(distinct);
      expect(value.source_values).toEqual(before);
    }
  });
});
