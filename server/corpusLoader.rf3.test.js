/**
 * @vitest-environment node
 *
 * R-F3 acceptance (reviewer falsifier): production fails closed on a
 * missing/invalid corpus; fallback is demo-only; every mock/seed source
 * carries synthetic/DESIGN provenance.
 */
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  loadActiveCorpus,
  buildCorpusProvenancePayload,
  CorpusUnavailableError,
  isSignalsDemoMode,
} from './corpusLoader.js';
import { SEED_COMPANIES } from './mockDataset.js';

const ENV_KEYS = ['SIGNALS_DEMO_MODE', 'SIGNALS_SEED_PATH', 'SIGNALS_CORPUS_MODE'];
const savedEnv = {};

beforeEach(() => {
  for (const k of ENV_KEYS) {
    savedEnv[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of ENV_KEYS) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
});

function writeTempArtifact(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rf3-corpus-'));
  const p = path.join(dir, 'validated_cases.json');
  fs.writeFileSync(p, contents);
  return p;
}

describe('R-F3 production fails closed', () => {
  it('missing artifact outside demo mode throws CorpusUnavailableError', () => {
    process.env.SIGNALS_SEED_PATH = '/nonexistent/path/validated_cases.json';
    expect(() => loadActiveCorpus({ seedCompanies: SEED_COMPANIES })).toThrow(
      CorpusUnavailableError,
    );
    expect(() => loadActiveCorpus({ seedCompanies: SEED_COMPANIES })).toThrow(
      /artifact_unreadable_or_missing/,
    );
  });

  it('invalid JSON artifact outside demo mode throws', () => {
    process.env.SIGNALS_SEED_PATH = writeTempArtifact('not-json{{{');
    expect(() => loadActiveCorpus({ seedCompanies: SEED_COMPANIES })).toThrow(
      /artifact_invalid_json/,
    );
  });

  it('structurally invalid company rows outside demo mode throw', () => {
    process.env.SIGNALS_SEED_PATH = writeTempArtifact(
      JSON.stringify([{ id: 'ok', sources: [] }, { id: '', sources: [] }]),
    );
    expect(() => loadActiveCorpus({ seedCompanies: SEED_COMPANIES })).toThrow(
      /company_at_index_1_missing_id/,
    );
  });

  it('a valid live corpus loads in production without demo mode', () => {
    process.env.SIGNALS_SEED_PATH = writeTempArtifact(
      JSON.stringify([{ id: 'real_co', sources: [{ id: 's1', type: 'sec_filing' }] }]),
    );
    const corpus = loadActiveCorpus({ seedCompanies: SEED_COMPANIES });
    expect(corpus.corpusMode).toBe('pipeline');
    expect(corpus.activeCompanies.map(c => c.id)).toEqual(['real_co']);
  });
});

describe('R-F3 demo-only fallback with DESIGN provenance', () => {
  it('demo mode serves the seeded fallback, flagged demo_only', () => {
    process.env.SIGNALS_DEMO_MODE = 'true';
    process.env.SIGNALS_SEED_PATH = '/nonexistent/path/validated_cases.json';

    expect(isSignalsDemoMode()).toBe(true);
    const corpus = loadActiveCorpus({ seedCompanies: SEED_COMPANIES });
    expect(corpus.corpusMode).toBe('seeded');
    expect(corpus.corpusDetail.fallback_reason).toBe('artifact_unreadable_or_missing');

    const provenance = buildCorpusProvenancePayload(corpus, SEED_COMPANIES.length);
    expect(provenance.demo_only).toBe(true);
    expect(provenance.seeded_provenance).toBe('synthetic/DESIGN');
  });

  it('demo fallback refuses unlabeled seed rows', () => {
    process.env.SIGNALS_DEMO_MODE = 'true';
    process.env.SIGNALS_SEED_PATH = '/nonexistent/path/validated_cases.json';

    const unlabeled = [
      { id: 'sneaky_real', name: 'Sneaky', sources: [{ id: 's1', type: 'sec_filing' }] },
    ];
    expect(() => loadActiveCorpus({ seedCompanies: unlabeled })).toThrow(
      /unlabeled_demo_company_sneaky_real/,
    );
  });

  it('mixed mode refuses unlabeled seed rows even with a valid live corpus', () => {
    process.env.SIGNALS_CORPUS_MODE = 'mixed';
    process.env.SIGNALS_SEED_PATH = writeTempArtifact(
      JSON.stringify([{ id: 'real_co', sources: [{ id: 's1', type: 'sec_filing' }] }]),
    );
    const unlabeled = [
      { id: 'sneaky_real', name: 'Sneaky', sources: [{ id: 's1', type: 'sec_filing' }] },
    ];
    expect(() => loadActiveCorpus({ seedCompanies: unlabeled })).toThrow(
      /unlabeled_demo_source_s1_in_mixed_append|unlabeled_demo_company_sneaky_real/,
    );
  });
});

describe('R-F3 every mock source carries DESIGN provenance', () => {
  it('all SEED_COMPANIES and all their sources are synthetic/DESIGN', () => {
    expect(SEED_COMPANIES.length).toBeGreaterThan(0);
    for (const company of SEED_COMPANIES) {
      expect(company.provenance).toBe('synthetic');
      expect(company.synthetic).toBe(true);
      expect(company.sources.length).toBeGreaterThan(0);
      for (const source of company.sources) {
        expect(source.provenance).toBe('synthetic');
        expect(source.label).toBe('DESIGN');
        expect(typeof source.attribution).toBe('string');
      }
    }
  });

  it('seeded fallback rows are never scoreable as real by the provenance rollup', async () => {
    const { summarizeProvenance } = await import('./epochConfirm.js');
    for (const company of SEED_COMPANIES) {
      const rollup = summarizeProvenance(company);
      expect(rollup.provenance).toBe('synthetic');
      expect(rollup.real_source_count).toBe(0);
    }
  });
});
