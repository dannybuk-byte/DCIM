import { useEffect } from 'react';

/**
 * Custom hook to make an element keyboard-scrollable when clicked
 * Usage: Add to any scrollable component
 */
export function useClickToScroll(ref: React.RefObject<HTMLElement>, enabled: boolean = true) {
  useEffect(() => {
    if (!enabled || !ref.current) return;

    const element = ref.current;

    // Make element focusable
    if (!element.hasAttribute('tabindex')) {
      element.setAttribute('tabindex', '0');
    }

    // Focus on click
    const handleClick = (e: MouseEvent) => {
      // Don't focus if clicking on interactive elements
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('[role="combobox"]')
      ) {
        return;
      }

      // Focus the scrollable container
      element.focus();
    };

    // Visual feedback when focused
    const handleFocus = () => {
      element.style.outline = '2px solid rgba(245, 158, 11, 0.3)';
      element.style.outlineOffset = '-2px';
    };

    const handleBlur = () => {
      element.style.outline = '';
      element.style.outlineOffset = '';
    };

    element.addEventListener('click', handleClick);
    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    return () => {
      element.removeEventListener('click', handleClick);
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }, [ref, enabled]);
}

/**
 * Make a component click-to-scroll enabled
 * Adds the necessary attributes and event handlers
 */
export function makeClickScrollable(element: HTMLElement) {
  if (!element) return;

  // Make focusable
  element.setAttribute('tabindex', '0');
  element.style.outline = 'none';
  
  // Add cursor hint
  element.style.cursor = 'default';
  
  // Handle click
  element.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Don't focus if clicking interactive elements
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'BUTTON' ||
      target.tagName === 'A' ||
      target.closest('button') ||
      target.closest('a')
    ) {
      return;
    }
    
    element.focus();
  });

  // Visual feedback
  element.addEventListener('focus', () => {
    element.style.outline = '2px solid rgba(245, 158, 11, 0.5)';
    element.style.outlineOffset = '-2px';
  });

  element.addEventListener('blur', () => {
    element.style.outline = 'none';
  });
}

