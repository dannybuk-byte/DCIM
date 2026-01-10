/**
 * EPA Facility Verification Service
 * 
 * Verifies data center facilities against EPA ECHO (Enforcement and Compliance History Online).
 * Browser-direct via JSONP — no proxy needed.
 * 
 * Verification signals:
 * - Facility exists in EPA registry (ground truth)
 * - Has environmental permits (Title V air, RCRA hazmat)
 * - Compliance history (violations, inspections)
 * 
 * NAICS 518210 = "Data Processing, Hosting, and Related Services"
 */

import { telemetryBus } from './telemetryBus';

export interface EPAFacility {
  registryId: string;
  facilityName: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zip?: string;
  latitude?: number;
  longitude?: number;
  naicsCode?: string;
  sicCode?: string;
  
  // Permits and compliance
  hasAirPermit: boolean;
  hasRcraPermit: boolean;
  caaCompliance?: 'In Compliance' | 'Violation' | 'Unknown';
  rcraCompliance?: 'In Compliance' | 'Violation' | 'Unknown';
  
  // Metadata
  lastInspectionDate?: string;
  totalViolations?: number;
  
  // Raw data for audit
  rawEchoData?: Record<string, unknown>;
}

export interface EPAVerificationResult {
  verified: boolean;
  confidence: number; // 0-1
  facilities: EPAFacility[];
  searchParams: {
    lat?: number;
    lng?: number;
    radiusMiles?: number;
    state?: string;
    naicsCode?: string;
  };
  timestamp: number;
  error?: string;
}

// EPA ECHO API base (supports JSONP for browser-direct access)
const EPA_ECHO_BASE = 'https://ofmpub.epa.gov/echo/echo_rest_services';

// NAICS code for data centers
const NAICS_DATA_CENTER = '518210';

/**
 * Parse EPA ECHO response into structured facilities
 */
function parseEchoFacilities(data: Record<string, unknown>): EPAFacility[] {
  const results = data.Results as Record<string, unknown> | undefined;
  if (!results) return [];
  
  const facilities = results.Facilities as Array<Record<string, unknown>> | undefined;
  if (!Array.isArray(facilities)) return [];
  
  return facilities.map((f): EPAFacility => ({
    registryId: String(f.RegistryID ?? f.FacilityID ?? ''),
    facilityName: String(f.FacilityName ?? 'Unknown'),
    streetAddress: f.StreetAddress as string | undefined,
    city: f.CityName as string | undefined,
    state: f.StateAbbr as string | undefined,
    zip: f.Zip as string | undefined,
    latitude: typeof f.Latitude === 'number' ? f.Latitude : parseFloat(String(f.Latitude ?? '')),
    longitude: typeof f.Longitude === 'number' ? f.Longitude : parseFloat(String(f.Longitude ?? '')),
    naicsCode: f.NAICSCode as string | undefined,
    sicCode: f.SICCode as string | undefined,
    
    hasAirPermit: Boolean(f.CAAFlag === 'Y' || f.AIRFlag === 'Y'),
    hasRcraPermit: Boolean(f.RCRAFlag === 'Y'),
    caaCompliance: parseCompliance(f.CAAComplianceStatus),
    rcraCompliance: parseCompliance(f.RCRAComplianceStatus),
    
    lastInspectionDate: f.LastInspection as string | undefined,
    totalViolations: typeof f.TotalViolations === 'number' ? f.TotalViolations : undefined,
    
    rawEchoData: f,
  }));
}

function parseCompliance(value: unknown): 'In Compliance' | 'Violation' | 'Unknown' {
  if (typeof value !== 'string') return 'Unknown';
  const v = value.toUpperCase();
  if (v.includes('COMPLIANCE') || v === 'NO VIOLATION') return 'In Compliance';
  if (v.includes('VIOLATION') || v.includes('SNC')) return 'Violation';
  return 'Unknown';
}

/**
 * Fetch EPA facilities via JSONP (browser-direct, no proxy)
 */
async function fetchEpaJsonp(endpoint: string, params: Record<string, string>): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    const callbackName = `epaCallback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('EPA JSONP request timeout'));
    }, 15000);
    
    const cleanup = () => {
      clearTimeout(timeout);
      delete (window as Record<string, unknown>)[callbackName];
      script.remove();
    };
    
    (window as Record<string, unknown>)[callbackName] = (data: Record<string, unknown>) => {
      cleanup();
      resolve(data);
    };
    
    const queryParams = new URLSearchParams({
      ...params,
      output: 'JSONP',
      callback: callbackName,
    });
    
    const script = document.createElement('script');
    script.src = `${EPA_ECHO_BASE}${endpoint}?${queryParams.toString()}`;
    script.onerror = () => {
      cleanup();
      reject(new Error('EPA JSONP script load failed'));
    };
    
    document.head.appendChild(script);
  });
}

/**
 * Search EPA ECHO for data center facilities by geographic radius
 */
export async function searchEpaByRadius(
  lat: number,
  lng: number,
  radiusMiles = 10,
): Promise<EPAVerificationResult> {
  const timestamp = Date.now();
  const searchParams = { lat, lng, radiusMiles, naicsCode: NAICS_DATA_CENTER };
  
  try {
    const data = await fetchEpaJsonp('/echo_rest_services.get_facility_info', {
      p_lat: String(lat),
      p_long: String(lng),
      p_rad: String(radiusMiles),
      p_ncs: NAICS_DATA_CENTER,
    });
    
    const facilities = parseEchoFacilities(data);
    const verified = facilities.length > 0;
    
    // Confidence based on number of matching facilities and permit coverage
    const confidence = facilities.length === 0 ? 0 :
      Math.min(1, 0.5 + (facilities.filter(f => f.hasAirPermit || f.hasRcraPermit).length / facilities.length) * 0.5);
    
    void telemetryBus.emit({
      source: 'epa',
      type: 'epa_verification',
      severity: 'info',
      payload: {
        verified,
        facilityCount: facilities.length,
        searchParams,
        confidence,
      },
    });
    
    return { verified, confidence, facilities, searchParams, timestamp };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    void telemetryBus.emit({
      source: 'epa',
      type: 'epa_verification_error',
      severity: 'medium',
      payload: { error: errorMsg, searchParams },
    });
    
    return {
      verified: false,
      confidence: 0,
      facilities: [],
      searchParams,
      timestamp,
      error: errorMsg,
    };
  }
}

/**
 * Search EPA ECHO for data center facilities by state
 */
export async function searchEpaByState(
  stateAbbr: string,
): Promise<EPAVerificationResult> {
  const timestamp = Date.now();
  const searchParams = { state: stateAbbr, naicsCode: NAICS_DATA_CENTER };
  
  try {
    const data = await fetchEpaJsonp('/echo_rest_services.get_facility_info', {
      p_st: stateAbbr.toUpperCase(),
      p_ncs: NAICS_DATA_CENTER,
    });
    
    const facilities = parseEchoFacilities(data);
    const verified = facilities.length > 0;
    const confidence = facilities.length === 0 ? 0 : Math.min(1, 0.3 + facilities.length * 0.01);
    
    return { verified, confidence, facilities, searchParams, timestamp };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    return {
      verified: false,
      confidence: 0,
      facilities: [],
      searchParams,
      timestamp,
      error: errorMsg,
    };
  }
}

/**
 * Verify a specific facility exists in EPA registry
 */
export async function verifyFacilityLocation(
  facilityName: string,
  lat: number,
  lng: number,
  toleranceMiles = 5,
): Promise<{
  verified: boolean;
  confidence: number;
  matchingFacility?: EPAFacility;
  allNearby: EPAFacility[];
}> {
  const result = await searchEpaByRadius(lat, lng, toleranceMiles);
  
  if (result.facilities.length === 0) {
    return { verified: false, confidence: 0, allNearby: [] };
  }
  
  // Fuzzy name match
  const normalizedName = facilityName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const matchingFacility = result.facilities.find(f => {
    const normalized = f.facilityName.toLowerCase().replace(/[^a-z0-9]/g, '');
    return normalized.includes(normalizedName) || normalizedName.includes(normalized);
  });
  
  if (matchingFacility) {
    return {
      verified: true,
      confidence: 0.9,
      matchingFacility,
      allNearby: result.facilities,
    };
  }
  
  // No name match but facilities exist nearby
  return {
    verified: false,
    confidence: 0.3, // Some confidence from proximity
    allNearby: result.facilities,
  };
}

/**
 * Check if a facility has required environmental permits
 */
export function assessPermitCoverage(facility: EPAFacility): {
  score: number; // 0-1
  hasAirPermit: boolean;
  hasHazmatPermit: boolean;
  complianceIssues: string[];
} {
  const complianceIssues: string[] = [];
  
  if (facility.caaCompliance === 'Violation') {
    complianceIssues.push('Clean Air Act violation');
  }
  if (facility.rcraCompliance === 'Violation') {
    complianceIssues.push('RCRA hazardous waste violation');
  }
  
  let score = 0.5; // Base score for existing in EPA
  if (facility.hasAirPermit) score += 0.2;
  if (facility.hasRcraPermit) score += 0.2;
  if (complianceIssues.length === 0) score += 0.1;
  
  return {
    score: Math.min(1, score),
    hasAirPermit: facility.hasAirPermit,
    hasHazmatPermit: facility.hasRcraPermit,
    complianceIssues,
  };
}
