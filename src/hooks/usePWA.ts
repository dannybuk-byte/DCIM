/**
 * PWA Hook - Installation, offline detection, and update management
 * 
 * Provides:
 * - Install prompt handling
 * - Online/offline status
 * - Service worker update notifications
 * - Cache statistics
 */

import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  installPrompt: BeforeInstallPromptEvent | null;
}

interface PWAActions {
  install: () => Promise<boolean>;
  updateServiceWorker: () => void;
  clearCache: () => Promise<void>;
}

interface CacheStats {
  totalSize: number;
  entryCount: number;
  caches: { name: string; count: number; size: number }[];
}

export function usePWA(): PWAState & PWAActions & { cacheStats: CacheStats | null } {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);

  // Check if already installed as PWA
  useEffect(() => {
    const checkInstalled = () => {
      // Check if running in standalone mode (installed PWA)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches
        || (window.navigator as any).standalone === true
        || document.referrer.includes('android-app://');
      setIsInstalled(isStandalone);
    };

    checkInstalled();

    // Listen for display mode changes
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', checkInstalled);
    return () => mediaQuery.removeEventListener('change', checkInstalled);
  }, []);

  // Capture install prompt
  useEffect(() => {
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  // Track app installed event
  useEffect(() => {
    const handleInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('appinstalled', handleInstalled);
    return () => window.removeEventListener('appinstalled', handleInstalled);
  }, []);

  // Online/offline detection
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

  // Service worker update detection
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        setRegistration(reg);

        // Check for updates periodically
        const interval = setInterval(() => {
          reg.update().catch(console.error);
        }, 60 * 60 * 1000); // Every hour

        return () => clearInterval(interval);
      });

      // Listen for new service worker
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        setIsUpdateAvailable(true);
      });
    }
  }, []);

  // Calculate cache statistics
  useEffect(() => {
    const calculateCacheStats = async () => {
      if (!('caches' in window)) return;

      try {
        const cacheNames = await caches.keys();
        const stats: CacheStats = {
          totalSize: 0,
          entryCount: 0,
          caches: []
        };

        for (const cacheName of cacheNames) {
          const cache = await caches.open(cacheName);
          const keys = await cache.keys();
          let cacheSize = 0;

          // Estimate size (can't get exact size without reading all responses)
          for (const request of keys.slice(0, 20)) { // Sample first 20
            try {
              const response = await cache.match(request);
              if (response) {
                const blob = await response.clone().blob();
                cacheSize += blob.size;
              }
            } catch {
              // Ignore errors
            }
          }

          // Extrapolate if sampled
          if (keys.length > 20) {
            cacheSize = Math.round(cacheSize * (keys.length / 20));
          }

          stats.caches.push({
            name: cacheName,
            count: keys.length,
            size: cacheSize
          });

          stats.totalSize += cacheSize;
          stats.entryCount += keys.length;
        }

        setCacheStats(stats);
      } catch (error) {
        console.error('Failed to calculate cache stats:', error);
      }
    };

    calculateCacheStats();

    // Recalculate periodically
    const interval = setInterval(calculateCacheStats, 5 * 60 * 1000); // Every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Install action
  const install = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) return false;

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  }, [installPrompt]);

  // Update service worker
  const updateServiceWorker = useCallback(() => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    window.location.reload();
  }, [registration]);

  // Clear all caches
  const clearCache = useCallback(async () => {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      setCacheStats({ totalSize: 0, entryCount: 0, caches: [] });
    }
  }, []);

  return {
    isInstallable: !!installPrompt && !isInstalled,
    isInstalled,
    isOnline,
    isUpdateAvailable,
    installPrompt,
    install,
    updateServiceWorker,
    clearCache,
    cacheStats
  };
}

// Format bytes to human readable
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default usePWA;

