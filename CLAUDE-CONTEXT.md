# DCIM Compliance App - Claude Context Document

**Last Updated**: January 4, 2026  
**Attach this file to any Claude conversation to restore full project context**

---

## 🎯 Project Mission

**DCIM Compliance App** is a **labor organizing tool** (NOT a corporate DCIM tool) that arms unions, community organizers, and regulatory bodies with data to fight Big Tech's broken job creation promises.

| Metric | Value |
|--------|-------|
| Facilities Tracked | 11,992 |
| Subsidy Records | 722,000+ |
| Annual State Losses | $5B+ |
| Avg Cost Per Job | $2M (vs $50K cap) |
| React Components | 45+ |
| API Integrations | 12 |

**Tech Stack**: React 18 + TypeScript + Vite + Tailwind CSS + IndexedDB (Dexie.js)  
**Architecture**: Zero-backend, client-side only, antifragile  
**Deployment**: Cloudflare Pages at `dcim-compliance.pages.dev`  
**GitHub**: `https://github.com/dannybuk-byte/DCIM.git`

---

## 🏗️ Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  INGESTION  │ → │ PERSISTENCE │ → │INTELLIGENCE │ → │PRESENTATION │
│ WebSocket   │    │ IndexedDB   │    │TensorFlow.js│    │   React     │
│ REST APIs   │    │ Dexie.js    │    │ Statistics  │    │  Recharts   │
│ Scrapers    │    │ localStorage│    │ Correlation │    │  Tailwind   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
```

### 7 Layers of Antifragility (All Active)

1. **Error Boundaries** - Component crash containment
2. **Circuit Breakers** - API/storage failure handling (3 failures, 30s reset)
3. **Database Resilience** - IndexedDB retry logic
4. **Rate Limiting** - API abuse prevention
5. **Input Sanitization** - 200 char max, XSS prevention
6. **Global Error Handler** - Unhandled exception catch
7. **Error Tracking** - Debug logging to localStorage

---

## ✅ Implemented Features

### 1. Antifragile Navigation System
**File**: `src/components/AntifragileNavigation.tsx`

- **Smart Search (⌘K)** - Fuzzy matching, keyword boosting, natural language
- **Tab Groups** - Collapsible categories with localStorage persistence
- **Quick Access Bar** - Pinned favorites + recent tabs
- **NavProvider** - React Context for shared state

### 2. Predictive Subsidy Intelligence
**Files**: `src/services/predictiveSubsidyIntelligence.ts`, `src/components/PredictiveSubsidyDashboard.tsx`

- Risk scoring based on job delivery rates
- Cost-per-job analysis ($50K threshold)
- Early warning signal detection
- Clawback trigger tracking

### 3. Regulatory Toolkit (Municipal DCIM)
**Files**: `src/services/regulatoryDataSources.ts`, `src/components/RegulatoryToolkit.tsx`

- 30+ data source catalog (Power, Employment, Corporate, Environmental)
- Scraper templates (Python, JavaScript)
- Municipal integration playbooks

### 4. Pattern Intelligence Engine
**Files**: `src/services/patternInference.ts`, `bgpMonitoring.ts`, `ctMonitoring.ts`, `curiosityEngine.ts`, `correlationEngine.ts`

| Module | Purpose |
|--------|---------|
| AnomalyDetector | TensorFlow.js autoencoder for anomaly detection |
| WorkloadClassifier | Crypto mining detection (XMR-Ray methodology) |
| BGP Monitoring | RIPE RIS Live WebSocket for expansion signals |
| CT Monitoring | CertStream for certificate transparency |
| Curiosity Engine | Self-aware question generation |
| Correlation Engine | Multi-signal pattern matching |

### 5. Deep Intelligence
**File**: `src/components/DeepIntelligence.tsx`

- Full API data extraction from OpenCorporates, SEC, PeeringDB, USASpending
- Nested tabs + expandable records + scrollable sections

### 6. Real-Time Intelligence
**File**: `src/components/RealTimeIntelligence.tsx`

- Live data from 6+ APIs with Cloudflare Worker proxy
- Nested expandability per record

### 7. Data Points Explorer
**File**: `src/components/DataPointsExplorer.tsx`

- All 241 DCIM/DMaaS surveillance data points
- Expandable/retractable with category filtering

### 8. Surveillance Analysis
**File**: `src/components/SurveillanceAnalysis.tsx`

- DCIM/DMaaS surveillance vectors visualization
- Counter-intelligence patterns

---

## 📁 Key Files

```
src/
├── components/
│   ├── AntifragileNavigation.tsx     # Smart Search, Tab Groups, Quick Access
│   ├── DCIMCommandCenter.tsx          # Main dashboard (24 tabs)
│   ├── DeepIntelligence.tsx           # Full API data extraction
│   ├── RealTimeIntelligence.tsx       # Live data display
│   ├── DataPointsExplorer.tsx         # 241 data points UI
│   ├── SurveillanceAnalysis.tsx       # Surveillance vectors
│   ├── PatternIntelligenceDashboard.tsx
│   ├── PredictiveSubsidyDashboard.tsx
│   └── RegulatoryToolkit.tsx
├── services/
│   ├── patternInference.ts            # ML engine
│   ├── bgpMonitoring.ts               # RIPE RIS Live
│   ├── ctMonitoring.ts                # CertStream
│   ├── curiosityEngine.ts
│   ├── correlationEngine.ts
│   ├── predictiveSubsidyIntelligence.ts
│   └── regulatoryDataSources.ts
├── integrations/
│   ├── secEdgar.ts                    # SEC EDGAR API
│   ├── epaEcho.ts                     # EPA ECHO API
│   ├── openCorporates.ts              # With proxy fallback
│   ├── peeringDb.ts                   # With proxy fallback
│   └── usaSpending.ts
├── utils/
│   ├── circuitBreaker.ts
│   ├── dbOperations.ts
│   ├── errorTracking.ts
│   ├── rateLimiter.ts
│   └── sanitization.ts
└── db/database.ts                     # Dexie.js schema
```

---

## 🌐 API Integrations

### Government APIs (FRE 902 Compliant)

| Source | Endpoint | Status |
|--------|----------|--------|
| SEC EDGAR | `data.sec.gov` | ✅ Active |
| EPA ECHO | `echo.epa.gov` | ✅ Active |
| USASpending | `api.usaspending.gov` | ✅ Active |
| BLS QCEW | `api.bls.gov` | ⏳ Needs API key |
| EIA | `api.eia.gov` | ⏳ Needs API key |
| GLEIF LEI | `api.gleif.org` | ✅ Active |

### Real-Time WebSockets

| Source | Endpoint |
|--------|----------|
| RIPE RIS Live | `wss://ris-live.ripe.net/v1/ws/` |
| CertStream | `wss://certstream.calidog.io/` |

### CORS-Proxied (Cloudflare Worker)

- OpenCorporates → `/api/opencorporates/`
- PeeringDB → `/api/peeringdb/`
- USASpending → `/api/usaspending/`

---

## 🎨 Navigation Structure

### Command Center Tabs (24 total)

**Getting Started**: Guides, Overview  
**Analysis & Intelligence**: Geography, Problems, Early Warning, Geographic Intel, Subsidy Tracking, Worker Safety, Facilities, OSINT Tools, Intelligence, Pattern Intelligence, Deep Intelligence, Predictive Intel, Predictive Subsidy, Regulatory Toolkit  
**Operations**: Infrastructure, Network Security, Reports  
**Visualization**: Compare, Connectography, Explorer, Compliance Flow, Assurance Monitor

### Keyboard Shortcuts

- `⌘K` / `Ctrl+K` - Open Smart Search
- `↑↓` - Navigate results
- `Enter` - Go to selected
- `Esc` - Close modal

---

## 📊 Pattern Detection

### High-Confidence Patterns (90%+)

| Signal | Inference | Confidence |
|--------|-----------|------------|
| Job delivery <50% | Clawback trigger | 95%+ |
| Power variance <5% (7+ days) | Crypto mining | 90%+ |
| New BGP prefix + CT certs | Expansion imminent | 90%+ |
| Cost-per-job >$500K | Structural failure | 90%+ |

### Workload Classification

| Type | Power Variance | Pattern |
|------|----------------|---------|
| Crypto Mining | <5% | 24/7 constant |
| AI Training | 30-60% | Episodic bursts |
| Traditional DC | 20-40% | Diurnal cycle |

---

## 🗄️ Database Schema (IndexedDB)

```typescript
// Core
facilities: '++id, name, operator, state, complianceStatus'
complianceReports: '++id, facilityId, date, status'

// Intelligence
mlPatterns: '++id, facilityId, patternType, confidence, timestamp'
bgpAnomalies: '++id, asn, prefix, anomalyType, timestamp'
ctAlerts: '++id, domain, issuer, timestamp'
curiosityQuestions: '++id, question, priority, status'
correlations: '++id, signals, confidence, inference'
```

### localStorage Keys

- `nav_pinned_tabs` - Pinned favorites
- `nav_recent_tabs` - Last 10 visited
- `nav_expanded_groups` - Expanded groups
- `nav_error_log` - Navigation errors
- `dcim_error_log` - Global errors

---

## 📈 Implementation Status

### ✅ Complete

- [x] Antifragile Navigation (Smart Search ⌘K)
- [x] 7 layers of error protection
- [x] Pattern Intelligence Engine
- [x] BGP/CT Monitoring services
- [x] Predictive Subsidy Intelligence
- [x] Regulatory Toolkit (30+ sources)
- [x] Deep Intelligence (full API extraction)
- [x] Real-Time Intelligence
- [x] Data Points Explorer (241 points)
- [x] 12 API integrations

### 🔄 In Progress

- [ ] Evidence package generation UI
- [ ] Export to litigation-ready format

### ⏳ Planned

- [ ] WebSocket reconnection with exponential backoff
- [ ] Offline support (Service Worker)
- [ ] PWA configuration
- [ ] Automated testing (Vitest + Playwright)

---

## 🔧 Development Commands

```bash
cd "/Users/danielbuk/DCIM Compliance App"
npm run dev          # Start dev server (port 5173)
npm run build        # Production build
npm run preview      # Preview production build
```

### Test Smart Search
1. Run `npm run dev`
2. Open http://localhost:5173
3. Switch to "Command Center" mode (dropdown top-left)
4. Press `⌘K` to open Smart Search
5. Type "subsidy" to test fuzzy matching

---

## 📚 Research Foundation

### Good Jobs First
- Subsidy Tracker: 722K records
- "Cloudy with a Loss of Spending Control" (2025)
- $50,000/job threshold recommendation

### Academic
- Bartik (Upjohn): 75-98% subsidy waste rate
- Mercatus: Foxconn cost-benefit analysis

### Evidence Standards
- FRE 902(5): Official government publications
- SHA-256 hashing for chain of custody
- NIST IR 8387 compliance

---

## 🏷️ Conventions

### Code Style
- Functional components only (no classes)
- Named exports only (no default exports)
- TypeScript strict mode (no `any`)
- 2 spaces indentation, semicolons required

### Component Pattern
```typescript
interface Props {
  prop1: string;
  prop2?: number;
}

export const ComponentName: React.FC<Props> = ({ prop1, prop2 }) => {
  const [state, setState] = useState<Type>(initial);
  
  const handleEvent = useCallback(() => {
    // logic
  }, [deps]);
  
  return <div>{/* content */}</div>;
};
```

### Error Handling
- Wrap API calls with circuit breaker
- Use ErrorBoundary for components
- Always provide fallback behavior
- Log errors to tracking system

---

## 📝 Quick Context for Claude

**What is this?** A browser-based labor organizing tool that tracks 11,992 data center facilities and exposes $5B+ in wasted subsidies.

**Who uses it?** Labor unions (Tech Workers Coalition, CODE-CWA), community organizers (UPROSE), regulatory bodies, and investigative journalists.

**What makes it special?**
1. Zero-backend (all client-side, no surveillance concerns)
2. 7 layers of antifragility (never crashes)
3. FRE 902 compliant evidence standards
4. Real-time BGP/CT monitoring for expansion detection
5. Predictive risk scoring (not just post-hoc)

**Key insight:** Data centers can't hide. Facilities consuming 50-100+ MW appear in utility queues, BGP announcements, and CT logs. The same characteristics making them expensive to subsidize make them impossible to operate invisibly.

---

**Every feature must answer: "Does this help organizers win against Big Tech?"**

*DCIM Compliance Dashboard | 11,992 facilities • $5B+ accountability gap*

