/**
 * Deterministic demo-mode BGP / network-risk fields (no live ingestion).
 * Same inputs → same outputs for reproducible demos.
 */

import type { Facility } from '../types';

export type TransitDependency = 'low' | 'medium' | 'high';

/** Mix id with salt → [0, 1) */
function mix(id: number, salt: number): number {
  let x = Math.imul(id ^ salt, 0x9e3779b9);
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b);
  x ^= x >>> 13;
  return (x >>> 0) / 0xffffffff;
}

function complianceRiskScore(status: Facility['complianceStatus']): number {
  switch (status) {
    case 'Non-Compliant':
      return 88;
    case 'At Risk':
      return 52;
    case 'Unknown':
      return 38;
    default:
      return 14;
  }
}

function subsidyGapRiskScore(subsidyGap: number): number {
  const cap = 75_000_000;
  return Math.min(100, Math.round((Math.max(0, subsidyGap) / cap) * 100));
}

export interface DemoBgpComputed {
  bgpRiskScore: number;
  asnCount: number;
  routeChangeRate: number;
  latencyAnomalyScore: number;
  transitDependency: TransitDependency;
  infrastructureAccountabilityRisk: number;
}

/**
 * Demo BGP metrics + combined Infrastructure Accountability Risk (0–100).
 */
export function computeDemoBgpFields(
  id: number,
  subsidyGap: number,
  complianceStatus: Facility['complianceStatus'],
): DemoBgpComputed {
  const asnCount = 2 + Math.floor(mix(id, 11) * 14);
  const routeChangeRate = Math.round(mix(id, 17) * 1000) / 100;
  const latencyAnomalyScore = Math.round(mix(id, 23) * 100);
  const bgpRiskScore = Math.round(18 + mix(id, 29) * 72);

  let transitDependency: TransitDependency = 'low';
  const td = mix(id, 41);
  if (td > 0.72) transitDependency = 'high';
  else if (td > 0.38) transitDependency = 'medium';

  const cr = complianceRiskScore(complianceStatus);
  const sr = subsidyGapRiskScore(subsidyGap);
  const infrastructureAccountabilityRisk = Math.round((cr + bgpRiskScore + sr) / 3);

  return {
    bgpRiskScore,
    asnCount,
    routeChangeRate,
    latencyAnomalyScore,
    transitDependency,
    infrastructureAccountabilityRisk,
  };
}

/**
 * Pick the operator whose single worst facility has the highest combined score of
 * demo BGP risk, compliance risk, and subsidy-gap risk (same 3-way average as seeded rows).
 */
export function getTopFindingProviderByCompoundRisk(
  facilities: Facility[],
): { operator: string; score: number } | null {
  if (facilities.length === 0) return null;

  const worstPerOperator = new Map<string, number>();

  for (const f of facilities) {
    const op = f.operator || 'Unknown';
    const bgp = f.bgpRiskScore ?? 0;
    const comp = complianceRiskScore(f.complianceStatus);
    const sub = subsidyGapRiskScore(f.subsidyGap ?? 0);
    const triple = Math.round((bgp + comp + sub) / 3);
    const prev = worstPerOperator.get(op) ?? 0;
    worstPerOperator.set(op, Math.max(prev, triple));
  }

  let best: { operator: string; score: number } | null = null;
  for (const [operator, score] of worstPerOperator) {
    if (!best || score > best.score) {
      best = { operator, score };
    }
  }

  return best;
}

/** Plain-English hover hints (demo signals only). */
export const BGP_FIELD_HELP = {
  bgpRiskScore:
    'Demo score (0–100): how unstable or exposed internet routing looks for this site in our sample model—not live BGP.',
  routeChangeRate:
    'How often routes appear to churn in the demo dataset. Higher numbers suggest more volatility in the model.',
  latencyAnomalyScore:
    'Demo indicator that traffic timing looks unusual vs a baseline—useful as a flag, not a live measurement.',
  transitDependency:
    'Whether this site leans on outside carriers for connectivity in the demo model (low / medium / high).',
  infrastructureAccountabilityRisk:
    'Single blended score mixing compliance pressure, demo routing risk, and subsidy-gap pressure (0–100).',
} as const;

/** High BGP + meaningful compliance concern + meaningful subsidy gap (seeded data only). */
export function meetsCombinedComplianceRoutingRisk(f: Facility): boolean {
  const bgpHigh = (f.bgpRiskScore ?? 0) >= 56;
  const complianceHigh =
    f.complianceStatus === 'Non-Compliant' || f.complianceStatus === 'At Risk';
  const gapHigh = (f.subsidyGap ?? 0) >= 2_500_000;
  return bgpHigh && complianceHigh && gapHigh;
}

export function worstFacilityForOperator(
  facilities: Facility[],
  operator: string,
): Facility | undefined {
  const rows = facilities.filter(f => (f.operator || 'Unknown') === operator);
  if (rows.length === 0) return undefined;
  return [...rows].sort(
    (a, b) =>
      (b.infrastructureAccountabilityRisk ?? 0) - (a.infrastructureAccountabilityRisk ?? 0),
  )[0];
}

/** Demo-only external-transit share for plain-English drilldown (deterministic per facility id). */
export function demoTransitExternalPercent(f: Facility): number {
  const td = f.transitDependency ?? 'medium';
  const r = mix(f.id, 47);
  if (td === 'high') return Math.round(58 + r * 20);
  if (td === 'medium') return Math.round(30 + r * 18);
  return Math.round(9 + r * 14);
}

/** Demo-only count of primary upstream / transit paths shown in drilldown copy. */
export function demoPrimaryTransitPathCount(f: Facility): number {
  const td = f.transitDependency ?? 'medium';
  if (td === 'high') return 2;
  return 1 + Math.floor(mix(f.id, 61) * 2);
}

function demoAsnExposure(f: Facility): number {
  return f.asnCount ?? 2 + Math.floor(mix(f.id, 11) * 14);
}

function routeStabilityLine(f: Facility): string {
  const r = f.routeChangeRate ?? 0;
  if (r >= 8) {
    return `Volatile — ${r.toFixed(1)} route-change index (last 30d demo window)`;
  }
  if (r >= 6) {
    return `Frequent changes — index ${r.toFixed(1)} (last 30d demo window)`;
  }
  if (r >= 3.5) {
    return `Moderate churn — index ${r.toFixed(1)} (last 30d demo window)`;
  }
  return `Stable-ish in demo model — index ${r.toFixed(1)} (last 30d demo window)`;
}

const EAST_COAST_STATES = new Set([
  'NY',
  'NJ',
  'PA',
  'VA',
  'MD',
  'DC',
  'NC',
  'SC',
  'GA',
  'FL',
  'MA',
  'CT',
  'DE',
  'RI',
]);

function latencyPathLine(f: Facility): string {
  const lat = f.latencyAnomalyScore ?? 0;
  const region = EAST_COAST_STATES.has(f.state)
    ? 'East Coast entry and coastal paths'
    : 'West / central regional paths';
  return `Latency anomalies skew toward ${region} (demo score ${lat})`;
}

function routeChangeSignalLine(f: Facility): string {
  const r = f.routeChangeRate ?? 0;
  return `Route table churn — index ${r.toFixed(1)} in the demo window (${r >= 6 ? 'above typical churn' : 'within mixed volatility'})`;
}

function congestionSignalLine(f: Facility): string {
  const bgp = f.bgpRiskScore ?? 0;
  const lat = f.latencyAnomalyScore ?? 0;
  if (bgp >= 60 && lat >= 55) {
    return `Congestion-style pressure — BGP ${bgp} and latency ${lat} rise together in the demo composite`;
  }
  if (bgp >= 56) {
    return `Congestion-style strain flagged (BGP ${bgp}; latency ${lat})`;
  }
  return `Mixed congestion signal — BGP ${bgp}, latency ${lat} (demo)`;
}

export interface BgpDrilldownSections {
  routingProfile: string[];
  observedSignals: string[];
  interpretation: string;
  recommendedInvestigation: string[];
}

export function buildBgpFacilityDrilldownSections(f: Facility): BgpDrilldownSections {
  const td = f.transitDependency ?? 'medium';
  const pct = demoTransitExternalPercent(f);
  const paths = demoPrimaryTransitPathCount(f);
  const tier =
    td === 'high' ? 'High' : td === 'medium' ? 'Medium' : td === 'low' ? 'Low' : 'Unknown';

  const routingProfile = [
    `ASN exposure: ${demoAsnExposure(f)} upstream / peer networks (demo model)`,
    `Transit dependency: ${tier} · ~${pct}% via ${paths} primary transit path${paths === 1 ? '' : 's'} (demo)`,
    `Route stability: ${routeStabilityLine(f)}`,
  ];

  const observedSignals = [latencyPathLine(f), routeChangeSignalLine(f), congestionSignalLine(f)];

  const interpretation =
    td === 'high'
      ? `This facility leans on external transit (~${pct}% in the demo profile) and shows visible route churn, so upstream routing shifts can quickly surface as latency or outages for users and commitments tied to this site.`
      : td === 'medium'
        ? `This facility mixes owned paths with meaningful transit share (~${pct}% demo), meaning carrier-side instability still propagates even when the site is not “max transit.”`
        : `This facility is modeled with lower transit share (~${pct}%), but the scores below highlight where to verify real contracts, failover, and whether latency spikes line up with routing changes.`;

  const recommendedInvestigation = [
    'Map upstream / transit providers to contracts, SLAs, and failover commitments.',
    'Review recent routing-change windows (internal logs + carrier notices) next to latency spikes.',
    'Compare regions (East vs West footprint) before locking a single site as the root cause.',
  ];

  return { routingProfile, observedSignals, interpretation, recommendedInvestigation };
}

export function buildBgpProviderDrilldownSections(
  operator: string,
  portfolio: Facility[],
  representative: Facility,
): BgpDrilldownSections {
  const n = portfolio.length;
  const sum = (pick: (x: Facility) => number) =>
    portfolio.reduce((s, x) => s + pick(x), 0);
  const avgBgp = sum(x => x.bgpRiskScore ?? 0) / Math.max(1, n);
  const avgRoute = sum(x => x.routeChangeRate ?? 0) / Math.max(1, n);
  const avgLat = sum(x => x.latencyAnomalyScore ?? 0) / Math.max(1, n);
  const highTransitN = portfolio.filter(x => x.transitDependency === 'high').length;
  const maxRoute = Math.max(0, ...portfolio.map(x => x.routeChangeRate ?? 0));
  const avgAsn = Math.round(sum(x => demoAsnExposure(x)) / Math.max(1, n));
  const repPct = demoTransitExternalPercent(representative);
  const repPaths = demoPrimaryTransitPathCount(representative);
  const repTier =
    representative.transitDependency === 'high'
      ? 'High'
      : representative.transitDependency === 'medium'
        ? 'Medium'
        : representative.transitDependency === 'low'
          ? 'Low'
          : 'Unknown';

  const routingProfile = [
    `ASN exposure: portfolio avg ${avgAsn} upstream / peers (demo); representative site ${representative.name} shows ${demoAsnExposure(representative)}`,
    `Transit dependency: representative ${repTier} (~${repPct}% via ${repPaths} primary path${repPaths === 1 ? '' : 's'}, demo) · ${highTransitN} of ${n} portfolio sites flagged high transit`,
    `Route stability: portfolio avg index ${avgRoute.toFixed(1)} — peak ${maxRoute.toFixed(1)} on hottest site (last 30d demo window)`,
  ];

  const latHot = portfolio.filter(x => (x.latencyAnomalyScore ?? 0) >= 52).length;
  const observedSignals = [
    `Latency anomalies: portfolio avg demo score ${avgLat.toFixed(0)} · ${latHot} of ${n} sites above the mid-high demo threshold`,
    `Route changes: average churn ${avgRoute.toFixed(1)} with spikes to ${maxRoute.toFixed(1)} — correlates with BGP ranking noise across the operator`,
    congestionSignalLine(representative),
  ];

  const interpretation = `${operator} ranks high here because average demo BGP risk is ${avgBgp.toFixed(1)} across ${n} sites and ${highTransitN} of them show high transit reliance, so churn or congestion at shared upstream carriers can hit multiple locations at once. Representative site ${representative.name} anchors the drill-down because it carries the worst composite row and peaks route churn at ${maxRoute.toFixed(1)}.`;

  const recommendedInvestigation = [
    `Trace upstream / transit relationships for ${operator} — prioritize carriers shared by the ${highTransitN} high-transit sites.`,
    'Pull routing-change timelines for the peak-churn sites and line them up with regional latency reports.',
    'Compare East vs West (and other regions) in your footprint before treating one facility as isolated.',
  ];

  return { routingProfile, observedSignals, interpretation, recommendedInvestigation };
}

export function suggestedActionsForFacility(f: Facility): string[] {
  const out: string[] = [];
  if (f.transitDependency === 'high' || (f.bgpRiskScore ?? 0) >= 58) {
    out.push('Request routing dependency disclosure');
  }
  if ((f.subsidyGap ?? 0) >= 1_000_000 || f.complianceStatus !== 'Compliant') {
    out.push('Ask for subsidy compliance documentation');
  }
  if ((f.bgpRiskScore ?? 0) >= 62 || (f.routeChangeRate ?? 0) >= 7) {
    out.push('Flag for technical review');
  }
  if (out.length < 2) {
    out.push('Compare against public commitments');
  }
  return [...new Set(out)].slice(0, 2);
}

export function formatBgpClipboardSummary(
  f: Facility,
  opts?: { headlineName?: string },
): string {
  const name = opts?.headlineName ?? f.name;
  const actions = suggestedActionsForFacility(f);
  const step = actions[0] ?? 'Compare against public commitments';
  const bgp = f.bgpRiskScore ?? 0;
  const routes = (f.routeChangeRate ?? 0).toFixed(1);
  const lat = f.latencyAnomalyScore ?? 0;
  const gapM = ((f.subsidyGap ?? 0) / 1e6).toFixed(1);
  return `${name} is missing job targets and depends on unstable network routing. That combination increases the risk that performance issues or outages will affect already under-delivered commitments. Key signals: BGP risk ${bgp}, route changes ${routes}, latency anomaly ${lat}, subsidy gap $${gapM}M. Suggested next step: ${step}.`;
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

export async function copyBgpSummaryToClipboard(
  f: Facility,
  opts?: { headlineName?: string },
): Promise<boolean> {
  return copyTextToClipboard(formatBgpClipboardSummary(f, opts));
}
