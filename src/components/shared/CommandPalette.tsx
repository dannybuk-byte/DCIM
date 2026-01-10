/**
 * CommandPalette - Universal Feature Access
 * 
 * A VS Code-style command palette that provides:
 * 1. Quick access to all features
 * 2. Fuzzy search across commands
 * 3. Keyboard navigation
 * 4. Grouped by category
 * 
 * ANTIFRAGILE: Works even if navigation breaks, helps users discover features
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Command, Search, X, ChevronRight,
  Home, Building2, Brain, Wrench,
  Download, Upload, Shield, History,
  Keyboard, Settings, HelpCircle, RefreshCw,
  Globe, Maximize2, Eye, Database,
  FileJson, AlertTriangle, CheckCircle
} from 'lucide-react';
import { logSystem } from '../../utils/actionHistory';

// ============================================================================
// TYPES
// ============================================================================

export interface CommandItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  action: () => void;
  keywords?: string[];
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  commands: CommandItem[];
}

// ============================================================================
// FUZZY SEARCH
// ============================================================================

function fuzzyMatch(text: string, query: string): { match: boolean; score: number } {
  if (!query) return { match: true, score: 1 };
  
  const textLower = text.toLowerCase();
  const queryLower = query.toLowerCase();
  
  // Exact match
  if (textLower.includes(queryLower)) {
    return { match: true, score: 2 };
  }
  
  // Fuzzy match - all query chars must appear in order
  let queryIndex = 0;
  for (let i = 0; i < textLower.length && queryIndex < queryLower.length; i++) {
    if (textLower[i] === queryLower[queryIndex]) {
      queryIndex++;
    }
  }
  
  if (queryIndex === queryLower.length) {
    return { match: true, score: 1 };
  }
  
  return { match: false, score: 0 };
}

function searchCommands(commands: CommandItem[], query: string): CommandItem[] {
  if (!query.trim()) return commands;
  
  const results: { command: CommandItem; score: number }[] = [];
  
  for (const command of commands) {
    // Check label
    const labelMatch = fuzzyMatch(command.label, query);
    if (labelMatch.match) {
      results.push({ command, score: labelMatch.score * 3 });
      continue;
    }
    
    // Check description
    if (command.description) {
      const descMatch = fuzzyMatch(command.description, query);
      if (descMatch.match) {
        results.push({ command, score: descMatch.score * 2 });
        continue;
      }
    }
    
    // Check keywords
    if (command.keywords) {
      for (const keyword of command.keywords) {
        const keywordMatch = fuzzyMatch(keyword, query);
        if (keywordMatch.match) {
          results.push({ command, score: keywordMatch.score });
          break;
        }
      }
    }
    
    // Check category
    const catMatch = fuzzyMatch(command.category, query);
    if (catMatch.match) {
      results.push({ command, score: catMatch.score * 0.5 });
    }
  }
  
  // Sort by score descending
  results.sort((a, b) => b.score - a.score);
  
  return results.map(r => r.command);
}

// ============================================================================
// COMMAND PALETTE COMPONENT
// ============================================================================

export function CommandPalette({ isOpen, onClose, commands }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter commands
  const filteredCommands = useMemo(() => {
    return searchCommands(commands, query);
  }, [commands, query]);

  // Group by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const command of filteredCommands) {
      if (!groups[command.category]) {
        groups[command.category] = [];
      }
      groups[command.category].push(command);
    }
    return groups;
  }, [filteredCommands]);

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    return Object.values(groupedCommands).flat();
  }, [groupedCommands]);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keep selected item in view
  useEffect(() => {
    if (listRef.current && flatCommands.length > 0) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex, flatCommands.length]);

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, flatCommands.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatCommands[selectedIndex]) {
          executeCommand(flatCommands[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        onClose();
        break;
    }
  }, [flatCommands, selectedIndex, onClose]);

  // Execute command
  const executeCommand = useCallback((command: CommandItem) => {
    logSystem(`Command executed: ${command.label}`, { category: command.category });
    onClose();
    // Small delay to allow modal to close before action
    setTimeout(() => command.action(), 100);
  }, [onClose]);

  if (!isOpen) return null;

  let globalIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 backdrop-blur-sm">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search className="w-5 h-5 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Type a command or search..."
            className="flex-1 text-sm outline-none placeholder-gray-400"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded transition-colors"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Commands list */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto">
          {flatCommands.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <Command className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No commands found</p>
            </div>
          ) : (
            Object.entries(groupedCommands).map(([category, categoryCommands]) => (
              <div key={category}>
                {/* Category header */}
                <div className="px-4 py-2 bg-gray-50 text-xs font-medium text-gray-500 uppercase tracking-wider sticky top-0">
                  {category}
                </div>
                
                {/* Commands in category */}
                {categoryCommands.map(command => {
                  const index = globalIndex++;
                  const isSelected = index === selectedIndex;
                  
                  return (
                    <button
                      key={command.id}
                      data-index={index}
                      onClick={() => executeCommand(command)}
                      className={`w-full px-4 py-2 flex items-center gap-3 text-left transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'hover:bg-gray-50 text-gray-700'
                      }`}
                    >
                      {/* Icon */}
                      <div className={`flex-shrink-0 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`}>
                        {command.icon || <ChevronRight className="w-4 h-4" />}
                      </div>
                      
                      {/* Label and description */}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{command.label}</div>
                        {command.description && (
                          <div className="text-xs text-gray-500 truncate">{command.description}</div>
                        )}
                      </div>
                      
                      {/* Shortcut */}
                      {command.shortcut && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {command.shortcut.map((key, i) => (
                            <kbd
                              key={i}
                              className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono"
                            >
                              {key}
                            </kbd>
                          ))}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-gray-200 rounded">↑↓</kbd> navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-gray-200 rounded">↵</kbd> select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 bg-gray-200 rounded">esc</kbd> close
            </span>
          </div>
          <span>{flatCommands.length} commands</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// DEFAULT COMMANDS FACTORY
// ============================================================================

interface CreateCommandsOptions {
  onNavigate?: (view: string) => void;
  onExport?: () => void;
  onImport?: () => void;
  onShowKeyboardHelp?: () => void;
  onShowActionHistory?: () => void;
  onShowIntegrity?: () => void;
  onToggleDensity?: (mode: string) => void;
  onToggleSidebar?: () => void;
}

export function createDefaultCommands(options: CreateCommandsOptions): CommandItem[] {
  const commands: CommandItem[] = [];

  // Navigation commands
  if (options.onNavigate) {
    commands.push(
      {
        id: 'nav-overview',
        label: 'Go to Overview',
        description: 'Dashboard overview with stats',
        category: 'Navigation',
        icon: <Home className="w-4 h-4" />,
        action: () => options.onNavigate?.('overview'),
        keywords: ['home', 'dashboard', 'main'],
      },
      {
        id: 'nav-facilities',
        label: 'Go to Facilities',
        description: 'Browse all data center facilities',
        category: 'Navigation',
        icon: <Building2 className="w-4 h-4" />,
        action: () => options.onNavigate?.('facilities'),
        keywords: ['data centers', 'buildings', 'list'],
      },
      {
        id: 'nav-intelligence',
        label: 'Go to Intelligence',
        description: 'Organizing intelligence and AI agents',
        category: 'Navigation',
        icon: <Brain className="w-4 h-4" />,
        action: () => options.onNavigate?.('intelligence'),
        keywords: ['ai', 'agents', 'organizing'],
      },
      {
        id: 'nav-tools',
        label: 'Go to Tools',
        description: 'Coalition and organizing tools',
        category: 'Navigation',
        icon: <Wrench className="w-4 h-4" />,
        action: () => options.onNavigate?.('tools'),
        keywords: ['coalition', 'organizing'],
      }
    );
  }

  // Data commands
  if (options.onExport) {
    commands.push({
      id: 'data-export',
      label: 'Export Data',
      description: 'Download data as JSON, CSV, or backup',
      category: 'Data',
      icon: <Download className="w-4 h-4" />,
      shortcut: ['⌘', 'E'],
      action: options.onExport,
      keywords: ['download', 'save', 'backup', 'json', 'csv'],
    });
  }

  if (options.onImport) {
    commands.push({
      id: 'data-import',
      label: 'Import Data',
      description: 'Restore from a backup file',
      category: 'Data',
      icon: <Upload className="w-4 h-4" />,
      action: options.onImport,
      keywords: ['upload', 'restore', 'backup'],
    });
  }

  if (options.onShowIntegrity) {
    commands.push({
      id: 'data-integrity',
      label: 'Check Data Integrity',
      description: 'Validate data quality and detect issues',
      category: 'Data',
      icon: <Shield className="w-4 h-4" />,
      action: options.onShowIntegrity,
      keywords: ['validate', 'quality', 'corruption', 'health'],
    });
  }

  // View commands
  if (options.onToggleDensity) {
    commands.push(
      {
        id: 'view-compact',
        label: 'Compact View',
        description: 'Maximum data density',
        category: 'View',
        icon: <Maximize2 className="w-4 h-4" />,
        shortcut: ['Alt', '1'],
        action: () => options.onToggleDensity?.('compact'),
        keywords: ['dense', 'small'],
      },
      {
        id: 'view-comfortable',
        label: 'Comfortable View',
        description: 'Balanced density',
        category: 'View',
        icon: <Eye className="w-4 h-4" />,
        shortcut: ['Alt', '2'],
        action: () => options.onToggleDensity?.('comfortable'),
        keywords: ['normal', 'default'],
      },
      {
        id: 'view-spacious',
        label: 'Spacious View',
        description: 'Accessibility-friendly spacing',
        category: 'View',
        icon: <Eye className="w-4 h-4" />,
        shortcut: ['Alt', '3'],
        action: () => options.onToggleDensity?.('spacious'),
        keywords: ['large', 'accessibility', 'a11y'],
      }
    );
  }

  if (options.onToggleSidebar) {
    commands.push({
      id: 'view-sidebar',
      label: 'Toggle Sidebar',
      description: 'Show or hide the navigation sidebar',
      category: 'View',
      icon: <ChevronRight className="w-4 h-4" />,
      shortcut: ['[', ']'],
      action: options.onToggleSidebar,
      keywords: ['collapse', 'expand', 'navigation'],
    });
  }

  // Help commands
  if (options.onShowKeyboardHelp) {
    commands.push({
      id: 'help-keyboard',
      label: 'Keyboard Shortcuts',
      description: 'Show all keyboard shortcuts',
      category: 'Help',
      icon: <Keyboard className="w-4 h-4" />,
      shortcut: ['?'],
      action: options.onShowKeyboardHelp,
      keywords: ['hotkeys', 'keys'],
    });
  }

  if (options.onShowActionHistory) {
    commands.push({
      id: 'help-history',
      label: 'Action History',
      description: 'View recent actions and events',
      category: 'Help',
      icon: <History className="w-4 h-4" />,
      action: options.onShowActionHistory,
      keywords: ['audit', 'log', 'events'],
    });
  }

  // System commands
  commands.push(
    {
      id: 'system-refresh',
      label: 'Refresh Page',
      description: 'Reload the application',
      category: 'System',
      icon: <RefreshCw className="w-4 h-4" />,
      shortcut: ['⌘', 'R'],
      action: () => window.location.reload(),
      keywords: ['reload', 'restart'],
    },
    {
      id: 'system-clear-storage',
      label: 'Clear Local Storage',
      description: 'Reset app state (use with caution)',
      category: 'System',
      icon: <Database className="w-4 h-4" />,
      action: () => {
        if (confirm('This will reset all settings and session data. Continue?')) {
          localStorage.clear();
          sessionStorage.clear();
          window.location.reload();
        }
      },
      keywords: ['reset', 'cache'],
    }
  );

  return commands;
}

// ============================================================================
// HOOK FOR GLOBAL SHORTCUT
// ============================================================================

export function useCommandPalette(commands: CommandItem[]): {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  CommandPaletteComponent: React.FC;
} {
  const [isOpen, setIsOpen] = useState(false);

  // Global keyboard shortcut (Cmd+K or Ctrl+K)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const CommandPaletteComponent = useCallback(() => (
    <CommandPalette
      isOpen={isOpen}
      onClose={() => setIsOpen(false)}
      commands={commands}
    />
  ), [isOpen, commands]);

  return {
    isOpen,
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
    CommandPaletteComponent,
  };
}

export default CommandPalette;
