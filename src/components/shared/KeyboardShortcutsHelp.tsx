/**
 * KeyboardShortcutsHelp - Feature Discoverability Modal
 * 
 * Shows all keyboard shortcuts and features in a modal.
 * Triggered by pressing '?' or clicking help icon.
 * 
 * ANTIFRAGILE: Purely informational, helps users discover features
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  Keyboard, X, Search, Settings, Download, HelpCircle,
  ChevronRight, Command, ArrowUp, ArrowDown, Globe,
  Maximize2, Eye, Shield, Database, RefreshCw, Upload
} from 'lucide-react';

interface ShortcutCategory {
  name: string;
  icon: React.ReactNode;
  shortcuts: Shortcut[];
}

interface Shortcut {
  keys: string[];
  description: string;
  available?: boolean;
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    name: 'Navigation',
    icon: <ChevronRight className="w-4 h-4" />,
    shortcuts: [
      { keys: ['⌘', 'K'], description: 'Open Smart Search' },
      { keys: ['⌘', '⇧', '/'], description: 'Table of Contents' },
      { keys: ['G'], description: 'Open Connectography Globe' },
      { keys: ['['], description: 'Collapse sidebar' },
      { keys: [']'], description: 'Expand sidebar' },
      { keys: ['↑', '↓'], description: 'Navigate tabs' },
      { keys: ['Enter'], description: 'Select tab' },
    ]
  },
  {
    name: 'Density & View',
    icon: <Eye className="w-4 h-4" />,
    shortcuts: [
      { keys: ['Alt', '1'], description: 'Compact density' },
      { keys: ['Alt', '2'], description: 'Comfortable density' },
      { keys: ['Alt', '3'], description: 'Spacious density' },
      { keys: ['F'], description: 'Toggle fullscreen' },
      { keys: ['Esc'], description: 'Exit fullscreen / Close modal' },
    ]
  },
  {
    name: 'Data & Export',
    icon: <Download className="w-4 h-4" />,
    shortcuts: [
      { keys: ['⌘', 'E'], description: 'Export data' },
      { keys: ['⌘', 'S'], description: 'Save current state' },
    ]
  },
  {
    name: 'Help & Settings',
    icon: <Settings className="w-4 h-4" />,
    shortcuts: [
      { keys: ['?'], description: 'Show this help' },
      { keys: ['⌘', ','], description: 'Open settings' },
      { keys: ['H'], description: 'Open help documentation' },
    ]
  },
];

const FEATURES = [
  {
    icon: <Database className="w-4 h-4 text-blue-500" />,
    name: 'Data Export',
    description: 'Export facilities as JSON, CSV, or full backup',
    location: 'Quick Actions → Export Data'
  },
  {
    icon: <Upload className="w-4 h-4 text-indigo-500" />,
    name: 'Data Import',
    description: 'Restore from backup with validation',
    location: 'Quick Actions → Import Data'
  },
  {
    icon: <Shield className="w-4 h-4 text-green-500" />,
    name: 'System Health',
    description: 'Monitor database, network, storage status',
    location: 'Overview → Bottom of page'
  },
  {
    icon: <RefreshCw className="w-4 h-4 text-amber-500" />,
    name: 'Auto-Backup',
    description: 'Automatic crash recovery (saves every 60s)',
    location: 'Runs silently in background'
  },
  {
    icon: <Globe className="w-4 h-4 text-purple-500" />,
    name: 'Connectography',
    description: '3D globe view of global infrastructure',
    location: 'Press G anywhere'
  },
  {
    icon: <Search className="w-4 h-4 text-cyan-500" />,
    name: 'Smart Search',
    description: 'Natural language search across all data',
    location: 'Press ⌘K anywhere'
  },
];

interface KeyboardShortcutsHelpProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function KeyboardShortcutsHelp({ isOpen: controlledIsOpen, onClose }: KeyboardShortcutsHelpProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'features'>('shortcuts');
  
  const isOpen = controlledIsOpen ?? internalIsOpen;
  
  const handleClose = useCallback(() => {
    if (onClose) {
      onClose();
    } else {
      setInternalIsOpen(false);
    }
  }, [onClose]);

  // Listen for '?' key to open help
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === '?' && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        if (onClose) {
          // Controlled mode - parent handles state
        } else {
          setInternalIsOpen(prev => !prev);
        }
      }
      
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Keyboard className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Keyboard Shortcuts & Features</h3>
              <p className="text-xs text-gray-500">Press ? anytime to show this help</p>
            </div>
          </div>
          <button 
            onClick={handleClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setActiveTab('shortcuts')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'shortcuts'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Keyboard className="w-4 h-4 inline mr-2" />
            Shortcuts
          </button>
          <button
            onClick={() => setActiveTab('features')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'features'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            <HelpCircle className="w-4 h-4 inline mr-2" />
            Features
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'shortcuts' ? (
            <div className="space-y-6">
              {SHORTCUT_CATEGORIES.map(category => (
                <div key={category.name}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-gray-400">{category.icon}</span>
                    <h4 className="font-medium text-gray-700">{category.name}</h4>
                  </div>
                  <div className="grid gap-2">
                    {category.shortcuts.map((shortcut, i) => (
                      <div 
                        key={i}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-sm text-gray-600">{shortcut.description}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, j) => (
                            <span key={j}>
                              <kbd className="px-2 py-1 bg-white border border-gray-300 rounded text-xs font-mono shadow-sm">
                                {key}
                              </kbd>
                              {j < shortcut.keys.length - 1 && (
                                <span className="text-gray-400 mx-0.5">+</span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-4">
                Antifragile features that protect your data and improve your workflow:
              </p>
              {FEATURES.map((feature, i) => (
                <div 
                  key={i}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="p-2 bg-white rounded-lg shadow-sm flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-800">{feature.name}</h5>
                    <p className="text-sm text-gray-500">{feature.description}</p>
                    <p className="text-xs text-blue-600 mt-1">📍 {feature.location}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <Command className="w-3 h-3" />
              = Cmd (Mac) / Ctrl (Windows)
            </span>
            <span>
              Press <kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">Esc</kbd> to close
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// HELP TRIGGER BUTTON
// ============================================================================

interface HelpTriggerButtonProps {
  onClick?: () => void;
  className?: string;
}

export function HelpTriggerButton({ onClick, className = '' }: HelpTriggerButtonProps) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => {
          if (onClick) {
            onClick();
          } else {
            setIsHelpOpen(true);
          }
        }}
        className={`p-2 hover:bg-gray-100 rounded-lg transition-colors group ${className}`}
        title="Keyboard shortcuts (press ?)"
      >
        <Keyboard className="w-5 h-5 text-gray-400 group-hover:text-gray-600" />
      </button>
      
      {!onClick && (
        <KeyboardShortcutsHelp 
          isOpen={isHelpOpen} 
          onClose={() => setIsHelpOpen(false)} 
        />
      )}
    </>
  );
}

export default KeyboardShortcutsHelp;
