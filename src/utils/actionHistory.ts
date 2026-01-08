/**
 * Action History - Audit Log for Antifragility
 * 
 * Tracks all significant user actions for:
 * 1. Debugging - See what led to an issue
 * 2. Transparency - Users know what happened
 * 3. Future undo - Foundation for reversible actions
 * 4. Analytics - Understand usage patterns
 * 
 * ANTIFRAGILE: Read-only logging, never affects app behavior
 */

// ============================================================================
// TYPES
// ============================================================================

export type ActionCategory = 
  | 'navigation'
  | 'data'
  | 'export'
  | 'import'
  | 'search'
  | 'filter'
  | 'settings'
  | 'error'
  | 'recovery'
  | 'system';

export interface ActionEntry {
  id: string;
  timestamp: number;
  category: ActionCategory;
  action: string;
  details?: Record<string, unknown>;
  success: boolean;
  duration?: number; // ms
  undoable?: boolean;
  undoData?: unknown;
}

export interface ActionStats {
  totalActions: number;
  actionsByCategory: Record<ActionCategory, number>;
  errorCount: number;
  avgDuration: number;
  sessionStart: number;
  mostRecentAction: ActionEntry | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const STORAGE_KEY = 'dcim_action_history';
const MAX_ENTRIES = 500; // Keep last 500 actions
const SESSION_KEY = 'dcim_action_session';

// ============================================================================
// CORE FUNCTIONS
// ============================================================================

/**
 * Generate unique action ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current session ID (creates one if needed)
 */
function getSessionId(): string {
  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = `session-${Date.now()}`;
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  } catch {
    return `session-${Date.now()}`;
  }
}

/**
 * Load action history from storage
 */
export function loadHistory(): ActionEntry[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    
    return parsed;
  } catch (error) {
    console.warn('[ActionHistory] Failed to load:', error);
    return [];
  }
}

/**
 * Save action history to storage
 */
function saveHistory(entries: ActionEntry[]): void {
  try {
    // Keep only last MAX_ENTRIES
    const trimmed = entries.slice(-MAX_ENTRIES);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.warn('[ActionHistory] Failed to save:', error);
  }
}

/**
 * Log a new action
 */
export function logAction(
  category: ActionCategory,
  action: string,
  options: {
    details?: Record<string, unknown>;
    success?: boolean;
    duration?: number;
    undoable?: boolean;
    undoData?: unknown;
  } = {}
): ActionEntry {
  const entry: ActionEntry = {
    id: generateId(),
    timestamp: Date.now(),
    category,
    action,
    details: options.details,
    success: options.success ?? true,
    duration: options.duration,
    undoable: options.undoable,
    undoData: options.undoData,
  };

  try {
    const history = loadHistory();
    history.push(entry);
    saveHistory(history);
  } catch (error) {
    console.warn('[ActionHistory] Failed to log action:', error);
  }

  return entry;
}

/**
 * Log navigation action
 */
export function logNavigation(from: string, to: string): ActionEntry {
  return logAction('navigation', `Navigated from ${from} to ${to}`, {
    details: { from, to },
  });
}

/**
 * Log data action (CRUD operations)
 */
export function logDataAction(
  operation: 'create' | 'read' | 'update' | 'delete',
  entity: string,
  count: number = 1,
  success: boolean = true
): ActionEntry {
  return logAction('data', `${operation} ${count} ${entity}${count > 1 ? 's' : ''}`, {
    details: { operation, entity, count },
    success,
  });
}

/**
 * Log export action
 */
export function logExport(
  format: string,
  recordCount: number,
  fileSize?: number,
  success: boolean = true
): ActionEntry {
  return logAction('export', `Exported ${recordCount} records as ${format}`, {
    details: { format, recordCount, fileSize },
    success,
  });
}

/**
 * Log import action
 */
export function logImport(
  recordCount: number,
  mode: 'merge' | 'replace',
  success: boolean = true
): ActionEntry {
  return logAction('import', `Imported ${recordCount} records (${mode})`, {
    details: { recordCount, mode },
    success,
  });
}

/**
 * Log search action
 */
export function logSearch(query: string, resultCount: number): ActionEntry {
  return logAction('search', `Searched: "${query.slice(0, 50)}"`, {
    details: { query, resultCount },
  });
}

/**
 * Log filter action
 */
export function logFilter(filters: Record<string, unknown>): ActionEntry {
  const filterCount = Object.keys(filters).filter(k => filters[k]).length;
  return logAction('filter', `Applied ${filterCount} filter(s)`, {
    details: filters,
  });
}

/**
 * Log settings change
 */
export function logSettingsChange(setting: string, oldValue: unknown, newValue: unknown): ActionEntry {
  return logAction('settings', `Changed ${setting}`, {
    details: { setting, oldValue, newValue },
    undoable: true,
    undoData: { setting, value: oldValue },
  });
}

/**
 * Log error
 */
export function logError(error: string, context?: Record<string, unknown>): ActionEntry {
  return logAction('error', error, {
    details: context,
    success: false,
  });
}

/**
 * Log recovery action
 */
export function logRecovery(type: string, success: boolean = true): ActionEntry {
  return logAction('recovery', `Recovery: ${type}`, {
    success,
  });
}

/**
 * Log system event
 */
export function logSystem(event: string, details?: Record<string, unknown>): ActionEntry {
  return logAction('system', event, { details });
}

// ============================================================================
// QUERY FUNCTIONS
// ============================================================================

/**
 * Get recent actions (most recent first)
 */
export function getRecentActions(limit: number = 50): ActionEntry[] {
  const history = loadHistory();
  return history.slice(-limit).reverse();
}

/**
 * Get actions by category
 */
export function getActionsByCategory(category: ActionCategory, limit?: number): ActionEntry[] {
  const history = loadHistory();
  const filtered = history.filter(a => a.category === category);
  return limit ? filtered.slice(-limit).reverse() : filtered.reverse();
}

/**
 * Get actions in time range
 */
export function getActionsInRange(startTime: number, endTime: number): ActionEntry[] {
  const history = loadHistory();
  return history.filter(a => a.timestamp >= startTime && a.timestamp <= endTime);
}

/**
 * Get error actions
 */
export function getErrors(limit: number = 20): ActionEntry[] {
  const history = loadHistory();
  return history.filter(a => !a.success).slice(-limit).reverse();
}

/**
 * Get undoable actions
 */
export function getUndoableActions(limit: number = 10): ActionEntry[] {
  const history = loadHistory();
  return history.filter(a => a.undoable).slice(-limit).reverse();
}

/**
 * Get action statistics
 */
export function getStats(): ActionStats {
  const history = loadHistory();
  
  const actionsByCategory: Record<ActionCategory, number> = {
    navigation: 0,
    data: 0,
    export: 0,
    import: 0,
    search: 0,
    filter: 0,
    settings: 0,
    error: 0,
    recovery: 0,
    system: 0,
  };

  let totalDuration = 0;
  let durationCount = 0;
  let errorCount = 0;

  for (const action of history) {
    actionsByCategory[action.category]++;
    if (action.duration) {
      totalDuration += action.duration;
      durationCount++;
    }
    if (!action.success) {
      errorCount++;
    }
  }

  const sessionStart = history.length > 0 ? history[0].timestamp : Date.now();

  return {
    totalActions: history.length,
    actionsByCategory,
    errorCount,
    avgDuration: durationCount > 0 ? Math.round(totalDuration / durationCount) : 0,
    sessionStart,
    mostRecentAction: history.length > 0 ? history[history.length - 1] : null,
  };
}

/**
 * Clear all history
 */
export function clearHistory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    logSystem('History cleared');
  } catch (error) {
    console.warn('[ActionHistory] Failed to clear:', error);
  }
}

/**
 * Export history as JSON
 */
export function exportHistory(): string {
  const history = loadHistory();
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    sessionId: getSessionId(),
    entries: history,
    stats: getStats(),
  }, null, 2);
}

// ============================================================================
// FORMATTING HELPERS
// ============================================================================

/**
 * Format timestamp as relative time
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;

  if (diff < 1000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

/**
 * Format action for display
 */
export function formatAction(entry: ActionEntry): string {
  return entry.action;
}

/**
 * Get category icon
 */
export function getCategoryIcon(category: ActionCategory): string {
  const icons: Record<ActionCategory, string> = {
    navigation: '🧭',
    data: '📊',
    export: '📤',
    import: '📥',
    search: '🔍',
    filter: '🎯',
    settings: '⚙️',
    error: '❌',
    recovery: '🔄',
    system: '💻',
  };
  return icons[category] || '📝';
}

/**
 * Get category color
 */
export function getCategoryColor(category: ActionCategory): string {
  const colors: Record<ActionCategory, string> = {
    navigation: 'text-blue-600',
    data: 'text-indigo-600',
    export: 'text-green-600',
    import: 'text-purple-600',
    search: 'text-cyan-600',
    filter: 'text-amber-600',
    settings: 'text-gray-600',
    error: 'text-red-600',
    recovery: 'text-emerald-600',
    system: 'text-slate-600',
  };
  return colors[category] || 'text-gray-600';
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  logAction,
  logNavigation,
  logDataAction,
  logExport,
  logImport,
  logSearch,
  logFilter,
  logSettingsChange,
  logError,
  logRecovery,
  logSystem,
  loadHistory,
  getRecentActions,
  getActionsByCategory,
  getActionsInRange,
  getErrors,
  getUndoableActions,
  getStats,
  clearHistory,
  exportHistory,
  formatRelativeTime,
  formatAction,
  getCategoryIcon,
  getCategoryColor,
};
