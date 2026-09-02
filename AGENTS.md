# AGENTS.md — DCIM DART v0.9 worktree

**Project:** DCIM / EFF data-center evidence-control application  
**Workstream:** DART v0.9 source-to-screen proof  
**Starting commit:** `e7e95553ee44b218077ee3352470364d0a7cb81f`  
**Planned writer worktree:** `/Users/daniel/Desktop/DCIM_WORKTREES/dart-v0.9`  
**Planned branch:** `agent/dart-v0.9`

## 1. Authority and load order

Use this order when instructions conflict:

1. Daniel Buk's explicit instruction for the exact act.
2. `specs/dart-v0.9/spec.md`, `architecture.md`, `acceptance.json`, `tasks.json`, `evidence-requirements.md`, and `verification.md`.
3. `STATUS.md` and the current repository code/tests.
4. This file.
5. Other repository documents. Most root-level Markdown predates the current method and is historical unless a newer governing file says otherwise.

Agent completion is not approval. No agent may authorize a ruling, source admission, rights determination, commit, push, deployment, publication, outreach, purchase, or credential use.

## 2. Current verified capability boundary

- The real corroborated corpus contains **zero rows**.
- The serving engine fails closed rather than serve unproven data.
- Zero New York official-record adapters are connected to scoring.
- The NYISO adapter exists and is fixture-tested, but is unwired and has not been run against live data.
- DART research bytes exist outside the application path, but this repository has no DART parser, adapter, connected ingest path, packet, API route, or UI path yet.
- No current detection or measured lead-time claim is valid.
- BGP, CT, DNS, WHOIS/RDAP, ASN, peering, and other owner-layer signals are permanently ineligible for the facility corroboration floor.

Do not soften, upgrade, or generalize these statements without new dated evidence scoped to the exact commit and environment.

## 3. DART v0.9 objective

Move one real New York DART-derived facility/application packet from exact source bytes through the repository's actual evidence model, API, and functional UI. After same-lineage collapse, the packet must contain exactly one counted facility-level origin and end as:

```text
subtype = insufficient_sources
disposition = suppress
independent_origin_count = 1
required_origin_count = 2
score = null
corroborated = false
presentation_reason = WITHHELD_ONE_ORIGIN
```

The reviewer must be able to tell what the DART record establishes, what it does not establish, why multiple DART rows do not create corroboration, and what institutionally independent record is needed next.

## 4. Non-negotiable data and claim invariants

Keep these identities separate:

- `source_row_id`: physical Socrata row, normally `:id`.
- `application_id`: DART application/permit identifier; never the unique row key.
- `dec_id`: facility grouping identifier where warranted; never an evidence origin.
- `permit_sequence`: retained application sequence; not a new origin.
- `facility_subject_id`: normalized physical/project subject with explicit granularity.
- `canonical_origin_id`: counted disclosure lineage for the bounded proposition.
- `processing_episode_id`: `UNRESOLVED` until supported.

Required conduct:

- Preserve exact raw fields, original spellings, nulls, conflicts, and source bytes.
- Keep source-event, publication/snapshot, retrieval, and first-observation clocks separate.
- Collapse same-lineage DART rows, permit variants, applicant variants, updates, and DEC/ENB echoes to one origin unless a supported independence analysis proves otherwise.
- Never count owner/entity support toward the facility floor.
- Never substitute zero for a withheld or unavailable score.
- Never hide mock or demo fallback as real data.
- Never label the v0.9 packet detected, confirmed, corroborated, alerted, confident, or early.

## 5. Work and agent boundary

- One writer operates in this worktree. Parallel agents may inspect, but only the designated writer edits.
- Claude Code's default role for this workstream is independent read-only verifier after the writer freezes the diff.
- During T01, all agents are read-only and must stop after the preflight/code-map report is frozen.
- Read-only Git commands are allowed when required: `git status`, `git diff`, `git show`, `git log`, and `git rev-parse`.
- Git mutation and networked Git are prohibited unless Daniel authorizes the exact act: no add, commit, push, pull, fetch, merge, rebase, reset, clean, stash, branch deletion, worktree prune, or `ls-remote`.
- No network access, dependency installation, source retrieval, build, test, dev server, or application run occurs unless the active task explicitly authorizes it.
- Do not change `MIN_SOURCES_FOR_SCORES = 2` or the canonical-origin floor semantics.
- Do not edit the frozen specification or acceptance criteria to make implementation easier. Surface a conflict and stop.

## 6. Stage-0 / T01 commands

Safe now:

```bash
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git status --short
git diff -- AGENTS.md CLAUDE.md .cursor .vscode specs schemas scripts/validate_spec_bundle.mjs
node scripts/validate_spec_bundle.mjs
```

Discover actual build, test, API, UI, evidence, and origin symbols during T01; do not guess them from legacy documentation.

Caution: loading Vite or Vitest configuration may regenerate build-identity files. Do not run `npm run dev`, `npm run build`, `npm run test`, or `npm run test:run` until the active task authorizes execution and the pre-run status is captured.

## 7. Stop conditions

Stop and report rather than infer when:

- repository root, branch, HEAD, worktree, or spec hashes differ from the task contract;
- a required input, retrieval manifest, rights decision, candidate, control, or source byte object is missing;
- row, application, facility, or origin identity cannot be resolved at the claimed level;
- a purported second origin is same-lineage, merely another row, or only owner/entity-level;
- a field's author or warrant is unknown;
- a source date is impossible or out of range;
- a hidden fallback, mock, or silent default appears;
- work would require an unauthorized external or Git act.

`WITHHELD`, `UNDERIVED`, `ABSENT`, `UNRESOLVED`, and `NOT_TESTED` are successful outcomes when the evidence requires them.

## 8. Completion evidence

Every task return must include:

- root, branch/worktree, HEAD, and status;
- spec and acceptance hashes;
- files inspected or changed;
- commands run with actual exit codes;
- acceptance-criterion verdicts;
- test and runtime evidence where authorized;
- known limitations and indeterminate items;
- confirmation that no prohibited act occurred.

## 9. Stable control plane for all new implementation tasks

After `HARNESS-1` is qualified, do not create new bespoke mega-carriers or use a conversation as the state database. New implementation tasks must use:

- one manifest under `.dcim/tasks/`;
- the stable executor at `tools/dcim-control/cli.mjs`;
- repository-local durable runtime storage under `.dcim/runtime/`;
- a disposable writer worktree and separate read-only verifier worktree;
- exact write allowlists and protected paths;
- no more than two same-scope correction turns;
- machine-readable results and content-addressed artifacts;
- separate execution, governance, and transport states;
- exact principal acceptance before promotion.

The drift guard blocks duplicate-digest transfer requests, approval fatigue, nested repair chains, and control-artifact creation without product progress. See `docs/engineering/DCIM_CONTROL_PLANE.md` and `tools/dcim-control/README.md`.
