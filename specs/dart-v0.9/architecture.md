# DART v0.9 — Architecture contract

## Source-to-screen path

```text
exact vendored DART response
  -> retrieval manifest + hash
  -> immutable raw-row preservation
  -> parser + field-warrant mapping
  -> row/application/DEC/facility identity separation
  -> canonical DART/DEC lineage assignment
  -> same-lineage collapse
  -> bounded claim packet
  -> existing evidence gate
  -> insufficient_sources / suppress
  -> WITHHELD_ONE_ORIGIN presentation label
  -> real API response
  -> functional UI evidence panel
  -> provenance-preserving local export
```

## Identity model

- `source_row_id`: physical Socrata row, normally `:id`.
- `application_id`: DART application/permit identifier; not the row key.
- `dec_id`: documented facility identifier stem where warranted; not an origin.
- `permit_sequence`: retained application sequence; not a new origin.
- `facility_subject_id`: normalized project subject with explicit granularity.
- `canonical_origin_id`: counted evidentiary lineage for the bounded proposition.
- `processing_episode_id`: `UNRESOLVED` until warranted.

## Decision model

The repository's existing typed epistemic contract should remain primary:

```text
subtype = insufficient_sources
disposition = suppress
independent_origin_count = 1
required_origin_count = 2
score = null
corroborated = false
```

`WITHHELD_ONE_ORIGIN` is the exact v0.9 reason/presentation state for that condition, not a disconnected replacement state machine.

## Agent model

- One writer in one isolated worktree.
- One independent read-only verifier after the diff is frozen.
- Agents read the same frozen specification and acceptance JSON.
- Agent completion is not approval.
- Principal authorization is a separate exact act.

## Extension boundary

The architecture must permit a future second independent origin without changing the meanings of row identity, facility identity, lineage, score suppression, or UI provenance.
