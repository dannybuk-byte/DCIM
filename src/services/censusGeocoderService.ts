/**
 * Census Geocoder Service
 * 
 * Provides coordinate-to-county FIPS code conversion using:
 * - Census Bureau Geocoder API (no API key required)
 * - FCC Census Block API (simpler, faster)
 * 
 * Features:
 * - Caching to reduce API calls
 * - Fallback between services
 * - Batch processing support
 * - County name resolution
 */

// ============================================================================
// TYPES
// ============================================================================

export interface CountyInfo {
  stateFips: string;      // 2-digit state FIPS (e.g., "51" for Virginia)
  countyFips: string;     // 3-digit county FIPS (e.g., "107" for Loudoun)
  fullFips: string;       // Combined 5-digit FIPS (e.g., "51107")
  stateName: string;
  stateAbbrev: string;
  countyName: string;
  censusTract?: string;
  censusBlock?: string;
}

export interface GeocoderResult {
  success: boolean;
  county?: CountyInfo;
  error?: string;
  source: 'census' | 'fcc' | 'cache';
  responseTime: number;
}

// ============================================================================
// STATE FIPS LOOKUP TABLE
// ============================================================================

const STATE_FIPS_MAP: Record<string, { name: string; abbrev: string }> = {
  '01': { name: 'Alabama', abbrev: 'AL' },
  '02': { name: 'Alaska', abbrev: 'AK' },
  '04': { name: 'Arizona', abbrev: 'AZ' },
  '05': { name: 'Arkansas', abbrev: 'AR' },
  '06': { name: 'California', abbrev: 'CA' },
  '08': { name: 'Colorado', abbrev: 'CO' },
  '09': { name: 'Connecticut', abbrev: 'CT' },
  '10': { name: 'Delaware', abbrev: 'DE' },
  '11': { name: 'District of Columbia', abbrev: 'DC' },
  '12': { name: 'Florida', abbrev: 'FL' },
  '13': { name: 'Georgia', abbrev: 'GA' },
  '15': { name: 'Hawaii', abbrev: 'HI' },
  '16': { name: 'Idaho', abbrev: 'ID' },
  '17': { name: 'Illinois', abbrev: 'IL' },
  '18': { name: 'Indiana', abbrev: 'IN' },
  '19': { name: 'Iowa', abbrev: 'IA' },
  '20': { name: 'Kansas', abbrev: 'KS' },
  '21': { name: 'Kentucky', abbrev: 'KY' },
  '22': { name: 'Louisiana', abbrev: 'LA' },
  '23': { name: 'Maine', abbrev: 'ME' },
  '24': { name: 'Maryland', abbrev: 'MD' },
  '25': { name: 'Massachusetts', abbrev: 'MA' },
  '26': { name: 'Michigan', abbrev: 'MI' },
  '27': { name: 'Minnesota', abbrev: 'MN' },
  '28': { name: 'Mississippi', abbrev: 'MS' },
  '29': { name: 'Missouri', abbrev: 'MO' },
  '30': { name: 'Montana', abbrev: 'MT' },
  '31': { name: 'Nebraska', abbrev: 'NE' },
  '32': { name: 'Nevada', abbrev: 'NV' },
  '33': { name: 'New Hampshire', abbrev: 'NH' },
  '34': { name: 'New Jersey', abbrev: 'NJ' },
  '35': { name: 'New Mexico', abbrev: 'NM' },
  '36': { name: 'New York', abbrev: 'NY' },
  '37': { name: 'North Carolina', abbrev: 'NC' },
  '38': { name: 'North Dakota', abbrev: 'ND' },
  '39': { name: 'Ohio', abbrev: 'OH' },
  '40': { name: 'Oklahoma', abbrev: 'OK' },
  '41': { name: 'Oregon', abbrev: 'OR' },
  '42': { name: 'Pennsylvania', abbrev: 'PA' },
  '44': { name: 'Rhode Island', abbrev: 'RI' },
  '45': { name: 'South Carolina', abbrev: 'SC' },
  '46': { name: 'South Dakota', abbrev: 'SD' },
  '47': { name: 'Tennessee', abbrev: 'TN' },
  '48': { name: 'Texas', abbrev: 'TX' },
  '49': { name: 'Utah', abbrev: 'UT' },
  '50': { name: 'Vermont', abbrev: 'VT' },
  '51': { name: 'Virginia', abbrev: 'VA' },
  '53': { name: 'Washington', abbrev: 'WA' },
  '54': { name: 'West Virginia', abbrev: 'WV' },
  '55': { name: 'Wisconsin', abbrev: 'WI' },
  '56': { name: 'Wyoming', abbrev: 'WY' },
  '72': { name: 'Puerto Rico', abbrev: 'PR' },
};

// ============================================================================
// CENSUS GEOCODER SERVICE
// ============================================================================

class CensusGeocoderService {
  private cache = new Map<string, CountyInfo>();
  private pendingRequests = new Map<string, Promise<GeocoderResult>>();
  private readonly CACHE_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Get county information from coordinates
   * Uses FCC API first (faster), falls back to Census API
   */
  async getCountyFromCoordinates(lat: number, lng: number): Promise<GeocoderResult> {
    const startTime = Date.now();
    const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        success: true,
        county: cached,
        source: 'cache',
        responseTime: Date.now() - startTime,
      };
    }

    // Deduplicate concurrent requests for same coordinates
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey)!;
    }

    const request = this.fetchCountyInfo(lat, lng, cacheKey, startTime);
    this.pendingRequests.set(cacheKey, request);

    try {
      const result = await request;
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Batch geocode multiple coordinates
   * Note: Census API batch endpoint doesn't support coordinate-to-geography
   * So we process sequentially with rate limiting
   */
  async batchGetCounties(
    coordinates: Array<{ lat: number; lng: number; id?: string }>,
    onProgress?: (completed: number, total: number) => void
  ): Promise<Map<string, GeocoderResult>> {
    const results = new Map<string, GeocoderResult>();
    const total = coordinates.length;
    
    for (let i = 0; i < coordinates.length; i++) {
      const coord = coordinates[i];
      const key = coord.id || `${coord.lat},${coord.lng}`;
      
      const result = await this.getCountyFromCoordinates(coord.lat, coord.lng);
      results.set(key, result);
      
      if (onProgress) {
        onProgress(i + 1, total);
      }
      
      // Rate limiting: 100ms between requests to be nice to free APIs
      if (i < coordinates.length - 1) {
        await this.sleep(100);
      }
    }
    
    return results;
  }

  /**
   * Get all counties in a state by FIPS code
   */
  getStateInfo(stateFips: string): { name: string; abbrev: string } | undefined {
    return STATE_FIPS_MAP[stateFips];
  }

  /**
   * Parse a 5-digit FIPS code into state and county components
   */
  parseFipsCode(fips: string): { stateFips: string; countyFips: string } | null {
    if (!fips || fips.length !== 5) return null;
    return {
      stateFips: fips.substring(0, 2),
      countyFips: fips.substring(2, 5),
    };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async fetchCountyInfo(
    lat: number, 
    lng: number, 
    cacheKey: string,
    startTime: number
  ): Promise<GeocoderResult> {
    // Try FCC API first (simpler and faster)
    try {
      const fccResult = await this.fetchFromFCC(lat, lng);
      if (fccResult) {
        this.cache.set(cacheKey, fccResult);
        return {
          success: true,
          county: fccResult,
          source: 'fcc',
          responseTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.warn('FCC API failed, trying Census API:', error);
    }

    // Fall back to Census Geocoder API
    try {
      const censusResult = await this.fetchFromCensus(lat, lng);
      if (censusResult) {
        this.cache.set(cacheKey, censusResult);
        return {
          success: true,
          county: censusResult,
          source: 'census',
          responseTime: Date.now() - startTime,
        };
      }
    } catch (error) {
      console.warn('Census API failed:', error);
    }

    return {
      success: false,
      error: 'Unable to resolve coordinates to county FIPS',
      source: 'fcc',
      responseTime: Date.now() - startTime,
    };
  }

  private async fetchFromFCC(lat: number, lng: number): Promise<CountyInfo | null> {
    const url = `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lng}&format=json`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`FCC API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.County?.FIPS || !data.State?.FIPS) {
      return null;
    }

    const stateFips = data.State.FIPS;
    const countyFips = data.County.FIPS.substring(2); // County FIPS includes state prefix
    const stateInfo = STATE_FIPS_MAP[stateFips];

    return {
      stateFips,
      countyFips,
      fullFips: data.County.FIPS,
      stateName: stateInfo?.name || data.State.name || 'Unknown',
      stateAbbrev: stateInfo?.abbrev || data.State.code || 'XX',
      countyName: data.County.name || 'Unknown',
      censusBlock: data.Block?.FIPS,
    };
  }

  private async fetchFromCensus(lat: number, lng: number): Promise<CountyInfo | null> {
    const url = new URL('https://geocoding.geo.census.gov/geocoder/geographies/coordinates');
    url.searchParams.set('x', lng.toString());
    url.searchParams.set('y', lat.toString());
    url.searchParams.set('benchmark', 'Public_AR_Current');
    url.searchParams.set('vintage', 'Current_Current');
    url.searchParams.set('format', 'json');

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Census API error: ${response.status}`);
    }

    const data = await response.json();
    
    const geographies = data.result?.geographies;
    if (!geographies) return null;

    // Extract county info from Census API response
    const counties = geographies['Counties'] || geographies['County'];
    const states = geographies['States'] || geographies['State'];
    const tracts = geographies['Census Tracts'] || geographies['Census Tract'];

    if (!counties?.[0] || !states?.[0]) {
      return null;
    }

    const county = counties[0];
    const state = states[0];
    const tract = tracts?.[0];
    const stateFips = state.STATE || state.STATEFP;
    const stateInfo = STATE_FIPS_MAP[stateFips];

    return {
      stateFips,
      countyFips: county.COUNTY || county.COUNTYFP,
      fullFips: `${stateFips}${county.COUNTY || county.COUNTYFP}`,
      stateName: stateInfo?.name || state.NAME || 'Unknown',
      stateAbbrev: stateInfo?.abbrev || 'XX',
      countyName: county.NAME || 'Unknown',
      censusTract: tract?.TRACT || tract?.TRACTCE,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear the cache (useful for testing or forcing refresh)
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Export singleton instance
export const censusGeocoderService = new CensusGeocoderService();

// Types are already exported at their definitions

