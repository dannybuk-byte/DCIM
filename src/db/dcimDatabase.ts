import Dexie, { Table } from 'dexie';

export interface MetricReading {
  id?: number;
  deviceId: string;
  metricType: string; // 'power', 'temperature', 'humidity', 'network_traffic', etc.
  timestamp: number;
  value: number;
  anomalyScore?: number;
  source?: string; // API source identifier
}

export interface HourlyRollup {
  id?: number;
  deviceId: string;
  metricType: string;
  hourTimestamp: number; // Unix timestamp for start of hour
  min: number;
  max: number;
  avg: number;
  count: number;
}

export interface PatternCache {
  key: string;
  deviceId: string;
  patternType: string; // 'anomaly', 'forecast', 'trend', etc.
  data: any;
  expiresAt: number;
  createdAt: number;
}

// Extended database for DCIM metrics
class DCIMDatabase extends Dexie {
  metrics!: Table<MetricReading, number>;
  hourlyRollups!: Table<HourlyRollup, number>;
  patternCache!: Table<PatternCache, string>;

  constructor() {
    super('DCIMDatabase');
    this.version(1).stores({
      // Compound indexes for efficient time-range queries
      metrics: '++id, [deviceId+metricType+timestamp], [deviceId+timestamp], [metricType+timestamp], timestamp',
      hourlyRollups: '++id, [deviceId+metricType+hourTimestamp], [deviceId+hourTimestamp]',
      patternCache: 'key, expiresAt, [deviceId+patternType]'
    });
  }

  // Memory-efficient iteration for large datasets
  async* iterateMetrics(
    deviceId: string,
    start: number,
    end: number,
    metricType?: string,
    batchSize = 500
  ): AsyncGenerator<MetricReading[]> {
    let offset = 0;
    while (true) {
      const query = metricType
        ? this.metrics
            .where('[deviceId+metricType+timestamp]')
            .between([deviceId, metricType, start], [deviceId, metricType, end])
        : this.metrics
            .where('[deviceId+timestamp]')
            .between([deviceId, start], [deviceId, end]);

      const batch = await query.offset(offset).limit(batchSize).toArray();
      if (batch.length === 0) break;
      yield batch;
      offset += batchSize;
    }
  }

  // Get metrics in a time range
  async getMetrics(
    deviceId: string,
    start: number,
    end: number,
    metricType?: string
  ): Promise<MetricReading[]> {
    if (metricType) {
      return await this.metrics
        .where('[deviceId+metricType+timestamp]')
        .between([deviceId, metricType, start], [deviceId, metricType, end])
        .sortBy('timestamp');
    }
    return await this.metrics
      .where('[deviceId+timestamp]')
      .between([deviceId, start], [deviceId, end])
      .sortBy('timestamp');
  }

  // Compute hourly rollup
  async computeHourlyRollup(
    deviceId: string,
    metricType: string,
    hourTimestamp: number
  ): Promise<HourlyRollup | null> {
    const start = hourTimestamp;
    const end = hourTimestamp + 3600000; // 1 hour

    const metrics = await this.getMetrics(deviceId, start, end, metricType);
    if (metrics.length === 0) return null;

    const values = metrics.map(m => m.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;

    return {
      deviceId,
      metricType,
      hourTimestamp,
      min,
      max,
      avg,
      count: metrics.length
    };
  }

  // Save or update hourly rollup
  async saveHourlyRollup(rollup: HourlyRollup): Promise<number> {
    const existing = await this.hourlyRollups
      .where('[deviceId+metricType+hourTimestamp]')
      .equals([rollup.deviceId, rollup.metricType, rollup.hourTimestamp])
      .first();

    if (existing) {
      return await this.hourlyRollups.update(existing.id!, rollup);
    }
    return await this.hourlyRollups.add(rollup);
  }

  // Get cached pattern
  async getCachedPattern(
    deviceId: string,
    patternType: string
  ): Promise<PatternCache | null> {
    const key = `${deviceId}:${patternType}`;
    const cached = await this.patternCache.get(key);
    if (!cached) return null;

    // Check if expired
    if (cached.expiresAt < Date.now()) {
      await this.patternCache.delete(key);
      return null;
    }

    return cached;
  }

  // Cache pattern result
  async cachePattern(
    deviceId: string,
    patternType: string,
    data: any,
    ttlMs = 3600000 // 1 hour default
  ): Promise<void> {
    const key = `${deviceId}:${patternType}`;
    await this.patternCache.put({
      key,
      deviceId,
      patternType,
      data,
      expiresAt: Date.now() + ttlMs,
      createdAt: Date.now()
    });
  }
}

export const dcimDb = new DCIMDatabase();

