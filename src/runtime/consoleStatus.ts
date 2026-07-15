/**
 * R-F7 — honest default console status.
 *
 * Combines the DbInit lifecycle (step-3) with the facilities query surface
 * (step-1) into a single status the default console renders. The ONLY kind
 * permitted to present numeric statistics as current/LIVE is 'ready'. Init
 * pending/failure and read failure are surfaced explicitly and can never be
 * rendered as zero-as-current.
 */

import type { DbInitKind } from './dbInitState';
import { dbInitToQuerySurfaceKind } from './dbInitState';
import type { QuerySurfaceKind } from './querySurface';

export type ConsoleStatus = 'loading' | 'ready' | 'empty' | 'error' | 'unavailable';

/**
 * Init state takes precedence: while the database is opening/upgrading, or has
 * gone unavailable/blocked/migration-failed, the facilities read is irrelevant.
 * Only once init is ready does the query surface decide ready/empty/error.
 */
export function deriveConsoleStatus(
  dbInitKind: DbInitKind,
  facilitiesSurfaceKind: QuerySurfaceKind,
): ConsoleStatus {
  const initSurface = dbInitToQuerySurfaceKind(dbInitKind);
  if (initSurface === 'loading') return 'loading';
  if (initSurface === 'unavailable') return 'unavailable';
  if (initSurface === 'error') return 'error';

  switch (facilitiesSurfaceKind) {
    case 'ready':
    case 'stale':
    case 'partial':
      return 'ready';
    case 'empty':
      return 'empty';
    case 'error':
      return 'error';
    case 'unavailable':
      return 'unavailable';
    case 'loading':
    case 'insufficient':
    default:
      return 'loading';
  }
}

/** Statistics may be shown as current/LIVE only when the console is ready. */
export function statsArePresentable(status: ConsoleStatus): boolean {
  return status === 'ready';
}
