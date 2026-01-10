/**
 * WebGPU Detection and Capability Assessment
 * 
 * Detects WebGPU availability and provides graceful fallback to WebGL.
 * Used by deck.gl and other GPU-accelerated components.
 * 
 * Antifragile patterns:
 * - Detection never throws
 * - Always falls back to WebGL
 * - Caches result for performance
 * - Reports capabilities for analytics
 */

import { checkFeature } from '../config/featureFlags';

export interface GPUCapabilities {
  webgpu: {
    supported: boolean;
    adapter: string | null;
    vendor: string | null;
    architecture: string | null;
    maxBufferSize?: number;
    maxComputeInvocations?: number;
  };
  webgl2: {
    supported: boolean;
    renderer: string | null;
    vendor: string | null;
  };
  recommendedBackend: 'webgpu' | 'webgl2' | 'webgl';
  detectedAt: string;
}

let cachedCapabilities: GPUCapabilities | null = null;

/**
 * Detect WebGPU support
 * Returns detailed capability info without throwing
 */
async function detectWebGPU(): Promise<GPUCapabilities['webgpu']> {
  const result: GPUCapabilities['webgpu'] = {
    supported: false,
    adapter: null,
    vendor: null,
    architecture: null,
  };
  
  try {
    // Check if WebGPU API exists
    if (!navigator.gpu) {
      return result;
    }
    
    // Try to get adapter
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return result;
    }
    
    // Get adapter info (requestAdapterInfo is the standard method)
    let adapterInfo: { device?: string; vendor?: string; architecture?: string } | null = null;
    try {
      // Modern API uses requestAdapterInfo()
      if ('requestAdapterInfo' in adapter) {
        adapterInfo = await (adapter as { requestAdapterInfo: () => Promise<{ device?: string; vendor?: string; architecture?: string }> }).requestAdapterInfo();
      }
    } catch {
      // Older browsers may not have this method
    }
    
    result.supported = true;
    result.adapter = adapterInfo?.device ?? 'unknown';
    result.vendor = adapterInfo?.vendor ?? 'unknown';
    result.architecture = adapterInfo?.architecture ?? 'unknown';
    
    // Get limits
    result.maxBufferSize = adapter.limits?.maxBufferSize;
    result.maxComputeInvocations = adapter.limits?.maxComputeWorkgroupsPerDimension;
    
    return result;
  } catch (error) {
    // WebGPU detection failed - this is fine, we fall back to WebGL
    console.debug('[WebGPU] Detection failed:', error);
    return result;
  }
}

/**
 * Detect WebGL2 support
 */
function detectWebGL2(): GPUCapabilities['webgl2'] {
  const result: GPUCapabilities['webgl2'] = {
    supported: false,
    renderer: null,
    vendor: null,
  };
  
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    
    if (!gl) {
      return result;
    }
    
    result.supported = true;
    
    // Get renderer info via debug extension
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (debugInfo) {
      result.renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      result.vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    }
    
    return result;
  } catch (error) {
    console.debug('[WebGL2] Detection failed:', error);
    return result;
  }
}

/**
 * Full GPU capability detection
 * Caches result for subsequent calls
 */
export async function detectGPUCapabilities(): Promise<GPUCapabilities> {
  if (cachedCapabilities) {
    return cachedCapabilities;
  }
  
  const [webgpu, webgl2] = await Promise.all([
    detectWebGPU(),
    Promise.resolve(detectWebGL2()),
  ]);
  
  // Determine recommended backend
  let recommendedBackend: GPUCapabilities['recommendedBackend'] = 'webgl';
  
  if (webgpu.supported) {
    recommendedBackend = 'webgpu';
  } else if (webgl2.supported) {
    recommendedBackend = 'webgl2';
  }
  
  cachedCapabilities = {
    webgpu,
    webgl2,
    recommendedBackend,
    detectedAt: new Date().toISOString(),
  };
  
  console.log(`[GPU] Detected: ${recommendedBackend.toUpperCase()} (WebGPU: ${webgpu.supported}, WebGL2: ${webgl2.supported})`);
  
  return cachedCapabilities;
}

/**
 * Check if WebGPU should be used
 * Respects feature flag and availability
 */
export async function shouldUseWebGPU(): Promise<boolean> {
  const featureEnabled = await checkFeature('webgpuVisualization');
  if (!featureEnabled) {
    return false;
  }
  
  const capabilities = await detectGPUCapabilities();
  return capabilities.webgpu.supported;
}

/**
 * Get deck.gl device type based on capabilities and feature flags
 */
export async function getDeckGLDeviceType(): Promise<'webgpu' | 'webgl' | 'best-available'> {
  const featureEnabled = await checkFeature('webgpuVisualization');
  
  if (!featureEnabled) {
    return 'webgl'; // Explicit WebGL when feature disabled
  }
  
  const capabilities = await detectGPUCapabilities();
  
  if (capabilities.webgpu.supported) {
    return 'webgpu';
  }
  
  // Let deck.gl pick best option
  return 'best-available';
}

/**
 * Get cached capabilities (call detectGPUCapabilities first)
 */
export function getCachedCapabilities(): GPUCapabilities | null {
  return cachedCapabilities;
}

/**
 * Reset cached capabilities (for testing or after GPU changes)
 */
export function resetCapabilitiesCache(): void {
  cachedCapabilities = null;
}

/**
 * Simple WebGPU support check (for UI components)
 * Returns true/false without detailed info
 */
export async function checkWebGPUSupport(): Promise<boolean> {
  const capabilities = await detectGPUCapabilities();
  return capabilities.webgpu.supported;
}

