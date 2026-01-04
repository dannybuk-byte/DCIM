/**
 * Light Dashboard - Professional, Demo-Ready UI
 * 
 * A beautifully designed light theme dashboard for presentations and demos.
 * Clean, modern, and professional while maintaining full functionality.
 */

import React, { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
import { 
  Search, Menu, Bell, Settings, Download, ChevronDown, ChevronRight,
  Building2, AlertTriangle, CheckCircle, XCircle, HelpCircle,
  TrendingUp, TrendingDown, DollarSign, MapPin, Users,
  Filter, X, Sparkles, BarChart3, Globe, FileText, Zap, 
  Shield, Activity, Eye, ExternalLink, RefreshCw, Clock,
  ArrowRight, Star, Target, Layers, Database, Network
} from 'lucide-react';
import { db } from '../db/database';
import { seedDatabase } from '../db/seedData';
import { Facility, ComplianceStats } from '../types';
import { calculateStats } from '../utils/stats';
import { safeDbOperation } from '../utils/dbOperations';
import { formatCurrency } from '../utils/formatting';
import { ErrorBoundary } from './ErrorBoundary';

// Navigation sections
const navSections = [
  {
    title: 'Getting Started',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3, description: 'Overview & key metrics' },
      { id: 'facilities', label: 'Facilities', icon: Building2, description: 'Browse all data centers' },
    ]
  },
  {
    title: 'Analysis & Intelligence',
    items: [
      { id: 'geography', label: 'Geographic View', icon: Globe, description: 'Map visualization' },
      { id: 'problems', label: 'Problems', icon: AlertTriangle, badge: 'hot', description: 'Non-compliant facilities' },
      { id: 'intelligence', label: 'Intelligence Hub', icon: Zap, description: 'AI-powered insights' },
    ]
  },
  {
    title: 'Compliance Tracking',
    items: [
      { id: 'subsidies', label: 'Subsidies', icon: DollarSign, description: 'Track tax breaks' },
      { id: 'workers', label: 'Worker Safety', icon: Shield, description: 'Labor conditions' },
      { id: 'timeline', label: 'Timeline', icon: Clock, description: 'Compliance history' },
    ]
  },
  {
    title: 'Reports & Tools',
    items: [
      { id: 'reports', label: 'Reports', icon: FileText, description: 'Generate exports' },
      { id: 'osint', label: 'OSINT Tools', icon: Search, description: 'Open source intel' },
      { id: 'network', label: 'Network Map', icon: Network, description: 'Infrastructure view' },
    ]
  }
];

// Stat Card Component
const StatCard: React.FC<{
  label: string;
  value: string | number;
  subtext?: string;
  change?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan';
  onClick?: () => void;
}> = ({ label, value, subtext, change, icon, color, onClick }) => {
  const colorMap = {
    blue: { bg: 'bg-blue-50', icon: 'bg-blue-100 text-blue-600', border: 'border-blue-100 hover:border-blue-200' },
    green: { bg: 'bg-emerald-50', icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100 hover:border-emerald-200' },
    red: { bg: 'bg-rose-50', icon: 'bg-rose-100 text-rose-600', border: 'border-rose-100 hover:border-rose-200' },
    amber: { bg: 'bg-amber-50', icon: 'bg-amber-100 text-amber-600', border: 'border-amber-100 hover:border-amber-200' },
    purple: { bg: 'bg-purple-50', icon: 'bg-purple-100 text-purple-600', border: 'border-purple-100 hover:border-purple-200' },
    cyan: { bg: 'bg-cyan-50', icon: 'bg-cyan-100 text-cyan-600', border: 'border-cyan-100 hover:border-cyan-200' },
  };
  
  const colors = colorMap[color];

  return (
    <div 
      onClick={onClick}
      className={`
        p-6 bg-white rounded-2xl border-2 ${colors.border}
        transition-all duration-300 ease-out
        hover:shadow-xl hover:-translate-y-1
        ${onClick ? 'cursor-pointer' : ''}
        group
      `}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500 mb-2">{label}</p>
          <p className="text-3xl font-bold font-display text-slate-800 tracking-tight">{value}</p>
          {subtext && (
            <p className="text-sm text-slate-500 mt-1">{subtext}</p>
          )}
          {change !== undefined && (
            <div className={`flex items-center gap-1.5 mt-3 text-sm font-semibold ${
              change >= 0 ? 'text-emerald-600' : 'text-rose-600'
            }`}>
              {change >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
              <span>{Math.abs(change)}% from last month</span>
            </div>
          )}
        </div>
        <div className={`
          w-14 h-14 rounded-2xl flex items-center justify-center 
          ${colors.icon} 
          transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3
        `}>
          {icon}
        </div>
      </div>
    </div>
  );
};

// Facility Row Component
const FacilityRow: React.FC<{
  facility: Facility;
  onClick: () => void;
}> = ({ facility, onClick }) => {
  const statusColors = {
    'Compliant': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Non-Compliant': 'bg-rose-100 text-rose-700 border-rose-200',
    'At Risk': 'bg-amber-100 text-amber-700 border-amber-200',
    'Unknown': 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <tr 
      onClick={onClick}
      className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
    >
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow-md shadow-blue-500/20">
            {facility.name.charAt(0)}
          </div>
          <div>
            <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">
              {facility.name}
            </p>
            <p className="text-sm text-slate-500">{facility.operator}</p>
          </div>
        </div>
      </td>
      <td className="px-6 py-4">
        <div className="flex items-center gap-2 text-slate-600">
          <MapPin size={14} className="text-slate-400" />
          {facility.city}, {facility.state}
        </div>
      </td>
      <td className="px-6 py-4">
        <span className={`
          inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold border
          ${statusColors[facility.complianceStatus] || statusColors['Unknown']}
        `}>
          {facility.complianceStatus === 'Compliant' && <CheckCircle size={12} className="mr-1.5" />}
          {facility.complianceStatus === 'Non-Compliant' && <XCircle size={12} className="mr-1.5" />}
          {facility.complianceStatus === 'At Risk' && <AlertTriangle size={12} className="mr-1.5" />}
          {facility.complianceStatus}
        </span>
      </td>
      <td className="px-6 py-4">
        <span className={`font-semibold ${facility.subsidyGap > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
          {formatCurrency(facility.subsidyGap)}
        </span>
      </td>
      <td className="px-6 py-4">
        <button className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-blue-100 rounded-lg">
          <ArrowRight size={16} className="text-blue-600" />
        </button>
      </td>
    </tr>
  );
};

// Quick Action Button
const QuickAction: React.FC<{
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  onClick: () => void;
}> = ({ icon, label, description, color, onClick }) => (
  <button 
    onClick={onClick}
    className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 text-left group w-full"
  >
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color} transition-transform group-hover:scale-110`}>
      {icon}
    </div>
    <div className="flex-1">
      <p className="font-semibold text-slate-800 group-hover:text-blue-600 transition-colors">{label}</p>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
    <ChevronRight size={20} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
  </button>
);

// Main Component
export const LightDashboard: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);

  // Load data
  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        await seedDatabase();
        const data = await safeDbOperation(
          () => db.facilities.toArray(),
          () => []
        );
        
        if (mounted) {
          setFacilities(data);
          setStats(calculateStats(data));
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        if (mounted) setLoading(false);
      }
    }
    
    init();
    return () => { mounted = false; };
  }, []);

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    if (!searchQuery.trim()) return facilities.slice(0, 20);
    
    const query = searchQuery.toLowerCase();
    return facilities.filter(f => 
      f.name.toLowerCase().includes(query) ||
      f.operator.toLowerCase().includes(query) ||
      f.city.toLowerCase().includes(query) ||
      f.state.toLowerCase().includes(query)
    ).slice(0, 20);
  }, [facilities, searchQuery]);

  // Problem facilities
  const problemFacilities = useMemo(() => 
    facilities.filter(f => f.complianceStatus === 'Non-Compliant').slice(0, 5)
  , [facilities]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-6 animate-pulse shadow-xl shadow-blue-500/30">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">Loading Dashboard</h2>
          <p className="text-slate-500">Preparing your data center accountability data...</p>
          <div className="mt-6 w-48 h-1.5 bg-slate-200 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors lg:hidden"
              >
                <Menu size={20} className="text-slate-600" />
              </button>
              
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold font-display text-slate-800 tracking-tight">
                    DCIM Compliance
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">Big Tech Accountability</p>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="flex-1 max-w-2xl">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search facilities, operators, or locations..."
                  className="
                    w-full pl-12 pr-24 py-3.5
                    bg-slate-50 border-2 border-slate-200 rounded-2xl
                    text-slate-800 placeholder-slate-400
                    focus:outline-none focus:border-blue-400 focus:bg-white focus:shadow-lg
                    transition-all duration-300
                  "
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                  <kbd className="hidden sm:flex px-2.5 py-1.5 text-xs font-medium text-slate-400 bg-white rounded-lg border border-slate-200 shadow-sm">
                    ⌘K
                  </kbd>
                  <button className="p-2 bg-blue-500 hover:bg-blue-600 rounded-xl text-white transition-colors shadow-md shadow-blue-500/30">
                    <Sparkles size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <button className="relative p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
                <Bell size={20} className="text-slate-600" />
                {stats && stats.nonCompliant > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-lg shadow-rose-500/50" />
                )}
              </button>
              
              <button className="
                flex items-center gap-2 px-5 py-2.5
                bg-gradient-to-r from-blue-500 to-blue-600 
                hover:from-blue-600 hover:to-blue-700
                text-white font-semibold rounded-xl
                transition-all duration-300 shadow-lg shadow-blue-500/30
                hover:shadow-xl hover:shadow-blue-500/40
              ">
                <Download size={16} />
                <span>Export</span>
              </button>
              
              <button className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors">
                <HelpCircle size={20} className="text-slate-600" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`
          fixed lg:sticky top-[73px] left-0 z-40
          h-[calc(100vh-73px)] w-72
          bg-white/90 backdrop-blur-xl border-r border-slate-200
          transform transition-all duration-300 ease-out
          overflow-y-auto
          ${sidebarCollapsed ? '-translate-x-full lg:translate-x-0 lg:w-20' : 'translate-x-0'}
        `}>
          <div className="p-4 space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <h3 className={`
                  text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3
                  ${sidebarCollapsed ? 'lg:hidden' : ''}
                `}>
                  {section.title}
                </h3>
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => setActiveSection(item.id)}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          transition-all duration-200
                          ${isActive 
                            ? 'bg-blue-50 text-blue-600 shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800'
                          }
                          ${sidebarCollapsed ? 'lg:justify-center lg:px-2' : ''}
                        `}
                      >
                        <Icon size={20} className={isActive ? 'text-blue-500' : ''} />
                        <span className={`font-medium ${sidebarCollapsed ? 'lg:hidden' : ''}`}>
                          {item.label}
                        </span>
                        {item.badge === 'hot' && stats && stats.nonCompliant > 0 && (
                          <span className={`
                            ml-auto px-2 py-0.5 text-xs font-bold rounded-full
                            bg-rose-100 text-rose-600
                            ${sidebarCollapsed ? 'lg:hidden' : ''}
                          `}>
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

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-73px)] p-6">
          {/* Page Title */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-3xl font-bold font-display text-slate-800 tracking-tight">
                  Dashboard
                </h2>
                <p className="text-slate-500 mt-1 text-lg">
                  Tracking {facilities.length.toLocaleString()} data center facilities
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 hover:border-blue-300 rounded-xl font-medium text-slate-700 hover:text-blue-600 transition-all">
                  <RefreshCw size={16} />
                  Refresh
                </button>
                <button className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/30 transition-all">
                  <FileText size={16} />
                  Generate Report
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          {stats && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                label="Total Facilities"
                value={stats.totalFacilities.toLocaleString()}
                subtext="Data centers tracked"
                change={2.5}
                icon={<Building2 size={26} />}
                color="blue"
              />
              <StatCard
                label="Compliant"
                value={stats.compliant.toLocaleString()}
                subtext="Meeting job promises"
                change={-1.2}
                icon={<CheckCircle size={26} />}
                color="green"
              />
              <StatCard
                label="Non-Compliant"
                value={stats.nonCompliant.toLocaleString()}
                subtext="Breaking promises"
                change={3.8}
                icon={<XCircle size={26} />}
                color="red"
              />
              <StatCard
                label="Subsidy Gap"
                value={formatCurrency(stats.totalSubsidyGap)}
                subtext="Unrecovered taxpayer money"
                icon={<DollarSign size={26} />}
                color="amber"
              />
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Quick Actions */}
            <div className="lg:col-span-1 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Zap className="text-amber-500" size={20} />
                Quick Actions
              </h3>
              <QuickAction
                icon={<Search className="text-blue-600" size={22} />}
                label="AI Search"
                description="Natural language facility queries"
                color="bg-blue-100"
                onClick={() => {}}
              />
              <QuickAction
                icon={<AlertTriangle className="text-rose-600" size={22} />}
                label="View Problems"
                description={`${stats?.nonCompliant || 0} facilities need attention`}
                color="bg-rose-100"
                onClick={() => setActiveSection('problems')}
              />
              <QuickAction
                icon={<Globe className="text-emerald-600" size={22} />}
                label="Geographic View"
                description="Interactive map visualization"
                color="bg-emerald-100"
                onClick={() => setActiveSection('geography')}
              />
              <QuickAction
                icon={<FileText className="text-purple-600" size={22} />}
                label="Export Report"
                description="PDF or CSV compliance report"
                color="bg-purple-100"
                onClick={() => {}}
              />
            </div>

            {/* Problem Facilities */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <AlertTriangle className="text-rose-500" size={20} />
                    Facilities Needing Attention
                  </h3>
                  <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                    View All
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="divide-y divide-slate-100">
                  {problemFacilities.length > 0 ? problemFacilities.map((facility) => (
                    <div 
                      key={facility.id}
                      className="px-6 py-4 hover:bg-rose-50/50 transition-colors cursor-pointer flex items-center justify-between group"
                      onClick={() => setSelectedFacility(facility)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                          <Building2 className="text-rose-600" size={20} />
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800 group-hover:text-rose-600 transition-colors">
                            {facility.name}
                          </p>
                          <p className="text-sm text-slate-500">{facility.operator} • {facility.state}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-rose-600">{formatCurrency(facility.subsidyGap)}</p>
                        <p className="text-xs text-slate-500">subsidy gap</p>
                      </div>
                    </div>
                  )) : (
                    <div className="px-6 py-12 text-center">
                      <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                      <p className="text-slate-600 font-medium">All facilities are compliant!</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Facilities Table */}
          <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Database size={20} className="text-blue-500" />
                Recent Facilities
              </h3>
              <div className="flex items-center gap-3">
                <button className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all">
                  <Filter size={16} />
                  Filter
                </button>
                <button className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors">
                  View All
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Facility</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Location</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Subsidy Gap</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredFacilities.map((facility) => (
                    <FacilityRow
                      key={facility.id}
                      facility={facility}
                      onClick={() => setSelectedFacility(facility)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm text-slate-500">
              <p>© 2026 DCIM Compliance Dashboard — Built for Labor Organizers</p>
              <div className="flex items-center gap-6">
                <a href="#" className="hover:text-blue-600 transition-colors">Documentation</a>
                <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
                <a href="#" className="hover:text-blue-600 transition-colors">Privacy</a>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default LightDashboard;

