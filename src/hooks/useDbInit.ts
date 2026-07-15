import { useCallback, useEffect, useRef, useState } from 'react';
import Dexie from 'dexie';
import { db } from '../db/database';
import {
  createOpeningState,
  DB_INIT_TIMEOUT_MS,
  DbInitState,
  reduceDbInit,
} from '../runtime/dbInitState';

export interface UseDbInitOptions {
  /** Injectable Dexie instance; defaults to ComplianceDatabase. */
  database?: Dexie;
  timeoutMs?: number;
  /** When false, do not auto-start open (tests). */
  autoStart?: boolean;
}

export interface UseDbInitResult {
  state: DbInitState;
  /** Re-attempt open after blocked / unavailable (does not delete). */
  retry: () => void;
}

/**
 * Observe ComplianceDatabase open lifecycle: opening / upgrading / ready /
 * blocked / unavailable / migration-failed.
 */
export function useDbInit(options: UseDbInitOptions = {}): UseDbInitResult {
  const database = options.database ?? db;
  const timeoutMs = options.timeoutMs ?? DB_INIT_TIMEOUT_MS;
  const autoStart = options.autoStart !== false;

  const [state, setState] = useState<DbInitState>(() => createOpeningState());
  const stateRef = useRef(state);
  stateRef.current = state;
  const runIdRef = useRef(0);

  const dispatch = useCallback((event: Parameters<typeof reduceDbInit>[1]) => {
    setState((prev) => reduceDbInit(prev, event));
  }, []);

  const startOpen = useCallback(() => {
    const runId = ++runIdRef.current;
    dispatch({ type: 'START_OPEN' });

    const onBlocked = () => {
      if (runId !== runIdRef.current) return;
      dispatch({ type: 'BLOCKED' });
    };

    const onVersionChange = () => {
      if (runId !== runIdRef.current) return;
      // Another connection requested upgrade — treat local wait as upgrading signal
      dispatch({ type: 'UPGRADE_START' });
    };

    database.on('blocked', onBlocked);
    database.on('versionchange', onVersionChange);

    const timeoutId = window.setTimeout(() => {
      if (runId !== runIdRef.current) return;
      const kind = stateRef.current.kind;
      if (kind === 'opening' || kind === 'upgrading') {
        dispatch({ type: 'TIMEOUT' });
      }
    }, timeoutMs);

    void (async () => {
      try {
        // If not yet opened, schema apply may run — surface upgrading explicitly.
        if (database.verno === 0) {
          dispatch({ type: 'UPGRADE_START' });
        }

        await database.open();
        if (runId !== runIdRef.current) return;

        dispatch({
          type: 'OPEN_SUCCESS',
          version: database.verno,
        });
      } catch (err) {
        if (runId !== runIdRef.current) return;
        const message = err instanceof Error ? err.message : String(err);
        const lower = message.toLowerCase();
        if (
          lower.includes('upgrade') ||
          lower.includes('migration') ||
          lower.includes('version')
        ) {
          dispatch({ type: 'MIGRATION_FAIL', diagnostic: message });
        } else {
          dispatch({ type: 'OPEN_FAIL', diagnostic: message });
        }
        // Quarantine: never deleteDatabase / recoverDatabase / seed here.
      } finally {
        window.clearTimeout(timeoutId);
        try {
          database.on('blocked').unsubscribe(onBlocked);
          database.on('versionchange').unsubscribe(onVersionChange);
        } catch {
          // Dexie unsubscribe best-effort
        }
      }
    })();
  }, [database, dispatch, timeoutMs]);

  useEffect(() => {
    if (!autoStart) return;
    startOpen();
    return () => {
      runIdRef.current += 1;
    };
  }, [autoStart, startOpen]);

  return { state, retry: startOpen };
}
