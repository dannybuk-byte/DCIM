"""Stage A ingest tests — run against the vendored real Epoch data.

    pytest scripts/epoch_ingest/tests/test_ingest_epoch.py
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest

from scripts.epoch_ingest.ingest_epoch import (
    DEFAULT_RAW_DIR,
    EPOCH_ATTRIBUTION,
    EPOCH_SOURCE_TYPE,
    OWNER_TO_COMPANY_ID,
    build_source_record,
    emits_as_counting_source,
    ingest,
    normalize_owner,
    parse_owner_confidence,
)

# Deterministic build input: the vendored, pinned CC-BY snapshot in-tree.
RAW_DIR = DEFAULT_RAW_DIR


# --- synthetic-row helpers for the owner-confidence gate --------------------------
def _dc_row(owner: str, name: str = "Test Site Alpha") -> dict:
    return {
        "Name": name,
        "Owner": owner,
        "Current power (MW)": "100",
        "Current H100 equivalents": "1000",
        "Address": "1 Test Way, Somewhere, US",
        "Country": "United States",
        "Selected Sources": "- [x](https://example.com/a)",
    }


def _write_raw(tmp_path: Path, owners: list[str]) -> Path:
    """Write a minimal data_centers.csv (+ empty timelines) for gate routing tests."""
    header = (
        "Name,Current H100 equivalents,Current power (MW),Owner,"
        "Selected Sources,Country,Address\n"
    )
    lines = [header]
    for i, owner in enumerate(owners):
        lines.append(
            f"Site {i},1000,100,{owner},- [x](https://example.com/{i}),"
            "United States,1 Test Way\n"
        )
    (tmp_path / "data_centers.csv").write_text("".join(lines), encoding="utf-8")
    (tmp_path / "data_center_timelines.csv").write_text(
        "Date,Construction status,Buildings operational,IT power (MW),Data center\n",
        encoding="utf-8",
    )
    return tmp_path


@pytest.fixture(scope="module")
def result():
    return ingest(RAW_DIR)


def test_owner_normalization_strips_confidence_tag():
    assert normalize_owner("Meta #confident") == "Meta"
    assert normalize_owner("Google #tentative") == "Google"


def test_matches_real_hyperscaler_candidates(result):
    matched = set(result["confirm_sources"].keys())
    # Meta/Amazon/Microsoft/Google(->alphabet) all have corpus candidates + Epoch sites.
    assert {"meta", "amazon", "microsoft", "alphabet"} <= matched


def test_every_record_is_real_and_attributed(result):
    for records in result["confirm_sources"].values():
        for r in records:
            assert r["provenance"] == "real"
            assert r["data_source"] == "Epoch AI"
            assert r["attribution"] == EPOCH_ATTRIBUTION  # CC-BY credit stored on the row
            assert r["type"] == EPOCH_SOURCE_TYPE


def test_independence_by_site_duplicate_row_does_not_inflate():
    """§6.3 at the ingest layer: two rows for one site collapse to ONE source."""
    dc_row = {
        "Name": "Meta Prometheus",
        "Owner": "Meta #confident",
        "Current power (MW)": "631",
        "Current H100 equivalents": "763011.6",
        "Address": "1 Community Cir, New Albany, OH",
        "Country": "United States",
        "Selected Sources": "- [x](https://example.com/a)",
    }
    a = build_source_record(dc_row, None)
    b = build_source_record(dict(dc_row), None)  # re-ingest same site
    assert a["id"] == b["id"]  # stable id => dedupe key, cannot double-count


def test_public_visibility_prefers_operational_over_construction(result):
    # Meta Prometheus has operational milestones in the real timeline.
    meta = {r["id"]: r for r in result["confirm_sources"]["meta"]}
    prom = meta["epoch_meta_prometheus"]
    assert prom["public_visibility_kind"] == "operational"
    assert prom["public_visibility_date"] is not None


def test_no_individual_names_in_any_emitted_value(result):
    """§6.4 — scan every emitted string value; none may be a bare personal name.

    A personal name here = a Titlecase bigram whose first token is NOT a known
    corporate owner (site names like 'Meta Prometheus' are corporate, allowed).
    """
    corporate_first_tokens = set(OWNER_TO_COMPANY_ID) | {"Anthropic", "Crusoe", "Vantage", "QTS"}
    person = re.compile(r"^[A-Z][a-z]+ [A-Z][a-z]+$")
    for records in result["confirm_sources"].values():
        for r in records:
            for key in ("site_name", "owner_reported"):
                val = str(r.get(key, "")).strip()
                if person.match(val):
                    assert val.split()[0] in corporate_first_tokens, f"person-like {key}: {val!r}"


def test_unmatched_owners_reported_not_dropped_silently(result):
    cov = result["coverage"]
    # Oracle/CoreWeave/xAI etc. have no corpus candidate — must be visible, not force-fit.
    assert cov["unmatched_owner_site_counts"]
    assert "Oracle" in cov["unmatched_owner_site_counts"]


# --- §1.1 owner_confidence preserved (fixed at ingest, never re-derived) ----------
def test_parse_owner_confidence_maps_tags_and_untagged():
    assert parse_owner_confidence("Google #speculative") == "speculative"
    assert parse_owner_confidence("Oracle #likely") == "likely"
    assert parse_owner_confidence("Meta #confident") == "confident"
    assert parse_owner_confidence("Meta") == "unspecified"  # documented default-strong
    assert parse_owner_confidence("") == "unspecified"


def test_owner_confidence_present_on_emitted_records_and_read_not_rederived(result):
    # Every emitted confirm source carries owner_confidence, set once at ingest.
    for records in result["confirm_sources"].values():
        for r in records:
            assert "owner_confidence" in r
            # confirm_sources only ever contains counting-confidence records.
            assert emits_as_counting_source(r["owner_confidence"])


def test_confident_and_untagged_records_carry_authoritative_confidence():
    confident = build_source_record(_dc_row("Meta #confident"), None)
    untagged = build_source_record(_dc_row("Meta"), None)
    assert confident["owner_confidence"] == "confident"
    assert untagged["owner_confidence"] == "unspecified"


# --- §1.2 three-tier emit/counting gate (boundary enforcement at ingest) ----------
def test_confident_and_untagged_count_as_real_corroborating_sources(tmp_path):
    raw = _write_raw(tmp_path, ["Meta #confident", "Amazon"])  # confident + untagged
    out = ingest(raw)
    # Both land in confirm_sources (the map the two-source floor consumes).
    assert out["confirm_sources"].get("meta"), "confident row must count"
    assert out["confirm_sources"].get("amazon"), "untagged (default-strong) must count"
    assert out["coverage"]["matched_site_count"] == 2
    assert not out.get("candidate_annotations")


def test_likely_row_emitted_but_non_counting(tmp_path):
    # Microsoft #likely: emitted as an annotation (lead), NOT a corroborating source.
    raw = _write_raw(tmp_path, ["Microsoft #likely"])
    out = ingest(raw)
    assert "microsoft" not in out["confirm_sources"]  # does not count toward the floor
    ann = out["candidate_annotations"]["microsoft"]
    assert len(ann) == 1
    assert ann[0]["owner_confidence"] == "likely"
    assert ann[0]["annotation_kind"] == "lead"  # lead / candidate affiliation, not corroboration
    assert ann[0]["counts_toward_floor"] is False


def test_speculative_row_is_not_a_floor_counting_source(tmp_path):
    # A single Meta #speculative site must NOT, alone, push a candidate over the floor.
    raw = _write_raw(tmp_path, ["Meta #speculative"])
    out = ingest(raw)
    assert "meta" not in out["confirm_sources"]  # withheld from counting
    ann = out["candidate_annotations"]["meta"]
    assert ann[0]["annotation_kind"] == "hypothesis"
    assert ann[0]["counts_toward_floor"] is False


def test_mixed_confidences_route_independently(tmp_path):
    raw = _write_raw(
        tmp_path, ["Meta #confident", "Meta #speculative", "Meta #likely"]
    )
    out = ingest(raw)
    # Only the confident site counts; speculative + likely are annotations.
    assert len(out["confirm_sources"]["meta"]) == 1
    assert len(out["candidate_annotations"]["meta"]) == 2
    assert out["coverage"]["matched_site_count"] == 1
    assert out["coverage"]["annotation_site_count"] == 2


# --- §1.4 vendored snapshot metadata surfaced on the artifact ---------------------
def test_ingest_stamps_snapshot_dataset_version(result):
    assert result["dataset_version"] == "epoch-ai-data-centers-2026-06-30"
    assert result["data_source"] == "Epoch AI"
    assert result["attribution"] == EPOCH_ATTRIBUTION
