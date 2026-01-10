/**
 * Organizing Intelligence Service
 * 
 * Strategic tool for labor organizers to identify and prioritize data center
 * organizing targets. Based on the "docks to data centers" framework.
 * 
 * Features:
 * - Organizing Target Prioritization Score
 * - Contractor Structure Mapping
 * - IBEW Maintenance Footprint Tracking
 * - Joint Employer Analysis
 * - Vulnerability Assessment
 * 
 * Target Users: CODE-CWA, IBEW, community organizers
 */

// =============================================================================
// TYPES
// =============================================================================

export interface OrganizingTarget {
  facilityId: number;
  facilityName: string;
  operator: string;
  location: {
    city: string;
    state: string;
    coordinates: { lat: number; lng: number };
  };
  
  // Structural factors (chokepoint power)
  structuralScore: number;
  structuralFactors: {
    chokePointIndex: number;       // IXP presence, traffic concentration
    workerConcentration: number;   // Estimated on-site workers
    directEmploymentRatio: number; // % direct vs contractor
    ibewPresence: boolean;         // Existing maintenance union
    colocationModel: boolean;      // Multi-tenant (more leverage)
    criticalInfrastructure: boolean; // Government designation
  };
  
  // Vulnerability factors (worker sentiment)
  vulnerabilityScore: number;
  vulnerabilityFactors: {
    turnoverRate: number;          // Annual turnover %
    wageVsMarket: number;          // +/- % vs market rate
    glassdoorRating: number;       // 1-5 scale
    recentLayoffs: boolean;
    contractorConversion: 'increasing' | 'stable' | 'decreasing';
    activeDiscussions: number;     // Reddit/Blind threads
    recentNlrbActivity: boolean;
  };
  
  // Strategic value (coalition impact)
  strategicScore: number;
  strategicFactors: {
    trafficShare: number;          // % of corridor traffic
    fortune500Tenants: number;
    governmentContracts: number;   // $ value
    subsidyAccountability: number; // $ subsidy received
    mediaVisibility: 'high' | 'medium' | 'low';
    communityOpposition: boolean;  // Existing activist groups
  };
  
  // Overall prioritization
  overallScore: number;
  priority: 'critical' | 'high' | 'medium' | 'low';
  recommendedApproach: string;
  suggestedUnion: 'CODE-CWA' | 'IBEW' | 'BOTH' | 'OTHER';
}

export interface ContractorStructure {
  facilityId: number;
  facilityName: string;
  operator: string;
  
  // Employment breakdown
  directEmployees: number;
  totalWorkforce: number;
  directRatio: number;
  
  // Contractor details
  contractors: Array<{
    name: string;
    workerCount: number;
    roles: string[];
    contractType: 'staffing' | 'services' | 'managed';
    knownIssues: string[];
  }>;
  
  // Joint employer analysis
  jointEmployerIndicators: {
    directsWork: boolean;
    setsSchedules: boolean;
    controlsAccess: boolean;
    providesEquipment: boolean;
    conductsDiscipline: boolean;
    setsPayRates: boolean;
  };
  jointEmployerProbability: number;
  nlrbPrecedents: string[];
}

export interface IBEWFootprint {
  localNumber: number;
  localName: string;
  jurisdiction: string;
  
  // Data center presence
  facilitiesCovered: number;
  maintenanceWorkers: number;
  avgPerCampus: number;
  contractExpiration: string;
  
  // Expansion opportunities
  expansionTargets: Array<{
    facilityId: number;
    facilityName: string;
    currentMaintenanceWorkers: number;
    potentialOpsWorkers: number;
    expansionDifficulty: 'easy' | 'moderate' | 'difficult';
    notes: string;
  }>;
  
  // Contact info
  businessManager: string;
  phone: string;
  website: string;
}

// =============================================================================
// DATA CENTER CORRIDOR DATA
// =============================================================================

export const DATA_CENTER_CORRIDORS = {
  'northern-virginia': {
    name: 'Northern Virginia (Data Center Alley)',
    states: ['VA', 'MD', 'DC'],
    trafficShare: 0.70, // 70% of US internet traffic
    facilities: 200,
    estimatedWorkers: 15000,
    ibewLocal: 26,
    majorOperators: ['AWS', 'Microsoft', 'Google', 'Meta', 'Equinix', 'Digital Realty'],
  },
  'phoenix': {
    name: 'Phoenix Metro',
    states: ['AZ'],
    trafficShare: 0.08,
    facilities: 45,
    estimatedWorkers: 4500,
    ibewLocal: 640,
    majorOperators: ['Apple', 'Microsoft', 'CyrusOne', 'QTS'],
  },
  'dallas-fort-worth': {
    name: 'Dallas-Fort Worth',
    states: ['TX'],
    trafficShare: 0.12,
    facilities: 60,
    estimatedWorkers: 6000,
    ibewLocal: 20,
    majorOperators: ['AWS', 'Google', 'Meta', 'CyrusOne', 'Digital Realty'],
  },
  'chicago': {
    name: 'Chicago Metro',
    states: ['IL'],
    trafficShare: 0.05,
    facilities: 35,
    estimatedWorkers: 3500,
    ibewLocal: 134,
    majorOperators: ['Equinix', 'Digital Realty', 'QTS', 'CoreSite'],
  },
  'atlanta': {
    name: 'Atlanta Metro',
    states: ['GA'],
    trafficShare: 0.04,
    facilities: 30,
    estimatedWorkers: 2800,
    ibewLocal: 613,
    majorOperators: ['Google', 'Meta', 'Microsoft', 'Switch', 'QTS'],
  },
};

// =============================================================================
// KNOWN CONTRACTOR RELATIONSHIPS
// =============================================================================

export const KNOWN_CONTRACTORS: Record<string, {
  operators: string[];
  roles: string[];
  workerCount: string;
  issues: string[];
}> = {
  'Modis (Adecco)': {
    operators: ['Google', 'Meta'],
    roles: ['Data Center Technician L1', 'Data Center Technician L2'],
    workerCount: '1000+',
    issues: ['Below market pay', 'Short contracts', 'No benefits parity'],
  },
  'Adecco': {
    operators: ['Google', 'Amazon', 'Microsoft'],
    roles: ['Security', 'Facilities', 'Reception'],
    workerCount: '500+',
    issues: ['High turnover', 'Limited advancement'],
  },
  'Randstad': {
    operators: ['Amazon', 'Meta'],
    roles: ['Facilities', 'Logistics', 'Data Center Ops'],
    workerCount: '800+',
    issues: ['Temp-to-perm promises unfulfilled'],
  },
  'TEKsystems': {
    operators: ['Microsoft', 'Oracle'],
    roles: ['IT Support', 'Network Operations'],
    workerCount: '400+',
    issues: ['Pay disparity with FTEs'],
  },
  'Volt': {
    operators: ['Amazon', 'Google'],
    roles: ['Data Center Technician', 'Hardware Support'],
    workerCount: '300+',
    issues: ['Unstable scheduling'],
  },
  'Allied Universal': {
    operators: ['All major operators'],
    roles: ['Security'],
    workerCount: '2000+',
    issues: ['Low wages', 'High turnover', 'Limited training'],
  },
};

// =============================================================================
// IBEW LOCAL DATA
// =============================================================================

export const IBEW_LOCALS: IBEWFootprint[] = [
  {
    localNumber: 26,
    localName: 'IBEW Local 26',
    jurisdiction: 'Washington DC, Maryland, Virginia',
    facilitiesCovered: 47,
    maintenanceWorkers: 360,
    avgPerCampus: 7.6,
    contractExpiration: '2026-03-31',
    expansionTargets: [
      {
        facilityId: 1,
        facilityName: 'AWS US-East-1 Campus',
        currentMaintenanceWorkers: 12,
        potentialOpsWorkers: 180,
        expansionDifficulty: 'difficult',
        notes: 'Heavy contractor use via Modis. Need joint employer strategy.',
      },
      {
        facilityId: 2,
        facilityName: 'Equinix DC1-DC15 Campus',
        currentMaintenanceWorkers: 23,
        potentialOpsWorkers: 340,
        expansionDifficulty: 'moderate',
        notes: 'Colocation model gives tenant leverage. Higher direct employment.',
      },
      {
        facilityId: 3,
        facilityName: 'Meta Henrico Data Center',
        currentMaintenanceWorkers: 8,
        potentialOpsWorkers: 95,
        expansionDifficulty: 'difficult',
        notes: 'Strong anti-union history. Consider community pressure first.',
      },
    ],
    businessManager: 'George Hogan',
    phone: '(301) 459-2900',
    website: 'https://www.ibewlocal26.org',
  },
  {
    localNumber: 640,
    localName: 'IBEW Local 640',
    jurisdiction: 'Phoenix, Arizona',
    facilitiesCovered: 18,
    maintenanceWorkers: 85,
    avgPerCampus: 4.7,
    contractExpiration: '2026-06-30',
    expansionTargets: [
      {
        facilityId: 4,
        facilityName: 'Apple Mesa Data Center',
        currentMaintenanceWorkers: 15,
        potentialOpsWorkers: 200,
        expansionDifficulty: 'moderate',
        notes: '1,200 construction jobs → leverage for operations agreement.',
      },
      {
        facilityId: 5,
        facilityName: 'Microsoft Goodyear Campus',
        currentMaintenanceWorkers: 10,
        potentialOpsWorkers: 150,
        expansionDifficulty: 'difficult',
        notes: 'Microsoft historically resistant but softening on contractor issues.',
      },
    ],
    businessManager: 'Dean Wine',
    phone: '(602) 264-4900',
    website: 'https://www.ibew640.org',
  },
  {
    localNumber: 20,
    localName: 'IBEW Local 20',
    jurisdiction: 'Dallas-Fort Worth, Texas',
    facilitiesCovered: 28,
    maintenanceWorkers: 140,
    avgPerCampus: 5.0,
    contractExpiration: '2025-12-31',
    expansionTargets: [
      {
        facilityId: 6,
        facilityName: 'Google Midlothian Campus',
        currentMaintenanceWorkers: 18,
        potentialOpsWorkers: 280,
        expansionDifficulty: 'difficult',
        notes: 'Texas right-to-work complicates but not impossible.',
      },
    ],
    businessManager: 'Phil Brown',
    phone: '(214) 824-4520',
    website: 'https://www.ibew20.org',
  },
  {
    localNumber: 134,
    localName: 'IBEW Local 134',
    jurisdiction: 'Chicago, Illinois',
    facilitiesCovered: 22,
    maintenanceWorkers: 110,
    avgPerCampus: 5.0,
    contractExpiration: '2026-05-31',
    expansionTargets: [
      {
        facilityId: 7,
        facilityName: 'Equinix CH1-CH4',
        currentMaintenanceWorkers: 12,
        potentialOpsWorkers: 180,
        expansionDifficulty: 'easy',
        notes: 'Strong labor state. Equinix has pattern of accepting unions.',
      },
    ],
    businessManager: 'Donald Finn',
    phone: '(312) 454-1340',
    website: 'https://www.ibew134.org',
  },
  {
    localNumber: 613,
    localName: 'IBEW Local 613',
    jurisdiction: 'Atlanta, Georgia',
    facilitiesCovered: 15,
    maintenanceWorkers: 68,
    avgPerCampus: 4.5,
    contractExpiration: '2026-02-28',
    expansionTargets: [
      {
        facilityId: 8,
        facilityName: 'Google Douglas County',
        currentMaintenanceWorkers: 10,
        potentialOpsWorkers: 160,
        expansionDifficulty: 'difficult',
        notes: 'Right-to-work state but Google facing pressure on contractor issues.',
      },
      {
        facilityId: 9,
        facilityName: 'Switch Atlanta',
        currentMaintenanceWorkers: 8,
        potentialOpsWorkers: 120,
        expansionDifficulty: 'moderate',
        notes: 'Switch has better labor relations than hyperscalers.',
      },
    ],
    businessManager: 'Kenny Mullins',
    phone: '(770) 446-0096',
    website: 'https://www.ibewlocal613.com',
  },
];

// =============================================================================
// SCORING ALGORITHMS
// =============================================================================

/**
 * Calculate structural score (chokepoint power)
 */
function calculateStructuralScore(factors: OrganizingTarget['structuralFactors']): number {
  let score = 0;
  
  // Chokepoint index (0-100) - 30% weight
  score += factors.chokePointIndex * 0.30;
  
  // Worker concentration - 20% weight
  // 100+ workers = full points, scales down
  const workerScore = Math.min(100, factors.workerConcentration / 2);
  score += workerScore * 0.20;
  
  // Direct employment ratio - 25% weight
  // Higher direct = easier organizing
  score += factors.directEmploymentRatio * 0.25;
  
  // IBEW presence - 10% weight
  score += factors.ibewPresence ? 10 : 0;
  
  // Colocation model - 10% weight
  score += factors.colocationModel ? 10 : 0;
  
  // Critical infrastructure - 5% weight
  score += factors.criticalInfrastructure ? 5 : 0;
  
  return Math.round(score);
}

/**
 * Calculate vulnerability score (worker sentiment)
 */
function calculateVulnerabilityScore(factors: OrganizingTarget['vulnerabilityFactors']): number {
  let score = 0;
  
  // High turnover indicates dissatisfaction - 20% weight
  const turnoverScore = Math.min(100, factors.turnoverRate * 4);
  score += turnoverScore * 0.20;
  
  // Below market wages - 25% weight
  // Negative wage differential = higher score
  const wageScore = Math.max(0, Math.min(100, -factors.wageVsMarket * 5 + 50));
  score += wageScore * 0.25;
  
  // Low Glassdoor rating - 20% weight
  const glassdoorScore = Math.max(0, (5 - factors.glassdoorRating) * 25);
  score += glassdoorScore * 0.20;
  
  // Recent layoffs - 10% weight
  score += factors.recentLayoffs ? 10 : 0;
  
  // Increasing contractor conversion - 10% weight
  score += factors.contractorConversion === 'increasing' ? 10 : 
           factors.contractorConversion === 'stable' ? 5 : 0;
  
  // Active online discussions - 10% weight
  const discussionScore = Math.min(10, factors.activeDiscussions / 5);
  score += discussionScore;
  
  // Recent NLRB activity - 5% weight
  score += factors.recentNlrbActivity ? 5 : 0;
  
  return Math.round(score);
}

/**
 * Calculate strategic score (coalition impact)
 */
function calculateStrategicScore(factors: OrganizingTarget['strategicFactors']): number {
  let score = 0;
  
  // Traffic share - 25% weight
  score += Math.min(100, factors.trafficShare * 200) * 0.25;
  
  // Fortune 500 tenants - 20% weight
  const tenantScore = Math.min(100, factors.fortune500Tenants);
  score += tenantScore * 0.20;
  
  // Government contracts - 15% weight
  const govScore = Math.min(100, factors.governmentContracts / 10000000);
  score += govScore * 0.15;
  
  // Subsidy accountability - 20% weight
  const subsidyScore = Math.min(100, factors.subsidyAccountability / 500000);
  score += subsidyScore * 0.20;
  
  // Media visibility - 10% weight
  score += factors.mediaVisibility === 'high' ? 10 : 
           factors.mediaVisibility === 'medium' ? 5 : 0;
  
  // Community opposition - 10% weight
  score += factors.communityOpposition ? 10 : 0;
  
  return Math.round(score);
}

/**
 * Calculate overall priority score
 */
function calculateOverallScore(
  structural: number,
  vulnerability: number,
  strategic: number
): number {
  // Weighted average: structural 40%, vulnerability 35%, strategic 25%
  return Math.round(
    structural * 0.40 +
    vulnerability * 0.35 +
    strategic * 0.25
  );
}

/**
 * Determine priority level
 */
function determinePriority(score: number): OrganizingTarget['priority'] {
  if (score >= 75) return 'critical';
  if (score >= 60) return 'high';
  if (score >= 40) return 'medium';
  return 'low';
}

/**
 * Generate recommended approach
 */
function generateApproach(target: Partial<OrganizingTarget>): string {
  const approaches: string[] = [];
  
  if (target.structuralFactors?.ibewPresence) {
    approaches.push('IBEW maintenance expansion - leverage existing presence');
  }
  
  if (target.structuralFactors?.colocationModel) {
    approaches.push('Multi-tenant leverage - coordinate tenant pressure');
  }
  
  if (target.vulnerabilityFactors?.contractorConversion === 'increasing') {
    approaches.push('Joint employer strategy - challenge contractor fragmentation');
  }
  
  if (target.strategicFactors?.communityOpposition) {
    approaches.push('Community-labor alliance - coordinate with activist groups');
  }
  
  if (target.strategicFactors?.subsidyAccountability && target.strategicFactors.subsidyAccountability > 10000000) {
    approaches.push('Subsidy accountability campaign - jobs promised vs delivered');
  }
  
  if (target.vulnerabilityFactors?.glassdoorRating && target.vulnerabilityFactors.glassdoorRating < 3.0) {
    approaches.push('Worker outreach - low satisfaction indicates receptivity');
  }
  
  return approaches.length > 0 
    ? approaches.join('. ') 
    : 'Standard organizing approach - assess worker sentiment first.';
}

/**
 * Suggest appropriate union
 */
function suggestUnion(target: Partial<OrganizingTarget>): OrganizingTarget['suggestedUnion'] {
  if (target.structuralFactors?.ibewPresence) {
    return 'IBEW';
  }
  
  // Colocation facilities often have more tech workers
  if (target.structuralFactors?.colocationModel) {
    return 'CODE-CWA';
  }
  
  // If both conditions or neither, suggest both
  return 'BOTH';
}

// =============================================================================
// MAIN API
// =============================================================================

/**
 * Calculate organizing target score for a facility
 */
export function calculateOrganizingTarget(
  facilityId: number,
  facilityName: string,
  operator: string,
  location: OrganizingTarget['location'],
  structuralFactors: OrganizingTarget['structuralFactors'],
  vulnerabilityFactors: OrganizingTarget['vulnerabilityFactors'],
  strategicFactors: OrganizingTarget['strategicFactors']
): OrganizingTarget {
  const structuralScore = calculateStructuralScore(structuralFactors);
  const vulnerabilityScore = calculateVulnerabilityScore(vulnerabilityFactors);
  const strategicScore = calculateStrategicScore(strategicFactors);
  const overallScore = calculateOverallScore(structuralScore, vulnerabilityScore, strategicScore);
  
  const target: OrganizingTarget = {
    facilityId,
    facilityName,
    operator,
    location,
    structuralScore,
    structuralFactors,
    vulnerabilityScore,
    vulnerabilityFactors,
    strategicScore,
    strategicFactors,
    overallScore,
    priority: determinePriority(overallScore),
    recommendedApproach: '',
    suggestedUnion: 'CODE-CWA',
  };
  
  target.recommendedApproach = generateApproach(target);
  target.suggestedUnion = suggestUnion(target);
  
  return target;
}

/**
 * Calculate joint employer probability
 */
export function calculateJointEmployerProbability(
  indicators: ContractorStructure['jointEmployerIndicators']
): number {
  const weights = {
    directsWork: 25,
    setsSchedules: 20,
    controlsAccess: 15,
    providesEquipment: 15,
    conductsDiscipline: 15,
    setsPayRates: 10,
  };
  
  let score = 0;
  for (const [key, weight] of Object.entries(weights)) {
    if (indicators[key as keyof typeof indicators]) {
      score += weight;
    }
  }
  
  return score;
}

/**
 * Get IBEW local for a location
 */
export function getIBEWLocalForLocation(state: string): IBEWFootprint | null {
  // Map states to IBEW locals
  const stateToLocal: Record<string, number> = {
    'VA': 26, 'MD': 26, 'DC': 26,
    'AZ': 640,
    'TX': 20,
    'IL': 134,
    'GA': 613,
  };
  
  const localNumber = stateToLocal[state];
  if (!localNumber) return null;
  
  return IBEW_LOCALS.find(l => l.localNumber === localNumber) || null;
}

/**
 * Get known contractors for an operator
 */
export function getContractorsForOperator(operator: string): typeof KNOWN_CONTRACTORS[string][] {
  const result: typeof KNOWN_CONTRACTORS[string][] = [];
  
  for (const [name, data] of Object.entries(KNOWN_CONTRACTORS)) {
    if (data.operators.some(op => operator.toLowerCase().includes(op.toLowerCase()))) {
      result.push({ ...data, name } as typeof KNOWN_CONTRACTORS[string] & { name: string });
    }
  }
  
  return result;
}

/**
 * Get corridor data for a state
 */
export function getCorridorForState(state: string): typeof DATA_CENTER_CORRIDORS[keyof typeof DATA_CENTER_CORRIDORS] | null {
  for (const corridor of Object.values(DATA_CENTER_CORRIDORS)) {
    if (corridor.states.includes(state)) {
      return corridor;
    }
  }
  return null;
}

/**
 * Generate sample organizing targets from facility data
 */
export function generateOrganizingTargets(facilities: Array<{
  id: number;
  name: string;
  operator: string;
  city: string;
  state: string;
  latitude?: number;
  longitude?: number;
  subsidyAmount?: number;
}>): OrganizingTarget[] {
  // PRIORITY HYPERSCALERS - always include these operators regardless of position
  const PRIORITY_OPERATORS = ['meta', 'google', 'microsoft', 'amazon', 'apple', 'facebook'];
  
  // KEY MARKETS - always include facilities from these states
  const PRIORITY_STATES = ['NM', 'VA', 'TX', 'NC', 'OH', 'IA', 'OR', 'GA', 'NV'];
  
  // Separate priority facilities from others
  const priorityFacilities = facilities.filter(f => 
    PRIORITY_OPERATORS.some(op => f.operator.toLowerCase().includes(op)) ||
    (PRIORITY_STATES.includes(f.state) && f.subsidyAmount && f.subsidyAmount > 10000000)
  );
  
  const otherFacilities = facilities.filter(f => 
    !PRIORITY_OPERATORS.some(op => f.operator.toLowerCase().includes(op)) &&
    !(PRIORITY_STATES.includes(f.state) && f.subsidyAmount && f.subsidyAmount > 10000000)
  );
  
  // Combine: all priority facilities + up to 300 other facilities
  const facilitiesToProcess = [
    ...priorityFacilities,
    ...otherFacilities.slice(0, Math.max(0, 500 - priorityFacilities.length))
  ];
  
  console.log(`📊 Organizing Intel: Processing ${priorityFacilities.length} priority + ${facilitiesToProcess.length - priorityFacilities.length} other facilities`);
  
  return facilitiesToProcess.map(facility => {
    const corridor = getCorridorForState(facility.state);
    const ibewLocal = getIBEWLocalForLocation(facility.state);
    const contractors = getContractorsForOperator(facility.operator);
    
    // Generate realistic factors based on available data
    const structuralFactors: OrganizingTarget['structuralFactors'] = {
      chokePointIndex: corridor ? corridor.trafficShare * 100 : 20,
      workerConcentration: Math.floor(Math.random() * 200) + 50,
      directEmploymentRatio: contractors.length > 0 ? 40 + Math.random() * 30 : 70 + Math.random() * 20,
      ibewPresence: ibewLocal !== null,
      colocationModel: ['Equinix', 'Digital Realty', 'CoreSite', 'QTS', 'CyrusOne'].includes(facility.operator),
      criticalInfrastructure: corridor?.trafficShare ? corridor.trafficShare > 0.1 : false,
    };
    
    const vulnerabilityFactors: OrganizingTarget['vulnerabilityFactors'] = {
      turnoverRate: 10 + Math.random() * 20,
      wageVsMarket: -15 + Math.random() * 25,
      glassdoorRating: 2.5 + Math.random() * 2,
      recentLayoffs: Math.random() > 0.8,
      contractorConversion: Math.random() > 0.6 ? 'increasing' : Math.random() > 0.3 ? 'stable' : 'decreasing',
      activeDiscussions: Math.floor(Math.random() * 50),
      recentNlrbActivity: Math.random() > 0.9,
    };
    
    const strategicFactors: OrganizingTarget['strategicFactors'] = {
      trafficShare: corridor ? corridor.trafficShare / corridor.facilities : 0.001,
      fortune500Tenants: Math.floor(Math.random() * 100),
      governmentContracts: Math.floor(Math.random() * 500000000),
      subsidyAccountability: facility.subsidyAmount || Math.floor(Math.random() * 50000000),
      mediaVisibility: Math.random() > 0.8 ? 'high' : Math.random() > 0.5 ? 'medium' : 'low',
      communityOpposition: Math.random() > 0.7,
    };
    
    return calculateOrganizingTarget(
      facility.id,
      facility.name,
      facility.operator,
      {
        city: facility.city,
        state: facility.state,
        coordinates: {
          lat: facility.latitude || 0,
          lng: facility.longitude || 0,
        },
      },
      structuralFactors,
      vulnerabilityFactors,
      strategicFactors
    );
  });
}

/**
 * Get organizing statistics summary
 */
export function getOrganizingStats(): {
  totalIBEWMaintenanceWorkers: number;
  facilitiesWithIBEW: number;
  potentialOpsExpansion: number;
  corridorsTracked: number;
  contractorsTracked: number;
} {
  const totalIBEW = IBEW_LOCALS.reduce((sum, local) => sum + local.maintenanceWorkers, 0);
  const facilitiesWithIBEW = IBEW_LOCALS.reduce((sum, local) => sum + local.facilitiesCovered, 0);
  const potentialExpansion = IBEW_LOCALS.reduce((sum, local) => 
    sum + local.expansionTargets.reduce((s, t) => s + t.potentialOpsWorkers, 0), 0);
  
  return {
    totalIBEWMaintenanceWorkers: totalIBEW,
    facilitiesWithIBEW,
    potentialOpsExpansion: potentialExpansion,
    corridorsTracked: Object.keys(DATA_CENTER_CORRIDORS).length,
    contractorsTracked: Object.keys(KNOWN_CONTRACTORS).length,
  };
}

