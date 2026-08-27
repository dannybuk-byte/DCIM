# DART v0.9 — Product and behavior specification

## Objective

Move one real New York DART-derived facility/application packet from exact source bytes through the repository's actual evidence model, API, and functional UI. The packet must end visibly and reproducibly as `WITHHELD_ONE_ORIGIN` because exactly one canonical facility-level origin remains after same-lineage collapse and the project requires two.

## User outcome

A reviewer can tell:

1. what the official DART record establishes;
2. what it does not establish;
3. why the claim is withheld;
4. why multiple DART rows do not create corroboration;
5. what institutionally distinct record would be needed next.

## Required behavior

- Preserve exact source response bytes and a reproducible retrieval manifest.
- Preserve physical row identity separately from application identity.
- Preserve DEC facility grouping separately from project facility resolution.
- Preserve evidentiary lineage separately from all source identifiers.
- Map field-level warrants and separate source-event, publication/snapshot, retrieval, and first-observation clocks.
- Collapse every same-lineage DART record in the packet to one counted `canonical_origin_id` unless a separate supported independence analysis proves otherwise.
- Return one counted origin and two required origins.
- Return `score = null` or omit score; never substitute zero.
- Return `corroborated = false`.
- Render the exact withheld reason in the real API and UI.
- Keep conflicts, nulls, raw rows, lineage, and provenance locally inspectable.

## Forbidden behavior

- No detected, confirmed, corroborated, alert, confidence, or lead-time label.
- No row-count-as-origin-count shortcut.
- No `application_id` as the unique row key.
- No mock/demo fallback hidden as real data.
- No owner-layer evidence counting toward the facility floor.
- No second origin created from a permit variant, applicant variant, update, separate row, Socrata transport artifact, or same-lineage DEC/ENB echo.
- No public export until the rights determination explicitly covers it.

## Out of scope

- A second independent source and v1.0 corroboration.
- Comprehensive New York coverage.
- Automatic recurring DART refresh.
- MCP, ACP, A2A, agent gateway, or durable orchestration.
- Full event-sourced project control plane.
- Push, deployment, publication, outreach, or public alerting.

## Exit conditions

All must pass:

1. exact vendored DART response and complete retrieval manifest;
2. implementation-sufficient source-admission and use-specific rights decision;
3. actual data-center candidate plus positive and negative controls;
4. raw parser and identifier preservation;
5. one canonical counted origin after collapse;
6. exact `WITHHELD_ONE_ORIGIN` packet, no score, no corroboration;
7. real API response;
8. functional evidence panel;
9. complete regression evidence;
10. frozen independent verifier report;
11. one documented expert/user review;
12. evidence-generated closeout rather than prose-only certification.
