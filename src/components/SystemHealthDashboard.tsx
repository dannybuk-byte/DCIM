/**
 * System Health Dashboard
 * 
 * Real-time monitoring of all system components
 * Shows overall health and individual component status
 */

import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, HelpCircle, RefreshCw, Clock } from 'lucide-react';
import { 
  subscribeToHealthUpdates, 
  checkSystemHealth,
  type SystemHealth,
  type ComponentHealth,
  type HealthCheckStatus
} from '../utils/systemHealthMonitor';

export const SystemHealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    // Subscribe to health updates
    const unsubscribe = subscribeToHealthUpdates(setHealth);

    // Force initial check
    checkSystemHealth().then(setHealth);

    return unsubscribe;
  }, []);

  const handleCheckNow = async () => {
    setChecking(true);
    try {
      const result = await checkSystemHealth();
      setHealth(result);
    } finally {
      setChecking(false);
    }
  };

  const getStatusIcon = (status: HealthCheckStatus) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
      case 'critical':
        return <XCircle className="w-5 h-5 text-red-400" />;
      case 'unknown':
        return <HelpCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: HealthCheckStatus) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500/30 bg-green-500/10 text-green-400';
      case 'degraded':
        return 'border-yellow-500/30 bg-yellow-500/10 text-yellow-400';
      case 'critical':
        return 'border-red-500/30 bg-red-500/10 text-red-400';
      case 'unknown':
        return 'border-gray-500/30 bg-gray-500/10 text-gray-400';
    }
  };

  const getStatusLabel = (status: HealthCheckStatus) => {
    switch (status) {
      case 'healthy': return 'HEALTHY';
      case 'degraded': return 'DEGRADED';
      case 'critical': return 'CRITICAL';
      case 'unknown': return 'UNKNOWN';
    }
  };

  const formatUptime = (ms: number): string => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  };

  if (!health) {
    return (
      <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-cyan-400" />
          <div>
            <h3 className="text-lg font-semibold text-white">System Health</h3>
            <p className="text-xs text-slate-400">
              Checks every 5 minutes • Uptime: {formatUptime(health.uptime)}
            </p>
          </div>
        </div>
        <button
          onClick={handleCheckNow}
          disabled={checking}
          className="p-2 hover:bg-slate-700/50 rounded transition-colors disabled:opacity-50"
          title="Check now"
        >
          <RefreshCw className={`w-4 h-4 text-slate-400 ${checking ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overall Status */}
      <div className={`border rounded-lg p-4 mb-4 ${getStatusColor(health.overall)}`}>
        <div className="flex items-center gap-3">
          {getStatusIcon(health.overall)}
          <div className="flex-1">
            <div className="font-semibold text-lg">
              System Status: {getStatusLabel(health.overall)}
            </div>
            <div className="text-sm opacity-80">
              {health.components.filter(c => c.status === 'critical').length} critical • 
              {' '}{health.components.filter(c => c.status === 'degraded').length} degraded • 
              {' '}{health.components.filter(c => c.status === 'healthy').length} healthy
            </div>
          </div>
          <div className="text-xs opacity-60 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(health.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* Component Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {health.components.map(component => (
          <div
            key={component.name}
            className={`border rounded-lg p-3 ${getStatusColor(component.status)}`}
          >
            <div className="flex items-start gap-2 mb-2">
              {getStatusIcon(component.status)}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{component.name}</div>
                <div className="text-xs opacity-80 mt-1">{component.message}</div>
              </div>
            </div>

            {component.responseTime && (
              <div className="text-xs opacity-60 mt-2">
                {component.responseTime}ms response
              </div>
            )}

            {component.details && (
              <div className="mt-2 pt-2 border-t border-current/20">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {Object.entries(component.details).map(([key, value]) => (
                    <div key={key}>
                      <div className="opacity-60 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                      <div className="font-mono">
                        {typeof value === 'number' && !key.includes('MB') 
                          ? value.toFixed(1) 
                          : String(value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Auto-Recovery Info */}
      <div className="mt-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded text-xs text-cyan-300">
        <Activity className="w-3 h-3 inline mr-1" />
        <strong>Auto-Monitoring:</strong> System checks all components every 5 minutes. 
        Degraded components trigger automatic recovery where possible.
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3 h-3 text-green-400" />
          <span>Healthy</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-yellow-400" />
          <span>Degraded</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="w-3 h-3 text-red-400" />
          <span>Critical</span>
        </div>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-3 h-3 text-gray-400" />
          <span>Unknown</span>
        </div>
      </div>
    </div>
  );
};

