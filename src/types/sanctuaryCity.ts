/**
 * Sanctuary City Infrastructure Accountability Types
 * 
 * For tracking ICE data flows through NYC infrastructure,
 * REIT exposure, and Mayoral regulatory authority.
 * 
 * Source: NYC ICE Data Infrastructure Report for Mayor Mamdani Transition Team
 */

// ============================================================================
// CARRIER HOTEL & DATA CENTER TYPES
// ============================================================================

export interface CarrierHotel {
  id: string;
  name: string;
  address: string;
  borough: 'Manhattan' | 'Brooklyn' | 'Queens' | 'Bronx' | 'Staten Island' | 'NJ Metro';
  operator: string;
  facilityCode: string; // e.g., "NY9", "NYC1"
  
  // Infrastructure details
  squareFeet?: number;
  networkCount: number; // Number of networks with POPs
  isCarrierHotel: boolean;
  transatlanticCables?: number;
  
  // Federal certifications
  fismaLevel?: 'High' | 'Moderate' | 'Low' | 'None';
  certifications: string[]; // e.g., ['NIST 800-53', 'ISO 27001', 'SOC 1/2']
  
  // Cloud connections
  awsDirectConnect: boolean;
  azureExpressRoute: boolean;
  googleCloudInterconnect: boolean;
  
  // ICE/Federal exposure
  iceDataFlowRisk: 'Critical' | 'High' | 'Medium' | 'Low' | 'Unknown';
  federalTenantLikelihood: 'Confirmed' | 'Likely' | 'Possible' | 'Unlikely' | 'Unknown';
  
  // Regulatory leverage
  nycidaBenefits: boolean;
  franchiseRequired: boolean;
  
  notes?: string;
}

export interface DataFlowNode {
  id: string;
  label: string;
  type: 'source' | 'software' | 'cloud' | 'interconnect' | 'carrier_hotel' | 'endpoint';
  location?: string;
  details?: string;
  latencyMs?: number;
}

export interface DataFlowConnection {
  from: string;
  to: string;
  protocol?: string;
  description?: string;
}

export interface ICEDataFlowPath {
  name: string;
  description: string;
  nodes: DataFlowNode[];
  connections: DataFlowConnection[];
  nycTouchpoints: string[]; // Carrier hotel IDs
}

// ============================================================================
// REIT EXPOSURE TYPES
// ============================================================================

export interface DataCenterREIT {
  id: string;
  name: string;
  ticker: string;
  exchange: 'NYSE' | 'NASDAQ';
  
  // Financials
  revenue2024: number; // in billions
  marketCap?: number;
  usMarketShare?: number; // percentage
  
  // Federal business
  federalCertifications: string[];
  governmentSolutionsDivision?: string;
  federalContractsEcosystem?: number; // estimated $ value
  
  // NYC presence
  nycFacilities: CarrierHotelReference[];
  
  // ICE connection
  iceConnectionType: 'Direct' | 'Indirect' | 'None' | 'Unknown';
  iceConnectionDescription: string;
  
  // Shareholder engagement
  shareholderEngagementVectors: string[];
  nycPensionExposure?: boolean;
  
  website?: string;
}

export interface CarrierHotelReference {
  facilityId: string;
  facilityCode: string;
  address: string;
  keyFeatures: string[];
}

// ============================================================================
// MAYORAL AUTHORITY TYPES
// ============================================================================

export type EnforcementPhase = 1 | 2 | 3 | 4;

export interface EnforcementMechanism {
  id: string;
  phase: EnforcementPhase;
  name: string;
  authority: string; // Legal basis
  description: string;
  impact: string;
  penaltyRange?: {
    min: number;
    max: number;
    unit: 'per_violation' | 'per_incident' | 'total';
  };
  requiresLegislation: boolean;
  timeToImplement: 'Immediate' | '30_days' | '90_days' | '180_days' | '1_year';
}

export interface ExecutiveOrderProvision {
  id: string;
  title: string;
  description: string;
  targetEntities: string[];
  complianceDeadlineDays: number;
}

export interface SanctuaryComplianceStatus {
  facilityId: string;
  facilityName: string;
  operator: string;
  
  // Disclosure status
  federalTenantDisclosed: boolean;
  disclosureDeadline?: Date;
  disclosureDate?: Date;
  
  // Compliance certifications
  sanctuaryCompliant: boolean;
  noVoluntaryICESharing: boolean;
  judicialWarrantRequired: boolean;
  
  // Benefits at risk
  nycidaBenefitsAtRisk: number; // dollar amount
  franchiseExpirationDate?: Date;
  
  // Enforcement actions
  enforcementActions: EnforcementAction[];
  
  lastUpdated: Date;
}

export interface EnforcementAction {
  id: string;
  date: Date;
  type: 'Warning' | 'Fine' | 'Benefit_Suspension' | 'Franchise_Review' | 'Franchise_Revocation';
  description: string;
  amount?: number;
  status: 'Pending' | 'Active' | 'Resolved' | 'Appealed';
}

// ============================================================================
// SHAREHOLDER ACTIVISM TYPES
// ============================================================================

export interface ShareholderEngagement {
  id: string;
  reitTicker: string;
  reitName: string;
  engagementType: 'Disclosure_Request' | 'ESG_Proposal' | 'Proxy_Support' | 'Divestment';
  status: 'Planned' | 'In_Progress' | 'Submitted' | 'Voted' | 'Successful' | 'Failed';
  description: string;
  leadOrganization?: string;
  voteDate?: Date;
  outcome?: string;
}

// ============================================================================
// COALITION & PARTNER TYPES
// ============================================================================

export interface CoalitionPartner {
  id: string;
  name: string;
  type: 'Union' | 'Advocacy' | 'Tech_Workers' | 'Environmental_Justice' | 'Legal' | 'Government';
  focusAreas: string[];
  relevantVictories?: string[];
  website?: string;
  contactInfo?: string;
}

export interface StateLevelCoordination {
  official: string;
  title: string;
  relevance: string;
  keyActions: string[];
}

// ============================================================================
// RESEARCH TOOLS TYPES
// ============================================================================

export interface ResearchResource {
  id: string;
  name: string;
  category: 'Federal_Contracts' | 'Data_Center_Infrastructure' | 'Civil_Rights_Monitoring';
  url: string;
  description: string;
  updateFrequency?: 'Real-time' | 'Daily' | 'Weekly' | 'Monthly' | 'Annual' | 'Static';
}

// ============================================================================
// LEGAL PRECEDENT TYPES
// ============================================================================

export interface LegalPrecedent {
  id: string;
  caseName: string;
  court: string;
  year: number;
  category: 'Sanctuary_City' | 'Infrastructure_Regulation' | 'Data_Sovereignty';
  holdings: string[];
  dataCenterApplicability: string;
  relevanceLevel: 'High' | 'Medium' | 'Low';
}

// ============================================================================
// AGGREGATE STATS TYPES
// ============================================================================

export interface SanctuaryCityStats {
  totalNYCMetroDataCenters: number;
  criticalCarrierHotels: number;
  reitsTotalRevenue: number; // billions
  totalFederalContractsAtRisk: number;
  facilitiesWithNYCIDABenefits: number;
  facilitiesRequiringFranchise: number;
  complianceRate: number; // percentage
  pendingEnforcementActions: number;
}
