"""
OpenCorporates company search.
"""

from __future__ import annotations

import json
import os
import urllib.parse
import urllib.request
from typing import Any

from .base import OpenCorporatesResult

OC_SEARCH = "https://api.opencorporates.com/v0.4/companies/search"


def live_opencorporates_lookup(legal_name: str) -> OpenCorporatesResult:
    api_key = os.environ.get("OPENCORPORATES_API_KEY", "").strip()
    params: dict[str, str] = {"q": legal_name}
    if api_key:
        params["api_token"] = api_key
    url = OC_SEARCH + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={"Accept": "application/json"}, method="GET")
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            data: Any = json.loads(resp.read().decode("utf-8"))
    except Exception:
        return OpenCorporatesResult()
    companies = data.get("results", {}).get("companies") or []
    if not companies:
        return OpenCorporatesResult()
    co = companies[0].get("company") or {}
    return OpenCorporatesResult(
        company_number=str(co.get("company_number") or "") or None,
        jurisdiction=str(co.get("jurisdiction_code") or "") or None,
        incorporation_date=str(co.get("incorporation_date") or "") or None,
        legal_name=str(co.get("name") or "") or None,
    )
