/**
 * AnimatedProgressBar Component
 * Beautiful animated progress bar with glow effects
 */

import React from 'react';
import { useAnimatedProgress } from '../utils/animations';

interface AnimatedProgressBarProps {
  value: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  color?: 'cyan' | 'green' | 'yellow' | 'red' | 'purple' | 'blue';
  height?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  glow?: boolean;
  striped?: boolean;
  className?: string;
}

export const AnimatedProgressBar: React.FC<AnimatedProgressBarProps> = ({
  value,
  label,
  showPercentage = true,
  color = 'cyan',
  height = 'md',
  animated = true,
  glow = true,
  striped = false,
  className = '',
}) => {
  const animatedValue = animated ? useAnimatedProgress(value, 1500) : value;
  const clampedValue = Math.min(Math.max(animatedValue, 0), 100);

  // Height mappings
  const heightClasses = {
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };

  // Color mappings
  const colorClasses = {
    cyan: {
      bg: 'bg-cyan-500',
      glow: 'shadow-cyan-500/50',
      text: 'text-cyan-400',
    },
    green: {
      bg: 'bg-green-500',
      glow: 'shadow-green-500/50',
      text: 'text-green-400',
    },
    yellow: {
      bg: 'bg-yellow-500',
      glow: 'shadow-yellow-500/50',
      text: 'text-yellow-400',
    },
    red: {
      bg: 'bg-red-500',
      glow: 'shadow-red-500/50',
      text: 'text-red-400',
    },
    purple: {
      bg: 'bg-purple-500',
      glow: 'shadow-purple-500/50',
      text: 'text-purple-400',
    },
    blue: {
      bg: 'bg-blue-500',
      glow: 'shadow-blue-500/50',
      text: 'text-blue-400',
    },
  };

  const colors = colorClasses[color];

  return (
    <div className={`w-full ${className}`}>
      {/* Label and percentage */}
      {(label || showPercentage) && (
        <div className="flex items-center justify-between mb-1">
          {label && (
            <span className="text-xs font-medium text-gray-400">
              {label}
            </span>
          )}
          {showPercentage && (
            <span className={`text-xs font-bold ${colors.text}`}>
              {clampedValue.toFixed(1)}%
            </span>
          )}
        </div>
      )}

      {/* Progress bar container */}
      <div className={`
        w-full ${heightClasses[height]} 
        bg-slate-800/50 rounded-full overflow-hidden
        border border-slate-700/50
      `}>
        {/* Progress bar fill */}
        <div
          className={`
            h-full ${colors.bg} rounded-full
            transition-all duration-1000 ease-out
            ${glow ? `shadow-lg ${colors.glow}` : ''}
            ${striped ? 'bg-striped' : ''}
            relative overflow-hidden
          `}
          style={{ width: `${clampedValue}%` }}
        >
          {/* Shimmer effect */}
          <div
            className="absolute inset-0 opacity-30"
            style={{
              background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s ease-in-out infinite',
            }}
          />
          
          {/* Striped pattern */}
          {striped && (
            <div
              className="absolute inset-0 opacity-20"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  rgba(255,255,255,0.1) 10px,
                  rgba(255,255,255,0.1) 20px
                )`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1s linear infinite',
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default AnimatedProgressBar;

