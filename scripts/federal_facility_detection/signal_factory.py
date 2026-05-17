"""
Build FacilityDetectionSignal from queue rows and SEC excerpts.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any, Optional

from .confidence import assess_queue_signal, assess_sec_facility_signal
from .models import FacilityDetectionSignal, QueueRecord
from .normalize import geography_from_location_raw, text_has_facility_naming_patterns


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def queue_record_to_signal(
    record: QueueRecord,
    *,
    operator_name_resolved: Optional[str] = None,
    operator_firm_id: Optional[str] = None,
) -> FacilityDetectionSignal:
    has_state = bool(record.location_normalized.get("state"))
    operator_resolved = bool(operator_firm_id or operator_name_resolved)
    assessed = assess_queue_signal(
        queue_type=record.queue_type,
        status_normalized=record.status_normalized,
        has_state=has_state,
        operator_resolved=operator_resolved,
        iso=record.iso,
    )
    inference = "operator_resolved" if operator_resolved else "federal_detection"
    geo_raw = record.location_raw or ""
    return FacilityDetectionSignal(
        signal_id=str(uuid.uuid4()),
        source_family=f"{record.iso}_QUEUE",
        source_name=f"{record.iso} interconnection queue",
        operator_name_raw=record.developer_name,
        operator_name_resolved=operator_name_resolved,
        operator_firm_id=operator_firm_id,
        facility_location_granularity=assessed["facility_location_granularity"],  # type: ignore[arg-type]
        geography_raw=geo_raw,
        geography_normalized=dict(record.location_normalized),
        capacity_mw=record.capacity_mw,
        signal_date=record.proposed_in_service_date or record.fetched_at[:10],
        fetched_at=record.fetched_at,
        source_url=record.source_url,
        signal_class=assessed["signal_class"],  # type: ignore[arg-type]
        queue_type=record.queue_type,
        confidence_level=assessed["confidence_level"],  # type: ignore[arg-type]
        confidence_rationale=assessed["confidence_rationale"],
        warrant_tags=assessed["warrant_tags"],
        pending_verification=assessed["pending_verification"],
        escalation_required=assessed["escalation_required"],
        escalation_rationale=assessed["escalation_rationale"],
        manual_review_required=assessed["manual_review_required"],
        manual_review_rationale=assessed["manual_review_rationale"],
        downstream_action_allowed=assessed["downstream_action_allowed"],
        inference_chain_position=inference,
        supports_direct_facility_detection=assessed["supports_direct_facility_detection"],
        provisional_pending_operator_confirmation=assessed["provisional_pending_operator_confirmation"],
        coalition_action_unsupported=assessed["coalition_action_unsupported"],
        coalition_action_unsupported_rationale=assessed["coalition_action_unsupported_rationale"],
    )


def sec_section_to_signal(
    *,
    operator_name_raw: str,
    section_key: str,
    section_text: str,
    parsing_confidence: str,
    filing_date: str,
    source_url: str,
    cik: Optional[str] = None,
    operator_name_resolved: Optional[str] = None,
    operator_firm_id: Optional[str] = None,
    geography_raw: str = "",
) -> FacilityDetectionSignal:
    has_facility = text_has_facility_naming_patterns(section_text)
    geo_norm = geography_from_location_raw(geography_raw or section_text[:500])
    has_state = bool(geo_norm.get("state"))
    operator_resolved = bool(operator_firm_id or operator_name_resolved)
    assessed = assess_sec_facility_signal(
        section_key=section_key,
        parsing_confidence=parsing_confidence,
        has_facility_language=has_facility,
        operator_resolved=operator_resolved,
        has_state=has_state,
    )
    inference = "operator_resolved" if operator_resolved else "federal_detection"
    return FacilityDetectionSignal(
        signal_id=str(uuid.uuid4()),
        source_family="SEC",
        source_name=f"SEC {section_key}",
        operator_name_raw=operator_name_raw,
        operator_name_resolved=operator_name_resolved,
        operator_firm_id=operator_firm_id,
        facility_location_granularity=assessed["facility_location_granularity"],  # type: ignore[arg-type]
        geography_raw=geography_raw,
        geography_normalized=geo_norm,
        capacity_mw=None,
        signal_date=filing_date,
        fetched_at=_utc_now_iso(),
        source_url=source_url,
        signal_class=assessed["signal_class"],  # type: ignore[arg-type]
        queue_type=None,
        confidence_level=assessed["confidence_level"],  # type: ignore[arg-type]
        confidence_rationale=assessed["confidence_rationale"],
        warrant_tags=assessed["warrant_tags"],
        pending_verification=assessed["pending_verification"],
        escalation_required=assessed["escalation_required"],
        escalation_rationale=assessed["escalation_rationale"],
        manual_review_required=assessed["manual_review_required"],
        manual_review_rationale=assessed["manual_review_rationale"],
        downstream_action_allowed=assessed["downstream_action_allowed"],
        inference_chain_position=inference,
        supports_direct_facility_detection=assessed["supports_direct_facility_detection"],
        provisional_pending_operator_confirmation=assessed["provisional_pending_operator_confirmation"],
        coalition_action_unsupported=assessed["coalition_action_unsupported"],
        coalition_action_unsupported_rationale=assessed["coalition_action_unsupported_rationale"],
    )
