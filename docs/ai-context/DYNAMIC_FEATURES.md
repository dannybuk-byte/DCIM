# Dynamic & Interactive Features Reference

**Last Updated**: January 7, 2026  
**Purpose**: Preserve context on all interactive/dynamic features for future AI sessions

---

## 🎯 Overview

This document catalogs all dynamic, interactive, and AI-powered features in the DCIM Compliance App. Use this as a reference when continuing development across sessions.

---

## 🤖 AI-Powered Features

### 1. Natural Language Search (NLP)

**Location**: `src/ai/`, `src/hooks/useSectionNLP.ts`

```typescript
// Core NLP query conversion
src/ai/nlQueryConverter.ts     // Multi-layer NLP pipeline
src/ai/adaptiveNLP.ts          // Self-learning query patterns
src/ai/sectionPrompts.ts       // Section-specific AI prompts
src/ai/askAI.ts                // Core AI engine with circuit breakers
```

**Features**:
- Converts natural language to structured queries
- Context-aware suggestions per section
- Learns from user patterns (stored in IndexedDB)
- Fallback chain: Adaptive → OpenAI → Keywords

**Usage**:
```typescript
import { useSectionNLP } from '../hooks/useSectionNLP';

const { query, suggestions, executeQuery } = useSectionNLP('organizing');
```

### 2. Contextual NLP Widget

**Location**: `src/components/shared/ContextualNLPWidget.tsx`

Two modes:
- **Inline**: Search bar in section headers
- **Floating**: Expandable assistant button (bottom-right)

**Props**:
```typescript
interface ContextualNLPWidgetProps {
  context: SectionContext;  // 'sanctions' | 'organizing' | 'subsidies' | etc.
  mode: 'inline' | 'floating';
  onAction: (action: NLPAction) => void;
}
```

### 3. Predictive Intelligence Engine

**Location**: `src/analyzers/predictive/engine.ts`

**Features**:
- Risk scoring for facilities (0-100)
- Monte Carlo simulations for subsidy gap projections
- ARIMA-style trend analysis
- Early warning system

**Key Functions**:
```typescript
calculateFacilityRiskScore(facility, facilities)  // Returns risk factors
runMonteCarloSimulation(facilities, iterations)   // Subsidy projections
detectRiskPatterns(facilities)                    // Pattern detection
```

### 4. Unified Intelligence Engine

**Location**: `src/analyzers/unified/intelligenceEngine.ts`

**Features**:
- Statistical anomaly detection (z-score based)
- Trend analysis for subsidy gaps
- Cross-facility correlation detection
- Automated intelligence briefings

---

## 🗺️ Interactive Visualizations

### 1. 3D Globe View

**Location**: `src/components/GlobeView.tsx`

**Features**:
- Canvas 2D rendering (no WebGL dependency)
- Auto-rotation with pause on hover
- Facility clustering by operator
- Compliance status color coding
- Zoom/tilt controls

**State**:
```typescript
interface GlobeState {
  rotation: number;
  tilt: number;
  zoom: number;
}
```

### 2. DeckGL Map Overlay

**Location**: `src/components/shared/DeckGLOverlay.tsx`

**Features**:
- Hexagon layer for facility density
- Arc layer for network flows
- Scatterplot for individual facilities
- Multiple visualization modes

### 3. Photorealistic GIS View

**Location**: `src/components/shared/PhotorealisticGisView.tsx`

**Features**:
- High-resolution map tiles
- Facility markers with popup details
- Heat map overlay option
- 3D building extrusion

### 4. Cytoscape Network Graph

**Location**: `src/components/tabs/ComplianceFlowTab.tsx`, `src/components/tabs/IntelligenceHubTab.tsx`

**Features**:
- Interactive node-link diagrams
- Facility relationship visualization
- Subsidy flow tracking
- Zoom/pan/select interactions

---

## 📊 Dynamic Dashboards

### 1. High-Density Layout System

**Location**: `src/components/tabs/OrganizingIntelligenceTab.tsx`

**Features**:
- Density toggle (Compact/Comfortable/Spacious)
- Collapsible sidebars (left filters, right stats)
- Scrollable cards within fixed containers
- Responsive breakpoints

**State**:
```typescript
type DensityMode = 'compact' | 'comfortable' | 'spacious';

const DENSITY_CLASSES: Record<DensityMode, {
  container: string;
  text: string;
  padding: string;
  gap: string;
  icon: string;
}>;
```

### 2. Mission Control Layout

**Location**: `src/components/MissionControlLayout.tsx`

**Features**:
- Stat cards with click navigation
- Quick filters
- Real-time metric updates
- Compact information density

### 3. Organizer Command Center

**Location**: `src/components/panels/OrganizerCommandCenter.tsx`

**Tabs**:
- FOIA Generator
- Worker Incidents
- Contractor Intel
- CBA Monitor
- Legislative Alerts
- Union Heatmap
- Coalition Hub

---

## 🔍 Search & Filter Systems

### 1. FlexSearch Integration

**Location**: `src/hooks/useFlexSearch.ts`, `src/search/SearchEngine.ts`

**Features**:
- Full-text search across facilities
- Fuzzy matching
- Field-specific indexing
- Real-time results

### 2. Smart Navigation (Cmd+K)

**Location**: `src/components/shared/SmartSearchModal.tsx`

**Features**:
- Keyboard shortcut activation
- Tab navigation
- Recent searches
- AI suggestions

### 3. Filter State Management

**Pattern used across tabs**:
```typescript
const [filters, setFilters] = useState<{
  state?: string;
  operator?: string;
  complianceStatus?: string;
  subsidyRange?: [number, number];
}>({});
```

---

## 🔄 Real-Time Features

### 1. BGP Monitoring

**Location**: `src/modules/sanctions/hooks/useBGPSanctionsMonitor.ts`

**Features**:
- Simulated BGP update stream
- Sanctioned ASN detection
- Alert generation
- Historical tracking

### 2. Circuit Breaker Pattern

**Location**: `src/utils/circuitBreaker.ts`

**Features**:
- API failure protection
- Automatic recovery
- Fallback behavior
- Rate limiting

### 3. Real-Time Intelligence

**Location**: `src/components/RealTimeIntelligence.tsx`

**Features**:
- Multi-source data fetching
- Status indicators per source
- Auto-refresh capabilities

---

## 💾 Data Persistence

### 1. IndexedDB Schema (Dexie)

**Location**: `src/db/database.ts`

**Tables**:
```
facilities, dataProvenance, communityContext, subsidyAgreements,
localSignatures, localOrganizations, knowledgeGaps, engagementTracking,
settings, networkSecurity, sources, citations, researchNotes,
searchHistory, bgpAnomalies, ctAlerts, curiosityQuestions,
predictions, learnedPatterns, correlations, sdnCache,
sanctionsRiskScores, sanctionsReports, bgpSanctionsAlerts,
foiaRequests, workerIncidents, contractors, cbaAgreements,
legislativeBills, unionLocals, coalitionPartners, sharedWatchlist,
campaignEvents
```

### 2. Search History

**Location**: `src/db/searchHistory.ts`

**Features**:
- Records all searches with context
- Enables query suggestions
- Supports learning patterns

### 3. Settings Persistence

**Location**: `src/utils/settingsPersistence.ts`

**Features**:
- User preferences stored in IndexedDB
- Theme, density, sidebar state
- API key management (encrypted)

---

## 🎨 UI Components Library

### Shared Components

| Component | Location | Purpose |
|-----------|----------|---------|
| `ErrorBoundary` | `src/components/ErrorBoundary.tsx` | Crash protection |
| `Tooltip` | `src/components/shared/Tooltip.tsx` | Hover information |
| `ScrollableSection` | Various | Fixed-height scrolling |
| `StatCard` | `src/components/shared/StatCard.tsx` | Metric display |
| `Badge` | Various | Status indicators |
| `NestedTabs` | `src/components/shared/NestedTabs.tsx` | Sub-navigation |

### Animation Components

**Location**: `src/components/shared/animations.tsx`

```typescript
<FadeIn duration={300}>...</FadeIn>
<ScaleIn delay={100}>...</ScaleIn>
<SlideIn direction="left">...</SlideIn>
```

---

## 🔌 External Integrations

### API Services

| Service | Location | Status |
|---------|----------|--------|
| OpenAI | `src/ai/askAI.ts` | Active |
| SEC EDGAR | `src/integrations/secEdgar.ts` | Active |
| EPA ECHO | `src/integrations/epaEcho.ts` | Active |
| Epoch AI | `src/integrations/epochAI.ts` | Active |
| Good Jobs First | `src/integrations/goodJobsFirst.ts` | Active |
| Census Geocoder | `src/services/censusGeocoderService.ts` | Active |
| NLRB/DOL | `src/services/labordataService.ts` | Active |

### Integration Pattern

All integrations use:
1. Circuit breaker wrapper
2. Rate limiting
3. Timeout protection
4. Fallback data
5. Error tracking

---

## 🧪 Testing Utilities

**Location**: `src/test/utils.tsx`

**Exports**:
- `mockFacilities` - Sample facility data
- `mockStats` - Sample compliance stats
- `renderWithProviders` - Test wrapper

---

## 📝 How to Continue Development

When starting a new session:

1. **Read context files**:
   - `AGENTS.md` - Project conventions
   - `docs/ai-context/state.md` - Current state
   - `docs/ai-context/DYNAMIC_FEATURES.md` - This file

2. **Check recent commits**:
   ```bash
   git log --oneline -20
   ```

3. **Verify TypeScript**:
   ```bash
   npx tsc --noEmit 2>&1 | grep "error TS" | wc -l
   ```

4. **Start dev server**:
   ```bash
   npm run dev
   ```

---

## 🔄 Feature Dependencies

```
NLP Search ──────► askAI.ts ──────► OpenAI API
     │                  │
     ▼                  ▼
searchHistory     circuitBreaker
     │                  │
     ▼                  ▼
IndexedDB         Error Tracking

Visualizations ──► DeckGL/Canvas ──► Facility Data
     │                  │
     ▼                  ▼
State Management    IndexedDB
```

---

**Remember**: All dynamic features are designed with antifragility - they gracefully degrade when dependencies fail.

