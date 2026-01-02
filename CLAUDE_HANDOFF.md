# Claude Handoff — DCIM Compliance App (Global Infrastructure Command Center)
**Generated:** 2025-12-28  
**Owner:** Daniel (labor studies researcher)  
**Repo:** `/Users/danielbuk/DCIM Compliance App`  

This document is a Claude-ready, implementation-focused handoff of **everything built/added in this session** on top of the baseline app. It complements (does not replace) `CURSOR_HANDOFF.md`.

---

## 0) Non‑negotiable repo rules (must follow)
- **No `localStorage` / `sessionStorage`**: persist via **IndexedDB (Dexie)** only.
- **No HTML `<form>` elements**: use React state + button handlers.
- **No dynamic Tailwind classes** like `bg-${color}-500`.
- **Error Boundaries** must wrap tab components (graceful failure).
- **`useEffect` cleanups** required for timers/listeners.
- **React memoization** on list item components; **virtual scrolling** for lists >100 items.
- **Compliance language**: “non‑compliance / under‑compliance / subsidy gap / shortfall” (avoid criminal intent terms).

---

## 1) What the user asked for (high-level outcomes)
1) **Predictive typing + autocomplete everywhere** (search + key data entry).  
2) Fix broken/“non-interactive” sections (OSINT query buttons, network trace address input, etc.).  
3) **Fullscreen overlays** that truly cover the entire dashboard (portals).  
4) **Photorealistic GIS** mapping with OSM basemap + optional Google key settings + embedded Google Maps/Street View pane.  
5) “Connectography” mapping capabilities: **flows, heatmaps, interactive layers, scenes, time playback, export**, and crucially **Connectography views embedded per feature/tab**, not only one global view.

---

## 2) Core architecture choices
- **Frontend**: React 18 + TypeScript + Tailwind.
- **Persistence**: Dexie (IndexedDB) with a `settings` table used for all preferences/keys.
- **GIS engine**: **MapLibre GL** (Map2D/Globe3D/Topology all route into the same renderer).
- **Google integration**: optional user-provided API key stored in Dexie; separate embedded pane (not “layering Google tiles inside MapLibre”).

---

## 3) Major systems added/extended

### 3.1 Unified NLP Autocomplete + Search History (Dexie)
**Goal:** every search box and key text-entry field gets predictive suggestions + consistent UX.

Key pieces:
- **Dexie table**: `searchHistory` added (DB version 7) for predictive search.
- **Hook**: `src/hooks/useNLPSearchSuggestions.ts` — unified suggestion engine for facilities/operators/places + intent suggestions + history.
- **Utility**: `src/db/searchHistory.ts` — record/replay of searches.
- **Component**: `src/components/shared/AutocompleteInput.tsx` used across the app.

Integrated into:
- Global Search, AI search, chat input
- Advanced tables search
- Source Manager search + some data-entry fields
- Network Trace address input
- OSINT Query modal input
- Network Security data entry modal fields

### 3.2 NotebookLM-inspired evidence & research features
**Goal:** Source tracking, citations, and structured research notes to support evidence-grade compliance findings.

Dexie tables (added earlier in this buildout):
- `networkSecurity`, `sources`, `citations`, `researchNotes`, `settings`, `searchHistory`

Key components:
- `src/components/SourceManager.tsx`
- `src/components/shared/AdvancedDataTable.tsx`
- `src/components/ChatInterface.tsx` (includes “deep research mode” toggle)

### 3.3 OSINT Tools wiring (buttons made functional)
**Goal:** OSINT tools are clickable and have visible “blocked” states when CORS/auth prevents direct querying.

- `src/components/tabs/OSINTToolsTab.tsx`: “Query” buttons open…
- `src/components/OSINTQueryModal.tsx`: modal that handles tool selection + query + basic results; uses Autocomplete.

### 3.4 Fullscreen overlays (reliable, whole-app)
**Goal:** any view can expand to cover the whole dashboard.

- `src/components/shared/FullscreenOverlay.tsx`: portal to `document.body`, high z-index, body overflow lock, Esc close.
- `src/components/DCIMCommandCenter.tsx`: global tab fullscreen toggle (`F`) and overlay usage.

### 3.5 Photorealistic GIS + basemaps + Google pane
**Goal:** Replace legacy map renderers with MapLibre, add basemap switching, and allow optional Google Maps/Street View embedding.

Key files:
- `src/components/shared/PhotorealisticGisView.tsx`
  - MapLibre renderer with basemap styles:
    - Esri satellite (photorealistic baseline)
    - OSM standard / OSM HOT
    - Dark fallback
  - **Basemap preference persists** in Dexie `settings` key `gisBasemap`
  - Marker popup is real DOM with working buttons (“Open Map”, “Street View”, “Pin”)
- `src/components/shared/Map2D.tsx`, `Globe3D.tsx`, `TopologyView.tsx` now render through `PhotorealisticGisView`
- `src/components/shared/GoogleKeySettingsModal.tsx`: store Google API key in Dexie (`googleMapsApiKey`)
- `src/utils/loadGoogleMaps.ts`: loader to inject Google Maps JS API
- `src/components/shared/GoogleMapsStreetViewPane.tsx`: embedded right-side pane with Map/Street View tabs + pinning UI

**Pinning behavior:** pin state + pinned location persist via Dexie (`googlePanePinned`, `googlePanePinnedLocation`).

---

## 4) “Connectography” system (the big feature)

### 4.1 Connectography Toolkit (map-native capabilities)
**Goal:** interactive flows/heatmaps, filtering, time playback, scenes, export, and custom overlays — boardroom-ready.

Key files:
- `src/components/shared/ConnectographyToolkitPanel.tsx`
  - Tabs: Layers / Filters / Time / Scenes / Export / Overlays
  - Uses **TanStack Virtual** (`@tanstack/react-virtual`) for large operator lists (rule compliance)
  - Supports a **metric-aware threshold slider** (subsidy gap vs issues vs audit recency vs safety risk)
- `src/components/shared/PhotorealisticGisView.tsx`
  - **Geodesic (great-circle) flows** (operator hub → facility)
  - Heatmap uses `metricValue`
  - Streams updates via `setData()` into MapLibre sources (no map teardown during time/filtering)
  - Custom overlay syncing: arbitrary GeoJSON pasted into toolkit becomes MapLibre sources/layers

### 4.2 Per-feature Connectography views (what Daniel clarified he wanted)
**Goal:** not just “one global map”, but **Connectography lenses embedded in each feature/tab**.

Key file:
- `src/components/shared/ConnectographyFeatureSection.tsx`
  - Drop-in section that renders a Connectography map for a given tab and metric.
  - Uses **namespaced persistence** so each feature has its own saved filters/scenes/layers.

**Per-feature persistence namespace**
`PhotorealisticGisView` accepts:
- `connectographyKeyPrefix` (e.g. `subsidy-tracking`, `worker-safety`, `problems`, etc.)

Dexie settings keys are namespaced:
- `${prefix}:filters`
- `${prefix}:layerSettings`
- `${prefix}:scenes`
- `${prefix}:customLayers`

**Supported metrics**
`PhotorealisticGisView` accepts `metric`:
- `subsidyGap`
- `issuesCount`
- `auditRecencyDays`
- `safetyRisk` (proxy: issues + compliance severity + audit staleness until OSHA is wired)

### 4.3 Tabs now containing embedded Connectography sections
Each of these tabs now includes a **Connectography View** panel:
- `src/components/tabs/SubsidyTrackingTab.tsx` → metric `subsidyGap`, prefix `subsidy-tracking`
- `src/components/tabs/WorkerSafetyTab.tsx` → metric `safetyRisk`, prefix `worker-safety`
- `src/components/tabs/ProblemsTab.tsx` → metric `issuesCount`, prefix `problems`
- `src/components/tabs/EarlyWarningTab.tsx` → metric `auditRecencyDays`, prefix `early-warning`
- `src/components/tabs/GeographyTab.tsx` → metric `subsidyGap`, prefix `geography`
- `src/components/tabs/OverviewTab.tsx` → metric `subsidyGap`, prefix `overview`

---

## 5) Keyboard + interaction patterns added
- Global “Connectography overlay” was added earlier, but user clarified they want **embedded per-feature views**; those are now implemented.
- Fullscreen tab overlay exists and uses portals.
- Click-to-scroll utilities and keyboard scroll hooks exist elsewhere in repo (see scrolling utilities).

---

## 6) Dexie settings keys used (important for future work)
Basemap + Google:
- `gisBasemap`
- `googleMapsApiKey`
- `googlePanePinned`
- `googlePanePinnedLocation`
- `googlePanePinnedFacilityId`

Connectography (per-feature namespaced):
- `${prefix}:filters`
- `${prefix}:layerSettings`
- `${prefix}:scenes`
- `${prefix}:customLayers`

Legacy/global Connectography keys may exist from earlier iterations; the current implementation uses namespacing to avoid collisions.

---

## 7) Package/dependency notes
- Added: `@tanstack/react-virtual`
  - Installation required a **repo-local npm cache workaround** due to locked `~/.npm` permissions:
    - `npm install --force --cache ./.npm-cache @tanstack/react-virtual`

---

## 8) Known issues / technical debt (pre-existing)
Running `npm run build` currently fails due to **many unrelated TypeScript errors** in other parts of the repo (unused vars, type mismatches, missing leaflet image type declarations, etc.). The Connectography work compiles at file level (lints clean), but the repo’s strict `tsc` build gate is currently red for reasons outside this feature set.

If Claude is asked to “make production build green”, the quickest approach is:
- Fix unused imports/vars (TS6133) in `DCIMCommandCenter.tsx`, `ChatInterface.tsx`, `DynamicActionButtons.tsx`, etc.
- Fix type mismatch around a tab expecting `stats` prop.
- Remove invalid inline style strings like `"visible !important"` used in JSX styles.
- Resolve Leaflet image import typing (`leaflet/dist/images/*.png`) either via Vite asset typing or removing that path usage.
- Add missing type shims for `arima` and `slayer`, or replace those modules.

---

## 9) Where to look first (Claude “entry points”)
- **Main dashboard**: `src/components/DCIMCommandCenter.tsx`
- **Connectography engine**: `src/components/shared/PhotorealisticGisView.tsx`
- **Toolkit UI**: `src/components/shared/ConnectographyToolkitPanel.tsx`
- **Per-feature embed wrapper**: `src/components/shared/ConnectographyFeatureSection.tsx`
- **Subsidy view**: `src/components/tabs/SubsidyTrackingTab.tsx`
- **Worker safety view**: `src/components/tabs/WorkerSafetyTab.tsx`

---

## 10) Next “real data” upgrades (what Daniel likely wants next)
- **Worker Safety**: replace proxy safety score with OSHA/ECHO/other public sources; store per-facility safety events in Dexie and drive metric from real incidents.
- **Subsidy histories**: join `db.subsidyAgreements` (permit date, incentive value, promised jobs/investment) into a true **timeline + animated “promise→delivery shortfall” flows**.
- **Network security**: build a network/security Connectography context (ASNs, RPKI, peering partners) as a specialized metric + overlays (IXPs, routes).

---

## 11) Claude TODOs / Next Steps (prioritized, implementation-ready)

### P0 — Make Connectography “true per-feature” (real metrics, not proxies)
- **Subsidy Tracking (timeline-grade)**:
  - **Goal**: visualize subsidy compliance as *time series + map flows* (permit date → promised → delivered shortfall).
  - **Data source**: `db.subsidyAgreements` already exists (Dexie table), but UI currently uses aggregate `Facility.subsidyGap`.
  - **Work**:
    - Create a small join layer that loads `SubsidyAgreement[]` for visible facilities.
    - Add an alternate metric mode for Connectography: `incentiveValue`, `promisedJobs`, `promisedInvestment`, and derived `shortfallScore`.
    - Use Toolkit time playback to animate by `permitDate` year.
  - **Primary files**:
    - `src/components/tabs/SubsidyTrackingTab.tsx`
    - `src/components/shared/PhotorealisticGisView.tsx` (add metric variants)
    - `src/db/database.ts` (if new fields needed in `SubsidyAgreement`)

- **Worker Safety (replace proxy with real events)**:
  - **Goal**: replace `safetyRisk` proxy with OSHA/ECHO-derived violations/incidents where possible.
  - **Approach**:
    - Add Dexie table `workerSafetyEvents` keyed by `facilityId`, event date, severity, and source.
    - Add ingestion flow (manual import first; then optional API fetch if feasible).
    - Metric becomes derived from event frequency + severity over time window.
  - **Primary files**:
    - `src/components/tabs/WorkerSafetyTab.tsx`
    - `src/db/database.ts` (new table + version bump)

### P0 — Finish embedding Connectography views across remaining tabs
Current embedded Connectography panels exist in:
- Overview, Geography, Problems, Early Warning, Subsidy Tracking, Worker Safety

Remaining major tabs to wire similarly (choose metric per tab):
- **Pattern Analysis** → metric: `issuesCount` or custom “pattern severity”
- **Network Security** → metric: `network risk` (RPKI unsafe, missing mitigation, etc.)
- **OSINT Tools / Explorer / Compare / Infrastructure** → metric depends on tab intent; can default to `subsidyGap` until richer signals are available.

### P1 — Add “metric presets” per feature for one-click boardroom modes
- Add Toolkit “Presets” (e.g., “Subsidy Pressure”, “Audit Overdue”, “Issue Hotspots”, “Safety Risk”) that flips layers/filters/metric threshold.
- Persist presets per feature namespace.

### P1 — Make Connectography overlays evidence-grade
- Every metric visualization should be linkable to sources:
  - In Toolkit “Export” add optional “include citations” JSON sidecar referencing `citations` / `sources`.
  - Add “Evidence overlay” layer type: points/regions tagged with `sourceId`.

### P2 — Production hardening: make `npm run build` green
The repo currently fails `tsc` due to unrelated TS errors (unused imports/vars, missing type declarations, Leaflet asset typing, etc.).
Recommended strategy:
- Fix TS6133 unused symbols in `DCIMCommandCenter.tsx`, `ChatInterface.tsx`, `DynamicActionButtons.tsx`, etc.
- Fix prop mismatch where a tab receives `stats` not in its prop type.
- Remove invalid style values like `"visible !important"` (JSX style typing).
- Add module shims for `arima` and `slayer` or replace those modules.
- Resolve Leaflet image import typing or drop those imports in favor of MapLibre-based mapping.



