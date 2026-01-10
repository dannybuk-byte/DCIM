/**
 * AI Configuration and Provider Management
 * 
 * Supports multiple AI providers with automatic fallback:
 * 1. Ollama (local, privacy-first) - RECOMMENDED
 * 2. Anyway.dev (local, when available)
 * 3. OpenAI (user-configured)
 * 4. Cloudflare Worker (fallback)
 * 
 * Priority: Local AI first, external as fallback only
 */

import { loadAIConfig as loadStoredAIConfig } from '../utils/apiKeyManager';

export type AIProvider = 'ollama' | 'anyway' | 'openai' | 'cloudflare-worker';

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
 * Check if OpenAI is configured in Settings
 */
function getOpenAIConfig(): AIConfig | null {
  const stored = loadStoredAIConfig();
  if (!stored || !stored.enabled || stored.provider !== 'openai' || !stored.apiKey) return null;
  return {
    provider: 'openai',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    model: stored.model || 'gpt-4-turbo-preview',
    offline: false,
    apiKey: stored.apiKey,
    maxTokens: 2000,
    temperature: 0.7,
  };
}

/**
 * Get ordered list of provider configs (local-first, external last)
 * Used by the AI Engine to attempt fallbacks without duplicating provider selection logic.
 */
export async function getAIConfigCandidates(): Promise<AIConfig[]> {
  const [ollamaStatus, anywayStatus] = await Promise.all([checkOllama(), checkAnyway()]);

  const candidates: AIConfig[] = [];

  if (ollamaStatus.available) {
    candidates.push({
      provider: 'ollama',
      endpoint: 'http://localhost:11434/api/generate',
      model: 'llama3',
      offline: true,
      maxTokens: 2000,
      temperature: 0.7,
    });
  }

  if (anywayStatus.available) {
    candidates.push({
      provider: 'anyway',
      endpoint: 'http://localhost:8080/v1/chat/completions',
      model: 'local-model',
      offline: true,
      maxTokens: 2000,
      temperature: 0.7,
    });
  }

  const openai = getOpenAIConfig();
  if (openai) candidates.push(openai);

  // Cloudflare Worker fallback (may require key; callers should handle missing key gracefully)
  candidates.push({
    provider: 'cloudflare-worker',
    endpoint: 'https://claude-api-proxy.dannybuk.workers.dev',
    model: 'claude-sonnet-4-20250514',
    offline: false,
    apiKey: localStorage.getItem('claude_api_key') || undefined,
    maxTokens: 2000,
    temperature: 0.7,
  });

  return candidates;
}

/**
 * Get best available AI provider with automatic fallback (single choice).
 */
export async function getAIConfig(): Promise<AIConfig> {
  const candidates = await getAIConfigCandidates();
  return candidates[0];
}

/**
 * Get status of all AI providers
 */
export async function getProvidersStatus(): Promise<AIProviderStatus[]> {
  const [ollama, anyway] = await Promise.all([checkOllama(), checkAnyway()]);

  const openaiConfigured = getOpenAIConfig() !== null;
  
  return [
    ollama,
    anyway,
    {
      provider: 'openai',
      available: openaiConfigured,
      latency: undefined,
      error: openaiConfigured ? undefined : 'Not configured',
    },
    {
      provider: 'cloudflare-worker',
      available: true, // Endpoint exists; key may be required depending on deployment
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
    case 'openai':
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
          ...(config.provider === 'openai' && config.apiKey
            ? { Authorization: `Bearer ${config.apiKey}` }
            : {}),
        },
      };
    
    case 'cloudflare-worker':
      return {
        endpoint: config.endpoint,
        // This worker expects an Anthropic-style payload (system + messages) and returns content[].text.
        body: JSON.stringify({
          model: config.model,
          max_tokens: config.maxTokens,
          system: context ? `${systemPrompt}\n\nContext:\n${context}` : systemPrompt,
          messages: [{ role: 'user', content: userMessage }],
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
export function parseResponse(config: AIConfig, response: unknown): string {
  const r = response as any;
  switch (config.provider) {
    case 'ollama':
      return r?.response || '';
    
    case 'anyway':
    case 'openai':
      return r?.choices?.[0]?.message?.content || '';

    case 'cloudflare-worker':
      return r?.content?.[0]?.text || r?.choices?.[0]?.message?.content || '';
    
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
    case 'openai':
      return 'OpenAI (Configured)';
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
    case 'openai':
    case 'cloudflare-worker':
      return 'low'; // Data sent to external services
  }
}

