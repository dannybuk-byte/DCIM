# AGENTS.md

**Project**: DCIM Compliance App - Data Center Accountability Dashboard  
**Last Updated**: January 3, 2026, 7:20 PM PST  
**Stack**: React 18 + TypeScript + Vite + Tailwind CSS + IndexedDB  
**Purpose**: Labor union organizing tool to expose Big Tech's broken job creation promises

---

## 🎯 Project Mission

**THIS IS A LABOR ORGANIZING TOOL, NOT A CORPORATE DCIM TOOL**

Arm labor unions and community organizers with data to fight Big Tech's broken promises. Track 11,992 data center facilities and expose the $2.48B+ subsidy gap. Built specifically for Tech Workers Coalition, CODE-CWA, UPROSE, and worker activists.

**Every feature must answer: "Does this help organizers win against Big Tech?"**

---

## 🏗️ Project Structure

```
DCIM Compliance App/
├── src/
│   ├── components/           # React components
│   │   ├── tabs/            # Dashboard tabs
│   │   ├── DCIMCommandCenter.tsx  # Main dashboard
│   │   ├── ChatInterface.tsx     # AI-powered search
│   │   └── HelpModal.tsx         # Help system
│   ├── utils/               # Utility functions
│   │   ├── circuitBreaker.ts    # API protection
│   │   ├── dbOperations.ts      # Database resilience
│   │   ├── errorTracking.ts     # Error logging
│   │   └── sanitization.ts      # Input cleaning
│   ├── db.ts                # IndexedDB schema (Dexie)
│   └── main.tsx             # Entry point
├── public/                  # Static assets
├── .vscode/                # Auto-start configuration
├── docs/ai-context/        # AI-readable documentation
└── index.html              # Entry point
```

---

## 🛠️ Build & Development Commands

```bash
# Development server (auto-starts on Cursor open)
npm run dev                 # Starts Vite on port 5173

# Build for production
npm run build              # Generates dist/ with build info

# Preview production build
npm run preview

# Testing
npm test                   # Run tests (if configured)
```

---

## 📋 TypeScript/React Conventions

### Component Patterns
- **Functional components only** with React hooks
- **Named exports only** - no default exports
- **Props interfaces** must be explicitly defined with TypeScript
- **File naming**: PascalCase for components (`ChatInterface.tsx`)
- **Hook naming**: `use` prefix for custom hooks

### Example Component Structure:
```typescript
interface ComponentNameProps {
  prop1: string;
  prop2?: number;
}

export const ComponentName: React.FC<ComponentNameProps> = ({ prop1, prop2 }) => {
  // Hooks at top
  const [state, setState] = useState<Type>(initialValue);
  
  // Event handlers
  const handleEvent = useCallback(() => {
    // logic
  }, [dependencies]);
  
  // Return JSX
  return <div>{/* content */}</div>;
};
```

### TypeScript Rules
- **No `any` types** - use `unknown` and type guards instead
- **Strict null checks** - always handle undefined/null cases
- **Explicit return types** on functions
- **Interface over type** for object shapes
- **Enums for constants** with multiple values

### State Management
- **React hooks** for local state (useState, useReducer)
- **useMemo** for expensive computations
- **useCallback** for event handlers passed to children
- **IndexedDB** (via Dexie) for persistent data

### Error Handling
- **ErrorBoundary** wraps all major components
- **Circuit breakers** protect API calls
- **Try-catch** in async functions with error logging
- **Graceful fallbacks** - app never shows blank screen

---

## 🗄️ Database Schema (IndexedDB)

```typescript
// Facilities table
interface Facility {
  id?: number;
  name: string;
  operator: string;
  state: string;
  jobsPromised: number;
  jobsActual: number;
  subsidyAmount: number;
  complianceStatus: 'compliant' | 'non-compliant' | 'unknown';
  // ... more fields
}
```

**Key Operations:**
- `db.facilities.toArray()` - Get all facilities
- `db.facilities.add(facility)` - Insert new
- `db.facilities.where('state').equals('TX')` - Query by state
- Always use `safeDbOperation()` wrapper for resilience

---

## 🔌 API Integrations

### OpenAI API (Natural Language Search)
- **Endpoint**: `https://api.openai.com/v1/chat/completions`
- **Rate Limit**: 60 requests/minute (enforced by rateLimiter)
- **Circuit Breaker**: Opens after 5 failures, 60s cooldown
- **Timeout**: 30 seconds per request

### External APIs (Future)
- EPA API - Environmental data
- SEC API - Financial filings
- Census API - Demographic data
- BLS API - Employment data

**All API calls must:**
1. Use circuit breaker wrapper
2. Apply rate limiting
3. Have timeout protection
4. Include error tracking
5. Provide fallback behavior

---

## 🛡️ Antifragility Features

### 7 Layers of Protection:
1. **Error Boundaries** - Component crashes contained
2. **Circuit Breakers** - API failures handled gracefully
3. **Database Resilience** - Auto-retry with fallbacks
4. **Rate Limiting** - Prevents API abuse
5. **Input Sanitization** - Blocks malicious input
6. **Global Error Handler** - Catches unhandled errors
7. **Error Tracking** - Full debugging capability

### Files Implementing Resilience:
- `src/utils/circuitBreaker.ts` - Circuit breaker logic
- `src/utils/dbOperations.ts` - Database retry logic
- `src/utils/errorTracking.ts` - Error logging
- `src/utils/globalErrorHandler.ts` - Global catch-all
- `src/utils/rateLimiter.ts` - Rate limiting
- `src/utils/sanitization.ts` - Input cleaning
- `src/utils/timeout.ts` - Timeout protection

---

## 🎨 Styling Conventions

### Tailwind CSS
- **Utility-first** approach
- **No dynamic class generation** - pre-commit hook checks
- **Responsive**: mobile-first with sm/md/lg/xl breakpoints
- **Dark theme**: Not currently implemented

### Color Palette:
- Primary: Blue tones (corporate accountability theme)
- Success: Green (#22c55e)
- Error: Red (#ef4444)
- Warning: Yellow/Orange (#f59e0b)

---

## 🚀 Deployment (Cloudflare Pages)

### Build Configuration
- **Build command**: `npm run build`
- **Build output**: `dist/`
- **Node version**: 18+
- **Environment variables**: Set in Cloudflare dashboard

### Pre-deploy Checklist:
1. Run `npm run build` locally to test
2. Check for console.log statements (pre-commit hook)
3. Verify no TODO/FIXME comments in production code
4. Test with production API keys
5. Verify error tracking works

### Deployment URL:
- Production: https://dcim-compliance.pages.dev
- Preview: Auto-generated for each PR

---

## 🧪 Testing Strategy

### Current Status:
- No automated tests yet
- Manual testing in browser required

### Future Testing:
- **Vitest** for unit tests
- **React Testing Library** for component tests
- **Playwright** for E2E tests
- Test coverage target: 80%+

---

## 📝 Common Tasks

### Adding a New Feature
1. Create component in `src/components/`
2. Add to `DCIMCommandCenter.tsx` if UI component
3. Update this file with conventions
4. Add error boundaries if needed
5. Test resilience (API failures, bad input, etc.)
6. Commit with conventional commit message

### Adding API Integration
1. Create circuit breaker in `circuitBreaker.ts`
2. Create rate limiter in `rateLimiter.ts`
3. Add timeout wrapper
4. Implement in component with error tracking
5. Test failure scenarios
6. Document in this file

### Debugging
1. Check browser console for errors
2. View error log: `localStorage.getItem('dcim_error_log')`
3. Check terminal for build errors
4. Use React DevTools for component state
5. Check Network tab for API issues

---

## 🔧 Configuration Files

### Key Files:
- `.vscode/tasks.json` - Auto-start dev server on folder open
- `.vscode/settings.json` - Auto-save after 1 second
- `vite.config.ts` - Vite configuration
- `tailwind.config.js` - Tailwind customization
- `tsconfig.json` - TypeScript compiler options
- `package.json` - Dependencies and scripts

### Pre-commit Hooks:
- Check for dynamic Tailwind classes
- Check for large files (>1MB)
- Check for console.log statements
- Check for TODO/FIXME/HACK comments
- Validate useEffect cleanup functions

---

## 🐛 Known Issues & Limitations

### Current Limitations:
1. No real facility data loaded (shows 0 facilities)
2. AI search requires OpenAI API key
3. No authentication system
4. No data export functionality
5. No offline support (despite IndexedDB)

### Browser Compatibility:
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support  
- Safari: ✅ Should work (not extensively tested)
- Mobile: ⚠️ Responsive but not optimized

---

## 🎯 Next Development Priorities

1. **Data Loading**: Import real facility data into IndexedDB
2. **API Key Management**: Secure storage for OpenAI key
3. **Export Features**: CSV/PDF export of compliance reports
4. **Search Improvements**: Better NLP query parsing
5. **Offline Support**: Service worker + PWA features

---

## 🤝 AI Coding Assistant Guidelines

### When Working with This Codebase:

**DO:**
- Use functional components with hooks
- Add error boundaries for new features
- Wrap API calls with circuit breakers
- Use TypeScript strict mode
- Add JSDoc comments for complex functions
- Test resilience (failures, bad input, edge cases)
- Update this file when adding major features

**DON'T:**
- Use class components
- Use `any` types
- Create default exports
- Add console.log in production code
- Generate dynamic Tailwind classes
- Skip error handling
- Forget null checks

### Context Restoration:
If starting a new session, read:
1. This file (AGENTS.md) - Project overview
2. `docs/ai-context/state.md` - Current state
3. `docs/ai-context/decisions.md` - Past decisions
4. Recent git commits - What changed

### Code Style:
- 2 spaces indentation
- Single quotes for strings
- Semicolons required
- Trailing commas in multiline
- Max line length: 100 characters (soft limit)

---

**Remember: This app exists to help workers fight corporate power. Every feature should serve that mission.**

