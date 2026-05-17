"""
Confidence scoring rules for federal-layer facility detection signals.
Does not recommend coalition action; sets downstream_action_allowed only.
"""

from __future__ import annotations

from typing import Literal, Optional

ConfidenceLevel = Literal["high", "medium", "low"]


def assess_queue_signal(
    *,
    queue_type: str,
    status_normalized: str,
    has_state: bool,
    operator_resolved: bool,
    iso: str,
) -> dict:
    """
    Generation queues are corroborative-only unless operator resolved + explicit load typing.
    """
    pending: list[str] = []
    escalation = True
    escalation_rationale = (
        "ISO/RTO interconnection queues are primarily generation-side; "
        "direct large-load data-center interconnection typically requires state/utility PUC visibility."
    )
    manual_review = True
    manual_review_rationale = "Queue row requires analyst review before facility-detection use."

    if queue_type == "generation":
        level: ConfidenceLevel = "low"
        rationale = (
            "Generation interconnection queue entry; corroborative-only for facility detection "
            "unless linked to operator-resolved SPV or supply-adjacent context."
        )
        supports_direct = False
        provisional = True
        downstream = False
        coalition_unsupported = True
        coalition_rationale = "Generation-queue signal alone does not support downstream facility-detection action."
        warrant = ["DESCRIPTIVE", "STRUCTURAL", "OPEN_UNSETTLED"]
    elif queue_type == "large_load":
        level = "medium"
        rationale = "Queue typed as large_load; still requires primary-source verification at utility/state layer."
        supports_direct = False
        provisional = True
        downstream = False
        coalition_unsupported = True
        coalition_rationale = "Large-load queue signal pending state-layer confirmation."
        warrant = ["DESCRIPTIVE", "STRUCTURAL", "OPEN_UNSETTLED"]
    else:
        level = "low"
        rationale = "Queue type unknown; treat as corroborative-only."
        supports_direct = False
        provisional = True
        downstream = False
        coalition_unsupported = True
        coalition_rationale = "Unknown queue type blocks confident facility-detection use."
        warrant = ["DESCRIPTIVE", "OPEN_UNSETTLED"]

    if not has_state:
        pending.append("state_not_normalized")
        level = "low"
        rationale += " Geography lacks state normalization; federal-only resolution capped at MSA."

    if operator_resolved:
        manual_review = True
        manual_review_rationale = "Operator resolution present; still requires queue-type and state-layer review."
        warrant = list(dict.fromkeys(warrant + ["STRUCTURAL"]))

    gran = "state" if has_state else "msa"

    signal_class = "planning"
    if status_normalized == "construction":
        signal_class = "construction"
    elif status_normalized == "operational":
        signal_class = "activation"

    return {
        "confidence_level": level,
        "confidence_rationale": rationale,
        "pending_verification": pending,
        "escalation_required": escalation,
        "escalation_rationale": escalation_rationale,
        "manual_review_required": manual_review,
        "manual_review_rationale": manual_review_rationale,
        "downstream_action_allowed": downstream,
        "supports_direct_facility_detection": supports_direct,
        "provisional_pending_operator_confirmation": provisional,
        "coalition_action_unsupported": coalition_unsupported,
        "coalition_action_unsupported_rationale": coalition_rationale,
        "warrant_tags": warrant,
        "facility_location_granularity": gran,
        "signal_class": signal_class,
    }


def assess_sec_facility_signal(
    *,
    section_key: str,
    parsing_confidence: str,
    has_facility_language: bool,
    operator_resolved: bool,
    has_state: bool,
) -> dict:
    pending: list[str] = []
    if parsing_confidence in ("approximate", "failed"):
        pending.append(f"sec_parsing_{parsing_confidence}")

    if section_key == "item_2_properties" and has_facility_language:
        level: ConfidenceLevel = "medium"
        rationale = "SEC Item 2 Properties excerpt with facility-naming patterns; descriptive federal filing signal."
        supports_direct = False
        downstream = False
        warrant = ["DESCRIPTIVE", "DESCRIPTIVE_SELF_REPORT", "STRUCTURAL"]
    elif section_key == "item_1_business" and has_facility_language:
        level = "medium"
        rationale = "SEC Item 1 Business facility-naming patterns; corroborative for location claims."
        supports_direct = False
        downstream = False
        warrant = ["DESCRIPTIVE", "DESCRIPTIVE_SELF_REPORT"]
    else:
        level = "low"
        rationale = "SEC excerpt lacks clear facility-naming patterns or parsing quality is weak."
        supports_direct = False
        downstream = False
        warrant = ["DESCRIPTIVE", "OPEN_UNSETTLED"]

    if not has_state:
        pending.append("geography_state_missing")
    gran: str = "state" if has_state else "msa"

    return {
        "confidence_level": level,
        "confidence_rationale": rationale,
        "pending_verification": pending,
        "escalation_required": not has_state,
        "escalation_rationale": "Sub-MSA facility claims require state/local escalation."
        if not has_state
        else None,
        "manual_review_required": True,
        "manual_review_rationale": "SEC facility language requires analyst verification at primary filing.",
        "downstream_action_allowed": downstream,
        "supports_direct_facility_detection": supports_direct,
        "provisional_pending_operator_confirmation": True,
        "coalition_action_unsupported": not downstream,
        "coalition_action_unsupported_rationale": "Confidence limits block downstream action without verification."
        if not downstream
        else None,
        "warrant_tags": warrant,
        "facility_location_granularity": gran,
        "signal_class": "planning",
    }
