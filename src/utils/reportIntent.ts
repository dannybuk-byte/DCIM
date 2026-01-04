import { Facility } from '../types';

export type ReportIntent = 
  | { type: 'state'; state: string; filters?: ReportFilters }
  | { type: 'operator'; operator: string; filters?: ReportFilters }
  | { type: 'evidence'; state?: string; operator?: string; filters?: ReportFilters }
  | { type: 'facility_filter'; filters: ReportFilters }
  | { type: 'summary'; filters?: ReportFilters }
  | { type: 'none' };

export interface ReportFilters {
  complianceStatus?: Facility['complianceStatus'][];
  minGap?: number;
  maxGap?: number;
  dateRange?: { start: string; end: string };
  facilityTypes?: Facility['type'][];
  cities?: string[];
}

// State name variations and abbreviations
const STATE_MAPPINGS: Record<string, string> = {
  'texas': 'TX', 'tx': 'TX',
  'california': 'CA', 'ca': 'CA',
  'new york': 'NY', 'ny': 'NY',
  'florida': 'FL', 'fl': 'FL',
  'illinois': 'IL', 'il': 'IL',
  'pennsylvania': 'PA', 'pa': 'PA',
  'ohio': 'OH', 'oh': 'OH',
  'georgia': 'GA', 'ga': 'GA',
  'north carolina': 'NC', 'nc': 'NC',
  'michigan': 'MI', 'mi': 'MI',
  'virginia': 'VA', 'va': 'VA',
  'washington': 'WA', 'wa': 'WA',
  'arizona': 'AZ', 'az': 'AZ',
  'massachusetts': 'MA', 'ma': 'MA',
  'tennessee': 'TN', 'tn': 'TN',
  'indiana': 'IN', 'in': 'IN',
  'missouri': 'MO', 'mo': 'MO',
  'maryland': 'MD', 'md': 'MD',
  'wisconsin': 'WI', 'wi': 'WI',
  'colorado': 'CO', 'co': 'CO',
  'minnesota': 'MN', 'mn': 'MN',
  'south carolina': 'SC', 'sc': 'SC',
  'alabama': 'AL', 'al': 'AL',
  'louisiana': 'LA', 'la': 'LA',
  'kentucky': 'KY', 'ky': 'KY',
  'oregon': 'OR', 'or': 'OR',
  'oklahoma': 'OK', 'ok': 'OK',
  'connecticut': 'CT', 'ct': 'CT',
  'utah': 'UT', 'ut': 'UT',
  'iowa': 'IA', 'ia': 'IA',
  'nevada': 'NV', 'nv': 'NV',
  'arkansas': 'AR', 'ar': 'AR',
  'mississippi': 'MS', 'ms': 'MS',
  'kansas': 'KS', 'ks': 'KS',
  'new mexico': 'NM', 'nm': 'NM',
  'nebraska': 'NE', 'ne': 'NE',
  'west virginia': 'WV', 'wv': 'WV',
  'idaho': 'ID', 'id': 'ID',
  'hawaii': 'HI', 'hi': 'HI',
  'new hampshire': 'NH', 'nh': 'NH',
  'maine': 'ME', 'me': 'ME',
  'montana': 'MT', 'mt': 'MT',
  'rhode island': 'RI', 'ri': 'RI',
  'delaware': 'DE', 'de': 'DE',
  'south dakota': 'SD', 'sd': 'SD',
  'north dakota': 'ND', 'nd': 'ND',
  'alaska': 'AK', 'ak': 'AK',
  'vermont': 'VT', 'vt': 'VT',
  'wyoming': 'WY', 'wy': 'WY',
  // Add full state names as keys too
  // State abbreviations already covered above in full names
};

// Extract dollar amounts from text
function extractDollarAmount(text: string): number | null {
  const patterns = [
    /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)/i,
    /\$(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:billion|B)/i,
    /\$(\d+(?:,\d{3})*(?:\.\d+)?)/,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)\s*dollars/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      if (text.toLowerCase().includes('million') || text.toLowerCase().includes('m')) {
        value *= 1000000;
      } else if (text.toLowerCase().includes('billion') || text.toLowerCase().includes('b')) {
        value *= 1000000000;
      }
      return Math.floor(value);
    }
  }
  return null;
}

// Extract comparison operators
function extractComparison(text: string): { operator: '>' | '<' | '>=' | '<=' | '='; value: number } | null {
  const patterns = [
    />\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)?/i,
    /<\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)?/i,
    />=\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)?/i,
    /<=\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)?/i,
    /=\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)?/i,
    /greater than\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)?/i,
    /less than\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)?/i,
    /more than\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)?/i,
    /over\s*\$?(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:million|M)?/i,
  ];
  
  for (let i = 0; i < patterns.length; i++) {
    const match = text.match(patterns[i]);
    if (match) {
      let value = parseFloat(match[1].replace(/,/g, ''));
      if (text.toLowerCase().includes('million') || text.toLowerCase().includes('m')) {
        value *= 1000000;
      }
      const operator = i < 1 ? '>' : i < 2 ? '<' : i < 3 ? '>=' : i < 4 ? '<=' : i < 5 ? '=' : '>';
      return { operator, value: Math.floor(value) };
    }
  }
  return null;
}

export function detectReportIntent(query: string): ReportIntent {
  const lowerQuery = query.toLowerCase().trim();
  
  // Slash commands
  if (lowerQuery.startsWith('/')) {
    const parts = query.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    
    if (command === '/report') {
      if (parts.length > 1) {
        const type = parts[1].toLowerCase();
        if (type === 'state' && parts[2]) {
          const state = STATE_MAPPINGS[parts[2].toLowerCase()] || parts[2].toUpperCase();
          return { type: 'state', state };
        } else if (type === 'operator' && parts[2]) {
          const operator = parts.slice(2).join(' ');
          return { type: 'operator', operator };
        }
      }
    } else if (command === '/evidence') {
      const state = parts[1] ? (STATE_MAPPINGS[parts[1].toLowerCase()] || parts[1].toUpperCase()) : undefined;
      const operator = parts[2] ? parts.slice(2).join(' ') : undefined;
      return { type: 'evidence', state, operator };
    }
  }
  
  // State report patterns
  const statePatterns = [
    /(?:show|display|list|find|get).*?(?:facilities|facility|compliance|report).*?(?:in|for|from|of)\s+(\w+)/i,
    /(?:facilities|facility|compliance).*?(?:in|for|from|of)\s+(\w+)/i,
    /(\w+)\s+(?:facilities|facility|compliance|report)/i,
    /(?:state|report).*?(?:for|in|of)\s+(\w+)/i,
  ];
  
  for (const pattern of statePatterns) {
    const match = lowerQuery.match(pattern);
    if (match && match[1]) {
      const stateKey = match[1].toLowerCase();
      if (STATE_MAPPINGS[stateKey] || stateKey.length === 2) {
        const state = STATE_MAPPINGS[stateKey] || stateKey.toUpperCase();
        const filters = extractFilters(query);
        return { type: 'state', state, filters };
      }
    }
  }
  
  // Operator report patterns
  const operatorPatterns = [
    /(?:show|display|list|find|get).*?(?:compliance|report|status|facilities).*?(?:for|from|by)\s+([A-Z][a-zA-Z\s&]+)/,
    /([A-Z][a-zA-Z\s&]+).*?(?:compliance|report|status)/,
    /(?:compliance|status).*?(?:for|of)\s+([A-Z][a-zA-Z\s&]+)/,
  ];
  
  // Common operator names
  const operatorKeywords = [
    'meta', 'facebook', 'amazon', 'aws', 'google', 'microsoft', 'apple',
    'equinix', 'digital realty', 'switch', 'cyrusone', 'qts', 'coreSite',
  ];
  
  for (const keyword of operatorKeywords) {
    if (lowerQuery.includes(keyword)) {
      const operator = keyword.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const filters = extractFilters(query);
      return { type: 'operator', operator, filters };
    }
  }
  
  for (const pattern of operatorPatterns) {
    const match = query.match(pattern);
    if (match && match[1]) {
      const operator = match[1].trim();
      const filters = extractFilters(query);
      return { type: 'operator', operator, filters };
    }
  }
  
  // Evidence package patterns
  if (lowerQuery.includes('evidence') || lowerQuery.includes('package') || lowerQuery.includes('documentation')) {
    const stateMatch = lowerQuery.match(/(?:in|for|from|of)\s+(\w+)/);
    const operatorMatch = query.match(/(?:for|from|by)\s+([A-Z][a-zA-Z\s&]+)/);
    const state = stateMatch ? (STATE_MAPPINGS[stateMatch[1].toLowerCase()] || stateMatch[1].toUpperCase()) : undefined;
    const operator = operatorMatch ? operatorMatch[1].trim() : undefined;
    const filters = extractFilters(query);
    return { type: 'evidence', state, operator, filters };
  }
  
  // Facility filter patterns (subsidy gap thresholds, compliance status)
  if (lowerQuery.includes('subsidy gap') || lowerQuery.includes('gap') || lowerQuery.includes('threshold')) {
    const filters = extractFilters(query);
    if (filters.minGap || filters.complianceStatus) {
      return { type: 'facility_filter', filters };
    }
  }
  
  // Compliance status filters
  if (lowerQuery.includes('non-compliant') || lowerQuery.includes('non compliant') || lowerQuery.includes('compliant') || lowerQuery.includes('at risk')) {
    const filters = extractFilters(query);
    return { type: 'facility_filter', filters };
  }
  
  return { type: 'none' };
}

function extractFilters(query: string): ReportFilters {
  const lowerQuery = query.toLowerCase();
  const filters: ReportFilters = {};
  
  // Compliance status
  const complianceStatuses: Facility['complianceStatus'][] = [];
  if (lowerQuery.includes('non-compliant') || lowerQuery.includes('non compliant')) {
    complianceStatuses.push('Non-Compliant');
  }
  if (lowerQuery.includes('compliant') && !lowerQuery.includes('non')) {
    complianceStatuses.push('Compliant');
  }
  if (lowerQuery.includes('at risk')) {
    complianceStatuses.push('At Risk');
  }
  if (lowerQuery.includes('unknown')) {
    complianceStatuses.push('Unknown');
  }
  if (complianceStatuses.length > 0) {
    filters.complianceStatus = complianceStatuses;
  }
  
  // Subsidy gap thresholds
  const comparison = extractComparison(query);
  if (comparison) {
    if (comparison.operator === '>' || comparison.operator === '>=') {
      filters.minGap = comparison.value;
    } else if (comparison.operator === '<' || comparison.operator === '<=') {
      filters.maxGap = comparison.value;
    }
  } else {
    const amount = extractDollarAmount(query);
    if (amount) {
      filters.minGap = amount;
    }
  }
  
  // Facility types
  const types: Facility['type'][] = [];
  if (lowerQuery.includes('switch') && !lowerQuery.includes('switch facilities')) {
    types.push('Switch');
  }
  if (lowerQuery.includes('data center') || lowerQuery.includes('datacenter')) {
    types.push('Data Center');
  }
  if (lowerQuery.includes('colocation') || lowerQuery.includes('co ')) {
    types.push('CO');
  }
  if (lowerQuery.includes('pop') || lowerQuery.includes('point of presence')) {
    types.push('POP');
  }
  if (types.length > 0) {
    filters.facilityTypes = types;
  }
  
  return filters;
}

export function applyFilters(facilities: Facility[], filters?: ReportFilters): Facility[] {
  if (!filters) return facilities;
  
  return facilities.filter(facility => {
    // Compliance status filter
    if (filters.complianceStatus && !filters.complianceStatus.includes(facility.complianceStatus)) {
      return false;
    }
    
    // Subsidy gap filters
    if (filters.minGap !== undefined && facility.subsidyGap < filters.minGap) {
      return false;
    }
    if (filters.maxGap !== undefined && facility.subsidyGap > filters.maxGap) {
      return false;
    }
    
    // Facility type filter
    if (filters.facilityTypes && !filters.facilityTypes.includes(facility.type)) {
      return false;
    }
    
    // City filter
    if (filters.cities && !filters.cities.includes(facility.city)) {
      return false;
    }
    
    // Date range filter
    if (filters.dateRange) {
      const auditDate = new Date(facility.lastAuditDate);
      const start = new Date(filters.dateRange.start);
      const end = new Date(filters.dateRange.end);
      if (auditDate < start || auditDate > end) {
        return false;
      }
    }
    
    return true;
  });
}

