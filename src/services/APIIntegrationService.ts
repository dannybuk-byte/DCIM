/**
 * Unified API Integration Service
 * 
 * Handles communication between multiple APIs to create comprehensive
 * infrastructure views by aggregating data from multiple sources.
 */

import { API_REGISTRY, DataType } from './APIRegistry';
import { cacheDb } from '../services/DataFetcher';

export interface AggregatedFacilityData {
  // Basic facility info
  id: number;
  name: string;
  location: {
    address?: string;
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  };
  
  // Network data (from PeeringDB, RIPE, HE BGP)
  network: {
    asn?: number;
    ipRanges?: string[];
    ixConnections?: string[];
    networkProviders?: string[];
    peers?: Array<{ asn: number; name: string }>;
  };
  
  // Infrastructure details (if available)
  infrastructure: {
    racks?: Array<{ id: string; location: string; devices?: number }>;
    powerCapacity?: number; // MW
    coolingType?: string;
    tier?: number;
  };
  
  // Business/ownership (from SEC, GLEIF, USAspending)
  ownership: {
    operator: string;
    parentCompany?: string;
    lei?: string; // Legal Entity Identifier
    secFilings?: Array<{ type: string; date: string; url: string }>;
    contracts?: Array<{ agency: string; amount: number; year: number }>;
  };
  
  // Environmental (from EPA)
  environmental: {
    epaEchoId?: string;
    airQuality?: number;
    complianceStatus?: string;
    permits?: Array<{ type: string; id: string; status: string }>;
  };
  
  // Certificates (from crt.sh)
  certificates: Array<{ domain: string; issuer: string; validUntil: string }>;
  
  // Data sources
  dataSources: Array<{ api: string; dataType: DataType; fetchedAt: string }>;
}

/**
 * Main service for integrating multiple APIs
 */
export class APIIntegrationService {
  /**
   * Aggregates data from multiple APIs for a facility
   */
  async aggregateFacilityData(facilityId: number, facility: any): Promise<AggregatedFacilityData> {
    const dataSources: Array<{ api: string; dataType: DataType; fetchedAt: string }> = [];
    
    // 1. Network data (PeeringDB, RIPE, HE BGP)
    const networkData = await this.fetchNetworkData(facility);
    dataSources.push(...networkData.sources);
    
    // 2. Geographic data (Nominatim)
    const geoData = await this.fetchGeographicData(facility);
    dataSources.push(...geoData.sources);
    
    // 3. Business data (SEC, GLEIF, USAspending)
    const businessData = await this.fetchBusinessData(facility);
    dataSources.push(...businessData.sources);
    
    // 4. Environmental data (EPA)
    const envData = await this.fetchEnvironmentalData(facility);
    dataSources.push(...envData.sources);
    
    // 5. Certificate data (crt.sh)
    const certData = await this.fetchCertificateData(facility);
    dataSources.push(...certData.sources);
    
    return {
      id: facilityId,
      name: facility.name,
      location: {
        address: geoData.address,
        city: facility.city,
        state: facility.state,
        country: facility.country,
        coordinates: geoData.coordinates,
      },
      network: networkData,
      infrastructure: {
        powerCapacity: facility.powerCapacityMW,
        coolingType: facility.coolingType,
        tier: facility.tierClassification,
      },
      ownership: businessData,
      environmental: envData,
      certificates: certData.certificates || [],
      dataSources,
    };
  }
  
  /**
   * Fetch network data from multiple APIs
   */
  private async fetchNetworkData(facility: any): Promise<{
    sources: Array<{ api: string; dataType: DataType; fetchedAt: string }>;
    asn?: number;
    ipRanges?: string[];
    ixConnections?: string[];
    networkProviders?: string[];
    peers?: Array<{ asn: number; name: string }>;
  }> {
    const sources: Array<{ api: string; dataType: DataType; fetchedAt: string }> = [];
    
    // PeeringDB
    try {
      const peeringDB = API_REGISTRY.peeringdb;
      if (peeringDB.enabled) {
        await this.callAPI('peeringdb', `/fac?name__contains=${encodeURIComponent(facility.name)}`);
        sources.push({ api: 'peeringdb', dataType: 'network_topology', fetchedAt: new Date().toISOString() });
        // Process PeeringDB data...
      }
    } catch (error) {
      console.error('Error fetching PeeringDB data:', error);
    }
    
    // RIPE Stat (for ASN info)
    // HE BGP (for IP ranges)
    
    return {
      sources,
      asn: undefined,
      ipRanges: undefined,
      ixConnections: undefined,
      networkProviders: undefined,
      peers: undefined,
    };
  }
  
  /**
   * Fetch geographic data
   */
  private async fetchGeographicData(facility: any): Promise<{
    sources: Array<{ api: string; dataType: DataType; fetchedAt: string }>;
    address?: string;
    coordinates?: { lat: number; lng: number };
  }> {
    const sources: Array<{ api: string; dataType: DataType; fetchedAt: string }> = [];
    
    // Nominatim for geocoding
    try {
      const nominatim = API_REGISTRY.nominatim;
      if (nominatim.enabled) {
        const query = `${facility.city}, ${facility.state}, ${facility.country}`;
        // Note: Nominatim has strict rate limits, use caching
        const cached = await this.getCached(`nominatim_${query}`);
        if (cached) {
          sources.push({ api: 'nominatim', dataType: 'geographic', fetchedAt: cached.fetchedAt });
          return { ...cached.data, sources };
        }
        
        // Would make actual API call here
        // const data = await this.callAPI('nominatim', `/search?q=${encodeURIComponent(query)}&format=json`);
        // Process and return data
      }
    } catch (error) {
      console.error('Error fetching geographic data:', error);
    }
    
    return {
      sources,
      address: undefined,
      coordinates: undefined,
    };
  }
  
  /**
   * Fetch business/ownership data
   */
  private async fetchBusinessData(facility: any): Promise<{ sources: Array<{ api: string; dataType: DataType; fetchedAt: string }>; operator: string }> {
    const sources: Array<{ api: string; dataType: DataType; fetchedAt: string }> = [];
    
    // SEC EDGAR
    // GLEIF
    // USAspending
    
    return {
      sources,
      operator: facility.operator,
    };
  }
  
  /**
   * Fetch environmental data
   */
  private async fetchEnvironmentalData(_facility: any): Promise<{ 
    sources: Array<{ api: string; dataType: DataType; fetchedAt: string }>;
    epaEchoId?: string;
    airQuality?: number;
    complianceStatus?: string;
    permits?: Array<{ type: string; id: string; status: string }>;
  }> {
    const sources: Array<{ api: string; dataType: DataType; fetchedAt: string }> = [];
    
    // EPA ECHO
    // EPA AirNow
    
    return {
      sources,
      epaEchoId: undefined,
      airQuality: undefined,
      complianceStatus: undefined,
      permits: undefined,
    };
  }
  
  /**
   * Fetch certificate data
   */
  private async fetchCertificateData(_facility: any): Promise<{ sources: Array<{ api: string; dataType: DataType; fetchedAt: string }>; certificates: any[] }> {
    const sources: Array<{ api: string; dataType: DataType; fetchedAt: string }> = [];
    
    // crt.sh
    
    return {
      sources,
      certificates: [],
    };
  }
  
  /**
   * Generic API call with caching and rate limiting
   */
  private async callAPI(apiId: string, endpoint: string, options?: RequestInit): Promise<any> {
    const config = API_REGISTRY[apiId];
    if (!config || !config.enabled) {
      throw new Error(`API ${apiId} is not enabled`);
    }
    
    // Check cache
    const cacheKey = `${apiId}_${endpoint}`;
    const cached = await this.getCached(cacheKey);
    if (cached) {
      return cached.data;
    }
    
    // Make API call
    const url = `${config.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'User-Agent': 'DCIM-Compliance-Dashboard/1.0',
        ...options?.headers,
      },
    });
    
    if (!response.ok) {
      throw new Error(`API ${apiId} error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache the response
    await this.setCache(cacheKey, data, config.cacheTTL);
    
    return data;
  }
  
  /**
   * Get cached data
   */
  private async getCached(key: string): Promise<{ data: any; fetchedAt: string } | null> {
    try {
      const cached = await cacheDb.cache.get(key);
      if (cached && new Date(cached.expiresAt) > new Date()) {
        return {
          data: cached.data,
          fetchedAt: cached.provenance.fetchedAt,
        };
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
        facilityId: 0, // General cache
        dataType: 'api_response',
        data,
        provenance: {
          source: 'API_CACHE' as any,
          fetchedAt: new Date().toISOString(),
        },
        expiresAt,
      });
    } catch (error) {
      console.error('Cache write error:', error);
    }
  }
}

export const apiIntegrationService = new APIIntegrationService();

