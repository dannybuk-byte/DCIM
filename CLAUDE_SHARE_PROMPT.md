## Copy/paste to Claude (shareable)

You are continuing work on the **DCIM Compliance App** (React/TS, Vite, IndexedDB/Dexie) in this worktree:
- `/Users/danielbuk/.cursor/worktrees/DCIM_Compliance_App/aoq`

### What was just implemented (accuracy hardening beyond “model inference”)

Goal: improve **real-time monitoring correctness** using deterministic verification + conservative alerting.

#### 1) BGP cold-start hardening + corroboration threshold
- File: `src/services/bgpMonitoring.ts`
- Changes:
  - **Warm-up window (~12 minutes)** after connect: suppresses `new_prefix` alerting while baseline builds.
  - **Prefix baseline persistence**: uses IndexedDB so “new prefix” means new vs historical baseline, not new since the session started.
  - **Peer corroboration threshold**: anomaly candidates require **5+ unique peers** within a short observation window before emitting.
  - **RPKI validation** is attached to persisted anomalies (best-effort; monitoring must never crash app).

#### 2) Browser-only RPKI/ROA validation (Cloudflare VRPs)
- File: `src/services/rpkiValidation.ts`
- Data source: `https://rpki.cloudflare.com/rpki.json` (cached)
- Current scope: **IPv4 only** (IPv6 returns `unsupported`)
- Output states:
  - `valid | invalid | not_found | unsupported | error`
- Notes:
  - Caches VRPs in IndexedDB store `rpkiCache`
  - Builds an in-memory IPv4 prefix trie for fast lookups

#### 3) Confidence primitives (transparent uncertainty, not vibes)
- Admiralty/NATO 6x6 helper: `src/services/sourceConfidence.ts`
- Temporal decay: `src/services/temporalDecay.ts`
- Minimal Dempster–Shafer fusion: `src/services/dempsterShafer.ts`
- Wiring: `src/services/signalCorrelation.ts` now includes:
  - `sourceAssessment` (Admiralty rating + normalized score)
  - `decayedConfidence` (staleness decay applied)

#### 4) DB schema update (Dexie)
- File: `src/db/database.ts`
- New schema **version 14** adds tables:
  - `bgpPrefixBaselines`
  - `rpkiCache`

#### 5) Cloudflare Worker proxy + client corroboration wiring

Worker:
- `cloudflare-worker/index.js`
  - `GET /api/routeviews/prefix/:prefix` (CORS + ~30s caching + rate limit)
  - `GET /api/eia/v2/*` (CORS + ~60s caching + rate limit; injects `EIA_API_KEY` server-side)
- `cloudflare-worker/wrangler.toml` documents the new routes + secret name.

Worker secret to set locally (do not paste into chat):
- `wrangler secret put EIA_API_KEY`

Frontend:
- `src/config/apiBase.ts` reads `VITE_API_BASE_URL` so the app can call the worker cross-origin.
- `src/services/bgpMonitoring.ts`:
  - For `origin_change` + `critical` anomalies, calls `/api/routeviews/prefix/<prefix>` via `apiUrl(...)`
  - Records `corroborationStatus` (`confirmed|pending|unconfirmed|error`) on the anomaly.

Local env setup:
- See `ENV_SETUP.md` in repo root.

### Tests/build status
- Added: `src/services/rpkiValidation.test.ts`
- `npm run test:run` ✅
- `npm run build` ✅ (warnings exist but build succeeds; see handoff doc)

### Where the detailed handoff lives
- `CLAUDE_HANDOFF_2026-01-09.md` (repo root) — updated to include the above accuracy hardening.

### Quick verification commands (run from repo root)

```bash
npm run test:run
npm run build
```

### Known limitations / next hardening steps
- Add **IPv6 RPKI validation**
- Optionally add a streaming second source (e.g. bgproutes.io WebSocket) and fuse with RouteViews + RIS for higher confidence.
- Consider mapping RPKI status into the Incident Command UI / telemetry severity escalation rules

