/**
 * LoadManagerPanel - Adaptive Load Management UI
 * 
 * Visualizes:
 * - Current load level
 * - Queue status by priority
 * - Dead letter queue
 * - Shedding/backpressure status
 * 
 * ANTIFRAGILE: Load management prevents cascade failures
 */

import { useState } from 'react';
import {
  Gauge, AlertTriangle, CheckCircle, XCircle, RefreshCw,
  Trash2, ChevronDown, ChevronUp, X, Loader2, Zap,
  Clock, Package, AlertOctagon
} from 'lucide-react';
import { useLoadManager, LoadStats, DeadLetter, Priority } from '../../utils/adaptiveLoadManager';

// ============================================================================
// COMPACT BADGE
// ============================================================================

interface LoadBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function LoadBadge({ onClick, className = '' }: LoadBadgeProps) {
  const { stats } = useLoadManager();

  const colors = {
    idle: 'bg-gray-50 text-gray-600',
    light: 'bg-green-50 text-green-600',
    moderate: 'bg-blue-50 text-blue-600',
    heavy: 'bg-amber-50 text-amber-600',
    overloaded: 'bg-red-50 text-red-600 animate-pulse',
  };

  const icons = {
    idle: <CheckCircle className="w-3.5 h-3.5" />,
    light: <Gauge className="w-3.5 h-3.5" />,
    moderate: <Gauge className="w-3.5 h-3.5" />,
    heavy: <AlertTriangle className="w-3.5 h-3.5" />,
    overloaded: <AlertOctagon className="w-3.5 h-3.5" />,
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors hover:ring-2 hover:ring-offset-1 ${colors[stats.level]} ${className}`}
      title={`Load: ${stats.level} | Active: ${stats.activeOperations} | Queued: ${stats.queuedOperations}`}
    >
      {icons[stats.level]}
      <span className="text-xs font-medium capitalize">{stats.level}</span>
      {stats.queuedOperations > 0 && (
        <span className="text-xs opacity-70">({stats.queuedOperations})</span>
      )}
    </button>
  );
}

// ============================================================================
// FULL PANEL
// ============================================================================

interface LoadManagerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LoadManagerPanel({ isOpen, onClose }: LoadManagerPanelProps) {
  const { stats, deadLetters, retryDeadLetter, clearDeadLetters } = useLoadManager();
  const [showDeadLetters, setShowDeadLetters] = useState(false);

  if (!isOpen) return null;

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'idle': return 'text-gray-600 bg-gray-100';
      case 'light': return 'text-green-600 bg-green-100';
      case 'moderate': return 'text-blue-600 bg-blue-100';
      case 'heavy': return 'text-amber-600 bg-amber-100';
      case 'overloaded': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case 'critical': return 'text-red-700 bg-red-100';
      case 'high': return 'text-orange-700 bg-orange-100';
      case 'normal': return 'text-blue-700 bg-blue-100';
      case 'low': return 'text-gray-700 bg-gray-100';
      case 'background': return 'text-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Gauge className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Adaptive Load Manager</h3>
              <p className="text-xs text-orange-100">Load shedding & backpressure control</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Current Load Level */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gradient-to-r from-gray-50 to-white">
            <div className="flex items-center justify-between mb-4">
              <span className="font-medium text-gray-800">Current Load Level</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${getLevelColor(stats.level)}`}>
                {stats.level.toUpperCase()}
              </span>
            </div>

            {/* Visual Load Meter */}
            <div className="h-4 bg-gray-100 rounded-full overflow-hidden mb-3">
              <div 
                className={`h-full transition-all duration-500 ${
                  stats.level === 'idle' ? 'bg-gray-300' :
                  stats.level === 'light' ? 'bg-green-500' :
                  stats.level === 'moderate' ? 'bg-blue-500' :
                  stats.level === 'heavy' ? 'bg-amber-500' :
                  'bg-red-500'
                }`}
                style={{ 
                  width: stats.level === 'idle' ? '5%' :
                         stats.level === 'light' ? '25%' :
                         stats.level === 'moderate' ? '50%' :
                         stats.level === 'heavy' ? '75%' : '100%'
                }}
              />
            </div>

            {/* Status Indicators */}
            <div className="grid grid-cols-2 gap-3">
              {stats.sheddingActive && (
                <div className="flex items-center gap-2 p-2 bg-amber-50 rounded-lg border border-amber-200">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-medium text-amber-700">Load Shedding Active</span>
                </div>
              )}
              {stats.backpressureMs > 0 && (
                <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-medium text-blue-700">Backpressure: {stats.backpressureMs}ms</span>
                </div>
              )}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 bg-blue-50 rounded-xl text-center">
              <Loader2 className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-blue-700">{stats.activeOperations}</div>
              <div className="text-xs text-blue-600">Active</div>
            </div>
            <div className="p-3 bg-amber-50 rounded-xl text-center">
              <Package className="w-5 h-5 text-amber-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-amber-700">{stats.queuedOperations}</div>
              <div className="text-xs text-amber-600">Queued</div>
            </div>
            <div className="p-3 bg-green-50 rounded-xl text-center">
              <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-green-700">{stats.completedLast60s}</div>
              <div className="text-xs text-green-600">Completed/m</div>
            </div>
            <div className="p-3 bg-red-50 rounded-xl text-center">
              <XCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
              <div className="text-xl font-bold text-red-700">{stats.failedLast60s}</div>
              <div className="text-xs text-red-600">Failed/m</div>
            </div>
          </div>

          {/* Average Latency */}
          <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium">Average Latency</span>
            </div>
            <span className="text-lg font-bold text-purple-700">{stats.averageLatency}ms</span>
          </div>

          {/* Dead Letter Queue */}
          {deadLetters.length > 0 && (
            <div className="border border-red-200 rounded-xl overflow-hidden">
              <button
                onClick={() => setShowDeadLetters(!showDeadLetters)}
                className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  <span className="text-sm font-medium text-red-800">
                    Dead Letter Queue ({deadLetters.length})
                  </span>
                </div>
                {showDeadLetters ? (
                  <ChevronUp className="w-4 h-4 text-red-600" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-red-600" />
                )}
              </button>

              {showDeadLetters && (
                <div className="p-3 bg-white space-y-2 max-h-48 overflow-auto">
                  {deadLetters.slice(-10).map((dl) => (
                    <div key={dl.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`px-1.5 py-0.5 text-xs rounded ${getPriorityColor(dl.operation.priority)}`}>
                            {dl.operation.priority}
                          </span>
                          <span className="text-sm font-medium truncate">{dl.operation.name}</span>
                        </div>
                        <div className="text-xs text-red-600 truncate">{dl.error}</div>
                      </div>
                      {dl.canRetry && (
                        <button
                          onClick={() => retryDeadLetter(dl.id)}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Retry"
                        >
                          <RefreshCw className="w-3.5 h-3.5 text-gray-600" />
                        </button>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={clearDeadLetters}
                    className="w-full flex items-center justify-center gap-2 p-2 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear All Dead Letters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between items-center">
          <div className="text-xs text-gray-500">
            Load shedding protects critical operations
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoadManagerPanel;
