/**
 * @vitest-environment node
 *
 * Taskbrief §1.3 / §5: the `epoch_ai_data_center` source-type token surfaces on the
 * scoring `s.type` axis for identity/reporting (`source_types_present[]`), WITHOUT
 * being wired into the floor. And the two-source floor invariant (§2.1) counts raw
 * `sources.length` — byte-for-byte unchanged by any Epoch-token work.
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

describe('§1.3 epoch_ai_data_center token surfaces for reporting', () => {
  it('appears in source_types_present[] for a matched Epoch candidate', () => {
    const company = { id: 'meta', name: 'Meta', sources: [corpusSource(), epochSource()] };
    const scored = scoreCompany(company);
    expect(scored.source_types_present).toContain('epoch_ai_data_center');
  });

  it('computeSourceTypesPresent reports the token as its own type', () => {
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

describe('§2.1 floor invariant counts raw sources.length, unchanged', () => {
  it('one source (Epoch or otherwise) is suppressed', () => {
    const one = scoreCompany({ id: 'meta', sources: [epochSource()] });
    expect(one.scores_suppressed).toBe(true);
    expect(one.source_count).toBe(1);
  });

  it('two raw sources cross the floor regardless of type', () => {
    const two = scoreCompany({ id: 'meta', sources: [corpusSource(), epochSource()] });
    expect(two.scores_suppressed).toBe(false);
    expect(two.source_count).toBe(2); // === sources.length
  });
});
