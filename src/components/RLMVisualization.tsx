/**
 * RLM (Recursive Language Model) Visualization Component
 * 
 * Visualizes the recursive decomposition and aggregation process
 * inspired by MIT CSAIL's RLM paper.
 * 
 * Shows:
 * - Real-time execution flow
 * - Decomposition tree
 * - Chunk processing status
 * - Error recovery paths
 */

import React, { useState, useMemo } from 'react';
import { 
  analyzeComplianceRLM, 
  detectPatternsRLM,
  searchFacilitiesRLM 
} from '../services/recursiveQueryEngine';

interface RLMMetadata {
  totalProcessed: number;
  chunksUsed: number;
  recursionDepth: number;
  executionTimeMs: number;
  decompositionPath: string[];
  fallbacksUsed: string[];
}

interface QueryResult {
  success: boolean;
  data: unknown;
  metadata: RLMMetadata;
  errors: Array<{ phase: string; message: string; recoverable: boolean }>;
}

export const RLMVisualization: React.FC = () => {
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [expanded, setExpanded] = useState(true);

  const runQuery = async (queryType: string) => {
    setLoading(true);
    setActiveQuery(queryType);
    setResult(null);

    try {
      let queryResult: QueryResult;
      
      switch (queryType) {
        case 'compliance':
          queryResult = await analyzeComplianceRLM() as QueryResult;
          break;
        case 'patterns-subsidy':
          queryResult = await detectPatternsRLM('subsidy') as QueryResult;
          break;
        case 'patterns-geographic':
          queryResult = await detectPatternsRLM('geographic') as QueryResult;
          break;
        case 'patterns-operator':
          queryResult = await detectPatternsRLM('operator') as QueryResult;
          break;
        case 'search':
          queryResult = await searchFacilitiesRLM(searchInput) as QueryResult;
          break;
        default:
          throw new Error('Unknown query type');
      }
      
      setResult(queryResult);
    } catch (error) {
      console.error('RLM Query Error:', error);
      // Set error result so user sees feedback
      setResult({
        success: false,
        data: null,
        metadata: {
          totalProcessed: 0,
          chunksUsed: 0,
          recursionDepth: 0,
          executionTimeMs: 0,
          decompositionPath: [],
          fallbacksUsed: ['error-catch'],
        },
        errors: [{
          phase: 'process',
          message: error instanceof Error ? error.message : 'Unknown error occurred',
          recoverable: false,
        }],
      });
    } finally {
      setLoading(false);
    }
  };

  const decompositionTree = useMemo(() => {
    if (!result?.metadata?.decompositionPath) return null;
    
    return result.metadata.decompositionPath.map((step, idx) => {
      const [strategy, depth] = step.split('@');
      return { strategy, depth, index: idx };
    });
  }, [result]);

  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div 
        className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">RLM Query Engine</h3>
              <p className="text-sm text-white/80">Recursive Language Model - Antifragile Processing</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a 
              href="https://arxiv.org/html/2512.24601v1" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-xs text-white/70 hover:text-white underline"
              onClick={e => e.stopPropagation()}
            >
              MIT CSAIL Paper ↗
            </a>
            <svg 
              className={`w-5 h-5 text-white transition-transform ${expanded ? 'rotate-180' : ''}`} 
              fill="none" viewBox="0 0 24 24" stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="p-4 space-y-4">
          {/* Query Types */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <button
              onClick={() => runQuery('compliance')}
              disabled={loading}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${activeQuery === 'compliance' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:opacity-50`}
            >
              📊 Compliance Analysis
            </button>
            <button
              onClick={() => runQuery('patterns-subsidy')}
              disabled={loading}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${activeQuery === 'patterns-subsidy' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:opacity-50`}
            >
              💰 Subsidy Patterns
            </button>
            <button
              onClick={() => runQuery('patterns-geographic')}
              disabled={loading}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${activeQuery === 'patterns-geographic' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:opacity-50`}
            >
              🌍 Geographic Patterns
            </button>
            <button
              onClick={() => runQuery('patterns-operator')}
              disabled={loading}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-all
                ${activeQuery === 'patterns-operator' 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                } disabled:opacity-50`}
            >
              🏢 Operator Patterns
            </button>
          </div>

          {/* Search Query */}
          <div className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search facilities (RLM-powered)..."
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm
                focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyDown={e => e.key === 'Enter' && searchInput && runQuery('search')}
            />
            <button
              onClick={() => runQuery('search')}
              disabled={loading || !searchInput}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium
                hover:bg-indigo-700 disabled:opacity-50 transition-all"
            >
              🔍 Search
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full" />
                <span className="text-indigo-700 font-medium">
                  RLM Processing: Decomposing and recursively analyzing...
                </span>
              </div>
              <div className="mt-2 text-xs text-indigo-600 font-mono">
                → Loading data from environment (IndexedDB)<br/>
                → Selecting decomposition strategy...<br/>
                → Recursive self-invocation in progress...
              </div>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Execution Metadata */}
              <div className={`p-4 rounded-lg border ${
                result.success 
                  ? 'bg-emerald-50 border-emerald-200' 
                  : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <span className={`font-bold ${result.success ? 'text-emerald-700' : 'text-red-700'}`}>
                    {result.success ? '✅ Query Successful' : '❌ Query Failed'}
                  </span>
                  <span className="text-sm text-slate-600">
                    {result.metadata.executionTimeMs.toFixed(0)}ms
                  </span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-white/80 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-slate-800">
                      {result.metadata.totalProcessed.toLocaleString()}
                    </div>
                    <div className="text-xs text-slate-500">Items Processed</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-indigo-600">
                      {result.metadata.chunksUsed}
                    </div>
                    <div className="text-xs text-slate-500">Chunks Used</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-purple-600">
                      {result.metadata.recursionDepth}
                    </div>
                    <div className="text-xs text-slate-500">Max Recursion Depth</div>
                  </div>
                  <div className="bg-white/80 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-amber-600">
                      {result.metadata.fallbacksUsed.length}
                    </div>
                    <div className="text-xs text-slate-500">Fallbacks Used</div>
                  </div>
                </div>
              </div>

              {/* Decomposition Tree Visualization */}
              {decompositionTree && decompositionTree.length > 0 && (
                <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <h4 className="font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                    </svg>
                    Decomposition Path
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    {decompositionTree.map((node, idx) => (
                      <React.Fragment key={idx}>
                        <div className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                          node.strategy === 'geographic' ? 'bg-blue-100 text-blue-700' :
                          node.strategy === 'operator' ? 'bg-purple-100 text-purple-700' :
                          node.strategy === 'status' ? 'bg-amber-100 text-amber-700' :
                          node.strategy === 'chunk' ? 'bg-slate-200 text-slate-700' :
                          'bg-emerald-100 text-emerald-700'
                        }`}>
                          {node.strategy === 'geographic' && '🌍 '}
                          {node.strategy === 'operator' && '🏢 '}
                          {node.strategy === 'status' && '📊 '}
                          {node.strategy === 'chunk' && '📦 '}
                          {node.strategy === 'direct' && '✅ '}
                          {node.strategy}
                          {node.depth && <span className="ml-1 opacity-60">({node.depth})</span>}
                        </div>
                        {idx < decompositionTree.length - 1 && (
                          <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallbacks Used */}
              {result.metadata.fallbacksUsed.length > 0 && (
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <h4 className="font-semibold text-amber-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Antifragile Recovery (Fallbacks Used)
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {result.metadata.fallbacksUsed.map((fb, idx) => (
                      <span key={idx} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-mono">
                        {fb}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Errors */}
              {result.errors.length > 0 && (
                <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                  <h4 className="font-semibold text-red-700 mb-2">Errors Encountered</h4>
                  {result.errors.map((error, idx) => (
                    <div key={idx} className="text-sm text-red-600 mb-1">
                      <span className="font-mono">[{error.phase}]</span> {error.message}
                      {error.recoverable && (
                        <span className="ml-2 text-xs text-amber-600">(recovered)</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Query Results */}
              <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
                <h4 className="font-semibold text-slate-700 mb-3">Query Results</h4>
                <pre className="text-xs font-mono text-slate-600 overflow-auto max-h-60 p-3 bg-white rounded border">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            </div>
          )}

          {/* How It Works */}
          <div className="bg-gradient-to-r from-slate-50 to-indigo-50 rounded-lg p-4 border border-slate-200">
            <h4 className="font-semibold text-slate-700 mb-2 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              How RLM Enhances Antifragility
            </h4>
            <div className="grid md:grid-cols-3 gap-3 text-sm">
              <div className="bg-white/80 rounded p-3">
                <div className="font-medium text-indigo-600 mb-1">🔄 Recursive Decomposition</div>
                <p className="text-slate-600 text-xs">
                  Large datasets are automatically broken into manageable chunks using smart strategies 
                  (geographic, operator, status-based).
                </p>
              </div>
              <div className="bg-white/80 rounded p-3">
                <div className="font-medium text-purple-600 mb-1">🛡️ Self-Healing</div>
                <p className="text-slate-600 text-xs">
                  When one processing path fails, the engine automatically tries alternative 
                  decomposition strategies with exponential backoff.
                </p>
              </div>
              <div className="bg-white/80 rounded p-3">
                <div className="font-medium text-emerald-600 mb-1">📊 Result Aggregation</div>
                <p className="text-slate-600 text-xs">
                  Results from recursive sub-queries are intelligently aggregated, with conflict 
                  resolution for overlapping data.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RLMVisualization;

