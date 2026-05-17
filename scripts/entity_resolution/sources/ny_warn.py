"""
NY DOL WARN ingestion (CSV/JSON file or live endpoint when available).
"""

from __future__ import annotations

import csv
import json
from datetime import datetime
from pathlib import Path
from typing import Any

from .base import WarnRow


def load_warn_rows(path: Path) -> list[WarnRow]:
    rows: list[WarnRow] = []
    if path.suffix.lower() == ".json":
        data = json.loads(path.read_text(encoding="utf-8"))
        for r in data if isinstance(data, list) else []:
            if isinstance(r, dict):
                emp = str(r.get("employer") or r.get("warn_employer") or r.get("company") or "")
                dt = str(r.get("warn_date") or r.get("date") or "")
                if emp:
                    rows.append(WarnRow(employer_name=emp, warn_date=dt))
        return rows
    with path.open(newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for r in reader:
            keys = {k.lower(): v for k, v in r.items()}
            emp = (
                keys.get("warn_employer")
                or keys.get("employer")
                or keys.get("company name")
                or ""
            ).strip()
            dt = (keys.get("warn_date") or keys.get("date") or "").strip()
            if emp:
                rows.append(WarnRow(employer_name=emp, warn_date=dt))
    return rows


def filter_warn_rows(
    all_rows: list[WarnRow],
    names: list[str],
    *,
    start_date: str = "2024-01-01",
) -> list[WarnRow]:
    start = datetime.fromisoformat(start_date).date()
    out: list[WarnRow] = []
    name_keys = {n.upper() for n in names if n}
    for row in all_rows:
        if row.warn_date:
            try:
                d = datetime.fromisoformat(row.warn_date[:10]).date()
                if d < start:
                    continue
            except ValueError:
                pass
        emp_up = row.employer_name.upper()
        if any(k in emp_up or emp_up in k for k in name_keys):
            out.append(row)
    return out


def distinct_employers_since(rows: list[WarnRow], start_date: str = "2024-01-01") -> list[str]:
    start = datetime.fromisoformat(start_date).date()
    seen: set[str] = set()
    out: list[str] = []
    for row in rows:
        if row.warn_date:
            try:
                if datetime.fromisoformat(row.warn_date[:10]).date() < start:
                    continue
            except ValueError:
                pass
        key = row.employer_name.strip()
        if key and key not in seen:
            seen.add(key)
            out.append(key)
    return out
