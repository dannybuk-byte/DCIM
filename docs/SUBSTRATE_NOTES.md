# Substrate Notes

Process observations and substrate-level patterns. Not engineering governance (see `docs/AGENT_CHARTER_*`). Not methodology (see `wwwill-methodology-note-*`). Substrate metadata only.

---
## 2026-05-13 — Cross-LLM consultation convergence pattern

Charter v1→v3 evolution used a Claude (drafting) + ChatGPT (pressure-testing) loop. Pattern observations:

- **Three rounds maximum to convergence.** Greenfield artifacts (v1→v3) took three rounds. Refining a working artifact (v3→v4) took one round. The marginal-return curve flattens fast.

- **The second LLM's most productive role is anti-scope-creep adjudication, not novel content generation.** In both consultation cycles, ChatGPT's highest-value contribution was explicitly drawing the stop line — "no further iteration warranted" — rather than introducing new content.

- **Both LLMs must have permission to say "stop."** Without that framing, both default to generating more refinements regardless of marginal value. The stop-permission framing is what made the pattern terminate cleanly.

- **Convergence on narrow scope across both advisors is itself evidence.** When both LLMs independently arrive at the same termination point with similar reasoning, that's a stronger signal than either individual recommendation.

Reusable pattern for future charter-class artifacts: production-run scaling charter, tier-(ii) classifier charter, and others queued in the substrate.

---
## 2026-05-14 — SEC EDGAR rate-limit enforcement against Cloudflare Worker egress IPs

**Observation:** SEC EDGAR rate-limit enforcement against Cloudflare Worker egress IPs extends beyond the documented 10-minute window.

**Evidence:** ~16-hour persistent block following ~5 repeat trips within a one-hour window during May 13 debugging session. Block persisted across overnight despite UA improvements and no further requests during the wait period. Reference ID `0.d30c0317.1778759635.1c3e7f76` from morning May 14 verification curl.

**Mechanism (inferred):** Block sits at the IP layer, not the identity layer. User-Agent improvements do not lift the block when the Cloudflare Worker egress IP itself is on SEC's persistent block list. Documented 10-minute rolling rate-limit applies only to first-trip enforcement; repeated trips trigger longer-tail IP-level blocks of unknown duration.

**Implication for production:** The current proxy architecture is not viable for production-scale WWW pipeline runs without one of:
  (a) dedicated egress IP not shared with general Worker traffic,
  (b) direct-from-localhost SEC fetches with strict client-side throttling (max 10 req/s per SEC guidance, conservative sub-1 req/s recommended),
  (c) commercial SEC data provider (e.g., SEC API providers that maintain their own throttled fetch infrastructure),
  (d) issuer investor-relations sites as a parallel retrieval path for pre-validated issuer lists (caveat: SEC EDGAR remains canonical for discovery and citation; IR sites are retrieval workaround only).

**Status:** Open architectural decision. Not blocking sample-run validation (which can use local cached filings). Blocking production-scale pipeline runs.

---

## 2026-05-14 — SEC fetch architecture decision: localhost-direct as primary

**Decision:** Localhost-direct fetches from `www.sec.gov`, on-demand runtime (8am-10pm working hours), no VM, no Cloudflare Worker proxy in the request path. Throttled client-side at sub-1 req/s default, hard ceiling at SEC's published 10 req/s.

**Stack ordering considered:** B (localhost-direct) > D (IR-site fallback) > A (dedicated Worker egress IP). B selected as sole primary path; D and A deferred.

**Why B over A:** A doesn't fix the failure mode that took the pipeline offline. The shared Worker IP got blocked because SEC's enforcement caught the request pattern, not because the IP was shared per se. A dedicated Worker IP can land on the same persistent block list on its own merits. B avoids the Worker-egress reputation problem entirely; SEC enforcement against a single residential IP making sub-1 req/s within published guidance is well-precedented to be rare.

**Why on-demand rather than VM-autonomous:** Pipeline cadence is reconciliation work (WARN ↔ SEC contradiction detection), not real-time alerting. Sub-day latency not required. On-demand laptop runs during working hours match actual usage pattern; VM provisioning was deferred as solving a problem we don't have.

**Why D deferred:** With interactive runs, "B failed for issuer X, retry tomorrow or fetch manually" is acceptable human-in-the-loop response. Per-issuer scrapers only justify their maintenance burden once specific issuer-level failures become frequent enough to automate around.

**Why A held in reserve:** Future option if on-demand becomes binding constraint and a leased VM is unacceptable for cost/ops/data-residency reasons not yet surfaced. Two product details still need verification before A is deployable: whether Cloudflare's dedicated-egress-IP product covers Workers specifically, and required plan tier.

**Status:** Decision made; implementation pending under Block 3. Rate-limit numbers (sub-1 req/s default, 10 req/s ceiling) inherited from prior substrate-notes observation and should be re-verified against current SEC EDGAR fair-access policy before Block 3 implementation lands.
---

## 2026-05-14 — Analytical-lens layer under-represented in project record

**Observation:** Cross-LLM context-pooling on 2026-05-14 (Claude + ChatGPT briefing exchange) surfaced that the project record under-represents WWW's analytical-lens layer. Specifically, the four-layer / three-output architecture (L1-L4 / O1-O3) as documented in prior substrate notes and project memory captures data ingestion (L1-L4) and contradiction-detection output (O1), but does not represent the analytical/doctrinal frameworks WWW is intended to apply to that output.

**Confirmed analytical lenses surfaced in this session (incomplete list — see failsafe below):**

- Networks, Platforms, and Utilities (NPU) — legal/regulatory framework. User-supplied source links: LPE Project, Fordham Law Review, Vanderbilt Policy Accelerator, Yale Law & Policy, SSRN, Yale Journal on Regulation.
- Computational Antitrust — User-supplied source links: Stanford CodeX, Network Law Review.

**Intended mode of application (user-stated 2026-05-14):** The app should "attempt automated analysis" with human review of automated output for verification. This sits between full-automated and tag-and-classify modes; the bounded version of the capability has not yet been specified at the engineering level.

**Why this is substrate-level, not just project-briefing-level:** The architecture itself may need extension. The current L1-L4 / O1-O3 structure has no slot for analytical-lens application. Whether this is a new output category (e.g., O4 doctrinal analysis), a transverse layer applied across O1-O3, or a separate post-processing stage is an architecture-design question, not a documentation question.

**What is NOT being decided here:** This entry does not commit to specific engineering scope for any individual lens, does not architect the analytical-lens layer, and does not extend the L1-L4 / O1-O3 model. Those decisions are deferred to a dedicated session.

**What is being captured:** The methodological observation that (a) the project record was incomplete, (b) cross-LLM pooling surfaced the incompleteness, and (c) a dedicated architecture session is needed before further deliverables claim WWW capabilities in the analytical-lens domain.

### FAILSAFE — INCOMPLETENESS NOTICE

This entry's enumeration of analytical lenses is explicitly non-exhaustive. User has indicated additional analytical lenses were intended for WWW application but were not surfaced in this 2026-05-14 session due to time constraints. Until a dedicated architecture session enumerates the full set:

1. Any deliverable claiming "WWW's analytical lenses are NPU and Computational Antitrust" is incorrect. The correct claim is: "NPU and Computational Antitrust are *among* WWW's analytical lenses; the complete list is not yet documented."

2. Any AI assistant (including future Claude sessions) reading this substrate file must NOT treat the two-lens enumeration as complete. The two listed are confirmed; the full set is open.

3. Before any deliverable references analytical-lens capability, the user must be prompted to confirm whether the full lens set has been enumerated. If not, the deliverable must use language consistent with point (1) above.

4. This failsafe is lifted only by a subsequent dated substrate notes entry that explicitly states "full lens set enumerated; no further lenses pending."

**Status:** Open. Architecture session pending. Until that session lands, deliverables referencing analytical-lens capability (e.g., NPU-frame analysis, Computational Antitrust analysis) must be bracketed as planned-not-implemented.
---

## 2026-05-14 — Cross-LLM pooling requires user-side triage

**Observation:** The cross-LLM consultation convergence pattern documented 2026-05-13 (commit `855e19b5`) was extended on 2026-05-14 in a different direction: context-pooling (rather than pressure-testing) across Claude and ChatGPT memory for the same project. This produced useful gap-detection — ChatGPT's pooled briefing surfaced items missing from Claude memory, including the analytical-lens gap captured in the preceding 2026-05-14 entry — but also produced contamination risk that the original pattern did not.

**Failure mode:** ChatGPT memory accumulates across all user activity, not just within a single project. Pooling without triage can pull non-project context into project records if the user has used the same ChatGPT account for multiple unrelated threads. Items the user has discussed in adjacent-but-separate contexts can read as in-scope to the receiving LLM when they are not.

**User-side triage as part of the pattern:** Cross-LLM pooling requires the user to triage pooled items before they enter durable project records. Triage criteria:

- Items confirmed against the receiving LLM's project memory → safe to record
- Items not in receiving LLM's memory but user can confirm as in-scope → safe to record with confirmation noted
- Items not in receiving LLM's memory and user cannot immediately confirm → flag as uncertain; do not record until verified
- Items the user identifies as out-of-scope (different project, different domain) → drop entirely, do not record even for "completeness"

**Implication for pattern reuse:** Future cross-LLM pooling exercises (production-scale charter, tier-(ii) classifier charter, others in the substrate) should include an explicit triage step in their working protocol. The substrate-notes pattern of producing a briefing → reviewing → committing requires the review step to be substantive triage, not just proofreading.

**Implication for the preceding 2026-05-14 analytical-lens entry:** That entry's contents were triaged before recording. NPU and Computational Antitrust are user-confirmed (with source links) and Claude-memory-adjacent (the ChatGPT briefing's "NPU framework" mention prompted the user to surface the full reference). Other items from the same pooling session were either confirmed against Claude memory (the four-layer architecture, the warrant tags, the named empirical sources) or identified by the user as out-of-scope (NY/OK incorporation discussions) and dropped.

**Status:** Pattern upgrade documented. Triage step is now part of cross-LLM pooling working protocol.
---
---

## 2026-05-15 — First substrate bridge complete (DCIM ↔ DME)

**Commit:** `3995ed64645821786fec4086a5f447261664a819`  
**Branch:** `stabilization/2026-05` (local only; not pushed)  
**Message:** `feat(signals): optional pipeline corpus load with visible provenance`

**Objective completed:** First executable substrate bridge between the Python WWW extraction pipeline and the Node/Express Disclosure Mismatch Engine (DME). Prior state: pipeline outputs landed under `www_pipeline_out/` but were unread by DME, which served only `server/mockDataset.js` `SEED_COMPANIES` in memory. The two paths were operationally disconnected in code. This commit introduces `server/corpusLoader.js` and wires `server/index.js` to optionally load `www_pipeline_out/validated_cases.json` (or `SIGNALS_SEED_PATH`) at startup, with visible provenance surfaced on `/health`, `/companies`, `/companies/:id`, `/scores`, `/signals/export` (JSON + JSONL meta), and a small UI strip in `DisclosureMismatchView`. The bridge was intentionally implemented as an inspectable provenance boundary rather than a generalized normalization layer; transformation logic remains minimal and explicit.

**Ratifications (recorded design choices, not defaults):**

1. **Replace-only default.** When `validated_cases.json` loads successfully, the active corpus *is* the pipeline corpus. Mixed mode (append non-colliding seed companies; pipeline wins on `id` collision) is opt-in only via `SIGNALS_CORPUS_MODE=mixed`. Default-to-mixed was explicitly rejected to preserve semantic clarity at the first substrate boundary.

2. **No coercion in v1.** Invalid pipeline shapes trigger fallback to seeded mode with `corpus_mode: "seeded"` and `corpus_provenance.fallback_reason` populated. No field-level coercion logic. Schema drift is surfaced as visible mode change, not absorbed by silent normalization.

3. **Single-source companies accepted as-is.** Pipeline output may contain companies with fewer sources than the DME scoring threshold (`MIN_SOURCES_FOR_SCORES = 2` in `scoringEngine.js`). Scoring suppression applies normally. The Goldman Sachs entry (`goldman_sachs_www_tier_i`, 1 source) loads under pipeline mode; its scores will suppress. This is the intended demonstration of bounded claims — provenance label plus visible suppression behavior beats either masking the limitation or modifying scoring to compensate.

**Smoke verification (live, 2026-05-15):** Startup log on `node server/index.js`: `[signals] corpus_mode=pipeline artifact=/Users/daniel/Desktop/DCIM/www_pipeline_out/validated_cases.json active=1 seed_baseline=12`. `GET /health` returned `corpus_provenance` with `corpus_mode: "pipeline"`, `active_company_count: 1`, `pipeline_company_ids: ["goldman_sachs_www_tier_i"]`, `artifact_mtime_iso: "2026-05-13T13:18:14.685Z"`, `seed_baseline_company_count: 12`. `GET /companies` returned the same provenance block alongside disclaimers. Browser UI verified via `npm run dev:with-signals`: AI Labor tab renders, corpus source strip displays pipeline mode, Goldman row shows "Insufficient sources — signal withheld" message under suppression.

**Intentionally unresolved (deferred from this work):**

- Broader ontology and canonical-status declaration system — no unified maturity ontology was built; existing piecemeal markers (`parsing_confidence`, `reviewer_flag`, `methodology_reference`, `warrant_note`) were inventoried but not unified.
- Mixed mode is implemented but intentionally non-default; treated as a future operational or demo-specific choice rather than canonical behavior. No mixed-mode usage is endorsed by this milestone.
- DME mismatch model vs. facility `ContradictionPair` model — left separate.
- Dexie `Source` / `Citation` / `DataProvenance` schemas — left as partial scaffolding, not promoted to system-of-record.
- Audience wrappers / presentation-layer architecture — not built; deferred until first real demo audience identified.
- Hard technical/social firewall between substrate and presentation layers — conceptual work only; no architectural enforcement.
- Analytical-lens layer architecture (per 2026-05-14 entry) — remains open, unaffected by this work.

**What this milestone permits:** Any future claim about pipeline-backed DME demonstration can be substantiated by running the smoke commands against current commit state. Prior to this commit, such claims would have been aspirational. The DME ↔ pipeline boundary now exists in code; it does not yet imply that broader substrate, ontology, or provenance architecture has been resolved. Those remain future work.

**Status:** Closed. First substrate bridge objective complete. Sprint paused here intentionally; resumption to be scoped against actual first-demo audience and context rather than continued speculative polish.
