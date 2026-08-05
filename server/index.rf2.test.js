/**
 * @vitest-environment node
 *
 * R-F2 acceptance (reviewer falsifier): no synthetic record reachable through
 * /companies, /scores, or /signals/export in production. Proven at the HTTP
 * endpoint level against a live listener, plus assembly-level checks; the demo
 * corpus (explicit SIGNALS_DEMO_MODE) is the only surface with demonstrations.
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import http from 'node:http';

const savedDemo = process.env.SIGNALS_DEMO_MODE;
const savedSeedPath = process.env.SIGNALS_SEED_PATH;
// The engine fails closed (R-F3) without a corpus artifact. Production-mode
// assembly is tested against a committed fixture, not the operator's local
// git-ignored artifact (which may legitimately be absent/retired).
const FIXTURE_CORPUS = new URL('./testFixtures/rf2_corpus.json', import.meta.url).pathname;

beforeEach(() => {
  vi.resetModules();
  delete process.env.SIGNALS_DEMO_MODE;
  process.env.SIGNALS_SEED_PATH = FIXTURE_CORPUS;
});

afterEach(() => {
  if (savedDemo === undefined) delete process.env.SIGNALS_DEMO_MODE;
  else process.env.SIGNALS_DEMO_MODE = savedDemo;
  if (savedSeedPath === undefined) delete process.env.SIGNALS_SEED_PATH;
  else process.env.SIGNALS_SEED_PATH = savedSeedPath;
});

/** @param {boolean} demo */
async function loadEngine(demo) {
  vi.resetModules();
  if (demo) process.env.SIGNALS_DEMO_MODE = 'true';
  else delete process.env.SIGNALS_DEMO_MODE;
  return import('./index.js');
}

/** Assert a company/signal row and all its sources carry no synthetic marker. */
function expectNoSyntheticMarkers(row) {
  expect(row.id ?? row.company_id).not.toMatch(/^synthetic_/);
  if (row.provenance) {
    expect(row.provenance.provenance).not.toBe('synthetic');
    expect(row.provenance.provenance).not.toBe('mixed');
  }
  for (const s of row.sources || []) {
    expect(s.provenance).not.toBe('synthetic');
    expect(s.label).not.toBe('DESIGN');
  }
}

/**
 * Boot the exported app on an ephemeral port and GET a path.
 * Uses node:http directly — the shared test setup replaces global fetch.
 */
async function getJson(app, path) {
  const server = app.listen(0);
  try {
    const { port } = server.address();
    return await new Promise((resolve, reject) => {
      http
        .get({ host: '127.0.0.1', port, path }, res => {
          let raw = '';
          res.on('data', chunk => (raw += chunk));
          res.on('end', () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(raw) });
            } catch (e) {
              reject(e);
            }
          });
        })
        .on('error', reject);
    });
  } finally {
    server.close();
  }
}

describe('R-F2 production assembly excludes synthetic by construction', () => {
  it('ACTIVE_COMPANIES contains zero synthetic records without demo mode', async () => {
    const { ACTIVE_COMPANIES, isSyntheticRecord } = await loadEngine(false);
    expect(ACTIVE_COMPANIES.length).toBeGreaterThan(0);
    for (const company of ACTIVE_COMPANIES) {
      expect(isSyntheticRecord(company)).toBe(false);
    }
    expect(ACTIVE_COMPANIES.some(c => c.id === 'synthetic_frontier_west_dc')).toBe(false);
    expect(ACTIVE_COMPANIES.some(c => c.id === 'synthetic_ny_hudson_valley_dc')).toBe(false);
  });

  it('isSyntheticRecord catches candidate-level and source-level markers', async () => {
    const { isSyntheticRecord } = await loadEngine(false);
    expect(isSyntheticRecord({ id: 'a', synthetic: true, sources: [] })).toBe(true);
    expect(isSyntheticRecord({ id: 'b', provenance: 'synthetic', sources: [] })).toBe(true);
    expect(
      isSyntheticRecord({ id: 'c', sources: [{ id: 's', provenance: 'synthetic' }] }),
    ).toBe(true);
    expect(isSyntheticRecord({ id: 'd', sources: [{ id: 's' }] })).toBe(false);
  });
});

describe('R-F2 production endpoints (live HTTP)', () => {
  it('/companies serves no synthetic record', async () => {
    const { app } = await loadEngine(false);
    const { status, body } = await getJson(app, '/companies');
    expect(status).toBe(200);
    expect(body.companies.length).toBeGreaterThan(0);
    for (const row of body.companies) expectNoSyntheticMarkers(row);
    expect(body.corpus_provenance.demo_mode).toBe(false);
    expect(body.corpus_provenance.synthetic_candidates_included).toBe(false);
  });

  it('/scores serves no synthetic record', async () => {
    const { app } = await loadEngine(false);
    const { status, body } = await getJson(app, '/scores');
    expect(status).toBe(200);
    expect(body.scores.length).toBeGreaterThan(0);
    for (const row of body.scores) {
      expect(row.company_id).not.toMatch(/^synthetic_/);
      if (row.provenance) expect(row.provenance.provenance).not.toBe('synthetic');
    }
  });

  it('/signals/export serves no synthetic record (json + per-source)', async () => {
    const { app } = await loadEngine(false);
    const { status, body } = await getJson(app, '/signals/export');
    expect(status).toBe(200);
    expect(body.signals.length).toBeGreaterThan(0);
    for (const signal of body.signals) expectNoSyntheticMarkers(signal);
  });

  it('/companies/:id 404s for a synthetic id in production', async () => {
    const { app } = await loadEngine(false);
    const { status } = await getJson(app, '/companies/synthetic_frontier_west_dc');
    expect(status).toBe(404);
  });
});

describe('R-F2 demonstrations only behind the explicit demo corpus', () => {
  it('demo mode includes labeled synthetic candidates and says so', async () => {
    const { ACTIVE_COMPANIES, app } = await loadEngine(true);
    expect(ACTIVE_COMPANIES.some(c => c.id === 'synthetic_frontier_west_dc')).toBe(true);

    const { body } = await getJson(app, '/companies');
    expect(body.corpus_provenance.demo_mode).toBe(true);
    expect(body.corpus_provenance.synthetic_candidates_included).toBe(true);

    const syntheticRows = body.companies.filter(r => String(r.id).startsWith('synthetic_'));
    expect(syntheticRows.length).toBeGreaterThan(0);
    for (const row of syntheticRows) {
      expect(row.provenance.provenance).toBe('synthetic');
    }
  });
});
