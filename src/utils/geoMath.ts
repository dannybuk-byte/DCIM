export type LngLat = { lng: number; lat: number };

const toRad = (d: number) => (d * Math.PI) / 180;

// Mean Earth radius (meters)
const R = 6371008.8;

export function haversineMeters(a: LngLat, b: LngLat): number {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δφ = φ2 - φ1;
  const Δλ = toRad(b.lng - a.lng);
  const sinΔφ = Math.sin(Δφ / 2);
  const sinΔλ = Math.sin(Δλ / 2);
  const h = sinΔφ * sinΔφ + Math.cos(φ1) * Math.cos(φ2) * sinΔλ * sinΔλ;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function polylineLengthMeters(points: LngLat[]): number {
  if (points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversineMeters(points[i - 1], points[i]);
  }
  return total;
}

// Simple spherical excess area approximation for small polygons.
// Returns square meters. Assumes polygon is closed or will be treated as closed.
export function polygonAreaMeters2(points: LngLat[]): number {
  if (points.length < 3) return 0;
  const pts = points[0].lng === points[points.length - 1].lng && points[0].lat === points[points.length - 1].lat
    ? points
    : [...points, points[0]];

  // Use an equirectangular projection around centroid for stability, then planar shoelace.
  const lat0 = pts.reduce((acc, p) => acc + p.lat, 0) / pts.length;
  const cosLat0 = Math.cos(toRad(lat0));

  const xy = pts.map((p) => ({
    x: toRad(p.lng) * R * cosLat0,
    y: toRad(p.lat) * R,
  }));

  let a = 0;
  for (let i = 0; i < xy.length - 1; i++) {
    a += xy[i].x * xy[i + 1].y - xy[i + 1].x * xy[i].y;
  }
  return Math.abs(a) / 2;
}

export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters)) return '—';
  if (meters < 1000) return `${Math.round(meters)} m`;
  const km = meters / 1000;
  if (km < 100) return `${km.toFixed(2)} km`;
  return `${Math.round(km).toLocaleString()} km`;
}

export function formatArea(m2: number): string {
  if (!Number.isFinite(m2)) return '—';
  if (m2 < 1_000_000) return `${Math.round(m2).toLocaleString()} m²`;
  const km2 = m2 / 1_000_000;
  if (km2 < 100) return `${km2.toFixed(2)} km²`;
  return `${Math.round(km2).toLocaleString()} km²`;
}


