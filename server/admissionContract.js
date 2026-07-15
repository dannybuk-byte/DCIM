/**
 * R-F5 — admission contract AHEAD of the raw count.
 *
 * The two-source floor (MIN_SOURCES_FOR_SCORES in scoringEngine.js) and its
 * raw-count semantics are UNCHANGED — this module only gates what enters the
 * counted list before that rule runs:
 *
 *   - counted rows are admissible EVIDENCE rows: object shape, non-empty
 *     string id (unique within the candidate), non-empty string type;
 *   - annotation rows (e.g. disclosure_gap_annotation) are stored OUTSIDE
 *     the counted list — an annotation can never corroborate evidence;
 *   - duplicate source ids are admitted once; later occurrences are rejected,
 *     so duplicating one source cannot manufacture a second source;
 *   - a malformed candidate (sources not an array) fails closed: nothing is
 *     admitted, so the floor suppresses all numeric scores.
 */

/** Source types that annotate a pack but are not evidence. */
export const ANNOTATION_SOURCE_TYPES = new Set(['disclosure_gap_annotation']);

/**
 * @param {object} source
 */
export function isAnnotationRow(source) {
  return Boolean(source) && ANNOTATION_SOURCE_TYPES.has(source.type);
}

/**
 * @typedef {{
 *   counted: object[],
 *   annotations: object[],
 *   rejected: Array<{index: number, id: string|null, reason: string}>,
 *   duplicateIds: string[],
 *   malformed: boolean,
 *   malformedReason: string|null,
 * }} AdmissionResult
 */

/**
 * Partition a candidate's raw sources into counted evidence, annotations,
 * and rejected rows. Pure; never mutates inputs.
 * @param {unknown} rawSources
 * @returns {AdmissionResult}
 */
export function admitCandidateSources(rawSources) {
  if (!Array.isArray(rawSources)) {
    return {
      counted: [],
      annotations: [],
      rejected: [],
      duplicateIds: [],
      malformed: true,
      malformedReason: 'sources_not_an_array',
    };
  }

  /** @type {object[]} */
  const counted = [];
  /** @type {object[]} */
  const annotations = [];
  /** @type {Array<{index: number, id: string|null, reason: string}>} */
  const rejected = [];
  /** @type {string[]} */
  const duplicateIds = [];
  const seenIds = new Set();

  rawSources.forEach((source, index) => {
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      rejected.push({ index, id: null, reason: 'row_not_an_object' });
      return;
    }
    if (isAnnotationRow(source)) {
      annotations.push(source);
      return;
    }
    if (typeof source.id !== 'string' || !source.id.trim()) {
      rejected.push({ index, id: null, reason: 'missing_or_empty_id' });
      return;
    }
    if (typeof source.type !== 'string' || !source.type.trim()) {
      rejected.push({ index, id: source.id, reason: 'missing_or_empty_type' });
      return;
    }
    if (seenIds.has(source.id)) {
      duplicateIds.push(source.id);
      rejected.push({ index, id: source.id, reason: 'duplicate_source_id' });
      return;
    }
    seenIds.add(source.id);
    counted.push(source);
  });

  return { counted, annotations, rejected, duplicateIds, malformed: false, malformedReason: null };
}

/**
 * Serializable admission summary for score payloads and exports.
 * @param {AdmissionResult} admission
 */
export function buildAdmissionSummary(admission) {
  return {
    admitted_source_count: admission.counted.length,
    annotation_count: admission.annotations.length,
    annotation_ids: admission.annotations.map(a => (typeof a.id === 'string' ? a.id : null)),
    rejected_rows: admission.rejected,
    duplicate_ids: admission.duplicateIds,
    malformed: admission.malformed,
    ...(admission.malformedReason ? { malformed_reason: admission.malformedReason } : {}),
  };
}
