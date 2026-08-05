/**
 * @vitest-environment node
 */
import { describe, expect, it } from 'vitest';
import {
  computeAAS,
  computeBoundedMismatchIndex,
  computeConfidence,
  computeDS,
  computeLSS,
  computeMismatchIndex,
  scoreCompany,
  scoreCompanyForPeriod,
} from './scoringEngine.js';

describe('computeAAS', () => {
  it('sums tiers and caps at 100', () => {
    const sources = [
      { type: 'earnings_call', ai_attribution_tier: 'strong' },
      { type: 'press_release', ai_attribution_tier: 'strong' },
      { type: 'blog_post', ai_attribution_tier: 'moderate' },
    ];
    expect(computeAAS(sources)).toBe(25 + 25 + 12);
  });

  it('ignores WARN rows', () => {
    const sources = [{ type: 'warn_filing', ai_attribution_tier: 'strong' }];
    expect(computeAAS(sources)).toBe(0);
  });
});

describe('computeLSS', () => {
  it('adds WARN base and worker buckets', () => {
    const sources = [{ type: 'warn_filing', workers_affected: 250 }];
    expect(computeLSS(sources)).toBe(15 + 2);
  });

  it('caps at 100', () => {
    const sources = Array.from({ length: 10 }, () => ({
      type: 'warn_filing',
      workers_affected: 10000,
    }));
    expect(computeLSS(sources)).toBe(100);
  });
});

describe('computeDS', () => {
  it('adds points only when flags set', () => {
    const sources = [
      { type: 'warn_filing', ai_disclosed_in_warn: true },
      { type: 'legal_notice', ai_disclosed_in_legal: true },
    ];
    expect(computeDS(sources)).toBe(100);
  });

  it('is zero when prototype omits AI in WARN', () => {
    const sources = [{ type: 'warn_filing', ai_disclosed_in_warn: false }];
    expect(computeDS(sources)).toBe(0);
  });
});

describe('computeMismatchIndex', () => {
  it('matches formula', () => {
    expect(computeMismatchIndex(78, 62, 0)).toBe(140);
  });
});

describe('computeBoundedMismatchIndex', () => {
  it('maps raw -100..300 to 0..100', () => {
    expect(computeBoundedMismatchIndex(-100)).toBe(0);
    expect(computeBoundedMismatchIndex(300)).toBe(100);
    expect(computeBoundedMismatchIndex(140)).toBe(60);
  });
});

describe('scoreCompany', () => {
  it('returns explainable breakdown', () => {
    const company = {
      id: 'test_co',
      sources: [
        {
          id: 'a',
          origin_id: 'corporate_disclosure:a',
          type: 'earnings_call',
          date: '2025-01-01',
          ai_attribution_tier: 'moderate',
        },
        {
          id: 'b',
          origin_id: 'official_warn:b',
          type: 'warn_filing',
          date: '2025-02-01',
          workers_affected: 100,
          ai_disclosed_in_warn: false,
        },
      ],
    };
    const ref = new Date('2026-06-01T12:00:00Z');
    const s = scoreCompany(company, ref);
    expect(s.company_id).toBe('test_co');
    expect(s.aas).toBe(12);
    expect(s.lss).toBe(16);
    expect(s.ds).toBe(0);
    expect(s.raw_mismatch_index).toBe(28);
    expect(s.mismatch_index).toBe(28);
    expect(s.bounded_mismatch_index).toBe(32);
    expect(s.confidence_score).toBeGreaterThan(0);
    expect(s.score_breakdown.aas.components).toHaveLength(1);
    expect(s.score_breakdown.lss.components).toHaveLength(1);
    expect(s.scores_suppressed).toBe(false);
  });

  it('suppresses scores when fewer than 2 sources', () => {
    const company = {
      id: 'thin',
      sources: [{ id: 'only', type: 'earnings_call', date: '2025-01-01', ai_attribution_tier: 'strong' }],
    };
    const s = scoreCompany(company, new Date());
    expect(s.scores_suppressed).toBe(true);
    expect(s.aas).toBe(null);
    expect(s.warnings.some(w => w.includes('VALIDATION'))).toBe(true);
  });
});

describe('scoreCompanyForPeriod', () => {
  it('filters sources before scoring', () => {
    const company = {
      id: 'p',
      sources: [
        {
          id: '1',
          origin_id: 'corporate_disclosure:1',
          type: 'earnings_call',
          date: '2025-01-15',
          ai_attribution_tier: 'weak',
        },
        {
          id: '2',
          origin_id: 'corporate_disclosure:2',
          type: 'earnings_call',
          date: '2025-06-15',
          ai_attribution_tier: 'strong',
        },
        {
          id: '3',
          origin_id: 'official_warn:3',
          type: 'warn_filing',
          date: '2025-06-20',
          workers_affected: 0,
          ai_disclosed_in_warn: false,
        },
      ],
    };
    const s = scoreCompanyForPeriod(company, new Date('2026-01-01'), { from: '2025-06-01', to: '2025-08-01' });
    expect(s.period_query).toEqual({ from: '2025-06-01', to: '2025-08-01' });
    expect(s.source_count).toBe(2);
  });
});

describe('computeConfidence', () => {
  it('returns 0–100', () => {
    const sources = [
      { type: 'earnings_call', date: '2026-03-01', ai_attribution_tier: 'strong' },
      { type: 'warn_filing', date: '2026-03-15', workers_affected: 50 },
    ];
    const ref = new Date('2026-04-01T12:00:00Z');
    const c = computeConfidence(sources, ref);
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(100);
  });
});
