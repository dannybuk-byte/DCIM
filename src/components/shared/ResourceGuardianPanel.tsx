/**
 * ResourceGuardianPanel - Resource Protection UI
 * 
 * Visual monitoring of system resources:
 * 1. Storage quota usage
 * 2. Memory pressure
 * 3. Long task detection
 * 4. Frozen UI detection
 * 
 * ANTIFRAGILE: Last line of defense visualization
 */

import { useState, useEffect } from 'react';
import {
  HardDrive, Cpu, Timer, AlertTriangle, CheckCircle,
  XCircle, Eye, EyeOff, Trash2, RefreshCw, Activity,
  ChevronDown, ChevronUp, X
} from 'lucide-react';
import { useResourceGuardian, ResourceAlert } from '../../utils/resourceGuardian';

// ============================================================================
// COMPACT BADGE
// ============================================================================

interface ResourceBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function ResourceBadge({ onClick, className = '' }: ResourceBadgeProps) {
  const { state, lastAlert } = useResourceGuardian();

  // Determine overall status
  const statuses = [
    state.storage.status,
    state.memory.status,
    state.watchdog.frozen ? 'critical' : 'healthy',
  ];
  
  const hasCritical = statuses.includes('critical');
  const hasWarning = statuses.includes('warning');
  
  const overallStatus = hasCritical ? 'critical' : hasWarning ? 'warning' : 'healthy';

  const colors = {
    healthy: 'bg-green-50 text-green-700 hover:bg-green-100',
    warning: 'bg-amber-50 text-amber-700 hover:bg-amber-100',
    critical: 'bg-red-50 text-red-700 hover:bg-red-100 animate-pulse',
    unknown: 'bg-gray-50 text-gray-700 hover:bg-gray-100',
  };

  const icons = {
    healthy: <CheckCircle className="w-3.5 h-3.5" />,
    warning: <AlertTriangle className="w-3.5 h-3.5" />,
    critical: <XCircle className="w-3.5 h-3.5" />,
    unknown: <Activity className="w-3.5 h-3.5" />,
  };

  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${colors[overallStatus]} ${className}`}
      title={`Resources: ${overallStatus} | Storage: ${Math.round(state.storage.percentUsed * 100)}% | Memory: ${Math.round(state.memory.percentUsed * 100)}%`}
    >
      {icons[overallStatus]}
      <span className="text-xs font-medium capitalize">{overallStatus}</span>
    </button>
  );
}

// ============================================================================
// ALERT TOAST
// ============================================================================

interface ResourceAlertToastProps {
  alert: ResourceAlert;
  onDismiss: () => void;
}

export function ResourceAlertToast({ alert, onDismiss }: ResourceAlertToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 8000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const colors = {
    critical: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    critical: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
    info: <CheckCircle className="w-5 h-5 text-blue-500" />,
  };

  return (
    <div className={`fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4`}>
      <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${colors[alert.severity]}`}>
        {icons[alert.severity]}
        <div>
          <div className="text-sm font-medium">Resource Alert</div>
          <div className="text-xs opacity-80">{alert.message}</div>
        </div>
        <button onClick={onDismiss} className="p-1 hover:bg-white/50 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// FULL PANEL
// ============================================================================

interface ResourceGuardianPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ResourceGuardianPanel({ isOpen, onClose }: ResourceGuardianPanelProps) {
  const { state, alerts, requestGC, clearOldData } = useResourceGuardian();
  const [showAlerts, setShowAlerts] = useState(false);

  if (!isOpen) return null;

  const formatPercent = (value: number) => `${Math.round(value * 100)}%`;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'warning': return 'text-amber-600 bg-amber-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-cyan-600 to-teal-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Resource Guardian</h3>
              <p className="text-xs text-cyan-100">System resource monitoring</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Storage */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-cyan-600" />
                <span className="font-medium">Storage</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(state.storage.status)}`}>
                {state.storage.status}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Used</span>
                <span className="font-medium">{formatBytes(state.storage.usedBytes)}</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    state.storage.percentUsed > 0.9 ? 'bg-red-500' :
                    state.storage.percentUsed > 0.7 ? 'bg-amber-500' : 'bg-cyan-500'
                  }`}
                  style={{ width: `${state.storage.percentUsed * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatPercent(state.storage.percentUsed)} used</span>
                <span>Quota: {formatBytes(state.storage.quotaBytes)}</span>
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-600" />
                <span className="font-medium">Memory</span>
              </div>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(state.memory.status)}`}>
                {state.memory.status}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">JS Heap</span>
                <span className="font-medium">{state.memory.usedMB}MB / {state.memory.limitMB}MB</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    state.memory.percentUsed > 0.85 ? 'bg-red-500' :
                    state.memory.percentUsed > 0.7 ? 'bg-amber-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${state.memory.percentUsed * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>{formatPercent(state.memory.percentUsed)} used</span>
                <span>Pressure: {state.memory.pressure}</span>
              </div>
            </div>
          </div>

          {/* Performance Stats */}
          <div className="grid grid-cols-2 gap-4">
            {/* Long Tasks */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                <Timer className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium">Long Tasks</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">{state.longTasks.count}</div>
              <div className="text-xs text-gray-500">
                Worst: {Math.round(state.longTasks.worstTask)}ms
              </div>
            </div>

            {/* Visibility */}
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 mb-2">
                {state.visibility.visible ? (
                  <Eye className="w-4 h-4 text-green-600" />
                ) : (
                  <EyeOff className="w-4 h-4 text-gray-400" />
                )}
                <span className="text-sm font-medium">Tab Status</span>
              </div>
              <div className="text-2xl font-bold text-gray-800">
                {state.visibility.visible ? 'Active' : 'Hidden'}
              </div>
              <div className="text-xs text-gray-500">
                Hidden time: {Math.round(state.visibility.totalHiddenTime / 1000)}s total
              </div>
            </div>
          </div>

          {/* Watchdog Status */}
          <div className={`p-4 rounded-xl border ${state.watchdog.frozen ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className={`w-4 h-4 ${state.watchdog.frozen ? 'text-red-600' : 'text-green-600'}`} />
                <span className="text-sm font-medium">UI Responsiveness</span>
              </div>
              {state.watchdog.frozen ? (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium animate-pulse">
                  FROZEN
                </span>
              ) : (
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                  Responsive
                </span>
              )}
            </div>
            {state.watchdog.unresponsiveCount > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                Freeze events: {state.watchdog.unresponsiveCount}
              </div>
            )}
          </div>

          {/* Alerts Section */}
          {alerts.length > 0 && (
            <div>
              <button
                onClick={() => setShowAlerts(!showAlerts)}
                className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2"
              >
                {showAlerts ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Recent Alerts ({alerts.length})
              </button>
              {showAlerts && (
                <div className="space-y-2 max-h-40 overflow-auto">
                  {alerts.slice(-10).reverse().map((alert, i) => (
                    <div key={i} className={`p-2 rounded text-xs ${
                      alert.severity === 'critical' ? 'bg-red-50 text-red-700' :
                      alert.severity === 'warning' ? 'bg-amber-50 text-amber-700' :
                      'bg-blue-50 text-blue-700'
                    }`}>
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => requestGC()}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Request GC
            </button>
            <button
              onClick={() => clearOldData(30)}
              className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              Clear Old Data
            </button>
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

// Helper function
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

export default ResourceGuardianPanel;
