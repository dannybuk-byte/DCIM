/**
 * useUnifiedIntelligence Hook
 * 
 * React integration for unified intelligence engine
 */

import { useState, useEffect, useCallback } from 'react';
import type { Facility } from '../types';
import {
  unifiedIntelligenceEngine,
  type IntelligenceFinding,
  type IntelligenceScenario,
} from '../analyzers/unified/intelligenceEngine';

export interface UnifiedIntelligenceState {
  findings: IntelligenceFinding[];
  scenarios: Map<string, IntelligenceScenario>;
  loading: boolean;
  lastUpdate: Date | null;
  
  // Statistics
  totalFindings: number;
  criticalFindings: number;
  anomalies: number;
  violations: number;
  predictions: number;
  correlations: number;
}

export function useUnifiedIntelligence(facilities: Facility[]) {
  const [state, setState] = useState<UnifiedIntelligenceState>({
    findings: [],
    scenarios: new Map(),
    loading: false,
    lastUpdate: null,
    totalFindings: 0,
    criticalFindings: 0,
    anomalies: 0,
    violations: 0,
    predictions: 0,
    correlations: 0,
  });
  
  /**
   * Run comprehensive intelligence analysis
   */
  const runIntelligence = useCallback(async () => {
    if (facilities.length === 0) return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const findings = await unifiedIntelligenceEngine.runIntelligence(facilities);
      
      // Calculate statistics
      const stats = {
        totalFindings: findings.length,
        criticalFindings: findings.filter(f => f.severity === 'critical').length,
        anomalies: findings.filter(f => f.category === 'anomaly').length,
        violations: findings.filter(f => f.category === 'intent-violation').length,
        predictions: findings.filter(f => f.category === 'prediction').length,
        correlations: findings.filter(f => f.category === 'pattern').length,
      };
      
      setState(prev => ({
        ...prev,
        findings,
        lastUpdate: new Date(),
        loading: false,
        ...stats,
      }));
    } catch (error) {
      console.error('[useUnifiedIntelligence] Error:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, [facilities]);
  
  /**
   * Run a scenario
   */
  const runScenario = useCallback(
    async (config: {
      name: string;
      filters: IntelligenceScenario['filters'];
      analysis: IntelligenceScenario['analysis'];
    }) => {
      setState(prev => ({ ...prev, loading: true }));
      
      try {
        const scenario = await unifiedIntelligenceEngine.runScenario(config, facilities);
        
        setState(prev => ({
          ...prev,
          scenarios: new Map(prev.scenarios).set(scenario.id, scenario),
          loading: false,
        }));
        
        return scenario;
      } catch (error) {
        console.error('[useUnifiedIntelligence] Scenario error:', error);
        setState(prev => ({ ...prev, loading: false }));
        throw error;
      }
    },
    [facilities]
  );
  
  /**
   * Get graph visualization with intelligence overlay
   */
  const getIntelligentGraph = useCallback(() => {
    return unifiedIntelligenceEngine.getGraphVisualization(facilities);
  }, [facilities]);
  
  /**
   * Filter findings by category
   */
  const filterFindings = useCallback(
    (category?: IntelligenceFinding['category']) => {
      if (!category) return state.findings;
      return state.findings.filter(f => f.category === category);
    },
    [state.findings]
  );
  
  /**
   * Get related findings for a specific finding
   */
  const getRelatedFindings = useCallback(
    (findingId: string): IntelligenceFinding[] => {
      const finding = state.findings.find(f => f.id === findingId);
      if (!finding || finding.relatedFindings.length === 0) return [];
      
      return state.findings.filter(f => 
        finding.relatedFindings.includes(f.id)
      );
    },
    [state.findings]
  );
  
  /**
   * Auto-run on mount and when facilities change
   */
  useEffect(() => {
    if (facilities.length > 0) {
      runIntelligence();
    }
  }, [facilities, runIntelligence]);
  
  return {
    ...state,
    runIntelligence,
    runScenario,
    getIntelligentGraph,
    filterFindings,
    getRelatedFindings,
  };
}

