/**
 * @vitest-environment jsdom
 *
 * Stage C/D UI assertions:
 *   §6.1 withheld candidate renders "signal withheld" and its single source count
 *   §6.2 corroborated candidate renders the lead-time ladder + a positive lead
 *   §6.6 provenance honesty badge distinguishes real vs synthetic
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EpochConfirmTimeline, leadTimeHeadline } from './EpochConfirmTimeline';
import type { CompanyScoresRow } from '../api/disclosureMismatchClient';

function row(overrides: Partial<CompanyScoresRow>): CompanyScoresRow {
  return {
    id: 'meta',
    name: 'Meta',
    sector: 'Technology',
    period_start: null,
    period_end: null,
    source_count: 1,
    source_types_present: [],
    missing_expected_sources: [],
    aas: null,
    lss: null,
    ds: null,
    raw_mismatch_index: null,
    mismatch_index: null,
    bounded_mismatch_index: null,
    confidence_score: 0,
    confidence_breakdown: {} as CompanyScoresRow['confidence_breakdown'],
    evidence_quality: 'low',
    risk_level: 'minimal',
    score_breakdown: {} as CompanyScoresRow['score_breakdown'],
    warnings: [],
    scores_suppressed: true,
    low_confidence_flag: true,
    ...overrides,
  };
}

describe('§6.1 withheld candidate', () => {
  it('shows the withheld message and stays first-class', () => {
    render(<EpochConfirmTimeline row={row({ scores_suppressed: true, source_count: 1 })} />);
    expect(screen.getByText(/signal withheld/i)).toBeTruthy();
    expect(screen.getByText(/1 source/)).toBeTruthy();
  });
});

describe('§6.2 corroborated candidate renders the lead-time ladder', () => {
  it('shows a positive lead and the site', () => {
    render(
      <EpochConfirmTimeline
        row={row({
          scores_suppressed: false,
          source_count: 2,
          provenance: { real_source_count: 2, has_epoch_confirm: true, provenance: 'real' },
          lead_time: {
            detection_date: '2025-03-01',
            epoch_site_count: 1,
            sites_flagged_before_public: 1,
            lead_days_range: [227, 227],
            ladder: [
              {
                site_name: 'Meta Prometheus',
                public_visibility_date: '2025-10-14',
                public_visibility_kind: 'operational',
                lead_time_days: 227,
              },
            ],
          },
        })}
      />,
    );
    expect(screen.getByText(/Corroborated by ≥2/i)).toBeTruthy();
    expect(screen.getByText(/Meta Prometheus/)).toBeTruthy();
    expect(screen.getByText(/\+227d lead/)).toBeTruthy();
  });
});

describe('§6.6 provenance honesty badge', () => {
  it('labels a synthetic candidate DESIGN', () => {
    render(
      <EpochConfirmTimeline
        row={row({ provenance: { real_source_count: 0, has_epoch_confirm: false, provenance: 'synthetic' } })}
      />,
    );
    expect(screen.getByText(/DESIGN · synthetic/)).toBeTruthy();
  });
});

describe('leadTimeHeadline is honest (no cherry-picked single number)', () => {
  it('summarizes the range and the ahead-of-public count', () => {
    const h = leadTimeHeadline({
      detection_date: '2025-01-01',
      epoch_site_count: 17,
      sites_flagged_before_public: 9,
      lead_days_range: [-749, 689],
      ladder: [],
    });
    expect(h).toMatch(/9\/17/);
    expect(h).toMatch(/-749–689 days/);
  });
});
