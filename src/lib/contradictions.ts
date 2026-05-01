/**
 * Deterministic public-claim vs observed-outcome comparison (manual / structured inputs only).
 */

import type { CredibilityProjectSnapshot } from './credibilityInputs';

export interface ContradictionPair {
  claimId: string;
  outcomeId: string;
  claimText: string;
  observedMetric: string;
  claimedValue: number;
  observedValue: number;
  gapAbsolute: number;
  gapRatio: number;
  /** 0–100, higher = stronger contradiction signal */
  severity: number;
  claimSourceUrl?: string;
  outcomeSourceUrl?: string;
  /** Combined evidentiary confidence 0–1 */
  confidence: number;
}

function pairConfidence(c: number, o: number): number {
  return Math.max(0, Math.min(1, (c + o) / 2));
}

/**
 * Match claims to outcomes by claimType / metric keywords.
 */
export function buildContradictionPairs(snapshot: CredibilityProjectSnapshot): ContradictionPair[] {
  const pairs: ContradictionPair[] = [];

  const outcomeByMetric = new Map<string, { id: string; value: number; url?: string; conf: number }>();
  for (const o of snapshot.observedOutcomes) {
    const key = o.metric.toLowerCase();
    outcomeByMetric.set(key, {
      id: o.id,
      value: o.value,
      url: o.sourceUrl,
      conf: Math.max(0, Math.min(1, o.confidence)),
    });
  }

  const pickOutcome = (metric: string) => outcomeByMetric.get(metric.toLowerCase());

  for (const claim of snapshot.publicClaims) {
    if (claim.claimType === 'jobs') {
      const ob = pickOutcome('jobs');
      if (!ob) continue;
      const claimedValue = snapshot.promisedJobs;
      const observedValue = ob.value;
      const gapAbs = Math.abs(claimedValue - observedValue);
      const denom = Math.max(Math.abs(claimedValue), Math.abs(observedValue), 1);
      const gapRatio = gapAbs / denom;
      const baseSeverity = Math.min(100, gapRatio * 100);
      const conf = pairConfidence(claim.confidence, ob.conf);
      const severity = Math.round(baseSeverity * (0.55 + 0.45 * conf));
      pairs.push({
        claimId: claim.id,
        outcomeId: ob.id,
        claimText: claim.claimText,
        observedMetric: 'jobs',
        claimedValue,
        observedValue,
        gapAbsolute: gapAbs,
        gapRatio,
        severity,
        claimSourceUrl: claim.sourceUrl,
        outcomeSourceUrl: ob.url,
        confidence: conf,
      });
    }
    if (claim.claimType === 'capex') {
      const ob = pickOutcome('capex_usd') ?? pickOutcome('capex');
      if (!ob || snapshot.promisedCapexUsd == null) continue;
      const claimedValue = snapshot.promisedCapexUsd;
      const observedValue = ob.value;
      const gapAbs = Math.abs(claimedValue - observedValue);
      const denom = Math.max(Math.abs(claimedValue), Math.abs(observedValue), 1);
      const gapRatio = gapAbs / denom;
      const baseSeverity = Math.min(100, gapRatio * 100);
      const conf = pairConfidence(claim.confidence, ob.conf);
      const severity = Math.round(baseSeverity * (0.5 + 0.5 * conf));
      pairs.push({
        claimId: claim.id,
        outcomeId: ob.id,
        claimText: claim.claimText,
        observedMetric: ob.value === snapshot.actualCapexUsd ? 'capex_usd' : 'capex',
        claimedValue,
        observedValue,
        gapAbsolute: gapAbs,
        gapRatio,
        severity,
        claimSourceUrl: claim.sourceUrl,
        outcomeSourceUrl: ob.url,
        confidence: conf,
      });
    }
  }

  return pairs;
}

/** Aggregate contradiction pressure 0–100 (higher = more tension between claims and observations). */
export function aggregateContradictionScore(pairs: ContradictionPair[]): number {
  if (pairs.length === 0) return 0;
  let sum = 0;
  let w = 0;
  for (const p of pairs) {
    const weight = 0.35 + 0.65 * p.confidence;
    sum += p.severity * weight;
    w += weight;
  }
  return w > 0 ? Math.round(sum / w) : 0;
}
