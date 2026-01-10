/**
 * Epoch AI Intelligence Tab - High Density Layout
 * 
 * Maximizes data visibility without page scrolling.
 * Uses scrollable regions within fixed containers.
 * 
 * Source: https://epoch.ai/data/data-centers (CC-BY licensed)
 */

import React, { useState, useMemo } from 'react';
import {
  Zap,
  MapPin,
  Building2,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  Activity,
  Factory,
  Users,
  Calendar,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  Info,
  Cpu,
  Flame,
  Home,
  Construction,
  Clock,
  LayoutGrid,
  List,
  ChevronUp,
} from 'lucide-react';
import {
  EPOCH_KNOWN_FACILITIES,
  EPOCH_SOURCES,
  EPOCH_ATTRIBUTION,
  getFacilitiesInConstructionWindow,
  getGigawattScaleFacilities,
  getPowerByOwner,
  getTotalPowerConsumption,
  getPowerCityComparisons,
  type EpochDataCenter,
} from '../../integrations/epochAI';

// === Types ===

type ViewMode = 'cards' | 'table' | 'compact';
type FilterStatus = 'all' | 'operational' | 'under-construction' | 'planned';
type SortField = 'name' | 'currentCapacityMW' | 'projectedCapacityMW' | 'operationalDate';

// === Sub-Components ===

const PowerMeter: React.FC<{ current: number; projected: number; maxPower?: number; compact?: boolean }> = ({
  current,
  projected,
  maxPower = 3500,
  compact = false,
}) => {
  const currentPct = Math.min((current / maxPower) * 100, 100);
  const projectedPct = Math.min((projected / maxPower) * 100, 100);

  return (
    <div className={`relative ${compact ? 'h-1.5' : 'h-2'} bg-slate-800 rounded-full overflow-hidden`}>
      <div
        className="absolute inset-y-0 left-0 bg-amber-900/50 rounded-full transition-all duration-300"
        style={{ width: `${projectedPct}%` }}
      />
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-300"
        style={{ width: `${currentPct}%` }}
      />
    </div>
  );
};

const StatusBadge: React.FC<{ status: EpochDataCenter['constructionStatus']; compact?: boolean }> = ({ status, compact }) => {
  const config = {
    operational: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Live' },
    'under-construction': { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Building' },
    planned: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Planned' },
  };
  const { bg, text, label } = config[status];

  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${bg} ${text}`}>
      {compact ? label.charAt(0) : label}
    </span>
  );
};

const MiniStatCard: React.FC<{
  icon: React.ReactNode;
  value: string | number;
  label: string;
  highlight?: boolean;
}> = ({ icon, value, label, highlight }) => (
  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${highlight ? 'bg-cyan-500/10 border border-cyan-500/30' : 'bg-slate-800/50'}`}>
    <span className="text-slate-500">{icon}</span>
    <div>
      <div className={`text-sm font-bold ${highlight ? 'text-cyan-400' : 'text-white'}`}>{value}</div>
      <div className="text-[10px] text-slate-500 uppercase">{label}</div>
    </div>
  </div>
);

// Compact facility row for table view
const FacilityRow: React.FC<{
  facility: EpochDataCenter;
  isExpanded: boolean;
  onToggle: () => void;
}> = ({ facility, isExpanded, onToggle }) => {
  const powerComparisons = getPowerCityComparisons(facility.projectedCapacityMW);

  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer hover:bg-slate-800/50 border-b border-slate-800/50 transition-colors"
      >
        <td className="py-2 px-3">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
            <div>
              <div className="font-medium text-white text-sm">{facility.name}</div>
              <div className="text-[10px] text-slate-500">{facility.location}</div>
            </div>
          </div>
        </td>
        <td className="py-2 px-2">
          <StatusBadge status={facility.constructionStatus} compact />
        </td>
        <td className="py-2 px-2 text-right">
          <span className="text-cyan-400 font-mono text-sm">{facility.currentCapacityMW || '—'}</span>
        </td>
        <td className="py-2 px-2 text-right">
          <span className="text-amber-400 font-mono text-sm">{facility.projectedCapacityMW.toLocaleString()}</span>
        </td>
        <td className="py-2 px-2 w-24">
          <PowerMeter current={facility.currentCapacityMW} projected={facility.projectedCapacityMW} compact />
        </td>
        <td className="py-2 px-2 text-slate-400 text-xs">{facility.owner}</td>
        <td className="py-2 px-2">
          {facility.isGigawattScale && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">GW</span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr className="bg-slate-900/50">
          <td colSpan={7} className="p-3">
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div>
                <div className="text-slate-500 mb-1">Users</div>
                <div className="flex flex-wrap gap-1">
                  {facility.users.map((u, i) => (
                    <span key={i} className="px-1.5 py-0.5 bg-slate-800 rounded text-slate-300">
                      {u.name}
                      <span className={`ml-1 text-[9px] ${u.confidence === 'confirmed' ? 'text-emerald-400' : u.confidence === 'likely' ? 'text-amber-400' : 'text-slate-500'}`}>
                        {u.confidence === 'confirmed' ? '✓' : u.confidence === 'likely' ? '~' : '?'}
                      </span>
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">Operational</div>
                <div className="text-white">{new Date(facility.operationalDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">Growth</div>
                <div className="text-white">{facility.powerGrowthFactor === Infinity ? 'New' : `${facility.powerGrowthFactor.toFixed(1)}x`}</div>
              </div>
              <div>
                <div className="text-slate-500 mb-1">Impact</div>
                <div className="text-amber-400">{powerComparisons[0]?.split('(')[0] || '—'}</div>
              </div>
            </div>
            {facility.constructionStatus === 'under-construction' && (
              <div className="mt-2 px-2 py-1.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-cyan-400 text-xs flex items-center gap-2">
                <AlertTriangle size={12} />
                <span>ORGANIZING WINDOW - Construction phase active</span>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
};

// Collapsible section wrapper
const CollapsibleSection: React.FC<{
  title: string;
  icon: React.ReactNode;
  badge?: string | number;
  defaultOpen?: boolean;
  children: React.ReactNode;
  maxHeight?: string;
}> = ({ title, icon, badge, defaultOpen = true, children, maxHeight = '200px' }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3 py-2 bg-slate-800/50 flex items-center justify-between hover:bg-slate-800 transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-white">
          {icon}
          {title}
          {badge !== undefined && (
            <span className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-slate-400">{badge}</span>
          )}
        </div>
        {isOpen ? <ChevronUp size={14} className="text-slate-500" /> : <ChevronDown size={14} className="text-slate-500" />}
      </button>
      {isOpen && (
        <div className="overflow-y-auto" style={{ maxHeight }}>
          {children}
        </div>
      )}
    </div>
  );
};

// === Main Component ===

export const EpochAIIntelligenceTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('currentCapacityMW');
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');

  // Computed data
  const totalPower = getTotalPowerConsumption();
  const powerByOwner = getPowerByOwner();
  const constructionFacilities = getFacilitiesInConstructionWindow();
  const gigawattFacilities = getGigawattScaleFacilities();

  // Filter and sort facilities
  const filteredFacilities = useMemo(() => {
    let result = [...EPOCH_KNOWN_FACILITIES];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.owner.toLowerCase().includes(q) ||
        f.users.some(u => u.name.toLowerCase().includes(q))
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter(f => f.constructionStatus === filterStatus);
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'currentCapacityMW':
          comparison = a.currentCapacityMW - b.currentCapacityMW;
          break;
        case 'projectedCapacityMW':
          comparison = a.projectedCapacityMW - b.projectedCapacityMW;
          break;
        case 'operationalDate':
          comparison = new Date(a.operationalDate).getTime() - new Date(b.operationalDate).getTime();
          break;
      }
      return sortDesc ? -comparison : comparison;
    });

    return result;
  }, [searchQuery, filterStatus, sortField, sortDesc]);

  // Owner breakdown for chart
  const ownerData = Object.entries(powerByOwner)
    .map(([owner, power]) => ({ owner, ...power }))
    .sort((a, b) => b.projected - a.projected);

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Sticky Header - Always Visible */}
      <div className="flex-shrink-0 border-b border-slate-800 bg-slate-950/95 backdrop-blur-sm">
        {/* Title Bar */}
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold flex items-center gap-2">
                AI Infrastructure Intelligence
                <a
                  href={EPOCH_SOURCES.satelliteExplorer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cyan-400 text-xs font-normal hover:underline inline-flex items-center gap-1"
                >
                  Epoch AI <ExternalLink size={10} />
                </a>
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={EPOCH_SOURCES.allDataZip}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs flex items-center gap-1"
            >
              <Download size={12} /> CSV
            </a>
            <a
              href={EPOCH_SOURCES.methodology}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs flex items-center gap-1"
            >
              <Info size={12} /> Method
            </a>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="px-4 py-2 flex items-center gap-3 overflow-x-auto">
          <MiniStatCard icon={<Factory size={14} />} value={EPOCH_KNOWN_FACILITIES.length} label="Tracked" />
          <MiniStatCard icon={<Zap size={14} />} value={`${(totalPower.current / 1000).toFixed(1)} GW`} label="Current" highlight />
          <MiniStatCard icon={<TrendingUp size={14} />} value={`${(totalPower.projected / 1000).toFixed(1)} GW`} label="Projected" />
          <MiniStatCard icon={<Construction size={14} />} value={constructionFacilities.length} label="Building" />
          <MiniStatCard icon={<AlertTriangle size={14} />} value={gigawattFacilities.length} label="GW-Scale" />
          
          {/* View Toggle */}
          <div className="ml-auto flex items-center gap-1 bg-slate-800 rounded p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded ${viewMode === 'table' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
              title="Table View"
            >
              <List size={14} />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded ${viewMode === 'cards' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
              title="Cards View"
            >
              <LayoutGrid size={14} />
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="px-4 py-2 flex items-center gap-3 border-t border-slate-800/50">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search facilities..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="operational">Operational</option>
            <option value="under-construction">Building</option>
            <option value="planned">Planned</option>
          </select>
          <select
            value={`${sortField}-${sortDesc ? 'desc' : 'asc'}`}
            onChange={(e) => {
              const [field, dir] = e.target.value.split('-');
              setSortField(field as SortField);
              setSortDesc(dir === 'desc');
            }}
            className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="currentCapacityMW-desc">Power ↓</option>
            <option value="currentCapacityMW-asc">Power ↑</option>
            <option value="projectedCapacityMW-desc">Projected ↓</option>
            <option value="name-asc">Name A-Z</option>
          </select>
          <span className="text-xs text-slate-500">{filteredFacilities.length} facilities</span>
        </div>
      </div>

      {/* Main Content - Scrollable Split Panes */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Insights & Alerts */}
        <div className="w-72 flex-shrink-0 border-r border-slate-800 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {/* Organizing Windows Alert */}
            {constructionFacilities.length > 0 && (
              <CollapsibleSection
                title="Organizing Windows"
                icon={<AlertTriangle size={14} className="text-cyan-400" />}
                badge={constructionFacilities.length}
                maxHeight="180px"
              >
                <div className="p-2 space-y-2">
                  {constructionFacilities.map(f => (
                    <div
                      key={f.name}
                      className="p-2 bg-cyan-500/5 border border-cyan-500/20 rounded cursor-pointer hover:bg-cyan-500/10"
                      onClick={() => setExpandedFacility(f.name)}
                    >
                      <div className="font-medium text-white text-xs">{f.name}</div>
                      <div className="text-[10px] text-slate-500">{f.location}</div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-amber-400 text-[10px]">{f.projectedCapacityMW.toLocaleString()} MW</span>
                        <span className="text-slate-500 text-[10px]">
                          Est. {new Date(f.operationalDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CollapsibleSection>
            )}

            {/* Power by Owner */}
            <CollapsibleSection
              title="Power by Owner"
              icon={<Building2 size={14} className="text-slate-400" />}
              maxHeight="200px"
            >
              <div className="p-2 space-y-2">
                {ownerData.map(({ owner, current, projected }) => (
                  <div key={owner} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 truncate max-w-[100px]">{owner}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-cyan-400 font-mono">{current}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-amber-400 font-mono">{projected}</span>
                      </div>
                    </div>
                    <PowerMeter current={current} projected={projected} maxPower={Math.max(...ownerData.map(d => d.projected))} compact />
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* GW Scale Facilities */}
            <CollapsibleSection
              title="Gigawatt Scale"
              icon={<Flame size={14} className="text-red-400" />}
              badge={gigawattFacilities.length}
              maxHeight="160px"
            >
              <div className="p-2 space-y-1.5">
                {gigawattFacilities.map(f => (
                  <div
                    key={f.name}
                    className="flex items-center justify-between p-1.5 bg-slate-800/50 rounded text-xs cursor-pointer hover:bg-slate-800"
                    onClick={() => setExpandedFacility(f.name)}
                  >
                    <div className="truncate max-w-[120px]">
                      <div className="text-white">{f.name}</div>
                    </div>
                    <span className="text-red-400 font-mono">{(f.projectedCapacityMW / 1000).toFixed(1)} GW</span>
                  </div>
                ))}
              </div>
            </CollapsibleSection>

            {/* Power Context */}
            <CollapsibleSection
              title="Power Context"
              icon={<Home size={14} className="text-slate-400" />}
              defaultOpen={false}
            >
              <div className="p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">vs Los Angeles</span>
                  <span className="text-amber-400">{(totalPower.projected / 2400).toFixed(1)}x</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Nuclear Reactors</span>
                  <span className="text-amber-400">≈{Math.round(totalPower.projected / 1000)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">US Homes</span>
                  <span className="text-amber-400">{Math.round(totalPower.projected * 1000 / 1.2).toLocaleString()}</span>
                </div>
              </div>
            </CollapsibleSection>
          </div>

          {/* Attribution */}
          <div className="flex-shrink-0 p-2 border-t border-slate-800 text-[9px] text-slate-600">
            CC-BY Epoch AI • Updated Jan 2026
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {viewMode === 'table' ? (
            /* Table View */
            <div className="flex-1 overflow-auto">
              <table className="w-full text-left">
                <thead className="sticky top-0 bg-slate-900 text-xs text-slate-500 uppercase">
                  <tr>
                    <th className="py-2 px-3 font-medium">Facility</th>
                    <th className="py-2 px-2 font-medium">Status</th>
                    <th className="py-2 px-2 font-medium text-right">MW</th>
                    <th className="py-2 px-2 font-medium text-right">Proj.</th>
                    <th className="py-2 px-2 font-medium">Progress</th>
                    <th className="py-2 px-2 font-medium">Owner</th>
                    <th className="py-2 px-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredFacilities.map(facility => (
                    <FacilityRow
                      key={facility.name}
                      facility={facility}
                      isExpanded={expandedFacility === facility.name}
                      onToggle={() => setExpandedFacility(expandedFacility === facility.name ? null : facility.name)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Cards View */
            <div className="flex-1 overflow-auto p-3">
              <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredFacilities.map(facility => {
                  const isExpanded = expandedFacility === facility.name;
                  const powerComparisons = getPowerCityComparisons(facility.projectedCapacityMW);

                  return (
                    <div
                      key={facility.name}
                      className={`bg-slate-900/80 border rounded-lg overflow-hidden transition-all ${
                        isExpanded ? 'border-cyan-500/50 col-span-2' : 'border-slate-700/50 hover:border-slate-600'
                      }`}
                    >
                      <div
                        onClick={() => setExpandedFacility(isExpanded ? null : facility.name)}
                        className="p-3 cursor-pointer"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <StatusBadge status={facility.constructionStatus} />
                              {facility.isGigawattScale && (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-red-500/20 text-red-400">GW</span>
                              )}
                            </div>
                            <h3 className="font-medium text-white text-sm">{facility.name}</h3>
                            <div className="flex items-center gap-1 text-slate-500 text-xs">
                              <MapPin size={10} />
                              {facility.location}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-cyan-400 font-mono font-bold text-sm">
                              {facility.currentCapacityMW > 0 ? `${facility.currentCapacityMW}` : '—'}
                            </div>
                            <div className="text-slate-500 text-[10px]">MW</div>
                          </div>
                        </div>
                        <PowerMeter current={facility.currentCapacityMW} projected={facility.projectedCapacityMW} />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                          <span>{facility.owner}</span>
                          <span className="text-amber-400">{facility.projectedCapacityMW.toLocaleString()} MW proj.</span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 pt-1 border-t border-slate-800 space-y-2">
                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <div className="text-slate-500 text-[10px]">Users</div>
                              <div className="flex flex-wrap gap-1 mt-0.5">
                                {facility.users.map((u, i) => (
                                  <span key={i} className="text-slate-300">{u.name}</span>
                                ))}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-[10px]">Online</div>
                              <div className="text-white">
                                {new Date(facility.operationalDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                              </div>
                            </div>
                            <div>
                              <div className="text-slate-500 text-[10px]">Growth</div>
                              <div className="text-white">
                                {facility.powerGrowthFactor === Infinity ? 'New build' : `${facility.powerGrowthFactor.toFixed(1)}x`}
                              </div>
                            </div>
                          </div>
                          {powerComparisons.length > 0 && (
                            <div className="text-[10px] text-amber-400">
                              ⚡ {powerComparisons[0]}
                            </div>
                          )}
                          {facility.constructionStatus === 'under-construction' && (
                            <div className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-cyan-400 text-[10px] flex items-center gap-1">
                              <AlertTriangle size={10} />
                              ORGANIZING WINDOW
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EpochAIIntelligenceTab;
