/**
 * Enhanced Capabilities Status Panel
 * 
 * Shows real-time status of all cutting-edge features:
 * - Evidence integrity (Merkle tree, OpenTimestamps, CID)
 * - GPU capabilities (WebGPU, WebGL fallback)
 * - Local AI (Transformers.js, WebLLM)
 * - PWA status (offline, service worker)
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Shield,
  Cpu,
  Brain,
  Wifi,
  WifiOff,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { getEnhancementStatus } from '../../utils/enhancedEvidence';
import { detectGPUCapabilities, GPUCapabilities } from '../../utils/webGPUDetection';
import { getModelStatus as getTransformersStatus } from '../../ai/localTransformers';
import { getWebLLMState, isWebLLMAvailable } from '../../ai/webLLMProvider';
import { loadFeatureFlags, FeatureFlags } from '../../config/featureFlags';

interface CapabilitiesStatus {
  evidence: {
    merkle: { enabled: boolean; nodeCount: number };
    timestamps: { enabled: boolean; proofCount: number; pendingCount: number };
    contentAddressed: { enabled: boolean };
  };
  gpu: GPUCapabilities | null;
  localAI: {
    transformers: { enabled: boolean; modelsLoaded: number };
    webllm: { enabled: boolean; available: boolean; state: string; modelKey: string | null };
  };
  pwa: {
    serviceWorker: boolean;
    offline: boolean;
  };
  flags: FeatureFlags | null;
}

interface Props {
  compact?: boolean;
  className?: string;
}

export const EnhancedCapabilitiesStatus: React.FC<Props> = ({ compact = false, className = '' }) => {
  const [status, setStatus] = useState<CapabilitiesStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const [evidenceStatus, gpuCaps, transformersState, webllmState, webllmAvailable, flags] = await Promise.all([
        getEnhancementStatus(),
        detectGPUCapabilities(),
        Promise.resolve(getTransformersStatus()),
        Promise.resolve(getWebLLMState()),
        isWebLLMAvailable(),
        loadFeatureFlags(),
      ]);

      // Check PWA status
      const swRegistration = await navigator.serviceWorker?.getRegistration();
      const isOffline = !navigator.onLine;

      // Count loaded transformer models
      const transformersLoaded = Object.values(transformersState).filter(s => s === 'ready').length;

      setStatus({
        evidence: {
          merkle: evidenceStatus.merkleTree,
          timestamps: evidenceStatus.openTimestamps,
          contentAddressed: evidenceStatus.contentAddressed,
        },
        gpu: gpuCaps,
        localAI: {
          transformers: { enabled: flags.localTransformers, modelsLoaded: transformersLoaded },
          webllm: {
            enabled: flags.webLLMInference,
            available: webllmAvailable,
            state: webllmState.state,
            modelKey: webllmState.modelKey,
          },
        },
        pwa: {
          serviceWorker: !!swRegistration?.active,
          offline: isOffline,
        },
        flags,
      });
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load capabilities status:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();

    // Listen for online/offline changes
    const handleOnline = () => loadStatus();
    const handleOffline = () => loadStatus();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadStatus]);

  if (loading || !status) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <RefreshCw className="w-5 h-5 text-cyan-400 animate-spin" />
      </div>
    );
  }

  const StatusIcon = ({ active, warning }: { active: boolean; warning?: boolean }) =>
    active ? (
      <CheckCircle className="w-4 h-4 text-green-400" />
    ) : warning ? (
      <AlertCircle className="w-4 h-4 text-yellow-400" />
    ) : (
      <XCircle className="w-4 h-4 text-gray-500" />
    );

  if (compact) {
    // Compact view - just icons
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <div className="flex items-center gap-1" title="Evidence Integrity">
          <Shield className="w-4 h-4 text-cyan-400" />
          <StatusIcon active={status.evidence.merkle.enabled || status.evidence.timestamps.enabled} />
        </div>
        <div className="flex items-center gap-1" title={`GPU: ${status.gpu?.recommendedBackend.toUpperCase()}`}>
          <Cpu className="w-4 h-4 text-purple-400" />
          <StatusIcon active={status.gpu?.webgpu.supported ?? false} warning={status.gpu?.webgl2.supported ?? false} />
        </div>
        <div className="flex items-center gap-1" title="Local AI">
          <Brain className="w-4 h-4 text-pink-400" />
          <StatusIcon active={status.localAI.webllm.state === 'ready' || status.localAI.transformers.modelsLoaded > 0} />
        </div>
        <div className="flex items-center gap-1" title={status.pwa.offline ? 'Offline' : 'Online'}>
          {status.pwa.offline ? (
            <WifiOff className="w-4 h-4 text-yellow-400" />
          ) : (
            <Wifi className="w-4 h-4 text-green-400" />
          )}
          <StatusIcon active={status.pwa.serviceWorker} />
        </div>
      </div>
    );
  }

  // Full view
  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          Enhanced Capabilities
        </h3>
        <button
          onClick={loadStatus}
          className="p-1 text-gray-400 hover:text-white transition-colors"
          title="Refresh status"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Evidence Integrity */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-400">
            <Shield className="w-4 h-4" />
            Evidence Integrity
          </div>
          <div className="grid grid-cols-3 gap-2 pl-6">
            <div className="flex items-center gap-2 text-sm">
              <StatusIcon active={status.evidence.merkle.enabled} />
              <span className="text-gray-400">
                Merkle Tree
                {status.evidence.merkle.enabled && (
                  <span className="text-gray-500 ml-1">({status.evidence.merkle.nodeCount})</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <StatusIcon active={status.evidence.timestamps.enabled} />
              <span className="text-gray-400">
                Timestamps
                {status.evidence.timestamps.pendingCount > 0 && (
                  <span className="text-yellow-400 ml-1">
                    <Clock className="w-3 h-3 inline" /> {status.evidence.timestamps.pendingCount}
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <StatusIcon active={status.evidence.contentAddressed.enabled} />
              <span className="text-gray-400">CID</span>
            </div>
          </div>
        </div>

        {/* GPU Capabilities */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-400">
            <Cpu className="w-4 h-4" />
            GPU Backend
          </div>
          <div className="pl-6 text-sm">
            <div className="flex items-center gap-2">
              <StatusIcon active={status.gpu?.webgpu.supported ?? false} />
              <span className="text-gray-400">
                WebGPU
                {status.gpu?.webgpu.supported && status.gpu?.webgpu.vendor && (
                  <span className="text-gray-500 ml-1">({status.gpu.webgpu.vendor})</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StatusIcon active={status.gpu?.webgl2.supported ?? false} />
              <span className="text-gray-400">
                WebGL2 Fallback
                {!status.gpu?.webgpu.supported && status.gpu?.webgl2.supported && (
                  <span className="text-green-400 ml-1">(active)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Local AI */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-pink-400">
            <Brain className="w-4 h-4" />
            Local AI
          </div>
          <div className="pl-6 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <StatusIcon active={status.localAI.transformers.modelsLoaded > 0} warning={status.localAI.transformers.enabled} />
              <span className="text-gray-400">
                Transformers.js
                {status.localAI.transformers.modelsLoaded > 0 && (
                  <span className="text-green-400 ml-1">({status.localAI.transformers.modelsLoaded} models)</span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon active={status.localAI.webllm.state === 'ready'} warning={status.localAI.webllm.enabled} />
              <span className="text-gray-400">
                WebLLM
                {status.localAI.webllm.state === 'ready' && status.localAI.webllm.modelKey && (
                  <span className="text-green-400 ml-1">({status.localAI.webllm.modelKey})</span>
                )}
                {status.localAI.webllm.state === 'loading' && (
                  <span className="text-yellow-400 ml-1">(loading...)</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* PWA / Offline */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-green-400">
            {status.pwa.offline ? <WifiOff className="w-4 h-4" /> : <Wifi className="w-4 h-4" />}
            Connectivity
          </div>
          <div className="pl-6 text-sm space-y-1">
            <div className="flex items-center gap-2">
              <StatusIcon active={status.pwa.serviceWorker} />
              <span className="text-gray-400">Service Worker</span>
            </div>
            <div className="flex items-center gap-2">
              <StatusIcon active={!status.pwa.offline} warning={status.pwa.offline} />
              <span className={status.pwa.offline ? 'text-yellow-400' : 'text-gray-400'}>
                {status.pwa.offline ? 'Offline Mode' : 'Online'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="mt-4 pt-3 border-t border-gray-800 text-xs text-gray-500">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default EnhancedCapabilitiesStatus;

