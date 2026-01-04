/**
 * Adaptive NLP Search Engine
 * 
 * A self-learning, dynamically evolving natural language search system that:
 * - Learns from successful queries to improve pattern matching
 * - Uses semantic embeddings for similarity-based search
 * - Extracts entities and intent from natural language
 * - Expands queries with synonyms and related terms
 * - Maintains conversation context for multi-turn queries
 * - Generates better query suggestions
 * 
 * Works offline-first with graceful degradation through multiple layers:
 * 1. Semantic search (if embeddings available)
 * 2. Learned patterns (from past successful queries)
 * 3. Intent + entity extraction
 * 4. Keyword fallback (always works)
 * 
 * @module adaptiveNLP
 */

import { type FacilityQuery, EXAMPLE_QUERIES, FacilityQuerySchema } from '../schemas/facilityQuery';
import { extractEntities, classifyText, generateEmbedding, cosineSimilarity, type Entity } from './localTransformers';
import { getSettings, saveSettings, settingsKey } from '../utils/settingsPersistence';
import { trackError } from '../utils/errorTracking';

// ═══════════════════════════════════════════════════════════════════════════
// Types & Interfaces
// ═══════════════════════════════════════════════════════════════════════════

export interface QueryIntent {
  primary: 'search' | 'compare' | 'aggregate' | 'export' | 'analyze' | 'list';
  confidence: number;
  modifiers: string[];
}

export interface ExtractedQueryInfo {
  intent: QueryIntent;
  entities: Entity[];
  operators: string[];
  locations: { states: string[]; cities: string[] };
  metrics: { field: string; operator: '<' | '>' | '=' | 'between'; value: number; value2?: number }[];
  timeframe: { type: 'after' | 'before' | 'between'; date1?: string; date2?: string } | null;
  complianceFilters: ('Compliant' | 'At Risk' | 'Non-Compliant')[];
  facilityTypes: string[];
  freeText: string[];
}

export interface LearnedPattern {
  id: string;
  pattern: string;        // Regex pattern
  queryTemplate: Partial<FacilityQuery>;
  confidence: number;
  usageCount: number;
  lastUsed: number;
  source: 'example' | 'learned' | 'user-feedback';
}

export interface SynonymMapping {
  canonical: string;
  synonyms: string[];
  category: 'operator' | 'location' | 'metric' | 'status' | 'type' | 'action';
}

export interface ConversationContext {
  previousQueries: { nl: string; structured: FacilityQuery; timestamp: number }[];
  currentFilters: Partial<FacilityQuery>;
  focusedFacilities: number[];  // IDs of facilities user clicked on
  sessionStart: number;
}

export interface AdaptiveNLPConfig {
  enableSemanticSearch: boolean;
  enableLearning: boolean;
  enableIntentClassification: boolean;
  minPatternConfidence: number;
  maxLearnedPatterns: number;
  contextWindowSize: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// Comprehensive Synonym Database
// ═══════════════════════════════════════════════════════════════════════════

const SYNONYM_DATABASE: SynonymMapping[] = [
  // Operators
  { canonical: 'Amazon', synonyms: ['amazon', 'aws', 'amazon web services', 'bezos'], category: 'operator' },
  { canonical: 'Google', synonyms: ['google', 'gcp', 'google cloud', 'alphabet', 'googl'], category: 'operator' },
  { canonical: 'Microsoft', synonyms: ['microsoft', 'azure', 'msft', 'ms'], category: 'operator' },
  { canonical: 'Meta', synonyms: ['meta', 'facebook', 'fb', 'zuckerberg', 'instagram'], category: 'operator' },
  { canonical: 'Apple', synonyms: ['apple', 'aapl', 'icloud'], category: 'operator' },
  { canonical: 'Oracle', synonyms: ['oracle', 'orcl', 'oracle cloud'], category: 'operator' },
  { canonical: 'IBM', synonyms: ['ibm', 'international business machines'], category: 'operator' },
  { canonical: 'Equinix', synonyms: ['equinix', 'eqix'], category: 'operator' },
  { canonical: 'Digital Realty', synonyms: ['digital realty', 'dlr', 'digitalrealty'], category: 'operator' },
  { canonical: 'CyrusOne', synonyms: ['cyrusone', 'cyrus one', 'cone'], category: 'operator' },
  { canonical: 'QTS', synonyms: ['qts', 'qts realty', 'qts data centers'], category: 'operator' },
  { canonical: 'Vantage', synonyms: ['vantage', 'vantage data centers', 'vdc'], category: 'operator' },
  { canonical: 'Switch', synonyms: ['switch', 'swch'], category: 'operator' },
  { canonical: 'NTT', synonyms: ['ntt', 'ntt communications', 'ntt global'], category: 'operator' },
  { canonical: 'Lumen', synonyms: ['lumen', 'centurylink', 'century link', 'ctl'], category: 'operator' },
  
  // Compliance statuses
  { canonical: 'Non-Compliant', synonyms: ['non-compliant', 'noncompliant', 'failing', 'violations', 'breaking promises', 'broken promises', 'bad'], category: 'status' },
  { canonical: 'At Risk', synonyms: ['at risk', 'at-risk', 'risky', 'warning', 'concerning', 'watch'], category: 'status' },
  { canonical: 'Compliant', synonyms: ['compliant', 'good', 'meeting promises', 'on track', 'successful'], category: 'status' },
  
  // Facility types
  { canonical: 'Hyperscale', synonyms: ['hyperscale', 'hyper-scale', 'mega', 'large scale', 'massive'], category: 'type' },
  { canonical: 'Colocation', synonyms: ['colocation', 'colo', 'co-location', 'colocated'], category: 'type' },
  { canonical: 'Edge', synonyms: ['edge', 'edge computing', 'micro', 'distributed'], category: 'type' },
  { canonical: 'Enterprise', synonyms: ['enterprise', 'corporate', 'private'], category: 'type' },
  { canonical: 'POP', synonyms: ['pop', 'point of presence', 'network pop'], category: 'type' },
  { canonical: 'CDN', synonyms: ['cdn', 'content delivery', 'cache'], category: 'type' },
  
  // Metrics
  { canonical: 'subsidyGap', synonyms: ['subsidy gap', 'gap', 'shortfall', 'deficit', 'money owed', 'unpaid'], category: 'metric' },
  { canonical: 'subsidyReceived', synonyms: ['subsidy', 'subsidies', 'tax breaks', 'incentives', 'money received'], category: 'metric' },
  { canonical: 'jobsCreated', synonyms: ['jobs created', 'jobs made', 'employed', 'hired', 'employment'], category: 'metric' },
  { canonical: 'jobsPromised', synonyms: ['jobs promised', 'jobs committed', 'job promises'], category: 'metric' },
  { canonical: 'capacity', synonyms: ['capacity', 'power', 'megawatts', 'mw', 'size'], category: 'metric' },
  
  // Actions/Intents
  { canonical: 'search', synonyms: ['show', 'find', 'get', 'list', 'display', 'search', 'look for', 'which', 'what'], category: 'action' },
  { canonical: 'compare', synonyms: ['compare', 'versus', 'vs', 'difference between', 'contrast'], category: 'action' },
  { canonical: 'aggregate', synonyms: ['total', 'sum', 'count', 'how many', 'aggregate', 'summarize'], category: 'action' },
  { canonical: 'analyze', synonyms: ['analyze', 'breakdown', 'explain', 'why', 'investigate'], category: 'action' },
  { canonical: 'export', synonyms: ['export', 'download', 'save', 'report', 'pdf', 'csv'], category: 'action' },
];

// ═══════════════════════════════════════════════════════════════════════════
// Learned Patterns Storage
// ═══════════════════════════════════════════════════════════════════════════

const PATTERNS_KEY = settingsKey('nlp_learned_patterns');
const CONTEXT_KEY = settingsKey('nlp_conversation_context');
const EMBEDDINGS_CACHE_KEY = settingsKey('nlp_embeddings_cache');

let learnedPatterns: LearnedPattern[] = [];
let embeddingsCache: Map<string, number[]> = new Map();
let conversationContext: ConversationContext = {
  previousQueries: [],
  currentFilters: {},
  focusedFacilities: [],
  sessionStart: Date.now(),
};

// Default config
const config: AdaptiveNLPConfig = {
  enableSemanticSearch: true,
  enableLearning: true,
  enableIntentClassification: true,
  minPatternConfidence: 0.6,
  maxLearnedPatterns: 500,
  contextWindowSize: 10,
};

/**
 * Initialize the adaptive NLP system
 * Loads learned patterns and pre-computed embeddings from IndexedDB
 */
export async function initAdaptiveNLP(): Promise<void> {
  try {
    // Load learned patterns
    const storedPatterns = await getSettings<LearnedPattern[]>(PATTERNS_KEY);
    if (storedPatterns) {
      learnedPatterns = storedPatterns;
      console.log(`[AdaptiveNLP] Loaded ${learnedPatterns.length} learned patterns`);
    } else {
      // Initialize with example queries as seed patterns
      learnedPatterns = EXAMPLE_QUERIES.map((eq, i) => ({
        id: `seed_${i}`,
        pattern: generatePatternFromQuery(eq.nl),
        queryTemplate: eq.structured,
        confidence: 0.95,
        usageCount: 0,
        lastUsed: Date.now(),
        source: 'example' as const,
      }));
      await saveSettings(PATTERNS_KEY, learnedPatterns);
      console.log(`[AdaptiveNLP] Initialized with ${learnedPatterns.length} seed patterns`);
    }
    
    // Load embeddings cache
    const storedEmbeddings = await getSettings<[string, number[]][]>(EMBEDDINGS_CACHE_KEY);
    if (storedEmbeddings) {
      embeddingsCache = new Map(storedEmbeddings);
      console.log(`[AdaptiveNLP] Loaded ${embeddingsCache.size} cached embeddings`);
    }
    
    // Load conversation context
    const storedContext = await getSettings<ConversationContext>(CONTEXT_KEY);
    if (storedContext && (Date.now() - storedContext.sessionStart) < 3600000) {
      // Only restore context if session is less than 1 hour old
      conversationContext = storedContext;
    }
  } catch (error) {
    trackError(error instanceof Error ? error : new Error(String(error)), {
      context: 'AdaptiveNLP.init',
    });
  }
}

/**
 * Generate a flexible regex pattern from a natural language query
 */
function generatePatternFromQuery(nl: string): string {
  // Replace specific values with regex groups
  return nl.toLowerCase()
    // Replace operator names with group
    .replace(/\b(amazon|google|microsoft|meta|apple|equinix|aws|gcp|azure)\b/gi, '(?<operator>\\w+)')
    // Replace state names/codes with group
    .replace(/\b(texas|california|new york|virginia|tx|ca|ny|va)\b/gi, '(?<state>\\w+(?:\\s\\w+)?)')
    // Replace numbers with group
    .replace(/\$?\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:million|billion|M|B))?/gi, '(?<amount>[\\d.,]+\\s*(?:million|billion|M|B)?)')
    // Escape special characters
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    // Make whitespace flexible
    .replace(/\s+/g, '\\s+');
}

// ═══════════════════════════════════════════════════════════════════════════
// Intent Classification
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Classify the user's intent from their query
 */
export async function classifyIntent(nl: string): Promise<QueryIntent> {
  const lower = nl.toLowerCase();
  
  // Check for explicit action words first
  const actionPatterns: Record<QueryIntent['primary'], RegExp[]> = {
    search: [/^show\b/, /^find\b/, /^get\b/, /^list\b/, /which\b/, /where\b/],
    compare: [/compare\b/, /\bvs\b/, /versus\b/, /difference\b/],
    aggregate: [/how many\b/, /total\b/, /count\b/, /sum\b/],
    analyze: [/why\b/, /analyze\b/, /explain\b/, /breakdown\b/],
    export: [/export\b/, /download\b/, /report\b/, /pdf\b/, /csv\b/],
    list: [/^all\b/, /^every\b/],
  };
  
  let detected: QueryIntent['primary'] = 'search';
  let confidence = 0.5;
  
  for (const [intent, patterns] of Object.entries(actionPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(lower)) {
        detected = intent as QueryIntent['primary'];
        confidence = 0.85;
        break;
      }
    }
    if (confidence > 0.5) break;
  }
  
  // Try ML classification if available
  if (config.enableIntentClassification) {
    try {
      const mlIntent = await classifyText(nl, ['search facilities', 'compare data', 'count totals', 'analyze trends', 'export report']);
      if (mlIntent.length > 0 && mlIntent[0].score > confidence) {
        const mlIntentMap: Record<string, QueryIntent['primary']> = {
          'search facilities': 'search',
          'compare data': 'compare',
          'count totals': 'aggregate',
          'analyze trends': 'analyze',
          'export report': 'export',
        };
        detected = mlIntentMap[mlIntent[0].label] || detected;
        confidence = mlIntent[0].score;
      }
    } catch {
      // ML not available, stick with rule-based
    }
  }
  
  // Detect modifiers
  const modifiers: string[] = [];
  if (/\blargest\b|\bbiggest\b|\bmost\b|\btop\b/i.test(lower)) modifiers.push('superlative');
  if (/\bworst\b|\bsmallest\b|\bfewest\b|\bbottom\b/i.test(lower)) modifiers.push('bottom');
  if (/\brecent\b|\bnew\b|\blatest\b/i.test(lower)) modifiers.push('recent');
  if (/\bonly\b|\bjust\b|\bexactly\b/i.test(lower)) modifiers.push('exact');
  
  return { primary: detected, confidence, modifiers };
}

// ═══════════════════════════════════════════════════════════════════════════
// Entity & Filter Extraction
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Extract all relevant information from a natural language query
 */
export async function extractQueryInfo(nl: string): Promise<ExtractedQueryInfo> {
  const lower = nl.toLowerCase();
  const intent = await classifyIntent(nl);
  
  // Extract entities using local NLP (with regex fallback)
  const entities = await extractEntities(nl);
  
  // Extract operators (using synonyms)
  const operators: string[] = [];
  for (const synonym of SYNONYM_DATABASE.filter(s => s.category === 'operator')) {
    for (const term of synonym.synonyms) {
      if (lower.includes(term.toLowerCase())) {
        operators.push(synonym.canonical);
        break;
      }
    }
  }
  
  // Extract locations
  const states: string[] = [];
  const cities: string[] = [];
  
  // State extraction (reusing existing logic)
  const stateMap: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
    'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
    'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
    'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
    'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
    'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
    'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
    'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
    'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
    'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
    'wisconsin': 'WI', 'wyoming': 'WY', 'puerto rico': 'PR', 'dc': 'DC',
  };
  
  for (const [name, code] of Object.entries(stateMap)) {
    const regex = new RegExp(`\\b${name}\\b`, 'i');
    if (regex.test(lower)) {
      states.push(code);
    }
  }
  
  // Also check for state codes
  const stateCodeMatch = nl.match(/\b([A-Z]{2})\b/g);
  if (stateCodeMatch) {
    const validCodes = new Set(Object.values(stateMap));
    for (const code of stateCodeMatch) {
      if (validCodes.has(code) && !states.includes(code)) {
        states.push(code);
      }
    }
  }
  
  // Extract city names from entities
  for (const entity of entities) {
    if (entity.type === 'LOCATION') {
      cities.push(entity.text);
    }
  }
  
  // Extract numeric metrics
  const metrics: ExtractedQueryInfo['metrics'] = [];
  
  // Money patterns
  const moneyPatterns = [
    { regex: /(?:over|more than|>|at least)\s*\$?([\d,.]+)\s*(million|billion|m|b)?/gi, operator: '>' as const },
    { regex: /(?:under|less than|<|at most)\s*\$?([\d,.]+)\s*(million|billion|m|b)?/gi, operator: '<' as const },
    { regex: /\$?([\d,.]+)\s*(million|billion|m|b)?\s*(?:to|-)\s*\$?([\d,.]+)\s*(million|billion|m|b)?/gi, operator: 'between' as const },
  ];
  
  for (const { regex, operator } of moneyPatterns) {
    let match;
    while ((match = regex.exec(lower)) !== null) {
      const value1 = parseMoneyValue(match[1], match[2]);
      const isGap = /gap|shortfall|deficit|owed/i.test(lower);
      const isSubsidy = /subsidy|subsidies|tax break|incentive/i.test(lower);
      
      if (operator === 'between' && match[3]) {
        const value2 = parseMoneyValue(match[3], match[4]);
        metrics.push({
          field: isGap ? 'subsidyGap' : 'subsidyReceived',
          operator,
          value: Math.min(value1, value2),
          value2: Math.max(value1, value2),
        });
      } else {
        metrics.push({
          field: isGap ? 'subsidyGap' : (isSubsidy ? 'subsidyReceived' : 'subsidyGap'),
          operator,
          value: value1,
        });
      }
    }
  }
  
  // Job patterns
  const jobPatterns = [
    { regex: /(?:created|made|hired)\s*(?:fewer than|less than|<)\s*(\d+)\s*jobs/gi, field: 'jobsCreated', operator: '<' as const },
    { regex: /(?:created|made|hired)\s*(?:more than|over|>)\s*(\d+)\s*jobs/gi, field: 'jobsCreated', operator: '>' as const },
    { regex: /(?:promised)\s*(?:more than|over|>)\s*(\d+)\s*jobs/gi, field: 'jobsPromised', operator: '>' as const },
    { regex: /(\d+)\s*jobs\s*(?:created|made)/gi, field: 'jobsCreated', operator: '>' as const },
  ];
  
  for (const { regex, field, operator } of jobPatterns) {
    let match;
    while ((match = regex.exec(lower)) !== null) {
      metrics.push({ field, operator, value: parseInt(match[1]) });
    }
  }
  
  // Capacity patterns
  const capacityMatch = lower.match(/(\d+)\s*(mw|megawatt)/i);
  if (capacityMatch) {
    const isOver = /over|more than|>|at least/i.test(lower);
    metrics.push({
      field: 'capacity',
      operator: isOver ? '>' : '<',
      value: parseInt(capacityMatch[1]),
    });
  }
  
  // Extract compliance filters
  const complianceFilters: ExtractedQueryInfo['complianceFilters'] = [];
  for (const synonym of SYNONYM_DATABASE.filter(s => s.category === 'status')) {
    for (const term of synonym.synonyms) {
      if (lower.includes(term)) {
        complianceFilters.push(synonym.canonical as 'Compliant' | 'At Risk' | 'Non-Compliant');
        break;
      }
    }
  }
  
  // Extract facility types
  const facilityTypes: string[] = [];
  for (const synonym of SYNONYM_DATABASE.filter(s => s.category === 'type')) {
    for (const term of synonym.synonyms) {
      if (lower.includes(term)) {
        facilityTypes.push(synonym.canonical);
        break;
      }
    }
  }
  
  // Extract timeframe
  let timeframe: ExtractedQueryInfo['timeframe'] = null;
  const yearMatch = lower.match(/(after|since|before|in)\s+(\d{4})/i);
  if (yearMatch) {
    const direction = yearMatch[1].toLowerCase();
    const year = yearMatch[2];
    if (direction === 'after' || direction === 'since') {
      timeframe = { type: 'after', date1: `${year}-01-01` };
    } else if (direction === 'before') {
      timeframe = { type: 'before', date1: `${year}-12-31` };
    } else {
      timeframe = { type: 'between', date1: `${year}-01-01`, date2: `${year}-12-31` };
    }
  }
  
  // Extract free text (quoted or remaining unmatched terms)
  const freeText: string[] = [];
  const quotedMatch = nl.match(/"([^"]+)"/g);
  if (quotedMatch) {
    for (const quoted of quotedMatch) {
      freeText.push(quoted.replace(/"/g, ''));
    }
  }
  
  return {
    intent,
    entities,
    operators: [...new Set(operators)],
    locations: { states: [...new Set(states)], cities: [...new Set(cities)] },
    metrics,
    timeframe,
    complianceFilters: [...new Set(complianceFilters)],
    facilityTypes: [...new Set(facilityTypes)],
    freeText,
  };
}

function parseMoneyValue(numStr: string, unit?: string): number {
  const num = parseFloat(numStr.replace(/,/g, ''));
  const unitLower = (unit || '').toLowerCase();
  
  if (unitLower === 'billion' || unitLower === 'b') return num * 1e9;
  if (unitLower === 'million' || unitLower === 'm') return num * 1e6;
  
  // If no unit but number is small, assume millions
  if (!unit && num < 1000) return num * 1e6;
  
  return num;
}

// ═══════════════════════════════════════════════════════════════════════════
// Query Building from Extracted Info
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Build a structured FacilityQuery from extracted information
 */
export function buildQueryFromInfo(info: ExtractedQueryInfo): FacilityQuery {
  const query: FacilityQuery = {};
  
  // Operators
  if (info.operators.length > 0) {
    query.operator = info.operators;
  }
  
  // States
  if (info.locations.states.length > 0) {
    query.states = info.locations.states;
  }
  
  // City (take first if multiple)
  if (info.locations.cities.length > 0) {
    query.city = info.locations.cities[0];
  }
  
  // Compliance
  if (info.complianceFilters.length > 0) {
    query.complianceStatuses = info.complianceFilters;
  }
  
  // Facility types
  if (info.facilityTypes.length > 0) {
    query.facilityTypes = info.facilityTypes as FacilityQuery['facilityTypes'];
  }
  
  // Metrics
  for (const metric of info.metrics) {
    if (metric.field === 'subsidyGap') {
      if (metric.operator === '>') query.subsidyGapMin = metric.value;
      else if (metric.operator === '<') query.subsidyGapMax = metric.value;
      else if (metric.operator === 'between') {
        query.subsidyGapMin = metric.value;
        query.subsidyGapMax = metric.value2;
      }
    } else if (metric.field === 'subsidyReceived') {
      if (metric.operator === '>') query.subsidyMin = metric.value;
      else if (metric.operator === '<') query.subsidyMax = metric.value;
    } else if (metric.field === 'jobsCreated') {
      if (metric.operator === '>') query.jobsCreatedMin = metric.value;
      else if (metric.operator === '<') query.jobsCreatedMax = metric.value;
    } else if (metric.field === 'jobsPromised') {
      if (metric.operator === '>') query.jobsPromisedMin = metric.value;
      else if (metric.operator === '<') query.jobsPromisedMax = metric.value;
    } else if (metric.field === 'capacity') {
      if (metric.operator === '>') query.capacityMin = metric.value;
      else if (metric.operator === '<') query.capacityMax = metric.value;
    }
  }
  
  // Timeframe
  if (info.timeframe) {
    if (info.timeframe.type === 'after') {
      query.openedAfter = info.timeframe.date1;
    } else if (info.timeframe.type === 'before') {
      query.openedBefore = info.timeframe.date1;
    } else if (info.timeframe.type === 'between') {
      query.openedAfter = info.timeframe.date1;
      query.openedBefore = info.timeframe.date2;
    }
  }
  
  // Free text search
  if (info.freeText.length > 0) {
    query.textSearch = info.freeText.join(' ');
  }
  
  // Apply intent-based sorting
  if (info.intent.modifiers.includes('superlative')) {
    if (info.metrics.some(m => m.field === 'subsidyGap')) {
      query.sortBy = 'subsidyGap';
      query.sortDirection = 'desc';
    } else if (info.metrics.some(m => m.field === 'capacity')) {
      query.sortBy = 'capacity';
      query.sortDirection = 'desc';
    } else if (info.complianceFilters.includes('Non-Compliant')) {
      query.sortBy = 'subsidyGap';
      query.sortDirection = 'desc';
    }
  } else if (info.intent.modifiers.includes('bottom')) {
    query.sortDirection = 'asc';
  } else if (info.intent.modifiers.includes('recent')) {
    query.sortBy = 'openedDate';
    query.sortDirection = 'desc';
  }
  
  // Default sorting
  if (!query.sortBy) {
    if (info.complianceFilters.length > 0) {
      query.sortBy = 'subsidyGap';
      query.sortDirection = 'desc';
    } else {
      query.sortBy = 'name';
      query.sortDirection = 'asc';
    }
  }
  
  // Default limit
  query.limit = 100;
  
  return query;
}

// ═══════════════════════════════════════════════════════════════════════════
// Semantic Search with Embeddings
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Find similar queries using semantic embeddings
 */
export async function findSimilarQueries(nl: string): Promise<{ pattern: LearnedPattern; similarity: number }[]> {
  if (!config.enableSemanticSearch) return [];
  
  try {
    // Get embedding for input query
    let queryEmbedding = embeddingsCache.get(nl);
    if (!queryEmbedding) {
      queryEmbedding = await generateEmbedding(nl) ?? undefined;
      if (queryEmbedding) {
        embeddingsCache.set(nl, queryEmbedding);
      }
    }
    
    if (!queryEmbedding) return [];
    
    // Compare against learned patterns
    const similarities: { pattern: LearnedPattern; similarity: number }[] = [];
    
    for (const pattern of learnedPatterns) {
      // Get or compute embedding for pattern
      let patternEmbedding = embeddingsCache.get(pattern.pattern);
      if (!patternEmbedding) {
        patternEmbedding = await generateEmbedding(pattern.pattern) ?? undefined;
        if (patternEmbedding) {
          embeddingsCache.set(pattern.pattern, patternEmbedding);
        }
      }
      
      if (patternEmbedding) {
        const similarity = cosineSimilarity(queryEmbedding, patternEmbedding);
        if (similarity > 0.7) {
          similarities.push({ pattern, similarity });
        }
      }
    }
    
    // Sort by similarity
    return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  } catch (error) {
    console.warn('[AdaptiveNLP] Semantic search failed:', error);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Learning & Feedback
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Learn from a successful query conversion
 */
export async function learnFromSuccess(nl: string, structuredQuery: FacilityQuery, source: 'api' | 'user-feedback'): Promise<void> {
  if (!config.enableLearning) return;
  
  try {
    const pattern: LearnedPattern = {
      id: `learned_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      pattern: nl.toLowerCase(),
      queryTemplate: structuredQuery,
      confidence: source === 'user-feedback' ? 0.95 : 0.75,
      usageCount: 1,
      lastUsed: Date.now(),
      source: source === 'user-feedback' ? 'user-feedback' : 'learned',
    };
    
    // Check for duplicate patterns
    const existingIdx = learnedPatterns.findIndex(p => 
      p.pattern.toLowerCase() === nl.toLowerCase()
    );
    
    if (existingIdx >= 0) {
      // Update existing pattern
      learnedPatterns[existingIdx].usageCount++;
      learnedPatterns[existingIdx].lastUsed = Date.now();
      learnedPatterns[existingIdx].confidence = Math.min(0.99, learnedPatterns[existingIdx].confidence + 0.01);
    } else {
      // Add new pattern
      learnedPatterns.push(pattern);
      
      // Prune old patterns if over limit
      if (learnedPatterns.length > config.maxLearnedPatterns) {
        // Remove lowest confidence, least recently used patterns
        learnedPatterns.sort((a, b) => {
          const scoreA = a.confidence * 0.7 + (a.lastUsed / Date.now()) * 0.3;
          const scoreB = b.confidence * 0.7 + (b.lastUsed / Date.now()) * 0.3;
          return scoreB - scoreA;
        });
        learnedPatterns = learnedPatterns.slice(0, config.maxLearnedPatterns);
      }
    }
    
    // Persist
    await saveSettings(PATTERNS_KEY, learnedPatterns);
    
    console.log(`[AdaptiveNLP] Learned pattern: "${nl.slice(0, 50)}..."`);
  } catch (error) {
    trackError(error instanceof Error ? error : new Error(String(error)), {
      context: 'AdaptiveNLP.learnFromSuccess',
    });
  }
}

/**
 * Update conversation context
 */
export function updateContext(nl: string, structured: FacilityQuery): void {
  conversationContext.previousQueries.push({
    nl,
    structured,
    timestamp: Date.now(),
  });
  
  // Keep only recent queries
  if (conversationContext.previousQueries.length > config.contextWindowSize) {
    conversationContext.previousQueries = conversationContext.previousQueries.slice(-config.contextWindowSize);
  }
  
  // Merge filters
  conversationContext.currentFilters = { ...conversationContext.currentFilters, ...structured };
  
  // Persist (async, non-blocking)
  saveSettings(CONTEXT_KEY, conversationContext).catch(() => {});
}

/**
 * Apply context to refine a query
 */
export function applyContext(query: FacilityQuery): FacilityQuery {
  // If query is mostly empty but we have context, inherit from context
  const hasFilters = Object.keys(query).some(k => 
    k !== 'sortBy' && k !== 'sortDirection' && k !== 'limit' && query[k as keyof FacilityQuery]
  );
  
  if (!hasFilters && Object.keys(conversationContext.currentFilters).length > 0) {
    return { ...conversationContext.currentFilters, ...query };
  }
  
  return query;
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Adaptive Conversion Function
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Convert natural language to structured query using adaptive NLP
 * Combines multiple strategies: semantic search, learned patterns, entity extraction
 */
export async function adaptiveConvert(nl: string): Promise<{
  query: FacilityQuery;
  method: 'semantic' | 'learned' | 'extracted' | 'fallback';
  confidence: number;
  suggestions?: string[];
}> {
  const lower = nl.toLowerCase().trim();
  
  // Strategy 1: Check for exact match in learned patterns
  const exactMatch = learnedPatterns.find(p => p.pattern.toLowerCase() === lower);
  if (exactMatch && exactMatch.confidence >= config.minPatternConfidence) {
    exactMatch.usageCount++;
    exactMatch.lastUsed = Date.now();
    return {
      query: exactMatch.queryTemplate as FacilityQuery,
      method: 'learned',
      confidence: exactMatch.confidence,
    };
  }
  
  // Strategy 2: Semantic similarity search
  const similarQueries = await findSimilarQueries(nl);
  if (similarQueries.length > 0 && similarQueries[0].similarity > 0.85) {
    const best = similarQueries[0];
    return {
      query: best.pattern.queryTemplate as FacilityQuery,
      method: 'semantic',
      confidence: best.similarity,
      suggestions: similarQueries.slice(1).map(sq => sq.pattern.pattern),
    };
  }
  
  // Strategy 3: Entity extraction and query building
  const info = await extractQueryInfo(nl);
  const extractedQuery = buildQueryFromInfo(info);
  
  // Apply context
  const contextualQuery = applyContext(extractedQuery);
  
  // Validate
  const validation = FacilityQuerySchema.safeParse(contextualQuery);
  if (validation.success) {
    return {
      query: validation.data,
      method: 'extracted',
      confidence: info.intent.confidence,
    };
  }
  
  // Strategy 4: Fallback
  return {
    query: { limit: 100, sortBy: 'name', sortDirection: 'asc' },
    method: 'fallback',
    confidence: 0.3,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Query Suggestions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate smart query suggestions based on partial input
 */
export function generateSuggestions(partialQuery: string): string[] {
  const lower = partialQuery.toLowerCase();
  const suggestions: string[] = [];
  
  // Add context-aware suggestions
  if (conversationContext.currentFilters.states?.length) {
    const state = conversationContext.currentFilters.states[0];
    suggestions.push(`Non-compliant facilities in ${state}`);
    suggestions.push(`Largest facilities in ${state}`);
  }
  
  if (conversationContext.currentFilters.operator?.length) {
    const op = conversationContext.currentFilters.operator[0];
    suggestions.push(`${op} facilities with high subsidy gaps`);
    suggestions.push(`${op} job creation performance`);
  }
  
  // Add popular patterns from learned patterns
  const popularPatterns = [...learnedPatterns]
    .sort((a, b) => b.usageCount - a.usageCount)
    .slice(0, 5);
  
  for (const pattern of popularPatterns) {
    if (pattern.pattern.includes(lower) || lower.includes(pattern.pattern.slice(0, 5))) {
      suggestions.push(pattern.pattern);
    }
  }
  
  // Add example queries
  for (const example of EXAMPLE_QUERIES) {
    if (example.nl.toLowerCase().includes(lower) || suggestions.length < 5) {
      suggestions.push(example.nl);
    }
  }
  
  return [...new Set(suggestions)].slice(0, 8);
}

/**
 * Get synonyms for a term
 */
export function getSynonyms(term: string): string[] {
  const lower = term.toLowerCase();
  for (const mapping of SYNONYM_DATABASE) {
    if (mapping.canonical.toLowerCase() === lower || mapping.synonyms.includes(lower)) {
      return [mapping.canonical, ...mapping.synonyms.filter(s => s !== lower)];
    }
  }
  return [term];
}

/**
 * Expand a query with synonyms
 */
export function expandQueryWithSynonyms(nl: string): string[] {
  const variations: string[] = [nl];
  
  // Find operator synonyms
  for (const mapping of SYNONYM_DATABASE.filter(s => s.category === 'operator')) {
    for (const syn of mapping.synonyms) {
      if (nl.toLowerCase().includes(syn)) {
        // Create variation with canonical name
        const variation = nl.replace(new RegExp(syn, 'gi'), mapping.canonical);
        if (!variations.includes(variation)) {
          variations.push(variation);
        }
      }
    }
  }
  
  return variations.slice(0, 5);
}

// ═══════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════

export {
  SYNONYM_DATABASE,
  config as adaptiveNLPConfig,
};

