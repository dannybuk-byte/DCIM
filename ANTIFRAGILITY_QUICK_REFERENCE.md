# Antifragility Quick Reference - Implementation Checklist

## 🎯 Priority 1: Critical (Implement First)

### 1. API Circuit Breakers
**Files to Update:**
- `src/components/ChatInterface.tsx` - Add circuit breaker for Claude API
- `src/services/DataFetcher.ts` - Add circuit breakers for EPA, SEC, Census APIs
- `src/api/*.ts` - Wrap all API calls

**Code Pattern:**
```typescript
import { circuitBreakers } from '../utils/circuitBreaker';

const response = await circuitBreakers.claudeAPI.execute(
  () => fetch(API_URL),
  () => ({ error: 'Service unavailable' }) // Fallback
);
```

### 2. Error Boundaries for Modals
**Files to Update:**
- `src/components/App.tsx` - Wrap ChatInterface, ReportModal, NetworkTraceModal
- `src/components/DCIMCommandCenter.tsx` - Already done ✅

**Code Pattern:**
```typescript
<ErrorBoundary fallback={<ErrorFallback />}>
  <ChatInterface isOpen={chatOpen} onClose={() => setChatOpen(false)} />
</ErrorBoundary>
```

### 3. Database Operation Retry
**Files to Update:**
- `src/components/ChatInterface.tsx` - Wrap `db.facilities.toArray()` calls
- `src/components/DCIMCommandCenter.tsx` - Wrap database operations
- `src/db/seedData.ts` - Add retry for seed operations

**Code Pattern:**
```typescript
import { retry } from '../utils/retry';

const facilities = await retry(
  () => db.facilities.toArray(),
  { maxRetries: 3, retryable: isRetryableError }
);
```

### 4. Null Safety in State
**Files to Update:**
- `src/components/tabs/OverviewTab.tsx` - Add null checks
- `src/components/tabs/GeographyTab.tsx` - Add null checks
- `src/components/tabs/ProblemsTab.tsx` - Add null checks
- All components using `useMemo` for calculations

**Code Pattern:**
```typescript
const stats = useMemo(() => {
  if (!facilities || facilities.length === 0) {
    return getEmptyStats(); // Fallback
  }
  try {
    return calculateStats(facilities) || getEmptyStats();
  } catch (error) {
    console.error('Calculation failed:', error);
    return getEmptyStats();
  }
}, [facilities]);
```

---

## 🎯 Priority 2: Important (Implement Next)

### 5. Timeout Protection
**Files to Create:**
- `src/utils/timeout.ts` - NEW FILE

**Files to Update:**
- `src/components/ChatInterface.tsx` - Add timeout to API calls
- `src/services/DataFetcher.ts` - Add timeout to all fetches

**Code Pattern:**
```typescript
import { withTimeout } from '../utils/timeout';

const response = await withTimeout(
  fetch(API_URL),
  5000, // 5 second timeout
  () => ({ error: 'Request timed out' })
);
```

### 6. Rate Limiting
**Files to Create:**
- `src/utils/rateLimiter.ts` - NEW FILE

**Files to Update:**
- `src/services/DataFetcher.ts` - Add rate limiting
- `src/components/ChatInterface.tsx` - Add rate limiting

**Code Pattern:**
```typescript
import { RateLimiter } from '../utils/rateLimiter';

const limiter = new RateLimiter(10, 60000); // 10 req/min
await limiter.check();
```

### 7. Input Sanitization
**Files to Create:**
- `src/utils/sanitization.ts` - NEW FILE

**Files to Update:**
- `src/components/shared/AutocompleteInput.tsx` - Sanitize input
- `src/components/ChatInterface.tsx` - Sanitize queries
- `src/utils/nlpQueryParser.ts` - Sanitize queries

**Code Pattern:**
```typescript
import { sanitizeSearchQuery } from '../utils/sanitization';

const safeQuery = sanitizeSearchQuery(userInput);
```

### 8. Global Error Handler
**Files to Create:**
- `src/utils/globalErrorHandler.ts` - NEW FILE

**Files to Update:**
- `src/main.tsx` - Initialize global error handler

**Code Pattern:**
```typescript
import { setupGlobalErrorHandling } from './utils/globalErrorHandler';

setupGlobalErrorHandling();
```

---

## 🎯 Priority 3: Enhancement (Implement Later)

### 9. Resource Limits
**Files to Create:**
- `src/utils/resourceLimits.ts` - NEW FILE

### 10. Memory Protection
**Files to Update:**
- `src/components/tabs/OverviewTab.tsx` - Limit processing
- `src/utils/stats.ts` - Add limits

### 11. Error Tracking
**Files to Create:**
- `src/utils/errorTracking.ts` - NEW FILE

### 12. Advanced Recovery
**Files to Create:**
- `src/utils/stateRecovery.ts` - NEW FILE

---

## 📊 Current Coverage Status

### ✅ Already Implemented
- [x] Circuit breakers for NLP search, map zoom, tile loading
- [x] Error boundaries around tabs
- [x] Basic retry logic (`src/utils/retry.ts`)
- [x] Database health checks (`src/utils/dbHealth.ts`)
- [x] AbortController cleanup in some hooks

### ⚠️ Needs Implementation
- [ ] API circuit breakers (ChatInterface, DataFetcher)
- [ ] Error boundaries for modals
- [ ] Timeout protection
- [ ] Rate limiting
- [ ] Input sanitization
- [ ] Global error handler
- [ ] Null safety in all state calculations
- [ ] Resource limits
- [ ] Error tracking integration

---

## 🔧 Quick Wins (Can Do Now)

1. **Wrap API calls in try-catch with fallbacks** (5 min per file)
2. **Add null checks to useMemo calculations** (2 min per file)
3. **Add ErrorBoundary around modals** (1 min per modal)
4. **Add timeout to fetch calls** (3 min per file)

---

## 📝 File-by-File Checklist

### High Priority Files
- [ ] `src/components/ChatInterface.tsx` - API circuit breaker, timeout, rate limit
- [ ] `src/services/DataFetcher.ts` - Circuit breakers, timeout, retry
- [ ] `src/components/App.tsx` - Error boundaries for modals
- [ ] `src/components/tabs/OverviewTab.tsx` - Null safety, error handling
- [ ] `src/components/tabs/GeographyTab.tsx` - Null safety, error handling
- [ ] `src/components/tabs/ProblemsTab.tsx` - Null safety, error handling

### Medium Priority Files
- [ ] `src/api/epa.ts` - Circuit breaker, timeout
- [ ] `src/api/census.ts` - Circuit breaker, timeout
- [ ] `src/api/bls.ts` - Circuit breaker, timeout
- [ ] `src/components/ReportModal.tsx` - Error boundary, null safety
- [ ] `src/components/NetworkTraceModal.tsx` - Error boundary, null safety

### Low Priority Files
- [ ] All other tab components - Null safety
- [ ] All shared components - Error boundaries
- [ ] All utility functions - Input validation

---

## 🧪 Testing Checklist

After implementing, test:
- [ ] Network failure → App degrades gracefully
- [ ] API failure → Circuit breaker activates
- [ ] Database failure → Retry logic works
- [ ] Component crash → ErrorBoundary catches
- [ ] Invalid input → Sanitization works
- [ ] Timeout → Fallback activates
- [ ] Rate limit → Requests are throttled

---

See `ANTIFRAGILITY_MAXIMIZATION_GUIDE.md` for detailed implementation instructions.

