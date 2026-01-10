/**
 * React hook for Certificate Transparency monitoring
 * 
 * Provides reactive state for CT connection status and alerts.
 */

import { useState, useEffect, useCallback } from 'react';
import { ctMonitoring, CTConnectionState, CTAlert } from '../services/ctMonitoring';

interface UseCTMonitoringReturn {
  /** Current connection state */
  state: CTConnectionState;
  /** Recent alerts (last 50) */
  recentAlerts: CTAlert[];
  /** Processing statistics */
  stats: {
    certificatesProcessed: number;
    alertsGenerated: number;
    lastCertificateAt: number;
    connectionStartedAt: number;
  };
  /** Connect to CertStream */
  connect: () => void;
  /** Disconnect from CertStream */
  disconnect: () => void;
  /** Clear recent alerts */
  clearAlerts: () => void;
}

const MAX_ALERTS = 50;

export function useCTMonitoring(): UseCTMonitoringReturn {
  const [state, setState] = useState<CTConnectionState>(ctMonitoring.getState());
  const [recentAlerts, setRecentAlerts] = useState<CTAlert[]>([]);
  const [stats, setStats] = useState(ctMonitoring.getStats());

  useEffect(() => {
    // Subscribe to state changes
    const unsubscribeState = ctMonitoring.onStateChange((newState) => {
      setState(newState);
      setStats(ctMonitoring.getStats());
    });

    // Subscribe to alerts
    const unsubscribeAlert = ctMonitoring.onAlert((alert) => {
      setRecentAlerts((prev) => {
        const updated = [alert, ...prev];
        return updated.slice(0, MAX_ALERTS);
      });
      setStats(ctMonitoring.getStats());
    });

    // Poll stats every 5 seconds while connected
    const statsInterval = setInterval(() => {
      if (ctMonitoring.getState() === 'connected') {
        setStats(ctMonitoring.getStats());
      }
    }, 5000);

    return () => {
      unsubscribeState();
      unsubscribeAlert();
      clearInterval(statsInterval);
    };
  }, []);

  const connect = useCallback(() => {
    ctMonitoring.connect();
  }, []);

  const disconnect = useCallback(() => {
    ctMonitoring.disconnect();
  }, []);

  const clearAlerts = useCallback(() => {
    setRecentAlerts([]);
  }, []);

  return {
    state,
    recentAlerts,
    stats,
    connect,
    disconnect,
    clearAlerts,
  };
}
