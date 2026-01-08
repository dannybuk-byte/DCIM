/**
 * SystemHealthDashboard - Antifragile System Monitoring UI
 * 
 * Surfaces existing resilience features to users:
 * - Database connection status
 * - Circuit breaker states
 * - Error tracking
 * - Storage usage
 * - Network status
 * 
 * ANTIFRAGILE: Read-only monitoring - no system modifications
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Activity, Database, Wifi, WifiOff, Shield, AlertTriangle, 
  CheckCircle, XCircle, RefreshCw, HardDrive, Zap, Clock,
  ChevronDown, ChevronUp, Eye, EyeOff
} from 'lucide-react';
import { db } from '../../db/database';
import { getSessionInfo, formatSessionDuration } from '../../utils/sessionPersistence';

// ============================================================================
// TYPES
// ============================================================================

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'error' | 'unknown';
  message: string;
  lastChecked: Date;
  details?: Record<string, unknown>;
}

interface SystemHealth {
  database: HealthStatus;
  network: HealthStatus;
  storage: HealthStatus;
  errorRate: HealthStatus;
  circuitBreakers: HealthStatus;
  agents: HealthStatus;
}

// ============================================================================
// HEALTH CHECK FUNCTIONS
// ============================================================================

async function checkDatabaseHealth(): Promise<HealthStatus> {
  const start = Date.now();
  try {
    const count = await db.facilities.count();
    const latency = Date.now() - start;
    
    return {
      status: latency < 100 ? 'healthy' : latency < 500 ? 'degraded' : 'error',
      message: `${count.toLocaleString()} facilities loaded (${latency}ms)`,
      lastChecked: new Date(),
      details: { facilityCount: count, latencyMs: latency }
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Database error',
      lastChecked: new Date(),
    };
  }
}

function checkNetworkHealth(): HealthStatus {
  const online = navigator.onLine;
  return {
    status: online ? 'healthy' : 'error',
    message: online ? 'Connected to network' : 'Offline - using cached data',
    lastChecked: new Date(),
    details: { online }
  };
}

async function checkStorageHealth(): Promise<HealthStatus> {
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usedMB = (estimate.usage || 0) / (1024 * 1024);
      const quotaMB = (estimate.quota || 0) / (1024 * 1024);
      const usagePercent = quotaMB > 0 ? (usedMB / quotaMB) * 100 : 0;
      
      return {
        status: usagePercent < 50 ? 'healthy' : usagePercent < 80 ? 'degraded' : 'error',
        message: `${usedMB.toFixed(1)}MB used of ${quotaMB.toFixed(0)}MB (${usagePercent.toFixed(1)}%)`,
        lastChecked: new Date(),
        details: { usedMB, quotaMB, usagePercent }
      };
    }
    return {
      status: 'unknown',
      message: 'Storage API not available',
      lastChecked: new Date(),
    };
  } catch {
    return {
      status: 'unknown',
      message: 'Unable to check storage',
      lastChecked: new Date(),
    };
  }
}

function checkErrorRate(): HealthStatus {
  try {
    const errorLog = localStorage.getItem('dcim_error_log');
    const errors = errorLog ? JSON.parse(errorLog) : [];
    const recentErrors = errors.filter((e: { timestamp: number }) => 
      Date.now() - e.timestamp < 3600000 // Last hour
    );
    
    const errorCount = recentErrors.length;
    return {
      status: errorCount === 0 ? 'healthy' : errorCount < 5 ? 'degraded' : 'error',
      message: errorCount === 0 ? 'No errors in last hour' : `${errorCount} errors in last hour`,
      lastChecked: new Date(),
      details: { errorCount, recentErrors: recentErrors.slice(0, 5) }
    };
  } catch {
    return {
      status: 'healthy',
      message: 'Error tracking active',
      lastChecked: new Date(),
    };
  }
}

function checkCircuitBreakers(): HealthStatus {
  try {
    // Check for any tripped circuit breakers in localStorage
    const cbStates: Record<string, string> = {};
    let trippedCount = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith('cb_')) {
        const state = localStorage.getItem(key);
        cbStates[key] = state || 'unknown';
        if (state === 'open') trippedCount++;
      }
    }
    
    return {
      status: trippedCount === 0 ? 'healthy' : 'degraded',
      message: trippedCount === 0 ? 'All circuits closed' : `${trippedCount} circuit(s) open`,
      lastChecked: new Date(),
      details: { cbStates, trippedCount }
    };
  } catch {
    return {
      status: 'healthy',
      message: 'Circuit breakers active',
      lastChecked: new Date(),
    };
  }
}

async function checkAgentHealth(): Promise<HealthStatus> {
  try {
    const approvals = await db.table('agentApprovals').count().catch(() => 0);
    
    return {
      status: 'healthy',
      message: `Agent system active (${approvals} pending)`,
      lastChecked: new Date(),
      details: { pendingApprovals: approvals }
    };
  } catch {
    return {
      status: 'unknown',
      message: 'Agent system initializing',
      lastChecked: new Date(),
    };
  }
}

// ============================================================================
// HOOK
// ============================================================================

export function useSystemHealth(autoRefreshMs = 30000) {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastFullCheck, setLastFullCheck] = useState<Date | null>(null);

  const checkAll = useCallback(async () => {
    setIsChecking(true);
    try {
      const [database, storage, agents] = await Promise.all([
        checkDatabaseHealth(),
        checkStorageHealth(),
        checkAgentHealth(),
      ]);

      setHealth({
        database,
        network: checkNetworkHealth(),
        storage,
        errorRate: checkErrorRate(),
        circuitBreakers: checkCircuitBreakers(),
        agents,
      });
      setLastFullCheck(new Date());
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    checkAll();
    const interval = setInterval(checkAll, autoRefreshMs);
    return () => clearInterval(interval);
  }, [checkAll, autoRefreshMs]);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setHealth(h => h ? { ...h, network: checkNetworkHealth() } : null);
    const handleOffline = () => setHealth(h => h ? { ...h, network: checkNetworkHealth() } : null);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { health, isChecking, lastFullCheck, refresh: checkAll };
}

// ============================================================================
// COMPONENTS
// ============================================================================

const StatusIcon = ({ status }: { status: HealthStatus['status'] }) => {
  switch (status) {
    case 'healthy':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'degraded':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'error':
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Activity className="w-4 h-4 text-gray-400" />;
  }
};

const StatusBadge = ({ status }: { status: HealthStatus['status'] }) => {
  const colors = {
    healthy: 'bg-green-100 text-green-700 border-green-200',
    degraded: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    error: 'bg-red-100 text-red-700 border-red-200',
    unknown: 'bg-gray-100 text-gray-700 border-gray-200',
  };
  
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${colors[status]}`}>
      {status}
    </span>
  );
};

interface HealthCardProps {
  title: string;
  icon: React.ReactNode;
  health: HealthStatus;
  expandable?: boolean;
}

const HealthCard = ({ title, icon, health, expandable = false }: HealthCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  return (
    <div className={`bg-white rounded-lg border ${
      health.status === 'healthy' ? 'border-green-200' :
      health.status === 'degraded' ? 'border-yellow-200' :
      health.status === 'error' ? 'border-red-200' :
      'border-gray-200'
    } overflow-hidden`}>
      <div 
        className={`p-3 flex items-center gap-3 ${expandable ? 'cursor-pointer hover:bg-gray-50' : ''}`}
        onClick={() => expandable && setIsExpanded(!isExpanded)}
      >
        <div className={`p-2 rounded-lg ${
          health.status === 'healthy' ? 'bg-green-100' :
          health.status === 'degraded' ? 'bg-yellow-100' :
          health.status === 'error' ? 'bg-red-100' :
          'bg-gray-100'
        }`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-800">{title}</span>
            <StatusIcon status={health.status} />
          </div>
          <p className="text-xs text-gray-500 truncate">{health.message}</p>
        </div>
        {expandable && (
          isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </div>
      {expandable && isExpanded && health.details && (
        <div className="px-3 pb-3 pt-0 border-t border-gray-100">
          <pre className="text-[10px] text-gray-600 bg-gray-50 p-2 rounded mt-2 overflow-x-auto">
            {JSON.stringify(health.details, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SESSION INDICATOR
// ============================================================================

const SessionIndicator = () => {
  const sessionInfo = getSessionInfo();
  
  if (!sessionInfo.sessionDuration) return null;
  
  return (
    <span className="text-[10px] text-gray-400 flex items-center gap-1">
      •
      Session: {formatSessionDuration(sessionInfo.sessionDuration)}
      {sessionInfo.isReturningUser && (
        <span className="text-green-500" title={`Last visit: ${sessionInfo.lastVisit?.toLocaleDateString()}`}>
          (returning)
        </span>
      )}
    </span>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface SystemHealthDashboardProps {
  variant?: 'full' | 'compact' | 'minimal';
  className?: string;
}

export function SystemHealthDashboard({ 
  variant = 'compact',
  className = '' 
}: SystemHealthDashboardProps) {
  const { health, isChecking, lastFullCheck, refresh } = useSystemHealth();
  const [isVisible, setIsVisible] = useState(true);

  if (!health) {
    return (
      <div className={`flex items-center gap-2 text-gray-400 ${className}`}>
        <RefreshCw className="w-4 h-4 animate-spin" />
        <span className="text-sm">Checking system health...</span>
      </div>
    );
  }

  const overallStatus = Object.values(health).every(h => h.status === 'healthy') ? 'healthy' :
    Object.values(health).some(h => h.status === 'error') ? 'error' : 'degraded';

  // Minimal variant - just a status indicator
  if (variant === 'minimal') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <StatusIcon status={overallStatus} />
        <span className={`text-xs ${
          overallStatus === 'healthy' ? 'text-green-600' :
          overallStatus === 'degraded' ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          System {overallStatus}
        </span>
      </div>
    );
  }

  // Compact variant - collapsible bar
  if (variant === 'compact') {
    return (
      <div className={`bg-gray-50 border border-gray-200 rounded-lg overflow-hidden ${className}`}>
        <button
          onClick={() => setIsVisible(!isVisible)}
          className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-100 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className={`w-4 h-4 ${
              overallStatus === 'healthy' ? 'text-green-600' :
              overallStatus === 'degraded' ? 'text-yellow-600' :
              'text-red-600'
            }`} />
            <span className="text-sm font-medium text-gray-700">System Health</span>
            <StatusBadge status={overallStatus} />
          </div>
          <div className="flex items-center gap-2">
            {isChecking && <RefreshCw className="w-3 h-3 animate-spin text-gray-400" />}
            {isVisible ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
          </div>
        </button>
        
        {isVisible && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <HealthCard 
                title="Database" 
                icon={<Database className="w-4 h-4 text-blue-600" />} 
                health={health.database}
                expandable
              />
              <HealthCard 
                title="Network" 
                icon={health.network.status === 'healthy' ? 
                  <Wifi className="w-4 h-4 text-green-600" /> : 
                  <WifiOff className="w-4 h-4 text-red-600" />
                } 
                health={health.network}
              />
              <HealthCard 
                title="Storage" 
                icon={<HardDrive className="w-4 h-4 text-purple-600" />} 
                health={health.storage}
                expandable
              />
              <HealthCard 
                title="Error Rate" 
                icon={<AlertTriangle className="w-4 h-4 text-orange-600" />} 
                health={health.errorRate}
                expandable
              />
              <HealthCard 
                title="Circuit Breakers" 
                icon={<Zap className="w-4 h-4 text-yellow-600" />} 
                health={health.circuitBreakers}
                expandable
              />
              <HealthCard 
                title="AI Agents" 
                icon={<Activity className="w-4 h-4 text-indigo-600" />} 
                health={health.agents}
                expandable
              />
            </div>
            
            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
              <div className="flex items-center gap-3">
                <span className="text-[10px] text-gray-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  Last check: {lastFullCheck?.toLocaleTimeString()}
                </span>
                <SessionIndicator />
              </div>
              <button
                onClick={refresh}
                disabled={isChecking}
                className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full variant - detailed dashboard
  return (
    <div className={`bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
      <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className={`w-5 h-5 ${
            overallStatus === 'healthy' ? 'text-green-600' :
            overallStatus === 'degraded' ? 'text-yellow-600' :
            'text-red-600'
          }`} />
          <h3 className="font-semibold text-gray-800">System Health Monitor</h3>
          <StatusBadge status={overallStatus} />
        </div>
        <button
          onClick={refresh}
          disabled={isChecking}
          className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-1 disabled:opacity-50"
        >
          <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>
      
      <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-3">
        <HealthCard 
          title="Database" 
          icon={<Database className="w-4 h-4 text-blue-600" />} 
          health={health.database}
          expandable
        />
        <HealthCard 
          title="Network" 
          icon={health.network.status === 'healthy' ? 
            <Wifi className="w-4 h-4 text-green-600" /> : 
            <WifiOff className="w-4 h-4 text-red-600" />
          } 
          health={health.network}
        />
        <HealthCard 
          title="Storage" 
          icon={<HardDrive className="w-4 h-4 text-purple-600" />} 
          health={health.storage}
          expandable
        />
        <HealthCard 
          title="Error Rate" 
          icon={<AlertTriangle className="w-4 h-4 text-orange-600" />} 
          health={health.errorRate}
          expandable
        />
        <HealthCard 
          title="Circuit Breakers" 
          icon={<Zap className="w-4 h-4 text-yellow-600" />} 
          health={health.circuitBreakers}
          expandable
        />
        <HealthCard 
          title="AI Agents" 
          icon={<Activity className="w-4 h-4 text-indigo-600" />} 
          health={health.agents}
          expandable
        />
      </div>
      
      <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
        <span className="text-[10px] text-gray-400">
          🛡️ Antifragile monitoring • Auto-refresh every 30s
        </span>
        <span className="text-[10px] text-gray-400 flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {lastFullCheck?.toLocaleTimeString()}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// NETWORK STATUS BANNER
// ============================================================================

export function NetworkStatusBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showBanner, setShowBanner] = useState(!navigator.onLine);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Show "back online" message briefly
      setShowBanner(true);
      setTimeout(() => setShowBanner(false), 3000);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all ${
      isOnline 
        ? 'bg-green-500 text-white' 
        : 'bg-yellow-500 text-yellow-900'
    }`}>
      {isOnline ? (
        <span className="flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4" />
          Back online
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" />
          You're offline - using cached data
        </span>
      )}
    </div>
  );
}

export default SystemHealthDashboard;
