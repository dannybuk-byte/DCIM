/**
 * MISSION CONTROL LAYOUT
 * 
 * Three-panel command center optimized for maximum data density:
 * - Left: KPIs, filters, alerts (15%, collapsible)
 * - Center: Primary view - Map/Table/Analytics (60%, switchable)
 * - Right: Facility details (25%, collapsible)
 * 
 * Features:
 * - Persistent status bar with live metrics
 * - Zero context loss - multiple views visible simultaneously
 * - Click any facility → instant detail display
 * - All critical data within 1-2 clicks
 */

import { useState, useMemo, useCallback, memo } from 'react';
import { 
  Building2, 
  AlertTriangle, 
  DollarSign, 
  Bell,
  Search,
  Filter,
  X,
  ChevronLeft,
  ChevronRight,
  Map as MapIcon,
  Table as TableIcon,
  BarChart3,
  Network,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  XCircle,
  Clock,
  Download,
  RefreshCw,
  Eye,
  EyeOff,
} from 'lucide-react';
import { Facility, ComplianceStats } from '../types';
import { formatCurrency } from '../utils/formatting';
import { StatCard } from './shared/StatCard';
import { AutocompleteInput } from './shared/AutocompleteInput';
import { useOperatorAutocomplete, useStateAutocomplete } from '../hooks/useAutocompleteOptions';

interface MissionControlLayoutProps {
  facilities: Facility[];
  stats: ComplianceStats;
  onRefresh?: () => void;
}

type CenterView = 'map' | 'table' | 'analytics' | 'network';

export const MissionControlLayout = memo(function MissionControlLayout({
  facilities,
  stats,
  onRefresh,
}: MissionControlLayoutProps) {
  // Panel visibility state
  const [leftPanelVisible, setLeftPanelVisible] = useState(true);
  const [rightPanelVisible, setRightPanelVisible] = useState(true);
  
  // View state
  const [centerView, setCenterView] = useState<CenterView>('table');
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  
  // Filter state
  const [filters, setFilters] = useState({
    search: '',
    state: '',
    operator: '',
    status: 'all' as 'all' | 'compliant' | 'non-compliant' | 'at-risk',
  });

  // Autocomplete options
  const stateOptions = useStateAutocomplete(facilities);
  const operatorOptions = useOperatorAutocomplete(facilities);

  // Filtered facilities
  const filteredFacilities = useMemo(() => {
    return facilities.filter(f => {
      if (filters.search && !f.name.toLowerCase().includes(filters.search.toLowerCase())) {
        return false;
      }
      if (filters.state && f.state !== filters.state) return false;
      if (filters.operator && f.operator !== filters.operator) return false;
      if (filters.status !== 'all') {
        if (filters.status === 'compliant' && f.complianceStatus !== 'Compliant') return false;
        if (filters.status === 'non-compliant' && f.complianceStatus !== 'Non-Compliant') return false;
        if (filters.status === 'at-risk' && f.complianceStatus !== 'At Risk') return false;
      }
      return true;
    });
  }, [facilities, filters]);

  // Alerts (facilities with urgent issues)
  const alerts = useMemo(() => {
    return facilities.filter(f => 
      f.complianceStatus === 'Non-Compliant' && 
      f.subsidyGap > 20_000_000
    ).length;
  }, [facilities]);

  const handleFacilityClick = useCallback((facility: Facility) => {
    setSelectedFacility(facility);
    if (!rightPanelVisible) {
      setRightPanelVisible(true);
    }
  }, [rightPanelVisible]);

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      state: '',
      operator: '',
      status: 'all',
    });
  }, []);

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100">
      {/* PERSISTENT STATUS BAR */}
      <div className="bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900 border-b border-cyan-500/30 px-2 py-1 flex items-center justify-between shadow-lg shadow-cyan-500/10">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white">MISSION CONTROL</span>
          </div>
          
          <div className="h-4 w-px bg-gray-700" />
          
          {/* Live Metrics Strip */}
          <div className="flex items-center gap-2 text-[10px]">
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-900/30 border border-blue-500/30 rounded">
              <Building2 className="w-3 h-3 text-blue-400" />
              <span className="text-blue-300 font-bold">{stats.totalFacilities.toLocaleString()}</span>
              <span className="text-blue-500">facilities</span>
            </div>
            
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-900/30 border border-red-500/30 rounded animate-pulse">
              <XCircle className="w-3 h-3 text-red-400" />
              <span className="text-red-300 font-bold">{stats.nonCompliant.toLocaleString()}</span>
              <span className="text-red-500">NC</span>
            </div>
            
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-900/30 border border-yellow-500/30 rounded">
              <AlertTriangle className="w-3 h-3 text-yellow-400" />
              <span className="text-yellow-300 font-bold">{stats.atRisk.toLocaleString()}</span>
              <span className="text-yellow-500">at risk</span>
            </div>
            
            <div className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-900/30 border border-orange-500/30 rounded">
              <DollarSign className="w-3 h-3 text-orange-400" />
              <span className="text-orange-300 font-bold">{formatCurrency(stats.totalSubsidyGap)}</span>
              <span className="text-orange-500">gap</span>
            </div>
            
            {alerts > 0 && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-red-900/50 border border-red-500/50 rounded animate-pulse">
                <Bell className="w-3 h-3 text-red-400" />
                <span className="text-red-300 font-bold">{alerts}</span>
                <span className="text-red-500">alerts</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            className="px-2 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-bold rounded flex items-center gap-1 transition-all"
            title="Refresh data"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
          
          <div className="text-[9px] text-cyan-400">
            {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>

      {/* SEARCH & FILTER BAR */}
      <div className="bg-gray-900 border-b border-gray-800 px-2 py-1">
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Search facilities..."
              className="w-full pl-7 pr-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
            className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="all">All Status</option>
            <option value="compliant">✅ Compliant</option>
            <option value="at-risk">⚠️ At Risk</option>
            <option value="non-compliant">❌ Non-Compliant</option>
          </select>

          {(filters.search || filters.state || filters.operator || filters.status !== 'all') && (
            <button
              onClick={clearFilters}
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white text-[10px] rounded flex items-center gap-1"
              title="Clear filters"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}
        </div>
      </div>

      {/* MAIN THREE-PANEL LAYOUT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL - KPIs & Filters */}
        {leftPanelVisible && (
          <div className="w-52 bg-gray-900 border-r border-gray-800 flex flex-col overflow-y-auto">
            {/* KPI Cards */}
            <div className="p-1.5 space-y-1">
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1">Quick Stats</div>
              
              <StatCard
                label="Non-Compliant"
                value={stats.nonCompliant.toLocaleString()}
                color="red"
                icon={<XCircle className="w-3 h-3" />}
                onClick={() => setFilters({ ...filters, status: 'non-compliant' })}
              />
              
              <StatCard
                label="At Risk"
                value={stats.atRisk.toLocaleString()}
                color="yellow"
                icon={<AlertTriangle className="w-3 h-3" />}
                onClick={() => setFilters({ ...filters, status: 'at-risk' })}
              />
              
              <StatCard
                label="Total Gap"
                value={formatCurrency(stats.totalSubsidyGap)}
                color="amber"
                icon={<DollarSign className="w-3 h-3" />}
              />
            </div>

            {/* Filters */}
            <div className="p-1.5 border-t border-gray-800">
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                <Filter className="w-3 h-3" />
                Filters
              </div>
              
              <div className="space-y-1.5">
                <div>
                  <label className="block text-[9px] text-gray-500 mb-0.5">State</label>
                  <AutocompleteInput
                    value={filters.state}
                    onChange={(value) => setFilters({ ...filters, state: value })}
                    options={stateOptions}
                    placeholder="Any state"
                    className="text-[10px]"
                    minChars={1}
                    maxSuggestions={10}
                    id="filter-state-mc"
                  />
                </div>
                
                <div>
                  <label className="block text-[9px] text-gray-500 mb-0.5">Operator</label>
                  <AutocompleteInput
                    value={filters.operator}
                    onChange={(value) => setFilters({ ...filters, operator: value })}
                    options={operatorOptions}
                    placeholder="Any operator"
                    className="text-[10px]"
                    minChars={1}
                    maxSuggestions={10}
                    id="filter-operator-mc"
                  />
                </div>
              </div>
            </div>

            {/* Alerts Section */}
            {alerts > 0 && (
              <div className="p-1.5 border-t border-gray-800">
                <div className="text-[9px] font-bold text-red-400 uppercase mb-1 flex items-center gap-1">
                  <Bell className="w-3 h-3" />
                  Urgent Alerts ({alerts})
                </div>
                <div className="text-[10px] text-gray-400">
                  High-value non-compliant facilities requiring immediate attention
                </div>
              </div>
            )}
          </div>
        )}

        {/* LEFT PANEL TOGGLE */}
        <button
          onClick={() => setLeftPanelVisible(!leftPanelVisible)}
          className="w-4 bg-gray-800 hover:bg-gray-700 border-r border-gray-700 flex items-center justify-center group"
          title={leftPanelVisible ? 'Hide left panel' : 'Show left panel'}
        >
          {leftPanelVisible ? (
            <ChevronLeft className="w-3 h-3 text-gray-500 group-hover:text-cyan-400" />
          ) : (
            <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-cyan-400" />
          )}
        </button>

        {/* CENTER PANEL - Primary View */}
        <div className="flex-1 flex flex-col bg-gray-950 overflow-hidden">
          {/* View Switcher */}
          <div className="bg-gray-900 border-b border-gray-800 px-2 py-1 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCenterView('table')}
                className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all ${
                  centerView === 'table'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <TableIcon className="w-3 h-3" />
                Table
              </button>
              
              <button
                onClick={() => setCenterView('map')}
                className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all ${
                  centerView === 'map'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <MapIcon className="w-3 h-3" />
                Map
              </button>
              
              <button
                onClick={() => setCenterView('analytics')}
                className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all ${
                  centerView === 'analytics'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <BarChart3 className="w-3 h-3" />
                Analytics
              </button>
              
              <button
                onClick={() => setCenterView('network')}
                className={`px-2 py-1 text-[10px] font-bold rounded flex items-center gap-1 transition-all ${
                  centerView === 'network'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                }`}
              >
                <Network className="w-3 h-3" />
                Network
              </button>
            </div>

            <div className="text-[10px] text-gray-500">
              Showing {filteredFacilities.length} of {facilities.length} facilities
            </div>
          </div>

          {/* View Content */}
          <div className="flex-1 overflow-auto p-1.5">
            {centerView === 'table' && (
              <FacilityTableView 
                facilities={filteredFacilities}
                onFacilityClick={handleFacilityClick}
                selectedFacility={selectedFacility}
              />
            )}
            
            {centerView === 'map' && (
              <div className="h-full flex items-center justify-center bg-gray-900 rounded border border-gray-800">
                <div className="text-center text-gray-500">
                  <MapIcon className="w-12 h-12 mx-auto mb-2 text-gray-700" />
                  <p className="text-sm">Map view coming soon</p>
                  <p className="text-xs">Will show facilities on interactive map with clustering</p>
                </div>
              </div>
            )}
            
            {centerView === 'analytics' && (
              <div className="h-full flex items-center justify-center bg-gray-900 rounded border border-gray-800">
                <div className="text-center text-gray-500">
                  <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-700" />
                  <p className="text-sm">Analytics view coming soon</p>
                  <p className="text-xs">Will show charts, trends, and predictions</p>
                </div>
              </div>
            )}
            
            {centerView === 'network' && (
              <div className="h-full flex items-center justify-center bg-gray-900 rounded border border-gray-800">
                <div className="text-center text-gray-500">
                  <Network className="w-12 h-12 mx-auto mb-2 text-gray-700" />
                  <p className="text-sm">Network view coming soon</p>
                  <p className="text-xs">Will show facility relationships and connections</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT PANEL TOGGLE */}
        <button
          onClick={() => setRightPanelVisible(!rightPanelVisible)}
          className="w-4 bg-gray-800 hover:bg-gray-700 border-l border-gray-700 flex items-center justify-center group"
          title={rightPanelVisible ? 'Hide details panel' : 'Show details panel'}
        >
          {rightPanelVisible ? (
            <ChevronRight className="w-3 h-3 text-gray-500 group-hover:text-cyan-400" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-gray-500 group-hover:text-cyan-400" />
          )}
        </button>

        {/* RIGHT PANEL - Facility Details */}
        {rightPanelVisible && (
          <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col overflow-y-auto">
            {selectedFacility ? (
              <FacilityDetailPanel 
                facility={selectedFacility}
                onClose={() => setSelectedFacility(null)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-4">
                <div className="text-center text-gray-500">
                  <Eye className="w-12 h-12 mx-auto mb-2 text-gray-700" />
                  <p className="text-sm mb-1">No facility selected</p>
                  <p className="text-xs">Click any facility to view details</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="bg-gray-900 border-t border-gray-800 px-2 py-1 flex items-center justify-between text-[9px] text-gray-500">
        <div className="flex items-center gap-2">
          <span>Data sources: EPA ECHO, BLS, Census</span>
          <span>•</span>
          <span>Last update: {new Date().toLocaleString()}</span>
        </div>
        
        <button className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors">
          <Download className="w-3 h-3" />
          Export
        </button>
      </div>
    </div>
  );
});

// ============================================================================
// FACILITY TABLE VIEW
// ============================================================================

interface FacilityTableViewProps {
  facilities: Facility[];
  onFacilityClick: (facility: Facility) => void;
  selectedFacility: Facility | null;
}

const FacilityTableView = memo(function FacilityTableView({
  facilities,
  onFacilityClick,
  selectedFacility,
}: FacilityTableViewProps) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-[10px]">
          <thead className="bg-gray-800 border-b border-gray-700 sticky top-0">
            <tr>
              <th className="px-1.5 py-1 text-left text-[9px] font-semibold text-gray-300 uppercase">Name</th>
              <th className="px-1.5 py-1 text-left text-[9px] font-semibold text-gray-300 uppercase">State</th>
              <th className="px-1.5 py-1 text-left text-[9px] font-semibold text-gray-300 uppercase">Operator</th>
              <th className="px-1.5 py-1 text-right text-[9px] font-semibold text-gray-300 uppercase">Gap</th>
              <th className="px-1.5 py-1 text-center text-[9px] font-semibold text-gray-300 uppercase">Status</th>
              <th className="px-1.5 py-1 text-center text-[9px] font-semibold text-gray-300 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {facilities.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-1.5 py-4 text-center text-gray-500">
                  No facilities found
                </td>
              </tr>
            ) : (
              facilities.map((facility) => (
                <tr
                  key={facility.id}
                  onClick={() => onFacilityClick(facility)}
                  className={`hover:bg-gray-800/50 cursor-pointer transition-colors ${
                    selectedFacility?.id === facility.id ? 'bg-cyan-900/20 border-l-2 border-cyan-500' : ''
                  }`}
                >
                  <td className="px-1.5 py-1 text-gray-300 font-medium">{facility.name}</td>
                  <td className="px-1.5 py-1 text-gray-400">{facility.state}</td>
                  <td className="px-1.5 py-1 text-gray-400 truncate max-w-[120px]">{facility.operator}</td>
                  <td className="px-1.5 py-1 text-right text-orange-400 font-bold">
                    {formatCurrency(facility.subsidyGap)}
                  </td>
                  <td className="px-1.5 py-1 text-center">
                    {facility.complianceStatus === 'Compliant' && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-green-900/30 text-green-400 rounded text-[9px]">
                        <CheckCircle className="w-2.5 h-2.5" />
                        C
                      </span>
                    )}
                    {facility.complianceStatus === 'Non-Compliant' && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-red-900/30 text-red-400 rounded text-[9px]">
                        <XCircle className="w-2.5 h-2.5" />
                        NC
                      </span>
                    )}
                    {facility.complianceStatus === 'At Risk' && (
                      <span className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-yellow-900/30 text-yellow-400 rounded text-[9px]">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        AR
                      </span>
                    )}
                  </td>
                  <td className="px-1.5 py-1 text-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFacilityClick(facility);
                      }}
                      className="px-1.5 py-0.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[9px] font-bold"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

// ============================================================================
// FACILITY DETAIL PANEL
// ============================================================================

interface FacilityDetailPanelProps {
  facility: Facility;
  onClose: () => void;
}

const FacilityDetailPanel = memo(function FacilityDetailPanel({
  facility,
  onClose,
}: FacilityDetailPanelProps) {
  const statusColor = 
    facility.complianceStatus === 'Compliant' ? 'green' :
    facility.complianceStatus === 'Non-Compliant' ? 'red' :
    'yellow';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-2 flex items-center justify-between">
        <h3 className="text-xs font-bold text-white truncate flex-1">{facility.name}</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-700 rounded"
          title="Close details"
        >
          <X className="w-3 h-3 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-[9px] text-gray-500">Status</span>
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            statusColor === 'green' ? 'bg-green-900/30 text-green-400' :
            statusColor === 'red' ? 'bg-red-900/30 text-red-400' :
            'bg-yellow-900/30 text-yellow-400'
          }`}>
            {facility.complianceStatus}
          </span>
        </div>

        {/* Key Metrics */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Subsidy Gap</span>
            <span className="text-orange-400 font-bold">{formatCurrency(facility.subsidyGap)}</span>
          </div>
          
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Location</span>
            <span className="text-gray-300">{facility.city}, {facility.state}</span>
          </div>
          
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Operator</span>
            <span className="text-gray-300 truncate max-w-[180px]">{facility.operator}</span>
          </div>
          
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Type</span>
            <span className="text-gray-300">{facility.type}</span>
          </div>
        </div>

        {/* Last Audit */}
        <div className="pt-2 border-t border-gray-800">
          <div className="flex items-center gap-1 mb-1">
            <Clock className="w-3 h-3 text-gray-500" />
            <span className="text-[9px] font-bold text-gray-500 uppercase">Last Audit</span>
          </div>
          <div className="text-[10px] text-gray-400">
            {new Date(facility.lastAuditDate).toLocaleDateString()}
          </div>
        </div>

        {/* Issues */}
        {facility.issues.length > 0 && (
          <div className="pt-2 border-t border-gray-800">
            <div className="flex items-center gap-1 mb-1">
              <AlertTriangle className="w-3 h-3 text-red-500" />
              <span className="text-[9px] font-bold text-gray-500 uppercase">
                Issues ({facility.issues.length})
              </span>
            </div>
            <div className="space-y-1">
              {facility.issues.slice(0, 3).map((issue, idx) => (
                <div
                  key={idx}
                  className="p-1.5 bg-red-900/20 border border-red-900/50 rounded text-[10px] text-gray-300"
                >
                  {issue}
                </div>
              ))}
              {facility.issues.length > 3 && (
                <div className="text-[9px] text-gray-500">
                  +{facility.issues.length - 3} more issues
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="pt-2 border-t border-gray-800">
          <div className="text-[9px] font-bold text-gray-500 uppercase mb-1.5">Quick Actions</div>
          <div className="space-y-1">
            <button className="w-full px-2 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded text-[10px] font-bold transition-colors">
              View Full Report
            </button>
            <button className="w-full px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-[10px] font-bold transition-colors">
              Generate FOIA Request
            </button>
            <button className="w-full px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-[10px] font-bold transition-colors">
              Add to Watchlist
            </button>
            <button className="w-full px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-[10px] font-bold transition-colors flex items-center justify-center gap-1">
              <Download className="w-3 h-3" />
              Export Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default MissionControlLayout;

