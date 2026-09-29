# Contributing to Data Center Docket

> **Scope note · 29 September 2026:** This guide began with the earlier WWW disclosure-observability design. The work areas below are historical proposals, not open assignments or source-admission authority. For the present Docket direction and tested state, read [`README.md`](./README.md), [`STATUS.md`](./STATUS.md), [`AGENTS.md`](./AGENTS.md), and the [DART specification](./specs/dart-v0.9/spec.md). [`ARCHITECTURE.md`](./ARCHITECTURE.md) explains the earlier four-layer design.

Contributions should help a reviewer trace a public claim to its original record, test where the evidence stops, or make the result easier for workers and communities to challenge. A proposed adapter, inference, or audience view still needs the project's separate admission, eligibility, and publication decisions.

## Who we are looking for

The project benefits most from contributions by:

- Engineers experienced with public-record ingestion, source versioning, entity/site/phase matching, and provenance.
- Network-observability practitioners who can use BGP, DNS and related public clues as research leads without treating them as facility confirmation.
- Frontend engineers comfortable with React/Vite and willing to work on review-surface UX where epistemic clarity is the primary design constraint.
- Public-interest technologists interested in audit-oriented infrastructure for disclosure-asymmetry detection.
- Workers, community reviewers, and labor and infrastructure researchers who can define the decision a case must actually inform.

Contributions from outside these areas are welcome. Start with one bounded question, the original record needed to answer it, and an adverse case that could change the answer.

## Earlier proposed work areas

The following ideas were recorded for the earlier WWW design. Their issue names below are placeholders; verify current priorities and authorization with maintainers before starting work.

**Federal-layer ingestion**

The earlier plan proposed federal BLS, NLRB and FERC ingestion through `scripts/run_www_pipeline.sh` and the disclosure-monitoring engine. That proposal is not a current source-admission decision or a ready contributor task.

⟨Linked issues pending creation: `help-wanted:federal-bls-ingestion`, `help-wanted:federal-nlrb-ingestion`, `help-wanted:federal-ferc-ingestion`⟩

**OCP disclosure crosswalk**

The earlier design proposed mapping OCP and related infrastructure taxonomies to disclosure language. A new crosswalk would need a defined question, source rights, review authority and a small test before implementation.

⟨Linked issue pending creation: `help-wanted:ocp-crosswalk-extension`⟩

**Review-surface UX**

The earlier UI work emphasized visible suppression when a claim lacks enough independent evidence. That remains a useful design constraint. A new interface task must identify the active data path and reviewer, and must not show a proposed or synthetic case as a live finding.

⟨Linked issue pending creation: `good-first-task:review-surface-suppression-affordances`⟩

Other earlier ideas whose current status needs checking:

- Entity resolution across disclosures and project records.
- Documentation that makes source, uncertainty and corrections easier to understand.
- Check improvements after inspecting the active workflows and specifications.

## How to contribute

1. **Read the current records.** Start with the README, STATUS, AGENTS and the specification for the part you propose to change.
2. **Open or comment on an issue first.** Name the user question, source or fixture, claim boundary, reviewer and smallest useful result. Do not post protected records or personal contact details.
3. **Check the current default and designated work branch.** At this review the default branch is `agent/dart-v0.9`; verify it before branching because repository roles and gates can change.
4. **Run the checks required for your scoped change.** Use the active workflow and specification rather than an older checklist; report what ran and what remains unverified.
5. **Open a pull request against the currently designated base branch.** At this review that is `agent/dart-v0.9`. Describe the evidence and claim boundary affected, the tests, and any source or permission still pending.

## Review discipline

Contributions are reviewed against the methodological standard the project operates under. Three review patterns worth knowing about:

**Bounded claims.** Code that produces facility inferences must preserve the independent-official-act rule and visible withholding described in `AGENTS.md`, `STATUS.md`, and the applicable specification. A clearer interface cannot turn an unsupported lead into a finding.

**Particulars warrant.** Code that ingests or emits particulars (names, dates, amounts, attributions) must preserve source attribution through the pipeline. Records that lose provenance are records that cannot be reviewed; this is a structural rather than stylistic concern.

**Separate evidence rights.** Public BGP, DNS, certificate and registration observations can guide research but cannot count toward facility confirmation. Operator flows, packet data and service traces need their own express authorization and controlled environment.

## Communication

Use GitHub issues for public proposals and questions. Ask maintainers for a private route before sharing protected records, security findings or private contact details.

For sensitive matters (security findings, governance questions, conflicts of interest with disclosure subjects), please coordinate directly with maintainers rather than through public channels.

## Code of conduct

A repository code of conduct has not yet been published. Treat collaborators respectfully and raise a conduct concern with maintainers through a private route.

## License

Repository code is licensed AGPL-3.0-only under [`LICENSE`](./LICENSE). [`STATUS.md`](./STATUS.md) records data and method documentation as CC BY 4.0. Confirm how a proposed data contribution may be used and redistributed before submitting it.

## Acknowledgement

Contributors will be acknowledged in repository documentation unless they request otherwise. The project is associated with **What We Will (WWW)**, a Bronx-based worker advocacy organization; contributions support WWW's public-interest labor-policy work.

---

Reconciled with the dated repository status on 29 September 2026. Verify branch and workflow instructions against the current repository before contributing.
