# DCIM Compliance App - Comprehensive Claude Handoff

<div style="background: linear-gradient(135deg, #1a1f35 0%, #0d1117 100%); padding: 20px; border-radius: 12px; margin-bottom: 30px; border: 1px solid #30363d;">
<h2 style="margin: 0; color: #f0f6fc;">📋 Handoff Document</h2>
<p style="color: #8b949e; margin: 8px 0 0 0;">
<strong>Last Updated:</strong> January 6, 2026, 6:30 PM PST<br/>
<strong>Prepared By:</strong> Claude (Opus 4.5)<br/>
<strong>Project Path:</strong> <code>/Users/danielbuk/DCIM Compliance App</code><br/>
<strong>Stack:</strong> React 18 + TypeScript + Vite + Tailwind CSS + IndexedDB (Dexie.js)<br/>
<strong>Build Status:</strong> ✅ Passing
</p>
</div>

---

## 🎯 MISSION CRITICAL: READ THIS FIRST

<div style="background: #3b2a2a; border-left: 4px solid #f85149; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
<strong style="color: #f85149;">⚠️ THIS IS A LABOR ORGANIZING TOOL, NOT A CORPORATE DCIM TOOL</strong>
<p style="margin: 8px 0 0 0; color: #f0f6fc;">
The user (Daniel) is building a <strong>coalition weapon</strong> to arm labor unions and community organizers with data to fight Big Tech's broken job creation promises. Every feature must answer:
</p>
<blockquote style="border-left: 3px solid #f85149; padding-left: 12px; margin: 12px 0; font-style: italic; color: #f0f6fc;">
"Does this help organizers win against Big Tech?"
</blockquote>
</div>

### Target Users (Priority Order)
| Priority | User Group | Access | Purpose |
|----------|------------|--------|---------|
| 1 | **Tech Workers Coalition** | Free | Grassroots tech worker organizing |
| 2 | **CODE-CWA** | Free | Communications workers organizing |
| 3 | **UPROSE** | Free | Environmental justice in data center communities |
| 4 | **Building Trades Unions** (IBEW, SMART, UA, IUOE, CWA) | Free | Construction & maintenance workers |
| 5 | **Community Organizers** | Free | Local accountability campaigns |
| 6 | CDN Partners / Security Vendors | Commercial | Revenue to fund free tools |

---

## 📊 CURRENT STATE SUMMARY

### Data Loaded
| Metric | Value | Source Reliability |
|--------|-------|-------------------|
| **Total Facilities** | 11,992 | ✅ Research-verified |
| **Verified Operators** | 48 | ✅ Research-verified |
| **GJF Verified Subsidies** | 40+ | ✅ Legally citable |
| **State Audit Findings** | 25+ | ✅ Legally citable |
| **Countries Covered** | 50+ | ✅ Research-verified |
| **AI Companies Tracked** | 8 | ✅ Research-verified |
| **ASNs Monitored** | 11 | ✅ Research-verified |
| **Union Corridors Mapped** | 5 | ⚠️ Manual digitization |

### ✅ Recently Completed Features (Jan 6, 2026)

#### 1. OFAC Sanctions Monitor Module
- Complete implementation at `src/modules/sanctions/`
- SDN list fetching, parsing, and fuzzy name matching
- Risk scoring algorithm (0-100 with 6 weighted factors)
- BGP sanctions monitoring via RIPE RIS Live
- Whistleblower award calculator (AMLA/FinCEN, IRS, SEC)
- Coalition routing (IBEW locals, attorney network)
- Evidence chain with SHA-256 hashing and RFC 3161 timestamps

#### 2. High-Density Layout System
- Expandable tables with nested accordions
- Mini-tabs within expanded rows
- Priority groups with collapsible sections
- Sticky filter sidebars
- Compact stats rows
- Applied to: Target Prioritization, Contractor Mapping, IBEW Footprint, Corridor Intelligence, Subsidy Tracking

#### 3. Contextual NLP Assistant
- Section-specific AI prompts (`src/ai/sectionPrompts.ts`)
- Dual-mode widget: inline search bar + floating assistant
- `useSectionNLP` hook for context-aware queries
- Quick actions per section
- Search history tracking in IndexedDB

#### 4. Help System (FAQs, Guides, How-Tos)
- `src/content/sectionHelp.ts` - Contextual help content
- `SectionHelpPanel` component with tabbed interface
- `InlineHelpButton` for section headers
- Searchable FAQs across sections

#### 5. Citations & Sources System
- `src/content/sectionCitations.ts` - Comprehensive source documentation
- Primary/Secondary/Tertiary source categorization
- Methodology documentation per data point
- Data integrity notes and verification procedures
- Clickable hyperlinks throughout
- `CitationIndicator` component for inline citations

---

## 📁 CODEBASE ARCHITECTURE

### Root Structure
```
DCIM Compliance App/
├── src/                          # Source code
│   ├── ai/                       # AI engine & prompts
│   ├── analyzers/                # Data analysis modules
│   ├── api/                      # External API integrations
│   ├── calculators/              # Compliance gap calculations
│   ├── components/               # React components (150+)
│   ├── config/                   # App configuration
│   ├── content/                  # Help & citations content
│   ├── contexts/                 # React contexts
│   ├── db/                       # IndexedDB (Dexie.js)
│   ├── detectors/                # Anomaly detection
│   ├── generators/               # FOIA templates, reports
│   ├── hooks/                    # Custom React hooks (21)
│   ├── integrations/             # External service integrations
│   ├── modules/                  # Feature modules
│   │   └── sanctions/            # OFAC Sanctions Monitor
│   ├── network/                  # Network monitoring
│   ├── osint/                    # Open source intelligence
│   ├── schemas/                  # Zod validation schemas
│   ├── search/                   # Search utilities
│   ├── services/                 # Business logic (44 files)
│   ├── types/                    # TypeScript definitions
│   ├── utils/                    # Utility functions (59 files)
│   └── workers/                  # Web workers
├── docs/                         # Documentation
│   └── ai-context/               # AI assistant context files
├── public/                       # Static assets
├── .vscode/                      # VS Code settings (auto-start)
├── index.html                    # Entry point
├── package.json                  # Dependencies
├── vite.config.ts                # Vite configuration
├── tailwind.config.js            # Tailwind customization
├── tsconfig.json                 # TypeScript config
└── AGENTS.md                     # AI coding guidelines
```

### Key Component Hierarchy
```
DCIMCommandCenter.tsx (Main Dashboard - 1900+ lines)
├── Header
│   ├── SearchBar (NLP-powered)
│   ├── NotificationCenter
│   └── MetricsStrip
├── Sidebar Navigation
│   └── 25+ tabs organized by category
├── Main Content Area
│   ├── OverviewTab
│   ├── GeographyTab
│   ├── OrganizingIntelligenceTab ⭐ (High-density layouts)
│   │   ├── Target Prioritization
│   │   ├── Contractor Mapping
│   │   ├── IBEW Footprint
│   │   └── Corridor Intelligence
│   ├── SubsidyTrackingTab ⭐ (High-density layouts)
│   ├── SanctionsMonitorTab ⭐ (NEW - Complete module)
│   ├── CoalitionIntelligenceTab
│   ├── NetworkSecurityTab
│   ├── FollowYourDataTab
│   └── ... (20+ more tabs)
└── Floating Elements
    ├── ContextualNLPWidget
    ├── SectionHelpPanel
    └── Modals (settings, help, fullscreen)
```

---

## 🛡️ SANCTIONS MODULE DEEP DIVE

### Architecture
```
src/modules/sanctions/
├── index.tsx                     # Module exports
├── types/
│   └── sanctions.ts              # Type definitions
│       ├── SDNEntry              # OFAC SDN list entry
│       ├── FacilityRiskScore     # Risk assessment (0-100)
│       ├── SanctionsReport       # Worker report
│       ├── Evidence              # Evidence with SHA-256 hash
│       ├── AwardCalculation      # Whistleblower award
│       └── RiskFactor            # Individual risk component
├── services/
│   ├── sdnService.ts             # SDN list fetching & caching
│   │   ├── fetchSDNList()        # Fetch from Treasury
│   │   ├── searchSDN()           # Fuzzy name matching
│   │   └── getSDNStats()         # List statistics
│   ├── riskScoring.ts            # Risk calculation
│   │   ├── calculateSanctionsRiskScore()  # Main algorithm
│   │   ├── fuzzyMatchSDN()       # Levenshtein matching
│   │   ├── SANCTIONED_ASNS       # Known sanctioned ASNs
│   │   └── SANCTIONED_JURISDICTIONS
│   ├── evidenceChain.ts          # Evidence integrity
│   │   ├── generateSHA256()      # File hashing
│   │   ├── createChainOfCustody()
│   │   └── packageEvidence()     # Export package
│   ├── awardCalculator.ts        # Whistleblower awards
│   │   ├── calculatePotentialAward()
│   │   ├── getAttorneyNetwork()
│   │   └── getReportingChannels()
│   └── coalitionRouting.ts       # Union/attorney routing
│       ├── IBEW_LOCALS           # IBEW local coverage
│       ├── CWA_LOCALS            # CWA locals
│       ├── routeToUnionLocal()
│       └── routeToAttorney()
├── hooks/
│   └── useBGPSanctionsMonitor.ts # Real-time BGP sanctions
│       ├── useBGPSanctionsMonitor()
│       └── isASNSanctioned()
└── components/
    ├── SanctionsOverview.tsx     # Main dashboard
    ├── FacilityRiskCard.tsx      # Risk visualization
    ├── SDNSearchPanel.tsx        # SDN search interface
    ├── AwardCalculator.tsx       # Award estimator
    └── ReportingChannels.tsx     # OFAC/FinCEN contacts
```

### Risk Scoring Algorithm
```typescript
// Score: 0-100
// CRITICAL: 80+, HIGH: 60-79, MODERATE: 40-59, LOW: 20-39, MINIMAL: <20

calculateSanctionsRiskScore(facility) {
  score = 0;
  
  // Factor 1: SDN Name Match (0-40 points)
  // Levenshtein distance similarity >= 0.85 triggers alert
  sdnScore = fuzzyMatchSDN(facility.tenants) * 40;
  
  // Factor 2: Sanctioned Jurisdiction Traffic (0-25 points)
  // Iran, Russia, Cuba, North Korea, Syria, Belarus, Venezuela
  trafficScore = analyzeTrafficOrigins(facility) * 25;
  
  // Factor 3: Sanctioned AS Peering (0-15 points)
  // BGP routes through known sanctioned ASNs
  peeringScore = checkASNPeering(facility) * 15;
  
  // Factor 4: Crypto Mining Indicators (0-10 points)
  cryptoScore = detectCryptoMining(facility) * 10;
  
  // Factor 5: Documentation Avoidance (0-5 points)
  docScore = assessDocumentation(facility) * 5;
  
  // Factor 6: Payment Anomalies (0-5 points)
  paymentScore = analyzePayments(facility) * 5;
  
  return score;
}
```

### Legal Framework Reference
| Element | Detail |
|---------|--------|
| **Governing Law** | International Emergency Economic Powers Act (IEEPA) |
| **Liability Standard** | STRICT (no knowledge/intent required) |
| **Civil Penalties** | Up to $350,000 per violation |
| **Criminal Penalties** | Up to $1M and 20 years imprisonment |
| **Whistleblower Awards** | 10-30% of sanctions over $1M (AMLA) |
| **Anti-Retaliation** | Protected under Dodd-Frank |
| **OFAC Hotline** | 1-800-540-6322 |
| **FinCEN Tips** | 1-800-767-2825 |

---

## 🤖 AI & NLP SYSTEM

### Architecture Overview
```
src/ai/
├── engine.ts                     # Core AI engine (askAIText)
│   ├── Multi-provider failover (OpenAI → Anthropic → Groq → Local)
│   ├── Circuit breaker protection
│   ├── Rate limiting
│   └── Personalization (organizer profiles)
├── sectionPrompts.ts             # Section-specific AI prompts
│   ├── SectionContext types (10 contexts)
│   ├── QuickAction definitions
│   └── Keyword detection for routing
├── adaptiveNLP.ts                # Adaptive query learning
├── config.ts                     # AI configuration
├── localTransformers.ts          # Local model fallback
├── organizerProfile.ts           # User personalization
└── webLLMProvider.ts             # WebLLM integration

src/hooks/
├── useSectionNLP.ts              # Context-aware NLP hook
│   ├── Query execution
│   ├── Action parsing
│   ├── Suggestion generation
│   └── History management
├── useNLPSearchSuggestions.ts    # Search suggestions
└── useNaturalLanguageSearch.ts   # General NLP search

src/components/shared/
├── ContextualNLPWidget.tsx       # Dual-mode NLP assistant
│   ├── SectionNLPBar (inline mode)
│   └── FloatingNLPAssistant (floating mode)
├── SectionHelpPanel.tsx          # FAQs, Guides, How-Tos, Sources
├── InlineHelpButton.tsx          # Compact help trigger
└── CitationIndicator.tsx         # Inline source badges
```

### Section Contexts
```typescript
type SectionContext =
  | 'global'                    // General dashboard queries
  | 'sanctions'                 // OFAC sanctions monitoring
  | 'organizing'                // Labor organizing intelligence
  | 'subsidies'                 // Subsidy accountability
  | 'contractors'               // Contractor mapping
  | 'corridors'                 // Corridor intelligence
  | 'ibew-footprint'           // IBEW local coverage
  | 'target-prioritization'    // Organizing targets
  | 'network-security'         // BGP/network monitoring
  | 'compliance-overview';     // Compliance statistics
```

### NLP Action Types
```typescript
interface NLPAction {
  type: 'filter' | 'highlight' | 'expand' | 'sort' | 'navigate' | 'report' | 'info';
  payload: Record<string, unknown>;
  description: string;
}
```

---

## 🗄️ DATABASE SCHEMA (IndexedDB v9)

### Tables Overview
```typescript
// Core Tables
facilities                    // 11,992+ facility records
dataProvenance               // Data source tracking per metric
communityContext             // County-level community data
subsidyAgreements            // Job promises & incentives
localSignatures              // Local organizing indicators
localOrganizations           // Community org contacts
knowledgeGaps                // FOIA/research opportunities
engagementTracking           // User interaction tracking
settings                     // App configuration

// NotebookLM-Inspired Tables
networkSecurity              // ASN, RPKI, BGP data
sources                      // Evidence sources (PDF, URL, etc.)
citations                    // Source citations per data point
researchNotes                // Analyst notes & findings
searchHistory                // NLP search history (per context)

// Pattern Intelligence Engine
bgpAnomalies                 // BGP route anomalies
ctAlerts                     // Certificate Transparency alerts
curiosityQuestions           // AI-generated research questions
predictions                  // Prediction tracking
learnedPatterns              // Pattern recognition learning
correlations                 // Multi-signal correlations

// OFAC Sanctions Monitor (NEW - v9)
sdnCache                     // SDN list cache
sanctionsRiskScores          // Facility risk scores
sanctionsReports             // Worker-submitted reports
bgpSanctionsAlerts           // BGP sanctions alerts
```

### Key Interfaces
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
  lastAuditDate?: string;
}

interface FacilityRiskScore {
  facilityId: string;
  score: number;              // 0-100
  riskLevel: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL';
  factors: RiskFactor[];
  timestamp: string;
  sdnMatches?: SDNMatch[];
}

interface SearchHistoryEntry {
  id?: number;
  query: string;
  context: string;            // SectionContext
  createdAt: string;
  lastUsedAt: string;
  count: number;
}
```

---

## 🔌 EXTERNAL INTEGRATIONS

### Labor Intelligence Services
| Service | File | Purpose |
|---------|------|---------|
| **labordata.bunkum.us** | `labordataService.ts` | NLRB + LM-10 data mirror |
| **FCC API** | `censusGeocoderService.ts` | Coordinate → County FIPS |
| **Census Geocoder** | `censusGeocoderService.ts` | Fallback geocoding |
| **Union Jurisdiction** | `unionJurisdictionService.ts` | Manual jurisdiction maps |
| **Good Jobs First** | `goodJobsFirstService.ts` | Subsidy database |
| **Union Intelligence Engine** | `unionIntelligenceEngine.ts` | Central hub for all labor data |

### AI Infrastructure Monitoring
| Service | File | Purpose |
|---------|------|---------|
| **RIPE RIS Live** | `BGPMonitor.ts` | Real-time BGP routing |
| **crt.sh** | `aiInfrastructureMonitor.ts` | Certificate Transparency |
| **AI Company Watchlist** | `aiInfrastructureIntelligence.ts` | 8 companies, 11 ASNs |

### Network Integrations
| Service | File | Purpose |
|---------|------|---------|
| **OFAC SDN List** | `sdnService.ts` | Sanctions screening |
| **PeeringDB** | `NetworkDiscoveryAPIs.ts` | Peering relationships |
| **MaxMind GeoIP** | `riskScoring.ts` | IP geolocation |

---

## 📝 CODE PATTERNS & CONVENTIONS

### React Component Pattern
```typescript
// Named exports only - NO default exports
export const ComponentName: React.FC<ComponentNameProps> = ({ 
  prop1, 
  prop2 
}) => {
  // 1. Hooks at top
  const [state, setState] = useState<Type>(initialValue);
  const memoizedValue = useMemo(() => /* ... */, [deps]);
  
  // 2. Callbacks
  const handleEvent = useCallback(() => {
    // logic
  }, [deps]);
  
  // 3. Effects
  useEffect(() => {
    // setup
    return () => { /* cleanup */ };
  }, [deps]);
  
  // 4. Return JSX
  return <div>{/* content */}</div>;
};
```

### Error Handling Pattern
```typescript
// Always use circuit breakers for external APIs
import { circuitBreaker } from '../utils/circuitBreaker';

const fetchData = circuitBreaker(async () => {
  try {
    const result = await fetch(url);
    if (!result.ok) throw new Error(`HTTP ${result.status}`);
    return await result.json();
  } catch (err) {
    trackError(err, { context: 'fetchData' });
    return fallbackValue; // Never show blank screen
  }
}, {
  failureThreshold: 5,
  cooldownMs: 60000,
});
```

### TypeScript Rules
- **No `any` types** - use `unknown` and type guards
- **Strict null checks** - always handle undefined/null
- **Explicit return types** on functions
- **Interface over type** for object shapes
- **Enums for constants** with multiple values

### Tailwind CSS Conventions
```css
/* Dark theme palette */
--bg-primary: bg-slate-950, bg-[#0d1117]
--bg-secondary: bg-slate-900, bg-[#161b22]
--bg-tertiary: bg-slate-800, bg-[#21262d]
--border: border-slate-800, border-[#30363d]
--text-primary: text-white, text-[#f0f6fc]
--text-secondary: text-slate-400, text-[#8b949e]

/* Risk level colors */
--risk-critical: text-red-500, bg-red-500/20
--risk-high: text-orange-500, bg-orange-500/20
--risk-moderate: text-yellow-500, bg-yellow-500/20
--risk-low: text-green-500, bg-green-500/20
--risk-minimal: text-slate-500, bg-slate-500/20
```

---

## 🚀 RUNNING THE APP

### Development
```bash
# Install dependencies
npm install

# Start development server (auto-starts on Cursor open)
npm run dev
# → http://localhost:5173

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test
npm run test:ui      # With Vitest UI
npm run test:coverage
```

### Environment Variables
```bash
# Optional - AI features work without these (local fallback)
VITE_OPENAI_API_KEY=sk-...
VITE_ANTHROPIC_API_KEY=sk-ant-...
```

### Auto-start Configuration
`.vscode/tasks.json` configures automatic dev server start on folder open.

---

## 🐛 KNOWN ISSUES & LIMITATIONS

### Current Limitations
| Issue | Impact | Workaround |
|-------|--------|------------|
| BGP Monitor disconnects | Normal - RIPE RIS has limits | Auto-reconnects |
| CertStream shows "error" | By design until started | Click "Start Monitoring" |
| Worker feedback simulated | Demo only - needs API | Glassdoor/Indeed API partnership |
| 5 union corridors only | Limited coverage | Manual expansion needed |
| SDN English only | Non-Latin names not matched | Use official OFAC search |

### Browser Compatibility
| Browser | Support |
|---------|---------|
| Chrome/Edge | ✅ Full support |
| Firefox | ✅ Full support |
| Safari | ✅ Should work (limited testing) |
| Mobile | ⚠️ Responsive but not optimized |

---

## 🎯 NEXT PRIORITIES

### Immediate
1. ✅ ~~OFAC Sanctions Monitor~~ DONE
2. ✅ ~~High-density layouts~~ DONE
3. ✅ ~~Contextual NLP~~ DONE
4. ✅ ~~Help system~~ DONE
5. ✅ ~~Citations & sources~~ DONE

### Short-term
1. Deploy CORS proxy to Cloudflare Workers for government APIs
2. Expand union jurisdiction mapping (5 → 20 corridors)
3. Real worker feedback integration (Glassdoor API partnership)
4. More state audit findings
5. Good Jobs First subscription for bulk data access

### Medium-term
1. OSHA/EPA violation integration via CORS proxy
2. SEC EDGAR integration for financial filings
3. PWA/offline support with service worker
4. Mobile-optimized views

### Long-term
1. Mobile app (React Native)
2. Real-time NLRB case notifications
3. Automated evidence collection pipeline
4. Integration with organizing platforms (Coworker.org)

---

## 🤝 WORKING WITH THE USER

### User Profile
- **Name**: Daniel
- **Technical Level**: High - understands codebase
- **Working Style**: Provides strategic documents (HTML reports) for translation into features
- **Priorities**: Maximum real data, minimum synthetic/demo data
- **Values**: Data reliability transparency, fast iteration, immediate browser testing

### Communication Style
- Direct and technical
- Appreciates comprehensive implementations
- Wants features that serve multiple stakeholder types
- Expects explanations of data sources and methodology

### Session Management
- User may provide long specification documents - translate into todos
- Always test in browser after implementation
- Update handoff docs after major changes
- Use high-density layouts where appropriate

---

## 📚 DOCUMENTATION INDEX

| File | Purpose |
|------|---------|
| `AGENTS.md` | Project conventions & AI coding guidelines |
| `docs/ai-context/CLAUDE_COMPREHENSIVE_HANDOFF.md` | This file - complete handoff |
| `docs/ai-context/CLAUDE_HANDOFF.md` | Previous handoff (less comprehensive) |
| `docs/ai-context/state.md` | Current development state |
| `docs/ai-context/decisions.md` | Technical decision log |
| `docs/ai-context/codebase-map.md` | Quick codebase reference |
| `docs/DATA_RELIABILITY_AUDIT.md` | Data source transparency |
| `docs/cloudflare-worker-proxy.md` | CORS proxy deployment guide |

---

## 🔧 QUICK REFERENCE

### Import Patterns
```typescript
// Sanctions Module
import { 
  SanctionsOverview,
  calculateSanctionsRiskScore,
  useBGPSanctionsMonitor,
  getAttorneyNetwork,
} from './modules/sanctions';

// NLP System
import { useSectionNLP } from '../hooks/useSectionNLP';
import { getSectionPrompt, SectionContext } from '../ai/sectionPrompts';
import { ContextualNLPWidget, SectionNLPBar } from '../components/shared/ContextualNLPWidget';
import { InlineHelpButton } from '../components/shared/InlineHelpButton';

// Help & Citations
import { getSectionHelp } from '../content/sectionHelp';
import { getSectionCitations, getAllCitations } from '../content/sectionCitations';
import { SectionHelpPanel } from '../components/shared/SectionHelpPanel';
import { CitationIndicator } from '../components/shared/CitationIndicator';

// Database
import { db } from '../db/database';
import { seedRealDatabase, seedVerifiedOnlyDatabase } from '../db/seedRealData';

// Union Intelligence
import { useUnionIntelligence } from '../hooks/useUnionIntelligence';

// AI Engine
import { askAIText } from '../ai/engine';
```

### Adding a New Section
1. Add `SectionContext` type in `src/ai/sectionPrompts.ts`
2. Add prompt config in `SECTION_PROMPTS`
3. Add help content in `src/content/sectionHelp.ts`
4. Add citations in `src/content/sectionCitations.ts`
5. Integrate `SectionNLPBar` and `InlineHelpButton` in component header
6. Add `ContextualNLPWidget` at component root

---

<div style="background: linear-gradient(135deg, #1a1f35 0%, #0d1117 100%); padding: 20px; border-radius: 12px; margin-top: 30px; border: 1px solid #30363d; text-align: center;">
<p style="color: #f0f6fc; font-size: 1.1em; margin: 0;">
<strong>Remember: This app exists to help workers fight corporate power.<br/>Every feature should serve that mission.</strong>
</p>
</div>

---

## 📎 APPENDIX A: Complete File Listing

### `/src/ai/` (7 files)
- `adaptiveNLP.ts` - Adaptive query learning
- `config.ts` - AI configuration
- `engine.ts` - Core AI engine (askAIText)
- `localTransformers.ts` - Local model fallback
- `organizerProfile.ts` - User personalization
- `sectionPrompts.ts` - Section-specific prompts
- `webLLMProvider.ts` - WebLLM integration

### `/src/components/shared/` (56 files)
Key files:
- `ContextualNLPWidget.tsx` - Dual-mode NLP assistant
- `SectionHelpPanel.tsx` - Help panel with FAQs, guides, citations
- `InlineHelpButton.tsx` - Compact help trigger
- `CitationIndicator.tsx` - Inline source badges
- `ExpandableSection.tsx` - Collapsible sections
- `NestedTabs.tsx` - Tab navigation
- `DenseMetricStrip.tsx` - Compact stats display

### `/src/content/` (2 files)
- `sectionHelp.ts` - FAQs, guides, how-tos per section
- `sectionCitations.ts` - Sources and methodology per section

### `/src/hooks/` (21 files)
Key files:
- `useSectionNLP.ts` - Context-aware NLP hook
- `useNLPSearchSuggestions.ts` - Search suggestions
- `useNaturalLanguageSearch.ts` - General NLP search
- `useUnionIntelligence.ts` - Union intelligence hook
- `useEvidence.ts` - Evidence collection
- `useFacilityData.ts` - Facility data management

### `/src/modules/sanctions/` (13 files)
Complete OFAC Sanctions Monitor module (see deep dive section)

### `/src/services/` (44 files)
Key files:
- `labordataService.ts` - NLRB + LM-10 data
- `unionIntelligenceEngine.ts` - Central labor intelligence
- `goodJobsFirstService.ts` - Subsidy database
- `aiInfrastructureIntelligence.ts` - AI company tracking
- `aiInfrastructureMonitor.ts` - Real-time monitoring
- `organizingIntelligenceService.ts` - Organizing targets

### `/src/db/` (6 files)
- `database.ts` - Dexie.js schema (v9)
- `seedData.ts` - Research data (48 operators)
- `seedRealData.ts` - Verified overlay + seeding
- `searchHistory.ts` - Search history functions

---

## 📎 APPENDIX B: Dependencies

### Production Dependencies
```json
{
  "@deck.gl/*": "^9.2.5",        // WebGL map visualization
  "@langchain/*": "^1.1.x",      // LLM orchestration
  "@tanstack/react-virtual": "^3.13.13", // List virtualization
  "@tensorflow/tfjs": "^4.22.0", // ML inference
  "dexie": "^3.2.4",             // IndexedDB wrapper
  "echarts": "^6.0.0",           // Charts
  "flexsearch": "^0.8.212",      // Full-text search
  "leaflet": "^1.9.4",           // Maps
  "lucide-react": "^0.562.0",    // Icons
  "maplibre-gl": "^4.7.1",       // Vector maps
  "openai": "^6.15.0",           // OpenAI API
  "react": "^18.2.0",            // React
  "zod": "^4.3.4"                // Schema validation
}
```

### Dev Dependencies
```json
{
  "@vitejs/plugin-react": "^4.2.1",
  "tailwindcss": "^3.4.0",
  "typescript": "^5.3.3",
  "vite": "^5.0.8",
  "vitest": "^4.0.16"
}
```

---

*Document generated by Claude (Opus 4.5) on January 6, 2026*

