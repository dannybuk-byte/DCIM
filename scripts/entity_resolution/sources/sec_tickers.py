"""
SEC CIK resolution via company_tickers.json (data.sec.gov/files/company_tickers.json).
"""

from __future__ import annotations

import json
import re
import sys
from dataclasses import dataclass
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional

_SCRIPT_DIR = Path(__file__).resolve().parents[2]
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from _www_pipeline_lib import pad_cik10

from ..normalize import normalize_name_key
from .base import SecResult


@dataclass
class SecTickerIndex:
    rows: list[tuple[str, str, str]]  # cik10, title, ticker

    @classmethod
    def from_json_path(cls, path: Path) -> "SecTickerIndex":
        blob = json.loads(path.read_text(encoding="utf-8"))
        rows: list[tuple[str, str, str]] = []
        if isinstance(blob, dict) and "data" in blob and "fields" in blob:
            fields = [str(x).lower() for x in blob["fields"]]
            for row in blob["data"]:
                d = {fields[i]: row[i] for i in range(min(len(fields), len(row)))}
                cik = pad_cik10(str(d.get("cik_str", "")))
                title = str(d.get("title", "") or "")
                tkr = str(d.get("ticker", "") or "")
                if cik and title:
                    rows.append((cik, title, tkr))
        else:
            for _k, v in blob.items():
                if not isinstance(v, dict):
                    continue
                cik = pad_cik10(str(v.get("cik_str", v.get("cik", ""))))
                title = str(v.get("title", v.get("name", "")) or "")
                tkr = str(v.get("ticker", "") or "")
                if cik and title:
                    rows.append((cik, title, tkr))
        return cls(rows=rows)

    def lookup(self, candidate_name: str, aliases: list[str]) -> SecResult:
        needles = [candidate_name, *aliases]
        best: Optional[tuple[str, str, str, float]] = None
        for needle in needles:
            nk = normalize_name_key(needle)
            if not nk:
                continue
            for cik, title, ticker in self.rows:
                tk = normalize_name_key(title)
                score = SequenceMatcher(None, nk, tk).ratio()
                if nk in tk or tk in nk:
                    score = max(score, 0.9)
                if best is None or score > best[3]:
                    best = (cik, title, ticker, score)
        if not best or best[3] < 0.82:
            return SecResult()
        cik, title, ticker, _ = best
        is_foreign = bool(re.match(r"^F\d", cik))
        return SecResult(
            cik=None if is_foreign else cik,
            ticker=ticker or None,
            legal_name_sec=title,
            is_foreign_primary=is_foreign,
        )
