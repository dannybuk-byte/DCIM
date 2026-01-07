/**
 * Circuit Breaker Pattern for Resilient Error Handling
 * 
 * Prevents cascading failures by tracking error rates and temporarily
 * disabling failing features when thresholds are exceeded.
 */

export interface CircuitBreakerOptions {
  failureThreshold: number; // Number of failures before opening
  resetTimeout: number; // Milliseconds before attempting reset
  halfOpenMaxAttempts?: number; // Max attempts in half-open state
}

export type CircuitState = 'closed' | 'open' | 'half-open';

export class CircuitBreaker {
  private state: CircuitState = 'closed';
  private failures = 0;
  private lastFailureTime = 0;
  private halfOpenAttempts = 0;
  private readonly options: Required<CircuitBreakerOptions>;

  constructor(options: CircuitBreakerOptions) {
    this.options = {
      failureThreshold: options.failureThreshold,
      resetTimeout: options.resetTimeout,
      halfOpenMaxAttempts: options.halfOpenMaxAttempts || 3
    };
  }

  async execute<T>(fn: () => Promise<T> | T, fallback?: () => T): Promise<T> {
    if (this.state === 'open') {
      // Check if we should transition to half-open
      const timeSinceLastFailure = Date.now() - this.lastFailureTime;
      if (timeSinceLastFailure >= this.options.resetTimeout) {
        this.state = 'half-open';
        this.halfOpenAttempts = 0;
      } else {
        // Circuit is open - use fallback or throw
        if (fallback) {
          console.warn('[CircuitBreaker] Circuit open, using fallback');
          return fallback();
        }
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback) {
        console.warn('[CircuitBreaker] Operation failed, using fallback:', error);
        return fallback();
      }
      throw error;
    }
  }

  /**
   * Backwards-compatible alias used by older API wrapper code.
   */
  async call<T>(fn: () => Promise<T> | T, fallback?: () => T): Promise<T> {
    return this.execute(fn, fallback);
  }

  private onSuccess() {
    if (this.state === 'half-open') {
      // Success in half-open - close the circuit
      this.state = 'closed';
      this.failures = 0;
      this.halfOpenAttempts = 0;
    } else {
      // Reset failure count on success
      this.failures = 0;
    }
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.state === 'half-open') {
      this.halfOpenAttempts++;
      if (this.halfOpenAttempts >= this.options.halfOpenMaxAttempts) {
        // Too many failures in half-open - open the circuit
        this.state = 'open';
        console.warn('[CircuitBreaker] Circuit opened after half-open failures');
      }
    } else if (this.failures >= this.options.failureThreshold) {
      // Too many failures - open the circuit
      this.state = 'open';
      console.warn('[CircuitBreaker] Circuit opened after', this.failures, 'failures');
    }
  }

  getState(): CircuitState {
    return this.state;
  }

  reset() {
    this.state = 'closed';
    this.failures = 0;
    this.halfOpenAttempts = 0;
    this.lastFailureTime = 0;
  }
}

// Global circuit breakers for different features
export const circuitBreakers = {
  nlpSearch: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    halfOpenMaxAttempts: 2
  }),
  mapZoom: new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 15000, // 15 seconds
    halfOpenMaxAttempts: 2
  }),
  tileLoading: new CircuitBreaker({
    failureThreshold: 10,
    resetTimeout: 60000, // 1 minute
    halfOpenMaxAttempts: 3
  }),
  claudeAPI: new CircuitBreaker({
    failureThreshold: 3,
    resetTimeout: 60000, // 1 minute
    halfOpenMaxAttempts: 2
  }),
  epaAPI: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    halfOpenMaxAttempts: 2
  }),
  secAPI: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    halfOpenMaxAttempts: 2
  }),
  censusAPI: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    halfOpenMaxAttempts: 2
  }),
  blsAPI: new CircuitBreaker({
    failureThreshold: 5,
    resetTimeout: 30000, // 30 seconds
    halfOpenMaxAttempts: 2
  })
};

// Named exports for convenience/compatibility with older API wrapper code.
export const epaCircuitBreaker = circuitBreakers.epaAPI;
export const secCircuitBreaker = circuitBreakers.secAPI;
export const censusCircuitBreaker = circuitBreakers.censusAPI;
export const blsCircuitBreaker = circuitBreakers.blsAPI;

/**
 * Higher-order function that wraps an async function with circuit breaker protection.
 * Returns a new function that behaves the same but is protected by a circuit breaker.
 */
export function circuitBreaker<T extends unknown[], R>(
  fn: (...args: T) => Promise<R>,
  options: CircuitBreakerOptions
): (...args: T) => Promise<R> {
  const breaker = new CircuitBreaker(options);
  return async (...args: T): Promise<R> => {
    return breaker.execute(() => fn(...args));
  };
}
