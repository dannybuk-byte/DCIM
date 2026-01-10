/**
 * Union Density Heatmap Service
 * 
 * Map union presence by facility for organizing intelligence.
 * Identify gaps and opportunities for worker organizing.
 */

// === Types ===

export interface UnionPresence {
  facilityId: string;
  facilityName: string;
  operator: string;
  location: {
    city: string;
    state: string;
    coordinates?: { lat: number; lng: number };
  };
  
  // Construction unions
  constructionUnion: {
    ibewLocal?: string;
    ibewStatus: UnionStatus;
    otherTrades?: string[];
    projectLaborAgreement: boolean;
  };
  
  // Operations workforce
  operationsUnion: {
    unionName?: string;
    status: UnionStatus;
    bargainingUnit?: string;
    contractExpiration?: Date;
  };
  
  // Worker counts
  workerCounts: {
    constructionWorkers?: number;
    operationsWorkers?: number;
    contractWorkers?: number;
    totalWorkers?: number;
  };
  
  // Organizing info
  organizing: {
    activeOrganizing: boolean;
    organizingStatus?: OrganizingStatus;
    leadUnion?: string;
    contactInfo?: string;
    lastActivity?: Date;
  };
  
  // Scoring
  organizingPotential: number; // 0-100
  factors: OrganizingFactor[];
}

export type UnionStatus = 
  | 'fully-union'
  | 'partially-union'
  | 'non-union'
  | 'unknown'
  | 'recently-organized'
  | 'in-organizing-drive';

export type OrganizingStatus =
  | 'no-activity'
  | 'early-conversations'
  | 'card-signing'
  | 'petition-filed'
  | 'election-scheduled'
  | 'election-won'
  | 'first-contract-negotiations'
  | 'contract-in-place';

export interface OrganizingFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  description: string;
}

export interface IBEWLocal {
  localNumber: string;
  name: string;
  jurisdiction: string[];
  city: string;
  state: string;
  memberCount?: number;
  dataCenterExperience: boolean;
  contacts?: { name: string; role: string; email?: string }[];
  website?: string;
  notes?: string;
}

export interface Corridor {
  id: string;
  name: string;
  states: string[];
  cities: string[];
  facilityCount: number;
  totalWorkers: number;
  unionDensity: number;
  ibewLocals: string[];
  primaryOperators: string[];
  organizingPriority: 'high' | 'medium' | 'low';
  notes: string;
}

// === IBEW Locals Database ===

export const IBEW_LOCALS: IBEWLocal[] = [
  {
    localNumber: '26',
    name: 'IBEW Local 26',
    jurisdiction: ['Northern Virginia', 'Washington D.C.'],
    city: 'Lanham',
    state: 'Maryland',
    memberCount: 14700,
    dataCenterExperience: true,
    website: 'https://www.ibewlocal26.org/',
    notes: 'Largest data center electrical workforce in US. 80%+ of VA post-COVID data center investment.',
  },
  {
    localNumber: '24',
    name: 'IBEW Local 24',
    jurisdiction: ['Maryland'],
    city: 'Baltimore',
    state: 'Maryland',
    memberCount: 3500,
    dataCenterExperience: true,
    website: 'https://www.ibewlocal24.org/',
    notes: 'Google.org partnership for 100,000 worker training. $49.50-59.50/hr data center rates.',
  },
  {
    localNumber: '134',
    name: 'IBEW Local 134',
    jurisdiction: ['Chicago Metro', 'Northern Illinois'],
    city: 'Chicago',
    state: 'Illinois',
    memberCount: 12000,
    dataCenterExperience: true,
    notes: 'Major presence in Chicago data center market.',
  },
  {
    localNumber: '46',
    name: 'IBEW Local 46',
    jurisdiction: ['Western Washington', 'Seattle Metro'],
    city: 'Seattle',
    state: 'Washington',
    memberCount: 8000,
    dataCenterExperience: true,
    notes: 'Handles Microsoft/Amazon data centers in Quincy region.',
  },
  {
    localNumber: '11',
    name: 'IBEW Local 11',
    jurisdiction: ['Los Angeles County'],
    city: 'Los Angeles',
    state: 'California',
    memberCount: 9500,
    dataCenterExperience: true,
    notes: 'Major California market. Meta, Google projects.',
  },
  {
    localNumber: '48',
    name: 'IBEW Local 48',
    jurisdiction: ['Portland Metro', 'Northern Oregon'],
    city: 'Portland',
    state: 'Oregon',
    memberCount: 4500,
    dataCenterExperience: true,
    notes: 'Handles Prineville data center work.',
  },
  {
    localNumber: '357',
    name: 'IBEW Local 357',
    jurisdiction: ['Southern Nevada', 'Las Vegas'],
    city: 'Las Vegas',
    state: 'Nevada',
    memberCount: 4800,
    dataCenterExperience: true,
    notes: 'Switch data center work. Growing market.',
  },
  {
    localNumber: '569',
    name: 'IBEW Local 569',
    jurisdiction: ['San Diego County'],
    city: 'San Diego',
    state: 'California',
    memberCount: 3200,
    dataCenterExperience: false,
    notes: 'Limited data center presence.',
  },
  {
    localNumber: '212',
    name: 'IBEW Local 212',
    jurisdiction: ['Cincinnati Metro', 'Southwest Ohio'],
    city: 'Cincinnati',
    state: 'Ohio',
    memberCount: 2800,
    dataCenterExperience: true,
    notes: 'Growing Columbus corridor work.',
  },
  {
    localNumber: '20',
    name: 'IBEW Local 20',
    jurisdiction: ['Dallas-Fort Worth', 'North Texas'],
    city: 'Dallas',
    state: 'Texas',
    memberCount: 5500,
    dataCenterExperience: true,
    notes: 'Major Texas data center market. Open shop competition.',
  },
];

// === Data Center Corridors ===

export const DATA_CENTER_CORRIDORS: Corridor[] = [
  {
    id: 'nova',
    name: 'Northern Virginia (Data Center Alley)',
    states: ['Virginia'],
    cities: ['Ashburn', 'Sterling', 'Manassas', 'Prince William County'],
    facilityCount: 300,
    totalWorkers: 25000,
    unionDensity: 78,
    ibewLocals: ['26'],
    primaryOperators: ['AWS', 'Microsoft', 'Google', 'Meta', 'Equinix', 'Digital Realty'],
    organizingPriority: 'medium', // Already high union density
    notes: 'Largest data center market globally. IBEW Local 26 dominates construction.',
  },
  {
    id: 'dallas',
    name: 'Dallas-Fort Worth',
    states: ['Texas'],
    cities: ['Dallas', 'Fort Worth', 'Irving', 'Plano', 'Richardson'],
    facilityCount: 150,
    totalWorkers: 12000,
    unionDensity: 35,
    ibewLocals: ['20'],
    primaryOperators: ['AWS', 'Microsoft', 'Google', 'Meta', 'CyrusOne'],
    organizingPriority: 'high',
    notes: 'Fast-growing market with open shop competition. Key organizing target.',
  },
  {
    id: 'phoenix',
    name: 'Phoenix Metro',
    states: ['Arizona'],
    cities: ['Phoenix', 'Mesa', 'Chandler', 'Goodyear'],
    facilityCount: 80,
    totalWorkers: 8000,
    unionDensity: 25,
    ibewLocals: ['640'],
    primaryOperators: ['Apple', 'Microsoft', 'CyrusOne', 'QTS'],
    organizingPriority: 'high',
    notes: 'Rapidly expanding market. Apple Mesa is largest single facility.',
  },
  {
    id: 'columbus',
    name: 'Columbus (Ohio)',
    states: ['Ohio'],
    cities: ['Columbus', 'New Albany', 'Dublin', 'Westerville'],
    facilityCount: 60,
    totalWorkers: 6000,
    unionDensity: 45,
    ibewLocals: ['683', '212'],
    primaryOperators: ['AWS', 'Meta', 'Google', 'Microsoft'],
    organizingPriority: 'medium',
    notes: 'Growing corridor with improving union density.',
  },
  {
    id: 'atlanta',
    name: 'Atlanta Metro',
    states: ['Georgia'],
    cities: ['Atlanta', 'Douglasville', 'Lithia Springs', 'College Park'],
    facilityCount: 50,
    totalWorkers: 5000,
    unionDensity: 20,
    ibewLocals: ['613'],
    primaryOperators: ['Switch', 'QTS', 'Equinix'],
    organizingPriority: 'high',
    notes: 'Right-to-work state with low union density. Switch has significant presence.',
  },
];

// === Storage ===

import { db } from '../db/database';

export async function saveUnionPresence(presence: UnionPresence): Promise<void> {
  await db.table('unionPresence').put(presence);
}

export async function getUnionPresenceData(): Promise<UnionPresence[]> {
  try {
    return await db.table('unionPresence').toArray();
  } catch {
    return [];
  }
}

export async function getUnionPresenceByState(state: string): Promise<UnionPresence[]> {
  const data = await getUnionPresenceData();
  return data.filter(p => p.location.state.toLowerCase() === state.toLowerCase());
}

// === Organizing Potential Calculation ===

export function calculateOrganizingPotential(
  facilityData: Partial<UnionPresence>
): { score: number; factors: OrganizingFactor[] } {
  const factors: OrganizingFactor[] = [];
  let score = 50; // Start at neutral
  
  // Factor 1: Non-union with significant workforce
  if (facilityData.operationsUnion?.status === 'non-union') {
    if ((facilityData.workerCounts?.totalWorkers || 0) > 100) {
      factors.push({
        factor: 'Large non-union workforce',
        impact: 'positive',
        weight: 20,
        description: `${facilityData.workerCounts?.totalWorkers} workers without union representation`,
      });
      score += 20;
    }
  }
  
  // Factor 2: Union construction, non-union operations
  if (facilityData.constructionUnion?.ibewStatus === 'fully-union' && 
      facilityData.operationsUnion?.status === 'non-union') {
    factors.push({
      factor: 'Union-built, non-union operated',
      impact: 'positive',
      weight: 15,
      description: 'IBEW built the facility but operations workers are not organized',
    });
    score += 15;
  }
  
  // Factor 3: Contract/temp worker concentration
  if (facilityData.workerCounts?.contractWorkers) {
    const contractRatio = facilityData.workerCounts.contractWorkers / (facilityData.workerCounts.totalWorkers || 1);
    if (contractRatio > 0.3) {
      factors.push({
        factor: 'High contract worker ratio',
        impact: 'positive',
        weight: 15,
        description: `${Math.round(contractRatio * 100)}% contract/temp workers - potential organizing target`,
      });
      score += 15;
    }
  }
  
  // Factor 4: Geographic union strength
  const ibewLocal = IBEW_LOCALS.find(l => 
    l.jurisdiction.some(j => 
      j.toLowerCase().includes(facilityData.location?.state?.toLowerCase() || '')
    )
  );
  if (ibewLocal && ibewLocal.dataCenterExperience) {
    factors.push({
      factor: 'Strong IBEW presence in area',
      impact: 'positive',
      weight: 10,
      description: `IBEW Local ${ibewLocal.localNumber} has data center experience`,
    });
    score += 10;
  }
  
  // Factor 5: Major operator (more resources for organizing)
  const majorOperators = ['Amazon Web Services', 'Microsoft', 'Google', 'Meta', 'Apple'];
  if (majorOperators.some(op => facilityData.operator?.includes(op))) {
    factors.push({
      factor: 'Major tech operator',
      impact: 'positive',
      weight: 10,
      description: 'Major operator with resources - winning here sends message',
    });
    score += 10;
  }
  
  // Factor 6: Active organizing (big positive)
  if (facilityData.organizing?.activeOrganizing) {
    factors.push({
      factor: 'Active organizing campaign',
      impact: 'positive',
      weight: 20,
      description: 'Workers are already organizing',
    });
    score += 20;
  }
  
  // Factor 7: Right-to-work state (negative)
  const rightToWorkStates = [
    'Alabama', 'Arizona', 'Arkansas', 'Florida', 'Georgia', 'Idaho', 'Indiana', 'Iowa',
    'Kansas', 'Kentucky', 'Louisiana', 'Michigan', 'Mississippi', 'Nebraska', 'Nevada',
    'North Carolina', 'North Dakota', 'Oklahoma', 'South Carolina', 'South Dakota',
    'Tennessee', 'Texas', 'Utah', 'Virginia', 'West Virginia', 'Wisconsin', 'Wyoming'
  ];
  if (rightToWorkStates.includes(facilityData.location?.state || '')) {
    factors.push({
      factor: 'Right-to-work state',
      impact: 'negative',
      weight: -10,
      description: 'State laws make organizing more difficult',
    });
    score -= 10;
  }
  
  return {
    score: Math.max(0, Math.min(100, score)),
    factors,
  };
}

// === Analytics ===

export async function getCorridorStats(): Promise<{
  corridors: Corridor[];
  totalFacilities: number;
  totalWorkers: number;
  avgUnionDensity: number;
  highPriorityCount: number;
}> {
  const corridors = DATA_CENTER_CORRIDORS;
  
  const totalFacilities = corridors.reduce((sum, c) => sum + c.facilityCount, 0);
  const totalWorkers = corridors.reduce((sum, c) => sum + c.totalWorkers, 0);
  const avgUnionDensity = corridors.reduce((sum, c) => sum + c.unionDensity, 0) / corridors.length;
  const highPriorityCount = corridors.filter(c => c.organizingPriority === 'high').length;
  
  return {
    corridors,
    totalFacilities,
    totalWorkers,
    avgUnionDensity: Math.round(avgUnionDensity),
    highPriorityCount,
  };
}

export function getIBEWLocalForLocation(state: string, city?: string): IBEWLocal | undefined {
  // First try to match by city
  if (city) {
    const byCity = IBEW_LOCALS.find(l => 
      l.jurisdiction.some(j => j.toLowerCase().includes(city.toLowerCase()))
    );
    if (byCity) return byCity;
  }
  
  // Then try by state
  return IBEW_LOCALS.find(l => 
    l.state.toLowerCase() === state.toLowerCase() ||
    l.jurisdiction.some(j => j.toLowerCase().includes(state.toLowerCase()))
  );
}

// === Organizing Intelligence ===

export interface OrganizingTarget {
  facilityId: string;
  facilityName: string;
  operator: string;
  location: { city: string; state: string };
  workerCount: number;
  organizingScore: number;
  keyFactors: string[];
  suggestedUnion: string;
  suggestedApproach: string;
  urgency: 'high' | 'medium' | 'low';
}

export async function identifyOrganizingTargets(): Promise<OrganizingTarget[]> {
  // In production, this would analyze all facilities
  // For now, return strategic targets based on corridor data
  
  const targets: OrganizingTarget[] = [
    {
      facilityId: 'target-1',
      facilityName: 'AWS Dallas Expansion',
      operator: 'Amazon Web Services',
      location: { city: 'Irving', state: 'Texas' },
      workerCount: 450,
      organizingScore: 75,
      keyFactors: [
        'Large workforce in growing market',
        'Non-union operations in union-built facility',
        'High contract worker ratio',
      ],
      suggestedUnion: 'IBEW Local 20 + CWA',
      suggestedApproach: 'Joint campaign with construction and tech worker unions',
      urgency: 'high',
    },
    {
      facilityId: 'target-2',
      facilityName: 'Meta Phoenix',
      operator: 'Meta',
      location: { city: 'Mesa', state: 'Arizona' },
      workerCount: 380,
      organizingScore: 70,
      keyFactors: [
        'Rapid expansion creates organizing window',
        'Contractor abuse reports',
        'CWA has organized other Meta workers',
      ],
      suggestedUnion: 'CWA Local 7019',
      suggestedApproach: 'Connect with CWA Alphabet Workers Union for support',
      urgency: 'medium',
    },
    {
      facilityId: 'target-3',
      facilityName: 'Switch Atlanta Campus',
      operator: 'Switch',
      location: { city: 'Douglasville', state: 'Georgia' },
      workerCount: 280,
      organizingScore: 65,
      keyFactors: [
        'Low union density in area',
        'Multiple facilities enable broader campaign',
        'Growing operator with expansion plans',
      ],
      suggestedUnion: 'IBEW Local 613',
      suggestedApproach: 'Start with construction workforce, then operations',
      urgency: 'medium',
    },
  ];
  
  return targets.sort((a, b) => b.organizingScore - a.organizingScore);
}

