/**
 * ResponsiveLayoutSystem.tsx
 * 
 * Adaptive layout system that automatically adjusts for:
 * - Mobile phones (< 640px)
 * - Tablets (640px - 1024px)
 * - Desktops (> 1024px)
 * 
 * Features:
 * - Auto-detects screen size
 * - Switches layouts based on device
 * - Touch-friendly mobile targets
 * - Maintains data density on desktop
 * - Preserves navigation across all sizes
 */

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import {
  Menu, X, ChevronDown, ChevronRight, ChevronLeft,
  Building2, AlertTriangle, DollarSign, Users, Map, BarChart3,
  Search, Filter, Settings, Download, Bell, Home, Layers,
  Smartphone, Monitor, Tablet, LayoutGrid, List, ArrowUp
} from 'lucide-react';

// ============================================================================
// RESPONSIVE CONTEXT
// ============================================================================
type DeviceType = 'mobile' | 'tablet' | 'desktop';
type LayoutMode = 'auto' | 'mobile' | 'tablet' | 'desktop';

interface ResponsiveContextType {
  device: DeviceType;
  layoutMode: LayoutMode;
  setLayoutMode: (mode: LayoutMode) => void;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  width: number;
  height: number;
}

const ResponsiveContext = createContext<ResponsiveContextType>({
  device: 'desktop',
  layoutMode: 'auto',
  setLayoutMode: () => {},
  isMobile: false,
  isTablet: false,
  isDesktop: true,
  width: 1920,
  height: 1080
});

export const useResponsive = () => useContext(ResponsiveContext);

// ============================================================================
// RESPONSIVE PROVIDER
// ============================================================================
export const ResponsiveProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1920);
  const [height, setHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 1080);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('auto');

  useEffect(() => {
    const handleResize = () => {
      setWidth(window.innerWidth);
      setHeight(window.innerHeight);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getDevice = (): DeviceType => {
    if (layoutMode !== 'auto') return layoutMode as DeviceType;
    if (width < 640) return 'mobile';
    if (width < 1024) return 'tablet';
    return 'desktop';
  };

  const device = getDevice();

  return (
    <ResponsiveContext.Provider value={{
      device,
      layoutMode,
      setLayoutMode,
      isMobile: device === 'mobile',
      isTablet: device === 'tablet',
      isDesktop: device === 'desktop',
      width,
      height
    }}>
      {children}
    </ResponsiveContext.Provider>
  );
};

// ============================================================================
// RESPONSIVE NAV (Bottom nav on mobile, sidebar on desktop)
// ============================================================================
interface NavItem {
  id: string;
  label: string;
  icon: ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <Home size={20} /> },
  { id: 'facilities', label: 'Facilities', icon: <Building2 size={20} />, badge: 11992 },
  { id: 'problems', label: 'Problems', icon: <AlertTriangle size={20} />, badge: 3251 },
  { id: 'geography', label: 'Geography', icon: <Map size={20} /> },
  { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} /> },
];

export const ResponsiveNav: React.FC<{
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ activeTab, onTabChange }) => {
  const { isMobile, isTablet } = useResponsive();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Mobile: Bottom navigation bar
  if (isMobile) {
    return (
      <>
        {/* Bottom Nav */}
        <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-50 safe-area-pb">
          <div className="flex justify-around items-center h-16">
            {navItems.slice(0, 4).map((item) => (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex flex-col items-center justify-center flex-1 h-full relative ${
                  activeTab === item.id ? 'text-indigo-600' : 'text-slate-500'
                }`}
              >
                {item.icon}
                <span className="text-[10px] mt-1">{item.label}</span>
                {item.badge && item.badge > 0 && (
                  <span className="absolute top-1 right-1/4 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
            ))}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex flex-col items-center justify-center flex-1 h-full text-slate-500"
            >
              <Menu size={20} />
              <span className="text-[10px] mt-1">More</span>
            </button>
          </div>
        </nav>

        {/* Mobile Menu Drawer */}
        {mobileMenuOpen && (
          <div className="fixed inset-0 z-[60]">
            <div 
              className="absolute inset-0 bg-black/50" 
              onClick={() => setMobileMenuOpen(false)} 
            />
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[70vh] overflow-y-auto animate-slide-up">
              <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Menu</h3>
                  <button onClick={() => setMobileMenuOpen(false)} className="p-2">
                    <X size={24} />
                  </button>
                </div>
                <div className="space-y-2">
                  {navItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => { onTabChange(item.id); setMobileMenuOpen(false); }}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl ${
                        activeTab === item.id 
                          ? 'bg-indigo-100 text-indigo-700' 
                          : 'hover:bg-slate-100'
                      }`}
                    >
                      {item.icon}
                      <span className="font-medium">{item.label}</span>
                      {item.badge && (
                        <span className="ml-auto px-2 py-0.5 bg-slate-200 rounded-full text-xs">
                          {item.badge.toLocaleString()}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // Tablet: Collapsible sidebar
  if (isTablet) {
    return (
      <aside className="fixed left-0 top-0 bottom-0 w-16 bg-white border-r border-slate-200 z-40 flex flex-col items-center py-4 gap-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            title={item.label}
            className={`relative p-3 rounded-xl transition-colors ${
              activeTab === item.id 
                ? 'bg-indigo-100 text-indigo-600' 
                : 'text-slate-500 hover:bg-slate-100'
            }`}
          >
            {item.icon}
            {item.badge && item.badge > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            )}
          </button>
        ))}
      </aside>
    );
  }

  // Desktop: Full sidebar
  return (
    <aside className="fixed left-0 top-0 bottom-0 w-56 bg-white border-r border-slate-200 z-40 flex flex-col">
      <div className="p-4 border-b border-slate-200">
        <h1 className="font-bold text-lg text-slate-800 flex items-center gap-2">
          <Building2 className="text-indigo-600" size={24} />
          DCIM
        </h1>
      </div>
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onTabChange(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
              activeTab === item.id 
                ? 'bg-indigo-100 text-indigo-700 font-medium' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {item.icon}
            <span>{item.label}</span>
            {item.badge && (
              <span className={`ml-auto px-2 py-0.5 rounded-full text-xs ${
                activeTab === item.id ? 'bg-indigo-200' : 'bg-slate-200'
              }`}>
                {item.badge.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </nav>
    </aside>
  );
};

// ============================================================================
// RESPONSIVE STAT CARDS
// ============================================================================
interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  icon: ReactNode;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple';
}

export const ResponsiveStatCard: React.FC<StatCardProps> = ({ label, value, change, icon, color }) => {
  const { isMobile, isTablet } = useResponsive();

  const colors = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-emerald-500 to-green-600',
    red: 'from-rose-500 to-red-600',
    amber: 'from-amber-500 to-orange-600',
    purple: 'from-purple-500 to-violet-600'
  };

  // Mobile: Compact horizontal card
  if (isMobile) {
    return (
      <div className={`bg-gradient-to-r ${colors[color]} rounded-xl p-3 text-white`}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs opacity-80">{label}</div>
            <div className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          </div>
          <div className="opacity-50">{icon}</div>
        </div>
        {change && <div className="text-xs opacity-80 mt-1">{change}</div>}
      </div>
    );
  }

  // Tablet/Desktop: Vertical card
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-500">{label}</span>
        <div className={`p-2 rounded-lg bg-gradient-to-br ${colors[color]} text-white`}>
          {icon}
        </div>
      </div>
      <div className="text-2xl font-bold text-slate-800">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      {change && <div className="text-sm text-emerald-600 mt-1">{change}</div>}
    </div>
  );
};

// ============================================================================
// RESPONSIVE DATA TABLE
// ============================================================================
interface TableColumn {
  key: string;
  label: string;
  hideOnMobile?: boolean;
  hideOnTablet?: boolean;
}

interface ResponsiveTableProps {
  columns: TableColumn[];
  data: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
}

export const ResponsiveTable: React.FC<ResponsiveTableProps> = ({ columns, data, onRowClick }) => {
  const { isMobile, isTablet } = useResponsive();

  const visibleColumns = columns.filter(col => {
    if (isMobile && col.hideOnMobile) return false;
    if (isTablet && col.hideOnTablet) return false;
    return true;
  });

  // Mobile: Card list view
  if (isMobile) {
    return (
      <div className="space-y-2">
        {data.slice(0, 20).map((row, i) => (
          <button
            key={i}
            onClick={() => onRowClick?.(row)}
            className="w-full bg-white rounded-xl p-4 shadow-sm border border-slate-200 text-left active:scale-[0.98] transition-transform"
          >
            <div className="font-medium text-slate-800 mb-1">
              {String(row[columns[0].key] || '')}
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-500">
              {visibleColumns.slice(1).map(col => (
                <span key={col.key} className="bg-slate-100 px-2 py-0.5 rounded">
                  {col.label}: {String(row[col.key] || '—')}
                </span>
              ))}
            </div>
          </button>
        ))}
      </div>
    );
  }

  // Tablet/Desktop: Table view
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {visibleColumns.map(col => (
                <th key={col.key} className="text-left px-4 py-3 text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.slice(0, 50).map((row, i) => (
              <tr
                key={i}
                onClick={() => onRowClick?.(row)}
                className="hover:bg-slate-50 cursor-pointer transition-colors"
              >
                {visibleColumns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm text-slate-700">
                    {String(row[col.key] || '—')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// RESPONSIVE HEADER
// ============================================================================
export const ResponsiveHeader: React.FC<{
  title?: string;
  onSearch?: (query: string) => void;
  onFilter?: () => void;
}> = ({ title = 'Dashboard', onSearch, onFilter }) => {
  const { isMobile, isTablet } = useResponsive();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Mobile header
  if (isMobile) {
    return (
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200">
        {searchOpen ? (
          <div className="flex items-center gap-2 p-3">
            <button onClick={() => setSearchOpen(false)} className="p-2">
              <ChevronLeft size={20} />
            </button>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); onSearch?.(e.target.value); }}
              placeholder="Search facilities..."
              className="flex-1 px-3 py-2 bg-slate-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
          </div>
        ) : (
          <div className="flex items-center justify-between p-3">
            <h1 className="font-semibold text-lg text-slate-800">{title}</h1>
            <div className="flex items-center gap-1">
              <button onClick={() => setSearchOpen(true)} className="p-2 hover:bg-slate-100 rounded-lg">
                <Search size={20} className="text-slate-600" />
              </button>
              <button onClick={onFilter} className="p-2 hover:bg-slate-100 rounded-lg">
                <Filter size={20} className="text-slate-600" />
              </button>
              <button className="p-2 hover:bg-slate-100 rounded-lg relative">
                <Bell size={20} className="text-slate-600" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            </div>
          </div>
        )}
      </header>
    );
  }

  // Tablet/Desktop header
  return (
    <header className={`sticky top-0 z-30 bg-white border-b border-slate-200 ${isTablet ? 'ml-16' : 'ml-56'}`}>
      <div className="flex items-center justify-between px-6 py-3">
        <h1 className="font-semibold text-xl text-slate-800">{title}</h1>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); onSearch?.(e.target.value); }}
              placeholder="Search..."
              className="pl-10 pr-4 py-2 bg-slate-100 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button onClick={onFilter} className="px-3 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm text-slate-600 flex items-center gap-1">
            <Filter size={16} />
            Filters
          </button>
          <button className="p-2 hover:bg-slate-100 rounded-lg relative">
            <Bell size={20} className="text-slate-600" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          </button>
        </div>
      </div>
    </header>
  );
};

// ============================================================================
// RESPONSIVE LAYOUT WRAPPER
// ============================================================================
export const ResponsiveLayout: React.FC<{
  children: ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}> = ({ children, activeTab, onTabChange }) => {
  const { isMobile, isTablet } = useResponsive();

  return (
    <div className="min-h-screen bg-slate-50">
      <ResponsiveNav activeTab={activeTab} onTabChange={onTabChange} />
      <main className={`
        ${isMobile ? 'pb-20' : ''}
        ${isTablet ? 'ml-16' : ''}
        ${!isMobile && !isTablet ? 'ml-56' : ''}
      `}>
        {children}
      </main>
    </div>
  );
};

// ============================================================================
// RESPONSIVE GRID
// ============================================================================
export const ResponsiveGrid: React.FC<{
  children: ReactNode;
  cols?: { mobile?: number; tablet?: number; desktop?: number };
  gap?: number;
}> = ({ children, cols = { mobile: 1, tablet: 2, desktop: 4 }, gap = 4 }) => {
  const { isMobile, isTablet } = useResponsive();
  
  const colCount = isMobile ? cols.mobile : isTablet ? cols.tablet : cols.desktop;

  return (
    <div 
      className={`grid gap-${gap}`}
      style={{ gridTemplateColumns: `repeat(${colCount}, minmax(0, 1fr))` }}
    >
      {children}
    </div>
  );
};

// ============================================================================
// DEVICE PREVIEW TOGGLE (for testing)
// ============================================================================
export const DevicePreviewToggle: React.FC = () => {
  const { device, layoutMode, setLayoutMode } = useResponsive();

  return (
    <div className="fixed top-4 right-4 z-50 bg-white rounded-xl shadow-lg border border-slate-200 p-2 flex gap-1">
      <button
        onClick={() => setLayoutMode('auto')}
        className={`p-2 rounded-lg transition-colors ${layoutMode === 'auto' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
        title="Auto-detect"
      >
        <LayoutGrid size={18} />
      </button>
      <button
        onClick={() => setLayoutMode('mobile')}
        className={`p-2 rounded-lg transition-colors ${layoutMode === 'mobile' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
        title="Mobile preview"
      >
        <Smartphone size={18} />
      </button>
      <button
        onClick={() => setLayoutMode('tablet')}
        className={`p-2 rounded-lg transition-colors ${layoutMode === 'tablet' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
        title="Tablet preview"
      >
        <Tablet size={18} />
      </button>
      <button
        onClick={() => setLayoutMode('desktop')}
        className={`p-2 rounded-lg transition-colors ${layoutMode === 'desktop' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-500 hover:bg-slate-100'}`}
        title="Desktop preview"
      >
        <Monitor size={18} />
      </button>
      <div className="border-l border-slate-200 ml-1 pl-2 flex items-center">
        <span className="text-xs text-slate-500">{device}</span>
      </div>
    </div>
  );
};

// ============================================================================
// SCROLL TO TOP BUTTON (Mobile)
// ============================================================================
export const ScrollToTop: React.FC = () => {
  const { isMobile } = useResponsive();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setVisible(window.scrollY > 300);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!isMobile || !visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="fixed bottom-20 right-4 z-40 p-3 bg-indigo-600 text-white rounded-full shadow-lg active:scale-95 transition-transform"
    >
      <ArrowUp size={20} />
    </button>
  );
};

// ============================================================================
// DEMO COMPONENT
// ============================================================================
export const ResponsiveDemo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const { isMobile, isTablet, isDesktop, width } = useResponsive();

  const sampleData = [
    { facility: 'AWS Virginia', operator: 'Amazon', state: 'VA', status: 'Compliant', gap: '$12.5M' },
    { facility: 'Google Oregon', operator: 'Google', state: 'OR', status: 'Non-Compliant', gap: '$45.2M' },
    { facility: 'Meta Texas', operator: 'Meta', state: 'TX', status: 'At Risk', gap: '$8.7M' },
    { facility: 'Microsoft Iowa', operator: 'Microsoft', state: 'IA', status: 'Compliant', gap: '$3.2M' },
  ];

  const columns: TableColumn[] = [
    { key: 'facility', label: 'Facility' },
    { key: 'operator', label: 'Operator', hideOnMobile: true },
    { key: 'state', label: 'State' },
    { key: 'status', label: 'Status' },
    { key: 'gap', label: 'Gap', hideOnMobile: true },
  ];

  return (
    <ResponsiveLayout activeTab={activeTab} onTabChange={setActiveTab}>
      <DevicePreviewToggle />
      <ResponsiveHeader title="Dashboard" />
      
      <div className={`p-${isMobile ? '4' : '6'}`}>
        {/* Stats */}
        <div className={`grid gap-4 mb-6 ${
          isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-4'
        }`}>
          <ResponsiveStatCard
            label="Facilities"
            value={11992}
            change="+2.5%"
            icon={<Building2 size={isMobile ? 18 : 22} />}
            color="blue"
          />
          <ResponsiveStatCard
            label="Non-Compliant"
            value={3251}
            icon={<AlertTriangle size={isMobile ? 18 : 22} />}
            color="red"
          />
          <ResponsiveStatCard
            label="Subsidy Gap"
            value="$4.93B"
            icon={<DollarSign size={isMobile ? 18 : 22} />}
            color="purple"
          />
          {!isMobile && (
            <ResponsiveStatCard
              label="Jobs Gap"
              value={47500}
              icon={<Users size={isMobile ? 18 : 22} />}
              color="amber"
            />
          )}
        </div>

        {/* Table */}
        <h2 className={`font-semibold mb-3 ${isMobile ? 'text-lg' : 'text-xl'} text-slate-800`}>
          Recent Facilities
        </h2>
        <ResponsiveTable
          columns={columns}
          data={sampleData}
          onRowClick={(row) => console.log('Clicked:', row)}
        />

        {/* Info */}
        <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100">
          <h3 className="font-semibold text-indigo-800 mb-2">Current View</h3>
          <div className="text-sm text-indigo-600 space-y-1">
            <div>Device: <strong>{isMobile ? 'Mobile' : isTablet ? 'Tablet' : 'Desktop'}</strong></div>
            <div>Width: <strong>{width}px</strong></div>
            <div>Navigation: <strong>{isMobile ? 'Bottom bar' : isTablet ? 'Icon sidebar' : 'Full sidebar'}</strong></div>
            <div>Table: <strong>{isMobile ? 'Card list' : 'Data table'}</strong></div>
          </div>
        </div>
      </div>
      
      <ScrollToTop />
    </ResponsiveLayout>
  );
};

export default ResponsiveDemo;

