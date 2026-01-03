/**
 * FlexSearch-powered search engine for facilities
 * 
 * High-performance full-text search using FlexSearch library.
 * Handles 11,992 facilities with instant results (<10ms).
 */

import FlexSearch from 'flexsearch';
import type { Facility } from '../types';

// FlexSearch document type (flexible for any indexable object)
type FlexDocument = {
  id: number;
  [key: string]: string | number | undefined;
};

// Singleton index instance
let facilityIndex: FlexSearch.Document<FlexDocument, true> | null = null;

interface SearchResult {
  id: number;
  name: string;
  provider: string;
  operator: string;
  city: string;
  state: string;
  country: string;
  subsidyGap: number;
  complianceScore: number;
  latitude?: number;
  longitude?: number;
}

interface SearchOptions {
  limit?: number;
  field?: keyof Facility;
}

/**
 * Initialize the FlexSearch index with facilities
 * Call this once on app startup
 */
export const indexFacilities = (facilities: Facility[]): void => {
  if (facilityIndex) {
    // Clear existing index
    facilityIndex = null;
  }

  facilityIndex = new FlexSearch.Document<FlexDocument, true>({
    document: {
      id: 'id',
      index: [
        'name',
        'operator',
        'city',
        'state',
        'country',
        'complianceStatus',
      ],
      store: [
        'name',
        'operator',
        'city',
        'state',
        'country',
        'subsidyGap',
      ],
    },
    tokenize: 'forward',
    resolution: 9,
    context: {
      depth: 2,
      bidirectional: true,
    },
  });

  // Index all facilities (cast to FlexDocument)
  facilities.forEach(facility => {
    facilityIndex!.add(facility as unknown as FlexDocument);
  });

  console.log(`[FlexSearch] Indexed ${facilities.length} facilities`);
};

/**
 * Search facilities with enriched results
 */
export const searchFacilities = (
  query: string,
  options: SearchOptions = {}
): SearchResult[] => {
  if (!facilityIndex) {
    console.warn('[FlexSearch] Index not initialized');
    return [];
  }

  if (!query.trim()) {
    return [];
  }

  const { limit = 50, field } = options;

  try {
    const results = facilityIndex.search(query, {
      limit,
      enrich: true,
      ...(field && { index: [field as string] }),
    });

    // FlexSearch returns results grouped by field
    const facilities: SearchResult[] = [];
    
    for (const result of results) {
      if (result.result && Array.isArray(result.result)) {
        for (const item of result.result) {
          if (typeof item === 'object' && item !== null && 'doc' in item) {
            const doc = item.doc as Facility;
            facilities.push({
              id: doc.id,
              name: doc.name,
              provider: doc.operator, // Using operator as provider
              operator: doc.operator,
              city: doc.city,
              state: doc.state,
              country: doc.country,
              subsidyGap: doc.subsidyGap,
              complianceScore: doc.complianceStatus === 'Compliant' ? 100 : 
                              doc.complianceStatus === 'At Risk' ? 70 : 
                              doc.complianceStatus === 'Non-Compliant' ? 30 : 50,
              latitude: doc.latitude,
              longitude: doc.longitude,
            });
          }
        }
      }
    }

    // Remove duplicates (can happen with multiple field matches)
    const uniqueFacilities = Array.from(
      new Map(facilities.map(f => [f.id, f])).values()
    );

    return uniqueFacilities.slice(0, limit);
  } catch (error) {
    console.error('[FlexSearch] Search error:', error);
    return [];
  }
};

/**
 * Get autocomplete suggestions for partial input
 */
export const getSuggestions = (
  partial: string,
  limit = 10
): string[] => {
  if (!facilityIndex || !partial.trim()) {
    return [];
  }

  try {
    const results = searchFacilities(partial, { limit });
    
    // Extract unique names, cities, and operators
    const suggestions = new Set<string>();
    
    results.forEach(result => {
      if (result.name.toLowerCase().includes(partial.toLowerCase())) {
        suggestions.add(result.name);
      }
      if (result.city.toLowerCase().includes(partial.toLowerCase())) {
        suggestions.add(`${result.city}, ${result.state}`);
      }
      if (result.operator.toLowerCase().includes(partial.toLowerCase())) {
        suggestions.add(result.operator);
      }
    });

    return Array.from(suggestions).slice(0, limit);
  } catch (error) {
    console.error('[FlexSearch] Suggestion error:', error);
    return [];
  }
};

/**
 * Search by specific field
 */
export const searchByField = (
  query: string,
  field: keyof Facility,
  limit = 50
): SearchResult[] => {
  return searchFacilities(query, { limit, field });
};

/**
 * Get facilities by provider
 */
export const searchByProvider = (provider: string, limit = 50): SearchResult[] => {
  return searchByField(provider, 'operator', limit);
};

/**
 * Get facilities by city
 */
export const searchByCity = (city: string, limit = 50): SearchResult[] => {
  return searchByField(city, 'city', limit);
};

/**
 * Get facilities by state
 */
export const searchByState = (state: string, limit = 50): SearchResult[] => {
  return searchByField(state, 'state', limit);
};

/**
 * Check if index is ready
 */
export const isIndexReady = (): boolean => {
  return facilityIndex !== null;
};

/**
 * Get index statistics
 */
export const getIndexStats = () => {
  if (!facilityIndex) {
    return { ready: false, count: 0 };
  }

  return {
    ready: true,
    count: 0, // FlexSearch doesn't expose count directly
  };
};

