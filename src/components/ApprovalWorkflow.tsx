/**
 * Human-in-the-Loop Approval Workflow Component
 * 
 * Provides a UI for reviewing and approving/rejecting agent actions
 * that don't meet confidence thresholds. Based on:
 * - Episode #741: Wordware's "systems that know what they don't know"
 * - Episode #756: Yutori's human escalation patterns
 * 
 * Key Features:
 * - Priority-sorted pending approvals queue
 * - Detailed reasoning and evidence display
 * - Quick approve/reject with feedback
 * - Audit trail for all decisions
 * - Agent dashboard with real-time stats
 */

import React, { useState, useMemo } from 'react';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Shield,
  ChevronDown,
  ChevronUp,
  Eye,
  FileText,
  Bot,
  User,
  Zap,
  Activity,
  DollarSign,
  Target,
  Network,
  TrendingUp,
  Play,
  Pause,
  RefreshCw,
} from 'lucide-react';
import { useAgentManager, Agent, ApprovalRequest } from '../services/agentManager';

// ============================================================================
// AGENT STATUS CARD
// ============================================================================

interface AgentCardProps {
  agent: Agent;
}

const AgentCard: React.FC<AgentCardProps> = ({ agent }) => {
  const statusColors = {
    idle: 'bg-gray-100 text-gray-600 border-gray-300',
    active: 'bg-green-100 text-green-700 border-green-300',
    processing: 'bg-blue-100 text-blue-700 border-blue-300',
    error: 'bg-red-100 text-red-700 border-red-300',
    offline: 'bg-gray-200 text-gray-500 border-gray-400',
  };

  const agentIcons: Record<string, React.ReactNode> = {
    anomaly: <Zap className="w-5 h-5 text-yellow-500" />,
    compliance: <Shield className="w-5 h-5 text-blue-500" />,
    subsidy: <DollarSign className="w-5 h-5 text-green-500" />,
    network: <Network className="w-5 h-5 text-purple-500" />,
    ownership: <Target className="w-5 h-5 text-orange-500" />,
  };

  const timeSinceHeartbeat = Math.floor((Date.now() - agent.lastHeartbeat) / 1000);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            {agentIcons[agent.type] || <Bot className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-semibold text-gray-900">{agent.name}</h4>
            <p className="text-xs text-gray-500">{agent.id.slice(0, 20)}...</p>
          </div>
        </div>
        <span className={`px-2 py-1 text-xs rounded-full border ${statusColors[agent.status]}`}>
          {agent.status === 'processing' && <RefreshCw className="w-3 h-3 inline mr-1 animate-spin" />}
          {agent.status}
        </span>
      </div>

      {agent.currentTask && (
        <div className="mt-3 p-2 bg-blue-50 rounded text-xs text-blue-700">
          <Activity className="w-3 h-3 inline mr-1" />
          {agent.currentTask}
        </div>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="bg-gray-50 rounded p-2">
          <div className="text-lg font-bold text-green-600">{agent.tasksCompleted}</div>
          <div className="text-xs text-gray-500">Completed</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-lg font-bold text-red-600">{agent.tasksFailed}</div>
          <div className="text-xs text-gray-500">Failed</div>
        </div>
        <div className="bg-gray-50 rounded p-2">
          <div className="text-lg font-bold text-blue-600">${agent.totalCost.toFixed(2)}</div>
          <div className="text-xs text-gray-500">Cost</div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1">
        {agent.capabilities.slice(0, 3).map((cap, i) => (
          <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
            {cap}
          </span>
        ))}
        {agent.capabilities.length > 3 && (
          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded">
            +{agent.capabilities.length - 3}
          </span>
        )}
      </div>

      <div className="mt-3 text-xs text-gray-400 flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Last heartbeat: {timeSinceHeartbeat < 60 ? `${timeSinceHeartbeat}s ago` : `${Math.floor(timeSinceHeartbeat / 60)}m ago`}
      </div>
    </div>
  );
};

// ============================================================================
// APPROVAL CARD
// ============================================================================

interface ApprovalCardProps {
  request: ApprovalRequest;
  onApprove: (feedback?: string) => void;
  onReject: (reason: string) => void;
  expanded: boolean;
  onToggleExpand: () => void;
}

const ApprovalCard: React.FC<ApprovalCardProps> = ({
  request,
  onApprove,
  onReject,
  expanded,
  onToggleExpand,
}) => {
  const [feedback, setFeedback] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);

  const impactColors: Record<string, string> = {
    critical: 'bg-red-100 text-red-800 border-red-300',
    high: 'bg-orange-100 text-orange-800 border-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300',
  };

  const agentTypeIcons: Record<string, React.ReactNode> = {
    anomaly: <Zap className="w-4 h-4 text-yellow-500" />,
    compliance: <Shield className="w-4 h-4 text-blue-500" />,
    subsidy: <DollarSign className="w-4 h-4 text-green-500" />,
    network: <Network className="w-4 h-4 text-purple-500" />,
    ownership: <Target className="w-4 h-4 text-orange-500" />,
  };

  // Defensive: ensure request has required fields
  const impact = request.impact || 'medium';
  const confidence = request.confidence ?? 0;
  const createdAt = request.createdAt || Date.now();

  const timeAgo = useMemo(() => {
    const minutes = Math.floor((Date.now() - createdAt) / (1000 * 60));
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }, [createdAt]);

  const handleApprove = () => {
    onApprove(feedback || undefined);
    setFeedback('');
  };

  const handleReject = () => {
    if (!rejectReason.trim()) {
      setShowRejectInput(true);
      return;
    }
    onReject(rejectReason);
    setRejectReason('');
    setShowRejectInput(false);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
        onClick={onToggleExpand}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gray-100 rounded-lg">
            {agentTypeIcons[request.agentType] || <Bot className="w-4 h-4" />}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-gray-900 line-clamp-1">{request.action}</h4>
            <div className="flex items-center gap-2 mt-1">
              <span className={`px-2 py-0.5 text-xs rounded-full border ${impactColors[impact] || impactColors.medium}`}>
                {impact.toUpperCase()}
              </span>
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Target className="w-3 h-3" />
                {(confidence * 100).toFixed(0)}% confidence
              </span>
              <span className="text-xs text-gray-400">{timeAgo}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="border-t border-gray-100 p-4 space-y-4">
          {/* Reasoning */}
          <div>
            <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
              <Eye className="w-4 h-4" />
              Agent Reasoning
            </h5>
            <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
              {request.reasoning}
            </p>
          </div>

          {/* Evidence */}
          {request.evidence && request.evidence.length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1">
                <FileText className="w-4 h-4" />
                Supporting Evidence ({request.evidence.length})
              </h5>
              <ul className="space-y-2">
                {request.evidence.map((item, index) => (
                  <li
                    key={index}
                    className="text-sm text-gray-600 bg-blue-50 p-2 rounded flex items-start gap-2"
                  >
                    <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Parameters */}
          {request.parameters && Object.keys(request.parameters).length > 0 && (
            <div>
              <h5 className="text-sm font-medium text-gray-700 mb-2">Parameters</h5>
              <div className="bg-gray-900 text-green-400 p-3 rounded-lg font-mono text-xs overflow-x-auto">
                {JSON.stringify(request.parameters, null, 2)}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col gap-3 pt-2">
            {/* Feedback input */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Optional feedback</label>
              <input
                type="text"
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Add notes for audit trail..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Reject reason input */}
            {showRejectInput && (
              <div>
                <label className="text-xs text-red-500 mb-1 block">Reason for rejection (required)</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Why are you rejecting this action?"
                  className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  autoFocus
                />
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                <CheckCircle className="w-4 h-4" />
                Approve
              </button>
              <button
                onClick={handleReject}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                <XCircle className="w-4 h-4" />
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// STATS BANNER
// ============================================================================

interface StatsBannerProps {
  stats: {
    totalAgents: number;
    activeAgents: number;
    pendingApprovals: number;
    tasksCompleted: number;
    totalCost: number;
    avgCostPerTask: number;
  };
}

const StatsBanner: React.FC<StatsBannerProps> = ({ stats }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
        <div className="text-3xl font-bold">{stats.totalAgents}</div>
        <div className="text-blue-100 text-sm">Total Agents</div>
      </div>
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
        <div className="text-3xl font-bold">{stats.activeAgents}</div>
        <div className="text-green-100 text-sm">Active</div>
      </div>
      <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-4 text-white">
        <div className="text-3xl font-bold">{stats.pendingApprovals}</div>
        <div className="text-orange-100 text-sm">Pending Approvals</div>
      </div>
      <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
        <div className="text-3xl font-bold">{stats.tasksCompleted}</div>
        <div className="text-purple-100 text-sm">Tasks Done</div>
      </div>
      <div className="bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-4 text-white">
        <div className="text-3xl font-bold">${stats.totalCost.toFixed(2)}</div>
        <div className="text-cyan-100 text-sm">Total Cost</div>
      </div>
      <div className="bg-gradient-to-br from-pink-500 to-pink-600 rounded-xl p-4 text-white">
        <div className="text-3xl font-bold">${stats.avgCostPerTask.toFixed(3)}</div>
        <div className="text-pink-100 text-sm">Avg/Task</div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const ApprovalWorkflow: React.FC = () => {
  const { agents, approvals, stats, loading, approve, reject } = useAgentManager();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [impactFilter, setImpactFilter] = useState<string>('all');
  const [userName, setUserName] = useState('');
  const [activeTab, setActiveTab] = useState<'approvals' | 'agents'>('approvals');

  // Sort approvals by impact and confidence (must be before early return to follow rules of hooks)
  const sortedApprovals = useMemo(() => {
    if (!approvals || approvals.length === 0) return [];
    
    const impactOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    let filtered = [...approvals];
    
    if (impactFilter !== 'all') {
      filtered = filtered.filter(a => a.impact === impactFilter);
    }
    
    return filtered.sort((a, b) => {
      const impactA = a.impact || 'medium';
      const impactB = b.impact || 'medium';
      const impactDiff = (impactOrder[impactA] ?? 2) - (impactOrder[impactB] ?? 2);
      if (impactDiff !== 0) return impactDiff;
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    });
  }, [approvals, impactFilter]);

  // Show loading state (after all hooks!)
  if (loading) {
    return (
      <div className="p-6 max-w-7xl mx-auto flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 text-violet-500 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700">Initializing Agent System...</h3>
          <p className="text-gray-500 mt-2">Loading agents and pending approvals</p>
        </div>
      </div>
    );
  }

  const handleApprove = async (id: string, feedback?: string) => {
    if (!userName.trim()) {
      alert('Please enter your name for the audit trail');
      return;
    }
    await approve(id, userName, feedback);
    setExpandedId(null);
  };

  const handleReject = async (id: string, reason: string) => {
    if (!userName.trim()) {
      alert('Please enter your name for the audit trail');
      return;
    }
    await reject(id, userName, reason);
    setExpandedId(null);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bot className="w-7 h-7 text-violet-600" />
          AI Agent Command Center
        </h1>
        <p className="text-gray-600 mt-1">
          Monitor agents, review actions requiring human oversight, and manage the autonomous workforce
        </p>
      </div>

      {/* Stats */}
      <StatsBanner stats={stats} />

      {/* User Name Input */}
      <div className="mb-6 flex items-center gap-4 bg-white p-4 rounded-lg border border-gray-200">
        <User className="w-5 h-5 text-gray-400" />
        <div className="flex-1">
          <label className="text-sm text-gray-500 mb-1 block">Your Name (for audit trail)</label>
          <input
            type="text"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder="Enter your name..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'approvals'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          Pending Approvals
          {approvals.length > 0 && (
            <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
              {approvals.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
            activeTab === 'agents'
              ? 'bg-violet-600 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          Agent Fleet
          <span className="px-2 py-0.5 bg-white/20 rounded-full text-xs">
            {agents.length}
          </span>
        </button>
      </div>

      {/* Approvals Tab */}
      {activeTab === 'approvals' && (
        <>
          {/* Impact Filter */}
          <div className="mb-4 flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-500">Filter by impact:</span>
            {['all', 'critical', 'high', 'medium', 'low'].map((level) => (
              <button
                key={level}
                onClick={() => setImpactFilter(level)}
                className={`px-3 py-1 rounded-full text-sm capitalize transition-colors ${
                  impactFilter === level
                    ? level === 'all' ? 'bg-gray-800 text-white' :
                      level === 'critical' ? 'bg-red-600 text-white' :
                      level === 'high' ? 'bg-orange-500 text-white' :
                      level === 'medium' ? 'bg-yellow-500 text-white' :
                      'bg-green-500 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {level}
              </button>
            ))}
          </div>

          {/* Approvals List */}
          <div className="space-y-4">
            {sortedApprovals.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
                <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-gray-700">All Clear!</h3>
                <p className="text-gray-500 mt-2">No pending approvals at this time</p>
              </div>
            ) : (
              sortedApprovals.map((request) => (
                <ApprovalCard
                  key={request.id}
                  request={request}
                  onApprove={(feedback) => handleApprove(request.id, feedback)}
                  onReject={(reason) => handleReject(request.id, reason)}
                  expanded={expandedId === request.id}
                  onToggleExpand={() => setExpandedId(expandedId === request.id ? null : request.id)}
                />
              ))
            )}
          </div>
        </>
      )}

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agents.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border border-gray-200">
              <Bot className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700">No Agents Running</h3>
              <p className="text-gray-500 mt-2">Start agents to begin autonomous monitoring</p>
            </div>
          ) : (
            agents.map((agent) => (
              <AgentCard key={agent.id} agent={agent} />
            ))
          )}
        </div>
      )}

      {/* Impact Guide */}
      <div className="mt-8 bg-gray-50 rounded-lg p-4 border border-gray-200">
        <h4 className="font-medium text-gray-700 mb-3">Impact Levels Guide</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-red-500"></span>
            <span><strong>Critical:</strong> Legal/public impact</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-orange-500"></span>
            <span><strong>High:</strong> Coalition notifications</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
            <span><strong>Medium:</strong> Evidence creation</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-green-500"></span>
            <span><strong>Low:</strong> Data capture</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApprovalWorkflow;
