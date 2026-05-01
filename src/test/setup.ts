/**
 * Vitest Test Setup
 * Global configuration for all tests
 */

import '@testing-library/jest-dom';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

// Cleanup after each test (DOM suites only)
afterEach(() => {
  if (typeof document !== 'undefined') {
    cleanup();
  }
});

if (typeof window !== 'undefined') {
  // Mock window.matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Mock ResizeObserver
  class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.ResizeObserver = ResizeObserver;

  // Mock IntersectionObserver
  class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  window.IntersectionObserver = IntersectionObserver as any;

  // Mock IndexedDB for Dexie
  const indexedDB = {
    open: vi.fn(),
    deleteDatabase: vi.fn(),
  };
  Object.defineProperty(window, 'indexedDB', {
    value: indexedDB,
  });

  // Mock requestAnimationFrame
  window.requestAnimationFrame = vi.fn((callback) => {
    return setTimeout(callback, 16);
  });
  window.cancelAnimationFrame = vi.fn((id) => {
    clearTimeout(id);
  });

  // Mock WebSocket for BGP tests
  class MockWebSocket {
    onopen: (() => void) | null = null;
    onmessage: ((e: any) => void) | null = null;
    onerror: ((e: any) => void) | null = null;
    onclose: (() => void) | null = null;

    close() {}
    send() {}
  }

  window.WebSocket = MockWebSocket as any;
}

// Mock console.error to catch React errors
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out React dev warnings in tests
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') || args[0].includes('React does not recognize'))
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Mock fetch for API tests
global.fetch = vi.fn();

