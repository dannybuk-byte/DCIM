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

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Enable chaos engineering (requires explicit opt-in)
   */
  enable(options?: Partial<ChaosConfig>): void {
    this.config = { ...this.config, ...options, enabled: true };
    this.emit({ type: 'enabled', config: this.config });
    console.log('🔥 Chaos Engineering ENABLED', this.config);
  }

  /**
   * Disable chaos engineering
   */
  disable(): void {
    this.config.enabled = false;
    this.stopAllExperiments();
    this.emit({ type: 'disabled' });
    console.log('🛑 Chaos Engineering DISABLED');
  }

  /**
   * Check if chaos is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration
   */
  getConfig(): ChaosConfig {
    return { ...this.config };
  }

  /**
   * List all available experiments
   */
  listExperiments(): ChaosExperiment[] {
    return Array.from(this.experiments.values());
  }

  /**
   * Run a specific experiment
   */
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

  /**
   * Run a random experiment (for automated chaos)
   */
  async runRandomExperiment(): Promise<ExperimentResult | null> {
    if (!this.config.enabled) return null;

    const available = Array.from(this.experiments.values())
      .filter(e => e.enabled)
      .filter(e => !this.config.safeMode || e.severity !== 'high');

    if (available.length === 0) return null;

    const experiment = available[Math.floor(Math.random() * available.length)];
    return this.runExperiment(experiment.id);
  }

  /**
   * Stop all running experiments
   */
  stopAllExperiments(): void {
    this.activeExperiments.clear();
    this.emit({ type: 'all_stopped' });
  }

  /**
   * Get experiment history
   */
  getHistory(): ExperimentResult[] {
    return [...this.experimentHistory];
  }

  /**
   * Subscribe to chaos events
   */
  subscribe(callback: (event: ChaosEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Chaos wrapper for functions - randomly injects failures
   */
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

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

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
    // Store original and restore after duration
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
    // Trigger multiple failures in sequence
    const failures = ['latency', 'error', 'timeout'] as ChaosType[];
    const interval = duration / failures.length;

    for (const failure of failures) {
      await this.injectChaos(failure);
      await new Promise(r => setTimeout(r, interval));
    }
  }

  private async injectResourceExhaustion(duration: number): Promise<void> {
    // Open many IndexedDB connections
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

    // Reset any modified globals
    // This is a simplified recovery - in production you'd have more robust reset
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

// ============================================================================
// EVENT TYPES
// ============================================================================

type ChaosEvent = 
  | { type: 'enabled'; config: ChaosConfig }
  | { type: 'disabled' }
  | { type: 'experiment_started'; experiment: ChaosExperiment }
  | { type: 'experiment_completed'; experiment: ChaosExperiment; result: ExperimentResult }
  | { type: 'experiment_failed'; experiment: ChaosExperiment; result: ExperimentResult }
  | { type: 'all_stopped' }
  | { type: 'recovery_started'; experiment: ChaosExperiment }
  | { type: 'recovery_completed'; experiment: ChaosExperiment };

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const chaosEngine = new ChaosEngineeringService();

// Convenience exports
export const enableChaos = chaosEngine.enable.bind(chaosEngine);
export const disableChaos = chaosEngine.disable.bind(chaosEngine);
export const runChaosExperiment = chaosEngine.runExperiment.bind(chaosEngine);
export const wrapWithChaos = chaosEngine.wrapWithChaos.bind(chaosEngine);

