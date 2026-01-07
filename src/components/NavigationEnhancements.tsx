/**
 * Navigation Enhancement Options
 * 
 * This file demonstrates multiple navigation patterns that can be adopted
 * to maximize ease-of-use and intuitive navigability.
 * 
 * OPTIONS INCLUDED:
 * 1. QuickAccessBar - Floating favorites/recent tabs
 * 2. ContextualActions - Smart actions based on current view
 * 3. NavigationMap - Visual sitemap/overview
 * 4. GuidedTours - Step-by-step onboarding
 * 5. SmartSearch - AI-powered "take me to..." navigation
 * 6. TabGroups - Collapsible tab categories
 * 7. Breadcrumbs+ - Enhanced breadcrumbs with quick jumps
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Home, Star, Clock, Search, ChevronRight, ChevronDown, ChevronUp,
  Zap, Map, Compass, BookOpen, ArrowRight, X, Pin, PinOff,
  Brain, Target, Shield, Database, Globe, Building, Network,
  FileText, AlertTriangle, TrendingUp, Settings, HelpCircle,
  Command, Sparkles, Eye, Play, CheckCircle, Circle, Layers
} from 'lucide-react';

// ============================================================================
// OPTION 1: QUICK ACCESS BAR
// Floating bar with pinned favorites and recently visited tabs
// ============================================================================

interface QuickAccessItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  isPinned: boolean;
  lastVisited?: Date;
}

export const QuickAccessBar: React.FC<{
  items: QuickAccessItem[];
  onNavigate: (id: string) => void;
  onTogglePin: (id: string) => void;
}> = ({ items, onNavigate, onTogglePin }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const pinnedItems = items.filter(i => i.isPinned);
  const recentItems = items
    .filter(i => !i.isPinned && i.lastVisited)
    .sort((a, b) => (b.lastVisited?.getTime() || 0) - (a.lastVisited?.getTime() || 0))
    .slice(0, 5);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-slate-900/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-slate-700 overflow-hidden">
        {/* Collapsed: Just icons */}
        <div className="flex items-center gap-1 p-2">
          {/* Pinned */}
          {pinnedItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-all group relative"
              title={item.label}
            >
              {item.icon}
              <Star className="absolute -top-1 -right-1 w-3 h-3 text-amber-400 fill-amber-400" />
            </button>
          ))}
          
          {pinnedItems.length > 0 && recentItems.length > 0 && (
            <div className="w-px h-8 bg-slate-600 mx-1" />
          )}
          
          {/* Recent */}
          {recentItems.map(item => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="p-2.5 rounded-xl bg-slate-700/50 text-slate-300 hover:bg-slate-600 transition-all"
              title={item.label}
            >
              {item.icon}
            </button>
          ))}
          
          <div className="w-px h-8 bg-slate-600 mx-1" />
          
          {/* Expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2.5 rounded-xl bg-slate-700/50 text-slate-400 hover:text-white transition-all"
          >
            {isExpanded ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
          </button>
        </div>
        
        {/* Expanded: Full list with labels */}
        {isExpanded && (
          <div className="border-t border-slate-700 p-3 max-w-md">
            <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <Star size={12} /> Pinned
            </div>
            <div className="space-y-1 mb-3">
              {pinnedItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => onNavigate(item.id)}
                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-700/50 hover:bg-slate-600 text-left"
                  >
                    {item.icon}
                    <span className="text-sm text-slate-200">{item.label}</span>
                  </button>
                  <button
                    onClick={() => onTogglePin(item.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-600"
                  >
                    <PinOff size={14} className="text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="text-xs text-slate-500 mb-2 flex items-center gap-1">
              <Clock size={12} /> Recent
            </div>
            <div className="space-y-1">
              {recentItems.map(item => (
                <div key={item.id} className="flex items-center gap-2 group">
                  <button
                    onClick={() => onNavigate(item.id)}
                    className="flex-1 flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-700/50 text-left"
                  >
                    {item.icon}
                    <span className="text-sm text-slate-300">{item.label}</span>
                  </button>
                  <button
                    onClick={() => onTogglePin(item.id)}
                    className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-slate-600"
                  >
                    <Pin size={14} className="text-slate-400" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// OPTION 2: CONTEXTUAL ACTIONS
// Smart floating action button with context-aware suggestions
// ============================================================================

interface ContextualAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  description: string;
  shortcut?: string;
}

export const ContextualActions: React.FC<{
  currentTab: string;
  onAction: (actionId: string) => void;
}> = ({ currentTab, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Context-aware actions based on current tab
  const getActionsForTab = (tab: string): ContextualAction[] => {
    const baseActions: ContextualAction[] = [
      { id: 'search', label: 'Search', icon: <Search size={18} />, description: 'Find anything', shortcut: '⌘K' },
      { id: 'help', label: 'Help', icon: <HelpCircle size={18} />, description: 'Get help', shortcut: '?' },
    ];

    const tabSpecificActions: Record<string, ContextualAction[]> = {
      'Overview': [
        { id: 'export', label: 'Export Report', icon: <FileText size={18} />, description: 'Download PDF/CSV' },
        { id: 'alerts', label: 'View Alerts', icon: <AlertTriangle size={18} />, description: 'Critical issues' },
      ],
      'Predictive Subsidy': [
        { id: 'run-analysis', label: 'Run Analysis', icon: <Brain size={18} />, description: 'Analyze risks' },
        { id: 'compare-states', label: 'Compare States', icon: <Globe size={18} />, description: 'State comparison' },
      ],
      'Regulatory Toolkit': [
        { id: 'add-scraper', label: 'New Scraper', icon: <Database size={18} />, description: 'Create scraper' },
        { id: 'run-all', label: 'Run All Scrapers', icon: <Play size={18} />, description: 'Fetch latest data' },
      ],
      'Intelligence': [
        { id: 'new-query', label: 'New Query', icon: <Sparkles size={18} />, description: 'AI-powered search' },
        { id: 'view-agents', label: 'AI Agents', icon: <Brain size={18} />, description: 'Manage agents' },
      ],
    };

    return [...(tabSpecificActions[tab] || []), ...baseActions];
  };

  const actions = getActionsForTab(currentTab);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Actions menu */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-64 bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden mb-2">
          <div className="p-2 bg-slate-50 border-b border-slate-200">
            <span className="text-xs font-medium text-slate-500">Quick Actions</span>
          </div>
          <div className="p-2 space-y-1">
            {actions.map(action => (
              <button
                key={action.id}
                onClick={() => { onAction(action.id); setIsOpen(false); }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-left group"
              >
                <div className="p-1.5 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-600">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-slate-800">{action.label}</div>
                  <div className="text-xs text-slate-500">{action.description}</div>
                </div>
                {action.shortcut && (
                  <kbd className="px-1.5 py-0.5 text-xs bg-slate-100 rounded text-slate-500">
                    {action.shortcut}
                  </kbd>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* FAB */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all ${
          isOpen 
            ? 'bg-slate-800 text-white rotate-45' 
            : 'bg-gradient-to-br from-blue-500 to-purple-600 text-white hover:shadow-xl hover:scale-105'
        }`}
      >
        {isOpen ? <X size={24} /> : <Zap size={24} />}
      </button>
    </div>
  );
};

// ============================================================================
// OPTION 3: VISUAL NAVIGATION MAP
// Interactive sitemap showing all sections and their relationships
// ============================================================================

interface MapSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  children?: MapSection[];
}

export const NavigationMap: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (id: string) => void;
  currentTab: string;
}> = ({ isOpen, onClose, onNavigate, currentTab }) => {
  const sections: MapSection[] = [
    {
      id: 'getting-started',
      label: 'Getting Started',
      icon: <Home size={20} />,
      color: 'blue',
      children: [
        { id: 'Guides', label: 'Guides', icon: <BookOpen size={16} />, color: 'blue' },
        { id: 'Overview', label: 'Dashboard', icon: <Layers size={16} />, color: 'blue' },
      ]
    },
    {
      id: 'analysis',
      label: 'Analysis & Intelligence',
      icon: <Brain size={20} />,
      color: 'purple',
      children: [
        { id: 'Intelligence', label: 'Intelligence Hub', icon: <Brain size={16} />, color: 'purple' },
        { id: 'Pattern Intelligence', label: 'Pattern Engine', icon: <Eye size={16} />, color: 'purple' },
        { id: 'Deep Intelligence', label: 'Deep Intel', icon: <Database size={16} />, color: 'purple' },
        { id: 'Predictive Subsidy', label: 'Subsidy Intel', icon: <Target size={16} />, color: 'rose' },
        { id: 'Regulatory Toolkit', label: 'Regulatory APIs', icon: <Building size={16} />, color: 'emerald' },
        { id: 'Predictive Intel', label: 'Predictions', icon: <TrendingUp size={16} />, color: 'indigo' },
      ]
    },
    {
      id: 'operations',
      label: 'Operations',
      icon: <Settings size={20} />,
      color: 'slate',
      children: [
        { id: 'Infrastructure', label: 'Infrastructure', icon: <Network size={16} />, color: 'slate' },
        { id: 'Network Security', label: 'Security', icon: <Shield size={16} />, color: 'red' },
        { id: 'OSINT Tools', label: 'OSINT', icon: <Search size={16} />, color: 'amber' },
      ]
    },
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-lg font-bold text-slate-800">Navigation Map</h2>
              <p className="text-sm text-slate-500">Click any section to navigate</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="grid grid-cols-3 gap-6">
            {sections.map(section => (
              <div key={section.id} className="space-y-3">
                <div className="flex items-center gap-2 text-slate-700 font-medium">
                  {section.icon}
                  <span>{section.label}</span>
                </div>
                <div className="space-y-1 pl-7">
                  {section.children?.map(child => (
                    <button
                      key={child.id}
                      onClick={() => { onNavigate(child.id); onClose(); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left transition-all ${
                        currentTab === child.id
                          ? 'bg-blue-100 text-blue-700 font-medium'
                          : 'hover:bg-slate-100 text-slate-600'
                      }`}
                    >
                      {child.icon}
                      <span className="text-sm">{child.label}</span>
                      {currentTab === child.id && (
                        <CheckCircle size={14} className="ml-auto text-blue-600" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          
          {/* Visual connections */}
          <div className="mt-8 p-4 bg-slate-50 rounded-xl">
            <div className="text-sm font-medium text-slate-700 mb-3">Recommended Flow</div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">Overview</span>
              <ArrowRight size={16} className="text-slate-400" />
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">Intelligence Hub</span>
              <ArrowRight size={16} className="text-slate-400" />
              <span className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-sm">Subsidy Intel</span>
              <ArrowRight size={16} className="text-slate-400" />
              <span className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded-full text-sm">Regulatory APIs</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// OPTION 4: GUIDED TOURS
// Step-by-step onboarding for new users
// ============================================================================

interface TourStep {
  id: string;
  targetTab: string;
  title: string;
  description: string;
  highlight?: string; // CSS selector to highlight
}

export const GuidedTour: React.FC<{
  isActive: boolean;
  currentStep: number;
  totalSteps: number;
  step: TourStep;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}> = ({ isActive, currentStep, totalSteps, step, onNext, onPrev, onSkip }) => {
  if (!isActive) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-40 bg-black/40 pointer-events-none" />
      
      {/* Tour card */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-96">
        <div className="bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Progress */}
          <div className="h-1 bg-slate-100">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
          
          <div className="p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <Compass className="w-4 h-4 text-blue-600" />
                </div>
                <span className="text-xs text-slate-500">
                  Step {currentStep + 1} of {totalSteps}
                </span>
              </div>
              <button onClick={onSkip} className="text-xs text-slate-400 hover:text-slate-600">
                Skip tour
              </button>
            </div>
            
            <h3 className="text-lg font-bold text-slate-800 mb-1">{step.title}</h3>
            <p className="text-sm text-slate-600 mb-4">{step.description}</p>
            
            <div className="flex items-center justify-between">
              <button
                onClick={onPrev}
                disabled={currentStep === 0}
                className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-800 disabled:opacity-50"
              >
                ← Previous
              </button>
              <button
                onClick={onNext}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                {currentStep === totalSteps - 1 ? 'Finish' : 'Next →'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ============================================================================
// OPTION 5: SMART SEARCH WITH AI NAVIGATION
// Natural language "take me to..." functionality
// ============================================================================

interface SmartSearchResult {
  id: string;
  label: string;
  type: 'tab' | 'action' | 'facility' | 'guide';
  description: string;
  icon: React.ReactNode;
  score: number;
}

export const SmartSearch: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onSelect: (result: SmartSearchResult) => void;
}> = ({ isOpen, onClose, onSelect }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SmartSearchResult[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulated AI-powered search
  const processQuery = useCallback((q: string) => {
    if (!q.trim()) {
      setResults([]);
      return;
    }
    
    setIsProcessing(true);
    
    // Simulate AI processing
    setTimeout(() => {
      const lowerQ = q.toLowerCase();
      const mockResults: SmartSearchResult[] = [];
      
      // Tab navigation
      if (lowerQ.includes('subsid') || lowerQ.includes('tax break') || lowerQ.includes('good jobs')) {
        mockResults.push({
          id: 'Predictive Subsidy',
          label: 'Predictive Subsidy Intelligence',
          type: 'tab',
          description: 'Analyze subsidy risks before violations occur',
          icon: <Target size={18} />,
          score: 0.95
        });
      }
      
      if (lowerQ.includes('scraper') || lowerQ.includes('api') || lowerQ.includes('municipal') || lowerQ.includes('regulatory')) {
        mockResults.push({
          id: 'Regulatory Toolkit',
          label: 'Municipal DCIM Toolkit',
          type: 'tab',
          description: 'Scrapers, APIs, and integration guides',
          icon: <Database size={18} />,
          score: 0.92
        });
      }
      
      if (lowerQ.includes('intelligence') || lowerQ.includes('ai') || lowerQ.includes('pattern')) {
        mockResults.push({
          id: 'Intelligence',
          label: 'Intelligence Hub',
          type: 'tab',
          description: 'AI-powered analysis and insights',
          icon: <Brain size={18} />,
          score: 0.88
        });
      }
      
      if (lowerQ.includes('alert') || lowerQ.includes('risk') || lowerQ.includes('problem')) {
        mockResults.push({
          id: 'Problems',
          label: 'Problems & Alerts',
          type: 'tab',
          description: 'View critical issues requiring attention',
          icon: <AlertTriangle size={18} />,
          score: 0.85
        });
      }
      
      // Actions
      if (lowerQ.includes('export') || lowerQ.includes('download') || lowerQ.includes('report')) {
        mockResults.push({
          id: 'action-export',
          label: 'Export Report',
          type: 'action',
          description: 'Download PDF or CSV report',
          icon: <FileText size={18} />,
          score: 0.90
        });
      }
      
      setResults(mockResults.sort((a, b) => b.score - a.score));
      setIsProcessing(false);
    }, 300);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => processQuery(query), 150);
    return () => clearTimeout(timer);
  }, [query, processQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh]">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden">
        {/* Search input */}
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Ask anything... 'Show me subsidy risks' or 'Take me to regulatory APIs'"
              className="flex-1 text-lg outline-none placeholder:text-slate-400"
              autoFocus
            />
            <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg">
              <X size={20} className="text-slate-400" />
            </button>
          </div>
        </div>
        
        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {isProcessing && (
            <div className="p-4 text-center text-slate-500">
              <div className="inline-block animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-2" />
              Understanding your request...
            </div>
          )}
          
          {!isProcessing && results.length > 0 && (
            <div className="p-2">
              {results.map(result => (
                <button
                  key={result.id}
                  onClick={() => { onSelect(result); onClose(); }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 text-left group"
                >
                  <div className={`p-2 rounded-lg ${
                    result.type === 'tab' ? 'bg-blue-100 text-blue-600' :
                    result.type === 'action' ? 'bg-purple-100 text-purple-600' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {result.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-slate-800">{result.label}</div>
                    <div className="text-sm text-slate-500">{result.description}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${
                      result.type === 'tab' ? 'bg-blue-100 text-blue-700' :
                      result.type === 'action' ? 'bg-purple-100 text-purple-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      {result.type}
                    </span>
                    <ArrowRight size={16} className="text-slate-400 opacity-0 group-hover:opacity-100" />
                  </div>
                </button>
              ))}
            </div>
          )}
          
          {!isProcessing && query && results.length === 0 && (
            <div className="p-8 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No results found for "{query}"</p>
              <p className="text-sm mt-1">Try different keywords</p>
            </div>
          )}
          
          {!query && (
            <div className="p-4 space-y-3">
              <div className="text-xs text-slate-500 font-medium px-2">SUGGESTIONS</div>
              {[
                { q: 'Show me subsidy compliance risks', icon: <Target size={16} /> },
                { q: 'Take me to regulatory scrapers', icon: <Database size={16} /> },
                { q: 'Which facilities need attention?', icon: <AlertTriangle size={16} /> },
                { q: 'How do I export reports?', icon: <FileText size={16} /> },
              ].map(suggestion => (
                <button
                  key={suggestion.q}
                  onClick={() => setQuery(suggestion.q)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-left"
                >
                  <div className="p-1.5 bg-slate-100 rounded-lg text-slate-500">
                    {suggestion.icon}
                  </div>
                  <span className="text-sm text-slate-600">{suggestion.q}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border rounded">↑↓</kbd> Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border rounded">↵</kbd> Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border rounded">esc</kbd> Close
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Sparkles size={12} /> AI-powered search
          </span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// OPTION 6: TAB GROUPS (COLLAPSIBLE)
// Group related tabs with expand/collapse
// ============================================================================

interface TabGroup {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  tabs: { id: string; label: string; badge?: number }[];
}

export const CollapsibleTabGroups: React.FC<{
  groups: TabGroup[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  expandedGroups: Set<string>;
  onToggleGroup: (groupId: string) => void;
}> = ({ groups, activeTab, onTabChange, expandedGroups, onToggleGroup }) => {
  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {groups.map(group => {
        const isExpanded = expandedGroups.has(group.id);
        const hasActiveTab = group.tabs.some(t => t.id === activeTab);
        const totalBadge = group.tabs.reduce((sum, t) => sum + (t.badge || 0), 0);
        
        return (
          <div key={group.id} className="flex items-center">
            <button
              onClick={() => onToggleGroup(group.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                hasActiveTab
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {group.icon}
              <span>{group.label}</span>
              {totalBadge > 0 && (
                <span className="px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                  {totalBadge}
                </span>
              )}
              <ChevronRight 
                size={14} 
                className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              />
            </button>
            
            {isExpanded && (
              <div className="flex items-center ml-1 gap-1">
                {group.tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-3 py-1.5 rounded-md text-sm transition-all ${
                      activeTab === tab.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {tab.label}
                    {tab.badge && tab.badge > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// ============================================================================
// OPTION 7: ENHANCED BREADCRUMBS WITH QUICK JUMPS
// Breadcrumbs that show related sections on hover
// ============================================================================

interface BreadcrumbItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  relatedItems?: { id: string; label: string }[];
}

export const EnhancedBreadcrumbs: React.FC<{
  items: BreadcrumbItem[];
  onNavigate: (id: string) => void;
}> = ({ items, onNavigate }) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  return (
    <nav className="flex items-center gap-1 text-sm">
      {items.map((item, index) => (
        <React.Fragment key={item.id}>
          {index > 0 && <ChevronRight size={14} className="text-slate-400" />}
          
          <div className="relative">
            <button
              onMouseEnter={() => setHoveredItem(item.id)}
              onMouseLeave={() => setHoveredItem(null)}
              onClick={() => onNavigate(item.id)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${
                index === items.length - 1
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
              {item.relatedItems && item.relatedItems.length > 0 && (
                <ChevronDown size={12} className="text-slate-400" />
              )}
            </button>
            
            {/* Dropdown for related items */}
            {hoveredItem === item.id && item.relatedItems && item.relatedItems.length > 0 && (
              <div 
                className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-50"
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
              >
                <div className="px-3 py-1 text-xs text-slate-500 font-medium">
                  Related sections
                </div>
                {item.relatedItems.map(related => (
                  <button
                    key={related.id}
                    onClick={() => { onNavigate(related.id); setHoveredItem(null); }}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-slate-100"
                  >
                    {related.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </React.Fragment>
      ))}
    </nav>
  );
};

// ============================================================================
// DEMO/PREVIEW COMPONENT
// Shows all options in one place for evaluation
// ============================================================================

export const NavigationOptionsDemo: React.FC = () => {
  const [activeOption, setActiveOption] = useState<string>('overview');
  
  const options = [
    { id: 'quickaccess', label: 'Quick Access Bar', icon: <Star size={18} />, desc: 'Floating favorites + recent tabs' },
    { id: 'contextual', label: 'Contextual Actions', icon: <Zap size={18} />, desc: 'Smart FAB with context-aware options' },
    { id: 'navmap', label: 'Navigation Map', icon: <Map size={18} />, desc: 'Visual sitemap with relationships' },
    { id: 'tours', label: 'Guided Tours', icon: <Compass size={18} />, desc: 'Step-by-step onboarding' },
    { id: 'smart', label: 'Smart Search', icon: <Sparkles size={18} />, desc: 'AI-powered "take me to..." navigation' },
    { id: 'groups', label: 'Tab Groups', icon: <Layers size={18} />, desc: 'Collapsible tab categories' },
    { id: 'breadcrumbs', label: 'Enhanced Breadcrumbs', icon: <ArrowRight size={18} />, desc: 'Quick jumps on hover' },
  ];

  return (
    <div className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            🧭 Navigation Enhancement Options
          </h1>
          <p className="text-slate-600">
            Select an option to see how it improves ease-of-use and navigability
          </p>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {options.map(opt => (
            <button
              key={opt.id}
              onClick={() => setActiveOption(opt.id)}
              className={`p-4 rounded-xl text-left transition-all ${
                activeOption === opt.id
                  ? 'bg-blue-600 text-white shadow-lg scale-105'
                  : 'bg-white border border-slate-200 hover:border-blue-300 hover:shadow'
              }`}
            >
              <div className={`mb-2 ${activeOption === opt.id ? 'text-white' : 'text-blue-600'}`}>
                {opt.icon}
              </div>
              <div className={`font-medium ${activeOption === opt.id ? 'text-white' : 'text-slate-800'}`}>
                {opt.label}
              </div>
              <div className={`text-xs mt-1 ${activeOption === opt.id ? 'text-blue-100' : 'text-slate-500'}`}>
                {opt.desc}
              </div>
            </button>
          ))}
        </div>
        
        {/* Preview area */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 min-h-[300px]">
          <div className="text-center text-slate-500">
            <p className="mb-4">Preview of: <strong>{options.find(o => o.id === activeOption)?.label}</strong></p>
            <p className="text-sm">
              These components are ready to integrate into DCIMCommandCenter.tsx
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NavigationOptionsDemo;

