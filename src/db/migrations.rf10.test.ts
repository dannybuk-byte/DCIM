/**
 * R-F10 acceptance (reviewer falsifier): demo BGP metrics are isolated to the
 * demo namespace — they cannot enter live facility rows — and the historical
 * v3–v8(–v9) migration path is covered by fixtures for data preservation,
 * idempotency, and atomicity. Runs real Dexie upgrades against fake-indexeddb.
 */

import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { indexedDB as fakeIndexedDB, IDBKeyRange as fakeIDBKeyRange } from 'fake-indexeddb';
import type { Facility } from '../types';

const { modeState } = vi.hoisted(() => ({ modeState: { demo: false } }));

const LIVE_NAME = 'ComplianceDatabase';
const DEMO_NAME = 'ComplianceDatabase_demo';

vi.mock('./demoMode', () => ({
  LIVE_DB_NAME: LIVE_NAME,
  DEMO_DB_NAME: DEMO_NAME,
  isDemoMode: (): boolean => modeState.demo,
  activeDbName: (): string => (modeState.demo ? DEMO_NAME : LIVE_NAME),
}));

let Dexie: typeof import('dexie').default;
let ComplianceDatabase: typeof import('./database').ComplianceDatabase;
let demoBgp: typeof import('../utils/demoBgpMigration');

const DEMO_FIELDS = [
  'bgpRiskScore',
  'asnCount',
  'routeChangeRate',
  'latencyAnomalyScore',
  'transitDependency',
  'infrastructureAccountabilityRisk',
] as const;

/** Schema strings copied from database.ts (fixtures must match history). */
const V3_STORES = {
  facilities:
    '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
};
const V8_STORES = {
  facilities:
    '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, subsidyReceived, jobsPromised, jobsCreated, openedDate, capacity, lastAuditDate',
  dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
  communityContext: 'countyFips',
  subsidyAgreements: '++id, facilityId',
  localSignatures: '++id, facilityId',
  localOrganizations: '++id, countyFips, type',
  knowledgeGaps: '++id, facilityId, [facilityId+status]',
  engagementTracking: '++id, facilityId',
  settings: 'key',
  networkSecurity: '++id, facilityId, asn, rpkiStatus',
  sources: '++id, type, addedAt, *tags, *facilityIds',
  citations: '++id, sourceId, [entityType+entityId]',
  researchNotes: '++id, createdAt, updatedAt, *tags, *relatedFacilities, *relatedSources, category',
  searchHistory: '++id, query, context, lastUsedAt, [context+lastUsedAt]',
};
const V9_STORES = {
  ...V8_STORES,
  facilities:
    '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, subsidyReceived, jobsPromised, jobsCreated, openedDate, capacity, bgpRiskScore, routeChangeRate, latencyAnomalyScore, transitDependency, infrastructureAccountabilityRisk, lastAuditDate',
};

function makeFacility(id: number, name: string): Facility {
  return {
    id,
    name,
    type: 'Data Center',
    operator: 'Real Operator',
    country: 'US',
    state: 'VA',
    city: 'Ashburn',
    complianceStatus: 'Non-Compliant',
    subsidyGap: 4_000_000,
    lastAuditDate: '2026-01-01',
    issues: [],
    latitude: 39,
    longitude: -77.4,
  } as Facility;
}

function expectNoDemoFields(row: Facility): void {
  for (const field of DEMO_FIELDS) {
    expect((row as Record<string, unknown>)[field], field).toBeUndefined();
  }
}

function expectAllDemoFields(row: Facility): void {
  for (const field of DEMO_FIELDS) {
    expect((row as Record<string, unknown>)[field], field).toBeDefined();
  }
}

/** Create a database frozen at an historical Dexie version, with rows. */
async function createHistoricalDb(
  name: string,
  verno: number,
  stores: Record<string, string>,
  rows: Facility[],
): Promise<void> {
  const fixture = new Dexie(name);
  fixture.version(verno).stores(stores);
  await fixture.open();
  await fixture.table('facilities').bulkAdd(rows);
  fixture.close();
}

/** Open the REAL ComplianceDatabase against the selected namespace. */
async function openCurrent(demo: boolean): Promise<InstanceType<typeof ComplianceDatabase>> {
  modeState.demo = demo;
  const db = new ComplianceDatabase();
  await db.open();
  return db;
}

beforeAll(async () => {
  const dexieMod = await import('dexie');
  Dexie = dexieMod.default;
  Dexie.dependencies.indexedDB = fakeIndexedDB;
  Dexie.dependencies.IDBKeyRange = fakeIDBKeyRange;

  const dbMod = await import('./database');
  ComplianceDatabase = dbMod.ComplianceDatabase;
  demoBgp = await import('../utils/demoBgpMigration');
});

beforeEach(async () => {
  await Dexie.delete(LIVE_NAME);
  await Dexie.delete(DEMO_NAME);
  modeState.demo = false;
});

describe('R-F10 live namespace: demo BGP metrics cannot enter live facility rows', () => {
  it('v3 → current preserves rows and adds NO demo fields', async () => {
    await createHistoricalDb(LIVE_NAME, 3, V3_STORES, [
      makeFacility(1, 'Live Alpha'),
      makeFacility(2, 'Live Beta'),
    ]);

    const db = await openCurrent(false);
    expect(db.verno).toBe(10);
    const rows = await db.facilities.toArray();
    expect(rows.map(r => r.name).sort()).toEqual(['Live Alpha', 'Live Beta']);
    for (const row of rows) {
      expectNoDemoFields(row);
      expect(row.operator).toBe('Real Operator');
      expect(row.subsidyGap).toBe(4_000_000);
    }
    db.close();
  });

  it('v8 → current preserves rows and adds NO demo fields', async () => {
    await createHistoricalDb(LIVE_NAME, 8, V8_STORES, [makeFacility(7, 'Live Gamma')]);

    const db = await openCurrent(false);
    expect(db.verno).toBe(10);
    const row = await db.facilities.get(7);
    expect(row?.name).toBe('Live Gamma');
    expectNoDemoFields(row as Facility);
    db.close();
  });

  it('v9-polluted live rows are STRIPPED by v10 (repair of the un-gated backfill)', async () => {
    const polluted = demoBgp.applyV9DemoBgpBackfill(makeFacility(3, 'Polluted Row'));
    expectAllDemoFields(polluted);
    await createHistoricalDb(LIVE_NAME, 9, V9_STORES, [polluted, makeFacility(4, 'Clean Row')]);

    const db = await openCurrent(false);
    expect(db.verno).toBe(10);
    const restored = await db.facilities.get(3);
    expectNoDemoFields(restored as Facility);
    // Real fields survive the strip untouched.
    expect(restored?.name).toBe('Polluted Row');
    expect(restored?.complianceStatus).toBe('Non-Compliant');
    expect(restored?.subsidyGap).toBe(4_000_000);
    expectNoDemoFields((await db.facilities.get(4)) as Facility);
    db.close();
  });

  it('idempotent: reopening the upgraded live database changes nothing', async () => {
    await createHistoricalDb(LIVE_NAME, 3, V3_STORES, [makeFacility(1, 'Stable Row')]);

    const first = await openCurrent(false);
    const afterFirst = await first.facilities.toArray();
    first.close();

    const second = await openCurrent(false);
    expect(second.verno).toBe(10);
    expect(await second.facilities.toArray()).toEqual(afterFirst);
    second.close();
  });
});

describe('R-F10 demo namespace: backfill applies only here, deterministically', () => {
  it('v3 → current backfills demo fields in the demo namespace only', async () => {
    await createHistoricalDb(DEMO_NAME, 3, V3_STORES, [makeFacility(11, 'Demo Alpha')]);

    const db = await openCurrent(true);
    expect(db.name).toBe(DEMO_NAME);
    expect(db.verno).toBe(10);
    const row = await db.facilities.get(11);
    expectAllDemoFields(row as Facility);
    db.close();
  });

  it('backfill is idempotent: reopen leaves the same deterministic values', async () => {
    await createHistoricalDb(DEMO_NAME, 3, V3_STORES, [makeFacility(11, 'Demo Alpha')]);

    const first = await openCurrent(true);
    const before = await first.facilities.get(11);
    first.close();

    const second = await openCurrent(true);
    const after = await second.facilities.get(11);
    expect(after).toEqual(before);
    second.close();
  });

  it('pure mirrors agree: backfill/strip round-trip restores the original row', () => {
    const original = makeFacility(21, 'Round Trip');
    const backfilled = demoBgp.applyV9DemoBgpBackfill(original);
    expectAllDemoFields(backfilled);
    const stripped = demoBgp.stripDemoBgpFields(backfilled);
    expect(stripped).toEqual(original);
    expect(demoBgp.hasAnyDemoBgpField(stripped)).toBe(false);
  });
});

describe('R-F10 atomicity: a failing facilities migration rolls back completely', () => {
  it('mid-migration failure leaves version and every row untouched', async () => {
    const rows = [1, 2, 3].map(id =>
      demoBgp.applyV9DemoBgpBackfill(makeFacility(id, `Row ${id}`)),
    );
    await createHistoricalDb(LIVE_NAME, 9, V9_STORES, rows);

    // Same shape as the real v10 strip migration, but poisoned on row 2 —
    // proving the version-change transaction is all-or-nothing.
    const poisoned = new Dexie(LIVE_NAME);
    poisoned.version(9).stores(V9_STORES);
    poisoned.version(10).upgrade(async tx => {
      await tx.table('facilities').toCollection().modify((f: Facility) => {
        if (f.id === 2) throw new Error('simulated mid-migration failure');
        demoBgp.stripDemoBgpFieldsInPlace(f);
      });
    });
    await expect(poisoned.open()).rejects.toThrow();
    poisoned.close();

    // Reopen frozen at v9: nothing was stripped, nothing was lost.
    const inspect = new Dexie(LIVE_NAME);
    inspect.version(9).stores(V9_STORES);
    await inspect.open();
    expect(inspect.verno).toBe(9);
    const survivors = (await inspect.table('facilities').toArray()) as Facility[];
    expect(survivors).toHaveLength(3);
    for (const row of survivors) {
      expectAllDemoFields(row);
    }
    inspect.close();
  });
});
