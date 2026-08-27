const NYSDEC = 'New York State Department of Environmental Conservation, Division of Environmental Permits';
const SOCRATA = 'Socrata/Open NY platform';

const SYSTEM = [
  [':id', 'source_row_id', 'Physical row identifier within a snapshot', 'Application, facility, event identity, or stability across republication', 'FINAL_FOR_V0_9', 'raw_monospace'],
  [':created_at', 'snapshot_loaded_at', 'Platform row-creation timestamp; observed as snapshot load instant', 'Permit/application event time or row history', 'FINAL_WITH_DISPLAY_CONDITION', 'snapshot_metadata_only'],
  [':updated_at', 'snapshot_loaded_at', 'Platform row-update timestamp; observed as snapshot load instant', 'Incremental-change clock, permit/application event time, or reliable row-history clock', 'FINAL_WITH_DISPLAY_CONDITION', 'snapshot_metadata_only'],
  [':version', 'source_row_version', 'Opaque platform row-version token', 'Version ordering or undocumented semantics', 'PARTIAL', 'raw_optional'],
];

const DATASET = [
  ['application_id', 'application_id', 'DART application identifier; documented parts include DEC region and the first ten digits as DEC ID', 'Physical row identity, evidentiary origin, or facility identity', 'FINAL_FOR_V0_9', 'raw_and_parsed_parts'],
  ['facility', 'facility_subject_label', 'Named DEC facility: property or location under one legally responsible party, possibly contiguous parcels', 'Physical boundary, single building, or facility purpose', 'FINAL_FOR_V0_9', 'raw_exact'],
  ['location', 'location_raw', 'Facility physical address or prose location description', 'A reliably geocodable address', 'FINAL_WITH_DISPLAY_CONDITION', 'raw_local_municipality_public'],
  ['town_or_city', 'municipality_raw', 'Municipality in which the facility is located', 'County', 'FINAL_FOR_V0_9', 'raw'],
  ['applicant', 'applicant_raw', 'Entity recorded as legally responsible for applying and permit compliance', 'Ownership, operator, or resolved corporate identity', 'FINAL_WITH_DISPLAY_CONDITION', 'raw_local_mask_natural_person_public'],
  ['permit_type', 'permit_type_raw', 'Regulatory jurisdiction triggered by the activity', 'Facility purpose, industry, or technology', 'FINAL_FOR_V0_9', 'raw'],
  ['application_type', 'application_type_raw', 'How the department is processing the application', 'Substantive project change', 'FINAL_FOR_V0_9', 'raw'],
  ['date_received', 'source_event_received_date', 'Usually application receipt date, with documented pre-application and department-initiated exceptions', 'Project, construction, or operation start', 'FINAL_WITH_DISPLAY_CONDITION', 'raw_parsed_anomaly'],
  ['status', 'status_raw', 'Current procedural status at the dataset snapshot', 'Physical facility state', 'FINAL_WITH_DISPLAY_CONDITION', 'raw_with_snapshot'],
  ['complete_status', 'complete_status_raw', 'Technical-review completeness posture, with a special federally delegated meaning', 'Approval', 'FINAL_FOR_V0_9', 'raw'],
  ['upa_class', 'upa_class_raw', 'Uniform Procedures Act Major or Minor procedural class', 'Project size, capacity, or impact', 'FINAL_FOR_V0_9', 'raw'],
  ['short_description', 'short_description_raw', 'Preliminary description entered when the application was first received', 'Current or as-built scope', 'FINAL_WITH_DISPLAY_CONDITION', 'raw_local_screen_names_public'],
  ['enb_publication_date', 'enb_publication_date', 'Environmental Notice Bulletin Notice of Complete Application publication date', 'Application receipt or decision date', 'FINAL_FOR_V0_9', 'raw'],
  ['written_comments_due', 'comments_due_date', 'Deadline for receipt of written comments', 'Whether comments were filed', 'FINAL_FOR_V0_9', 'raw'],
  ['seqr_class', 'seqr_class_raw', 'State Environmental Quality Review procedural class', 'Environmental impact', 'FINAL_FOR_V0_9', 'raw'],
  ['seqr_determination', 'seqr_determination_raw', 'Lead-agency SEQR determination', 'Actual environmental impact', 'FINAL_FOR_V0_9', 'raw'],
  ['lead_agency', 'lead_agency_raw', 'Agency making the SEQR determination', 'Approval authority generally', 'FINAL_FOR_V0_9', 'raw'],
  ['enivronmental_justice', 'environmental_justice_raw', 'Engagement of the Commissioner environmental-justice policy', 'Environmental-justice outcome', 'FINAL_FOR_V0_9', 'raw_source_spelling_preserved'],
  ['shpa_status', 'shpa_status_raw', 'New York State Historic Preservation Act review posture', 'Historic significance', 'FINAL_FOR_V0_9', 'raw'],
  ['coastal_zone_status', 'coastal_zone_status_raw', 'Coastal Management area applicability', 'Precise location', 'FINAL_FOR_V0_9', 'raw'],
  ['final_disposition', 'final_disposition_raw', 'Administrative disposition', 'Whether physical work occurred', 'FINAL_FOR_V0_9', 'raw'],
  ['permit_effective_date', 'permit_effective_date', 'Date on which the permit is effective', 'Permit issue date, construction start, or operation start', 'FINAL_FOR_V0_9', 'raw_parsed_anomaly'],
  ['permit_expration_date', 'permit_expiration_date', 'Date the permit expires where an expiration is required', 'Cessation of activity', 'FINAL_FOR_V0_9', 'raw_parsed_anomaly_source_spelling_preserved'],
  ['stimulus_project', 'stimulus_project_raw', 'American Recovery and Reinvestment Act 2009 association flag', 'Funding amount', 'FINAL_FOR_V0_9', 'raw'],
  ['other_known_ids', 'other_known_ids_raw', 'Other identifiers associated with a project and site location', 'That identifiers are DEC-only', 'FINAL_WITH_DISPLAY_CONDITION', 'raw_and_parsed'],
  ['dec_contact', 'dec_contact_raw', 'DEC Permit Project Manager contact for public comment', 'Decision-maker identity', 'DO_NOT_DISPLAY', 'omit_from_v0_9_packet'],
];

function makeWarrant(row, author, authority) {
  const [raw_field_name, internal_preservation_name, bounded_established_meaning, prohibited_inference, warrant_status, display_privacy_condition] = row;
  return Object.freeze({ raw_field_name, author_source_authority: author, authority_basis: authority, bounded_established_meaning, prohibited_inference, internal_preservation_name, warrant_status, display_privacy_condition });
}

export const SYSTEM_FIELD_WARRANTS = Object.freeze(SYSTEM.map(row => makeWarrant(row, SOCRATA, 'Socrata system-field metadata and response headers')));
export const DATASET_FIELD_WARRANTS = Object.freeze(DATASET.map(row => makeWarrant(row, NYSDEC, 'NYSDEC DART Data Dictionary and Permit Help, bounded by DART Overview')));
export const CLAIM_COMPARISON_FIELDS = Object.freeze(DATASET_FIELD_WARRANTS.map(w => w.raw_field_name));
export const FIELD_WARRANTS = Object.freeze([...SYSTEM_FIELD_WARRANTS, ...DATASET_FIELD_WARRANTS]);
const BY_RAW_NAME = new Map(FIELD_WARRANTS.map(w => [w.raw_field_name, w]));

export function getFieldWarrant(rawFieldName) {
  return BY_RAW_NAME.get(rawFieldName) ?? Object.freeze({
    raw_field_name: rawFieldName,
    author_source_authority: 'UNRESOLVED',
    authority_basis: 'No adopted DART field warrant',
    bounded_established_meaning: 'Unknown field preserved exactly as supplied',
    prohibited_inference: 'Any semantic inference',
    internal_preservation_name: rawFieldName,
    warrant_status: 'UNKNOWN_FIELD_UNWARRANTED',
    display_privacy_condition: 'review_before_display',
  });
}
