/**
 * Mapbox Integration Service for DCIM Command Center
 * 
 * Provides Mapbox features using MapLibre GL JS (API-compatible fork):
 * - Mapbox satellite/terrain tiles (requires access token)
 * - Geocoding via Mapbox or free Nominatim fallback
 * - Isochrone analysis
 * - Turn-by-turn directions
 * 
 * Budget: Mapbox free tier = 100K requests/month
 */

import type { StyleSpecification } from 'maplibre-gl';
import { settingsKey, getSettings, saveSettings } from '../utils/settingsPersistence';

// Types
export interface GeocodingResult {
  id: string;
  name: string;
  fullAddress: string;
  latitude: number;
  longitude: number;
  relevance: number;
  placeType: string[];
  context?: {
    city?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface MapboxConfig {
  accessToken: string | null;
  useMapboxSatellite: boolean;
  useMapboxGeocoding: boolean;
}

// Default config
const DEFAULT_CONFIG: MapboxConfig = {
  accessToken: null,
  useMapboxSatellite: false,
  useMapboxGeocoding: false,
};

// Get/save Mapbox config from IndexedDB
export async function getMapboxConfig(): Promise<MapboxConfig> {
  const saved = await getSettings<MapboxConfig>(settingsKey('mapbox'));
  return { ...DEFAULT_CONFIG, ...saved };
}

export async function saveMapboxConfig(config: Partial<MapboxConfig>): Promise<void> {
  const current = await getMapboxConfig();
  await saveSettings(settingsKey('mapbox'), { ...current, ...config });
}

// ============================================================================
// MAP STYLES
// ============================================================================

/**
 * Get Mapbox Satellite style (requires access token)
 */
export function getMapboxSatelliteStyle(accessToken: string): StyleSpecification {
  return {
    version: 8,
    name: 'Mapbox Satellite',
    sources: {
      satellite: {
        type: 'raster',
        tiles: [
          `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=${accessToken}`
        ],
        tileSize: 512,
        maxzoom: 22,
        attribution: '© Mapbox © Maxar',
      },
      terrain: {
        type: 'raster-dem',
        url: `https://api.mapbox.com/raster/v1/mapbox.mapbox-terrain-dem-v1/tiles.json?access_token=${accessToken}`,
        tileSize: 512,
        maxzoom: 14,
      },
    },
    layers: [
      {
        id: 'satellite',
        type: 'raster',
        source: 'satellite',
        minzoom: 0,
        maxzoom: 22,
      },
    ],
    terrain: {
      source: 'terrain',
      exaggeration: 1.5,
    },
    glyphs: `https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf?access_token=${accessToken}`,
    sprite: `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/sprite?access_token=${accessToken}`,
  };
}

/**
 * Get Mapbox Streets style (requires access token)
 */
export function getMapboxStreetsStyle(accessToken: string): StyleSpecification {
  return {
    version: 8,
    name: 'Mapbox Streets',
    sources: {
      streets: {
        type: 'vector',
        url: `https://api.mapbox.com/v4/mapbox.mapbox-streets-v8.json?access_token=${accessToken}`,
      },
    },
    layers: [], // Would need full layer definitions
    glyphs: `https://api.mapbox.com/fonts/v1/mapbox/{fontstack}/{range}.pbf?access_token=${accessToken}`,
  };
}

// ============================================================================
// GEOCODING
// ============================================================================

/**
 * Geocode an address using Mapbox Geocoding API
 * Requires access token. Free tier: 100K requests/month
 */
export async function geocodeWithMapbox(
  query: string,
  accessToken: string,
  options?: {
    country?: string;
    proximity?: [number, number]; // [lng, lat]
    types?: string[];
    limit?: number;
  }
): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    access_token: accessToken,
    limit: String(options?.limit || 5),
  });

  if (options?.country) {
    params.set('country', options.country);
  }
  if (options?.proximity) {
    params.set('proximity', options.proximity.join(','));
  }
  if (options?.types) {
    params.set('types', options.types.join(','));
  }

  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?${params}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Mapbox geocoding failed: ${response.status}`);
    
    const data = await response.json();
    
    return data.features.map((f: any) => ({
      id: f.id,
      name: f.text,
      fullAddress: f.place_name,
      longitude: f.center[0],
      latitude: f.center[1],
      relevance: f.relevance,
      placeType: f.place_type,
      context: parseMapboxContext(f.context),
    }));
  } catch (error) {
    console.error('Mapbox geocoding error:', error);
    return [];
  }
}

/**
 * Free geocoding fallback using Nominatim (OpenStreetMap)
 * No API key required. Rate limit: 1 req/sec
 */
export async function geocodeWithNominatim(
  query: string,
  options?: {
    countryCode?: string;
    limit?: number;
  }
): Promise<GeocodingResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: String(options?.limit || 5),
    addressdetails: '1',
  });

  if (options?.countryCode) {
    params.set('countrycodes', options.countryCode);
  }

  const url = `https://nominatim.openstreetmap.org/search?${params}`;

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'DCIM-Dashboard/1.0 (compliance monitoring)',
      },
    });
    if (!response.ok) throw new Error(`Nominatim geocoding failed: ${response.status}`);
    
    const data = await response.json();
    
    return data.map((r: any, index: number) => ({
      id: `nominatim-${index}`,
      name: r.display_name.split(',')[0],
      fullAddress: r.display_name,
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      relevance: 1 - index * 0.1, // Approximate relevance
      placeType: [r.type],
      context: {
        city: r.address?.city || r.address?.town || r.address?.village,
        state: r.address?.state,
        country: r.address?.country,
        postcode: r.address?.postcode,
      },
    }));
  } catch (error) {
    console.error('Nominatim geocoding error:', error);
    return [];
  }
}

/**
 * Unified geocoding function - uses Mapbox if token available, falls back to Nominatim
 */
export async function geocode(
  query: string,
  options?: {
    accessToken?: string;
    country?: string;
    limit?: number;
  }
): Promise<GeocodingResult[]> {
  if (options?.accessToken) {
    return geocodeWithMapbox(query, options.accessToken, {
      country: options.country,
      limit: options.limit,
    });
  }
  
  return geocodeWithNominatim(query, {
    countryCode: options?.country,
    limit: options?.limit,
  });
}

// ============================================================================
// REVERSE GEOCODING
// ============================================================================

/**
 * Reverse geocode coordinates to address
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  accessToken?: string
): Promise<GeocodingResult | null> {
  if (accessToken) {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${accessToken}&types=address,poi`;
    try {
      const response = await fetch(url);
      const data = await response.json();
      if (data.features?.[0]) {
        const f = data.features[0];
        return {
          id: f.id,
          name: f.text,
          fullAddress: f.place_name,
          latitude: lat,
          longitude: lng,
          relevance: 1,
          placeType: f.place_type,
          context: parseMapboxContext(f.context),
        };
      }
    } catch (error) {
      console.error('Mapbox reverse geocoding error:', error);
    }
  }

  // Fallback to Nominatim
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'DCIM-Dashboard/1.0' },
    });
    const data = await response.json();
    if (data.display_name) {
      return {
        id: 'nominatim-reverse',
        name: data.display_name.split(',')[0],
        fullAddress: data.display_name,
        latitude: lat,
        longitude: lng,
        relevance: 1,
        placeType: [data.type],
        context: {
          city: data.address?.city || data.address?.town,
          state: data.address?.state,
          country: data.address?.country,
          postcode: data.address?.postcode,
        },
      };
    }
  } catch (error) {
    console.error('Nominatim reverse geocoding error:', error);
  }

  return null;
}

// ============================================================================
// ISOCHRONES (Mapbox only)
// ============================================================================

export interface Isochrone {
  minutes: number;
  geometry: GeoJSON.Polygon;
}

/**
 * Get isochrone polygons (reachable area within X minutes)
 * Mapbox only - 100K requests/month free
 */
export async function getIsochrones(
  lat: number,
  lng: number,
  accessToken: string,
  options?: {
    profile?: 'driving' | 'walking' | 'cycling';
    contours?: number[]; // minutes, e.g. [5, 10, 15, 30]
  }
): Promise<Isochrone[]> {
  const profile = options?.profile || 'driving';
  const contours = options?.contours || [5, 10, 15, 30];
  
  const url = `https://api.mapbox.com/isochrone/v1/mapbox/${profile}/${lng},${lat}?` +
    `contours_minutes=${contours.join(',')}&` +
    `polygons=true&` +
    `access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Isochrone API failed: ${response.status}`);
    
    const data = await response.json();
    
    return data.features.map((f: any) => ({
      minutes: f.properties.contour,
      geometry: f.geometry,
    }));
  } catch (error) {
    console.error('Isochrone error:', error);
    return [];
  }
}

// ============================================================================
// DIRECTIONS (Mapbox only)
// ============================================================================

export interface DirectionsResult {
  routes: Array<{
    duration: number; // seconds
    distance: number; // meters
    geometry: GeoJSON.LineString;
    legs: Array<{
      summary: string;
      duration: number;
      distance: number;
    }>;
  }>;
}

/**
 * Get directions between two points
 * Mapbox only - 100K requests/month free
 */
export async function getDirections(
  from: [number, number], // [lng, lat]
  to: [number, number],   // [lng, lat]
  accessToken: string,
  options?: {
    profile?: 'driving' | 'walking' | 'cycling' | 'driving-traffic';
    alternatives?: boolean;
  }
): Promise<DirectionsResult | null> {
  const profile = options?.profile || 'driving';
  const alternatives = options?.alternatives || false;
  
  const coords = `${from[0]},${from[1]};${to[0]},${to[1]}`;
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coords}?` +
    `geometries=geojson&` +
    `overview=full&` +
    `alternatives=${alternatives}&` +
    `access_token=${accessToken}`;

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Directions API failed: ${response.status}`);
    
    const data = await response.json();
    return data as DirectionsResult;
  } catch (error) {
    console.error('Directions error:', error);
    return null;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function parseMapboxContext(context?: any[]): GeocodingResult['context'] {
  if (!context) return {};
  
  const result: GeocodingResult['context'] = {};
  
  for (const item of context) {
    const id = item.id || '';
    if (id.startsWith('place.')) {
      result.city = item.text;
    } else if (id.startsWith('region.')) {
      result.state = item.text;
    } else if (id.startsWith('country.')) {
      result.country = item.text;
    } else if (id.startsWith('postcode.')) {
      result.postcode = item.text;
    }
  }
  
  return result;
}

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useEffect, useCallback } from 'react';

export function useMapboxGeocoding() {
  const [config, setConfig] = useState<MapboxConfig>(DEFAULT_CONFIG);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<GeocodingResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Load config on mount
  useEffect(() => {
    getMapboxConfig().then(setConfig);
  }, []);

  // Search function
  const search = useCallback(async (query: string, options?: { country?: string; limit?: number }) => {
    if (!query.trim()) {
      setResults([]);
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const searchResults = await geocode(query, {
        accessToken: config.accessToken || undefined,
        ...options,
      });
      setResults(searchResults);
      return searchResults;
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [config.accessToken]);

  // Reverse geocode function
  const reverse = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await reverseGeocode(lat, lng, config.accessToken || undefined);
      return result;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [config.accessToken]);

  return {
    config,
    setAccessToken: (token: string | null) => {
      saveMapboxConfig({ accessToken: token });
      setConfig(c => ({ ...c, accessToken: token }));
    },
    search,
    reverse,
    results,
    isLoading,
    error,
    hasToken: !!config.accessToken,
  };
}

