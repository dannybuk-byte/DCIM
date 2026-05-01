import { DataSourceType } from './services/DataFetcher';

export interface DataSource {
  type: DataSourceType;
  field: string; // Which field this data source applies to
  verified: boolean;
  fetchedAt?: string;
  reference?: string;
}

export interface Facility {
  id: number;
  name: string;
  type: 'Switch' | 'CO' | 'POP' | 'Data Center' | 'Other';
  /**
   * Backwards-compatible alias used by some analytic panels.
   * Prefer `type` going forward.
   */
  facilityType?: 'Switch' | 'CO' | 'POP' | 'Data Center' | 'Other';
  operator: string;
  country: string;
  state: string;
  city: string;
  complianceStatus: 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown';
  subsidyGap: number;
  /** Total subsidy received (USD); indexed for queries; optional on older seeded rows */
  subsidyReceived?: number;
  lastAuditDate: string;
  issues: string[];
  latitude?: number;
  longitude?: number;
  dataSources?: DataSource[]; // Track where data came from

  // Optional enrichment fields (not guaranteed for all facilities)
  address?: string;
  powerCapacityMW?: number;
  jobsPromised?: number;
  jobsCreated?: number;
  /** ISO date string when facility opened; indexed for templates */
  openedDate?: string;
  /** Capacity metric used by “similar scale” comparisons */
  capacity?: number;
  taxIncentives?: number;
  yearEstablished?: number;

  /** Demo-mode BGP / network-risk indicators (seeded; not live BGP). */
  bgpRiskScore?: number;
  asnCount?: number;
  routeChangeRate?: number;
  latencyAnomalyScore?: number;
  transitDependency?: 'low' | 'medium' | 'high';

  /**
   * Demo composite: normalized blend of compliance risk, BGP risk, and subsidy-gap risk (0–100).
   */
  infrastructureAccountabilityRisk?: number;

  /** --- Credibility / evidence layer (Phase 1, optional; browser-only) --- */
  /** Structured sources cited for subsidy / jobs claims (manual or imported later). */
  credibilitySources?: CredibilitySourceRecord[];
  credibilityPublicClaims?: CredibilityPublicClaimRecord[];
  credibilityObservedOutcomes?: CredibilityObservedOutcomeRecord[];
  credibilityRiskSignals?: CredibilityRiskSignalRecord[];
  promisedCapexUsd?: number;
  actualCapexUsd?: number;
  /** ISO date strings when known */
  credibilityAgreementDate?: string;
  credibilityReportingDeadline?: string;
  /** When credibility-relevant fields were last reviewed in-app */
  credibilityRecordUpdated?: string;
  /**
   * When true, UI shows demo transparency — scores are methodological demos.
   * Auto-set when snapshot builder synthesizes missing rows.
   */
  credibilityIsDemo?: boolean;
}

/** Evidence citation row for credibility scoring (not live ingestion). */
export interface CredibilitySourceRecord {
  id: string;
  title: string;
  url?: string;
  sourceType: string;
  date?: string;
  claim?: string;
  confidence: number;
  notes?: string;
}

export interface CredibilityPublicClaimRecord {
  id: string;
  claimText: string;
  claimType: 'jobs' | 'capex' | 'timeline' | 'other';
  claimDate?: string;
  sourceUrl?: string;
  confidence: number;
}

export interface CredibilityObservedOutcomeRecord {
  id: string;
  metric: string;
  value: number;
  date?: string;
  sourceUrl?: string;
  confidence: number;
}

export interface CredibilityRiskSignalRecord {
  id: string;
  signalType: string;
  severity: number;
  description: string;
  evidenceUrl?: string;
  confidence: number;
}

export interface ComplianceStats {
  totalFacilities: number;
  compliant: number;
  nonCompliant: number;
  atRisk: number;
  unknown: number;
  totalSubsidyGap: number;
  totalIssues: number;
  avgDaysSinceAudit: number;
  overdueAudits: number;
  medianSubsidyGap: number;
  maxSubsidyGap: number;
}

export type TabType = 'Overview' | 'Geography' | 'Problems' | 'Early Warning' | 'Explorer';