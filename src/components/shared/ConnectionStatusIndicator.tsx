/**
 * ConnectionStatusIndicator - Network Status UI
 * 
 * Displays current connection status with:
 * - Visual indicator (dot/icon)
 * - Offline banner with queue status
 * - Reconnection progress
 * 
 * ANTIFRAGILE: Keeps users informed of connectivity issues
 */

import { useState, useEffect } from 'react';
import { 
  Wifi, WifiOff, CloudOff, Clock, RefreshCw,
  AlertTriangle, CheckCircle, X, Loader2
} from 'lucide-react';
import { 
  useConnectionStatus, 
  getQueueStatus,
  clearQueue,
  ConnectionStatus
} from '../../utils/connectionResilience';

// ============================================================================
// STATUS DOT
// ============================================================================

interface StatusDotProps {
  status: ConnectionStatus;
  className?: string;
  showLabel?: boolean;
}

export function StatusDot({ status, className = '', showLabel = false }: StatusDotProps) {
  const colors: Record<ConnectionStatus, string> = {
    online: 'bg-green-500',
    offline: 'bg-red-500',
    slow: 'bg-yellow-500',
    unstable: 'bg-orange-500',
  };

  const labels: Record<ConnectionStatus, string> = {
    online: 'Online',
    offline: 'Offline',
    slow: 'Slow',
    unstable: 'Unstable',
  };

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${colors[status]} ${status !== 'online' ? 'animate-pulse' : ''}`} />
      {showLabel && (
        <span className={`text-xs ${status === 'online' ? 'text-green-600' : 'text-gray-500'}`}>
          {labels[status]}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT INDICATOR
// ============================================================================

interface CompactIndicatorProps {
  className?: string;
}

export function CompactConnectionIndicator({ className = '' }: CompactIndicatorProps) {
  const { status, avgLatency } = useConnectionStatus();

  if (status === 'online' && avgLatency < 1000) {
    return null; // Don't show when everything is fine
  }

  const icons: Record<ConnectionStatus, React.ReactNode> = {
    online: <Wifi className="w-4 h-4 text-green-500" />,
    offline: <WifiOff className="w-4 h-4 text-red-500" />,
    slow: <Clock className="w-4 h-4 text-yellow-500" />,
    unstable: <AlertTriangle className="w-4 h-4 text-orange-500" />,
  };

  return (
    <div 
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs ${
        status === 'offline' ? 'bg-red-100 text-red-700' :
        status === 'slow' ? 'bg-yellow-100 text-yellow-700' :
        status === 'unstable' ? 'bg-orange-100 text-orange-700' :
        'bg-green-100 text-green-700'
      } ${className}`}
      title={`Connection: ${status}${avgLatency > 0 ? ` (${avgLatency}ms)` : ''}`}
    >
      {icons[status]}
      <span className="capitalize">{status}</span>
      {avgLatency > 0 && status !== 'offline' && (
        <span className="text-[10px] opacity-70">{avgLatency}ms</span>
      )}
    </div>
  );
}

// ============================================================================
// OFFLINE BANNER
// ============================================================================

interface OfflineBannerProps {
  onDismiss?: () => void;
  className?: string;
}

export function OfflineBanner({ onDismiss, className = '' }: OfflineBannerProps) {
  const { status, lastOnline } = useConnectionStatus();
  const [queueInfo, setQueueInfo] = useState({ pending: 0, oldest: null as number | null });
  const [dismissed, setDismissed] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  // Update queue info periodically
  useEffect(() => {
    const update = () => setQueueInfo(getQueueStatus());
    update();
    const interval = setInterval(update, 5000);
    return () => clearInterval(interval);
  }, []);

  // Reset dismissed state when going offline
  useEffect(() => {
    if (status === 'offline') {
      setDismissed(false);
    }
  }, [status]);

  // Don't show if online or dismissed
  if (status === 'online' || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    // Force a connectivity check
    try {
      await fetch('/favicon.svg', { method: 'HEAD', cache: 'no-store' });
    } catch {
      // Ignore
    }
    setTimeout(() => setIsRetrying(false), 2000);
  };

  const handleClearQueue = () => {
    if (confirm(`Clear ${queueInfo.pending} pending request(s)?`)) {
      clearQueue();
      setQueueInfo(getQueueStatus());
    }
  };

  const timeSinceOnline = Date.now() - lastOnline;
  const formatTime = (ms: number) => {
    if (ms < 60000) return 'just now';
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ago`;
    return `${Math.floor(ms / 3600000)}h ago`;
  };

  return (
    <div className={`bg-red-50 border-b border-red-200 ${className}`}>
      <div className="max-w-7xl mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 rounded-full">
              {status === 'offline' ? (
                <CloudOff className="w-5 h-5 text-red-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              )}
            </div>
            
            <div>
              <h4 className="font-medium text-red-800">
                {status === 'offline' ? 'You\'re offline' : 'Connection unstable'}
              </h4>
              <p className="text-sm text-red-600">
                {status === 'offline' 
                  ? `Last online: ${formatTime(timeSinceOnline)}`
                  : 'Some features may not work properly'
                }
                {queueInfo.pending > 0 && (
                  <span className="ml-2">
                    • {queueInfo.pending} request{queueInfo.pending > 1 ? 's' : ''} pending
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {queueInfo.pending > 0 && (
              <button
                onClick={handleClearQueue}
                className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-100 rounded-lg transition-colors"
              >
                Clear queue
              </button>
            )}
            
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
            >
              {isRetrying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <RefreshCw className="w-3.5 h-3.5" />
              )}
              Retry
            </button>
            
            <button
              onClick={handleDismiss}
              className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
              title="Dismiss"
            >
              <X className="w-4 h-4 text-red-500" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// RECONNECTION TOAST
// ============================================================================

export function ReconnectionToast() {
  const { status } = useConnectionStatus();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    if (status === 'offline') {
      setWasOffline(true);
    } else if (wasOffline && status === 'online') {
      setShowReconnected(true);
      setWasOffline(false);
      
      // Hide after 3 seconds
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [status, wasOffline]);

  if (!showReconnected) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-4 fade-in">
      <div className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-full shadow-lg">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm font-medium">Back online!</span>
      </div>
    </div>
  );
}

// ============================================================================
// COMBINED INDICATOR
// ============================================================================

interface ConnectionStatusIndicatorProps {
  variant?: 'dot' | 'compact' | 'banner';
  showLabel?: boolean;
  className?: string;
}

export function ConnectionStatusIndicator({ 
  variant = 'compact', 
  showLabel = false,
  className = '' 
}: ConnectionStatusIndicatorProps) {
  const { status } = useConnectionStatus();

  switch (variant) {
    case 'dot':
      return <StatusDot status={status} showLabel={showLabel} className={className} />;
    case 'banner':
      return <OfflineBanner className={className} />;
    case 'compact':
    default:
      return <CompactConnectionIndicator className={className} />;
  }
}

export default ConnectionStatusIndicator;
