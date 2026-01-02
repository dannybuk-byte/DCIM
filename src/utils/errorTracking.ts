/**
 * Error Tracking Utility
 * Centralized error logging and tracking
 */

export interface ErrorContext {
  [key: string]: any;
}

let errorTrackingEnabled = true;

/**
 * Track an error with context
 */
export function trackError(error: Error | string, context: ErrorContext = {}) {
  const errorObj = typeof error === 'string' ? new Error(error) : error;
  
  const errorInfo = {
    message: errorObj.message,
    stack: errorObj.stack,
    name: errorObj.name,
    context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  };

  // Always log to console
  console.error('[ErrorTracking]', errorInfo);

  // In production, send to error tracking service
  if (import.meta.env.PROD && errorTrackingEnabled) {
    // Example: Send to error tracking service
    // errorTrackingService.captureException(errorObj, { extra: context });
    
    // For now, store in IndexedDB for later analysis
    try {
      // Could store in a dedicated errors table
      const errors = JSON.parse(localStorage.getItem('__error_log__') || '[]');
      errors.push(errorInfo);
      // Keep only last 100 errors
      if (errors.length > 100) {
        errors.shift();
      }
      localStorage.setItem('__error_log__', JSON.stringify(errors));
    } catch (e) {
      // Silently fail - don't break app if error tracking fails
      console.warn('Failed to store error log:', e);
    }
  }
}

/**
 * Enable/disable error tracking
 */
export function setErrorTrackingEnabled(enabled: boolean) {
  errorTrackingEnabled = enabled;
}

/**
 * Get recent errors (for debugging)
 */
export function getRecentErrors(limit: number = 10): any[] {
  try {
    const errors = JSON.parse(localStorage.getItem('__error_log__') || '[]');
    return errors.slice(-limit);
  } catch {
    return [];
  }
}

/**
 * Clear error log
 */
export function clearErrorLog() {
  try {
    localStorage.removeItem('__error_log__');
  } catch {
    // Silently fail
  }
}





