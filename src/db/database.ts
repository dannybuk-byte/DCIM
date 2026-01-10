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

// ============================================================================
// Telemetry Bus + Incident Command System (ICS)
// ============================================================================
export type TelemetrySeverity = 'info' | 'low' | 'medium' | 'high' | 'critical' | 'warning';

export type TelemetrySource =
  | 'bgp'
  | 'ct'
  | 'ct_monitoring'
  | 'verification'
  | 'self_healing'
  | 'degradation'
  | 'api'
  | 'power'
  | 'workforce'
  | 'manual'
  | 'system';

export interface TelemetryEventRecord {
  id: string; // stable ID (client-generated)
  timestamp: number; // ms since epoch
  source: TelemetrySource;
  type: string; // e.g. 'anomaly', 'change', 'incident'
  severity: TelemetrySeverity;
  title?: string;
  summary?: string;
  facilityId?: number;
  correlationId?: string;
  fingerprint?: string; // used for dedup
  payload?: unknown;
}

export type IncidentStatus = 'suspected' | 'confirmed' | 'mitigated' | 'dismissed';

export interface IncidentRecord {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: TelemetrySeverity;
  createdAt: number;
  updatedAt: number;
  lastEventAt?: number;
  summary?: string;
  assignedTo?: string;
  openedBy?: string;
  tags?: string[];
  relatedFacilityIds?: number[];
  correlationIds?: string[];
}

export interface IncidentEventLinkRecord {
  id?: number;
  incidentId: string;
  eventId: string;
  timestamp: number;
}

// ============================================================================
// Real-time monitoring hardening (BGP baseline + RPKI cache)
// ============================================================================
export interface BGPPrefixBaselineRecord {
  /**
   * Stable ID: `${originAsn}|${prefix}`
   */
  id: string;
  prefix: string;
  originAsn: string;
  provider?: string;
  firstSeen: number;
  lastSeen: number;
  lastPath?: number[];
  lastPeerAsn?: string;
}

export interface RpkiVrp {
  prefix: string;
  maxLength: number;
  asn: string; // e.g. "15169"
  ta?: string; // trust anchor hint (optional)
}

export interface RpkiCacheRecord {
  /**
   * Primary key, e.g. "cloudflare_rpki_vrps"
   */
  key: string;
  fetchedAt: number;
  etag?: string;
  /**
   * Raw VRPs. This can be large; store once and build indexes in-memory.
   */
  vrps: RpkiVrp[];
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
  // NEW: Multi-Agent orchestration tables (TWIML-inspired)
  agentStates!: Table<{ id: string; type: string; status: string; lastHeartbeat: number }, string>;
  agentTasks!: Table<{ id: string; type: string; priority: string; status: string; assignedTo?: string; startedAt?: number }, string>;
  agentApprovals!: Table<{ id: string; agentId: string; action: string; status: string; timestamp: number; expiresAt: number }, string>;
  // NEW: Agent Memory System (TWIML Episode #756 - Yutori Scouts)
  agentMemories!: Table<{
    id?: number;
    agentId: string;
    agentType: string;
    memoryType: string;
    content: unknown;
    confidence: number;
    createdAt: Date;
    accessCount: number;
    lastAccessedAt: Date;
    expiresAt?: Date;
    tags: string[];
    metadata: Record<string, unknown>;
  }, number>;
  // NEW: Multi-Signal Correlation Engine (TWIML Episode #740 - Networks of Networks)
  signalCorrelations!: Table<{
    id?: number;
    correlationId: string;
    signals: Array<{ source: string; signalType: string; timestamp: number; data: unknown }>;
    pattern: string;
    confidence: number;
    detectedAt: Date;
    facilityIds: number[];
    actionTaken?: string;
  }, number>;
  // NEW: MCP Tool Registry (TWIML Episode #739 - A2A/MCP)
  mcpTools!: Table<{
    id: string;
    name: string;
    description: string;
    inputSchema: unknown;
    outputSchema: unknown;
    provider: string;
    version: string;
    registeredAt: Date;
    lastUsedAt?: Date;
    usageCount: number;
    avgLatencyMs: number;
  }, string>;

  // NEW v13: Telemetry Bus + Incident Command System
  telemetryEvents!: Table<TelemetryEventRecord, string>;
  incidents!: Table<IncidentRecord, string>;
  incidentEventLinks!: Table<IncidentEventLinkRecord, number>;
  // NEW v14: Real-time hardening tables
  bgpPrefixBaselines!: Table<BGPPrefixBaselineRecord, string>;
  rpkiCache!: Table<RpkiCacheRecord, string>;

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

    // Version 11: Add AI Agent & Evidence Chain tables (TWIML-inspired)
    // - FRE 902(14) legal evidence chains
    // - Knowledge graph triple store
    // - Multi-agent coordination state
    this.version(11).stores({
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
      campaigns: 'id, leadOrganization, status, targetCompany',
      // NEW: FRE 902(14) Legal Evidence Chain tables
      evidenceRecords: 'id, sourceIdentifier, facilityId, captureTimestamp, dataHash',
      evidenceBlobs: 'id, storedAt',
      // NEW: Knowledge Graph triple store (corporate ownership, relationships)
      knowledgeTriples: 'id, subject, predicate, object, confidence, timestamp',
      knowledgeEntities: 'uri, type, label, createdAt, updatedAt',
      // NEW: Multi-Agent orchestration state
      agentStates: 'id, type, status, lastHeartbeat',
      agentTasks: 'id, type, priority, status, assignedTo, startedAt',
      agentApprovals: 'id, agentId, action, status, timestamp, expiresAt',
      // NEW: Evidence triangulation results
      triangulationResults: 'id, claimSubject, verified, overallConfidence, timestamp'
    }).upgrade(async (_tx) => {
      console.log('Database upgraded to version 11: AI Agent & Evidence Chain tables added (TWIML-inspired).');
    });

    // Version 12: Add Agent Memory, Signal Correlation, MCP Tools (TWIML full implementation)
    this.version(12).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId',
      settings: 'key',
      networkSecurity: 'facilityId',
      sources: '++id, type, domain, dateAdded, [type+domain]',
      citations: '++id, dataType, facilityId, sourceId, [dataType+facilityId]',
      researchNotes: '++id, facilityId, noteType, createdAt, [facilityId+noteType]',
      searchHistory: '++id, query, context, createdAt',
      bgpAnomalies: 'id, asn, detectedAt, severity, category',
      ctAlerts: 'id, domain, detectedAt, alertType, severity, [domain+alertType]',
      curiosityQuestions: '++id, facilityId, category, status, generatedAt',
      predictions: '++id, facilityId, predictionType, status, generatedAt, resolvedAt',
      learnedPatterns: 'id, patternType, confidence, lastUpdated',
      correlations: 'id, signalTypes, confidence, detectedAt, status',
      sdnCache: 'id, cachedAt',
      sanctionsRiskScores: 'facilityId, score, calculatedAt',
      sanctionsReports: '++id, facilityId, status, createdAt',
      bgpSanctionsAlerts: '++id, asn, alertType, detectedAt',
      communityBenefitsAgreements: 'id, company, state, status',
      bills: 'id, state, status, category, introducedDate',
      unionPresence: 'facilityId, [location.state], [operationsUnion.status]',
      coalitionPartners: 'id, type, engagementStatus, *focusAreas',
      sharedWatchlists: 'id, createdBy, accessLevel',
      campaigns: 'id, leadOrganization, status, targetCompany',
      evidenceRecords: 'id, sourceIdentifier, facilityId, captureTimestamp, dataHash',
      evidenceBlobs: 'id, storedAt',
      knowledgeTriples: 'id, subject, predicate, object, confidence, timestamp',
      knowledgeEntities: 'uri, type, label, createdAt, updatedAt',
      agentStates: 'id, type, status, lastHeartbeat',
      agentTasks: 'id, type, priority, status, assignedTo, startedAt',
      agentApprovals: 'id, agentId, action, status, timestamp, expiresAt',
      triangulationResults: 'id, claimSubject, verified, overallConfidence, timestamp',
      // NEW v12: Agent Memory System
      agentMemories: '++id, agentId, agentType, memoryType, confidence, createdAt, [agentId+memoryType], *tags',
      // NEW v12: Multi-Signal Correlation Engine
      signalCorrelations: '++id, correlationId, pattern, confidence, detectedAt, *facilityIds',
      // NEW v12: MCP Tool Registry
      mcpTools: 'id, name, provider, version, registeredAt, lastUsedAt'
    }).upgrade(async (_tx) => {
      console.log('Database upgraded to version 12: Agent Memory, Signal Correlation, MCP Tools added (full TWIML implementation).');
    });

    // Version 13: Telemetry Bus + Incident Command System (append-only event sourcing)
    this.version(13).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId',
      settings: 'key',
      networkSecurity: 'facilityId',
      sources: '++id, type, domain, dateAdded, [type+domain]',
      citations: '++id, dataType, facilityId, sourceId, [dataType+facilityId]',
      researchNotes: '++id, facilityId, noteType, createdAt, [facilityId+noteType]',
      searchHistory: '++id, query, context, createdAt',
      bgpAnomalies: 'id, asn, detectedAt, severity, category',
      ctAlerts: 'id, domain, detectedAt, alertType, severity, [domain+alertType]',
      curiosityQuestions: '++id, facilityId, category, status, generatedAt',
      predictions: '++id, facilityId, predictionType, status, generatedAt, resolvedAt',
      learnedPatterns: 'id, patternType, confidence, lastUpdated',
      correlations: 'id, signalTypes, confidence, detectedAt, status',
      sdnCache: 'id, cachedAt',
      sanctionsRiskScores: 'facilityId, score, calculatedAt',
      sanctionsReports: '++id, facilityId, status, createdAt',
      bgpSanctionsAlerts: '++id, asn, alertType, detectedAt',
      communityBenefitsAgreements: 'id, company, state, status',
      bills: 'id, state, status, category, introducedDate',
      unionPresence: 'facilityId, [location.state], [operationsUnion.status]',
      coalitionPartners: 'id, type, engagementStatus, *focusAreas',
      sharedWatchlists: 'id, createdBy, accessLevel',
      campaigns: 'id, leadOrganization, status, targetCompany',
      evidenceRecords: 'id, sourceIdentifier, facilityId, captureTimestamp, dataHash',
      evidenceBlobs: 'id, storedAt',
      knowledgeTriples: 'id, subject, predicate, object, confidence, timestamp',
      knowledgeEntities: 'uri, type, label, createdAt, updatedAt',
      agentStates: 'id, type, status, lastHeartbeat',
      agentTasks: 'id, type, priority, status, assignedTo, startedAt',
      agentApprovals: 'id, agentId, action, status, timestamp, expiresAt',
      triangulationResults: 'id, claimSubject, verified, overallConfidence, timestamp',
      agentMemories: '++id, agentId, agentType, memoryType, confidence, createdAt, [agentId+memoryType], *tags',
      signalCorrelations: '++id, correlationId, pattern, confidence, detectedAt, *facilityIds',
      mcpTools: 'id, name, provider, version, registeredAt, lastUsedAt',
      telemetryEvents:
        'id, timestamp, source, type, severity, facilityId, correlationId, fingerprint, [facilityId+timestamp], [source+timestamp], [correlationId+timestamp]',
      incidents: 'id, status, severity, createdAt, updatedAt, lastEventAt, *tags',
      incidentEventLinks: '++id, incidentId, eventId, timestamp, [incidentId+timestamp], [eventId]'
    }).upgrade(async (_tx) => {
      console.log('Database upgraded to version 13: Telemetry Bus + Incident Command System added.');
    });

    // Version 14: Real-time monitoring hardening (BGP baselines + RPKI cache)
    this.version(14).stores({
      facilities: '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, lastAuditDate',
      dataProvenance: '++id, dataPointId, facilityId, metricName, [facilityId+metricName]',
      communityContext: 'countyFips',
      subsidyAgreements: '++id, facilityId',
      localSignatures: '++id, facilityId',
      localOrganizations: '++id, countyFips, type',
      knowledgeGaps: '++id, facilityId, [facilityId+status]',
      engagementTracking: '++id, facilityId',
      settings: 'key',
      networkSecurity: 'facilityId',
      sources: '++id, type, domain, dateAdded, [type+domain]',
      citations: '++id, dataType, facilityId, sourceId, [dataType+facilityId]',
      researchNotes: '++id, facilityId, noteType, createdAt, [facilityId+noteType]',
      searchHistory: '++id, query, context, createdAt',
      bgpAnomalies: 'id, asn, detectedAt, severity, category',
      ctAlerts: 'id, domain, detectedAt, alertType, severity, [domain+alertType]',
      curiosityQuestions: '++id, facilityId, category, status, generatedAt',
      predictions: '++id, facilityId, predictionType, status, generatedAt, resolvedAt',
      learnedPatterns: 'id, patternType, confidence, lastUpdated',
      correlations: 'id, signalTypes, confidence, detectedAt, status',
      sdnCache: 'id, cachedAt',
      sanctionsRiskScores: 'facilityId, score, calculatedAt',
      sanctionsReports: '++id, facilityId, status, createdAt',
      bgpSanctionsAlerts: '++id, asn, alertType, detectedAt',
      communityBenefitsAgreements: 'id, company, state, status',
      bills: 'id, state, status, category, introducedDate',
      unionPresence: 'facilityId, [location.state], [operationsUnion.status]',
      coalitionPartners: 'id, type, engagementStatus, *focusAreas',
      sharedWatchlists: 'id, createdBy, accessLevel',
      campaigns: 'id, leadOrganization, status, targetCompany',
      evidenceRecords: 'id, sourceIdentifier, facilityId, captureTimestamp, dataHash',
      evidenceBlobs: 'id, storedAt',
      knowledgeTriples: 'id, subject, predicate, object, confidence, timestamp',
      knowledgeEntities: 'uri, type, label, createdAt, updatedAt',
      agentStates: 'id, type, status, lastHeartbeat',
      agentTasks: 'id, type, priority, status, assignedTo, startedAt',
      agentApprovals: 'id, agentId, action, status, timestamp, expiresAt',
      triangulationResults: 'id, claimSubject, verified, overallConfidence, timestamp',
      agentMemories: '++id, agentId, agentType, memoryType, confidence, createdAt, [agentId+memoryType], *tags',
      signalCorrelations: '++id, correlationId, pattern, confidence, detectedAt, *facilityIds',
      mcpTools: 'id, name, provider, version, registeredAt, lastUsedAt',
      telemetryEvents:
        'id, timestamp, source, type, severity, facilityId, correlationId, fingerprint, [facilityId+timestamp], [source+timestamp], [correlationId+timestamp]',
      incidents: 'id, status, severity, createdAt, updatedAt, lastEventAt, *tags',
      incidentEventLinks: '++id, incidentId, eventId, timestamp, [incidentId+timestamp], [eventId]',
      // NEW v14
      bgpPrefixBaselines: 'id, originAsn, prefix, lastSeen, [originAsn+lastSeen]',
      rpkiCache: 'key, fetchedAt'
    }).upgrade(async (_tx) => {
      console.log('Database upgraded to version 14: BGP baseline + RPKI cache added.');
    });

    // Version 15: Audit snapshots for verification decision trails
    this.version(15).stores({
      facilities: '++id, name, operator, state, country, complianceStatus, riskScore, county, city',
      dataCenterMetrics: '++id, facilityId, timestamp, powerUsage, coolingEfficiency, serverCount',
      complianceAlerts: '++id, facilityId, alertType, severity, createdAt, acknowledgedAt',
      searchHistory: '++id, query, resultCount, timestamp',
      settings: 'key',
      savedFilters: '++id, name, filterJson, createdAt',
      exportHistory: '++id, exportType, recordCount, createdAt',
      newsItems: '++id, source, title, url, publishedAt, scrapedAt, relevanceScore',
      newsReadStatus: '++id, newsItemId, readAt',
      networkSecurity: '++id, facilityId, asn, asnName, rpkiStatus, networkRiskScore',
      interconnections: '++id, facilityId, ixpName, connectionType, bandwidthGbps',
      bgpAnomalies: '++id, facilityId, anomalyType, severity, detectedAt, resolvedAt',
      dataPaths: '++id, originFacilityId, destinationFacilityId, dataType, routingPath',
      organizingTargets: '++id, facilityId, operatorName, targetType, priority, status, assignedTo, createdAt, updatedAt, dueDate',
      organizingNotes: '++id, targetId, authorName, content, createdAt',
      organizingTasks: '++id, targetId, taskType, description, status, assignedTo, dueDate',
      sanctions: '++id, facilityId, sdnMatchScore, riskLevel, checkedAt',
      whistleblowerReports: '++id, facilityId, reportType, severity, createdAt, status',
      nlpQueryHistory: '++id, sectionId, query, response, actionsTaken, timestamp',
      workerReviews: '++id, facilityId, operatorName, rating, reviewText, datePosted, verificationStatus, sentiment, themes, source',
      workerIncidents: '++id, facilityId, operatorName, incidentType, severity, description, dateOccurred, dateReported, verificationStatus, source',
      laborIntelligence: '++id, facilityId, operatorName, intelligenceType, content, source, confidence, detectedAt',
      correlations: '++id, facilityId, provider, timestamp, signalCount, combinedConfidence, pattern, hypothesis, businessInference, investigationPriority',
      agentTasks: 'id, type, priority, status, assignedTo, startedAt',
      agentApprovals: 'id, agentId, action, status, timestamp, expiresAt',
      triangulationResults: 'id, claimSubject, verified, overallConfidence, timestamp',
      agentMemories: '++id, agentId, agentType, memoryType, confidence, createdAt, [agentId+memoryType], *tags',
      signalCorrelations: '++id, correlationId, pattern, confidence, detectedAt, *facilityIds',
      mcpTools: 'id, name, provider, version, registeredAt, lastUsedAt',
      telemetryEvents:
        'id, timestamp, source, type, severity, facilityId, correlationId, fingerprint, [facilityId+timestamp], [source+timestamp], [correlationId+timestamp]',
      incidents: 'id, status, severity, createdAt, updatedAt, lastEventAt, *tags',
      incidentEventLinks: '++id, incidentId, eventId, timestamp, [incidentId+timestamp], [eventId]',
      bgpPrefixBaselines: 'id, originAsn, prefix, lastSeen, [originAsn+lastSeen]',
      rpkiCache: 'key, fetchedAt',
      // NEW v15
      auditSnapshots: 'id, timestamp, snapshotType, [linkedEntityType+linkedEntityId]'
    }).upgrade(async (_tx) => {
      console.log('Database upgraded to version 15: Audit snapshots added.');
    });

    // NEW v16: Verification cache for performance
    this.version(16).stores({
      facilities: '++id, name, operator, state, country, complianceStatus, riskScore, county, city',
      dataCenterMetrics: '++id, facilityId, timestamp, powerUsage, coolingEfficiency, serverCount',
      complianceAlerts: '++id, facilityId, alertType, severity, createdAt, acknowledgedAt',
      searchHistory: '++id, query, resultCount, timestamp',
      settings: 'key',
      savedFilters: '++id, name, filterJson, createdAt',
      exportHistory: '++id, exportType, recordCount, createdAt',
      newsItems: '++id, source, title, url, publishedAt, scrapedAt, relevanceScore',
      newsReadStatus: '++id, newsItemId, readAt',
      networkSecurity: '++id, facilityId, asn, asnName, rpkiStatus, networkRiskScore',
      interconnections: '++id, facilityId, ixpName, connectionType, bandwidthGbps',
      bgpAnomalies: '++id, facilityId, anomalyType, severity, detectedAt, resolvedAt',
      dataPaths: '++id, originFacilityId, destinationFacilityId, dataType, routingPath',
      organizingTargets: '++id, facilityId, operatorName, targetType, priority, status, assignedTo, createdAt, updatedAt, dueDate',
      organizingNotes: '++id, targetId, authorName, content, createdAt',
      organizingTasks: '++id, targetId, taskType, description, status, assignedTo, dueDate',
      sanctions: '++id, facilityId, sdnMatchScore, riskLevel, checkedAt',
      whistleblowerReports: '++id, facilityId, reportType, severity, createdAt, status',
      nlpQueryHistory: '++id, sectionId, query, response, actionsTaken, timestamp',
      workerReviews: '++id, facilityId, operatorName, rating, reviewText, datePosted, verificationStatus, sentiment, themes, source',
      workerIncidents: '++id, facilityId, operatorName, incidentType, severity, description, dateOccurred, dateReported, verificationStatus, source',
      laborIntelligence: '++id, facilityId, operatorName, intelligenceType, content, source, confidence, detectedAt',
      correlations: '++id, facilityId, provider, timestamp, signalCount, combinedConfidence, pattern, hypothesis, businessInference, investigationPriority',
      agentTasks: 'id, type, priority, status, assignedTo, startedAt',
      agentApprovals: 'id, agentId, action, status, timestamp, expiresAt',
      triangulationResults: 'id, claimSubject, verified, overallConfidence, timestamp',
      agentMemories: '++id, agentId, agentType, memoryType, confidence, createdAt, [agentId+memoryType], *tags',
      signalCorrelations: '++id, correlationId, pattern, confidence, detectedAt, *facilityIds',
      mcpTools: 'id, name, provider, version, registeredAt, lastUsedAt',
      telemetryEvents:
        'id, timestamp, source, type, severity, facilityId, correlationId, fingerprint, [facilityId+timestamp], [source+timestamp], [correlationId+timestamp]',
      incidents: 'id, status, severity, createdAt, updatedAt, lastEventAt, *tags',
      incidentEventLinks: '++id, incidentId, eventId, timestamp, [incidentId+timestamp], [eventId]',
      bgpPrefixBaselines: 'id, originAsn, prefix, lastSeen, [originAsn+lastSeen]',
      rpkiCache: 'key, fetchedAt',
      auditSnapshots: 'id, timestamp, snapshotType, [linkedEntityType+linkedEntityId]',
      // NEW v16: Verification result cache
      verificationCache: 'key, cachedAt, expiresAt'
    }).upgrade(async (_tx) => {
      console.log('Database upgraded to version 16: Verification cache added.');
    });
  }
}

export const db = new ComplianceDatabase();