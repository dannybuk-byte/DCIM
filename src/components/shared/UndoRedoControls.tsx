/**
 * UndoRedoControls - Visual Undo/Redo Interface
 * 
 * Provides UI for undo/redo actions:
 * 1. Toolbar buttons with tooltips
 * 2. Toast notifications on undo/redo
 * 3. History dropdown
 * 4. Keyboard shortcut hints
 * 
 * ANTIFRAGILE: Makes reversibility visible and accessible
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Undo2, Redo2, History, ChevronDown, X, Check,
  Clock, Settings, Filter, Navigation, Trash2
} from 'lucide-react';
import {
  useUndoRedo,
  setupUndoRedoKeyboardShortcuts,
  formatActionTime,
  UndoableAction
} from '../../utils/undoRedo';

// ============================================================================
// TOAST NOTIFICATION
// ============================================================================

interface UndoToastProps {
  action: UndoableAction | null;
  type: 'undo' | 'redo';
  onDismiss: () => void;
}

function UndoToast({ action, type, onDismiss }: UndoToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  if (!action) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-4 fade-in duration-200">
      <div className="flex items-center gap-3 px-4 py-3 bg-slate-800 text-white rounded-lg shadow-lg">
        <div className={`p-1.5 rounded-full ${type === 'undo' ? 'bg-amber-500/20' : 'bg-green-500/20'}`}>
          {type === 'undo' ? (
            <Undo2 className="w-4 h-4 text-amber-400" />
          ) : (
            <Redo2 className="w-4 h-4 text-green-400" />
          )}
        </div>
        <div>
          <div className="text-sm font-medium">
            {type === 'undo' ? 'Undone' : 'Redone'}
          </div>
          <div className="text-xs text-slate-400">{action.description}</div>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-white/10 rounded transition-colors ml-2"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// TOOLBAR CONTROLS
// ============================================================================

interface UndoRedoToolbarProps {
  onUndo?: (action: UndoableAction | null) => void;
  onRedo?: (action: UndoableAction | null) => void;
  showLabels?: boolean;
  showHistory?: boolean;
  className?: string;
}

export function UndoRedoToolbar({
  onUndo,
  onRedo,
  showLabels = false,
  showHistory = false,
  className = '',
}: UndoRedoToolbarProps) {
  const { canUndo, canRedo, lastAction, undo, redo, getHistory, clear } = useUndoRedo();
  const [toast, setToast] = useState<{ action: UndoableAction; type: 'undo' | 'redo' } | null>(null);
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

  // Setup keyboard shortcuts
  useEffect(() => {
    return setupUndoRedoKeyboardShortcuts(
      (action) => {
        if (action) {
          setToast({ action, type: 'undo' });
          onUndo?.(action);
        }
      },
      (action) => {
        if (action) {
          setToast({ action, type: 'redo' });
          onRedo?.(action);
        }
      }
    );
  }, [onUndo, onRedo]);

  const handleUndo = useCallback(() => {
    const action = undo();
    if (action) {
      setToast({ action, type: 'undo' });
      onUndo?.(action);
    }
  }, [undo, onUndo]);

  const handleRedo = useCallback(() => {
    const action = redo();
    if (action) {
      setToast({ action, type: 'redo' });
      onRedo?.(action);
    }
  }, [redo, onRedo]);

  const history = getHistory();

  return (
    <>
      <div className={`flex items-center gap-1 ${className}`}>
        {/* Undo Button */}
        <button
          onClick={handleUndo}
          disabled={!canUndo}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            canUndo
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              : 'bg-slate-50 text-slate-300 cursor-not-allowed'
          }`}
          title={`Undo${lastAction ? `: ${lastAction.description}` : ''} (Ctrl+Z)`}
        >
          <Undo2 className="w-4 h-4" />
          {showLabels && <span className="text-xs">Undo</span>}
        </button>

        {/* Redo Button */}
        <button
          onClick={handleRedo}
          disabled={!canRedo}
          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
            canRedo
              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              : 'bg-slate-50 text-slate-300 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo2 className="w-4 h-4" />
          {showLabels && <span className="text-xs">Redo</span>}
        </button>

        {/* History Dropdown */}
        {showHistory && (
          <div className="relative">
            <button
              onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all"
              title="Action History"
            >
              <History className="w-4 h-4" />
              <ChevronDown className={`w-3 h-3 transition-transform ${showHistoryDropdown ? 'rotate-180' : ''}`} />
            </button>

            {showHistoryDropdown && (
              <div className="absolute top-full right-0 mt-1 w-72 bg-white rounded-lg shadow-xl border border-slate-200 z-50 overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-medium text-slate-600">Action History</span>
                  {history.past.length > 0 && (
                    <button
                      onClick={() => {
                        clear();
                        setShowHistoryDropdown(false);
                      }}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="max-h-64 overflow-auto">
                  {history.past.length === 0 && history.future.length === 0 ? (
                    <div className="px-3 py-4 text-center text-sm text-slate-400">
                      No actions recorded yet
                    </div>
                  ) : (
                    <>
                      {/* Future (redo stack) */}
                      {history.future.map((action, i) => (
                        <div
                          key={action.id}
                          className="px-3 py-2 border-b border-slate-100 bg-green-50/50"
                        >
                          <div className="flex items-center gap-2">
                            <ActionIcon type={action.type} className="text-green-500" />
                            <span className="text-sm text-slate-600">{action.description}</span>
                          </div>
                          <div className="text-xs text-green-600 mt-0.5 ml-6">
                            ↪ {i === 0 ? 'Next redo' : `Redo ${i + 1}`}
                          </div>
                        </div>
                      ))}
                      
                      {/* Divider */}
                      {history.future.length > 0 && history.past.length > 0 && (
                        <div className="px-3 py-1 bg-slate-100 text-xs text-slate-500 text-center">
                          — Current State —
                        </div>
                      )}

                      {/* Past (undo stack) */}
                      {history.past.map((action, i) => (
                        <div
                          key={action.id}
                          className={`px-3 py-2 border-b border-slate-100 ${i === 0 ? 'bg-amber-50/50' : ''}`}
                        >
                          <div className="flex items-center gap-2">
                            <ActionIcon type={action.type} className={i === 0 ? 'text-amber-500' : 'text-slate-400'} />
                            <span className="text-sm text-slate-600">{action.description}</span>
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5 ml-6">
                            {formatActionTime(action.timestamp)}
                            {i === 0 && <span className="text-amber-600 ml-2">← Next undo</span>}
                          </div>
                        </div>
                      ))}
                    </>
                  )}
                </div>
                <div className="px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                  <span>⌘Z to undo</span>
                  <span>⌘⇧Z to redo</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <UndoToast
          action={toast.action}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}

      {/* Click outside to close dropdown */}
      {showHistoryDropdown && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowHistoryDropdown(false)}
        />
      )}
    </>
  );
}

// ============================================================================
// ACTION ICON
// ============================================================================

function ActionIcon({ type, className = '' }: { type: string; className?: string }) {
  const iconClass = `w-4 h-4 ${className}`;
  
  switch (type) {
    case 'filter':
      return <Filter className={iconClass} />;
    case 'navigation':
      return <Navigation className={iconClass} />;
    case 'settings':
      return <Settings className={iconClass} />;
    default:
      return <Clock className={iconClass} />;
  }
}

// ============================================================================
// COMPACT UNDO BUTTON
// ============================================================================

interface CompactUndoProps {
  onUndo?: (action: UndoableAction | null) => void;
  className?: string;
}

export function CompactUndoButton({ onUndo, className = '' }: CompactUndoProps) {
  const { canUndo, lastAction, undo } = useUndoRedo();
  const [showToast, setShowToast] = useState(false);
  const [toastAction, setToastAction] = useState<UndoableAction | null>(null);

  // Setup keyboard shortcut
  useEffect(() => {
    return setupUndoRedoKeyboardShortcuts(
      (action) => {
        if (action) {
          setToastAction(action);
          setShowToast(true);
          onUndo?.(action);
        }
      },
      undefined
    );
  }, [onUndo]);

  const handleClick = useCallback(() => {
    const action = undo();
    if (action) {
      setToastAction(action);
      setShowToast(true);
      onUndo?.(action);
    }
  }, [undo, onUndo]);

  if (!canUndo) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2 py-1 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-lg text-xs transition-colors ${className}`}
        title={`Undo: ${lastAction?.description || 'last action'} (Ctrl+Z)`}
      >
        <Undo2 className="w-3 h-3" />
        Undo
      </button>
      {showToast && toastAction && (
        <UndoToast
          action={toastAction}
          type="undo"
          onDismiss={() => setShowToast(false)}
        />
      )}
    </>
  );
}

// ============================================================================
// FLOATING UNDO BUTTON
// ============================================================================

export function FloatingUndoButton({ className = '' }: { className?: string }) {
  const { canUndo, lastAction, undo } = useUndoRedo();
  const [toast, setToast] = useState<UndoableAction | null>(null);

  const handleClick = useCallback(() => {
    const action = undo();
    if (action) setToast(action);
  }, [undo]);

  if (!canUndo) return null;

  return (
    <>
      <button
        onClick={handleClick}
        className={`fixed bottom-20 left-4 z-40 flex items-center gap-2 px-3 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all ${className}`}
        title={`Undo: ${lastAction?.description}`}
      >
        <Undo2 className="w-4 h-4" />
        <span className="text-sm">Undo</span>
      </button>
      {toast && (
        <UndoToast action={toast} type="undo" onDismiss={() => setToast(null)} />
      )}
    </>
  );
}

export default UndoRedoToolbar;
