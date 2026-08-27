import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeFacilityKey } from './facilityIdentity.js';
import { parseDartRowsJson } from './parseDartRows.js';
import { identifyArtifactBytes } from './rawArtifact.js';

const DEC_APPLICATION = /^([0-9]+-[0-9]+-[0-9]+)\/[0-9]+$/;

export class DartControlProofError extends Error {
  constructor(code, details = {}) {
    super(code);
    this.name = 'DartControlProofError';
    this.code = code;
    this.details = details;
  }
}

const unique = values => [...new Set(values)];
const invariant = (condition, code, details) => { if (!condition) throw new DartControlProofError(code, details); };
const stem = row => DEC_APPLICATION.exec(row.raw.application_id)?.[1] ?? null;
const subject = row => {
  const fields = ['town_or_city', 'location', 'facility'];
  if (fields.some(field => typeof row.raw[field] !== 'string' || row.raw[field].length === 0)) return 'UNRESOLVED';
  return `dcim_facility_subject:v1:ny:${fields.map(field => normalizeFacilityKey(row.raw[field])).join(':')}`;
};

export function deriveFrozenControlFacts(fixtureRoot, { readFile = fs.readFileSync } = {}) {
  const root = path.resolve(fixtureRoot);
  const at = relative => path.join(root, relative);
  const byteCache = new Map();
  const bytes = relative => {
    const normalized = path.normalize(relative);
    if (!byteCache.has(normalized)) byteCache.set(normalized, readFile(at(normalized)));
    return byteCache.get(normalized);
  };
  const text = value => value.toString('utf8').trim();
  const json = (value, relative) => {
    try { return JSON.parse(value.toString('utf8')); }
    catch { throw new DartControlProofError('INVALID_CONTROL_JSON', { path: relative }); }
  };
  const inventoryPath = 'FIXTURE_MANIFEST.json';
  const inventory = json(bytes(inventoryPath), inventoryPath);
  const bindInventory = relative => {
    const value = bytes(relative);
    const entry = inventory.files.find(file => file.path === relative);
    invariant(entry && entry.bytes === value.byteLength && entry.sha256 === crypto.createHash('sha256').update(value).digest('hex'), 'FIXTURE_INVENTORY_BINDING_MISMATCH', { path: relative });
    return value;
  };
  const parse = relative => {
    const value = bindInventory(relative);
    const artifact = identifyArtifactBytes(value, at(relative), { relativeTo: root });
    return parseDartRowsJson(value, { artifact, requireSourceRowId: false });
  };
  const pointer = (relative, expected) => {
    const value = text(bindInventory(relative));
    invariant(value === expected, 'CONTROL_POINTER_MISMATCH', { path: relative, value });
    return Number(value.slice(1));
  };

  const n1Path = 'controls/N1_winneys_park_mine/source/R5_DART_stem_5-1730-00016_SYSFIELDS_CORRECTED.json';
  const n1 = parse(n1Path);
  const n1Stems = unique(n1.rows.map(stem));
  invariant(n1.rows.length === 12 && n1.by_source_row_id.size === 12 && n1Stems.length === 1 && n1Stems[0], 'N1_DERIVATION_MISMATCH');

  const n2Path = 'controls/N2_certainteed/source/DART_recent3_notnull_vendored_2026-08-18.json';
  const n2 = parse(n2Path);
  const n2Index = pointer('controls/N2_certainteed/POINTER.txt', '/1');
  const n5Index = pointer('controls/N5_haeringer_property/POINTER.txt', '/0');
  const n5SamePath = 'controls/N5_haeringer_property/SAME_SOURCE_AS_N2.txt';
  const n5Target = path.resolve(at('controls/N5_haeringer_property'), text(bindInventory(n5SamePath)));
  invariant(n5Target === at(n2Path), 'N2_N5_SOURCE_RELATIONSHIP_MISMATCH');
  invariant(n2.rows[n2Index]?.raw.facility === 'CERTAINTEED GYPSUM BUCHANAN LLC' && n2.rows[n5Index]?.raw.facility === 'Haeringer Property', 'N2_N5_POINTER_ROW_MISMATCH');

  const n3Path = 'controls/N3_all_county_roads_and_bridges/source/DART_mbk7-f2r2_sample3_vendored_2026-08-18.json';
  const n3 = parse(n3Path);
  const n3Index = pointer('controls/N3_all_county_roads_and_bridges/POINTER.txt', '/2');
  invariant(subject(n3.rows[n3Index]) === 'UNRESOLVED', 'N3_FACILITY_SUBJECT_MUST_BE_UNRESOLVED');

  const n4Path = 'controls/N4_aero_marina_simmons/source/R1_DART_mbk7-f2r2_sample3_20260822T042035Z.json';
  const n4 = parse(n4Path);
  const n4ManifestPath = 'controls/N4_aero_marina_simmons/AERO_MARINA_SELECTED_ROWS.json';
  const n4Manifest = json(bindInventory(n4ManifestPath), n4ManifestPath);
  invariant(n4.rows.length === 3 && n4Manifest.parent_bytes === n4.artifact.byte_count && n4Manifest.parent_sha256 === n4.artifact.sha256, 'N4_PARENT_BINDING_MISMATCH');
  const n4Subjects = unique(n4.rows.map(subject));
  const n4Stems = unique(n4.rows.map(stem));
  const aeroRows = n4Manifest.ordered_parent_positions_zero_based.map(position => n4.rows[position]);
  invariant(n4Subjects.length === 2 && n4Stems.length === 2 && unique(aeroRows.map(subject)).length === 1 && unique(aeroRows.map(stem)).length === 1, 'N4_DERIVATION_MISMATCH');
  invariant(aeroRows.map(row => row.raw.application_id).every((id, index) => id === n4Manifest.ordered_application_ids[index]) && stem(aeroRows[0]) === n4Manifest.application_stem && n4Manifest.maximum_independent_origin_count === 1, 'N4_SELECTED_ROWS_MISMATCH');

  const candidatePath = 'candidate/orangetown/source/R04_ROWS_DATA_CENTER_RESPONSE_BODY.json';
  const candidate = parse(candidatePath);
  const n6SamePath = 'controls/N6_term_collision/SAME_SOURCE_AS_CANDIDATE.txt';
  invariant(path.resolve(at('controls/N6_term_collision'), text(bindInventory(n6SamePath))) === at(candidatePath), 'N6_SOURCE_RELATIONSHIP_MISMATCH');
  const n6ManifestPath = 'controls/N6_term_collision/SELECTED_ROWS.json';
  const n6Manifest = json(bindInventory(n6ManifestPath), n6ManifestPath);
  invariant(n6Manifest.parent_bytes === candidate.artifact.byte_count && n6Manifest.parent_sha256 === candidate.artifact.sha256 && n6Manifest.parent_response_relative_path === '../../candidate/orangetown/source/R04_ROWS_DATA_CENTER_RESPONSE_BODY.json', 'N6_PARENT_BINDING_MISMATCH');
  invariant(n6Manifest.parent_response_order.length === 9 && new Set(n6Manifest.parent_response_order).size === 9, 'N6_MEMBERSHIP_MISMATCH');
  const n6Rows = n6Manifest.parent_response_order.map(id => candidate.by_source_row_id.get(id));
  invariant(n6Rows.every(Boolean) && n6Rows.every((row, index, rows) => index === 0 || row.source_artifact_locator.source_array_index > rows[index - 1].source_artifact_locator.source_array_index), 'N6_PARENT_ORDER_MISMATCH');
  invariant(unique(n6Rows.map(row => row.raw.facility)).length === 1 && unique(n6Rows.map(stem)).length === 1, 'N6_SUBJECT_OR_STEM_MISMATCH');

  const p1PosturePath = 'controls/P1_greenidge/OBSERVATION_POSTURE.json';
  const p1 = json(bindInventory(p1PosturePath), p1PosturePath);
  const p1ArchivePath = 'controls/P1_greenidge/source/DCIM_T03H_H3_GREENIDGE_DART_OBSERVATION_20260824T165123Z.zip';
  const archive = bindInventory(p1ArchivePath);
  const archiveSha = crypto.createHash('sha256').update(archive).digest('hex');
  invariant(p1.evidence_package === 'source/DCIM_T03H_H3_GREENIDGE_DART_OBSERVATION_20260824T165123Z.zip' && p1.package_sha256 === archiveSha && p1.physical_rows === 39 && p1.unique_rows === 39 && p1.maximum_dart_publication_origins === 1, 'P1_POSTURE_OR_ARCHIVE_MISMATCH');

  return Object.freeze({
    N1: Object.freeze({ physical_rows: 12, dec_stem: n1Stems[0], maximum_dart_origins: 1 }),
    N2_N5: Object.freeze({ pointers: Object.freeze([n2Index, n5Index]), source_objects: 1, artifact_sha256: n2.artifact.sha256, maximum_dart_origins: 1 }),
    N3: Object.freeze({ facility_subject_id: 'UNRESOLVED', merge_with_bounded_facility: false }),
    N4: Object.freeze({ physical_rows: 3, parent_subjects: 2, parent_dec_stems: 2, aero_selected_subjects: 1, aero_dec_stems: 1, aero_maximum_dart_origins: 1 }),
    N6: Object.freeze({ physical_rows: 9, facility_subjects: 1, dec_stems: 1, source_duplicated: false, maximum_additional_origins: 0 }),
    P1: Object.freeze({ physical_rows: 39, unique_rows: 39, maximum_dart_publication_origins: 1, facility_subject_id: 'UNRESOLVED' }),
  });
}
