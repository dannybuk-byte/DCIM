# Phase 1.5 — Federal Facility Detection

Methodology infrastructure for the WWW / OS-DCIM verification substrate. This module enriches **L2** (operator-performance observability), supports **O2** (operator-performance verification), and may feed **O3** (skill-mix projection where taxonomy support exists). It is not a standalone product layer.

## Substrate placement (L1–L4 / O1–O3)

| Layer / output | Role of this module |
|----------------|---------------------|
| L2 | Primary target: interconnection queues, SEC facility sections, future federal corroboration |
| O2 | Bounded operational-continuity / facility-visibility signals; **no** telemetry → labor-adequacy inference |
| O3 | Optional input when OCP cross-walk exists (Block 4.5.1); confidence degradation required |
| L1, L3, O1 | Not modified by this module |

## Methodological constraints

- evidence ≠ synthesis  
- observability ≠ authorization  
- prediction ≠ finding  
- telemetry ≠ workforce adequacy proof  
- federal visibility ≠ authoritative reality layer  

Outputs are confidence-scored signals. The code must **not** emit coalition-action recommendations—only whether confidence gates allow downstream methodological use (`downstream_action_allowed`).

## Adapter status

| Adapter | Status | Notes |
|---------|--------|-------|
| SEC EDGAR | **implement now** | `sec_facility_extract.py` + `adapters/sec_edgar.py`; separate from AI-rhetoric MD&A path |
| PJM | **implement now** | Data Miner 2 / `PJM_API_KEY`; fixture-driven tests |
| NYISO | **implement now** | XLSX ingest; URL discovery from interconnections page |
| EPA | typed placeholder | Federal/state porosity flag in module docstring |
| CourtListener | typed placeholder | Corroboration-only |
| USAspending | typed placeholder | Subset coverage (federal contracts) |
| SAM.gov | typed placeholder | Optional `SAM_GOV_API_KEY` |
| DOL OFLC | typed placeholder | H-1B LCA work-site signal |
| FERC eLibrary | **deferred** | Stub only |
| FERC Form 715 | **deferred** | Stub only |

## Verified upstream URLs (2026-05-17)

- SEC data APIs: https://data.sec.gov/ (User-Agent required; see `SEC_UA` in `scripts/_www_pipeline_lib.py`)
- SEC API docs: https://www.sec.gov/search-filings/edgar-application-programming-interfaces
- PJM Data Miner 2: https://dataminer2.pjm.com/
- PJM API Portal: https://apiportal.pjm.com/
- NYISO interconnections page: https://www.nyiso.com/interconnections  
- Example XLSX path (may drift): https://www.nyiso.com/documents/20142/1407078/NYISO-Interconnection-Queue.xlsx
- gridstatus (optional fallback): https://opensource.gridstatus.io/

## Schemas

### QueueRecord (`scripts/federal_facility_detection/models.py`)

Common fields: `queue_id`, `iso`, `project_name`, `developer_name`, `developer_name_normalized`, `queue_type`, `capacity_mw`, `proposed_in_service_date`, `status`, `status_normalized`, `location_raw`, `location_normalized`, `fetched_at`, `source_url`, `signal_class`.

### FacilityDetectionSignal

Required confidence and governance fields: `confidence_level`, `confidence_rationale`, `warrant_tags` (canonical enum), `pending_verification`, `escalation_required`, `manual_review_required`, `downstream_action_allowed`, `coalition_action_unsupported`, `inference_chain_position`, etc.

### Warrant tags (canonical — do not modify)

`DESCRIPTIVE`, `STRUCTURAL`, `PREDICTIVE`, `CAUSAL_IDENTIFIED`, `ABDUCTIVE`, `STIPULATED`, `DESCRIPTIVE_SELF_REPORT`, `SYNTHESIS`, `OPEN_UNSETTLED`

## Confidence rules

- **Generation queues** are corroborative-only unless operator-resolved and explicitly typed as large load; `downstream_action_allowed` defaults to `false`.
- **Geography** from federal sources alone is capped at **MSA** unless state normalization succeeds.
- **Sub-MSA** facility claims require state/local escalation (`escalation_required`).
- **Single-source** rows must not imply “facility is being built.”

## ISO/RTO queue distinction (load-bearing)

Public ISO/RTO queues are primarily **generation** interconnection. Data centers are usually **large load** at host utilities under state PUC oversight. Queue signals are bounded corroboration; state-layer escalation is flagged when direct large-load visibility is required.

## Transformation lineage

Append-only per-`signal_id` JSONL under `{out_dir}/lineage/` via `LineageLog`.

## Consumer contract: signals.jsonl semantics

`www_pipeline_out/federal_facility_detection/signals.jsonl` is an **append-only event log**, not a current-state snapshot. Each line is a `FacilityDetectionSignal` record carrying its own `signal_id`, `fetched_at` timestamp, and lineage metadata via the lineage log.

**Consumer responsibilities.**

- Consumers must not assume the file represents a single execution run, a current-state snapshot, or a definitive "active signals" set.
- Consumers are responsible for defining their own run/window/filter semantics using signal metadata: `signal_id` for deduplication, `fetched_at` for temporal windowing, lineage fields for source-context reconstruction.
- Consumers integrating across multiple executions (e.g., cohort assembly, probabilistic aggregation, UI surfaces) must implement explicit run-boundary handling appropriate to their use case.

**Reasoning.**

Event-log semantics preserve lineage, replayability, and auditability. State-snapshot semantics would require destructive operations on the producer that reduce traceability for downstream methodological-discipline workflows. The append-only design is intentional and methodologically load-bearing.

**Reopening conditions.**

The producer's append-only model may be reconsidered if any of the following surface during downstream development:

- Downstream consumers unable to distinguish operational runs even with explicit consumer-side filtering.
- Queue inflation from stale signal reuse where downstream filtering is structurally unable to identify staleness.
- DME or UI ambiguity around "current" vs "historical" signal state that consumer-side filtering cannot resolve.
- B.2 (Block 4.5 cohort assembly with Splink integration) aggregation logic requiring deterministic run segmentation not derivable from existing signal metadata.

If any of these conditions surface, the producer may add explicit run-boundary metadata (e.g., `run_id` per signal, run manifest file), rotation/truncation logic, or other producer-side semantic refinements — at that point becoming a charter amendment rather than a documentation clarification.

## Block 4.5.0 / 4.5.1 integration

- **Block 4.5.0** (`entity_resolution.json`): consumed by `entity_resolution.py` when present; missing file is tolerated.
- **Block 4.5.1** (OCP disclosure cross-walk): referenced only; not duplicated here.

Charter markdown files may not yet exist in-repo; paths are conventions for teammate delivery.

## Failure boundaries

- Invalid warrant tags → validation error at model boundary  
- Missing `entity_resolution.json` → unresolved operators; no fuzzy auto-merge  
- Live SEC/queue failures → empty or partial sink; no fabricated particulars  
- Placeholder adapters → `NotImplementedError` if invoked  

## Known limitations

- PJM live API field names may differ from fixture mapping; verify against Data Miner 2 schema before production pulls.
- NYISO XLSX column headers change; parser uses lowercase header matching.
- No FERC Tier-1 sources in initial drop.
- EPA and other placeholders have no fetch logic.

## No-fabricated-particulars rule

Synthetic names, CIKs, and queue IDs belong only under `scripts/federal_facility_detection/tests/fixtures/`.

## Detection methodology vs findings

This module produces **signals** with confidence metadata. It does not adjudicate compliance, authorize coalition action, or emit findings.

## Run locally

```bash
pip install -r requirements-federal-facility-detection.txt
python3 scripts/run_federal_facility_detection.py \
  --pjm-fixture scripts/federal_facility_detection/tests/fixtures/pjm_queue_row.json \
  --nyiso-xlsx /path/to/NYISO-Interconnection-Queue.xlsx \
  --sec-cik 0000999999 \
  --sec-operator "ACME Compute Holdings LLC" \
  --sec-html scripts/federal_facility_detection/tests/fixtures/sec_filing_snippet.html
```

Unit tests (fixtures only):

```bash
python3 -m unittest discover -s scripts/federal_facility_detection/tests -p 'test_*.py'
```
