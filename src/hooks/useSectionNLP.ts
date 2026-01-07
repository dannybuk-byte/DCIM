/**
 * useSectionNLP - Context-aware NLP hook for section-specific queries
 * 
 * Provides:
 * - Section-aware AI queries with tailored prompts
 * - Predictive suggestions based on section context
 * - Action handlers for filters, navigation, highlights
 * - History tracking per section
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { askAIText } from '../ai/engine';
import { 
  SectionContext, 
  getSectionPrompt, 
  generateContextualPrompt,
  QuickAction 
} from '../ai/sectionPrompts';
import { recordSearch, SearchContext } from '../db/searchHistory';
import { trackError } from '../utils/errorTracking';
import { db } from '../db/database';

export interface NLPAction {
  type: 'filter' | 'highlight' | 'expand' | 'sort' | 'navigate' | 'report' | 'info';
  payload: Record<string, unknown>;
  description: string;
}

export interface NLPQueryResult {
  response: string;
  actions: NLPAction[];
  confidence: number;
  suggestions: string[];
}

export interface SectionNLPState {
  isProcessing: boolean;
  lastQuery: string;
  lastResponse: string;
  lastActions: NLPAction[];
  error: string | null;
  suggestions: string[];
  history: string[];
}

export interface UseSectionNLPOptions {
  context: SectionContext;
  dataContext?: {
    itemCount?: number;
    filters?: Record<string, unknown>;
    selectedItems?: string[];
    data?: unknown[];
  };
  onAction?: (action: NLPAction) => void;
  maxHistory?: number;
}

export interface UseSectionNLPReturn {
  state: SectionNLPState;
  query: (input: string) => Promise<NLPQueryResult | null>;
  getSuggestions: (partial: string) => string[];
  getQuickActions: () => QuickAction[];
  clearHistory: () => void;
  executeQuickAction: (action: QuickAction) => Promise<void>;
}

/**
 * Parse AI response to extract suggested actions
 */
function parseActionsFromResponse(response: string, context: SectionContext): NLPAction[] {
  const actions: NLPAction[] = [];
  const lower = response.toLowerCase();

  // Detect filter suggestions
  if (lower.includes('filter') || lower.includes('show only') || lower.includes('narrow down')) {
    const stateMatch = response.match(/\b([A-Z]{2})\b/g);
    if (stateMatch) {
      actions.push({
        type: 'filter',
        payload: { states: stateMatch },
        description: `Filter to ${stateMatch.join(', ')}`,
      });
    }

    const operatorMatch = response.match(/(?:Google|Amazon|Meta|Microsoft|Apple|AWS|Equinix)/gi);
    if (operatorMatch) {
      actions.push({
        type: 'filter',
        payload: { operators: [...new Set(operatorMatch)] },
        description: `Filter to ${[...new Set(operatorMatch)].join(', ')}`,
      });
    }
  }

  // Detect sort suggestions
  if (lower.includes('sort') || lower.includes('order by') || lower.includes('rank')) {
    if (lower.includes('risk') || lower.includes('score')) {
      actions.push({
        type: 'sort',
        payload: { field: 'riskScore', direction: 'desc' },
        description: 'Sort by risk score (highest first)',
      });
    }
    if (lower.includes('gap') || lower.includes('subsidy')) {
      actions.push({
        type: 'sort',
        payload: { field: 'subsidyGap', direction: 'desc' },
        description: 'Sort by subsidy gap (largest first)',
      });
    }
    if (lower.includes('priority')) {
      actions.push({
        type: 'sort',
        payload: { field: 'priorityScore', direction: 'desc' },
        description: 'Sort by priority score (highest first)',
      });
    }
  }

  // Detect report generation
  if (lower.includes('report') || lower.includes('generate') || lower.includes('export')) {
    actions.push({
      type: 'report',
      payload: { context },
      description: 'Generate detailed report',
    });
  }

  // Detect navigation
  if (lower.includes('go to') || lower.includes('navigate') || lower.includes('open')) {
    actions.push({
      type: 'navigate',
      payload: {},
      description: 'Navigate to detailed view',
    });
  }

  return actions;
}

/**
 * Generate contextual suggestions based on partial input
 */
function generateSuggestions(
  partial: string,
  context: SectionContext,
  history: string[]
): string[] {
  const config = getSectionPrompt(context);
  const lower = partial.toLowerCase().trim();

  if (!lower) {
    // Return example queries when empty
    return config.exampleQueries.slice(0, 5);
  }

  const suggestions: string[] = [];

  // Match from example queries
  config.exampleQueries.forEach(example => {
    if (example.toLowerCase().includes(lower)) {
      suggestions.push(example);
    }
  });

  // Match from history
  history.forEach(h => {
    if (h.toLowerCase().includes(lower) && !suggestions.includes(h)) {
      suggestions.push(h);
    }
  });

  // Generate completions based on keywords
  config.keywords.forEach(keyword => {
    if (keyword.toLowerCase().startsWith(lower) && !suggestions.some(s => s.includes(keyword))) {
      suggestions.push(`Show ${keyword} data`);
    }
  });

  // Context-specific auto-completions
  if (lower.startsWith('show') || lower.startsWith('find') || lower.startsWith('list')) {
    const entities = config.entityTypes;
    entities.forEach(entity => {
      const suggestion = `${partial} ${entity.replace('_', ' ')}s`;
      if (!suggestions.includes(suggestion)) {
        suggestions.push(suggestion);
      }
    });
  }

  return suggestions.slice(0, 8);
}

export function useSectionNLP(options: UseSectionNLPOptions): UseSectionNLPReturn {
  const { context, dataContext, onAction, maxHistory = 20 } = options;

  const [state, setState] = useState<SectionNLPState>({
    isProcessing: false,
    lastQuery: '',
    lastResponse: '',
    lastActions: [],
    error: null,
    suggestions: [],
    history: [],
  });

  // Load history from IndexedDB on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const searchContext = context as SearchContext;
        const rows = await db.searchHistory
          .where('context')
          .equals(searchContext)
          .reverse()
          .limit(maxHistory)
          .toArray();

        if (!cancelled) {
          setState(prev => ({
            ...prev,
            history: rows.map(r => r.query),
          }));
        }
      } catch (err) {
        console.warn('Failed to load NLP history:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [context, maxHistory]);

  // Initialize suggestions
  useEffect(() => {
    const config = getSectionPrompt(context);
    setState(prev => ({
      ...prev,
      suggestions: config.exampleQueries.slice(0, 5),
    }));
  }, [context]);

  /**
   * Execute an NLP query
   */
  const query = useCallback(async (input: string): Promise<NLPQueryResult | null> => {
    if (!input.trim()) return null;

    setState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      // Record search for history
      await recordSearch(input, context as SearchContext);

      // Generate contextual prompt
      const systemPrompt = generateContextualPrompt(context, dataContext);

      // Call AI
      const result = await askAIText(systemPrompt, input, {
        maxTokens: 500,
        temperature: 0.3,
        timeoutMs: 20000,
      });

      const response = result.text;
      const actions = parseActionsFromResponse(response, context);
      const config = getSectionPrompt(context);

      // Update state
      setState(prev => ({
        ...prev,
        isProcessing: false,
        lastQuery: input,
        lastResponse: response,
        lastActions: actions,
        history: [input, ...prev.history.filter(h => h !== input)].slice(0, maxHistory),
        suggestions: config.exampleQueries.slice(0, 5),
      }));

      // Trigger action callback
      if (onAction && actions.length > 0) {
        actions.forEach(action => onAction(action));
      }

      return {
        response,
        actions,
        confidence: 0.85,
        suggestions: generateSuggestions('', context, state.history),
      };

    } catch (err) {
      const error = err instanceof Error ? err.message : 'Query failed';
      trackError(err instanceof Error ? err : new Error(error), { context: 'useSectionNLP' });

      setState(prev => ({
        ...prev,
        isProcessing: false,
        error,
      }));

      return null;
    }
  }, [context, dataContext, onAction, maxHistory, state.history]);

  /**
   * Get suggestions for partial input
   */
  const getSuggestions = useCallback((partial: string): string[] => {
    return generateSuggestions(partial, context, state.history);
  }, [context, state.history]);

  /**
   * Get quick actions for this section
   */
  const getQuickActions = useCallback((): QuickAction[] => {
    const config = getSectionPrompt(context);
    return config.quickActions;
  }, [context]);

  /**
   * Clear search history
   */
  const clearHistory = useCallback(() => {
    setState(prev => ({ ...prev, history: [] }));
  }, []);

  /**
   * Execute a quick action
   */
  const executeQuickAction = useCallback(async (action: QuickAction): Promise<void> => {
    await query(action.query);
  }, [query]);

  return useMemo(() => ({
    state,
    query,
    getSuggestions,
    getQuickActions,
    clearHistory,
    executeQuickAction,
  }), [state, query, getSuggestions, getQuickActions, clearHistory, executeQuickAction]);
}

export default useSectionNLP;

