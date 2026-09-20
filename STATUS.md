# STATUS — dated state and method

This file records repository state and evidence scope at a dated reviewed
commit; it is not a continuously current runtime observation.

**Reviewed on:** 2026-09-20 (read-only code and record inspection).  
**Reviewed commit:** `710977eae3e30e00d317c04874bc08003bbd9a7e`.  
**Selected local checkout:** worktree `dart-v0.9`, branch `agent/dart-v0.9`;
this selection does not designate a canonical, writer, or verifier worktree.

**Historical Phase-1 review:** `remediate/rulings-2026-08-05`, frozen at
`e7e95553ee44b218077ee3352470364d0a7cb81f`, with baseline
`334040aa0e12bca5aead7e52630480570542b32a`. The original inventory and
`ARCHITECTURE.md` attestation refer to that review, not to a moving branch tip.

## Accepted scope at the reviewed commit

- **T06:** `docs/engineering/T06_RECONCILIATION_MANIFEST.json` and the accepted
  ledger record `T06_CLOSED` at `a2082dba90be990818c293a42a425f9bbd86707a`.
  They record host tests of 63/63 CandidatePacket, 161/161 governed DART, and
  362/362 full host, plus corrected independent IV3 with zero findings.
  The fixture-hydration gap is separate; public clean-checkout replay remains
  unclaimed, and accepted source/tests must not be changed to hide that gap.
- **HARNESS-1:** commit `281f9651f4d730cb216a65ad6ce427afd262df4b` records
  adoption after Ubuntu/macOS qualification. The pre-adoption note in
  `docs/engineering/HARNESS_1_IMPLEMENTATION_STATUS.md` and the standalone
  bootstrap `HARNESS-1` draft entry do not reopen that completed adoption.
- **H1A-C1:** the reviewed commit records integration of the accepted lifecycle
  change. `.dcim/state/events.jsonl` and `.dcim/state/current.generated.json` record
  `HARNESS-1-H1A-CANONICAL-LIFECYCLE-1` and T06 as
  `SUCCEEDED / PRINCIPAL_ACCEPTED / CONSUMED`. Native H1A `CONSUMED` records
  consumption into a local promotion candidate; it does not establish a remote merge.
  Integration is recorded separately. H1A does not establish OS-enforced
  containment or authorization for arbitrary agentic writers; the explicit
  limits in `tools/dcim-control/README.md` still apply.

These are recorded historical results, not tests rerun for this review.
Local qualification, formal independent verification, principal acceptance,
and promotion remain distinct. Unpromoted candidate work is outside this
accepted-code inventory; synchronization advances none of those gates.

## The honest zero

The historical Phase-1 record reports a corroborated corpus of **zero rows**
after the 2026-08-05 audit retired its only case. It records the serving
engine refusing to start (`CorpusUnavailableError`) rather than falling
back to demonstration data when no valid corpus is present.

This review did not run the engine or remeasure a serving corpus. The
historical zero remains a recorded baseline, not a fresh runtime observation.
Neither synchronization nor this documentation review establishes a later
corroborated corpus, a detection, or measured lead time. Fail-closed serving
and the two-independent-origin floor remain unchanged requirements.

## Method

What distinguishes this project is what it refuses to do:

- **Two-independent-origin floor.** No case receives numeric scores
  unless at least two *independent origins* corroborate it —
  `MIN_SOURCES_FOR_SCORES = 2`, counting distinct canonical
  `origin_id` values, never raw source rows. Same-lineage records
  collapse to one origin; duplicating a source cannot manufacture a
  second one. (`server/scoringEngine.js`, `countIndependentOrigins`.)
- **Per-source admission review.** Rows pass an admission contract
  before they can count: shape-validated, unique ids, canonical origin
  identity. Unresolved-origin rows are retained as non-counting
  support; annotations can never corroborate; malformed candidates
  admit nothing. (`server/admissionContract.js`.)
- **WITHHELD is a first-class state.** Below the floor, the surface
  shows suppression explicitly rather than a partial score.
- **Fail-closed serving.** A missing or invalid corpus stops the
  engine. Demonstration data is served only under an explicit demo
  switch and only when every row carries synthetic/DESIGN provenance;
  no code path serves a demo row as real. (`server/corpusLoader.js`.)
- **Permanent owner-layer fence.** Network-side signals — BGP, CT,
  DNS, WHOIS/RDAP, ASN, peering — are owner-layer corroboration only
  and are *permanently* ineligible for the floor. This is not pending
  a better pivot; it is a fence. (`server/admissionContract.js`,
  `NON_COUNTING_SOURCE_TYPES`.)
- **Named-dataset demotion.** The Epoch AI dataset is barred in code
  from the floor, from every score axis, and from score metadata;
  it is displayable support only, pending its own admission review.

## Subsystem register

Except for the DART correction below, this retains the historical Phase-1
inventory; its runtime descriptions were not revalidated in this review.

Five registers, held apart deliberately: **implemented** (code exists) ·
**connected** (reaches an external source) · **admitted** (its rows pass
admission) · **floor-eligible** (its rows can count toward corroboration) ·
**producing rows** (recorded contribution to the corpus).

| Subsystem | Implemented | Connected | Admitted | Floor-eligible | Producing rows |
| --- | --- | --- | --- | --- | --- |
| Scoring engine + origin floor | yes | n/a | n/a | enforces the floor | serves nothing — fails closed, zero-row corpus |
| Corpus loader / serving engine | yes | file-backed only | n/a | n/a | refuses to start; no rows served |
| Admission contract | yes | n/a | gatekeeper | gatekeeper | no |
| WWW/WARN pipeline (RETIRED) | yes — manual accept step | manual runs only, none since retirement | its one artifact was retired 2026-08-05 | n/a — retired | **no — zero rows** |
| Epoch AI confirm feed | yes | ingest artifact present | support-only, by code | **never** | no — barred from the floor in code |
| BGP monitoring (RIPE RIS Live) | yes | yes — live WebSocket | owner-layer support only | **never** | no corpus rows |
| Certificate transparency (crt.sh) | yes | on-demand queries | owner-layer support only | **never** | no corpus rows |
| NYISO interconnection-queue adapter | yes — fixture-tested | **no — unwired, never run against live data** | n/a | n/a | no |
| DART local evidence pipeline | parser, identity, clocks, lineage, CandidatePacket and tests exist | supplied local inputs; no live external connection established | per-packet admission checks exist; this review grants no live-source admission | one bounded DART facility origin after required checks; two independent origins required for corroboration | serving-corpus contribution not established; packet construction only |
| Other official-record adapters beyond DART (DEC/SEQR, municipal planning, IDA, DPS/PSC) | **absent** | no | n/a | n/a | no |
| Federal adapter skeletons (EPA, SAM.gov, USAspending, CourtListener, DOL OFLC, FERC) | stubs or deferred markers only | no | n/a | n/a | no |
| React console (Vite UI) | yes | consumes the engine | n/a | n/a | displays WITHHELD/fail-closed states |

`server/dart/candidatePacket.js` calls the existing admission/scoring gate
and constructs `WITHHELD_ONE_ORIGIN`, with one origin of two required,
`score = null`, and `corroborated = false`. This local code connection does
not establish live ingest, serving-corpus production, or a DART API/UI path.
T06 acceptance explicitly excludes T07/API/UI and live-source admission.

## What the early-warning language means — and does not

Design documents in this repository (`docs/EARLY_WARNING.md`, the spike
evidence units under `spike_evidence_units/`) describe the public trail
that large buildouts leave in compelled-disclosure records, and a
structural 12–36 month window between those filings and public
visibility. That is design prose about source classes, **not
measurement**. No pre-public detection has been demonstrated by this
instrument, and no measured lead-time figure exists in or is claimed by
this repository.

## Legacy documentation

Most root-level `.md` files predate the current method and describe an
earlier demo-dashboard product. They do not describe the current
product. Their disposition is a separate decision; until then,
`ARCHITECTURE.md`, this file, and the code itself are the record of
the current method.

## Licensing

Code: AGPL-3.0-only (see `LICENSE`; Copyright (C) 2026 Daniel Buk).
Data and method documentation: CC BY 4.0.

## Check review identity

In the selected checkout, compare these read-only results with the active
task's expected root, branch, commit, and status. Report a mismatch; this
snapshot is not an instruction to switch branches or move a checkout.

```
git rev-parse --show-toplevel
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
git --no-optional-locks status --short
```

License integrity:

```
tail -c 34523 LICENSE | shasum -a 256
# expected: 0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0
```

Historical fail-closed example (no demo switch set; not rerun for this review;
execution requires separate active-task authorization):

```
node server/index.js
# expected: CorpusUnavailableError — "Live corpus unavailable … Failing
# closed: seed/demo rows are never served as real." — exit code 1
```
