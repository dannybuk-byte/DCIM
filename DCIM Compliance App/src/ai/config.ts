/**
 * AI Configuration
 * Central configuration for AI features
 */

export const AI_CONFIG = {
  // Feature flags
  features: {
    naturalLanguageSearch: true,
    facilitySummaries: true,
    anomalyDetection: true,
    semanticSearch: false, // Week 4+
    deepResearch: false,   // Week 4+
    investigationAgent: false // Week 4+
  },
  
  // Cache settings
  cache: {
    summaryTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    queryTTL: 24 * 60 * 60 * 1000,       // 24 hours
    maxCachedSummaries: 1000,
    maxCachedQueries: 500
  },
  
  // API settings
  api: {
    maxRetries: 3,
    retryDelay: 1000, // ms, exponential backoff
    timeout: 30000,   // 30 seconds
    maxConcurrent: 5,
    minInterval: 200  // ms between calls
  },
  
  // Model settings
  models: {
    openai: {
      summary: {
        model: 'gpt-4-turbo-preview',
        temperature: 0.3,
        maxTokens: 200
      },
      query: {
        model: 'gpt-4-turbo-preview',
        temperature: 0,
        maxTokens: 500
      },
      research: {
        model: 'gpt-4-turbo-preview',
        temperature: 0.5,
        maxTokens: 2000
      }
    },
    anthropic: {
      summary: {
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.3,
        maxTokens: 200
      },
      query: {
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0,
        maxTokens: 500
      },
      research: {
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.5,
        maxTokens: 2000
      }
    }
  },
  
  // Cost limits
  costLimits: {
    warningThreshold: 10,  // USD
    hardLimit: 50         // USD
  },
  
  // Fallback behavior
  fallbacks: {
    useTemplatesOnAPIFailure: true,
    useKeywordMatchingForQueries: true,
    showWarningsToUser: true
  }
} as const;

export type AIFeature = keyof typeof AI_CONFIG.features;

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: AIFeature): boolean {
  return AI_CONFIG.features[feature];
}

/**
 * System prompts for different AI features
 */
export const SYSTEM_PROMPTS = {
  summary: `You are an AI assistant helping labor organizers investigate data center compliance with job creation promises. 

Your role:
- Summarize facility data clearly and concisely (2-3 sentences max)
- Focus on compliance status, key numbers, and accountability context
- Use clear, direct language without jargon
- Be factual and specific
- Highlight non-compliance severity when present

Terminology:
- Use "non-compliance" not "fraud"
- Use "under-compliance" not "cheating"
- Use "subsidy gap" not "stolen money"
- Use "shortfall" not "crime"

This maintains legal precision while supporting enforcement.`,

  query: `You are an AI assistant converting natural language queries into structured database queries for a data center compliance database.

Your role:
- Parse user queries into structured filters
- Extract states, operators, compliance statuses, subsidy amounts, job counts, etc.
- Return valid JSON matching the FacilityQuery schema
- Be flexible with terminology but precise in output

Example queries:
- "Show me Google facilities in Texas with over $50M in subsidies"
- "Which facilities are non-compliant and created fewer than 100 jobs?"
- "Find all Amazon data centers opened after 2020"

Always return valid JSON. Use null for unspecified filters.`,

  research: `You are an AI research assistant helping labor organizers investigate data center subsidy compliance.

Your role:
- Analyze facility data for patterns and anomalies
- Generate detailed compliance reports
- Suggest investigation strategies
- Provide context from labor law and subsidy accountability
- Format reports for boardroom presentation

Focus on:
- Statistical evidence
- Comparative analysis
- Enforcement implications
- Organizing strategy relevance

Use clear, professional language suitable for coalition partners and media.`
} as const;

