import { db } from './database';

export type SearchContext =
  | 'global'
  | 'ai'
  | 'sources'
  | 'network-trace'
  | 'osint'
  | 'table'
  | 'filters'
  | 'map'
  // Section-specific contexts for embedded NLP
  | 'sanctions'
  | 'organizing'
  | 'subsidies'
  | 'contractors'
  | 'corridors'
  | 'ibew-footprint'
  | 'target-prioritization'
  | 'network-security'
  | 'compliance-overview';

export async function recordSearch(query: string, context: SearchContext) {
  const q = query.trim();
  if (!q) return;

  const now = new Date().toISOString();

  const existing = await db.searchHistory
    .where({ context })
    .filter((e) => e.query.toLowerCase() === q.toLowerCase())
    .first();

  if (existing?.id) {
    await db.searchHistory.update(existing.id, {
      lastUsedAt: now,
      count: (existing.count || 0) + 1
    });
    return;
  }

  await db.searchHistory.add({
    query: q,
    context,
    createdAt: now,
    lastUsedAt: now,
    count: 1
  });
}


