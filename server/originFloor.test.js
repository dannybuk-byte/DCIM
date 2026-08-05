/**
 * @vitest-environment node
 *
 * Ruling 2 acceptance (2026-08-05): the corroboration floor counts INDEPENDENT
 * ORIGINS — distinct `origin_id ?? id` over admitted, counting evidence rows —
 * instead of raw admitted-row count. Implements the F32 design that was
 * verified scratch-only on 2026-07-04 and never previously merged.
 *
 *   T1  two rows sharing one origin_id are ONE origin -> withheld
 *   T2  two rows with distinct origin_ids cross the floor
 *   T3  legacy rows without origin_id fall back to row id (old semantics kept)
 *   T4  counts_toward_floor:false rows and demoted types (ruling 3) never count
 *   T5  annotations remain partitioned ahead of the floor (R-F5 unchanged)
 */
import { describe, expect, it } from 'vitest';
import { scoreCompany, countIndependentOrigins } from './scoringEngine.js';

function row(overrides = {}) {
  return {
    id: 'r1',
    company_id: 'acme',
    type: 'press_release',
    date: '2025-03-01',
    provenance: 'real',
    ...overrides,
  };
}

describe('T1 — same origin twice is one origin', () => {
  it('two SEC filings from one issuer (shared origin_id) stay withheld', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [
        row({ id: 'acme_10k_2024', type: 'sec_filing', origin_id: 'sec_edgar:0000000001' }),
        row({ id: 'acme_10q_2025', type: 'sec_filing', origin_id: 'sec_edgar:0000000001' }),
      ],
    });
    expect(scored.source_count).toBe(2);
    expect(scored.independent_origin_count).toBe(1);
    expect(scored.scores_suppressed).toBe(true);
    expect(scored.warnings.join(' ')).toContain('independent origins');
  });
});

describe('T2 — distinct origins cross the floor', () => {
  it('one SEC origin + one WARN origin scores', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [
        row({ id: 'acme_10k_2024', type: 'sec_filing', origin_id: 'sec_edgar:0000000001' }),
        row({ id: 'acme_warn_2025', type: 'warn_notice', origin_id: 'ny_dol_warn:2025-001' }),
      ],
    });
    expect(scored.independent_origin_count).toBe(2);
    expect(scored.scores_suppressed).toBe(false);
  });
});

describe('T3 — origin_id fallback to row id preserves legacy behavior', () => {
  it('two legacy rows with distinct ids and no origin_id still cross', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [row({ id: 'a' }), row({ id: 'b', type: 'warn_notice' })],
    });
    expect(scored.independent_origin_count).toBe(2);
    expect(scored.scores_suppressed).toBe(false);
  });

  it('mixed: a legacy row and an origin_id row are independent when they differ', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [row({ id: 'a' }), row({ id: 'b', origin_id: 'sec_edgar:1' })],
    });
    expect(scored.independent_origin_count).toBe(2);
    expect(scored.scores_suppressed).toBe(false);
  });
});

describe('T4 — non-counting rows are displayed but never satisfy the floor', () => {
  it('counts_toward_floor:false is excluded from the origin count', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [row({ id: 'a' }), row({ id: 'b', counts_toward_floor: false })],
    });
    expect(scored.source_count).toBe(2);
    expect(scored.independent_origin_count).toBe(1);
    expect(scored.scores_suppressed).toBe(true);
  });

  it('countIndependentOrigins unit: flag, demoted type, and dedupe combine', () => {
    expect(
      countIndependentOrigins([
        row({ id: 'a', origin_id: 'o1' }),
        row({ id: 'b', origin_id: 'o1' }), // same origin
        row({ id: 'c', counts_toward_floor: false }), // flagged out
        row({ id: 'd', type: 'epoch_ai_data_center' }), // demoted type (ruling 3)
        row({ id: 'e', origin_id: 'o2' }), // second origin
      ]),
    ).toBe(2);
  });
});

describe('T5 — annotations stay partitioned ahead of the floor (R-F5 unchanged)', () => {
  it('an annotation plus one evidence row is one origin, withheld', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [
        row({ id: 'a', origin_id: 'sec_edgar:1' }),
        row({ id: 'ann1', type: 'disclosure_gap_annotation' }),
      ],
    });
    expect(scored.independent_origin_count).toBe(1);
    expect(scored.scores_suppressed).toBe(true);
    expect(scored.admission.annotation_count).toBe(1);
  });
});
