/**
 * Regulatory Toolkit Dashboard
 * 
 * Shows municipalities and regulatory bodies how to operationalize
 * open-source DCIM data for subsidy compliance monitoring.
 * 
 * Features:
 * - Data source catalog with implementation details
 * - Scraper templates ready to deploy
 * - Integration guides for common use cases
 * - Cost/benefit analysis for each approach
 */

import React, { useState, useMemo } from 'react';
import {
  Database, Code, FileText, CheckCircle, AlertTriangle,
  ChevronDown, ChevronRight, ExternalLink, Copy, Download,
  Zap, Users, Building, Network, DollarSign, Leaf, FileCode,
  Clock, Globe, Shield, Search, Filter, Layers, BookOpen,
  Terminal, Play, Settings, Info
} from 'lucide-react';

import {
  REGULATORY_DATA_SOURCES,
  SCRAPER_TEMPLATES,
  MUNICIPAL_INTEGRATION_GUIDES,
  DataSource,
  ScraperTemplate,
  IntegrationGuide,
  getSourcesByCategory,
  getHighRelevanceSources,
  getFreeSources,
  getApiSources
} from '../services/regulatoryDataSources';

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const CategoryIcon: React.FC<{ category: string; className?: string }> = ({ category, className = '' }) => {
  const icons: Record<string, React.ReactNode> = {
    power: <Zap className={className} />,
    employment: <Users className={className} />,
    corporate: <Building className={className} />,
    property: <Building className={className} />,
    network: <Network className={className} />,
    financial: <DollarSign className={className} />,
    environmental: <Leaf className={className} />,
    contracts: <FileText className={className} />
  };
  return <>{icons[category] || <Database className={className} />}</>;
};

const RelevanceBadge: React.FC<{ level: string }> = ({ level }) => {
  const colors = {
    high: 'bg-green-100 text-green-800 border-green-200',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    low: 'bg-slate-100 text-slate-600 border-slate-200'
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${colors[level as keyof typeof colors]}`}>
      {level.toUpperCase()}
    </span>
  );
};

const TypeBadge: React.FC<{ type: string }> = ({ type }) => {
  const colors: Record<string, string> = {
    api: 'bg-blue-100 text-blue-800',
    scraper: 'bg-purple-100 text-purple-800',
    bulk_download: 'bg-emerald-100 text-emerald-800',
    foia: 'bg-amber-100 text-amber-800',
    manual: 'bg-slate-100 text-slate-600'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[type]}`}>
      {type.replace('_', ' ').toUpperCase()}
    </span>
  );
};

const CostBadge: React.FC<{ cost: string }> = ({ cost }) => {
  const colors: Record<string, string> = {
    free: 'bg-green-500 text-white',
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-red-100 text-red-800'
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[cost]}`}>
      {cost === 'free' ? '✓ FREE' : `$${cost.toUpperCase()}`}
    </span>
  );
};

// ============================================================================
// DATA SOURCE CARD
// ============================================================================

const DataSourceCard: React.FC<{ source: DataSource }> = ({ source }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start justify-between text-left hover:bg-slate-50"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 rounded-lg">
            <CategoryIcon category={source.category} className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <div className="font-medium text-slate-800">{source.name}</div>
            <div className="text-sm text-slate-500 mt-0.5">{source.description}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              <TypeBadge type={source.type} />
              <RelevanceBadge level={source.subsidyRelevance} />
              <CostBadge cost={source.estimatedCost} />
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs">
                {source.updateFrequency}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
      </button>
      
      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
          {/* Access Details */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Access Details</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-slate-400" />
                <a href={source.url} target="_blank" rel="noopener noreferrer" 
                   className="text-blue-600 hover:underline truncate">
                  {source.url}
                </a>
              </div>
              {source.apiEndpoint && (
                <div className="flex items-center gap-2">
                  <Code size={14} className="text-slate-400" />
                  <span className="font-mono text-xs text-slate-600 truncate">{source.apiEndpoint}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-slate-400" />
                <span>{source.authRequired ? 'Auth Required' : 'No Auth'}</span>
              </div>
              {source.rateLimit && (
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <span>Rate: {source.rateLimit}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FileText size={14} className="text-slate-400" />
                <span>Formats: {source.dataFormat.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe size={14} className="text-slate-400" />
                <span>Coverage: {source.coverage}</span>
              </div>
            </div>
          </div>
          
          {/* Predictive Signals */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">🎯 Predictive Signals for Subsidy Monitoring</h4>
            <ul className="space-y-1">
              {source.predictiveSignals.map((signal, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <CheckCircle size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                  <span>{signal}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Municipal Use Case */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Building size={14} className="text-amber-600" />
              <span className="text-sm font-medium text-amber-800">Municipal Use Case</span>
            </div>
            <p className="text-sm text-amber-700">{source.municipalUseCase}</p>
          </div>
          
          {/* Implementation */}
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Difficulty: <span className="font-medium text-slate-700">{source.implementationDifficulty}</span>
            </span>
            <a 
              href={source.url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-blue-600 hover:underline"
            >
              Open Source <ExternalLink size={14} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SCRAPER TEMPLATE CARD
// ============================================================================

const ScraperTemplateCard: React.FC<{ template: ScraperTemplate }> = ({ template }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(template.codeSnippet.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const languageColors: Record<string, string> = {
    python: 'bg-blue-100 text-blue-800',
    typescript: 'bg-blue-100 text-blue-800',
    shell: 'bg-slate-100 text-slate-800'
  };

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50"
      >
        <div className="flex items-center gap-3">
          <Terminal className="w-5 h-5 text-purple-600" />
          <div>
            <div className="font-medium text-slate-800">{template.name}</div>
            <div className="text-sm text-slate-500">{template.description}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium ${languageColors[template.language]}`}>
            {template.language}
          </span>
          {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
        </div>
      </button>
      
      {expanded && (
        <div className="border-t border-slate-200">
          <div className="p-3 bg-slate-100 flex items-center justify-between">
            <div className="text-sm text-slate-600">
              <span className="font-medium">Target:</span> {template.targetSource} •{' '}
              <span className="font-medium">Schedule:</span> {template.schedule}
            </div>
            <div className="flex gap-2">
              <button
                onClick={copyCode}
                className="px-3 py-1 bg-white border border-slate-200 rounded text-sm flex items-center gap-1 hover:bg-slate-50"
              >
                <Copy size={14} />
                {copied ? 'Copied!' : 'Copy'}
              </button>
              <button className="px-3 py-1 bg-purple-600 text-white rounded text-sm flex items-center gap-1 hover:bg-purple-700">
                <Play size={14} />
                Run
              </button>
            </div>
          </div>
          <div className="p-2 bg-slate-900 overflow-x-auto">
            <pre className="text-sm text-slate-300 font-mono whitespace-pre">
              {template.codeSnippet.trim()}
            </pre>
          </div>
          <div className="p-3 bg-slate-50 text-sm">
            <span className="font-medium text-slate-700">Dependencies:</span>{' '}
            <span className="font-mono text-slate-600">{template.dependencies.join(', ')}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// INTEGRATION GUIDE CARD
// ============================================================================

const IntegrationGuideCard: React.FC<{ guide: IntegrationGuide }> = ({ guide }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="border border-slate-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-start justify-between text-left hover:bg-slate-50"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-emerald-100 rounded-lg">
            <BookOpen className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <div className="text-xs text-emerald-600 font-medium mb-1">{guide.category}</div>
            <div className="font-medium text-slate-800">{guide.title}</div>
            <div className="text-sm text-slate-500 mt-0.5">{guide.description}</div>
          </div>
        </div>
        {expanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
      </button>
      
      {expanded && (
        <div className="border-t border-slate-200 p-4 bg-slate-50 space-y-4">
          {/* Data Sources */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Data Sources Used</h4>
            <div className="flex flex-wrap gap-2">
              {guide.dataSources.map(ds => (
                <span key={ds} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  {ds}
                </span>
              ))}
            </div>
          </div>
          
          {/* Implementation Steps */}
          <div>
            <h4 className="text-sm font-medium text-slate-700 mb-2">Implementation Steps</h4>
            <ol className="space-y-2">
              {guide.implementationSteps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-600">
                  <span className="w-5 h-5 bg-slate-200 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0">
                    {i + 1}
                  </span>
                  <span>{step.replace(/^\d+\.\s*/, '')}</span>
                </li>
              ))}
            </ol>
          </div>
          
          {/* Expected Outcome */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle size={14} className="text-green-600" />
              <span className="text-sm font-medium text-green-800">Expected Outcome</span>
            </div>
            <p className="text-sm text-green-700">{guide.expectedOutcome}</p>
          </div>
          
          {/* Time & Cost */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-slate-400" />
              <span className="text-slate-600">Time: <strong>{guide.timeToImplement}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign size={14} className="text-slate-400" />
              <span className="text-slate-600">Cost: <strong>{guide.costEstimate}</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type TabId = 'sources' | 'scrapers' | 'guides' | 'quickstart';

export const RegulatoryToolkit: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('sources');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [relevanceFilter, setRelevanceFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const categories = ['all', 'power', 'employment', 'corporate', 'property', 'network', 'financial', 'environmental', 'contracts'];

  const filteredSources = useMemo(() => {
    return REGULATORY_DATA_SOURCES.filter(source => {
      if (categoryFilter !== 'all' && source.category !== categoryFilter) return false;
      if (relevanceFilter !== 'all' && source.subsidyRelevance !== relevanceFilter) return false;
      if (typeFilter !== 'all' && source.type !== typeFilter) return false;
      if (searchQuery && !source.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !source.description.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [categoryFilter, relevanceFilter, typeFilter, searchQuery]);

  const stats = {
    total: REGULATORY_DATA_SOURCES.length,
    free: getFreeSources().length,
    highRelevance: getHighRelevanceSources().length,
    apis: getApiSources().length
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-xl p-4 text-white flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-8 h-8" />
            <div>
              <h1 className="text-xl font-bold">🏛️ Municipal DCIM Intelligence Toolkit</h1>
              <p className="text-sm text-white/80">
                Open-source data sources for predicting subsidy violations
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded flex items-center gap-1.5 text-sm">
              <Download size={14} />
              Export Catalog
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-3 mt-3 flex-shrink-0">
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
          <Database className="w-8 h-8 text-blue-500" />
          <div>
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
            <div className="text-xs text-slate-500">Data Sources</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <div>
            <div className="text-2xl font-bold text-slate-800">{stats.free}</div>
            <div className="text-xs text-slate-500">Free Sources</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-8 h-8 text-amber-500" />
          <div>
            <div className="text-2xl font-bold text-slate-800">{stats.highRelevance}</div>
            <div className="text-xs text-slate-500">High Relevance</div>
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-3 flex items-center gap-3">
          <Code className="w-8 h-8 text-purple-500" />
          <div>
            <div className="text-2xl font-bold text-slate-800">{stats.apis}</div>
            <div className="text-xs text-slate-500">APIs Available</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mt-4 flex-shrink-0">
        {[
          { id: 'sources', label: 'Data Sources', icon: <Database size={16} />, count: stats.total },
          { id: 'scrapers', label: 'Scraper Templates', icon: <Terminal size={16} />, count: SCRAPER_TEMPLATES.length },
          { id: 'guides', label: 'Integration Guides', icon: <BookOpen size={16} />, count: MUNICIPAL_INTEGRATION_GUIDES.length },
          { id: 'quickstart', label: 'Quick Start', icon: <Zap size={16} /> }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as TabId)}
            className={`px-4 py-2 rounded-t-lg font-medium text-sm flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-white text-emerald-700 border border-b-0 border-slate-200'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${
                activeTab === tab.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200'
              }`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 bg-white rounded-b-lg border border-t-0 border-slate-200 overflow-hidden">
        <div className="h-full overflow-y-auto">
          
          {/* DATA SOURCES TAB */}
          {activeTab === 'sources' && (
            <div className="p-4">
              {/* Filters */}
              <div className="flex gap-3 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <Search size={16} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search sources..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="px-3 py-1.5 border border-slate-200 rounded text-sm w-48"
                  />
                </div>
                <select
                  value={categoryFilter}
                  onChange={e => setCategoryFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-sm"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>
                      {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
                <select
                  value={relevanceFilter}
                  onChange={e => setRelevanceFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-sm"
                >
                  <option value="all">All Relevance</option>
                  <option value="high">High Relevance</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value)}
                  className="px-3 py-1.5 border border-slate-200 rounded text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="api">API</option>
                  <option value="scraper">Scraper</option>
                  <option value="bulk_download">Bulk Download</option>
                  <option value="foia">FOIA</option>
                </select>
              </div>

              {/* Source List */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredSources.map(source => (
                  <DataSourceCard key={source.id} source={source} />
                ))}
              </div>
            </div>
          )}

          {/* SCRAPERS TAB */}
          {activeTab === 'scrapers' && (
            <div className="p-4 space-y-3">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Terminal className="text-purple-600" size={20} />
                  <h3 className="font-bold text-purple-800">Ready-to-Deploy Scraper Templates</h3>
                </div>
                <p className="text-sm text-purple-700">
                  These templates can be deployed as scheduled jobs to continuously monitor data sources.
                  Copy the code, install dependencies, and configure with your parameters.
                </p>
              </div>
              
              {SCRAPER_TEMPLATES.map(template => (
                <ScraperTemplateCard key={template.id} template={template} />
              ))}
            </div>
          )}

          {/* GUIDES TAB */}
          {activeTab === 'guides' && (
            <div className="p-4 space-y-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <BookOpen className="text-emerald-600" size={20} />
                  <h3 className="font-bold text-emerald-800">Municipal Integration Guides</h3>
                </div>
                <p className="text-sm text-emerald-700">
                  Step-by-step guides for implementing subsidy monitoring systems.
                  Each guide includes data sources, implementation steps, and expected outcomes.
                </p>
              </div>
              
              {MUNICIPAL_INTEGRATION_GUIDES.map((guide, i) => (
                <IntegrationGuideCard key={i} guide={guide} />
              ))}
            </div>
          )}

          {/* QUICKSTART TAB */}
          {activeTab === 'quickstart' && (
            <div className="p-6 max-w-4xl mx-auto">
              <h2 className="text-2xl font-bold text-slate-800 mb-6">
                🚀 Quick Start: Municipal DCIM Intelligence
              </h2>
              
              <div className="space-y-6">
                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-blue-800 mb-4">
                    Why Use Open-Source DCIM for Subsidy Monitoring?
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <div className="font-medium text-slate-800">Cost-Effective</div>
                        <div className="text-sm text-slate-600">Most data sources are free public records</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <div className="font-medium text-slate-800">Predictive</div>
                        <div className="text-sm text-slate-600">Identify risks before violations occur</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <div className="font-medium text-slate-800">Independent</div>
                        <div className="text-sm text-slate-600">Don't rely on self-reported company data</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <CheckCircle className="text-green-500 flex-shrink-0 mt-1" size={20} />
                      <div>
                        <div className="font-medium text-slate-800">Documented</div>
                        <div className="text-sm text-slate-600">Creates audit trail for clawback enforcement</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">📋 Step 1: Start with These Free Sources</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { name: 'BLS QCEW', desc: 'Quarterly employment by county/industry', category: 'employment' },
                      { name: 'SEC EDGAR', desc: 'Public company filings', category: 'financial' },
                      { name: 'EPA ECHO', desc: 'Environmental permits', category: 'environmental' }
                    ].map((source, i) => (
                      <div key={i} className="border border-slate-200 rounded-lg p-4 bg-white">
                        <CategoryIcon category={source.category} className="w-6 h-6 text-slate-500 mb-2" />
                        <div className="font-medium text-slate-800">{source.name}</div>
                        <div className="text-sm text-slate-500">{source.desc}</div>
                        <span className="inline-block mt-2 px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded">FREE</span>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">📊 Step 2: Key Metrics to Track</h3>
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200">
                          <th className="text-left py-2 font-medium text-slate-700">Metric</th>
                          <th className="text-left py-2 font-medium text-slate-700">Data Source</th>
                          <th className="text-left py-2 font-medium text-slate-700">Warning Signal</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-slate-100">
                          <td className="py-2">Jobs Created</td>
                          <td className="py-2 text-slate-600">BLS QCEW</td>
                          <td className="py-2 text-red-600">&lt; 80% of commitment</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2">Power Consumption</td>
                          <td className="py-2 text-slate-600">EIA 860/861, PUC filings</td>
                          <td className="py-2 text-red-600">Growing faster than jobs</td>
                        </tr>
                        <tr className="border-b border-slate-100">
                          <td className="py-2">Property Value</td>
                          <td className="py-2 text-slate-600">County Assessor</td>
                          <td className="py-2 text-red-600">&lt; investment commitment</td>
                        </tr>
                        <tr>
                          <td className="py-2">Layoff Notices</td>
                          <td className="py-2 text-slate-600">WARN Act filings</td>
                          <td className="py-2 text-red-600">Any notice filed</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
                
                <div>
                  <h3 className="text-lg font-bold text-slate-800 mb-4">⚡ Step 3: Set Up Automated Monitoring</h3>
                  <ol className="space-y-3">
                    {[
                      'Register for BLS API key (free, takes 5 minutes)',
                      'Deploy the BLS Employment Scraper template (Scrapers tab)',
                      'Set up quarterly cron job to pull employment data',
                      'Create comparison dashboard: jobs promised vs actual',
                      'Configure email alerts for >20% variance'
                    ].map((step, i) => (
                      <li key={i} className="flex items-center gap-3">
                        <span className="w-6 h-6 bg-emerald-500 text-white rounded-full flex items-center justify-center text-sm font-medium">
                          {i + 1}
                        </span>
                        <span className="text-slate-700">{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="text-amber-600" size={20} />
                    <h4 className="font-bold text-amber-800">Need Help?</h4>
                  </div>
                  <p className="text-sm text-amber-700">
                    Contact <a href="https://goodjobsfirst.org" className="underline">Good Jobs First</a> for 
                    technical assistance with subsidy monitoring. They provide free resources for municipalities
                    and have extensive experience with data center subsidy accountability.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-600 mt-3 flex items-center gap-2 flex-shrink-0">
        <Shield className="text-emerald-500" size={14} />
        <span>
          <strong>Note:</strong> All data sources listed are publicly available. 
          This toolkit enables municipalities to independently verify subsidy compliance using open data.
        </span>
      </div>
    </div>
  );
};

export default RegulatoryToolkit;

