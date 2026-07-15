import { useCallback, useEffect, useRef, useState } from 'react';
import {
  beginRefresh,
  createLoadingState,
  escalateToUnavailable,
  nextRequestId,
  QuerySurfaceState,
  settleError,
  settleSuccess,
} from '../runtime/querySurface';

export interface RaceSafeQueryOptions<TKey, TData> {
  key: TKey;
  query: (ctx: {
    key: TKey;
    signal: AbortSignal;
    requestId: string;
  }) => Promise<TData>;
  isEmpty: (data: TData) => boolean;
  /** Serialize key for entity attribution checks. */
  keyOf?: (key: TKey) => string | number;
  enabled?: boolean;
}

export interface RaceSafeQueryResult<TData> {
  surface: QuerySurfaceState<TData>;
  refresh: () => void;
  /** Explicit diagnostic path only — never auto-escalated from error. */
  markUnavailable: (diagnostic: string) => void;
}

function defaultKeyOf<TKey>(key: TKey): string | number {
  if (typeof key === 'string' || typeof key === 'number') {
    return key;
  }
  return JSON.stringify(key);
}

/**
 * Race-safe async query with §2 surface semantics.
 * Obsolete settles are discarded; entity-key changes clear prior data;
 * refresh retains prior results under `stale`.
 */
export function useRaceSafeQuery<TKey, TData>(
  options: RaceSafeQueryOptions<TKey, TData>,
): RaceSafeQueryResult<TData> {
  const { key, query, isEmpty, enabled = true } = options;
  const keyOf = options.keyOf ?? defaultKeyOf;

  const entityKey = keyOf(key);
  const initialId = nextRequestId();
  const [surface, setSurface] = useState<QuerySurfaceState<TData>>(() =>
    createLoadingState<TData>(initialId, entityKey),
  );

  const surfaceRef = useRef(surface);
  surfaceRef.current = surface;

  const queryRef = useRef(query);
  queryRef.current = query;
  const isEmptyRef = useRef(isEmpty);
  isEmptyRef.current = isEmpty;

  const abortRef = useRef<AbortController | null>(null);
  const runGeneration = useRef(0);

  const run = useCallback(
    (mode: 'initial' | 'refresh') => {
      if (!enabled) {
        return;
      }

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const requestId = nextRequestId();
      runGeneration.current += 1;
      const generation = runGeneration.current;

      setSurface((prev) => {
        if (mode === 'refresh' || prev.data !== undefined) {
          return beginRefresh(prev, requestId, entityKey);
        }
        return createLoadingState<TData>(requestId, entityKey);
      });

      void (async () => {
        try {
          const data = await queryRef.current({
            key,
            signal: controller.signal,
            requestId,
          });
          if (controller.signal.aborted || generation !== runGeneration.current) {
            return;
          }
          setSurface((prev) => {
            const next = settleSuccess(
              prev,
              requestId,
              data,
              isEmptyRef.current,
              entityKey,
            );
            return next ?? prev;
          });
        } catch (err) {
          if (controller.signal.aborted || generation !== runGeneration.current) {
            return;
          }
          const error = err instanceof Error ? err : new Error(String(err));
          setSurface((prev) => {
            const next = settleError(prev, requestId, error, entityKey);
            return next ?? prev;
          });
        }
      })();
    },
    [enabled, entityKey, key],
  );

  useEffect(() => {
    run('initial');
    return () => {
      abortRef.current?.abort();
      runGeneration.current += 1;
    };
  }, [run]);

  const refresh = useCallback(() => {
    run('refresh');
  }, [run]);

  const markUnavailable = useCallback((diagnostic: string) => {
    setSurface((prev) => escalateToUnavailable(prev, diagnostic));
  }, []);

  return { surface, refresh, markUnavailable };
}
