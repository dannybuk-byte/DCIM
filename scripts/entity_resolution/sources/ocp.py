"""
OCP membership directory lookup (HTML parse).
"""

from __future__ import annotations

import re
from typing import Optional

from .base import OcpResult

VALID_TIERS = frozenset({"Community", "Silver", "Gold", "Platinum"})


def parse_ocp_directory_html(html: str, candidate_name: str, aliases: list[str]) -> OcpResult:
    needles = [candidate_name, *aliases]
    for needle in needles:
        if not needle.strip():
            continue
        pat = re.compile(
            re.escape(needle[:40]) + r".{0,120}?(Community|Silver|Gold|Platinum)",
            re.IGNORECASE | re.DOTALL,
        )
        m = pat.search(html)
        if m:
            tier = m.group(1)
            tier_norm = tier[0].upper() + tier[1:].lower()
            if tier_norm == "Platinum":
                tier_norm = "Platinum"
            elif tier_norm not in VALID_TIERS:
                tier_norm = None
            else:
                pass
            if tier_norm in VALID_TIERS:
                return OcpResult(
                    directory_entry_name=needle,
                    membership_tier=tier_norm,  # type: ignore[arg-type]
                    contributor_evidence_urls=[],
                )
    return OcpResult()


def ocp_from_fixture(payload: dict) -> OcpResult:
    return OcpResult(
        directory_entry_name=payload.get("directory_entry_name"),
        membership_tier=payload.get("membership_tier"),
        contributor_evidence_urls=list(payload.get("contributor_evidence_urls") or []),
    )
