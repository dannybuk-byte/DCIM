/**
 * R-F8: durable backup persistence with integrity verification and history.
 *
 * Backups live in a SEPARATE IndexedDB database ('ComplianceBackups') so that
 * deletion or corruption of the main compliance database cannot destroy them.
 * Every record carries a SHA-256 digest of its payload; the digest is verified
 * by read-back immediately after write and again on every read. All failures
 * throw — nothing is swallowed.
 */

import Dexie, { Table } from 'dexie';
import { activeDbName } from '../db/demoMode';
import { importData } from './dbRecovery';

export interface BackupRecord {
  id?: number;
  createdAt: string;
  /** Namespace the bytes came from (live vs demo) — checked again on restore. */
  sourceDbName: string;
  byteLength: number;
  sha256: string;
  /** Full exported JSON payload. */
  payload: string;
}

export type BackupMeta = Omit<BackupRecord, 'payload'>;

/** Number of most-recent backups retained in history. */
export const BACKUP_RETENTION = 5;

export const BACKUP_DB_NAME = 'ComplianceBackups';

class BackupDatabase extends Dexie {
  backups!: Table<BackupRecord, number>;

  constructor() {
    super(BACKUP_DB_NAME);
    this.version(1).stores({
      backups: '++id, createdAt, sourceDbName',
    });
  }
}

export const backupDb = new BackupDatabase();

export async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Durably persist exported bytes, verify integrity by read-back, and prune
 * history to BACKUP_RETENTION. Throws on any failure (write, read-back, or
 * digest mismatch); a record that fails verification is deleted, never kept.
 */
export async function persistBackup(payload: string): Promise<BackupRecord> {
  const sha256 = await sha256Hex(payload);
  const record: BackupRecord = {
    createdAt: new Date().toISOString(),
    sourceDbName: activeDbName(),
    byteLength: new TextEncoder().encode(payload).length,
    sha256,
    payload,
  };

  const id = await backupDb.backups.add(record);

  const stored = await backupDb.backups.get(id);
  if (!stored) {
    throw new Error(`Backup ${id} not found on read-back; persistence failed`);
  }
  const readBackDigest = await sha256Hex(stored.payload);
  if (readBackDigest !== sha256) {
    await backupDb.backups.delete(id);
    throw new Error(
      `Backup ${id} failed integrity verification after write (expected ${sha256}, got ${readBackDigest}); record deleted`,
    );
  }

  await pruneBackups(BACKUP_RETENTION);
  return { ...stored, id };
}

/** History metadata (newest first), without payloads. */
export async function listBackups(): Promise<BackupMeta[]> {
  const records = await backupDb.backups.orderBy('createdAt').reverse().toArray();
  return records.map(({ payload: _payload, ...meta }) => meta);
}

/** Fetch a backup and verify its digest; throws on missing or tampered bytes. */
export async function getVerifiedBackup(id: number): Promise<BackupRecord> {
  const record = await backupDb.backups.get(id);
  if (!record) {
    throw new Error(`Backup ${id} not found`);
  }
  const digest = await sha256Hex(record.payload);
  if (digest !== record.sha256) {
    throw new Error(
      `Backup ${id} failed integrity check (stored ${record.sha256}, computed ${digest}); refusing to use it`,
    );
  }
  return record;
}

/** Newest verified backup for the active namespace, or null when none exist. */
export async function getLatestVerifiedBackup(): Promise<BackupRecord | null> {
  const records = await backupDb.backups
    .where('sourceDbName')
    .equals(activeDbName())
    .sortBy('createdAt');
  const newest = records[records.length - 1];
  if (!newest || newest.id === undefined) {
    return null;
  }
  return getVerifiedBackup(newest.id);
}

/** Keep the `keep` newest records; returns how many were deleted. */
export async function pruneBackups(keep: number): Promise<number> {
  const ids = (await backupDb.backups.orderBy('createdAt').reverse().primaryKeys()) as number[];
  const surplus = ids.slice(keep);
  if (surplus.length > 0) {
    await backupDb.backups.bulkDelete(surplus);
  }
  return surplus.length;
}

/**
 * Restore a persisted backup into the main database. Integrity is verified
 * before any mutation, and a cross-namespace restore (demo bytes into the
 * live store or vice versa) is refused. Delegates the write to importData,
 * which enforces the destructive-boundary gate, validates before mutating,
 * and restores every covered store in one transaction (R-F9).
 */
export async function restoreBackup(id: number): Promise<void> {
  const record = await getVerifiedBackup(id);
  if (record.sourceDbName !== activeDbName()) {
    throw new Error(
      `Backup ${id} came from '${record.sourceDbName}' but the active database is '${activeDbName()}'; cross-namespace restore refused`,
    );
  }
  await importData(record.payload);
}
