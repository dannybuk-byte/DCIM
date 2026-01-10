/**
 * Safe Data Utilities
 * 
 * Defensive utilities for handling potentially undefined/null data
 * to prevent runtime crashes from missing or malformed data.
 */

/**
 * Returns an empty array if input is undefined/null/not an array
 */
export function safeArray<T>(arr: T[] | undefined | null): T[] {
  return Array.isArray(arr) ? arr : [];
}

/**
 * Safely sum a numeric property across an array
 */
export function safeSum<T>(arr: T[] | undefined | null, key: keyof T): number {
  return safeArray(arr).reduce((sum, item) => {
    const val = item[key];
    return sum + (typeof val === 'number' && !isNaN(val) ? val : 0);
  }, 0);
}

/**
 * Safely count items matching a predicate
 */
export function safeCount<T>(arr: T[] | undefined | null, predicate: (item: T) => boolean): number {
  return safeArray(arr).filter(predicate).length;
}

/**
 * Safely get the first item matching a predicate
 */
export function safeFind<T>(arr: T[] | undefined | null, predicate: (item: T) => boolean): T | undefined {
  return safeArray(arr).find(predicate);
}

/**
 * Safely map over an array (returns empty array if input is invalid)
 */
export function safeMap<T, R>(arr: T[] | undefined | null, mapper: (item: T, index: number) => R): R[] {
  return safeArray(arr).map(mapper);
}

/**
 * Safely get a string value with fallback
 */
export function safeString(val: string | undefined | null, fallback: string = ''): string {
  return typeof val === 'string' ? val : fallback;
}

/**
 * Safely get a number value with fallback
 */
export function safeNumber(val: number | undefined | null, fallback: number = 0): number {
  return typeof val === 'number' && !isNaN(val) ? val : fallback;
}

/**
 * Safely format a number as currency
 */
export function safeCurrency(val: number | undefined | null, fallback: string = '$0'): string {
  const num = safeNumber(val, 0);
  if (num >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

/**
 * Safely format a number with locale formatting
 */
export function safeLocaleNumber(val: number | undefined | null, fallback: string = '0'): string {
  const num = safeNumber(val, NaN);
  return isNaN(num) ? fallback : num.toLocaleString();
}

/**
 * Safely access nested object properties
 */
export function safeGet<T, K extends keyof T>(obj: T | undefined | null, key: K): T[K] | undefined {
  return obj?.[key];
}

/**
 * Safely calculate percentage
 */
export function safePercentage(value: number | undefined | null, total: number | undefined | null, decimals: number = 1): string {
  const v = safeNumber(value, 0);
  const t = safeNumber(total, 0);
  if (t === 0) return '0%';
  return `${((v / t) * 100).toFixed(decimals)}%`;
}

/**
 * Safely slice an array
 */
export function safeSlice<T>(arr: T[] | undefined | null, start: number, end?: number): T[] {
  return safeArray(arr).slice(start, end);
}

/**
 * Safely sort an array (returns new array, doesn't mutate)
 */
export function safeSort<T>(arr: T[] | undefined | null, compareFn: (a: T, b: T) => number): T[] {
  return [...safeArray(arr)].sort(compareFn);
}

/**
 * Safely filter an array
 */
export function safeFilter<T>(arr: T[] | undefined | null, predicate: (item: T) => boolean): T[] {
  return safeArray(arr).filter(predicate);
}

/**
 * Safely group items by a key
 */
export function safeGroupBy<T>(arr: T[] | undefined | null, keyFn: (item: T) => string): Record<string, T[]> {
  return safeArray(arr).reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) groups[key] = [];
    groups[key].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export default {
  safeArray,
  safeSum,
  safeCount,
  safeFind,
  safeMap,
  safeString,
  safeNumber,
  safeCurrency,
  safeLocaleNumber,
  safeGet,
  safePercentage,
  safeSlice,
  safeSort,
  safeFilter,
  safeGroupBy,
};

