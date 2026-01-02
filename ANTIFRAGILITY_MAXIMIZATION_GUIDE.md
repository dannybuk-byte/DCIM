# Complete Antifragility Maximization Guide for DCIM App

This document provides a comprehensive roadmap for maximizing antifragility throughout your DCIM Compliance Dashboard.

## 📊 Current State Analysis

### ✅ Already Implemented
- Circuit breakers for NLP search, map zoom, tile loading
- Error boundaries around tabs and search bar
- Basic try-catch in database operations
- AbortController cleanup in useEffect hooks

### ⚠️ Areas Needing Improvement
- API calls lack circuit breakers
- Database operations need retry logic
- State management lacks null safety
- Missing timeout protection
- No rate limiting
- Limited fallback data

---

## 🎯 1. Component-Level Isolation (Error Boundaries)

### Current Coverage
- ✅ Tabs wrapped in ErrorBoundary
- ✅ Search bar wrapped
- ⚠️ Missing: Individual feature components

### Implementation Plan

#### A. Wrap All Major Components

```typescript
// src/components/DCIMCommandCenter.tsx
// Add ErrorBoundary around each major feature:

{activeTab === 'ChatInterface' && (
  <ErrorBoundary fallback={<ChatErrorFallback />}>
    <ChatInterface isOpen={chatOpen} onClose={() => setChatOpen(false)} />
  </ErrorBoundary>
)}

{activeTab === 'ReportModal' && (
  <ErrorBoundary fallback={<ReportErrorFallback />}>
    <ReportModal isOpen={reportOpen} onClose={() => setReportOpen(false)} />
  </ErrorBoundary>
)}
```

**Files to Update:**
- `src/components/DCIMCommandCenter.tsx` - Wrap modals
- `src/components/App.tsx` - Wrap top-level components
- `src/components/tabs/*.tsx` - Wrap complex tab components
- `src/components/shared/*.tsx` - Wrap shared components

#### B. Create Feature-Specific Error Fallbacks

```typescript
// src/components/ErrorFallbacks.tsx
export const ChatErrorFallback = () => (
  <div className="p-4 bg-red-900/20 border border-red-700 rounded-lg">
    <p className="text-red-200">Chat temporarily unavailable</p>
    <button onClick={() => window.location.reload()}>Reload</button>
  </div>
);

export const MapErrorFallback = () => (
  <div className="p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
    <p className="text-yellow-200">Map view unavailable - showing list view</p>
  </div>
);
```

---

## 🔌 2. API & Network Operations

### Current State
- ⚠️ API calls in `ChatInterface.tsx` lack circuit breakers
- ⚠️ No retry logic for failed requests
- ⚠️ No timeout protection
- ⚠️ No rate limiting

### Implementation Plan

#### A. Add Circuit Breakers for All API Calls

```typescript
// src/utils/circuitBreaker.ts - ADD:
export const circuitBreakers = {
  // ... existing
  claudeAPI: new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 60000, // 1 minute
    halfOpenMaxAttempts: 2
  }),
  epaAPI: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenMaxAttempts: 2
  }),
  secAPI: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenMaxAttempts: 2
  }),
  censusAPI: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000,
    halfOpenMaxAttempts: 2
  })
};
```

#### B. Wrap API Calls with Circuit Breakers

```typescript
// src/components/ChatInterface.tsx
const ask = async (question: string) => {
  try {
    const response = await circuitBreakers.claudeAPI.execute(
      async () => {
        const res = await fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: [...], system: systemPrompt })
        });
        if (!res.ok) throw new Error(`API error: ${res.status}`);
        return res.json();
      },
      () => {
        // Fallback: Return cached response or pattern matching
        return { content: 'AI service temporarily unavailable. Using local search...' };
      }
    );
    return response;
  } catch (error) {
    console.error('Chat error:', error);
    // Graceful degradation
    return { content: 'Unable to process request. Please try again later.' };
  }
};
```

#### C. Add Retry Logic with Exponential Backoff

```typescript
// src/utils/retry.ts - ENHANCE existing:
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    circuitBreaker?: CircuitBreaker;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    backoffFactor = 2,
    circuitBreaker
  } = options;

  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (circuitBreaker) {
        return await circuitBreaker.execute(fn, () => {
          throw new Error('Circuit breaker open');
        });
      }
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (attempt < maxRetries) {
        const delay = Math.min(
          initialDelay * Math.pow(backoffFactor, attempt),
          maxDelay
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('Retry failed');
}
```

#### D. Add Timeout Protection

```typescript
// src/utils/timeout.ts - NEW FILE:
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback?: () => T
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => {
        if (fallback) {
          return Promise.resolve(fallback());
        }
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs)
    )
  ]);
}

// Usage:
const response = await withTimeout(
  fetch(API_URL),
  5000, // 5 second timeout
  () => ({ ok: false, json: async () => ({ error: 'Timeout' }) })
);
```

#### E. Add Rate Limiting

```typescript
// src/utils/rateLimiter.ts - NEW FILE:
export class RateLimiter {
  private requests: number[] = [];
  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  async check(): Promise<boolean> {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    
    if (this.requests.length >= this.maxRequests) {
      const oldest = this.requests[0];
      const waitTime = this.windowMs - (now - oldest);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.check();
    }
    
    this.requests.push(now);
    return true;
  }
}

// Usage:
const apiLimiter = new RateLimiter(10, 60000); // 10 requests per minute
await apiLimiter.check();
```

---

## 💾 3. Database Operations

### Current State
- ⚠️ Basic try-catch but no retry logic
- ⚠️ No connection health checks
- ⚠️ No transaction rollback handling
- ⚠️ No fallback for corrupted data

### Implementation Plan

#### A. Add Database Health Checks

```typescript
// src/utils/dbHealth.ts - ENHANCE:
export async function checkDBHealth(): Promise<{
  healthy: boolean;
  issues: string[];
  canRead: boolean;
  canWrite: boolean;
}> {
  const issues: string[] = [];
  let canRead = false;
  let canWrite = false;

  try {
    // Test read
    await db.facilities.limit(1).toArray();
    canRead = true;
  } catch (error) {
    issues.push('Database read failed');
  }

  try {
    // Test write (to settings table)
    await db.settings.put({ key: '__health_check__', value: Date.now() });
    await db.settings.delete('__health_check__');
    canWrite = true;
  } catch (error) {
    issues.push('Database write failed');
  }

  return {
    healthy: canRead && canWrite,
    issues,
    canRead,
    canWrite
  };
}
```

#### B. Wrap Database Operations with Retry

```typescript
// src/utils/dbOperations.ts - NEW FILE:
import { retryWithBackoff } from './retry';
import { db } from '../db/database';

export async function safeDbOperation<T>(
  operation: () => Promise<T>,
  fallback?: () => T
): Promise<T> {
  try {
    return await retryWithBackoff(operation, {
      maxRetries: 3,
      initialDelay: 100,
      backoffFactor: 2
    });
  } catch (error) {
    console.error('Database operation failed:', error);
    if (fallback) {
      return fallback();
    }
    throw error;
  }
}

// Usage:
const facilities = await safeDbOperation(
  () => db.facilities.toArray(),
  () => [] // Fallback: empty array
);
```

#### C. Add Data Validation

```typescript
// src/utils/dataValidation.ts - NEW FILE:
export function validateFacility(facility: any): Facility | null {
  if (!facility || typeof facility !== 'object') return null;
  if (!facility.id || !facility.name) return null;
  if (typeof facility.subsidyGap !== 'number' || facility.subsidyGap < 0) {
    facility.subsidyGap = 0; // Sanitize
  }
  return facility as Facility;
}

export function validateFacilities(facilities: any[]): Facility[] {
  return facilities
    .map(validateFacility)
    .filter((f): f is Facility => f !== null);
}
```

---

## 🎛️ 4. State Management

### Current State
- ⚠️ Some null checks but inconsistent
- ⚠️ No default values for computed state
- ⚠️ Missing defensive checks in useMemo

### Implementation Plan

#### A. Add Null Safety to All State

```typescript
// Pattern to apply everywhere:
const [facilities, setFacilities] = useState<Facility[]>([]); // ✅ Default empty array

// ❌ BAD:
const stats = calculateStats(facilities); // Can return null/undefined

// ✅ GOOD:
const stats = useMemo(() => {
  if (!facilities || facilities.length === 0) {
    return getEmptyStats(); // Fallback
  }
  try {
    return calculateStats(facilities) || getEmptyStats();
  } catch (error) {
    console.error('Stats calculation failed:', error);
    return getEmptyStats();
  }
}, [facilities]);
```

#### B. Add Defensive Checks in useMemo

```typescript
// src/components/tabs/OverviewTab.tsx - ENHANCE:
const { compliantByType, nonCompliantByType, subsidyGapByState } = useMemo(() => {
  try {
    if (!facilities || facilities.length === 0) {
      return {
        compliantByType: {},
        nonCompliantByType: {},
        subsidyGapByState: {}
      };
    }
    
    // ... existing calculation ...
    
    return result;
  } catch (error) {
    console.error('Stats calculation error:', error);
    return {
      compliantByType: {},
      nonCompliantByType: {},
      subsidyGapByState: {}
    };
  }
}, [facilities]);
```

#### C. Add State Recovery

```typescript
// src/utils/stateRecovery.ts - NEW FILE:
export function useStateWithRecovery<T>(
  initialValue: T,
  recoveryFn?: () => T
) {
  const [state, setState] = useState<T>(initialValue);
  const [error, setError] = useState<Error | null>(null);

  const safeSetState = useCallback((value: T | ((prev: T) => T)) => {
    try {
      setState(value);
      setError(null);
    } catch (err) {
      console.error('State update failed:', err);
      setError(err as Error);
      if (recoveryFn) {
        setState(recoveryFn());
      }
    }
  }, [recoveryFn]);

  return [state, safeSetState, error] as const;
}
```

---

## ⚡ 5. Async Operations

### Current State
- ✅ AbortController in some useEffect hooks
- ⚠️ Missing in many async operations
- ⚠️ No cleanup for timers/intervals

### Implementation Plan

#### A. Standardize AbortController Pattern

```typescript
// Pattern to apply everywhere:
useEffect(() => {
  let isMounted = true;
  const abortController = new AbortController();

  async function loadData() {
    try {
      const data = await fetch(url, {
        signal: abortController.signal
      }).then(r => r.json());
      
      if (isMounted && !abortController.signal.aborted) {
        setData(data);
      }
    } catch (error) {
      if (error.name === 'AbortError') {
        return; // Expected
      }
      console.error('Load error:', error);
      if (isMounted) {
        setError(error);
      }
    }
  }

  loadData();

  return () => {
    isMounted = false;
    abortController.abort();
  };
}, [url]);
```

#### B. Add Timer Cleanup

```typescript
// Pattern for intervals/timeouts:
useEffect(() => {
  const intervalId = setInterval(() => {
    // ... operation
  }, 1000);

  return () => {
    clearInterval(intervalId);
  };
}, []);
```

---

## 🔍 6. Data Processing & Validation

### Implementation Plan

#### A. Add Input Sanitization

```typescript
// src/utils/sanitization.ts - NEW FILE:
export function sanitizeSearchQuery(query: string): string {
  return query
    .trim()
    .slice(0, 500) // Max length
    .replace(/[<>]/g, ''); // Remove potential XSS
}

export function sanitizeFacilityName(name: string): string {
  return name
    .trim()
    .slice(0, 200)
    .replace(/[<>]/g, '');
}
```

#### B. Add Output Validation

```typescript
// Validate all API responses:
const validateAPIResponse = (data: any): boolean => {
  if (!data || typeof data !== 'object') return false;
  // Add schema validation
  return true;
};
```

---

## 🎨 7. UI Operations

### Implementation Plan

#### A. Add Loading States with Timeout

```typescript
// src/hooks/useLoadingWithTimeout.ts - NEW FILE:
export function useLoadingWithTimeout(
  isLoading: boolean,
  timeoutMs: number = 30000
) {
  const [showTimeout, setShowTimeout] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setShowTimeout(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowTimeout(true);
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [isLoading, timeoutMs]);

  return showTimeout;
}
```

#### B. Add Error States

```typescript
// Pattern for error states:
const [error, setError] = useState<Error | null>(null);
const [isRetrying, setIsRetrying] = useState(false);

const handleRetry = useCallback(async () => {
  setIsRetrying(true);
  setError(null);
  try {
    await loadData();
  } catch (err) {
    setError(err as Error);
  } finally {
    setIsRetrying(false);
  }
}, []);
```

---

## 📈 8. Performance & Resource Limits

### Implementation Plan

#### A. Add Resource Limits

```typescript
// src/utils/resourceLimits.ts - NEW FILE:
export class ResourceLimiter {
  private activeOperations = 0;
  constructor(private maxConcurrent: number) {}

  async acquire(): Promise<() => void> {
    while (this.activeOperations >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.activeOperations++;
    return () => {
      this.activeOperations--;
    };
  }
}

// Usage:
const limiter = new ResourceLimiter(5); // Max 5 concurrent operations
const release = await limiter.acquire();
try {
  await operation();
} finally {
  release();
}
```

#### B. Add Memory Protection

```typescript
// Limit large data processing:
const MAX_FACILITIES_TO_PROCESS = 10000;

const processFacilities = (facilities: Facility[]) => {
  if (facilities.length > MAX_FACILITIES_TO_PROCESS) {
    console.warn(`Processing ${MAX_FACILITIES_TO_PROCESS} of ${facilities.length} facilities`);
    return facilities.slice(0, MAX_FACILITIES_TO_PROCESS);
  }
  return facilities;
};
```

---

## 🚨 9. Global Error Handling

### Implementation Plan

#### A. Add Global Error Handler

```typescript
// src/utils/globalErrorHandler.ts - NEW FILE:
export function setupGlobalErrorHandling() {
  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    // Log to error tracking service
    event.preventDefault(); // Prevent default browser behavior
  });

  // Unhandled errors
  window.addEventListener('error', (event) => {
    console.error('Unhandled error:', event.error);
    // Log to error tracking service
  });
}
```

#### B. Add Error Tracking Integration

```typescript
// src/utils/errorTracking.ts - NEW FILE:
export function trackError(
  error: Error,
  context: Record<string, any> = {}
) {
  console.error('Error tracked:', error, context);
  
  // In production, send to error tracking service:
  // if (import.meta.env.PROD) {
  //   errorTrackingService.captureException(error, { extra: context });
  // }
}
```

---

## 📋 Implementation Priority

### Phase 1: Critical (Do First)
1. ✅ Circuit breakers for API calls
2. ✅ Error boundaries around all modals
3. ✅ Database operation retry logic
4. ✅ Null safety in state management

### Phase 2: Important (Do Next)
5. Timeout protection for all async operations
6. Rate limiting for API calls
7. Input sanitization
8. Global error handling

### Phase 3: Enhancement (Do Later)
9. Resource limits
10. Memory protection
11. Error tracking integration
12. Advanced recovery mechanisms

---

## 🧪 Testing Antifragility

### Test Scenarios

1. **Network Failure**: Disable network → App should degrade gracefully
2. **API Failure**: Mock API errors → Circuit breakers should activate
3. **Database Failure**: Corrupt IndexedDB → App should handle gracefully
4. **Component Crash**: Throw error in component → ErrorBoundary should catch
5. **Memory Pressure**: Load 100k facilities → Should limit processing
6. **Timeout**: Slow API response → Should timeout and fallback

---

## 📝 Code Examples

See `ANTIFRAGILE_STRATEGY.md` for detailed code examples of:
- Circuit breaker usage
- Error boundary patterns
- Retry logic
- Fallback strategies

---

## 🎯 Success Metrics

- **Zero cascading failures**: One feature failure doesn't break others
- **Graceful degradation**: Features fail with fallbacks, not crashes
- **Recovery time**: Failed features recover automatically
- **User experience**: Users can continue working even when features fail

---

This guide provides a complete roadmap for maximizing antifragility. Start with Phase 1 items and work through systematically.

