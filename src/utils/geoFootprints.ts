export type LngLatTuple = [number, number]; // [lng, lat]

// Mean Earth radius (meters)
const R = 6371008.8;
const toDeg = (r: number) => (r * 180) / Math.PI;
const toRad = (d: number) => (d * Math.PI) / 180;

function metersToDegLat(meters: number): number {
  return toDeg(meters / R);
}

function metersToDegLng(meters: number, atLatDeg: number): number {
  const cos = Math.cos(toRad(atLatDeg));
  if (cos <= 1e-6) return 0;
  return toDeg(meters / (R * cos));
}

/**
 * Build a small square "site footprint" polygon around a point.
 * This is intentionally approximate (good enough for zoomed-in visual realism).
 */
export function squareFootprintPolygon(
  lng: number,
  lat: number,
  halfSizeMeters: number,
  rotationDeg = 0
): LngLatTuple[] {
  const rot = toRad(rotationDeg);
  const sin = Math.sin(rot);
  const cos = Math.cos(rot);

  const cornersMeters: Array<[number, number]> = [
    [-halfSizeMeters, -halfSizeMeters],
    [halfSizeMeters, -halfSizeMeters],
    [halfSizeMeters, halfSizeMeters],
    [-halfSizeMeters, halfSizeMeters],
  ];

  const ring: LngLatTuple[] = cornersMeters.map(([dx, dy]) => {
    // rotate in local meters (x=east, y=north)
    const rx = dx * cos - dy * sin;
    const ry = dx * sin + dy * cos;
    const dLng = metersToDegLng(rx, lat);
    const dLat = metersToDegLat(ry);
    return [lng + dLng, lat + dLat];
  });

  // Close polygon
  ring.push(ring[0]);
  return ring;
}


