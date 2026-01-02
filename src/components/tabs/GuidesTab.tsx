import { memo, useState, useEffect, useCallback } from 'react';
import { 
  Search, Filter, Building2, MapPin, FileText, BarChart3, Sparkles, Keyboard,
  MousePointerClick, ChevronRight, ChevronDown, Info, Zap, X, Globe, Shield,
  AlertTriangle, Eye, Layers, Radio, Network, LineChart, GitBranch, Radar,
  Target, Cpu, BookOpen, MessageSquare, Map as MapIcon, Compass, Play,
  Settings, Download, Share2, Clock, Users, DollarSign, Activity, Database,
  Link2, Terminal, Lightbulb, Navigation, Box, Workflow, TrendingUp, Lock,
  ExternalLink, HelpCircle, ArrowRight, CheckCircle2, Rocket
} from 'lucide-react';
import { FadeIn, AnimatedNumber, PulsingDot, AnimatedProgressBar } from '../shared/animations';

const COLORS = {
  cyan: '#00d2d3',
  green: '#2ed573',
  yellow: '#ffa502',
  red: '#ff4757',
  purple: '#a855f7',
  blue: '#3b82f6',
};

// Ultra-compact section wrapper
const GuideSection = memo(function GuideSection({ 
  title, 
  icon, 
  children, 
  defaultOpen = false,
  color = COLORS.cyan,
  index = 0,
}: { 
  title: string; 
  icon: React.ReactNode; 
  children: React.ReactNode;
  defaultOpen?: boolean;
  color?: string;
  index?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className="border border-gray-800 rounded overflow-hidden bg-gray-900/30">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-2 py-1 hover:bg-gray-800/50"
      >
        <div className="flex items-center gap-1.5">
          <span style={{ color }} className="w-3 h-3">{icon}</span>
          <span className="font-semibold text-[11px] text-white">{title}</span>
        </div>
        <ChevronDown className={`w-3 h-3 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      {isOpen && (
        <div className="p-2 pt-1 border-t border-gray-800">
          {children}
        </div>
      )}
    </div>
  );
});

// Ultra-compact feature card
const FeatureCard = memo(function FeatureCard({
  title,
  description,
  icon,
  color = COLORS.cyan,
  shortcut,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  color?: string;
  tips?: string[];
  shortcut?: string;
  delay?: number;
}) {
  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded p-1.5 hover:border-gray-600">
      <div className="flex items-start gap-1.5">
        <span style={{ color }} className="w-3 h-3 shrink-0 mt-0.5">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <h4 className="font-semibold text-[10px] text-white">{title}</h4>
            {shortcut && <kbd className="px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-[8px] text-gray-500 font-mono">{shortcut}</kbd>}
          </div>
          <p className="text-[9px] text-gray-500 line-clamp-2">{description}</p>
        </div>
      </div>
    </div>
  );
});

// Ultra-compact tab guide card
const TabGuide = memo(function TabGuide({
  name,
  shortcut,
  icon,
  description,
  features,
  color = COLORS.cyan,
}: {
  name: string;
  shortcut?: string;
  icon: React.ReactNode;
  description: string;
  features: string[];
  color?: string;
  delay?: number;
}) {
  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded p-1.5 hover:border-gray-600">
      <div className="flex items-center gap-1 mb-1">
        <span style={{ color }} className="w-3 h-3">{icon}</span>
        <span className="font-semibold text-[10px] text-white">{name}</span>
        {shortcut && <kbd className="px-1 py-0.5 bg-gray-900 border border-gray-700 rounded text-[8px] text-gray-500 font-mono ml-auto">{shortcut}</kbd>}
      </div>
      <p className="text-[9px] text-gray-500 mb-1">{description}</p>
      <ul className="space-y-0.5">
        {features.slice(0, 3).map((feature, i) => (
          <li key={i} className="flex items-start gap-1 text-[8px] text-gray-500">
            <ChevronRight className="w-2 h-2 shrink-0 mt-0.5" style={{ color }} />
            <span className="line-clamp-1">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
});

// Ultra-compact keyboard shortcut row
const ShortcutRow = memo(function ShortcutRow({
  keys,
  description,
}: {
  keys: string[];
  description: string;
  delay?: number;
}) {
  return (
    <div className="flex items-center justify-between py-0.5 text-[9px]">
      <div className="flex items-center gap-0.5">
        {keys.map((key, i) => (
          <span key={i} className="flex items-center">
            <kbd className="px-1 py-0.5 bg-gray-800 border border-gray-700 rounded text-[8px] text-gray-400 font-mono">{key}</kbd>
            {i < keys.length - 1 && <span className="text-gray-600 mx-0.5">+</span>}
          </span>
        ))}
      </div>
      <span className="text-gray-500">{description}</span>
    </div>
  );
});

// Interactive step component
const InteractiveStep = memo(function InteractiveStep({
  number,
  title,
  description,
  color,
  delay = 0,
}: {
  number: number;
  title: string;
  description: string;
  color: string;
  delay?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [clicked, setClicked] = useState(false);

  return (
    <FadeIn delay={delay} direction="up">
      <div 
        className="text-center p-4 bg-gray-800/30 rounded-lg border border-gray-700/50 transition-all duration-300 cursor-pointer"
        style={{
          transform: isHovered ? 'translateY(-8px) scale(1.02)' : clicked ? 'scale(0.98)' : 'translateY(0)',
          boxShadow: isHovered ? `0 15px 30px ${color}20` : 'none',
          borderColor: isHovered ? `${color}50` : 'rgba(55 65 81 / 0.5)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={() => {
          setClicked(true);
          setTimeout(() => setClicked(false), 150);
        }}
      >
        <div 
          className="w-12 h-12 mx-auto mb-3 rounded-full flex items-center justify-center font-bold text-lg transition-all duration-300"
          style={{ 
            backgroundColor: `${color}20`,
            color,
            transform: isHovered ? 'scale(1.2) rotate(360deg)' : 'scale(1)',
            boxShadow: isHovered ? `0 0 20px ${color}40` : 'none',
          }}
        >
          {clicked ? <CheckCircle2 className="w-6 h-6" /> : number}
        </div>
        <h4 
          className="font-semibold mb-1 transition-colors duration-300"
          style={{ color: isHovered ? color : 'white' }}
        >
          {title}
        </h4>
        <p className="text-xs text-gray-400">{description}</p>
      </div>
    </FadeIn>
  );
});

// Animated data source card
const DataSourceCard = memo(function DataSourceCard({
  icon: Icon,
  name,
  description,
  color,
  delay = 0,
  status = 'available',
  updateFreq = 'Unknown',
}: {
  icon: React.ElementType;
  name: string;
  description: string;
  color: string;
  delay?: number;
  status?: 'live' | 'available' | 'offline';
  updateFreq?: string;
}) {
  const [isHovered, setIsHovered] = useState(false);
  
  const statusColors = {
    live: 'bg-green-500',
    available: 'bg-blue-500',
    offline: 'bg-gray-500',
  };

  return (
    <FadeIn delay={delay} direction="up">
      <div 
        className="flex flex-col gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 transition-all duration-300 cursor-pointer hover:border-gray-600"
        style={{
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="w-4 h-4" style={{ color }} />
            <h4 className="text-xs font-semibold text-white">{name}</h4>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${statusColors[status]} ${status === 'live' ? 'animate-pulse' : ''}`} />
          </div>
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">{description}</p>
        <div className="text-[9px] text-gray-500">
          Updates: {updateFreq}
        </div>
      </div>
    </FadeIn>
  );
});

const IntelligenceMethodCard = memo(function IntelligenceMethodCard({
  name,
  description,
  method,
  confidence,
  usedIn,
  color,
  delay = 0,
}: {
  name: string;
  description: string;
  method: string;
  confidence: string;
  usedIn: string;
  color: string;
  delay?: number;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <FadeIn delay={delay} direction="up">
      <div 
        className="flex flex-col gap-2 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50 transition-all duration-300 cursor-pointer hover:border-gray-600"
        style={{
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
          borderLeftWidth: '3px',
          borderLeftColor: color,
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold text-white">{name}</h4>
          <span className="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-[9px] text-gray-400">
            {confidence}
          </span>
        </div>
        <p className="text-[10px] text-gray-400 leading-relaxed">{description}</p>
        <div className="flex items-center justify-between text-[9px] text-gray-500">
          <span>Method: {method}</span>
        </div>
        <div className="text-[9px] text-gray-500">
          Used in: <span style={{ color }}>{usedIn}</span>
        </div>
      </div>
    </FadeIn>
  );
});


// Ultra-compact pro tip
const ProTipCard = memo(function ProTipCard({
  title,
  description,
  color,
}: {
  title: string;
  description: string;
  color: string;
  delay?: number;
}) {
  return (
    <div className="flex gap-1.5 p-1.5 rounded border" style={{ backgroundColor: `${color}08`, borderColor: `${color}30` }}>
      <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" style={{ color }} />
      <div>
        <div className="font-semibold text-[10px]" style={{ color }}>{title}</div>
        <div className="text-[9px] text-gray-500">{description}</div>
      </div>
    </div>
  );
});

const GuidesTab = memo(function GuidesTab() {
  return (
    <div className="p-1.5 space-y-1.5">
      {/* Hero - Ultra-compact */}
      <div className="bg-gradient-to-br from-cyan-900/20 via-gray-900 to-purple-900/20 border border-cyan-500/20 rounded px-2 py-1.5">
        <div className="flex items-center gap-2">
          <Compass className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] font-bold text-white">Command Center Guide</span>
          <PulsingDot color={COLORS.green} size={5} />
          <span className="text-[9px] text-gray-500">11,992 facilities • 118 ops • $2.48B gap</span>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          {[
            { icon: Building2, text: '11,992 Fac', color: COLORS.cyan },
            { icon: Users, text: '118 Ops', color: COLORS.purple },
            { icon: DollarSign, text: '$2.48B Gap', color: COLORS.red },
            { icon: Globe, text: 'Live', color: COLORS.green },
          ].map((badge, i) => (
            <div key={i} className="flex items-center gap-0.5 px-1 py-0.5 bg-gray-800/50 rounded text-[8px]">
              <badge.icon className="w-2.5 h-2.5" style={{ color: badge.color }} />
              <span className="text-gray-400">{badge.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Start - Inline */}
      <GuideSection 
        title="🚀 Quick Start" 
        icon={<Zap className="w-3 h-3" />}
        defaultOpen={true}
        color={COLORS.yellow}
        index={0}
      >
        <div className="grid grid-cols-4 gap-1">
          <div className="text-center p-1 bg-gray-800/30 rounded">
            <div className="text-cyan-400 font-bold text-lg">1</div>
            <div className="text-[9px] text-white font-semibold">Ask AI</div>
            <div className="text-[8px] text-gray-500">Type in search bar</div>
          </div>
          <div className="text-center p-1 bg-gray-800/30 rounded">
            <div className="text-green-400 font-bold text-lg">2</div>
            <div className="text-[9px] text-white font-semibold">Explore</div>
            <div className="text-[8px] text-gray-500">Click any tab</div>
          </div>
          <div className="text-center p-1 bg-gray-800/30 rounded">
            <div className="text-purple-400 font-bold text-lg">3</div>
            <div className="text-[9px] text-white font-semibold">Filter</div>
            <div className="text-[8px] text-gray-500">Use sidebar</div>
          </div>
          <div className="text-center p-1 bg-gray-800/30 rounded">
            <div className="text-yellow-400 font-bold text-lg">4</div>
            <div className="text-[9px] text-white font-semibold">Expand</div>
            <div className="text-[8px] text-gray-500">Click rows</div>
          </div>
        </div>
        
        {/* AI Queries - Compact */}
        <div className="mt-1 p-1.5 bg-cyan-900/20 border border-cyan-500/30 rounded">
          <div className="flex items-center gap-1 text-[9px] text-cyan-400 font-semibold mb-1">
            <Sparkles className="w-3 h-3" />
            Try:
          </div>
          <div className="grid grid-cols-4 gap-1 text-[8px]">
            {['"Non-compliant in MI"', '"Gap > $5M"', '"Switch in NV"', '"At risk in TX"'].map((q, i) => (
              <code key={i} className="px-1 py-0.5 bg-gray-900/50 rounded text-gray-400 font-mono hover:text-cyan-300 cursor-pointer truncate">{q}</code>
            ))}
          </div>
        </div>
      </GuideSection>

      {/* Tab Navigation - Dense grid */}
      <GuideSection 
        title="🗺️ Tabs" 
        icon={<Navigation className="w-3 h-3" />}
        color={COLORS.cyan}
        index={1}
      >
        <p className="text-[9px] text-gray-500 mb-1">18 tabs. Keys 1-9 for quick switch.</p>
        
        <div className="grid grid-cols-3 gap-1">
          {[
            { name: "Guides", shortcut: "1", icon: <BookOpen className="w-3 h-3" />, description: "How to use", features: ["Start guide", "Tutorials", "Shortcuts"], color: COLORS.yellow },
            { name: "Overview", shortcut: "2", icon: <BarChart3 className="w-3 h-3" />, description: "High-level stats", features: ["Stat cards", "Table", "Map"], color: COLORS.cyan },
            { name: "Geography", shortcut: "3", icon: <MapPin className="w-4 h-4" />, description: "Facilities organized by state/region.", features: ["State-by-state breakdown", "Subsidy gap by region", "Operator distribution"], color: COLORS.green },
            { name: "Problems", shortcut: "4", icon: <AlertTriangle className="w-4 h-4" />, description: "Facilities with compliance issues.", features: ["Issue severity levels", "Priority rankings", "Detailed descriptions"], color: COLORS.red },
            { name: "Early Warning", shortcut: "5", icon: <Clock className="w-4 h-4" />, description: "Audit deadlines and overdue facilities.", features: ["Days since audit", "Overdue alerts", "Upcoming audits"], color: COLORS.yellow },
            { name: "Geographic Intel", shortcut: "6", icon: <Globe className="w-4 h-4" />, description: "Advanced geographic analysis and mapping.", features: ["Interactive maps", "Regional clusters", "Infrastructure corridors"], color: COLORS.blue },
            { name: "Subsidy Tracking", shortcut: "7", icon: <DollarSign className="w-4 h-4" />, description: "Financial tracking and subsidy gap analysis.", features: ["Gap calculations", "Operator rankings", "State comparisons"], color: COLORS.green },
            { name: "Worker Safety", shortcut: "8", icon: <Users className="w-4 h-4" />, description: "Worker safety metrics and incidents.", features: ["Safety incidents", "Compliance tracking", "Labor conditions"], color: COLORS.purple },
            { name: "Facilities", shortcut: "9", icon: <Building2 className="w-4 h-4" />, description: "Detailed facility database and management.", features: ["Full facility details", "Edit capabilities", "Data export"], color: COLORS.cyan },
            { name: "OSINT Tools", icon: <Search className="w-4 h-4" />, description: "Open source intelligence tools for research.", features: ["Public records search", "SEC EDGAR integration", "EPA ECHO data"], color: COLORS.purple },
            { name: "Pattern Lab", icon: <Cpu className="w-4 h-4" />, description: "Advanced AI-powered pattern engine.", features: ["Scenario testing", "Visual analytics", "Explainable findings"], color: COLORS.purple },
            { name: "Network Security", icon: <Shield className="w-4 h-4" />, description: "BGP routing and network security status.", features: ["Live BGP monitor", "RPKI status", "ASN tracking"], color: COLORS.green },
          ].map((tab, i) => (
            <TabGuide key={tab.name} {...tab} delay={100 + i * 50} />
          ))}
        </div>
      </GuideSection>

      {/* AI Assistant */}
      <GuideSection 
        title="🤖 AI Assistant" 
        icon={<MessageSquare className="w-5 h-5" />}
        color={COLORS.purple}
        index={2}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
          <FeatureCard
            title="AI Search Bar"
            description="The 'Ask AI...' bar at the top understands natural language. It automatically extracts filters, switches tabs, and finds relevant data."
            icon={<Search className="w-5 h-5" />}
            color={COLORS.cyan}
            tips={[
              "Mention states, cities, operators, or compliance status",
              "Use phrases like 'over $5 million' for subsidy filters",
              "Results show filter badges that were automatically applied"
            ]}
            delay={100}
          />
          <FeatureCard
            title="AI Chat Assistant"
            description="Click 'AI Assistant' button to open the full chat interface. Ask complex questions and get detailed responses powered by Claude."
            icon={<MessageSquare className="w-5 h-5" />}
            color={COLORS.purple}
                    tips={[
              "Ask 'What are the worst facilities by subsidy gap?'",
              "Request analysis: 'Summarize compliance issues in Texas'",
              "Get recommendations: 'Which facilities need immediate attention?'"
                    ]}
            delay={200}
                  />
                </div>
      </GuideSection>

      {/* Connectography & GIS */}
      <GuideSection 
        title="🌍 Connectography & GIS" 
        icon={<Globe className="w-5 h-5" />}
        color={COLORS.cyan}
        index={3}
      >
        <p className="text-sm text-gray-400 mb-4">
          The Connectography view provides powerful geospatial visualization with multiple modes, layers, and real-time simulation.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {[
            { icon: Box, title: "2D Mode", description: "Flat map view with satellite/OSM basemaps. Best for overview and filtering.", color: COLORS.cyan },
            { icon: Layers, title: "3D Mode", description: "Terrain elevation with 3D buildings. Tilt and rotate for perspective views.", color: COLORS.purple },
            { icon: GitBranch, title: "Topology Mode", description: "Network topology view showing facility connections and data flows.", color: COLORS.green },
          ].map((mode, i) => (
            <FadeIn key={mode.title} delay={100 + i * 100} direction="up">
              <div 
                className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center hover:border-gray-600 transition-all cursor-pointer group"
              >
                <mode.icon 
                  className="w-8 h-8 mx-auto mb-2 transition-transform group-hover:scale-125" 
                  style={{ color: mode.color }} 
                />
                <h4 className="font-semibold text-white mb-1 group-hover:text-cyan-400 transition-colors">{mode.title}</h4>
                <p className="text-xs text-gray-400">{mode.description}</p>
              </div>
            </FadeIn>
          ))}
      </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FeatureCard title="Map Layers" description="Toggle different data layers to visualize facilities, heatmaps, network topology, data flows, and infrastructure corridors." icon={<Layers className="w-5 h-5" />} color={COLORS.cyan} tips={["Facilities: Show/hide facility markers with clustering", "Heatmap: Density visualization of subsidy gaps", "Flows: Animated data flow visualization"]} delay={300} />
          <FeatureCard title="Flow Simulation" description="Enable the particle flow simulation to see animated data moving between facilities. Adjust speed, intensity, and trail length." icon={<Activity className="w-5 h-5" />} color={COLORS.purple} tips={["Toggle Simulation layer in the Toolkit panel", "Adjust particle speed, size, and opacity", "Works best in 2D mode with dark basemap"]} delay={400} />
        </div>
      </GuideSection>

      {/* Pattern Lab */}
      <GuideSection 
        title="🔬 Pattern Lab" 
        icon={<Cpu className="w-5 h-5" />}
        color={COLORS.purple}
        index={4}
      >
        <p className="text-sm text-gray-400 mb-4">
          Pattern Lab is an advanced analysis engine that detects compliance anomalies using statistical methods including 
          robust z-scores, MAD (Median Absolute Deviation), and cross-sectional correlations.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FeatureCard title="Scenario Presets" description="Choose from preset scenarios: Conservative, Balanced, Aggressive, or Hyperscaler Focus." icon={<Target className="w-5 h-5" />} color={COLORS.cyan} tips={["Conservative: High thresholds, fewer false positives", "Aggressive: Low thresholds, catches more issues"]} delay={100} />
          <FeatureCard title="Visual Analytics" description="Interactive charts show severity distribution and top operators. Donut chart for severity, bar chart for operators." icon={<BarChart3 className="w-5 h-5" />} color={COLORS.green} tips={["Click severity segments to filter findings", "Charts update in real-time with filters"]} delay={200} />
                </div>
      </GuideSection>

      {/* Network Security */}
      <GuideSection 
        title="🛡️ Network Security & BGP Monitor" 
        icon={<Shield className="w-5 h-5" />}
        color={COLORS.green}
        index={5}
      >
        <p className="text-sm text-gray-400 mb-4">
          The Network Security tab includes a <strong className="text-green-400">real-time BGP Route Monitor</strong> connected to 
          RIPE RIS Live - actual BGP updates from global route collectors, not simulated data.
        </p>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <FeatureCard title="Live BGP Feed" description="Real-time WebSocket connection to RIPE RIS. See actual BGP announcements and withdrawals." icon={<Radio className="w-5 h-5" />} color={COLORS.cyan} tips={["Data from RRC00 collector (Amsterdam)", "Updates every few milliseconds"]} delay={100} />
          <FeatureCard title="Anomaly Detection" description="Automatic detection of BGP anomalies: MOAS, bogon prefixes, unusually long paths." icon={<AlertTriangle className="w-5 h-5" />} color={COLORS.yellow} tips={["MOAS: Multiple ASes announcing same prefix", "Long Path: >10 hops (potential leak)"]} delay={200} />
                </div>
      </GuideSection>

      {/* Keyboard Shortcuts */}
      <GuideSection 
        title="⌨️ Keyboard Shortcuts" 
        icon={<Keyboard className="w-5 h-5" />}
        color={COLORS.yellow}
        index={6}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
          <FadeIn delay={100} direction="left">
            <div>
              <h4 className="font-semibold text-white mb-3">Navigation</h4>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <ShortcutRow keys={["⌘", "K"]} description="Open global search" />
                <ShortcutRow keys={["1"]} description="Guides tab" />
                <ShortcutRow keys={["2"]} description="Overview tab" />
                <ShortcutRow keys={["3"]} description="Geography tab" />
                <ShortcutRow keys={["4"]} description="Problems tab" />
                </div>
                </div>
          </FadeIn>
          <FadeIn delay={200} direction="right">
            <div>
              <h4 className="font-semibold text-white mb-3">Actions</h4>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <ShortcutRow keys={["Esc"]} description="Close modals/search" />
                <ShortcutRow keys={["Enter"]} description="Execute AI search" />
                <ShortcutRow keys={["F"]} description="Toggle fullscreen" />
              </div>
              <h4 className="font-semibold text-white mb-3 mt-4">Map Controls</h4>
              <div className="bg-gray-800/30 rounded-lg p-4">
                <ShortcutRow keys={["+", "-"]} description="Zoom in/out" />
                <ShortcutRow keys={["↑", "↓", "←", "→"]} description="Pan map" />
              </div>
            </div>
          </FadeIn>
        </div>
      </GuideSection>

      {/* Data Sources */}
      <GuideSection 
        title="📊 Data Sources & Intelligence Methods" 
        icon={<Database className="w-5 h-5" />}
        color={COLORS.green}
        index={7}
      >
        <p className="text-sm text-gray-400 mb-4">
          The Command Center aggregates data from multiple authoritative sources and applies advanced intelligence methods. All data persists locally in IndexedDB for privacy and offline access.
        </p>
        
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Globe className="w-4 h-4" />
            Real-Time Data APIs (Free, No Auth Required)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            <DataSourceCard 
              icon={Globe} 
              name="RIPE RIS Live" 
              description="Real-time BGP routing updates via WebSocket (wss://ris-live.ripe.net)" 
              color={COLORS.cyan} 
              delay={100}
              status="live"
              updateFreq="Real-time"
            />
            <DataSourceCard 
              icon={Shield} 
              name="EPA ECHO" 
              description="Environmental compliance & facility data (echo.epa.gov/api/v1)" 
              color={COLORS.green} 
              delay={150}
              status="available"
              updateFreq="Daily"
            />
            <DataSourceCard 
              icon={FileText} 
              name="SEC EDGAR" 
              description="Corporate filings & ownership (data.sec.gov/submissions)" 
              color={COLORS.blue} 
              delay={200}
              status="available"
              updateFreq="Real-time"
            />
            <DataSourceCard 
              icon={DollarSign} 
              name="USASpending" 
              description="Federal contracts & grants (api.usaspending.gov/api/v2)" 
              color={COLORS.yellow} 
              delay={250}
              status="available"
              updateFreq="Daily"
            />
            <DataSourceCard 
              icon={Network} 
              name="PeeringDB" 
              description="Network infrastructure & interconnects (peeringdb.com/api)" 
              color={COLORS.purple} 
              delay={300}
              status="available"
              updateFreq="Community-driven"
            />
            <DataSourceCard 
              icon={Link2} 
              name="GLEIF LEI" 
              description="Legal entity identifiers (api.gleif.org/api/v1)" 
              color={COLORS.red} 
              delay={350}
              status="available"
              updateFreq="Daily"
            />
            <DataSourceCard 
              icon={Terminal} 
              name="Certstream" 
              description="Real-time SSL certificate transparency logs" 
              color={COLORS.cyan} 
              delay={400}
              status="available"
              updateFreq="Real-time"
            />
            <DataSourceCard 
              icon={MapIcon} 
              name="Nominatim" 
              description="OpenStreetMap geocoding (nominatim.openstreetmap.org)" 
              color={COLORS.green} 
              delay={450}
              status="available"
              updateFreq="On-demand"
            />
          </div>
        </div>
        
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Cpu className="w-4 h-4" />
            Intelligence Analysis Methods (Browser-Based AI)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <IntelligenceMethodCard
              name="Statistical Anomaly Detection"
              description="Isolation Forest algorithm identifies facilities with unusual patterns across multiple dimensions"
              method="Unsupervised ML"
              confidence="85-95%"
              usedIn="Intelligence Hub"
              color={COLORS.purple}
              delay={500}
            />
            <IntelligenceMethodCard
              name="Intent-Based Validation"
              description="Continuously validates actual outcomes against subsidy agreement promises (jobs, investment, compliance)"
              method="Rule-based + Trend Analysis"
              confidence="95%"
              usedIn="Intelligence Hub, Assurance Monitor"
              color={COLORS.cyan}
              delay={550}
            />
            <IntelligenceMethodCard
              name="ARIMA Time Series Forecasting"
              description="Predicts future compliance trends and subsidy gaps using AutoRegressive Integrated Moving Average"
              method="Supervised ML"
              confidence="70-85%"
              usedIn="Predictive Intel, Intelligence Hub"
              color={COLORS.blue}
              delay={600}
            />
            <IntelligenceMethodCard
              name="Cross-Correlation Analysis"
              description="Automatically detects when multiple issues (anomaly + violation + prediction) affect same facility"
              method="Graph-based"
              confidence="90%"
              usedIn="Intelligence Hub (NEW)"
              color={COLORS.yellow}
              delay={650}
            />
            <IntelligenceMethodCard
              name="Root Cause Analysis"
              description="AI-powered causality detection identifies contributing factors for compliance failures"
              method="Causal Inference"
              confidence="75-85%"
              usedIn="Intelligence Hub (NEW)"
              color={COLORS.red}
              delay={700}
            />
            <IntelligenceMethodCard
              name="Graph Pattern Recognition"
              description="Cytoscape.js network analysis reveals operator clusters, compliance patterns, and infrastructure relationships"
              method="Graph Theory"
              confidence="90%"
              usedIn="Compliance Flow, Intelligence Hub"
              color={COLORS.green}
              delay={750}
            />
            <IntelligenceMethodCard
              name="Monte Carlo Simulation"
              description="Runs thousands of scenarios to model compliance risk distributions and predict outcomes"
              method="Statistical Simulation"
              confidence="80%"
              usedIn="Predictive Intel"
              color={COLORS.purple}
              delay={800}
            />
            <IntelligenceMethodCard
              name="Logistic Regression Risk Scoring"
              description="Multi-factor model predicts compliance risk based on historical patterns, subsidy size, operator history"
              method="Supervised ML"
              confidence="85%"
              usedIn="Predictive Intel"
              color={COLORS.cyan}
              delay={850}
            />
          </div>
        </div>
        
        <div className="mb-6">
          <h4 className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Data Storage & Privacy
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-gray-800/50 border border-gray-700 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Database className="w-4 h-4 text-green-400" />
                <h5 className="text-xs font-semibold text-white">IndexedDB (Dexie.js)</h5>
              </div>
              <p className="text-[10px] text-gray-400 mb-2">
                11,992 facilities stored locally in your browser. No server uploads.
              </p>
              <div className="flex items-center gap-1 text-[9px] text-green-400">
                <CheckCircle2 className="w-3 h-3" />
                Zero server sync, full privacy
              </div>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Lock className="w-4 h-4 text-blue-400" />
                <h5 className="text-xs font-semibold text-white">OPFS (Origin Private File System)</h5>
              </div>
              <p className="text-[10px] text-gray-400 mb-2">
                High-performance storage for graph data and large datasets.
              </p>
              <div className="flex items-center gap-1 text-[9px] text-blue-400">
                <CheckCircle2 className="w-3 h-3" />
                Browser-isolated, encrypted
              </div>
            </div>
            
            <div className="bg-gray-800/50 border border-gray-700 rounded p-3">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="w-4 h-4 text-purple-400" />
                <h5 className="text-xs font-semibold text-white">Service Worker (PWA)</h5>
              </div>
              <p className="text-[10px] text-gray-400 mb-2">
                Offline caching, background sync, install as app.
              </p>
              <div className="flex items-center gap-1 text-[9px] text-purple-400">
                <CheckCircle2 className="w-3 h-3" />
                Works offline, installable
              </div>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <h4 className="text-xs font-semibold text-gray-300 mb-3 flex items-center gap-2">
            <Workflow className="w-4 h-4" />
            Data Flow Architecture
          </h4>
          <div className="bg-gray-800/30 border border-gray-700 rounded p-4 font-mono text-[10px] text-gray-400 overflow-x-auto">
            <pre className="whitespace-pre">
{`┌─────────────────────────────────────────────────────────┐
│ 1. DATA INGESTION                                       │
├─────────────────────────────────────────────────────────┤
│ Free APIs → Cloudflare Worker Proxy → Your Browser     │
│   (CORS handling, no auth needed)                       │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 2. LOCAL STORAGE (IndexedDB)                            │
├─────────────────────────────────────────────────────────┤
│ facilities (11,992) │ analyses │ scenarios │ settings   │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 3. INTELLIGENCE ENGINE (Unified)                        │
├─────────────────────────────────────────────────────────┤
│ Statistical Anomalies → Isolation Forest                │
│ Intent Violations → Assurance Engine                    │
│ Predictions → ARIMA + Monte Carlo                       │
│ Correlations → Graph Analysis                           │
│ Root Cause → Causal Inference                           │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│ 4. VISUALIZATION                                        │
├─────────────────────────────────────────────────────────┤
│ Intelligence Hub → Unified findings + correlations      │
│ Compliance Flow → Cytoscape graph (Intent vs. Actual)   │
│ Predictive Intel → ECharts forecasts                    │
│ Assurance Monitor → Real-time drift alerts              │
└─────────────────────────────────────────────────────────┘`}
            </pre>
          </div>
        </div>
        
        <div className="bg-blue-950/30 border border-blue-800 rounded p-3">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <h5 className="text-xs font-semibold text-blue-300 mb-1">Data Quality & Verification</h5>
              <p className="text-[10px] text-blue-200 mb-2">
                All data sources are <strong>free, open, and government-maintained</strong>. No proprietary data or paid APIs required.
              </p>
              <ul className="space-y-1 text-[9px] text-blue-300">
                <li className="flex items-start gap-1">
                  <span className="text-blue-400">•</span>
                  <span><strong>EPA ECHO:</strong> Official EPA environmental compliance database</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-blue-400">•</span>
                  <span><strong>SEC EDGAR:</strong> Legal filings, audited by SEC</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-blue-400">•</span>
                  <span><strong>USASpending:</strong> Official federal spending transparency site</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-blue-400">•</span>
                  <span><strong>RIPE RIS Live:</strong> Real BGP data from global route collectors</span>
                </li>
                <li className="flex items-start gap-1">
                  <span className="text-blue-400">•</span>
                  <span><strong>Local AI:</strong> All analysis runs in your browser, no data sent to servers</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </GuideSection>

      {/* Pro Tips */}
      <GuideSection 
        title="💡 Pro Tips" 
        icon={<Lightbulb className="w-5 h-5" />}
        color={COLORS.yellow}
        index={8}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <ProTipCard title="Expand Multiple Facilities" description="Click multiple rows to expand them simultaneously for comparison." color={COLORS.yellow} delay={100} />
          <ProTipCard title="Hover for Tooltips" description="Most elements have tooltips. Hover over headers, badges, and icons for context." color={COLORS.cyan} delay={150} />
          <ProTipCard title="Save Connectography Scenes" description="Use the Toolkit panel to save map views for quick access later." color={COLORS.purple} delay={200} />
          <ProTipCard title="Pin Pattern Lab Findings" description="Click the pin icon on findings to keep them visible while exploring." color={COLORS.green} delay={250} />
          <ProTipCard title="Use Compliance Language" description="Say 'non-compliance' not 'fraud' - avoids legal burden of proving criminal intent." color={COLORS.red} delay={300} />
          <ProTipCard title="Data Persists Locally" description="All data is stored in IndexedDB. Your settings and filters persist across sessions." color={COLORS.blue} delay={350} />
      </div>
      </GuideSection>

      {/* Animated Footer */}
      <FadeIn delay={400} duration={600}>
        <div className="mt-8 p-4 bg-gray-900/50 border border-gray-800 rounded-xl text-center relative overflow-hidden group hover:border-cyan-500/30 transition-all cursor-pointer">
          <div 
            className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
            style={{
              background: 'radial-gradient(circle at 50% 50%, rgba(0,210,211,0.1), transparent 70%)',
            }}
          />
          <div className="relative flex items-center justify-center gap-2 text-gray-400 text-sm mb-2">
            <Terminal className="w-4 h-4" />
            <span>Global Infrastructure Command Center</span>
            <PulsingDot color={COLORS.green} size={6} />
          </div>
          <p className="relative text-xs text-gray-600">
            Built for labor studies research • Zero-backend browser architecture • 
            <a 
              href="https://github.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-cyan-500 hover:text-cyan-400 ml-1 inline-flex items-center gap-1"
            >
              Open Source
              <ExternalLink className="w-3 h-3" />
            </a>
        </p>
      </div>
      </FadeIn>

      {/* Global CSS for animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) translateX(0px); opacity: 0.2; }
          50% { transform: translateY(-15px) translateX(10px); opacity: 0.4; }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 10px rgba(0, 210, 211, 0.3); }
          50% { box-shadow: 0 0 25px rgba(0, 210, 211, 0.6); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
});

export default GuidesTab;
