/**
 * Verification Degraded Mode Service
 * 
 * Tracks health of verification services (Worker proxy, RPKI, RouteViews).
 * When degraded, suppresses auto-confirmation to prevent bad data from being promoted.
 * 
 * This is the defensive layer that MUST exist before auto-create is safe.
 */

import { checkVerificationProxyHealth, type VerificationHealthSnapshot } from './verificationHealth';
import { telemetryBus } from './telemetryBus';

export interface DegradedModeState {
  isDegraded: boolean;
  reason: string;
  lastCheck: number;
  consecutiveFailures: number;
  proxyHealth: VerificationHealthSnapshot | null;
}

export interface VerificationDegradedModeConfig {
  /** How often to poll health (ms) */
  pollIntervalMs: number;
  /** How many consecutive failures before entering degraded mode */
  failureThreshold: number;
  /** How many consecutive successes to exit degraded mode */
  recoveryThreshold: number;
}

const DEFAULT_CONFIG: VerificationDegradedModeConfig = {
  pollIntervalMs: 30_000, // 30 seconds
  failureThreshold: 2,    // 2 failures → degraded
  recoveryThreshold: 3,   // 3 successes → recovered
};

type StateChangeCallback = (state: DegradedModeState) => void;

class VerificationDegradedModeService {
  private config: VerificationDegradedModeConfig;
  private state: DegradedModeState;
  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private consecutiveSuccesses = 0;
  private listeners: Set<StateChangeCallback> = new Set();

  constructor(config: Partial<VerificationDegradedModeConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      isDegraded: false,
      reason: 'Not yet checked',
      lastCheck: 0,
      consecutiveFailures: 0,
      proxyHealth: null,
    };
  }

  /** Start background health polling */
  start(): void {
    if (this.pollInterval) return;
    
    // Immediate first check
    void this.checkHealth();
    
    this.pollInterval = setInterval(() => {
      void this.checkHealth();
    }, this.config.pollIntervalMs);
  }

  /** Stop background health polling */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /** Subscribe to state changes */
  onStateChange(callback: StateChangeCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /** Get current state (non-blocking) */
  getState(): DegradedModeState {
    return { ...this.state };
  }

  /** Check if currently degraded (non-blocking) */
  isDegraded(): boolean {
    return this.state.isDegraded;
  }

  /** Force an immediate health check */
  async checkHealth(): Promise<DegradedModeState> {
    const proxyHealth = await checkVerificationProxyHealth();
    const now = Date.now();

    const wasHealthy = proxyHealth.status === 'ok';
    const wasDegraded = this.state.isDegraded;

    if (wasHealthy) {
      this.state.consecutiveFailures = 0;
      this.consecutiveSuccesses++;

      // Recovery check
      if (wasDegraded && this.consecutiveSuccesses >= this.config.recoveryThreshold) {
        this.state.isDegraded = false;
        this.state.reason = 'Recovered after consecutive healthy checks';
        this.emitRecoveryTelemetry();
      } else if (!wasDegraded) {
        this.state.reason = 'Healthy';
      }
    } else {
      this.consecutiveSuccesses = 0;
      this.state.consecutiveFailures++;

      // Degradation check
      if (!wasDegraded && this.state.consecutiveFailures >= this.config.failureThreshold) {
        this.state.isDegraded = true;
        this.state.reason = `Degraded: ${proxyHealth.message ?? proxyHealth.status}`;
        this.emitDegradedTelemetry(proxyHealth);
      } else if (wasDegraded) {
        this.state.reason = `Still degraded: ${proxyHealth.message ?? proxyHealth.status}`;
      } else {
        this.state.reason = `Warning: ${proxyHealth.message ?? proxyHealth.status} (${this.state.consecutiveFailures}/${this.config.failureThreshold} failures)`;
      }
    }

    this.state.lastCheck = now;
    this.state.proxyHealth = proxyHealth;

    // Notify listeners
    for (const listener of this.listeners) {
      try {
        listener(this.getState());
      } catch {
        // swallow listener errors
      }
    }

    return this.getState();
  }

  private emitDegradedTelemetry(proxyHealth: VerificationHealthSnapshot): void {
    void telemetryBus.emit(
      {
        source: 'system',
        type: 'verification_degraded_mode_entered',
        severity: 'high',
        title: 'Verification degraded mode activated',
        summary: `Auto-confirmation suspended: ${proxyHealth.message ?? proxyHealth.status}`,
        payload: {
          consecutiveFailures: this.state.consecutiveFailures,
          proxyHealth,
        },
        fingerprint: `verification_degraded_mode_entered:${Date.now()}`,
      },
      { skipAutoLink: true },
    );
  }

  private emitRecoveryTelemetry(): void {
    void telemetryBus.emit(
      {
        source: 'system',
        type: 'verification_degraded_mode_exited',
        severity: 'medium',
        title: 'Verification degraded mode exited',
        summary: 'Auto-confirmation re-enabled after recovery',
        payload: {
          consecutiveSuccesses: this.consecutiveSuccesses,
        },
        fingerprint: `verification_degraded_mode_exited:${Date.now()}`,
      },
      { skipAutoLink: true },
    );
  }
}

/** Singleton instance */
export const verificationDegradedMode = new VerificationDegradedModeService();
