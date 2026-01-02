/**
 * Enhanced Scroll Manager
 * Improves scrolling experience across the entire app
 */

export function initEnhancedScrolling() {
  // Smooth scroll behavior for mouse wheel
  let isScrolling = false;
  let scrollTimeout: NodeJS.Timeout;

  const smoothScroll = (element: HTMLElement, delta: number) => {
    const currentScroll = element.scrollTop;
    const targetScroll = currentScroll + delta;
    
    element.scrollTo({
      top: targetScroll,
      behavior: 'smooth'
    });
  };

  // Enhanced wheel event handler
  const handleWheel = (e: WheelEvent) => {
    const target = e.target as HTMLElement;
    
    // Find the closest scrollable parent
    let scrollableParent = target;
    while (scrollableParent && scrollableParent !== document.body) {
      const overflowY = window.getComputedStyle(scrollableParent).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        break;
      }
      scrollableParent = scrollableParent.parentElement as HTMLElement;
    }

    if (!scrollableParent || scrollableParent === document.body) {
      scrollableParent = document.documentElement;
    }

    // Check if the element can scroll
    const canScrollDown = scrollableParent.scrollTop < scrollableParent.scrollHeight - scrollableParent.clientHeight;
    const canScrollUp = scrollableParent.scrollTop > 0;

    if ((e.deltaY > 0 && canScrollDown) || (e.deltaY < 0 && canScrollUp)) {
      // Only prevent default if we can actually scroll
      e.preventDefault();
      
      // Apply smooth scroll
      const scrollAmount = e.deltaY;
      smoothScroll(scrollableParent, scrollAmount);

      // Add scrolling class for visual feedback
      if (!isScrolling) {
        document.body.classList.add('scrolling');
        isScrolling = true;
      }

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        document.body.classList.remove('scrolling');
        isScrolling = false;
      }, 150);
    }
  };

  // Add wheel event listener with passive: false to allow preventDefault
  document.addEventListener('wheel', handleWheel, { passive: false });

  // Cleanup function
  return () => {
    document.removeEventListener('wheel', handleWheel);
    clearTimeout(scrollTimeout);
  };
}

/**
 * Make an element scrollable with enhanced features
 */
export function makeScrollable(element: HTMLElement) {
  element.style.overflowY = 'auto';
  element.style.scrollBehavior = 'smooth';
  element.style.setProperty('-webkit-overflow-scrolling', 'touch');
  element.style.overscrollBehavior = 'contain';
}

/**
 * Scroll to an element smoothly
 */
export function scrollToElement(element: HTMLElement, offset: number = 0) {
  const elementPosition = element.getBoundingClientRect().top;
  const offsetPosition = elementPosition + window.pageYOffset - offset;

  window.scrollTo({
    top: offsetPosition,
    behavior: 'smooth'
  });
}

/**
 * Check if an element is scrollable
 */
export function isScrollable(element: HTMLElement): boolean {
  const overflowY = window.getComputedStyle(element).overflowY;
  return (overflowY === 'auto' || overflowY === 'scroll') && 
         element.scrollHeight > element.clientHeight;
}

