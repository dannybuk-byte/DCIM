"""
SEC filing facility-section extractors (Item 1 Business, Item 2 Properties).
Separate from scripts/_www_section_extract.py to avoid disrupting AI-rhetoric MD&A / Item 1A path.
"""

from __future__ import annotations

import re
from typing import Dict, Union

try:
    from bs4 import BeautifulSoup
except ImportError:
    BeautifulSoup = None  # type: ignore

from _www_section_extract import html_to_visible_text

ItemSection = Dict[str, Union[str, str]]


def _find_item_range_relaxed(
    text: str,
    start_patterns: list[re.Pattern[str]],
    end_patterns: list[re.Pattern[str]],
) -> tuple[int, int] | None:
    """Shorter-document variant than scripts/_www_section_extract._find_item_range."""
    starts: list[tuple[int, re.Match[str]]] = []
    for pat in start_patterns:
        for m in pat.finditer(text):
            starts.append((m.start(), m))
    if not starts:
        return None
    starts.sort(key=lambda x: x[0])
    start_pos, _ = starts[0]
    end_pos = len(text)
    for pat in end_patterns:
        for m in pat.finditer(text):
            if m.start() > start_pos + 20 and m.start() < end_pos:
                end_pos = m.start()
    if end_pos <= start_pos + 15:
        return None
    return start_pos, end_pos


def _pack(pair: tuple[str, str] | None) -> dict[str, str]:
    if not pair:
        return {"text": "", "parsing_confidence": "failed"}
    txt, conf = pair
    return {"text": txt, "parsing_confidence": conf}


def extract_facility_sections_from_filing_html(html: str, form: str) -> dict[str, dict[str, str]]:
    """
    Returns item_1_business, item_2_properties, human_capital_resources (optional).
    Does not modify mda/item_1a/item_7 extraction used by tier-(i) rhetoric pipeline.
    """
    _ = form
    try:
        visible = html_to_visible_text(html)
    except Exception:
        visible = ""

    if len(visible) < 80:
        failed = {"text": "", "parsing_confidence": "failed"}
        return {
            "item_1_business": failed.copy(),
            "item_2_properties": failed.copy(),
            "human_capital_resources": failed.copy(),
        }

    pat_1_business = [
        re.compile(r"(?im)^\s*item\s*1[\.\:\-]?\s*(business)?\b"),
        re.compile(r"(?im)\bitem\s*1[\.\:\-]?\s*business\b"),
    ]
    end_after_1 = [
        re.compile(r"(?im)^\s*item\s*1a\b"),
        re.compile(r"(?im)^\s*item\s*2\b"),
    ]

    pat_2_properties = [
        re.compile(r"(?im)^\s*item\s*2[\.\:\-]?\s*(properties)?\b"),
        re.compile(r"(?im)\bproperties\b"),
    ]
    end_after_2 = [
        re.compile(r"(?im)^\s*item\s*3\b"),
        re.compile(r"(?im)^\s*legal\s*proceedings\b"),
    ]

    pat_hc = [
        re.compile(r"(?im)\bhuman\s*capital\s*resources\b"),
    ]
    end_after_hc = [
        re.compile(r"(?im)^\s*item\s*1a\b"),
        re.compile(r"(?im)^\s*item\s*2\b"),
    ]

    def try_section(
        patterns: list[re.Pattern[str]],
        ends: list[re.Pattern[str]],
        min_len: int = 40,
    ) -> tuple[str, str] | None:
        r = _find_item_range_relaxed(visible, patterns, ends)
        if not r:
            return None
        a, b = r
        chunk = visible[a:b].strip()
        if len(chunk) < min_len:
            return None
        conf = "heuristic" if len(chunk) >= 120 else "approximate"
        return chunk, conf

    out_1 = try_section(pat_1_business, end_after_1, min_len=40)
    out_2 = try_section(pat_2_properties, end_after_2, min_len=30)
    out_hc = try_section(pat_hc, end_after_hc, min_len=25)

    hc = _pack(out_hc) if out_hc else {"text": "", "parsing_confidence": "failed"}

    return {
        "item_1_business": _pack(out_1),
        "item_2_properties": _pack(out_2),
        "human_capital_resources": hc,
    }
