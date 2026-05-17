#!/usr/bin/env python3
"""
Run Phase 1.5 federal facility detection adapters and append signals to JSONL sink.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from federal_facility_detection.adapters.nyiso import NyisoQueueAdapter
from federal_facility_detection.adapters.pjm import PjmQueueAdapter
from federal_facility_detection.adapters.sec_edgar import SecEdgarFacilityAdapter
from federal_facility_detection.entity_resolution import load_entity_resolution, resolve_operator
from federal_facility_detection.lineage import LineageLog
from federal_facility_detection.signal_factory import queue_record_to_signal
from federal_facility_detection.sink import FacilityDetectionSink


def main() -> int:
    ap = argparse.ArgumentParser(description="Federal facility detection (L2 inputs)")
    ap.add_argument(
        "--out-dir",
        type=Path,
        default=Path("www_pipeline_out/federal_facility_detection"),
    )
    ap.add_argument(
        "--entity-resolution",
        type=Path,
        default=Path("www_pipeline_out/entity_resolution.json"),
    )
    ap.add_argument("--pjm-fixture", type=Path, default=None)
    ap.add_argument("--nyiso-xlsx", type=Path, default=None)
    ap.add_argument("--sec-cik", type=str, default="")
    ap.add_argument("--sec-operator", type=str, default="")
    ap.add_argument("--sec-html", type=Path, default=None)
    ap.add_argument("--skip-live-queues", action="store_true")
    args = ap.parse_args()

    sink = FacilityDetectionSink(args.out_dir)
    lineage = LineageLog(args.out_dir / "lineage")
    entity_index = load_entity_resolution(args.entity_resolution)

    summary: dict = {"signals_written": 0, "queues_processed": 0, "adapters": []}

    if args.pjm_fixture or not args.skip_live_queues:
        pjm = PjmQueueAdapter(fixture_path=args.pjm_fixture)
        records = pjm.fetch_queue_records()
        summary["queues_processed"] += len(records)
        summary["adapters"].append("PJM")
        for rec in records:
            resolved_name, firm_id, _ = resolve_operator(
                cik=None,
                operator_name_raw=rec.developer_name,
                entity_index=entity_index,
            )
            sig = queue_record_to_signal(
                rec,
                operator_name_resolved=resolved_name,
                operator_firm_id=firm_id,
            )
            sink.append(sig)
            lineage.append(sig.signal_id, "queue_normalized", {"iso": rec.iso}, rec.source_url)
            summary["signals_written"] += 1

    if args.nyiso_xlsx:
        nyiso = NyisoQueueAdapter(xlsx_path=args.nyiso_xlsx)
        records = nyiso.fetch_queue_records()
        summary["queues_processed"] += len(records)
        summary["adapters"].append("NYISO")
        for rec in records:
            resolved_name, firm_id, _ = resolve_operator(
                cik=None,
                operator_name_raw=rec.developer_name,
                entity_index=entity_index,
            )
            sig = queue_record_to_signal(rec, operator_name_resolved=resolved_name, operator_firm_id=firm_id)
            sink.append(sig)
            lineage.append(sig.signal_id, "queue_normalized", {"iso": rec.iso}, rec.source_url)
            summary["signals_written"] += 1

    if args.sec_cik and args.sec_operator:
        html = args.sec_html.read_text(encoding="utf-8") if args.sec_html else None
        sec = SecEdgarFacilityAdapter(
            cik=args.sec_cik,
            operator_name_raw=args.sec_operator,
            entity_resolution_path=args.entity_resolution,
            filing_html=html,
        )
        summary["adapters"].append("SEC")
        for sig in sec.produce_signals():
            sink.append(sig)
            lineage.append(sig.signal_id, "sec_facility_extract", {"source_family": "SEC"}, sig.source_url)
            summary["signals_written"] += 1

    summary_path = args.out_dir / "last_run_summary.json"
    summary_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
