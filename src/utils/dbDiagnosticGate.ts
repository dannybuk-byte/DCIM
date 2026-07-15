/**
 * Non-destructive DB diagnostic + session gate for destructive controls (step-3).
 * Does not delete, recreate, or reseed.
 */

import { ALL_STORE_NAMES, db } from '../db/database';
import { checkQuota, exportAllData } from './dbRecovery';
import type { DbInitKind } from '../runtime/dbInitState';

export interface DbDiagnostic {
  capturedAt: string;
  dbName: string;
  version: number;
  initKind?: DbInitKind;
  lastError?: string;
  tableCounts: Record<string, number | 'error'>;
  quota: {
    usage: number;
    quota: number;
    percentage: number;
    available: number;
  };
}

export interface DestructivePrepState {
  exportedAt?: string;
  diagnosticCapturedAt?: string;
  diagnostic?: DbDiagnostic;
}

let prep: DestructivePrepState = {};

export function getDestructivePrepState(): DestructivePrepState {
  return { ...prep, diagnostic: prep.diagnostic ? { ...prep.diagnostic } : undefined };
}

export function resetDestructivePrepState(): void {
  prep = {};
}

export function acknowledgeDiagnostic(diagnostic: DbDiagnostic): void {
  prep = {
    ...prep,
    diagnosticCapturedAt: diagnostic.capturedAt,
    diagnostic,
  };
}

export function acknowledgeExport(exportedAt = new Date().toISOString()): void {
  prep = {
    ...prep,
    exportedAt,
  };
}

/**
 * Rebuild / destructive controls stay disabled until export OR diagnostic
 * was captured this session. Bodies of delete/reseed remain quarantined.
 */
export function canEnableDestructiveControl(): boolean {
  return Boolean(prep.exportedAt || prep.diagnosticCapturedAt);
}

/** Thrown when a destructive API is invoked without session preparation. */
export class DestructiveOperationBlockedError extends Error {
  constructor(operation: string) {
    super(
      `${operation} blocked: export a backup or capture a diagnostic first (R-F9 destructive-boundary gate)`,
    );
    this.name = 'DestructiveOperationBlockedError';
  }
}

/**
 * R-F9: authorization enforced at EVERY destructive API boundary — callers
 * of clearAllData / importData / recoverDatabase / deleteDatabase cannot
 * bypass the gate regardless of which UI (or non-UI path) invoked them.
 */
export function assertDestructiveAuthorized(operation: string): void {
  if (!canEnableDestructiveControl()) {
    throw new DestructiveOperationBlockedError(operation);
  }
}

export async function buildDbDiagnostic(
  initKind?: DbInitKind,
  lastError?: string,
): Promise<DbDiagnostic> {
  // R-F9: diagnostic covers all 14 declared stores.
  const tableNames = ALL_STORE_NAMES;

  const tableCounts: Record<string, number | 'error'> = {};
  for (const name of tableNames) {
    try {
      const table = (db as unknown as Record<string, { count: () => Promise<number> }>)[name];
      if (table && typeof table.count === 'function') {
        tableCounts[name] = await table.count();
      } else {
        tableCounts[name] = 'error';
      }
    } catch {
      tableCounts[name] = 'error';
    }
  }

  const quota = await checkQuota();

  const diagnostic: DbDiagnostic = {
    capturedAt: new Date().toISOString(),
    dbName: db.name,
    version: db.verno,
    initKind,
    lastError,
    tableCounts,
    quota,
  };

  acknowledgeDiagnostic(diagnostic);
  return diagnostic;
}

/** Export JSON string and mark session prep (does not download). */
export async function exportAndAcknowledge(): Promise<string> {
  const json = await exportAllData();
  acknowledgeExport();
  return json;
}
