/**
 * Predictive Intelligence Hub - Type Definitions
 * 
 * Types for forecasting, risk scoring, and scenario simulation
 */

// Time Series Forecasting Types
export interface TimeSeriesPoint {
  date: Date;
  value: number;
  isActual: boolean; // true = historical, false = forecast
}

export interface ForecastResult {
  metric: string;
  historical: TimeSeriesPoint[];
  forecast: TimeSeriesPoint[];
  confidenceLower: TimeSeriesPoint[]; // 95% CI lower bound
  confidenceUpper: TimeSeriesPoint[]; // 95% CI upper bound
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: 'quarterly' | 'monthly' | 'none';
  mape: number; // Mean Absolute Percentage Error
  rmse: number; // Root Mean Square Error
  forecastHorizon: number; // months
}

export interface ForecastConfig {
  metric: 'subsidyGap' | 'complianceRate' | 'facilityCount' | 'issuesCount' | 'atRiskRate';
  horizonMonths: number;
  includeSeasonality: boolean;
  confidenceLevel: number; // 0.95 for 95% CI
}

// Risk Scoring Types
export interface RiskFactor {
  name: string;
  weight: number; // 0-1, importance
  value: number; // normalized 0-100
  contribution: number; // weighted contribution to total score
  description: string;
}

export interface FacilityRiskScore {
  facilityId: string;
  facilityName: string;
  operator: string;
  state: string;
  overallScore: number; // 0-100, higher = riskier
  riskCategory: 'Critical' | 'High' | 'Medium' | 'Low' | 'Minimal';
  factors: RiskFactor[];
  probabilityOfNonCompliance: number; // 0-1
  expectedSubsidyGapChange: number; // projected $ change
  recommendedActions: string[];
  confidence: number; // model confidence 0-1
}

export interface OperatorRiskProfile {
  operator: string;
  facilityCount: number;
  avgRiskScore: number;
  riskDistribution: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    minimal: number;
  };
  topRiskFactors: RiskFactor[];
  trendDirection: 'improving' | 'worsening' | 'stable';
  projectedGap12mo: number;
}

export interface RiskModelMetrics {
  accuracy: number; // classification accuracy
  precision: number;
  recall: number;
  f1Score: number;
  auc: number; // Area Under ROC Curve
  featureImportance: { feature: string; importance: number }[];
}

// Monte Carlo Simulation Types
export interface ScenarioParameter {
  name: string;
  baseValue: number;
  minValue: number;
  maxValue: number;
  distribution: 'normal' | 'uniform' | 'triangular' | 'lognormal';
  stdDev?: number; // for normal distribution
}

export interface ScenarioConfig {
  name: string;
  description: string;
  parameters: ScenarioParameter[];
  iterations: number; // Monte Carlo iterations
  timeHorizonMonths: number;
}

export interface SimulationOutcome {
  metric: string;
  mean: number;
  median: number;
  stdDev: number;
  percentile5: number;
  percentile25: number;
  percentile75: number;
  percentile95: number;
  min: number;
  max: number;
  distribution: number[]; // histogram bins
}

export interface ScenarioResult {
  scenarioName: string;
  config: ScenarioConfig;
  outcomes: {
    totalSubsidyGap: SimulationOutcome;
    complianceRate: SimulationOutcome;
    nonCompliantCount: SimulationOutcome;
    atRiskCount: SimulationOutcome;
  };
  probabilityOfImprovement: number;
  expectedValueAtRisk: number; // VaR at 95%
  convergenceAchieved: boolean;
  executionTimeMs: number;
}

export interface ScenarioComparison {
  scenarios: ScenarioResult[];
  baselineScenario: string;
  bestCaseScenario: string;
  worstCaseScenario: string;
  sensitivityAnalysis: {
    parameter: string;
    elasticity: number; // % change in outcome per % change in parameter
  }[];
}

// Preset Scenarios
export type PresetScenario = 
  | 'baseline' // Current trajectory
  | 'optimistic' // Best-case improvements
  | 'pessimistic' // Worst-case degradation
  | 'regulatory_crackdown' // Increased enforcement
  | 'economic_downturn' // Budget cuts
  | 'tech_modernization' // Infrastructure upgrades
  | 'custom';

// Aggregated Predictions
export interface PredictiveInsights {
  timestamp: Date;
  forecasts: ForecastResult[];
  facilityRisks: FacilityRiskScore[];
  operatorProfiles: OperatorRiskProfile[];
  modelMetrics: RiskModelMetrics;
  scenarios: ScenarioResult[];
  keyInsights: {
    category: 'forecast' | 'risk' | 'scenario';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    confidence: number;
    actionable: boolean;
  }[];
}

