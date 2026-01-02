/**
 * Rate Limiter
 * Prevents overwhelming APIs with too many requests
 */

export class RateLimiter {
  private requests: number[] = [];

  constructor(
    private maxRequests: number,
    private windowMs: number
  ) {}

  /**
   * Check if request is allowed, wait if necessary
   */
  async check(): Promise<void> {
    const now = Date.now();
    
    // Remove old requests outside the window
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    
    // If at limit, wait until oldest request expires
    if (this.requests.length >= this.maxRequests) {
      const oldest = this.requests[0];
      const waitTime = this.windowMs - (now - oldest) + 100; // Add 100ms buffer
      
      if (waitTime > 0) {
        await new Promise(resolve => setTimeout(resolve, waitTime));
        return this.check(); // Recursive check after waiting
      }
    }
    
    // Record this request
    this.requests.push(Date.now());
  }

  /**
   * Backwards-compatible alias used by older API wrapper code.
   */
  async acquire(): Promise<void> {
    return this.check();
  }

  /**
   * Get current request count in window
   */
  getCurrentCount(): number {
    const now = Date.now();
    this.requests = this.requests.filter(t => now - t < this.windowMs);
    return this.requests.length;
  }

  /**
   * Reset the limiter
   */
  reset(): void {
    this.requests = [];
  }
}

// Pre-configured rate limiters for different APIs
export const rateLimiters = {
  claudeAPI: new RateLimiter(10, 60000), // 10 requests per minute
  epaAPI: new RateLimiter(5, 60000), // 5 requests per minute
  secAPI: new RateLimiter(10, 60000), // 10 requests per minute
  censusAPI: new RateLimiter(10, 60000), // 10 requests per minute
  blsAPI: new RateLimiter(5, 60000), // 5 requests per minute
  general: new RateLimiter(20, 60000) // 20 requests per minute for general use
};

// Named exports for convenience/compatibility with older API wrapper code.
export const epaRateLimiter = rateLimiters.epaAPI;
export const secRateLimiter = rateLimiters.secAPI;
export const censusRateLimiter = rateLimiters.censusAPI;
export const blsRateLimiter = rateLimiters.blsAPI;
