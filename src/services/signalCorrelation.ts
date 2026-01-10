/**
 * Multi-Signal Correlation Engine
 * 
 * Implements cross-domain pattern detection from TWIML Episode #740 (Networks of Networks):
 * - Correlates BGP anomalies with Certificate Transparency alerts
 * - Links power consumption changes with workforce patterns
 * - Detects compound events indicating infrastructure changes
 * - Triangulates evidence from multiple signal sources
 * 
 * Key insight: Individual signals may be noise, but correlated signals
 * across domains indicate real events.
 * 
 * @module signalCorrelation
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../db/database';
import { telemetryBus } from './telemetryBus';
import type { TelemetrySeverity, TelemetrySource } from '../db/database';
import { defaultSourceAssessment } from './sourceConfidence';
import { applyTemporalDecay, defaultDecayForSignalType } from './temporalDecay';

// ============================================================================
// TYPES
// ============================================================================

export type SignalSource = 
  | 'bgp'           // BGP route changes, hijacks
  | 'ct'            // Certificate Transparency logs
  | 'power'         // Power consumption data
  | 'workforce'     // Employment/job changes
  | 'financial'     // SEC filings, financial news
  | 'permits'       // Building permits, environmental
  | 'ownership'     // Corporate ownership changes
  | 'network'       // Network topology changes
  | 'social'        // Social media signals
  | 'news';         // News and press releases

export type SignalType = 
  | 'anomaly'       // Something unusual detected
  | 'change'        // State change observed
  | 'alert'         // Threshold exceeded
  | 'prediction'    // Predicted future event
  | 'confirmation'; // Validates another signal

export interface Signal {
  id: string;
  source: SignalSource;
  type: SignalType;
  timestamp: number;
  facilityId?: number;
  company?: string;
  data: Record<string, unknown>;
  confidence: number;
  raw?: unknown;
}

export interface SignalPattern {
  id: string;
  name: string;
  description: string;
  requiredSignals: Array<{
    source: SignalSource;
    type?: SignalType;
    minConfidence: number;
    maxAgeMs: number;
  }>;
  correlationWindow: number; // Time window in ms
  minCorrelationScore: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  actions: string[];
}

export interface Correlation {
  id: string;
  pattern: SignalPattern;
  signals: Signal[];
  correlationScore: number;
  facilityIds: number[];
  companies: string[];
  detectedAt: Date;
  status: 'new' | 'reviewing' | 'confirmed' | 'dismissed';
  actionsTaken: string[];
  notes?: string;
}

export interface CorrelationResult {
  correlations: Correlation[];
  signalsProcessed: number;
  patternsMatched: number;
  executionTimeMs: number;
}

// ============================================================================
// PREDEFINED PATTERNS (Networks of Networks)
// ============================================================================

export const STANDARD_PATTERNS: SignalPattern[] = [
  {
    id: 'infrastructure_expansion',
    name: 'Infrastructure Expansion',
    description: 'Detects new data center deployment or expansion based on BGP + CT + power signals',
    requiredSignals: [
      { source: 'bgp', type: 'change', minConfidence: 0.7, maxAgeMs: 7 * 24 * 60 * 60 * 1000 },
      { source: 'ct', type: 'anomaly', minConfidence: 0.6, maxAgeMs: 14 * 24 * 60 * 60 * 1000 },
      { source: 'power', type: 'change', minConfidence: 0.5, maxAgeMs: 30 * 24 * 60 * 60 * 1000 },
    ],
    correlationWindow: 30 * 24 * 60 * 60 * 1000, // 30 days
    minCorrelationScore: 0.65,
    severity: 'medium',
    actions: [
      'Verify permit applications',
      'Check subsidy agreement compliance',
      'Update facility capacity estimates',
    ],
  },
  {
    id: 'workforce_reduction',
    name: 'Workforce Reduction Alert',
    description: 'Detects potential layoffs via workforce + power + news correlation',
    requiredSignals: [
      { source: 'workforce', type: 'change', minConfidence: 0.6, maxAgeMs: 14 * 24 * 60 * 60 * 1000 },
      { source: 'power', type: 'change', minConfidence: 0.5, maxAgeMs: 30 * 24 * 60 * 60 * 1000 },
    ],
    correlationWindow: 30 * 24 * 60 * 60 * 1000,
    minCorrelationScore: 0.55,
    severity: 'critical',
    actions: [
      'Cross-reference with subsidy job commitments',
      'Calculate potential clawback',
      'Alert coalition partners',
      'Prepare media response',
    ],
  },
  {
    id: 'ownership_change',
    name: 'Corporate Ownership Change',
    description: 'Detects ownership transfers, mergers, shell company activity',
    requiredSignals: [
      { source: 'ownership', type: 'change', minConfidence: 0.8, maxAgeMs: 60 * 24 * 60 * 60 * 1000 },
      { source: 'financial', type: 'alert', minConfidence: 0.6, maxAgeMs: 30 * 24 * 60 * 60 * 1000 },
    ],
    correlationWindow: 90 * 24 * 60 * 60 * 1000,
    minCorrelationScore: 0.7,
    severity: 'high',
    actions: [
      'Update ownership knowledge graph',
      'Check for shell company indicators',
      'Review subsidy agreement transfer clauses',
    ],
  },
  {
    id: 'security_incident',
    name: 'Security Incident Indicator',
    description: 'Detects potential security issues via BGP + CT correlation',
    requiredSignals: [
      { source: 'bgp', type: 'anomaly', minConfidence: 0.8, maxAgeMs: 24 * 60 * 60 * 1000 },
      { source: 'ct', type: 'anomaly', minConfidence: 0.7, maxAgeMs: 24 * 60 * 60 * 1000 },
    ],
    correlationWindow: 48 * 60 * 60 * 1000, // 48 hours
    minCorrelationScore: 0.75,
    severity: 'critical',
    actions: [
      'Document for evidence chain',
      'Check for OFAC implications',
      'Alert network security team',
    ],
  },
  {
    id: 'compliance_violation',
    name: 'Compliance Violation Indicator',
    description: 'Multi-signal indicator of subsidy compliance violation',
    requiredSignals: [
      { source: 'workforce', type: 'change', minConfidence: 0.6, maxAgeMs: 90 * 24 * 60 * 60 * 1000 },
      { source: 'permits', type: 'alert', minConfidence: 0.5, maxAgeMs: 180 * 24 * 60 * 60 * 1000 },
    ],
    correlationWindow: 180 * 24 * 60 * 60 * 1000, // 6 months
    minCorrelationScore: 0.5,
    severity: 'high',
    actions: [
      'Generate compliance report',
      'File FOIA request',
      'Calculate clawback eligibility',
    ],
  },
];

// ============================================================================
// SIGNAL CORRELATION ENGINE
// ============================================================================

class SignalCorrelationEngine {
  private signalBuffer: Signal[] = [];
  private activeCorrelations = new Map<string, Correlation>();
  private patterns: SignalPattern[] = [...STANDARD_PATTERNS];
  private listeners = new Set<(event: CorrelationEvent) => void>();
  private processingInterval?: ReturnType<typeof setInterval>;
  private maxBufferSize = 10000;
  private isRunning = false;

  // ============================================================================
  // LIFECYCLE
  // ============================================================================

  start(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Process signals periodically
    this.processingInterval = setInterval(() => {
      this.processSignalBuffer();
    }, 5000);

    console.log('🔗 Signal Correlation Engine started');
    this.emit({ type: 'engine_started' });
  }

  stop(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }
    this.isRunning = false;
    console.log('🛑 Signal Correlation Engine stopped');
    this.emit({ type: 'engine_stopped' });
  }

  // ============================================================================
  // SIGNAL INGESTION
  // ============================================================================

  /**
   * Ingest a new signal into the correlation engine
   */
  ingestSignal(signal: Omit<Signal, 'id'>): Signal {
    const fullSignal: Signal = {
      ...signal,
      id: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    this.signalBuffer.push(fullSignal);
    
    // Trim buffer if too large
    if (this.signalBuffer.length > this.maxBufferSize) {
      this.signalBuffer = this.signalBuffer.slice(-this.maxBufferSize / 2);
    }

    this.emit({ type: 'signal_ingested', signal: fullSignal });

    // Telemetry Bus (append-only). Dedup/retention handled by telemetryBus.
    const toTelemetrySource = (src: SignalSource): TelemetrySource => {
      if (src === 'bgp' || src === 'ct' || src === 'power' || src === 'workforce') return src;
      return 'system';
    };

    const toSeverity = (sig: Signal): TelemetrySeverity => {
      const dataType = (sig.data?.type as string | undefined) ?? undefined;
      if (sig.source === 'bgp' && dataType === 'hijack') return 'critical';
      if (sig.type === 'alert') return sig.confidence >= 0.8 ? 'high' : 'medium';
      if (sig.type === 'anomaly') return sig.confidence >= 0.8 ? 'high' : 'medium';
      return 'low';
    };

    const fingerprintParts: string[] = [
      fullSignal.source,
      fullSignal.type,
      String(fullSignal.facilityId ?? ''),
      String((fullSignal.data?.asn as string | undefined) ?? ''),
      String((fullSignal.data?.prefix as string | undefined) ?? ''),
      String((fullSignal.data?.domain as string | undefined) ?? ''),
      String((fullSignal.data?.type as string | undefined) ?? ''),
    ];

    void telemetryBus.emit({
      source: toTelemetrySource(fullSignal.source),
      type: fullSignal.type,
      severity: toSeverity(fullSignal),
      title: `${fullSignal.source.toUpperCase()} ${fullSignal.type}`,
      summary: `confidence ${(fullSignal.confidence * 100).toFixed(0)}%`,
      facilityId: fullSignal.facilityId,
      correlationId: undefined,
      fingerprint: fingerprintParts.filter(Boolean).join('|') || undefined,
      payload: {
        signal: fullSignal,
        sourceAssessment: defaultSourceAssessment(fullSignal.source),
        decayedConfidence: applyTemporalDecay(
          Math.min(Math.max(fullSignal.confidence, 0), 1),
          Math.max(0, Date.now() - fullSignal.timestamp),
          defaultDecayForSignalType(fullSignal.type),
        ),
      },
      timestamp: fullSignal.timestamp,
    });
    
    return fullSignal;
  }

  /**
   * Batch ingest multiple signals
   */
  ingestSignals(signals: Array<Omit<Signal, 'id'>>): Signal[] {
    return signals.map(s => this.ingestSignal(s));
  }

  /**
   * Create signal from BGP anomaly
   */
  createBGPSignal(data: {
    asn: string;
    prefix?: string;
    type: 'hijack' | 'leak' | 'origin_change' | 'path_anomaly';
    affectedPrefixes?: number;
    facilityId?: number;
  }): Signal {
    return this.ingestSignal({
      source: 'bgp',
      type: ['hijack', 'leak'].includes(data.type) ? 'anomaly' : 'change',
      timestamp: Date.now(),
      facilityId: data.facilityId,
      data,
      confidence: data.type === 'hijack' ? 0.9 : 0.7,
    });
  }

  /**
   * Create signal from CT log
   */
  createCTSignal(data: {
    domain: string;
    issuer: string;
    certCount: number;
    type: 'unexpected_ca' | 'cert_burst' | 'wildcard_abuse' | 'short_validity';
    facilityId?: number;
    company?: string;
  }): Signal {
    return this.ingestSignal({
      source: 'ct',
      type: data.type === 'unexpected_ca' ? 'alert' : 'anomaly',
      timestamp: Date.now(),
      facilityId: data.facilityId,
      company: data.company,
      data,
      confidence: data.type === 'unexpected_ca' ? 0.85 : 0.6,
    });
  }

  /**
   * Create signal from power data
   */
  createPowerSignal(data: {
    facilityId: number;
    changePercent: number;
    direction: 'increase' | 'decrease';
    baselineMW: number;
    currentMW: number;
  }): Signal {
    const isSignificant = Math.abs(data.changePercent) > 15;
    return this.ingestSignal({
      source: 'power',
      type: isSignificant ? 'alert' : 'change',
      timestamp: Date.now(),
      facilityId: data.facilityId,
      data,
      confidence: Math.min(0.5 + Math.abs(data.changePercent) / 100, 0.95),
    });
  }

  /**
   * Create signal from workforce data
   */
  createWorkforceSignal(data: {
    facilityId: number;
    company: string;
    changePercent: number;
    direction: 'increase' | 'decrease';
    source: 'bls' | 'linkedin' | 'glassdoor' | 'news';
    headcount?: number;
  }): Signal {
    return this.ingestSignal({
      source: 'workforce',
      type: data.direction === 'decrease' && data.changePercent > 10 ? 'alert' : 'change',
      timestamp: Date.now(),
      facilityId: data.facilityId,
      company: data.company,
      data,
      confidence: data.source === 'bls' ? 0.9 : data.source === 'linkedin' ? 0.6 : 0.4,
    });
  }

  // ============================================================================
  // CORRELATION PROCESSING
  // ============================================================================

  /**
   * Process buffered signals and detect correlations
   */
  async processSignalBuffer(): Promise<CorrelationResult> {
    const startTime = Date.now();
    const correlations: Correlation[] = [];
    const now = Date.now();

    // Clean up old signals
    this.signalBuffer = this.signalBuffer.filter(s => 
      now - s.timestamp < Math.max(...this.patterns.map(p => p.correlationWindow))
    );

    // Check each pattern
    for (const pattern of this.patterns) {
      const patternCorrelations = this.findPatternMatches(pattern, now);
      correlations.push(...patternCorrelations);
    }

    // Store new correlations
    for (const correlation of correlations) {
      if (!this.activeCorrelations.has(correlation.id)) {
        this.activeCorrelations.set(correlation.id, correlation);
        await this.persistCorrelation(correlation);
        this.emit({ type: 'correlation_detected', correlation });
      }
    }

    const result: CorrelationResult = {
      correlations,
      signalsProcessed: this.signalBuffer.length,
      patternsMatched: correlations.length,
      executionTimeMs: Date.now() - startTime,
    };

    return result;
  }

  /**
   * Find signals matching a pattern
   */
  private findPatternMatches(pattern: SignalPattern, now: number): Correlation[] {
    const correlations: Correlation[] = [];
    const windowStart = now - pattern.correlationWindow;

    // Get signals within correlation window
    const windowSignals = this.signalBuffer.filter(s => s.timestamp >= windowStart);

    // Group signals by facility/company
    const groupedByEntity = this.groupSignalsByEntity(windowSignals);

    for (const [entityKey, entitySignals] of groupedByEntity) {
      const matchResult = this.matchPatternSignals(pattern, entitySignals);
      
      if (matchResult.score >= pattern.minCorrelationScore) {
        const correlation: Correlation = {
          id: `corr_${pattern.id}_${entityKey}_${Date.now()}`,
          pattern,
          signals: matchResult.signals,
          correlationScore: matchResult.score,
          facilityIds: [...new Set(matchResult.signals.filter(s => s.facilityId).map(s => s.facilityId!))],
          companies: [...new Set(matchResult.signals.filter(s => s.company).map(s => s.company!))],
          detectedAt: new Date(),
          status: 'new',
          actionsTaken: [],
        };

        correlations.push(correlation);
      }
    }

    return correlations;
  }

  private groupSignalsByEntity(signals: Signal[]): Map<string, Signal[]> {
    const groups = new Map<string, Signal[]>();

    for (const signal of signals) {
      const key = signal.facilityId?.toString() || signal.company || 'unknown';
      
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(signal);
    }

    return groups;
  }

  private matchPatternSignals(
    pattern: SignalPattern,
    signals: Signal[]
  ): { signals: Signal[]; score: number } {
    const matchedSignals: Signal[] = [];
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const required of pattern.requiredSignals) {
      const weight = required.minConfidence;
      totalWeight += weight;

      // Find matching signal
      const match = signals.find(s => {
        if (s.source !== required.source) return false;
        if (required.type && s.type !== required.type) return false;
        if (s.confidence < required.minConfidence) return false;
        if (Date.now() - s.timestamp > required.maxAgeMs) return false;
        return true;
      });

      if (match) {
        matchedSignals.push(match);
        matchedWeight += weight * match.confidence;
      }
    }

    const score = totalWeight > 0 ? matchedWeight / totalWeight : 0;

    return { signals: matchedSignals, score };
  }

  // ============================================================================
  // PERSISTENCE
  // ============================================================================

  private async persistCorrelation(correlation: Correlation): Promise<void> {
    try {
      await db.table('signalCorrelations').add({
        correlationId: correlation.id,
        signals: correlation.signals.map(s => ({
          source: s.source,
          signalType: s.type,
          timestamp: s.timestamp,
          data: s.data,
        })),
        pattern: correlation.pattern.id,
        confidence: correlation.correlationScore,
        detectedAt: correlation.detectedAt,
        facilityIds: correlation.facilityIds,
        actionTaken: correlation.actionsTaken.join(', '),
      });
    } catch (error) {
      console.error('[SignalCorrelation] Failed to persist correlation:', error);
    }
  }

  async loadRecentCorrelations(limit = 50): Promise<Correlation[]> {
    try {
      const records = await db.table('signalCorrelations')
        .orderBy('detectedAt')
        .reverse()
        .limit(limit)
        .toArray();

      return records.map(r => ({
        id: r.correlationId,
        pattern: this.patterns.find(p => p.id === r.pattern) || STANDARD_PATTERNS[0],
        signals: (r.signals as Array<{ source: SignalSource; signalType: SignalType; timestamp: number; data: unknown }>).map((s, i) => ({
          id: `${r.correlationId}_sig_${i}`,
          source: s.source,
          type: s.signalType,
          timestamp: s.timestamp,
          data: s.data as Record<string, unknown>,
          confidence: 0.7,
        })),
        correlationScore: r.confidence,
        facilityIds: r.facilityIds,
        companies: [],
        detectedAt: new Date(r.detectedAt),
        status: 'confirmed' as const,
        actionsTaken: r.actionTaken?.split(', ') || [],
      }));
    } catch (error) {
      console.error('[SignalCorrelation] Failed to load correlations:', error);
      return [];
    }
  }

  // ============================================================================
  // PATTERN MANAGEMENT
  // ============================================================================

  addPattern(pattern: SignalPattern): void {
    this.patterns.push(pattern);
    console.log(`[SignalCorrelation] Added pattern: ${pattern.name}`);
  }

  removePattern(patternId: string): void {
    this.patterns = this.patterns.filter(p => p.id !== patternId);
  }

  getPatterns(): SignalPattern[] {
    return [...this.patterns];
  }

  // ============================================================================
  // MANUAL ACTIONS
  // ============================================================================

  updateCorrelationStatus(
    correlationId: string,
    status: Correlation['status'],
    notes?: string
  ): void {
    const correlation = this.activeCorrelations.get(correlationId);
    if (correlation) {
      correlation.status = status;
      if (notes) correlation.notes = notes;
      this.emit({ type: 'correlation_updated', correlation });
    }
  }

  recordActionTaken(correlationId: string, action: string): void {
    const correlation = this.activeCorrelations.get(correlationId);
    if (correlation) {
      correlation.actionsTaken.push(action);
      this.emit({ type: 'action_taken', correlationId, action });
    }
  }

  // ============================================================================
  // STATS & QUERIES
  // ============================================================================

  getStats(): {
    bufferedSignals: number;
    activeCorrelations: number;
    signalsBySource: Record<SignalSource, number>;
    correlationsByPattern: Record<string, number>;
  } {
    const signalsBySource: Record<string, number> = {};
    for (const signal of this.signalBuffer) {
      signalsBySource[signal.source] = (signalsBySource[signal.source] || 0) + 1;
    }

    const correlationsByPattern: Record<string, number> = {};
    for (const correlation of this.activeCorrelations.values()) {
      correlationsByPattern[correlation.pattern.id] = 
        (correlationsByPattern[correlation.pattern.id] || 0) + 1;
    }

    return {
      bufferedSignals: this.signalBuffer.length,
      activeCorrelations: this.activeCorrelations.size,
      signalsBySource: signalsBySource as Record<SignalSource, number>,
      correlationsByPattern,
    };
  }

  getActiveCorrelations(): Correlation[] {
    return Array.from(this.activeCorrelations.values())
      .sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  subscribe(callback: (event: CorrelationEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: CorrelationEvent): void {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[SignalCorrelation] Event listener error:', e);
      }
    });
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

type CorrelationEvent =
  | { type: 'engine_started' }
  | { type: 'engine_stopped' }
  | { type: 'signal_ingested'; signal: Signal }
  | { type: 'correlation_detected'; correlation: Correlation }
  | { type: 'correlation_updated'; correlation: Correlation }
  | { type: 'action_taken'; correlationId: string; action: string };

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const signalCorrelation = new SignalCorrelationEngine();

// ============================================================================
// REACT HOOK
// ============================================================================

export function useSignalCorrelation() {
  const [correlations, setCorrelations] = useState<Correlation[]>([]);
  const [stats, setStats] = useState(signalCorrelation.getStats());
  const [isRunning, setIsRunning] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Start engine
    signalCorrelation.start();
    setIsRunning(true);

    // Subscribe to events
    const unsubscribe = signalCorrelation.subscribe((event) => {
      setCorrelations(signalCorrelation.getActiveCorrelations());
      setStats(signalCorrelation.getStats());
    });

    // Load historical correlations
    signalCorrelation.loadRecentCorrelations().then(historical => {
      if (historical.length > 0) {
        setCorrelations(prev => [...prev, ...historical]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const ingestSignal = useCallback((signal: Omit<Signal, 'id'>) => {
    return signalCorrelation.ingestSignal(signal);
  }, []);

  const updateStatus = useCallback((
    correlationId: string,
    status: Correlation['status'],
    notes?: string
  ) => {
    signalCorrelation.updateCorrelationStatus(correlationId, status, notes);
  }, []);

  const recordAction = useCallback((correlationId: string, action: string) => {
    signalCorrelation.recordActionTaken(correlationId, action);
  }, []);

  return {
    correlations,
    stats,
    isRunning,
    patterns: signalCorrelation.getPatterns(),
    ingestSignal,
    createBGPSignal: signalCorrelation.createBGPSignal.bind(signalCorrelation),
    createCTSignal: signalCorrelation.createCTSignal.bind(signalCorrelation),
    createPowerSignal: signalCorrelation.createPowerSignal.bind(signalCorrelation),
    createWorkforceSignal: signalCorrelation.createWorkforceSignal.bind(signalCorrelation),
    updateStatus,
    recordAction,
    addPattern: signalCorrelation.addPattern.bind(signalCorrelation),
  };
}
