import Dexie, { Table } from 'dexie';
import { Facility } from '../types';
import { SourceType } from '../config/sourceTypes';
import { computeDemoBgpFields } from '../utils/bgpDemo';

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

    // Version 8: Index optional facility fields used by investigation templates / NLP
    // (where/sortBy require indexed keys — no row rewrite; Dexie rebuilds indexes)
    this.version(8).stores({
      facilities:
        '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, subsidyReceived, jobsPromised, jobsCreated, openedDate, capacity, lastAuditDate',
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
    }).upgrade(async () => {
      console.log(
        'Database upgraded to version 8: facilities indexes for subsidyReceived, jobs, dates, capacity.',
      );
    });

    // Version 9: Demo BGP / network-risk fields on facilities (browser-only, seeded)
    this.version(9).stores({
      facilities:
        '++id, name, type, operator, country, state, city, complianceStatus, subsidyGap, subsidyReceived, jobsPromised, jobsCreated, openedDate, capacity, bgpRiskScore, routeChangeRate, latencyAnomalyScore, transitDependency, infrastructureAccountabilityRisk, lastAuditDate',
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
    }).upgrade(async (tx) => {
      await tx.table('facilities').toCollection().modify((f: Facility) => {
        if (f.bgpRiskScore != null && f.infrastructureAccountabilityRisk != null) {
          return;
        }
        const bgp = computeDemoBgpFields(f.id, f.subsidyGap ?? 0, f.complianceStatus);
        f.bgpRiskScore = bgp.bgpRiskScore;
        f.asnCount = bgp.asnCount;
        f.routeChangeRate = bgp.routeChangeRate;
        f.latencyAnomalyScore = bgp.latencyAnomalyScore;
        f.transitDependency = bgp.transitDependency;
        f.infrastructureAccountabilityRisk = bgp.infrastructureAccountabilityRisk;
      });
      console.log('Database upgraded to version 9: demo BGP fields backfilled on facilities.');
    });
  }
}

export const db = new ComplianceDatabase();