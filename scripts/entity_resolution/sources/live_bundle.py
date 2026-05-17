"""
Live API source bundle for CLI orchestrator.
"""

from __future__ import annotations

import os
from pathlib import Path
from typing import Optional

from .base import (
    OcpResult,
    OpenCorporatesResult,
    SamResult,
    SecResult,
    WarnRow,
    WikidataResult,
)
from .ny_warn import distinct_employers_since, filter_warn_rows, load_warn_rows
from .ocp import parse_ocp_directory_html
from .opencorporates import live_opencorporates_lookup
from .sam_gov import live_sam_lookup
from .sec_tickers import SecTickerIndex
from .wikidata import live_wikidata_lookup

try:
    import urllib.request
except ImportError:
    pass

OCP_DIRECTORY_URL = "https://www.opencompute.org/membership/membership-directory"


class LiveSourceBundle:
    def __init__(
        self,
        *,
        sec_tickers_path: Path,
        warn_data_path: Optional[Path] = None,
        ocp_html_cache: Optional[str] = None,
    ) -> None:
        self.sec_index = SecTickerIndex.from_json_path(sec_tickers_path)
        self.warn_rows = load_warn_rows(warn_data_path) if warn_data_path else []
        self._ocp_html = ocp_html_cache
        self._sam_key = os.environ.get("SAM_GOV_API_KEY", "").strip() or None

    def _fetch_ocp_html(self) -> str:
        if self._ocp_html:
            return self._ocp_html
        req = urllib.request.Request(
            OCP_DIRECTORY_URL,
            headers={"User-Agent": "DCIM-EntityResolution/1.0"},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            self._ocp_html = resp.read().decode("utf-8", errors="replace")
        return self._ocp_html

    def wikidata_lookup(self, candidate_name: str, aliases: list[str]) -> WikidataResult:
        return live_wikidata_lookup(candidate_name, aliases)

    def sec_lookup(self, candidate_name: str, aliases: list[str]) -> SecResult:
        return self.sec_index.lookup(candidate_name, aliases)

    def sam_lookup(self, candidate_name: str, aliases: list[str]) -> SamResult:
        return live_sam_lookup(candidate_name, aliases, self._sam_key)

    def warn_rows_for_names(self, names: list[str]) -> list[WarnRow]:
        return filter_warn_rows(self.warn_rows, names)

    def all_warn_employers(self) -> list[str]:
        return distinct_employers_since(self.warn_rows)

    def ocp_lookup(self, candidate_name: str, aliases: list[str]) -> OcpResult:
        try:
            html = self._fetch_ocp_html()
            return parse_ocp_directory_html(html, candidate_name, aliases)
        except Exception:
            return OcpResult()

    def opencorporates_lookup(self, legal_name: str) -> OpenCorporatesResult:
        return live_opencorporates_lookup(legal_name)
