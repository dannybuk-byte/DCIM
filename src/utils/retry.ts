// Retry utility with exponential backoff and jitter (Pattern 19)
// Prevents thundering herd and provides resilience

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  jitter?: boolean;
  retryable?: (error: any) => boolean;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'retryable'>> & { retryable?: (error: any) => boolean } = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
};

/**
 * Retry a function with exponential backoff
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      if (opts.retryable && !opts.retryable(error)) {
        throw error;
      }

      // Don't retry on last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff
      let delay = opts.initialDelay * Math.pow(opts.backoffMultiplier, attempt);
      delay = Math.min(delay, opts.maxDelay);

      // Add jitter to prevent thundering herd
      if (opts.jitter) {
        const jitterAmount = delay * 0.25 * Math.random();
        delay = delay + jitterAmount;
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Check if an error is retryable (network errors, timeouts, 5xx)
 */
export function isRetryableError(error: any): boolean {
  if (!error) return false;

  // Network errors
  if (error.name === 'NetworkError' || error.name === 'TypeError') {
    return true;
  }

  // Fetch errors (network failures)
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return true;
  }

  // HTTP 5xx errors
  if (error.status >= 500 && error.status < 600) {
    return true;
  }

  // HTTP 429 (rate limit) - retryable
  if (error.status === 429) {
    return true;
  }

  // Timeout errors
  if (error.name === 'TimeoutError' || error.message?.includes('timeout')) {
    return true;
  }

  return false;
}

