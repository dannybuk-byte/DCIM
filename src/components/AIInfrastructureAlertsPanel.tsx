/**
 * AI Infrastructure Alerts Panel
 * 
 * Real-time alerts from CertStream and RIPE RIS Live monitoring
 * for AI company infrastructure expansion.
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  AlertTriangle,
  Radio,
  Shield,
  Globe,
  Activity,
  Play,
  Pause,
  Trash2,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Eye,
  Server,
  Zap,
  Clock,
  Filter,
  Bell,
  BellOff,
} from 'lucide-react';
import {
  useAIInfrastructureMonitor,
  AIInfrastructureAlert,
  MonitorStatus,
} from '../services/aiInfrastructureMonitor';
import { AI_COMPANY_WATCHLIST } from '../services/aiInfrastructureIntelligence';

// =============================================================================
// ALERT CARD COMPONENT
// =============================================================================

interface AlertCardProps {
  alert: AIInfrastructureAlert;
  expanded: boolean;
  onToggle: () => void;
}

const AlertCard = memo(function AlertCard({ alert, expanded, onToggle }: AlertCardProps) {
  const getSeverityStyles = (severity: AIInfrastructureAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return {
          border: 'border-red-500/50',
          bg: 'bg-red-500/10',
          badge: 'bg-red-500 text-white',
          icon: 'text-red-500',
        };
      case 'high':
        return {
          border: 'border-orange-500/50',
          bg: 'bg-orange-500/10',
          badge: 'bg-orange-500 text-white',
          icon: 'text-orange-500',
        };
      case 'medium':
        return {
          border: 'border-yellow-500/50',
          bg: 'bg-yellow-500/10',
          badge: 'bg-yellow-500 text-black',
          icon: 'text-yellow-500',
        };
      case 'low':
        return {
          border: 'border-blue-500/50',
          bg: 'bg-blue-500/10',
          badge: 'bg-blue-500 text-white',
          icon: 'text-blue-500',
        };
    }
  };

  const getTypeIcon = (type: AIInfrastructureAlert['type']) => {
    switch (type) {
      case 'certificate':
        return <Shield className="w-4 h-4" />;
      case 'bgp_announcement':
        return <Globe className="w-4 h-4" />;
      case 'bgp_anomaly':
        return <AlertTriangle className="w-4 h-4" />;
      case 'expansion':
        return <Server className="w-4 h-4" />;
    }
  };

  const styles = getSeverityStyles(alert.severity);
  const timeAgo = getTimeAgo(alert.timestamp);

  return (
    <div
      className={`rounded-lg border ${styles.border} ${styles.bg} overflow-hidden transition-all`}
    >
      <button
        onClick={onToggle}
        className="w-full p-4 text-left hover:bg-white/5 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className={styles.icon}>
            {getTypeIcon(alert.type)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${styles.badge}`}>
                {alert.severity.toUpperCase()}
              </span>
              <span className="text-xs text-[#8b949e]">{alert.company}</span>
              <span className="text-xs text-[#484f58]">•</span>
              <span className="text-xs text-[#484f58]">{timeAgo}</span>
            </div>
            <h4 className="text-white font-medium mt-1 truncate">{alert.title}</h4>
          </div>
          <div className="text-[#8b949e]">
            {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </div>
        </div>
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-[#30363d]">
          <p className="text-sm text-[#8b949e] mt-3">{alert.description}</p>
          
          {alert.details && (
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {alert.details.domain && (
                <div>
                  <span className="text-[#484f58]">Domain:</span>{' '}
                  <span className="text-[#c9d1d9] font-mono">{alert.details.domain}</span>
                </div>
              )}
              {alert.details.asn && (
                <div>
                  <span className="text-[#484f58]">ASN:</span>{' '}
                  <span className="text-[#c9d1d9] font-mono">AS{alert.details.asn}</span>
                </div>
              )}
              {alert.details.prefix && (
                <div>
                  <span className="text-[#484f58]">Prefix:</span>{' '}
                  <span className="text-[#c9d1d9] font-mono">{alert.details.prefix}</span>
                </div>
              )}
              {alert.details.asPath && (
                <div className="col-span-2">
                  <span className="text-[#484f58]">AS Path:</span>{' '}
                  <span className="text-[#c9d1d9] font-mono">{alert.details.asPath.join(' → ')}</span>
                </div>
              )}
              {alert.details.subdomains && alert.details.subdomains.length > 0 && (
                <div className="col-span-2">
                  <span className="text-[#484f58]">Subdomains:</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {alert.details.subdomains.slice(0, 5).map(sub => (
                      <span key={sub} className="px-2 py-0.5 bg-[#30363d] rounded font-mono text-[#c9d1d9]">
                        {sub}
                      </span>
                    ))}
                    {alert.details.subdomains.length > 5 && (
                      <span className="px-2 py-0.5 bg-[#30363d] rounded text-[#8b949e]">
                        +{alert.details.subdomains.length - 5} more
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
          
          <div className="mt-3 p-2 bg-[#0d1117] rounded border border-[#30363d]">
            <div className="flex items-center gap-2 text-xs">
              <Zap className="w-3 h-3 text-amber-400" />
              <span className="text-amber-400 font-medium">Action:</span>
              <span className="text-[#c9d1d9]">{alert.actionable}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

// =============================================================================
// STATUS INDICATOR
// =============================================================================

interface StatusIndicatorProps {
  status: MonitorStatus;
}

const StatusIndicator = memo(function StatusIndicator({ status }: StatusIndicatorProps) {
  const getBGPStatusColor = () => {
    switch (status.bgp) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'disconnected': return 'bg-red-500';
      case 'offline': return 'bg-gray-500';
    }
  };

  const getCertStatusColor = () => {
    switch (status.certStream) {
      case 'active': return 'bg-green-500';
      case 'polling': return 'bg-blue-500 animate-pulse';
      case 'error': return 'bg-red-500';
    }
  };

  return (
    <div className="flex items-center gap-4 text-xs">
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getBGPStatusColor()}`} />
        <span className="text-[#8b949e]">BGP: {status.bgp}</span>
      </div>
      <div className="flex items-center gap-2">
        <div className={`w-2 h-2 rounded-full ${getCertStatusColor()}`} />
        <span className="text-[#8b949e]">Certs: {status.certStream}</span>
      </div>
      <div className="text-[#484f58]">
        {status.monitoredASNs} ASNs • {status.monitoredDomains} domains
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const AIInfrastructureAlertsPanel: React.FC = () => {
  const { alerts, status, start, stop, checkCompany, clearAlerts } = useAIInfrastructureMonitor();
  const [expandedAlert, setExpandedAlert] = useState<string | null>(null);
  const [filterSeverity, setFilterSeverity] = useState<AIInfrastructureAlert['severity'] | 'all'>('all');
  const [filterCompany, setFilterCompany] = useState<string | 'all'>('all');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [checkingCompany, setCheckingCompany] = useState<string | null>(null);

  const handleStart = useCallback(() => {
    start();
    setIsMonitoring(true);
  }, [start]);

  const handleStop = useCallback(() => {
    stop();
    setIsMonitoring(false);
  }, [stop]);

  const handleCheckCompany = useCallback(async (companyName: string) => {
    setCheckingCompany(companyName);
    try {
      await checkCompany(companyName);
    } finally {
      setCheckingCompany(null);
    }
  }, [checkCompany]);

  // Play sound on critical alerts
  useEffect(() => {
    if (soundEnabled && alerts.length > 0 && alerts[0].severity === 'critical') {
      // Would play alert sound here
      console.log('🔔 Critical alert sound would play');
    }
  }, [alerts, soundEnabled]);

  // Filter alerts
  const filteredAlerts = alerts.filter(alert => {
    if (filterSeverity !== 'all' && alert.severity !== filterSeverity) return false;
    if (filterCompany !== 'all' && alert.company !== filterCompany) return false;
    return true;
  });

  // Count by severity
  const severityCounts = {
    critical: alerts.filter(a => a.severity === 'critical').length,
    high: alerts.filter(a => a.severity === 'high').length,
    medium: alerts.filter(a => a.severity === 'medium').length,
    low: alerts.filter(a => a.severity === 'low').length,
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#30363d]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-red-500/20 to-orange-500/20 rounded-lg">
              <Radio className={`w-5 h-5 ${isMonitoring ? 'text-red-400 animate-pulse' : 'text-[#8b949e]'}`} />
            </div>
            <div>
              <h3 className="font-semibold text-white">AI Infrastructure Alerts</h3>
              <p className="text-xs text-[#8b949e]">Real-time CertStream + RIPE RIS Live</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg transition-colors ${
                soundEnabled ? 'bg-amber-500/20 text-amber-400' : 'bg-[#30363d] text-[#8b949e]'
              }`}
              title={soundEnabled ? 'Mute alerts' : 'Enable sound alerts'}
            >
              {soundEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
            </button>
            
            {isMonitoring ? (
              <button
                onClick={handleStop}
                className="flex items-center gap-2 px-3 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                <Pause className="w-4 h-4" />
                Stop
              </button>
            ) : (
              <button
                onClick={handleStart}
                className="flex items-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Monitor
              </button>
            )}
          </div>
        </div>
        
        <StatusIndicator status={status} />
      </div>

      {/* Filters */}
      <div className="p-3 border-b border-[#30363d] bg-[#0d1117]">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#8b949e]" />
            <select
              value={filterSeverity}
              onChange={(e) => setFilterSeverity(e.target.value as typeof filterSeverity)}
              className="px-2 py-1 bg-[#161b22] border border-[#30363d] rounded text-sm text-[#c9d1d9]"
            >
              <option value="all">All Severities</option>
              <option value="critical">🔴 Critical ({severityCounts.critical})</option>
              <option value="high">🟠 High ({severityCounts.high})</option>
              <option value="medium">🟡 Medium ({severityCounts.medium})</option>
              <option value="low">🔵 Low ({severityCounts.low})</option>
            </select>
          </div>
          
          <select
            value={filterCompany}
            onChange={(e) => setFilterCompany(e.target.value)}
            className="px-2 py-1 bg-[#161b22] border border-[#30363d] rounded text-sm text-[#c9d1d9]"
          >
            <option value="all">All Companies</option>
            {AI_COMPANY_WATCHLIST.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
          
          <div className="flex-1" />
          
          <button
            onClick={clearAlerts}
            className="flex items-center gap-1 px-2 py-1 text-xs text-[#8b949e] hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            Clear
          </button>
        </div>
      </div>

      {/* Quick Check Buttons */}
      <div className="p-3 border-b border-[#30363d] bg-[#0d1117]/50">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#8b949e]">Quick Check:</span>
          {AI_COMPANY_WATCHLIST.slice(0, 6).map(company => (
            <button
              key={company.name}
              onClick={() => handleCheckCompany(company.name)}
              disabled={checkingCompany !== null}
              className={`px-2 py-1 text-xs rounded-lg border transition-colors ${
                checkingCompany === company.name
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                  : 'bg-[#161b22] border-[#30363d] text-[#8b949e] hover:text-white hover:border-[#8b949e]'
              }`}
            >
              {checkingCompany === company.name ? (
                <RefreshCw className="w-3 h-3 animate-spin inline mr-1" />
              ) : null}
              {company.name}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts List */}
      <div className="max-h-[500px] overflow-y-auto">
        {filteredAlerts.length === 0 ? (
          <div className="p-8 text-center">
            <Eye className="w-12 h-12 mx-auto text-[#30363d] mb-4" />
            <p className="text-[#8b949e]">
              {isMonitoring
                ? 'Monitoring... Alerts will appear here.'
                : 'Click "Start Monitor" to begin tracking AI infrastructure.'}
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {filteredAlerts.map(alert => (
              <AlertCard
                key={alert.id}
                alert={alert}
                expanded={expandedAlert === alert.id}
                onToggle={() => setExpandedAlert(
                  expandedAlert === alert.id ? null : alert.id
                )}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-[#30363d] bg-[#0d1117]">
        <div className="flex items-center justify-between text-xs text-[#8b949e]">
          <span>{filteredAlerts.length} alerts shown</span>
          {status.lastUpdate && (
            <span>Last update: {getTimeAgo(status.lastUpdate)}</span>
          )}
        </div>
      </div>
    </div>
  );
};

// =============================================================================
// HELPERS
// =============================================================================

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export default AIInfrastructureAlertsPanel;

