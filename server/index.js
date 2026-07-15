/**
 * WWW Disclosure Mismatch Engine — Express API (Signals-oriented export).
 */
import express from 'express';
import cors from 'cors';
import { SEED_COMPANIES, DISCLAIMER_LINES } from './mockDataset.js';
import {
  loadActiveCorpus,
  buildCorpusProvenancePayload,
  isSignalsDemoMode,
} from './corpusLoader.js';
import { filterSourcesByPeriod, scoreCompanyForPeriod } from './scoringEngine.js';
import {
  DEFAULT_CONFIDENCE_THRESHOLD,
  DEFAULT_MISMATCH_BOUNDED_THRESHOLD,
  buildRobustnessExportMeta,
  enrichRowWithThresholdFields,
} from './robustnessEngine.js';
import {
  loadEpochConfirmSources,
  mergeEpochConfirmSources,
  computeLeadTime,
  summarizeProvenance,
} from './epochConfirm.js';
import { SYNTHETIC_CANDIDATES } from './syntheticCandidates.js';
import { pathToFileURL } from 'node:url';

const CORPUS = loadActiveCorpus({ seedCompanies: SEED_COMPANIES });
// Stage B/D: real Epoch confirm sources merged onto matched candidates (floor untouched).
const EPOCH_CONFIRM = loadEpochConfirmSources();
const MERGED_COMPANIES = mergeEpochConfirmSources(CORPUS.activeCompanies, EPOCH_CONFIRM);

/**
 * R-F2: a record is synthetic when the candidate is labeled synthetic OR any
 * of its sources is. Company-level exclusion (not source-stripping) so a
 * mislabeled hybrid can never be partially served as real.
 * @param {object} company
 */
export function isSyntheticRecord(company) {
  return (
    company.synthetic === true ||
    company.provenance === 'synthetic' ||
    (company.sources || []).some(s => s.provenance === 'synthetic')
  );
}

const SIGNALS_DEMO_MODE = isSignalsDemoMode();

// R-F2 (synthetic separation, by construction): the production assembly NEVER
// includes synthetic records — labeled-synthetic demonstration candidates are
// appended ONLY under the explicit demo corpus (SIGNALS_DEMO_MODE=true, the
// same switch that gates the seeded fallback). Because /companies, /scores,
// /companies/:id and /signals/export all derive exclusively from
// ACTIVE_COMPANIES, no synthetic record is reachable through any production
// endpoint. Real corroboration and synthetic demonstration remain separately
// labeled and never mixed to cross the floor.
export const ACTIVE_COMPANIES = SIGNALS_DEMO_MODE
  ? [...MERGED_COMPANIES, ...SYNTHETIC_CANDIDATES]
  : MERGED_COMPANIES.filter(c => !isSyntheticRecord(c));

// Post-assembly invariant check (defense in depth): outside demo mode the
// assembled list must contain zero synthetic records; violation is a startup
// failure, not a served response.
if (!SIGNALS_DEMO_MODE) {
  for (const company of ACTIVE_COMPANIES) {
    if (isSyntheticRecord(company)) {
      throw new Error(
        `R-F2 invariant violated: synthetic record '${company.id}' reached the production assembly`,
      );
    }
  }
}
// D1 (ratified 2026-07-03): freeze the counted list at the assembly boundary so
// post-assembly mutation cannot alter what gets counted. Each company's sources array is
// frozen (blocks push/splice), the company object is frozen (blocks sources reassignment),
// and the list itself is frozen (blocks adding/removing candidates). Mutation of any of
// these throws in ESM strict mode. The floor (scoringEngine.js) only reads these shapes.
for (const company of ACTIVE_COMPANIES) {
  if (Array.isArray(company.sources)) Object.freeze(company.sources);
  Object.freeze(company);
}
Object.freeze(ACTIVE_COMPANIES);
const CORPUS_PROVENANCE = {
  ...buildCorpusProvenancePayload(CORPUS, SEED_COMPANIES.length),
  // R-F2: say explicitly whether demonstration candidates are in the surface.
  demo_mode: SIGNALS_DEMO_MODE,
  synthetic_candidates_included: SIGNALS_DEMO_MODE,
};

const PORT = Number(process.env.SIGNALS_PORT || process.env.PORT || 8787);
const REFERENCE_DATE = process.env.SIGNALS_REFERENCE_DATE
  ? new Date(process.env.SIGNALS_REFERENCE_DATE)
  : new Date();

// Exported for endpoint-level tests (module import stays side-effect-free;
// no socket opens unless run directly).
export const app = express();
app.use(cors({ origin: true }));
app.use(express.json({ limit: '2mb' }));

function parsePeriodQuery(req) {
  const from = req.query.from || req.query.period_start || null;
  const to = req.query.to || req.query.period_end || null;
  if (!from && !to) return null;
  return { from, to };
}

function parseThresholdQuery(req) {
  const rawM = req.query.mismatch_threshold ?? req.query.bounded_mismatch_threshold;
  const rawC = req.query.confidence_threshold;
  const mParsed = rawM !== undefined && rawM !== '' ? Number(rawM) : DEFAULT_MISMATCH_BOUNDED_THRESHOLD;
  const cParsed = rawC !== undefined && rawC !== '' ? Number(rawC) : DEFAULT_CONFIDENCE_THRESHOLD;
  const mismatchBounded = Number.isFinite(mParsed)
    ? Math.max(0, Math.min(100, mParsed))
    : DEFAULT_MISMATCH_BOUNDED_THRESHOLD;
  const confidenceMin = Number.isFinite(cParsed)
    ? Math.max(0, Math.min(100, cParsed))
    : DEFAULT_CONFIDENCE_THRESHOLD;
  return { mismatchBounded, confidenceMin };
}

function listRow(company, periodQuery) {
  const scored = scoreCompanyForPeriod(company, REFERENCE_DATE, periodQuery);
  const { company_id: _cid, ...rest } = scored;
  return {
    id: company.id,
    name: company.name,
    sector: company.sector,
    ...(company.case_type ? { case_type: company.case_type } : {}),
    ...(company.reviewer_flag ? { reviewer_flag: company.reviewer_flag } : {}),
    // Stage C/D: timeline lead time (from the real Epoch public-visibility date) and the
    // LIVE/DESIGN provenance rollup, so the surface can render both honestly.
    lead_time: computeLeadTime(company),
    provenance: summarizeProvenance(company),
    ...rest,
  };
}

export function exportSignalRecord(company, periodQuery, thresholdCtx) {
  const scored = scoreCompanyForPeriod(company, REFERENCE_DATE, periodQuery);
  const filtered = filterSourcesByPeriod(company.sources || [], periodQuery?.from, periodQuery?.to);
  const rowShape = { id: company.id, ...scored };
  const enriched = enrichRowWithThresholdFields(rowShape, thresholdCtx.mismatchBounded, thresholdCtx.confidenceMin);
  return {
    company_id: company.id,
    company: company.name,
    sector: company.sector,
    ...(company.case_type ? { case_type: company.case_type } : {}),
    ...(company.reviewer_flag ? { reviewer_flag: company.reviewer_flag } : {}),
    period_start: scored.period_start,
    period_end: scored.period_end,
    period_query: scored.period_query,
    aas: scored.aas,
    lss: scored.lss,
    ds: scored.ds,
    mismatch_index: scored.mismatch_index,
    raw_mismatch_index: scored.raw_mismatch_index,
    bounded_mismatch_index: scored.bounded_mismatch_index,
    confidence_score: scored.confidence_score,
    confidence_breakdown: scored.confidence_breakdown,
    evidence_quality: scored.evidence_quality,
    risk_level: scored.risk_level,
    risk_level_at_threshold: enriched.risk_level_at_threshold,
    flagged_at_threshold: enriched.flagged_at_threshold,
    source_count: scored.source_count,
    // R-F5: admission summary — which rows were counted, which were held out
    // as annotations, and which were rejected (duplicates/malformed).
    admission: scored.admission,
    source_types_present: scored.source_types_present,
    missing_expected_sources: scored.missing_expected_sources,
    score_breakdown: scored.score_breakdown,
    warnings: scored.warnings,
    scores_suppressed: scored.scores_suppressed,
    low_confidence_flag: scored.low_confidence_flag,
    source_coverage_score: scored.source_coverage_score,
    false_positive_flags: {
      possible: scored.possible_false_positive,
      reasons: scored.false_positive_reasons,
    },
    false_negative_flags: {
      possible: scored.possible_false_negative,
      reasons: scored.false_negative_reasons,
    },
    provenance: summarizeProvenance(company),
    sources: filtered,
  };
}

function exportPayload(periodQuery, thresholdCtx) {
  const listRows = sortListRows(ACTIVE_COMPANIES.map(c => listRow(c, periodQuery)));
  const enrichedRows = listRows.map(r =>
    enrichRowWithThresholdFields(r, thresholdCtx.mismatchBounded, thresholdCtx.confidenceMin),
  );
  const robustness = buildRobustnessExportMeta(
    enrichedRows,
    ACTIVE_COMPANIES,
    REFERENCE_DATE,
    periodQuery,
    thresholdCtx.mismatchBounded,
    thresholdCtx.confidenceMin,
  );

  return {
    schema_version: 'v1',
    generated_at: new Date().toISOString(),
    disclaimers: DISCLAIMER_LINES,
    corpus_provenance: CORPUS_PROVENANCE,
    threshold_used: robustness.threshold_used,
    flagged_count_at_threshold: robustness.flagged_count_at_threshold,
    sensitivity_analysis: robustness.sensitivity_analysis,
    pattern_stability: robustness.pattern_stability,
    cross_case_consistency: robustness.cross_case_consistency,
    signals: ACTIVE_COMPANIES.map(c => exportSignalRecord(c, periodQuery, thresholdCtx)),
  };
}

function sortListRows(rows) {
  return [...rows].sort((a, b) => {
    const av = a.scores_suppressed ? -1000 : (a.bounded_mismatch_index ?? -1);
    const bv = b.scores_suppressed ? -1000 : (b.bounded_mismatch_index ?? -1);
    return bv - av;
  });
}

app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'disclosure-mismatch-engine',
    schema_version: 'v1',
    corpus_provenance: CORPUS_PROVENANCE,
  });
});

app.get('/companies', (req, res) => {
  const pq = parsePeriodQuery(req);
  const th = parseThresholdQuery(req);
  const rows = sortListRows(ACTIVE_COMPANIES.map(c => listRow(c, pq)));
  const enriched = rows.map(r => enrichRowWithThresholdFields(r, th.mismatchBounded, th.confidenceMin));
  const robustness = buildRobustnessExportMeta(
    enriched,
    ACTIVE_COMPANIES,
    REFERENCE_DATE,
    pq,
    th.mismatchBounded,
    th.confidenceMin,
  );
  res.json({
    disclaimers: DISCLAIMER_LINES,
    corpus_provenance: CORPUS_PROVENANCE,
    period_query: pq,
    threshold_params: {
      bounded_mismatch_minimum: th.mismatchBounded,
      confidence_minimum: th.confidenceMin,
    },
    robustness_summary: {
      flagged_count_at_threshold: robustness.flagged_count_at_threshold,
      pattern_stability: robustness.pattern_stability,
      sensitivity_analysis: robustness.sensitivity_analysis,
      cross_case_consistency: robustness.cross_case_consistency,
    },
    companies: enriched,
  });
});

app.get('/companies/:id', (req, res) => {
  const pq = parsePeriodQuery(req);
  const company = ACTIVE_COMPANIES.find(c => c.id === req.params.id);
  if (!company) {
    res.status(404).json({
      error: 'company_not_found',
      id: req.params.id,
      corpus_provenance: CORPUS_PROVENANCE,
    });
    return;
  }
  const scored = scoreCompanyForPeriod(company, REFERENCE_DATE, pq);
  const filtered = filterSourcesByPeriod(company.sources || [], pq?.from, pq?.to);
  const th = parseThresholdQuery(req);
  const { company_id: _x, ...scoreRest } = scored;
  const rowShape = { id: company.id, ...scored };
  const thresholdFields = enrichRowWithThresholdFields(rowShape, th.mismatchBounded, th.confidenceMin);
  res.json({
    disclaimers: DISCLAIMER_LINES,
    corpus_provenance: CORPUS_PROVENANCE,
    period_query: pq,
    threshold_params: {
      bounded_mismatch_minimum: th.mismatchBounded,
      confidence_minimum: th.confidenceMin,
    },
    company: {
      id: company.id,
      name: company.name,
      sector: company.sector,
      ...(company.case_type ? { case_type: company.case_type } : {}),
      ...(company.reviewer_flag ? { reviewer_flag: company.reviewer_flag } : {}),
      scores: scoreRest,
      flagged_at_threshold: thresholdFields.flagged_at_threshold,
      risk_level_at_threshold: thresholdFields.risk_level_at_threshold,
      sources: filtered,
    },
  });
});

app.get('/scores', (req, res) => {
  const pq = parsePeriodQuery(req);
  const rows = sortListRows(ACTIVE_COMPANIES.map(c => listRow(c, pq))).map(r => ({
    company_id: r.id,
    company_name: r.name,
    sector: r.sector,
    ...Object.fromEntries(
      Object.entries(r).filter(([k]) => !['id', 'name', 'sector'].includes(k)),
    ),
  }));
  res.json({
    disclaimers: DISCLAIMER_LINES,
    corpus_provenance: CORPUS_PROVENANCE,
    period_query: pq,
    scores: rows,
  });
});

app.get('/signals/export', (req, res) => {
  const pq = parsePeriodQuery(req);
  const th = parseThresholdQuery(req);
  const fmt = (req.query.format || 'json').toLowerCase();
  const body = exportPayload(pq, th);

  if (fmt === 'jsonl') {
    res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="disclosure_signals.jsonl"');
    const header = {
      type: 'meta',
      schema_version: body.schema_version,
      generated_at: body.generated_at,
      disclaimers: body.disclaimers,
      corpus_provenance: body.corpus_provenance,
      period_query: pq,
      threshold_used: body.threshold_used,
      flagged_count_at_threshold: body.flagged_count_at_threshold,
      sensitivity_analysis: body.sensitivity_analysis,
      pattern_stability: body.pattern_stability,
      cross_case_consistency: body.cross_case_consistency,
    };
    const lines = [JSON.stringify(header), ...body.signals.map(s => JSON.stringify({ type: 'signal', ...s }))].join('\n');
    res.send(`${lines}\n`);
    return;
  }

  res.json(body);
});

// Listen only when this module is run directly (npm run signals-server); importing it is
// side-effect-free — no socket opens. Under `node -e` / dynamic import process.argv[1] is
// undefined, so guard it before pathToFileURL(), which throws on undefined input.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  app.listen(PORT, () => {
    const d = CORPUS.corpusDetail;
    // eslint-disable-next-line no-console
    console.log(`[signals] Disclosure Mismatch Engine listening on http://127.0.0.1:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(
      `[signals] corpus_mode=${CORPUS.corpusMode} artifact=${d.artifact_path} active=${ACTIVE_COMPANIES.length} seed_baseline=${SEED_COMPANIES.length}` +
        (CORPUS.corpusMode === 'mixed'
          ? ` seed_appended=${d.seed_appended_ids.length} seed_skipped_dup=${d.seed_skipped_duplicate_ids.length}`
          : '') +
        (CORPUS.corpusMode === 'seeded' && d.fallback_reason ? ` fallback_reason=${d.fallback_reason}` : ''),
    );
  });
}
