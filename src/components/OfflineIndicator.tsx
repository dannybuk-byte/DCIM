/**
 * OfflineIndicator.tsx
 * 
 * Displays a prominent banner when the user loses internet connectivity.
 * Part of the Phase 3 hardening initiative for improved UX.
 * 
 * Features:
 * - Auto-detects online/offline status
 * - Non-intrusive but visible notification
 * - Auto-dismisses on reconnection
 * - Lists which features may be affected
 */

import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi, X, AlertTriangle, Database, Cloud } from 'lucide-react';

interface OfflineIndicatorProps {
  /** Show detailed list of affected features */
  showDetails?: boolean;
  /** Position of the banner */
  position?: 'top' | 'bottom';
  /** Allow manual dismiss */
  dismissible?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  showDetails = true,
  position = 'top',
  dismissible = false
}) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [dismissed, setDismissed] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setDismissed(false);
      // Show "reconnected" message briefly
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    };
    
    const handleOffline = () => {
      setIsOnline(false);
      setDismissed(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Don't show if dismissed or online (unless showing reconnected message)
  if (dismissed || (isOnline && !showReconnected)) return null;

  const positionClasses = position === 'top' 
    ? 'top-0' 
    : 'bottom-0';

  // Reconnected toast
  if (showReconnected) {
    return (
      <div 
        className={`fixed ${positionClasses} left-0 right-0 z-[9999] transition-all duration-300`}
        role="status"
        aria-live="polite"
      >
        <div className="bg-emerald-500 text-white text-center py-2 px-4 flex items-center justify-center gap-2 text-sm font-medium shadow-lg">
          <Wifi size={16} className="animate-pulse" />
          Back online! All features restored.
        </div>
      </div>
    );
  }

  // Offline banner
  return (
    <div 
      className={`fixed ${positionClasses} left-0 right-0 z-[9999] transition-all duration-300`}
      role="alert"
      aria-live="assertive"
    >
      <div className="bg-amber-500 text-black shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-600/30 rounded-full">
                <WifiOff size={20} />
              </div>
              <div>
                <div className="font-semibold flex items-center gap-2">
                  <AlertTriangle size={16} />
                  You're offline
                </div>
                <div className="text-sm text-amber-900">
                  Some features may be unavailable until you reconnect.
                </div>
              </div>
            </div>
            
            {dismissible && (
              <button
                onClick={() => setDismissed(true)}
                className="p-1 hover:bg-amber-600/30 rounded-full transition-colors"
                aria-label="Dismiss"
              >
                <X size={20} />
              </button>
            )}
          </div>
          
          {showDetails && (
            <div className="mt-3 pt-3 border-t border-amber-600/30">
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Cloud size={14} className="text-red-700" />
                  <span className="text-amber-900">API scraping unavailable</span>
                </div>
                <div className="flex items-center gap-2">
                  <Database size={14} className="text-emerald-700" />
                  <span className="text-amber-900">Local data still works</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Hook to track online/offline status
 */
export const useOnlineStatus = (): boolean => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};

export default OfflineIndicator;

