/**
 * Animation Utilities
 * Provides reusable animation functions and hooks for engaging UI
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Animated Counter Hook
 * Counts from 0 to target value with easing
 */
export const useAnimatedCounter = (
  target: number,
  duration: number = 2000,
  decimals: number = 0
): number => {
  const [count, setCount] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const frameRef = useRef<number>();

  useEffect(() => {
    startTimeRef.current = null;
    
    const animate = (currentTime: number) => {
      if (!startTimeRef.current) startTimeRef.current = currentTime;
      const elapsed = currentTime - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out cubic)
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = target * eased;
      
      setCount(current);
      
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };
    
    frameRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [target, duration]);

  return Math.round(count * Math.pow(10, decimals)) / Math.pow(10, decimals);
};

/**
 * Pulse Animation Hook
 * Returns true/false for pulsing effect
 */
export const usePulse = (interval: number = 1500): boolean => {
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setPulse(prev => !prev);
    }, interval);

    return () => clearInterval(timer);
  }, [interval]);

  return pulse;
};

/**
 * Stagger Animation Hook
 * Returns index-based delays for staggered animations
 */
export const useStaggerDelay = (index: number, delayMs: number = 50): number => {
  return index * delayMs;
};

/**
 * Shimmer Loading Animation
 * CSS class for shimmer effect
 */
export const shimmerAnimation = `
  @keyframes shimmer {
    0% {
      background-position: -1000px 0;
    }
    100% {
      background-position: 1000px 0;
    }
  }
`;

/**
 * Particle Effect Generator
 * Generates random particles for background effects
 */
export interface Particle {
  id: string;
  x: number;
  y: number;
  size: number;
  speedX: number;
  speedY: number;
  opacity: number;
}

export const generateParticles = (count: number): Particle[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `particle-${i}`,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 3 + 1,
    speedX: (Math.random() - 0.5) * 0.2,
    speedY: (Math.random() - 0.5) * 0.2,
    opacity: Math.random() * 0.3 + 0.1,
  }));
};

/**
 * Animated Particle Background Hook
 */
export const useAnimatedParticles = (count: number = 50, paused: boolean = false) => {
  const [particles, setParticles] = useState<Particle[]>(() => generateParticles(count));
  const frameRef = useRef<number>();

  useEffect(() => {
    if (paused) {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = undefined;
      }
      return;
    }

    const animate = () => {
      setParticles((prev) =>
        prev.map((p) => ({
          ...p,
          x: (p.x + p.speedX + 100) % 100,
          y: (p.y + p.speedY + 100) % 100,
        }))
      );
      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current !== undefined) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, [paused]);

  return particles;
};

/**
 * Progress Bar Animation Hook
 * Animates progress from 0 to target
 */
export const useAnimatedProgress = (target: number, duration: number = 1500): number => {
  return useAnimatedCounter(target, duration, 2);
};

/**
 * Hover Scale Effect Class
 */
export const hoverScaleClass = 'transition-transform duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-cyan-500/20';

/**
 * Card Animation Classes
 */
export const cardAnimationClass = 'transition-all duration-300 hover:border-cyan-400/60 hover:bg-slate-800/80 hover:shadow-lg hover:shadow-cyan-500/10';

/**
 * Glow Effect Class
 */
export const glowEffectClass = 'transition-all duration-300 hover:drop-shadow-[0_0_15px_rgba(34,211,238,0.4)]';

/**
 * Pulse Class
 */
export const pulseClass = 'animate-pulse';

/**
 * Bounce Class
 */
export const bounceClass = 'animate-bounce';

/**
 * Spin Class
 */
export const spinClass = 'animate-spin';

/**
 * Fade In Animation
 */
export const fadeInClass = 'animate-fade-in';

/**
 * Slide In Animation
 */
export const slideInClass = 'animate-slide-in';

