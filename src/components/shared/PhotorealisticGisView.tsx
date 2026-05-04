import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { LngLatBoundsLike, Map as MapLibreMap, StyleSpecification } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Facility } from '../../types';
import { Layers, Settings, Shield, Target, Cloud, Droplets, Wind, Play, Pause, SkipBack, SkipForward, Clock, Search, X } from 'lucide-react';
import { GoogleKeySettingsModal } from './GoogleKeySettingsModal';
import { db } from '../../db/database';
import { GoogleMapsStreetViewPane, GooglePaneLocation } from './GoogleMapsStreetViewPane';
import { AutocompleteInput } from './AutocompleteInput';
import { useNLPSearchSuggestions } from '../../hooks/useNLPSearchSuggestions';
import { parseNLPQuery, filterFacilitiesByQuery, getFacilitiesBounds } from '../../utils/nlpQueryParser';
import { recordSearch } from '../../db/searchHistory';
import { circuitBreakers } from '../../utils/circuitBreaker';
import { ErrorBoundary } from '../ErrorBoundary';
import {
  ComplianceStatus,
  ConnectographyCustomLayer,
  ConnectographyFilters,
  ConnectographyLayerSettings,
  ConnectographyScene,
  ConnectographyToolkitPanel
} from './ConnectographyToolkitPanel';
import { ATAKOverlay, ATAKControlPanel } from './ATAKOverlay';
import { ATAKPoint, ATAKRoute, ATAKArea, atakToGeoJSON, parseKML, parseGPX, parseCoT } from '../../utils/atakFormats';
import { BrowserTacticalToolsPanel, type TacticalMode, attachIdsToPoints } from './BrowserTacticalToolsPanel';
import { polylineLengthMeters, polygonAreaMeters2, type LngLat } from '../../utils/geoMath';
import { ConstructionProgressModal } from './ConstructionProgressModal';
import { fetchSentinelTileJson } from '../../services/constructionTiles';
import { FlowSimulationOverlay } from './FlowSimulationOverlay';
import { squareFootprintPolygon } from '../../utils/geoFootprints';
import { DeckGLOverlay, DeckGLControlPanel, type DeckLayerMode } from './DeckGLOverlay';
import { Zap } from 'lucide-react';

type GisMode = '2D' | '3D' | 'Topology';

interface PhotorealisticGisViewProps {
  mode: GisMode;
  facilities: Facility[];
  height?: number;
  width?: number;
  connectographyKeyPrefix?: string; // per-feature persistence namespace (e.g. 'subsidy', 'worker-safety')
  metric?: 'subsidyGap' | 'safetyRisk' | 'issuesCount' | 'auditRecencyDays';
}

const COLORS = {
  bg: '#0a0e17',
  text: '#e8eef6',
  textMuted: '#5a6d8a',
  red: '#ff4757',
  yellow: '#ffa502',
  green: '#2ed573',
  cyan: '#00d2d3',
};

function getEsriSatelliteStyle(enableTerrain = true): StyleSpecification {
  // Ultra-photorealistic satellite imagery with reliable, working tile sources
  // Uses Esri World Imagery with proper encoding and CORS handling
  const style: StyleSpecification = {
    version: 8,
    glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
    sources: {
      // High-res Esri World Imagery (Maxar, Airbus) - Primary satellite source
      // Using the most reliable endpoint with proper format
      satellite: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics, CNES/Airbus DS, USDA FSA, USGS'
      },
      // Enhanced labels - Single reliable endpoint
      labels: {
        type: 'raster',
        tiles: [
          'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
        ],
        tileSize: 256,
        minzoom: 0,
        maxzoom: 19,
        attribution: 'Labels © Esri'
      }
    },
    layers: [
      // High-res Esri satellite imagery - Primary layer with optimal rendering
      { 
        id: 'satellite', 
        type: 'raster', 
        source: 'satellite',
        paint: {
          'raster-brightness-min': 0.0,
          'raster-brightness-max': 1.0,
          'raster-contrast': 0.2,
          'raster-saturation': 0.15,
          'raster-resampling': 'linear',
          'raster-opacity': 1.0
        }
      },
      // Labels on top with enhanced visibility
      { 
        id: 'labels', 
        type: 'raster', 
        source: 'labels',
        paint: { 
          'raster-opacity': 1.0,
          'raster-brightness-min': 0.95,
          'raster-brightness-max': 1.0,
          'raster-contrast': 0.15
        } 
      }
    ]
  };

  // Add terrain for 3D elevation
  if (enableTerrain) {
    (style.sources as any)['mapbox-dem'] = {
      type: 'raster-dem',
      url: 'https://demotiles.maplibre.org/terrain-tiles/tiles.json',
      tileSize: 256,
      attribution: 'Terrain © MapLibre'
    };
    (style.layers as any[]).push({
      id: 'terrain',
      type: 'hillshade',
      source: 'mapbox-dem',
      paint: {
        'hillshade-exaggeration': 0.5,
        'hillshade-shadow-color': '#000000',
        'hillshade-highlight-color': '#ffffff',
        'hillshade-illumination-direction': 315,
        'hillshade-illumination-anchor': 'viewport'
      }
    });
  }

  return style;
}

function getDarkFallbackStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
    sources: {
      dark: {
        type: 'raster',
        tiles: ['https://a.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors, © CARTO'
      }
    },
    layers: [{ id: 'dark', type: 'raster', source: 'dark' }]
  };
}

function getOsmStandardStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [{ id: 'osm', type: 'raster', source: 'osm' }]
  };
}

function getOsmHumanitarianStyle(): StyleSpecification {
  return {
    version: 8,
    glyphs: 'https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=get_your_own_OpIi9ZULNHzrESv6T2vL',
    sources: {
      hot: {
        type: 'raster',
        tiles: ['https://a.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors, Humanitarian style'
      }
    },
    layers: [{ id: 'hot', type: 'raster', source: 'hot' }]
  };
}

export const PhotorealisticGisView = memo(function PhotorealisticGisView({
  mode,
  facilities,
  width = 800,
  height = 384,
  connectographyKeyPrefix = 'connectography',
  metric = 'subsidyGap'
}: PhotorealisticGisViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [basemap, setBasemap] = useState<'satellite' | 'osm' | 'osm-hot' | 'dark'>('satellite');
  const [initError, setInitError] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [toolkitOpen, setToolkitOpen] = useState(false);
  const [googlePaneOpen, setGooglePaneOpen] = useState(false);
  const [googleKey, setGoogleKey] = useState('');
  const [googleLocation, setGoogleLocation] = useState<GooglePaneLocation | null>(null);
  const [googleRequestedTab, setGoogleRequestedTab] = useState<'map' | 'streetview' | null>(null);
  const [googlePinned, setGooglePinned] = useState(false);
  const [connectography, setConnectography] = useState<ConnectographyLayerSettings>({
    layers: {
      facilities: true,
      heatmap: false,
      topology: mode === 'Topology',
      flows: false,
      corridors: true,
      footprints: false,
      simulation: false
    },
    opacity: { heatmap: 0.65, topology: 0.8, flows: 0.75, corridors: 0.42, footprints: 0.35, simulation: 0.9 },
    animateFlows: true
  });
  const flowAnimTimerRef = useRef<number | null>(null);
  const connectographyRef = useRef(connectography);
  useEffect(() => {
    connectographyRef.current = connectography;
  }, [connectography]);

  const [simulation, setSimulation] = useState({
    intensity: 0.55,
    speed: 1.0,
    trail: 0.22,
    opacity: 0.85,
    particleSize: 2.2
  });
  const googlePinnedRef = useRef(false);
  const [filters, setFilters] = useState<ConnectographyFilters>({
    operatorQuery: '',
    selectedOperators: [],
    statuses: { Compliant: true, 'Non-Compliant': true, 'At Risk': true, Unknown: true },
    minSubsidyGap: 0,
    minMetricValue: 0,
    yearStart: 2000,
    yearEnd: new Date().getFullYear()
  });
  const [timePlaying, setTimePlaying] = useState(false);
  const timeTimerRef = useRef<number | null>(null);
  const [scenes, setScenes] = useState<ConnectographyScene[]>([]);
  const [customLayers, setCustomLayers] = useState<ConnectographyCustomLayer[]>([]);
  const [viewport, setViewport] = useState<{ center: [number, number]; zoom: number; bearing: number; pitch: number } | null>(null);
  const [enableTerrain, setEnableTerrain] = useState(true);
  const [enableWeather, setEnableWeather] = useState(false);
  const [weatherData, setWeatherData] = useState<any>(null);
  const [pulseAnimation, setPulseAnimation] = useState(true);
  const [markerGlow, setMarkerGlow] = useState(true);
  const pulsePhaseRef = useRef(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Facility[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // ATAK state
  const [atakEnabled, setAtakEnabled] = useState(false);
  const [atakPoints, setAtakPoints] = useState<ATAKPoint[]>([]);
  const [atakRoutes, setAtakRoutes] = useState<ATAKRoute[]>([]);
  const [atakAreas, setAtakAreas] = useState<ATAKArea[]>([]);
  const [atakShowGrid, setAtakShowGrid] = useState(false);
  const [atakShowCompass, setAtakShowCompass] = useState(true);
  const [atakShowLabels, setAtakShowLabels] = useState(true);
  const [atakPanelOpen, setAtakPanelOpen] = useState(false);
  const [tacticalMode, setTacticalMode] = useState<TacticalMode>('none');
  const [draftVertices, setDraftVertices] = useState<LngLat[]>([]);
  const [cursorLngLat, setCursorLngLat] = useState<LngLat | null>(null);
  const [snapToFacility, setSnapToFacility] = useState(true);
  /** Map / deck / ATAK selection; coords omitted when unknown (never zero-filled). */
  type GisSelectedFacility = {
    id?: string | number;
    name: string;
    type?: string;
    operator?: string;
    status?: string;
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
  };
  const [selectedFacility, setSelectedFacility] = useState<GisSelectedFacility | null>(null);
  const [constructionOpen, setConstructionOpen] = useState(false);
  const [constructionOverlaySceneId, setConstructionOverlaySceneId] = useState<string | null>(null);
  const [constructionOverlayOpacity, setConstructionOverlayOpacity] = useState(0.75);
  
  // deck.gl GPU visualization state
  const [deckEnabled, setDeckEnabled] = useState(false);
  const [deckMode, setDeckMode] = useState<DeckLayerMode>('scatter');
  const [deckShowFlows, setDeckShowFlows] = useState(false);
  const [deckMetric, setDeckMetric] = useState<'subsidyGap' | 'issuesCount' | 'safetyRisk'>('subsidyGap');
  const [deckRadiusScale, setDeckRadiusScale] = useState(1);
  const [deckElevationScale, setDeckElevationScale] = useState(1);
  const deckContainerRef = useRef<HTMLDivElement>(null);
  const [deckViewState, setDeckViewState] = useState({
    longitude: -98.5795,
    latitude: 39.8283,
    zoom: 4,
    pitch: 0,
    bearing: 0
  });

  const atakEnabledRef = useRef(false);
  const atakPanelOpenRef = useRef(false);
  const tacticalModeRef = useRef<TacticalMode>('none');
  const snapToFacilityRef = useRef(true);

  useEffect(() => {
    googlePinnedRef.current = googlePinned;
  }, [googlePinned]);

  useEffect(() => {
    atakEnabledRef.current = atakEnabled;
  }, [atakEnabled]);
  useEffect(() => {
    atakPanelOpenRef.current = atakPanelOpen;
  }, [atakPanelOpen]);
  useEffect(() => {
    tacticalModeRef.current = tacticalMode;
  }, [tacticalMode]);
  useEffect(() => {
    snapToFacilityRef.current = snapToFacility;
  }, [snapToFacility]);

  const settingsKey = useCallback(
    (suffix: string) => `${connectographyKeyPrefix}:${suffix}`,
    [connectographyKeyPrefix]
  );

  const atakOverlayKey = useMemo(() => settingsKey('atakOverlay'), [settingsKey]);

  // Load persisted ATAK overlay (Dexie settings; no localStorage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get(atakOverlayKey);
        const v = row?.value as any;
        if (cancelled || !v) return;
        setAtakEnabled(Boolean(v.enabled));
        setAtakShowGrid(Boolean(v.showGrid));
        setAtakShowCompass(v.showCompass !== false);
        setAtakShowLabels(v.showLabels !== false);
        setSnapToFacility(v.snapToFacility !== false);
        setAtakPoints(Array.isArray(v.points) ? v.points : []);
        setAtakRoutes(Array.isArray(v.routes) ? v.routes : []);
        setAtakAreas(Array.isArray(v.areas) ? v.areas : []);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [atakOverlayKey]);

  // Persist ATAK overlay state
  useEffect(() => {
    db.settings
      .put({
        key: atakOverlayKey,
        value: {
          enabled: atakEnabled,
          showGrid: atakShowGrid,
          showCompass: atakShowCompass,
          showLabels: atakShowLabels,
          snapToFacility,
          points: atakPoints,
          routes: atakRoutes,
          areas: atakAreas
        }
      })
      .catch(() => {});
  }, [atakAreas, atakEnabled, atakOverlayKey, atakPoints, atakRoutes, atakShowCompass, atakShowGrid, atakShowLabels, snapToFacility]);

  const getMetricValue = useCallback(
    (f: Facility) => {
      if (metric === 'subsidyGap') return Number(f.subsidyGap || 0);
      if (metric === 'issuesCount') return Number(f.issues?.length || 0);
      if (metric === 'auditRecencyDays') {
        const d = new Date(f.lastAuditDate);
        if (Number.isNaN(d.getTime())) return 0;
        const now = Date.now();
        return Math.max(0, Math.floor((now - d.getTime()) / (1000 * 60 * 60 * 24)));
      }
      // safetyRisk (proxy): issue volume + compliance severity + audit staleness
      const issues = Number(f.issues?.length || 0);
      const statusBoost = f.complianceStatus === 'Non-Compliant' ? 30 : f.complianceStatus === 'At Risk' ? 15 : f.complianceStatus === 'Unknown' ? 5 : 0;
      const recency = (() => {
        const d = new Date(f.lastAuditDate);
        if (Number.isNaN(d.getTime())) return 0;
        return Math.min(30, Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24 * 30))); // months capped at 30
      })();
      return issues * 10 + statusBoost + recency;
    },
    [metric]
  );

  // Get NLP search suggestions for autocomplete
  const nlpSuggestions = useNLPSearchSuggestions({
    context: 'map',
    facilities: facilities,
    includeFacilities: true,
    includeOperators: true,
    includePlaces: true,
    maxHistory: 20
  });

  const allFacilitiesWithCoords = useMemo(
    () => {
      const filtered = facilities.filter(f => f.latitude !== undefined && f.longitude !== undefined);
      console.log('[PhotorealisticGisView] Facilities with coords:', filtered.length, 'out of', facilities.length);
      return filtered;
    },
    [facilities]
  );

  // Apply NLP search filter if active (with circuit breaker protection)
  const searchFilteredFacilities = useMemo(() => {
    if (!searchQuery.trim()) return allFacilitiesWithCoords;
    
    try {
      const parsed = parseNLPQuery(searchQuery, facilities);
      const matched = filterFacilitiesByQuery(parsed, allFacilitiesWithCoords);
      console.log('[PhotorealisticGisView] NLP search:', searchQuery, '→', matched.length, 'facilities');
      return matched;
    } catch (error) {
      console.error('[PhotorealisticGisView] NLP search error (using all facilities):', error);
      // Circuit breaker: if search fails, fall back to showing all facilities
      return allFacilitiesWithCoords;
    }
  }, [searchQuery, allFacilitiesWithCoords, facilities]);

  const operators = useMemo(() => {
    const set = new Set<string>();
    allFacilitiesWithCoords.forEach((f) => set.add(f.operator || 'Unknown'));
    return Array.from(set);
  }, [allFacilitiesWithCoords]);

  const availableYears = useMemo(() => {
    let min = 2100;
    let max = 1900;
    for (const f of facilities) {
      const y = Number(String(f.lastAuditDate || '').slice(0, 4));
      if (!Number.isFinite(y) || y <= 0) continue;
      min = Math.min(min, y);
      max = Math.max(max, y);
    }
    if (min === 2100 || max === 1900) {
      const now = new Date().getFullYear();
      return { min: now - 10, max: now };
    }
    return { min, max };
  }, [facilities]);

  const visibleFacilitiesWithCoords = useMemo(() => {
    const selectedOps = filters.selectedOperators.length ? new Set(filters.selectedOperators) : null;
    const statuses = filters.statuses as Record<ComplianceStatus, boolean>;
    const minMetric = Number(
      typeof filters.minMetricValue === 'number' ? filters.minMetricValue : filters.minSubsidyGap || 0
    );
    const y0 = Number(filters.yearStart);
    const y1 = Number(filters.yearEnd);

    return searchFilteredFacilities.filter((f) => {
      if (!statuses[f.complianceStatus]) return false;
      if (minMetric > 0 && getMetricValue(f) < minMetric) return false;
      if (selectedOps && !selectedOps.has(f.operator || 'Unknown')) return false;
      const y = Number(String(f.lastAuditDate || '').slice(0, 4));
      if (Number.isFinite(y) && y > 0 && (y < y0 || y > y1)) return false;
      return true;
    });
  }, [searchFilteredFacilities, filters.minMetricValue, filters.minSubsidyGap, filters.selectedOperators, filters.statuses, filters.yearEnd, filters.yearStart, getMetricValue]);

  // Convert facilities to ATAK points based on compliance status
  const facilitiesToATAKPoints = useMemo((): ATAKPoint[] => {
    return visibleFacilitiesWithCoords.map(f => ({
      lat: f.latitude!,
      lon: f.longitude!,
      callsign: f.name,
      team: f.operator,
      role: f.type,
      status: f.complianceStatus === 'Compliant' ? 'friendly' as const :
              f.complianceStatus === 'Non-Compliant' ? 'hostile' as const :
              f.complianceStatus === 'At Risk' ? 'neutral' as const : 'unknown' as const,
      timestamp: f.lastAuditDate || new Date().toISOString(),
      metadata: {
        facilityId: f.id,
        subsidyGap: f.subsidyGap,
        issuesCount: f.issues?.length || 0
      }
    }));
  }, [visibleFacilitiesWithCoords]);

  // NOTE: We do NOT auto-sync facilities into ATAK overlay while enabled.
  // ATAK/TAK interop is primarily for imported overlays (CoT/KML/GPX); auto-sync would overwrite those.

  const facilitiesGeoJson = useMemo(() => {
    return {
      type: 'FeatureCollection' as const,
      features: visibleFacilitiesWithCoords.map((f) => ({
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates: [f.longitude!, f.latitude!]
        },
        properties: {
          id: f.id,
          name: f.name,
          type: f.type,
          operator: f.operator,
          city: f.city,
          state: f.state,
          complianceStatus: f.complianceStatus,
          subsidyGap: f.subsidyGap,
          metricValue: getMetricValue(f)
        }
      }))
    };
  }, [visibleFacilitiesWithCoords, getMetricValue]);

  const visibleFacilitiesRef = useRef(visibleFacilitiesWithCoords);
  useEffect(() => {
    visibleFacilitiesRef.current = visibleFacilitiesWithCoords;
  }, [visibleFacilitiesWithCoords]);

  const connectographyFlowsGeoJson = useMemo(() => {
    // Connectography-style "flows": operator hub -> facilities, weighted by feature metric.
    // Capped for performance.
    const toRad = (d: number) => (d * Math.PI) / 180;
    const toDeg = (r: number) => (r * 180) / Math.PI;
    const greatCircle = (a: [number, number], b: [number, number], segments = 24) => {
      // Returns [lng,lat][] along a great-circle approximation between points.
      const [lng1, lat1] = a;
      const [lng2, lat2] = b;
      const φ1 = toRad(lat1);
      const λ1 = toRad(lng1);
      const φ2 = toRad(lat2);
      const λ2 = toRad(lng2);

      const sinΔφ = Math.sin((φ2 - φ1) / 2);
      const sinΔλ = Math.sin((λ2 - λ1) / 2);
      const d = 2 * Math.asin(Math.sqrt(sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ));
      if (!Number.isFinite(d) || d === 0) return [a, b];

      const coords: [number, number][] = [];
      for (let i = 0; i <= segments; i++) {
        const f = i / segments;
        const A = Math.sin((1 - f) * d) / Math.sin(d);
        const B = Math.sin(f * d) / Math.sin(d);
        const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
        const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
        const z = A * Math.sin(φ1) + B * Math.sin(φ2);
        const φi = Math.atan2(z, Math.sqrt(x * x + y * y));
        const λi = Math.atan2(y, x);
        coords.push([toDeg(λi), toDeg(φi)]);
      }
      return coords;
    };

    const byOperator = new Map<string, Facility[]>();
    visibleFacilitiesWithCoords.forEach((f) => {
      const op = f.operator || 'Unknown';
      if (!byOperator.has(op)) byOperator.set(op, []);
      byOperator.get(op)!.push(f);
    });

    const maxOperators = 35;
    const maxPerOperator = 45;
    const chosen = Array.from(byOperator.entries()).sort((a, b) => b[1].length - a[1].length).slice(0, maxOperators);

    let maxGap = 0;
    for (const [, facs] of chosen) {
      for (const f of facs) maxGap = Math.max(maxGap, getMetricValue(f));
    }
    if (!maxGap) maxGap = 1;

    const features: any[] = [];
    for (const [op, facs] of chosen) {
      const subset = facs.slice(0, maxPerOperator);
      const centroid = subset.reduce(
        (acc, f) => ({ lng: acc.lng + (f.longitude || 0), lat: acc.lat + (f.latitude || 0), n: acc.n + 1 }),
        { lng: 0, lat: 0, n: 0 }
      );
      const hubLng = centroid.n ? centroid.lng / centroid.n : 0;
      const hubLat = centroid.n ? centroid.lat / centroid.n : 0;

      for (const f of subset) {
        const gap = getMetricValue(f);
        const weight = Math.max(0.05, Math.min(1, gap / maxGap));
        const coords = greatCircle([hubLng, hubLat], [f.longitude!, f.latitude!], 22);
        const lengthMeters = polylineLengthMeters(coords.map(([lng, lat]) => ({ lng, lat })));
        const lengthKm = lengthMeters / 1000;
        // Visual-realism heuristic: longer inferred routes carry higher uncertainty.
        const uncertainty = Math.max(0.15, Math.min(1, lengthKm / 2800));
        features.push({
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: coords
          },
          properties: {
            operator: op,
            id: f.id,
            complianceStatus: f.complianceStatus || 'Unknown',
            weight,
            metricValue: gap,
            lengthKm,
            uncertainty
          }
        });
      }
    }

    return { type: 'FeatureCollection' as const, features };
  }, [getMetricValue, visibleFacilitiesWithCoords]);

  const topologyLinesGeoJson = useMemo(() => {
    if (mode !== 'Topology') {
      return { type: 'FeatureCollection' as const, features: [] as any[] };
    }

    // Build a lightweight operator->facility "spoke" topology overlay.
    // Cap to avoid heavy rendering.
    const byOperator = new Map<string, Facility[]>();
    visibleFacilitiesWithCoords.forEach((f) => {
      const op = f.operator || 'Unknown';
      if (!byOperator.has(op)) byOperator.set(op, []);
      byOperator.get(op)!.push(f);
    });

    const features: any[] = [];
    const maxOperators = 40;
    const maxPerOperator = 60;

    Array.from(byOperator.entries())
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, maxOperators)
      .forEach(([op, facs]) => {
        const subset = facs.slice(0, maxPerOperator);
        const centroid = subset.reduce(
          (acc, f) => ({ lng: acc.lng + (f.longitude || 0), lat: acc.lat + (f.latitude || 0), n: acc.n + 1 }),
          { lng: 0, lat: 0, n: 0 }
        );
        const hubLng = centroid.n ? centroid.lng / centroid.n : 0;
        const hubLat = centroid.n ? centroid.lat / centroid.n : 0;

        subset.forEach((f) => {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: [
                [hubLng, hubLat],
                [f.longitude!, f.latitude!]
              ]
            },
            properties: {
              operator: op,
              complianceStatus: f.complianceStatus,
              facilityName: f.name
            }
          });
        });
      });

    return { type: 'FeatureCollection' as const, features };
  }, [visibleFacilitiesWithCoords, mode]);

  // Initialize map
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    setInitError(null);

    try {
      const style =
        basemap === 'satellite'
          ? getEsriSatelliteStyle(enableTerrain)
          : basemap === 'osm'
            ? getOsmStandardStyle()
            : basemap === 'osm-hot'
              ? getOsmHumanitarianStyle()
              : getDarkFallbackStyle();

      const map = new maplibregl.Map({
        container,
        style,
        center: [-95, 40], // Center on US where most facilities are
        zoom: 4, // Start zoomed in to see satellite detail clearly
        pitch: mode === '3D' ? 60 : (enableTerrain ? 45 : 0),
        bearing: 0,
        attributionControl: false,
        antialias: true,
        preserveDrawingBuffer: true,
        renderWorldCopies: true,
        maxPitch: 85,
        fadeDuration: 300,
        // Enhanced tile request handling for proper encoding and CORS
        transformRequest: (url, resourceType) => {
          if (resourceType === 'Tile') {
            // Use proper headers to avoid encoding issues
            return {
              url: url,
              headers: {
                'Accept': 'image/webp,image/png,image/jpeg,image/*,*/*'
              }
            };
          }
          return { url };
        }
      });

      // Better error handling - log but don't block on tile issues
      map.on('error', (e: any) => {
        if (e.error && e.error.message) {
          const msg = e.error.message.toLowerCase();
          // Tile decode errors are often non-critical - tiles may still render
          if (msg.includes('decoded') || msg.includes('decode') || msg.includes('invalidstate')) {
            console.warn('[PhotorealisticGisView] Tile decode warning (may still render):', e.error.message);
            return;
          }
          // Real errors that need attention
          console.error('[PhotorealisticGisView] Map error:', e.error);
          if (!msg.includes('decoded') && !msg.includes('decode')) {
            setInitError(e.error?.message || 'Map initialization failed');
          }
        }
      });

      // Track tile loading progress
      map.on('sourcedata', (e) => {
        if (e.sourceId === 'satellite' && e.isSourceLoaded) {
          console.log('[PhotorealisticGisView] ✓ Satellite tiles loaded');
        }
      });

      // Enhance rendering quality
      map.setRenderWorldCopies(true);
      
      // Add realistic lighting effects
      if (enableTerrain && basemap === 'satellite') {
        map.on('style.load', () => {
          // Set realistic sun position for shadows
          const now = new Date();
          const hours = now.getHours();
          const sunAngle = (hours - 12) * 15; // Approximate sun angle
          try {
            if (map.getLayer('terrain')) {
              map.setPaintProperty('terrain', 'hillshade-illumination-direction', (315 + sunAngle) % 360);
            }
          } catch (e) {
            // Ignore if terrain not available
          }
        });
      }

      // Enable terrain if available
      if (enableTerrain && basemap === 'satellite') {
        map.on('style.load', () => {
          try {
            map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.2 });
          } catch (e) {
            console.warn('Terrain not available:', e);
          }
        });
      }

      mapRef.current = map;

      // UI controls
      map.addControl(new maplibregl.NavigationControl({ showZoom: true, showCompass: true }), 'top-left');
      map.addControl(new maplibregl.ScaleControl({ maxWidth: 160, unit: 'metric' }), 'bottom-left');

      const ro = new ResizeObserver(() => map.resize());
      ro.observe(container);

      // Sync deck.gl view state with MapLibre camera
      map.on('move', () => {
        const center = map.getCenter();
        setDeckViewState({
          longitude: center.lng,
          latitude: center.lat,
          zoom: map.getZoom(),
          pitch: map.getPitch(),
          bearing: map.getBearing()
        });
      });

      map.on('load', () => {
        console.log('[PhotorealisticGisView] ✓ Map style loaded');
        console.log('[PhotorealisticGisView] Adding facilities:', facilitiesGeoJson.features.length);
        
        // Check if satellite tiles are actually loading
        const satelliteSource = map.getSource('satellite') as any;
        if (satelliteSource) {
          console.log('[PhotorealisticGisView] ✓ Satellite source found');
        } else {
          console.warn('[PhotorealisticGisView] ⚠ Satellite source not found in style');
        }
        
        try {
          // Facilities source
          map.addSource('facilities', {
            type: 'geojson',
            data: facilitiesGeoJson as any,
            cluster: true,
            clusterMaxZoom: 6,
            clusterRadius: 50
          });
          console.log('[PhotorealisticGisView] ✓ Facilities source added');
        } catch (e) {
          console.error('[PhotorealisticGisView] ✗ Error adding facilities source:', e);
        }

        // Connectography heatmap (density / feature pressure)
        if (!map.getLayer('facilities-heatmap')) {
          map.addLayer({
            id: 'facilities-heatmap',
            type: 'heatmap',
            source: 'facilities',
            maxzoom: 10,
            paint: {
              'heatmap-weight': [
                'interpolate',
                ['linear'],
                ['coalesce', ['get', 'metricValue'], 0],
                0,
                0,
                1000000,
                1
              ],
              'heatmap-intensity': ['interpolate', ['linear'], ['zoom'], 0, 0.7, 9, 2.2],
              'heatmap-radius': ['interpolate', ['linear'], ['zoom'], 0, 4, 7, 16, 10, 26],
              'heatmap-opacity': connectography.opacity.heatmap,
              'heatmap-color': [
                'interpolate',
                ['linear'],
                ['heatmap-density'],
                0,
                'rgba(0,0,0,0)',
                0.1,
                'rgba(0,210,211,0.15)',
                0.25,
                'rgba(0,210,211,0.28)',
                0.4,
                'rgba(0,210,211,0.38)',
                0.55,
                'rgba(255,165,2,0.45)',
                0.7,
                'rgba(255,165,2,0.55)',
                0.85,
                'rgba(255,71,87,0.65)',
                1,
                'rgba(255,71,87,0.75)'
              ]
            }
          });
        }

        // Enhanced cluster bubbles with better visualization
        map.addLayer({
          id: 'clusters',
          type: 'circle',
          source: 'facilities',
          filter: ['has', 'point_count'],
          paint: {
            'circle-color': [
              'step',
              ['get', 'point_count'],
              COLORS.cyan,
              25,
              COLORS.yellow,
              100,
              COLORS.red
            ],
            'circle-radius': [
              'interpolate',
              ['linear'],
              ['get', 'point_count'],
              2,
              18,
              10,
              24,
              50,
              32,
              100,
              40
            ],
            'circle-opacity': 0.85,
            'circle-stroke-width': 3,
            'circle-stroke-color': 'rgba(255, 255, 255, 0.9)',
            'circle-blur': 0,
            'circle-pitch-alignment': 'map'
          }
        });

        map.addLayer({
          id: 'cluster-count',
          type: 'symbol',
          source: 'facilities',
          filter: ['has', 'point_count'],
          layout: {
            'text-field': '{point_count_abbreviated}',
            'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
            'text-size': 12
          },
          paint: {
            'text-color': COLORS.bg
          }
        });

        // Ultra-realistic facility markers with 3D appearance
        map.addLayer({
          id: 'unclustered-point',
          type: 'circle',
          source: 'facilities',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': [
              'match',
              ['get', 'complianceStatus'],
              'Compliant',
              '#2ed573',
              'Non-Compliant',
              '#ff4757',
              'At Risk',
              '#ffa502',
              '#6b7280'
            ],
            'circle-radius': [
              'interpolate',
              ['exponential', 1.5],
              ['zoom'],
              1,
              5,
              5,
              8,
              8,
              12,
              12,
              18
            ],
            'circle-stroke-width': [
              'interpolate',
              ['linear'],
              ['coalesce', ['get', 'metricValue'], 0],
              0,
              2,
              1000000,
              4
            ],
            'circle-stroke-color': [
              'match',
              ['get', 'complianceStatus'],
              'Compliant',
              'rgba(255, 255, 255, 0.95)',
              'Non-Compliant',
              'rgba(255, 255, 255, 0.95)',
              'At Risk',
              'rgba(255, 255, 255, 0.95)',
              'rgba(255, 255, 255, 0.8)'
            ],
            'circle-opacity': 1.0,
            'circle-blur': 0
          }
        });

        // Realistic shadow layer for depth
        map.addLayer({
          id: 'unclustered-point-shadow',
          type: 'circle',
          source: 'facilities',
          filter: ['!', ['has', 'point_count']],
          paint: {
            'circle-color': 'rgba(0, 0, 0, 0.4)',
            'circle-radius': [
              'interpolate',
              ['exponential', 1.5],
              ['zoom'],
              1,
              6,
              5,
              10,
              8,
              15,
              12,
              22
            ],
            'circle-opacity': 0.5,
            'circle-blur': 2,
            'circle-translate': [1, 1]
          }
        }, 'unclustered-point');

        // Realistic pulsing glow effect (only when enabled)
        if (pulseAnimation) {
          map.addLayer({
            id: 'unclustered-point-glow',
            type: 'circle',
            source: 'facilities',
            filter: ['!', ['has', 'point_count']],
            paint: {
              'circle-color': [
                'match',
                ['get', 'complianceStatus'],
                'Compliant',
                '#2ed573',
                'Non-Compliant',
                '#ff4757',
                'At Risk',
                '#ffa502',
                '#6b7280'
              ],
              'circle-radius': [
                'interpolate',
                ['exponential', 1.5],
                ['zoom'],
                1,
              8,
              5,
              14,
              8,
              20,
              12,
              28
              ],
              'circle-opacity': 0.25,
              'circle-blur': 2.5
            }
          }, 'unclustered-point');
        }

        // Connectography flows: operator hub -> facility
        if (!map.getSource('connectography-flows')) {
          map.addSource('connectography-flows', { type: 'geojson', data: connectographyFlowsGeoJson as any });
        }
        if (!map.getLayer('connectography-flows')) {
          map.addLayer({
            id: 'connectography-flows',
            type: 'line',
            source: 'connectography-flows',
            layout: { 'line-join': 'round', 'line-cap': 'round' },
            paint: {
              'line-opacity': connectography.opacity.flows,
              'line-color': [
                'match',
                ['get', 'complianceStatus'],
                'Compliant',
                'rgba(46, 213, 115, 0.55)',
                'Non-Compliant',
                'rgba(255, 71, 87, 0.55)',
                'At Risk',
                'rgba(255, 165, 2, 0.55)',
                'rgba(0, 210, 211, 0.35)'
              ],
              'line-width': ['interpolate', ['linear'], ['get', 'weight'], 0, 0.4, 1, 2.6],
              'line-dasharray': [1, 2]
            }
          });
        }
        // Corridors: uncertainty envelope under the core flow line (photorealistic "corridor" feel)
        if (!map.getLayer('connectography-flows-envelope')) {
          map.addLayer(
            {
              id: 'connectography-flows-envelope',
              type: 'line',
              source: 'connectography-flows',
              layout: { 'line-join': 'round', 'line-cap': 'round' },
              paint: {
                'line-opacity': connectography.opacity.corridors,
                'line-color': [
                  'match',
                  ['get', 'complianceStatus'],
                  'Compliant',
                  'rgba(46, 213, 115, 0.20)',
                  'Non-Compliant',
                  'rgba(255, 71, 87, 0.22)',
                  'At Risk',
                  'rgba(255, 165, 2, 0.22)',
                  'rgba(0, 210, 211, 0.16)'
                ],
                // Wider + blurrier than the core; uncertainty increases blur.
                'line-width': ['interpolate', ['linear'], ['get', 'weight'], 0, 2.8, 1, 8.5],
                'line-blur': ['interpolate', ['linear'], ['coalesce', ['get', 'uncertainty'], 0.3], 0, 0.6, 1, 2.2]
              }
            },
            'connectography-flows'
          );
        }

        if (mode === 'Topology') {
          map.addSource('topology', { type: 'geojson', data: topologyLinesGeoJson as any });
          map.addLayer({
            id: 'topology-lines',
            type: 'line',
            source: 'topology',
            paint: {
              'line-color': [
                'match',
                ['get', 'complianceStatus'],
                'Compliant',
                'rgba(46, 213, 115, 0.55)',
                'Non-Compliant',
                'rgba(255, 71, 87, 0.55)',
                'At Risk',
                'rgba(255, 165, 2, 0.55)',
                'rgba(0, 210, 211, 0.35)'
              ],
              'line-width': ['interpolate', ['linear'], ['zoom'], 1, 0.4, 6, 1.2, 10, 2.2],
              'line-opacity': connectography.opacity.topology
            }
          });
          if (!map.getLayer('topology-envelope')) {
            map.addLayer(
              {
                id: 'topology-envelope',
                type: 'line',
                source: 'topology',
                paint: {
                  'line-color': 'rgba(0, 210, 211, 0.14)',
                  'line-width': ['interpolate', ['linear'], ['zoom'], 1, 1.5, 6, 3.0, 10, 6.2],
                  'line-opacity': connectography.opacity.corridors,
                  'line-blur': 1.4
                }
              },
              'topology-lines'
            );
          }
        }

        // Facility footprints (computed client-side at high zoom; "site realism")
        if (!map.getSource('facility-footprints')) {
          map.addSource('facility-footprints', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } as any });
        }
        if (!map.getLayer('facility-footprints-fill')) {
          map.addLayer(
            {
              id: 'facility-footprints-fill',
              type: 'fill',
              source: 'facility-footprints',
              paint: {
                'fill-color': [
                  'match',
                  ['get', 'complianceStatus'],
                  'Compliant',
                  'rgba(46, 213, 115, 0.22)',
                  'Non-Compliant',
                  'rgba(255, 71, 87, 0.22)',
                  'At Risk',
                  'rgba(255, 165, 2, 0.22)',
                  'rgba(0, 210, 211, 0.16)'
                ],
                'fill-opacity': connectography.opacity.footprints
              }
            },
            'unclustered-point-shadow'
          );
        }
        if (!map.getLayer('facility-footprints-line')) {
          map.addLayer(
            {
              id: 'facility-footprints-line',
              type: 'line',
              source: 'facility-footprints',
              paint: {
                'line-color': 'rgba(255,255,255,0.25)',
                'line-width': 1,
                'line-opacity': ['interpolate', ['linear'], ['zoom'], 9, 0.0, 13, 0.85]
              }
            },
            'unclustered-point-shadow'
          );
        }
        if (mode === '3D' && !map.getLayer('facility-footprints-extrude')) {
          map.addLayer(
            {
              id: 'facility-footprints-extrude',
              type: 'fill-extrusion',
              source: 'facility-footprints',
              paint: {
                'fill-extrusion-color': [
                  'match',
                  ['get', 'complianceStatus'],
                  'Compliant',
                  'rgba(46, 213, 115, 0.30)',
                  'Non-Compliant',
                  'rgba(255, 71, 87, 0.30)',
                  'At Risk',
                  'rgba(255, 165, 2, 0.30)',
                  'rgba(0, 210, 211, 0.22)'
                ],
                'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.0, 13, 0.75],
                'fill-extrusion-height': [
                  'interpolate',
                  ['linear'],
                  ['zoom'],
                  10,
                  0,
                  13,
                  [
                    'interpolate',
                    ['linear'],
                    ['coalesce', ['get', 'metricValue'], 0],
                    0,
                    8,
                    25000000,
                    90
                  ]
                ]
              }
            },
            'unclustered-point-shadow'
          );
        }

        const hashAngle = (id: any) => {
          const s = String(id ?? '');
          let h = 2166136261;
          for (let i = 0; i < s.length; i++) {
            h ^= s.charCodeAt(i);
            h = Math.imul(h, 16777619);
          }
          return (Math.abs(h) % 360) | 0;
        };

        const updateFootprints = () => {
          try {
            const cfg = connectographyRef.current;
            const show = Boolean(cfg.layers.footprints);
            const src: any = map.getSource?.('facility-footprints');
            if (!src?.setData) return;

            const z = map.getZoom();
            if (!show || z < 8.8) {
              src.setData({ type: 'FeatureCollection', features: [] } as any);
              return;
            }

            const b = map.getBounds();
            const pad = 0.15;
            const west = b.getWest() - pad;
            const east = b.getEast() + pad;
            const south = b.getSouth() - pad;
            const north = b.getNorth() + pad;

            const candidates = visibleFacilitiesRef.current;
            const inView = candidates.filter((f) => {
              const lat = f.latitude!;
              const lng = f.longitude!;
              return lng >= west && lng <= east && lat >= south && lat <= north;
            });

            const capped = inView.slice(0, 450);
            const halfSize = Math.max(18, Math.min(150, 150 - (z - 9) * 18));

            const features = capped.map((f) => ({
              type: 'Feature' as const,
              geometry: {
                type: 'Polygon' as const,
                coordinates: [squareFootprintPolygon(f.longitude!, f.latitude!, halfSize, hashAngle(f.id))]
              },
              properties: {
                id: f.id,
                name: f.name,
                complianceStatus: f.complianceStatus,
                metricValue: getMetricValue(f)
              }
            }));

            src.setData({ type: 'FeatureCollection', features } as any);
          } catch {
            // ignore
          }
        };

        map.on('moveend', updateFootprints);
        map.on('zoomend', updateFootprints);
        updateFootprints();

        // ATAK layers (if enabled)
        if (atakEnabled && (atakPoints.length > 0 || atakRoutes.length > 0 || atakAreas.length > 0)) {
          try {
            const atakGeoJson = atakToGeoJSON(atakPoints, atakRoutes, atakAreas);
            
            // Add ATAK source if not exists
            if (!map.getSource('atak')) {
              map.addSource('atak', {
                type: 'geojson',
                data: atakGeoJson as any
              });
            }

            // ATAK routes (lines) - filter by LineString geometry type
            if (atakRoutes.length > 0 && !map.getLayer('atak-routes')) {
              map.addLayer({
                id: 'atak-routes',
                type: 'line',
                source: 'atak',
                filter: ['==', ['geometry-type'], 'LineString'],
                paint: {
                  'line-color': [
                    'case',
                    ['has', 'color'],
                    ['get', 'color'],
                    '#00ff00' // Default green
                  ],
                  'line-width': 3,
                  'line-opacity': 0.9,
                  'line-dasharray': [
                    'case',
                    ['==', ['get', 'style'], 'dashed'],
                    ['literal', [4, 4]],
                    ['==', ['get', 'style'], 'dotted'],
                    ['literal', [2, 2]],
                    ['literal', [0, 0]] // solid
                  ]
                }
              });
            }

            // ATAK areas (polygons) - filter by Polygon geometry type
            if (atakAreas.length > 0 && !map.getLayer('atak-areas')) {
              map.addLayer({
                id: 'atak-areas',
                type: 'fill',
                source: 'atak',
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: {
                  'fill-color': [
                    'case',
                    ['has', 'fillColor'],
                    ['get', 'fillColor'],
                    '#00ff0022' // Default green with transparency
                  ],
                  'fill-opacity': [
                    'case',
                    ['has', 'opacity'],
                    ['get', 'opacity'],
                    0.3
                  ]
                }
              });
              map.addLayer({
                id: 'atak-areas-outline',
                type: 'line',
                source: 'atak',
                filter: ['==', ['geometry-type'], 'Polygon'],
                paint: {
                  'line-color': [
                    'case',
                    ['has', 'strokeColor'],
                    ['get', 'strokeColor'],
                    '#00ff00' // Default green
                  ],
                  'line-width': 2,
                  'line-opacity': 0.9
                }
              });
            }

            // ATAK points (markers with status colors) - filter by Point geometry type
            if (atakPoints.length > 0 && !map.getLayer('atak-points')) {
              map.addLayer({
                id: 'atak-points',
                type: 'circle',
                source: 'atak',
                filter: ['==', ['geometry-type'], 'Point'],
                paint: {
                  'circle-radius': 10,
                  'circle-color': [
                    'match',
                    ['get', 'status'],
                    'friendly', '#00ff00', // Green
                    'hostile', '#ff0000', // Red
                    'neutral', '#ffff00', // Yellow
                    '#808080' // Gray for unknown
                  ],
                  'circle-stroke-width': 2,
                  'circle-stroke-color': '#000000',
                  'circle-opacity': 0.9
                }
              });
            }
          } catch (e) {
            console.error('[PhotorealisticGisView] Error adding ATAK layers:', e);
          }
        }

      });

      // Click interactions
      map.on('click', 'clusters', (e) => {
        const features = map.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        const clusterId = features[0]?.properties?.cluster_id;
        const source: any = map.getSource('facilities');
        if (!source || clusterId === undefined) return;
        source.getClusterExpansionZoom(clusterId, (err: any, zoom: number) => {
          if (err) return;
          const coords = (features[0].geometry as any).coordinates;
          map.easeTo({ center: coords, zoom });
        });
      });

      map.on('click', 'unclustered-point', (e) => {
        const feature = e.features?.[0] as any;
        if (!feature) return;
        const p = feature.properties || {};
        const coords = feature.geometry.coordinates.slice();
        if (!Number.isFinite(coords[0]) || !Number.isFinite(coords[1])) return;

        const name = p.name || 'Facility';
        const operator = p.operator || 'Unknown';
        const facilityType = p.type || '';
        const city = p.city || '';
        const state = p.state || '';
        const status = p.complianceStatus || 'Unknown';
        const facilityId = p.id ? String(p.id) : '';

        // Keep a React-side selection so the tactical panel can act on it.
        setSelectedFacility({
          id: facilityId || undefined,
          name: String(name),
          type: facilityType ? String(facilityType) : undefined,
          operator: String(operator),
          status: String(status),
          city: String(city),
          state: String(state),
          lat: coords[1],
          lng: coords[0]
        });

        // Snap-to-facility waypoint (only when tactical panel is open and in waypoint mode).
        if (snapToFacilityRef.current && atakEnabledRef.current && atakPanelOpenRef.current && tacticalModeRef.current === 'waypoint') {
          addWaypointForFacility({
            id: facilityId || undefined,
            name: String(name),
            type: facilityType ? String(facilityType) : undefined,
            operator: String(operator),
            status: String(status),
            city: String(city),
            state: String(state),
            lat: coords[1],
            lng: coords[0]
          });
        }

        const nextLocation: GooglePaneLocation = {
          lat: coords[1],
          lng: coords[0],
          title: String(name),
          subtitle: `${String(operator)} • ${String(city)}, ${String(state)} • ${String(status)}`
        };
        setGoogleLocation(nextLocation);
        setGoogleRequestedTab('map');
        setGooglePaneOpen(true);

        // If pinned, keep the persisted location synced to the latest selection
        if (googlePinnedRef.current) {
          db.settings.put({ key: 'googlePanePinnedLocation', value: nextLocation }).catch(() => {});
          db.settings.put({ key: 'googlePanePinnedFacilityId', value: facilityId }).catch(() => {});
        }

        const root = document.createElement('div');
        root.style.fontFamily = 'ui-sans-serif, system-ui';
        root.style.color = COLORS.text;
        root.style.maxWidth = '300px';

        const title = document.createElement('div');
        title.style.fontWeight = '700';
        title.style.marginBottom = '4px';
        title.textContent = String(name);

        const meta = document.createElement('div');
        meta.style.color = COLORS.textMuted;
        meta.style.fontSize = '12px';
        meta.style.marginBottom = '8px';
        meta.textContent = `${String(operator)} • ${String(city)}, ${String(state)}`;

        const badgeRow = document.createElement('div');
        badgeRow.style.display = 'flex';
        badgeRow.style.alignItems = 'center';
        badgeRow.style.gap = '8px';
        badgeRow.style.marginBottom = '10px';

        const badge = document.createElement('span');
        badge.style.padding = '2px 8px';
        badge.style.borderRadius = '999px';
        badge.style.background = 'rgba(0,210,211,0.12)';
        badge.style.border = '1px solid rgba(0,210,211,0.25)';
        badge.style.fontSize = '12px';
        badge.textContent = String(status);

        badgeRow.appendChild(badge);

        const actions = document.createElement('div');
        actions.style.display = 'flex';
        actions.style.flexWrap = 'wrap';
        actions.style.gap = '8px';

        const mkBtn = (label: string) => {
          const b = document.createElement('button');
          b.type = 'button';
          b.textContent = label;
          b.style.padding = '6px 10px';
          b.style.borderRadius = '10px';
          b.style.border = '1px solid rgba(90,109,138,0.35)';
          b.style.background = 'rgba(13,18,25,0.85)';
          b.style.color = COLORS.text;
          b.style.fontSize = '12px';
          b.style.fontWeight = '700';
          b.style.cursor = 'pointer';
          return b;
        };

        const btnMap = mkBtn('Open Map');
        btnMap.addEventListener('click', () => {
          setGoogleLocation(nextLocation);
          setGoogleRequestedTab('map');
          setGooglePaneOpen(true);
        });

        const btnStreet = mkBtn('Street View');
        btnStreet.addEventListener('click', () => {
          setGoogleLocation(nextLocation);
          setGoogleRequestedTab('streetview');
          setGooglePaneOpen(true);
        });

        const isPinnedNow = googlePinnedRef.current;
        const btnPin = mkBtn(isPinnedNow ? 'Pinned' : 'Pin');
        btnPin.style.border = isPinnedNow ? '1px solid rgba(0,210,211,0.65)' : btnPin.style.border;
        btnPin.style.background = isPinnedNow ? 'rgba(0,210,211,0.22)' : btnPin.style.background;
        btnPin.addEventListener('click', () => {
          // Toggle pin + persist
          const next = !googlePinnedRef.current;
          setGooglePinned(next);
          db.settings.put({ key: 'googlePanePinned', value: next }).catch(() => {});
          db.settings.put({ key: 'googlePanePinnedLocation', value: next ? nextLocation : null }).catch(() => {});
          db.settings.put({ key: 'googlePanePinnedFacilityId', value: next ? facilityId : null }).catch(() => {});
          setGoogleLocation(nextLocation);
          setGoogleRequestedTab('streetview');
          setGooglePaneOpen(true);
        });

        actions.appendChild(btnMap);
        actions.appendChild(btnStreet);
        actions.appendChild(btnPin);

        root.appendChild(title);
        root.appendChild(meta);
        root.appendChild(badgeRow);
        root.appendChild(actions);

        new maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '340px' })
          .setLngLat(coords)
          .setDOMContent(root)
          .addTo(map);
      });

      map.on('mouseenter', 'clusters', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'clusters', () => (map.getCanvas().style.cursor = ''));
      map.on('mouseenter', 'unclustered-point', () => (map.getCanvas().style.cursor = 'pointer'));
      map.on('mouseleave', 'unclustered-point', () => (map.getCanvas().style.cursor = ''));

      return () => {
        ro.disconnect();
        if (flowAnimTimerRef.current) {
          window.clearInterval(flowAnimTimerRef.current);
          flowAnimTimerRef.current = null;
        }
        map.remove();
        mapRef.current = null;
      };
    } catch (e: any) {
      console.error('[PhotorealisticGisView] Map initialization error:', e);
      setInitError(e?.message || 'Failed to initialize GIS renderer.');
      return;
    }
  }, [
    basemap,
    height,
    mode,
    width,
    enableTerrain
  ]);

  // Stream data updates into MapLibre sources (so time/filter changes don't rebuild the map)
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    const apply = () => {
      try {
        const src = map.getSource?.('facilities');
        if (src?.setData) src.setData(facilitiesGeoJson as any);
      } catch {
        // ignore
      }
    };
    if (map.loaded?.()) apply();
    else map.once?.('load', apply);
  }, [facilitiesGeoJson]);

  // Update ATAK source & layers when ATAK data changes
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;

    const apply = () => {
      try {
        const atakGeoJson = atakToGeoJSON(atakPoints, atakRoutes, atakAreas);

        // Ensure GeoJSON source exists
        const src = map.getSource?.('atak');
        if (src?.setData) {
          src.setData(atakGeoJson as any);
        } else if (!map.getSource?.('atak')) {
          map.addSource('atak', { type: 'geojson', data: atakGeoJson as any });
        }

        // Ensure layers exist (render in MapLibre; the React overlay is just UI chrome)
        const fillId = 'atak-areas-fill';
        const outlineId = 'atak-areas-outline';
        const lineId = 'atak-routes';
        const pointsId = 'atak-points';
        const labelsId = 'atak-labels';

        if (!map.getLayer?.(fillId)) {
          map.addLayer({
            id: fillId,
            type: 'fill',
            source: 'atak',
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: {
              'fill-color': ['coalesce', ['get', 'fillColor'], 'rgba(0,255,0,0.12)'],
              'fill-opacity': ['coalesce', ['get', 'opacity'], 0.25]
            }
          });
        }
        if (!map.getLayer?.(outlineId)) {
          map.addLayer({
            id: outlineId,
            type: 'line',
            source: 'atak',
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: {
              'line-color': ['coalesce', ['get', 'strokeColor'], '#00ff00'],
              'line-width': 2,
              'line-opacity': 0.9
            }
          });
        }
        if (!map.getLayer?.(lineId)) {
          map.addLayer({
            id: lineId,
            type: 'line',
            source: 'atak',
            filter: ['==', ['geometry-type'], 'LineString'],
            paint: {
              'line-color': ['coalesce', ['get', 'color'], '#00ff00'],
              'line-width': 2.5,
              'line-opacity': 0.85
            }
          });
        }
        if (!map.getLayer?.(pointsId)) {
          map.addLayer({
            id: pointsId,
            type: 'circle',
            source: 'atak',
            filter: ['==', ['geometry-type'], 'Point'],
            paint: {
              'circle-color': [
                'match',
                ['coalesce', ['get', 'status'], 'unknown'],
                'friendly',
                '#2ed573',
                'hostile',
                '#ff4757',
                'neutral',
                '#ffa502',
                '#9ca3af'
              ],
              'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 4, 6, 6, 10, 8, 14, 10],
              'circle-opacity': 0.95,
              'circle-stroke-color': 'rgba(0,0,0,0.6)',
              'circle-stroke-width': 1
            }
          });
        }
        if (!map.getLayer?.(labelsId)) {
          map.addLayer({
            id: labelsId,
            type: 'symbol',
            source: 'atak',
            filter: ['==', ['geometry-type'], 'Point'],
            layout: {
              'text-field': ['coalesce', ['get', 'callsign'], ['get', 'name'], ''],
              'text-size': 11,
              'text-offset': [0, 1.1],
              'text-anchor': 'top',
              'text-allow-overlap': false
            },
            paint: {
              'text-color': '#e8eef6',
              'text-halo-color': 'rgba(0,0,0,0.85)',
              'text-halo-width': 1.2
            }
          });
        }

        // Visibility control
        const vis = atakEnabled ? 'visible' : 'none';
        map.setLayoutProperty?.(fillId, 'visibility', vis);
        map.setLayoutProperty?.(outlineId, 'visibility', vis);
        map.setLayoutProperty?.(lineId, 'visibility', vis);
        map.setLayoutProperty?.(pointsId, 'visibility', vis);
        map.setLayoutProperty?.(labelsId, 'visibility', atakEnabled && atakShowLabels ? 'visible' : 'none');
      } catch (e) {
        console.error('[PhotorealisticGisView] Error updating ATAK layers:', e);
      }
    };

    if (map.loaded?.()) apply();
    else map.once?.('load', apply);
  }, [atakEnabled, atakPoints, atakRoutes, atakAreas, atakShowLabels]);

  // Click-to-zoom on ATAK points (when enabled)
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    if (!atakEnabled) return;

    const pointsLayer = 'atak-points';
    const handler = (e: any) => {
      const f = e?.features?.[0];
      const coords = f?.geometry?.coordinates;
      if (!coords || coords.length < 2) return;
      const [lng, lat] = coords;
      if (!Number.isFinite(lng) || !Number.isFinite(lat)) return;

      // Lift into selection when possible
      const props = (f?.properties || {}) as any;
      const facilityId = props.facilityId ? String(props.facilityId) : undefined;
      setSelectedFacility({
        id: facilityId,
        name: String(props.callsign || props.name || 'Waypoint'),
        type: props.role ? String(props.role) : props.facilityType ? String(props.facilityType) : undefined,
        operator: props.team ? String(props.team) : props.operator ? String(props.operator) : undefined,
        status: props.complianceStatus ? String(props.complianceStatus) : props.status ? String(props.status) : undefined,
        city: props.city ? String(props.city) : undefined,
        state: props.state ? String(props.state) : undefined,
        lat: Number(lat),
        lng: Number(lng),
      });

      setBasemap('satellite');
      const z = Number(map.getZoom?.() ?? 0);
      const nextZoom = Math.max(16, Number.isFinite(z) ? z : 0);
      map.easeTo?.({ center: [Number(lng), Number(lat)], zoom: nextZoom, duration: 650 });
    };

    const bind = () => {
      if (!map.getLayer?.(pointsLayer)) return false;
      map.on?.('click', pointsLayer, handler);
      map.on?.('mouseenter', pointsLayer, () => (map.getCanvas().style.cursor = 'pointer'));
      map.on?.('mouseleave', pointsLayer, () => (map.getCanvas().style.cursor = ''));
      return true;
    };

    // Only bind once layer exists
    let bound = false;
    let t: number | null = null;
    const tryBind = () => {
      if (bound) return;
      bound = bind();
      if (!bound) t = window.setTimeout(tryBind, 250);
    };
    tryBind();

    return () => {
      if (t) window.clearTimeout(t);
      if (map.getLayer?.(pointsLayer)) {
        map.off?.('click', pointsLayer, handler);
      }
      try {
        map.getCanvas().style.cursor = '';
      } catch {
        // ignore
      }
    };
  }, [atakEnabled]);

  // Draft geometry (route/area/measure) rendering
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;

    const apply = () => {
      try {
        const sid = 'atak-draft';
        const lineId = 'atak-draft-line';
        const fillId = 'atak-draft-fill';
        const ptsId = 'atak-draft-vertices';

        const active = atakEnabled && atakPanelOpen && draftVertices.length > 0 && tacticalMode !== 'none';

        const asCoords = draftVertices.map((p) => [p.lng, p.lat]);
        const lineFeature =
          tacticalMode === 'route' || tacticalMode === 'measure'
            ? {
                type: 'Feature' as const,
                geometry: { type: 'LineString' as const, coordinates: asCoords },
                properties: { kind: tacticalMode }
              }
            : null;
        const polyFeature =
          tacticalMode === 'area' && asCoords.length >= 3
            ? {
                type: 'Feature' as const,
                geometry: { type: 'Polygon' as const, coordinates: [[...asCoords, asCoords[0]] as any] },
                properties: { kind: 'area' }
              }
            : null;
        const vertices = {
          type: 'Feature' as const,
          geometry: { type: 'MultiPoint' as const, coordinates: asCoords },
          properties: { kind: 'vertices' }
        };

        const fc = {
          type: 'FeatureCollection' as const,
          features: [lineFeature, polyFeature, vertices].filter(Boolean)
        };

        const src = map.getSource?.(sid);
        if (src?.setData) src.setData(fc as any);
        else if (!map.getSource?.(sid)) map.addSource(sid, { type: 'geojson', data: fc as any });

        if (!map.getLayer?.(fillId)) {
          map.addLayer({
            id: fillId,
            type: 'fill',
            source: sid,
            filter: ['==', ['geometry-type'], 'Polygon'],
            paint: { 'fill-color': 'rgba(0,210,211,0.18)', 'fill-outline-color': 'rgba(0,210,211,0.9)', 'fill-opacity': 0.6 }
          });
        }
        if (!map.getLayer?.(lineId)) {
          map.addLayer({
            id: lineId,
            type: 'line',
            source: sid,
            filter: ['==', ['geometry-type'], 'LineString'],
            paint: { 'line-color': 'rgba(0,210,211,0.95)', 'line-width': 2.5, 'line-opacity': 0.95, 'line-dasharray': [1, 1.5] }
          });
        }
        if (!map.getLayer?.(ptsId)) {
          map.addLayer({
            id: ptsId,
            type: 'circle',
            source: sid,
            filter: ['==', ['geometry-type'], 'MultiPoint'],
            paint: { 'circle-color': 'rgba(255,255,255,0.95)', 'circle-radius': 4.5, 'circle-opacity': 0.95, 'circle-stroke-color': 'rgba(0,0,0,0.7)', 'circle-stroke-width': 1 }
          });
        }

        map.setLayoutProperty?.(fillId, 'visibility', active && tacticalMode === 'area' ? 'visible' : 'none');
        map.setLayoutProperty?.(lineId, 'visibility', active ? 'visible' : 'none');
        map.setLayoutProperty?.(ptsId, 'visibility', active ? 'visible' : 'none');
      } catch {
        // ignore
      }
    };

    if (map.loaded?.()) apply();
    else map.once?.('load', apply);
  }, [atakEnabled, atakPanelOpen, draftVertices, tacticalMode]);

  // Construction imagery overlay (dated Sentinel tiles)
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;

    const sid = 'construction-overlay';
    const layerId = 'construction-overlay-raster';

    let cancelled = false;

    const apply = async () => {
      try {
        if (!constructionOverlaySceneId) {
          if (map.getLayer?.(layerId)) map.removeLayer(layerId);
          if (map.getSource?.(sid)) map.removeSource(sid);
          return;
        }

        const tj = await fetchSentinelTileJson(constructionOverlaySceneId);
        if (cancelled) return;

        if (map.getLayer?.(layerId)) {
          map.setPaintProperty?.(layerId, 'raster-opacity', constructionOverlayOpacity);
          return;
        }

        if (map.getSource?.(sid)) {
          try {
            map.removeSource(sid);
          } catch {
            // ignore
          }
        }

        map.addSource(sid, {
          type: 'raster',
          tiles: tj.tiles,
          tileSize: (tj as any).tileSize || 256,
          minzoom: tj.minzoom ?? 0,
          maxzoom: tj.maxzoom ?? 18,
          bounds: tj.bounds,
        });

        // Place overlay above basemap but below facility markers (best-effort)
        const before = map.getLayer?.('unclustered-point-shadow') ? 'unclustered-point-shadow' : undefined;
        map.addLayer(
          {
            id: layerId,
            type: 'raster',
            source: sid,
            paint: {
              'raster-opacity': constructionOverlayOpacity,
              'raster-saturation': 0.05,
              'raster-contrast': 0.1,
            },
          },
          before
        );
      } catch (e) {
        console.warn('[PhotorealisticGisView] Construction overlay failed:', e);
      }
    };

    if (map.loaded?.()) apply();
    else map.once?.('load', apply);

    return () => {
      cancelled = true;
    };
  }, [constructionOverlayOpacity, constructionOverlaySceneId]);

  // Browser tactical interactions (click-to-draw)
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;

    const active = atakEnabled && atakPanelOpen && tacticalMode !== 'none';
    if (!active) return;

    const prevDbl = map.doubleClickZoom?.isEnabled?.() ? true : false;
    map.doubleClickZoom?.disable?.();

    const onMove = (e: any) => {
      const ll = e?.lngLat;
      if (!ll) return;
      setCursorLngLat({ lng: ll.lng, lat: ll.lat });
    };

    const onClick = (e: any) => {
      const ll = e?.lngLat;
      if (!ll) return;
      const p: LngLat = { lng: ll.lng, lat: ll.lat };

      if (tacticalMode === 'waypoint') {
        setAtakPoints((prev) => [
          ...prev,
          {
            lat: p.lat,
            lon: p.lng,
            callsign: `WP ${prev.length + 1}`,
            status: 'friendly',
            timestamp: new Date().toISOString(),
          }
        ]);
        return;
      }

      if (tacticalMode === 'route' || tacticalMode === 'area' || tacticalMode === 'measure') {
        setDraftVertices((prev) => [...prev, p]);
      }
    };

    const onDblClick = (e: any) => {
      try {
        e?.preventDefault?.();
        e?.originalEvent?.preventDefault?.();
      } catch {
        // ignore
      }

      if (tacticalMode === 'route') {
        if (draftVertices.length >= 2) {
          const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const route: ATAKRoute = {
            id,
            name: `Route ${atakRoutes.length + 1}`,
            color: '#00d2d3',
            style: 'dashed',
            points: draftVertices.map((v) => ({ lat: v.lat, lon: v.lng }))
          };
          setAtakRoutes((prev) => [route, ...prev]);
          setDraftVertices([]);
        }
        return;
      }

      if (tacticalMode === 'area') {
        if (draftVertices.length >= 3) {
          const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          const area: ATAKArea = {
            id,
            name: `Area ${atakAreas.length + 1}`,
            fillColor: 'rgba(0,210,211,0.18)',
            strokeColor: 'rgba(0,210,211,0.95)',
            opacity: 0.55,
            points: draftVertices.map((v) => ({ lat: v.lat, lon: v.lng }))
          };
          setAtakAreas((prev) => [area, ...prev]);
          setDraftVertices([]);
        }
        return;
      }

      if (tacticalMode === 'measure') {
        setDraftVertices([]);
      }
    };

    map.on?.('mousemove', onMove);
    map.on?.('click', onClick);
    map.on?.('dblclick', onDblClick);

    return () => {
      map.off?.('mousemove', onMove);
      map.off?.('click', onClick);
      map.off?.('dblclick', onDblClick);
      if (prevDbl) map.doubleClickZoom?.enable?.();
    };
  }, [atakAreas.length, atakEnabled, atakPanelOpen, atakRoutes.length, draftVertices, tacticalMode]);

  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    const apply = () => {
      try {
        const src = map.getSource?.('connectography-flows');
        if (src?.setData) src.setData(connectographyFlowsGeoJson as any);
      } catch {
        // ignore
      }
    };
    if (map.loaded?.()) apply();
    else map.once?.('load', apply);
  }, [connectographyFlowsGeoJson]);

  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    const apply = () => {
      try {
        const src = map.getSource?.('topology');
        if (src?.setData) src.setData(topologyLinesGeoJson as any);
      } catch {
        // ignore
      }
    };
    if (map.loaded?.()) apply();
    else map.once?.('load', apply);
  }, [topologyLinesGeoJson]);

  // Auto-zoom to search results when search query changes (with circuit breaker)
  useEffect(() => {
    if (!searchQuery.trim()) return;
    
    const map = mapRef.current as any;
    if (!map) return;
    
    const apply = async () => {
      try {
        // Use circuit breaker to prevent cascading failures
        await circuitBreakers.mapZoom.execute(async () => {
          const bounds = getFacilitiesBounds(searchFilteredFacilities);
          if (bounds) {
            map.easeTo({
              center: bounds.center,
              zoom: bounds.zoom,
              duration: 1000
            });
            setSearchResults(searchFilteredFacilities);
            console.log('[PhotorealisticGisView] Zoomed to search results:', searchFilteredFacilities.length, 'facilities');
          }
        }, () => {
          // Fallback: just show results without zooming
          setSearchResults(searchFilteredFacilities);
          console.warn('[PhotorealisticGisView] Map zoom circuit breaker active, showing results without zoom');
        });
      } catch (e) {
        console.warn('[PhotorealisticGisView] Error zooming to search:', e);
        // Still show results even if zoom fails
        setSearchResults(searchFilteredFacilities);
      }
    };
    
    if (map.loaded?.()) {
      apply();
    } else {
      map.once?.('load', apply);
    }
  }, [searchQuery, searchFilteredFacilities]);

  // Auto-fit bounds when visible facilities change (but not during search)
  useEffect(() => {
    if (searchQuery.trim()) return; // Skip auto-fit during active search
    
    const map = mapRef.current as any;
    if (!map) return;
    const apply = () => {
      try {
        if (visibleFacilitiesWithCoords.length === 0) return;
        const bounds = visibleFacilitiesWithCoords.reduce(
          (b, f) => b.extend([f.longitude!, f.latitude!]),
          new maplibregl.LngLatBounds(
            [visibleFacilitiesWithCoords[0].longitude!, visibleFacilitiesWithCoords[0].latitude!],
            [visibleFacilitiesWithCoords[0].longitude!, visibleFacilitiesWithCoords[0].latitude!]
          )
        );
        map.fitBounds(bounds as unknown as LngLatBoundsLike, { padding: 40, maxZoom: 6, duration: 700 });
      } catch {
        // ignore
      }
    };
    if (map.loaded?.()) apply();
    else map.once?.('load', apply);
  }, [visibleFacilitiesWithCoords, searchQuery]);

  // Track current viewport for scenes
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    const handler = () => {
      try {
        const c = map.getCenter?.();
        setViewport({
          center: [Number(c.lng), Number(c.lat)],
          zoom: Number(map.getZoom?.()),
          bearing: Number(map.getBearing?.()),
          pitch: Number(map.getPitch?.())
        });
      } catch {
        // ignore
      }
    };
    if (map.loaded?.()) handler();
    map.on?.('moveend', handler);
    return () => {
      map.off?.('moveend', handler);
    };
  }, [basemap, mode]);

  // Sync custom overlay layers into map
  useEffect(() => {
    const map = mapRef.current as any;
    if (!map) return;
    const apply = () => {
      try {
        const wanted = new Set(customLayers.map((l) => `custom-${l.id}`));
        const style = map.getStyle?.();
        const existingSources = style?.sources ? Object.keys(style.sources) : [];
        const existingCustom = existingSources.filter((s: string) => s.startsWith('custom-'));

        // Remove stale custom layers
        for (const sid of existingCustom) {
          if (wanted.has(sid)) continue;
          const circleId = `${sid}-circle`;
          const lineId = `${sid}-line`;
          const fillId = `${sid}-fill`;
          if (map.getLayer?.(circleId)) map.removeLayer(circleId);
          if (map.getLayer?.(lineId)) map.removeLayer(lineId);
          if (map.getLayer?.(fillId)) map.removeLayer(fillId);
          if (map.getSource?.(sid)) map.removeSource(sid);
        }

        for (const layer of customLayers) {
          const sid = `custom-${layer.id}`;
          if (!map.getSource?.(sid)) {
            map.addSource(sid, { type: 'geojson', data: layer.geojson as any });
          } else {
            const src = map.getSource(sid);
            if (src?.setData) src.setData(layer.geojson as any);
          }

          // Add basic style layers for each geometry type
          const circleId = `${sid}-circle`;
          const lineId = `${sid}-line`;
          const fillId = `${sid}-fill`;

          if (!map.getLayer?.(fillId)) {
            map.addLayer({
              id: fillId,
              type: 'fill',
              source: sid,
              filter: ['==', ['geometry-type'], 'Polygon'],
              paint: { 'fill-color': 'rgba(0,210,211,0.18)', 'fill-outline-color': 'rgba(0,210,211,0.6)', 'fill-opacity': 0.8 }
            });
          }
          if (!map.getLayer?.(lineId)) {
            map.addLayer({
              id: lineId,
              type: 'line',
              source: sid,
              filter: ['==', ['geometry-type'], 'LineString'],
              paint: { 'line-color': 'rgba(0,210,211,0.8)', 'line-width': 2.2, 'line-opacity': 0.85 }
            });
          }
          if (!map.getLayer?.(circleId)) {
            map.addLayer({
              id: circleId,
              type: 'circle',
              source: sid,
              filter: ['==', ['geometry-type'], 'Point'],
              paint: { 'circle-color': 'rgba(0,210,211,0.9)', 'circle-radius': 6, 'circle-opacity': 0.9, 'circle-stroke-color': 'rgba(0,0,0,0.55)', 'circle-stroke-width': 1 }
            });
          }

          const vis = layer.visible ? 'visible' : 'none';
          map.setLayoutProperty?.(fillId, 'visibility', vis);
          map.setLayoutProperty?.(lineId, 'visibility', vis);
          map.setLayoutProperty?.(circleId, 'visibility', vis);
        }
      } catch {
        // ignore
      }
    };
    if (map.loaded?.()) apply();
    else map.once?.('load', apply);
  }, [customLayers]);

  // Load & persist basemap preference
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get('gisBasemap');
        const v = row?.value as any;
        if (!cancelled && (v === 'satellite' || v === 'osm' || v === 'osm-hot' || v === 'dark')) {
          setBasemap(v);
        }
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsKey]);

  useEffect(() => {
    db.settings.put({ key: 'gisBasemap', value: basemap }).catch(() => {});
  }, [basemap]);

  // Load Google key (refresh when settings modal closes)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get('googleMapsApiKey');
        if (!cancelled) setGoogleKey((row?.value as string) || '');
      } catch {
        if (!cancelled) setGoogleKey('');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsOpen]);

  // Load/persist Connectography filters
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get(settingsKey('filters'));
        const v = row?.value as any;
        if (cancelled || !v || typeof v !== 'object') return;
        if (!v.statuses) return;
        setFilters((prev) => ({
          ...prev,
          operatorQuery: typeof v.operatorQuery === 'string' ? v.operatorQuery : prev.operatorQuery,
          selectedOperators: Array.isArray(v.selectedOperators) ? v.selectedOperators : prev.selectedOperators,
          statuses: {
            Compliant: typeof v.statuses.Compliant === 'boolean' ? v.statuses.Compliant : prev.statuses.Compliant,
            'Non-Compliant': typeof v.statuses['Non-Compliant'] === 'boolean' ? v.statuses['Non-Compliant'] : prev.statuses['Non-Compliant'],
            'At Risk': typeof v.statuses['At Risk'] === 'boolean' ? v.statuses['At Risk'] : prev.statuses['At Risk'],
            Unknown: typeof v.statuses.Unknown === 'boolean' ? v.statuses.Unknown : prev.statuses.Unknown,
          },
          minSubsidyGap: typeof v.minSubsidyGap === 'number' ? v.minSubsidyGap : prev.minSubsidyGap,
          minMetricValue: typeof v.minMetricValue === 'number' ? v.minMetricValue : prev.minMetricValue,
          yearStart: typeof v.yearStart === 'number' ? v.yearStart : prev.yearStart,
          yearEnd: typeof v.yearEnd === 'number' ? v.yearEnd : prev.yearEnd,
        }));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsKey]);

  useEffect(() => {
    db.settings.put({ key: settingsKey('filters'), value: filters }).catch(() => {});
  }, [filters, settingsKey]);

  // Clamp year range to available data
  useEffect(() => {
    setFilters((prev) => {
      const y0 = Math.max(availableYears.min, Math.min(availableYears.max, prev.yearStart));
      const y1 = Math.max(availableYears.min, Math.min(availableYears.max, prev.yearEnd));
      const start = Math.min(y0, y1);
      const end = Math.max(y0, y1);
      if (start === prev.yearStart && end === prev.yearEnd) return prev;
      return { ...prev, yearStart: start, yearEnd: end };
    });
  }, [availableYears.max, availableYears.min]);

  // Load/persist scenes
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get(settingsKey('scenes'));
        const v = row?.value as any;
        if (cancelled) return;
        if (Array.isArray(v)) setScenes(v as any);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsKey]);

  useEffect(() => {
    db.settings.put({ key: settingsKey('scenes'), value: scenes }).catch(() => {});
  }, [scenes, settingsKey]);

  // Load/persist custom overlays
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get(settingsKey('customLayers'));
        const v = row?.value as any;
        if (cancelled) return;
        if (Array.isArray(v)) setCustomLayers(v as any);
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    db.settings.put({ key: settingsKey('customLayers'), value: customLayers }).catch(() => {});
  }, [customLayers, settingsKey]);

  // Time playback (moves the end-year forward)
  useEffect(() => {
    if (timeTimerRef.current) {
      window.clearInterval(timeTimerRef.current);
      timeTimerRef.current = null;
    }
    if (!timePlaying) return;
    timeTimerRef.current = window.setInterval(() => {
      setFilters((prev) => {
        const nextEnd = prev.yearEnd + 1 > availableYears.max ? availableYears.min : prev.yearEnd + 1;
        const end = Math.max(prev.yearStart, nextEnd);
        return { ...prev, yearEnd: end };
      });
    }, 700);
    return () => {
      if (timeTimerRef.current) {
        window.clearInterval(timeTimerRef.current);
        timeTimerRef.current = null;
      }
    };
  }, [availableYears.max, availableYears.min, timePlaying]);

  // Load pinned pane state (restore across reloads)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pinnedRow = await db.settings.get('googlePanePinned');
        const locRow = await db.settings.get('googlePanePinnedLocation');
        const pinned = Boolean(pinnedRow?.value);
        const loc = (locRow?.value as any) || null;
        if (cancelled) return;
        setGooglePinned(pinned);
        if (pinned && loc?.lat != null && loc?.lng != null) {
          setGoogleLocation({
            lat: Number(loc.lat),
            lng: Number(loc.lng),
            title: typeof loc.title === 'string' ? loc.title : undefined,
            subtitle: typeof loc.subtitle === 'string' ? loc.subtitle : undefined
          });
          setGooglePaneOpen(true);
        }
      } catch {
        if (!cancelled) setGooglePinned(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load Connectography layer settings
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get(settingsKey('layerSettings'));
        const v = row?.value as any;
        if (cancelled) return;
        if (!v || typeof v !== 'object') return;
        if (!v.layers || !v.opacity) return;

        setConnectography((prev) => ({
          layers: {
            facilities: typeof v.layers.facilities === 'boolean' ? v.layers.facilities : prev.layers.facilities,
            heatmap: typeof v.layers.heatmap === 'boolean' ? v.layers.heatmap : prev.layers.heatmap,
            topology: typeof v.layers.topology === 'boolean' ? v.layers.topology : prev.layers.topology,
            flows: typeof v.layers.flows === 'boolean' ? v.layers.flows : prev.layers.flows,
            corridors: typeof v.layers.corridors === 'boolean' ? v.layers.corridors : prev.layers.corridors,
            footprints: typeof v.layers.footprints === 'boolean' ? v.layers.footprints : prev.layers.footprints,
            simulation: typeof v.layers.simulation === 'boolean' ? v.layers.simulation : prev.layers.simulation
          },
          opacity: {
            heatmap: typeof v.opacity.heatmap === 'number' ? v.opacity.heatmap : prev.opacity.heatmap,
            topology: typeof v.opacity.topology === 'number' ? v.opacity.topology : prev.opacity.topology,
            flows: typeof v.opacity.flows === 'number' ? v.opacity.flows : prev.opacity.flows,
            corridors: typeof v.opacity.corridors === 'number' ? v.opacity.corridors : prev.opacity.corridors,
            footprints: typeof v.opacity.footprints === 'number' ? v.opacity.footprints : prev.opacity.footprints,
            simulation: typeof v.opacity.simulation === 'number' ? v.opacity.simulation : prev.opacity.simulation
          },
          animateFlows: typeof v.animateFlows === 'boolean' ? v.animateFlows : prev.animateFlows
        }));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsKey]);

  useEffect(() => {
    db.settings.put({ key: settingsKey('layerSettings'), value: connectography }).catch(() => {});
  }, [connectography]);

  // Load/persist simulation settings (canvas overlay; no localStorage)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const row = await db.settings.get(settingsKey('simulation'));
        const v = row?.value as any;
        if (cancelled) return;
        if (!v || typeof v !== 'object') return;
        setSimulation((prev) => ({
          intensity: typeof v.intensity === 'number' ? v.intensity : prev.intensity,
          speed: typeof v.speed === 'number' ? v.speed : prev.speed,
          trail: typeof v.trail === 'number' ? v.trail : prev.trail,
          opacity: typeof v.opacity === 'number' ? v.opacity : prev.opacity,
          particleSize: typeof v.particleSize === 'number' ? v.particleSize : prev.particleSize
        }));
      } catch {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [settingsKey]);

  useEffect(() => {
    db.settings.put({ key: settingsKey('simulation'), value: simulation }).catch(() => {});
  }, [simulation, settingsKey]);

  // Pulsing animation for markers
  useEffect(() => {
    if (!pulseAnimation) return;
    const map = mapRef.current;
    if (!map || !map.getLayer('unclustered-point-glow')) return;

    const animate = () => {
      pulsePhaseRef.current = (pulsePhaseRef.current + 0.05) % (Math.PI * 2);
      const opacity = 0.15 + Math.sin(pulsePhaseRef.current) * 0.15;
      const scale = 1 + Math.sin(pulsePhaseRef.current) * 0.2;
      
      try {
        map.setPaintProperty('unclustered-point-glow', 'circle-opacity', opacity);
        const currentRadius = map.getPaintProperty('unclustered-point-glow', 'circle-radius') as any;
        if (Array.isArray(currentRadius)) {
          // Interpolate expression - adjust base values
          const baseRadius = currentRadius[2] || 6;
          map.setPaintProperty('unclustered-point-glow', 'circle-radius', baseRadius * scale);
        }
      } catch (e) {
        // Ignore errors during animation
      }
      
      requestAnimationFrame(animate);
    };
    
    const animId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animId);
  }, [pulseAnimation, connectography.layers.facilities]);

  // Fetch weather data for overlay
  useEffect(() => {
    if (!enableWeather || !mapRef.current) return;
    
    const fetchWeather = async () => {
      try {
        // Get map bounds
        const map = mapRef.current;
        if (!map) return;
        const bounds = map.getBounds();
        const center = map.getCenter();
        
        // Use OpenWeatherMap free tier (requires API key, but we'll make it optional)
        // For now, we'll use a mock/placeholder approach
        // In production, you'd fetch: `https://api.openweathermap.org/data/2.5/weather?lat=${center.lat}&lon=${center.lng}&appid=${apiKey}`
        
        // Placeholder weather data structure
        setWeatherData({
          temperature: 72,
          condition: 'partly-cloudy',
          humidity: 65,
          windSpeed: 8,
          timestamp: Date.now()
        });
      } catch (e) {
        console.warn('Weather data unavailable:', e);
      }
    };
    
    fetchWeather();
    const interval = setInterval(fetchWeather, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [enableWeather, mapRef]);

  // Add real-time traffic overlay (using OpenStreetMap traffic tiles)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    
    // Note: Real traffic data requires paid APIs, but we can add a visual indicator
    // For free tier, we'll use a placeholder approach
    // In production, integrate with: Mapbox Traffic API, Google Traffic Layer, or HERE Traffic
    
    return () => {
      // Cleanup
    };
  }, [mapRef]);

  // Apply visibility/opacity + flow animation
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const setVisible = (layerId: string, visible: boolean) => {
      if (!map.getLayer(layerId)) return;
      map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
    };

    // Facilities points/cluster
    const showFacilities = connectography.layers.facilities;
    setVisible('clusters', showFacilities);
    setVisible('cluster-count', showFacilities);
    setVisible('unclustered-point', showFacilities);
    setVisible('unclustered-point-shadow', showFacilities);
    if (map.getLayer('unclustered-point-glow')) {
      setVisible('unclustered-point-glow', showFacilities && pulseAnimation);
    }

    // Heatmap
    setVisible('facilities-heatmap', connectography.layers.heatmap);
    if (map.getLayer('facilities-heatmap')) {
      map.setPaintProperty('facilities-heatmap', 'heatmap-opacity', connectography.opacity.heatmap);
    }

    // Topology
    if (map.getLayer('topology-lines')) {
      setVisible('topology-lines', connectography.layers.topology);
      map.setPaintProperty('topology-lines', 'line-opacity', connectography.opacity.topology);
    }
    if (map.getLayer('topology-envelope')) {
      setVisible('topology-envelope', connectography.layers.topology && connectography.layers.corridors);
      map.setPaintProperty('topology-envelope', 'line-opacity', connectography.opacity.corridors);
    }

    // Flows
    setVisible('connectography-flows', connectography.layers.flows);
    if (map.getLayer('connectography-flows')) {
      map.setPaintProperty('connectography-flows', 'line-opacity', connectography.opacity.flows);
    }
    if (map.getLayer('connectography-flows-envelope')) {
      setVisible('connectography-flows-envelope', connectography.layers.flows && connectography.layers.corridors);
      map.setPaintProperty('connectography-flows-envelope', 'line-opacity', connectography.opacity.corridors);
    }

    // Footprints (MapLibre layers; data updates are event-driven)
    if (map.getLayer('facility-footprints-fill')) {
      setVisible('facility-footprints-fill', connectography.layers.footprints);
      map.setPaintProperty('facility-footprints-fill', 'fill-opacity', connectography.opacity.footprints);
    }
    if (map.getLayer('facility-footprints-line')) {
      setVisible('facility-footprints-line', connectography.layers.footprints);
    }
    if (map.getLayer('facility-footprints-extrude')) {
      setVisible('facility-footprints-extrude', connectography.layers.footprints);
    }

    // Animate flows by shifting dash phases
    if (flowAnimTimerRef.current) {
      window.clearInterval(flowAnimTimerRef.current);
      flowAnimTimerRef.current = null;
    }
    if (connectography.layers.flows && connectography.animateFlows && map.getLayer('connectography-flows')) {
      let step = 0;
      flowAnimTimerRef.current = window.setInterval(() => {
        const phase = step % 6;
        const dash =
          phase === 0
            ? [1, 2]
            : phase === 1
              ? [0.5, 2]
              : phase === 2
                ? [0.2, 2]
                : phase === 3
                  ? [0.2, 1.6]
                  : phase === 4
                    ? [0.5, 1.6]
                    : [1, 1.6];
        try {
          map.setPaintProperty('connectography-flows', 'line-dasharray', dash as any);
        } catch {
          // ignore
        }
        step++;
      }, 250);
    }

    return () => {
      if (flowAnimTimerRef.current) {
        window.clearInterval(flowAnimTimerRef.current);
        flowAnimTimerRef.current = null;
      }
    };
  }, [connectography]);

  // Metric-driven point coloring (so each feature gets its own Connectography lens)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!map.getLayer('unclustered-point')) return;

    const complianceColor = [
      'match',
      ['get', 'complianceStatus'],
      'Compliant',
      COLORS.green,
      'Non-Compliant',
      COLORS.red,
      'At Risk',
      COLORS.yellow,
      '#6b7280'
    ] as any;

    const byMetric = (() => {
      if (metric === 'issuesCount') {
        return ['step', ['coalesce', ['get', 'metricValue'], 0], COLORS.green, 1, COLORS.yellow, 3, COLORS.red] as any;
      }
      if (metric === 'auditRecencyDays') {
        return ['step', ['coalesce', ['get', 'metricValue'], 0], COLORS.green, 90, COLORS.yellow, 180, COLORS.red] as any;
      }
      if (metric === 'safetyRisk') {
        return ['step', ['coalesce', ['get', 'metricValue'], 0], COLORS.green, 15, COLORS.yellow, 45, COLORS.red] as any;
      }
      // subsidyGap: keep compliance colors (gap is already communicated by flows/heatmap)
      return complianceColor;
    })();

    try {
      map.setPaintProperty('unclustered-point', 'circle-color', byMetric);
    } catch {
      // ignore
    }
  }, [metric]);

  const togglePin = async () => {
    const next = !googlePinned;
    setGooglePinned(next);
    try {
      await db.settings.put({ key: 'googlePanePinned', value: next });
      if (next && googleLocation) {
        await db.settings.put({ key: 'googlePanePinnedLocation', value: googleLocation });
      }
      if (!next) {
        await db.settings.put({ key: 'googlePanePinnedLocation', value: null });
      }
    } catch {
      // ignore persistence failure
    }
  };

  const toggleTimePlaying = () => {
    setTimePlaying((v) => !v);
  };

  const metricUi = useMemo(() => {
    if (metric === 'subsidyGap') {
      return {
        label: 'subsidy gap',
        max: 25000000,
        step: 250000,
        format: (v: number) => `${'$'}${Math.round(v).toLocaleString()}`
      };
    }
    if (metric === 'auditRecencyDays') {
      return { label: 'days since audit', max: 720, step: 10, format: (v: number) => `${Math.round(v)} days` };
    }
    if (metric === 'issuesCount') {
      return { label: 'issue count', max: 20, step: 1, format: (v: number) => `${Math.round(v)} issues` };
    }
    // safetyRisk
    return { label: 'safety risk', max: 120, step: 5, format: (v: number) => `${Math.round(v)} score` };
  }, [metric]);

  const downloadJson = (obj: any, filename: string) => {
    try {
      const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      // ignore
    }
  };

  const exportActions = {
    exportFacilitiesGeoJson: () => downloadJson(facilitiesGeoJson, 'dcim-facilities.geojson'),
    exportFlowsGeoJson: () => downloadJson(connectographyFlowsGeoJson, 'dcim-connectography-flows.geojson'),
    exportTopologyGeoJson: () => downloadJson(topologyLinesGeoJson, 'dcim-topology.geojson')
  };

  const saveScene = (name: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const scene: ConnectographyScene = {
      id,
      name: name.trim() || 'Scene',
      createdAt: new Date().toISOString(),
      basemap,
      connectography,
      filters,
      viewport: viewport ?? undefined
    };
    setScenes((prev) => [scene, ...prev].slice(0, 200));
  };

  const loadScene = (sceneId: string) => {
    const scene = scenes.find((s) => s.id === sceneId);
    if (!scene) return;
    setBasemap(scene.basemap);
    setConnectography(scene.connectography);
    setFilters(scene.filters);
    setToolkitOpen(false);
    const map: any = mapRef.current;
    if (map && scene.viewport) {
      map.easeTo?.({
        center: scene.viewport.center,
        zoom: scene.viewport.zoom,
        bearing: scene.viewport.bearing,
        pitch: scene.viewport.pitch,
        duration: 700
      });
    }
  };

  const deleteScene = (sceneId: string) => {
    setScenes((prev) => prev.filter((s) => s.id !== sceneId));
  };

  const readTextFile = useCallback((file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.onload = () => resolve(String(reader.result || ''));
      reader.readAsText(file);
    });
  }, []);

  const importAtakKml = useCallback(
    async (file: File) => {
      const content = await readTextFile(file);
      const parsed = parseKML(content);
      setAtakPoints((prev) => [...prev, ...parsed.points]);
      setAtakRoutes((prev) => [...prev, ...parsed.routes]);
      setAtakAreas((prev) => [...prev, ...parsed.areas]);
      setAtakEnabled(true);
    },
    [readTextFile]
  );

  const importAtakGpx = useCallback(
    async (file: File) => {
      const content = await readTextFile(file);
      const parsed = parseGPX(content);
      setAtakPoints((prev) => [...prev, ...parsed.points]);
      setAtakRoutes((prev) => [...prev, ...parsed.routes]);
      setAtakEnabled(true);
    },
    [readTextFile]
  );

  const importAtakCoT = useCallback(
    async (file: File) => {
      const content = await readTextFile(file);
      const parsed = parseCoT(content);
      setAtakPoints((prev) => [...prev, ...parsed.points]);
      setAtakRoutes((prev) => [...prev, ...parsed.routes]);
      setAtakAreas((prev) => [...prev, ...parsed.areas]);
      setAtakEnabled(true);
    },
    [readTextFile]
  );

  const exportAtakGeoJson = useCallback(() => {
    const data = atakToGeoJSON(atakPoints, atakRoutes, atakAreas);
    downloadJson(data, `atak-export-${Date.now()}.geojson`);
  }, [atakAreas, atakPoints, atakRoutes]);

  const atakPointsWithIds = useMemo(() => attachIdsToPoints(atakPoints), [atakPoints]);

  const addWaypointForFacility = useCallback(
    (facility: { id?: string | number; name: string; type?: string; operator?: string; status?: string; city?: string; state?: string; lat: number; lng: number }) => {
      const facilityId = facility.id ? String(facility.id) : '';
      setAtakPoints((prev) => {
        if (facilityId) {
          const exists = prev.some((p) => String((p as any)?.metadata?.facilityId || '') === facilityId);
          if (exists) return prev;
        }
        const next: ATAKPoint = {
          lat: facility.lat,
          lon: facility.lng,
          callsign: facility.name,
          team: facility.operator,
          role: facility.type,
          status:
            facility.status === 'Compliant'
              ? 'friendly'
              : facility.status === 'Non-Compliant'
                ? 'hostile'
                : facility.status === 'At Risk'
                  ? 'neutral'
                  : 'unknown',
          timestamp: new Date().toISOString(),
          metadata: {
            facilityId: facilityId || undefined,
            facilityType: facility.type,
            operator: facility.operator,
            city: facility.city,
            state: facility.state,
            complianceStatus: facility.status
          }
        };
        return [next, ...prev];
      });
    },
    []
  );

  const getAtakPointId = useCallback((p: ATAKPoint, idx: number) => {
    const uid = (p as any)?.metadata?.uid;
    const facilityId = (p as any)?.metadata?.facilityId;
    const stable = String(uid || facilityId || '');
    return stable || `${p.lat.toFixed(6)}:${p.lon.toFixed(6)}:${idx}`;
  }, []);

  const renameAtakPoint = useCallback(
    (id: string, callsign: string) => {
      setAtakPoints((prev) =>
        prev.map((p, idx) => (getAtakPointId(p, idx) === id ? { ...p, callsign: callsign || p.callsign } : p))
      );
    },
    [getAtakPointId]
  );

  const deleteAtakPoint = useCallback(
    (id: string) => {
      setAtakPoints((prev) => prev.filter((p, idx) => getAtakPointId(p, idx) !== id));
    },
    [getAtakPointId]
  );

  const draftMetrics = useMemo(() => {
    const lengthMeters = polylineLengthMeters(draftVertices);
    const areaMeters2 = tacticalMode === 'area' ? polygonAreaMeters2(draftVertices) : 0;
    return { lengthMeters, areaMeters2, vertices: draftVertices.length };
  }, [draftVertices, tacticalMode]);

  const zoomToLngLat = useCallback((lng: number, lat: number, minZoom = 16) => {
    const map: any = mapRef.current;
    if (!map) return;
    const z = Number(map.getZoom?.() ?? 0);
    const nextZoom = Math.max(minZoom, Number.isFinite(z) ? z : 0);
    map.easeTo?.({ center: [lng, lat], zoom: nextZoom, duration: 650 });
  }, []);

  const zoomToSelectedFacility = useCallback(() => {
    if (!selectedFacility) return;
    const lat = selectedFacility.lat;
    const lng = selectedFacility.lng;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    setBasemap('satellite');
    const map: any = mapRef.current;
    map?.easeTo?.({ center: [lng, lat], zoom: Math.max(map?.getZoom?.() || 0, 16), duration: 700 });
  }, [selectedFacility]);

  const zoomToAtakPoint = useCallback(
    (id: string) => {
      const p = atakPointsWithIds.find((x) => x.__id === id);
      if (!p) return;
      setBasemap('satellite');
      zoomToLngLat(p.lon, p.lat, 16);
    },
    [atakPointsWithIds, zoomToLngLat]
  );

  const openSelectedFacilityImagery = useCallback(
    (tab: 'map' | 'streetview') => {
      if (!selectedFacility) return;
      const lat = selectedFacility.lat;
      const lng = selectedFacility.lng;
      if (lat === undefined || lng === undefined) return;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
      const nextLocation: GooglePaneLocation = {
        lat,
        lng,
        title: selectedFacility.name,
        subtitle: `${selectedFacility.operator || 'Unknown'} • ${selectedFacility.city || ''}${selectedFacility.city && selectedFacility.state ? ', ' : ''}${selectedFacility.state || ''} • ${selectedFacility.status || 'Unknown'}`
      };
      setGoogleLocation(nextLocation);
      setGoogleRequestedTab(tab);
      setGooglePaneOpen(true);
    },
    [selectedFacility]
  );

  const snapSelectedFacility = useCallback(() => {
    if (!selectedFacility) return;
    const lat = selectedFacility.lat;
    const lng = selectedFacility.lng;
    if (lat === undefined || lng === undefined) return;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
    addWaypointForFacility({
      ...selectedFacility,
      lat,
      lng,
    });
  }, [addWaypointForFacility, selectedFacility]);

  const clearAtakOverlay = useCallback(() => {
    setAtakPoints([]);
    setAtakRoutes([]);
    setAtakAreas([]);
    setDraftVertices([]);
    setTacticalMode('none');
  }, []);

  return (
    <div className="relative w-full h-full" style={{ width, height }}>
      <div
        ref={containerRef}
        className="w-full h-full rounded-lg overflow-hidden"
        style={{ 
          background: COLORS.bg,
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          minHeight: height || 384,
          minWidth: width || 800
        }}
      >
        {!mapRef.current && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400 mx-auto mb-2"></div>
              <div className="text-sm">Loading map...</div>
            </div>
          </div>
        )}
      </div>

      <FlowSimulationOverlay
        map={mapRef.current}
        enabled={Boolean(connectography.layers.simulation) && Boolean(connectography.layers.flows)}
        flows={connectographyFlowsGeoJson as any}
        settings={{
          ...simulation,
          opacity: Math.max(0, Math.min(1, simulation.opacity * (connectography.opacity.simulation ?? 1)))
        }}
        zIndex={11}
      />

      {/* deck.gl GPU-Accelerated Overlay */}
      {deckEnabled && (
        <>
          <div 
            ref={deckContainerRef}
            className="absolute inset-0 pointer-events-none z-10"
            style={{ width, height }}
          />
          <DeckGLOverlay
            facilities={facilities}
            viewState={deckViewState}
            mode={deckMode}
            showFlows={deckShowFlows}
            metricField={deckMetric}
            radiusScale={deckRadiusScale}
            elevationScale={deckElevationScale}
            containerRef={deckContainerRef}
            onFacilityClick={(f) => {
              if (!Number.isFinite(f.latitude) || !Number.isFinite(f.longitude)) return;
              setSelectedFacility({
                id: f.id,
                name: f.name,
                type: f.type,
                operator: f.operator,
                status: f.complianceStatus,
                city: f.city,
                state: f.state,
                lat: f.latitude,
                lng: f.longitude,
              });
            }}
          />
          <DeckGLControlPanel
            mode={deckMode}
            onModeChange={setDeckMode}
            showFlows={deckShowFlows}
            onShowFlowsChange={setDeckShowFlows}
            metricField={deckMetric}
            onMetricFieldChange={setDeckMetric}
            radiusScale={deckRadiusScale}
            onRadiusScaleChange={setDeckRadiusScale}
            elevationScale={deckElevationScale}
            onElevationScaleChange={setDeckElevationScale}
          />
        </>
      )}

      {/* deck.gl Toggle Button */}
      <button
        onClick={() => setDeckEnabled(!deckEnabled)}
        className={`absolute top-3 right-3 z-30 p-2 rounded-lg border transition-colors ${
          deckEnabled
            ? 'bg-cyan-600 border-cyan-500 text-white'
            : 'bg-gray-900/90 border-gray-700 text-gray-400 hover:bg-gray-800 hover:text-cyan-400'
        }`}
        title={deckEnabled ? 'Disable GPU Visualization' : 'Enable GPU Visualization (deck.gl)'}
      >
        <Zap className="w-4 h-4" />
      </button>

      {/* NLP Search Bar - Wrapped in ErrorBoundary for isolation */}
      <ErrorBoundary
        fallback={
          <div className="absolute top-3 left-3 z-20 w-80 bg-red-900/90 border border-red-700 rounded-lg p-2 text-xs text-red-200">
            Search temporarily unavailable
          </div>
        }
      >
        <div className="absolute top-3 left-3 z-20 w-80">
          <div className="bg-gray-900/95 backdrop-blur border border-gray-700 rounded-lg p-2">
            <AutocompleteInput
              value={searchQuery}
              onChange={async (value) => {
                try {
                  setSearchQuery(value);
                  if (value.trim()) {
                    await circuitBreakers.nlpSearch.execute(
                      () => recordSearch(value, 'map'),
                      () => {} // Silent fallback - search still works without history
                    );
                  }
                } catch (error) {
                  console.warn('[PhotorealisticGisView] Search history error (non-critical):', error);
                  // Search still works, just history recording failed
                }
              }}
              onSelect={async (option) => {
                try {
                  setSearchQuery(option.value);
                  await circuitBreakers.nlpSearch.execute(
                    () => recordSearch(option.value, 'map'),
                    () => {} // Silent fallback
                  );
                } catch (error) {
                  console.warn('[PhotorealisticGisView] Search history error (non-critical):', error);
                }
              }}
              options={nlpSuggestions}
              placeholder="Search: 'Meta's facilities in NM'..."
              className="w-full"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-white"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="mt-2 bg-gray-900/95 backdrop-blur border border-cyan-500/50 rounded-lg p-2 text-xs text-gray-300">
              <div className="flex items-center gap-2">
                <Search className="w-3 h-3 text-cyan-400" />
                <span className="font-semibold text-cyan-400">{searchResults.length}</span>
                <span>facilities found</span>
              </div>
            </div>
          )}
        </div>
      </ErrorBoundary>

      {/* ATAK Overlay */}
      {atakEnabled && (
        <ATAKOverlay
          points={atakPoints}
          routes={atakRoutes}
          areas={atakAreas}
          showLabels={atakShowLabels}
          showGrid={atakShowGrid}
          showCompass={atakShowCompass}
        />
      )}

      {/* ATAK Control Panel */}
      {atakPanelOpen && (
        <ErrorBoundary
          fallback={
            <div className="absolute top-16 right-3 z-30 w-80 bg-red-900/90 border border-red-700 rounded-lg p-3 text-xs text-red-200">
              ATAK panel crashed (disabled).
            </div>
          }
        >
          <div className="absolute top-16 right-3 z-30 w-80">
            <div className="mb-2 bg-gray-950/95 border border-green-500/40 rounded-lg px-2 py-1 flex items-center justify-between">
              <div className="text-[11px] font-semibold text-green-400 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                TAK / ATAK Interop
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={clearAtakOverlay}
                  className="px-2 py-1 rounded text-[11px] border border-gray-700 bg-gray-900 text-gray-200 hover:bg-gray-800"
                  title="Clear overlay objects"
                >
                  Clear
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAtakPanelOpen(false);
                    setTacticalMode('none');
                    setDraftVertices([]);
                  }}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  aria-label="Close ATAK panel"
                >
                  <X className="w-4 h-4 text-gray-300" />
                </button>
              </div>
            </div>

            <BrowserTacticalToolsPanel
              mode={tacticalMode}
              onModeChange={(m) => {
                setTacticalMode(m);
                setDraftVertices([]);
              }}
              snapToFacility={snapToFacility}
              onToggleSnapToFacility={() => setSnapToFacility((v) => !v)}
              selectedFacility={selectedFacility}
              onSnapSelectedFacility={snapSelectedFacility}
              onZoomSelectedFacility={zoomToSelectedFacility}
              onOpenSelectedFacilityMap={() => openSelectedFacilityImagery('map')}
              onOpenSelectedFacilityStreetView={() => openSelectedFacilityImagery('streetview')}
              onOpenConstructionProgress={() => setConstructionOpen(true)}
              cursor={cursorLngLat}
              draft={draftMetrics}
              points={atakPointsWithIds}
              routesCount={atakRoutes.length}
              areasCount={atakAreas.length}
              onRenamePoint={renameAtakPoint}
              onDeletePoint={deleteAtakPoint}
              onZoomPoint={zoomToAtakPoint}
              onClearAll={clearAtakOverlay}
            />

            <div className="h-2" />

            <ATAKControlPanel
              points={atakPoints}
              routes={atakRoutes}
              areas={atakAreas}
              showGrid={atakShowGrid}
              showCompass={atakShowCompass}
              showLabels={atakShowLabels}
              onToggleGrid={() => setAtakShowGrid((v) => !v)}
              onToggleCompass={() => setAtakShowCompass((v) => !v)}
              onToggleLabels={() => setAtakShowLabels((v) => !v)}
              onImportKML={(file) => {
                importAtakKml(file).catch((e) => console.warn('[PhotorealisticGisView] KML import failed:', e));
              }}
              onImportGPX={(file) => {
                importAtakGpx(file).catch((e) => console.warn('[PhotorealisticGisView] GPX import failed:', e));
              }}
              onImportCoT={(file) => {
                importAtakCoT(file).catch((e) => console.warn('[PhotorealisticGisView] CoT import failed:', e));
              }}
              onExport={exportAtakGeoJson}
            />
          </div>
        </ErrorBoundary>
      )}

      {/* Enhanced Controls */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              const next = !atakEnabled;
              setAtakEnabled(next);
              if (next) {
                // If the overlay is empty, seed it with our facilities (ATAK-style symbology).
                // If user already imported overlays, never overwrite them.
                if (atakPoints.length === 0 && atakRoutes.length === 0 && atakAreas.length === 0) {
                  setAtakPoints(facilitiesToATAKPoints);
                }
                setAtakPanelOpen(true);
              } else {
                setAtakPanelOpen(false);
                setTacticalMode('none');
                setDraftVertices([]);
              }
            }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 ${
              atakEnabled
                ? 'bg-green-500/20 text-green-400 border-green-500/50'
                : 'bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
            title="ATAK Tactical Overlay"
          >
            <Shield className="w-4 h-4" />
            ATAK
          </button>
          {atakEnabled && (
            <button
              type="button"
              onClick={() => {
                const nextOpen = !atakPanelOpen;
                setAtakPanelOpen(nextOpen);
                if (!nextOpen) {
                  setTacticalMode('none');
                  setDraftVertices([]);
                }
              }}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 ${
                atakPanelOpen
                  ? 'bg-green-500/20 text-green-400 border-green-500/50'
                  : 'bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800'
              }`}
              title="ATAK Controls"
            >
              <Target className="w-4 h-4" />
            </button>
          )}
          <button
            type="button"
            onClick={() => setToolkitOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800 flex items-center gap-2"
            title="Connectography Toolkit"
          >
            <Layers className="w-4 h-4" />
            Toolkit
          </button>
          <button
            type="button"
            onClick={() => setEnableTerrain(!enableTerrain)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
              enableTerrain
                ? 'bg-cyan-600 text-white border-cyan-500'
                : 'bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
            title="Toggle 3D Terrain"
          >
            3D
          </button>
          <button
            type="button"
            onClick={() => setEnableWeather(!enableWeather)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-1 ${
              enableWeather
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
            title="Weather Overlay"
          >
            <Cloud className="w-3 h-3" />
            Weather
          </button>
          <button
            type="button"
            onClick={() => setPulseAnimation(!pulseAnimation)}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
              pulseAnimation
                ? 'bg-purple-600 text-white border-purple-500'
                : 'bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
            title="Pulsing Animation"
          >
            Pulse
          </button>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setBasemap('satellite')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
              basemap === 'satellite'
                ? 'bg-cyan-600 text-white border-cyan-500'
                : 'bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
          >
            Satellite
          </button>
          <button
            type="button"
            onClick={() => setBasemap('osm')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
              basemap === 'osm'
                ? 'bg-cyan-600 text-white border-cyan-500'
                : 'bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
            title="OpenStreetMap Standard"
          >
            OSM
          </button>
          <button
            type="button"
            onClick={() => setBasemap('osm-hot')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
              basemap === 'osm-hot'
                ? 'bg-cyan-600 text-white border-cyan-500'
                : 'bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
            title="OSM Humanitarian style"
          >
            OSM HOT
          </button>
          <button
            type="button"
            onClick={() => setBasemap('dark')}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
              basemap === 'dark'
                ? 'bg-cyan-600 text-white border-cyan-500'
                : 'bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800'
            }`}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900/80 text-gray-200 border-gray-700 hover:bg-gray-800 flex items-center gap-2"
            title="Provider settings (Google key)"
          >
            <Settings className="w-4 h-4" />
            Key
          </button>
        </div>
      </div>

      <ConnectographyToolkitPanel
        isOpen={toolkitOpen}
        onClose={() => setToolkitOpen(false)}
        basemap={basemap}
        onBasemapChange={setBasemap}
        connectography={connectography}
        onConnectographyChange={setConnectography}
        operators={operators}
        availableYears={availableYears}
        filters={filters}
        onFiltersChange={setFilters}
        metricLabel={metricUi.label}
        metricMax={metricUi.max}
        metricStep={metricUi.step}
        metricValueFormatter={metricUi.format}
        timePlaying={timePlaying}
        onToggleTimePlaying={toggleTimePlaying}
        scenes={scenes}
        onSaveScene={saveScene}
        onLoadScene={loadScene}
        onDeleteScene={deleteScene}
        exportActions={exportActions}
        customLayers={customLayers}
        onCustomLayersChange={setCustomLayers}
        simulation={simulation as any}
        onSimulationChange={setSimulation as any}
      />

      {/* Enhanced Time Controls */}
      {timePlaying && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 bg-gray-900/90 border border-gray-700 rounded-lg p-3 flex items-center gap-3">
          <button
            onClick={() => setFilters(prev => ({ ...prev, yearEnd: Math.max(prev.yearStart, prev.yearEnd - 1) }))}
            className="p-2 rounded hover:bg-gray-800 text-gray-300"
            title="Previous Year"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={toggleTimePlaying}
            className="p-2 rounded hover:bg-gray-800 text-gray-300"
            title={timePlaying ? 'Pause' : 'Play'}
          >
            {timePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setFilters(prev => ({ ...prev, yearEnd: Math.min(availableYears.max, prev.yearEnd + 1) }))}
            className="p-2 rounded hover:bg-gray-800 text-gray-300"
            title="Next Year"
          >
            <SkipForward className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 px-3">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-sm text-gray-200">
              {filters.yearStart} - {filters.yearEnd}
            </span>
          </div>
        </div>
      )}

      {/* Weather Info Display */}
      {enableWeather && weatherData && (
        <div className="absolute top-20 right-3 z-10 bg-gray-900/90 border border-blue-700/50 rounded-lg p-3 min-w-[180px]">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-gray-200">Weather</span>
          </div>
          <div className="text-xs text-gray-300 space-y-1">
            <div className="flex justify-between">
              <span>Temp:</span>
              <span className="font-medium">{weatherData.temperature}°F</span>
            </div>
            <div className="flex justify-between">
              <span>Humidity:</span>
              <span className="font-medium">{weatherData.humidity}%</span>
            </div>
            <div className="flex justify-between">
              <span>Wind:</span>
              <span className="font-medium">{weatherData.windSpeed} mph</span>
            </div>
          </div>
        </div>
      )}

      {/* Mode badge */}
      <div className="absolute bottom-3 right-3 z-10">
        <div className="px-3 py-2 rounded-lg text-xs font-semibold bg-gray-900/80 border border-gray-700 text-gray-200">
          GIS {mode} {enableTerrain && '• 3D'} {enableWeather && '• Weather'}
        </div>
      </div>

      {initError && (
        <div className="absolute inset-0 flex items-center justify-center p-6">
          <div className="bg-gray-900 border border-red-800 rounded-lg p-4 text-sm text-red-200 max-w-lg">
            <div className="font-semibold mb-2">GIS renderer failed</div>
            <div className="text-red-200/80">{initError}</div>
            <div className="text-xs text-gray-400 mt-3">
              Tip: This can happen if WebGL is unavailable or a tile provider blocks requests.
            </div>
          </div>
        </div>
      )}

      <GoogleKeySettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />

      <GoogleMapsStreetViewPane
        isOpen={googlePaneOpen}
        onClose={() => setGooglePaneOpen(false)}
        apiKey={googleKey}
        location={googleLocation}
        onOpenKeySettings={() => setSettingsOpen(true)}
        requestedTab={googleRequestedTab}
        pinned={googlePinned}
        onTogglePin={googleLocation ? togglePin : undefined}
      />

      <ErrorBoundary
        fallback={
          <div className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-gray-900 border border-red-800 rounded-lg p-4 text-sm text-red-200 max-w-lg">
              Construction progress viewer crashed.
            </div>
          </div>
        }
      >
        <ConstructionProgressModal
          isOpen={constructionOpen}
          onClose={() => setConstructionOpen(false)}
          facility={(() => {
            if (!selectedFacility) return null;
            const lat = selectedFacility.lat;
            const lng = selectedFacility.lng;
            if (lat === undefined || lng === undefined) return null;
            if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
            return {
              id:
                selectedFacility.id !== undefined && selectedFacility.id !== null
                  ? String(selectedFacility.id)
                  : undefined,
              name: selectedFacility.name,
              type: selectedFacility.type,
              lat,
              lng,
            };
          })()}
          overlaySceneId={constructionOverlaySceneId}
          overlayOpacity={constructionOverlayOpacity}
          onSetOverlay={(sceneId) => {
            setConstructionOverlaySceneId(sceneId);
            // Overlay is imagery itself; keep basemap dark for contrast.
            setBasemap('dark');
          }}
          onClearOverlay={() => setConstructionOverlaySceneId(null)}
          onSetOverlayOpacity={(opacity) => setConstructionOverlayOpacity(Math.max(0.05, Math.min(1, opacity)))}
        />
      </ErrorBoundary>
    </div>
  );
});


