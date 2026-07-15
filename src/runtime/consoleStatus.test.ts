/**
 * R-F7 acceptance (reviewer falsifier): the default console consumes DbInit +
 * QuerySurface state and NEVER presents statistics as current/LIVE unless the
 * database is ready and a non-empty facilities read has settled. Pending/failed
 * init and read failures resolve to loading/error/unavailable — never
 * zero-as-current.
 */

import { describe, it, expect } from 'vitest';
import { deriveConsoleStatus, statsArePresentable } from './consoleStatus';
import type { DbInitKind } from './dbInitState';
import type { QuerySurfaceKind } from './querySurface';

const ALL_INIT_KINDS: DbInitKind[] = [
  'opening',
  'upgrading',
  'ready',
  'blocked',
  'unavailable',
  'migration-failed',
];

const ALL_SURFACE_KINDS: QuerySurfaceKind[] = [
  'loading',
  'empty',
  'insufficient',
  'partial',
  'stale',
  'error',
  'unavailable',
  'ready',
];

describe('R-F7 console status derivation', () => {
  it('pending init is always loading, regardless of any read kind', () => {
    for (const surface of ALL_SURFACE_KINDS) {
      expect(deriveConsoleStatus('opening', surface)).toBe('loading');
      expect(deriveConsoleStatus('upgrading', surface)).toBe('loading');
    }
  });

  it('failed/blocked init is surfaced (never ready), regardless of read kind', () => {
    for (const surface of ALL_SURFACE_KINDS) {
      expect(deriveConsoleStatus('unavailable', surface)).toBe('unavailable');
      expect(deriveConsoleStatus('blocked', surface)).toBe('unavailable');
      expect(deriveConsoleStatus('migration-failed', surface)).toBe('error');
    }
  });

  it('ready init + ready read is the only path to LIVE statistics', () => {
    expect(deriveConsoleStatus('ready', 'ready')).toBe('ready');
    expect(statsArePresentable(deriveConsoleStatus('ready', 'ready'))).toBe(true);
  });

  it('ready init + retained data (stale/partial) still presents figures', () => {
    expect(deriveConsoleStatus('ready', 'stale')).toBe('ready');
    expect(deriveConsoleStatus('ready', 'partial')).toBe('ready');
  });

  it('ready init + empty read is empty (no data), not zero-as-current', () => {
    const status = deriveConsoleStatus('ready', 'empty');
    expect(status).toBe('empty');
    expect(statsArePresentable(status)).toBe(false);
  });

  it('ready init + failed read surfaces error/unavailable, never ready', () => {
    expect(deriveConsoleStatus('ready', 'error')).toBe('error');
    expect(deriveConsoleStatus('ready', 'unavailable')).toBe('unavailable');
  });

  it('ready init + still-loading read stays loading (not zero)', () => {
    expect(deriveConsoleStatus('ready', 'loading')).toBe('loading');
    expect(deriveConsoleStatus('ready', 'insufficient')).toBe('loading');
  });

  it('FALSIFIER: statistics are presentable ONLY for a genuinely ready console', () => {
    for (const init of ALL_INIT_KINDS) {
      for (const surface of ALL_SURFACE_KINDS) {
        const status = deriveConsoleStatus(init, surface);
        if (statsArePresentable(status)) {
          // Must be a truly-ready database with usable data on the surface.
          expect(init).toBe('ready');
          expect(['ready', 'stale', 'partial']).toContain(surface);
        }
      }
    }
  });
});
