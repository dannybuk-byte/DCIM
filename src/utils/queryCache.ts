/**
 * Query Cache Manager
 * Caches natural language queries and their structured/result pairs
 * Reduces API costs and improves response time
 */

import type { FacilityQuery } from '../schemas/facilityQuery';
import type { Facility } from '../types';

const NL_QUERY_CACHE_KEY = 'nl_query_cache';
const QUERY_RESULTS_CACHE_KEY = 'query_results_cache';
const MAX_NL_CACHE_SIZE = 500;
const MAX_RESULTS_CACHE_SIZE = 100;
const NL_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const RESULTS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes (results change more frequently)

interface CachedNLQuery {
  naturalLanguage: string;
  structuredQuery: FacilityQuery;
  method: 'api' | 'keywords';
  timestamp: number;
}

interface CachedQueryResult {
  queryHash: string;
  facilities: Facility[];
  totalCount: number;
  timestamp: number;
}

/**
 * Generate a hash for a structured query (for cache key)
 */
function hashQuery(query: FacilityQuery): string {
  return JSON.stringify(query);
}

/**
 * Get cached structured query for natural language input
 */
export function getCachedNLQuery(naturalLanguage: string): { query: FacilityQuery; method: 'api' | 'keywords' } | null {
  try {
    const cached = localStorage.getItem(NL_QUERY_CACHE_KEY);
    if (!cached) return null;
    
    const cache: CachedNLQuery[] = JSON.parse(cached);
    const now = Date.now();
    
    // Find matching entry
    const entry = cache.find(c => 
      c.naturalLanguage.toLowerCase() === naturalLanguage.toLowerCase() &&
      now - c.timestamp < NL_CACHE_TTL
    );
    
    if (entry) {
      return {
        query: entry.structuredQuery,
        method: entry.method
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error reading NL query cache:', error);
    return null;
  }
}

/**
 * Cache a natural language query conversion
 */
export function cacheNLQuery(
  naturalLanguage: string,
  structuredQuery: FacilityQuery,
  method: 'api' | 'keywords'
): void {
  try {
    const cached = localStorage.getItem(NL_QUERY_CACHE_KEY);
    let cache: CachedNLQuery[] = cached ? JSON.parse(cached) : [];
    
    // Remove old entries for same natural language
    cache = cache.filter(c => c.naturalLanguage.toLowerCase() !== naturalLanguage.toLowerCase());
    
    // Add new entry
    cache.push({
      naturalLanguage,
      structuredQuery,
      method,
      timestamp: Date.now()
    });
    
    // Sort by timestamp (newest first) and limit size
    cache.sort((a, b) => b.timestamp - a.timestamp);
    if (cache.length > MAX_NL_CACHE_SIZE) {
      cache = cache.slice(0, MAX_NL_CACHE_SIZE);
    }
    
    localStorage.setItem(NL_QUERY_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching NL query:', error);
  }
}

/**
 * Get cached query results
 */
export function getCachedQueryResults(query: FacilityQuery): { facilities: Facility[]; totalCount: number } | null {
  try {
    const cached = localStorage.getItem(QUERY_RESULTS_CACHE_KEY);
    if (!cached) return null;
    
    const cache: CachedQueryResult[] = JSON.parse(cached);
    const now = Date.now();
    const queryHash = hashQuery(query);
    
    // Find matching entry
    const entry = cache.find(c => 
      c.queryHash === queryHash &&
      now - c.timestamp < RESULTS_CACHE_TTL
    );
    
    if (entry) {
      return {
        facilities: entry.facilities,
        totalCount: entry.totalCount
      };
    }
    
    return null;
  } catch (error) {
    console.error('Error reading query results cache:', error);
    return null;
  }
}

/**
 * Cache query results
 */
export function cacheQueryResults(
  query: FacilityQuery,
  facilities: Facility[],
  totalCount: number
): void {
  try {
    const cached = localStorage.getItem(QUERY_RESULTS_CACHE_KEY);
    let cache: CachedQueryResult[] = cached ? JSON.parse(cached) : [];
    
    const queryHash = hashQuery(query);
    
    // Remove old entries for same query
    cache = cache.filter(c => c.queryHash !== queryHash);
    
    // Add new entry
    cache.push({
      queryHash,
      facilities,
      totalCount,
      timestamp: Date.now()
    });
    
    // Sort by timestamp (newest first) and limit size
    cache.sort((a, b) => b.timestamp - a.timestamp);
    if (cache.length > MAX_RESULTS_CACHE_SIZE) {
      cache = cache.slice(0, MAX_RESULTS_CACHE_SIZE);
    }
    
    localStorage.setItem(QUERY_RESULTS_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error('Error caching query results:', error);
    // If localStorage is full, clear old entries and retry
    if (error instanceof Error && error.name === 'QuotaExceededError') {
      clearOldCacheEntries();
      try {
        cacheQueryResults(query, facilities, totalCount);
      } catch {
        // Still failed, just skip caching
        console.warn('Could not cache query results due to storage quota');
      }
    }
  }
}

/**
 * Clear old cache entries to free up space
 */
function clearOldCacheEntries(): void {
  try {
    // Clear NL query cache entries older than 7 days
    const nlCached = localStorage.getItem(NL_QUERY_CACHE_KEY);
    if (nlCached) {
      let nlCache: CachedNLQuery[] = JSON.parse(nlCached);
      const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      nlCache = nlCache.filter(c => c.timestamp > sevenDaysAgo);
      localStorage.setItem(NL_QUERY_CACHE_KEY, JSON.stringify(nlCache));
    }
    
    // Clear all query results cache (they're short-lived anyway)
    localStorage.removeItem(QUERY_RESULTS_CACHE_KEY);
  } catch (error) {
    console.error('Error clearing old cache entries:', error);
  }
}

/**
 * Clear all query caches
 */
export function clearAllQueryCaches(): void {
  localStorage.removeItem(NL_QUERY_CACHE_KEY);
  localStorage.removeItem(QUERY_RESULTS_CACHE_KEY);
}

/**
 * Get cache statistics
 */
export interface CacheStats {
  nlQueries: {
    count: number;
    size: number; // bytes
    oldestEntry: number | null; // timestamp
    newestEntry: number | null; // timestamp
  };
  queryResults: {
    count: number;
    size: number; // bytes
    oldestEntry: number | null;
    newestEntry: number | null;
  };
}

export function getCacheStats(): CacheStats {
  const stats: CacheStats = {
    nlQueries: { count: 0, size: 0, oldestEntry: null, newestEntry: null },
    queryResults: { count: 0, size: 0, oldestEntry: null, newestEntry: null }
  };
  
  try {
    // NL queries stats
    const nlCached = localStorage.getItem(NL_QUERY_CACHE_KEY);
    if (nlCached) {
      const nlCache: CachedNLQuery[] = JSON.parse(nlCached);
      stats.nlQueries.count = nlCache.length;
      stats.nlQueries.size = new Blob([nlCached]).size;
      if (nlCache.length > 0) {
        stats.nlQueries.oldestEntry = Math.min(...nlCache.map(c => c.timestamp));
        stats.nlQueries.newestEntry = Math.max(...nlCache.map(c => c.timestamp));
      }
    }
    
    // Query results stats
    const resultsCached = localStorage.getItem(QUERY_RESULTS_CACHE_KEY);
    if (resultsCached) {
      const resultsCache: CachedQueryResult[] = JSON.parse(resultsCached);
      stats.queryResults.count = resultsCache.length;
      stats.queryResults.size = new Blob([resultsCached]).size;
      if (resultsCache.length > 0) {
        stats.queryResults.oldestEntry = Math.min(...resultsCache.map(c => c.timestamp));
        stats.queryResults.newestEntry = Math.max(...resultsCache.map(c => c.timestamp));
      }
    }
  } catch (error) {
    console.error('Error getting cache stats:', error);
  }
  
  return stats;
}

/**
 * Get recent search history (for autocomplete/suggestions)
 */
export function getRecentSearches(limit: number = 10): string[] {
  try {
    const cached = localStorage.getItem(NL_QUERY_CACHE_KEY);
    if (!cached) return [];
    
    const cache: CachedNLQuery[] = JSON.parse(cached);
    
    // Sort by timestamp (newest first) and get unique natural language queries
    const recent = cache
      .sort((a, b) => b.timestamp - a.timestamp)
      .map(c => c.naturalLanguage)
      .filter((query, index, self) => self.indexOf(query) === index) // Remove duplicates
      .slice(0, limit);
    
    return recent;
  } catch (error) {
    console.error('Error getting recent searches:', error);
    return [];
  }
}

