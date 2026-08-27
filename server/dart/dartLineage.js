function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(nested => deepFreeze(nested, seen));
  return Object.freeze(value);
}

/** One official DART disclosure lineage for the bounded facility proposition. */
export function createDartCountingSource(facility, { canonical_origin_id }) {
  if (!facility?.dec_id || canonical_origin_id !== `nysdec_dart:${facility.dec_id}`) {
    throw new TypeError('CANONICAL_ORIGIN_DEC_ID_MISMATCH');
  }
  return deepFreeze({
    id: `dart-lineage:${facility.facility_subject_id}:${facility.dec_id}`,
    type: 'official_facility_record',
    origin_id: canonical_origin_id,
    provenance: 'official_nysdec_dart_exact_bytes',
    counts_toward_floor: true,
    facility_subject_id: facility.facility_subject_id,
    bounded_proposition: 'NYSDEC DART rows associated with the normalized facility subject and DEC identity',
    source_row_ids: facility.contributing_source_row_ids,
    application_ids: facility.applications.map(value => value.application_id),
    dec_id: facility.dec_id,
  });
}

/** Collapse repeated rows, permit variants, snapshots, retrievals, and same-lineage echoes by canonical origin. */
export function collapseDartLineageSources(sources) {
  const byOrigin = new Map();
  const compatibleFields = ['facility_subject_id', 'dec_id', 'bounded_proposition', 'provenance', 'counts_toward_floor'];
  for (const source of sources ?? []) {
    if (!source || typeof source.origin_id !== 'string') continue;
    const existing = byOrigin.get(source.origin_id);
    if (!existing) byOrigin.set(source.origin_id, source);
    else {
      const conflicts = compatibleFields.filter(field => existing[field] !== source[field]);
      if (conflicts.length) throw new DartLineageConflictError(source.origin_id, conflicts);
    }
  }
  return Object.freeze([...byOrigin.values()]);
}

export class DartLineageConflictError extends Error {
  constructor(originId, fields) {
    super('DART_LINEAGE_CONFLICT');
    this.name = 'DartLineageConflictError';
    this.code = 'DART_LINEAGE_CONFLICT';
    this.origin_id = originId;
    this.conflicting_fields = Object.freeze(fields);
  }
}

const DEC_STEM = /^[0-9]+-[0-9]+-[0-9]+$/;

function requireDecStem(value, field) {
  if (typeof value !== 'string' || !DEC_STEM.test(value)) throw new TypeError(`INVALID_DEC_STEM:${field}`);
  return value;
}

export function assessAdditionalDecId(currentDecId, additionalDecId, aliases = {}) {
  const current = requireDecStem(currentDecId, 'current');
  const additional = requireDecStem(additionalDecId, 'additional');
  const alias = aliases?.[additional];
  if (alias !== undefined) requireDecStem(alias, 'alias');
  return Object.freeze(current === additional || alias === current
    ? { outcome: 'SAME_LINEAGE', count_delta: 0 }
    : { outcome: 'UNRESOLVED_REQUIRES_EXPLICIT_ALIAS_OR_LINEAGE_DECISION', count_delta: 0 });
}
