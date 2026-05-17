"""
SAM.gov entity search (live when SAM_GOV_API_KEY set).
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from typing import Any

from .base import SamResult

SAM_SEARCH = "https://sam.gov/api/prod/sgs/v1/search"


def live_sam_lookup(candidate_name: str, aliases: list[str], api_key: str | None) -> SamResult:
    if not api_key:
        return SamResult()
    names = [candidate_name, *aliases]
    ueis: list[str] = []
    cages: list[str] = []
    legal_names: list[str] = []
    for name in names:
        if not name.strip():
            continue
        params = urllib.parse.urlencode({"q": name, "page": "0", "size": "5"})
        url = f"{SAM_SEARCH}?{params}"
        req = urllib.request.Request(
            url,
            headers={"X-Api-Key": api_key, "Accept": "application/json"},
            method="GET",
        )
        try:
            with urllib.request.urlopen(req, timeout=60) as resp:
                data: Any = json.loads(resp.read().decode("utf-8"))
        except Exception:
            continue
        rows = (
            data.get("entityData", [])
            or data.get("_embedded", {}).get("entitySearchList", [])
            or []
        )
        for row in rows:
            if not isinstance(row, dict):
                continue
            uei = str(row.get("ueiSAM") or row.get("uei") or "").strip()
            cage = str(row.get("cageCode") or row.get("cage") or "").strip()
            ln = str(row.get("legalBusinessName") or row.get("name") or "").strip()
            if uei and uei not in ueis:
                ueis.append(uei)
            if cage and cage not in cages:
                cages.append(cage)
            if ln and ln not in legal_names:
                legal_names.append(ln)
    return SamResult(ueis=ueis, cages=cages, legal_names=legal_names)
