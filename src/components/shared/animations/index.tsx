/**
 * Animation Utilities and Components
 * Provides reusable animations, hooks, and components for the DCIM dashboard
 */

import { memo, useEffect, useRef, useState, useCallback, ReactNode, CSSProperties } from 'react';

// ============================================================================
// Animation Hooks
// ============================================================================

/**
 * Animated counter hook - counts up/down to target value
 */
export function useAnimatedCounter(
  target: number,
  duration: number = 1500,
  enabled: boolean = true
): number {
  const [current, setCurrent] = useState(enabled ? 0 : target);
  const startTime = useRef<number | null>(null);
  const startValue = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setCurrent(target);
      return;
    }

    startValue.current = current;
    startTime.current = null;

    const animate = (timestamp: number) => {
      if (!startTime.current) startTime.current = timestamp;
      const elapsed = timestamp - startTime.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const value = startValue.current + (target - startValue.current) * eased;
      
      setCurrent(value);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    requestAnimationFrame(animate);
  }, [target, duration, enabled]);

  return current;
}

/**
 * Staggered animation hook for list items
 */
export function useStaggeredAnimation(
  itemCount: number,
  delayPerItem: number = 50,
  enabled: boolean = true
): boolean[] {
  const [visible, setVisible] = useState<boolean[]>([]);

  useEffect(() => {
    if (!enabled) {
      setVisible(Array(itemCount).fill(true));
      return;
    }

    setVisible(Array(itemCount).fill(false));
    
    const timers: NodeJS.Timeout[] = [];
    for (let i = 0; i < itemCount; i++) {
      timers.push(
        setTimeout(() => {
          setVisible(prev => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        }, i * delayPerItem)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [itemCount, delayPerItem, enabled]);

  return visible;
}

/**
 * Intersection observer hook for scroll-triggered animations
 */
export function useInView(
  threshold: number = 0.1
): [React.RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [threshold]);

  return [ref, inView];
}

/**
 * Pulse animation state hook
 */
export function usePulse(interval: number = 2000): boolean {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulse(true);
      setTimeout(() => setPulse(false), 300);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return pulse;
}

// ============================================================================
// Animation Components
// ============================================================================

/**
 * Animated number display with counting effect
 */
export const AnimatedNumber = memo(function AnimatedNumber({
  value,
  duration = 1500,
  prefix = '',
  suffix = '',
  decimals = 0,
  className = '',
}: {
  value: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
}) {
  const animated = useAnimatedCounter(value, duration);
  const formatted = decimals > 0 
    ? animated.toFixed(decimals) 
    : Math.round(animated).toLocaleString();

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
});

/**
 * Fade-in wrapper component
 */
export const FadeIn = memo(function FadeIn({
  children,
  delay = 0,
  duration = 300,
  className = '',
  direction = 'up',
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  const transforms: Record<string, string> = {
    up: 'translateY(20px)',
    down: 'translateY(-20px)',
    left: 'translateX(20px)',
    right: 'translateX(-20px)',
    none: 'translateY(0)',
  };

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) translateX(0)' : transforms[direction],
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
});

/**
 * Scale-in animation wrapper
 */
export const ScaleIn = memo(function ScaleIn({
  children,
  delay = 0,
  duration = 300,
  className = '',
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'scale(1)' : 'scale(0.9)',
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
});

/**
 * Staggered list animation wrapper
 */
export const StaggeredList = memo(function StaggeredList({
  children,
  delayPerItem = 50,
  className = '',
}: {
  children: ReactNode[];
  delayPerItem?: number;
  className?: string;
}) {
  const visible = useStaggeredAnimation(children.length, delayPerItem);

  return (
    <div className={className}>
      {children.map((child, i) => (
        <div
          key={i}
          style={{
            opacity: visible[i] ? 1 : 0,
            transform: visible[i] ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 200ms ease-out, transform 200ms ease-out',
          }}
        >
          {child}
        </div>
      ))}
    </div>
  );
});

/**
 * Pulsing dot indicator
 */
export const PulsingDot = memo(function PulsingDot({
  color = '#2ed573',
  size = 8,
  className = '',
}: {
  color?: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={`relative inline-flex ${className}`}>
      <span
        className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
        style={{ backgroundColor: color }}
      />
      <span
        className="relative inline-flex rounded-full"
        style={{ width: size, height: size, backgroundColor: color }}
      />
    </span>
  );
});

/**
 * Animated progress bar
 */
export const AnimatedProgressBar = memo(function AnimatedProgressBar({
  value,
  max = 100,
  color = '#00d2d3',
  backgroundColor = '#1a1f2e',
  height = 6,
  duration = 1000,
  showGlow = true,
  className = '',
}: {
  value: number;
  max?: number;
  color?: string;
  backgroundColor?: string;
  height?: number;
  duration?: number;
  showGlow?: boolean;
  className?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const animatedPercentage = useAnimatedCounter(percentage, duration);

  return (
    <div
      className={`relative overflow-hidden rounded-full ${className}`}
      style={{ height, backgroundColor }}
    >
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all"
        style={{
          width: `${animatedPercentage}%`,
          backgroundColor: color,
          boxShadow: showGlow ? `0 0 10px ${color}50` : 'none',
        }}
      />
    </div>
  );
});

/**
 * Animated circular progress
 */
export const AnimatedCircularProgress = memo(function AnimatedCircularProgress({
  value,
  max = 100,
  size = 60,
  strokeWidth = 4,
  color = '#00d2d3',
  backgroundColor = '#1a1f2e',
  duration = 1500,
  showValue = true,
  className = '',
}: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  backgroundColor?: string;
  duration?: number;
  showValue?: boolean;
  className?: string;
}) {
  const percentage = Math.min((value / max) * 100, 100);
  const animatedPercentage = useAnimatedCounter(percentage, duration);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (animatedPercentage / 100) * circumference;

  return (
    <div className={`relative inline-flex ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: `stroke-dashoffset ${duration}ms ease-out`,
            filter: `drop-shadow(0 0 4px ${color}50)`,
          }}
        />
      </svg>
      {showValue && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-bold text-white">
            {Math.round(animatedPercentage)}%
          </span>
        </div>
      )}
    </div>
  );
});

/**
 * Sparkline mini chart
 */
export const Sparkline = memo(function Sparkline({
  data,
  width = 80,
  height = 24,
  color = '#00d2d3',
  fillOpacity = 0.2,
  strokeWidth = 1.5,
  className = '',
  animated = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fillOpacity?: number;
  strokeWidth?: number;
  className?: string;
  animated?: boolean;
}) {
  const [pathLength, setPathLength] = useState(0);
  const pathRef = useRef<SVGPathElement>(null);

  useEffect(() => {
    if (pathRef.current) {
      setPathLength(pathRef.current.getTotalLength());
    }
  }, [data]);

  if (data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((value, i) => ({
    x: (i / (data.length - 1)) * width,
    y: height - ((value - min) / range) * (height - 4) - 2,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ');

  const areaPath = `${linePath} L ${width} ${height} L 0 ${height} Z`;

  return (
    <svg width={width} height={height} className={className}>
      <defs>
        <linearGradient id={`sparkline-gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <path
        d={areaPath}
        fill={`url(#sparkline-gradient-${color.replace('#', '')})`}
      />
      <path
        ref={pathRef}
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={animated && pathLength ? {
          strokeDasharray: pathLength,
          strokeDashoffset: 0,
          animation: 'sparkline-draw 1s ease-out forwards',
        } : {}}
      />
      <style>{`
        @keyframes sparkline-draw {
          from { stroke-dashoffset: ${pathLength}; }
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </svg>
  );
});

/**
 * Animated donut chart
 */
export const AnimatedDonut = memo(function AnimatedDonut({
  segments,
  size = 120,
  strokeWidth = 20,
  duration = 1500,
  className = '',
  showLegend = true,
}: {
  segments: Array<{ value: number; color: string; label: string }>;
  size?: number;
  strokeWidth?: number;
  duration?: number;
  className?: string;
  showLegend?: boolean;
}) {
  const [animated, setAnimated] = useState(false);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const total = segments.reduce((sum, s) => sum + s.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;

  let currentOffset = 0;

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {segments.map((segment, i) => {
          const percentage = (segment.value / total) * 100;
          const dashLength = (percentage / 100) * circumference;
          const offset = currentOffset;
          currentOffset += dashLength;

          return (
            <circle
              key={i}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${animated ? dashLength : 0} ${circumference}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              style={{
                transition: `stroke-dasharray ${duration}ms ease-out`,
                filter: `drop-shadow(0 0 4px ${segment.color}40)`,
              }}
            />
          );
        })}
      </svg>
      {showLegend && (
        <div className="space-y-1">
          {segments.map((segment, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: segment.color }}
              />
              <span className="text-gray-400">{segment.label}</span>
              <span className="text-white font-medium">
                {((segment.value / total) * 100).toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

/**
 * Animated bar chart
 */
export const AnimatedBarChart = memo(function AnimatedBarChart({
  data,
  width = 200,
  height = 100,
  barWidth = 20,
  gap = 8,
  duration = 1000,
  className = '',
  showLabels = true,
}: {
  data: Array<{ value: number; label: string; color: string }>;
  width?: number;
  height?: number;
  barWidth?: number;
  gap?: number;
  duration?: number;
  className?: string;
  showLabels?: boolean;
}) {
  const max = Math.max(...data.map(d => d.value));
  const totalWidth = data.length * (barWidth + gap) - gap;
  const offsetX = (width - totalWidth) / 2;

  return (
    <div className={className}>
      <svg width={width} height={height + (showLabels ? 20 : 0)}>
        {data.map((item, i) => {
          const barHeight = (item.value / max) * height;
          const x = offsetX + i * (barWidth + gap);

          return (
            <g key={i}>
              <rect
                x={x}
                y={height}
                width={barWidth}
                height={0}
                fill={item.color}
                rx={2}
                style={{
                  animation: `bar-grow-${i} ${duration}ms ease-out forwards`,
                  animationDelay: `${i * 100}ms`,
                  filter: `drop-shadow(0 0 4px ${item.color}40)`,
                }}
              />
              {showLabels && (
                <text
                  x={x + barWidth / 2}
                  y={height + 14}
                  textAnchor="middle"
                  className="fill-gray-500 text-[9px]"
                >
                  {item.label}
                </text>
              )}
              <style>{`
                @keyframes bar-grow-${i} {
                  to {
                    y: ${height - barHeight};
                    height: ${barHeight}px;
                  }
                }
              `}</style>
            </g>
          );
        })}
      </svg>
    </div>
  );
});

/**
 * Glow effect wrapper
 */
export const GlowWrapper = memo(function GlowWrapper({
  children,
  color = '#00d2d3',
  intensity = 0.3,
  blur = 20,
  className = '',
}: {
  children: ReactNode;
  color?: string;
  intensity?: number;
  blur?: number;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <div
        className="absolute inset-0 rounded-lg"
        style={{
          background: color,
          opacity: intensity,
          filter: `blur(${blur}px)`,
        }}
      />
      <div className="relative">{children}</div>
    </div>
  );
});

/**
 * Hover scale effect wrapper
 */
export const HoverScale = memo(function HoverScale({
  children,
  scale = 1.02,
  duration = 200,
  className = '',
}: {
  children: ReactNode;
  scale?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={`transition-transform ${className}`}
      style={{
        transitionDuration: `${duration}ms`,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = `scale(${scale})`;
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLDivElement).style.transform = 'scale(1)';
      }}
    >
      {children}
    </div>
  );
});

/**
 * Shimmer loading effect
 */
export const ShimmerEffect = memo(function ShimmerEffect({
  width = '100%',
  height = 20,
  borderRadius = 4,
  className = '',
}: {
  width?: string | number;
  height?: number;
  borderRadius?: number;
  className?: string;
}) {
  return (
    <div
      className={`relative overflow-hidden ${className}`}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, #1a1f2e 25%, #252b3d 50%, #1a1f2e 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
});

/**
 * Floating animation wrapper
 */
export const FloatingElement = memo(function FloatingElement({
  children,
  amplitude = 5,
  duration = 3000,
  className = '',
}: {
  children: ReactNode;
  amplitude?: number;
  duration?: number;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{
        animation: `float ${duration}ms ease-in-out infinite`,
      }}
    >
      {children}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-${amplitude}px); }
        }
      `}</style>
    </div>
  );
});

/**
 * Typewriter text effect
 */
export const TypewriterText = memo(function TypewriterText({
  text,
  speed = 50,
  className = '',
  onComplete,
}: {
  text: string;
  speed?: number;
  className?: string;
  onComplete?: () => void;
}) {
  const [displayText, setDisplayText] = useState('');

  useEffect(() => {
    let i = 0;
    setDisplayText('');
    
    const timer = setInterval(() => {
      if (i < text.length) {
        setDisplayText(text.slice(0, i + 1));
        i++;
      } else {
        clearInterval(timer);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(timer);
  }, [text, speed, onComplete]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">|</span>
    </span>
  );
});

// Export all
export default {
  useAnimatedCounter,
  useStaggeredAnimation,
  useInView,
  usePulse,
  AnimatedNumber,
  FadeIn,
  ScaleIn,
  StaggeredList,
  PulsingDot,
  AnimatedProgressBar,
  AnimatedCircularProgress,
  Sparkline,
  AnimatedDonut,
  AnimatedBarChart,
  GlowWrapper,
  HoverScale,
  ShimmerEffect,
  FloatingElement,
  TypewriterText,
};

