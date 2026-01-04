/**
 * EnhancedCapabilitiesBanner - PROMINENT banner showing app capabilities
 * This is designed to be OBVIOUS and impossible to miss
 * Now with interactive tooltips, benefit badges, and workflow visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Zap, 
  Brain, 
  Shield, 
  Wifi, 
  WifiOff,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Cpu,
  GitBranch,
  Clock,
  X,
  Settings,
  Check,
  Lock,
  Eye,
  EyeOff,
  Scale,
  MapPin,
  Search,
  FileText,
  Download,
  AlertTriangle,
  Info,
  Workflow,
  ArrowRight,
  Building2,
  Gavel,
} from 'lucide-react';
import { loadFeatureFlags, saveFeatureFlags, FeatureFlags, DEFAULT_FEATURE_FLAGS } from '../config/featureFlags';
import { checkWebGPUSupport } from '../utils/webGPUDetection';

// Benefit tooltips with rich content
const FEATURE_BENEFITS: Record<string, { 
  title: string; 
  benefit: string; 
  organizingUse: string;
  icon: React.ReactNode;
  color: string;
}> = {
  webLLMInference: {
    title: '100% Private AI',
    benefit: 'AI queries never leave your device - no cloud, no logs, no subpoenas',
    organizingUse: 'Search "Amazon broken promises" without OpenAI knowing',
    icon: <EyeOff className="w-4 h-4" />,
    color: 'purple',
  },
  localTransformers: {
    title: 'Smart Document Analysis',
    benefit: 'Auto-extract company names, dates, dollar amounts from documents',
    organizingUse: 'Instantly tag 1000s of SEC filings by company',
    icon: <FileText className="w-4 h-4" />,
    color: 'purple',
  },
  webgpuVisualization: {
    title: '10x Faster Maps',
    benefit: 'GPU renders 11,992 facilities smoothly at 60fps',
    organizingUse: 'Zoom through state data in live presentations',
    icon: <MapPin className="w-4 h-4" />,
    color: 'amber',
  },
  merkleTreeEvidence: {
    title: 'Tamper-Proof Chain',
    benefit: 'Single hash proves entire evidence collection is unmodified',
    organizingUse: 'Corporations cannot claim you altered screenshots',
    icon: <GitBranch className="w-4 h-4" />,
    color: 'emerald',
  },
  openTimestamps: {
    title: 'Court-Ready Proof',
    benefit: 'Bitcoin blockchain proves WHEN you collected evidence',
    organizingUse: 'FRE 902(13)-(14) compliant for legal proceedings',
    icon: <Gavel className="w-4 h-4" />,
    color: 'emerald',
  },
  advancedOfflineMode: {
    title: 'Field Investigation',
    benefit: 'Full app works without internet, syncs when connected',
    organizingUse: 'Collect evidence at remote data center sites',
    icon: <WifiOff className="w-4 h-4" />,
    color: 'blue',
  },
};

export const EnhancedCapabilitiesBanner: React.FC = () => {
  const [flags, setFlags] = useState<FeatureFlags>(DEFAULT_FEATURE_FLAGS);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    async function init() {
      const loadedFlags = await loadFeatureFlags();
      setFlags(loadedFlags);
      const supported = await checkWebGPUSupport();
      setWebGPUSupported(supported);
      
      // Check if previously dismissed (stored in feature flags)
      const { getSettings } = await import('../utils/settingsPersistence');
      const dismissed = await getSettings<boolean>('capabilities-banner-dismissed');
      if (dismissed === true) {
        setIsDismissed(true);
      }
    }
    init();
  }, []);

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

  const handleToggleFeature = useCallback(async (flag: keyof FeatureFlags) => {
    const newValue = !flags[flag];
    await saveFeatureFlags({ [flag]: newValue });
    setFlags(prev => ({ ...prev, [flag]: newValue }));
  }, [flags]);

  const handleDismiss = useCallback(async () => {
    setIsDismissed(true);
    // Persist to IndexedDB (not localStorage per project rules)
    const { saveSettings } = await import('../utils/settingsPersistence');
    await saveSettings('capabilities-banner-dismissed', true);
  }, []);

  const enabledCount = [
    flags.webLLMInference,
    flags.localTransformers,
    flags.webgpuVisualization,
    flags.merkleTreeEvidence,
    flags.openTimestamps,
    flags.advancedOfflineMode,
  ].filter(Boolean).length;

  if (isDismissed) {
    return (
      <button
        onClick={() => setIsDismissed(false)}
        className="fixed top-4 right-4 z-50 px-3 py-2 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-sm font-bold"
      >
        <Sparkles className="w-4 h-4" />
        {enabledCount} Enhanced
      </button>
    );
  }

  return (
    <div className={`fixed top-0 left-0 right-0 z-[9999] bg-gradient-to-r from-slate-900 via-purple-900/50 to-slate-900 border-b border-purple-500/30 shadow-lg transition-all duration-300 ${isExpanded ? '' : 'backdrop-blur-sm'}`}>
      {/* Collapsed Header - Slim bar */}
      <div className={`px-4 flex items-center justify-between transition-all duration-300 ${isExpanded ? 'py-3' : 'py-1.5'}`}>
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 hover:opacity-80 transition-opacity"
        >
          <div className={`rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center transition-all ${isExpanded ? 'w-10 h-10' : 'w-6 h-6'}`}>
            <Sparkles className={`text-white transition-all ${isExpanded ? 'w-6 h-6' : 'w-4 h-4'}`} />
          </div>
          <div>
            <h2 className={`font-bold text-white transition-all ${isExpanded ? 'text-lg' : 'text-sm'}`}>
              Enhanced Capabilities
              {!isExpanded && <span className="ml-2 text-purple-300 font-normal">({enabledCount}/6 active)</span>}
            </h2>
            {isExpanded && (
              <p className="text-xs text-purple-300">
                {enabledCount} of 6 features enabled • Click to configure
              </p>
            )}
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Quick status indicators - always visible */}
          <div className="flex items-center gap-1">
            <StatusPill 
              icon={<Brain className="w-3 h-3" />}
              label={isExpanded ? "AI" : ""}
              active={flags.webLLMInference || flags.localTransformers}
              activeColor="purple"
            />
            <StatusPill 
              icon={<Zap className="w-3 h-3" />}
              label={isExpanded ? "GPU" : ""}
              active={flags.webgpuVisualization && webGPUSupported === true}
              activeColor="amber"
              disabled={webGPUSupported === false}
            />
            <StatusPill 
              icon={<Shield className="w-3 h-3" />}
              label={isExpanded ? "Evidence" : ""}
              active={flags.merkleTreeEvidence || flags.openTimestamps}
              activeColor="emerald"
            />
            <StatusPill 
              icon={isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              label={isExpanded ? "Offline" : ""}
              active={flags.advancedOfflineMode}
              activeColor="blue"
            />
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2 py-1 bg-white/10 hover:bg-white/20 rounded text-white text-xs font-medium flex items-center gap-1 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
            title="Hide banner (floating button to restore)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* Workflow Infographic */}
          <WorkflowInfographic />
          
          {/* Feature Cards Grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* AI Capabilities */}
            <FeatureCard
              title="Local AI Processing"
              description="Run AI models directly in your browser - no data leaves your device"
              icon={<Brain className="w-6 h-6" />}
              color="purple"
              mainBenefit="🔒 100% Private - No cloud logging"
              features={[
                {
                  key: 'webLLMInference',
                  name: 'Browser LLM (WebLLM)',
                  description: 'Phi-3 / Llama models locally',
                  enabled: flags.webLLMInference,
                  onToggle: () => handleToggleFeature('webLLMInference'),
                },
                {
                  key: 'localTransformers',
                  name: 'Local NLP (Transformers.js)',
                  description: 'Entity recognition & embeddings',
                  enabled: flags.localTransformers,
                  onToggle: () => handleToggleFeature('localTransformers'),
                },
              ]}
            />

            {/* GPU & Performance */}
            <FeatureCard
              title="GPU Acceleration"
              description="Hardware-accelerated visualizations and AI inference"
              icon={<Zap className="w-6 h-6" />}
              color="amber"
              mainBenefit="⚡ 10x Faster Maps & Charts"
              features={[
                {
                  key: 'webgpuVisualization',
                  name: 'WebGPU Rendering',
                  description: webGPUSupported ? 'Supported on this device' : 'Not supported',
                  enabled: flags.webgpuVisualization,
                  onToggle: () => handleToggleFeature('webgpuVisualization'),
                  disabled: !webGPUSupported,
                },
              ]}
            />

            {/* Evidence Integrity */}
            <FeatureCard
              title="Evidence Integrity"
              description="Cryptographic proof for legal admissibility"
              icon={<Shield className="w-6 h-6" />}
              color="emerald"
              mainBenefit="⚖️ Court-Ready (FRE 902)"
              features={[
                {
                  key: 'merkleTreeEvidence',
                  name: 'Merkle Tree Chains',
                  description: 'Tamper-evident evidence collections',
                  enabled: flags.merkleTreeEvidence,
                  onToggle: () => handleToggleFeature('merkleTreeEvidence'),
                },
                {
                  key: 'openTimestamps',
                  name: 'OpenTimestamps',
                  description: 'Bitcoin-anchored temporal proofs',
                  enabled: flags.openTimestamps,
                  onToggle: () => handleToggleFeature('openTimestamps'),
                },
                {
                  key: 'advancedOfflineMode',
                  name: 'Offline Mode',
                  description: 'Work without internet connection',
                  enabled: flags.advancedOfflineMode,
                  onToggle: () => handleToggleFeature('advancedOfflineMode'),
                },
              ]}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// Workflow Infographic - Visual explanation of how capabilities work together
const WorkflowInfographic: React.FC = () => {
  const steps = [
    { icon: <Search className="w-5 h-5" />, label: 'SEARCH', desc: '"Amazon broken promises"', capability: 'Local AI', color: 'purple' },
    { icon: <MapPin className="w-5 h-5" />, label: 'VIEW', desc: '847 facilities on map', capability: 'GPU Render', color: 'amber' },
    { icon: <Building2 className="w-5 h-5" />, label: 'DRILL', desc: '20-level nested data', capability: 'GPU + NLP', color: 'amber' },
    { icon: <FileText className="w-5 h-5" />, label: 'COLLECT', desc: 'Screenshot violations', capability: 'Merkle Tree', color: 'emerald' },
    { icon: <Download className="w-5 h-5" />, label: 'EXPORT', desc: 'Court-ready report', capability: 'OpenTimestamps', color: 'emerald' },
  ];

  const colorMap: Record<string, string> = {
    purple: 'bg-purple-500/20 border-purple-500/50 text-purple-300',
    amber: 'bg-amber-500/20 border-amber-500/50 text-amber-300',
    emerald: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300',
  };

  return (
    <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50">
      <div className="flex items-center gap-2 mb-2">
        <Workflow className="w-4 h-4 text-cyan-400" />
        <span className="text-xs font-semibold text-white">How These Capabilities Work Together</span>
      </div>
      <div className="flex items-center justify-between gap-1">
        {steps.map((step, idx) => (
          <React.Fragment key={step.label}>
            <div className="flex-1 text-center group relative">
              <div className={`mx-auto w-10 h-10 rounded-lg border ${colorMap[step.color]} flex items-center justify-center mb-1 transition-transform group-hover:scale-110`}>
                {step.icon}
              </div>
              <div className="text-[10px] font-bold text-white">{step.label}</div>
              <div className="text-[9px] text-gray-400 truncate">{step.desc}</div>
              <div className={`text-[8px] mt-0.5 px-1.5 py-0.5 rounded ${colorMap[step.color]} inline-block`}>
                {step.capability}
              </div>
              
              {/* Hover tooltip */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-gray-900 border border-gray-700 rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                <div className="text-xs font-semibold text-white mb-1">{step.label}: {step.desc}</div>
                <div className="text-[10px] text-gray-400">Uses <span className={`font-bold ${step.color === 'purple' ? 'text-purple-400' : step.color === 'amber' ? 'text-amber-400' : 'text-emerald-400'}`}>{step.capability}</span> capability</div>
              </div>
            </div>
            {idx < steps.length - 1 && (
              <ArrowRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

// Interactive tooltip component
const FeatureTooltip: React.FC<{ featureKey: string; children: React.ReactNode }> = ({ featureKey, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const benefit = FEATURE_BENEFITS[featureKey];
  
  if (!benefit) return <>{children}</>;

  const colorMap: Record<string, string> = {
    purple: 'border-purple-500 bg-purple-500/10',
    amber: 'border-amber-500 bg-amber-500/10',
    emerald: 'border-emerald-500 bg-emerald-500/10',
  };

  return (
    <div 
      className="relative"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div className={`absolute left-full top-0 ml-2 w-64 p-3 rounded-lg border shadow-xl z-50 ${colorMap[benefit.color]} bg-gray-900`}>
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded ${benefit.color === 'purple' ? 'bg-purple-500/30 text-purple-400' : benefit.color === 'amber' ? 'bg-amber-500/30 text-amber-400' : 'bg-emerald-500/30 text-emerald-400'}`}>
              {benefit.icon}
            </div>
            <span className="font-bold text-white text-sm">{benefit.title}</span>
          </div>
          <p className="text-xs text-gray-300 mb-2">{benefit.benefit}</p>
          <div className="flex items-start gap-1.5 p-2 bg-black/30 rounded">
            <AlertTriangle className="w-3 h-3 text-yellow-500 flex-shrink-0 mt-0.5" />
            <p className="text-[10px] text-yellow-200/80"><strong>Organizing Use:</strong> {benefit.organizingUse}</p>
          </div>
        </div>
      )}
    </div>
  );
};

// Status pill component
const StatusPill: React.FC<{
  icon: React.ReactNode;
  label: string;
  active: boolean;
  activeColor: 'purple' | 'amber' | 'emerald' | 'blue';
  disabled?: boolean;
}> = ({ icon, label, active, activeColor, disabled }) => {
  const colorClasses = {
    purple: active ? 'bg-purple-500/30 border-purple-500 text-purple-300' : 'bg-gray-800 border-gray-700 text-gray-500',
    amber: active ? 'bg-amber-500/30 border-amber-500 text-amber-300' : 'bg-gray-800 border-gray-700 text-gray-500',
    emerald: active ? 'bg-emerald-500/30 border-emerald-500 text-emerald-300' : 'bg-gray-800 border-gray-700 text-gray-500',
    blue: active ? 'bg-blue-500/30 border-blue-500 text-blue-300' : 'bg-gray-800 border-gray-700 text-gray-500',
  };

  return (
    <div className={`px-2 py-1 rounded-full border flex items-center gap-1.5 text-xs font-medium ${colorClasses[activeColor]} ${disabled ? 'opacity-50' : ''}`}>
      {icon}
      {label && <span>{label}</span>}
      {active && <Check className="w-3 h-3" />}
    </div>
  );
};

// Feature card component with interactive tooltips
const FeatureCard: React.FC<{
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'purple' | 'amber' | 'emerald';
  mainBenefit: string;
  features: Array<{
    key: string;
    name: string;
    description: string;
    enabled: boolean;
    onToggle: () => void;
    disabled?: boolean;
  }>;
}> = ({ title, description, icon, color, mainBenefit, features }) => {
  const borderColor = {
    purple: 'border-purple-500/30',
    amber: 'border-amber-500/30',
    emerald: 'border-emerald-500/30',
  };

  const iconBg = {
    purple: 'bg-purple-500/20 text-purple-400',
    amber: 'bg-amber-500/20 text-amber-400',
    emerald: 'bg-emerald-500/20 text-emerald-400',
  };

  const benefitBg = {
    purple: 'bg-purple-500/10 border-purple-500/30 text-purple-300',
    amber: 'bg-amber-500/10 border-amber-500/30 text-amber-300',
    emerald: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
  };

  return (
    <div className={`bg-slate-800/50 rounded-xl border ${borderColor[color]} p-3`}>
      <div className="flex items-start gap-2 mb-2">
        <div className={`p-1.5 rounded-lg ${iconBg[color]}`}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-white text-sm">{title}</h3>
          <p className="text-[10px] text-gray-400 truncate">{description}</p>
        </div>
      </div>
      
      {/* Main benefit badge */}
      <div className={`mb-2 px-2 py-1 rounded border text-xs font-medium text-center ${benefitBg[color]}`}>
        {mainBenefit}
      </div>
      
      <div className="space-y-1.5">
        {features.map((feature) => (
          <FeatureTooltip key={feature.key} featureKey={feature.key}>
            <div 
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all ${
                feature.enabled ? 'bg-white/5 ring-1 ring-white/10' : 'bg-black/20 hover:bg-black/30'
              } ${feature.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex-1 min-w-0 mr-2">
                <div className="flex items-center gap-1.5">
                  <div className="text-xs font-medium text-white truncate">{feature.name}</div>
                  <Info className="w-3 h-3 text-gray-500 flex-shrink-0" />
                </div>
                <div className="text-[10px] text-gray-500 truncate">{feature.description}</div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); feature.onToggle(); }}
                disabled={feature.disabled}
                className={`w-10 h-5 rounded-full transition-colors relative flex-shrink-0 ${
                  feature.enabled ? 'bg-gradient-to-r from-purple-500 to-cyan-500' : 'bg-gray-700'
                } ${feature.disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-lg transition-transform ${
                  feature.enabled ? 'translate-x-5' : 'translate-x-0.5'
                }`} />
              </button>
            </div>
          </FeatureTooltip>
        ))}
      </div>
    </div>
  );
};

export default EnhancedCapabilitiesBanner;


