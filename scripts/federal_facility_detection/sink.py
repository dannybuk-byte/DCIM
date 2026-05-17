"""
Facility-detection ingestion sink (append-only JSONL).
"""

from __future__ import annotations

import json
from pathlib import Path

from .models import FacilityDetectionSignal


class FacilityDetectionSink:
    def __init__(self, out_dir: Path) -> None:
        self.out_dir = out_dir
        self.out_dir.mkdir(parents=True, exist_ok=True)
        self.signals_path = self.out_dir / "signals.jsonl"

    def append(self, signal: FacilityDetectionSignal) -> None:
        with self.signals_path.open("a", encoding="utf-8") as f:
            f.write(signal.model_dump_json() + "\n")

    def read_all(self) -> list[FacilityDetectionSignal]:
        if not self.signals_path.is_file():
            return []
        out: list[FacilityDetectionSignal] = []
        for line in self.signals_path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                out.append(FacilityDetectionSignal.model_validate_json(line))
        return out
