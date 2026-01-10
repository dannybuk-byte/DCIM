/**
 * NATO/Admiralty 6x6 source evaluation helper (STANAG-style).
 * We separate "source reliability" from "information credibility".
 *
 * This does NOT claim ground truth; it provides a disciplined way to label uncertainty.
 */

export type SourceReliability = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type InformationCredibility = 1 | 2 | 3 | 4 | 5 | 6;

export interface AdmiraltyRating {
  reliability: SourceReliability;
  credibility: InformationCredibility;
}

export interface ConfidenceAssessment extends AdmiraltyRating {
  code: string; // e.g. "B2"
  /**
   * Normalized score in [0,1] for UI weighting.
   * This is a heuristic mapping.
   */
  score: number;
  notes?: string;
}

const RELIABILITY_SCORE: Record<SourceReliability, number> = {
  A: 1.0,
  B: 0.85,
  C: 0.7,
  D: 0.5,
  E: 0.3,
  F: 0.15,
};

const CREDIBILITY_SCORE: Record<InformationCredibility, number> = {
  1: 1.0,
  2: 0.85,
  3: 0.7,
  4: 0.5,
  5: 0.3,
  6: 0.15,
};

export function assessAdmiralty(rating: AdmiraltyRating, notes?: string): ConfidenceAssessment {
  const r = RELIABILITY_SCORE[rating.reliability];
  const c = CREDIBILITY_SCORE[rating.credibility];
  // Combine conservatively: geometric mean avoids overstating when one dimension is weak.
  const score = Math.sqrt(r * c);
  return { ...rating, code: `${rating.reliability}${rating.credibility}`, score, notes };
}

/**
 * Opinionated defaults for sources used in this app.
 * These should be improved over time with measured calibration (e.g., Brier scoring).
 */
export function defaultSourceAssessment(source: string): ConfidenceAssessment {
  switch (source) {
    case 'bgp':
      // RIS Live is a strong observation feed, but an anomaly interpretation is not "confirmed".
      return assessAdmiralty({ reliability: 'A', credibility: 2 }, 'RIPE RIS Live observation; inference still requires corroboration.');
    case 'rpki':
      return assessAdmiralty({ reliability: 'A', credibility: 1 }, 'Cloudflare RPKI VRPs; strongest validation layer for route origin.');
    case 'ct':
      // CertStream is an aggregator feed; cert existence is credible but facility inference is weaker.
      return assessAdmiralty({ reliability: 'B', credibility: 3 }, 'CertStream indicates cert issuance; facility/location inference is heuristic.');
    case 'crtsh':
      return assessAdmiralty({ reliability: 'C', credibility: 3 }, 'crt.sh is useful for lookup; latency/rate limits reduce freshness guarantees.');
    case 'epa':
      return assessAdmiralty({ reliability: 'A', credibility: 2 }, 'EPA ECHO/FRS are authoritative but may lag and be incomplete by NAICS.');
    case 'gleif':
      return assessAdmiralty({ reliability: 'A', credibility: 2 }, 'GLEIF LEI is authoritative for entities that have LEIs; coverage is partial.');
    default:
      return assessAdmiralty({ reliability: 'F', credibility: 6 }, 'Unknown source; treat as untrusted until corroborated.');
  }
}

