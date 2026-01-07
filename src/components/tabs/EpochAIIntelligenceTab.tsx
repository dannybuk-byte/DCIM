/**
 * Epoch AI Intelligence Tab
 * 
 * Visualizes frontier AI data center intelligence from Epoch AI's open database.
 * Helps organizers understand Big Tech's AI infrastructure expansion.
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

type ViewMode = 'grid' | 'table' | 'map';
type FilterStatus = 'all' | 'operational' | 'under-construction' | 'planned';
type SortField = 'name' | 'currentCapacityMW' | 'projectedCapacityMW' | 'operationalDate';

// === Sub-Components ===

const PowerMeter: React.FC<{ current: number; projected: number; maxPower?: number }> = ({
  current,
  projected,
  maxPower = 3500,
}) => {
  const currentPct = Math.min((current / maxPower) * 100, 100);
  const projectedPct = Math.min((projected / maxPower) * 100, 100);

  return (
    <div className="relative h-2 bg-slate-800 rounded-full overflow-hidden">
      {/* Projected bar (background) */}
      <div
        className="absolute inset-y-0 left-0 bg-amber-900/50 rounded-full transition-all duration-500"
        style={{ width: `${projectedPct}%` }}
      />
      {/* Current bar (foreground) */}
      <div
        className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500"
        style={{ width: `${currentPct}%` }}
      />
    </div>
  );
};

const StatusBadge: React.FC<{ status: EpochDataCenter['constructionStatus'] }> = ({ status }) => {
  const config = {
    operational: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', icon: Activity, label: 'Operational' },
    'under-construction': { bg: 'bg-amber-500/20', text: 'text-amber-400', icon: Construction, label: 'Building' },
    planned: { bg: 'bg-blue-500/20', text: 'text-blue-400', icon: Clock, label: 'Planned' },
  };
  const { bg, text, icon: Icon, label } = config[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${bg} ${text}`}>
      <Icon size={12} />
      {label}
    </span>
  );
};

const ConfidenceBadge: React.FC<{ confidence: 'confirmed' | 'likely' | 'speculative' }> = ({ confidence }) => {
  const config = {
    confirmed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400' },
    likely: { bg: 'bg-amber-500/20', text: 'text-amber-400' },
    speculative: { bg: 'bg-slate-500/20', text: 'text-slate-400' },
  };
  const { bg, text } = config[confidence];

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded ${bg} ${text} uppercase`}>
      {confidence}
    </span>
  );
};

const FacilityCard: React.FC<{
  facility: EpochDataCenter;
  expanded: boolean;
  onToggle: () => void;
}> = ({ facility, expanded, onToggle }) => {
  const powerComparisons = getPowerCityComparisons(facility.projectedCapacityMW);
  const growthText = facility.powerGrowthFactor === Infinity
    ? 'New build'
    : `${facility.powerGrowthFactor.toFixed(1)}x growth`;

  return (
    <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl overflow-hidden hover:border-cyan-500/30 transition-all">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-start justify-between text-left hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={facility.constructionStatus} />
            {facility.isGigawattScale && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/20 text-red-400 uppercase">
                GW Scale
              </span>
            )}
          </div>
          <h3 className="font-semibold text-white truncate">{facility.name}</h3>
          <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5">
            <MapPin size={12} />
            <span>{facility.location}</span>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-4">
          <div className="text-right">
            <div className="text-cyan-400 font-mono font-bold">
              {facility.currentCapacityMW > 0 ? `${facility.currentCapacityMW} MW` : '—'}
            </div>
            <div className="text-slate-500 text-xs">current</div>
          </div>
          {expanded ? <ChevronDown size={20} className="text-slate-500" /> : <ChevronRight size={20} className="text-slate-500" />}
        </div>
      </button>

      {/* Expanded Content */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-slate-700/50">
          {/* Power Progress */}
          <div className="pt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-slate-400">Power Capacity</span>
              <span className="text-amber-400 font-mono">{facility.projectedCapacityMW.toLocaleString()} MW projected</span>
            </div>
            <PowerMeter current={facility.currentCapacityMW} projected={facility.projectedCapacityMW} />
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>{growthText}</span>
              <span>{((facility.currentCapacityMW / facility.projectedCapacityMW) * 100).toFixed(0)}% complete</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-slate-500 text-xs mb-1 flex items-center gap-1">
                <Building2 size={10} />
                Owner
              </div>
              <div className="text-white font-medium">{facility.owner}</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3">
              <div className="text-slate-500 text-xs mb-1 flex items-center gap-1">
                <Calendar size={10} />
                Operational
              </div>
              <div className="text-white font-medium">
                {new Date(facility.operationalDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Users */}
          <div className="bg-slate-800/50 rounded-lg p-3">
            <div className="text-slate-500 text-xs mb-2 flex items-center gap-1">
              <Users size={10} />
              Known Users
            </div>
            <div className="flex flex-wrap gap-2">
              {facility.users.map((user, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="text-white">{user.name}</span>
                  <ConfidenceBadge confidence={user.confidence} />
                </div>
              ))}
            </div>
          </div>

          {/* Power Comparisons */}
          {powerComparisons.length > 0 && (
            <div className="bg-gradient-to-r from-red-500/10 to-amber-500/10 border border-red-500/20 rounded-lg p-3">
              <div className="text-red-400 text-xs font-semibold mb-2 flex items-center gap-1">
                <Flame size={12} />
                Power Impact
              </div>
              <ul className="space-y-1">
                {powerComparisons.slice(0, 2).map((comparison, idx) => (
                  <li key={idx} className="text-slate-300 text-sm flex items-center gap-2">
                    <span className="text-red-400">⚡</span>
                    {comparison}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Organizing Alert */}
          {facility.constructionStatus === 'under-construction' && (
            <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-3">
              <div className="text-cyan-400 text-xs font-semibold mb-1 flex items-center gap-1">
                <AlertTriangle size={12} />
                ORGANIZING WINDOW
              </div>
              <p className="text-slate-300 text-sm">
                Construction phase is the best time for worker organizing and community engagement.
                Estimated completion: {new Date(facility.operationalDate).toLocaleDateString()}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subValue?: string;
  highlight?: boolean;
}> = ({ icon, label, value, subValue, highlight }) => (
  <div className={`rounded-xl p-4 ${highlight ? 'bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30' : 'bg-slate-900/80 border border-slate-700/50'}`}>
    <div className="flex items-center gap-2 text-slate-400 text-sm mb-2">
      {icon}
      {label}
    </div>
    <div className="text-2xl font-bold text-white">{value}</div>
    {subValue && <div className="text-slate-500 text-xs mt-1">{subValue}</div>}
  </div>
);

// === Main Component ===

export const EpochAIIntelligenceTab: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const [sortField, setSortField] = useState<SortField>('currentCapacityMW');
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Computed data
  const totalPower = getTotalPowerConsumption();
  const powerByOwner = getPowerByOwner();
  const constructionFacilities = getFacilitiesInConstructionWindow();
  const gigawattFacilities = getGigawattScaleFacilities();

  // Filter and sort facilities
  const filteredFacilities = useMemo(() => {
    let result = [...EPOCH_KNOWN_FACILITIES];

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f =>
        f.name.toLowerCase().includes(q) ||
        f.location.toLowerCase().includes(q) ||
        f.owner.toLowerCase().includes(q) ||
        f.users.some(u => u.name.toLowerCase().includes(q))
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      result = result.filter(f => f.constructionStatus === filterStatus);
    }

    // Sort
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600">
                <Cpu className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold">AI Infrastructure Intelligence</h1>
            </div>
            <p className="text-slate-400">
              Real-time tracking of frontier AI data centers • Powered by{' '}
              <a
                href={EPOCH_SOURCES.satelliteExplorer}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline inline-flex items-center gap-1"
              >
                Epoch AI <ExternalLink size={12} />
              </a>
            </p>
          </div>
          <div className="flex items-center gap-3">
            <a
              href={EPOCH_SOURCES.allDataZip}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Download size={16} />
              Download Data
            </a>
            <a
              href={EPOCH_SOURCES.methodology}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm flex items-center gap-2 transition-colors"
            >
              <Info size={16} />
              Methodology
            </a>
          </div>
        </div>

        {/* Attribution Banner */}
        <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg px-4 py-2 text-xs text-slate-400">
          {EPOCH_ATTRIBUTION}
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Factory size={16} />}
          label="Tracked Facilities"
          value={EPOCH_KNOWN_FACILITIES.length}
          subValue="Frontier AI data centers"
        />
        <StatCard
          icon={<Zap size={16} />}
          label="Total Current Power"
          value={`${(totalPower.current / 1000).toFixed(1)} GW`}
          subValue={`${totalPower.projected.toLocaleString()} MW projected`}
          highlight
        />
        <StatCard
          icon={<Construction size={16} />}
          label="Under Construction"
          value={constructionFacilities.length}
          subValue="Organizing opportunities"
        />
        <StatCard
          icon={<TrendingUp size={16} />}
          label="GW-Scale Facilities"
          value={gigawattFacilities.length}
          subValue="1+ gigawatt capacity"
        />
      </div>

      {/* Power by Owner Chart */}
      <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Building2 size={20} className="text-cyan-400" />
          Power Consumption by Owner
        </h2>
        <div className="space-y-3">
          {ownerData.map(({ owner, current, projected }) => (
            <div key={owner}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-slate-300 font-medium">{owner}</span>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-cyan-400">{current.toLocaleString()} MW</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-amber-400">{projected.toLocaleString()} MW</span>
                </div>
              </div>
              <PowerMeter current={current} projected={projected} maxPower={Math.max(...ownerData.map(d => d.projected))} />
            </div>
          ))}
        </div>
      </div>

      {/* Organizing Alert Panel */}
      {constructionFacilities.length > 0 && (
        <div className="bg-gradient-to-r from-cyan-500/10 via-blue-500/10 to-purple-500/10 border border-cyan-500/30 rounded-xl p-6 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="text-cyan-400" size={24} />
            <h2 className="text-lg font-semibold">Active Organizing Windows</h2>
          </div>
          <p className="text-slate-300 mb-4">
            These facilities are currently under construction — the optimal time for worker organizing
            and community engagement before operations begin.
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {constructionFacilities.map(facility => (
              <div key={facility.name} className="bg-slate-900/80 rounded-lg p-4 border border-cyan-500/20">
                <div className="font-medium text-white mb-1">{facility.name}</div>
                <div className="text-sm text-slate-400 mb-2">{facility.location}</div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-amber-400">{facility.projectedCapacityMW.toLocaleString()} MW planned</span>
                  <span className="text-slate-500">
                    Est. {new Date(facility.operationalDate).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search facilities, owners, locations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-slate-500" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="operational">Operational</option>
            <option value="under-construction">Under Construction</option>
            <option value="planned">Planned</option>
          </select>
        </div>

        <select
          value={`${sortField}-${sortDesc ? 'desc' : 'asc'}`}
          onChange={(e) => {
            const [field, dir] = e.target.value.split('-');
            setSortField(field as SortField);
            setSortDesc(dir === 'desc');
          }}
          className="px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
        >
          <option value="currentCapacityMW-desc">Current Power (High → Low)</option>
          <option value="currentCapacityMW-asc">Current Power (Low → High)</option>
          <option value="projectedCapacityMW-desc">Projected Power (High → Low)</option>
          <option value="projectedCapacityMW-asc">Projected Power (Low → High)</option>
          <option value="operationalDate-desc">Newest First</option>
          <option value="operationalDate-asc">Oldest First</option>
          <option value="name-asc">Name (A → Z)</option>
        </select>

        <div className="text-slate-500 text-sm">
          {filteredFacilities.length} facilities
        </div>
      </div>

      {/* Facility Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredFacilities.map(facility => (
          <FacilityCard
            key={facility.name}
            facility={facility}
            expanded={expandedFacility === facility.name}
            onToggle={() => setExpandedFacility(
              expandedFacility === facility.name ? null : facility.name
            )}
          />
        ))}
      </div>

      {filteredFacilities.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <Search size={48} className="mx-auto mb-4 opacity-50" />
          <p>No facilities match your search criteria</p>
        </div>
      )}

      {/* Power Impact Comparison */}
      <div className="mt-8 bg-slate-900/80 border border-slate-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Home size={20} className="text-amber-400" />
          Power Consumption Context
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <div className="text-3xl font-bold text-cyan-400 mb-2">
              {(totalPower.current / 1000).toFixed(2)} GW
            </div>
            <div className="text-slate-400 text-sm">Current AI Data Center Power</div>
            <div className="text-slate-500 text-xs mt-1">
              ≈ {(totalPower.current / 2400).toFixed(1)}x Los Angeles
            </div>
          </div>
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <div className="text-3xl font-bold text-amber-400 mb-2">
              {(totalPower.projected / 1000).toFixed(1)} GW
            </div>
            <div className="text-slate-400 text-sm">Projected Total Power</div>
            <div className="text-slate-500 text-xs mt-1">
              ≈ {Math.round(totalPower.projected / 1000)} nuclear reactors
            </div>
          </div>
          <div className="text-center p-4 bg-slate-800/50 rounded-lg">
            <div className="text-3xl font-bold text-red-400 mb-2">
              {Math.round(totalPower.projected * 1000 / 1.2).toLocaleString()}
            </div>
            <div className="text-slate-400 text-sm">Equivalent US Homes</div>
            <div className="text-slate-500 text-xs mt-1">
              At projected capacity
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center text-xs text-slate-500">
        <p>
          Data updated regularly from Epoch AI's Frontier Data Centers database.
          {' '}
          <a href={EPOCH_SOURCES.satelliteExplorer} target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
            Explore satellite imagery →
          </a>
        </p>
      </div>
    </div>
  );
};

export default EpochAIIntelligenceTab;

