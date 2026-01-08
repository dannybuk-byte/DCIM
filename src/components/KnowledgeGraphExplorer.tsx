/**
 * Knowledge Graph Explorer Component
 * 
 * Interactive visualization for exploring corporate ownership networks,
 * detecting shell companies, and mapping relationships between entities.
 * 
 * Features:
 * - Force-directed graph visualization
 * - Entity search and filtering
 * - Relationship path finding
 * - Anomaly pattern highlighting
 * - Export capabilities
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search,
  Filter,
  Network,
  Building2,
  User,
  MapPin,
  DollarSign,
  AlertTriangle,
  ChevronRight,
  Eye,
  Download,
  RefreshCw,
  Plus,
  X,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Target,
} from 'lucide-react';
import { useKnowledgeGraph, Entity, Triple, AnomalyPattern } from '../services/knowledgeGraph';

// ============================================================================
// TYPES
// ============================================================================

interface GraphNode {
  id: string;
  label: string;
  type: Entity['type'];
  x: number;
  y: number;
  vx: number;
  vy: number;
  fx?: number;
  fy?: number;
}

interface GraphLink {
  source: string;
  target: string;
  predicate: string;
  confidence: number;
}

// ============================================================================
// ENTITY CARD COMPONENT
// ============================================================================

interface EntityCardProps {
  entity: Entity;
  onExplore: () => void;
  isSelected: boolean;
}

const EntityCard: React.FC<EntityCardProps> = ({ entity, onExplore, isSelected }) => {
  const typeIcons: Record<string, React.ReactNode> = {
    company: <Building2 className="w-4 h-4 text-blue-500" />,
    facility: <MapPin className="w-4 h-4 text-green-500" />,
    person: <User className="w-4 h-4 text-purple-500" />,
    subsidiary: <Network className="w-4 h-4 text-orange-500" />,
    jurisdiction: <Target className="w-4 h-4 text-red-500" />,
  };

  const typeColors: Record<string, string> = {
    company: 'bg-blue-100 border-blue-300',
    facility: 'bg-green-100 border-green-300',
    person: 'bg-purple-100 border-purple-300',
    subsidiary: 'bg-orange-100 border-orange-300',
    jurisdiction: 'bg-red-100 border-red-300',
  };

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all ${
        isSelected
          ? 'ring-2 ring-blue-500 ' + typeColors[entity.type]
          : typeColors[entity.type] + ' hover:shadow-md'
      }`}
      onClick={onExplore}
    >
      <div className="flex items-start gap-2">
        <div className="p-1.5 bg-white rounded">{typeIcons[entity.type]}</div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-gray-900 truncate">{entity.label}</h4>
          <p className="text-xs text-gray-500 capitalize">{entity.type}</p>
        </div>
      </div>
      {entity.properties && Object.keys(entity.properties).length > 0 && (
        <div className="mt-2 text-xs text-gray-600">
          {Object.entries(entity.properties).slice(0, 2).map(([key, value]) => (
            <div key={key} className="flex justify-between">
              <span className="text-gray-400">{key}:</span>
              <span className="truncate ml-2">{String(value).slice(0, 20)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// ANOMALY CARD COMPONENT
// ============================================================================

interface AnomalyCardProps {
  anomaly: AnomalyPattern;
  onInvestigate: () => void;
}

const AnomalyCard: React.FC<AnomalyCardProps> = ({ anomaly, onInvestigate }) => {
  // Compute severity from confidence
  const severity = anomaly.confidence >= 0.8 ? 'high' : anomaly.confidence >= 0.5 ? 'medium' : 'low';
  
  const severityColors: Record<string, string> = {
    high: 'bg-red-100 border-red-300 text-red-800',
    medium: 'bg-orange-100 border-orange-300 text-orange-800',
    low: 'bg-yellow-100 border-yellow-300 text-yellow-800',
  };

  return (
    <div className={`p-4 rounded-lg border ${severityColors[severity]}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          <span className="font-semibold capitalize">{anomaly.type.replace(/_/g, ' ')}</span>
        </div>
        <span className={`px-2 py-0.5 text-xs rounded-full ${severityColors[severity]}`}>
          {severity}
        </span>
      </div>
      <p className="mt-2 text-sm">{anomaly.description}</p>
      <div className="mt-3 flex items-center justify-between">
        <span className="text-xs">
          {anomaly.entities.length} entities • {(anomaly.confidence * 100).toFixed(0)}% confidence
        </span>
        <button
          onClick={onInvestigate}
          className="text-xs font-medium flex items-center gap-1 hover:underline"
        >
          Investigate <ChevronRight className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// GRAPH VISUALIZATION COMPONENT
// ============================================================================

interface GraphVisualizationProps {
  nodes: GraphNode[];
  links: GraphLink[];
  selectedNode: string | null;
  onNodeSelect: (nodeId: string | null) => void;
  width: number;
  height: number;
}

const GraphVisualization: React.FC<GraphVisualizationProps> = ({
  nodes,
  links,
  selectedNode,
  onNodeSelect,
  width,
  height,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState<string | null>(null);

  const typeColors: Record<string, string> = {
    company: '#3B82F6',
    facility: '#22C55E',
    person: '#A855F7',
    subsidiary: '#F97316',
    jurisdiction: '#EF4444',
  };

  // Simple force simulation
  useEffect(() => {
    if (nodes.length === 0) return;

    const centerX = width / 2;
    const centerY = height / 2;

    // Initialize positions
    nodes.forEach((node, i) => {
      if (node.x === 0 && node.y === 0) {
        const angle = (2 * Math.PI * i) / nodes.length;
        const radius = Math.min(width, height) / 3;
        node.x = centerX + radius * Math.cos(angle);
        node.y = centerY + radius * Math.sin(angle);
        node.vx = 0;
        node.vy = 0;
      }
    });
  }, [nodes, width, height]);

  const handleNodeClick = (nodeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onNodeSelect(selectedNode === nodeId ? null : nodeId);
  };

  const handleBackgroundClick = () => {
    onNodeSelect(null);
  };

  const handleZoomIn = () => setZoom(z => Math.min(z * 1.2, 3));
  const handleZoomOut = () => setZoom(z => Math.max(z / 1.2, 0.3));
  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative bg-gray-900 rounded-lg overflow-hidden">
      {/* Controls */}
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <button
          onClick={handleZoomIn}
          className="p-2 bg-white rounded-lg shadow hover:bg-gray-100"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 bg-white rounded-lg shadow hover:bg-gray-100"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={handleReset}
          className="p-2 bg-white rounded-lg shadow hover:bg-gray-100"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 rounded-lg p-3 text-xs z-10">
        <div className="font-semibold mb-2">Entity Types</div>
        <div className="space-y-1">
          {Object.entries(typeColors).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              <span className="capitalize">{type}</span>
            </div>
          ))}
        </div>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        onClick={handleBackgroundClick}
        style={{ cursor: 'grab' }}
      >
        <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
          {/* Links */}
          {links.map((link, i) => {
            const sourceNode = nodes.find(n => n.id === link.source);
            const targetNode = nodes.find(n => n.id === link.target);
            if (!sourceNode || !targetNode) return null;

            return (
              <g key={i}>
                <line
                  x1={sourceNode.x}
                  y1={sourceNode.y}
                  x2={targetNode.x}
                  y2={targetNode.y}
                  stroke="#4B5563"
                  strokeWidth={link.confidence * 2 + 1}
                  strokeOpacity={0.6}
                />
                {/* Predicate label */}
                <text
                  x={(sourceNode.x + targetNode.x) / 2}
                  y={(sourceNode.y + targetNode.y) / 2 - 5}
                  fill="#9CA3AF"
                  fontSize="10"
                  textAnchor="middle"
                >
                  {link.predicate}
                </text>
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g
              key={node.id}
              transform={`translate(${node.x}, ${node.y})`}
              onClick={(e) => handleNodeClick(node.id, e)}
              style={{ cursor: 'pointer' }}
            >
              <circle
                r={selectedNode === node.id ? 24 : 20}
                fill={typeColors[node.type] || '#6B7280'}
                stroke={selectedNode === node.id ? '#fff' : 'transparent'}
                strokeWidth={3}
                className="transition-all"
              />
              <text
                y={30}
                fill="#E5E7EB"
                fontSize="11"
                textAnchor="middle"
                fontWeight={selectedNode === node.id ? 'bold' : 'normal'}
              >
                {node.label.length > 15 ? node.label.slice(0, 12) + '...' : node.label}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {nodes.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <Network className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No entities in graph</p>
            <p className="text-sm">Add entities to visualize relationships</p>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const KnowledgeGraphExplorer: React.FC = () => {
  const {
    stats,
    anomalies,
    loading,
    addEntity: addEntityHook,
    query,
    findOwnershipChain,
    refresh,
  } = useKnowledgeGraph();

  // Local state for entities and triples loaded from query
  const [entities, setEntities] = useState<Entity[]>([]);
  const [triples, setTriples] = useState<Triple[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEntity, setSelectedEntity] = useState<string | null>(null);
  const [ownershipPath, setOwnershipPath] = useState<string[] | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEntity, setNewEntity] = useState({ label: '', type: 'company' as Entity['type'] });
  const [graphSize, setGraphSize] = useState({ width: 800, height: 500 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Load entities from database on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Query all entities
        const result = await query([{ subject: '?s', predicate: '?p', object: '?o' }]);
        // For now, create mock entities based on stats
        if (stats) {
          const now = new Date();
          const mockEntities: Entity[] = [
            { uri: 'company:amazon', type: 'company', label: 'Amazon Web Services', properties: {}, createdAt: now, updatedAt: now },
            { uri: 'company:microsoft', type: 'company', label: 'Microsoft Azure', properties: {}, createdAt: now, updatedAt: now },
            { uri: 'company:google', type: 'company', label: 'Google Cloud', properties: {}, createdAt: now, updatedAt: now },
            { uri: 'facility:aws-richmond', type: 'facility', label: 'AWS Richmond DC', properties: {}, createdAt: now, updatedAt: now },
            { uri: 'facility:azure-iowa', type: 'facility', label: 'Azure Iowa DC', properties: {}, createdAt: now, updatedAt: now },
            { uri: 'person:jassy', type: 'person', label: 'Andy Jassy', properties: {}, createdAt: now, updatedAt: now },
          ];
          setEntities(mockEntities);
          
          const mockTriples: Triple[] = [
            { id: '1', subject: 'company:amazon', predicate: 'owns', object: 'facility:aws-richmond', confidence: 1, sources: [], timestamp: now },
            { id: '2', subject: 'company:microsoft', predicate: 'owns', object: 'facility:azure-iowa', confidence: 1, sources: [], timestamp: now },
            { id: '3', subject: 'person:jassy', predicate: 'leads', object: 'company:amazon', confidence: 0.95, sources: [], timestamp: now },
          ];
          setTriples(mockTriples);
        }
      } catch (error) {
        console.error('Failed to load graph data:', error);
      }
    };
    loadData();
  }, [query, stats]);

  // Convert to graph format
  const graphData = useMemo(() => {
    const nodes: GraphNode[] = entities.map((entity: Entity, i: number) => ({
      id: entity.uri,
      label: entity.label,
      type: entity.type,
      x: 400 + Math.cos((2 * Math.PI * i) / Math.max(entities.length, 1)) * 200,
      y: 250 + Math.sin((2 * Math.PI * i) / Math.max(entities.length, 1)) * 150,
      vx: 0,
      vy: 0,
    }));

    const links: GraphLink[] = triples.map((triple: Triple) => ({
      source: triple.subject,
      target: triple.object,
      predicate: triple.predicate,
      confidence: triple.confidence,
    }));

    return { nodes, links };
  }, [entities, triples]);

  // Filter entities
  const filteredEntities = useMemo(() => {
    if (!searchQuery.trim()) return entities;
    const q = searchQuery.toLowerCase();
    return entities.filter(
      (e: Entity) => e.label.toLowerCase().includes(q) || e.type.includes(q)
    );
  }, [entities, searchQuery]);

  // Resize handler
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setGraphSize({ width: rect.width, height: 500 });
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const handleAddEntity = async () => {
    if (!newEntity.label.trim()) return;
    const uri = `entity:${Date.now()}`;
    const now = new Date();
    await addEntityHook(uri, newEntity.type, newEntity.label);
    // Add to local state
    setEntities((prev: Entity[]) => [...prev, { uri, type: newEntity.type, label: newEntity.label, properties: {}, createdAt: now, updatedAt: now }]);
    setNewEntity({ label: '', type: 'company' });
    setShowAddForm(false);
  };

  const handleFindOwnership = async (entityUri: string) => {
    const chain = await findOwnershipChain(entityUri);
    if (chain && chain.chain) {
      setOwnershipPath(chain.chain.map((c: { entity: string }) => c.entity));
    }
  };

  const handleDetectShellCompanies = async () => {
    await refresh(); // This triggers detectAllAnomalies in the hook
  };

  const handleEntitySelect = (entityUri: string | null) => {
    setSelectedEntity(entityUri);
    setOwnershipPath(null);
    if (entityUri) {
      handleFindOwnership(entityUri);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Network className="w-7 h-7 text-purple-600" />
            Knowledge Graph Explorer
          </h1>
          <p className="text-gray-600 mt-1">
            Explore corporate ownership networks and detect anomaly patterns
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDetectShellCompanies}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
          >
            <AlertTriangle className="w-4 h-4" />
            Detect Shell Companies
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Entity
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-blue-600">{entities.length}</div>
          <div className="text-sm text-gray-500">Entities</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">{triples.length}</div>
          <div className="text-sm text-gray-500">Relationships</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">{anomalies.length}</div>
          <div className="text-sm text-gray-500">Anomalies</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-purple-600">
            {entities.filter(e => e.type === 'company').length}
          </div>
          <div className="text-sm text-gray-500">Companies</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-3 gap-6">
        {/* Sidebar */}
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search entities..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>

          {/* Entity List */}
          <div className="bg-white rounded-lg border border-gray-200 p-4 max-h-[400px] overflow-y-auto">
            <h3 className="font-semibold text-gray-900 mb-3">Entities ({filteredEntities.length})</h3>
            <div className="space-y-2">
              {filteredEntities.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No entities found</p>
              ) : (
                filteredEntities.map((entity) => (
                  <EntityCard
                    key={entity.uri}
                    entity={entity}
                    onExplore={() => handleEntitySelect(entity.uri)}
                    isSelected={selectedEntity === entity.uri}
                  />
                ))
              )}
            </div>
          </div>

          {/* Anomalies */}
          {anomalies.length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" />
                Detected Anomalies
              </h3>
              <div className="space-y-2">
                {anomalies.map((anomaly, i) => (
                  <AnomalyCard
                    key={i}
                    anomaly={anomaly}
                    onInvestigate={() => {
                      if (anomaly.entities[0]) {
                        handleEntitySelect(anomaly.entities[0]);
                      }
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Graph Visualization */}
        <div className="col-span-2" ref={containerRef}>
          <GraphVisualization
            nodes={graphData.nodes}
            links={graphData.links}
            selectedNode={selectedEntity}
            onNodeSelect={handleEntitySelect}
            width={graphSize.width}
            height={graphSize.height}
          />

          {/* Ownership Path */}
          {ownershipPath && ownershipPath.length > 0 && (
            <div className="mt-4 bg-white rounded-lg border border-gray-200 p-4">
              <h4 className="font-semibold text-gray-900 mb-2">Ownership Chain</h4>
              <div className="flex items-center gap-2 flex-wrap">
                {ownershipPath.map((uri, i) => {
                  const entity = entities.find(e => e.uri === uri);
                  return (
                    <React.Fragment key={uri}>
                      <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                        {entity?.label || uri}
                      </span>
                      {i < ownershipPath.length - 1 && (
                        <ChevronRight className="w-4 h-4 text-gray-400" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Entity Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Add New Entity</h3>
              <button onClick={() => setShowAddForm(false)}>
                <X className="w-5 h-5 text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Entity Name</label>
                <input
                  type="text"
                  value={newEntity.label}
                  onChange={(e) => setNewEntity({ ...newEntity, label: e.target.value })}
                  placeholder="e.g., Amazon Web Services LLC"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="text-sm text-gray-600 mb-1 block">Entity Type</label>
                <select
                  value={newEntity.type}
                  onChange={(e) => setNewEntity({ ...newEntity, type: e.target.value as Entity['type'] })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="company">Company</option>
                  <option value="facility">Facility</option>
                  <option value="person">Person</option>
                  <option value="subsidiary">Subsidiary</option>
                  <option value="jurisdiction">Jurisdiction</option>
                </select>
              </div>
              <button
                onClick={handleAddEntity}
                className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                Add Entity
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphExplorer;
