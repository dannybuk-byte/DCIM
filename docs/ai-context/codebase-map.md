# DCIM Compliance App - Codebase Map

**Purpose**: Quick reference for navigating the codebase.
**Last Updated**: January 6, 2026, 6:30 PM PST

---

## 📁 Root Structure

```
DCIM Compliance App/
├── src/                    # Source code
├── public/                 # Static assets
├── docs/                   # Documentation
│   └── ai-context/        # AI assistant context files
├── .vscode/               # VS Code settings (auto-start)
├── index.html             # Entry point
├── package.json           # Dependencies
├── vite.config.ts         # Vite configuration
├── tailwind.config.js     # Tailwind customization
├── tsconfig.json          # TypeScript config
└── AGENTS.md              # AI coding guidelines
```

---

## 📁 src/ Deep Dive

### AI System (`src/ai/`)
```
ai/
├── engine.ts              # Core AI engine (askAIText)
│                          # Multi-provider: OpenAI → Anthropic → Groq → Local
├── sectionPrompts.ts      # Section-specific AI prompts (10 contexts)
├── adaptiveNLP.ts         # Adaptive query learning
├── config.ts              # AI configuration
├── localTransformers.ts   # Local model fallback
├── organizerProfile.ts    # User personalization
└── webLLMProvider.ts      # WebLLM integration
```

### Components (`src/components/`)

#### Main Dashboard
```
DCIMCommandCenter.tsx       # THE main component (1900+ lines)
├── Header (search, notifications, metrics)
├── Tab Navigation (25+ tabs)
├── Sidebar (filters, stats)
├── Main Content Area
└── Floating Elements (NLP widget, help)
```

#### Shared Components (`src/components/shared/`)
```
shared/
├── ContextualNLPWidget.tsx    # Dual-mode NLP assistant
│   ├── SectionNLPBar          # Inline search bar
│   └── FloatingNLPAssistant   # Floating chat button
├── SectionHelpPanel.tsx       # FAQs, Guides, How-Tos, Sources
├── InlineHelpButton.tsx       # Compact help trigger
├── CitationIndicator.tsx      # Inline source badges
├── ExpandableSection.tsx      # Collapsible sections
├── NestedTabs.tsx            # Tab navigation
├── DenseMetricStrip.tsx      # Compact stats display
└── ... (50+ more components)
```

#### Tab Components (`src/components/tabs/`)
```
tabs/
├── OverviewTab.tsx                 # Dashboard overview
├── GeographyTab.tsx                # Geographic view
├── OrganizingIntelligenceTab.tsx   # ⭐ High-density organizing dashboard
│   ├── Target Prioritization       # Expandable tables + priority groups
│   ├── Contractor Mapping          # Nested accordions + mini-tabs
│   ├── IBEW Footprint              # Dense table + contract alerts
│   └── Corridor Intelligence       # Traffic share visualization
├── SubsidyTrackingTab.tsx          # ⭐ Subsidy accountability
├── SanctionsMonitorTab.tsx         # ⭐ NEW: OFAC sanctions monitoring
├── CoalitionIntelligenceTab.tsx    # AI infrastructure tracking
├── NetworkSecurityTab.tsx          # BGP monitoring
├── FollowYourDataTab.tsx           # Infrastructure discovery
├── WorkerSafetyTab.tsx             # OSHA tracking
├── OSINTToolsTab.tsx               # Open source intelligence
├── ConnectographyTab.tsx           # Global connection mapping
└── ... (15+ more tabs)
```

### Content (`src/content/`)
```
content/
├── sectionHelp.ts          # FAQs, guides, how-tos per section
│   ├── SectionHelpContent  # Interface for help structure
│   ├── SECTION_HELP        # Content for all 10 contexts
│   └── searchFAQs()        # FAQ search function
└── sectionCitations.ts     # Sources and methodology
    ├── Citation            # Source reference interface
    ├── DataMethodology     # Calculation documentation
    ├── SECTION_CITATIONS   # Citations for all contexts
    └── searchCitations()   # Citation search function
```

### Modules (`src/modules/`)

#### 🛡️ Sanctions Monitor Module (`src/modules/sanctions/`)
```
sanctions/
├── index.tsx                       # Module exports
├── types/
│   └── sanctions.ts                # Type definitions
│       ├── SDNEntry                # OFAC SDN list entry
│       ├── FacilityRiskScore       # Risk assessment (0-100)
│       ├── SanctionsReport         # Worker report
│       ├── Evidence                # Evidence with SHA-256 hash
│       ├── AwardCalculation        # Whistleblower award
│       └── RiskFactor              # Risk component
├── services/
│   ├── sdnService.ts               # SDN list fetching & caching
│   ├── riskScoring.ts              # Risk calculation algorithm
│   ├── evidenceChain.ts            # SHA-256 hashing, timestamps
│   ├── awardCalculator.ts          # Whistleblower awards
│   └── coalitionRouting.ts         # Union/attorney routing
├── hooks/
│   └── useBGPSanctionsMonitor.ts   # Real-time BGP sanctions
└── components/
    ├── SanctionsOverview.tsx       # Main dashboard
    ├── FacilityRiskCard.tsx        # Risk visualization
    ├── SDNSearchPanel.tsx          # SDN search interface
    ├── AwardCalculator.tsx         # Award estimator
    └── ReportingChannels.tsx       # OFAC/FinCEN contacts
```

### Services (`src/services/`)
```
services/
├── labordataService.ts          # NLRB + LM-10 data
├── censusGeocoderService.ts     # Coordinate → county FIPS
├── unionJurisdictionService.ts  # Union local mapping
├── goodJobsFirstService.ts      # Subsidy database
├── unionIntelligenceEngine.ts   # CENTRAL HUB - unifies all labor
├── organizingIntelligenceService.ts  # Organizing targets
├── aiInfrastructureIntelligence.ts   # AI company tracking
├── aiInfrastructureMonitor.ts        # Real-time monitoring
├── corsProxy.ts                 # Government API proxy
├── dcimDataSources.ts           # Multi-source data fetching
├── NetworkDiscoveryAPIs.ts      # Network reconnaissance
├── bgpMonitoring.ts             # BGP route monitoring
├── integratedDataService.ts     # Unified data interface
├── realDataSources.ts           # Verified-only data
├── expandedSubsidies.ts         # 75+ verified subsidies
├── stateAuditReports.ts         # 25+ state audit findings
└── ... (30+ more services)
```

### Hooks (`src/hooks/`)
```
hooks/
├── useSectionNLP.ts              # ⭐ Context-aware NLP hook
├── useNLPSearchSuggestions.ts    # Search suggestions
├── useNaturalLanguageSearch.ts   # General NLP search
├── useUnionIntelligence.ts       # Union intelligence hook
├── useEvidence.ts                # Evidence collection
├── useFacilityData.ts            # Facility data management
├── useKeyboardShortcuts.ts       # Keyboard navigation
├── usePatternLab.ts              # Pattern analysis
├── usePredictiveAnalytics.ts     # Predictions
└── ... (12+ more hooks)
```

### Database (`src/db/`)
```
db/
├── database.ts                  # Dexie.js schema definition (v9)
│   ├── facilities               # 11,992+ facility records
│   ├── dataProvenance           # Data source tracking
│   ├── networkSecurity          # RPKI/BGP status
│   ├── sources                  # Evidence sources
│   ├── citations                # Source citations
│   ├── researchNotes            # Research notes
│   ├── searchHistory            # NLP search history
│   ├── bgpAnomalies             # BGP route anomalies
│   ├── sdnCache                 # SDN list cache
│   ├── sanctionsRiskScores      # Facility risk scores
│   ├── sanctionsReports         # Worker reports
│   └── bgpSanctionsAlerts       # BGP sanctions alerts
├── seedData.ts                  # Research data (48 operators)
├── seedRealData.ts              # Verified overlay + seeding
└── searchHistory.ts             # Search history functions
```

### Utils (`src/utils/`)
```
utils/
├── circuitBreaker.ts            # API failure protection
├── dbOperations.ts              # Database resilience
├── errorTracking.ts             # Error logging
├── globalErrorHandler.ts        # Global catch-all
├── rateLimiter.ts               # Rate limiting
├── sanitization.ts              # Input cleaning
├── timeout.ts                   # Timeout protection
├── expansionTracker.ts          # Certificate transparency
├── evidenceIntegrity.ts         # FRE 902 compliance
├── nlpQueryParser.ts            # Natural language parsing
├── nlQueryConverter.ts          # NL → structured query
└── ... (48+ more utils)
```

---

## 🔗 Key Relationships

### Data Flow
```
User Action
    ↓
DCIMCommandCenter
    ↓
Tab Component (e.g., OrganizingIntelligenceTab)
    ↓
Hooks (useSectionNLP, useUnionIntelligence)
    ↓
Services (unionIntelligenceEngine, etc.)
    ↓
IndexedDB (Dexie.js)
    ↓
UI Update
```

### NLP System Flow
```
User Query (inline or floating)
    ↓
useSectionNLP(context)
    ↓
getSectionPrompt() → generateContextualPrompt()
    ↓
askAIText() [Multi-provider failover]
    ↓
parseActionsFromResponse()
    ↓
NLPAction[] → UI Updates (filters, sorts, highlights)
```

### Sanctions Module Flow
```
SanctionsOverview.tsx
    ↓
┌─────────────────────────────────────────┐
│ sdnService        → SDN list matching   │
│ riskScoring       → Risk calculation    │
│ evidenceChain     → SHA-256 hashing     │
│ awardCalculator   → Award estimation    │
│ coalitionRouting  → Union/attorney      │
└─────────────────────────────────────────┘
    ↓
Worker Report → OFAC/FinCEN
```

---

## 📊 Database Schema Highlights

### Facility Table
```typescript
interface Facility {
  id?: number;
  name: string;
  operator: string;
  type: 'Data Center' | 'CO' | 'POP' | 'Edge' | 'Hub';
  state: string;
  city: string;
  country: string;
  latitude?: number;
  longitude?: number;
  jobsPromised: number;
  jobsActual: number;
  subsidyAmount: number;
  subsidyGap: number;
  complianceStatus: 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown';
}
```

### Sanctions Risk Score
```typescript
interface FacilityRiskScore {
  facilityId: string;
  score: number;           // 0-100
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL';
  factors: RiskFactor[];
  timestamp: string;
  sdnMatches?: SDNMatch[];
}
```

### Search History
```typescript
interface SearchHistoryEntry {
  id?: number;
  query: string;
  context: SectionContext;  // 10 possible contexts
  createdAt: string;
  lastUsedAt: string;
  count: number;
}
```

---

## 🎨 Styling Reference

### Tailwind Dark Theme
```css
/* Backgrounds */
bg-slate-950, bg-[#0d1117]    /* Primary */
bg-slate-900, bg-[#161b22]    /* Secondary */
bg-slate-800, bg-[#21262d]    /* Tertiary */

/* Borders */
border-slate-800, border-[#30363d]

/* Text */
text-white, text-[#f0f6fc]    /* Primary */
text-slate-400, text-[#8b949e] /* Secondary */

/* Accents */
text-cyan-400                  /* Links, highlights */
text-violet-400                /* Sanctions module */
text-amber-400                 /* Warnings */
```

### Risk Level Colors
```css
--risk-critical: text-red-500, bg-red-500/20
--risk-high: text-orange-500, bg-orange-500/20
--risk-moderate: text-yellow-500, bg-yellow-500/20
--risk-low: text-green-500, bg-green-500/20
--risk-minimal: text-slate-500, bg-slate-500/20
```

---

## 📝 Quick Commands

```bash
# Development
npm run dev              # Start dev server (port 5173)
npm run build            # Production build
npm run preview          # Preview production build

# Testing
npm test                 # Run tests
npm run test:ui          # With Vitest UI
npm run test:coverage    # Coverage report
```

---

## 🛡️ OFAC Sanctions Quick Reference

**Legal Framework:**
- **Act**: International Emergency Economic Powers Act (IEEPA)
- **Liability**: STRICT (no knowledge/intent required)
- **Awards**: 10-30% of sanctions > $1M (AMLA)
- **Penalties**: $350K/violation civil; $1M criminal; 20 years

**Key Contacts:**
- **OFAC Hotline**: 1-800-540-6322
- **FinCEN Tips**: 1-800-767-2825

**Module Entry:**
```tsx
import { 
  SanctionsOverview,
  calculateSanctionsRiskScore,
  useBGPSanctionsMonitor,
  getAttorneyNetwork,
} from './modules/sanctions';
```

---

## 📚 Files to Read First

1. `AGENTS.md` - Conventions
2. `docs/ai-context/CLAUDE_COMPREHENSIVE_HANDOFF.md` - Full context
3. `docs/ai-context/codebase-map.md` - This file
4. `docs/ai-context/decisions.md` - Past decisions
5. `src/components/DCIMCommandCenter.tsx` - Main component
6. `src/modules/sanctions/index.tsx` - Sanctions module
7. `src/ai/sectionPrompts.ts` - NLP system
8. `src/content/sectionHelp.ts` - Help content
9. `src/content/sectionCitations.ts` - Citations system
