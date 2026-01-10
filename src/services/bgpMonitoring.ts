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
import { rpkiValidator } from './rpkiValidation';
import type { BGPPrefixBaselineRecord } from '../db/database';
import { apiUrl } from '../config/apiBase';
import { telemetryBus } from './telemetryBus';

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
  // Accuracy hardening (best-effort, async):
  rpkiState?: 'valid' | 'invalid' | 'not_found' | 'unsupported' | 'error';
  rpkiReason?: string;
  peerCount?: number;
  warmupSuppressed?: boolean;
  corroborationStatus?: 'confirmed' | 'pending' | 'unconfirmed' | 'error';
  corroborationSources?: string[];
  corroborationDetails?: unknown;
  corroborationCheckedAt?: number;
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
  private baselineLoaded = false;
  private warmupUntil = 0;
  private warmupWindowMs = 12 * 60 * 1000;
  private minPeersForAlert = 5;
  private observationWindowMs = 2 * 60 * 1000;
  private anomalyObservations = new Map<string, { peers: Set<string>; firstSeen: number }>();
  private routeViewsCorroborationEnabled = true;
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
          (async () => {
            console.log('BGP: Connected to RIPE RIS Live');
            this.state.isConnected = true;
            this.state.connectionAttempts = 0;

            // Warmup + baseline load to reduce cold-start false positives
            this.warmupUntil = Date.now() + this.warmupWindowMs;
            await this.loadBaseline();

            // Subscribe to updates
            this.subscribe();

            // Start keepalive ping
            this.startPing();

            resolve();
          })().catch(reject);
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
            this.detectAnomalies(prefix, path, originASN, message.data.timestamp, message.data.peer_asn);
            
            // Update tracking
            this.knownPrefixes.add(prefix);
            this.prefixPaths.set(prefix, [...path]);
            this.prefixOrigins.set(prefix, originASN);

            void this.persistBaseline(prefix, originASN, provider || (involvedASN ? this.state.watchedASNs.get(String(involvedASN)) : undefined), path, message.data.peer_asn);
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
    timestamp: number,
    peerAsn: string
  ): void {
    const provider = this.state.watchedASNs.get(originASN) || 'Unknown';
    const now = Date.now();
    
    // NEW PREFIX DETECTION
    if (!this.knownPrefixes.has(prefix)) {
      // During warmup, treat as baseline-building (avoid noisy "new" alerts).
      if (now < this.warmupUntil || !this.baselineLoaded) {
        // Still persist baseline via caller
        return;
      }

      const candidateKey = `new_prefix|${prefix}|${originASN}`;
      if (!this.observePeers(candidateKey, peerAsn)) return;

      this.createAnomaly({
        type: 'new_prefix',
        prefix,
        asn: originASN,
        provider,
        timestamp: timestamp * 1000,
        currentPath: path,
        significance: 'high',
        description: `New prefix announced: ${prefix} from AS${originASN}`,
        businessInference: `${provider} infrastructure expansion - new network segment deployed`,
        peerCount: this.getPeerCount(candidateKey),
      });
      return;
    }
    
    // PATH CHANGE DETECTION
    const previousPath = this.prefixPaths.get(prefix);
    if (previousPath) {
      const pathLengthChange = Math.abs(path.length - previousPath.length);
      
      // Unusual path length change (3+ hops)
      if (pathLengthChange >= 3) {
        const candidateKey = `unusual_path|${prefix}|${originASN}`;
        if (!this.observePeers(candidateKey, peerAsn)) {
          return;
        }
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
          businessInference: 'Significant routing change - possible peering adjustment or network restructuring',
          peerCount: this.getPeerCount(candidateKey),
        });
      }
      
      // Origin change detection (route leak indicator)
      const previousOrigin = previousPath[previousPath.length - 1];
      const currentOrigin = path[path.length - 1];
      if (previousOrigin !== currentOrigin) {
        const candidateKey = `origin_change|${prefix}|${previousOrigin}->${currentOrigin}`;
        if (!this.observePeers(candidateKey, peerAsn)) {
          return;
        }
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
          businessInference: 'Potential route leak or intentional origin change - investigate immediately',
          peerCount: this.getPeerCount(candidateKey),
        });
      }
    }
  }

  private observePeers(candidateKey: string, peerAsn: string): boolean {
    const now = Date.now();
    const existing = this.anomalyObservations.get(candidateKey);
    if (existing && now - existing.firstSeen > this.observationWindowMs) {
      this.anomalyObservations.delete(candidateKey);
    }

    const next = this.anomalyObservations.get(candidateKey) ?? { peers: new Set<string>(), firstSeen: now };
    next.peers.add(String(peerAsn || ''));
    this.anomalyObservations.set(candidateKey, next);

    // Require N unique peers before alerting (reduces localized artifacts)
    return next.peers.size >= this.minPeersForAlert;
  }

  private getPeerCount(candidateKey: string): number | undefined {
    const entry = this.anomalyObservations.get(candidateKey);
    return entry ? entry.peers.size : undefined;
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
      // Best-effort RPKI validation (IPv4 only for now)
      const rpki = await rpkiValidator.validateRoute(anomaly.prefix, anomaly.asn);
      anomaly.rpkiState = rpki.state;
      anomaly.rpkiReason = rpki.reason;

      // Second-source corroboration (best-effort) for critical origin changes
      if (
        this.routeViewsCorroborationEnabled &&
        anomaly.type === 'origin_change' &&
        anomaly.significance === 'critical'
      ) {
        await this.corroborateWithRouteViews(anomaly);
      }

      // Emit telemetry for Incident Command triage (append-only).
      // This lets Incident Command apply conservative confirmation gates using verification fields.
      const toTelemetrySeverity = (sig: BGPAnomaly['significance']) => {
        if (sig === 'critical') return 'critical';
        if (sig === 'high') return 'high';
        if (sig === 'medium') return 'medium';
        return 'low';
      };

      void telemetryBus.emit({
        source: 'bgp',
        type: 'bgp_anomaly',
        severity: toTelemetrySeverity(anomaly.significance),
        title: `BGP ${anomaly.type}`,
        summary: `${anomaly.prefix} • AS${anomaly.asn} • ${anomaly.significance}`,
        correlationId: `bgp:${anomaly.type}:${anomaly.prefix}:${anomaly.asn}`,
        payload: {
          anomalyId: anomaly.id,
          prefix: anomaly.prefix,
          asn: anomaly.asn,
          provider: anomaly.provider,
          anomalyType: anomaly.type,
          significance: anomaly.significance,
          rpkiState: anomaly.rpkiState,
          rpkiReason: anomaly.rpkiReason,
          corroborationStatus: anomaly.corroborationStatus,
          corroborationCheckedAt: anomaly.corroborationCheckedAt,
          peerCount: anomaly.peerCount,
        },
        // Dedup within a minute window for same prefix/type/asn to avoid floods
        fingerprint: [
          'bgp_anomaly',
          anomaly.type,
          anomaly.prefix,
          anomaly.asn,
          String(Math.floor((anomaly.timestamp || Date.now()) / 60_000)),
        ].join('|'),
        timestamp: anomaly.timestamp || Date.now(),
      });

      await db.bgpAnomalies?.add(anomaly);
    } catch (error) {
      // Table may not exist, create it
      console.warn('BGP: Could not persist anomaly', error);
    }
  }

  private async corroborateWithRouteViews(anomaly: BGPAnomaly): Promise<void> {
    const checkedAt = Date.now();
    anomaly.corroborationCheckedAt = checkedAt;
    anomaly.corroborationSources = ['ris-live', 'routeviews'];

    try {
      const prefixEncoded = encodeURIComponent(anomaly.prefix);
      const res = await fetch(apiUrl(`/api/routeviews/prefix/${prefixEncoded}`), { signal: AbortSignal.timeout(12_000) });

      if (!res.ok) {
        anomaly.corroborationStatus = 'error';
        anomaly.corroborationDetails = { status: res.status };
        void telemetryBus.emit({
          source: 'bgp',
          type: 'routeviews_corroboration_failed',
          severity: 'medium',
          title: 'RouteViews corroboration failed',
          summary: `HTTP ${res.status} for ${anomaly.prefix}`,
          payload: {
            prefix: anomaly.prefix,
            asn: anomaly.asn,
            anomalyId: anomaly.id,
            status: res.status,
          },
          fingerprint: ['routeviews_failed', anomaly.prefix, anomaly.asn, String(res.status)].join('|'),
          timestamp: checkedAt,
        });
        return;
      }

      const data = (await res.json()) as unknown;

      // RouteViews response is an array of route observations (observed in practice)
      const origins = new Set<string>();
      if (Array.isArray(data)) {
        for (const row of data) {
          if (!row || typeof row !== 'object') continue;
          const r = row as Record<string, unknown>;
          if (typeof r.origin_asn === 'number') origins.add(String(r.origin_asn));
          if (typeof r.origin_asn === 'string') origins.add(r.origin_asn);
        }
      }

      const suspectedOrigin = String(anomaly.asn);
      if (origins.size === 0) {
        anomaly.corroborationStatus = 'pending';
      } else if (origins.has(suspectedOrigin)) {
        anomaly.corroborationStatus = 'confirmed';
      } else {
        anomaly.corroborationStatus = 'unconfirmed';
      }

      anomaly.corroborationDetails = {
        routeviewsOrigins: Array.from(origins).slice(0, 25),
      };
    } catch (e) {
      anomaly.corroborationStatus = 'error';
      anomaly.corroborationDetails = { message: e instanceof Error ? e.message : String(e) };
      const msg = e instanceof Error ? e.message : String(e);
      void telemetryBus.emit({
        source: 'bgp',
        type: 'routeviews_corroboration_failed',
        severity: 'medium',
        title: 'RouteViews corroboration failed',
        summary: msg,
        payload: {
          prefix: anomaly.prefix,
          asn: anomaly.asn,
          anomalyId: anomaly.id,
          message: msg,
        },
        fingerprint: ['routeviews_failed', anomaly.prefix, anomaly.asn, msg].join('|'),
        timestamp: checkedAt,
      });
    }
  }

  private async loadBaseline(): Promise<void> {
    try {
      const watched = Array.from(this.state.watchedASNs.keys());
      // Load baseline per watched origin ASN; keep it bounded per ASN.
      await Promise.all(
        watched.map(async (asn) => {
          const rows = await db.bgpPrefixBaselines
            .where('originAsn')
            .equals(asn)
            .limit(50_000)
            .toArray();
          for (const r of rows) {
            this.knownPrefixes.add(r.prefix);
            this.prefixOrigins.set(r.prefix, r.originAsn);
            if (r.lastPath) this.prefixPaths.set(r.prefix, r.lastPath);
          }
        }),
      );
      this.baselineLoaded = true;
      console.log(`BGP: Loaded prefix baseline for ${watched.length} ASNs`);
    } catch (e) {
      // If baseline isn't available, warmup still protects us
      this.baselineLoaded = false;
    }
  }

  private async persistBaseline(
    prefix: string,
    originAsn: string,
    provider: string | undefined,
    path: number[],
    peerAsn: string,
  ): Promise<void> {
    // Only persist baselines for watched origin ASNs (keeps size sane)
    if (!this.state.watchedASNs.has(originAsn)) return;
    const id = `${originAsn}|${prefix}`;
    const now = Date.now();
    const record: BGPPrefixBaselineRecord = {
      id,
      prefix,
      originAsn,
      provider,
      firstSeen: now,
      lastSeen: now,
      lastPath: path,
      lastPeerAsn: peerAsn,
    };
    try {
      const existing = await db.bgpPrefixBaselines.get(id);
      if (existing) {
        await db.bgpPrefixBaselines.update(id, {
          lastSeen: now,
          lastPath: path,
          lastPeerAsn: peerAsn,
          provider: provider ?? existing.provider,
        });
      } else {
        await db.bgpPrefixBaselines.put(record);
      }
    } catch {
      // ignore; monitoring must not crash app
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

