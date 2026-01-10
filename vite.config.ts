import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA support - antifragile offline-first capability
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      workbox: {
        // Cache core app shell
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
        // Allow large chunks (analysis/AI libraries are heavy)
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
        // Runtime caching strategies
        runtimeCaching: [
          {
            // API calls - network first with cache fallback
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dcim-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Government APIs (USASpending, SEC, EPA)
            urlPattern: /^https:\/\/(api\.usaspending\.gov|api\.sec\.gov|echo\.epa\.gov)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'dcim-gov-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 12 // 12 hours
              }
            }
          },
          {
            // Map tiles - cache heavily
            urlPattern: /^https:\/\/.*\.tile\./,
            handler: 'CacheFirst',
            options: {
              cacheName: 'dcim-map-tiles',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          {
            // Satellite imagery (Planetary Computer)
            urlPattern: /^https:\/\/planetarycomputer\.microsoft\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'dcim-satellite-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ],
        // Don't cache these
        navigateFallbackDenylist: [/^\/api/],
      },
      manifest: {
        name: 'DCIM Infrastructure Accountability Dashboard',
        short_name: 'DCIM Dashboard',
        description: 'Labor-focused infrastructure accountability tool for tracking data center compliance',
        theme_color: '#0a0e17',
        background_color: '#0a0e17',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        categories: ['business', 'productivity', 'utilities'],
      },
      devOptions: {
        // Enable in dev for testing, but won't cache
        enabled: false
      }
    })
  ],
  server: {
    // Cursor's embedded browser can fail to load when Vite only binds to IPv6 (::1).
    // Binding to IPv4 ensures `http://127.0.0.1:5173` and `http://localhost:5173` both work.
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
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
