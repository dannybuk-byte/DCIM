"""Tests for scripts/_audit_log.py.

Verifies the append-only JSONL writer against the audit log shape described
in docs/runtime-epistemic-contract.md §Audit log shape. Tests both input
modes (dict envelope, envelope producer), JSONL formatting invariants,
filesystem behavior, returned event_id, and non-ASCII preservation.

Uses pytest's tmp_path fixture for isolated filesystem state; no test
touches a shared path.

Run from repo root:
    pytest tests/test_audit_log.py
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from scripts._audit_log import (
    AuditLogError,
    write_outcome,
)
from scripts._epistemic_outcomes import (
    FetchTimeout,
    InsufficientSources,
    SourceRecord,
    SuccessOutcome,
)


REQUIRED_KEYS = (
    "schema_version",
    "event_id",
    "outcome",
    "timestamp",
    "pipeline_stage",
    "evaluation_ref",
    "details",
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _make_dict_envelope(event_id: str = "outcome_test_000") -> dict:
    """Build a well-formed dict envelope for direct-write tests."""
    return {
        "schema_version": "runtime_epistemic_contract.v1",
        "event_id": event_id,
        "outcome": "success",
        "timestamp": "2026-05-17T14:32:11.482Z",
        "pipeline_stage": "test_stage",
        "evaluation_ref": "test_case",
        "details": {
            "case_card_uri": "file:///cases/test.json",
            "sources": [],
            "score": {},
        },
    }


def _make_success_producer() -> SuccessOutcome:
    return SuccessOutcome(
        case_card_uri="file:///cases/test_alpha.json",
        sources=[
            SourceRecord(layer="L1", source_id="warn_001", warrant_state="primary"),
        ],
    )


# ---------------------------------------------------------------------------
# 1. Input modes
# ---------------------------------------------------------------------------


def test_write_outcome_accepts_dict_envelope(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    envelope = _make_dict_envelope("outcome_test_dict_001")

    returned = write_outcome(envelope, log_path)

    assert returned == "outcome_test_dict_001"
    assert log_path.exists()


def test_write_outcome_accepts_success_outcome_producer(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    outcome = _make_success_producer()

    returned = write_outcome(
        outcome,
        log_path,
        pipeline_stage="emit_case_cards",
        evaluation_ref="case_alpha",
    )

    assert returned.startswith("outcome_")
    assert log_path.exists()


def test_write_outcome_accepts_operational_failure_producer(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    err = FetchTimeout(error_summary="upstream timeout")

    returned = write_outcome(
        err,
        log_path,
        pipeline_stage="build_candidate_list",
    )

    assert returned.startswith("outcome_")
    persisted = json.loads(log_path.read_text(encoding="utf-8").splitlines()[0])
    assert persisted["outcome"] == "operational_failure"
    assert persisted["evaluation_ref"] is None


def test_write_outcome_accepts_epistemic_failure_producer(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    err = InsufficientSources(reason="only L3 source available")

    returned = write_outcome(
        err,
        log_path,
        pipeline_stage="emit_case_cards",
        evaluation_ref="candidate_beta",
    )

    assert returned.startswith("outcome_")
    persisted = json.loads(log_path.read_text(encoding="utf-8").splitlines()[0])
    assert persisted["outcome"] == "epistemic_state"
    assert persisted["evaluation_ref"] == "candidate_beta"


def test_mixed_input_modes_in_sequence(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"

    write_outcome(_make_dict_envelope("first_dict"), log_path)
    write_outcome(
        _make_success_producer(),
        log_path,
        pipeline_stage="emit_case_cards",
        evaluation_ref="case_alpha",
    )
    write_outcome(
        FetchTimeout(error_summary="t"),
        log_path,
        pipeline_stage="build_candidate_list",
    )

    lines = log_path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 3
    parsed = [json.loads(line) for line in lines]
    assert parsed[0]["event_id"] == "first_dict"
    assert parsed[1]["outcome"] == "success"
    assert parsed[2]["outcome"] == "operational_failure"


# ---------------------------------------------------------------------------
# 2. JSONL invariants
# ---------------------------------------------------------------------------


def test_one_object_per_line(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    write_outcome(_make_dict_envelope("id_1"), log_path)
    write_outcome(_make_dict_envelope("id_2"), log_path)
    write_outcome(_make_dict_envelope("id_3"), log_path)

    lines = log_path.read_text(encoding="utf-8").splitlines()
    assert len(lines) == 3
    for line in lines:
        # Each line must be valid JSON on its own.
        parsed = json.loads(line)
        assert "event_id" in parsed


def test_lines_are_newline_terminated(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    write_outcome(_make_dict_envelope("id_1"), log_path)
    write_outcome(_make_dict_envelope("id_2"), log_path)

    content = log_path.read_text(encoding="utf-8")
    assert content.endswith("\n")
    # Two writes → two newline terminators, no extra blank lines.
    assert content.count("\n") == 2


def test_append_preserves_prior_lines(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    write_outcome(_make_dict_envelope("first"), log_path)
    write_outcome(_make_dict_envelope("second"), log_path)
    write_outcome(_make_dict_envelope("third"), log_path)

    lines = log_path.read_text(encoding="utf-8").splitlines()
    parsed_ids = [json.loads(line)["event_id"] for line in lines]
    assert parsed_ids == ["first", "second", "third"]


def test_written_event_id_matches_persisted(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    envelope = _make_dict_envelope("specific_event_id_xyz")

    returned = write_outcome(envelope, log_path)
    line = log_path.read_text(encoding="utf-8").splitlines()[0]
    persisted = json.loads(line)

    assert returned == persisted["event_id"] == "specific_event_id_xyz"


# ---------------------------------------------------------------------------
# 3. Filesystem behavior
# ---------------------------------------------------------------------------


def test_parent_directory_is_created(tmp_path: Path):
    log_path = tmp_path / "deep" / "nested" / "audit.jsonl"
    assert not log_path.parent.exists()

    write_outcome(_make_dict_envelope(), log_path)

    assert log_path.parent.exists()
    assert log_path.exists()


def test_missing_all_required_keys_raises(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    malformed = {"outcome": "success"}

    with pytest.raises(AuditLogError) as exc_info:
        write_outcome(malformed, log_path)

    assert "missing required" in str(exc_info.value).lower()


@pytest.mark.parametrize("missing_key", REQUIRED_KEYS)
def test_each_individually_missing_key_is_caught(tmp_path: Path, missing_key: str):
    log_path = tmp_path / "audit.jsonl"
    base = _make_dict_envelope()
    incomplete = {k: v for k, v in base.items() if k != missing_key}

    with pytest.raises(AuditLogError):
        write_outcome(incomplete, log_path)


@pytest.mark.parametrize(
    "invalid_input",
    ["not a dict or producer", 42, None, [1, 2, 3], object()],
    ids=["string", "int", "none", "list", "bare_object"],
)
def test_invalid_input_type_raises_audit_log_error(tmp_path: Path, invalid_input):
    log_path = tmp_path / "audit.jsonl"
    with pytest.raises(AuditLogError):
        write_outcome(invalid_input, log_path)


def test_producer_without_pipeline_stage_raises(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    outcome = _make_success_producer()

    with pytest.raises(AuditLogError) as exc_info:
        write_outcome(outcome, log_path)

    assert "pipeline_stage" in str(exc_info.value)


def test_success_producer_without_evaluation_ref_raises(tmp_path: Path):
    # SuccessOutcome.to_envelope requires evaluation_ref; the writer should
    # surface that as AuditLogError, not let TypeError escape.
    log_path = tmp_path / "audit.jsonl"
    outcome = _make_success_producer()

    with pytest.raises(AuditLogError):
        write_outcome(outcome, log_path, pipeline_stage="emit_case_cards")


# ---------------------------------------------------------------------------
# 4. Returned value
# ---------------------------------------------------------------------------


def test_returned_event_id_matches_dict_input(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    envelope = _make_dict_envelope("expected_id_abc")
    returned = write_outcome(envelope, log_path)
    assert returned == "expected_id_abc"


def test_returned_event_id_matches_producer_generated_id(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    err = FetchTimeout(error_summary="test")

    returned = write_outcome(
        err,
        log_path,
        pipeline_stage="build_candidate_list",
    )

    persisted = json.loads(log_path.read_text(encoding="utf-8").splitlines()[0])
    assert returned == persisted["event_id"]


# ---------------------------------------------------------------------------
# 5. Non-ASCII preservation
# ---------------------------------------------------------------------------


def test_non_ascii_preserved_as_literal_characters(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    envelope = _make_dict_envelope()
    envelope["details"]["employer_name"] = "Volkswagen São Paulo, München GmbH"

    write_outcome(envelope, log_path)

    raw = log_path.read_text(encoding="utf-8")
    # Literal characters appear in the file.
    assert "São Paulo" in raw
    assert "München" in raw
    # Their escaped equivalents do not.
    assert "\\u00e3" not in raw  # ã
    assert "\\u00fc" not in raw  # ü


def test_non_ascii_round_trips_through_json_parse(tmp_path: Path):
    log_path = tmp_path / "audit.jsonl"
    envelope = _make_dict_envelope()
    envelope["details"]["employer_name"] = "São Paulo, München"

    write_outcome(envelope, log_path)
    line = log_path.read_text(encoding="utf-8").splitlines()[0]
    parsed = json.loads(line)

    assert parsed["details"]["employer_name"] == "São Paulo, München"
