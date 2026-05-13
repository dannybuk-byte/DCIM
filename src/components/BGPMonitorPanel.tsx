import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Activity, AlertTriangle, TrendingUp, Pause, Play, Globe } from 'lucide-react';
import { bgpMonitor, BGPUpdate, BGPAnomaly } from '../network/BGPMonitor';

interface BGPStats {
  updatesPerSecond: number;
  totalUpdates: number;
  anomalyCount: number;
}

export interface BGPMonitorPanelProps {
  /** When true, connect to RIPE RIS Live on mount (P2 default surface). */
  autoConnect?: boolean;
}

export const BGPMonitorPanel: React.FC<BGPMonitorPanelProps> = React.memo(function BGPMonitorPanel({
  autoConnect = false,
}) {
  const [isActive, setIsActive] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected' | 'offline'>('disconnected');
  const [updates, setUpdates] = useState<BGPUpdate[]>([]);
  const [anomalies, setAnomalies] = useState<BGPAnomaly[]>([]);
  const [stats, setStats] = useState<BGPStats>({ updatesPerSecond: 0, totalUpdates: 0, anomalyCount: 0 });
  const [filterASN, setFilterASN] = useState('');
  const updateCountRef = useRef(0);
  const lastSecondRef = useRef(Date.now());

  // Handle BGP updates
  const handleUpdate = useCallback((update: BGPUpdate) => {
    setUpdates(prev => {
      const newUpdates = [update, ...prev].slice(0, 100); // Keep last 100
      return newUpdates;
    });

    // Update stats
    updateCountRef.current++;
    const now = Date.now();
    if (now - lastSecondRef.current >= 1000) {
      setStats(prev => ({
        updatesPerSecond: updateCountRef.current,
        totalUpdates: prev.totalUpdates + updateCountRef.current,
        anomalyCount: prev.anomalyCount
      }));
      updateCountRef.current = 0;
      lastSecondRef.current = now;
    }
  }, []);

  // Handle anomalies
  const handleAnomaly = useCallback((anomaly: BGPAnomaly) => {
    setAnomalies(prev => {
      const newAnomalies = [anomaly, ...prev].slice(0, 50); // Keep last 50
      return newAnomalies;
    });

    setStats(prev => ({
      ...prev,
      anomalyCount: prev.anomalyCount + 1
    }));
  }, []);

  // Toggle monitoring
  const toggleMonitoring = useCallback(() => {
    if (isActive) {
      bgpMonitor.disconnect();
      setIsActive(false);
      setConnectionStatus('disconnected');
    } else {
      bgpMonitor.connect();
      setIsActive(true);
    }
  }, [isActive]);

  // Add/remove monitored ASN
  const handleASNFilter = useCallback(() => {
    const asn = parseInt(filterASN, 10);
    if (!isNaN(asn)) {
      bgpMonitor.addMonitoredASN(asn);
      setFilterASN('');
    }
  }, [filterASN]);

  // Monitor connection and subscribe to updates
  useEffect(() => {
    if (!isActive) return;

    const unsubscribeUpdate = bgpMonitor.onUpdate(handleUpdate);
    const unsubscribeAnomaly = bgpMonitor.onAnomaly(handleAnomaly);

    const statusInterval = setInterval(() => {
      setConnectionStatus(bgpMonitor.getConnectionStatus());
    }, 1000);

    return () => {
      unsubscribeUpdate();
      unsubscribeAnomaly();
      clearInterval(statusInterval);
    };
  }, [isActive, handleUpdate, handleAnomaly]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      bgpMonitor.disconnect();
    };
  }, []);

  // P2: live BGP is the default surface when embedded from Omniscient (RIPE RIS).
  useEffect(() => {
    if (!autoConnect) return;
    bgpMonitor.connect();
    setIsActive(true);
  }, [autoConnect]);

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500 animate-pulse';
      case 'offline': return 'bg-red-500';
      case 'disconnected': return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return 'Connected';
      case 'connecting': return 'Connecting...';
      case 'offline': return 'Offline (Max retries reached)';
      case 'disconnected': return 'Disconnected';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-500 bg-red-500/10';
      case 'high': return 'text-orange-500 bg-orange-500/10';
      case 'medium': return 'text-yellow-500 bg-yellow-500/10';
      case 'low': return 'text-blue-500 bg-blue-500/10';
      default: return 'text-gray-500 bg-gray-500/10';
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-lg border border-cyan-500/30 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-cyan-400" />
          <div>
            <h3 className="text-lg font-semibold text-cyan-400">BGP Real-Time Monitor</h3>
            <p className="text-xs text-slate-400">RIPE RIS Live WebSocket</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
            <span className="text-sm text-slate-300">{getStatusText()}</span>
          </div>
          {connectionStatus === 'offline' && (
            <button
              onClick={() => bgpMonitor.retry()}
              className="px-3 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            >
              Retry Connection
            </button>
          )}
          <button
            onClick={toggleMonitoring}
            disabled={connectionStatus === 'offline'}
            className={`p-2 rounded-lg transition-colors ${
              isActive
                ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isActive ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs font-medium">Updates/sec</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.updatesPerSecond}</div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 text-cyan-400 mb-2">
            <Activity className="w-4 h-4" />
            <span className="text-xs font-medium">Total Updates</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.totalUpdates.toLocaleString()}</div>
        </div>

        <div className="bg-slate-900/50 rounded-lg p-4 border border-cyan-500/20">
          <div className="flex items-center gap-2 text-orange-400 mb-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-xs font-medium">Anomalies</span>
          </div>
          <div className="text-2xl font-bold text-white">{stats.anomalyCount}</div>
        </div>
      </div>

      {/* ASN Filter */}
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Monitor AS Number (e.g., 15169 for Google)"
            value={filterASN}
            onChange={(e) => setFilterASN(e.target.value)}
            className="flex-1 px-4 py-2 bg-slate-900/50 border border-cyan-500/30 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
          <button
            onClick={handleASNFilter}
            disabled={!filterASN}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add ASN
          </button>
        </div>
        {bgpMonitor.getMonitoredASNs().length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {bgpMonitor.getMonitoredASNs().map(asn => (
              <span key={asn} className="px-2 py-1 bg-cyan-500/20 text-cyan-400 text-xs rounded">
                AS{asn}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {/* Anomalies */}
        <div>
          <h4 className="text-sm font-semibold text-orange-400 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Detected Anomalies
          </h4>
          <div className="bg-slate-900/50 rounded-lg border border-orange-500/20 max-h-80 overflow-y-auto">
            {anomalies.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                {isActive ? 'No anomalies detected yet' : 'Start monitoring to detect anomalies'}
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {anomalies.map((anomaly, idx) => (
                  <div key={idx} className="p-3">
                    <div className={`text-xs px-2 py-1 rounded inline-block mb-2 ${getSeverityColor(anomaly.severity)}`}>
                      {anomaly.type.replace('_', ' ').toUpperCase()}
                    </div>
                    <div className="text-sm text-white mb-1">{anomaly.description}</div>
                    <div className="text-xs text-slate-400">
                      {new Date(anomaly.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Update Log */}
        <div>
          <h4 className="text-sm font-semibold text-cyan-400 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Update Log
          </h4>
          <div className="bg-slate-900/50 rounded-lg border border-cyan-500/20 max-h-80 overflow-y-auto">
            {updates.length === 0 ? (
              <div className="p-4 text-center text-slate-500 text-sm">
                {isActive ? 'Waiting for updates...' : 'Start monitoring to see BGP updates'}
              </div>
            ) : (
              <div className="divide-y divide-slate-700">
                {updates.map((update, idx) => (
                  <div key={idx} className="p-3 font-mono text-xs">
                    <div className="text-cyan-400 mb-1">{update.prefix}</div>
                    <div className="text-slate-400">
                      AS Path: {update.asPath.join(' → ') || 'N/A'}
                    </div>
                    <div className="text-slate-500 text-[10px] mt-1">
                      {new Date(update.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

BGPMonitorPanel.displayName = 'BGPMonitorPanel';

