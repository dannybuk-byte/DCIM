/**
 * CitationIndicator - Inline citation references for data integrity
 * 
 * A compact component that can be placed next to data points to indicate
 * their source. Hovering shows source details, clicking opens full citation.
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  FileText, 
  ExternalLink, 
  Shield, 
  Building, 
  Users, 
  Info,
  RefreshCw,
} from 'lucide-react';
import { 
  Citation, 
  getCitationById, 
  SourceCategory,
  DataFrequency,
} from '../../content/sectionCitations';

interface CitationIndicatorProps {
  /** Citation ID from sectionCitations.ts */
  sourceId: string;
  /** Optional compact mode - shows only icon */
  compact?: boolean;
  /** Optional custom label */
  label?: string;
  /** Optional className */
  className?: string;
}

/**
 * Get icon for source category
 */
const getCategoryIcon = (category: SourceCategory) => {
  switch (category) {
    case 'primary':
      return <Shield size={10} className="text-green-400" />;
    case 'secondary':
      return <Building size={10} className="text-blue-400" />;
    case 'tertiary':
      return <Users size={10} className="text-amber-400" />;
  }
};

/**
 * Get color for reliability
 */
const getReliabilityColor = (reliability: Citation['reliability']) => {
  switch (reliability) {
    case 'authoritative':
      return 'text-green-400';
    case 'verified':
      return 'text-blue-400';
    case 'peer-reviewed':
      return 'text-purple-400';
    case 'investigative':
      return 'text-amber-400';
    case 'crowd-sourced':
      return 'text-slate-400';
  }
};

/**
 * Format frequency display
 */
const formatFrequency = (frequency: DataFrequency) => {
  const formatted = frequency.replace('-', ' ');
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

/**
 * CitationIndicator component
 */
export const CitationIndicator: React.FC<CitationIndicatorProps> = ({
  sourceId,
  compact = false,
  label,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<'top' | 'bottom'>('top');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  
  const citation = getCitationById(sourceId);
  
  // Calculate tooltip position to avoid overflow
  useEffect(() => {
    if (isHovered && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceBelow = window.innerHeight - rect.bottom;
      
      // Prefer showing above, but show below if not enough space
      setTooltipPosition(spaceAbove > 200 ? 'top' : 'bottom');
    }
  }, [isHovered]);
  
  if (!citation) {
    return (
      <span 
        className={`inline-flex items-center gap-0.5 text-[10px] text-slate-500 ${className}`}
        title={`Source not found: ${sourceId}`}
      >
        <Info size={10} />
        {!compact && <span>?</span>}
      </span>
    );
  }
  
  const handleClick = () => {
    window.open(citation.url, '_blank', 'noopener,noreferrer');
  };
  
  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        onClick={handleClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[10px] transition-colors
          ${citation.category === 'primary' 
            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20' 
            : citation.category === 'secondary'
              ? 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20'
              : 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20'
          }`}
        title={`Source: ${citation.title}`}
      >
        {getCategoryIcon(citation.category)}
        {!compact && (
          <span className="max-w-[60px] truncate">
            {label || citation.publisher}
          </span>
        )}
      </button>
      
      {/* Tooltip */}
      {isHovered && (
        <div
          ref={tooltipRef}
          className={`absolute z-[10010] w-64 p-3 bg-slate-900 border border-slate-700 rounded-lg shadow-xl shadow-black/50
            ${tooltipPosition === 'top' 
              ? 'bottom-full mb-2' 
              : 'top-full mt-2'
            }
            left-0`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* Arrow */}
          <div 
            className={`absolute left-4 w-2 h-2 bg-slate-900 border-slate-700 transform rotate-45
              ${tooltipPosition === 'top' 
                ? 'bottom-0 translate-y-1/2 border-b border-r' 
                : 'top-0 -translate-y-1/2 border-t border-l'
              }`}
          />
          
          {/* Header */}
          <div className="flex items-start gap-2 mb-2">
            <FileText size={14} className="text-cyan-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white leading-tight">
                {citation.title}
              </div>
              <div className="text-[10px] text-slate-400">
                {citation.publisher}
              </div>
            </div>
          </div>
          
          {/* Description */}
          <p className="text-[10px] text-slate-300 mb-2 line-clamp-2">
            {citation.description}
          </p>
          
          {/* Badges */}
          <div className="flex items-center gap-2 mb-2">
            <span className={`text-[10px] ${getReliabilityColor(citation.reliability)}`}>
              {citation.reliability === 'authoritative' && '✓ Authoritative'}
              {citation.reliability === 'verified' && '✓ Verified'}
              {citation.reliability === 'peer-reviewed' && '✓ Peer-Reviewed'}
              {citation.reliability === 'investigative' && '◐ Investigative'}
              {citation.reliability === 'crowd-sourced' && '◯ Crowd-Sourced'}
            </span>
            <span className="flex items-center gap-0.5 text-[10px] text-slate-500">
              <RefreshCw size={8} />
              {formatFrequency(citation.dataFrequency)}
            </span>
          </div>
          
          {/* Data Types */}
          <div className="flex flex-wrap gap-1 mb-2">
            {citation.dataTypes.slice(0, 4).map((type, i) => (
              <span 
                key={i} 
                className="px-1 py-0.5 text-[9px] bg-slate-700/50 text-slate-400 rounded"
              >
                {type}
              </span>
            ))}
            {citation.dataTypes.length > 4 && (
              <span className="text-[9px] text-slate-500">
                +{citation.dataTypes.length - 4} more
              </span>
            )}
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
            <span className="text-[9px] text-slate-500">
              Verified: {citation.lastVerified}
            </span>
            <span className="flex items-center gap-0.5 text-[9px] text-cyan-400">
              Click to view
              <ExternalLink size={8} />
            </span>
          </div>
        </div>
      )}
    </span>
  );
};

/**
 * MultiCitationIndicator - Shows multiple sources
 */
interface MultiCitationIndicatorProps {
  sourceIds: string[];
  compact?: boolean;
  className?: string;
}

export const MultiCitationIndicator: React.FC<MultiCitationIndicatorProps> = ({
  sourceIds,
  compact = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  const citations = sourceIds
    .map(id => getCitationById(id))
    .filter((c): c is Citation => c !== undefined);
  
  if (citations.length === 0) return null;
  
  if (citations.length === 1) {
    return <CitationIndicator sourceId={sourceIds[0]} compact={compact} className={className} />;
  }
  
  return (
    <span className={`relative inline-flex items-center gap-1 ${className}`}>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-slate-700/50 hover:bg-slate-600/50 rounded text-[10px] text-slate-300 border border-slate-600/50 transition-colors"
      >
        <FileText size={10} />
        {citations.length} sources
      </button>
      
      {isExpanded && (
        <div className="absolute top-full mt-1 left-0 z-[10010] flex flex-col gap-1 p-1 bg-slate-800 border border-slate-700 rounded-lg shadow-lg">
          {sourceIds.map(id => (
            <CitationIndicator key={id} sourceId={id} compact={false} />
          ))}
        </div>
      )}
    </span>
  );
};

/**
 * DataSourceBadge - Compact badge showing data source reliability
 */
interface DataSourceBadgeProps {
  sourceId: string;
  className?: string;
}

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  sourceId,
  className = '',
}) => {
  const citation = getCitationById(sourceId);
  
  if (!citation) return null;
  
  const reliabilityIcons = {
    authoritative: '✓',
    verified: '✓',
    'peer-reviewed': '✓',
    investigative: '◐',
    'crowd-sourced': '◯',
  };
  
  return (
    <span 
      className={`inline-flex items-center text-[9px] ${getReliabilityColor(citation.reliability)} ${className}`}
      title={`Source: ${citation.title} (${citation.reliability})`}
    >
      {reliabilityIcons[citation.reliability]}
    </span>
  );
};

export default CitationIndicator;

