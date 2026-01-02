# Development Guide

This document provides detailed development information for the DCIM Compliance Dashboard.

## Tools & CLI

### Anthropic Claude Code CLI

The Claude Code CLI provides enhanced AI-powered development assistance.

**Installation:**

```bash
# Global install (recommended, requires admin permissions)
npm install -g @anthropic-ai/claude-code

# Or install locally (per-project)
npm install @anthropic-ai/claude-code --save-dev

# Then use
claude
```

**Usage in Cursor:**
- Open terminal in Cursor
- Type `claude` to start interactive AI assistance
- Use for code suggestions, debugging, refactoring

**Alternative Installation Methods:**
- macOS/Linux: `sudo npm install -g @anthropic-ai/claude-code`
- Windows: Run PowerShell as Administrator
- Or use `npx @anthropic-ai/claude-code` to run without installing

## Critical Safety Patterns

These patterns prevent 90% of artifact failures. **DO NOT violate them:**

### 1. No Dynamic Tailwind Classes

❌ **WRONG:**
```typescript
className={`bg-${status}-500`}
```

✅ **CORRECT:**
```typescript
const getStatusClasses = (status: string) => {
  const classes = {
    healthy: 'bg-green-500 text-white',
    warning: 'bg-amber-500 text-black',
    critical: 'bg-red-500 text-white'
  };
  return classes[status] || 'bg-gray-500 text-white';
};
className={getStatusClasses(status)}
```

### 2. No HTML Forms

❌ **WRONG:**
```tsx
<form onSubmit={handleSubmit}>
  <input />
</form>
```

✅ **CORRECT:**
```tsx
<input onChange={e => setQuery(e.target.value)} />
<button onClick={handleSearch}>Search</button>
```

### 3. IndexedDB Only (via Dexie.js)

- Never use `localStorage` or `sessionStorage`
- All persistence goes through Dexie.js wrapper
- Example: `await db.facilities.toArray()`

### 4. Always Cleanup useEffect

```typescript
useEffect(() => {
  const controller = new AbortController();
  const ws = new WebSocket(url);
  const interval = setInterval(poll, 5000);
  
  fetch(url, { signal: controller.signal });
  
  return () => {
    controller.abort();
    ws.close();
    clearInterval(interval);
  };
}, []);
```

### 5. Memoization

- `React.memo` on all list items
- `useMemo` for expensive calculations
- `useCallback` for event handlers passed to children

### 6. Virtual Scrolling

- Use TanStack Virtual for lists >100 items
- Current implementation uses `react-window` (FixedSizeList)

### 7. Canvas over SVG

- Use Canvas for >1000 elements
- SVG for simpler visualizations

### 8. Error Boundaries

Wrap each major section:
```tsx
<ErrorBoundary>
  <Component />
</ErrorBoundary>
```

## Component Architecture

### Progressive Disclosure System

The `FacilityExplorer` component implements infinite expandable hierarchy:

**Level Structure:**
1. Country (e.g., "US (8,542)")
2. State/Region (e.g., "TX (1,234)")
3. Operator (e.g., "Amazon Web Services (456)")
4. Compliance Status (e.g., "Non-Compliant (123)")
5. Facility Type (e.g., "Data Center (89)")
6. City (e.g., "Dallas (34)")
7. Individual Facilities (e.g., "DFW-1", "DFW-2")

**Extending to 20+ Levels:**

Add more dimensions in `buildFacilityHierarchy`:
- Issue categories (Level 8)
- Audit date ranges (Level 9)
- Subsidy gap buckets (Level 10)
- Network providers (Level 11)
- ...and so on

### OSINT Data Integration

Real-time data fetching with caching:

**Data Sources:**
- PeeringDB (network facilities, interconnections)
- SEC EDGAR (company filings)
- EPA ECHO (environmental compliance)
- OSHA (safety violations)
- CRT.SH (certificate transparency)
- Good Jobs First (subsidy tracking)

**Caching Strategy:**
- TTL-based expiration (configurable per source)
- Offline fallback to cached data
- Data provenance tracking
- IndexedDB storage for API responses

## Testing

Run development server:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

## Deployment

### Cloudflare Worker (Claude API Proxy)

See `cloudflare-worker/README.md` for deployment instructions.

### Production Build

The application is a zero-backend PWA:
1. Build: `npm run build`
2. Deploy `dist/` folder to any static host
3. All data persists in browser IndexedDB

## Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx              # Main dashboard container
│   ├── ChatInterface.tsx          # AI chat with report generation
│   ├── ReportModal.tsx            # Compliance report generation
│   ├── FacilityExplorer.tsx       # Progressive disclosure explorer
│   ├── ProgressiveDisclosure.tsx  # Core disclosure component
│   ├── ReportRenderer.tsx         # Inline report rendering
│   ├── ErrorBoundary.tsx          # Error boundary wrapper
│   └── tabs/
│       ├── OverviewTab.tsx
│       ├── GeographyTab.tsx
│       ├── ProblemsTab.tsx
│       └── EarlyWarningTab.tsx
├── services/
│   ├── DataFetcher.ts             # OSINT data fetching service
│   └── getFacilityDetails.ts      # Facility detail aggregation
├── utils/
│   ├── reportIntent.ts            # Report intent detection
│   └── stats.ts                   # Statistics calculations
├── db/
│   ├── database.ts                # Dexie database setup
│   └── seedData.ts                # Sample data generation
└── types.ts                       # TypeScript definitions
```

