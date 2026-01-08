/**
 * Cost Tracking Service
 * 
 * Implements real cost tracking based on TWIML Episode #756 (Yutori Scouts):
 * - $0.35/task target cost
 * - Token counting for LLM calls
 * - Cost per agent/task type
 * - Budget alerts and limits
 * - Cost optimization recommendations
 * 
 * Key insight: Know your costs to optimize them. Track everything.
 * 
 * @module costTracking
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface CostEntry {
  id: string;
  timestamp: Date;
  category: CostCategory;
  agentId?: string;
  taskId?: string;
  taskType?: string;
  provider?: string;
  model?: string;
  
  // Token counts
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  
  // Costs
  inputCost: number;
  outputCost: number;
  totalCost: number;
  
  // Metadata
  duration: number;
  success: boolean;
  metadata?: Record<string, unknown>;
}

export type CostCategory =
  | 'llm_inference'      // LLM API calls
  | 'agent_task'         // Agent task execution
  | 'embedding'          // Vector embeddings
  | 'tool_invocation'    // MCP tool calls
  | 'api_call'           // External API calls
  | 'storage'            // Data storage
  | 'compute'            // Compute resources
  | 'network';           // Network bandwidth

export interface ModelPricing {
  modelId: string;
  provider: string;
  inputPricePer1K: number;  // $ per 1K input tokens
  outputPricePer1K: number; // $ per 1K output tokens
  contextWindow: number;
  lastUpdated: Date;
}

export interface Budget {
  id: string;
  name: string;
  limit: number;
  period: 'daily' | 'weekly' | 'monthly' | 'total';
  current: number;
  resetAt?: Date;
  alertThreshold: number; // Percentage to trigger alert
  alertTriggered: boolean;
}

export interface CostSummary {
  totalCost: number;
  totalTokens: number;
  avgCostPerTask: number;
  taskCount: number;
  costByCategory: Record<CostCategory, number>;
  costByAgent: Record<string, number>;
  costByModel: Record<string, number>;
  tokensByModel: Record<string, { input: number; output: number }>;
  period: { start: Date; end: Date };
}

export interface CostOptimization {
  id: string;
  type: OptimizationType;
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  priority: number;
  implemented: boolean;
}

export type OptimizationType =
  | 'model_downgrade'
  | 'prompt_optimization'
  | 'caching'
  | 'batching'
  | 'rate_limiting'
  | 'task_consolidation';

// ============================================================================
// MODEL PRICING (as of January 2026)
// ============================================================================

export const MODEL_PRICING: ModelPricing[] = [
  // OpenAI
  {
    modelId: 'gpt-4-turbo',
    provider: 'openai',
    inputPricePer1K: 0.01,
    outputPricePer1K: 0.03,
    contextWindow: 128000,
    lastUpdated: new Date('2026-01-01'),
  },
  {
    modelId: 'gpt-4o',
    provider: 'openai',
    inputPricePer1K: 0.005,
    outputPricePer1K: 0.015,
    contextWindow: 128000,
    lastUpdated: new Date('2026-01-01'),
  },
  {
    modelId: 'gpt-4o-mini',
    provider: 'openai',
    inputPricePer1K: 0.00015,
    outputPricePer1K: 0.0006,
    contextWindow: 128000,
    lastUpdated: new Date('2026-01-01'),
  },
  {
    modelId: 'gpt-3.5-turbo',
    provider: 'openai',
    inputPricePer1K: 0.0005,
    outputPricePer1K: 0.0015,
    contextWindow: 16385,
    lastUpdated: new Date('2026-01-01'),
  },
  // Anthropic
  {
    modelId: 'claude-3-5-sonnet',
    provider: 'anthropic',
    inputPricePer1K: 0.003,
    outputPricePer1K: 0.015,
    contextWindow: 200000,
    lastUpdated: new Date('2026-01-01'),
  },
  {
    modelId: 'claude-3-opus',
    provider: 'anthropic',
    inputPricePer1K: 0.015,
    outputPricePer1K: 0.075,
    contextWindow: 200000,
    lastUpdated: new Date('2026-01-01'),
  },
  {
    modelId: 'claude-3-haiku',
    provider: 'anthropic',
    inputPricePer1K: 0.00025,
    outputPricePer1K: 0.00125,
    contextWindow: 200000,
    lastUpdated: new Date('2026-01-01'),
  },
  // Local/Free models
  {
    modelId: 'llama-3',
    provider: 'ollama',
    inputPricePer1K: 0,
    outputPricePer1K: 0,
    contextWindow: 8192,
    lastUpdated: new Date('2026-01-01'),
  },
  {
    modelId: 'mistral-7b',
    provider: 'ollama',
    inputPricePer1K: 0,
    outputPricePer1K: 0,
    contextWindow: 32768,
    lastUpdated: new Date('2026-01-01'),
  },
];

// ============================================================================
// COST TRACKING SERVICE
// ============================================================================

class CostTrackingService {
  private entries: CostEntry[] = [];
  private budgets = new Map<string, Budget>();
  private listeners = new Set<(event: CostEvent) => void>();
  private maxEntries = 10000;
  
  // Target from Yutori Scouts
  private targetCostPerTask = 0.35;

  // ============================================================================
  // COST RECORDING
  // ============================================================================

  /**
   * Record a cost entry
   */
  recordCost(entry: Omit<CostEntry, 'id' | 'timestamp'>): CostEntry {
    const fullEntry: CostEntry = {
      ...entry,
      id: `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
    };

    this.entries.push(fullEntry);

    // Trim old entries
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries / 2);
    }

    // Update budgets
    this.updateBudgets(fullEntry);

    this.emit({ type: 'cost_recorded', entry: fullEntry });

    return fullEntry;
  }

  /**
   * Record LLM API call cost
   */
  recordLLMCost(params: {
    agentId?: string;
    taskId?: string;
    provider: string;
    model: string;
    inputTokens: number;
    outputTokens: number;
    duration: number;
    success: boolean;
    metadata?: Record<string, unknown>;
  }): CostEntry {
    const pricing = this.getModelPricing(params.model);
    
    const inputCost = (params.inputTokens / 1000) * pricing.inputPricePer1K;
    const outputCost = (params.outputTokens / 1000) * pricing.outputPricePer1K;
    const totalCost = inputCost + outputCost;

    return this.recordCost({
      category: 'llm_inference',
      agentId: params.agentId,
      taskId: params.taskId,
      provider: params.provider,
      model: params.model,
      inputTokens: params.inputTokens,
      outputTokens: params.outputTokens,
      totalTokens: params.inputTokens + params.outputTokens,
      inputCost,
      outputCost,
      totalCost,
      duration: params.duration,
      success: params.success,
      metadata: params.metadata,
    });
  }

  /**
   * Record agent task cost
   */
  recordTaskCost(params: {
    agentId: string;
    taskId: string;
    taskType: string;
    llmCosts?: CostEntry[];
    toolCosts?: number;
    duration: number;
    success: boolean;
  }): CostEntry {
    const llmTotal = params.llmCosts?.reduce((sum, e) => sum + e.totalCost, 0) || 0;
    const llmTokens = params.llmCosts?.reduce((sum, e) => sum + e.totalTokens, 0) || 0;
    const totalCost = llmTotal + (params.toolCosts || 0);

    return this.recordCost({
      category: 'agent_task',
      agentId: params.agentId,
      taskId: params.taskId,
      taskType: params.taskType,
      inputTokens: params.llmCosts?.reduce((sum, e) => sum + e.inputTokens, 0) || 0,
      outputTokens: params.llmCosts?.reduce((sum, e) => sum + e.outputTokens, 0) || 0,
      totalTokens: llmTokens,
      inputCost: params.llmCosts?.reduce((sum, e) => sum + e.inputCost, 0) || 0,
      outputCost: params.llmCosts?.reduce((sum, e) => sum + e.outputCost, 0) || 0,
      totalCost,
      duration: params.duration,
      success: params.success,
      metadata: {
        llmCallCount: params.llmCosts?.length || 0,
        toolCosts: params.toolCosts,
      },
    });
  }

  /**
   * Record tool invocation cost
   */
  recordToolCost(params: {
    agentId?: string;
    taskId?: string;
    toolId: string;
    cost: number;
    duration: number;
    success: boolean;
  }): CostEntry {
    return this.recordCost({
      category: 'tool_invocation',
      agentId: params.agentId,
      taskId: params.taskId,
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      inputCost: 0,
      outputCost: 0,
      totalCost: params.cost,
      duration: params.duration,
      success: params.success,
      metadata: { toolId: params.toolId },
    });
  }

  // ============================================================================
  // TOKEN ESTIMATION
  // ============================================================================

  /**
   * Estimate token count for text
   * Uses simple approximation: ~4 characters per token
   */
  estimateTokens(text: string): number {
    // GPT-style tokenization approximation
    // Average ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  /**
   * Estimate cost for a prompt
   */
  estimateCost(params: {
    model: string;
    inputText: string;
    estimatedOutputTokens: number;
  }): { inputCost: number; outputCost: number; totalCost: number; inputTokens: number } {
    const pricing = this.getModelPricing(params.model);
    const inputTokens = this.estimateTokens(params.inputText);
    
    const inputCost = (inputTokens / 1000) * pricing.inputPricePer1K;
    const outputCost = (params.estimatedOutputTokens / 1000) * pricing.outputPricePer1K;

    return {
      inputCost,
      outputCost,
      totalCost: inputCost + outputCost,
      inputTokens,
    };
  }

  // ============================================================================
  // BUDGET MANAGEMENT
  // ============================================================================

  createBudget(params: {
    id: string;
    name: string;
    limit: number;
    period: Budget['period'];
    alertThreshold?: number;
  }): Budget {
    const budget: Budget = {
      id: params.id,
      name: params.name,
      limit: params.limit,
      period: params.period,
      current: 0,
      alertThreshold: params.alertThreshold ?? 0.8,
      alertTriggered: false,
    };

    if (params.period !== 'total') {
      budget.resetAt = this.calculateNextReset(params.period);
    }

    this.budgets.set(budget.id, budget);
    this.emit({ type: 'budget_created', budget });

    return budget;
  }

  private calculateNextReset(period: Budget['period']): Date {
    const now = new Date();
    
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      case 'weekly':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + (7 - now.getDay()));
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return now;
    }
  }

  private updateBudgets(entry: CostEntry): void {
    const now = new Date();

    for (const [id, budget] of this.budgets) {
      // Check for reset
      if (budget.resetAt && now >= budget.resetAt) {
        budget.current = 0;
        budget.alertTriggered = false;
        budget.resetAt = this.calculateNextReset(budget.period);
      }

      // Add cost to budget
      budget.current += entry.totalCost;

      // Check alert threshold
      const usageRatio = budget.current / budget.limit;
      if (usageRatio >= budget.alertThreshold && !budget.alertTriggered) {
        budget.alertTriggered = true;
        this.emit({ 
          type: 'budget_alert', 
          budgetId: id, 
          usageRatio,
          remaining: budget.limit - budget.current 
        });
      }

      // Check if over limit
      if (budget.current > budget.limit) {
        this.emit({ 
          type: 'budget_exceeded', 
          budgetId: id,
          overage: budget.current - budget.limit 
        });
      }
    }
  }

  getBudgets(): Budget[] {
    return Array.from(this.budgets.values());
  }

  getBudget(id: string): Budget | undefined {
    return this.budgets.get(id);
  }

  // ============================================================================
  // SUMMARIES & ANALYTICS
  // ============================================================================

  getSummary(params?: {
    startDate?: Date;
    endDate?: Date;
    agentId?: string;
    category?: CostCategory;
  }): CostSummary {
    const start = params?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = params?.endDate || new Date();

    let filtered = this.entries.filter(e => 
      e.timestamp >= start && e.timestamp <= end
    );

    if (params?.agentId) {
      filtered = filtered.filter(e => e.agentId === params.agentId);
    }

    if (params?.category) {
      filtered = filtered.filter(e => e.category === params.category);
    }

    const totalCost = filtered.reduce((sum, e) => sum + e.totalCost, 0);
    const totalTokens = filtered.reduce((sum, e) => sum + e.totalTokens, 0);
    const taskCount = filtered.filter(e => e.category === 'agent_task').length;

    // Aggregate by category
    const costByCategory: Record<string, number> = {};
    for (const entry of filtered) {
      costByCategory[entry.category] = (costByCategory[entry.category] || 0) + entry.totalCost;
    }

    // Aggregate by agent
    const costByAgent: Record<string, number> = {};
    for (const entry of filtered) {
      if (entry.agentId) {
        costByAgent[entry.agentId] = (costByAgent[entry.agentId] || 0) + entry.totalCost;
      }
    }

    // Aggregate by model
    const costByModel: Record<string, number> = {};
    const tokensByModel: Record<string, { input: number; output: number }> = {};
    for (const entry of filtered) {
      if (entry.model) {
        costByModel[entry.model] = (costByModel[entry.model] || 0) + entry.totalCost;
        if (!tokensByModel[entry.model]) {
          tokensByModel[entry.model] = { input: 0, output: 0 };
        }
        tokensByModel[entry.model].input += entry.inputTokens;
        tokensByModel[entry.model].output += entry.outputTokens;
      }
    }

    return {
      totalCost,
      totalTokens,
      avgCostPerTask: taskCount > 0 ? totalCost / taskCount : 0,
      taskCount,
      costByCategory: costByCategory as Record<CostCategory, number>,
      costByAgent,
      costByModel,
      tokensByModel,
      period: { start, end },
    };
  }

  /**
   * Get cost trend over time
   */
  getCostTrend(params: {
    days: number;
    granularity: 'hour' | 'day';
  }): Array<{ timestamp: Date; cost: number; tokens: number }> {
    const now = Date.now();
    const startTime = now - params.days * 24 * 60 * 60 * 1000;
    const bucketSize = params.granularity === 'hour' 
      ? 60 * 60 * 1000 
      : 24 * 60 * 60 * 1000;

    const buckets = new Map<number, { cost: number; tokens: number }>();

    for (const entry of this.entries) {
      if (entry.timestamp.getTime() < startTime) continue;
      
      const bucketKey = Math.floor(entry.timestamp.getTime() / bucketSize) * bucketSize;
      const existing = buckets.get(bucketKey) || { cost: 0, tokens: 0 };
      buckets.set(bucketKey, {
        cost: existing.cost + entry.totalCost,
        tokens: existing.tokens + entry.totalTokens,
      });
    }

    return Array.from(buckets.entries())
      .map(([ts, data]) => ({
        timestamp: new Date(ts),
        cost: data.cost,
        tokens: data.tokens,
      }))
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // ============================================================================
  // OPTIMIZATION RECOMMENDATIONS
  // ============================================================================

  getOptimizationRecommendations(): CostOptimization[] {
    const recommendations: CostOptimization[] = [];
    const summary = this.getSummary();

    // Check if average cost exceeds target
    if (summary.avgCostPerTask > this.targetCostPerTask) {
      recommendations.push({
        id: 'opt_1',
        type: 'model_downgrade',
        description: `Average cost ($${summary.avgCostPerTask.toFixed(3)}) exceeds target ($${this.targetCostPerTask}). Consider using smaller models for routine tasks.`,
        potentialSavings: (summary.avgCostPerTask - this.targetCostPerTask) * summary.taskCount,
        effort: 'medium',
        priority: 1,
        implemented: false,
      });
    }

    // Check for expensive models being overused
    const expensiveModels = ['gpt-4-turbo', 'claude-3-opus'];
    for (const model of expensiveModels) {
      const modelCost = summary.costByModel[model] || 0;
      if (modelCost > summary.totalCost * 0.3) {
        recommendations.push({
          id: `opt_model_${model}`,
          type: 'model_downgrade',
          description: `${model} accounts for ${((modelCost / summary.totalCost) * 100).toFixed(1)}% of costs. Consider gpt-4o-mini or claude-3-haiku for simple tasks.`,
          potentialSavings: modelCost * 0.7,
          effort: 'low',
          priority: 2,
          implemented: false,
        });
      }
    }

    // Check for high token usage
    for (const [model, tokens] of Object.entries(summary.tokensByModel)) {
      if (tokens.input > tokens.output * 5) {
        recommendations.push({
          id: `opt_prompt_${model}`,
          type: 'prompt_optimization',
          description: `High input/output ratio for ${model}. Consider shortening prompts or using system prompts more efficiently.`,
          potentialSavings: summary.costByModel[model] * 0.3,
          effort: 'medium',
          priority: 3,
          implemented: false,
        });
      }
    }

    // Check if caching could help
    const taskTypes = new Set(this.entries.filter(e => e.taskType).map(e => e.taskType));
    for (const taskType of taskTypes) {
      const taskEntries = this.entries.filter(e => e.taskType === taskType);
      if (taskEntries.length > 10) {
        recommendations.push({
          id: `opt_cache_${taskType}`,
          type: 'caching',
          description: `Task type "${taskType}" has been run ${taskEntries.length} times. Consider caching results.`,
          potentialSavings: taskEntries.reduce((sum, e) => sum + e.totalCost, 0) * 0.5,
          effort: 'medium',
          priority: 4,
          implemented: false,
        });
      }
    }

    // Sort by potential savings
    return recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings);
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  getModelPricing(modelId: string): ModelPricing {
    const pricing = MODEL_PRICING.find(p => p.modelId === modelId);
    if (pricing) return pricing;

    // Default pricing if model not found
    console.warn(`[CostTracking] Unknown model: ${modelId}, using default pricing`);
    return {
      modelId,
      provider: 'unknown',
      inputPricePer1K: 0.001,
      outputPricePer1K: 0.002,
      contextWindow: 4096,
      lastUpdated: new Date(),
    };
  }

  getTargetCostPerTask(): number {
    return this.targetCostPerTask;
  }

  setTargetCostPerTask(target: number): void {
    this.targetCostPerTask = target;
  }

  getEntries(limit = 100): CostEntry[] {
    return this.entries.slice(-limit);
  }

  clearEntries(): void {
    this.entries = [];
    this.emit({ type: 'entries_cleared' });
  }

  // ============================================================================
  // EVENT SYSTEM
  // ============================================================================

  subscribe(callback: (event: CostEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private emit(event: CostEvent): void {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('[CostTracking] Event listener error:', e);
      }
    });
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

type CostEvent =
  | { type: 'cost_recorded'; entry: CostEntry }
  | { type: 'budget_created'; budget: Budget }
  | { type: 'budget_alert'; budgetId: string; usageRatio: number; remaining: number }
  | { type: 'budget_exceeded'; budgetId: string; overage: number }
  | { type: 'entries_cleared' };

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const costTracking = new CostTrackingService();

// ============================================================================
// REACT HOOK
// ============================================================================

export function useCostTracking() {
  const [summary, setSummary] = useState<CostSummary | null>(null);
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [recommendations, setRecommendations] = useState<CostOptimization[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Initial load
    setSummary(costTracking.getSummary());
    setBudgets(costTracking.getBudgets());
    setRecommendations(costTracking.getOptimizationRecommendations());

    // Subscribe to updates
    const unsubscribe = costTracking.subscribe(() => {
      setSummary(costTracking.getSummary());
      setBudgets(costTracking.getBudgets());
      setRecommendations(costTracking.getOptimizationRecommendations());
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const recordLLMCost = useCallback((params: Parameters<typeof costTracking.recordLLMCost>[0]) => {
    return costTracking.recordLLMCost(params);
  }, []);

  const recordTaskCost = useCallback((params: Parameters<typeof costTracking.recordTaskCost>[0]) => {
    return costTracking.recordTaskCost(params);
  }, []);

  const estimateCost = useCallback((params: Parameters<typeof costTracking.estimateCost>[0]) => {
    return costTracking.estimateCost(params);
  }, []);

  const createBudget = useCallback((params: Parameters<typeof costTracking.createBudget>[0]) => {
    return costTracking.createBudget(params);
  }, []);

  const getCostTrend = useCallback((params: Parameters<typeof costTracking.getCostTrend>[0]) => {
    return costTracking.getCostTrend(params);
  }, []);

  return {
    summary,
    budgets,
    recommendations,
    targetCostPerTask: costTracking.getTargetCostPerTask(),
    recordLLMCost,
    recordTaskCost,
    estimateCost,
    createBudget,
    getCostTrend,
    getEntries: () => costTracking.getEntries(),
    estimateTokens: costTracking.estimateTokens.bind(costTracking),
    getModelPricing: costTracking.getModelPricing.bind(costTracking),
  };
}
