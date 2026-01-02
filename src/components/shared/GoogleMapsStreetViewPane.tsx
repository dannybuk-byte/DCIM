import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, Image as ImageIcon, X, KeyRound, ExternalLink, Pin as PinIcon } from 'lucide-react';
import { loadGoogleMapsApi } from '../../utils/loadGoogleMaps';

type PaneTab = 'map' | 'streetview';

export interface GooglePaneLocation {
  lat: number;
  lng: number;
  title?: string;
  subtitle?: string;
}

export const GoogleMapsStreetViewPane = memo(function GoogleMapsStreetViewPane({
  isOpen,
  onClose,
  apiKey,
  location,
  onOpenKeySettings,
  requestedTab,
  pinned,
  onTogglePin,
}: {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string;
  location: GooglePaneLocation | null;
  onOpenKeySettings: () => void;
  requestedTab?: PaneTab | null;
  pinned?: boolean;
  onTogglePin?: () => void;
}) {
  const [tab, setTab] = useState<PaneTab>('map');
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const mapDivRef = useRef<HTMLDivElement>(null);
  const panoDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const panoRef = useRef<any>(null);
  const markerRef = useRef<any>(null);

  const hasKey = useMemo(() => !!apiKey.trim(), [apiKey]);

  useEffect(() => {
    if (!isOpen) {
      setTab('map');
      setStatus('idle');
      setError(null);
      return;
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    if (!requestedTab) return;
    setTab(requestedTab);
  }, [isOpen, requestedTab]);

  useEffect(() => {
    let cancelled = false;
    if (!isOpen || !location) return;
    if (!hasKey) return;

    setStatus('loading');
    setError(null);

    loadGoogleMapsApi(apiKey)
      .then(() => {
        if (cancelled) return;
        const g = (window as any).google;
        if (!g?.maps) throw new Error('Google Maps API not available after load.');

        // Initialize Map
        if (mapDivRef.current && !mapRef.current) {
          mapRef.current = new g.maps.Map(mapDivRef.current, {
            center: { lat: location.lat, lng: location.lng },
            zoom: 14,
            // Imagery-first (still allows toggling in the UI controls)
            mapTypeId: 'hybrid',
            streetViewControl: true,
            fullscreenControl: false,
            mapTypeControl: true,
          });
          markerRef.current = new g.maps.Marker({
            position: { lat: location.lat, lng: location.lng },
            map: mapRef.current,
            title: location.title || 'Location',
          });
        }

        // Initialize StreetView
        if (panoDivRef.current && !panoRef.current) {
          panoRef.current = new g.maps.StreetViewPanorama(panoDivRef.current, {
            position: { lat: location.lat, lng: location.lng },
            pov: { heading: 0, pitch: 0 },
            zoom: 1,
            addressControl: true,
            fullscreenControl: false,
          });
        }

        // Update positions
        if (mapRef.current) {
          mapRef.current.setCenter({ lat: location.lat, lng: location.lng });
          if (markerRef.current) markerRef.current.setPosition({ lat: location.lat, lng: location.lng });
        }
        if (panoRef.current) {
          panoRef.current.setPosition({ lat: location.lat, lng: location.lng });
        }

        setStatus('ready');
      })
      .catch((e: any) => {
        if (cancelled) return;
        setStatus('error');
        setError(e?.message || 'Failed to initialize Google pane.');
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey, hasKey, isOpen, location?.lat, location?.lng, location?.title, isOpen, location]);

  if (!isOpen) return null;

  const openGoogleMaps = () => {
    if (!location) return;
    const url = `https://www.google.com/maps?q=${location.lat},${location.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const openStreetView = () => {
    if (!location) return;
    const url = `https://www.google.com/maps/@?api=1&map_action=pano&viewpoint=${location.lat},${location.lng}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-[560px] z-[999999] bg-gray-950 border-l border-gray-800 shadow-2xl">
      <div className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="min-w-0">
          <div className="text-white font-semibold truncate">{location?.title ?? 'Google Pane'}</div>
          <div className="text-xs text-gray-500 truncate">{location?.subtitle ?? `${location?.lat ?? ''}, ${location?.lng ?? ''}`}</div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTogglePin}
            disabled={!onTogglePin}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border flex items-center gap-2 ${
              pinned
                ? 'bg-cyan-600 text-white border-cyan-500'
                : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
            } ${!onTogglePin ? 'opacity-50 cursor-not-allowed' : ''}`}
            title={pinned ? 'Unpin pane' : 'Pin pane to this location'}
          >
            <PinIcon className="w-4 h-4" />
            {pinned ? 'Pinned' : 'Pin'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close pane"
          >
            <X className="w-5 h-5 text-gray-300" />
          </button>
        </div>
      </div>

      <div className="p-3 border-b border-gray-800 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab('map')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${
            tab === 'map'
              ? 'bg-cyan-600 text-white border-cyan-500'
              : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
          }`}
        >
          <MapIcon className="w-4 h-4" />
          Map
        </button>
        <button
          type="button"
          onClick={() => setTab('streetview')}
          className={`px-3 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2 ${
            tab === 'streetview'
              ? 'bg-cyan-600 text-white border-cyan-500'
              : 'bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          Street View
        </button>

        <button
          type="button"
          onClick={onOpenKeySettings}
          className="ml-auto px-3 py-2 rounded-lg text-sm font-semibold border bg-gray-900 text-gray-200 border-gray-700 hover:bg-gray-800 flex items-center gap-2"
          title="Set Google API key"
        >
          <KeyRound className="w-4 h-4" />
          Key
        </button>
      </div>

      {!hasKey && (
        <div className="p-4">
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 text-sm text-gray-300 space-y-3">
            <div className="font-semibold text-white">Google key required</div>
            <div className="text-gray-400">
              To embed Google Maps/Street View, add your own Google Maps Platform API key.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onOpenKeySettings}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-semibold"
              >
                Add Key
              </button>
              <button
                type="button"
                onClick={openGoogleMaps}
                className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Google Maps
              </button>
              <button
                type="button"
                onClick={openStreetView}
                className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg font-semibold flex items-center gap-2"
              >
                <ExternalLink className="w-4 h-4" />
                Open Street View
              </button>
            </div>
          </div>
        </div>
      )}

      {hasKey && (
        <div className="h-[calc(100vh-120px)]">
          {status === 'error' && (
            <div className="p-4">
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 text-sm text-red-200">
                {error ?? 'Failed to load Google Maps.'}
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={openGoogleMaps}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Google Maps
                </button>
                <button
                  type="button"
                  onClick={openStreetView}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg font-semibold flex items-center gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open Street View
                </button>
              </div>
            </div>
          )}

          {status !== 'error' && (
            <>
              <div className={`${tab === 'map' ? 'block' : 'hidden'} w-full h-full`}>
                <div ref={mapDivRef} className="w-full h-full" />
              </div>
              <div className={`${tab === 'streetview' ? 'block' : 'hidden'} w-full h-full`}>
                <div ref={panoDivRef} className="w-full h-full" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
});


