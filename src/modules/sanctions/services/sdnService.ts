/**
 * OFAC SDN List Service
 * Fetches and caches the Specially Designated Nationals list
 * 
 * Primary Source: Treasury Department OFAC
 * Update Frequency: Daily
 */

import { SDNEntry, SDNCacheRecord } from '../types/sanctions';

// SDN List URLs
const SDN_URLS = {
  xml: 'https://www.treasury.gov/ofac/downloads/sdn.xml',
  csv: 'https://www.treasury.gov/ofac/downloads/sdn.csv',
  consolidated: 'https://www.treasury.gov/ofac/downloads/consolidated/consolidated.xml',
  // JSON API (easier to parse)
  jsonApi: 'https://api.ofac-api.com/v4/search', // Note: This is a third-party API
};

// CORS proxy for browser-based fetching
const CORS_PROXY = 'https://corsproxy.io/?';

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// In-memory cache
let sdnCache: SDNEntry[] = [];
let lastFetchTime = 0;

/**
 * Parse SDN XML response
 */
function parseSDNXML(xmlText: string): SDNEntry[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'text/xml');
  const entries: SDNEntry[] = [];

  const sdnEntries = doc.querySelectorAll('sdnEntry');
  
  sdnEntries.forEach((entry) => {
    const uid = entry.querySelector('uid')?.textContent || '';
    const lastName = entry.querySelector('lastName')?.textContent || '';
    const firstName = entry.querySelector('firstName')?.textContent || undefined;
    const sdnType = entry.querySelector('sdnType')?.textContent as SDNEntry['sdnType'] || 'Entity';
    const remarks = entry.querySelector('remarks')?.textContent || undefined;

    // Parse programs
    const programs: string[] = [];
    entry.querySelectorAll('programList program').forEach((prog) => {
      if (prog.textContent) programs.push(prog.textContent);
    });

    // Parse addresses
    const addresses: SDNEntry['addresses'] = [];
    entry.querySelectorAll('addressList address').forEach((addr) => {
      addresses.push({
        city: addr.querySelector('city')?.textContent || undefined,
        country: addr.querySelector('country')?.textContent || '',
        stateProvince: addr.querySelector('stateOrProvince')?.textContent || undefined,
        address1: addr.querySelector('address1')?.textContent || undefined,
        address2: addr.querySelector('address2')?.textContent || undefined,
        postalCode: addr.querySelector('postalCode')?.textContent || undefined,
      });
    });

    // Parse IDs
    const ids: SDNEntry['ids'] = [];
    entry.querySelectorAll('idList id').forEach((id) => {
      ids.push({
        idType: id.querySelector('idType')?.textContent || '',
        idNumber: id.querySelector('idNumber')?.textContent || '',
        idCountry: id.querySelector('idCountry')?.textContent || undefined,
      });
    });

    // Parse AKAs
    const akas: SDNEntry['akas'] = [];
    entry.querySelectorAll('akaList aka').forEach((aka) => {
      akas.push({
        lastName: aka.querySelector('lastName')?.textContent || '',
        firstName: aka.querySelector('firstName')?.textContent || undefined,
        type: (aka.querySelector('type')?.textContent as 'AKA' | 'FKA' | 'DBA') || 'AKA',
      });
    });

    entries.push({
      uid,
      lastName,
      firstName,
      sdnType,
      programs,
      remarks,
      addresses,
      ids,
      akas,
    });
  });

  return entries;
}

/**
 * Fetch SDN list from OFAC
 */
export async function fetchSDNList(): Promise<SDNEntry[]> {
  // Check cache
  const now = Date.now();
  if (sdnCache.length > 0 && now - lastFetchTime < CACHE_DURATION) {
    console.log('[SDN] Using cached SDN list:', sdnCache.length, 'entries');
    return sdnCache;
  }

  try {
    console.log('[SDN] Fetching fresh SDN list from OFAC...');
    
    // Try direct fetch first (may be blocked by CORS)
    let response: Response;
    try {
      response = await fetch(SDN_URLS.xml, { 
        headers: { 'Accept': 'application/xml' },
        signal: AbortSignal.timeout(30000)
      });
    } catch {
      // Fall back to CORS proxy
      console.log('[SDN] Direct fetch failed, using CORS proxy...');
      response = await fetch(CORS_PROXY + encodeURIComponent(SDN_URLS.xml), {
        signal: AbortSignal.timeout(30000)
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const xmlText = await response.text();
    const entries = parseSDNXML(xmlText);

    // Update cache
    sdnCache = entries;
    lastFetchTime = now;

    console.log('[SDN] Fetched and parsed', entries.length, 'SDN entries');
    return entries;
  } catch (error) {
    console.error('[SDN] Failed to fetch SDN list:', error);
    
    // Return cached data if available, otherwise return mock data for development
    if (sdnCache.length > 0) {
      console.log('[SDN] Returning stale cache');
      return sdnCache;
    }

    // Return mock SDN entries for development/offline use
    return getMockSDNEntries();
  }
}

/**
 * Get mock SDN entries for development
 */
function getMockSDNEntries(): SDNEntry[] {
  return [
    {
      uid: 'MOCK-001',
      lastName: 'BITRIVER AG',
      sdnType: 'Entity',
      programs: ['RUSSIA-EO14024'],
      addresses: [{ country: 'Russia', city: 'Moscow' }],
      ids: [],
      akas: [{ lastName: 'BIT RIVER', type: 'AKA' }],
      remarks: 'Russian cryptocurrency mining company (Mock data for development)',
    },
    {
      uid: 'MOCK-002',
      lastName: 'AEZA GROUP LTD',
      sdnType: 'Entity',
      programs: ['CYBER2'],
      addresses: [{ country: 'Russia', city: 'Moscow' }],
      ids: [],
      akas: [{ lastName: 'AEZA', type: 'AKA' }],
      remarks: 'Bulletproof hosting provider (Mock data for development)',
    },
    {
      uid: 'MOCK-003',
      lastName: 'MEDIA LAND LLC',
      sdnType: 'Entity',
      programs: ['CYBER2'],
      addresses: [{ country: 'Russia' }],
      ids: [],
      akas: [],
      remarks: 'Sanctioned hosting provider (Mock data for development)',
    },
  ];
}

/**
 * Search SDN list by name (fuzzy matching)
 */
export async function searchSDN(query: string, threshold = 0.7): Promise<SDNEntry[]> {
  const sdnList = await fetchSDNList();
  const normalizedQuery = normalizeName(query);
  
  return sdnList.filter((entry) => {
    // Check main name
    const mainSimilarity = calculateSimilarity(normalizedQuery, normalizeName(entry.lastName));
    if (mainSimilarity >= threshold) return true;

    // Check AKAs
    for (const aka of entry.akas) {
      const akaSimilarity = calculateSimilarity(normalizedQuery, normalizeName(aka.lastName));
      if (akaSimilarity >= threshold) return true;
    }

    return false;
  });
}

/**
 * Get SDN entries by program (e.g., 'RUSSIA', 'CYBER2', 'IRAN')
 */
export async function getSDNByProgram(program: string): Promise<SDNEntry[]> {
  const sdnList = await fetchSDNList();
  return sdnList.filter((entry) => 
    entry.programs.some((p) => p.toUpperCase().includes(program.toUpperCase()))
  );
}

/**
 * Get SDN entries by country
 */
export async function getSDNByCountry(country: string): Promise<SDNEntry[]> {
  const sdnList = await fetchSDNList();
  const normalizedCountry = country.toLowerCase();
  
  return sdnList.filter((entry) =>
    entry.addresses.some((addr) => 
      addr.country.toLowerCase().includes(normalizedCountry)
    )
  );
}

/**
 * Normalize name for comparison
 */
export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculate string similarity using Levenshtein distance
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 1.0;
  const distance = levenshteinDistance(str1, str2);
  return 1 - (distance / maxLen);
}

/**
 * Levenshtein distance calculation
 */
export function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Get SDN list statistics
 */
export async function getSDNStats(): Promise<{
  totalEntries: number;
  byProgram: Record<string, number>;
  byCountry: Record<string, number>;
  byType: Record<string, number>;
  lastUpdated: string;
}> {
  const sdnList = await fetchSDNList();
  
  const byProgram: Record<string, number> = {};
  const byCountry: Record<string, number> = {};
  const byType: Record<string, number> = {};

  for (const entry of sdnList) {
    // Count by program
    for (const program of entry.programs) {
      byProgram[program] = (byProgram[program] || 0) + 1;
    }

    // Count by country
    for (const addr of entry.addresses) {
      if (addr.country) {
        byCountry[addr.country] = (byCountry[addr.country] || 0) + 1;
      }
    }

    // Count by type
    byType[entry.sdnType] = (byType[entry.sdnType] || 0) + 1;
  }

  return {
    totalEntries: sdnList.length,
    byProgram,
    byCountry,
    byType,
    lastUpdated: new Date(lastFetchTime).toISOString(),
  };
}

