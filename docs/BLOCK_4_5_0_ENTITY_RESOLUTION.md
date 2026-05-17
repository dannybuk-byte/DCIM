# Block 4.5.0 — Entity Resolution Layer

Methodology infrastructure for the WWW / OS-DCIM verification substrate. Produces **`www_pipeline_out/entity_resolution.json`** — the prerequisite for Block 4.5 cohort assembly and for Phase 1.5 federal facility detection (`scripts/federal_facility_detection/entity_resolution.py`).

## Substrate placement

| Layer / output | Relationship |
|----------------|--------------|
| Under O1 / O2 | Canonical firm identities for contradiction detection and operator-performance verification |
| L1–L4 | Does not replace workforce, observability, commitment, or taxonomy layers |
| Phase 1.5 federal module | **Consumer** of `entity_resolution.json` (via `firms` shim + full `entities`) |

## Six identifier namespaces

| # | Namespace | Identifier | Phase |
|---|-----------|------------|-------|
| 1 | SEC EDGAR | CIK + ticker | 1 |
| 2 | Federal procurement | UEI + CAGE | 1 |
| 3 | NY WARN | Employer name variants | 1 |
| 4 | OCP membership | Directory name + tier | 1 |
| 5 | Facility operator | Reserved (`null`) | 1.5 |
| 6 | Workforce program (RAPIDS) | Reserved (`null`) | 1.5 |

## Data sources

| Source | Implementation | Notes |
|--------|----------------|-------|
| SEC | `company_tickers.json` via `SecTickerIndex` | Uses `data/cache/company_tickers.json`; `SEC_UA` from `_www_pipeline_lib.py` |
| Wikidata | SPARQL `query.wikidata.org` | Live only with `--live` |
| SAM.gov | `sam_gov.py` | Requires `SAM_GOV_API_KEY` |
| NY WARN | CSV/JSON via `--warn-data` | Default `scripts/sample_data/ny_warn_sample.csv` until DOL endpoint verified |
| OCP | HTML parse of membership directory | Live fetch with `--live` |
| OpenCorporates | REST search | Optional `OPENCORPORATES_API_KEY` |

Verified URLs documented in Block 4.5.0 charter (2026-05-16). Re-verify before production scrapes.

## Resolution logic (Steps 1–7)

1. Wikidata canonical name, QID, aliases, subsidiaries  
2. SEC CIK/ticker via ticker index  
3. SAM.gov UEI/CAGE arrays  
4. NY WARN employer variants (not normalized away)  
5. OCP directory tier  
6. Separate subsidiary records when independent SEC CIK exists  
7. Conflicts → `manual_review_flags` + review queue (no auto-merge)

## Output

- **`www_pipeline_out/entity_resolution.json`** — `entities[]` full schema + `firms[]` backward-compatible CIK index  
- **`www_pipeline_out/entity_resolution_review_queue.md`** — operational review queue  

## Manual review queue

Generated even when empty (`Total review items: 0`). Captures name conflicts, ambiguous QIDs, unresolved Layer 1/2, multi-UEI, foreign-filer observatory cases. Does not list successful single-source absences.

## Downstream references (do not duplicate)

- `AGENT_CHARTER_BLOCK_4_5_0_ENTITY_RESOLUTION_2026-05-16.md` (engineering spec; add to repo when available)  
- `AGENT_CHARTER_BLOCK_4_5_COHORT_ASSEMBLY_2026-05-16.md` — cohort filtering, not implemented here  
- `AGENT_CHARTER_BLOCK_4_5_1_OCP_DISCLOSURE_CROSSWALK_2026-05-16.md` — OCP cross-walk, not implemented here  

## Known limitations

- OpenCorporates free-tier rate limits  
- SAM.gov without API key returns empty UEIs (expected, not a conflict)  
- NY DOL live endpoint not wired; use `--warn-data` CSV until verified  
- Wikidata coverage gaps for newer firms  
- Do **not** modify `scripts/federal_facility_detection/` (downstream consumer)

### Parent-subsidiary historical relationship ambiguity not detected in v1

- Step 6 splits subsidiary entities into separate records only when the subsidiary has its own SEC CIK.
- Historical spin-out cases (e.g., Dell/VMware where VMware was a Dell subsidiary 2016-2021 then spun out 2021) are not detected as ambiguous in v1.
- Wikidata does not strongly type parent-subsidiary relationships for temporal status; building speculative ambiguity-detection logic without concrete downstream cases is out of v1 scope.
- Reopening condition: if Block 4.5 cohort assembly or Block 4.5.1 OCP cross-walk surfaces specific cases where historical spin-out ambiguity affects analytical outputs, return to this section and add detection logic with a small resolver change.

## Commands

```bash
pip install -r requirements-entity-resolution.txt

# Fixture-only (unit tests + synthetic candidates)
python3 scripts/run_entity_resolution.py \
  --fixtures-dir scripts/entity_resolution/tests/fixtures

# Live Layer 1 + Layer 2 WARN employers
python3 scripts/run_entity_resolution.py --live

python3 -m unittest discover -s scripts/entity_resolution/tests -p 'test_*.py'
```
