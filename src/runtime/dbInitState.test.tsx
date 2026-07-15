/**
 * Step-3 DB init state machine tests (T1–T3) + mapping.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  createOpeningState,
  dbInitToQuerySurfaceKind,
  isTerminalDbInit,
  reduceDbInit,
  DbInitKind,
} from './dbInitState';
import { DbInitStatusBanner } from '../components/DbInitStatusBanner';

function sample(history: DbInitKind[], kind: DbInitKind): void {
  history.push(kind);
}

describe('dbInitState (T1)(T2)(T3)', () => {
  it('T1: opening/upgrading reach a terminal kind; timeout ends indefinite loading', () => {
    const history: DbInitKind[] = [];
    let s = createOpeningState(0);
    sample(history, s.kind);

    s = reduceDbInit(s, { type: 'UPGRADE_START', now: 1 });
    sample(history, s.kind);
    expect(s.kind).toBe('upgrading');

    s = reduceDbInit(s, { type: 'TIMEOUT', now: 20_000 });
    sample(history, s.kind);
    expect(s.kind).toBe('unavailable');
    expect(s.diagnostic).toBe('init timed out');
    expect(isTerminalDbInit(s.kind)).toBe(true);
    expect(history.includes('ready') || history.includes('unavailable')).toBe(true);
    expect(dbInitToQuerySurfaceKind('unavailable')).toBe('unavailable');
    expect(dbInitToQuerySurfaceKind('opening')).not.toBe('empty' as never);
  });

  it('T1: opening → ready success path', () => {
    const history: DbInitKind[] = [];
    let s = createOpeningState(0);
    sample(history, s.kind);
    s = reduceDbInit(s, { type: 'OPEN_SUCCESS', version: 9, now: 2 });
    sample(history, s.kind);
    expect(history).toEqual(['opening', 'ready']);
    expect(s.version).toBe(9);
  });

  it('T2: blocked is distinct and carries diagnostic', () => {
    let s = createOpeningState(0);
    s = reduceDbInit(s, { type: 'BLOCKED', now: 1 });
    expect(s.kind).toBe('blocked');
    expect(s.diagnostic).toMatch(/another tab/i);

    const { container } = render(<DbInitStatusBanner state={s} />);
    expect(container.querySelector('[data-db-init="blocked"]')).toBeTruthy();
    expect(container.querySelector('[data-db-init="opening"]')).toBeNull();
    expect(screen.getByText(/Database upgrade blocked/i)).toBeTruthy();
  });

  it('T3: migration-failed does not imply delete; diagnostic set', () => {
    const deleteSpy = vi.fn();
    const original = window.indexedDB?.deleteDatabase;
    if (window.indexedDB) {
      window.indexedDB.deleteDatabase = deleteSpy as typeof window.indexedDB.deleteDatabase;
    }

    let s = createOpeningState(0);
    s = reduceDbInit(s, {
      type: 'UPGRADE_START',
      now: 1,
    });
    s = reduceDbInit(s, {
      type: 'MIGRATION_FAIL',
      diagnostic: 'upgrade blew up',
      now: 2,
    });
    expect(s.kind).toBe('migration-failed');
    expect(s.diagnostic).toBe('upgrade blew up');
    expect(deleteSpy).not.toHaveBeenCalled();
    expect(dbInitToQuerySurfaceKind(s.kind)).toBe('error');

    if (window.indexedDB && original) {
      window.indexedDB.deleteDatabase = original;
    }
  });

  it('P10: init failures never map to empty', () => {
    const kinds: DbInitKind[] = [
      'opening',
      'upgrading',
      'blocked',
      'unavailable',
      'migration-failed',
      'ready',
    ];
    for (const k of kinds) {
      expect(dbInitToQuerySurfaceKind(k)).not.toBe('empty' as never);
    }
  });
});

describe('DbInitStatusBanner chrome', () => {
  it('renders unavailable distinctly from blocked', () => {
    const blocked = reduceDbInit(createOpeningState(), { type: 'BLOCKED' });
    const { rerender, container } = render(<DbInitStatusBanner state={blocked} />);
    expect(container.querySelector('[data-db-init="blocked"]')).toBeTruthy();

    const unavailable = reduceDbInit(createOpeningState(), {
      type: 'OPEN_FAIL',
      diagnostic: 'IndexedDB open refused',
    });
    rerender(<DbInitStatusBanner state={unavailable} />);
    expect(container.querySelector('[data-db-init="unavailable"]')).toBeTruthy();
    expect(container.querySelector('[data-db-init="blocked"]')).toBeNull();
  });
});
