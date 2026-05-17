"""
Block 4.5.0 entity-resolution output models.
"""

from __future__ import annotations

from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

OcpTier = Literal["Community", "Silver", "Gold", "Platinum"]


class SecIdentifiers(BaseModel):
    cik: Optional[str] = None
    ticker: Optional[str] = None
    legal_name_sec: Optional[str] = None


class FederalProcurementIdentifiers(BaseModel):
    uei: Optional[list[str]] = None
    cage: Optional[list[str]] = None


class NyWarnIdentifiers(BaseModel):
    employer_name_variants: Optional[list[str]] = None
    filing_count_2024_2026: Optional[int] = None


class OcpIdentifiers(BaseModel):
    directory_entry_name: Optional[str] = None
    membership_tier: Optional[OcpTier] = None
    contributor_evidence_urls: Optional[list[str]] = None


class FacilityOperatorIdentifiers(BaseModel):
    reserved_for_phase_1_5: bool = True
    operator_name_variants: Optional[list[str]] = None
    facility_addresses: Optional[list[str]] = None


class WorkforceProgramIdentifiers(BaseModel):
    reserved_for_phase_1_5: bool = True
    rapids_sponsor_id: Optional[str] = None


class OpenCorporatesVerification(BaseModel):
    company_number: Optional[str] = None
    jurisdiction: Optional[str] = None
    incorporation_date: Optional[str] = None


class ManualReviewFlag(BaseModel):
    field: str
    reason: str
    conflict_sources: list[str] = Field(default_factory=list)


class EntityRecord(BaseModel):
    firm_id: str
    canonical_legal_name: str
    wikidata_qid: Optional[str] = None
    aliases: list[str] = Field(default_factory=list)
    subsidiary_aliases: list[str] = Field(default_factory=list)
    parent_firm_id: Optional[str] = None
    is_sec_filer: bool = False
    is_foreign_primary: bool = False
    sec_identifiers: SecIdentifiers = Field(default_factory=SecIdentifiers)
    federal_procurement_identifiers: FederalProcurementIdentifiers = Field(
        default_factory=FederalProcurementIdentifiers
    )
    ny_warn_identifiers: NyWarnIdentifiers = Field(default_factory=NyWarnIdentifiers)
    ocp_identifiers: OcpIdentifiers = Field(default_factory=OcpIdentifiers)
    facility_operator_identifiers: FacilityOperatorIdentifiers = Field(
        default_factory=FacilityOperatorIdentifiers
    )
    workforce_program_identifiers: WorkforceProgramIdentifiers = Field(
        default_factory=WorkforceProgramIdentifiers
    )
    opencorporates_verification: OpenCorporatesVerification = Field(
        default_factory=OpenCorporatesVerification
    )
    manual_review_flags: list[ManualReviewFlag] = Field(default_factory=list)


class EntityResolutionDocument(BaseModel):
    schema_version: str = "1.0"
    generated_at: str
    block_4_5_0_charter_version: str = "2026-05-16"
    candidate_pool_version: str = "2026-05-16 Layer 1 Round 6 Path B"
    entities: list[EntityRecord] = Field(default_factory=list)
    firms: list[dict[str, Any]] = Field(default_factory=list)
