/**
 * Resource Limits and Memory Protection
 * Prevents overwhelming the browser with too many operations
 */

export class ResourceLimiter {
  private activeOperations = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  /**
   * Acquire a resource slot, wait if necessary
   */
  async acquire(): Promise<() => void> {
    // If under limit, acquire immediately
    if (this.activeOperations < this.maxConcurrent) {
      this.activeOperations++;
      return () => {
        this.activeOperations--;
        this.processQueue();
      };
    }

    // Otherwise, wait in queue
    return new Promise<() => void>((resolve) => {
      this.queue.push(() => {
        this.activeOperations++;
        resolve(() => {
          this.activeOperations--;
          this.processQueue();
        });
      });
    });
  }

  /**
   * Process queued operations
   */
  private processQueue() {
    while (this.queue.length > 0 && this.activeOperations < this.maxConcurrent) {
      const next = this.queue.shift();
      if (next) {
        next();
      }
    }
  }

  /**
   * Get current active operation count
   */
  getActiveCount(): number {
    return this.activeOperations;
  }

  /**
   * Get queue length
   */
  getQueueLength(): number {
    return this.queue.length;
  }
}

// Pre-configured resource limiters
export const resourceLimiters = {
  database: new ResourceLimiter(5), // Max 5 concurrent DB operations
  api: new ResourceLimiter(10), // Max 10 concurrent API calls
  processing: new ResourceLimiter(3), // Max 3 concurrent data processing operations
  rendering: new ResourceLimiter(2) // Max 2 concurrent rendering operations
};

/**
 * Memory protection - limit data processing
 */
export const MEMORY_LIMITS = {
  MAX_FACILITIES_TO_PROCESS: 10000,
  MAX_FACILITIES_TO_RENDER: 1000,
  MAX_SEARCH_RESULTS: 500,
  MAX_CHART_DATA_POINTS: 1000
};

/**
 * Limit array size for processing
 */
export function limitArraySize<T>(array: T[], maxSize: number): T[] {
  if (array.length <= maxSize) {
    return array;
  }
  
  console.warn(`Limiting array size from ${array.length} to ${maxSize}`);
  return array.slice(0, maxSize);
}

/**
 * Check if processing would exceed memory limits
 */
export function wouldExceedMemoryLimit(currentSize: number, additionalSize: number, limit: number): boolean {
  return currentSize + additionalSize > limit;
}





