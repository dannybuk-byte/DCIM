"""
Manual review queue markdown generator.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Optional

from .models import EntityRecord, ManualReviewFlag


@dataclass
class ReviewQueueItem:
    firm_id: str
    canonical_legal_name: str
    field: str
    reason: str
    conflict_sources: list[str]
    suggested_action: str


def _entity_has_other_namespace_resolved(entity: EntityRecord) -> bool:
    if entity.sec_identifiers.cik:
        return True
    ueis = entity.federal_procurement_identifiers.uei or []
    if ueis:
        return True
    variants = entity.ny_warn_identifiers.employer_name_variants or []
    if variants:
        return True
    if entity.ocp_identifiers.directory_entry_name:
        return True
    return False


def _should_route_flag_to_queue(flag: ManualReviewFlag, entity: EntityRecord) -> bool:
    if flag.reason == "no Wikidata entry" and _entity_has_other_namespace_resolved(entity):
        return False
    if flag.reason == "foreign-filer observatory-layer candidate":
        return False
    return True


def flags_to_review_items(entity: EntityRecord) -> list[ReviewQueueItem]:
    items: list[ReviewQueueItem] = []
    for flag in entity.manual_review_flags:
        if not _should_route_flag_to_queue(flag, entity):
            continue
        items.append(
            ReviewQueueItem(
                firm_id=entity.firm_id,
                canonical_legal_name=entity.canonical_legal_name,
                field=flag.field,
                reason=flag.reason,
                conflict_sources=list(flag.conflict_sources),
                suggested_action=_suggest_action(flag),
            )
        )
    return items


def _suggest_action(flag: ManualReviewFlag) -> str:
    r = flag.reason.lower()
    if "separate entit" in r:
        return "treat as separate entities"
    if "wikidata" in r and "sec" in r:
        return "ratify SEC as authoritative"
    if "alias" in r and "qid" in r:
        return "investigate before resolution"
    if "foreign" in r:
        return "investigate before resolution"
    if "unresolved" in r or "no wikidata" in r:
        return "investigate before resolution"
    if "uei" in r:
        return "investigate before resolution"
    return "investigate before resolution"


def render_review_queue_markdown(
    *,
    entities: list[EntityRecord],
    items: list[ReviewQueueItem],
    generated_at: Optional[str] = None,
) -> str:
    ts = generated_at or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    lines = [
        "# Entity Resolution Manual Review Queue",
        f"Generated: {ts}",
        f"Total entities resolved: {len(entities)}",
        f"Total review items: {len(items)}",
        "",
    ]
    if not items:
        lines.append("_No review items; all resolutions within automated confidence bounds._")
        lines.append("")
        return "\n".join(lines)

    for i, item in enumerate(items, start=1):
        lines.extend(
            [
                f"## Review Item {i} · {item.firm_id} · {item.canonical_legal_name}",
                "",
                f"**Field:** {item.field}",
                "",
                f"**Reason:** {item.reason}",
                "",
                "**Conflict sources:**",
            ]
        )
        for src in item.conflict_sources:
            lines.append(f"- {src}")
        lines.extend(
            [
                "",
                f"**Suggested human action:** {item.suggested_action}",
                "",
                "---",
                "",
            ]
        )
    return "\n".join(lines)
