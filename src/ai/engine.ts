/**
 * AI Engine (Local-first, antifragile)
 *
 * Single entrypoint for AI calls across the app:
 * - Uses local providers first (Ollama/Anyway)
 * - Falls back to configured OpenAI
 * - Falls back to Cloudflare worker last
 *
 * Applies circuit breakers, rate limiting, timeouts, and safe fallbacks.
 */

import { getAIConfigCandidates, formatRequest, parseResponse, type AIConfig, type AIProvider } from '../config/ai';
import { circuitBreakers } from '../utils/circuitBreaker';
import { rateLimiters } from '../utils/rateLimiter';
import { withTimeout } from '../utils/timeout';
import { trackError } from '../utils/errorTracking';
import { formatOrganizerProfileForAI, getOrganizerProfile } from './organizerProfile';

export interface AskAIOptions {
  context?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface AskAIResult {
  text: string;
  provider: AIProvider;
}

function isRemoteProvider(provider: AIProvider): boolean {
  return provider === 'openai' || provider === 'cloudflare-worker';
}

async function callProvider(
  config: AIConfig,
  systemPrompt: string,
  userMessage: string,
  options?: AskAIOptions
): Promise<string> {
  const merged: AIConfig = {
    ...config,
    maxTokens: options?.maxTokens ?? config.maxTokens,
    temperature: options?.temperature ?? config.temperature,
  };

  const req = formatRequest(merged, systemPrompt, userMessage, options?.context);
  const timeoutMs = options?.timeoutMs ?? 30000;

  const doFetch = async (): Promise<string> => {
    const res = await withTimeout(
      fetch(req.endpoint, {
        method: 'POST',
        headers: req.headers,
        body: req.body,
      }),
      timeoutMs,
      () => {
        throw new Error('AI request timed out');
      }
    );

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI provider error (HTTP ${res.status}): ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as unknown;
    const content = parseResponse(merged, json);
    if (!content) {
      throw new Error('AI provider returned an empty response');
    }
    return content;
  };

  // Remote providers share the same circuit breaker / rate limiter.
  if (isRemoteProvider(config.provider)) {
    await rateLimiters.claudeAPI.check();
    return await circuitBreakers.claudeAPI.execute(doFetch);
  }

  // Local providers: no global remote breaker, but still timeouts + error tracking.
  return await doFetch();
}

/**
 * Ask the AI for a plain text response.
 * Tries providers in priority order (local-first).
 */
export async function askAIText(
  systemPrompt: string,
  userMessage: string,
  options?: AskAIOptions
): Promise<AskAIResult> {
  const candidates = await getAIConfigCandidates();

  // Personalization: local Organizer Profile injected as extra context.
  // Safety: by default, do NOT send this profile to external providers unless user opts in.
  let organizerContext: string | undefined;
  let shareWithExternalAI = false;
  try {
    const profile = await getOrganizerProfile();
    if (profile) {
      organizerContext = formatOrganizerProfileForAI(profile);
      shareWithExternalAI = profile.shareWithExternalAI === true;
    }
  } catch {
    organizerContext = undefined;
    shareWithExternalAI = false;
  }

  let lastError: Error | null = null;
  for (const cfg of candidates) {
    // If the provider requires an API key, skip if missing (avoid hard failures).
    if (cfg.provider === 'openai' && !cfg.apiKey) continue;
    if (cfg.provider === 'cloudflare-worker' && !cfg.apiKey) continue;

    try {
      // Compose context, respecting external-sharing preference.
      let context = options?.context;
      if (organizerContext) {
        const isLocal = cfg.provider === 'ollama' || cfg.provider === 'anyway';
        const shouldShare = isLocal || shareWithExternalAI;
        if (shouldShare) {
          context = context ? `${organizerContext}\n\n${context}` : organizerContext;
        }
      }

      const resolvedOptions: AskAIOptions | undefined = options ? { ...options, context } : { context };
      const text = await callProvider(cfg, systemPrompt, userMessage, resolvedOptions);
      return { text, provider: cfg.provider };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      lastError = error;
      trackError(error, { context: 'AIEngine.askAIText', provider: cfg.provider });
      // Try next provider
      continue;
    }
  }

  throw lastError ?? new Error('No AI provider available');
}


