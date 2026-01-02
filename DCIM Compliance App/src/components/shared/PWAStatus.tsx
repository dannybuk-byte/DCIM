/**
 * PWA Status Component
 * 
 * Compact indicator showing:
 * - Online/Offline status
 * - Install button (when available)
 * - Update notification
 * - Cache statistics
 */

import { memo, useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Download, 
  RefreshCw, 
  Database, 
  X,
  CheckCircle2,
  AlertCircle,
  HardDrive
} from 'lucide-react';
import { usePWA, formatBytes } from '../../hooks/usePWA';

interface PWAStatusProps {
  compact?: boolean;
}

export const PWAStatus = memo(function PWAStatus({ compact = true }: PWAStatusProps) {
  const { 
    isInstallable, 
    isInstalled, 
    isOnline, 
    isUpdateAvailable, 
    install, 
    updateServiceWorker,
    clearCache,
    cacheStats 
  } = usePWA();
  
  const [showDetails, setShowDetails] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  const handleInstall = async () => {
    await install();
  };

  const handleClearCache = async () => {
    setIsClearing(true);
    await clearCache();
    setIsClearing(false);
  };

  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {/* Online/Offline indicator */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium transition-colors ${
            isOnline
              ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
              : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 animate-pulse'
          }`}
          title={isOnline ? 'Online - Click for details' : 'Offline - Using cached data'}
        >
          {isOnline ? <Wifi size={10} /> : <WifiOff size={10} />}
          <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
        </button>

        {/* Install button */}
        {isInstallable && (
          <button
            onClick={handleInstall}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            title="Install as app"
          >
            <Download size={10} />
            <span className="hidden sm:inline">Install</span>
          </button>
        )}

        {/* Installed badge */}
        {isInstalled && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-500/20 text-purple-400">
            <CheckCircle2 size={10} />
            <span className="hidden sm:inline">PWA</span>
          </span>
        )}

        {/* Update available */}
        {isUpdateAvailable && (
          <button
            onClick={updateServiceWorker}
            className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors animate-pulse"
            title="Update available - Click to refresh"
          >
            <RefreshCw size={10} />
            <span className="hidden sm:inline">Update</span>
          </button>
        )}

        {/* Details popup */}
        {showDetails && (
          <div className="absolute top-full right-0 mt-1 w-64 bg-[#0d1219] border border-[#1e293b] rounded-lg shadow-xl z-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[#e8eef6]">PWA Status</span>
              <button 
                onClick={() => setShowDetails(false)}
                className="text-[#5a6d8a] hover:text-[#e8eef6]"
              >
                <X size={14} />
              </button>
            </div>

            {/* Status items */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#5a6d8a]">Connection</span>
                <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
                  {isOnline ? 'Online' : 'Offline'}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-[#5a6d8a]">Installation</span>
                <span className={isInstalled ? 'text-purple-400' : 'text-[#5a6d8a]'}>
                  {isInstalled ? 'Installed' : isInstallable ? 'Available' : 'Browser'}
                </span>
              </div>

              {cacheStats && (
                <>
                  <div className="border-t border-[#1e293b] pt-2 mt-2">
                    <div className="flex items-center gap-1 text-[#5a6d8a] mb-1">
                      <Database size={10} />
                      <span>Cache Storage</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#5a6d8a]">Total Size</span>
                      <span className="text-cyan-400">{formatBytes(cacheStats.totalSize)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#5a6d8a]">Entries</span>
                      <span className="text-[#e8eef6]">{cacheStats.entryCount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Individual caches */}
                  {cacheStats.caches.length > 0 && (
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {cacheStats.caches.map(cache => (
                        <div key={cache.name} className="flex items-center justify-between text-[10px]">
                          <span className="text-[#5a6d8a] truncate max-w-[120px]" title={cache.name}>
                            {cache.name.replace(/^workbox-/, '')}
                          </span>
                          <span className="text-[#e8eef6]">
                            {cache.count} • {formatBytes(cache.size)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Clear cache button */}
                  <button
                    onClick={handleClearCache}
                    disabled={isClearing}
                    className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    <HardDrive size={10} />
                    {isClearing ? 'Clearing...' : 'Clear Cache'}
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Full-size version
  return (
    <div className="bg-[#0d1219] border border-[#1e293b] rounded-lg p-4">
      <h3 className="text-sm font-medium text-[#e8eef6] mb-3 flex items-center gap-2">
        <HardDrive size={14} className="text-cyan-400" />
        Progressive Web App
      </h3>

      <div className="grid grid-cols-2 gap-3">
        {/* Connection status */}
        <div className={`p-3 rounded-lg ${isOnline ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi size={16} className="text-green-400" />
            ) : (
              <WifiOff size={16} className="text-red-400" />
            )}
            <div>
              <div className="text-xs font-medium text-[#e8eef6]">
                {isOnline ? 'Online' : 'Offline'}
              </div>
              <div className="text-[10px] text-[#5a6d8a]">
                {isOnline ? 'Connected to network' : 'Using cached data'}
              </div>
            </div>
          </div>
        </div>

        {/* Installation status */}
        <div className={`p-3 rounded-lg ${isInstalled ? 'bg-purple-500/10' : 'bg-[#1e293b]/50'}`}>
          <div className="flex items-center gap-2">
            {isInstalled ? (
              <CheckCircle2 size={16} className="text-purple-400" />
            ) : isInstallable ? (
              <Download size={16} className="text-cyan-400" />
            ) : (
              <AlertCircle size={16} className="text-[#5a6d8a]" />
            )}
            <div>
              <div className="text-xs font-medium text-[#e8eef6]">
                {isInstalled ? 'Installed' : isInstallable ? 'Installable' : 'Browser Mode'}
              </div>
              <div className="text-[10px] text-[#5a6d8a]">
                {isInstalled ? 'Running as PWA' : isInstallable ? 'Click to install' : 'Not installable'}
              </div>
            </div>
          </div>
          {isInstallable && (
            <button
              onClick={handleInstall}
              className="w-full mt-2 px-2 py-1 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 transition-colors"
            >
              Install App
            </button>
          )}
        </div>
      </div>

      {/* Cache stats */}
      {cacheStats && (
        <div className="mt-3 p-3 bg-[#1e293b]/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-[#e8eef6] flex items-center gap-1">
              <Database size={12} className="text-cyan-400" />
              Cache Storage
            </span>
            <span className="text-xs text-cyan-400">{formatBytes(cacheStats.totalSize)}</span>
          </div>
          
          <div className="grid grid-cols-3 gap-2 text-center">
            {cacheStats.caches.slice(0, 3).map(cache => (
              <div key={cache.name} className="bg-[#0d1219] rounded p-2">
                <div className="text-[10px] text-[#5a6d8a] truncate" title={cache.name}>
                  {cache.name.replace(/^workbox-/, '').slice(0, 10)}
                </div>
                <div className="text-xs font-medium text-[#e8eef6]">{cache.count}</div>
              </div>
            ))}
          </div>

          <button
            onClick={handleClearCache}
            disabled={isClearing}
            className="w-full mt-2 flex items-center justify-center gap-1 px-2 py-1.5 rounded text-xs font-medium bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
          >
            <HardDrive size={12} />
            {isClearing ? 'Clearing...' : 'Clear All Caches'}
          </button>
        </div>
      )}

      {/* Update notification */}
      {isUpdateAvailable && (
        <div className="mt-3 p-3 bg-yellow-500/10 rounded-lg">
          <div className="flex items-center gap-2">
            <RefreshCw size={16} className="text-yellow-400 animate-spin" />
            <div className="flex-1">
              <div className="text-xs font-medium text-yellow-400">Update Available</div>
              <div className="text-[10px] text-[#5a6d8a]">A new version is ready</div>
            </div>
            <button
              onClick={updateServiceWorker}
              className="px-3 py-1 rounded text-xs font-medium bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 transition-colors"
            >
              Update Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

export default PWAStatus;

