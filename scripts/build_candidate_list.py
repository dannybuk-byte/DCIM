#!/usr/bin/env python3
"""
Join NY WARN employers to SEC EDGAR CIKs using company_tickers (name fuzzy match).
Outputs candidate_list.json for matched issuers only; low-confidence matches are flagged, not dropped.
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import sys
from difflib import SequenceMatcher
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from _www_pipeline_lib import SecClient, fetch_company_tickers_json, normalize_employer, pad_cik10


def _load_warn_rows(path: Path) -> list[dict[str, str]]:
    rows: list[dict[str, str]] = []
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        if isinstance(data, list):
            for r in data:
                if isinstance(r, dict):
                    rows.append({str(k).lower(): str(v) for k, v in r.items()})
        return rows
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            rows.append({k.lower().strip(): (v or "").strip() for k, v in r.items()})
    return rows


def _warn_field(row: dict[str, str], *names: str) -> str:
    keys = {k.lower(): v for k, v in row.items()}
    for n in names:
        if n.lower() in keys and keys[n.lower()]:
            return keys[n.lower()]
    return ""


def iter_sec_companies(tickers_blob: dict) -> list[tuple[str, str, str]]:
    """Return list of (cik10, title, ticker)."""
    out: list[tuple[str, str, str]] = []
    if isinstance(tickers_blob, dict) and "data" in tickers_blob and "fields" in tickers_blob:
        fields = [str(x).lower() for x in tickers_blob["fields"]]
        for row in tickers_blob["data"]:
            d = {fields[i]: row[i] for i in range(min(len(fields), len(row)))}
            cik = pad_cik10(str(d.get("cik_str", "")))
            title = str(d.get("title", "") or "")
            tkr = str(d.get("ticker", "") or "")
            if cik and title:
                out.append((cik, title, tkr))
        return out
    for _k, v in tickers_blob.items():
        if not isinstance(v, dict):
            continue
        cik = pad_cik10(str(v.get("cik_str", v.get("cik", ""))))
        title = str(v.get("title", v.get("name", "")) or "")
        tkr = str(v.get("ticker", "") or "")
        if cik and title:
            out.append((cik, title, tkr))
    return out


def name_match_score(employer_norm: str, title_norm: str) -> float:
    if not employer_norm or not title_norm:
        return 0.0
    if employer_norm in title_norm or title_norm in employer_norm:
        return max(0.88, SequenceMatcher(None, employer_norm, title_norm).ratio())
    return SequenceMatcher(None, employer_norm, title_norm).ratio()


def best_match(employer: str, companies: list[tuple[str, str, str]]) -> tuple[str, str, str, float] | None:
    en = normalize_employer(employer)
    if not en:
        return None
    best: tuple[str, str, str, float] | None = None
    for cik, title, tkr in companies:
        tn = normalize_employer(title)
        sc = name_match_score(en, tn)
        if best is None or sc > best[3]:
            best = (cik, title, tkr, sc)
    return best


def main() -> int:
    ap = argparse.ArgumentParser(description="WARN ∩ SEC employer candidate list")
    ap.add_argument("--warn", required=True, type=Path, help="WARN CSV or JSON (Daniel-provided)")
    ap.add_argument(
        "--tickers-cache",
        type=Path,
        default=Path("data/cache/company_tickers.json"),
        help="Local cache for SEC company_tickers.json",
    )
    ap.add_argument(
        "--sec-proxy-base",
        default=None,
        help="Override WWW_SEC_PROXY_BASE (Cloudflare worker origin)",
    )
    ap.add_argument("--output", type=Path, default=Path("www_pipeline_out/candidate_list.json"))
    ap.add_argument(
        "--review-below",
        type=float,
        default=0.72,
        help="match_score below this → match_tier review_required (not auto-accepted)",
    )
    ap.add_argument("--min-score", type=float, default=0.52, help="Below this: no candidate row emitted")
    args = ap.parse_args()

    client = SecClient(proxy_base=(args.sec_proxy_base or SecClient.proxy_base))
    tickers = fetch_company_tickers_json(client, str(args.tickers_cache) if args.tickers_cache else None)
    companies = iter_sec_companies(tickers)

    warn_rows = _load_warn_rows(args.warn)
    out: list[dict] = []
    stats = {"warn_rows": len(warn_rows), "matched": 0, "review_required": 0, "unmatched": 0}

    for row in warn_rows:
        employer = _warn_field(row, "warn_employer", "employer", "company", "company_name")
        if not employer:
            stats["unmatched"] += 1
            continue
        bm = best_match(employer, companies)
        if not bm or bm[3] < args.min_score:
            stats["unmatched"] += 1
            continue
        cik, sec_title, ticker, score = bm
        tier = "review_required" if score < args.review_below else "standard"
        if tier == "review_required":
            stats["review_required"] += 1
        stats["matched"] += 1
        out.append(
            {
                "warn_employer": employer,
                "cik": cik,
                "sec_entity_title": sec_title,
                "sec_ticker": ticker,
                "match_score": round(score, 4),
                "match_tier": tier,
                "warn_date": _warn_field(row, "warn_date", "date", "notice_date"),
                "warn_stated_cause": _warn_field(row, "warn_stated_cause", "cause", "reason"),
                "warn_url": _warn_field(row, "warn_url", "url", "link"),
                "jobs_affected": _warn_field(row, "jobs_affected", "employees", "workers"),
            }
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(out, indent=2), encoding="utf-8")

    rep = {
        "summary": stats,
        "output": str(args.output),
        "note": "match_tier=review_required rows need human confirmation before treating CIK as authoritative.",
    }
    print(json.dumps(rep, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
