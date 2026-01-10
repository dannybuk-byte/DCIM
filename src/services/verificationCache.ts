/**
 * Verification Result Cache
 * 
 * Caches verification results in IndexedDB to avoid redundant API calls.
 * Results are cached for a configurable TTL (default: 1 hour).
 * 
 * Antifragile design:
 * - Reduces load on external APIs (EPA, EIA, Worker)
 * - Provides instant results for recently-verified facilities
 * - Gracefully falls back to live verification on cache miss
 * - Automatic cleanup of stale entries
 */

import { db } from '../db/database';
import type { UnifiedVerificationResult } from './unifiedVerification';

// Cache TTL: 1 hour (verification results don't change frequently)
const DEFAULT_CACHE_TTL_MS = 60 * 60 * 1000;

// Maximum cache entries (prevent unbounded growth)
const MAX_CACHE_ENTRIES = 500;

interface CachedVerificationResult {
  key: string;
  result: UnifiedVerificationResult;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Generate a cache key from verification input
 */
function makeCacheKey(
  facilityName: string,
  latitude?: number,
  longitude?: number,
  state?: string,
): string {
  // Normalize coordinates to 4 decimal places (≈11m precision)
  const lat = latitude?.toFixed(4) ?? 'null';
  const lng = longitude?.toFixed(4) ?? 'null';
  const st = state?.toUpperCase() ?? 'null';
  const name = facilityName.toLowerCase().trim().replace(/\s+/g, '_');
  
  return `verify:${name}:${lat}:${lng}:${st}`;
}

/**
 * Get cached verification result if available and not expired
 */
export async function getCachedVerification(
  facilityName: string,
  latitude?: number,
  longitude?: number,
  state?: string,
): Promise<UnifiedVerificationResult | null> {
  const key = makeCacheKey(facilityName, latitude, longitude, state);
  
  try {
    const cached = await db.table('verificationCache').get(key) as CachedVerificationResult | undefined;
    
    if (!cached) return null;
    
    // Check expiration
    if (Date.now() > cached.expiresAt) {
      // Expired - delete and return null
      await db.table('verificationCache').delete(key);
      return null;
    }
    
    return cached.result;
  } catch {
    // Cache read failed - return null (will trigger live verification)
    return null;
  }
}

/**
 * Store verification result in cache
 */
export async function cacheVerificationResult(
  facilityName: string,
  latitude: number | undefined,
  longitude: number | undefined,
  state: string | undefined,
  result: UnifiedVerificationResult,
  ttlMs: number = DEFAULT_CACHE_TTL_MS,
): Promise<void> {
  const key = makeCacheKey(facilityName, latitude, longitude, state);
  const now = Date.now();
  
  const cached: CachedVerificationResult = {
    key,
    result,
    cachedAt: now,
    expiresAt: now + ttlMs,
  };
  
  try {
    await db.table('verificationCache').put(cached);
    
    // Trigger cleanup if needed (non-blocking)
    void cleanupStaleEntries();
  } catch {
    // Cache write failed - ignore (verification still succeeded)
  }
}

/**
 * Clean up expired and excess cache entries
 */
async function cleanupStaleEntries(): Promise<void> {
  const now = Date.now();
  
  try {
    // Delete expired entries
    await db.table('verificationCache')
      .where('expiresAt')
      .below(now)
      .delete();
    
    // Check total count
    const count = await db.table('verificationCache').count();
    
    if (count > MAX_CACHE_ENTRIES) {
      // Delete oldest entries to get back under limit
      const toDelete = count - MAX_CACHE_ENTRIES + 50; // Delete 50 extra for buffer
      const oldest = await db.table('verificationCache')
        .orderBy('cachedAt')
        .limit(toDelete)
        .primaryKeys();
      
      await db.table('verificationCache').bulkDelete(oldest);
    }
  } catch {
    // Cleanup failed - ignore
  }
}

/**
 * Invalidate cached result for a specific facility
 */
export async function invalidateCachedVerification(
  facilityName: string,
  latitude?: number,
  longitude?: number,
  state?: string,
): Promise<void> {
  const key = makeCacheKey(facilityName, latitude, longitude, state);
  
  try {
    await db.table('verificationCache').delete(key);
  } catch {
    // Ignore deletion errors
  }
}

/**
 * Clear all cached verification results
 */
export async function clearVerificationCache(): Promise<void> {
  try {
    await db.table('verificationCache').clear();
  } catch {
    // Ignore clear errors
  }
}

/**
 * Get cache statistics for debugging
 */
export async function getVerificationCacheStats(): Promise<{
  totalEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
}> {
  try {
    const count = await db.table('verificationCache').count();
    
    if (count === 0) {
      return { totalEntries: 0, oldestEntry: null, newestEntry: null };
    }
    
    const oldest = await db.table('verificationCache')
      .orderBy('cachedAt')
      .first() as CachedVerificationResult | undefined;
    
    const newest = await db.table('verificationCache')
      .orderBy('cachedAt')
      .last() as CachedVerificationResult | undefined;
    
    return {
      totalEntries: count,
      oldestEntry: oldest?.cachedAt ?? null,
      newestEntry: newest?.cachedAt ?? null,
    };
  } catch {
    return { totalEntries: 0, oldestEntry: null, newestEntry: null };
  }
}
