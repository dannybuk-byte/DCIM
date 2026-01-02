import { useState, useEffect, useRef } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { CommunityContext } from './CommunityContext';
import { PromisesMade } from './PromisesMade';
import { RealityObserved } from './RealityObserved';

interface FacilityProfileProps {
  facilityId: number;
  countyFips?: string;
}

// Placeholder for aggregate stats component (would be implemented separately)
function AggregateStats({ facilityId: _facilityId }: { facilityId: number }) {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h3 className="text-lg font-semibold mb-4 text-gray-200">Aggregate Statistics</h3>
      <div className="text-sm text-gray-400">
        Aggregate statistics and comparisons would appear here after engaging with local context.
      </div>
    </div>
  );
}

export function FacilityProfile({ facilityId, countyFips }: FacilityProfileProps) {
  const [contextLoaded, setContextLoaded] = useState(false);
  const [promisesViewed, setPromisesViewed] = useState(false);
  const [timeOnPage, setTimeOnPage] = useState(0);
  const [aggregatesUnlocked, setAggregatesUnlocked] = useState(false);
  
  const promisesRef = useRef<HTMLDivElement>(null);
  const timeIntervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(Date.now());

  const MIN_TIME_SECONDS = 10;
  const timeRemaining = Math.max(0, MIN_TIME_SECONDS - timeOnPage);

  // Track time on page
  useEffect(() => {
    timeIntervalRef.current = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setTimeOnPage(elapsed);
    }, 1000);

    return () => {
      if (timeIntervalRef.current !== null) {
        clearInterval(timeIntervalRef.current);
      }
    };
  }, []);

  // Track scroll past PromisesMade
  useEffect(() => {
    if (!promisesRef.current || promisesViewed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // If the sentinel (bottom of PromisesMade) is visible, user has scrolled past
          if (entry.isIntersecting) {
            setPromisesViewed(true);
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );

    // Create a sentinel div at the bottom of PromisesMade
    const sentinel = document.createElement('div');
    sentinel.style.height = '1px';
    sentinel.style.position = 'absolute';
    sentinel.style.bottom = '0';
    
    if (promisesRef.current) {
      promisesRef.current.style.position = 'relative';
      promisesRef.current.appendChild(sentinel);
      observer.observe(sentinel);
    }

    return () => {
      observer.disconnect();
      if (sentinel.parentNode) {
        sentinel.parentNode.removeChild(sentinel);
      }
    };
  }, [promisesViewed, contextLoaded]);

  // Check if all requirements are met
  const canUnlock = contextLoaded && promisesViewed && timeOnPage >= MIN_TIME_SECONDS;

  // Default county FIPS - would come from facility data in real implementation
  const defaultCountyFips = countyFips || '51107'; // Loudoun County, VA as default

  return (
    <ErrorBoundary>
      <div className="space-y-6 p-6">
        {/* Step 1: Community Context - Always visible first */}
        <CommunityContext
          facilityId={facilityId}
          countyFips={defaultCountyFips}
          onContextLoaded={setContextLoaded}
        />

        {/* Step 2: Promises Made - Visible after context loads */}
        {contextLoaded && (
          <div ref={promisesRef}>
            <PromisesMade facilityId={facilityId} />
          </div>
        )}

        {/* Step 3: Reality Observed - Visible after promises viewed */}
        {promisesViewed && (
          <RealityObserved facilityId={facilityId} />
        )}

        {/* Friction Gate Message */}
        {!aggregatesUnlocked && (
          <div className="bg-amber-900/20 border border-amber-700/50 rounded-lg p-4">
            {!canUnlock ? (
              <div className="text-sm text-amber-200">
                <div className="mb-2">📖 Please read the local context first...</div>
                <div className="text-xs text-amber-300/80">
                  Understanding the place where this facility operates helps explain the numbers. 
                  {timeRemaining > 0 && ` (${timeRemaining}s remaining)`}
                </div>
                {!contextLoaded && (
                  <div className="text-xs text-amber-300/80 mt-1">• Loading community information...</div>
                )}
                {contextLoaded && !promisesViewed && (
                  <div className="text-xs text-amber-300/80 mt-1">• Scroll down to see what was promised...</div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-sm text-amber-200">
                  ✓ You've reviewed the local context. Ready to see the summary numbers?
                </div>
                <button
                  onClick={() => setAggregatesUnlocked(true)}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-md text-sm font-medium transition-colors"
                  title="Click to view aggregate statistics and comparisons"
                >
                  View Summary Statistics →
                </button>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Aggregate Stats - Only visible after unlock */}
        {aggregatesUnlocked && (
          <AggregateStats facilityId={facilityId} />
        )}
      </div>
    </ErrorBoundary>
  );
}

