import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
VitePWA({
      workbox: {
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024
      },
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg'],
      manifest: {
        name: 'DCIM Global Infrastructure Command Center',
        short_name: 'DCIM Command',
        description: 'Global Infrastructure Command Center tracking 11,992 data center facilities for subsidy compliance accountability',
        theme_color: '#0a0e17',
        background_color: '#0a0e17',
        display: 'standalone',
        orientation: 'landscape',
        start_url: '/',
        scope: '/',
        icons: [
          {
            src: 'pwa-192x192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ],
        categories: ['business', 'productivity', 'utilities'],
        shortcuts: [
          {
            name: 'Overview',
            short_name: 'Overview',
            description: 'View compliance overview',
            url: '/?tab=overview',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Map View',
            short_name: 'Map',
            description: 'View facility map',
            url: '/?tab=connectography',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          },
          {
            name: 'Pattern Lab',
            short_name: 'Patterns',
            description: 'Advanced pattern analysis',
            url: '/?tab=patternlab',
            icons: [{ src: 'pwa-192x192.png', sizes: '192x192' }]
          }
        ]
      },
      workbox: {
        // Cache strategies for different resource types
        runtimeCaching: [
          {
            // Government APIs - network first with cache fallback
            urlPattern: /^https:\/\/(echo\.epa\.gov|data\.sec\.gov|api\.usaspending\.gov)/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'gov-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 hours
              },
              cacheableResponse: {
                statuses: [0, 200]
              },
              networkTimeoutSeconds: 10
            }
          },
          {
            // Map tiles - cache first (tiles rarely change)
            urlPattern: /^https:\/\/(server\.arcgisonline\.com|api\.maptiler\.com)/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'map-tiles-cache',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // BGP/Network data - network only (real-time)
            urlPattern: /^wss:\/\/ris-live\.ripe\.net/,
            handler: 'NetworkOnly'
          },
          {
            // Static assets - cache first
            urlPattern: /\.(js|css|woff2?|png|jpg|svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          },
          {
            // API responses - stale while revalidate
            urlPattern: /^https:\/\/.*\/api\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        // Pre-cache critical assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        // Skip waiting for immediate activation
        skipWaiting: true,
        clientsClaim: true,
        // Navigation fallback for SPA
        navigateFallback: 'index.html',
        navigateFallbackDenylist: [/^\/api\//]
      },
      devOptions: {
        enabled: false // Disable in dev for faster rebuilds
      }
    })
  ],
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
    // Optimize chunk splitting for better caching
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
