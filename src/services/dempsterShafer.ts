/**
 * Minimal Dempster–Shafer evidence fusion utilities.
 *
 * We model belief mass over {H, ¬H, Θ} where Θ is uncertainty.
 * This is intentionally small: enough to quantify conflict (K) and combine scores.
 */

export interface MassFunction {
  belief: number; // mass assigned to hypothesis H
  disbelief: number; // mass assigned to ¬H
  uncertainty: number; // remaining mass to Θ
}

export interface CombineResult {
  combined: MassFunction;
  conflictK: number; // disagreement coefficient in [0,1)
}

function clamp01(x: number): number {
  return Math.min(Math.max(x, 0), 1);
}

export function toMassFromConfidence(confidence: number, polarity: 'support' | 'refute' = 'support'): MassFunction {
  const c = clamp01(confidence);
  if (polarity === 'support') {
    return { belief: c, disbelief: 0, uncertainty: 1 - c };
  }
  return { belief: 0, disbelief: c, uncertainty: 1 - c };
}

export function combineDempster(m1: MassFunction, m2: MassFunction): CombineResult {
  const a = normalizeMass(m1);
  const b = normalizeMass(m2);

  // Conflict: belief vs disbelief cross-terms
  const K = a.belief * b.disbelief + a.disbelief * b.belief;
  const denom = 1 - K;
  if (denom <= 0) {
    return { combined: { belief: 0, disbelief: 0, uncertainty: 1 }, conflictK: 1 };
  }

  // Combine masses
  const belief = (a.belief * b.belief + a.belief * b.uncertainty + a.uncertainty * b.belief) / denom;
  const disbelief = (a.disbelief * b.disbelief + a.disbelief * b.uncertainty + a.uncertainty * b.disbelief) / denom;
  const uncertainty = (a.uncertainty * b.uncertainty) / denom;

  return { combined: normalizeMass({ belief, disbelief, uncertainty }), conflictK: clamp01(K) };
}

export function normalizeMass(m: MassFunction): MassFunction {
  const belief = clamp01(m.belief);
  const disbelief = clamp01(m.disbelief);
  const uncertainty = clamp01(m.uncertainty);
  const sum = belief + disbelief + uncertainty;
  if (sum === 0) return { belief: 0, disbelief: 0, uncertainty: 1 };
  return { belief: belief / sum, disbelief: disbelief / sum, uncertainty: uncertainty / sum };
}

export function pignisticProbability(m: MassFunction): number {
  // BetP(H) = belief + 0.5 * uncertainty
  const n = normalizeMass(m);
  return clamp01(n.belief + 0.5 * n.uncertainty);
}

