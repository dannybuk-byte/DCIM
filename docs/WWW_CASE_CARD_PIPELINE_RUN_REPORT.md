# WWW Case-Card Extraction — Tier (i) Run Report

Branch: `stabilization/2026-05` (DCIM repo). Methodology reference on emitted cards: `WWW-MN-2026-05-VSE`.

This document is updated by pasting the output of `python3 scripts/www_pipeline_summarize.py` after a full run, plus any environmental notes.

## Local test invocations (copy/paste)

Run from the repository root with `export PYTHONPATH=scripts` (or use `bash scripts/run_www_pipeline.sh`, which sets it).

### 1) Full pipeline on a small WARN sample (8 issuers in `scripts/sample_data/ny_warn_sample.csv`)

For an **offline** join (no `company_tickers.json` download), point at the bundled subset used for smoke tests:

```bash
export PYTHONPATH=scripts
pip install -r requirements-www-pipeline.txt
python3 scripts/build_candidate_list.py \
  --warn scripts/sample_data/ny_warn_sample.csv \
  --tickers-cache scripts/sample_data/company_tickers_subset.json \
  --output www_pipeline_out/candidate_list.json
python3 scripts/extract_10k_sections.py \
  --candidates www_pipeline_out/candidate_list.json \
  --limit 8 \
  --output www_pipeline_out/filings_sections.json
python3 scripts/find_ai_attribution_candidates.py \
  --filings www_pipeline_out/filings_sections.json \
  --output www_pipeline_out/candidates.json
python3 scripts/www_pipeline_summarize.py | tee www_pipeline_out/last_run_summary.json
```

Or use the wrapper (defaults to downloading full `company_tickers` from SEC via the worker — requires network):

```bash
export PYTHONPATH=scripts
pip install -r requirements-www-pipeline.txt
bash scripts/run_www_pipeline.sh
```

### 2) Fetch and extract a single issuer’s latest 10-K sections (Goldman Sachs CIK `0000886982`)

Requires `www_pipeline_out/candidate_list.json` from step (1) or a WARN file that includes that issuer.

```bash
export PYTHONPATH=scripts
python3 scripts/extract_10k_sections.py \
  --candidates www_pipeline_out/candidate_list.json \
  --single-cik 0000886982 \
  --output www_pipeline_out/single_cik_filings_sections.json
```

### 3) Candidate extraction on one section’s plain text (both streams, stdout JSON)

```bash
export PYTHONPATH=scripts
python3 scripts/find_ai_attribution_candidates.py \
  --demo-section-text-file scripts/sample_data/demo_mda_snippet.txt
```

### Emit hand-validated case cards (after editing accepted list)

```bash
export PYTHONPATH=scripts
python3 scripts/emit_case_cards.py \
  --accepted scripts/sample_data/sample_accepted_candidates.json \
  --output www_pipeline_out/validated_cases.json
```

## WARN ∩ SEC join

_Paste `warn_sec_join` from `www_pipeline_out/last_run_summary.json` after running the pipeline._

- **Matched issuer rows**: count of rows in `candidate_list.json` (each is a proposed WARN row with a CIK).
- **Low-confidence / review-required**: `match_tier === "review_required"` — **not** auto-accepted; confirm CIK before relying on extraction.
- **Unmatched WARN rows**: reported in `build_candidate_list.py` stdout as `unmatched` (not written to `candidate_list.json`).

## Section extraction

_Paste `section_extraction` from the summary JSON._

- **parsing_confidence** is four-state only: `clean` | `heuristic` | `approximate` | `failed` (never collapsed to binary).
- **Honest failures**: `failed` leaves `text` empty and preserves `filing_url` / `filing_viewer_url` on the filing record where applicable.

## Candidate output (two streams, not merged)

_Paste `candidates` from the summary JSON._

- **Per-stream counts**: `explicit_ai` vs `operational_transformation`.
- **Proximity distribution**: `min_token_distance` statistics (paragraphs without workforce proximity terms sort after matches and use a large sentinel distance).
- **Top 10 per stream**: included in summary for quick skim.

## Environmental blockers & open questions

- **Worker dependency**: JSON uses `GET /api/sec/*` → `data.sec.gov`; filing HTML uses **`GET /api/sec/archives/*` → `www.sec.gov/Archives/edgar/...`** (added on this branch). Until the worker is deployed, set `WWW_SEC_PROXY_BASE` to an origin that serves both routes, or expect archive fetches to fail.
- **Rate limits**: scripts throttle lightly (~120 ms between requests); for large batches, expect wall-clock time and occasional HTTP errors — re-run is safe (no “retry until clean” logic; failures surface as `failed`).
- **Tier (ii) temptation log** (do not implement without a separate decision): a tiny relevance classifier on paragraphs would reduce noise but violates the methodology posture; if noise is unusable after baseline review, record that here as justification for tier (ii).

## Last automated summary snapshot

_(Fill after `scripts/run_www_pipeline.sh`.)_

```json
{
  "note": "Run: python3 scripts/www_pipeline_summarize.py > www_pipeline_out/last_run_summary.json"
}
```
