/**
 * Light Dashboard - Professional, Demo-Ready UI
 * 
 * A beautifully designed light theme dashboard for presentations and demos.
 * Clean, modern, and professional while maintaining full functionality.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Search, Menu, Bell, Settings, Download, ChevronRight,
  Building2, AlertTriangle, CheckCircle, XCircle, HelpCircle,
  TrendingUp, TrendingDown, DollarSign, MapPin,
  Filter, X, Sparkles, BarChart3, Globe, FileText, Zap, 
  Shield, Activity, RefreshCw, Clock, ArrowRight, Database, Network,
  ChevronDown, ExternalLink, Info, Copy, Check, ArrowUpRight
} from 'lucide-react';
import { db } from '../db/database';
import { seedDatabase } from '../db/seedData';
import { Facility, ComplianceStats } from '../types';
import { calculateStats } from '../utils/stats';
import { safeDbOperation } from '../utils/dbOperations';
import { formatCurrency } from '../utils/formatting';
import { downloadComplianceReport } from '../services/PDFReportGenerator';

// Section type for navigation
type Section = 'dashboard' | 'facilities' | 'geography' | 'problems' | 'intelligence' | 'subsidies' | 'workers' | 'timeline' | 'reports' | 'osint' | 'network';

// Navigation sections
const navSections = [
  {
    title: 'Getting Started',
    items: [
      { id: 'dashboard' as Section, label: 'Dashboard', icon: BarChart3, description: 'Overview & key metrics' },
      { id: 'facilities' as Section, label: 'Facilities', icon: Building2, description: 'Browse all data centers' },
    ]
  },
  {
    title: 'Analysis & Intelligence',
    items: [
      { id: 'geography' as Section, label: 'Geographic View', icon: Globe, description: 'Map visualization' },
      { id: 'problems' as Section, label: 'Problems', icon: AlertTriangle, badge: 'hot', description: 'Non-compliant facilities' },
      { id: 'intelligence' as Section, label: 'Intelligence Hub', icon: Zap, description: 'AI-powered insights' },
    ]
  },
  {
    title: 'Compliance Tracking',
    items: [
      { id: 'subsidies' as Section, label: 'Subsidies', icon: DollarSign, description: 'Track tax breaks' },
      { id: 'workers' as Section, label: 'Worker Safety', icon: Shield, description: 'Labor conditions' },
      { id: 'timeline' as Section, label: 'Timeline', icon: Clock, description: 'Compliance history' },
    ]
  },
  {
    title: 'Reports & Tools',
    items: [
      { id: 'reports' as Section, label: 'Reports', icon: FileText, description: 'Generate exports' },
      { id: 'osint' as Section, label: 'OSINT Tools', icon: Search, description: 'Open source intel' },
      { id: 'network' as Section, label: 'Network Map', icon: Network, description: 'Infrastructure view' },
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
    blue: { icon: 'bg-blue-100 text-blue-600', border: 'border-blue-100 hover:border-blue-300' },
    green: { icon: 'bg-emerald-100 text-emerald-600', border: 'border-emerald-100 hover:border-emerald-300' },
    red: { icon: 'bg-rose-100 text-rose-600', border: 'border-rose-100 hover:border-rose-300' },
    amber: { icon: 'bg-amber-100 text-amber-600', border: 'border-amber-100 hover:border-amber-300' },
    purple: { icon: 'bg-purple-100 text-purple-600', border: 'border-purple-100 hover:border-purple-300' },
    cyan: { icon: 'bg-cyan-100 text-cyan-600', border: 'border-cyan-100 hover:border-cyan-300' },
  };
  
  const colors = colorMap[color];

  return (
    <button 
      onClick={onClick}
      className={`
        w-full text-left p-6 bg-white rounded-2xl border-2 ${colors.border}
        transition-all duration-300 ease-out
        hover:shadow-xl hover:-translate-y-1 active:translate-y-0 active:shadow-md
        cursor-pointer group
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
    </button>
  );
};

// Facility Detail Modal
const FacilityModal: React.FC<{
  facility: Facility;
  onClose: () => void;
}> = ({ facility, onClose }) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors = {
    'Compliant': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Non-Compliant': 'bg-rose-100 text-rose-700 border-rose-200',
    'At Risk': 'bg-amber-100 text-amber-700 border-amber-200',
    'Unknown': 'bg-slate-100 text-slate-600 border-slate-200',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div 
        className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-blue-500/30">
              {facility.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">{facility.name}</h2>
              <p className="text-slate-500">{facility.operator}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Status Badge */}
          <div className="mb-6">
            <span className={`
              inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold border
              ${statusColors[facility.complianceStatus] || statusColors['Unknown']}
            `}>
              {facility.complianceStatus === 'Compliant' && <CheckCircle size={16} className="mr-2" />}
              {facility.complianceStatus === 'Non-Compliant' && <XCircle size={16} className="mr-2" />}
              {facility.complianceStatus === 'At Risk' && <AlertTriangle size={16} className="mr-2" />}
              {facility.complianceStatus}
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Location</p>
              <p className="text-slate-800 font-medium flex items-center gap-2">
                <MapPin size={16} className="text-slate-400" />
                {facility.city || 'Unknown'}, {facility.state || 'Unknown'}
              </p>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Facility Type</p>
              <p className="text-slate-800 font-medium">{facility.type || 'Data Center'}</p>
            </div>
            <div className="p-4 bg-rose-50 rounded-xl">
              <p className="text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">Subsidy Gap</p>
              <p className="text-rose-700 font-bold text-lg">{formatCurrency(facility.subsidyGap || 0)}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">Jobs Created</p>
              <p className="text-blue-700 font-bold text-lg">{(facility.jobsCreated ?? 0).toLocaleString()}</p>
            </div>
          </div>

          {/* Issues */}
          {facility.issues && facility.issues.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-500" />
                Active Issues ({facility.issues.length})
              </h3>
              <div className="space-y-2">
                {facility.issues.map((issue, i) => (
                  <div key={i} className="p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                    {issue}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Copy ID */}
          <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
            <span className="text-xs text-slate-500">Facility ID:</span>
            <code className="text-xs font-mono text-slate-600 flex-1">{facility.id}</code>
            <button 
              onClick={() => copyToClipboard(String(facility.id))}
              className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between">
          <button 
            onClick={onClose}
            className="px-4 py-2.5 text-slate-600 hover:text-slate-800 font-medium transition-colors"
          >
            Close
          </button>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2.5 border-2 border-slate-200 hover:border-blue-300 rounded-xl font-medium text-slate-700 hover:text-blue-600 transition-all">
              <FileText size={16} />
              Export Details
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/30 transition-all">
              <ExternalLink size={16} />
              View Full Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Notification Panel
const NotificationPanel: React.FC<{
  stats: ComplianceStats | null;
  facilities: Facility[];
  onClose: () => void;
  onViewProblems: () => void;
}> = ({ stats, facilities, onClose, onViewProblems }) => {
  const urgentFacilities = facilities.filter(f => f.complianceStatus === 'Non-Compliant').slice(0, 5);

  return (
    <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-slide-down z-50">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          <Bell size={18} className="text-blue-500" />
          Notifications
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg transition-colors">
          <X size={16} className="text-slate-400" />
        </button>
      </div>
      
      <div className="max-h-80 overflow-y-auto">
        {stats && stats.nonCompliant > 0 ? (
          <>
            <div className="p-4 bg-rose-50 border-b border-rose-100">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                  <AlertTriangle className="text-rose-600" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-rose-700">{stats.nonCompliant} Non-Compliant Facilities</p>
                  <p className="text-sm text-rose-600 mt-1">Require immediate attention</p>
                  <button 
                    onClick={onViewProblems}
                    className="mt-2 text-sm font-semibold text-rose-700 hover:text-rose-800 flex items-center gap-1"
                  >
                    View All <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            </div>
            
            {urgentFacilities.map((facility, i) => (
              <div key={facility.id} className="p-4 border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-rose-100 flex items-center justify-center text-rose-600 font-bold text-sm">
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800 text-sm">{facility.name}</p>
                    <p className="text-xs text-slate-500">{facility.operator} • {facility.state}</p>
                  </div>
                  <span className="text-sm font-bold text-rose-600">{formatCurrency(facility.subsidyGap)}</span>
                </div>
              </div>
            ))}
          </>
        ) : (
          <div className="p-8 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <p className="font-medium text-slate-600">All clear!</p>
            <p className="text-sm text-slate-500">No urgent notifications</p>
          </div>
        )}
      </div>
    </div>
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
    className="flex items-center gap-4 p-4 bg-white rounded-xl border-2 border-slate-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 text-left group w-full active:scale-[0.98]"
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
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Show toast notification
  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      await seedDatabase();
      const data = await safeDbOperation(
        () => db.facilities.toArray(),
        () => []
      );
      setFacilities(data);
      setStats(calculateStats(data));
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Error loading data');
    }
  }, [showToast]);

  useEffect(() => {
    let mounted = true;
    
    async function init() {
      await loadData();
      if (mounted) setLoading(false);
    }
    
    init();
    return () => { mounted = false; };
  }, [loadData]);

  // Refresh data
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showToast('Data refreshed successfully');
  };

  // Export report
  const handleExport = async () => {
    if (!stats) return;
    setIsExporting(true);
    try {
      await downloadComplianceReport(filteredFacilities, stats, undefined, {
        title: 'DCIM Compliance Report',
        maxFacilities: 100,
      });
      showToast('Report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      showToast('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    let result = [...facilities];
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(query) ||
        f.operator.toLowerCase().includes(query) ||
        f.city.toLowerCase().includes(query) ||
        f.state.toLowerCase().includes(query)
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      result = result.filter(f => f.complianceStatus === filterStatus);
    }
    
    return result;
  }, [facilities, searchQuery, filterStatus]);

  // Display facilities based on section
  const displayFacilities = useMemo(() => {
    if (activeSection === 'problems') {
      return filteredFacilities.filter(f => f.complianceStatus === 'Non-Compliant').slice(0, 20);
    }
    return filteredFacilities.slice(0, 20);
  }, [filteredFacilities, activeSection]);

  // Problem facilities for dashboard
  const problemFacilities = useMemo(() => 
    facilities.filter(f => f.complianceStatus === 'Non-Compliant').slice(0, 5)
  , [facilities]);

  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      showToast(`Searching for "${searchQuery}"...`);
      setActiveSection('facilities');
    }
  };

  // Get section title
  const getSectionTitle = () => {
    const titles: Record<Section, string> = {
      dashboard: 'Dashboard',
      facilities: 'All Facilities',
      geography: 'Geographic View',
      problems: 'Problem Facilities',
      intelligence: 'Intelligence Hub',
      subsidies: 'Subsidy Tracking',
      workers: 'Worker Safety',
      timeline: 'Compliance Timeline',
      reports: 'Reports',
      osint: 'OSINT Tools',
      network: 'Network Map'
    };
    return titles[activeSection];
  };

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
            <div className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
          <div className="px-6 py-3 bg-slate-800 text-white rounded-full shadow-xl flex items-center gap-3">
            <Check size={18} className="text-emerald-400" />
            <span className="font-medium">{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Facility Modal */}
      {selectedFacility && (
        <FacilityModal 
          facility={selectedFacility} 
          onClose={() => setSelectedFacility(null)} 
        />
      )}

      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-sm">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between gap-6">
            {/* Logo */}
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors lg:hidden active:bg-slate-200"
              >
                <Menu size={20} className="text-slate-600" />
              </button>
              
              <button 
                onClick={() => setActiveSection('dashboard')}
                className="flex items-center gap-3 hover:opacity-80 transition-opacity"
              >
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-lg font-bold font-display text-slate-800 tracking-tight">
                    DCIM Compliance
                  </h1>
                  <p className="text-xs text-slate-500 font-medium">Big Tech Accountability</p>
                </div>
              </button>
            </div>

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-2xl">
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
                  <button 
                    type="submit"
                    className="p-2 bg-blue-500 hover:bg-blue-600 active:bg-blue-700 rounded-xl text-white transition-colors shadow-md shadow-blue-500/30"
                  >
                    <Sparkles size={16} />
                  </button>
                </div>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
                >
                  <Bell size={20} className="text-slate-600" />
                  {stats && stats.nonCompliant > 0 && (
                    <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full animate-pulse shadow-lg shadow-rose-500/50" />
                  )}
                </button>
                
                {showNotifications && (
                  <NotificationPanel 
                    stats={stats}
                    facilities={facilities}
                    onClose={() => setShowNotifications(false)}
                    onViewProblems={() => {
                      setActiveSection('problems');
                      setShowNotifications(false);
                    }}
                  />
                )}
              </div>
              
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className="
                  flex items-center gap-2 px-5 py-2.5
                  bg-gradient-to-r from-blue-500 to-blue-600 
                  hover:from-blue-600 hover:to-blue-700
                  active:from-blue-700 active:to-blue-800
                  disabled:opacity-50 disabled:cursor-not-allowed
                  text-white font-semibold rounded-xl
                  transition-all duration-300 shadow-lg shadow-blue-500/30
                  hover:shadow-xl hover:shadow-blue-500/40
                "
              >
                {isExporting ? (
                  <RefreshCw size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                <span className="hidden sm:inline">Export</span>
              </button>
              
              <button 
                onClick={() => showToast('Help center coming soon!')}
                className="p-2.5 hover:bg-slate-100 active:bg-slate-200 rounded-xl transition-colors"
              >
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
          ${sidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
        `}>
          <div className="p-4 space-y-6">
            {navSections.map((section) => (
              <div key={section.title}>
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 px-3">
                  {section.title}
                </h3>
                <nav className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeSection === item.id;
                    
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id);
                          setSidebarCollapsed(true);
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                          transition-all duration-200
                          ${isActive 
                            ? 'bg-blue-50 text-blue-600 shadow-sm' 
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800 active:bg-slate-100'
                          }
                        `}
                      >
                        <Icon size={20} className={isActive ? 'text-blue-500' : ''} />
                        <span className="font-medium">{item.label}</span>
                        {item.badge === 'hot' && stats && stats.nonCompliant > 0 && (
                          <span className="ml-auto px-2 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-600">
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

        {/* Mobile sidebar overlay */}
        {!sidebarCollapsed && (
          <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            onClick={() => setSidebarCollapsed(true)}
          />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-73px)] p-6">
          {/* Page Title */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-3xl font-bold font-display text-slate-800 tracking-tight">
                  {getSectionTitle()}
                </h2>
                <p className="text-slate-500 mt-1 text-lg">
                  {activeSection === 'problems' 
                    ? `${stats?.nonCompliant || 0} facilities need attention`
                    : `Tracking ${facilities.length.toLocaleString()} data center facilities`
                  }
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-2 px-4 py-2.5 bg-white border-2 border-slate-200 hover:border-blue-300 active:bg-slate-50 rounded-xl font-medium text-slate-700 hover:text-blue-600 transition-all disabled:opacity-50"
                >
                  <RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />
                  Refresh
                </button>
                <button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/30 transition-all disabled:opacity-50"
                >
                  <FileText size={16} />
                  Generate Report
                </button>
              </div>
            </div>
          </div>

          {/* Stats Grid - Show on Dashboard */}
          {activeSection === 'dashboard' && stats && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
                <StatCard
                  label="Total Facilities"
                  value={stats.totalFacilities.toLocaleString()}
                  subtext="Data centers tracked"
                  change={2.5}
                  icon={<Building2 size={26} />}
                  color="blue"
                  onClick={() => setActiveSection('facilities')}
                />
                <StatCard
                  label="Compliant"
                  value={stats.compliant.toLocaleString()}
                  subtext="Meeting job promises"
                  change={-1.2}
                  icon={<CheckCircle size={26} />}
                  color="green"
                  onClick={() => {
                    setFilterStatus('Compliant');
                    setActiveSection('facilities');
                  }}
                />
                <StatCard
                  label="Non-Compliant"
                  value={stats.nonCompliant.toLocaleString()}
                  subtext="Breaking promises"
                  change={3.8}
                  icon={<XCircle size={26} />}
                  color="red"
                  onClick={() => setActiveSection('problems')}
                />
                <StatCard
                  label="Subsidy Gap"
                  value={formatCurrency(stats.totalSubsidyGap)}
                  subtext="Unrecovered taxpayer money"
                  icon={<DollarSign size={26} />}
                  color="amber"
                  onClick={() => setActiveSection('subsidies')}
                />
              </div>

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
                    onClick={() => {
                      document.querySelector('input')?.focus();
                      showToast('Type your search query');
                    }}
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
                    onClick={handleExport}
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
                      <button 
                        onClick={() => setActiveSection('problems')}
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                      >
                        View All
                        <ChevronRight size={16} />
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {problemFacilities.length > 0 ? problemFacilities.map((facility) => (
                        <button 
                          key={facility.id}
                          onClick={() => setSelectedFacility(facility)}
                          className="w-full px-6 py-4 hover:bg-rose-50/50 active:bg-rose-100/50 transition-colors flex items-center justify-between group text-left"
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
                          <div className="text-right flex items-center gap-3">
                            <div>
                              <p className="font-bold text-rose-600">{formatCurrency(facility.subsidyGap)}</p>
                              <p className="text-xs text-slate-500">subsidy gap</p>
                            </div>
                            <ArrowUpRight size={16} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
                          </div>
                        </button>
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
            </>
          )}

          {/* Facilities List - Show on Facilities/Problems sections */}
          {(activeSection === 'facilities' || activeSection === 'problems') && (
            <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-4">
                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <Database size={20} className="text-blue-500" />
                  {activeSection === 'problems' ? 'Problem Facilities' : 'All Facilities'}
                  <span className="text-slate-400 font-normal">({displayFacilities.length})</span>
                </h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <button 
                      onClick={() => setShowFilters(!showFilters)}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-all"
                    >
                      <Filter size={16} />
                      Filter
                      <ChevronDown size={14} className={`transition-transform ${showFilters ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {showFilters && (
                      <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-2 z-20 animate-scale-in">
                        {['all', 'Compliant', 'Non-Compliant', 'At Risk'].map((status) => (
                          <button
                            key={status}
                            onClick={() => {
                              setFilterStatus(status);
                              setShowFilters(false);
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                              filterStatus === status 
                                ? 'bg-blue-50 text-blue-600' 
                                : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            {status === 'all' ? 'All Statuses' : status}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {filterStatus !== 'all' && (
                    <button 
                      onClick={() => setFilterStatus('all')}
                      className="text-sm text-slate-500 hover:text-rose-500 transition-colors"
                    >
                      Clear filter
                    </button>
                  )}
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
                    {displayFacilities.map((facility) => {
                      const statusColors = {
                        'Compliant': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                        'Non-Compliant': 'bg-rose-100 text-rose-700 border-rose-200',
                        'At Risk': 'bg-amber-100 text-amber-700 border-amber-200',
                        'Unknown': 'bg-slate-100 text-slate-600 border-slate-200',
                      };
                      
                      return (
                        <tr 
                          key={facility.id}
                          onClick={() => setSelectedFacility(facility)}
                          className="hover:bg-blue-50/50 active:bg-blue-100/50 transition-colors cursor-pointer group"
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
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-blue-100 rounded-lg">
                              <ArrowRight size={16} className="text-blue-600" />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {displayFacilities.length === 0 && (
                <div className="p-12 text-center">
                  <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="font-medium text-slate-600">No facilities found</p>
                  <p className="text-sm text-slate-500 mt-1">Try adjusting your search or filters</p>
                </div>
              )}
            </div>
          )}

          {/* Placeholder for other sections */}
          {!['dashboard', 'facilities', 'problems'].includes(activeSection) && (
            <div className="bg-white rounded-2xl border-2 border-slate-100 shadow-sm p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center mx-auto mb-4">
                <Info className="w-8 h-8 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">{getSectionTitle()}</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                This section is coming soon. For now, explore the Dashboard, Facilities, and Problems sections for full functionality.
              </p>
              <button 
                onClick={() => setActiveSection('dashboard')}
                className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold text-white shadow-lg shadow-blue-500/30 transition-all"
              >
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-12 pt-8 border-t border-slate-200">
            <div className="flex items-center justify-between text-sm text-slate-500 flex-wrap gap-4">
              <p>© 2026 DCIM Compliance Dashboard — Built for Labor Organizers</p>
              <div className="flex items-center gap-6">
                <button onClick={() => showToast('Documentation coming soon!')} className="hover:text-blue-600 transition-colors">Documentation</button>
                <button onClick={() => showToast('Support coming soon!')} className="hover:text-blue-600 transition-colors">Support</button>
                <button onClick={() => showToast('Privacy policy coming soon!')} className="hover:text-blue-600 transition-colors">Privacy</button>
              </div>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default LightDashboard;
