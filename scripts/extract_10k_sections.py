#!/usr/bin/env python3
"""
For each WARN-matched issuer, fetch 10-K (and optional 10-Q / prior 10-K) via SEC proxy,
extract MD&A / Item 1A / Item 7 with four-state parsing_confidence.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from _www_pipeline_lib import SecClient, accession_no_dashes, cik_archive_int, pad_cik10
from _www_section_extract import extract_sections_from_filing_html, filing_viewer_url


def _recent_filings(submissions: dict, forms: set[str]) -> list[dict]:
    filings = submissions.get("filings") or {}
    recent = filings.get("recent") or {}
    forms_list = recent.get("form") or []
    out: list[dict] = []
    for i, form in enumerate(forms_list):
        if form not in forms:
            continue
        fd = recent.get("filingDate", [None] * len(forms_list))[i]
        acc = recent.get("accessionNumber", [None] * len(forms_list))[i]
        prim = recent.get("primaryDocument", [None] * len(forms_list))[i]
        if not fd or not acc or not prim:
            continue
        out.append({"form": form, "filing_date": fd, "accession_number": acc, "primary_document": prim})
    out.sort(key=lambda x: x["filing_date"], reverse=True)
    return out


def _pick_filings(
    recent_rows: list[dict],
    warn_date: str | None,
    include_extras: bool,
) -> list[dict]:
    """Most recent 10-K; optionally prior 10-K + most recent 10-Q vs warn_date."""
    k_rows = [r for r in recent_rows if r["form"] == "10-K"]
    q_rows = [r for r in recent_rows if r["form"] == "10-Q"]
    chosen: list[dict] = []
    if not k_rows:
        return chosen
    primary = k_rows[0]
    chosen.append({**primary, "role": "primary_10k"})

    if include_extras and len(k_rows) > 1:
        chosen.append({**k_rows[1], "role": "prior_10k"})
    if include_extras and q_rows:
        if warn_date:
            before = [r for r in q_rows if r["filing_date"] <= warn_date]
            pick = before[0] if before else q_rows[0]
        else:
            pick = q_rows[0]
        chosen.append({**pick, "role": "recent_10q"})
    return chosen


def _archives_path(cik10: str, accession: str, primary_doc: str) -> str:
    return f"edgar/data/{cik_archive_int(cik10)}/{accession_no_dashes(accession)}/{primary_doc}"


def main() -> int:
    ap = argparse.ArgumentParser(description="Fetch SEC filings and extract Item 1A / Item 7 (MD&A)")
    ap.add_argument("--candidates", type=Path, default=Path("www_pipeline_out/candidate_list.json"))
    ap.add_argument("--output", type=Path, default=Path("www_pipeline_out/filings_sections.json"))
    ap.add_argument("--limit", type=int, default=0, help="Process only first N issuers (0=all)")
    ap.add_argument(
        "--include-extra-filings",
        action="store_true",
        help="Also fetch prior 10-K and most recent 10-Q (time-window assist)",
    )
    ap.add_argument("--single-cik", type=str, default="", help="Only this zero-padded CIK (overrides list limit)")
    ap.add_argument("--sec-proxy-base", default=None)
    args = ap.parse_args()

    client = SecClient(proxy_base=(args.sec_proxy_base or SecClient.proxy_base))

    rows = json.loads(args.candidates.read_text(encoding="utf-8"))
    if args.single_cik:
        cikf = pad_cik10(args.single_cik)
        rows = [r for r in rows if r.get("cik") == cikf]
    elif args.limit and args.limit > 0:
        rows = rows[: args.limit]

    out: list[dict] = []
    for row in rows:
        cik10 = pad_cik10(str(row.get("cik", "")))
        if not cik10:
            continue
        sub_path = f"submissions/CIK{cik10}.json"
        try:
            sub = client.get_json(sub_path)
        except Exception as e:
            out.append(
                {
                    "cik": cik10,
                    "warn_context": row,
                    "error": f"submissions_fetch_failed: {e}",
                    "sections": {
                        "mda": {"text": "", "parsing_confidence": "failed"},
                        "item_1a": {"text": "", "parsing_confidence": "failed"},
                        "item_7": {"text": "", "parsing_confidence": "failed"},
                    },
                }
            )
            continue

        recent = _recent_filings(sub, {"10-K", "10-Q"})
        picks = _pick_filings(recent, row.get("warn_date") or None, args.include_extra_filings)
        if not picks:
            out.append(
                {
                    "cik": cik10,
                    "warn_context": row,
                    "error": "no_10k_in_submissions_index",
                    "sections": {
                        "mda": {"text": "", "parsing_confidence": "failed"},
                        "item_1a": {"text": "", "parsing_confidence": "failed"},
                        "item_7": {"text": "", "parsing_confidence": "failed"},
                    },
                }
            )
            continue
            acc = filing["accession_number"]
            prim = filing["primary_document"]
            arch = _archives_path(cik10, acc, prim)
            filing_url = (
                f"https://www.sec.gov/Archives/edgar/data/{cik_archive_int(cik10)}/"
                f"{accession_no_dashes(acc)}/{prim}"
            )
            viewer_url = filing_viewer_url(cik10, acc, prim)
            try:
                html = client.get_archives_text(arch)
            except Exception as e:
                out.append(
                    {
                        "cik": cik10,
                        "accession_number": acc,
                        "filing_date": filing["filing_date"],
                        "form": filing["form"],
                        "filing_role": filing.get("role", ""),
                        "primary_document": prim,
                        "filing_url": filing_url,
                        "filing_viewer_url": viewer_url,
                        "warn_context": row,
                        "fetch_error": str(e),
                        "sections": {
                            "mda": {"text": "", "parsing_confidence": "failed"},
                            "item_1a": {"text": "", "parsing_confidence": "failed"},
                            "item_7": {"text": "", "parsing_confidence": "failed"},
                        },
                    }
                )
                continue

            sections = extract_sections_from_filing_html(html, filing["form"])
            out.append(
                {
                    "cik": cik10,
                    "accession_number": acc,
                    "filing_date": filing["filing_date"],
                    "form": filing["form"],
                    "filing_role": filing.get("role", ""),
                    "primary_document": prim,
                    "filing_url": filing_url,
                    "filing_viewer_url": viewer_url,
                    "warn_context": row,
                    "sections": sections,
                }
            )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(out, indent=2), encoding="utf-8")
    dist: dict[str, int] = {}
    for rec in out:
        for sec_name in ("mda", "item_1a", "item_7"):
            s = rec.get("sections", {}).get(sec_name) or {}
            pc = str(s.get("parsing_confidence", "failed"))
            dist[pc] = dist.get(pc, 0) + 1
    print(json.dumps({"records": len(out), "parsing_confidence_counts": dist, "output": str(args.output)}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
