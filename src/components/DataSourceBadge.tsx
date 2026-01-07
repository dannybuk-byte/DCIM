/**
 * Data Source Badge Component
 * 
 * Shows the verification level and source of data in the UI.
 * Helps users understand what data they can cite vs what's research-based.
 */

import React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  FlaskConical,
  ExternalLink,
  Info
} from 'lucide-react';

export type DataVerificationLevel = 
  | 'verified'      // 100% citable - from GJF, state audits, SEC
  | 'research'      // Based on real operator data, but not individually verified
  | 'calculated'    // Derived from verified data
  | 'estimated'     // Estimated based on patterns
  | 'synthetic'     // Demo/placeholder data
  | 'live-api';     // Real-time from government API

export interface DataSourceBadgeProps {
  level: DataVerificationLevel;
  source?: string;
  sourceUrl?: string;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  tooltip?: string;
}

const LEVEL_CONFIG: Record<DataVerificationLevel, {
  icon: React.ReactNode;
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  description: string;
}> = {
  'verified': {
    icon: <CheckCircle2 size={12} />,
    label: 'Verified',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
    description: '100% citable - from official government sources',
  },
  'research': {
    icon: <Database size={12} />,
    label: 'Research',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
    description: 'Based on verified industry research and operator data',
  },
  'calculated': {
    icon: <FlaskConical size={12} />,
    label: 'Calculated',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-200',
    description: 'Derived from verified data using standard formulas',
  },
  'estimated': {
    icon: <Info size={12} />,
    label: 'Estimated',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-700',
    borderColor: 'border-amber-200',
    description: 'Estimated based on industry patterns - verify before citing',
  },
  'synthetic': {
    icon: <AlertTriangle size={12} />,
    label: 'Demo',
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
    description: 'Placeholder data for demonstration - NOT citable',
  },
  'live-api': {
    icon: <Database size={12} />,
    label: 'Live',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-200',
    description: 'Real-time data from government API',
  },
};

export const DataSourceBadge: React.FC<DataSourceBadgeProps> = ({
  level,
  source,
  sourceUrl,
  size = 'sm',
  showLabel = true,
  tooltip,
}) => {
  const config = LEVEL_CONFIG[level];
  
  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs gap-1',
    md: 'px-2 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-base gap-2',
  };
  
  const Badge = (
    <span
      className={`
        inline-flex items-center rounded-full border font-medium
        ${config.bgColor} ${config.textColor} ${config.borderColor}
        ${sizeClasses[size]}
      `}
      title={tooltip || config.description}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
      {sourceUrl && (
        <ExternalLink size={10} className="ml-0.5 opacity-60" />
      )}
    </span>
  );
  
  if (sourceUrl) {
    return (
      <a 
        href={sourceUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="hover:opacity-80 transition-opacity"
      >
        {Badge}
      </a>
    );
  }
  
  return Badge;
};

/**
 * Data Source Summary - Shows a row of badges for a facility
 */
export interface DataSourceSummaryProps {
  facilityId: string;
  hasVerifiedSubsidy?: boolean;
  hasStateAudit?: boolean;
  hasNLRBCases?: boolean;
  hasOSHAData?: boolean;
  hasEPAData?: boolean;
}

export const DataSourceSummary: React.FC<DataSourceSummaryProps> = ({
  hasVerifiedSubsidy,
  hasStateAudit,
  hasNLRBCases,
  hasOSHAData,
  hasEPAData,
}) => {
  const sources = [];
  
  if (hasVerifiedSubsidy) {
    sources.push({ level: 'verified' as const, label: 'GJF Subsidy' });
  }
  if (hasStateAudit) {
    sources.push({ level: 'verified' as const, label: 'State Audit' });
  }
  if (hasNLRBCases) {
    sources.push({ level: 'live-api' as const, label: 'NLRB' });
  }
  if (hasOSHAData) {
    sources.push({ level: 'live-api' as const, label: 'OSHA' });
  }
  if (hasEPAData) {
    sources.push({ level: 'live-api' as const, label: 'EPA' });
  }
  
  if (sources.length === 0) {
    return (
      <DataSourceBadge 
        level="research" 
        tooltip="Based on industry research. Operator and location are verified, compliance status is research-based."
      />
    );
  }
  
  return (
    <div className="flex flex-wrap gap-1">
      {sources.map((source, idx) => (
        <DataSourceBadge 
          key={idx}
          level={source.level}
          tooltip={source.label}
          showLabel={false}
        />
      ))}
    </div>
  );
};

/**
 * Data Verification Legend - Shows what each badge means
 */
export const DataVerificationLegend: React.FC<{ compact?: boolean }> = ({ compact }) => {
  const levels: DataVerificationLevel[] = compact 
    ? ['verified', 'research', 'synthetic']
    : ['verified', 'live-api', 'research', 'calculated', 'estimated', 'synthetic'];
  
  return (
    <div className={`${compact ? 'flex flex-wrap gap-3' : 'space-y-2'}`}>
      {levels.map(level => {
        const config = LEVEL_CONFIG[level];
        return (
          <div key={level} className={compact ? 'flex items-center gap-1' : 'flex items-start gap-2'}>
            <DataSourceBadge level={level} showLabel={true} size={compact ? 'sm' : 'md'} />
            {!compact && (
              <span className="text-xs text-slate-600">{config.description}</span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default DataSourceBadge;

