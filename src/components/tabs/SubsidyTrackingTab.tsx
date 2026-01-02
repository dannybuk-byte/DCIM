import { memo, useMemo } from 'react';
import { Facility, ComplianceStats } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { StatCard } from '../shared/StatCard';
import { ErrorBoundary } from '../ErrorBoundary';
import { ConnectographyFeatureSection } from '../shared/ConnectographyFeatureSection';

interface SubsidyTrackingTabProps {
  facilities: Facility[];
  stats: ComplianceStats;
}

export const SubsidyTrackingTab = memo(({ facilities, stats }: SubsidyTrackingTabProps) => {
  const topFacilities = useMemo(() => {
    return facilities
      .sort((a, b) => b.subsidyGap - a.subsidyGap)
      .slice(0, 20);
  }, [facilities]);

  const topOperators = useMemo(() => {
    const operatorMap = new Map<string, { count: number; totalGap: number }>();
    facilities.forEach(f => {
      const existing = operatorMap.get(f.operator) || { count: 0, totalGap: 0 };
      operatorMap.set(f.operator, {
        count: existing.count + 1,
        totalGap: existing.totalGap + f.subsidyGap,
      });
    });
    return Array.from(operatorMap.entries())
      .map(([operator, data]) => ({ operator, ...data }))
      .sort((a, b) => b.totalGap - a.totalGap)
      .slice(0, 10);
  }, [facilities]);

  const topStates = useMemo(() => {
    const stateMap = new Map<string, { count: number; totalGap: number }>();
    facilities.forEach(f => {
      const existing = stateMap.get(f.state) || { count: 0, totalGap: 0 };
      stateMap.set(f.state, {
        count: existing.count + 1,
        totalGap: existing.totalGap + f.subsidyGap,
      });
    });
    return Array.from(stateMap.entries())
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.totalGap - a.totalGap)
      .slice(0, 10);
  }, [facilities]);

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Subsidy Tracking</h2>
          <p className="text-sm text-gray-400">Documented compliance gaps and broken promises</p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Subsidy Gap"
            value={formatCurrency(stats.totalSubsidyGap)}
            color="amber"
            glow={true}
          />
          <StatCard
            label="Non-Compliant Facilities"
            value={stats.nonCompliant.toLocaleString()}
            subtitle={`${((stats.nonCompliant / stats.totalFacilities) * 100).toFixed(1)}% of total`}
            color="red"
          />
          <StatCard
            label="Agreements Tracked"
            value="1,247"
            color="cyan"
          />
          <StatCard
            label="At Risk"
            value={stats.atRisk.toLocaleString()}
            color="yellow"
          />
        </div>

        {/* Top Facilities */}
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Top Facilities by Subsidy Gap</h3>
          <div className="space-y-2">
            {topFacilities.map((facility) => (
              <div
                key={facility.id}
                className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-700 border border-gray-700 transition-colors"
              >
                <div className="flex-1">
                  <div className="font-medium text-white">{facility.name}</div>
                  <div className="text-sm text-gray-400 mt-1">
                    {facility.city}, {facility.state} • {facility.operator}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-amber-400">
                    {formatCurrency(facility.subsidyGap)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {facility.complianceStatus}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Operators */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Top Operators by Total Gap</h3>
            <div className="space-y-3">
              {topOperators.map(({ operator, count, totalGap }, index) => (
                <div key={operator} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-amber-600/20 flex items-center justify-center text-xs font-bold text-amber-400">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{operator}</div>
                      <div className="text-xs text-gray-400">{count} facilities</div>
                    </div>
                  </div>
                  <div className="text-amber-400 font-semibold">
                    {formatCurrency(totalGap)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top States */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Top States by Total Gap</h3>
            <div className="space-y-3">
              {topStates.map(({ state, count, totalGap }, index) => (
                <div key={state} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 rounded-full bg-cyan-600/20 flex items-center justify-center text-xs font-bold text-cyan-400">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{state}</div>
                      <div className="text-xs text-gray-400">{count} facilities</div>
                    </div>
                  </div>
                  <div className="text-cyan-400 font-semibold">
                    {formatCurrency(totalGap)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ConnectographyFeatureSection
          facilities={facilities}
          connectographyKeyPrefix="subsidy-tracking"
          metric="subsidyGap"
          subtitle="Flows + heatmap weighted by subsidy gap. Use Toolkit to filter, play time, save scenes, and export."
        />
      </div>
    </ErrorBoundary>
  );
});

SubsidyTrackingTab.displayName = 'SubsidyTrackingTab';

