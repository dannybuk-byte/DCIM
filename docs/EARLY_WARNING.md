# Early-warning detection

> Catching new infrastructure builds at the moment of their first public signal, identifying who's behind them, and turning that early signal into workforce and labor-relations leverage.

## The problem

Data center operators and other large infrastructure projects leave a public trail months before they appear in workforce-development discussions. Power-grid interconnection requests get filed with ISOs and FERC. IP and ASN registrations show up in regional internet registries. Subdomains get registered. Certificate transparency logs accumulate entries for the future facility's domains. BGP announcements appear. Vendor partners get named in SEC filings, procurement records, and trade press.

Each signal is individually weak. Together, they form an early-warning system that fires *before* the facility is announced, before construction RFPs are public, and before workforce-development organizations can plan apprentice pipelines or coordinate union responses.

This project aims to be that early-warning system, with two specific downstream consumers built on top of it.

## What you'd be working on

Two feature tracks, both downstream of the same observability layer:

**1. Early-warning signal detection.** Ingestion and correlation across network, routing, certificate, and disclosure signals. See the *Current state* table below for what exists in the repo versus what's open contribution surface.

**2. Two downstream consumer surfaces** that turn detected signals into action:

- **Curriculum signaling.** Once vendor partners are identified, their stack determines the skill-mix the new facility will demand. That feeds curriculum development directly, or hands off to OCP Academy and union locals to prep apprentice pipelines in the relevant geography — *before* the facility opens.
- **CBA negotiation tooling.** Early-warning detection prompts CBA writers when a counterparty is about to need workforce. The build also includes longitudinal compliance records per counterparty across prior facilities, so CBA writers come to the table with documented track records rather than starting from zero.

## Current state

Status terms:

- **Prototype** = code exists in the repo; runtime/production readiness varies.
- **Planned** = scoped or discussed; no code yet.
- **Exploratory** = idea-level; not yet scoped.

| Signal | Status | What it detects |
| --- | --- | --- |
| Certificate transparency logs (`src/services/NetworkDiscoveryAPIs.ts`, `src/osint/DataSourceManager.ts`) | Prototype | Infra/domain emergence before announcement |
| BGP announcements (`src/network/BGPMonitor.ts`) | Prototype | Routing activation when networks come online |
| DNS / subdomain surfacing (`src/utils/dnsRecon.ts`) | Prototype | Organizational preparation |
| Power-grid interconnection queues — NYISO, PJM, FERC eLibrary, FERC Form 715 (`scripts/federal_facility_detection/`) | Prototype | Formal pre-build regulatory filings |
| SEC / disclosure cross-reference (`scripts/federal_facility_detection/adapters/sec_edgar.py`) | Prototype | Vendor partner identification from filings |
| Entity resolution pipeline (`scripts/entity_resolution/`) | Prototype | Cross-source entity matching (SEC, OpenCorporates, OCP, Wikidata, SAM, NY WARN) |
| RIR allocation history / ROA records | Planned | Allocation intent before infrastructure exists |
| Network peering / PeeringDB integration | Planned | Regional operator presence |
| Multi-signal correlation | Exploratory | Confidence aggregation across weak signals |
| Curriculum-signal output formatting | Planned | Structured handoff to OCP Academy / union locals |
| CBA tooling (counterparty timelines, compliance track-record) | Planned | CBA writer leverage interface |

A six-stage pre-commit gate runs in the repo to catch common safety-pattern violations (storage, dynamic class names, large files, console.log, TODO/FIXME, useEffect cleanup).

## How this fits in the larger architecture

Early-warning detection is the network-telemetry layer of a four-layer architecture documented in [`ARCHITECTURE.md`](../ARCHITECTURE.md). The first proving ground was a documentary-contradiction case at the workforce/investor disclosure layers: 162+ NY WARN Act notices since March 2025 (none citing AI) while the same employers told investors they were cutting headcount because of AI. That work built out L1/L3 ingestion now in the repo. The early-warning track extends the same correlation discipline to infrastructure formation.

Three invariants hold:

- **Human adjudication is central.** The system surfaces; humans decide.
- **Outputs are signals, not conclusions.** Below source thresholds, the signal is visibly suppressed.
- **Governance-latency reduction, not labor-judgment automation.** The goal is to give workforce-development and labor-relations actors earlier and better-grounded inputs — not to make workforce decisions for them.

## About the project

This is part of **What We Will (WWW)**, a Bronx-based worker advocacy organization. For full context on the project's framing, methodological discipline, and the L1/L3 documentary-contradiction work, see the main [`README.md`](../README.md) and [`ARCHITECTURE.md`](../ARCHITECTURE.md).

## What I'm looking for

A collaborator who finds the multi-signal correlation problem interesting and wants to build out the curriculum-signaling and CBA tooling that makes that correlation actually useful. Several signal ingestions exist in prototype form; the correlation logic and the downstream output surfaces are where the highest-leverage work remains. The downstream applications are concrete and have real users (union locals, OCP Academy, CBA writers) waiting for the inputs.
