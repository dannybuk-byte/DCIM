import React, { useState, useEffect, startTransition } from 'react';
import { Facility } from '../types';
import { ReportIntent, applyFilters } from '../utils/reportIntent';
import { Maximize2 } from 'lucide-react';
import ReportModal from './ReportModal';

interface ReportRendererProps {
  intent: ReportIntent;
  facilities: Facility[];
  inline?: boolean;
  onExpand?: () => void;
}

// Mini version of report components for inline rendering
export const InlineReportRenderer: React.FC<ReportRendererProps> = ({ 
  intent, 
  facilities,
  onExpand 
}) => {
  const [showFullReport, setShowFullReport] = useState(false);
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
  const [isStreaming, setIsStreaming] = useState(true);

  useEffect(() => {
    let isMounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    startTransition(() => {
      let filtered = facilities;
      
      if (intent.type === 'state' && intent.state) {
        filtered = facilities.filter(f => f.state === intent.state);
        if (intent.filters) {
          filtered = applyFilters(filtered, intent.filters);
        }
      } else if (intent.type === 'operator' && intent.operator) {
        filtered = facilities.filter(f => 
          f.operator.toLowerCase().includes(intent.operator!.toLowerCase())
        );
        if (intent.filters) {
          filtered = applyFilters(filtered, intent.filters);
        }
      } else if (intent.type === 'evidence') {
        if (intent.state) {
          filtered = facilities.filter(f => f.state === intent.state);
        }
        if (intent.operator) {
          filtered = filtered.filter(f => 
            f.operator.toLowerCase().includes(intent.operator!.toLowerCase())
          );
        }
        if (intent.filters) {
          filtered = applyFilters(filtered, intent.filters);
        }
      } else if (intent.type === 'facility_filter') {
        filtered = applyFilters(filtered, intent.filters);
      }
      
      if (isMounted) {
        setFilteredFacilities(filtered);
        // Simulate streaming delay
        timeoutId = setTimeout(() => {
          if (isMounted) {
            setIsStreaming(false);
          }
        }, 500);
      }
    });

    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [intent, facilities]);

  const formatCurrency = (amount: number): string => {
    if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
    if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
    return `$${amount.toLocaleString()}`;
  };

  const getComplianceColor = (status: Facility['complianceStatus']): string => {
    switch (status) {
      case 'Compliant': return '#10b981';
      case 'Non-Compliant': return '#ef4444';
      case 'At Risk': return '#f59e0b';
      default: return '#6b7280';
    }
  };

  const stats = React.useMemo(() => {
    const compliant = filteredFacilities.filter(f => f.complianceStatus === 'Compliant').length;
    const nonCompliant = filteredFacilities.filter(f => f.complianceStatus === 'Non-Compliant').length;
    const atRisk = filteredFacilities.filter(f => f.complianceStatus === 'At Risk').length;
    const totalGap = filteredFacilities.reduce((s, f) => s + (f.subsidyGap || 0), 0);
    const rate = filteredFacilities.length > 0 ? (compliant / filteredFacilities.length) * 100 : 0;
    return { compliant, nonCompliant, atRisk, totalGap, rate, total: filteredFacilities.length };
  }, [filteredFacilities]);

  if (intent.type === 'none' || filteredFacilities.length === 0) {
    return null;
  }

  const title = 
    intent.type === 'state' ? `${intent.state} Compliance Report` :
    intent.type === 'operator' ? `${intent.operator} Compliance Report` :
    intent.type === 'evidence' ? 'Evidence Package' :
    'Compliance Report';

  if (showFullReport) {
    return (
      <ReportModal 
        isOpen={true} 
        onClose={() => setShowFullReport(false)}
        facilities={filteredFacilities}
      />
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700 mt-3 overflow-hidden">
      <div className="bg-gray-900 px-4 py-3 flex justify-between items-center border-b border-gray-700">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-white">{title}</h3>
          <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
            {stats.total} facilities
          </span>
        </div>
        <button
          onClick={() => {
            setShowFullReport(true);
            onExpand?.();
          }}
          className="text-blue-400 hover:text-blue-300 text-sm flex items-center gap-1"
        >
          <Maximize2 size={14} />
          Expand
        </button>
      </div>
      
      {isStreaming ? (
        <div className="p-4 text-center text-gray-400 text-sm">
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
            <span>Generating report...</span>
          </div>
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-900 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">Total Gap</div>
              <div className="text-lg font-bold text-red-400">{formatCurrency(stats.totalGap)}</div>
            </div>
            <div className="bg-gray-900 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">Compliance Rate</div>
              <div className="text-lg font-bold" style={{ color: stats.rate >= 80 ? '#10b981' : '#ef4444' }}>
                {stats.rate.toFixed(1)}%
              </div>
            </div>
            <div className="bg-gray-900 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">Non-Compliant</div>
              <div className="text-lg font-bold text-red-400">{stats.nonCompliant}</div>
            </div>
            <div className="bg-gray-900 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">At Risk</div>
              <div className="text-lg font-bold text-yellow-400">{stats.atRisk}</div>
            </div>
          </div>

          {/* Top Facilities Table */}
          {filteredFacilities.length > 0 && (
            <div className="p-4 border-t border-gray-700">
              <div className="text-sm font-semibold text-gray-300 mb-3">Top Facilities by Subsidy Gap</div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-700 text-gray-400 text-left">
                      <th className="pb-2">Name</th>
                      <th className="pb-2">City</th>
                      <th className="pb-2">Status</th>
                      <th className="pb-2 text-right">Gap</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredFacilities
                      .sort((a, b) => b.subsidyGap - a.subsidyGap)
                      .slice(0, 5)
                      .map((facility) => (
                        <tr key={facility.id} className="border-b border-gray-800 hover:bg-gray-900">
                          <td className="py-2 text-white">{facility.name}</td>
                          <td className="py-2 text-gray-400">{facility.city}, {facility.state}</td>
                          <td className="py-2">
                            <span
                              className="px-2 py-1 rounded text-xs font-semibold"
                              style={{
                                background: `${getComplianceColor(facility.complianceStatus)}20`,
                                color: getComplianceColor(facility.complianceStatus)
                              }}
                            >
                              {facility.complianceStatus}
                            </span>
                          </td>
                          <td className="py-2 text-right text-red-400 font-semibold">
                            {formatCurrency(facility.subsidyGap)}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
              {filteredFacilities.length > 5 && (
                <div className="text-xs text-gray-500 mt-2 text-center">
                  Showing top 5 of {filteredFacilities.length} facilities. Expand for full report.
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
