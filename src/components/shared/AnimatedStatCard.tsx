/**
 * Animated Statistics Card Component
 * Displays metrics with smooth counting animations, trend indicators, and sparklines
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { Tooltip } from './Tooltip';

interface AnimatedStatCardProps {
  label: string;
  value: number;
  previousValue?: number;
  format?: 'number' | 'currency' | 'percentage';
  icon?: LucideIcon;
  color?: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'cyan' | 'orange';
  trend?: 'up' | 'down' | 'neutral';
  sparklineData?: number[];
  subtitle?: string;
  tooltip?: string;
  animationDuration?: number; // milliseconds
  decimals?: number;
  onClick?: () => void;
  className?: string;
}

export const AnimatedStatCard = memo(function AnimatedStatCard({
  label,
  value,
  previousValue,
  format = 'number',
  icon: Icon,
  color = 'blue',
  trend,
  sparklineData,
  subtitle,
  tooltip,
  animationDuration = 1000,
  decimals = 0,
  onClick,
  className = ''
}: AnimatedStatCardProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationFrameRef = useRef<number>();
  const startTimeRef = useRef<number>();

  // Color schemes
  const colorSchemes = {
    blue: {
      bg: 'bg-blue-900/20',
      border: 'border-blue-800',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/20'
    },
    green: {
      bg: 'bg-green-900/20',
      border: 'border-green-800',
      text: 'text-green-400',
      glow: 'shadow-green-500/20'
    },
    red: {
      bg: 'bg-red-900/20',
      border: 'border-red-800',
      text: 'text-red-400',
      glow: 'shadow-red-500/20'
    },
    yellow: {
      bg: 'bg-yellow-900/20',
      border: 'border-yellow-800',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-500/20'
    },
    purple: {
      bg: 'bg-purple-900/20',
      border: 'border-purple-800',
      text: 'text-purple-400',
      glow: 'shadow-purple-500/20'
    },
    cyan: {
      bg: 'bg-cyan-900/20',
      border: 'border-cyan-800',
      text: 'text-cyan-400',
      glow: 'shadow-cyan-500/20'
    },
    orange: {
      bg: 'bg-orange-900/20',
      border: 'border-orange-800',
      text: 'text-orange-400',
      glow: 'shadow-orange-500/20'
    }
  };

  const scheme = colorSchemes[color];

  // Easing function for smooth animation
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Animate number counting
  useEffect(() => {
    setIsAnimating(true);
    startTimeRef.current = undefined;

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) {
        startTimeRef.current = timestamp;
      }

      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / animationDuration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentValue = displayValue + (value - displayValue) * easedProgress;
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setIsAnimating(false);
      }
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [value, animationDuration]);

  // Format number for display
  const formatValue = (val: number): string => {
    switch (format) {
      case 'currency':
        if (val >= 1000000000) {
          return `$${(val / 1000000000).toFixed(decimals)}B`;
        } else if (val >= 1000000) {
          return `$${(val / 1000000).toFixed(decimals)}M`;
        } else if (val >= 1000) {
          return `$${(val / 1000).toFixed(decimals)}K`;
        }
        return `$${val.toFixed(decimals)}`;
      case 'percentage':
        return `${val.toFixed(decimals)}%`;
      default:
        if (val >= 1000000) {
          return `${(val / 1000000).toFixed(decimals)}M`;
        } else if (val >= 1000) {
          return `${(val / 1000).toFixed(decimals)}K`;
        }
        return val.toFixed(decimals);
    }
  };

  // Calculate trend if previousValue provided
  const calculatedTrend = trend || (previousValue !== undefined
    ? value > previousValue ? 'up'
    : value < previousValue ? 'down'
    : 'neutral'
    : undefined);

  const percentChange = previousValue !== undefined && previousValue !== 0
    ? ((value - previousValue) / previousValue) * 100
    : undefined;

  // Render sparkline (mini chart)
  const renderSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;

    const width = 80;
    const height = 24;
    const padding = 2;
    const min = Math.min(...sparklineData);
    const max = Math.max(...sparklineData);
    const range = max - min || 1;

    const points = sparklineData.map((val, index) => {
      const x = (index / (sparklineData.length - 1)) * (width - padding * 2) + padding;
      const y = height - padding - ((val - min) / range) * (height - padding * 2);
      return `${x},${y}`;
    }).join(' ');

    return (
      <svg width={width} height={height} className="absolute bottom-2 right-2 opacity-30">
        <polyline
          points={points}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  };

  const card = (
    <div
      className={`relative overflow-hidden border rounded-lg p-4 transition-all duration-300 hover:shadow-lg ${
        scheme.bg
      } ${scheme.border} ${scheme.glow} ${
        onClick ? 'cursor-pointer hover:scale-105' : ''
      } ${isAnimating ? 'animate-pulse' : ''} ${className}`}
      onClick={onClick}
    >
      {/* Icon & Trend Indicator */}
      <div className="flex items-start justify-between mb-3">
        {Icon && (
          <div className={`p-2 rounded-lg ${scheme.bg} ${scheme.text}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
        {calculatedTrend && (
          <div className={`flex items-center gap-1 text-xs font-semibold ${
            calculatedTrend === 'up' ? 'text-green-400' :
            calculatedTrend === 'down' ? 'text-red-400' :
            'text-gray-400'
          }`}>
            {calculatedTrend === 'up' && <TrendingUp className="w-3 h-3" />}
            {calculatedTrend === 'down' && <TrendingDown className="w-3 h-3" />}
            {calculatedTrend === 'neutral' && <Minus className="w-3 h-3" />}
            {percentChange !== undefined && `${percentChange > 0 ? '+' : ''}${percentChange.toFixed(1)}%`}
          </div>
        )}
      </div>

      {/* Value */}
      <div className={`text-3xl font-bold ${scheme.text} mb-1`}>
        {formatValue(displayValue)}
      </div>

      {/* Label */}
      <div className="text-xs text-gray-400 uppercase tracking-wide font-medium mb-1">
        {label}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <div className="text-xs text-gray-500 mt-1">
          {subtitle}
        </div>
      )}

      {/* Sparkline */}
      {renderSparkline()}

      {/* Hover Glow Effect */}
      <div className={`absolute inset-0 bg-gradient-to-br ${scheme.text.replace('text-', 'from-')} to-transparent opacity-0 hover:opacity-5 transition-opacity duration-300 pointer-events-none`} />
    </div>
  );

  return tooltip ? (
    <Tooltip content={tooltip}>
      {card}
    </Tooltip>
  ) : card;
});

// Grid container for stat cards
interface AnimatedStatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}

export const AnimatedStatsGrid = memo(function AnimatedStatsGrid({
  children,
  columns = 4,
  className = ''
}: AnimatedStatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-5',
    6: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-6'
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-4 ${className}`}>
      {children}
    </div>
  );
});

