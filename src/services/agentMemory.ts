/**
 * Agent Memory System
 * 
 * Provides persistent memory and learning capabilities for AI agents.
 * Implements patterns from TWIML Episode #756 (Yutori Scouts):
 * - Cross-session memory persistence
 * - Learning from human feedback (RLHF-lite)
 * - Pattern recognition from past decisions
 * - Cost optimization through experience
 * 
 * @module agentMemory
 */

import { useState, useEffect, useCallback } from 'react';
import { db } from '../db/database';

// ============================================================================
// TYPES
// ============================================================================

export interface AgentMemoryEntry {
  id?: number;
  agentId: string;
  agentType: string;
  memoryType: MemoryType;
  content: MemoryContent;
  confidence: number;
  createdAt: Date;
  accessCount: number;
  lastAccessedAt: Date;
  expiresAt?: Date;
  tags: string[];
  metadata: Record<string, unknown>;
}

export type MemoryType = 
  | 'task_outcome'      // Result of a completed task
  | 'feedback'          // Human feedback on agent action
  | 'pattern'           // Learned pattern from multiple observations
  | 'decision'          // Decision made with reasoning
  | 'error'             // Error encountered and resolution
  | 'preference'        // User/system preference learned
  | 'entity'            // Entity information (company, facility, etc.)
  | 'relationship';     // Relationship between entities

export interface MemoryContent {
  summary: string;
  details: Record<string, unknown>;
  embedding?: number[];  // For semantic search
}

export interface TaskOutcomeMemory extends MemoryContent {
  taskId: string;
  taskType: string;
  success: boolean;
  duration: number;
  cost: number;
  parameters: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

export interface FeedbackMemory extends MemoryContent {
  originalAction: string;
  humanDecision: 'approved' | 'rejected' | 'modified';
  feedback?: string;
  correctAction?: string;
  impactLevel: 'critical' | 'high' | 'medium' | 'low';
}

export interface PatternMemory extends MemoryContent {
  patternType: string;
  conditions: Record<string, unknown>;
  predictedOutcome: string;
  successRate: number;
  sampleSize: number;
  lastValidated: Date;
}

export interface LearnedDecision {
  context: string;
  decision: string;
  confidence: number;
  reasoning: string;
  outcome?: 'positive' | 'negative' | 'neutral';
  feedbackCount: number;
}

// ============================================================================
// AGENT MEMORY SERVICE
// ============================================================================

class AgentMemoryService {
  private memoryCache = new Map<string, AgentMemoryEntry[]>();
  private learningEnabled = true;
  private maxMemoriesPerAgent = 1000;
  private memoryRetentionDays = 365;

  // ============================================================================
  // MEMORY STORAGE
  // ============================================================================

  /**
   * Store a new memory for an agent
   */
  async remember(
    agentId: string,
    agentType: string,
    memoryType: MemoryType,
    content: MemoryContent,
    options: {
      confidence?: number;
      tags?: string[];
      expiresAt?: Date;
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<number> {
    const entry: AgentMemoryEntry = {
      agentId,
      agentType,
      memoryType,
      content,
      confidence: options.confidence ?? 0.8,
      createdAt: new Date(),
      accessCount: 0,
      lastAccessedAt: new Date(),
      expiresAt: options.expiresAt,
      tags: options.tags ?? [],
      metadata: options.metadata ?? {},
    };

    try {
      // Store in IndexedDB
      const id = await db.table('agentMemories').add(entry);
      
      // Update cache
      const cacheKey = `${agentId}:${memoryType}`;
      const cached = this.memoryCache.get(cacheKey) || [];
      cached.push({ ...entry, id: id as number });
      this.memoryCache.set(cacheKey, cached.slice(-100)); // Keep last 100 in cache

      console.log(`[AgentMemory] Stored ${memoryType} memory for ${agentId}`);
      return id as number;
    } catch (error) {
      console.error('[AgentMemory] Failed to store memory:', error);
      throw error;
    }
  }

  /**
   * Record task outcome for learning
   */
  async recordTaskOutcome(
    agentId: string,
    agentType: string,
    outcome: TaskOutcomeMemory
  ): Promise<number> {
    return this.remember(agentId, agentType, 'task_outcome', outcome, {
      confidence: outcome.success ? 0.9 : 0.6,
      tags: [outcome.taskType, outcome.success ? 'success' : 'failure'],
      metadata: {
        duration: outcome.duration,
        cost: outcome.cost,
      },
    });
  }

  /**
   * Record human feedback for RLHF-lite learning
   */
  async recordFeedback(
    agentId: string,
    agentType: string,
    feedback: FeedbackMemory
  ): Promise<number> {
    const memoryId = await this.remember(agentId, agentType, 'feedback', feedback, {
      confidence: 0.95, // Human feedback is high confidence
      tags: [feedback.humanDecision, feedback.impactLevel, feedback.originalAction],
      metadata: {
        impactLevel: feedback.impactLevel,
        wasModified: feedback.humanDecision === 'modified',
      },
    });

    // Trigger pattern learning if we have enough feedback
    await this.learnFromFeedback(agentId, agentType, feedback);

    return memoryId;
  }

  /**
   * Record a learned pattern
   */
  async recordPattern(
    agentId: string,
    agentType: string,
    pattern: PatternMemory
  ): Promise<number> {
    // Check if similar pattern exists
    const existing = await this.findSimilarPatterns(agentId, pattern.patternType, pattern.conditions);
    
    if (existing.length > 0) {
      // Update existing pattern
      const best = existing[0];
      const bestDetails = best.content.details as Record<string, unknown>;
      const bestSuccessRate = (bestDetails.successRate as number) || 0;
      const bestSampleSize = (bestDetails.sampleSize as number) || 1;
      
      const updatedPattern: PatternMemory = {
        ...pattern,
        successRate: (bestSuccessRate * bestSampleSize + pattern.successRate * pattern.sampleSize) / 
                    (bestSampleSize + pattern.sampleSize),
        sampleSize: bestSampleSize + pattern.sampleSize,
        lastValidated: new Date(),
      };
      
      await db.table('agentMemories').update(best.id!, { 
        content: updatedPattern,
        confidence: Math.min(updatedPattern.successRate, 0.99),
        lastAccessedAt: new Date(),
      });
      
      return best.id!;
    }

    return this.remember(agentId, agentType, 'pattern', pattern, {
      confidence: pattern.successRate,
      tags: [pattern.patternType],
      metadata: {
        sampleSize: pattern.sampleSize,
      },
    });
  }

  // ============================================================================
  // MEMORY RETRIEVAL
  // ============================================================================

  /**
   * Recall memories for an agent
   */
  async recall(
    agentId: string,
    memoryType?: MemoryType,
    options: {
      limit?: number;
      minConfidence?: number;
      tags?: string[];
      since?: Date;
    } = {}
  ): Promise<AgentMemoryEntry[]> {
    const { limit = 50, minConfidence = 0, tags, since } = options;

    try {
      let query = db.table('agentMemories')
        .where('agentId').equals(agentId);

      const memories = await query.toArray();
      
      let filtered = memories
        .filter(m => !memoryType || m.memoryType === memoryType)
        .filter(m => m.confidence >= minConfidence)
        .filter(m => !since || new Date(m.createdAt) >= since)
        .filter(m => !m.expiresAt || new Date(m.expiresAt) > new Date())
        .filter(m => !tags || tags.some(t => m.tags.includes(t)));

      // Sort by relevance (confidence * recency)
      filtered.sort((a, b) => {
        const aScore = a.confidence * (1 / (Date.now() - new Date(a.lastAccessedAt).getTime() + 1));
        const bScore = b.confidence * (1 / (Date.now() - new Date(b.lastAccessedAt).getTime() + 1));
        return bScore - aScore;
      });

      const result = filtered.slice(0, limit);

      // Update access counts
      for (const memory of result) {
        if (memory.id) {
          db.table('agentMemories').update(memory.id, {
            accessCount: (memory.accessCount || 0) + 1,
            lastAccessedAt: new Date(),
          }).catch(() => {}); // Silent update
        }
      }

      return result;
    } catch (error) {
      console.error('[AgentMemory] Recall failed:', error);
      return [];
    }
  }

  /**
   * Find similar patterns based on conditions
   */
  async findSimilarPatterns(
    agentId: string,
    patternType: string,
    conditions: Record<string, unknown>
  ): Promise<AgentMemoryEntry[]> {
    const patterns = await this.recall(agentId, 'pattern', {
      tags: [patternType],
      minConfidence: 0.5,
    });

    // Score patterns by condition similarity
    const scored = patterns.map(p => {
      const patternConditions = p.content.details.conditions as Record<string, unknown>;
      let matchScore = 0;
      let totalKeys = 0;
      
      for (const [key, value] of Object.entries(conditions)) {
        totalKeys++;
        if (patternConditions[key] === value) {
          matchScore++;
        }
      }
      
      return {
        pattern: p,
        similarity: totalKeys > 0 ? matchScore / totalKeys : 0,
      };
    });

    return scored
      .filter(s => s.similarity > 0.7)
      .sort((a, b) => b.similarity - a.similarity)
      .map(s => s.pattern);
  }

  /**
   * Get recommended action based on past decisions
   */
  async getRecommendedDecision(
    agentId: string,
    context: string,
    options: string[]
  ): Promise<{
    recommended: string | null;
    confidence: number;
    reasoning: string;
    alternatives: Array<{ option: string; confidence: number }>;
  }> {
    // Get relevant feedback memories
    const feedbacks = await this.recall(agentId, 'feedback', {
      limit: 100,
      minConfidence: 0.7,
    });

    // Get relevant patterns
    const patterns = await this.recall(agentId, 'pattern', {
      limit: 50,
      minConfidence: 0.7,
    });

    // Score each option based on past experience
    const scores = options.map(option => {
      let score = 0.5; // Base neutral score
      let evidence = 0;

      // Check feedback for similar actions
      for (const fb of feedbacks) {
        const details = fb.content.details as unknown as FeedbackMemory;
        if (details.originalAction?.toLowerCase().includes(option.toLowerCase())) {
          if (details.humanDecision === 'approved') {
            score += 0.1 * fb.confidence;
            evidence++;
          } else if (details.humanDecision === 'rejected') {
            score -= 0.15 * fb.confidence;
            evidence++;
          }
        }
      }

      // Check patterns for success rates
      for (const pattern of patterns) {
        const details = pattern.content.details as unknown as PatternMemory;
        if (details.predictedOutcome?.toLowerCase().includes(option.toLowerCase())) {
          score += (details.successRate - 0.5) * 0.2;
          evidence++;
        }
      }

      return {
        option,
        score: Math.max(0, Math.min(1, score)),
        evidence,
      };
    });

    // Sort by score
    scores.sort((a, b) => b.score - a.score);

    const recommended = scores[0];
    const hasStrongRecommendation = recommended && recommended.evidence >= 3 && recommended.score > 0.6;

    return {
      recommended: hasStrongRecommendation ? recommended.option : null,
      confidence: hasStrongRecommendation ? recommended.score : 0,
      reasoning: hasStrongRecommendation
        ? `Based on ${recommended.evidence} past experiences with ${(recommended.score * 100).toFixed(0)}% success rate`
        : 'Insufficient past experience to make confident recommendation',
      alternatives: scores.slice(1).map(s => ({
        option: s.option,
        confidence: s.score,
      })),
    };
  }

  // ============================================================================
  // LEARNING
  // ============================================================================

  /**
   * Learn patterns from accumulated feedback
   */
  private async learnFromFeedback(
    agentId: string,
    agentType: string,
    newFeedback: FeedbackMemory
  ): Promise<void> {
    if (!this.learningEnabled) return;

    // Get recent feedback for the same action type
    const similarFeedback = await this.recall(agentId, 'feedback', {
      limit: 20,
      tags: [newFeedback.originalAction],
      minConfidence: 0.8,
    });

    if (similarFeedback.length >= 5) {
      // Calculate success rate for this action
      const approved = similarFeedback.filter(f => 
        (f.content.details as unknown as FeedbackMemory).humanDecision === 'approved'
      ).length;
      const successRate = approved / similarFeedback.length;

      // Create or update pattern
      const patternConditions: Record<string, unknown> = {
        action: newFeedback.originalAction,
        impactLevel: newFeedback.impactLevel,
      };

      const pattern: PatternMemory = {
        summary: `Pattern for "${newFeedback.originalAction}" action`,
        details: {
          action: newFeedback.originalAction,
          successRate,
          sampleSize: similarFeedback.length,
        },
        patternType: 'action_approval',
        conditions: patternConditions,
        predictedOutcome: successRate > 0.7 ? 'likely_approved' : 'likely_rejected',
        successRate,
        sampleSize: similarFeedback.length,
        lastValidated: new Date(),
      };

      await this.recordPattern(agentId, agentType, pattern);
      console.log(`[AgentMemory] Learned pattern for "${newFeedback.originalAction}": ${(successRate * 100).toFixed(0)}% approval rate`);
    }
  }

  /**
   * Consolidate memories (merge duplicates, remove stale)
   */
  async consolidateMemories(agentId: string): Promise<{
    merged: number;
    removed: number;
    remaining: number;
  }> {
    const allMemories = await this.recall(agentId, undefined, { limit: 10000 });
    let merged = 0;
    let removed = 0;

    // Remove expired memories
    const now = new Date();
    for (const memory of allMemories) {
      if (memory.expiresAt && new Date(memory.expiresAt) < now) {
        await db.table('agentMemories').delete(memory.id!);
        removed++;
      }
    }

    // Remove very old, low-confidence, rarely-accessed memories
    const staleThreshold = new Date(now.getTime() - this.memoryRetentionDays * 24 * 60 * 60 * 1000);
    for (const memory of allMemories) {
      if (
        new Date(memory.lastAccessedAt) < staleThreshold &&
        memory.confidence < 0.5 &&
        memory.accessCount < 5
      ) {
        await db.table('agentMemories').delete(memory.id!);
        removed++;
      }
    }

    // TODO: Implement memory merging for similar patterns

    const remaining = await db.table('agentMemories')
      .where('agentId').equals(agentId)
      .count();

    console.log(`[AgentMemory] Consolidated memories for ${agentId}: merged=${merged}, removed=${removed}, remaining=${remaining}`);

    return { merged, removed, remaining };
  }

  // ============================================================================
  // COST OPTIMIZATION
  // ============================================================================

  /**
   * Get cost statistics and optimization suggestions
   */
  async getCostAnalysis(agentId: string): Promise<{
    totalCost: number;
    avgCostPerTask: number;
    costByTaskType: Record<string, number>;
    suggestions: string[];
  }> {
    const taskOutcomes = await this.recall(agentId, 'task_outcome', { limit: 500 });
    
    let totalCost = 0;
    const costByType: Record<string, { total: number; count: number }> = {};

    for (const memory of taskOutcomes) {
      const outcome = memory.content as TaskOutcomeMemory;
      const cost = outcome.cost || 0;
      totalCost += cost;

      if (!costByType[outcome.taskType]) {
        costByType[outcome.taskType] = { total: 0, count: 0 };
      }
      costByType[outcome.taskType].total += cost;
      costByType[outcome.taskType].count++;
    }

    const avgCostPerTask = taskOutcomes.length > 0 ? totalCost / taskOutcomes.length : 0;
    
    const costByTaskType: Record<string, number> = {};
    for (const [type, data] of Object.entries(costByType)) {
      costByTaskType[type] = data.count > 0 ? data.total / data.count : 0;
    }

    // Generate suggestions
    const suggestions: string[] = [];
    const targetCost = 0.35; // $0.35/task from Yutori Scouts

    if (avgCostPerTask > targetCost) {
      suggestions.push(`Average cost ($${avgCostPerTask.toFixed(3)}) exceeds target ($${targetCost}). Consider batching similar tasks.`);
    }

    // Find expensive task types
    for (const [type, avgCost] of Object.entries(costByTaskType)) {
      if (avgCost > targetCost * 2) {
        suggestions.push(`Task type "${type}" costs $${avgCost.toFixed(3)}/task. Consider caching results or reducing scope.`);
      }
    }

    return {
      totalCost,
      avgCostPerTask,
      costByTaskType,
      suggestions,
    };
  }

  // ============================================================================
  // UTILITIES
  // ============================================================================

  /**
   * Get memory statistics
   */
  async getStats(agentId?: string): Promise<{
    totalMemories: number;
    byType: Record<MemoryType, number>;
    avgConfidence: number;
    oldestMemory: Date | null;
    newestMemory: Date | null;
  }> {
    let memories: AgentMemoryEntry[];
    
    if (agentId) {
      memories = await db.table('agentMemories').where('agentId').equals(agentId).toArray();
    } else {
      memories = await db.table('agentMemories').toArray();
    }
    
    const byType: Record<string, number> = {};
    let totalConfidence = 0;
    let oldest: Date | null = null;
    let newest: Date | null = null;

    for (const memory of memories) {
      byType[memory.memoryType] = (byType[memory.memoryType] || 0) + 1;
      totalConfidence += memory.confidence;

      const created = new Date(memory.createdAt);
      if (!oldest || created < oldest) oldest = created;
      if (!newest || created > newest) newest = created;
    }

    return {
      totalMemories: memories.length,
      byType: byType as Record<MemoryType, number>,
      avgConfidence: memories.length > 0 ? totalConfidence / memories.length : 0,
      oldestMemory: oldest,
      newestMemory: newest,
    };
  }

  /**
   * Clear all memories for an agent
   */
  async clearMemories(agentId: string): Promise<number> {
    const deleted = await db.table('agentMemories')
      .where('agentId').equals(agentId)
      .delete();
    
    // Clear cache
    for (const key of this.memoryCache.keys()) {
      if (key.startsWith(agentId)) {
        this.memoryCache.delete(key);
      }
    }

    console.log(`[AgentMemory] Cleared ${deleted} memories for ${agentId}`);
    return deleted;
  }

  setLearningEnabled(enabled: boolean): void {
    this.learningEnabled = enabled;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const agentMemory = new AgentMemoryService();

// ============================================================================
// REACT HOOK
// ============================================================================

export function useAgentMemory(agentId?: string) {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof agentMemory.getStats>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        const s = await agentMemory.getStats(agentId);
        setStats(s);
      } catch (error) {
        console.error('[useAgentMemory] Failed to load stats:', error);
      }
      setLoading(false);
    };

    loadStats();
  }, [agentId]);

  const remember = useCallback(async (
    id: string,
    type: string,
    memoryType: MemoryType,
    content: MemoryContent,
    options?: Parameters<typeof agentMemory.remember>[4]
  ) => {
    return agentMemory.remember(id, type, memoryType, content, options);
  }, []);

  const recall = useCallback(async (
    id: string,
    type?: MemoryType,
    options?: Parameters<typeof agentMemory.recall>[2]
  ) => {
    return agentMemory.recall(id, type, options);
  }, []);

  const recordFeedback = useCallback(async (
    id: string,
    type: string,
    feedback: FeedbackMemory
  ) => {
    const result = await agentMemory.recordFeedback(id, type, feedback);
    // Refresh stats
    const s = await agentMemory.getStats(agentId);
    setStats(s);
    return result;
  }, [agentId]);

  const getRecommendation = useCallback(async (
    id: string,
    context: string,
    options: string[]
  ) => {
    return agentMemory.getRecommendedDecision(id, context, options);
  }, []);

  const getCostAnalysis = useCallback(async (id: string) => {
    return agentMemory.getCostAnalysis(id);
  }, []);

  return {
    stats,
    loading,
    remember,
    recall,
    recordFeedback,
    getRecommendation,
    getCostAnalysis,
    consolidate: (id: string) => agentMemory.consolidateMemories(id),
    clearMemories: (id: string) => agentMemory.clearMemories(id),
  };
}
