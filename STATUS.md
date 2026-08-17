# STATUS — current state and method

This file is the repository's authoritative statement of what runs
today, what does not, and the method that governs the difference.
`ARCHITECTURE.md` attests its subsystem status against the frozen
review commit named here.

**Frozen review commit:** the tip of `remediate/rulings-2026-08-05` — verify
with `git rev-parse HEAD` (see "Verify this yourself"). A commit cannot embed
its own hash, so no literal is written here; match the printed hash against the
review cover note accompanying this repository. Freeze baseline (this revision's
parent): `334040aa0e12bca5aead7e52630480570542b32a`.
**Reviewer-facing branch:** `remediate/rulings-2026-08-05`

## The honest zero

The corroborated corpus holds **zero rows**, and the serving engine
**refuses to start** rather than serve unproven data. This is the
design working, not a failure of it: a manual audit on 2026-08-05
retired the corpus's only case, and with no valid corpus present the
engine fails closed (`CorpusUnavailableError`) instead of falling back
to demonstration data. Nothing this instrument currently serves, and
nothing in this repository, claims a detection. The instrument detects
nothing today.

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

Five registers, held apart deliberately: **implemented** (code exists) ·
**connected** (reaches an external source) · **admitted** (its rows pass
admission) · **floor-eligible** (its rows can count toward corroboration) ·
**producing rows** (contributes corpus rows today).

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
| Other official-record adapters (DEC/SEQR, municipal planning, IDA, DPS/PSC) | **absent** | no | n/a | n/a | no |
| Federal adapter skeletons (EPA, SAM.gov, USAspending, CourtListener, DOL OFLC, FERC) | stubs or deferred markers only | no | n/a | n/a | no |
| React console (Vite UI) | yes | consumes the engine | n/a | n/a | displays WITHHELD/fail-closed states |

No New York official-record adapter is connected to the scoring path.
The one that exists (NYISO) is implemented and fixture-tested but
unwired. Nothing in this table is softened by intention: a subsystem
that could run but is not wired is recorded as not connected.

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

## Verify this yourself

```
git clone https://github.com/dannybuk-byte/DCIM.git
cd DCIM
git checkout remediate/rulings-2026-08-05
git rev-parse HEAD          # prints this frozen review commit — match it against the review cover note
```

License integrity:

```
tail -c 34523 LICENSE | shasum -a 256
# expected: 0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0
```

Fail-closed behaviour (no demo switch set):

```
node server/index.js
# expected: CorpusUnavailableError — "Live corpus unavailable … Failing
# closed: seed/demo rows are never served as real." — exit code 1
```
