/**
 * AI Agent Hub - Unified Dashboard for All AI Agent Features
 * 
 * Central hub combining all TWIML-inspired AI agent capabilities:
 * - Agent Command Center (monitoring & approvals)
 * - Evidence Capture (FRE 902(14) compliance)
 * - Knowledge Graph Explorer (corporate ownership mapping)
 * - Evidence Triangulation (cross-source verification)
 */

import React, { useState } from 'react';
import {
  Bot,
  Shield,
  Network,
  Target,
  CheckCircle,
  AlertTriangle,
  Activity,
  ChevronRight,
  Users,
  FileText,
  Lock,
  Zap,
} from 'lucide-react';

// Import all the AI agent components
import { ApprovalWorkflow } from './ApprovalWorkflow';
import { EvidenceCapture } from './EvidenceCapture';
import { KnowledgeGraphExplorer } from './KnowledgeGraphExplorer';
import { TriangulationDashboard } from './TriangulationDashboard';
import { AgentActivityFeed } from './AgentActivityFeed';
import { TaskSubmitter } from './TaskSubmitter';
import { SystemHealthIndicator } from './SystemHealthIndicator';
import { AgentTraining } from './AgentTraining';
import { CollaborationHub } from './CollaborationHub';
import { useAgentManager } from '../services/agentManager';

// ============================================================================
// TYPES
// ============================================================================

type HubTab = 'command' | 'evidence' | 'graph' | 'triangulation' | 'training' | 'collaboration';

// ============================================================================
// TAB NAVIGATION COMPONENT
// ============================================================================

interface TabNavProps {
  activeTab: HubTab;
  onTabChange: (tab: HubTab) => void;
  stats: {
    agents: number;
    approvals: number;
    evidence: number;
    entities: number;
    triangulations: number;
  };
}

const TabNav: React.FC<TabNavProps> = ({ activeTab, onTabChange, stats }) => {
  const tabs: { id: HubTab; label: string; icon: React.ReactNode; badge?: number; description: string }[] = [
    {
      id: 'command',
      label: 'Agent Command',
      icon: <Bot className="w-5 h-5" />,
      badge: stats.approvals,
      description: 'Monitor agents & approvals',
    },
    {
      id: 'evidence',
      label: 'Evidence Chain',
      icon: <Shield className="w-5 h-5" />,
      badge: stats.evidence,
      description: 'FRE 902(14) capture',
    },
    {
      id: 'graph',
      label: 'Knowledge Graph',
      icon: <Network className="w-5 h-5" />,
      badge: stats.entities,
      description: 'Corporate ownership',
    },
    {
      id: 'triangulation',
      label: 'Triangulation',
      icon: <Target className="w-5 h-5" />,
      badge: stats.triangulations,
      description: 'Cross-source verification',
    },
    {
      id: 'training',
      label: 'Agent Training',
      icon: <Zap className="w-5 h-5" />,
      description: 'Tune detection thresholds',
    },
    {
      id: 'collaboration',
      label: 'Collaboration',
      icon: <Users className="w-5 h-5" />,
      description: 'Team task management',
    },
  ];

  return (
    <div className="bg-gray-900 border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center gap-2 py-3 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {tab.icon}
              <div className="text-left">
                <div className="font-medium">{tab.label}</div>
                <div className={`text-xs ${activeTab === tab.id ? 'text-violet-200' : 'text-gray-500'}`}>
                  {tab.description}
                </div>
              </div>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-violet-600 text-white'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// QUICK ACTIONS COMPONENT
// ============================================================================

interface QuickActionsProps {
  onNavigate: (tab: HubTab) => void;
}

const QuickActions: React.FC<QuickActionsProps> = ({ onNavigate }) => {
  const actions = [
    {
      icon: <AlertTriangle className="w-6 h-6 text-orange-500" />,
      title: 'Review Pending Approvals',
      description: 'Agent actions awaiting your decision',
      tab: 'command' as HubTab,
      color: 'border-orange-200 bg-orange-50',
    },
    {
      icon: <Lock className="w-6 h-6 text-blue-500" />,
      title: 'Capture Evidence',
      description: 'Create court-ready documentation',
      tab: 'evidence' as HubTab,
      color: 'border-blue-200 bg-blue-50',
    },
    {
      icon: <Users className="w-6 h-6 text-purple-500" />,
      title: 'Map Ownership',
      description: 'Trace corporate structures',
      tab: 'graph' as HubTab,
      color: 'border-purple-200 bg-purple-50',
    },
    {
      icon: <CheckCircle className="w-6 h-6 text-green-500" />,
      title: 'Verify Claims',
      description: 'Cross-reference data sources',
      tab: 'triangulation' as HubTab,
      color: 'border-green-200 bg-green-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gray-50 border-b border-gray-200">
      {actions.map((action) => (
        <button
          key={action.tab}
          onClick={() => onNavigate(action.tab)}
          className={`p-4 rounded-lg border ${action.color} text-left hover:shadow-md transition-shadow`}
        >
          <div className="flex items-start gap-3">
            {action.icon}
            <div>
              <h4 className="font-medium text-gray-900">{action.title}</h4>
              <p className="text-xs text-gray-500 mt-1">{action.description}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const AIAgentHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<HubTab>('command');
  const { agents, approvals, stats } = useAgentManager();
  
  // Mock stats for evidence and graph (would come from hooks in production)
  const hubStats = {
    agents: agents.length,
    approvals: approvals.length,
    evidence: 0, // Would come from useLegalEvidence
    entities: 0, // Would come from useKnowledgeGraph
    triangulations: 0, // Would come from useEvidenceTriangulation
  };

  return (
    <div className="min-h-full bg-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white px-6 py-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Bot className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">AI Agent Hub</h1>
              <p className="text-violet-200 mt-1">
                Autonomous intelligence for labor organizing • TWIML-inspired architecture
              </p>
            </div>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">{stats.totalAgents}</div>
              <div className="text-violet-200 text-sm">Active Agents</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">{stats.pendingApprovals}</div>
              <div className="text-violet-200 text-sm">Pending Approvals</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">{stats.tasksCompleted}</div>
              <div className="text-violet-200 text-sm">Tasks Completed</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <div className="text-3xl font-bold">${stats.totalCost.toFixed(2)}</div>
              <div className="text-violet-200 text-sm">Total Cost</div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <SystemHealthIndicator compact />
              <div className="text-violet-200 text-sm mt-1">System Status</div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <TabNav activeTab={activeTab} onTabChange={setActiveTab} stats={hubStats} />

      {/* Quick Actions (shown on command tab) */}
      {activeTab === 'command' && <QuickActions onNavigate={setActiveTab} />}

      {/* Content */}
      <div className="bg-gray-100 min-h-[600px]">
        {activeTab === 'command' && (
          <div className="flex">
            <div className="flex-1">
              <ApprovalWorkflow />
            </div>
            {/* Activity Feed Sidebar */}
            <div className="w-80 p-4 border-l border-gray-200 bg-white space-y-4">
              <TaskSubmitter />
              <AgentActivityFeed maxItems={12} />
            </div>
          </div>
        )}
        {activeTab === 'evidence' && <EvidenceCapture />}
        {activeTab === 'graph' && <KnowledgeGraphExplorer />}
        {activeTab === 'triangulation' && <TriangulationDashboard />}
        {activeTab === 'training' && <AgentTraining />}
        {activeTab === 'collaboration' && <CollaborationHub />}
      </div>

      {/* Footer */}
      <div className="bg-gray-900 text-gray-400 px-6 py-4 text-center text-xs">
        <p>
          Built with insights from TWIML AI Podcast • Episode #741: Wordware • Episode #756: Yutori • Episode #720: A2A & MCP
        </p>
        <p className="mt-1">
          Evidence capture compliant with FRE 902(14) • Knowledge graph powered by IndexedDB triple store
        </p>
      </div>
    </div>
  );
};

export default AIAgentHub;
