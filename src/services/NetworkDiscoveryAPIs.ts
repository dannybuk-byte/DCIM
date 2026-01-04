/**
 * Network Discovery APIs Integration
 * 
 * Implements free/open-source APIs for network infrastructure discovery:
 * - PeeringDB (facilities, IXPs, interconnections)
 * - RIPE RIS Live (real-time BGP routing)
 * - RIPE Stat (ASN information, network statistics)
 * - Hurricane Electric BGP Toolkit (IP ranges, ASN lookup)
 * - Certificate Transparency (crt.sh - SSL certificates)
 */

import { cacheDb } from './DataFetcher';
import { API_REGISTRY } from './APIRegistry';

export interface NetworkData {
  asn?: number;
  asnName?: string;
  ipRanges?: Array<{ prefix: string; description?: string }>;
  facilities?: Array<{
    name: string;
    address?: string;
    city?: string;
    country?: string;
    coordinates?: { lat: number; lng: number };
  }>;
  ixConnections?: Array<{
    name: string;
    speed?: number;
    protocol?: string;
  }>;
  peers?: Array<{ asn: number; name: string; relationship?: string }>;
  certificates?: Array<{
    domain: string;
    issuer: string;
    validFrom: string;
    validUntil: string;
  }>;
  dataSources: Array<{ api: string; fetchedAt: string }>;
}

export class NetworkDiscoveryService {
  private wsConnections = new Map<string, WebSocket>();

  /**
   * Fetch comprehensive network data for a facility/operator
   */
  async getNetworkData(facilityName: string, operatorName?: string): Promise<NetworkData> {
    const dataSources: Array<{ api: string; fetchedAt: string }> = [];
    
    // Parallel fetch from multiple APIs
    const [peeringDBData, ripeStatData, heBGPData, certData] = await Promise.allSettled([
      this.fetchPeeringDB(facilityName),
      operatorName ? this.fetchRIPEStat(operatorName) : Promise.resolve(null),
      operatorName ? this.fetchHEBGP(operatorName) : Promise.resolve(null),
      this.fetchCertificates(facilityName, operatorName),
    ]);

    // Aggregate results
    const result: NetworkData = {
      dataSources,
      facilities: [],
      ixConnections: [],
      peers: [],
      certificates: [],
    };

    // Process PeeringDB data
    if (peeringDBData.status === 'fulfilled' && peeringDBData.value) {
      const data = peeringDBData.value;
      result.facilities = data.facilities || [];
      result.ixConnections = data.ixConnections || [];
      dataSources.push({ api: 'peeringdb', fetchedAt: new Date().toISOString() });
    }

    // Process RIPE Stat data
    if (ripeStatData.status === 'fulfilled' && ripeStatData.value) {
      const data = ripeStatData.value;
      if (data.asn) result.asn = data.asn;
      if (data.asnName) result.asnName = data.asnName;
      if (data.peers) result.peers = data.peers;
      if (data.ipRanges) result.ipRanges = data.ipRanges;
      dataSources.push({ api: 'ripe_stat', fetchedAt: new Date().toISOString() });
    }

    // Process HE BGP data
    if (heBGPData.status === 'fulfilled' && heBGPData.value) {
      const data = heBGPData.value;
      if (data.asn && !result.asn) result.asn = data.asn;
      if (data.ipRanges) {
        result.ipRanges = [...(result.ipRanges || []), ...data.ipRanges];
      }
      dataSources.push({ api: 'he_bgp', fetchedAt: new Date().toISOString() });
    }

    // Process certificate data
    if (certData.status === 'fulfilled' && certData.value) {
      result.certificates = certData.value || [];
      dataSources.push({ api: 'crtsh', fetchedAt: new Date().toISOString() });
    }

    result.dataSources = dataSources;
    return result;
  }

  /**
   * Fetch PeeringDB data
   */
  private async fetchPeeringDB(query: string): Promise<any> {
    const apiConfig = API_REGISTRY.peeringdb;
    if (!apiConfig.enabled) return null;

    const cacheKey = `peeringdb_${query}`;
    const cached = await this.getCached(cacheKey);
    if (cached) return cached;

    try {
      // Search facilities
      const facilityResponse = await fetch(
        `${apiConfig.baseUrl}/fac?name__contains=${encodeURIComponent(query)}`,
        {
          headers: {
            'User-Agent': 'DCIM-Compliance-Dashboard/1.0',
          },
        }
      );

      if (!facilityResponse.ok) {
        throw new Error(`PeeringDB API error: ${facilityResponse.status}`);
      }

      const facilityData = await facilityResponse.json();
      
      const facilities = facilityData.data?.map((fac: any) => ({
        name: fac.name,
        address: fac.address1,
        city: fac.city,
        country: fac.country,
        coordinates: fac.geo_latitude && fac.geo_longitude ? {
          lat: fac.geo_latitude,
          lng: fac.geo_longitude,
        } : undefined,
      })) || [];

      // Fetch IX connections if facility IDs found
      let ixConnections: any[] = [];
      if (facilityData.data?.length > 0) {
        const facilityIds = facilityData.data.map((f: any) => f.id).join(',');
        try {
          const ixResponse = await fetch(
            `${apiConfig.baseUrl}/ixfac?fac_id__in=${facilityIds}`,
            { headers: { 'User-Agent': 'DCIM-Compliance-Dashboard/1.0' } }
          );
          if (ixResponse.ok) {
            const ixData = await ixResponse.json();
            ixConnections = ixData.data?.map((ix: any) => ({
              name: ix.name,
              speed: ix.speed,
              protocol: ix.protocol,
            })) || [];
          }
        } catch (error) {
          console.error('Error fetching IX data:', error);
        }
      }

      const result = { facilities, ixConnections };
      await this.setCache(cacheKey, result, apiConfig.cacheTTL);
      return result;
    } catch (error) {
      console.error('Error fetching PeeringDB data:', error);
      return null;
    }
  }

  /**
   * Fetch RIPE Stat data (ASN information)
   */
  private async fetchRIPEStat(_operatorName: string): Promise<any> {
    const apiConfig = API_REGISTRY.ripe_stat;
    if (!apiConfig.enabled) return null;

    // Try to find ASN from company name
    // Note: RIPE Stat doesn't have direct company name search
    // This would need ASN lookup from other sources first
    // For now, return structure for future implementation
    return null;
  }

  /**
   * Fetch Hurricane Electric BGP data
   */
  private async fetchHEBGP(_operatorName: string): Promise<any> {
    // HE BGP Toolkit doesn't have a direct API
    // Would need to scrape or use alternative method
    // Placeholder for future implementation
    return null;
  }

  /**
   * Fetch Certificate Transparency data
   */
  private async fetchCertificates(facilityName: string, operatorName?: string): Promise<any[]> {
    const apiConfig = API_REGISTRY.crtsh;
    if (!apiConfig.enabled) return [];

    // Generate potential domain names from facility/operator
    const domains: string[] = [
      facilityName.toLowerCase().replace(/\s+/g, ''),
      ...(operatorName ? [operatorName.toLowerCase().replace(/\s+/g, '')] : []),
    ];

    const allCerts: any[] = [];

    for (const domain of domains) {
      try {
        const cacheKey = `crtsh_${domain}`;
        const cached = await this.getCached(cacheKey);
        if (cached) {
          allCerts.push(...(cached.certificates || []));
          continue;
        }

        const response = await fetch(
          `${apiConfig.baseUrl}/?q=${encodeURIComponent(domain)}&output=json`,
          {
            headers: {
              'User-Agent': 'DCIM-Compliance-Dashboard/1.0',
            },
          }
        );

        if (!response.ok) continue;

        const data = await response.json();
        const certificates = (Array.isArray(data) ? data : []).slice(0, 50).map((cert: any) => ({
          domain: cert.name_value || domain,
          issuer: cert.issuer_name || 'Unknown',
          validFrom: cert.not_before || '',
          validUntil: cert.not_after || '',
        }));

        allCerts.push(...certificates);
        await this.setCache(cacheKey, { certificates }, apiConfig.cacheTTL);
      } catch (error) {
        console.error(`Error fetching certificates for ${domain}:`, error);
      }
    }

    return allCerts;
  }

  /**
   * Subscribe to RIPE RIS Live WebSocket for real-time BGP updates
   */
  subscribeToBGPUpdates(asn: number, callback: (update: any) => void): () => void {
    const apiConfig = API_REGISTRY.ripe_ris_live;
    if (!apiConfig.enabled || !apiConfig.baseUrl.startsWith('ws')) {
      return () => {}; // No-op unsubscribe
    }

    const wsKey = `ripe_ris_${asn}`;
    
    try {
      const ws = new WebSocket(apiConfig.baseUrl);
      this.wsConnections.set(wsKey, ws);

      ws.onopen = () => {
        // Subscribe to updates for this ASN
        ws.send(JSON.stringify({
          type: 'ris_subscribe',
          data: {
            host: '*',
            path: '*',
            require: 'hosts',
            moreSpecific: false,
            type: 'UPDATE',
            peer: `*:${asn}`,
          },
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ris_message' && data.data) {
            callback(data.data);
          }
        } catch (error) {
          console.error('Error parsing RIPE RIS message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('RIPE RIS WebSocket error:', error);
      };

      // Return unsubscribe function
      return () => {
        ws.close();
        this.wsConnections.delete(wsKey);
      };
    } catch (error) {
      console.error('Error connecting to RIPE RIS Live:', error);
      return () => {}; // No-op
    }
  }

  /**
   * Get cached data
   */
  private async getCached(key: string): Promise<any | null> {
    try {
      const cached = await cacheDb.cache.get(key);
      if (cached && new Date(cached.expiresAt) > new Date()) {
        return cached.data;
      }
    } catch (error) {
      console.error('Cache read error:', error);
    }
    return null;
  }

  /**
   * Set cache
   */
  private async setCache(key: string, data: any, ttl: number): Promise<void> {
    try {
      const expiresAt = new Date(Date.now() + ttl).toISOString();
      await cacheDb.cache.put({
        id: key,
        facilityId: 0,
        dataType: 'network_discovery',
        data,
        provenance: {
          source: 'PeeringDB' as any,
          fetchedAt: new Date().toISOString(),
          verified: true,
        },
        expiresAt,
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
}

export const networkDiscoveryService = new NetworkDiscoveryService();

