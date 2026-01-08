/**
 * DensityOptimizedLayout.tsx
 * 
 * Maximizes viewability without scrolling while maintaining legibility.
 * 
 * Key strategies:
 * 1. Three density modes: Compact (max data), Comfortable (balanced), Spacious (accessibility)
 * 2. Collapsible sidebar (icon-only mode)
 * 3. Horizontal stat bars instead of cards
 * 4. Data tables with adjustable row height
 * 5. Sparklines instead of full charts
 * 6. Truncation with tooltips
 * 7. Progressive disclosure (expand on hover/click)
 */

import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import {
  Building2, AlertTriangle, DollarSign, Users, Search, ChevronDown, ChevronRight,
  ChevronLeft, X, Settings, Download, Bell, Menu, Globe, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, AlertCircle, Eye, Loader2, Zap, Activity, Filter,
  MapPin, BarChart3, PieChart, Target, Flame, Star, Info, HelpCircle, Layers,
  Database, Server, Shield, FileText, Calendar, Home, Compass, Briefcase,
  Users2, Radio, FileWarning, Landmark, Map, ChevronUp, PanelLeftClose,
  PanelLeft, Command, ArrowRight, Sparkles, Clock, Hash, Minus, Plus,
  LayoutGrid, List, Grid3X3, Maximize2, Minimize2, Share2, Upload
} from 'lucide-react';
import { db } from '../db/database';
import { seedRealDatabase } from '../db/seedRealData';
import { Facility as DBFacility } from '../types';
import { ErrorBoundary } from './ErrorBoundary';
import { OrganizingIntelligenceTab } from './tabs/OrganizingIntelligenceTab';
import { CoalitionToolsTab } from './tabs/CoalitionToolsTab';
import { MissionHeader, SubsidyGapHero, ComplianceBadge } from './shared/HumanizedStats';
import { DataExportButton } from './shared/DataExportButton';
import { DataImportButton } from './shared/DataImportButton';
import { SystemHealthDashboard } from './shared/SystemHealthDashboard';
import { saveActiveTab, getLastActiveTab, savePreferences, getSavedPreferences, recordVisit } from '../utils/sessionPersistence';
import { startAutoBackup, stopAutoBackup, checkForRecovery, clearBackup, AutoBackupState } from '../utils/autoBackup';
import { RecoveryBanner } from './shared/RecoveryBanner';

// ============================================================================
// DENSITY CONTEXT
// ============================================================================
type DensityMode = 'compact' | 'comfortable' | 'spacious';

interface DensityConfig {
  mode: DensityMode;
  rowHeight: number;        // px
  fontSize: number;         // px
  padding: number;          // px
  gap: number;              // px
  iconSize: number;         // px
  borderRadius: number;     // px
  sidebarWidth: number;     // px (when expanded)
  showLabels: boolean;
  truncateAt: number;       // characters
}

const DENSITY_CONFIGS: Record<DensityMode, DensityConfig> = {
  compact: {
    mode: 'compact',
    rowHeight: 28,
    fontSize: 11,
    padding: 4,
    gap: 2,
    iconSize: 14,
    borderRadius: 4,
    sidebarWidth: 180,
    showLabels: false,
    truncateAt: 20
  },
  comfortable: {
    mode: 'comfortable',
    rowHeight: 36,
    fontSize: 13,
    padding: 8,
    gap: 4,
    iconSize: 16,
    borderRadius: 6,
    sidebarWidth: 220,
    showLabels: true,
    truncateAt: 30
  },
  spacious: {
    mode: 'spacious',
    rowHeight: 48,
    fontSize: 14,
    padding: 12,
    gap: 8,
    iconSize: 18,
    borderRadius: 8,
    sidebarWidth: 260,
    showLabels: true,
    truncateAt: 50
  }
};

const DensityContext = createContext<{
  config: DensityConfig;
  setMode: (mode: DensityMode) => void;
}>({
  config: DENSITY_CONFIGS.comfortable,
  setMode: () => {}
});

const useDensity = () => useContext(DensityContext);

// ============================================================================
// TYPES
// ============================================================================
interface Facility {
  id: number;
  name: string;
  operator: string;
  state: string;
  city: string;
  country: string;
  type: string;
  status: 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown';
  subsidyGap: number;
  jobsPromised: number;
  jobsActual: number;
}

type ActiveView = 'overview' | 'facilities' | 'intelligence' | 'tools';

const mapFacility = (f: DBFacility): Facility => ({
  id: f.id,
  name: f.name,
  operator: f.operator,
  state: f.state,
  city: f.city,
  country: f.country || 'US',
  type: f.type || f.facilityType || 'Data Center',
  status: f.complianceStatus === 'Unknown' ? 'At Risk' : f.complianceStatus,
  subsidyGap: f.subsidyGap || 0,
  jobsPromised: f.jobsPromised || 0,
  jobsActual: f.jobsCreated || 0,
});

// ============================================================================
// MINI SPARKLINE COMPONENT
// ============================================================================
const Sparkline: React.FC<{ data: number[]; color: string; height?: number }> = ({ 
  data, 
  color, 
  height = 16 
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((v - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// ============================================================================
// COMPACT STAT BAR
// ============================================================================
interface StatBarProps {
  stats: {
    label: string;
    value: number | string;
    color: string;
    icon: React.ReactNode;
    percentage?: number;
  }[];
}

const StatBar: React.FC<StatBarProps> = ({ stats }) => {
  const { config } = useDensity();
  
  return (
    <div 
      className="flex items-center bg-slate-900 border-b border-slate-800"
      style={{ 
        height: config.rowHeight + 8,
        padding: `0 ${config.padding}px`,
        gap: config.gap * 2
      }}
    >
      {stats.map((stat, i) => (
        <div 
          key={i}
          className="flex items-center gap-1.5 px-2 py-1 rounded"
          style={{ 
            backgroundColor: `${stat.color}15`,
            fontSize: config.fontSize,
          }}
        >
          <span style={{ color: stat.color }}>{stat.icon}</span>
          {config.showLabels && (
            <span className="text-slate-400 hidden sm:inline">{stat.label}:</span>
          )}
          <span className="font-semibold" style={{ color: stat.color }}>
            {stat.value}
          </span>
          {stat.percentage !== undefined && (
            <span className="text-slate-500 text-[10px]">
              ({stat.percentage.toFixed(1)}%)
            </span>
          )}
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// DENSITY TOGGLE
// ============================================================================
const DensityToggle: React.FC = () => {
  const { config, setMode } = useDensity();
  
  return (
    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
      <button
        onClick={() => setMode('compact')}
        className={`p-1.5 rounded transition-colors ${
          config.mode === 'compact' 
            ? 'bg-blue-500 text-white' 
            : 'text-slate-400 hover:text-white'
        }`}
        title="Compact - Maximum data density"
      >
        <Grid3X3 size={14} />
      </button>
      <button
        onClick={() => setMode('comfortable')}
        className={`p-1.5 rounded transition-colors ${
          config.mode === 'comfortable' 
            ? 'bg-blue-500 text-white' 
            : 'text-slate-400 hover:text-white'
        }`}
        title="Comfortable - Balanced view"
      >
        <LayoutGrid size={14} />
      </button>
      <button
        onClick={() => setMode('spacious')}
        className={`p-1.5 rounded transition-colors ${
          config.mode === 'spacious' 
            ? 'bg-blue-500 text-white' 
            : 'text-slate-400 hover:text-white'
        }`}
        title="Spacious - Accessibility mode"
      >
        <Maximize2 size={14} />
      </button>
    </div>
  );
};

// ============================================================================
// COMPACT SIDEBAR
// ============================================================================
interface SidebarProps {
  activeView: ActiveView;
  onNavigate: (view: ActiveView) => void;
  collapsed: boolean;
  onToggle: () => void;
}

const CompactSidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigate,
  collapsed,
  onToggle
}) => {
  const { config } = useDensity();
  
  const navItems: { id: ActiveView; icon: React.ReactNode; label: string; badge?: string }[] = [
    { id: 'overview', icon: <Home size={config.iconSize} />, label: 'Overview' },
    { id: 'facilities', icon: <Building2 size={config.iconSize} />, label: 'Facilities', badge: '11,992' },
    { id: 'intelligence', icon: <Target size={config.iconSize} />, label: 'Intelligence' },
    { id: 'tools', icon: <Briefcase size={config.iconSize} />, label: 'Tools' },
  ];

  return (
    <aside 
      className="fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800 flex flex-col z-50 transition-all duration-200"
      style={{ width: collapsed ? 48 : config.sidebarWidth }}
    >
      {/* Logo */}
      <div 
        className="flex items-center justify-center border-b border-slate-800"
        style={{ height: config.rowHeight + 16, padding: config.padding }}
      >
        {collapsed ? (
          <Building2 size={20} className="text-blue-400" />
        ) : (
          <div className="flex items-center gap-2">
            <Building2 size={18} className="text-blue-400" />
            <span className="font-bold text-white text-sm">DCIM</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 py-1">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`
              w-full flex items-center transition-colors
              ${activeView === item.id 
                ? 'bg-blue-500/10 text-blue-400 border-r-2 border-blue-500' 
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }
            `}
            style={{
              height: config.rowHeight,
              padding: `0 ${config.padding}px`,
              gap: config.gap * 2,
              fontSize: config.fontSize
            }}
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && (
              <>
                <span className="flex-1 text-left truncate">{item.label}</span>
                {item.badge && (
                  <span className="text-[10px] bg-slate-700 text-slate-300 px-1.5 rounded">
                    {item.badge}
                  </span>
                )}
              </>
            )}
          </button>
        ))}
      </nav>

      {/* Toggle */}
      <button
        onClick={onToggle}
        className="flex items-center justify-center border-t border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        style={{ height: config.rowHeight }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>
    </aside>
  );
};

// ============================================================================
// COMPACT FACILITY TABLE
// ============================================================================
interface FacilityTableProps {
  facilities: Facility[];
  maxRows?: number;
}

const CompactFacilityTable: React.FC<FacilityTableProps> = ({ facilities, maxRows }) => {
  const { config } = useDensity();
  const [sortBy, setSortBy] = useState<'name' | 'gap' | 'status'>('gap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const sorted = useMemo(() => {
    const result = [...facilities];
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'gap') cmp = a.subsidyGap - b.subsidyGap;
      else cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return maxRows ? result.slice(0, maxRows) : result;
  }, [facilities, sortBy, sortDir, maxRows]);

  const toggleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const statusColors: Record<string, string> = {
    'Compliant': '#22c55e',
    'Non-Compliant': '#ef4444',
    'At Risk': '#f59e0b',
    'Unknown': '#6b7280'
  };

  const truncate = (str: string, len: number) => 
    str.length > len ? str.slice(0, len) + '…' : str;

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Header */}
      <div 
        className="grid grid-cols-[1fr_80px_90px] bg-slate-50 border-b border-slate-200"
        style={{ fontSize: config.fontSize - 1 }}
      >
        <button 
          onClick={() => toggleSort('name')}
          className="text-left px-2 py-1.5 text-slate-500 hover:text-slate-700 flex items-center gap-1"
        >
          Facility {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
        <button 
          onClick={() => toggleSort('status')}
          className="text-left px-2 py-1.5 text-slate-500 hover:text-slate-700"
        >
          Status {sortBy === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
        <button 
          onClick={() => toggleSort('gap')}
          className="text-right px-2 py-1.5 text-slate-500 hover:text-slate-700"
        >
          Gap {sortBy === 'gap' && (sortDir === 'asc' ? '↑' : '↓')}
        </button>
      </div>

      {/* Rows */}
      <div style={{ maxHeight: `calc(100vh - 200px)`, overflowY: 'auto' }}>
        {sorted.map(f => (
          <div 
            key={f.id}
            className="grid grid-cols-[1fr_80px_90px] border-b border-slate-100 hover:bg-slate-50 cursor-pointer"
            style={{ height: config.rowHeight, fontSize: config.fontSize }}
          >
            <div className="flex items-center px-2 min-w-0">
              <div className="truncate">
                <span className="font-medium text-slate-900" title={f.name}>
                  {truncate(f.name, config.truncateAt)}
                </span>
                {config.mode !== 'compact' && (
                  <span className="text-slate-400 ml-1">
                    {f.operator}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center px-2">
              <span 
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                style={{ 
                  backgroundColor: `${statusColors[f.status]}20`,
                  color: statusColors[f.status]
                }}
              >
                {config.mode === 'compact' 
                  ? f.status.charAt(0) 
                  : f.status.replace('-', '')}
              </span>
            </div>
            <div className="flex items-center justify-end px-2">
              {f.subsidyGap > 0 ? (
                <span className="text-red-600 font-medium">
                  ${(f.subsidyGap / 1e6).toFixed(1)}M
                </span>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {maxRows && facilities.length > maxRows && (
        <div 
          className="text-center border-t border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer"
          style={{ 
            height: config.rowHeight,
            fontSize: config.fontSize - 1,
            lineHeight: `${config.rowHeight}px`
          }}
        >
          View all {facilities.length.toLocaleString()} facilities →
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MISSION-FOCUSED FACILITIES VIEW
// ============================================================================
interface MissionFacilitiesViewProps {
  facilities: Facility[];
  stats: {
    total: number;
    compliant: number;
    nonCompliant: number;
    atRisk: number;
    subsidyGap: number;
  };
}

const MissionFacilitiesView: React.FC<MissionFacilitiesViewProps> = ({ facilities, stats }) => {
  const { config } = useDensity();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'gap' | 'name' | 'status'>('gap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const filtered = useMemo(() => {
    let result = [...facilities];
    
    // Filter by search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(term) ||
        f.operator.toLowerCase().includes(term) ||
        f.city.toLowerCase().includes(term) ||
        f.state.toLowerCase().includes(term)
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      result = result.filter(f => f.status === statusFilter);
    }
    
    // Sort
    result.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortBy === 'gap') cmp = a.subsidyGap - b.subsidyGap;
      else cmp = a.status.localeCompare(b.status);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    
    return result;
  }, [facilities, searchTerm, statusFilter, sortBy, sortDir]);

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    'Compliant': { bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200' },
    'Non-Compliant': { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
    'At Risk': { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200' },
    'Unknown': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200' }
  };

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* Mission Header */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-xl p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/30 flex items-center justify-center">
              <Database size={24} className="text-blue-300" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Facility Database</h2>
              <p className="text-blue-300 text-sm">Track and investigate Big Tech's data centers</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">{stats.total.toLocaleString()}</div>
              <div className="text-blue-300 text-xs">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-400">{stats.nonCompliant.toLocaleString()}</div>
              <div className="text-blue-300 text-xs">Non-Compliant</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-400">${(stats.subsidyGap / 1e9).toFixed(2)}B</div>
              <div className="text-blue-300 text-xs">Subsidy Gap</div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search facilities, operators, locations..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter('Non-Compliant')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'Non-Compliant' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600 hover:bg-red-100'
            }`}
          >
            ⚠️ Non-Compliant
          </button>
          <button
            onClick={() => setStatusFilter('At Risk')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'At Risk' ? 'bg-yellow-500 text-white' : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
            }`}
          >
            ⚡ At Risk
          </button>
          <button
            onClick={() => setStatusFilter('Compliant')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === 'Compliant' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600 hover:bg-green-100'
            }`}
          >
            ✓ Compliant
          </button>
        </div>
        <div className="border-l border-slate-200 pl-3">
          <span className="text-slate-500 text-sm">{filtered.length.toLocaleString()} results</span>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden flex-1">
        {/* Table Header */}
        <div className="grid grid-cols-[2fr_1fr_100px_120px_100px] bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-600">
          <button 
            onClick={() => { setSortBy('name'); setSortDir(d => sortBy === 'name' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }}
            className="text-left px-4 py-3 hover:bg-slate-100 flex items-center gap-1"
          >
            Facility / Operator {sortBy === 'name' && (sortDir === 'asc' ? '↑' : '↓')}
          </button>
          <div className="px-4 py-3">Location</div>
          <button 
            onClick={() => { setSortBy('status'); setSortDir(d => sortBy === 'status' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }}
            className="text-left px-4 py-3 hover:bg-slate-100 flex items-center gap-1"
          >
            Status {sortBy === 'status' && (sortDir === 'asc' ? '↑' : '↓')}
          </button>
          <button 
            onClick={() => { setSortBy('gap'); setSortDir(d => sortBy === 'gap' ? (d === 'asc' ? 'desc' : 'asc') : 'desc'); }}
            className="text-right px-4 py-3 hover:bg-slate-100 flex items-center gap-1 justify-end"
          >
            Subsidy Gap {sortBy === 'gap' && (sortDir === 'asc' ? '↑' : '↓')}
          </button>
          <div className="px-4 py-3 text-center">Actions</div>
        </div>

        {/* Table Body */}
        <div className="overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
          {filtered.slice(0, 200).map((f, i) => {
            const colors = statusColors[f.status] || statusColors['Unknown'];
            return (
              <div 
                key={f.id}
                className={`grid grid-cols-[2fr_1fr_100px_120px_100px] border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                  f.status === 'Non-Compliant' ? 'bg-red-50/30' : ''
                }`}
              >
                <div className="px-4 py-3">
                  <div className="font-medium text-slate-900 text-sm truncate">{f.name}</div>
                  <div className="text-xs text-slate-500">{f.operator}</div>
                </div>
                <div className="px-4 py-3 text-sm text-slate-600">
                  <div className="truncate">{f.city}, {f.state}</div>
                </div>
                <div className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${colors.bg} ${colors.text}`}>
                    {f.status}
                  </span>
                </div>
                <div className="px-4 py-3 text-right">
                  {f.subsidyGap > 0 ? (
                    <span className="font-bold text-red-600">${(f.subsidyGap / 1e6).toFixed(1)}M</span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
                </div>
                <div className="px-4 py-3 flex items-center justify-center gap-1">
                  <button className="p-1.5 rounded hover:bg-blue-100 text-blue-600" title="View details">
                    <Eye size={14} />
                  </button>
                  <button className="p-1.5 rounded hover:bg-purple-100 text-purple-600" title="Generate FOIA">
                    <FileText size={14} />
                  </button>
                  <button className="p-1.5 rounded hover:bg-orange-100 text-orange-600" title="Report issue">
                    <AlertTriangle size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        {filtered.length > 200 && (
          <div className="text-center py-3 border-t border-slate-200 text-slate-500 text-sm bg-slate-50">
            Showing 200 of {filtered.length.toLocaleString()} facilities • Use filters to narrow results
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// SPACE-FILLING OVERVIEW GRID
// ============================================================================
interface OverviewGridProps {
  stats: {
    total: number;
    compliant: number;
    nonCompliant: number;
    atRisk: number;
    subsidyGap: number;
  };
  topViolators: Facility[];
  operatorCounts: { operator: string; count: number; gap: number }[];
  viewportHeight: number;
  facilities: Facility[];
}

const SpaceFillingOverviewGrid: React.FC<OverviewGridProps> = ({ 
  stats, 
  topViolators, 
  operatorCounts,
  viewportHeight,
  facilities 
}) => {
  const { config } = useDensity();
  
  // Calculate available height for content (subtract stat bar + padding)
  const headerHeight = config.rowHeight + 16;
  const availableHeight = viewportHeight - headerHeight - 8;
  
  // Safe stats with fallbacks
  const safeStats = {
    total: stats?.total || 0,
    compliant: stats?.compliant || 0,
    nonCompliant: stats?.nonCompliant || 0,
    atRisk: stats?.atRisk || 0,
    unknown: stats?.unknown || 0,
    subsidyGap: stats?.subsidyGap || 0,
  };
  
  // Calculate job equivalent for subsidy gap
  const avgSalary = 50000;
  const jobsEquivalent = Math.round(safeStats.subsidyGap / avgSalary);
  
  // Show all violators split between two columns
  const halfViolators = Math.ceil(topViolators.length / 2);
  const totalViolators = topViolators.length;

  // State breakdown for geographic section - COMPREHENSIVE: ALL states
  const stateBreakdown = useMemo(() => {
    const byState: Record<string, { count: number; gap: number; nonCompliant: number; atRisk: number; compliant: number }> = {};
    facilities.forEach(f => {
      if (!byState[f.state]) byState[f.state] = { count: 0, gap: 0, nonCompliant: 0, atRisk: 0, compliant: 0 };
      byState[f.state].count++;
      byState[f.state].gap += f.subsidyGap;
      if (f.status === 'Non-Compliant') byState[f.state].nonCompliant++;
      else if (f.status === 'At Risk') byState[f.state].atRisk++;
      else byState[f.state].compliant++;
    });
    return Object.entries(byState)
      .map(([state, data]) => ({ state, ...data }))
      .sort((a, b) => b.gap - a.gap); // No slice - show ALL states
  }, [facilities]);

  // State for expanded state view
  const [showAllStates, setShowAllStates] = useState(false);
  const [stateFilter, setStateFilter] = useState<'all' | 'top' | 'violations'>('all');
  
  // Filtered states based on current filter
  const filteredStates = useMemo(() => {
    let states = [...stateBreakdown];
    if (stateFilter === 'violations') {
      states = states.filter(s => s.nonCompliant > 0).sort((a, b) => b.nonCompliant - a.nonCompliant);
    }
    return showAllStates ? states : states.slice(0, 12);
  }, [stateBreakdown, showAllStates, stateFilter]);

  // State totals
  const stateTotals = useMemo(() => ({
    totalStates: stateBreakdown.length,
    totalFacilities: stateBreakdown.reduce((sum, s) => sum + s.count, 0),
    totalGap: stateBreakdown.reduce((sum, s) => sum + s.gap, 0),
    totalViolations: stateBreakdown.reduce((sum, s) => sum + s.nonCompliant, 0),
    statesWithViolations: stateBreakdown.filter(s => s.nonCompliant > 0).length,
  }), [stateBreakdown]);

  // Recent high-risk alerts (simulated based on subsidy gap and status)
  const recentAlerts = useMemo(() => {
    return facilities
      .filter(f => f.status === 'Non-Compliant' && f.subsidyGap > 5000000)
      .slice(0, 8)
      .map(f => ({
        id: f.id,
        type: f.subsidyGap > 50000000 ? 'critical' : f.subsidyGap > 20000000 ? 'warning' : 'info',
        message: `${f.name} - $${(f.subsidyGap / 1e6).toFixed(1)}M subsidy gap`,
        location: `${f.city}, ${f.state}`,
        operator: f.operator
      }));
  }, [facilities]);

  // Organizing opportunities (facilities with high gaps but no union presence)
  const organizingOpportunities = useMemo(() => {
    return facilities
      .filter(f => f.subsidyGap > 10000000)
      .sort((a, b) => b.subsidyGap - a.subsidyGap)
      .slice(0, 6)
      .map(f => ({
        id: f.id,
        name: f.name,
        operator: f.operator,
        location: `${f.city}, ${f.state}`,
        gap: f.subsidyGap,
        priority: f.subsidyGap > 50000000 ? 'high' : f.subsidyGap > 20000000 ? 'medium' : 'low'
      }));
  }, [facilities]);

  return (
    <div className="flex flex-col gap-3 p-3">
      {/* ========== MISSION HEADER - FULL WIDTH ========== */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-indigo-900 rounded-xl p-4 shadow-xl border border-blue-500/30">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                <Target size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white tracking-tight">
                  Data Center Accountability Dashboard
                </h1>
                <p className="text-blue-300 text-sm">
                  Exposing Big Tech's broken job creation promises
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-xs text-blue-200/80">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                Live Monitoring
              </span>
              <span>•</span>
              <span>{safeStats.total.toLocaleString()} Facilities Tracked</span>
              <span>•</span>
              <span>{safeStats.nonCompliant.toLocaleString()} Non-Compliant</span>
            </div>
          </div>
          {/* Partner Logos */}
          <div className="flex items-center gap-4 px-4 border-l border-blue-500/30">
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">TWC</div>
              <div className="text-[9px] text-blue-300/70 mt-0.5">Tech Workers</div>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white font-bold text-xs">CWA</div>
              <div className="text-[9px] text-blue-300/70 mt-0.5">CODE-CWA</div>
            </div>
            <div className="text-center">
              <div className="w-10 h-10 rounded-full bg-yellow-500/80 flex items-center justify-center text-white font-bold text-xs">IBEW</div>
              <div className="text-[9px] text-blue-300/70 mt-0.5">Electricians</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== SUBSIDY GAP HERO - PROMINENT ========== */}
      <div className="bg-gradient-to-r from-red-600 via-red-500 to-orange-500 rounded-xl p-5 shadow-xl relative overflow-hidden">
        {/* Decorative background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white rounded-full translate-y-1/2 -translate-x-1/2" />
        </div>
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <DollarSign size={20} className="text-white/80" />
              <span className="text-white/80 font-medium text-sm uppercase tracking-wider">Total Subsidy Gap</span>
            </div>
            <div className="text-5xl font-black text-white drop-shadow-lg">
              ${(safeStats.subsidyGap / 1e9).toFixed(2)}B
            </div>
            <div className="text-white/90 font-semibold text-lg mt-2 flex items-center gap-2">
              <Users size={18} />
              = {jobsEquivalent.toLocaleString()} jobs at ${avgSalary.toLocaleString()}/year
            </div>
            <div className="text-white/70 text-sm mt-1">
              Money that should have created local jobs — but didn't
            </div>
          </div>
          
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Compliant', value: safeStats.compliant.toLocaleString(), icon: CheckCircle2, color: 'bg-green-500/20 border-green-400/50' },
              { label: 'Non-Compliant', value: safeStats.nonCompliant.toLocaleString(), icon: XCircle, color: 'bg-red-900/30 border-red-300/50' },
              { label: 'At Risk', value: safeStats.atRisk.toLocaleString(), icon: AlertTriangle, color: 'bg-yellow-500/20 border-yellow-400/50' },
              { label: 'Unknown', value: safeStats.unknown.toLocaleString(), icon: HelpCircle, color: 'bg-white/10 border-white/20' },
            ].map((s, i) => (
              <div 
                key={i}
                className={`rounded-lg px-4 py-2 border ${s.color} backdrop-blur-sm`}
              >
                <div className="flex items-center gap-1.5">
                  <s.icon size={14} className="text-white/80" />
                  <span className="text-white/70 text-xs">{s.label}</span>
                </div>
                <div className="text-white font-bold text-xl">{s.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ========== DATA GRID - TOP VIOLATORS + OPERATORS ========== */}
      <div className="flex-1 grid grid-cols-3 gap-3 min-h-0">
        {/* Top Violators - 2 columns */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
            <Flame size={16} className="text-red-500" />
            <span className="font-semibold text-slate-700">Top Subsidy Violators</span>
            <span className="ml-auto text-slate-400 text-sm">{topViolators.length} facilities tracked</span>
          </div>
          <div className="flex-1 overflow-auto grid grid-cols-2 divide-x divide-slate-100">
            {/* Left column */}
            <div className="overflow-y-auto max-h-[300px]">
              {topViolators.slice(0, halfViolators).map((f, i) => (
                <div 
                  key={f.id}
                  className="flex items-center gap-2 border-b border-slate-100 last:border-0 hover:bg-blue-50/50 cursor-pointer px-3 py-2 transition-colors"
                >
                  <span 
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                      ${i === 0 ? 'bg-red-500 text-white shadow-lg shadow-red-500/40' : 
                        i === 1 ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/40' : 
                        i === 2 ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/40' : 
                        'bg-slate-200 text-slate-600'}
                    `}
                  >
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-slate-900 font-medium text-sm" title={f.name}>
                      {f.name}
                    </div>
                    <div className="text-xs text-slate-500 truncate">{f.operator} • {f.city}, {f.state}</div>
                  </div>
                  <span className="text-red-600 font-bold text-sm whitespace-nowrap bg-red-50 px-2 py-0.5 rounded">
                    ${(f.subsidyGap / 1e6).toFixed(1)}M
                  </span>
                </div>
              ))}
            </div>
            {/* Right column */}
            <div className="overflow-y-auto max-h-[300px]">
              {topViolators.slice(halfViolators).map((f, i) => {
                const rank = halfViolators + i + 1;
                return (
                  <div 
                    key={f.id}
                    className="flex items-center gap-2 border-b border-slate-100 last:border-0 hover:bg-blue-50/50 cursor-pointer px-3 py-2 transition-colors"
                  >
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-slate-200 text-slate-600">
                      {rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-slate-900 font-medium text-sm" title={f.name}>
                        {f.name}
                      </div>
                      <div className="text-xs text-slate-500 truncate">{f.operator} • {f.city}, {f.state}</div>
                    </div>
                    <span className="text-red-600 font-bold text-sm whitespace-nowrap bg-red-50 px-2 py-0.5 rounded">
                      ${(f.subsidyGap / 1e6).toFixed(1)}M
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top Operators */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
            <Building2 size={16} className="text-purple-500" />
            <span className="font-semibold text-slate-700">Top Operators</span>
            <span className="ml-auto text-slate-400 text-sm">{operatorCounts.length}</span>
          </div>
        <div className="flex-1 overflow-y-auto max-h-[300px]">
          {operatorCounts.map((op, i) => (
            <div 
              key={op.operator}
              className="flex items-center gap-1.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer px-2 py-1"
            >
              <div className="w-4 h-4 rounded bg-purple-100 text-purple-600 flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-slate-900 text-[11px]">{op.operator}</div>
              </div>
              <span className="text-slate-500 text-[10px] font-medium">{op.count}</span>
              {op.gap > 0 && (
                <span className="text-red-500 text-[10px] font-medium">${(op.gap / 1e6).toFixed(0)}M</span>
              )}
            </div>
          ))}
          </div>
        </div>
      </div>

      {/* ========== ROW 3: GEOGRAPHIC BREAKDOWN + ALERTS ========== */}
      <div className="grid grid-cols-3 gap-3">
        {/* State-by-State Breakdown - COMPREHENSIVE */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-emerald-600" />
              <span className="font-semibold text-slate-700">State-by-State Accountability</span>
              <span className="ml-auto text-slate-500 text-xs">
                {stateTotals.totalStates} states • {stateTotals.totalFacilities.toLocaleString()} facilities • ${(stateTotals.totalGap / 1e9).toFixed(2)}B total gap
              </span>
            </div>
            {/* Filter tabs and expand toggle */}
            <div className="flex items-center gap-2 mt-2">
              <div className="flex gap-1">
                {[
                  { key: 'all', label: 'All States' },
                  { key: 'violations', label: `With Violations (${stateTotals.statesWithViolations})` },
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setStateFilter(tab.key as typeof stateFilter)}
                    className={`px-2 py-1 text-xs rounded transition-colors ${
                      stateFilter === tab.key 
                        ? 'bg-emerald-600 text-white' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setShowAllStates(!showAllStates)}
                className="ml-auto px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded text-slate-600 transition-colors flex items-center gap-1"
              >
                {showAllStates ? (
                  <>
                    <ChevronUp size={12} />
                    Show Top 12
                  </>
                ) : (
                  <>
                    <ChevronDown size={12} />
                    Show All {stateTotals.totalStates}
                  </>
                )}
              </button>
            </div>
          </div>
          
          {/* Summary stats bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 grid grid-cols-4 gap-2 text-center">
            <div>
              <div className="text-lg font-bold text-slate-800">{stateTotals.totalStates}</div>
              <div className="text-[10px] text-slate-500 uppercase">States/Regions</div>
            </div>
            <div>
              <div className="text-lg font-bold text-red-600">{stateTotals.totalViolations.toLocaleString()}</div>
              <div className="text-[10px] text-slate-500 uppercase">Total Violations</div>
            </div>
            <div>
              <div className="text-lg font-bold text-orange-600">${(stateTotals.totalGap / 1e9).toFixed(2)}B</div>
              <div className="text-[10px] text-slate-500 uppercase">Total Gap</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-600">{stateTotals.statesWithViolations}</div>
              <div className="text-[10px] text-slate-500 uppercase">States w/ Issues</div>
            </div>
          </div>

          <div className={`p-3 overflow-y-auto ${showAllStates ? 'max-h-[400px]' : 'max-h-[250px]'}`}>
            <div className="grid grid-cols-3 gap-2">
              {filteredStates.map((state, i) => (
                <div 
                  key={state.state}
                  className={`rounded-lg p-2 transition-colors cursor-pointer border ${
                    state.nonCompliant > 100 ? 'bg-red-50 border-red-200 hover:bg-red-100' :
                    state.nonCompliant > 50 ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' :
                    state.nonCompliant > 20 ? 'bg-yellow-50 border-yellow-200 hover:bg-yellow-100' :
                    state.nonCompliant > 0 ? 'bg-slate-50 border-slate-200 hover:bg-slate-100' :
                    'bg-green-50 border-green-200 hover:bg-green-100'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-slate-400 font-mono w-4">{i + 1}</span>
                      <span className="font-bold text-slate-800 text-sm">{state.state}</span>
                    </div>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                      state.nonCompliant > 100 ? 'bg-red-500 text-white' :
                      state.nonCompliant > 50 ? 'bg-red-100 text-red-700' :
                      state.nonCompliant > 20 ? 'bg-yellow-100 text-yellow-700' :
                      state.nonCompliant > 0 ? 'bg-slate-200 text-slate-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {state.nonCompliant} violations
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{state.count} facilities</span>
                    <span className="text-slate-400">
                      {state.compliant} ✓ · {state.atRisk} ⚠
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-red-600 mt-1">${(state.gap / 1e6).toFixed(1)}M gap</div>
                  {/* Progress bar showing violation rate */}
                  <div className="mt-1 h-1 bg-slate-200 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        state.nonCompliant / state.count > 0.5 ? 'bg-red-500' :
                        state.nonCompliant / state.count > 0.25 ? 'bg-orange-500' :
                        state.nonCompliant / state.count > 0.1 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(100, (state.nonCompliant / state.count) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
            {!showAllStates && stateBreakdown.length > 12 && (
              <button
                onClick={() => setShowAllStates(true)}
                className="w-full mt-3 py-2 text-sm text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors flex items-center justify-center gap-1"
              >
                <ChevronDown size={14} />
                Show {stateBreakdown.length - 12} more states
              </button>
            )}
          </div>
        </div>

        {/* Real-Time Alerts */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
            <Bell size={16} className="text-red-500" />
            <span className="font-semibold text-slate-700">Recent Alerts</span>
            <span className="ml-auto">
              <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse inline-block" />
            </span>
          </div>
          <div className="overflow-y-auto max-h-[250px]">
            {recentAlerts.map((alert, i) => (
              <div 
                key={alert.id}
                className={`px-3 py-2 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer ${
                  alert.type === 'critical' ? 'border-l-4 border-l-red-500' :
                  alert.type === 'warning' ? 'border-l-4 border-l-yellow-500' :
                  'border-l-4 border-l-blue-500'
                }`}
              >
                <div className="text-xs font-medium text-slate-800 truncate">{alert.message}</div>
                <div className="text-[10px] text-slate-500">{alert.operator} • {alert.location}</div>
              </div>
            ))}
            {recentAlerts.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-sm">No critical alerts</div>
            )}
          </div>
        </div>
      </div>

      {/* ========== ROW 4: ORGANIZING OPPORTUNITIES + ACTION ITEMS ========== */}
      <div className="grid grid-cols-2 gap-3">
        {/* Organizing Opportunities */}
        <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-xl shadow-xl overflow-hidden border border-indigo-500/30">
          <div className="px-4 py-3 border-b border-indigo-500/30 flex items-center gap-2">
            <Users size={18} className="text-indigo-300" />
            <span className="font-semibold text-white">🎯 Organizing Opportunities</span>
            <span className="ml-auto text-indigo-300 text-xs">{organizingOpportunities.length} high-priority</span>
          </div>
          <div className="p-3 overflow-y-auto max-h-[200px]">
            {organizingOpportunities.map((opp, i) => (
              <div 
                key={opp.id}
                className="bg-indigo-800/50 rounded-lg p-2 mb-2 last:mb-0 hover:bg-indigo-700/50 cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="text-white font-medium text-sm truncate">{opp.name}</div>
                    <div className="text-indigo-300 text-xs">{opp.operator}</div>
                    <div className="text-indigo-400 text-xs">{opp.location}</div>
                  </div>
                  <div className="text-right">
                    <div className={`text-xs px-2 py-0.5 rounded-full ${
                      opp.priority === 'high' ? 'bg-red-500 text-white' :
                      opp.priority === 'medium' ? 'bg-yellow-500 text-black' :
                      'bg-green-500 text-white'
                    }`}>
                      {opp.priority}
                    </div>
                    <div className="text-white font-bold text-sm mt-1">${(opp.gap / 1e6).toFixed(1)}M</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions / Campaign Tools */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-b border-slate-200 px-4 py-2.5 flex items-center gap-2">
            <Zap size={16} className="text-blue-600" />
            <span className="font-semibold text-slate-700">Quick Actions</span>
          </div>
          <div className="p-3 grid grid-cols-2 gap-2">
            <button className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors text-left">
              <FileText size={18} className="text-blue-600" />
              <div>
                <div className="text-sm font-medium text-slate-800">Generate FOIA</div>
                <div className="text-xs text-slate-500">Request subsidy records</div>
              </div>
            </button>
            {/* 🛡️ ANTIFRAGILE: Data Export & Import */}
            <DataExportButton facilities={facilities} />
            <div className="flex items-center gap-2 p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors">
              <Upload size={18} className="text-indigo-600" />
              <div className="flex-1">
                <DataImportButton 
                  onImportComplete={() => window.location.reload()} 
                  className="!bg-transparent !p-0 !text-slate-800 text-sm font-medium"
                />
                <div className="text-xs text-slate-500">Restore from backup</div>
              </div>
            </div>
            <button className="flex items-center gap-2 p-3 rounded-lg bg-purple-50 hover:bg-purple-100 transition-colors text-left">
              <Share2 size={18} className="text-purple-600" />
              <div>
                <div className="text-sm font-medium text-slate-800">Share Intel</div>
                <div className="text-xs text-slate-500">Coalition partners</div>
              </div>
            </button>
            <button className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 hover:bg-orange-100 transition-colors text-left">
              <AlertTriangle size={18} className="text-orange-600" />
              <div>
                <div className="text-sm font-medium text-slate-800">Report Issue</div>
                <div className="text-xs text-slate-500">Worker safety/labor</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* ========== ROW 5: SYSTEM HEALTH (Antifragile) ========== */}
      <SystemHealthDashboard variant="compact" className="mb-3" />

      {/* ========== ROW 6: MISSION FOOTER ========== */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 text-center">
        <p className="text-slate-400 text-sm">
          <span className="text-cyan-400 font-semibold">Built for workers</span> • 
          Tracking <span className="text-white font-bold">{safeStats.total.toLocaleString()}</span> facilities • 
          <span className="text-red-400 font-bold">${(safeStats.subsidyGap / 1e9).toFixed(2)}B</span> in broken promises • 
          <span className="text-yellow-400">Every feature serves the mission</span>
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN LAYOUT COMPONENT
// ============================================================================
export const DensityOptimizedLayout: React.FC = () => {
  // 🛡️ ANTIFRAGILE: Restore preferences from session
  const [densityMode, setDensityMode] = useState<DensityMode>(() => {
    const prefs = getSavedPreferences();
    return (prefs?.densityMode as DensityMode) || 'comfortable';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const prefs = getSavedPreferences();
    return prefs?.sidebarCollapsed ?? false;
  });
  const [activeView, setActiveView] = useState<ActiveView>(() => {
    const { tab } = getLastActiveTab();
    return (tab as ActiveView) || 'overview';
  });
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  const config = DENSITY_CONFIGS[densityMode];

  // 🛡️ ANTIFRAGILE: Record visit for returning user detection
  useEffect(() => {
    recordVisit();
  }, []);

  // 🛡️ ANTIFRAGILE: Persist activeView changes
  useEffect(() => {
    saveActiveTab(activeView);
  }, [activeView]);

  // 🛡️ ANTIFRAGILE: Persist preferences changes
  useEffect(() => {
    savePreferences({ densityMode, sidebarCollapsed });
  }, [densityMode, sidebarCollapsed]);

  // 🛡️ ANTIFRAGILE: Auto-backup service for crash recovery
  useEffect(() => {
    startAutoBackup(() => ({
      state: {
        activeTab: activeView,
        filters: {},
        searchQuery: '',
      },
      metadata: {
        facilityCount: facilities.length,
        lastAction: 'auto-backup',
      },
    }));

    return () => {
      stopAutoBackup();
    };
  }, [activeView, facilities.length]);

  // 🛡️ ANTIFRAGILE: Handle recovery from crash
  const handleRecovery = useCallback((recoveredState: AutoBackupState['state']) => {
    if (recoveredState.activeTab) {
      setActiveView(recoveredState.activeTab as ActiveView);
    }
    console.log('[Recovery] State restored:', recoveredState);
  }, []);

  // Track viewport size
  useEffect(() => {
    const handleResize = () => setViewportHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        await seedRealDatabase();
        const data = await db.facilities.toArray();
        setFacilities(data.map(mapFacility));
      } catch (error) {
        console.error('Failed to load facilities:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Stats
  const stats = useMemo(() => ({
    total: facilities.length,
    compliant: facilities.filter(f => f.status === 'Compliant').length,
    nonCompliant: facilities.filter(f => f.status === 'Non-Compliant').length,
    atRisk: facilities.filter(f => f.status === 'At Risk').length,
    subsidyGap: facilities.reduce((sum, f) => sum + f.subsidyGap, 0)
  }), [facilities]);

  const topViolators = useMemo(() => 
    [...facilities].sort((a, b) => b.subsidyGap - a.subsidyGap).slice(0, 30),
  [facilities]);

  const operatorCounts = useMemo(() => {
    const counts: Record<string, { count: number; gap: number }> = {};
    facilities.forEach(f => {
      if (!counts[f.operator]) counts[f.operator] = { count: 0, gap: 0 };
      counts[f.operator].count++;
      counts[f.operator].gap += f.subsidyGap;
    });
    return Object.entries(counts)
      .map(([operator, { count, gap }]) => ({ operator, count, gap }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  }, [facilities]);

  // Keyboard shortcuts for density
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key === '1') setDensityMode('compact');
      if (e.altKey && e.key === '2') setDensityMode('comfortable');
      if (e.altKey && e.key === '3') setDensityMode('spacious');
      if (e.key === '[') setSidebarCollapsed(true);
      if (e.key === ']') setSidebarCollapsed(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <DensityContext.Provider value={{ config, setMode: setDensityMode }}>
      <div className="min-h-screen bg-slate-100">
        {/* 🛡️ ANTIFRAGILE: Recovery banner for crash recovery */}
        <RecoveryBanner 
          onRecover={handleRecovery} 
          onDismiss={() => clearBackup()}
        />
        
        {/* Sidebar */}
        <CompactSidebar
          activeView={activeView}
          onNavigate={setActiveView}
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Top Stat Bar */}
        <div 
          className="fixed top-0 right-0 z-40 transition-all duration-200"
          style={{ left: sidebarCollapsed ? 48 : config.sidebarWidth }}
        >
          <StatBar stats={[
            { 
              label: 'Total', 
              value: stats.total.toLocaleString(), 
              color: '#3b82f6',
              icon: <Building2 size={config.iconSize - 2} />
            },
            { 
              label: 'Compliant', 
              value: stats.compliant.toLocaleString(), 
              color: '#22c55e',
              icon: <CheckCircle2 size={config.iconSize - 2} />,
              percentage: stats.total ? (stats.compliant / stats.total) * 100 : 0
            },
            { 
              label: 'Non-Compliant', 
              value: stats.nonCompliant.toLocaleString(), 
              color: '#ef4444',
              icon: <XCircle size={config.iconSize - 2} />,
              percentage: stats.total ? (stats.nonCompliant / stats.total) * 100 : 0
            },
            { 
              label: 'At Risk', 
              value: stats.atRisk.toLocaleString(), 
              color: '#f59e0b',
              icon: <AlertTriangle size={config.iconSize - 2} />,
              percentage: stats.total ? (stats.atRisk / stats.total) * 100 : 0
            },
            { 
              label: 'Gap', 
              value: `$${(stats.subsidyGap / 1e9).toFixed(2)}B`, 
              color: '#ef4444',
              icon: <DollarSign size={config.iconSize - 2} />
            },
          ]} />
          
          {/* Density Toggle */}
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            <DensityToggle />
          </div>
        </div>

        {/* Main Content */}
        <main 
          className="transition-all duration-200 min-h-screen pb-8"
          style={{ 
            paddingLeft: sidebarCollapsed ? 48 : config.sidebarWidth,
            paddingTop: config.rowHeight + 16,
          }}
        >
          {loading ? (
            <div className="flex items-center justify-center h-[50vh]">
              <Loader2 className="animate-spin text-blue-500" size={32} />
            </div>
          ) : activeView === 'overview' ? (
            <SpaceFillingOverviewGrid 
              stats={stats}
              topViolators={topViolators}
              operatorCounts={operatorCounts}
              viewportHeight={viewportHeight}
              facilities={facilities}
            />
          ) : activeView === 'facilities' ? (
            <MissionFacilitiesView facilities={facilities} stats={stats} />
          ) : activeView === 'intelligence' ? (
            <div className="h-full overflow-auto">
              <ErrorBoundary tabName="Organizing Intelligence">
                <OrganizingIntelligenceTab />
              </ErrorBoundary>
            </div>
          ) : activeView === 'tools' ? (
            <div className="h-full overflow-auto">
              <ErrorBoundary tabName="Coalition Tools">
                <CoalitionToolsTab />
              </ErrorBoundary>
            </div>
          ) : (
            <div 
              className="flex items-center justify-center text-slate-500"
              style={{ height: `calc(100vh - ${config.rowHeight + 16}px)` }}
            >
              Select a view from the sidebar
            </div>
          )}
        </main>

        {/* Keyboard Hints */}
        <div 
          className="fixed bottom-2 right-2 flex items-center gap-2 text-[10px] text-slate-500"
        >
          <span>Density:</span>
          <kbd className="px-1 bg-slate-200 rounded">Alt+1</kbd>
          <kbd className="px-1 bg-slate-200 rounded">Alt+2</kbd>
          <kbd className="px-1 bg-slate-200 rounded">Alt+3</kbd>
          <span className="mx-2">|</span>
          <span>Sidebar:</span>
          <kbd className="px-1 bg-slate-200 rounded">[</kbd>
          <kbd className="px-1 bg-slate-200 rounded">]</kbd>
        </div>
      </div>
    </DensityContext.Provider>
  );
};

export default DensityOptimizedLayout;

