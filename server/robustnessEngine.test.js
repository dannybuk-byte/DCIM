/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import {
  countFlagged,
  isFlaggedAtThreshold,
  patternStabilityLabelFromPersistence,
  riskLevelAtThreshold,
} from './robustnessEngine.js';

describe('isFlaggedAtThreshold', () => {
  it('returns false when suppressed', () => {
    expect(isFlaggedAtThreshold({ scores_suppressed: true, bounded_mismatch_index: 90, confidence_score: 90 }, 40, 30)).toBe(
      false,
    );
  });

  it('gates on bounded mismatch and confidence', () => {
    const row = { scores_suppressed: false, bounded_mismatch_index: 55, confidence_score: 40 };
    expect(isFlaggedAtThreshold(row, 50, 35)).toBe(true);
    expect(isFlaggedAtThreshold(row, 60, 35)).toBe(false);
    expect(isFlaggedAtThreshold(row, 50, 45)).toBe(false);
  });
});

describe('riskLevelAtThreshold', () => {
  it('returns minimal when not flagged', () => {
    const row = { scores_suppressed: false, bounded_mismatch_index: 20, confidence_score: 80, risk_level: 'high' };
    expect(riskLevelAtThreshold(row, 50, 35)).toBe('minimal');
  });
});

describe('countFlagged', () => {
  it('counts rows', () => {
    const rows = [
      { scores_suppressed: false, bounded_mismatch_index: 60, confidence_score: 40 },
      { scores_suppressed: false, bounded_mismatch_index: 40, confidence_score: 40 },
    ];
    expect(countFlagged(rows, 50, 35)).toBe(1);
  });
});

describe('patternStabilityLabelFromPersistence', () => {
  it('labels buckets', () => {
    expect(patternStabilityLabelFromPersistence(0.8)).toBe('stable');
    expect(patternStabilityLabelFromPersistence(0.55)).toBe('moderate');
    expect(patternStabilityLabelFromPersistence(0.2)).toBe('fragile');
  });
});
