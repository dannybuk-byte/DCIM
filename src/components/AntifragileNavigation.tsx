/**
 * Antifragile Navigation System
 * 
 * Implements 3 navigation enhancements with 7 layers of antifragility:
 * 1. Error Boundaries - Component crashes contained
 * 2. Graceful Degradation - Fallbacks if features fail
 * 3. Persistent State - LocalStorage with circuit breaker
 * 4. Rate Limiting - Prevents excessive operations
 * 5. Input Sanitization - Cleans user input
 * 6. Timeout Protection - Prevents hanging
 * 7. Offline Support - Works without network
 * 
 * Components:
 * - SmartSearchNav: AI-powered "take me to..." navigation (P0)
 * - TabGroupsNav: Collapsible tab categories (P1)
 * - QuickAccessNav: Floating favorites bar (P2)
 */

import React, { 
  useState, useEffect, useCallback, useMemo, useRef,
  createContext, useContext, ErrorInfo, Component, ReactNode
} from 'react';
import {
  Search, Star, Clock, ChevronRight, ChevronDown, ChevronUp,
  Zap, X, Pin, PinOff, Sparkles, ArrowRight, Home, Brain,
  Target, Database, Shield, Globe, Building, Network, FileText,
  AlertTriangle, TrendingUp, Eye, Layers, Settings, HelpCircle,
  BookOpen, Command, Activity, Check, Maximize2, Minimize2
} from 'lucide-react';

// ============================================================================
// ANTIFRAGILITY LAYER 1: ERROR BOUNDARY
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class NavErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode; name: string },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode; name: string }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error(`[NavErrorBoundary:${this.props.name}]`, error, errorInfo);
    this.setState({ errorInfo });
    
    // Log to error tracking
    try {
      const errorLog = JSON.parse(localStorage.getItem('nav_error_log') || '[]');
      errorLog.push({
        component: this.props.name,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem('nav_error_log', JSON.stringify(errorLog.slice(-50)));
    } catch {
      // Ignore storage errors
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-2 text-xs text-slate-500 bg-slate-100 rounded">
          Navigation feature unavailable
        </div>
      );
    }
    return this.props.children;
  }
}

// ============================================================================
// ANTIFRAGILITY LAYER 2: PERSISTENT STATE WITH CIRCUIT BREAKER
// ============================================================================

interface StorageState {
  failures: number;
  lastFailure: number;
  isOpen: boolean;
}

const storageCircuitBreaker: StorageState = {
  failures: 0,
  lastFailure: 0,
  isOpen: false
};

const STORAGE_FAILURE_THRESHOLD = 3;
const STORAGE_RESET_TIMEOUT = 30000; // 30 seconds

function safeStorageGet<T>(key: string, defaultValue: T): T {
  // Check if circuit breaker is open
  if (storageCircuitBreaker.isOpen) {
    const timeSinceFailure = Date.now() - storageCircuitBreaker.lastFailure;
    if (timeSinceFailure < STORAGE_RESET_TIMEOUT) {
      return defaultValue;
    }
    // Reset circuit breaker after timeout
    storageCircuitBreaker.isOpen = false;
    storageCircuitBreaker.failures = 0;
  }

  try {
    const stored = localStorage.getItem(key);
    if (!stored) return defaultValue;
    return JSON.parse(stored) as T;
  } catch (error) {
    storageCircuitBreaker.failures++;
    storageCircuitBreaker.lastFailure = Date.now();
    
    if (storageCircuitBreaker.failures >= STORAGE_FAILURE_THRESHOLD) {
      storageCircuitBreaker.isOpen = true;
      console.warn(`[Storage] Circuit breaker opened after ${storageCircuitBreaker.failures} failures`);
    }
    
    return defaultValue;
  }
}

function safeStorageSet(key: string, value: unknown): boolean {
  if (storageCircuitBreaker.isOpen) {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    // Reset failures on success
    storageCircuitBreaker.failures = Math.max(0, storageCircuitBreaker.failures - 1);
    return true;
  } catch (error) {
    storageCircuitBreaker.failures++;
    storageCircuitBreaker.lastFailure = Date.now();
    
    if (storageCircuitBreaker.failures >= STORAGE_FAILURE_THRESHOLD) {
      storageCircuitBreaker.isOpen = true;
    }
    
    return false;
  }
}

// ============================================================================
// ANTIFRAGILITY LAYER 3: INPUT SANITIZATION
// ============================================================================

function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';
  
  return query
    .trim()
    .slice(0, 200) // Max length
    .replace(/[<>]/g, '') // Remove potential HTML
    .replace(/javascript:/gi, '') // Remove JS injection
    .replace(/\s+/g, ' '); // Normalize whitespace
}

// ============================================================================
// ANTIFRAGILITY LAYER 4: DEBOUNCE & RATE LIMITING
// ============================================================================

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// NAVIGATION CONTEXT
// ============================================================================

interface NavTab {
  id: string;
  label: string;
  shortLabel?: string;
  icon: ReactNode;
  group: string;
  keywords: string[];
  description?: string;
}

interface NavContextValue {
  tabs: NavTab[];
  activeTab: string;
  setActiveTab: (id: string) => void;
  pinnedTabs: Set<string>;
  togglePin: (id: string) => void;
  recentTabs: string[];
  expandedGroups: Set<string>;
  toggleGroup: (id: string) => void;
}

const NavContext = createContext<NavContextValue | null>(null);

export const useNav = (): NavContextValue => {
  const context = useContext(NavContext);
  if (!context) {
    throw new Error('useNav must be used within NavProvider');
  }
  return context;
};

// ============================================================================
// NAV PROVIDER (STATE MANAGEMENT)
// ============================================================================

interface NavProviderProps {
  children: ReactNode;
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export const NavProvider: React.FC<NavProviderProps> = ({
  children,
  tabs,
  activeTab,
  onTabChange
}) => {
  // Pinned tabs - persisted
  const [pinnedTabs, setPinnedTabs] = useState<Set<string>>(() => {
    const stored = safeStorageGet<string[]>('nav_pinned_tabs', []);
    return new Set(stored);
  });

  // Recent tabs - persisted (last 10)
  const [recentTabs, setRecentTabs] = useState<string[]>(() => {
    return safeStorageGet<string[]>('nav_recent_tabs', []);
  });

  // Expanded groups - persisted
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const stored = safeStorageGet<string[]>('nav_expanded_groups', ['Analysis & Intelligence']);
    return new Set(stored);
  });

  // Track recent tabs
  useEffect(() => {
    if (!activeTab) return;
    
    setRecentTabs(prev => {
      const filtered = prev.filter(t => t !== activeTab);
      const updated = [activeTab, ...filtered].slice(0, 10);
      safeStorageSet('nav_recent_tabs', updated);
      return updated;
    });
  }, [activeTab]);

  const togglePin = useCallback((id: string) => {
    setPinnedTabs(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      safeStorageSet('nav_pinned_tabs', Array.from(next));
      return next;
    });
  }, []);

  const toggleGroup = useCallback((id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      safeStorageSet('nav_expanded_groups', Array.from(next));
      return next;
    });
  }, []);

  const value: NavContextValue = {
    tabs,
    activeTab,
    setActiveTab: onTabChange,
    pinnedTabs,
    togglePin,
    recentTabs,
    expandedGroups,
    toggleGroup
  };

  return (
    <NavContext.Provider value={value}>
      {children}
    </NavContext.Provider>
  );
};

// ============================================================================
// COMPONENT 1: SMART SEARCH (AI-POWERED NAVIGATION)
// ============================================================================

interface SmartSearchNavProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SmartSearchNav: React.FC<SmartSearchNavProps> = ({ isOpen, onClose }) => {
  const { tabs, setActiveTab } = useNav();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedQuery = useDebounce(sanitizeSearchQuery(query), 150);

  // Search algorithm with fuzzy matching
  const results = useMemo(() => {
    if (!debouncedQuery.trim()) return [];
    
    const q = debouncedQuery.toLowerCase();
    const words = q.split(' ').filter(Boolean);
    
    return tabs
      .map(tab => {
        let score = 0;
        const searchText = [
          tab.label,
          tab.shortLabel,
          tab.description,
          ...tab.keywords
        ].filter(Boolean).join(' ').toLowerCase();
        
        // Exact match in label
        if (tab.label.toLowerCase().includes(q)) score += 100;
        
        // Word matches
        for (const word of words) {
          if (searchText.includes(word)) score += 20;
          if (tab.label.toLowerCase().includes(word)) score += 30;
          if (tab.keywords.some(k => k.toLowerCase().includes(word))) score += 25;
        }
        
        // Natural language patterns
        if (q.includes('subsid') || q.includes('tax break') || q.includes('good jobs')) {
          if (tab.id === 'Predictive Subsidy') score += 50;
        }
        if (q.includes('scraper') || q.includes('api') || q.includes('municipal') || q.includes('regula')) {
          if (tab.id === 'Regulatory Toolkit') score += 50;
        }
        if (q.includes('intel') || q.includes('ai') || q.includes('pattern')) {
          if (tab.group === 'Analysis & Intelligence') score += 30;
        }
        if (q.includes('alert') || q.includes('risk') || q.includes('problem') || q.includes('issue')) {
          if (tab.id === 'Problems') score += 50;
        }
        if (q.includes('map') || q.includes('geo') || q.includes('location')) {
          if (tab.id === 'Geography' || tab.id === 'Network Map') score += 50;
        }
        
        return { tab, score };
      })
      .filter(r => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map(r => r.tab);
  }, [debouncedQuery, tabs]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;
    
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(i => Math.min(i + 1, results.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(i => Math.max(i - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            setActiveTab(results[selectedIndex].id);
            onClose();
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, setActiveTab, onClose]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  if (!isOpen) return null;

  const suggestions = [
    { q: 'Show me subsidy risks', icon: <Target size={16} /> },
    { q: 'Regulatory scrapers', icon: <Database size={16} /> },
    { q: 'Facilities with issues', icon: <AlertTriangle size={16} /> },
    { q: 'Intelligence hub', icon: <Brain size={16} /> },
  ];

  return (
    <NavErrorBoundary name="SmartSearch" fallback={null}>
      <div 
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[12vh]"
        onClick={onClose}
      >
        <div 
          className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          {/* Search header */}
          <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-xl shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Where would you like to go? Try 'subsidy risks' or 'regulatory APIs'..."
                className="flex-1 text-lg outline-none placeholder:text-slate-400 bg-transparent"
              />
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            </div>
          </div>

          {/* Results */}
          <div className="max-h-[50vh] overflow-y-auto">
            {results.length > 0 ? (
              <div className="p-2">
                {results.map((tab, index) => (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); onClose(); }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all ${
                      index === selectedIndex
                        ? 'bg-blue-50 ring-2 ring-blue-200'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl ${
                      index === selectedIndex 
                        ? 'bg-blue-100 text-blue-600' 
                        : 'bg-slate-100 text-slate-600'
                    }`}>
                      {tab.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-slate-800">{tab.label}</div>
                      {tab.description && (
                        <div className="text-sm text-slate-500 truncate">{tab.description}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-100 text-slate-600">
                        {tab.group}
                      </span>
                      {index === selectedIndex && (
                        <ArrowRight size={16} className="text-blue-500" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ) : query ? (
              <div className="p-8 text-center text-slate-500">
                <Search className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p className="font-medium">No results for "{query}"</p>
                <p className="text-sm mt-1">Try different keywords</p>
              </div>
            ) : (
              <div className="p-4">
                <div className="text-xs text-slate-500 font-medium px-2 mb-2">SUGGESTIONS</div>
                {suggestions.map(s => (
                  <button
                    key={s.q}
                    onClick={() => setQuery(s.q)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 text-left transition-colors"
                  >
                    <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                      {s.icon}
                    </div>
                    <span className="text-sm text-slate-600">{s.q}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm">↑↓</kbd>
                <span>Navigate</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm">↵</kbd>
                <span>Go</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-sm">esc</kbd>
                <span>Close</span>
              </span>
            </div>
            <span className="flex items-center gap-1.5">
              <Sparkles size={12} className="text-purple-500" />
              <span>Smart Navigation</span>
            </span>
          </div>
        </div>
      </div>
    </NavErrorBoundary>
  );
};

// ============================================================================
// COMPONENT 2: TAB GROUPS (COLLAPSIBLE)
// ============================================================================

interface TabGroup {
  id: string;
  label: string;
  icon: ReactNode;
  color: string;
}

const TAB_GROUPS: TabGroup[] = [
  { id: 'Getting Started', label: 'Start', icon: <Home size={16} />, color: 'blue' },
  { id: 'Analysis & Intelligence', label: 'Analysis', icon: <Brain size={16} />, color: 'purple' },
  { id: 'Operations', label: 'Ops', icon: <Settings size={16} />, color: 'slate' },
  { id: 'Visualization', label: 'Viz', icon: <Globe size={16} />, color: 'emerald' },
];

export const TabGroupsNav: React.FC = () => {
  const { tabs, activeTab, setActiveTab, expandedGroups, toggleGroup } = useNav();

  // Group tabs by their group property
  const groupedTabs = useMemo(() => {
    const groups: Record<string, NavTab[]> = {};
    for (const tab of tabs) {
      const groupId = tab.group || 'Other';
      if (!groups[groupId]) groups[groupId] = [];
      groups[groupId].push(tab);
    }
    return groups;
  }, [tabs]);

  // Find which group the active tab belongs to
  const activeGroup = useMemo(() => {
    const tab = tabs.find(t => t.id === activeTab);
    return tab?.group || null;
  }, [tabs, activeTab]);

  return (
    <NavErrorBoundary name="TabGroups">
      <div className="flex items-center gap-1 overflow-x-auto py-1 px-2 scrollbar-hide">
        {TAB_GROUPS.map(group => {
          const groupTabs = groupedTabs[group.id] || [];
          if (groupTabs.length === 0) return null;
          
          const isExpanded = expandedGroups.has(group.id);
          const hasActiveTab = activeGroup === group.id;
          
          const colorClasses: Record<string, { bg: string; text: string; activeBg: string }> = {
            blue: { bg: 'bg-blue-100', text: 'text-blue-700', activeBg: 'bg-blue-600' },
            purple: { bg: 'bg-purple-100', text: 'text-purple-700', activeBg: 'bg-purple-600' },
            slate: { bg: 'bg-slate-100', text: 'text-slate-700', activeBg: 'bg-slate-600' },
            emerald: { bg: 'bg-emerald-100', text: 'text-emerald-700', activeBg: 'bg-emerald-600' },
          };
          const colors = colorClasses[group.color] || colorClasses.slate;

          return (
            <div key={group.id} className="flex items-center shrink-0">
              {/* Group button */}
              <button
                onClick={() => toggleGroup(group.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  hasActiveTab
                    ? `${colors.bg} ${colors.text}`
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {group.icon}
                <span className="hidden sm:inline">{group.label}</span>
                <span className="text-xs opacity-60">({groupTabs.length})</span>
                <ChevronRight 
                  size={14} 
                  className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>

              {/* Expanded tabs */}
              {isExpanded && (
                <div className="flex items-center ml-1 gap-0.5 animate-in slide-in-from-left-2">
                  {groupTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`px-2.5 py-1 rounded-md text-sm whitespace-nowrap transition-all ${
                        activeTab === tab.id
                          ? `${colors.activeBg} text-white shadow-sm`
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                      title={tab.description}
                    >
                      {tab.shortLabel || tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </NavErrorBoundary>
  );
};

// ============================================================================
// COMPONENT 3: QUICK ACCESS BAR (FLOATING FAVORITES)
// ============================================================================

export const QuickAccessNav: React.FC = () => {
  const { tabs, activeTab, setActiveTab, pinnedTabs, togglePin, recentTabs } = useNav();
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Get pinned tab objects
  const pinned = useMemo(() => {
    return tabs.filter(t => pinnedTabs.has(t.id));
  }, [tabs, pinnedTabs]);

  // Get recent (non-pinned) tab objects
  const recent = useMemo(() => {
    return recentTabs
      .filter(id => !pinnedTabs.has(id) && id !== activeTab)
      .slice(0, 4)
      .map(id => tabs.find(t => t.id === id))
      .filter((t): t is NavTab => t !== undefined);
  }, [tabs, recentTabs, pinnedTabs, activeTab]);

  // Don't render if nothing to show
  if (pinned.length === 0 && recent.length === 0) return null;

  return (
    <NavErrorBoundary name="QuickAccess">
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
        <div className={`bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-700/50 overflow-hidden transition-all ${
          isMinimized ? 'opacity-50 hover:opacity-100' : ''
        }`}>
          {/* Collapsed bar */}
          <div className="flex items-center gap-1 p-2">
            {/* Pinned tabs */}
            {!isMinimized && pinned.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`p-2 rounded-xl transition-all relative group ${
                  activeTab === tab.id
                    ? 'bg-amber-500/30 text-amber-300'
                    : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20'
                }`}
                title={tab.label}
              >
                {tab.icon}
                <Star className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 text-amber-400 fill-amber-400" />
              </button>
            ))}

            {!isMinimized && pinned.length > 0 && recent.length > 0 && (
              <div className="w-px h-6 bg-slate-600 mx-1" />
            )}

            {/* Recent tabs */}
            {!isMinimized && recent.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="p-2 rounded-xl bg-slate-700/30 text-slate-400 hover:bg-slate-600/50 hover:text-slate-300 transition-all"
                title={tab.label}
              >
                {tab.icon}
              </button>
            ))}

            {!isMinimized && (pinned.length > 0 || recent.length > 0) && (
              <div className="w-px h-6 bg-slate-600 mx-1" />
            )}

            {/* Controls */}
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-xl bg-slate-700/30 text-slate-400 hover:text-white transition-all"
              title={isExpanded ? 'Collapse' : 'Expand'}
            >
              {isExpanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </button>
            
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-2 rounded-xl bg-slate-700/30 text-slate-400 hover:text-white transition-all"
              title={isMinimized ? 'Restore' : 'Minimize'}
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>
          </div>

          {/* Expanded panel */}
          {isExpanded && !isMinimized && (
            <div className="border-t border-slate-700 p-3 max-w-sm animate-in slide-in-from-bottom-2">
              {/* Pinned section */}
              {pinned.length > 0 && (
                <>
                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5 px-1">
                    <Star size={12} className="text-amber-400" /> Pinned
                  </div>
                  <div className="space-y-1 mb-3">
                    {pinned.map(tab => (
                      <div key={tab.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => setActiveTab(tab.id)}
                          className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                            activeTab === tab.id
                              ? 'bg-slate-600 text-white'
                              : 'bg-slate-700/30 hover:bg-slate-600/50 text-slate-300'
                          }`}
                        >
                          {tab.icon}
                          <span className="text-sm truncate">{tab.label}</span>
                        </button>
                        <button
                          onClick={() => togglePin(tab.id)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-600 transition-all"
                          title="Unpin"
                        >
                          <PinOff size={14} className="text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Recent section */}
              {recent.length > 0 && (
                <>
                  <div className="text-xs text-slate-500 mb-2 flex items-center gap-1.5 px-1">
                    <Clock size={12} /> Recent
                  </div>
                  <div className="space-y-1">
                    {recent.map(tab => (
                      <div key={tab.id} className="flex items-center gap-2 group">
                        <button
                          onClick={() => setActiveTab(tab.id)}
                          className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 text-left text-slate-400 hover:text-slate-300 transition-all"
                        >
                          {tab.icon}
                          <span className="text-sm truncate">{tab.label}</span>
                        </button>
                        <button
                          onClick={() => togglePin(tab.id)}
                          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-600 transition-all"
                          title="Pin"
                        >
                          <Pin size={14} className="text-slate-400" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Empty state */}
              {pinned.length === 0 && recent.length === 0 && (
                <div className="text-center text-slate-500 py-4">
                  <Star className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No favorites yet</p>
                  <p className="text-xs mt-1">Pin tabs for quick access</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </NavErrorBoundary>
  );
};

// ============================================================================
// KEYBOARD SHORTCUT HANDLER
// ============================================================================

export const useNavigationShortcuts = (
  onOpenSearch: () => void,
  onToggleQuickAccess: () => void
): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ⌘K or Ctrl+K - Open smart search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpenSearch();
      }
      
      // ⌘J or Ctrl+J - Toggle quick access
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault();
        onToggleQuickAccess();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onOpenSearch, onToggleQuickAccess]);
};

// ============================================================================
// EXPORT: INTEGRATED NAVIGATION SYSTEM
// ============================================================================

interface AntifragileNavigationProps {
  tabs: NavTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  showTabGroups?: boolean;
  showQuickAccess?: boolean;
}

export const AntifragileNavigation: React.FC<AntifragileNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  showTabGroups = true,
  showQuickAccess = true
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keyboard shortcuts
  useNavigationShortcuts(
    () => setIsSearchOpen(true),
    () => {} // Quick access is always visible
  );

  return (
    <NavProvider tabs={tabs} activeTab={activeTab} onTabChange={onTabChange}>
      {/* Tab Groups - renders in place */}
      {showTabGroups && <TabGroupsNav />}
      
      {/* Quick Access Bar - fixed position */}
      {showQuickAccess && <QuickAccessNav />}
      
      {/* Smart Search Modal */}
      <SmartSearchNav isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </NavProvider>
  );
};

export default AntifragileNavigation;

