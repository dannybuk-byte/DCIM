/**
 * Multi-Signal Correlation Engine
 * 
 * Creates unified intelligence by correlating signals across
 * multiple data sources (Power, BGP, CT, SEC, EPA).
 * 
 * @module correlationEngine
 * @version 1.0.0
 */

import { db } from '../db/database';
import type { AnomalyResult, BusinessHealthSignal, WorkloadClassification } from './patternInference';
import type { BGPAnomaly } from './bgpMonitoring';
import type { CTCertificate } from './ctMonitoring';

// ============================================================================
// TYPES
// ============================================================================

export interface PowerSignal {
  type: 'power';
  timestamp: number;
  anomaly?: AnomalyResult;
  health?: BusinessHealthSignal;
  workload?: WorkloadClassification;
}

export interface BGPSignal {
  type: 'bgp';
  timestamp: number;
  anomalies: BGPAnomaly[];
  newPrefixes: number;
  withdrawals: number;
}

export interface CTSignal {
  type: 'ct';
  timestamp: number;
  certificates: CTCertificate[];
  facilityPatterns: number;
  geographicHints: string[];
}

export interface SECSignal {
  type: 'sec';
  timestamp: number;
  filings: Array<{
    formType: string;
    description: string;
    filedAt: string;
    mentions?: string[];
  }>;
  capExMentions: number;
  expansionSignals: string[];
}

export interface EPASignal {
  type: 'epa';
  timestamp: number;
  violations: number;
  permits: Array<{
    type: string;
    status: string;
    facility?: string;
  }>;
  complianceStatus: 'compliant' | 'warning' | 'violation';
}

export type Signal = PowerSignal | BGPSignal | CTSignal | SECSignal | EPASignal;

export interface CorrelatedIntelligence {
  id: string;
  facilityId: string;
  provider?: string;
  timestamp: number;
  
  // Signals from each source
  signals: {
    power: PowerSignal | null;
    bgp: BGPSignal | null;
    ct: CTSignal | null;
    sec: SECSignal | null;
    epa: EPASignal | null;
  };
  
  // Correlation analysis
  signalCount: number;
  combinedConfidence: number;
  hypothesis: string;
  supportingEvidence: string[];
  contradictingEvidence: string[];
  
  // Business inference
  pattern: 'expansion' | 'contraction' | 'stress' | 'stable' | 'unknown';
  businessInference: string;
  
  // Recommendations
  investigationPriority: 'critical' | 'high' | 'medium' | 'low';
  recommendedActions: string[];
  
  // Timeline
  expectedFollowUp?: string;
  timeToConfirmation?: string;
}

export interface CorrelationRule {
  id: string;
  name: string;
  description: string;
  requiredSignals: Array<'power' | 'bgp' | 'ct' | 'sec' | 'epa'>;
  pattern: CorrelatedIntelligence['pattern'];
  baseConfidence: number;
  evaluate: (signals: CorrelatedIntelligence['signals']) => {
    matches: boolean;
    confidence: number;
    evidence: string[];
    inference: string;
  };
}

// ============================================================================
// CORRELATION RULES
// ============================================================================

const CORRELATION_RULES: CorrelationRule[] = [
  {
    id: 'expansion_confirmed',
    name: 'Confirmed Expansion',
    description: 'Multiple signals indicate infrastructure expansion',
    requiredSignals: ['bgp', 'ct'],
    pattern: 'expansion',
    baseConfidence: 0.85,
    evaluate: (signals) => {
      const bgp = signals.bgp;
      const ct = signals.ct;
      const power = signals.power;
      
      const hasNewPrefixes = bgp && bgp.newPrefixes > 0;
      const hasFacilityPatterns = ct && ct.facilityPatterns > 0;
      const hasPowerGrowth = power?.health?.powerTrend === 'growing';
      
      if (hasNewPrefixes && hasFacilityPatterns) {
        const evidence = [
          `${bgp!.newPrefixes} new BGP prefix(es) announced`,
          `${ct!.facilityPatterns} facility naming patterns in CT logs`
        ];
        
        if (hasPowerGrowth) {
          evidence.push(`Power trend: growing at ${power!.health!.powerTrendSlope.toFixed(1)} kW/day`);
        }
        
        if (ct!.geographicHints.length > 0) {
          evidence.push(`Geographic hints: ${ct!.geographicHints.join(', ')}`);
        }
        
        return {
          matches: true,
          confidence: hasPowerGrowth ? 0.95 : 0.85,
          evidence,
          inference: 'High confidence infrastructure expansion detected. New network segments and facility certificates confirm deployment activity.'
        };
      }
      
      return { matches: false, confidence: 0, evidence: [], inference: '' };
    }
  },
  
  {
    id: 'expansion_likely',
    name: 'Probable Expansion',
    description: 'CT certificates suggest expansion, awaiting BGP confirmation',
    requiredSignals: ['ct'],
    pattern: 'expansion',
    baseConfidence: 0.65,
    evaluate: (signals) => {
      const ct = signals.ct;
      const power = signals.power;
      
      if (ct && ct.facilityPatterns > 0) {
        const evidence = [
          `${ct.facilityPatterns} facility naming patterns detected`,
          'CT certificates typically precede BGP announcements by 1-4 weeks'
        ];
        
        let confidence = 0.65;
        
        if (ct.geographicHints.length > 0) {
          evidence.push(`Geographic expansion: ${ct.geographicHints.join(', ')}`);
          confidence += 0.1;
        }
        
        if (power?.health?.expansionProbability && power.health.expansionProbability > 0.5) {
          evidence.push(`Power analysis suggests ${(power.health.expansionProbability * 100).toFixed(0)}% expansion probability`);
          confidence += 0.1;
        }
        
        return {
          matches: true,
          confidence: Math.min(confidence, 0.85),
          evidence,
          inference: 'Certificate activity suggests infrastructure deployment. Monitor for BGP announcements to confirm.'
        };
      }
      
      return { matches: false, confidence: 0, evidence: [], inference: '' };
    }
  },
  
  {
    id: 'business_stress',
    name: 'Business Stress Indicators',
    description: 'Power decline without corresponding network changes',
    requiredSignals: ['power'],
    pattern: 'stress',
    baseConfidence: 0.6,
    evaluate: (signals) => {
      const power = signals.power;
      const sec = signals.sec;
      
      if (power?.health?.powerTrend === 'declining' && power.health.churnRisk > 0.3) {
        const evidence = [
          `Power declining at ${Math.abs(power.health.powerTrendSlope).toFixed(1)} kW/day`,
          `Churn risk: ${(power.health.churnRisk * 100).toFixed(0)}%`
        ];
        
        let confidence = 0.6;
        
        if (power.health.stressSignals.length > 0) {
          evidence.push(...power.health.stressSignals);
          confidence += 0.1;
        }
        
        if (sec && sec.expansionSignals.length === 0) {
          evidence.push('No expansion signals in SEC filings');
          confidence += 0.1;
        }
        
        return {
          matches: true,
          confidence,
          evidence,
          inference: 'Facility showing signs of business stress. Monitor for customer migrations or operational issues.'
        };
      }
      
      return { matches: false, confidence: 0, evidence: [], inference: '' };
    }
  },
  
  {
    id: 'decommission_signal',
    name: 'Potential Decommission',
    description: 'BGP withdrawals combined with declining power',
    requiredSignals: ['bgp', 'power'],
    pattern: 'contraction',
    baseConfidence: 0.7,
    evaluate: (signals) => {
      const bgp = signals.bgp;
      const power = signals.power;
      
      if (bgp && bgp.withdrawals > 0 && power?.health?.powerTrend === 'declining') {
        const evidence = [
          `${bgp.withdrawals} BGP route withdrawal(s)`,
          `Power declining at ${Math.abs(power.health!.powerTrendSlope).toFixed(1)} kW/day`
        ];
        
        return {
          matches: true,
          confidence: 0.75,
          evidence,
          inference: 'Route withdrawals combined with power decline suggest facility or service decommissioning.'
        };
      }
      
      return { matches: false, confidence: 0, evidence: [], inference: '' };
    }
  },
  
  {
    id: 'crypto_detection',
    name: 'Cryptocurrency Mining Detected',
    description: 'Workload classification indicates mining activity',
    requiredSignals: ['power'],
    pattern: 'stable',
    baseConfidence: 0.9,
    evaluate: (signals) => {
      const power = signals.power;
      
      if (power?.workload?.primaryType === 'crypto_mining' && power.workload.confidence > 0.7) {
        const evidence = [
          `Workload classified as crypto mining (${(power.workload.confidence * 100).toFixed(0)}% confidence)`,
          ...power.workload.signals
        ];
        
        return {
          matches: true,
          confidence: power.workload.confidence,
          evidence,
          inference: 'High probability of cryptocurrency mining operations. Monitor for regulatory and compliance implications.'
        };
      }
      
      return { matches: false, confidence: 0, evidence: [], inference: '' };
    }
  },
  
  {
    id: 'ai_training',
    name: 'AI Training Activity',
    description: 'Workload patterns consistent with AI/ML training',
    requiredSignals: ['power'],
    pattern: 'stable',
    baseConfidence: 0.85,
    evaluate: (signals) => {
      const power = signals.power;
      
      if (power?.workload?.primaryType === 'ai_training' && power.workload.confidence > 0.6) {
        const evidence = [
          `Workload classified as AI training (${(power.workload.confidence * 100).toFixed(0)}% confidence)`,
          ...power.workload.signals
        ];
        
        return {
          matches: true,
          confidence: power.workload.confidence,
          evidence,
          inference: 'AI/ML training activity detected. Indicates significant compute investment and potential competitive AI development.'
        };
      }
      
      return { matches: false, confidence: 0, evidence: [], inference: '' };
    }
  },
  
  {
    id: 'compliance_alert',
    name: 'Compliance Issue',
    description: 'EPA violations or permit issues detected',
    requiredSignals: ['epa'],
    pattern: 'stress',
    baseConfidence: 0.8,
    evaluate: (signals) => {
      const epa = signals.epa;
      
      if (epa && (epa.violations > 0 || epa.complianceStatus === 'violation')) {
        const evidence = [
          `${epa.violations} EPA violation(s) on record`,
          `Compliance status: ${epa.complianceStatus}`
        ];
        
        return {
          matches: true,
          confidence: 0.85,
          evidence,
          inference: 'Environmental compliance issues detected. May indicate operational problems or regulatory risk.'
        };
      }
      
      return { matches: false, confidence: 0, evidence: [], inference: '' };
    }
  }
];

// ============================================================================
// CORRELATION ENGINE
// ============================================================================

/**
 * Multi-Signal Correlation Engine
 */
export class CorrelationEngine {
  private correlations: Map<string, CorrelatedIntelligence> = new Map();
  private signalCache: Map<string, Signal[]> = new Map();

  /**
   * Add a signal for a facility
   */
  addSignal(facilityId: string, signal: Signal): void {
    const key = facilityId;
    if (!this.signalCache.has(key)) {
      this.signalCache.set(key, []);
    }
    
    const signals = this.signalCache.get(key)!;
    signals.push(signal);
    
    // Keep only recent signals (last 24 hours)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    this.signalCache.set(key, signals.filter(s => s.timestamp > cutoff));
  }

  /**
   * Correlate all signals for a facility
   */
  correlateSignals(
    facilityId: string, 
    timeWindow: { start: number; end: number } = { 
      start: Date.now() - 7 * 24 * 60 * 60 * 1000, 
      end: Date.now() 
    }
  ): CorrelatedIntelligence {
    const cachedSignals = this.signalCache.get(facilityId) || [];
    const windowedSignals = cachedSignals.filter(s => 
      s.timestamp >= timeWindow.start && s.timestamp <= timeWindow.end
    );
    
    // Organize signals by type
    const signals: CorrelatedIntelligence['signals'] = {
      power: null,
      bgp: null,
      ct: null,
      sec: null,
      epa: null
    };
    
    for (const signal of windowedSignals) {
      signals[signal.type] = signal as never;
    }
    
    // Count available signals
    const signalCount = Object.values(signals).filter(Boolean).length;
    
    // Evaluate correlation rules
    const matchedRules: Array<{
      rule: CorrelationRule;
      result: ReturnType<CorrelationRule['evaluate']>;
    }> = [];
    
    for (const rule of CORRELATION_RULES) {
      const result = rule.evaluate(signals);
      if (result.matches) {
        matchedRules.push({ rule, result });
      }
    }
    
    // Build intelligence from matched rules
    const hypothesis = this.buildHypothesis(matchedRules, signals);
    const supportingEvidence = matchedRules.flatMap(m => m.result.evidence);
    const contradictingEvidence = this.findContradictions(signals);
    
    // Determine pattern and priority
    const pattern = matchedRules.length > 0 
      ? matchedRules[0].rule.pattern 
      : 'unknown';
    
    const combinedConfidence = matchedRules.length > 0
      ? Math.max(...matchedRules.map(m => m.result.confidence))
      : signalCount > 0 ? 0.3 : 0;
    
    const investigationPriority = this.calculatePriority(
      combinedConfidence, 
      signalCount, 
      pattern
    );
    
    const intelligence: CorrelatedIntelligence = {
      id: `corr_${Date.now()}_${facilityId}`,
      facilityId,
      timestamp: Date.now(),
      signals,
      signalCount,
      combinedConfidence,
      hypothesis: hypothesis.text,
      supportingEvidence,
      contradictingEvidence,
      pattern,
      businessInference: hypothesis.inference,
      investigationPriority,
      recommendedActions: this.generateRecommendations(pattern, signals, combinedConfidence),
      expectedFollowUp: this.estimateFollowUp(pattern),
      timeToConfirmation: this.estimateConfirmationTime(signals)
    };
    
    // Store correlation
    this.correlations.set(intelligence.id, intelligence);
    this.persistCorrelation(intelligence);
    
    return intelligence;
  }

  /**
   * Build hypothesis from matched rules
   */
  private buildHypothesis(
    matchedRules: Array<{ rule: CorrelationRule; result: ReturnType<CorrelationRule['evaluate']> }>,
    signals: CorrelatedIntelligence['signals']
  ): { text: string; inference: string } {
    if (matchedRules.length === 0) {
      const signalTypes = Object.entries(signals)
        .filter(([, v]) => v !== null)
        .map(([k]) => k);
      
      if (signalTypes.length === 0) {
        return {
          text: 'No signals available for correlation',
          inference: 'Insufficient data to form hypothesis'
        };
      }
      
      return {
        text: `${signalTypes.length} signal type(s) available: ${signalTypes.join(', ')}`,
        inference: 'Signals present but no clear pattern detected'
      };
    }
    
    // Use highest confidence match
    const topMatch = matchedRules.sort((a, b) => 
      b.result.confidence - a.result.confidence
    )[0];
    
    return {
      text: topMatch.rule.description,
      inference: topMatch.result.inference
    };
  }

  /**
   * Find contradicting evidence
   */
  private findContradictions(signals: CorrelatedIntelligence['signals']): string[] {
    const contradictions: string[] = [];
    
    // CT says expansion but power is declining
    if (signals.ct?.facilityPatterns && signals.power?.health?.powerTrend === 'declining') {
      contradictions.push('CT shows expansion patterns but power is declining');
    }
    
    // BGP stable but power shows major changes
    if (!signals.bgp?.newPrefixes && !signals.bgp?.withdrawals && 
        signals.power?.health && Math.abs(signals.power.health.powerTrendSlope) > 100) {
      contradictions.push('Significant power changes without corresponding BGP activity');
    }
    
    // SEC mentions expansion but no infrastructure signals
    if (signals.sec?.expansionSignals?.length && 
        !signals.bgp?.newPrefixes && !signals.ct?.facilityPatterns) {
      contradictions.push('SEC mentions expansion but no infrastructure signals detected');
    }
    
    return contradictions;
  }

  /**
   * Calculate investigation priority
   */
  private calculatePriority(
    confidence: number, 
    signalCount: number, 
    pattern: string
  ): 'critical' | 'high' | 'medium' | 'low' {
    // High confidence + multiple signals = high priority
    if (confidence > 0.8 && signalCount >= 3) return 'critical';
    if (confidence > 0.7 && signalCount >= 2) return 'high';
    if (confidence > 0.5 || signalCount >= 2) return 'medium';
    return 'low';
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendations(
    pattern: string, 
    signals: CorrelatedIntelligence['signals'],
    confidence: number
  ): string[] {
    const recommendations: string[] = [];
    
    // Always recommend verification for medium confidence
    if (confidence < 0.7) {
      recommendations.push('Verify with additional data sources');
    }
    
    switch (pattern) {
      case 'expansion':
        recommendations.push('Monitor for SEC 8-K filings mentioning facility expansion');
        recommendations.push('Track BGP announcements for confirmation');
        if (!signals.power) {
          recommendations.push('Add power monitoring for this facility');
        }
        break;
        
      case 'contraction':
        recommendations.push('Check for press releases about facility closures');
        recommendations.push('Monitor customer migration announcements');
        break;
        
      case 'stress':
        recommendations.push('Investigate root cause of decline');
        recommendations.push('Check for regulatory or compliance issues');
        recommendations.push('Monitor for customer churn signals');
        break;
        
      default:
        if (!signals.bgp) recommendations.push('Add BGP monitoring');
        if (!signals.ct) recommendations.push('Add CT monitoring');
        if (!signals.power) recommendations.push('Add power monitoring');
    }
    
    return recommendations;
  }

  /**
   * Estimate when to expect follow-up signals
   */
  private estimateFollowUp(pattern: string): string {
    switch (pattern) {
      case 'expansion':
        return 'Expect BGP announcements within 1-4 weeks of CT signals';
      case 'contraction':
        return 'Monitor for SEC 8-K within 4 business days';
      case 'stress':
        return 'Check for updates weekly';
      default:
        return 'Continue routine monitoring';
    }
  }

  /**
   * Estimate time to confirmation
   */
  private estimateConfirmationTime(signals: CorrelatedIntelligence['signals']): string {
    const hasMultiple = Object.values(signals).filter(Boolean).length >= 2;
    
    if (signals.bgp && signals.ct && signals.power) {
      return 'Confirmed (multi-source corroboration)';
    }
    if (signals.ct && !signals.bgp) {
      return '1-4 weeks (awaiting BGP confirmation)';
    }
    if (signals.bgp && !signals.sec) {
      return '1-2 weeks (awaiting SEC disclosure)';
    }
    return hasMultiple ? '1-2 weeks' : '2-4 weeks';
  }

  /**
   * Persist correlation to IndexedDB
   */
  private async persistCorrelation(correlation: CorrelatedIntelligence): Promise<void> {
    try {
      await db.correlations?.put(correlation);
    } catch (error) {
      console.warn('Could not persist correlation', error);
    }
  }

  /**
   * Get all correlations for a facility
   */
  getCorrelations(facilityId: string): CorrelatedIntelligence[] {
    return Array.from(this.correlations.values())
      .filter(c => c.facilityId === facilityId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * Get high priority correlations
   */
  getHighPriorityCorrelations(): CorrelatedIntelligence[] {
    return Array.from(this.correlations.values())
      .filter(c => c.investigationPriority === 'critical' || c.investigationPriority === 'high')
      .sort((a, b) => b.combinedConfidence - a.combinedConfidence);
  }

  /**
   * Get correlations by pattern
   */
  getCorrelationsByPattern(pattern: CorrelatedIntelligence['pattern']): CorrelatedIntelligence[] {
    return Array.from(this.correlations.values())
      .filter(c => c.pattern === pattern);
  }

  /**
   * Clear cached signals
   */
  clearCache(): void {
    this.signalCache.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const correlationEngine = new CorrelationEngine();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for correlation engine
 */
export function useCorrelation() {
  const [correlations, setCorrelations] = useState<CorrelatedIntelligence[]>([]);
  const [highPriority, setHighPriority] = useState<CorrelatedIntelligence[]>([]);

  const refresh = useCallback(() => {
    setCorrelations(Array.from((correlationEngine as CorrelationEngine & { correlations: Map<string, CorrelatedIntelligence> }).correlations?.values() || []));
    setHighPriority(correlationEngine.getHighPriorityCorrelations());
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, [refresh]);

  const addSignal = useCallback((facilityId: string, signal: Signal) => {
    correlationEngine.addSignal(facilityId, signal);
  }, []);

  const correlate = useCallback((facilityId: string, timeWindow?: { start: number; end: number }) => {
    const result = correlationEngine.correlateSignals(facilityId, timeWindow);
    refresh();
    return result;
  }, [refresh]);

  const getForFacility = useCallback((facilityId: string) => {
    return correlationEngine.getCorrelations(facilityId);
  }, []);

  return {
    correlations,
    highPriority,
    addSignal,
    correlate,
    getForFacility,
    refresh
  };
}

