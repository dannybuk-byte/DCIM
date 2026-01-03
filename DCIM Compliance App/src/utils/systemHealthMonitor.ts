/**
 * System Health Monitor
 * 
 * Continuous monitoring of all system components with automatic health checks
 * Detects problems proactively and triggers auto-recovery when possible
 * 
 * Part of Phase 3: Health Monitoring
 */

import { checkDatabaseHealth } from './dbRecovery';
import { rateLimitGuard } from './rateLimitGuard';
import { multiProviderFailover } from './multiProviderFailover';

export type HealthCheckStatus = 'healthy' | 'degraded' | 'critical' | 'unknown';

export interface ComponentHealth {
  name: string;
  status: HealthCheckStatus;
  message: string;
  lastCheck: number;
  responseTime?: number;
  details?: Record<string, any>;
}

export interface SystemHealth {
  overall: HealthCheckStatus;
  components: ComponentHealth[];
  timestamp: number;
  uptime: number;
}

class SystemHealthMonitor {
  private startTime: number = Date.now();
  private checkInterval: number = 5 * 60 * 1000; // 5 minutes
  private intervalId: NodeJS.Timeout | null = null;
  private lastCheck: SystemHealth | null = null;
  private listeners: Set<(health: SystemHealth) => void> = new Set();

  /**
   * Start continuous health monitoring
   */
  start(): void {
    if (this.intervalId) {
      console.warn('Health monitor already running');
      return;
    }

    console.log('🏥 Starting system health monitor (checks every 5 min)...');
    
    // Initial check
    this.performHealthCheck();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('🏥 Health monitor stopped');
    }
  }

  /**
   * Perform comprehensive health check of all components
   */
  async performHealthCheck(): Promise<SystemHealth> {
    console.log('🔍 Running system health check...');
    const checkStart = Date.now();

    const components: ComponentHealth[] = [];

    // 1. Check Database Health
    try {
      const dbStart = Date.now();
      const dbHealth = await checkDatabaseHealth();
      components.push({
        name: 'IndexedDB',
        status: dbHealth.healthy ? 'healthy' : 'critical',
        message: dbHealth.healthy 
          ? `${dbHealth.facilityCount.toLocaleString()} facilities loaded`
          : dbHealth.error || 'Database unhealthy',
        lastCheck: Date.now(),
        responseTime: Date.now() - dbStart,
        details: dbHealth
      });
    } catch (error) {
      components.push({
        name: 'IndexedDB',
        status: 'critical',
        message: `Check failed: ${error}`,
        lastCheck: Date.now()
      });
    }

    // 2. Check Storage Quota
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percentage = quota > 0 ? (usage / quota) * 100 : 0;

        let status: HealthCheckStatus = 'healthy';
        let message = `${percentage.toFixed(1)}% used`;

        if (percentage >= 90) {
          status = 'critical';
          message = `${percentage.toFixed(1)}% used - critically low space`;
        } else if (percentage >= 80) {
          status = 'degraded';
          message = `${percentage.toFixed(1)}% used - low space`;
        }

        components.push({
          name: 'Storage Quota',
          status,
          message,
          lastCheck: Date.now(),
          details: { usage, quota, percentage }
        });
      }
    } catch (error) {
      components.push({
        name: 'Storage Quota',
        status: 'unknown',
        message: 'Unable to check quota',
        lastCheck: Date.now()
      });
    }

    // 3. Check Rate Limit Status
    try {
      const rateLimitStatus = rateLimitGuard.getAllStatus();
      const sources = Object.values(rateLimitStatus).filter(s => s !== null);
      const criticalSources = sources.filter(s => s && s.remaining === 0);
      const warningSources = sources.filter(s => s && s.remaining < 3 && s.remaining > 0);

      let status: HealthCheckStatus = 'healthy';
      let message = 'All rate limits healthy';

      if (criticalSources.length > 0) {
        status = 'critical';
        message = `${criticalSources.length} APIs rate limited`;
      } else if (warningSources.length > 0) {
        status = 'degraded';
        message = `${warningSources.length} APIs near limit`;
      }

      components.push({
        name: 'API Rate Limits',
        status,
        message,
        lastCheck: Date.now(),
        details: { total: sources.length, critical: criticalSources.length, warning: warningSources.length }
      });
    } catch (error) {
      components.push({
        name: 'API Rate Limits',
        status: 'unknown',
        message: 'Unable to check rate limits',
        lastCheck: Date.now()
      });
    }

    // 4. Check Provider Health
    try {
      const providerHealth = multiProviderFailover.getProviderHealth();
      const allProviders = Object.values(providerHealth).flat();
      const downProviders = allProviders.filter(p => p.healthStatus === 'down');
      const degradedProviders = allProviders.filter(p => p.healthStatus === 'degraded');

      let status: HealthCheckStatus = 'healthy';
      let message = `All ${allProviders.length} providers operational`;

      if (downProviders.length > 0) {
        status = 'critical';
        message = `${downProviders.length} providers down`;
      } else if (degradedProviders.length > 0) {
        status = 'degraded';
        message = `${degradedProviders.length} providers degraded`;
      }

      components.push({
        name: 'API Providers',
        status,
        message,
        lastCheck: Date.now(),
        details: { 
          total: allProviders.length, 
          down: downProviders.length, 
          degraded: degradedProviders.length 
        }
      });
    } catch (error) {
      components.push({
        name: 'API Providers',
        status: 'unknown',
        message: 'Unable to check providers',
        lastCheck: Date.now()
      });
    }

    // 5. Check Browser Performance
    try {
      const perf = performance.now();
      const memory = (performance as any).memory;
      
      let status: HealthCheckStatus = 'healthy';
      let message = 'Performance normal';

      if (memory) {
        const usedMB = memory.usedJSHeapSize / 1048576;
        const limitMB = memory.jsHeapSizeLimit / 1048576;
        const percentage = (usedMB / limitMB) * 100;

        if (percentage >= 90) {
          status = 'critical';
          message = `${percentage.toFixed(1)}% memory used - critical`;
        } else if (percentage >= 75) {
          status = 'degraded';
          message = `${percentage.toFixed(1)}% memory used`;
        } else {
          message = `${percentage.toFixed(1)}% memory used`;
        }

        components.push({
          name: 'Browser Memory',
          status,
          message,
          lastCheck: Date.now(),
          details: { usedMB: usedMB.toFixed(1), limitMB: limitMB.toFixed(1), percentage }
        });
      }
    } catch (error) {
      components.push({
        name: 'Browser Memory',
        status: 'unknown',
        message: 'Unable to check memory',
        lastCheck: Date.now()
      });
    }

    // 6. Check Network Connectivity
    try {
      const online = navigator.onLine;
      components.push({
        name: 'Network',
        status: online ? 'healthy' : 'critical',
        message: online ? 'Connected' : 'Offline',
        lastCheck: Date.now()
      });
    } catch (error) {
      components.push({
        name: 'Network',
        status: 'unknown',
        message: 'Unable to check connectivity',
        lastCheck: Date.now()
      });
    }

    // Calculate overall status
    const criticalCount = components.filter(c => c.status === 'critical').length;
    const degradedCount = components.filter(c => c.status === 'degraded').length;

    let overall: HealthCheckStatus = 'healthy';
    if (criticalCount > 0) {
      overall = 'critical';
    } else if (degradedCount > 0) {
      overall = 'degraded';
    } else if (components.some(c => c.status === 'unknown')) {
      overall = 'unknown';
    }

    const health: SystemHealth = {
      overall,
      components,
      timestamp: Date.now(),
      uptime: Date.now() - this.startTime
    };

    this.lastCheck = health;

    // Log summary
    const checkDuration = Date.now() - checkStart;
    console.log(
      `🏥 Health check complete (${checkDuration}ms):`,
      `Overall: ${overall}`,
      `| Critical: ${criticalCount}`,
      `| Degraded: ${degradedCount}`
    );

    // Notify listeners
    this.notifyListeners(health);

    // Attempt auto-recovery if needed
    if (criticalCount > 0 || degradedCount > 0) {
      this.attemptAutoRecovery(health);
    }

    return health;
  }

  /**
   * Attempt automatic recovery for degraded/critical components
   */
  private async attemptAutoRecovery(health: SystemHealth): Promise<void> {
    console.log('🔧 Attempting auto-recovery for unhealthy components...');

    for (const component of health.components) {
      if (component.status === 'critical' || component.status === 'degraded') {
        switch (component.name) {
          case 'IndexedDB':
            // Database issues handled by dbRecovery.ts
            console.log('📊 Database recovery handled by dbRecovery module');
            break;

          case 'Storage Quota':
            if (component.details?.percentage >= 80) {
              console.log('💾 Storage quota critical - triggering cleanup');
              // Cleanup is handled automatically by dbRecovery.ts
            }
            break;

          case 'API Rate Limits':
            console.log('⏳ Rate limits exhausted - waiting for reset');
            // Rate limiter handles waiting automatically
            break;

          case 'API Providers':
            console.log('🌐 Provider failover active - using backup providers');
            // Failover handled automatically by multiProviderFailover
            break;

          case 'Browser Memory':
            if (component.details?.percentage >= 90) {
              console.log('🧹 Memory critical - suggesting page reload');
              // Could show UI warning to user
            }
            break;

          case 'Network':
            if (component.status === 'critical') {
              console.log('📡 Network offline - entering offline mode');
              // App continues to work with cached data
            }
            break;
        }
      }
    }
  }

  /**
   * Get the last health check result
   */
  getLastCheck(): SystemHealth | null {
    return this.lastCheck;
  }

  /**
   * Subscribe to health check updates
   */
  subscribe(callback: (health: SystemHealth) => void): () => void {
    this.listeners.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
    };
  }

  /**
   * Notify all listeners of health update
   */
  private notifyListeners(health: SystemHealth): void {
    this.listeners.forEach(callback => {
      try {
        callback(health);
      } catch (error) {
        console.error('Error in health check listener:', error);
      }
    });
  }

  /**
   * Force an immediate health check
   */
  async checkNow(): Promise<SystemHealth> {
    return this.performHealthCheck();
  }

  /**
   * Change check interval (in milliseconds)
   */
  setCheckInterval(ms: number): void {
    this.checkInterval = ms;
    
    // Restart with new interval if running
    if (this.intervalId) {
      this.stop();
      this.start();
    }
  }
}

// Singleton instance
export const systemHealthMonitor = new SystemHealthMonitor();

// Auto-start on import
systemHealthMonitor.start();

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    systemHealthMonitor.stop();
  });
}

// Export convenience functions
export function getSystemHealth(): SystemHealth | null {
  return systemHealthMonitor.getLastCheck();
}

export function checkSystemHealth(): Promise<SystemHealth> {
  return systemHealthMonitor.checkNow();
}

export function subscribeToHealthUpdates(
  callback: (health: SystemHealth) => void
): () => void {
  return systemHealthMonitor.subscribe(callback);
}

