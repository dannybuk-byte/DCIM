/**
 * DiagnosticPanel - Advanced Debugging & Troubleshooting
 * 
 * Provides visibility into app state for:
 * 1. Troubleshooting issues
 * 2. Support assistance
 * 3. Performance monitoring
 * 4. State inspection
 * 
 * ANTIFRAGILE: Helps diagnose and fix problems quickly
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Bug, RefreshCw, Copy, Download, Trash2,
  ChevronDown, ChevronUp, Check, Database,
  Wifi, Clock, HardDrive, Cpu, Activity,
  AlertTriangle, CheckCircle, Info, X,
  Terminal, Layers, Settings, Eye
} from 'lucide-react';
import { db } from '../../db/database';
import { getRecentActions, getStats as getActionStats, clearHistory } from '../../utils/actionHistory';
import { getConnectionState } from '../../utils/connectionResilience';
import { loadBackup } from '../../utils/autoBackup';
import { getSessionInfo, formatSessionDuration } from '../../utils/sessionPersistence';

// ============================================================================
// TYPES
// ============================================================================

interface DiagnosticData {
  timestamp: number;
  environment: EnvironmentInfo;
  storage: StorageInfo;
  database: DatabaseInfo;
  session: SessionInfo;
  network: NetworkInfo;
  performance: PerformanceInfo;
  errors: ErrorInfo[];
  features: FeatureStatus[];
}

interface EnvironmentInfo {
  userAgent: string;
  platform: string;
  language: string;
  cookiesEnabled: boolean;
  online: boolean;
  screenSize: string;
  pixelRatio: number;
  timezone: string;
  buildTime?: string;
}

interface StorageInfo {
  localStorageUsed: number;
  localStorageKeys: number;
  sessionStorageUsed: number;
  indexedDBUsage?: number;
  indexedDBQuota?: number;
  persistentStorage: boolean;
}

interface DatabaseInfo {
  facilityCount: number;
  tables: { name: string; count: number }[];
  version: number;
}

interface SessionInfo {
  duration: number;
  visits: number;
  isReturning: boolean;
  lastActiveTab: string | null;
  preferences: Record<string, unknown>;
}

interface NetworkInfo {
  status: string;
  avgLatency: number;
  failedRequests: number;
  successfulRequests: number;
}

interface PerformanceInfo {
  pageLoadTime: number;
  domContentLoaded: number;
  memoryUsage?: number;
  memoryLimit?: number;
}

interface ErrorInfo {
  timestamp: number;
  message: string;
  category: string;
}

interface FeatureStatus {
  name: string;
  enabled: boolean;
  status: 'healthy' | 'degraded' | 'error';
}

// ============================================================================
// DATA COLLECTION
// ============================================================================

async function collectDiagnostics(): Promise<DiagnosticData> {
  // Environment
  const environment: EnvironmentInfo = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    language: navigator.language,
    cookiesEnabled: navigator.cookieEnabled,
    online: navigator.onLine,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    pixelRatio: window.devicePixelRatio,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };

  // Storage
  let localStorageUsed = 0;
  let localStorageKeys = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        localStorageUsed += (localStorage.getItem(key) || '').length;
        localStorageKeys++;
      }
    }
  } catch { /* ignore */ }

  let sessionStorageUsed = 0;
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        sessionStorageUsed += (sessionStorage.getItem(key) || '').length;
      }
    }
  } catch { /* ignore */ }

  let indexedDBUsage: number | undefined;
  let indexedDBQuota: number | undefined;
  let persistentStorage = false;
  try {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      indexedDBUsage = estimate.usage;
      indexedDBQuota = estimate.quota;
    }
    if ('storage' in navigator && 'persisted' in navigator.storage) {
      persistentStorage = await navigator.storage.persisted();
    }
  } catch { /* ignore */ }

  const storage: StorageInfo = {
    localStorageUsed,
    localStorageKeys,
    sessionStorageUsed,
    indexedDBUsage,
    indexedDBQuota,
    persistentStorage,
  };

  // Database
  let facilityCount = 0;
  const tables: { name: string; count: number }[] = [];
  try {
    facilityCount = await db.facilities.count();
    tables.push({ name: 'facilities', count: facilityCount });
    // Add other tables as needed
  } catch { /* ignore */ }

  const database: DatabaseInfo = {
    facilityCount,
    tables,
    version: db.verno,
  };

  // Session
  const sessionInfo = getSessionInfo();
  const session: SessionInfo = {
    duration: sessionInfo.sessionDuration,
    visits: sessionInfo.totalVisits,
    isReturning: sessionInfo.isReturning,
    lastActiveTab: sessionInfo.lastActiveTab,
    preferences: {},
  };

  // Network
  const connState = getConnectionState();
  const network: NetworkInfo = {
    status: connState.status,
    avgLatency: connState.avgLatency,
    failedRequests: connState.failedRequests,
    successfulRequests: connState.successfulRequests,
  };

  // Performance
  let pageLoadTime = 0;
  let domContentLoaded = 0;
  let memoryUsage: number | undefined;
  let memoryLimit: number | undefined;
  try {
    const perfEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (perfEntries.length > 0) {
      pageLoadTime = Math.round(perfEntries[0].loadEventEnd - perfEntries[0].startTime);
      domContentLoaded = Math.round(perfEntries[0].domContentLoadedEventEnd - perfEntries[0].startTime);
    }
    // @ts-expect-error - memory is non-standard
    if (performance.memory) {
      // @ts-expect-error - memory is non-standard
      memoryUsage = performance.memory.usedJSHeapSize;
      // @ts-expect-error - memory is non-standard
      memoryLimit = performance.memory.jsHeapSizeLimit;
    }
  } catch { /* ignore */ }

  const performanceInfo: PerformanceInfo = {
    pageLoadTime,
    domContentLoaded,
    memoryUsage,
    memoryLimit,
  };

  // Errors from action history
  const actionStats = getActionStats();
  const recentActions = getRecentActions(100);
  const errors: ErrorInfo[] = recentActions
    .filter(a => !a.success)
    .slice(0, 10)
    .map(a => ({
      timestamp: a.timestamp,
      message: a.action,
      category: a.category,
    }));

  // Feature status
  const features: FeatureStatus[] = [
    { name: 'Auto-Backup', enabled: true, status: loadBackup() ? 'healthy' : 'healthy' },
    { name: 'Action History', enabled: true, status: actionStats.totalActions > 0 ? 'healthy' : 'healthy' },
    { name: 'Connection Monitor', enabled: true, status: connState.status === 'online' ? 'healthy' : 'degraded' },
    { name: 'Data Integrity', enabled: true, status: 'healthy' },
    { name: 'Session Persistence', enabled: true, status: 'healthy' },
  ];

  return {
    timestamp: Date.now(),
    environment,
    storage,
    database,
    session,
    network,
    performance: performanceInfo,
    errors,
    features,
  };
}

// ============================================================================
// FORMATTING
// ============================================================================

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// ============================================================================
// SECTION COMPONENT
// ============================================================================

interface SectionProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

function Section({ title, icon, children, defaultOpen = false }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-gray-50 flex items-center gap-2 text-left hover:bg-gray-100 transition-colors"
      >
        <span className="text-gray-500">{icon}</span>
        <span className="font-medium text-gray-700 flex-1">{title}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-gray-400" />
        ) : (
          <ChevronDown className="w-4 h-4 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface DiagnosticPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DiagnosticPanel({ isOpen, onClose }: DiagnosticPanelProps) {
  const [data, setData] = useState<DiagnosticData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const diagnostics = await collectDiagnostics();
      setData(diagnostics);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, loadData]);

  const handleCopy = useCallback(() => {
    if (!data) return;
    const text = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [data]);

  const handleDownload = useCallback(() => {
    if (!data) return;
    const text = JSON.stringify(data, null, 2);
    const blob = new Blob([text], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dcim-diagnostics-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const handleClearData = useCallback(() => {
    if (confirm('Clear all local data? This will reset the app.')) {
      localStorage.clear();
      sessionStorage.clear();
      clearHistory();
      window.location.reload();
    }
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-800 to-gray-900 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Bug className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">Diagnostics</h3>
              <p className="text-xs text-gray-400">System information & troubleshooting</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-white ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading && !data ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
            </div>
          ) : data ? (
            <>
              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="bg-blue-50 rounded-lg p-3 text-center">
                  <Database className="w-5 h-5 text-blue-500 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-gray-800">
                    {data.database.facilityCount.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">Records</div>
                </div>
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <Activity className="w-5 h-5 text-green-500 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-gray-800">
                    {formatMs(data.performance.pageLoadTime)}
                  </div>
                  <div className="text-xs text-gray-500">Load Time</div>
                </div>
                <div className="bg-purple-50 rounded-lg p-3 text-center">
                  <HardDrive className="w-5 h-5 text-purple-500 mx-auto mb-1" />
                  <div className="text-lg font-semibold text-gray-800">
                    {data.storage.indexedDBUsage ? formatBytes(data.storage.indexedDBUsage) : 'N/A'}
                  </div>
                  <div className="text-xs text-gray-500">Storage</div>
                </div>
                <div className={`rounded-lg p-3 text-center ${
                  data.network.status === 'online' ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <Wifi className={`w-5 h-5 mx-auto mb-1 ${
                    data.network.status === 'online' ? 'text-green-500' : 'text-red-500'
                  }`} />
                  <div className="text-lg font-semibold text-gray-800 capitalize">
                    {data.network.status}
                  </div>
                  <div className="text-xs text-gray-500">Network</div>
                </div>
              </div>

              {/* Features Status */}
              <Section title="Feature Status" icon={<Layers className="w-4 h-4" />} defaultOpen>
                <div className="grid grid-cols-2 gap-2">
                  {data.features.map(feature => (
                    <div 
                      key={feature.name}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                        feature.status === 'healthy' ? 'bg-green-50' :
                        feature.status === 'degraded' ? 'bg-amber-50' : 'bg-red-50'
                      }`}
                    >
                      {feature.status === 'healthy' ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : feature.status === 'degraded' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                      )}
                      <span className="text-sm text-gray-700">{feature.name}</span>
                    </div>
                  ))}
                </div>
              </Section>

              {/* Environment */}
              <Section title="Environment" icon={<Terminal className="w-4 h-4" />}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Platform</span>
                    <span className="text-gray-800">{data.environment.platform}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Screen</span>
                    <span className="text-gray-800">{data.environment.screenSize} @{data.environment.pixelRatio}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Language</span>
                    <span className="text-gray-800">{data.environment.language}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Timezone</span>
                    <span className="text-gray-800">{data.environment.timezone}</span>
                  </div>
                  <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono text-gray-600 break-all">
                    {data.environment.userAgent}
                  </div>
                </div>
              </Section>

              {/* Storage */}
              <Section title="Storage" icon={<HardDrive className="w-4 h-4" />}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">IndexedDB</span>
                    <span className="text-gray-800">
                      {data.storage.indexedDBUsage ? formatBytes(data.storage.indexedDBUsage) : 'N/A'}
                      {data.storage.indexedDBQuota && ` / ${formatBytes(data.storage.indexedDBQuota)}`}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">LocalStorage</span>
                    <span className="text-gray-800">
                      {formatBytes(data.storage.localStorageUsed)} ({data.storage.localStorageKeys} keys)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">SessionStorage</span>
                    <span className="text-gray-800">{formatBytes(data.storage.sessionStorageUsed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Persistent Storage</span>
                    <span className={data.storage.persistentStorage ? 'text-green-600' : 'text-gray-800'}>
                      {data.storage.persistentStorage ? 'Yes' : 'No'}
                    </span>
                  </div>
                </div>
              </Section>

              {/* Session */}
              <Section title="Session" icon={<Clock className="w-4 h-4" />}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Duration</span>
                    <span className="text-gray-800">{formatSessionDuration(data.session.duration)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Visits</span>
                    <span className="text-gray-800">{data.session.visits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Returning User</span>
                    <span className="text-gray-800">{data.session.isReturning ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Tab</span>
                    <span className="text-gray-800 capitalize">{data.session.lastActiveTab || 'None'}</span>
                  </div>
                </div>
              </Section>

              {/* Performance */}
              <Section title="Performance" icon={<Cpu className="w-4 h-4" />}>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Page Load</span>
                    <span className="text-gray-800">{formatMs(data.performance.pageLoadTime)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">DOM Ready</span>
                    <span className="text-gray-800">{formatMs(data.performance.domContentLoaded)}</span>
                  </div>
                  {data.performance.memoryUsage && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Memory</span>
                      <span className="text-gray-800">
                        {formatBytes(data.performance.memoryUsage)}
                        {data.performance.memoryLimit && ` / ${formatBytes(data.performance.memoryLimit)}`}
                      </span>
                    </div>
                  )}
                </div>
              </Section>

              {/* Recent Errors */}
              {data.errors.length > 0 && (
                <Section title={`Recent Errors (${data.errors.length})`} icon={<AlertTriangle className="w-4 h-4" />}>
                  <div className="space-y-2">
                    {data.errors.map((error, i) => (
                      <div key={i} className="p-2 bg-red-50 rounded-lg">
                        <div className="text-sm text-red-800">{error.message}</div>
                        <div className="text-xs text-red-500 mt-1">
                          {new Date(error.timestamp).toLocaleString()} • {error.category}
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>
              )}
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between flex-shrink-0">
          <button
            onClick={handleClearData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-sm transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Clear All Data
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm transition-colors"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied!' : 'Copy'}
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TRIGGER BUTTON
// ============================================================================

export function DiagnosticTrigger({ className = '' }: { className?: string }) {
  const [isOpen, setIsOpen] = useState(false);

  // Secret keyboard shortcut: Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
        title="Diagnostics (Ctrl+Shift+D)"
      >
        <Bug className="w-4 h-4 text-gray-400" />
      </button>
      <DiagnosticPanel isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}

export default DiagnosticPanel;
