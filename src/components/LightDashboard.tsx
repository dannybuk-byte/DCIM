/**
 * Light Dashboard - Professional, Demo-Ready UI with Maximum Data Density
 * 
 * Features:
 * - Nested interactive tabs at every level
 * - Deep expandable tree structures (unlimited nesting)
 * - Maximum data density with compact layouts
 * - Full drill-down capability: Operator → State → City → Facility → Issues
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  Search, Menu, Bell, Download, ChevronRight,
  Building2, AlertTriangle, CheckCircle, XCircle, HelpCircle,
  TrendingUp, TrendingDown, DollarSign, MapPin, Users,
  Filter, X, Sparkles, BarChart3, Globe, FileText, Zap, 
  Shield, Activity, RefreshCw, Clock, ArrowRight, Database, Network,
  ChevronDown, ExternalLink, Info, Copy, Check, ArrowUpRight,
  Layers, Hash, Calendar, Target, Eye, EyeOff, Maximize2, Minimize2,
  Plus, Minus, FolderOpen, Folder, ChevronUp, Server, Briefcase,
  Factory, Thermometer, Wifi, Power, Gauge, PieChart, Award, Flag,
  Link, Lock, Unlock, ArrowDownRight, HardDrive, Cpu, Command, Home,
  Compass, Navigation, Rocket, Fingerprint
} from 'lucide-react';
import { db } from '../db/database';
import { seedDatabase } from '../db/seedData';
import { Facility, ComplianceStats } from '../types';
import { calculateStats } from '../utils/stats';
import { safeDbOperation } from '../utils/dbOperations';
import { formatCurrency } from '../utils/formatting';
import { downloadComplianceReport } from '../services/PDFReportGenerator';
import { DetailedFacilityModal, ExpandableSection, DataRow } from './DetailedFacilityView';
import { DataSovereigntyHub } from './DataSovereigntyHub';
import { SurveillanceAnalysis } from './SurveillanceAnalysis';

// Types
type Section = 'dashboard' | 'facilities' | 'geography' | 'problems' | 'intelligence' | 'subsidies' | 'workers' | 'timeline' | 'reports' | 'osint' | 'network' | 'sovereignty' | 'surveillance';
type ViewMode = 'table' | 'tree' | 'cards';
type DensityMode = 'compact' | 'normal' | 'comfortable';

// ============================================================================
// NESTED TABS COMPONENT - Supports unlimited nesting levels
// ============================================================================
interface Tab {
  id: string;
  label: string;
  icon?: React.ReactNode;
  badge?: string | number;
  content?: React.ReactNode;
  children?: Tab[];
}

const NestedTabs: React.FC<{
  tabs: Tab[];
  level?: number;
  onTabChange?: (tabId: string, level: number) => void;
  density?: DensityMode;
}> = ({ tabs, level = 0, onTabChange, density = 'compact' }) => {
  const [activeTab, setActiveTab] = useState(tabs[0]?.id || '');
  const [expandedTabs, setExpandedTabs] = useState<Set<string>>(new Set());

  const activeTabData = tabs.find(t => t.id === activeTab);
  const hasChildren = activeTabData?.children && activeTabData.children.length > 0;

  const toggleExpand = (tabId: string) => {
    setExpandedTabs(prev => {
      const next = new Set(prev);
      if (next.has(tabId)) next.delete(tabId);
      else next.add(tabId);
      return next;
    });
  };

  const paddings = {
    compact: 'px-2 py-1',
    normal: 'px-3 py-1.5',
    comfortable: 'px-4 py-2'
  };

  const textSizes = {
    compact: 'text-xs',
    normal: 'text-sm',
    comfortable: 'text-base'
  };

  const levelColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-rose-500', 'bg-cyan-500'
  ];

  return (
    <div className={`${level > 0 ? 'ml-2 border-l-2 border-slate-200 pl-2' : ''}`}>
      {/* Tab Headers */}
      <div className={`flex flex-wrap gap-1 ${level === 0 ? 'border-b border-slate-200 pb-1' : 'mb-1'}`}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const isExpanded = expandedTabs.has(tab.id);
          
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                onTabChange?.(tab.id, level);
              }}
              className={`
                ${paddings[density]} ${textSizes[density]}
                flex items-center gap-1.5 rounded-lg font-medium
                transition-all duration-200
                ${isActive 
                  ? `${levelColors[level % levelColors.length]} text-white shadow-sm` 
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-800'
                }
              `}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className={`
                  ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold
                  ${isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'}
                `}>
                  {tab.badge}
                </span>
              )}
              {tab.children && tab.children.length > 0 && (
                <button
                  onClick={(e) => { e.stopPropagation(); toggleExpand(tab.id); }}
                  className="ml-1 p-0.5 rounded hover:bg-white/20"
                >
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTabData && (
        <div className="mt-1">
          {activeTabData.content}
          {hasChildren && expandedTabs.has(activeTab) && (
            <NestedTabs 
              tabs={activeTabData.children!} 
              level={level + 1} 
              onTabChange={onTabChange}
              density={density}
            />
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// EXPANDABLE TREE COMPONENT - Deep nesting with unlimited levels
// ============================================================================
interface TreeNode {
  id: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  value?: string | number;
  badge?: { text: string; color: string };
  children?: TreeNode[];
  data?: Record<string, unknown>;
  onClick?: () => void;
}

const ExpandableTree: React.FC<{
  nodes: TreeNode[];
  level?: number;
  density?: DensityMode;
  defaultExpanded?: boolean;
  maxExpandedLevels?: number;
  onNodeClick?: (node: TreeNode) => void;
}> = ({ nodes, level = 0, density = 'compact', defaultExpanded = false, maxExpandedLevels = 2, onNodeClick }) => {
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    if (defaultExpanded && level < maxExpandedLevels) {
      return new Set(nodes.map(n => n.id));
    }
    return new Set();
  });

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setExpanded(new Set(nodes.map(n => n.id)));
  const collapseAll = () => setExpanded(new Set());

  const paddings = { compact: 'py-0.5 px-1', normal: 'py-1 px-2', comfortable: 'py-2 px-3' };
  const textSizes = { compact: 'text-xs', normal: 'text-sm', comfortable: 'text-base' };
  const indents = { compact: 12, normal: 16, comfortable: 20 };

  const levelColors = [
    'border-blue-400', 'border-emerald-400', 'border-purple-400', 
    'border-amber-400', 'border-rose-400', 'border-cyan-400'
  ];
  const bgColors = [
    'hover:bg-blue-50', 'hover:bg-emerald-50', 'hover:bg-purple-50',
    'hover:bg-amber-50', 'hover:bg-rose-50', 'hover:bg-cyan-50'
  ];

  return (
    <div className={level === 0 ? 'border border-slate-200 rounded-lg overflow-hidden' : ''}>
      {/* Controls */}
      {level === 0 && nodes.some(n => n.children?.length) && (
        <div className="flex items-center gap-2 px-2 py-1 bg-slate-50 border-b border-slate-200">
          <button onClick={expandAll} className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
            <Plus size={10} /> Expand All
          </button>
          <button onClick={collapseAll} className="text-[10px] text-slate-500 hover:underline flex items-center gap-0.5">
            <Minus size={10} /> Collapse All
          </button>
          <span className="text-[10px] text-slate-400 ml-auto">{nodes.length} items</span>
        </div>
      )}

      {/* Nodes */}
      <div className={level > 0 ? `ml-${indents[density] / 4} border-l-2 ${levelColors[level % levelColors.length]}` : ''}>
        {nodes.map((node) => {
          const isExpanded = expanded.has(node.id);
          const hasChildren = node.children && node.children.length > 0;

          return (
            <div key={node.id}>
              <div
                className={`
                  ${paddings[density]} ${textSizes[density]} ${bgColors[level % bgColors.length]}
                  flex items-center gap-1.5 cursor-pointer
                  transition-colors duration-150
                  ${level > 0 ? 'border-b border-slate-100' : 'border-b border-slate-200'}
                `}
                onClick={() => {
                  if (hasChildren) toggle(node.id);
                  node.onClick?.();
                  onNodeClick?.(node);
                }}
              >
                {/* Expand/Collapse Icon */}
                <div className="w-4 h-4 flex items-center justify-center">
                  {hasChildren ? (
                    isExpanded ? (
                      <FolderOpen size={14} className="text-amber-500" />
                    ) : (
                      <Folder size={14} className="text-slate-400" />
                    )
                  ) : (
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-300" />
                  )}
                </div>

                {/* Node Icon */}
                {node.icon && <div className="text-slate-500">{node.icon}</div>}

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-slate-800 truncate">{node.label}</span>
                  {node.sublabel && (
                    <span className="ml-1.5 text-slate-400 truncate">{node.sublabel}</span>
                  )}
                </div>

                {/* Badge */}
                {node.badge && (
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${node.badge.color}`}>
                    {node.badge.text}
                  </span>
                )}

                {/* Value */}
                {node.value !== undefined && (
                  <span className="font-mono font-semibold text-slate-700">{node.value}</span>
                )}

                {/* Expand Arrow */}
                {hasChildren && (
                  <ChevronRight 
                    size={14} 
                    className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
                  />
                )}
              </div>

              {/* Children */}
              {hasChildren && isExpanded && (
                <ExpandableTree
                  nodes={node.children!}
                  level={level + 1}
                  density={density}
                  defaultExpanded={defaultExpanded}
                  maxExpandedLevels={maxExpandedLevels}
                  onNodeClick={onNodeClick}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============================================================================
// COMPACT STAT CARD - High density version
// ============================================================================
const CompactStatCard: React.FC<{
  label: string;
  value: string | number;
  subvalue?: string;
  change?: number;
  icon: React.ReactNode;
  color: 'blue' | 'green' | 'red' | 'amber' | 'purple' | 'cyan';
  onClick?: () => void;
  expanded?: boolean;
  children?: React.ReactNode;
}> = ({ label, value, subvalue, change, icon, color, onClick, expanded, children }) => {
  const [isExpanded, setIsExpanded] = useState(expanded || false);
  
  const colorMap = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200' },
    red: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200' },
  };
  const c = colorMap[color];

  return (
    <div className={`${c.bg} rounded-lg border ${c.border} overflow-hidden transition-all`}>
      <button
        onClick={() => { onClick?.(); if (children) setIsExpanded(!isExpanded); }}
        className="w-full p-2 text-left hover:bg-white/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${c.bg} ${c.text}`}>{icon}</div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">{label}</p>
            <div className="flex items-baseline gap-1.5">
              <p className="text-lg font-bold text-slate-800">{value}</p>
              {subvalue && <span className="text-xs text-slate-500">{subvalue}</span>}
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center gap-0.5 text-xs font-semibold ${change >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              {change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {Math.abs(change)}%
            </div>
          )}
          {children && (
            <ChevronDown size={14} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          )}
        </div>
      </button>
      {children && isExpanded && (
        <div className="border-t border-slate-200 p-2 bg-white/50">
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DENSE DATA TABLE - Maximum columns, expandable rows
// ============================================================================
const DenseDataTable: React.FC<{
  facilities: Facility[];
  onSelect: (facility: Facility) => void;
  density?: DensityMode;
}> = ({ facilities, onSelect, density = 'compact' }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [sortBy, setSortBy] = useState<string>('subsidyGap');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const toggleRow = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const sortedFacilities = useMemo(() => {
    return [...facilities].sort((a, b) => {
      const aVal = a[sortBy as keyof Facility] ?? 0;
      const bVal = b[sortBy as keyof Facility] ?? 0;
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      }
      return sortDir === 'asc' 
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal));
    });
  }, [facilities, sortBy, sortDir]);

  const handleSort = (column: string) => {
    if (sortBy === column) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(column); setSortDir('desc'); }
  };

  const cellPadding = density === 'compact' ? 'px-2 py-1' : density === 'normal' ? 'px-3 py-2' : 'px-4 py-3';
  const textSize = density === 'compact' ? 'text-xs' : density === 'normal' ? 'text-sm' : 'text-base';

  const statusColors: Record<string, string> = {
    'Compliant': 'bg-emerald-100 text-emerald-700',
    'Non-Compliant': 'bg-rose-100 text-rose-700',
    'At Risk': 'bg-amber-100 text-amber-700',
    'Unknown': 'bg-slate-100 text-slate-600',
  };

  const SortHeader: React.FC<{ column: string; label: string }> = ({ column, label }) => (
    <th 
      onClick={() => handleSort(column)}
      className={`${cellPadding} ${textSize} text-left font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-100 select-none whitespace-nowrap`}
    >
      <div className="flex items-center gap-1">
        {label}
        {sortBy === column && (
          <ChevronDown size={12} className={`transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
        )}
      </div>
    </th>
  );

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className={`${cellPadding} w-8`}></th>
              <SortHeader column="name" label="Facility" />
              <SortHeader column="operator" label="Operator" />
              <SortHeader column="state" label="State" />
              <SortHeader column="city" label="City" />
              <SortHeader column="type" label="Type" />
              <SortHeader column="complianceStatus" label="Status" />
              <SortHeader column="subsidyGap" label="Gap" />
              <SortHeader column="jobsCreated" label="Jobs" />
              <SortHeader column="jobsPromised" label="Promised" />
              <th className={`${cellPadding} ${textSize} text-left font-bold text-slate-500 uppercase tracking-wider`}>Issues</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sortedFacilities.map((facility) => {
              const isExpanded = expandedRows.has(facility.id!);
              return (
                <React.Fragment key={facility.id}>
                  <tr 
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    onClick={() => toggleRow(facility.id!)}
                  >
                    <td className={cellPadding}>
                      <button className="p-0.5 rounded hover:bg-slate-200">
                        <ChevronRight size={12} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                      </button>
                    </td>
                    <td className={`${cellPadding} ${textSize}`}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-6 h-6 rounded bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                          {facility.name.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-800 truncate max-w-[150px]" title={facility.name}>
                          {facility.name}
                        </span>
                      </div>
                    </td>
                    <td className={`${cellPadding} ${textSize} text-slate-600 truncate max-w-[100px]`} title={facility.operator}>
                      {facility.operator}
                    </td>
                    <td className={`${cellPadding} ${textSize} text-slate-600 font-mono`}>{facility.state}</td>
                    <td className={`${cellPadding} ${textSize} text-slate-600 truncate max-w-[80px]`}>{facility.city}</td>
                    <td className={`${cellPadding} ${textSize} text-slate-500`}>{facility.type || '-'}</td>
                    <td className={cellPadding}>
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusColors[facility.complianceStatus] || statusColors['Unknown']}`}>
                        {facility.complianceStatus === 'Non-Compliant' ? 'NC' : facility.complianceStatus === 'Compliant' ? 'OK' : facility.complianceStatus === 'At Risk' ? 'AR' : '?'}
                      </span>
                    </td>
                    <td className={`${cellPadding} ${textSize} font-mono font-semibold ${(facility.subsidyGap || 0) > 0 ? 'text-rose-600' : 'text-slate-600'}`}>
                      {formatCurrency(facility.subsidyGap || 0)}
                    </td>
                    <td className={`${cellPadding} ${textSize} font-mono text-slate-600`}>
                      {(facility.jobsCreated ?? 0).toLocaleString()}
                    </td>
                    <td className={`${cellPadding} ${textSize} font-mono text-slate-600`}>
                      {(facility.jobsPromised ?? 0).toLocaleString()}
                    </td>
                    <td className={cellPadding}>
                      {facility.issues && facility.issues.length > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 text-[10px] font-bold">
                          {facility.issues.length}
                        </span>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                  {/* Expanded Row Details - Ultra-Detailed with Deep Nesting */}
                  {isExpanded && (
                    <tr className="bg-slate-50">
                      <td colSpan={11} className="p-0">
                        <div className="p-2 border-l-4 border-blue-400">
                          <ExpandedRowDetails facility={facility} onViewFull={() => onSelect(facility)} />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ============================================================================
// EXPANDED ROW DETAILS - Deep nested detail view for table rows
// ============================================================================
const ExpandedRowDetails: React.FC<{ facility: Facility; onViewFull: () => void }> = ({ facility, onViewFull }) => {
  const [activeSection, setActiveSection] = useState<string>('basic');
  
  // Generate synthetic detailed data
  const seed = facility.id || 1;
  const random = (min: number, max: number) => Math.floor((seed * 9301 + 49297) % 233280 / 233280 * (max - min + 1)) + min;
  
  const syntheticData = {
    powerCapacity: `${random(10, 100)} MW`,
    rackCount: random(500, 3000).toLocaleString(),
    pue: (1.2 + (random(0, 80) / 100)).toFixed(2),
    uptime: `${99 + random(0, 99) / 100}%`,
    redundancy: ['N+1', '2N', '2N+1'][random(0, 2)],
    buildYear: 2010 + random(0, 14),
    sqft: random(50000, 500000).toLocaleString(),
    certifications: ['SOC 2', 'ISO 27001', 'HIPAA', 'PCI-DSS'].slice(0, random(2, 4)),
    fiberProviders: ['Level 3', 'Cogent', 'AT&T', 'Verizon'].slice(0, random(2, 4)),
    lastAudit: new Date(Date.now() - random(30, 180) * 86400000).toISOString().split('T')[0],
    nextReview: new Date(Date.now() + random(30, 180) * 86400000).toISOString().split('T')[0],
    riskScore: random(10, 90),
    complianceRate: facility.complianceStatus === 'Compliant' ? random(85, 100) : random(30, 70),
    employees: random(50, 500),
    contractors: random(20, 150),
    avgSalary: random(50000, 100000),
    subsidyTypes: {
      federal: random(100000, 2000000),
      state: random(200000, 3000000),
      local: random(50000, 500000),
    }
  };

  const sections = [
    { id: 'basic', label: 'Basic', icon: <Building2 size={10} /> },
    { id: 'infrastructure', label: 'Infrastructure', icon: <Server size={10} /> },
    { id: 'compliance', label: 'Compliance', icon: <Shield size={10} /> },
    { id: 'financial', label: 'Financial', icon: <DollarSign size={10} /> },
    { id: 'workforce', label: 'Workforce', icon: <Users size={10} /> },
    { id: 'issues', label: `Issues (${facility.issues?.length || 0})`, icon: <AlertTriangle size={10} /> },
  ];

  return (
    <div className="space-y-2">
      {/* Section Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-slate-200 pb-1">
        {sections.map(section => (
          <button
            key={section.id}
            onClick={() => setActiveSection(section.id)}
            className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 transition-colors ${
              activeSection === section.id 
                ? 'bg-blue-500 text-white' 
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </div>

      {/* Section Content */}
      <div className="bg-white rounded-lg border border-slate-200 p-2">
        {activeSection === 'basic' && (
          <div className="space-y-2">
            <ExpandableSection title="Identification" icon={<Hash size={10} />} defaultOpen>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div><span className="text-slate-400">ID:</span> <span className="font-mono">{facility.id}</span></div>
                <div><span className="text-slate-400">Name:</span> {facility.name}</div>
                <div><span className="text-slate-400">Operator:</span> {facility.operator}</div>
                <div><span className="text-slate-400">Type:</span> {facility.type || 'Data Center'}</div>
                <div><span className="text-slate-400">Status:</span> {facility.complianceStatus}</div>
                <div><span className="text-slate-400">Built:</span> {syntheticData.buildYear}</div>
              </div>
            </ExpandableSection>
            <ExpandableSection title="Location Details" icon={<MapPin size={10} />} defaultOpen>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div><span className="text-slate-400">City:</span> {facility.city || 'Unknown'}</div>
                <div><span className="text-slate-400">State:</span> {facility.state || 'Unknown'}</div>
                <div><span className="text-slate-400">Country:</span> United States</div>
                <div><span className="text-slate-400">Timezone:</span> EST</div>
                <div><span className="text-slate-400">Region:</span> {['Northeast', 'Southeast', 'Midwest', 'West'][random(0, 3)]}</div>
              </div>
            </ExpandableSection>
          </div>
        )}

        {activeSection === 'infrastructure' && (
          <div className="space-y-2">
            <ExpandableSection title="Facility Specs" icon={<Building2 size={10} />} defaultOpen>
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                <div><span className="text-slate-400">Sq Ft:</span> <span className="font-semibold">{syntheticData.sqft}</span></div>
                <div><span className="text-slate-400">Racks:</span> <span className="font-semibold">{syntheticData.rackCount}</span></div>
                <div><span className="text-slate-400">Floors:</span> <span className="font-semibold">{random(1, 5)}</span></div>
                <div><span className="text-slate-400">Raised Floor:</span> <span className="font-semibold">{random(18, 36)}"</span></div>
              </div>
            </ExpandableSection>
            <ExpandableSection title="Power Systems" icon={<Zap size={10} />} defaultOpen>
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                <div><span className="text-slate-400">Capacity:</span> <span className="font-semibold">{syntheticData.powerCapacity}</span></div>
                <div><span className="text-slate-400">PUE:</span> <span className="font-semibold">{syntheticData.pue}</span></div>
                <div><span className="text-slate-400">Uptime:</span> <span className="font-semibold">{syntheticData.uptime}</span></div>
                <div><span className="text-slate-400">Redundancy:</span> <span className="font-semibold">{syntheticData.redundancy}</span></div>
                <div><span className="text-slate-400">UPS:</span> <span className="font-semibold">{random(500, 5000)} kVA</span></div>
                <div><span className="text-slate-400">Generators:</span> <span className="font-semibold">{random(2, 10)}</span></div>
                <div><span className="text-slate-400">Fuel Reserve:</span> <span className="font-semibold">{random(24, 168)}h</span></div>
              </div>
            </ExpandableSection>
            <ExpandableSection title="Network" icon={<Wifi size={10} />}>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div><span className="text-slate-400">Bandwidth:</span> <span className="font-semibold">{random(100, 1000)} Gbps</span></div>
                <div><span className="text-slate-400">Latency:</span> <span className="font-semibold">{random(1, 10)}ms</span></div>
                <div><span className="text-slate-400">IX Points:</span> <span className="font-semibold">{random(2, 8)}</span></div>
                <div className="col-span-3">
                  <span className="text-slate-400">Providers:</span>{' '}
                  {syntheticData.fiberProviders.map((p, i) => (
                    <span key={i} className="inline-block mx-0.5 px-1 py-0.5 bg-slate-100 rounded text-[9px]">{p}</span>
                  ))}
                </div>
              </div>
            </ExpandableSection>
            <ExpandableSection title="Certifications" icon={<Award size={10} />}>
              <div className="flex flex-wrap gap-1">
                {syntheticData.certifications.map((cert, i) => (
                  <span key={i} className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[9px] font-semibold">{cert}</span>
                ))}
              </div>
            </ExpandableSection>
          </div>
        )}

        {activeSection === 'compliance' && (
          <div className="space-y-2">
            <ExpandableSection title="Current Status" icon={<Shield size={10} />} defaultOpen>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div><span className="text-slate-400">Status:</span> <span className={`font-semibold ${facility.complianceStatus === 'Compliant' ? 'text-emerald-600' : facility.complianceStatus === 'Non-Compliant' ? 'text-rose-600' : 'text-amber-600'}`}>{facility.complianceStatus}</span></div>
                <div><span className="text-slate-400">Compliance Rate:</span> <span className="font-semibold">{syntheticData.complianceRate}%</span></div>
                <div><span className="text-slate-400">Risk Score:</span> <span className={`font-semibold ${syntheticData.riskScore > 60 ? 'text-rose-600' : syntheticData.riskScore > 30 ? 'text-amber-600' : 'text-emerald-600'}`}>{syntheticData.riskScore}/100</span></div>
              </div>
            </ExpandableSection>
            <ExpandableSection title="Jobs Analysis" icon={<Users size={10} />} defaultOpen>
              <div className="grid grid-cols-4 gap-2 text-[10px]">
                <div><span className="text-slate-400">Promised:</span> <span className="font-semibold">{(facility.jobsPromised ?? 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400">Created:</span> <span className="font-semibold">{(facility.jobsCreated ?? 0).toLocaleString()}</span></div>
                <div><span className="text-slate-400">Gap:</span> <span className="font-semibold text-rose-600">{((facility.jobsPromised ?? 0) - (facility.jobsCreated ?? 0)).toLocaleString()}</span></div>
                <div><span className="text-slate-400">Fulfillment:</span> <span className="font-semibold">{facility.jobsPromised ? Math.round((facility.jobsCreated ?? 0) / facility.jobsPromised * 100) : 0}%</span></div>
              </div>
            </ExpandableSection>
            <ExpandableSection title="Audit History" icon={<Calendar size={10} />}>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-slate-400">Last Audit:</span> <span className="font-semibold">{syntheticData.lastAudit}</span></div>
                <div><span className="text-slate-400">Next Review:</span> <span className="font-semibold">{syntheticData.nextReview}</span></div>
                <div><span className="text-slate-400">Auditor:</span> <span className="font-semibold">{['Deloitte', 'KPMG', 'EY', 'PwC'][random(0, 3)]}</span></div>
                <div><span className="text-slate-400">Last Score:</span> <span className="font-semibold">{random(60, 100)}/100</span></div>
              </div>
            </ExpandableSection>
          </div>
        )}

        {activeSection === 'financial' && (
          <div className="space-y-2">
            <ExpandableSection title="Subsidy Overview" icon={<DollarSign size={10} />} defaultOpen>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-slate-400">Total Gap:</span> <span className="font-bold text-rose-600">{formatCurrency(facility.subsidyGap || 0)}</span></div>
                <div><span className="text-slate-400">Cost/Job Created:</span> <span className="font-semibold">{facility.jobsCreated ? formatCurrency((facility.subsidyGap || 0) / facility.jobsCreated) : 'N/A'}</span></div>
              </div>
            </ExpandableSection>
            <ExpandableSection title="Subsidy Breakdown" icon={<PieChart size={10} />} defaultOpen>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div><span className="text-slate-400">Federal:</span> <span className="font-semibold">{formatCurrency(syntheticData.subsidyTypes.federal)}</span></div>
                <div><span className="text-slate-400">State:</span> <span className="font-semibold">{formatCurrency(syntheticData.subsidyTypes.state)}</span></div>
                <div><span className="text-slate-400">Local:</span> <span className="font-semibold">{formatCurrency(syntheticData.subsidyTypes.local)}</span></div>
              </div>
            </ExpandableSection>
            <ExpandableSection title="Tax Incentives" icon={<Briefcase size={10} />}>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-slate-400">Property Tax Abatement:</span> <span className="font-semibold">{formatCurrency(random(100000, 2000000))}</span></div>
                <div><span className="text-slate-400">Sales Tax Exemption:</span> <span className="font-semibold">{formatCurrency(random(50000, 500000))}</span></div>
                <div><span className="text-slate-400">Duration:</span> <span className="font-semibold">{random(5, 20)} years</span></div>
                <div><span className="text-slate-400">Utility Discounts:</span> <span className="font-semibold">{formatCurrency(random(50000, 300000))}/yr</span></div>
              </div>
            </ExpandableSection>
          </div>
        )}

        {activeSection === 'workforce' && (
          <div className="space-y-2">
            <ExpandableSection title="Employment" icon={<Users size={10} />} defaultOpen>
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div><span className="text-slate-400">Total:</span> <span className="font-semibold">{syntheticData.employees + syntheticData.contractors}</span></div>
                <div><span className="text-slate-400">Direct:</span> <span className="font-semibold">{syntheticData.employees}</span></div>
                <div><span className="text-slate-400">Contractors:</span> <span className="font-semibold">{syntheticData.contractors}</span></div>
                <div><span className="text-slate-400">Avg Salary:</span> <span className="font-semibold">{formatCurrency(syntheticData.avgSalary)}</span></div>
                <div><span className="text-slate-400">Turnover:</span> <span className="font-semibold">{random(5, 25)}%</span></div>
                <div><span className="text-slate-400">Open Positions:</span> <span className="font-semibold">{random(0, 30)}</span></div>
              </div>
            </ExpandableSection>
            <ExpandableSection title="Job Categories" icon={<Briefcase size={10} />}>
              <div className="space-y-1 text-[10px]">
                {['Operations', 'Engineering', 'Security', 'Admin', 'Management'].map(cat => (
                  <div key={cat} className="flex items-center justify-between">
                    <span className="text-slate-500">{cat}</span>
                    <span className="font-semibold">{random(5, 100)}</span>
                  </div>
                ))}
              </div>
            </ExpandableSection>
            <ExpandableSection title="Benefits" icon={<Award size={10} />}>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div><span className="text-slate-400">Health Insurance:</span> <span className="font-semibold text-emerald-600">Yes</span></div>
                <div><span className="text-slate-400">401k Match:</span> <span className="font-semibold">{random(3, 6)}%</span></div>
                <div><span className="text-slate-400">PTO Days:</span> <span className="font-semibold">{random(15, 30)}</span></div>
                <div><span className="text-slate-400">Remote Work:</span> <span className="font-semibold">{random(0, 1) ? 'Hybrid' : 'On-site'}</span></div>
              </div>
            </ExpandableSection>
          </div>
        )}

        {activeSection === 'issues' && (
          <div className="space-y-2">
            {facility.issues && facility.issues.length > 0 ? (
              facility.issues.map((issue, i) => (
                <ExpandableSection 
                  key={i} 
                  title={issue} 
                  icon={<AlertTriangle size={10} className="text-amber-500" />} 
                  badge={['Critical', 'High', 'Medium', 'Low'][random(0, 3)]}
                  badgeColor={i === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}
                  defaultOpen={i === 0}
                >
                  <div className="grid grid-cols-3 gap-2 text-[10px]">
                    <div><span className="text-slate-400">Issue ID:</span> <span className="font-mono">ISS-{facility.id}-{i + 1}</span></div>
                    <div><span className="text-slate-400">Reported:</span> {new Date(Date.now() - random(10, 90) * 86400000).toISOString().split('T')[0]}</div>
                    <div><span className="text-slate-400">Days Open:</span> {random(10, 90)}</div>
                    <div><span className="text-slate-400">Assigned To:</span> {['John Smith', 'Jane Doe', 'Bob Wilson'][random(0, 2)]}</div>
                    <div><span className="text-slate-400">Status:</span> {['Open', 'In Progress', 'Under Review'][random(0, 2)]}</div>
                    <div><span className="text-slate-400">Financial Impact:</span> <span className="text-rose-600 font-semibold">{formatCurrency(random(10000, 200000))}</span></div>
                  </div>
                </ExpandableSection>
              ))
            ) : (
              <div className="text-center py-4">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-xs text-slate-600">No active issues</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Button */}
      <button
        onClick={(e) => { e.stopPropagation(); onViewFull(); }}
        className="w-full px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded transition-colors flex items-center justify-center gap-1"
      >
        Open Full Detail Modal <ArrowRight size={12} />
      </button>
    </div>
  );
};

// ============================================================================
// HIERARCHICAL DATA VIEW - Build tree from facilities
// ============================================================================
const HierarchicalView: React.FC<{
  facilities: Facility[];
  onSelect: (facility: Facility) => void;
  density?: DensityMode;
}> = ({ facilities, onSelect, density = 'compact' }) => {
  // Build hierarchy: Operator → State → City → Facility
  const treeData = useMemo<TreeNode[]>(() => {
    const operatorMap = new Map<string, Map<string, Map<string, Facility[]>>>();

    facilities.forEach(f => {
      const operator = f.operator || 'Unknown';
      const state = f.state || 'Unknown';
      const city = f.city || 'Unknown';

      if (!operatorMap.has(operator)) operatorMap.set(operator, new Map());
      const stateMap = operatorMap.get(operator)!;
      if (!stateMap.has(state)) stateMap.set(state, new Map());
      const cityMap = stateMap.get(state)!;
      if (!cityMap.has(city)) cityMap.set(city, []);
      cityMap.get(city)!.push(f);
    });

    const nodes: TreeNode[] = [];

    operatorMap.forEach((stateMap, operator) => {
      let operatorTotal = 0;
      let operatorNonCompliant = 0;
      let operatorSubsidyGap = 0;

      const stateNodes: TreeNode[] = [];
      stateMap.forEach((cityMap, state) => {
        let stateNonCompliant = 0;
        let stateSubsidyGap = 0;

        const cityNodes: TreeNode[] = [];
        cityMap.forEach((facilities, city) => {
          const cityNonCompliant = facilities.filter(f => f.complianceStatus === 'Non-Compliant').length;
          const citySubsidyGap = facilities.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);

          stateNonCompliant += cityNonCompliant;
          stateSubsidyGap += citySubsidyGap;
          operatorTotal += facilities.length;

          const facilityNodes: TreeNode[] = facilities.map(f => {
            const seed = f.id || 1;
            const random = (min: number, max: number) => Math.floor((seed * 9301 + 49297) % 233280 / 233280 * (max - min + 1)) + min;
            
            // Build detailed facility children nodes
            const facilityChildren: TreeNode[] = [
              {
                id: `info-${f.id}`,
                label: 'Basic Information',
                icon: <Info size={10} className="text-blue-500" />,
                children: [
                  { id: `info-${f.id}-id`, label: `ID: ${f.id}`, icon: <Hash size={9} /> },
                  { id: `info-${f.id}-type`, label: `Type: ${f.type || 'Data Center'}`, icon: <Building2 size={9} /> },
                  { id: `info-${f.id}-operator`, label: `Operator: ${f.operator}`, icon: <Briefcase size={9} /> },
                  { id: `info-${f.id}-built`, label: `Built: ${2010 + random(0, 14)}`, icon: <Calendar size={9} /> },
                ]
              },
              {
                id: `location-${f.id}`,
                label: 'Location',
                icon: <MapPin size={10} className="text-emerald-500" />,
                children: [
                  { id: `loc-${f.id}-city`, label: `City: ${f.city || 'Unknown'}`, icon: <Building2 size={9} /> },
                  { id: `loc-${f.id}-state`, label: `State: ${f.state || 'Unknown'}`, icon: <Globe size={9} /> },
                  { id: `loc-${f.id}-region`, label: `Region: ${['Northeast', 'Southeast', 'Midwest', 'West'][random(0, 3)]}`, icon: <Flag size={9} /> },
                ]
              },
              {
                id: `infra-${f.id}`,
                label: 'Infrastructure',
                icon: <Server size={10} className="text-purple-500" />,
                children: [
                  { id: `infra-${f.id}-power`, label: `Power: ${random(10, 100)} MW`, icon: <Zap size={9} /> },
                  { id: `infra-${f.id}-racks`, label: `Racks: ${random(500, 3000).toLocaleString()}`, icon: <Server size={9} /> },
                  { id: `infra-${f.id}-pue`, label: `PUE: ${(1.2 + random(0, 80) / 100).toFixed(2)}`, icon: <Gauge size={9} /> },
                  { id: `infra-${f.id}-sqft`, label: `Size: ${random(50000, 500000).toLocaleString()} sq ft`, icon: <Maximize2 size={9} /> },
                  { id: `infra-${f.id}-redun`, label: `Redundancy: ${['N+1', '2N', '2N+1'][random(0, 2)]}`, icon: <Shield size={9} /> },
                ]
              },
              {
                id: `compliance-${f.id}`,
                label: 'Compliance',
                icon: <Shield size={10} className="text-amber-500" />,
                badge: f.complianceStatus === 'Non-Compliant' ? { text: 'NC', color: 'bg-rose-100 text-rose-700' } : undefined,
                children: [
                  { id: `comp-${f.id}-status`, label: `Status: ${f.complianceStatus}`, icon: f.complianceStatus === 'Compliant' ? <CheckCircle size={9} className="text-emerald-500" /> : <XCircle size={9} className="text-rose-500" /> },
                  { id: `comp-${f.id}-rate`, label: `Rate: ${f.complianceStatus === 'Compliant' ? random(85, 100) : random(30, 70)}%`, icon: <BarChart3 size={9} /> },
                  { id: `comp-${f.id}-risk`, label: `Risk: ${f.complianceStatus === 'Non-Compliant' ? 'High' : f.complianceStatus === 'At Risk' ? 'Medium' : 'Low'}`, icon: <Target size={9} /> },
                  { id: `comp-${f.id}-audit`, label: `Last Audit: ${new Date(Date.now() - random(30, 180) * 86400000).toISOString().split('T')[0]}`, icon: <Calendar size={9} /> },
                ]
              },
              {
                id: `jobs-${f.id}`,
                label: 'Workforce',
                icon: <Users size={10} className="text-cyan-500" />,
                value: `${(f.jobsCreated ?? 0).toLocaleString()} jobs`,
                children: [
                  { id: `jobs-${f.id}-created`, label: `Created: ${(f.jobsCreated ?? 0).toLocaleString()}`, icon: <CheckCircle size={9} className="text-emerald-500" /> },
                  { id: `jobs-${f.id}-promised`, label: `Promised: ${(f.jobsPromised ?? 0).toLocaleString()}`, icon: <Target size={9} /> },
                  { id: `jobs-${f.id}-gap`, label: `Gap: ${((f.jobsPromised ?? 0) - (f.jobsCreated ?? 0)).toLocaleString()}`, icon: <TrendingDown size={9} className="text-rose-500" /> },
                  { id: `jobs-${f.id}-rate`, label: `Fulfillment: ${f.jobsPromised ? Math.round((f.jobsCreated ?? 0) / f.jobsPromised * 100) : 0}%`, icon: <BarChart3 size={9} /> },
                  { id: `jobs-${f.id}-salary`, label: `Avg Salary: ${formatCurrency(random(50000, 100000))}`, icon: <DollarSign size={9} /> },
                ]
              },
              {
                id: `financial-${f.id}`,
                label: 'Financial',
                icon: <DollarSign size={10} className="text-rose-500" />,
                value: formatCurrency(f.subsidyGap || 0),
                children: [
                  { id: `fin-${f.id}-gap`, label: `Subsidy Gap: ${formatCurrency(f.subsidyGap || 0)}`, icon: <TrendingDown size={9} className="text-rose-500" /> },
                  { id: `fin-${f.id}-federal`, label: `Federal: ${formatCurrency(random(100000, 2000000))}`, icon: <Flag size={9} /> },
                  { id: `fin-${f.id}-state`, label: `State: ${formatCurrency(random(200000, 3000000))}`, icon: <Globe size={9} /> },
                  { id: `fin-${f.id}-local`, label: `Local: ${formatCurrency(random(50000, 500000))}`, icon: <MapPin size={9} /> },
                  { id: `fin-${f.id}-cost`, label: `Cost/Job: ${f.jobsCreated ? formatCurrency((f.subsidyGap || 0) / f.jobsCreated) : 'N/A'}`, icon: <Users size={9} /> },
                ]
              },
            ];

            // Add issues as separate child node if present
            if (f.issues && f.issues.length > 0) {
              facilityChildren.push({
                id: `issues-${f.id}`,
                label: `Issues (${f.issues.length})`,
                icon: <AlertTriangle size={10} className="text-amber-500" />,
                badge: { text: String(f.issues.length), color: 'bg-amber-100 text-amber-700' },
                children: f.issues.map((issue, i) => ({
                  id: `issue-${f.id}-${i}`,
                  label: issue,
                  sublabel: `${['Critical', 'High', 'Medium', 'Low'][random(0, 3)]} • ${random(1, 90)} days open`,
                  icon: <AlertTriangle size={9} className="text-amber-500" />,
                  badge: { text: ['Critical', 'High', 'Medium', 'Low'][random(0, 3)], color: i === 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700' },
                })),
              });
            }
            
            return {
              id: `facility-${f.id}`,
              label: f.name,
              sublabel: `${f.type || 'Data Center'} • ${f.city || 'Unknown'}`,
              icon: <Building2 size={12} />,
              value: formatCurrency(f.subsidyGap || 0),
              badge: f.complianceStatus === 'Non-Compliant' 
                ? { text: 'NC', color: 'bg-rose-100 text-rose-700' }
                : f.complianceStatus === 'Compliant'
                ? { text: 'OK', color: 'bg-emerald-100 text-emerald-700' }
                : { text: 'AR', color: 'bg-amber-100 text-amber-700' },
              onClick: () => onSelect(f),
              children: facilityChildren,
            };
          });

          cityNodes.push({
            id: `city-${operator}-${state}-${city}`,
            label: city,
            sublabel: `${facilities.length} facilities`,
            icon: <MapPin size={12} />,
            value: formatCurrency(citySubsidyGap),
            badge: cityNonCompliant > 0 ? { text: `${cityNonCompliant} NC`, color: 'bg-rose-100 text-rose-700' } : undefined,
            children: facilityNodes,
          });
        });

        operatorNonCompliant += stateNonCompliant;
        operatorSubsidyGap += stateSubsidyGap;

        stateNodes.push({
          id: `state-${operator}-${state}`,
          label: state,
          sublabel: `${cityNodes.length} cities`,
          icon: <Globe size={12} />,
          value: formatCurrency(stateSubsidyGap),
          badge: stateNonCompliant > 0 ? { text: `${stateNonCompliant} NC`, color: 'bg-rose-100 text-rose-700' } : undefined,
          children: cityNodes,
        });
      });

      nodes.push({
        id: `operator-${operator}`,
        label: operator,
        sublabel: `${operatorTotal} facilities`,
        icon: <Layers size={14} />,
        value: formatCurrency(operatorSubsidyGap),
        badge: operatorNonCompliant > 0 ? { text: `${operatorNonCompliant} NC`, color: 'bg-rose-100 text-rose-700' } : undefined,
        children: stateNodes,
      });
    });

    return nodes.sort((a, b) => {
      const aVal = parseFloat(String(a.value).replace(/[$,KMB]/g, '')) || 0;
      const bVal = parseFloat(String(b.value).replace(/[$,KMB]/g, '')) || 0;
      return bVal - aVal;
    });
  }, [facilities, onSelect]);

  return <ExpandableTree nodes={treeData} density={density} defaultExpanded={false} maxExpandedLevels={1} />;
};

// ============================================================================
// MINI STATS BAR - Inline statistics
// ============================================================================
const MiniStatsBar: React.FC<{ stats: ComplianceStats }> = ({ stats }) => (
  <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs">
    <div className="flex items-center gap-1">
      <Building2 size={12} className="text-blue-500" />
      <span className="font-semibold text-slate-800">{stats.totalFacilities.toLocaleString()}</span>
      <span className="text-slate-500">total</span>
    </div>
    <span className="text-slate-300">|</span>
    <div className="flex items-center gap-1">
      <CheckCircle size={12} className="text-emerald-500" />
      <span className="font-semibold text-emerald-600">{stats.compliant.toLocaleString()}</span>
    </div>
    <div className="flex items-center gap-1">
      <XCircle size={12} className="text-rose-500" />
      <span className="font-semibold text-rose-600">{stats.nonCompliant.toLocaleString()}</span>
    </div>
    <div className="flex items-center gap-1">
      <AlertTriangle size={12} className="text-amber-500" />
      <span className="font-semibold text-amber-600">{stats.atRisk.toLocaleString()}</span>
    </div>
    <span className="text-slate-300">|</span>
    <div className="flex items-center gap-1">
      <DollarSign size={12} className="text-rose-500" />
      <span className="font-semibold text-rose-600">{formatCurrency(stats.totalSubsidyGap)}</span>
      <span className="text-slate-500">gap</span>
    </div>
  </div>
);

// ============================================================================
// FACILITY DETAIL MODAL - With nested tabs
// ============================================================================
const FacilityModal: React.FC<{
  facility: Facility;
  onClose: () => void;
}> = ({ facility, onClose }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors: Record<string, string> = {
    'Compliant': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Non-Compliant': 'bg-rose-100 text-rose-700 border-rose-200',
    'At Risk': 'bg-amber-100 text-amber-700 border-amber-200',
    'Unknown': 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Eye size={12} /> },
    { id: 'compliance', label: 'Compliance', icon: <Shield size={12} /> },
    { id: 'financial', label: 'Financial', icon: <DollarSign size={12} /> },
    { id: 'issues', label: 'Issues', icon: <AlertTriangle size={12} />, badge: facility.issues?.length || 0 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      <div 
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden animate-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shadow">
              {facility.name.charAt(0)}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800">{facility.name}</h2>
              <p className="text-xs text-slate-500">{facility.operator} • {facility.city}, {facility.state}</p>
            </div>
            <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold border ${statusColors[facility.complianceStatus] || statusColors['Unknown']}`}>
              {facility.complianceStatus}
            </span>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-200 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200 px-3 py-1 bg-white flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-500 text-white' 
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-rose-100 text-rose-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="p-3 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Facility ID</p>
                <p className="text-xs font-mono text-slate-700">{facility.id}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Type</p>
                <p className="text-xs text-slate-700">{facility.type || 'Data Center'}</p>
              </div>
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200">
                <p className="text-[10px] font-bold text-slate-400 uppercase">Location</p>
                <p className="text-xs text-slate-700">{facility.city}, {facility.state}</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-[10px] font-bold text-blue-400 uppercase">Operator</p>
                <p className="text-xs text-blue-700 font-medium">{facility.operator}</p>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-200">
                <p className="text-[10px] font-bold text-emerald-400 uppercase">Jobs Created</p>
                <p className="text-xs text-emerald-700 font-bold">{(facility.jobsCreated ?? 0).toLocaleString()}</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-[10px] font-bold text-purple-400 uppercase">Jobs Promised</p>
                <p className="text-xs text-purple-700 font-bold">{(facility.jobsPromised ?? 0).toLocaleString()}</p>
              </div>
            </div>
          )}

          {activeTab === 'compliance' && (
            <div className="space-y-3">
              <div className={`p-3 rounded-lg border ${statusColors[facility.complianceStatus] || statusColors['Unknown']}`}>
                <div className="flex items-center gap-2">
                  {facility.complianceStatus === 'Compliant' && <CheckCircle size={16} />}
                  {facility.complianceStatus === 'Non-Compliant' && <XCircle size={16} />}
                  {facility.complianceStatus === 'At Risk' && <AlertTriangle size={16} />}
                  <span className="font-bold">{facility.complianceStatus}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-lg border">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Jobs Gap</p>
                  <p className="text-sm text-rose-600 font-bold">
                    {((facility.jobsPromised ?? 0) - (facility.jobsCreated ?? 0)).toLocaleString()}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Compliance Rate</p>
                  <p className="text-sm text-slate-700 font-bold">
                    {facility.jobsPromised ? Math.round((facility.jobsCreated ?? 0) / facility.jobsPromised * 100) : 0}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'financial' && (
            <div className="space-y-3">
              <div className="p-3 bg-rose-50 rounded-lg border border-rose-200">
                <p className="text-[10px] font-bold text-rose-400 uppercase">Total Subsidy Gap</p>
                <p className="text-2xl text-rose-700 font-bold">{formatCurrency(facility.subsidyGap || 0)}</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 bg-slate-50 rounded-lg border">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Cost per Job Created</p>
                  <p className="text-sm text-slate-700 font-mono">
                    {facility.jobsCreated ? formatCurrency((facility.subsidyGap || 0) / facility.jobsCreated) : 'N/A'}
                  </p>
                </div>
                <div className="p-2 bg-slate-50 rounded-lg border">
                  <p className="text-[10px] font-bold text-slate-400 uppercase">Cost per Job Promised</p>
                  <p className="text-sm text-slate-700 font-mono">
                    {facility.jobsPromised ? formatCurrency((facility.subsidyGap || 0) / facility.jobsPromised) : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'issues' && (
            <div className="space-y-2">
              {facility.issues && facility.issues.length > 0 ? (
                facility.issues.map((issue, i) => (
                  <div key={i} className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
                    <AlertTriangle size={14} className="text-amber-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-amber-800">{issue}</span>
                  </div>
                ))
              ) : (
                <div className="p-6 text-center">
                  <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                  <p className="text-sm text-slate-600">No active issues</p>
                </div>
              )}
            </div>
          )}

          {/* Copy ID */}
          <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg mt-3">
            <span className="text-[10px] text-slate-500">ID:</span>
            <code className="text-[10px] font-mono text-slate-600 flex-1">{facility.id}</code>
            <button 
              onClick={() => copyToClipboard(String(facility.id))}
              className="p-1 hover:bg-slate-200 rounded transition-colors"
            >
              {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} className="text-slate-400" />}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-200 flex items-center justify-between bg-slate-50">
          <button onClick={onClose} className="px-3 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-medium">
            Close
          </button>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1 px-3 py-1.5 border border-slate-200 hover:border-blue-300 rounded-lg text-xs font-medium text-slate-700 hover:text-blue-600">
              <FileText size={12} /> Export
            </button>
            <button className="flex items-center gap-1 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 rounded-lg text-xs font-semibold text-white">
              <ExternalLink size={12} /> Full Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export const LightDashboard: React.FC = () => {
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [stats, setStats] = useState<ComplianceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [commandSearch, setCommandSearch] = useState('');
  const [showQuickNav, setShowQuickNav] = useState(false);
  const commandInputRef = useRef<HTMLInputElement>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('table');
  const [densityMode, setDensityMode] = useState<DensityMode>('compact');
  const [activeSubTab, setActiveSubTab] = useState('all');

  const showToast = useCallback((message: string) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(null), 3000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      await seedDatabase();
      const data = await safeDbOperation(() => db.facilities.toArray(), () => []);
      setFacilities(data);
      setStats(calculateStats(data));
    } catch (error) {
      console.error('Error loading data:', error);
      showToast('Error loading data');
    }
  }, [showToast]);

  useEffect(() => {
    let mounted = true;
    async function init() {
      await loadData();
      if (mounted) setLoading(false);
    }
    init();
    return () => { mounted = false; };
  }, [loadData]);

  // Command Palette keyboard shortcut (⌘K or Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowCommandPalette(true);
        setCommandSearch('');
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false);
        setShowQuickNav(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus command input when palette opens
  useEffect(() => {
    if (showCommandPalette && commandInputRef.current) {
      commandInputRef.current.focus();
    }
  }, [showCommandPalette]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadData();
    setIsRefreshing(false);
    showToast('Data refreshed');
  };

  const handleExport = async () => {
    if (!stats) return;
    setIsExporting(true);
    try {
      await downloadComplianceReport(filteredFacilities, stats, undefined, { title: 'DCIM Compliance Report', maxFacilities: 100 });
      showToast('Report exported');
    } catch { showToast('Export failed'); }
    finally { setIsExporting(false); }
  };

  const filteredFacilities = useMemo(() => {
    let result = [...facilities];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(q) || f.operator.toLowerCase().includes(q) ||
        f.city.toLowerCase().includes(q) || f.state.toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') result = result.filter(f => f.complianceStatus === filterStatus);
    return result;
  }, [facilities, searchQuery, filterStatus]);

  const displayFacilities = useMemo(() => {
    let result = filteredFacilities;
    if (activeSection === 'problems') result = result.filter(f => f.complianceStatus === 'Non-Compliant');
    if (activeSubTab === 'compliant') result = result.filter(f => f.complianceStatus === 'Compliant');
    if (activeSubTab === 'non-compliant') result = result.filter(f => f.complianceStatus === 'Non-Compliant');
    if (activeSubTab === 'at-risk') result = result.filter(f => f.complianceStatus === 'At Risk');
    return result;
  }, [filteredFacilities, activeSection, activeSubTab]);

  // Group facilities by various dimensions
  const groupedByOperator = useMemo(() => {
    const groups = new Map<string, Facility[]>();
    facilities.forEach(f => {
      const op = f.operator || 'Unknown';
      if (!groups.has(op)) groups.set(op, []);
      groups.get(op)!.push(f);
    });
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [facilities]);

  const groupedByState = useMemo(() => {
    const groups = new Map<string, Facility[]>();
    facilities.forEach(f => {
      const st = f.state || 'Unknown';
      if (!groups.has(st)) groups.set(st, []);
      groups.get(st)!.push(f);
    });
    return Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [facilities]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      showToast(`Searching "${searchQuery}"`);
      setActiveSection('facilities');
    }
  };

  const navSections = [
    { title: 'Overview', items: [
      { id: 'dashboard' as Section, label: 'Dashboard', icon: <BarChart3 size={16} /> },
      { id: 'facilities' as Section, label: 'Facilities', icon: <Building2 size={16} />, badge: facilities.length },
    ]},
    { title: 'Analysis', items: [
      { id: 'problems' as Section, label: 'Problems', icon: <AlertTriangle size={16} />, badge: stats?.nonCompliant },
      { id: 'geography' as Section, label: 'Geography', icon: <Globe size={16} /> },
      { id: 'intelligence' as Section, label: 'Intelligence', icon: <Zap size={16} /> },
    ]},
    { title: 'Tracking', items: [
      { id: 'subsidies' as Section, label: 'Subsidies', icon: <DollarSign size={16} /> },
      { id: 'workers' as Section, label: 'Workers', icon: <Shield size={16} /> },
      { id: 'timeline' as Section, label: 'Timeline', icon: <Clock size={16} /> },
    ]},
    { title: 'Tools', items: [
      { id: 'reports' as Section, label: 'Reports', icon: <FileText size={16} /> },
      { id: 'osint' as Section, label: 'OSINT', icon: <Search size={16} /> },
      { id: 'network' as Section, label: 'Network', icon: <Network size={16} /> },
    ]},
    { title: '🔥 Sovereignty', highlight: true, items: [
      { id: 'sovereignty' as Section, label: 'Data Freedom', icon: <Unlock size={16} />, badge: '🔓', highlight: true },
      { id: 'surveillance' as Section, label: 'Surveillance Intel', icon: <Eye size={16} />, badge: '👁️', highlight: true },
    ]},
  ];

  // All navigable sections for command palette
  const allNavItems = navSections.flatMap(group => 
    group.items.map(item => ({ ...item, group: group.title, highlight: (item as any).highlight || false }))
  );

  const filteredCommandItems = commandSearch.trim() 
    ? allNavItems.filter(item => 
        item.label.toLowerCase().includes(commandSearch.toLowerCase()) ||
        item.group.toLowerCase().includes(commandSearch.toLowerCase())
      )
    : allNavItems;

  // Get breadcrumb info
  const currentNavItem = allNavItems.find(item => item.id === activeSection);
  const breadcrumb = currentNavItem ? `${currentNavItem.group} / ${currentNavItem.label}` : 'Dashboard';

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-4 animate-pulse shadow-lg">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <p className="text-sm text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-slate-50">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-[100] animate-slide-down">
          <div className="px-4 py-2 bg-slate-800 text-white rounded-full shadow-xl flex items-center gap-2 text-xs">
            <Check size={14} className="text-emerald-400" />
            {toastMessage}
          </div>
        </div>
      )}

      {/* ============================================
          COMMAND PALETTE (⌘K) - Clean & Minimal
          ============================================ */}
      {showCommandPalette && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[20vh]" onClick={() => setShowCommandPalette(false)}>
          <div className="fixed inset-0 bg-black/40" />
          <div 
            className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="flex items-center gap-2 p-3 border-b border-slate-100">
              <Search size={16} className="text-slate-400" />
              <input
                ref={commandInputRef}
                type="text"
                value={commandSearch}
                onChange={(e) => setCommandSearch(e.target.value)}
                placeholder="Jump to..."
                className="flex-1 text-sm bg-transparent outline-none placeholder-slate-400"
              />
              <kbd className="px-1.5 py-0.5 text-[10px] text-slate-400 bg-slate-100 rounded">ESC</kbd>
            </div>

            {/* Results - Compact */}
            <div className="max-h-64 overflow-y-auto">
              {filteredCommandItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { setActiveSection(item.id); setShowCommandPalette(false); }}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-left transition-all text-sm ${
                    item.highlight 
                      ? 'bg-purple-50 hover:bg-purple-100' 
                      : 'hover:bg-slate-50'
                  } ${activeSection === item.id ? 'bg-blue-50' : ''}`}
                >
                  <span className={item.highlight ? 'text-purple-600' : 'text-slate-500'}>{item.icon}</span>
                  <span className={item.highlight ? 'text-purple-900 font-medium' : 'text-slate-700'}>{item.label}</span>
                  <span className="text-xs text-slate-400 ml-auto">{item.group}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ============================================
          FLOATING QUICK NAV - Minimal & Unobtrusive
          ============================================ */}
      <div className="fixed bottom-20 right-6 z-[80] flex flex-col items-end gap-2">
        {/* Expanded Quick Nav - Compact */}
        {showQuickNav && (
          <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-3 mb-1 animate-slideUp min-w-[180px]">
            <div className="space-y-1">
              <button 
                onClick={() => { setActiveSection('sovereignty'); setShowQuickNav(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-all"
              >
                <Unlock size={14} />
                <span>Data Freedom</span>
              </button>
              <button 
                onClick={() => { setActiveSection('surveillance'); setShowQuickNav(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 bg-orange-50 text-orange-700 rounded-lg text-sm font-medium hover:bg-orange-100 transition-all"
              >
                <Eye size={14} />
                <span>Surveillance</span>
              </button>
              <button 
                onClick={() => { setShowCommandPalette(true); setShowQuickNav(false); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-slate-600 rounded-lg text-sm hover:bg-slate-100 transition-all"
              >
                <Command size={14} />
                <span>All</span>
                <kbd className="ml-auto px-1 py-0.5 text-[10px] bg-slate-100 rounded">⌘K</kbd>
              </button>
            </div>
          </div>
        )}
        
        {/* Quick Nav Toggle - Smaller */}
        <button 
          onClick={() => setShowQuickNav(!showQuickNav)}
          className={`p-3 rounded-xl shadow-lg transition-all ${
            showQuickNav 
              ? 'bg-slate-700 text-white rotate-45' 
              : 'bg-purple-600 text-white hover:bg-purple-700'
          }`}
          title="Quick Navigation (⌘K)"
        >
          {showQuickNav ? <X size={18} /> : <Compass size={18} />}
        </button>
      </div>

      {/* Modal - Ultra-Detailed with Deep Nesting */}
      {selectedFacility && <DetailedFacilityModal facility={selectedFacility} onClose={() => setSelectedFacility(null)} />}

      {/* Header - Compact */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-xl border-b border-slate-200 shadow-sm">
        <div className="px-3 py-2">
          <div className="flex items-center gap-3">
            {/* Logo */}
            <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="p-1.5 hover:bg-slate-100 rounded-lg lg:hidden">
              <Menu size={18} className="text-slate-600" />
            </button>
            <button onClick={() => setActiveSection('dashboard')} className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow">
                <Building2 className="w-4 h-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-sm font-bold text-slate-800">DCIM Compliance</h1>
              </div>
            </button>
            
            {/* Breadcrumbs */}
            {activeSection !== 'dashboard' && (
              <div className="hidden md:flex items-center gap-1 text-xs text-slate-500">
                <ChevronRight size={12} className="text-slate-300" />
                <button onClick={() => setActiveSection('dashboard')} className="hover:text-blue-600 transition-colors">
                  Home
                </button>
                <ChevronRight size={12} className="text-slate-300" />
                <span className={`font-medium ${
                  activeSection === 'sovereignty' || activeSection === 'surveillance' 
                    ? 'text-purple-600' 
                    : 'text-slate-700'
                }`}>
                  {breadcrumb}
                </span>
              </div>
            )}

            {/* Mini Stats */}
            {stats && <div className="hidden md:block"><MiniStatsBar stats={stats} /></div>}

            {/* Search */}
            <form onSubmit={handleSearch} className="flex-1 max-w-xl">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-16 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-400 focus:bg-white"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <kbd className="hidden sm:block px-1.5 py-0.5 text-[10px] text-slate-400 bg-white rounded border">⌘K</kbd>
                  <button type="submit" className="p-1 bg-blue-500 hover:bg-blue-600 rounded text-white">
                    <Sparkles size={12} />
                  </button>
                </div>
              </div>
            </form>

            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Density Toggle */}
              <div className="hidden sm:flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
                {(['compact', 'normal', 'comfortable'] as DensityMode[]).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setDensityMode(mode)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                      densityMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {mode === 'compact' ? 'Dense' : mode === 'normal' ? 'Normal' : 'Comfy'}
                  </button>
                ))}
              </div>

              <div className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-1.5 hover:bg-slate-100 rounded-lg">
                  <Bell size={16} className="text-slate-600" />
                  {stats && stats.nonCompliant > 0 && (
                    <span className="absolute top-0.5 right-0.5 w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                  )}
                </button>
              </div>

              <button onClick={handleExport} disabled={isExporting} className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold rounded-lg disabled:opacity-50">
                {isExporting ? <RefreshCw size={12} className="animate-spin" /> : <Download size={12} />}
                <span className="hidden sm:inline">Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar - Compact */}
        <aside className={`
          fixed lg:sticky top-[49px] left-0 z-40
          h-[calc(100vh-49px)] w-48
          bg-white/95 backdrop-blur-xl border-r border-slate-200
          transform transition-all duration-300 overflow-y-auto
          ${sidebarCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'}
        `}>
          <div className="p-2 space-y-3">
            {navSections.map((section) => (
              <div key={section.title} className={(section as any).highlight ? 'bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-2 -mx-1 border border-purple-100' : ''}>
                <h3 className={`text-[10px] font-bold uppercase tracking-wider mb-1 px-2 ${
                  (section as any).highlight ? 'text-purple-600' : 'text-slate-400'
                }`}>
                  {section.title}
                </h3>
                <nav className="space-y-0.5">
                  {section.items.map((item) => {
                    const isHighlight = (item as any).highlight;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveSection(item.id); setSidebarCollapsed(true); }}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                          activeSection === item.id 
                            ? isHighlight 
                              ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-white shadow-lg' 
                              : 'bg-blue-50 text-blue-600'
                            : isHighlight 
                              ? 'text-purple-700 hover:bg-purple-100/50'
                              : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {item.icon}
                        <span>{item.label}</span>
                        {item.badge !== undefined && (
                          <span className={`ml-auto px-1.5 py-0.5 text-[10px] font-bold rounded-full ${
                            item.id === 'problems' ? 'bg-rose-100 text-rose-600' : 
                            isHighlight && activeSection === item.id ? 'bg-white/30 text-white' :
                            isHighlight ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                          }`}>
                            {typeof item.badge === 'number' ? item.badge.toLocaleString() : item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </nav>
              </div>
            ))}
            
            {/* Quick Nav Hint - Subtle */}
            <div className="mt-3 px-2">
              <button 
                onClick={() => setShowCommandPalette(true)}
                className="w-full flex items-center justify-center gap-1 py-1.5 text-[10px] text-slate-400 hover:text-slate-600 transition-all"
              >
                <Command size={10} />
                <span>⌘K to jump</span>
              </button>
            </div>
          </div>
        </aside>

        {!sidebarCollapsed && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden" onClick={() => setSidebarCollapsed(true)} />
        )}

        {/* Main Content */}
        <main className="flex-1 min-h-[calc(100vh-49px)] p-3">
          {/* Dashboard View */}
          {activeSection === 'dashboard' && stats && (
            <>
              {/* Stats Grid - Compact with expandable details */}
              <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-2 mb-3">
                <CompactStatCard label="Total" value={stats.totalFacilities.toLocaleString()} change={2.5} icon={<Building2 size={14} />} color="blue" onClick={() => setActiveSection('facilities')}>
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div><span className="text-slate-500">States:</span> <span className="font-bold">{groupedByState.length}</span></div>
                    <div><span className="text-slate-500">Operators:</span> <span className="font-bold">{groupedByOperator.length}</span></div>
                  </div>
                </CompactStatCard>
                <CompactStatCard label="Compliant" value={stats.compliant.toLocaleString()} subvalue={`${Math.round(stats.compliant / stats.totalFacilities * 100)}%`} icon={<CheckCircle size={14} />} color="green" onClick={() => { setActiveSubTab('compliant'); setActiveSection('facilities'); }} />
                <CompactStatCard label="Non-Compliant" value={stats.nonCompliant.toLocaleString()} subvalue={`${Math.round(stats.nonCompliant / stats.totalFacilities * 100)}%`} change={3.8} icon={<XCircle size={14} />} color="red" onClick={() => setActiveSection('problems')}>
                  <div className="text-[10px] text-rose-700">Requires immediate attention</div>
                </CompactStatCard>
                <CompactStatCard label="At Risk" value={stats.atRisk.toLocaleString()} icon={<AlertTriangle size={14} />} color="amber" onClick={() => { setActiveSubTab('at-risk'); setActiveSection('facilities'); }} />
                <CompactStatCard label="Subsidy Gap" value={formatCurrency(stats.totalSubsidyGap)} icon={<DollarSign size={14} />} color="purple" onClick={() => setActiveSection('subsidies')}>
                  <div className="text-[10px]">
                    <span className="text-slate-500">Avg per facility:</span>
                    <span className="font-bold text-purple-700 ml-1">{formatCurrency(stats.totalSubsidyGap / stats.totalFacilities)}</span>
                  </div>
                </CompactStatCard>
                <CompactStatCard label="Jobs Gap" value={((stats.totalJobsPromised || 0) - (stats.totalJobsCreated || 0)).toLocaleString()} icon={<Users size={14} />} color="cyan">
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div><span className="text-slate-500">Created:</span> <span className="font-bold text-emerald-600">{(stats.totalJobsCreated || 0).toLocaleString()}</span></div>
                    <div><span className="text-slate-500">Promised:</span> <span className="font-bold text-purple-600">{(stats.totalJobsPromised || 0).toLocaleString()}</span></div>
                  </div>
                </CompactStatCard>
              </div>

              {/* Main Dashboard Content with Nested Tabs */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Left Column - Hierarchical View */}
                <div className="lg:col-span-2">
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-200 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Layers size={14} className="text-blue-500" /> Facility Hierarchy
                      </h3>
                      <div className="flex items-center gap-1">
                        {(['tree', 'table'] as ViewMode[]).map(mode => (
                          <button
                            key={mode}
                            onClick={() => setViewMode(mode)}
                            className={`px-2 py-1 rounded text-[10px] font-medium ${
                              viewMode === mode ? 'bg-blue-100 text-blue-600' : 'text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            {mode === 'tree' ? 'Tree' : 'Table'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="max-h-[500px] overflow-y-auto">
                      {viewMode === 'tree' ? (
                        <HierarchicalView facilities={displayFacilities.slice(0, 500)} onSelect={setSelectedFacility} density={densityMode} />
                      ) : (
                        <DenseDataTable facilities={displayFacilities.slice(0, 100)} onSelect={setSelectedFacility} density={densityMode} />
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Column - Breakdowns */}
                <div className="space-y-3">
                  {/* By Operator */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-200">
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Layers size={12} className="text-purple-500" /> Top Operators
                      </h3>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {groupedByOperator.slice(0, 10).map(([operator, facs]) => {
                        const nc = facs.filter(f => f.complianceStatus === 'Non-Compliant').length;
                        const gap = facs.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);
                        return (
                          <button
                            key={operator}
                            onClick={() => { setSearchQuery(operator); setActiveSection('facilities'); }}
                            className="w-full px-3 py-1.5 flex items-center justify-between text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800 truncate max-w-[100px]">{operator}</span>
                              <span className="text-slate-400">{facs.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {nc > 0 && <span className="px-1 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">{nc}</span>}
                              <span className="font-mono text-slate-600">{formatCurrency(gap)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* By State */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                    <div className="px-3 py-2 border-b border-slate-200">
                      <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1">
                        <Globe size={12} className="text-emerald-500" /> Top States
                      </h3>
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {groupedByState.slice(0, 10).map(([state, facs]) => {
                        const nc = facs.filter(f => f.complianceStatus === 'Non-Compliant').length;
                        const gap = facs.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);
                        return (
                          <button
                            key={state}
                            onClick={() => { setSearchQuery(state); setActiveSection('facilities'); }}
                            className="w-full px-3 py-1.5 flex items-center justify-between text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800">{state}</span>
                              <span className="text-slate-400">{facs.length}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {nc > 0 && <span className="px-1 py-0.5 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">{nc}</span>}
                              <span className="font-mono text-slate-600">{formatCurrency(gap)}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="bg-white rounded-lg border border-slate-200 p-3">
                    <h3 className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1">
                      <Zap size={12} className="text-amber-500" /> Quick Actions
                    </h3>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { label: 'Problems', icon: <AlertTriangle size={12} />, color: 'text-rose-600 bg-rose-50', action: () => setActiveSection('problems') },
                        { label: 'Export', icon: <Download size={12} />, color: 'text-blue-600 bg-blue-50', action: handleExport },
                        { label: 'Refresh', icon: <RefreshCw size={12} />, color: 'text-emerald-600 bg-emerald-50', action: handleRefresh },
                        { label: 'Help', icon: <HelpCircle size={12} />, color: 'text-purple-600 bg-purple-50', action: () => showToast('Help coming soon!') },
                      ].map(item => (
                        <button
                          key={item.label}
                          onClick={item.action}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-[10px] font-semibold ${item.color} hover:opacity-80 transition-opacity`}
                        >
                          {item.icon} {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Facilities/Problems View with Nested Tabs */}
          {(activeSection === 'facilities' || activeSection === 'problems') && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Section Header with Nested Tabs */}
              <div className="px-3 py-2 border-b border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-slate-800">
                    {activeSection === 'problems' ? 'Problem Facilities' : 'All Facilities'}
                    <span className="ml-2 text-slate-400 font-normal">({displayFacilities.length})</span>
                  </h2>
                  <div className="flex items-center gap-2">
                    <button onClick={handleRefresh} disabled={isRefreshing} className="p-1.5 hover:bg-slate-100 rounded-lg">
                      <RefreshCw size={14} className={`text-slate-500 ${isRefreshing ? 'animate-spin' : ''}`} />
                    </button>
                    <div className="flex items-center gap-0.5 p-0.5 bg-slate-100 rounded-lg">
                      {(['tree', 'table'] as ViewMode[]).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setViewMode(mode)}
                          className={`px-2 py-1 rounded text-[10px] font-medium ${
                            viewMode === mode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'
                          }`}
                        >
                          {mode === 'tree' ? 'Tree' : 'Table'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Sub-tabs for filtering */}
                <NestedTabs
                  density={densityMode}
                  tabs={[
                    { id: 'all', label: 'All', badge: filteredFacilities.length },
                    { id: 'compliant', label: 'Compliant', icon: <CheckCircle size={10} />, badge: filteredFacilities.filter(f => f.complianceStatus === 'Compliant').length },
                    { id: 'non-compliant', label: 'Non-Compliant', icon: <XCircle size={10} />, badge: filteredFacilities.filter(f => f.complianceStatus === 'Non-Compliant').length },
                    { id: 'at-risk', label: 'At Risk', icon: <AlertTriangle size={10} />, badge: filteredFacilities.filter(f => f.complianceStatus === 'At Risk').length },
                  ]}
                  onTabChange={(id) => setActiveSubTab(id)}
                />
              </div>

              {/* Content */}
              <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
                {viewMode === 'tree' ? (
                  <HierarchicalView facilities={displayFacilities} onSelect={setSelectedFacility} density={densityMode} />
                ) : (
                  <DenseDataTable facilities={displayFacilities} onSelect={setSelectedFacility} density={densityMode} />
                )}
              </div>
            </div>
          )}

          {/* Data Sovereignty Hub - Inspired by Cory Doctorow's 39C3 Talk */}
          {activeSection === 'sovereignty' && (
            <DataSovereigntyHub />
          )}

          {activeSection === 'surveillance' && (
            <SurveillanceAnalysis />
          )}

          {/* Other Sections Placeholder */}
          {!['dashboard', 'facilities', 'problems', 'sovereignty', 'surveillance'].includes(activeSection) && (
            <div className="bg-white rounded-lg border border-slate-200 p-8 text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Info className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 mb-1">{activeSection.charAt(0).toUpperCase() + activeSection.slice(1)}</h3>
              <p className="text-sm text-slate-500 mb-4">Coming soon. Explore Dashboard and Facilities for now.</p>
              <button onClick={() => setActiveSection('dashboard')} className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white text-sm font-semibold rounded-lg">
                Go to Dashboard
              </button>
            </div>
          )}

          {/* Footer */}
          <footer className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
            <p>© 2026 DCIM Compliance — Built for Labor Organizers</p>
            <div className="flex items-center gap-4">
              <button onClick={() => showToast('Docs coming soon!')} className="hover:text-blue-600">Docs</button>
              <button onClick={() => showToast('Support coming soon!')} className="hover:text-blue-600">Support</button>
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default LightDashboard;
