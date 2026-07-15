/**
 * Database Health Monitor Component
 *
 * Visual dashboard for IndexedDB status, quota usage, recovery, and automated backups
 * Part of Phase 1c & Phase 4: Critical Safeguards + Backup & Recovery
 */

import React, { useEffect, useState } from 'react';
import { Database, Download, AlertTriangle, CheckCircle, Trash2, RefreshCw, Clock } from 'lucide-react';
import {
  checkDatabaseHealth,
  checkQuota,
  downloadBackup,
  clearAllData,
  autoCleanupIfNeeded,
} from '../utils/dbRecovery';
import {
  getBackupSchedule,
  setBackupSchedule,
  backupNow,
  getTimeUntilNextBackup,
  type BackupSchedule,
} from '../utils/automatedBackupManager';
import { useDbInit } from '../hooks/useDbInit';
import { DbInitStatusBanner } from './DbInitStatusBanner';
import {
  buildDbDiagnostic,
  canEnableDestructiveControl,
  exportAndAcknowledge,
  getDestructivePrepState,
} from '../utils/dbDiagnosticGate';

interface DBHealth {
  healthy: boolean;
  facilityCount: number;
  error?: string;
}

interface QuotaInfo {
  usage: number;
  quota: number;
  percentage: number;
  available: number;
}

export const DatabaseHealthMonitor: React.FC = () => {
  const { state: dbInit, retry: retryDbInit } = useDbInit();
  const [health, setHealth] = useState<DBHealth>({ healthy: true, facilityCount: 0 });
  const [quota, setQuota] = useState<QuotaInfo>({
    usage: 0,
    quota: 0,
    percentage: 0,
    available: 0,
  });
  const [backupSchedule, setBackupScheduleState] = useState<BackupSchedule>(getBackupSchedule());
  const [timeUntilBackup, setTimeUntilBackup] = useState<number>(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isCapturingDiagnostic, setIsCapturingDiagnostic] = useState(false);
  const [lastCheck, setLastCheck] = useState<Date>(new Date());
  const [prepTick, setPrepTick] = useState(0);

  const destructiveEnabled = canEnableDestructiveControl();
  void prepTick;

  const checkHealth = async () => {
    const healthData = await checkDatabaseHealth();
    const quotaData = await checkQuota();
    const schedule = getBackupSchedule();

    setHealth(healthData);
    setQuota(quotaData);
    setBackupScheduleState(schedule);
    setTimeUntilBackup(getTimeUntilNextBackup());
    setLastCheck(new Date());

    if (quotaData.percentage > 80) {
      await autoCleanupIfNeeded();
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(() => {
      checkHealth();
      setTimeUntilBackup(getTimeUntilNextBackup());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const refreshPrep = () => setPrepTick((n) => n + 1);

  const handleCaptureDiagnostic = async () => {
    setIsCapturingDiagnostic(true);
    try {
      await buildDbDiagnostic(dbInit.kind, health.error);
      refreshPrep();
      alert('Diagnostic captured for this session. Destructive controls may unlock.');
    } catch (error) {
      alert(`Diagnostic failed: ${error}`);
    } finally {
      setIsCapturingDiagnostic(false);
    }
  };

  const handleRecovery = async () => {
    if (!canEnableDestructiveControl()) {
      alert('Export a backup or capture a diagnostic before any rebuild control is available.');
      return;
    }

    if (
      !confirm(
        'Destructive rebuild is quarantined. This will NOT delete or reseed the database. Continue to acknowledge only?',
      )
    ) {
      return;
    }

    setIsRecovering(true);
    try {
      // Quarantine Q1: do not call recoverDatabase() / deleteDatabase() / seedDatabase().
      alert(
        'Rebuild deferred: destructive recovery remains frozen pending a separate principal ruling (database name + redesign). Prior data was not modified.',
      );
      await checkHealth();
    } finally {
      setIsRecovering(false);
    }
  };

  const handleClear = async () => {
    if (!canEnableDestructiveControl()) {
      alert('Export a backup or capture a diagnostic before clearing data.');
      return;
    }

    if (!confirm('⚠️ This will delete ALL local data. Are you sure?')) {
      return;
    }

    setIsClearing(true);
    try {
      await clearAllData();
      await checkHealth();
      alert('✅ Data cleared successfully!');
    } catch (error) {
      alert(`❌ Clear failed: ${error}`);
    } finally {
      setIsClearing(false);
    }
  };

  const handleDownloadBackup = async () => {
    setIsBackingUp(true);
    try {
      await downloadBackup();
      await exportAndAcknowledge();
      refreshPrep();
    } catch (error) {
      alert(`❌ Backup failed: ${error}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleBackupNow = async () => {
    setIsBackingUp(true);
    try {
      await backupNow();
      await checkHealth();
      alert('✅ Backup completed successfully!');
    } catch (error) {
      alert(`❌ Backup failed: ${error}`);
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleScheduleChange = (updates: Partial<BackupSchedule>) => {
    setBackupSchedule(updates);
    setBackupScheduleState(getBackupSchedule());
    setTimeUntilBackup(getTimeUntilNextBackup());
  };

  const formatTimeUntil = (ms: number): string => {
    if (ms <= 0) return 'Due now';
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h`;
    return `${Math.floor(ms / (1000 * 60))}m`;
  };

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const getQuotaColor = (percentage: number): string => {
    if (percentage >= 90) return 'text-red-400 bg-red-500/10 border-red-500/30';
    if (percentage >= 70) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-green-400 bg-green-500/10 border-green-500/30';
  };

  const prep = getDestructivePrepState();

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Database className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Database Health Monitor</h3>
        <button
          onClick={checkHealth}
          className="ml-auto p-1 hover:bg-slate-700/50 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <DbInitStatusBanner
        state={dbInit}
        onRetry={retryDbInit}
        onReload={() => window.location.reload()}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div
          className={`border rounded-lg p-4 ${
            health.healthy
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <div className="flex items-center gap-2 mb-2">
            {health.healthy ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
            <span className="font-semibold">Database Status</span>
          </div>

          <div className="space-y-1 text-sm">
            <div>
              Status: <strong>{health.healthy ? 'Healthy' : 'Unhealthy'}</strong>
            </div>
            <div>
              Facilities: <strong>{health.facilityCount.toLocaleString()}</strong>
            </div>
            {health.error && (
              <div className="mt-2 p-2 bg-black/20 rounded text-xs">Error: {health.error}</div>
            )}
            <div className="text-xs opacity-60 mt-2">
              Last checked: {lastCheck.toLocaleTimeString()}
            </div>
          </div>
        </div>

        <div className={`border rounded-lg p-4 ${getQuotaColor(quota.percentage)}`}>
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-5 h-5" />
            <span className="font-semibold">Storage Quota</span>
          </div>

          <div className="space-y-2">
            <div className="relative h-3 bg-black/30 rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-current transition-all duration-300"
                style={{ width: `${Math.min(quota.percentage, 100)}%` }}
              />
            </div>

            <div className="text-sm space-y-1">
              <div>
                Used: <strong>{formatBytes(quota.usage)}</strong>
              </div>
              <div>
                Total: <strong>{formatBytes(quota.quota)}</strong>
              </div>
              <div>
                Available: <strong>{formatBytes(quota.available)}</strong>
              </div>
              <div className="font-mono text-lg">{quota.percentage.toFixed(1)}%</div>
            </div>

            {quota.percentage > 80 && (
              <div className="mt-2 p-2 bg-black/20 rounded text-xs">
                ⚠️ Auto-cleanup will run when &gt;80% full
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="mb-2 text-xs text-slate-400">
          Session prep:{' '}
          {destructiveEnabled
            ? `ready${prep.exportedAt ? ' (export)' : ''}${prep.diagnosticCapturedAt ? ' (diagnostic)' : ''}`
            : 'export or capture diagnostic to unlock rebuild/clear'}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleDownloadBackup}
            disabled={isBackingUp}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 rounded text-blue-300 text-sm transition-colors disabled:opacity-50"
          >
            <Download className={`w-4 h-4 ${isBackingUp ? 'animate-bounce' : ''}`} />
            {isBackingUp ? 'Backing up...' : 'Download Backup'}
          </button>

          <button
            onClick={handleCaptureDiagnostic}
            disabled={isCapturingDiagnostic}
            className="flex items-center gap-2 px-3 py-2 bg-slate-600/30 hover:bg-slate-600/40 border border-slate-500/40 rounded text-slate-200 text-sm transition-colors disabled:opacity-50"
            data-db-diagnostic="capture"
          >
            {isCapturingDiagnostic ? 'Capturing…' : 'Capture Diagnostic'}
          </button>

          <button
            onClick={handleRecovery}
            disabled={isRecovering || !destructiveEnabled}
            className="flex items-center gap-2 px-3 py-2 bg-orange-600/20 hover:bg-orange-600/30 border border-orange-500/30 rounded text-orange-300 text-sm transition-colors disabled:opacity-50"
            data-destructive-control="rebuild"
            title={
              destructiveEnabled
                ? 'Rebuild gated; destructive path quarantined'
                : 'Export or capture diagnostic first'
            }
          >
            <RefreshCw className={`w-4 h-4 ${isRecovering ? 'animate-spin' : ''}`} />
            {isRecovering ? 'Recovering...' : 'Recover DB'}
          </button>

          <button
            onClick={handleClear}
            disabled={isClearing || !destructiveEnabled}
            className="flex items-center gap-2 px-3 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded text-red-300 text-sm transition-colors disabled:opacity-50"
            data-destructive-control="clear"
          >
            <Trash2 className={`w-4 h-4 ${isClearing ? 'animate-spin' : ''}`} />
            {isClearing ? 'Clearing...' : 'Clear All Data'}
          </button>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-cyan-400" />
          <h4 className="font-semibold text-white">Automated Backups</h4>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={backupSchedule.enabled}
                onChange={(e) => handleScheduleChange({ enabled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
              />
              <span className="text-white">Enable automatic backups</span>
            </label>

            <div className="text-sm">
              <label className="block text-slate-400 mb-1">Frequency</label>
              <select
                value={backupSchedule.frequency}
                onChange={(e) =>
                  handleScheduleChange({ frequency: e.target.value as BackupSchedule['frequency'] })
                }
                disabled={!backupSchedule.enabled}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none disabled:opacity-50"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="manual">Manual only</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {backupSchedule.lastBackup && (
              <div className="text-sm">
                <div className="text-slate-400">Last backup:</div>
                <div className="text-white font-mono">
                  {new Date(backupSchedule.lastBackup).toLocaleString()}
                </div>
              </div>
            )}

            {backupSchedule.nextBackup && backupSchedule.enabled && (
              <div className="text-sm">
                <div className="text-slate-400">Next backup:</div>
                <div className="text-white font-mono">{formatTimeUntil(timeUntilBackup)}</div>
              </div>
            )}

            {!backupSchedule.lastBackup && (
              <div className="text-sm text-yellow-400">No backups yet - click &quot;Backup Now&quot;</div>
            )}

            {backupSchedule.lastError && (
              <div className="text-sm text-red-400">
                Last backup failed: {backupSchedule.lastError}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleBackupNow}
          disabled={isBackingUp}
          className="w-full md:w-auto px-4 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded text-cyan-300 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {isBackingUp ? 'Creating Backup...' : 'Backup Now'}
        </button>
      </div>

      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-300">
        <Database className="w-3 h-3 inline mr-1" />
        <strong>Recovery policy:</strong> Automatic delete/reseed is disabled. Export or capture a
        diagnostic before rebuild/clear controls unlock; destructive rebuild remains quarantined.
      </div>
    </div>
  );
};
