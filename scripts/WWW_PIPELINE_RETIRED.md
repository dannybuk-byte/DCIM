# RETIRED — WWW/WARN pipeline (do not mistake for the current product)

Status: RETIRED FRAMING · out of scope · kept for archival inspection only.

The chain rooted at `run_www_pipeline.sh` — `build_candidate_list.py`,
`extract_10k_sections.py`, `find_ai_attribution_candidates.py`,
`www_pipeline_summarize.py`, `emit_case_cards.py`, and the shared
`_www_pipeline_lib.py` / `_www_section_extract.py` — implements the
retired WWW track: NY WARN notices crossed against SEC filings, with a
mandatory manual acceptance step before any case card is emitted. It is
not an automated resolver and it is not the current product.

Its single produced corpus artifact was retired by a manual audit on
2026-08-05. The corroborated corpus has held zero rows since; the
serving engine fails closed rather than serve unproven data (see
`STATUS.md` at the repository root for the current method and state).

This code is not being extended, repaired, or reactivated. Marking it
retired is the whole of its maintenance.
