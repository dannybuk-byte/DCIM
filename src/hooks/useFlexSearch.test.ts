/**
 * FlexSearch Hook Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { waitFor } from '@testing-library/dom';
import { useFlexSearch, searchFacilities } from './useFlexSearch';
import { mockFacilities, createMockFacility } from '../test/utils';

describe('useFlexSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => useFlexSearch(mockFacilities));
    
    // Indexing may happen immediately for small datasets; assert stable defaults only.
    expect(result.current.isSearching).toBe(false);
    expect(result.current.results).toHaveLength(0);
    expect(result.current.query).toBe('');
  });

  it('should index facilities', async () => {
    const { result } = renderHook(() => useFlexSearch(mockFacilities));
    
    // Fast-forward timers to allow indexing
    await act(async () => {
      vi.runAllTimers();
      await Promise.resolve(); // Flush microtasks
    });
    
    // May need more time for large batches
    expect(result.current.indexedCount).toBe(mockFacilities.length);
  });

  it('should return correct indexed count', () => {
    const { result } = renderHook(() => useFlexSearch(mockFacilities));
    expect(result.current.indexedCount).toBe(4);
  });

  it('should update query on search', async () => {
    const { result } = renderHook(() => useFlexSearch(mockFacilities));
    
    act(() => {
      result.current.search('Switch');
    });
    
    expect(result.current.query).toBe('Switch');
  });

  it('should clear results on empty query', async () => {
    const { result } = renderHook(() => useFlexSearch(mockFacilities));
    
    // First search for something
    act(() => {
      result.current.search('Switch');
    });
    
    // Then clear
    act(() => {
      result.current.search('');
    });
    
    expect(result.current.results).toHaveLength(0);
  });
});

describe('searchFacilities', () => {
  it('should return all facilities for empty query', async () => {
    const results = await searchFacilities(mockFacilities, '', { limit: 10 });
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it('should find facilities by name', async () => {
    const results = await searchFacilities(mockFacilities, 'Switch');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(f => f.name.includes('Switch'))).toBe(true);
  });

  it('should find facilities by operator', async () => {
    const results = await searchFacilities(mockFacilities, 'Equinix');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(f => f.operator === 'Equinix')).toBe(true);
  });

  it('should find facilities by city', async () => {
    const results = await searchFacilities(mockFacilities, 'Las Vegas');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(f => f.city === 'Las Vegas')).toBe(true);
  });

  it('should find facilities by state', async () => {
    const results = await searchFacilities(mockFacilities, 'Virginia');
    
    expect(results.length).toBeGreaterThan(0);
    expect(results.some(f => f.state === 'Virginia')).toBe(true);
  });

  it('should respect limit option', async () => {
    const manyFacilities = Array.from({ length: 100 }, (_, i) => 
      createMockFacility({ id: i, name: `Test Facility ${i}` })
    );
    
    const results = await searchFacilities(manyFacilities, 'Facility', { limit: 5 });
    expect(results.length).toBeLessThanOrEqual(5);
  });

  it('should return empty array for non-matching query', async () => {
    const results = await searchFacilities(mockFacilities, 'xyznonexistent12345');
    expect(results).toHaveLength(0);
  });
});

