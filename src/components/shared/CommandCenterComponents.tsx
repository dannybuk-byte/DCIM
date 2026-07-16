/**
 * Interactive Command Center Components
 * 
 * Reusable components for building Assurance Monitor-style interfaces
 * across all tabs in the DCIM dashboard
 */

import React, { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from './animations';
import { liveFamilyChromeLabel } from '../../runtime/modeChrome';

// ============================================================================
// LIVE INDICATOR
// ============================================================================

interface LiveIndicatorProps {
  label?: string;
  color?: 'green' | 'blue' | 'cyan' | 'yellow' | 'red';
  pulse?: boolean;
}

export function LiveIndicator({ 
  label = liveFamilyChromeLabel(), 
  color = 'green',
  pulse = true,
}: LiveIndicatorProps) {
  const colorMap = {
    green: { bg: 'bg-green-900/30', border: 'border-green-700', dot: 'bg-green-400', text: 'text-green-300' },
    blue: { bg: 'bg-blue-900/30', border: 'border-blue-700', dot: 'bg-blue-400', text: 'text-blue-300' },
    cyan: { bg: 'bg-cyan-900/30', border: 'border-cyan-700', dot: 'bg-cyan-400', text: 'text-cyan-300' },
    yellow: { bg: 'bg-yellow-900/30', border: 'border-yellow-700', dot: 'bg-yellow-400', text: 'text-yellow-300' },
    red: { bg: 'bg-red-900/30', border: 'border-red-700', dot: 'bg-red-400', text: 'text-red-300' },
  };

  const colors = colorMap[color];

  return (
    <div className={`flex items-center gap-2 px-3 py-1 ${colors.bg} border ${colors.border} rounded-full`}>
      <div className={`w-2 h-2 ${colors.dot} rounded-full ${pulse ? 'animate-pulse' : ''}`} />
      <span className={`text-xs ${colors.text} font-medium`}>{label}</span>
    </div>
  );
}

// ============================================================================
// STATUS CARD
// ============================================================================

interface StatusCardProps {
  icon: LucideIcon;
  value: number;
  label: string;
  hint: string;
  severity?: 'critical' | 'warning' | 'info' | 'success';
  onClick?: () => void;
  animate?: boolean;
}

export function StatusCard({ 
  icon: Icon, 
  value, 
  label, 
  hint, 
  severity = 'info',
  onClick,
  animate = true,
}: StatusCardProps) {
  const colorMap = {
    critical: { bg: 'bg-red-950/50', border: 'border-red-800', hover: 'hover:bg-red-950/70', icon: 'text-red-400', value: 'text-red-300', label: 'text-red-400', hint: 'text-red-500' },
    warning: { bg: 'bg-yellow-950/50', border: 'border-yellow-800', hover: 'hover:bg-yellow-950/70', icon: 'text-yellow-400', value: 'text-yellow-300', label: 'text-yellow-400', hint: 'text-yellow-500' },
    info: { bg: 'bg-blue-950/50', border: 'border-blue-800', hover: 'hover:bg-blue-950/70', icon: 'text-blue-400', value: 'text-blue-300', label: 'text-blue-400', hint: 'text-blue-500' },
    success: { bg: 'bg-green-950/50', border: 'border-green-800', hover: 'hover:bg-green-950/70', icon: 'text-green-400', value: 'text-green-300', label: 'text-green-400', hint: 'text-green-500' },
  };

  const colors = colorMap[severity];

  return (
    <div 
      className={`${colors.bg} border ${colors.border} rounded-lg p-3 transition-all duration-300 ${onClick ? `cursor-pointer ${colors.hover}` : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className={`w-5 h-5 ${colors.icon}`} />
        {animate ? (
          <AnimatedNumber value={value} className={`text-2xl font-bold ${colors.value}`} duration={800} />
        ) : (
          <div className={`text-2xl font-bold ${colors.value}`}>{value}</div>
        )}
      </div>
      <div className={`text-sm ${colors.label}`}>{label}</div>
      <div className={`text-xs ${colors.hint} mt-1`}>{hint}</div>
    </div>
  );
}

// ============================================================================
// COMMAND HEADER
// ============================================================================

interface CommandHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  isLive?: boolean;
  liveLabel?: string;
  lastUpdate?: Date | null;
  actions?: ReactNode;
  children?: ReactNode;
}

export function CommandHeader({
  icon: Icon,
  title,
  subtitle,
  isLive = false,
  liveLabel = liveFamilyChromeLabel(),
  lastUpdate,
  actions,
  children,
}: CommandHeaderProps) {
  return (
    <div className="bg-gradient-to-r from-blue-950 to-indigo-950 border border-blue-800 rounded-lg p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <Icon className="w-6 h-6 text-blue-400" />
            <h2 className="text-xl font-bold text-white">{title}</h2>
            {isLive && <LiveIndicator label={liveLabel} color="green" />}
          </div>
          <p className="text-sm text-blue-300 mt-1">{subtitle}</p>
        </div>
        
        <div className="flex items-center gap-4">
          {actions}
          
          {lastUpdate && (
            <div className="text-right">
              <div className="text-xs text-blue-400">Last Update</div>
              <div className="text-sm text-blue-200 font-mono">
                {lastUpdate.toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {children && (
        <div className="mt-4 pt-4 border-t border-blue-800/50">
          {children}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// QUICK FILTERS
// ============================================================================

interface Filter {
  id: string;
  label: string;
  count?: number;
}

interface QuickFiltersProps {
  filters: Filter[];
  activeFilters: string[];
  onChange: (filterId: string) => void;
  className?: string;
}

export function QuickFilters({ 
  filters, 
  activeFilters, 
  onChange,
  className = '',
}: QuickFiltersProps) {
  return (
    <div className={`flex items-center gap-2 flex-wrap ${className}`}>
      {filters.map(filter => {
        const isActive = activeFilters.includes(filter.id);
        return (
          <button
            key={filter.id}
            onClick={() => onChange(filter.id)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
              isActive
                ? 'bg-cyan-600 text-white border border-cyan-500 shadow-lg shadow-cyan-500/20'
                : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600 hover:text-gray-300'
            }`}
          >
            {filter.label} {isActive && filter.count !== undefined && `(${filter.count})`}
          </button>
        );
      })}
    </div>
  );
}

// ============================================================================
// ACTION BUTTON
// ============================================================================

interface ActionButtonProps {
  icon?: LucideIcon;
  label: string;
  onClick: () => void;
  loading?: boolean;
  loadingLabel?: string;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
}

export function ActionButton({
  icon: Icon,
  label,
  onClick,
  loading = false,
  loadingLabel = 'Processing...',
  variant = 'primary',
  disabled = false,
}: ActionButtonProps) {
  const variantMap = {
    primary: {
      base: 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white',
      hover: 'hover:from-cyan-500 hover:to-blue-500',
      disabled: 'disabled:from-gray-700 disabled:to-gray-800',
      shadow: 'shadow-lg shadow-cyan-500/20',
    },
    secondary: {
      base: 'bg-gray-800 text-white',
      hover: 'hover:bg-gray-700',
      disabled: 'disabled:bg-gray-900',
      shadow: '',
    },
    danger: {
      base: 'bg-gradient-to-r from-red-600 to-orange-600 text-white',
      hover: 'hover:from-red-500 hover:to-orange-500',
      disabled: 'disabled:from-gray-700 disabled:to-gray-800',
      shadow: 'shadow-lg shadow-red-500/20',
    },
  };

  const styles = variantMap[variant];

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-all duration-300 ${styles.base} ${styles.hover} ${styles.disabled} ${styles.shadow}`}
    >
      {loading ? (
        <>
          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          <span>{loadingLabel}</span>
        </>
      ) : (
        <>
          {Icon && <Icon className="w-4 h-4" />}
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

// ============================================================================
// TIMESTAMP DISPLAY
// ============================================================================

interface TimestampProps {
  date: Date | null;
  label?: string;
  format?: 'time' | 'date' | 'datetime';
}

export function Timestamp({ 
  date, 
  label = 'Last Update',
  format = 'time',
}: TimestampProps) {
  if (!date) return null;

  const formatDate = () => {
    switch (format) {
      case 'time':
        return date.toLocaleTimeString();
      case 'date':
        return date.toLocaleDateString();
      case 'datetime':
        return date.toLocaleString();
      default:
        return date.toLocaleTimeString();
    }
  };

  return (
    <div className="text-right">
      <div className="text-xs text-blue-400">{label}</div>
      <div className="text-sm text-blue-200 font-mono">
        {formatDate()}
      </div>
    </div>
  );
}

// ============================================================================
// LOADING SPINNER
// ============================================================================

interface LoadingSpinnerProps {
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  color?: 'cyan' | 'blue' | 'white';
}

export function LoadingSpinner({ 
  label, 
  size = 'md',
  color = 'cyan',
}: LoadingSpinnerProps) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  const colorMap = {
    cyan: 'border-cyan-400',
    blue: 'border-blue-400',
    white: 'border-white',
  };

  return (
    <div className="flex items-center gap-3">
      <div className={`${sizeMap[size]} border-2 ${colorMap[color]} border-t-transparent rounded-full animate-spin`} />
      {label && <span className="text-sm text-gray-400">{label}</span>}
    </div>
  );
}

// ============================================================================
// INTERACTIVE CARD
// ============================================================================

interface InteractiveCardProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  glowColor?: string;
}

export function InteractiveCard({ 
  children, 
  onClick,
  className = '',
  glowColor = 'cyan',
}: InteractiveCardProps) {
  const glowColorMap = {
    cyan: 'hover:shadow-cyan-500/20',
    blue: 'hover:shadow-blue-500/20',
    purple: 'hover:shadow-purple-500/20',
    green: 'hover:shadow-green-500/20',
    red: 'hover:shadow-red-500/20',
  };

  return (
    <div 
      className={`bg-gray-800/50 border border-gray-700 rounded-lg p-4 transition-all duration-300 ${
        onClick ? `cursor-pointer hover:bg-gray-800/70 hover:border-gray-600 hover:-translate-y-1 hover:shadow-lg ${glowColorMap[glowColor as keyof typeof glowColorMap]}` : ''
      } ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

