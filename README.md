# WWW / OS-DCIM

> An observability layer for documentary contradiction — designed to surface disclosure asymmetries for human review rather than to adjudicate them.

## What this is

This repository is part of **the WWW disclosure-observability project**, which builds public-interest infrastructure for making a specific class of documentary contradiction observable: gaps between how employers describe workforce decisions to public regulators and how they describe them to investors.

The substrate ingests evidence from four independent data layers, routes it through a review pipeline, and surfaces contradictions for human adjudication. It does not produce findings. It produces reviewable cases.

This distinction is load-bearing. The substrate's job is to make documentary tension visible and traceable to primary sources. Researchers, advocates, journalists, and regulators decide what those tensions mean.

## Who this is for right now

This repository is operationally oriented toward:

- technical collaborators contributing to observability infrastructure
- labor and infrastructure researchers working with regulatory disclosures
- public-interest technologists building auditable verification tooling
- policy-adjacent reviewers interested in disclosure asymmetries

It is **not** turnkey software for end users, a finished dashboard for policymakers, or a production DCIM platform for infrastructure engineers. Several components are operational; others are stubbed, partial, or under active design. The "Current repository state" section below names which is which.

## What this is not

To preempt the most common misreadings:

- **Not a causal claim about AI and layoffs.** The anchor empirical observation is a *documentary contradiction*, not a causal finding.
- **Not a predictive model of labor displacement.**
- **Not a compliance product or enforcement tool.** It is a substrate that supports — but does not replace — formal regulatory review.
- **Not a mature production system.** Operational components coexist with stubbed and partial ones.
- **Not a neutral platform.** The project is explicitly oriented toward making employer disclosure asymmetries reviewable in the public interest.

## Why open

The substrate exists to make disclosure asymmetries reviewable, and reviewability requires inspectability. A closed verification platform asking the public to trust its outputs would reproduce the disclosure-asymmetry problem at a different layer.

Making the substrate open-source means the surfacing logic, threshold settings, attribution chains, and review-layer mechanics are themselves auditable. The methodological discipline applied to ingested disclosures applies, by extension, to the substrate itself.

## First empirical anchor

The substrate's first concrete instance is the WARN/SEC disclosure asymmetry.

Since March 2025, more than 162 New York WARN Act notices have been filed by employers planning workforce reductions. As of validation in March 2026, none cite artificial intelligence, automation, or related technology adoption as a cause. ⟨source: NY WARN database — URL pending verification at publication⟩

Over the same window, multiple employers among those filers attributed headcount reductions to AI deployment in SEC filings, earnings calls, and investor communications. ⟨source: Bloomberg Law validation, March 2026 — citation pending verification at publication⟩

This is not, on its own, evidence of regulatory evasion. WARN forms ask for specific categorical causes; AI-attributed reductions may be reported under restructuring, cost reduction, or workforce realignment categories without misrepresentation. The asymmetry between these two mandatory-disclosure regimes — one worker-facing, one investor-facing — is itself a documentary phenomenon worth making observable.

The underlying architecture is designed to surface multiple forms of regulator-vs-investor disclosure asymmetry. WARN/SEC is the first; other mismatches between mandatory-disclosure regimes are likely to follow.

## Architecture in brief

Four data layers feed three analytical outputs through a review layer.

**Data layers**

- **L1 — Workforce-side records:** WARN filings, regulatory notices, court records, agency proceedings.
- **L2 — Operational signals:** Publicly-observable network telemetry (BGP routing, certificate transparency logs, related observables) is the currently-operational class. Operator-permissioned compliance dashboards (DCIM-style) are a future class with different access and inference properties; the project does not currently rely on operator data-sharing.
- **L3 — Contractual commitments:** SEC filings, investor disclosures, procurement records, public contracts.
- **L4 — Infrastructure taxonomies:** OCP, iMasons, and adjacent open-infrastructure framing.

**Analytical outputs**

- **O1 — Documentary contradiction detection** (the WARN/SEC anchor lives here)
- **O2 — Operator performance verification**
- **O3 — Skill-mix demand projection**

The review layer enforces minimum-source thresholds before any case escalates. When evidence is insufficient, the system suppresses signal visibly rather than masking the limit — a design choice the bounded-claims discipline treats as more honest than imputed inference.

See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full layer breakdown, the L2 disambiguation in detail, and review-layer mechanics.

## Methodological posture

The project operates under a methodological standard documenting bounded-inference discipline at each layer. Three constraints worth naming up front:

- **L2 operational signals cannot independently support claims about workforce adequacy, labor sufficiency, or compliance outcomes.** They support operator-performance verification and configuration-to-skill-mix translation. No further.
- **Source hierarchy applies throughout.** Primary regulatory records and mandatory corporate disclosures outrank aggregators and press releases. Synthesis is analysis, not evidence.
- **Particulars require source warrant before entering a case record** — names, titles, dates, amounts, affiliations. Where evidence is insufficient, the system visibly withholds signal.

A forthcoming `METHODOLOGY.md` will document the full standard. Bounded-claims discipline applies throughout the codebase.

## Current repository state

Repository snapshot: ⟨commit hash: pending at publication⟩ on branch `stabilization/2026-05`, as of ⟨snapshot date: pending at publication⟩.

**Currently running**

- Python ingestion pipeline (`scripts/run_www_pipeline.sh`) chaining 10-K section extraction, candidate-list construction, case-card emission, and pipeline summarization.
- Node/Express disclosure-monitoring engine (DME) loading validated cases from the pipeline.
- Vite UI exposing the case review surface (port 5173) and DME (port 8787).
- Network-side telemetry ingestion in `src/network/` (BGP monitoring, certificate transparency logs).
- Pre-commit gate enforcing six checks including localStorage prohibition, Tailwind constraints, and large-file blocks.
- Bounded-claims demonstration mechanic: a configurable minimum-source threshold (`MIN_SOURCES_FOR_SCORES`) in the scoring engine that visibly suppresses single-source signals rather than masking the limit.

**Partial or stubbed**

- Federal layer ingestion (FERC, BLS, NLRB targets) — charter drafted, execution pending.
- Entity resolution across disclosure sources — active development.
- OCP disclosure crosswalk — partial specification.

## On the repository name

This repository's name reflects an earlier framing in which DCIM-style observability was assumed to be the project's primary input. The architecture has since clarified DCIM as one input class among four; the repository name has not yet been updated to reflect that scope. The working name for the broader initiative is *the WWW disclosure-observability project*.

## Relationship to WWW

This repository is part of ongoing infrastructure and research work associated with **What We Will (WWW)**, a Bronx-based worker advocacy organization. The project develops public-interest observability tooling in support of WWW's labor-policy work.

## Contributing

Active contributor entry points and currently-open issues are documented in [`CONTRIBUTING.md`](./CONTRIBUTING.md). The federal-layer ingestion track, the OCP disclosure crosswalk, and the review-surface UX are the largest currently-open contribution areas.

## License

⟨LICENSE: pending deliberate choice between permissive (MIT, Apache 2.0) and copyleft (AGPL). The choice carries meaning for a public-interest verification project and is not being made by default.⟩

## Pre-publication checklist

The following items are bracketed in this draft and must be resolved before public publication:

- [ ] License choice and `LICENSE` file
- [ ] `CODE_OF_CONDUCT.md` (Contributor Covenant or equivalent)
- [ ] Repository snapshot commit hash and snapshot date in colophon
- [ ] WARN database URL verification (web-fetch at publication)
- [ ] Bloomberg Law citation locator verification
- [ ] Three to five real, scoped issues created and labeled `help-wanted` / `good-first-task`
- [ ] WWW public-description language confirmed against WWW's own public-facing materials

## Colophon

- README version: v1 draft, ⟨publication date pending⟩
- Repository snapshot: ⟨commit hash pending⟩ on `stabilization/2026-05`
- Methodological standard: Meta-Methodological Operating Standard v3.6
- Link verification status: ⟨pending behavioral attestation at publication⟩
