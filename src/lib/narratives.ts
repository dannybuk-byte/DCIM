/**
 * Template-only narratives — deterministic, auditable strings.
 */

import type { CredibilityProjectSnapshot } from './credibilityInputs';
import type { CredibilityScoreBundle } from './scoring';
import type { ActionFlagResult } from './actionFlags';

export function buildFacilityCredibilityNarrative(
  snapshot: CredibilityProjectSnapshot,
  bundle: CredibilityScoreBundle,
  action: ActionFlagResult,
): string {
  const subsidyM = (snapshot.subsidyAmountUsd / 1_000_000).toFixed(1);
  const jobRatio =
    snapshot.promisedJobs > 0
      ? Math.round((snapshot.actualJobs / snapshot.promisedJobs) * 1000) / 10
      : 0;

  const missing =
    snapshot.missingStructuredFields.length > 0
      ? snapshot.missingStructuredFields.slice(0, 6).join(', ')
      : 'none flagged';

  const demoNote = snapshot.isDemoDerived
    ? ' Records include demo-filled placeholders where structured fields were absent; treat figures as methodological, not adjudicated.'
    : '';

  return (
    `${snapshot.name} is associated with roughly $${subsidyM}M in modeled public subsidy value and ${snapshot.promisedJobs} promised jobs in the structured ledger.` +
    ` Available entries show ${snapshot.actualJobs} jobs, producing a fulfillment ratio near ${jobRatio}%.` +
    ` Based on available evidence, compliance confidence is rated “${bundle.complianceScore.label}” (${bundle.complianceScore.score}/100) with evidence confidence ${bundle.evidenceConfidenceScore.score}/100.` +
    ` Overall review confidence is ${bundle.overallReviewScore.confidence.toFixed(2)} on a 0–1 scale.` +
    ` Missing structured inputs include: ${missing}.${demoNote}` +
    ` Recommended status: ${action.flag}.` +
    ` This dashboard does not treat silence as proof of compliance or noncompliance.`
  );
}
