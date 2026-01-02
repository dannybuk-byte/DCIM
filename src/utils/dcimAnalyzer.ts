/**
 * DCIM Pattern Analyzer - Core analysis orchestrator
 * Combines multiple ML and statistical techniques for infrastructure monitoring
 */

import { dcimDb } from '../db/dcimDatabase';
import {
  detectStatisticalAnomalies,
  decompose,
  detectDecline,
  classifyWorkload,
  detectSeasonalPeriod,
  linearRegression,
  LinearRegression
} from './timeSeriesAnalysis';

// Dynamic imports for heavy libraries (tree-shaking friendly)
let tf: any = null;
let ARIMA: any = null;
let slayer: any = null;
let IsolationForest: any = null;

async function loadTensorFlow() {
  if (!tf) {
    try {
      tf = await import('@tensorflow/tfjs');
    } catch (error) {
      console.warn('TensorFlow.js not available. Install with: npm install @tensorflow/tfjs');
      throw error;
    }
  }
  return tf;
}


async function loadARIMA() {
  if (!ARIMA) {
    try {
      ARIMA = (await import('arima')).default;
    } catch (error) {
      console.warn('ARIMA not available. Install with: npm install arima');
      throw error;
    }
  }
  return ARIMA;
}

async function loadSlayer() {
  if (!slayer) {
    try {
      slayer = (await import('slayer')).default;
    } catch (error) {
      console.warn('Slayer not available. Install with: npm install slayer');
      throw error;
    }
  }
  return slayer;
}

async function loadIsolationForest() {
  if (!IsolationForest) {
    try {
      IsolationForest = (await import('isolation-forest')).IsolationForest;
    } catch (error) {
      console.warn('Isolation Forest not available. Install with: npm install isolation-forest');
      throw error;
    }
  }
  return IsolationForest;
}

export interface AnalysisResult {
  anomalies: Array<{
    timestamp: number;
    value: number;
    isAnomaly: boolean;
    score: number;
    method: 'statistical' | 'isolation_forest' | 'combined';
  }>;
  trend: LinearRegression;
  seasonal: {
    trend: number[];
    seasonal: number[];
    residual: number[];
    period: number;
  };
  forecast?: {
    values: number[];
    errors: number[];
  };
  workloadType: 'ai_training' | 'ai_inference' | 'traditional';
  decline?: {
    isDeclining: boolean;
    slope: number;
    rSquared: number;
  };
  capacityExhaustion?: Date;
  spikes?: Array<{ index: number; value: number }>;
}

export class DCIMAnalyzer {
  private iforest: any = null;

  /**
   * Analyze patterns for a device/metric combination
   */
  async analyzePatterns(
    deviceId: string,
    metricType: string,
    hours = 168 // Default: 1 week
  ): Promise<AnalysisResult> {
    const endTime = Date.now();
    const startTime = endTime - hours * 3600000;

    // Check cache first
    const cacheKey = `${deviceId}:${metricType}:${hours}`;
    const cached = await dcimDb.getCachedPattern(deviceId, cacheKey);
    if (cached) {
      return cached.data as AnalysisResult;
    }

    // Load data from database
    const metrics = await dcimDb.getMetrics(deviceId, startTime, endTime, metricType);
    if (metrics.length === 0) {
      throw new Error(`No metrics found for device ${deviceId}, metric ${metricType}`);
    }

    const values = metrics.map(m => m.value);
    const timestamps = metrics.map(m => m.timestamp);

    // Parallel analysis
    const [anomalies, seasonal, workloadType, decline, spikes, trend] = await Promise.all([
      this.detectAnomalies(values, timestamps),
      this.analyzeSeasonal(values),
      Promise.resolve(classifyWorkload(values)),
      Promise.resolve(detectDecline(values)),
      this.detectSpikes(values),
      this.calculateTrend(values)
    ]);

    // Optional: ARIMA forecasting (can be slow, make it optional)
    let forecast: { values: number[]; errors: number[] } | undefined;
    try {
      if (values.length >= 50) {
        forecast = await this.forecast(values, 24);
      }
    } catch (error) {
      console.warn('ARIMA forecasting failed:', error);
    }

    // Optional: Capacity exhaustion prediction (requires capacity parameter)
    // This would need to be passed as a parameter in real usage

    const result: AnalysisResult = {
      anomalies,
      trend,
      seasonal,
      forecast,
      workloadType,
      decline,
      spikes
    };

    // Cache result for 1 hour
    await dcimDb.cachePattern(deviceId, cacheKey, result, 3600000);

    return result;
  }

  /**
   * Multi-layer anomaly detection
   */
  private async detectAnomalies(
    values: number[],
    timestamps: number[]
  ): Promise<AnalysisResult['anomalies']> {
    // Layer 1: Statistical (fast, always works)
    const statistical = detectStatisticalAnomalies(values, 2.5);

    // Layer 2: Isolation Forest (if available)
    let iforestScores: number[] = [];
    try {
      const IsolationForestClass = await loadIsolationForest();
      if (!this.iforest) {
        this.iforest = new IsolationForestClass({ numberOfTrees: 100, subsamplingSize: 256 });
      }
      const data2D = values.map(v => [v]);
      this.iforest.fit(data2D);
      iforestScores = this.iforest.scores();
    } catch (error) {
      console.warn('Isolation Forest not available:', error);
    }

    // Combine results
    return values.map((value, i) => {
      const statAnomaly = statistical[i].isAnomaly;
      const iforestAnomaly = iforestScores.length > i && iforestScores[i] > 0.6;

      const score = iforestScores.length > i
        ? Math.max(Math.abs(statistical[i].zScore) / 3, iforestScores[i])
        : Math.abs(statistical[i].zScore) / 3;

      return {
        timestamp: timestamps[i],
        value,
        isAnomaly: statAnomaly || iforestAnomaly,
        score,
        method: (statAnomaly && iforestAnomaly ? 'combined' : statAnomaly ? 'statistical' : 'isolation_forest') as any
      };
    });
  }

  /**
   * Analyze seasonal patterns
   */
  private analyzeSeasonal(values: number[]): AnalysisResult['seasonal'] {
    const period = detectSeasonalPeriod(values);
    const decomposed = decompose(values, period);

    return {
      ...decomposed,
      period
    };
  }

  /**
   * Calculate linear trend
   */
  private async calculateTrend(values: number[]): Promise<LinearRegression> {
    const points = values.map((v, i) => [i, v] as [number, number]);
    return linearRegression(points);
  }

  /**
   * ARIMA forecasting
   */
  private async forecast(values: number[], steps: number): Promise<{ values: number[]; errors: number[] }> {
    try {
      const ARIMAClass = await loadARIMA();
      const model = new ARIMAClass({ auto: true, method: 0 }).train(values);
      const [forecastValues, forecastErrors] = model.predict(steps);

      return {
        values: Array.isArray(forecastValues) ? forecastValues : [forecastValues],
        errors: Array.isArray(forecastErrors) ? forecastErrors : [forecastErrors]
      };
    } catch (error) {
      console.error('ARIMA forecast error:', error);
      throw error;
    }
  }

  /**
   * Detect spikes using slayer library
   */
  private async detectSpikes(values: number[]): Promise<Array<{ index: number; value: number }>> {
    try {
      const slayerLib = await loadSlayer();
      const threshold = this.calculateSpikeThreshold(values);
      
      const dataPoints = values.map((value, index) => ({ index, power: value }));
      const spikes = await slayerLib({ minPeakDistance: 30, minPeakHeight: threshold })
        .y((d: { power: number }) => d.power)
        .fromArray(dataPoints);

      return spikes.map((spike: any) => ({
        index: spike.x || spike.index || 0,
        value: spike.y || spike.value || 0
      }));
    } catch (error) {
      console.warn('Spike detection not available:', error);
      return [];
    }
  }

  /**
   * Calculate threshold for spike detection
   */
  private calculateSpikeThreshold(values: number[]): number {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const std = Math.sqrt(variance);
    return mean + 2 * std; // 2 standard deviations
  }

  /**
   * Create LSTM autoencoder for advanced anomaly detection (optional, resource-intensive)
   */
  async createAutoencoder(windowSize: number): Promise<any> {
    try {
      const tfLib = await loadTensorFlow();
      
      const model = tfLib.sequential();
      model.add(tfLib.layers.lstm({ 
        units: 32, 
        inputShape: [windowSize, 1], 
        returnSequences: true 
      }));
      model.add(tfLib.layers.lstm({ units: 16, returnSequences: false }));
      model.add(tfLib.layers.repeatVector({ n: windowSize }));
      model.add(tfLib.layers.lstm({ units: 16, returnSequences: true }));
      model.add(tfLib.layers.timeDistributed({ 
        layer: tfLib.layers.dense({ units: 1 }) 
      }));
      model.compile({ optimizer: 'adam', loss: 'mse' });
      
      return model;
    } catch (error) {
      console.warn('TensorFlow.js not available:', error);
      return null;
    }
  }
}

export const dcimAnalyzer = new DCIMAnalyzer();

