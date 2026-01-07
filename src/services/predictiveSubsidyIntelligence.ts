/**
 * Predictive Subsidy Intelligence System
 * 
 * Moves from Good Jobs First-style post-hoc research to PROACTIVE risk identification.
 * 
 * Instead of discovering subsidy failures AFTER they happen, this system identifies
 * at-risk subsidies BEFORE they fail using leading indicators from:
 * - DCIM/DMaaS power and infrastructure data
 * - SEC filings (automation, restructuring language)
 * - Corporate structure changes (OpenCorporates)
 * - Network topology shifts (BGP/PeeringDB)
 * - Job posting and headcount signals
 * 
 * Based on Good Jobs First findings:
 * - Virginia: gets back only 48 cents per $1 abated
 * - Georgia: $50M in tax breaks vs $15M in taxes
 * - Texas: FY2025 cost revised from $130M to $1B in 23 months
 * - 10 states lose $100M+/year to data center tax breaks
 * - 12 "dark" states don't disclose even aggregate losses
 */

import { db } from '../db/database';
import { secEdgarApi, BIG_TECH_CIKS } from '../integrations/secEdgar';
import { openCorporatesApi } from '../integrations/openCorporates';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface SubsidyAgreement {
  id: string;
  facilityId: string;
  facilityName: string;
  operator: string;
  state: string;
  county?: string;
  
  // Agreement details
  subsidyType: 'sales_tax_exemption' | 'property_tax_abatement' | 'cash_grant' | 'tif' | 'mixed';
  totalSubsidyValue: number; // Estimated total value
  annualSubsidyValue: number; // Per-year value
  agreementDate: Date;
  expirationDate?: Date;
  durationYears: number;
  
  // Commitments
  jobsPromised: number;
  jobsDeadline?: Date;
  investmentPromised: number;
  investmentDeadline?: Date;
  
  // Clawback provisions
  hasClawback: boolean;
  clawbackTriggers?: string[];
  clawbackPercentage?: number;
  
  // Current status
  jobsActual: number;
  investmentActual: number;
  complianceStatus: 'on_track' | 'at_risk' | 'non_compliant' | 'clawback_triggered' | 'unknown';
  
  // Source & verification
  sourceUrl?: string;
  lastVerified: Date;
  dataQuality: 'verified' | 'estimated' | 'self_reported' | 'unknown';
}

export interface EarlyWarningSignal {
  id: string;
  facilityId: string;
  signalType: 
    | 'power_vs_jobs_divergence' 
    | 'automation_language_spike'
    | 'corporate_restructuring'
    | 'traffic_routing_shift'
    | 'job_posting_decline'
    | 'sec_filing_warning'
    | 'property_sale_signal'
    | 'leadership_exodus'
    | 'subsidiary_creation';
  
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  
  description: string;
  evidence: string[];
  detectedAt: Date;
  
  // Quantified risk
  estimatedSubsidyAtRisk: number;
  daysToCritical?: number;
  
  // Recommended action
  recommendedAction: string;
}

export interface SubsidyRiskScore {
  facilityId: string;
  facilityName: string;
  operator: string;
  state: string;
  
  // Core risk metrics
  overallRiskScore: number; // 0-100, higher = more risk
  clawbackProbability: number; // 0-100
  subsidyAtRisk: number; // Dollar amount at risk
  
  // Component scores
  jobComplianceScore: number;
  investmentComplianceScore: number;
  financialHealthScore: number;
  operationalStabilityScore: number;
  transparencyScore: number;
  
  // Trend
  riskTrend: 'improving' | 'stable' | 'worsening' | 'critical';
  monthOverMonthChange: number;
  
  // Contributing factors
  topRiskFactors: Array<{
    factor: string;
    weight: number;
    description: string;
  }>;
  
  // Early warnings
  activeWarnings: EarlyWarningSignal[];
  
  // Prediction
  predictedComplianceDate?: Date;
  recommendedActions: string[];
  
  lastCalculated: Date;
}

export interface StateSubsidyProfile {
  stateCode: string;
  stateName: string;
  
  // Program details
  hasDataCenterIncentive: boolean;
  incentiveTypes: string[];
  salesTaxExemptionPercent: number;
  propertyTaxAbatementPercent?: number;
  
  // Financial impact
  annualRevenueLoss: number;
  revenueLossPerJob: number;
  costBenefitRatio: number; // < 1 means losing money
  
  // Transparency
  disclosesAggregateLoss: boolean;
  disclosesCompanySpecific: boolean;
  transparencyScore: number; // 0-100
  
  // Program controls
  hasAnnualCap: boolean;
  annualCapAmount?: number;
  hasPerCompanyCap: boolean;
  perCompanyCapAmount?: number;
  
  // Trends
  revenueLossTrend: 'increasing' | 'stable' | 'decreasing';
  projectedFY2026Loss?: number;
  
  // Data center count
  activeFacilities: number;
  totalSubsidyValue: number;
  totalJobsPromised: number;
  totalJobsDelivered: number;
  
  // Risk rating
  fiscalRiskRating: 'low' | 'medium' | 'high' | 'critical';
}

// ============================================================================
// GOOD JOBS FIRST DATA (Known state profiles)
// ============================================================================

export const STATE_PROFILES: Record<string, Partial<StateSubsidyProfile>> = {
  'VA': {
    stateCode: 'VA',
    stateName: 'Virginia',
    hasDataCenterIncentive: true,
    salesTaxExemptionPercent: 100,
    costBenefitRatio: 0.48, // Gets back 48 cents per $1 abated
    disclosesAggregateLoss: true,
    disclosesCompanySpecific: false,
    transparencyScore: 60,
    hasAnnualCap: false,
    fiscalRiskRating: 'high',
  },
  'GA': {
    stateCode: 'GA',
    stateName: 'Georgia',
    hasDataCenterIncentive: true,
    salesTaxExemptionPercent: 100,
    annualRevenueLoss: 50_000_000, // $50M in FY2025
    costBenefitRatio: 0.30, // $15M in taxes vs $50M in breaks
    disclosesAggregateLoss: true,
    disclosesCompanySpecific: false,
    transparencyScore: 55,
    hasAnnualCap: false,
    fiscalRiskRating: 'critical',
  },
  'TX': {
    stateCode: 'TX',
    stateName: 'Texas',
    hasDataCenterIncentive: true,
    salesTaxExemptionPercent: 100,
    annualRevenueLoss: 1_000_000_000, // $1B revised estimate FY2025
    disclosesAggregateLoss: true,
    disclosesCompanySpecific: false,
    transparencyScore: 50,
    hasAnnualCap: false,
    revenueLossTrend: 'increasing', // Revised from $130M to $1B
    fiscalRiskRating: 'critical',
  },
  'WA': {
    stateCode: 'WA',
    stateName: 'Washington',
    hasDataCenterIncentive: true,
    salesTaxExemptionPercent: 100,
    annualRevenueLoss: 57_000_000, // vs $22M property taxes
    costBenefitRatio: 0.39,
    disclosesAggregateLoss: true,
    transparencyScore: 65,
    hasAnnualCap: false,
    fiscalRiskRating: 'high',
  },
  'IL': {
    stateCode: 'IL',
    stateName: 'Illinois',
    hasDataCenterIncentive: true,
    salesTaxExemptionPercent: 100,
    disclosesAggregateLoss: true,
    transparencyScore: 50,
    hasAnnualCap: false,
    revenueLossTrend: 'increasing', // 1000%+ spike
    fiscalRiskRating: 'high',
  },
  // "Dark" states - don't disclose even aggregate losses
  'IN': {
    stateCode: 'IN',
    stateName: 'Indiana',
    hasDataCenterIncentive: true,
    disclosesAggregateLoss: false,
    disclosesCompanySpecific: false,
    transparencyScore: 10,
    fiscalRiskRating: 'critical', // Unknown = critical
  },
  'NC': {
    stateCode: 'NC',
    stateName: 'North Carolina',
    hasDataCenterIncentive: true,
    disclosesAggregateLoss: false,
    disclosesCompanySpecific: false,
    transparencyScore: 10,
    fiscalRiskRating: 'critical',
  },
  'UT': {
    stateCode: 'UT',
    stateName: 'Utah',
    hasDataCenterIncentive: true,
    disclosesAggregateLoss: false,
    disclosesCompanySpecific: false,
    transparencyScore: 10,
    fiscalRiskRating: 'critical',
  },
  'NV': {
    stateCode: 'NV',
    stateName: 'Nevada',
    hasDataCenterIncentive: true,
    salesTaxExemptionPercent: 100,
    transparencyScore: 35,
    hasAnnualCap: false,
    fiscalRiskRating: 'high',
  },
  'OH': {
    stateCode: 'OH',
    stateName: 'Ohio',
    hasDataCenterIncentive: true,
    salesTaxExemptionPercent: 100,
    propertyTaxAbatementPercent: 75,
    transparencyScore: 40,
    hasAnnualCap: false,
    fiscalRiskRating: 'high',
  },
};

// States with data center incentives (32 per Good Jobs First)
export const STATES_WITH_DC_INCENTIVES = [
  'AL', 'AZ', 'CO', 'CT', 'FL', 'GA', 'ID', 'IL', 'IN', 'IA',
  'KY', 'LA', 'MD', 'MI', 'MN', 'MS', 'MO', 'NE', 'NV', 'NC',
  'ND', 'OH', 'OK', 'OR', 'SC', 'TN', 'TX', 'UT', 'VA', 'WA',
  'WV', 'WI'
];

// ============================================================================
// EARLY WARNING DETECTION
// ============================================================================

/**
 * Detect automation language in SEC filings
 */
export async function detectAutomationSignals(company: string): Promise<EarlyWarningSignal[]> {
  const signals: EarlyWarningSignal[] = [];
  
  const automationKeywords = [
    'automation', 'ai investment', 'machine learning', 'efficiency',
    'headcount reduction', 'workforce optimization', 'restructuring',
    'cost reduction', 'operational efficiency', 'streamlining'
  ];
  
  const cik = BIG_TECH_CIKS[company];
  if (!cik) return signals;
  
  try {
    const filings = await secEdgarApi.fetchCompanyFilings(cik, ['10-K', '10-Q', '8-K']);
    
    for (const filing of filings.slice(0, 5)) {
      // In production, we'd fetch and analyze full filing text
      // For now, flag based on filing type and timing
      if (filing.form === '8-K') {
        signals.push({
          id: `auto-${filing.accessionNumber}`,
          facilityId: 'company-wide',
          signalType: 'automation_language_spike',
          severity: 'medium',
          confidence: 60,
          description: `8-K filing detected for ${company} - potential restructuring announcement`,
          evidence: [`SEC Filing: ${filing.accessionNumber}`, `Date: ${filing.filingDate}`],
          detectedAt: new Date(),
          estimatedSubsidyAtRisk: 0, // Would calculate based on affected facilities
          recommendedAction: 'Review 8-K for restructuring or workforce changes'
        });
      }
    }
  } catch (error) {
    console.error('Error detecting automation signals:', error);
  }
  
  return signals;
}

/**
 * Detect corporate restructuring from OpenCorporates
 */
export async function detectCorporateRestructuring(company: string): Promise<EarlyWarningSignal[]> {
  const signals: EarlyWarningSignal[] = [];
  
  try {
    const subsidiaries = await openCorporatesApi.findDataCenterSubsidiaries(company);
    
    // Look for recently created subsidiaries (might indicate restructuring)
    const recentSubs = subsidiaries.filter(sub => {
      const incDate = new Date(sub.incorporationDate);
      const oneYearAgo = new Date();
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
      return incDate > oneYearAgo;
    });
    
    if (recentSubs.length > 2) {
      signals.push({
        id: `restructure-${company}-${Date.now()}`,
        facilityId: 'company-wide',
        signalType: 'subsidiary_creation',
        severity: 'medium',
        confidence: 55,
        description: `${recentSubs.length} new subsidiaries created in past year for ${company}`,
        evidence: recentSubs.map(s => `${s.name} (${s.jurisdiction})`),
        detectedAt: new Date(),
        estimatedSubsidyAtRisk: 0,
        recommendedAction: 'Investigate purpose of new subsidiaries - may indicate job relocations'
      });
    }
  } catch (error) {
    console.error('Error detecting corporate restructuring:', error);
  }
  
  return signals;
}

/**
 * Detect power consumption vs jobs divergence
 * This is a KEY leading indicator - if power consumption rises but jobs stay flat,
 * the facility is likely automating and won't meet job commitments.
 */
export function detectPowerJobsDivergence(
  powerReadings: Array<{ timestamp: Date; kw: number }>,
  jobsPromised: number,
  jobsActual: number,
  monthsElapsed: number
): EarlyWarningSignal | null {
  if (powerReadings.length < 2) return null;
  
  // Calculate power growth
  const oldestPower = powerReadings[0].kw;
  const latestPower = powerReadings[powerReadings.length - 1].kw;
  const powerGrowthPercent = ((latestPower - oldestPower) / oldestPower) * 100;
  
  // Calculate expected job progress
  const expectedJobProgress = jobsPromised * (monthsElapsed / 60); // Assume 5-year commitment
  const actualJobProgress = jobsActual;
  const jobProgressPercent = (actualJobProgress / expectedJobProgress) * 100;
  
  // Divergence: power growing faster than jobs
  const divergence = powerGrowthPercent - jobProgressPercent;
  
  if (divergence > 50) {
    const severity: 'low' | 'medium' | 'high' | 'critical' = 
      divergence > 200 ? 'critical' :
      divergence > 100 ? 'high' :
      divergence > 75 ? 'medium' : 'low';
    
    return {
      id: `power-jobs-${Date.now()}`,
      facilityId: 'facility-id',
      signalType: 'power_vs_jobs_divergence',
      severity,
      confidence: 75,
      description: `Power consumption up ${powerGrowthPercent.toFixed(1)}% but job creation only ${jobProgressPercent.toFixed(1)}% of target`,
      evidence: [
        `Power: ${oldestPower.toFixed(0)}kW → ${latestPower.toFixed(0)}kW (+${powerGrowthPercent.toFixed(1)}%)`,
        `Jobs: ${actualJobProgress} of ${expectedJobProgress.toFixed(0)} expected (${jobProgressPercent.toFixed(1)}%)`,
        `Divergence gap: ${divergence.toFixed(1)} percentage points`
      ],
      detectedAt: new Date(),
      estimatedSubsidyAtRisk: 0, // Would calculate based on agreement
      recommendedAction: 'Facility may be automating - investigate job creation compliance',
      daysToCritical: Math.max(30, 180 - monthsElapsed * 3) // Estimate
    };
  }
  
  return null;
}

// ============================================================================
// RISK SCORING ENGINE
// ============================================================================

/**
 * Calculate comprehensive subsidy risk score for a facility
 */
export function calculateSubsidyRiskScore(
  agreement: SubsidyAgreement,
  earlyWarnings: EarlyWarningSignal[],
  stateProfile?: Partial<StateSubsidyProfile>
): SubsidyRiskScore {
  // Job compliance score (0-100, higher = better)
  const jobsProgress = agreement.jobsPromised > 0 
    ? (agreement.jobsActual / agreement.jobsPromised) * 100 
    : 50;
  const jobComplianceScore = Math.min(100, jobsProgress);
  
  // Investment compliance score
  const investmentProgress = agreement.investmentPromised > 0
    ? (agreement.investmentActual / agreement.investmentPromised) * 100
    : 50;
  const investmentComplianceScore = Math.min(100, investmentProgress);
  
  // Financial health score (based on early warnings)
  const financialWarnings = earlyWarnings.filter(w => 
    w.signalType === 'automation_language_spike' || 
    w.signalType === 'sec_filing_warning'
  );
  const financialHealthScore = Math.max(0, 100 - (financialWarnings.length * 20));
  
  // Operational stability score
  const operationalWarnings = earlyWarnings.filter(w =>
    w.signalType === 'power_vs_jobs_divergence' ||
    w.signalType === 'traffic_routing_shift'
  );
  const operationalStabilityScore = Math.max(0, 100 - (operationalWarnings.length * 25));
  
  // Transparency score (from state profile)
  const transparencyScore = stateProfile?.transparencyScore ?? 50;
  
  // Calculate overall risk score (0-100, higher = MORE RISK)
  // Invert the compliance scores since higher compliance = lower risk
  const riskScore = Math.min(100, Math.max(0,
    (100 - jobComplianceScore) * 0.35 +
    (100 - investmentComplianceScore) * 0.20 +
    (100 - financialHealthScore) * 0.20 +
    (100 - operationalStabilityScore) * 0.15 +
    (100 - transparencyScore) * 0.10
  ));
  
  // Calculate clawback probability
  const daysRemaining = agreement.jobsDeadline 
    ? Math.max(0, (new Date(agreement.jobsDeadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : 365;
  const clawbackProbability = Math.min(100, Math.max(0,
    (100 - jobComplianceScore) * 0.7 +
    (daysRemaining < 180 ? 20 : daysRemaining < 365 ? 10 : 0) +
    (earlyWarnings.filter(w => w.severity === 'critical').length * 10)
  ));
  
  // Calculate subsidy at risk
  const subsidyAtRisk = agreement.totalSubsidyValue * (clawbackProbability / 100);
  
  // Determine trend
  const criticalWarnings = earlyWarnings.filter(w => w.severity === 'critical' || w.severity === 'high');
  const riskTrend: 'improving' | 'stable' | 'worsening' | 'critical' =
    criticalWarnings.length > 2 ? 'critical' :
    criticalWarnings.length > 0 ? 'worsening' :
    jobComplianceScore > 80 ? 'improving' : 'stable';
  
  // Identify top risk factors
  const topRiskFactors: SubsidyRiskScore['topRiskFactors'] = [];
  
  if (jobComplianceScore < 50) {
    topRiskFactors.push({
      factor: 'Job Creation Shortfall',
      weight: 0.35,
      description: `Only ${agreement.jobsActual} of ${agreement.jobsPromised} jobs created (${jobComplianceScore.toFixed(0)}%)`
    });
  }
  
  if (!stateProfile?.disclosesAggregateLoss) {
    topRiskFactors.push({
      factor: 'State Transparency Gap',
      weight: 0.10,
      description: 'State does not disclose subsidy revenue losses'
    });
  }
  
  earlyWarnings.filter(w => w.severity === 'critical' || w.severity === 'high').forEach(w => {
    topRiskFactors.push({
      factor: w.signalType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      weight: 0.15,
      description: w.description
    });
  });
  
  // Generate recommended actions
  const recommendedActions: string[] = [];
  if (jobComplianceScore < 70) {
    recommendedActions.push('Request updated job creation report from facility');
  }
  if (criticalWarnings.length > 0) {
    recommendedActions.push('Conduct immediate compliance audit');
  }
  if (!stateProfile?.disclosesAggregateLoss) {
    recommendedActions.push('File FOIA request for subsidy disclosure');
  }
  if (agreement.hasClawback && clawbackProbability > 50) {
    recommendedActions.push('Prepare clawback enforcement documentation');
  }
  
  return {
    facilityId: agreement.facilityId,
    facilityName: agreement.facilityName,
    operator: agreement.operator,
    state: agreement.state,
    
    overallRiskScore: Math.round(riskScore),
    clawbackProbability: Math.round(clawbackProbability),
    subsidyAtRisk: Math.round(subsidyAtRisk),
    
    jobComplianceScore: Math.round(jobComplianceScore),
    investmentComplianceScore: Math.round(investmentComplianceScore),
    financialHealthScore: Math.round(financialHealthScore),
    operationalStabilityScore: Math.round(operationalStabilityScore),
    transparencyScore: Math.round(transparencyScore),
    
    riskTrend,
    monthOverMonthChange: criticalWarnings.length > 0 ? 5 : 0,
    
    topRiskFactors,
    activeWarnings: earlyWarnings,
    
    recommendedActions,
    lastCalculated: new Date()
  };
}

// ============================================================================
// BATCH ANALYSIS
// ============================================================================

/**
 * Analyze all facilities for subsidy risk
 */
export async function analyzeAllFacilitiesSubsidyRisk(): Promise<SubsidyRiskScore[]> {
  const riskScores: SubsidyRiskScore[] = [];
  
  try {
    const facilities = await db.facilities.toArray();
    
    for (const facility of facilities) {
      // Create synthetic subsidy agreement from facility data
      const agreement: SubsidyAgreement = {
        id: `subsidy-${facility.id}`,
        facilityId: String(facility.id),
        facilityName: facility.name,
        operator: facility.operator,
        state: facility.state,
        
        subsidyType: 'mixed',
        totalSubsidyValue: facility.subsidyAmount || 0,
        annualSubsidyValue: (facility.subsidyAmount || 0) / 10,
        agreementDate: new Date(2020, 0, 1),
        durationYears: 10,
        
        jobsPromised: facility.jobsPromised || 0,
        investmentPromised: facility.subsidyAmount || 0,
        
        hasClawback: true,
        
        jobsActual: facility.jobsActual || 0,
        investmentActual: facility.subsidyAmount || 0,
        complianceStatus: facility.complianceStatus as SubsidyAgreement['complianceStatus'] || 'unknown',
        
        lastVerified: new Date(),
        dataQuality: 'estimated'
      };
      
      // Get state profile
      const stateProfile = STATE_PROFILES[facility.state];
      
      // For demo, generate some early warnings based on compliance status
      const warnings: EarlyWarningSignal[] = [];
      if (facility.complianceStatus === 'non-compliant') {
        warnings.push({
          id: `warning-${facility.id}`,
          facilityId: String(facility.id),
          signalType: 'power_vs_jobs_divergence',
          severity: 'high',
          confidence: 70,
          description: 'Facility marked non-compliant',
          evidence: ['Compliance status: non-compliant'],
          detectedAt: new Date(),
          estimatedSubsidyAtRisk: agreement.totalSubsidyValue * 0.5,
          recommendedAction: 'Immediate compliance review required'
        });
      }
      
      const score = calculateSubsidyRiskScore(agreement, warnings, stateProfile);
      riskScores.push(score);
    }
    
    // Sort by risk score (highest risk first)
    riskScores.sort((a, b) => b.overallRiskScore - a.overallRiskScore);
    
  } catch (error) {
    console.error('Error analyzing facility subsidy risk:', error);
  }
  
  return riskScores;
}

/**
 * Generate state-level subsidy risk summary
 */
export function generateStateSubsidyReport(): StateSubsidyProfile[] {
  const profiles: StateSubsidyProfile[] = [];
  
  for (const stateCode of STATES_WITH_DC_INCENTIVES) {
    const known = STATE_PROFILES[stateCode];
    
    profiles.push({
      stateCode,
      stateName: known?.stateName || stateCode,
      
      hasDataCenterIncentive: true,
      incentiveTypes: ['sales_tax_exemption'],
      salesTaxExemptionPercent: known?.salesTaxExemptionPercent ?? 100,
      propertyTaxAbatementPercent: known?.propertyTaxAbatementPercent,
      
      annualRevenueLoss: known?.annualRevenueLoss ?? 0,
      revenueLossPerJob: 0, // Would calculate from data
      costBenefitRatio: known?.costBenefitRatio ?? 0.5,
      
      disclosesAggregateLoss: known?.disclosesAggregateLoss ?? false,
      disclosesCompanySpecific: known?.disclosesCompanySpecific ?? false,
      transparencyScore: known?.transparencyScore ?? 25,
      
      hasAnnualCap: known?.hasAnnualCap ?? false,
      hasPerCompanyCap: false,
      
      revenueLossTrend: known?.revenueLossTrend ?? 'increasing',
      
      activeFacilities: 0, // Would populate from data
      totalSubsidyValue: 0,
      totalJobsPromised: 0,
      totalJobsDelivered: 0,
      
      fiscalRiskRating: known?.fiscalRiskRating ?? 'high'
    });
  }
  
  // Sort by fiscal risk
  const riskOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
  profiles.sort((a, b) => riskOrder[a.fiscalRiskRating] - riskOrder[b.fiscalRiskRating]);
  
  return profiles;
}

// ============================================================================
// PREDICTIVE MODELS
// ============================================================================

/**
 * Predict subsidy compliance trajectory
 */
export function predictComplianceTrajectory(
  agreement: SubsidyAgreement,
  monthsToProject: number = 24
): Array<{ month: number; predictedJobProgress: number; riskLevel: string }> {
  const trajectory: Array<{ month: number; predictedJobProgress: number; riskLevel: string }> = [];
  
  // Simple linear projection based on current progress
  const currentProgressRate = agreement.jobsActual / Math.max(1, agreement.jobsPromised);
  
  for (let month = 1; month <= monthsToProject; month++) {
    // Apply slight decay factor for struggling facilities
    const decayFactor = currentProgressRate < 0.5 ? 0.98 : 1.0;
    const predictedProgress = Math.min(1, currentProgressRate * Math.pow(decayFactor, month / 12));
    
    const riskLevel = 
      predictedProgress < 0.25 ? 'critical' :
      predictedProgress < 0.50 ? 'high' :
      predictedProgress < 0.75 ? 'medium' : 'low';
    
    trajectory.push({
      month,
      predictedJobProgress: Math.round(predictedProgress * 100),
      riskLevel
    });
  }
  
  return trajectory;
}

/**
 * Estimate total subsidy exposure by operator
 */
export async function estimateOperatorSubsidyExposure(): Promise<Array<{
  operator: string;
  totalSubsidyValue: number;
  facilitiesCount: number;
  averageRiskScore: number;
  totalJobsPromised: number;
  totalJobsDelivered: number;
  jobsDeliveryRate: number;
}>> {
  const operatorMap = new Map<string, {
    totalSubsidy: number;
    facilityCount: number;
    riskScores: number[];
    jobsPromised: number;
    jobsDelivered: number;
  }>();
  
  try {
    const facilities = await db.facilities.toArray();
    
    for (const facility of facilities) {
      const operator = facility.operator;
      const existing = operatorMap.get(operator) || {
        totalSubsidy: 0,
        facilityCount: 0,
        riskScores: [],
        jobsPromised: 0,
        jobsDelivered: 0
      };
      
      existing.totalSubsidy += facility.subsidyAmount || 0;
      existing.facilityCount += 1;
      existing.jobsPromised += facility.jobsPromised || 0;
      existing.jobsDelivered += facility.jobsActual || 0;
      
      // Calculate risk score for this facility
      const riskScore = facility.complianceStatus === 'non-compliant' ? 80 :
                       facility.complianceStatus === 'at-risk' ? 60 :
                       facility.complianceStatus === 'compliant' ? 20 : 50;
      existing.riskScores.push(riskScore);
      
      operatorMap.set(operator, existing);
    }
    
  } catch (error) {
    console.error('Error estimating operator subsidy exposure:', error);
  }
  
  // Convert to array and sort by total subsidy
  const result = Array.from(operatorMap.entries()).map(([operator, data]) => ({
    operator,
    totalSubsidyValue: data.totalSubsidy,
    facilitiesCount: data.facilityCount,
    averageRiskScore: data.riskScores.length > 0 
      ? Math.round(data.riskScores.reduce((a, b) => a + b, 0) / data.riskScores.length)
      : 50,
    totalJobsPromised: data.jobsPromised,
    totalJobsDelivered: data.jobsDelivered,
    jobsDeliveryRate: data.jobsPromised > 0 
      ? Math.round((data.jobsDelivered / data.jobsPromised) * 100) 
      : 0
  }));
  
  result.sort((a, b) => b.totalSubsidyValue - a.totalSubsidyValue);
  
  return result;
}

// Export main analysis functions
export const predictiveSubsidyIntelligence = {
  detectAutomationSignals,
  detectCorporateRestructuring,
  detectPowerJobsDivergence,
  calculateSubsidyRiskScore,
  analyzeAllFacilitiesSubsidyRisk,
  generateStateSubsidyReport,
  predictComplianceTrajectory,
  estimateOperatorSubsidyExposure,
  STATE_PROFILES,
  STATES_WITH_DC_INCENTIVES
};

export default predictiveSubsidyIntelligence;

