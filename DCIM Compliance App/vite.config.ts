import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  optimizeDeps: {a
    include: [
      'echarts-for-react',
      '@tensorflow/tfjs',
      'arima',
      'slayer',
      'isolation-forest',
      '@deck.gl/core',
      '@deck.gl/layers',
      '@deck.gl/react',
      '@deck.gl/aggregation-layers'
    ]
  },
  build: {
    commonjsOptions: {
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-map': ['maplibre-gl', '@deck.gl/core', '@deck.gl/layers', '@deck.gl/aggregation-layers'],
          'vendor-charts': ['echarts', 'echarts-for-react'],
          'vendor-analysis': ['@tensorflow/tfjs', 'arima', 'isolation-forest']
        }
      }
    }
  },
  logLevel: 'warn'
});
