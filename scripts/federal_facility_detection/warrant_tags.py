"""
Canonical warrant tag enum for WWW / OS-DCIM methodology infrastructure.
Do not modify without charter revision.
"""

from __future__ import annotations

from typing import Literal

WarrantTag = Literal[
    "DESCRIPTIVE",
    "STRUCTURAL",
    "PREDICTIVE",
    "CAUSAL_IDENTIFIED",
    "ABDUCTIVE",
    "STIPULATED",
    "DESCRIPTIVE_SELF_REPORT",
    "SYNTHESIS",
    "OPEN_UNSETTLED",
]

CANONICAL_WARRANT_TAGS: frozenset[str] = frozenset(
    [
        "DESCRIPTIVE",
        "STRUCTURAL",
        "PREDICTIVE",
        "CAUSAL_IDENTIFIED",
        "ABDUCTIVE",
        "STIPULATED",
        "DESCRIPTIVE_SELF_REPORT",
        "SYNTHESIS",
        "OPEN_UNSETTLED",
    ]
)


def validate_warrant_tags(tags: list[str]) -> list[str]:
    invalid = [t for t in tags if t not in CANONICAL_WARRANT_TAGS]
    if invalid:
        raise ValueError(f"Non-canonical warrant tags: {invalid}")
    return tags
