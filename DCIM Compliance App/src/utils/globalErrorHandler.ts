/**
 * Global Error Handler
 * Catches unhandled errors and promise rejections
 */

import { trackError } from './errorTracking';

let isSetup = false;

export function setupGlobalErrorHandling() {
  if (isSetup) {
    console.warn('Global error handling already setup');
    return;
  }

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = event.reason instanceof Error 
      ? event.reason 
      : new Error(String(event.reason));
    
    console.error('[Global] Unhandled promise rejection:', error);
    
    trackError(error, {
      type: 'unhandledrejection',
      reason: event.reason,
      timestamp: new Date().toISOString()
    });
    
    // Prevent default browser behavior (console error)
    event.preventDefault();
  });

  // Handle unhandled errors
  window.addEventListener('error', (event) => {
    const error = event.error || new Error(event.message || 'Unknown error');
    
    console.error('[Global] Unhandled error:', error);
    
    trackError(error, {
      type: 'error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      timestamp: new Date().toISOString()
    });
    
    // Don't prevent default - let browser handle it
  });

  // Handle resource loading errors
  window.addEventListener('error', (event) => {
    if (event.target && (event.target as any).tagName) {
      const target = event.target as HTMLElement;
      console.error('[Global] Resource loading error:', {
        tag: target.tagName,
        src: (target as any).src || (target as any).href,
        error: event.message
      });
      
      trackError(new Error(`Resource loading failed: ${event.message}`), {
        type: 'resource_error',
        tag: target.tagName,
        src: (target as any).src || (target as any).href
      });
    }
  }, true); // Use capture phase

  isSetup = true;
  console.log('[Global] Error handling setup complete');
}

/**
 * Cleanup global error handlers (for testing)
 */
export function cleanupGlobalErrorHandling() {
  // Note: Can't easily remove event listeners, but this marks as not setup
  isSetup = false;
}





