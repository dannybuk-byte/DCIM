/**
 * DCIM Analytics Tab
 * Provides visualization and analysis of infrastructure metrics
 */

import { useState, useEffect, useMemo, memo } from 'react';
import { dcimAnalyzer, AnalysisResult } from '../../utils/dcimAnalyzer';
import { Tooltip } from '../shared/Tooltip';
import { NestedTabs } from '../shared/NestedTabs';
import { Activity, AlertTriangle, TrendingUp, TrendingDown, BarChart3, Info } from 'lucide-react';

// Dynamic import for ECharts (reduces bundle size)
let ReactECharts: any = null;
let echartsLoadError: Error | null = null;

async function loadECharts() {
  if (echartsLoadError) {
    throw echartsLoadError;
  }
  if (!ReactECharts) {
    try {
      // Use dynamic import with explicit error handling
      // @ts-ignore - Optional dependency, may not be installed
      const module = await import('echarts-for-react');
      ReactECharts = module.default;
    } catch (error) {
      echartsLoadError = error as Error;
      console.warn('echarts-for-react not installed. Charts will be disabled.');
      throw error;
    }
  }
  return ReactECharts;
}

interface DCIMAnalyticsTabProps {
  facilities?: any[]; // Facility list for device selection
}

const DCIMAnalyticsTab = memo(function DCIMAnalyticsTab({ facilities = [] }: DCIMAnalyticsTabProps) {
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('power');
  const [analysisHours, setAnalysisHours] = useState<number>(168); // 1 week
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [echartsReady, setEchartsReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load ECharts on mount
  useEffect(() => {
    loadECharts()
      .then(() => setEchartsReady(true))
      .catch((err) => {
        console.warn('ECharts not available. Please install: npm install echarts echarts-for-react', err);
        setError('Chart library not available. Please install: npm install echarts echarts-for-react');
      });
  }, []);

  // Device options from facilities
  const deviceOptions = useMemo(() => {
    return facilities.length > 0
      ? facilities.map(f => ({ value: `facility-${f.id}`, label: f.name }))
      : [{ value: 'device-1', label: 'Device 1 (Demo)' }];
  }, [facilities]);

  // Run analysis
  const runAnalysis = async () => {
    if (!selectedDevice) {
      setError('Please select a device');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await dcimAnalyzer.analyzePatterns(
        selectedDevice,
        selectedMetric,
        analysisHours
      );
      setAnalysisResult(result);
    } catch (err: any) {
      setError(err.message || 'Analysis failed');
      console.error('Analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Generate ECharts options for time series visualization
  const getTimeSeriesChartOption = (): any => {
    if (!analysisResult) return null;

    // Prepare data from metrics (simplified - in real app, load actual metrics)
    const timeData: number[] = [];
    const valueData: number[] = [];
    const anomalyData: Array<[number, number]> = [];
    const forecastData: number[] = [];

    // Mock data structure - in real implementation, load from db
    const baseTime = Date.now() - analysisHours * 3600000;
    for (let i = 0; i < analysisHours; i++) {
      const timestamp = baseTime + i * 3600000;
      timeData.push(timestamp);
      
      // Mock values (would come from actual metrics)
      const baseValue = 100 + Math.sin(i / 24) * 20 + Math.random() * 10;
      valueData.push(baseValue);

      // Check if anomaly
      const anomaly = analysisResult.anomalies[i];
      if (anomaly?.isAnomaly) {
        anomalyData.push([timestamp, anomaly.value]);
      }
    }

        // Add forecast if available
        if (analysisResult.forecast) {
          const forecastStart = timeData[timeData.length - 1] + 3600000;
          analysisResult.forecast.values.forEach((_, i) => {
            forecastData.push(forecastStart + i * 3600000);
          });
        }

    return {
      dataZoom: [{ type: 'inside', xAxisIndex: [0, 1] }],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['Power', 'Anomalies', 'Forecast']
      },
      xAxis: {
        type: 'time',
        boundaryGap: false
      },
      yAxis: {
        type: 'value',
        name: 'Power (kW)'
      },
      series: [
        {
          name: 'Power',
          type: 'line',
          sampling: 'lttb', // Largest-Triangle-Three-Buckets downsampling
          progressive: 2000, // Render 2000 points per frame
          data: timeData.map((t, i) => [t, valueData[i]]),
          smooth: true,
          lineStyle: { width: 1.5 }
        },
        {
          name: 'Anomalies',
          type: 'scatter',
          data: anomalyData,
          symbolSize: 12,
          itemStyle: { color: '#ff4444' },
          markPoint: {
            data: anomalyData.map(([time, value]) => ({
              coord: [time, value],
              symbol: 'pin',
              symbolSize: 30
            }))
          }
        },
        ...(analysisResult.forecast ? [{
          name: 'Forecast',
          type: 'line',
          data: forecastData.map((t, i) => [t, analysisResult.forecast!.values[i]]),
          lineStyle: { type: 'dashed', color: '#888' },
          itemStyle: { opacity: 0.7 }
        }] : [])
      ]
    };
  };

  // Generate heatmap for temporal patterns
  const getTemporalHeatmapOption = (): any => {
    if (!analysisResult) return null;

    // Generate hourly pattern matrix (hour of day * day of week)
    const hours = Array.from({ length: 24 }, (_, i) => `${i.toString().padStart(2, '0')}:00`);
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const heatmapData: Array<[number, number, number]> = [];

    // Mock pattern data (would come from actual seasonal analysis)
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        const baseValue = 100;
        const dayCycle = Math.sin((hour / 24) * Math.PI * 2) * 20;
        const weekCycle = day === 0 || day === 6 ? -10 : 0; // Weekend effect
        heatmapData.push([day, hour, baseValue + dayCycle + weekCycle + Math.random() * 5]);
      }
    }

    return {
      tooltip: {
        position: 'top',
        formatter: (params: any) => {
          return `${days[params.data[0]]} ${hours[params.data[1]]}<br/>${params.data[2].toFixed(1)} kW`;
        }
      },
      grid: { height: '50%', top: '10%' },
      xAxis: {
        type: 'category',
        data: days,
        splitArea: { show: true }
      },
      yAxis: {
        type: 'category',
        data: hours,
        splitArea: { show: true }
      },
      visualMap: {
        min: 0,
        max: Math.max(...heatmapData.map(d => d[2])),
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        bottom: '15%'
      },
      series: [{
        name: 'Power Pattern',
        type: 'heatmap',
        data: heatmapData,
        label: { show: false },
        emphasis: {
          itemStyle: { shadowBlur: 10, shadowColor: 'rgba(0, 0, 0, 0.5)' }
        }
      }]
    };
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold">DCIM Pattern Analytics</h2>
        <Tooltip content="Analyze infrastructure metrics using ML and statistical techniques to detect anomalies, forecast trends, and classify workload patterns.">
          <Info className="w-5 h-5 text-gray-400" />
        </Tooltip>
      </div>

      {/* Controls */}
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Device</label>
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="">Select device...</option>
              {deviceOptions.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Metric Type</label>
            <select
              value={selectedMetric}
              onChange={(e) => setSelectedMetric(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
            >
              <option value="power">Power</option>
              <option value="temperature">Temperature</option>
              <option value="humidity">Humidity</option>
              <option value="network_traffic">Network Traffic</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-400 mb-1">Time Window (hours)</label>
            <input
              type="number"
              value={analysisHours}
              onChange={(e) => setAnalysisHours(parseInt(e.target.value) || 168)}
              min={24}
              max={720}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2 text-sm"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={runAnalysis}
              disabled={loading || !selectedDevice}
              className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded text-sm font-medium"
            >
              {loading ? 'Analyzing...' : 'Run Analysis'}
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {analysisResult && (
        <NestedTabs
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              icon: <BarChart3 className="w-4 h-4" />,
              content: (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">Workload Type</div>
                      <div className="text-lg font-semibold capitalize">{analysisResult.workloadType.replace('_', ' ')}</div>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">Anomalies Detected</div>
                      <div className="text-lg font-semibold text-red-400">
                        {analysisResult.anomalies.filter(a => a.isAnomaly).length}
                      </div>
                    </div>
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">Trend</div>
                      <div className={`text-lg font-semibold flex items-center gap-2 ${
                        analysisResult.trend.m > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {analysisResult.trend.m > 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                        {analysisResult.trend.m > 0 ? 'Increasing' : 'Decreasing'}
                      </div>
                    </div>
                  </div>

                  {analysisResult.decline && analysisResult.decline.isDeclining && (
                    <div className="bg-yellow-900/50 border border-yellow-700 rounded-lg p-3 text-sm">
                      <AlertTriangle className="w-4 h-4 text-yellow-400 inline mr-2" />
                      Declining trend detected (slope: {analysisResult.decline.slope.toFixed(4)}, R²: {analysisResult.decline.rSquared.toFixed(2)})
                    </div>
                  )}
                </div>
              )
            },
            {
              id: 'timeSeries',
              label: 'Time Series',
              icon: <Activity className="w-4 h-4" />,
              content: echartsReady ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4" style={{ height: '500px' }}>
                  {ReactECharts && (
                    <ReactECharts
                      option={getTimeSeriesChartOption()}
                      style={{ height: '100%', width: '100%' }}
                      opts={{ renderer: 'canvas' }}
                    />
                  )}
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 h-96 flex items-center justify-center text-gray-400">
                  Loading chart library...
                </div>
              )
            },
            {
              id: 'patterns',
              label: 'Temporal Patterns',
              icon: <BarChart3 className="w-4 h-4" />,
              content: echartsReady && ReactECharts ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4" style={{ height: '500px' }}>
                  <ReactECharts
                    option={getTemporalHeatmapOption()}
                    style={{ height: '100%', width: '100%' }}
                    opts={{ renderer: 'canvas' }}
                  />
                </div>
              ) : error ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 h-96 flex items-center justify-center">
                  <div className="text-center text-gray-400">
                    <div className="text-sm mb-2">Chart library not available</div>
                    <div className="text-xs">Please run: npm install echarts echarts-for-react</div>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 h-96 flex items-center justify-center text-gray-400">
                  Loading chart library...
                </div>
              )
            }
          ]}
        />
      )}

      {!analysisResult && !loading && (
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center text-gray-400">
          Select a device and metric type, then click "Run Analysis" to begin pattern analysis.
        </div>
      )}
    </div>
  );
});

export default DCIMAnalyticsTab;

