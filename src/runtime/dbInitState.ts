/**
 * Explicit IndexedDB / Dexie initialization state machine (step-3 persistence hardening).
 * Init failure must never be presented as evidentiary Empty.
 */

export type DbInitKind =
  | 'opening'
  | 'upgrading'
  | 'ready'
  | 'blocked'
  | 'unavailable'
  | 'migration-failed';

export interface DbInitState {
  kind: DbInitKind;
  /** Required for unavailable / migration-failed; optional elsewhere. */
  diagnostic?: string;
  version?: number;
  startedAt: number;
  updatedAt: number;
}

export type DbInitEvent =
  | { type: 'START_OPEN'; now?: number }
  | { type: 'UPGRADE_START'; now?: number }
  | { type: 'OPEN_SUCCESS'; version: number; now?: number }
  | { type: 'BLOCKED'; diagnostic?: string; now?: number }
  | { type: 'OPEN_FAIL'; diagnostic: string; now?: number }
  | { type: 'MIGRATION_FAIL'; diagnostic: string; now?: number }
  | { type: 'TIMEOUT'; now?: number };

export const DB_INIT_TIMEOUT_MS = 15_000;

export function createOpeningState(now = Date.now()): DbInitState {
  return {
    kind: 'opening',
    startedAt: now,
    updatedAt: now,
  };
}

export function reduceDbInit(state: DbInitState, event: DbInitEvent): DbInitState {
  const now = event.now ?? Date.now();

  switch (event.type) {
    case 'START_OPEN':
      return {
        kind: 'opening',
        startedAt: now,
        updatedAt: now,
        diagnostic: undefined,
        version: undefined,
      };
    case 'UPGRADE_START':
      if (state.kind === 'ready') {
        return state;
      }
      return {
        ...state,
        kind: 'upgrading',
        updatedAt: now,
      };
    case 'OPEN_SUCCESS':
      return {
        kind: 'ready',
        version: event.version,
        startedAt: state.startedAt,
        updatedAt: now,
        diagnostic: undefined,
      };
    case 'BLOCKED':
      return {
        ...state,
        kind: 'blocked',
        updatedAt: now,
        diagnostic:
          event.diagnostic?.trim() ||
          'Another tab is holding an older database connection. Close other tabs, then reload.',
      };
    case 'OPEN_FAIL': {
      const diagnostic = event.diagnostic.trim();
      return {
        ...state,
        kind: 'unavailable',
        updatedAt: now,
        diagnostic: diagnostic || 'Database open failed',
      };
    }
    case 'MIGRATION_FAIL': {
      const diagnostic = event.diagnostic.trim();
      return {
        ...state,
        kind: 'migration-failed',
        updatedAt: now,
        diagnostic: diagnostic || 'Schema migration failed',
      };
    }
    case 'TIMEOUT':
      if (state.kind !== 'opening' && state.kind !== 'upgrading') {
        return state;
      }
      return {
        ...state,
        kind: 'unavailable',
        updatedAt: now,
        diagnostic: 'init timed out',
      };
    default:
      return state;
  }
}

/** Map init failure kinds to step-1 query-surface vocabulary (never Empty). */
export function dbInitToQuerySurfaceKind(
  kind: DbInitKind,
): 'loading' | 'ready' | 'unavailable' | 'error' {
  switch (kind) {
    case 'opening':
    case 'upgrading':
      return 'loading';
    case 'ready':
      return 'ready';
    case 'blocked':
    case 'unavailable':
      return 'unavailable';
    case 'migration-failed':
      return 'error';
    default:
      return 'loading';
  }
}

export function isTerminalDbInit(kind: DbInitKind): boolean {
  return (
    kind === 'ready' ||
    kind === 'blocked' ||
    kind === 'unavailable' ||
    kind === 'migration-failed'
  );
}
