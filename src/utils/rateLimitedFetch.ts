/**
 * Rate-Limited Fetch with Exponential Backoff
 * 
 * Prevents client-side self-DDoS by:
 * - Limiting requests per time window
 * - Exponential backoff on failures
 * - Circuit breaker pattern (stops trying after too many failures)
 * 
 * This is the defensive layer for all verification API calls.
 */

import { telemetryBus } from '../services/telemetryBus';

export interface RateLimitConfig {
  /** Max requests per window */
  maxRequests: number;
  /** Window size in ms */
  windowMs: number;
  /** Initial backoff delay in ms */
  initialBackoffMs: number;
  /** Max backoff delay in ms */
  maxBackoffMs: number;
  /** Backoff multiplier */
  backoffMultiplier: number;
  /** Max consecutive failures before circuit opens */
  circuitBreakerThreshold: number;
  /** How long circuit stays open (ms) */
  circuitBreakerResetMs: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 30,          // 30 requests
  windowMs: 60_000,         // per minute
  initialBackoffMs: 1_000,  // 1 second initial backoff
  maxBackoffMs: 60_000,     // max 1 minute backoff
  backoffMultiplier: 2,     // double each time
  circuitBreakerThreshold: 5,   // 5 failures opens circuit
  circuitBreakerResetMs: 120_000, // 2 minutes before retry
};

interface RateLimiterState {
  requests: number[];           // timestamps of recent requests
  consecutiveFailures: number;
  currentBackoffMs: number;
  circuitOpenUntil: number | null;
  lastFailureTime: number | null;
}

type RateLimiterKey = string;

class RateLimitedFetchService {
  private config: RateLimitConfig;
  private limiters: Map<RateLimiterKey, RateLimiterState> = new Map();

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  private getOrCreateState(key: RateLimiterKey): RateLimiterState {
    let state = this.limiters.get(key);
    if (!state) {
      state = {
        requests: [],
        consecutiveFailures: 0,
        currentBackoffMs: this.config.initialBackoffMs,
        circuitOpenUntil: null,
        lastFailureTime: null,
      };
      this.limiters.set(key, state);
    }
    return state;
  }

  private cleanOldRequests(state: RateLimiterState): void {
    const cutoff = Date.now() - this.config.windowMs;
    state.requests = state.requests.filter(ts => ts > cutoff);
  }

  private isCircuitOpen(state: RateLimiterState): boolean {
    if (!state.circuitOpenUntil) return false;
    if (Date.now() >= state.circuitOpenUntil) {
      // Half-open: allow one request to test
      state.circuitOpenUntil = null;
      return false;
    }
    return true;
  }

  private isRateLimited(state: RateLimiterState): boolean {
    this.cleanOldRequests(state);
    return state.requests.length >= this.config.maxRequests;
  }

  private shouldBackoff(state: RateLimiterState): boolean {
    if (!state.lastFailureTime) return false;
    return Date.now() < state.lastFailureTime + state.currentBackoffMs;
  }

  private recordSuccess(state: RateLimiterState): void {
    state.consecutiveFailures = 0;
    state.currentBackoffMs = this.config.initialBackoffMs;
    state.circuitOpenUntil = null;
  }

  private recordFailure(state: RateLimiterState, key: RateLimiterKey): void {
    state.consecutiveFailures++;
    state.lastFailureTime = Date.now();
    state.currentBackoffMs = Math.min(
      state.currentBackoffMs * this.config.backoffMultiplier,
      this.config.maxBackoffMs
    );

    if (state.consecutiveFailures >= this.config.circuitBreakerThreshold) {
      state.circuitOpenUntil = Date.now() + this.config.circuitBreakerResetMs;
      this.emitCircuitOpenTelemetry(key, state);
    }
  }

  private emitCircuitOpenTelemetry(key: string, state: RateLimiterState): void {
    void telemetryBus.emit(
      {
        source: 'api',
        type: 'circuit_breaker_opened',
        severity: 'high',
        title: `Circuit breaker opened for ${key}`,
        summary: `${state.consecutiveFailures} consecutive failures. Circuit will reset in ${this.config.circuitBreakerResetMs / 1000}s.`,
        payload: {
          key,
          consecutiveFailures: state.consecutiveFailures,
          circuitOpenUntil: state.circuitOpenUntil,
        },
        fingerprint: `circuit_breaker_opened:${key}:${Date.now()}`,
      },
      { skipAutoLink: true },
    );
  }

  private emitRateLimitTelemetry(key: string): void {
    void telemetryBus.emit(
      {
        source: 'api',
        type: 'rate_limit_hit',
        severity: 'medium',
        title: `Rate limit hit for ${key}`,
        summary: `Max ${this.config.maxRequests} requests per ${this.config.windowMs / 1000}s exceeded.`,
        payload: { key, maxRequests: this.config.maxRequests, windowMs: this.config.windowMs },
        fingerprint: `rate_limit_hit:${key}:${Math.floor(Date.now() / 60000)}`, // dedup per minute
      },
      { skipAutoLink: true },
    );
  }

  /**
   * Rate-limited fetch with exponential backoff and circuit breaker.
   * 
   * @param key - Unique key for this endpoint (e.g., 'routeviews', 'health')
   * @param url - URL to fetch
   * @param options - Fetch options
   * @returns Response or throws error
   */
  async fetch(
    key: RateLimiterKey,
    url: string,
    options: RequestInit = {},
  ): Promise<Response> {
    const state = this.getOrCreateState(key);

    // Check circuit breaker
    if (this.isCircuitOpen(state)) {
      throw new Error(`Circuit breaker open for ${key}. Retry after ${new Date(state.circuitOpenUntil!).toLocaleTimeString()}`);
    }

    // Check rate limit
    if (this.isRateLimited(state)) {
      this.emitRateLimitTelemetry(key);
      throw new Error(`Rate limit exceeded for ${key}. Max ${this.config.maxRequests} per ${this.config.windowMs / 1000}s.`);
    }

    // Check backoff
    if (this.shouldBackoff(state)) {
      const waitMs = (state.lastFailureTime! + state.currentBackoffMs) - Date.now();
      throw new Error(`Backoff active for ${key}. Retry in ${Math.ceil(waitMs / 1000)}s.`);
    }

    // Record request
    state.requests.push(Date.now());

    try {
      // Add timeout if not specified
      const timeoutMs = 15_000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        ...options,
        signal: options.signal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        this.recordFailure(state, key);
        throw new Error(`HTTP ${response.status} from ${key}`);
      }

      this.recordSuccess(state);
      return response;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.recordFailure(state, key);
        throw new Error(`Timeout fetching ${key}`);
      }
      this.recordFailure(state, key);
      throw error;
    }
  }

  /**
   * Get current state for a key (for debugging/UI).
   */
  getState(key: RateLimiterKey): RateLimiterState | undefined {
    return this.limiters.get(key);
  }

  /**
   * Reset state for a key (for testing).
   */
  reset(key: RateLimiterKey): void {
    this.limiters.delete(key);
  }

  /**
   * Reset all state (for testing).
   */
  resetAll(): void {
    this.limiters.clear();
  }
}

/** Singleton instance */
export const rateLimitedFetch = new RateLimitedFetchService();

/**
 * Convenience wrapper for verification API calls.
 * Uses the singleton rate limiter with appropriate keys.
 */
export async function fetchWithRateLimit(
  key: string,
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  return rateLimitedFetch.fetch(key, url, options);
}
