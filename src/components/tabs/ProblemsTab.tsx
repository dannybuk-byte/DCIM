import { useState, useMemo, memo, useCallback, startTransition } from 'react';
import { Facility } from '../../types';
import { ExpandableSection } from '../shared/ExpandableSection';
import { NestedTabs } from '../shared/NestedTabs';
import { AlertTriangle, Building2, FileText, Download, XCircle, TrendingDown, Eye } from 'lucide-react';
import { formatCurrency } from '../../utils/formatting';
import { getComplianceBadgeClasses } from '../../utils/classHelpers';
import { Tooltip } from '../shared/Tooltip';
import { ConnectographyFeatureSection } from '../shared/ConnectographyFeatureSection';
import { useProvenanceMode } from '../shared/ProvenanceMode';
import { SourcesPill } from '../shared/SourcesPill';
import {
  CommandHeader,
  StatusCard,
  ActionButton,
  QuickFilters,
  InteractiveCard,
} from '../shared/CommandCenterComponents';

interface ProblemsTabProps {
  facilities: Facility[];
}

const ProblemsTab = memo(function ProblemsTab({ facilities }: ProblemsTabProps) {
  const [expandedFacilities, setExpandedFacilities] = useState<Set<number>>(new Set());
  const { enabled: provenanceMode } = useProvenanceMode();

  const problemFacilities = useMemo(() => {
    try {
      // Null safety check
      if (!facilities || facilities.length === 0) {
        return [];
      }

      return facilities
        .filter(f => {
          // Defensive checks
          if (!f) return false;
          if (f.complianceStatus === 'Compliant') return false;
          if (!f.issues || !Array.isArray(f.issues) || f.issues.length === 0) return false;
          return true;
        })
        .sort((a, b) => {
          const aIssues = a.issues?.length || 0;
          const bIssues = b.issues?.length || 0;
          const aGap = typeof a.subsidyGap === 'number' ? a.subsidyGap : 0;
          const bGap = typeof b.subsidyGap === 'number' ? b.subsidyGap : 0;
          return bIssues - aIssues || bGap - aGap;
        });
    } catch (error) {
      console.error('[ProblemsTab] Calculation error:', error);
      return []; // Return empty array on error
    }
  }, [facilities]);


  const toggleFacility = useCallback((id: number) => {
    startTransition(() => {
      setExpandedFacilities((prev) => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    });
  }, []);

  const FacilityRow = memo(({ facility, isExpanded, onToggle }: { facility: Facility; isExpanded: boolean; onToggle: () => void }) => {
    return (
      <div className="border-b border-gray-700">
        <button
          onClick={onToggle}
          className="w-full px-4 py-2 hover:bg-gray-800 transition-colors text-left"
        >
          <div className="flex items-center justify-between text-xs">
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{facility.name}</div>
              <div className="text-gray-400 mt-0.5 flex items-center gap-2">
                <span>{facility.type}</span>
                <span>•</span>
                <span>{facility.operator}</span>
                <span>•</span>
                <span>{facility.city}, {facility.state}</span>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {facility.issues.slice(0, 3).map((issue, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-0.5 bg-red-900/50 text-red-300 rounded text-xs"
                  >
                    {issue}
                  </span>
                ))}
                {facility.issues.length > 3 && (
                  <span className="px-1.5 py-0.5 bg-red-900/30 text-red-400 rounded text-xs">
                    +{facility.issues.length - 3} more
                  </span>
                )}
              </div>
            </div>
            <div className="ml-4 text-right flex-shrink-0">
              <div className="text-sm font-semibold text-yellow-400">
                {formatCurrency(facility.subsidyGap)}
              </div>
              <div className="text-xs text-gray-400 mt-0.5">Gap</div>
              {provenanceMode && (
                <div className="mt-1">
                  <SourcesPill sources={facility.dataSources} field="subsidyGap" facilityId={facility.id} />
                </div>
              )}
              <div className="mt-1.5">
                <span
                  className={`px-1.5 py-0.5 rounded text-xs ${getComplianceBadgeClasses(facility.complianceStatus)}`}
                >
                  {facility.complianceStatus}
                </span>
                {provenanceMode && (
                  <span className="ml-2">
                    <SourcesPill sources={facility.dataSources} field="complianceStatus" facilityId={facility.id} />
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-500 mt-1">{facility.issues.length} issue{facility.issues.length !== 1 ? 's' : ''}</div>
            </div>
          </div>
        </button>
        {isExpanded && (
          <div className="px-4 py-2 bg-gray-900 border-t border-gray-800">
            <NestedTabs
              tabs={[
                {
                  id: 'issues',
                  label: 'Issues',
                  icon: <AlertTriangle className="w-4 h-4" />,
                  badge: facility.issues.length,
                  content: (
                    <div className="space-y-2">
                      {facility.issues.map((issue, i) => (
                        <ExpandableSection
                          key={i}
                          title={issue}
                          level={1}
                          icon={<AlertTriangle className="w-3 h-3 text-red-400" />}
                          className="mb-1.5 border-red-900/50"
                          headerClassName="bg-red-900/20"
                        >
                          <div className="p-2 space-y-2 text-xs">
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <div className="text-gray-500 mb-0.5">Issue Type</div>
                                <div className="px-1.5 py-0.5 bg-red-900/30 rounded text-red-300 inline-block">
                                  Compliance Violation
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-0.5">Severity</div>
                                <div className={`px-1.5 py-0.5 rounded text-xs inline-block ${facility.complianceStatus === 'Non-Compliant' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                  {facility.complianceStatus === 'Non-Compliant' ? 'High' : 'Medium'}
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-0.5">Priority</div>
                                <div className="px-1.5 py-0.5 bg-orange-900/30 rounded text-orange-300 inline-block">
                                  {facility.complianceStatus === 'Non-Compliant' ? 'Urgent' : 'Normal'}
                                </div>
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 mb-0.5">Description</div>
                              <div className="p-2 bg-gray-800 rounded text-gray-300">
                                This facility has been flagged for: {issue}. Immediate action may be required to address compliance concerns.
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <div className="text-gray-500 mb-0.5">First Detected</div>
                                <div className="text-gray-300">{new Date(facility.lastAuditDate).toLocaleDateString()}</div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-0.5">Related Facilities</div>
                                <div className="text-gray-300">None identified</div>
                              </div>
                            </div>
                          </div>
                        </ExpandableSection>
                      ))}
                    </div>
                  ),
                },
                {
                  id: 'details',
                  label: 'Details',
                  icon: <Building2 className="w-3 h-3" />,
                  content: (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Operator</div>
                          <div className="text-xs text-gray-200">{facility.operator}</div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Type</div>
                          <div className="text-xs text-gray-200">{facility.type}</div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">City</div>
                          <div className="text-xs text-gray-200">{facility.city}</div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">State</div>
                          <div className="text-xs text-gray-200">{facility.state}</div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Country</div>
                          <div className="text-xs text-gray-200">{facility.country}</div>
                        </div>
                        {facility.latitude && facility.longitude && (
                          <div className="p-2 bg-gray-800 rounded">
                            <div className="text-xs text-gray-500 mb-0.5">Coordinates</div>
                            <div className="text-xs text-gray-400 font-mono">{facility.latitude.toFixed(4)}, {facility.longitude.toFixed(4)}</div>
                          </div>
                        )}
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Subsidy Gap</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-yellow-400 font-semibold">{formatCurrency(facility.subsidyGap)}</div>
                            {provenanceMode && (
                              <SourcesPill sources={facility.dataSources} field="subsidyGap" facilityId={facility.id} />
                            )}
                          </div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Last Audit</div>
                          <div className="flex items-center gap-2">
                            <div className="text-xs text-gray-200">{new Date(facility.lastAuditDate).toLocaleDateString()}</div>
                            {provenanceMode && (
                              <SourcesPill sources={facility.dataSources} field="lastAuditDate" facilityId={facility.id} />
                            )}
                          </div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Days Since Audit</div>
                          <div className="text-xs text-gray-200">{Math.floor((Date.now() - new Date(facility.lastAuditDate).getTime()) / (1000 * 60 * 60 * 24))}</div>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'compliance',
                  label: 'Compliance',
                  icon: <FileText className="w-3 h-3" />,
                  content: (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Current Status</div>
                          <span
                            className={`px-2 py-0.5 rounded text-xs inline-block ${getComplianceBadgeClasses(facility.complianceStatus)}`}
                          >
                            {facility.complianceStatus}
                          </span>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Last Audit</div>
                          <div className="text-xs text-gray-200">{new Date(facility.lastAuditDate).toLocaleDateString()}</div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Days Since Audit</div>
                          <div className="text-xs text-gray-200">{Math.floor((Date.now() - new Date(facility.lastAuditDate).getTime()) / (1000 * 60 * 60 * 24))}</div>
                        </div>
                      </div>
                      <div className="p-2 bg-gray-800 rounded">
                        <div className="text-xs text-gray-500 mb-1">Compliance History</div>
                        <div className="text-xs text-gray-400">Status history and audit timeline would appear here</div>
                      </div>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </div>
    );
  }, (prev, next) => {
    return prev.facility.id === next.facility.id && 
           prev.facility === next.facility &&
           prev.isExpanded === next.isExpanded;
  });

  const [severityFilter, setSeverityFilter] = useState<string[]>([]);
  
  const totalIssues = useMemo(() => 
    problemFacilities.reduce((sum, f) => sum + f.issues.length, 0),
    [problemFacilities]
  );
  
  const criticalCount = useMemo(() =>
    problemFacilities.filter(f => f.complianceStatus === 'Non-Compliant').length,
    [problemFacilities]
  );
  
  const atRiskCount = useMemo(() =>
    problemFacilities.filter(f => f.complianceStatus === 'At-Risk').length,
    [problemFacilities]
  );

  return (
    <div className="p-4 space-y-4">
      {/* PROMINENT Command Center Header */}
      <div className="bg-gradient-to-r from-red-900 via-orange-900 to-yellow-900 border-2 border-red-500 rounded-xl p-6 shadow-2xl shadow-red-500/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <AlertTriangle className="w-10 h-10 text-red-400 animate-pulse" />
              <h1 className="text-3xl font-bold text-white">⚠️ Compliance Alerts</h1>
              <div className="flex items-center gap-2 px-4 py-2 bg-red-900/50 border-2 border-red-500 rounded-full animate-pulse">
                <div className="w-3 h-3 bg-red-400 rounded-full" />
                <span className="text-lg text-red-300 font-bold">{problemFacilities.length} ALERTS</span>
              </div>
            </div>
            <p className="text-lg text-red-200 font-medium">
              🚨 {problemFacilities.length.toLocaleString()} facilities with {totalIssues} total issues
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button
              onClick={() => console.log('Generate report')}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white text-lg font-bold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-red-500/30 hover:shadow-red-500/50 hover:-translate-y-1"
            >
              <FileText className="w-5 h-5" />
              Generate Report
            </button>
            <button
              onClick={() => console.log('Export problems')}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white text-lg font-bold rounded-lg flex items-center gap-2 transition-all"
            >
              <Download className="w-5 h-5" />
              Export
            </button>
            <div className="text-right">
              <div className="text-sm text-red-400 font-medium">Last Update</div>
              <div className="text-lg text-red-200 font-mono font-bold">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* PROMINENT Status Summary Cards - HUGE */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-orange-900 to-orange-950 border-3 border-orange-500 rounded-xl p-6 hover:scale-105 transition-all cursor-pointer shadow-xl hover:shadow-orange-500/50 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <AlertTriangle className="w-12 h-12 text-orange-400" />
            <div className="text-5xl font-bold text-orange-300">
              {problemFacilities.length}
            </div>
          </div>
          <div className="text-xl font-bold text-orange-400 mb-1">🏢 Problem Facilities</div>
          <div className="text-sm text-orange-500 font-bold">Requires attention</div>
        </div>
        
        <div className="bg-gradient-to-br from-red-900 to-red-950 border-3 border-red-500 rounded-xl p-6 hover:scale-105 transition-all cursor-pointer shadow-xl hover:shadow-red-500/50 animate-pulse">
          <div className="flex items-center justify-between mb-3">
            <XCircle className="w-12 h-12 text-red-400" />
            <div className="text-5xl font-bold text-red-300">
              {criticalCount}
            </div>
          </div>
          <div className="text-xl font-bold text-red-400 mb-1">❌ Non-Compliant</div>
          <div className="text-sm text-red-500 font-bold">⚠️ IMMEDIATE ACTION REQUIRED</div>
        </div>
        
        <div className="bg-gradient-to-br from-yellow-900 to-yellow-950 border-3 border-yellow-500 rounded-xl p-6 hover:scale-105 transition-all cursor-pointer shadow-xl hover:shadow-yellow-500/50">
          <div className="flex items-center justify-between mb-3">
            <TrendingDown className="w-12 h-12 text-yellow-400" />
            <div className="text-5xl font-bold text-yellow-300">
              {atRiskCount}
            </div>
          </div>
          <div className="text-xl font-bold text-yellow-400 mb-1">⚠️ At Risk</div>
          <div className="text-sm text-yellow-500">Monitor closely</div>
        </div>
        
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border-3 border-gray-600 rounded-xl p-6 hover:scale-105 transition-all cursor-pointer shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <FileText className="w-12 h-12 text-gray-400" />
            <div className="text-5xl font-bold text-gray-300">
              {totalIssues}
            </div>
          </div>
          <div className="text-xl font-bold text-gray-400 mb-1">📋 Total Issues</div>
          <div className="text-sm text-gray-500">Across all facilities</div>
        </div>
      </div>
      
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-4 py-2 border-b border-gray-700">
          <div className="flex items-center justify-between">
            <Tooltip content="Facilities that are not compliant and have recorded compliance issues. Click any facility to see detailed issue information.">
              <h2 className="text-base font-semibold cursor-help">Facilities with Problems</h2>
            </Tooltip>
            <Tooltip content="Total number of problem facilities and the sum of all issues across those facilities">
              <div className="text-xs text-gray-400 cursor-help">{problemFacilities.length.toLocaleString()} facilities with {totalIssues} total issues</div>
            </Tooltip>
          </div>
        </div>
        <div className="max-h-[750px] overflow-y-auto">
          {(() => {
            return null;
          })()}
          {problemFacilities.map((facility) => (
            <FacilityRow 
              key={facility.id} 
              facility={facility} 
              isExpanded={expandedFacilities.has(facility.id)}
              onToggle={() => toggleFacility(facility.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-3">
        <ConnectographyFeatureSection
          facilities={facilities}
          connectographyKeyPrefix="problems"
          metric="issuesCount"
          subtitle="Connectography lens: issue-density heatmap + flows. Use Toolkit to isolate operators and export hotspots."
          height={520}
        />
      </div>
    </div>
  );
});

export default ProblemsTab;

