/**
 * API Rate Limit Guard
 * 
 * Proactive rate limit enforcement BEFORE making API calls
 * Prevents 429 errors and API bans through predictive throttling
 * 
 * Part of Phase 1b: Critical Safeguards
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  name: string;
}

interface RequestRecord {
  timestamp: number;
  endpoint: string;
}

class RateLimitGuard {
  private requests: Map<string, RequestRecord[]> = new Map();
  private configs: Map<string, RateLimitConfig> = new Map();

  constructor() {
    // Pre-configure known API rate limits
    this.configs.set('sec.gov', {
      name: 'SEC EDGAR',
      maxRequests: 10,
      windowMs: 1000 // 10 requests per second
    });

    this.configs.set('epa.gov', {
      name: 'EPA ECHO',
      maxRequests: 60,
      windowMs: 60000 // 60 requests per minute
    });

    this.configs.set('peeringdb.com', {
      name: 'PeeringDB',
      maxRequests: 100,
      windowMs: 60000 // 100 requests per minute (generous estimate)
    });

    this.configs.set('crt.sh', {
      name: 'Certificate Transparency',
      maxRequests: 20,
      windowMs: 60000 // 20 requests per minute (conservative)
    });

    this.configs.set('usaspending.gov', {
      name: 'USASpending',
      maxRequests: 100,
      windowMs: 60000 // 100 requests per minute
    });

    this.configs.set('ripe.net', {
      name: 'RIPEstat',
      maxRequests: 200,
      windowMs: 60000 // 200 requests per minute
    });

    this.configs.set('cloudflare.com', {
      name: 'Cloudflare DNS',
      maxRequests: 600,
      windowMs: 60000 // ~10 per second
    });
  }

  /**
   * Check if request is allowed under rate limits
   * Returns null if allowed, or milliseconds to wait if rate limited
   */
  checkLimit(url: string): number | null {
    const domain = this.extractDomain(url);
    const config = this.configs.get(domain);

    if (!config) {
      // Unknown API - allow but log warning
      console.warn(`⚠️ Unknown API domain: ${domain} - no rate limit configured`);
      return null;
    }

    // Get request history for this domain
    const history = this.requests.get(domain) || [];
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Clean old requests outside the time window
    const recentRequests = history.filter(req => req.timestamp > windowStart);

    // Check if we're at the limit
    if (recentRequests.length >= config.maxRequests) {
      // Calculate how long until the oldest request expires
      const oldestRequest = recentRequests[0];
      const waitTime = oldestRequest.timestamp + config.windowMs - now;
      
      console.warn(
        `🚦 Rate limit reached for ${config.name}`,
        `(${recentRequests.length}/${config.maxRequests} in ${config.windowMs}ms)`,
        `Wait ${Math.ceil(waitTime / 1000)}s`
      );
      
      return waitTime;
    }

    // Record this request
    recentRequests.push({ timestamp: now, endpoint: url });
    this.requests.set(domain, recentRequests);

    // Log remaining quota
    const remaining = config.maxRequests - recentRequests.length;
    if (remaining <= 2) {
      console.warn(
        `⚠️ ${config.name} rate limit nearly exhausted:`,
        `${remaining}/${config.maxRequests} requests remaining`
      );
    }

    return null; // Allowed
  }

  /**
   * Wrap a fetch call with rate limit checking
   * Automatically waits if rate limited
   */
  async guardedFetch(url: string, options?: RequestInit): Promise<Response> {
    const waitTime = this.checkLimit(url);

    if (waitTime && waitTime > 0) {
      console.log(`⏳ Waiting ${Math.ceil(waitTime / 1000)}s for rate limit...`);
      await this.sleep(waitTime + 100); // Add 100ms buffer
    }

    try {
      const response = await fetch(url, options);

      // Check for rate limit response codes
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        const waitSeconds = retryAfter ? parseInt(retryAfter) : 60;
        
        console.error(
          `❌ Rate limited by server (429)`,
          `Retry after ${waitSeconds}s`
        );

        // Update our local rate limit config to be more conservative
        this.adjustRateLimit(url, 0.8); // Reduce by 20%

        throw new Error(
          `Rate limited: retry after ${waitSeconds}s`
        );
      }

      return response;
    } catch (error) {
      console.error(`❌ Guarded fetch failed for ${url}:`, error);
      throw error;
    }
  }

  /**
   * Batch multiple requests with automatic rate limiting
   * Returns array of responses in same order as URLs
   */
  async batchFetch(
    urls: string[],
    options?: RequestInit
  ): Promise<Response[]> {
    const results: Response[] = [];

    for (const url of urls) {
      const response = await this.guardedFetch(url, options);
      results.push(response);
    }

    return results;
  }

  /**
   * Get current rate limit status for a domain
   */
  getStatus(domain: string): {
    name: string;
    used: number;
    limit: number;
    remaining: number;
    resetIn: number;
  } | null {
    const config = this.configs.get(domain);
    if (!config) return null;

    const history = this.requests.get(domain) || [];
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const recentRequests = history.filter(req => req.timestamp > windowStart);

    const used = recentRequests.length;
    const remaining = config.maxRequests - used;
    const resetIn = recentRequests.length > 0
      ? Math.max(0, recentRequests[0].timestamp + config.windowMs - now)
      : 0;

    return {
      name: config.name,
      used,
      limit: config.maxRequests,
      remaining,
      resetIn
    };
  }

  /**
   * Get status for all configured APIs
   */
  getAllStatus(): Record<string, ReturnType<typeof this.getStatus>> {
    const status: Record<string, ReturnType<typeof this.getStatus>> = {};
    
    for (const [domain] of this.configs) {
      status[domain] = this.getStatus(domain);
    }

    return status;
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      // Extract second-level domain (e.g., 'sec.gov' from 'data.sec.gov')
      const parts = urlObj.hostname.split('.');
      if (parts.length >= 2) {
        return parts.slice(-2).join('.');
      }
      return urlObj.hostname;
    } catch {
      return 'unknown';
    }
  }

  private adjustRateLimit(url: string, factor: number): void {
    const domain = this.extractDomain(url);
    const config = this.configs.get(domain);
    
    if (config) {
      config.maxRequests = Math.floor(config.maxRequests * factor);
      console.warn(
        `⚙️ Adjusted rate limit for ${config.name}:`,
        `${config.maxRequests} requests per ${config.windowMs}ms`
      );
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all rate limit history (useful for testing)
   */
  reset(): void {
    this.requests.clear();
    console.log('✅ Rate limit history cleared');
  }
}

// Singleton instance
export const rateLimitGuard = new RateLimitGuard();

// Convenience function for one-off requests
export async function guardedFetch(
  url: string,
  options?: RequestInit
): Promise<Response> {
  return rateLimitGuard.guardedFetch(url, options);
}

// Export type for external use
export type { RateLimitConfig };

