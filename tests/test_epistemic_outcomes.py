"""Tests for scripts/_epistemic_outcomes.py.

Contract-only tests that verify the wire-format envelope produced by each
outcome type matches docs/runtime-epistemic-contract.md. No pipeline
integration is exercised here; no audit log is written.

These tests are intentionally mechanical. They check that:
  - Every envelope has the required keys.
  - Event IDs are unique, prefixed, and independent of evaluation_ref.
  - Each outcome class string maps to the right exception/dataclass.
  - Default dispositions and retryable flags match the contract.
  - SourceRecord serializes cleanly with optional fetched_at.

Run from repo root:
    pytest tests/test_epistemic_outcomes.py
"""

from __future__ import annotations

import pytest

from scripts._epistemic_outcomes import (
    # Constants
    SCHEMA_VERSION,
    OUTCOME_SUCCESS,
    OUTCOME_OPERATIONAL_FAILURE,
    OUTCOME_EPISTEMIC_STATE,
    DISPOSITION_SUPPRESS,
    DISPOSITION_REVIEW_QUEUE,
    # Helpers
    utc_now_iso,
    generate_event_id,
    # Types
    SourceRecord,
    SuccessOutcome,
    # Operational
    FetchTimeout,
    FetchError,
    ParseError,
    DownstreamUnavailable,
    # Epistemic
    InsufficientSources,
    ProvenanceBreak,
    EntityAmbiguity,
)


REQUIRED_ENVELOPE_KEYS = {
    "schema_version",
    "event_id",
    "outcome",
    "timestamp",
    "pipeline_stage",
    "evaluation_ref",
    "details",
}


# ---------------------------------------------------------------------------
# Envelope factories — reduce duplication across tests
# ---------------------------------------------------------------------------


def _make_success_envelope() -> dict:
    outcome = SuccessOutcome(
        case_card_uri="file:///cases/test_alpha.json",
        sources=[
            SourceRecord(layer="L1", source_id="warn_ny_2026_001", warrant_state="primary"),
            SourceRecord(layer="L3", source_id="sec_10k_alpha_2026", warrant_state="corroborating"),
        ],
    )
    return outcome.to_envelope(
        pipeline_stage="emit_case_cards",
        evaluation_ref="case_alpha",
    )


def _make_operational_envelope(cls=FetchTimeout) -> dict:
    failure = cls(error_summary="test failure")
    return failure.to_envelope(pipeline_stage="build_candidate_list")


def _make_epistemic_envelope(cls=InsufficientSources) -> dict:
    failure = cls(reason="test reason")
    return failure.to_envelope(
        pipeline_stage="emit_case_cards",
        evaluation_ref="candidate_beta",
    )


# ---------------------------------------------------------------------------
# 1. Envelope invariants
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "envelope_factory",
    [
        _make_success_envelope,
        lambda: _make_operational_envelope(FetchTimeout),
        lambda: _make_operational_envelope(FetchError),
        lambda: _make_operational_envelope(ParseError),
        lambda: _make_operational_envelope(DownstreamUnavailable),
        lambda: _make_epistemic_envelope(InsufficientSources),
        lambda: _make_epistemic_envelope(ProvenanceBreak),
        lambda: _make_epistemic_envelope(EntityAmbiguity),
    ],
    ids=[
        "success",
        "operational_fetch_timeout",
        "operational_fetch_error",
        "operational_parse_error",
        "operational_downstream_unavailable",
        "epistemic_insufficient_sources",
        "epistemic_provenance_break",
        "epistemic_entity_ambiguity",
    ],
)
def test_envelope_has_required_keys(envelope_factory):
    envelope = envelope_factory()
    missing = REQUIRED_ENVELOPE_KEYS - set(envelope.keys())
    assert not missing, f"Envelope missing required keys: {missing}"


def test_envelope_schema_version_is_contract_version():
    envelope = _make_success_envelope()
    assert envelope["schema_version"] == SCHEMA_VERSION
    assert envelope["schema_version"] == "runtime_epistemic_contract.v1"


def test_envelope_timestamp_is_iso_8601_with_z_suffix():
    envelope = _make_success_envelope()
    timestamp = envelope["timestamp"]
    assert timestamp.endswith("Z")
    # Format: YYYY-MM-DDTHH:MM:SS.mmmZ — 24 characters.
    assert len(timestamp) == 24


# ---------------------------------------------------------------------------
# 2. Event ID behavior
# ---------------------------------------------------------------------------


def test_event_id_starts_with_outcome_prefix():
    assert generate_event_id().startswith("outcome_")


def test_event_id_does_not_require_evaluation_ref():
    # generate_event_id takes no evaluation_ref parameter by design.
    # Audit-log identity is event identity, not case identity.
    event_id = generate_event_id()
    assert event_id.startswith("outcome_")


def test_two_event_ids_are_distinct():
    a = generate_event_id()
    b = generate_event_id()
    assert a != b


def test_event_id_embeds_provided_timestamp():
    event_id = generate_event_id(timestamp="2026-05-17T14:32:11.482Z")
    assert "20260517_143211_482" in event_id


def test_event_ids_unique_across_many_generations():
    # Catch UUID collision regressions if the format ever changes.
    ids = {generate_event_id() for _ in range(1000)}
    assert len(ids) == 1000


# ---------------------------------------------------------------------------
# 3. Outcome class strings
# ---------------------------------------------------------------------------


def test_success_outcome_emits_success_class():
    envelope = _make_success_envelope()
    assert envelope["outcome"] == OUTCOME_SUCCESS
    assert envelope["outcome"] == "success"


@pytest.mark.parametrize(
    "cls",
    [FetchTimeout, FetchError, ParseError, DownstreamUnavailable],
)
def test_operational_failures_emit_operational_failure_class(cls):
    envelope = _make_operational_envelope(cls)
    assert envelope["outcome"] == OUTCOME_OPERATIONAL_FAILURE
    assert envelope["outcome"] == "operational_failure"


@pytest.mark.parametrize(
    "cls",
    [InsufficientSources, ProvenanceBreak, EntityAmbiguity],
)
def test_epistemic_failures_emit_epistemic_state_class(cls):
    envelope = _make_epistemic_envelope(cls)
    assert envelope["outcome"] == OUTCOME_EPISTEMIC_STATE
    assert envelope["outcome"] == "epistemic_state"


# ---------------------------------------------------------------------------
# 4. Default semantics
# ---------------------------------------------------------------------------


def test_parse_error_defaults_to_not_retryable():
    err = ParseError(error_summary="malformed JSON")
    envelope = err.to_envelope(pipeline_stage="extract_10k_sections")
    assert envelope["details"]["retryable"] is False


@pytest.mark.parametrize(
    "cls",
    [FetchTimeout, FetchError, DownstreamUnavailable],
)
def test_non_parse_operational_failures_default_to_retryable(cls):
    err = cls(error_summary="test")
    envelope = err.to_envelope(pipeline_stage="build_candidate_list")
    assert envelope["details"]["retryable"] is True


def test_operational_retryable_can_be_overridden():
    # FetchTimeout normally retryable; permanent endpoint removal is not.
    err = FetchTimeout(error_summary="endpoint permanently removed", retryable=False)
    envelope = err.to_envelope(pipeline_stage="build_candidate_list")
    assert envelope["details"]["retryable"] is False

    # ParseError normally non-retryable; parser update warrants retry.
    err = ParseError(error_summary="parser updated", retryable=True)
    envelope = err.to_envelope(pipeline_stage="extract_10k_sections")
    assert envelope["details"]["retryable"] is True


@pytest.mark.parametrize(
    "cls",
    [InsufficientSources, ProvenanceBreak],
)
def test_suppression_subtypes_default_to_suppress(cls):
    err = cls(reason="test")
    envelope = err.to_envelope(pipeline_stage="emit_case_cards")
    assert envelope["details"]["disposition"] == DISPOSITION_SUPPRESS
    assert envelope["details"]["disposition"] == "suppress"


def test_entity_ambiguity_defaults_to_review_queue():
    err = EntityAmbiguity(reason="two plausible employers matched")
    envelope = err.to_envelope(pipeline_stage="emit_case_cards")
    assert envelope["details"]["disposition"] == DISPOSITION_REVIEW_QUEUE
    assert envelope["details"]["disposition"] == "review_queue"


def test_epistemic_disposition_can_be_overridden():
    # The contract permits disposition override at construction.
    # Future policy might route certain insufficient_sources cases to review.
    err = InsufficientSources(reason="test", disposition=DISPOSITION_REVIEW_QUEUE)
    envelope = err.to_envelope(pipeline_stage="emit_case_cards")
    assert envelope["details"]["disposition"] == DISPOSITION_REVIEW_QUEUE


# ---------------------------------------------------------------------------
# 5. SourceRecord behavior
# ---------------------------------------------------------------------------


def test_source_record_omits_fetched_at_when_absent():
    record = SourceRecord(layer="L1", source_id="warn_ny_001", warrant_state="primary")
    serialized = record.to_dict()
    assert "fetched_at" not in serialized


def test_source_record_includes_fetched_at_when_present():
    record = SourceRecord(
        layer="L1",
        source_id="warn_ny_001",
        warrant_state="primary",
        fetched_at="2026-05-17T14:32:11.482Z",
    )
    serialized = record.to_dict()
    assert serialized["fetched_at"] == "2026-05-17T14:32:11.482Z"


def test_source_record_serializes_required_fields():
    record = SourceRecord(
        layer="L3",
        source_id="sec_10k_2026_alpha",
        warrant_state="corroborating",
    )
    serialized = record.to_dict()
    assert serialized["layer"] == "L3"
    assert serialized["source_id"] == "sec_10k_2026_alpha"
    assert serialized["warrant_state"] == "corroborating"


# ---------------------------------------------------------------------------
# Bonus: timestamp helper behavior
# ---------------------------------------------------------------------------


def test_utc_now_iso_returns_z_suffixed_iso_8601():
    ts = utc_now_iso()
    assert ts.endswith("Z")
    assert "T" in ts
    # Millisecond precision: YYYY-MM-DDTHH:MM:SS.mmmZ
    assert len(ts) == 24


def test_utc_now_iso_millisecond_field_is_three_digits():
    ts = utc_now_iso()
    # Position of milliseconds in the format string.
    ms_field = ts[20:23]
    assert ms_field.isdigit()
    assert len(ms_field) == 3
