/**
 * ATAK (Android Team Awareness Kit) Style Overlay Component
 * Provides military-style tactical awareness visualization
 */

import { memo, useMemo } from 'react';
import { MapPin, Users, Shield, AlertTriangle, Radio, Target, Eye, Navigation } from 'lucide-react';
import { ATAKPoint, ATAKRoute, ATAKArea, atakToGeoJSON } from '../../utils/atakFormats';

export interface ATAKOverlayProps {
  points?: ATAKPoint[];
  routes?: ATAKRoute[];
  areas?: ATAKArea[];
  showLabels?: boolean;
  showGrid?: boolean;
  showCompass?: boolean;
  opacity?: number;
}

/**
 * Get ATAK-style icon for point status
 */
function getATAKIcon(status?: string, role?: string) {
  switch (status) {
    case 'friendly':
      return <Shield className="w-4 h-4 text-green-400" />;
    case 'hostile':
      return <AlertTriangle className="w-4 h-4 text-red-400" />;
    case 'neutral':
      return <MapPin className="w-4 h-4 text-yellow-400" />;
    default:
      return <MapPin className="w-4 h-4 text-gray-400" />;
  }
}

/**
 * Get color for status
 */
function getStatusColor(status?: string): string {
  switch (status) {
    case 'friendly':
      return '#00ff00'; // Green
    case 'hostile':
      return '#ff0000'; // Red
    case 'neutral':
      return '#ffff00'; // Yellow
    default:
      return '#808080'; // Gray
  }
}

export const ATAKOverlay = memo(function ATAKOverlay({
  points = [],
  routes = [],
  areas = [],
  showLabels = true,
  showGrid = false,
  showCompass = true,
  opacity = 0.8
}: ATAKOverlayProps) {
  const geoJson = useMemo(() => {
    return atakToGeoJSON(points, routes, areas);
  }, [points, routes, areas]);

  return (
    <div className="absolute inset-0 pointer-events-none z-30">
      {/* Grid Overlay */}
      {showGrid && (
        <div className="absolute inset-0 opacity-20">
          <svg className="w-full h-full">
            <defs>
              <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#00ff00" strokeWidth="1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>
      )}

      {/* Compass Rose */}
      {showCompass && (
        <div className="absolute top-4 right-4 bg-gray-900/90 border border-green-500 rounded-lg p-3">
          <div className="relative w-16 h-16">
            <Navigation className="w-16 h-16 text-green-400" style={{ transform: 'rotate(0deg)' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-xs font-bold text-green-400">N</span>
            </div>
          </div>
        </div>
      )}

      {/* Legend */}
      {(points.length > 0 || routes.length > 0 || areas.length > 0) && (
        <div className="absolute bottom-4 left-4 bg-gray-900/90 border border-green-500 rounded-lg p-3 text-xs">
          <div className="font-semibold text-green-400 mb-2">ATAK Overlay</div>
          <div className="space-y-1 text-gray-300">
            {points.length > 0 && (
              <div className="flex items-center gap-2">
                <MapPin className="w-3 h-3 text-green-400" />
                <span>{points.length} Points</span>
              </div>
            )}
            {routes.length > 0 && (
              <div className="flex items-center gap-2">
                <Navigation className="w-3 h-3 text-cyan-400" />
                <span>{routes.length} Routes</span>
              </div>
            )}
            {areas.length > 0 && (
              <div className="flex items-center gap-2">
                <Target className="w-3 h-3 text-yellow-400" />
                <span>{areas.length} Areas</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

/**
 * ATAK Control Panel
 */
export interface ATAKControlPanelProps {
  points: ATAKPoint[];
  routes: ATAKRoute[];
  areas: ATAKArea[];
  onToggleGrid: () => void;
  onToggleCompass: () => void;
  onToggleLabels: () => void;
  showGrid: boolean;
  showCompass: boolean;
  showLabels: boolean;
  onImportKML?: (file: File) => void;
  onImportGPX?: (file: File) => void;
  onImportCoT?: (file: File) => void;
  onExport?: () => void;
}

export const ATAKControlPanel = memo(function ATAKControlPanel({
  points,
  routes,
  areas,
  onToggleGrid,
  onToggleCompass,
  onToggleLabels,
  showGrid,
  showCompass,
  showLabels,
  onImportKML,
  onImportGPX,
  onImportCoT,
  onExport
}: ATAKControlPanelProps) {
  return (
    <div className="bg-gray-900/95 border border-green-500/50 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2 mb-3">
        <Shield className="w-5 h-5 text-green-400" />
        <h3 className="font-semibold text-green-400">ATAK Controls</h3>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="bg-gray-800 rounded p-2 text-center">
          <div className="text-green-400 font-bold">{points.length}</div>
          <div className="text-gray-400">Points</div>
        </div>
        <div className="bg-gray-800 rounded p-2 text-center">
          <div className="text-cyan-400 font-bold">{routes.length}</div>
          <div className="text-gray-400">Routes</div>
        </div>
        <div className="bg-gray-800 rounded p-2 text-center">
          <div className="text-yellow-400 font-bold">{areas.length}</div>
          <div className="text-gray-400">Areas</div>
        </div>
      </div>

      {/* Toggles */}
      <div className="space-y-2">
        <button
          onClick={onToggleGrid}
          className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors ${
            showGrid
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Grid Overlay</span>
            <Eye className={`w-4 h-4 ${showGrid ? 'text-green-400' : 'text-gray-500'}`} />
          </div>
        </button>

        <button
          onClick={onToggleCompass}
          className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors ${
            showCompass
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Compass Rose</span>
            <Navigation className={`w-4 h-4 ${showCompass ? 'text-green-400' : 'text-gray-500'}`} />
          </div>
        </button>

        <button
          onClick={onToggleLabels}
          className={`w-full px-3 py-2 rounded text-xs font-medium transition-colors ${
            showLabels
              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
              : 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span>Labels</span>
            <Eye className={`w-4 h-4 ${showLabels ? 'text-green-400' : 'text-gray-500'}`} />
          </div>
        </button>
      </div>

      {/* Import/Export */}
      <div className="pt-2 border-t border-gray-700 space-y-2">
        <div className="text-xs text-gray-400 mb-1">Import</div>
        <div className="flex gap-2">
          <label className="flex-1">
            <input
              type="file"
              accept=".kml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onImportKML) onImportKML(file);
                // allow re-importing the same file name
                e.currentTarget.value = '';
              }}
            />
            <div className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-center cursor-pointer border border-gray-700">
              KML
            </div>
          </label>
          <label className="flex-1">
            <input
              type="file"
              accept=".gpx"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onImportGPX) onImportGPX(file);
                e.currentTarget.value = '';
              }}
            />
            <div className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-center cursor-pointer border border-gray-700">
              GPX
            </div>
          </label>
          <label className="flex-1">
            <input
              type="file"
              accept=".cot,.xml"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file && onImportCoT) onImportCoT(file);
                e.currentTarget.value = '';
              }}
            />
            <div className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded text-xs text-center cursor-pointer border border-gray-700">
              CoT
            </div>
          </label>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="w-full px-3 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded text-xs font-medium border border-green-500/50"
          >
            Export Data
          </button>
        )}
      </div>
    </div>
  );
});

