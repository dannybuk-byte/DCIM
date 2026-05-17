"""
DOL OFLC (H-1B LCA) adapter (typed placeholder).

H-1B LCA records indicate where workers are deployed, not corporate headquarters.
"""

from __future__ import annotations

from typing import Any

from ..models import FacilityDetectionSignal


class DolOflcFacilityAdapter:
    workforce_location_signal = True

    def produce_signals(self, **_kwargs: Any) -> list[FacilityDetectionSignal]:
        raise NotImplementedError(
            "DOL OFLC adapter skeleton; LCA work-site city is workforce-location corroboration only."
        )
