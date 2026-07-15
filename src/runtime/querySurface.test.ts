/**
 * Step-1 transition + race-protection tests.
 * Checklist (a)–(f): sample intermediate kinds, not only terminal settles.
 */

import { describe, it, expect } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import {
  beginRefresh,
  createLoadingState,
  escalateToUnavailable,
  nextRequestId,
  QuerySurfaceKind,
  QuerySurfaceState,
  settleError,
  settleSuccess,
  toPartial,
} from './querySurface';
import { useRaceSafeQuery } from '../hooks/useRaceSafeQuery';

function sampleKinds<T>(
  history: QuerySurfaceKind[],
  state: QuerySurfaceState<T>,
): void {
  history.push(state.kind);
}

describe('querySurface transitions (a)(b)(d)(e)(f)', () => {
  it('(f) initial successful zero-record: Loading → Empty directly, never via error fallback', () => {
    const history: QuerySurfaceKind[] = [];
    const req = nextRequestId();
    let s = createLoadingState<string[]>(req, 'boot');
    sampleKinds(history, s);

    const settled = settleSuccess(s, req, [], (rows) => rows.length === 0, 'boot');
    expect(settled).not.toBeNull();
    s = settled!;
    sampleKinds(history, s);

    expect(history).toEqual(['loading', 'empty']);
    expect(history.includes('error')).toBe(false);
    expect(s.data).toEqual([]);
    expect(s.error).toBeUndefined();
  });

  it('(b) query failure never settles Empty', () => {
    const history: QuerySurfaceKind[] = [];
    const req = nextRequestId();
    let s = createLoadingState<string[]>(req, 'boot');
    sampleKinds(history, s);

    const settled = settleError(s, req, new Error('db failed'), 'boot');
    expect(settled).not.toBeNull();
    s = settled!;
    sampleKinds(history, s);

    expect(s.kind).toBe('error');
    expect(history).toEqual(['loading', 'error']);
    expect(history.includes('empty')).toBe(false);
  });

  it('(a) populated refresh never samples Empty at intermediate frames', () => {
    const history: QuerySurfaceKind[] = [];
    const req1 = nextRequestId();
    let s = createLoadingState<{ id: number }>(req1, 1);
    sampleKinds(history, s);

    s = settleSuccess(s, req1, { id: 1 }, (d) => d == null, 1)!;
    sampleKinds(history, s);
    expect(s.kind).toBe('ready');

    const req2 = nextRequestId();
    s = beginRefresh(s, req2, 1);
    sampleKinds(history, s);
    expect(s.kind).toBe('stale');
    expect(s.data).toEqual({ id: 1 });

    s = settleSuccess(s, req2, { id: 1 }, (d) => d == null, 1)!;
    sampleKinds(history, s);

    expect(history.includes('empty')).toBe(false);
    expect(history).toEqual(['loading', 'ready', 'stale', 'ready']);
  });

  it('(d) interrupted refresh retains prior under Stale, not Empty', () => {
    const history: QuerySurfaceKind[] = [];
    const req1 = nextRequestId();
    let s = createLoadingState<{ id: number }>(req1, 1);
    s = settleSuccess(s, req1, { id: 1 }, (d) => d == null, 1)!;
    sampleKinds(history, s);

    const req2 = nextRequestId();
    s = beginRefresh(s, req2, 1);
    sampleKinds(history, s);
    expect(s.kind).toBe('stale');

    s = settleError(s, req2, new Error('network drop'), 1)!;
    sampleKinds(history, s);

    expect(s.kind).toBe('stale');
    expect(s.data).toEqual({ id: 1 });
    expect(s.error?.message).toBe('network drop');
    expect(history.includes('empty')).toBe(false);
  });

  it('(e) Error does not become Unavailable without diagnostic', () => {
    const req = nextRequestId();
    let s = createLoadingState<null>(req);
    s = settleError(s, req, new Error('fail'))!;
    expect(s.kind).toBe('error');

    expect(escalateToUnavailable(s, '').kind).toBe('error');
    expect(escalateToUnavailable(s, '   ').kind).toBe('error');

    const escalated = escalateToUnavailable(s, 'IndexedDB open refused');
    expect(escalated.kind).toBe('unavailable');
    expect(escalated.diagnostic).toBe('IndexedDB open refused');
  });

  it('partial transition is guarded; ready until toPartial', () => {
    const req = nextRequestId();
    let s = createLoadingState<{ a: number }>(req);
    s = settleSuccess(s, req, { a: 1 }, () => false)!;
    expect(s.kind).toBe('ready');
    expect(toPartial(createLoadingState<{ a: number }>(nextRequestId())).kind).toBe(
      'loading',
    );
    s = toPartial(s);
    expect(s.kind).toBe('partial');
  });

  it('obsolete settle is discarded (request identity)', () => {
    const req1 = nextRequestId();
    const req2 = nextRequestId();
    let s = createLoadingState<number[]>(req1);
    s = beginRefresh(s, req2);
    expect(settleSuccess(s, req1, [1], () => false)).toBeNull();
  });
});

describe('useRaceSafeQuery race + frames (a)(c)(d)(b)(f)(e)', () => {
  it('(c) rapid key changes never attribute prior entity data', async () => {
    const pending = new Map<
      number,
      { resolve: (v: { id: number; label: string }) => void }
    >();

    const { result, rerender } = renderHook(
      ({ id }: { id: number }) =>
        useRaceSafeQuery<number, { id: number; label: string }>({
          key: id,
          keyOf: (k) => k,
          isEmpty: () => false,
          query: ({ key }) =>
            new Promise((resolve) => {
              pending.set(key, { resolve });
            }),
        }),
      { initialProps: { id: 1 } },
    );

    expect(result.current.surface.kind).toBe('loading');

    await act(async () => {
      pending.get(1)?.resolve({ id: 1, label: 'F1' });
    });
    await waitFor(() => expect(result.current.surface.kind).toBe('ready'));
    expect(result.current.surface.data?.id).toBe(1);

    rerender({ id: 2 });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.surface.kind).toBe('loading');
    expect(result.current.surface.data).toBeUndefined();
    expect(result.current.surface.entityKey).toBe(2);

    rerender({ id: 3 });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.surface.entityKey).toBe(3);
    expect(result.current.surface.data).toBeUndefined();

    // Late resolve for entity 1 must not mis-attribute onto 3
    await act(async () => {
      pending.get(1)?.resolve({ id: 1, label: 'late-F1' });
      pending.get(2)?.resolve({ id: 2, label: 'late-F2' });
    });
    expect(result.current.surface.entityKey).toBe(3);
    expect(result.current.surface.data?.id).not.toBe(1);
    expect(result.current.surface.data?.id).not.toBe(2);

    await act(async () => {
      pending.get(3)?.resolve({ id: 3, label: 'F3' });
    });
    await waitFor(() => expect(result.current.surface.kind).toBe('ready'));
    expect(result.current.surface.data?.id).toBe(3);
    expect(result.current.surface.entityKey).toBe(3);
  });

  it('(a)(d) refresh samples stale; failure keeps stale prior', async () => {
    const kinds: QuerySurfaceKind[] = [];
    let shouldFail = false;
    let call = 0;

    const { result } = renderHook(() =>
      useRaceSafeQuery<'x', { n: number }>({
        key: 'x',
        isEmpty: () => false,
        query: async () => {
          call += 1;
          if (shouldFail) {
            throw new Error('refresh failed');
          }
          return { n: call };
        },
      }),
    );

    await waitFor(() => expect(result.current.surface.kind).toBe('ready'));
    kinds.push(result.current.surface.kind);

    shouldFail = true;
    await act(async () => {
      result.current.refresh();
    });
    kinds.push(result.current.surface.kind);
    expect(result.current.surface.kind).toBe('stale');
    expect(result.current.surface.data?.n).toBe(1);

    await waitFor(() => {
      expect(result.current.surface.error?.message).toBe('refresh failed');
    });
    kinds.push(result.current.surface.kind);
    expect(result.current.surface.kind).toBe('stale');
    expect(result.current.surface.data?.n).toBe(1);
    expect(kinds.includes('empty')).toBe(false);
  });

  it('(f) zero-record success is Empty, not error', async () => {
    const kinds: QuerySurfaceKind[] = [];
    const { result } = renderHook(() =>
      useRaceSafeQuery<'boot', string[]>({
        key: 'boot',
        isEmpty: (rows) => rows.length === 0,
        query: async () => [],
      }),
    );
    kinds.push(result.current.surface.kind);
    await waitFor(() => expect(result.current.surface.kind).toBe('empty'));
    kinds.push(result.current.surface.kind);
    expect(kinds[0]).toBe('loading');
    expect(kinds[kinds.length - 1]).toBe('empty');
    expect(kinds.includes('error')).toBe(false);
  });

  it('(b) failure is Error, never Empty', async () => {
    const kinds: QuerySurfaceKind[] = [];
    const { result } = renderHook(() =>
      useRaceSafeQuery<'boot', string[]>({
        key: 'boot',
        isEmpty: (rows) => rows.length === 0,
        query: async () => {
          throw new Error('boom');
        },
      }),
    );
    kinds.push(result.current.surface.kind);
    await waitFor(() => expect(result.current.surface.kind).toBe('error'));
    kinds.push(result.current.surface.kind);
    expect(kinds.includes('empty')).toBe(false);
  });

  it('(e) markUnavailable requires diagnostic', async () => {
    const { result } = renderHook(() =>
      useRaceSafeQuery<'boot', string[]>({
        key: 'boot',
        isEmpty: () => true,
        query: async () => {
          throw new Error('fail');
        },
      }),
    );
    await waitFor(() => expect(result.current.surface.kind).toBe('error'));

    act(() => {
      result.current.markUnavailable('');
    });
    expect(result.current.surface.kind).toBe('error');

    act(() => {
      result.current.markUnavailable('local capability missing');
    });
    expect(result.current.surface.kind).toBe('unavailable');
    expect(result.current.surface.diagnostic).toBe('local capability missing');
  });
});
