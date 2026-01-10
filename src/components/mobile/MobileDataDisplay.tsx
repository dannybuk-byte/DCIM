import React, { useState, useCallback, useMemo } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MapPin,
  Building2,
  DollarSign,
  Users,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Filter,
  SortAsc,
  Search,
  ExternalLink,
  ChevronRight,
} from 'lucide-react';

// Types
interface FacilityCardData {
  id: string | number;
  name: string;
  operator: string;
  location: string;
  state: string;
  complianceStatus: 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown';
  subsidyGap?: number;
  jobsPromised?: number;
  jobsCreated?: number;
  type?: string;
}

// Mobile Facility Card - Touch-friendly card view
interface MobileFacilityCardProps {
  facility: FacilityCardData;
  onTap?: (facility: FacilityCardData) => void;
  expanded?: boolean;
}

export const MobileFacilityCard: React.FC<MobileFacilityCardProps> = ({
  facility,
  onTap,
  expanded: initialExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(initialExpanded);

  const statusConfig = useMemo(() => {
    const configs: Record<string, { color: string; bgColor: string; icon: React.ReactNode }> = {
      'Compliant': { color: 'text-success-600', bgColor: 'bg-success-50', icon: <CheckCircle2 className="w-4 h-4" /> },
      'Non-Compliant': { color: 'text-danger-600', bgColor: 'bg-danger-50', icon: <XCircle className="w-4 h-4" /> },
      'At Risk': { color: 'text-warning-600', bgColor: 'bg-warning-50', icon: <AlertTriangle className="w-4 h-4" /> },
      'Unknown': { color: 'text-neutral-500', bgColor: 'bg-neutral-100', icon: <Clock className="w-4 h-4" /> },
    };
    return configs[facility.complianceStatus] || configs['Unknown'];
  }, [facility.complianceStatus]);

  const handleTap = useCallback(() => {
    if (onTap) {
      onTap(facility);
    } else {
      setIsExpanded(!isExpanded);
    }
  }, [facility, onTap, isExpanded]);

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return 'N/A';
    if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
    return `$${value.toLocaleString()}`;
  };

  return (
    <div
      className={`
        bg-white rounded-xl border border-neutral-200 overflow-hidden
        transition-all duration-200 active:scale-[0.99]
        ${isExpanded ? 'shadow-md' : 'shadow-sm'}
      `}
      onClick={handleTap}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
    >
      {/* Main content */}
      <div className="p-4">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-neutral-800 text-[15px] leading-tight truncate">
              {facility.name}
            </h3>
            <p className="text-sm text-neutral-500 truncate mt-0.5">
              {facility.operator}
            </p>
          </div>
          <span className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
            ${statusConfig.color} ${statusConfig.bgColor}
          `}>
            {statusConfig.icon}
            <span className="hidden xs:inline">{facility.complianceStatus}</span>
          </span>
        </div>

        {/* Quick stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-neutral-600">
            <MapPin className="w-4 h-4 text-neutral-400" />
            <span>{facility.state}</span>
          </div>
          {facility.subsidyGap !== undefined && facility.subsidyGap > 0 && (
            <div className="flex items-center gap-1.5 text-danger-600 font-medium">
              <DollarSign className="w-4 h-4" />
              <span>{formatCurrency(facility.subsidyGap)} gap</span>
            </div>
          )}
        </div>

        {/* Expand indicator */}
        <div className="flex justify-center mt-2 -mb-1">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-neutral-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-neutral-400" />
          )}
        </div>
      </div>

      {/* Expanded details */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-0 border-t border-neutral-100 animate-fade-in">
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500 mb-1">Jobs Promised</p>
              <p className="text-lg font-semibold text-neutral-800">
                {facility.jobsPromised?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500 mb-1">Jobs Created</p>
              <p className="text-lg font-semibold text-neutral-800">
                {facility.jobsCreated?.toLocaleString() || 'N/A'}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500 mb-1">Facility Type</p>
              <p className="text-sm font-medium text-neutral-700">
                {facility.type || 'Data Center'}
              </p>
            </div>
            <div className="bg-neutral-50 rounded-lg p-3">
              <p className="text-xs text-neutral-500 mb-1">Location</p>
              <p className="text-sm font-medium text-neutral-700 truncate">
                {facility.location}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-4">
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-primary-100 text-primary-700 font-medium text-sm active:bg-primary-200">
              <ExternalLink className="w-4 h-4" />
              Details
            </button>
            <button className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-neutral-100 text-neutral-700 font-medium text-sm active:bg-neutral-200">
              <MapPin className="w-4 h-4" />
              Map
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// Mobile Stats Summary - Horizontal scrolling stat cards
interface StatSummary {
  label: string;
  value: string | number;
  change?: number;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
}

interface MobileStatsSummaryProps {
  stats: StatSummary[];
}

export const MobileStatsSummary: React.FC<MobileStatsSummaryProps> = ({ stats }) => {
  const colorClasses = {
    primary: { bg: 'bg-primary-50', text: 'text-primary-700', icon: 'text-primary-500' },
    success: { bg: 'bg-success-50', text: 'text-success-700', icon: 'text-success-500' },
    warning: { bg: 'bg-warning-50', text: 'text-warning-700', icon: 'text-warning-500' },
    danger: { bg: 'bg-danger-50', text: 'text-danger-700', icon: 'text-danger-500' },
    neutral: { bg: 'bg-neutral-100', text: 'text-neutral-700', icon: 'text-neutral-500' },
  };

  return (
    <div
      className="flex gap-3 px-4 py-3 overflow-x-auto overscroll-x-contain"
      style={{ WebkitOverflowScrolling: 'touch' }}
    >
      {stats.map((stat, index) => {
        const colors = colorClasses[stat.color];
        return (
          <div
            key={index}
            className={`
              flex-shrink-0 min-w-[140px] p-3 rounded-xl
              ${colors.bg} scroll-snap-align-start
            `}
          >
            <div className={`${colors.icon} mb-2`}>{stat.icon}</div>
            <p className={`text-xl font-bold ${colors.text}`}>{stat.value}</p>
            <p className="text-xs text-neutral-600 mt-0.5">{stat.label}</p>
            {stat.change !== undefined && (
              <p className={`text-xs font-medium mt-1 ${stat.change >= 0 ? 'text-success-600' : 'text-danger-600'}`}>
                {stat.change >= 0 ? '↑' : '↓'} {Math.abs(stat.change)}%
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

// Mobile Filter Bar
interface FilterOption {
  id: string;
  label: string;
  count?: number;
}

interface MobileFilterBarProps {
  filters: FilterOption[];
  activeFilter: string;
  onFilterChange: (filterId: string) => void;
  onSortClick?: () => void;
  onSearchClick?: () => void;
}

export const MobileFilterBar: React.FC<MobileFilterBarProps> = ({
  filters,
  activeFilter,
  onFilterChange,
  onSortClick,
  onSearchClick,
}) => {
  return (
    <div className="sticky top-0 bg-white/95 backdrop-blur-lg border-b border-neutral-200 z-30">
      {/* Filter pills */}
      <div
        className="flex gap-2 px-4 py-3 overflow-x-auto overscroll-x-contain"
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {filters.map((filter) => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            className={`
              flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full
              text-sm font-medium transition-all duration-200 whitespace-nowrap
              ${activeFilter === filter.id
                ? 'bg-primary-100 text-primary-700'
                : 'bg-neutral-100 text-neutral-600 active:bg-neutral-200'
              }
            `}
          >
            {filter.label}
            {filter.count !== undefined && (
              <span className={`
                text-xs px-1.5 py-0.5 rounded-full
                ${activeFilter === filter.id ? 'bg-primary-200' : 'bg-neutral-200'}
              `}>
                {filter.count.toLocaleString()}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2 px-4 pb-3">
        {onSearchClick && (
          <button
            onClick={onSearchClick}
            className="flex-1 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-100 text-neutral-600 text-sm"
          >
            <Search className="w-4 h-4" />
            <span>Search facilities...</span>
          </button>
        )}
        {onSortClick && (
          <button
            onClick={onSortClick}
            className="p-2.5 rounded-xl bg-neutral-100 text-neutral-600 active:bg-neutral-200"
            aria-label="Sort"
          >
            <SortAsc className="w-5 h-5" />
          </button>
        )}
        <button
          className="p-2.5 rounded-xl bg-neutral-100 text-neutral-600 active:bg-neutral-200"
          aria-label="Filters"
        >
          <Filter className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

// Mobile List View with virtualization hint
interface MobileListViewProps {
  children: React.ReactNode;
  emptyMessage?: string;
  isLoading?: boolean;
}

export const MobileListView: React.FC<MobileListViewProps> = ({
  children,
  emptyMessage = 'No items to display',
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="p-4 space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-neutral-100 rounded-xl h-24 animate-pulse" />
        ))}
      </div>
    );
  }

  if (React.Children.count(children) === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
        <Building2 className="w-12 h-12 text-neutral-300 mb-4" />
        <p className="text-neutral-500">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      {children}
    </div>
  );
};

// Mobile Section Header
interface MobileSectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export const MobileSectionHeader: React.FC<MobileSectionHeaderProps> = ({
  title,
  subtitle,
  action,
}) => {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <div>
        <h2 className="text-lg font-semibold text-neutral-800">{title}</h2>
        {subtitle && (
          <p className="text-sm text-neutral-500 mt-0.5">{subtitle}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="flex items-center gap-1 text-primary-600 text-sm font-medium"
        >
          {action.label}
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

// Mobile Quick Action Grid
interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  onClick: () => void;
}

interface MobileQuickActionsProps {
  actions: QuickAction[];
}

export const MobileQuickActions: React.FC<MobileQuickActionsProps> = ({ actions }) => {
  return (
    <div className="grid grid-cols-4 gap-3 px-4 py-3">
      {actions.map((action) => (
        <button
          key={action.id}
          onClick={action.onClick}
          className="flex flex-col items-center gap-2 py-3 rounded-xl bg-white active:bg-neutral-50 transition-colors"
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${action.bgColor}`}
          >
            <span className={action.color}>{action.icon}</span>
          </div>
          <span className="text-xs font-medium text-neutral-700 text-center leading-tight">
            {action.label}
          </span>
        </button>
      ))}
    </div>
  );
};
