/**
 * Debounce utilities for search/filter inputs
 * Pattern 19: Network resilience + UI responsiveness
 * 
 * Includes:
 * - Basic debounce function
 * - useDebounce hook for callbacks
 * - useDebounceValue hook for state values
 */

import { useCallback, useRef, useState, useEffect } from 'react';

/**
 * Basic debounce function for non-React contexts
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout !== null) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

/**
 * Hook to debounce a callback function
 * Use for event handlers that trigger expensive operations
 * 
 * @example
 * const debouncedSearch = useDebounce((query) => fetchResults(query), 300);
 * <input onChange={(e) => debouncedSearch(e.target.value)} />
 */
export function useDebounce<T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    }) as T,
    [callback, delay]
  );
}

/**
 * Hook to debounce a state value
 * Returns the debounced value that updates after the delay
 * 
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounceValue(search, 300);
 * 
 * // Filter only triggers on debounced value
 * const filtered = useMemo(() => 
 *   facilities.filter(f => f.name.includes(debouncedSearch)),
 *   [facilities, debouncedSearch]
 * );
 */
export function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that returns both immediate and debounced values
 * Useful when you need to show immediate feedback but debounce expensive operations
 * 
 * @example
 * const { value, debouncedValue, setValue } = useDebounceState('', 300);
 * // value updates immediately (for input display)
 * // debouncedValue updates after delay (for filtering)
 */
export function useDebounceState<T>(
  initialValue: T,
  delay: number
): {
  value: T;
  debouncedValue: T;
  setValue: React.Dispatch<React.SetStateAction<T>>;
} {
  const [value, setValue] = useState<T>(initialValue);
  const debouncedValue = useDebounceValue(value, delay);

  return { value, debouncedValue, setValue };
}

