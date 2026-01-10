# DCIM Compliance App - Complete Handoff Document
**Date**: January 5, 2026  
**Purpose**: Full context transfer for Claude continuation  
**App Status**: ✅ Running at `http://localhost:5173/`

---

## 🎯 Project Mission

**THIS IS A LABOR ORGANIZING TOOL, NOT A CORPORATE DCIM TOOL**

Arm labor unions and community organizers with data to fight Big Tech's broken promises. Track 11,992 data center facilities and expose the $2.48B+ subsidy gap.

---

## 📊 Current App State

| Metric | Value |
|--------|-------|
| Total Facilities | 11,992 |
| Compliant | 5,320 (44.4%) |
| Non-Compliant | 3,251 (27.1%) |
| At Risk | 3,421 (28.5%) |
| Total Subsidy Gap | $4.75B |
| Countries Tracked | 46 |
| Operators Tracked | 48 |

---

## 🛠️ Tech Stack

```
React 18 + TypeScript + Vite + Tailwind CSS + IndexedDB (Dexie.js)
```

**Key Dependencies:**
- `react-window` - Virtual scrolling for 11,992 facilities
- `@tensorflow/tfjs` - Browser-based ML
- `simple-statistics` - Statistical analysis
- `lucide-react` - Icons
- `framer-motion` - Animations

---

## 📁 Project Structure (Key Files)

```
DCIM Compliance App/
├── src/
│   ├── components/
│   │   ├── HybridDashboard.tsx      # Main dashboard (2,081 lines)
│   │   ├── AntifragilityDashboard.tsx # Antifragility control center (627 lines)
│   │   ├── RLMVisualization.tsx     # RLM query visualization (406 lines)
│   │   ├── ErrorBoundary.tsx        # Enhanced crash isolation
│   │   ├── VirtualFacilityTable.tsx # High-perf virtual scrolling
│   │   └── [30+ other components]
│   │
│   ├── services/
│   │   ├── recursiveQueryEngine.ts  # RLM-inspired query engine (712 lines)
│   │   ├── chaosEngineering.ts      # Netflix-style fault injection
│   │   ├── gracefulDegradation.ts   # Progressive feature degradation
│   │   ├── selfHealing.ts           # Automatic failure recovery
│   │   ├── predictiveFailure.ts     # ML-based failure prediction
│   │   ├── patternInference.ts      # Pattern detection engine
│   │   ├── bgpMonitoring.ts         # BGP route monitoring
│   │   └── ctMonitoring.ts          # Certificate transparency
│   │
│   ├── hooks/
│   │   ├── useDebounce.ts           # Search debouncing
│   │   └── useRLMQuery.ts           # RLM query hooks
│   │
│   ├── utils/
│   │   ├── safeData.ts              # 15+ defensive utilities
│   │   ├── circuitBreaker.ts        # API protection
│   │   └── errorTracking.ts         # Error logging
│   │
│   ├── integrations/
│   │   ├── secEdgar.ts              # SEC EDGAR API
│   │   ├── epaEcho.ts               # EPA ECHO API
│   │   ├── usaSpending.ts           # USASpending API
│   │   ├── peeringDb.ts             # PeeringDB API
│   │   └── openCorporates.ts        # OpenCorporates API
│   │
│   └── db/
│       ├── database.ts              # IndexedDB schema
│       └── seedData.ts              # 11,992 facility generator
│
├── .vscode/
│   └── tasks.json                   # Auto-start dev server on folder open
│
└── AGENTS.md                        # AI coding assistant guidelines
```

---

## 🛡️ Antifragility Architecture (NEW - Jan 5, 2026)

### The 4 Pillars of Antifragility

#### 1. Chaos Engineering (`chaosEngineering.ts`)
Netflix-style fault injection for testing resilience:

```typescript
// 8 Experiments Available:
- Latency Spike (2-5s delays)
- API Error Injection (20% failure rate)
- Data Corruption (malformed JSON)
- Timeout Storm (all requests timeout)
- Memory Pressure (simulate low memory)
- Network Partition (offline simulation)
- Cascade Failure (chain reaction)
- Resource Exhaustion (IndexedDB overload)

// Usage:
import { chaosEngine, enableChaos, runChaosExperiment } from './services/chaosEngineering';

chaosEngine.enable({ safeMode: true }); // Safe mode blocks high-severity
await chaosEngine.runExperiment('latency-spike');
```

#### 2. Graceful Degradation (`gracefulDegradation.ts`)
Progressive feature disabling under stress:

```typescript
// Service Levels: full → reduced → minimal → offline
// 14 features with priority levels (1-10)

import { degradationService } from './services/gracefulDegradation';

degradationService.startMonitoring(5000); // Check every 5s
const level = degradationService.getServiceLevel(); // 'full' | 'reduced' | 'minimal' | 'offline'
const isAvailable = degradationService.isFeatureAvailable('data-visualizations');
```

#### 3. Self-Healing System (`selfHealing.ts`)
Automatic failure detection & recovery:

```typescript
// 13 Health Indicators across 5 categories:
// - Performance: memory, render time, DB query time
// - Reliability: error rate, crash count, recovery success
// - Data: integrity, sync status, cache hit rate
// - UI: responsiveness, component health
// - Network: API availability, request success

// 8 Healing Actions:
// - Clear cache, restart workers, repair DB
// - Reset UI state, reconnect APIs, compact storage
// - Force GC, reload resources

import { selfHealingService } from './services/selfHealing';

selfHealingService.start(10000); // Monitor every 10s
const score = selfHealingService.getHealthScore(); // 0-100
await selfHealingService.executeHealingAction('clear-cache');
```

#### 4. Predictive Failure Detection (`predictiveFailure.ts`)
ML-inspired failure prediction:

```typescript
import { predictiveFailureEngine, recordMetric } from './services/predictiveFailure';

// Record metrics for analysis
recordMetric('memory-usage', 75);
recordMetric('error-rate', 3);

// Get predictions
const predictions = predictiveFailureEngine.getAllPredictions();
const riskScore = predictiveFailureEngine.getRiskScore(); // 0-100
const warnings = predictiveFailureEngine.getEarlyWarnings();
const forecast = predictiveFailureEngine.forecast('memory-usage', 10); // Next 10 points
```

---

## 🔄 RLM Query Engine (`recursiveQueryEngine.ts`)

Inspired by MIT CSAIL's Recursive Language Models paper:

```typescript
import { 
  analyzeComplianceRLM, 
  detectPatternsRLM, 
  searchFacilitiesRLM 
} from './services/recursiveQueryEngine';

// Analyze compliance with recursive decomposition
const result = await analyzeComplianceRLM();
// Returns: { success, data, metadata: { chunksUsed, recursionDepth, executionTimeMs } }

// Detect patterns by type
const patterns = await detectPatternsRLM('subsidy'); // or 'geographic', 'operator'

// Search with natural language
const facilities = await searchFacilitiesRLM('Amazon facilities in Texas');
```

**Key Features:**
- Automatic decomposition when queries are too large
- Recursive self-invocation on smaller chunks
- Result aggregation with conflict resolution
- Alternative path exploration on failures
- Memory-efficient out-of-core processing

---

## 🎨 UI Components

### HybridDashboard Tabs
1. **Data Table** - Virtual scrolling table with 11,992 facilities
2. **Hierarchy** - Nested tree view (Country → State → Operator → Facility)
3. **Summary** - Comprehensive statistics with 9 expandable sections
4. **RLM Engine** - Recursive query visualization
5. **Antifragility** - System health monitoring & chaos engineering

### Key Sub-Components
```typescript
// Safe data utilities
import { safeArray, safeSum, safeCount, safeCurrency } from './utils/safeData';

// Debounced search
import { useDebounce, useDebouncedCallback } from './hooks/useDebounce';
const debouncedSearch = useDebounce(searchQuery, 300);

// Error boundaries
import { ErrorBoundary } from './components/ErrorBoundary';
<ErrorBoundary tabName="Data Table">
  <VirtualFacilityTable facilities={filtered} onSelect={setSelectedFacility} />
</ErrorBoundary>
```

---

## 🔌 API Integrations

All APIs are wrapped with circuit breakers and rate limiting:

| API | Endpoint | Data Retrieved |
|-----|----------|----------------|
| SEC EDGAR | sec.gov | Corporate filings, 10-K, 8-K |
| EPA ECHO | echo.epa.gov | Environmental compliance |
| USASpending | usaspending.gov | Federal contracts, grants |
| PeeringDB | peeringdb.com | Network infrastructure |
| OpenCorporates | opencorporates.com | Company data, officers |
| OSHA | osha.gov | Safety violations |
| Census | census.gov | Demographic data |
| BLS | bls.gov | Employment data |

---

## 🚀 Quick Start Commands

```bash
# Development (auto-starts when folder opens in Cursor)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📋 Database Schema (IndexedDB)

```typescript
// Dexie.js schema
db.version(1).stores({
  facilities: '++id, name, operator, state, city, country, type, status',
  settings: 'key',
  featureFlags: 'key',
  mlModels: 'id, type, version',
  patterns: '++id, type, confidence, timestamp',
  predictions: '++id, facilityId, type, probability',
  bgpAnomalies: '++id, prefix, timestamp',
  ctAlerts: '++id, domain, timestamp',
  curiosityQuestions: '++id, question, answer, confidence',
  correlations: '++id, sourceType, targetType, strength'
});
```

---

## 🐛 Known Issues & Limitations

1. **No real facility data** - Uses generated seed data (11,992 facilities)
2. **CORS restrictions** - Some APIs require Cloudflare Worker proxy
3. **No authentication** - App is client-side only
4. **No offline mode** - Requires network for API calls

---

## 📝 Recent Changes (Jan 4-5, 2026)

### Session 1 (Jan 4)
- ✅ Implemented RLM-inspired query engine
- ✅ Created comprehensive Summary view with 9 sections
- ✅ Added virtual scrolling for facility table
- ✅ Implemented debounced search (300ms)
- ✅ Wrapped all tabs in ErrorBoundary
- ✅ Added safe data utilities

### Session 2 (Jan 5)
- ✅ Created Chaos Engineering module (8 experiments)
- ✅ Created Graceful Degradation service (14 features, 4 service levels)
- ✅ Created Self-Healing system (13 indicators, 8 healing actions)
- ✅ Created Predictive Failure Detection engine
- ✅ Created Antifragility Dashboard UI
- ✅ Integrated all systems into HybridDashboard

---

## 🎯 Next Development Priorities

1. **Real Data Integration** - Import actual facility data
2. **Export Features** - CSV/PDF reports
3. **Offline Support** - Service worker + PWA
4. **Authentication** - Secure API key management
5. **Cloudflare Deployment** - Production deployment

---

## 💡 AI Coding Guidelines

**DO:**
- Use functional components with hooks
- Add error boundaries for new features
- Wrap API calls with circuit breakers
- Use TypeScript strict mode
- Test resilience (failures, bad input)

**DON'T:**
- Use class components
- Use `any` types
- Create default exports
- Add console.log in production
- Skip error handling

---

## 🔧 Configuration Files

### Auto-start (`.vscode/tasks.json`)
```json
{
  "tasks": [{
    "label": "Start Dev Server",
    "type": "npm",
    "script": "dev",
    "runOptions": { "runOn": "folderOpen" },
    "isBackground": true
  }]
}
```

### Vite Config Highlights
```typescript
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  build: { sourcemap: true }
});
```

---

## 📞 Quick Commands for Claude

**To show the app:**
> "Show my DCIM app" or "Open http://localhost:5173/"

**To run dev server:**
> "Run npm run dev in the DCIM Compliance App folder"

**To check antifragility:**
> "Open the Antifragility tab and show the health score"

**To search facilities:**
> "Search for Amazon facilities in Texas"

---

*Generated for seamless context transfer to Claude*
*Last updated: January 5, 2026*

