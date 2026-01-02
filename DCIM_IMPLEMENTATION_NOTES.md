# DCIM Pattern Inference Implementation Notes

## Installation Required

Before running the application, you need to install the following dependencies:

```bash
npm install @tensorflow/tfjs simple-statistics arima slayer isolation-forest echarts echarts-for-react
```

**Note**: Some of these packages are quite large:
- `@tensorflow/tfjs`: ~1.7MB (can be tree-shaken to ~500KB for time-series workloads)
- `echarts` + `echarts-for-react`: ~600KB
- `arima`: ~200KB
- `isolation-forest`: ~15KB
- `slayer`: ~8KB
- `simple-statistics`: ~30KB

Total: ~3MB (uncompressed), but will be significantly smaller when bundled and minified.

## TypeScript Errors Expected Until Packages Are Installed

The code includes dynamic imports for these packages, so TypeScript will complain about missing modules until they are installed. This is expected and will resolve once you run `npm install` with the packages listed above.

## Key Features Implemented

1. **Database Schema** (`src/db/dcimDatabase.ts`)
   - Metrics table with compound indexes for efficient time-range queries
   - Hourly rollups for performance optimization
   - Pattern cache for analysis results

2. **Time-Series Analysis** (`src/utils/timeSeriesAnalysis.ts`)
   - Statistical anomaly detection (z-score)
   - Seasonal decomposition (trend, seasonal, residual)
   - Workload classification (AI training, AI inference, traditional)
   - Trend analysis and decline detection
   - Capacity exhaustion prediction

3. **DCIM Analyzer** (`src/utils/dcimAnalyzer.ts`)
   - Multi-layer anomaly detection (statistical + Isolation Forest)
   - ARIMA forecasting (optional, can be slow)
   - Spike detection using slayer
   - Pattern caching for performance

4. **Data Sources** (`src/services/dcimDataSources.ts`)
   - RIPE RIS Live WebSocket client for BGP monitoring
   - Open-Meteo API client for weather data
   - Generic metric collector for manual/API-based data

5. **Visualization** (`src/components/tabs/DCIMAnalyticsTab.tsx`)
   - Time-series charts with anomaly highlighting
   - Temporal heatmaps (hour-of-day × day-of-week)
   - Forecast visualization
   - Apache ECharts integration with LTTB downsampling

## Usage

1. **Install dependencies** (see above)

2. **Access the DCIM Analytics tab** from the Command Center navigation

3. **Select a device and metric type**, then click "Run Analysis"

4. **View results** in the Overview, Time Series, and Temporal Patterns tabs

## Data Collection

To actually collect data, you would need to:

1. **Set up data collectors** that call `metricCollector.storeMetric()` periodically
2. **Connect to RIPE RIS Live** using `RIPERISLiveClient` for network monitoring
3. **Fetch weather data** using `OpenMeteoClient` for temperature/humidity metrics
4. **Integrate with facility APIs** (requires proxy for CORS) for power consumption data

## Performance Considerations

- **Lazy loading**: Heavy ML libraries are loaded only when needed
- **Caching**: Analysis results are cached for 1 hour
- **Batch processing**: Database queries use batching for large datasets
- **Progressive rendering**: ECharts uses progressive rendering for millions of data points
- **LTTB downsampling**: Charts automatically downsample for better performance

## Limitations

- **ARIMA forecasting** can be slow for large datasets - consider making it optional
- **TensorFlow.js** is large - only load if you need LSTM autoencoders
- **Some APIs require CORS proxy** - see the implementation guide for details
- **Browser memory limits** - be careful with very large time-series datasets (>1M points)

## Future Enhancements

- Real-time streaming analysis
- LSTM autoencoder integration for advanced anomaly detection
- More data source integrations (EIA, WattTime, etc.)
- Alert system for detected anomalies
- Export functionality for analysis results

