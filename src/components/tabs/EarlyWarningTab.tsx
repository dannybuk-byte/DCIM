import { useState, useMemo, memo, useCallback, startTransition } from 'react';
import { Facility } from '../../types';
import { ExpandableSection } from '../shared/ExpandableSection';
import { NestedTabs } from '../shared/NestedTabs';
import { Tooltip } from '../shared/Tooltip';
import { Clock, AlertTriangle, Building2, FileText } from 'lucide-react';
import { formatCurrency } from '../../utils/formatting';
import { getStatusBadgeClasses, getComplianceBadgeClasses } from '../../utils/classHelpers';
import { ConnectographyFeatureSection } from '../shared/ConnectographyFeatureSection';

interface EarlyWarningTabProps {
  facilities: Facility[];
}

const EarlyWarningTab = memo(function EarlyWarningTab({ facilities }: EarlyWarningTabProps) {
  const [expandedFacilities, setExpandedFacilities] = useState<Set<number>>(new Set());

  const atRiskFacilities = useMemo(() => {
    const now = new Date();
    return facilities
      .filter(f => {
        const auditDate = new Date(f.lastAuditDate);
        const daysSinceAudit = Math.floor((now.getTime() - auditDate.getTime()) / (1000 * 60 * 60 * 24));
        return f.complianceStatus === 'At Risk' || daysSinceAudit > 180;
      })
      .sort((a, b) => {
        const aDate = new Date(a.lastAuditDate);
        const bDate = new Date(b.lastAuditDate);
        return aDate.getTime() - bDate.getTime();
      });
  }, [facilities]);


  const getDaysSinceAudit = (dateString: string) => {
    const auditDate = new Date(dateString);
    const now = new Date();
    return Math.floor((now.getTime() - auditDate.getTime()) / (1000 * 60 * 60 * 24));
  };

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
    const daysSince = getDaysSinceAudit(facility.lastAuditDate);
    const isOverdue = daysSince > 180;

    return (
      <div className="border-b border-gray-700">
        <button
          onClick={onToggle}
          className="w-full px-6 py-3 hover:bg-gray-800 transition-colors text-left"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium">{facility.name}</div>
              <div className="text-sm text-gray-400 mt-1">
                {facility.type} • {facility.city}, {facility.state}
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-300">
                  Last Audit: {new Date(facility.lastAuditDate).toLocaleDateString()}
                </span>
                <span
                  className={`ml-3 px-2 py-1 rounded text-xs ${getStatusBadgeClasses(isOverdue ? 'overdue' : 'warning')}`}
                >
                  {daysSince} days ago {isOverdue ? '(Overdue)' : ''}
                </span>
              </div>
            </div>
            <div className="ml-4 text-right">
              <div className="text-lg font-semibold text-yellow-400">
                {formatCurrency(facility.subsidyGap)}
              </div>
              <div className="text-xs text-gray-400 mt-1">Subsidy Gap</div>
              <div className="mt-2">
                <span
                  className={`px-2 py-1 rounded text-xs ${getComplianceBadgeClasses(facility.complianceStatus)}`}
                >
                  {facility.complianceStatus}
                </span>
              </div>
            </div>
          </div>
        </button>
        {isExpanded && (
          <div className="px-6 py-4 bg-gray-900 border-t border-gray-800">
            <NestedTabs
              tabs={[
                {
                  id: 'audit',
                  label: 'Audit',
                  icon: <Clock className="w-3 h-3" />,
                  content: (
                    <div className="space-y-3">
                      <div className="grid grid-cols-4 gap-2">
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Last Audit</div>
                          <div className="text-xs text-gray-200">{new Date(facility.lastAuditDate).toLocaleDateString()}</div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Days Since</div>
                          <div className="text-xs">
                            <span
                              className={`px-1.5 py-0.5 rounded ${getStatusBadgeClasses(isOverdue ? 'overdue' : 'warning')}`}
                            >
                              {daysSince}d {isOverdue ? '(Overdue)' : ''}
                            </span>
                          </div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Next Due</div>
                          <div className="text-xs text-gray-200">{new Date(new Date(facility.lastAuditDate).getTime() + 180 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })}</div>
                        </div>
                        <Tooltip content="Number of days remaining until the next audit is due (audits are typically required every 180 days)">
                          <div className="p-2 bg-gray-800 rounded">
                            <div className="text-xs text-gray-500 mb-0.5">Days Until Due</div>
                            <div className="text-xs text-gray-200">{Math.max(0, 180 - daysSince)}d</div>
                          </div>
                        </Tooltip>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Status</div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs inline-block ${getComplianceBadgeClasses(facility.complianceStatus)}`}
                          >
                            {facility.complianceStatus}
                          </span>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Subsidy Gap</div>
                          <div className="text-xs text-yellow-400 font-semibold">{formatCurrency(facility.subsidyGap)}</div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Issues</div>
                          <div className="text-xs text-gray-200">{facility.issues.length}</div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Type</div>
                          <div className="text-xs text-gray-200">{facility.type}</div>
                        </div>
                      </div>
                      {isOverdue && (
                        <div className="p-2 bg-red-900/20 border border-red-900/50 rounded">
                          <div className="flex items-center gap-2 mb-1">
                            <AlertTriangle className="w-4 h-4 text-red-400" />
                            <div className="font-semibold text-red-300 text-xs">Audit Overdue by {daysSince - 180} days</div>
                          </div>
                          <div className="text-xs text-gray-300">
                            Immediate action is recommended to schedule a compliance audit.
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'facility',
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
                          <div className="text-xs text-yellow-400 font-semibold">{formatCurrency(facility.subsidyGap)}</div>
                        </div>
                        <div className="p-2 bg-gray-800 rounded">
                          <div className="text-xs text-gray-500 mb-0.5">Status</div>
                          <span
                            className={`px-1.5 py-0.5 rounded text-xs inline-block ${getComplianceBadgeClasses(facility.complianceStatus)}`}
                          >
                            {facility.complianceStatus}
                          </span>
                        </div>
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'issues',
                  label: 'Issues',
                  icon: <AlertTriangle className="w-3 h-3" />,
                  badge: facility.issues.length,
                  content: (
                    <div className="space-y-1.5">
                      {facility.issues.length > 0 ? (
                        facility.issues.map((issue, i) => (
                          <ExpandableSection
                            key={i}
                            title={issue}
                            level={1}
                            icon={<AlertTriangle className="w-3 h-3 text-red-400" />}
                            className="border-red-900/50"
                            headerClassName="bg-red-900/20"
                          >
                            <div className="p-2 space-y-2 text-xs">
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <div className="text-gray-500 mb-0.5">Severity</div>
                                  <div className={`px-1.5 py-0.5 rounded inline-block ${facility.complianceStatus === 'Non-Compliant' ? 'bg-red-900 text-red-300' : 'bg-yellow-900 text-yellow-300'}`}>
                                    {facility.complianceStatus === 'Non-Compliant' ? 'High' : 'Medium'}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-gray-500 mb-0.5">Type</div>
                                  <div className="px-1.5 py-0.5 bg-red-900/30 rounded text-red-300 inline-block">
                                    Compliance Violation
                                  </div>
                                </div>
                              </div>
                              <div>
                                <div className="text-gray-500 mb-0.5">Description</div>
                                <div className="p-1.5 bg-gray-800 rounded text-gray-300">
                                  This facility has been flagged for: {issue}. Immediate action may be required to address compliance concerns.
                                </div>
                              </div>
                            </div>
                          </ExpandableSection>
                        ))
                      ) : (
                        <div className="text-xs text-gray-400 p-2">No specific issues recorded</div>
                      )}
                    </div>
                  ),
                },
                {
                  id: 'recommendations',
                  label: 'Recommendations',
                  icon: <FileText className="w-4 h-4" />,
                  content: (
                    <div className="space-y-3">
                      <div className="p-4 bg-blue-900/20 border border-blue-900/50 rounded">
                        <div className="font-semibold text-blue-300 mb-2">Immediate Actions</div>
                        <ul className="space-y-2 text-sm text-gray-300 list-disc list-inside">
                          <li>Schedule compliance audit within 30 days</li>
                          <li>Review and update compliance documentation</li>
                          <li>Address any outstanding issues from previous audit</li>
                          {isOverdue && <li className="text-red-300">URGENT: Audit is overdue - prioritize immediately</li>}
                        </ul>
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

  return (
    <div className="p-6">
      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="px-6 py-4 border-b border-gray-700">
          <h2 className="text-lg font-semibold">Early Warning Indicators</h2>
          <p className="text-sm text-gray-400 mt-1">
            {atRiskFacilities.length.toLocaleString()} facilities requiring attention • Click any facility to expand details
          </p>
        </div>
        <div className="max-h-[700px] overflow-y-auto scroll-smooth" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch' }}>
          {(() => {
            return null;
          })()}
          {atRiskFacilities.map((facility) => (
            <FacilityRow 
              key={facility.id} 
              facility={facility} 
              isExpanded={expandedFacilities.has(facility.id)}
              onToggle={() => toggleFacility(facility.id)}
            />
          ))}
        </div>
      </div>

      <div className="mt-6">
        <ConnectographyFeatureSection
          facilities={facilities}
          connectographyKeyPrefix="early-warning"
          metric="auditRecencyDays"
          subtitle="Connectography lens: audit staleness risk (days since audit) with time playback and operator filtering."
          height={520}
        />
      </div>
    </div>
  );
});

export default EarlyWarningTab;

