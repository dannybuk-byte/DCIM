import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { 
  Activity, AlertTriangle, ArrowDown, ArrowUp, Globe, Radio, 
  Shield, Wifi, X, Zap, Clock, ExternalLink, RefreshCw
} from 'lucide-react';

const COLORS = {
  bg: '#0a0e17',
  bgCard: '#0d1219',
  text: '#e8eef6',
  textMuted: '#5a6d8a',
  red: '#ff4757',
  yellow: '#ffa502',
  green: '#2ed573',
  cyan: '#00d2d3',
  purple: '#a855f7',
};

// Known AS names for display (expand as needed)
const AS_DATABASE: Record<number, string> = {
  13335: 'Cloudflare',
  15169: 'Google',
  16509: 'Amazon',
  8075: 'Microsoft',
  32934: 'Meta',
  20940: 'Akamai',
  2906: 'Netflix',
  714: 'Apple',
  6939: 'Hurricane Electric',
  174: 'Cogent',
  3356: 'Lumen',
  7018: 'AT&T',
  701: 'Verizon',
  3257: 'GTT',
  1299: 'Telia',
  2914: 'NTT',
  6762: 'Telecom Italia',
  9002: 'RETN',
  6461: 'Zayo',
  1239: 'Sprint',
  4134: 'China Telecom',
  4837: 'China Unicom',
  7922: 'Comcast',
  209: 'CenturyLink',
  12956: 'Telefonica',
  5511: 'Orange',
  3320: 'Deutsche Telekom',
  6830: 'Liberty Global',
  20473: 'Vultr',
  14061: 'DigitalOcean',
  63949: 'Linode',
  16276: 'OVH',
  24940: 'Hetzner',
  397143: 'Mullvad VPN',
  // Add more as needed
};

type UpdateType = 'A' | 'W'; // Announcement or Withdrawal

interface BGPUpdate {
  id: string;
  type: UpdateType;
  prefix: string;
  originAS: number;
  asPath: number[];
  timestamp: Date;
  peer: string;
  collector: string;
}

interface BGPAnomaly {
  id: string;
  type: 'MOAS' | 'HIJACK_SUSPECT' | 'SHORT_PATH' | 'LONG_PATH' | 'BOGON';
  severity: 'critical' | 'high' | 'medium' | 'low';
  prefix: string;
  description: string;
  detectedAt: Date;
  affectedAS: number[];
  dismissed?: boolean;
}

// RIPE RIS Live message structure
interface RISMessage {
  type: string;
  data?: {
    type: string;
    timestamp: number;
    peer: string;
    peer_asn: string;
    id: string;
    host: string;
    path?: number[];
    announcements?: Array<{
      next_hop: string;
      prefixes: string[];
    }>;
    withdrawals?: string[];
  };
}

// Bogon prefixes (should not be routed on public internet)
const BOGON_PREFIXES = [
  '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8',
  '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24', '192.0.2.0/24',
  '192.168.0.0/16', '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24',
  '224.0.0.0/4', '240.0.0.0/4',
];

function isBogon(prefix: string): boolean {
  const [ip] = prefix.split('/');
  const parts = ip.split('.').map(Number);
  if (parts[0] === 0 || parts[0] === 10 || parts[0] === 127) return true;
  if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 0) return true;
  if (parts[0] === 192 && parts[1] === 0 && parts[2] === 2) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 198 && (parts[1] === 18 || parts[1] === 19)) return true;
  if (parts[0] === 198 && parts[1] === 51 && parts[2] === 100) return true;
  if (parts[0] === 203 && parts[1] === 0 && parts[2] === 113) return true;
  if (parts[0] >= 224) return true;
  return false;
}

function detectAnomaly(update: BGPUpdate, seenPrefixes: Map<string, Set<number>>): BGPAnomaly | null {
  const { prefix, originAS, asPath, type } = update;
  
  // Only check announcements
  if (type !== 'A') return null;
  
  // Check for bogon prefixes (shouldn't be announced publicly)
  if (isBogon(prefix)) {
    return {
      id: `bogon-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'BOGON',
      severity: 'high',
      prefix,
      description: `Bogon prefix ${prefix} announced by AS${originAS} - should not be routed on public internet`,
      detectedAt: new Date(),
      affectedAS: [originAS],
    };
  }
  
  // Check for MOAS (Multiple Origin AS)
  const existingOrigins = seenPrefixes.get(prefix);
  if (existingOrigins && existingOrigins.size > 0 && !existingOrigins.has(originAS)) {
    const existingAS = Array.from(existingOrigins);
    return {
      id: `moas-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'MOAS',
      severity: 'high',
      prefix,
      description: `Multiple Origin AS detected for ${prefix}: AS${originAS} vs AS${existingAS.join(', AS')}`,
      detectedAt: new Date(),
      affectedAS: [originAS, ...existingAS],
    };
  }
  
  // Check for suspiciously short AS paths (potential hijack)
  if (asPath.length === 1 && originAS !== asPath[0]) {
    return {
      id: `short-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'SHORT_PATH',
      severity: 'medium',
      prefix,
      description: `Unusually short AS path for ${prefix} (single hop) - potential direct peering or hijack`,
      detectedAt: new Date(),
      affectedAS: [originAS],
    };
  }
  
  // Check for suspiciously long AS paths (potential leak or misconfiguration)
  if (asPath.length > 10) {
    return {
      id: `long-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      type: 'LONG_PATH',
      severity: 'low',
      prefix,
      description: `Unusually long AS path (${asPath.length} hops) for ${prefix} - potential route leak or misconfiguration`,
      detectedAt: new Date(),
      affectedAS: asPath.slice(0, 3),
    };
  }
  
  return null;
}

function severityColor(sev: BGPAnomaly['severity']): string {
  if (sev === 'critical') return COLORS.red;
  if (sev === 'high') return COLORS.yellow;
  if (sev === 'medium') return COLORS.cyan;
  return COLORS.textMuted;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour12: false });
}

function getASName(asn: number): string {
  return AS_DATABASE[asn] || '';
}

// Animated pulse dot
const PulseDot = memo(function PulseDot({ color, size = 8 }: { color: string; size?: number }) {
  return (
    <span className="relative inline-flex">
      <span 
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ background: color }}
      />
      <span 
        className="relative inline-flex rounded-full"
        style={{ background: color, width: size, height: size }}
      />
    </span>
  );
});

// Single update row
const UpdateRow = memo(function UpdateRow({ update }: { update: BGPUpdate }) {
  const asName = getASName(update.originAS);
  
  return (
    <div className="flex items-center gap-3 px-3 py-2 border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors text-[11px] font-mono">
      <div className="w-6">
        {update.type === 'A' ? (
          <span className="flex items-center gap-1 text-green-400">
            <ArrowUp className="w-3 h-3" />
          </span>
        ) : (
          <span className="flex items-center gap-1 text-red-400">
            <ArrowDown className="w-3 h-3" />
          </span>
        )}
      </div>
      <div className="flex-1 text-gray-200 truncate" title={update.prefix}>
        {update.prefix}
      </div>
      <div className="w-28 text-right">
        <span className="text-cyan-400">AS{update.originAS}</span>
        {asName && <span className="text-gray-500 ml-1 text-[9px]">({asName})</span>}
      </div>
      <div className="w-16 text-right text-gray-500 text-[10px]" title={update.collector}>
        {update.collector.replace('rrc', 'RRC')}
      </div>
      <div className="w-16 text-right text-gray-500">
        {formatTime(update.timestamp)}
      </div>
    </div>
  );
});

// Anomaly card
const AnomalyCard = memo(function AnomalyCard({ 
  anomaly, 
  onDismiss 
}: { 
  anomaly: BGPAnomaly; 
  onDismiss: (id: string) => void;
}) {
  const color = severityColor(anomaly.severity);
  
  return (
    <div 
      className="rounded-lg border p-3 mb-2 transition-all duration-300"
      style={{ 
        borderColor: `${color}44`,
        background: `${color}08`,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" style={{ color }} />
          <span 
            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
            style={{ background: `${color}22`, color }}
          >
            {anomaly.severity}
          </span>
          <span className="text-[11px] font-semibold text-white">
            {anomaly.type.replace('_', ' ')}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onDismiss(anomaly.id)}
          className="text-gray-500 hover:text-white transition-colors p-1"
          title="Dismiss"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="mt-2 text-[11px] text-gray-300">
        {anomaly.description}
      </div>
      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTime(anomaly.detectedAt)}
        </span>
        <span className="flex items-center gap-1">
          <Globe className="w-3 h-3" />
          {anomaly.affectedAS.slice(0, 3).map(as => `AS${as}`).join(', ')}
          {anomaly.affectedAS.length > 3 && '...'}
        </span>
      </div>
    </div>
  );
});

// Stats card
const StatCard = memo(function StatCard({ 
  label, 
  value, 
  icon, 
  color 
}: { 
  label: string; 
  value: number | string; 
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-gray-900/50 border border-gray-800">
      <div style={{ color }}>{icon}</div>
      <div>
        <div className="text-lg font-bold text-white">{value}</div>
        <div className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</div>
      </div>
    </div>
  );
});

// Connection status component
const ConnectionStatus = memo(function ConnectionStatus({ 
  status, 
  error 
}: { 
  status: 'connecting' | 'connected' | 'disconnected' | 'error';
  error?: string;
}) {
  const statusConfig = {
    connecting: { color: COLORS.yellow, label: 'CONNECTING', pulse: true },
    connected: { color: COLORS.green, label: 'LIVE', pulse: true },
    disconnected: { color: COLORS.textMuted, label: 'DISCONNECTED', pulse: false },
    error: { color: COLORS.red, label: 'ERROR', pulse: false },
  };
  
  const config = statusConfig[status];
  
  return (
    <span 
      className="px-2 py-0.5 rounded-full text-[10px] font-semibold flex items-center gap-1.5"
      style={{ background: `${config.color}20`, color: config.color }}
      title={error || ''}
    >
      {config.pulse ? <PulseDot color={config.color} size={6} /> : null}
      {config.label}
    </span>
  );
});

export const BGPRouteMonitor = memo(function BGPRouteMonitor({
  maxUpdates = 200,
  enabled = true,
}: {
  maxUpdates?: number;
  enabled?: boolean;
}) {
  const [updates, setUpdates] = useState<BGPUpdate[]>([]);
  const [anomalies, setAnomalies] = useState<BGPAnomaly[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');
  const [connectionError, setConnectionError] = useState<string>();
  const [stats, setStats] = useState({ total: 0, announcements: 0, withdrawals: 0 });
  const [isEnabled, setIsEnabled] = useState(enabled);
  
  const wsRef = useRef<WebSocket | null>(null);
  const seenPrefixesRef = useRef<Map<string, Set<number>>>(new Map());
  const reconnectTimeoutRef = useRef<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Connect to RIPE RIS Live
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    
    setConnectionStatus('connecting');
    setConnectionError(undefined);
    
    try {
      const ws = new WebSocket('wss://ris-live.ripe.net/v1/ws/');
      wsRef.current = ws;
      
      ws.onopen = () => {
        setConnectionStatus('connected');
        // Subscribe to BGP updates (filter to reduce volume - only IPv4 and specific collectors)
        ws.send(JSON.stringify({
          type: 'ris_subscribe',
          data: {
            // Don't filter by prefix to get diverse traffic
            // But limit to a few collectors to reduce volume
            host: 'rrc00', // Amsterdam
            type: 'UPDATE',
            // Optionally filter by more specific prefixes for less noise
            // moreSpecific: true,
            // prefix: '0.0.0.0/0',
          }
        }));
      };
      
      ws.onmessage = (event) => {
        try {
          const message: RISMessage = JSON.parse(event.data);
          
          if (message.type === 'ris_message' && message.data) {
            const data = message.data;
            const timestamp = new Date(data.timestamp * 1000);
            const collector = data.host || 'unknown';
            const peer = data.peer || 'unknown';
            const asPath = data.path || [];
            const originAS = asPath.length > 0 ? asPath[asPath.length - 1] : 0;
            
            // Process announcements
            if (data.announcements) {
              data.announcements.forEach((ann) => {
                ann.prefixes.forEach((prefix) => {
                  const update: BGPUpdate = {
                    id: `${data.id}-${prefix}-${Date.now()}`,
                    type: 'A',
                    prefix,
                    originAS,
                    asPath,
                    timestamp,
                    peer,
                    collector,
                  };
                  
                  setUpdates(prev => [update, ...prev].slice(0, maxUpdates));
                  setStats(prev => ({
                    ...prev,
                    total: prev.total + 1,
                    announcements: prev.announcements + 1,
                  }));
                  
                  // Track seen prefixes for MOAS detection
                  if (!seenPrefixesRef.current.has(prefix)) {
                    seenPrefixesRef.current.set(prefix, new Set());
                  }
                  
                  // Check for anomalies
                  const anomaly = detectAnomaly(update, seenPrefixesRef.current);
                  if (anomaly) {
                    setAnomalies(prev => [anomaly, ...prev].slice(0, 20));
                  }
                  
                  // Add origin AS to seen set
                  seenPrefixesRef.current.get(prefix)!.add(originAS);
                });
              });
            }
            
            // Process withdrawals
            if (data.withdrawals) {
              data.withdrawals.forEach((prefix) => {
                const update: BGPUpdate = {
                  id: `${data.id}-${prefix}-w-${Date.now()}`,
                  type: 'W',
                  prefix,
                  originAS: 0, // Withdrawals don't have origin AS
                  asPath: [],
                  timestamp,
                  peer,
                  collector,
                };
                
                setUpdates(prev => [update, ...prev].slice(0, maxUpdates));
                setStats(prev => ({
                  ...prev,
                  total: prev.total + 1,
                  withdrawals: prev.withdrawals + 1,
                }));
              });
            }
          }
        } catch (e) {
          // Ignore parse errors for malformed messages
        }
      };
      
      ws.onerror = () => {
        setConnectionStatus('error');
        setConnectionError('WebSocket connection failed');
      };
      
      ws.onclose = () => {
        setConnectionStatus('disconnected');
        wsRef.current = null;
        
        // Auto-reconnect after 5 seconds if still enabled
        if (isEnabled) {
          reconnectTimeoutRef.current = window.setTimeout(() => {
            connect();
          }, 5000);
        }
      };
    } catch (e: any) {
      setConnectionStatus('error');
      setConnectionError(e?.message || 'Failed to connect');
    }
  }, [isEnabled, maxUpdates]);

  // Disconnect
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setConnectionStatus('disconnected');
  }, []);

  // Toggle connection
  const toggleConnection = useCallback(() => {
    if (isEnabled) {
      setIsEnabled(false);
      disconnect();
    } else {
      setIsEnabled(true);
      connect();
    }
  }, [isEnabled, connect, disconnect]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (isEnabled) {
      connect();
    }
    
    return () => {
      disconnect();
    };
  }, []);

  // Reconnect when isEnabled changes
  useEffect(() => {
    if (isEnabled && connectionStatus === 'disconnected') {
      connect();
    }
  }, [isEnabled, connectionStatus, connect]);

  const dismissAnomaly = useCallback((id: string) => {
    setAnomalies(prev => prev.filter(a => a.id !== id));
  }, []);

  const activeAnomalies = useMemo(() => 
    anomalies.filter(a => !a.dismissed), 
    [anomalies]
  );

  const resetStats = useCallback(() => {
    setStats({ total: 0, announcements: 0, withdrawals: 0 });
    setUpdates([]);
    setAnomalies([]);
    seenPrefixesRef.current.clear();
  }, []);

  return (
    <div className="rounded-xl border border-gray-800 bg-gray-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10">
            <Radio className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              BGP Route Monitor
              <ConnectionStatus status={connectionStatus} error={connectionError} />
            </div>
            <div className="text-[11px] text-gray-500 flex items-center gap-2">
              <span>RIPE RIS Live Feed</span>
              <a 
                href="https://ris-live.ripe.net/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-500 hover:text-cyan-400 inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={resetStats}
            className="px-3 py-1.5 rounded-lg text-[11px] font-semibold border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800 transition-colors flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            Reset
          </button>
          <button
            type="button"
            onClick={toggleConnection}
            className={`
              px-3 py-1.5 rounded-lg text-[11px] font-semibold border transition-colors flex items-center gap-1.5
              ${isEnabled 
                ? 'border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                : 'border-green-500/40 bg-green-500/10 text-green-400 hover:bg-green-500/20'
              }
            `}
          >
            {isEnabled ? (
              <>
                <X className="w-3 h-3" />
                Disconnect
              </>
            ) : (
              <>
                <Zap className="w-3 h-3" />
                Connect
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-3 p-4 border-b border-gray-800">
        <StatCard 
          label="Total Updates" 
          value={stats.total.toLocaleString()} 
          icon={<Activity className="w-4 h-4" />}
          color={COLORS.cyan}
        />
        <StatCard 
          label="Announcements" 
          value={stats.announcements.toLocaleString()} 
          icon={<ArrowUp className="w-4 h-4" />}
          color={COLORS.green}
        />
        <StatCard 
          label="Withdrawals" 
          value={stats.withdrawals.toLocaleString()} 
          icon={<ArrowDown className="w-4 h-4" />}
          color={COLORS.red}
        />
        <StatCard 
          label="Anomalies" 
          value={activeAnomalies.length} 
          icon={<AlertTriangle className="w-4 h-4" />}
          color={activeAnomalies.length > 0 ? COLORS.yellow : COLORS.textMuted}
        />
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-x divide-gray-800">
        {/* Anomalies Panel */}
        <div className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-semibold text-white">
              Anomalies
            </span>
            {activeAnomalies.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-yellow-500/20 text-yellow-400">
                {activeAnomalies.length}
              </span>
            )}
          </div>
          
          <div className="h-[300px] overflow-y-auto pr-1">
            {activeAnomalies.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <Shield className="w-8 h-8 mb-2" />
                <div className="text-sm">No anomalies detected</div>
                <div className="text-[11px] text-center mt-1">
                  Monitoring for MOAS, bogon prefixes, and path anomalies
                </div>
              </div>
            ) : (
              activeAnomalies.map(anomaly => (
                <AnomalyCard 
                  key={anomaly.id} 
                  anomaly={anomaly} 
                  onDismiss={dismissAnomaly}
                />
              ))
            )}
          </div>
        </div>

        {/* Updates Panel */}
        <div className="lg:col-span-2 p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">
                Live BGP Updates
              </span>
              <span className="text-[11px] text-gray-500">
                ({updates.length})
              </span>
            </div>
            <div className="flex items-center gap-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-400" />
                Announce
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                Withdraw
              </span>
            </div>
          </div>

          {/* Table Header */}
          <div className="flex items-center gap-3 px-3 py-2 bg-gray-900/50 rounded-t-lg text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
            <div className="w-6">Type</div>
            <div className="flex-1">Prefix</div>
            <div className="w-28 text-right">Origin AS</div>
            <div className="w-16 text-right">Collector</div>
            <div className="w-16 text-right">Time</div>
          </div>

          {/* Updates List */}
          <div 
            ref={listRef}
            className="h-[268px] overflow-y-auto bg-gray-900/30 rounded-b-lg border border-gray-800"
          >
            {updates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-600">
                <Activity className="w-8 h-8 mb-2" />
                <div className="text-sm">
                  {connectionStatus === 'connecting' ? 'Connecting to RIPE RIS...' :
                   connectionStatus === 'connected' ? 'Waiting for BGP updates...' :
                   connectionStatus === 'error' ? 'Connection error' :
                   'Click Connect to start'}
                </div>
                <div className="text-[11px] mt-1">
                  Real-time BGP updates from global route collectors
                </div>
              </div>
            ) : (
              updates.map(update => (
                <UpdateRow key={update.id} update={update} />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/30 flex items-center justify-between text-[10px] text-gray-500">
        <div className="flex items-center gap-4">
          <span>Data: RIPE Routing Information Service (RIS)</span>
          <a 
            href="https://www.ripe.net/analyse/internet-measurements/routing-information-service-ris"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cyan-500 hover:text-cyan-400 inline-flex items-center gap-1"
          >
            Learn more
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="flex items-center gap-1">
          <Globe className="w-3 h-3" />
          RRC00 Amsterdam
        </div>
      </div>
    </div>
  );
});

BGPRouteMonitor.displayName = 'BGPRouteMonitor';
