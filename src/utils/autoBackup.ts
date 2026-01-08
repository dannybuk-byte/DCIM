/**
 * Auto-Backup System - Silent Antifragile Protection
 * 
 * Automatically saves application state to localStorage:
 * - Periodic snapshots every 60 seconds
 * - Crash detection and recovery
 * - Lightweight - only saves essential state
 * 
 * ANTIFRAGILE: Works silently, never interrupts user
 * Provides safety net without requiring user action
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AutoBackupState {
  timestamp: number;
  sessionId: string;
  wasCleanShutdown: boolean;
  state: {
    activeTab?: string;
    filters?: Record<string, unknown>;
    searchQuery?: string;
    expandedSections?: string[];
  };
  metadata: {
    facilityCount: number;
    lastAction?: string;
  };
}

export interface RecoveryInfo {
  hasRecoveryData: boolean;
  crashDetected: boolean;
  lastBackup: Date | null;
  sessionAge: string;
  state: AutoBackupState['state'] | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const BACKUP_KEY = 'dcim_auto_backup';
const SESSION_KEY = 'dcim_session_id';
const SHUTDOWN_KEY = 'dcim_clean_shutdown';
const BACKUP_INTERVAL_MS = 60000; // 1 minute
const MAX_BACKUP_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentSessionId(): string {
  let sessionId = sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = generateSessionId();
    sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

// ============================================================================
// BACKUP FUNCTIONS
// ============================================================================

/**
 * Save current state to localStorage
 */
export function saveBackup(state: AutoBackupState['state'], metadata: AutoBackupState['metadata']): boolean {
  try {
    const backup: AutoBackupState = {
      timestamp: Date.now(),
      sessionId: getCurrentSessionId(),
      wasCleanShutdown: false,
      state,
      metadata,
    };
    
    localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    return true;
  } catch (error) {
    console.warn('[AutoBackup] Failed to save backup:', error);
    return false;
  }
}

/**
 * Load the most recent backup
 */
export function loadBackup(): AutoBackupState | null {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return null;
    
    const backup: AutoBackupState = JSON.parse(raw);
    
    // Check if backup is too old
    if (Date.now() - backup.timestamp > MAX_BACKUP_AGE_MS) {
      clearBackup();
      return null;
    }
    
    return backup;
  } catch (error) {
    console.warn('[AutoBackup] Failed to load backup:', error);
    return null;
  }
}

/**
 * Clear backup data
 */
export function clearBackup(): void {
  try {
    localStorage.removeItem(BACKUP_KEY);
  } catch {
    // Ignore errors
  }
}

/**
 * Mark clean shutdown (called when user navigates away properly)
 */
export function markCleanShutdown(): void {
  try {
    const backup = loadBackup();
    if (backup) {
      backup.wasCleanShutdown = true;
      localStorage.setItem(BACKUP_KEY, JSON.stringify(backup));
    }
    localStorage.setItem(SHUTDOWN_KEY, 'true');
  } catch {
    // Ignore errors
  }
}

/**
 * Check if last shutdown was clean
 */
export function wasLastShutdownClean(): boolean {
  try {
    return localStorage.getItem(SHUTDOWN_KEY) === 'true';
  } catch {
    return true; // Assume clean if we can't check
  }
}

/**
 * Clear shutdown flag (called on app start)
 */
export function clearShutdownFlag(): void {
  try {
    localStorage.removeItem(SHUTDOWN_KEY);
  } catch {
    // Ignore errors
  }
}

// ============================================================================
// RECOVERY DETECTION
// ============================================================================

/**
 * Check if there's recoverable data from a crash
 */
export function checkForRecovery(): RecoveryInfo {
  const backup = loadBackup();
  const wasClean = wasLastShutdownClean();
  const currentSessionId = getCurrentSessionId();
  
  // No backup exists
  if (!backup) {
    return {
      hasRecoveryData: false,
      crashDetected: false,
      lastBackup: null,
      sessionAge: '',
      state: null,
    };
  }
  
  // Same session - no recovery needed
  if (backup.sessionId === currentSessionId) {
    return {
      hasRecoveryData: false,
      crashDetected: false,
      lastBackup: new Date(backup.timestamp),
      sessionAge: '',
      state: null,
    };
  }
  
  // Different session - check if it was a crash
  const crashDetected = !wasClean && !backup.wasCleanShutdown;
  const ageMs = Date.now() - backup.timestamp;
  const sessionAge = formatAge(ageMs);
  
  return {
    hasRecoveryData: true,
    crashDetected,
    lastBackup: new Date(backup.timestamp),
    sessionAge,
    state: backup.state,
  };
}

function formatAge(ms: number): string {
  if (ms < 60000) return 'just now';
  if (ms < 3600000) return `${Math.floor(ms / 60000)} min ago`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hr ago`;
  return `${Math.floor(ms / 86400000)} days ago`;
}

// ============================================================================
// AUTO-BACKUP SERVICE
// ============================================================================

let backupInterval: ReturnType<typeof setInterval> | null = null;
let stateGetter: (() => { state: AutoBackupState['state']; metadata: AutoBackupState['metadata'] }) | null = null;

/**
 * Start automatic backup service
 */
export function startAutoBackup(
  getState: () => { state: AutoBackupState['state']; metadata: AutoBackupState['metadata'] }
): void {
  // Clear shutdown flag from previous session
  clearShutdownFlag();
  
  // Store state getter
  stateGetter = getState;
  
  // Stop any existing interval
  stopAutoBackup();
  
  // Start periodic backups
  backupInterval = setInterval(() => {
    if (stateGetter) {
      const { state, metadata } = stateGetter();
      saveBackup(state, metadata);
    }
  }, BACKUP_INTERVAL_MS);
  
  // Save initial backup
  const { state, metadata } = getState();
  saveBackup(state, metadata);
  
  // Register cleanup handlers
  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('pagehide', handlePageHide);
  
  console.log('[AutoBackup] Service started');
}

/**
 * Stop automatic backup service
 */
export function stopAutoBackup(): void {
  if (backupInterval) {
    clearInterval(backupInterval);
    backupInterval = null;
  }
  
  window.removeEventListener('beforeunload', handleBeforeUnload);
  window.removeEventListener('pagehide', handlePageHide);
}

function handleBeforeUnload(): void {
  // Save final backup and mark clean shutdown
  if (stateGetter) {
    const { state, metadata } = stateGetter();
    saveBackup(state, metadata);
  }
  markCleanShutdown();
}

function handlePageHide(): void {
  markCleanShutdown();
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useEffect, useCallback, useState } from 'react';

interface UseAutoBackupOptions {
  activeTab?: string;
  filters?: Record<string, unknown>;
  searchQuery?: string;
  facilityCount: number;
}

interface UseAutoBackupReturn {
  recoveryInfo: RecoveryInfo;
  dismissRecovery: () => void;
  applyRecovery: () => AutoBackupState['state'] | null;
}

/**
 * React hook for auto-backup functionality
 */
export function useAutoBackup(options: UseAutoBackupOptions): UseAutoBackupReturn {
  const [recoveryInfo, setRecoveryInfo] = useState<RecoveryInfo>(() => checkForRecovery());
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);

  // Start auto-backup on mount
  useEffect(() => {
    startAutoBackup(() => ({
      state: {
        activeTab: options.activeTab,
        filters: options.filters,
        searchQuery: options.searchQuery,
      },
      metadata: {
        facilityCount: options.facilityCount,
        lastAction: 'auto-backup',
      },
    }));

    return () => {
      stopAutoBackup();
    };
  }, [options.activeTab, options.filters, options.searchQuery, options.facilityCount]);

  const dismissRecovery = useCallback(() => {
    setRecoveryDismissed(true);
    clearBackup();
    setRecoveryInfo({
      hasRecoveryData: false,
      crashDetected: false,
      lastBackup: null,
      sessionAge: '',
      state: null,
    });
  }, []);

  const applyRecovery = useCallback(() => {
    const backup = loadBackup();
    if (backup?.state) {
      clearBackup();
      setRecoveryDismissed(true);
      setRecoveryInfo({
        hasRecoveryData: false,
        crashDetected: false,
        lastBackup: null,
        sessionAge: '',
        state: null,
      });
      return backup.state;
    }
    return null;
  }, []);

  // Return recovery info only if not dismissed
  return {
    recoveryInfo: recoveryDismissed ? {
      hasRecoveryData: false,
      crashDetected: false,
      lastBackup: null,
      sessionAge: '',
      state: null,
    } : recoveryInfo,
    dismissRecovery,
    applyRecovery,
  };
}

export default {
  saveBackup,
  loadBackup,
  clearBackup,
  checkForRecovery,
  startAutoBackup,
  stopAutoBackup,
  markCleanShutdown,
  useAutoBackup,
};
