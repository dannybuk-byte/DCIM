import React, { useMemo, useState, useCallback } from 'react';
import { RadioTower, MapPin, Building2, Copy, Check } from 'lucide-react';
import type { Facility } from '../types';
import {
  BGP_FIELD_HELP,
  buildBgpFacilityDrilldownSections,
  buildBgpProviderDrilldownSections,
  copyBgpSummaryToClipboard,
  getTopFindingProviderByCompoundRisk,
  meetsCombinedComplianceRoutingRisk,
  suggestedActionsForFacility,
  worstFacilityForOperator,
} from '../utils/bgpDemo';

interface BGPAnalysisViewProps {
  facilities: Facility[];
  onSelect: (f: Facility) => void;
  isFullscreen?: boolean;
}

type DrillTarget =
  | { kind: 'facility'; facility: Facility }
  | { kind: 'provider'; operator: string; representative: Facility };

/**
 * Demo-mode BGP / network-risk dashboard (seeded fields only).
 */
export const BGPAnalysisView: React.FC<BGPAnalysisViewProps> = ({
  facilities,
  onSelect,
  isFullscreen = false,
}) => {
  const pad = isFullscreen ? 'p-4' : 'p-6';
  const [drill, setDrill] = useState<DrillTarget | null>(null);
  const [copyOk, setCopyOk] = useState(false);

  const providerRiskRows = useMemo(() => {
    const m = new Map<string, { sum: number; n: number }>();
    for (const f of facilities) {
      const op = f.operator || 'Unknown';
      const row = m.get(op) || { sum: 0, n: 0 };
      row.sum += f.bgpRiskScore ?? 0;
      row.n += 1;
      m.set(op, row);
    }
    return [...m.entries()]
      .map(([operator, { sum, n }]) => ({
        operator,
        avgBgp: sum / Math.max(1, n),
        count: n,
      }))
      .sort((a, b) => b.avgBgp - a.avgBgp)
      .slice(0, 12);
  }, [facilities]);

  const frequentRouteChanges = useMemo(
    () =>
      [...facilities]
        .sort((a, b) => (b.routeChangeRate ?? 0) - (a.routeChangeRate ?? 0))
        .slice(0, 12),
    [facilities],
  );

  const highTransit = useMemo(
    () =>
      facilities
        .filter(f => f.transitDependency === 'high')
        .sort((a, b) => (b.bgpRiskScore ?? 0) - (a.bgpRiskScore ?? 0))
        .slice(0, 12),
    [facilities],
  );

  const latencyHotspots = useMemo(
    () =>
      [...facilities]
        .sort((a, b) => (b.latencyAnomalyScore ?? 0) - (a.latencyAnomalyScore ?? 0))
        .slice(0, 12),
    [facilities],
  );

  const combinedComplianceRouting = useMemo(() => {
    return facilities
      .filter(meetsCombinedComplianceRoutingRisk)
      .sort(
        (a, b) =>
          (b.infrastructureAccountabilityRisk ?? 0) - (a.infrastructureAccountabilityRisk ?? 0),
      )
      .slice(0, 18);
  }, [facilities]);

  const topFindingProvider = useMemo(
    () => getTopFindingProviderByCompoundRisk(facilities),
    [facilities],
  );

  const metricsFacility = drill
    ? drill.kind === 'provider'
      ? drill.representative
      : drill.facility
    : null;

  const drillSections = useMemo(() => {
    if (!drill || !metricsFacility) return null;
    if (drill.kind === 'facility') {
      return buildBgpFacilityDrilldownSections(drill.facility);
    }
    const portfolio = facilities.filter(f => (f.operator || 'Unknown') === drill.operator);
    return buildBgpProviderDrilldownSections(drill.operator, portfolio, drill.representative);
  }, [drill, metricsFacility, facilities]);

  const handleCopySummary = useCallback(async () => {
    if (!metricsFacility || !drill) return;
    const headlineName = drill.kind === 'provider' ? drill.operator : undefined;
    const ok = await copyBgpSummaryToClipboard(metricsFacility, { headlineName });
    setCopyOk(ok);
    setTimeout(() => setCopyOk(false), 2200);
  }, [drill, metricsFacility]);

  const facilityRow = (f: Facility, extras: string, showActionHints?: boolean) => {
    const actions = showActionHints ? suggestedActionsForFacility(f) : [];
    return (
      <div key={f.id} className="space-y-1">
        <button
          type="button"
          onClick={() => setDrill({ kind: 'facility', facility: f })}
          className="w-full text-left p-3 rounded-lg border border-[#00d2d3]/20 bg-[#0d1219] hover:border-[#00d2d3]/50 hover:bg-[#00d2d3]/5 transition-colors"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-white truncate">{f.name}</div>
              <div className="text-[10px] text-gray-500 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0">
                <span className="inline-flex items-center gap-1">
                  <MapPin size={10} className="text-gray-600 shrink-0" />
                  {f.city}, {f.state}
                </span>
                <span className="inline-flex items-center gap-1 truncate">
                  <Building2 size={10} className="text-gray-600 shrink-0" />
                  <span className="truncate">{f.operator}</span>
                </span>
              </div>
            </div>
            <div className="text-[10px] text-[#00d2d3] whitespace-nowrap" title={extras}>
              {extras}
            </div>
          </div>
        </button>
        {showActionHints && actions.length > 0 ? (
          <p className="text-[10px] text-gray-500 leading-snug px-1">
            <span className="text-gray-600">Suggested:</span> {actions.join(' · ')}
          </p>
        ) : null}
      </div>
    );
  };

  const sectionHelp = (text: string) => ({ title: text } as const);

  return (
    <div className={`min-h-0 h-full overflow-x-hidden overflow-y-visible ${pad}`}>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <RadioTower size={22} className="text-[#00d2d3]" />
            <h2 className="text-lg font-bold text-white">BGP & network risk (demo)</h2>
          </div>
          <p className="text-sm text-gray-300 leading-relaxed">
            Which data center providers show routing, congestion, or external network dependency risk?
            Use the sections below to compare demo-mode signals—no live BGP feeds.
          </p>
          <p className="mt-3 text-[11px] leading-snug text-gray-500 border-l-2 border-[#00d2d3]/40 pl-2">
            BGP signals shown here are demo-mode network-risk indicators. They model routing
            instability, congestion, and external dependency risk; live BGP ingestion is a future
            stage.
          </p>
          <p className="mt-2 text-[11px] text-gray-500 leading-snug">
            <span className="text-gray-400 font-semibold" title={BGP_FIELD_HELP.infrastructureAccountabilityRisk}>
              Infrastructure Accountability Risk
            </span>{' '}
            (0–100) blends compliance pressure, demo BGP risk, and subsidy-gap pressure using the same
            seeded formula as the database—normalized placeholders for accountability storytelling only.
          </p>
        </div>

        {topFindingProvider ? (
          <p className="mb-1 border-l-2 border-[#00d2d3]/40 pl-2 text-[11px] leading-snug text-gray-500">
            Top finding: {topFindingProvider.operator} is both missing job targets and showing
            unstable network routing.
          </p>
        ) : null}

        <section className="space-y-2">
          <h3
            className="text-xs font-bold text-[#ffa502] uppercase tracking-wide cursor-help border-b border-[#ffa502]/20 pb-1"
            {...sectionHelp(
              'Sites that simultaneously show elevated demo BGP risk, strained compliance status, and a large subsidy gap.',
            )}
          >
            Combined Compliance + Routing Risk
          </h3>
          <p className="text-[11px] text-gray-500 leading-snug">
            Facilities must meet demo thresholds for{' '}
            <span title={BGP_FIELD_HELP.bgpRiskScore}>high BGP risk</span>,{' '}
            <span title="Non-compliant or at-risk status in the seeded ledger.">high compliance concern</span>, and{' '}
            <span title="Large dollar gap between subsidies and outcomes in the demo model.">high subsidy gap</span>{' '}
            simultaneously.
          </p>
          {combinedComplianceRouting.length === 0 ? (
            <p className="text-[11px] text-gray-500">No facilities match all three demo thresholds.</p>
          ) : (
            <div className="grid gap-2">
              {combinedComplianceRouting.map(f =>
                facilityRow(
                  f,
                  `BGP ${f.bgpRiskScore ?? 0} · $${((f.subsidyGap ?? 0) / 1e6).toFixed(1)}M`,
                  true,
                ),
              )}
            </div>
          )}
        </section>

        <section className="space-y-2">
          <h3
            className="text-xs font-bold text-[#00d2d3] uppercase tracking-wide cursor-help"
            {...sectionHelp('Operators ranked by average demo BGP risk score across their sites.')}
          >
            Highest BGP risk providers
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {providerRiskRows.map(row => {
              const rep = worstFacilityForOperator(facilities, row.operator);
              const rowActions = rep ? suggestedActionsForFacility(rep) : [];
              return (
                <button
                  key={row.operator}
                  type="button"
                  onClick={() => {
                    if (rep) {
                      setDrill({ kind: 'provider', operator: row.operator, representative: rep });
                    }
                  }}
                  className="text-left p-3 rounded-lg border border-[#00d2d3]/15 bg-[#0a0e17] hover:border-[#00d2d3]/40 transition-colors"
                >
                  <div className="text-sm font-semibold text-white truncate">{row.operator}</div>
                  <div className="text-[11px] text-gray-400 mt-1">
                    Avg demo BGP risk {row.avgBgp.toFixed(1)} · {row.count.toLocaleString()} sites
                  </div>
                  {rowActions.length > 0 ? (
                    <p className="text-[10px] text-gray-500 mt-2 leading-snug">
                      <span className="text-gray-600">Suggested:</span> {rowActions.join(' · ')}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <section className="space-y-2">
          <h3
            className="text-xs font-bold text-[#00d2d3] uppercase tracking-wide cursor-help"
            {...sectionHelp(BGP_FIELD_HELP.routeChangeRate)}
          >
            Facilities with frequent route changes
          </h3>
          <div className="grid gap-2">
            {frequentRouteChanges.map(f =>
              facilityRow(f, `Δ routes ${(f.routeChangeRate ?? 0).toFixed(1)}`),
            )}
          </div>
        </section>

        <section className="space-y-2">
          <h3
            className="text-xs font-bold text-[#00d2d3] uppercase tracking-wide cursor-help"
            {...sectionHelp(BGP_FIELD_HELP.transitDependency)}
          >
            High transit dependency
          </h3>
          <div className="grid gap-2">
            {highTransit.map(f => facilityRow(f, `BGP ${f.bgpRiskScore ?? 0}`))}
          </div>
        </section>

        <section className="space-y-2">
          <h3
            className="text-xs font-bold text-[#00d2d3] uppercase tracking-wide cursor-help"
            {...sectionHelp(BGP_FIELD_HELP.latencyAnomalyScore)}
          >
            Latency anomaly hotspots
          </h3>
          <div className="grid gap-2">
            {latencyHotspots.map(f => facilityRow(f, `Latency ${f.latencyAnomalyScore ?? 0}`))}
          </div>
        </section>

        {drill && metricsFacility ? (
          <div
            className="rounded-lg border border-[#00d2d3]/35 bg-[#0a0e17] p-4 space-y-3 shadow-lg shadow-black/40"
            role="region"
            aria-label="BGP drilldown"
          >
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <div className="text-sm font-bold text-white truncate">
                  {drill.kind === 'provider' ? drill.operator : drill.facility.name}
                </div>
                {drill.kind === 'provider' ? (
                  <div className="text-[11px] text-gray-400 mt-0.5 truncate">
                    Representative site: {drill.representative.name}
                  </div>
                ) : null}
              </div>
              <button
                type="button"
                onClick={() => setDrill(null)}
                className="shrink-0 text-[11px] text-gray-400 hover:text-white border border-gray-600 rounded px-2 py-0.5"
              >
                Close
              </button>
            </div>

            {drillSections ? (
              <div className="space-y-3 text-[12px] text-gray-300 leading-relaxed border-l-2 border-[#00d2d3]/30 pl-2">
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Routing Profile
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-300">
                    {drillSections.routingProfile.map(line => (
                      <li key={line}>
                        <span className="text-gray-200">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Observed Signals
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-300">
                    {drillSections.observedSignals.map(line => (
                      <li key={line}>
                        <span className="text-gray-200">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Interpretation
                  </div>
                  <p className="text-[11px] text-gray-300 leading-snug">{drillSections.interpretation}</p>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                    Recommended Investigation
                  </div>
                  <ul className="list-disc list-inside space-y-1 text-[11px] text-gray-300">
                    {drillSections.recommendedInvestigation.map(line => (
                      <li key={line}>
                        <span className="text-gray-200">{line}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : null}

            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
              <div>
                <dt className="text-gray-500" title={BGP_FIELD_HELP.bgpRiskScore}>
                  BGP risk score
                </dt>
                <dd className="text-white font-mono">{metricsFacility.bgpRiskScore ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500" title={BGP_FIELD_HELP.routeChangeRate}>
                  Route change rate
                </dt>
                <dd className="text-white font-mono">{(metricsFacility.routeChangeRate ?? 0).toFixed(1)}</dd>
              </div>
              <div>
                <dt className="text-gray-500" title={BGP_FIELD_HELP.latencyAnomalyScore}>
                  Latency anomaly score
                </dt>
                <dd className="text-white font-mono">{metricsFacility.latencyAnomalyScore ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500" title={BGP_FIELD_HELP.transitDependency}>
                  Transit dependency
                </dt>
                <dd className="text-white capitalize">{metricsFacility.transitDependency ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Subsidy gap</dt>
                <dd className="text-[#ff4757] font-mono">
                  ${((metricsFacility.subsidyGap ?? 0) / 1e6).toFixed(1)}M
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Compliance status</dt>
                <dd className="text-white">{metricsFacility.complianceStatus}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-gray-500" title={BGP_FIELD_HELP.infrastructureAccountabilityRisk}>
                  Infrastructure accountability risk
                </dt>
                <dd className="text-[#ffa502] font-mono">
                  {metricsFacility.infrastructureAccountabilityRisk ?? '—'}
                </dd>
              </div>
            </dl>

            <div>
              <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">
                Suggested actions
              </div>
              <ul className="list-disc list-inside text-[11px] text-gray-300 space-y-0.5">
                {suggestedActionsForFacility(metricsFacility).map(a => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="button"
                onClick={handleCopySummary}
                className="inline-flex items-center gap-1.5 rounded border border-[#00d2d3]/50 bg-[#00d2d3]/10 px-3 py-1.5 text-[11px] font-semibold text-[#00d2d3] hover:bg-[#00d2d3]/20"
              >
                {copyOk ? <Check size={14} /> : <Copy size={14} />}
                {copyOk ? 'Copied' : 'Copy summary'}
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelect(metricsFacility);
                  setDrill(null);
                }}
                className="inline-flex items-center gap-1.5 rounded border border-gray-600 px-3 py-1.5 text-[11px] font-semibold text-gray-300 hover:bg-white/5"
              >
                Use facility in app
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
