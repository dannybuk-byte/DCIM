import { memo, useMemo, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Download, Layers, SlidersHorizontal, Timer, Bookmark, Plus, Trash2, X } from 'lucide-react';

type PanelTab = 'layers' | 'filters' | 'time' | 'scenes' | 'export' | 'custom';

export type ComplianceStatus = 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown';

export type ConnectographyLayerId =
  | 'facilities'
  | 'heatmap'
  | 'topology'
  | 'flows'
  | 'corridors'
  | 'footprints'
  | 'simulation';

export interface SimulationSettings {
  intensity: number; // 0..1 (particle density)
  speed: number; // 0.2..3
  trail: number; // 0..1 (higher = longer trails)
  opacity: number; // 0..1
  particleSize: number; // pixels
}

export interface ConnectographyLayerSettings {
  layers: Record<ConnectographyLayerId, boolean>;
  opacity: {
    heatmap: number;
    topology: number;
    flows: number;
    corridors: number;
    footprints: number;
    simulation: number;
  };
  animateFlows: boolean;
}

export interface ConnectographyFilters {
  operatorQuery: string;
  selectedOperators: string[]; // empty = all
  statuses: Record<ComplianceStatus, boolean>;
  minSubsidyGap: number;
  minMetricValue?: number;
  yearStart: number;
  yearEnd: number;
}

export interface ConnectographyScene {
  id: string;
  name: string;
  createdAt: string;
  basemap: 'satellite' | 'osm' | 'osm-hot' | 'dark';
  connectography: ConnectographyLayerSettings;
  filters: ConnectographyFilters;
  viewport?: { center: [number, number]; zoom: number; bearing: number; pitch: number };
}

export interface ConnectographyCustomLayer {
  id: string;
  name: string;
  visible: boolean;
  geojson: any;
}

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

const OperatorRow = memo(function OperatorRow({
  operator,
  selected,
  onToggle,
}: {
  operator: string;
  selected: boolean;
  onToggle: (operator: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onToggle(operator)}
      className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border flex items-center justify-between ${
        selected ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
      }`}
      title={operator}
    >
      <span className="truncate">{operator}</span>
      <span className="text-xs opacity-80">{selected ? 'On' : 'Off'}</span>
    </button>
  );
});

export const ConnectographyToolkitPanel = memo(function ConnectographyToolkitPanel({
  isOpen,
  onClose,
  basemap,
  onBasemapChange,
  connectography,
  onConnectographyChange,
  operators,
  availableYears,
  filters,
  onFiltersChange,
  metricLabel,
  metricMax,
  metricStep,
  metricValueFormatter,
  timePlaying,
  onToggleTimePlaying,
  scenes,
  onSaveScene,
  onLoadScene,
  onDeleteScene,
  exportActions,
  customLayers,
  onCustomLayersChange,
  simulation,
  onSimulationChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  basemap: 'satellite' | 'osm' | 'osm-hot' | 'dark';
  onBasemapChange: (b: 'satellite' | 'osm' | 'osm-hot' | 'dark') => void;
  connectography: ConnectographyLayerSettings;
  onConnectographyChange: (next: ConnectographyLayerSettings) => void;
  operators: string[];
  availableYears: { min: number; max: number };
  filters: ConnectographyFilters;
  onFiltersChange: (next: ConnectographyFilters) => void;
  metricLabel: string;
  metricMax: number;
  metricStep: number;
  metricValueFormatter?: (value: number) => string;
  timePlaying: boolean;
  onToggleTimePlaying: () => void;
  scenes: ConnectographyScene[];
  onSaveScene: (name: string) => void;
  onLoadScene: (sceneId: string) => void;
  onDeleteScene: (sceneId: string) => void;
  exportActions: {
    exportFacilitiesGeoJson: () => void;
    exportFlowsGeoJson: () => void;
    exportTopologyGeoJson: () => void;
  };
  customLayers: ConnectographyCustomLayer[];
  onCustomLayersChange: (next: ConnectographyCustomLayer[]) => void;
  simulation: SimulationSettings;
  onSimulationChange: (next: SimulationSettings) => void;
}) {
  const [tab, setTab] = useState<PanelTab>('layers');
  const [sceneName, setSceneName] = useState('Scene');
  const [customName, setCustomName] = useState('Overlay');
  const [customGeoJsonText, setCustomGeoJsonText] = useState('');

  const filteredOperators = useMemo(() => {
    const q = filters.operatorQuery.trim().toLowerCase();
    const ops = operators.slice().sort((a, b) => a.localeCompare(b));
    if (!q) return ops;
    return ops.filter((op) => op.toLowerCase().includes(q));
  }, [filters.operatorQuery, operators]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: filteredOperators.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 44,
    overscan: 8,
  });

  const toggleLayer = (id: ConnectographyLayerId) => {
    onConnectographyChange({ ...connectography, layers: { ...connectography.layers, [id]: !connectography.layers[id] } });
  };

  const toggleOperator = (op: string) => {
    const set = new Set(filters.selectedOperators);
    if (set.has(op)) set.delete(op);
    else set.add(op);
    onFiltersChange({ ...filters, selectedOperators: Array.from(set) });
  };

  const addCustomLayer = () => {
    try {
      const parsed = JSON.parse(customGeoJsonText);
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      onCustomLayersChange([{ id, name: customName.trim() || 'Overlay', visible: true, geojson: parsed }, ...customLayers]);
      setCustomGeoJsonText('');
    } catch {
      // noop (caller can see nothing happens; keeps UI simple)
    }
  };

  const toggleCustomLayer = (id: string) => {
    onCustomLayersChange(customLayers.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)));
  };

  const deleteCustomLayer = (id: string) => {
    onCustomLayersChange(customLayers.filter((l) => l.id !== id));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 left-0 w-full md:w-[520px] z-[999999] bg-gray-950 border-r border-gray-800 shadow-2xl">
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-white font-semibold truncate">Connectography Toolkit</div>
          <div className="text-xs text-gray-500 truncate">Layers • flows • time • scenes • export</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close Connectography Toolkit"
        >
          <X className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      <div className="p-3 border-b border-gray-800 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setTab('layers')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${
            tab === 'layers' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          Layers
        </button>
        <button
          type="button"
          onClick={() => setTab('filters')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${
            tab === 'filters' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          Filters
        </button>
        <button
          type="button"
          onClick={() => setTab('time')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${
            tab === 'time' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
          }`}
        >
          <Timer className="w-4 h-4" />
          Time
        </button>
        <button
          type="button"
          onClick={() => setTab('scenes')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${
            tab === 'scenes' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
          }`}
        >
          <Bookmark className="w-4 h-4" />
          Scenes
        </button>
        <button
          type="button"
          onClick={() => setTab('export')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${
            tab === 'export' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
          }`}
        >
          <Download className="w-4 h-4" />
          Export
        </button>
        <button
          type="button"
          onClick={() => setTab('custom')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${
            tab === 'custom' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
          }`}
        >
          <Plus className="w-4 h-4" />
          Overlays
        </button>

        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => onBasemapChange('satellite')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
              basemap === 'satellite' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => onBasemapChange('osm')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
              basemap === 'osm' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
          >
            OSM
          </button>
          <button
            type="button"
            onClick={() => onBasemapChange('osm-hot')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
              basemap === 'osm-hot' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
          >
            HOT
          </button>
          <button
            type="button"
            onClick={() => onBasemapChange('dark')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
              basemap === 'dark' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-120px)]">
        {tab === 'layers' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">
              Toggle overlays and tune intensity. (These settings persist via IndexedDB.)
            </div>

            <div className="grid grid-cols-1 gap-2">
              <button type="button" onClick={() => toggleLayer('facilities')} className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border flex items-center justify-between ${connectography.layers.facilities ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'}`}>
                <span>Facilities</span>
                <span className="text-xs opacity-80">{connectography.layers.facilities ? 'On' : 'Off'}</span>
              </button>
              <button type="button" onClick={() => toggleLayer('heatmap')} className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border flex items-center justify-between ${connectography.layers.heatmap ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'}`}>
                <span>Heatmap (subsidy pressure)</span>
                <span className="text-xs opacity-80">{connectography.layers.heatmap ? 'On' : 'Off'}</span>
              </button>
              <button type="button" onClick={() => toggleLayer('topology')} className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border flex items-center justify-between ${connectography.layers.topology ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'}`}>
                <span>Topology (spokes)</span>
                <span className="text-xs opacity-80">{connectography.layers.topology ? 'On' : 'Off'}</span>
              </button>
              <button type="button" onClick={() => toggleLayer('flows')} className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border flex items-center justify-between ${connectography.layers.flows ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'}`}>
                <span>Flows (animated)</span>
                <span className="text-xs opacity-80">{connectography.layers.flows ? 'On' : 'Off'}</span>
              </button>
              <button type="button" onClick={() => toggleLayer('corridors')} className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border flex items-center justify-between ${connectography.layers.corridors ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'}`}>
                <span>Corridors (uncertainty envelope)</span>
                <span className="text-xs opacity-80">{connectography.layers.corridors ? 'On' : 'Off'}</span>
              </button>
              <button type="button" onClick={() => toggleLayer('footprints')} className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border flex items-center justify-between ${connectography.layers.footprints ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'}`}>
                <span>Facility footprints (zoomed)</span>
                <span className="text-xs opacity-80">{connectography.layers.footprints ? 'On' : 'Off'}</span>
              </button>
              <button type="button" onClick={() => toggleLayer('simulation')} className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border flex items-center justify-between ${connectography.layers.simulation ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'}`}>
                <span>Simulation (particles)</span>
                <span className="text-xs opacity-80">{connectography.layers.simulation ? 'On' : 'Off'}</span>
              </button>
            </div>

            <div className="pt-2 border-t border-gray-800 space-y-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Heatmap opacity</div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={connectography.opacity.heatmap}
                  onChange={(e) => onConnectographyChange({ ...connectography, opacity: { ...connectography.opacity, heatmap: clamp01(Number(e.target.value)) } })}
                  className="w-full"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Topology opacity</div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={connectography.opacity.topology}
                  onChange={(e) => onConnectographyChange({ ...connectography, opacity: { ...connectography.opacity, topology: clamp01(Number(e.target.value)) } })}
                  className="w-full"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Flows opacity</div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={connectography.opacity.flows}
                  onChange={(e) => onConnectographyChange({ ...connectography, opacity: { ...connectography.opacity, flows: clamp01(Number(e.target.value)) } })}
                  className="w-full"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Corridors opacity</div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={connectography.opacity.corridors}
                  onChange={(e) =>
                    onConnectographyChange({ ...connectography, opacity: { ...connectography.opacity, corridors: clamp01(Number(e.target.value)) } })
                  }
                  className="w-full"
                />
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">Footprints opacity</div>
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={connectography.opacity.footprints}
                  onChange={(e) =>
                    onConnectographyChange({ ...connectography, opacity: { ...connectography.opacity, footprints: clamp01(Number(e.target.value)) } })
                  }
                  className="w-full"
                />
              </div>
              <button
                type="button"
                onClick={() => onConnectographyChange({ ...connectography, animateFlows: !connectography.animateFlows })}
                className={`w-full px-3 py-2 rounded-lg text-sm font-semibold border flex items-center justify-between ${
                  connectography.animateFlows ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
                }`}
              >
                <span>Animate flows</span>
                <span className="text-xs opacity-80">{connectography.animateFlows ? 'On' : 'Off'}</span>
              </button>

              <div className="pt-2 border-t border-gray-800 space-y-3">
                <div className="text-xs text-gray-400">Simulation tuning</div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Particle density</div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={simulation.intensity}
                    onChange={(e) => onSimulationChange({ ...simulation, intensity: clamp01(Number(e.target.value)) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Particle speed</div>
                  <input
                    type="range"
                    min={0.2}
                    max={2.5}
                    step={0.05}
                    value={simulation.speed}
                    onChange={(e) => onSimulationChange({ ...simulation, speed: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Trail persistence</div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={simulation.trail}
                    onChange={(e) => onSimulationChange({ ...simulation, trail: clamp01(Number(e.target.value)) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Simulation opacity</div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={simulation.opacity}
                    onChange={(e) => onSimulationChange({ ...simulation, opacity: clamp01(Number(e.target.value)) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <div className="text-xs text-gray-400 mb-1">Particle size</div>
                  <input
                    type="range"
                    min={1}
                    max={4}
                    step={0.1}
                    value={simulation.particleSize}
                    onChange={(e) => onSimulationChange({ ...simulation, particleSize: Number(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'filters' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">Filter which facilities feed the map + flows.</div>

            <div className="grid grid-cols-2 gap-2">
              {(['Compliant', 'Non-Compliant', 'At Risk', 'Unknown'] as ComplianceStatus[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, statuses: { ...filters.statuses, [s]: !filters.statuses[s] } })}
                  className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                    filters.statuses[s] ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-gray-800">
              <div className="text-xs text-gray-400 mb-1">Minimum {metricLabel}</div>
              <input
                type="range"
                min={0}
                max={metricMax}
                step={metricStep}
                value={typeof filters.minMetricValue === 'number' ? filters.minMetricValue : filters.minSubsidyGap}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    minMetricValue: Number(e.target.value),
                    // Back-compat: keep the old field synced
                    minSubsidyGap: Number(e.target.value),
                  })
                }
                className="w-full"
              />
              <div className="text-xs text-gray-500 mt-1">
                {(metricValueFormatter ? metricValueFormatter(typeof filters.minMetricValue === 'number' ? filters.minMetricValue : filters.minSubsidyGap) : (typeof filters.minMetricValue === 'number' ? filters.minMetricValue : filters.minSubsidyGap).toLocaleString())}
                +
              </div>
            </div>

            <div className="pt-2 border-t border-gray-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-white">Operators</div>
                <div className="text-xs text-gray-400">{filters.selectedOperators.length || 'All'} selected</div>
              </div>
              <input
                value={filters.operatorQuery}
                onChange={(e) => onFiltersChange({ ...filters, operatorQuery: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm"
                placeholder="Filter operators…"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, selectedOperators: [] })}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800"
                >
                  Clear selection
                </button>
                <button
                  type="button"
                  onClick={() => onFiltersChange({ ...filters, selectedOperators: filteredOperators.slice(0, 200) })}
                  className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800"
                  title="Safety cap: selects first 200 matches"
                >
                  Select matches
                </button>
              </div>

              <div ref={parentRef} className="h-[360px] overflow-auto border border-gray-800 rounded-xl bg-black/30">
                <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
                  {virtualizer.getVirtualItems().map((vi) => {
                    const op = filteredOperators[vi.index];
                    const selected = filters.selectedOperators.length === 0 ? true : filters.selectedOperators.includes(op);
                    return (
                      <div key={vi.key} style={{ position: 'absolute', top: 0, left: 0, width: '100%', transform: `translateY(${vi.start}px)` }}>
                        <div className="p-2">
                          <OperatorRow operator={op} selected={selected} onToggle={toggleOperator} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {tab === 'time' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">Play through audit history using last audit year.</div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onToggleTimePlaying}
                className={`px-3 py-2 rounded-lg text-sm font-semibold border ${
                  timePlaying ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
                }`}
              >
                {timePlaying ? 'Pause' : 'Play'}
              </button>
            </div>

            <div className="pt-2 border-t border-gray-800 space-y-3">
              <div>
                <div className="text-xs text-gray-400 mb-1">Start year</div>
                <input
                  type="range"
                  min={availableYears.min}
                  max={availableYears.max}
                  step={1}
                  value={filters.yearStart}
                  onChange={(e) => onFiltersChange({ ...filters, yearStart: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">{filters.yearStart}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 mb-1">End year</div>
                <input
                  type="range"
                  min={availableYears.min}
                  max={availableYears.max}
                  step={1}
                  value={filters.yearEnd}
                  onChange={(e) => onFiltersChange({ ...filters, yearEnd: Number(e.target.value) })}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 mt-1">{filters.yearEnd}</div>
              </div>
            </div>
          </div>
        )}

        {tab === 'scenes' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">Save map state as a narrative “scene” and recall instantly.</div>

            <div className="flex gap-2">
              <input
                value={sceneName}
                onChange={(e) => setSceneName(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm"
              />
              <button
                type="button"
                onClick={() => onSaveScene(sceneName)}
                className="px-3 py-2 rounded-lg text-sm font-semibold border bg-cyan-600 text-white border-cyan-500 hover:bg-cyan-700 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Save
              </button>
            </div>

            <div className="space-y-2">
              {scenes.length === 0 && <div className="text-sm text-gray-500">No scenes yet.</div>}
              {scenes.map((s) => (
                <div key={s.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{s.name}</div>
                      <div className="text-xs text-gray-500 truncate">{new Date(s.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onLoadScene(s.id)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800"
                      >
                        Load
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteScene(s.id)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900 text-red-200 border-red-800 hover:bg-red-900/30 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {tab === 'export' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">Export current visible data for external analysis / reporting.</div>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={exportActions.exportFacilitiesGeoJson}
                className="px-3 py-2 rounded-lg text-sm font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Facilities GeoJSON
              </button>
              <button
                type="button"
                onClick={exportActions.exportFlowsGeoJson}
                className="px-3 py-2 rounded-lg text-sm font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Flows GeoJSON
              </button>
              <button
                type="button"
                onClick={exportActions.exportTopologyGeoJson}
                className="px-3 py-2 rounded-lg text-sm font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export Topology GeoJSON
              </button>
            </div>
          </div>
        )}

        {tab === 'custom' && (
          <div className="space-y-3">
            <div className="text-sm text-gray-300">Add your own GeoJSON overlays (cables, landing points, IXPs, regions, etc.).</div>

            <div className="space-y-2">
              <input
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-sm"
                placeholder="Overlay name"
              />
              <textarea
                value={customGeoJsonText}
                onChange={(e) => setCustomGeoJsonText(e.target.value)}
                className="w-full h-[160px] px-3 py-2 rounded-lg bg-gray-900 border border-gray-700 text-gray-200 text-xs font-mono"
                placeholder='Paste GeoJSON here (FeatureCollection)…'
              />
              <button
                type="button"
                onClick={addCustomLayer}
                className="px-3 py-2 rounded-lg text-sm font-semibold border bg-cyan-600 text-white border-cyan-500 hover:bg-cyan-700 flex items-center gap-2"
                title="Adds overlay if JSON parses successfully"
              >
                <Plus className="w-4 h-4" />
                Add Overlay
              </button>
            </div>

            <div className="pt-2 border-t border-gray-800 space-y-2">
              {customLayers.length === 0 && <div className="text-sm text-gray-500">No overlays added yet.</div>}
              {customLayers.map((l) => (
                <div key={l.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{l.name}</div>
                      <div className="text-xs text-gray-500 truncate">{l.visible ? 'Visible' : 'Hidden'}</div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCustomLayer(l.id)}
                        className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
                          l.visible ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
                        }`}
                      >
                        {l.visible ? 'Hide' : 'Show'}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomLayer(l.id)}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900 text-red-200 border-red-800 hover:bg-red-900/30 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

ConnectographyToolkitPanel.displayName = 'ConnectographyToolkitPanel';


