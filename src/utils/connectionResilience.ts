/**
 * Connection Resilience - Graceful Degradation
 * 
 * Handles network failures gracefully:
 * 1. Detects online/offline status
 * 2. Queues failed requests for retry
 * 3. Provides cached data when offline
 * 4. Notifies user of connection issues
 * 
 * ANTIFRAGILE: App continues working when network fails
 */

import { logSystem, logError } from './actionHistory';

// ============================================================================
// TYPES
// ============================================================================

export type ConnectionStatus = 'online' | 'offline' | 'slow' | 'unstable';

export interface ConnectionState {
  status: ConnectionStatus;
  lastOnline: number;
  lastOffline: number | null;
  failedRequests: number;
  successfulRequests: number;
  avgLatency: number;
  listeners: Set<(state: ConnectionState) => void>;
}

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: unknown;
  timestamp: number;
  retries: number;
  maxRetries: number;
  onSuccess?: (response: unknown) => void;
  onFailure?: (error: Error) => void;
}

// ============================================================================
// STATE
// ============================================================================

const state: ConnectionState = {
  status: navigator.onLine ? 'online' : 'offline',
  lastOnline: Date.now(),
  lastOffline: null,
  failedRequests: 0,
  successfulRequests: 0,
  avgLatency: 0,
  listeners: new Set(),
};

const requestQueue: QueuedRequest[] = [];
const latencyHistory: number[] = [];
const MAX_LATENCY_HISTORY = 20;
const SLOW_THRESHOLD_MS = 3000;
const UNSTABLE_FAILURE_THRESHOLD = 3;

// ============================================================================
// CONNECTION MONITORING
// ============================================================================

/**
 * Initialize connection monitoring
 */
export function initConnectionMonitoring(): void {
  // Listen for browser online/offline events
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // Start periodic connectivity check
  setInterval(checkConnectivity, 30000); // Every 30 seconds

  logSystem('Connection monitoring initialized', { status: state.status });
}

/**
 * Handle coming online
 */
function handleOnline(): void {
  const wasOffline = state.status === 'offline';
  state.status = 'online';
  state.lastOnline = Date.now();
  
  if (wasOffline) {
    logSystem('Connection restored');
    notifyListeners();
    
    // Process queued requests
    processQueue();
  }
}

/**
 * Handle going offline
 */
function handleOffline(): void {
  state.status = 'offline';
  state.lastOffline = Date.now();
  
  logSystem('Connection lost');
  notifyListeners();
}

/**
 * Check actual connectivity (not just browser online status)
 */
async function checkConnectivity(): Promise<void> {
  if (!navigator.onLine) {
    if (state.status !== 'offline') {
      handleOffline();
    }
    return;
  }

  const start = Date.now();
  
  try {
    // Try to fetch a small resource
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    await fetch('/favicon.svg', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    });
    
    clearTimeout(timeout);
    
    const latency = Date.now() - start;
    recordLatency(latency);
    
    // Update status based on latency
    if (latency > SLOW_THRESHOLD_MS) {
      state.status = 'slow';
    } else if (state.failedRequests >= UNSTABLE_FAILURE_THRESHOLD) {
      state.status = 'unstable';
    } else {
      state.status = 'online';
    }
    
    state.successfulRequests++;
    state.failedRequests = Math.max(0, state.failedRequests - 1);
    
  } catch {
    state.failedRequests++;
    
    if (state.failedRequests >= UNSTABLE_FAILURE_THRESHOLD) {
      state.status = 'unstable';
    }
  }
  
  notifyListeners();
}

/**
 * Record latency measurement
 */
function recordLatency(ms: number): void {
  latencyHistory.push(ms);
  if (latencyHistory.length > MAX_LATENCY_HISTORY) {
    latencyHistory.shift();
  }
  state.avgLatency = Math.round(
    latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length
  );
}

// ============================================================================
// REQUEST QUEUE
// ============================================================================

/**
 * Queue a request for retry when offline
 */
export function queueRequest(request: Omit<QueuedRequest, 'id' | 'timestamp' | 'retries'>): string {
  const id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  requestQueue.push({
    ...request,
    id,
    timestamp: Date.now(),
    retries: 0,
  });
  
  logSystem('Request queued for retry', { url: request.url, method: request.method });
  
  return id;
}

/**
 * Process queued requests
 */
async function processQueue(): Promise<void> {
  if (state.status === 'offline' || requestQueue.length === 0) {
    return;
  }

  logSystem('Processing request queue', { count: requestQueue.length });
  
  const toProcess = [...requestQueue];
  requestQueue.length = 0;
  
  for (const request of toProcess) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        body: request.body ? JSON.stringify(request.body) : undefined,
        headers: request.body ? { 'Content-Type': 'application/json' } : undefined,
      });
      
      if (response.ok) {
        const data = await response.json();
        request.onSuccess?.(data);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
      
    } catch (error) {
      request.retries++;
      
      if (request.retries < request.maxRetries) {
        // Re-queue for later
        requestQueue.push(request);
      } else {
        // Give up
        request.onFailure?.(error instanceof Error ? error : new Error('Request failed'));
        logError(`Request permanently failed: ${request.url}`);
      }
    }
  }
}

/**
 * Get queue status
 */
export function getQueueStatus(): { pending: number; oldest: number | null } {
  return {
    pending: requestQueue.length,
    oldest: requestQueue.length > 0 ? requestQueue[0].timestamp : null,
  };
}

/**
 * Clear the request queue
 */
export function clearQueue(): void {
  const count = requestQueue.length;
  requestQueue.length = 0;
  logSystem('Request queue cleared', { count });
}

// ============================================================================
// SUBSCRIPTION
// ============================================================================

/**
 * Subscribe to connection state changes
 */
export function subscribeToConnection(listener: (state: ConnectionState) => void): () => void {
  state.listeners.add(listener);
  
  // Immediately call with current state
  listener(state);
  
  // Return unsubscribe function
  return () => {
    state.listeners.delete(listener);
  };
}

/**
 * Notify all listeners of state change
 */
function notifyListeners(): void {
  state.listeners.forEach(listener => {
    try {
      listener(state);
    } catch (error) {
      console.warn('[ConnectionResilience] Listener error:', error);
    }
  });
}

// ============================================================================
// GETTERS
// ============================================================================

/**
 * Get current connection state
 */
export function getConnectionState(): Readonly<Omit<ConnectionState, 'listeners'>> {
  const { listeners: _listeners, ...rest } = state;
  return rest;
}

/**
 * Check if currently online
 */
export function isOnline(): boolean {
  return state.status === 'online' || state.status === 'slow';
}

/**
 * Check if connection is degraded
 */
export function isDegraded(): boolean {
  return state.status === 'slow' || state.status === 'unstable';
}

/**
 * Get time since last online
 */
export function getOfflineDuration(): number | null {
  if (state.status !== 'offline') return null;
  return Date.now() - (state.lastOffline || Date.now());
}

// ============================================================================
// RESILIENT FETCH
// ============================================================================

interface ResilientFetchOptions extends RequestInit {
  queueOnFail?: boolean;
  maxRetries?: number;
  timeout?: number;
}

/**
 * Fetch with automatic retry and offline queueing
 */
export async function resilientFetch<T = unknown>(
  url: string,
  options: ResilientFetchOptions = {}
): Promise<T> {
  const { queueOnFail = true, maxRetries = 3, timeout = 10000, ...fetchOptions } = options;
  
  // If offline, queue immediately
  if (!navigator.onLine) {
    if (queueOnFail) {
      return new Promise((resolve, reject) => {
        queueRequest({
          url,
          method: fetchOptions.method || 'GET',
          body: fetchOptions.body,
          maxRetries,
          onSuccess: resolve as (response: unknown) => void,
          onFailure: reject,
        });
      });
    }
    throw new Error('Network offline');
  }
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const start = Date.now();
    
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    recordLatency(Date.now() - start);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    state.successfulRequests++;
    return await response.json() as T;
    
  } catch (error) {
    clearTimeout(timeoutId);
    state.failedRequests++;
    
    if (queueOnFail && (error instanceof Error && error.name === 'AbortError' || !navigator.onLine)) {
      return new Promise((resolve, reject) => {
        queueRequest({
          url,
          method: fetchOptions.method || 'GET',
          body: fetchOptions.body,
          maxRetries,
          onSuccess: resolve as (response: unknown) => void,
          onFailure: reject,
        });
      });
    }
    
    throw error;
  }
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect } from 'react';

export function useConnectionStatus(): ConnectionState & { isOffline: boolean } {
  const [connectionState, setConnectionState] = useState<ConnectionState>(state);
  
  useEffect(() => {
    const unsubscribe = subscribeToConnection(setConnectionState);
    return unsubscribe;
  }, []);
  
  return {
    ...connectionState,
    isOffline: connectionState.status === 'offline',
  };
}

// ============================================================================
// INITIALIZATION
// ============================================================================

// Auto-initialize on module load
if (typeof window !== 'undefined') {
  initConnectionMonitoring();
}

export default {
  initConnectionMonitoring,
  getConnectionState,
  isOnline,
  isDegraded,
  getOfflineDuration,
  subscribeToConnection,
  queueRequest,
  getQueueStatus,
  clearQueue,
  resilientFetch,
  useConnectionStatus,
};
