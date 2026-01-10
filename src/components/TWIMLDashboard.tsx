/**
 * TWIML AI Dashboard
 * 
 * Comprehensive dashboard showcasing all TWIML-inspired AI agent features:
 * - Episode #718: AutoGen actor patterns (Web Workers)
 * - Episode #739: A2A/MCP Protocol (Tool Registry)
 * - Episode #740: Networks of Networks (Signal Correlation)
 * - Episode #746: PlayerZero AI Immune System
 * - Episode #756: Yutori Scouts (Memory, Cost Tracking)
 * 
 * @component
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  Brain,
  Activity,
  Shield,
  DollarSign,
  Zap,
  Network,
  Database,
  Wrench,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Clock,
  Cpu,
  MemoryStick,
  Target,
  RefreshCw,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';

// Import TWIML services
import { useAgentWorkers } from '../services/agentWorkerManager';
import { useAgentMemory } from '../services/agentMemory';
import { useSignalCorrelation } from '../services/signalCorrelation';
import { useMCPTools } from '../services/mcpToolRegistry';
import { useAIImmuneSystem } from '../services/aiImmuneSystem';
import { useCostTracking } from '../services/costTracking';

// ============================================================================
// TYPES
// ============================================================================

type DashboardTab = 
  | 'overview'
  | 'workers'
  | 'memory'
  | 'signals'
  | 'tools'
  | 'immune'
  | 'costs';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const TWIMLDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshCounter, setRefreshCounter] = useState(0);

  // Load all TWIML services
  const workers = useAgentWorkers();
  const memory = useAgentMemory();
  const signals = useSignalCorrelation();
  const tools = useMCPTools();
  const immune = useAIImmuneSystem();
  const costs = useCostTracking();

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      setRefreshCounter(c => c + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const tabs: Array<{ id: DashboardTab; label: string; icon: React.ReactNode; episode: string }> = [
    { id: 'overview', label: 'Overview', icon: <Brain className="w-4 h-4" />, episode: 'All' },
    { id: 'workers', label: 'Workers', icon: <Cpu className="w-4 h-4" />, episode: '#718' },
    { id: 'memory', label: 'Memory', icon: <MemoryStick className="w-4 h-4" />, episode: '#756' },
    { id: 'signals', label: 'Signals', icon: <Network className="w-4 h-4" />, episode: '#740' },
    { id: 'tools', label: 'MCP Tools', icon: <Wrench className="w-4 h-4" />, episode: '#739' },
    { id: 'immune', label: 'Immune', icon: <Shield className="w-4 h-4" />, episode: '#746' },
    { id: 'costs', label: 'Costs', icon: <DollarSign className="w-4 h-4" />, episode: '#756' },
  ];

  return (
    <div className="bg-slate-950 text-white min-h-full">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Brain className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">TWIML AI Agent System</h1>
              <p className="text-sm text-slate-400">
                Autonomous intelligence • Episodes #718, #739, #740, #746, #756
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* System Health Badge */}
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
              immune.systemHealth.status === 'healthy' ? 'bg-green-500/20 text-green-400' :
              immune.systemHealth.status === 'degraded' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {immune.systemHealth.status === 'healthy' ? <CheckCircle className="w-4 h-4" /> :
               immune.systemHealth.status === 'degraded' ? <AlertTriangle className="w-4 h-4" /> :
               <XCircle className="w-4 h-4" />}
              <span className="text-sm font-medium capitalize">{immune.systemHealth.status}</span>
              <span className="text-xs opacity-70">{immune.systemHealth.healthScore}%</span>
            </div>
            
            {/* Auto-refresh toggle */}
            <button
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={`p-2 rounded-lg transition-colors ${
                autoRefresh ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-800 text-slate-400'
              }`}
              title={autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
            >
              <RefreshCw className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} 
                style={{ animationDuration: '3s' }} />
            </button>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 mt-4 overflow-x-auto pb-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              {tab.icon}
              {tab.label}
              <span className="text-xs opacity-50">{tab.episode}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <OverviewTab 
            workers={workers} 
            signals={signals} 
            tools={tools} 
            immune={immune} 
            costs={costs}
            memory={memory}
          />
        )}
        {activeTab === 'workers' && <WorkersTab workers={workers} />}
        {activeTab === 'memory' && <MemoryTab memory={memory} />}
        {activeTab === 'signals' && <SignalsTab signals={signals} />}
        {activeTab === 'tools' && <ToolsTab tools={tools} />}
        {activeTab === 'immune' && <ImmuneTab immune={immune} />}
        {activeTab === 'costs' && <CostsTab costs={costs} />}
      </div>
    </div>
  );
};

// ============================================================================
// OVERVIEW TAB
// ============================================================================

const OverviewTab: React.FC<{
  workers: ReturnType<typeof useAgentWorkers>;
  signals: ReturnType<typeof useSignalCorrelation>;
  tools: ReturnType<typeof useMCPTools>;
  immune: ReturnType<typeof useAIImmuneSystem>;
  costs: ReturnType<typeof useCostTracking>;
  memory: ReturnType<typeof useAgentMemory>;
}> = ({ workers, signals, tools, immune, costs, memory }) => {
  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          icon={<Cpu className="w-5 h-5" />}
          label="Workers"
          value={workers.stats.runningWorkers}
          subValue={`of ${workers.stats.totalWorkers}`}
          color="blue"
        />
        <StatCard
          icon={<Database className="w-5 h-5" />}
          label="Memories"
          value={memory.stats?.totalMemories || 0}
          subValue="stored"
          color="purple"
        />
        <StatCard
          icon={<Network className="w-5 h-5" />}
          label="Signals"
          value={signals.stats.bufferedSignals}
          subValue={`${signals.correlations.length} correlated`}
          color="cyan"
        />
        <StatCard
          icon={<Wrench className="w-5 h-5" />}
          label="Tools"
          value={tools.stats.activeTools}
          subValue="registered"
          color="green"
        />
        <StatCard
          icon={<Shield className="w-5 h-5" />}
          label="Health"
          value={`${immune.systemHealth.healthScore}%`}
          subValue={immune.systemHealth.status}
          color={immune.systemHealth.status === 'healthy' ? 'green' : 
                 immune.systemHealth.status === 'degraded' ? 'yellow' : 'red'}
        />
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Cost"
          value={`$${(costs.summary?.totalCost || 0).toFixed(3)}`}
          subValue={`avg $${(costs.summary?.avgCostPerTask || 0).toFixed(3)}/task`}
          color="orange"
        />
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Correlations */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              Recent Signal Correlations
            </h3>
            <span className="text-xs text-slate-500">Episode #740</span>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {signals.correlations.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                No correlations detected yet. Signals are being monitored...
              </p>
            ) : (
              signals.correlations.slice(0, 5).map((corr, i) => (
                <div key={corr.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    corr.pattern.severity === 'critical' ? 'bg-red-500' :
                    corr.pattern.severity === 'high' ? 'bg-orange-500' :
                    corr.pattern.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{corr.pattern.name}</p>
                    <p className="text-xs text-slate-400">
                      {corr.signals.length} signals • {(corr.correlationScore * 100).toFixed(0)}% confidence
                    </p>
                  </div>
                  <span className="text-xs text-slate-500">
                    {new Date(corr.detectedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Immune System Events */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              Immune System Events
            </h3>
            <span className="text-xs text-slate-500">Episode #746</span>
          </div>
          
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {immune.events.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-4">
                System healthy. No healing events.
              </p>
            ) : (
              immune.events.slice(0, 5).map((event, i) => (
                <div key={event.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    event.severity === 'critical' ? 'bg-red-500' :
                    event.severity === 'error' ? 'bg-orange-500' :
                    event.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{event.message}</p>
                    <p className="text-xs text-slate-400 capitalize">{event.eventType}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* TWIML Episodes Reference */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4">TWIML AI Podcast Episodes Implemented</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { ep: '#718', title: 'AutoGen Actor Patterns', feature: 'Web Worker Agents', status: '✅' },
            { ep: '#739', title: 'A2A & MCP Protocols', feature: 'Tool Registry', status: '✅' },
            { ep: '#740', title: 'Networks of Networks', feature: 'Signal Correlation', status: '✅' },
            { ep: '#746', title: 'PlayerZero AI Immune', feature: 'Self-Healing System', status: '✅' },
            { ep: '#756', title: 'Yutori Scouts', feature: 'Agent Memory & Costs', status: '✅' },
            { ep: '#593', title: 'PayPal Graph ML', feature: 'Knowledge Graph', status: '✅' },
          ].map(item => (
            <div key={item.ep} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
              <span className="text-purple-400 font-mono text-sm">{item.ep}</span>
              <div className="flex-1">
                <p className="text-sm font-medium">{item.title}</p>
                <p className="text-xs text-slate-400">{item.feature}</p>
              </div>
              <span className="text-lg">{item.status}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// WORKERS TAB
// ============================================================================

const WorkersTab: React.FC<{ workers: ReturnType<typeof useAgentWorkers> }> = ({ workers }) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Web Worker Agents (Episode #718)</h2>
        <div className="flex gap-2">
          <button
            onClick={() => workers.spawnWorker('anomaly')}
            className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-sm hover:bg-blue-500/30"
          >
            + Spawn Anomaly
          </button>
          <button
            onClick={() => workers.spawnWorker('compliance')}
            className="px-3 py-1.5 bg-green-500/20 text-green-400 rounded-lg text-sm hover:bg-green-500/30"
          >
            + Spawn Compliance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {workers.workers.map(worker => (
          <div key={worker.id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-blue-400" />
                <span className="font-medium capitalize">{worker.type}</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs ${
                worker.status === 'running' ? 'bg-green-500/20 text-green-400' :
                worker.status === 'error' ? 'bg-red-500/20 text-red-400' :
                'bg-slate-700 text-slate-400'
              }`}>
                {worker.status}
              </span>
            </div>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Tasks Completed</span>
                <span>{worker.stats.tasksCompleted}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Avg Duration</span>
                <span>{worker.stats.avgDuration.toFixed(0)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Cost</span>
                <span>${worker.stats.totalCost.toFixed(4)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Restarts</span>
                <span>{worker.restartCount}</span>
              </div>
            </div>
            
            <button
              onClick={() => workers.terminateWorker(worker.id)}
              className="mt-3 w-full py-1.5 bg-red-500/10 text-red-400 rounded text-sm hover:bg-red-500/20"
            >
              Terminate
            </button>
          </div>
        ))}
        
        {workers.workers.length === 0 && (
          <div className="col-span-full text-center py-12 text-slate-500">
            No workers running. Click spawn buttons above to start agents.
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MEMORY TAB
// ============================================================================

const MemoryTab: React.FC<{ memory: ReturnType<typeof useAgentMemory> }> = ({ memory }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Agent Memory System (Episode #756)</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Database className="w-5 h-5" />}
          label="Total Memories"
          value={memory.stats?.totalMemories || 0}
          color="purple"
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Avg Confidence"
          value={`${((memory.stats?.avgConfidence || 0) * 100).toFixed(1)}%`}
          color="blue"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Memory Age"
          value={memory.stats?.oldestMemory 
            ? `${Math.round((Date.now() - memory.stats.oldestMemory.getTime()) / (1000 * 60 * 60 * 24))}d`
            : 'N/A'}
          color="green"
        />
        <StatCard
          icon={<Brain className="w-5 h-5" />}
          label="Memory Types"
          value={Object.keys(memory.stats?.byType || {}).length}
          color="cyan"
        />
      </div>

      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4">Memory Distribution</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(memory.stats?.byType || {}).map(([type, count]) => (
            <div key={type} className="p-3 bg-slate-800/50 rounded-lg">
              <p className="text-2xl font-bold">{count as number}</p>
              <p className="text-sm text-slate-400 capitalize">{type.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SIGNALS TAB
// ============================================================================

const SignalsTab: React.FC<{ signals: ReturnType<typeof useSignalCorrelation> }> = ({ signals }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Multi-Signal Correlation (Episode #740)</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Buffered Signals"
          value={signals.stats.bufferedSignals}
          color="cyan"
        />
        <StatCard
          icon={<Network className="w-5 h-5" />}
          label="Correlations"
          value={signals.correlations.length}
          color="purple"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Patterns"
          value={signals.patterns.length}
          color="green"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Status"
          value={signals.isRunning ? 'Running' : 'Stopped'}
          color={signals.isRunning ? 'green' : 'red'}
        />
      </div>

      {/* Signal Sources */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4">Signals by Source</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(signals.stats.signalsBySource).map(([source, count]) => (
            <div key={source} className="p-3 bg-slate-800/50 rounded-lg text-center">
              <p className="text-xl font-bold">{count}</p>
              <p className="text-xs text-slate-400 uppercase">{source}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Active Patterns */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4">Detection Patterns</h3>
        <div className="space-y-2">
          {signals.patterns.map(pattern => (
            <div key={pattern.id} className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${
                pattern.severity === 'critical' ? 'bg-red-500' :
                pattern.severity === 'high' ? 'bg-orange-500' :
                pattern.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
              }`} />
              <div className="flex-1">
                <p className="font-medium">{pattern.name}</p>
                <p className="text-sm text-slate-400">{pattern.description}</p>
              </div>
              <span className="text-xs text-slate-500">
                {pattern.requiredSignals.length} signals required
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// TOOLS TAB
// ============================================================================

const ToolsTab: React.FC<{ tools: ReturnType<typeof useMCPTools> }> = ({ tools }) => {
  const [expandedTool, setExpandedTool] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">MCP Tool Registry (Episode #739)</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Wrench className="w-5 h-5" />}
          label="Total Tools"
          value={tools.stats.totalTools}
          color="green"
        />
        <StatCard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Active"
          value={tools.stats.activeTools}
          color="blue"
        />
        <StatCard
          icon={<Zap className="w-5 h-5" />}
          label="Invocations"
          value={tools.stats.totalInvocations}
          color="purple"
        />
        <StatCard
          icon={<Clock className="w-5 h-5" />}
          label="Avg Latency"
          value={`${tools.stats.avgLatencyMs.toFixed(0)}ms`}
          color="cyan"
        />
      </div>

      {/* Tools List */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4">Registered Tools</h3>
        <div className="space-y-2">
          {tools.tools.map(tool => (
            <div key={tool.id} className="bg-slate-800/50 rounded-lg">
              <button
                onClick={() => setExpandedTool(expandedTool === tool.id ? null : tool.id)}
                className="w-full flex items-center gap-3 p-3"
              >
                {expandedTool === tool.id ? 
                  <ChevronDown className="w-4 h-4" /> : 
                  <ChevronRight className="w-4 h-4" />}
                <Wrench className="w-4 h-4 text-green-400" />
                <div className="flex-1 text-left">
                  <p className="font-medium">{tool.name}</p>
                  <p className="text-xs text-slate-400">{tool.description}</p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  tool.category === 'analysis' ? 'bg-purple-500/20 text-purple-400' :
                  tool.category === 'evidence' ? 'bg-blue-500/20 text-blue-400' :
                  tool.category === 'data_retrieval' ? 'bg-green-500/20 text-green-400' :
                  'bg-slate-700 text-slate-400'
                }`}>
                  {tool.category}
                </span>
              </button>
              
              {expandedTool === tool.id && (
                <div className="px-3 pb-3 pt-0 border-t border-slate-700">
                  <div className="grid grid-cols-2 gap-4 mt-3 text-sm">
                    <div>
                      <p className="text-slate-400">Provider</p>
                      <p>{tool.provider}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Version</p>
                      <p>{tool.version}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Usage Count</p>
                      <p>{tool.usageCount}</p>
                    </div>
                    <div>
                      <p className="text-slate-400">Cost/Call</p>
                      <p>{tool.costPerCall ? `$${tool.costPerCall}` : 'Free'}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// IMMUNE TAB
// ============================================================================

const ImmuneTab: React.FC<{ immune: ReturnType<typeof useAIImmuneSystem> }> = ({ immune }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">AI Immune System (Episode #746)</h2>
      
      {/* System Health */}
      <div className={`p-6 rounded-xl border ${
        immune.systemHealth.status === 'healthy' ? 'bg-green-500/10 border-green-500/30' :
        immune.systemHealth.status === 'degraded' ? 'bg-yellow-500/10 border-yellow-500/30' :
        'bg-red-500/10 border-red-500/30'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Shield className={`w-12 h-12 ${
              immune.systemHealth.status === 'healthy' ? 'text-green-400' :
              immune.systemHealth.status === 'degraded' ? 'text-yellow-400' :
              'text-red-400'
            }`} />
            <div>
              <h3 className="text-2xl font-bold capitalize">{immune.systemHealth.status}</h3>
              <p className="text-slate-400">System Health Score: {immune.systemHealth.healthScore}%</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-3xl font-bold">{immune.systemHealth.componentCount}</p>
            <p className="text-slate-400">Components Monitored</p>
          </div>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{immune.systemHealth.healthyCount}</p>
            <p className="text-sm text-slate-400">Healthy</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{immune.systemHealth.degradedCount}</p>
            <p className="text-sm text-slate-400">Degraded</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{immune.systemHealth.criticalCount}</p>
            <p className="text-sm text-slate-400">Critical</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-slate-400">{immune.systemHealth.offlineCount}</p>
            <p className="text-sm text-slate-400">Offline</p>
          </div>
        </div>
      </div>

      {/* Recent Events */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4">Health Events</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {immune.events.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No health events recorded</p>
          ) : (
            immune.events.map(event => (
              <div key={event.id} className="flex items-center gap-3 p-2 bg-slate-800/50 rounded-lg">
                <div className={`w-2 h-2 rounded-full ${
                  event.severity === 'critical' ? 'bg-red-500' :
                  event.severity === 'error' ? 'bg-orange-500' :
                  event.severity === 'warning' ? 'bg-yellow-500' : 'bg-blue-500'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{event.message}</p>
                  <p className="text-xs text-slate-400">{event.eventType}</p>
                </div>
                <span className="text-xs text-slate-500">
                  {new Date(event.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// COSTS TAB
// ============================================================================

const CostsTab: React.FC<{ costs: ReturnType<typeof useCostTracking> }> = ({ costs }) => {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">Cost Tracking (Episode #756 - Yutori Scouts)</h2>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<DollarSign className="w-5 h-5" />}
          label="Total Cost"
          value={`$${(costs.summary?.totalCost || 0).toFixed(4)}`}
          color="green"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Tasks"
          value={costs.summary?.taskCount || 0}
          color="blue"
        />
        <StatCard
          icon={<Target className="w-5 h-5" />}
          label="Avg/Task"
          value={`$${(costs.summary?.avgCostPerTask || 0).toFixed(4)}`}
          subValue={`target: $${costs.targetCostPerTask}`}
          color={(costs.summary?.avgCostPerTask || 0) <= costs.targetCostPerTask ? 'green' : 'orange'}
        />
        <StatCard
          icon={<Database className="w-5 h-5" />}
          label="Tokens"
          value={costs.summary?.totalTokens.toLocaleString() || '0'}
          color="purple"
        />
      </div>

      {/* Cost by Category */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
        <h3 className="font-semibold mb-4">Cost by Category</h3>
        <div className="space-y-3">
          {Object.entries(costs.summary?.costByCategory || {}).map(([category, cost]) => (
            <div key={category} className="flex items-center gap-3">
              <div className="w-32 text-sm text-slate-400 capitalize">
                {category.replace('_', ' ')}
              </div>
              <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                  style={{ 
                    width: `${Math.min(100, (cost as number / (costs.summary?.totalCost || 1)) * 100)}%` 
                  }}
                />
              </div>
              <div className="w-20 text-right text-sm">
                ${(cost as number).toFixed(4)}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optimization Recommendations */}
      {costs.recommendations.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
          <h3 className="font-semibold mb-4">Optimization Recommendations</h3>
          <div className="space-y-2">
            {costs.recommendations.map(rec => (
              <div key={rec.id} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm">{rec.description}</p>
                  <p className="text-xs text-green-400 mt-1">
                    Potential savings: ${rec.potentialSavings.toFixed(4)}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-xs ${
                  rec.effort === 'low' ? 'bg-green-500/20 text-green-400' :
                  rec.effort === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {rec.effort} effort
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  color: 'blue' | 'green' | 'purple' | 'cyan' | 'orange' | 'red' | 'yellow';
}> = ({ icon, label, value, subValue, color }) => {
  const colorClasses = {
    blue: 'text-blue-400 bg-blue-500/20',
    green: 'text-green-400 bg-green-500/20',
    purple: 'text-purple-400 bg-purple-500/20',
    cyan: 'text-cyan-400 bg-cyan-500/20',
    orange: 'text-orange-400 bg-orange-500/20',
    red: 'text-red-400 bg-red-500/20',
    yellow: 'text-yellow-400 bg-yellow-500/20',
  };

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
      <div className={`inline-flex p-2 rounded-lg ${colorClasses[color]}`}>
        {icon}
      </div>
      <p className="text-2xl font-bold mt-3">{value}</p>
      <p className="text-sm text-slate-400">{label}</p>
      {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
};
