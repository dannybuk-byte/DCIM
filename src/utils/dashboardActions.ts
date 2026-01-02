import { TabType } from '../types';
import { Facility } from '../types';

export interface DashboardAction {
  type: 'switchTab' | 'filter' | 'search' | 'focus' | 'generateReport';
  tab?: TabType;
  filters?: {
    state?: string;
    operator?: string;
    complianceStatus?: Facility['complianceStatus'];
    minGap?: number;
    city?: string;
    country?: string;
  };
  searchQuery?: string;
  facilityId?: number;
}

export function detectDashboardAction(query: string): DashboardAction | null {
  const lowerQuery = query.toLowerCase().trim();
  const filters: DashboardAction['filters'] = {};
  let tab: TabType | undefined;
  
  // Tab switching (explicit tab commands take priority)
  if (lowerQuery.includes('show overview') || lowerQuery.includes('overview tab')) {
    return { type: 'switchTab', tab: 'Overview' };
  }
  if (lowerQuery.includes('show geography') || lowerQuery.includes('geography tab') || lowerQuery.includes('by state') || lowerQuery.includes('by country')) {
    return { type: 'switchTab', tab: 'Geography' };
  }
  if (lowerQuery.includes('show early warning') || lowerQuery.includes('early warning tab')) {
    return { type: 'switchTab', tab: 'Early Warning' };
  }
  if (lowerQuery.includes('show explorer') || lowerQuery.includes('explorer tab') || lowerQuery.includes('explore facilities')) {
    return { type: 'switchTab', tab: 'Explorer' };
  }
  
  // State filtering - improved regex to catch state codes after commas (e.g., "tulsa, ok")
  // Use global flag for matchAll, but we'll only take the first match anyway
  const statePattern = /(?:,|\s|in|for|from)\s+(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new\s+hampshire|new\s+jersey|new\s+mexico|new\s+york|north\s+carolina|north\s+dakota|ohio|oklahoma|oregon|pennsylvania|rhode\s+island|south\s+carolina|south\s+dakota|tennessee|texas|utah|vermont|virginia|washington|west\s+virginia|wisconsin|wyoming|dc|districts?\s+of\s+columbia)\b|(?:state|st\.?)\s+(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)\b/gi;
  const stateMatches = Array.from(lowerQuery.matchAll(statePattern));
  for (const stateMatch of stateMatches) {
    const stateName = (stateMatch[1] || stateMatch[2] || '').trim();
    if (stateName) {
      const stateCode = mapStateToCode(stateName);
      if (stateCode) {
        filters.state = stateCode;
        if (!tab) tab = 'Geography' as TabType;
        break; // Take first valid state match
      }
    }
  }
  
  // City filtering - improved to catch city names without "city/town" suffix (e.g., "tulsa")
  // Try multiple patterns to catch various formats
  const stateCodePattern = '(?:ok|al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)';
  const cityPatterns = [
    // Pattern 1: "[city], [state]" format (e.g., "tulsa, ok") - matches before comma
    new RegExp(`([a-z]+(?:\\s+[a-z]+)*?)\\s*,\\s*${stateCodePattern}\\b`, 'i'),
    // Pattern 2: "in [city], [state]" or "in [city] [state]" (before comma or state)
    new RegExp(`\\bin\\s+([a-z]+(?:\\s+[a-z]+)*?)\\s*(?:,|\\s+${stateCodePattern})`, 'i'),
    // Pattern 3: "at [city]" or "at [city], [state]"
    new RegExp(`\\bat\\s+([a-z]+(?:\\s+[a-z]+)*?)\\s*(?:,|\\s+${stateCodePattern}|$)`, 'i'),
  ];
  
  for (const pattern of cityPatterns) {
    const cityMatch = lowerQuery.match(pattern);
    if (cityMatch && cityMatch[1]) {
      const cityName = cityMatch[1].trim().toLowerCase();
      // Exclude common stop words and state names, must be at least 3 characters
      const stopWords = ['the', 'and', 'for', 'from', 'with', 'in', 'at', 'facilities', 'facility', 'non', 'compliant'];
      if (cityName.length >= 3 && 
          !stopWords.includes(cityName) && 
          !mapStateToCode(cityName)) {
        filters.city = cityName;
        break;
      }
    }
  }
  
  // Operator filtering
  const operatorMatch = lowerQuery.match(/(?:operator|company|provider)\s+([a-z\s]+)|(?:amazon|aws|microsoft|azure|google|meta|equinix|digital\s+realty|ntt|switch)\b/i);
  if (operatorMatch) {
    const operatorName = normalizeOperatorName(operatorMatch[1] || operatorMatch[0]);
    if (operatorName) {
      filters.operator = operatorName;
      if (!tab) tab = 'Overview' as TabType;
    }
  }
  
  // Compliance status filtering
  if (lowerQuery.includes('non-compliant') || lowerQuery.includes('non compliant')) {
    filters.complianceStatus = 'Non-Compliant';
    if (!tab) tab = 'Problems' as TabType;
  } else if (lowerQuery.includes('at risk')) {
    filters.complianceStatus = 'At Risk';
    if (!tab) tab = 'Early Warning' as TabType;
  } else if (lowerQuery.includes('compliant') && !lowerQuery.includes('non')) {
    filters.complianceStatus = 'Compliant';
  }
  
  // Subsidy gap filtering
  const gapMatch = lowerQuery.match(/(?:gap|subsidy).*?(?:over|above|>|greater\s+than)\s*\$?([\d,]+(?:\s*(?:million|m|billion|b))?)/i);
  if (gapMatch) {
    let value = parseFloat(gapMatch[1].replace(/,/g, ''));
    if (lowerQuery.includes('million') || lowerQuery.match(/\b(\d+)\s*m\b/)) value *= 1_000_000;
    if (lowerQuery.includes('billion') || lowerQuery.match(/\b(\d+)\s*b\b/)) value *= 1_000_000_000;
    filters.minGap = value;
  }
  
  // Generate report
  if (lowerQuery.includes('generate report') || lowerQuery.includes('create report') || lowerQuery.includes('show report')) {
    return { type: 'generateReport' };
  }
  
  // Return combined filters if any were detected
  if (Object.keys(filters).length > 0) {
    return {
      type: 'filter',
      filters,
      tab,
    };
  }
  
  // General search
  return { type: 'search', searchQuery: query };
}

function mapStateToCode(stateInput: string): string | null {
  const mapping: Record<string, string> = {
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
    'wisconsin': 'WI', 'wyoming': 'WY', 'dc': 'DC', 'district of columbia': 'DC', 'districts of columbia': 'DC',
    // Also handle codes
    'al': 'AL', 'ak': 'AK', 'az': 'AZ', 'ar': 'AR', 'ca': 'CA', 'co': 'CO',
    'ct': 'CT', 'de': 'DE', 'fl': 'FL', 'ga': 'GA', 'hi': 'HI', 'id': 'ID',
    'il': 'IL', 'in': 'IN', 'ia': 'IA', 'ks': 'KS', 'ky': 'KY', 'la': 'LA',
    'me': 'ME', 'md': 'MD', 'ma': 'MA', 'mi': 'MI', 'mn': 'MN', 'ms': 'MS',
    'mo': 'MO', 'mt': 'MT', 'ne': 'NE', 'nv': 'NV', 'nh': 'NH', 'nj': 'NJ',
    'nm': 'NM', 'ny': 'NY', 'nc': 'NC', 'nd': 'ND', 'oh': 'OH', 'ok': 'OK',
    'or': 'OR', 'pa': 'PA', 'ri': 'RI', 'sc': 'SC', 'sd': 'SD', 'tn': 'TN',
    'tx': 'TX', 'ut': 'UT', 'vt': 'VT', 'va': 'VA', 'wa': 'WA', 'wv': 'WV',
    'wi': 'WI', 'wy': 'WY',
  };
  return mapping[stateInput.toLowerCase()] || null;
}

function normalizeOperatorName(name: string): string | null {
  const normalized = name.toLowerCase().trim();
  const mappings: Record<string, string> = {
    'amazon': 'Amazon Web Services',
    'aws': 'Amazon Web Services',
    'amazon web services': 'Amazon Web Services',
    'microsoft': 'Microsoft Azure',
    'azure': 'Microsoft Azure',
    'microsoft azure': 'Microsoft Azure',
    'google': 'Google Cloud',
    'google cloud': 'Google Cloud',
    'meta': 'Meta',
    'facebook': 'Meta',
    'equinix': 'Equinix',
    'digital realty': 'Digital Realty',
    'ntt': 'NTT',
    'switch': 'Switch Inc',
    'switch inc': 'Switch Inc',
  };
  return mappings[normalized] || null;
}

