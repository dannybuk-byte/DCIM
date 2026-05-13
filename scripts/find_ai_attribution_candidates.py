#!/usr/bin/env python3
"""
Two-stream retrieval vocabulary scan with workforce proximity token distance.
Streams are never merged; no interpretive labels beyond stream id + parsing metadata.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
from pathlib import Path

_SCRIPT_DIR = Path(__file__).resolve().parent
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from _www_pipeline_lib import (
    NO_WORKFORCE_SENTINEL,
    iter_regex_spans,
    min_token_distance_between_sets,
    split_paragraphs,
)

STREAM_EXPLICIT_AI = "explicit_ai"
STREAM_OPERATIONAL = "operational_transformation"

# Phrase patterns (case-insensitive, word-boundary where applicable)
STREAM1_PHRASES = [
    r"\bartificial intelligence\b",
    r"(?<![A-Za-z])AI(?![A-Za-z])",
    r"\bmachine learning\b",
    r"(?<![A-Za-z])ML(?![A-Za-z])",
    r"\bautomation\b",
    r"\bAI[- ]enabled\b",
    r"\bAI[- ]driven\b",
    r"\bAI[- ]powered\b",
    r"\bgenerative AI\b",
    r"\blarge language model\b",
    r"(?<![A-Za-z])LLM(?![A-Za-z])",
    r"\bdeep learning\b",
    r"\bneural network\b",
    r"\balgorithmic\b",
    r"\bautonomous\b",
]

STREAM2_PHRASES = [
    r"\befficiency initiative\b",
    r"\bworkflow optimization\b",
    r"\borganizational redesign\b",
    r"\bdigital transformation\b",
    r"\bplatform consolidation\b",
    r"\boperating model evolution\b",
    r"\bstructural cost reduction\b",
    r"\btechnology-enabled productivity\b",
    r"\boperational efficiency program\b",
    r"\bheadcount realignment\b",
    r"\bmodernization initiative\b",
    r"\bproductivity initiative\b",
    r"\brestructuring program\b",
    r"\boperational streamlining\b",
    r"\bworkforce optimization\b",
]

WORKFORCE_PHRASES = [
    r"\bheadcount\b",
    r"\bworkforce\b",
    r"\bemployees\b",
    r"\bstaff\b",
    r"\blayoff\b",
    r"\breduction in force\b",
    r"(?<![A-Za-z])RIF(?![A-Za-z])",
    r"\bredundancy\b",
    r"\bseparation\b",
    r"\battrition\b",
    r"\beliminate\b",
    r"\breduce positions\b",
    r"\bjob cuts\b",
    r"\bstaffing levels\b",
    r"\bpersonnel costs\b",
    r"\blabor costs\b",
]


def _compile_group(phrases: list[str]) -> list[re.Pattern[str]]:
    return [re.compile(p, re.IGNORECASE) for p in phrases]


def _all_spans(text: str, patterns: list[re.Pattern[str]]) -> list[tuple[int, int]]:
    spans: list[tuple[int, int]] = []
    for pat in patterns:
        spans.extend((a, b) for a, b, _ in iter_regex_spans(text, pat))
    if not spans:
        return []
    spans.sort()
    merged: list[tuple[int, int]] = []
    for a, b in spans:
        if not merged or a > merged[-1][1] + 1:
            merged.append((a, b))
        else:
            merged[-1] = (merged[-1][0], max(merged[-1][1], b))
    return merged


def _matched_terms(text: str, patterns: list[re.Pattern[str]]) -> list[str]:
    found: list[str] = []
    for pat in patterns:
        for _a, _b, g in iter_regex_spans(text, pat):
            if g.lower() not in [x.lower() for x in found]:
                found.append(g)
    return found


def _candidate_id(parts: str) -> str:
    return hashlib.sha256(parts.encode("utf-8")).hexdigest()[:20]


def scan_section(
    filing: dict,
    section_key: str,
    stream: str,
    patterns: list[re.Pattern[str]],
    wf_patterns: list[re.Pattern[str]],
) -> list[dict]:
    sec = (filing.get("sections") or {}).get(section_key) or {}
    text = str(sec.get("text") or "")
    pconf = str(sec.get("parsing_confidence") or "failed")
    if not text.strip():
        return []

    paras = split_paragraphs(text)
    out: list[dict] = []
    for pi, para in enumerate(paras):
        r_spans = _all_spans(para, patterns)
        if not r_spans:
            continue
        w_spans = _all_spans(para, wf_patterns)
        dist = min_token_distance_between_sets(r_spans, w_spans)
        if dist is None:
            min_d = NO_WORKFORCE_SENTINEL
            wf_terms: list[str] = []
        else:
            min_d = dist
            wf_terms = _matched_terms(para, wf_patterns)

        cid = _candidate_id(
            "|".join(
                [
                    str(filing.get("cik")),
                    str(filing.get("accession_number")),
                    section_key,
                    str(pi),
                    stream,
                    para[:120],
                ]
            )
        )
        out.append(
            {
                "candidate_id": cid,
                "cik": filing.get("cik"),
                "accession_number": filing.get("accession_number"),
                "filing_date": filing.get("filing_date"),
                "form": filing.get("form"),
                "section": section_key,
                "paragraph_index": pi,
                "paragraph_text": para,
                "stream": stream,
                "retrieval_terms_matched": _matched_terms(para, patterns),
                "workforce_proximity_terms_matched": wf_terms,
                "min_token_distance": min_d,
                "parsing_confidence": pconf,
                "filing_url": filing.get("filing_url"),
                "filing_viewer_url": filing.get("filing_viewer_url"),
            }
        )

    out.sort(
        key=lambda r: (
            0 if r["min_token_distance"] < NO_WORKFORCE_SENTINEL else 1,
            r["min_token_distance"],
            r["paragraph_index"],
        )
    )
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Two-stream retrieval candidate paragraphs")
    ap.add_argument("--filings", type=Path, default=Path("www_pipeline_out/filings_sections.json"))
    ap.add_argument("--output", type=Path, default=Path("www_pipeline_out/candidates.json"))
    ap.add_argument(
        "--demo-section-text-file",
        type=Path,
        default=None,
        help="Read section plain text and print both streams' JSON to stdout (skips --filings)",
    )
    ap.add_argument(
        "--sections",
        default="mda,item_1a,item_7",
        help="Comma-separated section keys to scan",
    )
    args = ap.parse_args()

    if args.demo_section_text_file:
        blob = args.demo_section_text_file.read_text(encoding="utf-8")
        print(json.dumps(run_on_text(blob, "demo_section"), indent=2))
        return 0

    filings = json.loads(args.filings.read_text(encoding="utf-8"))
    section_keys = [s.strip() for s in args.sections.split(",") if s.strip()]

    p1 = _compile_group(STREAM1_PHRASES)
    p2 = _compile_group(STREAM2_PHRASES)
    pw = _compile_group(WORKFORCE_PHRASES)

    all_cands: list[dict] = []
    for filing in filings:
        for sk in section_keys:
            all_cands.extend(scan_section(filing, sk, STREAM_EXPLICIT_AI, p1, pw))
            all_cands.extend(scan_section(filing, sk, STREAM_OPERATIONAL, p2, pw))

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(all_cands, indent=2), encoding="utf-8")

    s1 = sum(1 for c in all_cands if c["stream"] == STREAM_EXPLICIT_AI)
    s2 = sum(1 for c in all_cands if c["stream"] == STREAM_OPERATIONAL)
    print(json.dumps({"total": len(all_cands), "explicit_ai": s1, "operational_transformation": s2, "output": str(args.output)}, indent=2))
    return 0


def run_on_text(section_text: str, section_label: str = "synthetic") -> dict:
    """Programmatic hook for --demo-single-section."""
    fake = {
        "cik": "0000000000",
        "accession_number": "DEMO",
        "filing_date": "1900-01-01",
        "form": "SYNTHETIC",
        "filing_url": "",
        "filing_viewer_url": "",
        "sections": {section_label: {"text": section_text, "parsing_confidence": "clean"}},
    }
    p1 = _compile_group(STREAM1_PHRASES)
    p2 = _compile_group(STREAM2_PHRASES)
    pw = _compile_group(WORKFORCE_PHRASES)
    return {
        STREAM_EXPLICIT_AI: scan_section(fake, section_label, STREAM_EXPLICIT_AI, p1, pw),
        STREAM_OPERATIONAL: scan_section(fake, section_label, STREAM_OPERATIONAL, p2, pw),
    }


if __name__ == "__main__":
    raise SystemExit(main())
