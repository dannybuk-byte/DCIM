import type { Facility } from '../../types';

export type PatternSeverity = 'critical' | 'high' | 'medium' | 'low';

export type PatternType =
  | 'budget_punctuation'
  | 'strategic_ignorance_risk'
  | 'operational_degradation'
  | 'network_vulnerability'
  | 'compliance_cascade'
  | 'temporal_anomaly'
  | 'correlation_insight'
  | 'causal_chain';

export interface ScenarioSettings {
  minSubsidyGap: number;
  minIssuesCount: number;
  maxAuditRecencyDays: number;
  operatorCascadeMinFacilities: number;
  operatorCascadeMinNonComplianceRate: number; // 0..1
  sensitivity: number; // 0..1 (higher = more findings)
}

export interface FacilityFeatureRow {
  id: number;
  name: string;
  operator: string;
  state: string;
  city: string;
  country: string;
  type: Facility['type'];
  complianceStatus: Facility['complianceStatus'];
  subsidyGap: number;
  issuesCount: number;
  auditRecencyDays: number | null;
  statusScore: number; // 0..1
}

export interface ExplainFeature {
  feature: string;
  value: number;
  cohort: 'global' | 'operator' | 'state';
  cohortMedian: number;
  cohortMad: number;
  robustZ: number;
  contribution: number; // 0..1 (relative)
}

export interface EvidenceRow {
  metric: string;
  facilityValue: number;
  cohortMedian: number;
  deltaPercent: number;
  note: string;
}

export interface PatternFinding {
  id: string;
  type: PatternType;
  severity: PatternSeverity;
  title: string;
  description: string;
  confidence: number; // 0..1
  createdAt: string;
  affectedFacilities: number[];
  affectedOperators: string[];
  score: number; // 0..1
  explain: ExplainFeature[];
  evidence: EvidenceRow[];
  recommendations: string[];
  limitations: string[];
}

export interface CorrelationInsight {
  id: string;
  metric1: string;
  metric2: string;
  correlation: number; // -1..1
  interpretation: string;
  actionable: boolean;
  sampleSize: number;
}

export interface PatternLabOutput {
  generatedAt: string;
  scenario: ScenarioSettings;
  summary: {
    totalFindings: number;
    critical: number;
    high: number;
    topOperators: Array<{ operator: string; findings: number; nonComplianceRate: number }>;
  };
  findings: PatternFinding[];
  correlations: CorrelationInsight[];
}


