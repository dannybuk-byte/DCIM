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
    expect(scored.source_count).toBe(2);
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
    expect(scored.source_count).toBe(2);
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
