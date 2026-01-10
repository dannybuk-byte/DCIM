/**
 * ActionHistoryPanel - Visual Audit Log
 * 
 * Displays recent actions in a timeline format.
 * Helps users understand what happened and debug issues.
 * 
 * ANTIFRAGILE: Read-only display, transparent logging
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  History, Clock, ChevronDown, ChevronUp, X,
  Navigation, Database, Download, Upload, Search,
  Filter, Settings, AlertTriangle, RefreshCw, Cpu,
  Trash2, FileJson, CheckCircle, XCircle
} from 'lucide-react';
import {
  getRecentActions,
  getStats,
  clearHistory,
  exportHistory,
  formatRelativeTime,
  ActionEntry,
  ActionCategory,
  ActionStats,
} from '../../utils/actionHistory';

// ============================================================================
// CATEGORY ICONS
// ============================================================================

const CATEGORY_ICONS: Record<ActionCategory, React.ReactNode> = {
  navigation: <Navigation className="w-3.5 h-3.5" />,
  data: <Database className="w-3.5 h-3.5" />,
  export: <Download className="w-3.5 h-3.5" />,
  import: <Upload className="w-3.5 h-3.5" />,
  search: <Search className="w-3.5 h-3.5" />,
  filter: <Filter className="w-3.5 h-3.5" />,
  settings: <Settings className="w-3.5 h-3.5" />,
  error: <AlertTriangle className="w-3.5 h-3.5" />,
  recovery: <RefreshCw className="w-3.5 h-3.5" />,
  system: <Cpu className="w-3.5 h-3.5" />,
};

const CATEGORY_COLORS: Record<ActionCategory, string> = {
  navigation: 'bg-blue-100 text-blue-600',
  data: 'bg-indigo-100 text-indigo-600',
  export: 'bg-green-100 text-green-600',
  import: 'bg-purple-100 text-purple-600',
  search: 'bg-cyan-100 text-cyan-600',
  filter: 'bg-amber-100 text-amber-600',
  settings: 'bg-gray-100 text-gray-600',
  error: 'bg-red-100 text-red-600',
  recovery: 'bg-emerald-100 text-emerald-600',
  system: 'bg-slate-100 text-slate-600',
};

// ============================================================================
// ACTION ITEM COMPONENT
// ============================================================================

interface ActionItemProps {
  action: ActionEntry;
  showDetails?: boolean;
}

function ActionItem({ action, showDetails = false }: ActionItemProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div 
      className={`border-l-2 pl-3 py-2 ${
        action.success 
          ? 'border-gray-200 hover:border-gray-400' 
          : 'border-red-300 hover:border-red-500'
      } transition-colors`}
    >
      <div className="flex items-start gap-2">
        {/* Category icon */}
        <div className={`p-1 rounded ${CATEGORY_COLORS[action.category]} flex-shrink-0`}>
          {CATEGORY_ICONS[action.category]}
        </div>

        {/* Action content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-800 truncate">{action.action}</span>
            {!action.success && (
              <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-3 h-3" />
            <span>{formatRelativeTime(action.timestamp)}</span>
            {action.duration && (
              <span className="text-gray-300">• {action.duration}ms</span>
            )}
          </div>
        </div>

        {/* Expand button for details */}
        {showDetails && action.details && Object.keys(action.details).length > 0 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 rounded"
          >
            {expanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
            )}
          </button>
        )}
      </div>

      {/* Expanded details */}
      {expanded && action.details && (
        <div className="mt-2 ml-7 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 overflow-x-auto">
          <pre>{JSON.stringify(action.details, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// STATS CARD
// ============================================================================

interface StatsCardProps {
  stats: ActionStats;
}

function StatsCard({ stats }: StatsCardProps) {
  const sessionDuration = useMemo(() => {
    const ms = Date.now() - stats.sessionStart;
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
  }, [stats.sessionStart]);

  return (
    <div className="grid grid-cols-4 gap-2 p-3 bg-gray-50 rounded-lg">
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-800">{stats.totalActions}</div>
        <div className="text-xs text-gray-500">Actions</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-800">{sessionDuration}</div>
        <div className="text-xs text-gray-500">Session</div>
      </div>
      <div className="text-center">
        <div className={`text-lg font-semibold ${stats.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}>
          {stats.errorCount}
        </div>
        <div className="text-xs text-gray-500">Errors</div>
      </div>
      <div className="text-center">
        <div className="text-lg font-semibold text-gray-800">
          {stats.avgDuration > 0 ? `${stats.avgDuration}ms` : '—'}
        </div>
        <div className="text-xs text-gray-500">Avg Time</div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN PANEL COMPONENT
// ============================================================================

interface ActionHistoryPanelProps {
  variant?: 'full' | 'compact' | 'minimal';
  maxItems?: number;
  showStats?: boolean;
  showDetails?: boolean;
  className?: string;
}

export function ActionHistoryPanel({
  variant = 'compact',
  maxItems = 20,
  showStats = true,
  showDetails = true,
  className = '',
}: ActionHistoryPanelProps) {
  const [actions, setActions] = useState<ActionEntry[]>([]);
  const [stats, setStats] = useState<ActionStats | null>(null);
  const [filter, setFilter] = useState<ActionCategory | 'all'>('all');
  const [isExpanded, setIsExpanded] = useState(variant === 'full');

  // Load actions
  const loadActions = useCallback(() => {
    const recent = getRecentActions(maxItems);
    setActions(recent);
    if (showStats) {
      setStats(getStats());
    }
  }, [maxItems, showStats]);

  // Initial load and refresh interval
  useEffect(() => {
    loadActions();
    
    // Refresh every 5 seconds
    const interval = setInterval(loadActions, 5000);
    return () => clearInterval(interval);
  }, [loadActions]);

  // Filter actions
  const filteredActions = useMemo(() => {
    if (filter === 'all') return actions;
    return actions.filter(a => a.category === filter);
  }, [actions, filter]);

  // Handle clear
  const handleClear = useCallback(() => {
    if (confirm('Clear all action history? This cannot be undone.')) {
      clearHistory();
      loadActions();
    }
  }, [loadActions]);

  // Handle export
  const handleExport = useCallback(() => {
    const json = exportHistory();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `action-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Minimal variant
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 text-xs text-gray-500 ${className}`}>
        <History className="w-3.5 h-3.5" />
        <span>{actions.length} actions</span>
        {stats && stats.errorCount > 0 && (
          <span className="text-red-500">({stats.errorCount} errors)</span>
        )}
      </div>
    );
  }

  // Compact variant (collapsible)
  if (variant === 'compact' && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
      >
        <History className="w-4 h-4 text-gray-500" />
        <span className="text-sm text-gray-600">Action History</span>
        <span className="text-xs text-gray-400">({actions.length})</span>
        <ChevronDown className="w-4 h-4 text-gray-400" />
      </button>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-100 rounded-lg">
            <History className="w-4 h-4 text-blue-600" />
          </div>
          <div>
            <h4 className="font-medium text-gray-800">Action History</h4>
            <p className="text-xs text-gray-500">{actions.length} recent actions</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleExport}
            className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            title="Export history"
          >
            <FileJson className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={handleClear}
            className="p-1.5 hover:bg-red-100 rounded-lg transition-colors"
            title="Clear history"
          >
            <Trash2 className="w-4 h-4 text-gray-500 hover:text-red-500" />
          </button>
          {variant === 'compact' && (
            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      {showStats && stats && (
        <div className="p-3 border-b border-gray-100">
          <StatsCard stats={stats} />
        </div>
      )}

      {/* Filter tabs */}
      <div className="px-3 py-2 border-b border-gray-100 flex gap-1 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            filter === 'all' 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-500 hover:bg-gray-100'
          }`}
        >
          All
        </button>
        {(['navigation', 'data', 'search', 'error'] as ActionCategory[]).map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`px-2 py-1 text-xs rounded transition-colors capitalize ${
              filter === cat 
                ? CATEGORY_COLORS[cat]
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Actions list */}
      <div className="max-h-64 overflow-y-auto">
        {filteredActions.length === 0 ? (
          <div className="p-6 text-center text-gray-400 text-sm">
            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No actions recorded yet
          </div>
        ) : (
          <div className="p-3 space-y-1">
            {filteredActions.map(action => (
              <ActionItem 
                key={action.id} 
                action={action} 
                showDetails={showDetails}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-3 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-400 flex items-center justify-between">
        <span>Auto-refreshes every 5s</span>
        <span>
          <CheckCircle className="w-3 h-3 inline mr-1 text-green-500" />
          Audit logging active
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// FLOATING BUTTON
// ============================================================================

export function ActionHistoryButton({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const checkErrors = () => {
      const stats = getStats();
      setErrorCount(stats.errorCount);
    };
    checkErrors();
    const interval = setInterval(checkErrors, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`relative p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
        title="Action History"
      >
        <History className="w-5 h-5 text-gray-500" />
        {errorCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
            {errorCount > 9 ? '9+' : errorCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="max-w-lg w-full mx-4">
            <ActionHistoryPanel 
              variant="full" 
              maxItems={50}
              showStats={true}
              showDetails={true}
            />
            <button
              onClick={() => setIsOpen(false)}
              className="mt-3 w-full py-2 bg-white hover:bg-gray-50 rounded-lg text-sm text-gray-600 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

export default ActionHistoryPanel;
