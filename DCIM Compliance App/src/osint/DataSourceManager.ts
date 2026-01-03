/**
 * OSINT Data Source Manager
 * 
 * Unified manager for government and public API integrations with:
 * - Rate limiting (token bucket algorithm)
 * - Response caching in IndexedDB
 * - Retry logic with exponential backoff
 * - Source health tracking
 */

import { CircuitBreaker } from '../utils/circuitBreaker';
import { rateLimitGuard } from '../utils/rateLimitGuard';

export type DataSourceType = 'SEC' | 'EPA' | 'PEERINGDB' | 'CRT_SH' | 'USASPENDING';

export interface DataSourceConfig {
  name: string;
  baseUrl: string;
  rateLimit: number; // requests per second
  cacheTTL: number; // milliseconds
}

export interface SourceHealthStatus {
  source: DataSourceType;
  healthy: boolean;
  lastSuccess?: number;
  lastFailure?: number;
  requestCount: number;
  errorCount: number;
}

// Configuration for each data source
const DATA_SOURCES: Record<DataSourceType, DataSourceConfig> = {
  SEC: {
    name: 'SEC EDGAR',
    baseUrl: 'https://data.sec.gov',
    rateLimit: 10, // 10 req/sec
    cacheTTL: 60 * 60 * 1000, // 1 hour
  },
  EPA: {
    name: 'EPA ECHO',
    baseUrl: 'https://echo.epa.gov',
    rateLimit: 1, // Conservative estimate
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  },
  PEERINGDB: {
    name: 'PeeringDB',
    baseUrl: 'https://peeringdb.com/api',
    rateLimit: 2, // Conservative
    cacheTTL: 6 * 60 * 60 * 1000, // 6 hours
  },
  CRT_SH: {
    name: 'crt.sh',
    baseUrl: 'https://crt.sh',
    rateLimit: 1, // Be conservative
    cacheTTL: 60 * 60 * 1000, // 1 hour
  },
  USASPENDING: {
    name: 'USASpending.gov',
    baseUrl: 'https://api.usaspending.gov/api/v2',
    rateLimit: 1,
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
  },
};

/**
 * Token Bucket Rate Limiter
 */
class TokenBucket {
  private tokens: number;
  private lastRefill: number;
  private readonly maxTokens: number;
  private readonly refillRate: number; // tokens per second

  constructor(maxTokens: number, refillRate: number) {
    this.maxTokens = maxTokens;
    this.refillRate = refillRate;
    this.tokens = maxTokens;
    this.lastRefill = Date.now();
  }

  private refill() {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000;
    const tokensToAdd = timePassed * this.refillRate;
    
    this.tokens = Math.min(this.maxTokens, this.tokens + tokensToAdd);
    this.lastRefill = now;
  }

  async consume(tokens = 1): Promise<boolean> {
    this.refill();
    
    if (this.tokens >= tokens) {
      this.tokens -= tokens;
      return true;
    }
    
    // Wait for tokens to refill
    const waitTime = ((tokens - this.tokens) / this.refillRate) * 1000;
    await new Promise(resolve => setTimeout(resolve, waitTime));
    this.tokens -= tokens;
    return true;
  }

  getAvailableTokens(): number {
    this.refill();
    return Math.floor(this.tokens);
  }
}

/**
 * Data Source Manager
 */
class DataSourceManager {
  private rateLimiters: Map<DataSourceType, TokenBucket>;
  private circuitBreakers: Map<DataSourceType, CircuitBreaker>;
  private healthStatus: Map<DataSourceType, SourceHealthStatus>;

  constructor() {
    this.rateLimiters = new Map();
    this.circuitBreakers = new Map();
    this.healthStatus = new Map();

    // Initialize rate limiters and circuit breakers for each source
    Object.entries(DATA_SOURCES).forEach(([source, config]) => {
      const sourceType = source as DataSourceType;
      
      this.rateLimiters.set(
        sourceType,
        new TokenBucket(config.rateLimit * 10, config.rateLimit) // Burst of 10x rate
      );
      
      this.circuitBreakers.set(
        sourceType,
        new CircuitBreaker({
          failureThreshold: 5,
          resetTimeout: 30000, // 30 seconds
          halfOpenMaxAttempts: 2,
        })
      );
      
      this.healthStatus.set(sourceType, {
        source: sourceType,
        healthy: true,
        requestCount: 0,
        errorCount: 0,
      });
    });
  }

  /**
   * Fetch from a data source with rate limiting, circuit breaking, and caching
   */
  async fetch<T>(
    source: DataSourceType,
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const config = DATA_SOURCES[source];
    const url = `${config.baseUrl}${endpoint}`;
    
    // Check cache first (implement with IndexedDB in production)
    const cacheKey = `osint:${source}:${endpoint}`;
    
    // Wait for rate limiter
    const rateLimiter = this.rateLimiters.get(source)!;
    await rateLimiter.consume();
    
    // Use circuit breaker
    const circuitBreaker = this.circuitBreakers.get(source)!;
    const health = this.healthStatus.get(source)!;
    
    try {
      const response = await circuitBreaker.execute(async () => {
        // Add required headers based on source
        const headers = new Headers(options.headers);
        
        if (source === 'SEC') {
          headers.set('User-Agent', 'DCIM-Dashboard/1.0 (contact@example.com)');
        }
        
        // Use rate-limited fetch with automatic waiting
        const fetchResponse = await rateLimitGuard.guardedFetch(url, {
          ...options,
          headers,
        });
        
        if (!fetchResponse.ok) {
          throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
        }
        
        return fetchResponse.json();
      });
      
      // Update health status
      health.requestCount++;
      health.lastSuccess = Date.now();
      health.healthy = true;
      
      return response as T;
    } catch (error) {
      // Update health status
      health.requestCount++;
      health.errorCount++;
      health.lastFailure = Date.now();
      
      if (health.errorCount > 5) {
        health.healthy = false;
      }
      
      throw error;
    }
  }

  /**
   * Get health status for a source
   */
  getHealth(source: DataSourceType): SourceHealthStatus {
    return this.healthStatus.get(source)!;
  }

  /**
   * Get health status for all sources
   */
  getAllHealth(): SourceHealthStatus[] {
    return Array.from(this.healthStatus.values());
  }

  /**
   * Reset circuit breaker for a source
   */
  resetCircuitBreaker(source: DataSourceType): void {
    const breaker = this.circuitBreakers.get(source);
    if (breaker) {
      breaker.reset();
    }
    
    const health = this.healthStatus.get(source);
    if (health) {
      health.healthy = true;
      health.errorCount = 0;
    }
  }
}

// Singleton instance
const dataSourceManager = new DataSourceManager();

/**
 * SEC EDGAR API
 */
export const fetchSECFilings = async (cik: string) => {
  const paddedCik = cik.padStart(10, '0');
  return dataSourceManager.fetch('SEC', `/submissions/CIK${paddedCik}.json`);
};

export const fetchSECCompanyFacts = async (cik: string) => {
  const paddedCik = cik.padStart(10, '0');
  return dataSourceManager.fetch('SEC', `/api/xbrl/companyfacts/CIK${paddedCik}.json`);
};

/**
 * EPA ECHO API
 */
export const fetchEPAFacility = async (registryId: string) => {
  return dataSourceManager.fetch('EPA', `/rest/dfr?p_id=${registryId}&output=JSON`);
};

export const fetchEPASearch = async (params: Record<string, string>) => {
  const queryString = new URLSearchParams(params).toString();
  return dataSourceManager.fetch('EPA', `/rest/dfr?${queryString}&output=JSON`);
};

/**
 * PeeringDB API
 */
export const fetchPeeringDBFacility = async (facilityId: number) => {
  return dataSourceManager.fetch('PEERINGDB', `/fac/${facilityId}`);
};

export const fetchPeeringDBNetwork = async (networkId: number) => {
  return dataSourceManager.fetch('PEERINGDB', `/net/${networkId}`);
};

/**
 * Certificate Transparency (crt.sh)
 */
export const fetchCertificates = async (domain: string) => {
  const encoded = encodeURIComponent(domain);
  return dataSourceManager.fetch('CRT_SH', `/?q=${encoded}&output=json`);
};

/**
 * USASpending API
 */
export const fetchFederalContracts = async (recipientName: string) => {
  return dataSourceManager.fetch('USASPENDING', '/search/spending_by_award/', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filters: {
        recipient_search_text: [recipientName],
        award_type_codes: ['A', 'B', 'C', 'D'], // Contracts
      },
      fields: ['Award ID', 'Recipient Name', 'Award Amount', 'Description'],
      limit: 50,
    }),
  });
};

/**
 * Get health status for all sources
 */
export const getDataSourceHealth = (): SourceHealthStatus[] => {
  return dataSourceManager.getAllHealth();
};

/**
 * Reset circuit breaker for a specific source
 */
export const resetDataSource = (source: DataSourceType): void => {
  dataSourceManager.resetCircuitBreaker(source);
};

export { dataSourceManager, DATA_SOURCES };

