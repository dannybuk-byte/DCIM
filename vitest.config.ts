import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    // Enable globals for cleaner test syntax
    globals: true,
    
    // Use jsdom for React component testing
    environment: 'jsdom',
    
    // Setup files for test environment
    setupFiles: ['./src/test/setup.ts'],
    
    // Include patterns
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    
    // Exclude patterns
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{git,cache,output,temp}/**',
    ],
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/test/**',
        'src/**/*.d.ts',
        'src/**/*.test.{ts,tsx}',
        'src/**/*.spec.{ts,tsx}',
        'src/vite-env.d.ts',
      ],
    },
    
    // Watch mode settings
    watch: true,
    watchExclude: ['**/node_modules/**', '**/dist/**'],
    
    // Timeout for async tests (ms)
    testTimeout: 10000,
    
    // Reporter
    reporters: ['default'],
    
    // Thread settings
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true, // Better for DOM testing
      },
    },
  },
});

