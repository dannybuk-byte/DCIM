/**
 * DeepIntelligence.tsx
 * 
 * Comprehensive data extraction from all APIs - surfaces the FULL depth
 * of intelligence available, not just basic search results.
 * 
 * MAXIMIZED NESTED EXPANDABILITY + SCROLLABILITY
 * 
 * - OpenCorporates: Officers, subsidiaries, corporate structure
 * - SEC EDGAR: Subsidy disclosures, financials, full-text search
 * - PeeringDB: Network infrastructure mapping, ASN tracking
 * - USASpending: Contract details, agency breakdowns
 */

import React, { useState, useCallback } from 'react';
import {
  Building, Users, FileText, Network, DollarSign, Globe,
  ChevronDown, ChevronRight, RefreshCw, Download, ExternalLink,
  AlertTriangle, CheckCircle, Search, Database,
  TrendingUp, MapPin, Briefcase, Shield, Eye, Zap, Activity,
  Layers, Hash, Calendar, Tag, Link2, Server, Cpu
} from 'lucide-react';

// Import integrations
import { openCorporatesApi } from '../integrations/openCorporates';
import { secEdgarApi, BIG_TECH_CIKS } from '../integrations/secEdgar';
import { peeringDbApi, BIG_TECH_ASNS } from '../integrations/peeringDb';
import { usaSpendingApi } from '../integrations/usaSpending';

// ============================================================================
// NESTED EXPANDABLE RECORD COMPONENT
// ============================================================================
interface NestedRecordProps {
  id: string;
  title: string;
  subtitle?: string;
  badges?: Array<{ label: string; color: string }>;
  fields: Array<{ label: string; value: string | number | null; icon?: React.ReactNode }>;
  children?: React.ReactNode;
  externalUrl?: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
}

const NestedRecord: React.FC<NestedRecordProps> = ({
  id, title, subtitle, badges, fields, children, externalUrl, expandedIds, onToggle
}) => {
  const isExpanded = expandedIds.has(id);
  
  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isExpanded ? <ChevronDown size={14} className="text-slate-400 flex-shrink-0" /> : <ChevronRight size={14} className="text-slate-400 flex-shrink-0" />}
            <span className="font-medium text-slate-800 text-sm truncate">{title}</span>
          </div>
          {subtitle && <div className="text-xs text-slate-500 ml-5 truncate">{subtitle}</div>}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {badges?.map((badge, i) => (
            <span key={i} className={`px-1.5 py-0.5 text-xs rounded ${badge.color}`}>
              {badge.label}
            </span>
          ))}
          {externalUrl && (
            <a 
              href={externalUrl} 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="text-indigo-500 hover:text-indigo-700"
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>
      </button>
      
      {isExpanded && (
        <div className="px-3 py-2 bg-slate-50 border-t border-slate-100">
          <div className="grid grid-cols-2 gap-2 text-xs">
            {fields.filter(f => f.value !== null && f.value !== undefined).map((field, i) => (
              <div key={i} className="flex items-start gap-1.5">
                {field.icon && <span className="text-slate-400 mt-0.5">{field.icon}</span>}
                <div>
                  <div className="text-slate-500">{field.label}</div>
                  <div className="text-slate-800 font-medium">{field.value}</div>
                </div>
              </div>
            ))}
          </div>
          {children && <div className="mt-2 pt-2 border-t border-slate-200">{children}</div>}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SCROLLABLE SECTION COMPONENT
// ============================================================================
interface ScrollableSectionProps {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  count?: number;
  maxHeight?: string;
  children: React.ReactNode;
  expandedSections: Set<string>;
  onToggle: (id: string) => void;
}

const ScrollableSection: React.FC<ScrollableSectionProps> = ({
  id, title, icon, color, count, maxHeight = '300px', children, expandedSections, onToggle
}) => {
  const isExpanded = expandedSections.has(id);
  
  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => onToggle(id)}
        className="w-full px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded ${color}`}>{icon}</div>
          <span className="font-semibold text-slate-800 text-sm">{title}</span>
          {count !== undefined && (
            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">
              {count}
            </span>
          )}
        </div>
        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
      </button>
      {isExpanded && (
        <div 
          className="border-t border-slate-100 overflow-y-auto" 
          style={{ maxHeight }}
        >
          <div className="p-2 space-y-2">
            {children}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// NESTED TABS COMPONENT
// ============================================================================
interface NestedTabsProps {
  tabs: Array<{ id: string; label: string; icon: React.ReactNode; count?: number }>;
  activeTab: string;
  onTabChange: (id: string) => void;
}

const NestedTabs: React.FC<NestedTabsProps> = ({ tabs, activeTab, onTabChange }) => (
  <div className="flex gap-1 overflow-x-auto pb-1 border-b border-slate-200 mb-3">
    {tabs.map(tab => (
      <button
        key={tab.id}
        onClick={() => onTabChange(tab.id)}
        className={`px-2 py-1.5 text-xs font-medium rounded-t whitespace-nowrap flex items-center gap-1 transition-colors ${
          activeTab === tab.id
            ? 'bg-indigo-100 text-indigo-800 border-b-2 border-indigo-500'
            : 'text-slate-600 hover:bg-slate-100'
        }`}
      >
        {tab.icon}
        <span>{tab.label}</span>
        {tab.count !== undefined && (
          <span className={`px-1 py-0.5 rounded text-xs ${
            activeTab === tab.id ? 'bg-indigo-200' : 'bg-slate-200'
          }`}>
            {tab.count}
          </span>
        )}
      </button>
    ))}
  </div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const DeepIntelligence: React.FC = () => {
  const [selectedCompany, setSelectedCompany] = useState<string>('Amazon');
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'corporate' | 'financial' | 'network' | 'contracts'>('corporate');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);
  
  // Nested tabs within main tabs
  const [corporateSubTab, setCorporateSubTab] = useState<'companies' | 'subsidiaries' | 'structure'>('companies');
  const [financialSubTab, setFinancialSubTab] = useState<'filings' | 'subsidies' | 'xbrl'>('filings');
  const [networkSubTab, setNetworkSubTab] = useState<'asns' | 'facilities' | 'footprint'>('asns');
  const [contractSubTab, setContractSubTab] = useState<'contracts' | 'agencies' | 'summary'>('contracts');
  
  // Expanded sections and records
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['companies', 'filings', 'asns', 'contracts']));
  const [expandedRecords, setExpandedRecords] = useState<Set<string>>(new Set());
  
  // Deep data results
  const [corporateData, setCorporateData] = useState<{
    companies: unknown[];
    officers: unknown[];
    subsidiaries: unknown[];
    filings: unknown[];
  }>({ companies: [], officers: [], subsidiaries: [], filings: [] });
  
  const [financialData, setFinancialData] = useState<{
    secFilings: unknown[];
    subsidyDisclosures: unknown[];
    companyFacts: unknown;
  }>({ secFilings: [], subsidyDisclosures: [], companyFacts: null });
  
  const [networkData, setNetworkData] = useState<{
    asns: unknown[];
    facilities: unknown[];
    exchanges: unknown[];
    footprint: unknown[];
  }>({ asns: [], facilities: [], exchanges: [], footprint: [] });
  
  const [contractData, setContractData] = useState<{
    contracts: unknown[];
    agencySpending: unknown[];
    summary: unknown;
  }>({ contracts: [], agencySpending: [], summary: null });

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleRecord = (id: string) => {
    setExpandedRecords(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Expand/collapse all records
  const expandAllRecords = () => {
    const allIds = new Set<string>();
    corporateData.companies.forEach((_, i) => allIds.add(`company-${i}`));
    corporateData.subsidiaries.forEach((_, i) => allIds.add(`sub-${i}`));
    financialData.secFilings.forEach((_, i) => allIds.add(`filing-${i}`));
    financialData.subsidyDisclosures.forEach((_, i) => allIds.add(`subsidy-${i}`));
    networkData.asns.forEach((_, i) => allIds.add(`asn-${i}`));
    networkData.facilities.forEach((_, i) => allIds.add(`facility-${i}`));
    contractData.contracts.forEach((_, i) => allIds.add(`contract-${i}`));
    setExpandedRecords(allIds);
  };

  const collapseAllRecords = () => {
    setExpandedRecords(new Set());
  };

  // =========================================================================
  // CORPORATE INTELLIGENCE - OpenCorporates Deep Dive
  // =========================================================================
  const fetchCorporateIntelligence = useCallback(async () => {
    setIsLoading(true);
    showToast(`Fetching corporate intelligence for ${selectedCompany}...`, 'info');
    
    try {
      const searchResult = await openCorporatesApi.searchCompanies({
        query: selectedCompany,
        currentStatus: 'active',
        limit: 20,
      });
      
      const structure = await openCorporatesApi.getBigTechCorporateStructure();
      const subsidiaries = await openCorporatesApi.findDataCenterSubsidiaries(selectedCompany);
      
      setCorporateData({
        companies: searchResult.companies || [],
        officers: [],
        subsidiaries: subsidiaries || [],
        filings: [],
      });
      
      showToast(`Found ${searchResult.companies?.length || 0} companies, ${subsidiaries?.length || 0} subsidiaries`, 'success');
    } catch (error) {
      console.error('Corporate intelligence error:', error);
      showToast('Error fetching corporate data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompany]);

  // =========================================================================
  // FINANCIAL INTELLIGENCE - SEC EDGAR Deep Dive
  // =========================================================================
  const fetchFinancialIntelligence = useCallback(async () => {
    setIsLoading(true);
    showToast(`Fetching financial intelligence for ${selectedCompany}...`, 'info');
    
    try {
      const cik = BIG_TECH_CIKS[selectedCompany];
      if (!cik) {
        showToast(`No CIK found for ${selectedCompany}`, 'error');
        setIsLoading(false);
        return;
      }
      
      const filings = await secEdgarApi.fetchCompanyFilings(cik, ['10-K', '10-Q', '8-K', 'DEF 14A']);
      const subsidies = await secEdgarApi.searchSubsidyDisclosures(selectedCompany);
      const facts = await secEdgarApi.fetchCompanyFacts(cik);
      
      setFinancialData({
        secFilings: filings || [],
        subsidyDisclosures: subsidies || [],
        companyFacts: facts,
      });
      
      showToast(`Found ${filings?.length || 0} filings, ${subsidies?.length || 0} subsidy disclosures`, 'success');
    } catch (error) {
      console.error('Financial intelligence error:', error);
      showToast('Error fetching financial data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompany]);

  // =========================================================================
  // NETWORK INTELLIGENCE - PeeringDB Deep Dive
  // =========================================================================
  const fetchNetworkIntelligence = useCallback(async () => {
    setIsLoading(true);
    showToast(`Fetching network intelligence for ${selectedCompany}...`, 'info');
    
    try {
      const footprint = await peeringDbApi.getBigTechNetworkFootprint();
      const markets = await peeringDbApi.getDataCenterMarketFacilities();
      
      const companyKey = Object.keys(BIG_TECH_ASNS).find(k => 
        k.toLowerCase().includes(selectedCompany.toLowerCase())
      );
      const asns = companyKey ? BIG_TECH_ASNS[companyKey] : [];
      
      const asnDetails = [];
      for (const asn of asns.slice(0, 5)) {
        try {
          const network = await peeringDbApi.getNetworkByASN(asn);
          if (network) asnDetails.push(network);
        } catch (e) {
          console.warn(`Error fetching ASN ${asn}:`, e);
        }
      }
      
      setNetworkData({
        asns: asnDetails,
        facilities: markets?.flatMap(m => m.facilities) || [],
        exchanges: [],
        footprint: footprint || [],
      });
      
      showToast(`Found ${asnDetails.length} ASNs, ${footprint?.length || 0} network footprints`, 'success');
    } catch (error) {
      console.error('Network intelligence error:', error);
      showToast('Error fetching network data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [selectedCompany]);

  // =========================================================================
  // CONTRACT INTELLIGENCE - USASpending Deep Dive
  // =========================================================================
  const fetchContractIntelligence = useCallback(async () => {
    setIsLoading(true);
    showToast(`Fetching federal contract intelligence...`, 'info');
    
    try {
      const contracts = await usaSpendingApi.getBigTechContracts();
      const agencySpending = await usaSpendingApi.getAgencySpendingOnBigTech();
      const summary = await usaSpendingApi.getBigTechSpendingSummary();
      
      setContractData({
        contracts: contracts || [],
        agencySpending: agencySpending || [],
        summary: summary,
      });
      
      showToast(`Found ${contracts?.length || 0} contracts`, 'success');
    } catch (error) {
      console.error('Contract intelligence error:', error);
      showToast('Error fetching contract data', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch all data for current tab
  const fetchCurrentTab = useCallback(async () => {
    switch (activeTab) {
      case 'corporate': await fetchCorporateIntelligence(); break;
      case 'financial': await fetchFinancialIntelligence(); break;
      case 'network': await fetchNetworkIntelligence(); break;
      case 'contracts': await fetchContractIntelligence(); break;
    }
  }, [activeTab, fetchCorporateIntelligence, fetchFinancialIntelligence, fetchNetworkIntelligence, fetchContractIntelligence]);

  // Export all data
  const exportAllData = () => {
    const allData = {
      company: selectedCompany,
      timestamp: new Date().toISOString(),
      corporate: corporateData,
      financial: financialData,
      network: networkData,
      contracts: contractData,
    };
    
    const blob = new Blob([JSON.stringify(allData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deep_intelligence_${selectedCompany}_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    showToast('Deep intelligence data exported', 'success');
  };

  return (
    <div className="h-full flex flex-col">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[10000] p-3 rounded-lg shadow-lg flex items-center gap-2 text-sm ${
          toast.type === 'success' ? 'bg-green-600 text-white' :
          toast.type === 'error' ? 'bg-red-600 text-white' :
          'bg-blue-600 text-white'
        }`}>
          {toast.type === 'success' && <CheckCircle size={16} />}
          {toast.type === 'error' && <AlertTriangle size={16} />}
          {toast.type === 'info' && <Activity size={16} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Compact Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-xl p-4 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6" />
            <div>
              <h1 className="text-lg font-bold">🔍 Deep Intelligence Engine</h1>
              <p className="text-xs text-white/80">Full API extraction • Nested expandability • {selectedCompany}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={expandAllRecords} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs">Expand All</button>
            <button onClick={collapseAllRecords} className="px-2 py-1 bg-white/20 hover:bg-white/30 rounded text-xs">Collapse All</button>
            <button
              onClick={fetchCurrentTab}
              disabled={isLoading}
              className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded flex items-center gap-1.5 text-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              {isLoading ? 'Loading...' : 'Fetch'}
            </button>
            <button onClick={exportAllData} className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded flex items-center gap-1.5 text-sm">
              <Download size={14} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Company Selector - Compact */}
      <div className="bg-white rounded-lg p-2 border border-slate-200 mt-3 flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-medium text-slate-600">Company:</span>
          {Object.keys(BIG_TECH_CIKS).map(company => (
            <button
              key={company}
              onClick={() => setSelectedCompany(company)}
              className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                selectedCompany === company
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {company}
            </button>
          ))}
        </div>
      </div>

      {/* Main Tabs - Compact */}
      <div className="flex gap-1 mt-3 flex-shrink-0 overflow-x-auto">
        {[
          { id: 'corporate', label: '🏢 Corporate', icon: <Building size={14} />, count: corporateData.companies.length + corporateData.subsidiaries.length },
          { id: 'financial', label: '💰 Financial', icon: <FileText size={14} />, count: financialData.secFilings.length },
          { id: 'network', label: '🌐 Network', icon: <Network size={14} />, count: networkData.asns.length + networkData.facilities.length },
          { id: 'contracts', label: '📋 Contracts', icon: <DollarSign size={14} />, count: contractData.contracts.length },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-3 py-2 rounded-t-lg font-medium text-sm whitespace-nowrap flex items-center gap-1.5 transition-all ${
              activeTab === tab.id
                ? 'bg-white text-indigo-800 border border-b-0 border-slate-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count > 0 && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-xs rounded">{tab.count}</span>}
          </button>
        ))}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 bg-white rounded-b-lg border border-t-0 border-slate-200 overflow-hidden">
        <div className="h-full overflow-y-auto p-4">
          
          {/* CORPORATE TAB */}
          {activeTab === 'corporate' && (
            <div className="space-y-4">
              <NestedTabs
                tabs={[
                  { id: 'companies', label: 'Companies', icon: <Building size={12} />, count: corporateData.companies.length },
                  { id: 'subsidiaries', label: 'Subsidiaries', icon: <Layers size={12} />, count: corporateData.subsidiaries.length },
                  { id: 'structure', label: 'Structure', icon: <Database size={12} /> },
                ]}
                activeTab={corporateSubTab}
                onTabChange={(id) => setCorporateSubTab(id as typeof corporateSubTab)}
              />

              {corporateSubTab === 'companies' && (
                <ScrollableSection
                  id="companies"
                  title="Company Registrations"
                  icon={<Building size={14} className="text-blue-600" />}
                  color="bg-blue-100"
                  count={corporateData.companies.length}
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {corporateData.companies.length === 0 ? (
                    <p className="text-slate-500 text-xs p-2">Click "Fetch" to load company registrations</p>
                  ) : (
                    corporateData.companies.map((company: unknown, i: number) => {
                      const c = company as Record<string, unknown>;
                      return (
                        <NestedRecord
                          key={i}
                          id={`company-${i}`}
                          title={c.name as string}
                          subtitle={`${(c.jurisdiction as string)?.toUpperCase()} | #${c.companyNumber}`}
                          badges={[
                            { label: c.currentStatus as string || 'Unknown', color: (c.currentStatus as string)?.toLowerCase()?.includes('active') ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600' },
                            { label: c.companyType as string || 'N/A', color: 'bg-blue-100 text-blue-700' },
                          ]}
                          fields={[
                            { label: 'Company Number', value: c.companyNumber as string, icon: <Hash size={10} /> },
                            { label: 'Jurisdiction', value: (c.jurisdiction as string)?.toUpperCase(), icon: <Globe size={10} /> },
                            { label: 'Incorporated', value: c.incorporationDate as string, icon: <Calendar size={10} /> },
                            { label: 'Type', value: c.companyType as string, icon: <Tag size={10} /> },
                            { label: 'Status', value: c.currentStatus as string, icon: <Activity size={10} /> },
                            { label: 'Source', value: 'OpenCorporates', icon: <Database size={10} /> },
                          ]}
                          externalUrl={c.opencorporatesUrl as string}
                          expandedIds={expandedRecords}
                          onToggle={toggleRecord}
                        />
                      );
                    })
                  )}
                </ScrollableSection>
              )}

              {corporateSubTab === 'subsidiaries' && (
                <ScrollableSection
                  id="subsidiaries"
                  title="Data Center Subsidiaries"
                  icon={<Layers size={14} className="text-purple-600" />}
                  color="bg-purple-100"
                  count={corporateData.subsidiaries.length}
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {corporateData.subsidiaries.length === 0 ? (
                    <p className="text-slate-500 text-xs p-2">Click "Fetch" to search for data center subsidiaries</p>
                  ) : (
                    corporateData.subsidiaries.map((sub: unknown, i: number) => {
                      const s = sub as Record<string, unknown>;
                      return (
                        <NestedRecord
                          key={i}
                          id={`sub-${i}`}
                          title={s.name as string}
                          subtitle={`${(s.jurisdiction as string)?.toUpperCase()} | ${s.companyType || 'N/A'}`}
                          fields={[
                            { label: 'Jurisdiction', value: (s.jurisdiction as string)?.toUpperCase(), icon: <Globe size={10} /> },
                            { label: 'Type', value: s.companyType as string, icon: <Tag size={10} /> },
                            { label: 'Status', value: s.currentStatus as string, icon: <Activity size={10} /> },
                          ]}
                          expandedIds={expandedRecords}
                          onToggle={toggleRecord}
                        />
                      );
                    })
                  )}
                </ScrollableSection>
              )}

              {corporateSubTab === 'structure' && (
                <div className="text-center p-8 text-slate-500 text-sm">
                  <Database size={32} className="mx-auto mb-2 opacity-50" />
                  <p>Corporate structure visualization coming soon</p>
                  <p className="text-xs mt-1">Will show parent-subsidiary relationships</p>
                </div>
              )}
            </div>
          )}

          {/* FINANCIAL TAB */}
          {activeTab === 'financial' && (
            <div className="space-y-4">
              <NestedTabs
                tabs={[
                  { id: 'filings', label: 'SEC Filings', icon: <FileText size={12} />, count: financialData.secFilings.length },
                  { id: 'subsidies', label: 'Subsidies', icon: <DollarSign size={12} />, count: financialData.subsidyDisclosures.length },
                  { id: 'xbrl', label: 'XBRL Data', icon: <Database size={12} /> },
                ]}
                activeTab={financialSubTab}
                onTabChange={(id) => setFinancialSubTab(id as typeof financialSubTab)}
              />

              {financialSubTab === 'filings' && (
                <ScrollableSection
                  id="filings"
                  title="SEC Filings"
                  icon={<FileText size={14} className="text-emerald-600" />}
                  color="bg-emerald-100"
                  count={financialData.secFilings.length}
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {financialData.secFilings.length === 0 ? (
                    <p className="text-slate-500 text-xs p-2">Click "Fetch" to load SEC filings</p>
                  ) : (
                    (financialData.secFilings as Array<Record<string, unknown>>).slice(0, 30).map((filing, i) => (
                      <NestedRecord
                        key={i}
                        id={`filing-${i}`}
                        title={`${filing.form} - ${filing.company}`}
                        subtitle={`Filed: ${filing.filingDate}`}
                        badges={[
                          { label: filing.form as string, color: 
                            filing.form === '10-K' ? 'bg-blue-100 text-blue-700' :
                            filing.form === '10-Q' ? 'bg-green-100 text-green-700' :
                            filing.form === '8-K' ? 'bg-orange-100 text-orange-700' :
                            'bg-purple-100 text-purple-700'
                          },
                        ]}
                        fields={[
                          { label: 'Form', value: filing.form as string, icon: <FileText size={10} /> },
                          { label: 'Filing Date', value: filing.filingDate as string, icon: <Calendar size={10} /> },
                          { label: 'Report Date', value: filing.reportDate as string, icon: <Calendar size={10} /> },
                          { label: 'Description', value: filing.primaryDocDescription as string, icon: <Tag size={10} /> },
                          { label: 'CIK', value: filing.cik as string, icon: <Hash size={10} /> },
                          { label: 'Accession', value: filing.accessionNumber as string, icon: <Hash size={10} /> },
                        ]}
                        externalUrl={`https://www.sec.gov/Archives/edgar/data/${(filing.cik as string)?.replace(/^0+/, '')}/${(filing.accessionNumber as string)?.replace(/-/g, '')}/${filing.primaryDocument}`}
                        expandedIds={expandedRecords}
                        onToggle={toggleRecord}
                      />
                    ))
                  )}
                </ScrollableSection>
              )}

              {financialSubTab === 'subsidies' && (
                <ScrollableSection
                  id="subsidies"
                  title="Subsidy Disclosures"
                  icon={<DollarSign size={14} className="text-amber-600" />}
                  color="bg-amber-100"
                  count={financialData.subsidyDisclosures.length}
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {financialData.subsidyDisclosures.length === 0 ? (
                    <p className="text-slate-500 text-xs p-2">Click "Fetch" to search for subsidy disclosures</p>
                  ) : (
                    (financialData.subsidyDisclosures as Array<Record<string, unknown>>).map((disclosure, i) => (
                      <NestedRecord
                        key={i}
                        id={`subsidy-${i}`}
                        title={disclosure.company as string}
                        subtitle={disclosure.form as string}
                        fields={[
                          { label: 'Excerpt', value: (disclosure.excerpt as string)?.substring(0, 200) + '...', icon: <FileText size={10} /> },
                          { label: 'Form', value: disclosure.form as string, icon: <Tag size={10} /> },
                          { label: 'Filing Date', value: disclosure.filingDate as string, icon: <Calendar size={10} /> },
                        ]}
                        externalUrl={disclosure.source as string}
                        expandedIds={expandedRecords}
                        onToggle={toggleRecord}
                      />
                    ))
                  )}
                </ScrollableSection>
              )}

              {financialSubTab === 'xbrl' && (
                <ScrollableSection
                  id="xbrl"
                  title="XBRL Financial Facts"
                  icon={<Database size={14} className="text-cyan-600" />}
                  color="bg-cyan-100"
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {!financialData.companyFacts ? (
                    <p className="text-slate-500 text-xs p-2">Click "Fetch" to load XBRL company facts</p>
                  ) : (
                    <div className="space-y-2">
                      {Object.entries((financialData.companyFacts as Record<string, unknown>)?.facts?.['us-gaap'] || {})
                        .slice(0, 20)
                        .map(([key, value]) => (
                          <div key={key} className="p-2 bg-slate-50 rounded border border-slate-200">
                            <div className="text-xs text-slate-500 truncate">{key}</div>
                            <div className="font-mono text-sm text-slate-800">
                              {Array.isArray((value as Record<string, unknown[]>)?.units?.USD) 
                                ? `$${((value as Record<string, Array<{ val: number }>>).units.USD[0]?.val / 1e9).toFixed(2)}B`
                                : 'Data available'}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </ScrollableSection>
              )}
            </div>
          )}

          {/* NETWORK TAB */}
          {activeTab === 'network' && (
            <div className="space-y-4">
              <NestedTabs
                tabs={[
                  { id: 'asns', label: 'ASNs', icon: <Globe size={12} />, count: networkData.asns.length },
                  { id: 'facilities', label: 'Facilities', icon: <Server size={12} />, count: networkData.facilities.length },
                  { id: 'footprint', label: 'Footprint', icon: <MapPin size={12} />, count: networkData.footprint.length },
                ]}
                activeTab={networkSubTab}
                onTabChange={(id) => setNetworkSubTab(id as typeof networkSubTab)}
              />

              {networkSubTab === 'asns' && (
                <ScrollableSection
                  id="asns"
                  title="Autonomous System Numbers"
                  icon={<Globe size={14} className="text-violet-600" />}
                  color="bg-violet-100"
                  count={networkData.asns.length}
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {networkData.asns.length === 0 ? (
                    <div className="p-2">
                      <p className="text-slate-500 text-xs mb-2">Click "Fetch" to load ASN details</p>
                      <div className="bg-slate-100 rounded p-2 text-xs">
                        <div className="font-medium mb-1">Known ASNs:</div>
                        {Object.entries(BIG_TECH_ASNS).map(([company, asns]) => (
                          <div key={company} className="flex justify-between">
                            <span>{company}:</span>
                            <span className="font-mono">{asns.join(', ')}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    (networkData.asns as Array<Record<string, unknown>>).map((network, i) => (
                      <NestedRecord
                        key={i}
                        id={`asn-${i}`}
                        title={`AS${network.asn} - ${network.name}`}
                        subtitle={network.org_name as string}
                        badges={[
                          { label: `AS${network.asn}`, color: 'bg-violet-100 text-violet-700' },
                        ]}
                        fields={[
                          { label: 'ASN', value: network.asn as number, icon: <Hash size={10} /> },
                          { label: 'Name', value: network.name as string, icon: <Tag size={10} /> },
                          { label: 'Organization', value: network.org_name as string, icon: <Building size={10} /> },
                          { label: 'IPv4 Prefixes', value: network.info_prefixes4 as number, icon: <Globe size={10} /> },
                          { label: 'IPv6 Prefixes', value: network.info_prefixes6 as number, icon: <Globe size={10} /> },
                          { label: 'Traffic Level', value: network.info_traffic as string, icon: <Activity size={10} /> },
                          { label: 'Peering Policy', value: network.policy_general as string, icon: <Link2 size={10} /> },
                        ]}
                        externalUrl={network.website as string}
                        expandedIds={expandedRecords}
                        onToggle={toggleRecord}
                      />
                    ))
                  )}
                </ScrollableSection>
              )}

              {networkSubTab === 'facilities' && (
                <ScrollableSection
                  id="facilities"
                  title="Network Facilities"
                  icon={<Server size={14} className="text-teal-600" />}
                  color="bg-teal-100"
                  count={networkData.facilities.length}
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {networkData.facilities.length === 0 ? (
                    <p className="text-slate-500 text-xs p-2">Click "Fetch" to load facility data</p>
                  ) : (
                    (networkData.facilities as Array<Record<string, unknown>>).slice(0, 50).map((facility, i) => (
                      <NestedRecord
                        key={i}
                        id={`facility-${i}`}
                        title={facility.name as string}
                        subtitle={`${facility.city}, ${facility.country}`}
                        fields={[
                          { label: 'City', value: facility.city as string, icon: <MapPin size={10} /> },
                          { label: 'Country', value: facility.country as string, icon: <Globe size={10} /> },
                          { label: 'Organization', value: facility.org_name as string, icon: <Building size={10} /> },
                        ]}
                        externalUrl={facility.website as string}
                        expandedIds={expandedRecords}
                        onToggle={toggleRecord}
                      />
                    ))
                  )}
                </ScrollableSection>
              )}

              {networkSubTab === 'footprint' && (
                <ScrollableSection
                  id="footprint"
                  title="Network Footprint"
                  icon={<MapPin size={14} className="text-pink-600" />}
                  color="bg-pink-100"
                  count={networkData.footprint.length}
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {networkData.footprint.length === 0 ? (
                    <p className="text-slate-500 text-xs p-2">Click "Fetch" to map infrastructure footprint</p>
                  ) : (
                    (networkData.footprint as Array<Record<string, unknown>>).map((item, i) => (
                      <NestedRecord
                        key={i}
                        id={`footprint-${i}`}
                        title={item.company as string}
                        subtitle={`ASNs: ${(item.asns as number[])?.join(', ')}`}
                        fields={[
                          { label: 'Company', value: item.company as string, icon: <Building size={10} /> },
                          { label: 'Networks', value: (item.networks as unknown[])?.length, icon: <Network size={10} /> },
                          { label: 'Facilities', value: item.facilityCount as number, icon: <Server size={10} /> },
                        ]}
                        expandedIds={expandedRecords}
                        onToggle={toggleRecord}
                      />
                    ))
                  )}
                </ScrollableSection>
              )}
            </div>
          )}

          {/* CONTRACTS TAB */}
          {activeTab === 'contracts' && (
            <div className="space-y-4">
              <NestedTabs
                tabs={[
                  { id: 'contracts', label: 'Contracts', icon: <Briefcase size={12} />, count: contractData.contracts.length },
                  { id: 'agencies', label: 'Agencies', icon: <Shield size={12} />, count: contractData.agencySpending.length },
                  { id: 'summary', label: 'Summary', icon: <TrendingUp size={12} /> },
                ]}
                activeTab={contractSubTab}
                onTabChange={(id) => setContractSubTab(id as typeof contractSubTab)}
              />

              {contractSubTab === 'contracts' && (
                <ScrollableSection
                  id="contracts"
                  title="Federal Contracts"
                  icon={<Briefcase size={14} className="text-rose-600" />}
                  color="bg-rose-100"
                  count={contractData.contracts.length}
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {contractData.contracts.length === 0 ? (
                    <p className="text-slate-500 text-xs p-2">Click "Fetch" to load federal contracts</p>
                  ) : (
                    (contractData.contracts as Array<Record<string, unknown>>).slice(0, 30).map((contract, i) => (
                      <NestedRecord
                        key={i}
                        id={`contract-${i}`}
                        title={contract.recipientName as string}
                        subtitle={`$${((contract.awardAmount as number || 0) / 1e6).toFixed(1)}M`}
                        badges={[
                          { label: `$${((contract.awardAmount as number || 0) / 1e6).toFixed(1)}M`, color: 'bg-rose-100 text-rose-700' },
                        ]}
                        fields={[
                          { label: 'Recipient', value: contract.recipientName as string, icon: <Building size={10} /> },
                          { label: 'Amount', value: `$${((contract.awardAmount as number || 0) / 1e6).toFixed(2)}M`, icon: <DollarSign size={10} /> },
                          { label: 'Agency', value: contract.awardingAgency as string, icon: <Shield size={10} /> },
                          { label: 'Award Date', value: contract.awardDate as string, icon: <Calendar size={10} /> },
                          { label: 'Description', value: (contract.description as string)?.substring(0, 100), icon: <FileText size={10} /> },
                        ]}
                        expandedIds={expandedRecords}
                        onToggle={toggleRecord}
                      />
                    ))
                  )}
                </ScrollableSection>
              )}

              {contractSubTab === 'agencies' && (
                <ScrollableSection
                  id="agencies"
                  title="Spending by Agency"
                  icon={<Shield size={14} className="text-orange-600" />}
                  color="bg-orange-100"
                  count={contractData.agencySpending.length}
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {contractData.agencySpending.length === 0 ? (
                    <p className="text-slate-500 text-xs p-2">Click "Fetch" to load agency spending</p>
                  ) : (
                    (contractData.agencySpending as Array<Record<string, unknown>>).map((agency, i) => (
                      <NestedRecord
                        key={i}
                        id={`agency-${i}`}
                        title={agency.agency as string}
                        subtitle={`$${((agency.totalSpending as number || 0) / 1e9).toFixed(1)}B • ${agency.contractCount} contracts`}
                        badges={[
                          { label: `$${((agency.totalSpending as number || 0) / 1e9).toFixed(1)}B`, color: 'bg-orange-100 text-orange-700' },
                        ]}
                        fields={[
                          { label: 'Agency', value: agency.agency as string, icon: <Shield size={10} /> },
                          { label: 'Total Spending', value: `$${((agency.totalSpending as number || 0) / 1e9).toFixed(2)}B`, icon: <DollarSign size={10} /> },
                          { label: 'Contract Count', value: agency.contractCount as number, icon: <Hash size={10} /> },
                        ]}
                        expandedIds={expandedRecords}
                        onToggle={toggleRecord}
                      />
                    ))
                  )}
                </ScrollableSection>
              )}

              {contractSubTab === 'summary' && (
                <ScrollableSection
                  id="summary"
                  title="Spending Summary"
                  icon={<TrendingUp size={14} className="text-amber-600" />}
                  color="bg-amber-100"
                  maxHeight="400px"
                  expandedSections={expandedSections}
                  onToggle={toggleSection}
                >
                  {!contractData.summary ? (
                    <p className="text-slate-500 text-xs p-2">Click "Fetch" to load spending summary</p>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 bg-rose-50 rounded-lg">
                          <div className="text-2xl font-bold text-rose-700">
                            ${((contractData.summary as Record<string, unknown>).totalAmount as number / 1e9).toFixed(1)}B
                          </div>
                          <div className="text-xs text-rose-600">Total Amount</div>
                        </div>
                        <div className="p-3 bg-orange-50 rounded-lg">
                          <div className="text-2xl font-bold text-orange-700">
                            {(contractData.summary as Record<string, unknown>).contractCount as number}
                          </div>
                          <div className="text-xs text-orange-600">Contracts</div>
                        </div>
                      </div>
                      
                      <div className="text-xs font-medium text-slate-600 mt-3">Top Recipients:</div>
                      {((contractData.summary as Record<string, Array<Record<string, unknown>>>).topRecipients || []).map((r, i) => (
                        <div key={i} className="flex justify-between p-2 bg-slate-50 rounded">
                          <span className="text-sm">{r.name as string}</span>
                          <span className="font-bold text-rose-600">${((r.amount as number) / 1e9).toFixed(1)}B</span>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollableSection>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600 mt-3 flex items-center gap-2 flex-shrink-0">
        <Zap className="text-amber-500" size={14} />
        <span><strong>Deep Intel:</strong> Nested tabs + expandable records + scrollable sections</span>
      </div>
    </div>
  );
};

export default DeepIntelligence;
