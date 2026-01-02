/**
 * Timeout Protection Utility
 * Prevents operations from hanging indefinitely
 */

export interface TimeoutOptions {
  timeoutMs: number;
  fallback?: () => any;
  errorMessage?: string;
}

/**
 * Wrap a promise with a timeout
 */
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  fallback?: () => T
): Promise<T> {
  const timeoutPromise = new Promise<T>((_, reject) => {
    setTimeout(() => {
      if (fallback) {
        // Return fallback value instead of rejecting
        return;
      }
      reject(new Error(`Operation timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([
      promise,
      timeoutPromise.then(() => {
        if (fallback) {
          return fallback();
        }
        throw new Error(`Operation timed out after ${timeoutMs}ms`);
      })
    ]);
  } catch (error) {
    if (fallback && error instanceof Error && error.message.includes('timed out')) {
      return fallback();
    }
    throw error;
  }
}

/**
 * Create a timeout wrapper function
 */
export function createTimeoutWrapper<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  timeoutMs: number,
  fallback?: () => ReturnType<T> extends Promise<infer R> ? R : never
): T {
  return ((...args: Parameters<T>) => {
    return withTimeout(
      fn(...args),
      timeoutMs,
      fallback
    ) as ReturnType<T>;
  }) as unknown as T;
}


