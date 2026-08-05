/**
 * @vitest-environment node
 *
 * S1 acceptance assertions (taskbrief §6) for the Epoch confirm feed and the
 * two-source gate. These are the machine-checkable sign-off backing:
 *
 *   §6.1  one real source            -> withheld (scores_suppressed), signal still present
 *   §6.2  corpus source + Epoch      -> RE-RULED 2026-08-05 (ruling 3): Epoch is displayed
 *         confirmation with lead time but is non-counting; candidate stays withheld
 *   §6.3  two Epoch rows, same site  -> one source, single-source candidate stays withheld
 *   §6.6  real vs synthetic provenance is queryable; Epoch rows carry CC-BY attribution
 *
 * Note (Option 1 scope): the taskbrief's §6.2 pairs include {BGP+Epoch}/{CT+Epoch}.
 * Recon established BGP/CT are live UI detectors NOT wired into the gate, so under the
 * ratified Option 1 the tested corroboration pair is {existing real corporate source +
 * Epoch}. BGP/CT-as-gate-source is deferred, not implemented here.
 */
import { describe, expect, it } from 'vitest';
import { scoreCompany } from './scoringEngine.js';
import {
  EPOCH_CONFIRM_TYPE,
  mergeEpochConfirmSources,
  computeLeadTime,
  summarizeProvenance,
} from './epochConfirm.js';

// A realistic single real corporate source (as in the seed corpus).
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

// A real Epoch confirm source, as emitted by the ingest.
function epochSource(overrides = {}) {
  return {
    id: 'epoch_meta_prometheus',
    company_id: 'meta',
    type: EPOCH_CONFIRM_TYPE,
    site_name: 'Meta Prometheus',
    date: '2025-10-14',
    provenance: 'real',
    data_source: 'Epoch AI',
    attribution:
      "Epoch AI, 'AI Data Centers'. Published online at epoch.ai. Retrieved from 'https://epoch.ai/data/ai-data-centers'",
    public_visibility_date: '2025-10-14',
    public_visibility_kind: 'operational',
    size_mw: 631,
    ...overrides,
  };
}

describe('§6.1 single real source is withheld', () => {
  it('one corpus source, no Epoch match -> scores_suppressed, signal still present', () => {
    const company = { id: 'meta', name: 'Meta', sources: [corpusSource()] };
    const merged = mergeEpochConfirmSources([company], /* no confirm sources */ {})[0];
    const scored = scoreCompany(merged);
    expect(scored.scores_suppressed).toBe(true);
    expect(scored.source_count).toBe(1); // the single signal is still counted/shown
  });
});

describe('§6.2 (re-ruled 2026-08-05) corpus source + Epoch: displayed + lead time, but NOT floor-counted', () => {
  it('epoch is non-counting confirmation: still suppressed, one independent origin, lead time computed', () => {
    const company = { id: 'meta', name: 'Meta', sources: [corpusSource()] };
    const confirm = { meta: [epochSource()] };
    const merged = mergeEpochConfirmSources([company], confirm)[0];
    expect(merged.sources).toHaveLength(2);
    // Ruling 3: the merge stamps every appended Epoch row non-counting.
    expect(merged.sources[1].counts_toward_floor).toBe(false);

    const scored = scoreCompany(merged);
    expect(scored.scores_suppressed).toBe(true); // epoch no longer satisfies the floor
    expect(scored.source_count).toBe(2); // row is still present and displayed
    expect(scored.independent_origin_count).toBe(1);

    const lead = computeLeadTime(merged);
    expect(lead).not.toBeNull();
    expect(lead.detection_date).toBe('2025-03-01');
    expect(lead.epoch_site_count).toBe(1);
    expect(lead.ladder[0].site_name).toBe('Meta Prometheus');
    expect(lead.ladder[0].public_visibility_date).toBe('2025-10-14');
    // 2025-03-01 -> 2025-10-14 = 227 days of lead on this site.
    expect(lead.ladder[0].lead_time_days).toBe(227);
    expect(lead.sites_flagged_before_public).toBe(1);
  });

  it('lead time degrades to null (no fabrication) when Epoch has no public-visibility date', () => {
    const company = { id: 'meta', name: 'Meta', sources: [corpusSource()] };
    const confirm = { meta: [epochSource({ public_visibility_date: null })] };
    const merged = mergeEpochConfirmSources([company], confirm)[0];
    expect(computeLeadTime(merged)).toBeNull();
  });
});

describe('§6.3 duplicate Epoch rows preserve independence', () => {
  it('two rows for the same site count as one source; single-source candidate stays withheld', () => {
    // Candidate whose ONLY evidence is one Epoch site, plus a duplicate of that same row.
    const company = { id: 'meta', name: 'Meta', sources: [] };
    const confirm = { meta: [epochSource(), epochSource()] }; // identical id
    const merged = mergeEpochConfirmSources([company], confirm)[0];
    expect(merged.sources).toHaveLength(1); // deduped by id
    const scored = scoreCompany(merged);
    expect(scored.scores_suppressed).toBe(true); // one source => withheld
  });

  it('does not double-count an Epoch row already present on the candidate', () => {
    const company = { id: 'meta', name: 'Meta', sources: [corpusSource(), epochSource()] };
    const confirm = { meta: [epochSource()] }; // same id already on the company
    const merged = mergeEpochConfirmSources([company], confirm)[0];
    expect(merged.sources).toHaveLength(2); // unchanged
  });
});

describe('§6.6 provenance is queryable and Epoch carries CC-BY attribution', () => {
  it('epoch rows are real and attributed', () => {
    const e = epochSource();
    expect(e.provenance).toBe('real');
    expect(e.attribution).toMatch(/Epoch AI/);
  });

  it('summarizeProvenance distinguishes real / synthetic / mixed', () => {
    const real = { sources: [corpusSource(), epochSource()] };
    expect(summarizeProvenance(real).provenance).toBe('real');
    expect(summarizeProvenance(real).has_epoch_confirm).toBe(true);

    const synthetic = { sources: [{ id: 's1', provenance: 'synthetic' }] };
    expect(summarizeProvenance(synthetic).provenance).toBe('synthetic');

    const mixed = { sources: [corpusSource(), { id: 's2', provenance: 'synthetic' }] };
    expect(summarizeProvenance(mixed).provenance).toBe('mixed');
    expect(summarizeProvenance(mixed).real_source_count).toBe(1);
  });
});
