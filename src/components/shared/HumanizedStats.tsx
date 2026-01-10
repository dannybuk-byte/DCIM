import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  DollarSign,
  Building2,
  Users
} from 'lucide-react';

// ============================================
// QUICK HELP TOOLTIP
// ============================================

interface QuickHelpProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const QuickHelp: React.FC<QuickHelpProps> = ({ content, position = 'top' }) => {
  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  };

  return (
    <div className="relative inline-block group">
      <button 
        className="ml-1 text-slate-400 hover:text-blue-500 transition-colors"
        aria-label="Help"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      <div className={`
        absolute ${positionClasses[position]} z-50
        px-3 py-2 bg-slate-900 text-white text-xs rounded-lg shadow-lg
        opacity-0 invisible group-hover:opacity-100 group-hover:visible
        transition-all duration-200 whitespace-nowrap max-w-xs
        pointer-events-none
      `}>
        {content}
        <div className={`
          absolute w-2 h-2 bg-slate-900 rotate-45
          ${position === 'top' ? 'top-full left-1/2 -translate-x-1/2 -mt-1' : ''}
          ${position === 'bottom' ? 'bottom-full left-1/2 -translate-x-1/2 -mb-1' : ''}
          ${position === 'left' ? 'left-full top-1/2 -translate-y-1/2 -ml-1' : ''}
          ${position === 'right' ? 'right-full top-1/2 -translate-y-1/2 -mr-1' : ''}
        `} />
      </div>
    </div>
  );
};

// ============================================
// HUMANIZED STAT CARD
// ============================================

type UrgencyLevel = 'critical' | 'warning' | 'success' | 'info' | 'neutral';
type TrendDirection = 'up' | 'down' | 'stable';

interface HumanizedStatProps {
  value: number | string;
  label: string;
  context?: string;
  helpText?: string;
  urgency?: UrgencyLevel;
  trend?: TrendDirection;
  trendValue?: string;
  icon?: React.ReactNode;
  onClick?: () => void;
  compact?: boolean;
}

const urgencyStyles: Record<UrgencyLevel, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
  critical: {
    bg: 'bg-red-50 dark:bg-red-900/20',
    border: 'border-red-200 dark:border-red-800',
    text: 'text-red-700 dark:text-red-300',
    icon: <XCircle className="w-5 h-5 text-red-500" />
  },
  warning: {
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-300',
    icon: <AlertTriangle className="w-5 h-5 text-amber-500" />
  },
  success: {
    bg: 'bg-green-50 dark:bg-green-900/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-300',
    icon: <CheckCircle2 className="w-5 h-5 text-green-500" />
  },
  info: {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-300',
    icon: <Building2 className="w-5 h-5 text-blue-500" />
  },
  neutral: {
    bg: 'bg-slate-50 dark:bg-slate-800',
    border: 'border-slate-200 dark:border-slate-700',
    text: 'text-slate-700 dark:text-slate-300',
    icon: null
  }
};

const TrendIndicator: React.FC<{ direction: TrendDirection; value?: string }> = ({ direction, value }) => {
  const icons = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingDown className="w-4 h-4" />,
    stable: <Minus className="w-4 h-4" />
  };

  const colors = {
    up: 'text-green-500',
    down: 'text-red-500',
    stable: 'text-slate-400'
  };

  return (
    <div className={`flex items-center gap-1 text-xs font-medium ${colors[direction]}`}>
      {icons[direction]}
      {value && <span>{value}</span>}
    </div>
  );
};

export const HumanizedStat: React.FC<HumanizedStatProps> = ({
  value,
  label,
  context,
  helpText,
  urgency = 'neutral',
  trend,
  trendValue,
  icon,
  onClick,
  compact = false
}) => {
  const styles = urgencyStyles[urgency];
  
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={`
        ${styles.bg} ${styles.border} border-2 rounded-xl
        ${compact ? 'p-3' : 'p-4'}
        ${onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}
        transition-all duration-200
      `}
    >
      {/* Header Row */}
      <div className="flex items-start justify-between mb-1">
        <div className="flex items-center gap-2">
          {icon || styles.icon}
          <span className={`text-xs font-medium ${styles.text} opacity-80`}>
            {label}
          </span>
          {helpText && <QuickHelp content={helpText} />}
        </div>
        {trend && <TrendIndicator direction={trend} value={trendValue} />}
      </div>

      {/* Value */}
      <div className={`font-bold ${styles.text} ${compact ? 'text-xl' : 'text-2xl'}`}>
        {value}
      </div>

      {/* Context */}
      {context && (
        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
          {context}
        </div>
      )}
    </Component>
  );
};

// ============================================
// HUMANIZED STATS BAR
// ============================================

interface StatItem {
  value: number | string;
  label: string;
  context?: string;
  helpText?: string;
  urgency?: UrgencyLevel;
}

interface HumanizedStatsBarProps {
  stats: StatItem[];
  compact?: boolean;
}

export const HumanizedStatsBar: React.FC<HumanizedStatsBarProps> = ({ stats, compact = false }) => {
  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-5' : 'grid-cols-2 md:grid-cols-3 lg:grid-cols-5'}`}>
      {stats.map((stat, index) => (
        <HumanizedStat
          key={index}
          {...stat}
          compact={compact}
        />
      ))}
    </div>
  );
};

// ============================================
// MISSION HEADER
// ============================================

interface MissionHeaderProps {
  title?: string;
  subtitle?: string;
  showPartners?: boolean;
}

const partners = [
  { name: 'Tech Workers Coalition', abbrev: 'TWC' },
  { name: 'CODE-CWA', abbrev: 'CODE-CWA' },
  { name: 'UPROSE', abbrev: 'UPROSE' },
  { name: 'IBEW', abbrev: 'IBEW' }
];

export const MissionHeader: React.FC<MissionHeaderProps> = ({
  title = 'DCIM Accountability',
  subtitle = 'Exposing Big Tech\'s Broken Promises',
  showPartners = true
}) => {
  return (
    <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-6 py-4 rounded-xl shadow-lg">
      <div className="flex items-center justify-between flex-wrap gap-4">
        {/* Mission Statement */}
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">💪</span>
            {title}
          </h1>
          <p className="text-slate-300 text-sm mt-0.5">"{subtitle}"</p>
        </div>

        {/* Partner Logos */}
        {showPartners && (
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">Supporting:</span>
            <div className="flex gap-2">
              {partners.map((partner) => (
                <div 
                  key={partner.abbrev}
                  className="px-2.5 py-1 bg-white/10 rounded-full text-xs font-medium text-slate-200 hover:bg-white/20 transition-colors cursor-default"
                  title={partner.name}
                >
                  {partner.abbrev}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// SUBSIDY GAP HERO CARD
// ============================================

interface SubsidyGapHeroProps {
  amount: number;
  violatorCount: number;
  avgSalary?: number;
}

export const SubsidyGapHero: React.FC<SubsidyGapHeroProps> = ({
  amount,
  violatorCount,
  avgSalary = 50000
}) => {
  const formatCurrency = (value: number): string => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
    return `$${value.toLocaleString()}`;
  };

  const jobsEquivalent = Math.floor(amount / avgSalary).toLocaleString();

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-6 text-white shadow-lg">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
          </pattern>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative">
        <div className="flex items-center gap-2 text-red-200 text-sm font-medium mb-2">
          <DollarSign className="w-4 h-4" />
          Total Subsidy Gap
          <QuickHelp 
            content="The difference between promised economic benefits and actual jobs delivered by Big Tech"
            position="right"
          />
        </div>

        <div className="text-4xl font-bold mb-2">
          {formatCurrency(amount)}
        </div>

        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1">
            <AlertTriangle className="w-4 h-4" />
            {violatorCount} violators tracked
          </div>
        </div>

        {/* Human Context */}
        <div className="mt-4 pt-4 border-t border-white/20">
          <div className="flex items-center gap-2 text-red-100">
            <Users className="w-4 h-4" />
            <span className="text-sm">
              = <strong>{jobsEquivalent}</strong> jobs at ${avgSalary.toLocaleString()}/year
            </span>
          </div>
        </div>
      </div>

      {/* Animated Pulse */}
      <div className="absolute top-4 right-4 w-3 h-3 bg-white rounded-full animate-pulse" />
    </div>
  );
};

// ============================================
// COMPLIANCE STATUS BADGE
// ============================================

type ComplianceStatus = 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown';

interface ComplianceBadgeProps {
  status: ComplianceStatus;
  count?: number;
  percentage?: number;
  showHelp?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig: Record<ComplianceStatus, { 
  color: string; 
  bg: string; 
  icon: React.ReactNode;
  helpText: string;
}> = {
  'Compliant': {
    color: 'text-green-700 dark:text-green-300',
    bg: 'bg-green-100 dark:bg-green-900/30',
    icon: <CheckCircle2 className="w-4 h-4" />,
    helpText: 'Meeting their job creation promises'
  },
  'Non-Compliant': {
    color: 'text-red-700 dark:text-red-300',
    bg: 'bg-red-100 dark:bg-red-900/30',
    icon: <XCircle className="w-4 h-4" />,
    helpText: 'BREAKING their promises - target these in campaigns'
  },
  'At Risk': {
    color: 'text-amber-700 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    icon: <AlertTriangle className="w-4 h-4" />,
    helpText: 'At risk of missing targets - watch closely'
  },
  'Unknown': {
    color: 'text-slate-700 dark:text-slate-300',
    bg: 'bg-slate-100 dark:bg-slate-700',
    icon: <HelpCircle className="w-4 h-4" />,
    helpText: 'Insufficient data to determine compliance'
  }
};

export const ComplianceBadge: React.FC<ComplianceBadgeProps> = ({
  status,
  count,
  percentage,
  showHelp = false,
  size = 'md'
}) => {
  const config = statusConfig[status];
  
  const sizeClasses = {
    sm: 'text-xs px-2 py-1',
    md: 'text-sm px-3 py-1.5',
    lg: 'text-base px-4 py-2'
  };

  return (
    <div className={`
      inline-flex items-center gap-2 rounded-full font-medium
      ${config.bg} ${config.color} ${sizeClasses[size]}
    `}>
      {config.icon}
      <span>{status}</span>
      {count !== undefined && (
        <span className="font-bold">{count.toLocaleString()}</span>
      )}
      {percentage !== undefined && (
        <span className="opacity-70">({percentage}%)</span>
      )}
      {showHelp && <QuickHelp content={config.helpText} />}
    </div>
  );
};

export default {
  QuickHelp,
  HumanizedStat,
  HumanizedStatsBar,
  MissionHeader,
  SubsidyGapHero,
  ComplianceBadge
};

