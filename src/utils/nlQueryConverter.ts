/**
 * Natural Language to Structured Query Converter
 * Converts user's natural language into structured facility queries
 * Prefers local/OpenAI-compatible providers when available; validates outputs with Zod.
 */

import { FacilityQuerySchema, type FacilityQuery, EXAMPLE_QUERIES } from '../schemas/facilityQuery';
import { SYSTEM_PROMPTS } from '../ai/config';
import { askAIText } from '../ai/engine';

type NLQueryProvider = 'ollama' | 'anyway' | 'cloudflare-worker' | 'openai' | 'keywords';

function extractLikelyJsonObject(text: string): string | null {
  const first = text.indexOf('{');
  const last = text.lastIndexOf('}');
  if (first === -1 || last === -1 || last <= first) return null;
  return text.slice(first, last + 1);
}

function parseAndValidateFacilityQuery(rawText: string): FacilityQuery {
  const trimmed = rawText.trim();
  const candidate = trimmed.startsWith('{') ? trimmed : (extractLikelyJsonObject(trimmed) ?? trimmed);

  let obj: unknown;
  try {
    obj = JSON.parse(candidate);
  } catch (e) {
    throw new Error(
      'AI returned non-JSON for query conversion. Please try a shorter, more specific query.'
    );
  }

  const validated = FacilityQuerySchema.safeParse(obj);
  if (!validated.success) {
    const firstIssue = validated.error.issues[0];
    const at = firstIssue?.path?.length ? ` at ${firstIssue.path.join('.')}` : '';
    throw new Error(`AI returned an invalid query${at}: ${firstIssue?.message ?? 'Unknown issue'}`);
  }

  return validated.data;
}

/**
 * Convert natural language query to structured query using OpenAI
 */
export async function convertNLToQuery(
  naturalLanguage: string
): Promise<FacilityQuery> {
  try {
    const userMessage =
      'Convert the following natural language request into a JSON object that matches the FacilityQuery schema. ' +
      'Return ONLY a JSON object (no markdown, no commentary, no code fences). ' +
      'If sorting is not specified, use sensible defaults (e.g., sortBy=subsidyGap desc for compliance queries, ' +
      'sortBy=name asc otherwise). Default limit to 100 unless specified.\n\n' +
      `User request: "${naturalLanguage}"`;

    const { text } = await askAIText(SYSTEM_PROMPTS.query, userMessage, {
      maxTokens: 800,
      temperature: 0,
      timeoutMs: 30000,
    });

    return parseAndValidateFacilityQuery(text);
  } catch (error) {
    console.error('AI query conversion error:', error);
    if (error instanceof Error) {
      throw new Error(`AI query conversion failed: ${error.message}`);
    }
    
    throw new Error('Unknown error during query conversion');
  }
}

/**
 * Fallback: Convert natural language to query using keyword matching
 * Used when API is not available or fails
 */
export function convertNLToQueryKeywords(naturalLanguage: string): FacilityQuery {
  const query: FacilityQuery = {};
  const lower = naturalLanguage.toLowerCase();
  
  // Extract states (US state codes or full names)
  const stateMap: Record<string, string> = {
    'texas': 'TX', 'tx': 'TX',
    'california': 'CA', 'ca': 'CA',
    'new york': 'NY', 'ny': 'NY',
    'florida': 'FL', 'fl': 'FL',
    'illinois': 'IL', 'il': 'IL',
    'virginia': 'VA', 'va': 'VA',
    'ohio': 'OH', 'oh': 'OH',
    'iowa': 'IA', 'ia': 'IA',
    'oregon': 'OR', 'or': 'OR',
    'washington': 'WA', 'wa': 'WA',
    'georgia': 'GA', 'ga': 'GA',
    'michigan': 'MI', 'mi': 'MI',
    'arizona': 'AZ', 'az': 'AZ',
    'nevada': 'NV', 'nv': 'NV'
  };
  
  const foundStates: string[] = [];
  for (const [name, code] of Object.entries(stateMap)) {
    if (lower.includes(name)) {
      foundStates.push(code);
    }
  }
  if (foundStates.length > 0) {
    query.states = [...new Set(foundStates)]; // Remove duplicates
  }
  
  // Extract operators
  const operators = ['google', 'amazon', 'microsoft', 'meta', 'apple', 'switch', 'aws', 'facebook'];
  const foundOperators: string[] = [];
  for (const op of operators) {
    if (lower.includes(op)) {
      // Capitalize first letter
      foundOperators.push(op.charAt(0).toUpperCase() + op.slice(1));
    }
  }
  if (foundOperators.length > 0) {
    query.operator = foundOperators;
  }
  
  // Extract compliance status
  if (lower.includes('non-compliant') || lower.includes('noncompliant') || lower.includes('failing')) {
    query.complianceStatuses = ['Non-Compliant'];
  } else if (lower.includes('at risk') || lower.includes('risk')) {
    query.complianceStatuses = ['At Risk'];
  } else if (lower.includes('compliant')) {
    query.complianceStatuses = ['Compliant'];
  }
  
  // Extract facility types
  if (lower.includes('hyperscale')) {
    query.facilityTypes = ['Hyperscale'];
  } else if (lower.includes('colocation') || lower.includes('colo')) {
    query.facilityTypes = ['Colocation'];
  } else if (lower.includes('edge')) {
    query.facilityTypes = ['Edge'];
  }
  
  // Extract monetary amounts
  const moneyMatch = lower.match(/\$?\s*(\d+)\s*(million|m|billion|b)/i);
  if (moneyMatch) {
    const amount = parseInt(moneyMatch[1]);
    const unit = moneyMatch[2].toLowerCase();
    const multiplier = unit.startsWith('b') ? 1e9 : 1e6;
    const value = amount * multiplier;
    
    if (lower.includes('subsidy') && lower.includes('gap')) {
      if (lower.includes('over') || lower.includes('more than') || lower.includes('>')) {
        query.subsidyGapMin = value;
      } else if (lower.includes('under') || lower.includes('less than') || lower.includes('<')) {
        query.subsidyGapMax = value;
      } else {
        query.subsidyMin = value;
      }
    } else if (lower.includes('subsidy')) {
      if (lower.includes('over') || lower.includes('more than') || lower.includes('>')) {
        query.subsidyMin = value;
      } else {
        query.subsidyMax = value;
      }
    }
  }
  
  // Extract job counts
  const jobMatch = lower.match(/(\d+)\s*jobs/i);
  if (jobMatch) {
    const count = parseInt(jobMatch[1]);
    if (lower.includes('created') || lower.includes('have')) {
      if (lower.includes('fewer than') || lower.includes('less than') || lower.includes('<')) {
        query.jobsCreatedMax = count;
      } else if (lower.includes('more than') || lower.includes('over') || lower.includes('>')) {
        query.jobsCreatedMin = count;
      }
    } else if (lower.includes('promised')) {
      if (lower.includes('more than') || lower.includes('over') || lower.includes('>')) {
        query.jobsPromisedMin = count;
      }
    }
  }
  
  // Extract capacity
  const capacityMatch = lower.match(/(\d+)\s*(mw|megawatt)/i);
  if (capacityMatch) {
    const capacity = parseInt(capacityMatch[1]);
    if (lower.includes('over') || lower.includes('more than') || lower.includes('>')) {
      query.capacityMin = capacity;
    } else if (lower.includes('under') || lower.includes('less than') || lower.includes('<')) {
      query.capacityMax = capacity;
    }
  }
  
  // Extract dates
  const yearMatch = lower.match(/(after|since|before)\s+(\d{4})/i);
  if (yearMatch) {
    const direction = yearMatch[1].toLowerCase();
    const year = yearMatch[2];
    if (direction === 'after' || direction === 'since') {
      query.openedAfter = `${year}-01-01`;
    } else if (direction === 'before') {
      query.openedBefore = `${year}-12-31`;
    }
  }
  
  // Default sorting
  if (query.complianceStatuses || query.subsidyGapMin || query.subsidyMin) {
    query.sortBy = 'subsidyGap';
    query.sortDirection = 'desc';
  } else if (query.jobsCreatedMax) {
    query.sortBy = 'jobsCreated';
    query.sortDirection = 'asc';
  } else {
    query.sortBy = 'name';
    query.sortDirection = 'asc';
  }
  
  // Default limit
  query.limit = 100;
  
  return query;
}

/**
 * Convert with automatic fallback
 * Tries API first, falls back to keywords on failure
 */
export async function convertNLToQueryWithFallback(
  naturalLanguage: string
): Promise<{
  query: FacilityQuery;
  method: 'api' | 'keywords' | 'error';
  provider?: NLQueryProvider;
  error?: string;
}> {
  try {
    const userMessage =
      'Convert the following natural language request into a JSON object that matches the FacilityQuery schema. ' +
      'Return ONLY a JSON object (no markdown, no commentary, no code fences). ' +
      'If sorting is not specified, use sensible defaults (e.g., sortBy=subsidyGap desc for compliance queries, ' +
      'sortBy=name asc otherwise). Default limit to 100 unless specified.\n\n' +
      `User request: "${naturalLanguage}"`;

    const result = await askAIText(SYSTEM_PROMPTS.query, userMessage, {
      maxTokens: 800,
      temperature: 0,
      timeoutMs: 30000,
    });

    const query = parseAndValidateFacilityQuery(result.text);
    return { query, method: 'api', provider: result.provider as NLQueryProvider };
  } catch (error) {
    console.warn('API conversion failed, using keyword matching:', error);
    
    // Try keyword fallback
    try {
      const query = convertNLToQueryKeywords(naturalLanguage);
      return { 
        query, 
        method: 'keywords',
        provider: 'keywords',
        error: error instanceof Error ? error.message : 'API conversion failed'
      };
    } catch (fallbackError) {
      // Both failed - return empty query
      return {
        query: { limit: 100 },
        method: 'error',
        provider: 'keywords',
        error: 'Could not parse query. Try being more specific (e.g., "Show me facilities in Texas").'
      };
    }
  }
}

/**
 * Get example queries for UI suggestions
 */
export function getExampleQueries(): string[] {
  return EXAMPLE_QUERIES.map(eq => eq.nl);
}

/**
 * Validate and normalize a query
 */
export function normalizeQuery(query: FacilityQuery): FacilityQuery {
  // Ensure limit is set
  if (!query.limit) {
    query.limit = 100;
  }
  
  // Ensure limit doesn't exceed max
  if (query.limit > 1000) {
    query.limit = 1000;
  }
  
  // Set default sorting if not specified and has filters
  if (!query.sortBy) {
    if (query.subsidyGapMin || query.complianceStatuses) {
      query.sortBy = 'subsidyGap';
      query.sortDirection = 'desc';
    } else if (query.subsidyMin) {
      query.sortBy = 'subsidyReceived';
      query.sortDirection = 'desc';
    } else if (query.jobsCreatedMax) {
      query.sortBy = 'jobsCreated';
      query.sortDirection = 'asc';
    }
  }
  
  return query;
}

