import Dexie, { Table } from 'dexie';
import { db } from '../db/database';

let transactionDepth = 0;
let fetchGuardInstalled = false;
let originalFetch: typeof fetch | undefined;

function installFetchGuard(): void {
  if (fetchGuardInstalled || typeof globalThis.fetch !== 'function') {
    return;
  }
  originalFetch = globalThis.fetch.bind(globalThis);
  fetchGuardInstalled = true;
  globalThis.fetch = ((...args: Parameters<typeof fetch>) => {
    if (transactionDepth > 0) {
      return Promise.reject(
        new Error('Network fetch is forbidden inside a Dexie transaction'),
      );
    }
    return originalFetch!(...args);
  }) as typeof fetch;
}

/**
 * Atomic grouped write at the Dexie transaction boundary.
 * Errors propagate from the boundary; network fetch inside the callback is rejected.
 */
export async function atomicWrite<T>(
  tables: Array<Table | string>,
  fn: () => Promise<T> | T,
  database: Dexie = db,
): Promise<T> {
  installFetchGuard();
  const mode = 'rw' as const;
  // Dexie accepts Table | string at runtime; normalize to names for the
  // typed transaction overload (TS2769 / remediation-introduced).
  const tableNames = tables.map((t) => (typeof t === 'string' ? t : t.name));
  return database.transaction(mode, tableNames, async () => {
    transactionDepth += 1;
    try {
      return await fn();
    } finally {
      transactionDepth -= 1;
    }
  });
}

/** Test / diagnostic: current nested transaction depth for this helper. */
export function getAtomicWriteDepth(): number {
  return transactionDepth;
}
