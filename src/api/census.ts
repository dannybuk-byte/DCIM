// Census API Utility
// Fetches demographic and economic data from US Census Bureau APIs

import { db } from '../db/database';
import { retry, isRetryableError } from '../utils/retry';
import { censusCircuitBreaker } from '../utils/circuitBreaker';
import { censusRateLimiter } from '../utils/rateLimiter';
import { validateFIPS } from '../utils/validation';

// Helper function for retryable fetch requests
async function fetchWithRetry(url: string, maxRetries = 3, delay = 1000): Promise<Response> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url);
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
  throw new Error('Failed to fetch after retries');
}

export interface CountyDemographics {
  name: string;
  population: number;
  medianIncome: number;
  countyFips: string;
}

export interface TractDemographics {
  name: string;
  population: number;
  medianIncome: number;
  tractFips: string;
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function getCachedCountyData(countyFips: string): Promise<CountyDemographics | null> {
  try {
    const cached = await db.communityContext.get(countyFips);
    if (cached && new Date(cached.updatedAt).getTime() > Date.now() - CACHE_DURATION) {
      return {
        name: `${cached.countyFips}`, // Will be updated with actual name from API
        population: cached.population,
        medianIncome: cached.medianIncome,
        countyFips: cached.countyFips
      };
    }
  } catch (error) {
    console.warn('Error reading from cache:', error);
  }
  return null;
}

async function cacheCountyData(data: CountyDemographics) {
  try {
    await db.communityContext.put({
      countyFips: data.countyFips,
      population: data.population,
      medianIncome: data.medianIncome,
      ejIndex: 0, // Will be updated by EPA API
      gridOperator: '', // Will be updated separately
      waterAuthority: '', // Will be updated separately
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.warn('Error caching county data:', error);
  }
}

async function fetchWithResilience(url: string, signal?: AbortSignal): Promise<Response> {
  // Rate limiting
  await censusRateLimiter.acquire();

  // Circuit breaker + retry
  return censusCircuitBreaker.call(async () => {
    return retry(
      async () => {
        const response = await fetch(url, { signal });
        if (!response.ok) {
          const error: any = new Error(`Census API returned ${response.status}`);
          error.status = response.status;
          throw error;
        }
        return response;
      },
      {
        maxRetries: 3,
        initialDelay: 1000,
        retryable: isRetryableError,
      }
    );
  });
}

/**
 * Get county demographics from Census ACS 5-year API
 * @param countyFips - 5-digit FIPS code (state + county)
 * @returns County demographics with population and median income
 */
export async function getCountyDemographics(countyFips: string, signal?: AbortSignal): Promise<CountyDemographics> {
  // Validate input
  if (!validateFIPS(countyFips, 5)) {
    throw new Error(`Invalid county FIPS code: ${countyFips}. Must be 5 digits.`);
  }

  // Check cache first (stale-while-revalidate pattern)
  const cached = await getCachedCountyData(countyFips);
  if (cached) {
    // Return cached data immediately, but refresh in background if stale
    const cacheAge = Date.now() - new Date(cached.countyFips ? await db.communityContext.get(cached.countyFips).then(c => c ? new Date(c.updatedAt).getTime() : 0) : 0).getTime();
    if (cacheAge < CACHE_DURATION) {
      return cached;
    }
    // Cache is stale, but return it anyway and refresh in background
    refreshCountyData(countyFips, signal).catch(console.error);
    return cached;
  }

  const stateFips = countyFips.substring(0, 2);
  const countyCode = countyFips.substring(2, 5);

  // Census ACS 5-year API endpoint
  const baseUrl = 'https://api.census.gov/data/2022/acs/acs5';
  const variables = 'NAME,B01003_001E,B19013_001E'; // Name, Total Population, Median Household Income
  const url = `${baseUrl}?get=${variables}&for=county:${countyCode}&in=state:${stateFips}`;

  try {
    const response = await fetchWithRetry(url);
    const data = await response.json();

    // Census API returns array: [headers, ...data]
    if (!Array.isArray(data) || data.length < 2) {
      throw new Error('Invalid response from Census API');
    }

    const headers = data[0];
    const row = data[1];

    const nameIndex = headers.indexOf('NAME');
    const populationIndex = headers.indexOf('B01003_001E');
    const incomeIndex = headers.indexOf('B19013_001E');

    const name = row[nameIndex] || '';
    const population = parseInt(row[populationIndex] || '0', 10);
    const medianIncome = parseInt(row[incomeIndex] || '0', 10);

    const result: CountyDemographics = {
      name,
      population,
      medianIncome,
      countyFips
    };

    // Cache the result
    await cacheCountyData(result);

    return result;
  } catch (error) {
    console.error('Error fetching county demographics:', error);
    
    // Graceful degradation: return cached data if available, even if stale
    const staleCache = await getCachedCountyData(countyFips);
    if (staleCache) {
      console.warn('Using stale cached data due to API failure');
      return staleCache;
    }
    
    throw new Error(`Failed to fetch county demographics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Refresh county data in background (for stale-while-revalidate)
 */
async function refreshCountyData(countyFips: string, signal?: AbortSignal): Promise<void> {
  try {
    const stateFips = countyFips.substring(0, 2);
    const countyCode = countyFips.substring(2, 5);
    const baseUrl = 'https://api.census.gov/data/2022/acs/acs5';
    const variables = 'NAME,B01003_001E,B19013_001E';
    const url = `${baseUrl}?get=${variables}&for=county:${countyCode}&in=state:${stateFips}`;

    const response = await fetchWithResilience(url, signal);
    const data = await response.json();

    if (Array.isArray(data) && data.length >= 2) {
      const headers = data[0];
      const row = data[1];
      const nameIndex = headers.indexOf('NAME');
      const populationIndex = headers.indexOf('B01003_001E');
      const incomeIndex = headers.indexOf('B19013_001E');

      await cacheCountyData({
        name: row[nameIndex] || '',
        population: parseInt(row[populationIndex] || '0', 10),
        medianIncome: parseInt(row[incomeIndex] || '0', 10),
        countyFips,
      });
    }
  } catch (error) {
    // Silent fail for background refresh
    console.warn('Background refresh failed:', error);
  }
}

/**
 * Get census tract demographics
 * @param tractFips - 11-digit FIPS code (state + county + tract)
 * @returns Tract demographics
 */
export async function getTractDemographics(tractFips: string): Promise<TractDemographics> {
  if (tractFips.length !== 11) {
    throw new Error(`Invalid tract FIPS code: ${tractFips}. Must be 11 digits.`);
  }

  const stateFips = tractFips.substring(0, 2);
  const countyCode = tractFips.substring(2, 5);
  const tractCode = tractFips.substring(5, 11);

  const baseUrl = 'https://api.census.gov/data/2022/acs/acs5';
  const variables = 'NAME,B01003_001E,B19013_001E';
  const url = `${baseUrl}?get=${variables}&for=tract:${tractCode}&in=state:${stateFips}+county:${countyCode}`;

  try {
    const response = await fetchWithRetry(url);
    const data = await response.json();

    if (!Array.isArray(data) || data.length < 2) {
      throw new Error('Invalid response from Census API');
    }

    const headers = data[0];
    const row = data[1];

    const nameIndex = headers.indexOf('NAME');
    const populationIndex = headers.indexOf('B01003_001E');
    const incomeIndex = headers.indexOf('B19013_001E');

    return {
      name: row[nameIndex] || '',
      population: parseInt(row[populationIndex] || '0', 10),
      medianIncome: parseInt(row[incomeIndex] || '0', 10),
      tractFips
    };
  } catch (error) {
    console.error('Error fetching tract demographics:', error);
    throw new Error(`Failed to fetch tract demographics: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

