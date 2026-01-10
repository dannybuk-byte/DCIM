import { ReactNode, useRef, useState, useEffect } from 'react';
import { ChevronDown, ChevronUp, Maximize2, Minimize2 } from 'lucide-react';

interface ScrollablePanelProps {
  children: ReactNode;
  title?: string;
  maxHeight?: number | string;
  className?: string;
  showScrollIndicators?: boolean;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  expandable?: boolean;
  onExpand?: () => void;
}

/**
 * ScrollablePanel - A container with enhanced scrolling and optional collapsibility
 * Use this for any content area that needs reliable scrolling with visual feedback
 */
export function ScrollablePanel({
  children,
  title,
  maxHeight = 'calc(100vh - 200px)',
  className = '',
  showScrollIndicators = true,
  collapsible = false,
  defaultCollapsed = false,
  expandable = false,
  onExpand,
}: ScrollablePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollUp, setCanScrollUp] = useState(false);
  const [canScrollDown, setCanScrollDown] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    
    setCanScrollUp(el.scrollTop > 10);
    setCanScrollDown(el.scrollTop < el.scrollHeight - el.clientHeight - 10);
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    checkScroll();
    el.addEventListener('scroll', checkScroll, { passive: true });
    
    // Also check on resize
    const resizeObserver = new ResizeObserver(checkScroll);
    resizeObserver.observe(el);

    return () => {
      el.removeEventListener('scroll', checkScroll);
      resizeObserver.disconnect();
    };
  }, [isCollapsed]);

  const scrollToTop = () => {
    scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (el) {
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Header with title and controls */}
      {(title || collapsible || expandable) && (
        <div className="flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 sticky top-0 z-10">
          {title && (
            <h3 className="text-sm font-medium text-white">{title}</h3>
          )}
          <div className="flex items-center gap-1">
            {expandable && (
              <button
                onClick={onExpand}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title="Expand"
              >
                <Maximize2 className="w-4 h-4 text-gray-400" />
              </button>
            )}
            {collapsible && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1 hover:bg-gray-700 rounded transition-colors"
                title={isCollapsed ? 'Expand' : 'Collapse'}
              >
                {isCollapsed ? (
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                ) : (
                  <ChevronUp className="w-4 h-4 text-gray-400" />
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Scroll content area */}
      {!isCollapsed && (
        <div className="relative">
          {/* Top scroll indicator */}
          {showScrollIndicators && canScrollUp && (
            <button
              onClick={scrollToTop}
              className="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-gray-900 to-transparent z-10 flex items-center justify-center cursor-pointer hover:from-gray-800"
            >
              <ChevronUp className="w-4 h-4 text-cyan-400 animate-bounce" />
            </button>
          )}

          {/* Scrollable content */}
          <div
            ref={scrollRef}
            className="overflow-y-auto overflow-x-hidden scroll-smooth"
            style={{
              maxHeight: typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight,
              scrollBehavior: 'smooth',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
            }}
          >
            {children}
          </div>

          {/* Bottom scroll indicator */}
          {showScrollIndicators && canScrollDown && (
            <button
              onClick={scrollToBottom}
              className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-gray-900 to-transparent z-10 flex items-center justify-center cursor-pointer hover:from-gray-800"
            >
              <ChevronDown className="w-4 h-4 text-cyan-400 animate-bounce" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * CollapsibleCard - A styled card with collapsible content
 */
interface CollapsibleCardProps {
  title: string;
  icon?: ReactNode;
  badge?: string | number;
  children: ReactNode;
  defaultExpanded?: boolean;
  className?: string;
  headerClassName?: string;
  maxHeight?: number | string;
}

export function CollapsibleCard({
  title,
  icon,
  badge,
  children,
  defaultExpanded = true,
  className = '',
  headerClassName = '',
  maxHeight,
}: CollapsibleCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`bg-gray-900 border border-gray-800 rounded-lg overflow-hidden ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`w-full flex items-center justify-between px-4 py-3 bg-gray-850 hover:bg-gray-800 transition-colors ${headerClassName}`}
      >
        <div className="flex items-center gap-2">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          )}
          {icon}
          <span className="text-sm font-medium text-white">{title}</span>
        </div>
        {badge !== undefined && (
          <span className="px-2 py-0.5 bg-cyan-900/50 text-cyan-300 rounded text-xs">
            {badge}
          </span>
        )}
      </button>
      
      {isExpanded && (
        <div 
          className="overflow-y-auto"
          style={{
            maxHeight: maxHeight ? (typeof maxHeight === 'number' ? `${maxHeight}px` : maxHeight) : undefined,
          }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * ToggleGroup - Group of toggle buttons for quick filtering
 */
interface ToggleOption {
  id: string;
  label: string;
  icon?: ReactNode;
  count?: number;
}

interface ToggleGroupProps {
  options: ToggleOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  multiple?: boolean;
  className?: string;
}

export function ToggleGroup({
  options,
  selected,
  onChange,
  multiple = true,
  className = '',
}: ToggleGroupProps) {
  const handleToggle = (id: string) => {
    if (multiple) {
      if (selected.includes(id)) {
        onChange(selected.filter(s => s !== id));
      } else {
        onChange([...selected, id]);
      }
    } else {
      onChange([id]);
    }
  };

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {options.map(option => (
        <button
          key={option.id}
          onClick={() => handleToggle(option.id)}
          className={`
            px-2 py-1 rounded text-xs font-medium transition-all
            flex items-center gap-1
            ${selected.includes(option.id)
              ? 'bg-cyan-600 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-300'
            }
          `}
        >
          {option.icon}
          <span>{option.label}</span>
          {option.count !== undefined && (
            <span className={`
              px-1 py-0.5 rounded text-[10px]
              ${selected.includes(option.id)
                ? 'bg-cyan-700 text-cyan-200'
                : 'bg-gray-700 text-gray-500'
              }
            `}>
              {option.count}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}

/**
 * ExpandAllToggle - Button to expand/collapse all sections
 */
interface ExpandAllToggleProps {
  isAllExpanded: boolean;
  onToggle: () => void;
  label?: string;
  className?: string;
}

export function ExpandAllToggle({
  isAllExpanded,
  onToggle,
  label = 'All',
  className = '',
}: ExpandAllToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-1 px-2 py-1 rounded text-xs
        bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white
        transition-colors ${className}
      `}
    >
      {isAllExpanded ? (
        <>
          <Minimize2 className="w-3 h-3" />
          <span>Collapse {label}</span>
        </>
      ) : (
        <>
          <Maximize2 className="w-3 h-3" />
          <span>Expand {label}</span>
        </>
      )}
    </button>
  );
}
