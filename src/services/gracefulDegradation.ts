/**
 * Graceful Degradation Service
 * 
 * Implements the "fail gracefully" principle:
 * - Progressive feature disabling under stress
 * - Fallback UI states for failed components
 * - Service level management (full → reduced → minimal → offline)
 * 
 * "The system should degrade gracefully under load, providing
 * reduced but still useful service rather than complete failure."
 */

// ============================================================================
// TYPES
// ============================================================================

export type ServiceLevel = 'full' | 'reduced' | 'minimal' | 'offline';

export interface FeatureState {
  id: string;
  name: string;
  enabled: boolean;
  degraded: boolean;
  fallbackActive: boolean;
  priority: number; // 1-10, higher = more essential
  lastError?: Error;
  errorCount: number;
  lastHealthCheck?: Date;
}

export interface DegradationRule {
  feature: string;
  disableAt: ServiceLevel;
  fallbackComponent?: string;
  recoveryCondition: () => boolean;
}

interface SystemHealth {
  memoryUsage: number; // 0-1
  errorRate: number; // errors per minute
  latency: number; // average response time ms
  activeConnections: number;
  failedRequests: number;
}

// ============================================================================
// GRACEFUL DEGRADATION SERVICE
// ============================================================================

class GracefulDegradationService {
  private serviceLevel: ServiceLevel = 'full';
  private features: Map<string, FeatureState> = new Map();
  private rules: DegradationRule[] = [];
  private healthHistory: SystemHealth[] = [];
  private listeners: Set<(event: DegradationEvent) => void> = new Set();
  private monitorInterval?: ReturnType<typeof setInterval>;

  // Health thresholds for automatic degradation
  private thresholds = {
    memory: { reduced: 0.7, minimal: 0.85, offline: 0.95 },
    errorRate: { reduced: 5, minimal: 15, offline: 30 },
    latency: { reduced: 2000, minimal: 5000, offline: 10000 },
  };

  constructor() {
    this.initializeFeatures();
    this.initializeRules();
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  private initializeFeatures(): void {
    // Define all app features with priorities
    const featureDefinitions: Omit<FeatureState, 'enabled' | 'degraded' | 'fallbackActive' | 'errorCount'>[] = [
      { id: 'realtime-updates', name: 'Real-time Updates', priority: 3 },
      { id: 'animations', name: 'UI Animations', priority: 2 },
      { id: 'advanced-search', name: 'Advanced Search', priority: 5 },
      { id: 'data-visualizations', name: 'Data Visualizations', priority: 4 },
      { id: 'export-reports', name: 'Export Reports', priority: 6 },
      { id: 'api-scraping', name: 'API Scraping', priority: 7 },
      { id: 'pattern-detection', name: 'Pattern Detection', priority: 5 },
      { id: 'rlm-engine', name: 'RLM Query Engine', priority: 6 },
      { id: 'live-monitoring', name: 'Live Monitoring', priority: 4 },
      { id: 'collaborative-features', name: 'Collaborative Features', priority: 3 },
      { id: 'offline-cache', name: 'Offline Cache', priority: 8 },
      { id: 'core-data', name: 'Core Data Access', priority: 10 },
      { id: 'basic-navigation', name: 'Basic Navigation', priority: 10 },
      { id: 'error-reporting', name: 'Error Reporting', priority: 9 },
    ];

    featureDefinitions.forEach(def => {
      this.features.set(def.id, {
        ...def,
        enabled: true,
        degraded: false,
        fallbackActive: false,
        errorCount: 0,
      });
    });
  }

  private initializeRules(): void {
    this.rules = [
      // Non-essential features disabled first
      { feature: 'animations', disableAt: 'reduced', recoveryCondition: () => this.serviceLevel === 'full' },
      { feature: 'realtime-updates', disableAt: 'reduced', recoveryCondition: () => this.serviceLevel === 'full' },
      { feature: 'collaborative-features', disableAt: 'reduced', recoveryCondition: () => this.serviceLevel === 'full' },
      
      // Medium priority features
      { feature: 'data-visualizations', disableAt: 'minimal', recoveryCondition: () => this.serviceLevel !== 'minimal' && this.serviceLevel !== 'offline' },
      { feature: 'live-monitoring', disableAt: 'minimal', recoveryCondition: () => this.serviceLevel !== 'minimal' && this.serviceLevel !== 'offline' },
      { feature: 'pattern-detection', disableAt: 'minimal', recoveryCondition: () => this.serviceLevel !== 'minimal' && this.serviceLevel !== 'offline' },
      { feature: 'rlm-engine', disableAt: 'minimal', recoveryCondition: () => this.serviceLevel !== 'minimal' && this.serviceLevel !== 'offline' },
      
      // High priority features (only disabled in offline)
      { feature: 'api-scraping', disableAt: 'offline', recoveryCondition: () => this.serviceLevel !== 'offline' },
      { feature: 'advanced-search', disableAt: 'offline', recoveryCondition: () => this.serviceLevel !== 'offline' },
      { feature: 'export-reports', disableAt: 'offline', recoveryCondition: () => this.serviceLevel !== 'offline' },
    ];
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Start health monitoring
   */
  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }

    this.monitorInterval = setInterval(() => {
      this.checkHealth();
    }, intervalMs);

    console.log('🏥 Graceful degradation monitoring started');
  }

  /**
   * Stop health monitoring
   */
  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
  }

  /**
   * Get current service level
   */
  getServiceLevel(): ServiceLevel {
    return this.serviceLevel;
  }

  /**
   * Manually set service level
   */
  setServiceLevel(level: ServiceLevel): void {
    const oldLevel = this.serviceLevel;
    this.serviceLevel = level;
    this.applyDegradationRules();
    this.emit({ type: 'level_changed', oldLevel, newLevel: level });
    console.log(`📊 Service level: ${oldLevel} → ${level}`);
  }

  /**
   * Check if a feature is available
   */
  isFeatureAvailable(featureId: string): boolean {
    const feature = this.features.get(featureId);
    return feature ? feature.enabled && !feature.degraded : false;
  }

  /**
   * Get feature state
   */
  getFeatureState(featureId: string): FeatureState | undefined {
    return this.features.get(featureId);
  }

  /**
   * Get all feature states
   */
  getAllFeatures(): FeatureState[] {
    return Array.from(this.features.values());
  }

  /**
   * Report a feature error
   */
  reportFeatureError(featureId: string, error: Error): void {
    const feature = this.features.get(featureId);
    if (!feature) return;

    feature.errorCount++;
    feature.lastError = error;

    // Auto-degrade after too many errors
    if (feature.errorCount >= 3 && !feature.degraded) {
      this.degradeFeature(featureId);
    }

    this.emit({ type: 'feature_error', feature, error });
  }

  /**
   * Manually degrade a feature
   */
  degradeFeature(featureId: string): void {
    const feature = this.features.get(featureId);
    if (!feature) return;

    feature.degraded = true;
    feature.fallbackActive = true;
    
    this.emit({ type: 'feature_degraded', feature });
    console.log(`⚠️ Feature degraded: ${feature.name}`);
  }

  /**
   * Recover a feature
   */
  recoverFeature(featureId: string): void {
    const feature = this.features.get(featureId);
    if (!feature) return;

    feature.degraded = false;
    feature.fallbackActive = false;
    feature.errorCount = 0;
    feature.lastError = undefined;

    this.emit({ type: 'feature_recovered', feature });
    console.log(`✅ Feature recovered: ${feature.name}`);
  }

  /**
   * Get fallback component for a feature
   */
  getFallback(featureId: string): React.ComponentType | null {
    const fallbacks: Record<string, React.ComponentType> = {
      'data-visualizations': () => null, // Will be replaced with actual fallback
      'advanced-search': () => null,
      'rlm-engine': () => null,
    };

    return fallbacks[featureId] || null;
  }

  /**
   * Subscribe to degradation events
   */
  subscribe(callback: (event: DegradationEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get system health summary
   */
  getHealthSummary(): {
    level: ServiceLevel;
    health: SystemHealth;
    degradedFeatures: string[];
    availableFeatures: string[];
  } {
    const health = this.measureHealth();
    const degradedFeatures = Array.from(this.features.values())
      .filter(f => f.degraded)
      .map(f => f.name);
    const availableFeatures = Array.from(this.features.values())
      .filter(f => f.enabled && !f.degraded)
      .map(f => f.name);

    return {
      level: this.serviceLevel,
      health,
      degradedFeatures,
      availableFeatures,
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private checkHealth(): void {
    const health = this.measureHealth();
    this.healthHistory.push(health);
    
    // Keep only last 100 measurements
    if (this.healthHistory.length > 100) {
      this.healthHistory.shift();
    }

    // Determine appropriate service level
    const newLevel = this.calculateServiceLevel(health);
    
    if (newLevel !== this.serviceLevel) {
      this.setServiceLevel(newLevel);
    }

    // Try to recover degraded features
    this.attemptRecovery();
  }

  private measureHealth(): SystemHealth {
    // Memory usage (using performance API if available)
    let memoryUsage = 0;
    if ('memory' in performance) {
      const memory = (performance as unknown as { memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } }).memory;
      memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }

    // Calculate error rate from recent errors
    const recentErrors = Array.from(this.features.values())
      .reduce((sum, f) => sum + f.errorCount, 0);

    // Estimate latency from health history
    const avgLatency = this.healthHistory.length > 0
      ? this.healthHistory.slice(-10).reduce((sum, h) => sum + h.latency, 0) / Math.min(10, this.healthHistory.length)
      : 100;

    return {
      memoryUsage,
      errorRate: recentErrors,
      latency: avgLatency,
      activeConnections: 0, // Would need actual tracking
      failedRequests: recentErrors,
    };
  }

  private calculateServiceLevel(health: SystemHealth): ServiceLevel {
    // Check thresholds from most severe to least
    if (
      health.memoryUsage >= this.thresholds.memory.offline ||
      health.errorRate >= this.thresholds.errorRate.offline ||
      health.latency >= this.thresholds.latency.offline
    ) {
      return 'offline';
    }

    if (
      health.memoryUsage >= this.thresholds.memory.minimal ||
      health.errorRate >= this.thresholds.errorRate.minimal ||
      health.latency >= this.thresholds.latency.minimal
    ) {
      return 'minimal';
    }

    if (
      health.memoryUsage >= this.thresholds.memory.reduced ||
      health.errorRate >= this.thresholds.errorRate.reduced ||
      health.latency >= this.thresholds.latency.reduced
    ) {
      return 'reduced';
    }

    return 'full';
  }

  private applyDegradationRules(): void {
    const levelOrder: ServiceLevel[] = ['full', 'reduced', 'minimal', 'offline'];
    const currentIndex = levelOrder.indexOf(this.serviceLevel);

    for (const rule of this.rules) {
      const feature = this.features.get(rule.feature);
      if (!feature) continue;

      const ruleIndex = levelOrder.indexOf(rule.disableAt);
      
      if (currentIndex >= ruleIndex) {
        // Should be disabled
        if (feature.enabled) {
          feature.enabled = false;
          feature.fallbackActive = true;
          this.emit({ type: 'feature_disabled', feature });
        }
      } else {
        // Should be enabled if recovery condition is met
        if (!feature.enabled && rule.recoveryCondition()) {
          feature.enabled = true;
          feature.fallbackActive = false;
          this.emit({ type: 'feature_enabled', feature });
        }
      }
    }
  }

  private attemptRecovery(): void {
    for (const [featureId, feature] of this.features) {
      if (feature.degraded) {
        const rule = this.rules.find(r => r.feature === featureId);
        if (rule && rule.recoveryCondition()) {
          this.recoverFeature(featureId);
        }
      }
    }
  }

  private emit(event: DegradationEvent): void {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('Degradation event listener error:', e);
      }
    });
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

type DegradationEvent =
  | { type: 'level_changed'; oldLevel: ServiceLevel; newLevel: ServiceLevel }
  | { type: 'feature_degraded'; feature: FeatureState }
  | { type: 'feature_recovered'; feature: FeatureState }
  | { type: 'feature_disabled'; feature: FeatureState }
  | { type: 'feature_enabled'; feature: FeatureState }
  | { type: 'feature_error'; feature: FeatureState; error: Error };

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const degradationService = new GracefulDegradationService();

// Utility function for feature availability
export function isFeatureAvailable(featureId: string): boolean {
  return degradationService.isFeatureAvailable(featureId);
}

// HOC helper - use in a .tsx file with React.createElement
export function createDegradedComponent<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  featureId: string,
  FallbackComponent?: React.ComponentType<P>
): React.ComponentType<P> {
  const React = require('react');
  
  return function DegradedComponent(props: P) {
    const isAvail = degradationService.isFeatureAvailable(featureId);
    
    if (!isAvail && FallbackComponent) {
      return React.createElement(FallbackComponent, props);
    }
    
    if (!isAvail) {
      return null;
    }
    
    return React.createElement(WrappedComponent, props);
  };
}

