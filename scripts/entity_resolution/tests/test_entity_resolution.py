"""
Unit tests for Block 4.5.0 entity resolution (fixtures only).
"""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent
FIXTURES = TESTS_DIR / "fixtures"
SCRIPTS_DIR = TESTS_DIR.parents[1]
if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))

from entity_resolution.candidates import Layer1Candidate
from entity_resolution.emit import build_document, entities_to_firms_shim
from entity_resolution.models import EntityResolutionDocument
from entity_resolution.normalize import names_conflict
from entity_resolution.resolver import (
    ResolutionContext,
    collect_review_items,
    resolve_candidate,
    resolve_layer2_warn_anchored,
)
from entity_resolution.review_queue import render_review_queue_markdown
from entity_resolution.sources.fixture_bundle import FixtureSourceBundle
from entity_resolution.sources.ny_warn import load_warn_rows, distinct_employers_since
from entity_resolution.sources.sec_tickers import SecTickerIndex


class TestStep1Wikidata(unittest.TestCase):
    def test_wikidata_qid_and_aliases(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        ctx = ResolutionContext()
        recs = resolve_candidate(Layer1Candidate("ACME Compute Holdings LLC", "T"), src, ctx)
        self.assertEqual(recs[0].wikidata_qid, "Q9999999")
        self.assertIn("ACME Compute", recs[0].aliases)

    def test_no_wikidata_flag(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(
            Layer1Candidate("Foreign Example Ltd.", "T", foreign_filer_hint=True),
            src,
            ResolutionContext(),
        )
        self.assertIsNone(recs[0].wikidata_qid)
        reasons = [f.reason for f in recs[0].manual_review_flags]
        self.assertTrue(any("no Wikidata" in r for r in reasons))


class TestStep2Sec(unittest.TestCase):
    def test_sec_cik_resolved(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME Compute Holdings LLC", "T"), src, ResolutionContext())
        self.assertEqual(recs[0].sec_identifiers.cik, "0000999999")
        self.assertTrue(recs[0].is_sec_filer)

    def test_foreign_filer_flag(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(
            Layer1Candidate("Foreign Example Ltd.", "T", foreign_filer_hint=True),
            src,
            ResolutionContext(),
        )
        self.assertTrue(recs[0].is_foreign_primary)
        self.assertIsNone(recs[0].sec_identifiers.cik)


class TestStep3Sam(unittest.TestCase):
    def test_multi_uei_array(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME Holdings Inc.", "T"), src, ResolutionContext())
        ueis = recs[0].federal_procurement_identifiers.uei or []
        self.assertEqual(len(ueis), 2)
        self.assertTrue(
            any("multiple UEIs" in f.reason for f in recs[0].manual_review_flags)
        )


class TestStep4Warn(unittest.TestCase):
    def test_warn_variants_preserved(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME Compute Holdings LLC", "T"), src, ResolutionContext())
        variants = recs[0].ny_warn_identifiers.employer_name_variants or []
        self.assertEqual(len(variants), 2)
        self.assertIn("ACME COMPUTE HLDGS LLC", variants)


class TestStep5Ocp(unittest.TestCase):
    def test_ocp_tier(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME Compute Holdings LLC", "T"), src, ResolutionContext())
        self.assertEqual(recs[0].ocp_identifiers.membership_tier, "Gold")


class TestStep6ParentSubsidiary(unittest.TestCase):
    def test_subsidiary_separate_record(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        parent_recs = resolve_candidate(Layer1Candidate("ACME Holdings Inc.", "T"), src, ResolutionContext())
        self.assertGreaterEqual(len(parent_recs), 2)
        child = next((r for r in parent_recs if r.parent_firm_id), None)
        self.assertIsNotNone(child)
        self.assertEqual(child.sec_identifiers.cik, "0000999997")


class TestStep7Conflicts(unittest.TestCase):
    def test_wikidata_sec_name_conflict_flag(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME Compute Holdings LLC", "T"), src, ResolutionContext())
        self.assertTrue(
            any(f.field == "canonical_legal_name" for f in recs[0].manual_review_flags)
        )

    def test_no_auto_merge_under_conflict(self) -> None:
        self.assertTrue(names_conflict("ACME Compute Holdings LLC", "ACME COMPUTE HLDGS LLC"))


class TestAliasCollision(unittest.TestCase):
    def test_ambiguous_qid_to_review(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME Conflict Test Corp", "T"), src, ResolutionContext())
        self.assertTrue(
            any("multiple Wikidata QID" in f.reason for f in recs[0].manual_review_flags)
        )


class TestReviewQueue(unittest.TestCase):
    def test_review_queue_markdown_empty(self) -> None:
        md = render_review_queue_markdown(entities=[], items=[])
        self.assertIn("Total review items: 0", md)

    def test_review_queue_populated(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME Compute Holdings LLC", "T"), src, ResolutionContext())
        items = collect_review_items(recs)
        md = render_review_queue_markdown(entities=recs, items=items)
        self.assertIn("Review Item", md)
        self.assertIn("Conflict sources", md)


class TestLayer2Warn(unittest.TestCase):
    def test_layer2_unresolved_flag(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        ctx = ResolutionContext()
        resolve_candidate(Layer1Candidate("ACME Compute Holdings LLC", "T"), src, ctx)
        layer2 = resolve_layer2_warn_anchored(["Mystery WARN Employer LLC"], src, ctx)
        self.assertEqual(len(layer2), 1)
        self.assertTrue(
            any("Layer 2" in f.reason for f in layer2[0].manual_review_flags)
        )


class TestOutputSchema(unittest.TestCase):
    def test_document_validates(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME Compute Holdings LLC", "T"), src, ResolutionContext())
        doc = build_document(recs)
        EntityResolutionDocument.model_validate(doc.model_dump())
        self.assertGreater(len(doc.firms), 0)

    def test_firms_shim_for_federal_consumer(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME Compute Holdings LLC", "T"), src, ResolutionContext())
        shim = entities_to_firms_shim(recs)
        self.assertEqual(shim[0]["cik"], "0000999999")


class TestSecTickerIndex(unittest.TestCase):
    def test_company_tickers_cache_lookup(self) -> None:
        tickers = Path("data/cache/company_tickers.json")
        if not tickers.is_file():
            self.skipTest("company_tickers.json not present")
        idx = SecTickerIndex.from_json_path(tickers)
        _cik, title, _t = idx.rows[0]
        hit = idx.lookup(title, [])
        self.assertEqual(hit.cik, _cik)


class TestLowConfidenceDownstream(unittest.TestCase):
    def test_unresolved_layer1_has_review_flags(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(
            Layer1Candidate("Foreign Example Ltd.", "T", foreign_filer_hint=True),
            src,
            ResolutionContext(),
        )
        self.assertGreater(len(recs[0].manual_review_flags), 0)


class TestRemediationAudit(unittest.TestCase):
    def test_no_wikidata_filler_suppressed_from_queue(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("Example SEC Only LLC", "T"), src, ResolutionContext())
        ent = recs[0]
        self.assertTrue(any(f.reason == "no Wikidata entry" for f in ent.manual_review_flags))
        items = collect_review_items(recs)
        self.assertFalse(any("no Wikidata entry" in i.reason for i in items))

    def test_layer1_unresolved_still_queues(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(
            Layer1Candidate("Foreign Example Ltd.", "T", foreign_filer_hint=True),
            src,
            ResolutionContext(),
        )
        items = collect_review_items(recs)
        self.assertTrue(
            any("could not be resolved against any source" in i.reason for i in items)
        )

    def test_foreign_filer_observatory_not_in_queue(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(
            Layer1Candidate("Foreign Example Ltd.", "T", foreign_filer_hint=True),
            src,
            ResolutionContext(),
        )
        ent = recs[0]
        self.assertTrue(ent.is_foreign_primary)
        self.assertTrue(
            any(f.reason == "foreign-filer observatory-layer candidate" for f in ent.manual_review_flags)
        )
        items = collect_review_items(recs)
        self.assertFalse(
            any("foreign-filer observatory" in i.reason for i in items)
        )

    def test_sec_canonical_name_policy(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME IBM Style LLC", "T"), src, ResolutionContext())
        ent = recs[0]
        self.assertEqual(ent.canonical_legal_name, "ACME QRX HOLDINGS CORP")
        self.assertIn("ACME ZED", ent.aliases)
        items = collect_review_items(recs)
        self.assertTrue(
            any("conflicts with SEC EDGAR" in i.reason for i in items)
        )

    def test_acme_compute_sec_canonical(self) -> None:
        src = FixtureSourceBundle(FIXTURES)
        recs = resolve_candidate(Layer1Candidate("ACME Compute Holdings LLC", "T"), src, ResolutionContext())
        ent = recs[0]
        self.assertEqual(ent.canonical_legal_name, "ACME COMPUTE HLDGS LLC")
        self.assertIn("ACME Compute Holdings LLC", ent.aliases)


if __name__ == "__main__":
    unittest.main()
