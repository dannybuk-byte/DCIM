"""
SAM.gov adapter (typed placeholder).

Optional API key via SAM_GOV_API_KEY when implemented.
"""

from __future__ import annotations

import os
from typing import Any, Optional

from ..models import FacilityDetectionSignal


class SamGovFacilityAdapter:
    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or os.environ.get("SAM_GOV_API_KEY")

    def produce_signals(self, **_kwargs: Any) -> list[FacilityDetectionSignal]:
        raise NotImplementedError(
            "SAM.gov adapter skeleton; entity registration does not imply facility location."
        )
