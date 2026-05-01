/**
 * Deterministic credibility scoring — weighted formulas, explainable outputs.
 * No network, no ML, no randomness at runtime beyond stable hashing in snapshot builder.
 */

import type { CredibilityProjectSnapshot } from './credibilityInputs';
import { aggregateContradictionScore, buildContradictionPairs } from './contradictions';

export type ScoreBandLabel = 'Strong' | 'Moderate' | 'Weak' | 'Critical' | 'Insufficient Data';

export interface ScoreResult {
  score: number;
  label: ScoreBandLabel;
  explanation: string;
  missingFields: string[];
  confidence: number;
}

export interface CredibilityScoreBundle {
  complianceScore: ScoreResult;
  evidenceConfidenceScore: ScoreResult;
  contradictionScore: ScoreResult;
  publicRiskScore: ScoreResult;
  overallReviewScore: ScoreResult;
  contradictionPairs: ReturnType<typeof buildContradictionPairs>;
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

function bandFromScore(score: number, insufficient: boolean): ScoreBandLabel {
  if (insufficient) return 'Insufficient Data';
  if (score >= 80) return 'Strong';
  if (score >= 60) return 'Moderate';
  if (score >= 40) return 'Weak';
  return 'Critical';
}

/** For scores where higher numeric values mean worse outcomes (contradiction pressure, public risk). */
function bandHighIsBad(score: number, insufficient: boolean): ScoreBandLabel {
  if (insufficient) return 'Insufficient Data';
  if (score >= 75) return 'Critical';
  if (score >= 55) return 'Weak';
  if (score >= 35) return 'Moderate';
  return 'Strong';
}

function missingWeightPenalty(missingCount: number): number {
  const capped = Math.min(6, Math.max(0, missingCount));
  return clamp01(1 - Math.min(0.72, capped * 0.055));
}

export interface ComplianceAuditComponent {
  id: 'jobs' | 'capex' | 'timeline' | 'disclosure';
  label: string;
  weightPercent: number;
  rawUnitScore: number;
  /** Points (0–100 scale) this component contributes before penalties: weight×raw×100 */
  contributionPoints: number;
  affectsScoreHow: string;
}

/** Shared ratio math for compliance scoring and reviewer audit trail. */
export function computeCompliancePrimitives(snapshot: CredibilityProjectSnapshot): {
  jobRatio: number;
  capexRatio: number;
  timelineScore: number;
  disclosureIntegrity: number;
  missingFields: string[];
  baseCompliance: number;
  structuralPenalty: number;
  demoPenalty: number;
} {
  const missingFields = [...snapshot.missingStructuredFields];
  const promised = snapshot.promisedJobs;
  const actual = snapshot.actualJobs;
  const jobRatio = promised > 0 ? clamp01(actual / promised) : 0;

  let capexRatio = 0.5;
  if (snapshot.promisedCapexUsd != null && snapshot.promisedCapexUsd > 0 && snapshot.actualCapexUsd != null) {
    capexRatio = clamp01(snapshot.actualCapexUsd / snapshot.promisedCapexUsd);
  }

  let timelineScore = 0.65;
  if (snapshot.agreementDate && snapshot.reportingDeadline && snapshot.lastUpdated) {
    try {
      const deadline = new Date(snapshot.reportingDeadline).getTime();
      const updated = new Date(snapshot.lastUpdated).getTime();
      if (!Number.isNaN(deadline) && !Number.isNaN(updated)) {
        timelineScore = updated <= deadline ? 0.88 : 0.42;
      }
    } catch {
      timelineScore = 0.55;
    }
  } else {
    missingFields.push('timeline_dates_incomplete');
  }

  let disclosureIntegrity = 0.35;
  if (snapshot.sources.length > 0) {
    const avgConf =
      snapshot.sources.reduce((s, x) => s + clamp01(x.confidence), 0) / snapshot.sources.length;
    const breadth = clamp01(snapshot.sources.length / 4);
    disclosureIntegrity = clamp01(0.45 * avgConf + 0.55 * breadth);
  }

  const baseCompliance =
    jobRatio * 0.4 + capexRatio * 0.2 + timelineScore * 0.2 + disclosureIntegrity * 0.2;

  const structuralPenalty = missingWeightPenalty(missingFields.length);
  const demoPenalty = snapshot.isDemoDerived ? 0.88 : 1;

  return {
    jobRatio,
    capexRatio,
    timelineScore,
    disclosureIntegrity,
    missingFields: [...new Set(missingFields)],
    baseCompliance,
    structuralPenalty,
    demoPenalty,
  };
}

export function computeComplianceAuditTrail(snapshot: CredibilityProjectSnapshot): {
  components: ComplianceAuditComponent[];
  penaltiesExplain: string;
  baseCompliance: number;
} {
  const p = computeCompliancePrimitives(snapshot);
  const components: ComplianceAuditComponent[] = [
    {
      id: 'jobs',
      label: 'Job fulfillment',
      weightPercent: 40,
      rawUnitScore: Math.round(p.jobRatio * 100),
      contributionPoints: Math.round(p.jobRatio * 40 * 100) / 100,
      affectsScoreHow:
        'Higher ratio of recorded jobs to promised jobs increases this block (up to 40% of the pre-penalty blend).',
    },
    {
      id: 'capex',
      label: 'Capital investment fulfillment',
      weightPercent: 20,
      rawUnitScore: Math.round(p.capexRatio * 100),
      contributionPoints: Math.round(p.capexRatio * 20 * 100) / 100,
      affectsScoreHow:
        'Compares modeled capex outturn to promised capex; contributes up to 20% of the blend.',
    },
    {
      id: 'timeline',
      label: 'Timeline adherence',
      weightPercent: 20,
      rawUnitScore: Math.round(p.timelineScore * 100),
      contributionPoints: Math.round(p.timelineScore * 20 * 100) / 100,
      affectsScoreHow:
        'Uses agreement, reporting deadline, and last update when present; incomplete dates reduce reliability.',
    },
    {
      id: 'disclosure',
      label: 'Disclosure integrity',
      weightPercent: 20,
      rawUnitScore: Math.round(p.disclosureIntegrity * 100),
      contributionPoints: Math.round(p.disclosureIntegrity * 20 * 100) / 100,
      affectsScoreHow:
        'Rises with more listed sources and higher mean source-confidence scores (max 20% of blend).',
    },
  ];

  const penaltiesExplain = `Structural completeness factor ×${p.structuralPenalty.toFixed(2)} and demo-data factor ×${p.demoPenalty.toFixed(2)} scale the blended score before rounding.`;

  return {
    components,
    penaltiesExplain,
    baseCompliance: p.baseCompliance,
  };
}

export function computeComplianceScore(snapshot: CredibilityProjectSnapshot): ScoreResult {
  const p = computeCompliancePrimitives(snapshot);
  const jobRatio = p.jobRatio;
  const capexRatio = p.capexRatio;
  const timelineScore = p.timelineScore;
  const disclosureIntegrity = p.disclosureIntegrity;
  const missingFields = p.missingFields;

  const confidence = clamp01(
    p.structuralPenalty * p.demoPenalty * (0.55 + 0.45 * disclosureIntegrity),
  );

  const adjusted = clamp01(p.baseCompliance * p.structuralPenalty * p.demoPenalty);
  const score = Math.round(adjusted * 100);

  const insufficient = confidence < 0.3;
  const label = bandFromScore(score, insufficient);

  const explanation = insufficient
    ? 'Too many structured fields or sources are missing to treat the compliance score as reliable.'
    : `Weighted blend of job fulfillment (${Math.round(jobRatio * 100)}% of promised headcount), capex fulfillment (${Math.round(capexRatio * 100)}%), timeline adherence (${Math.round(timelineScore * 100)}%), and disclosure breadth (${Math.round(disclosureIntegrity * 100)}%).`;

  return {
    score,
    label,
    explanation,
    missingFields,
    confidence,
  };
}

export function computeEvidenceConfidenceScore(snapshot: CredibilityProjectSnapshot): ScoreResult {
  const missingFields: string[] = [];
  if (snapshot.sources.length === 0) missingFields.push('sources');

  const withUrl = snapshot.sources.filter(s => Boolean(s.url?.trim())).length;
  const urlRatio = snapshot.sources.length ? withUrl / snapshot.sources.length : 0;

  const avgSourceConf =
    snapshot.sources.length > 0
      ? snapshot.sources.reduce((s, x) => s + clamp01(x.confidence), 0) / snapshot.sources.length
      : 0;

  const diversity = clamp01(snapshot.sources.length / 5);
  const base = clamp01(0.38 * avgSourceConf + 0.32 * urlRatio + 0.3 * diversity);

  const demoPenalty = snapshot.isDemoDerived ? 0.82 : 1;
  const confidence = clamp01(base * demoPenalty * missingWeightPenalty(snapshot.missingStructuredFields.length));

  const score = Math.round(base * 100 * demoPenalty * missingWeightPenalty(snapshot.missingStructuredFields.length));
  const insufficient = confidence < 0.3;

  return {
    score,
    label: bandFromScore(score, insufficient),
    explanation: insufficient
      ? 'Evidence chain is thin — fewer cited URLs and low source confidence.'
      : `Based on ${snapshot.sources.length} listed sources, ~${Math.round(urlRatio * 100)}% with URLs, mean cited confidence ${avgSourceConf.toFixed(2)}.`,
    missingFields,
    confidence,
  };
}

export function computeContradictionScore(snapshot: CredibilityProjectSnapshot): ScoreResult {
  const pairs = buildContradictionPairs(snapshot);
  const raw = aggregateContradictionScore(pairs);

  const avgPairConf =
    pairs.length > 0
      ? pairs.reduce((s, p) => s + p.confidence, 0) / pairs.length
      : 0.35;

  const confidence = clamp01(0.45 + 0.55 * avgPairConf);

  const insufficient = pairs.length === 0;
  const label = insufficient ? 'Insufficient Data' : bandHighIsBad(raw, false);

  return {
    score: raw,
    label,
    explanation:
      pairs.length === 0
        ? 'No overlapping public claims and observed outcomes were paired for contradiction review.'
        : `${pairs.length} claim/outcome pair(s); aggregate tension score ${raw} (higher means larger gaps vs confidence-weighted).`,
    missingFields: pairs.length === 0 ? ['paired_claim_outcome'] : [],
    confidence,
  };
}

export function computePublicRiskScore(snapshot: CredibilityProjectSnapshot): ScoreResult {
  const signals = snapshot.riskSignals;
  let raw = 0;
  if (signals.length > 0) {
    let sum = 0;
    let w = 0;
    for (const s of signals) {
      const wi = clamp01(s.confidence);
      sum += clamp01(s.severity / 100) * 100 * wi;
      w += wi;
    }
    raw = w > 0 ? Math.round(sum / w) : 0;
  }

  const gapPressure = clamp01(Math.min(1, snapshot.subsidyGapUsd / 80_000_000));
  raw = Math.round(raw * 0.72 + gapPressure * 100 * 0.28);

  const confidence = clamp01(
    signals.length > 0 ? signals.reduce((s, x) => s + clamp01(x.confidence), 0) / signals.length : 0.36,
  );

  const insufficient = signals.length === 0;
  const label = insufficient ? 'Insufficient Data' : bandHighIsBad(Math.min(100, raw), false);

  return {
    score: Math.min(100, raw),
    label,
    explanation:
      signals.length === 0
        ? 'No structured risk signals on file; subsidy-gap pressure added minimal demo weight only.'
        : `Blend of ${signals.length} risk signal(s) with subsidy-gap pressure in the demo model.`,
    missingFields: signals.length === 0 ? ['riskSignals'] : [],
    confidence,
  };
}

export function computeOverallReviewScore(
  compliance: ScoreResult,
  evidence: ScoreResult,
  contradiction: ScoreResult,
  publicRisk: ScoreResult,
): ScoreResult {
  const alignContradiction = 100 - contradiction.score;
  const alignPublic = 100 - publicRisk.score;

  const wC = 0.38;
  const wE = 0.24;
  const wX = 0.22;
  const wP = 0.16;

  const blended =
    compliance.score * wC +
    evidence.score * wE +
    alignContradiction * wX +
    alignPublic * wP;

  const confidence = clamp01(
    compliance.confidence * 0.38 +
      evidence.confidence * 0.24 +
      contradiction.confidence * 0.22 +
      publicRisk.confidence * 0.16,
  );

  const score = Math.round(Math.max(0, Math.min(100, blended)));
  const insufficient = confidence < 0.3;

  return {
    score,
    label: bandFromScore(score, insufficient),
    explanation: insufficient
      ? 'Overall review is suppressed — component confidence is below the transparency threshold.'
      : `Composite of compliance (${compliance.score}), evidence (${evidence.score}), claim alignment (${Math.round(alignContradiction)}), and public-risk cushion (${Math.round(alignPublic)}).`,
    missingFields: [
      ...new Set([
        ...compliance.missingFields,
        ...evidence.missingFields,
        ...contradiction.missingFields,
        ...publicRisk.missingFields,
      ]),
    ].slice(0, 12),
    confidence,
  };
}

export function computeCredibilityScoreBundle(snapshot: CredibilityProjectSnapshot): CredibilityScoreBundle {
  const contradictionPairs = buildContradictionPairs(snapshot);
  const complianceScore = computeComplianceScore(snapshot);
  const evidenceConfidenceScore = computeEvidenceConfidenceScore(snapshot);
  const contradictionScore = computeContradictionScore(snapshot);
  const publicRiskScore = computePublicRiskScore(snapshot);
  const overallReviewScore = computeOverallReviewScore(
    complianceScore,
    evidenceConfidenceScore,
    contradictionScore,
    publicRiskScore,
  );

  return {
    complianceScore,
    evidenceConfidenceScore,
    contradictionScore,
    publicRiskScore,
    overallReviewScore,
    contradictionPairs,
  };
}
