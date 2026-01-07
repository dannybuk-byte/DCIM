import { memo, useMemo, useState, useCallback } from 'react';
import { Facility, ComplianceStats } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { StatCard } from '../shared/StatCard';
import { ErrorBoundary } from '../ErrorBoundary';
import { ConnectographyFeatureSection } from '../shared/ConnectographyFeatureSection';
import { ChevronDown, ChevronRight, Building2, MapPin, Layers, AlertTriangle, Download, Search, Filter } from 'lucide-react';
import { ContextualNLPWidget, SectionNLPBar } from '../shared/ContextualNLPWidget';
import { NLPAction } from '../../hooks/useSectionNLP';
import { HelpIcon } from '../shared/InlineHelpButton';

interface SubsidyTrackingTabProps {
  facilities: Facility[];
  stats: ComplianceStats;
}

export const SubsidyTrackingTab = memo(({ facilities, stats }: SubsidyTrackingTabProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFacility, setExpandedFacility] = useState<number | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['critical', 'high']));
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const topFacilities = useMemo(() => {
    let filtered = [...facilities].sort((a, b) => b.subsidyGap - a.subsidyGap);
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(f => 
        f.name.toLowerCase().includes(query) ||
        f.operator.toLowerCase().includes(query) ||
        f.state.toLowerCase().includes(query) ||
        f.city.toLowerCase().includes(query)
      );
    }
    return filtered.slice(0, 30);
  }, [facilities, searchQuery]);

  // Group by gap severity
  const facilitiesByGap = useMemo(() => ({
    critical: topFacilities.filter(f => f.subsidyGap >= 10000000),
    high: topFacilities.filter(f => f.subsidyGap >= 1000000 && f.subsidyGap < 10000000),
    moderate: topFacilities.filter(f => f.subsidyGap >= 100000 && f.subsidyGap < 1000000),
    low: topFacilities.filter(f => f.subsidyGap < 100000),
  }), [topFacilities]);

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
      .slice(0, 8);
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
      .slice(0, 8);
  }, [facilities]);

  // Handle NLP actions
  const handleNLPAction = useCallback((action: NLPAction) => {
    console.log('Subsidy NLP Action:', action);
    if (action.type === 'filter') {
      const payload = action.payload as { operators?: string[]; states?: string[] };
      if (payload.operators?.length) {
        setSearchQuery(payload.operators[0]);
      } else if (payload.states?.length) {
        setSearchQuery(payload.states[0]);
      }
    }
  }, []);

  return (
    <ErrorBoundary>
      <div className="p-4 space-y-4">
        {/* Compact Stats Row with NLP Search */}
        <div className="flex items-center justify-between gap-4 p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="text-sm text-gray-400">Subsidy Accountability:</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-amber-400">{formatCurrency(stats.totalSubsidyGap)}</span>
                <span className="text-xs text-gray-500">total gap</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-bold text-red-400">{stats.nonCompliant}</span>
                <span className="text-xs text-gray-500">non-compliant</span>
              </div>
            </div>
          </div>
          {/* Inline NLP Search */}
          <div className="flex items-center gap-2">
            <div className="w-64">
              <SectionNLPBar 
                context="subsidies" 
                placeholder="Ask about subsidy data..."
                onAction={handleNLPAction}
              />
            </div>
            <HelpIcon context="subsidies" />
          </div>
        </div>

        <div className="flex gap-4">
          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Search & Toggle */}
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Search facilities, operators, states..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-1.5 bg-[#0d1117] border border-[#30363d] rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50"
                />
              </div>
              <div className="flex items-center gap-1 bg-[#21262d] rounded p-0.5">
                <button 
                  onClick={() => setViewMode('table')}
                  className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-[#30363d] text-white' : 'text-gray-500'}`}
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('cards')}
                  className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-[#30363d] text-white' : 'text-gray-500'}`}
                >
                  <Building2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* HIGH-DENSITY TABLE VIEW */}
            {viewMode === 'table' ? (
              <div className="space-y-3">
                {[
                  { key: 'critical', label: 'Critical Gap ($10M+)', data: facilitiesByGap.critical, color: 'red', icon: '🔴' },
                  { key: 'high', label: 'High Gap ($1M+)', data: facilitiesByGap.high, color: 'orange', icon: '🟠' },
                  { key: 'moderate', label: 'Moderate Gap ($100K+)', data: facilitiesByGap.moderate, color: 'yellow', icon: '🟡' },
                  { key: 'low', label: 'Low Gap', data: facilitiesByGap.low, color: 'gray', icon: '⚪' },
                ].map(group => group.data.length > 0 && (
                  <div key={group.key} className={`bg-${group.color}-500/5 border border-${group.color}-500/20 rounded-lg overflow-hidden`}>
                    {/* Group Header */}
                    <button
                      onClick={() => toggleSection(group.key)}
                      className="w-full px-3 py-2 flex items-center justify-between hover:bg-black/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span>{group.icon}</span>
                        <span className={`text-sm font-semibold text-${group.color}-400`}>{group.label}</span>
                        <span className="text-xs text-gray-500">({group.data.length} facilities)</span>
                        <span className="text-xs text-gray-600">
                          • {formatCurrency(group.data.reduce((sum, f) => sum + f.subsidyGap, 0))} total
                        </span>
                      </div>
                      {expandedSections.has(group.key) 
                        ? <ChevronDown className="w-4 h-4 text-gray-500" /> 
                        : <ChevronRight className="w-4 h-4 text-gray-500" />}
                    </button>
                    
                    {/* Table */}
                    {expandedSections.has(group.key) && (
                      <div className="border-t border-[#30363d]">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 px-3 py-1.5 bg-[#0d1117] text-xs text-gray-500 font-medium">
                          <div className="col-span-4">Facility</div>
                          <div className="col-span-2">Operator</div>
                          <div className="col-span-2">Location</div>
                          <div className="col-span-2 text-right">Subsidy Gap</div>
                          <div className="col-span-2 text-center">Status</div>
                        </div>
                        
                        {/* Table Rows */}
                        {group.data.slice(0, 10).map(facility => (
                          <div key={facility.id} className="border-t border-[#21262d]">
                            <div 
                              onClick={() => setExpandedFacility(expandedFacility === facility.id ? null : facility.id!)}
                              className={`grid grid-cols-12 gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[#161b22] transition-colors ${
                                expandedFacility === facility.id ? 'bg-[#161b22]' : ''
                              }`}
                            >
                              <div className="col-span-4 flex items-center gap-2">
                                {expandedFacility === facility.id 
                                  ? <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                  : <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                                <span className="text-white truncate" title={facility.name}>{facility.name}</span>
                              </div>
                              <div className="col-span-2 text-gray-400 truncate">{facility.operator}</div>
                              <div className="col-span-2 text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                <span className="truncate">{facility.city}, {facility.state}</span>
                              </div>
                              <div className="col-span-2 text-right text-amber-400 font-bold">
                                {formatCurrency(facility.subsidyGap)}
                              </div>
                              <div className="col-span-2 text-center">
                                <span className={`px-1.5 py-0.5 text-[10px] font-medium rounded ${
                                  facility.complianceStatus === 'Non-Compliant' ? 'bg-red-500/20 text-red-400' :
                                  facility.complianceStatus === 'At Risk' ? 'bg-yellow-500/20 text-yellow-400' :
                                  'bg-green-500/20 text-green-400'
                                }`}>
                                  {facility.complianceStatus}
                                </span>
                              </div>
                            </div>
                            
                            {/* Expanded Details */}
                            {expandedFacility === facility.id && (
                              <div className="px-3 py-2 bg-[#0d1117] border-t border-[#21262d]">
                                <div className="grid grid-cols-4 gap-3 text-xs">
                                  <div className="bg-[#161b22] p-2 rounded">
                                    <div className="text-gray-500 mb-1">Jobs Promised</div>
                                    <div className="text-white font-medium">{facility.jobsPromised?.toLocaleString() || 'N/A'}</div>
                                  </div>
                                  <div className="bg-[#161b22] p-2 rounded">
                                    <div className="text-gray-500 mb-1">Jobs Actual</div>
                                    <div className="text-white font-medium">{facility.jobsActual?.toLocaleString() || 'N/A'}</div>
                                  </div>
                                  <div className="bg-[#161b22] p-2 rounded">
                                    <div className="text-gray-500 mb-1">Tax Incentives</div>
                                    <div className="text-cyan-400 font-medium">{formatCurrency(facility.taxIncentives || 0)}</div>
                                  </div>
                                  <div className="bg-[#161b22] p-2 rounded">
                                    <div className="text-gray-500 mb-1">Gap %</div>
                                    <div className="text-amber-400 font-medium">
                                      {facility.taxIncentives ? ((facility.subsidyGap / facility.taxIncentives) * 100).toFixed(1) : 0}%
                                    </div>
                                  </div>
                                </div>
                                <div className="flex gap-2 mt-2">
                                  <button className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    File Complaint
                                  </button>
                                  <button className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded text-[10px] flex items-center gap-1">
                                    <Download className="w-3 h-3" />
                                    Export
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                        {group.data.length > 10 && (
                          <div className="px-3 py-2 text-center text-xs text-gray-500 border-t border-[#21262d]">
                            +{group.data.length - 10} more facilities
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              /* CARD VIEW */
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {topFacilities.slice(0, 12).map(facility => (
                  <div key={facility.id} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="min-w-0">
                        <div className="text-white font-medium text-sm truncate">{facility.name}</div>
                        <div className="text-xs text-gray-400">{facility.operator}</div>
                      </div>
                      <div className="text-lg font-bold text-amber-400">{formatCurrency(facility.subsidyGap)}</div>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {facility.city}, {facility.state}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded ${
                        facility.complianceStatus === 'Non-Compliant' ? 'bg-red-500/20 text-red-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {facility.complianceStatus}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0 hidden xl:block">
            <div className="sticky top-4 space-y-3">
              {/* Top Operators */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-400 mb-2">TOP OPERATORS</h4>
                <div className="space-y-1.5">
                  {topOperators.map(({ operator, count, totalGap }, idx) => (
                    <div key={operator} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-amber-600/20 text-amber-400 text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>
                        <span className="text-gray-300 truncate max-w-[100px]">{operator}</span>
                      </div>
                      <span className="text-amber-400 font-medium">{formatCurrency(totalGap)}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Top States */}
              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                <h4 className="text-xs font-semibold text-gray-400 mb-2">TOP STATES</h4>
                <div className="space-y-1.5">
                  {topStates.map(({ state, count, totalGap }, idx) => (
                    <div key={state} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-cyan-600/20 text-cyan-400 text-[10px] font-bold flex items-center justify-center">{idx + 1}</span>
                        <span className="text-gray-300">{state}</span>
                        <span className="text-gray-600">({count})</span>
                      </div>
                      <span className="text-cyan-400 font-medium">{formatCurrency(totalGap)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        <ConnectographyFeatureSection
          facilities={facilities}
          connectographyKeyPrefix="subsidy-tracking"
          metric="subsidyGap"
          subtitle="Flows + heatmap weighted by subsidy gap. Use Toolkit to filter, play time, save scenes, and export."
        />
        
        {/* Floating NLP Assistant */}
        <ContextualNLPWidget
          context="subsidies"
          mode="floating"
          onAction={handleNLPAction}
          dataContext={{
            itemCount: facilities.length,
            filters: { searchQuery },
          }}
        />
      </div>
    </ErrorBoundary>
  );
});

SubsidyTrackingTab.displayName = 'SubsidyTrackingTab';

