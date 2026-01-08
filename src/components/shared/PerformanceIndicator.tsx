/**
 * PerformanceIndicator - Visual Performance Feedback
 * 
 * Shows performance status:
 * 1. Compact indicator in footer
 * 2. Slow operation alerts
 * 3. Performance stats panel
 * 
 * ANTIFRAGILE: Users understand system behavior
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Activity, AlertTriangle, CheckCircle, Zap, Clock,
  TrendingUp, TrendingDown, X, ChevronDown, ChevronUp,
  Database, Globe, Cpu, Filter, Search, FileDown, Loader2
} from 'lucide-react';
import {
  usePerformance,
  formatDuration,
  getPerformanceGrade,
  getOptimizationSuggestions,
  OperationType
} from '../../utils/performanceMonitor';

// ============================================================================
// SLOW OPERATION TOAST
// ============================================================================

interface SlowOperationToastProps {
  operation: {
    name: string;
    type: OperationType;
    duration?: number;
  };
  onDismiss: () => void;
}

export function SlowOperationToast({ operation, onDismiss }: SlowOperationToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg shadow-lg">
        <div className="p-1.5 bg-amber-100 rounded-full">
          <Clock className="w-4 h-4 text-amber-600" />
        </div>
        <div>
          <div className="text-sm font-medium">Slow Operation</div>
          <div className="text-xs text-amber-600">
            {operation.name} took {formatDuration(operation.duration || 0)}
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-amber-200 rounded transition-colors ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// COMPACT PERFORMANCE BADGE
// ============================================================================

interface PerformanceBadgeProps {
  onClick?: () => void;
  className?: string;
}

export function PerformanceBadge({ onClick, className = '' }: PerformanceBadgeProps) {
  const { stats, slowAlert, dismissAlert } = usePerformance();
  const { grade, color } = getPerformanceGrade(stats);

  const hasSlowOps = stats.slowOperations > 0;

  return (
    <>
      <button
        onClick={onClick}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors ${
          hasSlowOps 
            ? 'bg-amber-50 hover:bg-amber-100 text-amber-700' 
            : 'bg-green-50 hover:bg-green-100 text-green-700'
        } ${className}`}
        title={`Performance: ${grade} (${stats.totalOperations} ops, ${stats.slowOperations} slow)`}
      >
        {hasSlowOps ? (
          <AlertTriangle className="w-3.5 h-3.5" />
        ) : (
          <Zap className="w-3.5 h-3.5" />
        )}
        <span className={`text-xs font-medium ${color}`}>{grade}</span>
      </button>

      {/* Slow operation toast */}
      {slowAlert && (
        <SlowOperationToast operation={slowAlert} onDismiss={dismissAlert} />
      )}
    </>
  );
}

// ============================================================================
// PERFORMANCE PANEL
// ============================================================================

interface PerformancePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformancePanel({ isOpen, onClose }: PerformancePanelProps) {
  const { stats } = usePerformance();
  const { grade, color, message } = getPerformanceGrade(stats);
  const suggestions = getOptimizationSuggestions(stats);
  const [showDetails, setShowDetails] = useState(false);

  if (!isOpen) return null;

  const typeIcons: Record<OperationType, React.ReactNode> = {
    database_read: <Database className="w-4 h-4" />,
    database_write: <Database className="w-4 h-4" />,
    api_call: <Globe className="w-4 h-4" />,
    render: <Cpu className="w-4 h-4" />,
    filter: <Filter className="w-4 h-4" />,
    search: <Search className="w-4 h-4" />,
    export: <FileDown className="w-4 h-4" />,
    import: <FileDown className="w-4 h-4" />,
    calculation: <Cpu className="w-4 h-4" />,
    other: <Activity className="w-4 h-4" />,
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-lg">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Performance Monitor</h3>
              <p className="text-xs text-purple-100">Real-time operation tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Grade */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-4xl font-bold mb-1">
                <span className={color}>{grade}</span>
              </div>
              <div className="text-sm text-gray-600">{message}</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-800">
                {stats.totalOperations}
              </div>
              <div className="text-xs text-gray-500">Total Operations</div>
              {stats.slowOperations > 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  {stats.slowOperations} slow ({Math.round(stats.slowOperations / stats.totalOperations * 100)}%)
                </div>
              )}
            </div>
          </div>

          {/* Average duration */}
          <div className="mt-4 flex items-center gap-4">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div 
                className={`h-full rounded-full ${
                  stats.averageDuration < 100 ? 'bg-green-500' :
                  stats.averageDuration < 300 ? 'bg-blue-500' :
                  stats.averageDuration < 500 ? 'bg-yellow-500' : 'bg-red-500'
                }`}
                style={{ width: `${Math.min(100, stats.averageDuration / 10)}%` }}
              />
            </div>
            <span className="text-sm text-gray-600">
              Avg: {formatDuration(stats.averageDuration)}
            </span>
          </div>
        </div>

        {/* By Type */}
        <div className="p-6 border-b border-gray-200">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3"
          >
            {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Operation Breakdown
          </button>

          {showDetails && (
            <div className="space-y-2">
              {Object.entries(stats.byType).map(([type, data]) => {
                if (data.count === 0) return null;
                return (
                  <div
                    key={type}
                    className={`flex items-center gap-3 p-2 rounded-lg ${
                      data.slowCount > 0 ? 'bg-amber-50' : 'bg-gray-50'
                    }`}
                  >
                    <span className={data.slowCount > 0 ? 'text-amber-600' : 'text-gray-500'}>
                      {typeIcons[type as OperationType]}
                    </span>
                    <span className="flex-1 text-sm capitalize">
                      {type.replace('_', ' ')}
                    </span>
                    <span className="text-xs text-gray-500">
                      {data.count} ops
                    </span>
                    <span className={`text-xs ${
                      data.avgDuration < 100 ? 'text-green-600' :
                      data.avgDuration < 300 ? 'text-blue-600' :
                      data.avgDuration < 500 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      ~{formatDuration(data.avgDuration)}
                    </span>
                    {data.slowCount > 0 && (
                      <span className="text-xs text-amber-600 font-medium">
                        {data.slowCount} slow
                      </span>
                    )}
                  </div>
                );
              })}
              {Object.values(stats.byType).every(d => d.count === 0) && (
                <div className="text-sm text-gray-400 text-center py-4">
                  No operations recorded yet
                </div>
              )}
            </div>
          )}
        </div>

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="p-6 bg-gray-50">
            <h4 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Optimization Tips
            </h4>
            <ul className="space-y-2">
              {suggestions.map((suggestion, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                  <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                  {suggestion}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-100 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg text-sm font-medium text-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOADING INDICATOR WITH DURATION
// ============================================================================

interface TimedLoaderProps {
  isLoading: boolean;
  operationName?: string;
  className?: string;
}

export function TimedLoader({ isLoading, operationName = 'Loading', className = '' }: TimedLoaderProps) {
  const [duration, setDuration] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);

  useEffect(() => {
    if (isLoading) {
      setStartTime(Date.now());
      setDuration(0);
      
      const interval = setInterval(() => {
        setDuration(Date.now() - (startTime || Date.now()));
      }, 100);
      
      return () => clearInterval(interval);
    } else {
      setStartTime(null);
    }
  }, [isLoading, startTime]);

  if (!isLoading) return null;

  const isSlow = duration > 2000;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 className={`w-4 h-4 animate-spin ${isSlow ? 'text-amber-500' : 'text-blue-500'}`} />
      <span className={`text-sm ${isSlow ? 'text-amber-600' : 'text-gray-600'}`}>
        {operationName}
        {duration > 500 && (
          <span className="ml-1 text-xs">
            ({formatDuration(duration)})
          </span>
        )}
      </span>
      {isSlow && (
        <span className="text-xs text-amber-500">Taking longer than expected...</span>
      )}
    </div>
  );
}

export default PerformancePanel;
