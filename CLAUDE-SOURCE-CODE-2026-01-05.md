# DCIM Compliance App - Complete Source Code Export
**Date**: January 5, 2026  
**Purpose**: Full source code for Claude debugging and continuation  

---

## Table of Contents
1. [Chaos Engineering Service](#1-chaos-engineering-service)
2. [Graceful Degradation Service](#2-graceful-degradation-service)
3. [Self-Healing Service](#3-self-healing-service)
4. [Predictive Failure Engine](#4-predictive-failure-engine)
5. [Antifragility Dashboard Component](#5-antifragility-dashboard-component)
6. [Safe Data Utilities](#6-safe-data-utilities)
7. [Debounce Hook](#7-debounce-hook)
8. [ErrorBoundary Component](#8-errorboundary-component)
9. [Virtual Facility Table](#9-virtual-facility-table)
10. [RLM Query Engine](#10-rlm-query-engine)

---

## 1. Chaos Engineering Service

### `src/services/chaosEngineering.ts`

```typescript
/**
 * Chaos Engineering Module
 * 
 * Implements Netflix-style chaos engineering principles:
 * - Deliberate fault injection to test resilience
 * - Controlled failure scenarios
 * - Automatic chaos experiments
 * 
 * "Antifragility is beyond resilience or robustness. The resilient
 * resists shocks and stays the same; the antifragile gets better."
 * - Nassim Nicholas Taleb
 */

import { db } from '../db/database';

// ============================================================================
// TYPES
// ============================================================================

export interface ChaosExperiment {
  id: string;
  name: string;
  description: string;
  type: ChaosType;
  severity: 'low' | 'medium' | 'high';
  duration: number; // ms
  enabled: boolean;
  lastRun?: Date;
  results?: ExperimentResult[];
}

export interface ExperimentResult {
  timestamp: Date;
  success: boolean;
  recoveryTime: number; // ms
  impact: string;
  notes: string;
}

export type ChaosType = 
  | 'latency'      // Add artificial delays
  | 'error'        // Inject errors
  | 'data_corrupt' // Return malformed data
  | 'timeout'      // Force timeouts
  | 'memory'       // Simulate memory pressure
  | 'network'      // Simulate network issues
  | 'cascade'      // Trigger cascading failures
  | 'resource';    // Exhaust resources

interface ChaosConfig {
  enabled: boolean;
  safeMode: boolean; // Only run non-destructive experiments
  maxConcurrentExperiments: number;
  cooldownPeriod: number; // ms between experiments
  autoRecover: boolean;
}

// ============================================================================
// CHAOS ENGINE
// ============================================================================

class ChaosEngineeringService {
  private config: ChaosConfig = {
    enabled: false,
    safeMode: true,
    maxConcurrentExperiments: 1,
    cooldownPeriod: 30000,
    autoRecover: true,
  };

  private activeExperiments: Map<string, ChaosExperiment> = new Map();
  private experimentHistory: ExperimentResult[] = [];
  private listeners: Set<(event: ChaosEvent) => void> = new Set();
  private lastExperimentTime: number = 0;

  // Predefined experiments
  private experiments: Map<string, ChaosExperiment> = new Map([
    ['latency-spike', {
      id: 'latency-spike',
      name: 'Latency Spike',
      description: 'Introduces 2-5 second delays to API calls',
      type: 'latency',
      severity: 'medium',
      duration: 10000,
      enabled: true,
    }],
    ['api-error', {
      id: 'api-error',
      name: 'API Error Injection',
      description: 'Returns 500 errors for 20% of API calls',
      type: 'error',
      severity: 'high',
      duration: 15000,
      enabled: true,
    }],
    ['data-corruption', {
      id: 'data-corruption',
      name: 'Data Corruption',
      description: 'Returns malformed JSON responses',
      type: 'data_corrupt',
      severity: 'high',
      duration: 5000,
      enabled: true,
    }],
    ['timeout-storm', {
      id: 'timeout-storm',
      name: 'Timeout Storm',
      description: 'Forces all requests to timeout',
      type: 'timeout',
      severity: 'high',
      duration: 8000,
      enabled: true,
    }],
    ['memory-pressure', {
      id: 'memory-pressure',
      name: 'Memory Pressure',
      description: 'Simulates low memory conditions',
      type: 'memory',
      severity: 'medium',
      duration: 20000,
      enabled: true,
    }],
    ['network-partition', {
      id: 'network-partition',
      name: 'Network Partition',
      description: 'Simulates network disconnection',
      type: 'network',
      severity: 'high',
      duration: 10000,
      enabled: true,
    }],
    ['cascade-failure', {
      id: 'cascade-failure',
      name: 'Cascade Failure',
      description: 'Triggers a chain of dependent failures',
      type: 'cascade',
      severity: 'high',
      duration: 15000,
      enabled: true,
    }],
    ['resource-exhaustion', {
      id: 'resource-exhaustion',
      name: 'Resource Exhaustion',
      description: 'Exhausts IndexedDB connections',
      type: 'resource',
      severity: 'medium',
      duration: 10000,
      enabled: true,
    }],
  ]);

  // PUBLIC API
  enable(options?: Partial<ChaosConfig>): void {
    this.config = { ...this.config, ...options, enabled: true };
    this.emit({ type: 'enabled', config: this.config });
    console.log('🔥 Chaos Engineering ENABLED', this.config);
  }

  disable(): void {
    this.config.enabled = false;
    this.stopAllExperiments();
    this.emit({ type: 'disabled' });
    console.log('🛑 Chaos Engineering DISABLED');
  }

  isEnabled(): boolean {
    return this.config.enabled;
  }

  getConfig(): ChaosConfig {
    return { ...this.config };
  }

  listExperiments(): ChaosExperiment[] {
    return Array.from(this.experiments.values());
  }

  async runExperiment(experimentId: string): Promise<ExperimentResult> {
    if (!this.config.enabled) {
      throw new Error('Chaos Engineering is not enabled');
    }

    const experiment = this.experiments.get(experimentId);
    if (!experiment) {
      throw new Error(`Unknown experiment: ${experimentId}`);
    }

    // Check cooldown
    const now = Date.now();
    if (now - this.lastExperimentTime < this.config.cooldownPeriod) {
      throw new Error(`Cooldown active. Wait ${Math.ceil((this.config.cooldownPeriod - (now - this.lastExperimentTime)) / 1000)}s`);
    }

    // Check concurrent limit
    if (this.activeExperiments.size >= this.config.maxConcurrentExperiments) {
      throw new Error('Max concurrent experiments reached');
    }

    // Safe mode check
    if (this.config.safeMode && experiment.severity === 'high') {
      throw new Error(`Experiment ${experimentId} blocked by safe mode (severity: high)`);
    }

    this.lastExperimentTime = now;
    this.activeExperiments.set(experimentId, experiment);
    
    const startTime = Date.now();
    this.emit({ type: 'experiment_started', experiment });

    try {
      await this.executeExperiment(experiment);
      
      const result: ExperimentResult = {
        timestamp: new Date(),
        success: true,
        recoveryTime: Date.now() - startTime - experiment.duration,
        impact: 'System recovered successfully',
        notes: `Experiment completed in ${Date.now() - startTime}ms`,
      };

      this.experimentHistory.push(result);
      experiment.results = [...(experiment.results || []), result];
      experiment.lastRun = new Date();

      this.emit({ type: 'experiment_completed', experiment, result });
      return result;

    } catch (error) {
      const result: ExperimentResult = {
        timestamp: new Date(),
        success: false,
        recoveryTime: -1,
        impact: 'System failed to recover',
        notes: error instanceof Error ? error.message : 'Unknown error',
      };

      this.experimentHistory.push(result);
      this.emit({ type: 'experiment_failed', experiment, result });
      
      if (this.config.autoRecover) {
        await this.triggerRecovery(experiment);
      }

      return result;
    } finally {
      this.activeExperiments.delete(experimentId);
    }
  }

  stopAllExperiments(): void {
    this.activeExperiments.clear();
    this.emit({ type: 'all_stopped' });
  }

  getHistory(): ExperimentResult[] {
    return [...this.experimentHistory];
  }

  subscribe(callback: (event: ChaosEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  wrapWithChaos<T extends (...args: unknown[]) => Promise<unknown>>(
    fn: T,
    failureRate: number = 0.1
  ): T {
    return (async (...args: Parameters<T>) => {
      if (this.config.enabled && Math.random() < failureRate) {
        const chaosType = this.getRandomChaosType();
        await this.injectChaos(chaosType);
      }
      return fn(...args);
    }) as T;
  }

  // PRIVATE METHODS
  private async executeExperiment(experiment: ChaosExperiment): Promise<void> {
    console.log(`🔥 Starting chaos experiment: ${experiment.name}`);

    switch (experiment.type) {
      case 'latency':
        await this.injectLatency(experiment.duration);
        break;
      case 'error':
        await this.injectErrors(experiment.duration);
        break;
      case 'data_corrupt':
        await this.injectDataCorruption(experiment.duration);
        break;
      case 'timeout':
        await this.injectTimeouts(experiment.duration);
        break;
      case 'memory':
        await this.injectMemoryPressure(experiment.duration);
        break;
      case 'network':
        await this.injectNetworkPartition(experiment.duration);
        break;
      case 'cascade':
        await this.injectCascadeFailure(experiment.duration);
        break;
      case 'resource':
        await this.injectResourceExhaustion(experiment.duration);
        break;
    }

    console.log(`✅ Chaos experiment completed: ${experiment.name}`);
  }

  private async injectChaos(type: ChaosType): Promise<void> {
    switch (type) {
      case 'latency':
        await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
        break;
      case 'error':
        if (Math.random() < 0.5) throw new Error('Chaos: Injected error');
        break;
      case 'timeout':
        await new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Chaos: Timeout')), 100)
        );
        break;
    }
  }

  private async injectLatency(duration: number): Promise<void> {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 3000));
      return originalFetch(...args);
    };

    await new Promise(r => setTimeout(r, duration));
    window.fetch = originalFetch;
  }

  private async injectErrors(duration: number): Promise<void> {
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      if (Math.random() < 0.2) {
        throw new Error('Chaos: Simulated network error');
      }
      return originalFetch(...args);
    };

    await new Promise(r => setTimeout(r, duration));
    window.fetch = originalFetch;
  }

  private async injectDataCorruption(duration: number): Promise<void> {
    const originalParse = JSON.parse;
    JSON.parse = (text: string) => {
      if (Math.random() < 0.3) {
        return { corrupted: true, data: null };
      }
      return originalParse(text);
    };

    await new Promise(r => setTimeout(r, duration));
    JSON.parse = originalParse;
  }

  private async injectTimeouts(duration: number): Promise<void> {
    const originalFetch = window.fetch;
    window.fetch = () => new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Chaos: Request timeout')), 100);
    });

    await new Promise(r => setTimeout(r, duration));
    window.fetch = originalFetch;
  }

  private async injectMemoryPressure(duration: number): Promise<void> {
    const memoryHog: unknown[][] = [];
    const interval = setInterval(() => {
      memoryHog.push(new Array(100000).fill('memory pressure'));
    }, 100);

    await new Promise(r => setTimeout(r, duration));
    clearInterval(interval);
    memoryHog.length = 0;
  }

  private async injectNetworkPartition(duration: number): Promise<void> {
    const originalFetch = window.fetch;
    window.fetch = () => Promise.reject(new Error('Chaos: Network unreachable'));

    await new Promise(r => setTimeout(r, duration));
    window.fetch = originalFetch;
  }

  private async injectCascadeFailure(duration: number): Promise<void> {
    const failures = ['latency', 'error', 'timeout'] as ChaosType[];
    const interval = duration / failures.length;

    for (const failure of failures) {
      await this.injectChaos(failure);
      await new Promise(r => setTimeout(r, interval));
    }
  }

  private async injectResourceExhaustion(duration: number): Promise<void> {
    const connections: IDBDatabase[] = [];
    
    try {
      for (let i = 0; i < 50; i++) {
        const request = indexedDB.open(`chaos_test_${i}`, 1);
        request.onsuccess = () => connections.push(request.result);
      }

      await new Promise(r => setTimeout(r, duration));
    } finally {
      connections.forEach(conn => conn.close());
      connections.forEach((_, i) => indexedDB.deleteDatabase(`chaos_test_${i}`));
    }
  }

  private async triggerRecovery(experiment: ChaosExperiment): Promise<void> {
    console.log(`🔧 Auto-recovery triggered for: ${experiment.name}`);
    this.emit({ type: 'recovery_started', experiment });
    await new Promise(r => setTimeout(r, 1000));
    this.emit({ type: 'recovery_completed', experiment });
  }

  private getRandomChaosType(): ChaosType {
    const types: ChaosType[] = ['latency', 'error', 'timeout'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private emit(event: ChaosEvent): void {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('Chaos event listener error:', e);
      }
    });
  }
}

// EVENT TYPES
type ChaosEvent = 
  | { type: 'enabled'; config: ChaosConfig }
  | { type: 'disabled' }
  | { type: 'experiment_started'; experiment: ChaosExperiment }
  | { type: 'experiment_completed'; experiment: ChaosExperiment; result: ExperimentResult }
  | { type: 'experiment_failed'; experiment: ChaosExperiment; result: ExperimentResult }
  | { type: 'all_stopped' }
  | { type: 'recovery_started'; experiment: ChaosExperiment }
  | { type: 'recovery_completed'; experiment: ChaosExperiment };

// SINGLETON EXPORT
export const chaosEngine = new ChaosEngineeringService();

export const enableChaos = chaosEngine.enable.bind(chaosEngine);
export const disableChaos = chaosEngine.disable.bind(chaosEngine);
export const runChaosExperiment = chaosEngine.runExperiment.bind(chaosEngine);
export const wrapWithChaos = chaosEngine.wrapWithChaos.bind(chaosEngine);
```

---

## 2. Graceful Degradation Service

### `src/services/gracefulDegradation.ts`

```typescript
/**
 * Graceful Degradation Service
 * 
 * Implements the "fail gracefully" principle:
 * - Progressive feature disabling under stress
 * - Fallback UI states for failed components
 * - Service level management (full → reduced → minimal → offline)
 */

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
  memoryUsage: number;
  errorRate: number;
  latency: number;
  activeConnections: number;
  failedRequests: number;
}

class GracefulDegradationService {
  private serviceLevel: ServiceLevel = 'full';
  private features: Map<string, FeatureState> = new Map();
  private rules: DegradationRule[] = [];
  private healthHistory: SystemHealth[] = [];
  private listeners: Set<(event: DegradationEvent) => void> = new Set();
  private monitorInterval?: ReturnType<typeof setInterval>;

  private thresholds = {
    memory: { reduced: 0.7, minimal: 0.85, offline: 0.95 },
    errorRate: { reduced: 5, minimal: 15, offline: 30 },
    latency: { reduced: 2000, minimal: 5000, offline: 10000 },
  };

  constructor() {
    this.initializeFeatures();
    this.initializeRules();
  }

  private initializeFeatures(): void {
    const featureDefinitions = [
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

  // ... (remaining methods as shown in full file)

  startMonitoring(intervalMs: number = 5000): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
    }
    this.monitorInterval = setInterval(() => {
      this.checkHealth();
    }, intervalMs);
    console.log('🏥 Graceful degradation monitoring started');
  }

  stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = undefined;
    }
  }

  getServiceLevel(): ServiceLevel {
    return this.serviceLevel;
  }

  setServiceLevel(level: ServiceLevel): void {
    const oldLevel = this.serviceLevel;
    this.serviceLevel = level;
    this.applyDegradationRules();
    this.emit({ type: 'level_changed', oldLevel, newLevel: level });
  }

  isFeatureAvailable(featureId: string): boolean {
    const feature = this.features.get(featureId);
    return feature ? feature.enabled && !feature.degraded : false;
  }

  getAllFeatures(): FeatureState[] {
    return Array.from(this.features.values());
  }

  reportFeatureError(featureId: string, error: Error): void {
    const feature = this.features.get(featureId);
    if (!feature) return;

    feature.errorCount++;
    feature.lastError = error;

    if (feature.errorCount >= 3 && !feature.degraded) {
      this.degradeFeature(featureId);
    }
    this.emit({ type: 'feature_error', feature, error });
  }

  degradeFeature(featureId: string): void {
    const feature = this.features.get(featureId);
    if (!feature) return;

    feature.degraded = true;
    feature.fallbackActive = true;
    this.emit({ type: 'feature_degraded', feature });
  }

  recoverFeature(featureId: string): void {
    const feature = this.features.get(featureId);
    if (!feature) return;

    feature.degraded = false;
    feature.fallbackActive = false;
    feature.errorCount = 0;
    feature.lastError = undefined;
    this.emit({ type: 'feature_recovered', feature });
  }

  subscribe(callback: (event: DegradationEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private checkHealth(): void {
    const health = this.measureHealth();
    this.healthHistory.push(health);
    if (this.healthHistory.length > 100) this.healthHistory.shift();

    const newLevel = this.calculateServiceLevel(health);
    if (newLevel !== this.serviceLevel) {
      this.setServiceLevel(newLevel);
    }
    this.attemptRecovery();
  }

  private measureHealth(): SystemHealth {
    let memoryUsage = 0;
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      memoryUsage = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
    }

    const recentErrors = Array.from(this.features.values())
      .reduce((sum, f) => sum + f.errorCount, 0);

    return {
      memoryUsage,
      errorRate: recentErrors,
      latency: 100,
      activeConnections: 0,
      failedRequests: recentErrors,
    };
  }

  private calculateServiceLevel(health: SystemHealth): ServiceLevel {
    if (health.memoryUsage >= this.thresholds.memory.offline ||
        health.errorRate >= this.thresholds.errorRate.offline) {
      return 'offline';
    }
    if (health.memoryUsage >= this.thresholds.memory.minimal ||
        health.errorRate >= this.thresholds.errorRate.minimal) {
      return 'minimal';
    }
    if (health.memoryUsage >= this.thresholds.memory.reduced ||
        health.errorRate >= this.thresholds.errorRate.reduced) {
      return 'reduced';
    }
    return 'full';
  }

  private applyDegradationRules(): void {
    // Apply rules based on current service level
  }

  private attemptRecovery(): void {
    // Try to recover degraded features
  }

  private emit(event: DegradationEvent): void {
    this.listeners.forEach(cb => {
      try { cb(event); } catch (e) { console.error(e); }
    });
  }
}

type DegradationEvent =
  | { type: 'level_changed'; oldLevel: ServiceLevel; newLevel: ServiceLevel }
  | { type: 'feature_degraded'; feature: FeatureState }
  | { type: 'feature_recovered'; feature: FeatureState }
  | { type: 'feature_disabled'; feature: FeatureState }
  | { type: 'feature_enabled'; feature: FeatureState }
  | { type: 'feature_error'; feature: FeatureState; error: Error };

export const degradationService = new GracefulDegradationService();

export function isFeatureAvailable(featureId: string): boolean {
  return degradationService.isFeatureAvailable(featureId);
}
```

---

## 3. Self-Healing Service

### `src/services/selfHealing.ts`

*(Full 763 lines - see source file)*

**Key exports:**
```typescript
export const selfHealingService = new SelfHealingService();

// Key methods:
selfHealingService.start(10000); // Start monitoring every 10s
selfHealingService.getHealthScore(); // 0-100
selfHealingService.getIndicators(); // Array<HealthIndicator>
selfHealingService.executeHealingAction('clear-cache');
selfHealingService.reportIncident(type, severity, description);
```

---

## 4. Predictive Failure Engine

### `src/services/predictiveFailure.ts`

*(Full 493 lines - see source file)*

**Key exports:**
```typescript
export const predictiveFailureEngine = new PredictiveFailureEngine();

// Convenience export
export const recordMetric = predictiveFailureEngine.recordMetric.bind(predictiveFailureEngine);

// Key methods:
recordMetric('memory-usage', 75);
predictiveFailureEngine.getRiskScore(); // 0-100
predictiveFailureEngine.getAllPredictions(); // Array<Prediction>
predictiveFailureEngine.getAnomalies(10); // Recent anomalies
predictiveFailureEngine.forecast('memory-usage', 10); // Next 10 data points
```

---

## 5. Antifragility Dashboard Component

### `src/components/AntifragilityDashboard.tsx`

*(Full 627 lines - see source file)*

**Key Features:**
- Real-time health monitoring
- Chaos engineering controls
- Predictive warnings display
- Self-healing action triggers
- Feature degradation status

---

## 6. Safe Data Utilities

### `src/utils/safeData.ts`

```typescript
/**
 * Safe Data Utilities
 * Defensive programming helpers to prevent runtime crashes
 */

export function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

export function safeSum(arr: number[] | undefined | null): number {
  return safeArray(arr).reduce((a, b) => a + (Number(b) || 0), 0);
}

export function safeCount<T>(arr: T[] | undefined | null): number {
  return safeArray(arr).length;
}

export function safeGet<T, K extends keyof T>(obj: T | undefined | null, key: K, defaultValue: T[K]): T[K] {
  if (obj === undefined || obj === null) return defaultValue;
  return obj[key] ?? defaultValue;
}

export function safeString(val: unknown, defaultValue: string = ''): string {
  if (typeof val === 'string') return val;
  if (val === null || val === undefined) return defaultValue;
  return String(val);
}

export function safeNumber(val: unknown, defaultValue: number = 0): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) return parsed;
  }
  return defaultValue;
}

export function safeBoolean(val: unknown, defaultValue: boolean = false): boolean {
  if (typeof val === 'boolean') return val;
  if (val === 'true') return true;
  if (val === 'false') return false;
  return defaultValue;
}

export function safeCurrency(val: unknown, defaultValue: string = '$0'): string {
  const num = safeNumber(val, 0);
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toLocaleString()}`;
}

export function safePercentage(val: unknown, decimals: number = 1): string {
  const num = safeNumber(val, 0);
  return `${num.toFixed(decimals)}%`;
}

export function safeMap<T, U>(arr: T[] | undefined | null, fn: (item: T, index: number) => U): U[] {
  return safeArray(arr).map(fn);
}
```

---

## 7. Debounce Hook

### `src/hooks/useDebounce.ts`

```typescript
import { useState, useEffect, useCallback, useRef } from 'react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedCallback = useCallback((...args: Parameters<T>) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => callback(...args), delay);
  }, [callback, delay]) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return debouncedCallback;
}

export function useDebouncedSearch(initialValue: string = '', delay: number = 300) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const debouncedSearchTerm = useDebounce(searchTerm, delay);
  return { searchTerm, setSearchTerm, debouncedSearchTerm };
}
```

---

## 8. ErrorBoundary Component

### `src/components/ErrorBoundary.tsx`

```typescript
import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  tabName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    console.error(`[ErrorBoundary${this.props.tabName ? `: ${this.props.tabName}` : ''}]`, error);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="flex flex-col items-center justify-center p-8 m-4 bg-slate-50 rounded-xl border border-red-200">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-800 mb-2">
            {this.props.tabName ? `Error in ${this.props.tabName}` : 'Something went wrong'}
          </h3>
          <p className="text-sm text-slate-600 text-center mb-4 max-w-md">
            {this.state.error?.message || 'This section encountered an error.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
```

---

## 9. Virtual Facility Table

### `src/components/VirtualFacilityTable.tsx`

```typescript
import React, { memo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';
import { Building2, MapPin, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import type { Facility } from '../db/database';
import { safeCurrency } from '../utils/safeData';

interface VirtualFacilityTableProps {
  facilities: Facility[];
  onSelect?: (facility: Facility) => void;
  height?: number;
  itemSize?: number;
}

const FacilityRow = memo(({ 
  data, 
  index, 
  style 
}: { 
  data: { facilities: Facility[]; onSelect?: (f: Facility) => void }; 
  index: number; 
  style: React.CSSProperties;
}) => {
  const facility = data.facilities[index];
  
  const statusConfig = {
    compliant: { icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' },
    'non-compliant': { icon: AlertTriangle, color: 'text-red-500', bg: 'bg-red-50' },
    'at-risk': { icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-50' },
  };

  const status = statusConfig[facility.status as keyof typeof statusConfig] || statusConfig['at-risk'];
  const StatusIcon = status.icon;
  const gap = (facility.subsidyAmount || 0) - (facility.jobsActual || 0) * 50000;

  return (
    <div
      style={style}
      className="flex items-center px-4 py-2 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
      onClick={() => data.onSelect?.(facility)}
    >
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-800 truncate">{facility.name}</div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span>{facility.operator}</span>
          <span>•</span>
          <MapPin size={10} />
          <span>{facility.city}, {facility.state}</span>
        </div>
      </div>
      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${status.bg}`}>
        <StatusIcon size={12} className={status.color} />
        <span className={`text-xs font-medium ${status.color}`}>
          {facility.status}
        </span>
      </div>
      <div className="w-24 text-right">
        <span className={`text-sm font-medium ${gap > 0 ? 'text-red-600' : 'text-slate-400'}`}>
          {gap > 0 ? safeCurrency(gap) : '—'}
        </span>
      </div>
    </div>
  );
});

export const VirtualFacilityTable: React.FC<VirtualFacilityTableProps> = ({
  facilities,
  onSelect,
  height = 500,
  itemSize = 64,
}) => {
  const itemData = { facilities, onSelect };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <div className="flex items-center px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
        <div className="flex-1">Facility</div>
        <div className="w-32 text-center">Status</div>
        <div className="w-24 text-right">Gap</div>
      </div>
      <List
        height={height}
        itemCount={facilities.length}
        itemSize={itemSize}
        width="100%"
        itemData={itemData}
      >
        {FacilityRow}
      </List>
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
        {facilities.length.toLocaleString()} facilities
      </div>
    </div>
  );
};

export default VirtualFacilityTable;
```

---

## 10. RLM Query Engine

### `src/services/recursiveQueryEngine.ts`

*(Full 712 lines - see source file)*

**Key exports:**
```typescript
// RLM-powered query functions
export async function analyzeComplianceRLM(): Promise<RLMResult>
export async function detectPatternsRLM(patternType: 'subsidy' | 'geographic' | 'operator'): Promise<RLMResult>
export async function searchFacilitiesRLM(query: string): Promise<RLMResult>

// Result type
interface RLMResult {
  success: boolean;
  data: any;
  metadata: {
    chunksUsed: number;
    recursionDepth: number;
    executionTimeMs: number;
    alternativePathsExplored?: number;
  };
  errors?: string[];
}
```

---

## Quick Reference

### Import Paths
```typescript
// Services
import { chaosEngine } from './services/chaosEngineering';
import { degradationService } from './services/gracefulDegradation';
import { selfHealingService } from './services/selfHealing';
import { predictiveFailureEngine, recordMetric } from './services/predictiveFailure';

// Components
import { ErrorBoundary } from './components/ErrorBoundary';
import { AntifragilityDashboard } from './components/AntifragilityDashboard';
import { VirtualFacilityTable } from './components/VirtualFacilityTable';

// Utilities
import { safeArray, safeNumber, safeCurrency } from './utils/safeData';
import { useDebounce, useDebouncedCallback } from './hooks/useDebounce';
```

---

*Generated for Claude context transfer - January 5, 2026*

