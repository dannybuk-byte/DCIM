/**
 * BGP Sanctions Monitor Hook
 * Integrates with existing RIPE RIS Live infrastructure
 * to detect routing through sanctioned ASNs
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { SANCTIONED_ASNS } from '../services/riskScoring';
import type { SanctionedASN } from '../types/sanctions';

interface BGPUpdate {
  type: 'UPDATE' | 'ANNOUNCE' | 'WITHDRAW';
  timestamp: number;
  peer: string;
  path: number[];
  prefix?: string;
  origin?: number;
}

interface SanctionedRouteAlert {
  id: string;
  timestamp: number;
  prefix: string;
  sanctionedASN: SanctionedASN;
  pathPosition: 'ORIGIN' | 'TRANSIT' | 'PEER';
  fullPath: number[];
  severity: 'CRITICAL' | 'HIGH' | 'MODERATE';
  description: string;
}

interface UseBGPSanctionsMonitorReturn {
  isConnected: boolean;
  alerts: SanctionedRouteAlert[];
  totalUpdates: number;
  sanctionedRouteCount: number;
  clearAlerts: () => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Hook to monitor BGP routes for sanctioned ASN involvement
 */
export function useBGPSanctionsMonitor(
  autoConnect = true
): UseBGPSanctionsMonitorReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [alerts, setAlerts] = useState<SanctionedRouteAlert[]>([]);
  const [totalUpdates, setTotalUpdates] = useState(0);
  const [ws, setWs] = useState<WebSocket | null>(null);

  // Check if AS path contains any sanctioned ASNs
  const checkPathForSanctions = useCallback((path: number[]): SanctionedRouteAlert | null => {
    if (!path || path.length === 0) return null;

    for (let i = 0; i < path.length; i++) {
      const asn = path[i];
      const asnKey = `AS${asn}`;
      const sanctioned = SANCTIONED_ASNS.find(s => s.asn === asnKey);

      if (sanctioned) {
        let pathPosition: SanctionedRouteAlert['pathPosition'];
        let severity: SanctionedRouteAlert['severity'];

        if (i === path.length - 1) {
          // Origin AS is sanctioned - CRITICAL
          pathPosition = 'ORIGIN';
          severity = sanctioned.risk === 'CRITICAL' ? 'CRITICAL' : 'HIGH';
        } else if (i === 0) {
          // Peer AS is sanctioned - HIGH
          pathPosition = 'PEER';
          severity = 'HIGH';
        } else {
          // Transit through sanctioned AS - MODERATE to HIGH
          pathPosition = 'TRANSIT';
          severity = sanctioned.risk === 'CRITICAL' ? 'HIGH' : 'MODERATE';
        }

        return {
          id: `${Date.now()}-${asn}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
          prefix: '', // Will be filled by caller
          sanctionedASN: sanctioned,
          pathPosition,
          fullPath: path,
          severity,
          description: `${pathPosition} AS${asn} (${sanctioned.name}) detected in BGP path - ${sanctioned.country} ${sanctioned.risk} risk`,
        };
      }
    }

    return null;
  }, []);

  // Process incoming BGP update
  const processBGPUpdate = useCallback((update: BGPUpdate) => {
    setTotalUpdates(prev => prev + 1);

    if (update.path && update.path.length > 0) {
      const alert = checkPathForSanctions(update.path);
      if (alert && update.prefix) {
        alert.prefix = update.prefix;
        setAlerts(prev => {
          // Keep last 100 alerts
          const newAlerts = [alert, ...prev].slice(0, 100);
          return newAlerts;
        });
      }
    }
  }, [checkPathForSanctions]);

  // Connect to RIPE RIS Live
  const connect = useCallback(() => {
    if (ws) {
      ws.close();
    }

    try {
      const socket = new WebSocket('wss://ris-live.ripe.net/v1/ws/?client=dcim-sanctions-monitor');

      socket.onopen = () => {
        console.log('[BGP Sanctions] Connected to RIPE RIS Live');
        setIsConnected(true);

        // Subscribe to all BGP updates
        socket.send(JSON.stringify({
          type: 'ris_subscribe',
          data: {
            moreSpecific: true,
            type: 'UPDATE',
            socketOptions: {
              includeRaw: false,
            },
          },
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ris_message' && data.data) {
            const update: BGPUpdate = {
              type: data.data.type || 'UPDATE',
              timestamp: data.data.timestamp * 1000 || Date.now(),
              peer: data.data.peer || '',
              path: data.data.path || [],
              prefix: data.data.prefix,
              origin: data.data.path?.[data.data.path.length - 1],
            };
            processBGPUpdate(update);
          }
        } catch (error) {
          console.error('[BGP Sanctions] Parse error:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('[BGP Sanctions] WebSocket error:', error);
      };

      socket.onclose = () => {
        console.log('[BGP Sanctions] Disconnected');
        setIsConnected(false);
        // Auto-reconnect after 5 seconds
        setTimeout(() => {
          if (autoConnect) {
            connect();
          }
        }, 5000);
      };

      setWs(socket);
    } catch (error) {
      console.error('[BGP Sanctions] Connection error:', error);
    }
  }, [ws, autoConnect, processBGPUpdate]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (ws) {
      ws.close();
      setWs(null);
    }
  }, [ws]);

  // Clear alerts
  const clearAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []); // Only run on mount

  // Memoized sanctioned route count
  const sanctionedRouteCount = useMemo(() => alerts.length, [alerts]);

  return {
    isConnected,
    alerts,
    totalUpdates,
    sanctionedRouteCount,
    clearAlerts,
    connect,
    disconnect,
  };
}

/**
 * Check if a specific ASN is sanctioned
 */
export function isASNSanctioned(asn: number | string): SanctionedASN | null {
  const normalized = typeof asn === 'number' ? `AS${asn}` : (asn.toUpperCase().startsWith('AS') ? asn.toUpperCase() : `AS${asn}`);
  return SANCTIONED_ASNS.find(s => s.asn === normalized) || null;
}

/**
 * Get sanctioned ASNs by country
 */
export function getSanctionedASNsByCountry(countryCode: string): SanctionedASN[] {
  return SANCTIONED_ASNS.filter(s => s.country === countryCode.toUpperCase());
}

/**
 * Get sanctioned ASNs by risk level
 */
export function getSanctionedASNsByRisk(risk: 'CRITICAL' | 'HIGH' | 'MODERATE'): SanctionedASN[] {
  return SANCTIONED_ASNS.filter(s => s.risk === risk);
}

