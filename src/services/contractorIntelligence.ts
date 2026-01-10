/**
 * Contractor Intelligence Network
 * 
 * Track who actually builds and staffs data centers.
 * Contractors are the weak link for organizing - identify targets.
 * 
 * Data Sources:
 * - OSHA violation database
 * - State contractor licensing
 * - Building permits
 * - IBEW contractor lists
 * - Trade publications
 */

// === Types ===

export interface Contractor {
  id: string;
  name: string;
  aliases: string[];
  type: ContractorType;
  
  // Business info
  headquarters?: {
    city: string;
    state: string;
    address?: string;
  };
  foundedYear?: number;
  employeeCount?: number;
  annualRevenue?: number;
  
  // Union status
  unionStatus: UnionStatus;
  ibewSignatory?: boolean;
  ibewLocals?: string[];
  otherUnions?: string[];
  projectLaborAgreements?: boolean;
  
  // Track record
  oshaViolations: OSHAViolation[];
  nlrbCases: NLRBCase[];
  wageClaimsCount?: number;
  
  // Facility connections
  knownProjects: ContractorProject[];
  operatorRelationships: OperatorRelationship[];
  
  // Ratings
  safetyScore?: number; // 0-100
  laborScore?: number; // 0-100
  organizingPriority: 'high' | 'medium' | 'low';
  
  // Metadata
  lastUpdated: Date;
  dataSources: string[];
}

export type ContractorType =
  | 'general-contractor'
  | 'electrical'
  | 'mechanical'
  | 'plumbing'
  | 'fire-protection'
  | 'hvac'
  | 'security-systems'
  | 'staffing-agency'
  | 'facilities-management'
  | 'construction-management'
  | 'design-build'
  | 'other';

export type UnionStatus =
  | 'fully-union'
  | 'mixed'
  | 'non-union'
  | 'unknown';

export interface OSHAViolation {
  id: string;
  inspectionNumber: string;
  inspectionDate: Date;
  violationType: 'serious' | 'willful' | 'repeat' | 'other';
  description: string;
  penalty: number;
  facilityAddress: string;
  state: string;
  status: 'open' | 'contested' | 'closed';
}

export interface NLRBCase {
  caseNumber: string;
  dateOpened: Date;
  dateClosed?: Date;
  type: 'unfair-labor-practice' | 'representation' | 'other';
  allegation: string;
  outcome?: string;
  remedyOrdered?: string;
}

export interface ContractorProject {
  facilityId?: string;
  facilityName: string;
  operator: string;
  location: { city: string; state: string };
  role: string; // e.g., "Electrical subcontractor", "General contractor"
  startDate?: Date;
  endDate?: Date;
  status: 'active' | 'completed' | 'planned';
  projectValue?: number;
  workersOnSite?: number;
}

export interface OperatorRelationship {
  operator: string;
  relationshipType: 'preferred-vendor' | 'approved-vendor' | 'one-time' | 'unknown';
  projectCount: number;
  totalValue?: number;
  notes?: string;
}

// === Known Contractors Database ===

export const DATA_CENTER_CONTRACTORS: Contractor[] = [
  // === Major General Contractors ===
  {
    id: 'holder-construction',
    name: 'Holder Construction',
    aliases: ['Holder LLC'],
    type: 'general-contractor',
    headquarters: { city: 'Atlanta', state: 'GA' },
    foundedYear: 1960,
    employeeCount: 1200,
    unionStatus: 'mixed',
    ibewSignatory: false,
    oshaViolations: [],
    nlrbCases: [],
    knownProjects: [
      {
        facilityName: 'Meta New Albany Data Center',
        operator: 'Meta',
        location: { city: 'New Albany', state: 'OH' },
        role: 'General Contractor',
        status: 'completed',
      },
      {
        facilityName: 'Google Midlothian Data Center',
        operator: 'Google',
        location: { city: 'Midlothian', state: 'TX' },
        role: 'General Contractor',
        status: 'completed',
      },
    ],
    operatorRelationships: [
      { operator: 'Meta', relationshipType: 'preferred-vendor', projectCount: 8 },
      { operator: 'Google', relationshipType: 'approved-vendor', projectCount: 5 },
    ],
    organizingPriority: 'high',
    lastUpdated: new Date(),
    dataSources: ['Trade publications', 'Project announcements'],
  },
  {
    id: 'mortenson',
    name: 'Mortenson Construction',
    aliases: ['M.A. Mortenson Company'],
    type: 'general-contractor',
    headquarters: { city: 'Minneapolis', state: 'MN' },
    foundedYear: 1954,
    employeeCount: 5000,
    unionStatus: 'mixed',
    ibewSignatory: true,
    ibewLocals: ['Local 292', 'Local 134', 'Local 46'],
    oshaViolations: [],
    nlrbCases: [],
    knownProjects: [
      {
        facilityName: 'Microsoft Azure Quincy',
        operator: 'Microsoft',
        location: { city: 'Quincy', state: 'WA' },
        role: 'General Contractor',
        status: 'completed',
      },
    ],
    operatorRelationships: [
      { operator: 'Microsoft', relationshipType: 'preferred-vendor', projectCount: 12 },
      { operator: 'Meta', relationshipType: 'approved-vendor', projectCount: 3 },
    ],
    organizingPriority: 'medium',
    lastUpdated: new Date(),
    dataSources: ['IBEW records', 'Trade publications'],
  },
  {
    id: 'dpr-construction',
    name: 'DPR Construction',
    aliases: [],
    type: 'general-contractor',
    headquarters: { city: 'Redwood City', state: 'CA' },
    foundedYear: 1990,
    employeeCount: 9000,
    unionStatus: 'mixed',
    ibewSignatory: true,
    ibewLocals: ['Local 11', 'Local 595', 'Local 46'],
    oshaViolations: [],
    nlrbCases: [],
    knownProjects: [
      {
        facilityName: 'Meta Prineville Data Center',
        operator: 'Meta',
        location: { city: 'Prineville', state: 'OR' },
        role: 'General Contractor',
        status: 'completed',
      },
    ],
    operatorRelationships: [
      { operator: 'Meta', relationshipType: 'preferred-vendor', projectCount: 15 },
      { operator: 'Apple', relationshipType: 'approved-vendor', projectCount: 4 },
    ],
    organizingPriority: 'medium',
    lastUpdated: new Date(),
    dataSources: ['IBEW records', 'Trade publications'],
  },
  
  // === Major Electrical Contractors ===
  {
    id: 'rosendin',
    name: 'Rosendin Electric',
    aliases: ['Rosendin Holdings'],
    type: 'electrical',
    headquarters: { city: 'San Jose', state: 'CA' },
    foundedYear: 1919,
    employeeCount: 7500,
    unionStatus: 'fully-union',
    ibewSignatory: true,
    ibewLocals: ['Local 11', 'Local 332', 'Local 48', 'Local 46', 'Local 26'],
    oshaViolations: [],
    nlrbCases: [],
    knownProjects: [
      {
        facilityName: 'AWS Northern Virginia',
        operator: 'Amazon Web Services',
        location: { city: 'Ashburn', state: 'VA' },
        role: 'Electrical Contractor',
        status: 'active',
      },
    ],
    operatorRelationships: [
      { operator: 'Amazon Web Services', relationshipType: 'preferred-vendor', projectCount: 20 },
      { operator: 'Meta', relationshipType: 'preferred-vendor', projectCount: 18 },
      { operator: 'Microsoft', relationshipType: 'approved-vendor', projectCount: 10 },
    ],
    organizingPriority: 'low', // Already union
    lastUpdated: new Date(),
    dataSources: ['IBEW Local 26 records', 'Trade publications'],
  },
  {
    id: 'cupertino-electric',
    name: 'Cupertino Electric',
    aliases: ['CEI'],
    type: 'electrical',
    headquarters: { city: 'San Jose', state: 'CA' },
    foundedYear: 1954,
    employeeCount: 3500,
    unionStatus: 'fully-union',
    ibewSignatory: true,
    ibewLocals: ['Local 332', 'Local 595', 'Local 11'],
    oshaViolations: [],
    nlrbCases: [],
    knownProjects: [
      {
        facilityName: 'Apple Mesa Data Center',
        operator: 'Apple',
        location: { city: 'Mesa', state: 'AZ' },
        role: 'Electrical Contractor',
        status: 'completed',
      },
    ],
    operatorRelationships: [
      { operator: 'Apple', relationshipType: 'preferred-vendor', projectCount: 8 },
      { operator: 'Google', relationshipType: 'approved-vendor', projectCount: 5 },
    ],
    organizingPriority: 'low', // Already union
    lastUpdated: new Date(),
    dataSources: ['IBEW records', 'Trade publications'],
  },
  
  // === Staffing Agencies (HIGH PRIORITY FOR ORGANIZING) ===
  {
    id: 'aerotek',
    name: 'Aerotek',
    aliases: ['Aerotek Inc', 'Allegis Group subsidiary'],
    type: 'staffing-agency',
    headquarters: { city: 'Hanover', state: 'MD' },
    foundedYear: 1983,
    employeeCount: 25000,
    unionStatus: 'non-union',
    ibewSignatory: false,
    oshaViolations: [],
    nlrbCases: [],
    knownProjects: [
      {
        facilityName: 'Various Data Centers',
        operator: 'Multiple',
        location: { city: 'Various', state: 'US' },
        role: 'Staffing - Technicians',
        status: 'active',
      },
    ],
    operatorRelationships: [
      { operator: 'Amazon Web Services', relationshipType: 'approved-vendor', projectCount: 50 },
      { operator: 'Microsoft', relationshipType: 'approved-vendor', projectCount: 30 },
    ],
    organizingPriority: 'high',
    lastUpdated: new Date(),
    dataSources: ['Job postings', 'Worker reports'],
  },
  {
    id: 'modis',
    name: 'Modis',
    aliases: ['Modis Engineering', 'Adecco Group subsidiary'],
    type: 'staffing-agency',
    headquarters: { city: 'Jacksonville', state: 'FL' },
    foundedYear: 1996,
    employeeCount: 10000,
    unionStatus: 'non-union',
    ibewSignatory: false,
    oshaViolations: [],
    nlrbCases: [],
    knownProjects: [
      {
        facilityName: 'Various Data Centers',
        operator: 'Multiple',
        location: { city: 'Various', state: 'US' },
        role: 'Staffing - Operations',
        status: 'active',
      },
    ],
    operatorRelationships: [
      { operator: 'Google', relationshipType: 'approved-vendor', projectCount: 20 },
    ],
    organizingPriority: 'high',
    lastUpdated: new Date(),
    dataSources: ['Job postings', 'Worker reports'],
  },
  {
    id: 'randstad',
    name: 'Randstad Technologies',
    aliases: ['Randstad USA'],
    type: 'staffing-agency',
    headquarters: { city: 'Atlanta', state: 'GA' },
    foundedYear: 1960,
    employeeCount: 15000,
    unionStatus: 'non-union',
    ibewSignatory: false,
    oshaViolations: [],
    nlrbCases: [],
    knownProjects: [
      {
        facilityName: 'Various Data Centers',
        operator: 'Multiple',
        location: { city: 'Various', state: 'US' },
        role: 'Staffing - Technical',
        status: 'active',
      },
    ],
    operatorRelationships: [
      { operator: 'Meta', relationshipType: 'approved-vendor', projectCount: 15 },
    ],
    organizingPriority: 'high',
    lastUpdated: new Date(),
    dataSources: ['Job postings', 'Worker reports'],
  },
];

// === Storage ===

import { db } from '../db/database';

export async function saveContractor(contractor: Contractor): Promise<void> {
  await db.table('contractors').put(contractor);
}

export async function getContractors(): Promise<Contractor[]> {
  try {
    const stored = await db.table('contractors').toArray();
    return stored.length > 0 ? stored : DATA_CENTER_CONTRACTORS;
  } catch {
    return DATA_CENTER_CONTRACTORS;
  }
}

export async function getContractorById(id: string): Promise<Contractor | undefined> {
  try {
    const stored = await db.table('contractors').get(id);
    return stored || DATA_CENTER_CONTRACTORS.find(c => c.id === id);
  } catch {
    return DATA_CENTER_CONTRACTORS.find(c => c.id === id);
  }
}

export async function getContractorsByOperator(operator: string): Promise<Contractor[]> {
  const contractors = await getContractors();
  return contractors.filter(c => 
    c.operatorRelationships.some(r => 
      r.operator.toLowerCase().includes(operator.toLowerCase())
    )
  );
}

export async function getContractorsByUnionStatus(status: UnionStatus): Promise<Contractor[]> {
  const contractors = await getContractors();
  return contractors.filter(c => c.unionStatus === status);
}

export async function getOrganizingTargets(): Promise<Contractor[]> {
  const contractors = await getContractors();
  return contractors
    .filter(c => c.organizingPriority === 'high' || c.organizingPriority === 'medium')
    .sort((a, b) => {
      const priority = { high: 0, medium: 1, low: 2 };
      return priority[a.organizingPriority] - priority[b.organizingPriority];
    });
}

// === OSHA Integration ===

export interface OSHAInspectionResult {
  activityNr: string;
  inspectionDate: string;
  estabName: string;
  siteAddress: string;
  siteCity: string;
  siteState: string;
  siteZip: string;
  violationType: string;
  penaltyCurrent: number;
  gravity: string;
  inspectionScope: string;
}

export async function fetchOSHAViolations(companyName: string): Promise<OSHAViolation[]> {
  // OSHA SVEP API endpoint
  // In production, this would call the actual OSHA API
  // For now, return mock data
  console.log(`[OSHA] Would fetch violations for: ${companyName}`);
  return [];
}

// === Analytics ===

export async function getContractorStats(): Promise<{
  total: number;
  byType: Record<ContractorType, number>;
  byUnionStatus: Record<UnionStatus, number>;
  byOrganizingPriority: Record<string, number>;
  topByViolations: { name: string; violations: number }[];
  topByProjectCount: { name: string; projects: number }[];
}> {
  const contractors = await getContractors();
  
  const byType: Record<string, number> = {};
  const byUnionStatus: Record<string, number> = {};
  const byOrganizingPriority: Record<string, number> = {};
  
  for (const c of contractors) {
    byType[c.type] = (byType[c.type] || 0) + 1;
    byUnionStatus[c.unionStatus] = (byUnionStatus[c.unionStatus] || 0) + 1;
    byOrganizingPriority[c.organizingPriority] = (byOrganizingPriority[c.organizingPriority] || 0) + 1;
  }
  
  const topByViolations = contractors
    .filter(c => c.oshaViolations.length > 0)
    .map(c => ({ name: c.name, violations: c.oshaViolations.length }))
    .sort((a, b) => b.violations - a.violations)
    .slice(0, 10);
  
  const topByProjectCount = contractors
    .map(c => ({ 
      name: c.name, 
      projects: c.operatorRelationships.reduce((sum, r) => sum + r.projectCount, 0) 
    }))
    .sort((a, b) => b.projects - a.projects)
    .slice(0, 10);
  
  return {
    total: contractors.length,
    byType: byType as Record<ContractorType, number>,
    byUnionStatus: byUnionStatus as Record<UnionStatus, number>,
    byOrganizingPriority,
    topByViolations,
    topByProjectCount,
  };
}

// === Alert on New Projects ===

export interface ContractorAlert {
  id: string;
  contractorId: string;
  contractorName: string;
  alertType: 'new-project' | 'osha-violation' | 'nlrb-case' | 'permit-filed';
  title: string;
  description: string;
  date: Date;
  organizingOpportunity: string;
  actionItems: string[];
}

export async function checkForContractorAlerts(): Promise<ContractorAlert[]> {
  // In production, this would check:
  // - New building permits mentioning contractor names
  // - New OSHA violations
  // - New NLRB cases
  // - Trade publication announcements
  
  // For now, return mock alerts
  return [
    {
      id: 'alert-1',
      contractorId: 'holder-construction',
      contractorName: 'Holder Construction',
      alertType: 'new-project',
      title: 'Holder Construction awarded new Meta data center project',
      description: 'Holder Construction has been selected as general contractor for a new 500,000 sq ft Meta data center in Temple, TX.',
      date: new Date(),
      organizingOpportunity: 'New project provides opportunity to engage with workers before construction begins.',
      actionItems: [
        'Contact IBEW Local 520 (Dallas/Temple area)',
        'Monitor permit filings for subcontractor assignments',
        'Prepare organizing materials for electrical workers',
      ],
    },
  ];
}

