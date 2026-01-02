/**
 * useComplianceAssurance Hook
 * 
 * Real-time compliance assurance monitoring
 * Inspired by Juniper Marvis AI
 */

import { useState, useEffect, useCallback } from 'react';
import type { Facility } from '../types';
import {
  complianceAssuranceEngine,
  type AssuranceResult,
  type DriftAlert,
  type ComplianceIntent,
} from '../analyzers/assurance/complianceAssuranceEngine';

export interface AssuranceState {
  results: Map<string, AssuranceResult>;
  alerts: DriftAlert[];
  totalViolations: number;
  totalDrifting: number;
  criticalAlerts: number;
  lastUpdate: Date | null;
  isMonitoring: boolean;
}

export function useComplianceAssurance(facilities: Facility[]) {
  const [state, setState] = useState<AssuranceState>({
    results: new Map(),
    alerts: [],
    totalViolations: 0,
    totalDrifting: 0,
    criticalAlerts: 0,
    lastUpdate: null,
    isMonitoring: false,
  });
  
  const [loading, setLoading] = useState(false);
  
  /**
   * Run assurance checks on all facilities
   */
  const runAssurance = useCallback(async () => {
    if (facilities.length === 0) return;
    
    setLoading(true);
    
    try {
      const results = new Map<string, AssuranceResult>();
      let violations = 0;
      let drifting = 0;
      
      // Run assurance checks (in parallel for performance)
      await Promise.all(
        facilities.map(async (facility) => {
          const result = await complianceAssuranceEngine.runAssurance(facility);
          results.set(facility.id, result);
          
          if (result.status === 'VIOLATED') violations++;
          if (result.status === 'DRIFTING') drifting++;
        })
      );
      
      // Detect drift and generate alerts
      const alerts = await complianceAssuranceEngine.detectDrift(facilities);
      const critical = alerts.filter(a => a.severity === 'critical').length;
      
      setState({
        results,
        alerts,
        totalViolations: violations,
        totalDrifting: drifting,
        criticalAlerts: critical,
        lastUpdate: new Date(),
        isMonitoring: true,
      });
    } catch (error) {
      console.error('[useComplianceAssurance] Error running assurance:', error);
    } finally {
      setLoading(false);
    }
  }, [facilities]);
  
  /**
   * Query facilities using natural language
   */
  const queryIntent = useCallback(
    async (naturalLanguage: string): Promise<Facility[]> => {
      return complianceAssuranceEngine.queryIntent(naturalLanguage, facilities);
    },
    [facilities]
  );
  
  /**
   * Register compliance intent for a facility
   */
  const registerIntent = useCallback((intent: ComplianceIntent) => {
    complianceAssuranceEngine.registerIntent(intent);
    runAssurance(); // Re-run assurance after registering intent
  }, [runAssurance]);
  
  /**
   * Get assurance result for specific facility
   */
  const getResult = useCallback(
    (facilityId: string): AssuranceResult | null => {
      return state.results.get(facilityId) || null;
    },
    [state.results]
  );
  
  /**
   * Auto-run assurance every 5 minutes (like Marvis continuous monitoring)
   */
  useEffect(() => {
    if (facilities.length === 0) return;
    
    // Initial run
    runAssurance();
    
    // Set up interval for continuous monitoring
    const interval = setInterval(() => {
      runAssurance();
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [facilities, runAssurance]);
  
  return {
    ...state,
    loading,
    runAssurance,
    queryIntent,
    registerIntent,
    getResult,
  };
}

