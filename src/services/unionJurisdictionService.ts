/**
 * Union Jurisdiction Service
 * 
 * Maps geographic coordinates to union local jurisdictions for:
 * - IBEW (International Brotherhood of Electrical Workers) - Electrical systems
 * - SMART (Sheet Metal, Air, Rail & Transportation Workers) - HVAC/cooling
 * - UA (United Association) - Pipefitters/plumbers
 * - IUOE (International Union of Operating Engineers) - Equipment operators
 * 
 * Data center construction typically involves 45-70% electrical work (IBEW),
 * significant HVAC (SMART), and cooling piping (UA).
 * 
 * Features:
 * - County FIPS to union local mapping
 * - Multi-union lookup for data center projects
 * - Lazy loading of jurisdiction data
 * - Contact information for organizing
 */

import { censusGeocoderService, CountyInfo } from './censusGeocoderService';

// ============================================================================
// TYPES
// ============================================================================

export type UnionType = 'IBEW' | 'SMART' | 'UA' | 'IUOE' | 'CWA';

export interface UnionLocal {
  id: string;
  unionType: UnionType;
  localNumber: string;
  displayName: string;
  city?: string;
  state: string;
  phone?: string;
  website?: string;
  email?: string;
  address?: string;
  memberCount?: number;
  dataCenterExperience?: boolean;
  notes?: string;
  // Jurisdiction
  jurisdictionFips: string[]; // County FIPS codes covered
  jurisdictionDescription?: string;
}

export interface JurisdictionLookupResult {
  county: CountyInfo;
  unions: {
    ibew?: UnionLocal;
    smart?: UnionLocal;
    ua?: UnionLocal;
    iuoe?: UnionLocal;
    cwa?: UnionLocal;
  };
  allLocals: UnionLocal[];
  dataCenterSpecialists: UnionLocal[];
}

// ============================================================================
// MAJOR DATA CENTER CORRIDOR JURISDICTION DATA
// This data is manually digitized from IBEW PDF maps and union websites
// Priority corridors: NoVA, Columbus OH, Phoenix AZ, Dallas TX, Chicago IL
// ============================================================================

const UNION_JURISDICTION_DATABASE: UnionLocal[] = [
  // ==========================================================================
  // NORTHERN VIRGINIA / DC METRO (World's largest data center market)
  // ==========================================================================
  
  // IBEW Local 26 - Covers Loudoun County (largest DC market in world)
  {
    id: 'ibew-26',
    unionType: 'IBEW',
    localNumber: '26',
    displayName: 'IBEW Local 26',
    city: 'Lanham',
    state: 'MD',
    phone: '(301) 459-2900',
    website: 'https://www.ibew26.org',
    address: '4371 Parliament Place, Lanham, MD 20706',
    memberCount: 12000,
    dataCenterExperience: true,
    notes: 'Primary data center corridor union. Grown from 7,500 to 12,000 members due to DC work.',
    jurisdictionFips: [
      '51013', // Arlington County, VA
      '51059', // Fairfax County, VA
      '51107', // Loudoun County, VA (LARGEST DC MARKET)
      '51153', // Prince William County, VA
      '51179', // Stafford County, VA
      '51510', // Alexandria City, VA
      '51600', // Fairfax City, VA
      '51610', // Falls Church City, VA
      '51683', // Manassas City, VA
      '51685', // Manassas Park City, VA
      '11001', // District of Columbia
      '24031', // Montgomery County, MD
      '24033', // Prince George's County, MD
    ],
    jurisdictionDescription: 'Northern Virginia, DC, and Maryland suburbs',
  },
  
  // SMART Local 100 - DC Metro HVAC/Sheet Metal
  {
    id: 'smart-100',
    unionType: 'SMART',
    localNumber: '100',
    displayName: 'SMART Local 100',
    city: 'Washington',
    state: 'DC',
    phone: '(202) 675-6960',
    website: 'https://www.smartlocal100.org',
    memberCount: 3500,
    dataCenterExperience: true,
    notes: 'Data center cooling systems and HVAC ductwork',
    jurisdictionFips: [
      '51107', // Loudoun County, VA
      '51059', // Fairfax County, VA
      '51013', // Arlington County, VA
      '51153', // Prince William County, VA
      '11001', // DC
      '24031', // Montgomery County, MD
      '24033', // Prince George's County, MD
    ],
    jurisdictionDescription: 'DC Metro HVAC and cooling systems',
  },
  
  // UA Local 602 - DC Metro Pipefitters
  {
    id: 'ua-602',
    unionType: 'UA',
    localNumber: '602',
    displayName: 'UA Local 602',
    city: 'Forestville',
    state: 'MD',
    phone: '(301) 967-3400',
    website: 'https://www.ualocal602.org',
    memberCount: 2800,
    dataCenterExperience: true,
    notes: 'Cooling piping and mechanical systems for data centers',
    jurisdictionFips: [
      '51107', // Loudoun County, VA
      '51059', // Fairfax County, VA
      '51013', // Arlington County, VA
      '51153', // Prince William County, VA
      '11001', // DC
      '24031', // Montgomery County, MD
      '24033', // Prince George's County, MD
    ],
    jurisdictionDescription: 'DC Metro piping and mechanical',
  },
  
  // IUOE Local 99 - DC Metro Operating Engineers
  {
    id: 'iuoe-99',
    unionType: 'IUOE',
    localNumber: '99',
    displayName: 'IUOE Local 99',
    city: 'Capitol Heights',
    state: 'MD',
    phone: '(301) 499-7575',
    website: 'https://www.iuoelocal99.org',
    memberCount: 4000,
    dataCenterExperience: true,
    notes: 'Stationary engineers and building operations',
    jurisdictionFips: [
      '51107', '51059', '51013', '51153', '11001', '24031', '24033',
    ],
    jurisdictionDescription: 'DC Metro building operations',
  },

  // ==========================================================================
  // COLUMBUS, OHIO (Major hyperscaler hub)
  // ==========================================================================
  
  {
    id: 'ibew-683',
    unionType: 'IBEW',
    localNumber: '683',
    displayName: 'IBEW Local 683',
    city: 'Columbus',
    state: 'OH',
    phone: '(614) 252-2788',
    website: 'https://www.ibew683.org',
    memberCount: 1800,
    dataCenterExperience: true,
    notes: 'Google, Amazon, Meta data center construction',
    jurisdictionFips: [
      '39049', // Franklin County (Columbus)
      '39041', // Delaware County
      '39089', // Licking County
      '39117', // Morrow County
      '39159', // Union County
    ],
    jurisdictionDescription: 'Columbus metro area',
  },
  
  {
    id: 'smart-24',
    unionType: 'SMART',
    localNumber: '24',
    displayName: 'SMART Local 24',
    city: 'Columbus',
    state: 'OH',
    phone: '(614) 351-9330',
    memberCount: 1200,
    dataCenterExperience: true,
    jurisdictionFips: ['39049', '39041', '39089', '39159'],
    jurisdictionDescription: 'Central Ohio HVAC',
  },
  
  {
    id: 'ua-189',
    unionType: 'UA',
    localNumber: '189',
    displayName: 'UA Local 189',
    city: 'Columbus',
    state: 'OH',
    phone: '(614) 875-4082',
    memberCount: 1400,
    dataCenterExperience: true,
    jurisdictionFips: ['39049', '39041', '39089', '39159'],
    jurisdictionDescription: 'Central Ohio pipefitters',
  },

  // ==========================================================================
  // PHOENIX, ARIZONA (Rapidly growing DC market)
  // ==========================================================================
  
  {
    id: 'ibew-640',
    unionType: 'IBEW',
    localNumber: '640',
    displayName: 'IBEW Local 640',
    city: 'Phoenix',
    state: 'AZ',
    phone: '(602) 264-0111',
    website: 'https://www.ibew640.org',
    memberCount: 4500,
    dataCenterExperience: true,
    notes: 'Microsoft, Apple, Google Arizona data centers',
    jurisdictionFips: [
      '04013', // Maricopa County (Phoenix metro)
    ],
    jurisdictionDescription: 'Maricopa County / Phoenix metro',
  },
  
  {
    id: 'smart-359',
    unionType: 'SMART',
    localNumber: '359',
    displayName: 'SMART Local 359',
    city: 'Phoenix',
    state: 'AZ',
    phone: '(602) 269-3478',
    memberCount: 1800,
    dataCenterExperience: true,
    jurisdictionFips: ['04013'],
    jurisdictionDescription: 'Phoenix HVAC and cooling',
  },
  
  {
    id: 'ua-469',
    unionType: 'UA',
    localNumber: '469',
    displayName: 'UA Local 469',
    city: 'Phoenix',
    state: 'AZ',
    phone: '(602) 278-2555',
    website: 'https://www.ualocal469.com',
    memberCount: 3500,
    dataCenterExperience: true,
    jurisdictionFips: ['04013'],
    jurisdictionDescription: 'Phoenix pipefitters',
  },

  // ==========================================================================
  // DALLAS-FORT WORTH, TEXAS
  // ==========================================================================
  
  {
    id: 'ibew-20',
    unionType: 'IBEW',
    localNumber: '20',
    displayName: 'IBEW Local 20',
    city: 'Dallas',
    state: 'TX',
    phone: '(214) 827-8818',
    website: 'https://www.ibew20.org',
    memberCount: 1500,
    dataCenterExperience: true,
    jurisdictionFips: [
      '48113', // Dallas County
      '48439', // Tarrant County
      '48085', // Collin County
      '48121', // Denton County
      '48257', // Kaufman County
      '48397', // Rockwall County
    ],
    jurisdictionDescription: 'Dallas-Fort Worth metro',
  },
  
  {
    id: 'smart-68',
    unionType: 'SMART',
    localNumber: '68',
    displayName: 'SMART Local 68',
    city: 'Dallas',
    state: 'TX',
    phone: '(214) 339-5611',
    memberCount: 800,
    dataCenterExperience: true,
    jurisdictionFips: ['48113', '48439', '48085', '48121'],
    jurisdictionDescription: 'Dallas-Fort Worth HVAC',
  },
  
  {
    id: 'ua-100',
    unionType: 'UA',
    localNumber: '100',
    displayName: 'UA Local 100',
    city: 'Dallas',
    state: 'TX',
    phone: '(972) 263-2191',
    memberCount: 1100,
    dataCenterExperience: true,
    jurisdictionFips: ['48113', '48439', '48085', '48121'],
    jurisdictionDescription: 'Dallas-Fort Worth pipefitters',
  },

  // ==========================================================================
  // CHICAGO, ILLINOIS
  // ==========================================================================
  
  {
    id: 'ibew-134',
    unionType: 'IBEW',
    localNumber: '134',
    displayName: 'IBEW Local 134',
    city: 'Chicago',
    state: 'IL',
    phone: '(312) 454-1340',
    website: 'https://www.ibew134.org',
    memberCount: 8500,
    dataCenterExperience: true,
    notes: 'One of the largest IBEW locals in the country',
    jurisdictionFips: [
      '17031', // Cook County
    ],
    jurisdictionDescription: 'Cook County / Chicago',
  },
  
  {
    id: 'smart-73',
    unionType: 'SMART',
    localNumber: '73',
    displayName: 'SMART Local 73',
    city: 'Chicago',
    state: 'IL',
    phone: '(708) 795-9473',
    memberCount: 2200,
    dataCenterExperience: true,
    jurisdictionFips: ['17031'],
    jurisdictionDescription: 'Chicago HVAC',
  },
  
  {
    id: 'ua-597',
    unionType: 'UA',
    localNumber: '597',
    displayName: 'UA Local 597',
    city: 'Chicago',
    state: 'IL',
    phone: '(847) 676-4323',
    website: 'https://www.ualocal597.org',
    memberCount: 4500,
    dataCenterExperience: true,
    jurisdictionFips: ['17031'],
    jurisdictionDescription: 'Chicago pipefitters',
  },

  // ==========================================================================
  // NEW MEXICO (Meta Los Lunas)
  // ==========================================================================
  
  {
    id: 'ibew-611',
    unionType: 'IBEW',
    localNumber: '611',
    displayName: 'IBEW Local 611',
    city: 'Albuquerque',
    state: 'NM',
    phone: '(505) 242-5723',
    website: 'https://www.ibew611.org',
    memberCount: 1200,
    dataCenterExperience: true,
    notes: 'Meta Los Lunas data center construction',
    jurisdictionFips: [
      '35001', // Bernalillo County (Albuquerque)
      '35061', // Valencia County (Los Lunas)
      '35043', // Sandoval County
      '35057', // Torrance County
    ],
    jurisdictionDescription: 'Central New Mexico',
  },
  
  {
    id: 'ua-412',
    unionType: 'UA',
    localNumber: '412',
    displayName: 'UA Local 412',
    city: 'Albuquerque',
    state: 'NM',
    phone: '(505) 884-1700',
    memberCount: 800,
    dataCenterExperience: true,
    notes: 'Meta Los Lunas facility cooling systems',
    jurisdictionFips: ['35001', '35061', '35043'],
    jurisdictionDescription: 'New Mexico pipefitters',
  },

  // ==========================================================================
  // ATLANTA, GEORGIA
  // ==========================================================================
  
  {
    id: 'ibew-613',
    unionType: 'IBEW',
    localNumber: '613',
    displayName: 'IBEW Local 613',
    city: 'Atlanta',
    state: 'GA',
    phone: '(404) 321-2420',
    website: 'https://www.ibew613.org',
    memberCount: 2500,
    dataCenterExperience: true,
    jurisdictionFips: [
      '13121', // Fulton County
      '13089', // DeKalb County
      '13067', // Cobb County
      '13135', // Gwinnett County
      '13063', // Clayton County
    ],
    jurisdictionDescription: 'Metro Atlanta',
  },
  
  {
    id: 'smart-85',
    unionType: 'SMART',
    localNumber: '85',
    displayName: 'SMART Local 85',
    city: 'Atlanta',
    state: 'GA',
    phone: '(770) 441-3900',
    memberCount: 1100,
    dataCenterExperience: true,
    notes: 'Explicitly lists data centers as primary work sector',
    jurisdictionFips: ['13121', '13089', '13067', '13135'],
    jurisdictionDescription: 'Georgia HVAC',
  },

  // ==========================================================================
  // PORTLAND, OREGON
  // ==========================================================================
  
  {
    id: 'ibew-48',
    unionType: 'IBEW',
    localNumber: '48',
    displayName: 'IBEW Local 48',
    city: 'Portland',
    state: 'OR',
    phone: '(503) 256-4848',
    website: 'https://www.ibew48.com',
    memberCount: 4000,
    dataCenterExperience: true,
    notes: 'Large jurisdiction covering 32+ Oregon counties and SW Washington',
    jurisdictionFips: [
      '41051', // Multnomah County
      '41005', // Clackamas County
      '41067', // Washington County
      '41009', // Columbia County
      '53011', // Clark County, WA
    ],
    jurisdictionDescription: 'Oregon and SW Washington',
  },

  // ==========================================================================
  // CWA - Technology Worker Unions
  // ==========================================================================
  
  {
    id: 'cwa-1400',
    unionType: 'CWA',
    localNumber: '1400',
    displayName: 'Alphabet Workers Union - CWA Local 1400',
    city: 'New York',
    state: 'NY',
    phone: '',
    website: 'https://www.alphabetworkersunion.org',
    memberCount: 1400,
    dataCenterExperience: true,
    notes: 'Wall-to-wall pre-majority union including Google data center workers. Won victories on COVID hazard pay.',
    jurisdictionFips: [], // National jurisdiction
    jurisdictionDescription: 'All Alphabet/Google workers nationally',
  },
];

// ============================================================================
// UNION JURISDICTION SERVICE
// ============================================================================

class UnionJurisdictionService {
  private jurisdictionCache = new Map<string, JurisdictionLookupResult>();

  /**
   * Look up union jurisdiction from coordinates
   */
  async lookupByCoordinates(lat: number, lng: number): Promise<JurisdictionLookupResult | null> {
    // Get county FIPS from coordinates
    const geoResult = await censusGeocoderService.getCountyFromCoordinates(lat, lng);
    
    if (!geoResult.success || !geoResult.county) {
      return null;
    }

    return this.lookupByFips(geoResult.county.fullFips, geoResult.county);
  }

  /**
   * Look up union jurisdiction by county FIPS code
   */
  lookupByFips(fips: string, countyInfo?: CountyInfo): JurisdictionLookupResult | null {
    // Check cache
    const cached = this.jurisdictionCache.get(fips);
    if (cached) return cached;

    // Find all unions with jurisdiction in this county
    const matchingUnions = UNION_JURISDICTION_DATABASE.filter(union =>
      union.jurisdictionFips.includes(fips)
    );

    if (matchingUnions.length === 0 && !countyInfo) {
      return null;
    }

    // Group by union type
    const unions: JurisdictionLookupResult['unions'] = {};
    matchingUnions.forEach(union => {
      const key = union.unionType.toLowerCase() as keyof JurisdictionLookupResult['unions'];
      if (!unions[key]) {
        unions[key] = union;
      }
    });

    // Identify data center specialists
    const dataCenterSpecialists = matchingUnions.filter(u => u.dataCenterExperience);

    const result: JurisdictionLookupResult = {
      county: countyInfo || {
        stateFips: fips.substring(0, 2),
        countyFips: fips.substring(2, 5),
        fullFips: fips,
        stateName: 'Unknown',
        stateAbbrev: 'XX',
        countyName: 'Unknown',
      },
      unions,
      allLocals: matchingUnions,
      dataCenterSpecialists,
    };

    // Cache the result
    this.jurisdictionCache.set(fips, result);

    return result;
  }

  /**
   * Get all union locals of a specific type
   */
  getUnionsByType(unionType: UnionType): UnionLocal[] {
    return UNION_JURISDICTION_DATABASE.filter(u => u.unionType === unionType);
  }

  /**
   * Get all data center experienced locals
   */
  getDataCenterLocals(): UnionLocal[] {
    return UNION_JURISDICTION_DATABASE.filter(u => u.dataCenterExperience);
  }

  /**
   * Search union locals by state
   */
  getUnionsByState(stateAbbrev: string): UnionLocal[] {
    return UNION_JURISDICTION_DATABASE.filter(u => 
      u.state.toUpperCase() === stateAbbrev.toUpperCase()
    );
  }

  /**
   * Get all covered county FIPS codes
   */
  getAllCoveredCounties(): string[] {
    const allFips = new Set<string>();
    UNION_JURISDICTION_DATABASE.forEach(union => {
      union.jurisdictionFips.forEach(fips => allFips.add(fips));
    });
    return Array.from(allFips);
  }

  /**
   * Check if a county has union coverage
   */
  hasUnionCoverage(fips: string): boolean {
    return UNION_JURISDICTION_DATABASE.some(union =>
      union.jurisdictionFips.includes(fips)
    );
  }

  /**
   * Get statistics about the jurisdiction database
   */
  getDatabaseStats(): {
    totalLocals: number;
    byType: Record<UnionType, number>;
    totalCounties: number;
    dataCenterSpecialists: number;
    states: string[];
  } {
    const byType: Record<UnionType, number> = {
      IBEW: 0,
      SMART: 0,
      UA: 0,
      IUOE: 0,
      CWA: 0,
    };

    UNION_JURISDICTION_DATABASE.forEach(union => {
      byType[union.unionType]++;
    });

    const states = [...new Set(UNION_JURISDICTION_DATABASE.map(u => u.state))];

    return {
      totalLocals: UNION_JURISDICTION_DATABASE.length,
      byType,
      totalCounties: this.getAllCoveredCounties().length,
      dataCenterSpecialists: this.getDataCenterLocals().length,
      states,
    };
  }

  /**
   * Clear the lookup cache
   */
  clearCache(): void {
    this.jurisdictionCache.clear();
  }

  /**
   * Export jurisdiction data for external analysis
   */
  exportJurisdictionData(): UnionLocal[] {
    return [...UNION_JURISDICTION_DATABASE];
  }

  /**
   * Import additional jurisdiction data (for PDF parsing results)
   */
  importJurisdictionData(locals: UnionLocal[]): void {
    locals.forEach(local => {
      // Check if we already have this local
      const existingIndex = UNION_JURISDICTION_DATABASE.findIndex(
        u => u.id === local.id || 
            (u.unionType === local.unionType && u.localNumber === local.localNumber)
      );
      
      if (existingIndex >= 0) {
        // Merge jurisdiction FIPS codes
        const existing = UNION_JURISDICTION_DATABASE[existingIndex];
        const mergedFips = [...new Set([...existing.jurisdictionFips, ...local.jurisdictionFips])];
        UNION_JURISDICTION_DATABASE[existingIndex] = {
          ...existing,
          ...local,
          jurisdictionFips: mergedFips,
        };
      } else {
        UNION_JURISDICTION_DATABASE.push(local);
      }
    });
    
    // Clear cache after import
    this.clearCache();
  }
}

// Export singleton instance
export const unionJurisdictionService = new UnionJurisdictionService();

// Export the raw database for direct access if needed
export { UNION_JURISDICTION_DATABASE };

// Export types
export type { UnionLocal, JurisdictionLookupResult, UnionType };

