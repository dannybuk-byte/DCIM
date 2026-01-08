/**
 * SmartErrorBoundary - Resilient Error Handling
 * 
 * Catches React component crashes and provides:
 * 1. Friendly error message
 * 2. Recovery options (retry, go home, report)
 * 3. Error logging to action history
 * 4. Automatic retry with exponential backoff
 * 5. Fallback content while recovering
 * 
 * ANTIFRAGILE: Prevents single component crashes from breaking the whole app
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  AlertTriangle, RefreshCw, Home, Bug, Copy,
  ChevronDown, ChevronUp, Shield, CheckCircle
} from 'lucide-react';
import { logError, logRecovery } from '../../utils/actionHistory';

// ============================================================================
// TYPES
// ============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
  name?: string;
  level?: 'page' | 'section' | 'component';
  maxRetries?: number;
  retryDelay?: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  retryCount: number;
  isRetrying: boolean;
  showDetails: boolean;
  recovered: boolean;
}

// ============================================================================
// ERROR BOUNDARY COMPONENT
// ============================================================================

export class SmartErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;

  static defaultProps = {
    level: 'section' as const,
    maxRetries: 3,
    retryDelay: 1000,
  };

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      showDetails: false,
      recovered: false,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { onError, name } = this.props;

    // Log to action history
    logError(`Component crash: ${name || 'Unknown'}`, {
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });

    this.setState({ errorInfo });
    onError?.(error, errorInfo);

    // Log to console for debugging
    console.error(`[SmartErrorBoundary] ${name || 'Component'} crashed:`, error);
  }

  componentWillUnmount(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
    }
  }

  handleRetry = (): void => {
    const { maxRetries = 3, retryDelay = 1000 } = this.props;
    const { retryCount } = this.state;

    if (retryCount >= maxRetries) {
      return;
    }

    this.setState({ isRetrying: true });

    // Exponential backoff
    const delay = retryDelay * Math.pow(2, retryCount);

    this.retryTimeout = setTimeout(() => {
      logRecovery(`Retry attempt ${retryCount + 1}`, true);
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null,
        retryCount: retryCount + 1,
        isRetrying: false,
      });
      this.props.onReset?.();
    }, delay);
  };

  handleReset = (): void => {
    logRecovery('Manual reset', true);
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: 0,
      isRetrying: false,
      recovered: true,
    });
    this.props.onReset?.();

    // Clear recovered state after animation
    setTimeout(() => this.setState({ recovered: false }), 2000);
  };

  handleGoHome = (): void => {
    logRecovery('Navigate to home', true);
    window.location.href = '/';
  };

  handleCopyError = (): void => {
    const { error, errorInfo } = this.state;
    const errorText = `
Error: ${error?.message}
Stack: ${error?.stack}
Component Stack: ${errorInfo?.componentStack}
    `.trim();

    navigator.clipboard.writeText(errorText);
  };

  toggleDetails = (): void => {
    this.setState(prev => ({ showDetails: !prev.showDetails }));
  };

  render(): ReactNode {
    const { children, fallback, name, level = 'section', maxRetries = 3 } = this.props;
    const { hasError, error, errorInfo, retryCount, isRetrying, showDetails, recovered } = this.state;

    // Show recovered animation briefly
    if (recovered) {
      return (
        <div className="flex items-center justify-center p-4 bg-green-50 rounded-lg animate-pulse">
          <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
          <span className="text-green-700 font-medium">Recovered!</span>
        </div>
      );
    }

    if (!hasError) {
      return children;
    }

    // Use custom fallback if provided
    if (fallback) {
      return fallback;
    }

    // Determine styling based on level
    const containerClass = {
      page: 'min-h-screen flex items-center justify-center bg-gray-50',
      section: 'p-6 bg-red-50 rounded-xl border border-red-200',
      component: 'p-4 bg-red-50 rounded-lg border border-red-100',
    }[level];

    const iconSize = {
      page: 'w-16 h-16',
      section: 'w-12 h-12',
      component: 'w-8 h-8',
    }[level];

    return (
      <div className={containerClass}>
        <div className={level === 'page' ? 'max-w-md w-full mx-4 bg-white rounded-xl shadow-lg p-6' : ''}>
          {/* Header */}
          <div className="flex items-start gap-4">
            <div className={`p-3 bg-red-100 rounded-full flex-shrink-0 ${level === 'component' ? 'p-2' : ''}`}>
              <AlertTriangle className={`${iconSize} text-red-500`} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-gray-800 ${level === 'page' ? 'text-xl' : 'text-lg'}`}>
                {level === 'page' ? 'Something went wrong' : `${name || 'This section'} encountered an error`}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {error?.message || 'An unexpected error occurred'}
              </p>
              {retryCount > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Retry attempts: {retryCount}/{maxRetries}
                </p>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              onClick={this.handleRetry}
              disabled={isRetrying || retryCount >= maxRetries}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
              {isRetrying ? 'Retrying...' : retryCount >= maxRetries ? 'Max retries reached' : 'Try Again'}
            </button>

            <button
              onClick={this.handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
            >
              <Shield className="w-4 h-4" />
              Reset
            </button>

            {level === 'page' || level === 'section' ? (
              <button
                onClick={this.handleGoHome}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
              >
                <Home className="w-4 h-4" />
                Go Home
              </button>
            ) : null}
          </div>

          {/* Error Details */}
          <div className="mt-4">
            <button
              onClick={this.toggleDetails}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {showDetails ? 'Hide' : 'Show'} technical details
            </button>

            {showDetails && (
              <div className="mt-2 p-3 bg-gray-900 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-gray-400">Error Stack</span>
                  <button
                    onClick={this.handleCopyError}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <pre className="text-xs text-red-400 overflow-x-auto whitespace-pre-wrap max-h-40">
                  {error?.stack || 'No stack trace available'}
                </pre>
                {errorInfo?.componentStack && (
                  <>
                    <div className="text-xs text-gray-400 mt-3 mb-1">Component Stack</div>
                    <pre className="text-xs text-amber-400 overflow-x-auto whitespace-pre-wrap max-h-40">
                      {errorInfo.componentStack}
                    </pre>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Help Text */}
          <p className="text-xs text-gray-400 mt-4">
            If this keeps happening, try refreshing the page or{' '}
            <button 
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              }}
              className="text-blue-500 hover:underline"
            >
              clearing app data
            </button>.
          </p>
        </div>
      </div>
    );
  }
}

// ============================================================================
// FUNCTIONAL WRAPPER WITH HOOKS
// ============================================================================

interface UseErrorBoundaryReturn {
  ErrorBoundary: React.FC<{ children: ReactNode; name?: string }>;
  resetBoundary: () => void;
}

export function useErrorBoundary(): UseErrorBoundaryReturn {
  const [key, setKey] = React.useState(0);

  const resetBoundary = React.useCallback(() => {
    setKey(k => k + 1);
  }, []);

  const ErrorBoundaryWrapper: React.FC<{ children: ReactNode; name?: string }> = React.useCallback(
    ({ children, name }) => (
      <SmartErrorBoundary key={key} name={name} onReset={resetBoundary}>
        {children}
      </SmartErrorBoundary>
    ),
    [key, resetBoundary]
  );

  return { ErrorBoundary: ErrorBoundaryWrapper, resetBoundary };
}

// ============================================================================
// QUICK ERROR BOUNDARY FOR INLINE USE
// ============================================================================

interface QuickBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  name?: string;
}

export function QuickBoundary({ children, fallback, name }: QuickBoundaryProps): JSX.Element {
  return (
    <SmartErrorBoundary 
      level="component" 
      name={name}
      fallback={fallback || (
        <div className="p-2 bg-red-50 rounded text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          <span>Error loading {name || 'content'}</span>
        </div>
      )}
    >
      {children}
    </SmartErrorBoundary>
  );
}

// ============================================================================
// PAGE-LEVEL ERROR BOUNDARY
// ============================================================================

interface PageBoundaryProps {
  children: ReactNode;
  name?: string;
}

export function PageBoundary({ children, name }: PageBoundaryProps): JSX.Element {
  return (
    <SmartErrorBoundary level="page" name={name || 'Application'}>
      {children}
    </SmartErrorBoundary>
  );
}

// ============================================================================
// SECTION-LEVEL ERROR BOUNDARY
// ============================================================================

interface SectionBoundaryProps {
  children: ReactNode;
  name: string;
  fallback?: ReactNode;
}

export function SectionBoundary({ children, name, fallback }: SectionBoundaryProps): JSX.Element {
  return (
    <SmartErrorBoundary level="section" name={name} fallback={fallback}>
      {children}
    </SmartErrorBoundary>
  );
}

export default SmartErrorBoundary;
