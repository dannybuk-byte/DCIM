/**
 * Reviewer Mode — deterministic briefs, clipboard export, sober language.
 */

import type { Facility } from '../types';
import { buildCredibilitySnapshot, type CredibilityProjectSnapshot } from './credibilityInputs';
import {
  computeCredibilityScoreBundle,
  computeComplianceAuditTrail,
  type CredibilityScoreBundle,
} from './scoring';
import { resolveActionFlag, type ActionFlagResult, type ActionFlag } from './actionFlags';
import type { ContradictionPair } from './contradictions';
import { getSignalsAlignmentClipboardParagraph } from './signalsAlignment';

export interface ReviewerBriefEvidenceRow {
  title: string;
  claimOrMetric: string;
  date?: string;
  confidence: number;
  url?: string;
}

export interface ReviewerBrief {
  facilityName: string;
  location: string;
  developer: string;
  subsidyExposureLabel: string;
  subsidyMissing: boolean;
  statusFlag: ActionFlag;
  overallReviewScore: number;
  confidence: number;
  lastUpdated: string;
  whyThisMatters: string;
  mainFinding: string;
  evidenceRows: ReviewerBriefEvidenceRow[];
  complianceAudit: ReturnType<typeof computeComplianceAuditTrail>;
  contradictionPairs: ContradictionPair[];
  contradictionHighlight: string;
  riskAuditLines: string[];
  missingCritical: string[];
  reviewerAssessment: string;
  recommendedNextStep: string;
  snapshot: CredibilityProjectSnapshot;
  bundle: CredibilityScoreBundle;
  action: ActionFlagResult;
}

function confidenceBand(conf: number): 'high' | 'moderate' | 'low' {
  if (conf >= 0.65) return 'high';
  if (conf >= 0.4) return 'moderate';
  return 'low';
}

function compliancePerformanceWord(label: string): string {
  if (label === 'Insufficient Data') return 'insufficient';
  return label.toLowerCase();
}

export function getWhyThisMatters(snapshot: CredibilityProjectSnapshot): string {
  const missingSubsidy = snapshot.missingStructuredFields.includes('subsidyReceived');

  if (missingSubsidy) {
    return (
      'This project is being evaluated for public-benefit compliance, but subsidy value is not yet documented ' +
      'to the standard needed for a precise exposure estimate.'
    );
  }

  const m = (snapshot.subsidyAmountUsd / 1_000_000).toFixed(1);
  return (
    `This project represents approximately $${m}M in modeled public subsidy exposure and is being evaluated ` +
    'for whether public benefits, especially promised jobs and disclosure obligations, appear to be met based on records reviewed.'
  );
}

export function getMainFinding(bundle: CredibilityScoreBundle): string {
  const perf = compliancePerformanceWord(bundle.complianceScore.label);
  const band = confidenceBand(bundle.overallReviewScore.confidence);
  return (
    `Available records indicate ${perf} compliance performance (methodological score ${bundle.complianceScore.score}/100), ` +
    `with ${band} confidence in the overall review (${bundle.overallReviewScore.confidence.toFixed(2)}).`
  );
}

function flagToAssessmentPhrase(flag: ActionFlag): string {
  switch (flag) {
    case 'Flag for Review':
      return 'flagged for further review';
    case 'Monitor':
      return 'monitored on an ongoing basis';
    case 'Appears Compliant':
      return 'treated as provisionally compliant pending fuller documentation';
    case 'Insufficient Data':
      return 'treated as insufficient data for a confident posture';
    default:
      return 'monitored';
  }
}

export function getReviewerAssessment(
  facility: Facility,
  bundle: CredibilityScoreBundle,
  action: ActionFlagResult,
): string {
  const posture = flagToAssessmentPhrase(action.flag);
  const reason =
    action.reasons[0] ??
    bundle.overallReviewScore.explanation ??
    'the weighted score posture and evidence completeness reviewed here.';
  return (
    `Reviewer assessment: ${facility.name} should be ${posture} because ${reason} ` +
    'This statement reflects dashboard methodology only, not an agency or legal determination.'
  );
}

export function pickRecommendedReviewerStep(
  snapshot: CredibilityProjectSnapshot,
  bundle: CredibilityScoreBundle,
  action: ActionFlagResult,
): string {
  const mf = snapshot.missingStructuredFields;
  if (action.flag === 'Appears Compliant') {
    return 'No immediate action';
  }
  if (action.flag === 'Insufficient Data') {
    if (mf.includes('subsidyReceived')) return 'Request missing subsidy agreement';
    return 'Verify job reporting';
  }
  if (bundle.contradictionScore.score > 55) {
    return 'Compare public claims with official reporting';
  }
  if (action.flag === 'Flag for Review') {
    if (mf.includes('credibilityReportingDeadline')) return 'Monitor next reporting deadline';
    return 'Prepare investigative brief';
  }
  if (mf.includes('jobsCreated') || mf.includes('jobsPromised')) {
    return 'Verify job reporting';
  }
  if (mf.includes('credibilityAgreementDate')) {
    return 'Request missing subsidy agreement';
  }
  const first = action.recommendedNextSteps[0];
  if (first?.includes('subsidy') || first?.includes('agreement')) return 'Request missing subsidy agreement';
  if (first?.includes('job')) return 'Verify job reporting';
  if (first?.includes('filing')) return 'Review compliance filing';
  if (first?.includes('claims')) return 'Compare public claims with official reporting';
  if (first?.includes('deadline')) return 'Monitor next reporting deadline';
  return 'Review compliance filing';
}

export function buildTopEvidenceRows(snapshot: CredibilityProjectSnapshot): ReviewerBriefEvidenceRow[] {
  const rows: ReviewerBriefEvidenceRow[] = snapshot.sources
    .map(s => ({
      title: s.title,
      claimOrMetric: s.claim ?? s.notes ?? `Source type: ${s.sourceType}`,
      date: s.date,
      confidence: s.confidence,
      url: s.url,
    }))
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);

  if (rows.length >= 3) return rows;

  for (const o of snapshot.observedOutcomes) {
    if (rows.length >= 3) break;
    rows.push({
      title: `Observed outcome — ${o.metric}`,
      claimOrMetric: String(o.value),
      date: o.date,
      confidence: o.confidence,
      url: o.sourceUrl,
    });
  }

  return rows.slice(0, 3);
}

export function buildMissingCriticalList(snapshot: CredibilityProjectSnapshot): string[] {
  const out = new Set<string>();
  const mf = snapshot.missingStructuredFields;

  if (mf.includes('jobsPromised') || mf.includes('jobsCreated')) {
    out.add('Verified job count aligned with reporting');
  }
  if (mf.includes('subsidyReceived')) {
    out.add('Executed subsidy agreement or verified incentive schedule');
  }
  if (mf.includes('credibilityAgreementDate')) {
    out.add('Agreement execution date');
  }
  if (mf.includes('credibilityReportingDeadline')) {
    out.add('Reporting deadline');
  }
  if (mf.includes('credibilityRecordUpdated')) {
    out.add('Recent record refresh date');
  }
  if (mf.includes('timeline_dates_incomplete')) {
    out.add('Timeline documentation tying reporting to commitments');
  }

  const claimsWithoutUrl = snapshot.publicClaims.filter(c => !c.sourceUrl?.trim()).length;
  if (claimsWithoutUrl > 0) {
    out.add('Public claim source URLs');
  }
  const outcomesWithoutUrl = snapshot.observedOutcomes.filter(o => !o.sourceUrl?.trim()).length;
  if (outcomesWithoutUrl > 0) {
    out.add('Observed outcome source URLs');
  }

  return [...out];
}

export function buildContradictionHighlight(pairs: ContradictionPair[]): string {
  if (pairs.length === 0) {
    return 'No paired public claims and observed outcomes were available for contradiction highlighting.';
  }
  const p = pairs[0];
  return (
    `Largest reviewed gap: ${p.claimText.slice(0, 120)}${p.claimText.length > 120 ? '…' : ''} ` +
    `versus observed ${p.observedMetric} (${p.observedValue}), gap ${p.gapAbsolute}, severity ${p.severity} ` +
    `(confidence ${p.confidence.toFixed(2)}).`
  );
}

export function buildRiskAuditLines(snapshot: CredibilityProjectSnapshot): string[] {
  return snapshot.riskSignals.map(
    s =>
      `${s.signalType}: severity ${s.severity}, confidence ${s.confidence.toFixed(2)} — ${s.description}` +
      (s.evidenceUrl ? ` (reference: ${s.evidenceUrl})` : ''),
  );
}

export function formatClipboardBrief(brief: ReviewerBrief): string {
  const lines: string[] = [
    'DCIM Compliance Dashboard — Reviewer Brief',
    '',
    `Facility: ${brief.facilityName}`,
    `Location: ${brief.location}`,
    `Developer: ${brief.developer}`,
    `Subsidy exposure (modeled): ${brief.subsidyExposureLabel}`,
    `Status: ${brief.statusFlag}`,
    `Compliance score: ${brief.bundle.complianceScore.score} (${brief.bundle.complianceScore.label})`,
    `Overall review score: ${brief.overallReviewScore}`,
    `Confidence: ${brief.confidence.toFixed(2)}`,
    `Last updated: ${brief.lastUpdated}`,
    '',
    'Why this matters:',
    brief.whyThisMatters,
    '',
    'Main finding:',
    brief.mainFinding,
    '',
    'Evidence:',
    ...brief.evidenceRows.map((e, i) =>
      `${i + 1}. ${e.title} — ${e.claimOrMetric} (confidence ${e.confidence.toFixed(2)}${e.date ? `, date ${e.date}` : ''}${e.url ? `, ${e.url}` : ''})`,
    ),
    '',
    'Missing critical data:',
    ...(brief.missingCritical.length > 0 ? brief.missingCritical.map(m => `- ${m}`) : ['- No critical missing fields detected in the current record.']),
    '',
    'Contradiction note:',
    brief.contradictionHighlight,
    '',
    'Recommended next step:',
    brief.recommendedNextStep,
    '',
    getSignalsAlignmentClipboardParagraph(),
    '',
    'Limitations:',
    'This prototype may include demo or manually entered data. Scores are methodological aids, not final legal or compliance determinations.',
  ];
  return lines.join('\n');
}

export function buildReviewerBrief(facility: Facility): ReviewerBrief {
  const snapshot = buildCredibilitySnapshot(facility);
  const bundle = computeCredibilityScoreBundle(snapshot);
  const action = resolveActionFlag(bundle, snapshot);
  const complianceAudit = computeComplianceAuditTrail(snapshot);

  const subsidyMissing = snapshot.missingStructuredFields.includes('subsidyReceived');

  const subsidyExposureLabel = subsidyMissing
    ? 'Not documented in structured records'
    : `$${(snapshot.subsidyAmountUsd / 1_000_000).toFixed(1)}M (modeled)`;

  return {
    facilityName: facility.name,
    location: `${facility.city}, ${facility.state}`,
    developer: facility.operator,
    subsidyExposureLabel,
    subsidyMissing,
    statusFlag: action.flag,
    overallReviewScore: bundle.overallReviewScore.score,
    confidence: bundle.overallReviewScore.confidence,
    lastUpdated: snapshot.lastUpdated ?? facility.lastAuditDate ?? 'Not set',
    whyThisMatters: getWhyThisMatters(snapshot),
    mainFinding: getMainFinding(bundle),
    evidenceRows: buildTopEvidenceRows(snapshot),
    complianceAudit,
    contradictionPairs: bundle.contradictionPairs,
    contradictionHighlight: buildContradictionHighlight(bundle.contradictionPairs),
    riskAuditLines: buildRiskAuditLines(snapshot),
    missingCritical: buildMissingCriticalList(snapshot),
    reviewerAssessment: getReviewerAssessment(facility, bundle, action),
    recommendedNextStep: pickRecommendedReviewerStep(snapshot, bundle, action),
    snapshot,
    bundle,
    action,
  };
}
