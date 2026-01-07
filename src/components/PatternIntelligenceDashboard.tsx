/**
 * Pattern Intelligence Dashboard
 * 
 * Unified UI for pattern inference, BGP monitoring, CT monitoring,
 * curiosity engine, and multi-signal correlation.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Activity, Zap, Globe, Shield, Network, Brain, TrendingUp, TrendingDown,
  AlertTriangle, CheckCircle, XCircle, Clock, Eye, Wifi, WifiOff,
  Play, Pause, RefreshCw, Download, ChevronDown, ChevronUp,
  HelpCircle, Target, Database, BarChart3, FileText, Loader2
} from 'lucide-react';

// Import services
import { 
  patternEngine, 
  generateDemoData,
  type PatternAnalysis,
  type WorkloadType 
} from '../services/patternInference';
import { bgpMonitor, useBGPMonitoring, type BGPAnomaly } from '../services/bgpMonitoring';
import { ctMonitor, useCTMonitoring, type CTCertificate } from '../services/ctMonitoring';
import { curiosityEngine, useCuriosity, type CuriosityQuestion } from '../services/curiosityEngine';
import { correlationEngine, useCorrelation, type CorrelatedIntelligence } from '../services/correlationEngine';

// ============================================================================
// TYPES
// ============================================================================

interface DashboardTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const ConnectionStatus: React.FC<{
  label: string;
  isConnected: boolean;
  messagesReceived?: number;
  onConnect: () => void;
  onDisconnect: () => void;
}> = ({ label, isConnected, messagesReceived, onConnect, onDisconnect }) => (
  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
    <div className="flex items-center gap-2">
      {isConnected ? (
        <Wifi size={16} className="text-emerald-500" />
      ) : (
        <WifiOff size={16} className="text-slate-400" />
      )}
      <span className="text-sm font-medium">{label}</span>
      {messagesReceived !== undefined && isConnected && (
        <span className="text-xs text-slate-400">({messagesReceived.toLocaleString()} msgs)</span>
      )}
    </div>
    <button
      onClick={isConnected ? onDisconnect : onConnect}
      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
        isConnected 
          ? 'bg-red-100 text-red-700 hover:bg-red-200' 
          : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
      }`}
    >
      {isConnected ? 'Disconnect' : 'Connect'}
    </button>
  </div>
);

const WorkloadBadge: React.FC<{ type: WorkloadType; confidence: number }> = ({ type, confidence }) => {
  const colors: Record<WorkloadType, string> = {
    crypto_mining: 'bg-amber-100 text-amber-800 border-amber-300',
    ai_training: 'bg-purple-100 text-purple-800 border-purple-300',
    traditional_compute: 'bg-blue-100 text-blue-800 border-blue-300',
    hpc_scientific: 'bg-cyan-100 text-cyan-800 border-cyan-300',
    cdn_edge: 'bg-green-100 text-green-800 border-green-300',
    unknown: 'bg-slate-100 text-slate-600 border-slate-300'
  };

  const labels: Record<WorkloadType, string> = {
    crypto_mining: '⛏️ Crypto Mining',
    ai_training: '🤖 AI Training',
    traditional_compute: '🏢 Traditional',
    hpc_scientific: '🔬 HPC/Scientific',
    cdn_edge: '🌐 CDN/Edge',
    unknown: '❓ Unknown'
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full border ${colors[type]}`}>
      {labels[type]} ({(confidence * 100).toFixed(0)}%)
    </span>
  );
};

const SignificanceBadge: React.FC<{ level: string }> = ({ level }) => {
  const styles: Record<string, string> = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-slate-100 text-slate-600'
  };

  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded ${styles[level] || styles.low}`}>
      {level.toUpperCase()}
    </span>
  );
};

const HealthScore: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 70 ? 'text-emerald-600' : score >= 50 ? 'text-amber-600' : 'text-red-600';
  const bg = score >= 70 ? 'bg-emerald-100' : score >= 50 ? 'bg-amber-100' : 'bg-red-100';
  
  return (
    <div className={`inline-flex items-center gap-1 px-2 py-1 rounded ${bg}`}>
      <Activity size={14} className={color} />
      <span className={`text-sm font-bold ${color}`}>{score}</span>
    </div>
  );
};

const ExpandableSection: React.FC<{
  title: string;
  icon?: React.ReactNode;
  defaultOpen?: boolean;
  badge?: React.ReactNode;
  children: React.ReactNode;
}> = ({ title, icon, defaultOpen = false, badge, children }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-slate-50 hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          {icon}
          <span className="font-medium text-slate-700">{title}</span>
          {badge}
        </div>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && <div className="p-3 bg-white">{children}</div>}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const PatternIntelligenceDashboard: React.FC = () => {
  // State
  const [activeTab, setActiveTab] = useState('overview');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<PatternAnalysis | null>(null);
  const [selectedFacility, setSelectedFacility] = useState('demo-facility-1');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  
  // Hooks
  const bgp = useBGPMonitoring();
  const ct = useCTMonitoring();
  const curiosity = useCuriosity();
  const correlation = useCorrelation();

  // Toast handler
  const showToast = useCallback((message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Run demo analysis
  const runDemoAnalysis = useCallback(async (workloadType: WorkloadType = 'traditional_compute') => {
    setIsAnalyzing(true);
    showToast('Generating demo data and running analysis...', 'info');
    
    try {
      const demoData = generateDemoData(selectedFacility, 7, workloadType);
      await patternEngine.initialize(demoData);
      const result = await patternEngine.analyzeAll(demoData, selectedFacility);
      setAnalysis(result);
      showToast('Analysis complete!', 'success');
    } catch (error) {
      console.error('Analysis failed:', error);
      showToast('Analysis failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedFacility, showToast]);

  // Tab definitions
  const tabs: DashboardTab[] = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: <Activity size={16} /> },
    { id: 'workload', label: 'Workload', icon: <Zap size={16} /> },
    { id: 'bgp', label: 'BGP', icon: <Globe size={16} />, badge: bgp.recentAnomalies.length },
    { id: 'ct', label: 'Certificates', icon: <Shield size={16} />, badge: ct.recentAlerts.length },
    { id: 'correlation', label: 'Correlation', icon: <Network size={16} />, badge: correlation.highPriority.length },
    { id: 'curiosity', label: 'Questions', icon: <Brain size={16} />, badge: curiosity.questions.length }
  ], [bgp.recentAnomalies.length, ct.recentAlerts.length, correlation.highPriority.length, curiosity.questions.length]);

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-white ${
          toast.type === 'success' ? 'bg-emerald-500' : 
          toast.type === 'error' ? 'bg-red-500' : 'bg-blue-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Brain size={28} />
              Pattern Intelligence Engine
            </h1>
            <p className="text-indigo-200 mt-1">
              Real-time infrastructure surveillance detection & business intelligence
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedFacility}
              onChange={(e) => setSelectedFacility(e.target.value)}
              className="bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white text-sm"
            >
              <option value="demo-facility-1">Demo Facility 1</option>
              <option value="demo-facility-2">Demo Facility 2</option>
              <option value="demo-facility-3">Demo Facility 3</option>
            </select>
            <button
              onClick={() => runDemoAnalysis()}
              disabled={isAnalyzing}
              className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-medium hover:bg-indigo-50 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isAnalyzing ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
              {isAnalyzing ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-5 gap-4 mt-6">
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{analysis?.anomalies.length || 0}</div>
            <div className="text-xs text-indigo-200">Anomalies</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{bgp.routeStats.uniquePrefixes}</div>
            <div className="text-xs text-indigo-200">BGP Prefixes</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{ct.stats.facilityPatternsDetected}</div>
            <div className="text-xs text-indigo-200">Facility Certs</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{correlation.highPriority.length}</div>
            <div className="text-xs text-indigo-200">High Priority</div>
          </div>
          <div className="bg-white/10 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold">{curiosity.questions.length}</div>
            <div className="text-xs text-indigo-200">Open Questions</div>
          </div>
        </div>
      </div>

      {/* Connection Status */}
      <div className="grid grid-cols-2 gap-4">
        <ConnectionStatus
          label="RIPE RIS Live (BGP)"
          isConnected={bgp.isConnected}
          messagesReceived={bgp.messagesReceived}
          onConnect={bgp.connect}
          onDisconnect={bgp.disconnect}
        />
        <ConnectionStatus
          label="CertStream (CT Logs)"
          isConnected={ct.isConnected}
          messagesReceived={ct.certificatesProcessed}
          onConnect={ct.connect}
          onDisconnect={ct.disconnect}
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200">
        <div className="flex space-x-1 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge ? (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-96">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => runDemoAnalysis('traditional_compute')}
                disabled={isAnalyzing}
                className="p-4 bg-blue-50 hover:bg-blue-100 rounded-lg text-left transition-colors"
              >
                <div className="text-blue-600 font-medium">🏢 Traditional</div>
                <div className="text-xs text-slate-500 mt-1">Test with enterprise workload</div>
              </button>
              <button
                onClick={() => runDemoAnalysis('crypto_mining')}
                disabled={isAnalyzing}
                className="p-4 bg-amber-50 hover:bg-amber-100 rounded-lg text-left transition-colors"
              >
                <div className="text-amber-600 font-medium">⛏️ Crypto Mining</div>
                <div className="text-xs text-slate-500 mt-1">Test mining detection</div>
              </button>
              <button
                onClick={() => runDemoAnalysis('ai_training')}
                disabled={isAnalyzing}
                className="p-4 bg-purple-50 hover:bg-purple-100 rounded-lg text-left transition-colors"
              >
                <div className="text-purple-600 font-medium">🤖 AI Training</div>
                <div className="text-xs text-slate-500 mt-1">Test AI workload detection</div>
              </button>
              <button
                onClick={() => runDemoAnalysis('cdn_edge')}
                disabled={isAnalyzing}
                className="p-4 bg-green-50 hover:bg-green-100 rounded-lg text-left transition-colors"
              >
                <div className="text-green-600 font-medium">🌐 CDN/Edge</div>
                <div className="text-xs text-slate-500 mt-1">Test edge workload</div>
              </button>
            </div>

            {/* Analysis Results */}
            {analysis && (
              <div className="grid grid-cols-2 gap-4">
                {/* Workload Classification */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <Zap size={18} className="text-amber-500" />
                    Workload Classification
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Primary Type</span>
                      <WorkloadBadge 
                        type={analysis.workload.primaryType} 
                        confidence={analysis.workload.confidence} 
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Validation Layers</span>
                      <span className="font-medium">{analysis.workload.validationLayers}/4</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">False Positive Risk</span>
                      <span className={`font-medium ${
                        analysis.workload.falsePositiveRisk > 0.3 ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {(analysis.workload.falsePositiveRisk * 100).toFixed(0)}%
                      </span>
                    </div>
                    {analysis.workload.signals.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="text-xs font-medium text-slate-500 mb-2">Detection Signals</div>
                        <ul className="space-y-1">
                          {analysis.workload.signals.slice(0, 5).map((signal, i) => (
                            <li key={i} className="text-xs text-slate-600 flex items-start gap-1">
                              <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                              {signal}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Business Health */}
                <div className="bg-white border border-slate-200 rounded-lg p-4">
                  <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-3">
                    <Activity size={18} className="text-emerald-500" />
                    Business Health
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Health Score</span>
                      <HealthScore score={analysis.health.healthScore} />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Power Trend</span>
                      <span className={`font-medium flex items-center gap-1 ${
                        analysis.health.powerTrend === 'growing' ? 'text-emerald-600' :
                        analysis.health.powerTrend === 'declining' ? 'text-red-600' : 'text-slate-600'
                      }`}>
                        {analysis.health.powerTrend === 'growing' ? <TrendingUp size={14} /> :
                         analysis.health.powerTrend === 'declining' ? <TrendingDown size={14} /> : null}
                        {analysis.health.powerTrend}
                        <span className="text-xs text-slate-400">
                          ({analysis.health.powerTrendSlope > 0 ? '+' : ''}{analysis.health.powerTrendSlope.toFixed(1)} kW/day)
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Expansion Probability</span>
                      <span className={`font-medium ${
                        analysis.health.expansionProbability > 0.5 ? 'text-emerald-600' : 'text-slate-600'
                      }`}>
                        {(analysis.health.expansionProbability * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600">Churn Risk</span>
                      <span className={`font-medium ${
                        analysis.health.churnRisk > 0.3 ? 'text-red-600' : 'text-emerald-600'
                      }`}>
                        {(analysis.health.churnRisk * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-100 text-sm text-slate-600">
                      {analysis.health.businessInference}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!analysis && (
              <div className="bg-slate-50 rounded-lg p-8 text-center">
                <Database size={48} className="mx-auto text-slate-300 mb-4" />
                <h3 className="text-lg font-medium text-slate-600">No Analysis Yet</h3>
                <p className="text-slate-500 mt-1">Click &quot;Run Analysis&quot; or select a workload type above to generate demo data</p>
              </div>
            )}
          </div>
        )}

        {/* Workload Tab */}
        {activeTab === 'workload' && analysis && (
          <div className="space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <h3 className="font-bold text-lg mb-4">Workload Breakdown</h3>
              <div className="grid grid-cols-3 gap-4">
                {Object.entries(analysis.workload.breakdown).map(([type, score]) => (
                  <div key={type} className="p-3 bg-slate-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium capitalize">{type.replace('_', ' ')}</span>
                      <span className="text-sm font-bold">{(score * 100).toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full transition-all"
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ExpandableSection title="Business Inference" icon={<FileText size={16} />} defaultOpen>
              <p className="text-slate-700">{analysis.workload.businessInference}</p>
            </ExpandableSection>

            {analysis.workload.recommendedInvestigation && (
              <ExpandableSection title="Recommended Investigation" icon={<Target size={16} />}>
                <p className="text-slate-700">{analysis.workload.recommendedInvestigation}</p>
              </ExpandableSection>
            )}
          </div>
        )}

        {/* BGP Tab */}
        {activeTab === 'bgp' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{bgp.routeStats.announcements}</div>
                <div className="text-xs text-slate-600">Announcements</div>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-red-600">{bgp.routeStats.withdrawals}</div>
                <div className="text-xs text-slate-600">Withdrawals</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{bgp.routeStats.uniquePrefixes}</div>
                <div className="text-xs text-slate-600">Unique Prefixes</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{bgp.routeStats.anomaliesDetected}</div>
                <div className="text-xs text-slate-600">Anomalies</div>
              </div>
            </div>

            <ExpandableSection 
              title="Recent Anomalies" 
              icon={<AlertTriangle size={16} className="text-amber-500" />}
              badge={<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{bgp.recentAnomalies.length}</span>}
              defaultOpen
            >
              {bgp.recentAnomalies.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No anomalies detected. Connect to start monitoring.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {bgp.recentAnomalies.map((anomaly: BGPAnomaly) => (
                    <div key={anomaly.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800">{anomaly.prefix}</span>
                        <SignificanceBadge level={anomaly.significance} />
                      </div>
                      <div className="text-sm text-slate-600 mt-1">{anomaly.description}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {anomaly.provider} • {new Date(anomaly.timestamp).toLocaleTimeString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ExpandableSection>
          </div>
        )}

        {/* CT Tab */}
        {activeTab === 'ct' && (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-blue-600">{ct.stats.certificatesProcessed}</div>
                <div className="text-xs text-slate-600">Processed</div>
              </div>
              <div className="bg-emerald-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-emerald-600">{ct.stats.watchedDomainMatches}</div>
                <div className="text-xs text-slate-600">Domain Matches</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-purple-600">{ct.stats.facilityPatternsDetected}</div>
                <div className="text-xs text-slate-600">Facility Patterns</div>
              </div>
              <div className="bg-amber-50 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-amber-600">{ct.stats.alertsGenerated}</div>
                <div className="text-xs text-slate-600">Alerts</div>
              </div>
            </div>

            <ExpandableSection 
              title="Recent Alerts" 
              icon={<Shield size={16} className="text-emerald-500" />}
              badge={<span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">{ct.recentAlerts.length}</span>}
              defaultOpen
            >
              {ct.recentAlerts.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No alerts yet. Connect to start monitoring.</p>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {ct.recentAlerts.map((cert: CTCertificate) => (
                    <div key={cert.sha256} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-slate-800 truncate max-w-xs">{cert.commonName}</span>
                        <SignificanceBadge level={cert.significance} />
                      </div>
                      <div className="text-sm text-slate-600 mt-1">{cert.businessInference}</div>
                      {cert.geographicHint && (
                        <div className="text-xs text-indigo-600 mt-1">📍 {cert.geographicHint}</div>
                      )}
                      <div className="text-xs text-slate-400 mt-1">
                        {cert.provider} • {cert.alertType}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ExpandableSection>

            <ExpandableSection title="Watched Domains" icon={<Eye size={16} />}>
              <div className="flex flex-wrap gap-2">
                {ct.watchedDomains.slice(0, 20).map((domain: string) => (
                  <span key={domain} className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                    {domain}
                  </span>
                ))}
                {ct.watchedDomains.length > 20 && (
                  <span className="text-xs text-slate-400">+{ct.watchedDomains.length - 20} more</span>
                )}
              </div>
            </ExpandableSection>
          </div>
        )}

        {/* Correlation Tab */}
        {activeTab === 'correlation' && (
          <div className="space-y-4">
            <ExpandableSection 
              title="High Priority Intelligence" 
              icon={<Target size={16} className="text-red-500" />}
              badge={<span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{correlation.highPriority.length}</span>}
              defaultOpen
            >
              {correlation.highPriority.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No high priority correlations. Run analysis to generate.</p>
              ) : (
                <div className="space-y-3">
                  {correlation.highPriority.map((intel: CorrelatedIntelligence) => (
                    <div key={intel.id} className="p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-800">{intel.facilityId}</span>
                        <SignificanceBadge level={intel.investigationPriority} />
                      </div>
                      <div className="text-sm text-slate-700 mb-2">{intel.hypothesis}</div>
                      <div className="text-sm text-slate-600 italic">{intel.businessInference}</div>
                      <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
                        <span>Confidence: {(intel.combinedConfidence * 100).toFixed(0)}%</span>
                        <span>Signals: {intel.signalCount}</span>
                        <span>Pattern: {intel.pattern}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ExpandableSection>
          </div>
        )}

        {/* Curiosity Tab */}
        {activeTab === 'curiosity' && (
          <div className="space-y-4">
            {/* Calibration Report */}
            {curiosity.calibration && (
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4">
                <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                  <BarChart3 size={18} />
                  Model Calibration
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-slate-500">Brier Score</div>
                    <div className={`text-2xl font-bold ${
                      curiosity.calibration.brierScore < 0.25 ? 'text-emerald-600' : 'text-amber-600'
                    }`}>
                      {curiosity.calibration.brierScore.toFixed(3)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Predictions</div>
                    <div className="text-2xl font-bold text-slate-700">
                      {curiosity.calibration.resolvedPredictions}/{curiosity.calibration.totalPredictions}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-slate-500">Status</div>
                    <div className={`text-sm font-medium ${
                      curiosity.calibration.isOverconfident ? 'text-amber-600' :
                      curiosity.calibration.isUnderconfident ? 'text-blue-600' : 'text-emerald-600'
                    }`}>
                      {curiosity.calibration.isOverconfident ? '⚠️ Overconfident' :
                       curiosity.calibration.isUnderconfident ? '📉 Underconfident' : '✅ Well-calibrated'}
                    </div>
                  </div>
                </div>
                <p className="text-sm text-slate-600 mt-3">{curiosity.calibration.recommendation}</p>
              </div>
            )}

            <ExpandableSection 
              title="Open Questions" 
              icon={<HelpCircle size={16} className="text-purple-500" />}
              badge={<span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">{curiosity.questions.length}</span>}
              defaultOpen
            >
              {curiosity.questions.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No open questions. Questions are generated during analysis.</p>
              ) : (
                <div className="space-y-3">
                  {curiosity.questions.map((q: CuriosityQuestion) => (
                    <div key={q.id} className="p-3 bg-slate-50 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="font-medium text-slate-800">{q.text}</div>
                        <span className="text-xs text-slate-400 whitespace-nowrap ml-2">
                          Value: {(q.learningValue * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => curiosity.resolveQuestion(q.id, 'Resolved via investigation')}
                          className="text-xs px-2 py-1 bg-emerald-100 text-emerald-700 rounded hover:bg-emerald-200"
                        >
                          Resolve
                        </button>
                        <button
                          onClick={() => curiosity.dismissQuestion(q.id)}
                          className="text-xs px-2 py-1 bg-slate-100 text-slate-600 rounded hover:bg-slate-200"
                        >
                          Dismiss
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ExpandableSection>

            <ExpandableSection 
              title="Knowledge Gaps" 
              icon={<AlertTriangle size={16} className="text-amber-500" />}
              badge={<span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{curiosity.gaps.length}</span>}
            >
              {curiosity.gaps.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No knowledge gaps identified.</p>
              ) : (
                <div className="space-y-2">
                  {curiosity.gaps.map((gap) => (
                    <div key={gap.id} className="p-3 bg-amber-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-amber-800">{gap.description}</span>
                        <SignificanceBadge level={gap.priority} />
                      </div>
                      <div className="text-sm text-amber-700 mt-1">{gap.recommendation}</div>
                    </div>
                  ))}
                </div>
              )}
            </ExpandableSection>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatternIntelligenceDashboard;

