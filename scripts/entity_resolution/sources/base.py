"""Source client protocols for entity resolution."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Optional, Protocol


@dataclass
class WikidataResult:
    qid: Optional[str] = None
    canonical_legal_name: Optional[str] = None
    aliases: list[str] = field(default_factory=list)
    parent_qids: list[str] = field(default_factory=list)
    subsidiary_labels: list[str] = field(default_factory=list)
    ambiguous_qids: list[str] = field(default_factory=list)
    no_match: bool = False


@dataclass
class SecResult:
    cik: Optional[str] = None
    ticker: Optional[str] = None
    legal_name_sec: Optional[str] = None
    is_foreign_primary: bool = False


@dataclass
class SamResult:
    ueis: list[str] = field(default_factory=list)
    cages: list[str] = field(default_factory=list)
    legal_names: list[str] = field(default_factory=list)


@dataclass
class WarnRow:
    employer_name: str
    warn_date: str


@dataclass
class OcpResult:
    directory_entry_name: Optional[str] = None
    membership_tier: Optional[str] = None
    contributor_evidence_urls: list[str] = field(default_factory=list)


@dataclass
class OpenCorporatesResult:
    company_number: Optional[str] = None
    jurisdiction: Optional[str] = None
    incorporation_date: Optional[str] = None
    legal_name: Optional[str] = None


class EntitySourceBundle(Protocol):
    def wikidata_lookup(self, candidate_name: str, aliases: list[str]) -> WikidataResult: ...

    def sec_lookup(self, candidate_name: str, aliases: list[str]) -> SecResult: ...

    def sam_lookup(self, candidate_name: str, aliases: list[str]) -> SamResult: ...

    def warn_rows_for_names(self, names: list[str]) -> list[WarnRow]: ...

    def all_warn_employers(self) -> list[str]: ...

    def ocp_lookup(self, candidate_name: str, aliases: list[str]) -> OcpResult: ...

    def opencorporates_lookup(self, legal_name: str) -> OpenCorporatesResult: ...
