# Cursor Agent Charter — SEC Fetch [Localhost](http://Localhost)-Direct Implementation (Block 3)

*Charter version: v2 (May 14, 2026). Derived from substrate-notes architectural decision in commit* `6ae0a9a9`*. Implements [localhost](http://localhost)-direct SEC fetch path; retires Cloudflare Worker proxy from active use without removing it from the codebase. v2 incorporates cross-LLM pressure-test edits per the substrate-notes convergence pattern (commit* `855e19b5`*).*

**Role:** Autonomous coding agent implementing the [localhost](http://localhost)-direct SEC fetch architecture on `stabilization/2026-05`. Mechanical engineering only; stop at substrate/methodology boundaries and report. This charter operates under the same disciplines as `AGENT_CHARTER_SAMPLE_RUN.md` v4 (Commit Audit, hard stops, Definition of Done structure).

## Context

A prior session established that the Cloudflare Worker egress IP is blocked by SEC EDGAR (substrate-notes commit `855e19b5`) and chose [localhost](http://localhost)-direct as the production architecture (substrate-notes commit `6ae0a9a9`). The current pipeline is at HEAD `6ae0a9a9` on `stabilization/2026-05`, 9 commits ahead of origin, not pushed.

The cached `www_pipeline_out/last_run_summary.json` from 2026-05-13 shows the blocking failure mode: `warn_sec_join.matched_issuer_rows: 8` (working) but `section_extraction.fetch_errors: 8` and `candidates.total: 0`. All SEC fetches via the Worker proxy fail; downstream stages produce empty output.

The fetch logic lives in `scripts/_www_pipeline_lib.py` in class `SecClient` (line 68). Three request methods route through `self.proxy_base`:

- `get_json` (line 106) — constructs `{proxy_base}/api/sec/{sec_path}`

- `get_files_json` (line 124) — constructs `{proxy_base}/api/sec/files/{files_path}`

- `get_archives_text` (line 142) — constructs `{proxy_base}/api/sec/archives/{archives_path}`

The Worker's `/api/sec/...` URL scheme wraps SEC's native paths. Pointing `proxy_base` at `https://www.sec.gov` alone produces invalid URLs (e.g., `https://www.sec.gov/api/sec/archives/edgar/data/...`). The implementation must rewrite the three methods to construct SEC's native paths directly.

## Scope (exhaustive — no other changes)

Exactly five engineering changes are authorized under this charter. No others:

1. **Rewrite the three SEC fetch URL constructions** in `scripts/_www_pipeline_lib.py` to use SEC's native paths instead of the Worker's `/api/sec/` wrapping. Mapping:

   - `get_json`: `{base}/api/sec/{sec_path}` → `{base}/{sec_path}` where `sec_path` already encodes SEC's native shape (typically `submissions/CIK{cik10}.json`)

   - `get_files_json`: `{base}/api/sec/files/{files_path}` → `{base}/files/{files_path}`

   - `get_archives_text`: `{base}/api/sec/archives/{archives_path}` → `{base}/Archives/{archives_path}` (note: SEC uses capital `A` in `Archives`)

2. **Update `DEFAULT_SEC_PROXY`** (the module-level constant referenced at line 69 as `SecClient.proxy_base` default) to `https://www.sec.gov`. Rename the constant from `DEFAULT_SEC_PROXY` to `DEFAULT_SEC_BASE` for clarity. Update all references.

3. **Add client-side throttling** inside `_urlopen_read` (line 80) or wrapping `urllib.request.urlopen` (line 89). Conservative sub-1 req/s default. Implementation: a module-level last-request timestamp and a `time.sleep` to enforce minimum interval of 1.1 seconds between requests. Keep it simple; no asyncio, no rate-limiter libraries.

4. **Update the `SEC_UA` constant** to `"Dan Buk <dannybuk@gmail.com>"` per SEC fair-access policy. Locate the existing `SEC_UA` constant (referenced lines 112, 130, 152) and change its value.

5. **Re-verify rate-limit numbers** against current SEC EDGAR fair-access policy before finalizing. Fetch the official SEC fair-access page (typically `https://www.sec.gov/os/accessing-edgar-data`), confirm the 10 req/s ceiling and any UA-format requirements. If current SEC documentation contradicts the inherited substrate-notes numbers (sub-1 req/s default, 10 req/s ceiling), adopt the documented numbers and note the discrepancy in the Commit Audit.

**Out of scope (do not do, even if it seems like a good idea):**

- Removing the Cloudflare Worker code itself. The Worker stays in the codebase; we just stop pointing at it.

- Retry/backoff logic. Worth doing eventually, not now.

- IR-site fallback (substrate-notes option D). Deferred per `6ae0a9a9`.

- Refactoring `SecClient` beyond the three methods listed in (1).

- Modifying `scripts/extract_10k_sections.py`, `scripts/build_candidate_list.py`, `scripts/find_ai_attribution_candidates.py`, or `scripts/www_pipeline_summarize.py`. The fix lives entirely in `_www_pipeline_lib.py`.

- Modifying `scripts/run_www_pipeline.sh`. The CLI flag `--sec-proxy-base` already exists; no orchestration changes needed.

- Adding new dependencies. The library uses Python stdlib `urllib.request`); keep it that way.

- Modifying parsing heuristics, extraction thresholds, regexes, section-selection logic, or confidence scoring to improve Definition-of-Done metrics. The Definition of Done metrics measure the fetch architecture, not the analytical pipeline.

- Concurrency, threading, async execution, batching, queueing, or request-pool abstractions. Throttling is intentionally serial; alternative request models are out of scope regardless of perceived efficiency gain.

If any out-of-scope work appears necessary to make the in-scope work succeed, **stop and report** as a hard-stop event per `AGENT_CHARTER_SAMPLE_RUN.md` Working protocol.

## Definition of done

1. `bash scripts/run_www_pipeline.sh` (with `WWW_TICKERS_CACHE=scripts/sample_data/company_tickers_subset.json`) completes without uncaught traceback.

2. `python3 scripts/www_pipeline_summarize.py` JSON has non-error shape for all four sections (warn_sec_join, section_extraction, candidates, paths).

3. **Fetch-success threshold (b.i):** `section_extraction.fetch_errors ≤ 1` (out of 8 attempted) AND no more than 3 failed parse attempts across the run (in the default 8-issuer × 3-section sample, this equals ≥21/24 non-failed). This is the dispositive pass criterion for this charter — it proves the fetch architecture works.

4. **Candidate observation (stretch, not pass/fail):** `candidates.json` is well-formed JSON. Whether it contains 0, 1, or many candidates depends on whether the 8 sample issuers' 10-Ks contain AI-attribution language. Report the count in the Commit Audit but do not bind on it. Specifically: do NOT modify `scripts/find_ai_attribution_candidates.py` to force candidates through.

5. `candidate_list.json` and `filings_sections.json` exist under `www_pipeline_out/` and are non-empty in the substantive sense. `candidates.json` is at minimum a valid JSON array (possibly empty).

6. **Exactly one** new commit on `stabilization/2026-05` summarizing session changes (or hard-stop report with partial work documented).

### Audit-trail requirement

The Definition of Done report must include a **Commit Audit** subsection per the v4 structure inherited from `AGENT_CHARTER_SAMPLE_RUN.md`:

1. Commits created under this charter (hash + one-line message, or "No commits created")

2. Per-commit `git diff --stat` output against final commit state

3. Planned-but-not-made changes from this charter's Scope, with one-line reason each

4. Working-tree state at report time `git status` output)

Plus three additions specific to this charter:

5. **SEC fair-access verification result.** Quote the relevant section of current SEC documentation establishing the rate limit, with URL. State whether substrate-notes numbers (sub-1 req/s default, 10 req/s ceiling) were confirmed or revised.

6. **Per-issuer fetch outcome.** Table or list showing, for each of 8 issuers in the candidate list: CIK, fetch attempted (Y/N), fetch succeeded (Y/N), sections parsed (count of non-failed of 3 attempts), candidates surfaced (count). This is for demo-readiness diagnostics, not pass/fail.

7. **Candidates count observation.** Total candidates in `candidates.json` per stream `explicit_ai`, `operational_transformation`). One-line note on whether the observed count appears materially anomalous relative to the prior 2026-05-13 run baseline `candidates.total: 0`) — explicitly NOT a claim about whether the analytical pipeline is correct, just an observation.

## Working protocol

Read tracebacks carefully; prefer minimal correct fixes. Throttling is the most likely place for subtle bugs (timestamps, sleep math) — test with a small N before the full 8-issuer run. After each successful run, read full `www_pipeline_summarize.py` output. Before final commit: `git status` and `git diff --stat`; stage specific files; commit.

Hard stops:

- Any out-of-scope change appears necessary

- SEC returns 403 on direct fetches with the new architecture (would indicate residential IP also blocked, which would be a substrate observation worth capturing rather than engineering around)

- Any indication that SEC rate-limit or fair-access requirements would require architectural changes beyond the authorized scope of this charter

- Pre-commit hook failures that aren't trivially fixable inside the authorized scope

- Modifying files other than `scripts/_www_pipeline_lib.py`, except for mechanical updates strictly downstream of the `DEFAULT_SEC_PROXY → DEFAULT_SEC_BASE` rename (e.g., import statements, comments) — such updates must be enumerated explicitly in the Commit Audit.

Do not push the branch. Commits stay local per the `AGENT_CHARTER_SAMPLE_RUN.md` v4 convention.