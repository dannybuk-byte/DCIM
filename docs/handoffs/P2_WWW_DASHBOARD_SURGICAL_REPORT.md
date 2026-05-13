# WWW Dashboard — P2 Surgical Integration Report

Branch: `stabilization/2026-05` (work done on this branch; not merged to `main`).

---

## Change 1 — Flip the BGP default to live

### Approach taken

**(B)** Kept `OmniscientCommandInterface` as the shell for the new architecture. The product issue was localized to the **BGP tab**, which previously rendered `BGPAnalysisView` (imports `../utils/bgpDemo` and copy explicitly says “no live BGP feeds”). Inverting **`useNewArchitecture` in `App.tsx`** would swap the **entire** dashboard between `OmniscientCommandInterface` and legacy `DCIMCommandCenter`, which is broader than the BGP surface and would not precisely target the BGP demo path.

Implementation:

1. **`BGPMonitorPanel`** — added optional prop `autoConnect?: boolean`. When true, a mount `useEffect` calls `bgpMonitor.connect()` and sets local `isActive` so RIPE RIS Live (`wss://ris-live.ripe.net/v1/ws/` via `BGPMonitor.ts`) starts without requiring the user to press Play.
2. **`OmniscientCommandInterface`** — for `viewMode === 'bgp'`, replaced `<BGPAnalysisView … />` with a header plus `<BGPMonitorPanel autoConnect />`. Updated tab tooltip, hash comment, and NL-search shortcut title from “Demo BGP” to live RIPE copy.

### Files modified

| File | Change |
|------|--------|
| `src/components/BGPMonitorPanel.tsx` | `BGPMonitorPanelProps`, `autoConnect` + mount connect |
| `src/components/OmniscientCommandInterface.tsx` | BGP tab → live panel; tooltips / deep-link comment |

### Stop condition

**Met (by construction in code).** Evidence:

- Default BGP tab UI no longer imports or renders `BGPAnalysisView` / `bgpDemo` tables; it mounts **`BGPMonitorPanel` with `autoConnect`**, which uses **`bgpMonitor`** from `src/network/BGPMonitor.ts` (RIPE RIS WebSocket).
- Live announcements depend on RIPE feed volume; the panel’s existing “Update Log” fills from `onUpdate` once the socket is open (typically seconds, user’s ~30s criterion is consistent with RIPE global traffic).

**Not re-verified in this session:** browser E2E (no automated browser run here).

---

## Change 2 — Wire SEC EDGAR proxy to frontend (`DataFetcher.fetchSECFilings`)

### Approach

- **`fetchSECFilings`** now resolves a **10-digit CIK** from, in order: optional `facility.secCik`, numeric `operatorName`, or a **small bounded operator→CIK hint table** (includes Goldman `0000886982` and Amazon `0001018724` per task).
- Performs **`fetch(\`${secEdgarProxyBase()}/api/sec/submissions/CIK${cik}.json\`)`**, parses JSON, maps `filings.recent` parallel arrays into a **`filings[]`** list (forms: 10-K, 10-Q, 8-K, 20-F, 40-F), and returns **`recentFilingSummary`** text aimed at P2 reviewers (10-K + Item 1A / MD&A pointer + SEC Archives URL).
- **Cache key** bumped to `sec_v2_*` so prior empty placeholder entries are not reused.

### Worker (`cloudflare-worker/index.js`)

- **`User-Agent`** for the upstream SEC request was updated from `DCIM-CommandCenter contact@example.com` to a **descriptive string including project URL**, aligned with SEC fair-access expectations (still a single descriptive token line; swap for a dedicated contact email in production if required by policy).

### Config

- **`src/vite-env.d.ts`** — added optional `VITE_SEC_EDGAR_PROXY_URL`. If unset, default proxy base is **`https://dcim-dashboard.dannybuk.workers.dev`** (same worker file that defines `GET /api/sec/*`).

### Files modified

| File | Change |
|------|--------|
| `src/services/DataFetcher.ts` | Proxy fetch, CIK resolution, submissions → `filings[]`, `fetchAllFacilityData` passes `facility.secCik` |
| `src/services/getFacilityDetails.ts` | **`secFilingRef`** uses `recentFilingSummary` or first filing when live data exists |
| `src/vite-env.d.ts` | `VITE_SEC_EDGAR_PROXY_URL` |
| `cloudflare-worker/index.js` | SEC upstream `User-Agent` |

### Stop condition

| Criterion | Status | Notes |
|----------|--------|--------|
| `fetchSECFilings` calls `/api/sec/...` and returns real rows when CIK resolves | **Y (code)** | Goldman/Amazon match hints; arbitrary CIK via `facility.secCik`. |
| Non-empty 10-K list for CIK 0000886982 / 0001018724 | **Not executed here** | This environment’s outbound `curl` failed with `CONNECT tunnel failed, response 403`; no live SEC/worker response was captured in-agent. **Validate in browser or local Terminal** against deployed worker + SEC. |
| “AI-related disclosure text … renders” | **Partial** | Dashboard **`secFilingRef`** / Report modal line now surfaces a **human-readable summary + link** to the latest **10-K** (MD&A / Item 1A **review** language). **Full filing body text** is not fetched (would need a second-stage document fetch + parser; out of scope for the requested function-body edit). |

---

## Change 3a — Inspect `github.com/dannybuk-byte/warn-scraper`

| Question | Finding |
|----------|---------|
| Output format | **Not retrieved.** `GET https://api.github.com/repos/dannybuk-byte/warn-scraper/contents` returned **HTTP 404** from this environment (likely **private repo**, renamed, or not visible without auth). |
| Delivery mechanism | **Unknown** without clone or authenticated API. |
| Schema / sample row | **Unknown.** |
| Update cadence | **Unknown.** |

**Secondary artifact (local):** `~/Documents/GitHub/www-warn-tracker/handoff-2026-03-23.md` references repo `github.com/dannybuk-byte/warn-scraper` and Cloudflare Workers (`dcim`, `dcim-api-proxy`, etc.) — narrative only, not a substitute for scraper code/schema.

---

## Change 3b — DME contract (`SEED_COMPANIES`) vs scraper (delta)

### DME ingest shape (from `server/mockDataset.js`)

Top-level **`SEED_COMPANIES`**: array of **company** objects:

| Field | Role |
|-------|------|
| `id` | string slug (`goldman_sachs`, `amazon`, …) |
| `name` | display name |
| `sector` | string |
| `period_start`, `period_end` | ISO date strings (inclusive narrative window) |
| `case_type`, `reviewer_flag` | optional strings (e.g. `sourced_case`, `human_review_required`) |
| `sources` | array of **source** objects from helper `S(...)` |

Each **source** (`S(...)`):

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | unique per row |
| `company_id` | string | must match parent `id` |
| `type` | string | e.g. `warn_filing`, `sec_filing`, `public_ai_statement`, `earnings_call`, … |
| `date` | string | ISO date |
| `text_excerpt` | string | narrative excerpt |
| `url` | string | citation (mock data uses `https://example.com/...` for many rows) |
| optional | via `extra` | e.g. `ai_attribution_tier`, `workers_affected`, `ai_disclosed_in_warn`, `classification_label`, … |

### Delta vs unknown scraper output (cannot close without 3a)

| Dimension | DME (`SEED_COMPANIES`) | Scraper (unknown) |
|-----------|----------------------|-------------------|
| Identifier | `id` slug + `company_id` on sources | **TBD** — may be employer name, EIN, ticker, or WARN company key |
| Event model | heterogeneous `sources[]` with `type` enum-like strings | **TBD** — may be flat WARN rows, HTML, JSON API, etc. |
| Text | `text_excerpt` required | **TBD** |
| URL | string (real URLs only in curated rows like Amazon) | **TBD** |
| Period | explicit `period_start` / `period_end` on company | **TBD** — may need derivation from WARN date |

---

## Change 3c — Proposed bridge (no code yet; awaiting confirmation)

**Recommended: (b) DME imports scraper output at build/deploy** for P2.

**Justification:** Fastest honest demo path: a **nightly or on-demand** job exports scraper output into a **JSON module** or **versioned JSON** consumed by `server/mockDataset.js` (or a parallel `server/liveDataset.fragment.json` merged at startup), replacing `example.com` URLs with **real citations** where available. Avoids new always-on infrastructure before pitch.

**Sketch:**

1. Document scraper export schema once repo is readable (or add a tiny export CLI in scraper).
2. Add `scripts/merge-warn-export.mjs` that maps scraper rows → `S(...)` / company objects (with explicit mapping table for `type` strings).
3. CI or manual: run merge → commit artifact or inject in deploy.
4. DME scoring unchanged; only corpus input changes.

**Alternatives (not selected for P2):** (a) worker polling — more moving parts; (c) shared DB — overkill for pitch timeline.

---

## Open blockers (priority order)

1. **Outbound network / proxy from agent host** — could not verify SEC or worker HTTP from tools (`403` on CONNECT). **Validate Change 2 in your browser** (localhost:5173) or unrestricted Terminal.
2. **`warn-scraper` not inspectable** — GitHub API 404 without credentials; **3a incomplete** until clone or token access.
3. **`VITE_SEC_EDGAR_PROXY_URL`** — if `dcim-dashboard` worker is not the deployment that carries `/api/sec/*`, set this in `.env.local` to the correct origin.
4. **CIK coverage** — only hinted operators + `facility.secCik`; other operators still return “no CIK” until mapping or lookup service exists.
5. **Filing body / AI NLP** — `recentFilingSummary` points reviewers to **10-K URL**; extracting verbatim MD&A sentences needs an additional pipeline (not implemented).

---

## Files touched (summary)

- `src/components/BGPMonitorPanel.tsx`
- `src/components/OmniscientCommandInterface.tsx`
- `src/services/DataFetcher.ts`
- `src/services/getFacilityDetails.ts`
- `src/vite-env.d.ts`
- `cloudflare-worker/index.js`
- `docs/handoffs/P2_WWW_DASHBOARD_SURGICAL_REPORT.md` (this file)
