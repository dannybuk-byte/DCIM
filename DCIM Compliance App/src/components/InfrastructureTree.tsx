/**
 * 20-Level Infrastructure Tree
 * Hierarchical exploration: Provider → Region → Country → State → Metro → Campus → Building → Floor → Zone → Room → Row → Rack → RU → Server → Chassis → Blade → CPU → Core → Thread → Process
 */

import React, { useState, useCallback, useMemo } from 'react';
import { ChevronRight, ChevronDown, Building2, MapPin, Server, Cpu, Layers, Box, HardDrive, Database } from 'lucide-react';
import { Facility } from '../types';

// 20-level hierarchy definition
export type TreeLevel = 
  | 'provider'     // Level 1
  | 'region'       // Level 2
  | 'country'      // Level 3
  | 'state'        // Level 4
  | 'metro'        // Level 5
  | 'campus'       // Level 6
  | 'building'     // Level 7
  | 'floor'        // Level 8
  | 'zone'         // Level 9
  | 'room'         // Level 10
  | 'row'          // Level 11
  | 'rack'         // Level 12
  | 'ru'           // Level 13
  | 'server'       // Level 14
  | 'chassis'      // Level 15
  | 'blade'        // Level 16
  | 'cpu'          // Level 17
  | 'core'         // Level 18
  | 'thread'       // Level 19
  | 'process';     // Level 20

export interface TreeNode {
  id: string;
  label: string;
  level: TreeLevel;
  depth: number;
  children?: TreeNode[];
  facilityCount: number;
  avgCompliance: number;
  metadata?: Record<string, any>;
}

interface InfrastructureTreeProps {
  facilities: Facility[];
  onNodeSelect?: (node: TreeNode) => void;
}

const levelIcons: Record<TreeLevel, React.ComponentType<any>> = {
  provider: Building2,
  region: MapPin,
  country: MapPin,
  state: MapPin,
  metro: MapPin,
  campus: Building2,
  building: Building2,
  floor: Layers,
  zone: Box,
  room: Box,
  row: Database,
  rack: Server,
  ru: Box,
  server: Server,
  chassis: HardDrive,
  blade: Cpu,
  cpu: Cpu,
  core: Cpu,
  thread: Cpu,
  process: Database,
};

const levelLabels: Record<TreeLevel, string> = {
  provider: 'Provider',
  region: 'Region',
  country: 'Country',
  state: 'State/Province',
  metro: 'Metro Area',
  campus: 'Campus',
  building: 'Building',
  floor: 'Floor',
  zone: 'Zone',
  room: 'Data Hall',
  row: 'Row',
  rack: 'Rack',
  ru: 'RU Position',
  server: 'Server',
  chassis: 'Chassis',
  blade: 'Blade/Node',
  cpu: 'CPU Socket',
  core: 'Core',
  thread: 'Thread',
  process: 'Process/Container',
};

// Generate child nodes lazily based on parent context
function generateChildren(parentNode: TreeNode, facilities: Facility[]): TreeNode[] {
  const { level, depth, label } = parentNode;
  
  // Define next level in hierarchy
  const nextLevelMap: Partial<Record<TreeLevel, TreeLevel>> = {
    provider: 'region',
    region: 'country',
    country: 'state',
    state: 'metro',
    metro: 'campus',
    campus: 'building',
    building: 'floor',
    floor: 'zone',
    zone: 'room',
    room: 'row',
    row: 'rack',
    rack: 'ru',
    ru: 'server',
    server: 'chassis',
    chassis: 'blade',
    blade: 'cpu',
    cpu: 'core',
    core: 'thread',
    thread: 'process',
  };
  
  const nextLevel = nextLevelMap[level];
  if (!nextLevel) return [];
  
  // Generate children based on current level
  switch (level) {
    case 'provider':
      // Split into regions: Americas, EMEA, APAC
      return [
        { id: `${parentNode.id}-americas`, label: 'Americas', level: 'region', depth: depth + 1, facilityCount: Math.floor(facilities.length * 0.5), avgCompliance: 78 },
        { id: `${parentNode.id}-emea`, label: 'EMEA', level: 'region', depth: depth + 1, facilityCount: Math.floor(facilities.length * 0.3), avgCompliance: 82 },
        { id: `${parentNode.id}-apac`, label: 'APAC', level: 'region', depth: depth + 1, facilityCount: Math.floor(facilities.length * 0.2), avgCompliance: 85 },
      ];
      
    case 'region':
      // Generate countries based on region
      if (label.includes('Americas')) {
        return [
          { id: `${parentNode.id}-us`, label: 'United States', level: 'country', depth: depth + 1, facilityCount: Math.floor(parentNode.facilityCount * 0.7), avgCompliance: 76 },
          { id: `${parentNode.id}-ca`, label: 'Canada', level: 'country', depth: depth + 1, facilityCount: Math.floor(parentNode.facilityCount * 0.2), avgCompliance: 88 },
          { id: `${parentNode.id}-br`, label: 'Brazil', level: 'country', depth: depth + 1, facilityCount: Math.floor(parentNode.facilityCount * 0.1), avgCompliance: 72 },
        ];
      } else if (label.includes('EMEA')) {
        return [
          { id: `${parentNode.id}-uk`, label: 'United Kingdom', level: 'country', depth: depth + 1, facilityCount: Math.floor(parentNode.facilityCount * 0.3), avgCompliance: 84 },
          { id: `${parentNode.id}-de`, label: 'Germany', level: 'country', depth: depth + 1, facilityCount: Math.floor(parentNode.facilityCount * 0.3), avgCompliance: 86 },
          { id: `${parentNode.id}-fr`, label: 'France', level: 'country', depth: depth + 1, facilityCount: Math.floor(parentNode.facilityCount * 0.2), avgCompliance: 81 },
        ];
      } else {
        return [
          { id: `${parentNode.id}-jp`, label: 'Japan', level: 'country', depth: depth + 1, facilityCount: Math.floor(parentNode.facilityCount * 0.4), avgCompliance: 89 },
          { id: `${parentNode.id}-sg`, label: 'Singapore', level: 'country', depth: depth + 1, facilityCount: Math.floor(parentNode.facilityCount * 0.3), avgCompliance: 87 },
          { id: `${parentNode.id}-au`, label: 'Australia', level: 'country', depth: depth + 1, facilityCount: Math.floor(parentNode.facilityCount * 0.3), avgCompliance: 83 },
        ];
      }
      
    case 'country':
    case 'state':
    case 'metro':
      // Generate 3-5 children with decreasing facility count
      return Array.from({ length: 3 + Math.floor(Math.random() * 3) }, (_, i) => ({
        id: `${parentNode.id}-${nextLevel}-${i}`,
        label: `${levelLabels[nextLevel]} ${i + 1}`,
        level: nextLevel,
        depth: depth + 1,
        facilityCount: Math.max(1, Math.floor(parentNode.facilityCount / (i + 2))),
        avgCompliance: Math.min(100, parentNode.avgCompliance + (Math.random() * 10 - 5)),
      }));
      
    case 'campus':
    case 'building':
      // Buildings have floors (typically 1-8)
      return Array.from({ length: Math.min(8, Math.max(1, Math.floor(parentNode.facilityCount / 10))) }, (_, i) => ({
        id: `${parentNode.id}-${nextLevel}-${i}`,
        label: `${levelLabels[nextLevel]} ${i + 1}`,
        level: nextLevel,
        depth: depth + 1,
        facilityCount: Math.max(1, Math.floor(parentNode.facilityCount / 8)),
        avgCompliance: parentNode.avgCompliance,
      }));
      
    case 'floor':
    case 'zone':
    case 'room':
      // Rooms have rows (typically 10-20)
      return Array.from({ length: Math.min(20, Math.max(5, Math.floor(parentNode.facilityCount / 5))) }, (_, i) => ({
        id: `${parentNode.id}-${nextLevel}-${i}`,
        label: `${levelLabels[nextLevel]} ${String.fromCharCode(65 + i)}`,
        level: nextLevel,
        depth: depth + 1,
        facilityCount: Math.max(1, Math.floor(parentNode.facilityCount / 10)),
        avgCompliance: parentNode.avgCompliance,
      }));
      
    case 'row':
    case 'rack':
      // Racks have 42 RU positions
      return Array.from({ length: 42 }, (_, i) => ({
        id: `${parentNode.id}-${nextLevel}-${i}`,
        label: `${levelLabels[nextLevel]} ${i + 1}`,
        level: nextLevel,
        depth: depth + 1,
        facilityCount: i % 2 === 0 ? 1 : 0, // 50% occupied
        avgCompliance: parentNode.avgCompliance,
      }));
      
    case 'ru':
    case 'server':
    case 'chassis':
    case 'blade':
      // Hardware levels: 2-8 components
      return Array.from({ length: 2 + Math.floor(Math.random() * 7) }, (_, i) => ({
        id: `${parentNode.id}-${nextLevel}-${i}`,
        label: `${levelLabels[nextLevel]} ${i}`,
        level: nextLevel,
        depth: depth + 1,
        facilityCount: 1,
        avgCompliance: parentNode.avgCompliance,
      }));
      
    case 'cpu':
      // CPUs have cores (4, 8, 16, 32, 64)
      const cores = [4, 8, 16, 32, 64][Math.floor(Math.random() * 5)];
      return Array.from({ length: cores }, (_, i) => ({
        id: `${parentNode.id}-core-${i}`,
        label: `Core ${i}`,
        level: 'core',
        depth: depth + 1,
        facilityCount: 1,
        avgCompliance: parentNode.avgCompliance,
      }));
      
    case 'core':
      // Cores have 2 threads (hyperthreading)
      return Array.from({ length: 2 }, (_, i) => ({
        id: `${parentNode.id}-thread-${i}`,
        label: `Thread ${i}`,
        level: 'thread',
        depth: depth + 1,
        facilityCount: 1,
        avgCompliance: parentNode.avgCompliance,
      }));
      
    case 'thread':
      // Threads have 5-20 processes
      return Array.from({ length: 5 + Math.floor(Math.random() * 16) }, (_, i) => ({
        id: `${parentNode.id}-proc-${i}`,
        label: `Process ${i}`,
        level: 'process',
        depth: depth + 1,
        facilityCount: 1,
        avgCompliance: parentNode.avgCompliance,
      }));
      
    default:
      return [];
  }
}

export const InfrastructureTree: React.FC<InfrastructureTreeProps> = React.memo(({ facilities, onNodeSelect }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(null);
  
  // Generate root nodes (providers)
  const rootNodes = useMemo(() => {
    const providers = [...new Set(facilities.map(f => f.provider))].sort();
    
    return providers.map(provider => {
      const providerFacilities = facilities.filter(f => f.provider === provider);
      const avgCompliance = providerFacilities.reduce((sum, f) => sum + f.complianceScore, 0) / providerFacilities.length;
      
      return {
        id: `provider-${provider}`,
        label: provider,
        level: 'provider' as TreeLevel,
        depth: 0,
        facilityCount: providerFacilities.length,
        avgCompliance: Math.round(avgCompliance),
      };
    });
  }, [facilities]);
  
  // Toggle expand/collapse
  const toggleExpand = useCallback((nodeId: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);
  
  // Handle node selection
  const handleSelect = useCallback((node: TreeNode) => {
    setSelectedId(node.id);
    onNodeSelect?.(node);
  }, [onNodeSelect]);
  
  // Get compliance color
  const getComplianceColor = (score: number): string => {
    if (score >= 80) return 'text-green-400 bg-green-500/10 border-green-500/30';
    if (score >= 60) return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30';
    return 'text-red-400 bg-red-500/10 border-red-500/30';
  };
  
  // Render tree node
  const renderNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expanded.has(node.id);
    const isSelected = selectedId === node.id;
    const Icon = levelIcons[node.level];
    const hasChildren = node.depth < 19; // Max 20 levels (0-19)
    
    // Lazy load children when expanded
    const children = isExpanded && hasChildren ? generateChildren(node, facilities) : [];
    
    return (
      <div key={node.id}>
        <div
          className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors ${
            isSelected ? 'bg-cyan-500/20 border border-cyan-500/50' : ''
          }`}
          style={{ paddingLeft: `${node.depth * 24 + 12}px` }}
          onClick={() => handleSelect(node)}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(node.id);
              }}
              className="text-slate-400 hover:text-white"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          
          {!hasChildren && <div className="w-4" />}
          
          <Icon className="w-4 h-4 text-cyan-400" />
          
          <span className="text-white font-medium">{node.label}</span>
          
          <span className="text-xs text-slate-400">({node.facilityCount})</span>
          
          <span className={`ml-auto text-xs px-2 py-1 rounded border ${getComplianceColor(node.avgCompliance)}`}>
            {node.avgCompliance}%
          </span>
        </div>
        
        {isExpanded && children.length > 0 && (
          <div>
            {children.map(child => renderNode(child))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-700 p-4 max-h-[600px] overflow-y-auto">
      <div className="mb-4 pb-3 border-b border-slate-700">
        <h3 className="text-lg font-semibold text-cyan-400 flex items-center gap-2">
          <Layers className="w-5 h-5" />
          Infrastructure Tree
        </h3>
        <p className="text-sm text-slate-400 mt-1">
          20-level hierarchy • {rootNodes.length} providers • {facilities.length.toLocaleString()} facilities
        </p>
      </div>
      
      <div className="space-y-1">
        {rootNodes.map(node => renderNode(node))}
      </div>
    </div>
  );
});

InfrastructureTree.displayName = 'InfrastructureTree';

