import { useState, useEffect, useCallback, startTransition } from 'react';
import { db } from '../db/database';
import { seedDatabase } from '../db/seedData';
import { Facility, ComplianceStats, TabType } from '../types';
import { calculateStats } from '../utils/stats';
import OverviewTab from './tabs/OverviewTab';
import GeographyTab from './tabs/GeographyTab';
import ProblemsTab from './tabs/ProblemsTab';
import EarlyWarningTab from './tabs/EarlyWarningTab';
import { FacilityExplorer } from './FacilityExplorer';
import { detectDashboardAction, DashboardAction } from '../utils/dashboardActions';
import { Search, Sparkles, X } from 'lucide-react';
import { AutocompleteInput } from './shared/AutocompleteInput';
import { useNLPSearchSuggestions } from '../hooks/useNLPSearchSuggestions';
import { recordSearch } from '../db/searchHistory';

export interface DashboardFilters {
  state?: string;
  operator?: string;
  complianceStatus?: Facility['complianceStatus'];
  minGap?: number;
  city?: string;
  country?: string;
}

interface DashboardProps {
  onActionRequested?: (action: DashboardAction) => void;
}

export default function Dashboard({ onActionRequested }: DashboardProps = {}) {
  const [activeTab, setActiveTab] = useState<TabType>('Overview');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [filteredFacilities, setFilteredFacilities] = useState<Facility[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<DashboardFilters>({});
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  
  // AI chat backend decommissioned 2026-08-15; endpoint must be explicitly configured.
  const WORKER_URL = (import.meta.env.VITE_CLAUDE_PROXY_URL as string | undefined) ?? '';

  const aiSuggestions = useNLPSearchSuggestions({
    context: 'ai',
    facilities,
    includeFacilities: true,
    includeOperators: true,
    includePlaces: true,
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function init() {
      try {
        // Check database health first
        const { checkDBHealth } = await import('../utils/dbHealth');
        const health = await checkDBHealth();
        
        if (!health.healthy) {
          console.warn('Database health issues detected:', health.issues);
          // Continue anyway - graceful degradation
        }

        await seedDatabase();
        
        if (abortController.signal.aborted || !isMounted) return;

        const allFacilities = await db.facilities.toArray();
        
        if (abortController.signal.aborted || !isMounted) return;

        setFacilities(allFacilities);
        setFilteredFacilities(allFacilities);
        setStats(calculateStats(allFacilities));
      } catch (error) {
        console.error('Error initializing dashboard:', error);
        // Graceful degradation: try to load what we can
        try {
          const facilities = await db.facilities.toArray();
          if (isMounted) {
            setFacilities(facilities);
            setFilteredFacilities(facilities);
            setStats(calculateStats(facilities));
          }
        } catch (fallbackError) {
          console.error('Fallback initialization also failed:', fallbackError);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  // Apply filters whenever filters or facilities change (with startTransition)
  useEffect(() => {
    let isMounted = true;

    startTransition(() => {
      let filtered = [...facilities];
      
      if (filters.state) {
        filtered = filtered.filter(f => f.state === filters.state);
      }
      if (filters.operator) {
        filtered = filtered.filter(f => f.operator === filters.operator);
      }
      if (filters.complianceStatus) {
        filtered = filtered.filter(f => f.complianceStatus === filters.complianceStatus);
      }
      if (filters.minGap !== undefined) {
        filtered = filtered.filter(f => f.subsidyGap >= filters.minGap!);
      }
      if (filters.city) {
        filtered = filtered.filter(f => f.city.toLowerCase().includes(filters.city!.toLowerCase()));
      }
      if (filters.country) {
        filtered = filtered.filter(f => f.country === filters.country);
      }
      
      if (isMounted) {
        setFilteredFacilities(filtered);
        setStats(calculateStats(filtered));
      }
    });

    return () => {
      isMounted = false;
    };
  }, [facilities, filters]);

  // Handle AI search
  const handleAiSearch = useCallback(async (query: string) => {
    setAiSearchQuery(query);
    setIsAiProcessing(true);
    recordSearch(query, 'ai');
    
    // Detect dashboard action
    const action = detectDashboardAction(query);
    
    if (action) {
      // Execute the action
      if (action.type === 'switchTab' && action.tab) {
        setActiveTab(action.tab);
      }
      if (action.type === 'filter' && action.filters) {
        setFilters(action.filters);
        if (action.tab) {
          setActiveTab(action.tab);
        }
      }
      if (action.type === 'generateReport') {
        onActionRequested?.({ type: 'generateReport' });
      }
    }
    
    // Also get AI response for context
    try {
      const all = await db.facilities.toArray();
      const byState: Record<string, any> = {};
      const byOp: Record<string, any> = {};
      
      all.forEach(f => {
        if (!byState[f.state]) byState[f.state] = { count: 0, gap: 0, comp: 0, nonComp: 0 };
        if (!byOp[f.operator]) byOp[f.operator] = { count: 0, gap: 0, comp: 0, nonComp: 0 };
        
        byState[f.state].count++; byState[f.state].gap += f.subsidyGap;
        byOp[f.operator].count++; byOp[f.operator].gap += f.subsidyGap;
        
        if (f.complianceStatus === 'Compliant') {
          byState[f.state].comp++; byOp[f.operator].comp++;
        } else if (f.complianceStatus === 'Non-Compliant') {
          byState[f.state].nonComp++; byOp[f.operator].nonComp++;
        }
      });
      
      const data = JSON.stringify({
        total: all.length,
        states: Object.entries(byState).sort((a: any, b: any) => b[1].gap - a[1].gap),
        operators: Object.entries(byOp).sort((a: any, b: any) => b[1].gap - a[1].gap),
        currentFilters: filters,
        currentTab: activeTab,
      });
      
      if (!WORKER_URL) {
        throw new Error('AI chat is not configured — no backend endpoint is set.');
      }
      const r = await fetch(WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1024,
          system: `You are a compliance dashboard assistant. The user is querying the dashboard. Current tab: ${activeTab}, Current filters: ${JSON.stringify(filters)}. Data: ${data}. Provide a brief response confirming the action taken.`,
          messages: [{ role: 'user', content: query }]
        })
      });
      const j = await r.json();
      const response = j.content?.[0]?.text || '';
      console.log('AI Response:', response);
    } catch (error) {
      console.error('Error calling AI:', error);
    } finally {
      setIsAiProcessing(false);
    }
  }, [filters, activeTab, onActionRequested]);

  const clearFilters = useCallback(() => {
    setFilters({});
    setFilteredFacilities(facilities);
    setStats(calculateStats(facilities));
  }, [facilities]);

  const tabs: TabType[] = ['Overview', 'Geography', 'Problems', 'Early Warning', 'Explorer'];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-900 text-white">
        <div className="text-xl">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-900 text-white flex flex-col">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-2xl font-bold">DCIM Compliance Dashboard</h1>
            <p className="text-gray-400 text-sm mt-1">
              {stats?.totalFacilities.toLocaleString()} facilities monitored
              {Object.keys(filters).length > 0 && (
                <span className="ml-2 text-blue-400">
                  ({filteredFacilities.length} filtered)
                </span>
              )}
            </p>
          </div>
        </div>
        
        {/* AI Search Bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 relative">
            <AutocompleteInput
              value={aiSearchQuery}
              onChange={setAiSearchQuery}
              options={aiSuggestions}
              placeholder="Ask AI: “show non-compliant in TX”, “operator Equinix”, “gap over $10M”…"
              disabled={isAiProcessing}
              icon={<Search className="w-4 h-4" />}
              loading={isAiProcessing}
              minChars={2}
              maxSuggestions={10}
              id="dashboard-ai-search"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && aiSearchQuery.trim()) {
                  handleAiSearch(aiSearchQuery.trim());
                }
              }}
            />
            {isAiProcessing && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              </div>
            )}
          </div>
          <button
            onClick={() => aiSearchQuery.trim() && handleAiSearch(aiSearchQuery.trim())}
            disabled={!aiSearchQuery.trim() || isAiProcessing}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded-md flex items-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            <span>AI Search</span>
          </button>
          {Object.keys(filters).length > 0 && (
            <button
              onClick={clearFilters}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-md transition-colors text-sm"
            >
              Clear Filters
            </button>
          )}
        </div>
        
        {/* Active Filters Display */}
        {Object.keys(filters).length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {filters.state && (
              <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs flex items-center gap-1">
                State: {filters.state}
                <button onClick={() => setFilters({...filters, state: undefined})} className="hover:text-blue-400"><X size={14} /></button>
              </span>
            )}
            {filters.operator && (
              <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs flex items-center gap-1">
                Operator: {filters.operator}
                <button onClick={() => setFilters({...filters, operator: undefined})} className="hover:text-blue-400"><X size={14} /></button>
              </span>
            )}
            {filters.complianceStatus && (
              <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs flex items-center gap-1">
                Status: {filters.complianceStatus}
                <button onClick={() => setFilters({...filters, complianceStatus: undefined})} className="hover:text-blue-400"><X size={14} /></button>
              </span>
            )}
            {filters.minGap && (
              <span className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs flex items-center gap-1">
                Min Gap: ${(filters.minGap / 1000000).toFixed(1)}M
                <button onClick={() => setFilters({...filters, minGap: undefined})} className="hover:text-blue-400"><X size={14} /></button>
              </span>
            )}
          </div>
        )}
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-gray-800 border-b border-gray-700">
        <div className="flex space-x-1 px-6">
          {tabs.map((tab) => {
            const isActive = activeTab === tab;
            const tabClasses = isActive
              ? 'px-6 py-3 font-medium transition-colors bg-gray-700 text-white border-b-2 border-blue-500'
              : 'px-6 py-3 font-medium transition-colors text-gray-400 hover:text-white hover:bg-gray-700';
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={tabClasses}
              >
                {tab}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Tab Content */}
      <main className="flex-1 overflow-auto">
        {activeTab === 'Overview' && <OverviewTab facilities={filteredFacilities} stats={stats!} />}
        {activeTab === 'Geography' && <GeographyTab facilities={filteredFacilities} />}
        {activeTab === 'Problems' && <ProblemsTab facilities={filteredFacilities} />}
        {activeTab === 'Early Warning' && <EarlyWarningTab facilities={filteredFacilities} />}
        {activeTab === 'Explorer' && (
          <div className="p-6 h-full">
            <FacilityExplorer facilities={filteredFacilities} />
          </div>
        )}
      </main>
    </div>
  );
}

