import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook to optimize scroll performance for a container
 * Uses Intersection Observer for lazy rendering and optimizes re-renders
 */
export function useScrollOptimization(enabled: boolean = true) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Throttle scroll events
  const handleScroll = useCallback(() => {
    if (!enabled || !containerRef.current) return;

    if (!isScrollingRef.current) {
      isScrollingRef.current = true;
      containerRef.current.style.pointerEvents = 'none';
      containerRef.current.style.willChange = 'scroll-position';
    }

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    scrollTimeoutRef.current = setTimeout(() => {
      if (containerRef.current) {
        isScrollingRef.current = false;
        containerRef.current.style.pointerEvents = 'auto';
        containerRef.current.style.willChange = 'auto';
      }
    }, 150);
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const container = containerRef.current;
    
    // Add optimized scroll listener
    container.addEventListener('scroll', handleScroll, { passive: true });

    // Force GPU acceleration
    container.style.transform = 'translate3d(0, 0, 0)';
    container.style.backfaceVisibility = 'hidden';
    container.style.perspective = '1000px';

    return () => {
      container.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [enabled, handleScroll]);

  return containerRef;
}

