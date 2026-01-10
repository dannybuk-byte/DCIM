/**
 * Audit Snapshot Service
 * 
 * Captures point-in-time snapshots of verification state for audit trails.
 * Enables post-incident analysis: "What did the system know when it made this decision?"
 * 
 * Snapshots are:
 * - Append-only (never modified after creation)
 * - Indexed by timestamp and linked entity (incident/event)
 * - Retained for 30 days by default
 * - Small (~1-2KB each) to avoid storage bloat
 */

import { db } from '../db/database';
import { verificationDegradedMode } from './verificationDegradedMode';
import { rateLimitedFetch } from '../utils/rateLimitedFetch';

export interface AuditSnapshotRecord {
  id: string;
  timestamp: number;
  snapshotType: 'incident_created' | 'incident_promoted' | 'auto_confirm' | 'auto_create' | 'degraded_mode_change';
  linkedEntityType?: 'incident' | 'event';
  linkedEntityId?: string;
  
  // Verification state at decision time
  verificationState: {
    degradedMode: boolean;
    degradedReason?: string;
    lastHealthCheck?: number;
    healthStatus?: 'ok' | 'down' | 'unknown';
  };
  
  // Rate limiter state (for debugging)
  rateLimiterState?: {
    routeviews?: { consecutiveFailures: number; circuitOpen: boolean };
    rpki?: { consecutiveFailures: number; circuitOpen: boolean };
  };
  
  // Decision metadata
  decision?: {
    action: string;
    reason: string;
    gatedBy?: string[];
  };
  
  // Hash for integrity (optional future use)
  hash?: string;
}

export interface AuditSnapshotConfig {
  /** Max age before cleanup (ms) */
  maxAgeMs: number;
  /** Max snapshots to retain */
  maxSnapshots: number;
}

const DEFAULT_CONFIG: AuditSnapshotConfig = {
  maxAgeMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  maxSnapshots: 10_000,
};

function makeId(): string {
  return `snap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function simpleHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) hash = (hash * 33) ^ input.charCodeAt(i);
  return (hash >>> 0).toString(16);
}

class AuditSnapshotService {
  private config: AuditSnapshotConfig;

  constructor(config: Partial<AuditSnapshotConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Capture current verification state as a snapshot.
   */
  async capture(
    snapshotType: AuditSnapshotRecord['snapshotType'],
    options: {
      linkedEntityType?: 'incident' | 'event';
      linkedEntityId?: string;
      decision?: AuditSnapshotRecord['decision'];
    } = {},
  ): Promise<AuditSnapshotRecord> {
    const timestamp = Date.now();
    const degradedState = verificationDegradedMode.getState();

    const snapshot: AuditSnapshotRecord = {
      id: makeId(),
      timestamp,
      snapshotType,
      linkedEntityType: options.linkedEntityType,
      linkedEntityId: options.linkedEntityId,
      verificationState: {
        degradedMode: degradedState.isDegraded,
        degradedReason: degradedState.reason,
        lastHealthCheck: degradedState.lastCheck,
        healthStatus: degradedState.proxyHealth?.status,
      },
      rateLimiterState: {
        routeviews: this.getRateLimiterSnapshot('routeviews'),
        rpki: this.getRateLimiterSnapshot('rpki'),
      },
      decision: options.decision,
    };

    // Compute simple hash for integrity
    const hashInput = JSON.stringify({
      timestamp: snapshot.timestamp,
      snapshotType: snapshot.snapshotType,
      verificationState: snapshot.verificationState,
      decision: snapshot.decision,
    });
    snapshot.hash = simpleHash(hashInput);

    // Persist (best-effort, never throw)
    try {
      await db.table('auditSnapshots').put(snapshot);
    } catch (e) {
      console.warn('[AuditSnapshot] Failed to persist:', e);
    }

    // Fire-and-forget cleanup
    void this.cleanup();

    return snapshot;
  }

  private getRateLimiterSnapshot(key: string): { consecutiveFailures: number; circuitOpen: boolean } | undefined {
    const state = rateLimitedFetch.getState(key);
    if (!state) return undefined;
    return {
      consecutiveFailures: state.consecutiveFailures,
      circuitOpen: state.circuitOpenUntil !== null && state.circuitOpenUntil > Date.now(),
    };
  }

  /**
   * Get snapshots for an entity (incident or event).
   */
  async getForEntity(
    entityType: 'incident' | 'event',
    entityId: string,
    limit = 100,
  ): Promise<AuditSnapshotRecord[]> {
    try {
      return await db
        .table('auditSnapshots')
        .where('[linkedEntityType+linkedEntityId]')
        .equals([entityType, entityId])
        .reverse()
        .limit(limit)
        .toArray();
    } catch {
      return [];
    }
  }

  /**
   * Get recent snapshots of a specific type.
   */
  async getRecent(
    snapshotType?: AuditSnapshotRecord['snapshotType'],
    limit = 100,
  ): Promise<AuditSnapshotRecord[]> {
    try {
      let query = db.table('auditSnapshots').orderBy('timestamp').reverse();
      if (snapshotType) {
        query = db.table('auditSnapshots').where('snapshotType').equals(snapshotType).reverse();
      }
      return await query.limit(limit).toArray();
    } catch {
      return [];
    }
  }

  /**
   * Cleanup old snapshots.
   */
  private async cleanup(): Promise<void> {
    try {
      const cutoff = Date.now() - this.config.maxAgeMs;
      await db.table('auditSnapshots').where('timestamp').below(cutoff).delete();

      const total = await db.table('auditSnapshots').count();
      const overflow = total - this.config.maxSnapshots;
      if (overflow > 0) {
        const oldest = await db.table('auditSnapshots').orderBy('timestamp').limit(overflow).toArray();
        const ids = oldest.map((s: AuditSnapshotRecord) => s.id);
        await db.table('auditSnapshots').bulkDelete(ids);
      }
    } catch {
      // swallow
    }
  }
}

/** Singleton instance */
export const auditSnapshot = new AuditSnapshotService();

/**
 * Convenience function to capture a snapshot when an incident is created.
 */
export async function captureIncidentCreatedSnapshot(
  incidentId: string,
  wasAutoCreated: boolean,
  wasAutoConfirmed: boolean,
): Promise<AuditSnapshotRecord> {
  return auditSnapshot.capture(wasAutoCreated ? 'auto_create' : 'incident_created', {
    linkedEntityType: 'incident',
    linkedEntityId: incidentId,
    decision: {
      action: wasAutoCreated ? 'auto_create' : 'manual_create',
      reason: wasAutoConfirmed
        ? 'Verified (RouteViews confirmed + RPKI valid)'
        : 'Unverified or manual creation',
      gatedBy: wasAutoCreated ? ['verification_gate', 'degraded_mode_gate', 'severity_gate'] : [],
    },
  });
}

/**
 * Convenience function to capture a snapshot when degraded mode changes.
 */
export async function captureDegradedModeSnapshot(
  entering: boolean,
): Promise<AuditSnapshotRecord> {
  return auditSnapshot.capture('degraded_mode_change', {
    decision: {
      action: entering ? 'enter_degraded_mode' : 'exit_degraded_mode',
      reason: entering ? 'Consecutive health check failures' : 'Recovered after consecutive successes',
    },
  });
}
