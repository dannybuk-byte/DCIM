#!/usr/bin/env python3
"""Print JSON diagnostics for www_pipeline_out/* (paste into run report)."""

from __future__ import annotations

import json
import statistics
from collections import Counter
from pathlib import Path


def main() -> int:
    base = Path("www_pipeline_out")
    rep: dict = {"paths": {}}

    cl = base / "candidate_list.json"
    if cl.is_file():
        rows = json.loads(cl.read_text(encoding="utf-8"))
        tiers = Counter(r.get("match_tier") for r in rows)
        rep["warn_sec_join"] = {
            "matched_issuer_rows": len(rows),
            "match_tier_counts": dict(tiers),
            "low_confidence_review_required": tiers.get("review_required", 0),
        }
        rep["paths"]["candidate_list"] = str(cl)
    else:
        rep["warn_sec_join"] = {"error": f"missing {cl}"}

    fs = base / "filings_sections.json"
    if fs.is_file():
        recs = json.loads(fs.read_text(encoding="utf-8"))
        pc: Counter[str] = Counter()
        for rec in recs:
            for sk in ("mda", "item_1a", "item_7"):
                s = rec.get("sections", {}).get(sk) or {}
                pc[str(s.get("parsing_confidence", "failed"))] += 1
        rep["section_extraction"] = {
            "filing_records": len(recs),
            "parsing_confidence_distribution": dict(pc),
            "fetch_errors": sum(1 for r in recs if r.get("fetch_error") or r.get("error")),
        }
        rep["paths"]["filings_sections"] = str(fs)
    else:
        rep["section_extraction"] = {"error": f"missing {fs}"}

    cd = base / "candidates.json"
    if cd.is_file():
        cands = json.loads(cd.read_text(encoding="utf-8"))
        by_stream: dict[str, list[dict]] = {"explicit_ai": [], "operational_transformation": []}
        for c in cands:
            st = c.get("stream")
            if st in by_stream:
                by_stream[st].append(c)

        def dist_summary(xs: list[int]) -> dict:
            if not xs:
                return {"count": 0}
            return {
                "count": len(xs),
                "min": min(xs),
                "max": max(xs),
                "median": float(statistics.median(xs)),
            }

        def top10(st: str) -> list[dict]:
            rows = by_stream[st]
            return [
                {
                    "rank": i + 1,
                    "candidate_id": r.get("candidate_id"),
                    "min_token_distance": r.get("min_token_distance"),
                    "section": r.get("section"),
                    "snippet": (r.get("paragraph_text") or "")[:160],
                }
                for i, r in enumerate(rows[:10])
            ]

        rep["candidates"] = {
            "total": len(cands),
            "per_stream_count": {k: len(v) for k, v in by_stream.items()},
            "per_stream_proximity_distribution": {
                "explicit_ai": dist_summary(
                    [int(c["min_token_distance"]) for c in by_stream["explicit_ai"] if c.get("min_token_distance") is not None]
                ),
                "operational_transformation": dist_summary(
                    [int(c["min_token_distance"]) for c in by_stream["operational_transformation"] if c.get("min_token_distance") is not None]
                ),
            },
            "top_10_by_stream": {
                "explicit_ai": top10("explicit_ai"),
                "operational_transformation": top10("operational_transformation"),
            },
        }
        rep["paths"]["candidates"] = str(cd)
    else:
        rep["candidates"] = {"error": f"missing {cd}"}

    print(json.dumps(rep, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
