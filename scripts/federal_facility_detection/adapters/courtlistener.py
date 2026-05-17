"""
CourtListener adapter (typed placeholder).

Corroboration-only: court records may corroborate facility existence, not primary detection.
"""

from __future__ import annotations

from typing import Any

from ..models import FacilityDetectionSignal


class CourtListenerFacilityAdapter:
    corroboration_only = True

    def produce_signals(self, **_kwargs: Any) -> list[FacilityDetectionSignal]:
        raise NotImplementedError(
            "CourtListener adapter is corroboration-only skeleton; implement with docket search APIs."
        )
