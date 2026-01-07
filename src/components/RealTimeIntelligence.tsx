/**
 * RealTimeIntelligence.tsx
 * 
 * Pulls REAL data from actual APIs and data sources.
 * No simulations - only real intelligence from real sources.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, Globe, Shield, Server, Database, Activity,
  RefreshCw, Download, ExternalLink, AlertTriangle,
  CheckCircle, XCircle, Clock, Building, Network,
  FileText, Users, DollarSign, Loader2, Eye, Search,
  ChevronDown, ChevronRight, Maximize2, Minimize2
} from 'lucide-react';

// Import real integrations
import { secEdgarApi, BIG_TECH_CIKS as SEC_CIKS } from '../integrations/secEdgar';
import { epaEchoApi } from '../integrations/epaEcho';
import { usaSpendingApi } from '../integrations/usaSpending';
import { peeringDbApi } from '../integrations/peeringDb';
import { openCorporatesApi } from '../integrations/openCorporates';
import { db } from '../db/database';

interface RealDataSource {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  endpoint: string;
  status: 'idle' | 'loading' | 'success' | 'error';
  lastFetch: Date | null;
  data: unknown[] | null;
  error: string | null;
  realTime: boolean;
}

// Use imported CIKs from secEdgar
const BIG_TECH_CIKS = SEC_CIKS;

// Expandable Record Component for nested data display
const ExpandableRecord: React.FC<{
  id: string;
  title: string;
  subtitle?: string;
  badges?: Array<{ label: string; color: string }>;
  children: React.ReactNode;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  externalUrl?: string;
}> = ({ id, title, subtitle, badges, children, expandedIds, onToggle, externalUrl }) => {
  const isExpanded = expandedIds.has(id);
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <button
        onClick={() => onToggle(id)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
          <div className="min-w-0 flex-1">
            <div className="font-medium text-sm text-slate-800 truncate">{title}</div>
            {subtitle && <div className="text-xs text-slate-500 truncate">{subtitle}</div>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {badges?.map((badge, i) => (
            <span key={i} className={`px-1.5 py-0.5 text-xs rounded ${badge.color}`}>{badge.label}</span>
          ))}
          {externalUrl && (
            <a href={externalUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="text-emerald-500 hover:text-emerald-700 p-1">
              <ExternalLink size={12} />
            </a>
          )}
        </div>
      </button>
      {isExpanded && <div className="px-3 py-2 bg-slate-50 text-xs">{children}</div>}
    </div>
  );
};

export const RealTimeIntelligence: React.FC = () => {
  const [activeSource, setActiveSource] = useState<string>('sec');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  const [maxHeight, setMaxHeight] = useState<'300px' | '500px' | '800px'>('500px');

  const toggleRecord = (id: string) => {
    setExpandedRecords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const data = dataSources[activeSource]?.data;
    if (Array.isArray(data)) {
      data.forEach((_, i) => allIds.add(`${activeSource}-${i}`));
    }
    setExpandedRecords(allIds);
  };

  const collapseAll = () => setExpandedRecords(new Set());
  
  const [dataSources, setDataSources] = useState<Record<string, RealDataSource>>({
    sec: {
      id: 'sec',
      name: 'SEC EDGAR Filings',
      description: 'Real corporate filings about data center investments, subsidies, and job commitments',
      icon: <FileText size={20} />,
      endpoint: 'https://www.sec.gov/cgi-bin/browse-edgar',
      status: 'idle',
      lastFetch: null,
      data: null,
      error: null,
      realTime: true,
    },
    epa: {
      id: 'epa',
      name: 'EPA ECHO Compliance',
      description: 'Real environmental compliance and violation data for data center facilities',
      icon: <Shield size={20} />,
      endpoint: 'https://echo.epa.gov/api',
      status: 'idle',
      lastFetch: null,
      data: null,
      error: null,
      realTime: true,
    },
    usaspending: {
      id: 'usaspending',
      name: 'USASpending Federal Contracts',
      description: 'Real federal contracts and grants awarded to tech companies',
      icon: <DollarSign size={20} />,
      endpoint: 'https://api.usaspending.gov',
      status: 'idle',
      lastFetch: null,
      data: null,
      error: null,
      realTime: true,
    },
    peeringdb: {
      id: 'peeringdb',
      name: 'PeeringDB Network Facilities',
      description: 'Real network facility data, IX points, and peering information',
      icon: <Network size={20} />,
      endpoint: 'https://www.peeringdb.com/api',
      status: 'idle',
      lastFetch: null,
      data: null,
      error: null,
      realTime: true,
    },
    opencorporates: {
      id: 'opencorporates',
      name: 'OpenCorporates Registry',
      description: 'Real company registrations and corporate structure data',
      icon: <Building size={20} />,
      endpoint: 'https://api.opencorporates.com',
      status: 'idle',
      lastFetch: null,
      data: null,
      error: null,
      realTime: true,
    },
    facilities: {
      id: 'facilities',
      name: 'Local Facility Database',
      description: 'Your tracked data center facilities with compliance status',
      icon: <Database size={20} />,
      endpoint: 'IndexedDB (local)',
      status: 'idle',
      lastFetch: null,
      data: null,
      error: null,
      realTime: false,
    },
  });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const updateSource = (id: string, updates: Partial<RealDataSource>) => {
    setDataSources(prev => ({
      ...prev,
      [id]: { ...prev[id], ...updates }
    }));
  };

  // Fetch SEC EDGAR data
  const fetchSECData = useCallback(async (company?: string) => {
    updateSource('sec', { status: 'loading', error: null });
    try {
      const cik = company ? BIG_TECH_CIKS[company as keyof typeof BIG_TECH_CIKS] : Object.values(BIG_TECH_CIKS)[0];
      if (!cik) {
        throw new Error(`Unknown company: ${company}`);
      }
      const result = await secEdgarApi.fetchCompanyFilings(cik, ['10-K', '10-Q', '8-K']);
      console.log('SEC API returned:', result);
      updateSource('sec', { 
        status: 'success', 
        data: result || [],
        lastFetch: new Date()
      });
      showToast(`Fetched ${result?.length || 0} SEC filings for ${company || 'Apple'}`, 'success');
    } catch (error) {
      console.error('SEC API error:', error);
      updateSource('sec', { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to fetch',
        lastFetch: new Date()
      });
      showToast('SEC API error - check console', 'error');
    }
  }, []);

  // Fetch EPA ECHO data
  const fetchEPAData = useCallback(async () => {
    updateSource('epa', { status: 'loading', error: null });
    try {
      const result = await epaEchoApi.searchDataCenterFacilities('data center', 50);
      updateSource('epa', { 
        status: 'success', 
        data: result || [],
        lastFetch: new Date()
      });
      showToast(`Fetched ${result?.length || 0} EPA compliance records`, 'success');
    } catch (error) {
      updateSource('epa', { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to fetch',
        lastFetch: new Date()
      });
      showToast('EPA API error - CORS blocked, showing sample', 'error');
    }
  }, []);

  // Fetch USASpending data
  const fetchUSASpendingData = useCallback(async () => {
    updateSource('usaspending', { status: 'loading', error: null });
    try {
      const result = await usaSpendingApi.getBigTechContracts();
      updateSource('usaspending', { 
        status: 'success', 
        data: result || [],
        lastFetch: new Date()
      });
      showToast(`Fetched ${result?.length || 0} federal contracts`, 'success');
    } catch (error) {
      updateSource('usaspending', { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to fetch',
        lastFetch: new Date()
      });
      showToast('USASpending API error', 'error');
    }
  }, []);

  // Fetch PeeringDB data
  const fetchPeeringDBData = useCallback(async () => {
    updateSource('peeringdb', { status: 'loading', error: null });
    try {
      // searchFacilities expects an object, not a string
      // Fetch facilities from major data center markets
      const result = await peeringDbApi.searchFacilities({ limit: 50 });
      updateSource('peeringdb', { 
        status: 'success', 
        data: result || [],
        lastFetch: new Date()
      });
      showToast(`Fetched ${result?.length || 0} network facilities`, 'success');
    } catch (error) {
      updateSource('peeringdb', { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to fetch',
        lastFetch: new Date()
      });
      showToast('PeeringDB API error', 'error');
    }
  }, []);

  // Fetch OpenCorporates data
  const fetchOpenCorporatesData = useCallback(async (query?: string) => {
    updateSource('opencorporates', { status: 'loading', error: null });
    try {
      // searchCompanies expects an object { query: string, ... } and returns { companies: [], totalCount, ... }
      const result = await openCorporatesApi.searchCompanies({ 
        query: query || 'data center',
        currentStatus: 'active',
        limit: 50
      });
      // Extract the companies array from the result object
      const companies = result?.companies || [];
      updateSource('opencorporates', { 
        status: 'success', 
        data: companies,
        lastFetch: new Date()
      });
      showToast(`Fetched ${companies.length} company records (${result?.totalCount || 0} total available)`, 'success');
    } catch (error) {
      updateSource('opencorporates', { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to fetch',
        lastFetch: new Date()
      });
      showToast('OpenCorporates API error', 'error');
    }
  }, []);

  // Fetch local facility data
  const fetchFacilityData = useCallback(async () => {
    updateSource('facilities', { status: 'loading', error: null });
    try {
      const facilities = await db.facilities.toArray();
      updateSource('facilities', { 
        status: 'success', 
        data: facilities || [],
        lastFetch: new Date()
      });
      showToast(`Loaded ${facilities?.length || 0} tracked facilities`, 'success');
    } catch (error) {
      updateSource('facilities', { 
        status: 'error', 
        error: error instanceof Error ? error.message : 'Failed to load',
        lastFetch: new Date()
      });
    }
  }, []);

  // Fetch data for current source
  const fetchCurrentSource = useCallback(async () => {
    setIsRefreshing(true);
    switch (activeSource) {
      case 'sec':
        await fetchSECData();
        break;
      case 'epa':
        await fetchEPAData();
        break;
      case 'usaspending':
        await fetchUSASpendingData();
        break;
      case 'peeringdb':
        await fetchPeeringDBData();
        break;
      case 'opencorporates':
        await fetchOpenCorporatesData(searchQuery || undefined);
        break;
      case 'facilities':
        await fetchFacilityData();
        break;
    }
    setIsRefreshing(false);
  }, [activeSource, searchQuery, fetchSECData, fetchEPAData, fetchUSASpendingData, fetchPeeringDBData, fetchOpenCorporatesData, fetchFacilityData]);

  // Fetch all sources
  const fetchAllSources = async () => {
    setIsRefreshing(true);
    await Promise.all([
      fetchSECData(),
      fetchEPAData(),
      fetchUSASpendingData(),
      fetchPeeringDBData(),
      fetchOpenCorporatesData(),
      fetchFacilityData(),
    ]);
    setIsRefreshing(false);
    showToast('All data sources refreshed', 'success');
  };

  // Auto-fetch on mount
  useEffect(() => {
    fetchCurrentSource();
  }, []);

  const currentSource = dataSources[activeSource];

  // Export real data
  const exportData = () => {
    const exportObj = {
      timestamp: new Date().toISOString(),
      source: currentSource.name,
      endpoint: currentSource.endpoint,
      recordCount: Array.isArray(currentSource.data) ? currentSource.data.length : 0,
      data: currentSource.data,
    };
    const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `real_intel_${activeSource}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Real data exported', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[10000] p-4 rounded-lg shadow-lg flex items-center gap-3 ${
          toast.type === 'success' ? 'bg-green-600 text-white' :
          toast.type === 'error' ? 'bg-red-600 text-white' :
          'bg-blue-600 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle size={20} />}
          {toast.type === 'error' && <XCircle size={20} />}
          {toast.type === 'info' && <Activity size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-cyan-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
              <h1 className="text-2xl font-bold">🟢 REAL-TIME Intelligence Feed</h1>
            </div>
            <p className="text-white/80">
              Live data from real government APIs, public databases, and registries. <strong>No simulations.</strong>
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={fetchAllSources}
              disabled={isRefreshing}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh All
            </button>
            <button
              onClick={exportData}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg flex items-center gap-2 transition-colors"
            >
              <Download size={18} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Data Source Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {Object.values(dataSources).map(source => (
          <button
            key={source.id}
            onClick={() => {
              setActiveSource(source.id);
              if (!source.data) {
                // Auto-fetch if no data
                setTimeout(() => fetchCurrentSource(), 100);
              }
            }}
            className={`px-4 py-3 rounded-xl font-medium whitespace-nowrap transition-all flex items-center gap-2 ${
              activeSource === source.id
                ? 'bg-emerald-100 text-emerald-800 border-2 border-emerald-400 shadow-lg'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 border-2 border-transparent'
            }`}
          >
            {source.icon}
            <span>{source.name}</span>
            {source.status === 'loading' && <Loader2 size={14} className="animate-spin" />}
            {source.status === 'success' && <CheckCircle size={14} className="text-green-500" />}
            {source.status === 'error' && <XCircle size={14} className="text-red-500" />}
            {source.realTime && <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />}
          </button>
        ))}
      </div>

      {/* Search Bar (for applicable sources) */}
      {['sec', 'opencorporates'].includes(activeSource) && (
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={activeSource === 'sec' ? 'Search company (e.g., Google, Amazon, Microsoft)...' : 'Search companies...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchCurrentSource()}
              className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
          </div>
          <button
            onClick={fetchCurrentSource}
            disabled={isRefreshing}
            className="px-6 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isRefreshing ? <Loader2 size={18} className="animate-spin" /> : <Search size={18} />}
            Search
          </button>
        </div>
      )}

      {/* SEC Company Quick Select */}
      {activeSource === 'sec' && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500 py-1">Quick select:</span>
          {Object.keys(BIG_TECH_CIKS).map(company => (
            <button
              key={company}
              onClick={() => {
                setSearchQuery(company);
                fetchSECData(company);
              }}
              className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {company}
            </button>
          ))}
        </div>
      )}

      {/* OpenCorporates Quick Select */}
      {activeSource === 'opencorporates' && (
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500 py-1">Quick select:</span>
          {['Amazon', 'Google', 'Microsoft', 'Meta', 'Equinix', 'Digital Realty', 'CyrusOne', 'Apple', 'Oracle'].map(company => (
            <button
              key={company}
              onClick={() => {
                setSearchQuery(company);
                fetchOpenCorporatesData(company);
              }}
              className="px-3 py-1 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {company}
            </button>
          ))}
        </div>
      )}

      {/* Source Info & Status */}
      <div className="bg-slate-50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-xl ${
            currentSource.status === 'success' ? 'bg-green-100 text-green-600' :
            currentSource.status === 'error' ? 'bg-red-100 text-red-600' :
            currentSource.status === 'loading' ? 'bg-blue-100 text-blue-600' :
            'bg-slate-100 text-slate-600'
          }`}>
            {currentSource.icon}
          </div>
          <div>
            <h3 className="font-bold text-slate-800">{currentSource.name}</h3>
            <p className="text-sm text-slate-500">{currentSource.description}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Globe size={14} />
            <a href={currentSource.endpoint.startsWith('http') ? currentSource.endpoint : '#'} 
               target="_blank" 
               rel="noopener noreferrer"
               className="hover:text-emerald-600 flex items-center gap-1">
              {currentSource.endpoint}
              {currentSource.endpoint.startsWith('http') && <ExternalLink size={12} />}
            </a>
          </div>
          {currentSource.lastFetch && (
            <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
              <Clock size={12} />
              Last fetch: {currentSource.lastFetch.toLocaleTimeString()}
            </div>
          )}
        </div>
      </div>

      {/* Data Display */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {/* Loading State */}
        {currentSource.status === 'loading' && (
          <div className="p-12 text-center">
            <Loader2 size={48} className="animate-spin text-emerald-500 mx-auto mb-4" />
            <p className="text-slate-600">Fetching real data from {currentSource.name}...</p>
          </div>
        )}

        {/* Error State */}
        {currentSource.status === 'error' && (
          <div className="p-8 text-center">
            <AlertTriangle size={48} className="text-orange-500 mx-auto mb-4" />
            <p className="text-slate-800 font-medium mb-2">API Access Issue</p>
            <p className="text-slate-500 text-sm mb-4">{currentSource.error}</p>
            <p className="text-xs text-slate-400">
              Some government APIs require CORS proxy or have rate limits. The data shown may be cached or sample data.
            </p>
            <button
              onClick={fetchCurrentSource}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Success State - Data Tables */}
        {currentSource.status === 'success' && currentSource.data && (
          <div>
            {/* Record Count & Controls */}
            <div className="sticky top-0 bg-emerald-50 px-3 py-2 border-b border-emerald-200 flex items-center justify-between z-10">
              <div className="flex items-center gap-2">
                <span className="font-medium text-emerald-800 text-sm">
                  {Array.isArray(currentSource.data) ? currentSource.data.length : 0} Records
                </span>
                <span className="text-xs text-emerald-600">🟢 Live</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={expandAll} className="px-2 py-1 text-xs bg-emerald-100 hover:bg-emerald-200 rounded">Expand All</button>
                <button onClick={collapseAll} className="px-2 py-1 text-xs bg-slate-100 hover:bg-slate-200 rounded">Collapse All</button>
                <div className="flex gap-1 ml-2">
                  {(['300px', '500px', '800px'] as const).map(h => (
                    <button
                      key={h}
                      onClick={() => setMaxHeight(h)}
                      className={`px-1.5 py-0.5 text-xs rounded ${maxHeight === h ? 'bg-emerald-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
                    >
                      {h === '300px' ? 'S' : h === '500px' ? 'M' : 'L'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="overflow-auto" style={{ maxHeight }}>

            {/* SEC EDGAR Display */}
            {activeSource === 'sec' && Array.isArray(currentSource.data) && (
              <div>
                {currentSource.data.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No filings found. Try a different company.</div>
                ) : (
                  currentSource.data.map((filing: any, i: number) => (
                    <ExpandableRecord
                      key={i}
                      id={`sec-${i}`}
                      title={`${filing.form} - ${filing.company || 'Unknown Company'}`}
                      subtitle={filing.primaryDocDescription || 'Report'}
                      badges={[
                        { label: filing.form, color: filing.form === '10-K' ? 'bg-blue-100 text-blue-700' : filing.form === '10-Q' ? 'bg-green-100 text-green-700' : filing.form === '8-K' ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700' },
                      ]}
                      expandedIds={expandedRecords}
                      onToggle={toggleRecord}
                      externalUrl={`https://www.sec.gov/Archives/edgar/data/${filing.cik?.replace(/^0+/, '')}/${filing.accessionNumber?.replace(/-/g, '')}/${filing.primaryDocument}`}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-slate-500">Company:</span> <span className="text-slate-800">{filing.company}</span></div>
                        <div><span className="text-slate-500">Form:</span> <span className="text-slate-800">{filing.form}</span></div>
                        <div><span className="text-slate-500">Filing Date:</span> <span className="text-slate-800">{filing.filingDate}</span></div>
                        <div><span className="text-slate-500">Report Date:</span> <span className="text-slate-800">{filing.reportDate}</span></div>
                        <div><span className="text-slate-500">CIK:</span> <span className="text-slate-800">{filing.cik}</span></div>
                        <div><span className="text-slate-500">Accession:</span> <span className="text-slate-800 font-mono">{filing.accessionNumber}</span></div>
                        <div className="col-span-2"><span className="text-slate-500">Description:</span> <span className="text-slate-800">{filing.primaryDocDescription}</span></div>
                      </div>
                    </ExpandableRecord>
                  ))
                )}
              </div>
            )}

            {/* EPA ECHO Display */}
            {activeSource === 'epa' && Array.isArray(currentSource.data) && (
              <div>
                {currentSource.data.map((facility: any, i: number) => (
                  <ExpandableRecord
                    key={i}
                    id={`epa-${i}`}
                    title={facility.FacilityName || facility.name}
                    subtitle={`${facility.City}, ${facility.State}`}
                    badges={[
                      facility.CWAPermitStatus && { label: `CWA: ${facility.CWAPermitStatus}`, color: facility.CWAPermitStatus === 'Effective' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700' },
                      facility.violations && { label: `${facility.violations} Violations`, color: 'bg-red-100 text-red-700' },
                    ].filter(Boolean) as Array<{label: string; color: string}>}
                    expandedIds={expandedRecords}
                    onToggle={toggleRecord}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500">Facility:</span> <span className="text-slate-800">{facility.FacilityName || facility.name}</span></div>
                      <div><span className="text-slate-500">City:</span> <span className="text-slate-800">{facility.City}</span></div>
                      <div><span className="text-slate-500">State:</span> <span className="text-slate-800">{facility.State}</span></div>
                      <div><span className="text-slate-500">Registry ID:</span> <span className="text-slate-800">{facility.RegistryID || facility.id}</span></div>
                      <div><span className="text-slate-500">CWA Status:</span> <span className="text-slate-800">{facility.CWAPermitStatus || 'N/A'}</span></div>
                      <div><span className="text-slate-500">Violations:</span> <span className="text-slate-800">{facility.violations || 0}</span></div>
                    </div>
                  </ExpandableRecord>
                ))}
              </div>
            )}

            {/* USASpending Display */}
            {activeSource === 'usaspending' && Array.isArray(currentSource.data) && (
              <div>
                {currentSource.data.map((contract: any, i: number) => (
                  <ExpandableRecord
                    key={i}
                    id={`usaspending-${i}`}
                    title={contract.recipient_name || contract.Recipient}
                    subtitle={contract.awarding_agency_name || contract.Agency}
                    badges={[
                      { label: `$${((contract.total_obligation || contract.Amount || 0) / 1000000).toFixed(1)}M`, color: 'bg-emerald-100 text-emerald-700' },
                    ]}
                    expandedIds={expandedRecords}
                    onToggle={toggleRecord}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500">Recipient:</span> <span className="text-slate-800">{contract.recipient_name || contract.Recipient}</span></div>
                      <div><span className="text-slate-500">Amount:</span> <span className="text-slate-800 font-bold">${(contract.total_obligation || contract.Amount || 0).toLocaleString()}</span></div>
                      <div><span className="text-slate-500">Agency:</span> <span className="text-slate-800">{contract.awarding_agency_name || contract.Agency}</span></div>
                      <div><span className="text-slate-500">Award Date:</span> <span className="text-slate-800">{contract.award_date || 'N/A'}</span></div>
                      <div className="col-span-2"><span className="text-slate-500">Description:</span> <span className="text-slate-800">{contract.description || contract.Description}</span></div>
                    </div>
                  </ExpandableRecord>
                ))}
              </div>
            )}

            {/* PeeringDB Display */}
            {activeSource === 'peeringdb' && Array.isArray(currentSource.data) && (
              <div>
                {currentSource.data.map((facility: any, i: number) => (
                  <ExpandableRecord
                    key={i}
                    id={`peeringdb-${i}`}
                    title={facility.name}
                    subtitle={`${facility.city}, ${facility.country}`}
                    badges={[
                      facility.ix_count > 0 && { label: `${facility.ix_count} IX`, color: 'bg-blue-100 text-blue-700' },
                      facility.net_count > 0 && { label: `${facility.net_count} Nets`, color: 'bg-purple-100 text-purple-700' },
                    ].filter(Boolean) as Array<{label: string; color: string}>}
                    expandedIds={expandedRecords}
                    onToggle={toggleRecord}
                    externalUrl={facility.website}
                  >
                    <div className="grid grid-cols-2 gap-2">
                      <div><span className="text-slate-500">Name:</span> <span className="text-slate-800">{facility.name}</span></div>
                      <div><span className="text-slate-500">Organization:</span> <span className="text-slate-800">{facility.org_name || 'Unknown'}</span></div>
                      <div><span className="text-slate-500">City:</span> <span className="text-slate-800">{facility.city}</span></div>
                      <div><span className="text-slate-500">Country:</span> <span className="text-slate-800">{facility.country}</span></div>
                      <div><span className="text-slate-500">IX Points:</span> <span className="text-slate-800">{facility.ix_count || 0}</span></div>
                      <div><span className="text-slate-500">Networks:</span> <span className="text-slate-800">{facility.net_count || 0}</span></div>
                      {facility.notes && <div className="col-span-2"><span className="text-slate-500">Notes:</span> <span className="text-slate-800">{facility.notes}</span></div>}
                    </div>
                  </ExpandableRecord>
                ))}
              </div>
            )}

            {/* OpenCorporates Display */}
            {activeSource === 'opencorporates' && Array.isArray(currentSource.data) && (
              <div>
                {currentSource.data.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No companies found. Try a different search term.</div>
                ) : (
                  currentSource.data.map((company: any, i: number) => (
                    <ExpandableRecord
                      key={i}
                      id={`opencorporates-${i}`}
                      title={company.name}
                      subtitle={`${(company.jurisdiction || company.jurisdiction_code || '')?.toUpperCase()} | #${company.companyNumber || company.company_number}`}
                      badges={[
                        { label: company.currentStatus || company.current_status || 'Unknown', color: (company.currentStatus || company.current_status)?.toLowerCase()?.includes('active') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-700' },
                        company.companyType && { label: company.companyType, color: 'bg-blue-100 text-blue-700' },
                      ].filter(Boolean) as Array<{label: string; color: string}>}
                      expandedIds={expandedRecords}
                      onToggle={toggleRecord}
                      externalUrl={company.opencorporatesUrl || company.opencorporates_url}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-slate-500">Name:</span> <span className="text-slate-800">{company.name}</span></div>
                        <div><span className="text-slate-500">Jurisdiction:</span> <span className="text-slate-800">{(company.jurisdiction || company.jurisdiction_code || '')?.toUpperCase()}</span></div>
                        <div><span className="text-slate-500">Company #:</span> <span className="text-slate-800">{company.companyNumber || company.company_number}</span></div>
                        <div><span className="text-slate-500">Status:</span> <span className="text-slate-800">{company.currentStatus || company.current_status || 'Unknown'}</span></div>
                        <div><span className="text-slate-500">Type:</span> <span className="text-slate-800">{company.companyType || 'N/A'}</span></div>
                        <div><span className="text-slate-500">Incorporated:</span> <span className="text-slate-800">{company.incorporationDate || company.incorporation_date || 'N/A'}</span></div>
                      </div>
                    </ExpandableRecord>
                  ))
                )}
              </div>
            )}

            {/* Local Facilities Display */}
            {activeSource === 'facilities' && Array.isArray(currentSource.data) && (
              <div>
                {currentSource.data.length === 0 ? (
                  <div className="p-8 text-center text-slate-500">No facilities in local database yet. Import data to start tracking.</div>
                ) : (
                  currentSource.data.map((facility: any, i: number) => (
                    <ExpandableRecord
                      key={i}
                      id={`facilities-${i}`}
                      title={facility.name}
                      subtitle={`${facility.operator} | ${facility.city}, ${facility.state}`}
                      badges={[
                        { label: facility.complianceStatus || 'Unknown', color: facility.complianceStatus === 'compliant' ? 'bg-green-100 text-green-700' : facility.complianceStatus === 'non-compliant' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700' },
                        facility.subsidyAmount && { label: `$${(facility.subsidyAmount / 1000000).toFixed(1)}M`, color: 'bg-emerald-100 text-emerald-700' },
                      ].filter(Boolean) as Array<{label: string; color: string}>}
                      expandedIds={expandedRecords}
                      onToggle={toggleRecord}
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-slate-500">Name:</span> <span className="text-slate-800">{facility.name}</span></div>
                        <div><span className="text-slate-500">Operator:</span> <span className="text-slate-800">{facility.operator}</span></div>
                        <div><span className="text-slate-500">City:</span> <span className="text-slate-800">{facility.city}</span></div>
                        <div><span className="text-slate-500">State:</span> <span className="text-slate-800">{facility.state}</span></div>
                        <div><span className="text-slate-500">Status:</span> <span className="text-slate-800">{facility.complianceStatus || 'Unknown'}</span></div>
                        <div><span className="text-slate-500">Jobs Promised:</span> <span className="text-slate-800">{facility.jobsPromised || 0}</span></div>
                        <div><span className="text-slate-500">Jobs Actual:</span> <span className="text-slate-800">{facility.jobsActual || 0}</span></div>
                        <div><span className="text-slate-500">Subsidy:</span> <span className="text-slate-800">${(facility.subsidyAmount || 0).toLocaleString()}</span></div>
                      </div>
                    </ExpandableRecord>
                  ))
                )}
              </div>
            )}
            </div>
          </div>
        )}

        {/* Idle State */}
        {currentSource.status === 'idle' && (
          <div className="p-12 text-center">
            <Eye size={48} className="text-slate-300 mx-auto mb-4" />
            <p className="text-slate-500 mb-4">Click "Refresh" to fetch real data from {currentSource.name}</p>
            <button
              onClick={fetchCurrentSource}
              className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
            >
              Fetch Real Data
            </button>
          </div>
        )}
      </div>

      {/* Data Source Notes */}
      <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-600">
        <strong>📡 Real Data Sources:</strong> This panel fetches live data from government APIs (SEC EDGAR, EPA ECHO, USASpending.gov), 
        public registries (PeeringDB, OpenCorporates), and your local IndexedDB. Some APIs may be CORS-restricted and require 
        a proxy server for production use. Rate limits apply.
      </div>
    </div>
  );
};

export default RealTimeIntelligence;

