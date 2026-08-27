const DEC_ID = /^([0-9]+-[0-9]+-[0-9]+)(?:\/([0-9]+))?$/;

function deepFreeze(value, seen = new Set()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  Object.values(value).forEach(nested => deepFreeze(nested, seen));
  return Object.freeze(value);
}

function exactValues(rows, field) {
  return [...new Set(rows.filter(row => Object.hasOwn(row.raw, field)).map(row => row.raw[field]))];
}

export function normalizeFacilityKey(value) {
  if (typeof value !== 'string') throw new DartFacilityIdentityError('INVALID_FACILITY_KEY_COMPONENT');
  const key = value.normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  if (!key) throw new DartFacilityIdentityError('EMPTY_FACILITY_KEY_COMPONENT');
  return key;
}

function oneExactSourceValue(rows, field) {
  const values = exactValues(rows, field);
  if (values.length !== 1 || rows.some(row => !Object.hasOwn(row.raw, field) || typeof row.raw[field] !== 'string' || row.raw[field].length === 0)) {
    throw new DartFacilityIdentityError('FACILITY_COMPONENT_MISSING_OR_CONFLICTING', { field, values });
  }
  return values[0];
}

function variant(rows, field) {
  const values = exactValues(rows, field);
  return { field, values, conflict: values.length > 1 };
}

export class DartFacilityIdentityError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = 'DartFacilityIdentityError';
    this.code = code;
    this.details = details;
  }
}

/** Resolve a governed manifest against exact parsed parent rows without copying or reserializing source rows. */
export function resolveFacilitySubject(parsed, manifest, adopted) {
  if (!parsed?.by_source_row_id || !Array.isArray(manifest?.ordered_source_row_ids)) {
    throw new DartFacilityIdentityError('INVALID_FACILITY_RESOLUTION_INPUT');
  }
  if (manifest.parent_sha256 !== parsed.artifact.sha256) {
    throw new DartFacilityIdentityError('PARENT_SHA256_MISMATCH');
  }
  if (manifest.parent_bytes !== parsed.artifact.byte_count) {
    throw new DartFacilityIdentityError('PARENT_BYTE_COUNT_MISMATCH');
  }

  const ids = manifest.ordered_source_row_ids;
  const positions = manifest.ordered_parent_positions_zero_based;
  if (!Array.isArray(positions) || ids.length === 0 || ids.length !== positions.length) {
    throw new DartFacilityIdentityError('INVALID_SELECTED_ROW_BINDINGS');
  }
  if (new Set(ids).size !== ids.length) throw new DartFacilityIdentityError('DUPLICATE_SELECTED_ROW_ID');
  if (new Set(positions).size !== positions.length) throw new DartFacilityIdentityError('DUPLICATE_SELECTED_ROW_POSITION');

  const rows = ids.map((sourceRowId, index) => {
    const row = parsed.by_source_row_id.get(sourceRowId);
    if (!row) throw new DartFacilityIdentityError('SELECTED_ROW_NOT_FOUND', { source_row_id: sourceRowId });
    const expectedPosition = manifest.ordered_parent_positions_zero_based?.[index];
    if (row.source_artifact_locator.source_array_index !== expectedPosition) {
      throw new DartFacilityIdentityError('SELECTED_ROW_POSITION_MISMATCH', { source_row_id: sourceRowId });
    }
    return row;
  });

  const applicationIds = exactValues(rows, 'application_id');
  const parsedApplications = applicationIds.map(applicationId => {
    const match = DEC_ID.exec(applicationId);
    return { application_id: applicationId, dec_id: match?.[1] ?? 'UNRESOLVED', permit_sequence: match?.[2] ?? 'UNRESOLVED' };
  });
  const decIds = [...new Set(parsedApplications.map(value => value.dec_id))];
  if (decIds.length !== 1 || decIds[0] === 'UNRESOLVED') {
    throw new DartFacilityIdentityError('DEC_ID_UNRESOLVED_OR_CONFLICTING', { dec_ids: decIds });
  }

  const municipality = oneExactSourceValue(rows, 'town_or_city');
  const location = oneExactSourceValue(rows, 'location');
  const facilityName = oneExactSourceValue(rows, 'facility');
  const facilitySubjectId = `dcim_facility_subject:v1:ny:${normalizeFacilityKey(municipality)}:${normalizeFacilityKey(location)}:${normalizeFacilityKey(facilityName)}`;
  if (manifest.facility_subject_id !== facilitySubjectId) throw new DartFacilityIdentityError('MANIFEST_FACILITY_SUBJECT_ID_MISMATCH');
  if (adopted?.facility_subject_id !== facilitySubjectId) throw new DartFacilityIdentityError('ADOPTED_FACILITY_SUBJECT_ID_MISMATCH');
  if (manifest.canonical_origin_id !== `nysdec_dart:${decIds[0]}`) throw new DartFacilityIdentityError('MANIFEST_CANONICAL_ORIGIN_ID_MISMATCH');
  if (manifest.project_generation_id !== 'NOT_ASSIGNED_BY_H6') throw new DartFacilityIdentityError('INVALID_PROJECT_GENERATION_ID');
  if (manifest.processing_episode_id !== 'UNRESOLVED') throw new DartFacilityIdentityError('INVALID_PROCESSING_EPISODE_ID');
  if (manifest.first_observed_at !== null) throw new DartFacilityIdentityError('INVALID_FIRST_OBSERVED_AT');

  return deepFreeze({
    object_class: 'normalized_dart_facility_lineage',
    facility_subject_id: facilitySubjectId,
    facility_subject_granularity: 'normalized_facility_subject',
    contributing_source_row_ids: rows.map(row => row.source_row_id),
    source_values: {
      facility: [facilityName],
      location: [location],
      municipality: [municipality],
      county: 'UNDERIVED',
    },
    applications: parsedApplications,
    dec_id: decIds[0],
    variants: {
      applicant: variant(rows, 'applicant'),
      application_type: variant(rows, 'application_type'),
      status: variant(rows, 'status'),
    },
    project_generation_id: 'NOT_ASSIGNED_BY_H6',
    processing_episode_id: 'UNRESOLVED',
    prohibited_inferences: ['ownership', 'operator', 'construction', 'operation', 'capacity', 'county', 'project_generation', 'data_center_confirmation'],
    source_rows: rows,
  });
}
