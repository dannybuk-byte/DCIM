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
  LayoutGrid, List, Grid3X3, Maximize2, Minimize2
} from 'lucide-react';
import { db } from '../db/database';
import { seedRealDatabase } from '../db/seedRealData';
import { Facility as DBFacility } from '../types';
import { ErrorBoundary } from './ErrorBoundary';
import { OrganizingIntelligenceTab } from './tabs/OrganizingIntelligenceTab';
import { CoalitionToolsTab } from './tabs/CoalitionToolsTab';
import { MissionHeader, SubsidyGapHero, ComplianceBadge } from './shared/HumanizedStats';

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
}

const SpaceFillingOverviewGrid: React.FC<OverviewGridProps> = ({ 
  stats, 
  topViolators, 
  operatorCounts,
  viewportHeight 
}) => {
  const { config } = useDensity();
  
  // Calculate available height for content (subtract stat bar + padding)
  const headerHeight = config.rowHeight + 16;
  const availableHeight = viewportHeight - headerHeight - 8;
  
  // Top row height (stats + gap + quick actions)
  const topRowHeight = config.mode === 'compact' ? 90 : 110;
  const bottomRowHeight = availableHeight - topRowHeight - 12;
  
  // Calculate how many items we can fit based on actual available space
  // Each item is approximately 38px (two lines of text + padding)
  const itemHeight = 38;
  const cardHeaderHeight = 26;
  const itemsPerColumn = Math.max(8, Math.floor((bottomRowHeight - cardHeaderHeight) / itemHeight));
  
  // For violators, we show items in 2 columns, so we need itemsPerColumn per column
  const violatorsPerColumn = itemsPerColumn;
  const totalViolators = Math.min(topViolators.length, violatorsPerColumn * 2);

  // Generate fake trend data
  const trendData = Array.from({ length: 12 }, () => Math.random() * 100);

  return (
    <div 
      className="grid gap-2 p-2"
      style={{ 
        height: availableHeight,
        gridTemplateColumns: '1fr 1.4fr 1fr',
        gridTemplateRows: `${topRowHeight}px 1fr`,
      }}
    >
      {/* Row 1: Stats + Gap Highlight + Quick Actions */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col">
        <div 
          className="bg-slate-50 border-b border-slate-200 font-medium text-slate-700 flex items-center gap-1"
          style={{ padding: `3px 6px`, fontSize: 10 }}
        >
          <BarChart3 size={10} className="text-blue-500" />
          Stats
        </div>
        <div className="grid grid-cols-2 gap-0.5 p-0.5 flex-1">
          {[
            { label: 'Total', value: stats.total.toLocaleString(), color: '#3b82f6' },
            { label: 'Compliant', value: stats.compliant.toLocaleString(), color: '#22c55e', pct: (stats.compliant / stats.total * 100) },
            { label: 'Non-Compliant', value: stats.nonCompliant.toLocaleString(), color: '#ef4444', pct: (stats.nonCompliant / stats.total * 100) },
            { label: 'At Risk', value: stats.atRisk.toLocaleString(), color: '#f59e0b', pct: (stats.atRisk / stats.total * 100) },
          ].map((s, i) => (
            <div 
              key={i}
              className="rounded px-1.5 py-0.5 flex flex-col justify-center"
              style={{ backgroundColor: `${s.color}10` }}
            >
              <div className="text-slate-500 text-[8px] leading-none">{s.label}</div>
              <div className="font-bold text-[13px] leading-tight" style={{ color: s.color }}>{s.value}</div>
              {s.pct !== undefined && (
                <div className="text-[8px] text-slate-400 leading-none">{s.pct.toFixed(1)}%</div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Subsidy Gap Hero - Humanized */}
      <div className="rounded overflow-hidden">
        <SubsidyGapHero 
          amount={stats.subsidyGap}
          violatorCount={stats.nonCompliant}
          avgSalary={50000}
        />
      </div>
      {/* LEGACY: Subsidy Gap + Trend - Hidden */}
      <div className="hidden bg-gradient-to-r from-red-500 to-orange-500 rounded overflow-hidden flex items-center justify-between px-3">
        <div className="text-white">
          <div className="text-white/70 text-[9px] leading-none">Total Subsidy Gap</div>
          <div className="font-bold text-xl leading-tight">${(stats.subsidyGap / 1e9).toFixed(2)}B</div>
          <div className="text-white/60 text-[9px] leading-none">{topViolators.length} violators tracked</div>
        </div>
        <div className="w-28">
          <Sparkline data={trendData} color="rgba(255,255,255,0.7)" height={28} />
        </div>
      </div>

      {/* Quick Actions - Horizontal */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden flex items-center p-1">
        <div className="grid grid-cols-2 gap-0.5 flex-1 h-full">
          {[
            { icon: <Compass size={11} />, label: 'Follow Data', bg: 'bg-teal-50 hover:bg-teal-100', text: 'text-teal-700' },
            { icon: <Target size={11} />, label: 'Organize', bg: 'bg-purple-50 hover:bg-purple-100', text: 'text-purple-700' },
            { icon: <Briefcase size={11} />, label: 'CBA Tool', bg: 'bg-blue-50 hover:bg-blue-100', text: 'text-blue-700' },
            { icon: <Shield size={11} />, label: 'Coalition', bg: 'bg-slate-100 hover:bg-slate-200', text: 'text-slate-700' },
          ].map((action, i) => (
            <button
              key={i}
              className={`flex items-center justify-center gap-1 rounded transition-colors ${action.bg} ${action.text}`}
              style={{ fontSize: 10 }}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Row 2: Top Violators (spans 2 columns) + Top Operators */}
      <div 
        className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col col-span-2"
      >
        <div 
          className="bg-slate-50 border-b border-slate-200 font-medium text-slate-700 flex items-center gap-1 flex-shrink-0"
          style={{ 
            padding: `4px 8px`,
            fontSize: 11
          }}
        >
          <Flame size={12} className="text-red-500" />
          Top Subsidy Violators
          <span className="text-slate-400 text-[10px] ml-auto">Showing {totalViolators} of {topViolators.length}</span>
        </div>
        <div className="flex-1 overflow-hidden grid grid-cols-2">
          {/* Left column - first half of violators */}
          <div className="border-r border-slate-100 overflow-auto">
            {topViolators.slice(0, violatorsPerColumn).map((f, i) => (
              <div 
                key={f.id}
                className="flex items-center gap-1.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer px-2 py-1"
              >
                <span 
                  className={`
                    w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0
                    ${i === 0 ? 'bg-red-500 text-white' : 
                      i === 1 ? 'bg-orange-500 text-white' : 
                      i === 2 ? 'bg-yellow-500 text-white' : 
                      'bg-slate-200 text-slate-600'}
                  `}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-slate-900 text-[11px] leading-tight" title={f.name}>
                    {f.name}
                  </div>
                  <div className="text-[9px] text-slate-400 truncate leading-tight">{f.operator} • {f.city}, {f.state}</div>
                </div>
                <span className="text-red-600 font-semibold text-[11px] whitespace-nowrap">
                  ${(f.subsidyGap / 1e6).toFixed(1)}M
                </span>
              </div>
            ))}
          </div>
          {/* Right column - second half of violators */}
          <div className="overflow-auto">
            {topViolators.slice(violatorsPerColumn, totalViolators).map((f, i) => {
              const rank = violatorsPerColumn + i + 1;
              return (
                <div 
                  key={f.id}
                  className="flex items-center gap-1.5 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer px-2 py-1"
                >
                  <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 bg-slate-200 text-slate-600">
                    {rank}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate text-slate-900 text-[11px] leading-tight" title={f.name}>
                      {f.name}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate leading-tight">{f.operator} • {f.city}, {f.state}</div>
                  </div>
                  <span className="text-red-600 font-semibold text-[11px] whitespace-nowrap">
                    ${(f.subsidyGap / 1e6).toFixed(1)}M
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top Operators */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden flex flex-col">
        <div 
          className="bg-slate-50 border-b border-slate-200 font-medium text-slate-700 flex items-center gap-1 flex-shrink-0"
          style={{ 
            padding: `4px 8px`,
            fontSize: 11
          }}
        >
          <Building2 size={12} className="text-purple-500" />
          Operators
          <span className="text-slate-400 text-[10px] ml-auto">{operatorCounts.length} tracked</span>
        </div>
        <div className="flex-1 overflow-auto">
          {operatorCounts.slice(0, itemsPerColumn).map((op, i) => (
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
  );
};

// ============================================================================
// MAIN LAYOUT COMPONENT
// ============================================================================
export const DensityOptimizedLayout: React.FC = () => {
  const [densityMode, setDensityMode] = useState<DensityMode>('comfortable');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeView, setActiveView] = useState<ActiveView>('overview');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewportHeight, setViewportHeight] = useState(window.innerHeight);

  const config = DENSITY_CONFIGS[densityMode];

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
          className="transition-all duration-200"
          style={{ 
            paddingLeft: sidebarCollapsed ? 48 : config.sidebarWidth,
            paddingTop: config.rowHeight + 16
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
            />
          ) : activeView === 'facilities' ? (
            <div style={{ padding: config.padding * 2 }}>
              <CompactFacilityTable facilities={facilities} />
            </div>
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

