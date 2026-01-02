import { useEffect, RefObject } from 'react';

interface KeyboardScrollOptions {
  /**
   * Amount to scroll per arrow key press (in pixels)
   * @default 40
   */
  step?: number;
  /**
   * Amount to scroll per page up/down press (in pixels)
   * @default 'viewport' (uses container height)
   */
  pageStep?: number | 'viewport';
  /**
   * Enable smooth scrolling animation
   * @default true
   */
  smooth?: boolean;
  /**
   * Enable Home/End key navigation
   * @default true
   */
  enableHomeEnd?: boolean;
}

/**
 * Custom hook to enable smooth keyboard scrolling in a container
 * Supports: Arrow Keys, Page Up/Down, Home/End, Space
 * 
 * @param containerRef - Ref to the scrollable container
 * @param options - Keyboard scroll configuration options
 * 
 * @example
 * ```tsx
 * const containerRef = useRef<HTMLDivElement>(null);
 * useKeyboardScroll(containerRef, { step: 50, smooth: true });
 * 
 * return <div ref={containerRef} tabIndex={0} style={{ overflow: 'auto' }}>...</div>
 * ```
 */
export function useKeyboardScroll(
  containerRef: RefObject<HTMLElement>,
  options: KeyboardScrollOptions = {}
) {
  const {
    step = 40,
    pageStep = 'viewport',
    smooth = true,
    enableHomeEnd = true,
  } = options;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we're in an input element or if a different scrollable element is focused
      const activeElement = document.activeElement as HTMLElement;
      
      // If an input/textarea/etc is focused, don't scroll
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement ||
        (e.target as HTMLElement)?.isContentEditable ||
        (e.target as HTMLElement)?.closest('[role="combobox"]') !== null ||
        (e.target as HTMLElement)?.getAttribute('role') === 'combobox'
      ) {
        return;
      }

      // If a different scrollable element is focused (not our container), let it handle the scroll
      if (activeElement && activeElement !== container && activeElement !== document.body) {
        const style = window.getComputedStyle(activeElement);
        if (style.overflowY === 'auto' || style.overflowY === 'scroll') {
          // Let the focused element handle the scroll
          return;
        }
      }

      let scrollAmount = 0;
      let handled = false;

      switch (e.key) {
        case 'ArrowDown':
          scrollAmount = step;
          handled = true;
          break;
        case 'ArrowUp':
          scrollAmount = -step;
          handled = true;
          break;
        case 'PageDown':
        case ' ': // Space key
          if (e.key === ' ' && e.shiftKey) return; // Shift+Space for page up
          scrollAmount = pageStep === 'viewport' ? container.clientHeight * 0.8 : pageStep;
          handled = true;
          break;
        case 'PageUp':
          scrollAmount = -(pageStep === 'viewport' ? container.clientHeight * 0.8 : pageStep);
          handled = true;
          break;
        case 'Home':
          if (enableHomeEnd) {
            container.scrollTo({
              top: 0,
              behavior: smooth ? 'smooth' : 'auto',
            });
            handled = true;
          }
          break;
        case 'End':
          if (enableHomeEnd) {
            container.scrollTo({
              top: container.scrollHeight,
              behavior: smooth ? 'smooth' : 'auto',
            });
            handled = true;
          }
          break;
      }

      if (handled && scrollAmount !== 0) {
        e.preventDefault();
        container.scrollBy({
          top: scrollAmount,
          behavior: smooth ? 'smooth' : 'auto',
        });
      } else if (handled) {
        e.preventDefault();
      }
    };

    // Auto-focus the container when it's mounted if it's not already focused
    const handleFocus = () => {
      // Add visual indicator that keyboard scrolling is active
      container.setAttribute('data-keyboard-scroll', 'true');
    };

    const handleBlur = () => {
      container.removeAttribute('data-keyboard-scroll');
    };

    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('focus', handleFocus);
    container.addEventListener('blur', handleBlur);

    // Auto-focus if nothing else is focused
    if (!document.activeElement || document.activeElement === document.body) {
      container.focus();
    }

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('focus', handleFocus);
      container.removeEventListener('blur', handleBlur);
    };
  }, [containerRef, step, pageStep, smooth, enableHomeEnd]);
}

