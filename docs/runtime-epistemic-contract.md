# Runtime Epistemic Contract

This document specifies the on-wire shape of pipeline outcomes for the WWW disclosure-observability project. It is the shared contract that Python ingestion, the Node/Express DME, fixture cases, the audit log, and the UI all implement against.

The contract operationalizes the methodological posture documented in [`ARCHITECTURE.md`](../ARCHITECTURE.md) at runtime. Where the architecture document describes what the substrate is supposed to do, this document specifies what those behaviors look like as data crossing process boundaries.

## Contents

- [Outcome classes](#outcome-classes)
- [Envelope shape](#envelope-shape)
- [Success](#success)
- [Operational failure](#operational-failure)
- [Epistemic state](#epistemic-state)
- [Audit log shape](#audit-log-shape)
- [Fixture expectations](#fixture-expectations)
- [Non-goals](#non-goals)
- [Colophon](#colophon)

## Outcome classes

The pipeline produces exactly three outcome classes:

- **`success`** — A reviewable case has been produced. The case has cleared source-threshold and warrant checks. Routing for human review is the substrate doing its job.
- **`operational_failure`** — A runtime/infrastructure failure prevented evaluation. The data is not necessarily insufficient; the system did not get to evaluate it. Retryable in principle.
- **`epistemic_state`** — Evaluation completed and concluded that the evidence is structurally insufficient for case emission. This is *not* a failure of the substrate; it is the substrate functioning correctly. Includes both visible-suppression states and ambiguity-preservation states.

The distinction between `operational_failure` and `epistemic_state` is load-bearing. The first means "the system could not know"; the second means "the system knows enough to decline escalation."

## Envelope shape

Every outcome emitted by the pipeline conforms to a uniform envelope:

```json
{
  "outcome": "success" | "operational_failure" | "epistemic_state",
  "timestamp": "2026-05-17T14:32:11.482Z",
  "pipeline_stage": "string",
  "case_ref": "string | null",
  "details": { ... class-specific shape ... }
}
```

Field semantics:

- `outcome` — One of the three outcome class strings. Discriminates the `details` shape.
- `timestamp` — ISO 8601 UTC timestamp at the moment of outcome emission.
- `pipeline_stage` — The pipeline stage that produced the outcome. Free-form string; current valid values include `"extract_10k_sections"`, `"build_candidate_list"`, `"emit_case_cards"`, `"summarize"`. Stage names are listed in this document rather than enforced as enum to allow ingestion expansion without contract revision.
- `case_ref` — Stable identifier for the case under evaluation. May be `null` for outcomes that occur before a case is identified (e.g., upstream fetch failures).
- `details` — Class-specific payload. Shape is determined by `outcome`.

## Success

A success outcome means a reviewable case has been produced and routed for human review.

```json
{
  "outcome": "success",
  "timestamp": "2026-05-17T14:32:11.482Z",
  "pipeline_stage": "emit_case_cards",
  "case_ref": "case_2026_05_17_employer_alpha_warn_v_10k",
  "details": {
    "case_card_uri": "string",
    "sources": [
      {
        "layer": "L1" | "L2" | "L3" | "L4",
        "source_id": "string",
        "warrant_state": "primary" | "corroborating",
        "fetched_at": "2026-05-17T14:32:11.482Z"
      }
    ],
    "score": { ... scoring-engine output ... }
  }
}
```

The `sources` array must contain at least the number required by the source-threshold configuration (`MIN_SOURCES_FOR_SCORES`). If it does not, the pipeline must emit an `epistemic_state` outcome instead — never a `success` with insufficient sources.

## Operational failure

An operational failure means runtime conditions prevented evaluation.

```json
{
  "outcome": "operational_failure",
  "timestamp": "2026-05-17T14:32:11.482Z",
  "pipeline_stage": "build_candidate_list",
  "case_ref": null,
  "details": {
    "subtype": "fetch_timeout" | "fetch_error" | "parse_error" | "downstream_unavailable",
    "source_id": "string | null",
    "retry_count": 0,
    "retryable": true,
    "error_summary": "string"
  }
}
```

Subtype semantics:

- `fetch_timeout` — Network timeout reaching an upstream source.
- `fetch_error` — Upstream returned an error (HTTP 4xx/5xx, equivalent).
- `parse_error` — Upstream returned data that could not be parsed.
- `downstream_unavailable` — A downstream component (DME, audit log, etc.) could not be reached.

Operational failures are eligible for retry. They are not evidentiary outcomes; they describe infrastructure state, not employer disclosures.

## Epistemic state

An epistemic state means evaluation completed and concluded that the evidence does not support case emission.

```json
{
  "outcome": "epistemic_state",
  "timestamp": "2026-05-17T14:32:11.482Z",
  "pipeline_stage": "emit_case_cards",
  "case_ref": "case_2026_05_17_employer_beta_10k_only",
  "details": {
    "subtype": "insufficient_sources" | "provenance_break" | "entity_ambiguity",
    "disposition": "suppress" | "review_queue",
    "evaluated_sources": [
      {
        "layer": "L1" | "L2" | "L3" | "L4",
        "source_id": "string",
        "warrant_state": "primary" | "corroborating" | "unwarranted"
      }
    ],
    "reason": "string"
  }
}
```

Subtype semantics:

- `insufficient_sources` — The record was evaluated but the number of independent sources fell below threshold. Disposition is `suppress`. UI displays visible suppression.
- `provenance_break` — Required warrant fields (dates, source URIs, employer identifiers) were missing or unverifiable. Disposition is `suppress`. The record cannot be routed for review because the reviewer would have nothing reliable to review.
- `entity_ambiguity` — The record could plausibly refer to two or more distinct employers/facilities and the resolver returned ambiguous output. Disposition is `review_queue`. The case is routed for human disambiguation, not auto-merged and not suppressed.

**Important framing:** `entity_ambiguity` with `disposition: review_queue` is a *success* in the project's terms — it is the substrate preserving ambiguity rather than collapsing it. It is categorized as `epistemic_state` rather than `success` because no reviewable case card has been emitted; the record is in the review queue pending human resolution. The class name reflects the substrate state, not a value judgment about the outcome.

Future epistemic subtypes (e.g., contradicting warrants, temporal misalignment) can be added to this enum without revising the envelope. Subtypes are explicit string values, not integer codes.

## Audit log shape

The audit log is the append-only persistent record of every outcome the pipeline emits. Its on-wire shape is identical to the outcome envelope above.

Format: JSON Lines (`.jsonl`). One outcome per line. No batching, no nesting, no log levels.

```
{"outcome":"success","timestamp":"...","pipeline_stage":"...","case_ref":"...","details":{...}}
{"outcome":"epistemic_state","timestamp":"...","pipeline_stage":"...","case_ref":"...","details":{...}}
{"outcome":"operational_failure","timestamp":"...","pipeline_stage":"...","case_ref":null,"details":{...}}
```

Storage path: ⟨audit log path pending — likely `audit/pipeline_outcomes.jsonl` or per-day rotation under `audit/YYYY-MM-DD.jsonl`⟩

Design properties:

- **Append-only.** Outcomes are written once and never modified. Corrections take the form of new outcomes with reference to prior `case_ref`, not edits.
- **Replayable.** The full pipeline state for any historical moment can be reconstructed by replaying the log up to a timestamp.
- **Reviewable.** A reviewer asking "why was this case suppressed on date X" can find the answer by grepping `case_ref` and reading the `details`.

The audit log is the runtime correlate of the methodological posture: visible suppression is meaningful only if the suppression event is auditable retrospectively.

## Fixture expectations

Three fixture cases ship with the pipeline. They are deterministic regression tests for the contract above.

**Fixture 1: corroborated case (success path).**

Inputs: an L1 WARN filing and an L3 10-K disclosure that reference the same employer over a comparable time window, both with complete warrant fields.

Expected outcome: `success`. The emitted envelope's `details.sources` array contains both inputs with `warrant_state` set appropriately.

**Fixture 2: single-source case (suppression path).**

Inputs: an L3 10-K disclosure with AI-attributed headcount reduction language and complete warrant fields. No corresponding L1 record.

Expected outcome: `epistemic_state` with `subtype: insufficient_sources` and `disposition: suppress`. The UI displays "Insufficient sources — signal withheld."

**Fixture 3: provenance-break case (rejection path).**

Inputs: an L1 record and an L3 record that would otherwise corroborate, but with a required warrant field missing (e.g., no filing date on the L1 record, or no source URI on the L3 record).

Expected outcome: `epistemic_state` with `subtype: provenance_break` and `disposition: suppress`. The audit log captures which warrant field was missing.

Fixtures must use realistic identifiers — employer names with typographic variation, dates in mixed formats, filing references that resemble real WARN/SEC reference formats. Synthetic-clean fixtures overfit the implementation to idealized inputs and provide false confidence.

Future fixtures (entity ambiguity, operational failure under network partition, etc.) are deferred until the corresponding pipeline behavior is implemented and producing those outcomes in non-test conditions.

## Non-goals

To prevent contract drift:

- This contract does **not** specify UI rendering. The UI consumes outcome envelopes and decides how to surface each class, but the visual treatment is not part of the contract.
- This contract does **not** specify case-card schema. The `case_card_uri` field in `success.details` points to a case card; the case card's structure is documented separately.
- This contract does **not** specify retry policy for operational failures. Retry logic is implementation-specific and lives in the pipeline orchestrator.
- This contract does **not** specify the source-threshold configuration. `MIN_SOURCES_FOR_SCORES` is a runtime config; this contract specifies the outcomes that follow from it, not its value.
- This contract does **not** specify scoring engine internals. The `score` field in `success.details` is whatever the scoring engine produces; its shape is documented with the scoring engine.

Each of these is a downstream concern that the contract intentionally leaves to implementation. Premature coupling here would force coordinated revision across surfaces.

## Colophon

- Document version: v1 draft, ⟨publication date pending⟩
- Repository snapshot: ⟨commit hash pending⟩
- Implements methodological posture documented in [`ARCHITECTURE.md`](../ARCHITECTURE.md)
- Status: draft contract pending implementation
