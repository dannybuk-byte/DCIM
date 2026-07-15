/**
 * R-F1 acceptance (reviewer falsifier): startup never seeds a live store;
 * demo data uses a separate explicitly-selected namespace; replacement is one
 * transaction; no real primary key (incl. fixed ID 11992) overwritten.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockDb, modeState } = vi.hoisted(() => {
  const modeState = { demo: false };
  const mockDb = {
    facilities: {
      count: vi.fn<() => Promise<number>>(),
      clear: vi.fn<() => Promise<void>>(),
      bulkAdd: vi.fn<(rows: unknown[]) => Promise<void>>(),
      add: vi.fn<(row: unknown) => Promise<void>>(),
    },
    transaction: vi.fn(
      async (_mode: string, _tables: unknown, scope: () => Promise<void>): Promise<void> => scope(),
    ),
  };
  return { mockDb, modeState };
});

vi.mock('./database', () => ({ db: mockDb }));

vi.mock('./demoMode', () => ({
  LIVE_DB_NAME: 'ComplianceDatabase',
  DEMO_DB_NAME: 'ComplianceDatabase_demo',
  isDemoMode: (): boolean => modeState.demo,
  activeDbName: (): string =>
    modeState.demo ? 'ComplianceDatabase_demo' : 'ComplianceDatabase',
}));

import { seedDatabase } from './seedData';
import { PRINCE_WILLIAM_CLUSTER_FACILITY_ID } from '../data/princeWilliamClusterFacility';
import type { Facility } from '../types';

beforeEach(() => {
  vi.clearAllMocks();
  modeState.demo = false;
});

describe('R-F1 safe seeding', () => {
  it('live mode: seedDatabase is a strict no-op (no reads, no writes, no clears)', async () => {
    modeState.demo = false;

    const result = await seedDatabase();

    expect(result).toEqual({ seeded: false, reason: 'live-mode-noop' });
    expect(mockDb.facilities.count).not.toHaveBeenCalled();
    expect(mockDb.facilities.clear).not.toHaveBeenCalled();
    expect(mockDb.facilities.bulkAdd).not.toHaveBeenCalled();
    expect(mockDb.facilities.add).not.toHaveBeenCalled();
    expect(mockDb.transaction).not.toHaveBeenCalled();
  });

  it('demo mode with populated store: never cleared or overwritten implicitly', async () => {
    modeState.demo = true;
    mockDb.facilities.count.mockResolvedValue(5);

    const result = await seedDatabase();

    expect(result).toEqual({ seeded: false, reason: 'demo-already-populated' });
    expect(mockDb.facilities.clear).not.toHaveBeenCalled();
    expect(mockDb.facilities.bulkAdd).not.toHaveBeenCalled();
    expect(mockDb.facilities.add).not.toHaveBeenCalled();
  });

  it('demo mode with empty store: seeds inside one transaction, fixed ID 11992 via add (never put)', async () => {
    modeState.demo = true;
    mockDb.facilities.count.mockResolvedValue(0);

    const result = await seedDatabase();

    expect(result).toEqual({ seeded: true, reason: 'demo-seeded' });
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);
    expect(mockDb.facilities.clear).not.toHaveBeenCalled();

    const bulkRows = mockDb.facilities.bulkAdd.mock.calls[0][0] as Facility[];
    expect(bulkRows).toHaveLength(PRINCE_WILLIAM_CLUSTER_FACILITY_ID - 1);
    expect(bulkRows.some((f) => f.id === PRINCE_WILLIAM_CLUSTER_FACILITY_ID)).toBe(false);

    const curated = mockDb.facilities.add.mock.calls[0][0] as Facility;
    expect(curated.id).toBe(PRINCE_WILLIAM_CLUSTER_FACILITY_ID);

    // Writes happened inside the transaction scope
    const txOrder = mockDb.transaction.mock.invocationCallOrder[0];
    expect(mockDb.facilities.bulkAdd.mock.invocationCallOrder[0]).toBeGreaterThan(txOrder);
    expect(mockDb.facilities.add.mock.invocationCallOrder[0]).toBeGreaterThan(txOrder);
  });

  it('demo mode replacement requires explicit option and is one transaction', async () => {
    modeState.demo = true;
    mockDb.facilities.count.mockResolvedValue(11992);

    const result = await seedDatabase({ replaceExisting: true });

    expect(result).toEqual({ seeded: true, reason: 'demo-replaced' });
    expect(mockDb.transaction).toHaveBeenCalledTimes(1);

    const txOrder = mockDb.transaction.mock.invocationCallOrder[0];
    expect(mockDb.facilities.clear.mock.invocationCallOrder[0]).toBeGreaterThan(txOrder);
    expect(mockDb.facilities.bulkAdd.mock.invocationCallOrder[0]).toBeGreaterThan(txOrder);
    expect(mockDb.facilities.add.mock.invocationCallOrder[0]).toBeGreaterThan(txOrder);
  });
});
