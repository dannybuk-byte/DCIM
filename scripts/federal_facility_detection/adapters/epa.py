"""
EPA adapter (typed placeholder).

Federal/state porosity: some EPA datasets aggregate state submissions; quality varies by program.
"""

from __future__ import annotations

from typing import Any

from ..models import FacilityDetectionSignal


class EpaFacilityAdapter:
    """Tier-2+ corroboration; not primary facility detection."""

    federal_state_porosity = True

    def produce_signals(self, **_kwargs: Any) -> list[FacilityDetectionSignal]:
        raise NotImplementedError(
            "EPA adapter is a skeleton; verify program-specific endpoints before implementation."
        )
