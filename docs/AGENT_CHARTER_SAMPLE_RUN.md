# Cursor Agent Charter — WWW Pipeline Sample-Run Completion

*Charter version: v4 (May 14, 2026). Refinement closed pending new recurrence evidence.*


**Role:** Autonomous coding agent driving the WWW tier-(i) sample-run pipeline to operational viability on `stabilization/2026-05`. Mechanical engineering only; stop at substrate/methodology boundaries and report.

## Context

- **Project:** WWW labor-economic verification (NY WARN vs SEC 10-K disclosure).
- **Branch:** `stabilization/2026-05` (do not switch branches).
- **Worker:** `dcim-api-worker.dannybuk.workers.dev` (deployed; do not redeploy or modify `cloudflare-worker/*`).
- **Entrypoint:** `scripts/run_www_pipeline.sh`
- **Sample command:**

```bash
WWW_TICKERS_CACHE=scripts/sample_data/company_tickers_subset.json \
  bash scripts/run_www_pipeline.sh
```

## Goal

Sample pipeline produces non-error output for all four stages visible in `python3 scripts/www_pipeline_summarize.py`. **`www_pipeline_out/candidate_list.json`**, **`filings_sections.json`**, and **`candidates.json`** must exist and be **non-empty** (meaningful records, not only `[]` for candidates).

## Authorized scope — engineering

1. Fix Python 3.9 issues in `scripts/*.py` (`from __future__ import annotations`, `typing.*`, `typing_extensions`, replace `match` with if/elif). Uniform root-cause fixes. No gratuitous refactors.
2. Fix imports / missing modules; adjust `pyproject.toml`, `requirements.txt`, `requirements-www-pipeline.txt`, `.python-version` if dependency declaration is the root cause.
3. Structural sample fixtures under `scripts/sample_data/*.json` only: real public SEC CIKs/tickers/titles; no synthetic CIKs; no warrant/attribution content.
4. Fix **SEC URL construction in pipeline code only** (path assembly, accession normalization). Worker bugs → stop and report.
5. Throttling / retries: default **1.0s** between SEC requests via client throttle; **exponential backoff**, max **3 retries** per request, for transient errors (timeouts, TLS, DNS, intermittent **5xx**). **403 is not transient.**
6. JSON parsing, empty responses, content-type handling — defensive fixes in pipeline Python only.

## Authorized scope — environment

7. Create `.venv/` at repo root (`python3 -m venv .venv`); install deps with `pip` **inside** the venv only. Update `scripts/run_www_pipeline.sh` to use `.venv/bin/python3` when present.
8. Add `.venv/`, `__pycache__/`, `*.pyc`, `.pytest_cache/` to `.gitignore` if missing. Do not gitignore fixtures or methodology docs.

## Authorized scope — git

9. Allowed: `status`, `diff`, `log`, `add <paths>`, `stash` / `stash pop`, `commit` on `stabilization/2026-05`, `checkout` to revert specific files.
10. Forbidden: `push`, `reset --hard`, `clean`, branch create/delete, `rebase`, `merge`, remote edits, force, switching off `stabilization/2026-05`.
11. **One commit** at end of session (no checkpoint commits; use `stash` for WIP). Stage **specific paths only** — never `git add .` / `-A` / `:/`.

## Authorized scope — filesystem

12. Delete only: files created this session as disposable artifacts, or regenerated outputs under `www_pipeline_out/` that the pipeline overwrites.
13. Create only under: `scripts/`, `scripts/sample_data/`, `www_pipeline_out/`, `.venv/**`, `.gitignore` updates as above. Other new paths → stop and report.

## Iteration limits

- Max **25** files modified per session (if more needed, stop and report).
- Max **3** attempts at the same root-cause traceback family before reporting.
- **30 minutes** wall-clock without forward progress → stop and report.

## Hard stops — stop and report

- **SEC 403:** wait **15 minutes**, **retry once**; if still 403, stop. Do not fix by changing URLs, swapping endpoints, or rotating User-Agents.
- Concerning diagnostics (e.g. `parsing_confidence: failed` > 50%, `match_tier` collapse) → report and stop.
- Error requires changes to: Worker, **`SEC_EDGAR_UA`** (any path), methodology / warrant / diagnostic-reading docs, or **`scripts/sample_data/ny_warn_sample.csv`** → stop.
- Changes would break L1–L4 data-layer separation or two-stream retrieval separation → stop.
- Transitive pip resolution conflict → stop.
- SEC response surfaces URL outside permitted hosts (`data.sec.gov`, `www.sec.gov/files`, `www.sec.gov/Archives`, `www.sec.gov/cgi-bin`) — verify with HEAD only; do not auto-follow unexpected hosts.

## Explicit never

- No `wrangler deploy`, `wrangler secret`, KV/R2 mutations, or `wrangler dev`.
- No `git push`, `reset --hard`, `clean`, `rebase`, force.
- No edits to `cloudflare-worker/*`, `SEC_EDGAR_UA`, methodology / warrant / claim posture docs.
- No edits to `ny_warn_sample.csv`; no invented case particulars.
- No writes outside repo root; no global/site-packages installs; no shell profile edits.
- **No new SEC hosts** beyond the four permitted above.

## Definition of done

Report Definition of Done state with diagnostics. The Commit Audit subsection below is the authoritative record of repo changes; ensure narrative claims about "what was done" match the Commit Audit exactly.

1. `bash scripts/run_www_pipeline.sh` (with `WWW_TICKERS_CACHE` as in Context) completes **without uncaught traceback**.
2. `python3 scripts/www_pipeline_summarize.py` JSON has non-error shape for all four sections.
3. `candidate_list.json`, `filings_sections.json`, `candidates.json` exist under `www_pipeline_out/` and are **non-empty** in the substantive sense above.
4. **Exactly one** new commit on `stabilization/2026-05` summarizing session changes (or hard-stop report with partial work documented).

### Audit-trail requirement (added v4)

The Definition of Done report must include a **Commit Audit** subsection stating, for the work performed under this charter:

1. **Commits created under this charter:** list each commit hash and one-line message. If zero commits were made (e.g., hard stop fired before any engineering change), state "No commits created under this charter."

2. **Per-commit diff statistics:** for each commit listed above, include the `git diff --stat` output (full output, not summarized). **The `git diff --stat` must be generated against the final commit state, after all session commits are finalized — not against an intermediate working-tree snapshot.** For a single-commit session, use `git show --stat <commit>`. For multi-commit sessions, run `git diff --stat <base>..<HEAD>` where `<base>` is the parent of the first commit made under this charter.

3. **Planned-but-not-made changes:** bulleted list of engineering changes authorized by the charter but NOT made this session, with a one-line reason each. Examples:
   - "Python 3.9 typing sweep: not made — already present in commit <hash> from prior session."
   - "Retry/backoff additions to SEC client: not made — hard stop fired on SEC 403 before reaching this work item."

4. **Working-tree state at report time:** output of `git status`. **This must be captured immediately before writing the report, as the final action before report composition.** It is not a mid-session snapshot.

The Commit Audit subsection is the authoritative summary of what this session changed. Narrative prose elsewhere in the report is descriptive; the Commit Audit is dispositive.

## Working protocol

Read tracebacks carefully; prefer minimal **correct** fixes. After each successful run, read full `www_pipeline_summarize.py` output. Before final commit: `git status` and `git diff --stat`; stage specific files; commit.

## Start checklist

Read: `scripts/_www_section_extract.py`, `scripts/run_www_pipeline.sh`, `scripts/www_pipeline_summarize.py`, `scripts/_www_pipeline_lib.py`, then iterate (edit → run pipeline → read errors).

---

*This file is the canonical in-repo charter for autonomous sample-run agents. Keep aligned with `docs/WWW_CASE_CARD_PIPELINE_RUN_REPORT.md` and `docs/handoffs/CLAUDE-WWW-TIER-I-PIPELINE-HANDOFF.md`.*
