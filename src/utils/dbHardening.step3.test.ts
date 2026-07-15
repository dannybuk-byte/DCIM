/**
 * Step-3: call-site neutralization, diagnostic gate, atomic write, v9 idempotence, network guard.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  acknowledgeExport,
  buildDbDiagnostic,
  canEnableDestructiveControl,
  resetDestructivePrepState,
  acknowledgeDiagnostic,
} from './dbDiagnosticGate';
import { applyV9DemoBgpBackfill } from './demoBgpMigration';
import type { Facility } from '../types';
import {
  safeDbOperationWithRecovery,
  startDatabaseHealthMonitor,
} from './dbRecovery';
import { atomicWrite } from './atomicDbWrite';
import * as dbRecovery from './dbRecovery';

describe('T4 no auto-destroy call sites', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('safeDbOperationWithRecovery does not deleteDatabase on corruption-class errors', async () => {
    const deleteSpy = vi.fn();
    const original = window.indexedDB.deleteDatabase;
    window.indexedDB.deleteDatabase = deleteSpy as typeof window.indexedDB.deleteDatabase;

    const result = await safeDbOperationWithRecovery(
      async () => {
        throw new Error('VersionError: schema mismatch');
      },
      'fallback',
      { maxRetries: 1, retryDelay: 1 },
    );

    expect(result).toBe('fallback');
    expect(deleteSpy).not.toHaveBeenCalled();
    window.indexedDB.deleteDatabase = original;
  });

  it('startDatabaseHealthMonitor does not deleteDatabase when unhealthy', async () => {
    vi.useFakeTimers();
    const deleteSpy = vi.fn();
    const original = window.indexedDB.deleteDatabase;
    window.indexedDB.deleteDatabase = deleteSpy as typeof window.indexedDB.deleteDatabase;

    const healthSpy = vi.spyOn(dbRecovery, 'checkDatabaseHealth').mockResolvedValue({
      healthy: false,
      facilityCount: 0,
      error: 'boom',
    });

    const stop = startDatabaseHealthMonitor(1000);
    await vi.advanceTimersByTimeAsync(1100);
    await Promise.resolve();
    expect(deleteSpy).not.toHaveBeenCalled();
    stop();
    healthSpy.mockRestore();
    window.indexedDB.deleteDatabase = original;
  });
});

describe('T5 export/diagnostic gate', () => {
  beforeEach(() => {
    resetDestructivePrepState();
  });

  it('destructive control disabled until export or diagnostic', async () => {
    expect(canEnableDestructiveControl()).toBe(false);
    acknowledgeExport('2026-07-11T00:00:00.000Z');
    expect(canEnableDestructiveControl()).toBe(true);

    resetDestructivePrepState();
    expect(canEnableDestructiveControl()).toBe(false);

    const d = await buildDbDiagnostic('ready');
    expect(d.dbName).toBe('ComplianceDatabase');
    expect(typeof d.version).toBe('number');
    expect(canEnableDestructiveControl()).toBe(true);
  });

  it('diagnostic acknowledge unlocks gate', () => {
    acknowledgeDiagnostic({
      capturedAt: '2026-07-11T01:00:00.000Z',
      dbName: 'ComplianceDatabase',
      version: 9,
      tableCounts: {},
      quota: { usage: 0, quota: 0, percentage: 0, available: 0 },
    });
    expect(canEnableDestructiveControl()).toBe(true);
  });
});

describe('T6 atomic write boundary', () => {
  it('propagates errors from the transaction callback', async () => {
    const mockDb = {
      transaction: async (
        _mode: string,
        _tables: unknown,
        fn: () => Promise<unknown> | unknown,
      ) => fn(),
    };

    await expect(
      atomicWrite(['facilities'], async () => {
        throw new Error('mid-write failure');
      }, mockDb as never),
    ).rejects.toThrow('mid-write failure');
  });
});

describe('T8 network outside transaction', () => {
  it('rejects fetch inside atomicWrite', async () => {
    const mockDb = {
      transaction: async (
        _mode: string,
        _tables: unknown,
        fn: () => Promise<unknown> | unknown,
      ) => fn(),
    };

    await expect(
      atomicWrite(['facilities'], async () => {
        await fetch('https://example.invalid/api');
        return 1;
      }, mockDb as never),
    ).rejects.toThrow(/forbidden inside a Dexie transaction/i);
  });
});

describe('T7 v9 migration idempotence fixture', () => {
  it('backfill applies once; second pass unchanged', () => {
    const fixture = {
      id: 42,
      name: 'Fixture DC',
      type: 'Data Center',
      operator: 'TestCo',
      country: 'US',
      state: 'TX',
      city: 'Austin',
      complianceStatus: 'Unknown',
      subsidyGap: 1_000_000,
      lastAuditDate: '2026-01-01',
      issues: [],
    } as Facility;

    const once = applyV9DemoBgpBackfill(fixture);
    expect(once.bgpRiskScore).toBeTypeOf('number');
    expect(once.infrastructureAccountabilityRisk).toBeTypeOf('number');

    const twice = applyV9DemoBgpBackfill(once);
    expect(twice.bgpRiskScore).toBe(once.bgpRiskScore);
    expect(twice.infrastructureAccountabilityRisk).toBe(
      once.infrastructureAccountabilityRisk,
    );
    expect(twice.routeChangeRate).toBe(once.routeChangeRate);
  });
});
