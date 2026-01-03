/**
 * Multi-Provider API Failover System
 * 
 * Ensures data availability by automatically switching to backup providers
 * when primary sources fail. Implements the "redundancy > single point of failure"
 * principle for ultimate resilience.
 * 
 * Part of Phase 2: API Resilience
 */

import { rateLimitGuard } from './rateLimitGuard';

export type DataCategory = 
  | 'company_info'      // SEC filings, corporate data
  | 'environmental'     // EPA compliance
  | 'network_data'      // PeeringDB, IXPs
  | 'certificates'      // SSL/TLS certificate transparency
  | 'government'        // USASpending, contracts
  | 'dns'               // DNS-over-HTTPS
  | 'geolocation';      // IP geolocation

export interface APIProvider {
  id: string;
  name: string;
  baseUrl: string;
  priority: number; // Lower = try first
  healthStatus: 'healthy' | 'degraded' | 'down';
  lastCheck: number;
  successRate: number; // 0-1
  avgResponseTime: number; // ms
}

export interface FailoverConfig {
  category: DataCategory;
  providers: APIProvider[];
  maxRetries: number;
  retryDelay: number;
  circuitBreakerThreshold: number; // Failures before marking as 'down'
}

class MultiProviderFailover {
  private configs: Map<DataCategory, FailoverConfig> = new Map();
  private failureCount: Map<string, number> = new Map();

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders() {
    // Company Information (SEC alternatives)
    this.configs.set('company_info', {
      category: 'company_info',
      maxRetries: 3,
      retryDelay: 2000,
      circuitBreakerThreshold: 5,
      providers: [
        {
          id: 'sec_edgar',
          name: 'SEC EDGAR',
          baseUrl: 'https://data.sec.gov',
          priority: 1,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 800
        },
        {
          id: 'opencorporates',
          name: 'OpenCorporates',
          baseUrl: 'https://api.opencorporates.com/v0.4',
          priority: 2,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 1200
        },
        {
          id: 'secapi',
          name: 'sec-api.io',
          baseUrl: 'https://api.sec-api.io',
          priority: 3,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 1500
        }
      ]
    });

    // Environmental Data
    this.configs.set('environmental', {
      category: 'environmental',
      maxRetries: 3,
      retryDelay: 2000,
      circuitBreakerThreshold: 5,
      providers: [
        {
          id: 'epa_echo',
          name: 'EPA ECHO',
          baseUrl: 'https://echo.epa.gov',
          priority: 1,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 1000
        },
        {
          id: 'epa_envirofacts',
          name: 'EPA Envirofacts',
          baseUrl: 'https://data.epa.gov/efservice',
          priority: 2,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 1500
        }
      ]
    });

    // Network Data (Peering)
    this.configs.set('network_data', {
      category: 'network_data',
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      providers: [
        {
          id: 'peeringdb',
          name: 'PeeringDB',
          baseUrl: 'https://peeringdb.com/api',
          priority: 1,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 600
        },
        {
          id: 'bgpview',
          name: 'BGP.tools',
          baseUrl: 'https://bgp.tools/api',
          priority: 2,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 800
        },
        {
          id: 'ripestat',
          name: 'RIPEstat',
          baseUrl: 'https://stat.ripe.net/data',
          priority: 3,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 900
        }
      ]
    });

    // Certificate Transparency
    this.configs.set('certificates', {
      category: 'certificates',
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 5,
      providers: [
        {
          id: 'crt_sh',
          name: 'crt.sh',
          baseUrl: 'https://crt.sh',
          priority: 1,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 700
        },
        {
          id: 'censys',
          name: 'Censys',
          baseUrl: 'https://search.censys.io/api/v2',
          priority: 2,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 1000
        },
        {
          id: 'certspotter',
          name: 'Cert Spotter',
          baseUrl: 'https://api.certspotter.com/v1',
          priority: 3,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 800
        }
      ]
    });

    // DNS over HTTPS
    this.configs.set('dns', {
      category: 'dns',
      maxRetries: 3,
      retryDelay: 500,
      circuitBreakerThreshold: 10,
      providers: [
        {
          id: 'cloudflare_doh',
          name: 'Cloudflare DoH',
          baseUrl: 'https://cloudflare-dns.com/dns-query',
          priority: 1,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 50
        },
        {
          id: 'google_doh',
          name: 'Google DoH',
          baseUrl: 'https://dns.google/resolve',
          priority: 2,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 80
        },
        {
          id: 'quad9_doh',
          name: 'Quad9 DoH',
          baseUrl: 'https://dns.quad9.net/dns-query',
          priority: 3,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 100
        }
      ]
    });

    // Government Data
    this.configs.set('government', {
      category: 'government',
      maxRetries: 3,
      retryDelay: 2000,
      circuitBreakerThreshold: 5,
      providers: [
        {
          id: 'usaspending',
          name: 'USASpending',
          baseUrl: 'https://api.usaspending.gov/api/v2',
          priority: 1,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 1200
        },
        {
          id: 'sam_gov',
          name: 'SAM.gov',
          baseUrl: 'https://api.sam.gov',
          priority: 2,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 1500
        }
      ]
    });

    // IP Geolocation
    this.configs.set('geolocation', {
      category: 'geolocation',
      maxRetries: 3,
      retryDelay: 1000,
      circuitBreakerThreshold: 10,
      providers: [
        {
          id: 'ipapi',
          name: 'ip-api.com',
          baseUrl: 'http://ip-api.com/json',
          priority: 1,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 300
        },
        {
          id: 'ipinfo',
          name: 'ipinfo.io',
          baseUrl: 'https://ipinfo.io',
          priority: 2,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 400
        },
        {
          id: 'geojs',
          name: 'GeoJS',
          baseUrl: 'https://get.geojs.io/v1/ip',
          priority: 3,
          healthStatus: 'healthy',
          lastCheck: Date.now(),
          successRate: 1.0,
          avgResponseTime: 500
        }
      ]
    });
  }

  /**
   * Fetch with automatic failover to backup providers
   */
  async fetchWithFailover<T>(
    category: DataCategory,
    endpoint: string,
    options?: RequestInit,
    transform?: (response: Response, providerId: string) => Promise<T>
  ): Promise<T> {
    const config = this.configs.get(category);
    if (!config) {
      throw new Error(`No failover config for category: ${category}`);
    }

    // Sort providers by priority and health
    const sortedProviders = [...config.providers].sort((a, b) => {
      // Prefer healthy over degraded over down
      const healthScore = { healthy: 3, degraded: 2, down: 1 };
      if (healthScore[a.healthStatus] !== healthScore[b.healthStatus]) {
        return healthScore[b.healthStatus] - healthScore[a.healthStatus];
      }
      // Then by priority
      if (a.priority !== b.priority) {
        return a.priority - b.priority;
      }
      // Then by success rate
      return b.successRate - a.successRate;
    });

    let lastError: Error | null = null;

    // Try each provider in order
    for (const provider of sortedProviders) {
      // Skip if provider is down
      if (provider.healthStatus === 'down') {
        console.warn(`⏭️  Skipping ${provider.name} (marked as down)`);
        continue;
      }

      try {
        console.log(`🔄 Trying ${provider.name} (priority ${provider.priority})...`);
        
        const startTime = Date.now();
        const url = `${provider.baseUrl}${endpoint}`;
        
        // Use rate-limited fetch
        const response = await rateLimitGuard.guardedFetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        // Update metrics
        const responseTime = Date.now() - startTime;
        this.updateProviderMetrics(provider.id, true, responseTime);

        // Transform response if provided, otherwise parse JSON
        const data = transform 
          ? await transform(response, provider.id)
          : await response.json() as T;

        console.log(`✅ Success with ${provider.name} (${responseTime}ms)`);
        return data;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`❌ ${provider.name} failed:`, lastError.message);
        
        // Update metrics
        this.updateProviderMetrics(provider.id, false, 0);
        
        // Check if we should mark provider as down
        this.checkCircuitBreaker(provider.id, config.circuitBreakerThreshold);
        
        // Wait before trying next provider
        if (sortedProviders.indexOf(provider) < sortedProviders.length - 1) {
          await this.sleep(config.retryDelay);
        }
      }
    }

    // All providers failed
    throw new Error(
      `All providers failed for ${category}. Last error: ${lastError?.message || 'Unknown'}`
    );
  }

  /**
   * Update provider metrics after request
   */
  private updateProviderMetrics(
    providerId: string,
    success: boolean,
    responseTime: number
  ): void {
    // Find provider across all categories
    for (const config of this.configs.values()) {
      const provider = config.providers.find(p => p.id === providerId);
      if (provider) {
        provider.lastCheck = Date.now();
        
        // Update success rate (exponential moving average)
        const alpha = 0.1; // Smoothing factor
        provider.successRate = success
          ? provider.successRate * (1 - alpha) + alpha
          : provider.successRate * (1 - alpha);
        
        // Update average response time
        if (success && responseTime > 0) {
          provider.avgResponseTime = 
            provider.avgResponseTime * 0.9 + responseTime * 0.1;
        }
        
        // Update health status based on success rate
        if (provider.successRate > 0.9) {
          provider.healthStatus = 'healthy';
        } else if (provider.successRate > 0.5) {
          provider.healthStatus = 'degraded';
        }
        // Don't automatically mark as 'healthy' - circuit breaker handles 'down'
        
        break;
      }
    }
  }

  /**
   * Check if provider should be marked as down (circuit breaker)
   */
  private checkCircuitBreaker(providerId: string, threshold: number): void {
    const currentCount = this.failureCount.get(providerId) || 0;
    const newCount = currentCount + 1;
    this.failureCount.set(providerId, newCount);

    if (newCount >= threshold) {
      // Mark provider as down
      for (const config of this.configs.values()) {
        const provider = config.providers.find(p => p.id === providerId);
        if (provider) {
          provider.healthStatus = 'down';
          console.error(
            `🔴 ${provider.name} marked as DOWN after ${newCount} consecutive failures`
          );
          
          // Schedule automatic recovery check in 5 minutes
          setTimeout(() => this.attemptRecovery(providerId), 5 * 60 * 1000);
          break;
        }
      }
    }
  }

  /**
   * Attempt to recover a downed provider
   */
  private async attemptRecovery(providerId: string): Promise<void> {
    console.log(`🔄 Attempting recovery for ${providerId}...`);
    
    // Reset failure count
    this.failureCount.set(providerId, 0);
    
    // Mark as degraded (not healthy yet)
    for (const config of this.configs.values()) {
      const provider = config.providers.find(p => p.id === providerId);
      if (provider) {
        provider.healthStatus = 'degraded';
        console.log(`🟡 ${provider.name} marked as DEGRADED - will test on next request`);
        break;
      }
    }
  }

  /**
   * Get all provider health statuses
   */
  getProviderHealth(): Record<DataCategory, APIProvider[]> {
    const health: Record<string, APIProvider[]> = {};
    
    for (const [category, config] of this.configs.entries()) {
      health[category] = config.providers.map(p => ({ ...p }));
    }
    
    return health as Record<DataCategory, APIProvider[]>;
  }

  /**
   * Manually reset a provider's health
   */
  resetProvider(providerId: string): void {
    this.failureCount.delete(providerId);
    
    for (const config of this.configs.values()) {
      const provider = config.providers.find(p => p.id === providerId);
      if (provider) {
        provider.healthStatus = 'healthy';
        provider.successRate = 1.0;
        console.log(`✅ ${provider.name} manually reset to healthy`);
        break;
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Singleton instance
export const multiProviderFailover = new MultiProviderFailover();

// Convenience functions
export async function fetchWithFailover<T>(
  category: DataCategory,
  endpoint: string,
  options?: RequestInit,
  transform?: (response: Response, providerId: string) => Promise<T>
): Promise<T> {
  return multiProviderFailover.fetchWithFailover(category, endpoint, options, transform);
}

export function getProviderHealth() {
  return multiProviderFailover.getProviderHealth();
}

export function resetProvider(providerId: string) {
  return multiProviderFailover.resetProvider(providerId);
}

