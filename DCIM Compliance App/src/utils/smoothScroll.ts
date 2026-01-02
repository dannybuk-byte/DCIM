/**
 * Smooth scrolling utility with performance optimizations
 * Provides smooth native scrolling experience across all browsers
 * Uses requestAnimationFrame for native wheel event smoothing
 */

interface SmoothScrollOptions {
  behavior?: 'smooth' | 'auto';
  block?: 'start' | 'center' | 'end' | 'nearest';
  inline?: 'start' | 'center' | 'end' | 'nearest';
}

// Native wheel event smoothing
class SmoothWheelHandler {
  private target: HTMLElement;
  private accumulatedDelta: number = 0;
  private rafId: number | null = null;
  private lastTime: number = 0;

  constructor(target: HTMLElement) {
    this.target = target;
  }

  private smoothScroll = (currentTime: number) => {
    if (!this.lastTime) this.lastTime = currentTime;
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (Math.abs(this.accumulatedDelta) > 0.5) {
      const scrollAmount = this.accumulatedDelta * (deltaTime / 16.67); // Normalize to 60fps
      this.target.scrollTop += scrollAmount;
      this.accumulatedDelta *= 0.9; // Decay
      this.rafId = requestAnimationFrame(this.smoothScroll);
    } else {
      this.accumulatedDelta = 0;
      this.rafId = null;
    }
  };

  handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    this.accumulatedDelta += e.deltaY * 0.3; // Smoothing factor
    
    if (!this.rafId) {
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this.smoothScroll);
    }
  };

  destroy() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

// Polyfill for smooth scrolling
function smoothScrollPolyfill(
  element: HTMLElement,
  target: number,
  duration: number = 300
): void {
  const start = element.scrollTop;
  const distance = target - start;
  const startTime = performance.now();

  function easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function animate(currentTime: number): void {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = easeInOutCubic(progress);

    element.scrollTop = start + distance * ease;

    if (progress < 1) {
      requestAnimationFrame(animate);
    }
  }

  requestAnimationFrame(animate);
}

// Enhanced scrollTo with fallback
export function smoothScrollTo(
  element: HTMLElement,
  options: SmoothScrollOptions = {}
): void {
  const { behavior = 'smooth', block = 'start' } = options;

  if (behavior === 'smooth' && 'scrollBehavior' in document.documentElement.style) {
    element.scrollTo({ behavior: 'smooth', top: 0, ...options });
  } else {
    smoothScrollPolyfill(element, 0, 300);
  }
}

// Initialize smooth scrolling for all scrollable containers with enhanced momentum
export function initSmoothScrolling(): () => void {
  let isScrolling = false;
  let scrollTimeout: NodeJS.Timeout | null = null;
  const smoothHandlers = new Map<HTMLElement, SmoothWheelHandler>();

  // Optimize scroll performance by disabling interactions during scroll
  let scrollThrottleTimeout: NodeJS.Timeout | null = null;
  const handleScrollStart = () => {
    if (scrollThrottleTimeout) return; // Throttle to ~60fps
    
    if (!isScrolling) {
      isScrolling = true;
      document.body.classList.add('scrolling');
    }
    if (scrollTimeout) clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      isScrolling = false;
      document.body.classList.remove('scrolling');
    }, 150);
    
    scrollThrottleTimeout = setTimeout(() => {
      scrollThrottleTimeout = null;
    }, 16); // ~60fps
  };

  // Enhanced wheel handler with momentum scrolling
  const handleWheel = (e: WheelEvent) => {
    const target = e.currentTarget as HTMLElement;
    if (target.scrollHeight <= target.clientHeight) return;
    
    handleScrollStart();
    
    // Initialize smooth scrolling optimizations for this element
    if (!target.dataset.smoothInit) {
      target.style.scrollBehavior = 'smooth';
      target.style.setProperty('-webkit-overflow-scrolling', 'touch');
      target.style.transform = 'translate3d(0, 0, 0)';
      target.style.willChange = 'scroll-position';
      target.style.contain = 'layout style paint size';
      target.style.contentVisibility = 'auto';
      target.style.backfaceVisibility = 'hidden';
      target.style.perspective = '1000px';
      target.style.overscrollBehavior = 'contain';
      target.style.scrollPadding = '0';
      target.dataset.smoothInit = 'true';
    }
  };

  // Apply to all scrollable elements
  const applySmoothScrolling = () => {
    const scrollableElements = document.querySelectorAll(
      '.overflow-auto, .overflow-y-auto, .overflow-x-auto, [style*="overflow"]'
    );

    scrollableElements.forEach((el) => {
      const element = el as HTMLElement;
      if (!element.dataset.smoothInit) {
        element.style.scrollBehavior = 'smooth';
        element.style.setProperty('-webkit-overflow-scrolling', 'touch');
        element.style.transform = 'translate3d(0, 0, 0)';
        element.style.willChange = 'scroll-position';
        element.style.contain = 'layout style paint';
        element.style.overscrollBehavior = 'contain';
        element.style.scrollPadding = '0';
        element.dataset.smoothInit = 'true';
        
        // Add passive listeners for better performance with momentum
        element.addEventListener('wheel', handleWheel, { passive: true });
        element.addEventListener('scroll', handleScrollStart, { passive: true });
        element.addEventListener('touchstart', handleScrollStart, { passive: true });
        element.addEventListener('touchmove', handleScrollStart, { passive: true });
      }
    });
  };

  // Initial application
  applySmoothScrolling();

  // Re-apply when DOM changes (for dynamically added content)
  const observer = new MutationObserver(() => {
    // Debounce to avoid excessive calls
    setTimeout(applySmoothScrolling, 100);
  });
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Cleanup function
  return () => {
    observer.disconnect();
    if (scrollTimeout) clearTimeout(scrollTimeout);
    document.body.classList.remove('scrolling');
    document.querySelectorAll('[data-smooth-init]').forEach((el) => {
      const element = el as HTMLElement;
      element.removeEventListener('wheel', handleWheel);
      element.removeEventListener('scroll', handleScrollStart);
      
      // Clean up smooth handlers
      const handler = smoothHandlers.get(element);
      if (handler) {
        handler.destroy();
        smoothHandlers.delete(element);
      }
    });
    smoothHandlers.clear();
  };
}

// Throttle function for scroll events
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Debounce function for scroll events
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return function (this: any, ...args: Parameters<T>) {
    const context = this;
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), wait);
  };
}

