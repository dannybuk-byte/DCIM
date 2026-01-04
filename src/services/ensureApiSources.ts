import { db, type Source } from '../db/database';
import { API_REGISTRY } from './APIRegistry';

function apiIdTag(id: string) {
  return `apiId:${id}`;
}

export async function ensureApiSources(): Promise<void> {
  // Load existing API sources once
  const existingApiSources = await db.sources.where('type').equals('API').toArray();
  const byApiId = new Map<string, Source>();
  for (const s of existingApiSources) {
    const tag = (s.tags || []).find((t) => t.startsWith('apiId:'));
    if (tag) byApiId.set(tag.slice('apiId:'.length), s);
  }

  const nowIso = new Date().toISOString();
  const toUpsert: Source[] = [];

  for (const [id, api] of Object.entries(API_REGISTRY)) {
    if (!api.enabled) continue;

    const url = api.documentationUrl || api.baseUrl;
    const tags = [
      'API',
      apiIdTag(id),
      `apiCategory:${api.category}`,
      ...api.dataType.map((t) => `dataType:${t}`),
    ];

    const next: Omit<Source, 'id'> = {
      title: `${api.name} API`,
      type: 'API',
      url,
      addedAt: nowIso,
      tags,
      summary: api.description,
      credibility: api.authType === 'none' ? 'High' : 'Medium',
    };

    const existing = byApiId.get(id);
    if (!existing) {
      toUpsert.push(next as Source);
    } else {
      // Keep user's edits (title/summary) if they changed; but ensure tags/url are present.
      const merged: Source = {
        ...existing,
        type: 'API',
        url: existing.url || url,
        tags: Array.from(new Set([...(existing.tags || []), ...tags])),
        summary: existing.summary || api.description,
      };
      toUpsert.push(merged);
    }
  }

  // Upsert: add new (no id) and update existing (with id)
  for (const s of toUpsert) {
    if (s.id) {
      await db.sources.put(s);
    } else {
      await db.sources.add(s);
    }
  }
}


