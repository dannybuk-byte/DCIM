import { useState, ReactNode, startTransition } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useDensity } from '../../contexts/DensityContext';

interface ExpandableSectionProps {
  title: string | ReactNode;
  children: ReactNode;
  defaultExpanded?: boolean;
  level?: number;
  className?: string;
  headerClassName?: string;
  onExpand?: (expanded: boolean) => void;
  badge?: string | number;
  icon?: ReactNode;
  /** Additional metrics to show inline in the header */
  metrics?: { label: string; value: string | number; color?: string }[];
}

export function ExpandableSection({
  title,
  children,
  defaultExpanded = false,
  level = 0,
  className = '',
  headerClassName = '',
  onExpand,
  badge,
  icon,
  metrics,
}: ExpandableSectionProps) {
  const { tokens, cn } = useDensity();
  
  // Each instance maintains its own independent state
  // Use a function initializer to ensure state is only set once on mount
  const [isExpanded, setIsExpanded] = useState(() => defaultExpanded);

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    // Use startTransition to make expansion non-blocking (Pattern 11)
    startTransition(() => {
      setIsExpanded(newExpanded);
    });
    // Callback immediately for UI feedback
    onExpand?.(newExpanded);
  };

  const paddingLeft = level * 12; // Tighter indent per level for deep nesting
  const borderColor = level === 0 ? 'border-gray-700' : level === 1 ? 'border-gray-800' : 'border-gray-900';
  const bgColor = level === 0 ? 'bg-gray-800' : level === 1 ? 'bg-gray-850' : 'bg-gray-900';

  return (
    <div className={cn('border', borderColor, tokens.roundedLg, 'overflow-hidden', className)}>
      <button
        onClick={handleToggle}
        className={cn(
          'w-full flex items-center justify-between', 
          tokens.px3, 
          tokens.py2, 
          bgColor, 
          'hover:bg-gray-700 transition-colors text-left flex-shrink-0',
          headerClassName
        )}
        style={{ paddingLeft: `${paddingLeft + 12}px` }}
      >
        <div className={cn('flex items-center flex-1 min-w-0', tokens.gap2)}>
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className={cn('flex-1 truncate text-white', tokens.textBase)}>{title}</span>
          
          {/* Inline metrics for data density */}
          {metrics && metrics.length > 0 && (
            <div className={cn('flex items-center flex-shrink-0', tokens.gap1)}>
              {metrics.map((m, i) => (
                <span
                  key={i}
                  className={cn(
                    tokens.textXs,
                    tokens.px1,
                    'py-0.5',
                    tokens.rounded,
                    'bg-gray-700/50 border border-gray-600/50'
                  )}
                  style={{ color: m.color || '#8b9dc3' }}
                  title={m.label}
                >
                  {m.value}
                </span>
              ))}
            </div>
          )}
          
          {badge !== undefined && (
            <span className={cn('ml-2 px-2 py-0.5 bg-blue-900 text-blue-200 rounded', tokens.textXs, 'flex-shrink-0')}>
              {badge}
            </span>
          )}
        </div>
      </button>
      {isExpanded && (
        <div className={cn(bgColor, 'border-t', borderColor)} style={{ paddingLeft: `${paddingLeft}px` }}>
          {children || (
            <div className={cn(tokens.px4, tokens.py3, tokens.textSm, 'text-gray-400')}>No additional details available</div>
          )}
        </div>
      )}
    </div>
  );
}
