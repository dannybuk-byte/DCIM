/**
 * Normalizes Facility rows into a deterministic credibility snapshot.
 * Missing structured evidence is filled with transparent demo placeholders — never presented as verified fact.
 */

import type {
  Facility,
  CredibilityObservedOutcomeRecord,
  CredibilityPublicClaimRecord,
  CredibilityRiskSignalRecord,
  CredibilitySourceRecord,
} from '../types';

/** Deterministic [0, 1) — same facility + salt → same value (no RNG). */
function mix(id: number, salt: number): number {
  let x = Math.imul(id ^ salt, 0x9e3779b9);
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  return (x >>> 0) / 0xffffffff;
}

export interface CredibilityProjectSnapshot {
  facilityId: number;
  name: string;
  locationLabel: string;
  developer: string;
  subsidyAmountUsd: number;
  promisedJobs: number;
  actualJobs: number;
  promisedCapexUsd: number | null;
  actualCapexUsd: number | null;
  agreementDate: string | null;
  reportingDeadline: string | null;
  lastUpdated: string | null;
  sources: CredibilitySourceRecord[];
  publicClaims: CredibilityPublicClaimRecord[];
  observedOutcomes: CredibilityObservedOutcomeRecord[];
  riskSignals: CredibilityRiskSignalRecord[];
  /** Fields that were absent on the Facility before demo fill (for transparency). */
  missingStructuredFields: string[];
  /** True when any demo placeholder sources/claims/outcomes/signals were synthesized. */
  isDemoDerived: boolean;
  layeredComplianceStatus: Facility['complianceStatus'];
  subsidyGapUsd: number;
}

export function buildCredibilitySnapshot(f: Facility): CredibilityProjectSnapshot {
  const missingStructuredFields: string[] = [];
  let isDemoDerived = f.credibilityIsDemo === true;

  let promisedJobs = f.jobsPromised;
  if (promisedJobs == null || Number.isNaN(promisedJobs)) {
    promisedJobs = Math.round(120 + mix(f.id, 2) * 880);
    missingStructuredFields.push('jobsPromised');
    isDemoDerived = true;
  }

  let actualJobs = f.jobsCreated;
  if (actualJobs == null || Number.isNaN(actualJobs)) {
    actualJobs = Math.round(promisedJobs * (0.32 + mix(f.id, 3) * 0.58));
    missingStructuredFields.push('jobsCreated');
    isDemoDerived = true;
  }

  let promisedCapex = f.promisedCapexUsd ?? null;
  let actualCapex = f.actualCapexUsd ?? null;
  if (promisedCapex == null) {
    promisedCapex = Math.round((8 + mix(f.id, 4) * 120) * 1_000_000);
    missingStructuredFields.push('promisedCapexUsd');
    isDemoDerived = true;
  }
  if (actualCapex == null) {
    actualCapex = Math.round(promisedCapex * (0.4 + mix(f.id, 6) * 0.55));
    missingStructuredFields.push('actualCapexUsd');
    isDemoDerived = true;
  }

  const agreementDate = f.credibilityAgreementDate ?? f.openedDate ?? null;
  if (!f.credibilityAgreementDate && !f.openedDate) {
    missingStructuredFields.push('credibilityAgreementDate');
  }

  let reportingDeadline = f.credibilityReportingDeadline ?? null;
  if (!f.credibilityReportingDeadline) {
    reportingDeadline = null;
    missingStructuredFields.push('credibilityReportingDeadline');
  }

  const lastUpdated =
    f.credibilityRecordUpdated ?? f.lastAuditDate ?? null;
  if (!f.credibilityRecordUpdated) {
    missingStructuredFields.push('credibilityRecordUpdated');
  }

  const subsidyReceived = f.subsidyReceived ?? null;
  let subsidyAmountUsd: number;
  if (subsidyReceived != null && subsidyReceived > 0) {
    subsidyAmountUsd = subsidyReceived;
  } else if (f.subsidyGap > 0) {
    subsidyAmountUsd = Math.round(f.subsidyGap * (1.05 + mix(f.id, 7) * 0.35));
    missingStructuredFields.push('subsidyReceived');
    isDemoDerived = true;
  } else {
    subsidyAmountUsd = Math.round(4_000_000 + mix(f.id, 8) * 45_000_000);
    missingStructuredFields.push('subsidyReceived');
    isDemoDerived = true;
  }

  let sources: CredibilitySourceRecord[] =
    f.credibilitySources && f.credibilitySources.length > 0
      ? f.credibilitySources.map(s => ({ ...s }))
      : [];
  if (sources.length === 0) {
    sources = [
      {
        id: `demo-source-${f.id}`,
        title: 'Placeholder — no primary source on file',
        sourceType: 'demo_placeholder',
        confidence: 0.34,
        notes: 'Add agreements, agency filings, or news citations to replace this row.',
      },
    ];
    isDemoDerived = true;
  }

  let publicClaims: CredibilityPublicClaimRecord[] =
    f.credibilityPublicClaims && f.credibilityPublicClaims.length > 0
      ? f.credibilityPublicClaims.map(c => ({ ...c }))
      : [];
  if (publicClaims.length === 0) {
    publicClaims = [
      {
        id: `demo-claim-jobs-${f.id}`,
        claimText: `Public-facing materials reference ${promisedJobs} jobs associated with this project.`,
        claimType: 'jobs',
        confidence: 0.42,
      },
      {
        id: `demo-claim-capex-${f.id}`,
        claimText: `Investment commitments on the order of $${(promisedCapex! / 1e6).toFixed(0)}M appear in briefing documents.`,
        claimType: 'capex',
        confidence: 0.38,
      },
    ];
    isDemoDerived = true;
  }

  let observedOutcomes: CredibilityObservedOutcomeRecord[] =
    f.credibilityObservedOutcomes && f.credibilityObservedOutcomes.length > 0
      ? f.credibilityObservedOutcomes.map(o => ({ ...o }))
      : [];
  if (observedOutcomes.length === 0) {
    observedOutcomes = [
      {
        id: `demo-obs-jobs-${f.id}`,
        metric: 'jobs',
        value: actualJobs,
        confidence: 0.48,
      },
      {
        id: `demo-obs-capex-${f.id}`,
        metric: 'capex_usd',
        value: actualCapex!,
        confidence: 0.44,
      },
    ];
    isDemoDerived = true;
  }

  let riskSignals: CredibilityRiskSignalRecord[] =
    f.credibilityRiskSignals && f.credibilityRiskSignals.length > 0
      ? f.credibilityRiskSignals.map(r => ({ ...r }))
      : [];
  if (riskSignals.length === 0) {
    const severity =
      f.complianceStatus === 'Non-Compliant'
        ? 74
        : f.complianceStatus === 'At Risk'
          ? 52
          : f.complianceStatus === 'Unknown'
            ? 41
            : 24;
    riskSignals = [
      {
        id: `demo-risk-${f.id}`,
        signalType: 'seeded_compliance_flag',
        severity,
        description: `Facility ledger lists compliance as “${f.complianceStatus}” (seeded field, not a legal finding).`,
        confidence: 0.45,
      },
    ];
    isDemoDerived = true;
  }

  return {
    facilityId: f.id,
    name: f.name,
    locationLabel: `${f.city}, ${f.state}`,
    developer: f.operator,
    subsidyAmountUsd,
    promisedJobs,
    actualJobs,
    promisedCapexUsd: promisedCapex,
    actualCapexUsd: actualCapex,
    agreementDate,
    reportingDeadline,
    lastUpdated,
    sources,
    publicClaims,
    observedOutcomes,
    riskSignals,
    missingStructuredFields,
    isDemoDerived,
    layeredComplianceStatus: f.complianceStatus,
    subsidyGapUsd: f.subsidyGap,
  };
}
