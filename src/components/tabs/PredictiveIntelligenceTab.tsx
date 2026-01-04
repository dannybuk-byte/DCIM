/**
 * Predictive Intelligence Hub
 * 
 * Comprehensive predictive analytics dashboard featuring:
 * - Time Series Forecasting with confidence intervals
 * - Risk Scoring Model with feature importance
 * - Monte Carlo Scenario Simulation
 */

import { memo, useEffect, useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import type { EChartsOption } from 'echarts';
import {
  TrendingUp,
  AlertTriangle,
  Target,
  Shuffle,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Zap,
  Brain,
  BarChart3,
  Activity,
  Shield,
  Clock,
  DollarSign,
  Building2,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Info,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import type { Facility } from '../../types';
import { usePredictiveAnalytics } from '../../hooks/usePredictiveAnalytics';
import type {
  ForecastResult,
  FacilityRiskScore,
  OperatorRiskProfile,
  ScenarioResult,
  PresetScenario,
} from '../../analyzers/predictive/types';
import { formatCurrency } from '../../utils/formatting';
import { 
  Spinner, 
  ProgressBar, 
  ProgressRing,
  SkeletonCard,
  SkeletonChart,
  DataLoadingOverlay,
  PulseLoader,
} from '../shared/ProgressIndicators';

interface PredictiveIntelligenceTabProps {
  facilities: Facility[];
}

const COLORS = {
  bg: '#0a0e17',
  bgCard: '#0d1219',
  bgHover: '#151c28',
  border: '#1e293b',
  text: '#e8eef6',
  textMuted: '#5a6d8a',
  cyan: '#00d2d3',
  green: '#2ed573',
  red: '#ff4757',
  yellow: '#ffa502',
  purple: '#a855f7',
  blue: '#3b82f6',
};

// Section header component
const SectionHeader = memo(function SectionHeader({
  icon: Icon,
  title,
  subtitle,
  action,
}: {
  icon: typeof TrendingUp;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-cyan-500/10">
          <Icon size={16} className="text-cyan-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[#e8eef6]">{title}</h3>
          {subtitle && <p className="text-[10px] text-[#5a6d8a]">{subtitle}</p>}
        </div>
      </div>
      {action}
    </div>
  );
});

// Forecast Chart Component
const ForecastChart = memo(function ForecastChart({
  forecast,
}: {
  forecast: ForecastResult;
}) {
  const option: EChartsOption = useMemo(() => {
    const historicalDates = forecast.historical.map(p => p.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    const forecastDates = forecast.forecast.map(p => p.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }));
    const allDates = [...historicalDates, ...forecastDates];
    
    const historicalValues = forecast.historical.map(p => p.value);
    const forecastValues = [...new Array(forecast.historical.length).fill(null), ...forecast.forecast.map(p => p.value)];
    const lowerBound = [...new Array(forecast.historical.length).fill(null), ...forecast.confidenceLower.map(p => p.value)];
    const upperBound = [...new Array(forecast.historical.length).fill(null), ...forecast.confidenceUpper.map(p => p.value)];
    
    const formatValue = (v: number) => {
      if (forecast.metric.includes('Rate')) return `${v.toFixed(1)}%`;
      if (forecast.metric === 'subsidyGap') return `$${(v / 1e6).toFixed(1)}M`;
      return v.toLocaleString();
    };
    
    return {
      backgroundColor: 'transparent',
      grid: { top: 30, right: 10, bottom: 30, left: 50 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: COLORS.bgCard,
        borderColor: COLORS.border,
        textStyle: { color: COLORS.text, fontSize: 11 },
        formatter: (params: any) => {
          const date = params[0]?.axisValue;
          let html = `<div style="font-weight:600;margin-bottom:4px">${date}</div>`;
          params.forEach((p: any) => {
            if (p.value !== null) {
              html += `<div style="display:flex;justify-content:space-between;gap:12px">
                <span>${p.seriesName}</span>
                <span style="font-weight:600">${formatValue(p.value)}</span>
              </div>`;
            }
          });
          return html;
        },
      },
      xAxis: {
        type: 'category',
        data: allDates,
        axisLine: { lineStyle: { color: COLORS.border } },
        axisLabel: { color: COLORS.textMuted, fontSize: 9, rotate: 45 },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisLabel: { 
          color: COLORS.textMuted, 
          fontSize: 9,
          formatter: (v: number) => formatValue(v),
        },
        splitLine: { lineStyle: { color: COLORS.border, opacity: 0.3 } },
      },
      series: [
        {
          name: 'Historical',
          type: 'line',
          data: historicalValues,
          smooth: true,
          lineStyle: { color: COLORS.cyan, width: 2 },
          itemStyle: { color: COLORS.cyan },
          areaStyle: { color: `${COLORS.cyan}20` },
        },
        {
          name: 'Forecast',
          type: 'line',
          data: forecastValues,
          smooth: true,
          lineStyle: { color: COLORS.purple, width: 2, type: 'dashed' },
          itemStyle: { color: COLORS.purple },
        },
        {
          name: '95% CI Upper',
          type: 'line',
          data: upperBound,
          smooth: true,
          lineStyle: { opacity: 0 },
          areaStyle: { color: `${COLORS.purple}15` },
          stack: 'confidence',
        },
        {
          name: '95% CI Lower',
          type: 'line',
          data: lowerBound,
          smooth: true,
          lineStyle: { opacity: 0 },
          areaStyle: { color: COLORS.bgCard },
          stack: 'confidence',
        },
      ],
    };
  }, [forecast]);

  const TrendIcon = forecast.trend === 'increasing' ? ArrowUpRight : 
                    forecast.trend === 'decreasing' ? ArrowDownRight : Minus;
  const trendColor = forecast.metric === 'subsidyGap' 
    ? (forecast.trend === 'increasing' ? COLORS.red : COLORS.green)
    : (forecast.trend === 'increasing' ? COLORS.green : COLORS.red);

  return (
    <div className="bg-[#0d1219] rounded-lg border border-[#1e293b] p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#e8eef6] capitalize">
            {forecast.metric.replace(/([A-Z])/g, ' $1').trim()}
          </span>
          <TrendIcon size={14} style={{ color: trendColor }} />
        </div>
        <div className="flex items-center gap-2 text-[10px]">
          <span className="text-[#5a6d8a]">MAPE: {forecast.mape.toFixed(1)}%</span>
          <span className="px-1.5 py-0.5 rounded bg-[#1e293b] text-[#e8eef6]">
            {forecast.forecastHorizon}mo
          </span>
        </div>
      </div>
      <ReactECharts option={option} style={{ height: 160 }} />
    </div>
  );
});

// Risk Score Card
const RiskScoreCard = memo(function RiskScoreCard({
  risk,
  rank,
}: {
  risk: FacilityRiskScore;
  rank: number;
}) {
  const categoryColors: Record<string, string> = {
    Critical: COLORS.red,
    High: '#f97316',
    Medium: COLORS.yellow,
    Low: COLORS.green,
    Minimal: COLORS.cyan,
  };
  
  return (
    <div className="bg-[#151c28] rounded-lg p-2 border border-[#1e293b] hover:border-[#2d3748] transition-colors">
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-[#5a6d8a]">#{rank}</span>
          <div>
            <div className="text-xs font-medium text-[#e8eef6] truncate max-w-[140px]" title={risk.facilityName}>
              {risk.facilityName}
            </div>
            <div className="text-[10px] text-[#5a6d8a]">{risk.operator}</div>
          </div>
        </div>
        <div 
          className="px-1.5 py-0.5 rounded text-[10px] font-bold"
          style={{ 
            backgroundColor: `${categoryColors[risk.riskCategory]}20`,
            color: categoryColors[risk.riskCategory],
          }}
        >
          {risk.overallScore}
        </div>
      </div>
      
      {/* Mini factor bars */}
      <div className="space-y-0.5 mt-2">
        {risk.factors.slice(0, 3).map((factor, i) => (
          <div key={i} className="flex items-center gap-1">
            <span className="text-[9px] text-[#5a6d8a] w-16 truncate">{factor.name}</span>
            <div className="flex-1 h-1 bg-[#1e293b] rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full transition-all"
                style={{ 
                  width: `${factor.value}%`,
                  backgroundColor: factor.value > 70 ? COLORS.red : 
                                   factor.value > 40 ? COLORS.yellow : COLORS.green,
                }}
              />
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-2 text-[9px] text-[#5a6d8a]">
        P(NC): {(risk.probabilityOfNonCompliance * 100).toFixed(0)}%
      </div>
    </div>
  );
});

// Operator Profile Card
const OperatorProfileCard = memo(function OperatorProfileCard({
  profile,
}: {
  profile: OperatorRiskProfile;
}) {
  const total = profile.facilityCount;
  const distribution = [
    { label: 'Critical', count: profile.riskDistribution.critical, color: COLORS.red },
    { label: 'High', count: profile.riskDistribution.high, color: '#f97316' },
    { label: 'Medium', count: profile.riskDistribution.medium, color: COLORS.yellow },
    { label: 'Low', count: profile.riskDistribution.low, color: COLORS.green },
    { label: 'Minimal', count: profile.riskDistribution.minimal, color: COLORS.cyan },
  ];
  
  const TrendIcon = profile.trendDirection === 'worsening' ? ArrowUpRight :
                    profile.trendDirection === 'improving' ? ArrowDownRight : Minus;
  
  return (
    <div className="bg-[#0d1219] rounded-lg border border-[#1e293b] p-2">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-xs font-medium text-[#e8eef6]">{profile.operator}</div>
          <div className="text-[10px] text-[#5a6d8a]">{profile.facilityCount} facilities</div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold" style={{ color: profile.avgRiskScore > 60 ? COLORS.red : profile.avgRiskScore > 40 ? COLORS.yellow : COLORS.green }}>
            {profile.avgRiskScore}
          </div>
          <div className="flex items-center gap-0.5 text-[10px] text-[#5a6d8a]">
            <TrendIcon size={10} />
            {profile.trendDirection}
          </div>
        </div>
      </div>
      
      {/* Distribution bar */}
      <div className="flex h-2 rounded-full overflow-hidden mb-2">
        {distribution.map((d, i) => (
          <div
            key={i}
            style={{ 
              width: `${(d.count / total) * 100}%`,
              backgroundColor: d.color,
            }}
            title={`${d.label}: ${d.count}`}
          />
        ))}
      </div>
      
      <div className="text-[10px] text-[#5a6d8a]">
        12mo projection: {formatCurrency(profile.projectedGap12mo)}
      </div>
    </div>
  );
});

// Scenario Comparison Chart
const ScenarioComparisonChart = memo(function ScenarioComparisonChart({
  scenarios,
}: {
  scenarios: ScenarioResult[];
}) {
  const option: EChartsOption = useMemo(() => {
    const scenarioNames = scenarios.map(s => s.scenarioName);
    
    return {
      backgroundColor: 'transparent',
      grid: { top: 40, right: 20, bottom: 60, left: 60 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: COLORS.bgCard,
        borderColor: COLORS.border,
        textStyle: { color: COLORS.text, fontSize: 11 },
      },
      legend: {
        bottom: 0,
        textStyle: { color: COLORS.textMuted, fontSize: 10 },
        itemWidth: 12,
        itemHeight: 8,
      },
      xAxis: {
        type: 'category',
        data: scenarioNames,
        axisLine: { lineStyle: { color: COLORS.border } },
        axisLabel: { color: COLORS.textMuted, fontSize: 9, rotate: 30 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Gap ($M)',
          nameTextStyle: { color: COLORS.textMuted, fontSize: 9 },
          axisLine: { show: false },
          axisLabel: { 
            color: COLORS.textMuted, 
            fontSize: 9,
            formatter: (v: number) => `$${(v / 1e6).toFixed(0)}M`,
          },
          splitLine: { lineStyle: { color: COLORS.border, opacity: 0.3 } },
        },
        {
          type: 'value',
          name: 'Rate (%)',
          nameTextStyle: { color: COLORS.textMuted, fontSize: 9 },
          axisLine: { show: false },
          axisLabel: { color: COLORS.textMuted, fontSize: 9 },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: 'Subsidy Gap',
          type: 'bar',
          data: scenarios.map(s => s.outcomes.totalSubsidyGap.mean),
          itemStyle: { color: COLORS.red, borderRadius: [4, 4, 0, 0] },
          barWidth: '30%',
        },
        {
          name: 'Compliance Rate',
          type: 'line',
          yAxisIndex: 1,
          data: scenarios.map(s => s.outcomes.complianceRate.mean),
          lineStyle: { color: COLORS.green, width: 2 },
          itemStyle: { color: COLORS.green },
          symbol: 'circle',
          symbolSize: 8,
        },
      ],
    };
  }, [scenarios]);

  return <ReactECharts option={option} style={{ height: 220 }} />;
});

// Scenario Detail Card
const ScenarioDetailCard = memo(function ScenarioDetailCard({
  scenario,
  isSelected,
  onSelect,
}: {
  scenario: ScenarioResult;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left p-2 rounded-lg border transition-colors ${
        isSelected 
          ? 'bg-cyan-500/10 border-cyan-500/50' 
          : 'bg-[#0d1219] border-[#1e293b] hover:border-[#2d3748]'
      }`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-[#e8eef6]">{scenario.scenarioName}</span>
        <span className={`text-[10px] px-1.5 py-0.5 rounded ${
          scenario.probabilityOfImprovement > 0.5 
            ? 'bg-green-500/20 text-green-400' 
            : 'bg-red-500/20 text-red-400'
        }`}>
          {(scenario.probabilityOfImprovement * 100).toFixed(0)}% improve
        </span>
      </div>
      <div className="text-[10px] text-[#5a6d8a] mb-2">{scenario.config.description}</div>
      <div className="grid grid-cols-2 gap-1 text-[10px]">
        <div>
          <span className="text-[#5a6d8a]">Gap: </span>
          <span className="text-[#e8eef6] font-medium">
            {formatCurrency(scenario.outcomes.totalSubsidyGap.mean)}
          </span>
        </div>
        <div>
          <span className="text-[#5a6d8a]">Compliance: </span>
          <span className="text-[#e8eef6] font-medium">
            {scenario.outcomes.complianceRate.mean.toFixed(1)}%
          </span>
        </div>
      </div>
    </button>
  );
});

// Distribution Chart for selected scenario
const DistributionChart = memo(function DistributionChart({
  scenario,
}: {
  scenario: ScenarioResult;
}) {
  const option: EChartsOption = useMemo(() => {
    const bins = scenario.outcomes.totalSubsidyGap.distribution;
    const min = scenario.outcomes.totalSubsidyGap.min;
    const max = scenario.outcomes.totalSubsidyGap.max;
    const binWidth = (max - min) / bins.length;
    
    const labels = bins.map((_, i) => 
      `$${((min + i * binWidth) / 1e6).toFixed(1)}M`
    );
    
    return {
      backgroundColor: 'transparent',
      grid: { top: 20, right: 10, bottom: 30, left: 50 },
      tooltip: {
        trigger: 'axis',
        backgroundColor: COLORS.bgCard,
        borderColor: COLORS.border,
        textStyle: { color: COLORS.text, fontSize: 11 },
      },
      xAxis: {
        type: 'category',
        data: labels,
        axisLine: { lineStyle: { color: COLORS.border } },
        axisLabel: { color: COLORS.textMuted, fontSize: 8, rotate: 45 },
      },
      yAxis: {
        type: 'value',
        name: 'Frequency',
        nameTextStyle: { color: COLORS.textMuted, fontSize: 9 },
        axisLine: { show: false },
        axisLabel: { color: COLORS.textMuted, fontSize: 9 },
        splitLine: { lineStyle: { color: COLORS.border, opacity: 0.3 } },
      },
      series: [{
        type: 'bar',
        data: bins,
        itemStyle: { 
          color: COLORS.purple,
          borderRadius: [2, 2, 0, 0],
        },
        barWidth: '80%',
      }],
    };
  }, [scenario]);

  return (
    <div className="bg-[#0d1219] rounded-lg border border-[#1e293b] p-2">
      <div className="text-[10px] text-[#5a6d8a] mb-1">Subsidy Gap Distribution ({scenario.config.iterations.toLocaleString()} simulations)</div>
      <ReactECharts option={option} style={{ height: 140 }} />
      <div className="grid grid-cols-4 gap-1 mt-2 text-[10px]">
        <div className="text-center">
          <div className="text-[#5a6d8a]">5th %ile</div>
          <div className="text-[#e8eef6] font-medium">{formatCurrency(scenario.outcomes.totalSubsidyGap.percentile5)}</div>
        </div>
        <div className="text-center">
          <div className="text-[#5a6d8a]">Mean</div>
          <div className="text-cyan-400 font-medium">{formatCurrency(scenario.outcomes.totalSubsidyGap.mean)}</div>
        </div>
        <div className="text-center">
          <div className="text-[#5a6d8a]">95th %ile</div>
          <div className="text-[#e8eef6] font-medium">{formatCurrency(scenario.outcomes.totalSubsidyGap.percentile95)}</div>
        </div>
        <div className="text-center">
          <div className="text-[#5a6d8a]">VaR (95%)</div>
          <div className="text-red-400 font-medium">{formatCurrency(Math.abs(scenario.expectedValueAtRisk))}</div>
        </div>
      </div>
    </div>
  );
});

// Feature Importance Chart
const FeatureImportanceChart = memo(function FeatureImportanceChart({
  features,
}: {
  features: { feature: string; importance: number }[];
}) {
  const option: EChartsOption = useMemo(() => ({
    backgroundColor: 'transparent',
    grid: { top: 10, right: 10, bottom: 10, left: 100 },
    xAxis: {
      type: 'value',
      max: 0.4,
      axisLine: { show: false },
      axisLabel: { show: false },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'category',
      data: features.map(f => f.feature),
      axisLine: { show: false },
      axisLabel: { color: COLORS.textMuted, fontSize: 9 },
      axisTick: { show: false },
    },
    series: [{
      type: 'bar',
      data: features.map(f => f.importance),
      itemStyle: { 
        color: COLORS.cyan,
        borderRadius: [0, 4, 4, 0],
      },
      barWidth: 12,
      label: {
        show: true,
        position: 'right',
        formatter: (p: any) => `${(p.value * 100).toFixed(0)}%`,
        color: COLORS.textMuted,
        fontSize: 9,
      },
    }],
  }), [features]);

  return <ReactECharts option={option} style={{ height: 180 }} />;
});

// Key Insights Panel
const KeyInsightsPanel = memo(function KeyInsightsPanel({
  insights,
}: {
  insights: {
    category: 'forecast' | 'risk' | 'scenario';
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    confidence: number;
    actionable: boolean;
  }[];
}) {
  const severityIcons = {
    critical: XCircle,
    warning: AlertCircle,
    info: Info,
  };
  const severityColors = {
    critical: COLORS.red,
    warning: COLORS.yellow,
    info: COLORS.cyan,
  };

  return (
    <div className="space-y-2">
      {insights.map((insight, i) => {
        const Icon = severityIcons[insight.severity];
        return (
          <div
            key={i}
            className="flex items-start gap-2 p-2 rounded-lg border"
            style={{
              backgroundColor: `${severityColors[insight.severity]}10`,
              borderColor: `${severityColors[insight.severity]}30`,
            }}
          >
            <Icon size={14} style={{ color: severityColors[insight.severity], flexShrink: 0, marginTop: 2 }} />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-[#e8eef6]">{insight.title}</div>
              <div className="text-[10px] text-[#5a6d8a]">{insight.description}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[9px] text-[#5a6d8a]">
                  Confidence: {(insight.confidence * 100).toFixed(0)}%
                </span>
                {insight.actionable && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-cyan-500/20 text-cyan-400">
                    Actionable
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
});

// Main Component
export const PredictiveIntelligenceTab = memo(function PredictiveIntelligenceTab({
  facilities,
}: PredictiveIntelligenceTabProps) {
  const {
    forecasts,
    facilityRisks,
    operatorProfiles,
    modelMetrics,
    scenarios,
    isLoading,
    lastUpdated,
    refreshAll,
    getTopRiskFacilities,
    getOperatorByRisk,
    getInsights,
  } = usePredictiveAnalytics(facilities);

  const [selectedScenario, setSelectedScenario] = useState<string>('Baseline');
  const [expandedSections, setExpandedSections] = useState({
    forecasts: true,
    risks: true,
    scenarios: true,
  });

  // Initialize on mount
  useEffect(() => {
    if (facilities.length > 0 && forecasts.length === 0) {
      refreshAll();
    }
  }, [facilities.length]);

  const topRiskFacilities = useMemo(() => getTopRiskFacilities(12), [getTopRiskFacilities]);
  const operatorsByRisk = useMemo(() => getOperatorByRisk().slice(0, 8), [getOperatorByRisk]);
  const insights = useMemo(() => getInsights(), [getInsights]);
  const currentScenario = scenarios.find(s => s.scenarioName === selectedScenario) || scenarios[0];

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="h-full overflow-auto bg-[#0a0e17] p-3">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20">
            <Brain size={20} className="text-purple-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#e8eef6]">Predictive Intelligence Hub</h2>
            <p className="text-xs text-[#5a6d8a]">
              Forecasting • Risk Scoring • Scenario Simulation
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdated && (
            <span className="text-[10px] text-[#5a6d8a]">
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={refreshAll}
            disabled={isLoading}
            className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
              isLoading 
                ? 'bg-[#1e293b] text-[#5a6d8a] cursor-wait' 
                : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
            }`}
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
            {isLoading ? 'Analyzing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Key Insights Banner */}
      {insights.keyInsights.length > 0 && (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-r from-purple-500/10 to-cyan-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-purple-400" />
            <span className="text-xs font-medium text-[#e8eef6]">Key Insights</span>
          </div>
          <KeyInsightsPanel insights={insights.keyInsights} />
        </div>
      )}

      <div className="grid grid-cols-12 gap-3">
        {/* LEFT COLUMN: Forecasting */}
        <div className="col-span-4">
          <div className="bg-[#0d1219] rounded-lg border border-[#1e293b] p-3">
            <button
              onClick={() => toggleSection('forecasts')}
              className="w-full flex items-center justify-between mb-2"
            >
              <SectionHeader 
                icon={TrendingUp} 
                title="Time Series Forecasts" 
                subtitle="ARIMA-based projections with 95% CI"
              />
              {expandedSections.forecasts ? <ChevronDown size={14} className="text-[#5a6d8a]" /> : <ChevronRight size={14} className="text-[#5a6d8a]" />}
            </button>
            
            {expandedSections.forecasts && (
              <div className="space-y-3">
                {isLoading && forecasts.length === 0 && (
                  <div className="space-y-3">
                    <SkeletonChart height={160} />
                    <SkeletonChart height={160} />
                  </div>
                )}
                {forecasts.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="p-3 rounded-full bg-[#1e293b] mb-3">
                      <TrendingUp size={20} className="text-[#5a6d8a]" />
                    </div>
                    <p className="text-xs text-[#5a6d8a] mb-2">No forecasts generated</p>
                    <button
                      onClick={refreshAll}
                      className="px-3 py-1 text-xs font-medium text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20"
                    >
                      Generate Forecasts
                    </button>
                  </div>
                )}
                {forecasts.map((f, i) => (
                  <ForecastChart key={i} forecast={f} />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* CENTER COLUMN: Risk Scoring */}
        <div className="col-span-4">
          <div className="bg-[#0d1219] rounded-lg border border-[#1e293b] p-3 mb-3">
            <button
              onClick={() => toggleSection('risks')}
              className="w-full flex items-center justify-between mb-2"
            >
              <SectionHeader 
                icon={Shield} 
                title="Risk Scoring Model" 
                subtitle="Multi-factor logistic regression"
              />
              {expandedSections.risks ? <ChevronDown size={14} className="text-[#5a6d8a]" /> : <ChevronRight size={14} className="text-[#5a6d8a]" />}
            </button>
            
            {expandedSections.risks && (
              <>
                {/* Model Metrics */}
                {modelMetrics && (
                  <div className="grid grid-cols-4 gap-1 mb-3 text-center">
                    {[
                      { label: 'Accuracy', value: modelMetrics.accuracy },
                      { label: 'Precision', value: modelMetrics.precision },
                      { label: 'Recall', value: modelMetrics.recall },
                      { label: 'AUC', value: modelMetrics.auc },
                    ].map((m, i) => (
                      <div key={i} className="p-1.5 rounded bg-[#151c28]">
                        <div className="text-[10px] text-[#5a6d8a]">{m.label}</div>
                        <div className="text-sm font-bold text-cyan-400">
                          {(m.value * 100).toFixed(0)}%
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Feature Importance */}
                {modelMetrics && (
                  <div className="mb-3">
                    <div className="text-[10px] text-[#5a6d8a] mb-1">Feature Importance</div>
                    <FeatureImportanceChart features={modelMetrics.featureImportance} />
                  </div>
                )}

                {/* Top Risk Facilities */}
                <div className="text-[10px] text-[#5a6d8a] mb-2">Top Risk Facilities</div>
                <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto">
                  {topRiskFacilities.map((risk, i) => (
                    <RiskScoreCard key={risk.facilityId} risk={risk} rank={i + 1} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Operator Profiles */}
          <div className="bg-[#0d1219] rounded-lg border border-[#1e293b] p-3">
            <SectionHeader 
              icon={Building2} 
              title="Operator Risk Profiles" 
              subtitle="Aggregated risk by operator"
            />
            <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
              {operatorsByRisk.map((profile, i) => (
                <OperatorProfileCard key={profile.operator} profile={profile} />
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Scenario Simulation */}
        <div className="col-span-4">
          <div className="bg-[#0d1219] rounded-lg border border-[#1e293b] p-3">
            <button
              onClick={() => toggleSection('scenarios')}
              className="w-full flex items-center justify-between mb-2"
            >
              <SectionHeader 
                icon={Shuffle} 
                title="Monte Carlo Simulation" 
                subtitle="Scenario analysis with 5K iterations"
              />
              {expandedSections.scenarios ? <ChevronDown size={14} className="text-[#5a6d8a]" /> : <ChevronRight size={14} className="text-[#5a6d8a]" />}
            </button>
            
            {expandedSections.scenarios && (
              <>
                {/* Scenario Comparison Chart */}
                {scenarios.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[10px] text-[#5a6d8a] mb-1">Scenario Comparison</div>
                    <ScenarioComparisonChart scenarios={scenarios} />
                  </div>
                )}

                {/* Scenario Cards */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {scenarios.map((scenario) => (
                    <ScenarioDetailCard
                      key={scenario.scenarioName}
                      scenario={scenario}
                      isSelected={selectedScenario === scenario.scenarioName}
                      onSelect={() => setSelectedScenario(scenario.scenarioName)}
                    />
                  ))}
                </div>

                {/* Selected Scenario Distribution */}
                {currentScenario && (
                  <DistributionChart scenario={currentScenario} />
                )}

                {isLoading && scenarios.length === 0 && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2">
                      <SkeletonCard />
                      <SkeletonCard />
                    </div>
                    <SkeletonChart height={140} />
                  </div>
                )}
                {scenarios.length === 0 && !isLoading && (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="p-3 rounded-full bg-[#1e293b] mb-3">
                      <Shuffle size={20} className="text-[#5a6d8a]" />
                    </div>
                    <p className="text-xs text-[#5a6d8a] mb-2">No simulations run</p>
                    <button
                      onClick={refreshAll}
                      className="px-3 py-1 text-xs font-medium text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20"
                    >
                      Run Simulations
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default PredictiveIntelligenceTab;

