"""
Unit tests for federal facility detection (fixtures only; no live APIs).
"""

from __future__ import annotations

import json
import sys
import unittest
import uuid
from io import BytesIO
from pathlib import Path

from openpyxl import Workbook

TESTS_DIR = Path(__file__).resolve().parent
FIXTURES = TESTS_DIR / "fixtures"
PKG_ROOT = TESTS_DIR.parent
SCRIPTS_DIR = PKG_ROOT.parent
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from federal_facility_detection.adapters.courtlistener import CourtListenerFacilityAdapter
from federal_facility_detection.adapters.nyiso import NyisoQueueAdapter, discover_nyiso_queue_xlsx_url
from federal_facility_detection.adapters.pjm import PjmQueueAdapter
from federal_facility_detection.adapters.sec_edgar import SecEdgarFacilityAdapter
from federal_facility_detection.confidence import assess_queue_signal, assess_sec_facility_signal
from federal_facility_detection.entity_resolution import load_entity_resolution, resolve_operator
from federal_facility_detection.models import FacilityDetectionSignal
from federal_facility_detection.normalize import text_has_facility_naming_patterns
from federal_facility_detection.sec_facility_extract import extract_facility_sections_from_filing_html
from federal_facility_detection.signal_factory import queue_record_to_signal, sec_section_to_signal
from federal_facility_detection.warrant_tags import CANONICAL_WARRANT_TAGS, validate_warrant_tags


def _build_nyiso_xlsx(path: Path) -> None:
    wb = Workbook()
    ws = wb.active
    ws.append(
        [
            "Queue Position",
            "Project Name",
            "Interconnection Customer",
            "Status",
            "County",
            "MW",
            "Type",
        ]
    )
    ws.append(
        [
            "TEST-NYISO-001",
            "Example Wind Farm",
            "Example Power LLC",
            "Planning",
            "Example County, NY",
            "80",
            "Wind",
        ]
    )
    wb.save(path)
    wb.close()


class TestWarrantTags(unittest.TestCase):
    def test_canonical_enum_count(self) -> None:
        self.assertEqual(len(CANONICAL_WARRANT_TAGS), 9)

    def test_rejects_invalid(self) -> None:
        with self.assertRaises(ValueError):
            validate_warrant_tags(["DESCRIPTIVE", "NOT_A_TAG"])


class TestQueueAdapters(unittest.TestCase):
    def test_pjm_fixture_generation_queue(self) -> None:
        adapter = PjmQueueAdapter(fixture_path=FIXTURES / "pjm_queue_row.json")
        records = adapter.fetch_queue_records()
        self.assertGreaterEqual(len(records), 2)
        spv_row = next(r for r in records if "ACME" in r.developer_name)
        self.assertEqual(spv_row.iso, "PJM")
        self.assertEqual(spv_row.queue_type, "generation")

    def test_pjm_large_load_row(self) -> None:
        adapter = PjmQueueAdapter(fixture_path=FIXTURES / "pjm_queue_row.json")
        records = adapter.fetch_queue_records()
        load_row = next(r for r in records if r.queue_type == "large_load")
        assessed = assess_queue_signal(
            queue_type=load_row.queue_type,
            status_normalized=load_row.status_normalized,
            has_state=bool(load_row.location_normalized.get("state")),
            operator_resolved=False,
            iso="PJM",
        )
        self.assertFalse(assessed["downstream_action_allowed"])

    def test_nyiso_xlsx_fixture(self) -> None:
        xlsx_path = TESTS_DIR / "_tmp_nyiso.xlsx"
        try:
            _build_nyiso_xlsx(xlsx_path)
            adapter = NyisoQueueAdapter(xlsx_path=xlsx_path)
            records = adapter.fetch_queue_records()
            self.assertEqual(len(records), 1)
            self.assertEqual(records[0].iso, "NYISO")
        finally:
            if xlsx_path.is_file():
                xlsx_path.unlink()

    def test_nyiso_url_discovery(self) -> None:
        html = (FIXTURES / "nyiso_interconnections_page.html").read_text(encoding="utf-8")
        url = discover_nyiso_queue_xlsx_url(html)
        self.assertIn("NYISO-Interconnection-Queue.xlsx", url or "")


class TestEntityResolution(unittest.TestCase):
    def test_resolved_cik(self) -> None:
        idx = load_entity_resolution(FIXTURES / "entity_resolution.json")
        name, firm_id, pos = resolve_operator(
            cik="999999",
            operator_name_raw="ACME Compute Holdings LLC",
            entity_index=idx,
        )
        self.assertEqual(firm_id, "firm-acme-compute-0001")
        self.assertEqual(pos, "operator_resolved")

    def test_unresolved_spv(self) -> None:
        idx = load_entity_resolution(FIXTURES / "entity_resolution.json")
        name, firm_id, pos = resolve_operator(
            cik=None,
            operator_name_raw="Mystery SPV Holdings LLC",
            entity_index=idx,
        )
        self.assertIsNone(firm_id)
        self.assertIsNone(name)
        self.assertIsNone(pos)


class TestSecFacilityExtract(unittest.TestCase):
    def test_item_sections_from_fixture_html(self) -> None:
        html = (FIXTURES / "sec_filing_snippet.html").read_text(encoding="utf-8")
        sections = extract_facility_sections_from_filing_html(html, "10-K")
        self.assertTrue(text_has_facility_naming_patterns(sections["item_1_business"]["text"]))
        self.assertIn(
            sections["item_2_properties"]["parsing_confidence"],
            ("heuristic", "approximate", "clean"),
        )

    def test_sec_adapter_produces_signals(self) -> None:
        meta = json.loads((FIXTURES / "sec_metadata.json").read_text(encoding="utf-8"))
        html = (FIXTURES / "sec_filing_snippet.html").read_text(encoding="utf-8")
        adapter = SecEdgarFacilityAdapter(
            cik=meta["cik"],
            operator_name_raw=meta["operator_name"],
            entity_resolution_path=FIXTURES / "entity_resolution.json",
            filing_html=html,
            filing_meta=meta,
        )
        signals = adapter.produce_signals()
        self.assertGreater(len(signals), 0)
        self.assertTrue(all(s.source_family == "SEC" for s in signals))

    def test_low_confidence_blocks_downstream(self) -> None:
        assessed = assess_sec_facility_signal(
            section_key="item_1_business",
            parsing_confidence="failed",
            has_facility_language=False,
            operator_resolved=False,
            has_state=False,
        )
        self.assertEqual(assessed["confidence_level"], "low")
        self.assertFalse(assessed["downstream_action_allowed"])

    def test_generation_queue_spv_corroborative(self) -> None:
        adapter = PjmQueueAdapter(fixture_path=FIXTURES / "pjm_queue_row.json")
        rec = next(r for r in adapter.fetch_queue_records() if "ACME" in r.developer_name)
        idx = load_entity_resolution(FIXTURES / "entity_resolution.json")
        _, firm_id, _ = resolve_operator(cik="999999", operator_name_raw=rec.developer_name, entity_index=idx)
        sig = queue_record_to_signal(rec, operator_firm_id=firm_id, operator_name_resolved="ACME Compute Holdings LLC")
        self.assertEqual(sig.queue_type, "generation")
        self.assertFalse(sig.downstream_action_allowed)
        self.assertTrue(sig.coalition_action_unsupported)


class TestSignalSchema(unittest.TestCase):
    def test_high_confidence_downstream_allowed_fixture(self) -> None:
        """Synthetic high-confidence signal for schema boundary testing (not live inference)."""
        sig = FacilityDetectionSignal(
            signal_id=str(uuid.uuid4()),
            source_family="TEST",
            source_name="synthetic_corroboration_bundle",
            operator_name_raw="ACME Compute Holdings LLC",
            operator_name_resolved="ACME Compute Holdings LLC",
            operator_firm_id="firm-acme-compute-0001",
            facility_location_granularity="state",
            geography_raw="Example State, US",
            geography_normalized={"state": "EX"},
            capacity_mw=50.0,
            signal_date="2025-01-01",
            fetched_at="2025-01-01T00:00:00+00:00",
            source_url="https://example.test/synthetic",
            signal_class="planning",
            queue_type=None,
            confidence_level="high",
            confidence_rationale="Synthetic multi-source corroboration fixture for downstream gate testing.",
            warrant_tags=["DESCRIPTIVE", "STRUCTURAL", "SYNTHESIS"],
            pending_verification=[],
            escalation_required=False,
            escalation_rationale=None,
            manual_review_required=True,
            manual_review_rationale="Synthetic fixture; analyst review still required.",
            downstream_action_allowed=True,
            inference_chain_position="operator_resolved",
            supports_direct_facility_detection=False,
            provisional_pending_operator_confirmation=False,
            coalition_action_unsupported=True,
            coalition_action_unsupported_rationale="Methodology outputs confidence gates only; no coalition recommendations.",
        )
        self.assertTrue(sig.downstream_action_allowed)

    def test_placeholder_raises(self) -> None:
        with self.assertRaises(NotImplementedError):
            CourtListenerFacilityAdapter().produce_signals()


if __name__ == "__main__":
    unittest.main()
