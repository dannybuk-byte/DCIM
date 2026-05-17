"""
Entity resolution Steps 1–7.
"""

from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Optional

from .candidates import LAYER_1_CANDIDATES, Layer1Candidate
from .models import (
    EntityRecord,
    FederalProcurementIdentifiers,
    ManualReviewFlag,
    NyWarnIdentifiers,
    OcpIdentifiers,
    OpenCorporatesVerification,
    SecIdentifiers,
)
from .normalize import names_conflict, normalize_name_key
from .sources.base import EntitySourceBundle, WikidataResult
from .review_queue import ReviewQueueItem, flags_to_review_items


@dataclass
class ResolutionContext:
    layer1_keys: set[str] = field(default_factory=set)
    uei_to_firm: dict[str, str] = field(default_factory=dict)


def _new_firm_id() -> str:
    return str(uuid.uuid4())


def resolve_candidate(
    candidate: Layer1Candidate | str,
    sources: EntitySourceBundle,
    ctx: ResolutionContext,
) -> list[EntityRecord]:
    if isinstance(candidate, str):
        cand = Layer1Candidate(candidate, "L2")
    else:
        cand = candidate

    name = cand.canonical_input_name
    ctx.layer1_keys.add(normalize_name_key(name))

    # Step 1 — Wikidata
    wd: WikidataResult = sources.wikidata_lookup(name, [])
    aliases = list(wd.aliases)
    if wd.no_match:
        flags_pre: list[ManualReviewFlag] = [
            ManualReviewFlag(
                field="wikidata_qid",
                reason="no Wikidata entry",
                conflict_sources=[f"candidate: {name}"],
            )
        ]
    else:
        flags_pre = []
    if wd.ambiguous_qids:
        flags_pre.append(
            ManualReviewFlag(
                field="wikidata_qid",
                reason="alias matching produced multiple Wikidata QID candidates",
                conflict_sources=[f"QIDs: {', '.join(wd.ambiguous_qids)}"],
            )
        )

    wikidata_canonical = wd.canonical_legal_name or name
    canonical = wikidata_canonical

    # Step 2 — SEC
    sec = sources.sec_lookup(name, aliases)
    if cand.foreign_filer_hint and not sec.cik:
        sec.is_foreign_primary = True
    if sec.is_foreign_primary and not sec.cik:
        flags_pre.append(
            ManualReviewFlag(
                field="sec_identifiers.cik",
                reason="foreign-filer observatory-layer candidate",
                conflict_sources=[f"candidate: {name}"],
            )
        )

    # Step 3 — SAM
    sam = sources.sam_lookup(name, aliases)

    # Step 4 — WARN
    warn_names = [canonical, name, *aliases]
    warn_hits = sources.warn_rows_for_names(warn_names)
    variants = list(dict.fromkeys(r.employer_name for r in warn_hits))
    warn_count = len(warn_hits)

    # Step 5 — OCP
    ocp = sources.ocp_lookup(name, aliases)

    # OpenCorporates cross-verify (Step 1 adjunct)
    oc = sources.opencorporates_lookup(canonical)

    flags: list[ManualReviewFlag] = list(flags_pre)

    # SEC-canonical policy: SEC legal name wins at core register; Wikidata label preserved in aliases
    if sec.legal_name_sec and names_conflict(wikidata_canonical, sec.legal_name_sec):
        if wikidata_canonical and wikidata_canonical not in aliases:
            aliases.append(wikidata_canonical)
        canonical = sec.legal_name_sec

    # Step 7 — conflicts
    if sec.legal_name_sec and names_conflict(wikidata_canonical, sec.legal_name_sec):
        flags.append(
            ManualReviewFlag(
                field="canonical_legal_name",
                reason=(
                    f"Wikidata canonical name '{wikidata_canonical}' conflicts with "
                    f"SEC EDGAR legal name '{sec.legal_name_sec}'"
                ),
                conflict_sources=[
                    f"Wikidata: {wikidata_canonical}",
                    f"SEC EDGAR: {sec.legal_name_sec}",
                ],
            )
        )
    if oc.legal_name and names_conflict(canonical, oc.legal_name):
        flags.append(
            ManualReviewFlag(
                field="canonical_legal_name",
                reason="OpenCorporates legal name differs from Wikidata canonical name",
                conflict_sources=[
                    f"Wikidata: {canonical}",
                    f"OpenCorporates: {oc.legal_name}",
                ],
            )
        )

    for uei in sam.ueis:
        prior = ctx.uei_to_firm.get(uei)
        if prior and prior != canonical:
            flags.append(
                ManualReviewFlag(
                    field="federal_procurement_identifiers.uei",
                    reason=f"UEI {uei} also associated with distinct canonical name",
                    conflict_sources=[
                        f"current: {canonical}",
                        f"prior entity key: {prior}",
                    ],
                )
            )
        ctx.uei_to_firm[uei] = canonical

    if len(sam.ueis) > 1:
        flags.append(
            ManualReviewFlag(
                field="federal_procurement_identifiers.uei",
                reason="multiple UEIs returned for entity (parent + subsidiaries possible)",
                conflict_sources=[f"UEIs: {', '.join(sam.ueis)}"],
            )
        )

    entity = EntityRecord(
        firm_id=_new_firm_id(),
        canonical_legal_name=canonical,
        wikidata_qid=wd.qid,
        aliases=aliases,
        subsidiary_aliases=[s for s in wd.subsidiary_labels if s],
        parent_firm_id=None,
        is_sec_filer=bool(sec.cik),
        is_foreign_primary=sec.is_foreign_primary,
        sec_identifiers=SecIdentifiers(
            cik=sec.cik,
            ticker=sec.ticker,
            legal_name_sec=sec.legal_name_sec,
        ),
        federal_procurement_identifiers=FederalProcurementIdentifiers(
            uei=sam.ueis or None,
            cage=sam.cages or None,
        ),
        ny_warn_identifiers=NyWarnIdentifiers(
            employer_name_variants=variants or None,
            filing_count_2024_2026=warn_count or None,
        ),
        ocp_identifiers=OcpIdentifiers(
            directory_entry_name=ocp.directory_entry_name,
            membership_tier=ocp.membership_tier,
            contributor_evidence_urls=ocp.contributor_evidence_urls or None,
        ),
        opencorporates_verification=OpenCorporatesVerification(
            company_number=oc.company_number,
            jurisdiction=oc.jurisdiction,
            incorporation_date=oc.incorporation_date,
        ),
        manual_review_flags=flags,
    )

    records: list[EntityRecord] = [entity]

    # Step 6 — subsidiaries with independent SEC CIK (if sec_index available via sec lookup on labels)
    for sub_label in wd.subsidiary_labels:
        if not sub_label.strip():
            continue
        sub_sec = sources.sec_lookup(sub_label, [])
        if sub_sec.cik:
            sub_wd = sources.wikidata_lookup(sub_label, [])
            sub_flags: list[ManualReviewFlag] = []
            if names_conflict(sub_label, entity.canonical_legal_name):
                sub_flags.append(
                    ManualReviewFlag(
                        field="parent_firm_id",
                        reason="subsidiary treated as separate record with independent SEC CIK",
                        conflict_sources=[
                            f"parent: {entity.canonical_legal_name}",
                            f"subsidiary: {sub_label}",
                        ],
                    )
                )
            sub_entity = EntityRecord(
                firm_id=_new_firm_id(),
                canonical_legal_name=sub_wd.canonical_legal_name or sub_label,
                wikidata_qid=sub_wd.qid,
                aliases=list(sub_wd.aliases),
                parent_firm_id=entity.firm_id,
                is_sec_filer=True,
                sec_identifiers=SecIdentifiers(
                    cik=sub_sec.cik,
                    ticker=sub_sec.ticker,
                    legal_name_sec=sub_sec.legal_name_sec,
                ),
                manual_review_flags=sub_flags,
            )
            records.append(sub_entity)

    # Unresolved Layer 1 — no source hits at all
    if (
        wd.no_match
        and not sec.cik
        and not sam.ueis
        and not variants
        and not ocp.directory_entry_name
    ):
        entity.manual_review_flags.append(
            ManualReviewFlag(
                field="canonical_legal_name",
                reason="Layer 1 candidate could not be resolved against any source",
                conflict_sources=[f"candidate: {name}"],
            )
        )

    return records


def resolve_layer2_warn_anchored(
    employers: list[str],
    sources: EntitySourceBundle,
    ctx: ResolutionContext,
) -> list[EntityRecord]:
    out: list[EntityRecord] = []
    for emp in employers:
        key = normalize_name_key(emp)
        if key in ctx.layer1_keys:
            continue
        records = resolve_candidate(emp, sources, ctx)
        for rec in records:
            if not rec.wikidata_qid and not rec.sec_identifiers.cik:
                rec.manual_review_flags.append(
                    ManualReviewFlag(
                        field="canonical_legal_name",
                        reason="Layer 2 WARN-anchored employer could not be resolved against Layer 1 or Wikidata",
                        conflict_sources=[f"WARN employer: {emp}"],
                    )
                )
        out.extend(records)
    return out


def collect_review_items(entities: list[EntityRecord]) -> list[ReviewQueueItem]:
    items: list[ReviewQueueItem] = []
    for ent in entities:
        items.extend(flags_to_review_items(ent))
    return items
