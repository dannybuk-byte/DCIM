/**
 * File-backed DME corpus loader.
 *
 * R-F3 (fail-closed corpus): a missing or invalid live corpus FAILS CLOSED —
 * the loader throws CorpusUnavailableError and the engine refuses to start —
 * unless demo mode is explicitly selected (SIGNALS_DEMO_MODE=true). The demo
 * fallback serves ONLY the seed corpus, and every seed source must already
 * carry synthetic/DESIGN provenance; unlabeled rows are refused. Production
 * consumers can therefore never receive fallback rows scored as real.
 */

import fs from 'fs';
import path from 'path';

/**
 * @typedef {'seeded' | 'pipeline' | 'mixed'} CorpusMode
 */

/** Explicit demo-mode selection for the signals engine (parallel to VITE_DEMO_MODE). */
export function isSignalsDemoMode() {
  return (process.env.SIGNALS_DEMO_MODE || '').trim().toLowerCase() === 'true';
}

/** Thrown when the live corpus is missing/invalid outside explicit demo mode. */
export class CorpusUnavailableError extends Error {
  /**
   * @param {string} reason
   * @param {string} artifactPath
   */
  constructor(reason, artifactPath) {
    super(
      `Live corpus unavailable (${reason}) at ${artifactPath}. ` +
        'Failing closed: seed/demo rows are never served as real. ' +
        'Provide a valid corpus artifact, or set SIGNALS_DEMO_MODE=true for an explicitly-labeled demo run.',
    );
    this.name = 'CorpusUnavailableError';
    this.reason = reason;
    this.artifact_path = artifactPath;
  }
}

/**
 * R-F3: every seed/demo source must carry synthetic provenance and the DESIGN
 * label BEFORE it can be served. Refusing mislabeled rows here means no code
 * path downstream can score a demo row as real.
 * @param {object[]} companies
 * @param {string} context
 */
function assertDesignLabeled(companies, context) {
  for (const company of companies) {
    if (company.provenance !== 'synthetic') {
      throw new CorpusUnavailableError(
        `unlabeled_demo_company_${company.id}_in_${context}`,
        'seed corpus',
      );
    }
    for (const source of company.sources || []) {
      if (source.provenance !== 'synthetic' || source.label !== 'DESIGN') {
        throw new CorpusUnavailableError(
          `unlabeled_demo_source_${source.id}_in_${context}`,
          'seed corpus',
        );
      }
    }
  }
}

/**
 * @param {object} params
 * @param {object[]} params.seedCompanies
 * @returns {{
 *   activeCompanies: object[],
 *   corpusMode: CorpusMode,
 *   corpusDetail: {
 *     artifact_path: string,
 *     artifact_mtime_iso: string | null,
 *     fallback_reason: string | null,
 *     pipeline_company_ids: string[],
 *     seed_appended_ids: string[],
 *     seed_skipped_duplicate_ids: string[],
 *   },
 * }}
 */
export function loadActiveCorpus({ seedCompanies }) {
  const cwd = process.cwd();
  const resolvedPath = process.env.SIGNALS_SEED_PATH
    ? path.resolve(cwd, process.env.SIGNALS_SEED_PATH.trim())
    : path.join(cwd, 'www_pipeline_out', 'validated_cases.json');

  const corpusModeEnv = (process.env.SIGNALS_CORPUS_MODE || '').trim().toLowerCase();
  // NOTE: mixed append is NOT demo-gated here. Outside SIGNALS_DEMO_MODE the
  // DESIGN-labeled seed rows appended below are removed at the production
  // assembly (index.js: isSyntheticRecord filter + R-F2 startup invariant),
  // so they can never reach scoring. Kept ungated to preserve corpus_mode
  // provenance reporting and the R-F3 mixed-append label check.
  const wantMixed = corpusModeEnv === 'mixed';

  /** @type {{ artifact_path: string, artifact_mtime_iso: string | null, fallback_reason: string | null, pipeline_company_ids: string[], seed_appended_ids: string[], seed_skipped_duplicate_ids: string[] }} */
  const corpusDetail = {
    artifact_path: resolvedPath,
    artifact_mtime_iso: null,
    fallback_reason: null,
    pipeline_company_ids: [],
    seed_appended_ids: [],
    seed_skipped_duplicate_ids: [],
  };

  /**
   * R-F3: fallback is DEMO-ONLY. Outside explicit demo mode a bad corpus
   * fails closed (throws); inside demo mode only DESIGN-labeled seed rows
   * are served.
   * @param {string} reason
   */
  function seeded(reason) {
    if (!isSignalsDemoMode()) {
      throw new CorpusUnavailableError(reason, resolvedPath);
    }
    assertDesignLabeled(seedCompanies, 'seeded_fallback');
    corpusDetail.fallback_reason = reason;
    return {
      activeCompanies: seedCompanies,
      corpusMode: /** @type {const} */ ('seeded'),
      corpusDetail: { ...corpusDetail },
    };
  }

  let rawText;
  try {
    rawText = fs.readFileSync(resolvedPath, 'utf8');
  } catch {
    return seeded('artifact_unreadable_or_missing');
  }

  /** @type {unknown} */
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return seeded('artifact_invalid_json');
  }

  if (!Array.isArray(parsed) || parsed.length === 0) {
    return seeded('artifact_empty_or_not_array');
  }

  for (let i = 0; i < parsed.length; i += 1) {
    const c = parsed[i];
    if (!c || typeof c !== 'object') {
      return seeded(`company_at_index_${i}_not_object`);
    }
    if (typeof c.id !== 'string' || !c.id.trim()) {
      return seeded(`company_at_index_${i}_missing_id`);
    }
    if (!Array.isArray(c.sources)) {
      return seeded(`company_at_index_${i}_missing_sources_array`);
    }
  }

  try {
    const st = fs.statSync(resolvedPath);
    corpusDetail.artifact_mtime_iso = st.mtime.toISOString();
  } catch {
    corpusDetail.artifact_mtime_iso = null;
  }

  const pipeline = parsed;
  corpusDetail.pipeline_company_ids = pipeline.map(/** @param {any} */ c => String(c.id));

  if (wantMixed) {
    // R-F3: mixed mode appends seed rows to a valid live corpus; those rows
    // must be DESIGN-labeled so they can never be read as real.
    assertDesignLabeled(seedCompanies, 'mixed_append');
    const pipelineIds = new Set(corpusDetail.pipeline_company_ids);
    const seedSkipped = [];
    const seedAppended = [];
    const active = [...pipeline];
    for (const s of seedCompanies) {
      if (pipelineIds.has(s.id)) {
        seedSkipped.push(s.id);
      } else {
        active.push(s);
        seedAppended.push(s.id);
      }
    }
    corpusDetail.seed_appended_ids = seedAppended;
    corpusDetail.seed_skipped_duplicate_ids = seedSkipped;
    return {
      activeCompanies: active,
      corpusMode: /** @type {const} */ ('mixed'),
      corpusDetail: { ...corpusDetail },
    };
  }

  return {
    activeCompanies: pipeline,
    corpusMode: /** @type {const} */ ('pipeline'),
    corpusDetail: { ...corpusDetail },
  };
}

/**
 * Serializable provenance for HTTP + export (non-developer legible).
 * @param {ReturnType<typeof loadActiveCorpus>} corpus
 * @param {number} seedBaselineLength
 */
export function buildCorpusProvenancePayload(corpus, seedBaselineLength) {
  const d = corpus.corpusDetail;
  const mode = corpus.corpusMode;
  const activeCount = corpus.activeCompanies.length;

  /** @type {Record<string, unknown>} */
  const out = {
    corpus_mode: mode,
    artifact_path: mode === 'seeded' ? null : d.artifact_path,
    artifact_mtime_iso: mode === 'seeded' ? null : d.artifact_mtime_iso,
    active_company_count: activeCount,
    seed_baseline_company_count: seedBaselineLength,
  };

  if (mode === 'seeded' && d.fallback_reason) {
    out.fallback_reason = d.fallback_reason;
    // R-F3: a seeded corpus only exists under explicit demo mode; say so.
    out.demo_only = true;
    out.seeded_provenance = 'synthetic/DESIGN';
  }

  if (mode === 'pipeline' || mode === 'mixed') {
    out.pipeline_company_ids = [...d.pipeline_company_ids];
    out.pipeline_company_count = d.pipeline_company_ids.length;
  }

  if (mode === 'mixed') {
    out.seed_appended_ids = [...d.seed_appended_ids];
    out.seed_skipped_duplicate_ids = [...d.seed_skipped_duplicate_ids];
  }

  return out;
}
