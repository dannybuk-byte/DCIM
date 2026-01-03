/**
 * AnimatedCard Component
 * Beautiful, interactive card with animations and hover effects
 */

import React, { useState } from 'react';
import { useAnimatedCounter, usePulse } from '../utils/animations';

interface AnimatedCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  color?: 'cyan' | 'green' | 'yellow' | 'red' | 'purple' | 'blue';
  clickable?: boolean;
  onClick?: () => void;
  animated?: boolean;
  pulse?: boolean;
  glow?: boolean;
  className?: string;
}

export const AnimatedCard: React.FC<AnimatedCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  trend,
  trendValue,
  color = 'cyan',
  clickable = false,
  onClick,
  animated = true,
  pulse = false,
  glow = false,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const isPulsing = usePulse(1500);
  
  // Animate numbers if value is a number
  const animatedValue = typeof value === 'number' && animated
    ? useAnimatedCounter(value, 2000, value < 1 ? 2 : 0)
    : value;

  // Color mappings
  const colorClasses = {
    cyan: {
      border: 'border-cyan-500/30',
      borderHover: 'hover:border-cyan-400/60',
      bg: 'bg-cyan-500/5',
      bgHover: 'hover:bg-cyan-500/10',
      text: 'text-cyan-400',
      glow: 'shadow-cyan-500/20',
      icon: 'text-cyan-400',
    },
    green: {
      border: 'border-green-500/30',
      borderHover: 'hover:border-green-400/60',
      bg: 'bg-green-500/5',
      bgHover: 'hover:bg-green-500/10',
      text: 'text-green-400',
      glow: 'shadow-green-500/20',
      icon: 'text-green-400',
    },
    yellow: {
      border: 'border-yellow-500/30',
      borderHover: 'hover:border-yellow-400/60',
      bg: 'bg-yellow-500/5',
      bgHover: 'hover:bg-yellow-500/10',
      text: 'text-yellow-400',
      glow: 'shadow-yellow-500/20',
      icon: 'text-yellow-400',
    },
    red: {
      border: 'border-red-500/30',
      borderHover: 'hover:border-red-400/60',
      bg: 'bg-red-500/5',
      bgHover: 'hover:bg-red-500/10',
      text: 'text-red-400',
      glow: 'shadow-red-500/20',
      icon: 'text-red-400',
    },
    purple: {
      border: 'border-purple-500/30',
      borderHover: 'hover:border-purple-400/60',
      bg: 'bg-purple-500/5',
      bgHover: 'hover:bg-purple-500/10',
      text: 'text-purple-400',
      glow: 'shadow-purple-500/20',
      icon: 'text-purple-400',
    },
    blue: {
      border: 'border-blue-500/30',
      borderHover: 'hover:border-blue-400/60',
      bg: 'bg-blue-500/5',
      bgHover: 'hover:bg-blue-500/10',
      text: 'text-blue-400',
      glow: 'shadow-blue-500/20',
      icon: 'text-blue-400',
    },
  };

  const colors = colorClasses[color];

  return (
    <div
      className={`
        relative overflow-hidden
        rounded-lg border ${colors.border} ${colors.bg}
        p-4
        transition-all duration-300 ease-out
        ${clickable ? 'cursor-pointer' : ''}
        ${clickable && isHovered ? 'scale-105 -translate-y-1' : 'scale-100'}
        ${colors.borderHover} ${colors.bgHover}
        ${glow ? `shadow-lg ${colors.glow}` : ''}
        ${pulse && isPulsing ? 'animate-glow-pulse' : ''}
        animate-slide-up
        ${className}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={clickable ? onClick : undefined}
    >
      {/* Animated background gradient */}
      <div 
        className={`
          absolute inset-0 opacity-0 transition-opacity duration-300
          bg-gradient-to-br from-${color}-500/10 to-transparent
          ${isHovered ? 'opacity-100' : ''}
        `}
      />
      
      {/* Shimmer effect on hover */}
      {isHovered && (
        <div
          className="absolute inset-0 opacity-30"
          style={{
            background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s ease-in-out',
          }}
        />
      )}

      <div className="relative z-10">
        {/* Header with icon */}
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">
            {title}
          </span>
          {icon && (
            <div className={`
              ${colors.icon} 
              transition-transform duration-300
              ${isHovered ? 'scale-110 rotate-3' : 'scale-100'}
            `}>
              {icon}
            </div>
          )}
        </div>

        {/* Main value */}
        <div className={`
          text-3xl font-bold ${colors.text} mb-1
          transition-all duration-300
          ${isHovered ? 'scale-105' : 'scale-100'}
        `}>
          {typeof animatedValue === 'number' 
            ? animatedValue.toLocaleString()
            : animatedValue
          }
        </div>

        {/* Subtitle and trend */}
        <div className="flex items-center justify-between">
          {subtitle && (
            <span className="text-xs text-gray-500">
              {subtitle}
            </span>
          )}
          
          {trend && trendValue && (
            <div className={`
              flex items-center gap-1 text-xs font-semibold
              ${trend === 'up' ? 'text-green-400' : ''}
              ${trend === 'down' ? 'text-red-400' : ''}
              ${trend === 'neutral' ? 'text-gray-400' : ''}
            `}>
              {trend === 'up' && '↑'}
              {trend === 'down' && '↓'}
              {trend === 'neutral' && '→'}
              <span>{trendValue}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bottom border glow effect */}
      {isHovered && (
        <div 
          className={`
            absolute bottom-0 left-0 right-0 h-0.5
            bg-gradient-to-r from-transparent via-${color}-400 to-transparent
            opacity-60
          `}
        />
      )}
    </div>
  );
};

export default AnimatedCard;

