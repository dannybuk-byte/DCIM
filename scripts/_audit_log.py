"""Audit log writer — append-only JSONL persistence for outcome envelopes.

Implements the audit log layer described in docs/runtime-epistemic-contract.md
§Audit log shape. The audit log is the persisted stream of every outcome the
pipeline emits, written one JSON object per line.

This module is intentionally minimal. It does:

  - Accept either an envelope-producing object (with `.to_envelope(...)`)
    or an already-built envelope dict.
  - Append one JSON object per line to a JSONL file.
  - Create the parent directory if missing.
  - Verify the envelope has the required contract keys before writing.
  - Return the written event_id for caller tracking.

It deliberately does NOT do any of the following:

  - Rotate logs. Daily/size-based rotation is a separate concern.
  - Validate the full schema (subtypes, dispositions, details shape).
    Construction-time invariants are enforced upstream in
    _epistemic_outcomes.py.
  - Compress, encrypt, or sign log entries.
  - Read or replay the log. Reading is a separate utility.
  - Buffer writes. Each call flushes; suitable for moderate throughput.

If higher throughput becomes a constraint, the buffering and rotation
concerns belong in a separate writer, not bolted onto this one.

See docs/runtime-epistemic-contract.md §Non-goals for the contract's
explicit boundary.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Protocol, Union, runtime_checkable


REQUIRED_ENVELOPE_KEYS = (
    "schema_version",
    "event_id",
    "outcome",
    "timestamp",
    "pipeline_stage",
    "evaluation_ref",
    "details",
)


@runtime_checkable
class EnvelopeProducer(Protocol):
    """Anything that can produce a contract envelope.

    Both SuccessOutcome and the OperationalFailure / EpistemicFailure
    hierarchies satisfy this protocol via their to_envelope methods.
    """

    def to_envelope(self, *args: Any, **kwargs: Any) -> dict[str, Any]: ...


class AuditLogError(Exception):
    """Raised when an envelope cannot be persisted.

    Distinct from the contract's OperationalFailure / EpistemicFailure
    hierarchies: this is an audit log writer concern, not a pipeline outcome.
    Callers who want to surface a write failure as an operational outcome
    should catch this and raise DownstreamUnavailable themselves.
    """


def _validate_envelope_keys(envelope: dict[str, Any]) -> None:
    """Verify the envelope has every required key.

    Does NOT validate value types or details shape — that's enforced at
    construction time in _epistemic_outcomes.py. This is a last-line
    guard against malformed dicts being persisted.
    """
    missing = [key for key in REQUIRED_ENVELOPE_KEYS if key not in envelope]
    if missing:
        raise AuditLogError(
            f"Envelope missing required contract keys: {missing}"
        )


def write_outcome(
    outcome: Union[dict[str, Any], EnvelopeProducer],
    log_path: Union[str, os.PathLike[str]],
    *,
    pipeline_stage: str | None = None,
    evaluation_ref: str | None = None,
) -> str:
    """Append a single outcome envelope to the audit log as a JSON line.

    Args:
        outcome: Either an already-built envelope dict, or an object with
            a to_envelope(pipeline_stage, evaluation_ref) method (such as
            SuccessOutcome, OperationalFailure, or EpistemicFailure
            instances).
        log_path: Path to the JSONL audit log file. Parent directory will
            be created if missing.
        pipeline_stage: Required when `outcome` is an EnvelopeProducer.
            Ignored when `outcome` is already a dict.
        evaluation_ref: Optional candidate/case identifier. Passed through
            to to_envelope when applicable. Ignored when `outcome` is
            already a dict.

    Returns:
        The event_id of the written envelope.

    Raises:
        AuditLogError: If the envelope is malformed, if construction
            arguments are missing for an EnvelopeProducer, or if the
            write fails.
    """
    envelope = _coerce_to_envelope(outcome, pipeline_stage, evaluation_ref)
    _validate_envelope_keys(envelope)

    path = Path(log_path)
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
    except OSError as exc:
        raise AuditLogError(f"Could not create log directory {path.parent}: {exc}") from exc

    # JSONL: one object per line, newline-terminated, no trailing whitespace.
    # ensure_ascii=False so non-ASCII employer names survive intact;
    # sort_keys=False to preserve insertion order from the envelope producer.
    line = json.dumps(envelope, ensure_ascii=False, sort_keys=False)

    try:
        with path.open("a", encoding="utf-8") as fh:
            fh.write(line + "\n")
    except OSError as exc:
        raise AuditLogError(f"Could not append to audit log {path}: {exc}") from exc

    return envelope["event_id"]


def _coerce_to_envelope(
    outcome: Union[dict[str, Any], EnvelopeProducer],
    pipeline_stage: str | None,
    evaluation_ref: str | None,
) -> dict[str, Any]:
    """Convert an outcome argument into a contract envelope dict.

    If `outcome` is already a dict, return it as-is (caller is responsible
    for its correctness; we will still validate required keys).

    If `outcome` has a `to_envelope` method, call it with the provided
    pipeline_stage and evaluation_ref.
    """
    if isinstance(outcome, dict):
        return outcome

    if not isinstance(outcome, EnvelopeProducer):
        raise AuditLogError(
            f"Outcome must be a dict envelope or an object with to_envelope(); "
            f"got {type(outcome).__name__}"
        )

    if pipeline_stage is None:
        raise AuditLogError(
            "pipeline_stage is required when passing an envelope producer"
        )

    # to_envelope signatures vary by outcome type:
    #   SuccessOutcome.to_envelope requires evaluation_ref
    #   OperationalFailure.to_envelope accepts optional evaluation_ref
    #   EpistemicFailure.to_envelope accepts optional evaluation_ref
    # We pass evaluation_ref through in all cases; SuccessOutcome will raise
    # a TypeError if None is passed where it's required, which we surface
    # as an AuditLogError.
    try:
        if evaluation_ref is None:
            return outcome.to_envelope(pipeline_stage=pipeline_stage)
        return outcome.to_envelope(
            pipeline_stage=pipeline_stage,
            evaluation_ref=evaluation_ref,
        )
    except TypeError as exc:
        raise AuditLogError(
            f"Could not construct envelope from {type(outcome).__name__}: {exc}"
        ) from exc


__all__ = [
    "AuditLogError",
    "EnvelopeProducer",
    "write_outcome",
]
