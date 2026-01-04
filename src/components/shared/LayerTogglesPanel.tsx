import { memo } from 'react';
import { Layers } from 'lucide-react';

export interface LayerState {
  facilities: boolean;
  connections: boolean;
  cables: boolean;
  ixp: boolean;
  heatmap: boolean;
}

interface LayerTogglesPanelProps {
  layers: LayerState;
  onChange: (layers: LayerState) => void;
}

export const LayerTogglesPanel = memo(({ layers, onChange }: LayerTogglesPanelProps) => {
  const handleToggle = (key: keyof LayerState) => {
    onChange({ ...layers, [key]: !layers[key] });
  };

  return (
    <div className="p-4 border-b border-gray-800">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold uppercase tracking-wide">Layers</h2>
      </div>
      <div className="space-y-2">
        {Object.entries(layers).map(([key, value]) => (
          <label key={key} className="flex items-center gap-2 text-sm cursor-pointer hover:text-white transition-colors">
            <input
              type="checkbox"
              checked={value}
              onChange={() => handleToggle(key as keyof LayerState)}
              className="w-4 h-4 rounded border-gray-700 bg-gray-800 text-amber-600 focus:ring-amber-600 focus:ring-offset-gray-900"
            />
            <span className="capitalize">{key}</span>
          </label>
        ))}
      </div>
    </div>
  );
});

LayerTogglesPanel.displayName = 'LayerTogglesPanel';

