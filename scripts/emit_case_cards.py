#!/usr/bin/env python3
"""
Assemble DME-compatible case-card JSON from Daniel-edited accepted candidates + warrant notes.
Does not generate warrant text; does not score or classify attribution.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def _period_from_dates(dates: list[str]) -> tuple[str | None, str | None]:
    ds = sorted([d for d in dates if d])
    if not ds:
        return None, None
    return ds[0], ds[-1]


def main() -> int:
    ap = argparse.ArgumentParser(description="Emit validated_cases.json for DME seed-shaped import")
    ap.add_argument("--accepted", type=Path, required=True, help="Daniel-edited JSON or YAML list of accepted rows")
    ap.add_argument("--output", type=Path, default=Path("www_pipeline_out/validated_cases.json"))
    args = ap.parse_args()

    text = args.accepted.read_text(encoding="utf-8")
    if args.accepted.suffix.lower() in (".yaml", ".yml"):
        try:
            import yaml  # type: ignore
        except ImportError as e:
            print("PyYAML required for YAML input: pip install pyyaml", file=sys.stderr)
            raise SystemExit(1) from e
        rows = yaml.safe_load(text)
    else:
        rows = json.loads(text)

    if not isinstance(rows, list):
        print("Accepted file must be a JSON/YAML array", file=sys.stderr)
        return 1

    by_company: dict[str, dict] = {}
    for row in rows:
        if not isinstance(row, dict):
            continue
        cid = str(row.get("company_id") or row.get("case_company_id") or "").strip()
        if not cid:
            print("Skipping row without company_id", file=sys.stderr)
            continue
        if cid not in by_company:
            by_company[cid] = {
                "id": cid,
                "name": str(row.get("company_name") or cid),
                "sector": str(row.get("sector") or "Unknown"),
                "period_start": row.get("period_start"),
                "period_end": row.get("period_end"),
                "case_type": row.get("case_type") or "sourced_case",
                "reviewer_flag": row.get("reviewer_flag") or "human_review_required",
                "sources": [],
            }
        fd = row.get("filing_date") or row.get("sec_filing_date")
        wr = row.get("warn_filing_reference") or {}

        excerpt = str(row.get("paragraph_text") or row.get("text_excerpt") or "")
        if len(excerpt) > 1200:
            excerpt = excerpt[:1197] + "…"

        source_id = str(row.get("source_id") or f"{cid}_{row.get('candidate_id', 'anon')}_www_sec")

        loc = row.get("locator")
        if row.get("parsing_confidence") in ("approximate", "failed") and not loc:
            loc = "<section approximate; see filing directly>"

        # Ruling 2 (2026-08-05): every emitted row carries an origin_id so the
        # engine floor can count independent origins. For SEC filings the origin
        # is the issuer's EDGAR record: two filings by one issuer are ONE origin.
        cik = str(row.get("cik") or wr.get("cik") or "").strip()
        origin_id = f"sec_edgar:{cik}" if cik else f"sec_edgar:{cid}"

        src = {
            "id": source_id,
            "company_id": cid,
            "origin_id": origin_id,
            "type": "sec_filing",
            "date": str(fd or row.get("date") or ""),
            "text_excerpt": excerpt,
            "url": str(row.get("sec_filing_url") or row.get("filing_url") or row.get("url") or ""),
            "retrieval_stream": row.get("retrieval_stream"),
            "parsing_confidence": row.get("parsing_confidence"),
            "locator": loc,
            "warrant_note": str(row.get("warrant_note") or ""),
            "methodology_reference": "WWW-MN-2026-05-VSE",
            "candidate_id": row.get("candidate_id"),
            "warn_filing_reference": wr,
        }
        if row.get("scope_caveat"):
            src["scope_caveat"] = row["scope_caveat"]
        if row.get("bloomberg_law_cross_reference"):
            src["bloomberg_law_cross_reference"] = row["bloomberg_law_cross_reference"]

        by_company[cid]["sources"].append(src)

    companies: list[dict] = []
    for comp in by_company.values():
        dates = []
        if comp.get("period_start"):
            dates.append(str(comp["period_start"]))
        if comp.get("period_end"):
            dates.append(str(comp["period_end"]))
        for s in comp["sources"]:
            if s.get("date"):
                dates.append(str(s["date"]))
            wr = s.get("warn_filing_reference") or {}
            if isinstance(wr, dict) and wr.get("warn_date"):
                dates.append(str(wr["warn_date"]))
        ps, pe = _period_from_dates(dates)
        if not comp.get("period_start"):
            comp["period_start"] = ps
        if not comp.get("period_end"):
            comp["period_end"] = pe
        companies.append(comp)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(companies, indent=2), encoding="utf-8")
    print(json.dumps({"companies": len(companies), "output": str(args.output)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
