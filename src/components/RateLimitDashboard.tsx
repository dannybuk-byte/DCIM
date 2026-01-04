/**
 * Rate Limit Status Dashboard
 * 
 * Visual monitoring of API rate limit usage across all data sources
 * Shows real-time quota consumption and prevents surprises
 */

import React, { useEffect, useState } from 'react';
import { Activity, Shield, AlertTriangle, CheckCircle } from 'lucide-react';
import { rateLimitGuard } from '../utils/rateLimitGuard';

interface RateLimitStatus {
  name: string;
  used: number;
  limit: number;
  remaining: number;
  resetIn: number;
}

export const RateLimitDashboard: React.FC = () => {
  const [status, setStatus] = useState<Record<string, RateLimitStatus | null>>({});

  useEffect(() => {
    const updateStatus = () => {
      setStatus(rateLimitGuard.getAllStatus());
    };

    // Update immediately
    updateStatus();

    // Update every 5 seconds
    const interval = setInterval(updateStatus, 5000);

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (used: number, limit: number): string => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (percentage >= 70) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  };

  const getStatusIcon = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 90) return <AlertTriangle className="w-4 h-4" />;
    if (percentage >= 70) return <Activity className="w-4 h-4" />;
    return <CheckCircle className="w-4 h-4" />;
  };

  const formatResetTime = (ms: number): string => {
    if (ms === 0) return 'Ready';
    const seconds = Math.ceil(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.ceil(seconds / 60);
    return `${minutes}m`;
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-blue-400" />
        <h3 className="text-lg font-semibold text-white">API Rate Limit Status</h3>
        <span className="text-xs text-slate-400 ml-auto">
          Updates every 5s
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {Object.entries(status).map(([domain, data]) => {
          if (!data) return null;

          const percentage = (data.used / data.limit) * 100;
          const colorClass = getStatusColor(data.used, data.limit);

          return (
            <div
              key={domain}
              className={`border rounded-lg p-3 transition-all ${colorClass}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(data.used, data.limit)}
                    <span className="font-medium text-sm">{data.name}</span>
                  </div>
                  <span className="text-xs opacity-60">{domain}</span>
                </div>
              </div>

              <div className="space-y-2">
                {/* Progress bar */}
                <div className="relative h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 bg-current transition-all duration-300"
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Stats */}
                <div className="flex items-center justify-between text-xs">
                  <span>
                    {data.used} / {data.limit} used
                  </span>
                  <span className="font-mono">
                    {data.remaining} left
                  </span>
                </div>

                {/* Reset time */}
                {data.resetIn > 0 && (
                  <div className="text-xs opacity-75">
                    Reset in {formatResetTime(data.resetIn)}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 pt-3 border-t border-slate-700/50">
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span>&lt;70% = Healthy</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-3 h-3 text-yellow-400" />
            <span>70-90% = Warning</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>&gt;90% = Critical</span>
          </div>
        </div>
      </div>

      <div className="mt-3 p-2 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-300">
        <Shield className="w-3 h-3 inline mr-1" />
        <strong>Proactive Protection:</strong> Requests automatically wait when limits are reached
      </div>
    </div>
  );
};

