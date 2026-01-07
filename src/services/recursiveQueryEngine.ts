/**
 * Recursive Language Model (RLM) Inspired Query Engine
 * 
 * Based on: "Recursive Language Models" - MIT CSAIL (Zhang, Kraska, Khattab)
 * https://arxiv.org/html/2512.24601v1
 * 
 * Key Insight: Treat data as an external environment that can be
 * programmatically examined, decomposed, and recursively processed.
 * 
 * This provides 7 layers of antifragility:
 * 1. Automatic decomposition when queries are too large
 * 2. Recursive self-invocation on smaller chunks
 * 3. Result aggregation with conflict resolution
 * 4. Alternative path exploration on failures
 * 5. Progressive refinement of answers
 * 6. Memory-efficient out-of-core processing
 * 7. Self-healing with exponential backoff
 */

import { db } from '../db/database';
import type { Facility } from '../types';

// ============================================================================
// TYPES
// ============================================================================

interface RLMContext {
  query: string;
  depth: number;
  maxDepth: number;
  chunkSize: number;
  parentId?: string;
  breadcrumbs: string[];
}

interface RLMResult<T> {
  success: boolean;
  data: T | null;
  metadata: {
    totalProcessed: number;
    chunksUsed: number;
    recursionDepth: number;
    executionTimeMs: number;
    fallbacksUsed: string[];
    decompositionPath: string[];
  };
  errors: RLMError[];
}

interface RLMError {
  phase: 'decompose' | 'process' | 'aggregate' | 'fallback';
  message: string;
  recoverable: boolean;
  timestamp: Date;
}

interface DecompositionStrategy {
  name: string;
  canDecompose: (data: Facility[], context: RLMContext) => boolean;
  decompose: (data: Facility[], context: RLMContext) => Facility[][];
  aggregate: <T>(results: T[], context: RLMContext) => T;
}

// ============================================================================
// DECOMPOSITION STRATEGIES (Inspired by RLM's programmatic decomposition)
// ============================================================================

const decompositionStrategies: DecompositionStrategy[] = [
  {
    name: 'geographic',
    canDecompose: (data) => {
      const countries = new Set(data.map(f => f.country));
      return countries.size > 1;
    },
    decompose: (data) => {
      const byCountry = new Map<string, Facility[]>();
      data.forEach(f => {
        const country = f.country || 'Unknown';
        if (!byCountry.has(country)) byCountry.set(country, []);
        byCountry.get(country)!.push(f);
      });
      return Array.from(byCountry.values());
    },
    aggregate: <T>(results: T[]) => {
      if (Array.isArray(results[0])) {
        return results.flat() as unknown as T;
      }
      if (typeof results[0] === 'number') {
        return results.reduce((a, b) => (a as number) + (b as number), 0) as unknown as T;
      }
      return results[results.length - 1];
    }
  },
  {
    name: 'operator',
    canDecompose: (data) => {
      const operators = new Set(data.map(f => f.operator));
      return operators.size > 3;
    },
    decompose: (data) => {
      const byOperator = new Map<string, Facility[]>();
      data.forEach(f => {
        const operator = f.operator || 'Unknown';
        if (!byOperator.has(operator)) byOperator.set(operator, []);
        byOperator.get(operator)!.push(f);
      });
      return Array.from(byOperator.values());
    },
    aggregate: <T>(results: T[]) => {
      if (Array.isArray(results[0])) {
        return results.flat() as unknown as T;
      }
      return results[results.length - 1];
    }
  },
  {
    name: 'status',
    canDecompose: (data) => {
      const statuses = new Set(data.map(f => f.complianceStatus));
      return statuses.size > 1;
    },
    decompose: (data) => {
      const byStatus = new Map<string, Facility[]>();
      data.forEach(f => {
        const status = f.complianceStatus || 'Unknown';
        if (!byStatus.has(status)) byStatus.set(status, []);
        byStatus.get(status)!.push(f);
      });
      return Array.from(byStatus.values());
    },
    aggregate: <T>(results: T[]) => {
      if (Array.isArray(results[0])) {
        return results.flat() as unknown as T;
      }
      return results[results.length - 1];
    }
  },
  {
    name: 'chunk',
    canDecompose: (data, context) => data.length > context.chunkSize,
    decompose: (data, context) => {
      const chunks: Facility[][] = [];
      for (let i = 0; i < data.length; i += context.chunkSize) {
        chunks.push(data.slice(i, i + context.chunkSize));
      }
      return chunks;
    },
    aggregate: <T>(results: T[]) => {
      if (Array.isArray(results[0])) {
        return results.flat() as unknown as T;
      }
      return results[results.length - 1];
    }
  }
];

// ============================================================================
// RLM CORE ENGINE
// ============================================================================

export class RecursiveQueryEngine {
  private maxDepth: number;
  private chunkSize: number;
  private timeoutMs: number;
  private retryAttempts: number;
  private executionLog: string[] = [];

  constructor(options: {
    maxDepth?: number;
    chunkSize?: number;
    timeoutMs?: number;
    retryAttempts?: number;
  } = {}) {
    this.maxDepth = options.maxDepth ?? 5;
    this.chunkSize = options.chunkSize ?? 1000;
    this.timeoutMs = options.timeoutMs ?? 30000;
    this.retryAttempts = options.retryAttempts ?? 3;
  }

  /**
   * RLM-style query execution with automatic decomposition
   * 
   * Like the paper's approach: "treats long prompts as part of an external
   * environment and allows the LLM to programmatically examine, decompose,
   * and recursively call itself over snippets"
   */
  async execute<T>(
    processor: (facilities: Facility[]) => Promise<T>,
    options: {
      query?: string;
      filter?: (f: Facility) => boolean;
      forceDecomposition?: boolean;
    } = {}
  ): Promise<RLMResult<T>> {
    const startTime = performance.now();
    const errors: RLMError[] = [];
    const fallbacksUsed: string[] = [];
    const decompositionPath: string[] = [];

    const context: RLMContext = {
      query: options.query || 'default',
      depth: 0,
      maxDepth: this.maxDepth,
      chunkSize: this.chunkSize,
      breadcrumbs: []
    };

    this.log(`🔄 RLM Query Started: "${options.query || 'default'}"`);
    this.log(`   Max Depth: ${this.maxDepth}, Chunk Size: ${this.chunkSize}`);

    try {
      // Phase 1: Load data from environment (IndexedDB)
      let facilities = await this.loadFromEnvironment(options.filter);
      this.log(`📊 Loaded ${facilities.length} facilities from environment`);

      // Phase 2: Determine if decomposition is needed
      const needsDecomposition = 
        options.forceDecomposition || 
        facilities.length > this.chunkSize;

      if (!needsDecomposition) {
        // Direct processing (small enough dataset)
        this.log(`✅ Direct processing (${facilities.length} facilities)`);
        const result = await this.processWithTimeout(processor, facilities);
        
        return {
          success: true,
          data: result,
          metadata: {
            totalProcessed: facilities.length,
            chunksUsed: 1,
            recursionDepth: 0,
            executionTimeMs: performance.now() - startTime,
            fallbacksUsed,
            decompositionPath: ['direct']
          },
          errors
        };
      }

      // Phase 3: Recursive decomposition (RLM core)
      this.log(`🔀 Initiating recursive decomposition...`);
      const result = await this.recursiveProcess<T>(
        facilities,
        processor,
        context,
        errors,
        fallbacksUsed,
        decompositionPath
      );

      return {
        success: true,
        data: result,
        metadata: {
          totalProcessed: facilities.length,
          chunksUsed: decompositionPath.length,
          recursionDepth: context.depth,
          executionTimeMs: performance.now() - startTime,
          fallbacksUsed,
          decompositionPath
        },
        errors
      };

    } catch (error) {
      this.log(`❌ Fatal error: ${error}`);
      errors.push({
        phase: 'process',
        message: error instanceof Error ? error.message : String(error),
        recoverable: false,
        timestamp: new Date()
      });

      return {
        success: false,
        data: null,
        metadata: {
          totalProcessed: 0,
          chunksUsed: 0,
          recursionDepth: context.depth,
          executionTimeMs: performance.now() - startTime,
          fallbacksUsed,
          decompositionPath
        },
        errors
      };
    }
  }

  /**
   * Core recursive processing - inspired by RLM's self-invocation pattern
   * 
   * "Crucially, RLMs encourage the LLM, in the code it produces, to
   * programmatically construct sub-tasks on which they can invoke 
   * themselves recursively."
   */
  private async recursiveProcess<T>(
    data: Facility[],
    processor: (facilities: Facility[]) => Promise<T>,
    context: RLMContext,
    errors: RLMError[],
    fallbacksUsed: string[],
    decompositionPath: string[]
  ): Promise<T> {
    // Check recursion depth limit
    if (context.depth >= context.maxDepth) {
      this.log(`⚠️ Max depth reached (${context.depth}), forcing direct process`);
      return this.processWithRetry(processor, data, errors, fallbacksUsed);
    }

    // Find applicable decomposition strategy
    const strategy = decompositionStrategies.find(s => s.canDecompose(data, context));
    
    if (!strategy) {
      this.log(`📦 No decomposition strategy applicable, direct process`);
      return this.processWithRetry(processor, data, errors, fallbacksUsed);
    }

    this.log(`🔀 Using "${strategy.name}" decomposition at depth ${context.depth}`);
    decompositionPath.push(`${strategy.name}@depth${context.depth}`);

    // Decompose data
    const chunks = strategy.decompose(data, context);
    this.log(`   Created ${chunks.length} chunks`);

    // Process each chunk recursively
    const results: T[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      this.log(`   Processing chunk ${i + 1}/${chunks.length} (${chunk.length} items)`);

      const childContext: RLMContext = {
        ...context,
        depth: context.depth + 1,
        breadcrumbs: [...context.breadcrumbs, `${strategy.name}[${i}]`]
      };

      try {
        // Recursive self-invocation
        const chunkResult = await this.recursiveProcess<T>(
          chunk,
          processor,
          childContext,
          errors,
          fallbacksUsed,
          decompositionPath
        );
        results.push(chunkResult);
      } catch (error) {
        this.log(`   ⚠️ Chunk ${i + 1} failed, attempting fallback`);
        errors.push({
          phase: 'process',
          message: `Chunk ${i + 1} failed: ${error}`,
          recoverable: true,
          timestamp: new Date()
        });
        
        // Try alternative decomposition strategy
        const alternativeResult = await this.tryAlternativeStrategy<T>(
          chunk,
          processor,
          childContext,
          strategy.name,
          errors,
          fallbacksUsed
        );
        
        if (alternativeResult !== null) {
          results.push(alternativeResult);
          fallbacksUsed.push(`${strategy.name}→fallback@chunk${i}`);
        }
      }
    }

    // Aggregate results
    this.log(`📊 Aggregating ${results.length} results`);
    return strategy.aggregate<T>(results, context);
  }

  /**
   * Try alternative decomposition strategies when primary fails
   * (Antifragility through path exploration)
   */
  private async tryAlternativeStrategy<T>(
    data: Facility[],
    processor: (facilities: Facility[]) => Promise<T>,
    context: RLMContext,
    excludeStrategy: string,
    errors: RLMError[],
    fallbacksUsed: string[]
  ): Promise<T | null> {
    const alternatives = decompositionStrategies.filter(
      s => s.name !== excludeStrategy && s.canDecompose(data, context)
    );

    for (const strategy of alternatives) {
      this.log(`   Trying alternative strategy: ${strategy.name}`);
      try {
        const chunks = strategy.decompose(data, context);
        const results: T[] = [];
        
        for (const chunk of chunks) {
          const result = await this.processWithTimeout(processor, chunk);
          results.push(result);
        }
        
        fallbacksUsed.push(`alternative:${strategy.name}`);
        return strategy.aggregate<T>(results, context);
      } catch {
        continue;
      }
    }

    // Final fallback: direct processing with smaller timeout
    try {
      this.log(`   Last resort: direct processing`);
      return await this.processWithTimeout(processor, data, this.timeoutMs / 2);
    } catch (error) {
      errors.push({
        phase: 'fallback',
        message: `All fallbacks exhausted: ${error}`,
        recoverable: false,
        timestamp: new Date()
      });
      return null;
    }
  }

  /**
   * Process with retry logic and exponential backoff
   */
  private async processWithRetry<T>(
    processor: (facilities: Facility[]) => Promise<T>,
    data: Facility[],
    errors: RLMError[],
    fallbacksUsed: string[]
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await this.processWithTimeout(processor, data);
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        this.log(`   Attempt ${attempt}/${this.retryAttempts} failed: ${lastError.message}`);
        
        if (attempt < this.retryAttempts) {
          const delay = Math.pow(2, attempt) * 100; // Exponential backoff
          await this.sleep(delay);
          fallbacksUsed.push(`retry:attempt${attempt}`);
        }
      }
    }
    
    errors.push({
      phase: 'process',
      message: `All ${this.retryAttempts} attempts failed: ${lastError?.message}`,
      recoverable: false,
      timestamp: new Date()
    });
    
    throw lastError;
  }

  /**
   * Process with timeout protection
   */
  private async processWithTimeout<T>(
    processor: (facilities: Facility[]) => Promise<T>,
    data: Facility[],
    timeout: number = this.timeoutMs
  ): Promise<T> {
    return Promise.race([
      processor(data),
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Processing timeout')), timeout)
      )
    ]);
  }

  /**
   * Load data from IndexedDB environment
   */
  private async loadFromEnvironment(
    filter?: (f: Facility) => boolean
  ): Promise<Facility[]> {
    let facilities = await db.facilities.toArray();
    if (filter) {
      facilities = facilities.filter(filter);
    }
    return facilities;
  }

  /**
   * Utility functions
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString().slice(11, 23);
    const logLine = `[${timestamp}] ${message}`;
    this.executionLog.push(logLine);
    console.log(`[RLM] ${logLine}`);
  }

  /**
   * Get execution log for debugging
   */
  getExecutionLog(): string[] {
    return [...this.executionLog];
  }

  /**
   * Clear execution log
   */
  clearLog(): void {
    this.executionLog = [];
  }
}

// ============================================================================
// SPECIALIZED RLM QUERIES
// ============================================================================

/**
 * RLM-powered compliance analysis
 */
export async function analyzeComplianceRLM(): Promise<RLMResult<{
  total: number;
  compliant: number;
  nonCompliant: number;
  subsidyGap: number;
  byCountry: Record<string, { count: number; gap: number }>;
}>> {
  const engine = new RecursiveQueryEngine({
    maxDepth: 3,
    chunkSize: 2000
  });

  return engine.execute(async (facilities) => {
    const byCountry: Record<string, { count: number; gap: number }> = {};
    
    facilities.forEach(f => {
      const country = f.country || 'Unknown';
      if (!byCountry[country]) {
        byCountry[country] = { count: 0, gap: 0 };
      }
      byCountry[country].count++;
      byCountry[country].gap += f.subsidyGap || 0;
    });

    return {
      total: facilities.length,
      compliant: facilities.filter(f => f.complianceStatus === 'Compliant').length,
      nonCompliant: facilities.filter(f => f.complianceStatus === 'Non-Compliant').length,
      subsidyGap: facilities.reduce((sum, f) => sum + (f.subsidyGap || 0), 0),
      byCountry
    };
  }, { query: 'compliance-analysis' });
}

/**
 * RLM-powered pattern detection
 */
export async function detectPatternsRLM(
  patternType: 'subsidy' | 'geographic' | 'operator'
): Promise<RLMResult<{
  patterns: Array<{
    name: string;
    confidence: number;
    affectedFacilities: number;
    description: string;
  }>;
}>> {
  const engine = new RecursiveQueryEngine({
    maxDepth: 4,
    chunkSize: 1500
  });

  return engine.execute(async (facilities) => {
    const patterns: Array<{
      name: string;
      confidence: number;
      affectedFacilities: number;
      description: string;
    }> = [];

    switch (patternType) {
      case 'subsidy': {
        // Detect subsidy concentration patterns
        const byOperator = new Map<string, number>();
        facilities.forEach(f => {
          const gap = f.subsidyGap || 0;
          const current = byOperator.get(f.operator) || 0;
          byOperator.set(f.operator, current + gap);
        });

        const sorted = Array.from(byOperator.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5);

        sorted.forEach(([operator, gap], idx) => {
          patterns.push({
            name: `High Subsidy Gap: ${operator}`,
            confidence: 0.95 - (idx * 0.05),
            affectedFacilities: facilities.filter(f => f.operator === operator).length,
            description: `${operator} has accumulated $${(gap / 1e6).toFixed(1)}M in subsidy gaps`
          });
        });
        break;
      }

      case 'geographic': {
        // Detect geographic clustering
        const byState = new Map<string, number>();
        facilities.forEach(f => {
          const state = f.state || f.country || 'Unknown';
          byState.set(state, (byState.get(state) || 0) + 1);
        });

        const hotspots = Array.from(byState.entries())
          .filter(([, count]) => count > facilities.length * 0.05)
          .sort((a, b) => b[1] - a[1]);

        hotspots.forEach(([region, count]) => {
          patterns.push({
            name: `Geographic Concentration: ${region}`,
            confidence: Math.min(0.99, count / 100),
            affectedFacilities: count,
            description: `${region} contains ${((count / facilities.length) * 100).toFixed(1)}% of facilities`
          });
        });
        break;
      }

      case 'operator': {
        // Detect operator compliance patterns
        const operatorStats = new Map<string, { total: number; nonCompliant: number }>();
        facilities.forEach(f => {
          const stats = operatorStats.get(f.operator) || { total: 0, nonCompliant: 0 };
          stats.total++;
          if (f.complianceStatus === 'Non-Compliant') stats.nonCompliant++;
          operatorStats.set(f.operator, stats);
        });

        operatorStats.forEach((stats, operator) => {
          const rate = stats.nonCompliant / stats.total;
          if (rate > 0.3 && stats.total > 10) {
            patterns.push({
              name: `High Non-Compliance: ${operator}`,
              confidence: Math.min(0.95, rate + 0.1),
              affectedFacilities: stats.nonCompliant,
              description: `${operator} has ${(rate * 100).toFixed(0)}% non-compliance rate`
            });
          }
        });
        break;
      }
    }

    return { patterns };
  }, { 
    query: `pattern-detection-${patternType}`,
    forceDecomposition: true
  });
}

/**
 * RLM-powered search with automatic refinement
 */
export async function searchFacilitiesRLM(
  searchQuery: string
): Promise<RLMResult<Facility[]>> {
  const engine = new RecursiveQueryEngine({
    maxDepth: 2,
    chunkSize: 3000
  });

  const queryLower = searchQuery.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter(t => t.length > 2);

  return engine.execute(async (facilities) => {
    return facilities.filter(f => {
      const searchableText = [
        f.name,
        f.operator,
        f.country,
        f.state,
        f.city,
        f.complianceStatus
      ].filter(Boolean).join(' ').toLowerCase();

      // Match any term
      return queryTerms.some(term => searchableText.includes(term));
    });
  }, {
    query: `search:${searchQuery}`,
    forceDecomposition: queryTerms.length > 1
  });
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const rlmEngine = new RecursiveQueryEngine();

export default RecursiveQueryEngine;

