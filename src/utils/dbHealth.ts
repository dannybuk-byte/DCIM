// Database Health Checks and Recovery (Pattern 23, 25)
// Ensures IndexedDB is working and recovers from failures

import { db } from '../db/database';

export interface DBHealthStatus {
  healthy: boolean;
  version: number;
  tables: string[];
  issues: string[];
}

/**
 * Check database health
 */
export async function checkDBHealth(): Promise<DBHealthStatus> {
  const status: DBHealthStatus = {
    healthy: true,
    version: db.verno,
    tables: [],
    issues: [],
  };

  try {
    // Check if database is accessible
    const tables = ['facilities', 'dataProvenance', 'communityContext', 'subsidyAgreements'];
    status.tables = tables;

    // Try to read from each table
    for (const table of tables) {
      try {
        const count = await (db as any)[table].count();
        if (count === undefined) {
          status.issues.push(`Table ${table} count failed`);
          status.healthy = false;
        }
      } catch (error) {
        status.issues.push(`Table ${table} inaccessible: ${error instanceof Error ? error.message : 'Unknown error'}`);
        status.healthy = false;
      }
    }

    // Check database version
    if (db.verno < 4) {
      status.issues.push(`Database version ${db.verno} is outdated (expected 4)`);
      status.healthy = false;
    }
  } catch (error) {
    status.healthy = false;
    status.issues.push(`Database health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return status;
}

/**
 * Attempt to recover database
 */
export async function recoverDatabase(): Promise<boolean> {
  try {
    // Close existing connection
    db.close();

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Try to reopen (Dexie handles this automatically)
    // Just verify we can read
    await db.facilities.count();

    return true;
  } catch (error) {
    console.error('Database recovery failed:', error);
    return false;
  }
}

/**
 * Verify database integrity
 */
export async function verifyDBIntegrity(): Promise<{ valid: boolean; issues: string[] }> {
  const issues: string[] = [];

  try {
    // Check facilities table
    const facilities = await db.facilities.toArray();
    
    // Verify required fields
    for (const facility of facilities) {
      if (!facility.id || !facility.name || !facility.state) {
        issues.push(`Facility ${facility.id} missing required fields`);
      }
      
      if (typeof facility.subsidyGap !== 'number' || facility.subsidyGap < 0) {
        issues.push(`Facility ${facility.id} has invalid subsidyGap`);
      }
    }

    // Check community context
    const contexts = await db.communityContext.toArray();
    for (const context of contexts) {
      if (!context.countyFips || context.countyFips.length !== 5) {
        issues.push(`Invalid countyFips: ${context.countyFips}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  } catch (error) {
    return {
      valid: false,
      issues: [`Integrity check failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
    };
  }
}

