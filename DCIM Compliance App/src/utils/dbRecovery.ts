/**
 * IndexedDB Error Recovery Utility
 * Provides graceful degradation and automatic recovery for database operations
 */

import { db } from '../db/database';
import { seedDatabase } from '../db/seedData';

export interface DBRecoveryOptions {
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  onRecovery?: () => void;
}

/**
 * Execute a database operation with automatic error recovery
 */
export async function safeDbOperationWithRecovery<T>(
  operation: () => Promise<T>,
  fallbackValue: T,
  options: DBRecoveryOptions = {}
): Promise<T> {
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRecovery,
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error(`DB operation failed (attempt ${attempt + 1}/${maxRetries}):`, lastError);

      // Check if it's a database corruption issue
      if (
        lastError.message.includes('VersionError') ||
        lastError.message.includes('DatabaseClosedError') ||
        lastError.message.includes('QuotaExceededError') ||
        lastError.message.includes('corrupt')
      ) {
        console.warn('Database appears corrupted. Attempting recovery...');
        
        try {
          await recoverDatabase();
          onRecovery?.();
          
          // Retry the operation after recovery
          return await operation();
        } catch (recoveryError) {
          console.error('Database recovery failed:', recoveryError);
        }
      }

      // Wait before retrying
      if (attempt < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }
  }

  // All retries failed
  if (lastError) {
    onError?.(lastError);
    console.error('DB operation failed after all retries. Using fallback value.');
  }

  return fallbackValue;
}

/**
 * Recover a corrupted database
 */
export async function recoverDatabase(): Promise<void> {
  try {
    console.log('🔧 Attempting database recovery...');

    // Step 1: Close all connections
    db.close();

    // Step 2: Delete the corrupted database
    await deleteDatabase();

    // Step 3: Reopen with a new connection
    await db.open();

    // Step 4: Reseed with initial data
    await seedDatabase();

    console.log('✅ Database recovery successful!');
  } catch (error) {
    console.error('❌ Database recovery failed:', error);
    throw error;
  }
}

/**
 * Delete the database completely
 */
export async function deleteDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    const DBDeleteRequest = window.indexedDB.deleteDatabase('dcim-compliance-db');

    DBDeleteRequest.onsuccess = () => {
      console.log('Database deleted successfully');
      resolve();
    };

    DBDeleteRequest.onerror = () => {
      console.error('Error deleting database');
      reject(new Error('Failed to delete database'));
    };

    DBDeleteRequest.onblocked = () => {
      console.warn('Database deletion blocked - close all tabs using this database');
      // Resolve anyway, the next open() will handle it
      resolve();
    };
  });
}

/**
 * Check database health
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  facilityCount: number;
  error?: string;
}> {
  try {
    const count = await db.facilities.count();
    
    return {
      healthy: count > 0,
      facilityCount: count,
    };
  } catch (error) {
    return {
      healthy: false,
      facilityCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Monitor database health periodically
 */
export function startDatabaseHealthMonitor(
  interval: number = 60000, // 1 minute
  onUnhealthy?: (health: Awaited<ReturnType<typeof checkDatabaseHealth>>) => void
): () => void {
  const intervalId = setInterval(async () => {
    const health = await checkDatabaseHealth();
    
    if (!health.healthy) {
      console.warn('⚠️ Database health check failed:', health);
      onUnhealthy?.(health);
      
      // Attempt automatic recovery
      try {
        await recoverDatabase();
      } catch (error) {
        console.error('Automatic recovery failed:', error);
      }
    }
  }, interval);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Clear all cached data (for testing or manual recovery)
 */
export async function clearAllData(): Promise<void> {
  try {
    await Promise.all([
      db.facilities.clear(),
      db.searchHistory.clear(),
      db.osintCache?.clear(),
    ]);
    
    console.log('✅ All data cleared');
  } catch (error) {
    console.error('Error clearing data:', error);
    throw error;
  }
}

