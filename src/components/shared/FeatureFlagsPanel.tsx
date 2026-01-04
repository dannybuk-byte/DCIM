/**
 * Feature Flags Panel
 * 
 * Safe UI for enabling/disabling cutting-edge capabilities.
 * Shows risk level, description, and current status for each feature.
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  FeatureFlags,
  FEATURE_DESCRIPTIONS,
  loadFeatureFlags,
  saveFeatureFlags,
} from '../../config/featureFlags';
import {
  Shield,
  Zap,
  Brain,
  Users,
  Wifi,
  AlertTriangle,
  CheckCircle,
  Info,
  ToggleLeft,
  ToggleRight,
  RefreshCw,
} from 'lucide-react';

// Group features by category
const FEATURE_CATEGORIES = {
  evidence: {
    title: 'Evidence Integrity',
    icon: Shield,
    features: ['merkleTreeEvidence', 'openTimestamps', 'contentAddressedStorage'] as const,
  },
  visualization: {
    title: 'Visualization',
    icon: Zap,
    features: ['webgpuVisualization', 'cosmographNetworks'] as const,
  },
  ai: {
    title: 'Local AI',
    icon: Brain,
    features: ['localTransformers', 'webLLMInference', 'tensorflowAnomalyDetection'] as const,
  },
  collaboration: {
    title: 'Collaboration',
    icon: Users,
    features: ['p2pCollaboration'] as const,
  },
  offline: {
    title: 'Offline & PWA',
    icon: Wifi,
    features: ['advancedOfflineMode', 'backgroundSync'] as const,
  },
};

const RISK_COLORS = {
  low: 'text-green-400 bg-green-400/10 border-green-400/30',
  medium: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  high: 'text-red-400 bg-red-400/10 border-red-400/30',
};

const RISK_ICONS = {
  low: CheckCircle,
  medium: AlertTriangle,
  high: AlertTriangle,
};

interface FeatureFlagsPanelProps {
  className?: string;
}

export const FeatureFlagsPanel: React.FC<FeatureFlagsPanelProps> = ({ className = '' }) => {
  const [flags, setFlags] = useState<FeatureFlags | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  const loadFlags = useCallback(async () => {
    setLoading(true);
    try {
      const loaded = await loadFeatureFlags();
      setFlags(loaded);
    } catch (error) {
      console.error('Failed to load feature flags:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFlags();
  }, [loadFlags]);

  const toggleFeature = useCallback(async (feature: keyof FeatureFlags) => {
    if (!flags) return;
    
    setSaving(feature);
    try {
      const newValue = !flags[feature];
      await saveFeatureFlags({ [feature]: newValue });
      setFlags(prev => prev ? { ...prev, [feature]: newValue } : prev);
    } catch (error) {
      console.error(`Failed to toggle ${feature}:`, error);
    } finally {
      setSaving(null);
    }
  }, [flags]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-8 ${className}`}>
        <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
        <span className="ml-2 text-gray-400">Loading feature flags...</span>
      </div>
    );
  }

  if (!flags) {
    return (
      <div className={`p-4 bg-red-900/20 border border-red-500/30 rounded-lg ${className}`}>
        <p className="text-red-400">Failed to load feature flags. Please refresh.</p>
      </div>
    );
  }

  const enabledCount = Object.values(flags).filter(Boolean).length;
  const totalCount = Object.keys(flags).length;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Cutting-Edge Capabilities
          </h3>
          <p className="text-sm text-gray-400 mt-1">
            Enable experimental features. All changes take effect immediately.
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-bold text-cyan-400">{enabledCount}</span>
          <span className="text-gray-500">/{totalCount}</span>
          <p className="text-xs text-gray-500">enabled</p>
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-blue-300">
          <p className="font-medium">Antifragile Design</p>
          <p className="text-blue-400/80 mt-1">
            All features fail gracefully. If an enhancement fails, your app continues working with existing functionality.
            Data is never lost.
          </p>
        </div>
      </div>

      {/* Feature categories */}
      {Object.entries(FEATURE_CATEGORIES).map(([categoryKey, category]) => {
        const CategoryIcon = category.icon;
        const categoryEnabled = category.features.filter(f => flags[f]).length;
        
        return (
          <div key={categoryKey} className="border border-gray-700 rounded-lg overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-800/50">
              <div className="flex items-center gap-2">
                <CategoryIcon className="w-5 h-5 text-cyan-400" />
                <span className="font-medium text-white">{category.title}</span>
              </div>
              <span className="text-sm text-gray-400">
                {categoryEnabled}/{category.features.length} enabled
              </span>
            </div>

            {/* Features */}
            <div className="divide-y divide-gray-800">
              {category.features.map(featureKey => {
                const feature = FEATURE_DESCRIPTIONS[featureKey];
                const isEnabled = flags[featureKey];
                const isSaving = saving === featureKey;
                const RiskIcon = RISK_ICONS[feature.risk];

                return (
                  <div
                    key={featureKey}
                    className="flex items-start gap-4 p-4 hover:bg-gray-800/30 transition-colors"
                  >
                    {/* Toggle */}
                    <button
                      onClick={() => toggleFeature(featureKey)}
                      disabled={isSaving}
                      className={`flex-shrink-0 mt-1 transition-colors ${
                        isSaving ? 'opacity-50 cursor-wait' : 'cursor-pointer'
                      }`}
                      aria-label={`Toggle ${feature.name}`}
                    >
                      {isEnabled ? (
                        <ToggleRight className="w-8 h-8 text-cyan-400" />
                      ) : (
                        <ToggleLeft className="w-8 h-8 text-gray-500" />
                      )}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-medium ${isEnabled ? 'text-white' : 'text-gray-400'}`}>
                          {feature.name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded border ${RISK_COLORS[feature.risk]}`}>
                          <RiskIcon className="w-3 h-3 inline mr-1" />
                          {feature.risk} risk
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-1">{feature.description}</p>
                    </div>

                    {/* Status indicator */}
                    <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${
                      isEnabled ? 'bg-green-400' : 'bg-gray-600'
                    }`} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Quick actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-700">
        <button
          onClick={async () => {
            // Enable all low-risk features
            const lowRisk = Object.entries(FEATURE_DESCRIPTIONS)
              .filter(([_, desc]) => desc.risk === 'low')
              .map(([key]) => key as keyof FeatureFlags);
            
            const updates = Object.fromEntries(lowRisk.map(k => [k, true]));
            await saveFeatureFlags(updates);
            loadFlags();
          }}
          className="px-4 py-2 bg-green-600/20 border border-green-500/30 rounded-lg text-green-400 text-sm hover:bg-green-600/30 transition-colors"
        >
          Enable All Low Risk
        </button>
        <button
          onClick={async () => {
            // Disable all features
            const updates = Object.fromEntries(
              Object.keys(FEATURE_DESCRIPTIONS).map(k => [k, false])
            );
            await saveFeatureFlags(updates as Partial<FeatureFlags>);
            loadFlags();
          }}
          className="px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-gray-400 text-sm hover:bg-gray-700 transition-colors"
        >
          Disable All
        </button>
      </div>
    </div>
  );
};

export default FeatureFlagsPanel;

