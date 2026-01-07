/**
 * useUnionIntelligence Hook
 * 
 * React hook for accessing union organizing intelligence data.
 * Connects to the UnionIntelligenceEngine and provides:
 * - Facility intelligence lookup
 * - NLRB case data
 * - Persuader report detection
 * - Union jurisdiction mapping
 * - Employer hostility scoring
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { unionIntelligenceEngine, FacilityIntelligence } from '../services/unionIntelligenceEngine';
import { labordataService, NLRBCase, LM10Report } from '../services/labordataService';
import { unionJurisdictionService, JurisdictionLookupResult } from '../services/unionJurisdictionService';
import { CORSProxy, OSHAInspection, EPAFacility } from '../services/corsProxy';

// ============================================================================
// TYPES
// ============================================================================

export interface UseUnionIntelligenceOptions {
  autoFetch?: boolean;
  includeNLRB?: boolean;
  includePersuaders?: boolean;
  includeSubsidies?: boolean;
  includeJurisdiction?: boolean;
  includeOSHA?: boolean;
  includeEPA?: boolean;
}

export interface UseUnionIntelligenceResult {
  // Data
  intelligence: FacilityIntelligence | null;
  oshaData: OSHAInspection[] | null;
  epaData: EPAFacility[] | null;
  
  // Status
  loading: boolean;
  error: string | null;
  dataFreshness: 'fresh' | 'stale' | 'partial' | 'offline' | null;
  
  // Actions
  fetchIntelligence: (employer: string, lat: number, lng: number) => Promise<FacilityIntelligence | null>;
  fetchOSHA: (employer: string, state?: string) => Promise<OSHAInspection[] | null>;
  fetchEPA: (state: string, city?: string) => Promise<EPAFacility[] | null>;
  clearCache: () => void;
}

export interface NLRBCaseSearch {
  cases: NLRBCase[];
  loading: boolean;
  error: string | null;
  search: (employerName: string) => Promise<void>;
}

export interface JurisdictionLookup {
  result: JurisdictionLookupResult | null;
  loading: boolean;
  error: string | null;
  lookup: (fips: string) => Promise<void>;
  lookupByCoords: (lat: number, lng: number) => Promise<void>;
}

// ============================================================================
// MAIN HOOK
// ============================================================================

export function useUnionIntelligence(
  options: UseUnionIntelligenceOptions = {}
): UseUnionIntelligenceResult {
  const {
    includeNLRB = true,
    includePersuaders = true,
    includeSubsidies = true,
    includeJurisdiction = true,
    includeOSHA = false,
    includeEPA = false,
  } = options;

  const [intelligence, setIntelligence] = useState<FacilityIntelligence | null>(null);
  const [oshaData, setOshaData] = useState<OSHAInspection[] | null>(null);
  const [epaData, setEpaData] = useState<EPAFacility[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dataFreshness, setDataFreshness] = useState<'fresh' | 'stale' | 'partial' | 'offline' | null>(null);

  const fetchIntelligence = useCallback(async (
    employer: string,
    lat: number,
    lng: number
  ): Promise<FacilityIntelligence | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await unionIntelligenceEngine.getFacilityIntelligence(
        employer,
        lat,
        lng,
        {
          includeNLRB,
          includePersuaders,
          includeSubsidies,
          includeJurisdiction,
        }
      );
      
      setIntelligence(result);
      setDataFreshness(result.dataFreshness);
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch intelligence';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, [includeNLRB, includePersuaders, includeSubsidies, includeJurisdiction]);

  const fetchOSHA = useCallback(async (
    employer: string,
    state?: string
  ): Promise<OSHAInspection[] | null> => {
    if (!includeOSHA) return null;
    
    try {
      const result = await CORSProxy.searchOSHAInspections(employer, state);
      if (result.success && result.data) {
        setOshaData(result.data);
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [includeOSHA]);

  const fetchEPA = useCallback(async (
    state: string,
    city?: string
  ): Promise<EPAFacility[] | null> => {
    if (!includeEPA) return null;
    
    try {
      const result = await CORSProxy.searchEPAFacilities(state, city);
      if (result.success && result.data) {
        setEpaData(result.data);
        return result.data;
      }
      return null;
    } catch {
      return null;
    }
  }, [includeEPA]);

  const clearCache = useCallback(() => {
    setIntelligence(null);
    setOshaData(null);
    setEpaData(null);
    setError(null);
    setDataFreshness(null);
  }, []);

  return {
    intelligence,
    oshaData,
    epaData,
    loading,
    error,
    dataFreshness,
    fetchIntelligence,
    fetchOSHA,
    fetchEPA,
    clearCache,
  };
}

// ============================================================================
// NLRB CASES HOOK
// ============================================================================

export function useNLRBCases(): NLRBCaseSearch {
  const [cases, setCases] = useState<NLRBCase[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (employerName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await labordataService.searchByEmployer(employerName, {
        pageSize: 100,
      });
      setCases(result.cases);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to search NLRB cases');
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return { cases, loading, error, search };
}

// ============================================================================
// JURISDICTION HOOK
// ============================================================================

export function useUnionJurisdiction(): JurisdictionLookup {
  const [result, setResult] = useState<JurisdictionLookupResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const lookup = useCallback(async (fips: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const jurisdictionResult = unionJurisdictionService.lookupByFips(fips);
      setResult(jurisdictionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup jurisdiction');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const lookupByCoords = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    setError(null);
    
    try {
      const jurisdictionResult = await unionIntelligenceEngine.quickJurisdictionLookup(lat, lng);
      setResult(jurisdictionResult);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup jurisdiction');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  return { result, loading, error, lookup, lookupByCoords };
}

// ============================================================================
// BATCH FACILITIES HOOK
// ============================================================================

export interface UseBatchIntelligenceResult {
  results: Map<string, FacilityIntelligence>;
  errors: Map<string, Error>;
  loading: boolean;
  progress: { completed: number; total: number };
  fetchBatch: (facilities: Array<{ id: string; employer: string; lat: number; lng: number }>) => Promise<void>;
}

export function useBatchUnionIntelligence(): UseBatchIntelligenceResult {
  const [results, setResults] = useState<Map<string, FacilityIntelligence>>(new Map());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  const fetchBatch = useCallback(async (
    facilities: Array<{ id: string; employer: string; lat: number; lng: number }>
  ) => {
    setLoading(true);
    setProgress({ completed: 0, total: facilities.length });
    
    try {
      const batchResult = await unionIntelligenceEngine.batchGetIntelligence(
        facilities,
        {},
        (completed, total) => setProgress({ completed, total })
      );
      
      setResults(batchResult.facilities);
      setErrors(batchResult.errors);
    } catch (err) {
      console.error('Batch intelligence fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { results, errors, loading, progress, fetchBatch };
}

// ============================================================================
// PERSUADER REPORTS HOOK
// ============================================================================

export interface UsePersuaderReportsResult {
  reports: LM10Report[];
  consultants: string[];
  totalSpent: number;
  loading: boolean;
  error: string | null;
  checkEmployer: (employerName: string) => Promise<void>;
}

export function usePersuaderReports(): UsePersuaderReportsResult {
  const [reports, setReports] = useState<LM10Report[]>([]);
  const [consultants, setConsultants] = useState<string[]>([]);
  const [totalSpent, setTotalSpent] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkEmployer = useCallback(async (employerName: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await labordataService.checkPersuaderActivity(employerName);
      setReports(result.reports);
      setConsultants(result.consultants);
      setTotalSpent(result.totalSpent);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to check persuader activity');
      setReports([]);
      setConsultants([]);
      setTotalSpent(0);
    } finally {
      setLoading(false);
    }
  }, []);

  return { reports, consultants, totalSpent, loading, error, checkEmployer };
}

export default useUnionIntelligence;

