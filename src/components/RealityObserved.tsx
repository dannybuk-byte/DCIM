import { useMemo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Tooltip } from './shared/Tooltip';
import { db, SubsidyAgreement } from '../db/database';
import { Facility } from '../types';
import { Info } from 'lucide-react';
import { useRaceSafeQuery } from '../hooks/useRaceSafeQuery';

interface RealityObservedProps {
  facilityId: number;
}

interface RealityObservedData {
  facility: Facility | null;
  agreement: SubsidyAgreement | null;
}

export function RealityObserved({ facilityId }: RealityObservedProps) {
  const { surface } = useRaceSafeQuery<number, RealityObservedData>({
    key: facilityId,
    keyOf: (id) => id,
    isEmpty: (data) => data.facility == null,
    query: async ({ key, signal }) => {
      const [facilityData, agreementData] = await Promise.all([
        db.facilities.get(key),
        db.subsidyAgreements.where('facilityId').equals(key).first(),
      ]);
      if (signal.aborted) {
        throw new DOMException('Aborted', 'AbortError');
      }
      return {
        facility: facilityData ?? null,
        agreement: agreementData ?? null,
      };
    },
  });

  const facility = surface.data?.facility ?? null;
  const agreement = surface.data?.agreement ?? null;

  const shell = useMemo(
    () => ({
      title: 'REALITY OBSERVED' as const,
    }),
    [],
  );

  if (surface.kind === 'loading') {
    return (
      <ErrorBoundary>
        <div
          className="bg-gray-800 border border-gray-700 rounded-lg p-6"
          data-query-surface="loading"
          data-entity-key={facilityId}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-200">{shell.title}</h3>
          <div className="space-y-3">
            <div className="h-12 bg-gray-900 rounded animate-pulse" />
            <div className="h-12 bg-gray-900 rounded animate-pulse" />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (surface.kind === 'error') {
    return (
      <ErrorBoundary>
        <div
          className="bg-gray-800 border border-gray-700 rounded-lg p-6"
          data-query-surface="error"
          data-entity-key={facilityId}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-200">{shell.title}</h3>
          <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-sm text-red-200">
            {surface.error?.message ?? 'Failed to load facility data'}
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (surface.kind === 'unavailable') {
    return (
      <ErrorBoundary>
        <div
          className="bg-gray-800 border border-gray-700 rounded-lg p-6"
          data-query-surface="unavailable"
          data-entity-key={facilityId}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-200">{shell.title}</h3>
          <div className="p-3 bg-amber-900/20 border border-amber-900/50 rounded text-sm text-amber-100">
            Unavailable: {surface.diagnostic ?? 'Required capability cannot be used'}
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (surface.kind === 'empty') {
    return (
      <ErrorBoundary>
        <div
          className="bg-gray-800 border border-gray-700 rounded-lg p-6"
          data-query-surface="empty"
          data-entity-key={facilityId}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-200">{shell.title}</h3>
          <div className="p-3 bg-gray-900/60 border border-gray-700 rounded text-sm text-gray-300">
            No facility record for this selection.
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // ready | stale | partial | insufficient — show data when present
  if (!facility) {
    // Defensive: ready/stale without facility should not occur if isEmpty is correct
    return (
      <ErrorBoundary>
        <div
          className="bg-gray-800 border border-gray-700 rounded-lg p-6"
          data-query-surface={surface.kind}
          data-entity-key={facilityId}
        >
          <h3 className="text-lg font-semibold mb-4 text-gray-200">{shell.title}</h3>
          <div className="p-3 bg-gray-900/60 border border-gray-700 rounded text-sm text-gray-300">
            No facility record for this selection.
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // DESIGN placeholder — synthetic only. Not OSINT, not facility-sourced (R-F6).
  // Do not derive compliance / delivery math from this value.
  const DESIGN_PLACEHOLDER_EMPLOYMENT = 23 as const;
  const promisedJobs = agreement?.promisedJobs || 0;

  return (
    <ErrorBoundary>
      <div
        className="bg-gray-800 border border-gray-700 rounded-lg p-6"
        data-query-surface={surface.kind}
        data-entity-key={facilityId}
        data-facility-id={facility.id}
      >
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-200">{shell.title}</h3>
          <Tooltip content="This shows what's actually happening at the facility right now, compared to what was promised. This is the 'real world' data, not the promises.">
            <Info className="w-4 h-4 text-gray-400" />
          </Tooltip>
        </div>

        {surface.kind === 'stale' && (
          <div
            className="mb-3 p-2 rounded border border-amber-700/50 bg-amber-950/40 text-xs text-amber-100"
            data-stale-label="true"
            role="status"
          >
            Showing prior result — refresh pending or failed.
            {surface.error ? ` (${surface.error.message})` : ''}
          </div>
        )}

        <div className="space-y-4">
          {/* Current Employment — DESIGN quarantine (R-F6) */}
          <div className="flex justify-between items-start py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400">Current Employment</div>
            <div className="text-right">
              <div
                className="text-sm font-medium text-gray-200"
                data-design-placeholder="employment"
              >
                {DESIGN_PLACEHOLDER_EMPLOYMENT.toLocaleString()}
              </div>
              <div className="mt-1">
                <span
                  className="px-2 py-0.5 rounded text-xs border bg-amber-900/30 text-amber-300 border-amber-700"
                  title="LIVE/DESIGN honesty layer — synthetic placeholder, not observed OSINT"
                  data-design-badge="employment"
                >
                  DESIGN · synthetic / placeholder
                </span>
              </div>
              <div className="text-xs text-gray-500 mt-1 max-w-xs">
                Not live observed employment. No facility-dated source warrant.
              </div>
            </div>
          </div>

          {/* Job Delivery Rate — withheld; would require live employment */}
          {promisedJobs > 0 && (
            <div className="flex justify-between items-start py-2 border-b border-gray-700">
              <div className="text-sm text-gray-400 flex items-center gap-1">
                Job Delivery Rate
                <Tooltip content="Withheld until live observed employment is available. Not computed from DESIGN placeholders.">
                  <Info className="w-3 h-3" />
                </Tooltip>
              </div>
              <div className="text-right">
                <div
                  className="text-sm font-medium text-amber-200"
                  data-design-withheld="job-delivery-rate"
                >
                  Not computed
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Requires live employment (promised: {promisedJobs}) — DESIGN placeholder not used
                </div>
              </div>
            </div>
          )}

          {/* Estimated Energy Consumption */}
          <div className="flex justify-between items-start py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400">Estimated Energy Consumption</div>
            <div className="text-sm font-medium text-gray-200 text-right">
              Not disclosed
            </div>
          </div>

          {/* Water Usage */}
          <div className="flex justify-between items-start py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400">Water Usage</div>
            <div className="text-sm font-medium text-gray-200 text-right">
              Not disclosed
            </div>
          </div>

          {/* Compliance Gap — withheld; no math on unsourced placeholder (R-F6) */}
          {agreement && (
            <div
              className="mt-6 p-4 rounded border border-amber-700/50 bg-amber-950/30"
              data-design-withheld="compliance-gap"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm font-semibold text-amber-200">Compliance Gap</div>
                <Tooltip content="Not computed from DESIGN placeholder employment. A live, sourced headcount is required before any gap dollars are shown.">
                  <Info className="w-3 h-3 text-amber-300" />
                </Tooltip>
              </div>
              <div className="text-sm text-amber-100">
                Not computed — employment figure is DESIGN placeholder, not live observed data.
              </div>
              <div className="mt-2 text-xs text-gray-400">
                Promised jobs on agreement: {promisedJobs || 'n/a'}. Gap formula withheld until employment has a dated source warrant.
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
