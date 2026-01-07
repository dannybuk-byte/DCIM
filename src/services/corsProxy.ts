/**
 * CORS Proxy Service
 * 
 * Provides browser-safe access to government APIs that block CORS.
 * Uses multiple fallback strategies:
 * 1. Direct fetch (for APIs that allow CORS)
 * 2. Public CORS proxies (for development)
 * 3. Cloudflare Worker proxy (for production - you deploy this)
 * 
 * Government APIs integrated:
 * - EPA ECHO (Environmental Compliance)
 * - OSHA (Workplace Safety)
 * - SEC EDGAR (Financial Filings)
 * - Census Bureau (Demographics)
 * - BLS (Employment Data)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface ProxyResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  source: 'direct' | 'proxy' | 'cache' | 'fallback';
  cached?: boolean;
  timestamp: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

const CACHE_PREFIX = 'dcim_api_cache_';
const DEFAULT_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getCached<T>(key: string): T | null {
  try {
    const stored = localStorage.getItem(CACHE_PREFIX + key);
    if (!stored) return null;
    
    const entry: CacheEntry<T> = JSON.parse(stored);
    if (Date.now() - entry.timestamp > entry.ttl) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

function setCache<T>(key: string, data: T, ttl: number = DEFAULT_TTL): void {
  try {
    const entry: CacheEntry<T> = { data, timestamp: Date.now(), ttl };
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(entry));
  } catch {
    // Cache full or unavailable - silently fail
  }
}

// ============================================================================
// PROXY CONFIGURATION
// ============================================================================

// Public CORS proxies (for development only - rate limited)
const PUBLIC_PROXIES = [
  'https://corsproxy.io/?',
  'https://api.allorigins.win/raw?url=',
];

// Your Cloudflare Worker URL (deploy your own for production)
// See: /docs/cloudflare-worker-proxy.md for setup instructions
const CLOUDFLARE_WORKER_URL = import.meta.env.VITE_CORS_PROXY_URL || '';

// ============================================================================
// CORE PROXY FUNCTION
// ============================================================================

async function fetchWithProxy<T>(
  url: string,
  options: RequestInit = {},
  cacheKey?: string,
  ttl?: number
): Promise<ProxyResponse<T>> {
  // Check cache first
  if (cacheKey) {
    const cached = getCached<T>(cacheKey);
    if (cached) {
      return {
        success: true,
        data: cached,
        source: 'cache',
        cached: true,
        timestamp: Date.now(),
      };
    }
  }

  // Try direct fetch first (some APIs allow CORS)
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(10000),
    });
    
    if (response.ok) {
      const data = await response.json() as T;
      if (cacheKey) setCache(cacheKey, data, ttl);
      return {
        success: true,
        data,
        source: 'direct',
        timestamp: Date.now(),
      };
    }
  } catch {
    // Direct fetch failed - try proxy
  }

  // Try Cloudflare Worker proxy if configured
  if (CLOUDFLARE_WORKER_URL) {
    try {
      const proxyUrl = `${CLOUDFLARE_WORKER_URL}?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        ...options,
        signal: AbortSignal.timeout(15000),
      });
      
      if (response.ok) {
        const data = await response.json() as T;
        if (cacheKey) setCache(cacheKey, data, ttl);
        return {
          success: true,
          data,
          source: 'proxy',
          timestamp: Date.now(),
        };
      }
    } catch {
      // Cloudflare proxy failed
    }
  }

  // Try public proxies as last resort (development only)
  for (const proxy of PUBLIC_PROXIES) {
    try {
      const proxyUrl = `${proxy}${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl, {
        signal: AbortSignal.timeout(15000),
      });
      
      if (response.ok) {
        const data = await response.json() as T;
        if (cacheKey) setCache(cacheKey, data, ttl);
        return {
          success: true,
          data,
          source: 'proxy',
          timestamp: Date.now(),
        };
      }
    } catch {
      // This proxy failed, try next
    }
  }

  return {
    success: false,
    error: 'All fetch methods failed. API may be unavailable.',
    source: 'fallback',
    timestamp: Date.now(),
  };
}

// ============================================================================
// EPA ECHO API
// Environmental compliance data for facilities
// ============================================================================

export interface EPAFacility {
  FacilityName: string;
  FacilityId: string;
  RegistryID: string;
  City: string;
  State: string;
  Zip: string;
  EPARegion: string;
  Latitude: number;
  Longitude: number;
  // Compliance flags
  CWAPermitStatus?: string;
  CAASources?: string;
  RCRALandType?: string;
  // Violation counts
  CWAViolations3Yr?: number;
  CAAViolations3Yr?: number;
  RCRAViolations3Yr?: number;
  // Inspection dates
  LastCWAInspection?: string;
  LastCAAInspection?: string;
  LastRCRAInspection?: string;
}

export interface EPASearchResponse {
  Results: {
    FacilitySearch: EPAFacility[];
    TotalCount: number;
  };
}

/**
 * Search EPA ECHO for facilities in a location
 */
export async function searchEPAFacilities(
  state: string,
  city?: string
): Promise<ProxyResponse<EPAFacility[]>> {
  const baseUrl = 'https://echo.epa.gov/api/facilities';
  const params = new URLSearchParams({
    output: 'JSON',
    p_st: state,
    ...(city && { p_city: city }),
    p_act: 'Y', // Active facilities only
  });
  
  const url = `${baseUrl}?${params}`;
  const cacheKey = `epa_${state}_${city || 'all'}`;
  
  const response = await fetchWithProxy<EPASearchResponse>(url, {}, cacheKey);
  
  if (response.success && response.data) {
    return {
      ...response,
      data: response.data.Results?.FacilitySearch || [],
    };
  }
  
  return {
    success: false,
    error: response.error || 'Failed to fetch EPA data',
    source: 'fallback',
    data: [],
    timestamp: Date.now(),
  };
}

/**
 * Get detailed compliance info for an EPA facility
 */
export async function getEPAFacilityDetails(
  registryId: string
): Promise<ProxyResponse<EPAFacility>> {
  const url = `https://echo.epa.gov/api/facilities/${registryId}?output=JSON`;
  const cacheKey = `epa_detail_${registryId}`;
  
  return fetchWithProxy<EPAFacility>(url, {}, cacheKey);
}

// ============================================================================
// OSHA API
// Workplace safety violations and inspections
// ============================================================================

export interface OSHAInspection {
  activity_nr: string;
  reporting_id: string;
  state_flag: string;
  estab_name: string;
  site_address: string;
  site_city: string;
  site_state: string;
  site_zip: string;
  owner_type: string;
  owner_code: string;
  adv_notice: string;
  safety_hlth: string;
  sic_code: string;
  naics_code: string;
  insp_type: string;
  insp_scope: string;
  why_no_insp: string;
  union_status: string;
  nr_in_estab: number;
  open_date: string;
  case_mod_date: string;
  close_conf_date: string;
  close_case_date: string;
}

export interface OSHAViolation {
  activity_nr: string;
  citation_id: string;
  delete_flag: string;
  standard: string;
  viol_type: string;
  issuance_date: string;
  abate_date: string;
  abate_complete: string;
  current_penalty: number;
  initial_penalty: number;
  contest_date: string;
  final_order_date: string;
  nr_instances: number;
  nr_exposed: number;
  rec: string;
  gravity: string;
  emphasis: string;
  hazcat: string;
  fta_insp_nr: string;
  fta_issuance_date: string;
  fta_penalty: number;
  fta_contest_date: string;
  fta_final_order_date: string;
  hazsub1: string;
  hazsub2: string;
  hazsub3: string;
  hazsub4: string;
  hazsub5: string;
}

/**
 * Search OSHA inspections by establishment name
 * Uses the DOL API which is CORS-friendly
 */
export async function searchOSHAInspections(
  establishmentName: string,
  state?: string
): Promise<ProxyResponse<OSHAInspection[]>> {
  // DOL's API is actually CORS-friendly!
  const baseUrl = 'https://enforcedata.dol.gov/api/oshinsp';
  const params = new URLSearchParams({
    estab_name: `*${establishmentName}*`,
    ...(state && { site_state: state }),
  });
  
  const url = `${baseUrl}?${params}`;
  const cacheKey = `osha_insp_${establishmentName}_${state || 'all'}`;
  
  return fetchWithProxy<OSHAInspection[]>(url, {}, cacheKey, 7 * 24 * 60 * 60 * 1000); // 7 day cache
}

/**
 * Get OSHA violations for an inspection
 */
export async function getOSHAViolations(
  activityNumber: string
): Promise<ProxyResponse<OSHAViolation[]>> {
  const url = `https://enforcedata.dol.gov/api/oshiviol?activity_nr=${activityNumber}`;
  const cacheKey = `osha_viol_${activityNumber}`;
  
  return fetchWithProxy<OSHAViolation[]>(url, {}, cacheKey, 30 * 24 * 60 * 60 * 1000); // 30 day cache
}

// ============================================================================
// SEC EDGAR API
// Public company filings (10-K, 10-Q, 8-K)
// ============================================================================

export interface SECFiling {
  accessionNumber: string;
  filingDate: string;
  reportDate: string;
  acceptanceDateTime: string;
  act: string;
  form: string;
  fileNumber: string;
  filmNumber: string;
  items: string;
  size: number;
  isXBRL: boolean;
  isInlineXBRL: boolean;
  primaryDocument: string;
  primaryDocDescription: string;
}

export interface SECCompanyInfo {
  cik: string;
  entityType: string;
  sic: string;
  sicDescription: string;
  name: string;
  tickers: string[];
  exchanges: string[];
  category: string;
  fiscalYearEnd: string;
  stateOfIncorporation: string;
  filings: {
    recent: {
      accessionNumber: string[];
      filingDate: string[];
      reportDate: string[];
      form: string[];
      primaryDocument: string[];
    };
  };
}

/**
 * Get SEC filings for a company by CIK number
 * SEC's API is CORS-friendly!
 */
export async function getSECCompanyFilings(
  cik: string
): Promise<ProxyResponse<SECCompanyInfo>> {
  // Pad CIK to 10 digits
  const paddedCik = cik.padStart(10, '0');
  const url = `https://data.sec.gov/submissions/CIK${paddedCik}.json`;
  const cacheKey = `sec_${paddedCik}`;
  
  // SEC requires a User-Agent header
  return fetchWithProxy<SECCompanyInfo>(
    url,
    {
      headers: {
        'User-Agent': 'DCIM-Compliance-App contact@example.com',
      },
    },
    cacheKey,
    24 * 60 * 60 * 1000 // 24 hour cache
  );
}

// Known CIK numbers for major data center operators
export const OPERATOR_CIKS: Record<string, string> = {
  'Amazon': '1018724',
  'Microsoft': '789019',
  'Google': '1652044',
  'Meta': '1326801',
  'Apple': '320193',
  'Equinix': '1101239',
  'Digital Realty': '1297996',
  'CyrusOne': '1553708',
  'QTS Realty': '1531717',
  'CoreSite': '1490892',
  'Switch Inc': '1710518',
  'Iron Mountain': '1020569',
  'Vantage Data Centers': '1834755',
  'NTT': '1798935',
  'Oracle': '1341439',
};

// ============================================================================
// CENSUS BUREAU API
// Demographics and economic data
// ============================================================================

export interface CensusPopulation {
  state: string;
  county: string;
  name: string;
  population: number;
  medianIncome?: number;
  unemploymentRate?: number;
}

/**
 * Get population data for a county
 * Census API is CORS-friendly!
 */
export async function getCensusData(
  stateCode: string,
  countyCode?: string
): Promise<ProxyResponse<CensusPopulation[]>> {
  const baseUrl = 'https://api.census.gov/data/2022/acs/acs5';
  const params = new URLSearchParams({
    get: 'NAME,B01003_001E,B19013_001E',
    for: countyCode ? `county:${countyCode}` : 'county:*',
    in: `state:${stateCode}`,
    key: import.meta.env.VITE_CENSUS_API_KEY || '', // Optional API key
  });
  
  const url = `${baseUrl}?${params}`;
  const cacheKey = `census_${stateCode}_${countyCode || 'all'}`;
  
  const response = await fetchWithProxy<string[][]>(url, {}, cacheKey, 30 * 24 * 60 * 60 * 1000);
  
  if (response.success && response.data && Array.isArray(response.data)) {
    // Transform Census response to our format
    const [headers, ...rows] = response.data;
    const data: CensusPopulation[] = rows.map(row => ({
      name: row[0],
      population: parseInt(row[1]) || 0,
      medianIncome: parseInt(row[2]) || undefined,
      state: row[3],
      county: row[4],
    }));
    
    return {
      ...response,
      data,
    };
  }
  
  return {
    success: false,
    error: response.error || 'Failed to parse Census data',
    source: 'fallback',
    data: [],
    timestamp: Date.now(),
  };
}

// ============================================================================
// BLS API
// Employment and wage data
// ============================================================================

export interface BLSDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
  footnotes: Array<{ code: string; text: string }>;
}

export interface BLSSeriesResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: Array<{
      seriesID: string;
      data: BLSDataPoint[];
    }>;
  };
}

/**
 * Get employment data from BLS
 * BLS API is CORS-friendly!
 */
export async function getBLSEmploymentData(
  seriesId: string
): Promise<ProxyResponse<BLSDataPoint[]>> {
  const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/${seriesId}`;
  const cacheKey = `bls_${seriesId}`;
  
  const response = await fetchWithProxy<BLSSeriesResponse>(
    url,
    { method: 'GET' },
    cacheKey,
    7 * 24 * 60 * 60 * 1000 // 7 day cache
  );
  
  if (response.success && response.data?.Results?.series?.[0]?.data) {
    return {
      ...response,
      data: response.data.Results.series[0].data,
    };
  }
  
  return {
    success: false,
    error: response.error || 'Failed to fetch BLS data',
    source: 'fallback',
    data: [],
    timestamp: Date.now(),
  };
}

// ============================================================================
// EXPORT ALL
// ============================================================================

export const CORSProxy = {
  fetchWithProxy,
  // EPA
  searchEPAFacilities,
  getEPAFacilityDetails,
  // OSHA
  searchOSHAInspections,
  getOSHAViolations,
  // SEC
  getSECCompanyFilings,
  OPERATOR_CIKS,
  // Census
  getCensusData,
  // BLS
  getBLSEmploymentData,
};

export default CORSProxy;

