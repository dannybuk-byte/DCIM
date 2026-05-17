"""
USAspending adapter (typed placeholder).

Subset coverage: federal contracts only; not direct facility-detection authority.
"""

from __future__ import annotations

from typing import Any

from ..models import FacilityDetectionSignal


class UsaSpendingFacilityAdapter:
    subset_coverage_only = True

    def produce_signals(self, **_kwargs: Any) -> list[FacilityDetectionSignal]:
        raise NotImplementedError(
            "USAspending adapter skeleton; federal award geography is not facility proof."
        )
