/**
 * Intelligence Hub Tab
 * 
 * Unified interface combining:
 * - Pattern Analysis (statistical anomalies)
 * - Pattern Lab (scenarios)
 * - Compliance Flow (graph visualization)
 * - Assurance Monitor (intent validation)
 * - Predictive Intelligence (forecasting)
 */

import React, { useState, useMemo } from 'react';
import { 
  Brain, 
  AlertTriangle, 
  TrendingDown, 
  Zap, 
  Search,
  Filter,
  FileText,
  GitBranch,
  Target,
  Activity,
  CheckCircle,
  XCircle,
  Info,
  ChevronDown,
  ChevronRight,
  Download,
  Play,
} from 'lucide-react';
import type { Facility } from '../../types';
import { useUnifiedIntelligence } from '../../hooks/useUnifiedIntelligence';
import type { IntelligenceFinding, IntelligenceScenario } from '../../analyzers/unified/intelligenceEngine';
import CytoscapeComponent from 'react-cytoscapejs';
import AutonomousAgentsPanel from '../AutonomousAgentsPanel';
import {
  CommandHeader,
  StatusCard,
  ActionButton,
  QuickFilters,
  InteractiveCard,
  LoadingSpinner,
} from '../shared/CommandCenterComponents';

interface IntelligenceHubTabProps {
  facilities: Facility[];
}

type FindingView = 'all' | 'anomalies' | 'violations' | 'predictions' | 'correlations';

export function IntelligenceHubTab({ facilities }: IntelligenceHubTabProps) {
  const intelligence = useUnifiedIntelligence(facilities);
  
  const [activeView, setActiveView] = useState<FindingView>('all');
  const [selectedFinding, setSelectedFinding] = useState<IntelligenceFinding | null>(null);
  const [showScenarioBuilder, setShowScenarioBuilder] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [query, setQuery] = useState('');
  
  // Scenario builder state
  const [scenarioName, setScenarioName] = useState('');
  const [scenarioStates, setScenarioStates] = useState<string[]>([]);
  const [scenarioOperators, setScenarioOperators] = useState<string[]>([]);
  const [scenarioAnalysis, setScenarioAnalysis] = useState({
    detectAnomalies: true,
    validateIntent: true,
    forecastTrends: true,
    visualizeGraph: false,
  });
  
  // Filter findings based on active view
  const displayedFindings = useMemo(() => {
    let filtered = intelligence.findings;
    
    switch (activeView) {
      case 'anomalies':
        filtered = intelligence.filterFindings('anomaly');
        break;
      case 'violations':
        filtered = intelligence.filterFindings('intent-violation');
        break;
      case 'predictions':
        filtered = intelligence.filterFindings('prediction');
        break;
      case 'correlations':
        filtered = intelligence.filterFindings('pattern');
        break;
    }
    
    // Apply text search if query exists
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(f =>
        f.title.toLowerCase().includes(lowerQuery) ||
        f.description.toLowerCase().includes(lowerQuery)
      );
    }
    
    return filtered;
  }, [intelligence, activeView, query]);
  
  // Get graph data
  const graphData = useMemo(() => {
    if (!showGraph) return null;
    return intelligence.getIntelligentGraph();
  }, [intelligence, showGraph]);
  
  // Handle scenario run
  const handleRunScenario = async () => {
    if (!scenarioName.trim()) return;
    
    try {
      await intelligence.runScenario({
        name: scenarioName,
        filters: {
          states: scenarioStates.length > 0 ? scenarioStates : undefined,
          operators: scenarioOperators.length > 0 ? scenarioOperators : undefined,
        },
        analysis: scenarioAnalysis,
      });
      
      // Reset form
      setScenarioName('');
      setScenarioStates([]);
      setScenarioOperators([]);
      setShowScenarioBuilder(false);
    } catch (error) {
      console.error('Scenario error:', error);
    }
  };
  
  // Get unique states and operators
  const uniqueStates = useMemo(() => 
    [...new Set(facilities.map(f => f.state))].sort(),
    [facilities]
  );
  
  const uniqueOperators = useMemo(() =>
    [...new Set(facilities.map(f => f.operator))].sort(),
    [facilities]
  );
  
  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      {/* PROMINENT Command Center Header */}
      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-pink-900 border-2 border-purple-500 rounded-xl p-6 shadow-2xl shadow-purple-500/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Brain className="w-10 h-10 text-purple-400" />
              <h1 className="text-3xl font-bold text-white">🧠 Unified Intelligence Hub</h1>
              {intelligence.loading && (
                <div className="flex items-center gap-2 px-4 py-2 bg-cyan-900/50 border-2 border-cyan-500 rounded-full animate-pulse">
                  <div className="w-3 h-3 bg-cyan-400 rounded-full animate-spin" />
                  <span className="text-lg text-cyan-300 font-bold">ANALYZING...</span>
                </div>
              )}
            </div>
            <p className="text-lg text-purple-200 font-medium">
              🔍 Cross-correlated findings from all analysis methods • Auto-refresh: 5min
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={intelligence.runIntelligence}
              disabled={intelligence.loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-800 text-white text-lg font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 hover:-translate-y-1"
            >
              <Zap className="w-5 h-5" />
              {intelligence.loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
            {intelligence.lastUpdate && (
              <div className="text-right">
                <div className="text-sm text-purple-400 font-medium">Last Analysis</div>
                <div className="text-lg text-purple-200 font-mono font-bold">
                  {intelligence.lastUpdate.toLocaleTimeString()}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* PROMINENT Quick Filters */}
        <div className="mt-4 flex items-center gap-3 flex-wrap">
          <span className="text-white font-bold text-lg">Filter:</span>
          {[
            { id: 'all', label: '📊 All Findings', count: intelligence.totalFindings },
            { id: 'anomalies', label: '🎯 Anomalies', count: intelligence.anomalies },
            { id: 'violations', label: '❌ Violations', count: intelligence.violations },
            { id: 'predictions', label: '📉 Predictions', count: intelligence.predictions },
            { id: 'correlations', label: '🌳 Correlations', count: intelligence.correlations },
          ].map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveView(filter.id as FindingView)}
              className={`px-5 py-2.5 rounded-lg text-base font-bold transition-all ${
                activeView === filter.id
                  ? 'bg-cyan-600 text-white border-2 border-cyan-400 shadow-lg shadow-cyan-500/50 scale-110'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
              }`}
            >
              {filter.label} {activeView === filter.id && `(${filter.count})`}
            </button>
          ))}
        </div>
      </div>
      
      {/* PROMINENT Status Summary Cards - HUGE */}
      <div className="grid grid-cols-6 gap-4">
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-2 border-gray-600 rounded-xl p-5 hover:scale-105 transition-all cursor-pointer shadow-xl" onClick={() => setActiveView('all')}>
          <FileText className="w-10 h-10 text-gray-400 mb-2" />
          <div className="text-4xl font-bold text-white mb-1">{intelligence.totalFindings}</div>
          <div className="text-base font-bold text-gray-400">Total Findings</div>
        </div>
        
        <div className="bg-gradient-to-br from-red-900 to-red-950 border-2 border-red-500 rounded-xl p-5 hover:scale-105 transition-all cursor-pointer shadow-xl hover:shadow-red-500/50 animate-pulse" onClick={() => setActiveView('all')}>
          <AlertTriangle className="w-10 h-10 text-red-400 mb-2" />
          <div className="text-4xl font-bold text-red-300 mb-1">{intelligence.criticalFindings}</div>
          <div className="text-base font-bold text-red-400">🚨 Critical</div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-900 to-orange-950 border-2 border-orange-500 rounded-xl p-5 hover:scale-105 transition-all cursor-pointer shadow-xl hover:shadow-orange-500/50" onClick={() => setActiveView('anomalies')}>
          <Target className="w-10 h-10 text-orange-400 mb-2" />
          <div className="text-4xl font-bold text-orange-300 mb-1">{intelligence.anomalies}</div>
          <div className="text-base font-bold text-orange-400">🎯 Anomalies</div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-900 to-yellow-950 border-2 border-yellow-500 rounded-xl p-5 hover:scale-105 transition-all cursor-pointer shadow-xl hover:shadow-yellow-500/50" onClick={() => setActiveView('violations')}>
          <XCircle className="w-10 h-10 text-yellow-400 mb-2" />
          <div className="text-4xl font-bold text-yellow-300 mb-1">{intelligence.violations}</div>
          <div className="text-base font-bold text-yellow-400">❌ Violations</div>
        </div>
        
        <div className="bg-gradient-to-br from-blue-900 to-blue-950 border-2 border-blue-500 rounded-xl p-5 hover:scale-105 transition-all cursor-pointer shadow-xl hover:shadow-blue-500/50" onClick={() => setActiveView('predictions')}>
          <TrendingDown className="w-10 h-10 text-blue-400 mb-2" />
          <div className="text-4xl font-bold text-blue-300 mb-1">{intelligence.predictions}</div>
          <div className="text-base font-bold text-blue-400">📉 Predictions</div>
        </div>
        
        <div className="bg-gradient-to-br from-purple-900 to-purple-950 border-2 border-purple-500 rounded-xl p-5 hover:scale-105 transition-all cursor-pointer shadow-xl hover:shadow-purple-500/50" onClick={() => setActiveView('correlations')}>
          <GitBranch className="w-10 h-10 text-purple-400 mb-2" />
          <div className="text-4xl font-bold text-purple-300 mb-1">{intelligence.correlations}</div>
          <div className="text-base font-bold text-purple-400">🌳 Correlations</div>
        </div>
      </div>
      
      {/* Autonomous AI Agents Section */}
      <div className="my-6">
        <AutonomousAgentsPanel facilities={facilities} />
      </div>
      
      {/* Action Bar */}
      <div className="flex gap-2">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search findings by title or description..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        
        <ActionButton
          icon={Target}
          label="Scenario Builder"
          onClick={() => setShowScenarioBuilder(!showScenarioBuilder)}
          variant={showScenarioBuilder ? 'primary' : 'secondary'}
        />
        
        <ActionButton
          icon={GitBranch}
          label="Graph View"
          onClick={() => setShowGraph(!showGraph)}
          variant={showGraph ? 'primary' : 'secondary'}
        />
      </div>
      
      {/* Scenario Builder */}
      {showScenarioBuilder && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-400" />
            Create Intelligence Scenario
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Scenario Name</label>
              <input
                type="text"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Michigan Deep Dive"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            
            <div>
              <label className="block text-sm text-slate-400 mb-1">Analysis Methods</label>
              <div className="grid grid-cols-2 gap-2">
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scenarioAnalysis.detectAnomalies}
                    onChange={(e) => setScenarioAnalysis(prev => ({
                      ...prev,
                      detectAnomalies: e.target.checked
                    }))}
                    className="rounded"
                  />
                  Anomalies
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scenarioAnalysis.validateIntent}
                    onChange={(e) => setScenarioAnalysis(prev => ({
                      ...prev,
                      validateIntent: e.target.checked
                    }))}
                    className="rounded"
                  />
                  Intent
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scenarioAnalysis.forecastTrends}
                    onChange={(e) => setScenarioAnalysis(prev => ({
                      ...prev,
                      forecastTrends: e.target.checked
                    }))}
                    className="rounded"
                  />
                  Predictions
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={scenarioAnalysis.visualizeGraph}
                    onChange={(e) => setScenarioAnalysis(prev => ({
                      ...prev,
                      visualizeGraph: e.target.checked
                    }))}
                    className="rounded"
                  />
                  Graph
                </label>
              </div>
            </div>
          </div>
          
          <div className="mt-3 flex justify-end">
            <button
              onClick={handleRunScenario}
              disabled={!scenarioName.trim() || intelligence.loading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white rounded-lg transition-colors"
            >
              Run Scenario
            </button>
          </div>
        </div>
      )}
      
      {/* Graph View */}
      {showGraph && graphData && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4 h-96">
          <div className="h-full">
            <CytoscapeComponent
              elements={[...graphData.nodes, ...graphData.edges]}
              style={{ width: '100%', height: '100%' }}
              layout={{ name: 'cose', animate: true }}
              stylesheet={[
                {
                  selector: 'node',
                  style: {
                    'label': 'data(label)',
                    'text-valign': 'center',
                    'text-halign': 'center',
                    'background-color': '#4F46E5',
                    'color': '#fff',
                    'font-size': '12px',
                  },
                },
                {
                  selector: 'node[health="critical"]',
                  style: {
                    'background-color': '#DC2626',
                  },
                },
                {
                  selector: 'node[health="warning"]',
                  style: {
                    'background-color': '#F59E0B',
                  },
                },
                {
                  selector: 'node[health="healthy"]',
                  style: {
                    'background-color': '#10B981',
                  },
                },
                {
                  selector: 'edge',
                  style: {
                    'width': 2,
                    'line-color': '#374151',
                    'curve-style': 'bezier',
                  },
                },
              ]}
            />
          </div>
        </div>
      )}
      
      {/* View Selector */}
      <div className="flex gap-2 border-b border-slate-700">
        {[
          { id: 'all' as FindingView, label: 'All Findings', count: intelligence.totalFindings },
          { id: 'anomalies' as FindingView, label: 'Anomalies', count: intelligence.anomalies },
          { id: 'violations' as FindingView, label: 'Violations', count: intelligence.violations },
          { id: 'predictions' as FindingView, label: 'Predictions', count: intelligence.predictions },
          { id: 'correlations' as FindingView, label: 'Correlations', count: intelligence.correlations },
        ].map(view => (
          <button
            key={view.id}
            onClick={() => setActiveView(view.id)}
            className={`px-4 py-2 font-medium transition-colors ${
              activeView === view.id
                ? 'text-indigo-400 border-b-2 border-indigo-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            {view.label} ({view.count})
          </button>
        ))}
      </div>
      
      {/* Findings List */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {intelligence.loading ? (
          <div className="text-center py-12 text-slate-500">
            <Activity className="w-12 h-12 mx-auto mb-2 animate-pulse" />
            <div>Analyzing compliance data...</div>
          </div>
        ) : displayedFindings.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div>No findings in this category</div>
          </div>
        ) : (
          displayedFindings.map(finding => (
            <FindingCard
              key={finding.id}
              finding={finding}
              selected={selectedFinding?.id === finding.id}
              onClick={() => setSelectedFinding(finding)}
              onViewRelated={() => {
                const related = intelligence.getRelatedFindings(finding.id);
                console.log('Related findings:', related);
              }}
            />
          ))
        )}
      </div>
      
      {/* Finding Detail Modal */}
      {selectedFinding && (
        <FindingDetailModal
          finding={selectedFinding}
          relatedFindings={intelligence.getRelatedFindings(selectedFinding.id)}
          onClose={() => setSelectedFinding(null)}
        />
      )}
    </div>
  );
}

// Finding Card Component
function FindingCard({
  finding,
  selected,
  onClick,
  onViewRelated,
}: {
  finding: IntelligenceFinding;
  selected: boolean;
  onClick: () => void;
  onViewRelated: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  
  const severityColors = {
    critical: { glow: 'red', text: 'text-red-300', icon: 'text-red-400' },
    warning: { glow: 'cyan', text: 'text-yellow-300', icon: 'text-yellow-400' },
    info: { glow: 'blue', text: 'text-blue-300', icon: 'text-blue-400' },
  };
  
  const categoryIcons = {
    'anomaly': AlertTriangle,
    'intent-violation': XCircle,
    'prediction': TrendingDown,
    'pattern': GitBranch,
    'drift': Activity,
  };
  
  const Icon = categoryIcons[finding.category];
  const colors = severityColors[finding.severity];
  
  return (
    <InteractiveCard
      onClick={onClick}
      glowColor={colors.glow}
      className={selected ? 'ring-2 ring-cyan-500' : ''}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className={`w-5 h-5 ${colors.icon}`} />
          <h3 className={`font-semibold ${colors.text}`}>
            {finding.title}
          </h3>
        </div>
        
        <div className="flex items-center gap-2">
          <span className={`px-2 py-1 rounded text-xs font-medium ${severityColors[finding.severity]}`}>
            {finding.severity.toUpperCase()}
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
            className="text-slate-400 hover:text-white"
          >
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
      
      <p className="text-sm text-slate-300 mb-2">{finding.description}</p>
      
      <div className="flex items-center gap-4 text-xs text-slate-500">
        <span>Confidence: {(finding.confidence * 100).toFixed(0)}%</span>
        <span>Method: {finding.detectionMethod}</span>
        <span>Affected: {finding.affectedFacilities.length}</span>
        {finding.relatedFindings.length > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewRelated();
            }}
            className="text-indigo-400 hover:text-indigo-300"
          >
            {finding.relatedFindings.length} related
          </button>
        )}
      </div>
      
      {expanded && (
        <div className="mt-3 pt-3 border-t border-slate-700 space-y-2">
          {finding.actionable && finding.suggestedActions.length > 0 && (
            <div>
              <div className="text-sm font-medium text-slate-400 mb-1">Suggested Actions:</div>
              <ul className="space-y-1">
                {finding.suggestedActions.map((action, idx) => (
                  <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                    <span className="text-indigo-400">→</span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
          
          {finding.causality && (
            <div>
              <div className="text-sm font-medium text-slate-400 mb-1">Root Cause:</div>
              <div className="text-sm text-slate-300">{finding.causality.rootCause}</div>
            </div>
          )}
        </div>
      )}
    </InteractiveCard>
  );
}

// Finding Detail Modal
function FindingDetailModal({
  finding,
  relatedFindings,
  onClose,
}: {
  finding: IntelligenceFinding;
  relatedFindings: IntelligenceFinding[];
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-700 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">{finding.title}</h2>
              <p className="text-slate-300">{finding.description}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-400">Category:</span>
                  <span className="text-white">{finding.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Severity:</span>
                  <span className="text-white">{finding.severity}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Confidence:</span>
                  <span className="text-white">{(finding.confidence * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Detection Method:</span>
                  <span className="text-white">{finding.detectionMethod}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Timestamp:</span>
                  <span className="text-white">{finding.timestamp.toLocaleString()}</span>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">Evidence</h3>
              <div className="space-y-2">
                {finding.evidence.map((ev, idx) => (
                  <div key={idx} className="p-2 bg-slate-800 rounded text-sm">
                    <div className="text-slate-400">{ev.metric}</div>
                    <div className="flex justify-between mt-1">
                      <span className="text-green-400">Expected: {ev.expected}</span>
                      <span className="text-red-400">Actual: {ev.actual}</span>
                    </div>
                    <div className="text-yellow-400 mt-1">
                      Deviation: {ev.deviation.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          {finding.causality && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-3">Root Cause Analysis</h3>
              <div className="p-4 bg-slate-800 rounded">
                <div className="text-white font-medium mb-2">{finding.causality.rootCause}</div>
                <div className="text-sm text-slate-400">Contributing Factors:</div>
                <ul className="mt-2 space-y-1">
                  {finding.causality.contributingFactors.map((factor, idx) => (
                    <li key={idx} className="text-sm text-slate-300 flex items-start gap-2">
                      <span className="text-indigo-400">•</span>
                      {factor}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
          
          {finding.suggestedActions.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-3">Suggested Actions</h3>
              <div className="space-y-2">
                {finding.suggestedActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-indigo-950/50 border border-indigo-800 rounded flex items-start gap-3"
                  >
                    <FileText className="w-5 h-5 text-indigo-400 mt-0.5" />
                    <span className="text-white">{action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {relatedFindings.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-white mb-3">
                Related Findings ({relatedFindings.length})
              </h3>
              <div className="space-y-2">
                {relatedFindings.map(related => (
                  <div
                    key={related.id}
                    className="p-3 bg-slate-800 border border-slate-700 rounded"
                  >
                    <div className="font-medium text-white">{related.title}</div>
                    <div className="text-sm text-slate-400 mt-1">{related.description}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

