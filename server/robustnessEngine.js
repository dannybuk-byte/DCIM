/**
 * Threshold sensitivity, pattern stability, cross-case consistency, export helpers.
 * Uses bounded_mismatch_index (0–100) for user-facing mismatch thresholds.
 */
import { computeRiskLevel, scoreCompanyForPeriod } from './scoringEngine.js';

/** Default review gate: bounded mismatch floor + confidence floor. */
export const DEFAULT_MISMATCH_BOUNDED_THRESHOLD = 50;
export const DEFAULT_CONFIDENCE_THRESHOLD = 35;

const BOUNDED_SWEEP = [35, 45, 55, 65, 75, 85];

/**
 * @param {object} row — list row from scoreCompanyForPeriod + list shape
 * @param {number} boundedMin
 * @param {number} confidenceMin
 */
export function isFlaggedAtThreshold(row, boundedMin, confidenceMin) {
  if (row.scores_suppressed) return false;
  const bmi = row.bounded_mismatch_index;
  if (bmi === null || bmi === undefined) return false;
  return bmi >= boundedMin && row.confidence_score >= confidenceMin;
}

/**
 * @param {object} row
 * @param {number} boundedMin
 * @param {number} confidenceMin
 */
export function riskLevelAtThreshold(row, boundedMin, confidenceMin) {
  if (row.scores_suppressed) return 'minimal';
  if (!isFlaggedAtThreshold(row, boundedMin, confidenceMin)) return 'minimal';
  return computeRiskLevel(row.bounded_mismatch_index, row.confidence_score, false);
}

/**
 * @param {object[]} rows
 * @param {number} boundedMin
 * @param {number} confidenceMin
 */
export function countFlagged(rows, boundedMin, confidenceMin) {
  return rows.filter(r => isFlaggedAtThreshold(r, boundedMin, confidenceMin)).length;
}

/**
 * @param {number} meanPersistence
 * @returns {'stable'|'moderate'|'fragile'}
 */
export function patternStabilityLabelFromPersistence(meanPersistence) {
  if (meanPersistence >= 0.72) return 'stable';
  if (meanPersistence >= 0.48) return 'moderate';
  return 'fragile';
}

/**
 * Mean fraction of sweep steps where each scored company stays flagged.
 * @param {object[]} companies — seed companies with sources
 * @param {Date} referenceDate
 * @param {object|null} periodQuery
 * @param {number} confidenceFloor — used for all sweep steps
 */
export function computePerCompanyThresholdPersistence(companies, referenceDate, periodQuery, confidenceFloor) {
  const scored = companies
    .map(c => ({ company: c, row: { id: c.id, ...scoreCompanyForPeriod(c, referenceDate, periodQuery) } }))
    .filter(x => !x.row.scores_suppressed && x.row.bounded_mismatch_index !== null);

  const persistences = scored.map(({ row }) => {
    let flaggedSteps = 0;
    for (const t of BOUNDED_SWEEP) {
      if (isFlaggedAtThreshold(row, t, confidenceFloor)) flaggedSteps += 1;
    }
    return flaggedSteps / BOUNDED_SWEEP.length;
  });

  const meanPersistence =
    persistences.length === 0 ? 0 : persistences.reduce((a, b) => a + b, 0) / persistences.length;

  return {
    mean_persistence_across_sweep: Math.round(meanPersistence * 1000) / 1000,
    pattern_stability: patternStabilityLabelFromPersistence(meanPersistence),
    bounded_sweep_steps: BOUNDED_SWEEP,
    confidence_floor_used: confidenceFloor,
  };
}

/**
 * @param {object[]} rows — scored list rows
 * @param {number} confidenceFloor
 */
export function sensitivityFlaggedCountsByBounded(rows, confidenceFloor) {
  const out = {};
  for (const t of BOUNDED_SWEEP) {
    out[String(t)] = countFlagged(rows, t, confidenceFloor);
  }
  const low = BOUNDED_SWEEP[0];
  const high = BOUNDED_SWEEP[BOUNDED_SWEEP.length - 1];
  const nLow = countFlagged(rows, low, confidenceFloor);
  const nHigh = countFlagged(rows, high, confidenceFloor);
  const retention_ratio_low_to_high = nLow === 0 ? null : Math.round((nHigh / nLow) * 1000) / 1000;
  return {
    flagged_counts_by_bounded_threshold: out,
    sweep_range: { low, high },
    retention_ratio_low_to_high,
  };
}

/**
 * Among rows flagged at current threshold: how similar is AAS/(AAS+LSS) structure?
 * @param {object[]} rows
 * @param {number} boundedMin
 * @param {number} confidenceMin
 */
export function computeCrossCaseConsistency(rows, boundedMin, confidenceMin) {
  const flagged = rows.filter(r => isFlaggedAtThreshold(r, boundedMin, confidenceMin) && !r.scores_suppressed);
  if (flagged.length < 2) {
    return {
      consistency_label: 'insufficient_flagged_sample',
      structure_similarity_score: null,
      mean_aas_share: null,
      coefficient_of_variation: null,
      flagged_count: flagged.length,
      note: 'Need at least two flagged employers at this threshold to summarize structural similarity.',
    };
  }

  const shares = flagged.map(r => {
    const aas = r.aas ?? 0;
    const lss = r.lss ?? 0;
    const denom = aas + lss + 1e-6;
    return aas / denom;
  });
  const mean = shares.reduce((a, b) => a + b, 0) / shares.length;
  const variance =
    shares.reduce((acc, s) => acc + (s - mean) ** 2, 0) / Math.max(1, shares.length - 1);
  const std = Math.sqrt(variance);
  const cv = mean > 0.05 ? std / mean : std;

  const structure_similarity_score = Math.round(Math.max(0, Math.min(100, 100 - cv * 85)));
  let consistency_label = 'moderate';
  if (structure_similarity_score >= 72) consistency_label = 'high';
  else if (structure_similarity_score < 45) consistency_label = 'low';

  return {
    consistency_label,
    structure_similarity_score,
    mean_aas_share: Math.round(mean * 1000) / 1000,
    coefficient_of_variation: Math.round(cv * 1000) / 1000,
    flagged_count: flagged.length,
    note:
      'Similarity of AAS/(AAS+LSS) mix among flagged rows — high means the same score logic is firing in a comparable shape, not that conclusions are correct.',
  };
}

/**
 * @param {object[]} rows — enriched list rows (same shape as /companies)
 * @param {object[]} seedCompanies
 * @param {Date} referenceDate
 * @param {object|null} periodQuery
 * @param {number} mismatchBounded
 * @param {number} confidenceMin
 */
export function buildRobustnessExportMeta(rows, seedCompanies, referenceDate, periodQuery, mismatchBounded, confidenceMin) {
  const persistence = computePerCompanyThresholdPersistence(seedCompanies, referenceDate, periodQuery, confidenceMin);
  const sensitivity = sensitivityFlaggedCountsByBounded(rows, confidenceMin);
  const consistency = computeCrossCaseConsistency(rows, mismatchBounded, confidenceMin);
  const flagged_count_at_threshold = countFlagged(rows, mismatchBounded, confidenceMin);

  return {
    threshold_used: {
      bounded_mismatch_minimum: mismatchBounded,
      confidence_minimum: confidenceMin,
    },
    flagged_count_at_threshold,
    pattern_stability: {
      label: persistence.pattern_stability,
      mean_persistence_across_bounded_sweep: persistence.mean_persistence_across_sweep,
      bounded_sweep_steps: persistence.bounded_sweep_steps,
      confidence_floor_used: persistence.confidence_floor_used,
    },
    sensitivity_analysis: {
      ...sensitivity,
      interpretation:
        'Higher retention from low to high bounded thresholds means fewer employers drop out as the bar tightens — often read as a less fragile headline count.',
    },
    cross_case_consistency: consistency,
  };
}

/**
 * @param {object} row
 * @param {number} boundedMin
 * @param {number} confidenceMin
 */
export function enrichRowWithThresholdFields(row, boundedMin, confidenceMin) {
  return {
    ...row,
    flagged_at_threshold: isFlaggedAtThreshold(row, boundedMin, confidenceMin),
    risk_level_at_threshold: riskLevelAtThreshold(row, boundedMin, confidenceMin),
  };
}
