import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Search, 
  Filter, 
  Grid3x3, 
  Columns,
  Command,
  ChevronRight,
  X,
  MapPin,
  TrendingUp,
  Clock,
  Save,
  Trash2,
  BarChart3,
  Link2
} from 'lucide-react';
import { db } from '../db/database';
import { Facility } from '../types';

interface PaneConfig {
  id: string;
  title: string;
  size: number;
  pinned: boolean;
  visible: boolean;
}

interface QuickFilters {
  status: string;
  region: string;
  compliance: string;
  search: string;
}

interface SavedFilterPreset {
  id: string;
  name: string;
  filters: QuickFilters;
  timestamp: number;
}

export const MissionControlGrid: React.FC = () => {
  const [layoutMode, setLayoutMode] = useState<'single' | 'dual' | 'quad'>('dual');
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [breadcrumbs, setBreadcrumbs] = useState(['Dashboard', 'Overview']);
  const [quickFilters, setQuickFilters] = useState<QuickFilters>({
    status: 'all',
    region: 'all',
    compliance: 'all',
    search: ''
  });
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [savedPresets, setSavedPresets] = useState<SavedFilterPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [syncScroll, setSyncScroll] = useState(true);
  const scrollRef1 = useRef<HTMLDivElement>(null);
  const scrollRef2 = useRef<HTMLDivElement>(null);

  // Debug log
  useEffect(() => {
    console.log('🚀 Mission Control Grid mounted!');
    console.log('Facilities loaded:', facilities.length);
  }, [facilities]);

  // Load facilities from database
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const data = await db.facilities.toArray();
        setFacilities(data);
      } catch (error) {
        console.error('Error loading facilities:', error);
      }
    };
    loadFacilities();
  }, []);

  // Load saved filter presets from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mcg-filter-presets');
    if (saved) {
      try {
        setSavedPresets(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading presets:', e);
      }
    }
  }, []);

  // Save presets to localStorage
  const savePresets = useCallback((presets: SavedFilterPreset[]) => {
    localStorage.setItem('mcg-filter-presets', JSON.stringify(presets));
    setSavedPresets(presets);
  }, []);

  // Synchronized scrolling for dual pane
  const handleScroll1 = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncScroll && scrollRef2.current) {
      scrollRef2.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, [syncScroll]);

  const handleScroll2 = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncScroll && scrollRef1.current) {
      scrollRef1.current.scrollTop = e.currentTarget.scrollTop;
    }
  }, [syncScroll]);

  // Filter facilities based on quick filters
  const filteredFacilities = useMemo(() => {
    return facilities.filter(facility => {
      // Search filter
      if (quickFilters.search) {
        const searchLower = quickFilters.search.toLowerCase();
        const matchesSearch = 
          facility.name?.toLowerCase().includes(searchLower) ||
          facility.operator?.toLowerCase().includes(searchLower) ||
          facility.city?.toLowerCase().includes(searchLower) ||
          facility.state?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (quickFilters.status !== 'all') {
        // We can't filter by status field since Facility doesn't have it
        // Skip this filter for now
      }

      // Region filter
      if (quickFilters.region !== 'all') {
        const state = facility.state?.toLowerCase();
        if (quickFilters.region === 'northeast' && !['ny', 'nj', 'pa', 'ma', 'ct', 'ri', 'vt', 'nh', 'me'].includes(state || '')) return false;
        if (quickFilters.region === 'midwest' && !['il', 'in', 'mi', 'oh', 'wi', 'ia', 'ks', 'mn', 'mo', 'ne', 'nd', 'sd'].includes(state || '')) return false;
        if (quickFilters.region === 'south' && !['tx', 'fl', 'ga', 'nc', 'va', 'tn', 'la', 'sc', 'al', 'ky', 'ok', 'ar', 'ms', 'wv', 'md', 'de', 'dc'].includes(state || '')) return false;
        if (quickFilters.region === 'west' && !['ca', 'wa', 'or', 'az', 'nv', 'co', 'ut', 'nm', 'id', 'mt', 'wy', 'ak', 'hi'].includes(state || '')) return false;
      }

      // Compliance filter
      if (quickFilters.compliance !== 'all') {
        const jobsPromised = facility.jobsPromised || 0;
        const jobsCreated = facility.jobsCreated || 0;
        const complianceRate = jobsPromised > 0 ? jobsCreated / jobsPromised : 1;
        
        if (quickFilters.compliance === 'compliant' && complianceRate < 0.9) return false;
        if (quickFilters.compliance === 'non-compliant' && complianceRate >= 0.5) return false;
        if (quickFilters.compliance === 'review' && (complianceRate < 0.5 || complianceRate >= 0.9)) return false;
      }

      return true;
    });
  }, [facilities, quickFilters]);

  // Command palette commands
  const commands = useMemo(() => [
    { 
      id: 'nav-overview', 
      label: 'Go to Overview', 
      icon: '📊', 
      action: () => {
        setBreadcrumbs(['Dashboard', 'Overview']);
        setLayoutMode('dual');
      }
    },
    { 
      id: 'nav-facilities', 
      label: 'Go to Facilities List', 
      icon: '🏢', 
      action: () => {
        setBreadcrumbs(['Dashboard', 'Facilities']);
        setLayoutMode('single');
      }
    },
    { 
      id: 'nav-map', 
      label: 'Go to Geographic View', 
      icon: '🗺️', 
      action: () => {
        setBreadcrumbs(['Dashboard', 'Geographic View']);
        setLayoutMode('quad');
      }
    },
    { 
      id: 'filter-noncompliant', 
      label: 'Filter: Non-compliant Only', 
      icon: '🔴', 
      action: () => setQuickFilters(prev => ({ ...prev, compliance: 'non-compliant' })) 
    },
    { 
      id: 'filter-review', 
      label: 'Filter: Under Review', 
      icon: '🟡', 
      action: () => setQuickFilters(prev => ({ ...prev, compliance: 'review' })) 
    },
    { 
      id: 'filter-compliant', 
      label: 'Filter: Compliant Only', 
      icon: '🟢', 
      action: () => setQuickFilters(prev => ({ ...prev, compliance: 'compliant' })) 
    },
    { 
      id: 'layout-single', 
      label: 'Layout: Single Pane', 
      icon: '▢', 
      action: () => setLayoutMode('single') 
    },
    { 
      id: 'layout-dual', 
      label: 'Layout: Dual Pane', 
      icon: '▢▢', 
      action: () => setLayoutMode('dual') 
    },
    { 
      id: 'layout-quad', 
      label: 'Layout: Quad View', 
      icon: '▢▢▢▢', 
      action: () => setLayoutMode('quad') 
    },
    {
      id: 'toggle-sync-scroll',
      label: `Sync Scroll: ${syncScroll ? 'ON' : 'OFF'}`,
      icon: '🔗',
      action: () => setSyncScroll(prev => !prev)
    },
    {
      id: 'clear-filters',
      label: 'Clear All Filters',
      icon: '🧹',
      action: () => setQuickFilters({ status: 'all', region: 'all', compliance: 'all', search: '' })
    }
  ], [syncScroll]);

  const [commandSearch, setCommandSearch] = useState('');
  const filteredCommands = useMemo(() => {
    if (!commandSearch) return commands;
    return commands.filter(cmd => 
      cmd.label.toLowerCase().includes(commandSearch.toLowerCase())
    );
  }, [commands, commandSearch]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(prev => !prev);
      }
      if (e.key === 'Escape') {
        setCommandPaletteOpen(false);
        setShowPresets(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const saveCurrentAsPreset = useCallback(() => {
    const name = prompt('Enter preset name:');
    if (!name) return;
    
    const newPreset: SavedFilterPreset = {
      id: Date.now().toString(),
      name,
      filters: { ...quickFilters },
      timestamp: Date.now()
    };
    
    savePresets([...savedPresets, newPreset]);
  }, [quickFilters, savedPresets, savePresets]);

  const loadPreset = useCallback((preset: SavedFilterPreset) => {
    setQuickFilters(preset.filters);
    setShowPresets(false);
  }, []);

  const deletePreset = useCallback((presetId: string) => {
    savePresets(savedPresets.filter(p => p.id !== presetId));
  }, [savedPresets, savePresets]);

  return (
    <div className="h-screen w-full bg-[#0a0e17] text-[#e8eef6] flex flex-col overflow-auto">
      {/* TEMPORARY BANNER - CONFIRM NEW ARCHITECTURE IS LOADING */}
      <div style={{
        background: 'linear-gradient(90deg, #00d2d3, #00ff88)',
        padding: '20px',
        textAlign: 'center',
        fontSize: '32px',
        fontWeight: 'bold',
        color: '#000',
        borderBottom: '4px solid #00ff88'
      }}>
        🚀 MISSION CONTROL GRID IS ACTIVE 🚀
      </div>
      
      {/* Top Control Bar */}
      <div className="h-12 bg-[#0d1219] border-b border-[#1a2332] flex items-center justify-between px-4 flex-shrink-0">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-sm">
          {breadcrumbs.map((crumb, i) => (
            <React.Fragment key={i}>
              <button className="text-[#5a6d8a] hover:text-[#00d2d3] transition-colors">
                {crumb}
              </button>
              {i < breadcrumbs.length - 1 && (
                <ChevronRight size={14} className="text-[#5a6d8a]" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-3">
          {/* Layout Mode Toggle */}
          <div className="flex items-center gap-1 bg-[#0a0e17] rounded-md p-1">
            <button
              onClick={() => setLayoutMode('single')}
              className={`p-1.5 rounded transition-colors ${
                layoutMode === 'single' ? 'bg-[#00d2d3] text-[#0a0e17]' : 'text-[#5a6d8a] hover:text-[#e8eef6]'
              }`}
              title="Single Pane"
            >
              <Maximize2 size={16} />
            </button>
            <button
              onClick={() => setLayoutMode('dual')}
              className={`p-1.5 rounded transition-colors ${
                layoutMode === 'dual' ? 'bg-[#00d2d3] text-[#0a0e17]' : 'text-[#5a6d8a] hover:text-[#e8eef6]'
              }`}
              title="Dual Pane"
            >
              <Columns size={16} />
            </button>
            <button
              onClick={() => setLayoutMode('quad')}
              className={`p-1.5 rounded transition-colors ${
                layoutMode === 'quad' ? 'bg-[#00d2d3] text-[#0a0e17]' : 'text-[#5a6d8a] hover:text-[#e8eef6]'
              }`}
              title="Quad Pane"
            >
              <Grid3x3 size={16} />
            </button>
          </div>

          {/* Sync Scroll Toggle (for dual mode) */}
          {layoutMode === 'dual' && (
            <button
              onClick={() => setSyncScroll(!syncScroll)}
              className={`p-1.5 rounded transition-colors ${
                syncScroll ? 'text-[#00d2d3]' : 'text-[#5a6d8a]'
              }`}
              title={`Synchronized Scrolling: ${syncScroll ? 'ON' : 'OFF'}`}
            >
              <Link2 size={16} />
            </button>
          )}

          {/* Command Palette Trigger */}
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#0a0e17] border border-[#1a2332] rounded-md text-[#5a6d8a] hover:border-[#00d2d3] hover:text-[#00d2d3] transition-colors text-sm"
          >
            <Command size={14} />
            <span>Quick Nav</span>
            <kbd className="px-1.5 py-0.5 bg-[#0d1219] border border-[#1a2332] rounded text-xs">
              ⌘K
            </kbd>
          </button>
        </div>
      </div>

      {/* Quick Filters Bar */}
      <div className="min-h-[40px] bg-[#0d1219] border-b border-[#1a2332] flex items-center gap-3 px-4 flex-shrink-0 flex-wrap py-2">
        <Filter size={14} className="text-[#5a6d8a]" />
        
        {/* Search Input */}
        <div className="flex items-center gap-2 bg-[#0a0e17] border border-[#1a2332] rounded px-2 py-1 flex-1 min-w-[200px] max-w-[300px]">
          <Search size={14} className="text-[#5a6d8a]" />
          <input
            type="text"
            value={quickFilters.search}
            onChange={(e) => setQuickFilters(prev => ({ ...prev, search: e.target.value }))}
            placeholder="Search facilities..."
            className="bg-transparent text-xs text-[#e8eef6] outline-none flex-1"
          />
        </div>

        <select
          value={quickFilters.status}
          onChange={(e) => setQuickFilters(prev => ({ ...prev, status: e.target.value }))}
          className="bg-[#0a0e17] border border-[#1a2332] rounded px-2 py-1 text-xs text-[#e8eef6] focus:border-[#00d2d3] outline-none"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={quickFilters.region}
          onChange={(e) => setQuickFilters(prev => ({ ...prev, region: e.target.value }))}
          className="bg-[#0a0e17] border border-[#1a2332] rounded px-2 py-1 text-xs text-[#e8eef6] focus:border-[#00d2d3] outline-none"
        >
          <option value="all">All Regions</option>
          <option value="northeast">Northeast</option>
          <option value="midwest">Midwest</option>
          <option value="south">South</option>
          <option value="west">West</option>
        </select>

        <select
          value={quickFilters.compliance}
          onChange={(e) => setQuickFilters(prev => ({ ...prev, compliance: e.target.value }))}
          className="bg-[#0a0e17] border border-[#1a2332] rounded px-2 py-1 text-xs text-[#e8eef6] focus:border-[#00d2d3] outline-none"
        >
          <option value="all">All Compliance</option>
          <option value="compliant">Compliant</option>
          <option value="non-compliant">Non-compliant</option>
          <option value="review">Under Review</option>
        </select>

        {/* Preset Actions */}
        <div className="relative ml-auto flex items-center gap-2">
          <button
            onClick={saveCurrentAsPreset}
            className="flex items-center gap-1.5 px-2 py-1 bg-[#0a0e17] border border-[#1a2332] rounded text-xs text-[#5a6d8a] hover:border-[#00d2d3] hover:text-[#00d2d3] transition-colors"
            title="Save current filters as preset"
          >
            <Save size={14} />
            Save
          </button>
          <button
            onClick={() => setShowPresets(!showPresets)}
            className="px-2 py-1 bg-[#0a0e17] border border-[#1a2332] rounded text-xs text-[#5a6d8a] hover:border-[#00d2d3] hover:text-[#00d2d3] transition-colors"
          >
            Presets ({savedPresets.length})
          </button>
          <button
            onClick={() => setQuickFilters({ status: 'all', region: 'all', compliance: 'all', search: '' })}
            className="text-xs text-[#5a6d8a] hover:text-[#00d2d3] transition-colors"
          >
            Clear
          </button>

          {/* Presets Dropdown */}
          {showPresets && (
            <div className="absolute top-full right-0 mt-2 w-72 bg-[#0d1219] border border-[#1a2332] rounded-lg shadow-2xl z-50">
              <div className="p-3 border-b border-[#1a2332]">
                <div className="text-sm font-semibold text-[#e8eef6]">Saved Filter Presets</div>
              </div>
              <div className="max-h-64 overflow-auto">
                {savedPresets.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[#5a6d8a]">
                    No saved presets yet
                  </div>
                ) : (
                  savedPresets.map(preset => (
                    <div
                      key={preset.id}
                      className="p-3 border-b border-[#1a2332] hover:bg-[#0a0e17] transition-colors flex items-center justify-between group"
                    >
                      <button
                        onClick={() => loadPreset(preset)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm text-[#e8eef6]">{preset.name}</div>
                        <div className="text-xs text-[#5a6d8a] mt-0.5">
                          {new Date(preset.timestamp).toLocaleDateString()}
                        </div>
                      </button>
                      <button
                        onClick={() => deletePreset(preset.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 text-[#ff4757] hover:bg-[#ff4757]/10 rounded transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Count */}
      <div className="h-8 bg-[#0a0e17] border-b border-[#1a2332] flex items-center px-4 text-xs text-[#5a6d8a]">
        Showing {filteredFacilities.length} of {facilities.length} facilities
      </div>

      {/* Main Content Grid */}
      <div className="flex-1 overflow-auto min-h-0">
        {layoutMode === 'single' && (
          <div className="w-full h-full p-4 overflow-auto">
            <DenseDataView 
              facilities={filteredFacilities}
              onSelectFacility={setSelectedFacility}
            />
          </div>
        )}

        {layoutMode === 'dual' && (
          <div className="w-full h-full flex">
            <div 
              ref={scrollRef1}
              onScroll={handleScroll1}
              className="flex-[60] p-4 overflow-auto border-r border-[#1a2332]"
            >
              <DenseDataView 
                facilities={filteredFacilities}
                onSelectFacility={setSelectedFacility}
                selectedId={selectedFacility?.id}
              />
            </div>
            <div 
              ref={scrollRef2}
              onScroll={handleScroll2}
              className="flex-[40] p-4 overflow-auto"
            >
              <DetailPanel facility={selectedFacility} />
            </div>
          </div>
        )}

        {layoutMode === 'quad' && (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2">
            <div className="p-4 overflow-auto border-r border-b border-[#1a2332]">
              <DenseDataView 
                facilities={filteredFacilities}
                onSelectFacility={setSelectedFacility}
                selectedId={selectedFacility?.id}
              />
            </div>
            <div className="p-4 overflow-auto border-b border-[#1a2332]">
              <DetailPanel facility={selectedFacility} />
            </div>
            <div className="p-4 overflow-auto border-r border-[#1a2332]">
              <MiniMapView facilities={filteredFacilities} />
            </div>
            <div className="p-4 overflow-auto">
              <TimelineView facility={selectedFacility} />
            </div>
          </div>
        )}
      </div>

      {/* Command Palette Modal */}
      {commandPaletteOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-32 z-50">
          <div className="w-full max-w-2xl bg-[#0d1219] border border-[#1a2332] rounded-lg shadow-2xl overflow-hidden">
            {/* Search Input */}
            <div className="p-4 border-b border-[#1a2332]">
              <div className="flex items-center gap-3 bg-[#0a0e17] px-4 py-3 rounded-md">
                <Search size={18} className="text-[#5a6d8a]" />
                <input
                  type="text"
                  value={commandSearch}
                  onChange={(e) => setCommandSearch(e.target.value)}
                  placeholder="Type a command or search..."
                  className="flex-1 bg-transparent outline-none text-[#e8eef6] placeholder-[#5a6d8a]"
                  autoFocus
                />
                <button
                  onClick={() => setCommandPaletteOpen(false)}
                  className="text-[#5a6d8a] hover:text-[#e8eef6]"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Commands List */}
            <div className="max-h-96 overflow-auto p-2">
              {filteredCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  onClick={() => {
                    cmd.action();
                    setCommandPaletteOpen(false);
                    setCommandSearch('');
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-md hover:bg-[#0a0e17] transition-colors text-left group"
                >
                  <span className="text-2xl">{cmd.icon}</span>
                  <span className="flex-1 text-[#e8eef6] group-hover:text-[#00d2d3]">
                    {cmd.label}
                  </span>
                  <ChevronRight size={16} className="text-[#5a6d8a] opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
              {filteredCommands.length === 0 && (
                <div className="text-center py-8 text-[#5a6d8a]">
                  No commands found
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Dense Data View Component
interface DenseDataViewProps {
  facilities: Facility[];
  onSelectFacility: (facility: Facility) => void;
  selectedId?: number;
}

const DenseDataView: React.FC<DenseDataViewProps> = ({ facilities, onSelectFacility, selectedId }) => {
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());

  const toggleCard = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getComplianceStatus = (facility: Facility) => {
    const promised = facility.jobsPromised || 0;
    const created = facility.jobsCreated || 0;
    if (promised === 0) return { status: 'unknown', rate: 0 };
    const rate = created / promised;
    if (rate >= 0.9) return { status: 'compliant', rate };
    if (rate >= 0.5) return { status: 'review', rate };
    return { status: 'non-compliant', rate };
  };

  return (
    <div className="space-y-2">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <span className="text-[#00d2d3]">{'█'}</span> 
        Facility Compliance Overview
      </h2>

      {facilities.length === 0 && (
        <div className="bg-[#0d1219] border border-[#1a2332] rounded-lg p-8 text-center">
          <div className="text-[#5a6d8a]">No facilities match the current filters</div>
        </div>
      )}

      {facilities.map((facility) => {
        const compliance = getComplianceStatus(facility);
        const subsidyGap = facility.subsidyGap || 0;
        
        return (
          <div
            key={facility.id}
            className={`bg-[#0d1219] border rounded-lg overflow-hidden transition-all ${
              selectedId === facility.id 
                ? 'border-[#00d2d3] shadow-lg shadow-[#00d2d3]/20' 
                : 'border-[#1a2332] hover:border-[#00d2d3]'
            }`}
          >
            {/* Collapsed View */}
            <button
              onClick={() => {
                toggleCard(facility.id!.toString());
                onSelectFacility(facility);
              }}
              className="w-full p-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className={`w-2 h-2 rounded-full ${
                  compliance.status === 'compliant' ? 'bg-[#2ed573]' :
                  compliance.status === 'non-compliant' ? 'bg-[#ff4757]' :
                  compliance.status === 'review' ? 'bg-[#ffa502]' :
                  'bg-[#5a6d8a]'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-[#e8eef6] truncate">{facility.name}</div>
                  <div className="text-xs text-[#5a6d8a] mt-0.5 flex items-center gap-2">
                    <MapPin size={10} className="inline" />
                    {facility.city}, {facility.state}
                    {facility.operator && (
                      <>
                        {' · '}
                        {facility.operator}
                      </>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <div className="text-[#5a6d8a] text-xs">Jobs</div>
                    <div className="font-semibold text-[#e8eef6]">
                      {facility.jobsCreated || 0} / {facility.jobsPromised || 0}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#5a6d8a] text-xs">Compliance</div>
                    <div className={`font-semibold ${
                      compliance.status === 'compliant' ? 'text-[#2ed573]' :
                      compliance.status === 'non-compliant' ? 'text-[#ff4757]' :
                      compliance.status === 'review' ? 'text-[#ffa502]' :
                      'text-[#5a6d8a]'
                    }`}>
                      {(compliance.rate * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[#5a6d8a] text-xs">Gap</div>
                    <div className="font-semibold text-[#ff4757]">
                      ${(subsidyGap / 1000000).toFixed(1)}M
                    </div>
                  </div>
                </div>
              </div>
              <div className="ml-4">
                {expandedCards.has(facility.id!.toString()) ? (
                  <Minimize2 size={16} className="text-[#5a6d8a]" />
                ) : (
                  <Maximize2 size={16} className="text-[#5a6d8a]" />
                )}
              </div>
            </button>

            {/* Expanded View */}
            {expandedCards.has(facility.id!.toString()) && (
              <div className="px-3 pb-3 pt-0 border-t border-[#1a2332]">
                <div className="grid grid-cols-4 gap-4 mt-3">
                  <div className="bg-[#0a0e17] rounded p-3">
                    <div className="text-xs text-[#5a6d8a] mb-1">Jobs Promised</div>
                    <div className="text-lg font-bold text-[#e8eef6]">{facility.jobsPromised || 0}</div>
                  </div>
                  <div className="bg-[#0a0e17] rounded p-3">
                    <div className="text-xs text-[#5a6d8a] mb-1">Jobs Created</div>
                    <div className="text-lg font-bold text-[#2ed573]">{facility.jobsCreated || 0}</div>
                  </div>
                  <div className="bg-[#0a0e17] rounded p-3">
                    <div className="text-xs text-[#5a6d8a] mb-1">Shortfall</div>
                    <div className="text-lg font-bold text-[#ff4757]">
                      {(facility.jobsPromised || 0) - (facility.jobsCreated || 0)}
                    </div>
                  </div>
                  <div className="bg-[#0a0e17] rounded p-3">
                    <div className="text-xs text-[#5a6d8a] mb-1">Subsidy Gap</div>
                    <div className="text-lg font-bold text-[#ff4757]">
                      ${(subsidyGap / 1000000).toFixed(1)}M
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Detail Panel
interface DetailPanelProps {
  facility: Facility | null;
}

const DetailPanel: React.FC<DetailPanelProps> = ({ facility }) => {
  if (!facility) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-[#00d2d3]">{'█'}</span> 
          Facility Details
        </h2>
        <div className="bg-[#0d1219] border border-[#1a2332] rounded-lg p-8 text-center">
          <div className="text-[#5a6d8a] text-sm">
            Select a facility to view detailed compliance metrics, timeline, and documentation.
          </div>
        </div>
      </div>
    );
  }

  const promised = facility.jobsPromised || 0;
  const created = facility.jobsCreated || 0;
  const rate = promised > 0 ? created / promised : 0;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <span className="text-[#00d2d3]">{'█'}</span> 
        {facility.name}
      </h2>

      {/* Key Metrics */}
      <div className="bg-[#0d1219] border border-[#1a2332] rounded-lg p-4">
        <div className="text-sm font-semibold text-[#e8eef6] mb-3">Key Metrics</div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-[#5a6d8a]">Operator</span>
            <span className="text-xs text-[#e8eef6] font-medium">{facility.operator || 'Unknown'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-[#5a6d8a]">Location</span>
            <span className="text-xs text-[#e8eef6] font-medium">{facility.city}, {facility.state}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-[#5a6d8a]">Compliance</span>
            <span className="text-xs text-[#e8eef6] font-medium">{facility.complianceStatus}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-[#5a6d8a]">Compliance Rate</span>
            <span className={`text-xs font-medium ${
              rate >= 0.9 ? 'text-[#2ed573]' :
              rate >= 0.5 ? 'text-[#ffa502]' :
              'text-[#ff4757]'
            }`}>
              {(rate * 100).toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Jobs Analysis */}
      <div className="bg-[#0d1219] border border-[#1a2332] rounded-lg p-4">
        <div className="text-sm font-semibold text-[#e8eef6] mb-3 flex items-center gap-2">
          <TrendingUp size={14} className="text-[#00d2d3]" />
          Jobs Analysis
        </div>
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-[#0a0e17] rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  rate >= 0.9 ? 'bg-[#2ed573]' :
                  rate >= 0.5 ? 'bg-[#ffa502]' :
                  'bg-[#ff4757]'
                }`}
                style={{ width: `${rate * 100}%` }}
              />
            </div>
            <span className="text-xs text-[#5a6d8a] w-12 text-right">
              {(rate * 100).toFixed(0)}%
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="bg-[#0a0e17] rounded p-2">
              <div className="text-[10px] text-[#5a6d8a] mb-0.5">Promised</div>
              <div className="text-sm font-bold text-[#e8eef6]">{promised}</div>
            </div>
            <div className="bg-[#0a0e17] rounded p-2">
              <div className="text-[10px] text-[#5a6d8a] mb-0.5">Created</div>
              <div className="text-sm font-bold text-[#2ed573]">{created}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Financial Impact */}
      <div className="bg-[#0d1219] border border-[#1a2332] rounded-lg p-4">
        <div className="text-sm font-semibold text-[#e8eef6] mb-3 flex items-center gap-2">
          <BarChart3 size={14} className="text-[#00d2d3]" />
          Financial Impact
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-[#5a6d8a]">Subsidy Gap</span>
            <span className="text-xs text-[#ff4757] font-medium">
              ${(facility.subsidyGap / 1000000).toFixed(2)}M
            </span>
          </div>
          {facility.taxIncentives && (
            <div className="flex justify-between">
              <span className="text-xs text-[#5a6d8a]">Tax Incentives</span>
              <span className="text-xs text-[#e8eef6] font-medium">
                ${(facility.taxIncentives / 1000000).toFixed(2)}M
              </span>
            </div>
          )}
          {promised > 0 && facility.taxIncentives && (
            <div className="flex justify-between">
              <span className="text-xs text-[#5a6d8a]">Per Job (Promised)</span>
              <span className="text-xs text-[#e8eef6] font-medium">
                ${(facility.taxIncentives / promised).toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Mini Map View
interface MiniMapViewProps {
  facilities: Facility[];
}

const MiniMapView: React.FC<MiniMapViewProps> = ({ facilities }) => {
  const stateData = useMemo(() => {
    const data: Record<string, { count: number; compliant: number; gap: number }> = {};
    facilities.forEach(f => {
      const state = f.state;
      if (!state) return;
      if (!data[state]) {
        data[state] = { count: 0, compliant: 0, gap: 0 };
      }
      data[state].count++;
      const rate = (f.jobsPromised || 0) > 0 ? (f.jobsCreated || 0) / (f.jobsPromised || 0) : 0;
      if (rate >= 0.9) data[state].compliant++;
      data[state].gap += f.subsidyGap || 0;
    });
    return Object.entries(data)
      .map(([state, stats]) => ({ state, ...stats }))
      .sort((a, b) => b.gap - a.gap);
  }, [facilities]);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <span className="text-[#00d2d3]">{'█'}</span> 
        Geographic Analysis
      </h2>
      <div className="bg-[#0d1219] border border-[#1a2332] rounded-lg overflow-hidden">
        <div className="p-3 border-b border-[#1a2332]">
          <div className="text-xs text-[#5a6d8a]">By State</div>
        </div>
        <div className="max-h-[400px] overflow-auto">
          {stateData.map(({ state, count, compliant, gap }) => (
            <div
              key={state}
              className="p-3 border-b border-[#1a2332] hover:bg-[#0a0e17] transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-[#e8eef6]">{state}</span>
                <span className="text-xs text-[#5a6d8a]">{count} facilities</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[#0a0e17] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2ed573]"
                    style={{ width: `${(compliant / count) * 100}%` }}
                  />
                </div>
                <div className="text-xs text-[#ff4757] font-medium">
                  ${(gap / 1000000).toFixed(1)}M
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// Timeline View
interface TimelineViewProps {
  facility: Facility | null;
}

const TimelineView: React.FC<TimelineViewProps> = ({ facility }) => {
  if (!facility) {
    return (
      <div className="space-y-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <span className="text-[#00d2d3]">{'█'}</span> 
          Compliance Timeline
        </h2>
        <div className="bg-[#0d1219] border border-[#1a2332] rounded-lg p-8 text-center">
          <div className="text-[#5a6d8a] text-sm">
            Select a facility to view timeline
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold flex items-center gap-2">
        <span className="text-[#00d2d3]">{'█'}</span> 
        Compliance Timeline
      </h2>
      <div className="bg-[#0d1219] border border-[#1a2332] rounded-lg p-4">
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-2 h-2 rounded-full bg-[#e8eef6]" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-[#e8eef6] font-semibold">Current Status</div>
              <div className="text-xs text-[#5a6d8a] mt-0.5">
                {facility.jobsCreated || 0} of {facility.jobsPromised || 0} jobs created
              </div>
              <div className="text-xs text-[#5a6d8a] mt-0.5">
                Compliance: {facility.complianceStatus}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
