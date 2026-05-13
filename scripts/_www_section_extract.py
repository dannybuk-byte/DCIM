"""
10-K / 10-Q HTML → MD&A (Item 7), Item 1A (Risk Factors), Item 7 duplicate.
Four-state parsing_confidence: clean | heuristic | approximate | failed.
"""

from __future__ import annotations

import re
import urllib.parse

try:
    from bs4 import BeautifulSoup
except ImportError as e:
    BeautifulSoup = None  # type: ignore

ItemSection = dict[str, str | dict[str, str]]


def html_to_visible_text(html: str) -> str:
    if BeautifulSoup is None:
        raise RuntimeError("beautifulsoup4 is required for section extraction (pip install beautifulsoup4 lxml)")
    soup = BeautifulSoup(html, "lxml")
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()
    text = soup.get_text("\n")
    text = re.sub(r"\n{3,}", "\n\n", text)
    text = re.sub(r"[ \t\f\v]+", " ", text)
    return text.strip()


def _find_item_range(
    text: str,
    start_patterns: list[re.Pattern[str]],
    end_patterns: list[re.Pattern[str]],
) -> tuple[int, int] | None:
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
            if m.start() > start_pos + 80 and m.start() < end_pos:
                end_pos = m.start()
    if end_pos <= start_pos + 40:
        return None
    return start_pos, end_pos


def extract_sections_from_filing_html(html: str, form: str) -> dict[str, ItemSection]:
    """
    Returns {"mda": {...}, "item_1a": {...}, "item_7": {...}} with keys text, parsing_confidence.
    """
    try:
        visible = html_to_visible_text(html)
    except Exception:
        visible = ""

    if len(visible) < 500:
        failed = {"text": "", "parsing_confidence": "failed"}
        return {"mda": failed.copy(), "item_1a": failed.copy(), "item_7": failed.copy()}

    # Primary patterns (Item labels as in most 10-K plain text)
    pat_1a_clean = [
        re.compile(r"(?im)^\s*item\s*1a[\.\:\-]?\s*(risk\s*factors)?\b"),
        re.compile(r"(?im)\bitem\s*1a[\.\:\-]?\s*risk\s*factors\b"),
    ]
    pat_1a_heur = [
        re.compile(r"(?im)\bitem\s*1a\b"),
        re.compile(r"(?im)\brisk\s*factors\b"),
    ]

    end_after_1a = [
        re.compile(r"(?im)^\s*item\s*1b\b"),
        re.compile(r"(?im)^\s*item\s*2\b"),
        re.compile(r"(?im)^\s*item\s*3\b"),
    ]

    pat_7_clean = [
        re.compile(
            r"(?im)^\s*item\s*7[\.\:\-]?\s*(management'?s\s*discussion\s*and\s*analysis|md&a)\b"
        ),
        re.compile(r"(?im)\bitem\s*7[\.\:\-]?\s*"),
    ]
    pat_7_heur = [
        re.compile(r"(?im)\bmanagement'?s\s*discussion\s*and\s*analysis\b"),
        re.compile(r"(?im)\bitem\s*7\b"),
    ]

    end_after_7 = [
        re.compile(r"(?im)^\s*item\s*7a\b"),
        re.compile(r"(?im)^\s*item\s*8\b"),
    ]

    def try_1a(patterns: list[re.Pattern[str]], label: str) -> tuple[str, str] | None:
        r = _find_item_range(visible, patterns, end_after_1a)
        if not r:
            return None
        a, b = r
        chunk = visible[a:b].strip()
        if len(chunk) < 200:
            return None
        return chunk, label

    def try_7(patterns: list[re.Pattern[str]], label: str) -> tuple[str, str] | None:
        r = _find_item_range(visible, patterns, end_after_7)
        if not r:
            return None
        a, b = r
        chunk = visible[a:b].strip()
        if len(chunk) < 200:
            return None
        return chunk, label

    out_1a: tuple[str, str] | None = None
    for label, pats in (("clean", pat_1a_clean), ("heuristic", pat_1a_heur)):
        out_1a = try_1a(pats, label)
        if out_1a:
            break

    out_7: tuple[str, str] | None = None
    for label, pats in (("clean", pat_7_clean), ("heuristic", pat_7_heur)):
        out_7 = try_7(pats, label)
        if out_7:
            break

    # Approximate: loose window between first "risk factor" and item 2 if 1A failed
    if not out_1a:
        m = re.search(r"(?im)risk\s*factors", visible)
        m2 = re.search(r"(?im)^\s*item\s*2\b", visible, re.MULTILINE)
        if m and m2 and m2.start() > m.start() + 200:
            chunk = visible[m.start() : m2.start()].strip()
            if len(chunk) > 400:
                out_1a = (chunk, "approximate")

    if not out_7:
        m = re.search(r"(?im)management'?s\s*discussion\s*and\s*analysis", visible)
        m2 = re.search(r"(?im)^\s*item\s*8\b", visible, re.MULTILINE)
        if m and m2 and m2.start() > m.start() + 200:
            chunk = visible[m.start() : m2.start()].strip()
            if len(chunk) > 400:
                out_7 = (chunk, "approximate")

    failed = {"text": "", "parsing_confidence": "failed"}

    def pack(pair: tuple[str, str] | None) -> ItemSection:
        if not pair:
            return failed.copy()  # type: ignore
        txt, conf = pair
        return {"text": txt, "parsing_confidence": conf}

    mda_sec = pack(out_7)
    i7 = pack(out_7)
    i1a = pack(out_1a)
    _ = form  # reserved for form-specific extractors (10-Q / foreign private issuer)

    return {"mda": mda_sec, "item_1a": i1a, "item_7": i7}


def filing_viewer_url(cik10: str, accession: str, primary_document: str) -> str:
    acc_dash = accession
    if "-" not in accession and len(accession) == 18:
        acc_dash = f"{accession[:10]}-{accession[10:12]}-{accession[12:]}"
    ciki = str(int(cik10))
    return (
        "https://www.sec.gov/cgi-bin/viewer?action=view&cik="
        f"{ciki}&accession_number={urllib.parse.quote(acc_dash)}&xbrl_type=v"
    )