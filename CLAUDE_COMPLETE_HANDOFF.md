# DCIM Compliance App — Complete Claude Handoff

**Date:** January 10, 2026  
**Version:** Post-CT-Monitoring + Performance Optimization  
**Test Status:** 55 unit tests ✅ | 32 E2E tests ✅

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
│  Storage: IndexedDB (Dexie v16) — offline-first                 │
│  API Proxy: Cloudflare Worker (RouteViews, EIA)                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  VERIFICATION STACK                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   EPA ECHO ──────┐                                              │
│   (browser JSONP) │                                              │
│                   │                                              │
│   EIA Energy ────┼──► Dempster-Shafer ──► Combined Confidence   │
│   (via Worker)    │    Evidence Fusion                           │
│                   │                                              │
│   CT Monitoring ─┘                                              │
│   (CertStream WS)                                                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│                    PERFORMANCE LAYER                             │
├─────────────────────────────────────────────────────────────────┤
│   Verification Cache ──► 1hr TTL ──► Max 500 entries            │
│   Debounced Calls (300ms) ──► Prevents API spam                 │
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

### Verification Services

| File | Purpose |
|------|---------|
| `src/services/epaVerification.ts` | EPA ECHO JSONP (browser-direct) |
| `src/services/eiaVerification.ts` | EIA API via Worker proxy |
| `src/services/ctMonitoring.ts` | CertStream WebSocket + DC detection |
| `src/services/unifiedVerification.ts` | Dempster-Shafer fusion + caching |
| `src/services/verificationCache.ts` | IndexedDB result caching |
| `src/services/rpkiValidation.ts` | RPKI validation with IPv4 trie |
| `src/services/bgpMonitoring.ts` | RIPE RIS Live + RouteViews |

### Incident & Telemetry

| File | Purpose |
|------|---------|
| `src/services/telemetryBus.ts` | Append-only event sourcing |
| `src/services/incidentCommand.ts` | Incident CRUD + auto-linking |
| `src/services/verificationDegradedMode.ts` | Health polling + degraded state |
| `src/services/auditSnapshot.ts` | Decision trail recording |

### Confidence Framework

| File | Purpose |
|------|---------|
| `src/services/dempsterShafer.ts` | Evidence fusion math |
| `src/services/sourceConfidence.ts` | NATO/Admiralty 6x6 framework |
| `src/services/temporalDecay.ts` | Confidence decay over time |

### UI Components

| File | Purpose |
|------|---------|
| `src/components/FacilityVerificationPanel.tsx` | Unified verification display |
| `src/components/VerificationStatusBadge.tsx` | Degraded mode indicator |
| `src/components/VerificationTestPanel.tsx` | Chaos testing panel |
| `src/components/tabs/IncidentCommandTab.tsx` | Incident management UI |

### Hooks

| File | Purpose |
|------|---------|
| `src/hooks/useCTMonitoring.ts` | CT connection state + alerts |
| `src/hooks/useVerificationDegraded.ts` | Degraded mode state |

### Tests

| File | Tests |
|------|-------|
| `src/services/ctMonitoring.test.ts` | 12 CT monitoring tests |
| `src/services/telemetryBus.test.ts` | 3 telemetry tests |
| `src/services/rpkiValidation.test.ts` | 3 RPKI tests |
| `e2e/dashboard.spec.ts` | 3 dashboard tests |
| `e2e/verification-flow.spec.ts` | 7 verification tests |
| `e2e/degraded-mode.spec.ts` | 5 degraded mode tests |
| `e2e/evidence-fusion.spec.ts` | 8 evidence fusion tests |
| `e2e/incident-automation.spec.ts` | 9 incident tests |

---

## 🗄️ Database Schema (v16)

```typescript
// Key tables for verification pipeline
telemetryEvents: 'id, timestamp, source, type, severity, ...'
incidents: 'id, status, severity, createdAt, ...'
incidentEventLinks: '++id, incidentId, eventId, timestamp'
bgpPrefixBaselines: 'id, originAsn, prefix, lastSeen'
rpkiCache: 'key, fetchedAt'
auditSnapshots: 'id, timestamp, snapshotType, ...'
verificationCache: 'key, cachedAt, expiresAt'  // NEW in v16
```

---

## 🔧 Verification Sources

| Source | Method | Caching | Rate Limits |
|--------|--------|---------|-------------|
| **EPA ECHO** | Browser JSONP | 1hr | ~5 req/min |
| **EIA** | Worker proxy | 1hr | 9000 req/hour |
| **CT** | CertStream WS | N/A | Streaming |
| **BGP/RPKI** | Worker proxy | 30s | 1 req/sec |

### Dempster-Shafer Mass Function

```typescript
interface MassFunction {
  belief: number;      // Evidence FOR
  disbelief: number;   // Evidence AGAINST
  uncertainty: number; // Unknown
}
// Pignistic probability = belief + 0.5 * uncertainty
```

---

## 🚀 How to Run

```bash
cd /Users/danielbuk/.cursor/worktrees/DCIM_Compliance_App/aoq

# Install dependencies
npm install --legacy-peer-deps

# Start dev server
npm run dev                    # http://localhost:5173

# Run unit tests (55 tests)
npm run test:run

# Run E2E tests (32 tests)
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run test:e2e

# Build for production
npm run build
```

### Environment Setup
Create `.env.local`:
```
VITE_API_BASE_URL=https://dcim-api-worker.dannybuk.workers.dev
```

---

## 🛡️ Antifragile Safety Features

| Feature | Implementation |
|---------|----------------|
| **Verification Cache** | 1hr TTL, max 500 entries, auto-cleanup |
| **Debounced Calls** | 300ms debounce prevents API spam |
| **Suspected by default** | Incidents start as "suspected" |
| **Verification gate** | RouteViews + RPKI for auto-confirm |
| **Auto-create gate** | Only Verified + Critical + Not Degraded |
| **Degraded mode** | Suppresses automation when services down |
| **Rate limiting** | Exponential backoff + circuit breaker |
| **Audit snapshots** | Records verification state at decision time |

---

## 🔗 Cloudflare Worker

**URL:** `https://dcim-api-worker.dannybuk.workers.dev`

- `/api/health` — Health check
- `/api/routeviews/prefix/:prefix` — RouteViews BGP data
- `/api/eia/*` — EIA API proxy

---

## 📊 Recent Commits

```
54c41ac7 perf: Add verification caching and debouncing
b6e84626 feat: Add Certificate Transparency (CT) monitoring
bd010465 fix: Update E2E tests for robust UI navigation
5a1e053d test: Add comprehensive E2E test suite
47d6a470 docs: Add complete Claude handoff
ffa0cb69 feat: Integrate unified verification with Dempster-Shafer UI
604fd091 feat: Add unified verification with Dempster-Shafer evidence fusion
4926562d feat: Add FacilityVerificationPanel UI component
7a4c7bba feat: Add EPA ECHO facility verification service
4c1a1faf feat: Add EIA energy verification service
180701cc feat: Add audit snapshots for verification decision trails
d6945a34 feat: Add client-side rate limiting with exponential backoff
82cd44a8 feat: Add verification test panel for chaos testing
59159ba8 feat: Add verification pipeline with antifragile incident command
```

---

## 📋 Continuation Prompt

```
I'm continuing work on the DCIM Compliance App (labor organizing tool).

**Current State:**
- Multi-source verification complete (EPA, EIA, CT, BGP/RPKI)
- Dempster-Shafer evidence fusion working
- Verification caching (1hr TTL, 300ms debounce)
- 55 unit tests + 32 E2E tests passing
- All pushed to main branch

**Key Files:**
- src/services/unifiedVerification.ts (fusion + caching)
- src/services/ctMonitoring.ts (CertStream WebSocket)
- src/services/verificationCache.ts (IndexedDB caching)
- src/db/database.ts (schema v16)

**Worker URL:** https://dcim-api-worker.dannybuk.workers.dev

**Possible next steps:**
- A) SEC EDGAR corporate ownership verification
- B) Add CT alert filtering UI
- C) Performance profiling
- D) Additional E2E test coverage

Please read CLAUDE_COMPLETE_HANDOFF.md for full context.
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

*Generated: January 10, 2026*  
*Labor organizing tool — helping unions fight Big Tech*
