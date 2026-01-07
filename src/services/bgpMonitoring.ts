/**
 * BGP Monitoring Service
 * 
 * Real-time BGP monitoring via RIPE RIS Live WebSocket.
 * Detects infrastructure expansion signals from Big Tech providers.
 * 
 * @module bgpMonitoring
 * @version 1.0.0
 */

import { db } from '../db/database';

// ============================================================================
// TYPES
// ============================================================================

export interface BGPMessage {
  type: 'ris_message';
  data: {
    timestamp: number;
    peer: string;
    peer_asn: string;
    id: string;
    host: string;
    type: 'UPDATE' | 'WITHDRAW' | 'STATE';
    path?: number[];
    announcements?: Array<{
      next_hop: string;
      prefixes: string[];
    }>;
    withdrawals?: string[];
  };
}

export interface BGPAnomaly {
  id: string;
  timestamp: number;
  type: 'new_prefix' | 'route_leak' | 'unusual_path' | 'withdrawal' | 'origin_change';
  prefix: string;
  asn: string;
  provider: string;
  previousPath?: number[];
  currentPath?: number[];
  significance: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  businessInference: string;
}

export interface BGPStats {
  announcements: number;
  withdrawals: number;
  uniquePrefixes: number;
  anomaliesDetected: number;
}

export interface BGPMonitoringState {
  isConnected: boolean;
  lastUpdate: number | null;
  messagesReceived: number;
  anomalies: BGPAnomaly[];
  watchedASNs: Map<string, string>;
  routeStats: BGPStats;
  connectionAttempts: number;
}

type MessageHandler = (message: BGPMessage) => void;
type AnomalyHandler = (anomaly: BGPAnomaly) => void;

// ============================================================================
// CONSTANTS
// ============================================================================

/** RIPE RIS Live WebSocket endpoint */
const RIPE_WS_URL = 'wss://ris-live.ripe.net/v1/ws/';

/** Major cloud/tech provider ASNs to monitor */
export const WATCHED_ASNS: Record<string, string> = {
  '16509': 'Amazon (AWS)',
  '14618': 'Amazon (AWS GovCloud)',
  '8075': 'Microsoft',
  '8068': 'Microsoft (Corporate)',
  '15169': 'Google',
  '396982': 'Google (Cloud)',
  '32934': 'Meta (Facebook)',
  '63293': 'Meta (WhatsApp)',
  '714': 'Apple',
  '6185': 'Apple (CDN)',
  '13335': 'Cloudflare',
  '20940': 'Akamai',
  '16625': 'Akamai (SureRoute)',
  '36351': 'IBM (SoftLayer)',
  '19527': 'Alibaba Cloud',
  '45102': 'Alibaba (US)',
  '396356': 'Oracle Cloud',
  '24940': 'Hetzner',
  '13238': 'Yandex',
  '32244': 'Equinix',
  '21859': 'Zayo',
  '6939': 'Hurricane Electric',
  '3356': 'Lumen (CenturyLink)',
};

// ============================================================================
// BGP MONITORING SERVICE (SINGLETON)
// ============================================================================

/**
 * BGP Monitoring Service for real-time infrastructure expansion detection
 */
class BGPMonitoringService {
  private ws: WebSocket | null = null;
  private state: BGPMonitoringState;
  private messageHandlers: Set<MessageHandler> = new Set();
  private anomalyHandlers: Set<AnomalyHandler> = new Set();
  private knownPrefixes: Set<string> = new Set();
  private prefixPaths: Map<string, number[]> = new Map();
  private prefixOrigins: Map<string, string> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;

  constructor() {
    this.state = {
      isConnected: false,
      lastUpdate: null,
      messagesReceived: 0,
      anomalies: [],
      watchedASNs: new Map(Object.entries(WATCHED_ASNS)),
      routeStats: {
        announcements: 0,
        withdrawals: 0,
        uniquePrefixes: 0,
        anomaliesDetected: 0
      },
      connectionAttempts: 0
    };
  }

  /**
   * Connect to RIPE RIS Live WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('BGP: Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(RIPE_WS_URL);

        this.ws.onopen = () => {
          console.log('BGP: Connected to RIPE RIS Live');
          this.state.isConnected = true;
          this.state.connectionAttempts = 0;
          
          // Subscribe to updates
          this.subscribe();
          
          // Start keepalive ping
          this.startPing();
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          console.error('BGP: WebSocket error', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('BGP: Connection closed', event.code, event.reason);
          this.state.isConnected = false;
          this.stopPing();
          
          // Attempt reconnection with exponential backoff
          if (this.state.connectionAttempts < this.maxReconnectAttempts) {
            const delay = this.baseReconnectDelay * Math.pow(2, this.state.connectionAttempts);
            console.log(`BGP: Reconnecting in ${delay}ms (attempt ${this.state.connectionAttempts + 1})`);
            this.reconnectTimer = setTimeout(() => {
              this.state.connectionAttempts++;
              this.connect().catch(console.error);
            }, delay);
          } else {
            console.error('BGP: Max reconnection attempts reached');
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Subscribe to BGP updates
   */
  private subscribe(): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    // Subscribe to all RIS collectors for watched ASNs
    const subscription = {
      type: 'ris_subscribe',
      data: {
        moreSpecific: true,
        lessSpecific: false,
        socketOptions: {
          includeRaw: false
        }
      }
    };

    this.ws.send(JSON.stringify(subscription));
    console.log('BGP: Subscribed to RIS updates');
  }

  /**
   * Start keepalive ping
   */
  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ris_ping' }));
      }
    }, 30000);
  }

  /**
   * Stop keepalive ping
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as BGPMessage;
      
      if (message.type !== 'ris_message') return;
      
      this.state.messagesReceived++;
      this.state.lastUpdate = Date.now();
      
      // Check if this involves a watched ASN
      const path = message.data.path || [];
      const originASN = path.length > 0 ? String(path[path.length - 1]) : '';
      const provider = this.state.watchedASNs.get(originASN);
      
      // Also check if any watched ASN is in the path
      const involvedASN = path.find(asn => this.state.watchedASNs.has(String(asn)));
      
      if (!provider && !involvedASN) return; // Not a watched ASN
      
      // Process announcements
      if (message.data.type === 'UPDATE' && message.data.announcements) {
        for (const announcement of message.data.announcements) {
          for (const prefix of announcement.prefixes) {
            this.state.routeStats.announcements++;
            
            // Check for anomalies
            this.detectAnomalies(prefix, path, originASN, message.data.timestamp);
            
            // Update tracking
            this.knownPrefixes.add(prefix);
            this.prefixPaths.set(prefix, [...path]);
            this.prefixOrigins.set(prefix, originASN);
          }
        }
        this.state.routeStats.uniquePrefixes = this.knownPrefixes.size;
      }
      
      // Process withdrawals
      if (message.data.withdrawals) {
        for (const prefix of message.data.withdrawals) {
          this.state.routeStats.withdrawals++;
          
          if (this.knownPrefixes.has(prefix)) {
            const previousOrigin = this.prefixOrigins.get(prefix);
            if (previousOrigin && this.state.watchedASNs.has(previousOrigin)) {
              this.createAnomaly({
                type: 'withdrawal',
                prefix,
                asn: previousOrigin,
                provider: this.state.watchedASNs.get(previousOrigin) || 'Unknown',
                timestamp: message.data.timestamp * 1000,
                previousPath: this.prefixPaths.get(prefix),
                significance: 'medium',
                description: `Route withdrawal for ${prefix}`,
                businessInference: 'Possible decommissioning or network restructuring'
              });
            }
          }
        }
      }
      
      // Notify handlers
      this.messageHandlers.forEach(handler => handler(message));
      
    } catch (error) {
      console.error('BGP: Error processing message', error);
    }
  }

  /**
   * Detect anomalies in BGP updates
   */
  private detectAnomalies(
    prefix: string, 
    path: number[], 
    originASN: string,
    timestamp: number
  ): void {
    const provider = this.state.watchedASNs.get(originASN) || 'Unknown';
    
    // NEW PREFIX DETECTION
    if (!this.knownPrefixes.has(prefix)) {
      this.createAnomaly({
        type: 'new_prefix',
        prefix,
        asn: originASN,
        provider,
        timestamp: timestamp * 1000,
        currentPath: path,
        significance: 'high',
        description: `New prefix announced: ${prefix} from AS${originASN}`,
        businessInference: `${provider} infrastructure expansion - new network segment deployed`
      });
      return;
    }
    
    // PATH CHANGE DETECTION
    const previousPath = this.prefixPaths.get(prefix);
    if (previousPath) {
      const pathLengthChange = Math.abs(path.length - previousPath.length);
      
      // Unusual path length change (3+ hops)
      if (pathLengthChange >= 3) {
        this.createAnomaly({
          type: 'unusual_path',
          prefix,
          asn: originASN,
          provider,
          timestamp: timestamp * 1000,
          previousPath,
          currentPath: path,
          significance: pathLengthChange >= 5 ? 'critical' : 'medium',
          description: `Path length changed by ${pathLengthChange} hops for ${prefix}`,
          businessInference: 'Significant routing change - possible peering adjustment or network restructuring'
        });
      }
      
      // Origin change detection (route leak indicator)
      const previousOrigin = previousPath[previousPath.length - 1];
      const currentOrigin = path[path.length - 1];
      if (previousOrigin !== currentOrigin) {
        this.createAnomaly({
          type: 'origin_change',
          prefix,
          asn: String(currentOrigin),
          provider: this.state.watchedASNs.get(String(currentOrigin)) || provider,
          timestamp: timestamp * 1000,
          previousPath,
          currentPath: path,
          significance: 'critical',
          description: `Origin ASN changed from AS${previousOrigin} to AS${currentOrigin}`,
          businessInference: 'Potential route leak or intentional origin change - investigate immediately'
        });
      }
    }
  }

  /**
   * Create and store an anomaly
   */
  private createAnomaly(params: Omit<BGPAnomaly, 'id'>): void {
    const anomaly: BGPAnomaly = {
      ...params,
      id: `bgp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
    
    this.state.anomalies.push(anomaly);
    this.state.routeStats.anomaliesDetected++;
    
    // Keep only last 1000 anomalies in memory
    if (this.state.anomalies.length > 1000) {
      this.state.anomalies = this.state.anomalies.slice(-1000);
    }
    
    // Persist to IndexedDB
    this.persistAnomaly(anomaly);
    
    // Notify handlers
    this.anomalyHandlers.forEach(handler => handler(anomaly));
    
    console.log(`BGP ANOMALY [${anomaly.significance}]: ${anomaly.description}`);
  }

  /**
   * Persist anomaly to IndexedDB
   */
  private async persistAnomaly(anomaly: BGPAnomaly): Promise<void> {
    try {
      await db.bgpAnomalies?.add(anomaly);
    } catch (error) {
      // Table may not exist, create it
      console.warn('BGP: Could not persist anomaly', error);
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopPing();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    
    this.state.isConnected = false;
    console.log('BGP: Disconnected');
  }

  /**
   * Register message handler
   */
  onMessage(handler: MessageHandler): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  /**
   * Register anomaly handler
   */
  onAnomaly(handler: AnomalyHandler): () => void {
    this.anomalyHandlers.add(handler);
    return () => this.anomalyHandlers.delete(handler);
  }

  /**
   * Add ASN to watch list
   */
  watchASN(asn: string, name?: string): void {
    this.state.watchedASNs.set(asn, name || `AS${asn}`);
  }

  /**
   * Remove ASN from watch list
   */
  unwatchASN(asn: string): void {
    this.state.watchedASNs.delete(asn);
  }

  /**
   * Get current state
   */
  getState(): BGPMonitoringState {
    return { ...this.state };
  }

  /**
   * Get recent anomalies
   */
  getRecentAnomalies(limit: number = 50): BGPAnomaly[] {
    return this.state.anomalies.slice(-limit);
  }

  /**
   * Get anomalies by provider
   */
  getAnomaliesByProvider(provider: string): BGPAnomaly[] {
    return this.state.anomalies.filter(a => 
      a.provider.toLowerCase().includes(provider.toLowerCase())
    );
  }

  /**
   * Get anomalies by significance
   */
  getAnomaliesBySignificance(significance: BGPAnomaly['significance']): BGPAnomaly[] {
    return this.state.anomalies.filter(a => a.significance === significance);
  }

  /**
   * Clear all data
   */
  reset(): void {
    this.knownPrefixes.clear();
    this.prefixPaths.clear();
    this.prefixOrigins.clear();
    this.state.anomalies = [];
    this.state.routeStats = {
      announcements: 0,
      withdrawals: 0,
      uniquePrefixes: 0,
      anomaliesDetected: 0
    };
    this.state.messagesReceived = 0;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const bgpMonitor = new BGPMonitoringService();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for BGP monitoring
 */
export function useBGPMonitoring() {
  const [state, setState] = useState<BGPMonitoringState>(bgpMonitor.getState());
  const [recentAnomalies, setRecentAnomalies] = useState<BGPAnomaly[]>([]);

  useEffect(() => {
    // Update state periodically
    const interval = setInterval(() => {
      setState(bgpMonitor.getState());
      setRecentAnomalies(bgpMonitor.getRecentAnomalies(20));
    }, 1000);

    // Subscribe to anomalies
    const unsubscribe = bgpMonitor.onAnomaly((anomaly) => {
      setRecentAnomalies(prev => [...prev.slice(-19), anomaly]);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      await bgpMonitor.connect();
    } catch (error) {
      console.error('Failed to connect to BGP monitor', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    bgpMonitor.disconnect();
  }, []);

  const watchASN = useCallback((asn: string, name?: string) => {
    bgpMonitor.watchASN(asn, name);
  }, []);

  const unwatchASN = useCallback((asn: string) => {
    bgpMonitor.unwatchASN(asn);
  }, []);

  return {
    ...state,
    recentAnomalies,
    connect,
    disconnect,
    watchASN,
    unwatchASN
  };
}

