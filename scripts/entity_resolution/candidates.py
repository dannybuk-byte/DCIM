"""
Layer 1 candidate pool (ratified for execution per Block 4.5.0 prompt).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Layer1Candidate:
    canonical_input_name: str
    tier: str
    foreign_filer_hint: bool = False


LAYER_1_CANDIDATES: tuple[Layer1Candidate, ...] = (
    # Tier A
    Layer1Candidate("Goldman Sachs Group, Inc.", "A"),
    Layer1Candidate("International Business Machines (IBM)", "A"),
    Layer1Candidate("Microsoft Corporation", "A"),
    Layer1Candidate("Amazon.com, Inc.", "A"),
    Layer1Candidate("Alphabet Inc. (Google)", "A"),
    Layer1Candidate("JPMorgan Chase & Co.", "A"),
    Layer1Candidate("Meta Platforms, Inc.", "A"),
    # Tier B
    Layer1Candidate("NVIDIA Corporation", "B"),
    Layer1Candidate("Oracle Corporation", "B"),
    Layer1Candidate("Cisco Systems, Inc.", "B"),
    Layer1Candidate("Hewlett Packard Enterprise Company (HPE)", "B"),
    Layer1Candidate("Dell Technologies Inc.", "B"),
    Layer1Candidate("Salesforce, Inc.", "B"),
    Layer1Candidate("Super Micro Computer, Inc. (Supermicro)", "B"),
    Layer1Candidate("Equinix, Inc.", "B"),
    Layer1Candidate("Digital Realty Trust, Inc.", "B"),
    Layer1Candidate("Iron Mountain Incorporated", "B"),
    # Tier C
    Layer1Candidate("CoreWeave, Inc.", "C"),
    Layer1Candidate("Vertiv Holdings Co.", "C"),
    Layer1Candidate("Eaton Corporation plc", "C"),
    Layer1Candidate("Arista Networks, Inc.", "C"),
    Layer1Candidate("Advanced Micro Devices, Inc. (AMD)", "C"),
    Layer1Candidate("Broadcom Inc.", "C"),
    Layer1Candidate("Lenovo Group Limited", "C", foreign_filer_hint=True),
)


def layer1_names() -> list[str]:
    return [c.canonical_input_name for c in LAYER_1_CANDIDATES]
