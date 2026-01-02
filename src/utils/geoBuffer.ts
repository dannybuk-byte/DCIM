import type { LngLat } from './geoMath';

// Approx meters per degree latitude
const M_PER_DEG_LAT = 111_320;

export function bufferCirclePolygon(center: LngLat, radiusMeters: number, steps = 48): number[][][] {
  const r = Math.max(25, Math.min(10_000, radiusMeters));
  const latRad = (center.lat * Math.PI) / 180;
  const mPerDegLng = M_PER_DEG_LAT * Math.cos(latRad);
  const dLat = r / M_PER_DEG_LAT;
  const dLng = r / Math.max(1e-6, mPerDegLng);

  const ring: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const lng = center.lng + Math.cos(t) * dLng;
    const lat = center.lat + Math.sin(t) * dLat;
    ring.push([lng, lat]);
  }
  return [ring];
}

export function clampRadiusMeters(m: number): number {
  if (!Number.isFinite(m)) return 600;
  return Math.max(50, Math.min(5000, Math.round(m)));
}


