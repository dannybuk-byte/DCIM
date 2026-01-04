import { useEffect, useState } from 'react';
import { Shield, Cloud, Wifi, WifiOff, CheckCircle, AlertCircle } from 'lucide-react';
import { getProvidersStatus, getProviderDisplayName, getPrivacyLevel, type AIProviderStatus } from '../config/ai';

export const AIStatusIndicator = () => {
  const [status, setStatus] = useState<AIProviderStatus[]>([]);
  const [activeProvider, setActiveProvider] = useState<AIProviderStatus | null>(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const checkStatus = async () => {
      const providers = await getProvidersStatus();
      setStatus(providers);
      
      // Find first available provider (priority order)
      const active = providers.find(p => p.available);
      setActiveProvider(active || providers[providers.length - 1]); // Fallback to last (external)
    };

    checkStatus();
    
    // Recheck every 30 seconds
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  if (!activeProvider) return null;

  const isLocal = activeProvider.provider === 'ollama' || activeProvider.provider === 'anyway';
  const privacyLevel = getPrivacyLevel(activeProvider.provider);

  return (
    <div className="relative">
      {/* Compact indicator */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
          transition-all duration-200 hover:shadow-md
          ${isLocal 
            ? 'bg-green-50 text-green-800 border border-green-200 hover:bg-green-100' 
            : 'bg-orange-50 text-orange-800 border border-orange-200 hover:bg-orange-100'
          }
        `}
      >
        {isLocal ? (
          <Shield className="w-4 h-4" />
        ) : (
          <Cloud className="w-4 h-4" />
        )}
        
        <span className="hidden sm:inline">
          {getProviderDisplayName(activeProvider.provider)}
        </span>
        
        {isLocal ? (
          <CheckCircle className="w-3 h-3 text-green-600" />
        ) : (
          <AlertCircle className="w-3 h-3 text-orange-600" />
        )}
      </button>

      {/* Expanded status panel */}
      {expanded && (
        <div className="absolute top-full right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-50">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">AI Provider Status</h3>
              <p className="text-xs text-gray-500 mt-1">
                Local AI prioritized for privacy
              </p>
            </div>
            <button
              onClick={() => setExpanded(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>

          {/* Current provider highlight */}
          <div className={`
            mb-4 p-3 rounded-lg
            ${isLocal ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}
          `}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-sm">
                {isLocal ? '✓ Active (Local)' : '⚠ Active (External)'}
              </span>
              {activeProvider.latency && (
                <span className="text-xs text-gray-600">
                  {activeProvider.latency}ms
                </span>
              )}
            </div>
            <p className="text-sm">
              {getProviderDisplayName(activeProvider.provider)}
            </p>
            <div className="mt-2 flex items-center gap-2">
              {isLocal ? <WifiOff className="w-3 h-3" /> : <Wifi className="w-3 h-3" />}
              <span className="text-xs">
                {isLocal ? 'Works offline' : 'Requires internet'}
              </span>
            </div>
          </div>

          {/* All providers status */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-700 mb-2">All Providers:</p>
            {status.map((provider) => (
              <div
                key={provider.provider}
                className="flex items-center justify-between p-2 bg-gray-50 rounded"
              >
                <div className="flex items-center gap-2">
                  {provider.provider === 'ollama' && <Shield className="w-4 h-4 text-green-600" />}
                  {provider.provider === 'anyway' && <Shield className="w-4 h-4 text-blue-600" />}
                  {provider.provider === 'cloudflare-worker' && <Cloud className="w-4 h-4 text-orange-600" />}
                  
                  <span className="text-sm">
                    {getProviderDisplayName(provider.provider)}
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  {provider.available ? (
                    <>
                      <CheckCircle className="w-3 h-3 text-green-600" />
                      <span className="text-xs text-green-600">Available</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3 h-3 text-gray-400" />
                      <span className="text-xs text-gray-400">Unavailable</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Privacy notice */}
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-start gap-2">
              <Shield className={`w-4 h-4 mt-0.5 ${privacyLevel === 'high' ? 'text-green-600' : 'text-orange-600'}`} />
              <div>
                <p className="text-xs font-medium text-gray-700">
                  Privacy Level: {privacyLevel === 'high' ? 'High' : 'Low'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {privacyLevel === 'high' 
                    ? 'Your queries never leave this machine. Perfect for sensitive organizing data.'
                    : 'Queries sent to external service. Consider installing local AI for complete privacy.'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Setup link for non-local users */}
          {!isLocal && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-900 font-medium mb-2">
                Want complete privacy?
              </p>
              <p className="text-xs text-blue-700 mb-3">
                Install Ollama to run AI locally. Your organizing data will never leave your machine.
              </p>
              <a
                href="https://ollama.ai/download"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
              >
                Download Ollama
              </a>
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // Open local setup guide
                  window.open('/LOCAL_AI_SETUP_GUIDE.md', '_blank');
                }}
                className="inline-block ml-2 px-3 py-1.5 border border-blue-600 text-blue-600 text-xs rounded hover:bg-blue-50 transition-colors"
              >
                Setup Guide
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

