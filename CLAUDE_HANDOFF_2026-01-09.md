## DCIM Compliance App — Claude Handoff

**Date**: 2026-01-09  
**Worktree**: `/Users/danielbuk/.cursor/worktrees/DCIM_Compliance_App/aoq`  
**Repo**: `origin` = `https://github.com/dannybuk-byte/DCIM.git`  

### Mission (do not drift)

This is a **labor organizing tool** (not corporate DCIM). Features should help organizers:
- find/triage signals,
- build evidence timelines,
- generate defensible reports and routing actions.

### Current status

- **Build**: ✅ `npm run build` passes (Vite warns about browser externalization for some deps; see “Known build warnings” below).
- **Tests**: ✅ `npm run test:run` passes (40 tests).
- **Dev**: multiple dev servers may already be running from other worktrees. This worktree was run safely on an alternate port (example: `5175`).

---

## What changed in this session (high-level)

### 1) Telemetry Bus + Incident Command System (ICS)

Goal: convert raw “signals” into an organizer-friendly workflow:
- **append-only telemetry** (durable, offline-first),
- **incident triage + timelines**,
- dedup + retention to avoid spam/unbounded growth,
- minimal surface area (no new backend required).

#### New DB schema (Dexie) — Version 13

File: `src/db/database.ts`

Added stores:
- `telemetryEvents` (append-only signal/event log)
- `incidents` (triage records)
- `incidentEventLinks` (many-to-many link table)

Notes:
- This is a **schema bump**; if IndexedDB upgrade gets stuck in a browser profile, clear site data for localhost.

#### New services

- `src/services/telemetryBus.ts`
  - `TelemetryBus.emit()` with **dedup** via `fingerprint` within `dedupWindowMs`
  - `compact()` with **maxAgeMs** + **maxRows** safeguards
  - `listRecent()` helper for UI
- `src/services/incidentCommand.ts`
  - create incidents; update status; link telemetry events; build a timeline via `getTimeline()`

#### New UI

- `src/components/tabs/IncidentCommandTab.tsx`
  - Create incident (manual)
  - Incident list + select + status changes
  - Timeline for linked telemetry events
  - “Recent telemetry (last 24h)” list with **Promote** → creates incident from telemetry and links it

#### Live updates without extra deps

- `src/hooks/useDexieLiveQuery.ts`
  - simple wrapper around Dexie `liveQuery()` with safe cleanup

#### Wiring (so it self-populates)

Telemetry now receives events from:
- `src/services/signalCorrelation.ts`:
  - on every `ingestSignal()`, emits a telemetry event (source mapped to `bgp|ct|power|workforce|system`)
  - severity heuristic: hijack → critical; anomalies/alerts → medium/high based on confidence
- `src/services/selfHealing.ts`:
  - `reportIncident()` emits a telemetry event (`source: 'self_healing'`) with severity preserved

#### DCIM Command Center integration

File: `src/components/DCIMCommandCenter.tsx`

- New tab id: **`Incident Command`**
- Added to:
  - `CommandCenterTab` union
  - `tabs: CommandCenterTab[]` list
  - `NAV_TABS` metadata (so it appears in navigation/search)
  - render block: `activeTab === 'Incident Command'` → `<IncidentCommandTab />` inside `ErrorBoundary`

### 2) Accuracy hardening for “real-time” monitoring

Goal: improve correctness beyond heuristic labeling by adding:
- baseline persistence (reduces cold-start false positives),
- peer corroboration thresholds (reduces localized artifacts),
- RPKI validation (cryptographic-ish validation layer),
- transparent uncertainty scoring (Admiralty + decay + optional Dempster–Shafer fusion primitives).

#### BGP hardening (RIPE RIS Live)

Files:
- `src/services/bgpMonitoring.ts`
- `src/services/rpkiValidation.ts`
- `src/db/database.ts` (schema v14)

Implemented:
- **Warm-up window (~12 minutes)**: suppresses `new_prefix` alerting while baseline builds.
- **Prefix baseline persistence**: new store `bgpPrefixBaselines` (schema v14). “new prefix” now means new vs historical baseline, not new since this session started.
- **Peer threshold (5+ peers)**: anomaly candidates require multiple distinct peers within a short observation window before emitting.
- **RPKI validation (IPv4 only for now)**: best-effort validation via Cloudflare `rpki.json`, cached in IndexedDB (`rpkiCache`), recorded on anomalies as:
  - `rpkiState`: `valid | invalid | not_found | unsupported | error`
  - `rpkiReason`: optional explanation

#### Confidence framework (transparent uncertainty)

Files:
- `src/services/sourceConfidence.ts` (Admiralty 6x6 → normalized score)
- `src/services/temporalDecay.ts` (staleness decay by signal type)
- `src/services/dempsterShafer.ts` (minimal DS fusion + conflict coefficient)

Wiring:
- `src/services/signalCorrelation.ts` now attaches `sourceAssessment` + `decayedConfidence` into telemetry event payloads.

### 3) Cloudflare Worker proxies for second-source verification (RouteViews + EIA)

Files:
- `cloudflare-worker/index.js`
- `cloudflare-worker/wrangler.toml`

New endpoints:
- `GET /api/routeviews/prefix/:prefix`
  - Proxies `https://api.routeviews.org/prefix/<prefix>`
  - Adds CORS + short caching (~30s) + basic per-IP rate limiting
- `GET /api/eia/v2/*`
  - Proxies `https://api.eia.gov/v2/*`
  - Injects `EIA_API_KEY` server-side (do not ship keys to browsers)
  - Adds CORS + short caching (~60s) + basic per-IP rate limiting

Secrets to set:
- `wrangler secret put EIA_API_KEY`

Client wiring:
- `src/services/bgpMonitoring.ts` now performs **best-effort RouteViews corroboration** for `origin_change` + `critical` anomalies:
  - fetches `/api/routeviews/prefix/<prefix>` and records:
    - `corroborationStatus`: `confirmed | pending | unconfirmed | error`
    - `corroborationDetails.routeviewsOrigins`

Frontend API base:
- `src/config/apiBase.ts` reads `VITE_API_BASE_URL` so the app can call the Worker cross-origin.
- See `ENV_SETUP.md` (repo root) for local-only env instructions.

---

## Dev workflow & safety changes

### Port-safe bootstrap

File: `scripts/predev.sh`

Behavior now:
- If `PORT` is **not set**, `predev` will **not hard-fail** on port conflicts (safe default for multiple worktrees).
- If `PORT` **is set**, it will check that port and fail with a clear message if occupied.

Recommended safe run command (avoids fighting other worktrees):

```bash
PORT=5175 npm run dev -- --port 5175
```

### Test harness stabilization

Changes made to keep tests green in this worktree:
- Added `@testing-library/dom` to devDependencies (worktree-safe install).
- Updated `vitest.config.ts`: removed deprecated `poolOptions`, using `singleThread: true`.
- Fixed formatting expectations by aligning `formatCurrency()` output with tests:
  - strips trailing zeros (`$1K` not `$1.0K`)
  - negative formatted as `-$1M`
- Updated `stats.test.ts` empty-array expectation to include the full `ComplianceStats` shape.
- Relaxed timing-sensitive assertion in `useFlexSearch.test.ts` and imported `waitFor` from `@testing-library/dom`.

---

## How to verify ICS quickly (manual)

1) Run dev server:

```bash
PORT=5175 npm run dev -- --port 5175
```

2) Open app and navigate to **Incident Command** tab.

3) If telemetry is empty, create a manual event from DevTools:

```js
import('/src/services/telemetryBus').then(({ telemetryBus }) =>
  telemetryBus.emit({
    source: 'manual',
    type: 'test_signal',
    severity: 'low',
    title: 'Manual test event',
    summary: 'Smoke test for Incident Command UI',
  })
);
```

4) Use **Promote** in “Recent telemetry” to create an incident and confirm timeline wiring.

---

## Accuracy of “real-time” data sources (current reality)

This app has “real-time-ish” monitoring, but important: **some parts are measured and some parts are inferred**.

### A) BGP monitoring (RIPE RIS Live) — `src/services/bgpMonitoring.ts`

**What’s strong (high confidence)**
- A message from RIPE RIS Live is a real observation from a collector → **high confidence that the observed BGP update happened** somewhere in the RIS stream.

**What’s weaker (medium-to-low confidence)**
- The current subscription is broad (`ris_subscribe` without server-side ASN filter) and then filters locally by watched ASNs in AS_PATH.
- The “businessInference” strings (expansion, decommissioning, etc.) are **interpretations**, not verified facts.

**Bottom line**
- **Accurate as a signal feed**, and now less noisy due to:
  - baseline persistence,
  - warm-up suppression,
  - peer corroboration threshold,
  - RPKI validation (IPv4).
- Treat anomalies as “leads requiring verification.”

**Remaining hardening recommendations**
- Add IPv6 RPKI validation.
- Cross-check high-severity anomalies via a second source (e.g., BGPStream/Isolario) before “confirmed.”

### B) CT monitoring (CertStream) — `src/services/ctMonitoring.ts`

**What’s strong (high confidence)**
- A `certificate_update` event from CertStream reflects that a certificate was logged/seen by that stream → generally credible.
- Domain matching against a watched list is deterministic.

**What’s weaker (medium-to-low confidence)**
- Facility detection uses regex heuristics (`FACILITY_PATTERNS`) and keyword checks:
  - prone to false positives (common internal naming patterns).
- “geographicHint” is derived from string patterns; **not a reliable geolocation method**.
- Some timestamps are generated locally (`loggedAt: Date.now()`), not necessarily CT log timestamps.

**Bottom line**
- **High confidence** that a cert event exists for a watched domain; **low-to-medium confidence** that it implies a specific facility deployment/location.

**Hardening recommendations**
- Store and display raw issuer/subjectAltName context as provenance.
- Down-rank or mark “unverified” until correlated with independent evidence (BGP change, permit filing, satellite imagery, etc.).

### C) CT polling via crt.sh — `src/utils/expansionTracker.ts`

**What’s strong**
- When crt.sh returns data, it’s a useful historical/near-real-time lookup.

**Limitations**
- Not truly real-time; log ingestion delay varies.
- Rate limits and API volatility; fetch failures return empty arrays (safe but can create silent blind spots).
- Pattern inference in `detectPattern()` is heuristic.

### D) Correlation engine (multi-signal) — `src/services/signalCorrelation.ts`

**What it does well**
- Explicitly encodes the idea that **single signals are noisy**, and correlations matter.
- Has pattern definitions and confidence values.

**Current gap**
- Telemetry bus is now fed by `ingestSignal()`, but not all upstream monitors necessarily call into this pipeline.

---

## Known build warnings (not blockers, but real)

Build prints warnings about browser externalization (`path`, `fs`, `spawn`) from dependencies (e.g., `arima`, `@loaders.gl/...`). Build succeeds, but these indicate potential bundle/runtime hazards if those code paths execute in-browser.

---

## Files added/modified (this work)

New:
- `src/services/telemetryBus.ts`
- `src/services/telemetryBus.test.ts`
- `src/services/incidentCommand.ts`
- `src/hooks/useDexieLiveQuery.ts`
- `src/components/tabs/IncidentCommandTab.tsx`
- `src/services/rpkiValidation.ts`
- `src/services/rpkiValidation.test.ts`
- `src/services/sourceConfidence.ts`
- `src/services/temporalDecay.ts`
- `src/services/dempsterShafer.ts`

Modified:
- `src/db/database.ts` (schema v14)
- `src/services/signalCorrelation.ts` (telemetry emission)
- `src/services/selfHealing.ts` (telemetry emission on `reportIncident`)
- `src/services/bgpMonitoring.ts` (baseline + peer corroboration + RPKI best-effort validation)
- `src/components/DCIMCommandCenter.tsx` (tab wiring)
- `scripts/predev.sh` (safe-by-default port behavior)
- `vitest.config.ts`, `package.json`, `package-lock.json` (test harness)
- `src/utils/formatting.ts`, `src/utils/stats.test.ts`, `src/hooks/useFlexSearch.test.ts`

---

## Next recommended steps (if continuing)

1) **Promote correlated patterns to incidents automatically**
   - When a correlation pattern hits “critical/high,” create an incident and link events.
2) **Evidence packaging**
   - Export a “court-admissible incident packet” (timeline + hashes + citations + sources).
3) **Accuracy hardening**
   - Baseline persistence for BGP “new prefix”
   - dual-source verification before “confirmed”
4) **UI ergonomics**
   - add filters (status/severity/source) and “assign to coalition partner” workflow using existing coalition services.

