/**
 * Labor Intelligence Services Index
 * 
 * Unified exports for all union organizing intelligence services.
 * 
 * Usage:
 * import { unionIntelligenceEngine, labordataService } from '@/services/laborIntelligence';
 */

// Main unified engine
export { unionIntelligenceEngine } from '../unionIntelligenceEngine';
export type { FacilityIntelligence, IntelligenceOptions, BatchIntelligenceResult } from '../unionIntelligenceEngine';

// Individual services
export { labordataService } from '../labordataService';
export type { 
  NLRBCase, 
  LM10Report, 
  LM20Report, 
  OLMSUnionLocal,
  LazyLoadOptions,
  LazyLoadResult,
} from '../labordataService';

export { censusGeocoderService } from '../censusGeocoderService';
export type { CountyInfo, GeocoderResult } from '../censusGeocoderService';

export { unionJurisdictionService, UNION_JURISDICTION_DATABASE } from '../unionJurisdictionService';
export type { UnionLocal, UnionType, JurisdictionLookupResult } from '../unionJurisdictionService';

export { goodJobsFirstService, GJF_SOURCES, DOCUMENTED_DC_SUBSIDIES, DC_TAX_EXEMPT_STATES } from '../goodJobsFirstService';
export type { 
  SubsidyRecord, 
  ViolationRecord, 
  DataCenterSubsidy, 
  CompanyAccountability,
  GJFSearchOptions,
} from '../goodJobsFirstService';

