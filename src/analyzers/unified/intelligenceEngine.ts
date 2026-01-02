/**
 * Unified Compliance Intelligence Engine
 * 
 * Merges capabilities from:
 * - Pattern Analysis (statistical detection)
 * - Pattern Lab (advanced patterns + scenarios)
 * - Compliance Flow (graph visualization)
 * - Assurance Monitor (continuous validation)
 * - Predictive Intelligence (forecasting)
 * 
 * Into a single, coherent intelligence system
 */

import type { Facility } from '../../types';
import { dcimAnalyzer } from '../../utils/dcimAnalyzer';
import { complianceAssuranceEngine } from '../assurance/complianceAssuranceEngine';
import type { DriftAlert } from '../assurance/complianceAssuranceEngine';

// ============================================================================
// UNIFIED TYPES
// ============================================================================

export interface IntelligenceFinding {
  id: string;
  timestamp: Date;
  
  // Classification
  category: 'anomaly' | 'drift' | 'pattern' | 'prediction' | 'intent-violation';
  severity: 'info' | 'warning' | 'critical';
  confidence: number; // 0-1
  
  // Content
  title: string;
  description: string;
  affectedFacilities: string[];
  
  // Analysis
  detectionMethod: 'statistical' | 'graph' | 'assurance' | 'ml-forecasting';
  evidence: {
    metric: string;
    expected: number | string;
    actual: number | string;
    deviation: number;
  }[];
  
  // Visualization
  visualization?: {
    type: 'graph' | 'chart' | 'heatmap' | 'trend';
    data: any;
  };
  
  // Actions
  actionable: boolean;
  suggestedActions: string[];
  
  // Relationships
  relatedFindings: string[]; // IDs of related findings
  causality?: {
    rootCause: string;
    contributingFactors: string[];
  };
}

export interface IntelligenceScenario {
  id: string;
  name: string;
  description: string;
  
  // Configuration
  filters: {
    states?: string[];
    operators?: string[];
    complianceStatus?: string[];
  };
  
  // Analysis Parameters
  analysis: {
    detectAnomalies: boolean;
    validateIntent: boolean;
    forecastTrends: boolean;
    visualizeGraph: boolean;
  };
  
  // Results
  findings: IntelligenceFinding[];
  summary: {
    totalAnomalies: number;
    intentViolations: number;
    predictedViolations: number;
    riskScore: number; // 0-100
  };
}

/**
 * Unified Compliance Intelligence Engine
 * 
 * Single source of truth for all compliance intelligence:
 * - Pattern detection (statistical + ML)
 * - Intent validation (continuous assurance)
 * - Predictive forecasting (ARIMA)
 * - Graph analysis (relationships + clusters)
 */
export class UnifiedIntelligenceEngine {
  private findings: Map<string, IntelligenceFinding> = new Map();
  private scenarios: Map<string, IntelligenceScenario> = new Map();
  
  /**
   * Run comprehensive intelligence analysis
   * (Combines Pattern Analysis, Assurance, and Predictions)
   */
  async runIntelligence(facilities: Facility[]): Promise<IntelligenceFinding[]> {
    const findings: IntelligenceFinding[] = [];
    
    // 1. Statistical Anomalies (from Pattern Analysis)
    const anomalies = await this.detectStatisticalAnomalies(facilities);
    findings.push(...anomalies);
    
    // 2. Intent Violations (from Assurance Monitor)
    const violations = await this.detectIntentViolations(facilities);
    findings.push(...violations);
    
    // 3. Predictive Warnings (from Predictive Intel)
    const predictions = await this.detectPredictiveWarnings(facilities);
    findings.push(...predictions);
    
    // 4. Pattern Correlations (cross-analysis)
    const correlations = await this.detectCorrelations(findings);
    findings.push(...correlations);
    
    // 5. Root Cause Analysis
    this.enrichWithCausality(findings);
    
    // Store findings
    findings.forEach(f => this.findings.set(f.id, f));
    
    return findings.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }
  
  /**
   * Create and run a scenario
   * (Combines Pattern Lab scenarios with Assurance validation)
   */
  async runScenario(config: {
    name: string;
    filters: IntelligenceScenario['filters'];
    analysis: IntelligenceScenario['analysis'];
  }, facilities: Facility[]): Promise<IntelligenceScenario> {
    // Filter facilities based on scenario
    const filtered = this.applyFilters(facilities, config.filters);
    
    const findings: IntelligenceFinding[] = [];
    
    // Run requested analyses
    if (config.analysis.detectAnomalies) {
      const anomalies = await this.detectStatisticalAnomalies(filtered);
      findings.push(...anomalies);
    }
    
    if (config.analysis.validateIntent) {
      const violations = await this.detectIntentViolations(filtered);
      findings.push(...violations);
    }
    
    if (config.analysis.forecastTrends) {
      const predictions = await this.detectPredictiveWarnings(filtered);
      findings.push(...predictions);
    }
    
    // Calculate summary metrics
    const summary = {
      totalAnomalies: findings.filter(f => f.category === 'anomaly').length,
      intentViolations: findings.filter(f => f.category === 'intent-violation').length,
      predictedViolations: findings.filter(f => f.category === 'prediction' && f.severity === 'critical').length,
      riskScore: this.calculateRiskScore(findings),
    };
    
    const scenario: IntelligenceScenario = {
      id: `scenario-${Date.now()}`,
      name: config.name,
      description: this.generateScenarioDescription(config),
      filters: config.filters,
      analysis: config.analysis,
      findings,
      summary,
    };
    
    this.scenarios.set(scenario.id, scenario);
    return scenario;
  }
  
  /**
   * Get graph visualization data
   * (From Compliance Flow, but enhanced with intelligence)
   */
  getGraphVisualization(facilities: Facility[]) {
    // Build graph structure with intelligence overlay
    const nodes: any[] = [];
    const edges: any[] = [];
    
    // Get top states by subsidy gap
    const stateGaps = new Map<string, number>();
    facilities.forEach(f => {
      const current = stateGaps.get(f.state) || 0;
      stateGaps.set(f.state, current + f.subsidyGap);
    });
    
    const topStates = Array.from(stateGaps.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([state]) => state);
    
    // Filter facilities to top states
    const filtered = facilities.filter(f => topStates.includes(f.state));
    
    // Get unique operators in these states
    const operators = [...new Set(filtered.map(f => f.operator))];
    
    // Add state nodes
    topStates.forEach(state => {
      const stateFacilities = filtered.filter(f => f.state === state);
      const gap = stateGaps.get(state) || 0;
      
      nodes.push({
        data: {
          id: `state-${state}`,
          label: state,
          type: 'state',
          gap,
          facilityCount: stateFacilities.length,
        },
      });
    });
    
    // Add operator nodes with intelligence
    operators.forEach(operator => {
      const opFacilities = filtered.filter(f => f.operator === operator);
      const compliant = opFacilities.filter(f => f.complianceStatus === 'Compliant').length;
      const complianceRate = (compliant / opFacilities.length) * 100;
      
      nodes.push({
        data: {
          id: `operator-${operator}`,
          label: operator,
          type: 'operator',
          facilityCount: opFacilities.length,
          complianceRate,
          health: complianceRate > 70 ? 'healthy' : complianceRate > 40 ? 'warning' : 'critical',
        },
      });
      
      // Create edges to states
      const operatorStates = [...new Set(opFacilities.map(f => f.state))];
      operatorStates.forEach(state => {
        edges.push({
          data: {
            source: `operator-${operator}`,
            target: `state-${state}`,
          },
        });
      });
    });
    
    // Add intelligence overlay
    const criticalNodes = nodes
      .filter(n => n.data.health === 'critical')
      .map(n => n.data.id);
    
    const warnings = nodes
      .filter(n => n.data.health === 'warning')
      .map(n => n.data.id);
    
    // Detect clusters
    const clusters = this.detectClusters(operators, filtered);
    
    return {
      nodes,
      edges,
      intelligence: {
        criticalNodes,
        warnings,
        clusters,
      },
    };
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private async detectStatisticalAnomalies(facilities: Facility[]): Promise<IntelligenceFinding[]> {
    const findings: IntelligenceFinding[] = [];
    
    // Use existing dcimAnalyzer
    const isolationForest = await dcimAnalyzer.isolationForest(facilities);
    
    isolationForest.outliers.forEach(outlier => {
      findings.push({
        id: `anomaly-${outlier.id}`,
        timestamp: new Date(),
        category: 'anomaly',
        severity: outlier.score > 0.8 ? 'critical' : 'warning',
        confidence: outlier.score,
        title: `Statistical Anomaly: ${outlier.name}`,
        description: `Facility exhibits unusual patterns (anomaly score: ${(outlier.score * 100).toFixed(1)}%)`,
        affectedFacilities: [outlier.id],
        detectionMethod: 'statistical',
        evidence: [
          {
            metric: 'Anomaly Score',
            expected: '< 0.6',
            actual: outlier.score.toFixed(2),
            deviation: ((outlier.score - 0.6) / 0.6) * 100,
          },
        ],
        actionable: true,
        suggestedActions: [
          'Deep dive analysis required',
          'Compare against similar facilities',
          'Review recent audit reports',
        ],
        relatedFindings: [],
      });
    });
    
    return findings;
  }
  
  private async detectIntentViolations(facilities: Facility[]): Promise<IntelligenceFinding[]> {
    const findings: IntelligenceFinding[] = [];
    
    // Use assurance engine
    const alerts = await complianceAssuranceEngine.detectDrift(facilities);
    
    alerts
      .filter(a => a.severity === 'critical' || a.severity === 'warning')
      .forEach(alert => {
        findings.push({
          id: `intent-${alert.id}`,
          timestamp: alert.detectedAt,
          category: 'intent-violation',
          severity: alert.severity === 'critical' ? 'critical' : 'warning',
          confidence: 0.95,
          title: `Intent Violation: ${alert.operator}`,
          description: alert.message,
          affectedFacilities: [alert.facilityId],
          detectionMethod: 'assurance',
          evidence: [],
          actionable: alert.actionable,
          suggestedActions: alert.suggestedActions,
          relatedFindings: [],
        });
      });
    
    return findings;
  }
  
  private async detectPredictiveWarnings(facilities: Facility[]): Promise<IntelligenceFinding[]> {
    const findings: IntelligenceFinding[] = [];
    
    // Run ARIMA forecasting on key metrics
    const subsidyGaps = facilities.map(f => f.subsidyGap);
    const forecast = dcimAnalyzer.arima(subsidyGaps);
    
    // Check if trend is increasing
    if (forecast.trend === 'increasing') {
      findings.push({
        id: `prediction-subsidy-gap`,
        timestamp: new Date(),
        category: 'prediction',
        severity: 'warning',
        confidence: forecast.confidence,
        title: 'Predicted: Subsidy Gap Will Increase',
        description: `ARIMA forecasts aggregate subsidy gap will increase by ${forecast.nextValue.toFixed(1)}% next period`,
        affectedFacilities: facilities.map(f => f.id),
        detectionMethod: 'ml-forecasting',
        evidence: [
          {
            metric: 'Forecasted Change',
            expected: 'Stable or decreasing',
            actual: `+${forecast.nextValue.toFixed(1)}%`,
            deviation: forecast.nextValue,
          },
        ],
        actionable: true,
        suggestedActions: [
          'Increase monitoring frequency',
          'Proactively engage with at-risk operators',
          'Prepare coalition response',
        ],
        relatedFindings: [],
      });
    }
    
    return findings;
  }
  
  private async detectCorrelations(findings: IntelligenceFinding[]): Promise<IntelligenceFinding[]> {
    const correlations: IntelligenceFinding[] = [];
    
    // Group findings by facility
    const facilityFindings = new Map<string, IntelligenceFinding[]>();
    findings.forEach(f => {
      f.affectedFacilities.forEach(facilityId => {
        if (!facilityFindings.has(facilityId)) {
          facilityFindings.set(facilityId, []);
        }
        facilityFindings.get(facilityId)!.push(f);
      });
    });
    
    // Detect facilities with multiple issues
    facilityFindings.forEach((findingsList, facilityId) => {
      if (findingsList.length >= 2) {
        const categories = [...new Set(findingsList.map(f => f.category))];
        
        correlations.push({
          id: `correlation-${facilityId}`,
          timestamp: new Date(),
          category: 'pattern',
          severity: 'critical',
          confidence: 0.9,
          title: `Multiple Issues Detected`,
          description: `Facility exhibits ${categories.length} types of issues: ${categories.join(', ')}`,
          affectedFacilities: [facilityId],
          detectionMethod: 'graph',
          evidence: findingsList.map(f => ({
            metric: f.category,
            expected: 'None',
            actual: f.title,
            deviation: 100,
          })),
          actionable: true,
          suggestedActions: [
            'Prioritize for immediate review',
            'May indicate systemic issues',
            'Consider facility-wide audit',
          ],
          relatedFindings: findingsList.map(f => f.id),
          causality: {
            rootCause: 'Multiple converging factors',
            contributingFactors: findingsList.map(f => f.title),
          },
        });
      }
    });
    
    return correlations;
  }
  
  private enrichWithCausality(findings: IntelligenceFinding[]): void {
    findings.forEach(finding => {
      if (finding.category === 'intent-violation' && !finding.causality) {
        finding.causality = {
          rootCause: 'Operator failed to meet subsidy agreement terms',
          contributingFactors: [
            'Insufficient hiring',
            'Inadequate compliance tracking',
            'Lack of enforcement',
          ],
        };
      }
    });
  }
  
  private applyFilters(facilities: Facility[], filters: IntelligenceScenario['filters']): Facility[] {
    let filtered = [...facilities];
    
    if (filters.states && filters.states.length > 0) {
      filtered = filtered.filter(f => filters.states!.includes(f.state));
    }
    
    if (filters.operators && filters.operators.length > 0) {
      filtered = filtered.filter(f => filters.operators!.includes(f.operator));
    }
    
    if (filters.complianceStatus && filters.complianceStatus.length > 0) {
      filtered = filtered.filter(f => filters.complianceStatus!.includes(f.complianceStatus));
    }
    
    return filtered;
  }
  
  private generateScenarioDescription(config: {
    name: string;
    filters: IntelligenceScenario['filters'];
    analysis: IntelligenceScenario['analysis'];
  }): string {
    const parts: string[] = [];
    
    if (config.filters.states && config.filters.states.length > 0) {
      parts.push(`States: ${config.filters.states.join(', ')}`);
    }
    
    if (config.filters.operators && config.filters.operators.length > 0) {
      parts.push(`Operators: ${config.filters.operators.join(', ')}`);
    }
    
    const analyses: string[] = [];
    if (config.analysis.detectAnomalies) analyses.push('anomaly detection');
    if (config.analysis.validateIntent) analyses.push('intent validation');
    if (config.analysis.forecastTrends) analyses.push('trend forecasting');
    if (config.analysis.visualizeGraph) analyses.push('graph visualization');
    
    parts.push(`Analysis: ${analyses.join(', ')}`);
    
    return parts.join(' | ');
  }
  
  private calculateRiskScore(findings: IntelligenceFinding[]): number {
    if (findings.length === 0) return 0;
    
    const weights = {
      critical: 10,
      warning: 5,
      info: 1,
    };
    
    const totalWeight = findings.reduce((sum, f) => sum + weights[f.severity], 0);
    const maxWeight = findings.length * weights.critical;
    
    return (totalWeight / maxWeight) * 100;
  }
  
  private detectClusters(operators: string[], facilities: Facility[]) {
    // Simple clustering by compliance rate
    const highCompliance = operators.filter(op => {
      const opFacilities = facilities.filter(f => f.operator === op);
      const compliant = opFacilities.filter(f => f.complianceStatus === 'Compliant').length;
      return (compliant / opFacilities.length) > 0.7;
    });
    
    const lowCompliance = operators.filter(op => {
      const opFacilities = facilities.filter(f => f.operator === op);
      const compliant = opFacilities.filter(f => f.complianceStatus === 'Compliant').length;
      return (compliant / opFacilities.length) < 0.4;
    });
    
    return [
      { name: 'High Compliance', nodes: highCompliance.map(op => `operator-${op}`) },
      { name: 'Low Compliance', nodes: lowCompliance.map(op => `operator-${op}`) },
    ];
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const unifiedIntelligenceEngine = new UnifiedIntelligenceEngine();

