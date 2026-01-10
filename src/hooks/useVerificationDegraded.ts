/**
 * React hook for verification degraded mode state.
 * 
 * Provides real-time updates when verification services go up/down.
 * Use this in UI components to show degraded state warnings.
 */

import { useState, useEffect, useCallback } from 'react';
import { verificationDegradedMode, type DegradedModeState } from '../services/verificationDegradedMode';

export interface UseVerificationDegradedResult {
  /** Current degraded mode state */
  state: DegradedModeState;
  /** Whether verification is currently degraded */
  isDegraded: boolean;
  /** Human-readable reason */
  reason: string;
  /** Last health check timestamp */
  lastCheck: number;
  /** Force an immediate health check */
  forceCheck: () => Promise<DegradedModeState>;
}

/**
 * Hook to track verification degraded mode.
 * 
 * @param autoStart - Whether to start the background health poller (default: true)
 */
export function useVerificationDegraded(autoStart = true): UseVerificationDegradedResult {
  const [state, setState] = useState<DegradedModeState>(verificationDegradedMode.getState);

  useEffect(() => {
    // Start polling if requested
    if (autoStart) {
      verificationDegradedMode.start();
    }

    // Subscribe to state changes
    const unsubscribe = verificationDegradedMode.onStateChange((newState) => {
      setState(newState);
    });

    // Get initial state
    setState(verificationDegradedMode.getState());

    return () => {
      unsubscribe();
      // Note: we don't stop() here because other components might still need it
    };
  }, [autoStart]);

  const forceCheck = useCallback(async () => {
    const result = await verificationDegradedMode.checkHealth();
    setState(result);
    return result;
  }, []);

  return {
    state,
    isDegraded: state.isDegraded,
    reason: state.reason,
    lastCheck: state.lastCheck,
    forceCheck,
  };
}
