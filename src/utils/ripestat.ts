/**
 * RIPEstat Network Intelligence API
 * 
 * RIPEstat provides authoritative network metadata from RIPE NCC,
 * one of the five Regional Internet Registries (RIRs).
 * 
 * Features:
 * - ASN to organization mapping
 * - IP geolocation
 * - Network abuse contacts
 * - BGP routing information
 * - Historical network data
 * - No authentication required
 * - Fully CORS-enabled
 * 
 * Antifragility:
 * - Comprehensive error handling
 * - Timeout protection
 * - Response validation
 * - Graceful degradation
 */

export interface NetworkInfo {
  asn: string;
  asnName: string;
  holder: string;
  country: string;
  announcedPrefixes: string[];
  abuseContact?: string;
}

export interface GeolocationInfo {
  country: string;
  city?: string;
  latitude?: number;
  longitude?: number;
  coveredPrefixes: Array<{
    prefix: string;
    asn: string;
  }>;
}

export interface RoutingInfo {
  resource: string;
  announcingASNs: Array<{
    asn: string;
    holder: string;
  }>;
  relatedPrefixes: string[];
}

export interface AbuseContact {
  abuseEmail?: string;
  abusePhone?: string;
  organization?: string;
  source: string;
}

const RIPESTAT_BASE = 'https://stat.ripe.net/data';

/**
 * Generic RIPEstat API query
 */
async function queryRIPEstat<T>(
  endpoint: string,
  resource: string,
  additionalParams: Record<string, string> = {}
): Promise<T | null> {
  try {
    const params = new URLSearchParams({
      resource,
      ...additionalParams,
    });

    const response = await fetch(
      `${RIPESTAT_BASE}/${endpoint}/data.json?${params}`,
      {
        signal: AbortSignal.timeout(15000),
      }
    );

    if (!response.ok) {
      throw new Error(`RIPEstat returned ${response.status}`);
    }

    const data = await response.json();
    return data.data || null;
  } catch (error) {
    console.error(`[RIPEstat] Query failed for ${endpoint}:`, error);
    return null;
  }
}

/**
 * Get AS overview information
 * Endpoint: /as-overview/data.json
 */
export async function getASOverview(asn: string): Promise<NetworkInfo | null> {
  const data = await queryRIPEstat<any>('as-overview', asn);
  if (!data) return null;

  return {
    asn: data.resource || asn,
    asnName: data.holder || 'Unknown',
    holder: data.holder || 'Unknown',
    country: data.announced_space?.v4?.rir || 'Unknown',
    announcedPrefixes: [
      ...(data.announced_space?.v4?.prefixes || []),
      ...(data.announced_space?.v6?.prefixes || []),
    ],
  };
}

/**
 * Get network abuse contacts
 * Endpoint: /abuse-contact-finder/data.json
 */
export async function getAbuseContact(resource: string): Promise<AbuseContact | null> {
  const data = await queryRIPEstat<any>('abuse-contact-finder', resource);
  if (!data || !data.abuse_contacts || data.abuse_contacts.length === 0) {
    return null;
  }

  const contact = data.abuse_contacts[0];
  return {
    abuseEmail: contact.email,
    abusePhone: contact.phone,
    organization: contact.org,
    source: contact.source || 'RIPE',
  };
}

/**
 * Get IP geolocation
 * Endpoint: /geoloc/data.json
 */
export async function getGeolocation(ip: string): Promise<GeolocationInfo | null> {
  const data = await queryRIPEstat<any>('geoloc', ip);
  if (!data || !data.located_resources || data.located_resources.length === 0) {
    return null;
  }

  const location = data.located_resources[0];
  const prefixes = data.located_resources.map((res: any) => ({
    prefix: res.resource || '',
    asn: res.origin_asn || '',
  }));

  return {
    country: location.country || 'Unknown',
    city: location.city,
    latitude: location.latitude,
    longitude: location.longitude,
    coveredPrefixes: prefixes,
  };
}

/**
 * Get routing information (BGP announcements)
 * Endpoint: /routing-status/data.json
 */
export async function getRoutingInfo(resource: string): Promise<RoutingInfo | null> {
  const data = await queryRIPEstat<any>('routing-status', resource);
  if (!data) return null;

  const announcements = data.announced_space?.announcements || [];
  const announcingASNs = [
    ...new Set(announcements.map((a: any) => a.asn)),
  ].map(asn => ({
    asn: String(asn),
    holder: 'Unknown', // Need separate query for holder names
  }));

  return {
    resource: data.resource || resource,
    announcingASNs,
    relatedPrefixes: data.announced_space?.prefixes || [],
  };
}

/**
 * Get ASN neighbors (peering relationships)
 * Endpoint: /asn-neighbours/data.json
 */
export async function getASNNeighbors(asn: string): Promise<Array<{
  asn: string;
  type: 'left' | 'right' | 'uncertain';
  power: number;
}> | null> {
  const data = await queryRIPEstat<any>('asn-neighbours', asn);
  if (!data || !data.neighbours) return null;

  return data.neighbours.map((n: any) => ({
    asn: String(n.asn),
    type: n.type || 'uncertain',
    power: n.power || 0,
  }));
}

/**
 * Get prefix overview (ownership and registration info)
 * Endpoint: /prefix-overview/data.json
 */
export async function getPrefixOverview(prefix: string): Promise<{
  resource: string;
  asns: Array<{
    asn: string;
    holder: string;
  }>;
  isAssigned: boolean;
  actualNumRelatedAsns: number;
} | null> {
  const data = await queryRIPEstat<any>('prefix-overview', prefix);
  if (!data) return null;

  return {
    resource: data.resource || prefix,
    asns: (data.asns || []).map((a: any) => ({
      asn: String(a.asn),
      holder: a.holder || 'Unknown',
    })),
    isAssigned: data.is_less_specific || false,
    actualNumRelatedAsns: data.actual_num_related_asns || 0,
  };
}

/**
 * Get historical routing changes
 * Endpoint: /routing-history/data.json
 */
export async function getRoutingHistory(
  resource: string,
  startTime?: string,
  endTime?: string
): Promise<Array<{
  timestamp: number;
  origin: string;
  prefix: string;
  type: 'announced' | 'withdrawn';
}> | null> {
  const params: Record<string, string> = {};
  if (startTime) params.starttime = startTime;
  if (endTime) params.endtime = endTime;

  const data = await queryRIPEstat<any>('routing-history', resource, params);
  if (!data || !data.by_origin) return null;

  const events: Array<{
    timestamp: number;
    origin: string;
    prefix: string;
    type: 'announced' | 'withdrawn';
  }> = [];

  for (const [origin, originData] of Object.entries(data.by_origin)) {
    const routes = (originData as any).routes || [];
    for (const route of routes) {
      events.push({
        timestamp: route.timestamp * 1000, // Convert to ms
        origin: String(origin),
        prefix: route.prefix || resource,
        type: route.type === 'a' ? 'announced' : 'withdrawn',
      });
    }
  }

  return events.sort((a, b) => b.timestamp - a.timestamp);
}

/**
 * Comprehensive network intelligence for a facility
 */
export async function getFacilityNetworkIntel(
  ip: string,
  asn?: string
): Promise<{
  geolocation: GeolocationInfo | null;
  network: NetworkInfo | null;
  routing: RoutingInfo | null;
  abuseContact: AbuseContact | null;
  organizerInsights: string[];
}> {
  try {
    // Run parallel queries
    const [geolocation, routing, abuseContact] = await Promise.all([
      getGeolocation(ip),
      getRoutingInfo(ip),
      getAbuseContact(ip),
    ]);

    // Get ASN info if available
    let network: NetworkInfo | null = null;
    if (asn) {
      network = await getASOverview(asn);
    } else if (geolocation && geolocation.coveredPrefixes.length > 0) {
      // Try to get ASN from geolocation
      const firstPrefix = geolocation.coveredPrefixes[0];
      if (firstPrefix.asn) {
        network = await getASOverview(firstPrefix.asn);
      }
    }

    // Generate organizer insights
    const organizerInsights: string[] = [];

    if (geolocation) {
      organizerInsights.push(
        `📍 Location: ${geolocation.city || 'Unknown city'}, ${geolocation.country}`
      );
    }

    if (network) {
      organizerInsights.push(
        `🏢 Network operator: ${network.holder}`
      );
      if (network.announcedPrefixes.length > 0) {
        organizerInsights.push(
          `📡 Announces ${network.announcedPrefixes.length} IP ranges`
        );
      }
    }

    if (abuseContact) {
      organizerInsights.push(
        `📧 Abuse contact available for reporting issues`
      );
    }

    if (routing && routing.announcingASNs.length > 1) {
      organizerInsights.push(
        `⚠️ Multiple networks announce this IP (unusual)`
      );
    }

    return {
      geolocation,
      network,
      routing,
      abuseContact,
      organizerInsights,
    };
  } catch (error) {
    console.error('[RIPEstat] Facility network intel failed:', error);
    return {
      geolocation: null,
      network: null,
      routing: null,
      abuseContact: null,
      organizerInsights: ['❌ Unable to retrieve network information'],
    };
  }
}

/**
 * Check if an ASN or IP is in a specific country
 */
export async function isInCountry(resource: string, countryCode: string): Promise<boolean> {
  const geo = await getGeolocation(resource);
  if (!geo) return false;
  
  return geo.country.toUpperCase() === countryCode.toUpperCase();
}

/**
 * Find network neighbors (useful for mapping data center ecosystems)
 */
export async function getNetworkEcosystem(asn: string): Promise<{
  centerASN: string;
  centerName: string;
  neighbors: Array<{
    asn: string;
    relationship: string;
    strength: number;
  }>;
  totalNeighbors: number;
}> {
  const [overview, neighbors] = await Promise.all([
    getASOverview(asn),
    getASNNeighbors(asn),
  ]);

  if (!overview || !neighbors) {
    return {
      centerASN: asn,
      centerName: 'Unknown',
      neighbors: [],
      totalNeighbors: 0,
    };
  }

  return {
    centerASN: asn,
    centerName: overview.holder,
    neighbors: neighbors.map(n => ({
      asn: n.asn,
      relationship: n.type === 'left' ? 'Upstream' : n.type === 'right' ? 'Downstream' : 'Peer',
      strength: n.power,
    })),
    totalNeighbors: neighbors.length,
  };
}

