// BLS (Bureau of Labor Statistics) API Utility
// Fetches employment and wage data from BLS public API

export interface QCEWDataPoint {
  year: number;
  quarter: number;
  employment: number;
  wages: number;
}

export interface OESWageData {
  median: number;
  mean: number;
  p10: number;
  p25: number;
  p75: number;
  p90: number;
}

// CACHE_DURATION would be 7 days (future use)
const MAX_REQUESTS_PER_DAY = 500;

// Simple in-memory request counter (would use IndexedDB in production)
let requestCount = 0;
let lastResetDate = new Date().toDateString();

function checkRateLimit(): boolean {
  const today = new Date().toDateString();
  if (today !== lastResetDate) {
    requestCount = 0;
    lastResetDate = today;
  }
  return requestCount < MAX_REQUESTS_PER_DAY;
}

function incrementRequestCount() {
  requestCount++;
}

async function fetchWithRetry(url: string, maxRetries = 3, delay = 1000, fetchOptions?: RequestInit): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, fetchOptions);
      if (response.ok) {
        return response;
      }
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      }
    } catch (error) {
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

/**
 * Get QCEW (Quarterly Census of Employment and Wages) data
 * @param stateFips - 2-digit state FIPS code
 * @param countyFips - 3-digit county FIPS code
 * @param naicsCode - 6-digit NAICS code (default: 518210 for Data Processing)
 * @param startYear - Start year
 * @param endYear - End year
 * @returns Array of quarterly employment and wage data
 */
export async function getQCEWData(
  stateFips: string,
  countyFips: string,
  naicsCode: string = '518210',
  startYear: number,
  endYear: number
): Promise<QCEWDataPoint[]> {
  if (!checkRateLimit()) {
    throw new Error('BLS API rate limit exceeded. Please try again tomorrow.');
  }

  // BLS API requires registration for programmatic access
  // This is a simplified version that would work with registered API key
  // Series ID format: ENU{state}{county}5{naics}
  const seriesId = `ENU${stateFips}${countyFips}5${naicsCode}`;

  // BLS Public API v2 endpoint
  const url = 'https://api.bls.gov/publicAPI/v2/timeseries/data/';

  try {
    incrementRequestCount();

    const requestBody = {
      seriesid: [seriesId],
      startyear: startYear.toString(),
      endyear: endYear.toString(),
      registrationKey: '' // Would be provided in production
    };

    const response = await fetchWithRetry(
      url,
      3,
      1000,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      }
    );
    const data = await response.json();

    if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results?.series) {
      throw new Error('BLS API returned error: ' + (data.message || 'Unknown error'));
    }

    const series = data.Results.series[0];
    if (!series || !series.data) {
      return [];
    }

    return series.data.map((point: any) => ({
      year: parseInt(point.year, 10),
      quarter: parseInt(point.period.substring(1), 10), // Remove 'Q' prefix
      employment: parseInt(point.value || '0', 10),
      wages: parseInt(point.calculations?.annual_averages?.wages || '0', 10)
    })).reverse(); // Reverse to get chronological order
  } catch (error) {
    console.error('Error fetching QCEW data:', error);
    throw new Error(`Failed to fetch QCEW data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get OES (Occupational Employment Statistics) wage data
 * @param areaCode - BLS area code (e.g., '0000000' for US, '0000001' for Alabama)
 * @param occupationCode - SOC code (e.g., '15-1244' for Network and Computer Systems Administrators)
 * @returns Occupational wage statistics
 */
export async function getOESWages(areaCode: string, occupationCode: string): Promise<OESWageData | null> {
  if (!checkRateLimit()) {
    throw new Error('BLS API rate limit exceeded. Please try again tomorrow.');
  }

  // BLS OES API endpoint
  // Note: OES data is typically annual, not quarterly
  const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/OE${areaCode}${occupationCode}`;

  try {
    incrementRequestCount();

    const response = await fetchWithRetry(url);
    const data = await response.json();

    if (data.status !== 'REQUEST_SUCCEEDED' || !data.Results?.series) {
      return null;
    }

    const series = data.Results.series[0];
    if (!series || !series.data || series.data.length === 0) {
      return null;
    }

    const latest = series.data[0]; // Most recent data point

    return {
      median: parseFloat(latest.median || '0'),
      mean: parseFloat(latest.mean || '0'),
      p10: parseFloat(latest.p10 || '0'),
      p25: parseFloat(latest.p25 || '0'),
      p75: parseFloat(latest.p75 || '0'),
      p90: parseFloat(latest.p90 || '0')
    };
  } catch (error) {
    console.error('Error fetching OES wage data:', error);
    return null;
  }
}

/**
 * Helper function to get default wage estimate
 * Returns median wage for Network and Computer Systems Administrators (SOC 15-1244)
 * This is a fallback when OES API is unavailable
 */
export function getDefaultWageEstimate(): number {
  // BLS OES median wage for SOC 15-1244 (2022 data)
  return 85000;
}

