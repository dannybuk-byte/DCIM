"""Runtime epistemic contract — outcome envelope types and helpers.

Implements docs/runtime-epistemic-contract.md. This module is the canonical
home for the outcome envelope contract on the Python side. It defines the
exception classes that pipeline stages raise to signal epistemic and
operational outcomes, and the helpers that serialize those outcomes into
the wire-format envelope.

This module deliberately does NOT do any of the following:

  - Write to the audit log. Persistence is a downstream concern.
  - Integrate with specific pipeline stages. Call sites import from here.
  - Define case-card schema, scoring engine internals, or retry policy.

See docs/runtime-epistemic-contract.md §Non-goals for the contract's
explicit boundary.

Three outcome classes, per the contract:

  - success            — emitted by stages that produce reviewable cases
  - operational_failure — raised as OperationalFailure subclasses
  - epistemic_state    — raised as EpistemicFailure subclasses

Operational failures and epistemic states are Python exceptions because
they interrupt the normal flow at a pipeline stage. Success outcomes are
constructed directly (no exception involved) since they are the happy path.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Literal, Optional


# ---------------------------------------------------------------------------
# Contract constants
# ---------------------------------------------------------------------------

SCHEMA_VERSION = "runtime_epistemic_contract.v1"

# Outcome class strings. These are the only valid values for the envelope's
# `outcome` field. Discriminates the `details` shape.
OUTCOME_SUCCESS = "success"
OUTCOME_OPERATIONAL_FAILURE = "operational_failure"
OUTCOME_EPISTEMIC_STATE = "epistemic_state"

# Epistemic subtypes. See contract §Epistemic state.
EPISTEMIC_INSUFFICIENT_SOURCES = "insufficient_sources"
EPISTEMIC_PROVENANCE_BREAK = "provenance_break"
EPISTEMIC_ENTITY_AMBIGUITY = "entity_ambiguity"

# Epistemic dispositions. See contract §Epistemic state.
DISPOSITION_SUPPRESS = "suppress"
DISPOSITION_REVIEW_QUEUE = "review_queue"

# Operational failure subtypes. See contract §Operational failure.
OPERATIONAL_FETCH_TIMEOUT = "fetch_timeout"
OPERATIONAL_FETCH_ERROR = "fetch_error"
OPERATIONAL_PARSE_ERROR = "parse_error"
OPERATIONAL_DOWNSTREAM_UNAVAILABLE = "downstream_unavailable"

# Source layer labels. Matches ARCHITECTURE.md §Data layers.
SourceLayer = Literal["L1", "L2", "L3", "L4"]

# Warrant states for sources within an outcome envelope.
WarrantState = Literal["primary", "corroborating", "unwarranted"]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def utc_now_iso() -> str:
    """Return current UTC time as ISO 8601 with millisecond precision and Z suffix.

    The contract requires ISO 8601 UTC timestamps. We use millisecond precision
    so audit log entries with high event throughput remain orderable.
    """
    now = datetime.now(timezone.utc)
    # Format: 2026-05-17T14:32:11.482Z
    return now.strftime("%Y-%m-%dT%H:%M:%S.") + f"{now.microsecond // 1000:03d}Z"


def _timestamp_compact(iso_timestamp: str) -> str:
    """Compact a contract-format ISO timestamp for use in event IDs.

    '2026-05-17T14:32:11.482Z' -> '20260517_143211_482'
    """
    # Strip the parts we don't need and concatenate.
    # Format is fixed by utc_now_iso(); slicing is safe.
    date_part = iso_timestamp[0:10].replace("-", "")   # 20260517
    time_part = iso_timestamp[11:19].replace(":", "")  # 143211
    ms_part = iso_timestamp[20:23]                      # 482
    return f"{date_part}_{time_part}_{ms_part}"


def generate_event_id(timestamp: Optional[str] = None) -> str:
    """Generate an event_id for an outcome envelope.

    Format: outcome_<timestamp_compact>_<short_uuid>

    event_id is independent of evaluation_ref by design:
      - Some outcomes occur before an evaluation_ref exists.
      - Multiple outcomes may occur for the same evaluation_ref.
      - Audit-log identity should be event identity, not case identity.
    """
    ts = timestamp if timestamp is not None else utc_now_iso()
    short_uuid = uuid.uuid4().hex[:8]
    return f"outcome_{_timestamp_compact(ts)}_{short_uuid}"


# ---------------------------------------------------------------------------
# Source records inside envelopes
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class SourceRecord:
    """A source reference inside a success or epistemic_state envelope.

    See contract §Success and §Epistemic state for usage.
    """
    layer: SourceLayer
    source_id: str
    warrant_state: WarrantState
    fetched_at: Optional[str] = None  # ISO timestamp; required for success, optional otherwise

    def to_dict(self) -> dict[str, Any]:
        d: dict[str, Any] = {
            "layer": self.layer,
            "source_id": self.source_id,
            "warrant_state": self.warrant_state,
        }
        if self.fetched_at is not None:
            d["fetched_at"] = self.fetched_at
        return d


# ---------------------------------------------------------------------------
# Success outcome
# ---------------------------------------------------------------------------


@dataclass
class SuccessOutcome:
    """Constructed at the point a reviewable case card is emitted.

    Not an exception — success is the happy path. Pipeline stages construct
    this directly and pass it to the audit log writer.
    """
    case_card_uri: str
    sources: list[SourceRecord]
    score: dict[str, Any] = field(default_factory=dict)

    def to_envelope(
        self,
        pipeline_stage: str,
        evaluation_ref: str,
    ) -> dict[str, Any]:
        """Serialize to the contract envelope shape.

        For SuccessOutcome, evaluation_ref is the emitted case identifier
        and is required (not None).
        """
        timestamp = utc_now_iso()
        return {
            "schema_version": SCHEMA_VERSION,
            "event_id": generate_event_id(timestamp),
            "outcome": OUTCOME_SUCCESS,
            "timestamp": timestamp,
            "pipeline_stage": pipeline_stage,
            "evaluation_ref": evaluation_ref,
            "details": {
                "case_card_uri": self.case_card_uri,
                "sources": [s.to_dict() for s in self.sources],
                "score": self.score,
            },
        }


# ---------------------------------------------------------------------------
# Operational failures
# ---------------------------------------------------------------------------


class OperationalFailure(Exception):
    """Base class for runtime/infrastructure failures during pipeline execution.

    Operational failures mean the system could not evaluate the data. They are
    not evidentiary outcomes; they describe infrastructure state. Retryable in
    principle.

    Subtype is set by concrete subclasses. retryable defaults to True; override
    in subclass or instance for non-retryable cases (e.g., permanent parse
    errors on malformed sources).
    """

    SUBTYPE: str = ""  # Set by subclasses.
    RETRYABLE_DEFAULT: bool = True

    def __init__(
        self,
        error_summary: str,
        source_id: Optional[str] = None,
        retry_count: int = 0,
        retryable: Optional[bool] = None,
    ) -> None:
        super().__init__(error_summary)
        self.error_summary = error_summary
        self.source_id = source_id
        self.retry_count = retry_count
        self.retryable = retryable if retryable is not None else self.RETRYABLE_DEFAULT

    def to_envelope(
        self,
        pipeline_stage: str,
        evaluation_ref: Optional[str] = None,
    ) -> dict[str, Any]:
        """Serialize to the contract envelope shape.

        For operational failures, evaluation_ref may be None when the failure
        occurred before a candidate was identified (e.g., upstream fetch).
        """
        timestamp = utc_now_iso()
        return {
            "schema_version": SCHEMA_VERSION,
            "event_id": generate_event_id(timestamp),
            "outcome": OUTCOME_OPERATIONAL_FAILURE,
            "timestamp": timestamp,
            "pipeline_stage": pipeline_stage,
            "evaluation_ref": evaluation_ref,
            "details": {
                "subtype": self.SUBTYPE,
                "source_id": self.source_id,
                "retry_count": self.retry_count,
                "retryable": self.retryable,
                "error_summary": self.error_summary,
            },
        }


class FetchTimeout(OperationalFailure):
    """Network timeout reaching an upstream source."""
    SUBTYPE = OPERATIONAL_FETCH_TIMEOUT


class FetchError(OperationalFailure):
    """Upstream returned an error (HTTP 4xx/5xx, equivalent)."""
    SUBTYPE = OPERATIONAL_FETCH_ERROR


class ParseError(OperationalFailure):
    """Upstream returned data that could not be parsed.

    Defaults to non-retryable: if the same source returns the same malformed
    payload, retrying won't help. Override at construction if the parser is
    being updated and a retry is desired.
    """
    SUBTYPE = OPERATIONAL_PARSE_ERROR
    RETRYABLE_DEFAULT = False


class DownstreamUnavailable(OperationalFailure):
    """A downstream component (DME, audit log, etc.) could not be reached."""
    SUBTYPE = OPERATIONAL_DOWNSTREAM_UNAVAILABLE


# ---------------------------------------------------------------------------
# Epistemic failures
# ---------------------------------------------------------------------------


class EpistemicFailure(Exception):
    """Base class for epistemic evaluation outcomes that prevent case emission.

    An epistemic failure means evaluation completed and concluded that the
    evidence does not support case emission. This is NOT a failure of the
    substrate; it is the substrate functioning correctly.

    Per the contract terminology note: some epistemic failures (notably
    EntityAmbiguity with disposition=review_queue) represent successful
    substrate behavior despite being classified as outcome=epistemic_state.

    Subclasses set SUBTYPE and DISPOSITION_DEFAULT. Concrete instances may
    override disposition where the contract permits.
    """

    SUBTYPE: str = ""  # Set by subclasses.
    DISPOSITION_DEFAULT: str = ""  # Set by subclasses.

    def __init__(
        self,
        reason: str,
        evaluated_sources: Optional[list[SourceRecord]] = None,
        disposition: Optional[str] = None,
    ) -> None:
        super().__init__(reason)
        self.reason = reason
        self.evaluated_sources = evaluated_sources or []
        self.disposition = disposition if disposition is not None else self.DISPOSITION_DEFAULT

    def to_envelope(
        self,
        pipeline_stage: str,
        evaluation_ref: Optional[str] = None,
    ) -> dict[str, Any]:
        """Serialize to the contract envelope shape.

        For epistemic states, evaluation_ref is the candidate identifier
        (not a case identifier — no case card has been emitted).
        """
        timestamp = utc_now_iso()
        return {
            "schema_version": SCHEMA_VERSION,
            "event_id": generate_event_id(timestamp),
            "outcome": OUTCOME_EPISTEMIC_STATE,
            "timestamp": timestamp,
            "pipeline_stage": pipeline_stage,
            "evaluation_ref": evaluation_ref,
            "details": {
                "subtype": self.SUBTYPE,
                "disposition": self.disposition,
                "evaluated_sources": [s.to_dict() for s in self.evaluated_sources],
                "reason": self.reason,
            },
        }


class InsufficientSources(EpistemicFailure):
    """Evaluation completed but source count fell below threshold.

    Disposition is `suppress`. UI displays "Insufficient sources — signal
    withheld." This is the runtime correlate of MIN_SOURCES_FOR_SCORES.
    """
    SUBTYPE = EPISTEMIC_INSUFFICIENT_SOURCES
    DISPOSITION_DEFAULT = DISPOSITION_SUPPRESS


class ProvenanceBreak(EpistemicFailure):
    """Required warrant fields missing or unverifiable.

    Disposition is `suppress`. The record cannot be routed for review because
    the reviewer would have nothing reliable to review. Common causes: missing
    filing dates, missing source URIs, unresolvable employer identifiers.
    """
    SUBTYPE = EPISTEMIC_PROVENANCE_BREAK
    DISPOSITION_DEFAULT = DISPOSITION_SUPPRESS


class EntityAmbiguity(EpistemicFailure):
    """Resolver returned plausibly multiple distinct employers/facilities.

    Disposition is `review_queue`. The case is routed for human disambiguation,
    not auto-merged and not suppressed. Per the contract terminology note,
    this represents successful substrate behavior — ambiguity preservation
    is the methodological posture working as designed.
    """
    SUBTYPE = EPISTEMIC_ENTITY_AMBIGUITY
    DISPOSITION_DEFAULT = DISPOSITION_REVIEW_QUEUE


# ---------------------------------------------------------------------------
# Module exports
# ---------------------------------------------------------------------------

__all__ = [
    # Contract constants
    "SCHEMA_VERSION",
    "OUTCOME_SUCCESS",
    "OUTCOME_OPERATIONAL_FAILURE",
    "OUTCOME_EPISTEMIC_STATE",
    "EPISTEMIC_INSUFFICIENT_SOURCES",
    "EPISTEMIC_PROVENANCE_BREAK",
    "EPISTEMIC_ENTITY_AMBIGUITY",
    "DISPOSITION_SUPPRESS",
    "DISPOSITION_REVIEW_QUEUE",
    "OPERATIONAL_FETCH_TIMEOUT",
    "OPERATIONAL_FETCH_ERROR",
    "OPERATIONAL_PARSE_ERROR",
    "OPERATIONAL_DOWNSTREAM_UNAVAILABLE",
    # Helpers
    "utc_now_iso",
    "generate_event_id",
    # Source record
    "SourceRecord",
    # Success
    "SuccessOutcome",
    # Operational failures
    "OperationalFailure",
    "FetchTimeout",
    "FetchError",
    "ParseError",
    "DownstreamUnavailable",
    # Epistemic failures
    "EpistemicFailure",
    "InsufficientSources",
    "ProvenanceBreak",
    "EntityAmbiguity",
]
