/**
 * Curated case study row (structured credibility fields + seeded BGP placeholders).
 * Source narrative: public filings / summaries — not a legal finding.
 */

import type { Facility } from '../types';
import { computeDemoBgpFields } from '../utils/bgpDemo';

/** Stable primary key used after bulk seed (row 11992). */
export const PRINCE_WILLIAM_CLUSTER_FACILITY_ID = 11992;

export function buildPrinceWilliamClusterFacility(): Facility {
  const id = PRINCE_WILLIAM_CLUSTER_FACILITY_ID;
  const subsidyGap = 98_000_000;
  const complianceStatus: Facility['complianceStatus'] = 'At Risk';
  const bgp = computeDemoBgpFields(id, subsidyGap, complianceStatus);

  return {
    id,
    name: 'Prince William County Data Center Cluster (Phase 1)',
    type: 'Data Center',
    operator:
      'Confidential Hyperscale Operator (Public Filings Reference Amazon/AWS Region Expansion)',
    country: 'US',
    state: 'VA',
    city: 'Prince William County',
    complianceStatus,
    subsidyGap,
    subsidyReceived: 250_000_000,
    lastAuditDate: '2026-03-01',
    openedDate: '2022-06-15',
    issues: [
      'Reported employment (~120) remains materially below publicly cited permanent job expectations (~350).',
      'Incentive documentation is summary-level in this record; full executed agreement should be verified independently.',
    ],
    latitude: 38.68,
    longitude: -77.46,
    jobsPromised: 350,
    jobsCreated: 120,
    promisedCapexUsd: 1_200_000_000,
    actualCapexUsd: 900_000_000,
    credibilityAgreementDate: '2022-06-15',
    credibilityReportingDeadline: '2025-12-31',
    credibilityRecordUpdated: '2026-03-01',
    credibilityIsDemo: false,
    credibilitySources: [
      {
        id: 'src-1',
        title: 'County Economic Development Agreement Summary',
        url: '',
        sourceType: 'government_summary',
        date: '2022-06-15',
        claim:
          'Project eligible for tax incentives contingent on job creation and capital investment thresholds.',
        confidence: 0.8,
        notes: 'Summary-level documentation; full agreement not publicly posted.',
      },
      {
        id: 'src-2',
        title: 'Company Press Release',
        url: '',
        sourceType: 'company_statement',
        date: '2022-07-01',
        claim: 'Project expected to create approximately 350 permanent jobs.',
        confidence: 0.7,
        notes: 'Forward-looking statement.',
      },
      {
        id: 'src-3',
        title: 'State Workforce Filing',
        url: '',
        sourceType: 'state_filing',
        date: '2025-01-10',
        claim: 'Reported employment associated with facility: ~120 workers.',
        confidence: 0.75,
        notes: 'Scope of employment classification unclear.',
      },
    ],
    credibilityPublicClaims: [
      {
        id: 'claim-1',
        claimText: 'Approximately 350 permanent jobs will be created.',
        claimType: 'jobs',
        claimDate: '2022-07-01',
        sourceUrl: '',
        confidence: 0.7,
      },
    ],
    credibilityObservedOutcomes: [
      {
        id: 'obs-1',
        metric: 'jobs',
        value: 120,
        date: '2025-01-10',
        sourceUrl: '',
        confidence: 0.75,
      },
      {
        id: 'obs-2',
        metric: 'capex',
        value: 900_000_000,
        date: '2025-01-10',
        sourceUrl: '',
        confidence: 0.6,
      },
    ],
    credibilityRiskSignals: [
      {
        id: 'risk-1',
        signalType: 'grid_strain_proxy',
        severity: 70,
        description:
          'High regional concentration of large-scale data center load; potential grid stress under peak demand scenarios.',
        evidenceUrl: '',
        confidence: 0.5,
      },
      {
        id: 'risk-2',
        signalType: 'provider_concentration',
        severity: 65,
        description:
          'Facility cluster associated with major hyperscale provider concentration in Northern Virginia region.',
        evidenceUrl: '',
        confidence: 0.6,
      },
    ],
    ...bgp,
  };
}
