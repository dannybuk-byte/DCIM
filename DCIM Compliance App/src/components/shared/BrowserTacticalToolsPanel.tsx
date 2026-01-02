import { memo, useMemo, useRef, useState, type ReactNode } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Crosshair, MapPin, Route, Ruler, Square, Trash2 } from 'lucide-react';
import type { ATAKPoint } from '../../utils/atakFormats';
import { formatArea, formatDistance } from '../../utils/geoMath';

export type TacticalMode = 'none' | 'waypoint' | 'route' | 'area' | 'measure';

const ModeButton = memo(function ModeButton({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 ${
        active ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
      }`}
      title={label}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
});

const PointRow = memo(function PointRow({
  point,
  onRename,
  onDelete,
  onZoom,
}: {
  point: ATAKPoint & { __id: string };
  onRename: (id: string, callsign: string) => void;
  onDelete: (id: string) => void;
  onZoom: (id: string) => void;
}) {
  const [name, setName] = useState(point.callsign || '');
  return (
    <div className="flex items-center gap-2 px-2 py-1.5 border border-gray-800 rounded-lg bg-gray-950">
      <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="flex-1 bg-transparent outline-none text-xs text-gray-100 placeholder:text-gray-600"
        placeholder="Callsign"
        aria-label="Callsign"
      />
      <button
        type="button"
        onClick={() => onRename(point.__id, name.trim())}
        className="px-2 py-1 rounded text-[11px] border border-gray-800 bg-gray-900 text-gray-200 hover:bg-gray-800"
        title="Rename"
      >
        Save
      </button>
      <button
        type="button"
        onClick={() => onZoom(point.__id)}
        className="px-2 py-1 rounded text-[11px] border border-cyan-900/60 bg-cyan-900/20 text-cyan-200 hover:bg-cyan-900/30"
        title="Zoom to this waypoint"
      >
        Zoom
      </button>
      <button
        type="button"
        onClick={() => onDelete(point.__id)}
        className="p-1.5 rounded border border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800"
        title="Delete"
        aria-label="Delete point"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
});

export const BrowserTacticalToolsPanel = memo(function BrowserTacticalToolsPanel({
  mode,
  onModeChange,
  snapToFacility,
  onToggleSnapToFacility,
  selectedFacility,
  onSnapSelectedFacility,
  onZoomSelectedFacility,
  onOpenSelectedFacilityMap,
  onOpenSelectedFacilityStreetView,
  onOpenConstructionProgress,
  cursor,
  draft,
  points,
  routesCount,
  areasCount,
  onRenamePoint,
  onDeletePoint,
  onZoomPoint,
  onClearAll,
}: {
  mode: TacticalMode;
  onModeChange: (m: TacticalMode) => void;
  snapToFacility: boolean;
  onToggleSnapToFacility: () => void;
  selectedFacility: { id?: string; name: string; operator?: string; status?: string; city?: string; state?: string; lat: number; lng: number } | null;
  onSnapSelectedFacility: () => void;
  onZoomSelectedFacility: () => void;
  onOpenSelectedFacilityMap: () => void;
  onOpenSelectedFacilityStreetView: () => void;
  onOpenConstructionProgress: () => void;
  cursor: { lng: number; lat: number } | null;
  draft: { lengthMeters: number; areaMeters2: number; vertices: number };
  points: (ATAKPoint & { __id: string })[];
  routesCount: number;
  areasCount: number;
  onRenamePoint: (id: string, callsign: string) => void;
  onDeletePoint: (id: string) => void;
  onZoomPoint: (id: string) => void;
  onClearAll: () => void;
}) {
  const cursorText = useMemo(() => {
    if (!cursor) return '—';
    return `${cursor.lat.toFixed(6)}, ${cursor.lng.toFixed(6)}`;
  }, [cursor]);

  const parentRef = useRef<HTMLDivElement | null>(null);
  const virtualizer = useVirtualizer({
    count: points.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 46,
    overscan: 10,
  });

  return (
    <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-gray-200">Browser Tactical Tools</div>
        <button
          type="button"
          onClick={onClearAll}
          className="px-2 py-1 rounded text-[11px] border border-red-900/60 bg-red-900/20 text-red-200 hover:bg-red-900/30"
          title="Clear all overlay objects"
        >
          Clear overlay
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ModeButton
          active={mode === 'waypoint'}
          label="Waypoint"
          icon={<MapPin className="w-4 h-4" />}
          onClick={() => onModeChange(mode === 'waypoint' ? 'none' : 'waypoint')}
        />
        <button
          type="button"
          onClick={onToggleSnapToFacility}
          className={`px-2.5 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 ${
            snapToFacility ? 'bg-green-600 text-white border-green-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
          }`}
          title="When enabled, clicking a facility marker creates a waypoint at that facility"
        >
          <Crosshair className="w-4 h-4" />
          Snap: Facility
        </button>
        <ModeButton
          active={mode === 'route'}
          label="Route"
          icon={<Route className="w-4 h-4" />}
          onClick={() => onModeChange(mode === 'route' ? 'none' : 'route')}
        />
        <ModeButton
          active={mode === 'area'}
          label="Area"
          icon={<Square className="w-4 h-4" />}
          onClick={() => onModeChange(mode === 'area' ? 'none' : 'area')}
        />
        <ModeButton
          active={mode === 'measure'}
          label="Measure"
          icon={<Ruler className="w-4 h-4" />}
          onClick={() => onModeChange(mode === 'measure' ? 'none' : 'measure')}
        />
      </div>

      {selectedFacility && (
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-2 space-y-2">
          <div className="text-xs font-semibold text-gray-200 truncate" title={selectedFacility.name}>
            Selected: {selectedFacility.name}
          </div>
          <div className="text-[11px] text-gray-500 truncate" title={`${selectedFacility.operator || ''} ${selectedFacility.city || ''} ${selectedFacility.state || ''}`}>
            {(selectedFacility.operator || 'Unknown') +
              (selectedFacility.city || selectedFacility.state ? ` • ${selectedFacility.city || ''}${selectedFacility.city && selectedFacility.state ? ', ' : ''}${selectedFacility.state || ''}` : '') +
              (selectedFacility.status ? ` • ${selectedFacility.status}` : '')}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onZoomSelectedFacility}
              className="px-2 py-1 rounded text-[11px] border border-gray-800 bg-gray-900 text-gray-200 hover:bg-gray-800"
              title="Zoom satellite map to this facility"
            >
              Zoom satellite
            </button>
            <button
              type="button"
              onClick={onOpenSelectedFacilityMap}
              className="px-2 py-1 rounded text-[11px] border border-gray-800 bg-gray-900 text-gray-200 hover:bg-gray-800"
              title="Open imagery/map pane for this facility"
            >
              Imagery
            </button>
            <button
              type="button"
              onClick={onOpenSelectedFacilityStreetView}
              className="px-2 py-1 rounded text-[11px] border border-gray-800 bg-gray-900 text-gray-200 hover:bg-gray-800"
              title="Open Street View pane for this facility"
            >
              Street View
            </button>
            <button
              type="button"
              onClick={onOpenConstructionProgress}
              className="px-2 py-1 rounded text-[11px] border border-cyan-500/50 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
              title="Open near-real-time construction imagery timeline"
            >
              Construction
            </button>
            <button
              type="button"
              onClick={onSnapSelectedFacility}
              className="px-2 py-1 rounded text-[11px] border border-cyan-500/50 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20"
              title="Create a waypoint at the selected facility"
            >
              Snap waypoint
            </button>
          </div>
          <div className="text-[11px] text-gray-500 font-mono truncate" title={`${selectedFacility.lat}, ${selectedFacility.lng}`}>
            {selectedFacility.lat.toFixed(6)}, {selectedFacility.lng.toFixed(6)}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-2">
          <div className="text-gray-500 flex items-center gap-2">
            <Crosshair className="w-3.5 h-3.5 text-cyan-400" />
            Cursor
          </div>
          <div className="text-gray-100 font-mono mt-1 truncate" title={cursorText}>
            {cursorText}
          </div>
        </div>
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-2">
          <div className="text-gray-500">Draft</div>
          <div className="text-gray-100 mt-1">
            <span className="font-mono">{draft.vertices}</span> pts •{' '}
            <span className="font-mono">{formatDistance(draft.lengthMeters)}</span>
            {draft.areaMeters2 > 0 && (
              <>
                {' '}
                • <span className="font-mono">{formatArea(draft.areaMeters2)}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-center">
          <div className="text-cyan-400 font-bold">{points.length.toLocaleString()}</div>
          <div className="text-gray-500">Points</div>
        </div>
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-center">
          <div className="text-cyan-400 font-bold">{routesCount.toLocaleString()}</div>
          <div className="text-gray-500">Routes</div>
        </div>
        <div className="bg-gray-950 border border-gray-800 rounded-lg p-2 text-center">
          <div className="text-cyan-400 font-bold">{areasCount.toLocaleString()}</div>
          <div className="text-gray-500">Areas</div>
        </div>
      </div>

      <div className="text-xs text-gray-400">
        Tip: while drawing, <span className="text-gray-200 font-semibold">double-click</span> to finish a route/area.
      </div>

      <div className="border-t border-gray-800 pt-2">
        <div className="text-xs font-semibold text-gray-200 mb-2">Waypoints</div>
        <div
          ref={parentRef}
          className="max-h-56 overflow-auto rounded-lg border border-gray-800 bg-gray-950"
        >
          <div
            style={{
              height: `${virtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {virtualizer.getVirtualItems().map((vi) => {
              const p = points[vi.index];
              return (
                <div
                  key={p.__id}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${vi.start}px)`,
                    padding: '6px',
                  }}
                >
                  <PointRow point={p} onRename={onRenamePoint} onDelete={onDeletePoint} onZoom={onZoomPoint} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
});

export function attachIdsToPoints(points: ATAKPoint[]): (ATAKPoint & { __id: string })[] {
  return points.map((p, idx) => {
    const id =
      String((p as any)?.metadata?.uid || (p as any)?.metadata?.facilityId || '') ||
      `${p.lat.toFixed(6)}:${p.lon.toFixed(6)}:${idx}`;
    return { ...(p as any), __id: id };
  });
}

export function stripIdsFromPoints(points: (ATAKPoint & { __id: string })[]): ATAKPoint[] {
  return points.map(({ __id: _id, ...rest }) => rest);
}


