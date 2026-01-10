/**
 * P&I Club Style Compliance Scoring Service
 * 
 * Insurance-industry inspired classification system for data centers.
 * Similar to how P&I (Protection & Indemnity) clubs classify ships,
 * this system classifies facilities based on compliance risk.
 * 
 * Inspired by:
 * - Lloyd's ship classification
 * - P&I Club mutual insurance model
 * - ISO 27001 certification framework
 * - Uptime Institute tier classification
 */

// =============================================================================
// TYPES
// =============================================================================

export type ComplianceClass = 
  | 'A+'  // Exemplary - Industry leader
  | 'A'   // Excellent - Full compliance, best practices
  | 'B+'  // Good - Minor issues, proactive remediation
  | 'B'   // Adequate - Meets requirements with some gaps
  | 'C'   // Marginal - Multiple compliance gaps
  | 'D'   // Poor - Significant violations
  | 'F';  // Failing - Critical violations, enforcement pending

export type RiskCategory = 
  | 'labor'
  | 'environmental'
  | 'safety'
  | 'financial'
  | 'transparency'
  | 'community';

export interface ComplianceScore {
  facilityId: number;
  facilityName: string;
  operator: string;
  
  // Overall classification
  overallClass: ComplianceClass;
  overallScore: number; // 0-100
  confidenceLevel: number; // 0-100, based on data quality
  
  // Category scores
  categoryScores: {
    [key in RiskCategory]: {
      score: number;
      class: ComplianceClass;
      issues: string[];
      positives: string[];
    };
  };
  
  // Trend analysis
  trend: 'improving' | 'stable' | 'declining';
  previousClass?: ComplianceClass;
  classChangedDate?: string;
  
  // Insurance implications
  insuranceImpact: {
    premiumMultiplier: number; // 0.8 = 20% discount, 1.5 = 50% premium
    insurabilityRisk: 'standard' | 'elevated' | 'high' | 'uninsurable';
    recommendedCoverage: string[];
    exclusions: string[];
  };
  
  // Verification
  lastAuditDate?: string;
  auditSource?: string;
  verificationLevel: 'verified' | 'self-reported' | 'estimated';
  
  // Calculated metadata
  calculatedAt: string;
  dataSourcesUsed: string[];
}

export interface ClassificationCriteria {
  category: RiskCategory;
  name: string;
  weight: number; // 0-1, total should equal 1
  indicators: ComplianceIndicator[];
}

export interface ComplianceIndicator {
  id: string;
  name: string;
  description: string;
  maxPoints: number;
  dataSource: string;
  evaluationCriteria: {
    excellent: string;
    good: string;
    adequate: string;
    poor: string;
    failing: string;
  };
}

export interface MutualRiskPool {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  totalCoverage: number;
  pooledPremiums: number;
  claimsReserve: number;
  memberRequirements: string[];
  benefitTiers: {
    class: ComplianceClass;
    premiumRate: number;
    coverageLimit: number;
    deductible: number;
  }[];
}

// =============================================================================
// CLASSIFICATION CRITERIA
// =============================================================================

export const CLASSIFICATION_CRITERIA: ClassificationCriteria[] = [
  {
    category: 'labor',
    name: 'Labor Compliance',
    weight: 0.25,
    indicators: [
      {
        id: 'nlrb-violations',
        name: 'NLRB Violation History',
        description: 'History of unfair labor practice charges and settlements',
        maxPoints: 25,
        dataSource: 'labordata/NLRB',
        evaluationCriteria: {
          excellent: 'No ULP charges in past 5 years',
          good: 'Minor charges, all resolved favorably',
          adequate: '1-2 settled charges, no findings against',
          poor: 'Multiple charges with adverse findings',
          failing: 'Active enforcement or repeat violations',
        },
      },
      {
        id: 'union-relations',
        name: 'Union Relations',
        description: 'Quality of relationships with organized labor',
        maxPoints: 25,
        dataSource: 'Self-reported / Union surveys',
        evaluationCriteria: {
          excellent: 'Active labor-management partnership, CBAs in place',
          good: 'Constructive relationship, regular dialogue',
          adequate: 'Neutral stance, no active disputes',
          poor: 'Adversarial relationship, active organizing conflicts',
          failing: 'Union avoidance campaigns, LM-10 reports filed',
        },
      },
      {
        id: 'wage-compliance',
        name: 'Wage & Hour Compliance',
        description: 'Compliance with wage laws, overtime, classification',
        maxPoints: 25,
        dataSource: 'DOL-WHD database',
        evaluationCriteria: {
          excellent: 'Above market wages, full benefits, no violations',
          good: 'Market wages, benefits, minor violations resolved',
          adequate: 'Compliant with minimum requirements',
          poor: 'Multiple wage claims or DOL investigations',
          failing: 'Active enforcement, class action litigation',
        },
      },
      {
        id: 'contractor-practices',
        name: 'Contractor Labor Practices',
        description: 'Treatment of contractor/temp workers',
        maxPoints: 25,
        dataSource: 'Contractor surveys / Joint employer analysis',
        evaluationCriteria: {
          excellent: 'Direct hire preference, contractor parity',
          good: 'Fair contractor terms, pathway to FTE',
          adequate: 'Standard contractor arrangements',
          poor: 'Heavy contractor reliance, two-tier system',
          failing: 'Misclassification, joint employer disputes',
        },
      },
    ],
  },
  {
    category: 'environmental',
    name: 'Environmental Compliance',
    weight: 0.20,
    indicators: [
      {
        id: 'epa-violations',
        name: 'EPA Violation History',
        description: 'History of environmental violations and enforcement',
        maxPoints: 25,
        dataSource: 'EPA ECHO database',
        evaluationCriteria: {
          excellent: 'No violations, voluntary programs participant',
          good: 'Minor violations, prompt remediation',
          adequate: 'Some violations, generally compliant',
          poor: 'Multiple violations, slow remediation',
          failing: 'Active enforcement, significant violations',
        },
      },
      {
        id: 'emissions',
        name: 'Air Emissions Performance',
        description: 'Generator emissions and air quality impact',
        maxPoints: 25,
        dataSource: 'Permit records / Self-reported',
        evaluationCriteria: {
          excellent: 'Tier 4 generators, continuous monitoring, below limits',
          good: 'Tier 4 generators, permit compliant',
          adequate: 'Tier 3+ generators, within permit limits',
          poor: 'Older generators, permit exceedances',
          failing: 'Non-compliant generators, enforcement action',
        },
      },
      {
        id: 'water-usage',
        name: 'Water Usage Efficiency',
        description: 'Water consumption and discharge practices',
        maxPoints: 25,
        dataSource: 'Utility records / Self-reported WUE',
        evaluationCriteria: {
          excellent: 'WUE < 0.5, closed loop, zero discharge',
          good: 'WUE < 1.0, water recycling programs',
          adequate: 'WUE < 1.5, standard cooling',
          poor: 'WUE > 1.5, no efficiency measures',
          failing: 'Excessive consumption, discharge violations',
        },
      },
      {
        id: 'renewable-energy',
        name: 'Renewable Energy Commitment',
        description: 'Percentage of energy from renewable sources',
        maxPoints: 25,
        dataSource: 'PPA records / Self-reported',
        evaluationCriteria: {
          excellent: '100% renewable, 24/7 CFE matching',
          good: '100% renewable annual matching',
          adequate: '50%+ renewable commitment',
          poor: 'Less than 50% renewable',
          failing: 'No renewable commitment, all grid power',
        },
      },
    ],
  },
  {
    category: 'safety',
    name: 'Safety Performance',
    weight: 0.20,
    indicators: [
      {
        id: 'osha-violations',
        name: 'OSHA Violation History',
        description: 'History of workplace safety violations',
        maxPoints: 25,
        dataSource: 'OSHA inspection database',
        evaluationCriteria: {
          excellent: 'VPP Star site, no violations 5+ years',
          good: 'No serious violations, minor items addressed',
          adequate: 'Some violations, all abated',
          poor: 'Repeat violations, willful citations',
          failing: 'Active enforcement, fatalities',
        },
      },
      {
        id: 'incident-rate',
        name: 'Total Recordable Incident Rate',
        description: 'Worker injury and illness rate',
        maxPoints: 25,
        dataSource: 'OSHA 300 logs / Self-reported',
        evaluationCriteria: {
          excellent: 'TRIR < 0.5 (well below industry average)',
          good: 'TRIR < 1.0',
          adequate: 'TRIR < 2.0 (industry average)',
          poor: 'TRIR 2.0-4.0',
          failing: 'TRIR > 4.0 or fatalities',
        },
      },
      {
        id: 'safety-programs',
        name: 'Safety Management Programs',
        description: 'Formal safety programs and certifications',
        maxPoints: 25,
        dataSource: 'Certification records / Self-reported',
        evaluationCriteria: {
          excellent: 'ISO 45001 certified, behavioral safety program',
          good: 'Formal safety management system, training programs',
          adequate: 'Basic safety program, meets OSHA requirements',
          poor: 'Minimal safety program, reactive approach',
          failing: 'No formal safety program',
        },
      },
      {
        id: 'contractor-safety',
        name: 'Contractor Safety Oversight',
        description: 'Safety requirements and oversight for contractors',
        maxPoints: 25,
        dataSource: 'Contractor prequalification records',
        evaluationCriteria: {
          excellent: 'ISNetworld/Avetta verified, OSHA 10/30 required',
          good: 'Contractor safety prequalification program',
          adequate: 'Basic contractor safety requirements',
          poor: 'Minimal contractor oversight',
          failing: 'No contractor safety program',
        },
      },
    ],
  },
  {
    category: 'financial',
    name: 'Financial Accountability',
    weight: 0.15,
    indicators: [
      {
        id: 'subsidy-compliance',
        name: 'Subsidy Compliance',
        description: 'Meeting job/investment commitments from incentive deals',
        maxPoints: 50,
        dataSource: 'Good Jobs First / State audit reports',
        evaluationCriteria: {
          excellent: 'Exceeds commitments, proactive reporting',
          good: 'Meets all commitments',
          adequate: '90%+ of commitments met',
          poor: 'Significant shortfalls, remediation in progress',
          failing: 'Major shortfalls, clawback proceedings',
        },
      },
      {
        id: 'tax-payment',
        name: 'Tax Payment Record',
        description: 'History of tax payments and disputes',
        maxPoints: 50,
        dataSource: 'Public records / SEC filings',
        evaluationCriteria: {
          excellent: 'Timely payments, no disputes, transparent reporting',
          good: 'Generally compliant, minor adjustments',
          adequate: 'Standard compliance, some negotiated settlements',
          poor: 'Tax disputes, aggressive minimization',
          failing: 'Active tax enforcement, fraud allegations',
        },
      },
    ],
  },
  {
    category: 'transparency',
    name: 'Transparency & Reporting',
    weight: 0.10,
    indicators: [
      {
        id: 'public-disclosure',
        name: 'Public Disclosure Practices',
        description: 'Availability of facility and compliance information',
        maxPoints: 50,
        dataSource: 'Website / Public records',
        evaluationCriteria: {
          excellent: 'Real-time public dashboards, proactive disclosure',
          good: 'Annual sustainability report, responsive to inquiries',
          adequate: 'Basic required disclosures',
          poor: 'Minimal disclosure, slow to respond',
          failing: 'Refuses disclosure, non-responsive',
        },
      },
      {
        id: 'community-engagement',
        name: 'Community Engagement',
        description: 'Quality of engagement with local community',
        maxPoints: 50,
        dataSource: 'Community surveys / Meeting records',
        evaluationCriteria: {
          excellent: 'Active community partnerships, CBA in place',
          good: 'Regular community meetings, responsive to concerns',
          adequate: 'Basic engagement, attends required meetings',
          poor: 'Minimal engagement, avoids community interaction',
          failing: 'Hostile relationship, legal disputes with community',
        },
      },
    ],
  },
  {
    category: 'community',
    name: 'Community Impact',
    weight: 0.10,
    indicators: [
      {
        id: 'local-hiring',
        name: 'Local Hiring Performance',
        description: 'Percentage of local community hiring',
        maxPoints: 50,
        dataSource: 'Self-reported / Audit',
        evaluationCriteria: {
          excellent: '50%+ local hire, workforce development partnerships',
          good: '30-50% local hire',
          adequate: '15-30% local hire',
          poor: 'Less than 15% local hire',
          failing: 'Minimal local hiring, no local investment',
        },
      },
      {
        id: 'community-investment',
        name: 'Community Investment',
        description: 'Direct community investment and support',
        maxPoints: 50,
        dataSource: 'Self-reported / Tax records',
        evaluationCriteria: {
          excellent: 'Significant community fund, active programs',
          good: 'Regular community donations, sponsorships',
          adequate: 'Some community support',
          poor: 'Minimal community investment',
          failing: 'No community investment, negative impacts unaddressed',
        },
      },
    ],
  },
];

// =============================================================================
// SCORING FUNCTIONS
// =============================================================================

/**
 * Convert score to class
 */
export function scoreToClass(score: number): ComplianceClass {
  if (score >= 95) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 75) return 'B+';
  if (score >= 65) return 'B';
  if (score >= 50) return 'C';
  if (score >= 35) return 'D';
  return 'F';
}

/**
 * Get class color
 */
export function getClassColor(complianceClass: ComplianceClass): string {
  const colors: Record<ComplianceClass, string> = {
    'A+': '#22c55e',  // Green
    'A': '#4ade80',
    'B+': '#84cc16',
    'B': '#facc15',   // Yellow
    'C': '#f97316',   // Orange
    'D': '#ef4444',   // Red
    'F': '#dc2626',   // Dark Red
  };
  return colors[complianceClass];
}

/**
 * Calculate insurance premium multiplier
 */
export function calculatePremiumMultiplier(complianceClass: ComplianceClass): number {
  const multipliers: Record<ComplianceClass, number> = {
    'A+': 0.70,  // 30% discount
    'A': 0.85,   // 15% discount
    'B+': 0.95,  // 5% discount
    'B': 1.00,   // Standard
    'C': 1.25,   // 25% premium
    'D': 1.75,   // 75% premium
    'F': 2.50,   // 150% premium (if insurable)
  };
  return multipliers[complianceClass];
}

/**
 * Determine insurability risk
 */
export function determineInsurabilityRisk(
  complianceClass: ComplianceClass,
  categoryScores: ComplianceScore['categoryScores']
): ComplianceScore['insuranceImpact']['insurabilityRisk'] {
  // Check for any failing category
  const hasFailingCategory = Object.values(categoryScores).some(c => c.class === 'F');
  if (hasFailingCategory) return 'uninsurable';
  
  // Check for multiple poor categories
  const poorCategories = Object.values(categoryScores).filter(c => c.class === 'D' || c.class === 'F');
  if (poorCategories.length >= 2) return 'high';
  
  if (complianceClass === 'D' || complianceClass === 'F') return 'high';
  if (complianceClass === 'C') return 'elevated';
  
  return 'standard';
}

/**
 * Calculate compliance score for a facility
 */
export function calculateComplianceScore(
  facilityId: number,
  facilityName: string,
  operator: string,
  categoryData: Partial<Record<RiskCategory, {
    score: number;
    issues: string[];
    positives: string[];
  }>>
): ComplianceScore {
  const categoryScores: ComplianceScore['categoryScores'] = {} as ComplianceScore['categoryScores'];
  let totalWeightedScore = 0;
  let totalWeight = 0;
  const dataSources: string[] = [];
  
  for (const criteria of CLASSIFICATION_CRITERIA) {
    const data = categoryData[criteria.category];
    const score = data?.score ?? 50; // Default to 50 if no data
    const categoryClass = scoreToClass(score);
    
    categoryScores[criteria.category] = {
      score,
      class: categoryClass,
      issues: data?.issues || [],
      positives: data?.positives || [],
    };
    
    totalWeightedScore += score * criteria.weight;
    totalWeight += criteria.weight;
    
    criteria.indicators.forEach(ind => {
      if (!dataSources.includes(ind.dataSource)) {
        dataSources.push(ind.dataSource);
      }
    });
  }
  
  const overallScore = totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 50;
  const overallClass = scoreToClass(overallScore);
  const insurabilityRisk = determineInsurabilityRisk(overallClass, categoryScores);
  
  return {
    facilityId,
    facilityName,
    operator,
    overallClass,
    overallScore,
    confidenceLevel: Object.keys(categoryData).length / CLASSIFICATION_CRITERIA.length * 100,
    categoryScores,
    trend: 'stable',
    insuranceImpact: {
      premiumMultiplier: calculatePremiumMultiplier(overallClass),
      insurabilityRisk,
      recommendedCoverage: getRecommendedCoverage(categoryScores),
      exclusions: getExclusions(categoryScores),
    },
    verificationLevel: Object.keys(categoryData).length >= 4 ? 'verified' : 
                       Object.keys(categoryData).length >= 2 ? 'self-reported' : 'estimated',
    calculatedAt: new Date().toISOString(),
    dataSourcesUsed: dataSources,
  };
}

/**
 * Get recommended insurance coverage based on scores
 */
function getRecommendedCoverage(categoryScores: ComplianceScore['categoryScores']): string[] {
  const coverage: string[] = ['General Liability', 'Property'];
  
  if (categoryScores.environmental?.class === 'C' || 
      categoryScores.environmental?.class === 'D' ||
      categoryScores.environmental?.class === 'F') {
    coverage.push('Environmental Liability');
  }
  
  if (categoryScores.labor?.class === 'C' || 
      categoryScores.labor?.class === 'D' ||
      categoryScores.labor?.class === 'F') {
    coverage.push('Employment Practices Liability');
  }
  
  if (categoryScores.safety?.class === 'C' || 
      categoryScores.safety?.class === 'D' ||
      categoryScores.safety?.class === 'F') {
    coverage.push('Workers Compensation Enhancement');
  }
  
  coverage.push('Cyber Liability');
  coverage.push('Business Interruption');
  
  return coverage;
}

/**
 * Get coverage exclusions based on scores
 */
function getExclusions(categoryScores: ComplianceScore['categoryScores']): string[] {
  const exclusions: string[] = [];
  
  if (categoryScores.environmental?.class === 'D' || categoryScores.environmental?.class === 'F') {
    exclusions.push('Pre-existing pollution conditions');
  }
  
  if (categoryScores.labor?.class === 'D' || categoryScores.labor?.class === 'F') {
    exclusions.push('Known labor disputes');
  }
  
  if (categoryScores.safety?.class === 'D' || categoryScores.safety?.class === 'F') {
    exclusions.push('Claims arising from uncorrected safety violations');
  }
  
  return exclusions;
}

// =============================================================================
// MUTUAL RISK POOL MODEL
// =============================================================================

export const SAMPLE_MUTUAL_POOL: MutualRiskPool = {
  id: 'dc-mutual-1',
  name: 'Data Center Operators Mutual',
  description: 'Mutual insurance pool for compliant data center operators, inspired by maritime P&I clubs',
  memberCount: 150,
  totalCoverage: 5000000000, // $5B
  pooledPremiums: 75000000,  // $75M annual
  claimsReserve: 250000000,  // $250M
  memberRequirements: [
    'Minimum B class compliance rating',
    'Annual third-party audit',
    'Participation in safety sharing program',
    'Implementation of standard CBA provisions',
    'Contribution to mutual defense fund',
  ],
  benefitTiers: [
    { class: 'A+', premiumRate: 0.005, coverageLimit: 100000000, deductible: 100000 },
    { class: 'A', premiumRate: 0.007, coverageLimit: 75000000, deductible: 250000 },
    { class: 'B+', premiumRate: 0.010, coverageLimit: 50000000, deductible: 500000 },
    { class: 'B', premiumRate: 0.015, coverageLimit: 25000000, deductible: 1000000 },
    { class: 'C', premiumRate: 0.025, coverageLimit: 10000000, deductible: 2500000 },
    { class: 'D', premiumRate: 0.050, coverageLimit: 5000000, deductible: 5000000 },
    { class: 'F', premiumRate: 0, coverageLimit: 0, deductible: 0 }, // Not eligible
  ],
};

/**
 * Calculate mutual pool membership cost
 */
export function calculateMutualPoolCost(
  complianceClass: ComplianceClass,
  facilityValue: number
): { eligible: boolean; annualPremium: number; coverageLimit: number; deductible: number } {
  const tier = SAMPLE_MUTUAL_POOL.benefitTiers.find(t => t.class === complianceClass);
  
  if (!tier || tier.premiumRate === 0) {
    return { eligible: false, annualPremium: 0, coverageLimit: 0, deductible: 0 };
  }
  
  return {
    eligible: true,
    annualPremium: facilityValue * tier.premiumRate,
    coverageLimit: tier.coverageLimit,
    deductible: tier.deductible,
  };
}

/**
 * Get class description
 */
export function getClassDescription(complianceClass: ComplianceClass): string {
  const descriptions: Record<ComplianceClass, string> = {
    'A+': 'Exemplary - Industry leader in all compliance areas',
    'A': 'Excellent - Full compliance with best practices',
    'B+': 'Good - Minor issues with proactive remediation',
    'B': 'Adequate - Meets requirements with some gaps',
    'C': 'Marginal - Multiple compliance gaps requiring attention',
    'D': 'Poor - Significant violations, remediation required',
    'F': 'Failing - Critical violations, enforcement pending',
  };
  return descriptions[complianceClass];
}

/**
 * Generate improvement recommendations
 */
export function getImprovementRecommendations(
  complianceScore: ComplianceScore
): Array<{ priority: 'critical' | 'high' | 'medium'; category: RiskCategory; action: string }> {
  const recommendations: Array<{ priority: 'critical' | 'high' | 'medium'; category: RiskCategory; action: string }> = [];
  
  for (const [category, data] of Object.entries(complianceScore.categoryScores)) {
    if (data.class === 'F') {
      recommendations.push({
        priority: 'critical',
        category: category as RiskCategory,
        action: `Immediate remediation required in ${category}. Current issues: ${data.issues.join(', ')}`,
      });
    } else if (data.class === 'D') {
      recommendations.push({
        priority: 'high',
        category: category as RiskCategory,
        action: `Significant improvement needed in ${category}. Address: ${data.issues.join(', ')}`,
      });
    } else if (data.class === 'C') {
      recommendations.push({
        priority: 'medium',
        category: category as RiskCategory,
        action: `Attention needed in ${category}. Consider: ${data.issues.join(', ')}`,
      });
    }
  }
  
  return recommendations.sort((a, b) => {
    const priorityOrder = { critical: 0, high: 1, medium: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

