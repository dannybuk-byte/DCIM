"""
Optional Block 4.5.0 entity_resolution.json consumer.
Reference: AGENT_CHARTER_BLOCK_4_5_0_ENTITY_RESOLUTION_2026-05-16.md (when present in repo).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Optional


def load_entity_resolution(path: Path) -> dict[str, dict[str, Any]]:
    if not path.is_file():
        return {}
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, dict) and "firms" in data:
        firms = data["firms"]
    elif isinstance(data, list):
        firms = data
    else:
        return {}
    by_cik: dict[str, dict[str, Any]] = {}
    for row in firms:
        if not isinstance(row, dict):
            continue
        cik = str(row.get("cik") or "").strip()
        firm_id = row.get("firm_id")
        if cik and firm_id:
            by_cik[cik.zfill(10)] = row
    return by_cik


def resolve_operator(
    *,
    cik: Optional[str],
    operator_name_raw: str,
    entity_index: dict[str, dict[str, Any]],
) -> tuple[Optional[str], Optional[str], Optional[str]]:
    if cik and cik.zfill(10) in entity_index:
        row = entity_index[cik.zfill(10)]
        return (
            row.get("legal_name_sec") or row.get("resolved_name"),
            str(row.get("firm_id")),
            "operator_resolved",
        )
    return None, None, None
