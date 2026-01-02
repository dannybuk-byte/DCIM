/**
 * Unified API Registry for DCIM Infrastructure Discovery
 * 
 * This service provides a centralized registry of all free/open-source APIs
 * that can be used to discover and visualize digital infrastructure.
 */

export interface APIConfig {
  id: string;
  name: string;
  category: APICategory;
  baseUrl: string;
  authType: 'none' | 'api_key' | 'bearer' | 'oauth';
  rateLimit?: {
    requests: number;
    period: number; // in seconds
  };
  cacheTTL: number; // in milliseconds
  enabled: boolean;
  description: string;
  documentationUrl?: string;
  dataType: DataType[];
}

export type APICategory = 
  | 'network_discovery'
  | 'infrastructure_location'
  | 'business_ownership'
  | 'environmental_compliance'
  | 'network_analytics'
  | 'visualization'
  | 'power_energy';

export type DataType = 
  | 'facilities'
  | 'racks'
  | 'devices'
  | 'network_topology'
  | 'ip_ranges'
  | 'asn_info'
  | 'company_info'
  | 'environmental'
  | 'power'
  | 'cooling'
  | 'geographic'
  | 'certificates';

/**
 * Registry of all available free/open-source APIs
 */
export const API_REGISTRY: Record<string, APIConfig> = {
  // Network Discovery APIs
  peeringdb: {
    id: 'peeringdb',
    name: 'PeeringDB',
    category: 'network_discovery',
    baseUrl: 'https://www.peeringdb.com/api',
    authType: 'none',
    rateLimit: { requests: 10, period: 1 },
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    enabled: true,
    description: 'Network facilities, IXPs, interconnection data',
    documentationUrl: 'https://www.peeringdb.com/apidocs/',
    dataType: ['facilities', 'network_topology', 'ip_ranges'],
  },
  
  ripe_ris_live: {
    id: 'ripe_ris_live',
    name: 'RIPE RIS Live',
    category: 'network_discovery',
    baseUrl: 'wss://ris-live.ripe.net/v1/ws/',
    authType: 'none',
    cacheTTL: 0, // Real-time streaming
    enabled: true,
    description: 'Real-time BGP routing data via WebSocket',
    documentationUrl: 'https://ris-live.ripe.net/manual/',
    dataType: ['network_topology', 'asn_info'],
  },
  
  ripe_stat: {
    id: 'ripe_stat',
    name: 'RIPE Stat',
    category: 'network_analytics',
    baseUrl: 'https://stat.ripe.net/data',
    authType: 'none',
    rateLimit: { requests: 100, period: 60 },
    cacheTTL: 60 * 60 * 1000, // 1 hour
    enabled: true,
    description: 'Network statistics, ASN information, routing data',
    documentationUrl: 'https://stat.ripe.net/docs/data_api',
    dataType: ['asn_info', 'network_topology', 'ip_ranges'],
  },
  
  he_bgp: {
    id: 'he_bgp',
    name: 'Hurricane Electric BGP Toolkit',
    category: 'network_discovery',
    baseUrl: 'https://bgp.he.net',
    authType: 'none',
    rateLimit: { requests: 30, period: 60 },
    cacheTTL: 6 * 60 * 60 * 1000, // 6 hours
    enabled: true,
    description: 'ASN information, IP geolocation, BGP data',
    documentationUrl: 'https://bgp.he.net/',
    dataType: ['asn_info', 'ip_ranges', 'geographic'],
  },
  
  crtsh: {
    id: 'crtsh',
    name: 'Certificate Transparency (crt.sh)',
    category: 'network_discovery',
    baseUrl: 'https://crt.sh',
    authType: 'none',
    rateLimit: { requests: 20, period: 1 },
    cacheTTL: 4 * 60 * 60 * 1000, // 4 hours
    enabled: true,
    description: 'SSL certificate discovery, domain enumeration',
    documentationUrl: 'https://crt.sh/?q=example.com&output=json',
    dataType: ['certificates'],
  },
  
  cloudflare_radar: {
    id: 'cloudflare_radar',
    name: 'Cloudflare Radar',
    category: 'network_analytics',
    baseUrl: 'https://api.cloudflare.com/client/v4/radar',
    authType: 'api_key',
    rateLimit: { requests: 1000, period: 300 }, // Free tier
    cacheTTL: 60 * 60 * 1000, // 1 hour
    enabled: true,
    description: 'Edge locations, network insights, traffic patterns',
    documentationUrl: 'https://developers.cloudflare.com/radar/',
    dataType: ['facilities', 'network_topology', 'geographic'],
  },
  
  submarine_cable_map: {
    id: 'submarine_cable_map',
    name: 'Submarine Cable Map',
    category: 'infrastructure_location',
    baseUrl: 'https://www.submarinecablemap.com/api',
    authType: 'none',
    cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    enabled: true,
    description: 'Undersea cable routes and landing stations',
    dataType: ['geographic', 'facilities'],
  },
  
  // Infrastructure Location APIs
  nominatim: {
    id: 'nominatim',
    name: 'OpenStreetMap Nominatim',
    category: 'infrastructure_location',
    baseUrl: 'https://nominatim.openstreetmap.org',
    authType: 'none',
    rateLimit: { requests: 1, period: 1 }, // Strict rate limit
    cacheTTL: 30 * 24 * 60 * 60 * 1000, // 30 days
    enabled: true,
    description: 'Geocoding, reverse geocoding, address lookup',
    documentationUrl: 'https://nominatim.org/release-docs/develop/api/Overview/',
    dataType: ['geographic'],
  },
  
  // Business & Ownership APIs
  sec_edgar: {
    id: 'sec_edgar',
    name: 'SEC EDGAR',
    category: 'business_ownership',
    baseUrl: 'https://www.sec.gov/cgi-bin/browse-edgar',
    authType: 'none',
    rateLimit: { requests: 10, period: 1 }, // SEC rate limits
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    enabled: true,
    description: 'Company filings, ownership, financial data',
    documentationUrl: 'https://www.sec.gov/edgar/sec-api-documentation',
    dataType: ['company_info'],
  },
  
  gleif: {
    id: 'gleif',
    name: 'GLEIF (Global Legal Entity Identifier)',
    category: 'business_ownership',
    baseUrl: 'https://api.gleif.org/api/v1',
    authType: 'none',
    rateLimit: { requests: 100, period: 60 },
    cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    enabled: true,
    description: 'Legal entity identification, ownership chains',
    documentationUrl: 'https://www.gleif.org/en/market-data/gleif-golden-copy-download-the-lei-data-file',
    dataType: ['company_info'],
  },
  
  usaspending: {
    id: 'usaspending',
    name: 'USASpending.gov',
    category: 'business_ownership',
    baseUrl: 'https://api.usaspending.gov',
    authType: 'none',
    rateLimit: { requests: 100, period: 60 },
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    enabled: true,
    description: 'Government contracts, subsidies, spending data',
    documentationUrl: 'https://api.usaspending.gov/',
    dataType: ['company_info'],
  },
  
  // Environmental & Compliance APIs
  epa_echo: {
    id: 'epa_echo',
    name: 'EPA ECHO',
    category: 'environmental_compliance',
    baseUrl: 'https://echo.epa.gov',
    authType: 'none',
    rateLimit: { requests: 20, period: 60 },
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    enabled: true,
    description: 'Environmental compliance, facility permits',
    documentationUrl: 'https://echo.epa.gov/tools/web-services',
    dataType: ['environmental', 'facilities'],
  },
  
  epa_airnow: {
    id: 'epa_airnow',
    name: 'EPA AirNow',
    category: 'environmental_compliance',
    baseUrl: 'https://www.airnowapi.org/aq',
    authType: 'api_key',
    rateLimit: { requests: 500, period: 3600 }, // Free tier
    cacheTTL: 60 * 60 * 1000, // 1 hour
    enabled: true,
    description: 'Air quality data for facility locations',
    documentationUrl: 'https://www.airnow.gov/technical-information/',
    dataType: ['environmental'],
  },
  
  eia: {
    id: 'eia',
    name: 'US Energy Information Administration',
    category: 'power_energy',
    baseUrl: 'https://api.eia.gov/v2',
    authType: 'api_key',
    rateLimit: { requests: 5000, period: 86400 }, // Daily limit
    cacheTTL: 24 * 60 * 60 * 1000, // 24 hours
    enabled: true,
    description: 'Power grid data, energy consumption, generation',
    documentationUrl: 'https://www.eia.gov/opendata/',
    dataType: ['power'],
  },
  
  // IP Geolocation (Free tiers)
  ipapi: {
    id: 'ipapi',
    name: 'ipapi.co',
    category: 'infrastructure_location',
    baseUrl: 'https://ipapi.co',
    authType: 'none',
    rateLimit: { requests: 1000, period: 86400 }, // 1k/month free
    cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    enabled: true,
    description: 'IP geolocation, ASN lookup',
    documentationUrl: 'https://ipapi.co/api/',
    dataType: ['geographic', 'asn_info'],
  },
  
  // Additional Network Analytics
  caida_asrank: {
    id: 'caida_asrank',
    name: 'CAIDA AS Rank',
    category: 'network_analytics',
    baseUrl: 'https://asrank.caida.org/api/v2',
    authType: 'none',
    cacheTTL: 7 * 24 * 60 * 60 * 1000, // 7 days
    enabled: true,
    description: 'Autonomous System rankings and relationships',
    documentationUrl: 'https://asrank.caida.org/',
    dataType: ['asn_info', 'network_topology'],
  },
};

/**
 * Get all enabled APIs by category
 */
export function getAPIsByCategory(category: APICategory): APIConfig[] {
  return Object.values(API_REGISTRY).filter(
    api => api.category === category && api.enabled
  );
}

/**
 * Get all APIs that provide a specific data type
 */
export function getAPIsByDataType(dataType: DataType): APIConfig[] {
  return Object.values(API_REGISTRY).filter(
    api => api.enabled && api.dataType.includes(dataType)
  );
}

/**
 * Get API configuration by ID
 */
export function getAPIConfig(apiId: string): APIConfig | undefined {
  return API_REGISTRY[apiId];
}

/**
 * Get all enabled APIs
 */
export function getAllEnabledAPIs(): APIConfig[] {
  return Object.values(API_REGISTRY).filter(api => api.enabled);
}

