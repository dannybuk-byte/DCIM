/**
 * UIOptionsShowcase.tsx
 * 
 * Interactive showcase of 8 different UI/UX patterns for the DCIM app.
 * Each demonstrates a unique approach to balancing:
 * - Data density
 * - Visualizations/infographics
 * - Legibility
 * - Navigability
 */

import React, { useState } from 'react';
import {
  Layout, Grid, Layers, PanelLeft, Maximize2, BarChart3,
  Map, Table, TreePine, Network, Columns, Square,
  ChevronRight, ChevronDown, Search, Filter, Settings,
  Building2, AlertTriangle, DollarSign, Users, TrendingUp,
  Eye, Zap, Sparkles, Star, Check, X, ArrowRight
} from 'lucide-react';

// Sample data for demonstrations
const sampleStats = {
  total: 11992,
  compliant: 8739,
  nonCompliant: 3253,
  subsidyGap: 4930000000,
  jobsGap: 47500
};

interface LayoutOption {
  id: string;
  name: string;
  icon: React.ReactNode;
  tagline: string;
  description: string;
  bestFor: string[];
  tradeoffs: string[];
  density: 'high' | 'medium' | 'low';
  visualRatio: number; // 0-100, % of screen for visuals
  example: React.ReactNode;
}

// ============================================================================
// LAYOUT 1: BENTO GRID (Apple-inspired)
// ============================================================================
const BentoGridExample: React.FC = () => (
  <div className="grid grid-cols-4 grid-rows-3 gap-2 h-64 p-2 bg-slate-100 rounded-lg">
    {/* Large hero card */}
    <div className="col-span-2 row-span-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-4 text-white">
      <div className="text-xs opacity-70 mb-1">Total Facilities</div>
      <div className="text-3xl font-bold">11,992</div>
      <div className="mt-4 flex items-end justify-between">
        <div className="text-xs opacity-70">+2.5% this month</div>
        <Building2 size={40} className="opacity-30" />
      </div>
    </div>
    {/* Medium cards */}
    <div className="bg-white rounded-xl p-3 shadow-sm">
      <div className="text-[10px] text-slate-500">Compliant</div>
      <div className="text-lg font-bold text-emerald-600">8,739</div>
    </div>
    <div className="bg-gradient-to-br from-rose-500 to-red-600 rounded-xl p-3 text-white">
      <div className="text-[10px] opacity-80">Non-Compliant</div>
      <div className="text-lg font-bold">3,253</div>
    </div>
    <div className="col-span-2 bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
        <DollarSign className="text-purple-600" size={24} />
      </div>
      <div>
        <div className="text-[10px] text-slate-500">Subsidy Gap</div>
        <div className="text-lg font-bold text-purple-600">$4.93B</div>
      </div>
    </div>
    {/* Bottom row */}
    <div className="col-span-2 bg-slate-800 rounded-xl p-3 flex items-center justify-between">
      <div className="text-white text-xs">Quick Actions</div>
      <div className="flex gap-1">
        <button className="px-2 py-1 bg-white/10 rounded text-white text-[10px]">Export</button>
        <button className="px-2 py-1 bg-cyan-500 rounded text-white text-[10px]">Analyze</button>
      </div>
    </div>
    <div className="col-span-2 bg-gradient-to-r from-amber-400 to-orange-500 rounded-xl p-3 flex items-center gap-2">
      <AlertTriangle className="text-white" size={20} />
      <div className="text-white text-xs font-medium">47 alerts need attention</div>
    </div>
  </div>
);

// ============================================================================
// LAYOUT 2: COMMAND CENTER (Bloomberg Terminal-inspired)
// ============================================================================
const CommandCenterExample: React.FC = () => (
  <div className="h-64 bg-[#0a0e17] rounded-lg p-1.5 font-mono text-[10px]">
    <div className="grid grid-cols-4 gap-1 h-full">
      {/* Left panel - watchlist */}
      <div className="bg-[#0d1219] rounded p-2 border border-[#1e293b]">
        <div className="text-cyan-400 border-b border-[#1e293b] pb-1 mb-2">WATCHLIST</div>
        {['AMZN', 'GOOG', 'META', 'MSFT'].map(ticker => (
          <div key={ticker} className="flex justify-between py-0.5 text-gray-400">
            <span>{ticker}</span>
            <span className="text-red-400">-2.3%</span>
          </div>
        ))}
      </div>
      {/* Center - main chart */}
      <div className="col-span-2 bg-[#0d1219] rounded p-2 border border-[#1e293b]">
        <div className="text-cyan-400 mb-2">SUBSIDY GAP TREND</div>
        <div className="h-32 flex items-end gap-0.5">
          {[40, 55, 45, 60, 75, 65, 80, 70, 85, 90, 82, 95].map((h, i) => (
            <div key={i} className="flex-1 bg-gradient-to-t from-cyan-600 to-cyan-400 rounded-t" style={{ height: `${h}%` }} />
          ))}
        </div>
        <div className="text-gray-500 text-center mt-1">Jan - Dec 2025</div>
      </div>
      {/* Right panel - stats */}
      <div className="bg-[#0d1219] rounded p-2 border border-[#1e293b]">
        <div className="text-cyan-400 border-b border-[#1e293b] pb-1 mb-2">METRICS</div>
        <div className="space-y-2">
          <div>
            <div className="text-gray-500">FACILITIES</div>
            <div className="text-white text-lg">11,992</div>
          </div>
          <div>
            <div className="text-gray-500">GAP</div>
            <div className="text-red-400 text-lg">$4.93B</div>
          </div>
          <div>
            <div className="text-gray-500">JOBS</div>
            <div className="text-amber-400 text-lg">-47.5K</div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// LAYOUT 3: NOTION-STYLE (Clean, minimal, document-like)
// ============================================================================
const NotionStyleExample: React.FC = () => (
  <div className="h-64 bg-white rounded-lg p-4 overflow-hidden">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-8 h-8 bg-blue-100 rounded flex items-center justify-center">
        <Building2 className="text-blue-600" size={16} />
      </div>
      <h2 className="text-lg font-semibold text-gray-900">DCIM Compliance Overview</h2>
    </div>
    <div className="text-sm text-gray-600 mb-4 leading-relaxed">
      Tracking <span className="font-semibold text-gray-900">11,992 facilities</span> across 
      <span className="font-semibold text-gray-900"> 48 states</span>. Current subsidy gap stands at 
      <span className="font-semibold text-red-600"> $4.93 billion</span>.
    </div>
    {/* Inline database view */}
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center gap-2">
        <Table size={14} className="text-gray-400" />
        <span className="text-xs font-medium text-gray-600">Facilities Database</span>
        <span className="text-xs text-gray-400 ml-auto">11,992 items</span>
      </div>
      <div className="divide-y divide-gray-100">
        {['AWS Virginia', 'Google Oregon', 'Meta Texas'].map((name, i) => (
          <div key={i} className="px-3 py-2 flex items-center text-xs">
            <span className="w-1/3 text-gray-900">{name}</span>
            <span className={`w-1/3 px-2 py-0.5 rounded-full text-center ${i === 2 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {i === 2 ? 'Non-Compliant' : 'Compliant'}
            </span>
            <span className="w-1/3 text-right text-gray-500">${(Math.random() * 100).toFixed(1)}M gap</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================================
// LAYOUT 4: DASHBOARD CARDS (Stripe-inspired)
// ============================================================================
const StripeCardsExample: React.FC = () => (
  <div className="h-64 bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4">
    <div className="grid grid-cols-3 gap-3 mb-3">
      {[
        { label: 'Facilities', value: '11,992', change: '+2.5%', positive: true },
        { label: 'Compliance Rate', value: '72.9%', change: '-1.2%', positive: false },
        { label: 'Subsidy Gap', value: '$4.93B', change: '+$340M', positive: false }
      ].map((stat, i) => (
        <div key={i} className="bg-white rounded-xl p-3 shadow-sm border border-slate-200/50">
          <div className="text-xs text-slate-500 mb-1">{stat.label}</div>
          <div className="text-xl font-semibold text-slate-900">{stat.value}</div>
          <div className={`text-xs mt-1 ${stat.positive ? 'text-emerald-600' : 'text-rose-600'}`}>
            {stat.change}
          </div>
        </div>
      ))}
    </div>
    <div className="bg-white rounded-xl p-3 shadow-sm border border-slate-200/50 h-32">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-700">Compliance Trend</span>
        <select className="text-xs text-slate-500 bg-transparent">
          <option>Last 7 days</option>
        </select>
      </div>
      <div className="h-16 flex items-end gap-1">
        {[65, 70, 68, 72, 75, 73, 78].map((h, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-indigo-100 rounded-t" style={{ height: `${h}%` }}>
              <div className="w-full bg-indigo-500 rounded-t" style={{ height: '70%' }} />
            </div>
            <span className="text-[8px] text-slate-400">{['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ============================================================================
// LAYOUT 5: MAP-CENTRIC (GIS-focused)
// ============================================================================
const MapCentricExample: React.FC = () => (
  <div className="h-64 bg-slate-900 rounded-lg overflow-hidden relative">
    {/* Fake map background */}
    <div className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900">
      <svg className="w-full h-full opacity-20">
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#334155" strokeWidth="0.5" />
        </pattern>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Fake markers */}
      {[
        { x: '20%', y: '30%', size: 20, color: '#ef4444' },
        { x: '45%', y: '50%', size: 30, color: '#22c55e' },
        { x: '70%', y: '25%', size: 25, color: '#f59e0b' },
        { x: '80%', y: '60%', size: 15, color: '#22c55e' },
        { x: '35%', y: '70%', size: 20, color: '#ef4444' }
      ].map((m, i) => (
        <div key={i} className="absolute rounded-full animate-pulse" style={{
          left: m.x, top: m.y,
          width: m.size, height: m.size,
          backgroundColor: m.color,
          opacity: 0.6,
          transform: 'translate(-50%, -50%)'
        }} />
      ))}
    </div>
    {/* Floating panel */}
    <div className="absolute top-3 left-3 bg-slate-800/90 backdrop-blur rounded-lg p-3 w-48 border border-slate-700">
      <div className="text-xs text-slate-400 mb-2">Selected Region: Texas</div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Facilities</span>
          <span className="text-white font-medium">1,847</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Non-Compliant</span>
          <span className="text-red-400 font-medium">423</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">Gap</span>
          <span className="text-amber-400 font-medium">$892M</span>
        </div>
      </div>
    </div>
    {/* Legend */}
    <div className="absolute bottom-3 right-3 bg-slate-800/90 backdrop-blur rounded-lg p-2 border border-slate-700">
      <div className="flex items-center gap-3 text-[10px]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Compliant</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" /> Non-Compliant</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> At Risk</span>
      </div>
    </div>
  </div>
);

// ============================================================================
// LAYOUT 6: TREE/HIERARCHY (File explorer-inspired)
// ============================================================================
const TreeHierarchyExample: React.FC = () => (
  <div className="h-64 bg-white rounded-lg p-3 overflow-hidden">
    <div className="flex items-center gap-2 mb-3">
      <TreePine size={16} className="text-slate-600" />
      <span className="text-sm font-medium text-slate-800">Facility Hierarchy</span>
      <span className="text-xs text-slate-400 ml-auto">11,992 items</span>
    </div>
    <div className="space-y-0.5 text-xs font-mono">
      {/* Expanded tree */}
      <div className="flex items-center gap-1 py-1 px-2 bg-blue-50 rounded text-blue-700">
        <ChevronDown size={12} />
        <Layers size={12} />
        <span>United States (11,992)</span>
      </div>
      <div className="ml-4 space-y-0.5">
        <div className="flex items-center gap-1 py-1 px-2 hover:bg-slate-50 rounded text-slate-600">
          <ChevronDown size={12} />
          <span>Texas (1,847)</span>
          <span className="ml-auto text-red-500">423 issues</span>
        </div>
        <div className="ml-4 space-y-0.5">
          <div className="flex items-center gap-1 py-1 px-2 hover:bg-slate-50 rounded text-slate-500">
            <ChevronRight size={12} />
            <span>Amazon (312)</span>
          </div>
          <div className="flex items-center gap-1 py-1 px-2 bg-rose-50 rounded text-rose-700">
            <ChevronDown size={12} />
            <span>Google (287)</span>
            <span className="ml-auto">⚠️ 45</span>
          </div>
          <div className="ml-4">
            <div className="flex items-center gap-1 py-1 px-2 hover:bg-slate-50 rounded text-slate-500">
              <Building2 size={10} />
              <span>Midlothian DC-01</span>
              <span className="ml-auto text-emerald-600">✓</span>
            </div>
            <div className="flex items-center gap-1 py-1 px-2 hover:bg-rose-50 rounded text-rose-600">
              <Building2 size={10} />
              <span>Fort Worth DC-02</span>
              <span className="ml-auto">✗</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 py-1 px-2 hover:bg-slate-50 rounded text-slate-600">
          <ChevronRight size={12} />
          <span>Virginia (2,134)</span>
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// LAYOUT 7: SPLIT PANEL (IDE-inspired)
// ============================================================================
const SplitPanelExample: React.FC = () => (
  <div className="h-64 bg-slate-100 rounded-lg overflow-hidden flex">
    {/* Left sidebar */}
    <div className="w-12 bg-slate-800 flex flex-col items-center py-2 gap-2">
      <button className="p-2 bg-slate-700 rounded text-white"><Building2 size={14} /></button>
      <button className="p-2 hover:bg-slate-700 rounded text-slate-400"><Map size={14} /></button>
      <button className="p-2 hover:bg-slate-700 rounded text-slate-400"><BarChart3 size={14} /></button>
      <button className="p-2 hover:bg-slate-700 rounded text-slate-400"><Settings size={14} /></button>
    </div>
    {/* File tree panel */}
    <div className="w-40 bg-slate-50 border-r border-slate-200 p-2 text-xs">
      <div className="text-slate-500 text-[10px] font-medium mb-2">EXPLORER</div>
      <div className="space-y-1">
        <div className="flex items-center gap-1 text-slate-700 font-medium">
          <ChevronDown size={10} /> Operators
        </div>
        <div className="ml-3 space-y-0.5 text-slate-600">
          <div className="py-0.5 hover:text-blue-600 cursor-pointer">Amazon (3,421)</div>
          <div className="py-0.5 hover:text-blue-600 cursor-pointer bg-blue-100 text-blue-700 px-1 rounded">Google (2,891)</div>
          <div className="py-0.5 hover:text-blue-600 cursor-pointer">Microsoft (1,934)</div>
        </div>
      </div>
    </div>
    {/* Main content */}
    <div className="flex-1 p-3">
      <div className="text-sm font-semibold text-slate-800 mb-2 flex items-center gap-2">
        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">Google</span>
        2,891 facilities
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-white rounded p-2 border border-slate-200">
          <div className="text-[10px] text-slate-500">Compliant</div>
          <div className="text-lg font-bold text-emerald-600">2,103</div>
        </div>
        <div className="bg-white rounded p-2 border border-slate-200">
          <div className="text-[10px] text-slate-500">Issues</div>
          <div className="text-lg font-bold text-rose-600">788</div>
        </div>
      </div>
      <div className="mt-2 bg-white rounded p-2 border border-slate-200">
        <div className="text-[10px] text-slate-500 mb-1">Subsidy Gap by State</div>
        <div className="flex gap-0.5">
          {[60, 45, 30, 25, 20].map((w, i) => (
            <div key={i} className="h-8 bg-gradient-to-t from-purple-600 to-purple-400 rounded" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    </div>
  </div>
);

// ============================================================================
// LAYOUT 8: KANBAN/WORKFLOW (Trello-inspired)
// ============================================================================
const KanbanExample: React.FC = () => (
  <div className="h-64 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-3 overflow-hidden">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-sm font-semibold text-slate-800">Compliance Pipeline</h3>
      <button className="text-xs text-indigo-600">+ Add Lane</button>
    </div>
    <div className="flex gap-2 h-48 overflow-x-auto">
      {[
        { title: 'To Review', count: 847, color: 'bg-slate-200', items: ['AWS-TX-001', 'GGL-VA-023'] },
        { title: 'In Progress', count: 234, color: 'bg-amber-200', items: ['META-OR-012'] },
        { title: 'Non-Compliant', count: 3253, color: 'bg-red-200', items: ['MSFT-WA-087', 'AWS-OH-445'] },
        { title: 'Resolved', count: 8739, color: 'bg-emerald-200', items: ['GGL-IA-001'] }
      ].map((lane, i) => (
        <div key={i} className="w-36 flex-shrink-0">
          <div className={`${lane.color} rounded-t-lg px-2 py-1.5 text-xs font-medium text-slate-700 flex justify-between`}>
            <span>{lane.title}</span>
            <span className="bg-white/50 px-1.5 rounded">{lane.count.toLocaleString()}</span>
          </div>
          <div className="bg-white/80 rounded-b-lg p-1.5 space-y-1.5 min-h-[120px]">
            {lane.items.map((item, j) => (
              <div key={j} className="bg-white rounded p-2 shadow-sm border border-slate-100 text-[10px]">
                <div className="font-medium text-slate-700">{item}</div>
                <div className="text-slate-400 mt-1">$2.3M gap</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

// ============================================================================
// MAIN SHOWCASE COMPONENT
// ============================================================================
const layouts: LayoutOption[] = [
  {
    id: 'bento',
    name: 'Bento Grid',
    icon: <Grid size={20} />,
    tagline: 'Apple-inspired asymmetric grid',
    description: 'Asymmetric grid layout with varying card sizes. Great for highlighting key metrics while maintaining visual hierarchy.',
    bestFor: ['Executive dashboards', 'At-a-glance summaries', 'Marketing/demo screens'],
    tradeoffs: ['Less data density', 'Harder to scan systematically'],
    density: 'low',
    visualRatio: 70,
    example: <BentoGridExample />
  },
  {
    id: 'command',
    name: 'Command Center',
    icon: <Layers size={20} />,
    tagline: 'Bloomberg Terminal / Mission Control',
    description: 'High-density dark interface optimized for power users. Maximum information per pixel.',
    bestFor: ['Power users', 'Real-time monitoring', 'Trading/analytics'],
    tradeoffs: ['Steep learning curve', 'Not beginner-friendly', 'Harder to present'],
    density: 'high',
    visualRatio: 60,
    example: <CommandCenterExample />
  },
  {
    id: 'notion',
    name: 'Document Style',
    icon: <Layout size={20} />,
    tagline: 'Notion / Linear clean aesthetic',
    description: 'Clean, readable, document-like interface. Data presented as inline content with embedded tables.',
    bestFor: ['Reports', 'Documentation', 'Stakeholder presentations', 'Readable exports'],
    tradeoffs: ['Lower data density', 'More scrolling', 'Less visual impact'],
    density: 'low',
    visualRatio: 20,
    example: <NotionStyleExample />
  },
  {
    id: 'stripe',
    name: 'Dashboard Cards',
    icon: <Square size={20} />,
    tagline: 'Stripe / Vercel modern SaaS',
    description: 'Clean card-based layout with subtle shadows and rounded corners. Professional and approachable.',
    bestFor: ['SaaS applications', 'Customer-facing dashboards', 'Modern enterprise'],
    tradeoffs: ['Medium density', 'Can feel generic'],
    density: 'medium',
    visualRatio: 50,
    example: <StripeCardsExample />
  },
  {
    id: 'map',
    name: 'Map-Centric',
    icon: <Map size={20} />,
    tagline: 'GIS / Geographic-first',
    description: 'Map as the primary canvas with floating panels for data. Perfect for location-based data.',
    bestFor: ['Geographic analysis', 'Site selection', 'Regional comparison'],
    tradeoffs: ['Limited non-geographic data', 'Requires good map data'],
    density: 'medium',
    visualRatio: 80,
    example: <MapCentricExample />
  },
  {
    id: 'tree',
    name: 'Tree Hierarchy',
    icon: <TreePine size={20} />,
    tagline: 'File explorer / Nested drill-down',
    description: 'Hierarchical tree structure for navigating nested data. Great for organizational structures.',
    bestFor: ['Organizational data', 'Nested categories', 'Audit trails'],
    tradeoffs: ['Less visual appeal', 'Can be overwhelming with deep nesting'],
    density: 'high',
    visualRatio: 10,
    example: <TreeHierarchyExample />
  },
  {
    id: 'split',
    name: 'Split Panel',
    icon: <Columns size={20} />,
    tagline: 'VS Code / IDE-inspired',
    description: 'Multi-panel layout with resizable sections. Efficient for exploring and comparing.',
    bestFor: ['Power users', 'Comparison workflows', 'Detail/master views'],
    tradeoffs: ['Complex UI', 'Mobile unfriendly'],
    density: 'high',
    visualRatio: 40,
    example: <SplitPanelExample />
  },
  {
    id: 'kanban',
    name: 'Kanban/Workflow',
    icon: <PanelLeft size={20} />,
    tagline: 'Trello / Jira workflow view',
    description: 'Lane-based workflow visualization. Great for tracking items through stages.',
    bestFor: ['Workflow tracking', 'Status pipelines', 'Task management'],
    tradeoffs: ['Limited for non-workflow data', 'Horizontal scrolling'],
    density: 'medium',
    visualRatio: 30,
    example: <KanbanExample />
  }
];

export const UIOptionsShowcase: React.FC = () => {
  const [selectedLayout, setSelectedLayout] = useState<string>('bento');
  const [comparisonMode, setComparisonMode] = useState(false);
  const [compareLayouts, setCompareLayouts] = useState<string[]>([]);

  const selected = layouts.find(l => l.id === selectedLayout)!;

  const toggleCompare = (id: string) => {
    if (compareLayouts.includes(id)) {
      setCompareLayouts(compareLayouts.filter(l => l !== id));
    } else if (compareLayouts.length < 2) {
      setCompareLayouts([...compareLayouts, id]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">UI/UX Layout Options</h1>
          <p className="text-slate-600 max-w-2xl mx-auto">
            Explore 8 different layout philosophies for the DCIM Compliance App. 
            Each balances data density, visualizations, and navigability differently.
          </p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <button
              onClick={() => setComparisonMode(!comparisonMode)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                comparisonMode 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-white text-slate-700 border border-slate-300 hover:border-indigo-300'
              }`}
            >
              {comparisonMode ? 'Exit Compare Mode' : 'Compare Layouts'}
            </button>
          </div>
        </div>

        {/* Layout Selector */}
        <div className="grid grid-cols-4 lg:grid-cols-8 gap-2 mb-8">
          {layouts.map((layout) => (
            <button
              key={layout.id}
              onClick={() => comparisonMode ? toggleCompare(layout.id) : setSelectedLayout(layout.id)}
              className={`p-3 rounded-xl text-center transition-all ${
                comparisonMode
                  ? compareLayouts.includes(layout.id)
                    ? 'bg-indigo-600 text-white ring-2 ring-indigo-400'
                    : 'bg-white text-slate-600 hover:bg-slate-100'
                  : selectedLayout === layout.id
                    ? 'bg-indigo-600 text-white shadow-lg scale-105'
                    : 'bg-white text-slate-600 hover:bg-slate-100 hover:shadow'
              }`}
            >
              <div className="flex justify-center mb-1">{layout.icon}</div>
              <div className="text-xs font-medium">{layout.name}</div>
            </button>
          ))}
        </div>

        {/* Comparison Mode */}
        {comparisonMode && compareLayouts.length === 2 ? (
          <div className="grid grid-cols-2 gap-6">
            {compareLayouts.map(id => {
              const layout = layouts.find(l => l.id === id)!;
              return (
                <div key={id} className="bg-white rounded-2xl p-6 shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">{layout.icon}</div>
                    <div>
                      <h3 className="font-bold text-slate-900">{layout.name}</h3>
                      <p className="text-sm text-slate-500">{layout.tagline}</p>
                    </div>
                  </div>
                  {layout.example}
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="text-slate-500">Density</div>
                      <div className="font-bold text-slate-800 capitalize">{layout.density}</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="text-slate-500">Visual Ratio</div>
                      <div className="font-bold text-slate-800">{layout.visualRatio}%</div>
                    </div>
                    <div className="p-2 bg-slate-50 rounded">
                      <div className="text-slate-500">Best For</div>
                      <div className="font-bold text-slate-800 truncate">{layout.bestFor[0]}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* Single Layout View */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Preview */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">{selected.icon}</div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                    <p className="text-sm text-slate-500">{selected.tagline}</p>
                  </div>
                </div>
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2">
                  <Zap size={16} />
                  Apply This Layout
                </button>
              </div>
              {selected.example}
            </div>

            {/* Details Panel */}
            <div className="space-y-4">
              {/* Metrics */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <h3 className="font-bold text-slate-900 mb-3">Layout Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Data Density</span>
                      <span className="font-medium text-slate-800 capitalize">{selected.density}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-indigo-500 rounded-full"
                        style={{ width: selected.density === 'high' ? '90%' : selected.density === 'medium' ? '60%' : '30%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-600">Visual/Infographic</span>
                      <span className="font-medium text-slate-800">{selected.visualRatio}%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${selected.visualRatio}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Best For */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Check size={16} className="text-emerald-500" />
                  Best For
                </h3>
                <ul className="space-y-2">
                  {selected.bestFor.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <ArrowRight size={14} className="text-emerald-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Tradeoffs */}
              <div className="bg-white rounded-2xl p-5 shadow-lg">
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-500" />
                  Trade-offs
                </h3>
                <ul className="space-y-2">
                  {selected.tradeoffs.map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
                      <X size={14} className="text-rose-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Description */}
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-5 border border-indigo-100">
                <p className="text-sm text-slate-700 leading-relaxed">{selected.description}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Comparison Table */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg overflow-x-auto">
          <h3 className="font-bold text-slate-900 mb-4">Quick Comparison</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-2 px-3 text-slate-600 font-medium">Layout</th>
                <th className="text-center py-2 px-3 text-slate-600 font-medium">Density</th>
                <th className="text-center py-2 px-3 text-slate-600 font-medium">Visuals</th>
                <th className="text-center py-2 px-3 text-slate-600 font-medium">Legibility</th>
                <th className="text-center py-2 px-3 text-slate-600 font-medium">Navigation</th>
                <th className="text-center py-2 px-3 text-slate-600 font-medium">Mobile</th>
                <th className="text-left py-2 px-3 text-slate-600 font-medium">Best For</th>
              </tr>
            </thead>
            <tbody>
              {layouts.map((layout) => (
                <tr 
                  key={layout.id} 
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer ${selectedLayout === layout.id ? 'bg-indigo-50' : ''}`}
                  onClick={() => setSelectedLayout(layout.id)}
                >
                  <td className="py-2 px-3 font-medium text-slate-800">{layout.name}</td>
                  <td className="py-2 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      layout.density === 'high' ? 'bg-emerald-100 text-emerald-700' :
                      layout.density === 'medium' ? 'bg-amber-100 text-amber-700' :
                      'bg-slate-100 text-slate-600'
                    }`}>{layout.density}</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <div key={i} className={`w-2 h-2 rounded-full ${i <= Math.ceil(layout.visualRatio / 20) ? 'bg-indigo-500' : 'bg-slate-200'}`} />
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={12} className={i <= (layout.density === 'low' ? 5 : layout.density === 'medium' ? 3 : 2) ? 'text-amber-400 fill-amber-400' : 'text-slate-200'} />
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <div className="inline-flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} size={12} className={i <= (layout.id === 'tree' || layout.id === 'split' ? 5 : layout.id === 'kanban' ? 4 : 3) ? 'text-emerald-400 fill-emerald-400' : 'text-slate-200'} />
                      ))}
                    </div>
                  </td>
                  <td className="py-2 px-3 text-center">
                    {layout.id === 'notion' || layout.id === 'stripe' || layout.id === 'bento' ? 
                      <span className="text-emerald-600">✓</span> : 
                      <span className="text-slate-400">—</span>
                    }
                  </td>
                  <td className="py-2 px-3 text-slate-600 text-xs">{layout.bestFor[0]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recommendation */}
        <div className="mt-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white/20 rounded-xl">
              <Sparkles size={24} />
            </div>
            <div>
              <h3 className="font-bold text-lg mb-2">Recommendation for DCIM Compliance App</h3>
              <p className="text-white/90 text-sm leading-relaxed mb-4">
                For a labor organizing tool that needs to balance <strong>data density</strong> (11,992 facilities), 
                <strong> visual impact</strong> (for demos), and <strong>navigability</strong> (for researchers), 
                we recommend a <strong>hybrid approach</strong>:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="font-medium mb-1">Primary: Dashboard Cards</div>
                  <div className="text-xs text-white/70">Clean, professional for demos & stakeholders</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="font-medium mb-1">Secondary: Tree Hierarchy</div>
                  <div className="text-xs text-white/70">Deep drill-down for researchers</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="font-medium mb-1">Optional: Map-Centric</div>
                  <div className="text-xs text-white/70">Geographic analysis when needed</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UIOptionsShowcase;

