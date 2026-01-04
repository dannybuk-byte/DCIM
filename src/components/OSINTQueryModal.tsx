import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Search, ExternalLink, AlertTriangle } from 'lucide-react';
import { FullscreenOverlay } from './shared/FullscreenOverlay';
import { AutocompleteInput } from './shared/AutocompleteInput';
import { useNLPSearchSuggestions } from '../hooks/useNLPSearchSuggestions';
import { recordSearch } from '../db/searchHistory';

type ToolStatus = 'available' | 'requires-auth' | 'proxy-needed';

export interface OSINTToolConfig {
  name: string;
  description: string;
  status: ToolStatus;
  endpoint?: string;
  cors: boolean;
}

type QueryMode = 'peeringdb' | 'generic_json';

function guessQueryMode(toolName: string): QueryMode {
  if (toolName.toLowerCase().includes('peeringdb')) return 'peeringdb';
  return 'generic_json';
}

export const OSINTQueryModal = memo(function OSINTQueryModal({
  tool,
  isOpen,
  onClose,
}: {
  tool: OSINTToolConfig | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<any>(null);

  const mode = useMemo(() => (tool ? guessQueryMode(tool.name) : 'generic_json'), [tool]);

  const suggestions = useNLPSearchSuggestions({
    context: 'osint',
    includeFacilities: false,
    includeOperators: false,
    includePlaces: false,
  });

  useEffect(() => {
    if (!isOpen) {
      setQuery('');
      setLoading(false);
      setError(null);
      setResult(null);
    }
  }, [isOpen]);

  const runQuery = useCallback(async () => {
    if (!tool) return;

    setError(null);
    setResult(null);

    if (!tool.endpoint) {
      setError('No endpoint configured for this tool.');
      return;
    }

    if (tool.status !== 'available') {
      setError(
        tool.status === 'proxy-needed'
          ? 'This endpoint is blocked by browser CORS. A server-side proxy is required (not available in a zero-backend build).'
          : 'This endpoint requires an API key/authentication. Add an API key workflow or proxy to enable.'
      );
      return;
    }

    if (!query.trim()) {
      setError('Enter a query first.');
      return;
    }
    recordSearch(query.trim(), 'osint');

    const controller = new AbortController();
    setLoading(true);

    try {
      if (mode === 'peeringdb') {
        const q = encodeURIComponent(query.trim());
        const base = tool.endpoint.replace(/\/$/, '');
        const orgUrl = `${base}/org?name__icontains=${q}`;
        const netUrl = `${base}/net?name__icontains=${q}`;

        const [orgRes, netRes] = await Promise.all([
          fetch(orgUrl, { signal: controller.signal }),
          fetch(netUrl, { signal: controller.signal }),
        ]);

        if (!orgRes.ok || !netRes.ok) {
          throw new Error(`PeeringDB query failed (org:${orgRes.status}, net:${netRes.status}).`);
        }

        const [orgJson, netJson] = await Promise.all([orgRes.json(), netRes.json()]);
        setResult({
          mode: 'peeringdb',
          query: query.trim(),
          org: orgJson?.data ?? [],
          net: netJson?.data ?? [],
        });
        return;
      }

      // generic_json
      const q = encodeURIComponent(query.trim());
      const url = `${tool.endpoint}?q=${q}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`Query failed: HTTP ${res.status}`);
      const contentType = res.headers.get('content-type') || '';
      const data = contentType.includes('application/json') ? await res.json() : await res.text();
      setResult({ mode: 'generic_json', query: query.trim(), url, data });
    } catch (e: any) {
      setError(e?.message || 'Query failed.');
    } finally {
      setLoading(false);
    }

    return () => controller.abort();
  }, [mode, query, tool]);

  const openEndpoint = useCallback(() => {
    if (!tool?.endpoint) return;
    window.open(tool.endpoint, '_blank', 'noopener,noreferrer');
  }, [tool]);

  return (
    <FullscreenOverlay
      isOpen={isOpen}
      title={tool ? `${tool.name} Query` : 'OSINT Query'}
      onClose={onClose}
    >
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {!tool ? (
          <div className="text-gray-300">No tool selected.</div>
        ) : (
          <>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xl font-bold text-white">{tool.name}</div>
                  <div className="text-sm text-gray-400 mt-1">{tool.description}</div>
                  {tool.endpoint && (
                    <div className="mt-2 text-xs text-gray-500 font-mono break-all">{tool.endpoint}</div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={openEndpoint}
                  className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg hover:bg-gray-700 text-sm text-gray-200 flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open
                </button>
              </div>
            </div>

            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-[220px]">
                  <AutocompleteInput
                    value={query}
                    onChange={setQuery}
                    options={suggestions}
                    placeholder="Type a company / ASN / org name…"
                    icon={<Search className="w-4 h-4" />}
                    minChars={1}
                    maxSuggestions={8}
                    id="osint-query-input"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') runQuery();
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={runQuery}
                  disabled={loading}
                  className="px-5 py-3 bg-amber-600 hover:bg-amber-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-semibold"
                >
                  {loading ? 'Querying…' : 'Run Query'}
                </button>
              </div>

              {tool.status !== 'available' && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-sm text-red-200 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-300 mt-0.5" />
                  <div>
                    <div className="font-semibold">This tool is not queryable in a zero-backend browser build.</div>
                    <div className="text-red-200/80 mt-1">
                      {tool.status === 'proxy-needed'
                        ? 'Browser CORS blocks this endpoint. You’ll need a server-side proxy.'
                        : 'This endpoint requires an API key/auth.'}
                    </div>
                  </div>
                </div>
              )}

              {error && (
                <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-sm text-red-200">
                  {error}
                </div>
              )}
            </div>

            {/* Results */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="text-lg font-semibold text-white mb-4">Results</div>

              {!result && !error && (
                <div className="text-sm text-gray-400">Run a query to see results here.</div>
              )}

              {result?.mode === 'peeringdb' && (
                <div className="space-y-6">
                  <div>
                    <div className="text-sm text-gray-400 mb-2">
                      Orgs matched: <span className="text-white font-semibold">{result.org?.length ?? 0}</span>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto border border-gray-800 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-950 text-gray-400">
                          <tr>
                            <th className="text-left p-3">Org</th>
                            <th className="text-left p-3">Country</th>
                            <th className="text-left p-3">Website</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(result.org ?? []).slice(0, 50).map((o: any) => (
                            <tr key={o.id} className="border-t border-gray-800">
                              <td className="p-3 text-gray-200">{o.name ?? `Org ${o.id}`}</td>
                              <td className="p-3 text-gray-400">{o.country ?? '—'}</td>
                              <td className="p-3 text-gray-400">{o.website ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm text-gray-400 mb-2">
                      Networks matched: <span className="text-white font-semibold">{result.net?.length ?? 0}</span>
                    </div>
                    <div className="max-h-[240px] overflow-y-auto border border-gray-800 rounded-lg">
                      <table className="w-full text-sm">
                        <thead className="sticky top-0 bg-gray-950 text-gray-400">
                          <tr>
                            <th className="text-left p-3">Network</th>
                            <th className="text-left p-3">ASN</th>
                            <th className="text-left p-3">IRR AS-SET</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(result.net ?? []).slice(0, 50).map((n: any) => (
                            <tr key={n.id} className="border-t border-gray-800">
                              <td className="p-3 text-gray-200">{n.name ?? `Net ${n.id}`}</td>
                              <td className="p-3 text-gray-400">{n.asn ?? '—'}</td>
                              <td className="p-3 text-gray-400">{n.irr_as_set ?? '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {result?.mode === 'generic_json' && (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500 font-mono break-all">
                    {result.url}
                  </div>
                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-4 max-h-[420px] overflow-y-auto">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap">
                      {typeof result.data === 'string' ? result.data : JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </FullscreenOverlay>
  );
});


