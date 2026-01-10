/**
 * AI Infrastructure Real-Time Monitor
 * 
 * Combines CertStream and RIPE RIS Live to provide early warning
 * of AI company infrastructure expansion:
 * 
 * 1. Certificate Transparency - New AI company domains (12-36 month lead time)
 * 2. BGP Monitoring - AS announcements for AI company ASNs (real-time)
 * 
 * Commercial Value: $50-200K/year per CDN/Security partner
 */

import { bgpMonitor, BGPUpdate, BGPAnomaly } from '../network/BGPMonitor';
import { fetchCertificates, extractSubdomains, SubdomainDiscovery } from '../utils/expansionTracker';
import {
  AI_COMPANY_WATCHLIST,
  detectAICertificate,
  CertificateAlert,
  getAllAICompanyASNs,
  getCompanyByASN,
} from './aiInfrastructureIntelligence';

// =============================================================================
// TYPES
// =============================================================================

export interface AIInfrastructureAlert {
  id: string;
  type: 'certificate' | 'bgp_announcement' | 'bgp_anomaly' | 'expansion';
  company: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  details: {
    domain?: string;
    asn?: number;
    prefix?: string;
    asPath?: number[];
    subdomains?: string[];
  };
  timestamp: Date;
  actionable: string;
}

export interface MonitorStatus {
  bgp: 'connected' | 'connecting' | 'disconnected' | 'offline';
  certStream: 'active' | 'polling' | 'error';
  lastUpdate: Date | null;
  alertCount: number;
  monitoredASNs: number;
  monitoredDomains: number;
}

type AlertCallback = (alert: AIInfrastructureAlert) => void;

// =============================================================================
// AI INFRASTRUCTURE MONITOR
// =============================================================================

export class AIInfrastructureMonitor {
  private alertListeners = new Set<AlertCallback>();
  private alerts: AIInfrastructureAlert[] = [];
  private certPollingInterval: NodeJS.Timeout | null = null;
  private lastCertCheck = new Map<string, Date>();
  private knownSubdomains = new Map<string, Set<string>>();
  private isRunning = false;
  
  // Configuration
  private readonly CERT_POLL_INTERVAL = 60 * 60 * 1000; // 1 hour
  private readonly MAX_ALERTS = 1000;

  constructor() {
    // Initialize BGP monitor with AI company ASNs
    this.initializeBGPMonitoring();
  }

  /**
   * Initialize BGP monitoring for all AI company ASNs
   */
  private initializeBGPMonitoring(): void {
    // Add all AI company ASNs to BGP monitor
    const aiASNs = getAllAICompanyASNs();
    aiASNs.forEach(asn => bgpMonitor.addMonitoredASN(asn));
    
    console.log(`🌐 AI Monitor: Tracking ${aiASNs.length} AI company ASNs`);
    
    // Listen for BGP updates
    bgpMonitor.onUpdate((update) => this.handleBGPUpdate(update));
    bgpMonitor.onAnomaly((anomaly) => this.handleBGPAnomaly(anomaly));
  }

  /**
   * Start the monitor
   */
  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('🚀 AI Infrastructure Monitor: Starting...');
    
    // Start BGP connection
    bgpMonitor.connect();
    
    // Start certificate polling
    this.startCertificatePolling();
    
    console.log('✅ AI Infrastructure Monitor: Running');
  }

  /**
   * Stop the monitor
   */
  stop(): void {
    this.isRunning = false;
    
    // Stop certificate polling
    if (this.certPollingInterval) {
      clearInterval(this.certPollingInterval);
      this.certPollingInterval = null;
    }
    
    // Disconnect BGP (but don't clear its state for reuse)
    bgpMonitor.disconnect();
    
    console.log('🛑 AI Infrastructure Monitor: Stopped');
  }

  /**
   * Start polling for new AI company certificates
   */
  private startCertificatePolling(): void {
    // Initial check
    this.checkAllAICertificates();
    
    // Set up polling interval
    this.certPollingInterval = setInterval(() => {
      this.checkAllAICertificates();
    }, this.CERT_POLL_INTERVAL);
  }

  /**
   * Check certificates for all AI companies
   */
  private async checkAllAICertificates(): Promise<void> {
    console.log('🔍 AI Monitor: Checking certificates for AI companies...');
    
    for (const company of AI_COMPANY_WATCHLIST) {
      for (const domain of company.domains) {
        try {
          await this.checkCertificatesForDomain(company.name, domain);
          // Rate limiting - be respectful to crt.sh
          await new Promise(resolve => setTimeout(resolve, 2000));
        } catch (error) {
          console.error(`Failed to check certs for ${domain}:`, error);
        }
      }
    }
    
    console.log('✅ AI Monitor: Certificate check complete');
  }

  /**
   * Check certificates for a specific domain
   */
  private async checkCertificatesForDomain(companyName: string, domain: string): Promise<void> {
    const certificates = await fetchCertificates(domain);
    const subdomains = extractSubdomains(certificates);
    
    // Get known subdomains for this domain
    const knownSet = this.knownSubdomains.get(domain) || new Set<string>();
    
    // Find new subdomains
    const newSubdomains = subdomains.filter(s => !knownSet.has(s.subdomain));
    
    if (newSubdomains.length > 0) {
      // Update known set
      newSubdomains.forEach(s => knownSet.add(s.subdomain));
      this.knownSubdomains.set(domain, knownSet);
      
      // Generate alerts for significant new subdomains
      this.generateCertificateAlerts(companyName, domain, newSubdomains);
    }
    
    // Update last check time
    this.lastCertCheck.set(domain, new Date());
  }

  /**
   * Generate alerts for new certificate discoveries
   */
  private generateCertificateAlerts(
    companyName: string,
    domain: string,
    newSubdomains: SubdomainDiscovery[]
  ): void {
    // Group by significance
    const highConfidence = newSubdomains.filter(s => s.confidence >= 70);
    const datacenterSubdomains = newSubdomains.filter(s => s.pattern === 'datacenter');
    const infrastructureSubdomains = newSubdomains.filter(s => s.pattern === 'infrastructure');
    
    // Critical alert: New datacenter subdomains
    if (datacenterSubdomains.length > 0) {
      this.addAlert({
        id: `cert-dc-${Date.now()}`,
        type: 'certificate',
        company: companyName,
        severity: 'critical',
        title: `${companyName}: New Data Center Infrastructure Detected`,
        description: `${datacenterSubdomains.length} new data center subdomain(s) found for ${domain}. This indicates significant capacity expansion.`,
        details: {
          domain,
          subdomains: datacenterSubdomains.map(s => s.subdomain),
        },
        timestamp: new Date(),
        actionable: 'Contact community organizers. Monitor for permit applications and utility interconnection requests.',
      });
    }
    
    // High alert: New infrastructure subdomains
    if (infrastructureSubdomains.length > 0) {
      this.addAlert({
        id: `cert-infra-${Date.now()}`,
        type: 'certificate',
        company: companyName,
        severity: 'high',
        title: `${companyName}: Infrastructure Expansion Detected`,
        description: `${infrastructureSubdomains.length} new infrastructure subdomain(s) found for ${domain}.`,
        details: {
          domain,
          subdomains: infrastructureSubdomains.map(s => s.subdomain),
        },
        timestamp: new Date(),
        actionable: 'Monitor for BGP announcements and traffic pattern changes.',
      });
    }
    
    // Medium alert: High confidence discoveries
    const otherHighConfidence = highConfidence.filter(
      s => s.pattern !== 'datacenter' && s.pattern !== 'infrastructure'
    );
    if (otherHighConfidence.length > 0) {
      this.addAlert({
        id: `cert-general-${Date.now()}`,
        type: 'certificate',
        company: companyName,
        severity: 'medium',
        title: `${companyName}: New Certificates Detected`,
        description: `${otherHighConfidence.length} new high-confidence subdomain(s) found for ${domain}.`,
        details: {
          domain,
          subdomains: otherHighConfidence.map(s => s.subdomain),
        },
        timestamp: new Date(),
        actionable: 'Add to watchlist for continued monitoring.',
      });
    }
  }

  /**
   * Handle BGP update from RIPE RIS Live
   */
  private handleBGPUpdate(update: BGPUpdate): void {
    // Check if this involves an AI company ASN
    const aiCompanyASN = update.asPath.find(asn => {
      const company = getCompanyByASN(asn);
      return company !== undefined;
    });
    
    if (aiCompanyASN) {
      const company = getCompanyByASN(aiCompanyASN)!;
      
      this.addAlert({
        id: `bgp-announce-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: 'bgp_announcement',
        company: company.name,
        severity: 'low',
        title: `${company.name}: BGP Announcement`,
        description: `New prefix announcement involving ${company.name} (AS${aiCompanyASN})`,
        details: {
          asn: aiCompanyASN,
          prefix: update.prefix,
          asPath: update.asPath,
        },
        timestamp: new Date(update.timestamp),
        actionable: 'Normal routing activity. Track for patterns.',
      });
    }
  }

  /**
   * Handle BGP anomaly from RIPE RIS Live
   */
  private handleBGPAnomaly(anomaly: BGPAnomaly): void {
    // Check if this involves an AI company ASN
    const aiCompanyASN = anomaly.update.asPath.find(asn => {
      const company = getCompanyByASN(asn);
      return company !== undefined;
    });
    
    if (!aiCompanyASN) return;
    
    const company = getCompanyByASN(aiCompanyASN)!;
    
    // Map anomaly severity
    const severityMap: Record<string, AIInfrastructureAlert['severity']> = {
      'critical': 'critical',
      'high': 'high',
      'medium': 'medium',
      'low': 'low',
    };
    
    let title: string;
    let actionable: string;
    
    switch (anomaly.type) {
      case 'potential_hijack':
        title = `🚨 ${company.name}: POTENTIAL BGP HIJACK`;
        actionable = 'URGENT: Verify with network operations. May indicate attack on AI infrastructure.';
        break;
      case 'path_change':
        title = `${company.name}: AS Path Change Detected`;
        actionable = 'Monitor for continued changes. May indicate network reconfiguration or expansion.';
        break;
      case 'new_prefix':
        title = `${company.name}: New Prefix Announced`;
        actionable = 'New IP space allocated. May indicate capacity expansion.';
        break;
      case 'short_path':
        title = `${company.name}: Unusual AS Path`;
        actionable = 'Investigate routing anomaly. May be legitimate optimization or misconfiguration.';
        break;
      default:
        title = `${company.name}: BGP Anomaly`;
        actionable = 'Review routing data for unusual patterns.';
    }
    
    this.addAlert({
      id: `bgp-anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: 'bgp_anomaly',
      company: company.name,
      severity: severityMap[anomaly.severity],
      title,
      description: anomaly.description,
      details: {
        asn: aiCompanyASN,
        prefix: anomaly.update.prefix,
        asPath: anomaly.update.asPath,
      },
      timestamp: new Date(anomaly.timestamp),
      actionable,
    });
  }

  /**
   * Add an alert and notify listeners
   */
  private addAlert(alert: AIInfrastructureAlert): void {
    // Add to alerts list
    this.alerts.unshift(alert);
    
    // Trim if over limit
    if (this.alerts.length > this.MAX_ALERTS) {
      this.alerts = this.alerts.slice(0, this.MAX_ALERTS);
    }
    
    // Notify listeners
    this.alertListeners.forEach(listener => listener(alert));
    
    // Log critical/high alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      console.log(`🚨 AI Monitor Alert [${alert.severity.toUpperCase()}]: ${alert.title}`);
    }
  }

  /**
   * Subscribe to alerts
   */
  onAlert(callback: AlertCallback): () => void {
    this.alertListeners.add(callback);
    return () => this.alertListeners.delete(callback);
  }

  /**
   * Get all alerts
   */
  getAlerts(options?: {
    company?: string;
    type?: AIInfrastructureAlert['type'];
    severity?: AIInfrastructureAlert['severity'];
    limit?: number;
  }): AIInfrastructureAlert[] {
    let filtered = [...this.alerts];
    
    if (options?.company) {
      filtered = filtered.filter(a => a.company === options.company);
    }
    if (options?.type) {
      filtered = filtered.filter(a => a.type === options.type);
    }
    if (options?.severity) {
      filtered = filtered.filter(a => a.severity === options.severity);
    }
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }
    
    return filtered;
  }

  /**
   * Get current monitor status
   */
  getStatus(): MonitorStatus {
    const aiASNs = getAllAICompanyASNs();
    const aiDomains = AI_COMPANY_WATCHLIST.flatMap(c => c.domains);
    
    return {
      bgp: bgpMonitor.getConnectionStatus(),
      certStream: this.certPollingInterval ? 'polling' : 'error',
      lastUpdate: this.alerts[0]?.timestamp || null,
      alertCount: this.alerts.length,
      monitoredASNs: aiASNs.length,
      monitoredDomains: aiDomains.length,
    };
  }

  /**
   * Force certificate check for specific company
   */
  async checkCompany(companyName: string): Promise<AIInfrastructureAlert[]> {
    const company = AI_COMPANY_WATCHLIST.find(c => c.name === companyName);
    if (!company) {
      throw new Error(`Unknown company: ${companyName}`);
    }
    
    const beforeCount = this.alerts.length;
    
    for (const domain of company.domains) {
      await this.checkCertificatesForDomain(companyName, domain);
      await new Promise(resolve => setTimeout(resolve, 2000)); // Rate limit
    }
    
    // Return new alerts generated
    return this.alerts.slice(0, this.alerts.length - beforeCount);
  }

  /**
   * Clear all alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }
}

// =============================================================================
// SINGLETON INSTANCE
// =============================================================================

export const aiInfrastructureMonitor = new AIInfrastructureMonitor();

// =============================================================================
// REACT HOOK
// =============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useAIInfrastructureMonitor() {
  const [alerts, setAlerts] = useState<AIInfrastructureAlert[]>([]);
  const [status, setStatus] = useState<MonitorStatus>(aiInfrastructureMonitor.getStatus());
  
  useEffect(() => {
    // Subscribe to new alerts
    const unsubscribe = aiInfrastructureMonitor.onAlert((alert) => {
      setAlerts(prev => [alert, ...prev].slice(0, 100));
      setStatus(aiInfrastructureMonitor.getStatus());
    });
    
    // Get initial alerts
    setAlerts(aiInfrastructureMonitor.getAlerts({ limit: 100 }));
    
    // Update status periodically
    const statusInterval = setInterval(() => {
      setStatus(aiInfrastructureMonitor.getStatus());
    }, 5000);
    
    return () => {
      unsubscribe();
      clearInterval(statusInterval);
    };
  }, []);
  
  const start = useCallback(() => {
    aiInfrastructureMonitor.start();
    setStatus(aiInfrastructureMonitor.getStatus());
  }, []);
  
  const stop = useCallback(() => {
    aiInfrastructureMonitor.stop();
    setStatus(aiInfrastructureMonitor.getStatus());
  }, []);
  
  const checkCompany = useCallback(async (companyName: string) => {
    const newAlerts = await aiInfrastructureMonitor.checkCompany(companyName);
    setAlerts(aiInfrastructureMonitor.getAlerts({ limit: 100 }));
    return newAlerts;
  }, []);
  
  const clearAlerts = useCallback(() => {
    aiInfrastructureMonitor.clearAlerts();
    setAlerts([]);
  }, []);
  
  return {
    alerts,
    status,
    start,
    stop,
    checkCompany,
    clearAlerts,
    getAlerts: aiInfrastructureMonitor.getAlerts.bind(aiInfrastructureMonitor),
  };
}

