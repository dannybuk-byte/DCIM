/**
 * OFAC Sanctions Monitor - Type Definitions
 * Network Hygiene Enforcement Dashboard
 * 
 * Legal Basis: International Emergency Economic Powers Act (IEEPA)
 * Liability Standard: STRICT (no knowledge/intent required)
 * Whistleblower Awards: 10-30% of sanctions > $1M (AMLA)
 */

// SDN Entry from OFAC
export interface SDNEntry {
  uid: string;
  lastName: string; // Entity name for organizations
  firstName?: string;
  sdnType: 'Individual' | 'Entity' | 'Vessel' | 'Aircraft';
  programs: string[]; // CYBER2, RUSSIA, IRAN, etc.
  remarks?: string;
  addresses: SDNAddress[];
  ids: SDNID[];
  akas: SDNAlias[];
  dateOfBirth?: string;
  placeOfBirth?: string;
  nationality?: string;
}

export interface SDNAddress {
  city?: string;
  country: string;
  stateProvince?: string;
  address1?: string;
  address2?: string;
  postalCode?: string;
}

export interface SDNID {
  idType: string; // 'Registration Number', 'Tax ID', etc.
  idNumber: string;
  idCountry?: string;
}

export interface SDNAlias {
  lastName: string;
  firstName?: string;
  type: 'AKA' | 'FKA' | 'DBA';
}

// Sanctioned AS Numbers
export interface SanctionedASN {
  asn: string;
  name: string;
  country: string;
  risk: 'CRITICAL' | 'HIGH' | 'MODERATE';
  programs?: string[]; // Related OFAC programs
  notes?: string;
}

// Sanctioned Jurisdictions
export interface SanctionedJurisdiction {
  code: string; // ISO country code
  name: string;
  sanctionType: 'COMPREHENSIVE' | 'SECTORAL' | 'TARGETED';
  programs: string[];
}

// Risk Scoring
export type RiskLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' | 'MINIMAL';

export interface RiskFactor {
  factor: string;
  points: number;
  details: unknown;
  description?: string;
}

export interface FacilityRiskScore {
  facilityId: string;
  score: number; // 0-100
  riskLevel: RiskLevel;
  factors: RiskFactor[];
  timestamp: string;
  sdnMatches?: SDNMatch[];
  trafficAnalysis?: TrafficAnalysis;
  peeringAnalysis?: PeeringAnalysis;
}

export interface SDNMatch {
  tenant: string;
  sdnEntry: SDNEntry;
  matchType: 'EXACT' | 'FUZZY' | 'AKA_FUZZY';
  matchedName?: string;
  confidence: number; // 0-1
}

export interface TrafficAnalysis {
  sanctionedCountries: string[];
  suspiciousIPs: string[];
  vpnEndpoints: string[];
  timestamp: string;
}

export interface PeeringAnalysis {
  sanctionedASNs: SanctionedASN[];
  suspiciousPeers: string[];
  transitProviders: string[];
}

// Worker Report Types
export interface RedFlag {
  id: string;
  category: 'JURISDICTION' | 'ENTITY' | 'CRYPTO' | 'DOCUMENTATION' | 'PAYMENT' | 'BEHAVIOR';
  question: string;
  weight: number;
  examples: string[];
}

export interface RedFlagObservation {
  flagId: string;
  observed: boolean;
  details: string;
  evidenceAttached: boolean;
  timestamp?: string;
}

export interface TenantInfo {
  name: string;
  knownAliases?: string[];
  contractStart?: string;
  spaceOccupied?: string;
  powerConsumption?: string;
}

export interface Evidence {
  type: 'PHOTO' | 'DOCUMENT' | 'LOG' | 'RECORDING' | 'OTHER';
  filename: string;
  hash: string; // SHA-256
  description: string;
  timestamp: string;
  dataUrl?: string; // For local storage
}

export interface ChainOfCustody {
  collectedBy: string;
  collectedAt: string;
  hash: string;
  signature?: string;
}

export interface ReportRouting {
  anonymous: boolean;
  attorneyReferral: boolean;
  unionNotification: boolean;
  internalCompliance: boolean;
  directOFAC: boolean;
}

export interface SanctionsReport {
  reportId: string;
  timestamp: string;
  reporterType: 'WORKER' | 'CONTRACTOR' | 'ANONYMOUS';
  reporterUnion?: 'IBEW' | 'CWA' | 'IUOE' | 'OTHER' | 'NONE';
  
  // Facility information
  facilityId: string;
  facilityName: string;
  facilityLocation: {
    address: string;
    city: string;
    state: string;
    country: string;
  };
  operator: string;
  
  // Tenant information
  tenantInfo?: TenantInfo;
  
  // Red flags observed
  redFlagsObserved: RedFlagObservation[];
  
  // Detailed narrative
  narrative: string;
  
  // Evidence attachments
  evidence: Evidence[];
  
  // Routing preferences
  routing: ReportRouting;
  
  // Chain of custody
  chainOfCustody: ChainOfCustody;
  
  // Status tracking
  status: 'DRAFT' | 'SUBMITTED' | 'UNDER_REVIEW' | 'ESCALATED' | 'RESOLVED';
}

// Whistleblower Award Program
export interface WhistleblowerProgram {
  program: string;
  minAward: number;
  maxAward: number;
  requirements: string[];
  protections?: string[];
  note?: string;
}

export interface AwardCalculation {
  violations: number;
  programs: WhistleblowerProgram[];
  totalMinAward: number;
  totalMaxAward: number;
}

// Reporting Channels
export interface ReportingChannel {
  name: string;
  type: 'GOVERNMENT' | 'ATTORNEY' | 'UNION' | 'INTERNAL';
  phone?: string;
  email?: string;
  url?: string;
  address?: string;
  notes?: string;
  specialty?: string;
}

// Attorney Network
export interface AttorneyFirm {
  firm: string;
  specialty: string;
  url: string;
  contact?: string;
  notes?: string;
}

// Crypto Mining Detection
export interface CryptoMiningIndicators {
  confirmed: boolean;
  suspected: boolean;
  gpuDensity?: 'HIGH' | 'MEDIUM' | 'LOW';
  powerPattern?: 'CONSTANT' | 'VARIABLE' | 'DIURNAL';
  equipmentType?: string[];
  trafficPatterns?: string[];
}

// Database Records
export interface SanctionsDBRecord {
  id?: number;
  facilityId: string;
  riskScore: number;
  riskLevel: RiskLevel;
  factors: string; // JSON stringified RiskFactor[]
  timestamp: string;
  lastUpdated: string;
}

export interface WorkerReportDBRecord {
  id?: number;
  reportId: string;
  facilityId: string;
  timestamp: string;
  reporterType: string;
  status: string;
  riskLevel: RiskLevel;
  data: string; // JSON stringified SanctionsReport
}

export interface BGPSanctionsAlertDBRecord {
  id?: number;
  alertId: string;
  facilityId: string;
  asn: string;
  asnName?: string;
  timestamp: string;
  severity: RiskLevel;
  description: string;
  resolved: boolean;
}

export interface SDNCacheRecord {
  uid: string;
  lastName: string;
  sdnType: string;
  programs: string; // JSON array
  country?: string;
  lastUpdated: string;
  data: string; // Full JSON
}

