"""Adapter base types."""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from ..models import FacilityDetectionSignal, QueueRecord


class QueueAdapter(ABC):
    iso: str

    @abstractmethod
    def fetch_queue_records(self) -> list["QueueRecord"]:
        ...


class FacilitySignalAdapter(ABC):
    @abstractmethod
    def produce_signals(self) -> list["FacilityDetectionSignal"]:
        ...
