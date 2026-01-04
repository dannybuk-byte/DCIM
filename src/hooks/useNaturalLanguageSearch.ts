/**
 * useNaturalLanguageSearch Hook
 * React hook for natural language facility search
 */

import { useState, useCallback } from 'react';
import type { Facility } from '../types';
import type { FacilityQuery } from '../schemas/facilityQuery';
import { convertNLToQueryWithFallback, normalizeQuery } from '../utils/nlQueryConverter';
import { executeQuery, getQueryStats, type QueryStats } from '../utils/queryExecutor';
import { 
  getCachedNLQuery, 
  cacheNLQuery,
  getCachedQueryResults,
  cacheQueryResults 
} from '../utils/queryCache';
import { trackAPIUsage } from '../utils/apiKeyManager';
import { describeQuery } from '../schemas/facilityQuery';

export interface SearchState {
  // Loading states
  isConverting: boolean;
  isSearching: boolean;
  isLoading: boolean;
  
  // Results
  results: Facility[];
  totalCount: number;
  stats: QueryStats | null;
  
  // Query info
  naturalLanguage: string;
  structuredQuery: FacilityQuery | null;
  queryDescription: string;
  
  // Method used
  conversionMethod: 'api' | 'keywords' | 'cached' | null;
  
  // Error handling
  error: string | null;
  warning: string | null;
}

export interface SearchActions {
  search: (query: string) => Promise<void>;
  clear: () => void;
  refine: (refinedQuery: FacilityQuery) => Promise<void>;
}

const initialState: SearchState = {
  isConverting: false,
  isSearching: false,
  isLoading: false,
  results: [],
  totalCount: 0,
  stats: null,
  naturalLanguage: '',
  structuredQuery: null,
  queryDescription: '',
  conversionMethod: null,
  error: null,
  warning: null
};

/**
 * Hook for natural language search
 */
export function useNaturalLanguageSearch(): [SearchState, SearchActions] {
  const [state, setState] = useState<SearchState>(initialState);
  
  /**
   * Clear search results
   */
  const clear = useCallback(() => {
    setState(initialState);
  }, []);
  
  /**
   * Execute a structured query directly (for refinement)
   */
  const refine = useCallback(async (refinedQuery: FacilityQuery) => {
    setState(prev => ({
      ...prev,
      isSearching: true,
      isLoading: true,
      error: null,
      warning: null
    }));
    
    try {
      // Normalize query
      const normalized = normalizeQuery(refinedQuery);
      
      // Check cache first
      const cached = getCachedQueryResults(normalized);
      if (cached) {
        const stats = await getQueryStats(normalized);
        setState(prev => ({
          ...prev,
          isSearching: false,
          isLoading: false,
          results: cached.facilities,
          totalCount: cached.totalCount,
          stats,
          structuredQuery: normalized,
          queryDescription: describeQuery(normalized)
        }));
        return;
      }
      
      // Execute query
      const results = await executeQuery(normalized);
      const stats = await getQueryStats(normalized);
      
      // Cache results
      cacheQueryResults(normalized, results, results.length);
      
      setState(prev => ({
        ...prev,
        isSearching: false,
        isLoading: false,
        results,
        totalCount: results.length,
        stats,
        structuredQuery: normalized,
        queryDescription: describeQuery(normalized)
      }));
    } catch (err) {
      console.error('Query refinement error:', err);
      setState(prev => ({
        ...prev,
        isSearching: false,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to refine query'
      }));
    }
  }, []);
  
  /**
   * Search using natural language
   */
  const search = useCallback(async (naturalLanguage: string) => {
    if (!naturalLanguage.trim()) {
      setState(prev => ({ ...prev, error: 'Please enter a search query' }));
      return;
    }
    
    setState(prev => ({
      ...prev,
      isConverting: true,
      isSearching: true,
      isLoading: true,
      naturalLanguage,
      error: null,
      warning: null
    }));
    
    try {
      let structuredQuery: FacilityQuery;
      let conversionMethod: 'api' | 'keywords' | 'cached';
      let warning: string | null = null;
      let apiProvider: string | undefined;
      
      // Check cache first
      const cached = getCachedNLQuery(naturalLanguage);
      if (cached) {
        structuredQuery = cached.query;
        conversionMethod = 'cached';
      } else {
        // Convert natural language to structured query
        const conversion = await convertNLToQueryWithFallback(naturalLanguage);
        structuredQuery = conversion.query;
        conversionMethod = conversion.method === 'error' ? 'keywords' : conversion.method;
        apiProvider = conversion.provider;
        
        if (conversion.error) {
          warning = conversion.error;
        }
        
        // Cache the conversion
        if (conversionMethod !== 'error') {
          cacheNLQuery(naturalLanguage, structuredQuery, conversionMethod);
        }
      }

      // Track API usage if we used a paid API (avoid counting local providers/cached/keywords)
      if (conversionMethod === 'api' && apiProvider === 'openai') {
        trackAPIUsage(500, 'openai'); // Estimate 500 tokens for query conversion
      }
      
      setState(prev => ({
        ...prev,
        isConverting: false,
        structuredQuery,
        conversionMethod,
        queryDescription: describeQuery(structuredQuery),
        warning
      }));
      
      // Normalize query
      const normalized = normalizeQuery(structuredQuery);
      
      // Check results cache
      const cachedResults = getCachedQueryResults(normalized);
      if (cachedResults) {
        const stats = await getQueryStats(normalized);
        setState(prev => ({
          ...prev,
          isSearching: false,
          isLoading: false,
          results: cachedResults.facilities,
          totalCount: cachedResults.totalCount,
          stats
        }));
        return;
      }
      
      // Execute query
      const results = await executeQuery(normalized);
      const stats = await getQueryStats(normalized);
      
      // Cache results
      cacheQueryResults(normalized, results, results.length);
      
      setState(prev => ({
        ...prev,
        isSearching: false,
        isLoading: false,
        results,
        totalCount: results.length,
        stats
      }));
    } catch (err) {
      console.error('Search error:', err);
      setState(prev => ({
        ...prev,
        isConverting: false,
        isSearching: false,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Search failed'
      }));
    }
  }, []);
  
  return [state, { search, clear, refine }];
}

/**
 * Hook for search suggestions
 */
export function useSearchSuggestions() {
  const [suggestions] = useState<string[]>([
    "Show me non-compliant facilities in Texas",
    "Find Google facilities with over $50M in subsidies",
    "Which facilities created fewer than 100 jobs?",
    "Show me Amazon data centers opened after 2020",
    "Facilities in California with high subsidy gaps",
    "Find hyperscale facilities with capacity over 50 MW"
  ]);
  
  return suggestions;
}

