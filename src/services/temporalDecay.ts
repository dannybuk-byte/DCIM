/**
 * Temporal decay for confidence over time.
 * Prevents stale data from retaining artificially high confidence.
 */

export interface DecayParams {
  lifetimeMs: number;
  decayFactor: number; // higher => faster decay
}

export function applyTemporalDecay(baseScore: number, ageMs: number, params: DecayParams): number {
  if (!Number.isFinite(baseScore)) return 0;
  const b = Math.min(Math.max(baseScore, 0), 1);
  if (ageMs <= 0) return b;
  if (params.lifetimeMs <= 0) return 0;

  const t = Math.min(ageMs / params.lifetimeMs, 1);
  const decayed = b * (1 - Math.pow(t, params.decayFactor));
  return Math.min(Math.max(decayed, 0), 1);
}

export function defaultDecayForSignalType(signalType: string): DecayParams {
  // These are conservative defaults; tune with outcome tracking (Brier score).
  switch (signalType) {
    case 'anomaly':
      return { lifetimeMs: 24 * 60 * 60 * 1000, decayFactor: 1.2 }; // 1 day
    case 'alert':
      return { lifetimeMs: 12 * 60 * 60 * 1000, decayFactor: 1.4 }; // 12h
    case 'change':
      return { lifetimeMs: 7 * 24 * 60 * 60 * 1000, decayFactor: 1.0 }; // 1 week
    default:
      return { lifetimeMs: 3 * 24 * 60 * 60 * 1000, decayFactor: 1.1 };
  }
}

