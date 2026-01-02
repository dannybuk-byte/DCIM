import { memo, useState, useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { 
  AnimatedNumber, 
  Sparkline, 
  AnimatedProgressBar,
  AnimatedCircularProgress,
  HoverScale,
  FadeIn,
  PulsingDot,
} from './animations';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  color?: 'default' | 'green' | 'red' | 'yellow' | 'cyan' | 'amber' | 'purple';
  glow?: boolean;
  // New animation props
  animated?: boolean;
  sparklineData?: number[];
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
  progress?: number;
  progressMax?: number;
  circularProgress?: boolean;
  onClick?: () => void;
  badge?: string | number;
  icon?: React.ReactNode;
  live?: boolean;
  delay?: number;
}

const COLORS = {
  default: { 
    text: '#e8eef6', 
    accent: '#5a6d8a',
    glow: 'transparent',
    sparkline: '#5a6d8a',
  },
  green: { 
    text: '#2ed573', 
    accent: '#2ed573',
    glow: '#2ed57330',
    sparkline: '#2ed573',
  },
  red: { 
    text: '#ff4757', 
    accent: '#ff4757',
    glow: '#ff475730',
    sparkline: '#ff4757',
  },
  yellow: { 
    text: '#ffa502', 
    accent: '#ffa502',
    glow: '#ffa50230',
    sparkline: '#ffa502',
  },
  cyan: { 
    text: '#00d2d3', 
    accent: '#00d2d3',
    glow: '#00d2d330',
    sparkline: '#00d2d3',
  },
  amber: { 
    text: '#f59e0b', 
    accent: '#f59e0b',
    glow: '#f59e0b30',
    sparkline: '#f59e0b',
  },
  purple: { 
    text: '#a855f7', 
    accent: '#a855f7',
    glow: '#a855f730',
    sparkline: '#a855f7',
  },
};

export const StatCard = memo(({ 
  label, 
  value, 
  subtitle, 
  color = 'default', 
  glow = false,
  animated = true,
  sparklineData,
  trend,
  trendValue,
  progress,
  progressMax = 100,
  circularProgress = false,
  onClick,
  badge,
  icon,
  live = false,
  delay = 0,
}: StatCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const colors = COLORS[color];
  
  // Parse numeric value for animation
  const numericValue = useMemo(() => {
    if (typeof value === 'number') return value;
    // Extract number from string like "$5.13B" or "11,992"
    const match = String(value).match(/[\d,.]+/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
    return 0;
  }, [value]);

  // Format value for display
  const displayValue = useMemo(() => {
    if (!animated) return value;
    if (typeof value === 'string') {
      // Keep the format, just animate the number
      const prefix = String(value).match(/^[^\d]*/)?.[0] || '';
      const suffix = String(value).match(/[^\d,.]*$/)?.[0] || '';
      return { prefix, suffix, number: numericValue };
    }
    return { prefix: '', suffix: '', number: numericValue };
  }, [value, numericValue, animated]);

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;

  return (
    <FadeIn delay={delay} duration={400} direction="up">
      <div
        className={`
          relative overflow-hidden
          bg-gradient-to-br from-gray-900 to-gray-900/80
          border border-gray-800 rounded p-1.5
          transition-all duration-300 ease-out
          ${onClick ? 'cursor-pointer' : ''}
          ${isHovered ? 'border-gray-700 shadow-xl' : ''}
        `}
        style={{
          boxShadow: glow && isHovered 
            ? `0 0 30px ${colors.glow}, 0 0 60px ${colors.glow}` 
            : glow 
            ? `0 0 20px ${colors.glow}`
            : 'none',
          transform: isHovered ? 'translateY(-2px)' : 'translateY(0)',
        }}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background gradient animation */}
        <div 
          className="absolute inset-0 opacity-0 transition-opacity duration-500"
          style={{
            opacity: isHovered ? 0.1 : 0,
            background: `radial-gradient(circle at 50% 0%, ${colors.accent}, transparent 70%)`,
          }}
        />

        {/* Header row */}
        <div className="relative flex items-center justify-between mb-0.5">
          <div className="flex items-center gap-1">
            {icon && (
              <span 
                className="transition-transform duration-300"
                style={{ 
                  color: colors.accent,
                  transform: isHovered ? 'scale(1.1)' : 'scale(1)',
                }}
              >
                {icon}
              </span>
            )}
            <span className="text-[9px] text-gray-400 uppercase tracking-wide font-medium">
              {label}
            </span>
            {live && (
              <PulsingDot color={colors.accent} size={4} />
            )}
          </div>
          {badge !== undefined && (
            <span 
              className="px-1 py-0.5 rounded-full text-[8px] font-bold"
              style={{ 
                backgroundColor: `${colors.accent}20`,
                color: colors.accent,
              }}
            >
              {badge}
            </span>
          )}
        </div>

        {/* Main value */}
        <div className="relative flex items-baseline gap-1">
          {circularProgress && progress !== undefined ? (
            <AnimatedCircularProgress
              value={progress}
              max={progressMax}
              size={32}
              strokeWidth={3}
              color={colors.accent}
              duration={1500}
            />
          ) : (
            <div 
              className="text-base font-bold transition-all duration-300"
              style={{ 
                color: colors.text,
                textShadow: isHovered ? `0 0 20px ${colors.glow}` : 'none',
              }}
            >
              {animated && typeof displayValue === 'object' ? (
                <>
                  {displayValue.prefix}
                  <AnimatedNumber 
                    value={displayValue.number} 
                    duration={1500}
                    decimals={displayValue.suffix.includes('B') || displayValue.suffix.includes('M') ? 2 : 0}
                  />
                  {displayValue.suffix}
                </>
              ) : (
                value
              )}
            </div>
          )}

          {/* Trend indicator */}
          {trend && (
            <div 
              className="flex items-center gap-0.5 text-[9px] font-medium"
              style={{ color: trend === 'up' ? COLORS.green.accent : trend === 'down' ? COLORS.red.accent : COLORS.default.accent }}
            >
              <TrendIcon className="w-2 h-2" />
              {trendValue && <span>{trendValue}</span>}
            </div>
          )}
        </div>

        {/* Subtitle */}
        {subtitle && (
          <div className="text-[9px] text-gray-500 mt-0.5">{subtitle}</div>
        )}

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 0 && (
          <div className="mt-1.5 -mx-0.5">
            <Sparkline
              data={sparklineData}
              width={140}
              height={20}
              color={colors.sparkline}
              fillOpacity={0.15}
              strokeWidth={1.5}
            />
          </div>
        )}

        {/* Progress bar */}
        {progress !== undefined && !circularProgress && (
          <div className="mt-1.5">
            <AnimatedProgressBar
              value={progress}
              max={progressMax}
              color={colors.accent}
              height={2}
              duration={1200}
            />
          </div>
        )}

        {/* Click indicator */}
        {onClick && (
          <div 
            className="absolute right-1.5 top-1/2 -translate-y-1/2 transition-all duration-300"
            style={{
              opacity: isHovered ? 1 : 0.3,
              transform: isHovered ? 'translate(0, -50%)' : 'translate(-4px, -50%)',
            }}
          >
            <ChevronRight className="w-3 h-3 text-gray-500" />
          </div>
        )}
      </div>
    </FadeIn>
  );
});

StatCard.displayName = 'StatCard';

// ============================================================================
// Enhanced Stat Card Grid
// ============================================================================

interface StatCardGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4 | 5;
  staggerDelay?: number;
}

export const StatCardGrid = memo(function StatCardGrid({
  children,
  columns = 4,
  staggerDelay = 100,
}: StatCardGridProps) {
  const gridCols = {
    2: 'grid-cols-2',
    3: 'grid-cols-3',
    4: 'grid-cols-4',
    5: 'grid-cols-5',
  };

  return (
    <div className={`grid ${gridCols[columns]} gap-1.5`}>
      {children}
    </div>
  );
});

// ============================================================================
// Mini Stat Card (for dashboards)
// ============================================================================

interface MiniStatCardProps {
  label: string;
  value: string | number;
  icon?: React.ReactNode;
  color?: keyof typeof COLORS;
  change?: number;
}

export const MiniStatCard = memo(function MiniStatCard({
  label,
  value,
  icon,
  color = 'cyan',
  change,
}: MiniStatCardProps) {
  const colors = COLORS[color];
  
  return (
    <div className="flex items-center gap-1.5 p-1.5 bg-gray-900/50 border border-gray-800 rounded hover:border-gray-700 transition-colors">
      {icon && (
        <div 
          className="p-1 rounded"
          style={{ backgroundColor: `${colors.accent}15` }}
        >
          <span style={{ color: colors.accent }}>{icon}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="text-[9px] text-gray-500 truncate">{label}</div>
        <div className="text-[11px] font-bold text-white">{value}</div>
      </div>
      {change !== undefined && (
        <div 
          className="text-[9px] font-medium"
          style={{ color: change >= 0 ? COLORS.green.accent : COLORS.red.accent }}
        >
          {change >= 0 ? '+' : ''}{change}%
        </div>
      )}
    </div>
  );
});

export default StatCard;
