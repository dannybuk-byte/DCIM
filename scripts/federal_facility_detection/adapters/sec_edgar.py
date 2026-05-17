"""
SEC EDGAR facility-section adapter (Item 1 Business, Item 2 Properties, 8-K agreements).
Does not modify AI-rhetoric MD&A / Item 1A extraction path.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path
from typing import Any, Optional

_SCRIPT_DIR = Path(__file__).resolve().parents[2]
if str(_SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(_SCRIPT_DIR))

from _www_pipeline_lib import SecClient, accession_no_dashes, cik_archive_int, pad_cik10
from _www_section_extract import filing_viewer_url

from ..entity_resolution import load_entity_resolution, resolve_operator
from ..models import FacilityDetectionSignal
from ..sec_facility_extract import extract_facility_sections_from_filing_html
from ..signal_factory import sec_section_to_signal
from .base import FacilitySignalAdapter

_8K_AGREEMENT_PAT = re.compile(
    r"(?i)\b(power\s*purchase|ppa\b|colocation|data\s*cent|facility\s*agreement|"
    r"lease\s*agreement|interconnection\s*agreement)\b"
)


class SecEdgarFacilityAdapter(FacilitySignalAdapter):
    def __init__(
        self,
        *,
        cik: str,
        operator_name_raw: str,
        entity_resolution_path: Optional[Path] = None,
        filing_html: Optional[str] = None,
        filing_meta: Optional[dict[str, Any]] = None,
        sec_client: Optional[SecClient] = None,
    ) -> None:
        self.cik = pad_cik10(cik)
        self.operator_name_raw = operator_name_raw
        self.entity_resolution_path = entity_resolution_path
        self.filing_html = filing_html
        self.filing_meta = filing_meta or {}
        self.sec_client = sec_client or SecClient()

    def produce_signals(self) -> list[FacilityDetectionSignal]:
        entity_index = {}
        if self.entity_resolution_path:
            entity_index = load_entity_resolution(self.entity_resolution_path)
        resolved_name, firm_id, _ = resolve_operator(
            cik=self.cik,
            operator_name_raw=self.operator_name_raw,
            entity_index=entity_index,
        )

        html = self.filing_html
        meta = self.filing_meta
        if not html:
            html, meta = self._fetch_latest_10k_html()
        if not html:
            return []

        sections = extract_facility_sections_from_filing_html(html, meta.get("form", "10-K"))
        filing_date = str(meta.get("filing_date") or "1970-01-01")
        source_url = str(
            meta.get("source_url")
            or filing_viewer_url(
                self.cik,
                meta.get("accession_number", ""),
                meta.get("primary_document", ""),
            )
        )

        signals: list[FacilityDetectionSignal] = []
        for key in ("item_1_business", "item_2_properties", "human_capital_resources"):
            block = sections.get(key) or {}
            text = str(block.get("text") or "")
            if not text:
                continue
            signals.append(
                sec_section_to_signal(
                    operator_name_raw=self.operator_name_raw,
                    section_key=key,
                    section_text=text,
                    parsing_confidence=str(block.get("parsing_confidence") or "failed"),
                    filing_date=filing_date,
                    source_url=source_url,
                    cik=self.cik,
                    operator_name_resolved=resolved_name,
                    operator_firm_id=firm_id,
                )
            )

        if meta.get("form") == "8-K" and html:
            sig = self._signal_from_8k(html, filing_date, source_url, resolved_name, firm_id)
            if sig:
                signals.append(sig)
        return signals

    def _fetch_latest_10k_html(self) -> tuple[Optional[str], dict[str, Any]]:
        sub_path = f"submissions/CIK{self.cik}.json"
        sub = self.sec_client.get_json(sub_path)
        recent = (sub.get("filings") or {}).get("recent") or {}
        forms = recent.get("form") or []
        for i, form in enumerate(forms):
            if form != "10-K":
                continue
            acc = recent.get("accessionNumber", [None])[i]
            prim = recent.get("primaryDocument", [None])[i]
            fd = recent.get("filingDate", [None])[i]
            if not acc or not prim:
                continue
            arch = (
                f"edgar/data/{cik_archive_int(self.cik)}/"
                f"{accession_no_dashes(acc)}/{prim}"
            )
            html = self.sec_client.get_archives_text(arch)
            return html, {
                "form": "10-K",
                "filing_date": fd,
                "accession_number": acc,
                "primary_document": prim,
            }
        return None, {}

    def _signal_from_8k(
        self,
        html: str,
        filing_date: str,
        source_url: str,
        resolved_name: Optional[str],
        firm_id: Optional[str],
    ) -> Optional[FacilityDetectionSignal]:
        if not _8K_AGREEMENT_PAT.search(html):
            return None
        return sec_section_to_signal(
            operator_name_raw=self.operator_name_raw,
            section_key="8k_material_agreement",
            section_text=html[:8000],
            parsing_confidence="heuristic",
            filing_date=filing_date,
            source_url=source_url,
            operator_name_resolved=resolved_name,
            operator_firm_id=firm_id,
        )
