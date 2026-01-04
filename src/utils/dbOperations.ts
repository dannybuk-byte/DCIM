/**
 * Safe Database Operations
 * Wraps database operations with retry logic and error handling
 */

import { db } from '../db/database';
import { retry, isRetryableError } from './retry';
import { resourceLimiters } from './resourceLimits';

/**
 * Safe database operation with retry and resource limiting
 */
export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallback?: () => T,
  options: {
    maxRetries?: number;
    useResourceLimiter?: boolean;
  } = {}
): Promise<T> {
  const { maxRetries = 3, useResourceLimiter = true } = options;

  try {
    // Acquire resource limiter slot if enabled
    let release: (() => void) | undefined;
    if (useResourceLimiter) {
      release = await resourceLimiters.database.acquire();
    }

    try {
      // Retry with exponential backoff
      return await retry(
        operation,
        {
          maxRetries,
          retryable: isRetryableError,
          initialDelay: 100,
          backoffMultiplier: 2,
          maxDelay: 5000
        }
      );
    } finally {
      // Always release resource limiter
      if (release) {
        release();
      }
    }
  } catch (error) {
    console.error('[SafeDB] Operation failed after retries:', error);
    
    if (fallback) {
      console.warn('[SafeDB] Using fallback');
      return fallback();
    }
    
    throw error;
  }
}

/**
 * Safe facility query with fallback
 */
export async function safeGetFacilities(fallback: Facility[] = []): Promise<Facility[]> {
  return safeDbOperation(
    () => db.facilities.toArray(),
    () => fallback
  );
}

/**
 * Safe count query
 */
export async function safeGetCount(table: keyof typeof db, fallback: number = 0): Promise<number> {
  return safeDbOperation(
    async () => {
      const count = await (db[table] as any).count();
      return typeof count === 'number' ? count : 0;
    },
    () => fallback
  );
}

/**
 * Safe bulk operation
 */
export async function safeBulkOperation<T>(
  items: T[],
  operation: (items: T[]) => Promise<void>,
  options: {
    batchSize?: number;
    maxRetries?: number;
  } = {}
): Promise<void> {
  const { batchSize = 100, maxRetries = 3 } = options;
  
  // Process in batches to avoid overwhelming
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    await safeDbOperation(
      () => operation(batch),
      () => {
        console.warn(`[SafeDB] Batch ${i}-${i + batch.length} failed, skipping`);
      },
      { maxRetries }
    );
  }
}

// Import Facility type
import { Facility } from '../types';





