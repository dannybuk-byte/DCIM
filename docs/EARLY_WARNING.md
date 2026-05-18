# Early-warning detection

> Catching new infrastructure builds at the moment of their first public signal, identifying who's behind them, and turning that early signal into workforce and labor-relations leverage.

## The problem

Data center operators and other large infrastructure projects leave a public trail months before they appear in workforce-development discussions. Power-grid interconnection requests get filed with ISOs and FERC. IP and ASN registrations show up in regional internet registries. Subdomains get registered. Certificate transparency logs accumulate entries for the future facility's domains. BGP announcements appear. Vendor partners get named in SEC filings, procurement records, and trade press.

Each signal is individually weak. Together, they form an early-warning system that fires *before* the facility is announced, before construction RFPs are public, and before workforce-development organizations can plan apprentice pipelines or coordinate union responses.

This project aims to be that early-warning system, with two specific downstream consumers built on top of it.

## What you'd be working on

Two feature tracks, both downstream of the same observability layer:

**1. Early-warning signal detection.** Ingestion and correlation across:

- Power-grid interconnection queues (NYISO, PJM, FERC) — earliest formal signal that a large facility is being planned
- BGP routing announcements
- Certificate transparency log entries
- Subdomain and DNS surfacing
- IP and ASN registration changes
- Peering interconnect formation
- Disclosure cross-reference (SEC filings, public contracts) for vendor identification

Each signal individually has a high false-positive rate; the leverage is in correlation across them. Some of these are already running (see below); others are obvious next-build surfaces.

**2. Two downstream consumer surfaces** that turn detected signals into action:

- **Curriculum signaling.** Once vendor partners are identified, their stack determines the skill-mix the new facility will demand. That feeds curriculum development directly, or hands off to OCP Academy and union locals to prep apprentice pipelines in the relevant geography — *before* the facility opens.
- **CBA negotiation tooling.** Early-warning detection prompts CBA writers when a counterparty is about to need workforce. The build also includes longitudinal compliance records per counterparty across prior facilities, so CBA writers come to the table with documented track records rather than starting from zero.

## How this fits in the larger architecture

Early-warning detection is the **L2 network telemetry layer** of a broader four-layer architecture documented in [`ARCHITECTURE.md`](../ARCHITECTURE.md). The other layers are workforce records (L1 — WARN filings, regulatory notices), investor disclosures (L3 — SEC 10-K, 10-Q, 8-K), and infrastructure taxonomies (L4 — OCP, iMasons).

The architecture's first proving ground was a documentary-contradiction case: 162+ NY WARN Act notices since March 2025 (none cite AI), while the same employers told investors they were cutting headcount because of AI. That work demonstrated the underlying premise — that disclosure asymmetries across mandatory-disclosure regimes are detectable, traceable to primary sources, and meaningful — and built out the L1/L3 ingestion infrastructure now in production.

The early-warning track generalizes the same observability logic *upstream* into infrastructure formation (before facilities exist) and *downstream* into workforce-coordination outputs (curriculum, CBA). The disclosure-asymmetry work and the early-warning work are complementary instances of the same architectural premise, not competing projects.

Three invariants hold across both tracks:

- **Human adjudication is central.** The system surfaces; humans decide.
- **Outputs are signals, not conclusions.** A weak signal is presented as weak. Below source thresholds, the signal is visibly suppressed.
- **Governance-latency reduction, not labor-judgment automation.** The goal is to give workforce-development and labor-relations actors earlier and better-grounded inputs — not to make workforce decisions for them.

## What's running now

In the early-warning layer:

- **Federal facility / interconnection queue ingestion** (`scripts/federal_facility_detection/`) — adapters for NYISO, PJM, FERC eLibrary, FERC Form 715, plus SEC EDGAR cross-reference. Queue normalization, confidence scoring, warrant-tagged outputs.
- **Entity resolution pipeline** (`scripts/entity_resolution/`) — resolver with multiple source adapters (SEC tickers, OpenCorporates, OCP, Wikidata, SAM, NY WARN), normalization, review queue for human adjudication, test fixtures.
- **BGP monitoring** (`src/network/BGPMonitor.ts`) — route announcement ingestion, integrated into multiple UI surfaces.
- **Certificate transparency ingestion** — distributed across `src/services/NetworkDiscoveryAPIs.ts`, `src/osint/DataSourceManager.ts`, expansion-tracking utilities.
- **DNS reconnaissance** (`src/utils/dnsRecon.ts`) and subdomain expansion tracking.
- Six-stage pre-commit gate covering safety patterns.

Open contribution surfaces (real engineering work, varying depth):

- **RIR / RPKI / ROA ingestion** — not yet built. RIR allocation history and Route Origin Authorization records are obvious upstream signals for new infrastructure intent; both are publicly queryable but ingestion code does not exist yet. Architecturally clean place to contribute.
- **Network peering and interconnect detection** — not yet built at the network layer. PeeringDB integration and BGP-session inference for detecting new operator presence would extend the existing BGP monitoring.
- **Multi-signal correlation logic** — partial. The individual signal ingestions exist; the correlation layer that says *"these three weak signals are pointing at the same forming facility"* is the highest-leverage engineering work and the most open.
- **Entity resolution extension** — sources, matching heuristics, and confidence scoring for the existing resolver pipeline. Concrete extension of a working module rather than greenfield.
- **Curriculum-signal output formatting** — not yet built. Once vendor identification fires, the output that goes to OCP Academy or union locals needs structured formatting.
- **CBA tooling** — not yet built. Counterparty timeline assembly and longitudinal compliance track-record interface for CBA writers.

## About the project

This is part of **What We Will (WWW)**, a Bronx-based worker advocacy organization. For full context on the project's framing, methodological discipline, and the L1/L3 documentary-contradiction work, see the main [`README.md`](../README.md) and [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## What I'm looking for

A collaborator who finds the multi-signal correlation problem interesting and wants to build out the curriculum-signaling and CBA tooling that makes that correlation actually useful. The infrastructure to ingest signals is substantially built; the correlation logic and the downstream output surfaces are where the highest-leverage work remains. The downstream applications are concrete and have real users (union locals, OCP Academy, CBA writers) waiting for the inputs.
