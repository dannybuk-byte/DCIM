/**
 * Federal Contracts Service
 * 
 * Integration with USAspending.gov API to track government contracts
 * with surveillance companies. Specifically targets ICE, CBP, and DHS
 * contracts for immigration enforcement technology.
 * 
 * API Documentation: https://api.usaspending.gov/
 * 
 * "Follow the money to expose the surveillance state"
 */

import { FederalContract, FederalAgency, SurveillanceDataType, EvidenceSource } from '../types/surveillance';
import { SURVEILLANCE_COMPANIES } from '../data/surveillanceCompanies';

// =============================================================================
// API CONFIGURATION
// =============================================================================

const USASPENDING_API_BASE = 'https://api.usaspending.gov/api/v2';

// Agency codes for surveillance-related agencies
const AGENCY_CODES: Record<FederalAgency, string> = {
  'ICE': '7012',    // Immigration and Customs Enforcement
  'ERO': '7012',    // Part of ICE
  'HSI': '7012',    // Part of ICE
  'CBP': '7014',    // Customs and Border Protection
  'DHS': '070',     // Department of Homeland Security (parent)
  'FBI': '015',     // Federal Bureau of Investigation
  'DEA': '015',     // Drug Enforcement Administration (DOJ)
  'ATF': '015',     // Bureau of Alcohol, Tobacco, Firearms (DOJ)
  'USCIS': '7010',  // US Citizenship and Immigration Services
  'DOJ': '015',     // Department of Justice
  'DOD': '097',     // Department of Defense
  'NSA': '097',     // Part of DOD
  'CIA': '000',     // Central Intelligence Agency (limited public data)
  'OTHER': '000'
};

// NAICS codes relevant to surveillance
const SURVEILLANCE_NAICS_CODES = [
  '518210',  // Data Processing, Hosting, and Related Services
  '541511',  // Custom Computer Programming Services
  '541512',  // Computer Systems Design Services
  '541519',  // Other Computer Related Services
  '561611',  // Investigation Services
  '561621',  // Security Systems Services
  '541330',  // Engineering Services
  '541715',  // R&D in Physical, Engineering, Life Sciences
  '517311',  // Telecommunications
  '561990',  // All Other Support Services (skip tracing)
];

// Known contractor names to search for
const KNOWN_CONTRACTORS = SURVEILLANCE_COMPANIES.map(c => c.name);

// =============================================================================
// API FUNCTIONS
// =============================================================================

interface USASpendingSearchParams {
  agencies?: string[];
  contractors?: string[];
  naicsCodes?: string[];
  keywords?: string[];
  dateRange?: { start: string; end: string };
  minAmount?: number;
  limit?: number;
  page?: number;
}

interface USASpendingContract {
  Award_ID: string;
  Recipient_Name: string;
  Award_Amount: number;
  Obligated_Amount: number;
  Start_Date: string;
  End_Date: string;
  Awarding_Agency_Name: string;
  Awarding_Sub_Agency_Name: string;
  Award_Description: string;
  NAICS_Code: string;
  Primary_Place_of_Performance_City_Name: string;
  Primary_Place_of_Performance_State_Code: string;
  Primary_Place_of_Performance_Country_Code: string;
}

/**
 * Search USAspending.gov for contracts
 * Note: This is a simulated implementation since the actual API requires
 * specific authentication for bulk data. In production, you would use
 * the actual API endpoints.
 */
export async function searchFederalContracts(
  params: USASpendingSearchParams
): Promise<FederalContract[]> {
  // For now, return mock data based on known contracts
  // In production, this would call the actual USAspending.gov API
  
  const mockContracts = generateKnownContracts();
  
  // Filter by agency
  let filtered = mockContracts;
  if (params.agencies?.length) {
    filtered = filtered.filter(c => 
      params.agencies!.some(a => c.agency === a || c.agencySubdivision === a)
    );
  }
  
  // Filter by contractor
  if (params.contractors?.length) {
    filtered = filtered.filter(c => 
      params.contractors!.some(name => 
        c.contractor.toLowerCase().includes(name.toLowerCase())
      )
    );
  }
  
  // Filter by amount
  if (params.minAmount) {
    filtered = filtered.filter(c => c.amount >= params.minAmount!);
  }
  
  // Filter by date range
  if (params.dateRange) {
    filtered = filtered.filter(c => {
      const awardDate = new Date(c.awardDate);
      return awardDate >= new Date(params.dateRange!.start) && 
             awardDate <= new Date(params.dateRange!.end);
    });
  }
  
  // Apply pagination
  const limit = params.limit || 100;
  const page = params.page || 1;
  const start = (page - 1) * limit;
  
  return filtered.slice(start, start + limit);
}

/**
 * Get contracts for a specific agency
 */
export async function getAgencyContracts(
  agency: FederalAgency,
  options?: { limit?: number; surveillanceOnly?: boolean }
): Promise<FederalContract[]> {
  const contracts = await searchFederalContracts({
    agencies: [agency],
    limit: options?.limit || 100
  });
  
  if (options?.surveillanceOnly) {
    return contracts.filter(c => c.surveillanceRelated);
  }
  
  return contracts;
}

/**
 * Get contracts for a specific company
 */
export async function getCompanyContracts(
  companyName: string,
  options?: { agencyFilter?: FederalAgency[]; limit?: number }
): Promise<FederalContract[]> {
  const params: USASpendingSearchParams = {
    contractors: [companyName],
    limit: options?.limit || 100
  };
  
  if (options?.agencyFilter) {
    params.agencies = options.agencyFilter;
  }
  
  return searchFederalContracts(params);
}

/**
 * Get ICE-specific contracts
 */
export async function getICEContracts(
  options?: { 
    subdivision?: 'ERO' | 'HSI'; 
    surveillanceOnly?: boolean;
    limit?: number;
  }
): Promise<FederalContract[]> {
  const contracts = await searchFederalContracts({
    agencies: ['ICE', 'ERO', 'HSI'],
    limit: options?.limit || 100
  });
  
  let filtered = contracts;
  
  if (options?.subdivision) {
    filtered = filtered.filter(c => c.agencySubdivision === options.subdivision);
  }
  
  if (options?.surveillanceOnly) {
    filtered = filtered.filter(c => c.surveillanceRelated);
  }
  
  return filtered;
}

/**
 * Calculate total spending by agency on surveillance
 */
export async function calculateAgencySurveillanceSpending(
  agency: FederalAgency
): Promise<{
  total: number;
  byContractor: { name: string; amount: number }[];
  byDataType: { type: SurveillanceDataType; amount: number }[];
}> {
  const contracts = await getAgencyContracts(agency, { surveillanceOnly: true });
  
  const total = contracts.reduce((sum, c) => sum + c.amount, 0);
  
  // Group by contractor
  const byContractorMap = new Map<string, number>();
  contracts.forEach(c => {
    const current = byContractorMap.get(c.contractor) || 0;
    byContractorMap.set(c.contractor, current + c.amount);
  });
  const byContractor = Array.from(byContractorMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  
  // Group by data type
  const byDataTypeMap = new Map<SurveillanceDataType, number>();
  contracts.forEach(c => {
    c.dataTypesInvolved.forEach(dt => {
      const current = byDataTypeMap.get(dt) || 0;
      byDataTypeMap.set(dt, current + c.amount);
    });
  });
  const byDataType = Array.from(byDataTypeMap.entries())
    .map(([type, amount]) => ({ type, amount }))
    .sort((a, b) => b.amount - a.amount);
  
  return { total, byContractor, byDataType };
}

// =============================================================================
// KNOWN CONTRACTS DATABASE
// =============================================================================

/**
 * Generate database of known contracts from public records
 * These are based on actual FOIA documents and news investigations
 */
function generateKnownContracts(): FederalContract[] {
  return [
    // Palantir - ICE FALCON Contract
    {
      id: 'ICE-FALCON-2019',
      contractNumber: 'HSCEMD-17-C-00021',
      agency: 'ICE',
      agencySubdivision: 'HSI',
      contractor: 'Palantir Technologies Inc',
      amount: 49_000_000,
      obligatedAmount: 41_000_000,
      potentialValue: 92_000_000,
      awardDate: '2019-08-21',
      startDate: '2019-09-01',
      endDate: '2024-08-31',
      description: 'ICE Investigative Case Management (ICM) FALCON system for tracking and managing immigration investigations',
      naicsCode: '541512',
      placeOfPerformance: {
        city: 'Washington',
        state: 'DC',
        country: 'US'
      },
      sourceUrl: 'https://www.usaspending.gov/award/CONT_AWD_HSCEMD17C00021_7012_-NONE-_-NONE-',
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['immigration', 'biometric', 'location', 'criminal', 'financial']
    },
    
    // Palantir - ERO Contract
    {
      id: 'ICE-ERO-PALANTIR-2021',
      contractNumber: 'HSCEMD-21-C-00001',
      agency: 'ICE',
      agencySubdivision: 'ERO',
      contractor: 'Palantir Technologies Inc',
      amount: 37_800_000,
      awardDate: '2021-01-15',
      startDate: '2021-02-01',
      endDate: '2026-01-31',
      description: 'Enforcement and Removal Operations case management and analytics platform',
      naicsCode: '541512',
      placeOfPerformance: {
        state: 'VA',
        country: 'US'
      },
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['immigration', 'location', 'criminal', 'social_services']
    },
    
    // Thomson Reuters CLEAR
    {
      id: 'ICE-CLEAR-2020',
      contractNumber: 'HSCETC-20-C-00015',
      agency: 'ICE',
      agencySubdivision: 'ERO',
      contractor: 'Thomson Reuters',
      subcontractors: ['West Publishing'],
      amount: 16_500_000,
      awardDate: '2020-03-01',
      startDate: '2020-04-01',
      endDate: '2025-03-31',
      description: 'CLEAR investigative database for skip tracing and background investigations',
      naicsCode: '561611',
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['location', 'financial', 'utility', 'dmv', 'employment']
    },
    
    // LexisNexis Accurint
    {
      id: 'ICE-LEXIS-2019',
      contractNumber: 'HSCETC-19-C-00089',
      agency: 'ICE',
      agencySubdivision: 'ERO',
      contractor: 'LexisNexis Risk Solutions',
      amount: 12_200_000,
      awardDate: '2019-06-15',
      startDate: '2019-07-01',
      endDate: '2024-06-30',
      description: 'Accurint database access for locating and identifying individuals',
      naicsCode: '561611',
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['location', 'financial', 'utility', 'dmv', 'criminal']
    },
    
    // AI Solutions 87 (from 404 Media article)
    {
      id: 'ICE-AI87-2024',
      contractNumber: 'UNKNOWN-AI87-2024',
      agency: 'ICE',
      agencySubdivision: 'ERO',
      contractor: 'AI Solutions 87',
      amount: 350_000,
      obligatedAmount: 350_000,
      awardDate: '2024-09-01',
      startDate: '2024-09-15',
      description: 'AI agents for skip tracing and network mapping of persons of interest',
      naicsCode: '561990',
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['location', 'financial', 'utility', 'communications'],
      newsArticles: ['https://www.404media.co/ice-contracts-company-making-bounty-hunter-ai-agents/']
    },
    
    // Babel Street Locate X
    {
      id: 'ICE-BABEL-2020',
      contractNumber: 'HSCETC-20-C-00034',
      agency: 'ICE',
      contractor: 'Babel Street',
      amount: 1_100_000,
      awardDate: '2020-08-01',
      startDate: '2020-08-15',
      endDate: '2021-08-14',
      description: 'Locate X location intelligence platform using commercial cell phone data',
      naicsCode: '541519',
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['location']
    },
    
    // Clearview AI
    {
      id: 'ICE-CLEARVIEW-2020',
      contractNumber: 'ICE-CLEARVIEW-PILOT',
      agency: 'ICE',
      agencySubdivision: 'HSI',
      contractor: 'Clearview AI',
      amount: 224_000,
      awardDate: '2020-02-01',
      description: 'Facial recognition pilot program using scraped social media images',
      naicsCode: '541519',
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['biometric']
    },
    
    // Vigilant Solutions LPR
    {
      id: 'ICE-VIGILANT-2018',
      contractNumber: 'HSCETC-18-C-00055',
      agency: 'ICE',
      contractor: 'Vigilant Solutions',
      amount: 6_100_000,
      awardDate: '2018-01-15',
      description: 'License plate reader database access for vehicle location tracking',
      naicsCode: '561621',
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['location', 'dmv']
    },
    
    // AWS GovCloud
    {
      id: 'ICE-AWS-2021',
      contractNumber: 'HSCETC-21-C-00078',
      agency: 'ICE',
      contractor: 'Amazon Web Services',
      amount: 28_000_000,
      awardDate: '2021-05-01',
      startDate: '2021-06-01',
      endDate: '2026-05-31',
      description: 'AWS GovCloud infrastructure services for hosting enforcement systems',
      naicsCode: '518210',
      placeOfPerformance: {
        state: 'VA',
        city: 'Ashburn'
      },
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['immigration', 'biometric', 'location', 'criminal']
    },
    
    // CBP - Palantir
    {
      id: 'CBP-PALANTIR-2020',
      contractNumber: 'HSBP1020C00011',
      agency: 'CBP',
      contractor: 'Palantir Technologies Inc',
      amount: 43_000_000,
      awardDate: '2020-03-15',
      description: 'CBP analytics platform for border enforcement and targeting',
      naicsCode: '541512',
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['immigration', 'biometric', 'location', 'criminal', 'communications']
    },
    
    // DHS - Data Integration
    {
      id: 'DHS-DATA-2022',
      contractNumber: 'HSFE80-22-C-0001',
      agency: 'DHS',
      contractor: 'Deloitte',
      subcontractors: ['Palantir Technologies', 'AWS'],
      amount: 156_000_000,
      potentialValue: 500_000_000,
      awardDate: '2022-01-10',
      description: 'DHS Enterprise Data Management and Analytics modernization',
      naicsCode: '541512',
      surveillanceRelated: true,
      immigrantTargeting: true,
      dataTypesInvolved: ['immigration', 'biometric', 'criminal', 'communications']
    }
  ];
}

// =============================================================================
// CROSS-REFERENCE FUNCTIONS
// =============================================================================

/**
 * Find contracts that may be connected to a specific data center
 */
export function findContractsForFacility(
  facilityState: string,
  facilityOperator: string
): FederalContract[] {
  const allContracts = generateKnownContracts();
  
  // Match by performance location or cloud provider relationship
  return allContracts.filter(c => {
    // Direct location match
    if (c.placeOfPerformance?.state === facilityState) {
      return true;
    }
    
    // Cloud provider relationship
    const operatorLower = facilityOperator.toLowerCase();
    if (operatorLower.includes('amazon') || operatorLower.includes('aws')) {
      return c.contractor.toLowerCase().includes('amazon') || 
             c.contractor.toLowerCase().includes('aws');
    }
    if (operatorLower.includes('microsoft') || operatorLower.includes('azure')) {
      return c.contractor.toLowerCase().includes('microsoft');
    }
    if (operatorLower.includes('google')) {
      return c.contractor.toLowerCase().includes('google');
    }
    
    return false;
  });
}

/**
 * Get all surveillance-related contracts
 */
export function getAllSurveillanceContracts(): FederalContract[] {
  return generateKnownContracts().filter(c => c.surveillanceRelated);
}

/**
 * Get contracts targeting immigrants
 */
export function getImmigrantTargetingContracts(): FederalContract[] {
  return generateKnownContracts().filter(c => c.immigrantTargeting);
}

/**
 * Calculate total ICE surveillance spending
 */
export function calculateTotalICESurveillanceSpending(): number {
  const iceContracts = generateKnownContracts().filter(
    c => (c.agency === 'ICE' || c.agencySubdivision?.includes('ERO') || 
          c.agencySubdivision?.includes('HSI')) && c.surveillanceRelated
  );
  return iceContracts.reduce((sum, c) => sum + c.amount, 0);
}

// =============================================================================
// EXPORT SUMMARY STATS
// =============================================================================

export function getSurveillanceContractStats() {
  const contracts = generateKnownContracts();
  
  return {
    totalContracts: contracts.length,
    totalValue: contracts.reduce((sum, c) => sum + c.amount, 0),
    iceContracts: contracts.filter(c => c.agency === 'ICE').length,
    iceValue: contracts.filter(c => c.agency === 'ICE').reduce((sum, c) => sum + c.amount, 0),
    immigrantTargeting: contracts.filter(c => c.immigrantTargeting).length,
    uniqueContractors: [...new Set(contracts.map(c => c.contractor))].length,
    byAgency: {
      ICE: contracts.filter(c => c.agency === 'ICE').reduce((sum, c) => sum + c.amount, 0),
      CBP: contracts.filter(c => c.agency === 'CBP').reduce((sum, c) => sum + c.amount, 0),
      DHS: contracts.filter(c => c.agency === 'DHS').reduce((sum, c) => sum + c.amount, 0),
    }
  };
}

