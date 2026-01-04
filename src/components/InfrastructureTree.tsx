/**
 * 20-Level Infrastructure Tree (Virtualized)
 * 
 * Hierarchical exploration with maximum depth:
 * Provider → Region → Country → State → Metro → Campus → Building → Floor → Zone 
 * → Room → Row → Rack → RU → Server → Chassis → Blade → CPU → Core → Thread → Process
 * 
 * Uses DeepNestedTree for virtualized rendering and consistent density styling.
 */

import React, { useMemo, useCallback, memo } from 'react';
import { Building2, MapPin, Server, Cpu, Layers, Box, HardDrive, Database, Globe, Thermometer, Activity } from 'lucide-react';
import { Facility } from '../types';
import { DeepNestedTree, TreeNodeData } from './shared/DeepNestedTree';
import { useDensity } from '../contexts/DensityContext';
import { DensityToggleInline } from './shared/DensityToggle';

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

const levelIcons: Record<TreeLevel, React.ComponentType<{ className?: string }>> = {
  provider: Building2,
  region: Globe,
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
  core: Activity,
  thread: Thermometer,
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

interface InfrastructurePayload {
  level: TreeLevel;
  facilityCount: number;
  avgCompliance: number;
  parentLabel?: string;
}

interface InfrastructureTreeProps {
  facilities: Facility[];
  onNodeSelect?: (node: TreeNodeData) => void;
  height?: number;
  className?: string;
}

// Generate children based on parent context (lazy)
function generateChildren(parentNode: TreeNodeData): TreeNodeData[] {
  const payload = parentNode.payload as InfrastructurePayload;
  const { level, facilityCount, avgCompliance, parentLabel } = payload;
  
  const nextLevel = nextLevelMap[level];
  if (!nextLevel) return [];

  const makeNode = (id: string, label: string, fc: number, comp: number): TreeNodeData => ({
    id,
    label,
    icon: levelIcons[nextLevel],
    depth: parentNode.depth + 1,
    hasChildren: parentNode.depth < 19, // Max depth 20 (0-19)
    metrics: [
      { label: 'Count', value: fc, color: '#00d2d3' },
      { label: 'Compliance', value: `${Math.round(comp)}%`, color: comp >= 80 ? '#2ed573' : comp >= 60 ? '#ffa502' : '#ff4757' },
    ],
    payload: {
      level: nextLevel,
      facilityCount: fc,
      avgCompliance: comp,
      parentLabel: label,
    } as InfrastructurePayload,
  });

  switch (level) {
    case 'provider':
      return [
        makeNode(`${parentNode.id}-americas`, 'Americas', Math.floor(facilityCount * 0.5), 78),
        makeNode(`${parentNode.id}-emea`, 'EMEA', Math.floor(facilityCount * 0.3), 82),
        makeNode(`${parentNode.id}-apac`, 'APAC', Math.floor(facilityCount * 0.2), 85),
      ];

    case 'region':
      if (parentLabel?.includes('Americas')) {
        return [
          makeNode(`${parentNode.id}-us`, 'United States', Math.floor(facilityCount * 0.7), 76),
          makeNode(`${parentNode.id}-ca`, 'Canada', Math.floor(facilityCount * 0.2), 88),
          makeNode(`${parentNode.id}-br`, 'Brazil', Math.floor(facilityCount * 0.1), 72),
        ];
      } else if (parentLabel?.includes('EMEA')) {
        return [
          makeNode(`${parentNode.id}-uk`, 'United Kingdom', Math.floor(facilityCount * 0.3), 84),
          makeNode(`${parentNode.id}-de`, 'Germany', Math.floor(facilityCount * 0.3), 86),
          makeNode(`${parentNode.id}-fr`, 'France', Math.floor(facilityCount * 0.2), 81),
          makeNode(`${parentNode.id}-nl`, 'Netherlands', Math.floor(facilityCount * 0.2), 89),
        ];
      } else {
        return [
          makeNode(`${parentNode.id}-jp`, 'Japan', Math.floor(facilityCount * 0.35), 89),
          makeNode(`${parentNode.id}-sg`, 'Singapore', Math.floor(facilityCount * 0.25), 87),
          makeNode(`${parentNode.id}-au`, 'Australia', Math.floor(facilityCount * 0.2), 83),
          makeNode(`${parentNode.id}-hk`, 'Hong Kong', Math.floor(facilityCount * 0.2), 85),
        ];
      }

    case 'country':
    case 'state':
    case 'metro':
      return Array.from({ length: 3 + Math.floor(Math.random() * 4) }, (_, i) => {
        const fc = Math.max(1, Math.floor(facilityCount / (i + 2)));
        const comp = Math.min(100, avgCompliance + (Math.random() * 10 - 5));
        return makeNode(`${parentNode.id}-${nextLevel}-${i}`, `${levelLabels[nextLevel]} ${i + 1}`, fc, comp);
      });

    case 'campus':
    case 'building':
      return Array.from({ length: Math.min(8, Math.max(1, Math.floor(facilityCount / 10))) }, (_, i) => {
        const fc = Math.max(1, Math.floor(facilityCount / 8));
        return makeNode(`${parentNode.id}-${nextLevel}-${i}`, `${levelLabels[nextLevel]} ${i + 1}`, fc, avgCompliance);
      });

    case 'floor':
    case 'zone':
    case 'room':
      return Array.from({ length: Math.min(20, Math.max(5, Math.floor(facilityCount / 5))) }, (_, i) => {
        const fc = Math.max(1, Math.floor(facilityCount / 10));
        return makeNode(`${parentNode.id}-${nextLevel}-${i}`, `${levelLabels[nextLevel]} ${String.fromCharCode(65 + i)}`, fc, avgCompliance);
      });

    case 'row':
      return Array.from({ length: Math.min(30, 10 + Math.floor(Math.random() * 20)) }, (_, i) => {
        return makeNode(`${parentNode.id}-rack-${i}`, `Rack ${i + 1}`, 1, avgCompliance);
      });

    case 'rack':
      // Standard 42U rack
      return Array.from({ length: 42 }, (_, i) => {
        const occupied = Math.random() > 0.3;
        return makeNode(`${parentNode.id}-ru-${i}`, `RU ${i + 1}`, occupied ? 1 : 0, avgCompliance);
      });

    case 'ru':
    case 'server':
    case 'chassis':
    case 'blade':
      return Array.from({ length: 2 + Math.floor(Math.random() * 6) }, (_, i) => {
        return makeNode(`${parentNode.id}-${nextLevel}-${i}`, `${levelLabels[nextLevel]} ${i}`, 1, avgCompliance);
      });

    case 'cpu':
      const coreCount = [4, 8, 16, 32, 64][Math.floor(Math.random() * 5)];
      return Array.from({ length: coreCount }, (_, i) => {
        return makeNode(`${parentNode.id}-core-${i}`, `Core ${i}`, 1, avgCompliance);
      });

    case 'core':
      return Array.from({ length: 2 }, (_, i) => {
        return makeNode(`${parentNode.id}-thread-${i}`, `Thread ${i}`, 1, avgCompliance);
      });

    case 'thread':
      const processCount = 5 + Math.floor(Math.random() * 15);
      return Array.from({ length: processCount }, (_, i) => {
        return makeNode(`${parentNode.id}-proc-${i}`, `Process ${i}`, 1, avgCompliance);
      });

    default:
      return [];
  }
}

export const InfrastructureTree: React.FC<InfrastructureTreeProps> = memo(({ 
  facilities, 
  onNodeSelect, 
  height = 600,
  className = '' 
}) => {
  const { tokens, cn } = useDensity();

  // Generate root nodes (providers)
  const rootNodes = useMemo((): TreeNodeData[] => {
    const providers = [...new Set(facilities.map(f => f.operator))].sort();

    return providers.slice(0, 50).map(provider => { // Limit to 50 providers for perf
      const providerFacilities = facilities.filter(f => f.operator === provider);
      const avgCompliance = providerFacilities.length > 0
        ? providerFacilities.reduce((sum, f) => {
            const score = f.complianceStatus === 'Compliant' ? 100 : 
                          f.complianceStatus === 'At Risk' ? 60 : 
                          f.complianceStatus === 'Non-Compliant' ? 20 : 50;
            return sum + score;
          }, 0) / providerFacilities.length
        : 50;

      return {
        id: `provider-${provider}`,
        label: provider,
        icon: levelIcons.provider,
        depth: 0,
        hasChildren: true,
        metrics: [
          { label: 'Facilities', value: providerFacilities.length, color: '#00d2d3' },
          { label: 'Compliance', value: `${Math.round(avgCompliance)}%`, color: avgCompliance >= 80 ? '#2ed573' : avgCompliance >= 60 ? '#ffa502' : '#ff4757' },
        ],
        payload: {
          level: 'provider' as TreeLevel,
          facilityCount: providerFacilities.length,
          avgCompliance: Math.round(avgCompliance),
          parentLabel: provider,
        } as InfrastructurePayload,
      };
    });
  }, [facilities]);

  // Lazy children loader
  const getChildren = useCallback((node: TreeNodeData): TreeNodeData[] => {
    return generateChildren(node);
  }, []);

  // Handle selection
  const handleSelect = useCallback((node: TreeNodeData) => {
    onNodeSelect?.(node);
  }, [onNodeSelect]);

  return (
    <div className={cn('flex flex-col', tokens.gap2, className)}>
      {/* Toolbar */}
      <div className={cn('flex items-center justify-between', tokens.px2)}>
        <div className={cn('text-slate-400', tokens.textSm)}>
          20-level hierarchy • {rootNodes.length} providers • {facilities.length.toLocaleString()} facilities
        </div>
        <DensityToggleInline />
      </div>

      {/* Tree */}
      <DeepNestedTree
        roots={rootNodes}
        getChildren={getChildren}
        onSelect={handleSelect}
        title="Infrastructure Tree"
        height={height}
        maxDepth={20}
      />
    </div>
  );
});

InfrastructureTree.displayName = 'InfrastructureTree';

export default InfrastructureTree;
