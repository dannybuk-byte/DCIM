/**
 * DensityToggle – UI control for switching between density modes
 * 
 * Can be placed in Settings or as a floating control.
 */

import React, { memo } from 'react';
import { Columns, LayoutGrid, Maximize } from 'lucide-react';
import { useDensity, DensityMode } from '../../contexts/DensityContext';

interface DensityToggleProps {
  className?: string;
  showLabel?: boolean;
}

export const DensityToggle: React.FC<DensityToggleProps> = memo(function DensityToggle({
  className = '',
  showLabel = true,
}) {
  const { density, setDensity, tokens, cn } = useDensity();

  const options: { mode: DensityMode; icon: typeof Columns; label: string; description: string }[] = [
    { mode: 'compact', icon: Columns, label: 'Compact', description: 'Maximum data density' },
    { mode: 'comfortable', icon: LayoutGrid, label: 'Comfortable', description: 'Balanced spacing' },
    { mode: 'spacious', icon: Maximize, label: 'Spacious', description: 'More breathing room' },
  ];

  return (
    <div className={cn('flex flex-col', tokens.gap2, className)}>
      {showLabel && (
        <div className={cn(tokens.textSm, 'text-slate-400 font-medium')}>
          UI Density
        </div>
      )}
      <div className={cn('flex items-center', tokens.gap1, 'bg-slate-800 p-1 rounded-lg')}>
        {options.map(({ mode, icon: Icon, label, description }) => (
          <button
            key={mode}
            onClick={() => setDensity(mode)}
            className={cn(
              'flex items-center transition-all',
              tokens.gap1,
              tokens.px2,
              tokens.py1,
              tokens.rounded,
              density === mode
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/50'
                : 'text-slate-400 hover:text-white hover:bg-slate-700 border border-transparent'
            )}
            title={description}
          >
            <Icon className="w-4 h-4" />
            <span className={tokens.textSm}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
});

// Compact inline version for toolbars
export const DensityToggleInline: React.FC<{ className?: string }> = memo(function DensityToggleInline({
  className = '',
}) {
  const { density, setDensity, tokens, cn } = useDensity();

  const icons: Record<DensityMode, typeof Columns> = {
    compact: Columns,
    comfortable: LayoutGrid,
    spacious: Maximize,
  };

  const next: Record<DensityMode, DensityMode> = {
    compact: 'comfortable',
    comfortable: 'spacious',
    spacious: 'compact',
  };

  const Icon = icons[density];

  return (
    <button
      onClick={() => setDensity(next[density])}
      className={cn(
        'flex items-center bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors',
        tokens.gap1,
        tokens.px2,
        tokens.py1,
        tokens.rounded,
        className
      )}
      title={`Density: ${density} (click to cycle)`}
    >
      <Icon className="w-4 h-4 text-cyan-400" />
      <span className={cn(tokens.textXs, 'text-slate-300 capitalize')}>{density}</span>
    </button>
  );
});

export default DensityToggle;

