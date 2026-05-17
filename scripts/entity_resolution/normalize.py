"""
Name normalization for matching (not entity merging).
"""

from __future__ import annotations

import re


def normalize_name_key(name: str) -> str:
    s = name.upper()
    s = re.sub(r"\([^)]*\)", "", s)
    s = re.sub(r"[^A-Z0-9]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def names_conflict(a: str, b: str) -> bool:
    if not a or not b:
        return False
    ka, kb = normalize_name_key(a), normalize_name_key(b)
    if ka == kb:
        return False
    if ka in kb or kb in ka:
        return False
    return True
