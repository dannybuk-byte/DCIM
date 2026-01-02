import { db } from '../db/database';
import type { LngLat } from '../utils/geoMath';
import { bufferCirclePolygon, clampRadiusMeters } from '../utils/geoBuffer';

type StatsResponse = {
  // TiTiler returns various shapes; we only need basic band stats.
  // We'll normalize aggressively.
  statistics?: Record<string, { min?: number; max?: number; mean?: number; stdev?: number }>;
  bands?: Record<string, { mean?: number; stdev?: number; min?: number; max?: number }>;
  // some versions return { assets: { ... } }
  [k: string]: any;
};

const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

async function fetchJson(url: string, body?: any): Promise<any> {
  if (body) {
    const res = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

function extractMeans(resp: StatsResponse): number[] | null {
  // Common: resp.statistics is keyed by band index or asset name
  const stats = resp?.statistics || resp?.bands;
  if (!stats || typeof stats !== 'object') return null;

  const keys = Object.keys(stats);
  if (!keys.length) return null;

  // Attempt stable ordering: if keys are numeric strings, sort numeric.
  const ordered = keys.every((k) => /^\d+$/.test(k)) ? keys.sort((a, b) => Number(a) - Number(b)) : keys.sort();

  const means = ordered
    .map((k) => {
      const v = (stats as any)[k];
      const m = v?.mean;
      return typeof m === 'number' && Number.isFinite(m) ? m : null;
    })
    .filter((v): v is number => typeof v === 'number');

  return means.length ? means : null;
}

async function fetchItemStats(opts: { sceneId: string; center: LngLat; radiusMeters: number }): Promise<number[] | null> {
  const id = encodeURIComponent(String(opts.sceneId));
  const radius = clampRadiusMeters(opts.radiusMeters);

  const geojson = {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: bufferCirclePolygon(opts.center, radius, 56),
    },
    properties: {},
  };

  // Planetary Computer TiTiler stats endpoints (best-effort)
  const base = `https://planetarycomputer.microsoft.com/api/data/v1/item/sentinel-2-l2a/${id}/statistics`;

  // Try multiple parameter styles / methods
  const candidates: Array<{ url: string; body?: any }> = [
    // POST body geometry, query assets
    { url: `${base}?assets=visual`, body: geojson },
    { url: `${base}?assets=B04,B03,B02`, body: geojson },
    // GET geometry as encoded query (some deployments support it)
    { url: `${base}?assets=visual&geojson=${encodeURIComponent(JSON.stringify(geojson.geometry))}` },
    { url: `${base}?assets=B04,B03,B02&geojson=${encodeURIComponent(JSON.stringify(geojson.geometry))}` },
    // Alternative parameter name
    { url: `${base}?assets=visual&geometry=${encodeURIComponent(JSON.stringify(geojson.geometry))}` },
  ];

  let lastErr: any = null;
  for (const c of candidates) {
    try {
      const resp = (await fetchJson(c.url, c.body)) as StatsResponse;
      const means = extractMeans(resp);
      if (means) return means;
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(`Stats unavailable${lastErr?.message ? `: ${lastErr.message}` : ''}`);
}

export async function computeFootprintChangeScore(opts: {
  facilityKey: string; // stable cache namespace
  center: LngLat;
  radiusMeters: number;
  beforeSceneId: string;
  afterSceneId: string;
  forceRefresh?: boolean;
}): Promise<{ score: number; meansA: number[]; meansB: number[]; radiusMeters: number }> {
  const radius = clampRadiusMeters(opts.radiusMeters);
  const aId = String(opts.beforeSceneId);
  const bId = String(opts.afterSceneId);
  const cacheKey = `constructionDiff:${opts.facilityKey}:${radius}:${aId}:${bId}`;

  if (!opts.forceRefresh) {
    try {
      const row = await db.settings.get(cacheKey);
      const v = row?.value as any;
      if (v?.fetchedAt && typeof v?.score === 'number' && Array.isArray(v?.meansA) && Array.isArray(v?.meansB)) {
        const age = Date.now() - new Date(String(v.fetchedAt)).getTime();
        if (Number.isFinite(age) && age >= 0 && age < TTL_MS) {
          return { score: v.score, meansA: v.meansA, meansB: v.meansB, radiusMeters: radius };
        }
      }
    } catch {
      // ignore
    }
  }

  const [meansA, meansB] = await Promise.all([
    fetchItemStats({ sceneId: aId, center: opts.center, radiusMeters: radius }),
    fetchItemStats({ sceneId: bId, center: opts.center, radiusMeters: radius }),
  ]);
  if (!meansA || !meansB) throw new Error('No stats means returned');

  const n = Math.min(meansA.length, meansB.length);
  const a = meansA.slice(0, n);
  const b = meansB.slice(0, n);

  // Normalize by per-channel scale. Sentinel reflectance roughly 0..10000; visual is rescaled.
  // We treat means as 0..255-ish if visual; fallback normalize by max(a,b,255).
  const denom = Math.max(255, ...a, ...b);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += Math.abs(a[i] - b[i]) / denom;
  const mean = sum / Math.max(1, n);
  const score = Math.max(0, Math.min(100, Number((mean * 100).toFixed(1))));

  try {
    await db.settings.put({ key: cacheKey, value: { fetchedAt: new Date().toISOString(), score, meansA: a, meansB: b } });
  } catch {
    // ignore
  }

  return { score, meansA: a, meansB: b, radiusMeters: radius };
}

export async function loadFacilityThreshold(facilityKey: string): Promise<number> {
  try {
    const row = await db.settings.get(`constructionThreshold:${facilityKey}`);
    const v = row?.value;
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return Math.max(5, Math.min(60, Math.round(n)));
  } catch {
    // ignore
  }
  return 22;
}

export async function saveFacilityThreshold(facilityKey: string, threshold: number): Promise<void> {
  const t = Math.max(5, Math.min(60, Math.round(threshold)));
  await db.settings.put({ key: `constructionThreshold:${facilityKey}`, value: t });
}

export function recommendedRadiusMeters(facilityType?: string): number {
  const t = String(facilityType || '').toLowerCase();
  // Conservative defaults tuned for construction monitoring footprints
  if (t.includes('data center')) return 900;
  if (t.includes('switch')) return 700;
  if (t === 'co' || t.includes('central office')) return 450;
  if (t.includes('pop')) return 350;
  if (t.includes('cd') || t.includes('cdn') || t.includes('edge')) return 350;
  return 600;
}

export async function loadFacilityRadius(facilityKey: string, facilityType?: string): Promise<number> {
  try {
    const row = await db.settings.get(`constructionRadius:${facilityKey}`);
    const v = row?.value;
    const n = typeof v === 'number' ? v : Number(v);
    if (Number.isFinite(n)) return clampRadiusMeters(n);
  } catch {
    // ignore
  }
  return clampRadiusMeters(recommendedRadiusMeters(facilityType));
}

export async function saveFacilityRadius(facilityKey: string, radiusMeters: number): Promise<void> {
  await db.settings.put({ key: `constructionRadius:${facilityKey}`, value: clampRadiusMeters(radiusMeters) });
}

export async function clearFacilityRadius(facilityKey: string): Promise<void> {
  await db.settings.delete(`constructionRadius:${facilityKey}`);
}


