/**
 * R-F11 acceptance: quota cleanup targets only declared growth/cache stores
 * with correct indexes; absent osintCache gone; failures surface (no swallow).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import Dexie from 'dexie';
import { indexedDB as fakeIndexedDB, IDBKeyRange as fakeIDBKeyRange } from 'fake-indexeddb';

const SOURCE_PATH = join(dirname(fileURLToPath(import.meta.url)), 'dbRecovery.ts');

let mainDb: typeof import('../db/database');
let cacheModule: typeof import('../services/DataFetcher');
let dbRecovery: typeof import('./dbRecovery');

beforeAll(async () => {
  Dexie.dependencies.indexedDB = fakeIndexedDB;
  Dexie.dependencies.IDBKeyRange = fakeIDBKeyRange;

  mainDb = await import('../db/database');
  cacheModule = await import('../services/DataFetcher');
  dbRecovery = await import('./dbRecovery');
});

beforeEach(async () => {
  await mainDb.db.searchHistory.clear();
  await cacheModule.cacheDb.cache.clear();
  vi.restoreAllMocks();
});

function stubQuota(usage: number, quota: number): void {
  Object.defineProperty(navigator, 'storage', {
    configurable: true,
    writable: true,
    value: {
      estimate: vi.fn().mockResolvedValue({ usage, quota }),
    },
  });
}

describe('R-F11 quota cleanup targets declared stores only', () => {
  it('source no longer references absent store accessor or timestamp index', () => {
    const source = readFileSync(SOURCE_PATH, 'utf8');
    expect(source).not.toMatch(/\.osintCache\b/);
    expect(source).not.toMatch(/where\('timestamp'\)/);
    expect(source).toMatch(/where\('lastUsedAt'\)/);
    expect(source).toMatch(/where\('expiresAt'\)/);
    expect(source).toMatch(/cacheDb\.cache/);
  });

  it('returns false when quota is at or below 80%', async () => {
    stubQuota(50, 100);

    await mainDb.db.searchHistory.add({
      query: 'keep',
      context: 'global',
      createdAt: '2020-01-01T00:00:00.000Z',
      lastUsedAt: '2020-01-01T00:00:00.000Z',
      count: 1,
    });

    await expect(dbRecovery.autoCleanupIfNeeded()).resolves.toBe(false);
    expect(await mainDb.db.searchHistory.count()).toBe(1);
  });

  it('prunes old searchHistory via lastUsedAt and expired cache via expiresAt', async () => {
    stubQuota(90, 100);

    const oldIso = '2020-01-01T00:00:00.000Z';
    const recentIso = new Date().toISOString();
    const expiredIso = '2020-06-01T00:00:00.000Z';
    const freshExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();

    await mainDb.db.searchHistory.bulkAdd([
      {
        query: 'stale',
        context: 'global',
        createdAt: oldIso,
        lastUsedAt: oldIso,
        count: 1,
      },
      {
        query: 'fresh',
        context: 'global',
        createdAt: recentIso,
        lastUsedAt: recentIso,
        count: 1,
      },
    ]);

    await cacheModule.cacheDb.cache.bulkPut([
      {
        id: 'expired-1',
        facilityId: 1,
        dataType: 'PeeringDB',
        data: { x: 1 },
        provenance: { source: 'PeeringDB', fetchedAt: oldIso },
        expiresAt: expiredIso,
      },
      {
        id: 'fresh-1',
        facilityId: 1,
        dataType: 'PeeringDB',
        data: { x: 2 },
        provenance: { source: 'PeeringDB', fetchedAt: recentIso },
        expiresAt: freshExpiry,
      },
    ]);

    await expect(dbRecovery.autoCleanupIfNeeded()).resolves.toBe(true);

    const remainingHistory = await mainDb.db.searchHistory.toArray();
    expect(remainingHistory.map((r) => r.query)).toEqual(['fresh']);

    const remainingCache = await cacheModule.cacheDb.cache.toArray();
    expect(remainingCache.map((r) => r.id)).toEqual(['fresh-1']);
  });

  it('rejects when prune fails instead of returning false', async () => {
    stubQuota(95, 100);

    const collection = {
      below: () => ({
        delete: async () => {
          throw new Error('simulated prune failure');
        },
      }),
    };
    vi.spyOn(mainDb.db.searchHistory, 'where').mockReturnValue(collection as never);

    await expect(dbRecovery.autoCleanupIfNeeded()).rejects.toThrow(/simulated prune failure/);
  });
});
