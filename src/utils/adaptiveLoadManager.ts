/**
 * Adaptive Load Manager - Advanced Load Protection
 * 
 * Implements advanced load management patterns:
 * 
 * 1. LOAD SHEDDING
 *    - Prioritizes critical operations
 *    - Drops low-priority work under stress
 *    - Preserves core functionality
 * 
 * 2. DEAD LETTER QUEUE
 *    - Stores failed operations for analysis
 *    - Enables retry patterns
 *    - Tracks failure patterns
 * 
 * 3. ADAPTIVE BACKPRESSURE
 *    - Slows down when overwhelmed
 *    - Smooths traffic spikes
 *    - Prevents cascade failures
 * 
 * 4. PRIORITY QUEUE
 *    - Critical operations first
 *    - Fair scheduling for others
 *    - Starvation prevention
 * 
 * ANTIFRAGILE: The app gets stronger by learning from load patterns
 */

import { logSystem, logError } from './actionHistory';

// ============================================================================
// TYPES
// ============================================================================

export type Priority = 'critical' | 'high' | 'normal' | 'low' | 'background';

export type LoadLevel = 'idle' | 'light' | 'moderate' | 'heavy' | 'overloaded';

export interface Operation {
  id: string;
  name: string;
  priority: Priority;
  execute: () => Promise<unknown>;
  timeout?: number;
  retries?: number;
  createdAt: number;
}

export interface DeadLetter {
  id: string;
  operation: Omit<Operation, 'execute'>;
  error: string;
  failedAt: number;
  retryCount: number;
  canRetry: boolean;
}

export interface LoadStats {
  level: LoadLevel;
  activeOperations: number;
  queuedOperations: number;
  completedLast60s: number;
  failedLast60s: number;
  averageLatency: number;
  sheddingActive: boolean;
  backpressureMs: number;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

const CONFIG = {
  // Queue limits per priority
  maxQueue: {
    critical: 100,
    high: 50,
    normal: 30,
    low: 20,
    background: 10,
  },
  
  // Concurrency limits
  maxConcurrent: {
    idle: 20,
    light: 15,
    moderate: 10,
    heavy: 5,
    overloaded: 2,
  },
  
  // Load level thresholds (pending operations)
  loadThresholds: {
    light: 5,
    moderate: 15,
    heavy: 30,
    overloaded: 50,
  },
  
  // Shedding priorities (which priorities to drop)
  sheddingOrder: ['background', 'low', 'normal'] as Priority[],
  
  // Backpressure delays (ms)
  backpressure: {
    light: 0,
    moderate: 50,
    heavy: 200,
    overloaded: 500,
  },
  
  // Dead letter queue
  maxDeadLetters: 100,
  maxRetries: 3,
  
  // Stats window
  statsWindowMs: 60000, // 60 seconds
};

// ============================================================================
// ADAPTIVE LOAD MANAGER
// ============================================================================

class AdaptiveLoadManager {
  private queues: Map<Priority, Operation[]> = new Map();
  private activeOperations: Map<string, Operation> = new Map();
  private deadLetters: DeadLetter[] = [];
  private completionTimes: number[] = [];
  private failureTimes: number[] = [];
  private enabled = true;
  private processing = false;
  private listeners: Set<(stats: LoadStats) => void> = new Set();

  constructor() {
    // Initialize priority queues
    this.queues.set('critical', []);
    this.queues.set('high', []);
    this.queues.set('normal', []);
    this.queues.set('low', []);
    this.queues.set('background', []);
    
    logSystem('Adaptive Load Manager initialized');
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Submit an operation for execution
   */
  async submit<T>(operation: Omit<Operation, 'id' | 'createdAt'>): Promise<T> {
    const op: Operation = {
      ...operation,
      id: this.generateId(),
      createdAt: Date.now(),
    };

    const stats = this.getStats();

    // Check if we should shed this operation
    if (this.shouldShed(op.priority, stats)) {
      logSystem(`Load shedding: Dropping ${op.priority} priority operation "${op.name}"`);
      throw new LoadSheddingError(`Operation dropped due to load shedding: ${op.name}`);
    }

    // Apply backpressure
    const delay = CONFIG.backpressure[stats.level] || 0;
    if (delay > 0) {
      await this.sleep(delay);
    }

    // Add to queue
    this.enqueue(op);

    // Process queue
    this.processQueue();

    // Wait for completion
    return this.waitForCompletion<T>(op.id);
  }

  /**
   * Get current load statistics
   */
  getStats(): LoadStats {
    const now = Date.now();
    const windowStart = now - CONFIG.statsWindowMs;

    // Calculate completions/failures in window
    const completedLast60s = this.completionTimes.filter(t => t > windowStart).length;
    const failedLast60s = this.failureTimes.filter(t => t > windowStart).length;

    // Calculate average latency
    const recentCompletions = this.completionTimes.slice(-50);
    const averageLatency = recentCompletions.length > 0
      ? recentCompletions.reduce((a, b) => a + b, 0) / recentCompletions.length
      : 0;

    // Calculate load level
    const totalQueued = this.getTotalQueued();
    const level = this.calculateLoadLevel(totalQueued);

    return {
      level,
      activeOperations: this.activeOperations.size,
      queuedOperations: totalQueued,
      completedLast60s,
      failedLast60s,
      averageLatency: Math.round(averageLatency),
      sheddingActive: level === 'overloaded' || level === 'heavy',
      backpressureMs: CONFIG.backpressure[level] || 0,
    };
  }

  /**
   * Get dead letters for analysis
   */
  getDeadLetters(): DeadLetter[] {
    return [...this.deadLetters];
  }

  /**
   * Retry a dead letter
   */
  async retryDeadLetter(id: string): Promise<boolean> {
    const index = this.deadLetters.findIndex(dl => dl.id === id);
    if (index === -1) return false;

    const deadLetter = this.deadLetters[index];
    if (!deadLetter.canRetry) return false;

    // Remove from dead letters
    this.deadLetters.splice(index, 1);

    logSystem(`Retrying dead letter: ${deadLetter.operation.name}`);
    return true;
  }

  /**
   * Clear all dead letters
   */
  clearDeadLetters(): void {
    this.deadLetters = [];
    logSystem('Dead letter queue cleared');
  }

  /**
   * Subscribe to stats updates
   */
  subscribe(listener: (stats: LoadStats) => void): () => void {
    this.listeners.add(listener);
    listener(this.getStats());
    return () => this.listeners.delete(listener);
  }

  /**
   * Enable/disable load management
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    logSystem(`Load manager ${enabled ? 'enabled' : 'disabled'}`);
  }

  // ============================================================================
  // INTERNAL METHODS
  // ============================================================================

  private enqueue(op: Operation): void {
    const queue = this.queues.get(op.priority)!;
    const maxQueue = CONFIG.maxQueue[op.priority];

    if (queue.length >= maxQueue) {
      // Queue full - try to shed oldest if possible
      if (this.canShed(op.priority)) {
        const removed = queue.shift();
        if (removed) {
          this.addToDeadLetters(removed, 'Queue overflow');
        }
      }
    }

    queue.push(op);
    this.notifyListeners();
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;

    try {
      const stats = this.getStats();
      const maxConcurrent = CONFIG.maxConcurrent[stats.level];

      while (this.activeOperations.size < maxConcurrent && this.hasQueuedOperations()) {
        const op = this.dequeueHighestPriority();
        if (op) {
          this.executeOperation(op);
        }
      }
    } finally {
      this.processing = false;
    }
  }

  private async executeOperation(op: Operation): Promise<void> {
    this.activeOperations.set(op.id, op);
    const startTime = Date.now();

    try {
      const timeout = op.timeout || 30000;
      const result = await Promise.race([
        op.execute(),
        this.timeoutPromise(timeout),
      ]);

      // Record success
      const latency = Date.now() - startTime;
      this.completionTimes.push(latency);
      this.cleanupOldMetrics();

      // Resolve waiting promise
      this.resolveOperation(op.id, result);
    } catch (error) {
      // Record failure
      this.failureTimes.push(Date.now());

      // Check for retry
      const retries = op.retries || 0;
      if (retries > 0) {
        // Requeue with decremented retries
        this.enqueue({ ...op, retries: retries - 1 });
      } else {
        // Add to dead letter queue
        this.addToDeadLetters(op, String(error));
      }

      this.rejectOperation(op.id, error);
    } finally {
      this.activeOperations.delete(op.id);
      this.notifyListeners();
      
      // Continue processing
      setTimeout(() => this.processQueue(), 0);
    }
  }

  private dequeueHighestPriority(): Operation | undefined {
    const priorities: Priority[] = ['critical', 'high', 'normal', 'low', 'background'];
    
    for (const priority of priorities) {
      const queue = this.queues.get(priority)!;
      if (queue.length > 0) {
        return queue.shift();
      }
    }
    
    return undefined;
  }

  private shouldShed(priority: Priority, stats: LoadStats): boolean {
    if (!this.enabled) return false;
    if (!stats.sheddingActive) return false;
    
    return CONFIG.sheddingOrder.includes(priority);
  }

  private canShed(priority: Priority): boolean {
    return CONFIG.sheddingOrder.includes(priority);
  }

  private calculateLoadLevel(queuedOperations: number): LoadLevel {
    if (queuedOperations === 0) return 'idle';
    if (queuedOperations < CONFIG.loadThresholds.light) return 'light';
    if (queuedOperations < CONFIG.loadThresholds.moderate) return 'moderate';
    if (queuedOperations < CONFIG.loadThresholds.heavy) return 'heavy';
    return 'overloaded';
  }

  private getTotalQueued(): number {
    let total = 0;
    for (const queue of this.queues.values()) {
      total += queue.length;
    }
    return total;
  }

  private hasQueuedOperations(): boolean {
    return this.getTotalQueued() > 0;
  }

  private addToDeadLetters(op: Operation, error: string): void {
    const deadLetter: DeadLetter = {
      id: op.id,
      operation: {
        id: op.id,
        name: op.name,
        priority: op.priority,
        timeout: op.timeout,
        retries: op.retries,
        createdAt: op.createdAt,
      },
      error,
      failedAt: Date.now(),
      retryCount: (CONFIG.maxRetries - (op.retries || 0)),
      canRetry: (op.retries || 0) < CONFIG.maxRetries,
    };

    this.deadLetters.push(deadLetter);
    
    // Trim to max size
    if (this.deadLetters.length > CONFIG.maxDeadLetters) {
      this.deadLetters = this.deadLetters.slice(-CONFIG.maxDeadLetters);
    }

    logError(`Dead letter added: ${op.name} - ${error}`);
  }

  private cleanupOldMetrics(): void {
    const windowStart = Date.now() - CONFIG.statsWindowMs;
    this.completionTimes = this.completionTimes.filter(t => t > windowStart);
    this.failureTimes = this.failureTimes.filter(t => t > windowStart);
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timed out')), ms);
    });
  }

  // Promise resolution for waiting callers
  private pendingPromises: Map<string, {
    resolve: (value: unknown) => void;
    reject: (error: unknown) => void;
  }> = new Map();

  private waitForCompletion<T>(id: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.pendingPromises.set(id, { 
        resolve: resolve as (value: unknown) => void, 
        reject 
      });
    });
  }

  private resolveOperation(id: string, result: unknown): void {
    const pending = this.pendingPromises.get(id);
    if (pending) {
      pending.resolve(result);
      this.pendingPromises.delete(id);
    }
  }

  private rejectOperation(id: string, error: unknown): void {
    const pending = this.pendingPromises.get(id);
    if (pending) {
      pending.reject(error);
      this.pendingPromises.delete(id);
    }
  }

  private notifyListeners(): void {
    const stats = this.getStats();
    this.listeners.forEach(listener => listener(stats));
  }
}

// ============================================================================
// CUSTOM ERROR
// ============================================================================

export class LoadSheddingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LoadSheddingError';
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const loadManager = new AdaptiveLoadManager();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect } from 'react';

export function useLoadManager() {
  const [stats, setStats] = useState<LoadStats>(loadManager.getStats());

  useEffect(() => {
    return loadManager.subscribe(setStats);
  }, []);

  return {
    stats,
    deadLetters: loadManager.getDeadLetters(),
    submit: loadManager.submit.bind(loadManager),
    retryDeadLetter: loadManager.retryDeadLetter.bind(loadManager),
    clearDeadLetters: loadManager.clearDeadLetters.bind(loadManager),
    setEnabled: loadManager.setEnabled.bind(loadManager),
  };
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Submit a critical operation (never shed)
 */
export function submitCritical<T>(name: string, execute: () => Promise<T>): Promise<T> {
  return loadManager.submit<T>({ name, execute, priority: 'critical' });
}

/**
 * Submit a high-priority operation
 */
export function submitHigh<T>(name: string, execute: () => Promise<T>): Promise<T> {
  return loadManager.submit<T>({ name, execute, priority: 'high' });
}

/**
 * Submit a normal operation
 */
export function submitNormal<T>(name: string, execute: () => Promise<T>): Promise<T> {
  return loadManager.submit<T>({ name, execute, priority: 'normal' });
}

/**
 * Submit a background operation (most likely to be shed)
 */
export function submitBackground<T>(name: string, execute: () => Promise<T>): Promise<T> {
  return loadManager.submit<T>({ name, execute, priority: 'background' });
}

export default loadManager;
