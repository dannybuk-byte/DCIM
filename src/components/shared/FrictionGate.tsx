import { useState, useEffect, useRef, ReactNode } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';

interface FrictionGateProps {
  children: ReactNode;
  prerequisite: ReactNode;
  minTimeSeconds?: number;
  requireScroll?: boolean;
  unlockMessage?: string;
  waitMessage?: string;
  className?: string;
}

export function FrictionGate({
  children,
  prerequisite,
  minTimeSeconds = 10,
  requireScroll = true,
  unlockMessage = 'I understand the context → Continue',
  waitMessage = 'Continue reading... ({time}s remaining)',
  className = ''
}: FrictionGateProps) {
  const [timeSpent, setTimeSpent] = useState(0);
  const [hasScrolled, setHasScrolled] = useState(!requireScroll);
  const [isUnlocked, setIsUnlocked] = useState(false);
  
  const prerequisiteRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const timeIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  // Track time spent viewing
  useEffect(() => {
    timeIntervalRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeSpent(elapsed);
    }, 1000);

    return () => {
      if (timeIntervalRef.current !== null) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, []);

  // Track scroll past prerequisite
  useEffect(() => {
    if (!requireScroll || hasScrolled || !prerequisiteRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasScrolled(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    // Create sentinel div at bottom of prerequisite
    if (!sentinelRef.current && prerequisiteRef.current) {
      const sentinel = document.createElement('div');
      sentinel.style.height = '1px';
      sentinel.style.position = 'absolute';
      sentinel.style.bottom = '0';
      sentinel.style.width = '100%';
      (sentinelRef as any).current = sentinel;
      
      prerequisiteRef.current.style.position = 'relative';
      prerequisiteRef.current.appendChild(sentinel);
      observer.observe(sentinel);
    }

    return () => {
      observer.disconnect();
      if (sentinelRef.current?.parentNode) {
        sentinelRef.current.parentNode.removeChild(sentinelRef.current);
      }
    };
  }, [requireScroll, hasScrolled]);

  const timeRemaining = Math.max(0, minTimeSeconds - timeSpent);
  const canUnlock = timeSpent >= minTimeSeconds && hasScrolled;

  const handleUnlock = () => {
    setIsUnlocked(true);
  };

  if (isUnlocked) {
    return <>{children}</>;
  }

  return (
    <ErrorBoundary>
      <div className={className}>
        {/* Prerequisite content */}
        <div ref={prerequisiteRef}>
          {prerequisite}
        </div>

        {/* Friction gate message */}
        {!canUnlock && (
          <div className="mt-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
            <div className="text-sm text-amber-200">
              {waitMessage.replace('{time}', timeRemaining.toString())}
            </div>
          </div>
        )}

        {/* Unlock button */}
        {canUnlock && (
          <div className="mt-4 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg transition-opacity duration-300">
            <div className="flex items-center justify-between">
              <div className="text-sm text-amber-200">
                You've reviewed the prerequisite content.
              </div>
              <button
                onClick={handleUnlock}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium transition-colors transform hover:scale-105"
                style={{
                  transition: 'all 0.2s ease'
                }}
              >
                {unlockMessage}
              </button>
            </div>
          </div>
        )}

        {/* Hidden children (for layout calculation) */}
        {!isUnlocked && (
          <div style={{ opacity: 0, height: 0, overflow: 'hidden' }}>
            {children}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

