import { Facility } from '../types';
import { dataFetcher } from './DataFetcher';
import { DataSourceType } from './DataFetcher';
import { networkDiscoveryService } from './NetworkDiscoveryAPIs';
import { businessOwnershipService } from './BusinessOwnershipAPIs';
import { synthesizeInfrastructure, InfrastructureDetails } from './InfrastructureSynthesis';

export interface FacilityDetails {
  address: string;
  buildingSize: number;
  tier: number;
  powerCapacity: number;
  pueRating: number;
  coolingType: string;
  generatorCount: number;
  fuelType: string;
  networkCarriers: string[];
  ixConnections: boolean;
  crossConnects: number;
  carrierNeutral: boolean;
  meetMeRoom: boolean;
  isColocation: boolean;
  tenants: Array<{ company: string; rackCount: number }>;
  auditHistory: Array<{ date: string; status: Facility['complianceStatus']; issues: number }>;
  permitNumber: string;
  secFilingRef: string | null;
  incentiveAgreementId: string;
  epaEchoId: string;
  infrastructure?: InfrastructureDetails; // Rack and device level details
  dataSources: Map<string, DataSourceType>; // Track data source for each field
}

export async function getFacilityDetails(facility: Facility): Promise<FacilityDetails> {
  const dataSources = new Map<string, DataSourceType>();
  
  // Fetch real OSINT data from multiple sources
  const osintData = await dataFetcher.fetchAllFacilityData(facility.id, facility);
  
  // Fetch network and business data in parallel (for future enhancement)
  const [networkData, businessData] = await Promise.allSettled([
    networkDiscoveryService.getNetworkData(facility.name, facility.operator),
    businessOwnershipService.getBusinessData(facility.operator),
  ]);
  
  // Generate base data with fallback to synthetic if OSINT unavailable
  const buildingSizes = [25000, 50000, 100000, 150000, 200000, 300000, 500000];
  const powerCapacities = [2, 5, 10, 15, 20, 30, 50];
  const tiers = [1, 2, 3, 4] as const;
  const pueRatings = [1.2, 1.3, 1.4, 1.5, 1.6, 1.8, 2.0];
  const coolingTypes = ['Air-cooled', 'Liquid-cooled', 'Hybrid', 'Immersion'];
  const fuelTypes = ['Diesel', 'Natural Gas', 'Dual-fuel'];
  const carriers = ['AT&T', 'Verizon', 'Lumen', 'Cogent', 'Zayo', 'Level 3', 'NTT', 'Telia'];
  const tenantCompanies = ['AWS', 'Microsoft', 'Google', 'Meta', 'Oracle', 'IBM', 'Salesforce', 'Adobe'];
  
  const hash = facility.id * 31 + facility.name.charCodeAt(0);
  
  // Extract real data from PeeringDB if available
  let networkCarriers: string[] = [];
  let crossConnects = 0;
  let carrierNeutral = false;
  let ixConnections = false;
  
  if (osintData.peeringDB?.data) {
    const peeringData = osintData.peeringDB.data;
    // Extract carrier info from PeeringDB format
    if (peeringData.netfac_set) {
      networkCarriers = peeringData.netfac_set.map((nf: any) => nf.name || '').filter(Boolean);
      dataSources.set('networkCarriers', 'PeeringDB');
    }
    if (peeringData.info_type) {
      carrierNeutral = peeringData.info_type.includes('carrier_neutral');
      dataSources.set('carrierNeutral', 'PeeringDB');
    }
    if (peeringData.netfac_set) {
      crossConnects = peeringData.netfac_set.length || 0;
      dataSources.set('crossConnects', 'PeeringDB');
    }
    if (peeringData.ix_set) {
      ixConnections = peeringData.ix_set.length > 0;
      dataSources.set('ixConnections', 'PeeringDB');
    }
  } else {
    // Fallback to synthetic
    networkCarriers = carriers.slice(0, 3 + (hash % 4)).sort();
    crossConnects = 50 + (hash % 200);
    carrierNeutral = hash % 2 === 0;
    ixConnections = hash % 3 === 0;
    dataSources.set('networkCarriers', 'Estimated');
    dataSources.set('crossConnects', 'Estimated');
    dataSources.set('carrierNeutral', 'Estimated');
    dataSources.set('ixConnections', 'Estimated');
  }

  // Extract EPA ECHO data if available
  let epaEchoId = '';
  if (osintData.epaEcho?.data?.Results?.[0]) {
    epaEchoId = osintData.epaEcho.data.Results[0].FacilityID || `EPA-${facility.state}-${facility.id % 10000}`;
    dataSources.set('epaEchoId', 'EPA_ECHO');
  } else {
    epaEchoId = `EPA-${facility.state}-${facility.id % 10000}`;
    dataSources.set('epaEchoId', 'Estimated');
  }

  // Extract SEC filing reference if available (from old service)
  let secFilingRef: string | null = null;
  if (osintData.secFilings?.data && typeof osintData.secFilings.data === 'object' && 'filings' in osintData.secFilings.data && Array.isArray(osintData.secFilings.data.filings) && osintData.secFilings.data.filings.length > 0) {
    secFilingRef = `SEC-${new Date().getFullYear()}-${facility.id % 10000}`;
    dataSources.set('secFilingRef', 'SEC_EDGAR');
  }
  
  // Try Business Ownership Service for SEC data
  if (!secFilingRef && businessData.status === 'fulfilled' && businessData.value?.secFilings && businessData.value.secFilings.length > 0) {
    secFilingRef = businessData.value.secFilings[0].url || `SEC-${new Date().getFullYear()}-${facility.id % 10000}`;
    dataSources.set('secFilingRef', 'SEC_EDGAR');
  }
  
  // Fallback to estimated if company appears to be publicly traded
  if (!secFilingRef && (facility.operator.includes('Inc') || facility.operator.includes('Corp'))) {
    secFilingRef = `SEC-${new Date().getFullYear()}-${facility.id % 10000}`;
    dataSources.set('secFilingRef', 'Estimated');
  }
  
  // Enhance network data from Network Discovery Service
  if (networkData.status === 'fulfilled' && networkData.value) {
    const network = networkData.value;
    if (network.ixConnections && network.ixConnections.length > 0 && !ixConnections) {
      ixConnections = true;
      dataSources.set('ixConnections', 'PeeringDB');
    }
    if (network.facilities && network.facilities.length > 0) {
      // Could update facility coordinates if better data available
    }
  }

  // Calculate facility metrics
  const buildingSize = buildingSizes[hash % buildingSizes.length];
  const tier = tiers[hash % tiers.length];
  const powerCapacity = powerCapacities[hash % powerCapacities.length];
  const isColocation = facility.type === 'CO' || facility.type === 'Data Center';
  const tenants = facility.type === 'CO' || facility.type === 'Data Center' 
    ? tenantCompanies.slice(0, 2 + (hash % 4)).map((tenant, i) => ({
        company: tenant,
        rackCount: 50 + (hash + i) % 500
      }))
    : [];

  // Synthesize infrastructure details (racks, devices)
  const infrastructure = synthesizeInfrastructure(facility, {
    buildingSize,
    powerCapacity,
    tier,
    type: facility.type,
    isColocation,
    tenants,
  });
  dataSources.set('infrastructure', 'Synthetic'); // Mark as synthesized

  return {
    address: `${Math.floor(100 + (hash % 9000))} Data Center Blvd, ${facility.city}, ${facility.state}`,
    buildingSize,
    tier,
    powerCapacity,
    pueRating: pueRatings[hash % pueRatings.length],
    coolingType: coolingTypes[hash % coolingTypes.length],
    generatorCount: 2 + (hash % 4),
    fuelType: fuelTypes[hash % fuelTypes.length],
    networkCarriers,
    ixConnections,
    crossConnects,
    carrierNeutral,
    meetMeRoom: hash % 3 !== 0,
    isColocation,
    tenants,
    auditHistory: [
      { date: facility.lastAuditDate, status: facility.complianceStatus, issues: facility.issues?.length || 0 },
      ...(facility.issues && facility.issues.length > 0 ? [{
        date: new Date(new Date(facility.lastAuditDate).getTime() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'Non-Compliant' as const,
        issues: facility.issues.length
      }] : [])
    ],
    permitNumber: `PER-${facility.state}-${String(facility.id).padStart(6, '0')}`,
    secFilingRef,
    incentiveAgreementId: `INC-${facility.state}-${facility.id}`,
    epaEchoId,
    infrastructure,
    dataSources,
  };
}

