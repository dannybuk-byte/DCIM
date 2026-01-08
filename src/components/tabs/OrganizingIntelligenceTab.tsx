/**
 * Organizing Intelligence Tab
 * 
 * Strategic dashboard for labor organizers to identify and prioritize
 * data center organizing targets. Based on "docks to data centers" framework.
 * 
 * Features:
 * - Target Prioritization Scorecard
 * - Contractor Structure Analysis
 * - IBEW Footprint & Expansion Map
 * - Joint Employer Indicators
 * - Corridor Intelligence
 */

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { db } from '../../db/database';
import { Facility } from '../../types';
import {
  Target,
  Users,
  Building2,
  MapPin,
  TrendingUp,
  AlertTriangle,
  Shield,
  Zap,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Search,
  Filter,
  Download,
  Phone,
  ExternalLink,
  Briefcase,
  UserCheck,
  FileText,
  BarChart3,
  Layers,
  Network,
  HardHat,
  Scale,
  Info,
  Star,
  Clock,
  Bot,
  Cpu,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Maximize2,
  Minimize2,
  Settings2,
} from 'lucide-react';
import { ContextualNLPWidget, SectionNLPBar } from '../shared/ContextualNLPWidget';
import { NLPAction } from '../../hooks/useSectionNLP';
import { SectionContext } from '../../ai/sectionPrompts';
import { HelpIcon } from '../shared/InlineHelpButton';
import { EpochAIIntelligenceTab } from './EpochAIIntelligenceTab';
import {
  OrganizingTarget,
  IBEWFootprint,
  ContractorStructure,
  calculateOrganizingTarget,
  calculateJointEmployerProbability,
  getIBEWLocalForLocation,
  getContractorsForOperator,
  getCorridorForState,
  generateOrganizingTargets,
  getOrganizingStats,
  IBEW_LOCALS,
  DATA_CENTER_CORRIDORS,
  KNOWN_CONTRACTORS,
} from '../../services/organizingIntelligenceService';

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

interface ScoreGaugeProps {
  score: number;
  label: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
}

const ScoreGauge: React.FC<ScoreGaugeProps> = ({ score, label, color, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-16 h-16 text-lg',
    md: 'w-24 h-24 text-2xl',
    lg: 'w-32 h-32 text-3xl',
  };
  
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;
  
  return (
    <div className="flex flex-col items-center">
      <div className={`relative ${sizeClasses[size]}`}>
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke="#1e293b"
            strokeWidth="8"
            fill="none"
          />
          <circle
            cx="50"
            cy="50"
            r="45"
            stroke={color}
            strokeWidth="8"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center font-bold text-white">
          {score}
        </div>
      </div>
      <span className="text-xs text-gray-400 mt-1">{label}</span>
    </div>
  );
};

interface PriorityBadgeProps {
  priority: OrganizingTarget['priority'];
}

const PriorityBadge: React.FC<PriorityBadgeProps> = ({ priority }) => {
  const colors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    high: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    medium: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    low: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${colors[priority]}`}>
      {priority.toUpperCase()}
    </span>
  );
};

interface UnionBadgeProps {
  union: OrganizingTarget['suggestedUnion'];
}

const UnionBadge: React.FC<UnionBadgeProps> = ({ union }) => {
  const colors: Record<string, string> = {
    'CODE-CWA': 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    'IBEW': 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    'BOTH': 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    'OTHER': 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  };
  
  return (
    <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${colors[union]}`}>
      {union}
    </span>
  );
};

// =============================================================================
// MAIN COMPONENT
// =============================================================================

// Nested section IDs for expandable details
type NestedSection = 'keyFactors' | 'strategic' | 'unionIntel' | 'contractors' | 'timeline' | 'approach' | 'subsidy';

// =============================================================================
// DENSITY MODE TYPES & CONFIG
// =============================================================================
type DensityMode = 'compact' | 'comfortable' | 'spacious';

const DENSITY_CONFIG = {
  compact: {
    text: 'text-[10px]',
    textLg: 'text-xs',
    padding: 'p-1',
    paddingX: 'px-1.5',
    paddingY: 'py-0.5',
    gap: 'gap-1',
    cardPadding: 'p-2',
    rowHeight: 'py-1',
    iconSize: 'w-3 h-3',
    iconSizeLg: 'w-4 h-4',
    headerHeight: 'h-8',
    sidebarWidth: 'w-48',
  },
  comfortable: {
    text: 'text-xs',
    textLg: 'text-sm',
    padding: 'p-2',
    paddingX: 'px-3',
    paddingY: 'py-1.5',
    gap: 'gap-2',
    cardPadding: 'p-3',
    rowHeight: 'py-2',
    iconSize: 'w-4 h-4',
    iconSizeLg: 'w-5 h-5',
    headerHeight: 'h-10',
    sidebarWidth: 'w-56',
  },
  spacious: {
    text: 'text-sm',
    textLg: 'text-base',
    padding: 'p-3',
    paddingX: 'px-4',
    paddingY: 'py-2',
    gap: 'gap-3',
    cardPadding: 'p-4',
    rowHeight: 'py-3',
    iconSize: 'w-5 h-5',
    iconSizeLg: 'w-6 h-6',
    headerHeight: 'h-12',
    sidebarWidth: 'w-64',
  },
};

export const OrganizingIntelligenceTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'targets' | 'contractors' | 'ibew' | 'corridors' | 'ai-infra'>('targets');
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [selectedTarget, setSelectedTarget] = useState<OrganizingTarget | null>(null);
  const [expandedLocals, setExpandedLocals] = useState<Set<number>>(new Set());
  const [facilities, setFacilities] = useState<Facility[]>([]);
  
  // HYBRID DENSITY CONTROLS
  const [densityMode, setDensityMode] = useState<DensityMode>('comfortable');
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(false);
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true);
  const [statsBarExpanded, setStatsBarExpanded] = useState(false);
  
  // Get current density config
  const d = DENSITY_CONFIG[densityMode];
  
  // NLP-driven filters
  const [filters, setFilters] = useState<{
    states?: string[];
    operators?: string[];
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
  }>({});
  // Track which nested sections are expanded within each target card
  const [expandedSections, setExpandedSections] = useState<Record<number, Set<NestedSection>>>({});

  // Toggle a nested section within a target card
  const toggleNestedSection = (facilityId: number, section: NestedSection) => {
    setExpandedSections(prev => {
      const currentSections = prev[facilityId] || new Set();
      const newSections = new Set(currentSections);
      if (newSections.has(section)) {
        newSections.delete(section);
      } else {
        newSections.add(section);
      }
      return { ...prev, [facilityId]: newSections };
    });
  };

  // Check if a nested section is expanded
  const isSectionExpanded = (facilityId: number, section: NestedSection): boolean => {
    return expandedSections[facilityId]?.has(section) || false;
  };
  
  // Fetch facilities from database
  useEffect(() => {
    db.facilities.toArray().then(setFacilities).catch(console.error);
  }, []);
  
  // Generate organizing targets from facilities
  const organizingTargets = useMemo(() => {
    return generateOrganizingTargets(facilities.map(f => ({
      id: f.id!,
      name: f.name,
      operator: f.operator,
      city: f.city,
      state: f.state,
      latitude: f.latitude,
      longitude: f.longitude,
      subsidyAmount: f.taxIncentives, // Use taxIncentives field from Facility
    })));
  }, [facilities]);
  
  // State abbreviation mapping for search
  const STATE_ABBREVIATIONS: Record<string, string> = {
    'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
    'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
    'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
    'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
    'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi', 'mo': 'missouri',
    'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'new hampshire', 'nj': 'new jersey',
    'nm': 'new mexico', 'ny': 'new york', 'nc': 'north carolina', 'nd': 'north dakota', 'oh': 'ohio',
    'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania', 'ri': 'rhode island', 'sc': 'south carolina',
    'sd': 'south dakota', 'tn': 'tennessee', 'tx': 'texas', 'ut': 'utah', 'vt': 'vermont',
    'va': 'virginia', 'wa': 'washington', 'wv': 'west virginia', 'wi': 'wisconsin', 'wy': 'wyoming',
  };

  // Operator alias mapping for search - maps common terms to canonical operator names
  const OPERATOR_ALIASES: Record<string, string[]> = {
    'amazon web services': ['aws', 'amazon', 'amzn'],
    'microsoft azure': ['microsoft', 'msft', 'azure', 'ms'],
    'google cloud': ['google', 'gcp', 'alphabet', 'googl'],
    'meta': ['meta', 'facebook', 'fb'],
    'apple': ['apple', 'aapl'],
    'oracle': ['oracle', 'orcl'],
    'ibm': ['ibm', 'international business machines'],
    'equinix': ['equinix', 'eqix'],
    'digital realty': ['digital realty', 'dlr', 'digital'],
    'cyrusone': ['cyrusone', 'cyrus'],
    'qts realty': ['qts', 'qts realty'],
    'coresite': ['coresite', 'core site'],
    'switch': ['switch', 'swch'],
    'vantage': ['vantage'],
    'edgeconnex': ['edgeconnex', 'edge'],
  };

  // Helper to expand operator aliases to canonical name
  const expandOperatorAlias = (term: string): string | null => {
    const termLower = term.toLowerCase();
    for (const [canonical, aliases] of Object.entries(OPERATOR_ALIASES)) {
      if (aliases.some(alias => alias.toLowerCase() === termLower)) {
        return canonical;
      }
    }
    return null;
  };

  // Filter and sort targets - now with smarter multi-term search
  const filteredTargets = useMemo(() => {
    return organizingTargets
      .filter(t => {
        if (priorityFilter !== 'all' && t.priority !== priorityFilter) return false;
        if (searchQuery) {
          // Split query into terms
          const terms = searchQuery.toLowerCase().split(/\s+/).filter(Boolean);
          
          // Build searchable text from all relevant fields (lowercase for matching)
          const searchableText = [
            t.facilityName,
            t.operator,
            t.location.city,
            t.location.state,
          ].join(' ').toLowerCase();
          
          // ALL terms must match (check original term, expanded state, OR operator alias)
          return terms.every(term => {
            const expandedState = STATE_ABBREVIATIONS[term];
            const expandedOperator = expandOperatorAlias(term);
            
            // Match if original term is found
            if (searchableText.includes(term)) return true;
            // Match if expanded state name is found
            if (expandedState && searchableText.includes(expandedState)) return true;
            // Match if operator alias canonical name is found
            if (expandedOperator && searchableText.includes(expandedOperator)) return true;
            
            return false;
          });
        }
        return true;
      })
      .sort((a, b) => b.overallScore - a.overallScore);
  }, [organizingTargets, priorityFilter, searchQuery]);
  
  // Get statistics
  const stats = useMemo(() => getOrganizingStats(), []);
  
  // Toggle IBEW local expansion
  const toggleLocalExpansion = useCallback((localNumber: number) => {
    setExpandedLocals(prev => {
      const next = new Set(prev);
      if (next.has(localNumber)) {
        next.delete(localNumber);
      } else {
        next.add(localNumber);
      }
      return next;
    });
  }, []);
  
  // =============================================================================
  // RENDER: HEADER & STATS
  // =============================================================================
  
  // Get current section context for NLP
  const getNLPContext = (): SectionContext => {
    switch (activeSection) {
      case 'targets': return 'target-prioritization';
      case 'contractors': return 'contractors';
      case 'ibew': return 'ibew-footprint';
      case 'corridors': return 'corridors';
      default: return 'organizing';
    }
  };

  // Handle NLP actions
  const handleNLPAction = useCallback((action: NLPAction) => {
    console.log('NLP Action:', action);
    // Handle different action types
    if (action.type === 'filter') {
      // Apply filters to current view
      const payload = action.payload as { states?: string[]; operators?: string[] };
      if (payload.states) {
        setFilters(prev => ({ ...prev, states: payload.states }));
      }
      if (payload.operators) {
        setFilters(prev => ({ ...prev, operators: payload.operators }));
      }
    } else if (action.type === 'sort') {
      const payload = action.payload as { field: string; direction: 'asc' | 'desc' };
      setFilters(prev => ({ ...prev, sortBy: payload.field, sortDirection: payload.direction }));
    }
  }, []);

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-red-900 via-orange-900 to-amber-900 mx-1 mt-1 p-2 shadow-lg border border-red-500/30 rounded-lg">
      <div className="flex items-center justify-between">
        {/* Left: Title and Mission */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow">
            <Target size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Organizing Intelligence</h1>
            <p className="text-orange-200 text-[10px]">"Docks to Data Centers" • Strategic targets</p>
          </div>
        </div>
        
        {/* Center: Stats Row */}
        <div className="flex items-center gap-3">
          <div className="text-center px-2 py-0.5 bg-black/20 rounded">
            <div className="text-lg font-bold text-yellow-400">{stats.totalIBEWMaintenanceWorkers.toLocaleString()}</div>
            <div className="text-orange-200 text-[9px]">IBEW</div>
          </div>
          <div className="text-center px-2 py-0.5 bg-black/20 rounded">
            <div className="text-lg font-bold text-green-400">{stats.potentialOpsExpansion.toLocaleString()}</div>
            <div className="text-orange-200 text-[9px]">Targets</div>
          </div>
          <div className="text-center px-2 py-0.5 bg-black/20 rounded">
            <div className="text-lg font-bold text-cyan-400">{stats.corridorsTracked}</div>
            <div className="text-orange-200 text-[9px]">Corridors</div>
          </div>
          <div className="text-center px-2 py-0.5 bg-black/20 rounded">
            <div className="text-lg font-bold text-red-400">{organizingTargets.filter(t => t.priority === 'critical' || t.priority === 'high').length}</div>
            <div className="text-orange-200 text-[9px]">Priority</div>
          </div>
        </div>
        
        {/* Right: Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setLeftSidebarOpen(!leftSidebarOpen)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              leftSidebarOpen ? 'bg-white/20 text-white' : 'bg-white/10 text-orange-200 hover:bg-white/15'
            }`}
          >
            {leftSidebarOpen ? '◀' : '▶'} Filters
          </button>
          
          <div className="w-48">
            <SectionNLPBar context={getNLPContext()} placeholder="Ask AI..." onAction={handleNLPAction} />
          </div>
          
          <HelpIcon context={getNLPContext()} />
          
          <button className="px-2 py-1 bg-white/10 text-white text-[10px] rounded hover:bg-white/20 flex items-center gap-1">
            <Download className="w-3 h-3" />Export
          </button>
          
          <button
            onClick={() => setRightSidebarOpen(!rightSidebarOpen)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              rightSidebarOpen ? 'bg-white/20 text-white' : 'bg-white/10 text-orange-200 hover:bg-white/15'
            }`}
          >
            Stats {rightSidebarOpen ? '▶' : '◀'}
          </button>
        </div>
      </div>
    </div>
  );
  
  // =============================================================================
  // RENDER: NAVIGATION
  // =============================================================================
  
  const renderNavigation = () => (
    <div className="border-b border-[#30363d] bg-[#161b22] px-2 py-1">
      <div className="flex gap-0.5">
        {[
          { id: 'targets', label: 'Targets', icon: Target },
          { id: 'contractors', label: 'Contractors', icon: Users },
          { id: 'ibew', label: 'IBEW', icon: Zap },
          { id: 'corridors', label: 'Corridors', icon: MapPin },
          { id: 'ai-infra', label: 'AI Infra', icon: Cpu, highlight: true },
        ].map(({ id, label, icon: Icon, highlight }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id as typeof activeSection)}
            className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
              activeSection === id
                ? highlight ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' : 'bg-[#21262d] text-white'
                : highlight ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-600/20 border border-transparent' : 'text-gray-400 hover:text-white hover:bg-[#21262d]/50'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>
    </div>
  );
  
  // =============================================================================
  // RENDER: TARGET PRIORITIZATION (HIGH-DENSITY TABLE VIEW)
  // =============================================================================
  
  // State for target view mode and expanded rows
  const [targetViewMode, setTargetViewMode] = useState<'table' | 'cards'>('table');
  const [expandedTargetRows, setExpandedTargetRows] = useState<Set<number>>(new Set());
  const [targetDetailTab, setTargetDetailTab] = useState<Record<number, 'overview' | 'scores' | 'factors' | 'intel' | 'actions'>>({});
  
  const toggleTargetRow = (facilityId: number) => {
    setExpandedTargetRows(prev => {
      const next = new Set(prev);
      if (next.has(facilityId)) {
        next.delete(facilityId);
      } else {
        next.add(facilityId);
      }
      return next;
    });
  };
  
  const getTargetDetailTab = (facilityId: number) => targetDetailTab[facilityId] || 'overview';
  const setTargetTab = (facilityId: number, tab: 'overview' | 'scores' | 'factors' | 'intel' | 'actions') => {
    setTargetDetailTab(prev => ({ ...prev, [facilityId]: tab }));
  };
  
  // Group targets by priority for table view
  const targetsByPriority = useMemo(() => ({
    critical: filteredTargets.filter(t => t.priority === 'critical'),
    high: filteredTargets.filter(t => t.priority === 'high'),
    medium: filteredTargets.filter(t => t.priority === 'medium'),
    low: filteredTargets.filter(t => t.priority === 'low'),
  }), [filteredTargets]);
  
  const renderTargetSection = () => (
    <div className="p-1 h-full flex flex-col">
      {/* Ultra-Compact Search Row */}
      <div className="flex items-center gap-1 mb-1 shrink-0">
        <div className="flex-1 relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
          <input
            type="text"
            placeholder="Search... (try 'tx aws')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-6 pr-2 py-1 bg-[#0d1117] border border-[#30363d] rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-red-500/50"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="px-2 py-1 bg-[#0d1117] border border-[#30363d] rounded text-xs text-white focus:outline-none"
        >
          <option value="all">All</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="medium">Medium</option>
          <option value="low">Low</option>
        </select>
        <div className="flex items-center gap-0.5 bg-[#21262d] rounded p-0.5">
          <button 
            onClick={() => setTargetViewMode('table')}
            className={`p-0.5 rounded ${targetViewMode === 'table' ? 'bg-[#30363d] text-white' : 'text-gray-500'}`}
          >
            <Layers className="w-3 h-3" />
          </button>
          <button 
            onClick={() => setTargetViewMode('cards')}
            className={`p-0.5 rounded ${targetViewMode === 'cards' ? 'bg-[#30363d] text-white' : 'text-gray-500'}`}
          >
            <Network className="w-3 h-3" />
          </button>
        </div>
        <span className="text-[10px] text-gray-500 whitespace-nowrap">{filteredTargets.length} targets</span>
      </div>
      
      <div className="flex gap-1 flex-1 overflow-hidden">
        {/* LEFT SIDEBAR - Quick Filters (Collapsible) - Narrow */}
        {leftSidebarOpen && (
          <div className="w-36 flex-shrink-0 flex flex-col bg-[#0d1117] border border-[#30363d] rounded overflow-hidden">
            <div className="px-2 py-1 border-b border-[#30363d] flex items-center justify-between">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase">Filters</h4>
              <button onClick={() => setLeftSidebarOpen(false)} className="text-gray-500 hover:text-white">
                <ChevronLeft className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-1.5 space-y-2">
              {/* Operators Quick Select */}
              <div>
                <div className="text-[10px] text-gray-500 mb-1">Top Operators</div>
                <div className="space-y-0.5">
                  {Object.entries(
                    filteredTargets.reduce((acc, t) => {
                      acc[t.operator] = (acc[t.operator] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort(([, a], [, b]) => b - a).slice(0, 8).map(([op, count]) => (
                    <button 
                      key={op}
                      onClick={() => setSearchQuery(op.toLowerCase())}
                      className={`w-full flex items-center justify-between px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                        searchQuery.toLowerCase().includes(op.toLowerCase()) 
                          ? 'bg-blue-500/20 text-blue-400' 
                          : 'bg-[#21262d] text-gray-300 hover:bg-[#30363d]'
                      }`}
                    >
                      <span className="truncate">{op}</span>
                      <span className="text-gray-500">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* States Quick Select */}
              <div>
                <div className={`${d.text} text-gray-500 mb-1.5`}>Top States</div>
                <div className="space-y-1">
                  {Object.entries(
                    filteredTargets.reduce((acc, t) => {
                      acc[t.location.state] = (acc[t.location.state] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)
                  ).sort(([, a], [, b]) => b - a).slice(0, 6).map(([state, count]) => (
                    <button 
                      key={state}
                      onClick={() => setSearchQuery(state.toLowerCase())}
                      className={`w-full flex items-center justify-between ${d.paddingX} ${d.paddingY} ${d.text} rounded transition-colors ${
                        searchQuery.toLowerCase().includes(state.toLowerCase()) 
                          ? 'bg-green-500/20 text-green-400' 
                          : 'bg-[#21262d] text-gray-300 hover:bg-[#30363d]'
                      }`}
                    >
                      <span>{state}</span>
                      <span className="text-gray-500">{count}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Priority Quick Filter */}
              <div>
                <div className="text-[10px] text-gray-500 mb-1">Priority</div>
                <div className="space-y-0.5">
                  {[
                    { key: 'critical', label: '🔴 Crit', color: 'red', count: targetsByPriority.critical.length },
                    { key: 'high', label: '🟠 High', color: 'orange', count: targetsByPriority.high.length },
                    { key: 'medium', label: '🟡 Med', color: 'yellow', count: targetsByPriority.medium.length },
                    { key: 'low', label: '⚪ Low', color: 'gray', count: targetsByPriority.low.length },
                  ].map(({ key, label, color, count }) => (
                    <button 
                      key={key}
                      onClick={() => setPriorityFilter(priorityFilter === key ? 'all' : key)}
                      className={`w-full flex items-center justify-between px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                        priorityFilter === key 
                          ? `bg-${color}-500/20 text-${color}-400` 
                          : 'bg-[#21262d] text-gray-300 hover:bg-[#30363d]'
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`text-${color}-400 font-bold`}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Clear Filters */}
              {(searchQuery || priorityFilter !== 'all') && (
                <button 
                  onClick={() => { setSearchQuery(''); setPriorityFilter('all'); }}
                  className="w-full px-1.5 py-0.5 text-[10px] bg-red-500/20 text-red-400 rounded hover:bg-red-500/30"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        )}
        {/* Main Content Area - Full Height */}
        <div className="flex-1 min-w-0 overflow-y-auto bg-[#0d1117] rounded border border-[#30363d]">
          {/* EMPTY STATE - Show when no targets */}
          {filteredTargets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-4 bg-gradient-to-b from-[#0d1117] to-[#161b22] rounded border border-[#30363d]">
              <div className="text-center max-w-md">
                {/* Icon */}
                <div className="mb-3 p-3 bg-red-500/10 rounded-full inline-block">
                  <Target className="w-8 h-8 text-red-400" />
                </div>
                
                {/* Message */}
                <h3 className="text-lg font-semibold text-white mb-2">No Organizing Targets Found</h3>
                <p className="text-sm text-gray-400 mb-4">
                  {facilities.length === 0 
                    ? 'Import facility data to begin identifying organizing opportunities.'
                    : searchQuery 
                      ? `No targets match "${searchQuery}". Try different keywords.`
                      : 'No targets match current filters. Adjust priority filter above.'}
                </p>
                
                {/* Quick Actions */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button 
                    onClick={() => { setSearchQuery(''); setPriorityFilter('all'); }}
                    className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] text-white text-xs rounded border border-[#30363d] transition-colors"
                  >
                    Clear Filters
                  </button>
                  <button className="px-3 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 text-xs rounded border border-red-500/30 transition-colors">
                    Import Data
                  </button>
                </div>
                
                {/* Helpful Info - Fills Space */}
                <div className="mt-4 p-3 bg-[#0d1117] rounded border border-[#30363d] text-left">
                  <div className="text-xs font-semibold text-gray-300 mb-2">📊 What This View Shows:</div>
                  <ul className="text-xs text-gray-500 space-y-1.5">
                    <li className="flex items-start gap-2">
                      <span className="text-red-400">•</span>
                      <span>Facilities ranked by organizing potential (structural, vulnerability, strategic scores)</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-orange-400">•</span>
                      <span>Worker concentration & contractor fragmentation analysis</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-yellow-400">•</span>
                      <span>IBEW local alignment & corridor intelligence integration</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-blue-400">•</span>
                      <span>Search by operator, state, city (e.g., "tx aws" or "google")</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          ) : targetViewMode === 'table' ? (
            /* HIGH-DENSITY TABLE VIEW with Priority Groups - Auto-expand first group */
            <div className="space-y-0.5 p-1">
              {/* Priority Group Headers with Accordions */}
              {[
                { key: 'critical', label: 'Critical', targets: targetsByPriority.critical, color: 'red', bg: 'bg-red-500/10', icon: '🔴' },
                { key: 'high', label: 'High', targets: targetsByPriority.high, color: 'orange', bg: 'bg-orange-500/10', icon: '🟠' },
                { key: 'medium', label: 'Medium', targets: targetsByPriority.medium, color: 'yellow', bg: 'bg-yellow-500/10', icon: '🟡' },
                { key: 'low', label: 'Low', targets: targetsByPriority.low, color: 'gray', bg: 'bg-gray-500/10', icon: '⚪' },
              ].map(group => group.targets.length > 0 && (
                <div key={group.key} className={`${group.bg} border border-${group.color}-500/20 rounded overflow-hidden`}>
                  {/* Group Header - Compact */}
                  <button
                    onClick={() => toggleRiskGroup(`target-${group.key}`)}
                    className="w-full px-1.5 py-0.5 flex items-center justify-between hover:bg-black/20 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span className="text-[10px]">{group.icon}</span>
                      <span className={`text-[10px] font-bold text-${group.color}-400`}>{group.label}</span>
                      <span className="text-[10px] text-gray-500">({group.targets.length})</span>
                      <span className="text-[9px] text-gray-600">
                        • {group.targets.reduce((sum, t) => sum + t.structuralFactors.workerConcentration, 0).toLocaleString()} wkrs
                      </span>
                    </div>
                    {expandedRiskGroups.has(`target-${group.key}`) 
                      ? <ChevronDown className="w-3 h-3 text-gray-500" /> 
                      : <ChevronRight className="w-3 h-3 text-gray-500" />}
                  </button>
                  
                  {/* Expanded Table - NO HEIGHT LIMIT for data density */}
                  {expandedRiskGroups.has(`target-${group.key}`) && (
                    <div className="border-t border-[#30363d]">
                      {/* Table Header - Ultra Compact */}
                      <div className="grid grid-cols-12 gap-0.5 px-1 py-0.5 bg-[#0d1117] text-[9px] text-gray-500 font-medium sticky top-0">
                        <div className="col-span-4">Facility / Operator</div>
                        <div className="col-span-2">Location</div>
                        <div className="col-span-1 text-center">Wkrs</div>
                        <div className="col-span-1 text-center">Union</div>
                        <div className="col-span-2 text-center">Score</div>
                        <div className="col-span-2 text-center">Status</div>
                      </div>
                      
                      {/* Table Rows - Show all items, ultra compact */}
                      {group.targets.map(target => (
                        <div key={target.facilityId} className="border-t border-[#21262d]/50">
                          {/* Main Row - Ultra Compact */}
                          <div 
                            onClick={() => toggleTargetRow(target.facilityId)}
                            className={`grid grid-cols-12 gap-0.5 px-1 py-0.5 text-[10px] cursor-pointer hover:bg-[#161b22] transition-colors ${
                              expandedTargetRows.has(target.facilityId) ? 'bg-[#161b22]' : ''
                            }`}
                          >
                            <div className="col-span-4 flex items-center gap-1 min-w-0">
                              {expandedTargetRows.has(target.facilityId) 
                                ? <ChevronDown className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />
                                : <ChevronRight className="w-2.5 h-2.5 text-gray-500 flex-shrink-0" />}
                              <div className="truncate">
                                <span className="text-white" title={target.facilityName}>{target.facilityName}</span>
                                <span className="text-gray-500 ml-1">({target.operator})</span>
                              </div>
                            </div>
                            <div className="col-span-2 text-gray-400 truncate">{target.location.city}, {target.location.state}</div>
                            <div className="col-span-1 text-center text-blue-400 font-bold">
                              {target.structuralFactors.workerConcentration}
                            </div>
                            <div className="col-span-1 text-center">
                              <span className={`px-1 py-0 text-[9px] font-medium rounded ${
                                target.suggestedUnion === 'IBEW' ? 'bg-yellow-500/20 text-yellow-400' :
                                target.suggestedUnion === 'CODE-CWA' ? 'bg-blue-500/20 text-blue-400' :
                                target.suggestedUnion === 'BOTH' ? 'bg-purple-500/20 text-purple-400' :
                                'bg-gray-500/20 text-gray-400'
                              }`}>
                                {target.suggestedUnion}
                              </span>
                            </div>
                            <div className="col-span-2 flex items-center gap-0.5">
                              <div className="flex-1 h-1 bg-[#21262d] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${
                                    target.overallScore >= 80 ? 'bg-red-500' :
                                    target.overallScore >= 60 ? 'bg-orange-500' :
                                    target.overallScore >= 40 ? 'bg-yellow-500' : 'bg-green-500'
                                  }`}
                                  style={{ width: `${target.overallScore}%` }}
                                />
                              </div>
                              <span className={`font-bold min-w-[18px] text-right ${
                                target.overallScore >= 80 ? 'text-red-400' :
                                target.overallScore >= 60 ? 'text-orange-400' :
                                target.overallScore >= 40 ? 'text-yellow-400' : 'text-gray-400'
                              }`}>
                                {target.overallScore}
                              </span>
                            </div>
                            <div className="col-span-2 text-center">
                              <span className={`px-1 py-0 text-[9px] rounded ${
                                target.complianceStatus === 'Non-Compliant' ? 'bg-red-500/20 text-red-400' :
                                target.complianceStatus === 'At Risk' ? 'bg-yellow-500/20 text-yellow-400' :
                                'bg-green-500/20 text-green-400'
                              }`}>
                                {target.complianceStatus === 'Non-Compliant' ? 'NC' : target.complianceStatus === 'At Risk' ? 'AR' : 'OK'}
                              </span>
                            </div>
                          </div>
                          
                          {/* Expanded Row with Mini-Tabs */}
                          {expandedTargetRows.has(target.facilityId) && (
                            <div className="px-3 py-2 bg-[#0d1117] border-t border-[#21262d]">
                              {/* Mini Tab Navigation */}
                              <div className="flex gap-1 mb-2 border-b border-[#30363d] pb-2">
                                {(['overview', 'scores', 'factors', 'intel', 'actions'] as const).map(tab => (
                                  <button
                                    key={tab}
                                    onClick={(e) => { e.stopPropagation(); setTargetTab(target.facilityId, tab); }}
                                    className={`px-2 py-1 text-xs rounded transition-colors ${
                                      getTargetDetailTab(target.facilityId) === tab 
                                        ? 'bg-red-600 text-white' 
                                        : 'text-gray-400 hover:text-white hover:bg-[#21262d]'
                                    }`}
                                  >
                                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                                  </button>
                                ))}
                              </div>
                              
                              {/* Tab Content */}
                              <div className="text-xs">
                                {getTargetDetailTab(target.facilityId) === 'overview' && (
                                  <div className="grid grid-cols-4 gap-3">
                                    <div className="bg-[#161b22] p-2 rounded">
                                      <div className="text-gray-500 mb-1">Priority</div>
                                      <PriorityBadge priority={target.priority} />
                                    </div>
                                    <div className="bg-[#161b22] p-2 rounded">
                                      <div className="text-gray-500 mb-1">Direct Employment</div>
                                      <div className="text-white font-medium">{Math.round(target.structuralFactors.directEmploymentRatio)}%</div>
                                    </div>
                                    <div className="bg-[#161b22] p-2 rounded">
                                      <div className="text-gray-500 mb-1">Colocation</div>
                                      <div className="text-white font-medium">{target.structuralFactors.colocationModel ? 'Yes' : 'No'}</div>
                                    </div>
                                    <div className="bg-[#161b22] p-2 rounded">
                                      <div className="text-gray-500 mb-1">Traffic Share</div>
                                      <div className="text-white font-medium truncate">{target.strategicFactors.trafficShare}%</div>
                                    </div>
                                  </div>
                                )}
                                
                                {getTargetDetailTab(target.facilityId) === 'scores' && (
                                  <div className="flex items-center justify-around py-2">
                                    <ScoreGauge score={target.structuralScore} label="Structural" color="#3b82f6" size="sm" />
                                    <ScoreGauge score={target.vulnerabilityScore} label="Vulnerability" color="#f59e0b" size="sm" />
                                    <ScoreGauge score={target.strategicScore} label="Strategic" color="#22c55e" size="sm" />
                                    <ScoreGauge score={target.overallScore} label="Overall" color={target.priority === 'critical' ? '#ef4444' : '#f97316'} size="sm" />
                                  </div>
                                )}
                                
                                {getTargetDetailTab(target.facilityId) === 'factors' && (
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="space-y-1">
                                      <div className="text-gray-500 font-medium">Structural Factors</div>
                                      <div className="flex justify-between p-1.5 bg-[#161b22] rounded">
                                        <span className="text-gray-400">Worker Count</span>
                                        <span className="text-white">{target.structuralFactors.workerConcentration}</span>
                                      </div>
                                      <div className="flex justify-between p-1.5 bg-[#161b22] rounded">
                                        <span className="text-gray-400">Direct Ratio</span>
                                        <span className="text-white">{Math.round(target.structuralFactors.directEmploymentRatio)}%</span>
                                      </div>
                                    </div>
                                    <div className="space-y-1">
                                      <div className="text-gray-500 font-medium">Vulnerability</div>
                                      <div className="flex justify-between p-1.5 bg-[#161b22] rounded">
                                        <span className="text-gray-400">Glassdoor</span>
                                        <span className={target.vulnerabilityFactors.glassdoorRating < 3 ? 'text-red-400' : 'text-yellow-400'}>{target.vulnerabilityFactors.glassdoorRating}/5</span>
                                      </div>
                                      <div className="flex justify-between p-1.5 bg-[#161b22] rounded">
                                        <span className="text-gray-400">Turnover</span>
                                        <span className={target.vulnerabilityFactors.turnoverRate > 20 ? 'text-red-400' : 'text-gray-300'}>{target.vulnerabilityFactors.turnoverRate}%</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {getTargetDetailTab(target.facilityId) === 'intel' && (
                                  <div className="space-y-1">
                                    <div className="flex justify-between p-1.5 bg-[#161b22] rounded">
                                      <span className="text-gray-400">IBEW Presence</span>
                                      <span className={target.structuralFactors.ibewPresence ? 'text-green-400' : 'text-gray-500'}>
                                        {target.structuralFactors.ibewPresence ? 'Yes' : 'No'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between p-1.5 bg-[#161b22] rounded">
                                      <span className="text-gray-400">Community Opposition</span>
                                      <span className={target.strategicFactors.communityOpposition ? 'text-green-400' : 'text-gray-500'}>
                                        {target.strategicFactors.communityOpposition ? 'Active' : 'None'}
                                      </span>
                                    </div>
                                    <div className="flex justify-between p-1.5 bg-[#161b22] rounded">
                                      <span className="text-gray-400">Subsidy Accountability</span>
                                      <span className="text-green-400">${(target.strategicFactors.subsidyAccountability / 1000000).toFixed(1)}M</span>
                                    </div>
                                  </div>
                                )}
                                
                                {getTargetDetailTab(target.facilityId) === 'actions' && (
                                  <div className="flex flex-wrap gap-2">
                                    <button className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] flex items-center gap-1">
                                      <FileText className="w-3 h-3" />
                                      File NLRB
                                    </button>
                                    <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      Contact Union
                                    </button>
                                    <button className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-[10px] flex items-center gap-1">
                                      <Zap className="w-3 h-3" />
                                      IBEW Local
                                    </button>
                                    <button className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded text-[10px] flex items-center gap-1">
                                      <Download className="w-3 h-3" />
                                      Export
                                    </button>
                                    <button className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded text-[10px] flex items-center gap-1">
                                      <Star className="w-3 h-3" />
                                      Track
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                      {group.targets.length > 15 && (
                        <div className="px-3 py-2 text-center text-xs text-gray-500 border-t border-[#21262d]">
                          +{group.targets.length - 15} more targets
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* CARD VIEW - More compact version */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {filteredTargets.slice(0, 12).map(target => (
                <div
                  key={target.facilityId}
                  className={`bg-[#0d1117] border rounded-lg overflow-hidden cursor-pointer ${
                    selectedTarget?.facilityId === target.facilityId
                      ? 'border-red-500 ring-1 ring-red-500/20'
                      : 'border-[#30363d] hover:border-[#484f58]'
                  }`}
                  onClick={() => setSelectedTarget(selectedTarget?.facilityId === target.facilityId ? null : target)}
                >
                  <div className="p-3 border-b border-[#30363d]">
                    <div className="flex items-start justify-between mb-1">
                      <div className="min-w-0">
                        <h3 className="text-white font-semibold text-sm truncate">{target.facilityName}</h3>
                        <p className="text-xs text-gray-400">{target.operator}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <PriorityBadge priority={target.priority} />
                        <UnionBadge union={target.suggestedUnion} />
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <MapPin className="w-3 h-3" />
                      {target.location.city}, {target.location.state}
                    </div>
                  </div>
                  <div className="p-3 flex items-center justify-around">
                    <ScoreGauge score={target.structuralScore} label="Struct" color="#3b82f6" size="sm" />
                    <ScoreGauge score={target.vulnerabilityScore} label="Vuln" color="#f59e0b" size="sm" />
                    <ScoreGauge score={target.strategicScore} label="Strat" color="#22c55e" size="sm" />
                    <ScoreGauge score={target.overallScore} label="Total" color={target.priority === 'critical' ? '#ef4444' : '#f97316'} size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* RIGHT SIDEBAR - Stats & Quick Actions (Collapsible) - Narrow */}
        {rightSidebarOpen && (
          <div className="w-40 flex-shrink-0 flex flex-col bg-[#0d1117] border border-[#30363d] rounded overflow-hidden">
            <div className="px-2 py-1 border-b border-[#30363d] flex items-center justify-between">
              <h4 className="text-[10px] font-semibold text-gray-400 uppercase">Stats</h4>
              <button onClick={() => setRightSidebarOpen(false)} className="text-gray-500 hover:text-white">
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
            <div className="flex-1 flex flex-col gap-1 overflow-y-auto p-1.5">
              {/* Priority Summary - Ultra Compact */}
              <div className="bg-[#161b22] border border-[#30363d] rounded p-1.5">
                <h4 className="text-[9px] font-semibold text-gray-500 mb-1 uppercase">Priority</h4>
                <div className="space-y-0.5">
                  {[
                    { label: 'Crit', count: targetsByPriority.critical.length, color: 'red', icon: '🔴' },
                    { label: 'High', count: targetsByPriority.high.length, color: 'orange', icon: '🟠' },
                    { label: 'Med', count: targetsByPriority.medium.length, color: 'yellow', icon: '🟡' },
                    { label: 'Low', count: targetsByPriority.low.length, color: 'gray', icon: '⚪' },
                  ].map(({ label, count, color, icon }) => (
                    <button
                      key={label}
                      onClick={() => setPriorityFilter(priorityFilter === label.toLowerCase() ? 'all' : label.toLowerCase())}
                      className={`w-full flex items-center justify-between px-1 py-0.5 text-[10px] rounded transition-colors ${
                        priorityFilter === label.toLowerCase() 
                          ? `bg-${color}-500/20 border border-${color}-500/50` 
                          : 'hover:bg-[#21262d]'
                      }`}
                    >
                      <span className={`text-${color}-400`}>{icon} {label}</span>
                      <span className={`font-bold text-${color}-400 ${count > 0 ? '' : 'opacity-50'}`}>{count}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Top Operators - Compact */}
              <div className="bg-[#161b22] border border-[#30363d] rounded p-1.5 flex-1 overflow-y-auto">
                <h4 className="text-[9px] font-semibold text-gray-500 mb-1 uppercase">Operators</h4>
                {filteredTargets.length > 0 ? (
                  <div className="space-y-0.5">
                    {Object.entries(
                      filteredTargets.reduce((acc, t) => {
                        acc[t.operator] = (acc[t.operator] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    ).sort(([, a], [, b]) => b - a).slice(0, 10).map(([op, count]) => (
                      <button 
                        key={op} 
                        onClick={() => setSearchQuery(op.toLowerCase())}
                        className="w-full flex items-center justify-between text-[10px] hover:bg-[#21262d] px-1 py-0.5 rounded transition-colors"
                      >
                        <span className="text-gray-300 truncate">{op}</span>
                        <span className="text-blue-400 font-bold">{count}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] text-gray-600">No data</div>
                )}
              </div>
              
              {/* Quick Actions - Compact */}
              <div className="bg-[#161b22] border border-[#30363d] rounded p-1.5">
                <h4 className="text-[9px] font-semibold text-gray-500 mb-1 uppercase">Quick</h4>
                <div className="grid grid-cols-2 gap-0.5">
                  <button 
                    onClick={() => setSearchQuery('ibew')}
                    className="px-1 py-0.5 text-[9px] bg-[#21262d] hover:bg-[#30363d] rounded text-yellow-400 truncate"
                  >
                    ⚡IBEW
                  </button>
                  <button 
                    onClick={() => setSearchQuery('virginia')}
                    className="px-1 py-0.5 text-[9px] bg-[#21262d] hover:bg-[#30363d] rounded text-blue-400 truncate"
                  >
                    📍NoVA
                  </button>
                  <button 
                    onClick={() => setSearchQuery('texas')}
                    className="px-1 py-0.5 text-[9px] bg-[#21262d] hover:bg-[#30363d] rounded text-green-400 truncate"
                  >
                    📍Texas
                  </button>
                  <button 
                    onClick={() => setSearchQuery('aws')}
                    className="px-1 py-0.5 text-[9px] bg-[#21262d] hover:bg-[#30363d] rounded text-orange-400 truncate"
                  >
                    ☁️AWS
                  </button>
                </div>
              </div>
              
              {/* Tips - Compact */}
              <div className="bg-gradient-to-b from-red-500/5 to-red-500/10 border border-red-500/20 rounded p-1.5">
                <h4 className="text-[9px] font-semibold text-red-400 mb-0.5 uppercase">💡 Tips</h4>
                <div className="text-[9px] text-gray-400 space-y-0.5">
                  <p>• <span className="text-white">Critical</span> = high wkrs + low union</p>
                  <p>• Focus on <span className="text-blue-400">corridors</span></p>
                  <p>• Check <span className="text-yellow-400">IBEW locals</span></p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  
  // =============================================================================
  // RENDER: CONTRACTOR MAPPING - HIGH DENSITY VERSION
  // =============================================================================
  
  // State for contractor section
  const [contractorView, setContractorView] = useState<'table' | 'cards'>('table');
  const [expandedContractors, setExpandedContractors] = useState<Set<string>>(new Set());
  const [contractorDetailTab, setContractorDetailTab] = useState<Record<string, 'overview' | 'issues' | 'intel' | 'actions'>>({});
  const [expandedRiskGroups, setExpandedRiskGroups] = useState<Set<string>>(new Set(['high', 'moderate', 'target-high', 'target-medium']));
  
  // Toggle contractor expansion
  const toggleContractor = (name: string) => {
    setExpandedContractors(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };
  
  // Toggle risk group
  const toggleRiskGroup = (group: string) => {
    setExpandedRiskGroups(prev => {
      const next = new Set(prev);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });
  };
  
  // Get contractor detail tab
  const getContractorTab = (name: string) => contractorDetailTab[name] || 'overview';
  const setContractorTab = (name: string, tab: 'overview' | 'issues' | 'intel' | 'actions') => {
    setContractorDetailTab(prev => ({ ...prev, [name]: tab }));
  };
  
  // Calculate risk score for contractor
  const getContractorRisk = (data: typeof KNOWN_CONTRACTORS[keyof typeof KNOWN_CONTRACTORS]) => {
    const issueScore = data.issues.length * 25;
    const workerScore = parseInt(data.workerCount.replace(/\D/g, '')) > 1000 ? 20 : 10;
    return Math.min(issueScore + workerScore, 100);
  };
  
  // Group contractors by risk
  const contractorsByRisk = useMemo(() => {
    const groups: Record<string, Array<[string, typeof KNOWN_CONTRACTORS[keyof typeof KNOWN_CONTRACTORS]]>> = {
      high: [],
      moderate: [],
      low: []
    };
    Object.entries(KNOWN_CONTRACTORS).forEach(([name, data]) => {
      const risk = getContractorRisk(data);
      if (risk >= 70) groups.high.push([name, data]);
      else if (risk >= 40) groups.moderate.push([name, data]);
      else groups.low.push([name, data]);
    });
    return groups;
  }, []);
  
  const renderContractorSection = () => (
    <div className="p-4">
      {/* Compact Header with View Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-purple-500/20 rounded">
            <Briefcase className="w-4 h-4 text-purple-400" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">Contractor Analysis</h2>
            <p className="text-xs text-gray-500">{Object.keys(KNOWN_CONTRACTORS).length} agencies • {Object.values(KNOWN_CONTRACTORS).reduce((s, d) => s + parseInt(d.workerCount.replace(/\D/g, '')), 0).toLocaleString()}+ workers</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex bg-[#21262d] rounded-lg p-0.5">
            <button
              onClick={() => setContractorView('table')}
              className={`px-2 py-1 text-xs rounded ${contractorView === 'table' ? 'bg-[#30363d] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <BarChart3 className="w-3 h-3" />
            </button>
            <button
              onClick={() => setContractorView('cards')}
              className={`px-2 py-1 text-xs rounded ${contractorView === 'cards' ? 'bg-[#30363d] text-white' : 'text-gray-400 hover:text-white'}`}
            >
              <Layers className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
      
      <div className="flex gap-4">
        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          {contractorView === 'table' ? (
            /* TABLE VIEW - High Density Expandable */
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#161b22] border-b border-[#30363d] text-xs font-medium text-gray-400">
                <div className="col-span-3">Contractor</div>
                <div className="col-span-2 text-right">Workers</div>
                <div className="col-span-2">Operators</div>
                <div className="col-span-2 text-center">Issues</div>
                <div className="col-span-2">Risk</div>
                <div className="col-span-1"></div>
              </div>
              
              {/* Risk Groups */}
              {[
                { key: 'high', label: 'High Risk', color: 'red', icon: '🔴' },
                { key: 'moderate', label: 'Moderate Risk', color: 'yellow', icon: '🟡' },
                { key: 'low', label: 'Low Risk', color: 'green', icon: '🟢' },
              ].map(group => {
                const contractors = contractorsByRisk[group.key];
                if (contractors.length === 0) return null;
                const isExpanded = expandedRiskGroups.has(group.key);
                
                return (
                  <div key={group.key}>
                    {/* Group Header */}
                    <button
                      onClick={() => toggleRiskGroup(group.key)}
                      className={`w-full grid grid-cols-12 gap-2 px-3 py-1.5 bg-${group.color}-500/10 border-b border-[#30363d] hover:bg-${group.color}-500/20 transition-colors`}
                    >
                      <div className="col-span-11 flex items-center gap-2 text-xs font-medium text-gray-300">
                        {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span>{group.icon}</span>
                        <span>{group.label}</span>
                        <span className="text-gray-500">({contractors.length})</span>
                        <span className="text-gray-500 ml-2">
                          {contractors.reduce((s, [_, d]) => s + parseInt(d.workerCount.replace(/\D/g, '')), 0).toLocaleString()}+ workers
                        </span>
                      </div>
                    </button>
                    
                    {/* Contractors in Group */}
                    {isExpanded && contractors.map(([name, data]) => {
                      const isRowExpanded = expandedContractors.has(name);
                      const risk = getContractorRisk(data);
                      const activeTab = getContractorTab(name);
                      
                      return (
                        <div key={name} className="border-b border-[#30363d] last:border-b-0">
                          {/* Compact Row */}
                          <button
                            onClick={() => toggleContractor(name)}
                            className="w-full grid grid-cols-12 gap-2 px-3 py-2 hover:bg-[#161b22] transition-colors text-left"
                          >
                            <div className="col-span-3 flex items-center gap-2">
                              {isRowExpanded ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
                              <span className="text-sm text-white font-medium truncate">{name}</span>
                            </div>
                            <div className="col-span-2 text-right text-sm text-gray-300">{data.workerCount}</div>
                            <div className="col-span-2 flex items-center gap-1">
                              {data.operators.slice(0, 2).map(op => (
                                <span key={op} className="px-1.5 py-0.5 bg-[#21262d] text-gray-400 text-[10px] rounded truncate max-w-[60px]">{op}</span>
                              ))}
                              {data.operators.length > 2 && <span className="text-[10px] text-gray-500">+{data.operators.length - 2}</span>}
                            </div>
                            <div className="col-span-2 flex items-center justify-center gap-1">
                              {data.issues.length > 0 ? (
                                <span className="flex items-center gap-1 text-xs text-red-400">
                                  <AlertTriangle className="w-3 h-3" />
                                  {data.issues.length}
                                </span>
                              ) : (
                                <span className="text-xs text-green-400">✓</span>
                              )}
                            </div>
                            <div className="col-span-2 flex items-center gap-2">
                              <div className="flex-1 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full ${risk >= 70 ? 'bg-red-500' : risk >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${risk}%` }}
                                />
                              </div>
                              <span className="text-[10px] text-gray-400 w-6">{risk}</span>
                            </div>
                            <div className="col-span-1 flex justify-end">
                              <button 
                                onClick={(e) => { e.stopPropagation(); /* TODO: Quick actions */ }}
                                className="p-1 hover:bg-[#30363d] rounded"
                              >
                                <ExternalLink className="w-3 h-3 text-gray-500" />
                              </button>
                            </div>
                          </button>
                          
                          {/* Expanded Detail with Mini-Tabs */}
                          {isRowExpanded && (
                            <div className="px-3 pb-3 bg-[#0a0d12]">
                              {/* Mini-Tabs */}
                              <div className="flex gap-1 mb-2 border-b border-[#30363d]">
                                {[
                                  { key: 'overview', label: 'Overview' },
                                  { key: 'issues', label: `Issues (${data.issues.length})` },
                                  { key: 'intel', label: 'Intel' },
                                  { key: 'actions', label: 'Actions' },
                                ].map(tab => (
                                  <button
                                    key={tab.key}
                                    onClick={() => setContractorTab(name, tab.key as typeof activeTab)}
                                    className={`px-2 py-1 text-[10px] font-medium border-b-2 transition-colors ${
                                      activeTab === tab.key 
                                        ? 'border-blue-500 text-blue-400' 
                                        : 'border-transparent text-gray-500 hover:text-gray-300'
                                    }`}
                                  >
                                    {tab.label}
                                  </button>
                                ))}
                              </div>
                              
                              {/* Tab Content */}
                              <div className="text-xs">
                                {activeTab === 'overview' && (
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <div className="text-gray-500 mb-1">Operators</div>
                                      <div className="flex flex-wrap gap-1">
                                        {data.operators.map(op => (
                                          <span key={op} className="px-1.5 py-0.5 bg-[#21262d] text-gray-300 rounded">{op}</span>
                                        ))}
                                      </div>
                                    </div>
                                    <div>
                                      <div className="text-gray-500 mb-1">Roles</div>
                                      <div className="flex flex-wrap gap-1">
                                        {data.roles.map(role => (
                                          <span key={role} className="px-1.5 py-0.5 bg-blue-500/20 text-blue-400 rounded">{role}</span>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                
                                {activeTab === 'issues' && (
                                  <div className="space-y-1.5">
                                    {data.issues.length > 0 ? data.issues.map((issue, i) => (
                                      <div key={i} className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded">
                                        <AlertTriangle className="w-3 h-3 text-red-400 mt-0.5 flex-shrink-0" />
                                        <span className="text-red-300">{issue}</span>
                                      </div>
                                    )) : (
                                      <div className="text-green-400 flex items-center gap-2">
                                        <Shield className="w-3 h-3" />
                                        No known issues reported
                                      </div>
                                    )}
                                  </div>
                                )}
                                
                                {activeTab === 'intel' && (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between p-2 bg-[#161b22] rounded">
                                      <span className="text-gray-400">Joint Employer Indicators</span>
                                      <span className="text-yellow-400 font-medium">3/6 present</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-[#161b22] rounded">
                                      <span className="text-gray-400">NLRB Activity</span>
                                      <span className="text-gray-300">None recent</span>
                                    </div>
                                    <div className="flex items-center justify-between p-2 bg-[#161b22] rounded">
                                      <span className="text-gray-400">Glassdoor Rating</span>
                                      <span className="text-yellow-400">3.2/5.0</span>
                                    </div>
                                  </div>
                                )}
                                
                                {activeTab === 'actions' && (
                                  <div className="flex flex-wrap gap-2">
                                    <button className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded flex items-center gap-1">
                                      <FileText className="w-3 h-3" />
                                      File NLRB
                                    </button>
                                    <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded flex items-center gap-1">
                                      <Phone className="w-3 h-3" />
                                      Contact
                                    </button>
                                    <button className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded flex items-center gap-1">
                                      <Download className="w-3 h-3" />
                                      Export
                                    </button>
                                    <button className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded flex items-center gap-1">
                                      <Target className="w-3 h-3" />
                                      Track
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : (
            /* CARDS VIEW - Original but more compact */
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {Object.entries(KNOWN_CONTRACTORS).map(([name, data]) => {
                const risk = getContractorRisk(data);
                return (
                  <div key={name} className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm text-white font-semibold">{name}</h4>
                        <span className="text-xs text-gray-500">{data.workerCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {data.issues.length > 0 && (
                          <span className="text-xs text-red-400 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {data.issues.length}
                          </span>
                        )}
                        <div className="w-12 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${risk >= 70 ? 'bg-red-500' : risk >= 40 ? 'bg-yellow-500' : 'bg-green-500'}`}
                            style={{ width: `${risk}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {data.operators.map(op => (
                        <span key={op} className="px-1.5 py-0.5 bg-[#21262d] text-gray-400 text-[10px] rounded">{op}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Sticky Sidebar - More Compact */}
        <div className="w-72 flex-shrink-0 hidden xl:block">
          <div className="sticky top-4 space-y-3">
            {/* Quick Stats */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3">
              <h4 className="text-xs font-semibold text-gray-400 mb-2">QUICK STATS</h4>
              <div className="grid grid-cols-2 gap-2 text-center">
                <div className="p-2 bg-red-500/10 rounded">
                  <div className="text-lg font-bold text-red-400">{contractorsByRisk.high.length}</div>
                  <div className="text-[10px] text-gray-500">High Risk</div>
                </div>
                <div className="p-2 bg-yellow-500/10 rounded">
                  <div className="text-lg font-bold text-yellow-400">{contractorsByRisk.moderate.length}</div>
                  <div className="text-[10px] text-gray-500">Moderate</div>
                </div>
              </div>
            </div>
            
            {/* Joint Employer Calculator - Collapsed */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleRiskGroup('calculator')}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#161b22]"
              >
                <div className="flex items-center gap-2">
                  <Scale className="w-4 h-4 text-yellow-400" />
                  <span className="text-xs font-semibold text-white">Joint Employer Calc</span>
                </div>
                {expandedRiskGroups.has('calculator') ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
              </button>
              {expandedRiskGroups.has('calculator') && (
                <div className="px-3 pb-3 border-t border-[#30363d]">
                  <JointEmployerCalculator />
                </div>
              )}
            </div>
            
            {/* NLRB Precedents - Collapsed */}
            <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleRiskGroup('precedents')}
                className="w-full px-3 py-2 flex items-center justify-between hover:bg-[#161b22]"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-semibold text-white">NLRB Precedents</span>
                </div>
                {expandedRiskGroups.has('precedents') ? <ChevronDown className="w-3 h-3 text-gray-500" /> : <ChevronRight className="w-3 h-3 text-gray-500" />}
              </button>
              {expandedRiskGroups.has('precedents') && (
                <div className="px-3 pb-3 border-t border-[#30363d] space-y-2 text-xs">
                  <div className="border-l-2 border-blue-500 pl-2 py-1">
                    <div className="text-white font-medium">Browning-Ferris (2023)</div>
                    <div className="text-gray-500">Indirect control = joint employer</div>
                  </div>
                  <div className="border-l-2 border-green-500 pl-2 py-1">
                    <div className="text-white font-medium">Google/Cognizant (2023)</div>
                    <div className="text-gray-500">YouTube contractors won</div>
                  </div>
                  <div className="border-l-2 border-yellow-500 pl-2 py-1">
                    <div className="text-white font-medium">Microsoft/Lionbridge (2022)</div>
                    <div className="text-gray-500">QA contractors organized</div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  
  // =============================================================================
  // RENDER: IBEW FOOTPRINT (HIGH-DENSITY TABLE)
  // =============================================================================
  
  const [ibewDetailTab, setIbewDetailTab] = useState<Record<number, 'contact' | 'targets' | 'actions'>>({});
  const getIbewTab = (localNum: number) => ibewDetailTab[localNum] || 'contact';
  const setLocalTab = (localNum: number, tab: 'contact' | 'targets' | 'actions') => {
    setIbewDetailTab(prev => ({ ...prev, [localNum]: tab }));
  };
  
  const renderIBEWSection = () => (
    <div className="p-4">
      {/* Compact Stats Row */}
      <div className="flex items-center gap-4 mb-4 p-3 bg-[#0d1117] border border-[#30363d] rounded-lg">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-yellow-400" />
          <span className="text-sm text-gray-400">IBEW Footprint:</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-yellow-400">{stats.totalIBEWMaintenanceWorkers.toLocaleString()}</span>
            <span className="text-xs text-gray-500">workers</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-blue-400">{stats.facilitiesWithIBEW}</span>
            <span className="text-xs text-gray-500">facilities</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-green-400">{stats.potentialOpsExpansion}</span>
            <span className="text-xs text-gray-500">expansion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-lg font-bold text-purple-400">{IBEW_LOCALS.length}</span>
            <span className="text-xs text-gray-500">locals</span>
          </div>
        </div>
      </div>
      
      {/* IBEW Table */}
      <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
        {/* Table Header */}
        <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#161b22] text-xs text-gray-500 font-medium border-b border-[#30363d]">
          <div className="col-span-3">Local</div>
          <div className="col-span-3">Jurisdiction</div>
          <div className="col-span-1 text-center">Workers</div>
          <div className="col-span-1 text-center">Facilities</div>
          <div className="col-span-1 text-center">Expansion</div>
          <div className="col-span-3 text-center">Contract Exp.</div>
        </div>
        
        {/* Table Rows */}
        {IBEW_LOCALS.map(local => (
          <div key={local.localNumber} className="border-b border-[#21262d] last:border-b-0">
            {/* Main Row */}
            <div 
              onClick={() => toggleLocalExpansion(local.localNumber)}
              className={`grid grid-cols-12 gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[#161b22] transition-colors ${
                expandedLocals.has(local.localNumber) ? 'bg-[#161b22]' : ''
              }`}
            >
              <div className="col-span-3 flex items-center gap-2">
                {expandedLocals.has(local.localNumber) 
                  ? <ChevronDown className="w-3 h-3 text-yellow-500 flex-shrink-0" />
                  : <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                <Zap className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                <span className="text-white font-medium truncate">{local.localName}</span>
              </div>
              <div className="col-span-3 text-gray-400 truncate">{local.jurisdiction}</div>
              <div className="col-span-1 text-center text-yellow-400 font-bold">{local.maintenanceWorkers}</div>
              <div className="col-span-1 text-center text-blue-400 font-medium">{local.facilitiesCovered}</div>
              <div className="col-span-1 text-center">
                <span className={`font-medium ${
                  local.expansionTargets.reduce((s, t) => s + t.potentialOpsWorkers, 0) > 100 
                    ? 'text-green-400' 
                    : 'text-gray-400'
                }`}>
                  +{local.expansionTargets.reduce((s, t) => s + t.potentialOpsWorkers, 0)}
                </span>
              </div>
              <div className="col-span-3 text-center">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  new Date(local.contractExpiration) < new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {local.contractExpiration}
                </span>
              </div>
            </div>
            
            {/* Expanded Row with Mini-Tabs */}
            {expandedLocals.has(local.localNumber) && (
              <div className="px-3 py-2 bg-[#0d1117] border-t border-[#21262d]">
                {/* Mini Tab Navigation */}
                <div className="flex gap-1 mb-2 border-b border-[#30363d] pb-2">
                  {(['contact', 'targets', 'actions'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={(e) => { e.stopPropagation(); setLocalTab(local.localNumber, tab); }}
                      className={`px-2 py-1 text-xs rounded transition-colors ${
                        getIbewTab(local.localNumber) === tab 
                          ? 'bg-yellow-600 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-[#21262d]'
                      }`}
                    >
                      {tab === 'contact' ? 'Contact Info' : tab === 'targets' ? `Expansion (${local.expansionTargets.length})` : 'Actions'}
                    </button>
                  ))}
                </div>
                
                {/* Tab Content */}
                <div className="text-xs">
                  {getIbewTab(local.localNumber) === 'contact' && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      <div className="bg-[#161b22] p-2 rounded">
                        <div className="text-gray-500 mb-1">Business Manager</div>
                        <div className="text-white font-medium">{local.businessManager}</div>
                      </div>
                      <div className="bg-[#161b22] p-2 rounded">
                        <div className="text-gray-500 mb-1">Phone</div>
                        <a href={`tel:${local.phone}`} className="text-blue-400 hover:text-blue-300 font-medium">{local.phone}</a>
                      </div>
                      <div className="bg-[#161b22] p-2 rounded">
                        <div className="text-gray-500 mb-1">Website</div>
                        <a href={local.website} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 flex items-center gap-1">
                          Visit <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="bg-[#161b22] p-2 rounded">
                        <div className="text-gray-500 mb-1">Contract Expires</div>
                        <div className="text-yellow-400 font-medium">{local.contractExpiration}</div>
                      </div>
                    </div>
                  )}
                  
                  {getIbewTab(local.localNumber) === 'targets' && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {local.expansionTargets.map(target => (
                        <div key={target.facilityId} className="flex items-center justify-between p-2 bg-[#161b22] rounded">
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">{target.facilityName}</div>
                            <div className="text-gray-500">{target.currentMaintenanceWorkers} maint → {target.potentialOpsWorkers} ops</div>
                          </div>
                          <span className={`ml-2 px-1.5 py-0.5 text-[10px] rounded ${
                            target.expansionDifficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                            target.expansionDifficulty === 'moderate' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                          }`}>
                            {target.expansionDifficulty}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {getIbewTab(local.localNumber) === 'actions' && (
                    <div className="flex flex-wrap gap-2">
                      <button className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-[10px] flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        Call Local
                      </button>
                      <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        Request Meeting
                      </button>
                      <button className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        Expansion Plan
                      </button>
                      <button className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded text-[10px] flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        Export Data
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
  
  // =============================================================================
  // RENDER: CORRIDOR INTELLIGENCE (HIGH-DENSITY TABLE)
  // =============================================================================
  
  const [expandedCorridors, setExpandedCorridors] = useState<Set<string>>(new Set());
  const [corridorViewMode, setCorridorViewMode] = useState<'table' | 'cards'>('table');
  
  const toggleCorridor = (id: string) => {
    setExpandedCorridors(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Sort corridors by traffic share
  const sortedCorridors = useMemo(() => {
    return Object.entries(DATA_CENTER_CORRIDORS).sort(([, a], [, b]) => b.trafficShare - a.trafficShare);
  }, []);
  
  const renderCorridorSection = () => (
    <div className="p-4">
      {/* Compact Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <MapPin className="w-5 h-5 text-blue-400" />
          <span className="text-sm text-gray-400">
            {Object.keys(DATA_CENTER_CORRIDORS).length} corridors • 
            {Object.values(DATA_CENTER_CORRIDORS).reduce((sum, c) => sum + c.facilities, 0)} facilities • 
            {(Object.values(DATA_CENTER_CORRIDORS).reduce((sum, c) => sum + c.estimatedWorkers, 0) / 1000).toFixed(0)}K workers
          </span>
        </div>
        <div className="flex items-center gap-1 bg-[#21262d] rounded p-0.5">
          <button 
            onClick={() => setCorridorViewMode('table')}
            className={`p-1.5 rounded ${corridorViewMode === 'table' ? 'bg-[#30363d] text-white' : 'text-gray-500'}`}
            title="Table View"
          >
            <Layers className="w-4 h-4" />
          </button>
          <button 
            onClick={() => setCorridorViewMode('cards')}
            className={`p-1.5 rounded ${corridorViewMode === 'cards' ? 'bg-[#30363d] text-white' : 'text-gray-500'}`}
            title="Card View"
          >
            <Network className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Critical Alert - Compact */}
      <div className="mb-4 p-2 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
        <span className="text-xs text-gray-300">
          <span className="text-red-400 font-medium">Chokepoint Alert:</span> Northern Virginia handles 70% of US internet traffic. 
          3-5 facilities = 2B+ users affected.
        </span>
      </div>
      
      {corridorViewMode === 'table' ? (
        /* HIGH-DENSITY TABLE VIEW */
        <div className="bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden">
          {/* Table Header */}
          <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-[#161b22] text-xs text-gray-500 font-medium border-b border-[#30363d]">
            <div className="col-span-3">Corridor</div>
            <div className="col-span-2">States</div>
            <div className="col-span-2 text-center">Traffic</div>
            <div className="col-span-1 text-center">Sites</div>
            <div className="col-span-1 text-center">Workers</div>
            <div className="col-span-1 text-center">IBEW</div>
            <div className="col-span-2 text-center">Impact</div>
          </div>
          
          {/* Table Rows */}
          {sortedCorridors.map(([id, corridor]) => (
            <div key={id} className="border-b border-[#21262d] last:border-b-0">
              {/* Main Row */}
              <div 
                onClick={() => toggleCorridor(id)}
                className={`grid grid-cols-12 gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-[#161b22] transition-colors ${
                  expandedCorridors.has(id) ? 'bg-[#161b22]' : ''
                } ${corridor.trafficShare > 0.5 ? 'border-l-2 border-red-500' : corridor.trafficShare > 0.1 ? 'border-l-2 border-orange-500' : ''}`}
              >
                <div className="col-span-3 flex items-center gap-2">
                  {expandedCorridors.has(id) 
                    ? <ChevronDown className="w-3 h-3 text-gray-500 flex-shrink-0" />
                    : <ChevronRight className="w-3 h-3 text-gray-500 flex-shrink-0" />}
                  <span className="text-white font-medium truncate">{corridor.name}</span>
                  {corridor.trafficShare > 0.5 && (
                    <span className="px-1 py-0.5 text-[9px] bg-red-500/20 text-red-400 rounded font-bold">CRITICAL</span>
                  )}
                </div>
                <div className="col-span-2 text-gray-400 text-xs truncate">{corridor.states.join(', ')}</div>
                <div className="col-span-2">
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          corridor.trafficShare > 0.5 ? 'bg-red-500' :
                          corridor.trafficShare > 0.1 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${corridor.trafficShare * 100}%` }}
                      />
                    </div>
                    <span className={`text-xs font-bold min-w-[32px] text-right ${
                      corridor.trafficShare > 0.5 ? 'text-red-400' :
                      corridor.trafficShare > 0.1 ? 'text-orange-400' : 'text-blue-400'
                    }`}>
                      {(corridor.trafficShare * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="col-span-1 text-center text-blue-400 font-medium">{corridor.facilities}</div>
                <div className="col-span-1 text-center text-green-400 font-medium">{(corridor.estimatedWorkers / 1000).toFixed(1)}K</div>
                <div className="col-span-1 text-center text-yellow-400 font-medium">{corridor.ibewLocal}</div>
                <div className="col-span-2 text-center">
                  <span className={`text-xs px-1.5 py-0.5 rounded ${
                    corridor.trafficShare > 0.5 ? 'bg-red-500/20 text-red-400' :
                    corridor.trafficShare > 0.1 ? 'bg-orange-500/20 text-orange-400' :
                    'bg-gray-500/20 text-gray-400'
                  }`}>
                    {corridor.trafficShare > 0.5 ? 'CHOKEPOINT' : 
                     corridor.trafficShare > 0.1 ? 'STRATEGIC' : 'REGIONAL'}
                  </span>
                </div>
              </div>
              
              {/* Expanded Row */}
              {expandedCorridors.has(id) && (
                <div className="px-3 py-2 bg-[#0d1117] border-t border-[#21262d]">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Operators */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1.5">Major Operators:</div>
                      <div className="flex flex-wrap gap-1">
                        {corridor.majorOperators.map(op => (
                          <span key={op} className="px-1.5 py-0.5 bg-[#21262d] text-gray-300 text-[10px] rounded">{op}</span>
                        ))}
                      </div>
                    </div>
                    {/* Quick Actions */}
                    <div>
                      <div className="text-xs text-gray-500 mb-1.5">Actions:</div>
                      <div className="flex flex-wrap gap-1.5">
                        <button className="px-2 py-1 bg-yellow-600 hover:bg-yellow-700 text-white rounded text-[10px] flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          IBEW {corridor.ibewLocal}
                        </button>
                        <button className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-[10px] flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          View Facilities
                        </button>
                        <button className="px-2 py-1 bg-[#21262d] hover:bg-[#30363d] text-gray-300 rounded text-[10px] flex items-center gap-1">
                          <Download className="w-3 h-3" />
                          Export
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        /* CARD VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {sortedCorridors.map(([id, corridor]) => (
            <div key={id} className={`bg-[#0d1117] border border-[#30363d] rounded-lg overflow-hidden ${
              corridor.trafficShare > 0.5 ? 'ring-1 ring-red-500/30' : ''
            }`}>
              <div className={`p-3 ${
                corridor.trafficShare > 0.5 ? 'bg-gradient-to-r from-red-500/20 to-transparent' :
                corridor.trafficShare > 0.1 ? 'bg-gradient-to-r from-orange-500/20 to-transparent' :
                'bg-gradient-to-r from-blue-500/20 to-transparent'
              }`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-white font-semibold text-sm">{corridor.name}</h3>
                    <p className="text-xs text-gray-400">{corridor.states.join(', ')}</p>
                  </div>
                  {corridor.trafficShare > 0.5 && (
                    <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 text-[10px] font-bold rounded">CRITICAL</span>
                  )}
                </div>
              </div>
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-400">Traffic</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-16 h-1.5 bg-[#21262d] rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          corridor.trafficShare > 0.5 ? 'bg-red-500' : corridor.trafficShare > 0.1 ? 'bg-orange-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${corridor.trafficShare * 100}%` }}
                      />
                    </div>
                    <span className="text-white font-bold">{(corridor.trafficShare * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="p-1.5 bg-[#161b22] rounded">
                    <div className="text-sm font-bold text-blue-400">{corridor.facilities}</div>
                    <div className="text-[10px] text-gray-500">Sites</div>
                  </div>
                  <div className="p-1.5 bg-[#161b22] rounded">
                    <div className="text-sm font-bold text-green-400">{(corridor.estimatedWorkers / 1000).toFixed(1)}K</div>
                    <div className="text-[10px] text-gray-500">Workers</div>
                  </div>
                  <div className="p-1.5 bg-[#161b22] rounded">
                    <div className="text-sm font-bold text-yellow-400">{corridor.ibewLocal}</div>
                    <div className="text-[10px] text-gray-500">IBEW</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  // =============================================================================
  // MAIN RENDER
  // =============================================================================
  
  // AI Infrastructure has its own full layout
  if (activeSection === 'ai-infra') {
    return (
      <div className="min-h-full bg-[#0d1117]">
        {/* Minimal nav bar for returning to other sections */}
        <div className="border-b border-[#30363d] bg-[#161b22] px-4">
          <div className="flex items-center gap-2 py-2">
            {[
              { id: 'targets', label: 'Target Prioritization', icon: Target },
              { id: 'contractors', label: 'Contractors', icon: Users },
              { id: 'ibew', label: 'IBEW', icon: Zap },
              { id: 'corridors', label: 'Corridors', icon: MapPin },
              { id: 'ai-infra', label: '🛰️ AI Infrastructure', icon: Cpu, highlight: true },
            ].map(({ id, label, icon: Icon, highlight }) => (
              <button
                key={id}
                onClick={() => setActiveSection(id as typeof activeSection)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                  activeSection === id
                    ? highlight ? 'bg-cyan-600/30 text-cyan-300 border border-cyan-500/50' : 'bg-[#21262d] text-white'
                    : highlight ? 'text-cyan-400 hover:text-cyan-300 hover:bg-cyan-600/20' : 'text-gray-500 hover:text-gray-300 hover:bg-[#21262d]/50'
                }`}
              >
                <Icon className="w-3 h-3" />
                {label}
              </button>
            ))}
          </div>
        </div>
        <EpochAIIntelligenceTab />
      </div>
    );
  }

  return (
    <div className="min-h-full bg-[#0d1117] flex flex-col">
      {renderHeader()}
      {renderNavigation()}
      
      <div className="flex-1 overflow-auto">
        {activeSection === 'targets' && renderTargetSection()}
        {activeSection === 'contractors' && renderContractorSection()}
        {activeSection === 'ibew' && renderIBEWSection()}
        {activeSection === 'corridors' && renderCorridorSection()}
      </div>
      
      {/* Floating NLP Assistant */}
      <ContextualNLPWidget
        context={getNLPContext()}
        mode="floating"
        onAction={handleNLPAction}
        dataContext={{
          itemCount: organizingTargets.length,
          filters,
        }}
      />
    </div>
  );
};

// =============================================================================
// JOINT EMPLOYER CALCULATOR COMPONENT
// =============================================================================

const JointEmployerCalculator: React.FC = () => {
  const [indicators, setIndicators] = useState({
    directsWork: false,
    setsSchedules: false,
    controlsAccess: false,
    providesEquipment: false,
    conductsDiscipline: false,
    setsPayRates: false,
  });
  
  const probability = useMemo(() => {
    return calculateJointEmployerProbability(indicators);
  }, [indicators]);
  
  const toggleIndicator = (key: keyof typeof indicators) => {
    setIndicators(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  const indicatorDescriptions = {
    directsWork: 'Parent company managers direct daily work tasks',
    setsSchedules: 'Parent company sets work schedules',
    controlsAccess: 'Parent company controls facility access/badges',
    providesEquipment: 'Parent company provides tools and equipment',
    conductsDiscipline: 'Parent company involved in discipline decisions',
    setsPayRates: 'Parent company influences or sets pay rates',
  };
  
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {Object.entries(indicatorDescriptions).map(([key, description]) => (
          <button
            key={key}
            onClick={() => toggleIndicator(key as keyof typeof indicators)}
            className={`w-full flex items-center justify-between p-3 rounded-lg border transition-colors ${
              indicators[key as keyof typeof indicators]
                ? 'bg-green-500/20 border-green-500/30 text-green-400'
                : 'bg-[#161b22] border-[#30363d] text-gray-400 hover:border-[#484f58]'
            }`}
          >
            <span className="text-sm">{description}</span>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
              indicators[key as keyof typeof indicators]
                ? 'border-green-500 bg-green-500'
                : 'border-gray-500'
            }`}>
              {indicators[key as keyof typeof indicators] && (
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </div>
          </button>
        ))}
      </div>
      
      {/* Probability Meter */}
      <div className="mt-4 p-4 bg-[#161b22] rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">Joint Employer Probability</span>
          <span className={`text-xl font-bold ${
            probability >= 70 ? 'text-green-400' :
            probability >= 50 ? 'text-yellow-400' :
            probability >= 30 ? 'text-orange-400' : 'text-gray-400'
          }`}>
            {probability}%
          </span>
        </div>
        <div className="w-full h-3 bg-[#21262d] rounded-full overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              probability >= 70 ? 'bg-green-500' :
              probability >= 50 ? 'bg-yellow-500' :
              probability >= 30 ? 'bg-orange-500' : 'bg-gray-500'
            }`}
            style={{ width: `${probability}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {probability >= 70 
            ? '✓ Strong case for joint employer status. Consider NLRB petition.'
            : probability >= 50
            ? '⚠️ Moderate case. Gather additional evidence of control.'
            : probability >= 30
            ? '⚠️ Weak case. May need to document more indicators.'
            : 'Limited joint employer indicators. Focus on direct employer organizing.'
          }
        </p>
      </div>
    </div>
  );
};

export default OrganizingIntelligenceTab;

