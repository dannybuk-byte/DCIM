/**
 * HeaderCapabilitiesBar - Prominent status indicators for enhanced capabilities
 * Shows AI provider, GPU acceleration, offline status with quick toggles
 */

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Cpu, 
  Cloud, 
  CloudOff, 
  Zap, 
  Shield, 
  Brain, 
  Wifi, 
  WifiOff,
  ChevronDown,
  Settings,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { loadFeatureFlags, saveFeatureFlags, FeatureFlags, DEFAULT_FEATURE_FLAGS } from '../../config/featureFlags';
import { checkWebGPUSupport } from '../../utils/webGPUDetection';
import { Tooltip } from './Tooltip';

interface CapabilityStatus {
  label: string;
  status: 'active' | 'inactive' | 'degraded' | 'checking';
  icon: React.ReactNode;
  color: string;
  detail?: string;
}

interface HeaderCapabilitiesBarProps {
  onOpenSettings?: () => void;
}

export const HeaderCapabilitiesBar: React.FC<HeaderCapabilitiesBarProps> = ({ onOpenSettings }) => {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [expanded, setExpanded] = useState(false);

  // Load feature flags and check WebGPU support on mount
  useEffect(() => {
    async function init() {
      const loadedFlags = await loadFeatureFlags();
      setFlags(loadedFlags);
      const supported = await checkWebGPUSupport();
      setWebGPUSupported(supported);
    }
    init();
  }, []);

  // Monitor online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Refresh flags periodically
  useEffect(() => {
    const interval = setInterval(async () => {
      const loadedFlags = await loadFeatureFlags();
      setFlags(loadedFlags);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleFeature = useCallback(async (flag: keyof FeatureFlags) => {
    const newValue = !flags[flag];
    await saveFeatureFlags({ [flag]: newValue });
    setFlags(prev => ({ ...prev, [flag]: newValue }));
  }, [flags]);

  // Determine AI provider status (using existing featureFlags API names)
  const getAIStatus = (): CapabilityStatus => {
    const hasLocalAI = flags.webLLMInference || flags.localTransformers;
    const hasCloudAI = true; // Cloudflare Worker is always available
    
    if (hasLocalAI && isOnline) {
      return {
        label: 'AI: Hybrid',
        status: 'active',
        icon: <Brain className="w-3 h-3" />,
        color: 'text-purple-400 bg-purple-900/50',
        detail: 'Local + Cloud AI active',
      };
    } else if (hasLocalAI) {
      return {
        label: 'AI: Local',
        status: 'active',
        icon: <Cpu className="w-3 h-3" />,
        color: 'text-green-400 bg-green-900/50',
        detail: 'Privacy-first local AI',
      };
    } else if (isOnline) {
      return {
        label: 'AI: Cloud',
        status: 'active',
        icon: <Cloud className="w-3 h-3" />,
        color: 'text-cyan-400 bg-cyan-900/50',
        detail: 'Cloudflare Worker AI',
      };
    } else {
      return {
        label: 'AI: Offline',
        status: 'degraded',
        icon: <CloudOff className="w-3 h-3" />,
        color: 'text-yellow-400 bg-yellow-900/50',
        detail: 'Enable local AI for offline use',
      };
    }
  };

  // GPU Status
  const getGPUStatus = (): CapabilityStatus => {
    if (webGPUSupported === null) {
      return {
        label: 'GPU',
        status: 'checking',
        icon: <Zap className="w-3 h-3 animate-pulse" />,
        color: 'text-gray-400 bg-gray-800',
        detail: 'Checking WebGPU...',
      };
    }
    if (webGPUSupported && flags.webgpuVisualization) {
      return {
        label: 'GPU',
        status: 'active',
        icon: <Zap className="w-3 h-3" />,
        color: 'text-amber-400 bg-amber-900/50',
        detail: 'WebGPU acceleration active',
      };
    }
    if (webGPUSupported) {
      return {
        label: 'GPU',
        status: 'inactive',
        icon: <Zap className="w-3 h-3" />,
        color: 'text-gray-500 bg-gray-800',
        detail: 'WebGPU available (disabled)',
      };
    }
    return {
      label: 'GPU',
      status: 'degraded',
      icon: <AlertCircle className="w-3 h-3" />,
      color: 'text-gray-600 bg-gray-800/50',
      detail: 'WebGPU not supported',
    };
  };

  // Evidence Integrity Status
  const getEvidenceStatus = (): CapabilityStatus => {
    const hasEnhanced = flags.merkleTreeEvidence || flags.openTimestamps;
    if (hasEnhanced) {
      return {
        label: 'Evidence',
        status: 'active',
        icon: <Shield className="w-3 h-3" />,
        color: 'text-emerald-400 bg-emerald-900/50',
        detail: 'Merkle + OTS verification',
      };
    }
    return {
      label: 'Evidence',
      status: 'inactive',
      icon: <Shield className="w-3 h-3" />,
      color: 'text-gray-500 bg-gray-800',
      detail: 'Basic SHA-256 hashing',
    };
  };

  // PWA/Offline Status
  const getPWAStatus = (): CapabilityStatus => {
    if (flags.advancedOfflineMode && !isOnline) {
      return {
        label: 'Offline',
        status: 'active',
        icon: <WifiOff className="w-3 h-3" />,
        color: 'text-blue-400 bg-blue-900/50',
        detail: 'Working offline (cached)',
      };
    }
    if (flags.advancedOfflineMode) {
      return {
        label: 'PWA',
        status: 'active',
        icon: <Wifi className="w-3 h-3" />,
        color: 'text-blue-400 bg-blue-900/50',
        detail: 'Offline-ready',
      };
    }
    return {
      label: 'Online',
      status: 'inactive',
      icon: isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />,
      color: isOnline ? 'text-gray-500 bg-gray-800' : 'text-red-400 bg-red-900/50',
      detail: isOnline ? 'No offline support' : 'No connection',
    };
  };

  const aiStatus = getAIStatus();
  const gpuStatus = getGPUStatus();
  const evidenceStatus = getEvidenceStatus();
  const pwaStatus = getPWAStatus();

  return (
    <div className="relative">
      {/* Compact status bar */}
      <div className="flex items-center gap-1 text-[10px]">
        {/* AI Status Badge */}
        <Tooltip content={aiStatus.detail || ''}>
          <button
            onClick={() => setExpanded(!expanded)}
            className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${aiStatus.color} transition-all hover:opacity-80`}
          >
            {aiStatus.icon}
            <span className="font-medium">{aiStatus.label}</span>
            <ChevronDown className={`w-2 h-2 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </Tooltip>

        {/* GPU Status */}
        <Tooltip content={gpuStatus.detail || ''}>
          <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${gpuStatus.color}`}>
            {gpuStatus.icon}
            <span className="font-medium">{gpuStatus.label}</span>
          </span>
        </Tooltip>

        {/* Evidence Status */}
        <Tooltip content={evidenceStatus.detail || ''}>
          <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${evidenceStatus.color}`}>
            {evidenceStatus.icon}
          </span>
        </Tooltip>

        {/* PWA Status */}
        <Tooltip content={pwaStatus.detail || ''}>
          <span className={`px-1.5 py-0.5 rounded flex items-center gap-1 ${pwaStatus.color}`}>
            {pwaStatus.icon}
          </span>
        </Tooltip>
      </div>

      {/* Expanded quick toggles panel */}
      {expanded && (
        <div 
          className="absolute top-full right-0 mt-1 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl z-[100] p-3"
          style={{ boxShadow: '0 4px 30px rgba(0,0,0,0.5)' }}
        >
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              <Sparkles className="w-3 h-3 text-purple-400" />
              Enhanced Capabilities
            </h4>
            <button
              onClick={onOpenSettings}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800"
              title="Open full settings"
            >
              <Settings className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-2">
            {/* Local AI Toggle */}
            <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" />
                <div>
                  <div className="text-[11px] font-medium text-white">Local AI (WebLLM)</div>
                  <div className="text-[9px] text-gray-400">Privacy-first browser LLM</div>
                </div>
              </div>
              <button
                onClick={() => handleToggleFeature('webLLMInference')}
                className={`w-10 h-5 rounded-full transition-colors ${
                  flags.webLLMInference ? 'bg-purple-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                  flags.webLLMInference ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* WebGPU Toggle */}
            <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400" />
                <div>
                  <div className="text-[11px] font-medium text-white">GPU Acceleration</div>
                  <div className="text-[9px] text-gray-400">
                    {webGPUSupported ? 'WebGPU available' : 'Not supported'}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleToggleFeature('webgpuVisualization')}
                disabled={!webGPUSupported}
                className={`w-10 h-5 rounded-full transition-colors ${
                  flags.webgpuVisualization && webGPUSupported ? 'bg-amber-600' : 'bg-gray-600'
                } ${!webGPUSupported ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                  flags.webgpuVisualization && webGPUSupported ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* Evidence Integrity Toggle */}
            <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <div>
                  <div className="text-[11px] font-medium text-white">Enhanced Evidence</div>
                  <div className="text-[9px] text-gray-400">Merkle trees + timestamps</div>
                </div>
              </div>
              <button
                onClick={() => {
                  handleToggleFeature('merkleTreeEvidence');
                  handleToggleFeature('openTimestamps');
                }}
                className={`w-10 h-5 rounded-full transition-colors ${
                  flags.merkleTreeEvidence || flags.openTimestamps ? 'bg-emerald-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                  flags.merkleTreeEvidence || flags.openTimestamps ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>

            {/* NLP Toggle */}
            <div className="flex items-center justify-between p-2 rounded bg-gray-800/50">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-cyan-400" />
                <div>
                  <div className="text-[11px] font-medium text-white">Local NLP</div>
                  <div className="text-[9px] text-gray-400">Entity recognition & embeddings</div>
                </div>
              </div>
              <button
                onClick={() => handleToggleFeature('localTransformers')}
                className={`w-10 h-5 rounded-full transition-colors ${
                  flags.localTransformers ? 'bg-cyan-600' : 'bg-gray-600'
                }`}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow transform transition-transform ${
                  flags.localTransformers ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-gray-700">
            <button
              onClick={onOpenSettings}
              className="w-full text-center text-[10px] text-cyan-400 hover:text-cyan-300 py-1"
            >
              Open Full Settings →
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

