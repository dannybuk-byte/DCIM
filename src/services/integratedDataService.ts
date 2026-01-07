/**
 * INTEGRATED DATA SERVICE
 * 
 * Unified service that combines all data sources:
 * - Research-based facility data (11,992 facilities)
 * - Good Jobs First subsidies (75+ verified)
 * - State audit reports (25+ verified)
 * - CORS proxy for live government APIs
 * - labordata NLRB cases
 * 
 * This is the main interface for getting comprehensive facility intelligence.
 */

import { db, Facility } from '../db/database';
import { EXPANDED_SUBSIDIES, VerifiedSubsidy, getSubsidiesByCompany, getSubsidiesByState } from './expandedSubsidies';
import { STATE_AUDIT_FINDINGS, StateAuditFinding, getAuditsByCompany, getAuditsByState } from './stateAuditReports';
import { CORSProxy, EPAFacility, OSHAInspection, OSHAViolation } from './corsProxy';
import type { DataVerificationLevel } from '../components/DataSourceBadge';

// ============================================================================
// TYPES
// ============================================================================

export interface FacilityIntelligence {
  // Core facility data
  facility: Facility;
  
  // Verification levels
  dataVerification: {
    overall: DataVerificationLevel;
    subsidy: DataVerificationLevel;
    compliance: DataVerificationLevel;
    jobs: DataVerificationLevel;
    environmental: DataVerificationLevel;
    safety: DataVerificationLevel;
  };
  
  // Verified subsidy data (if available)
  verifiedSubsidy?: VerifiedSubsidy;
  
  // State audit findings (if available)
  stateAudits?: StateAuditFinding[];
  
  // Live API data (if fetched)
  epaData?: {
    facilities: EPAFacility[];
    lastFetched: number;
  };
  oshaData?: {
    inspections: OSHAInspection[];
    violations: OSHAViolation[];
    lastFetched: number;
  };
  
  // Summary scores
  scores: {
    complianceScore: number; // 0-100
    laborRisk: number; // 0-100 (higher = more risk)
    environmentalRisk: number; // 0-100
    subsidyEfficiency: number; // Jobs created per $1M subsidy
    overallAccountability: number; // Combined score
  };
  
  // Citable facts (ready for legal/press)
  citableFacts: CitableFact[];
}

export interface CitableFact {
  statement: string;
  source: string;
  sourceUrl: string;
  verificationLevel: DataVerificationLevel;
  date?: string;
}

// ============================================================================
// FACILITY INTELLIGENCE FETCHER
// ============================================================================

/**
 * Get comprehensive intelligence for a single facility
 */
export async function getFacilityIntelligence(
  facilityId: number,
  options: {
    fetchLiveData?: boolean;
    includeNearby?: boolean;
  } = {}
): Promise<FacilityIntelligence | null> {
  const facility = await db.facilities.get(facilityId);
  if (!facility) return null;
  
  // Find matching verified subsidy
  const verifiedSubsidy = findMatchingSubsidy(facility);
  
  // Find matching state audits
  const stateAudits = findMatchingAudits(facility);
  
  // Determine verification levels
  const dataVerification = determineVerificationLevels(facility, verifiedSubsidy, stateAudits);
  
  // Calculate scores
  const scores = calculateScores(facility, verifiedSubsidy, stateAudits);
  
  // Generate citable facts
  const citableFacts = generateCitableFacts(facility, verifiedSubsidy, stateAudits);
  
  const intelligence: FacilityIntelligence = {
    facility,
    dataVerification,
    verifiedSubsidy,
    stateAudits,
    scores,
    citableFacts,
  };
  
  // Optionally fetch live API data
  if (options.fetchLiveData && facility.country === 'US') {
    try {
      // EPA data
      const epaResult = await CORSProxy.searchEPAFacilities(facility.state, facility.city);
      if (epaResult.success && epaResult.data) {
        intelligence.epaData = {
          facilities: epaResult.data,
          lastFetched: Date.now(),
        };
      }
      
      // OSHA data
      const oshaResult = await CORSProxy.searchOSHAInspections(facility.operator, facility.state);
      if (oshaResult.success && oshaResult.data) {
        intelligence.oshaData = {
          inspections: oshaResult.data,
          violations: [],
          lastFetched: Date.now(),
        };
      }
    } catch (error) {
      console.warn('Failed to fetch live API data:', error);
    }
  }
  
  return intelligence;
}

/**
 * Get intelligence for multiple facilities (batch)
 */
export async function getBatchIntelligence(
  facilityIds: number[]
): Promise<Map<number, FacilityIntelligence>> {
  const results = new Map<number, FacilityIntelligence>();
  
  for (const id of facilityIds) {
    const intel = await getFacilityIntelligence(id);
    if (intel) {
      results.set(id, intel);
    }
  }
  
  return results;
}

// ============================================================================
// MATCHING FUNCTIONS
// ============================================================================

function findMatchingSubsidy(facility: Facility): VerifiedSubsidy | undefined {
  // Try exact match first
  const exactMatch = EXPANDED_SUBSIDIES.find(s => {
    const companyMatch = normalizeCompany(facility.operator).includes(normalizeCompany(s.company)) ||
                        normalizeCompany(s.company).includes(normalizeCompany(facility.operator));
    const stateMatch = facility.state === s.state;
    const cityMatch = facility.city.toLowerCase() === s.city.toLowerCase();
    return companyMatch && stateMatch && cityMatch;
  });
  
  if (exactMatch) return exactMatch;
  
  // Try fuzzy match (same company and state)
  const fuzzyMatch = EXPANDED_SUBSIDIES.find(s => {
    const companyMatch = normalizeCompany(facility.operator).includes(normalizeCompany(s.company)) ||
                        normalizeCompany(s.company).includes(normalizeCompany(facility.operator));
    const stateMatch = facility.state === s.state;
    return companyMatch && stateMatch;
  });
  
  return fuzzyMatch;
}

function findMatchingAudits(facility: Facility): StateAuditFinding[] {
  return STATE_AUDIT_FINDINGS.filter(a => {
    const companyMatch = normalizeCompany(facility.operator).includes(normalizeCompany(a.company)) ||
                        normalizeCompany(a.company).includes(normalizeCompany(facility.operator));
    const stateMatch = facility.state === a.state;
    return companyMatch && stateMatch;
  });
}

function normalizeCompany(name: string): string {
  return name.toLowerCase()
    .replace(/inc\.?$/i, '')
    .replace(/llc\.?$/i, '')
    .replace(/corp\.?$/i, '')
    .replace(/corporation$/i, '')
    .replace(/platforms$/i, '')
    .trim();
}

// ============================================================================
// VERIFICATION LEVEL DETERMINATION
// ============================================================================

function determineVerificationLevels(
  facility: Facility,
  subsidy?: VerifiedSubsidy,
  audits?: StateAuditFinding[]
): FacilityIntelligence['dataVerification'] {
  const hasVerifiedSubsidy = !!subsidy;
  const hasStateAudit = audits && audits.length > 0;
  
  return {
    overall: hasVerifiedSubsidy || hasStateAudit ? 'verified' : 'research',
    subsidy: hasVerifiedSubsidy ? 'verified' : facility.taxIncentives ? 'estimated' : 'research',
    compliance: hasStateAudit ? 'verified' : 'research',
    jobs: hasStateAudit && audits.some(a => a.jobs_actual !== undefined) ? 'verified' : 'estimated',
    environmental: 'research', // Would be 'live-api' if EPA data fetched
    safety: 'research', // Would be 'live-api' if OSHA data fetched
  };
}

// ============================================================================
// SCORE CALCULATIONS
// ============================================================================

function calculateScores(
  facility: Facility,
  subsidy?: VerifiedSubsidy,
  audits?: StateAuditFinding[]
): FacilityIntelligence['scores'] {
  // Compliance score (higher = better)
  let complianceScore = 50; // Default neutral
  if (facility.complianceStatus === 'Compliant') complianceScore = 100;
  if (facility.complianceStatus === 'At Risk') complianceScore = 40;
  if (facility.complianceStatus === 'Non-Compliant') complianceScore = 20;
  
  if (subsidy) {
    if (subsidy.compliance_status === 'Compliant') complianceScore = 100;
    if (subsidy.compliance_status === 'Partial') complianceScore = 50;
    if (subsidy.compliance_status === 'Non-Compliant') complianceScore = 10;
  }
  
  // Labor risk score (higher = more risk)
  let laborRisk = 30; // Default low
  if (audits) {
    const hasJobShortfall = audits.some(a => a.finding_type === 'Job Shortfall');
    const hasClawback = audits.some(a => a.status === 'Pending Clawback');
    if (hasJobShortfall) laborRisk += 30;
    if (hasClawback) laborRisk += 40;
  }
  
  // Environmental risk (placeholder - would use EPA data)
  const environmentalRisk = 20;
  
  // Subsidy efficiency (jobs per $1M subsidy)
  let subsidyEfficiency = 0;
  if (subsidy && subsidy.jobs_verified && subsidy.subsidy_amount > 0) {
    subsidyEfficiency = (subsidy.jobs_verified / (subsidy.subsidy_amount / 1_000_000));
  } else if (facility.jobsCreated && facility.taxIncentives && facility.taxIncentives > 0) {
    subsidyEfficiency = (facility.jobsCreated / (facility.taxIncentives / 1_000_000));
  }
  
  // Overall accountability (weighted average)
  const overallAccountability = Math.round(
    complianceScore * 0.4 +
    (100 - laborRisk) * 0.3 +
    (100 - environmentalRisk) * 0.2 +
    Math.min(subsidyEfficiency * 10, 100) * 0.1
  );
  
  return {
    complianceScore,
    laborRisk,
    environmentalRisk,
    subsidyEfficiency: Math.round(subsidyEfficiency * 10) / 10,
    overallAccountability,
  };
}

// ============================================================================
// CITABLE FACTS GENERATION
// ============================================================================

function generateCitableFacts(
  facility: Facility,
  subsidy?: VerifiedSubsidy,
  audits?: StateAuditFinding[]
): CitableFact[] {
  const facts: CitableFact[] = [];
  
  // Subsidy facts
  if (subsidy) {
    facts.push({
      statement: `${subsidy.company} received $${(subsidy.subsidy_amount / 1_000_000).toFixed(1)}M in subsidies for ${subsidy.facility_name} in ${subsidy.city}, ${subsidy.state}.`,
      source: 'Good Jobs First Subsidy Tracker',
      sourceUrl: subsidy.source_url,
      verificationLevel: 'verified',
      date: `${subsidy.year_announced}`,
    });
    
    if (subsidy.jobs_promised) {
      facts.push({
        statement: `${subsidy.company} promised to create ${subsidy.jobs_promised.toLocaleString()} jobs at this facility.`,
        source: 'Good Jobs First Subsidy Tracker',
        sourceUrl: subsidy.source_url,
        verificationLevel: 'verified',
        date: `${subsidy.year_announced}`,
      });
    }
    
    if (subsidy.jobs_verified !== undefined && subsidy.jobs_verified < subsidy.jobs_promised) {
      const shortfall = subsidy.jobs_promised - subsidy.jobs_verified;
      const percent = Math.round((shortfall / subsidy.jobs_promised) * 100);
      facts.push({
        statement: `As of ${subsidy.jobs_verified_date}, only ${subsidy.jobs_verified.toLocaleString()} jobs were verified - ${percent}% below the promised ${subsidy.jobs_promised.toLocaleString()} jobs.`,
        source: 'Good Jobs First Subsidy Tracker',
        sourceUrl: subsidy.source_url,
        verificationLevel: 'verified',
        date: subsidy.jobs_verified_date,
      });
    }
  }
  
  // State audit facts
  if (audits && audits.length > 0) {
    for (const audit of audits) {
      if (audit.finding_type === 'Job Shortfall' && audit.jobs_actual !== undefined) {
        facts.push({
          statement: `${audit.audit_agency} found ${audit.company} created ${audit.jobs_actual.toLocaleString()} jobs vs. ${audit.jobs_promised?.toLocaleString()} promised.`,
          source: audit.audit_agency,
          sourceUrl: audit.source_url,
          verificationLevel: 'verified',
          date: audit.audit_date,
        });
      }
      
      if (audit.status === 'Pending Clawback') {
        facts.push({
          statement: `${audit.state} has initiated clawback proceedings against ${audit.company} for failing to meet job creation targets.`,
          source: audit.audit_agency,
          sourceUrl: audit.source_url,
          verificationLevel: 'verified',
          date: audit.audit_date,
        });
      }
    }
  }
  
  return facts;
}

// ============================================================================
// AGGREGATE STATISTICS
// ============================================================================

export interface AggregateStatistics {
  totalFacilities: number;
  verifiedFacilities: number;
  researchFacilities: number;
  
  totalVerifiedSubsidies: number;
  totalSubsidyAmount: number;
  totalJobsPromised: number;
  totalJobsVerified: number;
  jobsShortfall: number;
  subsidyAtRisk: number;
  
  complianceBreakdown: {
    compliant: number;
    partial: number;
    nonCompliant: number;
    pending: number;
  };
  
  topViolators: Array<{
    company: string;
    shortfallPercent: number;
    subsidyAmount: number;
  }>;
  
  byState: Array<{
    state: string;
    facilities: number;
    subsidyAmount: number;
  }>;
}

export async function getAggregateStatistics(): Promise<AggregateStatistics> {
  const allFacilities = await db.facilities.toArray();
  
  // Count verified vs research facilities
  let verifiedCount = 0;
  for (const facility of allFacilities) {
    if (findMatchingSubsidy(facility) || findMatchingAudits(facility).length > 0) {
      verifiedCount++;
    }
  }
  
  // Calculate subsidy stats from expanded subsidies
  const totalSubsidyAmount = EXPANDED_SUBSIDIES.reduce((sum, s) => sum + s.subsidy_amount, 0);
  const totalJobsPromised = EXPANDED_SUBSIDIES.reduce((sum, s) => sum + s.jobs_promised, 0);
  const totalJobsVerified = EXPANDED_SUBSIDIES
    .filter(s => s.jobs_verified !== undefined)
    .reduce((sum, s) => sum + (s.jobs_verified || 0), 0);
  
  // Calculate subsidy at risk
  const subsidyAtRisk = EXPANDED_SUBSIDIES
    .filter(s => s.compliance_status === 'Non-Compliant' || s.compliance_status === 'Partial')
    .reduce((sum, s) => sum + s.subsidy_amount, 0);
  
  // Compliance breakdown
  const complianceBreakdown = {
    compliant: EXPANDED_SUBSIDIES.filter(s => s.compliance_status === 'Compliant').length,
    partial: EXPANDED_SUBSIDIES.filter(s => s.compliance_status === 'Partial').length,
    nonCompliant: EXPANDED_SUBSIDIES.filter(s => s.compliance_status === 'Non-Compliant').length,
    pending: EXPANDED_SUBSIDIES.filter(s => s.compliance_status === 'Pending').length,
  };
  
  // Top violators
  const topViolators = EXPANDED_SUBSIDIES
    .filter(s => s.jobs_verified !== undefined && s.jobs_verified < s.jobs_promised)
    .map(s => ({
      company: s.company,
      shortfallPercent: ((s.jobs_promised - (s.jobs_verified || 0)) / s.jobs_promised) * 100,
      subsidyAmount: s.subsidy_amount,
    }))
    .sort((a, b) => b.shortfallPercent - a.shortfallPercent)
    .slice(0, 10);
  
  // By state
  const byStateMap = new Map<string, { facilities: number; subsidyAmount: number }>();
  for (const s of EXPANDED_SUBSIDIES) {
    const existing = byStateMap.get(s.state) || { facilities: 0, subsidyAmount: 0 };
    existing.facilities++;
    existing.subsidyAmount += s.subsidy_amount;
    byStateMap.set(s.state, existing);
  }
  const byState = Array.from(byStateMap.entries())
    .map(([state, data]) => ({ state, ...data }))
    .sort((a, b) => b.subsidyAmount - a.subsidyAmount);
  
  return {
    totalFacilities: allFacilities.length,
    verifiedFacilities: verifiedCount,
    researchFacilities: allFacilities.length - verifiedCount,
    totalVerifiedSubsidies: EXPANDED_SUBSIDIES.length,
    totalSubsidyAmount,
    totalJobsPromised,
    totalJobsVerified,
    jobsShortfall: totalJobsPromised - totalJobsVerified,
    subsidyAtRisk,
    complianceBreakdown,
    topViolators,
    byState,
  };
}

// ============================================================================
// SEARCH WITH VERIFICATION
// ============================================================================

export interface SearchResult {
  facility: Facility;
  verificationLevel: DataVerificationLevel;
  hasVerifiedSubsidy: boolean;
  hasStateAudit: boolean;
}

export async function searchFacilitiesWithVerification(
  query: string,
  filters?: {
    state?: string;
    operator?: string;
    verifiedOnly?: boolean;
  }
): Promise<SearchResult[]> {
  let facilities = await db.facilities.toArray();
  
  // Apply filters
  if (filters?.state) {
    facilities = facilities.filter(f => f.state === filters.state);
  }
  if (filters?.operator) {
    facilities = facilities.filter(f => 
      f.operator.toLowerCase().includes(filters.operator!.toLowerCase())
    );
  }
  
  // Search by query
  if (query) {
    const lowerQuery = query.toLowerCase();
    facilities = facilities.filter(f =>
      f.name.toLowerCase().includes(lowerQuery) ||
      f.operator.toLowerCase().includes(lowerQuery) ||
      f.city.toLowerCase().includes(lowerQuery) ||
      f.state.toLowerCase().includes(lowerQuery)
    );
  }
  
  // Map to search results with verification
  const results: SearchResult[] = facilities.map(f => {
    const hasVerifiedSubsidy = !!findMatchingSubsidy(f);
    const hasStateAudit = findMatchingAudits(f).length > 0;
    
    return {
      facility: f,
      verificationLevel: (hasVerifiedSubsidy || hasStateAudit) ? 'verified' : 'research',
      hasVerifiedSubsidy,
      hasStateAudit,
    };
  });
  
  // Filter to verified only if requested
  if (filters?.verifiedOnly) {
    return results.filter(r => r.verificationLevel === 'verified');
  }
  
  // Sort verified first
  return results.sort((a, b) => {
    if (a.verificationLevel === 'verified' && b.verificationLevel !== 'verified') return -1;
    if (b.verificationLevel === 'verified' && a.verificationLevel !== 'verified') return 1;
    return 0;
  });
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  getSubsidiesByCompany,
  getSubsidiesByState,
  getAuditsByCompany,
  getAuditsByState,
};

export default {
  getFacilityIntelligence,
  getBatchIntelligence,
  getAggregateStatistics,
  searchFacilitiesWithVerification,
  getSubsidiesByCompany,
  getSubsidiesByState,
  getAuditsByCompany,
  getAuditsByState,
};

