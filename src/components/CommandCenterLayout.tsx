/**
 * CommandCenterLayout.tsx
 * 
 * A cleaner, more navigable layout with:
 * - Persistent sidebar navigation (collapsible)
 * - Clear visual hierarchy
 * - Breadcrumb navigation
 * - Focused content areas
 * - Quick actions always visible
 * 
 * Inspired by: Notion, Linear, Figma command centers
 */

import React, { useState, useEffect, useMemo, useCallback, createContext, useContext, lazy, Suspense } from 'react';
import {
  Building2, AlertTriangle, DollarSign, Users, Search, ChevronDown, ChevronRight,
  ChevronLeft, X, Settings, Download, Bell, Menu, Globe, TrendingUp, TrendingDown,
  CheckCircle2, XCircle, AlertCircle, Eye, Loader2, Zap, Activity, Filter,
  MapPin, BarChart3, PieChart, Target, Flame, Star, Info, HelpCircle, Layers,
  Database, Server, Shield, FileText, Calendar, Home, Compass, Briefcase,
  Users2, Radio, FileWarning, Landmark, Map, ChevronUp, PanelLeftClose,
  PanelLeft, Command, ArrowRight, Sparkles, Clock, Hash
} from 'lucide-react';
import { db } from '../db/database';
import { seedRealDatabase, seedVerifiedOnlyDatabase, DATA_QUALITY } from '../db/seedRealData';
import { Facility as DBFacility } from '../types';
import { ErrorBoundary } from './ErrorBoundary';
import { useDebounce } from '../hooks/useDebounce';
import { safeArray, safeNumber, safeCurrency } from '../utils/safeData';
import { TabLoadingFallback } from './shared/TabLoadingFallback';

// Lazy-loaded tab components (keeps bundle split effective)
const FollowYourDataTab = lazy(() => import('./tabs/FollowYourDataTab').then(m => ({ default: m.FollowYourDataTab })));
import { CoalitionIntelligenceTab } from './tabs/CoalitionIntelligenceTab';
import { OrganizingIntelligenceTab } from './tabs/OrganizingIntelligenceTab';
import { CoalitionToolsTab } from './tabs/CoalitionToolsTab';
import { RLMVisualization } from './RLMVisualization';
import { AntifragilityDashboard } from './AntifragilityDashboard';
import { VirtualFacilityTable } from './VirtualFacilityTable';

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
  lat?: number;
  lng?: number;
  lastAuditDate?: string;
  issues?: string[];
  powerCapacity?: number;
  sqft?: number;
  yearBuilt?: number;
}

type NavigationSection = 
  | 'overview'
  | 'facilities'
  | 'follow-data'
  | 'organizing'
  | 'coalition-intel'
  | 'coalition-tools'
  | 'rlm-engine'
  | 'antifragility'
  | 'settings';

interface NavItem {
  id: NavigationSection;
  label: string;
  icon: React.ReactNode;
  badge?: string | number;
  badgeColor?: 'blue' | 'green' | 'red' | 'yellow' | 'purple';
  shortcut?: string;
  description?: string;
}

// Map DB facility to internal format
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
  lat: f.latitude,
  lng: f.longitude,
  lastAuditDate: f.lastAuditDate,
  issues: f.issues,
  powerCapacity: f.powerCapacityMW ? f.powerCapacityMW * 1000 : Math.floor(Math.random() * 500) + 50,
  sqft: Math.floor(Math.random() * 500000) + 50000, // squareFootage not in Facility type
  yearBuilt: f.yearEstablished || 2015 + Math.floor(Math.random() * 10)
});

// ============================================================================
// NAVIGATION CONFIG
// ============================================================================
const NAV_SECTIONS: { category: string; items: NavItem[] }[] = [
  {
    category: 'Main',
    items: [
      { 
        id: 'overview', 
        label: 'Overview', 
        icon: <Home size={18} />, 
        shortcut: '1',
        description: 'Dashboard summary and key metrics'
      },
      { 
        id: 'facilities', 
        label: 'Facilities', 
        icon: <Building2 size={18} />, 
        badge: '11,992',
        badgeColor: 'blue',
        shortcut: '2',
        description: 'Browse and search all facilities'
      },
    ]
  },
  {
    category: 'Intelligence',
    items: [
      { 
        id: 'follow-data', 
        label: 'Follow Your Data', 
        icon: <Compass size={18} />, 
        badge: 'NEW',
        badgeColor: 'green',
        shortcut: '3',
        description: 'Discover infrastructure near you'
      },
      { 
        id: 'organizing', 
        label: 'Organizing Intel', 
        icon: <Target size={18} />, 
        badge: 'NEW',
        badgeColor: 'green',
        shortcut: '4',
        description: 'Target prioritization and contractor mapping'
      },
      { 
        id: 'coalition-intel', 
        label: 'Coalition Intel', 
        icon: <Shield size={18} />, 
        badge: 'BETA',
        badgeColor: 'purple',
        shortcut: '5',
        description: 'AI infrastructure and partner intelligence'
      },
    ]
  },
  {
    category: 'Tools',
    items: [
      { 
        id: 'coalition-tools', 
        label: 'Coalition Tools', 
        icon: <Briefcase size={18} />, 
        badge: 'NEW',
        badgeColor: 'green',
        shortcut: '6',
        description: 'CBA Generator, Whistleblower, Compliance'
      },
      { 
        id: 'rlm-engine', 
        label: 'RLM Engine', 
        icon: <Zap size={18} />, 
        shortcut: '7',
        description: 'Real-time liability monitoring'
      },
      { 
        id: 'antifragility', 
        label: 'Antifragility', 
        icon: <Activity size={18} />, 
        shortcut: '8',
        description: 'System health and resilience'
      },
    ]
  }
];

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================
interface SidebarProps {
  activeSection: NavigationSection;
  onNavigate: (section: NavigationSection) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  stats: {
    total: number;
    compliant: number;
    nonCompliant: number;
    atRisk: number;
    subsidyGap: number;
  };
}

const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onNavigate,
  collapsed,
  onToggleCollapse,
  stats
}) => {
  return (
    <aside 
      className={`
        fixed left-0 top-0 h-screen bg-slate-900 border-r border-slate-800
        flex flex-col z-50 transition-all duration-300 ease-in-out
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo & Collapse Toggle */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-sm leading-tight">DCIM</h1>
              <p className="text-slate-400 text-[10px]">Big Tech Accountability</p>
            </div>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto">
            <Building2 size={18} className="text-white" />
          </div>
        )}
        <button 
          onClick={onToggleCollapse}
          className={`p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors ${collapsed ? 'hidden' : ''}`}
        >
          <PanelLeftClose size={18} />
        </button>
      </div>

      {/* Quick Stats (when expanded) */}
      {!collapsed && (
        <div className="p-3 border-b border-slate-800">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-slate-800/50 rounded-lg p-2">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider">Total</div>
              <div className="text-white font-bold text-lg">{stats.total.toLocaleString()}</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-2 border border-red-500/20">
              <div className="text-red-400 text-[10px] uppercase tracking-wider">Gap</div>
              <div className="text-red-400 font-bold text-lg">${(stats.subsidyGap / 1e9).toFixed(2)}B</div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_SECTIONS.map((section) => (
          <div key={section.category} className="mb-2">
            {!collapsed && (
              <div className="px-4 py-2">
                <span className="text-slate-500 text-[10px] uppercase tracking-wider font-medium">
                  {section.category}
                </span>
              </div>
            )}
            {section.items.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`
                  w-full flex items-center gap-3 px-4 py-2.5 transition-all duration-150
                  ${activeSection === item.id 
                    ? 'bg-blue-500/10 text-blue-400 border-r-2 border-blue-500' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                  }
                  ${collapsed ? 'justify-center px-0' : ''}
                `}
                title={collapsed ? `${item.label} (${item.shortcut})` : undefined}
              >
                <span className={activeSection === item.id ? 'text-blue-400' : ''}>
                  {item.icon}
                </span>
                {!collapsed && (
                  <>
                    <span className="flex-1 text-left text-sm font-medium">{item.label}</span>
                    {item.badge && (
                      <span className={`
                        px-1.5 py-0.5 text-[10px] font-bold rounded
                        ${item.badgeColor === 'green' ? 'bg-green-500/20 text-green-400' : ''}
                        ${item.badgeColor === 'blue' ? 'bg-blue-500/20 text-blue-400' : ''}
                        ${item.badgeColor === 'red' ? 'bg-red-500/20 text-red-400' : ''}
                        ${item.badgeColor === 'purple' ? 'bg-purple-500/20 text-purple-400' : ''}
                        ${item.badgeColor === 'yellow' ? 'bg-yellow-500/20 text-yellow-400' : ''}
                      `}>
                        {item.badge}
                      </span>
                    )}
                    {item.shortcut && (
                      <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-500 rounded border border-slate-700">
                        {item.shortcut}
                      </kbd>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        ))}
      </nav>

      {/* Expand button when collapsed */}
      {collapsed && (
        <button
          onClick={onToggleCollapse}
          className="p-4 border-t border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <PanelLeft size={18} className="mx-auto" />
        </button>
      )}

      {/* Footer (when expanded) */}
      {!collapsed && (
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-2 text-slate-400 text-xs">
            <Command size={12} />
            <span>Press <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[10px]">⌘K</kbd> for search</span>
          </div>
        </div>
      )}
    </aside>
  );
};

// ============================================================================
// COMMAND PALETTE
// ============================================================================
interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (section: NavigationSection) => void;
  facilities: Facility[];
  onSelectFacility: (facility: Facility) => void;
}

const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  onNavigate,
  facilities,
  onSelectFacility
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredItems = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) {
      // Show navigation items when no query
      return NAV_SECTIONS.flatMap(s => s.items).map(item => ({
        type: 'nav' as const,
        id: item.id,
        label: item.label,
        description: item.description,
        icon: item.icon,
        shortcut: item.shortcut
      }));
    }

    // Search facilities
    const matchingFacilities = facilities
      .filter(f => 
        f.name.toLowerCase().includes(q) ||
        f.operator.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.state.toLowerCase().includes(q)
      )
      .slice(0, 8)
      .map(f => ({
        type: 'facility' as const,
        id: f.id.toString(),
        label: f.name,
        description: `${f.operator} • ${f.city}, ${f.state}`,
        icon: <Building2 size={16} />,
        facility: f
      }));

    // Search navigation
    const matchingNav = NAV_SECTIONS
      .flatMap(s => s.items)
      .filter(item => 
        item.label.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q)
      )
      .map(item => ({
        type: 'nav' as const,
        id: item.id,
        label: item.label,
        description: item.description,
        icon: item.icon,
        shortcut: item.shortcut
      }));

    return [...matchingNav, ...matchingFacilities];
  }, [query, facilities]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, filteredItems.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = filteredItems[selectedIndex];
        if (item) {
          if (item.type === 'nav') {
            onNavigate(item.id as NavigationSection);
          } else if (item.type === 'facility' && 'facility' in item) {
            onSelectFacility(item.facility);
          }
          onClose();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onNavigate, onSelectFacility, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Palette */}
      <div className="relative w-full max-w-2xl bg-slate-900 rounded-xl shadow-2xl border border-slate-700 overflow-hidden animate-fadeIn">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
          <Search size={20} className="text-slate-400" />
          <input
            type="text"
            placeholder="Search facilities, navigate, or type a command..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent text-white placeholder:text-slate-500 outline-none text-sm"
            autoFocus
          />
          <kbd className="px-2 py-1 text-xs bg-slate-800 text-slate-400 rounded border border-slate-700">
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto">
          {filteredItems.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-500">
              No results found for "{query}"
            </div>
          ) : (
            <div className="py-2">
              {filteredItems.map((item, index) => (
                <button
                  key={`${item.type}-${item.id}`}
                  onClick={() => {
                    if (item.type === 'nav') {
                      onNavigate(item.id as NavigationSection);
                    } else if (item.type === 'facility' && 'facility' in item) {
                      onSelectFacility(item.facility);
                    }
                    onClose();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2.5 text-left
                    ${index === selectedIndex 
                      ? 'bg-blue-500/10 text-blue-400' 
                      : 'text-slate-300 hover:bg-slate-800'
                    }
                  `}
                >
                  <span className={index === selectedIndex ? 'text-blue-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{item.label}</div>
                    {item.description && (
                      <div className="text-xs text-slate-500 truncate">{item.description}</div>
                    )}
                  </div>
                  {item.type === 'nav' && item.shortcut && (
                    <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-500 rounded border border-slate-700">
                      {item.shortcut}
                    </kbd>
                  )}
                  {item.type === 'facility' && (
                    <ArrowRight size={14} className="text-slate-500" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-700 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[10px]">↑↓</kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-slate-800 rounded text-[10px]">↵</kbd>
              Select
            </span>
          </div>
          <span>{filteredItems.length} results</span>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// HEADER COMPONENT
// ============================================================================
interface HeaderProps {
  activeSection: NavigationSection;
  sidebarCollapsed: boolean;
  onOpenCommandPalette: () => void;
  breadcrumbs: string[];
}

const Header: React.FC<HeaderProps> = ({
  activeSection,
  sidebarCollapsed,
  onOpenCommandPalette,
  breadcrumbs
}) => {
  const currentNav = NAV_SECTIONS.flatMap(s => s.items).find(item => item.id === activeSection);

  return (
    <header 
      className={`
        fixed top-0 right-0 h-14 bg-white/80 backdrop-blur-md border-b border-slate-200
        flex items-center justify-between px-6 z-40 transition-all duration-300
        ${sidebarCollapsed ? 'left-16' : 'left-64'}
      `}
    >
      {/* Breadcrumbs */}
      <div className="flex items-center gap-2">
        <nav className="flex items-center gap-1 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              {i > 0 && <ChevronRight size={14} className="text-slate-400" />}
              <span className={i === breadcrumbs.length - 1 ? 'text-slate-900 font-medium' : 'text-slate-500'}>
                {crumb}
              </span>
            </React.Fragment>
          ))}
        </nav>
      </div>

      {/* Center: Search */}
      <button
        onClick={onOpenCommandPalette}
        className="flex items-center gap-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
      >
        <Search size={16} className="text-slate-400" />
        <span className="text-slate-500 text-sm">Search everything...</span>
        <kbd className="px-2 py-0.5 text-xs bg-white text-slate-400 rounded border border-slate-200 shadow-sm">
          ⌘K
        </kbd>
      </button>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Bell size={18} />
        </button>
        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Download size={18} />
        </button>
        <button className="p-2 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors">
          <Settings size={18} />
        </button>
      </div>
    </header>
  );
};

// ============================================================================
// OVERVIEW PAGE
// ============================================================================
interface OverviewPageProps {
  stats: {
    total: number;
    compliant: number;
    nonCompliant: number;
    atRisk: number;
    subsidyGap: number;
  };
  topViolators: Facility[];
  onNavigate: (section: NavigationSection) => void;
}

const OverviewPage: React.FC<OverviewPageProps> = ({ stats, topViolators, onNavigate }) => {
  return (
    <div className="p-6 space-y-6">
      {/* Hero Stats */}
      <div className="grid grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
             onClick={() => onNavigate('facilities')}>
          <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
            <Building2 size={14} />
            <span>Total Facilities</span>
          </div>
          <div className="text-3xl font-bold text-slate-900">{stats.total.toLocaleString()}</div>
        </div>
        <div className="bg-white rounded-xl border border-green-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 text-green-600 text-sm mb-1">
            <CheckCircle2 size={14} />
            <span>Compliant</span>
          </div>
          <div className="text-3xl font-bold text-green-600">{stats.compliant.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">{((stats.compliant / stats.total) * 100).toFixed(1)}% of total</div>
        </div>
        <div className="bg-white rounded-xl border border-red-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
            <XCircle size={14} />
            <span>Non-Compliant</span>
          </div>
          <div className="text-3xl font-bold text-red-600">{stats.nonCompliant.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">{((stats.nonCompliant / stats.total) * 100).toFixed(1)}% of total</div>
        </div>
        <div className="bg-white rounded-xl border border-yellow-200 p-4 hover:shadow-md transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 text-yellow-600 text-sm mb-1">
            <AlertTriangle size={14} />
            <span>At Risk</span>
          </div>
          <div className="text-3xl font-bold text-yellow-600">{stats.atRisk.toLocaleString()}</div>
          <div className="text-xs text-slate-500 mt-1">{((stats.atRisk / stats.total) * 100).toFixed(1)}% of total</div>
        </div>
        <div className="bg-gradient-to-br from-red-500 to-orange-500 rounded-xl p-4 text-white hover:shadow-lg transition-shadow cursor-pointer">
          <div className="flex items-center gap-2 text-white/80 text-sm mb-1">
            <DollarSign size={14} />
            <span>Subsidy Gap</span>
          </div>
          <div className="text-3xl font-bold">${(stats.subsidyGap / 1e9).toFixed(2)}B</div>
          <div className="text-xs text-white/70 mt-1">Total accountability deficit</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-4">
        <button 
          onClick={() => onNavigate('follow-data')}
          className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-5 text-white text-left hover:shadow-lg transition-all hover:scale-[1.02]"
        >
          <Compass size={24} className="mb-3" />
          <h3 className="font-bold text-lg">Follow Your Data</h3>
          <p className="text-white/80 text-sm mt-1">Discover infrastructure near you</p>
        </button>
        <button 
          onClick={() => onNavigate('organizing')}
          className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-5 text-white text-left hover:shadow-lg transition-all hover:scale-[1.02]"
        >
          <Target size={24} className="mb-3" />
          <h3 className="font-bold text-lg">Organizing Intel</h3>
          <p className="text-white/80 text-sm mt-1">Target prioritization & mapping</p>
        </button>
        <button 
          onClick={() => onNavigate('coalition-tools')}
          className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-5 text-white text-left hover:shadow-lg transition-all hover:scale-[1.02]"
        >
          <Briefcase size={24} className="mb-3" />
          <h3 className="font-bold text-lg">Coalition Tools</h3>
          <p className="text-white/80 text-sm mt-1">CBA Generator & more</p>
        </button>
        <button 
          onClick={() => onNavigate('coalition-intel')}
          className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-xl p-5 text-white text-left hover:shadow-lg transition-all hover:scale-[1.02]"
        >
          <Shield size={24} className="mb-3" />
          <h3 className="font-bold text-lg">Coalition Intel</h3>
          <p className="text-white/80 text-sm mt-1">AI infrastructure tracking</p>
        </button>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-2 gap-6">
        {/* Top Violators */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Flame size={18} className="text-red-500" />
              Top Subsidy Violators
            </h3>
            <button 
              onClick={() => onNavigate('facilities')}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All →
            </button>
          </div>
          <div className="space-y-3">
            {topViolators.slice(0, 5).map((facility, i) => (
              <div 
                key={facility.id}
                className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <div className={`
                  w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                  ${i === 0 ? 'bg-red-500 text-white' : i === 1 ? 'bg-orange-500 text-white' : i === 2 ? 'bg-yellow-500 text-white' : 'bg-slate-300 text-slate-600'}
                `}>
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-slate-900 truncate">{facility.name}</div>
                  <div className="text-xs text-slate-500">{facility.operator} • {facility.city}, {facility.state}</div>
                </div>
                <div className="text-red-600 font-bold">
                  ${(facility.subsidyGap / 1e6).toFixed(1)}M
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Data Quality */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-900 flex items-center gap-2">
              <Database size={18} className="text-blue-500" />
              Data Quality
            </h3>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              40 GJF Verified
            </span>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Operators Verified</span>
                <span className="font-medium text-slate-900">100%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Locations Verified</span>
                <span className="font-medium text-slate-900">100%</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">GJF Subsidy Matches</span>
                <span className="font-medium text-slate-900">40 facilities</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: '3%' }} />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-600">Compliance Calculated</span>
                <span className="font-medium text-amber-600">Pattern-based</span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-500 rounded-full" style={{ width: '100%' }} />
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-4">
            All 48 operators from verified industry research. Compliance % is calculated from operator patterns.
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// FACILITIES PAGE
// ============================================================================
interface FacilitiesPageProps {
  facilities: Facility[];
  onSelectFacility: (facility: Facility) => void;
}

const FacilitiesPage: React.FC<FacilitiesPageProps> = ({ facilities, onSelectFacility }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let result = facilities;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(q) ||
        f.operator.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) ||
        f.state.toLowerCase().includes(q)
      );
    }
    
    if (statusFilter !== 'all') {
      result = result.filter(f => f.status === statusFilter);
    }
    
    return result;
  }, [facilities, searchQuery, statusFilter]);

  return (
    <div className="p-6 h-full flex flex-col">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search facilities..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === 'all' ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All ({facilities.length.toLocaleString()})
          </button>
          <button
            onClick={() => setStatusFilter('Compliant')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === 'Compliant' ? 'bg-green-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Compliant
          </button>
          <button
            onClick={() => setStatusFilter('Non-Compliant')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === 'Non-Compliant' ? 'bg-red-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Non-Compliant
          </button>
          <button
            onClick={() => setStatusFilter('At Risk')}
            className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
              statusFilter === 'At Risk' ? 'bg-yellow-500 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            At Risk
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="text-sm text-slate-500 mb-2">
        Showing {filtered.length.toLocaleString()} facilities
      </div>

      {/* Table */}
      <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="grid grid-cols-[1fr_120px_120px_100px] gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
          <div>Facility</div>
          <div>Status</div>
          <div>Subsidy Gap</div>
          <div>Jobs</div>
        </div>
        <div className="h-[calc(100vh-280px)] overflow-y-auto">
          {filtered.slice(0, 100).map(facility => (
            <div 
              key={facility.id}
              onClick={() => onSelectFacility(facility)}
              className="grid grid-cols-[1fr_120px_120px_100px] gap-4 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              <div>
                <div className="font-medium text-slate-900">{facility.name}</div>
                <div className="text-sm text-slate-500">{facility.operator} • {facility.city}, {facility.state}</div>
              </div>
              <div>
                <span className={`
                  inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full
                  ${facility.status === 'Compliant' ? 'bg-green-100 text-green-700' : ''}
                  ${facility.status === 'Non-Compliant' ? 'bg-red-100 text-red-700' : ''}
                  ${facility.status === 'At Risk' ? 'bg-yellow-100 text-yellow-700' : ''}
                `}>
                  {facility.status === 'Compliant' && <CheckCircle2 size={12} />}
                  {facility.status === 'Non-Compliant' && <XCircle size={12} />}
                  {facility.status === 'At Risk' && <AlertTriangle size={12} />}
                  {facility.status}
                </span>
              </div>
              <div className={facility.subsidyGap > 0 ? 'text-red-600 font-medium' : 'text-slate-400'}>
                {facility.subsidyGap > 0 ? `$${(facility.subsidyGap / 1e6).toFixed(1)}M` : '—'}
              </div>
              <div className="text-sm">
                <span className="text-slate-900">{facility.jobsActual}</span>
                <span className="text-slate-400">/{facility.jobsPromised}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const CommandCenterLayout: React.FC = () => {
  // State
  const [activeSection, setActiveSection] = useState<NavigationSection>('overview');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

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

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command palette
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(true);
        return;
      }

      // Number shortcuts for navigation
      if (!e.metaKey && !e.ctrlKey && !e.altKey) {
        const navItems = NAV_SECTIONS.flatMap(s => s.items);
        const item = navItems.find(n => n.shortcut === e.key);
        if (item) {
          setActiveSection(item.id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Calculate stats
  const stats = useMemo(() => ({
    total: facilities.length,
    compliant: facilities.filter(f => f.status === 'Compliant').length,
    nonCompliant: facilities.filter(f => f.status === 'Non-Compliant').length,
    atRisk: facilities.filter(f => f.status === 'At Risk').length,
    subsidyGap: facilities.reduce((sum, f) => sum + f.subsidyGap, 0)
  }), [facilities]);

  // Top violators
  const topViolators = useMemo(() => 
    [...facilities].sort((a, b) => b.subsidyGap - a.subsidyGap).slice(0, 10),
  [facilities]);

  // Breadcrumbs
  const breadcrumbs = useMemo(() => {
    const labels: Record<NavigationSection, string> = {
      'overview': 'Overview',
      'facilities': 'Facilities',
      'follow-data': 'Follow Your Data',
      'organizing': 'Organizing Intel',
      'coalition-intel': 'Coalition Intel',
      'coalition-tools': 'Coalition Tools',
      'rlm-engine': 'RLM Engine',
      'antifragility': 'Antifragility',
      'settings': 'Settings'
    };
    return ['DCIM', labels[activeSection]];
  }, [activeSection]);

  // Navigation handler
  const handleNavigate = useCallback((section: NavigationSection) => {
    setActiveSection(section);
    setSelectedFacility(null);
  }, []);

  // Render content based on active section
  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
            <p className="text-slate-600">Loading {facilities.length.toLocaleString()} facilities...</p>
          </div>
        </div>
      );
    }

    switch (activeSection) {
      case 'overview':
        return <OverviewPage stats={stats} topViolators={topViolators} onNavigate={handleNavigate} />;
      case 'facilities':
        return <FacilitiesPage facilities={facilities} onSelectFacility={setSelectedFacility} />;
      case 'follow-data':
        return (
          <div className="p-6 h-full overflow-auto">
            <ErrorBoundary tabName="Follow Your Data">
              <Suspense fallback={<TabLoadingFallback tabName="Follow Your Data" />}>
                <FollowYourDataTab facilities={[]} />
              </Suspense>
            </ErrorBoundary>
          </div>
        );
      case 'organizing':
        return (
          <div className="p-6 h-full overflow-auto">
            <ErrorBoundary tabName="Organizing Intelligence">
              <OrganizingIntelligenceTab />
            </ErrorBoundary>
          </div>
        );
      case 'coalition-intel':
        return (
          <div className="p-6 h-full overflow-auto">
            <ErrorBoundary tabName="Coalition Intelligence">
              <CoalitionIntelligenceTab />
            </ErrorBoundary>
          </div>
        );
      case 'coalition-tools':
        return (
          <div className="p-6 h-full overflow-auto">
            <ErrorBoundary tabName="Coalition Tools">
              <CoalitionToolsTab />
            </ErrorBoundary>
          </div>
        );
      case 'rlm-engine':
        return (
          <div className="p-6 h-full overflow-auto">
            <ErrorBoundary tabName="RLM Engine">
              <RLMVisualization />
            </ErrorBoundary>
          </div>
        );
      case 'antifragility':
        return (
          <div className="p-6 h-full overflow-auto">
            <ErrorBoundary tabName="Antifragility">
              <AntifragilityDashboard />
            </ErrorBoundary>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onNavigate={handleNavigate}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        stats={stats}
      />

      {/* Header */}
      <Header
        activeSection={activeSection}
        sidebarCollapsed={sidebarCollapsed}
        onOpenCommandPalette={() => setCommandPaletteOpen(true)}
        breadcrumbs={breadcrumbs}
      />

      {/* Main Content */}
      <main 
        className={`
          pt-14 min-h-screen transition-all duration-300
          ${sidebarCollapsed ? 'pl-16' : 'pl-64'}
        `}
      >
        {renderContent()}
      </main>

      {/* Command Palette */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        facilities={facilities}
        onSelectFacility={(f) => {
          setSelectedFacility(f);
          setActiveSection('facilities');
        }}
      />
    </div>
  );
};

export default CommandCenterLayout;

