/**
 * Natural Language to Structured Query Converter
 * 
 * Multi-layered, self-learning query conversion with automatic fallback:
 * 1. Adaptive NLP (semantic + learned patterns + entity extraction)
 * 2. External AI (Ollama/OpenAI/Cloudflare)
 * 3. Keyword matching (always works)
 * 
 * Learns from successful queries to improve over time.
 */

import { FacilityQuerySchema, type FacilityQuery, EXAMPLE_QUERIES } from '../schemas/facilityQuery';
import { SYSTEM_PROMPTS } from '../ai/config';
import { askAIText } from '../ai/engine';
import { 
  adaptiveConvert, 
  learnFromSuccess, 
  updateContext, 
  generateSuggestions,
  initAdaptiveNLP,
  type ExtractedQueryInfo,
  extractQueryInfo,
  getSynonyms,
  expandQueryWithSynonyms,
} from '../ai/adaptiveNLP';

export type NLQueryProvider = 'adaptive-semantic' | 'adaptive-learned' | 'adaptive-extracted' | 'ollama' | 'anyway' | 'cloudflare-worker' | 'openai' | 'keywords';

// Initialize adaptive NLP on module load
let adaptiveInitialized = false;
async function ensureAdaptiveInit(): Promise<void> {
  if (!adaptiveInitialized) {
    await initAdaptiveNLP();
    adaptiveInitialized = true;
  }
}

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
 * ENHANCED: Comprehensive state/operator coverage + text search
 */
export function convertNLToQueryKeywords(naturalLanguage: string): FacilityQuery {
  const query: FacilityQuery = {};
  const lower = naturalLanguage.toLowerCase();
  
  // ALL 50 US states + territories
  const stateMap: Record<string, string> = {
    'alabama': 'AL', 'al': 'AL', 'alaska': 'AK', 'ak': 'AK',
    'arizona': 'AZ', 'az': 'AZ', 'arkansas': 'AR', 'ar': 'AR',
    'california': 'CA', 'ca': 'CA', 'colorado': 'CO', 'co': 'CO',
    'connecticut': 'CT', 'ct': 'CT', 'delaware': 'DE', 'de': 'DE',
    'florida': 'FL', 'fl': 'FL', 'georgia': 'GA', 'ga': 'GA',
    'hawaii': 'HI', 'hi': 'HI', 'idaho': 'ID', 'id': 'ID',
    'illinois': 'IL', 'il': 'IL', 'indiana': 'IN', 'in': 'IN',
    'iowa': 'IA', 'ia': 'IA', 'kansas': 'KS', 'ks': 'KS',
    'kentucky': 'KY', 'ky': 'KY', 'louisiana': 'LA', 'la': 'LA',
    'maine': 'ME', 'me': 'ME', 'maryland': 'MD', 'md': 'MD',
    'massachusetts': 'MA', 'ma': 'MA', 'michigan': 'MI', 'mi': 'MI',
    'minnesota': 'MN', 'mn': 'MN', 'mississippi': 'MS', 'ms': 'MS',
    'missouri': 'MO', 'mo': 'MO', 'montana': 'MT', 'mt': 'MT',
    'nebraska': 'NE', 'ne': 'NE', 'nevada': 'NV', 'nv': 'NV',
    'new hampshire': 'NH', 'nh': 'NH', 'new jersey': 'NJ', 'nj': 'NJ',
    'new mexico': 'NM', 'nm': 'NM', 'new york': 'NY', 'ny': 'NY',
    'north carolina': 'NC', 'nc': 'NC', 'north dakota': 'ND', 'nd': 'ND',
    'ohio': 'OH', 'oh': 'OH', 'oklahoma': 'OK', 'ok': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'pa': 'PA',
    'rhode island': 'RI', 'ri': 'RI', 'south carolina': 'SC', 'sc': 'SC',
    'south dakota': 'SD', 'sd': 'SD', 'tennessee': 'TN', 'tn': 'TN',
    'texas': 'TX', 'tx': 'TX', 'utah': 'UT', 'ut': 'UT',
    'vermont': 'VT', 'vt': 'VT', 'virginia': 'VA', 'va': 'VA',
    'washington': 'WA', 'wa': 'WA', 'west virginia': 'WV', 'wv': 'WV',
    'wisconsin': 'WI', 'wi': 'WI', 'wyoming': 'WY', 'wy': 'WY',
    'puerto rico': 'PR', 'pr': 'PR', 'dc': 'DC', 'district of columbia': 'DC',
  };
  
  const foundStates: string[] = [];
  // Sort by length descending to match "new york" before "or" in "oregon"
  const sortedStateNames = Object.keys(stateMap).sort((a, b) => b.length - a.length);
  
  // Common words that shouldn't match state codes
  const excludeShortCodes = new Set(['in', 'or', 'ok', 'me', 'hi', 'de', 'al', 'la', 'pa', 'id', 'co', 'nd', 'sd', 'mt', 'ne', 'md', 'ma', 'mi', 'mn', 'mo', 'oh']);
  
  for (const name of sortedStateNames) {
    // Skip 2-letter codes that are common English words when not preceded by comma or "state"
    if (name.length === 2 && excludeShortCodes.has(name)) {
      // Only match if it looks like a state reference: "TX" or ", TX" or "state: TX"
      const stateRefRegex = new RegExp(`(?:,\\s*|state[:\\s]+|^)${name}(?:\\s|$|,)`, 'i');
      if (stateRefRegex.test(naturalLanguage)) {
        foundStates.push(stateMap[name]);
      }
    } else {
      // Full state names and non-ambiguous codes use word boundary
      const regex = new RegExp(`\\b${name}\\b`, 'i');
      if (regex.test(lower)) {
        foundStates.push(stateMap[name]);
      }
    }
  }
  if (foundStates.length > 0) {
    query.states = [...new Set(foundStates)]; // Remove duplicates
  }
  
  // COMPREHENSIVE operator list (all major data center operators)
  const operatorMap: Record<string, string> = {
    'google': 'Google', 'alphabet': 'Google',
    'amazon': 'Amazon', 'aws': 'Amazon', 'amazon web services': 'Amazon',
    'microsoft': 'Microsoft', 'azure': 'Microsoft', 'msft': 'Microsoft',
    'meta': 'Meta', 'facebook': 'Meta', 'fb': 'Meta',
    'apple': 'Apple',
    'oracle': 'Oracle', 'oci': 'Oracle',
    'ibm': 'IBM',
    'equinix': 'Equinix',
    'digital realty': 'Digital Realty', 'dlr': 'Digital Realty',
    'cyrusone': 'CyrusOne',
    'coresite': 'CoreSite',
    'qts': 'QTS', 'qts realty': 'QTS',
    'vantage': 'Vantage',
    'switch': 'Switch',
    'flexential': 'Flexential',
    'stack infrastructure': 'Stack Infrastructure',
    'compass': 'Compass Datacenters',
    'aligned': 'Aligned Data Centers',
    'prime': 'Prime Data Centers',
    'edgeconnex': 'EdgeConneX',
    'datacenter': 'DataCenter', // Generic
  };
  
  const foundOperators: string[] = [];
  const sortedOperatorNames = Object.keys(operatorMap).sort((a, b) => b.length - a.length);
  for (const name of sortedOperatorNames) {
    const regex = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(lower)) {
      foundOperators.push(operatorMap[name]);
    }
  }
  if (foundOperators.length > 0) {
    query.operator = [...new Set(foundOperators)];
  }
  
  // TEXT SEARCH: Extract quoted terms or facility names
  const quotedMatch = naturalLanguage.match(/"([^"]+)"/);
  if (quotedMatch) {
    query.textSearch = quotedMatch[1];
  } else {
    // Look for "named X" or "called X" patterns
    const namedMatch = lower.match(/(?:named|called|name)\s+([a-zA-Z0-9\s]+?)(?:\s+in|\s+with|\s+that|$)/i);
    if (namedMatch) {
      query.textSearch = namedMatch[1].trim();
    }
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
 * Convert with automatic fallback (multi-layered)
 * 
 * Conversion layers (in priority order):
 * 1. Adaptive NLP (semantic, learned, or extracted)
 * 2. External AI API (Ollama/OpenAI/Cloudflare)
 * 3. Keyword matching (always works)
 * 
 * Learns from successful conversions to improve over time.
 */
export async function convertNLToQueryWithFallback(
  naturalLanguage: string
): Promise<{
  query: FacilityQuery;
  method: 'adaptive' | 'api' | 'keywords' | 'error';
  provider?: NLQueryProvider;
  confidence?: number;
  error?: string;
  suggestions?: string[];
}> {
  // Ensure adaptive NLP is initialized
  await ensureAdaptiveInit();
  
  // LAYER 1: Adaptive NLP (semantic search + learned patterns + entity extraction)
  try {
    const adaptiveResult = await adaptiveConvert(naturalLanguage);
    
    // If high confidence, use adaptive result
    if (adaptiveResult.confidence >= 0.7) {
      // Update context for conversational queries
      updateContext(naturalLanguage, adaptiveResult.query);
      
      // Learn from this if it came from extraction (API fallback will teach later)
      if (adaptiveResult.method === 'extracted') {
        await learnFromSuccess(naturalLanguage, adaptiveResult.query, 'api');
      }
      
      console.log(`[NLQueryConverter] Adaptive conversion (${adaptiveResult.method}): confidence=${adaptiveResult.confidence.toFixed(2)}`);
      
      return {
        query: adaptiveResult.query,
        method: 'adaptive',
        provider: `adaptive-${adaptiveResult.method}` as NLQueryProvider,
        confidence: adaptiveResult.confidence,
        suggestions: adaptiveResult.suggestions,
      };
    }
    
    // Low confidence adaptive result - continue to API
    console.log(`[NLQueryConverter] Adaptive confidence low (${adaptiveResult.confidence.toFixed(2)}), trying API...`);
  } catch (adaptiveError) {
    console.warn('[NLQueryConverter] Adaptive conversion failed:', adaptiveError);
  }
  
  // LAYER 2: External AI API
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
    
    // Learn from successful API conversion
    await learnFromSuccess(naturalLanguage, query, 'api');
    updateContext(naturalLanguage, query);
    
    console.log(`[NLQueryConverter] API conversion successful (${result.provider})`);
    
    return { 
      query, 
      method: 'api', 
      provider: result.provider as NLQueryProvider,
      confidence: 0.9,
    };
  } catch (error) {
    console.warn('[NLQueryConverter] API conversion failed, using keyword matching:', error);
    
    // LAYER 3: Keyword matching
    try {
      const query = convertNLToQueryKeywords(naturalLanguage);
      updateContext(naturalLanguage, query);
      
      return { 
        query, 
        method: 'keywords',
        provider: 'keywords',
        confidence: 0.5,
        error: error instanceof Error ? error.message : 'API conversion failed',
        suggestions: generateSuggestions(naturalLanguage),
      };
    } catch (fallbackError) {
      // All methods failed - return empty query with suggestions
      return {
        query: { limit: 100 },
        method: 'error',
        provider: 'keywords',
        confidence: 0.1,
        error: 'Could not parse query. Try being more specific (e.g., "Show me facilities in Texas").',
        suggestions: getExampleQueries(),
      };
    }
  }
}

/**
 * Advanced query conversion with full metadata
 * Use this for detailed debugging and UI feedback
 */
export async function convertNLToQueryAdvanced(
  naturalLanguage: string
): Promise<{
  query: FacilityQuery;
  method: 'adaptive' | 'api' | 'keywords' | 'error';
  provider: NLQueryProvider;
  confidence: number;
  extractedInfo: ExtractedQueryInfo | null;
  suggestions: string[];
  synonymsExpanded: string[];
  error?: string;
}> {
  await ensureAdaptiveInit();
  
  // Extract full information regardless of method
  let extractedInfo: ExtractedQueryInfo | null = null;
  try {
    extractedInfo = await extractQueryInfo(naturalLanguage);
  } catch (e) {
    console.warn('[NLQueryConverter] Entity extraction failed:', e);
  }
  
  // Get synonyms expansion
  const synonymsExpanded = expandQueryWithSynonyms(naturalLanguage);
  
  // Run main conversion
  const result = await convertNLToQueryWithFallback(naturalLanguage);
  
  return {
    ...result,
    provider: result.provider || 'keywords',
    confidence: result.confidence || 0.5,
    extractedInfo,
    suggestions: result.suggestions || generateSuggestions(naturalLanguage),
    synonymsExpanded,
  };
}

/**
 * Get example queries for UI suggestions
 */
export function getExampleQueries(): string[] {
  return EXAMPLE_QUERIES.map(eq => eq.nl);
}

/**
 * Get smart suggestions based on partial input
 */
export function getSmartSuggestions(partialQuery: string): string[] {
  return generateSuggestions(partialQuery);
}

/**
 * Get synonyms for a term (useful for query expansion)
 */
export { getSynonyms, expandQueryWithSynonyms };

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

/**
 * Provide user feedback to improve learning
 * Call this when user confirms a query worked well
 */
export async function provideFeedback(
  naturalLanguage: string, 
  query: FacilityQuery, 
  wasSuccessful: boolean
): Promise<void> {
  if (wasSuccessful) {
    await learnFromSuccess(naturalLanguage, query, 'user-feedback');
  }
}

// Re-export adaptive NLP types for consumers
export type { ExtractedQueryInfo } from '../ai/adaptiveNLP';

