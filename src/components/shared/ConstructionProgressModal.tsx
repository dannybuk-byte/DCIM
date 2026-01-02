import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { X, RefreshCcw, ExternalLink, Layers, Video } from 'lucide-react';
import { fetchConstructionScenesForFacility, type ConstructionScene } from '../../services/constructionImagery';
import {
  clearFacilityRadius,
  computeFootprintChangeScore,
  loadFacilityRadius,
  loadFacilityThreshold,
  recommendedRadiusMeters,
  saveFacilityRadius,
  saveFacilityThreshold
} from '../../services/constructionAnalytics';
import type { LngLat } from '../../utils/geoMath';

const COLORS = {
  bg: '#0a0e17',
  bgCard: '#0d1219',
  text: '#e8eef6',
  textMuted: '#5a6d8a',
  cyan: '#00d2d3',
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' });
}

export const ConstructionProgressModal = memo(function ConstructionProgressModal({
  isOpen,
  onClose,
  facility,
  overlaySceneId,
  overlayOpacity,
  onSetOverlay,
  onClearOverlay,
  onSetOverlayOpacity,
}: {
  isOpen: boolean;
  onClose: () => void;
  facility: { id?: string; name: string; type?: string; lat: number; lng: number } | null;
  overlaySceneId: string | null;
  overlayOpacity: number;
  onSetOverlay: (sceneId: string) => void;
  onClearOverlay: () => void;
  onSetOverlayOpacity: (opacity: number) => void;
}) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<ConstructionScene[]>([]);
  const [selectedA, setSelectedA] = useState<string | null>(null);
  const [selectedB, setSelectedB] = useState<string | null>(null);
  const [wipe, setWipe] = useState(0.5); // 0..1
  const [tab, setTab] = useState<'compare' | 'overlay' | 'export'>('compare');
  const [diffScore, setDiffScore] = useState<number | null>(null);
  const [diffStatus, setDiffStatus] = useState<'idle' | 'computing' | 'unavailable'>('idle');
  const [threshold, setThreshold] = useState(22);
  const [radiusMeters, setRadiusMeters] = useState(600);
  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<string>('');

  const abortRef = useRef<AbortController | null>(null);

  const a = useMemo(() => scenes.find((s) => s.id === selectedA) || null, [scenes, selectedA]);
  const b = useMemo(() => scenes.find((s) => s.id === selectedB) || null, [scenes, selectedB]);

  const load = async (forceRefresh: boolean) => {
    if (!facility) return;
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setStatus('loading');
    setError(null);
    try {
      const next = await fetchConstructionScenesForFacility({
        facilityId: facility.id,
        lat: facility.lat,
        lng: facility.lng,
        forceRefresh,
        limit: 14,
        daysBack: 210,
      });

      setScenes(next);
      // Default compare: latest vs previous (if available)
      const latest = next[0]?.id || null;
      const prev = next[1]?.id || latest;
      setSelectedA(prev);
      setSelectedB(latest);
      setWipe(0.5);
      setTab('compare');
      setStatus('ready');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Failed to load imagery timeline.');
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (!facility) return;
    // Load persisted facility settings (threshold + radius)
    (async () => {
      try {
        const k = facility.id ? String(facility.id) : `${facility.lat.toFixed(5)}:${facility.lng.toFixed(5)}`;
        const [t, r] = await Promise.all([loadFacilityThreshold(k), loadFacilityRadius(k, facility.type)]);
        setThreshold(t);
        setRadiusMeters(r);
      } catch {
        // ignore
      }
    })();
    load(false);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facility?.id, facility?.lat, facility?.lng]);

  // Auto-recompute when A/B or radius changes while in Compare tab (keeps "progress tracking" feeling live)
  useEffect(() => {
    if (!isOpen) return;
    if (!facility) return;
    if (tab !== 'compare') return;
    if (!a?.id || !b?.id) return;
    computeFootprintDiff(a.id, b.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, facility?.id, tab, selectedA, selectedB, radiusMeters]);

  if (!isOpen) return null;

  const computeDiff = async (beforeUrl: string, afterUrl: string) => {
    // Best-effort: compute a luminance diff score from thumbnails.
    // If CORS blocks pixel access, we fall back to "unavailable".
    setDiffStatus('computing');
    setDiffScore(null);
    try {
      const loadImg = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('image load failed'));
          img.src = src;
        });

      const [imgA, imgB] = await Promise.all([loadImg(beforeUrl), loadImg(afterUrl)]);
      const w = 128;
      const h = 72;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) throw new Error('no canvas context');

      const getLuma = (img: HTMLImageElement) => {
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const out = new Float32Array(w * h);
        for (let i = 0, p = 0; i < data.length; i += 4, p++) {
          // Rec. 709 luma
          out[p] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
        }
        return out;
      };

      const la = getLuma(imgA);
      const lb = getLuma(imgB);
      let sum = 0;
      for (let i = 0; i < la.length; i++) sum += Math.abs(la[i] - lb[i]);
      const mean = sum / la.length; // 0..255
      const score = Math.max(0, Math.min(100, (mean / 255) * 100));
      setDiffScore(Number(score.toFixed(1)));
      setDiffStatus('idle');
    } catch {
      setDiffStatus('unavailable');
      setDiffScore(null);
    }
  };

  const computeFootprintDiff = async (beforeSceneId: string, afterSceneId: string) => {
    if (!facility) return;
    setDiffStatus('computing');
    setDiffScore(null);
    try {
      const facilityKey = facility.id ? String(facility.id) : `${facility.lat.toFixed(5)}:${facility.lng.toFixed(5)}`;
      const center: LngLat = { lng: facility.lng, lat: facility.lat };
      const res = await computeFootprintChangeScore({
        facilityKey,
        center,
        radiusMeters,
        beforeSceneId,
        afterSceneId,
      });
      setDiffScore(res.score);
      setDiffStatus('idle');
    } catch {
      // Fall back to thumbnail diff if available
      if (a?.thumbnailUrl && b?.thumbnailUrl) {
        computeDiff(a.thumbnailUrl, b.thumbnailUrl);
      } else {
        setDiffStatus('unavailable');
        setDiffScore(null);
      }
    }
  };

  const exportTimelapseWebm = async () => {
    if (exporting) return;
    if (!scenes.length) return;
    setExporting(true);
    setExportProgress('Preparing…');
    try {
      const frames = scenes.slice().reverse().slice(-10); // oldest->newest, max 10
      const w = 640;
      const h = 360;
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No canvas context');

      const stream = (canvas as any).captureStream?.(6);
      if (!stream || !(window as any).MediaRecorder) throw new Error('MediaRecorder not supported');

      const mimeCandidates = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
      const mimeType = mimeCandidates.find((m) => (window as any).MediaRecorder.isTypeSupported?.(m)) || 'video/webm';
      const recorder = new (window as any).MediaRecorder(stream, { mimeType });
      const chunks: BlobPart[] = [];
      recorder.ondataavailable = (e: any) => {
        if (e?.data && e.data.size > 0) chunks.push(e.data);
      };

      const loadImg = (src: string) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('image load failed'));
          img.src = src;
        });

      recorder.start(250);

      for (let i = 0; i < frames.length; i++) {
        const f = frames[i];
        setExportProgress(`Rendering ${i + 1}/${frames.length}…`);
        const img = await loadImg(f.thumbnailUrl);
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, w, h);
        // cover draw
        const ar = img.width / img.height;
        const targetAr = w / h;
        let dw = w;
        let dh = h;
        if (ar > targetAr) {
          dh = h;
          dw = Math.round(h * ar);
        } else {
          dw = w;
          dh = Math.round(w / ar);
        }
        const dx = Math.round((w - dw) / 2);
        const dy = Math.round((h - dh) / 2);
        ctx.drawImage(img, dx, dy, dw, dh);

        // overlay date
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(10, 10, 180, 28);
        ctx.fillStyle = '#e8eef6';
        ctx.font = '14px ui-sans-serif, system-ui';
        ctx.fillText(formatDate(f.datetime), 18, 30);

        // hold ~0.8s per frame at 6fps
        await new Promise((r) => setTimeout(r, 800));
      }

      setExportProgress('Finalizing…');
      await new Promise((r) => setTimeout(r, 400));
      recorder.stop();
      await new Promise((r) => (recorder.onstop = r));

      const blob = new Blob(chunks, { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `construction-timelapse-${facility?.id || 'facility'}-${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setExportProgress('Done.');
    } catch (e: any) {
      setExportProgress(e?.message || 'Export failed.');
    } finally {
      setExporting(false);
      window.setTimeout(() => setExportProgress(''), 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-[999999] bg-black/70 backdrop-blur-sm">
      <div className="absolute inset-0" onClick={onClose} />
      <div
        className="absolute top-8 left-1/2 -translate-x-1/2 w-[min(1100px,calc(100vw-24px))] max-h-[calc(100vh-64px)] overflow-hidden rounded-xl border"
        style={{ background: COLORS.bgCard, borderColor: 'rgba(90,109,138,0.25)', boxShadow: '0 12px 48px rgba(0,0,0,0.55)' }}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'rgba(90,109,138,0.22)' }}>
          <div className="min-w-0">
            <div className="text-white font-semibold truncate">Construction Progress (Near‑Real‑Time Satellite)</div>
            <div className="text-xs truncate" style={{ color: COLORS.textMuted }}>
              {facility?.name || 'Facility'} • Sentinel‑2 timeline (cloud-filtered, latest-available)
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab('compare')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border ${
                tab === 'compare' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
              }`}
              title="Compare scenes (A/B) + change score"
            >
              Compare
            </button>
            <button
              type="button"
              onClick={() => setTab('overlay')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 ${
                tab === 'overlay' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
              }`}
              title="Overlay a dated scene on the live map"
            >
              <Layers className="w-4 h-4" />
              Overlay
            </button>
            <button
              type="button"
              onClick={() => setTab('export')}
              className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 ${
                tab === 'export' ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
              }`}
              title="Export a quick timelapse"
            >
              <Video className="w-4 h-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => load(true)}
              className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800 flex items-center gap-2"
              title="Refresh imagery (bypass cache)"
            >
              <RefreshCcw className="w-4 h-4" />
              Refresh
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5 text-gray-300" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[360px_1fr] gap-0">
          <div className="border-r" style={{ borderColor: 'rgba(90,109,138,0.16)' }}>
            <div className="p-3">
              <div className="text-xs font-semibold text-gray-200 mb-2">Timeline (most recent first)</div>
              {status === 'loading' && <div className="text-xs text-gray-400">Loading scenes…</div>}
              {status === 'error' && <div className="text-xs text-red-300">{error}</div>}
              {status === 'ready' && scenes.length === 0 && <div className="text-xs text-gray-400">No scenes found.</div>}

              <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-auto pr-1">
                {scenes.map((s) => {
                  const isA = s.id === selectedA;
                  const isB = s.id === selectedB;
                  const cloud = typeof s.cloudCover === 'number' ? `${Math.round(s.cloudCover)}% cloud` : 'cloud ?';
                  return (
                    <div key={s.id} className="p-2 rounded-lg border bg-gray-950/70 border-gray-800">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-gray-100 truncate">{formatDate(s.datetime)}</div>
                          <div className="text-[11px] text-gray-500 truncate">{cloud}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedA(s.id)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                              isA ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
                            }`}
                            title="Set as BEFORE"
                          >
                            A
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedB(s.id)}
                            className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                              isB ? 'bg-cyan-600 text-white border-cyan-500' : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
                            }`}
                            title="Set as AFTER"
                          >
                            B
                          </button>
                          {tab === 'overlay' && (
                            <button
                              type="button"
                              onClick={() => onSetOverlay(s.id)}
                              className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                                overlaySceneId === s.id
                                  ? 'bg-green-600 text-white border-green-500'
                                  : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
                              }`}
                              title="Overlay this date on the live map"
                            >
                              O
                            </button>
                          )}
                          {s.stacItemUrl && (
                            <button
                              type="button"
                              onClick={() => window.open(s.stacItemUrl!, '_blank', 'noopener,noreferrer')}
                              className="p-1.5 rounded border border-gray-800 bg-gray-900 text-gray-300 hover:bg-gray-800"
                              title="Open STAC item"
                              aria-label="Open STAC item"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-2">
                        <img
                          src={s.thumbnailUrl}
                          alt={`Scene thumbnail ${s.id}`}
                          className="w-full h-24 object-cover rounded border border-gray-800"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-4">
            {tab === 'compare' && (
              <>
                <div className="flex items-center justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-white truncate">Before / After Compare</div>
                    <div className="text-xs truncate" style={{ color: COLORS.textMuted }}>
                      A: {a ? formatDate(a.datetime) : '—'} • B: {b ? formatDate(b.datetime) : '—'}
                    </div>
                  </div>
                  <div className="text-xs font-semibold" style={{ color: COLORS.cyan }}>
                    Wipe: {Math.round(wipe * 100)}%
                  </div>
                </div>

                <div className="relative w-full rounded-xl overflow-hidden border border-gray-800 bg-black">
                  <div className="relative w-full" style={{ aspectRatio: '16 / 9' }}>
                    {a?.thumbnailUrl && (
                      <img src={a.thumbnailUrl} alt="Before" className="absolute inset-0 w-full h-full object-cover" />
                    )}
                    {b?.thumbnailUrl && (
                      <img
                        src={b.thumbnailUrl}
                        alt="After"
                        className="absolute inset-0 w-full h-full object-cover"
                        style={{ clipPath: `inset(0 0 0 ${Math.round(wipe * 100)}%)` }}
                      />
                    )}
                    <div
                      className="absolute inset-y-0"
                      style={{
                        left: `${Math.round(wipe * 100)}%`,
                        width: '2px',
                        background: 'rgba(0,210,211,0.9)',
                        boxShadow: '0 0 18px rgba(0,210,211,0.55)',
                        transform: 'translateX(-1px)',
                      }}
                    />
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={Math.round(wipe * 100)}
                      onChange={(e) => setWipe(Number(e.target.value) / 100)}
                      className="w-full"
                      aria-label="Wipe slider"
                    />
                    <div className="mt-2 text-xs text-gray-400">Slide to reveal “after” over “before”.</div>
                  </div>

                  <div className="bg-gray-950 border border-gray-800 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold text-gray-200">Change score (0–100)</div>
                      <button
                        type="button"
                        onClick={() => {
                          if (a?.id && b?.id) computeFootprintDiff(a.id, b.id);
                        }}
                        className="px-2 py-1 rounded text-[11px] border border-gray-800 bg-gray-900 text-gray-200 hover:bg-gray-800"
                        title="Compute footprint-aware change score (tile stats); falls back if unavailable"
                      >
                        Compute
                      </button>
                    </div>
                    <div className="mt-2 text-2xl font-bold text-white">
                      {diffStatus === 'computing' ? '…' : diffStatus === 'unavailable' ? 'N/A' : diffScore ?? '—'}
                    </div>
                    <div className="mt-1 text-[11px] text-gray-500">
                      {diffStatus === 'unavailable'
                        ? 'Stats endpoint unavailable; fell back to thumbnail diff if possible.'
                        : 'Higher = larger change over facility footprint between dates.'}
                    </div>

                    <div className="mt-3 text-xs text-gray-200 font-semibold">Footprint radius</div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] text-gray-500">
                        Auto:{' '}
                        <span className="text-gray-200 font-semibold">
                          {recommendedRadiusMeters(facility?.type)}m
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!facility) return;
                          const k = facility.id ? String(facility.id) : `${facility.lat.toFixed(5)}:${facility.lng.toFixed(5)}`;
                          const r = recommendedRadiusMeters(facility.type);
                          setRadiusMeters(r);
                          clearFacilityRadius(k).catch(() => {});
                        }}
                        className="px-2 py-1 rounded text-[11px] border border-gray-800 bg-gray-900 text-gray-200 hover:bg-gray-800"
                        title="Remove manual override and return to auto-scaled radius"
                      >
                        Reset to auto
                      </button>
                    </div>
                    <input
                      type="range"
                      min={50}
                      max={3000}
                      step={50}
                      value={radiusMeters}
                      onChange={(e) => setRadiusMeters(Number(e.target.value))}
                      onMouseUp={() => {
                        if (!facility) return;
                        const k = facility.id ? String(facility.id) : `${facility.lat.toFixed(5)}:${facility.lng.toFixed(5)}`;
                        saveFacilityRadius(k, radiusMeters).catch(() => {});
                      }}
                      className="w-full"
                      aria-label="Footprint radius slider"
                    />
                    <div className="mt-1 text-[11px] text-gray-500">
                      Radius: <span className="text-gray-200 font-semibold">{radiusMeters}m</span>
                    </div>

                    <div className="mt-3 text-xs text-gray-200 font-semibold">Alert threshold</div>
                    <input
                      type="range"
                      min={5}
                      max={60}
                      value={threshold}
                      onChange={(e) => {
                        const next = Number(e.target.value);
                        setThreshold(next);
                      }}
                      onMouseUp={() => {
                        if (!facility) return;
                        const k = facility.id ? String(facility.id) : `${facility.lat.toFixed(5)}:${facility.lng.toFixed(5)}`;
                        saveFacilityThreshold(k, threshold).catch(() => {});
                      }}
                      className="w-full"
                      aria-label="Alert threshold slider"
                    />
                    <div className="mt-1 text-[11px] text-gray-500">
                      Threshold: <span className="text-gray-200 font-semibold">{threshold}</span>{' '}
                      {diffScore != null && diffScore >= threshold ? '• ALERT' : ''}
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === 'overlay' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-white">Overlay dated imagery on the live map</div>
                <div className="text-xs text-gray-400">
                  Pick a scene in the timeline and hit <span className="text-gray-200 font-semibold">O</span> to overlay tiles on the
                  main map (satellite-style).
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded-lg p-3 space-y-2">
                  <div className="text-xs text-gray-200 font-semibold">Active overlay</div>
                  <div className="text-xs text-gray-400 truncate">{overlaySceneId || 'None'}</div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={onClearOverlay}
                      className="px-3 py-2 rounded-lg text-xs font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800"
                    >
                      Clear overlay
                    </button>
                  </div>
                  <div className="text-xs text-gray-200 font-semibold mt-2">Opacity</div>
                  <input
                    type="range"
                    min={5}
                    max={100}
                    value={Math.round(Math.max(0, Math.min(1, overlayOpacity)) * 100)}
                    onChange={(e) => onSetOverlayOpacity(Number(e.target.value) / 100)}
                    className="w-full"
                    aria-label="Overlay opacity"
                  />
                  <div className="text-[11px] text-gray-500">Opacity: {Math.round(overlayOpacity * 100)}%</div>
                </div>
              </div>
            )}

            {tab === 'export' && (
              <div className="space-y-3">
                <div className="text-sm font-semibold text-white">Timelapse export (WebM)</div>
                <div className="text-xs text-gray-400">
                  Exports up to the latest 10 thumbnail frames into a WebM clip (quick share / boardroom-ready).
                </div>
                <button
                  type="button"
                  onClick={() => exportTimelapseWebm()}
                  disabled={exporting}
                  className={`px-4 py-3 rounded-lg text-sm font-semibold border flex items-center gap-2 ${
                    exporting ? 'bg-gray-900 text-gray-500 border-gray-800 cursor-not-allowed' : 'bg-cyan-600 text-white border-cyan-500 hover:bg-cyan-700'
                  }`}
                >
                  <Video className="w-5 h-5" />
                  {exporting ? 'Exporting…' : 'Export timelapse'}
                </button>
                {exportProgress && <div className="text-xs text-gray-400">{exportProgress}</div>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});


