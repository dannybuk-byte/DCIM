"""Ingest Epoch AI 'AI Data Centers' into gate-shaped confirm sources.

Stage A of the S1 slice. Reads the two vendored real CSVs, maps each site whose
owner corresponds to a corpus candidate into an independent, real, CC-BY-attributed
source record in the shape the DME two-source gate consumes, and attaches the real
Epoch construction/operational timeline so a public-visibility date (and therefore a
lead time) can be computed downstream.

Design rules (methodology discipline):
  - Provenance is REAL. Every emitted row carries data_source='Epoch AI' and the
    CC-BY attribution string. Nothing here is synthetic.
  - Independence by site, not by row. The source id is a stable slug of the Epoch
    site name; two rows (or two ingests) for the same site collapse to ONE source.
  - No individuals. Only corporate owners and facility addresses are carried. A guard
    rejects any field that looks like a personal name.
  - The floor is not touched here. This module only *produces* sources; counting and
    suppression remain in server/scoringEngine.js.
  - Owner-confidence gate (boundary enforcement). Epoch annotates each owner with a
    confidence tag ('#confident' / '#likely' / '#speculative'; bare = untagged). The
    tag is parsed once, HERE, into a first-class `owner_confidence` field whose
    semantics are authoritative downstream and never re-derived from raw owner strings.
    Only counting-confidence records enter `confirm_sources` (the map the two-source
    gate consumes); '#likely'/'#speculative' are emitted into `candidate_annotations`,
    a separate non-counting collection the floor never sees.
  - Deterministic build input. By default the ingest reads the vendored, pinned CC-BY
    snapshot in scripts/epoch_ingest/snapshot/ — no live fetch during builds. Refresh
    is a deliberate, separate fetch->diff->re-vendor->rebuild workflow.

Run (deterministic default reads the vendored snapshot):
    python -m scripts.epoch_ingest.ingest_epoch \
        --out www_pipeline_out/epoch_confirm_sources.json
"""

from __future__ import annotations

import argparse
import csv
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Optional

# CC-BY attribution — stored alongside every ingested row (constraint §2 Attribution).
EPOCH_ATTRIBUTION = (
    "Epoch AI, 'AI Data Centers'. Published online at epoch.ai. "
    "Retrieved from 'https://epoch.ai/data/ai-data-centers'"
)
EPOCH_DATA_SOURCE = "Epoch AI"
EPOCH_SOURCE_TYPE = "epoch_ai_data_center"
EPOCH_RETRIEVED_AT = "2026-06-30"

# Vendored, pinned CC-BY snapshot: deterministic build input (no live fetch).
DEFAULT_RAW_DIR = Path(__file__).resolve().parent / "snapshot"

# Owner-confidence vocabulary. Fixed at ingestion; authoritative downstream.
# Untagged owners are the documented default-strong state -> 'unspecified'.
CONFIDENCE_UNSPECIFIED = "unspecified"
# Records with these confidences emit as REAL corroborating sources that COUNT
# toward the floor. Everything else (likely / speculative / any unknown tag) is
# emitted as a non-counting annotation only.
COUNTING_CONFIDENCE = frozenset({"confident", CONFIDENCE_UNSPECIFIED})
# Non-counting annotation labels — deliberately NOT "corroboration".
ANNOTATION_KIND = {"likely": "lead", "speculative": "hypothesis"}

# Epoch 'Owner' (after stripping #confidence annotations) -> corpus company id.
# Only owners that correspond to an existing corpus candidate are mapped; everything
# else is reported as unmatched coverage, not force-fit.
OWNER_TO_COMPANY_ID = {
    "Meta": "meta",
    "Amazon": "amazon",
    "Microsoft": "microsoft",
    "Google": "alphabet",
}

_URL_RE = re.compile(r"https?://[^\s\)\]]+")
_SLUG_RE = re.compile(r"[^a-z0-9]+")


def normalize_owner(raw: str) -> str:
    """'Meta #confident' -> 'Meta'. Epoch annotates owners with confidence tags."""
    if not raw:
        return ""
    return raw.split("#")[0].strip()


def parse_owner_confidence(raw: str) -> str:
    """'Google #speculative' -> 'speculative'; 'Meta' -> 'unspecified'.

    Parses Epoch's confidence annotation into the authoritative `owner_confidence`
    value. This is the ONE place the tag is interpreted: the result is fixed at
    ingestion and consumed downstream verbatim, never re-derived from the raw owner
    string by any later stage. Untagged owners are the documented default-strong
    state and normalize to 'unspecified'.
    """
    if raw and "#" in raw:
        return raw.split("#", 1)[1].strip().lower() or CONFIDENCE_UNSPECIFIED
    return CONFIDENCE_UNSPECIFIED


def emits_as_counting_source(owner_confidence: str) -> bool:
    """Ingest-boundary gate: does this confidence emit a floor-counting real source?

    Only 'confident' and untagged/'unspecified' count. 'likely', 'speculative', and
    any unrecognized tag are conservatively treated as non-counting (never inflate the
    floor). The floor itself (server/scoringEngine.js) is untouched — this gate decides
    membership in `confirm_sources`, which is the only map the gate ever consumes.
    """
    return owner_confidence in COUNTING_CONFIDENCE


def slugify(text: str) -> str:
    return _SLUG_RE.sub("_", text.strip().lower()).strip("_")


def _first_url(selected_sources: str) -> Optional[str]:
    if not selected_sources:
        return None
    m = _URL_RE.search(selected_sources)
    return m.group(0) if m else None


def _to_float(value: str) -> Optional[float]:
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


@dataclass
class SiteTimeline:
    """Real Epoch construction/operational timeline for one site."""

    milestones: list[dict[str, Any]] = field(default_factory=list)

    def public_visibility(self) -> Optional[dict[str, Optional[str]]]:
        """Earliest date the site is publicly visible as operational.

        Operational = at least one building operational, or IT power > 0. This is the
        real 'public marker' for the lead-time ladder. If the site is tracked but not
        yet operational, fall back to the earliest construction milestone and label it
        so downstream never presents a construction date as if it were operational.
        Returns None when no timeline exists — lead time then degrades gracefully.
        """
        if not self.milestones:
            return None
        operational = [
            m
            for m in self.milestones
            if (m["buildings_operational"] or 0) >= 1.0 or (m["it_power_mw"] or 0) > 0
        ]
        if operational:
            first = min(operational, key=lambda m: m["date"])
            return {"date": first["date"], "kind": "operational", "status": first["status"]}
        first = min(self.milestones, key=lambda m: m["date"])
        return {"date": first["date"], "kind": "construction", "status": first["status"]}


def load_timelines(path: Path) -> dict[str, SiteTimeline]:
    """site name -> SiteTimeline, from data_center_timelines.csv."""
    timelines: dict[str, SiteTimeline] = {}
    with path.open(newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            site = (row.get("Data center") or "").strip()
            date = (row.get("Date") or "").strip()
            if not site or not date:
                continue
            timelines.setdefault(site, SiteTimeline()).milestones.append(
                {
                    "date": date,
                    "status": (row.get("Construction status") or "").strip(),
                    "buildings_operational": _to_float(row.get("Buildings operational", "")),
                    "it_power_mw": _to_float(row.get("IT power (MW)", "")),
                }
            )
    return timelines


# Personal-name discipline (constraint §2 "Never individuals") is enforced STRUCTURALLY,
# not by sniffing content. The Epoch schema we read has no person columns — only
# corporate ('Name', 'Owner') and geographic ('Address', 'Country') fields, plus numeric
# capacity. The guard asserts that invariant: the record carries only allowlisted keys and
# a known corporate owner, so no person-bearing value can leak in. (Content sniffing was
# rejected: corporate site names like "Meta Prometheus" are not personal names.)
_ALLOWED_RECORD_KEYS = {
    "id", "company_id", "type", "date", "url", "provenance", "data_source",
    "attribution", "retrieved_at", "site_name", "owner_reported", "owner_confidence",
    "location", "country", "size_mw", "compute_h100e", "public_visibility_date",
    "public_visibility_kind", "warrant_note",
    # non-counting annotation markers (candidate_annotations only)
    "annotation_kind", "counts_toward_floor",
}


def assert_no_individuals(record: dict[str, Any]) -> None:
    stray = set(record.keys()) - _ALLOWED_RECORD_KEYS
    if stray:
        raise ValueError(f"record has non-allowlisted (possibly person-bearing) keys: {stray}")
    if record.get("owner_reported") not in OWNER_TO_COMPANY_ID:
        raise ValueError(f"owner is not a known corporate candidate: {record.get('owner_reported')!r}")


def build_source_record(dc_row: dict[str, str], timeline: Optional[SiteTimeline]) -> dict[str, Any]:
    """One Epoch site row -> one gate-shaped, real, attributed source record."""
    site_name = (dc_row.get("Name") or "").strip()
    raw_owner = dc_row.get("Owner", "")
    owner = normalize_owner(raw_owner)
    owner_confidence = parse_owner_confidence(raw_owner)
    company_id = OWNER_TO_COMPANY_ID[owner]
    site_slug = slugify(site_name)
    pv = timeline.public_visibility() if timeline else None

    record = {
        # --- gate-consumed fields (server/scoringEngine.js reads .id, .type, .date) ---
        # id is a STABLE per-site slug: dedupe/independence key. Two rows -> one source.
        "id": f"epoch_{site_slug}",
        "company_id": company_id,
        # Identity/reporting-only source type: names the provenance of this record on the
        # s.type axis (surfaces in source_types_present[]). It carries no scoring weight and
        # is not wired into the floor — the two-source count reads raw sources.length.
        "type": EPOCH_SOURCE_TYPE,
        # date = the real public-visibility date where known, else construction start.
        "date": pv["date"] if pv else None,
        "url": _first_url(dc_row.get("Selected Sources", "")),
        # --- provenance / attribution (constraint §2) ---
        "provenance": "real",
        "data_source": EPOCH_DATA_SOURCE,
        "attribution": EPOCH_ATTRIBUTION,
        "retrieved_at": EPOCH_RETRIEVED_AT,
        # --- Epoch particulars (corporate/infrastructural only) ---
        "site_name": site_name,
        "owner_reported": owner,
        # owner_confidence is authoritative here and downstream — never re-derived.
        "owner_confidence": owner_confidence,
        "location": (dc_row.get("Address") or "").strip(),
        "country": (dc_row.get("Country") or "").strip(),
        "size_mw": _to_float(dc_row.get("Current power (MW)", "")),
        "compute_h100e": _to_float(dc_row.get("Current H100 equivalents", "")),
        # --- timeline / public-visibility marker for the lead-time ladder (Stage C) ---
        "public_visibility_date": pv["date"] if pv else None,
        "public_visibility_kind": pv["kind"] if pv else None,
        "warrant_note": (
            "[W-EPOCH-CONFIRM] Independent real second-source confirmation: Epoch AI records "
            "this AI data center (satellite/permit/drone method). Site existence and build "
            "timeline, not a labor-causation claim."
        ),
    }
    assert_no_individuals(record)
    return record


def load_snapshot_metadata(raw_dir: Path) -> dict[str, Any]:
    """Read the vendored snapshot's provenance/version metadata (SNAPSHOT.json).

    The vendored snapshot is the single source of truth for attribution / retrieval
    date / dataset version. When the file is absent (e.g. an ad-hoc raw dir), fall back
    to the module constants so ingest still runs deterministically.
    """
    meta_path = raw_dir / "SNAPSHOT.json"
    try:
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        meta = {}
    return {
        "data_source": meta.get("source", EPOCH_DATA_SOURCE),
        "attribution": meta.get("attribution", EPOCH_ATTRIBUTION),
        "retrieved_at": meta.get("retrieved_at", EPOCH_RETRIEVED_AT),
        "dataset_version": meta.get("dataset_version"),
    }


def ingest(raw_dir: Path = DEFAULT_RAW_DIR) -> dict[str, Any]:
    """Produce {company_id: [source records]} plus a coverage report, from real CSVs.

    Counting records ('#confident' / untagged) land in `confirm_sources` — the map the
    two-source gate consumes. '#likely' / '#speculative' land in `candidate_annotations`,
    a parallel non-counting collection the floor never reads. The split is the ingest
    boundary that keeps the floor confidence-blind while honoring the three-tier gate.
    """
    dc_path = raw_dir / "data_centers.csv"
    tl_path = raw_dir / "data_center_timelines.csv"
    timelines = load_timelines(tl_path)
    snapshot = load_snapshot_metadata(raw_dir)

    by_company: dict[str, dict[str, dict[str, Any]]] = {}  # company -> id -> record (dedupe)
    annotations_by_company: dict[str, dict[str, dict[str, Any]]] = {}
    matched_sites = 0
    annotation_sites = 0
    unmatched_owner_counts: dict[str, int] = {}

    with dc_path.open(newline="", encoding="utf-8") as f:
        for dc_row in csv.DictReader(f):
            owner = normalize_owner(dc_row.get("Owner", ""))
            if owner not in OWNER_TO_COMPANY_ID:
                if owner:
                    unmatched_owner_counts[owner] = unmatched_owner_counts.get(owner, 0) + 1
                continue
            site_name = (dc_row.get("Name") or "").strip()
            if not site_name:
                continue
            record = build_source_record(dc_row, timelines.get(site_name))
            company_id = record["company_id"]
            if emits_as_counting_source(record["owner_confidence"]):
                # Independence by site: identical id overwrites, never inflates the count.
                bucket = by_company.setdefault(company_id, {})
                if record["id"] not in bucket:
                    matched_sites += 1
                bucket[record["id"]] = record
            else:
                # Non-counting annotation (lead / hypothesis). Never enters confirm_sources,
                # so the floor cannot see it. Labeled as NOT corroboration.
                record["annotation_kind"] = ANNOTATION_KIND.get(
                    record["owner_confidence"], "annotation"
                )
                record["counts_toward_floor"] = False
                bucket = annotations_by_company.setdefault(company_id, {})
                if record["id"] not in bucket:
                    annotation_sites += 1
                bucket[record["id"]] = record

    confirm_sources = {cid: list(recs.values()) for cid, recs in by_company.items()}
    candidate_annotations = {
        cid: list(recs.values()) for cid, recs in annotations_by_company.items()
    }
    coverage = {
        "matched_companies": sorted(confirm_sources.keys()),
        "matched_site_count": matched_sites,
        "sites_per_company": {cid: len(recs) for cid, recs in confirm_sources.items()},
        "annotation_site_count": annotation_sites,
        "annotations_per_company": {
            cid: len(recs) for cid, recs in candidate_annotations.items()
        },
        "unmatched_owner_site_counts": dict(sorted(unmatched_owner_counts.items())),
        "note": (
            "Owners without a corpus candidate are reported, not force-fit. Candidates "
            "with no Epoch match remain single-source / withheld — correct behavior. "
            "'#likely'/'#speculative' sites are emitted as non-counting annotations, not "
            "corroboration, and never reach the two-source floor."
        ),
    }
    return {
        "schema_version": "epoch_confirm_sources.v2",
        "data_source": snapshot["data_source"],
        "attribution": snapshot["attribution"],
        "retrieved_at": snapshot["retrieved_at"],
        "dataset_version": snapshot["dataset_version"],
        "confirm_sources": confirm_sources,
        "candidate_annotations": candidate_annotations,
        "coverage": coverage,
    }


def main(argv: Optional[list[str]] = None) -> int:
    parser = argparse.ArgumentParser(description="Ingest Epoch AI data centers into confirm sources.")
    parser.add_argument("--raw-dir", default=DEFAULT_RAW_DIR, type=Path)
    parser.add_argument("--out", default="www_pipeline_out/epoch_confirm_sources.json", type=Path)
    args = parser.parse_args(argv)

    result = ingest(args.raw_dir)
    args.out.write_text(json.dumps(result, indent=2, sort_keys=False) + "\n", encoding="utf-8")

    cov = result["coverage"]
    print(f"[epoch_ingest] matched {cov['matched_site_count']} sites across "
          f"{len(cov['matched_companies'])} candidates: {cov['sites_per_company']}")
    print(f"[epoch_ingest] unmatched owners (no corpus candidate): "
          f"{cov['unmatched_owner_site_counts']}")
    print(f"[epoch_ingest] wrote {args.out}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
