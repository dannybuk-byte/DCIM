# Technical Decisions

**Purpose**: Record all significant technical choices and their rationale to prevent re-exploring settled questions.

---

## 🏗️ Architecture Decisions

### AD-001: Frontend-Only Architecture
**Date**: December 2024  
**Decision**: Build as pure frontend app with client-side storage  
**Rationale**:
- Target users (labor organizers) need zero-setup tools
- No backend = no hosting costs, no server maintenance
- Data stays local for privacy
- Easy deployment via Cloudflare Pages (static hosting)

**Alternatives Considered**:
- Backend API with PostgreSQL → Rejected: Too complex, hosting costs
- Firebase → Rejected: Vendor lock-in, privacy concerns
- Supabase → Rejected: Still requires backend management

**Status**: ✅ Settled, working well

---

### AD-002: IndexedDB for Data Storage
**Date**: December 2024  
**Decision**: Use IndexedDB (via Dexie.js) for facility data  
**Rationale**:
- Stores 11,992 facilities client-side (5-10MB)
- Fast queries (<5ms with indexing)
- Works offline
- No API required for basic functionality
- Dexie provides clean TypeScript API

**Alternatives Considered**:
- LocalStorage → Rejected: 5MB limit, no querying
- In-memory only → Rejected: Lost on refresh
- External API → Rejected: Requires backend

**Trade-offs**:
- Data must be imported/seeded (not auto-synced)
- Limited to browser storage quota (~50MB typically)
- No multi-device sync

**Status**: ✅ Settled, schema defined in `src/db.ts`

---

### AD-003: React + TypeScript + Vite
**Date**: December 2024  
**Decision**: Modern React stack with Vite build tool  
**Rationale**:
- React: Component model fits dashboard UI
- TypeScript: Prevents bugs in complex data structures
- Vite: Fast dev server, optimal bundling
- Tailwind CSS: Rapid UI development

**Alternatives Considered**:
- Vue/Svelte → Rejected: Team familiarity with React
- Create React App → Rejected: Slow, deprecated
- Next.js → Rejected: Overkill for frontend-only app
- Vanilla JS → Rejected: Too much boilerplate

**Status**: ✅ Settled, working well

---

## 🛡️ Resilience Decisions

### AD-004: 7-Layer Antifragility System
**Date**: January 2026  
**Decision**: Implement comprehensive error handling with 7 layers  
**Rationale**:
- App must never crash completely (critical for organizers)
- Each layer catches different error types
- Graceful degradation better than hard failures

**Layers**:
1. Error Boundaries (React component crashes)
2. Circuit Breakers (API failures)
3. Database Resilience (IndexedDB errors)
4. Rate Limiting (API abuse prevention)
5. Input Sanitization (malicious input)
6. Global Error Handler (unhandled exceptions)
7. Error Tracking (debugging)

**Implementation**: See `src/utils/*` files

**Status**: ✅ Implemented and tested

---

### AD-005: Auto-Start Dev Server
**Date**: January 3, 2026  
**Decision**: Use `.vscode/tasks.json` with `"runOn": "folderOpen"`  
**Rationale**:
- Eliminates manual `npm run dev` step
- Reduces friction for development
- Standard VS Code feature (works in Cursor)
- No additional dependencies

**Alternatives Considered**:
- Custom script in package.json → Rejected: Still manual
- PM2/nodemon → Rejected: Overkill for dev
- Docker auto-start → Rejected: Adds complexity

**Status**: ✅ Implemented, awaiting user verification

---

## 🗄️ Data Management Decisions

### AD-006: No Real-Time Data Sync
**Date**: December 2024  
**Decision**: Manual data import, no live updates from external sources  
**Rationale**:
- Facility data changes slowly (quarterly updates sufficient)
- No need for real-time sync complexity
- Users can import updated datasets when available
- Reduces API dependencies

**Trade-offs**:
- Data can become stale
- Users must manually update
- No automatic enrichment from external APIs

**Future Consideration**: Could add optional API integration later

**Status**: ✅ Settled

---

### AD-007: Client-Side Natural Language Search
**Date**: December 2024  
**Decision**: Use OpenAI API directly from browser  
**Rationale**:
- No backend needed (API key stored in localStorage)
- Enables powerful NLP queries
- Flexible search semantics

**Security Consideration**: API key exposed in browser (acceptable for personal use)

**Alternatives Considered**:
- Backend proxy → Rejected: Adds complexity
- Local NLP → Rejected: Limited capability
- No AI search → Rejected: Reduces utility

**Status**: ✅ Implemented, awaiting OpenAI key

---

## 🎨 UI/UX Decisions

### AD-008: Mission Control Grid Layout
**Date**: January 2026  
**Decision**: Grid-based dashboard with collapsible panels  
**Rationale**:
- Information density important for organizers
- Multiple data views needed simultaneously
- Flexible layout adapts to task

**Alternatives Considered**:
- Single-page tabs → Rejected: Too limited
- Traditional sidebar → Rejected: Wastes space
- Mobile-first → Rejected: Desktop primary use case

**Status**: ✅ Implemented

---

### AD-009: Interactive Help System
**Date**: January 2026  
**Decision**: Modal-based help with categorized FAQ and search  
**Rationale**:
- Non-technical users need guidance
- Context-sensitive help reduces support burden
- Interactive elements more engaging than static docs

**Implementation**: `src/components/HelpModal.tsx`

**Status**: ✅ Implemented with hover effects and categories

---

## 🚀 Deployment Decisions

### AD-010: Cloudflare Pages for Hosting
**Date**: December 2024  
**Decision**: Deploy as static site on Cloudflare Pages  
**Rationale**:
- Free hosting for open source projects
- Global CDN for fast loading
- Automatic HTTPS
- GitHub integration for CI/CD
- Aligns with recommendation in context persistence article

**Alternatives Considered**:
- Vercel → Similar capability, chose Cloudflare
- Netlify → Similar capability, chose Cloudflare
- GitHub Pages → No custom domain flexibility
- Self-hosted → Maintenance burden

**Status**: ✅ Configured, URL: https://dcim-compliance.pages.dev

---

## 🧪 Testing Decisions

### AD-011: Manual Testing (For Now)
**Date**: December 2024  
**Decision**: No automated tests initially, manual browser testing  
**Rationale**:
- Rapid development phase, tests would slow iteration
- Component complexity low enough for manual testing
- Will add tests later when architecture stabilizes

**Future Plan**: Vitest + React Testing Library + Playwright

**Status**: 🟡 Temporary, plan to add tests

---

## 📦 Dependency Decisions

### AD-012: Minimal Dependencies
**Date**: December 2024  
**Decision**: Keep dependencies lean, prefer standard web APIs  
**Rationale**:
- Reduces bundle size
- Fewer security vulnerabilities
- Less maintenance burden
- Faster builds

**Key Dependencies**:
- React + ReactDOM (framework)
- Dexie (IndexedDB wrapper)
- Lucide React (icons)
- Tailwind CSS (styling)
- TypeScript (type safety)

**Avoided**:
- Heavy UI frameworks (Material-UI, Ant Design)
- State management libraries (Redux, MobX)
- Utility libraries (lodash, moment.js)

**Status**: ✅ Settled

---

## 🔄 Context Persistence Decisions

### AD-013: Layered Context Persistence Approach
**Date**: January 3, 2026  
**Decision**: Combine MCP memory server + AGENTS.md + LCMP protocol  
**Rationale**:
- No single tool solves everything
- MCP for automatic fact persistence
- AGENTS.md for explicit project context
- LCMP for strategic state management
- Follows production-proven patterns from 100+ commit projects

**Implementation**:
- Official @modelcontextprotocol/server-memory for simplicity
- AGENTS.md in root (cross-tool standard)
- docs/ai-context/ for LCMP files
- Pre-commit hooks for auto-generation

**Alternatives Considered**:
- Cursor Memories only → Rejected: Privacy concerns, cloud storage
- Windsurf → Rejected: Already using Cursor
- File-only approach → Rejected: Too manual
- MCP-only → Rejected: No explicit context control

**Status**: ⏳ In progress (this session)

---

### AD-014: Pre-Commit Context Generation
**Date**: January 3, 2026  
**Decision**: Auto-generate context docs on significant commits  
**Rationale**:
- Keeps context fresh without manual updates
- Triggers on TypeScript file changes
- Integrates with existing pre-commit safety checks

**Implementation**: Add to existing `pre-commit-hook.sh`

**Status**: ⏳ Planned

---

## 🚫 Rejected Ideas

### REJ-001: PWA with Service Worker
**Decision**: Postponed, not rejected  
**Reason**: Adds complexity, offline support not critical for MVP  
**May Revisit**: If users request offline functionality

---

### REJ-002: User Authentication
**Decision**: Not implementing  
**Reason**: App is tool for organizers, no sensitive per-user data, no reason to track users  
**Exception**: May add for multi-device sync later

---

### REJ-003: Backend API
**Decision**: Not implementing (see AD-001)  
**Reason**: Frontend-only sufficient for use case

---

## 📝 Decision Template

For future decisions, use this format:

```markdown
### AD-XXX: Decision Title
**Date**: YYYY-MM-DD  
**Decision**: What was decided  
**Rationale**: Why this choice  
**Alternatives Considered**: What else was evaluated  
**Trade-offs**: What we give up  
**Status**: ✅ Settled / 🟡 Temporary / ⏳ In Progress
```

---

**Purpose of This File**: Prevent circular discussions, document context for new contributors, provide rationale for architectural choices, enable informed future changes.

