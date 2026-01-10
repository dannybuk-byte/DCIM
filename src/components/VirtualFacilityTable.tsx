/**
 * VirtualFacilityTable Component
 * 
 * High-performance virtual scrolling table for 11,992+ facilities.
 * Uses react-window for efficient rendering of large datasets.
 * 
 * Only renders visible rows, dramatically reducing DOM nodes
 * and improving scroll performance.
 */

import React, { memo, useMemo, useCallback } from 'react';
import { FixedSizeList as List, ListChildComponentProps } from 'react-window';
import { 
  ChevronRight, AlertTriangle, CheckCircle2, 
  AlertCircle, Building2, MapPin, DollarSign 
} from 'lucide-react';

interface Facility {
  id: number | string;
  name: string;
  operator?: string;
  state?: string;
  city?: string;
  country?: string;
  status: string;
  subsidyGap?: number;
  type?: string;
}

interface Props {
  facilities: Facility[];
  onSelect: (f: Facility) => void;
  selectedId?: number | string;
  height?: number;
  rowHeight?: number;
  showHeader?: boolean;
}

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'Non-Compliant':
      return {
        bg: 'bg-red-50 dark:bg-red-900/20',
        text: 'text-red-600 dark:text-red-400',
        icon: AlertTriangle,
      };
    case 'Compliant':
      return {
        bg: 'bg-emerald-50 dark:bg-emerald-900/20',
        text: 'text-emerald-600 dark:text-emerald-400',
        icon: CheckCircle2,
      };
    case 'At Risk':
    case 'Unknown':
      return {
        bg: 'bg-amber-50 dark:bg-amber-900/20',
        text: 'text-amber-600 dark:text-amber-400',
        icon: AlertCircle,
      };
    default:
      return {
        bg: 'bg-slate-50 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
        icon: Building2,
      };
  }
};

const formatGap = (gap: number | undefined): string => {
  if (!gap || gap === 0) return '—';
  if (gap >= 1e9) return `$${(gap / 1e9).toFixed(2)}B`;
  if (gap >= 1e6) return `$${(gap / 1e6).toFixed(1)}M`;
  if (gap >= 1e3) return `$${(gap / 1e3).toFixed(0)}K`;
  return `$${gap.toLocaleString()}`;
};

// Memoized row component for optimal performance
const FacilityRow = memo<ListChildComponentProps<{
  facilities: Facility[];
  onSelect: (f: Facility) => void;
  selectedId?: number | string;
}>>(({ index, style, data }) => {
  const { facilities, onSelect, selectedId } = data;
  const facility = facilities[index];
  
  if (!facility) return null;
  
  const statusStyle = getStatusStyle(facility.status);
  const StatusIcon = statusStyle.icon;
  const isSelected = facility.id === selectedId;
  
  return (
    <div
      style={style}
      onClick={() => onSelect(facility)}
      className={`
        flex items-center px-4 border-b border-slate-100 dark:border-slate-800 
        cursor-pointer transition-colors group
        ${isSelected 
          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-l-2 border-l-indigo-500' 
          : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
        }
      `}
    >
      {/* Expand indicator */}
      <ChevronRight 
        size={14} 
        className={`
          mr-2 text-slate-400 transition-transform flex-shrink-0
          ${isSelected ? 'rotate-90 text-indigo-500' : 'group-hover:text-slate-600'}
        `}
      />
      
      {/* Facility info */}
      <div className="flex-1 min-w-0 pr-4">
        <div className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
          {facility.name}
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">{facility.operator || 'Unknown Operator'}</span>
          <span className="text-slate-300">•</span>
          <span className="flex items-center gap-1 truncate">
            <MapPin size={10} />
            {facility.city ? `${facility.city}, ` : ''}{facility.state || facility.country || 'Unknown'}
          </span>
        </div>
      </div>
      
      {/* Status badge */}
      <div className={`
        flex items-center gap-1 px-2 py-1 rounded text-xs font-medium
        ${statusStyle.bg} ${statusStyle.text}
      `}>
        <StatusIcon size={12} />
        <span className="hidden sm:inline">{facility.status}</span>
      </div>
      
      {/* Subsidy gap */}
      <div className="w-20 text-right ml-4">
        <span className={`text-sm font-medium ${
          (facility.subsidyGap || 0) > 0 ? 'text-red-500' : 'text-slate-400'
        }`}>
          {formatGap(facility.subsidyGap)}
        </span>
      </div>
    </div>
  );
});

FacilityRow.displayName = 'FacilityRow';

export const VirtualFacilityTable: React.FC<Props> = ({
  facilities,
  onSelect,
  selectedId,
  height = 500,
  rowHeight = 56,
  showHeader = true,
}) => {
  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    facilities,
    onSelect,
    selectedId,
  }), [facilities, onSelect, selectedId]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!facilities.length) return;
    
    const currentIndex = selectedId 
      ? facilities.findIndex(f => f.id === selectedId) 
      : -1;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = Math.min(currentIndex + 1, facilities.length - 1);
      onSelect(facilities[nextIndex]);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = Math.max(currentIndex - 1, 0);
      onSelect(facilities[prevIndex]);
    } else if (e.key === 'Enter' && currentIndex >= 0) {
      onSelect(facilities[currentIndex]);
    }
  }, [facilities, selectedId, onSelect]);

  if (facilities.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-12 text-center">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">
          No facilities found
        </h3>
        <p className="text-sm text-slate-500">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div 
      className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      {showHeader && (
        <div className="flex items-center px-4 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
          <div className="w-6" /> {/* Spacer for chevron */}
          <div className="flex-1">Facility</div>
          <div className="w-24 text-center">Status</div>
          <div className="w-20 text-right flex items-center justify-end gap-1">
            <DollarSign size={10} />
            Gap
          </div>
        </div>
      )}
      
      {/* Virtualized list */}
      <List
        height={height}
        itemCount={facilities.length}
        itemSize={rowHeight}
        width="100%"
        itemData={itemData}
        overscanCount={5} // Render 5 extra items for smooth scrolling
      >
        {FacilityRow}
      </List>
      
      {/* Footer with count */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-50 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {facilities.length.toLocaleString()} facilities
        </span>
        <span className="text-xs text-slate-400 dark:text-slate-500">
          ↑↓ to navigate • Enter to select
        </span>
      </div>
    </div>
  );
};

export default VirtualFacilityTable;

