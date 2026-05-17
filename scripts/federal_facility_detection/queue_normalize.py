"""
Normalize raw ISO/RTO queue rows to QueueRecord.
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Optional

from .models import QueueRecord
from .normalize import geography_from_location_raw, normalize_developer_name


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


_STATUS_MAP: list[tuple[re.Pattern[str], str]] = [
    (re.compile(r"(?i)operat"), "operational"),
    (re.compile(r"(?i)construct"), "construction"),
    (re.compile(r"(?i)withdraw"), "withdrawn"),
    (re.compile(r"(?i)study"), "studies"),
    (re.compile(r"(?i)plan"), "planning"),
]


def normalize_status(raw: str) -> str:
    for pat, norm in _STATUS_MAP:
        if pat.search(raw or ""):
            return norm
    return "unknown"


def infer_queue_type(raw_row: dict[str, Any], iso: str) -> str:
    """Tag generation vs large_load when feed exposes hints; default generation for ISO queues."""
    _ = iso
    combined = " ".join(
        str(raw_row.get(k) or "").lower()
        for k in ("queue_type", "fuel", "type", "project_type", "technology")
    )
    if "large" in combined and "load" in combined:
        return "large_load"
    if "transmission" in combined:
        return "transmission"
    if "load" in combined and "generat" not in combined:
        return "large_load"
    if any(t in combined for t in ("solar", "wind", "battery", "gas", "nuclear")):
        return "generation"
    return "generation"


def raw_row_to_queue_record(
    *,
    iso: str,
    raw: dict[str, Any],
    source_url: str,
    field_map: dict[str, str],
) -> QueueRecord:
    """Map heterogeneous feed columns via field_map {canonical: source_key}."""

    def g(canonical: str, default: str = "") -> str:
        key = field_map.get(canonical, canonical)
        v = raw.get(key)
        return str(v).strip() if v is not None else default

    developer = g("developer_name") or g("project_name")
    location_raw = g("location_raw") or g("state") or ""
    status_raw = g("status") or "unknown"
    status_norm = normalize_status(status_raw)

    cap_raw = g("capacity_mw")
    capacity: Optional[float] = None
    if cap_raw:
        try:
            capacity = float(re.sub(r"[^\d.]", "", cap_raw))
        except ValueError:
            capacity = None

    loc_norm = geography_from_location_raw(location_raw)
    qtype = infer_queue_type(raw, iso)

    signal_class = "planning"
    if status_norm == "construction":
        signal_class = "construction"
    elif status_norm == "operational":
        signal_class = "activation"

    return QueueRecord(
        queue_id=g("queue_id") or f"{iso}-{hash(developer) % 10**8}",
        iso=iso,
        project_name=g("project_name") or developer,
        developer_name=developer,
        developer_name_normalized=normalize_developer_name(developer),
        queue_type=qtype,  # type: ignore[arg-type]
        capacity_mw=capacity,
        proposed_in_service_date=g("proposed_in_service_date") or None,
        status=status_raw,
        status_normalized=status_norm,  # type: ignore[arg-type]
        location_raw=location_raw,
        location_normalized=loc_norm,
        fetched_at=_utc_now_iso(),
        source_url=source_url,
        signal_class=signal_class,  # type: ignore[arg-type]
    )
