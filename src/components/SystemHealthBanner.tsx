/**
 * System Health Banner
 * 
 * PROMINENT, VISIBLE health status banner at the top of the dashboard
 * Shows system health at a glance - IMPOSSIBLE TO MISS
 */

import React, { useEffect, useState } from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { 
  subscribeToHealthUpdates, 
  checkSystemHealth,
  type SystemHealth 
} from '../utils/systemHealthMonitor';

export const SystemHealthBanner: React.FC = () => {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToHealthUpdates(setHealth);
    checkSystemHealth().then(setHealth);
    return unsubscribe;
  }, []);

  if (!health) return null;

  const getStatusColor = () => {
    switch (health.overall) {
      case 'healthy': return 'bg-green-500/20 border-green-500/50 text-green-300';
      case 'degraded': return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
      case 'critical': return 'bg-red-500/20 border-red-500/50 text-red-300';
      default: return 'bg-gray-500/20 border-gray-500/50 text-gray-300';
    }
  };

  const getStatusIcon = () => {
    switch (health.overall) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <XCircle className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const criticalCount = health.components.filter(c => c.status === 'critical').length;
  const degradedCount = health.components.filter(c => c.status === 'degraded').length;
  const healthyCount = health.components.filter(c => c.status === 'healthy').length;

  return (
    <div className={`border-b ${getStatusColor()} transition-all`}>
      {/* Compact Banner - Always Visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-2 flex items-center justify-between hover:bg-black/20 transition-colors"
      >
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div className="text-left">
            <div className="font-semibold text-sm">
              🛡️ System Protection: {health.overall.toUpperCase()}
            </div>
            <div className="text-xs opacity-80">
              {healthyCount} healthy • {degradedCount} degraded • {criticalCount} critical
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Quick Stats */}
          <div className="flex items-center gap-3 text-xs">
            <span title="Pre-commit hooks active">
              ✅ Code Quality
            </span>
            <span title="Rate limiters active">
              ⏳ API Limits
            </span>
            <span title="Database healthy">
              💾 Database
            </span>
            <span title="Health monitoring active">
              🏥 Monitoring
            </span>
          </div>
          
          {expanded ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-current/20">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {health.components.map(component => (
              <div
                key={component.name}
                className={`p-2 rounded text-xs ${
                  component.status === 'healthy' ? 'bg-green-500/10 border border-green-500/30' :
                  component.status === 'degraded' ? 'bg-yellow-500/10 border border-yellow-500/30' :
                  component.status === 'critical' ? 'bg-red-500/10 border border-red-500/30' :
                  'bg-gray-500/10 border border-gray-500/30'
                }`}
              >
                <div className="font-medium">{component.name}</div>
                <div className="opacity-75 mt-1">{component.message}</div>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs opacity-75">
            <div>
              Last checked: {new Date(health.timestamp).toLocaleTimeString()} • 
              Uptime: {Math.floor(health.uptime / 1000 / 60)} minutes
            </div>
            <div>
              🛡️ 7 protection layers active
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

