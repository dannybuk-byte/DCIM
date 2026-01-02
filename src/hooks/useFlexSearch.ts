/**
 * FlexSearch Integration for DCIM Command Center
 * Ultra-fast client-side search across 11,992 facilities
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import FlexSearch from 'flexsearch';
import type { Facility } from '../types';

// FlexSearch document index type
interface SearchDocument {
  id: number;
  name: string;
  operator: string;
  city: string;
  state: string;
  country: string;
  type: string;
  complianceStatus: string;
  issues: string;
}

interface SearchResult {
  facility: Facility;
  score: number;
  field: string;
}

interface UseFlexSearchOptions {
  limit?: number;
  threshold?: number;
  debounceMs?: number;
}

// Create a document index with multiple fields
function createIndex() {
  return new FlexSearch.Document<SearchDocument, string[]>({
    document: {
      id: 'id',
      index: ['name', 'operator', 'city', 'state', 'country', 'type', 'complianceStatus', 'issues'],
      store: ['id', 'name', 'operator', 'city', 'state', 'type'],
    },
    tokenize: 'forward',
    resolution: 9,
    cache: 100,
    context: {
      depth: 2,
      bidirectional: true,
    },
  });
}

export function useFlexSearch(
  facilities: Facility[],
  options: UseFlexSearchOptions = {}
) {
  const { limit = 50, threshold = 0.5, debounceMs = 150 } = options;
  
  const indexRef = useRef<ReturnType<typeof createIndex> | null>(null);
  const [isIndexed, setIsIndexed] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [query, setQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Create facility map for quick lookups
  const facilityMap = useMemo(() => {
    const map = new Map<number, Facility>();
    facilities.forEach(f => map.set(f.id, f));
    return map;
  }, [facilities]);

  // Index facilities when they change
  useEffect(() => {
    if (facilities.length === 0) return;

    const index = createIndex();
    indexRef.current = index;

    // Batch index for performance
    const batchSize = 500;
    let i = 0;

    const indexBatch = () => {
      const end = Math.min(i + batchSize, facilities.length);
      
      for (; i < end; i++) {
        const f = facilities[i];
        index.add({
          id: f.id,
          name: f.name,
          operator: f.operator,
          city: f.city,
          state: f.state,
          country: f.country,
          type: f.type,
          complianceStatus: f.complianceStatus,
          issues: f.issues.join(' '),
        });
      }

      if (i < facilities.length) {
        requestAnimationFrame(indexBatch);
      } else {
        setIsIndexed(true);
      }
    };

    indexBatch();

    return () => {
      indexRef.current = null;
      setIsIndexed(false);
    };
  }, [facilities]);

  // Perform search
  const search = useCallback(async (searchQuery: string): Promise<SearchResult[]> => {
    if (!indexRef.current || !searchQuery.trim()) {
      return [];
    }

    setIsSearching(true);

    try {
      const searchResults = await indexRef.current.searchAsync(searchQuery, {
        limit,
        enrich: true,
      });

      // Flatten and deduplicate results
      const seen = new Set<number>();
      const flattened: SearchResult[] = [];

      for (const fieldResult of searchResults) {
        const field = fieldResult.field;
        for (const item of fieldResult.result) {
          const id = typeof item === 'number' ? item : (item as any).id;
          if (!seen.has(id)) {
            seen.add(id);
            const facility = facilityMap.get(id);
            if (facility) {
              flattened.push({
                facility,
                score: 1, // FlexSearch doesn't provide scores in document mode
                field,
              });
            }
          }
        }
      }

      return flattened.slice(0, limit);
    } catch (error) {
      console.error('FlexSearch error:', error);
      return [];
    } finally {
      setIsSearching(false);
    }
  }, [facilityMap, limit]);

  // Debounced search handler
  const handleSearch = useCallback((searchQuery: string) => {
    setQuery(searchQuery);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const searchResults = await search(searchQuery);
      setResults(searchResults);
    }, debounceMs);
  }, [search, debounceMs]);

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Advanced search with filters
  const advancedSearch = useCallback(async (params: {
    query?: string;
    operator?: string;
    state?: string;
    complianceStatus?: string;
    type?: string;
  }): Promise<Facility[]> => {
    let filtered = [...facilities];

    // Apply text search first
    if (params.query?.trim() && indexRef.current) {
      const searchResults = await search(params.query);
      const ids = new Set(searchResults.map(r => r.facility.id));
      filtered = filtered.filter(f => ids.has(f.id));
    }

    // Apply additional filters
    if (params.operator) {
      filtered = filtered.filter(f => 
        f.operator.toLowerCase().includes(params.operator!.toLowerCase())
      );
    }
    if (params.state) {
      filtered = filtered.filter(f => 
        f.state.toLowerCase().includes(params.state!.toLowerCase())
      );
    }
    if (params.complianceStatus) {
      filtered = filtered.filter(f => f.complianceStatus === params.complianceStatus);
    }
    if (params.type) {
      filtered = filtered.filter(f => f.type === params.type);
    }

    return filtered;
  }, [facilities, search]);

  // Get suggestions for autocomplete
  const getSuggestions = useCallback(async (prefix: string, field: 'operator' | 'state' | 'city' | 'type'): Promise<string[]> => {
    if (!prefix.trim() || prefix.length < 2) return [];

    const values = new Set<string>();
    const lowerPrefix = prefix.toLowerCase();

    for (const f of facilities) {
      const value = f[field];
      if (value && value.toLowerCase().startsWith(lowerPrefix)) {
        values.add(value);
        if (values.size >= 10) break;
      }
    }

    return Array.from(values).sort();
  }, [facilities]);

  return {
    // State
    isIndexed,
    isSearching,
    results,
    query,
    
    // Actions
    search: handleSearch,
    advancedSearch,
    getSuggestions,
    
    // Direct search (non-debounced)
    searchImmediate: search,
    
    // Stats
    indexedCount: facilities.length,
  };
}

// Standalone search utility for one-off searches
export async function searchFacilities(
  facilities: Facility[],
  query: string,
  options: { limit?: number } = {}
): Promise<Facility[]> {
  const { limit = 50 } = options;
  
  if (!query.trim()) return facilities.slice(0, limit);

  const index = createIndex();
  
  for (const f of facilities) {
    index.add({
      id: f.id,
      name: f.name,
      operator: f.operator,
      city: f.city,
      state: f.state,
      country: f.country,
      type: f.type,
      complianceStatus: f.complianceStatus,
      issues: f.issues.join(' '),
    });
  }

  const results = await index.searchAsync(query, { limit, enrich: true });
  
  const facilityMap = new Map(facilities.map(f => [f.id, f]));
  const seen = new Set<number>();
  const matched: Facility[] = [];

  for (const fieldResult of results) {
    for (const item of fieldResult.result) {
      const id = typeof item === 'number' ? item : (item as any).id;
      if (!seen.has(id)) {
        seen.add(id);
        const facility = facilityMap.get(id);
        if (facility) matched.push(facility);
      }
    }
  }

  return matched.slice(0, limit);
}

