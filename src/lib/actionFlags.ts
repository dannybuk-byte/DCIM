/**
 * Deterministic review posture from credibility scores (no ML).
 */

import type { CredibilityProjectSnapshot } from './credibilityInputs';
import type { CredibilityScoreBundle } from './scoring';

export type ActionFlag =
  | 'Flag for Review'
  | 'Monitor'
  | 'Appears Compliant'
  | 'Insufficient Data';

export interface ActionFlagResult {
  flag: ActionFlag;
  reasons: string[];
  recommendedNextSteps: string[];
}

const NEXT_STEPS_POOL = [
  'Request missing agreement text or incentive summary',
  'Verify job counts against state / local reporting',
  'Review subsidy compliance filings or clawback clauses',
  'Compare public claims with agency-reported outcomes',
  'Monitor upcoming reporting deadlines',
] as const;

export function resolveActionFlag(
  bundle: CredibilityScoreBundle,
  snapshot: CredibilityProjectSnapshot,
): ActionFlagResult {
  const compliance = bundle.complianceScore.score;
  const contradiction = bundle.contradictionScore.score;
  const publicRisk = bundle.publicRiskScore.score;
  const confidence = bundle.overallReviewScore.confidence;
  const missingHeavy = snapshot.missingStructuredFields.length >= 4;

  const reasons: string[] = [];

  if (confidence < 0.3) {
    reasons.push('Overall confidence is below 0.30 — structured inputs or citations are too thin.');
    return {
      flag: 'Insufficient Data',
      reasons,
      recommendedNextSteps: [
        NEXT_STEPS_POOL[0],
        NEXT_STEPS_POOL[3],
        NEXT_STEPS_POOL[4],
      ],
    };
  }

  const flagReview =
    (compliance < 50 && confidence >= 0.5) ||
    contradiction > 60 ||
    publicRisk > 70;

  if (flagReview) {
    if (compliance < 50 && confidence >= 0.5) {
      reasons.push(`Compliance score ${compliance} with usable confidence ${confidence.toFixed(2)}.`);
    }
    if (contradiction > 60) reasons.push(`Contradiction pressure ${contradiction} exceeds the review threshold.`);
    if (publicRisk > 70) reasons.push(`Public risk signal ${publicRisk} exceeds the escalation threshold.`);
    return {
      flag: 'Flag for Review',
      reasons,
      recommendedNextSteps: [
        NEXT_STEPS_POOL[2],
        NEXT_STEPS_POOL[3],
        NEXT_STEPS_POOL[1],
      ],
    };
  }

  const appearsCompliant =
    compliance >= 75 && confidence >= 0.6 && contradiction < 30;

  if (appearsCompliant) {
    reasons.push('High compliance score with moderate contradiction pressure and adequate confidence.');
    return {
      flag: 'Appears Compliant',
      reasons,
      recommendedNextSteps: [NEXT_STEPS_POOL[4], NEXT_STEPS_POOL[3]],
    };
  }

  const monitorBand =
    (compliance >= 50 && compliance < 75) ||
    (confidence >= 0.3 && confidence < 0.5) ||
    missingHeavy;

  if (monitorBand) {
    if (compliance >= 50 && compliance < 75) reasons.push(`Compliance score ${compliance} sits in the watch band.`);
    if (confidence >= 0.3 && confidence < 0.5) reasons.push(`Confidence ${confidence.toFixed(2)} warrants ongoing verification.`);
    if (missingHeavy) reasons.push('Several structured fields are still missing from the record.');
    return {
      flag: 'Monitor',
      reasons,
      recommendedNextSteps: [
        NEXT_STEPS_POOL[1],
        NEXT_STEPS_POOL[3],
        NEXT_STEPS_POOL[4],
      ],
    };
  }

  reasons.push('Default posture: continue periodic monitoring.');
  return {
    flag: 'Monitor',
    reasons,
    recommendedNextSteps: [NEXT_STEPS_POOL[4], NEXT_STEPS_POOL[3]],
  };
}
