/**
 * Optional file-backed DME corpus loader with fallback to static seed.
 * No coercion: invalid artifact → full seeded fallback (ratification v1).
 */

import fs from 'fs';
import path from 'path';

/**
 * @typedef {'seeded' | 'pipeline' | 'mixed'} CorpusMode
 */

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
   * @param {string} reason
   */
  function seeded(reason) {
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
