/**
 * Predictive Analytics Hook
 * 
 * React hook for accessing forecasting, risk scoring, and scenario simulation
 */

import { useState, useCallback, useMemo, useTransition } from 'react';
import type { Facility } from '../types';
import type {
  ForecastResult,
  ForecastConfig,
  FacilityRiskScore,
  OperatorRiskProfile,
  RiskModelMetrics,
  ScenarioResult,
  PresetScenario,
  PredictiveInsights,
} from '../analyzers/predictive/types';
import {
  generateForecast,
  calculateFacilityRisk,
  calculateOperatorProfile,
  calculateModelMetrics,
  runMonteCarloSimulation,
  getPresetScenarioConfig,
  compareScenarios,
} from '../analyzers/predictive/engine';

interface UsePredictiveAnalyticsState {
  forecasts: ForecastResult[];
  facilityRisks: FacilityRiskScore[];
  operatorProfiles: OperatorRiskProfile[];
  modelMetrics: RiskModelMetrics | null;
  scenarios: ScenarioResult[];
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

interface UsePredictiveAnalyticsActions {
  generateForecasts: (configs: ForecastConfig[]) => void;
  calculateAllRisks: () => void;
  runScenario: (preset: PresetScenario, horizonMonths?: number) => void;
  compareAllScenarios: () => void;
  refreshAll: () => void;
  getTopRiskFacilities: (limit?: number) => FacilityRiskScore[];
  getOperatorByRisk: () => OperatorRiskProfile[];
  getInsights: () => PredictiveInsights;
}

export function usePredictiveAnalytics(
  facilities: Facility[]
): UsePredictiveAnalyticsState & UsePredictiveAnalyticsActions {
  const [state, setState] = useState<UsePredictiveAnalyticsState>({
    forecasts: [],
    facilityRisks: [],
    operatorProfiles: [],
    modelMetrics: null,
    scenarios: [],
    isLoading: false,
    error: null,
    lastUpdated: null,
  });
  
  const [isPending, startTransition] = useTransition();

  // Generate forecasts for specified metrics
  const generateForecasts = useCallback((configs: ForecastConfig[]) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    startTransition(() => {
      try {
        const forecasts = configs.map(config => generateForecast(facilities, config));
        setState(prev => ({
          ...prev,
          forecasts,
          isLoading: false,
          lastUpdated: new Date(),
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Forecast generation failed',
        }));
      }
    });
  }, [facilities]);

  // Calculate risk scores for all facilities
  const calculateAllRisks = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    startTransition(() => {
      try {
        // Calculate facility risks
        const facilityRisks = facilities.map(f => calculateFacilityRisk(f, facilities));
        
        // Get unique operators
        const operators = [...new Set(facilities.map(f => f.operator))];
        
        // Calculate operator profiles
        const operatorProfiles = operators.map(op => 
          calculateOperatorProfile(op, facilities, facilityRisks)
        );
        
        // Calculate model metrics
        const modelMetrics = calculateModelMetrics(facilities, facilityRisks);
        
        setState(prev => ({
          ...prev,
          facilityRisks,
          operatorProfiles,
          modelMetrics,
          isLoading: false,
          lastUpdated: new Date(),
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Risk calculation failed',
        }));
      }
    });
  }, [facilities]);

  // Run a single scenario
  const runScenario = useCallback((preset: PresetScenario, horizonMonths: number = 12) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    startTransition(() => {
      try {
        const config = getPresetScenarioConfig(preset, horizonMonths, 5000);
        const result = runMonteCarloSimulation(facilities, config);
        
        setState(prev => ({
          ...prev,
          scenarios: [...prev.scenarios.filter(s => s.scenarioName !== result.scenarioName), result],
          isLoading: false,
          lastUpdated: new Date(),
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Scenario simulation failed',
        }));
      }
    });
  }, [facilities]);

  // Compare all preset scenarios
  const compareAllScenarios = useCallback(() => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    startTransition(() => {
      try {
        const presets: PresetScenario[] = [
          'baseline',
          'optimistic',
          'pessimistic',
          'regulatory_crackdown',
          'economic_downturn',
          'tech_modernization',
        ];
        
        const scenarios = compareScenarios(facilities, presets);
        
        setState(prev => ({
          ...prev,
          scenarios,
          isLoading: false,
          lastUpdated: new Date(),
        }));
      } catch (err) {
        setState(prev => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Scenario comparison failed',
        }));
      }
    });
  }, [facilities]);

  // Refresh all analytics
  const refreshAll = useCallback(() => {
    const defaultForecasts: ForecastConfig[] = [
      { metric: 'subsidyGap', horizonMonths: 12, includeSeasonality: true, confidenceLevel: 0.95 },
      { metric: 'complianceRate', horizonMonths: 12, includeSeasonality: true, confidenceLevel: 0.95 },
      { metric: 'facilityCount', horizonMonths: 12, includeSeasonality: false, confidenceLevel: 0.95 },
      { metric: 'atRiskRate', horizonMonths: 12, includeSeasonality: true, confidenceLevel: 0.95 },
    ];
    
    generateForecasts(defaultForecasts);
    calculateAllRisks();
    compareAllScenarios();
  }, [generateForecasts, calculateAllRisks, compareAllScenarios]);

  // Get top risk facilities
  const getTopRiskFacilities = useCallback((limit: number = 20): FacilityRiskScore[] => {
    return [...state.facilityRisks]
      .sort((a, b) => b.overallScore - a.overallScore)
      .slice(0, limit);
  }, [state.facilityRisks]);

  // Get operators sorted by risk
  const getOperatorByRisk = useCallback((): OperatorRiskProfile[] => {
    return [...state.operatorProfiles]
      .sort((a, b) => b.avgRiskScore - a.avgRiskScore);
  }, [state.operatorProfiles]);

  // Generate insights summary
  const getInsights = useCallback((): PredictiveInsights => {
    const keyInsights: PredictiveInsights['keyInsights'] = [];
    
    // Forecast insights
    state.forecasts.forEach(f => {
      if (f.trend === 'increasing' && f.metric === 'subsidyGap') {
        keyInsights.push({
          category: 'forecast',
          severity: 'critical',
          title: 'Subsidy Gap Projected to Increase',
          description: `${f.metric} is trending upward with ${f.mape.toFixed(1)}% forecast accuracy`,
          confidence: 1 - f.mape / 100,
          actionable: true,
        });
      }
      if (f.trend === 'decreasing' && f.metric === 'complianceRate') {
        keyInsights.push({
          category: 'forecast',
          severity: 'warning',
          title: 'Compliance Rate Declining',
          description: 'Compliance rate shows downward trend over forecast horizon',
          confidence: 1 - f.mape / 100,
          actionable: true,
        });
      }
    });
    
    // Risk insights
    const criticalFacilities = state.facilityRisks.filter(r => r.riskCategory === 'Critical');
    if (criticalFacilities.length > 0) {
      keyInsights.push({
        category: 'risk',
        severity: 'critical',
        title: `${criticalFacilities.length} Critical Risk Facilities`,
        description: `Top risk: ${criticalFacilities[0]?.facilityName} (${criticalFacilities[0]?.overallScore}/100)`,
        confidence: 0.85,
        actionable: true,
      });
    }
    
    // Scenario insights
    const baselineScenario = state.scenarios.find(s => s.scenarioName === 'Baseline');
    const optimisticScenario = state.scenarios.find(s => s.scenarioName === 'Optimistic');
    if (baselineScenario && optimisticScenario) {
      const potentialSavings = baselineScenario.outcomes.totalSubsidyGap.mean - 
                               optimisticScenario.outcomes.totalSubsidyGap.mean;
      if (potentialSavings > 0) {
        keyInsights.push({
          category: 'scenario',
          severity: 'info',
          title: 'Potential Savings Identified',
          description: `Optimistic scenario could reduce gap by $${(potentialSavings / 1e6).toFixed(1)}M`,
          confidence: optimisticScenario.probabilityOfImprovement,
          actionable: true,
        });
      }
    }
    
    return {
      timestamp: new Date(),
      forecasts: state.forecasts,
      facilityRisks: state.facilityRisks,
      operatorProfiles: state.operatorProfiles,
      modelMetrics: state.modelMetrics || {
        accuracy: 0,
        precision: 0,
        recall: 0,
        f1Score: 0,
        auc: 0,
        featureImportance: [],
      },
      scenarios: state.scenarios,
      keyInsights,
    };
  }, [state]);

  return {
    ...state,
    isLoading: state.isLoading || isPending,
    generateForecasts,
    calculateAllRisks,
    runScenario,
    compareAllScenarios,
    refreshAll,
    getTopRiskFacilities,
    getOperatorByRisk,
    getInsights,
  };
}

export default usePredictiveAnalytics;

