/**
 * Command Palette - Spotlight-style search for DCIM Command Center
 * Powered by FlexSearch for instant results across 11,992 facilities
 */

import { memo, useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, X, Building2, MapPin, Users, AlertTriangle, 
  CheckCircle, XCircle, Clock, ArrowRight, Command, Hash
} from 'lucide-react';
import { useFlexSearch } from '../../hooks/useFlexSearch';
import type { Facility } from '../../types';
import { formatCurrency } from '../../utils/formatting';

const COLORS = {
  bg: '#0a0e17',
  bgCard: '#0d1219',
  text: '#e8eef6',
  textMuted: '#5a6d8a',
  red: '#ff4757',
  yellow: '#ffa502',
  green: '#2ed573',
  cyan: '#00d2d3',
  purple: '#a855f7',
};

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];
  onSelectFacility?: (facility: Facility) => void;
  onFilterByOperator?: (operator: string) => void;
  onFilterByState?: (state: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

const complianceIcons: Record<string, { icon: typeof CheckCircle; color: string }> = {
  'Compliant': { icon: CheckCircle, color: COLORS.green },
  'Non-Compliant': { icon: XCircle, color: COLORS.red },
  'At Risk': { icon: AlertTriangle, color: COLORS.yellow },
  'Unknown': { icon: Clock, color: COLORS.textMuted },
};

// Quick actions for command palette
const QUICK_ACTIONS = [
  { id: 'tab:overview', label: 'Go to Overview', icon: Hash, category: 'Navigation' },
  { id: 'tab:pattern-lab', label: 'Go to Pattern Lab', icon: Hash, category: 'Navigation' },
  { id: 'tab:network-security', label: 'Go to Network Security', icon: Hash, category: 'Navigation' },
  { id: 'tab:connectography', label: 'Go to Connectography', icon: Hash, category: 'Navigation' },
  { id: 'filter:non-compliant', label: 'Show Non-Compliant Only', icon: XCircle, category: 'Filter' },
  { id: 'filter:at-risk', label: 'Show At Risk Only', icon: AlertTriangle, category: 'Filter' },
  { id: 'filter:high-gap', label: 'Show High Subsidy Gap (>$1M)', icon: AlertTriangle, category: 'Filter' },
];

export const CommandPalette = memo(function CommandPalette({
  isOpen,
  onClose,
  facilities,
  onSelectFacility,
  onFilterByOperator,
  onFilterByState,
  onNavigateToTab,
}: CommandPaletteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  
  const { 
    search, 
    results, 
    query, 
    isSearching, 
    isIndexed,
    indexedCount 
  } = useFlexSearch(facilities, { limit: 20, debounceMs: 100 });

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results, query]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalItems = query ? results.length : QUICK_ACTIONS.length;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % totalItems);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + totalItems) % totalItems);
        break;
      case 'Enter':
        e.preventDefault();
        if (query && results[selectedIndex]) {
          handleSelectFacility(results[selectedIndex].facility);
        } else if (!query && QUICK_ACTIONS[selectedIndex]) {
          handleQuickAction(QUICK_ACTIONS[selectedIndex].id);
        }
        break;
      case 'Escape':
        onClose();
        break;
    }
  }, [query, results, selectedIndex, onClose]);

  const handleSelectFacility = useCallback((facility: Facility) => {
    onSelectFacility?.(facility);
    onClose();
  }, [onSelectFacility, onClose]);

  const handleQuickAction = useCallback((actionId: string) => {
    const [type, value] = actionId.split(':');
    
    if (type === 'tab') {
      const tabMap: Record<string, string> = {
        'overview': 'Overview',
        'pattern-lab': 'Pattern Lab',
        'network-security': 'Network Security',
        'connectography': 'Connectography',
      };
      onNavigateToTab?.(tabMap[value] || 'Overview');
    } else if (type === 'filter') {
      // Handle filter actions
      if (value === 'non-compliant') {
        // This would need to be wired up to the filter system
      }
    }
    
    onClose();
  }, [onNavigateToTab, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const selectedElement = listRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      {/* Palette */}
      <div 
        className="relative w-full max-w-2xl mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-800">
          <Search className="w-5 h-5 text-gray-500" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => search(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search facilities, operators, locations..."
            className="flex-1 bg-transparent text-white text-lg placeholder-gray-500 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => search('')}
              className="p-1 hover:bg-gray-800 rounded transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
          <div className="flex items-center gap-1 px-2 py-1 bg-gray-800 rounded text-xs text-gray-500">
            <Command className="w-3 h-3" />
            <span>K</span>
          </div>
        </div>

        {/* Status bar */}
        <div className="px-4 py-1.5 bg-gray-950 border-b border-gray-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {isSearching ? (
              <span className="text-cyan-400 flex items-center gap-1">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                Searching...
              </span>
            ) : isIndexed ? (
              <span className="text-green-400 flex items-center gap-1">
                <div className="w-2 h-2 bg-green-400 rounded-full" />
                {indexedCount.toLocaleString()} facilities indexed
              </span>
            ) : (
              <span className="text-yellow-400 flex items-center gap-1">
                <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
                Indexing...
              </span>
            )}
          </div>
          {query && (
            <span className="text-gray-500">
              {results.length} results
            </span>
          )}
        </div>

        {/* Results */}
        <div 
          ref={listRef}
          className="max-h-[50vh] overflow-y-auto"
        >
          {query ? (
            // Search results
            results.length > 0 ? (
              <div className="py-2">
                {results.map((result, index) => {
                  const f = result.facility;
                  const statusInfo = complianceIcons[f.complianceStatus] || complianceIcons['Unknown'];
                  const StatusIcon = statusInfo.icon;
                  
                  return (
                    <button
                      key={f.id}
                      data-index={index}
                      onClick={() => handleSelectFacility(f)}
                      className={`
                        w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors
                        ${index === selectedIndex ? 'bg-cyan-500/10' : 'hover:bg-gray-800/50'}
                      `}
                    >
                      <Building2 className="w-5 h-5 text-gray-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white truncate">{f.name}</span>
                          <StatusIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: statusInfo.color }} />
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {f.operator}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {f.city}, {f.state}
                          </span>
                          {f.subsidyGap > 0 && (
                            <span className="text-yellow-400">
                              {formatCurrency(f.subsidyGap)}
                            </span>
                          )}
                        </div>
                      </div>
                      <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-12 text-center text-gray-500">
                <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <div>No facilities found</div>
                <div className="text-xs mt-1">Try a different search term</div>
              </div>
            )
          ) : (
            // Quick actions when no query
            <div className="py-2">
              <div className="px-4 py-1.5 text-xs text-gray-500 uppercase tracking-wide">
                Quick Actions
              </div>
              {QUICK_ACTIONS.map((action, index) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    data-index={index}
                    onClick={() => handleQuickAction(action.id)}
                    className={`
                      w-full px-4 py-2.5 flex items-center gap-3 text-left transition-colors
                      ${index === selectedIndex ? 'bg-cyan-500/10' : 'hover:bg-gray-800/50'}
                    `}
                  >
                    <Icon className="w-4 h-4 text-gray-500" />
                    <span className="flex-1 text-white">{action.label}</span>
                    <span className="text-xs text-gray-600">{action.category}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-800 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Enter</kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-gray-800 rounded">Esc</kbd>
              Close
            </span>
          </div>
          <span>Powered by FlexSearch</span>
        </div>
      </div>
    </div>
  );
});

export default CommandPalette;

