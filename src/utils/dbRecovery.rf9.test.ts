/**
 * R-F9 acceptance (reviewer falsifier): authorization enforced at each
 * destructive boundary; all-store coverage; validation precedes mutation;
 * single-transaction restore; recoverDatabase targets the real DB name.
 * Runs against fake-indexeddb (real Dexie transactions, not mocks).
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import { indexedDB as fakeIndexedDB, IDBKeyRange as fakeIDBKeyRange } from 'fake-indexeddb';
import type { Facility } from '../types';

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
  Dexie.dependencies.indexedDB = fakeIndexedDB;
  Dexie.dependencies.IDBKeyRange = fakeIDBKeyRange;

  mainDb = await import('../db/database');
  dbRecovery = await import('./dbRecovery');
  gate = await import('./dbDiagnosticGate');
});

beforeEach(async () => {
  gate.resetDestructivePrepState();
  for (const name of mainDb.ALL_STORE_NAMES) {
    await mainDb.db.table(name).clear();
  }
});

describe('R-F9 gate at every destructive boundary', () => {
  it('clearAllData refuses without session prep and leaves data intact', async () => {
    await mainDb.db.facilities.add(makeFacility(1, 'Keep Me'));

    await expect(dbRecovery.clearAllData()).rejects.toThrow(/blocked/);
    expect(await mainDb.db.facilities.count()).toBe(1);
  });

  it('importData refuses without session prep', async () => {
    await expect(
      dbRecovery.importData('{"version":2,"exportedAt":"x","data":{}}'),
    ).rejects.toThrow(/blocked/);
  });

  it('recoverDatabase refuses without session prep', async () => {
    await expect(dbRecovery.recoverDatabase()).rejects.toThrow(/blocked/);
  });

  it('deleteDatabase refuses without session prep', async () => {
    await expect(dbRecovery.deleteDatabase()).rejects.toThrow(/blocked/);
  });

  it('boundaries unlock after export acknowledgement', async () => {
    gate.acknowledgeExport();
    await mainDb.db.facilities.add(makeFacility(1, 'Clearable'));
    await dbRecovery.clearAllData();
    expect(await mainDb.db.facilities.count()).toBe(0);
  });
});

describe('R-F9 all-store coverage', () => {
  it('declares exactly the 14 schema stores', () => {
    const declared = mainDb.db.tables.map((t) => t.name).sort();
    expect([...mainDb.ALL_STORE_NAMES].sort()).toEqual(declared);
    expect(mainDb.ALL_STORE_NAMES).toHaveLength(14);
  });

  it('exportAllData includes every one of the 14 stores', async () => {
    const payload = JSON.parse(await dbRecovery.exportAllData());
    expect(payload.version).toBe(2);
    expect(Object.keys(payload.data).sort()).toEqual([...mainDb.ALL_STORE_NAMES].sort());
  });

  it('clearAllData empties every one of the 14 stores', async () => {
    gate.acknowledgeExport();
    await mainDb.db.facilities.add(makeFacility(1, 'A'));
    await mainDb.db.settings.put({ key: 'k', value: 1 });
    await mainDb.db.researchNotes.add({
      title: 't',
      content: 'c',
      createdAt: 'x',
      updatedAt: 'x',
    });

    await dbRecovery.clearAllData();

    for (const name of mainDb.ALL_STORE_NAMES) {
      expect(await mainDb.db.table(name).count()).toBe(0);
    }
  });

  it('export → import round-trips non-facility stores too', async () => {
    gate.acknowledgeExport();
    await mainDb.db.subsidyAgreements.add({
      facilityId: 1,
      promisedJobs: 100,
      promisedInvestment: 1_000_000,
      incentiveValue: 50_000,
      incentiveType: 'tax',
      permitDate: '2026-01-01',
      sourceDocument: 'doc',
      sourceType: 'government_summary' as never,
    });
    await mainDb.db.settings.put({ key: 'theme', value: 'dark' });

    const exported = await dbRecovery.exportAllData();
    await dbRecovery.clearAllData();
    await dbRecovery.importData(exported);

    expect(await mainDb.db.subsidyAgreements.count()).toBe(1);
    expect((await mainDb.db.settings.get('theme'))?.value).toBe('dark');
  });
});

describe('R-F9 validation precedes mutation', () => {
  it.each([
    ['not JSON', 'not-json{{{'],
    ['unsupported version', '{"version":99,"data":{}}'],
    ['missing data', '{"version":2}'],
    ['unknown store', '{"version":2,"data":{"evilStore":[]}}'],
    ['non-array store', '{"version":2,"data":{"facilities":{"id":1}}}'],
  ])('rejects %s without touching existing data', async (_label, payload) => {
    gate.acknowledgeExport();
    await mainDb.db.facilities.add(makeFacility(5, 'Survivor'));

    await expect(dbRecovery.importData(payload)).rejects.toThrow(/Invalid backup/);
    expect(await mainDb.db.facilities.count()).toBe(1);
  });
});

describe('R-F9 single-transaction restore', () => {
  it('a mid-restore failure rolls back — no half-restored database', async () => {
    gate.acknowledgeExport();
    await mainDb.db.facilities.add(makeFacility(1, 'Original'));
    await mainDb.db.settings.put({ key: 'keep', value: true });

    // searchHistory row missing required fields is fine for Dexie, so force
    // failure with an invalid nested key type instead: a row whose primary
    // key ('++id') is an object is rejected by IndexedDB at put time —
    // AFTER facilities was already cleared inside the same transaction.
    const bad = JSON.stringify({
      version: 2,
      exportedAt: 'x',
      data: {
        facilities: [makeFacility(2, 'Replacement')],
        settings: [{ key: { bogus: true }, value: 1 }],
      },
    });

    await expect(dbRecovery.importData(bad)).rejects.toThrow();

    // Transaction rolled back: original facility and setting still present.
    const facilities = await mainDb.db.facilities.toArray();
    expect(facilities.map((f) => f.name)).toEqual(['Original']);
    expect((await mainDb.db.settings.get('keep'))?.value).toBe(true);
  });
});

describe('R-F9 recoverDatabase targets the real database', () => {
  it('deleteDatabase deletes db.name (ComplianceDatabase), not the phantom name', async () => {
    gate.acknowledgeExport();

    // window.indexedDB is a locked test-setup mock, but its methods are
    // mutable (same pattern as the step-3 suite).
    const original = window.indexedDB.deleteDatabase;
    const deleteSpy = vi.fn((_name: string) => {
      const request = { onsuccess: null as null | (() => void) } as unknown as IDBOpenDBRequest;
      queueMicrotask(() => (request.onsuccess as unknown as () => void)?.());
      return request;
    });
    window.indexedDB.deleteDatabase = deleteSpy as typeof window.indexedDB.deleteDatabase;

    try {
      await dbRecovery.deleteDatabase();
      expect(deleteSpy).toHaveBeenCalledWith('ComplianceDatabase');
      expect(deleteSpy).not.toHaveBeenCalledWith('dcim-compliance-db');
    } finally {
      window.indexedDB.deleteDatabase = original;
    }
  });

  it('reseed inside recovery cannot target live data (demo-gated, R-F1)', async () => {
    const { seedDatabase } = await import('../db/seedData');
    const result = await seedDatabase();
    expect(result).toEqual({ seeded: false, reason: 'live-mode-noop' });
    expect(await mainDb.db.facilities.count()).toBe(0);
  });
});
