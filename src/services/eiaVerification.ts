/**
 * EIA Energy Verification Service
 * 
 * Verifies data center regional energy patterns via EIA (Energy Information Administration).
 * Uses Cloudflare Worker proxy to protect API key.
 * 
 * Verification signals:
 * - Regional electricity demand patterns (high baseload = data center presence)
 * - Load factor analysis (data centers have >80% load factor vs residential peaks)
 * - Balancing authority data (PJM, ERCOT, CAISO = high DC concentration)
 */

import { apiUrl, getApiBaseUrl } from '../config/apiBase';
import { fetchWithRateLimit } from '../utils/rateLimitedFetch';
import { telemetryBus } from './telemetryBus';

export interface EIADemandData {
  period: string;
  respondent: string;
  respondentName: string;
  value: number;
  units: string;
}

export interface EIALoadAnalysis {
  balancingAuthority: string;
  loadFactor: number; // 0-1, higher = more baseload (data center signature)
  baseloadMW: number;
  peakDemandMW: number;
  averageDemandMW: number;
  dataCenterSignature: 'strong' | 'moderate' | 'weak' | 'none';
  confidence: number;
  dataPoints: number;
}

export interface EIAVerificationResult {
  verified: boolean;
  confidence: number;
  analysis: EIALoadAnalysis | null;
  rawData: EIADemandData[];
  timestamp: number;
  error?: string;
}

// Balancing authorities with known high data center concentration
const HIGH_DC_REGIONS: Record<string, string> = {
  'PJM': 'Mid-Atlantic (Northern Virginia)',
  'ERCO': 'Texas (Dallas, San Antonio)',
  'CISO': 'California (Bay Area, LA)',
  'MISO': 'Midwest (Chicago, Columbus)',
  'ISNE': 'New England (Boston)',
};

/**
 * Check if EIA proxy is available
 */
export function isEiaProxyConfigured(): boolean {
  return getApiBaseUrl() !== '';
}

/**
 * Fetch hourly demand data from EIA via proxy
 */
export async function fetchRegionalDemand(
  balancingAuthority: string,
  hours = 168, // 7 days default
): Promise<EIAVerificationResult> {
  const timestamp = Date.now();
  
  if (!isEiaProxyConfigured()) {
    return {
      verified: false,
      confidence: 0,
      analysis: null,
      rawData: [],
      timestamp,
      error: 'EIA proxy not configured (set VITE_API_BASE_URL)',
    };
  }
  
  try {
    const params = new URLSearchParams({
      frequency: 'hourly',
      'data[0]': 'value',
      'facets[respondent][]': balancingAuthority.toUpperCase(),
      'sort[0][column]': 'period',
      'sort[0][direction]': 'desc',
      length: String(hours),
    });
    
    const url = apiUrl(`/api/eia/electricity/rto/region-data/data?${params.toString()}`);
    const response = await fetchWithRateLimit('eia', url, {
      headers: { 'Accept': 'application/json' },
    });
    
    if (!response.ok) {
      throw new Error(`EIA API returned ${response.status}`);
    }
    
    const json = await response.json() as { response?: { data?: EIADemandData[] } };
    const rawData = json.response?.data ?? [];
    
    if (rawData.length === 0) {
      return {
        verified: false,
        confidence: 0,
        analysis: null,
        rawData: [],
        timestamp,
        error: 'No data returned from EIA',
      };
    }
    
    const analysis = analyzeLoadPattern(balancingAuthority, rawData);
    const verified = analysis.dataCenterSignature !== 'none';
    
    void telemetryBus.emit({
      source: 'eia',
      type: 'eia_verification',
      severity: 'info',
      payload: {
        balancingAuthority,
        loadFactor: analysis.loadFactor,
        dataCenterSignature: analysis.dataCenterSignature,
        confidence: analysis.confidence,
        dataPoints: rawData.length,
      },
    });
    
    return {
      verified,
      confidence: analysis.confidence,
      analysis,
      rawData,
      timestamp,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    
    void telemetryBus.emit({
      source: 'eia',
      type: 'eia_verification_error',
      severity: 'medium',
      payload: { balancingAuthority, error: errorMsg },
    });
    
    return {
      verified: false,
      confidence: 0,
      analysis: null,
      rawData: [],
      timestamp,
      error: errorMsg,
    };
  }
}

/**
 * Analyze load pattern to detect data center signature
 */
function analyzeLoadPattern(
  balancingAuthority: string,
  data: EIADemandData[],
): EIALoadAnalysis {
  const values = data
    .map(d => typeof d.value === 'number' ? d.value : parseFloat(String(d.value)))
    .filter(v => !isNaN(v) && v > 0);
  
  if (values.length === 0) {
    return {
      balancingAuthority,
      loadFactor: 0,
      baseloadMW: 0,
      peakDemandMW: 0,
      averageDemandMW: 0,
      dataCenterSignature: 'none',
      confidence: 0,
      dataPoints: 0,
    };
  }
  
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const loadFactor = max > 0 ? min / max : 0;
  
  // Data center signature detection:
  // - Load factor > 0.85 = strong (very flat demand, typical of DC-heavy regions)
  // - Load factor > 0.70 = moderate
  // - Load factor > 0.55 = weak
  // - Load factor <= 0.55 = none (typical residential/industrial mix)
  let dataCenterSignature: EIALoadAnalysis['dataCenterSignature'];
  let confidence: number;
  
  if (loadFactor > 0.85) {
    dataCenterSignature = 'strong';
    confidence = 0.9;
  } else if (loadFactor > 0.70) {
    dataCenterSignature = 'moderate';
    confidence = 0.7;
  } else if (loadFactor > 0.55) {
    dataCenterSignature = 'weak';
    confidence = 0.4;
  } else {
    dataCenterSignature = 'none';
    confidence = 0.2;
  }
  
  // Boost confidence if in known high-DC region
  if (balancingAuthority.toUpperCase() in HIGH_DC_REGIONS) {
    confidence = Math.min(1, confidence + 0.1);
  }
  
  return {
    balancingAuthority,
    loadFactor,
    baseloadMW: min,
    peakDemandMW: max,
    averageDemandMW: avg,
    dataCenterSignature,
    confidence,
    dataPoints: values.length,
  };
}

/**
 * Get known data center regions
 */
export function getHighDCRegions(): Record<string, string> {
  return { ...HIGH_DC_REGIONS };
}

/**
 * Quick check if a state is in a high-DC balancing authority
 */
export function getBalancingAuthorityForState(stateAbbr: string): string | null {
  const stateToBA: Record<string, string> = {
    'VA': 'PJM',
    'MD': 'PJM',
    'PA': 'PJM',
    'NJ': 'PJM',
    'DE': 'PJM',
    'DC': 'PJM',
    'OH': 'PJM',
    'TX': 'ERCO',
    'CA': 'CISO',
    'IL': 'MISO',
    'IN': 'MISO',
    'MI': 'MISO',
    'WI': 'MISO',
    'MA': 'ISNE',
    'CT': 'ISNE',
    'NH': 'ISNE',
    'VT': 'ISNE',
    'ME': 'ISNE',
    'RI': 'ISNE',
  };
  return stateToBA[stateAbbr.toUpperCase()] ?? null;
}

/**
 * Verify a facility's region has data center energy signature
 */
export async function verifyFacilityRegion(
  stateAbbr: string,
): Promise<EIAVerificationResult> {
  const ba = getBalancingAuthorityForState(stateAbbr);
  
  if (!ba) {
    return {
      verified: false,
      confidence: 0.1, // Low confidence for unknown regions
      analysis: null,
      rawData: [],
      timestamp: Date.now(),
      error: `No balancing authority mapping for state: ${stateAbbr}`,
    };
  }
  
  return fetchRegionalDemand(ba);
}
