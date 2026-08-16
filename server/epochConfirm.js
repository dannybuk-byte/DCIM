/**
 * Stage B — wire the Epoch AI confirm feed into the two-source gate.
 *
 * This module ONLY appends Epoch source records (produced by
 * scripts/epoch_ingest/ingest_epoch.py) onto candidates that already exist in the
 * corpus, and computes a lead time from the real Epoch public-visibility timeline.
 *
 * It deliberately does NOT touch the floor. MIN_SOURCES_FOR_SCORES and the
 * independent-origin count (countIndependentOrigins) remain the sole authority
 * in scoringEngine.js. A candidate becomes corroborated only by reaching >= 2
 * independent origins; Epoch is displayable support and never counts toward the bar.
 *
 * Independence is by SOURCE, not by row: an Epoch record whose id already appears on
 * the candidate is not appended again, so duplicating one Epoch site cannot manufacture
 * a second source.
 */

import fs from 'fs';
import path from 'path';

export const EPOCH_CONFIRM_TYPE = 'epoch_ai_data_center';

/**
 * Load {company_id: [epoch source record]} from the ingest artifact.
 * Missing/invalid artifact -> {} (no Epoch corroboration; everything stays as-is).
 * @param {{cwd?: string}} [opts]
 * @returns {Record<string, object[]>}
 */
export function loadEpochConfirmSources({ cwd = process.cwd() } = {}) {
  const p = process.env.EPOCH_CONFIRM_PATH
    ? path.resolve(cwd, process.env.EPOCH_CONFIRM_PATH)
    : path.join(cwd, 'www_pipeline_out', 'epoch_confirm_sources.json');
  try {
    const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
    return (parsed && parsed.confirm_sources) || {};
  } catch {
    return {};
  }
}

/**
 * Append Epoch confirm sources onto matched candidates, deduped by source id.
 * @param {object[]} companies
 * @param {Record<string, object[]>} confirmSources
 * @returns {object[]} new company objects (inputs not mutated)
 */
export function mergeEpochConfirmSources(companies, confirmSources) {
  return companies.map(company => {
    const extra = confirmSources[company.id] || [];
    if (extra.length === 0) return company;

    const existing = company.sources || [];
    // Independence by id: seed with ids already on the candidate, then add each Epoch
    // record at most once. Two rows for one site share an id => counted once.
    const seen = new Set(existing.map(s => s.id));
    const appended = [];
    for (const record of extra) {
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      // Ruling 3 (2026-08-05): Epoch is confirmation/support pending a
      // per-family admission dossier — displayed, never floor-counted.
      appended.push({ ...record, counts_toward_floor: false });
    }
    if (appended.length === 0) return company;
    return { ...company, sources: [...existing, ...appended] };
  });
}

function daysBetween(fromIso, toIso) {
  return Math.round((new Date(toIso).getTime() - new Date(fromIso).getTime()) / 86400000);
}

/**
 * Lead-time ladder for a candidate (Stage C). For each Epoch site with an operational
 * public-visibility date, the lead is that date minus the candidate's earliest real
 * corpus detection date. Positive => the corpus signal predates public visibility (the
 * instrument was early on that site); negative => the site was already public before our
 * earliest signal. Both are reported honestly — no single min/max headline is
 * cherry-picked, and a site that was operational long before detection is not hidden.
 *
 * Returns null (lead-time display degrades gracefully, no fabrication) when there is no
 * corpus detection date or no Epoch site with a public-visibility date.
 * @param {object} company
 * @returns {{
 *   detection_date: string,
 *   epoch_site_count: number,
 *   sites_flagged_before_public: number,
 *   lead_days_range: [number, number],
 *   ladder: Array<{site_name: string, public_visibility_date: string, public_visibility_kind: string|null, lead_time_days: number}>
 * } | null}
 */
export function computeLeadTime(company) {
  const sources = company.sources || [];
  const detectionDates = sources
    .filter(s => s.type !== EPOCH_CONFIRM_TYPE && s.date)
    .map(s => s.date)
    .sort();
  if (detectionDates.length === 0) return null;
  const detection = detectionDates[0];

  const ladder = sources
    .filter(s => s.type === EPOCH_CONFIRM_TYPE && s.public_visibility_date)
    .map(s => ({
      site_name: s.site_name || s.id,
      public_visibility_date: s.public_visibility_date,
      public_visibility_kind: s.public_visibility_kind || null,
      lead_time_days: daysBetween(detection, s.public_visibility_date),
    }))
    .sort((a, b) => a.public_visibility_date.localeCompare(b.public_visibility_date));
  if (ladder.length === 0) return null;

  const leads = ladder.map(x => x.lead_time_days);
  return {
    detection_date: detection,
    epoch_site_count: ladder.length,
    sites_flagged_before_public: leads.filter(d => d > 0).length,
    lead_days_range: [Math.min(...leads), Math.max(...leads)],
    ladder,
  };
}

/**
 * Provenance rollup for the LIVE/DESIGN honesty layer (Stage D).
 * @param {object} company
 * @returns {{real_source_count: number, has_epoch_confirm: boolean, provenance: 'real'|'synthetic'|'mixed'}}
 */
export function summarizeProvenance(company) {
  const sources = company.sources || [];
  const provs = new Set(sources.map(s => s.provenance || (s.synthetic ? 'synthetic' : 'real')));
  const realCount = sources.filter(
    s => (s.provenance || 'real') === 'real',
  ).length;
  let provenance = 'real';
  if (provs.has('synthetic') && provs.has('real')) provenance = 'mixed';
  else if (provs.has('synthetic')) provenance = 'synthetic';
  return {
    real_source_count: realCount,
    has_epoch_confirm: sources.some(s => s.type === EPOCH_CONFIRM_TYPE),
    provenance,
  };
}
