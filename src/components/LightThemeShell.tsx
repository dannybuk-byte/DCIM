/**
 * Light Theme Shell - Professional, Demo-Ready UI Wrapper
 * 
 * A completely redesigned light theme for the DCIM Compliance Dashboard.
 * Clean, modern, and presentation-ready while maintaining all functionality.
 */

import React, { useState, useCallback } from 'react';
import { 
  Search, Menu, Bell, Settings, Download, ChevronDown, 
  Building2, AlertTriangle, CheckCircle, XCircle,
  TrendingUp, TrendingDown, Users, DollarSign, MapPin,
  Filter, X, Sparkles, HelpCircle, BarChart3, Globe,
  FileText, Zap, Shield, Activity
} from 'lucide-react';
import { Facility, ComplianceStats } from '../types';
import { formatCurrency } from '../utils/formatting';

interface LightThemeShellProps {
  children: React.ReactNode;
  facilities: Facility[];
  stats: ComplianceStats | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  filters: {
    state: string;
    operator: string;
    complianceStatus: string;
  };
  onFilterChange: (filters: any) => void;
  onSearch: (query: string) => void;
  onOpenSettings: () => void;
  onOpenHelp: () => void;
  onExport: () => void;
}

// Navigation items with icons
const navSections = [
  {
    title: 'Getting Started',
    items: [
      { id: 'Guides', label: 'Guides', icon: FileText },
      { id: 'Overview', label: 'Dashboard', icon: BarChart3 },
    ]
  },
  {
    title: 'Analysis',
    items: [
      { id: 'Geography', label: 'Geography', icon: Globe },
      { id: 'Problems', label: 'Problems', icon: AlertTriangle, badge: 'critical' },
      { id: 'Early Warning', label: 'Early Warning', icon: Activity },
      { id: 'Intelligence', label: 'Intelligence Hub', icon: Zap },
    ]
  },
  {
    title: 'Compliance',
    items: [
      { id: 'Subsidy Tracking', label: 'Subsidies', icon: DollarSign },
      { id: 'Worker Safety', label: 'Worker Safety', icon: Shield },
      { id: 'Compliance Flow', label: 'Compliance Flow', icon: TrendingUp },
    ]
  },
  {
    title: 'Data & Tools',
    items: [
      { id: 'Facilities', label: 'Facilities', icon: Building2 },
      { id: 'OSINT Tools', label: 'OSINT Tools', icon: Search },
      { id: 'Explorer', label: 'Explorer', icon: MapPin },
    ]
  }
];

// Stat card component
const StatCard: React.FC<{
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple';
}> = ({ label, value, change, icon, color }) => {
  const colorClasses = {
    blue: 'bg-primary-50 text-primary-600',
    green: 'bg-success-50 text-success-600',
    red: 'bg-danger-50 text-danger-600',
    amber: 'bg-warning-50 text-warning-600',
    purple: 'bg-purple-50 text-purple-600',
  };

  return (
    <div className="solid-card p-5 hover:shadow-lg transition-all duration-300 group">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-neutral-500 mb-1">{label}</p>
          <p className="text-2xl font-bold font-display text-neutral-800">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm font-medium ${change >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
              {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              <span>{Math.abs(change)}% from last month</span>
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${colorClasses[color]} transition-transform group-hover:scale-110`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Filter pill component
const FilterPill: React.FC<{
  label: string;
  value: string;
  onRemove: () => void;
}> = ({ label, value, onRemove }) => (
  <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium animate-scale-in">
    <span className="text-primary-500">{label}:</span>
    {value}
    <button 
      onClick={onRemove}
      className="hover:bg-primary-200 rounded-full p-0.5 transition-colors"
    >
      <X size={14} />
    </button>
  </span>
);

export const LightThemeShell: React.FC<LightThemeShellProps> = ({
  children,
  facilities,
  stats,
  activeTab,
  onTabChange,
  filters,
  onFilterChange,
  onSearch,
  onOpenSettings,
  onOpenHelp,
  onExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      onSearch(searchQuery.trim());
    }
  }, [searchQuery, onSearch]);

  const activeFilters = Object.entries(filters).filter(([_, value]) => value);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 via-primary-50/30 to-neutral-50">
      {/* Top Header */}
      <header className="sticky top-0 z-50 main-header">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo & Brand */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="btn-ghost p-2 lg:hidden"
              >
                <Menu size={20} />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/30">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold font-display text-neutral-800">
                    DCIM Compliance
                  </h1>
                  <p className="text-xs text-neutral-500">Big Tech Accountability</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <div className="search-input-wrapper">
                <Search className="search-icon" size={18} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search facilities, operators, or ask a question..."
                  className="input-field pl-12"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-neutral-400 bg-neutral-100 rounded border border-neutral-200">
                    ⌘K
                  </kbd>
                  <button type="submit" className="btn-ghost p-1.5 text-primary-500">
                    <Sparkles size={16} />
                  </button>
                </div>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <button className="btn-ghost p-2.5 relative">
                <Bell size={20} />
                {stats && stats.nonCompliant > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-danger-500 rounded-full animate-pulse" />
                )}
              </button>
              
              <button onClick={onExport} className="btn-secondary hidden sm:flex">
                <Download size={16} />
                <span>Export</span>
              </button>
              
              <button onClick={onOpenSettings} className="btn-ghost p-2.5">
                <Settings size={20} />
              </button>
              
              <button onClick={onOpenHelp} className="btn-primary">
                <HelpCircle size={16} />
                <span className="hidden sm:inline">Help</span>
              </button>
            </div>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="mt-4 flex items-center gap-2 flex-wrap animate-slide-down">
              <span className="text-sm text-neutral-500 font-medium">Filters:</span>
              {activeFilters.map(([key, value]) => (
                <FilterPill
                  key={key}
                  label={key}
                  value={value as string}
                  onRemove={() => onFilterChange({ ...filters, [key]: '' })}
                />
              ))}
              <button 
                onClick={() => onFilterChange({ state: '', operator: '', complianceStatus: '' })}
                className="text-sm text-neutral-500 hover:text-danger-500 font-medium transition-colors"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className={`
          fixed lg:sticky top-[72px] left-0 z-40
          h-[calc(100vh-72px)] w-72 
          bg-white/80 backdrop-blur-xl border-r border-neutral-200
          transform transition-transform duration-300 ease-out
          ${sidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0'}
          ${showMobileMenu ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
          overflow-y-auto
        `}>
          <div className="p-4 space-y-6">
            {/* Quick Stats */}
            {stats && (
              <div className={`space-y-2 ${sidebarCollapsed ? 'hidden lg:hidden' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Quick Stats
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-3 bg-success-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle size={14} className="text-success-500" />
                      <span className="text-xs text-success-600 font-medium">Compliant</span>
                    </div>
                    <p className="text-lg font-bold text-success-700">{stats.compliant.toLocaleString()}</p>
                  </div>
                  
                  <div className="p-3 bg-danger-50 rounded-xl">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle size={14} className="text-danger-500" />
                      <span className="text-xs text-danger-600 font-medium">Non-Compliant</span>
                    </div>
                    <p className="text-lg font-bold text-danger-700">{stats.nonCompliant.toLocaleString()}</p>
                  </div>
                  
                  <div className="p-3 bg-warning-50 rounded-xl col-span-2">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className="text-warning-500" />
                      <span className="text-xs text-warning-600 font-medium">Subsidy Gap</span>
                    </div>
                    <p className="text-lg font-bold text-warning-700">{formatCurrency(stats.totalSubsidyGap)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Sections */}
            {navSections.map((section) => (
              <div key={section.title}>
                <h3 className={`text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                  {section.title}
                </h3>
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          onTabChange(item.id);
                          setShowMobileMenu(false);
                        }}
                        className={`
                          w-full nav-tab justify-start
                          ${isActive ? 'active' : ''}
                          ${sidebarCollapsed ? 'lg:justify-center lg:px-3' : ''}
                        `}
                      >
                        <Icon size={18} />
                        <span className={sidebarCollapsed ? 'lg:hidden' : ''}>
                          {item.label}
                        </span>
                        {item.badge === 'critical' && stats && stats.nonCompliant > 0 && (
                          <span className={`ml-auto px-2 py-0.5 text-xs font-bold bg-danger-100 text-danger-600 rounded-full ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                            {stats.nonCompliant}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
          </div>
        </aside>

        {/* Mobile menu overlay */}
        {showMobileMenu && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setShowMobileMenu(false)}
          />
        )}

        {/* Main Content */}
        <main className={`
          flex-1 min-h-[calc(100vh-72px)]
          transition-all duration-300
          ${sidebarCollapsed ? 'lg:ml-20' : ''}
        `}>
          {/* Page Header with Stats */}
          {stats && (
            <div className="p-6 bg-white/50 border-b border-neutral-200/50">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold font-display text-neutral-800">
                    {activeTab}
                  </h2>
                  <p className="text-neutral-500 mt-1">
                    Tracking {facilities.length.toLocaleString()} facilities across {new Set(facilities.map(f => f.state)).size} states
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button className="btn-secondary">
                    <Filter size={16} />
                    <span>Filter</span>
                  </button>
                  <button className="btn-primary">
                    <BarChart3 size={16} />
                    <span>Generate Report</span>
                  </button>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Facilities"
                  value={stats.totalFacilities.toLocaleString()}
                  change={2.5}
                  icon={<Building2 size={24} />}
                  color="blue"
                />
                <StatCard
                  label="Compliant"
                  value={stats.compliant.toLocaleString()}
                  change={-1.2}
                  icon={<CheckCircle size={24} />}
                  color="green"
                />
                <StatCard
                  label="Non-Compliant"
                  value={stats.nonCompliant.toLocaleString()}
                  change={3.8}
                  icon={<XCircle size={24} />}
                  color="red"
                />
                <StatCard
                  label="Total Subsidy Gap"
                  value={formatCurrency(stats.totalSubsidyGap)}
                  change={5.2}
                  icon={<DollarSign size={24} />}
                  color="amber"
                />
              </div>
            </div>
          )}

          {/* Content Area */}
          <div className="p-6">
            <div className="solid-card p-6 min-h-[500px]">
              {children}
            </div>
          </div>

          {/* Footer */}
          <footer className="p-6 border-t border-neutral-200 bg-white/30">
            <div className="flex items-center justify-between text-sm text-neutral-500">
              <p>© 2026 DCIM Compliance Dashboard — Built for Labor Organizers</p>
              <div className="flex items-center gap-4">
                <a href="#" className="hover:text-primary-600 transition-colors">Documentation</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Support</a>
                <a href="#" className="hover:text-primary-600 transition-colors">Privacy</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default LightThemeShell;

