# Handoff: WWW Case-Card Extraction — Tier (i) Deterministic Pipeline

**Audience:** Claude (continuation / review / deployment).  
**Repo:** `/Users/daniel/Desktop/DCIM`  
**Branch:** `stabilization/2026-05`  
**Landmark commit:** `ac6a359a` — *Add WWW tier-(i) SEC retrieval pipeline and archives proxy.*

## What shipped

Deterministic, no-LLM pipeline for WARN-matched issuers → SEC 10-K sections → two **separate** retrieval streams → ranked candidate paragraphs → optional emit of DME-shaped `validated_cases.json` from **hand-written** warrant notes.

**Methodology posture (non-negotiable):** Retrieval vocabulary only; no causal attribution in code; streams never merged; `parsing_confidence` is four-state (`clean` | `heuristic` | `approximate` | `failed`); failures surface honestly; no tier-(ii) classifiers.

## Files to read first

| Path | Purpose |
|------|---------|
| `docs/WWW_CASE_CARD_PIPELINE_RUN_REPORT.md` | Run report template + three copy-paste local invocations |
| `requirements-www-pipeline.txt` | `beautifulsoup4`, `lxml` |
| `cloudflare-worker/index.js` | `SEC_EDGAR_UA`; **`/api/sec/archives/`** before **`/api/sec/`** |
| `scripts/_www_pipeline_lib.py` | SEC proxy client, token distance, `NO_WORKFORCE_SENTINEL` |
| `scripts/_www_section_extract.py` | HTML → Item 1A / Item 7 (MD&A) boundaries |
| `scripts/build_candidate_list.py` | WARN ∩ SEC join; `match_tier` review flags |
| `scripts/extract_10k_sections.py` | Submissions + filing fetch + sections JSON |
| `scripts/find_ai_attribution_candidates.py` | Two streams + proximity rank; `--demo-section-text-file` |
| `scripts/emit_case_cards.py` | Accepted rows → `validated_cases.json` |
| `scripts/www_pipeline_summarize.py` | Diagnostics JSON for the run report |
| `scripts/run_www_pipeline.sh` | Full sample pipeline; `WWW_TICKERS_CACHE` env override |
| `scripts/sample_data/` | `ny_warn_sample.csv`, `company_tickers_subset.json` (offline join), `demo_mda_snippet.txt`, `sample_accepted_candidates.json` |

**Out of scope (do not do without a new prompt):** DME `server/index.js` / client changes; warn-scraper wiring; tier-(ii) relevance models.

## SEC proxy contract

- **JSON (`data.sec.gov`):** `GET {WWW_SEC_PROXY_BASE}/api/sec/submissions/CIK##########.json` and `.../files/company_tickers.json`  
  Default `WWW_SEC_PROXY_BASE`: `https://dcim-dashboard.dannybuk.workers.dev` (override via env).

- **Filing HTML (`www.sec.gov`):** `GET {WWW_SEC_PROXY_BASE}/api/sec/archives/edgar/data/{cik_int}/{accession_nodash}/{primary_document}`  
  Worker maps to `https://www.sec.gov/Archives/edgar/{rest}`. **Requires deploying the worker change** in commit `ac6a359a`; older workers only have `/api/sec/` and will not serve archives.

## Outputs (local, gitignored)

Directory: `www_pipeline_out/` (see root `.gitignore`).

- `candidate_list.json` — matched WARN rows + CIK + `match_tier`  
- `filings_sections.json` — per filing: `sections.{mda,item_1a,item_7}.{text,parsing_confidence}`  
- `candidates.json` — flat list; each row has `stream`: `explicit_ai` | `operational_transformation`  
- `validated_cases.json` — from `emit_case_cards.py` only after Daniel edits accepted candidates

## Verification the parent agent could not complete

End-to-end SEC fetch was not verified here (outbound HTTP tunnel returned 403). Claude should run on a machine with clean network:

1. **Goldman Sachs** CIK `0000886982` — Stream 1 should pick up AI / ML language in recent 10-K Item 1A or Item 7.  
2. **Amazon** CIK `0001018724` — same.

Commands are in `docs/WWW_CASE_CARD_PIPELINE_RUN_REPORT.md` (single-CIK extract + full pipeline).

## Suggested next steps for Claude

1. Deploy updated Cloudflare worker so `/api/sec/archives/` is live; confirm with `curl` on one known filing path.  
2. Run full pipeline with real `company_tickers.json` cache and Daniel’s WARN file path; paste `www_pipeline_summarize.py` output into the run report.  
3. Spot-check `candidates.json` for Goldman and Amazon: two streams present, no merged stream, no interpretive labels beyond `stream` and parsing metadata.  
4. If HTML extraction is noisy, **document** in the run report — do not add a relevance classifier without an explicit tier-(ii) decision.

## Open questions (leave for Daniel)

- Whether `match_tier` thresholds (`--review-below`, `--min-score` in `build_candidate_list.py`) need tuning after real WARN data.  
- Whether section boundaries need issuer-specific rules (foreign private issuers, dual-column HTML).

---

*End of handoff. Full spec lived in the user’s “WWW Case-Card Extraction Pipeline” task message; this doc is the repo-local execution summary.*
