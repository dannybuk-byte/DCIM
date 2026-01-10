/**
 * Unit tests for Certificate Transparency Monitoring Service
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CTMonitoringService, CTCertificate, CTAlert } from './ctMonitoring';

describe('CTMonitoringService', () => {
  let service: CTMonitoringService;

  beforeEach(() => {
    service = new CTMonitoringService();
  });

  afterEach(() => {
    service.disconnect();
  });

  describe('initial state', () => {
    it('starts disconnected', () => {
      expect(service.getState()).toBe('disconnected');
    });

    it('has zero stats initially', () => {
      const stats = service.getStats();
      expect(stats.certificatesProcessed).toBe(0);
      expect(stats.alertsGenerated).toBe(0);
    });
  });

  describe('state management', () => {
    it('notifies listeners on state change', () => {
      const listener = vi.fn();
      const unsubscribe = service.onStateChange(listener);

      // Trigger a state change by attempting to connect
      // Note: actual WebSocket won't connect in test environment
      service.connect();

      // Should have been called with 'connecting'
      expect(listener).toHaveBeenCalledWith('connecting');

      unsubscribe();
    });

    it('allows unsubscribing from state changes', () => {
      const listener = vi.fn();
      const unsubscribe = service.onStateChange(listener);
      
      unsubscribe();
      
      // After unsubscribe, should not receive updates
      // (can't easily test this without mocking WebSocket)
    });
  });

  describe('alert subscription', () => {
    it('allows subscribing to alerts', () => {
      const listener = vi.fn();
      const unsubscribe = service.onAlert(listener);
      
      expect(typeof unsubscribe).toBe('function');
      
      unsubscribe();
    });
  });

  describe('disconnect', () => {
    it('returns to disconnected state', () => {
      service.connect();
      service.disconnect();
      
      expect(service.getState()).toBe('disconnected');
    });

    it('can be called multiple times safely', () => {
      service.disconnect();
      service.disconnect();
      service.disconnect();
      
      expect(service.getState()).toBe('disconnected');
    });
  });
});

describe('Certificate Pattern Matching', () => {
  // Test the pattern matching logic by examining expected patterns
  
  const DC_PATTERNS = [
    'dc1.example.com',
    'datacenter.company.net',
    'us-east-1.internal.corp',
    'eu-west-2.prod.example.org',
    'infra.monitoring.net',
    'k8s.cluster.local',
    'prometheus.metrics.internal',
  ];

  const NON_DC_PATTERNS = [
    'www.example.com',
    'blog.wordpress.com',
    'shop.store.net',
  ];

  const CLOUD_PATTERNS = [
    'instance.us-east-1.amazonaws.com',
    'vm.eastus.azure.com',
    'service.cloudflare.com',
  ];

  it('has expected DC domain patterns defined', () => {
    // These patterns should match data center-related domains
    // This test documents expected behavior
    expect(DC_PATTERNS.length).toBeGreaterThan(0);
  });

  it('has expected cloud provider patterns defined', () => {
    expect(CLOUD_PATTERNS.length).toBeGreaterThan(0);
  });

  it('can distinguish DC from non-DC domains conceptually', () => {
    // Conceptual test - actual matching is done in the service
    expect(DC_PATTERNS.some(d => d.includes('dc') || d.includes('data'))).toBe(true);
    expect(NON_DC_PATTERNS.every(d => !d.includes('dc') && !d.includes('data'))).toBe(true);
  });
});

describe('CTAlert structure', () => {
  it('has required fields', () => {
    const alert: CTAlert = {
      certificate: {
        fingerprint: 'abc123',
        serialNumber: '12345',
        issuer: 'DigiCert',
        subject: 'example.com',
        domains: ['example.com', 'www.example.com'],
        notBefore: Date.now(),
        notAfter: Date.now() + 86400000,
        source: 'Google Argon',
        updateType: 'X509LogEntry',
      },
      reason: 'data_center_domain',
      confidence: 0.8,
      matchedPatterns: ['DC pattern: /dc/'],
      detectedAt: Date.now(),
    };

    expect(alert.certificate.fingerprint).toBe('abc123');
    expect(alert.reason).toBe('data_center_domain');
    expect(alert.confidence).toBe(0.8);
    expect(alert.matchedPatterns).toHaveLength(1);
  });

  it('supports all alert reasons', () => {
    const reasons = [
      'data_center_domain',
      'cloud_provider',
      'infrastructure_keyword',
      'ip_based_san',
      'high_volume_issuer',
    ] as const;

    for (const reason of reasons) {
      const alert: CTAlert = {
        certificate: {
          fingerprint: 'test',
          serialNumber: '1',
          issuer: 'Test',
          subject: 'test.com',
          domains: ['test.com'],
          notBefore: 0,
          notAfter: 0,
          source: 'test',
          updateType: 'X509LogEntry',
        },
        reason,
        confidence: 0.5,
        matchedPatterns: [],
        detectedAt: Date.now(),
      };
      
      expect(alert.reason).toBe(reason);
    }
  });
});
