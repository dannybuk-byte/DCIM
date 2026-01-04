/**
 * DCIM Data Source Integrations
 * Handles real-time data collection from various APIs
 */

import { dcimDb, MetricReading } from '../db/dcimDatabase';

// RIPE RIS Live BGP WebSocket
export class RIPERISLiveClient {
  private ws: WebSocket | null = null;
  private deviceId: string;
  private reconnectDelay = 5000;

  constructor(deviceId: string) {
    this.deviceId = deviceId;
  }

  connect(onUpdate?: (update: any) => void): void {
    try {
      this.ws = new WebSocket('wss://ris-live.ripe.net/v1/ws/?client=dcim-app');

      this.ws.onopen = () => {
        console.log('RIPE RIS Live connected');
        // Subscribe to BGP updates
        this.ws?.send(JSON.stringify({
          type: 'ris_subscribe',
          data: {
            moreSpecific: true,
            host: 'rrc21' // Can be configured
          }
        }));
      };

      this.ws.onmessage = async (event) => {
        try {
          const bgpUpdate = JSON.parse(event.data);
          
          if (onUpdate) {
            onUpdate(bgpUpdate);
          }

          // Store as network_traffic metric
          if (bgpUpdate.type === 'update' && bgpUpdate.data) {
            await this.storeBGPUpdate(bgpUpdate);
          }
        } catch (error) {
          console.error('Error processing RIPE RIS message:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('RIPE RIS WebSocket error:', error);
      };

      this.ws.onclose = () => {
        console.log('RIPE RIS Live disconnected, reconnecting...');
        setTimeout(() => this.connect(onUpdate), this.reconnectDelay);
      };
    } catch (error) {
      console.error('Failed to connect to RIPE RIS Live:', error);
    }
  }

  private async storeBGPUpdate(bgpUpdate: any): Promise<void> {
    // Extract relevant metrics from BGP update
    // This is a simplified example - real implementation would parse BGP paths
    const metric: MetricReading = {
      deviceId: this.deviceId,
      metricType: 'network_traffic',
      timestamp: Date.now(),
      value: bgpUpdate.data?.path?.length || 0, // AS path length as proxy metric
      source: 'ripe_ris_live'
    };

    await dcimDb.metrics.add(metric);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

// Open-Meteo weather API client (no authentication required)
export class OpenMeteoClient {
  private baseUrl = 'https://api.open-meteo.com/v1/forecast';

  async fetchWeatherMetrics(latitude: number, longitude: number): Promise<{
    temperature: number;
    humidity: number;
    timestamp: number;
  }> {
    try {
      const url = `${this.baseUrl}?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m&hourly=temperature_2m`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        temperature: data.current?.temperature_2m || 0,
        humidity: data.current?.relative_humidity_2m || 0,
        timestamp: Date.now()
      };
    } catch (error) {
      console.error('Error fetching Open-Meteo data:', error);
      throw error;
    }
  }

  async storeWeatherMetrics(
    deviceId: string,
    latitude: number,
    longitude: number
  ): Promise<void> {
    try {
      const weather = await this.fetchWeatherMetrics(latitude, longitude);

      // Store temperature
      await dcimDb.metrics.add({
        deviceId,
        metricType: 'temperature',
        timestamp: weather.timestamp,
        value: weather.temperature,
        source: 'open_meteo'
      });

      // Store humidity
      await dcimDb.metrics.add({
        deviceId,
        metricType: 'humidity',
        timestamp: weather.timestamp,
        value: weather.humidity,
        source: 'open_meteo'
      });
    } catch (error) {
      console.error('Error storing weather metrics:', error);
    }
  }
}

// Generic metric collector for manual/API-based data
export class MetricCollector {
  /**
   * Store a single metric reading
   */
  async storeMetric(
    deviceId: string,
    metricType: string,
    value: number,
    timestamp?: number,
    source?: string,
    anomalyScore?: number
  ): Promise<number> {
    return await dcimDb.metrics.add({
      deviceId,
      metricType,
      timestamp: timestamp || Date.now(),
      value,
      source,
      anomalyScore
    });
  }

  /**
   * Store multiple metrics in batch
   */
  async storeMetricsBatch(metrics: MetricReading[]): Promise<number> {
    return await dcimDb.metrics.bulkAdd(metrics);
  }

  /**
   * Get latest metric value for a device/metric
   */
  async getLatestMetric(
    deviceId: string,
    metricType: string
  ): Promise<MetricReading | undefined> {
    const metrics = await dcimDb.getMetrics(
      deviceId,
      Date.now() - 86400000, // Last 24 hours
      Date.now(),
      metricType
    );
    
    return metrics.length > 0 ? metrics[metrics.length - 1] : undefined;
  }
}

export const metricCollector = new MetricCollector();

