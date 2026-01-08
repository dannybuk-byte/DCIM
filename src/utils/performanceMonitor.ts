/**
 * Performance Monitor - Slow Operation Detection
 * 
 * Monitors application performance:
 * 1. Track operation durations
 * 2. Warn when operations are slow
 * 3. Suggest optimizations
 * 4. Log performance metrics
 * 
 * ANTIFRAGILE: Users understand why things are slow
 */

import { logSystem } from './actionHistory';

// ============================================================================
// TYPES
// ============================================================================

export type OperationType = 
  | 'database_read'
  | 'database_write'
  | 'api_call'
  | 'render'
  | 'filter'
  | 'search'
  | 'export'
  | 'import'
  | 'calculation'
  | 'other';

interface PerformanceEntry {
  id: string;
  type: OperationType;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  slow?: boolean;
  metadata?: Record<string, unknown>;
}

interface PerformanceThresholds {
  database_read: number;
  database_write: number;
  api_call: number;
  render: number;
  filter: number;
  search: number;
  export: number;
  import: number;
  calculation: number;
  other: number;
}

type PerformanceListener = (entry: PerformanceEntry) => void;
type SlowOperationListener = (entry: PerformanceEntry) => void;

// ============================================================================
// DEFAULT THRESHOLDS (ms)
// ============================================================================

const DEFAULT_THRESHOLDS: PerformanceThresholds = {
  database_read: 500,    // 500ms for DB reads
  database_write: 1000,  // 1s for DB writes
  api_call: 5000,        // 5s for API calls
  render: 100,           // 100ms for renders
  filter: 200,           // 200ms for filtering
  search: 300,           // 300ms for search
  export: 3000,          // 3s for exports
  import: 5000,          // 5s for imports
  calculation: 500,      // 500ms for calculations
  other: 1000,           // 1s for other operations
};

// ============================================================================
// PERFORMANCE MONITOR
// ============================================================================

class PerformanceMonitor {
  private entries: Map<string, PerformanceEntry> = new Map();
  private history: PerformanceEntry[] = [];
  private maxHistory = 100;
  private thresholds: PerformanceThresholds;
  private listeners: Set<PerformanceListener> = new Set();
  private slowListeners: Set<SlowOperationListener> = new Set();
  private enabled = true;

  constructor(thresholds?: Partial<PerformanceThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
  }

  /**
   * Start timing an operation
   */
  start(type: OperationType, name: string, metadata?: Record<string, unknown>): string {
    if (!this.enabled) return '';

    const id = `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const entry: PerformanceEntry = {
      id,
      type,
      name,
      startTime: performance.now(),
      metadata,
    };

    this.entries.set(id, entry);
    return id;
  }

  /**
   * End timing an operation
   */
  end(id: string): PerformanceEntry | null {
    if (!this.enabled || !id) return null;

    const entry = this.entries.get(id);
    if (!entry) return null;

    entry.endTime = performance.now();
    entry.duration = entry.endTime - entry.startTime;
    entry.slow = entry.duration > this.thresholds[entry.type];

    this.entries.delete(id);
    this.history.push(entry);

    // Trim history
    if (this.history.length > this.maxHistory) {
      this.history = this.history.slice(-this.maxHistory);
    }

    // Notify listeners
    this.listeners.forEach(listener => listener(entry));

    // Notify slow operation listeners
    if (entry.slow) {
      this.slowListeners.forEach(listener => listener(entry));
      logSystem(`Slow operation: ${entry.name} took ${Math.round(entry.duration)}ms`);
    }

    return entry;
  }

  /**
   * Measure a synchronous operation
   */
  measure<T>(
    type: OperationType,
    name: string,
    operation: () => T,
    metadata?: Record<string, unknown>
  ): T {
    const id = this.start(type, name, metadata);
    try {
      return operation();
    } finally {
      this.end(id);
    }
  }

  /**
   * Measure an async operation
   */
  async measureAsync<T>(
    type: OperationType,
    name: string,
    operation: () => Promise<T>,
    metadata?: Record<string, unknown>
  ): Promise<T> {
    const id = this.start(type, name, metadata);
    try {
      return await operation();
    } finally {
      this.end(id);
    }
  }

  /**
   * Get performance statistics
   */
  getStats(): {
    totalOperations: number;
    slowOperations: number;
    averageDuration: number;
    byType: Record<OperationType, { count: number; avgDuration: number; slowCount: number }>;
    recentSlow: PerformanceEntry[];
  } {
    const byType: Record<string, { count: number; totalDuration: number; slowCount: number }> = {};
    let totalDuration = 0;
    let slowCount = 0;

    this.history.forEach(entry => {
      if (!byType[entry.type]) {
        byType[entry.type] = { count: 0, totalDuration: 0, slowCount: 0 };
      }
      byType[entry.type].count++;
      byType[entry.type].totalDuration += entry.duration || 0;
      if (entry.slow) {
        byType[entry.type].slowCount++;
        slowCount++;
      }
      totalDuration += entry.duration || 0;
    });

    const byTypeWithAvg = Object.fromEntries(
      Object.entries(byType).map(([type, data]) => [
        type,
        {
          count: data.count,
          avgDuration: data.count > 0 ? data.totalDuration / data.count : 0,
          slowCount: data.slowCount,
        },
      ])
    ) as Record<OperationType, { count: number; avgDuration: number; slowCount: number }>;

    return {
      totalOperations: this.history.length,
      slowOperations: slowCount,
      averageDuration: this.history.length > 0 ? totalDuration / this.history.length : 0,
      byType: byTypeWithAvg,
      recentSlow: this.history.filter(e => e.slow).slice(-10),
    };
  }

  /**
   * Get recent entries
   */
  getRecent(limit = 20): PerformanceEntry[] {
    return this.history.slice(-limit).reverse();
  }

  /**
   * Subscribe to all performance entries
   */
  subscribe(listener: PerformanceListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Subscribe to slow operations only
   */
  onSlow(listener: SlowOperationListener): () => void {
    this.slowListeners.add(listener);
    return () => this.slowListeners.delete(listener);
  }

  /**
   * Clear history
   */
  clear(): void {
    this.history = [];
    this.entries.clear();
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Update thresholds
   */
  setThresholds(thresholds: Partial<PerformanceThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const performanceMonitor = new PerformanceMonitor();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function usePerformance() {
  const [stats, setStats] = useState(() => performanceMonitor.getStats());
  const [slowAlert, setSlowAlert] = useState<PerformanceEntry | null>(null);

  useEffect(() => {
    // Update stats periodically
    const interval = setInterval(() => {
      setStats(performanceMonitor.getStats());
    }, 5000);

    // Subscribe to slow operations
    const unsubscribeSlow = performanceMonitor.onSlow((entry) => {
      setSlowAlert(entry);
      // Auto-dismiss after 5 seconds
      setTimeout(() => setSlowAlert(null), 5000);
    });

    return () => {
      clearInterval(interval);
      unsubscribeSlow();
    };
  }, []);

  const measure = useCallback(<T,>(
    type: OperationType,
    name: string,
    operation: () => T
  ): T => {
    return performanceMonitor.measure(type, name, operation);
  }, []);

  const measureAsync = useCallback(async <T,>(
    type: OperationType,
    name: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    return performanceMonitor.measureAsync(type, name, operation);
  }, []);

  const dismissAlert = useCallback(() => {
    setSlowAlert(null);
  }, []);

  return {
    stats,
    slowAlert,
    dismissAlert,
    measure,
    measureAsync,
    start: performanceMonitor.start.bind(performanceMonitor),
    end: performanceMonitor.end.bind(performanceMonitor),
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1) return '<1ms';
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

/**
 * Get performance grade
 */
export function getPerformanceGrade(stats: ReturnType<typeof performanceMonitor.getStats>): {
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;
  message: string;
} {
  const slowRatio = stats.totalOperations > 0 
    ? stats.slowOperations / stats.totalOperations 
    : 0;

  if (slowRatio === 0 && stats.averageDuration < 100) {
    return { grade: 'A', color: 'text-green-600', message: 'Excellent performance!' };
  }
  if (slowRatio < 0.05 && stats.averageDuration < 300) {
    return { grade: 'B', color: 'text-blue-600', message: 'Good performance' };
  }
  if (slowRatio < 0.1 && stats.averageDuration < 500) {
    return { grade: 'C', color: 'text-yellow-600', message: 'Acceptable performance' };
  }
  if (slowRatio < 0.2) {
    return { grade: 'D', color: 'text-orange-600', message: 'Performance could be better' };
  }
  return { grade: 'F', color: 'text-red-600', message: 'Performance needs attention' };
}

/**
 * Get optimization suggestions
 */
export function getOptimizationSuggestions(
  stats: ReturnType<typeof performanceMonitor.getStats>
): string[] {
  const suggestions: string[] = [];

  // Check each type for slow operations
  Object.entries(stats.byType).forEach(([type, data]) => {
    if (data.slowCount > 0) {
      switch (type) {
        case 'database_read':
          suggestions.push('Consider adding database indexes or caching frequently accessed data');
          break;
        case 'database_write':
          suggestions.push('Consider batching database writes or using transactions');
          break;
        case 'api_call':
          suggestions.push('API calls may be slow. Check network connectivity or consider caching');
          break;
        case 'render':
          suggestions.push('UI rendering is slow. Consider memoization or virtualization');
          break;
        case 'filter':
          suggestions.push('Filtering is slow. Consider reducing data set or optimizing filter logic');
          break;
        case 'search':
          suggestions.push('Search is slow. Consider using indexed search or limiting results');
          break;
        case 'export':
          suggestions.push('Export is slow. Consider exporting in smaller batches');
          break;
        case 'calculation':
          suggestions.push('Calculations are slow. Consider using web workers or caching results');
          break;
      }
    }
  });

  if (suggestions.length === 0 && stats.totalOperations > 0) {
    suggestions.push('Performance looks good! No immediate optimizations needed.');
  }

  return [...new Set(suggestions)]; // Remove duplicates
}

export default performanceMonitor;
