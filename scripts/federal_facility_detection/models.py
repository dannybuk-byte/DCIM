"""
Pydantic models for federal-layer facility detection (L2 observability inputs).
"""

from __future__ import annotations

from datetime import date, datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator

from .warrant_tags import CANONICAL_WARRANT_TAGS, validate_warrant_tags

ConfidenceLevel = Literal["high", "medium", "low"]
QueueType = Literal["generation", "large_load", "transmission", "unknown"]
StatusNormalized = Literal[
    "planning", "studies", "construction", "operational", "withdrawn", "unknown"
]
SignalClass = Literal["planning", "construction", "activation"]
FacilityGranularity = Literal["country", "state", "msa", "county", "subcounty"]
InferenceChainPosition = Literal[
    "federal_detection", "operator_resolved", "ocp_affiliation_resolved", None
]


class QueueRecord(BaseModel):
    queue_id: str
    iso: str
    project_name: str
    developer_name: str
    developer_name_normalized: str
    queue_type: QueueType
    capacity_mw: Optional[float] = None
    proposed_in_service_date: Optional[str] = None
    status: str
    status_normalized: StatusNormalized
    location_raw: str
    location_normalized: dict[str, Any] = Field(default_factory=dict)
    fetched_at: str
    source_url: str
    signal_class: SignalClass = "planning"

    @field_validator("proposed_in_service_date")
    @classmethod
    def iso_date_optional(cls, v: Optional[str]) -> Optional[str]:
        if v is None or v == "":
            return None
        return v


class FacilityDetectionSignal(BaseModel):
    signal_id: str
    source_family: str
    source_name: str
    operator_name_raw: str
    operator_name_resolved: Optional[str] = None
    operator_firm_id: Optional[str] = None
    facility_location_granularity: FacilityGranularity
    geography_raw: str
    geography_normalized: dict[str, Any] = Field(default_factory=dict)
    capacity_mw: Optional[float] = None
    signal_date: str
    fetched_at: str
    source_url: str
    signal_class: SignalClass
    queue_type: Optional[QueueType] = None
    confidence_level: ConfidenceLevel
    confidence_rationale: str
    warrant_tags: list[str]
    pending_verification: list[str] = Field(default_factory=list)
    escalation_required: bool
    escalation_rationale: Optional[str] = None
    manual_review_required: bool
    manual_review_rationale: Optional[str] = None
    downstream_action_allowed: bool
    inference_chain_position: Optional[str] = None
    supports_direct_facility_detection: bool = False
    provisional_pending_operator_confirmation: bool = False
    coalition_action_unsupported: bool = False
    coalition_action_unsupported_rationale: Optional[str] = None

    @field_validator("warrant_tags")
    @classmethod
    def tags_from_enum(cls, v: list[str]) -> list[str]:
        return validate_warrant_tags(v)

    def model_post_init(self, __context: Any) -> None:
        for tag in self.warrant_tags:
            if tag not in CANONICAL_WARRANT_TAGS:
                raise ValueError(f"Invalid warrant tag: {tag}")


class LineageEvent(BaseModel):
    stage: str
    timestamp: str
    parser_version: str
    detail: dict[str, Any] = Field(default_factory=dict)
