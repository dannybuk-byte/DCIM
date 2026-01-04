import { db } from '../db/database';

export interface ConstructionScene {
  id: string;
  datetime: string; // ISO
  cloudCover?: number;
  thumbnailUrl: string;
  source: 'Sentinel-2 L2A (Planetary Computer)';
  // Helpful links for debugging / provenance
  stacItemUrl?: string;
}

type StacFeatureCollection = {
  type: 'FeatureCollection';
  features: Array<{
    id: string;
    type: 'Feature';
    properties: Record<string, any>;
    assets?: Record<string, { href: string; type?: string; title?: string }>;
    links?: Array<{ rel: string; href: string }>;
  }>;
};

const STAC_SEARCH_URL = 'https://planetarycomputer.microsoft.com/api/stac/v1/search';
const SAS_SIGN_URL = 'https://planetarycomputer.microsoft.com/api/sas/v1/sign';

async function signHref(href: string): Promise<string> {
  // Planetary Computer requires SAS signing for many asset URLs.
  const url = `${SAS_SIGN_URL}?href=${encodeURIComponent(href)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`SAS sign failed: ${res.status}`);
  const json = (await res.json()) as { href?: string };
  if (!json.href) throw new Error('SAS sign returned no href');
  return json.href;
}

function buildBbox(lng: number, lat: number, halfSizeDeg = 0.02): [number, number, number, number] {
  // Rough, but fine for a scene search around a point.
  return [lng - halfSizeDeg, lat - halfSizeDeg, lng + halfSizeDeg, lat + halfSizeDeg];
}

export async function fetchConstructionScenesForFacility(opts: {
  facilityId?: string;
  lat: number;
  lng: number;
  daysBack?: number;
  limit?: number;
  forceRefresh?: boolean;
}): Promise<ConstructionScene[]> {
  const facilityKey = opts.facilityId ? String(opts.facilityId) : `${opts.lat.toFixed(5)}:${opts.lng.toFixed(5)}`;
  const cacheKey = `constructionScenes:${facilityKey}`;

  const daysBack = Math.max(30, Number(opts.daysBack || 180));
  const limit = Math.max(5, Math.min(30, Number(opts.limit || 12)));

  // Cache TTL: 12h (construction progress doesn’t need minute-level refresh)
  const TTL_MS = 12 * 60 * 60 * 1000;

  if (!opts.forceRefresh) {
    try {
      const row = await db.settings.get(cacheKey);
      const v = row?.value as any;
      if (v?.fetchedAt && Array.isArray(v?.scenes)) {
        const age = Date.now() - new Date(String(v.fetchedAt)).getTime();
        if (Number.isFinite(age) && age >= 0 && age < TTL_MS) {
          return v.scenes as ConstructionScene[];
        }
      }
    } catch {
      // ignore cache read failures
    }
  }

  const end = new Date();
  const start = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000);
  const datetime = `${start.toISOString()}/${end.toISOString()}`;
  const bbox = buildBbox(opts.lng, opts.lat, 0.02);

  const body = {
    collections: ['sentinel-2-l2a'],
    bbox,
    datetime,
    limit,
  };

  const res = await fetch(STAC_SEARCH_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`STAC search failed: ${res.status}`);

  const fc = (await res.json()) as StacFeatureCollection;
  const features = Array.isArray(fc?.features) ? fc.features : [];

  // Sort latest-first (client-side, STAC server order not guaranteed)
  const sorted = features
    .slice()
    .sort((a, b) => {
      const da = new Date(String(a?.properties?.datetime || a?.properties?.start_datetime || '')).getTime();
      const dbb = new Date(String(b?.properties?.datetime || b?.properties?.start_datetime || '')).getTime();
      return (dbb || 0) - (da || 0);
    })
    .slice(0, limit);

  const scenes: ConstructionScene[] = [];

  // Resolve thumbnails (signed) with best-effort error handling
  for (const item of sorted) {
    const datetimeIso = String(item?.properties?.datetime || item?.properties?.start_datetime || '');
    const cloud = item?.properties?.['eo:cloud_cover'];

    const thumbHref =
      item?.assets?.thumbnail?.href ||
      item?.assets?.rendered_preview?.href ||
      item?.assets?.preview?.href ||
      '';

    if (!thumbHref) continue;

    let signed = thumbHref;
    try {
      signed = await signHref(thumbHref);
    } catch {
      // Some thumbnails may already be directly accessible; keep original.
    }

    scenes.push({
      id: String(item.id),
      datetime: datetimeIso || new Date().toISOString(),
      cloudCover: typeof cloud === 'number' ? cloud : cloud != null ? Number(cloud) : undefined,
      thumbnailUrl: signed,
      source: 'Sentinel-2 L2A (Planetary Computer)',
      stacItemUrl: `https://planetarycomputer.microsoft.com/api/stac/v1/collections/sentinel-2-l2a/items/${encodeURIComponent(String(item.id))}`,
    });
  }

  try {
    await db.settings.put({ key: cacheKey, value: { fetchedAt: new Date().toISOString(), scenes } });
  } catch {
    // ignore cache write failures
  }

  return scenes;
}


