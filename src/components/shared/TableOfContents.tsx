import { memo, useState, useEffect } from 'react';
import { 
  X, BookOpen, MapPin, AlertTriangle, Eye, Target, Shield, 
  Users, Factory, Search, BarChart3, FlaskConical, TrendingUp,
  Network, FileText, GitCompare, Globe, Compass, Rocket,
  Zap, Radio, Brain, Activity, ChevronRight, Sparkles,
  Database, Terminal, Settings, HelpCircle, Workflow
} from 'lucide-react';
import { FadeIn, ScaleIn } from './animations';

interface TableOfContentsProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (tab: string) => void;
  currentTab?: string;
}

const COLORS = {
  cyan: '#00d2d3',
  green: '#2ed573',
  yellow: '#ffa502',
  red: '#ff4757',
  purple: '#a855f7',
  blue: '#3b82f6',
};

interface TabSection {
  category: string;
  description: string;
  color: string;
  tabs: {
    name: string;
    icon: React.ElementType;
    description: string;
    features: string[];
    shortcut?: string;
    isNew?: boolean;
  }[];
}

const TAB_SECTIONS: TabSection[] = [
  {
    category: 'Getting Started',
    description: 'Essential tabs for new users',
    color: COLORS.cyan,
    tabs: [
      {
        name: 'Guides',
        icon: BookOpen,
        description: 'Complete documentation, tutorials, and feature reference',
        features: ['Interactive tutorials', 'Tab guides', 'Data sources', 'Keyboard shortcuts'],
        shortcut: '⌘1',
      },
      {
        name: 'Overview',
        icon: BarChart3,
        description: 'Dashboard summary with key metrics and visualizations',
        features: ['Compliance stats', 'Top violators', 'Subsidy flow', 'Timeline'],
        shortcut: '⌘2',
      },
    ],
  },
  {
    category: 'Geographic Analysis',
    description: 'Location-based compliance tracking',
    color: COLORS.green,
    tabs: [
      {
        name: 'Geography',
        icon: MapPin,
        description: 'State-by-state compliance breakdown',
        features: ['State rankings', 'Regional patterns', 'Heat maps', 'Drill-down'],
        shortcut: '⌘3',
      },
      {
        name: 'Geographic Intel',
        icon: Target,
        description: 'Advanced geospatial analysis and clustering',
        features: ['County analysis', 'Density clustering', 'Opportunity zones', 'Impact maps'],
        shortcut: '⌘6',
      },
      {
        name: 'Connectography',
        icon: Globe,
        description: 'Interactive 2D/3D map with network topology',
        features: ['MapLibre + DeckGL', 'Facility layers', 'Network flows', 'GPU rendering'],
        shortcut: '⌘18',
      },
    ],
  },
  {
    category: 'Compliance Monitoring',
    description: 'Track violations and subsidy performance',
    color: COLORS.red,
    tabs: [
      {
        name: 'Problems',
        icon: AlertTriangle,
        description: 'All compliance violations and issues',
        features: ['Job shortfalls', 'Environmental violations', 'Missing data', 'Risk scores'],
        shortcut: '⌘4',
      },
      {
        name: 'Early Warning',
        icon: Eye,
        description: 'Proactive detection of emerging issues',
        features: ['Anomaly detection', 'Trend analysis', 'Risk forecasting', 'Alerts'],
        shortcut: '⌘5',
      },
      {
        name: 'Subsidy Tracking',
        icon: Zap,
        description: 'Monitor public incentives and ROI',
        features: ['Subsidy database', 'Job promises vs actual', 'Tax credits', 'Clawback eligibility'],
        shortcut: '⌘7',
      },
      {
        name: 'Assurance Monitor',
        icon: Radio,
        description: 'Real-time compliance assurance with AIOps',
        features: ['Intent validation', 'Drift detection', 'Natural language queries', 'Auto-remediation'],
        shortcut: '⌘21',
        isNew: true,
      },
    ],
  },
  {
    category: 'Intelligence & Analytics',
    description: 'Advanced AI-powered analysis',
    color: COLORS.purple,
    tabs: [
      {
        name: 'Intelligence',
        icon: Brain,
        description: 'Unified intelligence hub with cross-correlation',
        features: ['Anomaly detection', 'Intent violations', 'Predictions', 'Root cause analysis', 'Graph view'],
        shortcut: '⌘22',
        isNew: true,
      },
      {
        name: 'Predictive Intel',
        icon: TrendingUp,
        description: 'AI forecasting and risk modeling',
        features: ['ARIMA forecasts', 'Monte Carlo simulation', 'Risk scoring', 'Scenario analysis'],
        shortcut: '⌘13',
      },
      {
        name: 'Compliance Flow',
        icon: Workflow,
        description: 'Intent-based network visualization',
        features: ['Cytoscape graphs', 'Intent vs Actual', 'Health indicators', 'Network topology'],
        shortcut: '⌘20',
        isNew: true,
      },
    ],
  },
  {
    category: 'Facility Management',
    description: 'Detailed facility data and research',
    color: COLORS.blue,
    tabs: [
      {
        name: 'Facilities',
        icon: Factory,
        description: 'Searchable database of 11,992 data centers',
        features: ['Advanced filters', 'Bulk export', 'Detailed profiles', 'Source verification'],
        shortcut: '⌘9',
      },
      {
        name: 'OSINT Tools',
        icon: Search,
        description: 'Open-source intelligence gathering',
        features: ['Domain lookup', 'WHOIS', 'SSL certs', 'BGP routes', 'API explorer'],
        shortcut: '⌘10',
      },
      {
        name: 'Explorer',
        icon: Compass,
        description: 'Free-form data exploration',
        features: ['Custom queries', 'Data visualization', 'Export tools', 'Saved searches'],
        shortcut: '⌘19',
      },
    ],
  },
  {
    category: 'Network & Security',
    description: 'Infrastructure monitoring and BGP analysis',
    color: COLORS.yellow,
    tabs: [
      {
        name: 'Infrastructure',
        icon: Network,
        description: 'Network topology and peering analysis',
        features: ['AS numbers', 'Peering relationships', 'Transit providers', 'IX connections'],
        shortcut: '⌘14',
      },
      {
        name: 'Network Security',
        icon: Shield,
        description: 'Real-time BGP monitoring with RIPE RIS Live',
        features: ['Live BGP updates', 'Route anomalies', 'MOAS detection', 'Prefix hijacking'],
        shortcut: '⌘15',
      },
    ],
  },
  {
    category: 'Reporting & Actions',
    description: 'Generate reports and compare facilities',
    color: COLORS.green,
    tabs: [
      {
        name: 'Worker Safety',
        icon: Users,
        description: 'OSHA violations and workplace safety data',
        features: ['Incident tracking', 'Safety scores', 'Violation history', 'Enforcement'],
        shortcut: '⌘8',
      },
      {
        name: 'Reports',
        icon: FileText,
        description: 'Generate PDF compliance reports',
        features: ['Custom templates', 'Auto-generation', 'Export options', 'Scheduling'],
        shortcut: '⌘16',
      },
      {
        name: 'Compare',
        icon: GitCompare,
        description: 'Side-by-side facility comparison',
        features: ['Multi-select', 'Metric comparison', 'Visual diff', 'Benchmarking'],
        shortcut: '⌘17',
      },
    ],
  },
];

const QUICK_ACTIONS = [
  { name: 'Search facilities', icon: Search, action: 'Focus search bar', shortcut: '⌘K' },
  { name: 'Toggle chat', icon: Terminal, action: 'Open AI assistant', shortcut: '⌘/' },
  { name: 'Export data', icon: Database, action: 'Download current view', shortcut: '⌘E' },
  { name: 'Settings', icon: Settings, action: 'Configure app', shortcut: '⌘,' },
];

const TabCard = memo(function TabCard({ 
  tab, 
  color, 
  onNavigate, 
  isActive,
  delay = 0,
}: { 
  tab: TabSection['tabs'][0]; 
  color: string; 
  onNavigate: () => void;
  isActive?: boolean;
  delay?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const Icon = tab.icon;

  return (
    <FadeIn delay={delay} direction="up">
      <button
        onClick={onNavigate}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`w-full text-left p-4 rounded-lg border transition-all duration-300 ${
          isActive 
            ? 'bg-cyan-900/30 border-cyan-600' 
            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
        }`}
        style={{
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
          boxShadow: isHovered ? `0 8px 16px ${color}20` : 'none',
        }}
      >
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-2">
            <Icon className="w-5 h-5" style={{ color }} />
            <h4 className="font-semibold text-sm text-white">{tab.name}</h4>
            {tab.isNew && (
              <span className="px-1.5 py-0.5 bg-gradient-to-r from-cyan-500 to-purple-500 text-white text-[9px] font-bold rounded-full animate-pulse">
                NEW
              </span>
            )}
          </div>
          {tab.shortcut && (
            <kbd className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs text-gray-400 font-mono">
              {tab.shortcut}
            </kbd>
          )}
        </div>
        <p className="text-xs text-gray-400 mb-3">{tab.description}</p>
        <div className="space-y-1">
          {tab.features.map((feature, idx) => (
            <div key={idx} className="flex items-center gap-2 text-[10px] text-gray-500">
              <ChevronRight className="w-3 h-3" style={{ color }} />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </button>
    </FadeIn>
  );
});

export const TableOfContents = memo(function TableOfContents({
  isOpen,
  onClose,
  onNavigate,
  currentTab = '',
}: TableOfContentsProps) {
  const [searchQuery, setSearchQuery] = useState('');

  // Handle escape key
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredSections = TAB_SECTIONS.map(section => ({
    ...section,
    tabs: section.tabs.filter(tab =>
      searchQuery === '' ||
      tab.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tab.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tab.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
    ),
  })).filter(section => section.tabs.length > 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <ScaleIn>
        <div 
          className="relative w-full max-w-6xl max-h-[90vh] bg-gray-900 border border-gray-700 rounded-lg shadow-2xl overflow-hidden"
          style={{ boxShadow: '0 0 60px rgba(0, 210, 211, 0.3)' }}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 bg-gray-900 border-b border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Rocket className="w-8 h-8 text-cyan-400" />
                  <h2 className="text-2xl font-bold text-white">
                    DCIM Command Center
                  </h2>
                  <Sparkles className="w-5 h-5 text-yellow-400 animate-pulse" />
                </div>
                <p className="text-sm text-gray-400">
                  Navigate 20+ intelligence tabs tracking 11,992 data center facilities
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                aria-label="Close"
              >
                <X className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tabs, features, or capabilities..."
                className="w-full pl-10 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                autoFocus
              />
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-2 mt-4">
              {QUICK_ACTIONS.map((action, idx) => {
                const Icon = action.icon;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded text-xs text-gray-400"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="flex-1 truncate">{action.name}</span>
                    <kbd className="px-1.5 py-0.5 bg-gray-900 border border-gray-700 rounded text-[10px] font-mono">
                      {action.shortcut}
                    </kbd>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Content */}
          <div className="overflow-y-auto p-6 space-y-8" style={{ maxHeight: 'calc(90vh - 240px)' }}>
            {filteredSections.map((section, sectionIdx) => (
              <div key={section.category}>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-1 h-6 rounded-full"
                    style={{ backgroundColor: section.color }}
                  />
                  <div>
                    <h3 className="text-lg font-bold text-white">{section.category}</h3>
                    <p className="text-xs text-gray-500">{section.description}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {section.tabs.map((tab, tabIdx) => (
                    <TabCard
                      key={tab.name}
                      tab={tab}
                      color={section.color}
                      onNavigate={() => {
                        onNavigate(tab.name);
                        onClose();
                      }}
                      isActive={currentTab === tab.name}
                      delay={sectionIdx * 50 + tabIdx * 30}
                    />
                  ))}
                </div>
              </div>
            ))}

            {filteredSections.length === 0 && (
              <div className="text-center py-12">
                <HelpCircle className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-400">No tabs match your search</p>
                <p className="text-sm text-gray-600 mt-1">Try a different keyword</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-900 border-t border-gray-700 px-6 py-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center gap-4">
                <span>Press <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded font-mono">ESC</kbd> to close</span>
                <span>Use <kbd className="px-1.5 py-0.5 bg-gray-800 border border-gray-700 rounded font-mono">⌘1-22</kbd> for quick navigation</span>
              </div>
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-green-400" />
                <span className="text-green-400">{filteredSections.reduce((acc, s) => acc + s.tabs.length, 0)} tabs available</span>
              </div>
            </div>
          </div>
        </div>
      </ScaleIn>
    </div>
  );
});

