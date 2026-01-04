import { Facility } from '../types';

export interface ParsedQuery {
  operator?: string;
  state?: string;
  city?: string;
  facilityName?: string;
  rawQuery: string;
}

/**
 * Parses natural language queries like:
 * - "Meta's facilities in NM"
 * - "Show AWS facilities in Texas"
 * - "Equinix data centers in California"
 * - "Facilities in New York"
 */
export function parseNLPQuery(query: string, facilities: Facility[]): ParsedQuery {
  const q = query.trim();
  const qLower = q.toLowerCase();
  const result: ParsedQuery = { rawQuery: q };

  // Extract state abbreviations (2-letter codes)
  const stateAbbrevs = new Set(facilities.map(f => f.state.toUpperCase()));
  const statePattern = /\b([A-Z]{2})\b/g;
  const stateMatch = q.match(statePattern);
  if (stateMatch) {
    const matched = stateMatch.find(s => stateAbbrevs.has(s));
    if (matched) {
      result.state = matched;
    }
  }

  // Extract full state names
  const stateNames: Record<string, string> = {
    'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR', 'california': 'CA',
    'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE', 'florida': 'FL', 'georgia': 'GA',
    'hawaii': 'HI', 'idaho': 'ID', 'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA',
    'kansas': 'KS', 'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
    'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS', 'missouri': 'MO',
    'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV', 'new hampshire': 'NH', 'new jersey': 'NJ',
    'new mexico': 'NM', 'new york': 'NY', 'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH',
    'oklahoma': 'OK', 'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
    'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT', 'vermont': 'VT',
    'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV', 'wisconsin': 'WI', 'wyoming': 'WY'
  };

  for (const [name, abbrev] of Object.entries(stateNames)) {
    if (qLower.includes(name)) {
      result.state = abbrev;
      break;
    }
  }

  // Extract operators (check against known operators)
  const operators = new Set(facilities.map(f => f.operator.toLowerCase()));
  const operatorAliases: Record<string, string[]> = {
    'meta': ['meta', 'facebook', 'fb'],
    'amazon web services': ['aws', 'amazon', 'amazon web services'],
    'microsoft': ['microsoft', 'msft', 'azure'],
    'google': ['google', 'gcp', 'alphabet'],
    'apple': ['apple', 'aapl'],
    'equinix': ['equinix'],
    'digital realty': ['digital realty', 'digital', 'drt'],
    'switch': ['switch'],
    'cyrusone': ['cyrusone', 'cyrus one'],
    'qts': ['qts'],
    'vantage': ['vantage'],
    'edgeconnex': ['edgeconnex', 'edge connex'],
    'coreSite': ['coresite', 'core site'],
  };

  // Check for operator mentions
  for (const [canonical, aliases] of Object.entries(operatorAliases)) {
    for (const alias of aliases) {
      if (qLower.includes(alias)) {
        // Find the actual operator name from facilities
        const found = facilities.find(f => 
          f.operator.toLowerCase().includes(canonical.toLowerCase()) ||
          canonical.toLowerCase().includes(f.operator.toLowerCase())
        );
        if (found) {
          result.operator = found.operator;
          break;
        }
      }
    }
    if (result.operator) break;
  }

  // Also check direct operator matches
  if (!result.operator) {
    for (const op of operators) {
      if (qLower.includes(op)) {
        const found = facilities.find(f => f.operator.toLowerCase() === op);
        if (found) {
          result.operator = found.operator;
          break;
        }
      }
    }
  }

  // Extract city names
  const cities = new Set(facilities.map(f => f.city.toLowerCase()));
  for (const city of cities) {
    if (qLower.includes(city.toLowerCase())) {
      const found = facilities.find(f => f.city.toLowerCase() === city);
      if (found) {
        result.city = found.city;
        break;
      }
    }
  }

  // Extract facility names (if query matches a facility name)
  const facilityNames = facilities.map(f => f.name.toLowerCase());
  for (const name of facilityNames) {
    if (qLower.includes(name)) {
      const found = facilities.find(f => f.name.toLowerCase() === name);
      if (found) {
        result.facilityName = found.name;
        break;
      }
    }
  }

  return result;
}

/**
 * Filters facilities based on parsed query
 */
export function filterFacilitiesByQuery(query: ParsedQuery, facilities: Facility[]): Facility[] {
  return facilities.filter(f => {
    if (query.operator && f.operator !== query.operator) return false;
    if (query.state && f.state !== query.state) return false;
    if (query.city && f.city !== query.city) return false;
    if (query.facilityName && f.name !== query.facilityName) return false;
    return true;
  });
}

/**
 * Gets bounding box for facilities to zoom to
 */
export function getFacilitiesBounds(facilities: Facility[]): { center: [number, number]; zoom: number } | null {
  const withCoords = facilities.filter(f => f.latitude !== undefined && f.longitude !== undefined);
  if (withCoords.length === 0) return null;

  if (withCoords.length === 1) {
    return {
      center: [withCoords[0].longitude!, withCoords[0].latitude!],
      zoom: 12
    };
  }

  // Calculate bounding box
  let minLng = Infinity, maxLng = -Infinity;
  let minLat = Infinity, maxLat = -Infinity;

  withCoords.forEach(f => {
    const lng = f.longitude!;
    const lat = f.latitude!;
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
  });

  const center: [number, number] = [
    (minLng + maxLng) / 2,
    (minLat + maxLat) / 2
  ];

  // Calculate zoom level based on bounding box size
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);

  let zoom = 3;
  if (maxDiff < 0.1) zoom = 10;
  else if (maxDiff < 0.5) zoom = 8;
  else if (maxDiff < 1) zoom = 6;
  else if (maxDiff < 5) zoom = 5;
  else if (maxDiff < 10) zoom = 4;

  return { center, zoom };
}

