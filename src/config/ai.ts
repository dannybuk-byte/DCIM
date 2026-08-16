/**
 * AI Configuration and Provider Management
 * 
 * Supports multiple AI providers with automatic fallback:
 * 1. Ollama (local, privacy-first) - RECOMMENDED
 * 2. Anyway.dev (local, when available)
 * 3. Cloudflare Worker (fallback)
 * 
 * Priority: Local AI first, external as fallback only
 */

export type AIProvider = 'ollama' | 'anyway' | 'cloudflare-worker';

export interface AIConfig {
  provider: AIProvider;
  endpoint: string;
  model: string;
  offline: boolean;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}

export interface AIProviderStatus {
  provider: AIProvider;
  available: boolean;
  latency?: number;
  error?: string;
}

/**
 * Check if Ollama is running locally
 */
async function checkOllama(): Promise<AIProviderStatus> {
  try {
    const start = Date.now();
    const response = await fetch('http://localhost:11434/api/tags', {
      method: 'GET',
      signal: AbortSignal.timeout(2000), // 2 second timeout
    });
    
    if (!response.ok) {
      return {
        provider: 'ollama',
        available: false,
        error: `HTTP ${response.status}`,
      };
    }
    
    const data = await response.json();
    const hasModels = data.models && data.models.length > 0;
    
    return {
      provider: 'ollama',
      available: hasModels,
      latency: Date.now() - start,
      error: hasModels ? undefined : 'No models installed',
    };
  } catch (error) {
    return {
      provider: 'ollama',
      available: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Check if Anyway.dev is running locally
 */
async function checkAnyway(): Promise<AIProviderStatus> {
  try {
    const start = Date.now();
    const response = await fetch('http://localhost:8080/health', {
      method: 'GET',
      signal: AbortSignal.timeout(2000),
    });
    
    return {
      provider: 'anyway',
      available: response.ok,
      latency: Date.now() - start,
    };
  } catch (error) {
    return {
      provider: 'anyway',
      available: false,
      error: error instanceof Error ? error.message : 'Connection failed',
    };
  }
}

/**
 * Get best available AI provider with automatic fallback
 */
export async function getAIConfig(): Promise<AIConfig> {
  // Check local providers first
  const [ollamaStatus, anywayStatus] = await Promise.all([
    checkOllama(),
    checkAnyway(),
  ]);
  
  // Priority 1: Ollama (recommended for production)
  if (ollamaStatus.available) {
    console.log(`✓ Using Ollama (local AI) - ${ollamaStatus.latency}ms latency`);
    return {
      provider: 'ollama',
      endpoint: 'http://localhost:11434/api/generate',
      model: 'llama3', // or 'mistral', 'llama3.1:70b', etc.
      offline: true,
      maxTokens: 2000,
      temperature: 0.7,
    };
  }
  
  // Priority 2: Anyway.dev
  if (anywayStatus.available) {
    console.log(`✓ Using Anyway.dev (local AI) - ${anywayStatus.latency}ms latency`);
    return {
      provider: 'anyway',
      endpoint: 'http://localhost:8080/v1/chat/completions',
      model: 'local-model',
      offline: true,
      maxTokens: 2000,
      temperature: 0.7,
    };
  }
  
  // Priority 3: Cloudflare Worker (external fallback)
  console.warn('⚠ No local AI available. Using external Cloudflare Worker.');
  console.warn('   Install Ollama for privacy: https://ollama.ai/download');
  
  return {
    provider: 'cloudflare-worker',
    // Backend decommissioned 2026-08-15; endpoint must be explicitly configured.
    endpoint: (import.meta.env.VITE_CLAUDE_PROXY_URL as string | undefined) ?? '',
    model: 'claude-3-sonnet',
    offline: false,
    apiKey: localStorage.getItem('claude_api_key') || undefined,
    maxTokens: 2000,
    temperature: 0.7,
  };
}

/**
 * Get status of all AI providers
 */
export async function getProvidersStatus(): Promise<AIProviderStatus[]> {
  const [ollama, anyway] = await Promise.all([
    checkOllama(),
    checkAnyway(),
  ]);
  
  return [
    ollama,
    anyway,
    {
      provider: 'cloudflare-worker',
      available: true, // Always available (external)
      latency: undefined,
    },
  ];
}

/**
 * Format request for specific provider
 */
export function formatRequest(
  config: AIConfig,
  systemPrompt: string,
  userMessage: string,
  context?: string
): { endpoint: string; body: string; headers: Record<string, string> } {
  const fullPrompt = context 
    ? `${systemPrompt}\n\nContext:\n${context}\n\nUser Query: ${userMessage}`
    : `${systemPrompt}\n\nUser Query: ${userMessage}`;
  
  switch (config.provider) {
    case 'ollama':
      return {
        endpoint: config.endpoint,
        body: JSON.stringify({
          model: config.model,
          prompt: fullPrompt,
          stream: false,
          options: {
            temperature: config.temperature,
            num_predict: config.maxTokens,
          },
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    
    case 'anyway':
      return {
        endpoint: config.endpoint,
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...(context ? [{ role: 'system', content: `Context:\n${context}` }] : []),
            { role: 'user', content: userMessage },
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      };
    
    case 'cloudflare-worker':
      return {
        endpoint: config.endpoint,
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: systemPrompt },
            ...(context ? [{ role: 'system', content: `Context:\n${context}` }] : []),
            { role: 'user', content: userMessage },
          ],
          temperature: config.temperature,
          max_tokens: config.maxTokens,
        }),
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey && { 'Authorization': `Bearer ${config.apiKey}` }),
        },
      };
  }
}

/**
 * Parse response from specific provider
 */
export function parseResponse(config: AIConfig, response: any): string {
  switch (config.provider) {
    case 'ollama':
      return response.response || '';
    
    case 'anyway':
    case 'cloudflare-worker':
      return response.choices?.[0]?.message?.content || '';
    
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}

/**
 * Get user-friendly provider name
 */
export function getProviderDisplayName(provider: AIProvider): string {
  switch (provider) {
    case 'ollama':
      return 'Ollama (Local AI)';
    case 'anyway':
      return 'Anyway.dev (Local AI)';
    case 'cloudflare-worker':
      return 'Cloudflare Worker (External)';
  }
}

/**
 * Get privacy level for provider
 */
export function getPrivacyLevel(provider: AIProvider): 'high' | 'medium' | 'low' {
  switch (provider) {
    case 'ollama':
    case 'anyway':
      return 'high'; // Data never leaves your machine
    case 'cloudflare-worker':
      return 'low'; // Data sent to external services
  }
}

