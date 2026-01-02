/**
 * Natural Language to Structured Query Converter
 * Converts user's natural language into structured facility queries
 * Uses OpenAI GPT-4 with structured outputs (Zod schema)
 */

import OpenAI from 'openai';
import { zodResponseFormat } from 'openai/helpers/zod';
import { FacilityQuerySchema, type FacilityQuery, EXAMPLE_QUERIES } from '../schemas/facilityQuery';
import { loadAIConfig } from './apiKeyManager';
import { SYSTEM_PROMPTS } from '../ai/config';

/**
 * Convert natural language query to structured query using OpenAI
 */
export async function convertNLToQuery(
  naturalLanguage: string
): Promise<FacilityQuery> {
  // Load API configuration
  const config = loadAIConfig();
  
  if (!config || !config.enabled || !config.apiKey) {
    throw new Error('AI features not configured. Please add your API key in Settings.');
  }
  
  if (config.provider !== 'openai') {
    throw new Error('Natural language search currently only supports OpenAI. Please configure OpenAI in Settings.');
  }
  
  // Initialize OpenAI client
  const openai = new OpenAI({
    apiKey: config.apiKey,
    dangerouslyAllowBrowser: true // Client-side usage
  });
  
  try {
    // Call OpenAI with structured output
    const completion = await openai.beta.chat.completions.parse({
      model: config.model || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: SYSTEM_PROMPTS.query
        },
        {
          role: 'user',
          content: `Convert this natural language query into a structured facility query:\n\n"${naturalLanguage}"\n\nReturn a JSON object matching the FacilityQuery schema. If the user doesn't specify sorting, use sensible defaults (e.g., sort by subsidyGap desc for compliance queries, by name asc otherwise). Default limit to 100 unless specified.`
        }
      ],
      response_format: zodResponseFormat(FacilityQuerySchema, 'facility_query'),
      temperature: 0 // Deterministic for consistent parsing
    });
    
    const parsed = completion.choices[0].message.parsed;
    
    if (!parsed) {
      throw new Error('Failed to parse query from AI response');
    }
    
    return parsed;
  } catch (error) {
    console.error('OpenAI API error:', error);
    
    if (error instanceof Error) {
      // Check for common error types
      if (error.message.includes('401')) {
        throw new Error('Invalid API key. Please check your Settings.');
      } else if (error.message.includes('429')) {
        throw new Error('Rate limit exceeded. Please try again in a moment.');
      } else if (error.message.includes('quota')) {
        throw new Error('API quota exceeded. Please check your OpenAI account.');
      }
      
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
): Promise<{ query: FacilityQuery; method: 'api' | 'keywords' | 'error'; error?: string }> {
  try {
    const query = await convertNLToQuery(naturalLanguage);
    return { query, method: 'api' };
  } catch (error) {
    console.warn('API conversion failed, using keyword matching:', error);
    
    // Try keyword fallback
    try {
      const query = convertNLToQueryKeywords(naturalLanguage);
      return { 
        query, 
        method: 'keywords',
        error: error instanceof Error ? error.message : 'API conversion failed'
      };
    } catch (fallbackError) {
      // Both failed - return empty query
      return {
        query: { limit: 100 },
        method: 'error',
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

