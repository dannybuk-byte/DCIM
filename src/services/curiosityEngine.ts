/**
 * Curiosity Engine - Self-Aware Detection System
 * 
 * A question-generating system that identifies gaps in detection understanding.
 * Tracks prediction accuracy and generates investigation recommendations.
 * 
 * @module curiosityEngine
 * @version 1.0.0
 */

import { db } from '../db/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CuriosityQuestion {
  id: string;
  type: QuestionType;
  text: string;
  context: Record<string, unknown>;
  investigationPath: string[];
  learningValue: number; // 0-1, higher = more valuable to investigate
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  resolution?: string;
  createdAt: number;
  resolvedAt?: number;
}

export type QuestionType = 
  | 'pattern_anomaly'
  | 'prediction_mismatch'
  | 'coverage_gap'
  | 'calibration_concern'
  | 'intent_ambiguity'
  | 'correlation_missing'
  | 'temporal_gap'
  | 'confidence_drift';

export interface Prediction {
  id: string;
  detectionId: string;
  predictedConfidence: number;
  predictedOutcome: string;
  actualOutcome?: string;
  timestamp: number;
  resolvedAt?: number;
  errorMagnitude?: number;
}

export interface KnowledgeGap {
  id: string;
  type: 'data_source' | 'geographic' | 'provider' | 'temporal' | 'signal_type';
  priority: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  recommendation: string;
  affectedFacilities: string[];
  status: 'open' | 'mitigated' | 'accepted';
  createdAt: number;
}

export interface CalibrationReport {
  totalPredictions: number;
  resolvedPredictions: number;
  brierScore: number; // 0-1, lower is better
  calibrationBuckets: CalibrationBucket[];
  isOverconfident: boolean;
  isUnderconfident: boolean;
  recommendation: string;
}

export interface CalibrationBucket {
  confidenceRange: [number, number];
  predictedProbability: number;
  actualFrequency: number;
  count: number;
}

export interface LearnedPattern {
  id: string;
  source: string;
  type: string;
  pattern: string;
  confidence: number;
  occurrences: number;
  learnedAt: number;
  lastSeen: number;
}

// ============================================================================
// QUESTION TEMPLATES
// ============================================================================

const QUESTION_TEMPLATES: Record<QuestionType, {
  learningValue: number;
  generateText: (context: Record<string, unknown>) => string;
  generateInvestigation: (context: Record<string, unknown>) => string[];
}> = {
  pattern_anomaly: {
    learningValue: 0.8,
    generateText: (ctx) => 
      `Why does ${ctx.facility} show ${ctx.presentPattern} but not ${ctx.missingPattern}?`,
    generateInvestigation: (ctx) => [
      `Check historical data for ${ctx.facility}`,
      `Compare with similar facilities in same region`,
      `Verify data source completeness for ${ctx.missingPattern}`,
      'Look for equipment or configuration differences'
    ]
  },
  
  prediction_mismatch: {
    learningValue: 0.95,
    generateText: (ctx) => 
      `Predicted ${ctx.predicted}% confidence but actual was ${ctx.actual}%. What factors were missed?`,
    generateInvestigation: (ctx) => [
      'Review feature weights in classification model',
      `Identify what changed between prediction (${ctx.predictionTime}) and outcome (${ctx.outcomeTime})`,
      'Check for external events (SEC filings, news) that weren\'t captured',
      'Consider adding new signal sources'
    ]
  },
  
  coverage_gap: {
    learningValue: 0.7,
    generateText: (ctx) => 
      `${ctx.facility} only has ${ctx.sourceCount} data sources. What signals are missing?`,
    generateInvestigation: (ctx) => [
      `Add BGP monitoring for ${ctx.facility}'s ASN`,
      'Check Certificate Transparency for related domains',
      'Search SEC EDGAR for relevant filings',
      'Query PeeringDB for network presence'
    ]
  },
  
  calibration_concern: {
    learningValue: 0.85,
    generateText: (ctx) => 
      `Confidence variance for ${ctx.detectionType} is ${ctx.variance}. Is the model calibrated?`,
    generateInvestigation: (ctx) => [
      'Build calibration curve for recent predictions',
      'Compare high-confidence vs low-confidence accuracy',
      'Identify feature distributions that cause variance',
      'Consider model retraining with recent data'
    ]
  },
  
  intent_ambiguity: {
    learningValue: 0.9,
    generateText: (ctx) => 
      `Is ${ctx.provider}'s pattern at ${ctx.facility} intentional or accidental?`,
    generateInvestigation: (ctx) => [
      'Check for regulatory filings mentioning planned changes',
      'Look for press releases or job postings',
      'Compare with similar facilities from same provider',
      'Monitor for follow-up patterns indicating intent'
    ]
  },
  
  correlation_missing: {
    learningValue: 0.75,
    generateText: (ctx) => 
      `${ctx.signal1} detected but expected ${ctx.signal2} is absent. Why?`,
    generateInvestigation: (ctx) => [
      `Verify ${ctx.signal2} data source is operational`,
      'Check for timing differences (CT often precedes BGP)',
      'Consider alternative explanations for isolated signal',
      'Flag for follow-up monitoring'
    ]
  },
  
  temporal_gap: {
    learningValue: 0.65,
    generateText: (ctx) => 
      `No data from ${ctx.facility} for ${ctx.gapDuration}. Is this expected?`,
    generateInvestigation: (ctx) => [
      'Check if facility is still operational',
      'Verify data pipeline connectivity',
      'Look for maintenance announcements',
      'Compare with regional patterns'
    ]
  },
  
  confidence_drift: {
    learningValue: 0.8,
    generateText: (ctx) => 
      `Confidence scores for ${ctx.detectionType} have drifted ${ctx.direction} by ${ctx.amount}% over ${ctx.period}. Why?`,
    generateInvestigation: (ctx) => [
      'Check for concept drift in underlying data',
      'Review recent model updates',
      'Identify if new patterns are emerging',
      'Consider retraining or recalibration'
    ]
  }
};

// ============================================================================
// QUESTION GENERATOR
// ============================================================================

/**
 * Generates investigation questions from detection gaps
 */
export class QuestionGenerator {
  private questions: Map<string, CuriosityQuestion> = new Map();
  
  /**
   * Generate questions from a detection result
   */
  generateQuestions(
    detection: {
      facilityId: string;
      confidence: number;
      patterns: string[];
      missingPatterns?: string[];
      provider?: string;
    },
    context: Record<string, unknown> = {}
  ): CuriosityQuestion[] {
    const generated: CuriosityQuestion[] = [];
    
    // Pattern anomaly: has some signals but missing expected ones
    if (detection.missingPatterns?.length && detection.confidence < 0.7) {
      const q = this.createQuestion('pattern_anomaly', {
        ...context,
        facility: detection.facilityId,
        presentPattern: detection.patterns.join(', '),
        missingPattern: detection.missingPatterns.join(', ')
      });
      generated.push(q);
    }
    
    // Intent ambiguity: medium confidence range
    if (detection.confidence > 0.3 && detection.confidence < 0.7 && detection.provider) {
      const q = this.createQuestion('intent_ambiguity', {
        ...context,
        provider: detection.provider,
        facility: detection.facilityId,
        confidence: (detection.confidence * 100).toFixed(0)
      });
      generated.push(q);
    }
    
    // Store generated questions
    for (const q of generated) {
      this.questions.set(q.id, q);
      this.persistQuestion(q);
    }
    
    return generated;
  }

  /**
   * Create a question from template
   */
  private createQuestion(
    type: QuestionType, 
    context: Record<string, unknown>
  ): CuriosityQuestion {
    const template = QUESTION_TEMPLATES[type];
    
    return {
      id: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      text: template.generateText(context),
      context,
      investigationPath: template.generateInvestigation(context),
      learningValue: template.learningValue,
      status: 'open',
      createdAt: Date.now()
    };
  }

  /**
   * Generate coverage gap questions for a facility
   */
  generateCoverageGapQuestion(
    facilityId: string,
    sourceCount: number,
    availableSources: string[]
  ): CuriosityQuestion | null {
    if (sourceCount >= 3) return null;
    
    const q = this.createQuestion('coverage_gap', {
      facility: facilityId,
      sourceCount,
      availableSources
    });
    
    this.questions.set(q.id, q);
    this.persistQuestion(q);
    
    return q;
  }

  /**
   * Resolve a question with an answer
   */
  resolveQuestion(questionId: string, resolution: string): void {
    const question = this.questions.get(questionId);
    if (!question) return;
    
    question.status = 'resolved';
    question.resolution = resolution;
    question.resolvedAt = Date.now();
    
    this.questions.set(questionId, question);
    this.persistQuestion(question);
    
    // Learn from resolution
    this.learnFromResolution(question, resolution);
  }

  /**
   * Learn patterns from resolved questions
   */
  private learnFromResolution(
    question: CuriosityQuestion, 
    resolution: string
  ): void {
    const pattern: LearnedPattern = {
      id: `pattern_${Date.now()}`,
      source: question.type,
      type: 'resolution',
      pattern: resolution,
      confidence: question.learningValue,
      occurrences: 1,
      learnedAt: Date.now(),
      lastSeen: Date.now()
    };
    
    // Store learned pattern
    this.persistPattern(pattern);
  }

  /**
   * Get open questions sorted by learning value
   */
  getOpenQuestions(): CuriosityQuestion[] {
    return Array.from(this.questions.values())
      .filter(q => q.status === 'open')
      .sort((a, b) => b.learningValue - a.learningValue);
  }

  /**
   * Get questions by type
   */
  getQuestionsByType(type: QuestionType): CuriosityQuestion[] {
    return Array.from(this.questions.values())
      .filter(q => q.type === type);
  }

  /**
   * Dismiss a question
   */
  dismissQuestion(questionId: string, reason?: string): void {
    const question = this.questions.get(questionId);
    if (!question) return;
    
    question.status = 'dismissed';
    question.resolution = reason || 'Dismissed without resolution';
    question.resolvedAt = Date.now();
    
    this.questions.set(questionId, question);
    this.persistQuestion(question);
  }

  /**
   * Persist question to IndexedDB
   */
  private async persistQuestion(question: CuriosityQuestion): Promise<void> {
    try {
      await db.curiosityQuestions?.put(question);
    } catch (error) {
      console.warn('Could not persist question', error);
    }
  }

  /**
   * Persist learned pattern to IndexedDB
   */
  private async persistPattern(pattern: LearnedPattern): Promise<void> {
    try {
      await db.learnedPatterns?.put(pattern);
    } catch (error) {
      console.warn('Could not persist pattern', error);
    }
  }

  /**
   * Load questions from IndexedDB
   */
  async loadQuestions(): Promise<void> {
    try {
      const stored = await db.curiosityQuestions?.toArray() || [];
      for (const q of stored) {
        this.questions.set(q.id, q);
      }
    } catch (error) {
      console.warn('Could not load questions', error);
    }
  }
}

// ============================================================================
// KNOWLEDGE GAP DETECTOR
// ============================================================================

/**
 * Detects and tracks knowledge gaps in facility coverage
 */
export class KnowledgeGapDetector {
  private gaps: Map<string, KnowledgeGap> = new Map();

  /**
   * Detect coverage gaps for facilities
   */
  detectGaps(
    facilities: Array<{
      id: string;
      name: string;
      dataSources: string[];
      region?: string;
      provider?: string;
    }>
  ): KnowledgeGap[] {
    const detected: KnowledgeGap[] = [];
    
    // Group by region
    const byRegion = new Map<string, typeof facilities>();
    for (const f of facilities) {
      const region = f.region || 'unknown';
      if (!byRegion.has(region)) byRegion.set(region, []);
      byRegion.get(region)!.push(f);
    }
    
    // Detect data source gaps
    for (const facility of facilities) {
      if (facility.dataSources.length < 2) {
        const gap = this.createGap('data_source', {
          facilityId: facility.id,
          facilityName: facility.name,
          currentSources: facility.dataSources
        });
        detected.push(gap);
      }
    }
    
    // Detect geographic gaps (regions with few facilities)
    for (const [region, regionFacilities] of byRegion.entries()) {
      if (region !== 'unknown' && regionFacilities.length < 3) {
        const gap = this.createGap('geographic', {
          region,
          facilityCount: regionFacilities.length,
          facilityIds: regionFacilities.map(f => f.id)
        });
        detected.push(gap);
      }
    }
    
    // Store gaps
    for (const gap of detected) {
      this.gaps.set(gap.id, gap);
    }
    
    return detected;
  }

  /**
   * Create a knowledge gap
   */
  private createGap(
    type: KnowledgeGap['type'],
    context: Record<string, unknown>
  ): KnowledgeGap {
    const descriptions: Record<KnowledgeGap['type'], (ctx: Record<string, unknown>) => { desc: string; rec: string; priority: KnowledgeGap['priority'] }> = {
      data_source: (ctx) => ({
        desc: `${ctx.facilityName} has only ${(ctx.currentSources as string[]).length} data source(s)`,
        rec: 'Add BGP, CT, or SEC monitoring for this facility',
        priority: 'high'
      }),
      geographic: (ctx) => ({
        desc: `${ctx.region} region has only ${ctx.facilityCount} monitored facilities`,
        rec: 'Expand coverage in this region to improve pattern detection',
        priority: 'medium'
      }),
      provider: (ctx) => ({
        desc: `Limited visibility into ${ctx.provider} operations`,
        rec: 'Add ASN tracking and domain monitoring for this provider',
        priority: 'high'
      }),
      temporal: (ctx) => ({
        desc: `Data gap of ${ctx.duration} detected`,
        rec: 'Investigate data pipeline for interruptions',
        priority: 'critical'
      }),
      signal_type: (ctx) => ({
        desc: `${ctx.signalType} signals unavailable`,
        rec: 'Enable additional monitoring endpoints',
        priority: 'medium'
      })
    };
    
    const { desc, rec, priority } = descriptions[type](context);
    
    return {
      id: `gap_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      priority,
      description: desc,
      recommendation: rec,
      affectedFacilities: context.facilityIds as string[] || [context.facilityId as string].filter(Boolean),
      status: 'open',
      createdAt: Date.now()
    };
  }

  /**
   * Generate prioritized gap report
   */
  generateGapReport(): {
    totalGaps: number;
    byPriority: Record<string, number>;
    byType: Record<string, number>;
    topRecommendations: string[];
  } {
    const gaps = Array.from(this.gaps.values()).filter(g => g.status === 'open');
    
    const byPriority: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    const byType: Record<string, number> = {};
    
    for (const gap of gaps) {
      byPriority[gap.priority]++;
      byType[gap.type] = (byType[gap.type] || 0) + 1;
    }
    
    // Get top recommendations from highest priority gaps
    const topRecommendations = gaps
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      })
      .slice(0, 5)
      .map(g => g.recommendation);
    
    return {
      totalGaps: gaps.length,
      byPriority,
      byType,
      topRecommendations
    };
  }

  /**
   * Mark a gap as mitigated
   */
  mitigateGap(gapId: string): void {
    const gap = this.gaps.get(gapId);
    if (gap) {
      gap.status = 'mitigated';
      this.gaps.set(gapId, gap);
    }
  }

  /**
   * Get all open gaps
   */
  getOpenGaps(): KnowledgeGap[] {
    return Array.from(this.gaps.values()).filter(g => g.status === 'open');
  }
}

// ============================================================================
// META-CONFIDENCE MONITOR
// ============================================================================

/**
 * Tracks prediction accuracy and calibration
 */
export class MetaConfidenceMonitor {
  private predictions: Map<string, Prediction> = new Map();

  /**
   * Record a new prediction
   */
  recordPrediction(
    detectionId: string,
    predictedConfidence: number,
    predictedOutcome: string
  ): string {
    const prediction: Prediction = {
      id: `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      detectionId,
      predictedConfidence,
      predictedOutcome,
      timestamp: Date.now()
    };
    
    this.predictions.set(prediction.id, prediction);
    this.persistPrediction(prediction);
    
    return prediction.id;
  }

  /**
   * Record the actual outcome for a prediction
   */
  recordOutcome(predictionId: string, actualOutcome: string): void {
    const prediction = this.predictions.get(predictionId);
    if (!prediction) return;
    
    prediction.actualOutcome = actualOutcome;
    prediction.resolvedAt = Date.now();
    
    // Calculate error magnitude
    const predicted = prediction.predictedOutcome === actualOutcome ? prediction.predictedConfidence : 1 - prediction.predictedConfidence;
    const actual = prediction.predictedOutcome === actualOutcome ? 1 : 0;
    prediction.errorMagnitude = Math.abs(predicted - actual);
    
    this.predictions.set(predictionId, prediction);
    this.persistPrediction(prediction);
  }

  /**
   * Calculate Brier score (proper scoring rule)
   * Lower is better: 0 = perfect, 1 = worst
   */
  calculateBrierScore(timeRange?: { start: number; end: number }): number {
    const resolved = this.getResolvedPredictions(timeRange);
    if (resolved.length === 0) return 0.5; // No data, return neutral
    
    const squaredErrors = resolved.map(p => {
      const actual = p.predictedOutcome === p.actualOutcome ? 1 : 0;
      const forecast = p.predictedConfidence;
      return Math.pow(forecast - actual, 2);
    });
    
    return squaredErrors.reduce((a, b) => a + b, 0) / resolved.length;
  }

  /**
   * Build calibration curve
   */
  buildCalibrationCurve(): CalibrationBucket[] {
    const buckets: CalibrationBucket[] = [];
    const ranges: [number, number][] = [
      [0, 0.2], [0.2, 0.4], [0.4, 0.6], [0.6, 0.8], [0.8, 1.0]
    ];
    
    const resolved = this.getResolvedPredictions();
    
    for (const [low, high] of ranges) {
      const inRange = resolved.filter(p => 
        p.predictedConfidence >= low && p.predictedConfidence < high
      );
      
      if (inRange.length === 0) {
        buckets.push({
          confidenceRange: [low, high],
          predictedProbability: (low + high) / 2,
          actualFrequency: 0,
          count: 0
        });
        continue;
      }
      
      const avgConfidence = inRange.reduce((sum, p) => sum + p.predictedConfidence, 0) / inRange.length;
      const actualCorrect = inRange.filter(p => p.predictedOutcome === p.actualOutcome).length;
      const actualFrequency = actualCorrect / inRange.length;
      
      buckets.push({
        confidenceRange: [low, high],
        predictedProbability: avgConfidence,
        actualFrequency,
        count: inRange.length
      });
    }
    
    return buckets;
  }

  /**
   * Generate calibration report
   */
  getCalibrationReport(): CalibrationReport {
    const resolved = this.getResolvedPredictions();
    const brierScore = this.calculateBrierScore();
    const calibrationBuckets = this.buildCalibrationCurve();
    
    // Determine if over/under confident
    let overconfidentCount = 0;
    let underconfidentCount = 0;
    
    for (const bucket of calibrationBuckets) {
      if (bucket.count === 0) continue;
      if (bucket.predictedProbability > bucket.actualFrequency + 0.1) {
        overconfidentCount++;
      } else if (bucket.predictedProbability < bucket.actualFrequency - 0.1) {
        underconfidentCount++;
      }
    }
    
    const isOverconfident = overconfidentCount > underconfidentCount;
    const isUnderconfident = underconfidentCount > overconfidentCount;
    
    let recommendation = 'Model appears well-calibrated.';
    if (isOverconfident) {
      recommendation = 'Model is overconfident. Consider reducing confidence scores or adding uncertainty.';
    } else if (isUnderconfident) {
      recommendation = 'Model is underconfident. Confidence scores can be increased.';
    }
    if (brierScore > 0.25) {
      recommendation += ' Overall prediction accuracy needs improvement.';
    }
    
    return {
      totalPredictions: this.predictions.size,
      resolvedPredictions: resolved.length,
      brierScore,
      calibrationBuckets,
      isOverconfident,
      isUnderconfident,
      recommendation
    };
  }

  /**
   * Get resolved predictions
   */
  private getResolvedPredictions(
    timeRange?: { start: number; end: number }
  ): Prediction[] {
    return Array.from(this.predictions.values())
      .filter(p => {
        if (!p.actualOutcome) return false;
        if (timeRange) {
          return p.timestamp >= timeRange.start && p.timestamp <= timeRange.end;
        }
        return true;
      });
  }

  /**
   * Persist prediction to IndexedDB
   */
  private async persistPrediction(prediction: Prediction): Promise<void> {
    try {
      await db.predictions?.put(prediction);
    } catch (error) {
      console.warn('Could not persist prediction', error);
    }
  }

  /**
   * Load predictions from IndexedDB
   */
  async loadPredictions(): Promise<void> {
    try {
      const stored = await db.predictions?.toArray() || [];
      for (const p of stored) {
        this.predictions.set(p.id, p);
      }
    } catch (error) {
      console.warn('Could not load predictions', error);
    }
  }
}

// ============================================================================
// UNIFIED CURIOSITY ENGINE
// ============================================================================

/**
 * Unified interface for curiosity-driven investigation
 */
export class CuriosityEngine {
  public questionGenerator: QuestionGenerator;
  public gapDetector: KnowledgeGapDetector;
  public confidenceMonitor: MetaConfidenceMonitor;

  constructor() {
    this.questionGenerator = new QuestionGenerator();
    this.gapDetector = new KnowledgeGapDetector();
    this.confidenceMonitor = new MetaConfidenceMonitor();
  }

  /**
   * Initialize from IndexedDB
   */
  async initialize(): Promise<void> {
    await this.questionGenerator.loadQuestions();
    await this.confidenceMonitor.loadPredictions();
  }

  /**
   * Get comprehensive curiosity report
   */
  getReport(): {
    openQuestions: CuriosityQuestion[];
    knowledgeGaps: KnowledgeGap[];
    calibration: CalibrationReport;
    topInvestigations: string[];
  } {
    const openQuestions = this.questionGenerator.getOpenQuestions();
    const knowledgeGaps = this.gapDetector.getOpenGaps();
    const calibration = this.confidenceMonitor.getCalibrationReport();
    
    // Combine top investigations from questions and gaps
    const topInvestigations = [
      ...openQuestions.slice(0, 3).flatMap(q => q.investigationPath.slice(0, 1)),
      ...this.gapDetector.generateGapReport().topRecommendations.slice(0, 2)
    ];
    
    return {
      openQuestions: openQuestions.slice(0, 10),
      knowledgeGaps: knowledgeGaps.slice(0, 10),
      calibration,
      topInvestigations
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const curiosityEngine = new CuriosityEngine();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

/**
 * React hook for curiosity engine
 */
export function useCuriosity() {
  const [questions, setQuestions] = useState<CuriosityQuestion[]>([]);
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [calibration, setCalibration] = useState<CalibrationReport | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const init = async () => {
      await curiosityEngine.initialize();
      const report = curiosityEngine.getReport();
      setQuestions(report.openQuestions);
      setGaps(report.knowledgeGaps);
      setCalibration(report.calibration);
      setIsInitialized(true);
    };
    init();
  }, []);

  const resolveQuestion = useCallback((id: string, resolution: string) => {
    curiosityEngine.questionGenerator.resolveQuestion(id, resolution);
    setQuestions(curiosityEngine.questionGenerator.getOpenQuestions());
  }, []);

  const dismissQuestion = useCallback((id: string, reason?: string) => {
    curiosityEngine.questionGenerator.dismissQuestion(id, reason);
    setQuestions(curiosityEngine.questionGenerator.getOpenQuestions());
  }, []);

  const recordPrediction = useCallback((
    detectionId: string, 
    confidence: number, 
    outcome: string
  ) => {
    return curiosityEngine.confidenceMonitor.recordPrediction(detectionId, confidence, outcome);
  }, []);

  const recordOutcome = useCallback((predictionId: string, actualOutcome: string) => {
    curiosityEngine.confidenceMonitor.recordOutcome(predictionId, actualOutcome);
    setCalibration(curiosityEngine.confidenceMonitor.getCalibrationReport());
  }, []);

  return {
    questions,
    gaps,
    calibration,
    isInitialized,
    resolveQuestion,
    dismissQuestion,
    recordPrediction,
    recordOutcome,
    refresh: () => {
      const report = curiosityEngine.getReport();
      setQuestions(report.openQuestions);
      setGaps(report.knowledgeGaps);
      setCalibration(report.calibration);
    }
  };
}

