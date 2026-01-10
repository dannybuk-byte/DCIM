import { liveQuery } from 'dexie';
import { useEffect, useState } from 'react';

/**
 * Minimal hook for Dexie liveQuery() without extra deps.
 * Ensures cleanup on unmount for antifragility.
 */
export function useDexieLiveQuery<T>(
  queryFn: () => Promise<T>,
  deps: unknown[],
  initialValue: T,
): { data: T; error: unknown; isLoading: boolean } {
  const [data, setData] = useState<T>(initialValue);
  const [error, setError] = useState<unknown>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    let isActive = true;
    setIsLoading(true);
    setError(null);

    const observable = liveQuery(queryFn);
    const subscription = observable.subscribe({
      next: (value) => {
        if (!isActive) return;
        setData(value);
        setIsLoading(false);
      },
      error: (err) => {
        if (!isActive) return;
        setError(err);
        setIsLoading(false);
      },
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, isLoading };
}

