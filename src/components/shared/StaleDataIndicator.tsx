/**
 * StaleDataIndicator - Data Freshness Warning
 * 
 * Shows when data might be outdated:
 * 1. Time since last refresh
 * 2. Visual aging indicator
 * 3. One-click refresh option
 * 4. Auto-refresh option
 * 
 * ANTIFRAGILE: Prevents decisions based on stale data
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Clock, RefreshCw, AlertTriangle, CheckCircle,
  Calendar, Timer, Zap
} from 'lucide-react';

// ============================================================================
// TYPES
// ============================================================================

type FreshnessLevel = 'fresh' | 'aging' | 'stale' | 'expired';

interface StaleDataConfig {
  freshThreshold: number;   // ms - considered fresh
  agingThreshold: number;   // ms - starting to age
  staleThreshold: number;   // ms - definitely stale
  expiredThreshold: number; // ms - critically outdated
}

const DEFAULT_CONFIG: StaleDataConfig = {
  freshThreshold: 5 * 60 * 1000,      // 5 minutes
  agingThreshold: 15 * 60 * 1000,     // 15 minutes
  staleThreshold: 60 * 60 * 1000,     // 1 hour
  expiredThreshold: 24 * 60 * 60 * 1000, // 24 hours
};

// ============================================================================
// FRESHNESS CALCULATION
// ============================================================================

function calculateFreshness(lastUpdated: number, config: StaleDataConfig): FreshnessLevel {
  const age = Date.now() - lastUpdated;
  
  if (age < config.freshThreshold) return 'fresh';
  if (age < config.agingThreshold) return 'aging';
  if (age < config.staleThreshold) return 'stale';
  return 'expired';
}

function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  if (seconds > 10) return `${seconds}s ago`;
  return 'just now';
}

function formatLastUpdated(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  
  if (date.toDateString() === now.toDateString()) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

// ============================================================================
// FRESHNESS CONFIG
// ============================================================================

const FRESHNESS_STYLES: Record<FreshnessLevel, {
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ReactNode;
  label: string;
}> = {
  fresh: {
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: <CheckCircle className="w-4 h-4" />,
    label: 'Fresh',
  },
  aging: {
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: <Clock className="w-4 h-4" />,
    label: 'Recent',
  },
  stale: {
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Stale',
  },
  expired: {
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    icon: <AlertTriangle className="w-4 h-4" />,
    label: 'Outdated',
  },
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

interface StaleDataIndicatorProps {
  lastUpdated: number;
  onRefresh?: () => void | Promise<void>;
  isRefreshing?: boolean;
  config?: Partial<StaleDataConfig>;
  variant?: 'badge' | 'banner' | 'inline' | 'compact';
  showAutoRefresh?: boolean;
  autoRefreshInterval?: number;
  className?: string;
}

export function StaleDataIndicator({
  lastUpdated,
  onRefresh,
  isRefreshing = false,
  config: customConfig,
  variant = 'badge',
  showAutoRefresh = false,
  autoRefreshInterval = 5 * 60 * 1000, // 5 minutes
  className = '',
}: StaleDataIndicatorProps) {
  const config = { ...DEFAULT_CONFIG, ...customConfig };
  const [freshness, setFreshness] = useState<FreshnessLevel>(() => 
    calculateFreshness(lastUpdated, config)
  );
  const [age, setAge] = useState(() => Date.now() - lastUpdated);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // Update freshness periodically
  useEffect(() => {
    const updateFreshness = () => {
      setFreshness(calculateFreshness(lastUpdated, config));
      setAge(Date.now() - lastUpdated);
    };

    updateFreshness();
    const interval = setInterval(updateFreshness, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [lastUpdated, config]);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh || !onRefresh) return;

    const interval = setInterval(() => {
      onRefresh();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, autoRefreshInterval, onRefresh]);

  const handleRefresh = useCallback(async () => {
    if (onRefresh && !isRefreshing) {
      await onRefresh();
    }
  }, [onRefresh, isRefreshing]);

  const style = FRESHNESS_STYLES[freshness];

  // Compact variant - just a dot
  if (variant === 'compact') {
    return (
      <div 
        className={`flex items-center gap-1 ${className}`}
        title={`Last updated: ${formatLastUpdated(lastUpdated)}`}
      >
        <div className={`w-2 h-2 rounded-full ${
          freshness === 'fresh' ? 'bg-green-500' :
          freshness === 'aging' ? 'bg-blue-500' :
          freshness === 'stale' ? 'bg-amber-500' : 'bg-red-500'
        }`} />
        <span className="text-xs text-gray-500">{formatAge(age)}</span>
      </div>
    );
  }

  // Badge variant
  if (variant === 'badge') {
    return (
      <div 
        className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${style.bgColor} ${style.color} ${className}`}
        title={`Last updated: ${formatLastUpdated(lastUpdated)}`}
      >
        {isRefreshing ? (
          <RefreshCw className="w-3 h-3 animate-spin" />
        ) : (
          style.icon
        )}
        <span>{formatAge(age)}</span>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-1 p-0.5 hover:bg-white/50 rounded transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
      </div>
    );
  }

  // Inline variant
  if (variant === 'inline') {
    return (
      <span 
        className={`inline-flex items-center gap-1 text-xs ${style.color} ${className}`}
        title={`Last updated: ${formatLastUpdated(lastUpdated)}`}
      >
        {style.icon}
        <span>Updated {formatAge(age)}</span>
        {onRefresh && (
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="ml-1 hover:underline"
          >
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        )}
      </span>
    );
  }

  // Banner variant (for stale/expired data)
  if (variant === 'banner' && (freshness === 'stale' || freshness === 'expired')) {
    return (
      <div className={`${style.bgColor} border ${style.borderColor} rounded-lg p-3 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={style.color}>{style.icon}</span>
            <div>
              <span className={`font-medium ${style.color}`}>
                {freshness === 'expired' ? 'Data is outdated' : 'Data may be stale'}
              </span>
              <span className="text-sm text-gray-600 ml-2">
                Last updated {formatLastUpdated(lastUpdated)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {showAutoRefresh && (
              <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRefresh}
                  onChange={e => setAutoRefresh(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Zap className="w-3 h-3" />
                Auto-refresh
              </label>
            )}
            {onRefresh && (
              <button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className={`flex items-center gap-1 px-3 py-1.5 ${style.color} hover:bg-white/50 rounded-lg text-sm font-medium transition-colors disabled:opacity-50`}
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Refreshing...' : 'Refresh Now'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Default to badge for fresh/aging data
  return (
    <div 
      className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${style.bgColor} ${style.color} ${className}`}
      title={`Last updated: ${formatLastUpdated(lastUpdated)}`}
    >
      {isRefreshing ? (
        <RefreshCw className="w-3 h-3 animate-spin" />
      ) : (
        style.icon
      )}
      <span>{formatAge(age)}</span>
    </div>
  );
}

// ============================================================================
// HOOK
// ============================================================================

interface UseDataFreshnessOptions {
  onRefresh?: () => void | Promise<void>;
  config?: Partial<StaleDataConfig>;
}

export function useDataFreshness(lastUpdated: number, options: UseDataFreshnessOptions = {}) {
  const config = { ...DEFAULT_CONFIG, ...options.config };
  const [freshness, setFreshness] = useState<FreshnessLevel>(() => 
    calculateFreshness(lastUpdated, config)
  );
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const updateFreshness = () => {
      setFreshness(calculateFreshness(lastUpdated, config));
    };

    updateFreshness();
    const interval = setInterval(updateFreshness, 10000);

    return () => clearInterval(interval);
  }, [lastUpdated, config]);

  const refresh = useCallback(async () => {
    if (options.onRefresh && !isRefreshing) {
      setIsRefreshing(true);
      try {
        await options.onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
  }, [options.onRefresh, isRefreshing]);

  return {
    freshness,
    isRefreshing,
    refresh,
    isFresh: freshness === 'fresh',
    isStale: freshness === 'stale' || freshness === 'expired',
    age: Date.now() - lastUpdated,
    formattedAge: formatAge(Date.now() - lastUpdated),
  };
}

export default StaleDataIndicator;
