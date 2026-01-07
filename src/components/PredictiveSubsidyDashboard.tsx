/**
 * Predictive Subsidy Intelligence Dashboard
 * 
 * Moves from Good Jobs First-style post-hoc research to PROACTIVE risk identification.
 * 
 * Features:
 * - State-level subsidy program profiles (32 states with DC incentives)
 * - Facility-level risk scoring with early warning signals
 * - Operator subsidy exposure analysis
 * - Predictive compliance trajectory modeling
 * - "Dark state" transparency tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  AlertTriangle, TrendingUp, TrendingDown, DollarSign, Building,
  MapPin, Users, Activity, ChevronDown, ChevronRight, RefreshCw,
  Download, Eye, Shield, AlertCircle, CheckCircle, XCircle, Search,
  FileText, Target, Zap, BarChart3, PieChart, ArrowUpRight, Clock,
  Flag, Scale, Lightbulb, ExternalLink
} from 'lucide-react';

import {
  predictiveSubsidyIntelligence,
  SubsidyRiskScore,
  StateSubsidyProfile,
  EarlyWarningSignal,
  STATE_PROFILES,
  STATES_WITH_DC_INCENTIVES
} from '../services/predictiveSubsidyIntelligence';

// ============================================================================
// TYPES
// ============================================================================

type TabId = 'overview' | 'states' | 'facilities' | 'operators' | 'predictions' | 'dark-states';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const RiskBadge: React.FC<{ level: string; size?: 'sm' | 'md' }> = ({ level, size = 'md' }) => {
  const colors = {
    critical: 'bg-red-600 text-white',
    high: 'bg-orange-500 text-white',
    medium: 'bg-yellow-500 text-black',
    low: 'bg-green-500 text-white',
    unknown: 'bg-slate-400 text-white'
  };
  
  const sizeClass = size === 'sm' ? 'px-1.5 py-0.5 text-xs' : 'px-2 py-1 text-sm';
  
  return (
    <span className={`${colors[level as keyof typeof colors] || colors.unknown} ${sizeClass} rounded font-medium`}>
      {level.toUpperCase()}
    </span>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
}> = ({ title, value, subtitle, icon, color, trend }) => (
  <div className={`p-4 rounded-xl border ${color} bg-white`}>
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color.replace('border-', 'bg-').replace('-200', '-100')}`}>
          {icon}
        </div>
        <div>
          <div className="text-sm text-slate-600">{title}</div>
          <div className="text-2xl font-bold text-slate-800">{value}</div>
          {subtitle && <div className="text-xs text-slate-500">{subtitle}</div>}
        </div>
      </div>
      {trend && (
        <div className={`flex items-center gap-1 ${
          trend === 'up' ? 'text-red-500' : trend === 'down' ? 'text-green-500' : 'text-slate-400'
        }`}>
          {trend === 'up' && <TrendingUp size={16} />}
          {trend === 'down' && <TrendingDown size={16} />}
          {trend === 'stable' && <Activity size={16} />}
        </div>
      )}
    </div>
  </div>
);

const WarningSignalCard: React.FC<{ signal: EarlyWarningSignal }> = ({ signal }) => {
  const [expanded, setExpanded] = useState(false);
  
  const severityColors = {
    critical: 'border-l-red-600 bg-red-50',
    high: 'border-l-orange-500 bg-orange-50',
    medium: 'border-l-yellow-500 bg-yellow-50',
    low: 'border-l-green-500 bg-green-50'
  };
  
  return (
    <div className={`border-l-4 rounded-r-lg p-3 ${severityColors[signal.severity]}`}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className={
            signal.severity === 'critical' ? 'text-red-600' :
            signal.severity === 'high' ? 'text-orange-500' :
            signal.severity === 'medium' ? 'text-yellow-600' : 'text-green-600'
          } />
          <span className="font-medium text-sm text-slate-800">
            {signal.signalType.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </span>
          <RiskBadge level={signal.severity} size="sm" />
        </div>
        {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      
      {expanded && (
        <div className="mt-2 pt-2 border-t border-slate-200 text-xs">
          <p className="text-slate-600 mb-2">{signal.description}</p>
          <div className="flex flex-wrap gap-1 mb-2">
            {signal.evidence.map((e, i) => (
              <span key={i} className="px-1.5 py-0.5 bg-white rounded text-slate-500">{e}</span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-slate-500">
            <span>Confidence: {signal.confidence}%</span>
            {signal.daysToCritical && <span>Days to Critical: {signal.daysToCritical}</span>}
          </div>
          <div className="mt-2 p-2 bg-white rounded">
            <span className="font-medium text-slate-700">Action:</span>{' '}
            <span className="text-slate-600">{signal.recommendedAction}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PredictiveSubsidyDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [stateProfiles, setStateProfiles] = useState<StateSubsidyProfile[]>([]);
  const [facilityRisks, setFacilityRisks] = useState<SubsidyRiskScore[]>([]);
  const [operatorExposure, setOperatorExposure] = useState<Array<{
    operator: string;
    totalSubsidyValue: number;
    facilitiesCount: number;
    averageRiskScore: number;
    totalJobsPromised: number;
    totalJobsDelivered: number;
    jobsDeliveryRate: number;
  }>>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary', 'critical']));
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [states, risks, operators] = await Promise.all([
        Promise.resolve(predictiveSubsidyIntelligence.generateStateSubsidyReport()),
        predictiveSubsidyIntelligence.analyzeAllFacilitiesSubsidyRisk(),
        predictiveSubsidyIntelligence.estimateOperatorSubsidyExposure()
      ]);
      setStateProfiles(states);
      setFacilityRisks(risks);
      setOperatorExposure(operators);
    } catch (error) {
      console.error('Error loading predictive subsidy data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Calculate summary stats
  const criticalStates = stateProfiles.filter(s => s.fiscalRiskRating === 'critical');
  const darkStates = stateProfiles.filter(s => !s.disclosesAggregateLoss);
  const totalRevenueLoss = stateProfiles.reduce((sum, s) => sum + (s.annualRevenueLoss || 0), 0);
  const highRiskFacilities = facilityRisks.filter(f => f.overallRiskScore > 70);
  const totalSubsidyAtRisk = facilityRisks.reduce((sum, f) => sum + f.subsidyAtRisk, 0);

  const tabs: Array<{ id: TabId; label: string; icon: React.ReactNode; badge?: number }> = [
    { id: 'overview', label: 'Overview', icon: <BarChart3 size={16} /> },
    { id: 'states', label: 'State Profiles', icon: <MapPin size={16} />, badge: 32 },
    { id: 'facilities', label: 'Facility Risk', icon: <Building size={16} />, badge: highRiskFacilities.length },
    { id: 'operators', label: 'Operator Exposure', icon: <Users size={16} /> },
    { id: 'predictions', label: 'Predictions', icon: <TrendingUp size={16} /> },
    { id: 'dark-states', label: 'Dark States', icon: <Eye size={16} />, badge: 12 },
  ];

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-rose-600 via-orange-600 to-amber-600 rounded-xl p-4 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Target className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">🎯 Predictive Subsidy Intelligence</h1>
              <p className="text-sm text-white/80">
                Proactive risk detection • Moving beyond post-hoc discovery
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <a 
              href="https://goodjobsfirst.org" 
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded flex items-center gap-1.5 text-sm"
            >
              <ExternalLink size={14} />
              Good Jobs First
            </a>
            <button
              onClick={loadData}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded flex items-center gap-1.5 text-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Loading...' : 'Refresh'}
            </button>
            <button className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded flex items-center gap-1.5 text-sm">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mt-3 flex items-start gap-3 flex-shrink-0">
        <Lightbulb className="text-amber-600 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-sm">
          <strong className="text-amber-800">Good Jobs First Research:</strong>{' '}
          <span className="text-amber-700">
            32 states give 100% sales tax exemptions to data centers. Virginia gets back only 48¢ per $1 abated.
            Texas revised FY2025 cost from $130M to $1B in 23 months. This tool identifies at-risk subsidies BEFORE they fail.
          </span>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-5 gap-3 mt-3 flex-shrink-0">
        <MetricCard
          title="States w/ DC Incentives"
          value="32"
          subtitle="of 50 states"
          icon={<MapPin size={18} className="text-blue-600" />}
          color="border-blue-200"
        />
        <MetricCard
          title="Critical Risk States"
          value={criticalStates.length}
          subtitle="need immediate review"
          icon={<AlertTriangle size={18} className="text-red-600" />}
          color="border-red-200"
          trend="up"
        />
        <MetricCard
          title="Known Annual Loss"
          value={`$${(totalRevenueLoss / 1e9).toFixed(1)}B+`}
          subtitle="documented losses"
          icon={<DollarSign size={18} className="text-orange-600" />}
          color="border-orange-200"
          trend="up"
        />
        <MetricCard
          title="Dark States"
          value={darkStates.length}
          subtitle="no disclosure"
          icon={<Eye size={18} className="text-slate-600" />}
          color="border-slate-200"
        />
        <MetricCard
          title="High-Risk Facilities"
          value={highRiskFacilities.length}
          subtitle={`$${(totalSubsidyAtRisk / 1e6).toFixed(0)}M at risk`}
          icon={<Building size={18} className="text-rose-600" />}
          color="border-rose-200"
          trend="up"
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-4 flex-shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeTab === tab.id
                ? 'bg-white text-rose-700 border border-b-0 border-slate-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === tab.id ? 'bg-rose-100 text-rose-700' : 'bg-slate-200'
              }`}>
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="flex-1 bg-white rounded-b-lg border border-t-0 border-slate-200 overflow-hidden">
        <div className="h-full overflow-y-auto p-4">
          
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Critical Alerts */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="text-red-600" size={20} />
                  <h3 className="font-bold text-red-800">Critical Findings (Good Jobs First Data)</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-white p-3 rounded border border-red-100">
                    <div className="font-bold text-red-700">Virginia</div>
                    <div className="text-slate-600">Gets back only <strong>48¢</strong> per $1 abated</div>
                    <div className="text-xs text-slate-500 mt-1">Source: JLARC 2024</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-red-100">
                    <div className="font-bold text-red-700">Georgia</div>
                    <div className="text-slate-600"><strong>$50M</strong> in tax breaks vs <strong>$15M</strong> taxes returned</div>
                    <div className="text-xs text-slate-500 mt-1">Source: Carl Vinson Institute</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-red-100">
                    <div className="font-bold text-red-700">Texas</div>
                    <div className="text-slate-600">FY2025 cost revised from <strong>$130M to $1B</strong></div>
                    <div className="text-xs text-slate-500 mt-1">7.7x underestimate in 23 months</div>
                  </div>
                  <div className="bg-white p-3 rounded border border-red-100">
                    <div className="font-bold text-red-700">Washington</div>
                    <div className="text-slate-600"><strong>$57M</strong> sales tax lost vs <strong>$22M</strong> property taxes paid</div>
                    <div className="text-xs text-slate-500 mt-1">Source: JLARC 2017</div>
                  </div>
                </div>
              </div>

              {/* Why Predictive Intelligence Matters */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="text-indigo-600" size={20} />
                  <h3 className="font-bold text-indigo-800">Why Predictive Intelligence?</h3>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">❌ Current Reality (Post-Hoc)</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• Discover failures years after they happen</li>
                      <li>• Clawbacks rarely enforced</li>
                      <li>• No early warning systems</li>
                      <li>• Reliance on self-reported data</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-medium text-slate-700 mb-2">✅ Our Approach (Predictive)</h4>
                    <ul className="text-sm text-slate-600 space-y-1">
                      <li>• Real-time risk scoring from DCIM patterns</li>
                      <li>• Early warning signals before failures</li>
                      <li>• Cross-reference jobs vs power consumption</li>
                      <li>• Track corporate restructuring signals</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Leading Indicators We Track */}
              <div className="border border-slate-200 rounded-lg p-4">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <Activity size={18} />
                  Leading Indicators We Track
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { icon: <Zap size={16} />, title: 'Power vs Jobs Divergence', desc: 'Power consumption rising without job creation' },
                    { icon: <FileText size={16} />, title: 'SEC Filing Analysis', desc: 'Automation/restructuring language detection' },
                    { icon: <Building size={16} />, title: 'Corporate Restructuring', desc: 'Shell company creation, jurisdiction changes' },
                    { icon: <Activity size={16} />, title: 'Network Topology Shifts', desc: 'BGP changes indicating facility downsizing' },
                    { icon: <Users size={16} />, title: 'Job Posting Trends', desc: 'Declining hiring at subsidized facilities' },
                    { icon: <Scale size={16} />, title: 'Clawback Timeline Risk', desc: 'Approaching deadlines without compliance' },
                  ].map((indicator, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-indigo-600">{indicator.icon}</span>
                        <span className="font-medium text-sm text-slate-800">{indicator.title}</span>
                      </div>
                      <p className="text-xs text-slate-600">{indicator.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STATES TAB */}
          {activeTab === 'states' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800">32 States with Data Center Tax Incentives</h3>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">Critical: {criticalStates.length}</span>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">High: {stateProfiles.filter(s => s.fiscalRiskRating === 'high').length}</span>
                  <span className="px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">Dark: {darkStates.length}</span>
                </div>
              </div>
              
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {stateProfiles.map(state => (
                  <div 
                    key={state.stateCode}
                    className={`border rounded-lg p-3 ${
                      state.fiscalRiskRating === 'critical' ? 'border-red-300 bg-red-50' :
                      state.fiscalRiskRating === 'high' ? 'border-orange-300 bg-orange-50' :
                      'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-lg border flex items-center justify-center font-bold text-slate-700">
                          {state.stateCode}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{state.stateName}</div>
                          <div className="text-xs text-slate-500">
                            {state.salesTaxExemptionPercent}% sales tax exemption
                            {state.propertyTaxAbatementPercent && ` • ${state.propertyTaxAbatementPercent}% property tax`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {state.annualRevenueLoss > 0 && (
                          <div className="text-right">
                            <div className="text-sm font-bold text-red-600">
                              ${(state.annualRevenueLoss / 1e6).toFixed(0)}M
                            </div>
                            <div className="text-xs text-slate-500">annual loss</div>
                          </div>
                        )}
                        {state.costBenefitRatio > 0 && (
                          <div className="text-right">
                            <div className="text-sm font-bold text-orange-600">
                              {(state.costBenefitRatio * 100).toFixed(0)}¢
                            </div>
                            <div className="text-xs text-slate-500">per $1</div>
                          </div>
                        )}
                        <div className="flex flex-col gap-1 items-end">
                          <RiskBadge level={state.fiscalRiskRating} size="sm" />
                          {!state.disclosesAggregateLoss && (
                            <span className="px-1.5 py-0.5 bg-slate-800 text-white text-xs rounded">DARK</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span className={`${state.disclosesAggregateLoss ? 'text-green-600' : 'text-red-600'}`}>
                        {state.disclosesAggregateLoss ? '✓' : '✗'} Aggregate disclosure
                      </span>
                      <span className={`${state.disclosesCompanySpecific ? 'text-green-600' : 'text-red-600'}`}>
                        {state.disclosesCompanySpecific ? '✓' : '✗'} Company-specific
                      </span>
                      <span className={`${state.hasAnnualCap ? 'text-green-600' : 'text-red-600'}`}>
                        {state.hasAnnualCap ? '✓' : '✗'} Annual cap
                      </span>
                      <span className="text-slate-500">Transparency: {state.transparencyScore}/100</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FACILITIES TAB */}
          {activeTab === 'facilities' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-bold text-slate-800">Facility-Level Subsidy Risk Scores</h3>
                <span className="text-sm text-slate-500">{facilityRisks.length} facilities analyzed</span>
              </div>
              
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {facilityRisks.slice(0, 50).map((risk, i) => (
                  <div 
                    key={risk.facilityId}
                    className={`border rounded-lg p-3 ${
                      risk.overallRiskScore > 70 ? 'border-red-300 bg-red-50' :
                      risk.overallRiskScore > 50 ? 'border-orange-300 bg-orange-50' :
                      risk.overallRiskScore > 30 ? 'border-yellow-300 bg-yellow-50' :
                      'border-green-300 bg-green-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-slate-800">{risk.facilityName}</div>
                        <div className="text-xs text-slate-500">
                          {risk.operator} • {risk.state}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className={`text-2xl font-bold ${
                            risk.overallRiskScore > 70 ? 'text-red-600' :
                            risk.overallRiskScore > 50 ? 'text-orange-600' :
                            risk.overallRiskScore > 30 ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {risk.overallRiskScore}
                          </div>
                          <div className="text-xs text-slate-500">Risk Score</div>
                        </div>
                        <div className="text-center">
                          <div className="text-lg font-bold text-slate-700">
                            {risk.clawbackProbability}%
                          </div>
                          <div className="text-xs text-slate-500">Clawback Prob.</div>
                        </div>
                        {risk.subsidyAtRisk > 0 && (
                          <div className="text-center">
                            <div className="text-lg font-bold text-red-600">
                              ${(risk.subsidyAtRisk / 1e6).toFixed(1)}M
                            </div>
                            <div className="text-xs text-slate-500">At Risk</div>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 mt-2 text-xs">
                      <span>Jobs: {risk.jobComplianceScore}%</span>
                      <span>Investment: {risk.investmentComplianceScore}%</span>
                      <span>Trend: <span className={
                        risk.riskTrend === 'critical' ? 'text-red-600' :
                        risk.riskTrend === 'worsening' ? 'text-orange-600' :
                        risk.riskTrend === 'improving' ? 'text-green-600' : 'text-slate-600'
                      }>{risk.riskTrend}</span></span>
                    </div>
                    {risk.activeWarnings.length > 0 && (
                      <div className="mt-2 flex gap-1 flex-wrap">
                        {risk.activeWarnings.map((w, j) => (
                          <span key={j} className={`px-1.5 py-0.5 rounded text-xs ${
                            w.severity === 'critical' ? 'bg-red-200 text-red-800' :
                            w.severity === 'high' ? 'bg-orange-200 text-orange-800' : 'bg-yellow-200 text-yellow-800'
                          }`}>
                            {w.signalType.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* OPERATORS TAB */}
          {activeTab === 'operators' && (
            <div className="space-y-3">
              <h3 className="font-bold text-slate-800 mb-2">Operator Subsidy Exposure Analysis</h3>
              
              <div className="max-h-[500px] overflow-y-auto space-y-2">
                {operatorExposure.map((op, i) => (
                  <div key={op.operator} className="border border-slate-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                          {i + 1}
                        </div>
                        <div>
                          <div className="font-medium text-slate-800">{op.operator}</div>
                          <div className="text-xs text-slate-500">{op.facilitiesCount} facilities</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-center">
                          <div className="text-lg font-bold text-slate-800">
                            ${(op.totalSubsidyValue / 1e6).toFixed(0)}M
                          </div>
                          <div className="text-xs text-slate-500">Total Subsidy</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            op.averageRiskScore > 60 ? 'text-red-600' :
                            op.averageRiskScore > 40 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {op.averageRiskScore}
                          </div>
                          <div className="text-xs text-slate-500">Avg Risk</div>
                        </div>
                        <div className="text-center">
                          <div className={`text-lg font-bold ${
                            op.jobsDeliveryRate < 50 ? 'text-red-600' :
                            op.jobsDeliveryRate < 80 ? 'text-orange-600' : 'text-green-600'
                          }`}>
                            {op.jobsDeliveryRate}%
                          </div>
                          <div className="text-xs text-slate-500">Jobs Delivered</div>
                        </div>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 bg-slate-100 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            op.jobsDeliveryRate < 50 ? 'bg-red-500' :
                            op.jobsDeliveryRate < 80 ? 'bg-orange-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, op.jobsDeliveryRate)}%` }}
                        />
                      </div>
                      <span className="text-xs text-slate-500">
                        {op.totalJobsDelivered.toLocaleString()} / {op.totalJobsPromised.toLocaleString()} jobs
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DARK STATES TAB */}
          {activeTab === 'dark-states' && (
            <div className="space-y-4">
              <div className="bg-slate-800 text-white rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye size={20} />
                  <h3 className="font-bold">12 "Dark" States</h3>
                </div>
                <p className="text-slate-300 text-sm">
                  These states have data center tax incentives but fail to disclose even aggregate revenue losses.
                  Without disclosure, taxpayers cannot evaluate the true cost of these programs.
                </p>
              </div>
              
              <div className="grid grid-cols-3 gap-3">
                {darkStates.map(state => (
                  <div key={state.stateCode} className="border border-slate-300 bg-slate-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-10 h-10 bg-slate-800 text-white rounded flex items-center justify-center font-bold">
                        {state.stateCode}
                      </div>
                      <div>
                        <div className="font-medium text-slate-800">{state.stateName}</div>
                        <div className="text-xs text-red-600">No disclosure</div>
                      </div>
                    </div>
                    <div className="text-xs text-slate-600 space-y-1">
                      <div className="flex justify-between">
                        <span>Transparency Score:</span>
                        <span className="font-bold text-red-600">{state.transparencyScore}/100</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Fiscal Risk:</span>
                        <RiskBadge level={state.fiscalRiskRating} size="sm" />
                      </div>
                    </div>
                    <button className="mt-2 w-full px-2 py-1 bg-slate-800 text-white text-xs rounded hover:bg-slate-700">
                      File FOIA Request
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                <h4 className="font-bold text-amber-800 mb-2">Good Jobs First Recommendation</h4>
                <p className="text-sm text-amber-700">
                  "For every state, no matter how its program works, we urge robust public disclosure."
                  Dark states prevent accountability and hide the true cost of data center subsidies from taxpayers.
                </p>
              </div>
            </div>
          )}

          {/* PREDICTIONS TAB */}
          {activeTab === 'predictions' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-bold text-purple-800 mb-2 flex items-center gap-2">
                  <TrendingUp size={18} />
                  Predictive Modeling Capabilities
                </h3>
                <p className="text-sm text-purple-700 mb-3">
                  These models combine DCIM infrastructure data with financial signals to predict subsidy compliance failures
                  before they happen - enabling proactive intervention instead of post-hoc discovery.
                </p>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-3 rounded-lg border border-purple-100">
                    <h4 className="font-medium text-slate-800 mb-2">🔮 Compliance Trajectory Model</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• Projects job creation pace vs deadline</li>
                      <li>• Identifies "on track" vs "at risk" facilities</li>
                      <li>• Adjusts for power consumption patterns</li>
                      <li>• Flags automation signals</li>
                    </ul>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100">
                    <h4 className="font-medium text-slate-800 mb-2">📊 Early Warning Aggregator</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• SEC filing sentiment analysis</li>
                      <li>• Corporate restructuring detection</li>
                      <li>• Network topology changes (BGP)</li>
                      <li>• Leadership/hiring trends</li>
                    </ul>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100">
                    <h4 className="font-medium text-slate-800 mb-2">⚖️ Clawback Probability Engine</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• Time to deadline analysis</li>
                      <li>• Progress rate modeling</li>
                      <li>• Historical clawback data</li>
                      <li>• Enforcement probability by state</li>
                    </ul>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-purple-100">
                    <h4 className="font-medium text-slate-800 mb-2">💰 Subsidy Exposure Calculator</h4>
                    <ul className="text-xs text-slate-600 space-y-1">
                      <li>• Per-operator subsidy totals</li>
                      <li>• State-level exposure mapping</li>
                      <li>• Risk-weighted $ at risk</li>
                      <li>• Portfolio risk assessment</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div className="border border-slate-200 rounded-lg p-4">
                <h4 className="font-bold text-slate-800 mb-3">Data Sources Integrated</h4>
                <div className="grid grid-cols-4 gap-2 text-sm">
                  {[
                    { name: 'SEC EDGAR', status: 'active', desc: 'Financial filings' },
                    { name: 'OpenCorporates', status: 'active', desc: 'Corporate structure' },
                    { name: 'PeeringDB', status: 'active', desc: 'Network infrastructure' },
                    { name: 'USASpending', status: 'active', desc: 'Federal contracts' },
                    { name: 'RIPE RIS', status: 'active', desc: 'BGP monitoring' },
                    { name: 'CertStream', status: 'active', desc: 'SSL certificates' },
                    { name: 'Census API', status: 'planned', desc: 'Demographics' },
                    { name: 'BLS API', status: 'planned', desc: 'Employment data' },
                  ].map((source, i) => (
                    <div key={i} className={`p-2 rounded border ${
                      source.status === 'active' ? 'border-green-200 bg-green-50' : 'border-slate-200 bg-slate-50'
                    }`}>
                      <div className="font-medium text-slate-800">{source.name}</div>
                      <div className="text-xs text-slate-500">{source.desc}</div>
                      <span className={`text-xs ${source.status === 'active' ? 'text-green-600' : 'text-slate-400'}`}>
                        {source.status === 'active' ? '● Active' : '○ Planned'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600 mt-3 flex items-center gap-2 flex-shrink-0">
        <Flag className="text-rose-500" size={14} />
        <span>
          <strong>Mission:</strong> Move from post-hoc discovery to proactive risk identification. 
          Help organizations like Good Jobs First catch subsidy failures BEFORE they happen.
        </span>
      </div>
    </div>
  );
};

export default PredictiveSubsidyDashboard;

