/**
 * Enhanced ErrorBoundary Component
 * 
 * Provides crash isolation for React components with:
 * - Graceful error display
 * - Tab-specific error messages
 * - Recovery options (retry/reload)
 * - Error logging integration
 */

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  tabName?: string;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    this.setState({ errorInfo });
    
    // Log to console with context
    console.error(`[ErrorBoundary${this.props.tabName ? `: ${this.props.tabName}` : ''}]`, error);
    
    // Log to localStorage for debugging
    try {
      const errorLog = JSON.parse(localStorage.getItem('dcim_error_log') || '[]');
      errorLog.push({
        timestamp: new Date().toISOString(),
        tabName: this.props.tabName,
        message: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
      });
      // Keep only last 50 errors
      if (errorLog.length > 50) errorLog.shift();
      localStorage.setItem('dcim_error_log', JSON.stringify(errorLog));
    } catch {
      // Ignore storage errors
    }
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    this.props.onReset?.();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) return this.props.fallback;

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center p-8 m-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-red-200 dark:border-red-900">
          <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-red-500" />
          </div>
          
          <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
            {this.props.tabName ? `Error in ${this.props.tabName}` : 'Something went wrong'}
          </h3>
          
          <p className="text-sm text-slate-600 dark:text-slate-400 text-center mb-4 max-w-md">
            {this.state.error?.message || 'This section has been isolated to prevent app-wide crashes.'}
          </p>

          <div className="flex gap-3">
            <button
              onClick={this.handleReset}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw size={16} />
              Try Again
            </button>
            
            <button
              onClick={() => window.location.reload()}
              className="flex items-center gap-2 px-4 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              <Home size={16} />
              Reload App
            </button>
          </div>

          {/* Debug info (only in development) */}
          {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
            <details className="mt-4 text-xs text-slate-500 max-w-full">
              <summary className="cursor-pointer hover:text-slate-700">Show technical details</summary>
              <pre className="mt-2 p-2 bg-slate-100 dark:bg-slate-800 rounded overflow-auto max-h-32 text-left">
                {this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Compact error fallback for tabs
 */
export const TabErrorFallback: React.FC<{ tabName: string; onRetry?: () => void }> = ({ tabName, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-12 px-4">
    <AlertTriangle className="w-12 h-12 text-amber-500 mb-4" />
    <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-200 mb-2">
      {tabName} temporarily unavailable
    </h3>
    <p className="text-sm text-slate-500 text-center mb-4">
      Other sections remain functional.
    </p>
    {onRetry && (
      <button 
        onClick={onRetry} 
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm transition-colors"
      >
        <RefreshCw size={16} /> Retry
      </button>
    )}
  </div>
);

/**
 * Inline error fallback for smaller components
 */
export const InlineErrorFallback: React.FC<{ message?: string }> = ({ message }) => (
  <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg text-sm text-red-600 dark:text-red-400">
    <AlertTriangle size={16} />
    {message || 'Failed to load this section'}
  </div>
);

export default ErrorBoundary;
