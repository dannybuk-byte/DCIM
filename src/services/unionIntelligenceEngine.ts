/**
 * Union Intelligence Engine
 * 
 * Unified interface combining all labor organizing intelligence services:
 * - labordata (NLRB cases, LM-10 persuader reports)
 * - Census Geocoder (coordinate → county FIPS)
 * - Union Jurisdiction (IBEW, SMART, UA, IUOE mapping)
 * - Good Jobs First (subsidies, violations)
 * 
 * Provides a single entry point for:
 * 1. Facility organizing intelligence lookup
 * 2. Employer accountability profiles
 * 3. Union jurisdiction discovery
 * 4. Campaign planning data
 */

import { labordataService, NLRBCase, LM10Report, LazyLoadOptions } from './labordataService';
import { censusGeocoderService, CountyInfo, GeocoderResult } from './censusGeocoderService';
import { unionJurisdictionService, UnionLocal, JurisdictionLookupResult, UnionType } from './unionJurisdictionService';
import { goodJobsFirstService, DataCenterSubsidy, GJFSearchOptions } from './goodJobsFirstService';

// ============================================================================
// TYPES
// ============================================================================

export interface FacilityIntelligence {
  // Location
  coordinates: { lat: number; lng: number };
  county: CountyInfo | null;
  geocodeSource: 'census' | 'fcc' | 'cache' | null;
  
  // Employer
  employer: string;
  facilityName?: string;
  facilityAddress?: string;
  
  // Union Status
  unionStatus: {
    status: 'REPRESENTED' | 'ORGANIZING_TARGET' | 'ACTIVE_CAMPAIGN' | 'UNKNOWN';
    currentUnion?: string;
    certifications: NLRBCase[];
    activePetitions: NLRBCase[];
    ulpCases: NLRBCase[];
  };
  
  // Jurisdictional Unions
  jurisdiction: JurisdictionLookupResult | null;
  
  // Employer Hostility
  hostility: {
    score: number;
    level: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
    factors: Array<{ factor: string; weight: number; value: number; description: string }>;
    persuaderReports: LM10Report[];
    consultants: string[];
    totalSpent: number;
    recommendation: string;
  };
  
  // Subsidies
  subsidies: {
    dataCenterSubsidies: DataCenterSubsidy[];
    totalAmount: number;
    subsidyPerJob?: number;
    searchUrls: {
      subsidies: string;
      violations: string;
      profile: string;
    };
  };
  
  // Organizing Assessment
  organizingScore: {
    score: number;
    recommendation: string;
    factors: Array<{ name: string; score: number; weight: number; }>;
  };
  
  // Metadata
  fetchedAt: string;
  dataFreshness: 'fresh' | 'stale' | 'partial' | 'offline';
}

export interface IntelligenceOptions {
  includeNLRB?: boolean;
  includePersuaders?: boolean;
  includeSubsidies?: boolean;
  includeJurisdiction?: boolean;
  lazyLoadOptions?: LazyLoadOptions;
}

export interface BatchIntelligenceResult {
  facilities: Map<string, FacilityIntelligence>;
  errors: Map<string, Error>;
  progress: { completed: number; total: number };
}

// ============================================================================
// UNION INTELLIGENCE ENGINE
// ============================================================================

class UnionIntelligenceEngine {
  private cache = new Map<string, FacilityIntelligence>();
  private readonly CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Get comprehensive intelligence for a facility
   */
  async getFacilityIntelligence(
    employer: string,
    lat: number,
    lng: number,
    options: IntelligenceOptions = {}
  ): Promise<FacilityIntelligence> {
    const {
      includeNLRB = true,
      includePersuaders = true,
      includeSubsidies = true,
      includeJurisdiction = true,
    } = options;

    const cacheKey = `${employer}-${lat}-${lng}`;
    
    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && this.isCacheFresh(cached.fetchedAt)) {
      return cached;
    }

    // Gather data in parallel where possible
    const promises: Promise<unknown>[] = [];
    
    // Always get geocoding first (needed for jurisdiction)
    const geoResult = await censusGeocoderService.getCountyFromCoordinates(lat, lng);
    
    // NLRB data
    let unionStatusPromise: Promise<{
      status: 'REPRESENTED' | 'ORGANIZING_TARGET' | 'ACTIVE_CAMPAIGN' | 'UNKNOWN';
      certifications: NLRBCase[];
      activePetitions: NLRBCase[];
      ulpCases: NLRBCase[];
      unionLocal?: string;
    }> | null = null;
    
    if (includeNLRB) {
      unionStatusPromise = labordataService.getEmployerUnionStatus(employer);
    }

    // Persuader data
    let persuaderPromise: Promise<{
      hasActivity: boolean;
      reports: LM10Report[];
      totalSpent: number;
      consultants: string[];
    }> | null = null;
    
    if (includePersuaders) {
      persuaderPromise = labordataService.checkPersuaderActivity(employer);
    }

    // Hostility score
    let hostilityPromise: Promise<{
      score: number;
      factors: Array<{ factor: string; weight: number; value: number; description: string }>;
      recommendation: string;
    }> | null = null;
    
    if (includeNLRB && includePersuaders) {
      hostilityPromise = labordataService.calculateHostilityScore(employer);
    }

    // Wait for all promises
    const [unionStatus, persuaderResult, hostilityResult] = await Promise.all([
      unionStatusPromise,
      persuaderPromise,
      hostilityPromise,
    ]);

    // Get jurisdiction if we have county info
    let jurisdiction: JurisdictionLookupResult | null = null;
    if (includeJurisdiction && geoResult.success && geoResult.county) {
      jurisdiction = unionJurisdictionService.lookupByFips(
        geoResult.county.fullFips,
        geoResult.county
      );
    }

    // Get subsidies
    let subsidyData: {
      dataCenterSubsidies: DataCenterSubsidy[];
      totalAmount: number;
      subsidyPerJob?: number;
      searchUrls: { subsidies: string; violations: string; profile: string; };
    } | null = null;
    
    if (includeSubsidies) {
      const accountability = goodJobsFirstService.buildCompanyAccountability(employer);
      subsidyData = {
        dataCenterSubsidies: accountability.localData.dataCenterSubsidies,
        totalAmount: accountability.localData.totalDCSubsidies,
        subsidyPerJob: accountability.localData.subsidyPerJobAverage || undefined,
        searchUrls: accountability.searchUrls,
      };
    }

    // Calculate organizing score
    const organizingScore = this.calculateOrganizingScore({
      employer,
      workerCount: 150, // Default estimate for data centers
      unionStatus: unionStatus?.status || 'UNKNOWN',
      hostilityScore: hostilityResult?.score || 0,
      hasJurisdiction: !!jurisdiction,
      subsidyAmount: subsidyData?.totalAmount || 0,
    });

    // Determine hostility level
    const hostilityLevel = this.getHostilityLevel(hostilityResult?.score || 0);

    // Build result
    const intelligence: FacilityIntelligence = {
      coordinates: { lat, lng },
      county: geoResult.county || null,
      geocodeSource: geoResult.source || null,
      
      employer,
      
      unionStatus: {
        status: unionStatus?.status || 'UNKNOWN',
        currentUnion: unionStatus?.unionLocal,
        certifications: unionStatus?.certifications || [],
        activePetitions: unionStatus?.activePetitions || [],
        ulpCases: unionStatus?.ulpCases || [],
      },
      
      jurisdiction,
      
      hostility: {
        score: hostilityResult?.score || 0,
        level: hostilityLevel,
        factors: hostilityResult?.factors || [],
        persuaderReports: persuaderResult?.reports || [],
        consultants: persuaderResult?.consultants || [],
        totalSpent: persuaderResult?.totalSpent || 0,
        recommendation: hostilityResult?.recommendation || 'Insufficient data for assessment',
      },
      
      subsidies: subsidyData || {
        dataCenterSubsidies: [],
        totalAmount: 0,
        searchUrls: {
          subsidies: goodJobsFirstService.getSubsidyTrackerSearchUrl({ company: employer }),
          violations: goodJobsFirstService.getViolationTrackerSearchUrl({ company: employer }),
          profile: goodJobsFirstService.getCompanyProfileUrl(employer),
        },
      },
      
      organizingScore,
      
      fetchedAt: new Date().toISOString(),
      dataFreshness: this.determineDataFreshness(geoResult, unionStatus, persuaderResult),
    };

    // Cache the result
    this.cache.set(cacheKey, intelligence);

    return intelligence;
  }

  /**
   * Batch process multiple facilities
   */
  async batchGetIntelligence(
    facilities: Array<{ employer: string; lat: number; lng: number; id?: string }>,
    options: IntelligenceOptions = {},
    onProgress?: (completed: number, total: number) => void
  ): Promise<BatchIntelligenceResult> {
    const results = new Map<string, FacilityIntelligence>();
    const errors = new Map<string, Error>();
    const total = facilities.length;

    for (let i = 0; i < facilities.length; i++) {
      const facility = facilities[i];
      const key = facility.id || `${facility.employer}-${facility.lat}-${facility.lng}`;

      try {
        const intelligence = await this.getFacilityIntelligence(
          facility.employer,
          facility.lat,
          facility.lng,
          options
        );
        results.set(key, intelligence);
      } catch (error) {
        errors.set(key, error instanceof Error ? error : new Error(String(error)));
      }

      if (onProgress) {
        onProgress(i + 1, total);
      }

      // Rate limiting between requests
      if (i < facilities.length - 1) {
        await this.sleep(200);
      }
    }

    return {
      facilities: results,
      errors,
      progress: { completed: results.size, total },
    };
  }

  /**
   * Quick jurisdiction lookup (no NLRB/GJF data)
   */
  async quickJurisdictionLookup(lat: number, lng: number): Promise<JurisdictionLookupResult | null> {
    return unionJurisdictionService.lookupByCoordinates(lat, lng);
  }

  /**
   * Search NLRB cases with lazy loading
   */
  async searchNLRBCases(employerName: string, options?: LazyLoadOptions) {
    return labordataService.searchNLRBByEmployer(employerName, options);
  }

  /**
   * Get all union locals by type
   */
  getUnionLocalsByType(type: UnionType): UnionLocal[] {
    return unionJurisdictionService.getUnionsByType(type);
  }

  /**
   * Get data center specialized union locals
   */
  getDataCenterUnions(): UnionLocal[] {
    return unionJurisdictionService.getDataCenterLocals();
  }

  /**
   * Get company subsidy profile
   */
  getCompanySubsidyProfile(company: string) {
    return goodJobsFirstService.buildCompanyAccountability(company);
  }

  /**
   * Check if state has DC tax exemption
   */
  stateHasDCTaxExemption(state: string): boolean {
    return goodJobsFirstService.stateHasDCTaxExemption(state);
  }

  /**
   * Get service statistics
   */
  getStats(): {
    labordata: { available: boolean };
    geocoder: { size: number; keys: string[] };
    jurisdiction: ReturnType<typeof unionJurisdictionService.getDatabaseStats>;
    goodJobsFirst: ReturnType<typeof goodJobsFirstService.getStats>;
    cache: { size: number; entries: string[] };
  } {
    return {
      labordata: { available: true },
      geocoder: censusGeocoderService.getCacheStats(),
      jurisdiction: unionJurisdictionService.getDatabaseStats(),
      goodJobsFirst: goodJobsFirstService.getStats(),
      cache: {
        size: this.cache.size,
        entries: Array.from(this.cache.keys()),
      },
    };
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    this.cache.clear();
    censusGeocoderService.clearCache();
    unionJurisdictionService.clearCache();
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private calculateOrganizingScore(params: {
    employer: string;
    workerCount: number;
    unionStatus: string;
    hostilityScore: number;
    hasJurisdiction: boolean;
    subsidyAmount: number;
  }): { score: number; recommendation: string; factors: Array<{ name: string; score: number; weight: number }> } {
    const factors: Array<{ name: string; score: number; weight: number }> = [];
    let totalScore = 0;

    // Factor 1: Worker count (more workers = more impact but harder)
    const workerScore = Math.min(params.workerCount / 200, 1) * 100;
    factors.push({ name: 'Workforce Size', score: workerScore, weight: 0.20 });
    totalScore += workerScore * 0.20;

    // Factor 2: Not already represented (can't organize what's organized)
    const statusScore = params.unionStatus === 'REPRESENTED' ? 0 :
                       params.unionStatus === 'ACTIVE_CAMPAIGN' ? 90 :
                       params.unionStatus === 'ORGANIZING_TARGET' ? 70 : 50;
    factors.push({ name: 'Organizing Status', score: statusScore, weight: 0.25 });
    totalScore += statusScore * 0.25;

    // Factor 3: Low hostility = easier campaign
    const antiHostilityScore = Math.max(0, 100 - params.hostilityScore);
    factors.push({ name: 'Employer Receptiveness', score: antiHostilityScore, weight: 0.20 });
    totalScore += antiHostilityScore * 0.20;

    // Factor 4: Union jurisdiction coverage = organizing support
    const jurisdictionScore = params.hasJurisdiction ? 100 : 30;
    factors.push({ name: 'Union Jurisdiction', score: jurisdictionScore, weight: 0.20 });
    totalScore += jurisdictionScore * 0.20;

    // Factor 5: High subsidies = accountability leverage
    const subsidyScore = Math.min(params.subsidyAmount / 50000000, 1) * 100;
    factors.push({ name: 'Subsidy Leverage', score: subsidyScore, weight: 0.15 });
    totalScore += subsidyScore * 0.15;

    const score = Math.round(totalScore);
    
    let recommendation: string;
    if (params.unionStatus === 'REPRESENTED') {
      recommendation = 'ALREADY ORGANIZED: Focus on strengthening existing representation.';
    } else if (score >= 75) {
      recommendation = 'HIGH PRIORITY: Strong organizing opportunity. Multiple favorable factors.';
    } else if (score >= 50) {
      recommendation = 'MODERATE: Viable target with some challenges. Assess local conditions.';
    } else if (score >= 25) {
      recommendation = 'CHALLENGING: Significant obstacles. Consider coalition approach.';
    } else {
      recommendation = 'DIFFICULT: Multiple unfavorable factors. May require long-term strategy.';
    }

    return { score, recommendation, factors };
  }

  private getHostilityLevel(score: number): 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME' {
    if (score >= 75) return 'EXTREME';
    if (score >= 50) return 'HIGH';
    if (score >= 25) return 'MODERATE';
    return 'LOW';
  }

  private determineDataFreshness(
    geoResult: GeocoderResult,
    unionStatus: unknown,
    persuaderResult: unknown
  ): 'fresh' | 'stale' | 'partial' | 'offline' {
    const hasGeo = geoResult.success;
    const hasUnion = !!unionStatus;
    const hasPersuader = !!persuaderResult;

    if (!hasGeo && !hasUnion && !hasPersuader) return 'offline';
    if (hasGeo && hasUnion && hasPersuader) return 'fresh';
    return 'partial';
  }

  private isCacheFresh(fetchedAt: string): boolean {
    const age = Date.now() - new Date(fetchedAt).getTime();
    return age < this.CACHE_TTL_MS;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const unionIntelligenceEngine = new UnionIntelligenceEngine();

// Re-export types from sub-services
export type { NLRBCase, LM10Report } from './labordataService';
export type { CountyInfo } from './censusGeocoderService';
export type { UnionLocal, UnionType, JurisdictionLookupResult } from './unionJurisdictionService';
export type { DataCenterSubsidy } from './goodJobsFirstService';

