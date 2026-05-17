#!/usr/bin/env python3
"""
Block 4.5.0 — build www_pipeline_out/entity_resolution.json
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from entity_resolution.candidates import LAYER_1_CANDIDATES
from entity_resolution.emit import write_outputs
from entity_resolution.resolver import (
    ResolutionContext,
    collect_review_items,
    resolve_candidate,
    resolve_layer2_warn_anchored,
)
from entity_resolution.review_queue import render_review_queue_markdown
from entity_resolution.sources.fixture_bundle import FixtureSourceBundle
from entity_resolution.sources.live_bundle import LiveSourceBundle


def main() -> int:
    ap = argparse.ArgumentParser(description="Block 4.5.0 entity resolution")
    ap.add_argument(
        "--out-json",
        type=Path,
        default=Path("www_pipeline_out/entity_resolution.json"),
    )
    ap.add_argument(
        "--out-review",
        type=Path,
        default=Path("www_pipeline_out/entity_resolution_review_queue.md"),
    )
    ap.add_argument(
        "--sec-tickers",
        type=Path,
        default=Path("data/cache/company_tickers.json"),
    )
    ap.add_argument(
        "--warn-data",
        type=Path,
        default=Path("scripts/sample_data/ny_warn_sample.csv"),
    )
    ap.add_argument(
        "--fixtures-dir",
        type=Path,
        default=None,
        help="Use fixture source bundle only (no live APIs)",
    )
    ap.add_argument(
        "--live",
        action="store_true",
        help="Hit live Wikidata/SAM/OCP/OpenCorporates APIs (SEC from local tickers file)",
    )
    ap.add_argument(
        "--layer1-only",
        action="store_true",
        help="Skip Layer 2 WARN-anchored candidates",
    )
    args = ap.parse_args()

    if args.fixtures_dir:
        sources = FixtureSourceBundle(args.fixtures_dir)
        candidates = _fixture_candidates(args.fixtures_dir)
    elif args.live:
        if not args.sec_tickers.is_file():
            print(f"Missing SEC tickers: {args.sec_tickers}", file=sys.stderr)
            return 1
        warn_path = args.warn_data if args.warn_data.is_file() else None
        sources = LiveSourceBundle(
            sec_tickers_path=args.sec_tickers,
            warn_data_path=warn_path,
        )
        candidates = list(LAYER_1_CANDIDATES)
    else:
        print("Specify --live or --fixtures-dir", file=sys.stderr)
        return 1

    ctx = ResolutionContext()
    entities = []
    for cand in candidates:
        entities.extend(resolve_candidate(cand, sources, ctx))

    if not args.layer1_only and not args.fixtures_dir:
        layer2_emps = sources.all_warn_employers()
        entities.extend(resolve_layer2_warn_anchored(layer2_emps, sources, ctx))

    review_items = collect_review_items(entities)
    md = render_review_queue_markdown(entities=entities, items=review_items)
    doc = write_outputs(
        out_json=args.out_json,
        out_review_md=args.out_review,
        entities=entities,
        review_markdown=md,
    )
    summary = {
        "entities": len(doc.entities),
        "firms_shim": len(doc.firms),
        "review_items": len(review_items),
        "out_json": str(args.out_json),
    }
    print(json.dumps(summary, indent=2))
    return 0


def _fixture_candidates(fixtures_dir: Path) -> list:
    """Synthetic candidates mapped in fixture JSON files."""
    from entity_resolution.candidates import Layer1Candidate

    manifest = fixtures_dir / "candidates.json"
    if manifest.is_file():
        names = json.loads(manifest.read_text(encoding="utf-8"))
        return [Layer1Candidate(n, "TEST") for n in names]
    return [
        Layer1Candidate("ACME Compute Holdings LLC", "TEST"),
        Layer1Candidate("ACME Holdings Inc.", "TEST"),
        Layer1Candidate("Foreign Example Ltd.", "TEST", foreign_filer_hint=True),
    ]


if __name__ == "__main__":
    raise SystemExit(main())
