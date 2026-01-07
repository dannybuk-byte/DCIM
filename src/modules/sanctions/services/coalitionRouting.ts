/**
 * Coalition Routing Service
 * Routes worker reports to appropriate union locals and attorneys
 * 
 * Integrates IBEW, CWA, IUOE locals with geographic coverage
 * Routes to specialized whistleblower attorneys based on case profile
 */

import { SanctionsReport, AttorneyFirm, RiskLevel } from '../types/sanctions';
import { getAttorneyNetwork } from './awardCalculator';

// IBEW Locals with geographic coverage
export interface IBEWLocal {
  localNumber: string;
  name: string;
  region: string;
  coverage: string[]; // State codes
  website?: string;
  email?: string;
  phone?: string;
  specializations?: string[];
}

export const IBEW_LOCALS: IBEWLocal[] = [
  {
    localNumber: 'IBEW-3',
    name: 'IBEW Local 3',
    region: 'NYC Metro',
    coverage: ['NY', 'NJ'],
    website: 'https://www.local3ibew.org/',
    specializations: ['Data Centers', 'High Voltage', 'Telecommunications'],
  },
  {
    localNumber: 'IBEW-26',
    name: 'IBEW Local 26',
    region: 'DC/MD/VA',
    coverage: ['DC', 'MD', 'VA'],
    website: 'https://www.ibewlocal26.org/',
    specializations: ['Federal Facilities', 'Data Centers'],
  },
  {
    localNumber: 'IBEW-46',
    name: 'IBEW Local 46',
    region: 'Seattle/Western WA',
    coverage: ['WA'],
    website: 'https://www.ibew46.com/',
    specializations: ['Tech Industry', 'Data Centers'],
  },
  {
    localNumber: 'IBEW-48',
    name: 'IBEW Local 48',
    region: 'Portland/Oregon',
    coverage: ['OR'],
    website: 'https://www.ibew48.com/',
    specializations: ['Renewable Energy', 'Data Centers'],
  },
  {
    localNumber: 'IBEW-50',
    name: 'IBEW Local 50',
    region: 'Richmond VA',
    coverage: ['VA'],
    website: 'https://www.ibew50.org/',
    specializations: ['Industrial', 'Data Centers'],
  },
  {
    localNumber: 'IBEW-58',
    name: 'IBEW Local 58',
    region: 'Detroit MI',
    coverage: ['MI'],
    website: 'https://www.ibewlocal58.org/',
    specializations: ['Automotive', 'Industrial'],
  },
  {
    localNumber: 'IBEW-68',
    name: 'IBEW Local 68',
    region: 'Denver CO',
    coverage: ['CO'],
    website: 'https://www.ibew68.com/',
    specializations: ['Renewable Energy', 'Data Centers'],
  },
  {
    localNumber: 'IBEW-69',
    name: 'IBEW Local 69',
    region: 'Dallas TX',
    coverage: ['TX'],
    website: 'https://www.ibew69.org/',
    specializations: ['Data Centers', 'Industrial'],
  },
  {
    localNumber: 'IBEW-125',
    name: 'IBEW Local 125',
    region: 'Portland OR',
    coverage: ['OR', 'WA', 'ID', 'MT'],
    website: 'https://www.ibew125.com/',
    specializations: ['Utility', 'Renewable Energy'],
  },
  {
    localNumber: 'IBEW-134',
    name: 'IBEW Local 134',
    region: 'Chicago IL',
    coverage: ['IL'],
    website: 'https://www.ibew134.org/',
    specializations: ['Industrial', 'Data Centers', 'Commercial'],
  },
  {
    localNumber: 'IBEW-569',
    name: 'IBEW Local 569',
    region: 'San Diego CA',
    coverage: ['CA'],
    website: 'https://www.ibew569.org/',
    specializations: ['Renewable Energy', 'Industrial'],
  },
  {
    localNumber: 'IBEW-617',
    name: 'IBEW Local 617',
    region: 'San Mateo CA',
    coverage: ['CA'],
    website: 'https://www.ibew617.org/',
    specializations: ['Tech Industry', 'Data Centers', 'Silicon Valley'],
  },
];

// CWA Locals for tech workers
export interface CWALocal {
  localNumber: string;
  name: string;
  region: string;
  coverage: string[];
  website?: string;
  specializations?: string[];
}

export const CWA_LOCALS: CWALocal[] = [
  {
    localNumber: 'CWA-1101',
    name: 'CWA Local 1101',
    region: 'NYC Metro',
    coverage: ['NY', 'NJ'],
    website: 'https://www.cwa1101.org/',
    specializations: ['Telecommunications', 'Tech'],
  },
  {
    localNumber: 'CWA-6215',
    name: 'CWA Local 6215',
    region: 'Texas',
    coverage: ['TX'],
    website: 'https://www.cwa6215.org/',
    specializations: ['Telecom', 'Tech'],
  },
  {
    localNumber: 'CWA-7250',
    name: 'CWA Local 7250',
    region: 'Western',
    coverage: ['CA', 'NV', 'AZ'],
    website: 'https://www.cwa7250.org/',
    specializations: ['Telecom', 'Tech', 'Media'],
  },
  {
    localNumber: 'CODE-CWA',
    name: 'Campaign to Organize Digital Employees',
    region: 'National',
    coverage: ['ALL'],
    website: 'https://code-cwa.org/',
    specializations: ['Tech Workers', 'Game Development', 'Software'],
  },
];

// IUOE Locals for facility operators
export interface IUOELocal {
  localNumber: string;
  name: string;
  region: string;
  coverage: string[];
  website?: string;
  specializations?: string[];
}

export const IUOE_LOCALS: IUOELocal[] = [
  {
    localNumber: 'IUOE-94',
    name: 'IUOE Local 94',
    region: 'NYC Metro',
    coverage: ['NY', 'NJ'],
    website: 'https://www.local94.org/',
    specializations: ['Building Operations', 'HVAC', 'Critical Facilities'],
  },
  {
    localNumber: 'IUOE-399',
    name: 'IUOE Local 399',
    region: 'Northern CA',
    coverage: ['CA'],
    website: 'https://www.local399.org/',
    specializations: ['Building Operations', 'Data Centers'],
  },
  {
    localNumber: 'IUOE-501',
    name: 'IUOE Local 501',
    region: 'Southern CA',
    coverage: ['CA'],
    website: 'https://www.iuoe501.org/',
    specializations: ['Heavy Equipment', 'Building Operations'],
  },
];

/**
 * Find IBEW local by state
 */
export function findIBEWLocalByState(stateCode: string): IBEWLocal | null {
  const normalized = stateCode.toUpperCase();
  return IBEW_LOCALS.find(local => local.coverage.includes(normalized)) || null;
}

/**
 * Find CWA local by state
 */
export function findCWALocalByState(stateCode: string): CWALocal | null {
  const normalized = stateCode.toUpperCase();
  return CWA_LOCALS.find(local => 
    local.coverage.includes(normalized) || local.coverage.includes('ALL')
  ) || null;
}

/**
 * Find IUOE local by state
 */
export function findIUOELocalByState(stateCode: string): IUOELocal | null {
  const normalized = stateCode.toUpperCase();
  return IUOE_LOCALS.find(local => local.coverage.includes(normalized)) || null;
}

/**
 * Route report to appropriate union local
 */
export function routeToUnionLocal(report: SanctionsReport): {
  ibew: IBEWLocal | null;
  cwa: CWALocal | null;
  iuoe: IUOELocal | null;
  recommended: string;
} {
  const state = report.facilityLocation.state;
  
  const ibew = findIBEWLocalByState(state);
  const cwa = findCWALocalByState(state);
  const iuoe = findIUOELocalByState(state);
  
  // Recommend based on worker type (could be enhanced with actual worker classification)
  let recommended = 'CODE-CWA'; // Default for tech workers
  
  if (ibew && ibew.specializations?.includes('Data Centers')) {
    recommended = ibew.localNumber;
  } else if (iuoe) {
    recommended = iuoe.localNumber;
  }
  
  return { ibew, cwa, iuoe, recommended };
}

/**
 * Route to appropriate attorney based on case profile
 */
export function routeToAttorney(
  report: SanctionsReport,
  estimatedViolationValue: number,
  riskLevel: RiskLevel
): AttorneyFirm {
  const attorneys = getAttorneyNetwork();
  const redFlagCount = report.redFlagsObserved.filter(r => r.observed).length;
  
  // High-value sanctions cases (> $10M) → Kohn, Kohn & Colapinto
  // They specialize in OFAC/sanctions whistleblowing
  if (estimatedViolationValue > 10_000_000 || riskLevel === 'CRITICAL') {
    const kohn = attorneys.find(a => a.firm.includes('Kohn'));
    if (kohn) return kohn;
  }
  
  // Multi-program potential (many red flags) → Phillips & Cohen
  // They excel at stacking multiple programs
  if (redFlagCount > 3 || estimatedViolationValue > 50_000_000) {
    const phillips = attorneys.find(a => a.firm.includes('Phillips'));
    if (phillips) return phillips;
  }
  
  // Cases with potential retaliation concerns → Zuckerman Law
  if (report.routing.anonymous) {
    const zuckerman = attorneys.find(a => a.firm.includes('Zuckerman'));
    if (zuckerman) return zuckerman;
  }
  
  // Default → Constantine Cannon (general qui tam expertise)
  const constantine = attorneys.find(a => a.firm.includes('Constantine'));
  if (constantine) return constantine;
  
  // Fallback to first available
  return attorneys[0];
}

/**
 * Get all relevant contacts for a report
 */
export function getAllReportContacts(
  report: SanctionsReport,
  estimatedViolationValue: number,
  riskLevel: RiskLevel
): {
  unions: {
    ibew: IBEWLocal | null;
    cwa: CWALocal | null;
    iuoe: IUOELocal | null;
    recommended: string;
  };
  attorney: AttorneyFirm;
  governmentChannels: {
    ofacHotline: string;
    fincenTips: string;
    secWhistleblower: string;
  };
} {
  const unions = routeToUnionLocal(report);
  const attorney = routeToAttorney(report, estimatedViolationValue, riskLevel);
  
  return {
    unions,
    attorney,
    governmentChannels: {
      ofacHotline: '1-800-540-6322',
      fincenTips: '1-800-767-2825',
      secWhistleblower: 'https://www.sec.gov/whistleblower',
    },
  };
}

/**
 * Get coalition summary for display
 */
export function getCoalitionSummary(): {
  ibewLocals: number;
  cwaLocals: number;
  iuoeLocals: number;
  totalCoverage: string[];
} {
  const allStates = new Set<string>();
  
  IBEW_LOCALS.forEach(l => l.coverage.forEach(s => allStates.add(s)));
  CWA_LOCALS.forEach(l => l.coverage.forEach(s => s !== 'ALL' && allStates.add(s)));
  IUOE_LOCALS.forEach(l => l.coverage.forEach(s => allStates.add(s)));
  
  return {
    ibewLocals: IBEW_LOCALS.length,
    cwaLocals: CWA_LOCALS.length,
    iuoeLocals: IUOE_LOCALS.length,
    totalCoverage: Array.from(allStates).sort(),
  };
}

