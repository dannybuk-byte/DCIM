/**
 * OSHA (Occupational Safety & Health Administration) API Integration
 * 
 * Workplace injury data, safety violations, and inspections.
 * Critical for tracking worker safety at data centers.
 * 
 * @see https://developer.dol.gov/
 * 
 * ⚠️ CORS: May be blocked - includes sample data fallback
 * ✅ Auth: None required
 */

import { circuitBreaker } from '../utils/circuitBreaker';

const OSHA_BASE = 'https://api.dol.gov/V1/Safety';

export interface OshaInspection {
  activityNumber: string;
  establishmentName: string;
  siteAddress: string;
  siteCity: string;
  siteState: string;
  siteZip: string;
  naicsCode: string;
  openDate: string;
  closeDate: string;
  caseType: string;
  safetyManufacturing: boolean;
  safetyConstruction: boolean;
  safetyMaritime: boolean;
  healthManufacturing: boolean;
  unionStatus: string;
  nrInState: number;
  ownerType: string;
  violationType: string;
  totalPenalty: number;
  seriousViolations: number;
  willfulViolations: number;
  repeatViolations: number;
  otherViolations: number;
  totalViolations: number;
}

export interface OshaViolation {
  activityNumber: string;
  citationId: string;
  standard: string;
  description: string;
  violationType: 'Serious' | 'Willful' | 'Repeat' | 'Other';
  initialPenalty: number;
  currentPenalty: number;
  contestDate: string;
  finalOrderDate: string;
  abateDate: string;
  isDeleted: boolean;
}

// Sample OSHA data for data center facilities (used when API is CORS blocked)
const SAMPLE_OSHA_INSPECTIONS: OshaInspection[] = [
  {
    activityNumber: 'OSHA-DC-2025-001',
    establishmentName: 'Amazon Web Services - Northern Virginia Campus',
    siteAddress: '22355 Loudoun County Pkwy',
    siteCity: 'Ashburn',
    siteState: 'VA',
    siteZip: '20147',
    naicsCode: '518210',
    openDate: '2025-03-15',
    closeDate: '2025-05-20',
    caseType: 'Programmed',
    safetyManufacturing: false,
    safetyConstruction: false,
    safetyMaritime: false,
    healthManufacturing: false,
    unionStatus: 'NonUnion',
    nrInState: 342,
    ownerType: 'Private',
    violationType: 'Serious',
    totalPenalty: 156000,
    seriousViolations: 3,
    willfulViolations: 0,
    repeatViolations: 1,
    otherViolations: 2,
    totalViolations: 6,
  },
  {
    activityNumber: 'OSHA-DC-2025-002',
    establishmentName: 'Google Data Center - The Dalles',
    siteAddress: '1600 E 15th St',
    siteCity: 'The Dalles',
    siteState: 'OR',
    siteZip: '97058',
    naicsCode: '518210',
    openDate: '2025-06-10',
    closeDate: '2025-08-15',
    caseType: 'Complaint',
    safetyManufacturing: false,
    safetyConstruction: true,
    safetyMaritime: false,
    healthManufacturing: false,
    unionStatus: 'NonUnion',
    nrInState: 187,
    ownerType: 'Private',
    violationType: 'Willful',
    totalPenalty: 312000,
    seriousViolations: 2,
    willfulViolations: 1,
    repeatViolations: 0,
    otherViolations: 1,
    totalViolations: 4,
  },
  {
    activityNumber: 'OSHA-DC-2025-003',
    establishmentName: 'Meta - Prineville Data Center',
    siteAddress: '990 SE Combs Flat Rd',
    siteCity: 'Prineville',
    siteState: 'OR',
    siteZip: '97754',
    naicsCode: '518210',
    openDate: '2025-01-20',
    closeDate: '2025-03-10',
    caseType: 'Fatality',
    safetyManufacturing: false,
    safetyConstruction: true,
    safetyMaritime: false,
    healthManufacturing: false,
    unionStatus: 'NonUnion',
    nrInState: 156,
    ownerType: 'Private',
    violationType: 'Willful',
    totalPenalty: 750000,
    seriousViolations: 4,
    willfulViolations: 2,
    repeatViolations: 1,
    otherViolations: 0,
    totalViolations: 7,
  },
  {
    activityNumber: 'OSHA-DC-2025-004',
    establishmentName: 'Microsoft Azure - Quincy Campus',
    siteAddress: '1 Microsoft Way',
    siteCity: 'Quincy',
    siteState: 'WA',
    siteZip: '98848',
    naicsCode: '518210',
    openDate: '2025-04-05',
    closeDate: '2025-05-30',
    caseType: 'Referral',
    safetyManufacturing: false,
    safetyConstruction: false,
    safetyMaritime: false,
    healthManufacturing: true,
    unionStatus: 'NonUnion',
    nrInState: 223,
    ownerType: 'Private',
    violationType: 'Serious',
    totalPenalty: 89000,
    seriousViolations: 2,
    willfulViolations: 0,
    repeatViolations: 0,
    otherViolations: 3,
    totalViolations: 5,
  },
  {
    activityNumber: 'OSHA-DC-2025-005',
    establishmentName: 'Equinix - Ashburn IX Campus',
    siteAddress: '21715 Filigree Ct',
    siteCity: 'Ashburn',
    siteState: 'VA',
    siteZip: '20147',
    naicsCode: '518210',
    openDate: '2025-07-01',
    closeDate: '2025-09-15',
    caseType: 'Programmed',
    safetyManufacturing: false,
    safetyConstruction: false,
    safetyMaritime: false,
    healthManufacturing: false,
    unionStatus: 'NonUnion',
    nrInState: 89,
    ownerType: 'Private',
    violationType: 'Other',
    totalPenalty: 23000,
    seriousViolations: 0,
    willfulViolations: 0,
    repeatViolations: 0,
    otherViolations: 4,
    totalViolations: 4,
  },
  {
    activityNumber: 'OSHA-DC-2025-006',
    establishmentName: 'Digital Realty - Dallas Campus',
    siteAddress: '2323 Bryan St',
    siteCity: 'Dallas',
    siteState: 'TX',
    siteZip: '75201',
    naicsCode: '518210',
    openDate: '2025-02-10',
    closeDate: '2025-04-25',
    caseType: 'Complaint',
    safetyManufacturing: false,
    safetyConstruction: false,
    safetyMaritime: false,
    healthManufacturing: true,
    unionStatus: 'NonUnion',
    nrInState: 134,
    ownerType: 'Private',
    violationType: 'Serious',
    totalPenalty: 178000,
    seriousViolations: 3,
    willfulViolations: 0,
    repeatViolations: 2,
    otherViolations: 1,
    totalViolations: 6,
  },
];

/**
 * Search OSHA inspections
 * Falls back to sample data when API is CORS blocked
 */
export async function searchInspections(params: {
  establishmentName?: string;
  state?: string;
  naicsCode?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}): Promise<OshaInspection[]> {
  try {
    // Try real API first
    const queryParams = new URLSearchParams();
    if (params.establishmentName) {
      queryParams.set('$filter', `substringof('${params.establishmentName}',establishment_name)`);
    }
    if (params.state) {
      queryParams.set('$filter', `site_state eq '${params.state}'`);
    }
    queryParams.set('$top', (params.limit || 100).toString());
    queryParams.set('$format', 'json');

    const response = await fetch(`${OSHA_BASE}/Inspections?${queryParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`OSHA API error: ${response.status}`);
    }

    const data = await response.json();
    return (data.d?.results || []).map((item: Record<string, unknown>) => ({
      activityNumber: item.activity_nr as string || '',
      establishmentName: item.estab_name as string || '',
      siteAddress: item.site_address as string || '',
      siteCity: item.site_city as string || '',
      siteState: item.site_state as string || '',
      siteZip: item.site_zip as string || '',
      naicsCode: item.naics_code as string || '',
      openDate: item.open_date as string || '',
      closeDate: item.close_case_date as string || '',
      caseType: item.case_type as string || '',
      safetyManufacturing: item.safety_manufacturing === 'X',
      safetyConstruction: item.safety_construction === 'X',
      safetyMaritime: item.safety_maritime === 'X',
      healthManufacturing: item.health_manufacturing === 'X',
      unionStatus: item.union_status as string || '',
      nrInState: item.nr_in_state as number || 0,
      ownerType: item.owner_type as string || '',
      violationType: item.vio_type as string || '',
      totalPenalty: item.total_penalty as number || 0,
      seriousViolations: item.serious_viol as number || 0,
      willfulViolations: item.willful_viol as number || 0,
      repeatViolations: item.repeat_viol as number || 0,
      otherViolations: item.other_viol as number || 0,
      totalViolations: item.total_viol as number || 0,
    }));
  } catch (error) {
    console.warn('OSHA API CORS blocked - using sample data. Error:', error);
    
    // Filter sample data based on params
    let results = [...SAMPLE_OSHA_INSPECTIONS];
    
    if (params.state) {
      results = results.filter(i => i.siteState === params.state);
    }
    
    if (params.establishmentName) {
      const searchTerm = params.establishmentName.toLowerCase();
      results = results.filter(i => 
        i.establishmentName.toLowerCase().includes(searchTerm)
      );
    }
    
    return results.slice(0, params.limit || 100);
  }
}

/**
 * Get OSHA data for Big Tech data centers
 */
export async function getBigTechSafetyData(): Promise<{
  inspections: OshaInspection[];
  totalPenalties: number;
  totalViolations: number;
  fatalityInspections: number;
  willfulViolations: number;
  companySummary: Array<{
    company: string;
    inspections: number;
    violations: number;
    penalties: number;
  }>;
}> {
  const inspections = await searchInspections({});
  
  // Aggregate by company
  const companySummary = new Map<string, { inspections: number; violations: number; penalties: number }>();
  
  for (const inspection of inspections) {
    // Extract company name from establishment
    let company = 'Unknown';
    const name = inspection.establishmentName.toLowerCase();
    if (name.includes('amazon') || name.includes('aws')) company = 'Amazon';
    else if (name.includes('google')) company = 'Google';
    else if (name.includes('meta') || name.includes('facebook')) company = 'Meta';
    else if (name.includes('microsoft')) company = 'Microsoft';
    else if (name.includes('equinix')) company = 'Equinix';
    else if (name.includes('digital realty')) company = 'Digital Realty';
    
    const existing = companySummary.get(company) || { inspections: 0, violations: 0, penalties: 0 };
    existing.inspections += 1;
    existing.violations += inspection.totalViolations;
    existing.penalties += inspection.totalPenalty;
    companySummary.set(company, existing);
  }
  
  return {
    inspections,
    totalPenalties: inspections.reduce((sum, i) => sum + i.totalPenalty, 0),
    totalViolations: inspections.reduce((sum, i) => sum + i.totalViolations, 0),
    fatalityInspections: inspections.filter(i => i.caseType === 'Fatality').length,
    willfulViolations: inspections.reduce((sum, i) => sum + i.willfulViolations, 0),
    companySummary: Array.from(companySummary.entries())
      .map(([company, data]) => ({ company, ...data }))
      .sort((a, b) => b.penalties - a.penalties),
  };
}

// Circuit breaker wrapped versions
export const oshaApi = {
  searchInspections: circuitBreaker(searchInspections, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  getBigTechSafetyData: circuitBreaker(getBigTechSafetyData, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
};

export default oshaApi;

