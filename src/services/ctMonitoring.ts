/**
 * Certificate Transparency Monitoring Service
 * 
 * Monitors CT logs for new certificates indicating facility deployments.
 * Uses CertStream WebSocket for real-time updates.
 * 
 * @module ctMonitoring
 * @version 1.0.0
 */

import { db } from '../db/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CTCertificate {
  sha256: string;
  commonName: string;
  domains: string[];
  issuer: string;
  loggedAt: number;
  notBefore: number;
  notAfter: number;
  alertType: 'facility_pattern' | 'new_subdomain' | 'wildcard' | 'renewal' | 'mass_issuance';
  provider?: string;
  geographicHint?: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  businessInference: string;
}

export interface CTStats {
  certificatesProcessed: number;
  alertsGenerated: number;
  watchedDomainMatches: number;
  facilityPatternsDetected: number;
}

export interface CTMonitoringState {
  isConnected: boolean;
  lastUpdate: number | null;
  certificatesProcessed: number;
  alerts: CTCertificate[];
  watchedDomains: Set<string>;
  stats: CTStats;
  connectionAttempts: number;
}

type AlertHandler = (cert: CTCertificate) => void;

// ============================================================================
// CONSTANTS
// ============================================================================

/** CertStream WebSocket endpoint */
const CERTSTREAM_WS_URL = 'wss://certstream.calidog.io/';

/** Domains of major data center operators and cloud providers */
export const WATCHED_DOMAINS: string[] = [
  // Cloud providers
  'amazonaws.com',
  'aws.amazon.com',
  'azure.com',
  'azure-api.net',
  'azureedge.net',
  'google.com',
  'googleapis.com',
  'gcp.com',
  'googlecloud.com',
  'cloud.google.com',
  'meta.com',
  'facebook.com',
  'fb.com',
  'whatsapp.com',
  'instagram.com',
  'apple.com',
  'icloud.com',
  'cloudflare.com',
  'cloudflare-dns.com',
  
  // Data center operators
  'equinix.com',
  'digitalrealty.com',
  'cyrusone.com',
  'coresite.com',
  'qts.com',
  'vantage-dc.com',
  'switch.com',
  'databank.com',
  'flexential.com',
  'compass-dc.com',
  'stackinfra.com',
  
  // Edge/CDN
  'akamai.com',
  'akamaized.net',
  'fastly.com',
  'cdn77.org',
  'edgecast.com'
];

/** Facility naming patterns */
const FACILITY_PATTERNS: RegExp[] = [
  // Geographic
  /^(us|eu|ap|sa|af|me)-(east|west|north|south|central)-\d+/i,
  /^(virginia|oregon|ohio|texas|california|frankfurt|ireland|singapore|tokyo|sydney)/i,
  /^(ash|iad|dfw|sjc|lax|fra|dub|sin|nrt|syd|hkg|bom|gru)\d*/i,
  
  // Infrastructure
  /^(dc|colo|pop|edge|node|cluster|zone|region)\d*/i,
  /^(prod|staging|dev|test)-(dc|infra|cluster|region)/i,
  
  // Facility identifiers
  /^facility-?\d+/i,
  /^site-?\d+/i,
  /^campus-?\d+/i,
  /^building-?\d+/i,
  /^rack-?\d+/i,
  
  // Data center codes
  /^[a-z]{2,4}\d{1,3}[a-z]?$/i,
  /^dc\d+[a-z]?/i
];

/** Geographic hints from patterns */
const GEO_HINTS: Record<string, string> = {
  'us-east': 'Virginia/N. Virginia',
  'us-west': 'Oregon/N. California',
  'eu-west': 'Ireland/UK',
  'eu-central': 'Frankfurt/Germany',
  'ap-northeast': 'Tokyo/Japan',
  'ap-southeast': 'Singapore/Sydney',
  'ap-south': 'Mumbai/India',
  'sa-east': 'São Paulo/Brazil',
  'ash': 'Ashburn, Virginia',
  'iad': 'Ashburn, Virginia',
  'dfw': 'Dallas, Texas',
  'sjc': 'San Jose, California',
  'lax': 'Los Angeles, California',
  'fra': 'Frankfurt, Germany',
  'dub': 'Dublin, Ireland',
  'sin': 'Singapore',
  'nrt': 'Tokyo, Japan',
  'syd': 'Sydney, Australia',
  'hkg': 'Hong Kong',
  'bom': 'Mumbai, India',
  'gru': 'São Paulo, Brazil'
};

// ============================================================================
// CT MONITORING SERVICE (SINGLETON)
// ============================================================================

/**
 * Certificate Transparency Monitoring Service
 */
class CTMonitoringService {
  private ws: WebSocket | null = null;
  private state: CTMonitoringState;
  private alertHandlers: Set<AlertHandler> = new Set();
  private seenHashes: Set<string> = new Set();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private maxReconnectAttempts = 5;
  private baseReconnectDelay = 1000;

  constructor() {
    this.state = {
      isConnected: false,
      lastUpdate: null,
      certificatesProcessed: 0,
      alerts: [],
      watchedDomains: new Set(WATCHED_DOMAINS),
      stats: {
        certificatesProcessed: 0,
        alertsGenerated: 0,
        watchedDomainMatches: 0,
        facilityPatternsDetected: 0
      },
      connectionAttempts: 0
    };
  }

  /**
   * Connect to CertStream WebSocket
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('CT: Already connected');
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(CERTSTREAM_WS_URL);

        this.ws.onopen = () => {
          console.log('CT: Connected to CertStream');
          this.state.isConnected = true;
          this.state.connectionAttempts = 0;
          
          // Start keepalive
          this.startPing();
          
          resolve();
        };

        this.ws.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.ws.onerror = (error) => {
          console.error('CT: WebSocket error', error);
          reject(error);
        };

        this.ws.onclose = (event) => {
          console.log('CT: Connection closed', event.code, event.reason);
          this.state.isConnected = false;
          this.stopPing();
          
          // Attempt reconnection
          if (this.state.connectionAttempts < this.maxReconnectAttempts) {
            const delay = this.baseReconnectDelay * Math.pow(2, this.state.connectionAttempts);
            console.log(`CT: Reconnecting in ${delay}ms`);
            this.reconnectTimer = setTimeout(() => {
              this.state.connectionAttempts++;
              this.connect().catch(console.error);
            }, delay);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Start keepalive ping
   */
  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        // CertStream doesn't require pings, but we'll check connection
        if (!this.state.lastUpdate || Date.now() - this.state.lastUpdate > 60000) {
          console.warn('CT: No updates for 60s, connection may be stale');
        }
      }
    }, 30000);
  }

  /**
   * Stop keepalive
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Handle incoming CertStream message
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const data = JSON.parse(event.data);
      
      if (data.message_type !== 'certificate_update') return;
      
      this.state.certificatesProcessed++;
      this.state.stats.certificatesProcessed++;
      this.state.lastUpdate = Date.now();
      
      const certData = data.data;
      const leafCert = certData.leaf_cert;
      
      if (!leafCert) return;
      
      // Extract domains
      const allNames: string[] = [
        leafCert.subject?.CN,
        ...(leafCert.extensions?.subjectAltName || [])
      ].filter(Boolean);
      
      // Check if any domain matches watched list
      const matchedDomain = this.findMatchedDomain(allNames);
      if (!matchedDomain) return;
      
      this.state.stats.watchedDomainMatches++;
      
      // Check for deduplication
      const fingerprint = leafCert.fingerprint;
      if (this.seenHashes.has(fingerprint)) return;
      this.seenHashes.add(fingerprint);
      
      // Keep seen hashes bounded
      if (this.seenHashes.size > 100000) {
        const arr = Array.from(this.seenHashes);
        this.seenHashes = new Set(arr.slice(-50000));
      }
      
      // Analyze certificate
      const alert = this.analyzeCertificate(
        fingerprint,
        leafCert.subject?.CN || '',
        allNames,
        certData.chain?.[0]?.subject?.O || leafCert.issuer?.O || 'Unknown',
        Date.now(),
        new Date(leafCert.not_before).getTime(),
        new Date(leafCert.not_after).getTime(),
        matchedDomain
      );
      
      if (alert) {
        this.state.alerts.push(alert);
        this.state.stats.alertsGenerated++;
        
        // Keep alerts bounded
        if (this.state.alerts.length > 1000) {
          this.state.alerts = this.state.alerts.slice(-1000);
        }
        
        // Persist and notify
        this.persistAlert(alert);
        this.alertHandlers.forEach(handler => handler(alert));
        
        console.log(`CT ALERT [${alert.significance}]: ${alert.commonName} - ${alert.alertType}`);
      }
      
    } catch (error) {
      // Silently ignore parse errors (high volume)
    }
  }

  /**
   * Find if any domain matches watched list
   */
  private findMatchedDomain(domains: string[]): string | null {
    for (const domain of domains) {
      if (!domain) continue;
      const lowerDomain = domain.toLowerCase();
      
      for (const watched of this.state.watchedDomains) {
        if (lowerDomain === watched || lowerDomain.endsWith('.' + watched)) {
          return watched;
        }
      }
    }
    return null;
  }

  /**
   * Analyze certificate for alerts
   */
  private analyzeCertificate(
    sha256: string,
    commonName: string,
    domains: string[],
    issuer: string,
    loggedAt: number,
    notBefore: number,
    notAfter: number,
    matchedDomain: string
  ): CTCertificate | null {
    // Determine provider
    const provider = this.identifyProvider(matchedDomain);
    
    // Check for facility patterns
    const facilityMatch = this.detectFacilityPattern(commonName, domains);
    const isWildcard = domains.some(d => d.startsWith('*.'));
    const isMassIssuance = domains.length > 10;
    
    // Determine alert type and significance
    let alertType: CTCertificate['alertType'] = 'new_subdomain';
    let significance: CTCertificate['significance'] = 'low';
    let businessInference = 'Standard certificate issuance';
    let geographicHint: string | undefined;
    
    if (facilityMatch) {
      alertType = 'facility_pattern';
      significance = 'high';
      this.state.stats.facilityPatternsDetected++;
      
      // Extract geographic hint
      geographicHint = this.extractGeoHint(facilityMatch);
      
      businessInference = geographicHint
        ? `New facility deployment detected in ${geographicHint} - infrastructure expansion indicator`
        : `New facility deployment detected (${facilityMatch}) - infrastructure expansion indicator`;
    } else if (isWildcard) {
      alertType = 'wildcard';
      significance = 'medium';
      businessInference = 'Wildcard certificate may cover new infrastructure deployments';
    } else if (isMassIssuance) {
      alertType = 'mass_issuance';
      significance = 'medium';
      businessInference = `Mass certificate issuance (${domains.length} domains) - possible major deployment`;
    }
    
    // Only return alerts for medium+ significance
    if (significance === 'low' && alertType === 'new_subdomain') {
      // Check if it's a potentially interesting subdomain
      const hasInfraKeyword = domains.some(d => 
        /\b(dc|colo|infra|cluster|node|edge|prod|api|internal)\b/i.test(d)
      );
      if (!hasInfraKeyword) return null;
      
      significance = 'low';
      businessInference = 'New infrastructure-related subdomain detected';
    }
    
    return {
      sha256,
      commonName,
      domains: domains.slice(0, 20), // Limit stored domains
      issuer,
      loggedAt,
      notBefore,
      notAfter,
      alertType,
      provider,
      geographicHint,
      significance,
      businessInference
    };
  }

  /**
   * Identify provider from domain
   */
  private identifyProvider(domain: string): string {
    const providerMap: Record<string, string> = {
      'amazonaws.com': 'Amazon (AWS)',
      'aws.amazon.com': 'Amazon (AWS)',
      'azure.com': 'Microsoft Azure',
      'azure-api.net': 'Microsoft Azure',
      'azureedge.net': 'Microsoft Azure',
      'google.com': 'Google',
      'googleapis.com': 'Google',
      'gcp.com': 'Google Cloud',
      'googlecloud.com': 'Google Cloud',
      'meta.com': 'Meta',
      'facebook.com': 'Meta',
      'apple.com': 'Apple',
      'icloud.com': 'Apple',
      'cloudflare.com': 'Cloudflare',
      'equinix.com': 'Equinix',
      'digitalrealty.com': 'Digital Realty',
      'cyrusone.com': 'CyrusOne',
      'coresite.com': 'CoreSite',
      'akamai.com': 'Akamai',
      'fastly.com': 'Fastly'
    };
    
    return providerMap[domain] || domain;
  }

  /**
   * Detect facility naming pattern
   */
  private detectFacilityPattern(commonName: string, domains: string[]): string | null {
    const allNames = [commonName, ...domains].filter(Boolean);
    
    for (const name of allNames) {
      // Extract subdomain parts
      const parts = name.split('.');
      for (const part of parts) {
        for (const pattern of FACILITY_PATTERNS) {
          if (pattern.test(part)) {
            return part;
          }
        }
      }
    }
    
    return null;
  }

  /**
   * Extract geographic hint from facility pattern
   */
  private extractGeoHint(pattern: string): string | undefined {
    const lowerPattern = pattern.toLowerCase();
    
    for (const [key, location] of Object.entries(GEO_HINTS)) {
      if (lowerPattern.includes(key)) {
        return location;
      }
    }
    
    return undefined;
  }

  /**
   * Persist alert to IndexedDB
   */
  private async persistAlert(alert: CTCertificate): Promise<void> {
    try {
      await db.ctAlerts?.add(alert);
    } catch (error) {
      console.warn('CT: Could not persist alert', error);
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
    console.log('CT: Disconnected');
  }

  /**
   * Register alert handler
   */
  onAlert(handler: AlertHandler): () => void {
    this.alertHandlers.add(handler);
    return () => this.alertHandlers.delete(handler);
  }

  /**
   * Add domain to watch list
   */
  watchDomain(domain: string): void {
    this.state.watchedDomains.add(domain.toLowerCase());
  }

  /**
   * Remove domain from watch list
   */
  unwatchDomain(domain: string): void {
    this.state.watchedDomains.delete(domain.toLowerCase());
  }

  /**
   * Get current state
   */
  getState(): CTMonitoringState {
    return {
      ...this.state,
      watchedDomains: new Set(this.state.watchedDomains)
    };
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 50): CTCertificate[] {
    return this.state.alerts.slice(-limit);
  }

  /**
   * Get alerts by provider
   */
  getAlertsByProvider(provider: string): CTCertificate[] {
    return this.state.alerts.filter(a => 
      a.provider?.toLowerCase().includes(provider.toLowerCase())
    );
  }

  /**
   * Get facility expansion alerts only
   */
  getFacilityAlerts(): CTCertificate[] {
    return this.state.alerts.filter(a => a.alertType === 'facility_pattern');
  }

  /**
   * Reset state
   */
  reset(): void {
    this.seenHashes.clear();
    this.state.alerts = [];
    this.state.certificatesProcessed = 0;
    this.state.stats = {
      certificatesProcessed: 0,
      alertsGenerated: 0,
      watchedDomainMatches: 0,
      facilityPatternsDetected: 0
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const ctMonitor = new CTMonitoringService();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for CT monitoring
 */
export function useCTMonitoring() {
  const [state, setState] = useState<CTMonitoringState>(ctMonitor.getState());
  const [recentAlerts, setRecentAlerts] = useState<CTCertificate[]>([]);

  useEffect(() => {
    // Update state periodically
    const interval = setInterval(() => {
      setState(ctMonitor.getState());
      setRecentAlerts(ctMonitor.getRecentAlerts(20));
    }, 1000);

    // Subscribe to alerts
    const unsubscribe = ctMonitor.onAlert((alert) => {
      setRecentAlerts(prev => [...prev.slice(-19), alert]);
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  const connect = useCallback(async () => {
    try {
      await ctMonitor.connect();
    } catch (error) {
      console.error('Failed to connect to CT monitor', error);
    }
  }, []);

  const disconnect = useCallback(() => {
    ctMonitor.disconnect();
  }, []);

  const watchDomain = useCallback((domain: string) => {
    ctMonitor.watchDomain(domain);
  }, []);

  const unwatchDomain = useCallback((domain: string) => {
    ctMonitor.unwatchDomain(domain);
  }, []);

  return {
    ...state,
    watchedDomains: Array.from(state.watchedDomains),
    recentAlerts,
    facilityAlerts: ctMonitor.getFacilityAlerts(),
    connect,
    disconnect,
    watchDomain,
    unwatchDomain
  };
}

