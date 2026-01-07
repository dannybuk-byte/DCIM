/**
 * NLP Location Search Component
 * 
 * Features:
 * - Natural language location parsing ("near Times Square", "data centers in Virginia")
 * - Predictive autocomplete with fuzzy matching
 * - Recent searches & popular data center hubs
 * - Zip code & coordinate support
 * - Landmark and neighborhood recognition
 * - Voice search ready
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  Search, MapPin, Clock, TrendingUp, Building, Navigation,
  X, ChevronRight, Sparkles, Target, Globe, Zap, Star,
  Map, Compass, AlertCircle, Check, Loader2, Mic, History
} from 'lucide-react';

interface UserLocation {
  city: string;
  state: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
}

interface LocationSuggestion {
  id: string;
  display: string;
  type: 'city' | 'neighborhood' | 'region' | 'zipcode' | 'landmark' | 'datacenter-hub' | 'recent' | 'state';
  location: UserLocation;
  relevance: number;
  description?: string;
  icon?: React.ReactNode;
  tags?: string[];
}

interface NLPLocationSearchProps {
  onLocationSelect: (location: UserLocation) => void;
  currentLocation?: UserLocation;
  onClose?: () => void;
}

// Comprehensive location database
const LOCATION_DATABASE: LocationSuggestion[] = [
  // Major Data Center Hubs (prioritized)
  { id: 'ashburn-va', display: 'Ashburn, VA (Data Center Alley)', type: 'datacenter-hub', location: { city: 'Ashburn', state: 'VA', neighborhood: 'Data Center Alley', lat: 39.0438, lng: -77.4874 }, relevance: 100, description: '#1 US data center market, 70%+ of internet traffic', tags: ['aws', 'microsoft', 'google', 'equinix', 'northern virginia', 'nova'] },
  { id: 'phoenix-az', display: 'Phoenix, AZ (West Region Hub)', type: 'datacenter-hub', location: { city: 'Phoenix', state: 'AZ', neighborhood: 'Mesa Gateway', lat: 33.4484, lng: -112.0740 }, relevance: 95, description: 'Major hyperscaler expansion market', tags: ['microsoft', 'google', 'meta', 'desert'] },
  { id: 'dallas-tx', display: 'Dallas-Fort Worth, TX', type: 'datacenter-hub', location: { city: 'Dallas', state: 'TX', neighborhood: 'Telecom Corridor', lat: 32.7767, lng: -96.7970 }, relevance: 94, description: 'Central US connectivity hub', tags: ['at&t', 'cyrusone', 'digital realty'] },
  { id: 'silicon-valley', display: 'Silicon Valley, CA', type: 'datacenter-hub', location: { city: 'San Jose', state: 'CA', neighborhood: 'Silicon Valley', lat: 37.3382, lng: -121.8863 }, relevance: 93, description: 'Tech industry heartland', tags: ['google', 'apple', 'meta', 'tech'] },
  { id: 'chicago-il', display: 'Chicago, IL (350 E Cermak)', type: 'datacenter-hub', location: { city: 'Chicago', state: 'IL', neighborhood: 'South Loop', lat: 41.8530, lng: -87.6168 }, relevance: 92, description: 'Midwest interconnection hub', tags: ['equinix', 'digital realty', 'midwest'] },
  { id: 'secaucus-nj', display: 'Secaucus, NJ (NYC Metro)', type: 'datacenter-hub', location: { city: 'Secaucus', state: 'NJ', neighborhood: 'Meadowlands', lat: 40.7895, lng: -74.0565 }, relevance: 91, description: 'NYC financial services hub', tags: ['equinix', 'digital realty', 'nyc', 'finance'] },
  { id: 'atlanta-ga', display: 'Atlanta, GA (56 Marietta)', type: 'datacenter-hub', location: { city: 'Atlanta', state: 'GA', neighborhood: 'Downtown', lat: 33.7558, lng: -84.3909 }, relevance: 90, description: 'Southeast regional hub', tags: ['equinix', 'digital realty', 'southeast'] },
  { id: 'seattle-wa', display: 'Seattle/Quincy, WA', type: 'datacenter-hub', location: { city: 'Seattle', state: 'WA', neighborhood: 'Eastside', lat: 47.6062, lng: -122.3321 }, relevance: 89, description: 'Microsoft/Amazon home region', tags: ['microsoft', 'amazon', 'pacific northwest'] },
  { id: 'denver-co', display: 'Denver, CO', type: 'datacenter-hub', location: { city: 'Denver', state: 'CO', neighborhood: 'Downtown', lat: 39.7392, lng: -104.9903 }, relevance: 88, description: 'Mountain West hub', tags: ['verizon', 'level3', 'mountain'] },
  { id: 'las-vegas-nv', display: 'Las Vegas, NV (Switch)', type: 'datacenter-hub', location: { city: 'Las Vegas', state: 'NV', neighborhood: 'Henderson', lat: 36.1699, lng: -115.1398 }, relevance: 87, description: 'Switch SUPERNAP campus', tags: ['switch', 'supernap'] },
  
  // NYC Neighborhoods (detailed)
  { id: 'manhattan-ny', display: 'Manhattan, NY', type: 'city', location: { city: 'New York', state: 'NY', neighborhood: 'Manhattan', lat: 40.7831, lng: -73.9712 }, relevance: 85, tags: ['nyc', 'new york city'] },
  { id: 'hudson-yards', display: 'Hudson Yards, Manhattan', type: 'neighborhood', location: { city: 'New York', state: 'NY', neighborhood: 'Hudson Yards', lat: 40.7536, lng: -74.0016 }, relevance: 80, tags: ['manhattan', 'west side', 'nyc'] },
  { id: 'times-square', display: 'Times Square, Manhattan', type: 'landmark', location: { city: 'New York', state: 'NY', neighborhood: 'Midtown', lat: 40.7580, lng: -73.9855 }, relevance: 80, tags: ['midtown', 'manhattan', 'nyc'] },
  { id: '60-hudson', display: '60 Hudson Street (Carrier Hotel)', type: 'datacenter-hub', location: { city: 'New York', state: 'NY', neighborhood: 'Tribeca', lat: 40.7186, lng: -74.0075 }, relevance: 95, description: 'Major NYC internet exchange', tags: ['tribeca', 'manhattan', 'nyc', 'carrier hotel', 'ix'] },
  { id: '111-8th-ave', display: '111 8th Ave (Google/Chelsea Market)', type: 'datacenter-hub', location: { city: 'New York', state: 'NY', neighborhood: 'Chelsea', lat: 40.7415, lng: -74.0022 }, relevance: 94, description: 'Google NYC headquarters', tags: ['chelsea', 'manhattan', 'google', 'nyc'] },
  { id: 'brooklyn-ny', display: 'Brooklyn, NY', type: 'city', location: { city: 'Brooklyn', state: 'NY', neighborhood: 'Downtown', lat: 40.6782, lng: -73.9442 }, relevance: 84, tags: ['nyc', 'new york city', 'kings county'] },
  { id: 'sunset-park', display: 'Sunset Park, Brooklyn (Industry City)', type: 'neighborhood', location: { city: 'Brooklyn', state: 'NY', neighborhood: 'Sunset Park', lat: 40.6468, lng: -74.0100 }, relevance: 82, description: 'Industrial & tech hub', tags: ['brooklyn', 'industry city', 'tech', 'nyc'] },
  { id: 'dumbo', display: 'DUMBO, Brooklyn', type: 'neighborhood', location: { city: 'Brooklyn', state: 'NY', neighborhood: 'DUMBO', lat: 40.7033, lng: -73.9883 }, relevance: 78, tags: ['brooklyn', 'tech', 'waterfront', 'nyc'] },
  { id: 'williamsburg', display: 'Williamsburg, Brooklyn', type: 'neighborhood', location: { city: 'Brooklyn', state: 'NY', neighborhood: 'Williamsburg', lat: 40.7081, lng: -73.9571 }, relevance: 76, tags: ['brooklyn', 'nyc'] },
  { id: 'bronx-ny', display: 'Bronx, NY', type: 'city', location: { city: 'Bronx', state: 'NY', neighborhood: '', lat: 40.8448, lng: -73.8648 }, relevance: 83, tags: ['nyc', 'new york city'] },
  { id: 'riverdale', display: 'Riverdale, Bronx, NY', type: 'neighborhood', location: { city: 'Bronx', state: 'NY', neighborhood: 'Riverdale', lat: 40.9003, lng: -73.9148 }, relevance: 80, tags: ['bronx', 'nyc'] },
  { id: 'south-bronx', display: 'South Bronx, NY', type: 'neighborhood', location: { city: 'Bronx', state: 'NY', neighborhood: 'South Bronx', lat: 40.8176, lng: -73.9212 }, relevance: 79, tags: ['bronx', 'mott haven', 'nyc'] },
  { id: 'queens-ny', display: 'Queens, NY', type: 'city', location: { city: 'Queens', state: 'NY', neighborhood: '', lat: 40.7282, lng: -73.7949 }, relevance: 83, tags: ['nyc', 'new york city'] },
  { id: 'long-island-city', display: 'Long Island City, Queens', type: 'neighborhood', location: { city: 'Queens', state: 'NY', neighborhood: 'Long Island City', lat: 40.7447, lng: -73.9485 }, relevance: 81, description: 'Former Amazon HQ2 site', tags: ['queens', 'lic', 'amazon', 'nyc'] },
  { id: 'staten-island', display: 'Staten Island, NY', type: 'city', location: { city: 'Staten Island', state: 'NY', neighborhood: '', lat: 40.5795, lng: -74.1502 }, relevance: 75, tags: ['nyc', 'new york city'] },
  
  // California
  { id: 'los-angeles', display: 'Los Angeles, CA', type: 'city', location: { city: 'Los Angeles', state: 'CA', neighborhood: 'Downtown', lat: 34.0522, lng: -118.2437 }, relevance: 85, tags: ['la', 'socal', 'southern california'] },
  { id: 'one-wilshire', display: 'One Wilshire (LA Carrier Hotel)', type: 'datacenter-hub', location: { city: 'Los Angeles', state: 'CA', neighborhood: 'Downtown', lat: 34.0486, lng: -118.2581 }, relevance: 96, description: 'West Coast interconnection hub', tags: ['la', 'carrier hotel', 'dtla', 'los angeles'] },
  { id: 'san-francisco', display: 'San Francisco, CA', type: 'city', location: { city: 'San Francisco', state: 'CA', neighborhood: 'SoMa', lat: 37.7749, lng: -122.4194 }, relevance: 85, tags: ['sf', 'bay area', 'norcal'] },
  { id: 'san-jose', display: 'San Jose, CA', type: 'city', location: { city: 'San Jose', state: 'CA', neighborhood: 'Downtown', lat: 37.3382, lng: -121.8863 }, relevance: 84, tags: ['silicon valley', 'bay area'] },
  { id: 'santa-clara', display: 'Santa Clara, CA (Great Oaks)', type: 'datacenter-hub', location: { city: 'Santa Clara', state: 'CA', neighborhood: 'Great Oaks', lat: 37.3541, lng: -121.9552 }, relevance: 92, description: 'Silicon Valley DC cluster', tags: ['silicon valley', 'equinix', 'nvidia'] },
  { id: 'sacramento', display: 'Sacramento, CA', type: 'city', location: { city: 'Sacramento', state: 'CA', neighborhood: '', lat: 38.5816, lng: -121.4944 }, relevance: 78, tags: ['norcal', 'capital'] },
  { id: 'san-diego', display: 'San Diego, CA', type: 'city', location: { city: 'San Diego', state: 'CA', neighborhood: '', lat: 32.7157, lng: -117.1611 }, relevance: 77, tags: ['socal'] },
  
  // Texas
  { id: 'austin-tx', display: 'Austin, TX', type: 'city', location: { city: 'Austin', state: 'TX', neighborhood: 'Downtown', lat: 30.2672, lng: -97.7431 }, relevance: 84, tags: ['texas', 'tech hub'] },
  { id: 'houston-tx', display: 'Houston, TX', type: 'city', location: { city: 'Houston', state: 'TX', neighborhood: 'Downtown', lat: 29.7604, lng: -95.3698 }, relevance: 83, tags: ['texas', 'energy'] },
  { id: 'san-antonio-tx', display: 'San Antonio, TX (NSA Data Center)', type: 'datacenter-hub', location: { city: 'San Antonio', state: 'TX', neighborhood: '', lat: 29.4241, lng: -98.4936 }, relevance: 88, description: 'Government & military DC hub', tags: ['texas', 'government', 'nsa'] },
  
  // Virginia/DC Area (detailed - major DC market)
  { id: 'loudoun-county', display: 'Loudoun County, VA (Data Center Alley)', type: 'datacenter-hub', location: { city: 'Ashburn', state: 'VA', neighborhood: 'Loudoun County', lat: 39.0438, lng: -77.4874 }, relevance: 99, description: '70% of world internet traffic', tags: ['nova', 'northern virginia', 'ashburn', 'aws', 'equinix'] },
  { id: 'prince-william', display: 'Prince William County, VA', type: 'datacenter-hub', location: { city: 'Manassas', state: 'VA', neighborhood: 'Innovation Park', lat: 38.7509, lng: -77.4753 }, relevance: 93, description: 'Expanding DC market', tags: ['nova', 'aws', 'microsoft'] },
  { id: 'dc', display: 'Washington, DC', type: 'city', location: { city: 'Washington', state: 'DC', neighborhood: '', lat: 38.9072, lng: -77.0369 }, relevance: 82, tags: ['capital', 'government', 'federal'] },
  { id: 'reston-va', display: 'Reston, VA', type: 'city', location: { city: 'Reston', state: 'VA', neighborhood: '', lat: 38.9687, lng: -77.3411 }, relevance: 85, tags: ['nova', 'tech', 'federal'] },
  { id: 'sterling-va', display: 'Sterling, VA', type: 'city', location: { city: 'Sterling', state: 'VA', neighborhood: '', lat: 39.0062, lng: -77.4286 }, relevance: 84, tags: ['nova', 'aws'] },
  
  // Other Major Cities
  { id: 'boston-ma', display: 'Boston, MA', type: 'city', location: { city: 'Boston', state: 'MA', neighborhood: 'Downtown', lat: 42.3601, lng: -71.0589 }, relevance: 82, tags: ['new england', 'tech', 'biotech'] },
  { id: 'miami-fl', display: 'Miami, FL (NAP of the Americas)', type: 'datacenter-hub', location: { city: 'Miami', state: 'FL', neighborhood: 'Downtown', lat: 25.7617, lng: -80.1918 }, relevance: 90, description: 'Latin America gateway', tags: ['florida', 'latam', 'nap'] },
  { id: 'portland-or', display: 'Portland, OR (Hillsboro)', type: 'datacenter-hub', location: { city: 'Portland', state: 'OR', neighborhood: 'Hillsboro', lat: 45.5152, lng: -122.6784 }, relevance: 86, description: 'Pacific Northwest hub', tags: ['pnw', 'intel', 'tech'] },
  { id: 'salt-lake-city', display: 'Salt Lake City, UT (NSA Utah)', type: 'datacenter-hub', location: { city: 'Salt Lake City', state: 'UT', neighborhood: 'Bluffdale', lat: 40.7608, lng: -111.8910 }, relevance: 85, description: 'NSA Utah Data Center', tags: ['utah', 'government', 'nsa'] },
  { id: 'minneapolis-mn', display: 'Minneapolis, MN', type: 'city', location: { city: 'Minneapolis', state: 'MN', neighborhood: '', lat: 44.9778, lng: -93.2650 }, relevance: 78, tags: ['midwest'] },
  { id: 'detroit-mi', display: 'Detroit, MI', type: 'city', location: { city: 'Detroit', state: 'MI', neighborhood: '', lat: 42.3314, lng: -83.0458 }, relevance: 77, tags: ['midwest', 'auto'] },
  { id: 'cleveland-oh', display: 'Cleveland, OH', type: 'city', location: { city: 'Cleveland', state: 'OH', neighborhood: '', lat: 41.4993, lng: -81.6944 }, relevance: 75, tags: ['midwest', 'ohio'] },
  { id: 'columbus-oh', display: 'Columbus, OH (AWS Region)', type: 'datacenter-hub', location: { city: 'Columbus', state: 'OH', neighborhood: '', lat: 39.9612, lng: -82.9988 }, relevance: 87, description: 'AWS US-East-2 region', tags: ['ohio', 'aws', 'midwest'] },
  { id: 'des-moines-ia', display: 'Des Moines, IA (Meta/Microsoft)', type: 'datacenter-hub', location: { city: 'Des Moines', state: 'IA', neighborhood: 'Altoona', lat: 41.5868, lng: -93.6250 }, relevance: 86, description: 'Meta & Microsoft campuses', tags: ['iowa', 'meta', 'microsoft', 'wind power', 'facebook'] },
  
  // New Mexico (Meta major presence)
  { id: 'los-lunas-nm', display: 'Los Lunas, NM (Meta Data Center)', type: 'datacenter-hub', location: { city: 'Los Lunas', state: 'NM', neighborhood: 'Facebook DC', lat: 34.8061, lng: -106.7333 }, relevance: 94, description: 'Meta/Facebook 6M sq ft campus, $1B+ investment', tags: ['new mexico', 'nm', 'meta', 'facebook', 'hyperscaler', 'renewable energy'] },
  { id: 'albuquerque-nm', display: 'Albuquerque, NM', type: 'city', location: { city: 'Albuquerque', state: 'NM', neighborhood: '', lat: 35.0844, lng: -106.6504 }, relevance: 80, description: 'New Mexico tech hub', tags: ['new mexico', 'nm', 'southwest'] },
  { id: 'santa-fe-nm', display: 'Santa Fe, NM', type: 'city', location: { city: 'Santa Fe', state: 'NM', neighborhood: '', lat: 35.6870, lng: -105.9378 }, relevance: 75, tags: ['new mexico', 'nm', 'capital'] },
  { id: 'state-nm', display: 'New Mexico (all)', type: 'state', location: { city: 'Santa Fe', state: 'NM', lat: 35.6870, lng: -105.9378 }, relevance: 70, description: 'Meta Los Lunas DC, renewable energy hub', tags: ['nm', 'new mexico', 'meta', 'facebook'] },
  
  { id: 'charlotte-nc', display: 'Charlotte, NC', type: 'city', location: { city: 'Charlotte', state: 'NC', neighborhood: '', lat: 35.2271, lng: -80.8431 }, relevance: 79, tags: ['southeast', 'banking'] },
  { id: 'nashville-tn', display: 'Nashville, TN', type: 'city', location: { city: 'Nashville', state: 'TN', neighborhood: '', lat: 36.1627, lng: -86.7816 }, relevance: 78, tags: ['southeast', 'music'] },
  { id: 'new-orleans-la', display: 'New Orleans, LA', type: 'city', location: { city: 'New Orleans', state: 'LA', neighborhood: '', lat: 29.9511, lng: -90.0715 }, relevance: 74, tags: ['gulf'] },
  
  // States (for broader searches)
  { id: 'state-va', display: 'Virginia (all)', type: 'state', location: { city: 'Richmond', state: 'VA', lat: 37.5407, lng: -77.4360 }, relevance: 70, description: 'Data Center Alley, AWS, Equinix', tags: ['va', 'virginia', 'data center alley', 'aws', 'equinix'] },
  { id: 'state-tx', display: 'Texas (all)', type: 'state', location: { city: 'Austin', state: 'TX', lat: 30.2672, lng: -97.7431 }, relevance: 70, description: 'Dallas DFW hub, Austin tech', tags: ['tx', 'texas', 'dallas', 'austin'] },
  { id: 'state-ca', display: 'California (all)', type: 'state', location: { city: 'Sacramento', state: 'CA', lat: 38.5816, lng: -121.4944 }, relevance: 70, description: 'Silicon Valley, Google, Meta', tags: ['ca', 'california', 'silicon valley', 'google', 'meta'] },
  { id: 'state-ny', display: 'New York State (all)', type: 'state', location: { city: 'Albany', state: 'NY', lat: 42.6526, lng: -73.7562 }, relevance: 70, description: 'NYC carrier hotels, finance', tags: ['ny', 'new york', 'nyc', 'google', 'amazon'] },
  { id: 'state-il', display: 'Illinois (all)', type: 'state', location: { city: 'Springfield', state: 'IL', lat: 39.7817, lng: -89.6501 }, relevance: 68, description: 'Chicago interconnection hub', tags: ['il', 'illinois', 'chicago', 'equinix', 'microsoft'] },
  { id: 'state-az', display: 'Arizona (all)', type: 'state', location: { city: 'Phoenix', state: 'AZ', lat: 33.4484, lng: -112.0740 }, relevance: 68, description: 'Phoenix hyperscaler expansion', tags: ['az', 'arizona', 'phoenix', 'meta', 'microsoft', 'google'] },
  { id: 'state-wa', display: 'Washington (all)', type: 'state', location: { city: 'Olympia', state: 'WA', lat: 47.0379, lng: -122.9007 }, relevance: 68, description: 'Microsoft, Amazon HQ region', tags: ['wa', 'washington', 'seattle', 'microsoft', 'amazon', 'quincy'] },
  { id: 'state-ga', display: 'Georgia (all)', type: 'state', location: { city: 'Atlanta', state: 'GA', lat: 33.7490, lng: -84.3880 }, relevance: 67, description: 'Southeast regional hub', tags: ['ga', 'georgia', 'atlanta', 'equinix', 'google'] },
  { id: 'state-fl', display: 'Florida (all)', type: 'state', location: { city: 'Tallahassee', state: 'FL', lat: 30.4383, lng: -84.2807 }, relevance: 67, description: 'Miami NAP, Latin America gateway', tags: ['fl', 'florida', 'miami', 'nap'] },
  { id: 'state-oh', display: 'Ohio (all)', type: 'state', location: { city: 'Columbus', state: 'OH', lat: 39.9612, lng: -82.9988 }, relevance: 67, description: 'AWS US-East-2 region', tags: ['oh', 'ohio', 'columbus', 'aws'] },
  { id: 'state-ia', display: 'Iowa (all)', type: 'state', location: { city: 'Des Moines', state: 'IA', lat: 41.5868, lng: -93.6250 }, relevance: 67, description: 'Meta, Microsoft wind-powered DCs', tags: ['ia', 'iowa', 'des moines', 'meta', 'microsoft', 'facebook', 'wind'] },
  { id: 'state-nv', display: 'Nevada (all)', type: 'state', location: { city: 'Las Vegas', state: 'NV', lat: 36.1699, lng: -115.1398 }, relevance: 66, description: 'Switch SUPERNAP, Apple', tags: ['nv', 'nevada', 'las vegas', 'switch', 'apple'] },
  { id: 'state-nj', display: 'New Jersey (all)', type: 'state', location: { city: 'Trenton', state: 'NJ', lat: 40.2206, lng: -74.7597 }, relevance: 66, description: 'NYC metro colocation hub', tags: ['nj', 'new jersey', 'secaucus', 'equinix', 'digital realty'] },
  { id: 'state-or', display: 'Oregon (all)', type: 'state', location: { city: 'Salem', state: 'OR', lat: 44.9429, lng: -123.0351 }, relevance: 66, description: 'Hillsboro/Portland hub, AWS', tags: ['or', 'oregon', 'portland', 'hillsboro', 'aws', 'intel'] },
  { id: 'state-co', display: 'Colorado (all)', type: 'state', location: { city: 'Denver', state: 'CO', lat: 39.7392, lng: -104.9903 }, relevance: 65, description: 'Mountain West hub', tags: ['co', 'colorado', 'denver', 'verizon'] },
  { id: 'state-ut', display: 'Utah (all)', type: 'state', location: { city: 'Salt Lake City', state: 'UT', lat: 40.7608, lng: -111.8910 }, relevance: 65, description: 'NSA Utah Data Center', tags: ['ut', 'utah', 'salt lake city', 'nsa', 'government'] },
  { id: 'state-nc', display: 'North Carolina (all)', type: 'state', location: { city: 'Raleigh', state: 'NC', lat: 35.7796, lng: -78.6382 }, relevance: 64, description: 'Research Triangle, banking', tags: ['nc', 'north carolina', 'charlotte', 'raleigh', 'apple', 'google'] },
  { id: 'state-sc', display: 'South Carolina (all)', type: 'state', location: { city: 'Columbia', state: 'SC', lat: 34.0007, lng: -81.0348 }, relevance: 62, description: 'Google Berkeley County DC', tags: ['sc', 'south carolina', 'google'] },
];

// NLP patterns for natural language parsing
const NLP_PATTERNS = [
  { pattern: /near\s+(.+)/i, extract: (match: RegExpMatchArray) => match[1] },
  { pattern: /around\s+(.+)/i, extract: (match: RegExpMatchArray) => match[1] },
  { pattern: /close to\s+(.+)/i, extract: (match: RegExpMatchArray) => match[1] },
  { pattern: /data centers?\s+(?:in|near|around)\s+(.+)/i, extract: (match: RegExpMatchArray) => match[1] },
  { pattern: /facilities?\s+(?:in|near|around)\s+(.+)/i, extract: (match: RegExpMatchArray) => match[1] },
  { pattern: /infrastructure\s+(?:in|near|around)\s+(.+)/i, extract: (match: RegExpMatchArray) => match[1] },
  { pattern: /show(?:\s+me)?\s+(.+)/i, extract: (match: RegExpMatchArray) => match[1] },
  { pattern: /find\s+(.+)/i, extract: (match: RegExpMatchArray) => match[1] },
  { pattern: /search\s+(?:for\s+)?(.+)/i, extract: (match: RegExpMatchArray) => match[1] },
  { pattern: /^(\d{5})(?:-\d{4})?$/, extract: (match: RegExpMatchArray) => match[1] }, // Zip code
];

// Pattern for "[operator] in [state]" queries (e.g., "meta in nm", "aws in virginia")
const OPERATOR_IN_STATE_PATTERN = /^(\w+(?:\s+\w+)?)\s+(?:in|at|near)\s+(\w+(?:\s+\w+)?)$/i;

// Extract operator and state from query
function parseOperatorInState(query: string): { operator: string; state: string } | null {
  const match = query.match(OPERATOR_IN_STATE_PATTERN);
  if (!match) return null;
  
  const potentialOperator = match[1].toLowerCase();
  const potentialState = match[2].toLowerCase();
  
  // Check if first part is a known operator
  const operators = Object.keys(OPERATOR_BY_STATE);
  const matchedOperator = operators.find(op => 
    potentialOperator === op || 
    potentialOperator.includes(op) ||
    op.includes(potentialOperator)
  );
  
  if (!matchedOperator) return null;
  
  // Normalize state (could be abbreviation or full name)
  const normalizedState = STATE_ABBREVIATIONS[potentialState] ? potentialState : 
    Object.entries(STATE_ABBREVIATIONS).find(([_, name]) => 
      name === potentialState || name.includes(potentialState) || potentialState.includes(name)
    )?.[0] || potentialState;
  
  return { operator: matchedOperator, state: normalizedState };
}

// State abbreviation to full name mapping
const STATE_ABBREVIATIONS: Record<string, string> = {
  'al': 'alabama', 'ak': 'alaska', 'az': 'arizona', 'ar': 'arkansas', 'ca': 'california',
  'co': 'colorado', 'ct': 'connecticut', 'de': 'delaware', 'fl': 'florida', 'ga': 'georgia',
  'hi': 'hawaii', 'id': 'idaho', 'il': 'illinois', 'in': 'indiana', 'ia': 'iowa',
  'ks': 'kansas', 'ky': 'kentucky', 'la': 'louisiana', 'me': 'maine', 'md': 'maryland',
  'ma': 'massachusetts', 'mi': 'michigan', 'mn': 'minnesota', 'ms': 'mississippi', 'mo': 'missouri',
  'mt': 'montana', 'ne': 'nebraska', 'nv': 'nevada', 'nh': 'new hampshire', 'nj': 'new jersey',
  'nm': 'new mexico', 'ny': 'new york', 'nc': 'north carolina', 'nd': 'north dakota', 'oh': 'ohio',
  'ok': 'oklahoma', 'or': 'oregon', 'pa': 'pennsylvania', 'ri': 'rhode island', 'sc': 'south carolina',
  'sd': 'south dakota', 'tn': 'tennessee', 'tx': 'texas', 'ut': 'utah', 'vt': 'vermont',
  'va': 'virginia', 'wa': 'washington', 'wv': 'west virginia', 'wi': 'wisconsin', 'wy': 'wyoming',
  'dc': 'district of columbia'
};

// Reverse mapping: full name to abbreviation
const STATE_NAMES_TO_ABBREV: Record<string, string> = Object.fromEntries(
  Object.entries(STATE_ABBREVIATIONS).map(([abbrev, name]) => [name, abbrev.toUpperCase()])
);

// Company/operator to location mapping (by state for filtering)
const OPERATOR_LOCATIONS: Record<string, string[]> = {
  'aws': ['ashburn-va', 'loudoun-county', 'columbus-oh', 'portland-or', 'state-va', 'state-oh', 'state-or'],
  'amazon': ['ashburn-va', 'loudoun-county', 'seattle-wa', 'long-island-city', 'state-va', 'state-wa', 'state-ny'],
  'google': ['silicon-valley', '111-8th-ave', 'des-moines-ia', 'state-ca', 'state-ny', 'state-ia'],
  'microsoft': ['seattle-wa', 'phoenix-az', 'des-moines-ia', 'chicago-il', 'state-wa', 'state-az', 'state-ia', 'state-il'],
  'meta': ['los-lunas-nm', 'phoenix-az', 'des-moines-ia', 'silicon-valley', 'state-nm', 'state-az', 'state-ia', 'state-ca'],
  'facebook': ['los-lunas-nm', 'phoenix-az', 'des-moines-ia', 'state-nm', 'state-az', 'state-ia'],
  'equinix': ['ashburn-va', 'secaucus-nj', 'chicago-il', 'silicon-valley', 'one-wilshire', 'state-va', 'state-nj', 'state-il', 'state-ca'],
  'digital realty': ['ashburn-va', 'dallas-tx', 'chicago-il', 'state-va', 'state-tx', 'state-il'],
  'switch': ['las-vegas-nv', 'state-nv'],
};

// Operator presence by state (for "operator in state" queries)
const OPERATOR_BY_STATE: Record<string, Record<string, string[]>> = {
  'meta': {
    'nm': ['los-lunas-nm', 'state-nm'],
    'new mexico': ['los-lunas-nm', 'state-nm'],
    'az': ['phoenix-az', 'state-az'],
    'arizona': ['phoenix-az', 'state-az'],
    'ia': ['des-moines-ia', 'state-ia'],
    'iowa': ['des-moines-ia', 'state-ia'],
    'ca': ['silicon-valley', 'state-ca'],
    'california': ['silicon-valley', 'state-ca'],
  },
  'facebook': {
    'nm': ['los-lunas-nm', 'state-nm'],
    'new mexico': ['los-lunas-nm', 'state-nm'],
    'az': ['phoenix-az', 'state-az'],
    'arizona': ['phoenix-az', 'state-az'],
    'ia': ['des-moines-ia', 'state-ia'],
    'iowa': ['des-moines-ia', 'state-ia'],
  },
  'aws': {
    'va': ['ashburn-va', 'loudoun-county', 'prince-william', 'state-va'],
    'virginia': ['ashburn-va', 'loudoun-county', 'prince-william', 'state-va'],
    'oh': ['columbus-oh', 'state-oh'],
    'ohio': ['columbus-oh', 'state-oh'],
    'or': ['portland-or', 'state-or'],
    'oregon': ['portland-or', 'state-or'],
  },
  'amazon': {
    'va': ['ashburn-va', 'loudoun-county', 'state-va'],
    'virginia': ['ashburn-va', 'loudoun-county', 'state-va'],
    'wa': ['seattle-wa', 'state-wa'],
    'washington': ['seattle-wa', 'state-wa'],
    'ny': ['long-island-city', 'state-ny'],
    'new york': ['long-island-city', 'state-ny'],
  },
  'google': {
    'ca': ['silicon-valley', 'santa-clara', 'state-ca'],
    'california': ['silicon-valley', 'santa-clara', 'state-ca'],
    'ny': ['111-8th-ave', 'state-ny'],
    'new york': ['111-8th-ave', 'state-ny'],
    'ia': ['des-moines-ia', 'state-ia'],
    'iowa': ['des-moines-ia', 'state-ia'],
  },
  'microsoft': {
    'wa': ['seattle-wa', 'state-wa'],
    'washington': ['seattle-wa', 'state-wa'],
    'az': ['phoenix-az', 'state-az'],
    'arizona': ['phoenix-az', 'state-az'],
    'ia': ['des-moines-ia', 'state-ia'],
    'iowa': ['des-moines-ia', 'state-ia'],
  },
  'equinix': {
    'va': ['ashburn-va', 'loudoun-county', 'state-va'],
    'virginia': ['ashburn-va', 'loudoun-county', 'state-va'],
    'nj': ['secaucus-nj', 'state-nj'],
    'new jersey': ['secaucus-nj', 'state-nj'],
    'ca': ['silicon-valley', 'one-wilshire', 'state-ca'],
    'california': ['silicon-valley', 'one-wilshire', 'state-ca'],
    'il': ['chicago-il', 'state-il'],
    'illinois': ['chicago-il', 'state-il'],
  },
};

// Fuzzy match scoring
function fuzzyMatch(query: string, target: string): number {
  const q = query.toLowerCase();
  const t = target.toLowerCase();
  
  // Exact match
  if (t === q) return 100;
  
  // Starts with
  if (t.startsWith(q)) return 90;
  
  // Contains
  if (t.includes(q)) return 75;
  
  // Word match
  const queryWords = q.split(/\s+/);
  const targetWords = t.split(/\s+/);
  let wordMatches = 0;
  for (const qw of queryWords) {
    if (targetWords.some(tw => tw.startsWith(qw) || tw.includes(qw))) {
      wordMatches++;
    }
  }
  if (wordMatches > 0) return 50 + (wordMatches / queryWords.length) * 30;
  
  // Levenshtein-inspired partial match
  let matches = 0;
  for (let i = 0; i < q.length && i < t.length; i++) {
    if (q[i] === t[i]) matches++;
  }
  return (matches / Math.max(q.length, t.length)) * 40;
}

export const NLPLocationSearch: React.FC<NLPLocationSearchProps> = ({
  onLocationSelect,
  currentLocation,
  onClose
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<LocationSuggestion[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load recent searches from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('dcim_recent_locations');
      if (saved) {
        setRecentSearches(JSON.parse(saved).slice(0, 5));
      }
    } catch {
      // Ignore localStorage errors
    }
  }, []);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Parse NLP query to extract location terms
  const parseNLPQuery = useCallback((input: string): string => {
    for (const { pattern, extract } of NLP_PATTERNS) {
      const match = input.match(pattern);
      if (match) {
        return extract(match).trim();
      }
    }
    return input.trim();
  }, []);

  // Search and rank suggestions
  const searchLocations = useCallback((input: string): LocationSuggestion[] => {
    if (!input || input.length < 2) {
      // Return popular data center hubs when no query
      return LOCATION_DATABASE
        .filter(loc => loc.type === 'datacenter-hub')
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, 8);
    }

    const searchTerm = parseNLPQuery(input);
    const lowerSearch = searchTerm.toLowerCase();
    
    // First, check for "[operator] in [state]" pattern (e.g., "meta in nm")
    const operatorStateMatch = parseOperatorInState(input.trim());
    if (operatorStateMatch) {
      const { operator, state } = operatorStateMatch;
      const operatorStateLocations = OPERATOR_BY_STATE[operator]?.[state] || 
        OPERATOR_BY_STATE[operator]?.[STATE_ABBREVIATIONS[state] || state];
      
      if (operatorStateLocations && operatorStateLocations.length > 0) {
        // Return locations where this operator has presence in this state
        const results = LOCATION_DATABASE.filter(loc => 
          operatorStateLocations.includes(loc.id) ||
          // Also include locations that match both operator tag and state
          (loc.tags?.some(t => t.toLowerCase() === operator || t.toLowerCase().includes(operator)) &&
           (loc.location.state.toLowerCase() === state.toUpperCase() || 
            loc.location.state.toLowerCase() === (STATE_NAMES_TO_ABBREV[STATE_ABBREVIATIONS[state] || state] || '').toLowerCase() ||
            loc.tags?.some(t => t.toLowerCase() === state || t.toLowerCase() === (STATE_ABBREVIATIONS[state] || state))))
        );
        
        // Sort by relevance and return
        return results.sort((a, b) => b.relevance - a.relevance);
      }
    }

    // Check if searching by operator alone
    const operatorMatch = Object.keys(OPERATOR_LOCATIONS).find(op => 
      lowerSearch.includes(op) || lowerSearch === op
    );

    let results: LocationSuggestion[] = [];

    if (operatorMatch && !lowerSearch.includes(' in ') && !lowerSearch.includes(' at ')) {
      // Return locations associated with the operator
      const locationIds = OPERATOR_LOCATIONS[operatorMatch];
      results = LOCATION_DATABASE.filter(loc => locationIds.includes(loc.id));
    } else {
      // Fuzzy search across all fields
      results = LOCATION_DATABASE.map(loc => {
        let score = 0;
        
        // Match against display name
        score = Math.max(score, fuzzyMatch(searchTerm, loc.display));
        
        // Match against city/state
        score = Math.max(score, fuzzyMatch(searchTerm, loc.location.city));
        score = Math.max(score, fuzzyMatch(searchTerm, loc.location.state));
        
        // Match against neighborhood
        if (loc.location.neighborhood) {
          score = Math.max(score, fuzzyMatch(searchTerm, loc.location.neighborhood));
        }
        
        // Match against tags
        if (loc.tags) {
          for (const tag of loc.tags) {
            score = Math.max(score, fuzzyMatch(searchTerm, tag) * 0.9);
          }
        }
        
        // Match against description
        if (loc.description) {
          score = Math.max(score, fuzzyMatch(searchTerm, loc.description) * 0.7);
        }

        return { ...loc, matchScore: score };
      })
      .filter(loc => (loc as LocationSuggestion & { matchScore: number }).matchScore > 30)
      .sort((a, b) => {
        const aScore = (a as LocationSuggestion & { matchScore: number }).matchScore;
        const bScore = (b as LocationSuggestion & { matchScore: number }).matchScore;
        // Combine match score with relevance
        return (bScore + b.relevance * 0.3) - (aScore + a.relevance * 0.3);
      });
    }

    // Add recent searches that match
    const matchingRecent = recentSearches.filter(r => 
      fuzzyMatch(searchTerm, r.display) > 50
    ).map(r => ({ ...r, type: 'recent' as const }));

    // Merge and deduplicate
    const seen = new Set<string>();
    const merged: LocationSuggestion[] = [];
    
    // Recent first if they match well
    for (const r of matchingRecent) {
      if (!seen.has(r.id)) {
        seen.add(r.id);
        merged.push(r);
      }
    }
    
    // Then sorted results
    for (const loc of results) {
      if (!seen.has(loc.id)) {
        seen.add(loc.id);
        merged.push(loc);
      }
    }

    return merged.slice(0, 12);
  }, [parseNLPQuery, recentSearches]);

  // Update suggestions on query change
  useEffect(() => {
    setIsSearching(true);
    const timeout = setTimeout(() => {
      setSuggestions(searchLocations(query));
      setSelectedIndex(0);
      setIsSearching(false);
    }, 100);
    return () => clearTimeout(timeout);
  }, [query, searchLocations]);

  // Save to recent searches
  const saveToRecent = useCallback((location: LocationSuggestion) => {
    try {
      const recent = [location, ...recentSearches.filter(r => r.id !== location.id)].slice(0, 5);
      setRecentSearches(recent);
      localStorage.setItem('dcim_recent_locations', JSON.stringify(recent));
    } catch {
      // Ignore localStorage errors
    }
  }, [recentSearches]);

  // Handle selection
  const handleSelect = useCallback((suggestion: LocationSuggestion) => {
    saveToRecent(suggestion);
    onLocationSelect(suggestion.location);
    onClose?.();
  }, [onLocationSelect, onClose, saveToRecent]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(i => Math.max(i - 1, 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        onClose?.();
        break;
    }
  }, [suggestions, selectedIndex, handleSelect, onClose]);

  // Get icon for suggestion type
  const getTypeIcon = (type: LocationSuggestion['type']) => {
    switch (type) {
      case 'datacenter-hub': return <Building className="w-4 h-4 text-[#f0883e]" />;
      case 'city': return <MapPin className="w-4 h-4 text-[#58a6ff]" />;
      case 'neighborhood': return <Navigation className="w-4 h-4 text-[#3fb950]" />;
      case 'landmark': return <Star className="w-4 h-4 text-[#d29922]" />;
      case 'region': return <Globe className="w-4 h-4 text-[#a371f7]" />;
      case 'recent': return <History className="w-4 h-4 text-[#8b949e]" />;
      case 'state': return <Map className="w-4 h-4 text-[#6e7681]" />;
      case 'zipcode': return <Target className="w-4 h-4 text-[#58a6ff]" />;
      default: return <MapPin className="w-4 h-4 text-[#8b949e]" />;
    }
  };

  // Get badge for type
  const getTypeBadge = (type: LocationSuggestion['type']) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      'datacenter-hub': { bg: 'bg-[#f0883e]/20', text: 'text-[#f0883e]', label: 'DC Hub' },
      'city': { bg: 'bg-[#58a6ff]/20', text: 'text-[#58a6ff]', label: 'City' },
      'neighborhood': { bg: 'bg-[#3fb950]/20', text: 'text-[#3fb950]', label: 'Area' },
      'landmark': { bg: 'bg-[#d29922]/20', text: 'text-[#d29922]', label: 'Landmark' },
      'region': { bg: 'bg-[#a371f7]/20', text: 'text-[#a371f7]', label: 'Region' },
      'recent': { bg: 'bg-[#30363d]', text: 'text-[#8b949e]', label: 'Recent' },
      'state': { bg: 'bg-[#21262d]', text: 'text-[#6e7681]', label: 'State' },
      'zipcode': { bg: 'bg-[#58a6ff]/20', text: 'text-[#58a6ff]', label: 'ZIP' },
    };
    const badge = badges[type] || badges['city'];
    return (
      <span className={`text-[10px] px-1.5 py-0.5 rounded ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl overflow-hidden w-full max-w-lg">
      {/* Header */}
      <div className="px-4 py-3 bg-[#21262d] border-b border-[#30363d] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[#f0883e]" />
          <span className="font-semibold text-[#e6edf3]">Smart Location Search</span>
          <span className="text-[10px] px-2 py-0.5 bg-[#3fb950]/20 text-[#3fb950] rounded-full">NLP</span>
        </div>
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-[#8b949e] hover:text-[#e6edf3] transition-colors"
        >
          <AlertCircle className="w-4 h-4" />
        </button>
      </div>

      {/* Help Panel */}
      {showHelp && (
        <div className="px-4 py-3 bg-[#0d1117] border-b border-[#30363d] text-xs text-[#8b949e]">
          <p className="font-semibold text-[#e6edf3] mb-2">Try searching for:</p>
          <div className="grid grid-cols-2 gap-2">
            <div>• "near Times Square"</div>
            <div>• "data centers in Virginia"</div>
            <div>• "AWS facilities"</div>
            <div>• "Brooklyn waterfront"</div>
            <div>• "Northern Virginia"</div>
            <div>• "10001" (zip code)</div>
          </div>
        </div>
      )}

      {/* Search Input */}
      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#8b949e]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type location, landmark, or 'near [place]'..."
            className="w-full pl-10 pr-10 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] placeholder:text-[#6e7681] focus:outline-none focus:ring-2 focus:ring-[#58a6ff] focus:border-transparent"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#58a6ff] animate-spin" />
          )}
          {query && !isSearching && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#8b949e] hover:text-[#e6edf3]"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick NLP hints */}
        <div className="flex items-center gap-2 mt-2 overflow-x-auto pb-1">
          <span className="text-[10px] text-[#6e7681] shrink-0">Try:</span>
          {['near me', 'AWS', 'Northern Virginia', 'NYC', 'hyperscalers'].map((hint) => (
            <button
              key={hint}
              onClick={() => setQuery(hint)}
              className="text-[10px] px-2 py-1 bg-[#21262d] text-[#8b949e] rounded-full hover:bg-[#30363d] hover:text-[#e6edf3] transition-colors shrink-0"
            >
              {hint}
            </button>
          ))}
        </div>
      </div>

      {/* Suggestions List */}
      <div className="max-h-80 overflow-y-auto border-t border-[#30363d]">
        {!query && recentSearches.length > 0 && (
          <div className="px-3 py-2 bg-[#0d1117]">
            <span className="text-[10px] text-[#6e7681] font-semibold uppercase tracking-wider">Recent</span>
          </div>
        )}
        
        {suggestions.length === 0 && query.length >= 2 ? (
          <div className="px-4 py-8 text-center text-[#8b949e]">
            <MapPin className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No locations found</p>
            <p className="text-xs mt-1">Try a different search term</p>
          </div>
        ) : (
          <div className="divide-y divide-[#21262d]">
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.id}
                onClick={() => handleSelect(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`w-full px-4 py-3 flex items-start gap-3 text-left transition-colors ${
                  index === selectedIndex
                    ? 'bg-[#21262d]'
                    : 'hover:bg-[#161b22]'
                }`}
              >
                <div className="mt-0.5">
                  {getTypeIcon(suggestion.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-[#e6edf3] truncate">
                      {suggestion.display}
                    </span>
                    {getTypeBadge(suggestion.type)}
                  </div>
                  {suggestion.description && (
                    <p className="text-xs text-[#8b949e] mt-0.5 truncate">
                      {suggestion.description}
                    </p>
                  )}
                  {suggestion.tags && suggestion.tags.length > 0 && (
                    <div className="flex items-center gap-1 mt-1 flex-wrap">
                      {suggestion.tags.slice(0, 4).map((tag) => (
                        <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-[#30363d] text-[#8b949e] rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-[#6e7681] shrink-0 mt-1" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer with popular DC hubs */}
      {!query && (
        <div className="px-3 py-3 bg-[#0d1117] border-t border-[#30363d]">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#f0883e]" />
            <span className="text-xs font-semibold text-[#e6edf3]">Top Data Center Markets</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['Ashburn VA', 'Phoenix AZ', 'Dallas TX', 'Chicago IL', 'Silicon Valley'].map((hub) => (
              <button
                key={hub}
                onClick={() => setQuery(hub)}
                className="text-xs px-2 py-1 bg-[#21262d] text-[#8b949e] rounded hover:bg-[#30363d] hover:text-[#e6edf3] transition-colors flex items-center gap-1"
              >
                <Building className="w-3 h-3 text-[#f0883e]" />
                {hub}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current location indicator */}
      {currentLocation && currentLocation.city !== 'Detecting...' && (
        <div className="px-4 py-2 bg-[#21262d] border-t border-[#30363d] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-[#8b949e]">
            <Check className="w-4 h-4 text-[#3fb950]" />
            <span>Current: <strong className="text-[#e6edf3]">{currentLocation.neighborhood || currentLocation.city}, {currentLocation.state}</strong></span>
          </div>
          <button
            onClick={onClose}
            className="text-xs text-[#58a6ff] hover:underline"
          >
            Keep
          </button>
        </div>
      )}
    </div>
  );
};

export default NLPLocationSearch;

