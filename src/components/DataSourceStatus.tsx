/**
 * Data Source Status Component
 * 
 * Displays health status for all OSINT data sources with:
 * - Green/Yellow/Red health indicators
 * - Last successful fetch time
 * - Request count today
 * - Reset circuit breaker buttons
 */

import React, { memo, useState, useEffect } from 'react';
import { 
  CheckCircle, AlertTriangle, XCircle, RefreshCw, Activity,
  ChevronDown, ChevronRight
} from 'lucide-react';
import { 
  getDataSourceHealth, 
  resetDataSource,
  type DataSourceType,
  type SourceHealthStatus,
  DATA_SOURCES
} from '../osint/DataSourceManager';

interface DataSourceStatusProps {
  className?: string;
}

const DataSourceStatus: React.FC<DataSourceStatusProps> = memo(({ className = '' }) => {
  const [sources, setSources] = useState<SourceHealthStatus[]>([]);
  const [isExpanded, setIsExpanded] = useState(false);
  const [resetting, setResetting] = useState<DataSourceType | null>(null);

  useEffect(() => {
    const updateStatus = () => {
      setSources(getDataSourceHealth());
    };

    updateStatus();
    const interval = setInterval(updateStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  const handleReset = async (source: DataSourceType) => {
    setResetting(source);
    try {
      resetDataSource(source);
      // Wait a moment to show feedback
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      setResetting(null);
    }
  };

  const getHealthColor = (source: SourceHealthStatus) => {
    if (!source.healthy) return 'text-red-400';
    if (source.errorCount > 0) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getHealthIcon = (source: SourceHealthStatus) => {
    if (!source.healthy) return <XCircle className="w-4 h-4 text-red-400" />;
    if (source.errorCount > 0) return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
    return <CheckCircle className="w-4 h-4 text-green-400" />;
  };

  const getSourceName = (sourceType: DataSourceType) => {
    return DATA_SOURCES[sourceType].name;
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const healthySources = sources.filter(s => s.healthy).length;
  const totalSources = sources.length;

  return (
    <div className={`bg-slate-800 rounded-lg border border-blue-500/30 ${className}`}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-blue-400" />
          <div className="text-left">
            <h3 className="font-semibold text-white">OSINT Data Sources</h3>
            <p className="text-xs text-slate-400">
              {healthySources}/{totalSources} healthy • Real-time monitoring
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`px-2 py-1 rounded-md text-xs font-mono ${
            healthySources === totalSources 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30'
              : healthySources > 0
              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
              : 'bg-red-500/20 text-red-400 border border-red-500/30'
          }`}>
            {Math.round((healthySources / totalSources) * 100)}%
          </div>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Source List */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2">
          {sources.map(source => (
            <div
              key={source.source}
              className="bg-slate-900/50 rounded-md p-3 border border-slate-700"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  {/* Source Name & Status */}
                  <div className="flex items-center gap-2 mb-2">
                    {getHealthIcon(source)}
                    <span className="font-medium text-white">
                      {getSourceName(source.source)}
                    </span>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-slate-400">Requests</div>
                      <div className="font-mono text-slate-200">{source.requestCount}</div>
                    </div>
                    <div>
                      <div className="text-slate-400">Errors</div>
                      <div className={`font-mono ${source.errorCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {source.errorCount}
                      </div>
                    </div>
                    <div>
                      <div className="text-slate-400">Last Success</div>
                      <div className="font-mono text-slate-200">
                        {formatTimestamp(source.lastSuccess)}
                      </div>
                    </div>
                  </div>

                  {/* Last Failure */}
                  {source.lastFailure && (
                    <div className="mt-2 text-xs text-red-400">
                      Last failure: {formatTimestamp(source.lastFailure)}
                    </div>
                  )}
                </div>

                {/* Reset Button */}
                <button
                  onClick={() => handleReset(source.source)}
                  disabled={resetting === source.source}
                  className="px-2 py-1 bg-blue-500/10 hover:bg-blue-500/20 disabled:bg-slate-700 border border-blue-500/30 rounded-md text-blue-400 disabled:text-slate-500 text-xs flex items-center gap-1 transition-colors"
                  title="Reset circuit breaker"
                >
                  <RefreshCw className={`w-3 h-3 ${resetting === source.source ? 'animate-spin' : ''}`} />
                  Reset
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

DataSourceStatus.displayName = 'DataSourceStatus';

export default DataSourceStatus;

