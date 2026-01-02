import { useState, ReactNode, startTransition } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

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
}: ExpandableSectionProps) {
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

  const paddingLeft = level * 16;
  const borderColor = level === 0 ? 'border-gray-700' : level === 1 ? 'border-gray-800' : 'border-gray-900';
  const bgColor = level === 0 ? 'bg-gray-800' : level === 1 ? 'bg-gray-850' : 'bg-gray-900';

  return (
    <div className={`border ${borderColor} rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={handleToggle}
        className={`w-full flex items-center justify-between px-4 py-3 ${bgColor} hover:bg-gray-700 transition-colors text-left flex-shrink-0 ${headerClassName}`}
        style={{ paddingLeft: `${paddingLeft + 16}px` }}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
          {icon && <span className="flex-shrink-0">{icon}</span>}
          <span className="flex-1 truncate">{title}</span>
          {badge !== undefined && (
            <span className="ml-2 px-2 py-0.5 bg-blue-900 text-blue-200 rounded text-xs flex-shrink-0">
              {badge}
            </span>
          )}
        </div>
      </button>
      {isExpanded && (
        <div className={`${bgColor} border-t ${borderColor}`} style={{ paddingLeft: `${paddingLeft}px` }}>
          {children || (
            <div className="p-4 text-sm text-gray-400">No additional details available</div>
          )}
        </div>
      )}
    </div>
  );
}

