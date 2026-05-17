"""
Name and geography normalization (no fuzzy entity merge).
"""

from __future__ import annotations

import re


def normalize_developer_name(raw: str) -> str:
    s = raw.strip()
    s = re.sub(r"\s+", " ", s)
    return s


_FACILITY_PATTERNS = re.compile(
    r"(?i)\b(data\s*cent(er|re)|colocation|colo\b|server\s*farm|hyperscale|"
    r"cloud\s*region|campus\b|facility\b|properties\b|leased\s*property)\b"
)


def text_has_facility_naming_patterns(text: str) -> bool:
    if not text or len(text) < 40:
        return False
    return bool(_FACILITY_PATTERNS.search(text))


def geography_from_location_raw(location_raw: str) -> dict:
    """Best-effort state extraction from US location strings; no sub-MSA precision claims."""
    out: dict = {"state": None, "county": None, "msa": None}
    m = re.search(r"\b([A-Z]{2})\b", location_raw)
    if m:
        out["state"] = m.group(1)
    return out
