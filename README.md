# DCIM Compliance Dashboard

 A zero-backend browser application for infrastructure accountability tracking with AI-powered chat interface.

## Features

- **Dashboard Interface**
  - Dark theme with navigation tabs (Overview, Geography, Problems, Early Warning)
  - Displays 11,992 facilities with compliance statistics
  - Virtual scrolling for efficient rendering of large datasets
  - Real-time compliance metrics and subsidy gap tracking

- **AI Chat Interface**
  - Natural language queries against local IndexedDB data
  - Ask questions like:
    - "Show me all Switch facilities with compliance issues"
    - "What are the biggest subsidy gaps by state?"
    - "How many non-compliant facilities are there?"

## Tech Stack

- **React 18** + **TypeScript** - UI framework
- **Vite** - Build tool and dev server
- **Dexie.js** - IndexedDB wrapper for local storage
- **Tailwind CSS** - Styling (core utilities only)
- **react-window** - Virtual scrolling for performance
- **Cloudflare Worker** - Proxy for Claude API (ready for deployment)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

### Optional: Deploy Claude API Proxy

To enable AI chat with Claude (currently using pattern matching), deploy the Cloudflare Worker:

1. See `cloudflare-worker/README.md` for deployment instructions
2. Update `ChatInterface.tsx` to use your worker URL instead of pattern matching

## Project Structure

```
src/
├── components/
│   ├── Dashboard.tsx              # Main dashboard container
│   ├── ChatInterface.tsx          # AI chat with inline reports
│   ├── ReportModal.tsx            # Compliance report generation
│   ├── FacilityExplorer.tsx       # Progressive disclosure explorer
│   ├── ProgressiveDisclosure.tsx  # Core disclosure component (20+ levels)
│   ├── ReportRenderer.tsx         # Inline report rendering
│   ├── ErrorBoundary.tsx          # Error boundary wrapper
│   └── tabs/
│       ├── OverviewTab.tsx        # Overview with stats and facility list
│       ├── GeographyTab.tsx       # State-level statistics
│       ├── ProblemsTab.tsx        # Facilities with compliance issues
│       └── EarlyWarningTab.tsx    # At-risk facilities
├── services/
│   ├── DataFetcher.ts             # OSINT data fetching (PeeringDB, SEC, EPA, etc.)
│   └── getFacilityDetails.ts      # Facility detail aggregation
├── utils/
│   ├── reportIntent.ts            # Report intent detection and parsing
│   └── stats.ts                   # Statistics calculation utilities
├── db/
│   ├── database.ts                # Dexie database setup
│   └── seedData.ts                # Sample data generation (11,992 facilities)
├── types.ts                       # TypeScript type definitions
├── App.tsx                        # Root component
└── main.tsx                       # Application entry point
```

## Data Model

The application uses IndexedDB to store facility data locally. Each facility includes:
- Basic info (name, type, location)
- Compliance status (Compliant, Non-Compliant, At Risk, Unknown)
- Subsidy gap amount
- Audit dates
- Issue tracking

## Development Tools

### Anthropic Claude Code CLI

For enhanced AI-powered development assistance, you can install the Claude Code CLI:

```bash
# One-time global install (requires admin/sudo permissions)
npm install -g @anthropic-ai/claude-code

# Then use in terminal
claude
```

This provides additional AI development capabilities when working in the terminal.

**Note**: The global install may require elevated permissions. If you encounter permission errors, you can:
- Use `sudo npm install -g @anthropic-ai/claude-code` (macOS/Linux)
- Or run as Administrator (Windows)
- Or install locally per-project: `npm install @anthropic-ai/claude-code`

## Development Notes

- All data is stored locally in the browser using IndexedDB
- Sample data is automatically seeded on first load
- The chat interface uses Claude API via Cloudflare Worker proxy
- OSINT data integration with real-time caching (PeeringDB, SEC EDGAR, EPA ECHO, etc.)
- Progressive disclosure hierarchy for exploring 11,992+ facilities
- Virtual scrolling ensures smooth performance with large datasets
- All components follow production safety patterns (no dynamic Tailwind, proper memoization, error boundaries)

