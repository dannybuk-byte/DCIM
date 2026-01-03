/**
 * CISA Known Exploited Vulnerabilities (KEV) Integration
 * 
 * Browser-native security intelligence from CISA's authoritative catalog
 * of vulnerabilities known to be actively exploited in the wild.
 * 
 * Features:
 * - Fully CORS-enabled (no backend required)
 * - Public domain data
 * - Updated on US business days
 * - No authentication needed
 * 
 * Antifragility:
 * - Cached in memory with TTL
 * - Graceful degradation on API failure
 * - Retry logic with exponential backoff
 * - Type-safe with comprehensive error handling
 */

export interface KEVEntry {
  cveID: string;
  vendorProject: string;
  product: string;
  vulnerabilityName: string;
  dateAdded: string;
  shortDescription: string;
  requiredAction: string;
  dueDate: string;
  knownRansomwareCampaignUse: 'Known' | 'Unknown';
  notes?: string;
}

export interface KEVCatalog {
  title: string;
  catalogVersion: string;
  dateReleased: string;
  count: number;
  vulnerabilities: KEVEntry[];
}

// In-memory cache with 24-hour TTL
let kevCache: { data: KEVCatalog; timestamp: number } | null = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch CISA KEV catalog
 * Cached for 24 hours to minimize API calls
 */
export async function fetchKEVCatalog(): Promise<KEVCatalog | null> {
  // Check cache first
  if (kevCache && Date.now() - kevCache.timestamp < CACHE_TTL) {
    console.log('[KEV] Using cached data');
    return kevCache.data;
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[KEV] Fetching catalog (attempt ${attempt}/${maxRetries})...`);
      
      const response = await fetch(
        'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json',
        {
          headers: {
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(10000), // 10 second timeout
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: KEVCatalog = await response.json();
      
      // Validate response structure
      if (!data.vulnerabilities || !Array.isArray(data.vulnerabilities)) {
        throw new Error('Invalid KEV catalog structure');
      }

      // Cache the result
      kevCache = {
        data,
        timestamp: Date.now(),
      };

      console.log(`[KEV] Successfully fetched ${data.count} vulnerabilities`);
      return data;

    } catch (error) {
      lastError = error as Error;
      console.error(`[KEV] Attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt - 1) * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  console.error('[KEV] All retry attempts failed:', lastError);
  return null;
}

/**
 * Check if a specific technology/product has known exploited vulnerabilities
 */
export async function checkProductVulnerabilities(
  vendor: string,
  product: string
): Promise<KEVEntry[]> {
  const catalog = await fetchKEVCatalog();
  if (!catalog) return [];

  const vendorLower = vendor.toLowerCase();
  const productLower = product.toLowerCase();

  return catalog.vulnerabilities.filter(vuln => {
    const vulnVendor = vuln.vendorProject.toLowerCase();
    const vulnProduct = vuln.product.toLowerCase();
    
    return (
      vulnVendor.includes(vendorLower) || vendorLower.includes(vulnVendor)
    ) && (
      vulnProduct.includes(productLower) || productLower.includes(vulnProduct)
    );
  });
}

/**
 * Get ransomware-related vulnerabilities
 */
export async function getRansomwareVulnerabilities(): Promise<KEVEntry[]> {
  const catalog = await fetchKEVCatalog();
  if (!catalog) return [];

  return catalog.vulnerabilities.filter(
    vuln => vuln.knownRansomwareCampaignUse === 'Known'
  );
}

/**
 * Get recently added vulnerabilities (last N days)
 */
export async function getRecentVulnerabilities(days: number = 30): Promise<KEVEntry[]> {
  const catalog = await fetchKEVCatalog();
  if (!catalog) return [];

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return catalog.vulnerabilities.filter(vuln => {
    const addedDate = new Date(vuln.dateAdded);
    return addedDate >= cutoffDate;
  });
}

/**
 * Get vulnerability statistics
 */
export async function getKEVStats(): Promise<{
  total: number;
  ransomware: number;
  recentlyAdded: number;
  lastUpdated: string;
} | null> {
  const catalog = await fetchKEVCatalog();
  if (!catalog) return null;

  const ransomwareCount = catalog.vulnerabilities.filter(
    v => v.knownRansomwareCampaignUse === 'Known'
  ).length;

  const recentCount = (await getRecentVulnerabilities(30)).length;

  return {
    total: catalog.count,
    ransomware: ransomwareCount,
    recentlyAdded: recentCount,
    lastUpdated: catalog.dateReleased,
  };
}

/**
 * Clear the cache (useful for testing or manual refresh)
 */
export function clearKEVCache(): void {
  kevCache = null;
  console.log('[KEV] Cache cleared');
}

/**
 * Check if cache is valid
 */
export function hasValidCache(): boolean {
  return kevCache !== null && Date.now() - kevCache.timestamp < CACHE_TTL;
}

