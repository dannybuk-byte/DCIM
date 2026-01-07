/**
 * Data Ecosystem Intelligence Panel
 * 
 * Visualizes the data center tracking ecosystem:
 * - Data sources with integration status
 * - Strategic partnership opportunities
 * - Ecosystem gaps to fill
 * - Integration roadmap
 */

import React, { useState, useMemo } from 'react';
import {
  Database,
  Users,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  ExternalLink,
  Zap,
  Globe,
  ChevronDown,
  ChevronRight,
  Target,
  TrendingUp,
  Lightbulb,
} from 'lucide-react';
import {
  DATA_SOURCES,
  STRATEGIC_PARTNERS,
  ECOSYSTEM_GAPS,
  DIFFERENTIATION,
  type DataSource,
  type StrategicPartner,
  type EcosystemGap,
  type IntegrationStatus,
} from '../../integrations/dataEcosystem';

// === Sub-Components ===

const StatusBadge: React.FC<{ status: IntegrationStatus }> = ({ status }) => {
  const config: Record<IntegrationStatus, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    integrated: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Live', icon: <CheckCircle size={10} /> },
    planned: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Planned', icon: <Clock size={10} /> },
    evaluating: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Evaluating', icon: <Search size={10} /> },
    blocked: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Blocked', icon: <AlertTriangle size={10} /> },
    'not-applicable': { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'N/A', icon: null },
  };
  
  const { bg, text, label, icon } = config[status];
  
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${bg} ${text}`}>
      {icon}
      {label}
    </span>
  );
};

const AlignmentBadge: React.FC<{ alignment: 'high' | 'medium' | 'low' }> = ({ alignment }) => {
  const config = {
    high: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', label: 'High' },
    medium: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Med' },
    low: { bg: 'bg-slate-500/20', text: 'text-slate-400', label: 'Low' },
  };
  
  const { bg, text, label } = config[alignment];
  
  return (
    <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${bg} ${text}`}>
      {label}
    </span>
  );
};

const DataSourceCard: React.FC<{ source: DataSource; isExpanded: boolean; onToggle: () => void }> = ({
  source,
  isExpanded,
  onToggle,
}) => {
  return (
    <div className="border border-slate-700/50 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 bg-slate-800/30 hover:bg-slate-800/50 transition-colors flex items-center justify-between"
      >
        <div className="flex items-center gap-3">
          {isExpanded ? <ChevronDown size={12} className="text-slate-500" /> : <ChevronRight size={12} className="text-slate-500" />}
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-medium text-white text-sm">{source.shortName || source.name}</span>
              <StatusBadge status={source.status} />
              <AlignmentBadge alignment={source.missionAlignment} />
            </div>
            <div className="text-[10px] text-slate-500">{source.organization}</div>
          </div>
        </div>
        {source.accessUrl && (
          <a
            href={source.accessUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-400"
          >
            <ExternalLink size={12} />
          </a>
        )}
      </button>
      
      {isExpanded && (
        <div className="p-3 space-y-3 bg-slate-900/50 text-xs">
          <p className="text-slate-300">{source.description}</p>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-slate-500 text-[10px] uppercase mb-1">Unique Data</div>
              <ul className="space-y-0.5">
                {source.uniqueData.slice(0, 3).map((d, i) => (
                  <li key={i} className="text-slate-300 flex items-start gap-1">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    {d}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-slate-500 text-[10px] uppercase mb-1">Limitations</div>
              <ul className="space-y-0.5">
                {source.limitations.slice(0, 3).map((l, i) => (
                  <li key={i} className="text-slate-400 flex items-start gap-1">
                    <span className="text-amber-400 mt-0.5">•</span>
                    {l}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400">
              {source.license.toUpperCase()}
            </span>
            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400">
              {source.geographicScope}
            </span>
            <span className="px-1.5 py-0.5 bg-slate-800 rounded text-[9px] text-slate-400">
              {source.updateFrequency}
            </span>
            {source.apiAvailable && (
              <span className="px-1.5 py-0.5 bg-cyan-500/20 rounded text-[9px] text-cyan-400">
                API
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const PartnerCard: React.FC<{ partner: StrategicPartner }> = ({ partner }) => {
  return (
    <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="font-medium text-white text-sm">{partner.name}</div>
          <div className="text-[10px] text-slate-500">{partner.geographicFocus}</div>
        </div>
        {partner.memberCount && (
          <span className="px-2 py-0.5 bg-slate-800 rounded text-xs text-slate-300">
            {partner.memberCount.toLocaleString()} members
          </span>
        )}
      </div>
      <p className="text-xs text-slate-400 mb-2">{partner.description}</p>
      <div className="flex flex-wrap gap-1">
        {partner.dataAssets.slice(0, 2).map((asset, i) => (
          <span key={i} className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded text-[9px]">
            {asset.split(' ').slice(0, 3).join(' ')}
          </span>
        ))}
      </div>
    </div>
  );
};

const GapCard: React.FC<{ gap: EcosystemGap }> = ({ gap }) => {
  const complexityColors = {
    low: 'text-emerald-400',
    medium: 'text-amber-400',
    high: 'text-red-400',
  };
  
  const impactColors = {
    high: 'bg-cyan-500/20 text-cyan-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-slate-500/20 text-slate-400',
  };
  
  return (
    <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-medium text-white text-sm">{gap.area}</h4>
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${impactColors[gap.impactPotential]}`}>
            {gap.impactPotential} impact
          </span>
          <span className={`text-[10px] ${complexityColors[gap.implementationComplexity]}`}>
            {gap.implementationComplexity} effort
          </span>
        </div>
      </div>
      <p className="text-xs text-slate-400 mb-2">{gap.description}</p>
      <div className="p-2 bg-cyan-500/5 border border-cyan-500/20 rounded text-xs text-cyan-300">
        <span className="text-cyan-400 font-medium">Opportunity:</span> {gap.dcimOpportunity}
      </div>
    </div>
  );
};

// === Main Component ===

type TabId = 'sources' | 'partners' | 'gaps' | 'differentiation';

export const DataEcosystemPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabId>('sources');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<IntegrationStatus | 'all'>('all');
  const [expandedSource, setExpandedSource] = useState<string | null>(null);

  // Filter sources
  const filteredSources = useMemo(() => {
    return DATA_SOURCES.filter(source => {
      const matchesSearch = searchQuery === '' || 
        source.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.organization.toLowerCase().includes(searchQuery.toLowerCase()) ||
        source.description.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === 'all' || source.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  }, [searchQuery, statusFilter]);

  // Stats
  const stats = useMemo(() => ({
    integrated: DATA_SOURCES.filter(s => s.status === 'integrated').length,
    planned: DATA_SOURCES.filter(s => s.status === 'planned').length,
    highAlignment: DATA_SOURCES.filter(s => s.missionAlignment === 'high').length,
    totalGaps: ECOSYSTEM_GAPS.length,
    highImpactGaps: ECOSYSTEM_GAPS.filter(g => g.impactPotential === 'high').length,
    partners: STRATEGIC_PARTNERS.length,
  }), []);

  const tabs: { id: TabId; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: 'sources', label: 'Data Sources', icon: <Database size={12} />, count: DATA_SOURCES.length },
    { id: 'partners', label: 'Partners', icon: <Users size={12} />, count: STRATEGIC_PARTNERS.length },
    { id: 'gaps', label: 'Gaps', icon: <Target size={12} />, count: ECOSYSTEM_GAPS.length },
    { id: 'differentiation', label: 'Strategy', icon: <Lightbulb size={12} /> },
  ];

  return (
    <div className="h-full flex flex-col bg-slate-950 text-white overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Globe className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-lg">Data Ecosystem Intelligence</h2>
          </div>
        </div>
        
        {/* Stats Row */}
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1 text-emerald-400">
            <CheckCircle size={12} />
            {stats.integrated} Integrated
          </span>
          <span className="flex items-center gap-1 text-blue-400">
            <Clock size={12} />
            {stats.planned} Planned
          </span>
          <span className="flex items-center gap-1 text-cyan-400">
            <Target size={12} />
            {stats.highAlignment} High-Alignment
          </span>
          <span className="flex items-center gap-1 text-amber-400">
            <AlertTriangle size={12} />
            {stats.highImpactGaps} High-Impact Gaps
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-shrink-0 flex border-b border-slate-800">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-white border-b-2 border-cyan-500 bg-slate-800/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/20'
            }`}
          >
            {tab.icon}
            {tab.label}
            {tab.count !== undefined && (
              <span className="px-1.5 py-0.5 bg-slate-700 rounded text-[9px]">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeTab === 'sources' && (
          <div className="space-y-3">
            {/* Filters */}
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search sources..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-7 pr-3 py-1.5 bg-slate-900 border border-slate-700 rounded text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as IntegrationStatus | 'all')}
                className="px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                <option value="all">All Status</option>
                <option value="integrated">Integrated</option>
                <option value="planned">Planned</option>
                <option value="evaluating">Evaluating</option>
              </select>
            </div>

            {/* Source List */}
            <div className="space-y-2">
              {filteredSources.map(source => (
                <DataSourceCard
                  key={source.id}
                  source={source}
                  isExpanded={expandedSource === source.id}
                  onToggle={() => setExpandedSource(expandedSource === source.id ? null : source.id)}
                />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'partners' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 mb-4">
              Strategic partners for data sharing, organizing capacity, and policy influence.
            </div>
            
            {/* Union Partners */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                <Zap size={12} /> Labor Unions
              </h3>
              {STRATEGIC_PARTNERS.filter(p => p.type === 'union').map(partner => (
                <PartnerCard key={partner.id} partner={partner} />
              ))}
            </div>

            {/* Coalition Partners */}
            <div className="space-y-2 mt-4">
              <h3 className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                <Users size={12} /> Coalitions & Advocacy
              </h3>
              {STRATEGIC_PARTNERS.filter(p => p.type === 'coalition').map(partner => (
                <PartnerCard key={partner.id} partner={partner} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'gaps' && (
          <div className="space-y-3">
            <div className="text-xs text-slate-400 mb-4">
              Ecosystem gaps represent opportunities for differentiation and impact.
            </div>
            
            {/* High Impact First */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                <TrendingUp size={12} /> High Impact Opportunities
              </h3>
              {ECOSYSTEM_GAPS.filter(g => g.impactPotential === 'high').map(gap => (
                <GapCard key={gap.id} gap={gap} />
              ))}
            </div>

            <div className="space-y-2 mt-4">
              <h3 className="text-xs font-medium text-slate-500 uppercase flex items-center gap-2">
                <Target size={12} /> Other Gaps
              </h3>
              {ECOSYSTEM_GAPS.filter(g => g.impactPotential !== 'high').map(gap => (
                <GapCard key={gap.id} gap={gap} />
              ))}
            </div>
          </div>
        )}

        {activeTab === 'differentiation' && (
          <div className="space-y-4">
            {/* Key Insight */}
            <div className="p-4 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg">
              <h3 className="font-medium text-cyan-400 mb-2 flex items-center gap-2">
                <Lightbulb size={14} />
                Strategic Differentiation
              </h3>
              <div className="text-sm text-white whitespace-pre-line leading-relaxed">
                {DIFFERENTIATION.statement.trim()}
              </div>
            </div>

            {/* Competitor Landscape */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-slate-500 uppercase">What Others Track (Not Us)</h3>
              <div className="space-y-1.5">
                {Object.entries(DIFFERENTIATION.competitors).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-slate-800/30 rounded text-xs">
                    <span className="text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <span className="text-slate-500">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Our Unique Value */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-slate-500 uppercase">Our Unique Value</h3>
              <div className="flex flex-wrap gap-2">
                {DIFFERENTIATION.uniqueValue.map((value, i) => (
                  <span key={i} className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs font-medium">
                    {value}
                  </span>
                ))}
              </div>
            </div>

            {/* Integration Chain */}
            <div className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-lg">
              <h3 className="text-xs font-medium text-white mb-3">The Integration Chain (Our Moat)</h3>
              <div className="flex items-center justify-center gap-2 text-xs">
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded font-medium">SUBSIDIES</span>
                <span className="text-slate-500">→</span>
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 rounded font-medium">EMPLOYMENT</span>
                <span className="text-slate-500">→</span>
                <span className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded font-medium">CONDITIONS</span>
                <span className="text-slate-500">→</span>
                <span className="px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded font-medium">UNIONS</span>
              </div>
              <p className="text-[10px] text-slate-500 text-center mt-2">
                No other organization connects all four. This is unexplored territory.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataEcosystemPanel;

