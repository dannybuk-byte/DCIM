import { memo, useEffect, useState } from 'react';
import { KeyRound, ExternalLink, AlertTriangle } from 'lucide-react';
import { FullscreenOverlay } from './FullscreenOverlay';
import { db } from '../../db/database';

type SettingsKey = 'googleMapsApiKey';

async function getSetting<T>(key: SettingsKey, fallback: T): Promise<T> {
  const row = await db.settings.get(key);
  if (!row) return fallback;
  return row.value as T;
}

async function setSetting<T>(key: SettingsKey, value: T): Promise<void> {
  await db.settings.put({ key, value });
}

export const GoogleKeySettingsModal = memo(function GoogleKeySettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [googleKey, setGoogleKey] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!isOpen) return;
    (async () => {
      const key = await getSetting<string>('googleMapsApiKey', '');
      if (!cancelled) {
        setGoogleKey(key);
        setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const save = async () => {
    await setSetting('googleMapsApiKey', googleKey.trim());
    onClose();
  };

  return (
    <FullscreenOverlay isOpen={isOpen} onClose={onClose} title="Map Providers: OSM + Google (Optional)">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <KeyRound className="w-5 h-5 text-cyan-400 mt-0.5" />
            <div className="flex-1">
              <div className="text-lg font-semibold text-white">Google API Key (Optional)</div>
              <div className="text-sm text-gray-400 mt-1">
                You can **store your own Google Maps Platform key** to enable Google-powered integrations.
                We do **not** load Google tiles into MapLibre (ToS); Google features would use Google’s own embeds/renderers.
              </div>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <label className="block text-sm font-medium text-gray-300">Google Maps Platform API key</label>
          <input
            type="password"
            value={googleKey}
            onChange={(e) => setGoogleKey(e.target.value)}
            placeholder="AIza…"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
          <div className="text-xs text-gray-500">
            Stored locally in IndexedDB (Dexie) under `settings.googleMapsApiKey`.
          </div>

          <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 text-sm text-yellow-200 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-yellow-300 mt-0.5" />
            <div>
              Use a restricted key (HTTP referrers). Google usage may incur cost depending on your plan.
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={save}
              disabled={!loaded}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 text-white rounded-lg font-semibold"
            >
              Save
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => window.open('https://developers.google.com/maps/documentation/javascript/get-api-key', '_blank', 'noopener,noreferrer')}
              className="ml-auto px-5 py-2.5 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white rounded-lg font-semibold flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              Get a Key
            </button>
          </div>
        </div>
      </div>
    </FullscreenOverlay>
  );
});


