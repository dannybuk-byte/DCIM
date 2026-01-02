# DCIM Compliance App - Complete Project Context

## PROJECT OVERVIEW

This is a **zero-backend browser application** for infrastructure accountability tracking with an AI-powered chat interface. The app tracks compliance status, subsidy gaps, and facility information for ~12,000 infrastructure facilities (switches, COs, POPs, data centers) stored locally in IndexedDB.

**Purpose**: Track and analyze infrastructure compliance, subsidy agreements, and facility data with AI-powered querying capabilities.

---

## TECH STACK

### Core Framework
- **React 18.2.0** with TypeScript
- **Vite 5.0.8** (build tool and dev server)
- **Tailwind CSS 3.4.0** (utility-first styling)

### Data & Storage
- **Dexie.js 3.2.4** (IndexedDB wrapper)
- Local browser storage only (no backend server)
- Automatic data seeding on first load

### UI Libraries
- **lucide-react 0.562.0** (icons)
- **react-window 1.8.10** (virtual scrolling for performance)

### Analytics & ML (Optional/Dynamic Imports)
- **echarts 6.0.0** + **echarts-for-react 3.0.5** (charts/visualizations)
- **@tensorflow/tfjs 4.22.0** (ML capabilities)
- **arima 0.2.5** (time series forecasting)
- **slayer 1.0.1** (anomaly detection)
- **isolation-forest 0.0.9** (outlier detection)

### External Services
- **Cloudflare Worker** proxy for Claude API (`https://claude-api-proxy.dannybuk.workers.dev`)
- Pattern matching fallback when API unavailable

---

## PROJECT STRUCTURE

```
src/
├── App.tsx                          # Root component - orchestrates all modals/views
├── main.tsx                         # Entry point
├── index.css                        # Global styles + smooth scrolling optimizations
├── types.ts                         # TypeScript interfaces (Facility, ComplianceStats, etc.)
│
├── components/
│   ├── DCIMCommandCenter.tsx        # MAIN DASHBOARD - primary interface
│   ├── ChatInterface.tsx            # AI chat with Claude API integration
│   ├── ReportModal.tsx              # Report generation modal with tabs
│   ├── Dashboard.tsx                # Legacy dashboard (may be unused)
│   ├── DynamicActionButtons.tsx     # Floating action buttons
│   ├── NavigationHelper.tsx        # Keyboard shortcuts helper
│   ├── ErrorBoundary.tsx            # Error boundary wrapper
│   │
│   ├── tabs/                        # Tab components for DCIMCommandCenter
│   │   ├── OverviewTab.tsx          # Main overview with stats + facility list
│   │   ├── GeographyTab.tsx         # State-level statistics
│   │   ├── ProblemsTab.tsx          # Facilities with compliance issues
│   │   ├── EarlyWarningTab.tsx      # At-risk facilities
│   │   ├── GeographicIntelTab.tsx   # Global mapping (2D/3D)
│   │   ├── SubsidyTrackingTab.tsx   # Subsidy agreement tracking
│   │   ├── WorkerSafetyTab.tsx      # Worker safety metrics
│   │   ├── OSINTToolsTab.tsx        # OSINT data tools
│   │   ├── ComplianceComparisonTab.tsx
│   │   ├── DCIMAnalyticsTab.tsx      # Analytics with ML (dynamic imports)
│   │   └── GuidesTab.tsx
│   │
│   ├── shared/                      # Reusable components
│   │   ├── ViewModeToggle.tsx       # 2D/3D view toggle
│   │   ├── LayerTogglesPanel.tsx    # Layer visibility controls
│   │   ├── ExpandableSection.tsx    # Collapsible sections
│   │   ├── NestedTabs.tsx           # Nested tab navigation
│   │   ├── Tooltip.tsx              # Tooltip component
│   │   ├── VirtualList.tsx          # Virtualized list component
│   │   ├── StatCard.tsx             # Statistics card
│   │   ├── Map2D.tsx                # 2D map visualization
│   │   ├── Globe3D.tsx              # 3D globe visualization
│   │   ├── TopologyView.tsx         # Network topology visualization
│   │   └── [other shared components]
│   │
│   └── [Other feature components]
│       ├── FacilityExplorer.tsx
│       ├── FacilityProfile.tsx
│       ├── ProgressiveDisclosure.tsx
│       └── [various specialized components]
│
├── db/
│   ├── database.ts                  # Dexie database schema + setup
│   └── seedData.ts                  # Data seeding (generates ~12k facilities)
│
├── hooks/
│   ├── useKeyboardShortcuts.ts      # Keyboard navigation hooks
│   ├── useScrollOptimization.ts    # Scroll performance optimization
│   └── useWithProvenance.ts
│
├── utils/
│   ├── smoothScroll.ts              # Smooth scrolling utility + polyfill
│   ├── stats.ts                     # Statistics calculations
│   ├── formatting.ts                 # Currency/date formatting
│   ├── dashboardActions.ts           # Action detection from AI queries
│   ├── dcimAnalyzer.ts              # ML/analytics (uses dynamic imports)
│   ├── dbHealth.ts                  # Database health checks
│   └── [other utilities]
│
├── services/
│   ├── DataFetcher.ts               # OSINT data fetching (PeeringDB, SEC, EPA)
│   ├── getFacilityDetails.ts        # Facility detail aggregation
│   ├── APIRegistry.ts
│   └── [other services]
│
└── config/
    └── sourceTypes.ts               # Data source type definitions
```

---

## DATA MODEL

### Core Types (from `types.ts`)

```typescript
interface Facility {
  id: number;
  name: string;
  type: 'Switch' | 'CO' | 'POP' | 'Data Center' | 'Other';
  operator: string;              // Company that owns/operates
  country: string;
  state: string;
  city: string;
  complianceStatus: 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown';
  subsidyGap: number;            // Financial gap amount
  lastAuditDate: string;
  issues: string[];
  latitude?: number;
  longitude?: number;
  dataSources?: DataSource[];    // Provenance tracking
}

interface ComplianceStats {
  totalFacilities: number;
  compliant: number;
  nonCompliant: number;
  atRisk: number;
  unknown: number;
  totalSubsidyGap: number;
}
```

### Database Schema (Dexie - IndexedDB)

**Version 4** includes:
- `facilities` - Main facility data
- `dataProvenance` - Data source tracking
- `communityContext` - Community demographics
- `subsidyAgreements` - Subsidy/promise tracking
- `localSignatures` - Calculated signatures (labor, energy, etc.)
- `localOrganizations` - Local orgs by county
- `knowledgeGaps` - Identified information gaps
- `engagementTracking` - User engagement metrics

---

## KEY FEATURES & COMPONENTS

### 1. DCIMCommandCenter (Main Dashboard)
- **Location**: `src/components/DCIMCommandCenter.tsx`
- **Purpose**: Primary interface with tabs, filters, AI search, and facility views
- **Tabs**: Overview, Geography, Problems, Early Warning, Geographic Intel, Subsidy Tracking, Worker Safety, OSINT Tools, DCIM Analytics, Guides, Facilities, Explorer, Compare, Reports
- **Features**:
  - Global search (Cmd+K / Ctrl+K)
  - AI search bar with natural language queries
  - Filtering by state, operator, compliance status, subsidy gap
  - View mode toggle (2D/3D for maps)
  - Layer toggles for visualization layers
  - Breadcrumb navigation
  - Keyboard shortcuts (arrow keys, 1-9 for tabs, etc.)

### 2. ChatInterface
- **Location**: `src/components/ChatInterface.tsx`
- **Purpose**: AI-powered chat using Claude API
- **Features**:
  - Natural language queries against local IndexedDB
  - Pattern matching fallback when API unavailable
  - Inline report generation
  - Message history

### 3. ReportModal
- **Location**: `src/components/ReportModal.tsx`
- **Purpose**: Generate compliance reports
- **Tabs**: Facility, Operator, State, Evidence
- **Features**:
  - Print functionality (Ctrl+P)
  - Keyboard navigation
  - Dynamic report content based on filters

### 4. Smooth Scrolling System
- **Location**: `src/utils/smoothScroll.ts` + `src/index.css`
- **Purpose**: Maximum smooth scrolling performance
- **Features**:
  - CSS `scroll-behavior: smooth` with `!important`
  - JavaScript polyfill for unsupported browsers
  - GPU acceleration (`translate3d`, `will-change`)
  - CSS containment (`contain: layout style paint size`)
  - Content visibility optimization
  - Throttled scroll events (~60fps)
  - Passive event listeners
  - Disabled interactions during scroll for performance

### 5. Keyboard Navigation
- **Location**: `src/hooks/useKeyboardShortcuts.ts`
- **Features**:
  - Global shortcuts (Cmd+K, Esc, etc.)
  - Tab navigation (arrow keys, 1-9)
  - Component-specific shortcuts
  - NavigationHelper component for displaying shortcuts

---

## RECENT CHANGES & OPTIMIZATIONS

### 1. Smooth Scrolling Enhancements (Most Recent)
- Added aggressive CSS optimizations for scroll performance
- Implemented `smoothScroll.ts` utility with polyfill
- Applied GPU acceleration to all scrollable containers
- Added CSS containment and content-visibility optimizations
- Throttled scroll events to ~60fps
- Disabled pointer events during scroll for better performance
- Applied `scroll-smooth` class to all scrollable containers

### 2. Header/Toolbar Visibility Fix
- Fixed issue where header disappeared due to `.scrolling` class
- Changed header positioning from `sticky` to `relative`
- Added explicit CSS rules to ensure header visibility
- Moved breadcrumbs inside header

### 3. Code Cleanup (Space Optimization)
- Removed 111+ instances of debug agent log code
- Removed all `fetch('http://127.0.0.1:7242/...')` debug calls
- Removed `#region agent log` / `#endregion` blocks
- Cleaned up console.log statements (kept error/warn)
- Deleted unused "Untitled" files
- Estimated ~15,000-20,000 characters removed

### 4. Navigation Enhancements
- Added keyboard shortcuts system
- Implemented tab navigation with arrow keys
- Added breadcrumbs for navigation context
- Created NavigationHelper component
- Added skip links for accessibility

---

## KNOWN ISSUES & CURRENT STATE

### 1. Header/Toolbar Visibility
- **Status**: Recently fixed, but may need verification
- **Issue**: Header was disappearing due to CSS optimizations
- **Fix Applied**: Changed positioning, added explicit visibility rules

### 2. Smooth Scrolling
- **Status**: Multiple optimization passes applied
- **Issue**: User reported scrolling not smooth enough
- **Fixes Applied**:
  - CSS `scroll-behavior: smooth !important`
  - GPU acceleration
  - CSS containment
  - JavaScript polyfill
  - Event throttling
- **Note**: May still need refinement based on user feedback

### 3. Dynamic Imports
- **Status**: Working after dependency installation
- **Dependencies**: echarts, @tensorflow/tfjs, arima, slayer, isolation-forest
- **Location**: `src/utils/dcimAnalyzer.ts`, `src/components/tabs/DCIMAnalyticsTab.tsx`
- **Pattern**: Uses dynamic `import()` with error handling

### 4. Vite Configuration
- **Status**: Configured for dynamic imports
- **Note**: Previously had `optimizeDeps.exclude` entries, but removed after dependencies installed

---

## ARCHITECTURAL PATTERNS

### 1. Component Structure
- Functional components with hooks
- TypeScript for type safety
- Error boundaries for graceful error handling
- Memoization where appropriate (`React.memo`, `useMemo`)

### 2. State Management
- React hooks (`useState`, `useEffect`, `useMemo`, `useCallback`)
- Local component state (no global state management library)
- IndexedDB for persistent data storage

### 3. Performance Optimizations
- Virtual scrolling for large lists (`react-window`)
- Deferred values (`useDeferredValue`) for expensive calculations
- Memoization of expensive computations
- Dynamic imports for optional heavy dependencies
- CSS containment and content-visibility
- GPU acceleration for animations/scrolling

### 4. Error Handling
- ErrorBoundary components
- Try-catch blocks with graceful degradation
- Fallback UI states
- Database health checks

### 5. Accessibility
- ARIA attributes (`role`, `aria-label`, `aria-selected`)
- Keyboard navigation
- Skip links
- Screen reader support
- Focus management

---

## STYLING APPROACH

### Tailwind CSS
- Utility-first approach
- Dark theme (gray-950, gray-900, gray-800 backgrounds)
- Amber accent color (amber-500, amber-400)
- Custom scrollbar styling
- Responsive design

### Custom CSS (`index.css`)
- Global smooth scrolling rules
- Performance optimizations (GPU acceleration, containment)
- Custom scrollbar styles (WebKit + Firefox)
- Animation keyframes (`fadeIn`)
- Scroll optimization classes

---

## KEY UTILITIES & HELPERS

### `smoothScroll.ts`
- `initSmoothScrolling()` - Initializes smooth scrolling for all containers
- `smoothScrollTo()` - Programmatic smooth scrolling
- `throttle()` / `debounce()` - Event optimization

### `useKeyboardShortcuts.ts`
- `useKeyboardShortcuts()` - Hook for keyboard shortcuts
- `useTabNavigation()` - Hook for tab navigation

### `stats.ts`
- `calculateStats()` - Calculates compliance statistics from facilities

### `formatting.ts`
- `formatCurrency()` - Currency formatting

### `dashboardActions.ts`
- `detectDashboardAction()` - Detects actions from AI queries

---

## DEVELOPMENT WORKFLOW

### Running the App
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (Vite)
npm run build        # Build for production
npm run preview      # Preview production build
```

### Key Dependencies Installation History
- `echarts` + `echarts-for-react` - For charts
- `@tensorflow/tfjs` - For ML (required `--no-cache` flag due to npm cache issues)
- `arima`, `slayer`, `isolation-forest` - For analytics

### Build Tool
- **Vite** handles bundling, HMR, and dev server
- TypeScript compilation via `tsc`
- Tailwind CSS processing via PostCSS

---

## CURRENT FOCUS AREAS

1. **Smooth Scrolling** - Multiple optimization passes, may need further refinement
2. **Header Visibility** - Recently fixed, needs verification
3. **Performance** - Ongoing optimization for large datasets
4. **Code Cleanup** - Recently removed debug code, may have more opportunities

---

## IMPORTANT NOTES FOR CLAUDE

1. **No Backend**: Everything runs in the browser. Data is stored in IndexedDB.

2. **Dynamic Imports**: Heavy dependencies (ML libraries, charts) are loaded dynamically to reduce initial bundle size.

3. **Error Handling**: The app uses graceful degradation - if something fails, it tries to continue with available data.

4. **Performance**: The app handles ~12,000 facilities, so performance optimizations (virtual scrolling, memoization, deferred values) are critical.

5. **Smooth Scrolling**: This has been a focus area with multiple optimization passes. The current implementation uses CSS + JavaScript polyfill.

6. **Keyboard Navigation**: Extensive keyboard shortcuts are implemented for accessibility and power users.

7. **TypeScript**: The codebase is fully typed. Check `types.ts` for core interfaces.

8. **Component Organization**: Main dashboard is `DCIMCommandCenter.tsx`. Tabs are in `components/tabs/`. Shared components in `components/shared/`.

9. **Recent Cleanup**: All debug/agent log code has been removed to save tokens and clean up the codebase.

10. **CSS Optimizations**: Aggressive CSS optimizations have been applied for scroll performance. Some may need adjustment if they cause layout issues.

---

## COMMON PATTERNS TO FOLLOW

1. **Error Boundaries**: Wrap components that might fail
2. **Memoization**: Use `useMemo` for expensive calculations, `useCallback` for functions passed as props
3. **Deferred Values**: Use `useDeferredValue` for expensive filtering/calculations
4. **Dynamic Imports**: Use for optional heavy dependencies
5. **TypeScript**: Always type props, state, and function parameters
6. **Accessibility**: Include ARIA attributes, keyboard navigation, focus management
7. **Performance**: Consider virtual scrolling for long lists, CSS containment for isolated components

---

## FILES TO CHECK FOR CONTEXT

- `src/App.tsx` - Root component structure
- `src/components/DCIMCommandCenter.tsx` - Main dashboard (largest component)
- `src/types.ts` - Type definitions
- `src/db/database.ts` - Database schema
- `src/index.css` - Global styles and optimizations
- `src/utils/smoothScroll.ts` - Smooth scrolling implementation
- `package.json` - Dependencies and scripts

---

This document provides comprehensive context for understanding and working with the DCIM Compliance App codebase. Use it as a reference when making changes or debugging issues.

