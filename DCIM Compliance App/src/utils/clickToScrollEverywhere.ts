/**
 * Auto-enable click-to-scroll for all scrollable elements
 * Runs on page load and watches for new elements
 */

export function initClickToScrollEverywhere() {
  const processedElements = new WeakSet<HTMLElement>();
  let intervalId: number | null = null;

  function makeScrollableClickable(element: HTMLElement) {
    if (processedElements.has(element)) return;
    
    const style = window.getComputedStyle(element);
    const isScrollable = 
      (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
      element.scrollHeight > element.clientHeight;

    if (!isScrollable) return;

    // Mark as processed
    processedElements.add(element);

    // Make focusable
    if (!element.hasAttribute('tabindex') && 
        element.tagName !== 'INPUT' && 
        element.tagName !== 'BUTTON' &&
        element.tagName !== 'A' &&
        element.tagName !== 'TEXTAREA' &&
        element.tagName !== 'SELECT') {
      element.setAttribute('tabindex', '0');
    }

    // Add click handler
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Don't interfere with interactive elements
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'BUTTON' ||
        target.tagName === 'A' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.closest('button') ||
        target.closest('a') ||
        target.closest('input') ||
        target.closest('[role="combobox"]') ||
        target.getAttribute('role') === 'combobox'
      ) {
        return;
      }

      // Focus the element
      element.focus({ preventScroll: true });
    };

    // Add keyboard scroll handler directly to this element
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only handle if this element is focused
      if (document.activeElement !== element) return;

      let scrollAmount = 0;
      let handled = false;

      switch (e.key) {
        case 'ArrowDown':
          scrollAmount = 60;
          handled = true;
          break;
        case 'ArrowUp':
          scrollAmount = -60;
          handled = true;
          break;
        case 'PageDown':
          scrollAmount = element.clientHeight * 0.8;
          handled = true;
          break;
        case 'PageUp':
          scrollAmount = -(element.clientHeight * 0.8);
          handled = true;
          break;
        case ' ':
          if (!e.shiftKey) {
            scrollAmount = element.clientHeight * 0.8;
            handled = true;
          }
          break;
        case 'Home':
          element.scrollTo({ top: 0, behavior: 'smooth' });
          handled = true;
          break;
        case 'End':
          element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' });
          handled = true;
          break;
      }

      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        
        if (scrollAmount !== 0) {
          element.scrollBy({
            top: scrollAmount,
            behavior: 'smooth'
          });
        }
      }
    };

    // Visual feedback
    const handleFocus = () => {
      element.style.outline = '2px solid rgba(245, 158, 11, 0.5)';
      element.style.outlineOffset = '-2px';
    };

    const handleBlur = () => {
      element.style.outline = '';
      element.style.outlineOffset = '';
    };

    element.addEventListener('click', handleClick);
    element.addEventListener('keydown', handleKeyDown);
    element.addEventListener('focus', handleFocus);
    element.addEventListener('blur', handleBlur);

    // Store cleanup
    (element as any).__scrollCleanup = () => {
      element.removeEventListener('click', handleClick);
      element.removeEventListener('keydown', handleKeyDown);
      element.removeEventListener('focus', handleFocus);
      element.removeEventListener('blur', handleBlur);
    };
  }

  // Process all existing scrollable elements
  function processAllScrollables() {
    const selectors = [
      '[style*="overflow-y: auto"]',
      '[style*="overflow-y: scroll"]',
      '[style*="overflow: auto"]',
      '.overflow-auto',
      '.overflow-y-auto',
      '.main-scroll',
      '.content-scroll',
      '[role="tabpanel"]',
    ];

    selectors.forEach(selector => {
      document.querySelectorAll<HTMLElement>(selector).forEach(makeScrollableClickable);
    });
  }

  // Initial processing
  processAllScrollables();

  // Watch for new elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          makeScrollableClickable(element);
          
          // Check likely scroll containers inside the added subtree (avoid scanning all divs)
          const selectors = ['.overflow-auto', '.overflow-y-auto', '.main-scroll', '.content-scroll', '[role="tabpanel"]'];
          selectors.forEach((sel) => element.querySelectorAll<HTMLElement>(sel).forEach(makeScrollableClickable));
        }
      });
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Re-process on route changes or tab switches
  let lastUrl = window.location.href;
  const checkUrlChange = () => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(processAllScrollables, 100);
    }
  };
  intervalId = window.setInterval(checkUrlChange, 800);

  // Cleanup function
  return () => {
    observer.disconnect();
    if (intervalId !== null) {
      window.clearInterval(intervalId);
      intervalId = null;
    }
    document.querySelectorAll<HTMLElement>('[tabindex="0"]').forEach(el => {
      if ((el as any).__scrollCleanup) {
        (el as any).__scrollCleanup();
      }
    });
  };
}

