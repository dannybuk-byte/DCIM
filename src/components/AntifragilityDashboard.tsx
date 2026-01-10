/**
 * Antifragility Dashboard
 * 
 * Real-time monitoring and control center for all antifragility systems:
 * - Chaos Engineering experiments
 * - Graceful Degradation status
 * - Self-Healing system
 * - Predictive Failure Detection
 * 
 * "Some things benefit from shocks; they thrive and grow when
 * exposed to volatility, randomness, disorder, and stressors."
 * - Nassim Nicholas Taleb, Antifragile
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Shield, AlertTriangle, Activity, Zap, Heart, Brain,
  Play, Pause, RefreshCw, ChevronDown, ChevronRight,
  CheckCircle2, XCircle, AlertCircle, TrendingUp, TrendingDown,
  Minus, Settings, Gauge, Bug, Cpu, Database, Wifi,
  Clock, BarChart3, Target, Flame
} from 'lucide-react';

// Import services
import { chaosEngine, ChaosExperiment } from '../services/chaosEngineering';
import { degradationService, ServiceLevel, FeatureState } from '../services/gracefulDegradation';
import { selfHealingService, HealthIndicator, HealingAction, Incident } from '../services/selfHealing';
import { predictiveFailureEngine, Prediction, Anomaly } from '../services/predictiveFailure';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardState {
  chaosEnabled: boolean;
  degradationLevel: ServiceLevel;
  healthScore: number;
  riskScore: number;
  activeExperiments: string[];
  degradedFeatures: string[];
  recentIncidents: Incident[];
  predictions: Prediction[];
  anomalies: Anomaly[];
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StatusBadge: React.FC<{ status: 'healthy' | 'degraded' | 'critical' | 'unknown' | 'info' | 'warning' }> = ({ status }) => {
  const colors = {
    healthy: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    degraded: 'bg-amber-100 text-amber-700 border-amber-200',
    critical: 'bg-red-100 text-red-700 border-red-200',
    unknown: 'bg-slate-100 text-slate-700 border-slate-200',
    info: 'bg-blue-100 text-blue-700 border-blue-200',
    warning: 'bg-orange-100 text-orange-700 border-orange-200',
  };

  const icons = {
    healthy: <CheckCircle2 size={12} />,
    degraded: <AlertCircle size={12} />,
    critical: <XCircle size={12} />,
    unknown: <Minus size={12} />,
    info: <AlertCircle size={12} />,
    warning: <AlertTriangle size={12} />,
  };

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colors[status]}`}>
      {icons[status]}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const MetricGauge: React.FC<{ value: number; label: string; max?: number; color?: string }> = ({ 
  value, 
  label, 
  max = 100,
  color = 'indigo'
}) => {
  const percentage = Math.min(100, (value / max) * 100);
  const colorMap: Record<string, string> = {
    indigo: 'bg-indigo-500',
    emerald: 'bg-emerald-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs">
        <span className="text-slate-600">{label}</span>
        <span className="font-medium">{value}{max === 100 ? '%' : ''}</span>
      </div>
      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorMap[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

const ExpandableSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}> = ({ title, icon, badge, defaultOpen = false, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100">
            {icon}
          </div>
          <span className="font-semibold text-slate-800">{title}</span>
          {badge}
        </div>
        {isOpen ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </button>
      {isOpen && (
        <div className="border-t border-slate-200 p-4 bg-slate-50/50">
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AntifragilityDashboard: React.FC = () => {
  const [state, setState] = useState<DashboardState>({
    chaosEnabled: false,
    degradationLevel: 'full',
    healthScore: 100,
    riskScore: 0,
    activeExperiments: [],
    degradedFeatures: [],
    recentIncidents: [],
    predictions: [],
    anomalies: [],
  });

  const [healthIndicators, setHealthIndicators] = useState<HealthIndicator[]>([]);
  const [features, setFeatures] = useState<FeatureState[]>([]);
  const [experiments, setExperiments] = useState<ChaosExperiment[]>([]);
  const [healingActions, setHealingActions] = useState<HealingAction[]>([]);

  // Initialize and subscribe to services
  useEffect(() => {
    // Start monitoring services
    selfHealingService.start(5000);
    degradationService.startMonitoring(5000);

    // Initial state
    setHealthIndicators(selfHealingService.getIndicators());
    setFeatures(degradationService.getAllFeatures());
    setExperiments(chaosEngine.listExperiments());
    setHealingActions(selfHealingService.getHealingActions());

    // Update state
    const updateState = () => {
      setState(prev => ({
        ...prev,
        chaosEnabled: chaosEngine.isEnabled(),
        degradationLevel: degradationService.getServiceLevel(),
        healthScore: selfHealingService.getHealthScore(),
        riskScore: predictiveFailureEngine.getRiskScore(),
        degradedFeatures: degradationService.getAllFeatures()
          .filter(f => f.degraded)
          .map(f => f.name),
        recentIncidents: selfHealingService.getIncidents(5),
        predictions: predictiveFailureEngine.getAllPredictions(),
        anomalies: predictiveFailureEngine.getAnomalies(10),
      }));
      setHealthIndicators(selfHealingService.getIndicators());
      setFeatures(degradationService.getAllFeatures());
    };

    updateState();
    const interval = setInterval(updateState, 5000);

    // Subscribe to events
    const unsubChaos = chaosEngine.subscribe(event => {
      console.log('Chaos event:', event);
      updateState();
    });

    const unsubDegradation = degradationService.subscribe(event => {
      console.log('Degradation event:', event);
      updateState();
    });

    const unsubHealing = selfHealingService.subscribe(event => {
      console.log('Healing event:', event);
      updateState();
    });

    const unsubPrediction = predictiveFailureEngine.subscribe(event => {
      console.log('Prediction event:', event);
      updateState();
    });

    return () => {
      clearInterval(interval);
      selfHealingService.stop();
      degradationService.stopMonitoring();
      unsubChaos();
      unsubDegradation();
      unsubHealing();
      unsubPrediction();
    };
  }, []);

  // Handlers
  const toggleChaos = useCallback(() => {
    if (chaosEngine.isEnabled()) {
      chaosEngine.disable();
    } else {
      chaosEngine.enable({ safeMode: true });
    }
    setState(prev => ({ ...prev, chaosEnabled: chaosEngine.isEnabled() }));
  }, []);

  const runExperiment = useCallback(async (experimentId: string) => {
    try {
      await chaosEngine.runExperiment(experimentId);
    } catch (error) {
      console.error('Experiment failed:', error);
    }
  }, []);

  const executeHealingAction = useCallback(async (actionId: string) => {
    try {
      await selfHealingService.executeHealingAction(actionId);
    } catch (error) {
      console.error('Healing action failed:', error);
    }
  }, []);

  // Derived data
  const healthByCategory = useMemo(() => {
    const categories: Record<string, HealthIndicator[]> = {};
    healthIndicators.forEach(ind => {
      if (!categories[ind.category]) {
        categories[ind.category] = [];
      }
      categories[ind.category].push(ind);
    });
    return categories;
  }, [healthIndicators]);

  const serviceLevelColor = {
    full: 'emerald',
    reduced: 'amber',
    minimal: 'orange',
    offline: 'red',
  }[state.degradationLevel];

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-slate-50 to-slate-100 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Antifragility Dashboard</h1>
            <p className="text-sm text-slate-500">System resilience monitoring & control</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => selfHealingService.runHealthCheck()}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            onClick={toggleChaos}
            className={`px-4 py-2 rounded-lg transition-colors flex items-center gap-2 ${
              state.chaosEnabled 
                ? 'bg-red-100 text-red-700 hover:bg-red-200' 
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
            }`}
          >
            {state.chaosEnabled ? <Pause size={16} /> : <Play size={16} />}
            {state.chaosEnabled ? 'Disable Chaos' : 'Enable Chaos'}
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-4 gap-4">
        {/* Health Score */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Health Score</span>
            <Heart className={`w-5 h-5 ${state.healthScore > 70 ? 'text-emerald-500' : state.healthScore > 40 ? 'text-amber-500' : 'text-red-500'}`} />
          </div>
          <div className="text-3xl font-bold text-slate-800">{state.healthScore}%</div>
          <MetricGauge 
            value={state.healthScore} 
            label="" 
            color={state.healthScore > 70 ? 'emerald' : state.healthScore > 40 ? 'amber' : 'red'} 
          />
        </div>

        {/* Risk Score */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Risk Score</span>
            <AlertTriangle className={`w-5 h-5 ${state.riskScore < 30 ? 'text-emerald-500' : state.riskScore < 60 ? 'text-amber-500' : 'text-red-500'}`} />
          </div>
          <div className="text-3xl font-bold text-slate-800">{state.riskScore}%</div>
          <MetricGauge 
            value={state.riskScore} 
            label="" 
            color={state.riskScore < 30 ? 'emerald' : state.riskScore < 60 ? 'amber' : 'red'} 
          />
        </div>

        {/* Service Level */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Service Level</span>
            <Gauge className={`w-5 h-5 text-${serviceLevelColor}-500`} />
          </div>
          <div className="text-3xl font-bold text-slate-800 capitalize">{state.degradationLevel}</div>
          <div className="mt-2 flex gap-1">
            {['full', 'reduced', 'minimal', 'offline'].map(level => (
              <div
                key={level}
                className={`h-2 flex-1 rounded-full ${
                  level === state.degradationLevel 
                    ? `bg-${serviceLevelColor}-500` 
                    : 'bg-slate-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Active Issues */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-slate-500">Active Issues</span>
            <Bug className="w-5 h-5 text-slate-400" />
          </div>
          <div className="text-3xl font-bold text-slate-800">
            {state.degradedFeatures.length + state.anomalies.length}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {state.degradedFeatures.length} degraded • {state.anomalies.length} anomalies
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-4">
          {/* Health Indicators */}
          <ExpandableSection
            title="Health Indicators"
            icon={<Activity className="w-5 h-5 text-indigo-600" />}
            badge={<StatusBadge status={state.healthScore > 70 ? 'healthy' : state.healthScore > 40 ? 'degraded' : 'critical'} />}
            defaultOpen={true}
          >
            <div className="space-y-4">
              {Object.entries(healthByCategory).map(([category, indicators]) => (
                <div key={category}>
                  <div className="text-xs font-semibold text-slate-500 uppercase mb-2 flex items-center gap-2">
                    {category === 'performance' && <Cpu size={12} />}
                    {category === 'reliability' && <Shield size={12} />}
                    {category === 'data' && <Database size={12} />}
                    {category === 'network' && <Wifi size={12} />}
                    {category === 'ui' && <BarChart3 size={12} />}
                    {category}
                  </div>
                  <div className="space-y-2">
                    {indicators.map(ind => (
                      <div key={ind.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-slate-700">{ind.name}</span>
                          {ind.trend === 'improving' && <TrendingUp size={12} className="text-emerald-500" />}
                          {ind.trend === 'declining' && <TrendingDown size={12} className="text-red-500" />}
                          {ind.trend === 'stable' && <Minus size={12} className="text-slate-400" />}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{ind.value.toFixed(0)}</span>
                          <StatusBadge status={ind.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* Chaos Engineering */}
          <ExpandableSection
            title="Chaos Engineering"
            icon={<Flame className="w-5 h-5 text-orange-600" />}
            badge={
              <span className={`px-2 py-0.5 rounded-full text-xs ${state.chaosEnabled ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>
                {state.chaosEnabled ? 'ACTIVE' : 'INACTIVE'}
              </span>
            }
          >
            <div className="space-y-3">
              <p className="text-xs text-slate-500 mb-3">
                Run controlled experiments to test system resilience. Safe mode prevents high-severity experiments.
              </p>
              {experiments.map(exp => (
                <div key={exp.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{exp.name}</div>
                    <div className="text-xs text-slate-500">{exp.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      exp.severity === 'high' ? 'bg-red-100 text-red-700' :
                      exp.severity === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-emerald-100 text-emerald-700'
                    }`}>
                      {exp.severity}
                    </span>
                    <button
                      onClick={() => runExperiment(exp.id)}
                      disabled={!state.chaosEnabled}
                      className="px-3 py-1 text-xs rounded bg-indigo-100 text-indigo-700 hover:bg-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Run
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          {/* Predictive Warnings */}
          <ExpandableSection
            title="Predictive Warnings"
            icon={<Brain className="w-5 h-5 text-purple-600" />}
            badge={
              state.predictions.filter(p => p.severity !== 'info').length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                  {state.predictions.filter(p => p.severity !== 'info').length} warnings
                </span>
              ) : null
            }
            defaultOpen={true}
          >
            <div className="space-y-3">
              {state.predictions.filter(p => p.severity !== 'info').length === 0 ? (
                <div className="text-center py-6 text-slate-400">
                  <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">No predicted issues</p>
                </div>
              ) : (
                state.predictions
                  .filter(p => p.severity !== 'info')
                  .map(pred => (
                    <div key={pred.id} className={`p-3 rounded-lg border ${
                      pred.severity === 'critical' ? 'bg-red-50 border-red-200' :
                      'bg-amber-50 border-amber-200'
                    }`}>
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {pred.severity === 'critical' ? (
                            <XCircle className="w-4 h-4 text-red-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="text-sm font-medium">{pred.metric}</span>
                        </div>
                        <span className="text-xs text-slate-500">
                          {pred.confidence.toFixed(0)}% confidence
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 mt-2">{pred.recommendation}</p>
                      {pred.timeToFailure && (
                        <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                          <Clock size={12} />
                          {Math.round(pred.timeToFailure / 60000)} min to critical
                        </div>
                      )}
                    </div>
                  ))
              )}
            </div>
          </ExpandableSection>

          {/* Self-Healing Actions */}
          <ExpandableSection
            title="Self-Healing Actions"
            icon={<Zap className="w-5 h-5 text-emerald-600" />}
          >
            <div className="space-y-2">
              {healingActions.map(action => (
                <div key={action.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-100">
                  <div>
                    <div className="text-sm font-medium text-slate-700">{action.name}</div>
                    <div className="text-xs text-slate-500">
                      {action.executionCount > 0 
                        ? `${action.successRate.toFixed(0)}% success (${action.executionCount} runs)`
                        : 'Not yet executed'
                      }
                    </div>
                  </div>
                  <button
                    onClick={() => executeHealingAction(action.id)}
                    className="px-3 py-1 text-xs rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  >
                    Execute
                  </button>
                </div>
              ))}
            </div>
          </ExpandableSection>

          {/* Feature Degradation Status */}
          <ExpandableSection
            title="Feature Status"
            icon={<Settings className="w-5 h-5 text-slate-600" />}
            badge={
              state.degradedFeatures.length > 0 ? (
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-100 text-amber-700">
                  {state.degradedFeatures.length} degraded
                </span>
              ) : null
            }
          >
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {features.map(feature => (
                <div key={feature.id} className="flex items-center justify-between p-2 bg-white rounded-lg border border-slate-100">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      feature.enabled && !feature.degraded ? 'bg-emerald-500' :
                      feature.degraded ? 'bg-amber-500' :
                      'bg-red-500'
                    }`} />
                    <span className="text-sm text-slate-700">{feature.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">P{feature.priority}</span>
                    {feature.degraded && (
                      <span className="px-2 py-0.5 rounded text-xs bg-amber-100 text-amber-700">
                        Degraded
                      </span>
                    )}
                    {!feature.enabled && (
                      <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-700">
                        Disabled
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ExpandableSection>
        </div>
      </div>

      {/* Recent Incidents */}
      {state.recentIncidents.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Recent Incidents
          </h3>
          <div className="space-y-2">
            {state.recentIncidents.map(incident => (
              <div key={incident.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <StatusBadge status={incident.severity === 'critical' ? 'critical' : incident.severity === 'high' ? 'warning' : 'info'} />
                  <span className="text-sm text-slate-700">{incident.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  {incident.autoHealed && (
                    <span className="text-xs text-emerald-600 flex items-center gap-1">
                      <CheckCircle2 size={12} />
                      Auto-healed
                    </span>
                  )}
                  <span className="text-xs text-slate-400">
                    {new Date(incident.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 py-4">
        <p>"What doesn't kill the system makes it stronger" - Antifragile Computing</p>
        <p className="mt-1">Inspired by Nassim Nicholas Taleb's Antifragile framework</p>
      </div>
    </div>
  );
};

export default AntifragilityDashboard;

