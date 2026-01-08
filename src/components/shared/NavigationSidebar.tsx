/**
 * Navigation Sidebar
 * Professional, icon-based navigation with grouping and tooltips
 */

import React, { useState } from 'react';
import {
  Home,
  MapPin,
  AlertTriangle,
  TrendingUp,
  Globe,
  DollarSign,
  Shield,
  Building2,
  Search as SearchIcon,
  Brain,
  BarChart3,
  Network,
  FileText,
  LayoutGrid,
  GitCompare,
  Map as MapIcon,
  Activity,
  Target,
  Eye,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  Database,
  Cpu,
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import type { CommandCenterTab } from '../DCIMCommandCenter';

interface NavigationSidebarProps {
  activeTab: CommandCenterTab;
  onTabChange: (tab: CommandCenterTab) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  alertCounts?: {
    problems?: number;
    earlyWarning?: number;
    intelligence?: number;
  };
}

interface NavGroup {
  title: string;
  icon: React.ReactNode;
  items: NavItem[];
}

interface NavItem {
  id: CommandCenterTab;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  color: string; // Tailwind color for active state
  description: string; // For tooltip
  keywords: string[]; // For search
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'Getting Started',
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      {
        id: 'Guides',
        label: 'Guides',
        icon: <BookOpen className="w-5 h-5" />,
        color: 'cyan',
        description: 'Getting started guides and documentation',
        keywords: ['help', 'docs', 'tutorial', 'guide'],
      },
      {
        id: 'Overview',
        label: 'Dashboard',
        icon: <Home className="w-5 h-5" />,
        color: 'blue',
        description: 'Main dashboard with key metrics',
        keywords: ['home', 'overview', 'summary', 'stats'],
      },
    ],
  },
  {
    title: 'Analysis & Intelligence',
    icon: <Brain className="w-4 h-4" />,
    items: [
      {
        id: 'Intelligence',
        label: 'Intelligence Hub',
        icon: <Brain className="w-5 h-5" />,
        color: 'purple',
        description: 'Unified intelligence: patterns, predictions, correlations',
        keywords: ['analysis', 'intelligence', 'ai', 'patterns', 'predictions'],
      },
      {
        id: 'Pattern Intelligence',
        label: '🧠 Pattern Engine',
        icon: <Activity className="w-5 h-5" />,
        color: 'cyan',
        description: 'Real-time BGP, CT monitoring, workload detection, business health',
        keywords: ['pattern', 'bgp', 'certificate', 'workload', 'crypto', 'ai training', 'surveillance'],
      },
      {
        id: 'Deep Intelligence',
        label: '🔍 Deep Intel',
        icon: <Eye className="w-5 h-5" />,
        color: 'purple',
        description: 'Full API extraction: OpenCorp, SEC, PeeringDB, USASpending',
        keywords: ['deep', 'api', 'sec', 'peeringdb', 'opencorporates', 'usaspending', 'subsidiaries', 'officers'],
      },
      {
        id: 'Predictive Subsidy',
        label: '🎯 Subsidy Intel',
        icon: <Target className="w-5 h-5" />,
        color: 'rose',
        description: 'Good Jobs First-style predictive subsidy risk analysis',
        keywords: ['subsidy', 'good jobs first', 'tax break', 'clawback', 'jobs promised', 'dark states'],
      },
      {
        id: 'Regulatory Toolkit',
        label: '🏛️ Regulatory APIs',
        icon: <Database className="w-5 h-5" />,
        color: 'emerald',
        description: 'Municipal DCIM scrapers, APIs, and integration guides',
        keywords: ['municipal', 'regulatory', 'scraper', 'api', 'bls', 'sec', 'epa', 'foia', 'permit'],
      },
      {
        id: 'Predictive Intel',
        label: 'Predictions',
        icon: <TrendingUp className="w-5 h-5" />,
        color: 'indigo',
        description: 'Forecasts, risk scores, and Monte Carlo simulations',
        keywords: ['forecast', 'predict', 'trends', 'future', 'risk'],
      },
      {
        id: 'Assurance Monitor',
        label: 'Assurance',
        icon: <Target className="w-5 h-5" />,
        color: 'green',
        description: 'Continuous compliance monitoring and validation',
        keywords: ['monitor', 'assurance', 'continuous', 'validate'],
      },
      {
        id: 'AI Infrastructure',
        label: '🛰️ AI Infrastructure',
        icon: <Cpu className="w-5 h-5" />,
        color: 'cyan',
        description: 'Epoch AI frontier data center tracking - power, location, construction',
        keywords: ['epoch', 'ai', 'frontier', 'data center', 'power', 'gigawatt', 'openai', 'meta', 'google', 'xai', 'anthropic', 'satellite'],
      },
      {
        id: 'Subsidy Accountability',
        label: '💰 Subsidy Accountability',
        icon: <DollarSign className="w-5 h-5" />,
        color: 'amber',
        description: 'Good Jobs First data - verify subsidy promises vs. reality',
        keywords: ['subsidy', 'accountability', 'jobs', 'promised', 'actual', 'good jobs first', 'transparency', 'state', 'gap', 'tax'],
      },
      {
        id: 'Organizer Hub',
        label: '✊ Organizer Hub',
        icon: <Target className="w-5 h-5" />,
        color: 'rose',
        description: 'Labor organizing command center - FOIA, incidents, contractors, CBAs, legislation, union density, coalition',
        keywords: ['organize', 'union', 'labor', 'foia', 'incident', 'contractor', 'cba', 'legislative', 'coalition', 'ibew', 'corridor', 'campaign', 'worker'],
      },
      {
        id: 'Surveillance Infrastructure',
        label: '🔴 Surveillance Tracker',
        icon: <Eye className="w-5 h-5" />,
        color: 'red',
        description: 'Track ICE/DHS surveillance infrastructure, contracts, and companies targeting immigrant communities',
        keywords: ['ice', 'surveillance', 'dhs', 'cbp', 'palantir', 'clearview', 'facial recognition', 'skip tracing', 'deportation', 'immigrant', 'contract', 'federal', 'ero', 'hsi'],
      },
    ],
  },
  {
    title: 'Monitoring & Alerts',
    icon: <AlertTriangle className="w-4 h-4" />,
    items: [
      {
        id: 'Problems',
        label: 'Alerts',
        icon: <AlertTriangle className="w-5 h-5" />,
        color: 'red',
        description: 'Non-compliant facilities requiring immediate action',
        keywords: ['problems', 'issues', 'alerts', 'violations', 'non-compliant'],
      },
      {
        id: 'Early Warning',
        label: 'Early Warning',
        icon: <Eye className="w-5 h-5" />,
        color: 'orange',
        description: 'Risk indicators and warning signals',
        keywords: ['warning', 'risk', 'early', 'detect'],
      },
      {
        id: 'Worker Safety',
        label: 'Worker Safety',
        icon: <Shield className="w-5 h-5" />,
        color: 'yellow',
        description: 'Worker safety violations and OSHA compliance',
        keywords: ['safety', 'workers', 'osha', 'violations'],
      },
    ],
  },
  {
    title: 'Geographic Analysis',
    icon: <MapPin className="w-4 h-4" />,
    items: [
      {
        id: 'Geography',
        label: 'Map View',
        icon: <MapPin className="w-5 h-5" />,
        color: 'teal',
        description: 'Interactive map of all facilities',
        keywords: ['map', 'geography', 'location', 'geo'],
      },
      {
        id: 'Geographic Intel',
        label: 'Geo Intel',
        icon: <Globe className="w-5 h-5" />,
        color: 'cyan',
        description: 'Geographic patterns and regional analysis',
        keywords: ['geographic', 'regional', 'spatial', 'location'],
      },
      {
        id: 'Connectography',
        label: 'Connectography',
        icon: <Network className="w-5 h-5" />,
        color: 'purple',
        description: 'Infrastructure connectivity and network visualization',
        keywords: ['network', 'connectivity', 'infrastructure', 'topology'],
      },
    ],
  },
  {
    title: 'Compliance Tracking',
    icon: <BarChart3 className="w-4 h-4" />,
    items: [
      {
        id: 'Subsidy Tracking',
        label: 'Subsidies',
        icon: <DollarSign className="w-5 h-5" />,
        color: 'green',
        description: 'Subsidy compliance and funding gaps',
        keywords: ['subsidy', 'funding', 'money', 'gap', 'financial'],
      },
      {
        id: 'Compliance Flow',
        label: 'Compliance Flow',
        icon: <Activity className="w-5 h-5" />,
        color: 'blue',
        description: 'Intent-based compliance visualization',
        keywords: ['compliance', 'flow', 'intent', 'validation'],
      },
      {
        id: 'Compare',
        label: 'Compare',
        icon: <GitCompare className="w-5 h-5" />,
        color: 'indigo',
        description: 'Side-by-side facility and operator comparisons',
        keywords: ['compare', 'comparison', 'versus', 'benchmark'],
      },
    ],
  },
  {
    title: 'Data & Tools',
    icon: <LayoutGrid className="w-4 h-4" />,
    items: [
      {
        id: 'Facilities',
        label: 'Facilities',
        icon: <Building2 className="w-5 h-5" />,
        color: 'gray',
        description: 'Detailed facility data and information',
        keywords: ['facilities', 'buildings', 'sites', 'data'],
      },
      {
        id: 'Explorer',
        label: 'Explorer',
        icon: <SearchIcon className="w-5 h-5" />,
        color: 'cyan',
        description: 'Advanced search and data exploration',
        keywords: ['search', 'explore', 'find', 'query'],
      },
      {
        id: 'OSINT Tools',
        label: 'OSINT Tools',
        icon: <SearchIcon className="w-5 h-5" />,
        color: 'purple',
        description: 'Open-source intelligence gathering tools',
        keywords: ['osint', 'intelligence', 'research', 'tools'],
      },
      {
        id: 'Infrastructure',
        label: 'Infrastructure',
        icon: <Network className="w-5 h-5" />,
        color: 'orange',
        description: 'Network infrastructure and security',
        keywords: ['infrastructure', 'network', 'security', 'tech'],
      },
      {
        id: 'Network Security',
        label: 'Security',
        icon: <Shield className="w-5 h-5" />,
        color: 'red',
        description: 'Network security analysis and BGP monitoring',
        keywords: ['security', 'network', 'bgp', 'threats'],
      },
      {
        id: 'Reports',
        label: 'Reports',
        icon: <FileText className="w-5 h-5" />,
        color: 'blue',
        description: 'Generate and export compliance reports',
        keywords: ['reports', 'export', 'pdf', 'documents'],
      },
    ],
  },
];

export function NavigationSidebar({
  activeTab,
  onTabChange,
  isCollapsed,
  onToggleCollapse,
  alertCounts = {},
}: NavigationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(NAV_GROUPS.map((g) => g.title))
  );
  const [showDescriptions, setShowDescriptions] = useState(() => {
    // Show descriptions by default for first-time users
    return localStorage.getItem('dcim_hide_descriptions') !== 'true';
  });

  const toggleGroup = (groupTitle: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupTitle)) {
        next.delete(groupTitle);
      } else {
        next.add(groupTitle);
      }
      return next;
    });
  };

  // Filter items based on search
  const filteredGroups = searchQuery.trim()
    ? NAV_GROUPS.map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            item.keywords.some((k) => k.includes(searchQuery.toLowerCase()))
        ),
      })).filter((group) => group.items.length > 0)
    : NAV_GROUPS;

  // Get badge for item
  const getBadge = (itemId: CommandCenterTab): number | undefined => {
    if (itemId === 'Problems') return alertCounts.problems;
    if (itemId === 'Early Warning') return alertCounts.earlyWarning;
    if (itemId === 'Intelligence') return alertCounts.intelligence;
    return undefined;
  };

  if (isCollapsed) {
    return (
      <div className="w-16 bg-gray-900 border-r border-gray-800 flex flex-col items-center py-4 space-y-2">
        {/* Expand button */}
        <Tooltip content="Expand Navigation" position="right">
          <button
            onClick={onToggleCollapse}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </Tooltip>

        <div className="w-full h-px bg-gray-800 my-2" />

        {/* Icon-only items */}
        {NAV_GROUPS.flatMap((group) => group.items).map((item) => {
          const isActive = activeTab === item.id;
          const badge = getBadge(item.id);

          return (
            <Tooltip key={item.id} content={item.label} position="right">
              <button
                onClick={() => onTabChange(item.id)}
                className={`relative p-2 rounded-lg transition-all ${
                  isActive
                    ? `bg-${item.color}-600 text-white shadow-lg shadow-${item.color}-500/30`
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {item.icon}
                {badge !== undefined && badge > 0 && (
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                    {badge > 9 ? '9+' : badge}
                  </div>
                )}
              </button>
            </Tooltip>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-cyan-400" />
            <h2 className="font-bold text-sm text-white">Navigation</h2>
          </div>
          <div className="flex items-center gap-1">
            {/* Toggle descriptions */}
            <Tooltip content={showDescriptions ? 'Hide descriptions' : 'Show descriptions'} position="bottom">
              <button
                onClick={() => {
                  setShowDescriptions(!showDescriptions);
                  localStorage.setItem('dcim_hide_descriptions', showDescriptions ? 'true' : 'false');
                }}
                className={`p-1 rounded transition-colors ${
                  showDescriptions 
                    ? 'bg-cyan-900/50 text-cyan-400' 
                    : 'hover:bg-gray-800 text-gray-400 hover:text-white'
                }`}
                title={showDescriptions ? 'Hide descriptions' : 'Show descriptions'}
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            </Tooltip>
            <button
              onClick={onToggleCollapse}
              className="p-1 hover:bg-gray-800 rounded transition-colors text-gray-400 hover:text-white"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <SearchIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input
            type="text"
            placeholder="Search tabs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto">
        {filteredGroups.map((group) => (
          <div key={group.title} className="border-b border-gray-800 last:border-b-0">
            <button
              onClick={() => toggleGroup(group.title)}
              className="w-full px-4 py-2 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <div className="text-gray-500">{group.icon}</div>
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  {group.title}
                </span>
              </div>
              <ChevronRight
                className={`w-3.5 h-3.5 text-gray-500 transition-transform ${
                  expandedGroups.has(group.title) ? 'rotate-90' : ''
                }`}
              />
            </button>

            {expandedGroups.has(group.title) && (
              <div className="py-1">
                {group.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const badge = getBadge(item.id);

                  const buttonContent = (
                    <button
                      onClick={() => onTabChange(item.id)}
                      className={`w-full px-4 ${showDescriptions ? 'py-2.5' : 'py-2'} flex items-start justify-between hover:bg-gray-800/70 transition-all text-left ${
                        isActive
                          ? `bg-${item.color}-900/30 border-l-2 border-${item.color}-500`
                          : ''
                      }`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div
                          className={`mt-0.5 flex-shrink-0 ${
                            isActive ? `text-${item.color}-400` : 'text-gray-500'
                          }`}
                        >
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span
                            className={`text-sm block ${
                              isActive
                                ? `text-${item.color}-300 font-semibold`
                                : 'text-gray-400'
                            }`}
                          >
                            {item.label}
                          </span>
                          {/* Inline description when enabled */}
                          {showDescriptions && (
                            <span className="text-xs text-gray-500 block mt-0.5 leading-relaxed line-clamp-2">
                              {item.description}
                            </span>
                          )}
                        </div>
                      </div>
                      {badge !== undefined && badge > 0 && (
                        <div className="px-1.5 py-0.5 bg-red-600 text-white text-xs font-bold rounded flex-shrink-0 ml-2">
                          {badge > 99 ? '99+' : badge}
                        </div>
                      )}
                    </button>
                  );

                  // Only wrap in tooltip if descriptions are hidden
                  return showDescriptions ? (
                    <div key={item.id}>{buttonContent}</div>
                  ) : (
                    <Tooltip key={item.id} content={item.description} position="right">
                      {buttonContent}
                    </Tooltip>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer Help */}
      <div className="p-3 border-t border-gray-800 bg-gray-900/50">
        <button
          onClick={() => onTabChange('Guides')}
          className="w-full flex items-center gap-2 px-3 py-2 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-700 rounded-lg transition-colors"
        >
          <HelpCircle className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-cyan-300 font-medium">Need Help?</span>
        </button>
      </div>
    </div>
  );
}



