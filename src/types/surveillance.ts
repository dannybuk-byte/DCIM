/**
 * Surveillance Infrastructure Types
 * 
 * Types for tracking ICE, DHS, and other government surveillance
 * infrastructure in data centers. Part of the labor organizing
 * mission to expose Big Tech's role in the surveillance state.
 * 
 * "The same workers building these data centers are from communities being surveilled"
 */

// =============================================================================
// FEDERAL AGENCIES
// =============================================================================

export type FederalAgency = 
  | 'ICE'           // Immigration and Customs Enforcement
  | 'ERO'           // Enforcement and Removal Operations (ICE subdivision)
  | 'HSI'           // Homeland Security Investigations (ICE subdivision)
  | 'CBP'           // Customs and Border Protection
  | 'DHS'           // Department of Homeland Security (parent)
  | 'FBI'           // Federal Bureau of Investigation
  | 'DEA'           // Drug Enforcement Administration
  | 'ATF'           // Bureau of Alcohol, Tobacco, Firearms
  | 'USCIS'         // US Citizenship and Immigration Services
  | 'DOJ'           // Department of Justice
  | 'DOD'           // Department of Defense
  | 'NSA'           // National Security Agency
  | 'CIA'           // Central Intelligence Agency
  | 'OTHER';

export type SurveillanceDataType =
  | 'biometric'         // Facial recognition, fingerprints, DNA
  | 'location'          // GPS, cell tower, geofencing
  | 'financial'         // Bank records, wire transfers
  | 'medical'           // Medicaid, health records
  | 'communications'    // Phone records, social media
  | 'immigration'       // Visa, travel, deportation records
  | 'utility'           // Power, water, internet service records
  | 'dmv'               // Driver's license, vehicle registration
  | 'employment'        // I-9, payroll, workplace data
  | 'social_services'   // Welfare, food stamps, housing
  | 'education'         // School records, student data
  | 'criminal'          // Arrest records, court data
  | 'network_traffic'   // Internet surveillance, metadata
  | 'unknown';

export type RiskLevel = 'confirmed' | 'likely' | 'possible' | 'unknown';

// =============================================================================
// SURVEILLANCE COMPANIES
// =============================================================================

export interface SurveillanceCompany {
  id: string;
  name: string;
  aliases: string[];
  description: string;
  foundedYear?: number;
  headquarters?: string;
  
  // What they do
  capabilities: SurveillanceCapability[];
  dataTypesProcessed: SurveillanceDataType[];
  
  // Government relationships
  knownAgencyClients: FederalAgency[];
  contractHistory: FederalContract[];
  
  // Infrastructure
  knownDataCenters: string[];  // Facility IDs where they're known to operate
  cloudProviders: string[];    // AWS, Azure, GCP, etc.
  
  // Evidence
  sources: EvidenceSource[];
  
  // Risk assessment
  riskLevel: RiskLevel;
  immigrantImpact: 'direct' | 'indirect' | 'unknown';
  
  // Organizing info
  hasUnionWorkers: boolean;
  laborViolations: number;
  communityOpposition: boolean;
}

export interface SurveillanceCapability {
  type: 'facial_recognition' | 'location_tracking' | 'social_network_analysis' |
        'predictive_policing' | 'skip_tracing' | 'data_aggregation' |
        'license_plate_reader' | 'cell_site_simulator' | 'social_media_monitoring' |
        'biometric_collection' | 'ai_analysis' | 'database_access' | 'other';
  description: string;
  products: string[];  // Product names (e.g., "FALCON", "Gotham", "CLEAR")
}

// =============================================================================
// FEDERAL CONTRACTS
// =============================================================================

export interface FederalContract {
  id: string;
  contractNumber?: string;
  
  // Parties
  agency: FederalAgency;
  agencySubdivision?: string;  // e.g., "ERO" for ICE
  contractor: string;
  subcontractors?: string[];
  
  // Financial
  amount: number;
  obligatedAmount?: number;
  potentialValue?: number;
  
  // Timeline
  awardDate: string;
  startDate?: string;
  endDate?: string;
  
  // Purpose
  description: string;
  naicsCode?: string;  // Industry classification
  psc?: string;        // Product/Service Code
  
  // Location
  placeOfPerformance?: {
    city?: string;
    state?: string;
    country?: string;
    facilityId?: string;  // Cross-reference to data center
  };
  
  // Evidence
  sourceUrl?: string;
  foiaDocuments?: string[];
  newsArticles?: string[];
  
  // Analysis
  surveillanceRelated: boolean;
  immigrantTargeting: boolean;
  dataTypesInvolved: SurveillanceDataType[];
}

// =============================================================================
// EVIDENCE SOURCES
// =============================================================================

export interface EvidenceSource {
  id: string;
  type: 'foia' | 'news' | 'academic' | 'whistleblower' | 'contract_record' |
        'sec_filing' | 'community_report' | 'court_document' | 'other';
  title: string;
  url?: string;
  date: string;
  publisher?: string;
  author?: string;
  description: string;
  reliability: 'verified' | 'credible' | 'unverified';
  documentIds?: string[];  // Links to stored documents
}

// =============================================================================
// SURVEILLANCE ALERTS
// =============================================================================

export interface SurveillanceAlert {
  id: string;
  facilityId: string;
  facilityName: string;
  operator: string;
  location: {
    city: string;
    state: string;
    coordinates?: { lat: number; lng: number };
  };
  
  // What we know
  knownContracts: FederalContract[];
  surveillanceCompanies: string[];  // Company IDs
  dataTypesProcessed: SurveillanceDataType[];
  agenciesInvolved: FederalAgency[];
  
  // Risk assessment
  riskLevel: RiskLevel;
  confidenceScore: number;  // 0-100
  
  // Evidence
  sources: EvidenceSource[];
  lastUpdated: string;
  
  // Community impact
  immigrantPopulationNearby?: number;
  nearSanctuaryCity?: boolean;
  communityAlerts?: CommunityAlert[];
  
  // Organizing opportunities
  ibewPresent?: boolean;
  laborViolationsAtFacility?: number;
  relatedCampaigns?: string[];
}

export interface CommunityAlert {
  id: string;
  type: 'ice_raid' | 'checkpoint' | 'surveillance_sighting' | 'data_request' | 
        'construction' | 'expansion' | 'other';
  date: string;
  description: string;
  reportedBy: 'community' | 'organization' | 'news' | 'legal';
  verified: boolean;
  location?: {
    address?: string;
    city: string;
    state: string;
  };
}

// =============================================================================
// GOVERNMENT CLOUD INFRASTRUCTURE
// =============================================================================

export interface GovernmentCloudRegion {
  id: string;
  provider: 'AWS' | 'Azure' | 'GCP' | 'Oracle' | 'IBM' | 'Other';
  regionName: string;
  regionCode: string;  // e.g., "us-gov-west-1"
  classification: 'GovCloud' | 'FedRAMP_High' | 'FedRAMP_Moderate' | 'IL4' | 'IL5' | 'IL6' | 'Secret' | 'TopSecret';
  
  // Physical location
  approximateLocation?: {
    state: string;
    city?: string;
    dataCenterIds?: string[];  // Cross-reference to facilities
  };
  
  // Known tenants
  knownAgencies: FederalAgency[];
  knownContractors: string[];
  
  // Services
  servicesOffered: string[];
  
  // Evidence
  sources: EvidenceSource[];
}

// =============================================================================
// CROSS-REFERENCE TYPES
// =============================================================================

export interface FacilitySurveillanceLink {
  facilityId: string;
  
  // Direct evidence
  confirmedSurveillanceCompanies: string[];
  confirmedContracts: string[];
  confirmedAgencies: FederalAgency[];
  
  // Indirect evidence
  suspectedLinks: {
    type: 'same_operator' | 'same_contractor' | 'network_connection' | 
          'geographic_proximity' | 'corporate_relationship';
    description: string;
    confidence: number;
    sources: string[];
  }[];
  
  // Overall assessment
  surveillanceRisk: RiskLevel;
  lastAssessed: string;
}

// =============================================================================
// SEARCH & FILTER TYPES
// =============================================================================

export interface SurveillanceSearchFilters {
  agencies?: FederalAgency[];
  companies?: string[];
  dataTypes?: SurveillanceDataType[];
  riskLevels?: RiskLevel[];
  states?: string[];
  contractMinAmount?: number;
  contractMaxAmount?: number;
  dateRange?: { start: string; end: string };
  immigrantTargeting?: boolean;
  hasEvidence?: boolean;
}

export interface SurveillanceStats {
  totalContracts: number;
  totalContractValue: number;
  facilitiesWithSurveillance: number;
  companiesTracked: number;
  agenciesTracked: number;
  alertsActive: number;
  
  // Breakdowns
  byAgency: Record<FederalAgency, { count: number; value: number }>;
  byDataType: Record<SurveillanceDataType, number>;
  byState: Record<string, number>;
  byCompany: { name: string; contracts: number; value: number }[];
}

