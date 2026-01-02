# Cursor AI IDE Handoff: Daniel's DCIM Dashboard Project
## Complete Context for Intuitive AI Assistance

**Version:** 1.0 | **Generated:** December 27, 2025  
**Project:** Global Infrastructure Command Center / DCIM Compliance Dashboard  
**Developer:** Daniel (Labor Studies MA, CUNY)

---

## PART 1: WHO IS DANIEL?

### Background & Mission
Daniel is a strategic researcher and infrastructure accountability specialist building tools for labor organizing and community coalitions. His work centers on documenting $2.48B+ in verified data center subsidy non-compliance across US states—where companies promised jobs and economic benefits in exchange for tax incentives but failed to deliver.

**Core Philosophy: "Tools, not products"**
- Movement-oriented technology over commercial software
- Zero ongoing costs to maximize accessibility
- Browser-only execution for smartphone-accessible organizing
- Evidence meeting Federal Rules of Evidence standards

### Professional Context
- **MA in Labor Studies** from CUNY
- **Prior work:** Media Matters for America (2013-2014) investigating right-wing media infrastructure
- **Coalition connections:** Tech Workers Coalition, CODE-CWA, UPROSE, Make the Road NY
- **Current focus:** NYC Mayor-elect Zohran Mamdani's transition team applications

---

## PART 2: THE PROJECT

### Technical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  DCIM COMPLIANCE DASHBOARD                                   │
│  Zero-Backend Browser Architecture                          │
├─────────────────────────────────────────────────────────────┤
│  Frontend: React 18+ with TypeScript                        │
│  Storage:  IndexedDB via Dexie.js (NO localStorage)         │
│  Hosting:  Cloudflare Pages (static assets only)            │
│  APIs:     Free government endpoints only                   │
│            - EPA ECHO, SEC EDGAR, GLEIF LEI                 │
│            - USASpending, RIPE RIS Live                     │
├─────────────────────────────────────────────────────────────┤
│  Data Scale: 11,992 facilities | 118 providers              │
│  Methodology: Edge-inclusive (DCs + edge POPs + CDN + CORD) │
└─────────────────────────────────────────────────────────────┘
```

### Key Numbers to Remember
| Metric | Value |
|--------|-------|
| Total Facilities | 11,992 |
| Providers Tracked | 118 |
| Documented Subsidy Gap | $2.48B+ |
| Switch Michigan Failure | 97.4% job delivery failure (26 vs 1,000 promised) |
| Virginia Annual Losses | $928.6M (JLARC Report 598) |

### Why Zero-Backend?
1. **Security:** No server = no attack surface for organizing tools
2. **Privacy:** No logs of who looked at what
3. **Portability:** Download and run offline, share peer-to-peer
4. **Cost:** No hosting burden for labor organizations
5. **Artifact compatibility:** Claude artifacts work best with self-contained React

---

## PART 3: DANIEL'S 10 CRITICAL SAFETY PATTERNS

**These are non-negotiable. Violating any causes immediate dashboard failures.**

### Pattern 1: Error Boundaries
```jsx
// ALWAYS wrap components that might fail
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error('Dashboard Error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 24, background: '#1a1a2e', borderRadius: 12 }}>
          <div style={{ color: '#ff4757' }}>Component Error</div>
          <button onClick={() => this.setState({ hasError: false })}>Retry</button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### Pattern 2: NO Dynamic Tailwind Classes
```jsx
// BAD - Will break at runtime
<div className={`bg-${status === 'alert' ? 'red' : 'green'}-500`}>

// GOOD - Use helper function
const getColorClasses = (status) => {
  const colors = {
    alert: 'bg-red-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500'
  };
  return colors[status] || 'bg-gray-500';
};
<div className={getColorClasses(status)}>

// BEST - Use inline styles (artifact-safe)
<div style={{ background: status === 'alert' ? '#ff4757' : '#2ed573' }}>
```

### Pattern 3: NO HTML Form Elements
```jsx
// BAD - Claude artifacts reject <form> tags
<form onSubmit={handleSubmit}>
  <input type="text" />
  <button type="submit">Submit</button>
</form>

// GOOD - React state + button handlers
const [value, setValue] = useState('');
<input value={value} onChange={(e) => setValue(e.target.value)} />
<button onClick={handleSubmit}>Submit</button>
```

### Pattern 4: IndexedDB via Dexie.js (NEVER localStorage)
```javascript
// BAD - localStorage fails in artifacts
localStorage.setItem('facilities', JSON.stringify(data));

// GOOD - IndexedDB with Dexie
import Dexie from 'dexie';

const db = new Dexie('DCIMDatabase');
db.version(1).stores({
  facilities: '++id, name, state, operator, complianceStatus',
  subsidyAgreements: '++id, facilityId, program, amount',
  dataProvenance: '++id, source, timestamp'
});

// Usage
await db.facilities.bulkAdd(facilitiesData);
const results = await db.facilities.where('state').equals('VA').toArray();
```

### Pattern 5: useEffect Cleanup
```jsx
// BAD - Memory leaks
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  // Missing cleanup!
}, []);

// GOOD - Always return cleanup
useEffect(() => {
  const interval = setInterval(fetchData, 5000);
  return () => clearInterval(interval);
}, []);
```

### Pattern 6: Memoization for Lists
```jsx
// BAD - Re-renders entire list on any state change
{facilities.map(f => <FacilityCard facility={f} />)}

// GOOD - Memoize list items
const FacilityCard = React.memo(({ facility }) => (
  <div>{facility.name}</div>
));
```

### Pattern 7: Conditional Rendering (Not CSS Hiding)
```jsx
// BAD - Element exists in DOM, causes layout issues
<div style={{ display: showPanel ? 'block' : 'none' }}>

// GOOD - Element doesn't exist when hidden
{showPanel && <Panel />}
```

### Pattern 8: Canvas over SVG for Large Datasets
```jsx
// BAD - SVG with 12,000 elements
<svg>{facilities.map(f => <circle cx={f.lng} cy={f.lat} />)}</svg>

// GOOD - Canvas for >1000 elements
// Or deck.gl with WebGL acceleration
import { DeckGL, ScatterplotLayer } from 'deck.gl';
```

### Pattern 9: Data Decimation (LTTB Algorithm)
```javascript
// For time series with >5000 points, decimate before rendering
// LTTB preserves visual fidelity while reducing points
import { largestTriangleThreeBuckets } from 'downsample';
const decimated = largestTriangleThreeBuckets(data, 500); // Reduce to 500 points
```

### Pattern 10: Virtual Scrolling for Lists
```jsx
// BAD - Renders all 12,000 facilities
<div>{facilities.map(f => <Row key={f.id} {...f} />)}</div>

// GOOD - TanStack Virtual renders only visible rows
import { useVirtualizer } from '@tanstack/react-virtual';
const virtualizer = useVirtualizer({
  count: facilities.length,
  getScrollElement: () => scrollRef.current,
  estimateSize: () => 48,
});
```

---

## PART 4: DANIEL'S PRESENTATION PREFERENCES

### Visual Style Requirements
Daniel requires **dramatic, boardroom-ready presentation** with maximum information density:

1. **Dramatic Boardroom Scenes**
   - Countdown timers for urgency
   - ASCII boxes for emphasis
   - "TRAP" moments revealing hidden information
   - "What's your move?" decision points

2. **Zero White Space Tolerance**
   - Every pixel serves a purpose
   - McKinsey/BCG-style density
   - Data tables, charts, infographics throughout

3. **No "Boring Font"**
   - Every text section needs visual accompaniment
   - Tables, charts, or infographics required
   - Pull quotes with impact styling

### Color Palette (Dark Theme Command Center)
```javascript
const COLORS = {
  bg: '#0a0e17',
  bgCard: '#0d1219',
  bgElevated: '#141c28',
  border: '#1e2d42',
  borderActive: '#3b82f6',
  text: '#e8eef6',
  textSecondary: '#8b9dc3',
  textMuted: '#5a6d8a',
  // Status colors
  red: '#ff4757',      // Non-compliant
  yellow: '#ffa502',   // Under review
  green: '#2ed573',    // Compliant
  cyan: '#00d2d3',     // Interactive/accent
  purple: '#a55eea',   // Special emphasis
};
```

### Document Formatting
- **Executive summaries:** Under 200 words, recommendation upfront
- **Sections:** Under 500 words each
- **Reading level:** Grade 10-12 per Flesch-Kincaid
- **Structure:** BLUF (Bottom Line Up Front)

---

## PART 5: TERMINOLOGY REQUIREMENTS

### ALWAYS Use Compliance Language
```
✓ "Non-compliance"     ✗ "Fraud"
✓ "Under-compliance"   ✗ "Cheating"
✓ "Misuse"            ✗ "Theft"
✓ "Shortfall"         ✗ "Crime"
✓ "Subsidy gap"       ✗ "Stolen money"
```

**Reason:** Avoids legal burden of proving criminal intent while maintaining broader applicability for enforcement actions, regulatory compliance, and False Claims Act whistleblower strategies.

### Legal Framework References
When Daniel discusses legal strategies, these frameworks apply:
- **NPU Theory:** Networks, Platforms, and Utilities (data centers exhibit classic utility characteristics)
- **EFF Constitutional Precedents:** Digital rights foundations
- **False Claims Act:** Federal whistleblower statute with qui tam provisions
- **Eminent Domain:** Community seizure of underperforming public-subsidized infrastructure

---

## PART 6: WORKFLOW & DEVELOPMENT PATTERNS

### The Claude → Cursor → Deploy Cycle
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Claude    │ -> │   Cursor    │ -> │  Deploy to  │ -> │   Iterate   │
│  Artifacts  │    │  IDE Work   │    │  Cloudflare │    │  & Refine   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
     │                   │                   │                   │
     │ Prototype &       │ Complex impl,     │ Static hosting    │ User testing
     │ quick visuals     │ integration       │ zero-backend      │ coalition feedback
```

### Artifact Size Limits (Critical)
| File Size | Reliability |
|-----------|-------------|
| < 50KB | ~100% reliable |
| 50-100KB | ~80% reliable |
| 100-200KB | ~60% reliable |
| > 200KB | Frequent failures |

**Strategy:** Build small focused modules, combine in Cursor

### File Modification Preference
```python
# PREFERRED: Python for JSX/React modifications
with open('component.jsx', 'r', encoding='utf-8') as f:
    content = f.read()
content = content.replace('old_exact_string', 'new_exact_string')
with open('component.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

# AVOID: Bash sed (fragile with JSX syntax)
sed -i 's/old/new/' file.jsx  # Line numbers shift, regex edge cases
```

### Known Gotchas to Watch For

1. **Map/MapIcon Import Collision**
```jsx
// BAD - lucide-react's Map shadows JS Map
import { Map } from 'lucide-react';
const data = new Map([...]); // CRASH: Map is now an icon component

// GOOD - Rename the import
import { Map as MapIcon } from 'lucide-react';
```

2. **Dollar Sign in JSX**
```jsx
// BAD - JSX interprets ${} as template literal
<div>${value}M</div>

// GOOD - Wrap dollar sign as string
<div>{'$'}{value}M</div>
```

3. **UTF-8 Encoding Issues**
Files transferred between systems may develop mojibake (corrupted characters). Fix with Python:
```python
with open('file.jsx', 'r', encoding='utf-8', errors='replace') as f:
    content = f.read()
# Process and write back
```

---

## PART 7: REACT 18 PATTERNS IN USE

### useTransition for Non-Blocking Search
```jsx
const [isPending, startTransition] = useTransition();
const handleSearch = (query) => {
  setSearchQuery(query); // Instant
  startTransition(() => {
    setFilteredResults(filter(data, query)); // Background
  });
};
```

### useDeferredValue for Expensive Computations
```jsx
const deferredQuery = useDeferredValue(query);
const isStale = query !== deferredQuery;
const filtered = useMemo(
  () => data.filter(x => x.includes(deferredQuery)),
  [deferredQuery]
);
```

### Suspense Boundaries
```jsx
<Suspense fallback={<Spinner />}>
  <FacilityDetails id={selectedId} />
</Suspense>
```

---

## PART 8: API INTEGRATIONS

### Free Government APIs (No Auth Required)
```javascript
const OSINT_ENDPOINTS = {
  // EPA Enforcement
  epaEcho: 'https://echo.epa.gov/api/v1/',
  
  // SEC Corporate Filings
  secEdgar: 'https://data.sec.gov/submissions/',
  
  // LEI Registry
  gleifLei: 'https://api.gleif.org/api/v1/lei-records',
  
  // Federal Spending
  usaSpending: 'https://api.usaspending.gov/api/v2/',
  
  // BGP Routing (Real-time)
  ripeRis: 'wss://ris-live.ripe.net/v1/ws/',
  
  // Certificate Transparency
  crtSh: 'https://crt.sh/?output=json&q=',
  
  // PeeringDB
  peeringDb: 'https://www.peeringdb.com/api/',
};
```

### CORS Handling (Browser-Only)
Some APIs require Cloudflare Worker proxy for CORS:
```javascript
// Worker endpoint for CORS-restricted APIs
const PROXY_URL = 'https://your-worker.workers.dev/proxy?url=';
```

---

## PART 9: DATA MODEL OVERVIEW

### Core Types
```typescript
interface Facility {
  id: number;
  name: string;
  type: 'Switch' | 'CO' | 'POP' | 'Data Center' | 'Edge' | 'CDN';
  operator: string;
  country: string;
  state: string;
  city: string;
  complianceStatus: 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown';
  subsidyGap: number;
  lastAuditDate: string;
  issues: string[];
  latitude?: number;
  longitude?: number;
}

interface SubsidyAgreement {
  id: number;
  facilityId: number;
  state: string;
  program: string;
  totalSubsidy: number;
  promisedJobs: number;
  deliveredJobs: number;
  complianceScore: number;
  clawbackTriggered: boolean;
}
```

### Edge-Inclusive Methodology
The 11,992 facility count includes:
- Traditional data centers
- Edge points of presence (POPs)
- CDN locations
- CORD (Central Office Re-architected as Datacenter)

This comprehensive approach captures the full scope of digital infrastructure.

---

## PART 10: CURSOR-SPECIFIC GUIDANCE

### When Daniel Asks for "Dramatic" Presentation
He wants:
- Dark theme with glowing accents
- Countdown timers, urgency indicators
- ASCII art section dividers
- Decision points with explicit options
- Maximum data density
- No wasted space

### When Daniel Mentions "Coalition Partners"
He's referring to:
- Tech Workers Coalition
- CODE-CWA
- UPROSE (Brooklyn environmental justice)
- Make the Road NY
- Strategic Organizing Center (SOC)

### When Daniel References "The Manifest"
He means the 11,992-facility provider database with edge-inclusive methodology across 118 providers.

### When Daniel Says "Tools Not Products"
He's emphasizing:
- Zero recurring costs
- Open source
- Movement-oriented
- Accessible to non-technical organizers

### Common Request Patterns

**"Make this boardroom-ready"**
= Add dramatic styling, data density, decision points

**"Add to the command center"**
= Integrate into DCIMCommandCenter.tsx main dashboard

**"Follow the safety patterns"**
= Apply all 10 patterns, especially no dynamic Tailwind and Error Boundaries

**"Use compliance terminology"**
= Replace fraud/theft language with non-compliance/shortfall

**"Edge-inclusive count"**
= Include all infrastructure types, not just traditional DCs

---

## PART 11: DEBUGGING CHECKLIST

When something breaks:

```bash
# 1. Check file size (keep under 50KB for artifacts)
ls -lh component.jsx
wc -c component.jsx

# 2. Verify no encoding issues
grep -P '[^\x00-\x7F]' component.jsx | head -5

# 3. Check for import collisions
grep -n "import.*Map" component.jsx

# 4. Verify all exports
grep -n "export default" component.jsx

# 5. Look for dynamic Tailwind
grep -E "className=\`.*\$\{" component.jsx

# 6. Check for localStorage usage
grep -n "localStorage\|sessionStorage" component.jsx

# 7. Verify Error Boundaries exist
grep -n "ErrorBoundary" component.jsx
```

---

## PART 12: PROJECT FILE STRUCTURE

```
dcim-dashboard/
├── src/
│   ├── App.tsx                     # Root component
│   ├── main.tsx                    # Entry point
│   ├── index.css                   # Global styles
│   ├── types.ts                    # TypeScript interfaces
│   │
│   ├── components/
│   │   ├── DCIMCommandCenter.tsx   # MAIN DASHBOARD
│   │   ├── ChatInterface.tsx       # AI chat integration
│   │   ├── ErrorBoundary.tsx       # Crash isolation
│   │   │
│   │   ├── tabs/
│   │   │   ├── OverviewTab.tsx
│   │   │   ├── GeographyTab.tsx
│   │   │   ├── SubsidyTrackingTab.tsx
│   │   │   ├── WorkerSafetyTab.tsx
│   │   │   └── OSINTToolsTab.tsx
│   │   │
│   │   └── shared/
│   │       ├── VirtualList.tsx
│   │       ├── StatCard.tsx
│   │       └── Globe3D.tsx
│   │
│   ├── db/
│   │   ├── database.ts             # Dexie schema
│   │   └── seedData.ts             # Initial data
│   │
│   ├── hooks/
│   │   ├── useKeyboardShortcuts.ts
│   │   └── useScrollOptimization.ts
│   │
│   └── utils/
│       ├── stats.ts
│       ├── formatting.ts
│       └── dashboardActions.ts
│
├── public/
├── package.json
├── vite.config.ts
└── tailwind.config.js
```

---

## QUICK REFERENCE CARD

### Daniel's Top Priorities
1. Zero-backend browser-only architecture
2. Evidence meeting Federal Rules standards
3. Labor movement accessibility
4. Dramatic boardroom presentation
5. Compliance (not fraud) terminology

### Never Do
- ❌ Use localStorage/sessionStorage
- ❌ Dynamic Tailwind classes
- ❌ HTML `<form>` elements
- ❌ Files over 50KB for artifacts
- ❌ SVG with >1000 elements
- ❌ Skip Error Boundaries
- ❌ Use "fraud" language

### Always Do
- ✅ IndexedDB via Dexie.js
- ✅ Inline styles or static Tailwind
- ✅ React state + button handlers
- ✅ Error Boundaries on all tabs
- ✅ Virtual scrolling for large lists
- ✅ useEffect cleanup functions
- ✅ Memoize list items
- ✅ Use compliance terminology

---

*This document enables Cursor AI to understand Daniel's working style, technical requirements, and project context for intuitive assistance.*

