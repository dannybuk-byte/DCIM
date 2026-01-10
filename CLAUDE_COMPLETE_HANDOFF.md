# DCIM Compliance App — Complete Claude Handoff

**Date:** January 10, 2026  
**Purpose:** Complete context for continuing development  
**Copy this entire document to Claude to continue work**

---

## 🎯 Mission Statement (DO NOT DRIFT)

This is a **LABOR ORGANIZING TOOL**, not corporate DCIM. It arms unions and community organizers with data to fight Big Tech's broken job creation promises.

### Key Audiences
- Tech Workers Coalition / CODE-CWA
- UPROSE (environmental justice)
- NYC Mayor-elect Mamdani's transition team
- Strategic Organizing Center
- Investigative journalists

### Core Metrics
- **12,006 facilities** tracked
- **$5.53B+ subsidy gap** exposed
- **48 operators** monitored
- **46 countries** covered

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     DCIM COMPLIANCE APP                          │
├─────────────────────────────────────────────────────────────────┤
│  Frontend: React + TypeScript + Vite + Tailwind                 │
│  Storage: IndexedDB (Dexie) — offline-first                     │
│  API Proxy: Cloudflare Worker (RouteViews, EIA)                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  VERIFICATION STACK (NEW)                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   EPA ECHO ──────┐                                              │
│   (browser-direct)│                                              │
│                   │                                              │
│   EIA Energy ────┼──► Dempster-Shafer ──► Combined Confidence   │
│   (via Worker)    │    Evidence Fusion                           │
│                   │                                              │
│   BGP/RPKI ──────┘                                              │
│   (via Worker)                                                   │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    DEFENSIVE LAYERS                              │
├─────────────────────────────────────────────────────────────────┤
│   Rate Limiting ──► Circuit Breaker ──► Degraded Mode           │
│   (per-service)    (opens after 5      (suppresses auto-        │
│                     failures)           create when down)        │
├─────────────────────────────────────────────────────────────────┤
│                    INCIDENT AUTOMATION                           │
├─────────────────────────────────────────────────────────────────┤
│   Telemetry ──► Auto-link ──► Auto-create (gated)              │
│   Event          to existing   Only: Verified + Critical        │
│                  incidents     + Not Degraded                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  ANTIFRAGILITY STACK (7 LAYERS)                  │
├─────────────────────────────────────────────────────────────────┤
│  Layer 7: Predictive Failure Engine                             │
│  Layer 6: Self-Healing Service                                  │
│  Layer 5: Graceful Degradation (4 service levels)               │
│  Layer 4: Chaos Engineering (8 experiments, safe mode)          │
│  Layer 3: Circuit Breakers                                      │
│  Layer 2: Error Boundaries                                      │
│  Layer 1: Global Error Handler                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📁 Key Files Reference

### Verification Services (NEW — January 10, 2026)

| File | Purpose |
|------|---------|
| `src/services/epaVerification.ts` | EPA ECHO JSONP queries (browser-direct, no proxy) |
| `src/services/eiaVerification.ts` | EIA API via Worker proxy (regional energy patterns) |
| `src/services/unifiedVerification.ts` | Dempster-Shafer evidence fusion |
| `src/services/rpkiValidation.ts` | RPKI validation with IPv4 prefix trie |
| `src/services/bgpMonitoring.ts` | RIPE RIS Live + RouteViews corroboration |
| `src/services/telemetryBus.ts` | Append-only event sourcing with dedup |
| `src/services/incidentCommand.ts` | Incident CRUD + auto-linking + auto-create |
| `src/services/verificationDegradedMode.ts` | Health polling + degraded state |
| `src/services/verificationHealth.ts` | Worker health checks |
| `src/services/auditSnapshot.ts` | Decision trail recording |
| `src/services/dempsterShafer.ts` | Evidence fusion math |
| `src/services/sourceConfidence.ts` | NATO/Admiralty 6x6 confidence framework |
| `src/services/temporalDecay.ts` | Confidence decay over time |

### Verification UI Components

| File | Purpose |
|------|---------|
| `src/components/FacilityVerificationPanel.tsx` | Unified verification display with mass function |
| `src/components/VerificationStatusBadge.tsx` | Degraded mode indicator |
| `src/components/VerificationTestPanel.tsx` | Chaos testing panel (dev only) |
| `src/components/tabs/IncidentCommandTab.tsx` | Incident management UI |
| `src/components/DetailedFacilityView.tsx` | Facility modal with Verification tab |

### Rate Limiting & Safety

| File | Purpose |
|------|---------|
| `src/utils/rateLimitedFetch.ts` | Exponential backoff + circuit breaker |
| `src/config/apiBase.ts` | Worker URL configuration |

### Database

| File | Purpose |
|------|---------|
| `src/db/database.ts` | IndexedDB schema (v15) |

### Cloudflare Worker

| File | Purpose |
|------|---------|
| `cloudflare-worker/index.js` | API proxy (RouteViews, EIA, health) |
| `cloudflare-worker/wrangler.toml` | Worker configuration |
| `wrangler.toml` | Static site deployment config |

### Tests

| File | Purpose |
|------|---------|
| `src/services/telemetryBus.test.ts` | Telemetry event tests |
| `src/services/rpkiValidation.test.ts` | RPKI validation tests |
| `e2e/dashboard.spec.ts` | Dashboard smoke tests |
| `e2e/incident-command.spec.ts` | Incident system tests |

---

## 🗄️ Database Schema (v15)

```typescript
// Key tables for verification pipeline
telemetryEvents: 'id, timestamp, source, type, severity, facilityId, correlationId, fingerprint'
incidents: 'id, status, severity, createdAt, updatedAt, lastEventAt, *tags'
incidentEventLinks: '++id, incidentId, eventId, timestamp'
bgpPrefixBaselines: 'id, originAsn, prefix, lastSeen'
rpkiCache: 'key, fetchedAt'
auditSnapshots: 'id, timestamp, snapshotType, [linkedEntityType+linkedEntityId]'
```

---

## 🔧 Verification Sources

| Source | Method | What It Verifies | Rate Limits |
|--------|--------|------------------|-------------|
| **EPA ECHO** | Browser JSONP | Facility exists in EPA registry, permits, compliance | ~5 req/min |
| **EIA** | Worker proxy | Regional energy patterns (DC load signature) | 9000 req/hour |
| **BGP/RPKI** | Worker proxy | Network routing authenticity | Varies |
| **RouteViews** | Worker proxy | Multi-peer BGP corroboration | 1 req/sec |

### Confidence Scoring

- **70%+** = Green (high confidence)
- **40-70%** = Yellow (moderate)
- **<40%** = Red (low confidence)

### Dempster-Shafer Mass Function

```typescript
interface MassFunction {
  belief: number;      // Evidence FOR the hypothesis
  disbelief: number;   // Evidence AGAINST
  uncertainty: number; // Unknown
}
// Combined via combineDempster() → produces conflictK score
// Pignistic probability = belief + 0.5 * uncertainty
```

---

## 🚀 How to Run

```bash
# Clone/navigate to project
cd /Users/danielbuk/.cursor/worktrees/DCIM_Compliance_App/aoq

# Install dependencies
npm install --legacy-peer-deps

# Start dev server
npm run dev
# App runs at http://localhost:5173

# Run unit tests (43 tests)
npm run test:run

# Run E2E tests (3 tests, requires dev server)
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:e2e

# Build for production
npm run build
```

### Environment Setup

Create `.env.local` in project root:
```
VITE_API_BASE_URL=https://dcim-api-worker.dannybuk.workers.dev
```

---

## 🧪 Testing the Verification Stack

### Manual Test
1. Open http://localhost:5173
2. Click any facility
3. Go to **"Verification"** tab
4. See combined confidence score and source breakdown

### Chaos Test (Dev Mode)
1. Go to **Incident Command** tab
2. Find yellow **"Verification Test Panel"**
3. Click **"Emit Verified Critical"** → should auto-create confirmed incident
4. Click **"Emit Unverified Critical"** → should NOT auto-create

---

## 📊 Recent Commits (January 10, 2026)

```
d54d54d7 docs: Update handoff with E2E test info
4b901c8d fix: Update Playwright config and fix dashboard test selector
47afc8ed test: Add Playwright E2E test framework
9e4a2dce docs: Add comprehensive Claude handoff
ffa0cb69 feat: Integrate unified verification with Dempster-Shafer UI
604fd091 feat: Add unified verification with Dempster-Shafer evidence fusion
96eea6ba feat: Wire FacilityVerificationPanel into DetailedFacilityView
4926562d feat: Add FacilityVerificationPanel UI component
4c1a1faf feat: Add EIA energy verification service
7a4c7bba feat: Add EPA ECHO facility verification service
180701cc feat: Add audit snapshots for verification decision trails
d6945a34 feat: Add client-side rate limiting with exponential backoff
82cd44a8 feat: Add verification test panel for chaos testing
59159ba8 feat: Add verification pipeline with antifragile incident command
```

---

## 🛡️ Antifragile Safety Features

| Feature | Implementation |
|---------|----------------|
| **Suspected by default** | Incidents start as "suspected" |
| **Verification gate** | RouteViews + RPKI required for auto-confirm |
| **Auto-link** | New events link to existing incidents by correlationId |
| **Auto-create gate** | Only Verified + Critical + Not Degraded |
| **Degraded mode** | Suppresses automation when services down (3 consecutive failures) |
| **Rate limiting** | Exponential backoff + circuit breaker (5 failures opens circuit) |
| **Audit snapshots** | Records verification state at decision time |

---

## 🔗 Cloudflare Worker

**URL:** `https://dcim-api-worker.dannybuk.workers.dev`

### Endpoints
- `/api/health` — Health check
- `/api/routeviews/prefix/:prefix` — RouteViews BGP data
- `/api/eia/*` — EIA API proxy (injects API key)

### Deploy Worker
```bash
cd cloudflare-worker
npx wrangler login
npx wrangler deploy
npx wrangler secret put EIA_API_KEY  # Get free key from eia.gov
```

---

## 🏛️ Project Conventions

- **Functional React components only**; named exports
- **Avoid `any`** — use `unknown` + type guards
- **Tailwind**: no dynamic class generation
- **Antifragility**: circuit breakers on all APIs, error boundaries on all tabs
- **Graceful fallbacks**: always show something, never blank screen
- **Offline-first**: IndexedDB for all persistent state

---

## 📋 Continuation Prompt

Copy this to start the next Claude session:

```
I'm continuing work on the DCIM Compliance App (labor organizing tool).

**Current State:**
- Antifragile multi-source verification complete (EPA, EIA, BGP/RPKI)
- Dempster-Shafer evidence fusion working
- 43 unit tests + 3 E2E tests passing
- All pushed to main branch

**Key Files:**
- src/services/unifiedVerification.ts (evidence fusion)
- src/components/FacilityVerificationPanel.tsx (UI)
- src/services/verificationDegradedMode.ts (safety layer)
- src/db/database.ts (schema v15)

**Worker URL:** https://dcim-api-worker.dannybuk.workers.dev

**Next priorities (pick one):**
- A) Add Certificate Transparency monitoring
- B) Add SEC EDGAR corporate ownership verification
- C) Add more E2E tests for verification flow
- D) Performance optimization (lazy loading)

Please read CLAUDE_COMPLETE_HANDOFF.md for full architecture context.
```

---

## 🚧 Known Issues

1. **Cloudflare Pages** may show deployment failures if `dcim-dashboard` project exists with wrong config. Safe to delete that project.

2. **EPA JSONP** has ~5 req/min rate limit. Multiple rapid verifications may fail.

3. **EIA verification** requires Worker proxy and `VITE_API_BASE_URL` env var.

---

## 📞 Quick Debug Commands

```javascript
// Browser console - check verification services
import('/src/services/unifiedVerification.ts').then(m => {
  m.runUnifiedVerification({
    facilityName: 'Test',
    latitude: 39.04,
    longitude: -77.49,
    state: 'VA'
  }).then(console.log);
});

// Check degraded mode status
import('/src/services/verificationDegradedMode.ts').then(m => {
  console.log(m.verificationDegradedMode.getState());
});

// Check telemetry events
import('/src/db/database.ts').then(m => {
  m.db.telemetryEvents.toArray().then(console.log);
});
```

---

*Generated: January 10, 2026*  
*Labor organizing tool — helping unions fight Big Tech*
