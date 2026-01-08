/**
 * Real-time Agent Activity Feed
 * 
 * Shows live updates from all agents in a scrolling timeline.
 * Displays tasks, discoveries, alerts, and system events.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  Zap,
  Shield,
  DollarSign,
  Network,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  Pause,
  Play,
  RefreshCw,
} from 'lucide-react';

interface ActivityItem {
  id: string;
  timestamp: number;
  agentType: 'anomaly' | 'compliance' | 'subsidy' | 'network' | 'ownership' | 'system';
  type: 'task_start' | 'task_complete' | 'discovery' | 'alert' | 'error' | 'approval' | 'info';
  title: string;
  detail?: string;
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'info';
}

// Demo activity data generator
function generateDemoActivities(): ActivityItem[] {
  const now = Date.now();
  return [
    {
      id: '1',
      timestamp: now - 5000,
      agentType: 'anomaly',
      type: 'discovery',
      title: 'BGP path anomaly detected for AS16509',
      detail: 'AWS prefix 52.94.0.0/16 showing unusual upstream changes',
      severity: 'medium',
    },
    {
      id: '2',
      timestamp: now - 15000,
      agentType: 'compliance',
      type: 'alert',
      title: 'Job creation deadline approaching',
      detail: 'Meta Prineville: 45 days until compliance deadline',
      severity: 'high',
    },
    {
      id: '3',
      timestamp: now - 30000,
      agentType: 'ownership',
      type: 'task_start',
      title: 'Analyzing corporate structure',
      detail: 'Scanning Switch Inc subsidiaries in Delaware registry',
    },
    {
      id: '4',
      timestamp: now - 45000,
      agentType: 'subsidy',
      type: 'task_complete',
      title: 'Subsidy analysis complete',
      detail: 'Found 3 facilities with clawback eligibility totaling $47.2M',
      severity: 'info',
    },
    {
      id: '5',
      timestamp: now - 60000,
      agentType: 'anomaly',
      type: 'discovery',
      title: 'CT log spike detected',
      detail: 'Google Cloud issued 47 certificates in last hour for *.cloud.google.com',
      severity: 'low',
    },
    {
      id: '6',
      timestamp: now - 90000,
      agentType: 'compliance',
      type: 'approval',
      title: 'Awaiting approval for public report',
      detail: 'Meta Prineville accountability report ready for release',
      severity: 'critical',
    },
    {
      id: '7',
      timestamp: now - 120000,
      agentType: 'network',
      type: 'info',
      title: 'Network topology scan started',
      detail: 'Mapping interconnections between hyperscale operators',
    },
    {
      id: '8',
      timestamp: now - 180000,
      agentType: 'system',
      type: 'info',
      title: 'Agent fleet initialized',
      detail: '4 agents active, 0 pending tasks',
    },
  ];
}

const agentIcons: Record<string, React.ReactNode> = {
  anomaly: <Zap className="w-4 h-4 text-yellow-500" />,
  compliance: <Shield className="w-4 h-4 text-blue-500" />,
  subsidy: <DollarSign className="w-4 h-4 text-green-500" />,
  network: <Network className="w-4 h-4 text-purple-500" />,
  ownership: <Target className="w-4 h-4 text-orange-500" />,
  system: <Activity className="w-4 h-4 text-gray-500" />,
};

const typeStyles: Record<string, { bg: string; icon: React.ReactNode }> = {
  discovery: { bg: 'bg-blue-50 border-blue-200', icon: <Target className="w-4 h-4 text-blue-500" /> },
  alert: { bg: 'bg-red-50 border-red-200', icon: <AlertTriangle className="w-4 h-4 text-red-500" /> },
  task_start: { bg: 'bg-gray-50 border-gray-200', icon: <Clock className="w-4 h-4 text-gray-500" /> },
  task_complete: { bg: 'bg-green-50 border-green-200', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
  error: { bg: 'bg-red-50 border-red-300', icon: <AlertTriangle className="w-4 h-4 text-red-600" /> },
  approval: { bg: 'bg-orange-50 border-orange-200', icon: <Shield className="w-4 h-4 text-orange-500" /> },
  info: { bg: 'bg-gray-50 border-gray-200', icon: <Activity className="w-4 h-4 text-gray-500" /> },
};

interface AgentActivityFeedProps {
  maxItems?: number;
  compact?: boolean;
}

export const AgentActivityFeed: React.FC<AgentActivityFeedProps> = ({ 
  maxItems = 10,
  compact = false,
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<string>('all');
  const feedRef = useRef<HTMLDivElement>(null);

  // Initialize with demo data
  useEffect(() => {
    setActivities(generateDemoActivities());
  }, []);

  // Simulate live updates
  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const newActivity: ActivityItem = {
        id: `${Date.now()}`,
        timestamp: Date.now(),
        agentType: ['anomaly', 'compliance', 'subsidy', 'network', 'ownership'][Math.floor(Math.random() * 5)] as ActivityItem['agentType'],
        type: ['discovery', 'task_complete', 'info', 'alert'][Math.floor(Math.random() * 4)] as ActivityItem['type'],
        title: [
          'BGP prefix stability check complete',
          'Certificate transparency scan finished',
          'Workforce data updated from BLS',
          'Subsidy deadline reminder triggered',
          'Corporate filing processed',
        ][Math.floor(Math.random() * 5)],
        detail: [
          'No anomalies detected',
          '3 new certificates found',
          'Q3 2025 data integrated',
          '30 days remaining for compliance',
          'SEC 10-K filing analyzed',
        ][Math.floor(Math.random() * 5)],
        severity: ['low', 'medium', 'info'][Math.floor(Math.random() * 3)] as ActivityItem['severity'],
      };

      setActivities(prev => [newActivity, ...prev].slice(0, maxItems));
    }, 8000 + Math.random() * 7000); // Random interval 8-15 seconds

    return () => clearInterval(interval);
  }, [isPaused, maxItems]);

  const filteredActivities = filter === 'all' 
    ? activities 
    : activities.filter(a => a.agentType === filter);

  const formatTime = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  return (
    <div className={`bg-white rounded-lg border border-gray-200 ${compact ? 'p-3' : 'p-4'}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className={`font-semibold text-gray-900 flex items-center gap-2 ${compact ? 'text-sm' : ''}`}>
          <Activity className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} text-violet-600`} />
          Live Activity
          {!isPaused && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
              Live
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Filter */}
      {!compact && (
        <div className="flex gap-1 mb-3 flex-wrap">
          {['all', 'anomaly', 'compliance', 'subsidy', 'ownership'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs rounded capitalize ${
                filter === f
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Feed */}
      <div 
        ref={feedRef}
        className={`space-y-2 ${compact ? 'max-h-[200px]' : 'max-h-[400px]'} overflow-y-auto`}
      >
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          filteredActivities.map((activity) => {
            const style = typeStyles[activity.type] || typeStyles.info;
            return (
              <div
                key={activity.id}
                className={`p-2 rounded-lg border ${style.bg} ${compact ? 'text-xs' : 'text-sm'}`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-shrink-0 mt-0.5">
                    {agentIcons[activity.agentType]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 truncate">
                        {activity.title}
                      </span>
                      {activity.severity && activity.severity !== 'info' && (
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                          activity.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          activity.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          activity.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-green-100 text-green-700'
                        }`}>
                          {activity.severity}
                        </span>
                      )}
                    </div>
                    {activity.detail && !compact && (
                      <p className="text-gray-500 mt-0.5 truncate">{activity.detail}</p>
                    )}
                    <p className="text-gray-400 text-[10px] mt-1">{formatTime(activity.timestamp)}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AgentActivityFeed;
