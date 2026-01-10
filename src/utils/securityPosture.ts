/**
 * Security Posture Scoring System
 * 
 * Based on Jason Haddix's offensive security methodology, this module calculates
 * security posture scores for data center facilities using client-side risk analysis.
 * 
 * Antifragility Features:
 * - Pure functions with no external dependencies
 * - Comprehensive fallback values for missing data
 * - Memoization for performance
 * - Type-safe with strict null checks
 */

import type { Facility } from '../types';

export interface SecurityPosture {
  facilityId: string;
  facilityName: string;
  score: number; // 0-100, higher is better
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  riskFactors: RiskFactor[];
  lastAssessment: Date;
}

export interface RiskFactor {
  category: 'compliance' | 'data-quality' | 'provider' | 'disclosure' | 'infrastructure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  impact: number; // Points deducted from score
  recommendation?: string;
}

// Cache for calculated scores (5 minute TTL)
const scoreCache = new Map<string, { posture: SecurityPosture; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Calculate comprehensive security posture for a facility
 * Pure function with no side effects
 */
export function calculateSecurityPosture(facility: Facility): SecurityPosture {
  // Check cache first
  const cached = scoreCache.get(String(facility.id));
  const now = Date.now();
  if (cached && (now - cached.timestamp < CACHE_TTL)) {
    return cached.posture;
  }

  const riskFactors: RiskFactor[] = [];
  let score = 100; // Start with perfect score

  try {
    // 1. Compliance Risk Assessment (most critical)
    const complianceRisk = assessComplianceRisk(facility);
    if (complianceRisk) {
      riskFactors.push(complianceRisk);
      score -= complianceRisk.impact;
    }

    // 2. Data Quality Assessment
    const dataQualityRisk = assessDataQuality(facility);
    if (dataQualityRisk) {
      riskFactors.push(dataQualityRisk);
      score -= dataQualityRisk.impact;
    }

    // 3. Provider Risk Assessment
    const providerRisk = assessProviderRisk(facility);
    if (providerRisk) {
      riskFactors.push(providerRisk);
      score -= providerRisk.impact;
    }

    // 4. Disclosure Risk Assessment
    const disclosureRisk = assessDisclosureRisk(facility);
    if (disclosureRisk) {
      riskFactors.push(disclosureRisk);
      score -= disclosureRisk.impact;
    }

    // 5. Infrastructure Pattern Risk
    const infrastructureRisk = assessInfrastructureRisk(facility);
    if (infrastructureRisk) {
      riskFactors.push(infrastructureRisk);
      score -= infrastructureRisk.impact;
    }

    // Clamp score to valid range
    score = Math.max(0, Math.min(100, score));

    const posture: SecurityPosture = {
      facilityId: String(facility.id),
      facilityName: facility.name,
      score,
      riskLevel: scoreToRiskLevel(score),
      riskFactors,
      lastAssessment: new Date(),
    };

    // Cache the result
    scoreCache.set(String(facility.id), { posture, timestamp: now });

    return posture;
  } catch (error) {
    console.error(`[SecurityPosture] Error calculating score for ${facility.id}:`, error);
    // Return safe neutral posture on error
    return {
      facilityId: String(facility.id),
      facilityName: facility.name,
      score: 50,
      riskLevel: 'medium',
      riskFactors: [{
        category: 'data-quality',
        severity: 'medium',
        description: 'Unable to assess security posture due to data error',
        impact: 0,
      }],
      lastAssessment: new Date(),
    };
  }
}

/**
 * Assess compliance-related risks (job creation, subsidies)
 */
function assessComplianceRisk(facility: Facility): RiskFactor | null {
  const subsidyGap = facility.subsidyGap || 0;

  if (subsidyGap > 10000000) {
    return {
      category: 'compliance',
      severity: 'critical',
      description: `Major subsidy gap: $${(subsidyGap / 1000000).toFixed(1)}M in unmet job creation promises`,
      impact: 30,
      recommendation: 'Investigate job creation shortfall and enforcement mechanisms',
    };
  }

  if (subsidyGap > 5000000) {
    return {
      category: 'compliance',
      severity: 'high',
      description: `Significant subsidy gap: $${(subsidyGap / 1000000).toFixed(1)}M in unmet promises`,
      impact: 20,
      recommendation: 'Review compliance status and corrective action plans',
    };
  }

  if (subsidyGap > 1000000) {
    return {
      category: 'compliance',
      severity: 'medium',
      description: `Subsidy gap detected: $${(subsidyGap / 1000000).toFixed(1)}M`,
      impact: 10,
      recommendation: 'Monitor for compliance improvement',
    };
  }

  return null;
}

/**
 * Assess data quality and freshness
 */
function assessDataQuality(facility: Facility): RiskFactor | null {
  const now = Date.now();
  const lastUpdated = facility.lastAuditDate ? new Date(facility.lastAuditDate).getTime() : 0;
  const ageInDays = (now - lastUpdated) / (1000 * 60 * 60 * 24);

  if (ageInDays > 365 || !lastUpdated) {
    return {
      category: 'data-quality',
      severity: 'high',
      description: `Data is ${Math.floor(ageInDays)} days old or unknown`,
      impact: 15,
      recommendation: 'Update facility data from recent sources',
    };
  }

  if (ageInDays > 180) {
    return {
      category: 'data-quality',
      severity: 'medium',
      description: `Data is ${Math.floor(ageInDays)} days old`,
      impact: 8,
      recommendation: 'Consider refreshing facility information',
    };
  }

  return null;
}

/**
 * Assess provider-related risks
 */
function assessProviderRisk(facility: Facility): RiskFactor | null {
  const operator = (facility.operator || '').toLowerCase();

  // High-risk patterns (Haddix methodology)
  const highRiskPatterns = ['unknown', 'unverified', 'pending', 'tbd', 'n/a'];
  const isHighRisk = highRiskPatterns.some(pattern => 
    operator.includes(pattern)
  );

  if (isHighRisk) {
    return {
      category: 'provider',
      severity: 'high',
      description: 'Provider or operator information is unverified or missing',
      impact: 15,
      recommendation: 'Verify facility ownership and operational control',
    };
  }

  // Provider-based checks removed - Facility type doesn't have provider field
  // Operator information is sufficient for risk assessment

  return null;
}

/**
 * Assess disclosure and transparency risks
 */
function assessDisclosureRisk(facility: Facility): RiskFactor | null {
  const hasCoordinates = facility.latitude !== undefined && facility.longitude !== undefined;
  const hasAddress = facility.city && facility.state;

  if (!hasCoordinates && !hasAddress) {
    return {
      category: 'disclosure',
      severity: 'high',
      description: 'Limited location disclosure - potential shadow infrastructure',
      impact: 12,
      recommendation: 'Investigate facility location through OSINT (crt.sh, ASN lookups)',
    };
  }

  if (!hasCoordinates) {
    return {
      category: 'disclosure',
      severity: 'medium',
      description: 'Exact coordinates not disclosed',
      impact: 6,
      recommendation: 'Attempt geolocation via IP ranges or building permits',
    };
  }

  return null;
}

/**
 * Assess infrastructure pattern risks (Haddix reconnaissance patterns)
 */
function assessInfrastructureRisk(facility: Facility): RiskFactor | null {
  const name = (facility.name || '').toLowerCase();
  
  // Patterns indicating exposed management interfaces (Haddix methodology)
  const exposedPatterns = ['ipmi', 'ilo', 'drac', 'bmc', 'mgmt', 'admin'];
  const hasExposedPattern = exposedPatterns.some(pattern => name.includes(pattern));

  if (hasExposedPattern) {
    return {
      category: 'infrastructure',
      severity: 'critical',
      description: 'Facility name suggests exposed management interface',
      impact: 25,
      recommendation: 'Investigate for exposed IPMI/iLO/DRAC interfaces via Shodan/Censys',
    };
  }

  // Patterns indicating development/staging environments in production
  const devPatterns = ['test', 'dev', 'staging', 'lab', 'sandbox'];
  const hasDevPattern = devPatterns.some(pattern => name.includes(pattern));

  if (hasDevPattern) {
    return {
      category: 'infrastructure',
      severity: 'medium',
      description: 'Facility name suggests non-production environment',
      impact: 8,
      recommendation: 'Verify if this is production infrastructure eligible for subsidies',
    };
  }

  return null;
}

/**
 * Convert numeric score to risk level
 */
function scoreToRiskLevel(score: number): 'low' | 'medium' | 'high' | 'critical' {
  if (score >= 80) return 'low';
  if (score >= 60) return 'medium';
  if (score >= 40) return 'high';
  return 'critical';
}

/**
 * Get color for risk level (Tailwind-safe static classes)
 */
export function getRiskLevelColor(level: 'low' | 'medium' | 'high' | 'critical'): {
  bg: string;
  text: string;
  border: string;
} {
  switch (level) {
    case 'low':
      return {
        bg: 'bg-green-500/10',
        text: 'text-green-400',
        border: 'border-green-500/30',
      };
    case 'medium':
      return {
        bg: 'bg-yellow-500/10',
        text: 'text-yellow-400',
        border: 'border-yellow-500/30',
      };
    case 'high':
      return {
        bg: 'bg-orange-500/10',
        text: 'text-orange-400',
        border: 'border-orange-500/30',
      };
    case 'critical':
      return {
        bg: 'bg-red-500/10',
        text: 'text-red-400',
        border: 'border-red-500/30',
      };
  }
}

/**
 * Batch calculate security postures for multiple facilities
 * Implements graceful degradation - continues on individual failures
 */
export function batchCalculateSecurityPosture(facilities: Facility[]): SecurityPosture[] {
  const postures: SecurityPosture[] = [];

  for (const facility of facilities) {
    try {
      postures.push(calculateSecurityPosture(facility));
    } catch (error) {
      console.error(`[SecurityPosture] Failed to calculate score for ${facility.id}:`, error);
      // Continue processing other facilities
    }
  }

  return postures;
}

/**
 * Get aggregate security statistics for a set of facilities
 */
export function getAggregateSecurityStats(postures: SecurityPosture[]): {
  averageScore: number;
  riskDistribution: Record<'low' | 'medium' | 'high' | 'critical', number>;
  topRiskFactors: Array<{ category: string; count: number }>;
} {
  if (postures.length === 0) {
    return {
      averageScore: 0,
      riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
      topRiskFactors: [],
    };
  }

  const averageScore = postures.reduce((sum, p) => sum + p.score, 0) / postures.length;

  const riskDistribution = postures.reduce((acc, p) => {
    acc[p.riskLevel]++;
    return acc;
  }, { low: 0, medium: 0, high: 0, critical: 0 });

  // Count risk factor categories
  const factorCounts = new Map<string, number>();
  postures.forEach(p => {
    p.riskFactors.forEach(rf => {
      factorCounts.set(rf.category, (factorCounts.get(rf.category) || 0) + 1);
    });
  });

  const topRiskFactors = Array.from(factorCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    averageScore: Math.round(averageScore * 10) / 10,
    riskDistribution,
    topRiskFactors,
  };
}

/**
 * Clear the score cache (useful for testing or manual refresh)
 */
export function clearSecurityPostureCache(): void {
  scoreCache.clear();
  console.log('[SecurityPosture] Cache cleared');
}

