import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react()
  ],
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/signals-api': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/signals-api/, ''),
      },
    },
  },
  optimizeDeps: {
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
