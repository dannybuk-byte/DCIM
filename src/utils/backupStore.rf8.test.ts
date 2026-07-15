/**
 * R-F8 acceptance (reviewer falsifier): durable bytes + integrity check +
 * failure propagation + passing restore. Runs against fake-indexeddb so the
 * full Dexie write/read/restore path is exercised, not mocked.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import { indexedDB as fakeIndexedDB, IDBKeyRange as fakeIDBKeyRange } from 'fake-indexeddb';
import { webcrypto } from 'node:crypto';
import type { Facility } from '../types';

let backupStore: typeof import('./backupStore');
let mainDb: typeof import('../db/database');
let dbRecovery: typeof import('./dbRecovery');
let gate: typeof import('./dbDiagnosticGate');

function makeFacility(id: number, name: string): Facility {
  return {
    id,
    name,
    type: 'Data Center',
    operator: 'Test Operator',
    country: 'US',
    state: 'VA',
    city: 'Ashburn',
    complianceStatus: 'Compliant',
    subsidyGap: 0,
    lastAuditDate: '2026-01-01',
    issues: [],
    latitude: 39,
    longitude: -77.4,
  } as Facility;
}

beforeAll(async () => {
  // Real IndexedDB semantics via fake-indexeddb; must be set before the
  // Dexie singletons in backupStore / database are constructed.
  Dexie.dependencies.indexedDB = fakeIndexedDB;
  Dexie.dependencies.IDBKeyRange = fakeIDBKeyRange;
  if (!globalThis.crypto?.subtle) {
    vi.stubGlobal('crypto', webcrypto);
  }

  backupStore = await import('./backupStore');
  mainDb = await import('../db/database');
  dbRecovery = await import('./dbRecovery');
  gate = await import('./dbDiagnosticGate');
});

beforeEach(async () => {
  await backupStore.backupDb.backups.clear();
  await mainDb.db.facilities.clear();
  await mainDb.db.searchHistory.clear();
});

describe('R-F8 durable persistence + integrity', () => {
  it('persistBackup durably stores bytes with a verified SHA-256 digest and retains history', async () => {
    const payload = JSON.stringify({ version: 1, data: { facilities: [], searchHistory: [] } });

    const meta = await backupStore.persistBackup(payload);

    expect(meta.id).toBeDefined();
    expect(meta.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(meta.byteLength).toBe(new TextEncoder().encode(payload).length);

    const stored = await backupStore.backupDb.backups.get(meta.id as number);
    expect(stored?.payload).toBe(payload);

    const history = await backupStore.listBackups();
    expect(history).toHaveLength(1);
    expect(history[0].sha256).toBe(meta.sha256);
    expect('payload' in history[0]).toBe(false);
  });

  it('getVerifiedBackup rejects tampered bytes', async () => {
    const meta = await backupStore.persistBackup('{"version":1,"data":{}}');

    await backupStore.backupDb.backups.update(meta.id as number, {
      payload: '{"version":1,"data":{"facilities":[{"id":666}]}}',
    });

    await expect(backupStore.getVerifiedBackup(meta.id as number)).rejects.toThrow(
      /integrity check/,
    );
  });

  it('prunes history beyond the retention window', async () => {
    for (let i = 0; i < backupStore.BACKUP_RETENTION + 2; i++) {
      await backupStore.persistBackup(`{"version":1,"n":${i}}`);
    }
    const history = await backupStore.listBackups();
    expect(history).toHaveLength(backupStore.BACKUP_RETENTION);
  });

  it('propagates persistence failures instead of swallowing them', async () => {
    const addSpy = vi
      .spyOn(backupStore.backupDb.backups, 'add')
      .mockRejectedValueOnce(new Error('QuotaExceededError: disk full'));

    await expect(backupStore.persistBackup('{"version":1}')).rejects.toThrow(/QuotaExceeded/);
    addSpy.mockRestore();
  });
});

describe('R-F8 restore proof', () => {
  beforeEach(() => {
    // Restore goes through importData, which enforces the R-F9 destructive
    // gate; a persisted export is the session prep here.
    gate.resetDestructivePrepState();
    gate.acknowledgeExport();
  });

  it('export → persist → destroy → restore round-trips the data', async () => {
    const original = [makeFacility(1, 'Alpha DC'), makeFacility(2, 'Beta DC')];
    await mainDb.db.facilities.bulkAdd(original);

    const exported = await dbRecovery.exportAllData();
    const meta = await backupStore.persistBackup(exported);

    // Simulate data destruction
    await mainDb.db.facilities.clear();
    expect(await mainDb.db.facilities.count()).toBe(0);

    await backupStore.restoreBackup(meta.id as number);

    const restored = await mainDb.db.facilities.orderBy('id').toArray();
    expect(restored).toHaveLength(2);
    expect(restored.map((f) => f.name)).toEqual(['Alpha DC', 'Beta DC']);
  });

  it('refuses restore when integrity fails — no mutation happens', async () => {
    await mainDb.db.facilities.add(makeFacility(7, 'Survivor DC'));

    const exported = await dbRecovery.exportAllData();
    const meta = await backupStore.persistBackup(exported);
    await backupStore.backupDb.backups.update(meta.id as number, { payload: '{"corrupt":true}' });

    await expect(backupStore.restoreBackup(meta.id as number)).rejects.toThrow(/integrity/);

    // Validation preceded mutation: existing data untouched
    expect(await mainDb.db.facilities.count()).toBe(1);
  });

  it('refuses cross-namespace restore (demo bytes cannot enter the live store)', async () => {
    const meta = await backupStore.persistBackup('{"version":1,"data":{}}');
    await backupStore.backupDb.backups.update(meta.id as number, {
      sourceDbName: 'ComplianceDatabase_demo',
      sha256: await backupStore.sha256Hex('{"version":1,"data":{}}'),
    });

    await expect(backupStore.restoreBackup(meta.id as number)).rejects.toThrow(
      /cross-namespace restore refused/,
    );
  });
});
