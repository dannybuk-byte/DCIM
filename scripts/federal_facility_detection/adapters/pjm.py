"""
PJM Data Miner 2 interconnection queue adapter.
Live fetch requires PJM_API_KEY; unit tests use fixture paths only.
"""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any, Optional

import requests

from ..models import QueueRecord
from ..queue_normalize import raw_row_to_queue_record
from .base import QueueAdapter

PJM_QUEUE_API = (
    "https://api.pjm.com/api/v1/interconnection_queues"
    "?startRow=1&rowCount=500"
)
PJM_SOURCE_URL = "https://dataminer2.pjm.com/"

PJM_FIELD_MAP = {
    "queue_id": "queueNumber",
    "project_name": "projectName",
    "developer_name": "customerName",
    "status": "status",
    "capacity_mw": "mwEnergy",
    "proposed_in_service_date": "proposedCompletionDate",
    "location_raw": "state",
}


class PjmQueueAdapter(QueueAdapter):
    iso = "PJM"

    def __init__(
        self,
        *,
        api_key: Optional[str] = None,
        fixture_path: Optional[Path] = None,
    ) -> None:
        self.api_key = api_key or os.environ.get("PJM_API_KEY")
        self.fixture_path = fixture_path

    def fetch_queue_records(self) -> list[QueueRecord]:
        if self.fixture_path and self.fixture_path.is_file():
            return self._from_fixture(self.fixture_path)
        if not self.api_key:
            return []
        return self._from_live_api()

    def _from_fixture(self, path: Path) -> list[QueueRecord]:
        data = json.loads(path.read_text(encoding="utf-8"))
        rows = data if isinstance(data, list) else data.get("items") or data.get("rows") or []
        out: list[QueueRecord] = []
        for raw in rows:
            if isinstance(raw, dict):
                out.append(
                    raw_row_to_queue_record(
                        iso=self.iso,
                        raw=raw,
                        source_url=PJM_SOURCE_URL,
                        field_map=PJM_FIELD_MAP,
                    )
                )
        return out

    def _from_live_api(self) -> list[QueueRecord]:
        headers = {
            "Ocp-Apim-Subscription-Key": self.api_key or "",
            "Accept": "application/json",
        }
        resp = requests.get(PJM_QUEUE_API, headers=headers, timeout=60)
        resp.raise_for_status()
        payload: Any = resp.json()
        rows = payload if isinstance(payload, list) else payload.get("items") or []
        out: list[QueueRecord] = []
        for raw in rows:
            if isinstance(raw, dict):
                out.append(
                    raw_row_to_queue_record(
                        iso=self.iso,
                        raw=raw,
                        source_url=PJM_SOURCE_URL,
                        field_map=PJM_FIELD_MAP,
                    )
                )
        return out
