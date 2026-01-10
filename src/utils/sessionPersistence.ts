/**
 * Session Persistence - Antifragile State Recovery
 * 
 * Saves and restores user session state to localStorage:
 * - Active tab
 * - Filter settings
 * - Search queries
 * - UI preferences (density mode, sidebar state)
 * - Scroll positions
 * 
 * ANTIFRAGILE: All operations are wrapped with try-catch
 * App works normally even if persistence fails
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SessionState {
  // Navigation
  activeTab?: string;
  activeSection?: string;
  
  // Filters
  filters?: {
    state?: string;
    operator?: string;
    complianceStatus?: string;
    searchQuery?: string;
  };
  
  // UI Preferences
  preferences?: {
    densityMode?: 'compact' | 'comfortable' | 'spacious';
    sidebarCollapsed?: boolean;
    systemHealthVisible?: boolean;
    viewMode?: string;
  };
  
  // Scroll positions (by tab)
  scrollPositions?: Record<string, number>;
  
  // Timestamps
  lastSaved?: number;
  lastVisit?: number;
  sessionStart?: number;
}

const STORAGE_KEY = 'dcim_session_state';
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Save session state to localStorage
 * Gracefully handles errors - never throws
 */
export function saveSessionState(state: Partial<SessionState>): boolean {
  try {
    const existing = loadSessionState();
    const merged: SessionState = {
      ...existing,
      ...state,
      lastSaved: Date.now(),
      sessionStart: existing?.sessionStart || Date.now(),
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch (error) {
    console.warn('[SessionPersistence] Failed to save state:', error);
    return false;
  }
}

/**
 * Load session state from localStorage
 * Returns null if no state exists or state is expired
 */
export function loadSessionState(): SessionState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    
    const state: SessionState = JSON.parse(raw);
    
    // Check if state is too old
    if (state.lastSaved && Date.now() - state.lastSaved > MAX_AGE_MS) {
      clearSessionState();
      return null;
    }
    
    return state;
  } catch (error) {
    console.warn('[SessionPersistence] Failed to load state:', error);
    return null;
  }
}

/**
 * Clear session state
 */
export function clearSessionState(): boolean {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.warn('[SessionPersistence] Failed to clear state:', error);
    return false;
  }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Save active tab
 */
export function saveActiveTab(tab: string, section?: string): void {
  saveSessionState({ 
    activeTab: tab,
    activeSection: section,
  });
}

/**
 * Get last active tab
 */
export function getLastActiveTab(): { tab: string | null; section: string | null } {
  const state = loadSessionState();
  return {
    tab: state?.activeTab || null,
    section: state?.activeSection || null,
  };
}

/**
 * Save filter settings
 */
export function saveFilters(filters: SessionState['filters']): void {
  const state = loadSessionState();
  saveSessionState({
    filters: {
      ...state?.filters,
      ...filters,
    },
  });
}

/**
 * Get saved filters
 */
export function getSavedFilters(): SessionState['filters'] | null {
  const state = loadSessionState();
  return state?.filters || null;
}

/**
 * Save UI preferences
 */
export function savePreferences(prefs: SessionState['preferences']): void {
  const state = loadSessionState();
  saveSessionState({
    preferences: {
      ...state?.preferences,
      ...prefs,
    },
  });
}

/**
 * Get saved preferences
 */
export function getSavedPreferences(): SessionState['preferences'] | null {
  const state = loadSessionState();
  return state?.preferences || null;
}

/**
 * Save scroll position for a specific tab
 */
export function saveScrollPosition(tabId: string, position: number): void {
  const state = loadSessionState();
  saveSessionState({
    scrollPositions: {
      ...state?.scrollPositions,
      [tabId]: position,
    },
  });
}

/**
 * Get scroll position for a specific tab
 */
export function getScrollPosition(tabId: string): number {
  const state = loadSessionState();
  return state?.scrollPositions?.[tabId] || 0;
}

/**
 * Record a visit (for welcome back messages)
 */
export function recordVisit(): { isReturning: boolean; lastVisit: Date | null } {
  const state = loadSessionState();
  const lastVisit = state?.lastVisit ? new Date(state.lastVisit) : null;
  const isReturning = !!lastVisit;
  
  saveSessionState({ lastVisit: Date.now() });
  
  return { isReturning, lastVisit };
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

interface UseSessionPersistenceOptions {
  /** Key to identify this component's state */
  key: string;
  /** Default values if no session exists */
  defaults?: Record<string, unknown>;
  /** Auto-save on changes (default: true) */
  autoSave?: boolean;
}

/**
 * React hook for session persistence
 * 
 * @example
 * const { state, updateState, clearState } = useSessionPersistence({
 *   key: 'command-center',
 *   defaults: { activeTab: 'overview' }
 * });
 */
export function useSessionPersistence<T extends Record<string, unknown>>({
  key,
  defaults = {},
  autoSave = true,
}: UseSessionPersistenceOptions) {
  const storageKey = `dcim_${key}`;
  
  // Initialize state from storage or defaults
  const [state, setState] = useState<T>(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...defaults, ...parsed } as T;
      }
    } catch {
      // Ignore errors, use defaults
    }
    return defaults as T;
  });
  
  // Save to storage when state changes
  useEffect(() => {
    if (!autoSave) return;
    
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        ...state,
        _lastUpdated: Date.now(),
      }));
    } catch {
      // Ignore storage errors
    }
  }, [state, storageKey, autoSave]);
  
  // Update partial state
  const updateState = useCallback((updates: Partial<T>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);
  
  // Clear persisted state
  const clearState = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
      setState(defaults as T);
    } catch {
      // Ignore errors
    }
  }, [storageKey, defaults]);
  
  // Manual save
  const save = useCallback(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({
        ...state,
        _lastUpdated: Date.now(),
      }));
      return true;
    } catch {
      return false;
    }
  }, [state, storageKey]);
  
  return {
    state,
    setState,
    updateState,
    clearState,
    save,
  };
}

// ============================================================================
// SESSION INFO COMPONENT
// ============================================================================

export interface SessionInfo {
  isReturningUser: boolean;
  lastVisit: Date | null;
  sessionDuration: number; // in ms
  savedTab: string | null;
  savedFilters: SessionState['filters'] | null;
}

/**
 * Get comprehensive session info
 */
export function getSessionInfo(): SessionInfo {
  const state = loadSessionState();
  
  return {
    isReturningUser: !!state?.lastVisit,
    lastVisit: state?.lastVisit ? new Date(state.lastVisit) : null,
    sessionDuration: state?.sessionStart ? Date.now() - state.sessionStart : 0,
    savedTab: state?.activeTab || null,
    savedFilters: state?.filters || null,
  };
}

/**
 * Format session duration for display
 */
export function formatSessionDuration(ms: number): string {
  if (ms < 60000) return 'Just started';
  if (ms < 3600000) return `${Math.floor(ms / 60000)} min`;
  if (ms < 86400000) return `${Math.floor(ms / 3600000)} hr`;
  return `${Math.floor(ms / 86400000)} days`;
}

export default {
  saveSessionState,
  loadSessionState,
  clearSessionState,
  saveActiveTab,
  getLastActiveTab,
  saveFilters,
  getSavedFilters,
  savePreferences,
  getSavedPreferences,
  saveScrollPosition,
  getScrollPosition,
  recordVisit,
  getSessionInfo,
  formatSessionDuration,
  useSessionPersistence,
};
