/**
 * Progress Indicators - Comprehensive loading state components
 * 
 * Includes:
 * - Spinner (circular loading)
 * - ProgressBar (linear progress)
 * - SkeletonLoader (placeholder content)
 * - StepIndicator (multi-step progress)
 * - PulseLoader (subtle loading dots)
 * - DataLoadingOverlay (full container loading)
 * - InlineProgress (inline text with progress)
 * - LoadingScreen (smooth full-page loader with animated progress)
 */

import { memo, useEffect, useState, useRef } from 'react';
import { Check, Loader2, AlertCircle, Clock, Building2 } from 'lucide-react';

const COLORS = {
  cyan: '#00d2d3',
  green: '#2ed573',
  yellow: '#ffa502',
  red: '#ff4757',
  purple: '#a855f7',
  blue: '#3b82f6',
  bgCard: '#0d1219',
  border: '#1e293b',
  textMuted: '#5a6d8a',
};

// ============================================================================
// LOADING SCREEN - Smooth full-page loader with animated progress
// ============================================================================
interface LoadingScreenProps {
  facilities?: any[];
}

export const LoadingScreen = memo(function LoadingScreen({ facilities = [] }: LoadingScreenProps) {
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [statusText, setStatusText] = useState('Initializing...');
  const progressRef = useRef(0);
  const animationFrameRef = useRef<number>();
  
  useEffect(() => {
    let startTime = Date.now();
    const totalDuration = 2500; // 2.5 seconds
    
    // Keyframes for smooth animation
    const keyframes = [
      { time: 0, progress: 0, step: 0, text: 'Initializing...' },
      { time: 0.08, progress: 15, step: 0, text: 'Loading database...' },
      { time: 0.20, progress: 35, step: 0, text: 'Loading facilities...' },
      { time: 0.32, progress: 45, step: 0, text: 'Parsing data structures...' },
      { time: 0.44, progress: 55, step: 1, text: 'Building search index...' },
      { time: 0.56, progress: 65, step: 1, text: 'Optimizing queries...' },
      { time: 0.68, progress: 75, step: 1, text: 'Indexing complete...' },
      { time: 0.76, progress: 82, step: 2, text: 'Preparing UI...' },
      { time: 0.84, progress: 90, step: 2, text: 'Rendering components...' },
      { time: 0.92, progress: 97, step: 2, text: 'Finalizing...' },
      { time: 1.0, progress: 100, step: 2, text: 'Ready!' },
    ];
    
    // Smooth animation using requestAnimationFrame
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / totalDuration, 1); // 0 to 1
      
      // Find current keyframe
      let currentKeyframe = keyframes[0];
      let nextKeyframe = keyframes[1];
      
      for (let i = 0; i < keyframes.length - 1; i++) {
        if (t >= keyframes[i].time && t <= keyframes[i + 1].time) {
          currentKeyframe = keyframes[i];
          nextKeyframe = keyframes[i + 1];
          break;
        }
      }
      
      // Interpolate between keyframes with easing
      const segmentProgress = (t - currentKeyframe.time) / (nextKeyframe.time - currentKeyframe.time);
      const eased = easeOutCubic(Math.max(0, Math.min(1, segmentProgress)));
      const interpolatedProgress = currentKeyframe.progress + 
        (nextKeyframe.progress - currentKeyframe.progress) * eased;
      
      // Update state smoothly
      progressRef.current = interpolatedProgress;
      setProgress(interpolatedProgress);
      
      // Update step and text when crossing keyframe boundaries
      if (nextKeyframe.step !== currentKeyframe.step || nextKeyframe.text !== currentKeyframe.text) {
        if (segmentProgress > 0.1) { // Small delay before text change
          setCurrentStep(nextKeyframe.step);
          setStatusText(nextKeyframe.text);
        }
      }
      
      // Continue animation
      if (t < 1) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        setProgress(100);
        setCurrentStep(2);
        setStatusText('Ready!');
      }
    };
    
    // Ease-out cubic function
    function easeOutCubic(t: number): number {
      return 1 - Math.pow(1 - t, 3);
    }
    
    // Start animation
    animationFrameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  
  const facilityCount = facilities.length || 11992;
  
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-[#0a0e17] text-white">
      <div className="flex flex-col items-center gap-6 max-w-md w-full px-6">
        {/* Animated logo/ring with pulsing effect and glow */}
        <div className="relative">
          {/* Outer glow ring */}
          <div className="absolute -inset-2 w-24 h-24 bg-cyan-500/20 rounded-full blur-xl animate-pulse" />
          
          {/* Base ring */}
          <div className="relative w-20 h-20 border-4 border-[#1e293b] rounded-full" />
          
          {/* Animated spinner ring */}
          <div 
            className="absolute inset-0 w-20 h-20 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin"
            style={{ animationDuration: '0.6s', animationTimingFunction: 'linear' }}
          />
          
          {/* Inner pulsing glow */}
          <div className="absolute inset-0 w-20 h-20 bg-cyan-500/10 rounded-full animate-pulse" style={{ animationDuration: '2s' }} />
          
          {/* Icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 size={28} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(0,210,211,0.5)]" />
          </div>
        </div>
        
        {/* Title with fade-in effect */}
        <div className="text-center animate-fadeIn">
          <h1 className="text-xl font-bold text-[#e8eef6] mb-1">DCIM Command Center</h1>
          <p className="text-sm text-[#5a6d8a] transition-all duration-300 ease-in-out min-h-[20px]">
            {statusText}
          </p>
        </div>
        
        {/* Progress steps */}
        <div className="animate-fadeIn" style={{ animationDelay: '0.2s', animationFillMode: 'backwards' }}>
          <StepIndicator
            steps={[
              { id: 'data', label: 'Loading Data', description: `${facilityCount.toLocaleString()} facilities` },
              { id: 'index', label: 'Building Index', description: 'Search optimization' },
              { id: 'render', label: 'Rendering', description: 'UI components' },
            ]}
            currentStep={currentStep}
            size="sm"
          />
        </div>
        
        {/* Progress bar with smooth animation */}
        <div className="w-full animate-fadeIn" style={{ animationDelay: '0.3s', animationFillMode: 'backwards' }}>
          <ProgressBar 
            value={progress} 
            size="sm" 
            animated 
            striped 
            showLabel={true}
          />
        </div>
        
        {/* Subtle loading hint */}
        <div className="text-[10px] text-[#5a6d8a]/50 animate-pulse mt-2">
          Tracking {facilityCount.toLocaleString()} infrastructure facilities globally
        </div>
      </div>
    </div>
  );
});

// ============================================================================
// SPINNER - Circular loading indicator
// ============================================================================
interface SpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  label?: string;
  className?: string;
}

export const Spinner = memo(function Spinner({ 
  size = 'md', 
  color = COLORS.cyan,
  label,
  className = '',
}: SpinnerProps) {
  const sizeMap = {
    xs: 12,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
  };
  
  const px = sizeMap[size];
  
  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <Loader2 
        size={px} 
        className="animate-spin" 
        style={{ color }}
      />
      {label && (
        <span className="text-sm text-[#5a6d8a]">{label}</span>
      )}
    </div>
  );
});

// ============================================================================
// PROGRESS BAR - Linear progress indicator
// ============================================================================
interface ProgressBarProps {
  value: number; // 0-100
  max?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  color?: string;
  showLabel?: boolean;
  label?: string;
  animated?: boolean;
  striped?: boolean;
  className?: string;
}

export const ProgressBar = memo(function ProgressBar({
  value,
  max = 100,
  size = 'md',
  color = COLORS.cyan,
  showLabel = true,
  label,
  animated = true,
  striped = false,
  className = '',
}: ProgressBarProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  
  const sizeMap = {
    xs: 'h-1',
    sm: 'h-2',
    md: 'h-3',
    lg: 'h-4',
  };
  
  return (
    <div className={`w-full ${className}`}>
      {(showLabel || label) && (
        <div className="flex items-center justify-between mb-1">
          {label && <span className="text-xs text-[#5a6d8a]">{label}</span>}
          {showLabel && (
            <span className="text-xs font-medium text-[#e8eef6] tabular-nums">
              {percentage.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className={`w-full bg-[#1e293b] rounded-full overflow-hidden ${sizeMap[size]}`}>
        <div
          className={`${sizeMap[size]} rounded-full ${
            striped ? 'bg-gradient-to-r from-transparent via-white/10 to-transparent bg-[length:20px_100%]' : ''
          } ${animated && striped ? 'animate-[shimmer_1s_linear_infinite]' : ''}`}
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color,
            backgroundImage: striped 
              ? `linear-gradient(45deg, rgba(255,255,255,0.15) 25%, transparent 25%, transparent 50%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.15) 75%, transparent 75%, transparent)`
              : undefined,
            backgroundSize: striped ? '1rem 1rem' : undefined,
            transition: 'width 100ms linear', // Smooth 60fps updates
            willChange: 'width',
          }}
        />
      </div>
    </div>
  );
});

// ============================================================================
// SKELETON LOADER - Placeholder content while loading
// ============================================================================
interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
  animate?: boolean;
}

export const Skeleton = memo(function Skeleton({
  variant = 'text',
  width,
  height,
  lines = 1,
  className = '',
  animate = true,
}: SkeletonProps) {
  const baseClass = `bg-[#1e293b] ${animate ? 'animate-pulse' : ''}`;
  
  const variantClass = {
    text: 'h-4 rounded',
    circular: 'rounded-full',
    rectangular: '',
    rounded: 'rounded-lg',
  };
  
  const style: React.CSSProperties = {
    width: width || (variant === 'circular' ? height || 40 : '100%'),
    height: height || (variant === 'text' ? undefined : 40),
  };
  
  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={`${baseClass} ${variantClass[variant]}`}
            style={{ 
              ...style, 
              width: i === lines - 1 ? '75%' : '100%',
            }}
          />
        ))}
      </div>
    );
  }
  
  return (
    <div
      className={`${baseClass} ${variantClass[variant]} ${className}`}
      style={style}
    />
  );
});

// Card skeleton
export const SkeletonCard = memo(function SkeletonCard({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-[#0d1219] rounded-lg border border-[#1e293b] p-4 ${className}`}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="flex-1">
          <Skeleton variant="text" width="60%" className="mb-1" />
          <Skeleton variant="text" width="40%" height={12} />
        </div>
      </div>
      <Skeleton variant="text" lines={3} />
      <div className="flex gap-2 mt-3">
        <Skeleton variant="rounded" width={80} height={28} />
        <Skeleton variant="rounded" width={80} height={28} />
      </div>
    </div>
  );
});

// Table skeleton
export const SkeletonTable = memo(function SkeletonTable({ 
  rows = 5, 
  columns = 4,
  className = '' 
}: { 
  rows?: number; 
  columns?: number;
  className?: string;
}) {
  return (
    <div className={`bg-[#0d1219] rounded-lg border border-[#1e293b] overflow-hidden ${className}`}>
      {/* Header */}
      <div className="flex gap-4 p-3 border-b border-[#1e293b] bg-[#151c28]">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} variant="text" width={`${100 / columns}%`} height={14} />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 p-3 border-b border-[#1e293b] last:border-b-0">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <Skeleton key={colIdx} variant="text" width={`${100 / columns}%`} />
          ))}
        </div>
      ))}
    </div>
  );
});

// Chart skeleton
export const SkeletonChart = memo(function SkeletonChart({ 
  height = 200,
  className = '' 
}: { 
  height?: number;
  className?: string;
}) {
  return (
    <div className={`bg-[#0d1219] rounded-lg border border-[#1e293b] p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <Skeleton variant="text" width={120} />
        <Skeleton variant="rounded" width={60} height={24} />
      </div>
      <div className="flex items-end gap-2" style={{ height }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton 
            key={i} 
            variant="rounded" 
            width={`${100 / 12}%`} 
            height={`${30 + Math.random() * 70}%`}
          />
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// STEP INDICATOR - Multi-step progress
// ============================================================================
interface Step {
  id: string;
  label: string;
  description?: string;
}

interface StepIndicatorProps {
  steps: Step[];
  currentStep: number;
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StepIndicator = memo(function StepIndicator({
  steps,
  currentStep,
  orientation = 'horizontal',
  size = 'md',
  className = '',
}: StepIndicatorProps) {
  const sizeMap = {
    sm: { circle: 24, font: 'text-xs', gap: 'gap-1' },
    md: { circle: 32, font: 'text-sm', gap: 'gap-2' },
    lg: { circle: 40, font: 'text-base', gap: 'gap-3' },
  };
  
  const { circle, font, gap } = sizeMap[size];
  
  const isHorizontal = orientation === 'horizontal';
  
  return (
    <div className={`flex ${isHorizontal ? 'flex-row items-center' : 'flex-col'} ${gap} ${className}`}>
      {steps.map((step, index) => {
        const isCompleted = index < currentStep;
        const isCurrent = index === currentStep;
        const isPending = index > currentStep;
        
        return (
          <div 
            key={step.id}
            className={`flex ${isHorizontal ? 'flex-col items-center' : 'flex-row items-start'} ${gap}`}
          >
            <div className={`flex ${isHorizontal ? 'flex-row' : 'flex-col'} items-center`}>
              {/* Step circle */}
              <div
                className={`flex items-center justify-center rounded-full transition-all duration-300 ${
                  isCompleted 
                    ? 'bg-green-500' 
                    : isCurrent 
                      ? 'bg-cyan-500 ring-4 ring-cyan-500/20' 
                      : 'bg-[#1e293b]'
                }`}
                style={{ width: circle, height: circle }}
              >
                {isCompleted ? (
                  <Check size={circle * 0.5} className="text-white" />
                ) : isCurrent ? (
                  <Loader2 size={circle * 0.4} className="text-white animate-spin" />
                ) : (
                  <span className="text-[#5a6d8a]" style={{ fontSize: circle * 0.4 }}>
                    {index + 1}
                  </span>
                )}
              </div>
              
              {/* Connector line */}
              {index < steps.length - 1 && (
                <div
                  className={`${
                    isHorizontal ? 'w-8 h-0.5' : 'h-8 w-0.5'
                  } ${
                    isCompleted ? 'bg-green-500' : 'bg-[#1e293b]'
                  } transition-colors duration-300`}
                />
              )}
            </div>
            
            {/* Step label */}
            <div className={`${isHorizontal ? 'text-center mt-2' : 'ml-3'}`}>
              <div className={`${font} font-medium ${
                isCurrent ? 'text-cyan-400' : isCompleted ? 'text-green-400' : 'text-[#5a6d8a]'
              }`}>
                {step.label}
              </div>
              {step.description && (
                <div className="text-[10px] text-[#5a6d8a] mt-0.5">
                  {step.description}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
});

// ============================================================================
// PULSE LOADER - Subtle loading dots
// ============================================================================
interface PulseLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const PulseLoader = memo(function PulseLoader({
  size = 'md',
  color = COLORS.cyan,
  className = '',
}: PulseLoaderProps) {
  const sizeMap = { sm: 6, md: 8, lg: 12 };
  const px = sizeMap[size];
  
  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="rounded-full animate-pulse"
          style={{
            width: px,
            height: px,
            backgroundColor: color,
            animationDelay: `${i * 0.15}s`,
            animationDuration: '0.6s',
          }}
        />
      ))}
    </div>
  );
});

// ============================================================================
// DATA LOADING OVERLAY - Full container loading state
// ============================================================================
interface DataLoadingOverlayProps {
  isLoading: boolean;
  message?: string;
  progress?: number;
  children: React.ReactNode;
  blur?: boolean;
  className?: string;
}

export const DataLoadingOverlay = memo(function DataLoadingOverlay({
  isLoading,
  message = 'Loading...',
  progress,
  children,
  blur = true,
  className = '',
}: DataLoadingOverlayProps) {
  return (
    <div className={`relative ${className}`}>
      {children}
      {isLoading && (
        <div className={`absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0a0e17]/80 ${
          blur ? 'backdrop-blur-sm' : ''
        }`}>
          <Spinner size="lg" />
          <p className="mt-3 text-sm text-[#e8eef6]">{message}</p>
          {progress !== undefined && (
            <div className="w-48 mt-3">
              <ProgressBar value={progress} size="sm" />
            </div>
          )}
        </div>
      )}
    </div>
  );
});

// ============================================================================
// INLINE PROGRESS - Inline text with progress
// ============================================================================
interface InlineProgressProps {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
  className?: string;
}

export const InlineProgress = memo(function InlineProgress({
  current,
  total,
  label = 'Processing',
  showPercentage = true,
  className = '',
}: InlineProgressProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Loader2 size={14} className="animate-spin text-cyan-400" />
      <span className="text-xs text-[#5a6d8a]">
        {label}: {current.toLocaleString()}/{total.toLocaleString()}
        {showPercentage && <span className="ml-1 text-cyan-400">({percentage}%)</span>}
      </span>
    </div>
  );
});

// ============================================================================
// LOADING STATES - Pre-built loading states for common components
// ============================================================================
export const LoadingStates = {
  // Compact inline loading
  Inline: ({ text = 'Loading...' }: { text?: string }) => (
    <div className="flex items-center gap-2 text-xs text-[#5a6d8a]">
      <Loader2 size={12} className="animate-spin text-cyan-400" />
      {text}
    </div>
  ),
  
  // Full page loading
  FullPage: ({ message = 'Loading application...' }: { message?: string }) => (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0a0e17]">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#1e293b] rounded-full" />
          <div className="absolute inset-0 w-16 h-16 border-4 border-cyan-500 rounded-full border-t-transparent animate-spin" />
        </div>
        <p className="text-sm text-[#e8eef6]">{message}</p>
      </div>
    </div>
  ),
  
  // Empty state with loading
  Empty: ({ message = 'No data available' }: { message?: string }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 mb-3 rounded-full bg-[#1e293b]">
        <Clock size={24} className="text-[#5a6d8a]" />
      </div>
      <p className="text-sm text-[#5a6d8a]">{message}</p>
    </div>
  ),
  
  // Error state
  Error: ({ message = 'Failed to load data', onRetry }: { message?: string; onRetry?: () => void }) => (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="p-3 mb-3 rounded-full bg-red-500/10">
        <AlertCircle size={24} className="text-red-400" />
      </div>
      <p className="text-sm text-red-400 mb-2">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-3 py-1 text-xs font-medium text-cyan-400 bg-cyan-500/10 rounded-lg hover:bg-cyan-500/20 transition-colors"
        >
          Retry
        </button>
      )}
    </div>
  ),
};

// ============================================================================
// ANIMATED COUNTER WITH LOADING - Shows loading then animates to value
// ============================================================================
interface AnimatedValueProps {
  value: number;
  isLoading?: boolean;
  format?: (value: number) => string;
  duration?: number;
  className?: string;
}

export const AnimatedValue = memo(function AnimatedValue({
  value,
  isLoading = false,
  format = (v) => v.toLocaleString(),
  duration = 1000,
  className = '',
}: AnimatedValueProps) {
  const [displayValue, setDisplayValue] = useState(0);
  
  useEffect(() => {
    if (isLoading) return;
    
    const startTime = Date.now();
    const startValue = displayValue;
    const diff = value - startValue;
    
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // Ease out cubic
      
      setDisplayValue(startValue + diff * eased);
      
      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [value, isLoading, duration]);
  
  if (isLoading) {
    return <Skeleton variant="text" width={60} className={className} />;
  }
  
  return <span className={className}>{format(Math.round(displayValue))}</span>;
});

// ============================================================================
// PROGRESS RING - Circular progress indicator
// ============================================================================
interface ProgressRingProps {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  showLabel?: boolean;
  label?: string;
  className?: string;
}

export const ProgressRing = memo(function ProgressRing({
  value,
  max = 100,
  size = 60,
  strokeWidth = 6,
  color = COLORS.cyan,
  bgColor = COLORS.border,
  showLabel = true,
  label,
  className = '',
}: ProgressRingProps) {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;
  
  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-500 ease-out"
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-sm font-bold text-[#e8eef6]">
            {label || `${percentage.toFixed(0)}%`}
          </span>
        </div>
      )}
    </div>
  );
});

// Add shimmer keyframes to your global CSS or add this to the component
// @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

