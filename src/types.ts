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
  taxIncentives?: number;
  yearEstablished?: number;
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