/**
 * IndexedDB Error Recovery Utility
 * Provides graceful degradation and automatic recovery for database operations
 */

import { ALL_STORE_NAMES, db, type StoreName } from '../db/database';
import { seedDatabase } from '../db/seedData';
import { cacheDb } from '../services/DataFetcher';
import { assertDestructiveAuthorized } from './dbDiagnosticGate';

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

      // Corruption-class errors: surface only — do NOT auto-delete/reseed (step-3 quarantine).
      if (
        lastError.message.includes('VersionError') ||
        lastError.message.includes('DatabaseClosedError') ||
        lastError.message.includes('QuotaExceededError') ||
        lastError.message.includes('corrupt')
      ) {
        console.warn(
          'Database error classified as corruption-class; automatic destructive recovery is disabled. Export/diagnostic before any rebuild.',
          lastError.message,
        );
        onError?.(lastError);
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
 * Recover a corrupted database.
 *
 * R-F9: gated at the API boundary (export or diagnostic required this
 * session). Operates on the ACTUAL open database (db.name — i.e.
 * 'ComplianceDatabase' in live mode), not the historical phantom
 * 'dcim-compliance-db' which silently deleted nothing while reporting
 * success. The reseed step is demo-gated (R-F1), so recovery can never
 * repopulate a live store with synthetic data.
 */
export async function recoverDatabase(): Promise<void> {
  assertDestructiveAuthorized('recoverDatabase');
  try {
    // Step 1: Close all connections
    db.close();

    // Step 2: Delete the corrupted database
    await deleteDatabase();

    // Step 3: Reopen with a new connection
    await db.open();

    // Step 4: Reseed (strict no-op outside explicit demo mode — R-F1)
    await seedDatabase();
  } catch (error) {
    console.error('❌ Database recovery failed:', error);
    throw error;
  }
}

/**
 * Delete the database completely.
 * R-F9: gated at the boundary; targets db.name (the real open database),
 * fixing the phantom-name bug that made deletion a silent no-op.
 */
export async function deleteDatabase(): Promise<void> {
  assertDestructiveAuthorized('deleteDatabase');
  return new Promise((resolve, reject) => {
    const DBDeleteRequest = window.indexedDB.deleteDatabase(db.name);

    DBDeleteRequest.onsuccess = () => {
      resolve();
    };

    DBDeleteRequest.onerror = () => {
      reject(new Error(`Failed to delete database '${db.name}'`));
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
      // Automatic destructive recovery removed (step-3): never delete/reseed from the monitor.
    }
  }, interval);

  // Return cleanup function
  return () => clearInterval(intervalId);
}

/**
 * Clear all data (for testing or manual recovery).
 * R-F9: gated at the boundary; covers all 14 declared stores in ONE
 * transaction (previously cleared only 2 stores plus a phantom table).
 */
export async function clearAllData(): Promise<void> {
  assertDestructiveAuthorized('clearAllData');
  const tables = ALL_STORE_NAMES.map((name) => db.table(name));
  await db.transaction('rw', tables, async () => {
    for (const table of tables) {
      await table.clear();
    }
  });
}

/**
 * Check IndexedDB quota usage
 */
export async function checkQuota(): Promise<{
  usage: number;
  quota: number;
  percentage: number;
  available: number;
}> {
  if (!navigator.storage || !navigator.storage.estimate) {
    return {
      usage: 0,
      quota: 0,
      percentage: 0,
      available: 0,
    };
  }

  try {
    const estimate = await navigator.storage.estimate();
    const usage = estimate.usage || 0;
    const quota = estimate.quota || 0;
    const percentage = quota > 0 ? (usage / quota) * 100 : 0;
    const available = quota - usage;

    return {
      usage,
      quota,
      percentage,
      available,
    };
  } catch (error) {
    console.error('Error checking quota:', error);
    return {
      usage: 0,
      quota: 0,
      percentage: 0,
      available: 0,
    };
  }
}

/** Backup payload format (version 2 covers all 14 stores). */
export interface BackupPayload {
  version: number;
  exportedAt: string;
  data: Partial<Record<StoreName, unknown[]>>;
}

/**
 * Export all data as JSON (for backup/migration).
 * R-F9: covers all 14 declared stores, read in ONE readonly transaction so
 * the snapshot is consistent.
 */
export async function exportAllData(): Promise<string> {
  const tables = ALL_STORE_NAMES.map((name) => db.table(name));
  const data: Partial<Record<StoreName, unknown[]>> = {};

  await db.transaction('r', tables, async () => {
    for (const name of ALL_STORE_NAMES) {
      data[name] = await db.table(name).toArray();
    }
  });

  const exportData: BackupPayload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    data,
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Parse and validate a backup payload WITHOUT touching the database.
 * Rejects unknown store names, non-array store contents, and unsupported
 * versions. Version 1 legacy backups (facilities + searchHistory only) are
 * accepted; version 2 covers all 14 stores.
 */
export function validateBackupPayload(jsonData: string): BackupPayload {
  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonData);
  } catch {
    throw new Error('Invalid backup: not parseable JSON');
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid backup: payload is not an object');
  }
  const candidate = parsed as Record<string, unknown>;

  if (candidate.version !== 1 && candidate.version !== 2) {
    throw new Error(`Invalid backup: unsupported version '${String(candidate.version)}'`);
  }
  if (typeof candidate.data !== 'object' || candidate.data === null) {
    throw new Error('Invalid backup: missing data object');
  }

  const knownStores = new Set<string>(ALL_STORE_NAMES);
  for (const [storeName, rows] of Object.entries(candidate.data)) {
    if (!knownStores.has(storeName)) {
      throw new Error(`Invalid backup: unknown store '${storeName}'`);
    }
    if (!Array.isArray(rows)) {
      throw new Error(`Invalid backup: store '${storeName}' is not an array`);
    }
  }

  return candidate as unknown as BackupPayload;
}

/**
 * Import data from JSON backup.
 * R-F9: gated at the boundary; validation precedes ALL mutation; the restore
 * (clear + write of every covered store) executes in ONE transaction, so a
 * mid-restore failure rolls back and cannot leave a half-restored database.
 */
export async function importData(jsonData: string): Promise<void> {
  assertDestructiveAuthorized('importData');

  // Validate before mutate — nothing below runs on a malformed payload.
  const payload = validateBackupPayload(jsonData);
  const coveredStores = Object.keys(payload.data) as StoreName[];
  const tables = coveredStores.map((name) => db.table(name));

  await db.transaction('rw', tables, async () => {
    for (const name of coveredStores) {
      const table = db.table(name);
      await table.clear();
      const rows = payload.data[name];
      if (rows && rows.length > 0) {
        await table.bulkPut(rows);
      }
    }
  });
}

/**
 * Download exported data as a file
 */
export async function downloadBackup(): Promise<void> {
  try {
    const data = await exportAllData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `dcim-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
    
    console.log('✅ Backup downloaded');
  } catch (error) {
    console.error('Error downloading backup:', error);
    throw error;
  }
}

/**
 * Automatic cleanup when quota is nearly full (>80%).
 * R-F11: prune only declared growth/cache stores with correct indexes;
 * failures propagate (no swallow). Targets:
 * - ComplianceDatabase.searchHistory via lastUsedAt (ISO)
 * - DataCacheDatabase.cache via expiresAt (API/OSINT cache stand-in)
 */
export async function autoCleanupIfNeeded(): Promise<boolean> {
  const quota = await checkQuota();

  if (quota.percentage <= 80) {
    return false;
  }

  console.warn(`⚠️ Storage quota ${quota.percentage.toFixed(1)}% full - cleaning up...`);

  const nowIso = new Date().toISOString();
  const historyCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  await db.searchHistory.where('lastUsedAt').below(historyCutoff).delete();
  await cacheDb.cache.where('expiresAt').below(nowIso).delete();

  console.log('✅ Automatic cleanup complete');
  return true;
}

