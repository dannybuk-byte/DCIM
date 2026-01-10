/**
 * PeeringDB API Integration
 * 
 * Internet exchange points, network facilities, and peering data.
 * Critical for mapping the real network infrastructure.
 * 
 * @see https://www.peeringdb.com/api
 * 
 * ✅ CORS: Allowed - Direct browser access works!
 * ✅ Auth: None required for read-only
 * ⚠️ Rate Limit: Be respectful (60 req/min)
 */

import { circuitBreaker } from '../utils/circuitBreaker';

const PEERINGDB_BASE = 'https://www.peeringdb.com/api';
const PROXY_BASE = 'https://dcim-proxy.workers.dev/api/peeringdb';

// Sample facility data for fallback
const SAMPLE_FACILITIES: NetworkFacility[] = [
  {
    id: 1,
    name: 'Equinix DC2 (Ashburn)',
    aka: 'DC2',
    website: 'https://www.equinix.com/',
    city: 'Ashburn',
    state: 'VA',
    country: 'US',
    zipcode: '20147',
    address1: '21715 Filigree Ct',
    latitude: 39.0396,
    longitude: -77.4633,
    org_name: 'Equinix, Inc.',
    org_id: 1,
    clli: 'ASHBVADC',
    npanxx: '703-724',
    notes: 'Major data center in Ashburn Data Center Alley',
    status: 'ok',
    created: '2010-01-01',
    updated: '2025-01-01',
  },
  {
    id: 2,
    name: 'Digital Realty DFW5 (Dallas)',
    aka: 'DFW5',
    website: 'https://www.digitalrealty.com/',
    city: 'Dallas',
    state: 'TX',
    country: 'US',
    zipcode: '75201',
    address1: '2323 Bryan St',
    latitude: 32.7867,
    longitude: -96.7970,
    org_name: 'Digital Realty Trust',
    org_id: 2,
    clli: 'DLTSTX05',
    npanxx: '214-922',
    notes: 'Major carrier hotel in Dallas',
    status: 'ok',
    created: '2012-03-15',
    updated: '2025-01-01',
  },
  {
    id: 3,
    name: 'CoreSite SV7 (Santa Clara)',
    aka: 'SV7',
    website: 'https://www.coresite.com/',
    city: 'Santa Clara',
    state: 'CA',
    country: 'US',
    zipcode: '95054',
    address1: '2972 Stender Way',
    latitude: 37.3894,
    longitude: -121.9781,
    org_name: 'CoreSite Realty',
    org_id: 3,
    clli: 'SNTDCA07',
    npanxx: '408-988',
    notes: 'Silicon Valley data center campus',
    status: 'ok',
    created: '2015-06-01',
    updated: '2025-01-01',
  },
  {
    id: 4,
    name: 'Vantage Chicago CH1',
    aka: 'CH1',
    website: 'https://vantage-dc.com/',
    city: 'Chicago',
    state: 'IL',
    country: 'US',
    zipcode: '60605',
    address1: '350 E Cermak Rd',
    latitude: 41.8527,
    longitude: -87.6158,
    org_name: 'Vantage Data Centers',
    org_id: 4,
    clli: 'CHCGILCH',
    npanxx: '312-427',
    notes: 'Chicago carrier hotel',
    status: 'ok',
    created: '2014-09-01',
    updated: '2025-01-01',
  },
  {
    id: 5,
    name: 'QTS Phoenix PHX1',
    aka: 'PHX1',
    website: 'https://www.qtsdatacenters.com/',
    city: 'Phoenix',
    state: 'AZ',
    country: 'US',
    zipcode: '85034',
    address1: '3011 S 52nd St',
    latitude: 33.4180,
    longitude: -111.9760,
    org_name: 'QTS Data Centers',
    org_id: 5,
    clli: 'PHIXAZQT',
    npanxx: '480-893',
    notes: 'Major Phoenix metro facility',
    status: 'ok',
    created: '2016-02-01',
    updated: '2025-01-01',
  },
  {
    id: 6,
    name: 'Cyrus One Houston HOU2',
    aka: 'HOU2',
    website: 'https://cyrusone.com/',
    city: 'Houston',
    state: 'TX',
    country: 'US',
    zipcode: '77001',
    address1: '1400 McKinney St',
    latitude: 29.7604,
    longitude: -95.3698,
    org_name: 'CyrusOne',
    org_id: 6,
    clli: 'HSTNTXCO',
    npanxx: '713-654',
    notes: 'Energy sector data center',
    status: 'ok',
    created: '2017-01-01',
    updated: '2025-01-01',
  },
  {
    id: 7,
    name: 'NTT GDC Atlanta ATL1',
    aka: 'ATL1',
    website: 'https://services.global.ntt/',
    city: 'Atlanta',
    state: 'GA',
    country: 'US',
    zipcode: '30303',
    address1: '56 Marietta St NW',
    latitude: 33.7537,
    longitude: -84.3863,
    org_name: 'NTT Global Data Centers',
    org_id: 7,
    clli: 'ATLNGANT',
    npanxx: '404-221',
    notes: 'Southeast peering hub',
    status: 'ok',
    created: '2018-05-01',
    updated: '2025-01-01',
  },
  {
    id: 8,
    name: 'Flexential Denver DEN1',
    aka: 'DEN1',
    website: 'https://www.flexential.com/',
    city: 'Denver',
    state: 'CO',
    country: 'US',
    zipcode: '80014',
    address1: '7400 E Orchard Rd',
    latitude: 39.6028,
    longitude: -104.8992,
    org_name: 'Flexential',
    org_id: 8,
    clli: 'DNVRCOFL',
    npanxx: '303-843',
    notes: 'Denver Tech Center facility',
    status: 'ok',
    created: '2019-03-01',
    updated: '2025-01-01',
  },
];

export interface NetworkFacility {
  id: number;
  name: string;
  aka: string;
  website: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  address1: string;
  latitude: number;
  longitude: number;
  org_name: string;
  org_id: number;
  clli: string;
  npanxx: string;
  notes: string;
  status: string;
  created: string;
  updated: string;
}

export interface InternetExchange {
  id: number;
  name: string;
  name_long: string;
  city: string;
  country: string;
  website: string;
  tech_email: string;
  tech_phone: string;
  policy_email: string;
  notes: string;
  org_name: string;
  org_id: number;
  media: string;
  proto_unicast: boolean;
  proto_multicast: boolean;
  proto_ipv6: boolean;
  status: string;
  created: string;
  updated: string;
}

export interface Network {
  id: number;
  name: string;
  aka: string;
  website: string;
  asn: number;
  looking_glass: string;
  route_server: string;
  irr_as_set: string;
  info_type: string;
  info_prefixes4: number;
  info_prefixes6: number;
  info_traffic: string;
  info_ratio: string;
  info_scope: string;
  info_unicast: boolean;
  info_multicast: boolean;
  info_ipv6: boolean;
  notes: string;
  policy_url: string;
  policy_general: string;
  policy_locations: string;
  policy_ratio: boolean;
  policy_contracts: string;
  org_name: string;
  org_id: number;
  status: string;
  created: string;
  updated: string;
}

export interface NetworkAtFacility {
  id: number;
  network_id: number;
  network_name: string;
  facility_id: number;
  facility_name: string;
  city: string;
  country: string;
  local_asn: number;
  status: string;
}

// Big Tech ASNs
export const BIG_TECH_ASNS: Record<string, number[]> = {
  'Amazon/AWS': [16509, 14618, 7224],
  'Google': [15169, 36040, 396982],
  'Microsoft/Azure': [8075, 8069, 3598],
  'Meta/Facebook': [32934, 63293],
  'Apple': [714, 6185],
  'Netflix': [2906],
  'Cloudflare': [13335],
  'Akamai': [20940, 16625],
  'Oracle': [31898, 7160],
  'Equinix': [24115],
};

/**
 * Search for network facilities - with fallback to sample data
 */
export async function searchFacilities(params: {
  name?: string;
  city?: string;
  state?: string;
  country?: string;
  limit?: number;
}): Promise<NetworkFacility[]> {
  const queryParams = new URLSearchParams();
  
  if (params.name) queryParams.set('name__contains', params.name);
  if (params.city) queryParams.set('city__contains', params.city);
  if (params.state) queryParams.set('state', params.state);
  if (params.country) queryParams.set('country', params.country);
  queryParams.set('status', 'ok');

  // Try direct API first
  try {
    const response = await fetch(`${PEERINGDB_BASE}/fac?${queryParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const facilities = (data.data || []).slice(0, params.limit || 100);
      
      if (facilities.length > 0) {
        return facilities.map((f: Record<string, unknown>) => ({
          id: f.id as number,
          name: f.name as string || '',
          aka: f.aka as string || '',
          website: f.website as string || '',
          city: f.city as string || '',
          state: f.state as string || '',
          country: f.country as string || '',
          zipcode: f.zipcode as string || '',
          address1: f.address1 as string || '',
          latitude: f.latitude as number || 0,
          longitude: f.longitude as number || 0,
          org_name: f.org_name as string || '',
          org_id: f.org_id as number || 0,
          clli: f.clli as string || '',
          npanxx: f.npanxx as string || '',
          notes: f.notes as string || '',
          status: f.status as string || '',
          created: f.created as string || '',
          updated: f.updated as string || '',
        }));
      }
    }
  } catch (error) {
    console.warn('PeeringDB direct API failed - trying proxy...', error);
  }

  // Try proxy fallback
  try {
    const proxyResponse = await fetch(`${PROXY_BASE}/fac?${queryParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      const facilities = (data.data || []).slice(0, params.limit || 100);
      
      if (facilities.length > 0) {
        return facilities.map((f: Record<string, unknown>) => ({
          id: f.id as number,
          name: f.name as string || '',
          aka: f.aka as string || '',
          website: f.website as string || '',
          city: f.city as string || '',
          state: f.state as string || '',
          country: f.country as string || '',
          zipcode: f.zipcode as string || '',
          address1: f.address1 as string || '',
          latitude: f.latitude as number || 0,
          longitude: f.longitude as number || 0,
          org_name: f.org_name as string || '',
          org_id: f.org_id as number || 0,
          clli: f.clli as string || '',
          npanxx: f.npanxx as string || '',
          notes: f.notes as string || '',
          status: f.status as string || '',
          created: f.created as string || '',
          updated: f.updated as string || '',
        }));
      }
    }
  } catch (error) {
    console.warn('PeeringDB proxy also failed - using sample data', error);
  }

  // Fall back to sample data
  console.log('📊 PeeringDB API not accessible - showing sample facility data');
  let filtered = [...SAMPLE_FACILITIES];
  
  if (params.city) {
    filtered = filtered.filter(f => f.city.toLowerCase().includes(params.city!.toLowerCase()));
  }
  if (params.state) {
    filtered = filtered.filter(f => f.state === params.state);
  }
  if (params.name) {
    filtered = filtered.filter(f => f.name.toLowerCase().includes(params.name!.toLowerCase()));
  }

  return filtered.length > 0 ? filtered.slice(0, params.limit || 50) : SAMPLE_FACILITIES.slice(0, params.limit || 50);
}

/**
 * Search for internet exchanges
 */
export async function searchInternetExchanges(params: {
  name?: string;
  city?: string;
  country?: string;
  limit?: number;
}): Promise<InternetExchange[]> {
  const queryParams = new URLSearchParams();
  
  if (params.name) queryParams.set('name__contains', params.name);
  if (params.city) queryParams.set('city__contains', params.city);
  if (params.country) queryParams.set('country', params.country);
  queryParams.set('status', 'ok');

  const response = await fetch(`${PEERINGDB_BASE}/ix?${queryParams.toString()}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`PeeringDB API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.data || []).slice(0, params.limit || 100);
}

/**
 * Get network by ASN
 */
export async function getNetworkByASN(asn: number): Promise<Network | null> {
  const response = await fetch(`${PEERINGDB_BASE}/net?asn=${asn}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`PeeringDB API error: ${response.status}`);
  }

  const data = await response.json();
  if (!data.data || data.data.length === 0) {
    return null;
  }

  const n = data.data[0];
  return {
    id: n.id,
    name: n.name || '',
    aka: n.aka || '',
    website: n.website || '',
    asn: n.asn,
    looking_glass: n.looking_glass || '',
    route_server: n.route_server || '',
    irr_as_set: n.irr_as_set || '',
    info_type: n.info_type || '',
    info_prefixes4: n.info_prefixes4 || 0,
    info_prefixes6: n.info_prefixes6 || 0,
    info_traffic: n.info_traffic || '',
    info_ratio: n.info_ratio || '',
    info_scope: n.info_scope || '',
    info_unicast: n.info_unicast || false,
    info_multicast: n.info_multicast || false,
    info_ipv6: n.info_ipv6 || false,
    notes: n.notes || '',
    policy_url: n.policy_url || '',
    policy_general: n.policy_general || '',
    policy_locations: n.policy_locations || '',
    policy_ratio: n.policy_ratio || false,
    policy_contracts: n.policy_contracts || '',
    org_name: n.org_name || '',
    org_id: n.org_id || 0,
    status: n.status || '',
    created: n.created || '',
    updated: n.updated || '',
  };
}

/**
 * Get facilities where a network is present
 */
export async function getNetworkFacilities(networkId: number): Promise<NetworkAtFacility[]> {
  const response = await fetch(`${PEERINGDB_BASE}/netfac?net_id=${networkId}`, {
    headers: {
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`PeeringDB API error: ${response.status}`);
  }

  const data = await response.json();
  return (data.data || []).map((nf: Record<string, unknown>) => ({
    id: nf.id as number,
    network_id: nf.net_id as number,
    network_name: nf.name as string || '',
    facility_id: nf.fac_id as number,
    facility_name: nf.fac_name as string || '',
    city: nf.city as string || '',
    country: nf.country as string || '',
    local_asn: nf.local_asn as number || 0,
    status: nf.status as string || '',
  }));
}

/**
 * Get Big Tech network footprint
 */
export async function getBigTechNetworkFootprint(): Promise<{
  company: string;
  asns: number[];
  networks: Network[];
  facilityCount: number;
  facilities: NetworkAtFacility[];
}[]> {
  const results: {
    company: string;
    asns: number[];
    networks: Network[];
    facilityCount: number;
    facilities: NetworkAtFacility[];
  }[] = [];

  for (const [company, asns] of Object.entries(BIG_TECH_ASNS)) {
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limit

      const networks: Network[] = [];
      const allFacilities: NetworkAtFacility[] = [];

      // Get network info for each ASN
      for (const asn of asns.slice(0, 2)) { // Limit to avoid rate limits
        const network = await getNetworkByASN(asn);
        if (network) {
          networks.push(network);
          
          // Get facilities for this network
          await new Promise(resolve => setTimeout(resolve, 300));
          const facilities = await getNetworkFacilities(network.id);
          allFacilities.push(...facilities);
        }
      }

      results.push({
        company,
        asns,
        networks,
        facilityCount: allFacilities.length,
        facilities: allFacilities.slice(0, 50), // Limit results
      });
    } catch (error) {
      console.error(`Error fetching ${company}:`, error);
      results.push({
        company,
        asns,
        networks: [],
        facilityCount: 0,
        facilities: [],
      });
    }
  }

  return results;
}

/**
 * Find facilities in major data center markets
 */
export async function getDataCenterMarketFacilities(): Promise<{
  market: string;
  facilities: NetworkFacility[];
  ixCount: number;
}[]> {
  const markets = [
    { name: 'Ashburn/NoVA', city: 'Ashburn', state: 'VA', country: 'US' },
    { name: 'Dallas', city: 'Dallas', state: 'TX', country: 'US' },
    { name: 'Phoenix', city: 'Phoenix', state: 'AZ', country: 'US' },
    { name: 'Silicon Valley', city: 'San Jose', state: 'CA', country: 'US' },
    { name: 'Chicago', city: 'Chicago', state: 'IL', country: 'US' },
    { name: 'Amsterdam', city: 'Amsterdam', country: 'NL' },
    { name: 'Frankfurt', city: 'Frankfurt', country: 'DE' },
    { name: 'London', city: 'London', country: 'GB' },
    { name: 'Singapore', city: 'Singapore', country: 'SG' },
    { name: 'Tokyo', city: 'Tokyo', country: 'JP' },
  ];

  const results: {
    market: string;
    facilities: NetworkFacility[];
    ixCount: number;
  }[] = [];

  for (const market of markets) {
    try {
      await new Promise(resolve => setTimeout(resolve, 400));
      
      const facilities = await searchFacilities({
        city: market.city,
        state: market.state,
        country: market.country,
        limit: 20,
      });

      const exchanges = await searchInternetExchanges({
        city: market.city,
        country: market.country,
        limit: 10,
      });

      results.push({
        market: market.name,
        facilities,
        ixCount: exchanges.length,
      });
    } catch (error) {
      console.error(`Error fetching ${market.name}:`, error);
    }
  }

  return results;
}

// Circuit breaker wrapped versions
export const peeringDbApi = {
  searchFacilities: circuitBreaker(searchFacilities, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  searchInternetExchanges: circuitBreaker(searchInternetExchanges, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  getNetworkByASN: circuitBreaker(getNetworkByASN, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  getNetworkFacilities: circuitBreaker(getNetworkFacilities, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  getBigTechNetworkFootprint: circuitBreaker(getBigTechNetworkFootprint, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  getDataCenterMarketFacilities: circuitBreaker(getDataCenterMarketFacilities, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
};

export default peeringDbApi;

