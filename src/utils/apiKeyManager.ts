/**
 * API Key Manager
 * Securely stores and retrieves AI API keys from localStorage
 * Uses base64 encoding for basic obfuscation (NOT true encryption)
 */

const STORAGE_KEY = 'dcim_ai_config';
const USAGE_KEY = 'dcim_api_usage';

export interface AIConfig {
  provider: 'openai' | 'anthropic' | 'none';
  apiKey: string;
  model: string;
  enabled: boolean;
}

export interface UsageStats {
  queries: number;
  estimatedCost: number; // USD
  periodStart: number;
  lastQuery: number;
}

/**
 * Save AI configuration to localStorage
 * Uses base64 encoding for basic obfuscation
 */
export function saveAIConfig(config: AIConfig): void {
  try {
    const json = JSON.stringify(config);
    const encoded = btoa(json);
    localStorage.setItem(STORAGE_KEY, encoded);
  } catch (error) {
    console.error('Failed to save AI config:', error);
    throw new Error('Failed to save API key');
  }
}

/**
 * Load AI configuration from localStorage
 * Returns null if no config exists or if parsing fails
 */
export function loadAIConfig(): AIConfig | null {
  try {
    const encoded = localStorage.getItem(STORAGE_KEY);
    if (!encoded) return null;
    
    const json = atob(encoded);
    const config = JSON.parse(json) as AIConfig;
    
    // Validate config structure
    if (!config.provider || !config.model) {
      console.warn('Invalid AI config structure');
      return null;
    }
    
    return config;
  } catch (error) {
    console.error('Failed to load AI config:', error);
    return null;
  }
}

/**
 * Delete AI configuration
 */
export function deleteAIConfig(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Check if user has configured an API key
 */
export function hasAPIKey(): boolean {
  const config = loadAIConfig();
  return config !== null && config.enabled && config.apiKey.length > 0;
}

/**
 * Get default configuration for a provider
 */
export function getDefaultConfig(provider: 'openai' | 'anthropic'): Partial<AIConfig> {
  switch (provider) {
    case 'openai':
      return {
        provider: 'openai',
        model: 'gpt-4-turbo-preview',
        enabled: true
      };
    case 'anthropic':
      return {
        provider: 'anthropic',
        model: 'claude-3-5-sonnet-20241022',
        enabled: true
      };
  }
}

/**
 * Get available models for a provider
 */
export function getAvailableModels(provider: 'openai' | 'anthropic'): string[] {
  switch (provider) {
    case 'openai':
      return [
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-3.5-turbo'
      ];
    case 'anthropic':
      return [
        'claude-3-5-sonnet-20241022',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229'
      ];
  }
}

/**
 * Track API usage for cost monitoring
 */
export function trackAPIUsage(tokens: number, provider: 'openai' | 'anthropic'): void {
  try {
    const stored = localStorage.getItem(USAGE_KEY);
    const stats: UsageStats = stored 
      ? JSON.parse(stored)
      : { queries: 0, estimatedCost: 0, periodStart: Date.now(), lastQuery: 0 };
    
    // Reset monthly
    const monthAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    if (stats.periodStart < monthAgo) {
      stats.queries = 0;
      stats.estimatedCost = 0;
      stats.periodStart = Date.now();
    }
    
    // Calculate cost (rough estimates)
    const costPerToken = provider === 'openai' 
      ? 0.00001  // $0.01 per 1K tokens for GPT-4 Turbo
      : 0.000015; // $0.015 per 1K tokens for Claude 3.5 Sonnet
    
    stats.queries++;
    stats.estimatedCost += tokens * costPerToken;
    stats.lastQuery = Date.now();
    
    localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
    
    // Warn if over budget
    if (stats.estimatedCost > 10) {
      console.warn(`⚠️ API usage over $10 this month ($${stats.estimatedCost.toFixed(2)})`);
    }
  } catch (error) {
    console.error('Failed to track API usage:', error);
  }
}

/**
 * Get current usage statistics
 */
export function getUsageStats(): UsageStats {
  try {
    const stored = localStorage.getItem(USAGE_KEY);
    if (!stored) {
      return { queries: 0, estimatedCost: 0, periodStart: Date.now(), lastQuery: 0 };
    }
    return JSON.parse(stored) as UsageStats;
  } catch (error) {
    console.error('Failed to load usage stats:', error);
    return { queries: 0, estimatedCost: 0, periodStart: Date.now(), lastQuery: 0 };
  }
}

/**
 * Reset usage statistics
 */
export function resetUsageStats(): void {
  const stats: UsageStats = {
    queries: 0,
    estimatedCost: 0,
    periodStart: Date.now(),
    lastQuery: 0
  };
  localStorage.setItem(USAGE_KEY, JSON.stringify(stats));
}

/**
 * Validate API key format (basic check)
 */
export function validateAPIKey(provider: 'openai' | 'anthropic', apiKey: string): boolean {
  if (!apiKey || apiKey.length < 20) {
    return false;
  }
  
  switch (provider) {
    case 'openai':
      return apiKey.startsWith('sk-');
    case 'anthropic':
      return apiKey.startsWith('sk-ant-');
    default:
      return false;
  }
}

