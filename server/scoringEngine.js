/**
 * WWW Disclosure Mismatch Engine — explainable scoring + uncertainty metadata.
 * AAS, LSS, DS ∈ [0,100]. raw_mismatch_index = AAS + LSS − DS (unbounded).
 * bounded_mismatch_index maps raw ∈ [-100,300] → [0,100].
 *
 * R-F5: scoreCompany admits sources through the admission contract before
 * scoring. The floor counts only eligible rows with canonical origin_id.
 */

import {
  admitCandidateSources,
  buildAdmissionSummary,
  isNonCountingSupportRow,
  isValidCanonicalOriginId,
} from './admissionContract.js';

export const AAS_POINTS = { strong: 25, moderate: 12, weak: 4, irrelevant: 0 };
export const WARN_BASE_POINTS = 15;
export const WORKERS_PER_POINT = 100;
export const DS_WARN_AI = 60;
export const DS_LEGAL_AI = 40;
export const SCORE_CAP = 100;

export const PUBLIC_AI_SOURCE_TYPES = new Set([
  'earnings_call',
  'sec_filing',
  'ceo_interview',
  'investor_deck',
  'press_release',
  'blog_post',
  'hiring_announcement',
  'restructuring_announcement',
  'public_ai_statement',
  /** Curated news secondary to a primary corporate statement (still public-channel AI attribution). */
  'secondary_public_report',
]);

export const WARN_SOURCE_TYPES = new Set([
  'warn_filing',
  'layoff_announcement',
  /** Reported large-scale reduction without an attached WARN excerpt in the pack (investigative signal). */
  'workforce_disruption_signal',
]);
export const LEGAL_SOURCE_TYPES = new Set(['legal_notice', 'severance_communication', 'annual_report']);

const CERTAINTY = { strong: 1, moderate: 0.72, weak: 0.4, irrelevant: 0.15 };

const MIN_SOURCES_FOR_SCORES = 2;

/**
 * Ruling 2 (2026-08-05): the corroboration floor counts INDEPENDENT ORIGINS,
 * not raw admitted rows. Only canonical `origin_id` values on eligible rows
 * count. Missing or malformed origin identity fails closed; row/source IDs
 * and other record-local fields are never substituted. Explicit support rows
 * (e.g. Epoch confirmation pending an admission dossier — ruling 3) remain
 * displayable but never count.
 * @param {object[]} sources admitted evidence rows (annotations already partitioned out)
 * @returns {number} distinct counting origins
 */
export function countIndependentOrigins(sources) {
  const origins = new Set();
  for (const s of sources ?? []) {
    if (!s || isNonCountingSupportRow(s)) continue;
    if (!isValidCanonicalOriginId(s.origin_id)) continue;
    origins.add(s.origin_id);
  }
  return origins.size;
}

/**
 * @param {string} dateStr
 * @param {Date} referenceDate
 */
export function recencyScoreForSource(dateStr, referenceDate) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return 30;
  const days = (referenceDate.getTime() - d.getTime()) / (86400 * 1000);
  if (days <= 30) return 100;
  if (days <= 90) return 70;
  if (days <= 180) return 45;
  if (days <= 365) return 25;
  return 10;
}

/**
 * @param {object[]} sources
 */
export function derivePeriodBounds(sources) {
  const dates = sources.map(s => s.date).filter(Boolean).sort();
  if (dates.length === 0) return { period_start: null, period_end: null };
  return { period_start: dates[0], period_end: dates[dates.length - 1] };
}

/**
 * @param {number} raw
 * @returns {number}
 */
export function computeBoundedMismatchIndex(raw) {
  return Math.round(Math.max(0, Math.min(100, 100 * ((raw + 100) / 400))));
}

/**
 * @param {object[]} sources
 */
export function computeSourceTypesPresent(sources) {
  return [...new Set(sources.map(s => s.type).filter(Boolean))].sort();
}

/**
 * @param {object[]} sources
 */
export function detectMissingExpectedSources(sources) {
  const missing = [];
  const types = new Set(sources.map(s => s.type));
  const hasPublicAi = sources.some(s => PUBLIC_AI_SOURCE_TYPES.has(s.type));
  const hasWarn = sources.some(s => WARN_SOURCE_TYPES.has(s.type));
  const hasMarkets = types.has('earnings_call') || types.has('sec_filing');
  const hasLegal = sources.some(s => LEGAL_SOURCE_TYPES.has(s.type));

  if (!hasPublicAi) missing.push('no_public_ai_attribution_sources');
  if (!hasWarn) missing.push('no_warn_or_layoff_record');
  if (!hasMarkets) missing.push('no_sec_filing_or_earnings_call');
  if (!hasLegal) missing.push('no_legal_or_severance_notice');
  return missing;
}

/**
 * @param {object[]} sources
 */
export function channelBucketsPresent(sources) {
  const hasPublicAi = sources.some(s => PUBLIC_AI_SOURCE_TYPES.has(s.type));
  const hasWarn = sources.some(s => WARN_SOURCE_TYPES.has(s.type));
  const hasLegal = sources.some(s => LEGAL_SOURCE_TYPES.has(s.type));
  return { hasPublicAi, hasWarn, hasLegal };
}

const PRIMARY_CHANNEL_FAMILY = new Set([
  'public_ai_statement',
  'sec_filing',
  'earnings_call',
  'ceo_interview',
  'warn_filing',
  'layoff_announcement',
  'legal_notice',
  'severance_communication',
  'annual_report',
]);

/**
 * Independent rows, primary vs secondary channel families → coverage score (0–100).
 * @param {object[]} sources
 */
export function computeSourceCoverageMetrics(sources) {
  const evidenceRows = sources.filter(s => s.type !== 'disclosure_gap_annotation');
  const idSet = new Set(evidenceRows.map(s => s.id).filter(Boolean));
  const independent_evidence_rows = idSet.size > 0 ? idSet.size : evidenceRows.length;

  let primary_channel_family_count = 0;
  let secondary_channel_family_count = 0;
  for (const s of evidenceRows) {
    if (PRIMARY_CHANNEL_FAMILY.has(s.type)) primary_channel_family_count += 1;
    else secondary_channel_family_count += 1;
  }

  const hasPrimary = primary_channel_family_count > 0;
  const hasSecondary = secondary_channel_family_count > 0;
  let diversity_mix = 25;
  if (hasPrimary && hasSecondary) diversity_mix = 100;
  else if (hasPrimary && primary_channel_family_count >= 3) diversity_mix = 72;
  else if (hasPrimary) diversity_mix = 48;

  const count_score = Math.min(SCORE_CAP, Math.round((independent_evidence_rows / 10) * SCORE_CAP));
  const row_bonus = Math.min(SCORE_CAP, Math.round(evidenceRows.length * 9));
  const source_coverage_score = Math.round(
    count_score * 0.42 + diversity_mix * 0.38 + row_bonus * 0.2,
  );

  return {
    source_coverage_score,
    independent_evidence_rows,
    primary_channel_family_count,
    secondary_channel_family_count,
  };
}

/**
 * @param {object[]} sources
 * @param {Date} referenceDate
 */
export function computeConfidenceBreakdown(sources, referenceDate = new Date()) {
  const n = sources.length;
  const source_density = n === 0 ? 0 : Math.min(SCORE_CAP, Math.round((n / 12) * SCORE_CAP));

  let recSum = 0;
  let certSum = 0;
  let certN = 0;
  for (const s of sources) {
    recSum += recencyScoreForSource(s.date, referenceDate);
    if (PUBLIC_AI_SOURCE_TYPES.has(s.type) && s.ai_attribution_tier && s.ai_attribution_tier in CERTAINTY) {
      certSum += CERTAINTY[s.ai_attribution_tier];
      certN += 1;
    }
  }
  const recency_avg = n === 0 ? 0 : Math.round(recSum / n);
  const classification_certainty = certN > 0 ? Math.round((certSum / certN) * SCORE_CAP) : 40;

  const { hasPublicAi, hasWarn, hasLegal } = channelBucketsPresent(sources);
  const buckets = [hasPublicAi, hasWarn, hasLegal].filter(Boolean).length;
  const channel_diversity = Math.round((buckets / 3) * SCORE_CAP);

  const coverage = computeSourceCoverageMetrics(sources);
  const confidence_score = Math.round(
    (source_density +
      recency_avg +
      classification_certainty +
      channel_diversity +
      coverage.source_coverage_score) /
      5,
  );

  return {
    source_density,
    recency_avg,
    classification_certainty,
    channel_diversity,
    source_coverage_score: coverage.source_coverage_score,
    independent_evidence_rows: coverage.independent_evidence_rows,
    primary_channel_family_count: coverage.primary_channel_family_count,
    secondary_channel_family_count: coverage.secondary_channel_family_count,
    confidence_score,
  };
}

/**
 * Back-compat: average of original 3 factors (without diversity).
 * @param {object[]} sources
 * @param {Date} [referenceDate]
 */
export function computeConfidence(sources, referenceDate = new Date()) {
  return computeConfidenceBreakdown(sources, referenceDate).confidence_score;
}

/**
 * @param {object[]} sources
 */
export function buildAASBreakdown(sources) {
  const components = [];
  let remaining = SCORE_CAP;
  for (const s of sources) {
    if (!PUBLIC_AI_SOURCE_TYPES.has(s.type)) continue;
    const tier = s.ai_attribution_tier;
    if (!tier || !(tier in AAS_POINTS)) continue;
    const weight = AAS_POINTS[tier];
    const contribution = Math.min(weight, remaining);
    if (contribution <= 0) break;
    remaining -= contribution;
    components.push({
      source_id: s.id,
      type: s.type,
      classification: tier,
      weight,
      contribution,
    });
    if (remaining <= 0) break;
  }
  const total = components.reduce((a, c) => a + c.contribution, 0);
  return { total, components };
}

/**
 * @param {object[]} sources
 */
export function buildLSSBreakdown(sources) {
  const components = [];
  let remaining = SCORE_CAP;
  for (const s of sources) {
    if (!WARN_SOURCE_TYPES.has(s.type)) continue;
    const w = typeof s.workers_affected === 'number' ? s.workers_affected : 0;
    const workerPts = Math.floor(w / WORKERS_PER_POINT);
    const weight = WARN_BASE_POINTS + workerPts;
    const contribution = Math.min(weight, remaining);
    if (contribution <= 0) break;
    remaining -= contribution;
    components.push({
      source_id: s.id,
      type: s.type,
      classification: `warn_base_${WARN_BASE_POINTS}_plus_${workerPts}_per_100_workers`,
      weight,
      contribution,
      workers_affected: w,
    });
    if (remaining <= 0) break;
  }
  const total = components.reduce((a, c) => a + c.contribution, 0);
  return { total, components };
}

/**
 * @param {object[]} sources
 */
export function buildDSBreakdown(sources) {
  const components = [];
  let remaining = SCORE_CAP;
  for (const s of sources) {
    if (s.type === 'warn_filing' && s.ai_disclosed_in_warn) {
      const weight = DS_WARN_AI;
      const contribution = Math.min(weight, remaining);
      if (contribution > 0) {
        remaining -= contribution;
        components.push({
          source_id: s.id,
          type: s.type,
          classification: 'ai_disclosed_in_warn',
          weight,
          contribution,
        });
      }
    }
    if (LEGAL_SOURCE_TYPES.has(s.type) && s.ai_disclosed_in_legal) {
      const weight = DS_LEGAL_AI;
      const contribution = Math.min(weight, remaining);
      if (contribution > 0) {
        remaining -= contribution;
        components.push({
          source_id: s.id,
          type: s.type,
          classification: 'ai_disclosed_in_legal',
          weight,
          contribution,
        });
      }
    }
    if (remaining <= 0) break;
  }
  const total = components.reduce((a, c) => a + c.contribution, 0);
  return { total, components };
}

export function computeAAS(sources) {
  return buildAASBreakdown(sources).total;
}

export function computeLSS(sources) {
  return buildLSSBreakdown(sources).total;
}

export function computeDS(sources) {
  return buildDSBreakdown(sources).total;
}

export function computeMismatchIndex(aas, lss, ds) {
  return aas + lss - ds;
}

/**
 * Heuristic skepticism flags — not ground truth labels.
 * @param {object[]} sources
 * @param {{ scores_suppressed: boolean, aas: number|null, lss: number|null, score_breakdown: object }} scored
 */
export function computeFalsePositiveFalseNegativeHints(sources, scored) {
  if (scored.scores_suppressed || scored.aas === null || scored.lss === null) {
    return {
      possible_false_positive: false,
      possible_false_negative: false,
      false_positive_reasons: [],
      false_negative_reasons: [],
    };
  }
  const aas = scored.aas;
  const lss = scored.lss;
  const fpReasons = [];
  const fnReasons = [];

  const hasStrongPublicAi = sources.some(
    s =>
      PUBLIC_AI_SOURCE_TYPES.has(s.type) &&
      (s.ai_attribution_tier === 'strong' || s.ai_attribution_tier === 'moderate'),
  );
  const lssComps = scored.score_breakdown?.lss?.components ?? [];
  const warnStrength = lssComps.reduce((m, c) => Math.max(m, c.contribution || 0), 0);

  if (aas >= 36 && lss < 26) fpReasons.push('high_axis_AAS_with_relatively_weak_axis_LSS');
  if (hasStrongPublicAi && lss < 22) fpReasons.push('strong_public_AI_channels_with_weak_workforce_axis');
  if (warnStrength < WARN_BASE_POINTS + 2 && aas >= 40) {
    fpReasons.push('workforce_axis_below_typical_WARN_increment_band');
  }

  if (lss >= 30 && aas < 24) fnReasons.push('meaningful_workforce_axis_with_weak_public_AI_axis');
  const hasStrongAiTier = sources.some(
    s => PUBLIC_AI_SOURCE_TYPES.has(s.type) && s.ai_attribution_tier === 'strong',
  );
  if (lss >= 32 && !hasStrongAiTier) {
    fnReasons.push('workforce_signals_without_strong_tiered_public_AI_attribution');
  }

  return {
    possible_false_positive: fpReasons.length > 0,
    possible_false_negative: fnReasons.length > 0,
    false_positive_reasons: fpReasons,
    false_negative_reasons: fnReasons,
  };
}

/**
 * @param {number} bounded_mi
 * @param {number} confidence_score
 * @param {boolean} suppressed
 */
export function computeRiskLevel(bounded_mi, confidence_score, suppressed) {
  if (suppressed || bounded_mi === null || confidence_score < 22) return 'minimal';
  const strength = (bounded_mi / 100) * (confidence_score / 100);
  if (bounded_mi >= 74 && confidence_score >= 52 && strength >= 0.35) return 'high';
  if (bounded_mi >= 52 && confidence_score >= 40 && strength >= 0.22) return 'medium';
  if (bounded_mi >= 30 && confidence_score >= 30) return 'low';
  return 'minimal';
}

/**
 * @param {object} p
 */
export function computeEvidenceQuality(p) {
  const {
    source_count,
    suppressed,
    confidence_score,
    hasPublicAi,
    hasWarn,
  } = p;
  if (suppressed) return 'low';
  const buckets = [hasPublicAi, hasWarn].filter(Boolean).length;
  if (source_count >= 7 && buckets >= 2 && confidence_score >= 55) return 'high';
  if (source_count >= 5 && buckets >= 2 && confidence_score >= 42) return 'moderate';
  return 'low';
}

/**
 * Full scored payload for one company (optionally a filtered source list).
 * @param {object} company — id, name?, sector?, sources[], period_start?, period_end?
 * @param {Date} [referenceDate]
 */
export function scoreCompany(company, referenceDate = new Date()) {
  // Admission separates canonical counting evidence from support rows.
  // Numeric scoring sees only the former; support remains visible in source
  // census/count fields without affecting the origin floor or any score.
  const admission = admitCandidateSources(company.sources ?? []);
  const sources = admission.counted;
  const displaySources = [...sources, ...admission.support];
  const admission_summary = buildAdmissionSummary(admission);

  const derived = derivePeriodBounds(displaySources);
  const period_start = company.period_start ?? derived.period_start;
  const period_end = company.period_end ?? derived.period_end;

  const source_types_present = computeSourceTypesPresent(displaySources);
  const missing_expected_sources = detectMissingExpectedSources(sources);
  const warnings = [];

  if (admission.malformed) {
    warnings.push(
      `ADMISSION: Candidate sources malformed (${admission.malformedReason}) — no rows admitted; scores suppressed (fail closed).`,
    );
  }
  if (admission.duplicateIds.length > 0) {
    warnings.push(
      `ADMISSION: Duplicate source ids rejected (counted once): ${[...new Set(admission.duplicateIds)].join(', ')}.`,
    );
  }
  if (admission.annotations.length > 0) {
    warnings.push(
      `ADMISSION: ${admission.annotations.length} annotation row(s) stored outside the counted list (annotations never corroborate).`,
    );
  }
  if (admission.support.length > 0) {
    warnings.push(
      `ADMISSION: ${admission.support.length} support row(s) excluded from origin counting and numeric scoring.`,
    );
  }

  const independent_origin_count = countIndependentOrigins(sources);
  if (independent_origin_count < MIN_SOURCES_FOR_SCORES) {
    warnings.push(
      `VALIDATION: Fewer than ${MIN_SOURCES_FOR_SCORES} independent origins — numeric scores suppressed (signal not defensible).`,
    );
    const cb = computeConfidenceBreakdown(sources, referenceDate);
    return {
      company_id: company.id,
      period_start,
      period_end,
      source_count: displaySources.length,
      independent_origin_count,
      admission: admission_summary,
      source_types_present,
      missing_expected_sources,
      aas: null,
      lss: null,
      ds: null,
      raw_mismatch_index: null,
      mismatch_index: null,
      bounded_mismatch_index: null,
      source_coverage_score: cb.source_coverage_score,
      confidence_score: 0,
      confidence_breakdown: {
        source_density: cb.source_density,
        recency_avg: cb.recency_avg,
        classification_certainty: cb.classification_certainty,
        channel_diversity: cb.channel_diversity,
        source_coverage_score: cb.source_coverage_score,
        independent_evidence_rows: cb.independent_evidence_rows,
        primary_channel_family_count: cb.primary_channel_family_count,
        secondary_channel_family_count: cb.secondary_channel_family_count,
      },
      evidence_quality: 'low',
      risk_level: 'minimal',
      score_breakdown: {
        aas: { total: null, components: [] },
        lss: { total: null, components: [] },
        ds: { total: null, components: [] },
      },
      warnings,
      scores_suppressed: true,
      low_confidence_flag: true,
      possible_false_positive: false,
      possible_false_negative: false,
      false_positive_reasons: [],
      false_negative_reasons: [],
    };
  }

  const aasB = buildAASBreakdown(sources);
  const lssB = buildLSSBreakdown(sources);
  const dsB = buildDSBreakdown(sources);
  const aas = aasB.total;
  const lss = lssB.total;
  const ds = dsB.total;
  const raw_mismatch_index = computeMismatchIndex(aas, lss, ds);
  const bounded_mismatch_index = computeBoundedMismatchIndex(raw_mismatch_index);

  const cb = computeConfidenceBreakdown(sources, referenceDate);
  const confidence_score = cb.confidence_score;

  const { hasPublicAi, hasWarn } = channelBucketsPresent(sources);
  let evidence_quality = computeEvidenceQuality({
    source_count: displaySources.length,
    suppressed: false,
    confidence_score,
    hasPublicAi,
    hasWarn,
  });

  const scores_suppressed = false;

  /** Verified multi-channel packs with primary URLs: don’t label “low” solely for sparse SEC rows. */
  if (
    company.case_type === 'sourced_case' &&
    sources.length >= 3 &&
    hasPublicAi &&
    hasWarn &&
    confidence_score >= 36
  ) {
    evidence_quality = confidence_score >= 52 ? 'high' : 'moderate';
  }

  if (confidence_score < 38) {
    warnings.push('UNCERTAINTY: Confidence below preferred threshold — interpret ranks cautiously.');
  }
  if (missing_expected_sources.length > 0) {
    warnings.push(
      `COVERAGE: Missing expected channel types: ${missing_expected_sources.join(', ')}.`,
    );
  }
  if (evidence_quality === 'low') {
    warnings.push('EVIDENCE: Quality tier low — add sources or formal filings before external use.');
  }
  if (company.reviewer_flag === 'human_review_required') {
    warnings.push('REVIEW: Sourced case — human validation required; signal, not verdict.');
  }

  const low_confidence_flag = confidence_score < 42;

  const risk_level = computeRiskLevel(bounded_mismatch_index, confidence_score, false);

  const score_breakdown = {
    aas: { total: aas, components: aasB.components },
    lss: { total: lss, components: lssB.components },
    ds: { total: ds, components: dsB.components },
  };

  const fpfn = computeFalsePositiveFalseNegativeHints(sources, {
    scores_suppressed: false,
    aas,
    lss,
    score_breakdown,
  });

  return {
    company_id: company.id,
    period_start,
    period_end,
    source_count: sources.length,
    independent_origin_count,
    admission: admission_summary,
    source_types_present,
    missing_expected_sources,
    aas,
    lss,
    ds,
    raw_mismatch_index,
    mismatch_index: raw_mismatch_index,
    bounded_mismatch_index,
    source_coverage_score: cb.source_coverage_score,
    confidence_score,
    confidence_breakdown: {
      source_density: cb.source_density,
      recency_avg: cb.recency_avg,
      classification_certainty: cb.classification_certainty,
      channel_diversity: cb.channel_diversity,
      source_coverage_score: cb.source_coverage_score,
      independent_evidence_rows: cb.independent_evidence_rows,
      primary_channel_family_count: cb.primary_channel_family_count,
      secondary_channel_family_count: cb.secondary_channel_family_count,
    },
    evidence_quality,
    risk_level,
    score_breakdown,
    warnings,
    scores_suppressed,
    low_confidence_flag,
    possible_false_positive: fpfn.possible_false_positive,
    possible_false_negative: fpfn.possible_false_negative,
    false_positive_reasons: fpfn.false_positive_reasons,
    false_negative_reasons: fpfn.false_negative_reasons,
  };
}

/**
 * Filter sources by inclusive ISO date range.
 * @param {object[]} sources
 * @param {string|null} from
 * @param {string|null} to
 */
export function filterSourcesByPeriod(sources, from, to) {
  // R-F5: a malformed sources value passes through unchanged so the
  // admission contract inside scoreCompany fails it closed (suppression),
  // rather than throwing here.
  if (!Array.isArray(sources)) return sources;
  if (!from && !to) return sources;
  return sources.filter(s => {
    const d = s.date;
    if (!d) return false;
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  });
}

/**
 * Score company with optional period filter (recompute MI for window).
 */
export function scoreCompanyForPeriod(company, referenceDate, periodQuery) {
  const { from = null, to = null } = periodQuery || {};
  const filtered = filterSourcesByPeriod(company.sources ?? [], from, to);
  // R-F5: a malformed sources value yields no period bounds here; scoreCompany
  // fails the candidate closed via the admission contract.
  const bounds = Array.isArray(filtered)
    ? derivePeriodBounds(filtered)
    : { period_start: null, period_end: null };
  const synthetic = {
    ...company,
    sources: filtered,
    period_start: from ?? bounds.period_start,
    period_end: to ?? bounds.period_end,
  };
  const scored = scoreCompany(synthetic, referenceDate);
  return {
    ...scored,
    period_query: from || to ? { from, to } : null,
  };
}
