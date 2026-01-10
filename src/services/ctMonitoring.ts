/**
 * Certificate Transparency (CT) Monitoring Service
 * 
 * Monitors real-time certificate issuance via CertStream WebSocket.
 * Detects certificates that may indicate data center infrastructure.
 * 
 * Antifragile design:
 * - Passive monitoring only (doesn't block other verification)
 * - Graceful degradation on connection failure
 * - Automatic reconnection with exponential backoff
 * - Emits telemetry for audit trail
 */

import { telemetryBus } from './telemetryBus';

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

export interface CTCertificate {
  /** SHA-256 fingerprint */
  fingerprint: string;
  /** Certificate serial number */
  serialNumber: string;
  /** Issuer common name */
  issuer: string;
  /** Subject common name */
  subject: string;
  /** Subject Alternative Names (domains) */
  domains: string[];
  /** Not before timestamp */
  notBefore: number;
  /** Not after timestamp */
  notAfter: number;
  /** CT log source */
  source: string;
  /** Raw update type from CertStream */
  updateType: 'PrecertLogEntry' | 'X509LogEntry';
}

export interface CTAlert {
  certificate: CTCertificate;
  /** Why this certificate was flagged */
  reason: CTAlertReason;
  /** Confidence score (0-1) */
  confidence: number;
  /** Matched patterns */
  matchedPatterns: string[];
  /** Timestamp of detection */
  detectedAt: number;
}

export type CTAlertReason = 
  | 'data_center_domain'      // Domain matches DC naming patterns
  | 'cloud_provider'          // Known cloud provider domain
  | 'infrastructure_keyword'  // Contains infra keywords (dc, colo, etc.)
  | 'ip_based_san'            // Has IP-based SAN (unusual)
  | 'high_volume_issuer';     // From high-volume enterprise issuer

export type CTConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

// ----------------------------------------------------------------------------
// Data Center Detection Patterns
// ----------------------------------------------------------------------------

/** Domain patterns that suggest data center infrastructure */
const DC_DOMAIN_PATTERNS: RegExp[] = [
  // Data center naming patterns
  /\b(dc|datacenter|data-center|colo|colocation)\d*\./i,
  /\b(us-east|us-west|eu-west|ap-south|ap-northeast)\d*\./i,
  /\b(az|availability-zone|region)\d*\./i,
  
  // Infrastructure patterns
  /\b(infra|infrastructure|internal|corp|private)\./i,
  /\b(mgmt|management|admin|ops|sre)\./i,
  /\b(k8s|kubernetes|docker|container)\./i,
  
  // Network infrastructure
  /\b(switch|router|firewall|lb|loadbalancer)\./i,
  /\b(vpn|bastion|jump|gateway)\./i,
  
  // Monitoring/observability
  /\b(prometheus|grafana|datadog|splunk|elastic)\./i,
  /\b(monitor|metrics|logs|traces)\./i,
];

/** Known cloud provider domains */
const CLOUD_PROVIDER_PATTERNS: RegExp[] = [
  /\.amazonaws\.com$/i,
  /\.azure\.com$/i,
  /\.azure\.net$/i,
  /\.googlecloud\.com$/i,
  /\.cloudflare\.com$/i,
  /\.digitalocean\.com$/i,
  /\.linode\.com$/i,
  /\.vultr\.com$/i,
  /\.oracle\.cloud$/i,
  /\.ibmcloud\.com$/i,
];

/** High-volume enterprise certificate issuers */
const ENTERPRISE_ISSUERS: string[] = [
  'DigiCert',
  'Sectigo',
  'GlobalSign',
  'Entrust',
  'GoDaddy',
  'Comodo',
  'Let\'s Encrypt', // High volume but mostly small sites
];

// ----------------------------------------------------------------------------
// CT Monitoring Service
// ----------------------------------------------------------------------------

export class CTMonitoringService {
  private ws: WebSocket | null = null;
  private state: CTConnectionState = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private baseReconnectDelay = 1000;
  private maxReconnectDelay = 60000;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  
  /** Subscribers to connection state changes */
  private stateListeners: Set<(state: CTConnectionState) => void> = new Set();
  
  /** Subscribers to CT alerts */
  private alertListeners: Set<(alert: CTAlert) => void> = new Set();
  
  /** Statistics for monitoring */
  private stats = {
    certificatesProcessed: 0,
    alertsGenerated: 0,
    lastCertificateAt: 0,
    connectionStartedAt: 0,
  };

  // --------------------------------------------------------------------------
  // Connection Management
  // --------------------------------------------------------------------------

  /**
   * Connect to CertStream WebSocket
   */
  connect(): void {
    if (this.state === 'connecting' || this.state === 'connected') {
      return;
    }

    this.setState('connecting');
    this.stats.connectionStartedAt = Date.now();

    try {
      // CertStream WebSocket endpoint (CORS-enabled, no auth required)
      this.ws = new WebSocket('wss://certstream.calidog.io/');

      this.ws.onopen = () => {
        this.setState('connected');
        this.reconnectAttempts = 0;
        
        telemetryBus.emit({
          source: 'ct_monitoring',
          type: 'ct_connected',
          severity: 'info',
          title: 'CT monitoring connected',
          summary: 'Connected to CertStream for certificate transparency monitoring',
          payload: { timestamp: Date.now() },
        });
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onerror = (error) => {
        console.warn('[CTMonitoring] WebSocket error:', error);
        this.setState('error');
      };

      this.ws.onclose = (event) => {
        console.info('[CTMonitoring] WebSocket closed:', event.code, event.reason);
        this.setState('disconnected');
        this.scheduleReconnect();
      };

    } catch (error) {
      console.error('[CTMonitoring] Failed to create WebSocket:', error);
      this.setState('error');
      this.scheduleReconnect();
    }
  }

  /**
   * Disconnect from CertStream
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.setState('disconnected');
    this.reconnectAttempts = 0;
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[CTMonitoring] Max reconnect attempts reached');
      
      telemetryBus.emit({
        source: 'ct_monitoring',
        type: 'ct_connection_failed',
        severity: 'warning',
        title: 'CT monitoring connection failed',
        summary: `Failed to connect after ${this.maxReconnectAttempts} attempts`,
        payload: { attempts: this.reconnectAttempts },
      });
      
      return;
    }

    const delay = Math.min(
      this.baseReconnectDelay * Math.pow(2, this.reconnectAttempts),
      this.maxReconnectDelay
    );

    this.reconnectAttempts++;
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  // --------------------------------------------------------------------------
  // Message Processing
  // --------------------------------------------------------------------------

  /**
   * Handle incoming CertStream message
   */
  private handleMessage(data: string): void {
    try {
      const message = JSON.parse(data);
      
      // CertStream sends heartbeat messages
      if (message.message_type === 'heartbeat') {
        return;
      }

      // Certificate update message
      if (message.message_type === 'certificate_update') {
        this.processCertificate(message.data);
      }

    } catch (error) {
      // Ignore parse errors - CertStream sometimes sends malformed data
    }
  }

  /**
   * Process a certificate update from CertStream
   */
  private processCertificate(data: unknown): void {
    if (!data || typeof data !== 'object') return;

    const certData = data as Record<string, unknown>;
    const leafCert = certData.leaf_cert as Record<string, unknown> | undefined;
    
    if (!leafCert) return;

    this.stats.certificatesProcessed++;
    this.stats.lastCertificateAt = Date.now();

    // Extract certificate info
    const certificate: CTCertificate = {
      fingerprint: String(leafCert.fingerprint || ''),
      serialNumber: String(leafCert.serial_number || ''),
      issuer: this.extractIssuer(leafCert),
      subject: this.extractSubject(leafCert),
      domains: this.extractDomains(leafCert),
      notBefore: this.parseTimestamp(leafCert.not_before),
      notAfter: this.parseTimestamp(leafCert.not_after),
      source: String((certData.source as { name?: string } | undefined)?.name || 'unknown'),
      updateType: certData.update_type === 'PrecertLogEntry' ? 'PrecertLogEntry' : 'X509LogEntry',
    };

    // Check if certificate matches data center patterns
    const alert = this.analyzeCertificate(certificate);
    
    if (alert) {
      this.stats.alertsGenerated++;
      this.emitAlert(alert);
    }
  }

  /**
   * Extract issuer name from certificate
   */
  private extractIssuer(cert: Record<string, unknown>): string {
    const issuer = cert.issuer as Record<string, unknown> | undefined;
    if (!issuer) return 'Unknown';
    
    return String(issuer.CN || issuer.O || 'Unknown');
  }

  /**
   * Extract subject name from certificate
   */
  private extractSubject(cert: Record<string, unknown>): string {
    const subject = cert.subject as Record<string, unknown> | undefined;
    if (!subject) return 'Unknown';
    
    return String(subject.CN || subject.O || 'Unknown');
  }

  /**
   * Extract all domains (CN + SANs) from certificate
   */
  private extractDomains(cert: Record<string, unknown>): string[] {
    const domains: string[] = [];
    
    // Common Name
    const subject = cert.subject as Record<string, unknown> | undefined;
    if (subject?.CN) {
      domains.push(String(subject.CN));
    }
    
    // Subject Alternative Names
    const extensions = cert.extensions as Record<string, unknown> | undefined;
    const san = extensions?.subjectAltName as string | undefined;
    
    if (san) {
      // Parse "DNS:example.com, DNS:www.example.com" format
      const sanEntries = san.split(',').map(s => s.trim());
      for (const entry of sanEntries) {
        if (entry.startsWith('DNS:')) {
          domains.push(entry.substring(4));
        }
      }
    }
    
    // Also check all_domains if provided by CertStream
    const allDomains = cert.all_domains as string[] | undefined;
    if (Array.isArray(allDomains)) {
      domains.push(...allDomains);
    }
    
    // Deduplicate
    return [...new Set(domains)];
  }

  /**
   * Parse timestamp from certificate
   */
  private parseTimestamp(value: unknown): number {
    if (typeof value === 'number') return value * 1000; // Unix seconds to ms
    if (typeof value === 'string') return new Date(value).getTime();
    return 0;
  }

  // --------------------------------------------------------------------------
  // Certificate Analysis
  // --------------------------------------------------------------------------

  /**
   * Analyze certificate for data center indicators
   */
  private analyzeCertificate(cert: CTCertificate): CTAlert | null {
    const matchedPatterns: string[] = [];
    let confidence = 0;
    let reason: CTAlertReason | null = null;

    // Check domains against patterns
    for (const domain of cert.domains) {
      // Data center domain patterns
      for (const pattern of DC_DOMAIN_PATTERNS) {
        if (pattern.test(domain)) {
          matchedPatterns.push(`DC pattern: ${pattern.source}`);
          confidence += 0.3;
          reason = reason || 'data_center_domain';
        }
      }

      // Cloud provider patterns
      for (const pattern of CLOUD_PROVIDER_PATTERNS) {
        if (pattern.test(domain)) {
          matchedPatterns.push(`Cloud: ${domain}`);
          confidence += 0.2;
          reason = reason || 'cloud_provider';
        }
      }

      // IP-based SAN (unusual, often internal infrastructure)
      if (/^\d+\.\d+\.\d+\.\d+$/.test(domain)) {
        matchedPatterns.push(`IP SAN: ${domain}`);
        confidence += 0.4;
        reason = reason || 'ip_based_san';
      }
    }

    // Check issuer
    for (const issuer of ENTERPRISE_ISSUERS) {
      if (cert.issuer.includes(issuer)) {
        matchedPatterns.push(`Issuer: ${issuer}`);
        confidence += 0.1;
        reason = reason || 'high_volume_issuer';
      }
    }

    // Only alert if we have meaningful matches
    if (confidence < 0.3 || !reason) {
      return null;
    }

    // Cap confidence at 1.0
    confidence = Math.min(confidence, 1.0);

    return {
      certificate: cert,
      reason,
      confidence,
      matchedPatterns,
      detectedAt: Date.now(),
    };
  }

  // --------------------------------------------------------------------------
  // Alert Emission
  // --------------------------------------------------------------------------

  /**
   * Emit a CT alert to listeners and telemetry
   */
  private emitAlert(alert: CTAlert): void {
    // Notify listeners
    for (const listener of this.alertListeners) {
      try {
        listener(alert);
      } catch (error) {
        console.error('[CTMonitoring] Alert listener error:', error);
      }
    }

    // Emit telemetry event
    telemetryBus.emit({
      source: 'ct_monitoring',
      type: 'ct_alert',
      severity: alert.confidence > 0.7 ? 'high' : alert.confidence > 0.5 ? 'medium' : 'low',
      title: `CT Alert: ${alert.certificate.domains[0] || alert.certificate.subject}`,
      summary: `Certificate detected matching ${alert.reason}: ${alert.matchedPatterns.join(', ')}`,
      payload: {
        fingerprint: alert.certificate.fingerprint,
        domains: alert.certificate.domains,
        issuer: alert.certificate.issuer,
        reason: alert.reason,
        confidence: alert.confidence,
        matchedPatterns: alert.matchedPatterns,
        source: alert.certificate.source,
      },
      correlationId: `ct:${alert.certificate.fingerprint}`,
    });
  }

  // --------------------------------------------------------------------------
  // State Management
  // --------------------------------------------------------------------------

  private setState(state: CTConnectionState): void {
    this.state = state;
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (error) {
        console.error('[CTMonitoring] State listener error:', error);
      }
    }
  }

  // --------------------------------------------------------------------------
  // Public API
  // --------------------------------------------------------------------------

  getState(): CTConnectionState {
    return this.state;
  }

  getStats(): typeof this.stats {
    return { ...this.stats };
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(listener: (state: CTConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    return () => this.stateListeners.delete(listener);
  }

  /**
   * Subscribe to CT alerts
   */
  onAlert(listener: (alert: CTAlert) => void): () => void {
    this.alertListeners.add(listener);
    return () => this.alertListeners.delete(listener);
  }
}

// ----------------------------------------------------------------------------
// Singleton Export
// ----------------------------------------------------------------------------

export const ctMonitoring = new CTMonitoringService();

// Alias for compatibility with PatternIntelligenceDashboard
export const ctMonitor = ctMonitoring;

// Re-export hook for convenience
export { useCTMonitoring } from '../hooks/useCTMonitoring';
