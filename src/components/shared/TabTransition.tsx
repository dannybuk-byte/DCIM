/**
 * TabTransition - Smooth animated tab transitions with cross-fade
 * 
 * Keeps previous tab mounted during transition for smooth cross-fade effect
 */

import { ReactNode, useEffect, useState, useRef } from 'react';

interface TabTransitionProps {
  children: ReactNode;
  tabKey: string;
  className?: string;
}

export function TabTransition({ children, tabKey, className = '' }: TabTransitionProps) {
  const [currentTab, setCurrentTab] = useState(tabKey);
  const [previousTab, setPreviousTab] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    if (currentTab !== tabKey) {
      // Start transition
      setPreviousTab(currentTab);
      setIsTransitioning(true);
      
      // Small delay for fade out
      const timer = setTimeout(() => {
        setCurrentTab(tabKey);
        
        // Cleanup previous tab after fade in
        setTimeout(() => {
          setPreviousTab(null);
          setIsTransitioning(false);
        }, 300); // Match transition duration
      }, 150); // Fade out duration
      
      return () => clearTimeout(timer);
    }
  }, [tabKey, currentTab]);
  
  return (
    <>
      {/* Previous tab - fading out */}
      {isTransitioning && previousTab === currentTab && (
        <div
          className={`${className} absolute inset-0 transition-opacity duration-150 ease-out opacity-0`}
          style={{ pointerEvents: 'none' }}
        >
          {children}
        </div>
      )}
      
      {/* Current tab - fading in */}
      <div
        className={`${className} transition-all duration-300 ease-out ${
          isTransitioning && currentTab === tabKey
            ? 'opacity-100 translate-y-0' 
            : currentTab !== tabKey
              ? 'opacity-0 translate-y-4'
              : 'opacity-100 translate-y-0'
        }`}
        style={{
          willChange: 'opacity, transform',
        }}
      >
        {children}
      </div>
    </>
  );
}

// Simpler approach: Single element with fade
export function TabFade({ children, tabKey, className = '' }: TabTransitionProps) {
  const [isVisible, setIsVisible] = useState(true);
  const previousTabKey = useRef(tabKey);
  
  useEffect(() => {
    if (previousTabKey.current !== tabKey) {
      // Fade out
      setIsVisible(false);
      
      // Wait for fade out, then fade in
      const timer = setTimeout(() => {
        previousTabKey.current = tabKey;
        // Force reflow
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      }, 150);
      
      return () => clearTimeout(timer);
    }
  }, [tabKey]);
  
  return (
    <div
      className={`${className} transition-opacity duration-150 ease-in-out ${
        isVisible ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        willChange: 'opacity',
      }}
    >
      {children}
    </div>
  );
}

