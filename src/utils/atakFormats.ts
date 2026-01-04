/**
 * ATAK (Android Team Awareness Kit) Data Format Support
 * Supports KML, GPX, and ATAK-specific formats for geospatial data
 */

export interface ATAKPoint {
  lat: number;
  lon: number;
  alt?: number;
  callsign?: string;
  team?: string;
  role?: string;
  status?: 'friendly' | 'hostile' | 'neutral' | 'unknown';
  timestamp?: string;
  metadata?: Record<string, any>;
}

export interface ATAKRoute {
  id: string;
  name: string;
  points: ATAKPoint[];
  color?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface ATAKArea {
  id: string;
  name: string;
  points: ATAKPoint[];
  fillColor?: string;
  strokeColor?: string;
  opacity?: number;
}

export interface ATAKMarker {
  id: string;
  point: ATAKPoint;
  icon?: string;
  size?: number;
  rotation?: number;
  label?: string;
}

/**
 * Parse ATAK/TAK CoT (Cursor-on-Target) XML into ATAK structures.
 *
 * Notes:
 * - This is a *browser-only* parser (DOMParser) suitable for our zero-backend architecture.
 * - We intentionally keep support conservative (points only) to avoid heavy/fragile parsing.
 */
export function parseCoT(cotString: string): {
  points: ATAKPoint[];
  routes: ATAKRoute[];
  areas: ATAKArea[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(cotString, 'text/xml');

  const points: ATAKPoint[] = [];

  // CoT can contain one or many <event> nodes (TAK/ATAK)
  const events = doc.querySelectorAll('event');
  events.forEach((ev, index) => {
    const pt = ev.querySelector('point');
    if (!pt) return;

    const lat = Number(pt.getAttribute('lat'));
    const lon = Number(pt.getAttribute('lon'));
    const alt = pt.getAttribute('hae') ?? pt.getAttribute('ce') ?? undefined;

    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

    const type = (ev.getAttribute('type') || '').trim();
    const time = (ev.getAttribute('time') || ev.getAttribute('start') || '').trim();

    // Common ATAK fields live under <detail>
    const detail = ev.querySelector('detail');
    const contact = detail?.querySelector('contact');
    const callsign =
      (contact?.getAttribute('callsign') || contact?.getAttribute('endpoint') || detail?.getAttribute('callsign') || '').trim() ||
      `CoT ${index + 1}`;

    const group = detail?.querySelector('__group');
    const role = (group?.getAttribute('role') || '').trim();
    const team = (group?.getAttribute('name') || '').trim();

    const status = (() => {
      // CoT type prefix hints (best-effort):
      // a-f-* friendly, a-h-* hostile, a-n-* neutral, otherwise unknown
      if (type.startsWith('a-f-')) return 'friendly';
      if (type.startsWith('a-h-')) return 'hostile';
      if (type.startsWith('a-n-')) return 'neutral';
      return 'unknown';
    })() as ATAKPoint['status'];

    points.push({
      lat,
      lon,
      alt: alt ? Number(alt) : undefined,
      callsign,
      team: team || undefined,
      role: role || undefined,
      status,
      timestamp: time || new Date().toISOString(),
      metadata: {
        cotType: type || undefined,
        uid: ev.getAttribute('uid') || undefined,
      }
    });
  });

  return { points, routes: [], areas: [] };
}

/**
 * Parse KML format to ATAK structures
 */
export function parseKML(kmlString: string): {
  points: ATAKPoint[];
  routes: ATAKRoute[];
  areas: ATAKArea[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(kmlString, 'text/xml');
  
  const points: ATAKPoint[] = [];
  const routes: ATAKRoute[] = [];
  const areas: ATAKArea[] = [];

  // Parse Placemarks
  const placemarks = doc.querySelectorAll('Placemark');
  placemarks.forEach((placemark, index) => {
    const name = placemark.querySelector('name')?.textContent || `Point ${index}`;
    const point = placemark.querySelector('Point coordinates');
    const lineString = placemark.querySelector('LineString coordinates');
    const polygon = placemark.querySelector('Polygon');

    if (point) {
      const coords = point.textContent?.trim().split(',') || [];
      if (coords.length >= 2) {
        points.push({
          lon: parseFloat(coords[0]),
          lat: parseFloat(coords[1]),
          alt: coords[2] ? parseFloat(coords[2]) : undefined,
          callsign: name,
          timestamp: new Date().toISOString()
        });
      }
    }

    if (lineString) {
      const coords = lineString.textContent?.trim().split(/\s+/);
      if (coords && coords.length > 0) {
        const routePoints: ATAKPoint[] = coords.map(coord => {
          const [lon, lat, alt] = coord.split(',').map(Number);
          return { lon, lat, alt };
        });
        routes.push({
          id: `route-${index}`,
          name,
          points: routePoints
        });
      }
    }

    if (polygon) {
      const outerBoundary = polygon.querySelector('outerBoundaryIs LinearRing coordinates');
      if (outerBoundary) {
        const coords = outerBoundary.textContent?.trim().split(/\s+/);
        if (coords && coords.length > 0) {
          const areaPoints: ATAKPoint[] = coords.map(coord => {
            const [lon, lat, alt] = coord.split(',').map(Number);
            return { lon, lat, alt };
          });
          areas.push({
            id: `area-${index}`,
            name,
            points: areaPoints
          });
        }
      }
    }
  });

  return { points, routes, areas };
}

/**
 * Parse GPX format to ATAK structures
 */
export function parseGPX(gpxString: string): {
  points: ATAKPoint[];
  routes: ATAKRoute[];
} {
  const parser = new DOMParser();
  const doc = parser.parseFromString(gpxString, 'text/xml');
  
  const points: ATAKPoint[] = [];
  const routes: ATAKRoute[] = [];

  // Parse waypoints
  const waypoints = doc.querySelectorAll('wpt');
  waypoints.forEach((wpt, index) => {
    const lat = parseFloat(wpt.getAttribute('lat') || '0');
    const lon = parseFloat(wpt.getAttribute('lon') || '0');
    const name = wpt.querySelector('name')?.textContent || `Waypoint ${index}`;
    const ele = wpt.querySelector('ele')?.textContent;
    
    points.push({
      lat,
      lon,
      alt: ele ? parseFloat(ele) : undefined,
      callsign: name,
      timestamp: new Date().toISOString()
    });
  });

  // Parse tracks
  const tracks = doc.querySelectorAll('trk');
  tracks.forEach((trk, index) => {
    const name = trk.querySelector('name')?.textContent || `Track ${index}`;
    const segments = trk.querySelectorAll('trkseg');
    
    segments.forEach(seg => {
      const trkpts = seg.querySelectorAll('trkpt');
      const routePoints: ATAKPoint[] = Array.from(trkpts).map(trkpt => {
        const lat = parseFloat(trkpt.getAttribute('lat') || '0');
        const lon = parseFloat(trkpt.getAttribute('lon') || '0');
        const ele = trkpt.querySelector('ele')?.textContent;
        return {
          lat,
          lon,
          alt: ele ? parseFloat(ele) : undefined
        };
      });
      
      if (routePoints.length > 0) {
        routes.push({
          id: `track-${index}`,
          name,
          points: routePoints
        });
      }
    });
  });

  return { points, routes };
}

/**
 * Convert ATAK data to GeoJSON for map rendering
 */
export function atakToGeoJSON(
  points: ATAKPoint[],
  routes: ATAKRoute[] = [],
  areas: ATAKArea[] = []
): any {
  const features: any[] = [];

  // Points
  points.forEach((point, index) => {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [point.lon, point.lat, point.alt || 0]
      },
      properties: {
        id: `point-${index}`,
        callsign: point.callsign,
        team: point.team,
        role: point.role,
        status: point.status || 'unknown',
        timestamp: point.timestamp,
        ...point.metadata
      }
    });
  });

  // Routes
  routes.forEach(route => {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'LineString',
        coordinates: route.points.map(p => [p.lon, p.lat, p.alt || 0])
      },
      properties: {
        id: route.id,
        name: route.name,
        color: route.color || '#00ff00',
        style: route.style || 'solid'
      }
    });
  });

  // Areas
  areas.forEach(area => {
    features.push({
      type: 'Feature',
      geometry: {
        type: 'Polygon',
        coordinates: [[...area.points.map(p => [p.lon, p.lat, p.alt || 0]), area.points[0] ? [area.points[0].lon, area.points[0].lat, area.points[0].alt || 0] : []]]
      },
      properties: {
        id: area.id,
        name: area.name,
        fillColor: area.fillColor || '#00ff0022',
        strokeColor: area.strokeColor || '#00ff00',
        opacity: area.opacity || 0.3
      }
    });
  });

  return {
    type: 'FeatureCollection',
    features
  };
}

