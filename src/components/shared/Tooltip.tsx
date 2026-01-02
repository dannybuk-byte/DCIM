import { useState, ReactNode } from 'react';
import { Info } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export function Tooltip({ content, children, position = 'top', className = '' }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  // Static class maps - no dynamic generation (Rule 1)
  const positionClasses: Record<string, string> = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children || (
        <Info className="w-4 h-4 text-gray-400 hover:text-gray-300 cursor-help" />
      )}
      {isVisible && (
        <div
          className={`absolute z-50 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg border border-gray-700 max-w-xs ${positionClasses[position]}`}
          style={{ pointerEvents: 'none' }}
        >
          {content}
          <div
            className={position === 'top' ? 'absolute w-2 h-2 bg-gray-900 border-gray-700 top-full left-1/2 transform -translate-x-1/2 border-r border-b' :
                        position === 'bottom' ? 'absolute w-2 h-2 bg-gray-900 border-gray-700 bottom-full left-1/2 transform -translate-x-1/2 border-l border-t' :
                        position === 'left' ? 'absolute w-2 h-2 bg-gray-900 border-gray-700 left-full top-1/2 transform -translate-y-1/2 border-r border-t' :
                        'absolute w-2 h-2 bg-gray-900 border-gray-700 right-full top-1/2 transform -translate-y-1/2 border-l border-b'}
            style={{
              transform: position === 'top' ? 'translate(-50%, -50%) rotate(45deg)' :
                        position === 'bottom' ? 'translate(-50%, 50%) rotate(45deg)' :
                        position === 'left' ? 'translate(-50%, -50%) rotate(45deg)' :
                        'translate(50%, -50%) rotate(45deg)'
            }}
          />
        </div>
      )}
    </div>
  );
}

// Simple inline tooltip for use with title attribute
export function SimpleTooltip({ text, children }: { text: string; children: ReactNode }) {
  return (
    <span title={text} className="cursor-help border-b border-dashed border-gray-500 hover:border-gray-400">
      {children}
    </span>
  );
}

