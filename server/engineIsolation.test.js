/**
 * @vitest-environment node
 *
 * D1 + engine-isolation coverage. Runs WITHOUT booting the server — the Stage 2 bootstrap
 * guard makes `server/index.js` side-effect-free on import, so importing the assembly and
 * exportSignalRecord here opens no listening socket.
 *
 *   T1  post-assembly mutation cannot alter the counted list (frozen at the boundary)
 *   T2  exportSignalRecord export surface carries candidate-level provenance + per-source sources
 *       (closes the v1.9 §9 testability-gap corollary — first direct test of the export surface)
 */
import { describe, expect, it } from 'vitest';
import { ACTIVE_COMPANIES, exportSignalRecord } from './index.js';

// Stable labeled-synthetic fixture: two independent synthetic sources, provenance 'synthetic'.
const KNOWN_ID = 'synthetic_frontier_west_dc';
const THRESHOLD_CTX = { mismatchBounded: 50, confidenceMin: 50 };

describe('T1 — D1 freeze: post-assembly mutation cannot alter the counted list', () => {
  it('(a) pushing a duplicate source into a known company throws and does not alter the count', () => {
    const company = ACTIVE_COMPANIES.find(c => c.id === KNOWN_ID);
    expect(company).toBeDefined();
    const before = company.sources.length;
    expect(() => company.sources.push({ id: 'intruder_source', type: 'bgp_route_signal' })).toThrow();
    expect(company.sources.length).toBe(before);
  });

  it('(b) pushing a new candidate into the list throws and does not alter the count', () => {
    const before = ACTIVE_COMPANIES.length;
    expect(() => ACTIVE_COMPANIES.push({ id: 'intruder_candidate', name: 'Intruder', sources: [] })).toThrow();
    expect(ACTIVE_COMPANIES.length).toBe(before);
  });

  it('(c) reassigning a company sources array throws (company-object freeze) and preserves the array', () => {
    const company = ACTIVE_COMPANIES.find(c => c.id === KNOWN_ID);
    const originalSources = company.sources;
    expect(() => {
      company.sources = [];
    }).toThrow();
    expect(company.sources).toBe(originalSources);
    expect(company.sources.length).toBe(originalSources.length);
  });
});

describe('T2 — export surface: exportSignalRecord carries provenance + per-source sources', () => {
  it('returns candidate-level provenance in {real, synthetic, mixed} and per-source sources for a known id', () => {
    const company = ACTIVE_COMPANIES.find(c => c.id === KNOWN_ID);
    expect(company).toBeDefined();
    const record = exportSignalRecord(company, null, THRESHOLD_CTX);

    // Candidate-level provenance: rollup object whose `provenance` value is in the labeled set.
    expect(record.provenance).toBeDefined();
    expect(['real', 'synthetic', 'mixed']).toContain(record.provenance.provenance);
    // This fixture is labeled-synthetic end to end.
    expect(record.provenance.provenance).toBe('synthetic');

    // Per-source sources: array of source records, each with an id and a provenance label.
    expect(Array.isArray(record.sources)).toBe(true);
    expect(record.sources.length).toBeGreaterThan(0);
    for (const s of record.sources) {
      expect(typeof s.id).toBe('string');
      expect(s.provenance).toBe('synthetic');
    }
  });
});
