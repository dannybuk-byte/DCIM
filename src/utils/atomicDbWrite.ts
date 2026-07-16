import Dexie, { Table } from 'dexie';
import { db } from '../db/database';

/**
 * Atomic grouped write at the Dexie transaction boundary.
 * Errors propagate from the boundary. No global fetch monkeypatch.
 */
export async function atomicWrite<T>(
  tables: Array<Table | string>,
  fn: () => Promise<T> | T,
  database: Dexie = db,
): Promise<T> {
  // Dexie accepts Table | string at runtime; normalize to names for the
  // typed transaction overload (TS2769 closed — keep normalization).
  const tableNames = tables.map((t) => (typeof t === 'string' ? t : t.name));
  return database.transaction('rw', tableNames, fn);
}
