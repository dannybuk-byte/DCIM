/**
 * React Hook for RLM-Powered Queries
 * 
 * Provides easy access to the Recursive Language Model engine
 * with built-in state management and error handling.
 */

import { useState, useCallback, useRef } from 'react';
import { 
  RecursiveQueryEngine, 
  analyzeComplianceRLM, 
  detectPatternsRLM,
  searchFacilitiesRLM
} from '../services/recursiveQueryEngine';
import type { Facility } from '../db/database';

interface RLMQueryState<T> {
  loading: boolean;
  data: T | null;
  error: string | null;
  metadata: {
    totalProcessed: number;
    chunksUsed: number;
    recursionDepth: number;
    executionTimeMs: number;
    decompositionPath: string[];
  } | null;
}

interface UseRLMQueryResult<T> extends RLMQueryState<T> {
  execute: () => Promise<void>;
  reset: () => void;
  executionLog: string[];
}

/**
 * Generic RLM query hook
 */
export function useRLMQuery<T>(
  queryFn: () => Promise<{ success: boolean; data: T | null; metadata: RLMQueryState<T>['metadata']; errors: Array<{ message: string }> }>,
  options: { autoExecute?: boolean } = {}
): UseRLMQueryResult<T> {
  const [state, setState] = useState<RLMQueryState<T>>({
    loading: false,
    data: null,
    error: null,
    metadata: null
  });
  
  const engineRef = useRef(new RecursiveQueryEngine());
  const [executionLog, setExecutionLog] = useState<string[]>([]);

  const execute = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    engineRef.current.clearLog();

    try {
      const result = await queryFn();
      
      setExecutionLog(engineRef.current.getExecutionLog());
      
      if (result.success) {
        setState({
          loading: false,
          data: result.data,
          error: null,
          metadata: result.metadata
        });
      } else {
        setState({
          loading: false,
          data: null,
          error: result.errors.map(e => e.message).join('; ') || 'Query failed',
          metadata: result.metadata
        });
      }
    } catch (error) {
      setState({
        loading: false,
        data: null,
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: null
      });
    }
  }, [queryFn]);

  const reset = useCallback(() => {
    setState({
      loading: false,
      data: null,
      error: null,
      metadata: null
    });
    setExecutionLog([]);
  }, []);

  return {
    ...state,
    execute,
    reset,
    executionLog
  };
}

/**
 * Pre-built hook for compliance analysis
 */
export function useComplianceAnalysis() {
  return useRLMQuery(analyzeComplianceRLM);
}

/**
 * Pre-built hook for pattern detection
 */
export function usePatternDetection(patternType: 'subsidy' | 'geographic' | 'operator') {
  return useRLMQuery(() => detectPatternsRLM(patternType));
}

/**
 * Pre-built hook for facility search
 */
export function useFacilitySearch() {
  const [query, setQuery] = useState('');
  const result = useRLMQuery<Facility[]>(() => searchFacilitiesRLM(query));
  
  const search = useCallback((searchQuery: string) => {
    setQuery(searchQuery);
  }, []);

  return {
    ...result,
    query,
    search
  };
}

export default useRLMQuery;

