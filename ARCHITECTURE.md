# Architecture

This document describes the architecture of the WWW disclosure-observability project. It expands on the compact summary in [`README.md`](./README.md) and is the canonical reference for the four-layer data architecture, the three analytical outputs, and the review layer that sits between them.

## Contents

- [Architectural overview](#architectural-overview)
- [L1 — Workforce-side records](#l1--workforce-side-records)
- [L2 — Operational signals](#l2--operational-signals)
- [L3 — Contractual commitments](#l3--contractual-commitments)
- [L4 — Infrastructure taxonomies](#l4--infrastructure-taxonomies)
- [Analytical outputs (O1–O3)](#analytical-outputs-o1o3)
- [The review layer](#the-review-layer)
- [Capability boundaries](#capability-boundaries)
- [Subsystem status](#subsystem-status)
- [Open architectural questions](#open-architectural-questions)
- [Colophon](#colophon)

## Architectural overview

The substrate is structured as four independent **data layers** that feed three **analytical outputs** through a single **review layer**. The review layer enforces minimum-source thresholds, applies bounded-claims discipline, and surfaces cases for human adjudication.

```
  L1  L2  L3  L4          (data layers — four independent ingestion classes)
   \  |   |  /
    \ |   | /
     review layer          (minimum-source thresholds, warrant enforcement)
    / |   | \
   /  |   |  \
  O1  O2  O3              (analytical outputs)
```

The layers are *independent* in the architectural sense: each can be operated, audited, and reasoned about on its own terms. They become evidentiarily linked only through the review layer, and only when minimum-source thresholds are met.

## L1 — Workforce-side records

L1 ingests publicly-filed workforce records and adjacent regulatory material.

**Current sources**

- New York WARN Act filings
- State-level WARN equivalents (target set under definition)
- Court filings, agency proceedings, and unemployment-insurance proceedings (manual ingestion currently; structured pipeline planned)

**Future targets**

- BLS public release ingestion
- NLRB case docket ingestion
- FERC workforce-relevant filings

L1's primary epistemic role is **establishing what employers have told workforce regulators.** It is mandatory-disclosure material — high source-hierarchy weight.

## L2 — Operational signals

L2 is the architectural layer most prone to mischaracterization and deserves the most care.

**Two distinct classes of signal**

L2 encompasses two operationally and epistemically different signal classes. Currently, only Class A is operational.

**Class A — Network-side telemetry (currently operational)**

Publicly-observable network signals: BGP routing announcements, certificate transparency log entries, public DNS records, and adjacent network-side observables. These signals are produced as a byproduct of normal internet operation and do not require operator cooperation or data-sharing agreements.

Implementation lives in `src/network/`, with BGP monitoring and certificate-transparency ingestion as the initial telemetry sources.

**Class B — Operator-permissioned compliance dashboards (future class, not currently relied upon)**

DCIM-style telemetry exposed by infrastructure operators through permissioned access. This class would surface operational details about facility configuration, equipment lifecycle, and adjacent observability, but only with operator cooperation.

**The project does not currently depend on this class.** It is named here for architectural completeness and because the repository's name reflects an earlier framing in which this was assumed to be the primary L2 input. The current operational architecture is network-side.

This disambiguation matters because the two classes have fundamentally different access properties, inference properties, and trust relationships. Conflating them — including by allowing readers to assume the project depends on operator data-sharing it does not have — would misrepresent the substrate.

## L3 — Contractual commitments

L3 ingests employer-facing-investor disclosures and adjacent contractual material.

**Current sources**

- SEC 10-K filings (annual reports)
- SEC 10-Q filings (quarterly reports)
- 8-K material event disclosures
- Earnings call transcripts (ingestion partial)

**Future targets**

- Procurement disclosures
- Public contract awards
- Investor-facing communications beyond SEC filings (subject to source-hierarchy weighting)

L3's epistemic role is **establishing what employers have told investors and contractual counterparties.** Like L1, it is mandatory-disclosure material — high source-hierarchy weight.

The WARN/SEC contradiction surfaced by O1 is the contrast between an L1 claim (the WARN-form cause field) and an L3 claim (the SEC narrative). Both sides of the contradiction are anchored in mandatory disclosures.

## L4 — Infrastructure taxonomies

L4 ingests open-infrastructure framing documents and adjacent taxonomic material.

**Current sources**

- Open Compute Project (OCP) documentation
- iMasons frameworks
- Adjacent open-infrastructure consortium material

L4 is structurally different from L1–L3. It does not ingest disclosures *by employers*; it ingests *taxonomies that name what disclosures should be about.* It functions as a vocabulary layer that supports the OCP disclosure crosswalk and configuration-to-skill-mix translation work.

L4's epistemic weight is lower than L1 or L3 — it is organizational framing rather than mandatory disclosure — but it carries meaningful structural weight in O2 and O3.

## Analytical outputs (O1–O3)

**O1 — Documentary contradiction detection**

Surfaces gaps between L1 and L3 disclosures by the same employer over comparable time windows. The WARN/SEC anchor is the first operational instance. Other contradiction classes (procurement vs workforce, ESG vs operational, climate disclosure asymmetries) are architecturally in scope but not currently operationalized.

**O2 — Operator performance verification**

Cross-references L2 operational signals against L3 contractual commitments. Used to assess whether operator-stated performance matches network-side observables. Not used for workforce-adequacy or compliance-outcome claims.

**O3 — Skill-mix demand projection**

Uses L4 taxonomies and L3 commitments to project skill-mix demand for infrastructure work. Bounded to operator-attested binding constraints and observable plant-level effects; does not support strong claims about labor-market futures.

## The review layer

The review layer sits between data ingestion and case escalation. Its function is to enforce evidentiary thresholds before any contradiction is surfaced as a reviewable case.

**Minimum-source thresholds**

Cases require at least two independent sources before they enter the review surface with full scoring. Below threshold, the case is visibly suppressed — the UI displays "Insufficient sources — signal withheld" rather than a partial score. This is a deliberate design choice: the bounded-claims discipline treats visible suppression as more honest than imputed scoring.

The threshold is configurable (`MIN_SOURCES_FOR_SCORES` in the scoring engine). A single-source entry — for example, a Goldman Sachs case with only an L3 disclosure and no L1 corroboration — triggers suppression by design.

**Warrant enforcement**

Particulars within a case — employer names, filing dates, amounts, locations, attributions — must carry source warrant before they enter the case record. The review surface presents particulars alongside their source attribution, and the case-card emission process refuses to ship records with unwarranted particulars.

**Human review**

The substrate produces reviewable cases, not findings. Cases are routed to human reviewers (researchers, advocates, journalists, regulators) who decide what the surfaced contradictions mean. The review layer's job is to make sure what is surfaced is structurally sound; what it *means* is downstream.

## Capability boundaries

The architecture supports the following claim classes:

- **Documentary contradiction detection** between mandatory-disclosure regimes by the same employer.
- **Operator performance verification** against L3 commitments using L2 network-side signals.
- **Skill-mix demand projection** bounded to operator-attested constraints and observable plant-level effects.

The architecture does **not** support:

- Causal claims about AI and aggregate labor displacement.
- Predictive models of layoff timing or magnitude.
- Workforce-adequacy or labor-sufficiency claims from L2 signals alone.
- Compliance-outcome adjudication. (The substrate surfaces; it does not adjudicate.)
- Behavioral inferences about employer intent from L1/L3 contradiction alone. (Contradictions may have non-adversarial explanations; the substrate makes them visible, not motive-attributable.)

These boundaries follow from the architecture, not from stylistic preference. They may evolve as the architecture evolves; they should not be relaxed for rhetorical convenience.

## Subsystem status

⟨Subsystem status reflects repository snapshot at commit ⟨pending⟩ on `stabilization/2026-05`, ⟨snapshot date pending⟩. Active development drifts; treat this section as time-attested rather than current.⟩

| Subsystem | Status | Location |
| --- | --- | --- |
| WARN ingestion (NY) | Operational | `scripts/` |
| 10-K / 10-Q ingestion | Operational | `scripts/extract_10k_sections.py` |
| Case-card emission | Operational | `scripts/emit_case_cards.py` |
| Pipeline summarization | Operational | `scripts/www_pipeline_summarize.py` |
| Disclosure-monitoring engine (DME) | Operational | `server/` |
| Vite UI (case review surface) | Operational | port 5173 |
| BGP monitoring | Operational | `src/network/` |
| Certificate transparency ingestion | Operational | `src/network/` |
| Scoring engine | Operational | `scoringEngine.js` |
| Federal layer (FERC, BLS, NLRB) | Charter drafted, execution pending | — |
| Entity resolution | Active development | — |
| OCP disclosure crosswalk | Partial specification | — |
| Operator-permissioned DCIM (L2 Class B) | Not currently relied upon | — |

## Open architectural questions

Documented for collaborator visibility:

- **Working name** for the broader initiative versus the repository's legacy name. Currently using *the WWW disclosure-observability project* as transitional descriptor.
- **Analytical lens enumeration.** The substrate is intended to support multiple analytical lenses; the lens set is architecturally open and explicitly non-exhaustive. No public document should claim the lens set is fixed.
- **Federal layer charter** — drafted, execution pending. Sink design and consumer contract decisions ongoing.
- **Entity resolution strategy** at Block 4.5.0 scale — under active development.

## Colophon

- Document version: v1 draft, ⟨publication date pending⟩
- Repository snapshot: ⟨commit hash pending⟩ on `stabilization/2026-05`
- Methodological standard: Meta-Methodological Operating Standard v3.6
- Link verification status: ⟨pending behavioral attestation at publication⟩
