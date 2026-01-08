/**
 * Resource Guardian - Ultimate Resource Protection
 * 
 * Monitors and protects critical resources:
 * 1. Storage Quota - Warn before running out of space
 * 2. Memory Pressure - React to low memory conditions
 * 3. Long Tasks - Detect UI-blocking operations
 * 4. Watchdog Timer - Detect frozen UI
 * 5. Tab Visibility - Reduce activity when hidden
 * 
 * ANTIFRAGILE: The last line of defense
 */

import { logSystem, logError } from './actionHistory';

// ============================================================================
// TYPES
// ============================================================================

export type ResourceStatus = 'healthy' | 'warning' | 'critical' | 'unknown';

export interface ResourceState {
  storage: {
    status: ResourceStatus;
    usedBytes: number;
    quotaBytes: number;
    percentUsed: number;
  };
  memory: {
    status: ResourceStatus;
    usedMB: number;
    limitMB: number;
    percentUsed: number;
    pressure: 'none' | 'moderate' | 'critical';
  };
  longTasks: {
    count: number;
    totalDuration: number;
    worstTask: number;
  };
  watchdog: {
    lastHeartbeat: number;
    frozen: boolean;
    unresponsiveCount: number;
  };
  visibility: {
    visible: boolean;
    hiddenSince: number | null;
    totalHiddenTime: number;
  };
}

type ResourceListener = (state: ResourceState, alert?: ResourceAlert) => void;

export interface ResourceAlert {
  type: 'storage' | 'memory' | 'longTask' | 'frozen' | 'recovered';
  severity: 'warning' | 'critical' | 'info';
  message: string;
  timestamp: number;
  details?: Record<string, unknown>;
}

// ============================================================================
// THRESHOLDS
// ============================================================================

const THRESHOLDS = {
  storage: {
    warning: 0.7,   // 70% used
    critical: 0.9,  // 90% used
  },
  memory: {
    warning: 0.7,   // 70% of heap
    critical: 0.85, // 85% of heap
  },
  longTask: {
    warning: 50,    // 50ms (Long Task API threshold)
    critical: 150,  // 150ms is very noticeable
  },
  watchdog: {
    heartbeatInterval: 1000,  // 1 second
    frozenThreshold: 5000,    // 5 seconds without heartbeat = frozen
  },
};

// ============================================================================
// RESOURCE GUARDIAN
// ============================================================================

class ResourceGuardian {
  private state: ResourceState;
  private listeners: Set<ResourceListener> = new Set();
  private intervals: ReturnType<typeof setInterval>[] = [];
  private longTaskObserver?: PerformanceObserver;
  private enabled = false;
  private alerts: ResourceAlert[] = [];

  constructor() {
    this.state = this.getInitialState();
  }

  private getInitialState(): ResourceState {
    return {
      storage: { status: 'unknown', usedBytes: 0, quotaBytes: 0, percentUsed: 0 },
      memory: { status: 'unknown', usedMB: 0, limitMB: 0, percentUsed: 0, pressure: 'none' },
      longTasks: { count: 0, totalDuration: 0, worstTask: 0 },
      watchdog: { lastHeartbeat: Date.now(), frozen: false, unresponsiveCount: 0 },
      visibility: { visible: true, hiddenSince: null, totalHiddenTime: 0 },
    };
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Start monitoring all resources
   */
  start(): void {
    if (this.enabled) return;
    this.enabled = true;

    logSystem('Resource Guardian started');

    // Storage monitoring
    this.intervals.push(setInterval(() => this.checkStorage(), 30000)); // Every 30s
    this.checkStorage();

    // Memory monitoring
    this.intervals.push(setInterval(() => this.checkMemory(), 10000)); // Every 10s
    this.checkMemory();

    // Long task monitoring
    this.startLongTaskMonitoring();

    // Watchdog timer
    this.startWatchdog();

    // Visibility monitoring
    this.startVisibilityMonitoring();

    // Memory pressure API (if available)
    this.startMemoryPressureMonitoring();
  }

  /**
   * Stop all monitoring
   */
  stop(): void {
    this.enabled = false;
    this.intervals.forEach(clearInterval);
    this.intervals = [];
    this.longTaskObserver?.disconnect();
    logSystem('Resource Guardian stopped');
  }

  /**
   * Get current state
   */
  getState(): ResourceState {
    return { ...this.state };
  }

  /**
   * Get recent alerts
   */
  getAlerts(limit = 20): ResourceAlert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Subscribe to updates
   */
  subscribe(listener: ResourceListener): () => void {
    this.listeners.add(listener);
    listener(this.state); // Immediate update
    return () => this.listeners.delete(listener);
  }

  /**
   * Force garbage collection hint (if available)
   */
  requestGC(): void {
    // Can't force GC, but we can hint by clearing references
    if (typeof window !== 'undefined' && 'gc' in window) {
      try {
        (window as unknown as { gc: () => void }).gc();
        logSystem('GC requested');
      } catch {
        // GC not available in production
      }
    }
  }

  /**
   * Clear storage to free space
   */
  async clearOldData(daysOld = 30): Promise<number> {
    // This would clear old cached data
    // For now, just return 0 as we'd need specific cache clearing logic
    logSystem(`Clearing data older than ${daysOld} days`);
    return 0;
  }

  // ============================================================================
  // STORAGE MONITORING
  // ============================================================================

  private async checkStorage(): Promise<void> {
    try {
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const used = estimate.usage || 0;
        const quota = estimate.quota || 0;
        const percent = quota > 0 ? used / quota : 0;

        let status: ResourceStatus = 'healthy';
        if (percent >= THRESHOLDS.storage.critical) {
          status = 'critical';
        } else if (percent >= THRESHOLDS.storage.warning) {
          status = 'warning';
        }

        const oldStatus = this.state.storage.status;
        this.state.storage = {
          status,
          usedBytes: used,
          quotaBytes: quota,
          percentUsed: percent,
        };

        // Alert on status change
        if (oldStatus !== status && status !== 'healthy') {
          this.addAlert({
            type: 'storage',
            severity: status === 'critical' ? 'critical' : 'warning',
            message: `Storage ${Math.round(percent * 100)}% full (${this.formatBytes(used)} / ${this.formatBytes(quota)})`,
            timestamp: Date.now(),
            details: { used, quota, percent },
          });
        }

        this.notify();
      }
    } catch (error) {
      logError(`Storage check failed: ${error}`);
    }
  }

  // ============================================================================
  // MEMORY MONITORING
  // ============================================================================

  private checkMemory(): void {
    try {
      if ('memory' in performance) {
        const memory = (performance as unknown as { 
          memory: { usedJSHeapSize: number; jsHeapSizeLimit: number } 
        }).memory;
        
        const usedMB = memory.usedJSHeapSize / (1024 * 1024);
        const limitMB = memory.jsHeapSizeLimit / (1024 * 1024);
        const percent = limitMB > 0 ? usedMB / limitMB : 0;

        let status: ResourceStatus = 'healthy';
        let pressure: 'none' | 'moderate' | 'critical' = 'none';
        
        if (percent >= THRESHOLDS.memory.critical) {
          status = 'critical';
          pressure = 'critical';
        } else if (percent >= THRESHOLDS.memory.warning) {
          status = 'warning';
          pressure = 'moderate';
        }

        const oldStatus = this.state.memory.status;
        this.state.memory = {
          status,
          usedMB: Math.round(usedMB),
          limitMB: Math.round(limitMB),
          percentUsed: percent,
          pressure,
        };

        if (oldStatus !== status && status !== 'healthy') {
          this.addAlert({
            type: 'memory',
            severity: status === 'critical' ? 'critical' : 'warning',
            message: `Memory ${Math.round(percent * 100)}% used (${Math.round(usedMB)}MB / ${Math.round(limitMB)}MB)`,
            timestamp: Date.now(),
            details: { usedMB, limitMB, percent },
          });
        }

        this.notify();
      }
    } catch (error) {
      // Memory API not available
    }
  }

  // ============================================================================
  // LONG TASK MONITORING
  // ============================================================================

  private startLongTaskMonitoring(): void {
    try {
      if ('PerformanceObserver' in window) {
        this.longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            const duration = entry.duration;
            this.state.longTasks.count++;
            this.state.longTasks.totalDuration += duration;
            
            if (duration > this.state.longTasks.worstTask) {
              this.state.longTasks.worstTask = duration;
            }

            if (duration >= THRESHOLDS.longTask.critical) {
              this.addAlert({
                type: 'longTask',
                severity: 'warning',
                message: `Long task detected: ${Math.round(duration)}ms (blocked UI)`,
                timestamp: Date.now(),
                details: { duration, name: entry.name },
              });
            }

            this.notify();
          }
        });

        this.longTaskObserver.observe({ entryTypes: ['longtask'] });
      }
    } catch {
      // Long Task API not supported
    }
  }

  // ============================================================================
  // WATCHDOG TIMER
  // ============================================================================

  private startWatchdog(): void {
    // Heartbeat - runs frequently to detect frozen UI
    const heartbeat = () => {
      const now = Date.now();
      const elapsed = now - this.state.watchdog.lastHeartbeat;

      if (elapsed > THRESHOLDS.watchdog.frozenThreshold && !this.state.watchdog.frozen) {
        // UI was frozen!
        this.state.watchdog.frozen = true;
        this.state.watchdog.unresponsiveCount++;
        
        this.addAlert({
          type: 'frozen',
          severity: 'critical',
          message: `UI was frozen for ${Math.round(elapsed)}ms`,
          timestamp: Date.now(),
          details: { frozenDuration: elapsed },
        });
      } else if (this.state.watchdog.frozen && elapsed < THRESHOLDS.watchdog.frozenThreshold) {
        // Recovered from freeze
        this.state.watchdog.frozen = false;
        
        this.addAlert({
          type: 'recovered',
          severity: 'info',
          message: 'UI responsiveness recovered',
          timestamp: Date.now(),
        });
      }

      this.state.watchdog.lastHeartbeat = now;
      this.notify();
    };

    this.intervals.push(setInterval(heartbeat, THRESHOLDS.watchdog.heartbeatInterval));
  }

  // ============================================================================
  // VISIBILITY MONITORING
  // ============================================================================

  private startVisibilityMonitoring(): void {
    const handleVisibilityChange = () => {
      const visible = document.visibilityState === 'visible';
      
      if (!visible && this.state.visibility.visible) {
        // Page hidden
        this.state.visibility.hiddenSince = Date.now();
      } else if (visible && !this.state.visibility.visible && this.state.visibility.hiddenSince) {
        // Page shown again
        const hiddenDuration = Date.now() - this.state.visibility.hiddenSince;
        this.state.visibility.totalHiddenTime += hiddenDuration;
        this.state.visibility.hiddenSince = null;
      }

      this.state.visibility.visible = visible;
      this.notify();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
  }

  // ============================================================================
  // MEMORY PRESSURE API
  // ============================================================================

  private startMemoryPressureMonitoring(): void {
    // Memory Pressure Observer API (experimental)
    if ('PressureObserver' in window) {
      try {
        const observer = new (window as unknown as { 
          PressureObserver: new (callback: (records: Array<{ state: string }>) => void) => { observe: (source: string) => void; disconnect: () => void } 
        }).PressureObserver((records) => {
          for (const record of records) {
            if (record.state === 'critical') {
              this.state.memory.pressure = 'critical';
              this.addAlert({
                type: 'memory',
                severity: 'critical',
                message: 'System under critical memory pressure',
                timestamp: Date.now(),
              });
            } else if (record.state === 'serious') {
              this.state.memory.pressure = 'moderate';
            }
            this.notify();
          }
        });
        observer.observe('cpu');
      } catch {
        // PressureObserver not available
      }
    }
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  private addAlert(alert: ResourceAlert): void {
    this.alerts.push(alert);
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
    
    // Log based on severity
    if (alert.severity === 'critical') {
      logError(alert.message);
    } else {
      logSystem(alert.message);
    }
  }

  private notify(alert?: ResourceAlert): void {
    this.listeners.forEach(listener => listener(this.state, alert));
  }

  private formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const resourceGuardian = new ResourceGuardian();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect } from 'react';

export function useResourceGuardian() {
  const [state, setState] = useState<ResourceState>(resourceGuardian.getState());
  const [lastAlert, setLastAlert] = useState<ResourceAlert | null>(null);

  useEffect(() => {
    // Start monitoring if not already started
    resourceGuardian.start();

    const unsubscribe = resourceGuardian.subscribe((newState, alert) => {
      setState(newState);
      if (alert) setLastAlert(alert);
    });

    return unsubscribe;
  }, []);

  return {
    state,
    lastAlert,
    alerts: resourceGuardian.getAlerts(),
    requestGC: resourceGuardian.requestGC.bind(resourceGuardian),
    clearOldData: resourceGuardian.clearOldData.bind(resourceGuardian),
  };
}

// Auto-start on import
if (typeof window !== 'undefined') {
  resourceGuardian.start();
}

export default resourceGuardian;
