import { admitCandidateSources, isValidCanonicalOriginId } from '../admissionContract.js';
import { scoreCompany } from '../scoringEngine.js';
import { collapseDartLineageSources } from './dartLineage.js';

const FLOOR = 2;
const DEC_STEM = /^[0-9]+-[0-9]+-[0-9]+$/;
const MISSING_EVIDENCE_MEANING = 'A second institutionally independent official facility-level record is required before corroboration.';
const REFERENCE_DATE = new Date('2000-01-01T00:00:00.000Z');
const AF = ['source_path', 'byte_count', 'sha256', 'snapshot_reference', 'retrieval_reference'];
const APP = ['application_id', 'dec_id', 'permit_sequence'];
const SV = ['facility', 'location', 'municipality', 'county'];
const VN = ['applicant', 'application_type', 'status'];
const VF = ['field', 'values', 'conflict'];
const EF = ['date_received', 'enb_publication_date', 'written_comments_due', 'permit_effective_date', 'permit_expration_date'];
const IF = ['packet_schema_version', 'object_class', 'projection', 'facility_subject_id', 'facility_subject_granularity', 'canonical_origin_id', 'source_artifact', 'contributing_source_row_ids', 'applications', 'dec_id', 'source_values', 'variants', 'project_generation_id', 'processing_episode_id', 'clocks', 'prohibited_inferences', 'subtype', 'disposition', 'independent_origin_count', 'required_origin_count', 'corroborated', 'score', 'presentation_reason', 'missing_evidence'];
const PROHIBITED_INFERENCES = Object.freeze(['ownership', 'operator', 'construction', 'operation', 'capacity', 'county', 'project_generation', 'data_center_confirmation']);

function freeze(v, seen = new Set()) { if (!v || typeof v !== 'object' || seen.has(v)) return v; seen.add(v); Object.values(v).forEach(x => freeze(x, seen)); return Object.freeze(v); }
function object(v) { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function exact(v, fields) { return object(v) && Object.keys(v).length === fields.length && fields.every(k => Object.hasOwn(v, k)); }
function semantic(v) { return typeof v === 'string' && v.trim().length > 0; }
function strings(v) { return Array.isArray(v) && v.every(semantic); }
function nonemptyStrings(v) { return Array.isArray(v) && v.length > 0 && v.every(semantic); }
function unique(v) { return new Set(v).size === v.length; }
function same(a, b) { return Array.isArray(a) && Array.isArray(b) && a.length === b.length && a.every((v, i) => v === b[i]); }
function canonicalPolicy(v) { return same(v, PROHIBITED_INFERENCES); }
function normalizeVariantValue(v) { return v.normalize('NFC').trim().replace(/\s+/gu, ' ').toLowerCase(); }

export class DartCandidatePacketError extends Error { constructor(code, details = {}) { super(code); this.name = 'DartCandidatePacketError'; this.code = code; this.details = freeze({ ...details }); } }
function fail(code, field) { throw new DartCandidatePacketError(code, field ? { field } : {}); }

function artifact(v, code = 'INVALID_DART_CANDIDATE_PACKET_INPUT') {
  if (!exact(v, AF) || !semantic(v.source_path) || !Number.isInteger(v.byte_count) || v.byte_count <= 0 || typeof v.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(v.sha256) || !(v.snapshot_reference === null || semantic(v.snapshot_reference)) || !(v.retrieval_reference === null || semantic(v.retrieval_reference))) fail(code, 'source_artifact');
  return { source_path: v.source_path, byte_count: v.byte_count, sha256: v.sha256, snapshot_reference: v.snapshot_reference, retrieval_reference: v.retrieval_reference };
}
function applications(v, code = 'INVALID_DART_CANDIDATE_PACKET_INPUT') {
  if (!Array.isArray(v) || v.length === 0 || v.some(a => !exact(a, APP) || APP.some(k => !semantic(a[k])) || !DEC_STEM.test(a.dec_id) || a.application_id !== `${a.dec_id}/${a.permit_sequence}`) || !unique(v.map(a => a.application_id))) fail(code, 'applications');
  return v.map(a => ({ application_id: a.application_id, dec_id: a.dec_id, permit_sequence: a.permit_sequence }));
}
function sourceValues(v, safe = false, code = 'INVALID_DART_CANDIDATE_PACKET_INPUT') {
  const fields = safe ? ['facility', 'municipality', 'county'] : SV;
  if (!exact(v, fields) || !nonemptyStrings(v.facility) || !unique(v.facility) || (!safe && (!nonemptyStrings(v.location) || !unique(v.location))) || !nonemptyStrings(v.municipality) || !unique(v.municipality) || v.county !== 'UNDERIVED') fail(code, 'source_values');
  return safe ? { facility: [...v.facility], municipality: [...v.municipality], county: v.county } : { facility: [...v.facility], location: [...v.location], municipality: [...v.municipality], county: v.county };
}
function variants(v, mask = false, code = 'INVALID_DART_CANDIDATE_PACKET_INPUT') {
  if (!exact(v, VN)) fail(code, 'variants'); const out = {};
  for (const name of VN) { const x = v[name]; if (!exact(x, VF) || x.field !== name || !nonemptyStrings(x.values) || !unique(x.values) || typeof x.conflict !== 'boolean' || x.conflict !== (new Set(x.values.map(normalizeVariantValue)).size > 1)) fail(code, `variants.${name}`); out[name] = { field: x.field, values: mask && name === 'applicant' ? x.values.map(() => 'MASKED_APPLICANT') : [...x.values], conflict: x.conflict }; }
  return out;
}
function clocks(v, code = 'INVALID_DART_CANDIDATE_PACKET_INPUT') {
  if (!exact(v, ['source_event_clocks', 'publication_snapshot_clock', 'retrieval_clock', 'first_observed_at']) || v.first_observed_at !== null || !Array.isArray(v.source_event_clocks) || v.source_event_clocks.length === 0) fail(code, 'clocks');
  const events = v.source_event_clocks.map(row => { if (!exact(row, ['source_row_id', 'fields']) || !semantic(row.source_row_id) || !exact(row.fields, EF)) fail(code, 'clocks.source_event_clocks'); const fields = {}; for (const name of EF) { const x = row.fields[name]; if (!exact(x, ['state', 'value']) || !['ABSENT', 'PRESENT_NULL', 'PRESENT_EXACT'].includes(x.state) || (x.state === 'PRESENT_EXACT' ? !semantic(x.value) : x.value !== null)) fail(code, `clocks.${name}`); fields[name] = { state: x.state, value: x.value }; } return { source_row_id: row.source_row_id, fields }; });
  const p = v.publication_snapshot_clock; const m = p?.corroborating_metadata; const r = v.retrieval_clock;
  if (!exact(p, ['primary', 'corroborating_metadata']) || !exact(p.primary, ['authority', 'value']) || typeof p.primary.authority !== 'string' || !p.primary.authority || !(p.primary.value === null || typeof p.primary.value === 'string') || !exact(m, ['last_modified', 'socrata_created_at_values', 'socrata_updated_at_values']) || !(m.last_modified === null || typeof m.last_modified === 'string') || !strings(m.socrata_created_at_values) || !strings(m.socrata_updated_at_values) || !exact(r, ['primary', 'retrieval_window_utc', 'x_socrata_request_id']) || !exact(r.primary, ['authority', 'value']) || typeof r.primary.authority !== 'string' || !r.primary.authority || !(r.primary.value === null || typeof r.primary.value === 'string') || !exact(r.retrieval_window_utc, ['started_at', 'finished_at']) || typeof r.retrieval_window_utc.started_at !== 'string' || !r.retrieval_window_utc.started_at || typeof r.retrieval_window_utc.finished_at !== 'string' || !r.retrieval_window_utc.finished_at || !(r.x_socrata_request_id === null || typeof r.x_socrata_request_id === 'string')) fail(code, 'clocks');
  return { source_event_clocks: events, publication_snapshot_clock: { primary: { authority: p.primary.authority, value: p.primary.value }, corroborating_metadata: { last_modified: m.last_modified, socrata_created_at_values: [...m.socrata_created_at_values], socrata_updated_at_values: [...m.socrata_updated_at_values] } }, retrieval_clock: { primary: { authority: r.primary.authority, value: r.primary.value }, retrieval_window_utc: { started_at: r.retrieval_window_utc.started_at, finished_at: r.retrieval_window_utc.finished_at }, x_socrata_request_id: r.x_socrata_request_id }, first_observed_at: null };
}

export function buildDartCandidatePacket({ facility, clocks: clockInput, source_artifact, candidate_sources } = {}) {
  if (!Array.isArray(candidate_sources)) fail('INVALID_DART_CANDIDATE_PACKET_INPUT', 'candidate_sources');
  if (!object(facility) || !semantic(facility.facility_subject_id) || facility.facility_subject_granularity !== 'normalized_facility_subject' || !semantic(facility.dec_id) || !DEC_STEM.test(facility.dec_id) || !Array.isArray(facility.source_rows) || facility.source_rows.length === 0 || !nonemptyStrings(facility.contributing_source_row_ids) || !unique(facility.contributing_source_row_ids) || !canonicalPolicy(facility.prohibited_inferences)) fail('INVALID_DART_CANDIDATE_PACKET_INPUT');
  const a = artifact(source_artifact); const apps = applications(facility?.applications); const sv = sourceValues(facility?.source_values); const vv = variants(facility?.variants); const cc = clocks(clockInput);
  const rowIds = facility.source_rows.map(r => r?.source_row_id); if (!nonemptyStrings(rowIds) || !unique(rowIds) || !unique(cc.source_event_clocks.map(c => c.source_row_id)) || !same(rowIds, facility.contributing_source_row_ids) || !same(rowIds, cc.source_event_clocks.map(c => c.source_row_id))) fail('DART_CANDIDATE_PACKET_IDENTITY_MISMATCH', 'facility');
  for (const row of facility.source_rows) if (!row?.source_artifact_locator || AF.some(k => row.source_artifact_locator[k] !== a[k])) fail('DART_CANDIDATE_PACKET_IDENTITY_MISMATCH', 'source_artifact');
  if (facility.project_generation_id !== 'NOT_ASSIGNED_BY_H6' || facility.processing_episode_id !== 'UNRESOLVED') fail('INVALID_DART_CANDIDATE_PACKET_INPUT', 'unknown_state');
  if (apps.some(x => x.dec_id !== facility.dec_id)) fail('DART_CANDIDATE_PACKET_IDENTITY_MISMATCH', 'applications');
  const raw = admitCandidateSources(candidate_sources); if (raw.malformed || raw.rejected.length || raw.duplicateIds.length) fail('DART_CANDIDATE_PACKET_GATE_SHAPE_INVALID');
  collapseDartLineageSources([...raw.counted, ...raw.support.filter(x => isValidCanonicalOriginId(x.origin_id))]);
  const expectedOrigin = `nysdec_dart:${facility.dec_id}`; const expectedId = `dart-lineage:${facility.facility_subject_id}:${facility.dec_id}`;
  const canonical = raw.counted.find(x => semantic(x?.id) && x.id === expectedId && semantic(x.origin_id) && x.origin_id === expectedOrigin && semantic(x.type) && x.type === 'official_facility_record' && semantic(x.provenance) && x.provenance === 'official_nysdec_dart_exact_bytes' && x.counts_toward_floor === true && semantic(x.facility_subject_id) && x.facility_subject_id === facility.facility_subject_id && semantic(x.dec_id) && x.dec_id === facility.dec_id && nonemptyStrings(x.source_row_ids) && unique(x.source_row_ids) && same(x.source_row_ids, facility.contributing_source_row_ids) && nonemptyStrings(x.application_ids) && unique(x.application_ids) && same(x.application_ids, apps.map(y => y.application_id)) && semantic(x.bounded_proposition));
  const collapsedCounted = collapseDartLineageSources(raw.counted).map(x => x.origin_id === expectedOrigin && canonical ? canonical : x); const collapsed = [...collapsedCounted, ...raw.support, ...raw.annotations]; const admitted = admitCandidateSources(collapsed); const gate = scoreCompany({ id: facility.facility_subject_id, sources: collapsed }, REFERENCE_DATE); const origins = [...new Set(admitted.counted.map(x => x.origin_id))];
  if (gate.independent_origin_count !== 1 || origins.length !== 1) fail('DART_CANDIDATE_PACKET_NOT_ONE_ORIGIN_WITHHELD');
  const x = admitted.counted[0];
  if (admitted.counted.length !== 1 || x?.origin_id !== expectedOrigin || x.id !== expectedId || x.type !== 'official_facility_record' || x.provenance !== 'official_nysdec_dart_exact_bytes' || x.counts_toward_floor !== true || x.facility_subject_id !== facility.facility_subject_id || x.dec_id !== facility.dec_id || !nonemptyStrings(x.source_row_ids) || !unique(x.source_row_ids) || !same(x.source_row_ids, facility.contributing_source_row_ids) || !nonemptyStrings(x.application_ids) || !unique(x.application_ids) || !same(x.application_ids, apps.map(y => y.application_id)) || !semantic(x.bounded_proposition)) fail('DART_CANDIDATE_PACKET_IDENTITY_MISMATCH', 'counted_origin');
  const nulls = ['aas', 'lss', 'ds', 'raw_mismatch_index', 'mismatch_index', 'bounded_mismatch_index']; if (FLOOR !== 2 || gate.source_count !== admitted.counted.length || gate.independent_origin_count !== origins.length || gate.admission?.malformed !== false || !same(gate.admission.rejected_rows, []) || !same(gate.admission.duplicate_ids, []) || gate.admission.admitted_source_count !== admitted.counted.length || gate.scores_suppressed !== true || !nulls.every(k => gate[k] === null)) fail('DART_CANDIDATE_PACKET_GATE_SHAPE_INVALID');
  return freeze({ packet_schema_version: 'dcim-dart-candidate-packet-v0.9', object_class: 'dart_candidate_packet', projection: 'INTERNAL_EXACT', facility_subject_id: facility.facility_subject_id, facility_subject_granularity: facility.facility_subject_granularity, canonical_origin_id: x.origin_id, source_artifact: a, contributing_source_row_ids: [...facility.contributing_source_row_ids], applications: apps, dec_id: facility.dec_id, source_values: sv, variants: vv, project_generation_id: facility.project_generation_id, processing_episode_id: facility.processing_episode_id, clocks: cc, prohibited_inferences: [...PROHIBITED_INFERENCES], subtype: 'insufficient_sources', disposition: 'suppress', independent_origin_count: gate.independent_origin_count, required_origin_count: FLOOR, corroborated: false, score: null, presentation_reason: 'WITHHELD_ONE_ORIGIN', missing_evidence: { additional_independent_official_origins_required: 1, meaning: MISSING_EVIDENCE_MEANING } });
}

export function createDartReviewerSafeProjection(packet) {
  const code = 'INVALID_DART_REVIEWER_SAFE_PROJECTION_INPUT'; if (!exact(packet, IF) || packet.packet_schema_version !== 'dcim-dart-candidate-packet-v0.9' || packet.object_class !== 'dart_candidate_packet' || packet.projection !== 'INTERNAL_EXACT' || !semantic(packet.facility_subject_id) || packet.facility_subject_granularity !== 'normalized_facility_subject' || !semantic(packet.dec_id) || !DEC_STEM.test(packet.dec_id) || packet.canonical_origin_id !== `nysdec_dart:${packet.dec_id}` || packet.project_generation_id !== 'NOT_ASSIGNED_BY_H6' || packet.processing_episode_id !== 'UNRESOLVED' || packet.subtype !== 'insufficient_sources' || packet.disposition !== 'suppress' || packet.independent_origin_count !== 1 || packet.required_origin_count !== 2 || packet.corroborated !== false || packet.score !== null || packet.presentation_reason !== 'WITHHELD_ONE_ORIGIN' || !exact(packet.missing_evidence, ['additional_independent_official_origins_required', 'meaning']) || packet.missing_evidence.additional_independent_official_origins_required !== 1 || packet.missing_evidence.meaning !== MISSING_EVIDENCE_MEANING || !nonemptyStrings(packet.contributing_source_row_ids) || !unique(packet.contributing_source_row_ids) || !canonicalPolicy(packet.prohibited_inferences)) fail(code);
  const a = artifact(packet.source_artifact, code); const apps = applications(packet.applications, code); sourceValues(packet.source_values, false, code); const vv = variants(packet.variants, true, code); const cc = clocks(packet.clocks, code);
  if (apps.some(x => x.dec_id !== packet.dec_id) || !same(packet.contributing_source_row_ids, cc.source_event_clocks.map(x => x.source_row_id))) fail(code);
  return freeze({ packet_schema_version: packet.packet_schema_version, object_class: packet.object_class, projection: 'REVIEWER_SAFE', facility_subject_granularity: packet.facility_subject_granularity, canonical_origin_id: packet.canonical_origin_id, source_artifact: a, contributing_source_row_ids: [...packet.contributing_source_row_ids], applications: apps, dec_id: packet.dec_id, source_values: sourceValues({ facility: packet.source_values.facility, municipality: packet.source_values.municipality, county: packet.source_values.county }, true, code), variants: vv, project_generation_id: packet.project_generation_id, processing_episode_id: packet.processing_episode_id, clocks: cc, prohibited_inferences: [...PROHIBITED_INFERENCES], subtype: packet.subtype, disposition: packet.disposition, independent_origin_count: packet.independent_origin_count, required_origin_count: packet.required_origin_count, corroborated: packet.corroborated, score: packet.score, presentation_reason: packet.presentation_reason, missing_evidence: { additional_independent_official_origins_required: packet.missing_evidence.additional_independent_official_origins_required, meaning: packet.missing_evidence.meaning } });
}
