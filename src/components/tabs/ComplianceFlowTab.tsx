/**
 * Intent-Based Compliance Visualization
 * 
 * Inspired by Juniper Apstra's Intent-Based Networking visualizations:
 * - Visual "intent" representation (what SHOULD be: promises made)
 * - Visual "actual state" (what IS: reality observed)
 * - Automatic validation highlighting (gaps, violations)
 * - Non-technical, board-ready presentation
 * 
 * Key IBN Concepts Adapted for Compliance:
 * - Intent = Job promises, subsidy agreements
 * - Actual = Jobs delivered, compliance status
 * - Validation = Automated gap detection
 * - Health = Overall compliance health score
 */

import { useEffect, useRef, useState, useMemo } from 'react';
import CytoscapeComponent from 'react-cytoscapejs';
import { Facility } from '../../types';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  Target,
  Activity,
  Layers,
  Eye,
  EyeOff
} from 'lucide-react';

interface ComplianceFlowTabProps {
  facilities: Facility[];
}

type ViewMode = 'intent' | 'actual' | 'validation' | 'flows';
type LayoutMode = 'hierarchy' | 'force' | 'concentric' | 'grid';

export function ComplianceFlowTab({ facilities }: ComplianceFlowTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('validation');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('hierarchy');
  const [selectedNode, setSelectedNode] = useState<any>(null);
  const [showLabels, setShowLabels] = useState(true);
  const cyRef = useRef<any>(null);

  // Build graph data from facilities
  const graphElements = useMemo(() => {
    const elements: any[] = [];
    const nodeMap = new Map<string, any>();

    // Group by operator
    const operatorGroups = new Map<string, Facility[]>();
    facilities.forEach(f => {
      const op = f.operator || 'Unknown';
      if (!operatorGroups.has(op)) {
        operatorGroups.set(op, []);
      }
      operatorGroups.get(op)!.push(f);
    });

    // Create operator nodes (parent level)
    operatorGroups.forEach((facilityList, operator) => {
      const totalGap = facilityList.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);
      const totalPromised = facilityList.reduce((sum, f) => sum + (f.promisedJobs || 0), 0);
      const totalActual = facilityList.reduce((sum, f) => sum + (f.actualJobs || 0), 0);
      const complianceRate = facilityList.filter(f => f.complianceStatus === 'Compliant').length / facilityList.length;
      
      const health = complianceRate > 0.7 ? 'healthy' : complianceRate > 0.4 ? 'warning' : 'critical';
      
      elements.push({
        data: {
          id: `op-${operator}`,
          label: operator,
          type: 'operator',
          facilityCount: facilityList.length,
          totalGap,
          totalPromised,
          totalActual,
          complianceRate,
          health,
        }
      });

      nodeMap.set(operator, facilityList);
    });

    // Create state nodes (middle level) - top 10 states only for clarity
    const stateGroups = new Map<string, { facilities: Facility[]; operators: Set<string> }>();
    facilities.forEach(f => {
      if (!stateGroups.has(f.state)) {
        stateGroups.set(f.state, { facilities: [], operators: new Set() });
      }
      stateGroups.get(f.state)!.facilities.push(f);
      stateGroups.get(f.state)!.operators.add(f.operator || 'Unknown');
    });

    // Sort states by subsidy gap and take top 10
    const topStates = Array.from(stateGroups.entries())
      .sort((a, b) => {
        const gapA = a[1].facilities.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);
        const gapB = b[1].facilities.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);
        return gapB - gapA;
      })
      .slice(0, 10);

    topStates.forEach(([state, data]) => {
      const totalGap = data.facilities.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);
      const nonCompliantCount = data.facilities.filter(f => f.complianceStatus === 'Non-Compliant').length;
      const health = nonCompliantCount === 0 ? 'healthy' : nonCompliantCount < data.facilities.length * 0.3 ? 'warning' : 'critical';
      
      elements.push({
        data: {
          id: `state-${state}`,
          label: state,
          type: 'state',
          facilityCount: data.facilities.length,
          totalGap,
          operatorCount: data.operators.size,
          health,
        }
      });

      // Create edges from operators to states
      data.operators.forEach(op => {
        elements.push({
          data: {
            id: `edge-${op}-${state}`,
            source: `op-${op}`,
            target: `state-${state}`,
            type: 'operates-in',
            facilityCount: data.facilities.filter(f => (f.operator || 'Unknown') === op).length,
          }
        });
      });
    });

    // Add intent vs actual comparison nodes (for validation view)
    if (viewMode === 'validation') {
      // Add summary intent node
      const totalPromised = facilities.reduce((sum, f) => sum + (f.promisedJobs || 0), 0);
      const totalActual = facilities.reduce((sum, f) => sum + (f.actualJobs || 0), 0);
      const totalGap = facilities.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);

      elements.push({
        data: {
          id: 'intent-summary',
          label: 'Intent\n(Promises)',
          type: 'intent',
          value: totalPromised,
          health: 'intent',
        }
      });

      elements.push({
        data: {
          id: 'actual-summary',
          label: 'Actual\n(Reality)',
          type: 'actual',
          value: totalActual,
          health: totalActual >= totalPromised * 0.9 ? 'healthy' : totalActual >= totalPromised * 0.5 ? 'warning' : 'critical',
        }
      });

      elements.push({
        data: {
          id: 'gap-summary',
          label: `Gap\n$${(totalGap / 1_000_000).toFixed(1)}M`,
          type: 'gap',
          value: totalGap,
          health: 'critical',
        }
      });

      // Connect intent -> actual -> gap
      elements.push({
        data: {
          id: 'edge-intent-actual',
          source: 'intent-summary',
          target: 'actual-summary',
          type: 'validation',
          status: 'fail',
        }
      });

      elements.push({
        data: {
          id: 'edge-actual-gap',
          source: 'actual-summary',
          target: 'gap-summary',
          type: 'validation',
          status: 'fail',
        }
      });
    }

    return elements;
  }, [facilities, viewMode]);

  // Cytoscape stylesheet (IBN-inspired)
  const stylesheet = useMemo(() => [
    // Operator nodes
    {
      selector: 'node[type="operator"]',
      style: {
        'background-color': (ele: any) => {
          const health = ele.data('health');
          return health === 'healthy' ? '#2ed573' : health === 'warning' ? '#ffa502' : '#ff4757';
        },
        'border-width': 3,
        'border-color': '#0d1219',
        'width': (ele: any) => Math.max(60, Math.min(120, 60 + Math.log(ele.data('facilityCount')) * 10)),
        'height': (ele: any) => Math.max(60, Math.min(120, 60 + Math.log(ele.data('facilityCount')) * 10)),
        'label': (ele: any) => showLabels ? ele.data('label') : '',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#e8eef6',
        'font-size': '12px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'text-max-width': '100px',
        'overlay-padding': '6px',
        'z-index': 10,
      }
    },
    // State nodes
    {
      selector: 'node[type="state"]',
      style: {
        'background-color': (ele: any) => {
          const health = ele.data('health');
          return health === 'healthy' ? '#26de81' : health === 'warning' ? '#fd9644' : '#fc5c65';
        },
        'shape': 'rectangle',
        'border-width': 2,
        'border-color': '#1e2a3a',
        'width': 80,
        'height': 50,
        'label': (ele: any) => showLabels ? ele.data('label') : '',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'font-size': '14px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'overlay-padding': '6px',
        'z-index': 5,
      }
    },
    // Intent/Actual/Gap nodes
    {
      selector: 'node[type="intent"]',
      style: {
        'background-color': '#00d2d3',
        'shape': 'roundrectangle',
        'border-width': 3,
        'border-color': '#0d1219',
        'width': 140,
        'height': 80,
        'label': (ele: any) => showLabels ? `${ele.data('label')}\n${ele.data('value').toLocaleString()} jobs` : '',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#0a0e17',
        'font-size': '16px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'overlay-padding': '8px',
        'z-index': 15,
      }
    },
    {
      selector: 'node[type="actual"]',
      style: {
        'background-color': (ele: any) => {
          const health = ele.data('health');
          return health === 'healthy' ? '#2ed573' : health === 'warning' ? '#ffa502' : '#ff4757';
        },
        'shape': 'roundrectangle',
        'border-width': 3,
        'border-color': '#0d1219',
        'width': 140,
        'height': 80,
        'label': (ele: any) => showLabels ? `${ele.data('label')}\n${ele.data('value').toLocaleString()} jobs` : '',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'font-size': '16px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'overlay-padding': '8px',
        'z-index': 15,
      }
    },
    {
      selector: 'node[type="gap"]',
      style: {
        'background-color': '#ff4757',
        'shape': 'diamond',
        'border-width': 3,
        'border-color': '#0d1219',
        'width': 120,
        'height': 120,
        'label': (ele: any) => showLabels ? ele.data('label') : '',
        'text-valign': 'center',
        'text-halign': 'center',
        'color': '#ffffff',
        'font-size': '16px',
        'font-weight': 'bold',
        'text-wrap': 'wrap',
        'overlay-padding': '8px',
        'z-index': 15,
      }
    },
    // Edges
    {
      selector: 'edge[type="operates-in"]',
      style: {
        'width': (ele: any) => Math.max(1, Math.min(8, ele.data('facilityCount') / 5)),
        'line-color': '#3a4a5a',
        'target-arrow-color': '#3a4a5a',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'opacity': 0.6,
      }
    },
    {
      selector: 'edge[type="validation"]',
      style: {
        'width': 4,
        'line-color': (ele: any) => ele.data('status') === 'pass' ? '#2ed573' : '#ff4757',
        'target-arrow-color': (ele: any) => ele.data('status') === 'pass' ? '#2ed573' : '#ff4757',
        'target-arrow-shape': 'triangle',
        'curve-style': 'bezier',
        'line-style': 'dashed',
        'opacity': 0.8,
      }
    },
    // Selected state
    {
      selector: ':selected',
      style: {
        'border-width': 5,
        'border-color': '#00d2d3',
        'overlay-color': '#00d2d3',
        'overlay-opacity': 0.2,
      }
    },
  ], [showLabels]);

  // Layout configurations
  const layouts: Record<LayoutMode, any> = {
    hierarchy: {
      name: 'breadthfirst',
      directed: true,
      spacingFactor: 1.5,
      avoidOverlap: true,
      nodeDimensionsIncludeLabels: true,
    },
    force: {
      name: 'cose',
      animate: true,
      animationDuration: 500,
      nodeRepulsion: 8000,
      idealEdgeLength: 100,
      edgeElasticity: 100,
      nestingFactor: 1.2,
      gravity: 1,
      numIter: 1000,
      initialTemp: 200,
      coolingFactor: 0.95,
      minTemp: 1.0,
    },
    concentric: {
      name: 'concentric',
      concentric: (node: any) => {
        const type = node.data('type');
        if (type === 'intent' || type === 'actual' || type === 'gap') return 100;
        if (type === 'operator') return 50;
        return 10;
      },
      levelWidth: () => 2,
      minNodeSpacing: 80,
    },
    grid: {
      name: 'grid',
      rows: 3,
      avoidOverlap: true,
      nodeDimensionsIncludeLabels: true,
    },
  };

  // Apply layout when mode changes
  useEffect(() => {
    if (cyRef.current) {
      const cy = cyRef.current;
      cy.layout(layouts[layoutMode]).run();
    }
  }, [layoutMode, graphElements]);

  // Handle node selection
  const handleNodeTap = (event: any) => {
    const node = event.target;
    setSelectedNode(node.data());
  };

  // Stats for selected node
  const renderNodeDetails = () => {
    if (!selectedNode) {
      return (
        <div className="text-gray-400 text-center py-8">
          <Target className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Click a node to see details</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 border-b border-gray-800 pb-2">
          {selectedNode.type === 'operator' && <Activity className="w-5 h-5 text-cyan-400" />}
          {selectedNode.type === 'state' && <Layers className="w-5 h-5 text-purple-400" />}
          {selectedNode.type === 'intent' && <Target className="w-5 h-5 text-cyan-400" />}
          {selectedNode.type === 'actual' && <TrendingUp className="w-5 h-5 text-green-400" />}
          {selectedNode.type === 'gap' && <AlertTriangle className="w-5 h-5 text-red-400" />}
          <h3 className="font-semibold text-white">{selectedNode.label}</h3>
        </div>

        {selectedNode.type === 'operator' && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Facilities:</span>
              <span className="text-white font-mono">{selectedNode.facilityCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Promised Jobs:</span>
              <span className="text-white font-mono">{selectedNode.totalPromised.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Actual Jobs:</span>
              <span className="text-white font-mono">{selectedNode.totalActual.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Subsidy Gap:</span>
              <span className="text-red-400 font-mono">${(selectedNode.totalGap / 1_000_000).toFixed(2)}M</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Compliance Rate:</span>
              <span className={`font-mono ${selectedNode.complianceRate > 0.7 ? 'text-green-400' : selectedNode.complianceRate > 0.4 ? 'text-yellow-400' : 'text-red-400'}`}>
                {(selectedNode.complianceRate * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        )}

        {selectedNode.type === 'state' && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Facilities:</span>
              <span className="text-white font-mono">{selectedNode.facilityCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Operators:</span>
              <span className="text-white font-mono">{selectedNode.operatorCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Subsidy Gap:</span>
              <span className="text-red-400 font-mono">${(selectedNode.totalGap / 1_000_000).toFixed(2)}M</span>
            </div>
          </div>
        )}

        {(selectedNode.type === 'intent' || selectedNode.type === 'actual') && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Jobs:</span>
              <span className="text-white font-mono">{selectedNode.value.toLocaleString()}</span>
            </div>
          </div>
        )}

        {selectedNode.type === 'gap' && (
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Total Gap:</span>
              <span className="text-red-400 font-mono">${(selectedNode.value / 1_000_000).toFixed(2)}M</span>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-gray-800">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-xs">Health:</span>
            {selectedNode.health === 'healthy' && <CheckCircle className="w-4 h-4 text-green-400" />}
            {selectedNode.health === 'warning' && <AlertTriangle className="w-4 h-4 text-yellow-400" />}
            {selectedNode.health === 'critical' && <TrendingDown className="w-4 h-4 text-red-400" />}
            <span className={`text-xs font-semibold ${
              selectedNode.health === 'healthy' ? 'text-green-400' : 
              selectedNode.health === 'warning' ? 'text-yellow-400' : 
              'text-red-400'
            }`}>
              {selectedNode.health?.toUpperCase()}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 p-4">
        <h2 className="text-xl font-bold text-white mb-2">Compliance Flow Visualization</h2>
        <p className="text-sm text-gray-400">
          Intent-based view: What was promised vs. what's delivered
        </p>
      </div>

      {/* Controls */}
      <div className="border-b border-gray-800 p-4 flex flex-wrap gap-4 items-center">
        {/* View Mode */}
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('validation')}
            className={`px-3 py-1.5 text-sm rounded ${
              viewMode === 'validation'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Validation
          </button>
          <button
            onClick={() => setViewMode('intent')}
            className={`px-3 py-1.5 text-sm rounded ${
              viewMode === 'intent'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Intent
          </button>
          <button
            onClick={() => setViewMode('actual')}
            className={`px-3 py-1.5 text-sm rounded ${
              viewMode === 'actual'
                ? 'bg-cyan-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Actual
          </button>
        </div>

        {/* Layout Mode */}
        <div className="flex gap-2">
          <button
            onClick={() => setLayoutMode('hierarchy')}
            className={`px-3 py-1.5 text-sm rounded ${
              layoutMode === 'hierarchy'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Hierarchy
          </button>
          <button
            onClick={() => setLayoutMode('force')}
            className={`px-3 py-1.5 text-sm rounded ${
              layoutMode === 'force'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Force
          </button>
          <button
            onClick={() => setLayoutMode('concentric')}
            className={`px-3 py-1.5 text-sm rounded ${
              layoutMode === 'concentric'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Concentric
          </button>
        </div>

        {/* Labels Toggle */}
        <button
          onClick={() => setShowLabels(!showLabels)}
          className="px-3 py-1.5 text-sm rounded bg-gray-800 text-gray-400 hover:bg-gray-700 flex items-center gap-2"
        >
          {showLabels ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          Labels
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Graph */}
        <div className="flex-1 bg-[#0a0e17]">
          <CytoscapeComponent
            elements={graphElements}
            style={{ width: '100%', height: '100%' }}
            stylesheet={stylesheet}
            layout={layouts[layoutMode]}
            cy={(cy) => {
              cyRef.current = cy;
              cy.on('tap', 'node', handleNodeTap);
            }}
          />
        </div>

        {/* Details Panel */}
        <div className="w-80 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto">
          <h3 className="text-lg font-semibold text-white mb-4">Node Details</h3>
          {renderNodeDetails()}

          {/* Legend */}
          <div className="mt-8 pt-8 border-t border-gray-800">
            <h4 className="text-sm font-semibold text-gray-300 mb-3">Legend</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-green-500" />
                <span className="text-gray-400">Healthy (&gt;70% compliant)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-yellow-500" />
                <span className="text-gray-400">Warning (40-70% compliant)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span className="text-gray-400">Critical (&lt;40% compliant)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-cyan-500" />
                <span className="text-gray-400">Intent (Promises Made)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

