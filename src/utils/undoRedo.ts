/**
 * Undo/Redo System - Reversible Actions
 * 
 * Enables users to reverse recent actions:
 * 1. State snapshots with descriptions
 * 2. Keyboard shortcuts (Ctrl+Z, Ctrl+Shift+Z)
 * 3. Visual feedback on undo/redo
 * 4. Configurable history depth
 * 
 * ANTIFRAGILE: Mistakes are reversible, not catastrophic
 */

import { logSystem, logRecovery } from './actionHistory';

// ============================================================================
// TYPES
// ============================================================================

export interface UndoableAction<T = unknown> {
  id: string;
  type: string;
  description: string;
  timestamp: number;
  previousState: T;
  newState: T;
  metadata?: Record<string, unknown>;
}

interface UndoRedoState<T = unknown> {
  past: UndoableAction<T>[];
  future: UndoableAction<T>[];
  maxHistory: number;
}

type UndoRedoListener = (canUndo: boolean, canRedo: boolean, lastAction?: UndoableAction) => void;

// ============================================================================
// UNDO/REDO MANAGER
// ============================================================================

class UndoRedoManager<T = unknown> {
  private state: UndoRedoState<T> = {
    past: [],
    future: [],
    maxHistory: 50,
  };
  
  private listeners: Set<UndoRedoListener> = new Set();
  private storageKey = 'dcim_undo_history';

  constructor(maxHistory: number = 50) {
    this.state.maxHistory = maxHistory;
    this.loadFromStorage();
  }

  // Save to localStorage for persistence
  private saveToStorage(): void {
    try {
      // Only save last 10 actions to avoid storage bloat
      const toSave = {
        past: this.state.past.slice(-10),
        future: this.state.future.slice(0, 5),
      };
      localStorage.setItem(this.storageKey, JSON.stringify(toSave));
    } catch {
      // Storage full or unavailable - graceful degradation
    }
  }

  // Load from localStorage
  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        this.state.past = parsed.past || [];
        this.state.future = parsed.future || [];
      }
    } catch {
      // Invalid data - start fresh
      this.state.past = [];
      this.state.future = [];
    }
  }

  // Notify all listeners
  private notify(lastAction?: UndoableAction<T>): void {
    const canUndo = this.state.past.length > 0;
    const canRedo = this.state.future.length > 0;
    this.listeners.forEach(listener => listener(canUndo, canRedo, lastAction));
  }

  /**
   * Record a new action that can be undone
   */
  record(action: Omit<UndoableAction<T>, 'id' | 'timestamp'>): void {
    const fullAction: UndoableAction<T> = {
      ...action,
      id: `undo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };

    // Add to past, clear future (new action invalidates redo stack)
    this.state.past.push(fullAction);
    this.state.future = [];

    // Trim history if too long
    if (this.state.past.length > this.state.maxHistory) {
      this.state.past = this.state.past.slice(-this.state.maxHistory);
    }

    this.saveToStorage();
    this.notify(fullAction);
    
    logSystem(`Action recorded: ${action.description}`);
  }

  /**
   * Undo the last action
   */
  undo(): UndoableAction<T> | null {
    if (this.state.past.length === 0) {
      return null;
    }

    const action = this.state.past.pop()!;
    this.state.future.unshift(action);

    this.saveToStorage();
    this.notify(action);
    
    logRecovery('undo', action.description);
    
    return action;
  }

  /**
   * Redo the last undone action
   */
  redo(): UndoableAction<T> | null {
    if (this.state.future.length === 0) {
      return null;
    }

    const action = this.state.future.shift()!;
    this.state.past.push(action);

    this.saveToStorage();
    this.notify(action);
    
    logRecovery('redo', action.description);
    
    return action;
  }

  /**
   * Get current state
   */
  getState(): { canUndo: boolean; canRedo: boolean; pastCount: number; futureCount: number } {
    return {
      canUndo: this.state.past.length > 0,
      canRedo: this.state.future.length > 0,
      pastCount: this.state.past.length,
      futureCount: this.state.future.length,
    };
  }

  /**
   * Get history for display
   */
  getHistory(): { past: UndoableAction<T>[]; future: UndoableAction<T>[] } {
    return {
      past: [...this.state.past].reverse(), // Most recent first
      future: [...this.state.future],
    };
  }

  /**
   * Get last action description
   */
  getLastAction(): UndoableAction<T> | null {
    return this.state.past[this.state.past.length - 1] || null;
  }

  /**
   * Get next redo action
   */
  getNextRedo(): UndoableAction<T> | null {
    return this.state.future[0] || null;
  }

  /**
   * Subscribe to changes
   */
  subscribe(listener: UndoRedoListener): () => void {
    this.listeners.add(listener);
    // Immediately notify with current state
    listener(
      this.state.past.length > 0,
      this.state.future.length > 0,
      this.state.past[this.state.past.length - 1]
    );
    return () => this.listeners.delete(listener);
  }

  /**
   * Clear all history
   */
  clear(): void {
    this.state.past = [];
    this.state.future = [];
    this.saveToStorage();
    this.notify();
    logSystem('Undo history cleared');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const undoManager = new UndoRedoManager(50);

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useUndoRedo<T = unknown>() {
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [lastAction, setLastAction] = useState<UndoableAction<T> | null>(null);

  useEffect(() => {
    const unsubscribe = undoManager.subscribe((undo, redo, action) => {
      setCanUndo(undo);
      setCanRedo(redo);
      setLastAction(action as UndoableAction<T> | undefined || null);
    });
    return unsubscribe;
  }, []);

  const record = useCallback((action: Omit<UndoableAction<T>, 'id' | 'timestamp'>) => {
    undoManager.record(action);
  }, []);

  const undo = useCallback(() => {
    return undoManager.undo() as UndoableAction<T> | null;
  }, []);

  const redo = useCallback(() => {
    return undoManager.redo() as UndoableAction<T> | null;
  }, []);

  const getHistory = useCallback(() => {
    return undoManager.getHistory() as { past: UndoableAction<T>[]; future: UndoableAction<T>[] };
  }, []);

  return {
    canUndo,
    canRedo,
    lastAction,
    record,
    undo,
    redo,
    getHistory,
    clear: undoManager.clear.bind(undoManager),
  };
}

// ============================================================================
// KEYBOARD SHORTCUT HANDLER
// ============================================================================

export function setupUndoRedoKeyboardShortcuts(
  onUndo?: (action: UndoableAction | null) => void,
  onRedo?: (action: UndoableAction | null) => void
): () => void {
  const handler = (e: KeyboardEvent) => {
    // Check for Ctrl+Z (undo) or Ctrl+Shift+Z / Ctrl+Y (redo)
    if ((e.ctrlKey || e.metaKey) && !e.altKey) {
      if (e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        const action = undoManager.undo();
        onUndo?.(action);
      } else if ((e.key === 'z' && e.shiftKey) || e.key === 'y') {
        e.preventDefault();
        const action = undoManager.redo();
        onRedo?.(action);
      }
    }
  };

  window.addEventListener('keydown', handler);
  return () => window.removeEventListener('keydown', handler);
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an undoable filter change
 */
export function recordFilterChange(
  filterName: string,
  previousValue: unknown,
  newValue: unknown
): void {
  undoManager.record({
    type: 'filter',
    description: `Changed ${filterName} filter`,
    previousState: { [filterName]: previousValue },
    newState: { [filterName]: newValue },
    metadata: { filterName },
  });
}

/**
 * Create an undoable view change
 */
export function recordViewChange(
  previousView: string,
  newView: string
): void {
  undoManager.record({
    type: 'navigation',
    description: `Navigated to ${newView}`,
    previousState: { view: previousView },
    newState: { view: newView },
  });
}

/**
 * Create an undoable settings change
 */
export function recordSettingsChange(
  settingName: string,
  previousValue: unknown,
  newValue: unknown
): void {
  undoManager.record({
    type: 'settings',
    description: `Changed ${settingName}`,
    previousState: { [settingName]: previousValue },
    newState: { [settingName]: newValue },
    metadata: { settingName },
  });
}

/**
 * Format time since action
 */
export function formatActionTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default undoManager;
