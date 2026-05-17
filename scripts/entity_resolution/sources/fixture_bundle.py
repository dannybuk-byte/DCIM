"""
Fixture-backed source bundle for unit tests.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .base import (
    EntitySourceBundle,
    OcpResult,
    OpenCorporatesResult,
    SamResult,
    SecResult,
    WarnRow,
    WikidataResult,
)
from .ny_warn import load_warn_rows
from .ocp import ocp_from_fixture
from .wikidata import wikidata_from_fixture


class FixtureSourceBundle:
    def __init__(self, fixtures_dir: Path) -> None:
        self.fixtures_dir = fixtures_dir
        self._warn_rows = load_warn_rows(fixtures_dir / "ny_warn_rows.csv")

    def _load(self, name: str) -> dict[str, Any]:
        return json.loads((self.fixtures_dir / name).read_text(encoding="utf-8"))

    def wikidata_lookup(self, candidate_name: str, aliases: list[str]) -> WikidataResult:
        data = self._load("wikidata_response.json")
        key = data.get("by_candidate", {}).get(candidate_name)
        if key is None:
            return WikidataResult(no_match=True)
        return wikidata_from_fixture(key)

    def sec_lookup(self, candidate_name: str, aliases: list[str]) -> SecResult:
        data = self._load("sec_response.json")
        row = data.get("by_candidate", {}).get(candidate_name)
        if not row:
            return SecResult()
        return SecResult(**row)

    def sam_lookup(self, candidate_name: str, aliases: list[str]) -> SamResult:
        data = self._load("sam_response.json")
        row = data.get("by_candidate", {}).get(candidate_name)
        if not row:
            return SamResult()
        return SamResult(
            ueis=list(row.get("ueis") or []),
            cages=list(row.get("cages") or []),
            legal_names=list(row.get("legal_names") or []),
        )

    def warn_rows_for_names(self, names: list[str]) -> list[WarnRow]:
        from .ny_warn import filter_warn_rows

        return filter_warn_rows(self._warn_rows, names)

    def all_warn_employers(self) -> list[str]:
        from .ny_warn import distinct_employers_since

        return distinct_employers_since(self._warn_rows)

    def ocp_lookup(self, candidate_name: str, aliases: list[str]) -> OcpResult:
        data = self._load("ocp_response.json")
        row = data.get("by_candidate", {}).get(candidate_name)
        if not row:
            return OcpResult()
        return ocp_from_fixture(row)

    def opencorporates_lookup(self, legal_name: str) -> OpenCorporatesResult:
        data = self._load("opencorporates_response.json")
        row = data.get("by_name", {}).get(legal_name)
        if not row:
            return OpenCorporatesResult()
        return OpenCorporatesResult(**row)
