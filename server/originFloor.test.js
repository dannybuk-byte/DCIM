/**
 * @vitest-environment node
 *
 * Ruling 2 fail-closed amendment (2026-08-05): only canonical origin_id values
 * on eligible admitted rows can satisfy the independent-origin floor. No
 * record-local identifier is a substitute for unresolved official identity.
 */
import { describe, expect, it } from 'vitest';
import { admitCandidateSources } from './admissionContract.js';
import {
  countIndependentOrigins,
  scoreCompany,
  scoreCompanyForPeriod,
} from './scoringEngine.js';

function row(overrides = {}) {
  return {
    id: 'r1',
    origin_id: 'official_record:r1',
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

describe('T3 — unresolved origin identity fails closed', () => {
  it('two rows with distinct record-local identities and no origin_id count as zero', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [
        row({
          id: 'a',
          origin_id: null,
          source_id: 'source-a',
          url: 'https://example.test/a',
          document_id: 'document-a',
        }),
        row({
          id: 'b',
          origin_id: null,
          source_id: 'source-b',
          url: 'https://example.test/b',
          document_id: 'document-b',
          type: 'warn_notice',
        }),
      ],
    });
    expect(scored.source_count).toBe(0);
    expect(scored.independent_origin_count).toBe(0);
    expect(scored.scores_suppressed).toBe(true);
    expect(scored.aas).toBeNull();
    expect(scored.bounded_mismatch_index).toBeNull();
  });

  it('one canonical origin plus one missing origin remains below the floor', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [
        row({ id: 'a', origin_id: null }),
        row({ id: 'b', origin_id: 'sec_edgar:0000000001' }),
      ],
    });
    expect(scored.independent_origin_count).toBe(1);
    expect(scored.scores_suppressed).toBe(true);
  });

  it.each([null, '', '   ', 'missing-family-prefix', ' sec_edgar:1'])(
    'origin_id %j contributes zero',
    origin_id => {
      expect(countIndependentOrigins([row({ origin_id })])).toBe(0);
      expect(admitCandidateSources([row({ origin_id })]).counted).toHaveLength(0);
    },
  );

  it('a copied disclosure stays one origin despite different local identifiers', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [
        row({
          id: 'row-a',
          origin_id: 'sec_edgar:0000000001',
          source_id: 'source-a',
          url: 'https://example.test/a',
          document_id: 'document-a',
        }),
        row({
          id: 'row-b',
          origin_id: 'sec_edgar:0000000001',
          source_id: 'source-b',
          url: 'https://example.test/b',
          document_id: 'document-b',
        }),
      ],
    });
    expect(scored.independent_origin_count).toBe(1);
    expect(scored.scores_suppressed).toBe(true);
  });
});

describe('T4 — non-counting rows are displayed but never satisfy the floor', () => {
  it('counts_toward_floor:false is excluded from the origin count', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [
        row({ id: 'a', origin_id: 'sec_edgar:1' }),
        row({
          id: 'b',
          origin_id: 'ny_dol_warn:2',
          counts_toward_floor: false,
        }),
      ],
    });
    expect(scored.source_count).toBe(1);
    expect(scored.independent_origin_count).toBe(1);
    expect(scored.scores_suppressed).toBe(true);
  });

  it.each([
    'epoch_ai_data_center',
    'bgp_route_signal',
    'ct_log_signal',
    'dns_signal',
    'ip_signal',
    'whois_signal',
    'rdap_signal',
    'rir_signal',
    'asn_signal',
    'peeringdb_signal',
    'owner_resolution_signal',
    'app_derived_analysis',
  ])('%s remains excluded even with a syntactically valid origin_id', type => {
    expect(
      countIndependentOrigins([row({ type, origin_id: `official_record:${type}` })]),
    ).toBe(0);
  });

  it.each(['synthetic', 'design', 'fixture'])(
    '%s provenance remains excluded',
    provenance => {
      expect(
        countIndependentOrigins([
          row({ provenance, origin_id: `official_record:${provenance}` }),
        ]),
      ).toBe(0);
    },
  );

  it('annotations remain outside counting admission', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [
        row({ id: 'a', origin_id: 'sec_edgar:1' }),
        row({
          id: 'ann1',
          origin_id: 'official_record:annotation',
          type: 'disclosure_gap_annotation',
        }),
      ],
    });
    expect(scored.independent_origin_count).toBe(1);
    expect(scored.scores_suppressed).toBe(true);
    expect(scored.admission.annotation_count).toBe(1);
  });
});

describe('T5 — every scoring entry point and source-id dedupe fail closed', () => {
  it('period scoring uses the same canonical-origin gate', () => {
    const company = {
      id: 'acme',
      sources: [
        row({ id: 'a', origin_id: null }),
        row({ id: 'b', origin_id: null, type: 'warn_notice' }),
      ],
    };
    const direct = scoreCompany(company);
    const period = scoreCompanyForPeriod(company, new Date('2026-01-01'), {
      from: '2025-01-01',
      to: '2025-12-31',
    });
    expect(direct.independent_origin_count).toBe(0);
    expect(period.independent_origin_count).toBe(0);
    expect(period.scores_suppressed).toBe(true);
  });

  it('duplicate source ids remain admitted once and cannot manufacture a floor', () => {
    const source = row({ id: 'same', origin_id: 'sec_edgar:1' });
    const scored = scoreCompany({ id: 'acme', sources: [source, { ...source }] });
    expect(scored.source_count).toBe(1);
    expect(scored.independent_origin_count).toBe(1);
    expect(scored.admission.duplicate_ids).toEqual(['same']);
    expect(scored.scores_suppressed).toBe(true);
  });
});

describe('T6 — support cannot alter score-row semantics', () => {
  const countingSources = [
    row({
      id: 'public-ai',
      origin_id: 'sec_edgar:0000000001',
      type: 'sec_filing',
      date: '2025-03-01',
      ai_attribution_tier: 'strong',
    }),
    row({
      id: 'warn',
      origin_id: 'ny_dol_warn:2025-001',
      type: 'warn_filing',
      date: '2025-03-10',
      workers_affected: 200,
      ai_disclosed_in_warn: false,
    }),
  ];
  const supportSources = [
    row({ id: 'missing-1', origin_id: null, date: '2024-01-01' }),
    row({ id: 'missing-2', origin_id: '', type: 'dns_signal', date: '2026-01-01' }),
    row({
      id: 'epoch',
      origin_id: 'epoch_ai:site-1',
      type: 'epoch_ai_data_center',
      date: '2025-12-01',
    }),
    row({
      id: 'bgp',
      origin_id: 'network_signal:bgp-1',
      type: 'bgp_route_signal',
      date: '2025-11-01',
    }),
    row({
      id: 'ct',
      origin_id: 'network_signal:ct-1',
      type: 'ct_log_signal',
      date: '2025-10-01',
    }),
  ];
  const invariantFields = [
    'source_count',
    'independent_origin_count',
    'source_types_present',
    'period_start',
    'period_end',
    'aas',
    'lss',
    'ds',
    'raw_mismatch_index',
    'bounded_mismatch_index',
    'source_coverage_score',
    'confidence_score',
    'confidence_breakdown',
    'evidence_quality',
    'risk_level',
    'score_breakdown',
    'scores_suppressed',
    'possible_false_positive',
    'possible_false_negative',
    'false_positive_reasons',
    'false_negative_reasons',
  ];

  it('adding support cannot promote quality or alter any scored field', () => {
    const referenceDate = new Date('2025-03-15T12:00:00Z');
    const baseline = scoreCompany({ id: 'acme', sources: countingSources }, referenceDate);
    const withSupport = scoreCompany(
      { id: 'acme', sources: [...countingSources, ...supportSources] },
      referenceDate,
    );

    expect(baseline.evidence_quality).toBe('low');
    expect(Object.fromEntries(invariantFields.map(field => [field, withSupport[field]]))).toEqual(
      Object.fromEntries(invariantFields.map(field => [field, baseline[field]])),
    );
    expect(withSupport.admission).toEqual(baseline.admission);
    expect(withSupport.warnings).toContain(
      `ADMISSION: ${supportSources.length} support row(s) excluded from origin counting and numeric scoring.`,
    );
  });

  it('support-only dates and types cannot alter period-scored metadata', () => {
    const referenceDate = new Date('2025-03-15T12:00:00Z');
    const baseline = scoreCompanyForPeriod(
      { id: 'acme', sources: countingSources },
      referenceDate,
      {},
    );
    const withSupport = scoreCompanyForPeriod(
      { id: 'acme', sources: [...countingSources, ...supportSources] },
      referenceDate,
      {},
    );

    expect(withSupport.period_start).toBe('2025-03-01');
    expect(withSupport.period_end).toBe('2025-03-10');
    expect(withSupport.source_types_present).toEqual(['sec_filing', 'warn_filing']);
    expect(Object.fromEntries(invariantFields.map(field => [field, withSupport[field]]))).toEqual(
      Object.fromEntries(invariantFields.map(field => [field, baseline[field]])),
    );
  });

  it('below-floor support does not inflate counting or admission fields', () => {
    const scored = scoreCompany({
      id: 'acme',
      sources: [countingSources[0], ...supportSources],
    });

    expect(scored.source_count).toBe(1);
    expect(scored.independent_origin_count).toBe(1);
    expect(scored.admission.admitted_source_count).toBe(1);
    expect(scored.scores_suppressed).toBe(true);
    expect(scored.aas).toBeNull();
    expect(scored.raw_mismatch_index).toBeNull();
    expect(scored.bounded_mismatch_index).toBeNull();
  });
});
