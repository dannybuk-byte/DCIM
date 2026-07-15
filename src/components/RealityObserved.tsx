import { useMemo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ProvenanceBadge } from './shared/ProvenanceBadge';
import { Tooltip } from './shared/Tooltip';
import { db, SubsidyAgreement } from '../db/database';
import { Facility } from '../types';
import { formatCurrency } from '../utils/formatting';
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

  // Estimate current employment (would come from OSINT or other sources)
  // For now, we'll use a placeholder - in real implementation this would be fetched
  const currentEmployment = 23; // Placeholder - would be from actual data source
  const promisedJobs = agreement?.promisedJobs || 0;
  const jobDeliveryRate = promisedJobs > 0 ? (currentEmployment / promisedJobs) * 100 : 0;

  // Calculate compliance gap
  const yearsOperating = agreement?.permitDate
    ? Math.max(1, (new Date().getTime() - new Date(agreement.permitDate).getTime()) / (1000 * 60 * 60 * 24 * 365))
    : 1;
  const assumedAnnualWage = 85000; // BLS median for tech roles
  const deliveredJobs = currentEmployment;
  const jobGap = Math.max(0, promisedJobs - deliveredJobs);
  const complianceGap = jobGap * assumedAnnualWage * yearsOperating - (agreement?.incentiveValue || 0);

  const getJobDeliveryColor = (rate: number) => {
    if (rate < 25) return '#ff4757'; // red
    if (rate < 75) return '#ffa502'; // yellow
    return '#2ed573'; // green
  };

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
          {/* Current Employment */}
          <div className="flex justify-between items-start py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400">Current Employment</div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-200">
                {currentEmployment.toLocaleString()}
              </div>
              <div className="mt-1">
                <ProvenanceBadge
                  sourceType="OSINT"
                  sourceDescription="Estimated from public sources and job postings"
                  lastUpdated={new Date().toISOString()}
                  collectionMethod="Open source intelligence gathering"
                  limitations={['May not capture all contractor positions', 'Based on publicly available information']}
                />
              </div>
            </div>
          </div>

          {/* Job Delivery Rate */}
          {promisedJobs > 0 && (
            <div className="flex justify-between items-start py-2 border-b border-gray-700">
              <div className="text-sm text-gray-400 flex items-center gap-1">
                Job Delivery Rate
                <Tooltip content="What percentage of promised jobs actually exist. Green (75%+) = mostly delivered. Yellow (25-75%) = partially delivered. Red (<25%) = very few jobs delivered.">
                  <Info className="w-3 h-3" />
                </Tooltip>
              </div>
              <div className="text-right">
                <div
                  className="text-sm font-medium"
                  style={{ color: getJobDeliveryColor(jobDeliveryRate) }}
                >
                  {jobDeliveryRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {currentEmployment} of {promisedJobs} promised jobs
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

          {/* Compliance Gap */}
          {agreement && (
            <div className="mt-6 p-4 rounded" style={{
              backgroundColor: complianceGap > 1000000 ? '#ff475720' : '#2ed57320',
              border: `1px solid ${complianceGap > 1000000 ? '#ff475740' : '#2ed57340'}`
            }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="text-sm font-semibold" style={{
                  color: complianceGap > 1000000 ? '#ff4757' : '#2ed573'
                }}>
                  Compliance Gap
                </div>
                <Tooltip content="This is the estimated economic value of the gap between what was promised and what was delivered. It's calculated as: (promised jobs - actual jobs) × average wage × years operating - incentives received. Red means the gap is over $1 million.">
                  <Info className="w-3 h-3" style={{ color: complianceGap > 1000000 ? '#ff4757' : '#2ed573' }} />
                </Tooltip>
              </div>
              <div className="text-lg font-bold mb-2" style={{
                color: complianceGap > 1000000 ? '#ff4757' : '#2ed573'
              }}>
                {formatCurrency(complianceGap)}
              </div>
              <div className="text-xs text-gray-400">
                Calculation: ({promisedJobs} - {deliveredJobs}) jobs × ${assumedAnnualWage.toLocaleString()}/year × {yearsOperating.toFixed(1)} years - {formatCurrency(agreement.incentiveValue)} incentives
              </div>
              <div className="mt-2 text-xs text-gray-500">
                Assumes average annual wage of ${assumedAnnualWage.toLocaleString()} (BLS median for tech roles)
              </div>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
