/**
 * ContextualNLPWidget - Embedded AI search for any section
 * 
 * Provides two modes:
 * 1. Inline: Compact search bar that fits in section headers
 * 2. Floating: Expandable assistant button (bottom-right)
 * 
 * Features:
 * - Section-aware AI queries
 * - Predictive suggestions as you type
 * - Quick action buttons
 * - Search history
 * - Action execution (filter, sort, navigate, report)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Search,
  Loader2,
  Sparkles,
  X,
  ChevronRight,
  ChevronDown,
  Send,
  History,
  Zap,
  AlertCircle,
  Bot,
  Lightbulb,
  MessageSquare,
  HelpCircle,
  BookOpen,
} from 'lucide-react';
import { useSectionNLP, NLPAction } from '../../hooks/useSectionNLP';
import { SectionContext, QuickAction } from '../../ai/sectionPrompts';
import { SectionHelpPanel } from './SectionHelpPanel';

interface ContextualNLPWidgetProps {
  context: SectionContext;
  mode?: 'inline' | 'floating' | 'both';
  placeholder?: string;
  dataContext?: {
    itemCount?: number;
    filters?: Record<string, unknown>;
    selectedItems?: string[];
    data?: unknown[];
  };
  onAction?: (action: NLPAction) => void;
  className?: string;
  showQuickActions?: boolean;
  compact?: boolean;
}

/**
 * Inline Search Bar Component
 */
const InlineNLPSearch: React.FC<{
  context: SectionContext;
  placeholder?: string;
  dataContext?: ContextualNLPWidgetProps['dataContext'];
  onAction?: (action: NLPAction) => void;
  compact?: boolean;
  showQuickActions?: boolean;
}> = ({ context, placeholder, dataContext, onAction, compact = false, showQuickActions = true }) => {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showResponse, setShowResponse] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { state, query, getSuggestions, getQuickActions } = useSectionNLP({
    context,
    dataContext,
    onAction,
  });

  const suggestions = getSuggestions(inputValue);
  const quickActions = getQuickActions();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = async () => {
    if (!inputValue.trim() || state.isProcessing) return;
    setShowSuggestions(false);
    const result = await query(inputValue);
    if (result) {
      setShowResponse(true);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    setShowSuggestions(false);
    // Auto-execute on suggestion click
    setTimeout(() => handleSearch(), 50);
  };

  const handleQuickAction = async (action: QuickAction) => {
    setInputValue(action.query);
    setShowSuggestions(false);
    await query(action.query);
    setShowResponse(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setShowResponse(false);
    }
  };

  const clearInput = () => {
    setInputValue('');
    setShowResponse(false);
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Input Row */}
      <div className={`flex items-center gap-2 ${compact ? '' : 'mb-2'}`}>
        <div className="relative flex-1">
          <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
            {state.isProcessing ? (
              <Loader2 size={14} className="text-cyan-400 animate-spin" />
            ) : (
              <MessageSquare size={14} className="text-cyan-400" />
            )}
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder || `Ask about ${context.replace('-', ' ')}...`}
            className={`w-full pl-9 pr-20 bg-slate-800/60 border border-slate-600/50 
                       rounded-lg text-white placeholder-slate-500 text-sm
                       focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 
                       focus:outline-none transition-all
                       ${compact ? 'py-1.5' : 'py-2'}`}
            disabled={state.isProcessing}
          />

          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {inputValue && (
              <button
                onClick={clearInput}
                className="p-1 hover:bg-slate-700 rounded transition-colors"
                title="Clear"
              >
                <X size={12} className="text-slate-400" />
              </button>
            )}
            <button
              onClick={handleSearch}
              disabled={!inputValue.trim() || state.isProcessing}
              className="px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white 
                         font-medium rounded text-xs transition-colors 
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center gap-1"
            >
              <Send size={10} />
              Ask
            </button>
          </div>
        </div>
      </div>

      {/* Quick Actions Row (when not compact) */}
      {showQuickActions && !compact && quickActions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {quickActions.slice(0, 4).map((action, i) => (
            <button
              key={i}
              onClick={() => handleQuickAction(action)}
              disabled={state.isProcessing}
              className="flex items-center gap-1 px-2 py-1 bg-slate-700/50 
                         hover:bg-slate-600/50 border border-slate-600/30 
                         rounded text-xs text-slate-300 hover:text-white 
                         transition-colors disabled:opacity-50"
              title={action.description}
            >
              <span>{action.icon}</span>
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && !state.isProcessing && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 
                        bg-slate-800 border border-slate-600/50 rounded-lg 
                        shadow-xl shadow-black/50 max-h-64 overflow-y-auto">
          {/* Recent / History */}
          {state.history.length > 0 && !inputValue && (
            <div className="p-2 border-b border-slate-700">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
                <History size={10} />
                <span>Recent</span>
              </div>
              {state.history.slice(0, 3).map((h, i) => (
                <button
                  key={i}
                  onClick={() => handleSuggestionClick(h)}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-700/50 
                             rounded text-xs text-slate-300 hover:text-white 
                             transition-colors flex items-center gap-2"
                >
                  <Search size={10} className="text-slate-500" />
                  <span className="truncate">{h}</span>
                </button>
              ))}
            </div>
          )}

          {/* Suggestions */}
          <div className="p-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-1.5">
              <Sparkles size={10} className="text-amber-400" />
              <span>Suggestions</span>
            </div>
            {suggestions.map((s, i) => (
              <button
                key={i}
                onClick={() => handleSuggestionClick(s)}
                className="w-full text-left px-2 py-1.5 hover:bg-cyan-600/20 
                           rounded text-xs text-slate-300 hover:text-white 
                           transition-colors flex items-center justify-between gap-2 group"
              >
                <span className="truncate">{s}</span>
                <ChevronRight 
                  size={10} 
                  className="text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" 
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Response Panel */}
      {showResponse && state.lastResponse && (
        <div className="mt-2 p-3 bg-slate-800/80 border border-cyan-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Bot size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-200 whitespace-pre-wrap">
                {state.lastResponse}
              </p>
              
              {/* Suggested Actions */}
              {state.lastActions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700 flex flex-wrap gap-1.5">
                  {state.lastActions.map((action, i) => (
                    <button
                      key={i}
                      onClick={() => onAction?.(action)}
                      className="flex items-center gap-1 px-2 py-1 
                                 bg-cyan-600/20 hover:bg-cyan-600/30 
                                 border border-cyan-500/30 rounded 
                                 text-xs text-cyan-300 hover:text-cyan-200 
                                 transition-colors"
                    >
                      <Zap size={10} />
                      {action.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => setShowResponse(false)}
              className="p-1 hover:bg-slate-700 rounded transition-colors"
            >
              <X size={12} className="text-slate-400" />
            </button>
          </div>
        </div>
      )}

      {/* Error Display */}
      {state.error && (
        <div className="mt-2 p-2 bg-red-900/20 border border-red-500/30 rounded-lg 
                        flex items-center gap-2 text-xs text-red-400">
          <AlertCircle size={12} />
          <span>{state.error}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Floating Assistant Component
 */
type FloatingTab = 'ask' | 'help';

const FloatingNLPAssistant: React.FC<{
  context: SectionContext;
  dataContext?: ContextualNLPWidgetProps['dataContext'];
  onAction?: (action: NLPAction) => void;
}> = ({ context, dataContext, onAction }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<FloatingTab>('ask');
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { state, query, getQuickActions } = useSectionNLP({
    context,
    dataContext,
    onAction,
  });

  const quickActions = getQuickActions();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        // Don't close if clicking the toggle button
        const target = e.target as HTMLElement;
        if (!target.closest('[data-floating-toggle]')) {
          setIsOpen(false);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!inputValue.trim() || state.isProcessing) return;

    const userMessage = inputValue;
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);

    const result = await query(userMessage);
    if (result) {
      setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
    }
  };

  const handleQuickAction = async (action: QuickAction) => {
    setMessages(prev => [...prev, { role: 'user', content: action.query }]);
    const result = await query(action.query);
    if (result) {
      setMessages(prev => [...prev, { role: 'assistant', content: result.response }]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        data-floating-toggle
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-20 right-6 z-[10000] p-3 rounded-full 
                   shadow-lg shadow-black/50 transition-all duration-300
                   ${isOpen 
                     ? 'bg-slate-700 rotate-0' 
                     : 'bg-gradient-to-br from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500'
                   }`}
        title={`Ask about ${context.replace('-', ' ')}`}
      >
        {isOpen ? (
          <X size={20} className="text-white" />
        ) : (
          <div className="relative">
            <Bot size={20} className="text-white" />
            <Sparkles size={10} className="absolute -top-1 -right-1 text-amber-300" />
          </div>
        )}
      </button>

      {/* Floating Panel */}
      {isOpen && (
        <div
          ref={panelRef}
          className="fixed bottom-36 right-6 z-[10001] w-96 max-h-[550px] 
                     bg-slate-900 border border-slate-700 rounded-xl 
                     shadow-2xl shadow-black/50 flex flex-col overflow-hidden"
        >
          {/* Header */}
          <div className="p-3 border-b border-slate-700 bg-gradient-to-r from-cyan-900/50 to-blue-900/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot size={16} className="text-cyan-400" />
                <span className="text-sm font-medium text-white">
                  {context.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Assistant
                </span>
              </div>
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex border-b border-slate-700 bg-slate-800/50">
            <button
              onClick={() => setActiveTab('ask')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'ask'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <MessageSquare size={12} />
              <span>Ask AI</span>
            </button>
            <button
              onClick={() => setActiveTab('help')}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                activeTab === 'help'
                  ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <BookOpen size={12} />
              <span>Help & Guides</span>
            </button>
          </div>

          {/* Help Tab Content */}
          {activeTab === 'help' && (
            <div className="flex-1 overflow-hidden">
              <SectionHelpPanel context={context} compact className="border-0 rounded-none" />
            </div>
          )}

          {/* Ask Tab Content */}
          {activeTab === 'ask' && (
            <>
          {/* Quick Actions */}
          {messages.length === 0 && (
            <div className="p-3 border-b border-slate-700/50">
              <div className="flex items-center gap-1.5 text-xs text-slate-400 mb-2">
                <Zap size={10} className="text-amber-400" />
                <span>Quick Actions</span>
              </div>
              <div className="space-y-1">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleQuickAction(action)}
                    disabled={state.isProcessing}
                    className="w-full flex items-center gap-2 px-2 py-1.5 
                               bg-slate-800/50 hover:bg-slate-700/50 
                               border border-slate-700/50 rounded 
                               text-left transition-colors disabled:opacity-50"
                  >
                    <span className="text-sm">{action.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-white font-medium truncate">
                        {action.label}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">
                        {action.description}
                      </div>
                    </div>
                    <ChevronRight size={12} className="text-slate-500" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-[120px]">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Lightbulb size={24} className="text-slate-600 mb-2" />
                <p className="text-xs text-slate-500">
                  Use quick actions above or type a question below
                </p>
              </div>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] px-3 py-2 rounded-lg text-xs
                               ${msg.role === 'user'
                                 ? 'bg-cyan-600 text-white'
                                 : 'bg-slate-800 text-slate-200 border border-slate-700'
                               }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}
            {state.isProcessing && (
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Loader2 size={12} className="animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-700 bg-slate-800/50">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a question..."
                className="flex-1 px-3 py-2 bg-slate-900 border border-slate-600 
                           rounded-lg text-white text-xs placeholder-slate-500
                           focus:border-cyan-500/50 focus:outline-none"
                disabled={state.isProcessing}
              />
              <button
                onClick={handleSubmit}
                disabled={!inputValue.trim() || state.isProcessing}
                className="p-2 bg-cyan-600 hover:bg-cyan-500 rounded-lg 
                           transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send size={14} className="text-white" />
              </button>
            </div>
          </div>
            </>
          )}
        </div>
      )}
    </>
  );
};

/**
 * Main ContextualNLPWidget Component
 */
export const ContextualNLPWidget: React.FC<ContextualNLPWidgetProps> = ({
  context,
  mode = 'both',
  placeholder,
  dataContext,
  onAction,
  className = '',
  showQuickActions = true,
  compact = false,
}) => {
  return (
    <div className={className}>
      {/* Inline Mode */}
      {(mode === 'inline' || mode === 'both') && (
        <InlineNLPSearch
          context={context}
          placeholder={placeholder}
          dataContext={dataContext}
          onAction={onAction}
          compact={compact}
          showQuickActions={showQuickActions && mode === 'inline'}
        />
      )}

      {/* Floating Mode */}
      {(mode === 'floating' || mode === 'both') && (
        <FloatingNLPAssistant
          context={context}
          dataContext={dataContext}
          onAction={onAction}
        />
      )}
    </div>
  );
};

/**
 * Compact inline variant for section headers
 */
export const SectionNLPBar: React.FC<{
  context: SectionContext;
  placeholder?: string;
  onAction?: (action: NLPAction) => void;
  className?: string;
}> = ({ context, placeholder, onAction, className = '' }) => (
  <ContextualNLPWidget
    context={context}
    mode="inline"
    placeholder={placeholder}
    onAction={onAction}
    className={className}
    showQuickActions={false}
    compact={true}
  />
);

export default ContextualNLPWidget;

