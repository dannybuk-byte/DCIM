import { useState, useMemo, memo, useCallback, startTransition } from 'react';
import { Facility } from '../../types';
import { ExpandableSection } from '../shared/ExpandableSection';
import { NestedTabs } from '../shared/NestedTabs';
import { Building2, DollarSign } from 'lucide-react';
import { formatCurrency } from '../../utils/formatting';
import { Tooltip } from '../shared/Tooltip';
import { ConnectographyFeatureSection } from '../shared/ConnectographyFeatureSection';
import { useProvenanceMode } from '../shared/ProvenanceMode';
import { SourcesPill } from '../shared/SourcesPill';

interface GeographyTabProps {
  facilities: Facility[];
}

const GeographyTab = memo(function GeographyTab({ facilities }: GeographyTabProps) {
  const [expandedStates, setExpandedStates] = useState<Set<string>>(new Set());
  const { enabled: provenanceMode } = useProvenanceMode();

  const stateStats = useMemo(() => {
    try {
      // Null safety check
      if (!facilities || facilities.length === 0) {
        return [];
      }

      // Optimized: use Map for O(1) lookups, single pass
      const stats = new Map<string, { total: number; compliant: number; nonCompliant: number; atRisk: number; unknown: number; subsidyGap: number; facilities: Facility[] }>();
      
      // Single pass through facilities
      for (let i = 0; i < facilities.length; i++) {
        const facility = facilities[i];
        
        // Defensive checks
        if (!facility || !facility.state) continue;
        
        let existing = stats.get(facility.state);
        
        if (!existing) {
          existing = { total: 0, compliant: 0, nonCompliant: 0, atRisk: 0, unknown: 0, subsidyGap: 0, facilities: [] };
          stats.set(facility.state, existing);
        }
        
        existing.total++;
        const gap = typeof facility.subsidyGap === 'number' && facility.subsidyGap >= 0 ? facility.subsidyGap : 0;
        existing.subsidyGap += gap;
        existing.facilities.push(facility);
        
        // Count by status
        if (facility.complianceStatus === 'Compliant') existing.compliant++;
        else if (facility.complianceStatus === 'Non-Compliant') existing.nonCompliant++;
        else if (facility.complianceStatus === 'At Risk') existing.atRisk++;
        else if (facility.complianceStatus === 'Unknown') existing.unknown++;
      }

      return Array.from(stats.entries())
        .map(([state, data]) => ({ state, ...data }))
        .sort((a, b) => b.subsidyGap - a.subsidyGap);
    } catch (error) {
      console.error('[GeographyTab] Calculation error:', error);
      return []; // Return empty array on error
    }
  }, [facilities]);


  const toggleState = useCallback((state: string) => {
    startTransition(() => {
      setExpandedStates((prev) => {
        const next = new Set(prev);
        if (next.has(state)) {
          next.delete(state);
        } else {
          next.add(state);
        }
        return next;
      });
    });
  }, []);

  const StateRow = ({ stat }: { stat: typeof stateStats[0] }) => {
    const isExpanded = expandedStates.has(stat.state);
    const stateFacilities = stat.facilities;

    return (
      <div className="border-b border-gray-700">
        <button
          onClick={() => toggleState(stat.state)}
          className="w-full px-4 py-2 hover:bg-gray-800 transition-colors text-left flex items-center text-xs"
        >
          <div className="w-20 font-medium text-sm">{stat.state}</div>
          <div className="flex-1">
            <div className="text-xs font-semibold">{stat.total.toLocaleString()} facilities</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {stat.compliant.toLocaleString()} compliant • {stat.nonCompliant.toLocaleString()} non-compliant • {stat.atRisk.toLocaleString()} at risk
            </div>
          </div>
          <div className="w-36 text-right">
            <div className="text-sm font-semibold text-yellow-400">{formatCurrency(stat.subsidyGap)}</div>
            <div className="text-xs text-gray-400">Gap</div>
          </div>
        </button>
        {isExpanded && (
          <div className="px-4 py-2 bg-gray-900 border-t border-gray-800">
            <NestedTabs
              tabs={[
                {
                  id: 'facilities',
                  label: 'Facilities',
                  icon: <Building2 className="w-3 h-3" />,
                  badge: stateFacilities.length,
                  content: (
                    <div className="space-y-1.5 max-h-[500px] overflow-y-auto">
                      {stateFacilities.length > 0 ? (
                        stateFacilities.map((facility) => (
                        <ExpandableSection
                          key={facility.id}
                          title={
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className="truncate">{facility.name}</span>
                              <span className="text-gray-500 text-xs">•</span>
                              <span className="text-gray-400 text-xs">{facility.city}</span>
                              <span className="text-gray-500 text-xs">•</span>
                              <span className="text-gray-400 text-xs">{facility.operator}</span>
                            </div>
                          }
                          level={1}
                          badge={facility.issues.length}
                          className="mb-1.5"
                        >
                          <div className="p-2 space-y-2 text-xs">
                            <div className="grid grid-cols-4 gap-2">
                              <div className="p-1.5 bg-gray-800 rounded">
                                <div className="text-gray-500 mb-0.5">Type</div>
                                <div className="text-gray-200">{facility.type}</div>
                              </div>
                              <div className="p-1.5 bg-gray-800 rounded">
                                <div className="text-gray-500 mb-0.5">Status</div>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-xs inline-block ${
                                    facility.complianceStatus === 'Compliant'
                                      ? 'bg-green-900 text-green-300'
                                      : facility.complianceStatus === 'Non-Compliant'
                                      ? 'bg-red-900 text-red-300'
                                      : facility.complianceStatus === 'At Risk'
                                      ? 'bg-yellow-900 text-yellow-300'
                                      : 'bg-gray-700 text-gray-300'
                                  }`}
                                >
                                  {facility.complianceStatus}
                                </span>
                              </div>
                              <div className="p-1.5 bg-gray-800 rounded">
                                <div className="text-gray-500 mb-0.5">Subsidy Gap</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-yellow-400 font-semibold">{formatCurrency(facility.subsidyGap)}</div>
                                  {provenanceMode && (
                                    <SourcesPill sources={facility.dataSources} field="subsidyGap" facilityId={facility.id} />
                                  )}
                                </div>
                              </div>
                              <div className="p-1.5 bg-gray-800 rounded">
                                <div className="text-gray-500 mb-0.5">Last Audit</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-gray-200">{new Date(facility.lastAuditDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</div>
                                  {provenanceMode && (
                                    <SourcesPill sources={facility.dataSources} field="lastAuditDate" facilityId={facility.id} />
                                  )}
                                </div>
                              </div>
                              {facility.latitude && facility.longitude && (
                                <div className="p-1.5 bg-gray-800 rounded col-span-2">
                                  <div className="text-gray-500 mb-0.5">Coordinates</div>
                                  <div className="flex items-center gap-2">
                                    <div className="text-gray-400 font-mono text-xs">{facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}</div>
                                    {provenanceMode && (
                                      <SourcesPill sources={facility.dataSources} field="coordinates" facilityId={facility.id} />
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                            {facility.issues.length > 0 && (
                              <div>
                                <div className="text-gray-500 mb-1">Issues ({facility.issues.length})</div>
                                <div className="space-y-1">
                                  {facility.issues.map((issue, i) => (
                                    <div key={i} className="p-1.5 bg-red-900/20 border border-red-900/50 rounded text-xs">
                                      {issue}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </ExpandableSection>
                      ))
                      ) : (
                        <div className="p-2 bg-gray-800 rounded text-xs text-gray-400">No facilities found for this state</div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'stats',
                  label: 'Statistics',
                  icon: <DollarSign className="w-3 h-3" />,
                  content: (
                    <div className="space-y-2">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Total</div>
                          <div className="text-lg font-bold">{stat.total.toLocaleString()}</div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Subsidy Gap</div>
                          <div className="text-sm font-bold text-yellow-400">{formatCurrency(stat.subsidyGap)}</div>
                        </div>
                        <div className="p-2 bg-green-900/20 border border-green-900/50 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Compliant</div>
                          <div className="text-base font-bold text-green-400">{stat.compliant.toLocaleString()}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {((stat.compliant / stat.total) * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="p-2 bg-red-900/20 border border-red-900/50 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Non-Compliant</div>
                          <div className="text-base font-bold text-red-400">{stat.nonCompliant.toLocaleString()}</div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {((stat.nonCompliant / stat.total) * 100).toFixed(1)}%
                          </div>
                        </div>
                        {stat.atRisk > 0 && (
                          <div className="p-2 bg-yellow-900/20 border border-yellow-900/50 rounded">
                            <div className="text-xs text-gray-500 mb-0.5">At Risk</div>
                            <div className="text-base font-bold text-yellow-400">{stat.atRisk.toLocaleString()}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {((stat.atRisk / stat.total) * 100).toFixed(1)}%
                            </div>
                          </div>
                        )}
                        {stat.unknown > 0 && (
                          <div className="p-2 bg-gray-700/50 rounded">
                            <div className="text-xs text-gray-500 mb-0.5">Unknown</div>
                            <div className="text-base font-bold text-gray-300">{stat.unknown.toLocaleString()}</div>
                            <div className="text-xs text-gray-500 mt-0.5">
                              {((stat.unknown / stat.total) * 100).toFixed(1)}%
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="p-2 bg-gray-800 rounded">
                        <div className="text-xs text-gray-500 mb-1">Average Subsidy Gap per Facility</div>
                        <div className="text-sm font-semibold text-yellow-400">{formatCurrency(stat.subsidyGap / stat.total)}</div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'byType',
                  label: 'By Type',
                  icon: <Building2 className="w-3 h-3" />,
                  content: (
                    <div className="space-y-1.5">
                      {stateFacilities.length > 0 ? (
                        Object.entries(
                          stateFacilities.reduce((acc, f) => {
                            acc[f.type] = (acc[f.type] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        )
                          .sort((a, b) => b[1] - a[1])
                          .map(([type, count]) => (
                            <div key={type} className="flex justify-between p-1.5 bg-gray-800 rounded text-xs">
                              <span>{type}</span>
                              <span className="font-semibold">{count.toLocaleString()} ({((count / stat.total) * 100).toFixed(1)}%)</span>
                            </div>
                          ))
                      ) : (
                        <div className="p-2 bg-gray-800 rounded text-xs text-gray-400">No facilities by type</div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'byOperator',
                  label: 'By Operator',
                  icon: <Building2 className="w-3 h-3" />,
                  content: (
                    <div className="space-y-1.5 max-h-96 overflow-y-auto">
                      {stateFacilities.length > 0 ? (
                        Object.entries(
                          stateFacilities.reduce((acc, f) => {
                            acc[f.operator] = (acc[f.operator] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        )
                          .sort((a, b) => b[1] - a[1])
                          .map(([operator, count]) => (
                            <div key={operator} className="flex justify-between p-1.5 bg-gray-800 rounded text-xs">
                              <span className="truncate flex-1 min-w-0">{operator}</span>
                              <span className="font-semibold ml-2 flex-shrink-0">{count.toLocaleString()} ({((count / stat.total) * 100).toFixed(1)}%)</span>
                            </div>
                          ))
                      ) : (
                        <div className="p-2 bg-gray-800 rounded text-xs text-gray-400">No facilities by operator</div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'byCity',
                  label: 'By City',
                  icon: <Building2 className="w-3 h-3" />,
                  content: (
                    <div className="space-y-1.5 max-h-96 overflow-y-auto">
                      {stateFacilities.length > 0 ? (
                        Object.entries(
                          stateFacilities.reduce((acc, f) => {
                            const key = `${f.city}, ${f.state}`;
                            acc[key] = (acc[key] || 0) + 1;
                            return acc;
                          }, {} as Record<string, number>)
                        )
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 50)
                          .map(([city, count]) => (
                            <div key={city} className="flex justify-between p-1.5 bg-gray-800 rounded text-xs">
                              <span className="truncate flex-1 min-w-0">{city}</span>
                              <span className="font-semibold ml-2 flex-shrink-0">{count.toLocaleString()}</span>
                            </div>
                          ))
                      ) : (
                        <div className="p-2 bg-gray-800 rounded text-xs text-gray-400">No facilities by city</div>
                      )}
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-3">
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-4 py-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <Tooltip content="Geographic breakdown of facilities by state/province. Click any state to expand and see facilities, statistics, and breakdowns by type and operator.">
              <h2 className="text-base font-semibold cursor-help">State Statistics</h2>
            </Tooltip>
            <Tooltip content="Number of unique states/provinces represented and total facility count across all states">
              <div className="text-xs text-gray-400 cursor-help">{stateStats.length.toLocaleString()} states • {facilities.length.toLocaleString()} facilities</div>
            </Tooltip>
          </div>
        </div>
        <div className="border-b border-gray-700 px-4 py-1.5 flex items-center text-xs text-gray-400 font-semibold uppercase tracking-wide bg-gray-850 sticky top-0 z-10">
          <div className="w-20">State</div>
          <div className="flex-1">Facilities</div>
          <div className="w-36 text-right">Subsidy Gap</div>
        </div>
        <div className="max-h-[750px] overflow-y-auto">
          {(() => {
            return null;
          })()}
          {stateStats.map((stat) => (
            <StateRow key={stat.state} stat={stat} />
          ))}
        </div>
      </div>

      <div className="mt-3">
        <ConnectographyFeatureSection
          facilities={facilities}
          connectographyKeyPrefix="geography"
          metric="subsidyGap"
          subtitle="Connectography lens: geographic subsidy pressure + operator flows. Use Toolkit to isolate states/operators and export GeoJSON."
          height={520}
        />
      </div>
    </div>
  );
});

export default GeographyTab;

