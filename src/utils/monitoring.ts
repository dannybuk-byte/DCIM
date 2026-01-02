// Monitoring and Observability (Pattern 29-32)
// Tracks performance, errors, and system health

export interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private maxMetrics = 1000; // Keep last 1000 metrics

  recordMetric(name: string, value: number, metadata?: Record<string, any>) {
    this.metrics.push({
      name,
      value,
      timestamp: Date.now(),
      metadata,
    });

    // Keep only last maxMetrics
    if (this.metrics.length > this.maxMetrics) {
      this.metrics = this.metrics.slice(-this.maxMetrics);
    }

    // Log slow operations
    if (value > 1000) {
      console.warn(`Slow operation detected: ${name} took ${value}ms`, metadata);
    }
  }

  getMetrics(name?: string): PerformanceMetric[] {
    if (name) {
      return this.metrics.filter(m => m.name === name);
    }
    return [...this.metrics];
  }

  getAverageTime(name: string): number {
    const metrics = this.metrics.filter(m => m.name === name);
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  clear() {
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure async function execution time
 */
export async function measureAsync<T>(
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - start;
    performanceMonitor.recordMetric(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.recordMetric(`${name}_error`, duration, { error: error instanceof Error ? error.message : 'Unknown' });
    throw error;
  }
}

/**
 * Measure sync function execution time
 */
export function measureSync<T>(name: string, fn: () => T): T {
  const start = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - start;
    performanceMonitor.recordMetric(name, duration);
    return result;
  } catch (error) {
    const duration = performance.now() - start;
    performanceMonitor.recordMetric(`${name}_error`, duration, { error: error instanceof Error ? error.message : 'Unknown' });
    throw error;
  }
}

/**
 * Monitor long animation frames (Pattern 29)
 */
export function initLongFrameMonitoring() {
  if (typeof PerformanceObserver === 'undefined') {
    return () => {}; // Not supported
  }

  try {
    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.duration > 50) {
          console.warn(`Long animation frame detected: ${entry.duration.toFixed(2)}ms`);
          performanceMonitor.recordMetric('long_animation_frame', entry.duration, {
            scripts: entry.scripts?.map((s: any) => ({
              name: s.sourceFunctionName,
              duration: s.duration,
            })),
          });
        }
      });
    });

    observer.observe({ type: 'long-animation-frame', buffered: true });

    return () => observer.disconnect();
  } catch (error) {
    console.warn('Long frame monitoring not supported:', error);
    return () => {};
  }
}

/**
 * Monitor Core Web Vitals (Pattern 32)
 */
export function initWebVitalsMonitoring() {
  if (typeof PerformanceObserver === 'undefined') {
    return () => {}; // Not supported
  }

  const observers: PerformanceObserver[] = [];

  // LCP (Largest Contentful Paint)
  try {
    const lcpObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        performanceMonitor.recordMetric('lcp', entry.startTime, {
          element: entry.element?.tagName,
        });
      });
    });
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
    observers.push(lcpObserver);
  } catch (error) {
    console.warn('LCP monitoring not supported:', error);
  }

  // FID (First Input Delay)
  try {
    const fidObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        performanceMonitor.recordMetric('fid', entry.processingStart - entry.startTime, {
          eventType: entry.name,
        });
      });
    });
    fidObserver.observe({ type: 'first-input', buffered: true });
    observers.push(fidObserver);
  } catch (error) {
    console.warn('FID monitoring not supported:', error);
  }

  return () => {
    observers.forEach(obs => obs.disconnect());
  };
}

