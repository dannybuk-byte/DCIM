import { db } from '../db/database';

export type TileJson = {
  tiles: string[];
  tilejson?: string;
  name?: string;
  minzoom?: number;
  maxzoom?: number;
  bounds?: [number, number, number, number];
  center?: [number, number, number];
  attribution?: string;
  scheme?: string;
  tileSize?: number;
};

const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}

export async function fetchSentinelTileJson(sceneId: string, forceRefresh = false): Promise<TileJson> {
  const id = String(sceneId);
  const cacheKey = `constructionTileJson:sentinel-2-l2a:${id}`;

  if (!forceRefresh) {
    try {
      const row = await db.settings.get(cacheKey);
      const v = row?.value as any;
      if (v?.fetchedAt && v?.tilejson?.tiles) {
        const age = Date.now() - new Date(String(v.fetchedAt)).getTime();
        if (Number.isFinite(age) && age >= 0 && age < TTL_MS) {
          return v.tilejson as TileJson;
        }
      }
    } catch {
      // ignore
    }
  }

  // Planetary Computer TiTiler endpoints (best-effort).
  // We try multiple query param shapes because docs differ across deployments.
  const base = `https://planetarycomputer.microsoft.com/api/data/v1/item/sentinel-2-l2a/${encodeURIComponent(id)}/tilejson.json`;
  const candidates = [
    `${base}?assets=visual&rescale=0,3000`,
    `${base}?assets=visual`,
    `${base}?assets=B04,B03,B02&rescale=0,3000`,
    `${base}?assets=B04,B03,B02`,
  ];

  let lastErr: any = null;
  for (const u of candidates) {
    try {
      const tj = (await fetchJson(u)) as TileJson;
      if (Array.isArray(tj.tiles) && tj.tiles.length > 0) {
        const normalized: TileJson = {
          ...tj,
          tileSize: (tj as any).tileSize || 256,
        };
        try {
          await db.settings.put({ key: cacheKey, value: { fetchedAt: new Date().toISOString(), tilejson: normalized } });
        } catch {
          // ignore
        }
        return normalized;
      }
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(`Failed to fetch TileJSON for scene ${id}${lastErr?.message ? `: ${lastErr.message}` : ''}`);
}


