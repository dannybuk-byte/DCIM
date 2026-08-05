/**
 * @vitest-environment node
 *
 * Taskbrief §1.3 / §5, re-ruled 2026-08-05: the `epoch_ai_data_center` source-type
 * token remains available on raw evidence for identity/reporting and contributes
 * no score-row type, AAS, LSS, or DS points. Per rulings 2+3,
 * the floor now counts INDEPENDENT ORIGINS and `epoch_ai_data_center` is demoted to
 * non-counting confirmation pending a per-family admission dossier — so an Epoch row
 * can no longer be the second "source" that crosses the floor.
 */
import { describe, expect, it } from 'vitest';
import {
  scoreCompany,
  computeSourceTypesPresent,
  computeAAS,
  computeLSS,
  computeDS,
} from './scoringEngine.js';
import { EPOCH_CONFIRM_TYPE } from './epochConfirm.js';

function corpusSource(overrides = {}) {
  return {
    id: 'meta_press_2025_001',
    origin_id: 'corporate_disclosure:meta_press_2025_001',
    company_id: 'meta',
    type: 'press_release',
    date: '2025-03-01',
    provenance: 'real',
    ai_attribution_tier: 'strong',
    ...overrides,
  };
}

function epochSource(overrides = {}) {
  return {
    id: 'epoch_meta_prometheus',
    company_id: 'meta',
    type: EPOCH_CONFIRM_TYPE, // 'epoch_ai_data_center'
    date: '2025-10-14',
    provenance: 'real',
    data_source: 'Epoch AI',
    ...overrides,
  };
}

describe('§1.3 epoch_ai_data_center token remains raw support only', () => {
  it('is excluded from counting source_types_present[] on a matched candidate', () => {
    const company = { id: 'meta', name: 'Meta', sources: [corpusSource(), epochSource()] };
    const scored = scoreCompany(company);
    expect(company.sources.map(source => source.type)).toContain('epoch_ai_data_center');
    expect(scored.source_types_present).not.toContain('epoch_ai_data_center');
  });

  it('the raw type helper can still report the token outside score admission', () => {
    const present = computeSourceTypesPresent([corpusSource(), epochSource()]);
    expect(present).toContain('epoch_ai_data_center');
    expect(present).toContain('press_release');
  });

  it('the token adds no AAS/LSS/DS points (identity/reporting only)', () => {
    // Adding an Epoch row to a source list must not move any of the three scoring
    // axes: epoch_ai_data_center is in no scoring Set (PUBLIC_AI/WARN/LEGAL). Tested on
    // the raw axis functions, which have no floor, to isolate the token's contribution.
    const base = [corpusSource()];
    const withEpoch = [corpusSource(), epochSource()];
    expect(computeAAS(withEpoch)).toBe(computeAAS(base));
    expect(computeLSS(withEpoch)).toBe(computeLSS(base));
    expect(computeDS(withEpoch)).toBe(computeDS(base));
  });
});

describe('§2.1 (re-ruled 2026-08-05) floor counts independent origins; Epoch never counts', () => {
  it('one Epoch source alone: zero independent origins, suppressed', () => {
    const one = scoreCompany({ id: 'meta', sources: [epochSource()] });
    expect(one.scores_suppressed).toBe(true);
    expect(one.source_count).toBe(0);
    expect(one.independent_origin_count).toBe(0);
  });

  it('corpus + Epoch: Epoch is displayed but non-counting — still suppressed', () => {
    const two = scoreCompany({ id: 'meta', sources: [corpusSource(), epochSource()] });
    expect(two.scores_suppressed).toBe(true);
    expect(two.source_count).toBe(1);
    expect(two.independent_origin_count).toBe(1);
  });

  it('two counting rows with distinct origins still cross the floor', () => {
    const two = scoreCompany({
      id: 'meta',
      sources: [
        corpusSource(),
        corpusSource({
          id: 'meta_warn_2025_001',
          origin_id: 'official_warn:meta_warn_2025_001',
          type: 'warn_notice',
        }),
      ],
    });
    expect(two.scores_suppressed).toBe(false);
    expect(two.independent_origin_count).toBe(2);
  });
});
