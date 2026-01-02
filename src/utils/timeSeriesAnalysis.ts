/**
 * Time-series analysis utilities for DCIM pattern inference
 */

// Statistical anomaly detection using z-score
export function detectStatisticalAnomalies(
  data: number[],
  threshold = 2.5
): Array<{ index: number; value: number; zScore: number; isAnomaly: boolean }> {
  if (data.length === 0) return [];

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
  const std = Math.sqrt(variance);

  if (std === 0) {
    return data.map((value, i) => ({
      index: i,
      value,
      zScore: 0,
      isAnomaly: false
    }));
  }

  return data.map((value, i) => {
    const zScore = (value - mean) / std;
    return {
      index: i,
      value,
      zScore,
      isAnomaly: Math.abs(zScore) > threshold
    };
  });
}

// Calculate autocorrelation for period detection
export function calculateAutocorrelation(data: number[], lag: number): number {
  if (lag >= data.length || data.length < 2) return 0;

  const mean = data.reduce((a, b) => a + b, 0) / data.length;
  const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;

  if (variance === 0) return 0;

  let covariance = 0;
  for (let i = 0; i < data.length - lag; i++) {
    covariance += (data[i] - mean) * (data[i + lag] - mean);
  }
  covariance /= (data.length - lag);

  return covariance / variance;
}

// Detect seasonal period using autocorrelation
export function detectSeasonalPeriod(data: number[], maxLag?: number): number {
  const effectiveMaxLag = maxLag || Math.min(Math.floor(data.length / 2), 168); // Up to 1 week for hourly data
  let bestPeriod = 24; // Default to daily
  let maxCorr = 0;

  for (let lag = 1; lag <= effectiveMaxLag; lag++) {
    const corr = Math.abs(calculateAutocorrelation(data, lag));
    if (corr > maxCorr) {
      maxCorr = corr;
      bestPeriod = lag;
    }
  }

  return bestPeriod;
}

// Simple LOESS smoothing (local polynomial regression)
function loessSmooth(data: number[], bandwidth = 0.3): number[] {
  const smoothed: number[] = [];
  const n = data.length;
  const windowSize = Math.max(1, Math.floor(n * bandwidth));

  for (let i = 0; i < n; i++) {
    const start = Math.max(0, i - windowSize);
    const end = Math.min(n, i + windowSize + 1);
    const window = data.slice(start, end);
    const weights = window.map((_, idx) => {
      const distance = Math.abs(idx - (i - start));
      return Math.pow(1 - Math.pow(distance / windowSize, 3), 3); // Tricube weight
    });

    const weightedSum = window.reduce((sum, val, idx) => sum + val * weights[idx], 0);
    const weightSum = weights.reduce((a, b) => a + b, 0);
    smoothed.push(weightSum > 0 ? weightedSum / weightSum : data[i]);
  }

  return smoothed;
}

// Decompose time series into trend, seasonal, and residual components
export function decompose(
  data: number[],
  period?: number
): { trend: number[]; seasonal: number[]; residual: number[] } {
  if (data.length === 0) {
    return { trend: [], seasonal: [], residual: [] };
  }

  const detectedPeriod = period || detectSeasonalPeriod(data);
  const trend = loessSmooth(data, 0.3);
  const detrended = data.map((v, i) => v - trend[i]);

  // Calculate seasonal component
  const seasonal = new Array(data.length).fill(0);
  const seasonalValues: number[] = new Array(detectedPeriod).fill(0);
  const seasonalCounts: number[] = new Array(detectedPeriod).fill(0);

  // Average values for each position in the period
  for (let i = 0; i < detrended.length; i++) {
    const periodPos = i % detectedPeriod;
    seasonalValues[periodPos] += detrended[i];
    seasonalCounts[periodPos]++;
  }

  // Normalize seasonal component
  const seasonalMean = seasonalValues.reduce((a, b, i) => a + (seasonalCounts[i] > 0 ? b / seasonalCounts[i] : 0), 0) / detectedPeriod;
  for (let i = 0; i < detectedPeriod; i++) {
    if (seasonalCounts[i] > 0) {
      seasonalValues[i] = seasonalValues[i] / seasonalCounts[i] - seasonalMean;
    }
  }

  // Fill seasonal array
  for (let i = 0; i < data.length; i++) {
    seasonal[i] = seasonalValues[i % detectedPeriod];
  }

  // Calculate residual
  const residual = data.map((v, i) => v - trend[i] - seasonal[i]);

  return { trend, seasonal, residual };
}

// Linear regression calculation
export interface LinearRegression {
  m: number; // slope
  b: number; // y-intercept
}

export function linearRegression(points: Array<[number, number]>): LinearRegression {
  if (points.length === 0) return { m: 0, b: 0 };

  const n = points.length;
  const sumX = points.reduce((sum, [x]) => sum + x, 0);
  const sumY = points.reduce((sum, [, y]) => sum + y, 0);
  const sumXY = points.reduce((sum, [x, y]) => sum + x * y, 0);
  const sumXX = points.reduce((sum, [x]) => sum + x * x, 0);

  const m = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const b = (sumY - m * sumX) / n;

  return { m, b };
}

// Calculate R-squared for regression fit
export function calculateRSquared(
  points: Array<[number, number]>,
  regression: LinearRegression
): number {
  if (points.length === 0) return 0;

  const meanY = points.reduce((sum, [, y]) => sum + y, 0) / points.length;
  const ssRes = points.reduce((sum, [x, y]) => {
    const predicted = regression.m * x + regression.b;
    return sum + Math.pow(y - predicted, 2);
  }, 0);
  const ssTot = points.reduce((sum, [, y]) => sum + Math.pow(y - meanY, 2), 0);

  return ssTot === 0 ? 0 : 1 - ssRes / ssTot;
}

// Detect declining trend (for business stress indicators)
export function detectDecline(
  dailyPower: number[],
  windowDays = 30
): { isDeclining: boolean; slope: number; rSquared: number } {
  if (dailyPower.length < 2) {
    return { isDeclining: false, slope: 0, rSquared: 0 };
  }

  const windowData = dailyPower.slice(-windowDays);
  const points = windowData.map((v, i) => [i, v] as [number, number]);
  const regression = linearRegression(points);
  const rSquared = calculateRSquared(points, regression);

  // Significant downward trend with good fit
  const isDeclining = regression.m < -0.02 && rSquared > 0.7;

  return { isDeclining, slope: regression.m, rSquared };
}

// Predict capacity exhaustion based on usage trend
export function predictCapacityExhaustion(
  usage: number[],
  capacity: number
): Date | null {
  if (usage.length < 2) return null;

  const points = usage.map((v, i) => [i, v] as [number, number]);
  const trend = linearRegression(points);

  if (trend.m <= 0) return null; // Not growing

  const currentUsage = usage[usage.length - 1];
  const daysToCapacity = (capacity - currentUsage) / trend.m;

  if (daysToCapacity <= 0 || !isFinite(daysToCapacity)) return null;

  return new Date(Date.now() + daysToCapacity * 86400000);
}

// Detect diurnal pattern (day/night cycle)
export function detectDiurnalPattern(data: number[]): boolean {
  if (data.length < 48) return false; // Need at least 2 days of hourly data

  const period = detectSeasonalPeriod(data, 48);
  // Diurnal patterns typically show strong 24-hour periodicity
  return period >= 22 && period <= 26;
}

// Classify workload type based on power consumption patterns
export type WorkloadType = 'ai_training' | 'ai_inference' | 'traditional';

export function classifyWorkload(powerSeries: number[]): WorkloadType {
  if (powerSeries.length === 0) return 'traditional';

  const mean = powerSeries.reduce((a, b) => a + b, 0) / powerSeries.length;
  if (mean === 0) return 'traditional';

  const variance = powerSeries.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / powerSeries.length;
  const std = Math.sqrt(variance);
  const burstiness = std / mean; // Coefficient of variation

  const autocorr = calculateAutocorrelation(powerSeries, 1);

  // AI training: low variance, high autocorrelation (steady state)
  if (burstiness < 0.15 && autocorr > 0.8) return 'ai_training';

  // AI inference: high variance, diurnal pattern (bursty, follows business hours)
  if (burstiness > 0.4 && detectDiurnalPattern(powerSeries)) return 'ai_inference';

  return 'traditional';
}

