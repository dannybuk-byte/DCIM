/**
 * Predictive Failure Detection Engine
 * 
 * Uses statistical analysis and pattern recognition to
 * predict failures BEFORE they occur:
 * - Time series analysis
 * - Anomaly detection
 * - Trend forecasting
 * - Early warning system
 * 
 * "The best way to predict the future is to create it,
 * but the second best is to detect its patterns."
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Prediction {
  id: string;
  metric: string;
  predictedValue: number;
  confidence: number; // 0-1
  timeToFailure: number | null; // ms, null if not failing
  severity: 'info' | 'warning' | 'critical';
  recommendation: string;
  timestamp: Date;
}

export interface Anomaly {
  id: string;
  metric: string;
  observedValue: number;
  expectedValue: number;
  deviation: number; // standard deviations
  timestamp: Date;
  duration: number; // ms
  resolved: boolean;
}

export interface TimeSeriesPoint {
  timestamp: number;
  value: number;
}

export interface MetricHistory {
  metric: string;
  data: TimeSeriesPoint[];
  stats: {
    mean: number;
    stdDev: number;
    min: number;
    max: number;
    trend: number; // slope
  };
}

// ============================================================================
// PREDICTIVE FAILURE ENGINE
// ============================================================================

class PredictiveFailureEngine {
  private metricHistories: Map<string, MetricHistory> = new Map();
  private anomalies: Anomaly[] = [];
  private predictions: Prediction[] = [];
  private listeners: Set<(event: PredictionEvent) => void> = new Set();

  // Configuration
  private config = {
    historyLength: 100, // Number of data points to keep
    anomalyThreshold: 2.5, // Standard deviations
    predictionHorizon: 300000, // 5 minutes ahead
    minDataPoints: 10, // Minimum points for prediction
  };

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  /**
   * Record a metric value
   */
  recordMetric(metric: string, value: number): void {
    let history = this.metricHistories.get(metric);
    
    if (!history) {
      history = {
        metric,
        data: [],
        stats: { mean: 0, stdDev: 0, min: Infinity, max: -Infinity, trend: 0 },
      };
      this.metricHistories.set(metric, history);
    }

    const point: TimeSeriesPoint = {
      timestamp: Date.now(),
      value,
    };

    history.data.push(point);

    // Keep only recent history
    if (history.data.length > this.config.historyLength) {
      history.data.shift();
    }

    // Update statistics
    this.updateStats(history);

    // Check for anomalies
    const anomaly = this.detectAnomaly(metric, value, history);
    if (anomaly) {
      this.anomalies.push(anomaly);
      this.emit({ type: 'anomaly_detected', anomaly });
    }

    // Update predictions
    this.updatePrediction(metric, history);
  }

  /**
   * Get prediction for a metric
   */
  getPrediction(metric: string): Prediction | undefined {
    return this.predictions.find(p => p.metric === metric);
  }

  /**
   * Get all current predictions
   */
  getAllPredictions(): Prediction[] {
    return [...this.predictions];
  }

  /**
   * Get recent anomalies
   */
  getAnomalies(limit: number = 50): Anomaly[] {
    return this.anomalies.slice(-limit);
  }

  /**
   * Get metric history
   */
  getMetricHistory(metric: string): MetricHistory | undefined {
    return this.metricHistories.get(metric);
  }

  /**
   * Predict time to failure
   */
  predictTimeToFailure(metric: string, threshold: number): number | null {
    const history = this.metricHistories.get(metric);
    if (!history || history.data.length < this.config.minDataPoints) {
      return null;
    }

    const { trend, mean } = history.stats;
    const currentValue = history.data[history.data.length - 1].value;

    // If trend is flat or improving, no failure predicted
    if (trend <= 0) {
      return null;
    }

    // Calculate time to threshold
    const valueDelta = threshold - currentValue;
    if (valueDelta <= 0) {
      return 0; // Already at or past threshold
    }

    // Estimate time based on trend (ms)
    const avgInterval = this.calculateAverageInterval(history.data);
    const timeToThreshold = (valueDelta / trend) * avgInterval;

    return timeToThreshold > 0 ? Math.round(timeToThreshold) : null;
  }

  /**
   * Get overall risk score (0-100)
   */
  getRiskScore(): number {
    const predictions = this.predictions.filter(p => p.timeToFailure !== null);
    
    if (predictions.length === 0) {
      return 0;
    }

    const riskScores = predictions.map(p => {
      if (p.severity === 'critical') return 100;
      if (p.severity === 'warning') return 60;
      return 20;
    });

    return Math.round(riskScores.reduce((a, b) => a + b, 0) / predictions.length);
  }

  /**
   * Get early warnings
   */
  getEarlyWarnings(): Array<{
    metric: string;
    message: string;
    severity: Prediction['severity'];
    timeRemaining: number | null;
  }> {
    return this.predictions
      .filter(p => p.severity !== 'info')
      .map(p => ({
        metric: p.metric,
        message: p.recommendation,
        severity: p.severity,
        timeRemaining: p.timeToFailure,
      }));
  }

  /**
   * Forecast future values
   */
  forecast(metric: string, steps: number = 10): TimeSeriesPoint[] {
    const history = this.metricHistories.get(metric);
    if (!history || history.data.length < this.config.minDataPoints) {
      return [];
    }

    const { trend, mean } = history.stats;
    const avgInterval = this.calculateAverageInterval(history.data);
    const lastPoint = history.data[history.data.length - 1];

    const forecasted: TimeSeriesPoint[] = [];
    let currentValue = lastPoint.value;

    for (let i = 1; i <= steps; i++) {
      currentValue += trend;
      forecasted.push({
        timestamp: lastPoint.timestamp + (avgInterval * i),
        value: currentValue,
      });
    }

    return forecasted;
  }

  /**
   * Subscribe to prediction events
   */
  subscribe(callback: (event: PredictionEvent) => void): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private updateStats(history: MetricHistory): void {
    const values = history.data.map(d => d.value);
    
    // Calculate mean
    history.stats.mean = values.reduce((a, b) => a + b, 0) / values.length;
    
    // Calculate standard deviation
    const squaredDiffs = values.map(v => Math.pow(v - history.stats.mean, 2));
    history.stats.stdDev = Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
    
    // Calculate min/max
    history.stats.min = Math.min(...values);
    history.stats.max = Math.max(...values);
    
    // Calculate trend (linear regression slope)
    history.stats.trend = this.calculateTrend(history.data);
  }

  private calculateTrend(data: TimeSeriesPoint[]): number {
    if (data.length < 2) return 0;

    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    data.forEach((point, i) => {
      sumX += i;
      sumY += point.value;
      sumXY += i * point.value;
      sumXX += i * i;
    });

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    return isNaN(slope) ? 0 : slope;
  }

  private calculateAverageInterval(data: TimeSeriesPoint[]): number {
    if (data.length < 2) return 1000;

    let totalInterval = 0;
    for (let i = 1; i < data.length; i++) {
      totalInterval += data[i].timestamp - data[i - 1].timestamp;
    }

    return totalInterval / (data.length - 1);
  }

  private detectAnomaly(
    metric: string, 
    value: number, 
    history: MetricHistory
  ): Anomaly | null {
    if (history.data.length < this.config.minDataPoints) {
      return null;
    }

    const { mean, stdDev } = history.stats;
    const deviation = Math.abs(value - mean) / (stdDev || 1);

    if (deviation > this.config.anomalyThreshold) {
      return {
        id: `anomaly-${Date.now()}`,
        metric,
        observedValue: value,
        expectedValue: mean,
        deviation,
        timestamp: new Date(),
        duration: 0,
        resolved: false,
      };
    }

    return null;
  }

  private updatePrediction(metric: string, history: MetricHistory): void {
    if (history.data.length < this.config.minDataPoints) {
      return;
    }

    const { mean, stdDev, trend } = history.stats;
    const currentValue = history.data[history.data.length - 1].value;

    // Determine thresholds based on metric type
    const thresholds = this.getMetricThresholds(metric);
    
    // Predict time to failure
    const timeToFailure = this.predictTimeToFailure(metric, thresholds.critical);

    // Calculate confidence based on data consistency
    const confidence = this.calculateConfidence(history);

    // Determine severity
    let severity: Prediction['severity'] = 'info';
    if (timeToFailure !== null && timeToFailure < 60000) {
      severity = 'critical';
    } else if (timeToFailure !== null && timeToFailure < 300000) {
      severity = 'warning';
    } else if (trend > 0 && currentValue > mean + stdDev) {
      severity = 'warning';
    }

    // Generate recommendation
    const recommendation = this.generateRecommendation(metric, severity, trend, timeToFailure);

    const prediction: Prediction = {
      id: `pred-${metric}-${Date.now()}`,
      metric,
      predictedValue: currentValue + (trend * 10),
      confidence,
      timeToFailure,
      severity,
      recommendation,
      timestamp: new Date(),
    };

    // Update or add prediction
    const existingIndex = this.predictions.findIndex(p => p.metric === metric);
    if (existingIndex >= 0) {
      this.predictions[existingIndex] = prediction;
    } else {
      this.predictions.push(prediction);
    }

    // Emit warning if severity changed
    if (severity !== 'info') {
      this.emit({ type: 'prediction_updated', prediction });
    }
  }

  private getMetricThresholds(metric: string): { warning: number; critical: number } {
    const thresholds: Record<string, { warning: number; critical: number }> = {
      'memory-usage': { warning: 70, critical: 90 },
      'error-rate': { warning: 5, critical: 15 },
      'response-time': { warning: 2000, critical: 5000 },
      'queue-size': { warning: 100, critical: 500 },
      'cpu-usage': { warning: 70, critical: 90 },
    };

    return thresholds[metric] || { warning: 70, critical: 90 };
  }

  private calculateConfidence(history: MetricHistory): number {
    // More data points = higher confidence
    const dataConfidence = Math.min(1, history.data.length / this.config.historyLength);
    
    // Lower variance = higher confidence
    const cv = history.stats.stdDev / (history.stats.mean || 1); // Coefficient of variation
    const varianceConfidence = Math.max(0, 1 - cv);

    // Consistent trend = higher confidence
    const recentTrends = this.calculateRecentTrends(history.data);
    const trendConfidence = this.calculateTrendConsistency(recentTrends);

    return (dataConfidence + varianceConfidence + trendConfidence) / 3;
  }

  private calculateRecentTrends(data: TimeSeriesPoint[]): number[] {
    if (data.length < 5) return [];

    const trends: number[] = [];
    for (let i = 4; i < data.length; i++) {
      const slice = data.slice(i - 4, i + 1);
      trends.push(this.calculateTrend(slice));
    }

    return trends;
  }

  private calculateTrendConsistency(trends: number[]): number {
    if (trends.length < 2) return 0.5;

    // Check if trends are consistently positive, negative, or zero
    const positive = trends.filter(t => t > 0).length;
    const negative = trends.filter(t => t < 0).length;
    
    const consistency = Math.max(positive, negative) / trends.length;
    return consistency;
  }

  private generateRecommendation(
    metric: string,
    severity: Prediction['severity'],
    trend: number,
    timeToFailure: number | null
  ): string {
    const metricName = metric.replace(/-/g, ' ');

    if (severity === 'critical') {
      if (timeToFailure !== null && timeToFailure < 60000) {
        return `URGENT: ${metricName} will reach critical level in <1 minute. Immediate action required.`;
      }
      return `CRITICAL: ${metricName} is approaching dangerous levels. Take action now.`;
    }

    if (severity === 'warning') {
      if (timeToFailure !== null) {
        const minutes = Math.round(timeToFailure / 60000);
        return `WARNING: ${metricName} trending up. Estimated ${minutes} minutes to critical. Consider preventive measures.`;
      }
      return `WARNING: ${metricName} is elevated. Monitor closely.`;
    }

    if (trend > 0) {
      return `INFO: ${metricName} showing upward trend. No immediate action needed.`;
    }

    return `OK: ${metricName} is stable.`;
  }

  private emit(event: PredictionEvent): void {
    this.listeners.forEach(cb => {
      try {
        cb(event);
      } catch (e) {
        console.error('Prediction event listener error:', e);
      }
    });
  }
}

// ============================================================================
// EVENT TYPES
// ============================================================================

type PredictionEvent =
  | { type: 'anomaly_detected'; anomaly: Anomaly }
  | { type: 'prediction_updated'; prediction: Prediction };

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const predictiveFailureEngine = new PredictiveFailureEngine();

// Convenience function to record metrics from anywhere
export const recordMetric = predictiveFailureEngine.recordMetric.bind(predictiveFailureEngine);

