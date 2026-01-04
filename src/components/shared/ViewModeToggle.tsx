export type ViewMode = '2D' | '3D' | 'Topology';

interface ViewModeToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewModeToggle({ value, onChange }: ViewModeToggleProps) {
  const modes: ViewMode[] = ['2D', '3D', 'Topology'];
  
  const tooltips: Record<ViewMode, string> = {
    '2D': '2D Map View: Traditional map display showing facility locations on a flat plane',
    '3D': '3D Globe View: Interactive 3D globe showing facilities in geographic context',
    'Topology': 'Topology View: Network diagram showing connections and relationships between facilities'
  };
  
  const handleClick = (mode: ViewMode) => {
    if (onChange) {
      onChange(mode);
    }
  };
  
  return (
    <div className="flex items-center gap-1 bg-gray-800 border border-gray-700 rounded-lg p-1 flex-shrink-0">
      {modes.map((mode) => {
        const isActive = value === mode;
        const activeClasses = isActive
          ? 'bg-amber-600 text-white'
          : 'text-gray-400 hover:text-white hover:bg-gray-700';
        
        return (
          <button
            key={mode}
            onClick={() => handleClick(mode)}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors whitespace-nowrap ${activeClasses} cursor-pointer`}
            type="button"
            title={tooltips[mode]}
          >
            {mode}
          </button>
        );
      })}
    </div>
  );
}

