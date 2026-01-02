// EPA API Utilities
// Fetches environmental and regulatory data from EPA APIs

import { db } from '../db/database';
import { retry, isRetryableError } from '../utils/retry';
import { epaCircuitBreaker } from '../utils/circuitBreaker';
import { epaRateLimiter } from '../utils/rateLimiter';
import { validateFIPS } from '../utils/validation';

export interface EJScreenData {
  ejIndex: number;
  demographicIndex: number;
  supplementalIndexes: {
    trafficProximity?: number;
    wastewaterDischarge?: number;
    airToxics?: number;
  };
}

export interface ECHOFacility {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  permitType: string;
  complianceStatus: string;
  distance: number; // in miles
}

export interface NPDESPermit {
  permitId: string;
  facilityName: string;
  avgMonthlyDischarge: number | null; // gallons
  complianceStatus: string;
  permitType: string;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Get Environmental Justice Screen (EJScreen) data for a county
 * @param countyFips - 5-digit FIPS code
 * @returns EJScreen indicators
 */
export async function getEJScreenData(countyFips: string, signal?: AbortSignal): Promise<EJScreenData> {
  // Validate input
  if (!validateFIPS(countyFips, 5)) {
    throw new Error(`Invalid county FIPS code: ${countyFips}. Must be 5 digits.`);
  }

  // Check cache first (stale-while-revalidate)
  try {
    const cached = await db.communityContext.get(countyFips);
    if (cached && cached.ejIndex > 0) {
      const cacheAge = Date.now() - new Date(cached.updatedAt).getTime();
      if (cacheAge < CACHE_DURATION) {
        return {
          ejIndex: cached.ejIndex,
          demographicIndex: cached.ejIndex,
          supplementalIndexes: {}
        };
      }
      // Cache is stale, return it but refresh in background
      refreshEJScreenData(countyFips, signal).catch(console.error);
      return {
        ejIndex: cached.ejIndex,
        demographicIndex: cached.ejIndex,
        supplementalIndexes: {}
      };
    }
  } catch (error) {
    console.warn('Error reading EJScreen cache:', error);
  }

  // EJScreen API endpoint
  const url = `https://ejscreen.epa.gov/mapper/ejscreenRESTapi/getblockgroup?geography=county&geoid=${countyFips}`;

  try {
    // Rate limiting
    await epaRateLimiter.acquire();

    // Circuit breaker + retry
    const response = await epaCircuitBreaker.call(async () => {
      return retry(
        async () => {
          const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal,
          });
          if (!res.ok) {
            const error: any = new Error(`EJScreen API returned ${res.status}`);
            error.status = res.status;
            throw error;
          }
          return res;
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          retryable: isRetryableError,
        }
      );
    });

    if (!response.ok) {
      throw new Error(`EJScreen API returned ${response.status}`);
    }

    const data = await response.json();

    // EJScreen returns complex nested data - extract key indicators
    // This is a simplified extraction - actual structure may vary
    const ejIndex = data?.EJIndex || data?.demographics?.EJIndex || 0;
    const demographicIndex = data?.demographics?.demographicIndex || ejIndex;

    const result: EJScreenData = {
      ejIndex: typeof ejIndex === 'number' ? ejIndex : 0,
      demographicIndex: typeof demographicIndex === 'number' ? demographicIndex : 0,
      supplementalIndexes: {
        trafficProximity: data?.supplemental?.trafficProximity,
        wastewaterDischarge: data?.supplemental?.wastewaterDischarge,
        airToxics: data?.supplemental?.airToxics
      }
    };

    // Update cache
    try {
      const existing = await db.communityContext.get(countyFips);
      if (existing) {
        await db.communityContext.update(countyFips, {
          ejIndex: result.ejIndex,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (error) {
      console.warn('Error updating EJScreen cache:', error);
    }

    return result;
  } catch (error) {
    console.error('Error fetching EJScreen data:', error);
    
    // Graceful degradation: return cached data if available
    try {
      const cached = await db.communityContext.get(countyFips);
      if (cached && cached.ejIndex > 0) {
        console.warn('Using stale cached EJScreen data due to API failure');
        return {
          ejIndex: cached.ejIndex,
          demographicIndex: cached.ejIndex,
          supplementalIndexes: {}
        };
      }
    } catch (cacheError) {
      // Ignore cache errors
    }
    
    // Return default values rather than throwing - allow partial data
    return {
      ejIndex: 0,
      demographicIndex: 0,
      supplementalIndexes: {}
    };
  }
}

/**
 * Refresh EJScreen data in background
 */
async function refreshEJScreenData(countyFips: string, signal?: AbortSignal): Promise<void> {
  try {
    const url = `https://ejscreen.epa.gov/mapper/ejscreenRESTapi/getblockgroup?geography=county&geoid=${countyFips}`;
    await epaRateLimiter.acquire();
    
    const response = await epaCircuitBreaker.call(async () => {
      return retry(
        async () => {
          const res = await fetch(url, {
            headers: { 'Accept': 'application/json' },
            signal,
          });
          if (!res.ok) throw new Error(`EJScreen API returned ${res.status}`);
          return res;
        },
        { maxRetries: 2, initialDelay: 1000, retryable: isRetryableError }
      );
    });

    const data = await response.json();
    const ejIndex = data?.EJIndex || data?.demographics?.EJIndex || 0;

    const existing = await db.communityContext.get(countyFips);
    if (existing) {
      await db.communityContext.update(countyFips, {
        ejIndex: typeof ejIndex === 'number' ? ejIndex : 0,
        updatedAt: new Date().toISOString()
      });
    }
  } catch (error) {
    // Silent fail for background refresh
    console.warn('Background EJScreen refresh failed:', error);
  }
}

/**
 * Get EPA ECHO facilities near a location
 * @param zip - ZIP code
 * @param radius - Search radius in miles (default: 1)
 * @returns Array of EPA-regulated facilities
 */
export async function getECHOFacilities(zip: string, radius: number = 1): Promise<ECHOFacility[]> {
  const url = `https://echo.epa.gov/api/facilities?zip=${zip}&radius=${radius}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`ECHO API returned ${response.status}`);
    }

    const data = await response.json();

    if (!data || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((facility: any) => ({
      id: facility.FacilityID || facility.id || '',
      name: facility.FacilityName || facility.name || 'Unknown',
      address: facility.Address || '',
      city: facility.City || '',
      state: facility.State || '',
      zip: facility.ZIP || zip,
      permitType: facility.PermitType || 'Unknown',
      complianceStatus: facility.ComplianceStatus || 'Unknown',
      distance: facility.Distance || 0
    }));
  } catch (error) {
    console.error('Error fetching ECHO facilities:', error);
    return [];
  }
}

/**
 * Get NPDES (wastewater discharge) permit data for a facility
 * @param facilityId - Facility identifier (can be ECHO ID or other)
 * @returns NPDES permit information
 */
export async function getNPDESPermits(facilityId: string): Promise<NPDESPermit | null> {
  // ECHO API can be queried for NPDES permits
  const url = `https://echo.epa.gov/api/permit/npdes?facility_id=${facilityId}`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data || !data.results || data.results.length === 0) {
      return null;
    }

    const permit = data.results[0];

    return {
      permitId: permit.PermitNumber || permit.permitId || '',
      facilityName: permit.FacilityName || permit.facilityName || '',
      avgMonthlyDischarge: permit.AvgMonthlyDischarge || permit.avgMonthlyDischarge || null,
      complianceStatus: permit.ComplianceStatus || permit.complianceStatus || 'Unknown',
      permitType: 'NPDES'
    };
  } catch (error) {
    console.error('Error fetching NPDES permits:', error);
    return null;
  }
}

