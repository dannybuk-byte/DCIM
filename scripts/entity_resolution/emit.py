"""
Write entity_resolution.json with backward-compatible firms shim.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from .models import EntityRecord, EntityResolutionDocument


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def entities_to_firms_shim(entities: list[EntityRecord]) -> list[dict]:
    """Slim index for scripts/federal_facility_detection/entity_resolution.py consumer."""
    out: list[dict] = []
    for ent in entities:
        cik = ent.sec_identifiers.cik
        if not cik:
            continue
        out.append(
            {
                "cik": cik,
                "firm_id": ent.firm_id,
                "legal_name_sec": ent.sec_identifiers.legal_name_sec,
                "resolved_name": ent.canonical_legal_name,
            }
        )
    return out


def build_document(entities: list[EntityRecord]) -> EntityResolutionDocument:
    return EntityResolutionDocument(
        generated_at=_utc_now_iso(),
        entities=entities,
        firms=entities_to_firms_shim(entities),
    )


def write_outputs(
    *,
    out_json: Path,
    out_review_md: Path,
    entities: list[EntityRecord],
    review_markdown: str,
) -> EntityResolutionDocument:
    out_json.parent.mkdir(parents=True, exist_ok=True)
    doc = build_document(entities)
    out_json.write_text(
        json.dumps(doc.model_dump(), indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    out_review_md.write_text(review_markdown, encoding="utf-8")
    return doc
