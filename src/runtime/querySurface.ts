/**
 * Query surface state vocabulary (§2 runtime resilience).
 * Technical / availability states must never render as evidentiary claims.
 *
 * `ready` is the populated-current success kind (implied by stale ≠ current).
 * `partial` is declared and transition-guarded; step-1 vertical cut may leave it unexercised.
 */

export type QuerySurfaceKind =
  | 'loading'
  | 'empty'
  | 'insufficient'
  | 'partial'
  | 'stale'
  | 'error'
  | 'unavailable'
  | 'ready';

export interface QuerySurfaceState<T> {
  kind: QuerySurfaceKind;
  /** Current or retained prior result. Undefined only before first successful settle. */
  data: T | undefined;
  requestId: string;
  entityKey?: string | number;
  error?: Error;
  /** Required for `unavailable`; distinct capability/diagnostic string. */
  diagnostic?: string;
}

export function nextRequestId(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function createLoadingState<T>(
  requestId: string,
  entityKey?: string | number,
): QuerySurfaceState<T> {
  return {
    kind: 'loading',
    data: undefined,
    requestId,
    entityKey,
  };
}

/**
 * Begin a new request. Priors with data become `stale` (retained).
 * Entity-key change clears data (no mis-attribution). Never maps pre-resolution to `empty`.
 */
export function beginRefresh<T>(
  prev: QuerySurfaceState<T>,
  requestId: string,
  entityKey?: string | number,
): QuerySurfaceState<T> {
  const keyChanged =
    entityKey !== undefined &&
    prev.entityKey !== undefined &&
    entityKey !== prev.entityKey;

  if (keyChanged) {
    return {
      kind: 'loading',
      data: undefined,
      requestId,
      entityKey,
    };
  }

  if (prev.data !== undefined && prev.kind !== 'unavailable') {
    return {
      ...prev,
      kind: 'stale',
      requestId,
      entityKey: entityKey ?? prev.entityKey,
      error: undefined,
      diagnostic: undefined,
    };
  }

  return {
    kind: 'loading',
    data: undefined,
    requestId,
    entityKey: entityKey ?? prev.entityKey,
  };
}

export function settleSuccess<T>(
  prev: QuerySurfaceState<T>,
  settlingRequestId: string,
  data: T,
  isEmpty: (value: T) => boolean,
  entityKey?: string | number,
): QuerySurfaceState<T> | null {
  if (settlingRequestId !== prev.requestId) {
    return null;
  }
  if (
    entityKey !== undefined &&
    prev.entityKey !== undefined &&
    entityKey !== prev.entityKey
  ) {
    return null;
  }

  return {
    kind: isEmpty(data) ? 'empty' : 'ready',
    data,
    requestId: settlingRequestId,
    entityKey: entityKey ?? prev.entityKey,
    error: undefined,
    diagnostic: undefined,
  };
}

export function settleError<T>(
  prev: QuerySurfaceState<T>,
  settlingRequestId: string,
  error: Error,
  entityKey?: string | number,
): QuerySurfaceState<T> | null {
  if (settlingRequestId !== prev.requestId) {
    return null;
  }
  if (
    entityKey !== undefined &&
    prev.entityKey !== undefined &&
    entityKey !== prev.entityKey
  ) {
    return null;
  }

  // Interrupted refresh with a prior result: keep Stale labeling (not Empty, not bare Error).
  if (prev.data !== undefined) {
    return {
      kind: 'stale',
      data: prev.data,
      requestId: settlingRequestId,
      entityKey: entityKey ?? prev.entityKey,
      error,
      diagnostic: undefined,
    };
  }

  return {
    kind: 'error',
    data: undefined,
    requestId: settlingRequestId,
    entityKey: entityKey ?? prev.entityKey,
    error,
    diagnostic: undefined,
  };
}

/**
 * Error → Unavailable only with a non-empty distinct diagnostic.
 * Without diagnostic, returns prev unchanged (guard).
 */
export function escalateToUnavailable<T>(
  prev: QuerySurfaceState<T>,
  diagnostic: string,
): QuerySurfaceState<T> {
  const trimmed = typeof diagnostic === 'string' ? diagnostic.trim() : '';
  if (!trimmed) {
    return prev;
  }
  if (prev.kind !== 'error' && prev.kind !== 'unavailable') {
    return prev;
  }
  return {
    ...prev,
    kind: 'unavailable',
    diagnostic: trimmed,
  };
}

/**
 * Mark independent parts as partial. Guarded: only from ready/stale/partial
 * with defined data. Step-1 may leave this unexercised.
 */
export function toPartial<T>(prev: QuerySurfaceState<T>): QuerySurfaceState<T> {
  if (prev.data === undefined) {
    return prev;
  }
  if (prev.kind !== 'ready' && prev.kind !== 'stale' && prev.kind !== 'partial') {
    return prev;
  }
  return {
    ...prev,
    kind: 'partial',
  };
}

export function isEvidentiaryEmpty(kind: QuerySurfaceKind): boolean {
  return kind === 'empty';
}

export function isFailureKind(kind: QuerySurfaceKind): boolean {
  return kind === 'error' || kind === 'unavailable';
}
