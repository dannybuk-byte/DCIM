"""
Append-only transformation lineage log per signal_id.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import LineageEvent

PARSER_VERSION = "federal_facility_detection/0.1.0"


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


class LineageLog:
    def __init__(self, base_dir: Path) -> None:
        self.base_dir = base_dir
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def append(
        self,
        signal_id: str,
        stage: str,
        detail: dict[str, Any] | None = None,
        source_url: str | None = None,
    ) -> None:
        events: list[dict[str, Any]] = []
        path = self.base_dir / f"{signal_id}.jsonl"
        if path.is_file():
            for line in path.read_text(encoding="utf-8").splitlines():
                if line.strip():
                    events.append(json.loads(line))
        ev = LineageEvent(
            stage=stage,
            timestamp=_utc_now_iso(),
            parser_version=PARSER_VERSION,
            detail={**(detail or {}), **({"source_url": source_url} if source_url else {})},
        )
        events.append(ev.model_dump())
        with path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(events[-1]) + "\n")
