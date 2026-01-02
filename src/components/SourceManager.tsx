import { useState, useEffect, useMemo, useCallback } from 'react';
import { FileText, Link as LinkIcon, X, Search, Tag, ExternalLink, Trash2, Edit2, Plus, AlertCircle } from 'lucide-react';
import { db, Source, Citation } from '../db/database';
import { Facility } from '../types';
import { ErrorBoundary } from './ErrorBoundary';
import { Tooltip } from './shared/Tooltip';
import { ExpandableSection } from './shared/ExpandableSection';
import { AutocompleteInput, AutocompleteOption } from './shared/AutocompleteInput';
import { useNLPSearchSuggestions } from '../hooks/useNLPSearchSuggestions';
import { recordSearch } from '../db/searchHistory';
import { ensureApiSources } from '../services/ensureApiSources';

interface SourceManagerProps {
  onClose: () => void;
  preselectedFacility?: Facility;
}

export default function SourceManager({ onClose, preselectedFacility }: SourceManagerProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [citations, setCitations] = useState<Citation[]>([]);
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const nlpSourceOptions = useNLPSearchSuggestions({
    context: 'sources',
    facilities,
    sources,
    includeFacilities: true,
    includeOperators: true,
    includePlaces: true,
    includeSourceTags: true,
  });
  const [filterType, setFilterType] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Ensure API sources exist so the "API" filter isn't empty.
      // This is safe to run repeatedly (deduped by apiId tags).
      await ensureApiSources();
      const [sourcesData, citationsData, facilitiesData] = await Promise.all([
        db.sources.toArray(),
        db.citations.toArray(),
        db.facilities.toArray(),
      ]);
      setSources(sourcesData.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()));
      setCitations(citationsData);
      setFacilities(facilitiesData);
    } catch (error) {
      console.error('Failed to load source data:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredSources = useMemo(() => {
    let result = sources;

    // Type filter
    if (filterType !== 'all') {
      result = result.filter(s => s.type === filterType);
    }

    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(s =>
        s.title.toLowerCase().includes(lowerQuery) ||
        s.summary?.toLowerCase().includes(lowerQuery) ||
        s.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
    }

    return result;
  }, [sources, searchQuery, filterType]);

  const handleDelete = async (sourceId: number) => {
    if (!confirm('Delete this source? All related citations will also be removed.')) return;

    try {
      await db.sources.delete(sourceId);
      await db.citations.where('sourceId').equals(sourceId).delete();
      loadData();
    } catch (error) {
      console.error('Failed to delete source:', error);
      alert('Failed to delete source. Please try again.');
    }
  };

  const handleEdit = (source: Source) => {
    setEditingSource(source);
    setShowAddModal(true);
  };

  const getCitationCount = (sourceId: number) => {
    return citations.filter(c => c.sourceId === sourceId).length;
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'PDF':
      case 'Document':
      case 'Report':
        return <FileText className="w-5 h-5 text-red-400" />;
      case 'URL':
      case 'News':
        return <LinkIcon className="w-5 h-5 text-blue-400" />;
      case 'Legal':
        return <FileText className="w-5 h-5 text-purple-400" />;
      case 'Government':
        return <FileText className="w-5 h-5 text-green-400" />;
      default:
        return <FileText className="w-5 h-5 text-gray-400" />;
    }
  };

  const getCredibilityColor = (credibility?: string) => {
    switch (credibility) {
      case 'High':
        return 'text-green-400 bg-green-600/20';
      case 'Medium':
        return 'text-yellow-400 bg-yellow-600/20';
      case 'Low':
        return 'text-red-400 bg-red-600/20';
      default:
        return 'text-gray-400 bg-gray-700';
    }
  };

  const stats = useMemo(() => {
    const totalSources = sources.length;
    const totalCitations = citations.length;
    const highCredibility = sources.filter(s => s.credibility === 'High').length;
    const mediumCredibility = sources.filter(s => s.credibility === 'Medium').length;
    const lowCredibility = sources.filter(s => s.credibility === 'Low').length;
    const unratedCredibility = sources.filter(s => !s.credibility).length;
    const typeBreakdown = sources.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalSources,
      totalCitations,
      highCredibility,
      mediumCredibility,
      lowCredibility,
      unratedCredibility,
      typeBreakdown
    };
  }, [sources, citations]);

  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const handleCardExpand = useCallback((id: string | null) => {
    setExpandedCard(id);
  }, []);

  const citationsByEntity = useMemo(() => {
    const by: Record<string, number> = {};
    for (const c of citations) {
      const k = c.entityType || 'unknown';
      by[k] = (by[k] || 0) + 1;
    }
    return Object.entries(by).sort((a, b) => b[1] - a[1]);
  }, [citations]);

  const sourcesByType = useMemo(() => {
    return Object.entries(stats.typeBreakdown).sort((a, b) => b[1] - a[1]);
  }, [stats.typeBreakdown]);

  const citationsBySourceId = useMemo(() => {
    const m = new Map<number, number>();
    for (const c of citations) {
      m.set(c.sourceId, (m.get(c.sourceId) || 0) + 1);
    }
    return m;
  }, [citations]);

  const topCitedSources = useMemo(() => {
    const rows = Array.from(citationsBySourceId.entries())
      .map(([sourceId, count]) => ({ sourceId, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
    return rows;
  }, [citationsBySourceId]);

  const topTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sources) {
      for (const t of s.tags || []) {
        const key = String(t || '').trim();
        if (!key) continue;
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 24);
  }, [sources]);

  const apiCategoryCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sources) {
      if (s.type !== 'API') continue;
      const cat = (s.tags || []).find((t) => t.startsWith('apiCategory:'))?.slice('apiCategory:'.length) || 'unknown';
      counts.set(cat, (counts.get(cat) || 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [sources]);

  const typeCredBreakdown = useMemo(() => {
    const by: Record<string, { High: number; Medium: number; Low: number; Unrated: number }> = {};
    for (const s of sources) {
      const t = s.type || 'Unknown';
      if (!by[t]) by[t] = { High: 0, Medium: 0, Low: 0, Unrated: 0 };
      if (s.credibility === 'High') by[t].High++;
      else if (s.credibility === 'Medium') by[t].Medium++;
      else if (s.credibility === 'Low') by[t].Low++;
      else by[t].Unrated++;
    }
    return Object.entries(by).sort((a, b) => (b[1].High + b[1].Medium + b[1].Low + b[1].Unrated) - (a[1].High + a[1].Medium + a[1].Low + a[1].Unrated));
  }, [sources]);

  const sourcesByCred = useMemo(() => {
    const by: Record<string, number> = { High: 0, Medium: 0, Low: 0, Unrated: 0 };
    for (const s of sources) {
      if (s.credibility === 'High') by.High++;
      else if (s.credibility === 'Medium') by.Medium++;
      else if (s.credibility === 'Low') by.Low++;
      else by.Unrated++;
    }
    return by;
  }, [sources]);

  const topHighCred = useMemo(() => {
    return sources.filter((s) => s.credibility === 'High').slice(0, 30);
  }, [sources]);

  const sourceById = useMemo(() => {
    const m = new Map<number, Source>();
    for (const s of sources) {
      if (typeof s.id === 'number') m.set(s.id, s);
    }
    return m;
  }, [sources]);

  const facilityById = useMemo(() => {
    const m = new Map<number, Facility>();
    for (const f of facilities) m.set(f.id, f);
    return m;
  }, [facilities]);

  const openUrl = (url?: string) => {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="text-white">Loading sources...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <div
          className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="bg-gray-800 border-b border-gray-700 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
                  <FileText className="w-7 h-7 text-cyan-400" />
                  Source & Evidence Manager
                </h2>
                <p className="text-gray-400 text-sm">
                  Track all evidence, documents, and sources for compliance findings. NotebookLM-style citation system.
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div className={expandedCard === 'total' ? 'lg:col-span-4' : expandedCard ? 'hidden' : ''}>
                <ExpandableSection
                  title={
                    <div>
                      <div className="text-xs text-gray-400">Total Sources</div>
                      <div className="text-2xl font-bold text-white">{stats.totalSources}</div>
                    </div>
                  }
                  badge={stats.totalSources}
                  icon={<FileText className="w-5 h-5 text-white" />}
                  onExpand={(expanded) => handleCardExpand(expanded ? 'total' : null)}
                  className="bg-gray-900 border border-gray-700"
                  headerClassName="bg-gray-900 hover:bg-gray-800"
                >
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-200 mb-2">By Type</div>
                        <div className="space-y-1 text-xs">
                          {sourcesByType.map(([t, c]) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setFilterType(t)}
                              className="w-full flex justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-2 py-1"
                              title="Filter sources by this type"
                            >
                              <span className="text-gray-300">{t}</span>
                              <span className="text-gray-100 font-semibold">{c}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-200 mb-2">By Credibility</div>
                        <div className="space-y-1 text-xs">
                          {(['High', 'Medium', 'Low', 'Unrated'] as const).map((k) => (
                            <div key={k} className="flex justify-between bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-300">{k}</span>
                              <span className="text-gray-100 font-semibold">{(sourcesByCred as any)[k]}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] text-gray-500">
                          Strict policy: key-gated APIs default to <span className="text-gray-200 font-semibold">Medium</span>.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-200 mb-2">Type × Credibility</div>
                        <div className="space-y-1 text-[11px]">
                          {typeCredBreakdown.slice(0, 12).map(([t, c]) => (
                            <div key={t} className="bg-gray-800 rounded px-2 py-1">
                              <div className="flex items-center justify-between">
                                <span className="text-gray-200 font-semibold">{t}</span>
                                <span className="text-gray-400">
                                  {c.High + c.Medium + c.Low + c.Unrated}
                                </span>
                              </div>
                              <div className="text-gray-500">
                                <span className="text-green-300">{c.High}H</span> •{' '}
                                <span className="text-yellow-300">{c.Medium}M</span> •{' '}
                                <span className="text-red-300">{c.Low}L</span> •{' '}
                                <span className="text-gray-300">{c.Unrated}U</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] text-gray-500">Top 12 types shown.</div>
                      </div>

                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-200 mb-2">Top Tags</div>
                        <div className="flex flex-wrap gap-2">
                          {topTags.map(([t, c]) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setFilterType('all');
                                setSearchQuery(t);
                              }}
                              className="px-2 py-1 rounded border border-gray-700 bg-gray-800 hover:bg-gray-700 text-[11px] text-gray-200"
                              title="Filter by this tag"
                            >
                              {t} <span className="text-gray-400">({c})</span>
                            </button>
                          ))}
                        </div>
                        <div className="mt-2 text-[11px] text-gray-500">Click a tag to filter the list.</div>
                      </div>
                    </div>

                    {apiCategoryCounts.length > 0 && (
                      <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                        <div className="text-xs font-semibold text-gray-200 mb-2">API Categories (enabled)</div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                          {apiCategoryCounts.map(([cat, c]) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => {
                                setFilterType('API');
                                setSearchQuery(`apiCategory:${cat}`);
                              }}
                              className="w-full flex justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-2 py-1"
                              title="Filter to API sources in this category"
                            >
                              <span className="text-gray-300">{cat}</span>
                              <span className="text-gray-100 font-semibold">{c}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setFilterType('API')}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800"
                      >
                        View APIs
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterType('Government')}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800"
                      >
                        View Government
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterType('all')}
                        className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800"
                      >
                        Clear type filter
                      </button>
                    </div>
                  </div>
                </ExpandableSection>
              </div>

              <div className={expandedCard === 'citations' ? 'lg:col-span-4' : expandedCard ? 'hidden' : ''}>
                <ExpandableSection
                  title={
                    <div>
                      <div className="text-xs text-gray-400">Citations</div>
                      <div className="text-2xl font-bold text-cyan-400">{stats.totalCitations}</div>
                    </div>
                  }
                  badge={stats.totalCitations}
                  icon={<Tag className="w-5 h-5 text-cyan-400" />}
                  onExpand={(expanded) => handleCardExpand(expanded ? 'citations' : null)}
                  className="bg-gray-900 border border-gray-700"
                  headerClassName="bg-gray-900 hover:bg-gray-800"
                >
                  <div className="p-4 space-y-4">
                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-200 mb-2">By Entity Type</div>
                      <div className="space-y-1 text-xs">
                        {citationsByEntity.length ? (
                          citationsByEntity.map(([t, c]) => (
                            <div key={t} className="flex justify-between bg-gray-800 rounded px-2 py-1">
                              <span className="text-gray-300">{t}</span>
                              <span className="text-gray-100 font-semibold">{c}</span>
                            </div>
                          ))
                        ) : (
                          <div className="text-xs text-gray-400">No citations yet.</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-200 mb-2">Top Cited Sources</div>
                      <div className="space-y-2">
                        {topCitedSources.length ? (
                          topCitedSources.map(({ sourceId, count }) => {
                            const src = sourceById.get(sourceId);
                            return (
                              <button
                                key={sourceId}
                                type="button"
                                onClick={() => {
                                  // Drill-down via search query using source title (fast)
                                  setFilterType('all');
                                  setSearchQuery(src?.title || `Source #${sourceId}`);
                                }}
                                className="w-full text-left bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded p-2 text-xs flex items-center justify-between gap-2"
                                title="Filter the list by this source title"
                              >
                                <div className="min-w-0">
                                  <div className="text-gray-100 font-semibold truncate">{src?.title || `Source #${sourceId}`}</div>
                                  <div className="text-gray-400 truncate">{src?.type || 'Unknown'}{src?.url ? ` • ${src.url}` : ''}</div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-cyan-600/20 text-cyan-200 border border-cyan-700/40 text-[11px] font-semibold">
                                    {count}
                                  </span>
                                </div>
                              </button>
                            );
                          })
                        ) : (
                          <div className="text-xs text-gray-400">No citations yet.</div>
                        )}
                      </div>
                    </div>

                    <div className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                      <div className="text-xs font-semibold text-gray-200 mb-2">Recent Citations (sample)</div>
                      <div className="space-y-2">
                        {citations.slice(0, 12).map((c) => {
                          const src = sourceById.get(c.sourceId);
                          return (
                            <div key={c.id} className="bg-gray-800 rounded p-2 text-xs">
                              <div className="text-gray-100 font-semibold truncate">{src?.title || `Source #${c.sourceId}`}</div>
                              <div className="text-gray-400 mt-0.5">
                                {c.entityType}:{c.entityId}
                              </div>
                              {c.quote && <div className="text-gray-300 mt-1 line-clamp-2">{c.quote}</div>}
                            </div>
                          );
                        })}
                        {!citations.length && <div className="text-xs text-gray-400">No citations yet.</div>}
                      </div>
                    </div>
                  </div>
                </ExpandableSection>
              </div>

              <div className={expandedCard === 'high' ? 'lg:col-span-4' : expandedCard ? 'hidden' : ''}>
                <ExpandableSection
                  title={
                    <Tooltip content="High Credibility counts only sources with credibility = High. Under strict policy, key-gated APIs default to Medium.">
                      <div className="cursor-help">
                        <div className="text-xs text-gray-400">High Credibility</div>
                        <div className="text-2xl font-bold text-green-400">{stats.highCredibility}</div>
                        <div className="mt-1 text-[11px] text-gray-500">
                          {stats.mediumCredibility} Med • {stats.lowCredibility} Low • {stats.unratedCredibility} Unrated
                        </div>
                      </div>
                    </Tooltip>
                  }
                  badge={stats.highCredibility}
                  icon={<AlertCircle className="w-5 h-5 text-green-400" />}
                  onExpand={(expanded) => handleCardExpand(expanded ? 'high' : null)}
                  className="bg-gray-900 border border-gray-700"
                  headerClassName="bg-gray-900 hover:bg-gray-800"
                >
                  <div className="p-4 space-y-3">
                    <div className="text-xs text-gray-400">
                      Strict policy: “High” is reserved for primary documents, official sources, and no-auth public registries.
                    </div>
                    <div className="space-y-2">
                      {topHighCred.map((s) => (
                        <div key={s.id} className="bg-gray-800 rounded p-2 text-xs flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-gray-100 font-semibold truncate">{s.title}</div>
                            <div className="text-gray-400 truncate">{s.type}{s.url ? ` • ${s.url}` : ''}</div>
                            <div className="mt-1 text-[11px] text-gray-500">
                              Added: {new Date(s.addedAt).toLocaleDateString()} • Citations: {typeof s.id === 'number' ? (citationsBySourceId.get(s.id) || 0) : 0} • Linked facilities: {Array.isArray(s.facilityIds) ? s.facilityIds.length : 0}
                            </div>
                            {Array.isArray(s.facilityIds) && s.facilityIds.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {s.facilityIds.slice(0, 4).map((fid) => {
                                  const f = facilityById.get(fid);
                                  return (
                                    <span
                                      key={fid}
                                      className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700 text-[10px] text-gray-300"
                                      title={f ? f.name : `Facility #${fid}`}
                                    >
                                      {f ? f.name : `Facility #${fid}`}
                                    </span>
                                  );
                                })}
                                {s.facilityIds.length > 4 && (
                                  <span className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700 text-[10px] text-gray-400">
                                    +{s.facilityIds.length - 4}
                                  </span>
                                )}
                              </div>
                            )}
                            {Array.isArray(s.tags) && s.tags.length > 0 && (
                              <div className="mt-1 flex flex-wrap gap-1">
                                {s.tags.slice(0, 8).map((t) => (
                                  <span key={t} className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700 text-[10px] text-gray-300">
                                    {t}
                                  </span>
                                ))}
                                {s.tags.length > 8 && (
                                  <span className="px-1.5 py-0.5 rounded bg-gray-900 border border-gray-700 text-[10px] text-gray-400">
                                    +{s.tags.length - 8}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-green-600/20 text-green-300 border border-green-700/40 text-[11px] font-semibold">
                              High
                            </span>
                            {s.url && (
                              <button
                                type="button"
                                onClick={() => openUrl(s.url)}
                                className="p-1.5 rounded border border-gray-700 bg-gray-900 text-gray-300 hover:bg-gray-800"
                                title="Open source"
                                aria-label="Open source"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                      {!topHighCred.length && <div className="text-xs text-gray-400">No high-credibility sources yet.</div>}
                    </div>
                  </div>
                </ExpandableSection>
              </div>

              <div className={expandedCard === 'types' ? 'lg:col-span-4' : expandedCard ? 'hidden' : ''}>
                <ExpandableSection
                  title={
                    <div>
                      <div className="text-xs text-gray-400">Source Types</div>
                      <div className="text-2xl font-bold text-purple-400">{Object.keys(stats.typeBreakdown).length}</div>
                    </div>
                  }
                  badge={Object.keys(stats.typeBreakdown).length}
                  icon={<FileText className="w-5 h-5 text-purple-300" />}
                  onExpand={(expanded) => handleCardExpand(expanded ? 'types' : null)}
                  className="bg-gray-900 border border-gray-700"
                  headerClassName="bg-gray-900 hover:bg-gray-800"
                >
                  <div className="p-4 space-y-3">
                    <div className="text-xs font-semibold text-gray-200">Type breakdown</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {sourcesByType.map(([t, c]) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setFilterType(t)}
                          className="flex items-center justify-between bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded px-3 py-2 text-xs"
                          title={`Filter by ${t}`}
                        >
                          <span className="text-gray-200 font-semibold">{t}</span>
                          <span className="text-gray-100">{c}</span>
                        </button>
                      ))}
                    </div>
                    <div className="text-[11px] text-gray-500">Click any type to filter the source list.</div>
                  </div>
                </ExpandableSection>
              </div>
            </div>

            {/* Search & Filters */}
            <div className="flex gap-3">
              <div className="flex-1">
                <AutocompleteInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  options={nlpSourceOptions}
                  placeholder="Search sources by title, summary, tags… (try: type:PDF, tag:policy)"
                  icon={<Search className="w-4 h-4" />}
                  minChars={1}
                  maxSuggestions={10}
                  id="source-manager-search"
                  onSelect={(opt) => {
                    const v = opt.value;
                    recordSearch(v, 'sources');
                    if (v.toLowerCase().startsWith('type:')) {
                      const type = v.split(':')[1]?.trim();
                      if (type) setFilterType(type);
                      setSearchQuery('');
                      return;
                    }
                    if (v.toLowerCase().startsWith('tag:')) {
                      const tag = v.split(':')[1]?.trim();
                      setSearchQuery(tag || '');
                      return;
                    }
                    setSearchQuery(v);
                  }}
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-gray-700 text-white rounded-lg px-3 py-2 text-sm border border-gray-600"
              >
                <option value="all">All Types</option>
                <option value="PDF">PDF</option>
                <option value="URL">URL</option>
                <option value="Document">Document</option>
                <option value="Report">Report</option>
                <option value="Legal">Legal</option>
                <option value="Government">Government</option>
                <option value="News">News</option>
                <option value="API">API</option>
              </select>
              <button
                onClick={() => {
                  setEditingSource(null);
                  setShowAddModal(true);
                }}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Source
              </button>
            </div>
          </div>

          {/* Sources List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
            {filteredSources.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <FileText className="w-16 h-16 mb-4 opacity-50" />
                <p className="text-lg font-semibold">No sources found</p>
                <p className="text-sm">Add your first source to start tracking evidence</p>
              </div>
            ) : (
              filteredSources.map((source) => (
                <div
                  key={source.id}
                  className="bg-gray-800 border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Icon & Title */}
                    <div className="flex items-start gap-3 flex-1">
                      {getSourceIcon(source.type)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-lg font-semibold text-white truncate">{source.title}</h3>
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getCredibilityColor(source.credibility)}`}>
                            {source.credibility || 'Unrated'}
                          </span>
                        </div>
                        {source.summary && (
                          <p className="text-sm text-gray-400 mb-2 line-clamp-2">{source.summary}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Tag className="w-3 h-3" />
                            {source.type}
                          </span>
                          <span>{new Date(source.addedAt).toLocaleDateString()}</span>
                          <span>{getCitationCount(source.id!)} citations</span>
                          {source.facilityIds && source.facilityIds.length > 0 && (
                            <span>{source.facilityIds.length} facilities</span>
                          )}
                        </div>
                        {source.tags && source.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {source.tags.map((tag, idx) => (
                              <span key={idx} className="px-2 py-0.5 bg-gray-700 text-gray-300 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {source.url && (
                        <Tooltip content="Open source">
                          <a
                            href={source.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-cyan-400 transition-colors"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </Tooltip>
                      )}
                      <Tooltip content="Edit source">
                        <button
                          onClick={() => handleEdit(source)}
                          className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip content="Delete source">
                        <button
                          onClick={() => handleDelete(source.id!)}
                          className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <AddSourceModal
          existingSource={editingSource}
          preselectedFacility={preselectedFacility}
          facilities={facilities}
          allSources={sources}
          onClose={() => {
            setShowAddModal(false);
            setEditingSource(null);
          }}
          onSave={() => {
            loadData();
            setShowAddModal(false);
            setEditingSource(null);
          }}
        />
      )}
    </ErrorBoundary>
  );
}

// Add/Edit Source Modal
interface AddSourceModalProps {
  existingSource: Source | null;
  preselectedFacility?: Facility;
  facilities: Facility[];
  allSources: Source[];
  onClose: () => void;
  onSave: () => void;
}

function AddSourceModal({ existingSource, preselectedFacility, facilities: _facilities, allSources, onClose, onSave }: AddSourceModalProps) {
  const [formData, setFormData] = useState<Partial<Source>>(
    existingSource || {
      type: 'URL',
      addedAt: new Date().toISOString(),
      credibility: 'Medium',
      facilityIds: preselectedFacility ? [preselectedFacility.id || 0] : [],
      tags: [],
    }
  );
  const [tagInput, setTagInput] = useState('');

  const titleOptions: AutocompleteOption[] = useMemo(() => {
    const uniq = Array.from(new Set(allSources.map(s => s.title).filter(Boolean)));
    return uniq.slice(0, 200).map(t => ({ value: t, label: t, category: 'Existing Titles' }));
  }, [allSources]);

  const tagOptions: AutocompleteOption[] = useMemo(() => {
    const tags = new Map<string, number>();
    allSources.forEach(s => (s.tags || []).forEach(t => tags.set(t, (tags.get(t) || 0) + 1)));
    return Array.from(tags.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 200)
      .map(([t, count]) => ({ value: t, label: t, category: 'Tags', metadata: { description: `${count} sources` } }));
  }, [allSources]);

  const urlOptions: AutocompleteOption[] = useMemo(() => {
    const common = [
      'https://www.peeringdb.com/api',
      'https://echo.epa.gov/api',
      'https://data.sec.gov/submissions/',
      'https://api.usaspending.gov/api/v2/',
      'https://api.gleif.org/api/v1/lei-records',
      'https://www.peeringdb.com/api',
      'https://crt.sh',
    ];
    const fromSources = allSources.map(s => s.url).filter((u): u is string => !!u);
    const uniq = Array.from(new Set([...common, ...fromSources])).slice(0, 200);
    return uniq.map(u => ({ value: u, label: u, category: 'URLs' }));
  }, [allSources]);

  const handleSubmit = async () => {
    if (!formData.title?.trim()) {
      alert('Title is required');
      return;
    }

    try {
      if (existingSource) {
        await db.sources.update(existingSource.id!, formData);
      } else {
        await db.sources.add(formData as Source);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save source:', error);
      alert('Failed to save source. Please try again.');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags?.includes(tagInput.trim())) {
      setFormData({
        ...formData,
        tags: [...(formData.tags || []), tagInput.trim()],
      });
      setTagInput('');
    }
  };

  const addTagValue = (value: string) => {
    const v = value.trim();
    if (!v) return;
    if (formData.tags?.includes(v)) return;
    setFormData({
      ...formData,
      tags: [...(formData.tags || []), v],
    });
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags?.filter(t => t !== tag) || [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {existingSource ? 'Edit' : 'Add'} Source
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-xl">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Title *</label>
            <AutocompleteInput
              value={formData.title || ''}
              onChange={(v) => setFormData({ ...formData, title: v })}
              options={titleOptions}
              placeholder="e.g., Michigan Subsidy Agreement 2022"
              minChars={1}
              maxSuggestions={8}
              allowCustomValue
              id="source-title"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
                required
              >
                <option value="URL">URL</option>
                <option value="PDF">PDF</option>
                <option value="Document">Document</option>
                <option value="Report">Report</option>
                <option value="Legal">Legal</option>
                <option value="Government">Government</option>
                <option value="News">News</option>
                <option value="API">API</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Credibility</label>
              <select
                value={formData.credibility}
                onChange={(e) => setFormData({ ...formData, credibility: e.target.value as any })}
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">URL / Link</label>
            <AutocompleteInput
              value={formData.url || ''}
              onChange={(v) => setFormData({ ...formData, url: v })}
              options={urlOptions}
              placeholder="https://…"
              minChars={1}
              maxSuggestions={8}
              allowCustomValue
              id="source-url"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Summary</label>
            <textarea
              value={formData.summary || ''}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={3}
              placeholder="Brief description of this source..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Tags</label>
            <div className="flex gap-2 mb-2">
              <div className="flex-1">
                <AutocompleteInput
                  value={tagInput}
                  onChange={setTagInput}
                  options={tagOptions}
                  placeholder="Add tag (press Enter)"
                  minChars={1}
                  maxSuggestions={8}
                  allowCustomValue
                  id="source-tag"
                  onSelect={(opt) => addTagValue(opt.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                />
              </div>
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm font-medium"
              >
                Add
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {formData.tags?.map((tag) => (
                <span key={tag} className="flex items-center gap-1 px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                  {tag}
                  <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-400">
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg py-2 font-semibold transition-colors"
            >
              {existingSource ? 'Update' : 'Add'} Source
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

