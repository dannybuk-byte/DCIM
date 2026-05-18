# Contributing

This document describes how to contribute to the WWW disclosure-observability project. Before contributing, please skim [`README.md`](./README.md) for project orientation and [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the layer/output structure your contribution will fit into.

## Who we are looking for

The project benefits most from contributions by:

- Engineers experienced with regulatory-data ingestion pipelines (federal and state disclosure regimes).
- Network-observability practitioners familiar with BGP routing, certificate transparency, and adjacent public network signals.
- Frontend engineers comfortable with React/Vite and willing to work on review-surface UX where epistemic clarity is the primary design constraint.
- Public-interest technologists interested in audit-oriented infrastructure for disclosure-asymmetry detection.
- Labor and infrastructure researchers who can co-design ingestion targets and review-layer thresholds.

Contributions from outside these areas are welcome but may have a steeper context ramp. Reading the architecture document and skimming an existing case-card emission before opening an issue is encouraged.

## Active work areas

Three areas have the largest currently-open contribution surface:

**Federal-layer ingestion**

The federal layer (BLS, NLRB, FERC) is charter-drafted and execution-pending. This is a well-scoped track suitable for a contributor who wants to work on a defined ingestion target end-to-end: source acquisition, parsing, schema mapping, integration with the existing pipeline orchestrator (`scripts/run_www_pipeline.sh`), and validation against the DME's consumer contract.

⟨Linked issues pending creation: `help-wanted:federal-bls-ingestion`, `help-wanted:federal-nlrb-ingestion`, `help-wanted:federal-ferc-ingestion`⟩

**OCP disclosure crosswalk**

Maps OCP and adjacent infrastructure taxonomies (L4) onto L3 disclosure language, enabling cross-referencing of operator commitments against open-infrastructure framings. Partial specification exists; contributor surface is moderate and benefits from prior familiarity with OCP/iMasons material.

⟨Linked issue pending creation: `help-wanted:ocp-crosswalk-extension`⟩

**Review-surface UX**

The Vite UI exposes the case review surface. The bounded-claims demonstration mechanic — visible signal suppression below the source threshold — is the load-bearing design pattern, and the review surface should make this discipline legible to reviewers rather than hide it behind polished defaults. Frontend contributors who want to work on epistemic-clarity-first design surface have substantial latitude here.

⟨Linked issue pending creation: `good-first-task:review-surface-suppression-affordances`⟩

Additional areas with smaller open surface:

- Entity resolution across disclosure sources (active development; coordinate with maintainers before contributing).
- Documentation improvements (always welcome; please read `ARCHITECTURE.md` first to ensure vocabulary consistency).
- Pre-commit gate extensions (the existing six-stage gate is in `.husky/` or equivalent — see existing checks before proposing additions).

## How to contribute

1. **Read the architecture document.** Most architectural confusion downstream traces to skipping this step.
2. **Open or comment on an issue first.** Substantial contributions should be discussed before implementation. This is not gatekeeping — it is coordination, particularly given the active-development branches.
3. **Branch from `stabilization/2026-05`** unless a maintainer directs you elsewhere.
4. **Run the pre-commit gate locally** before submitting. The gate enforces several constraints (localStorage prohibition, Tailwind constraints, large-file blocks, console.log absence, TODO/FIXME absence, useEffect discipline) and rejecting at submission is faster than rejecting at review.
5. **Open a pull request against `stabilization/2026-05`.** Include a clear description of which layer / output / subsystem your change affects and, where applicable, what evidentiary discipline it preserves or extends.

## Review discipline

Contributions are reviewed against the methodological standard the project operates under. Three review patterns worth knowing about:

**Bounded-claims discipline.** Code that produces inferences must respect minimum-source thresholds and other capability boundaries documented in `ARCHITECTURE.md`. A pull request that quietly weakens visible suppression to "make the UI feel less empty" will be rejected.

**Particulars warrant.** Code that ingests or emits particulars (names, dates, amounts, attributions) must preserve source attribution through the pipeline. Records that lose provenance are records that cannot be reviewed; this is a structural rather than stylistic concern.

**L2 disambiguation.** Contributions to the operational-signals layer should be clear about whether they target network-side telemetry (Class A, currently operational) or operator-permissioned compliance dashboards (Class B, not currently relied upon). Conflating these classes is a substantive architectural error, not a documentation issue.

## Communication

⟨Communication channel: pending decision — Matrix room, Discord server, mailing list, or GitHub Discussions. Issue tracker is the default channel until a decision is made.⟩

For sensitive matters (security findings, governance questions, conflicts of interest with disclosure subjects), please coordinate directly with maintainers rather than through public channels.

## Code of conduct

⟨`CODE_OF_CONDUCT.md` pending — Contributor Covenant v2.1 is the default candidate.⟩

By contributing you agree to abide by the code of conduct once published.

## License

⟨`LICENSE` pending deliberate choice. Contribution under the eventual license will be assumed; if you need certainty before contributing, please wait for the license decision or coordinate with maintainers.⟩

## Acknowledgement

Contributors will be acknowledged in repository documentation unless they request otherwise. The project is associated with **What We Will (WWW)**, a Bronx-based worker advocacy organization; contributions support WWW's public-interest labor-policy work.

---

⟨Document version: v1 draft, ⟨publication date pending⟩. Subject to revision as contributor patterns develop.⟩
