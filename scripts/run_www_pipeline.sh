#!/usr/bin/env bash
# WWW tier-(i) deterministic pipeline — run from repository root.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
export PYTHONPATH="${ROOT}/scripts${PYTHONPATH:+:${PYTHONPATH}}"

mkdir -p www_pipeline_out data/cache

python3 scripts/build_candidate_list.py \
  --warn scripts/sample_data/ny_warn_sample.csv \
  --tickers-cache "${WWW_TICKERS_CACHE:-data/cache/company_tickers.json}" \
  --output www_pipeline_out/candidate_list.json

python3 scripts/extract_10k_sections.py \
  --candidates www_pipeline_out/candidate_list.json \
  --limit 8 \
  --output www_pipeline_out/filings_sections.json

python3 scripts/find_ai_attribution_candidates.py \
  --filings www_pipeline_out/filings_sections.json \
  --output www_pipeline_out/candidates.json

python3 scripts/www_pipeline_summarize.py | tee www_pipeline_out/last_run_summary.json

echo "Done. See www_pipeline_out/ and docs/WWW_CASE_CARD_PIPELINE_RUN_REPORT.md"
