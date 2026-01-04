/**
 * useOfflineStatus - Hook for monitoring online/offline status
 * 
 * Provides a simple way for components to respond to connectivity changes.
 * Antifragile: Always defaults to 'online' assumption to avoid blocking features.
 */

import React, { useState, useEffect, useCallback } from 'react';

export interface OfflineStatusResult {
  isOnline: boolean;
  isOffline: boolean;
  lastOnlineAt: Date | null;
  checkConnection: () => Promise<boolean>;
}

export function useOfflineStatus(): OfflineStatusResult {
  const [isOnline, setIsOnline] = useState(() => {
    // Default to online - antifragile assumption
    if (typeof navigator === 'undefined') return true;
    return navigator.onLine ?? true;
  });
  
  const [lastOnlineAt, setLastOnlineAt] = useState<Date | null>(
    () => isOnline ? new Date() : null
  );

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setLastOnlineAt(new Date());
    };
    
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Active connection check (for when navigator.onLine is unreliable)
  const checkConnection = useCallback(async (): Promise<boolean> => {
    try {
      // Try to fetch a small resource
      const response = await fetch('/favicon.ico', {
        method: 'HEAD',
        cache: 'no-store',
      });
      const online = response.ok;
      setIsOnline(online);
      if (online) setLastOnlineAt(new Date());
      return online;
    } catch {
      setIsOnline(false);
      return false;
    }
  }, []);

  return {
    isOnline,
    isOffline: !isOnline,
    lastOnlineAt,
    checkConnection,
  };
}

/**
 * Simple offline indicator component
 */
export function OfflineIndicator() {
  const { isOffline } = useOfflineStatus();
  
  if (!isOffline) return null;
  
  return (
    <div className="fixed bottom-4 left-4 z-50 px-3 py-2 bg-amber-600 text-white rounded-lg shadow-lg text-sm flex items-center gap-2">
      <span className="w-2 h-2 bg-amber-300 rounded-full animate-pulse" />
      Working Offline
    </div>
  );
}

