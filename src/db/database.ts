import Dexie, { Table } from 'dexie';
import { Facility } from '../types';
import { SourceType } from '../config/sourceTypes';

// Provenance tracking interfaces
export interface DataProvenance {
  id?: number;
  dataPointId: string;
  facilityId: number;
  metricName: string;
  sourceType: SourceType;
  capturedAt: string;
  sourceDescription: string;
  collectionMethod: string;
  confidence: string;
  variance?: string;
  limitations?: string[];
}

export interface CommunityContext {
  countyFips: string;
  population: number;
  medianIncome: number;
  ejIndex: number;
  gridOperator: string;
  waterAuthority: string;
  updatedAt: string;
}

export interface SubsidyAgreement {
  id?: number;
  facilityId: number;
  promisedJobs: number;
  promisedInvestment: number;
  incentiveValue: number;
  incentiveType: string;
  permitDate: string;
  sourceDocument: string;
  sourceType: SourceType;
}

export interface LocalSignature {
  id?: number;
  facilityId: number;
  laborSignature?: string;
  energySignature?: string;
  municipalSignature?: string;
  lm3Signature?: string;
  calculatedAt: string;
}

export interface LocalOrganization {
  id?: number;
  countyFips: string;
  type: 'government' | 'environmental' | 'journalism' | 'labor';
  name: string;
  website?: string;
  relevance: string;
}

export interface KnowledgeGap {
  id?: number;
  facilityId: number;
  question: string;
  foiaTemplateId?: string;
  status: 'identified' | 'investigating' | 'resolved';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface EngagementTracking {
  id?: number;
  facilityId: number;
  contextViewed: boolean;
  promisesViewed: boolean;
  realityViewed: boolean;
  aggregatesUnlocked: boolean;
  timestamp: string;
}

export interface AppSettings {
  key: string;
  value: any;
}

// Search history (NLP autocomplete everywhere)
export interface SearchHistoryEntry {
  id?: number;
  query: string;
  context: string; // e.g. 'global', 'ai', 'sources', 'network-trace', 'osint'
  createdAt: string;
  lastUsedAt: string;
  count: number;
}

// Pattern Intelligence Engine tables
export interface BGPAnomalyRecord {
  id: string;
  timestamp: number;
  type: 'new_prefix' | 'route_leak' | 'unusual_path' | 'withdrawal' | 'origin_change';
  prefix: string;
  asn: string;
  provider: string;
  previousPath?: number[];
  currentPath?: number[];
  significance: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  businessInference: string;
}

export interface CTAlertRecord {
  sha256: string;
  commonName: string;
  domains: string[];
  issuer: string;
  loggedAt: number;
  notBefore: number;
  notAfter: number;
  alertType: 'facility_pattern' | 'new_subdomain' | 'wildcard' | 'renewal' | 'mass_issuance';
  provider?: string;
  geographicHint?: string;
  significance: 'low' | 'medium' | 'high' | 'critical';
  businessInference: string;
}

export interface CuriosityQuestionRecord {
  id: string;
  type: string;
  text: string;
  context: Record<string, unknown>;
  investigationPath: string[];
  learningValue: number;
  status: 'open' | 'investigating' | 'resolved' | 'dismissed';
  resolution?: string;
  createdAt: number;
  resolvedAt?: number;
}

export interface PredictionRecord {
  id: string;
  detectionId: string;
  predictedConfidence: number;
  predictedOutcome: string;
  actualOutcome?: string;
  timestamp: number;
  resolvedAt?: number;
  errorMagnitude?: number;
}

export interface LearnedPatternRecord {
  id: string;
  source: string;
  type: string;
  pattern: string;
  confidence: number;
  occurrences: number;
  learnedAt: number;
  lastSeen: number;
}

export interface CorrelationRecord {
  id: string;
  facilityId: string;
  provider?: string;
  timestamp: number;
  signalCount: number;
  combinedConfidence: number;
  hypothesis: string;
  pattern: string;
  businessInference: string;
  investigationPriority: string;
}

// Network Security & Infrastructure Tracking (NotebookLM-inspired)
export interface NetworkSecurity {
  id?: number;
  facilityId: number;
  asn?: string; // Autonomous System Number
  asnName?: string; // e.g., "Google LLC"
  rpkiStatus: 'Safe' | 'Unsafe' | 'Partially Safe' | 'Unknown';
  networkRiskScore?: number; // 0-100 composite risk score (derived)
  bgpAnomalies?: number; // count of observed anomalies (derived)
  networkProvider?: string;
  transitProviders?: string[]; // Array of upstream providers
  peeringPartners?: string[]; // Direct peering relationships
  ddosMitigation?: string; // DDoS protection service
  bgpCommunities?: string[]; // BGP communities used
  securityFeatures?: string[]; // RPKI, BGPsec, etc.
  lastVerified?: string;
  notes?: string;
}

// Source/Evidence Management (NotebookLM-inspired)
export interface Source {
  id?: number;
  title: string;
  type: 'PDF' | 'URL' | 'Document' | 'Report' | 'API' | 'News' | 'Legal' | 'Government';
  url?: string;
  content?: string; // Base64 for PDFs or text content
  addedAt: string;
  tags?: string[];
  facilityIds?: number[]; // Related facilities
  summary?: string;
  credibility?: 'High' | 'Medium' | 'Low';
}

// Citation/Reference linking
export interface Citation {
  id?: number;
  sourceId: number;
  entityType: 'facility' | 'operator' | 'state' | 'finding';
  entityId: string;
  quote?: string;
  pageNumber?: number;
  context?: string;
  createdAt: string;
}

// Research Notes (NotebookLM chat-like)
export interface ResearchNote {
  id?: number;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  relatedFacilities?: number[];
  relatedSources?: number[];
  category?: 'compliance' | 'network' | 'financial' | 'environmental' | 'general';
}

export class ComplianceDatabase extends Dexie {
  facilities!: Table<Facility, number>;
  dataProvenance!: Table<DataProvenance, number>;
  communityContext!: Table<CommunityContext, string>;
  subsidyAgreements!: Table<SubsidyAgreement, number>;
  localSignatures!: Table<LocalSignature, number>;
  localOrganizations!: Table<LocalOrganization, number>;
  knowledgeGaps!: Table<KnowledgeGap, number>;
  engagementTracking!: Table<EngagementTracking, number>;
  settings!: Table<AppSettings, string>;
  searchHistory!: Table<SearchHistoryEntry, number>;
  // NotebookLM-inspired tables
  networkSecurity!: Table<NetworkSecurity, number>;
  sources!: Table<Source, number>;
  citations!: Table<Citation, number>;
  researchNotes!: Table<ResearchNote, number>;
  // Pattern Intelligence Engine tables
  bgpAnomalies!: Table<BGPAnomalyRecord, string>;
  ctAlerts!: Table<CTAlertRecord, string>;
  curiosityQuestions!: Table<CuriosityQuestionRecord, string>;
  predictions!: Table<PredictionRecord, string>;
  learnedPatterns!: Table<LearnedPatternRecord, string>;
  correlations!: Table<CorrelationRecord, string>;

  constructor() {
    super('ComplianceDatabase');
    
    // Version 3: Original schema
    this.version(3).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate'
    });
    
    // Version 4: Add Loukissas framework tables
    this.version(4).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId'
    }).upgrade(async (_tx) => {
      // Migration: preserve existing data
      // No data transformation needed for new tables
    });
    
    // Version 5: Add settings table (replaces localStorage - Rule 4)
    this.version(5).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId',
      settings: 'key'
    });

    // Version 6: Add NotebookLM-inspired tables (Network Security, Sources, Citations, Research)
    this.version(6).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId',
      settings: 'key',
      networkSecurity: '++id, facilityId, asn, rpkiStatus',
      sources: '++id, type, addedAt, *tags, *facilityIds',
      citations: '++id, sourceId, [entityType+entityId]',
      researchNotes: '++id, createdAt, updatedAt, *tags, *relatedFacilities, *relatedSources, category'
    }).upgrade(async (tx) => {
      console.log('Database upgraded to version 6: NotebookLM features added.');
    });

    // Version 7: Add search history for predictive NLP across the app
    this.version(7).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId',
      settings: 'key',
      networkSecurity: '++id, facilityId, asn, rpkiStatus',
      sources: '++id, type, addedAt, *tags, *facilityIds',
      citations: '++id, sourceId, [entityType+entityId]',
      researchNotes: '++id, createdAt, updatedAt, *tags, *relatedFacilities, *relatedSources, category',
      searchHistory: '++id, query, context, lastUsedAt, [context+lastUsedAt]'
    }).upgrade(async (_tx) => {
      console.log('Database upgraded to version 7: search history enabled.');
    });

    // Version 8: Add Pattern Intelligence Engine tables
    this.version(8).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId',
      settings: 'key',
      networkSecurity: '++id, facilityId, asn, rpkiStatus',
      sources: '++id, type, addedAt, *tags, *facilityIds',
      citations: '++id, sourceId, [entityType+entityId]',
      researchNotes: '++id, createdAt, updatedAt, *tags, *relatedFacilities, *relatedSources, category',
      searchHistory: '++id, query, context, lastUsedAt, [context+lastUsedAt]',
      // Pattern Intelligence Engine
      bgpAnomalies: 'id, timestamp, type, asn, provider, significance',
      ctAlerts: 'sha256, loggedAt, alertType, provider, significance',
      curiosityQuestions: 'id, type, status, createdAt, learningValue',
      predictions: 'id, detectionId, timestamp, resolvedAt',
      learnedPatterns: 'id, source, type, learnedAt, lastSeen',
      correlations: 'id, facilityId, timestamp, pattern, investigationPriority'
    }).upgrade(async (_tx) => {
      console.log('Database upgraded to version 8: Pattern Intelligence Engine tables added.');
    });

    // Version 9: Add OFAC Sanctions Monitor tables
    this.version(9).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId',
      settings: 'key',
      networkSecurity: '++id, facilityId, asn, rpkiStatus',
      sources: '++id, type, addedAt, *tags, *facilityIds',
      citations: '++id, sourceId, [entityType+entityId]',
      researchNotes: '++id, createdAt, updatedAt, *tags, *relatedFacilities, *relatedSources, category',
      searchHistory: '++id, query, context, lastUsedAt, [context+lastUsedAt]',
      // Pattern Intelligence Engine
      bgpAnomalies: 'id, timestamp, type, asn, provider, significance',
      ctAlerts: 'sha256, loggedAt, alertType, provider, significance',
      curiosityQuestions: 'id, type, status, createdAt, learningValue',
      predictions: 'id, detectionId, timestamp, resolvedAt',
      learnedPatterns: 'id, source, type, learnedAt, lastSeen',
      correlations: 'id, facilityId, timestamp, pattern, investigationPriority',
      // OFAC Sanctions Monitor tables
      sdnCache: 'uid, lastName, sdnType, country, lastUpdated',
      sanctionsRiskScores: 'facilityId, riskLevel, timestamp, lastUpdated',
      sanctionsReports: '++id, reportId, facilityId, timestamp, status, riskLevel',
      bgpSanctionsAlerts: '++id, alertId, facilityId, asn, timestamp, severity, resolved'
    }).upgrade(async (_tx) => {
      console.log('Database upgraded to version 9: OFAC Sanctions Monitor tables added.');
    });

    // Version 10: Add Labor Organizing Intelligence tables
    this.version(10).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId',
      settings: 'key',
      networkSecurity: '++id, facilityId, asn, rpkiStatus',
      sources: '++id, type, addedAt, *tags, *facilityIds',
      citations: '++id, sourceId, [entityType+entityId]',
      researchNotes: '++id, createdAt, updatedAt, *tags, *relatedFacilities, *relatedSources, category',
      searchHistory: '++id, query, context, lastUsedAt, [context+lastUsedAt]',
      // Pattern Intelligence Engine
      bgpAnomalies: 'id, timestamp, type, asn, provider, significance',
      ctAlerts: 'sha256, loggedAt, alertType, provider, significance',
      curiosityQuestions: 'id, type, status, createdAt, learningValue',
      predictions: 'id, detectionId, timestamp, resolvedAt',
      learnedPatterns: 'id, source, type, learnedAt, lastSeen',
      correlations: 'id, facilityId, timestamp, pattern, investigationPriority',
      // OFAC Sanctions Monitor tables
      sdnCache: 'uid, lastName, sdnType, country, lastUpdated',
      sanctionsRiskScores: 'facilityId, riskLevel, timestamp, lastUpdated',
      sanctionsReports: '++id, reportId, facilityId, timestamp, status, riskLevel',
      bgpSanctionsAlerts: '++id, alertId, facilityId, asn, timestamp, severity, resolved',
      // Labor Organizing Intelligence tables
      foiaRequests: 'id, state, status, createdAt, submittedAt',
      workerIncidents: 'id, [facility.state], incidentType, status, dateReported',
      contractors: 'id, type, unionStatus, organizingPriority',
      communityBenefitsAgreements: 'id, company, state, status',
      bills: 'id, state, status, category, introducedDate',
      unionPresence: 'facilityId, [location.state], [operationsUnion.status]',
      coalitionPartners: 'id, type, engagementStatus, *focusAreas',
      sharedWatchlists: 'id, createdBy, accessLevel',
      campaigns: 'id, leadOrganization, status, targetCompany'
    }).upgrade(async (_tx) => {
      console.log('Database upgraded to version 10: Labor Organizing Intelligence tables added.');
    });
  }
}

export const db = new ComplianceDatabase();