/**
 * Feature Flags - Antifragile Enhancement Control
 * 
 * All new capabilities are gated behind feature flags that:
 * 1. Default to DISABLED for safety
 * 2. Can be enabled per-feature
 * 3. Allow instant rollback if issues arise
 * 4. Persist to IndexedDB (not localStorage per project rules)
 * 
 * Pattern: Features fail SILENTLY and fall back to existing behavior.
 */

import { getSettings, saveSettings, settingsKey } from '../utils/settingsPersistence';

export interface FeatureFlags {
  // Evidence Enhancements
  merkleTreeEvidence: boolean;      // Merkle tree linking evidence packages
  openTimestamps: boolean;          // Bitcoin-anchored timestamps (requires network)
  contentAddressedStorage: boolean; // IPFS CID generation for evidence
  
  // Visualization Enhancements
  webgpuVisualization: boolean;     // WebGPU backend for deck.gl (auto-fallback to WebGL)
  cosmographNetworks: boolean;      // GPU-accelerated network topology graphs
  
  // AI Enhancements
  localTransformers: boolean;       // Transformers.js for local NER/classification
  webLLMInference: boolean;         // In-browser LLM (Phi-3/Llama)
  tensorflowAnomalyDetection: boolean; // TF.js autoencoder anomaly detection
  
  // Collaboration
  p2pCollaboration: boolean;        // Yjs + y-webrtc peer-to-peer
  
  // PWA
  advancedOfflineMode: boolean;     // Workbox caching strategies
  backgroundSync: boolean;          // Background sync for evidence submission
}

// Safe defaults - all new features OFF
export const DEFAULT_FEATURE_FLAGS: FeatureFlags = {
  // Evidence (safest to enable - additive only)
  merkleTreeEvidence: false,
  openTimestamps: false,
  contentAddressedStorage: false,
  
  // Visualization (safe - has automatic fallbacks)
  webgpuVisualization: false,
  cosmographNetworks: false,
  
  // AI (medium risk - runs alongside existing)
  localTransformers: false,
  webLLMInference: false,
  tensorflowAnomalyDetection: false,
  
  // Collaboration (higher complexity)
  p2pCollaboration: false,
  
  // PWA (safe - browser handles gracefully)
  advancedOfflineMode: false,
  backgroundSync: false,
};

const FLAGS_KEY = settingsKey('featureFlags');

let cachedFlags: FeatureFlags | null = null;

/**
 * Load feature flags from IndexedDB
 * Falls back to defaults if load fails
 */
export async function loadFeatureFlags(): Promise<FeatureFlags> {
  if (cachedFlags) return cachedFlags;
  
  try {
    const stored = await getSettings<Partial<FeatureFlags>>(FLAGS_KEY);
    cachedFlags = { ...DEFAULT_FEATURE_FLAGS, ...stored };
    return cachedFlags;
  } catch (error) {
    console.warn('[FeatureFlags] Failed to load, using defaults:', error);
    cachedFlags = { ...DEFAULT_FEATURE_FLAGS };
    return cachedFlags;
  }
}

/**
 * Save feature flags to IndexedDB
 */
export async function saveFeatureFlags(flags: Partial<FeatureFlags>): Promise<void> {
  try {
    const current = await loadFeatureFlags();
    const updated = { ...current, ...flags };
    await saveSettings(FLAGS_KEY, updated);
    cachedFlags = updated;
    console.log('[FeatureFlags] Saved:', Object.entries(flags).map(([k, v]) => `${k}=${v}`).join(', '));
  } catch (error) {
    console.error('[FeatureFlags] Failed to save:', error);
    throw error;
  }
}

/**
 * Check if a specific feature is enabled
 * Synchronous check using cache (call loadFeatureFlags first)
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  if (!cachedFlags) {
    console.warn('[FeatureFlags] Cache not loaded, returning false for:', feature);
    return false;
  }
  return cachedFlags[feature] ?? false;
}

/**
 * Async feature check with auto-load
 */
export async function checkFeature(feature: keyof FeatureFlags): Promise<boolean> {
  const flags = await loadFeatureFlags();
  return flags[feature] ?? false;
}

/**
 * Reset all flags to defaults
 */
export async function resetFeatureFlags(): Promise<void> {
  cachedFlags = { ...DEFAULT_FEATURE_FLAGS };
  await saveSettings(FLAGS_KEY, cachedFlags);
  console.log('[FeatureFlags] Reset to defaults');
}

/**
 * Get all current flags (for settings UI)
 */
export async function getAllFeatureFlags(): Promise<FeatureFlags> {
  return loadFeatureFlags();
}

// Feature flag descriptions for UI
export const FEATURE_DESCRIPTIONS: Record<keyof FeatureFlags, { name: string; description: string; risk: 'low' | 'medium' | 'high' }> = {
  merkleTreeEvidence: {
    name: 'Merkle Tree Evidence Chain',
    description: 'Links all evidence packages into a tamper-evident chain. Single root hash proves entire chain integrity.',
    risk: 'low',
  },
  openTimestamps: {
    name: 'Bitcoin-Anchored Timestamps',
    description: 'Cryptographic proof that evidence existed at a specific time, anchored to Bitcoin blockchain.',
    risk: 'low',
  },
  contentAddressedStorage: {
    name: 'Content-Addressed Storage (IPFS)',
    description: 'Generate IPFS CIDs for evidence packages. Content hash proves data unchanged.',
    risk: 'low',
  },
  webgpuVisualization: {
    name: 'WebGPU Visualization',
    description: 'Use WebGPU for 3-10x faster rendering. Automatic fallback to WebGL if unsupported.',
    risk: 'low',
  },
  cosmographNetworks: {
    name: 'GPU Network Topology',
    description: 'Cosmograph GPU-accelerated force-directed graphs for 100K+ node topologies.',
    risk: 'medium',
  },
  localTransformers: {
    name: 'Local NLP (Transformers.js)',
    description: 'Run NER, classification, and embeddings in browser. No data sent externally.',
    risk: 'medium',
  },
  webLLMInference: {
    name: 'Browser LLM (WebLLM)',
    description: 'Run Phi-3 or Llama models entirely in browser. 20-60 tokens/sec, offline capable.',
    risk: 'medium',
  },
  tensorflowAnomalyDetection: {
    name: 'Anomaly Detection (TensorFlow.js)',
    description: 'Autoencoder-based pattern detection for unusual facility metrics.',
    risk: 'medium',
  },
  p2pCollaboration: {
    name: 'P2P Collaboration (Yjs)',
    description: 'Real-time collaboration via WebRTC. Data flows peer-to-peer, never through servers.',
    risk: 'high',
  },
  advancedOfflineMode: {
    name: 'Advanced Offline Mode',
    description: 'Workbox caching strategies for offline-first field investigation.',
    risk: 'low',
  },
  backgroundSync: {
    name: 'Background Sync',
    description: 'Queue evidence submissions when offline, auto-sync when connected.',
    risk: 'low',
  },
};

