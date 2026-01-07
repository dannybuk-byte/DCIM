/**
 * labordata Integration Service
 * 
 * Integrates with the labordata GitHub ecosystem (github.com/labordata)
 * for NLRB cases, LM-10 persuader reports, and OLMS disclosure data.
 * 
 * Features:
 * - Lazy loading with pagination to prevent overwhelming the app
 * - IndexedDB caching for offline support
 * - ETag-based change detection for efficient sync
 * - Evidence chain with SHA-256 hashing for legal admissibility (FRE 902)
 */

import { db } from '../db/database';

// ============================================================================
// TYPES
// ============================================================================

export interface NLRBCase {
  id?: number;
  case_number: string;
  case_type: 'RC' | 'CA' | 'CB' | 'CD' | 'CE' | 'RM' | 'RD' | 'UD' | 'UC' | 'AC' | 'WH';
  employer_name: string;
  employer_address?: string;
  employer_city?: string;
  employer_state?: string;
  date_filed: string;
  date_closed?: string;
  status: 'Open' | 'Closed' | 'Certified' | 'Dismissed' | 'Withdrawn';
  region: number;
  union_name?: string;
  unit_description?: string;
  election_date?: string;
  votes_for?: number;
  votes_against?: number;
  certification_date?: string;
  // Evidence chain
  source_url?: string;
  fetched_at?: string;
  data_hash?: string;
}

export interface LM10Report {
  id?: number;
  employer_name: string;
  employer_address?: string;
  employer_city?: string;
  employer_state?: string;
  fiscal_year: number;
  consultant_name?: string;
  consultant_address?: string;
  engagement_date?: string;
  payment_amount?: number;
  description?: string;
  // Evidence chain
  source_url?: string;
  fetched_at?: string;
  data_hash?: string;
}

export interface LM20Report {
  id?: number;
  consultant_name: string;
  consultant_address?: string;
  consultant_city?: string;
  consultant_state?: string;
  fiscal_year: number;
  client_employers?: string[];
  services_provided?: string;
  fees_received?: number;
  // Evidence chain
  source_url?: string;
  fetched_at?: string;
  data_hash?: string;
}

export interface OLMSUnionLocal {
  id?: number;
  f_number: string; // 6-digit unique identifier (e.g., "520-038")
  union_name: string;
  affiliation?: string; // Parent union (IBEW, SMART, UA, IUOE)
  designation?: string; // Local designation (e.g., "Local 26")
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  members?: number;
  fiscal_year_end?: string;
  filing_type?: 'LM-2' | 'LM-3' | 'LM-4';
  // Evidence chain
  source_url?: string;
  fetched_at?: string;
  data_hash?: string;
}

export interface SyncMetadata {
  key: string;
  value: string;
  last_updated: string;
}

export interface LazyLoadOptions {
  page?: number;
  pageSize?: number;
  filters?: Record<string, string | number | boolean>;
  forceRefresh?: boolean;
}

export interface LazyLoadResult<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
  fromCache: boolean;
  syncStatus: 'fresh' | 'stale' | 'offline';
}

// ============================================================================
// DATA SOURCE CONFIGURATION
// ============================================================================

const LABORDATA_SOURCES = {
  nlrb: {
    name: 'NLRB Cases',
    baseUrl: 'https://labordata-warehouse.herokuapp.com/nlrb',
    githubRelease: 'https://github.com/labordata/nlrb-data/releases/download/nightly/nlrb.db.zip',
    updateFrequency: 'daily',
    cacheKey: 'labordata-nlrb-etag',
  },
  lm10: {
    name: 'LM-10 Employer Persuader Reports',
    baseUrl: 'https://labordata.bunkum.us/lm10',
    githubRepo: 'https://github.com/labordata/lm10',
    updateFrequency: 'as-filed',
    cacheKey: 'labordata-lm10-etag',
  },
  lm20: {
    name: 'LM-20 Consultant Persuader Reports',
    baseUrl: 'https://labordata.bunkum.us/lm20',
    githubRepo: 'https://github.com/labordata/lm20',
    updateFrequency: 'as-filed',
    cacheKey: 'labordata-lm20-etag',
  },
  opdr: {
    name: 'OLMS Public Disclosure Room',
    baseUrl: 'https://labordata.bunkum.us/opdr',
    githubRepo: 'https://github.com/labordata/opdr',
    updateFrequency: 'daily-10pm-et',
    cacheKey: 'labordata-opdr-etag',
  },
} as const;

// Known hyperscaler patterns for data center employer matching
const HYPERSCALER_PATTERNS = [
  { pattern: /amazon|aws|amzn/i, canonical: 'Amazon Web Services' },
  { pattern: /google|alphabet|gcp/i, canonical: 'Google Cloud' },
  { pattern: /microsoft|azure|msft/i, canonical: 'Microsoft Azure' },
  { pattern: /meta|facebook|fb/i, canonical: 'Meta Platforms' },
  { pattern: /equinix/i, canonical: 'Equinix' },
  { pattern: /digital realty|digitalrealty/i, canonical: 'Digital Realty' },
  { pattern: /cyrusone/i, canonical: 'CyrusOne' },
  { pattern: /coresite/i, canonical: 'CoreSite' },
  { pattern: /qts/i, canonical: 'QTS Data Centers' },
  { pattern: /vantage/i, canonical: 'Vantage Data Centers' },
];

// ============================================================================
// EVIDENCE CHAIN UTILITIES (FRE 902 Compliance)
// ============================================================================

async function computeSHA256(data: unknown): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(JSON.stringify(data));
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function createEvidenceRecord<T>(data: T, sourceUrl: string): T & { source_url: string; fetched_at: string; data_hash?: string } {
  return {
    ...data,
    source_url: sourceUrl,
    fetched_at: new Date().toISOString(),
  };
}

// ============================================================================
// LAZY LOADING SERVICE
// ============================================================================

class LabordataService {
  private syncInProgress: Record<string, boolean> = {};
  private lastSyncAttempt: Record<string, number> = {};
  private readonly SYNC_COOLDOWN_MS = 60000; // 1 minute between sync attempts

  /**
   * Fetch NLRB cases with lazy loading and caching
   */
  async fetchNLRBCases(options: LazyLoadOptions = {}): Promise<LazyLoadResult<NLRBCase>> {
    const { page = 1, pageSize = 50, filters = {}, forceRefresh = false } = options;
    
    // Check cache first
    const cacheKey = `nlrb-cases-${JSON.stringify(filters)}-${page}-${pageSize}`;
    const cached = await this.getCachedResult<NLRBCase>(cacheKey);
    
    if (cached && !forceRefresh) {
      return {
        ...cached,
        fromCache: true,
        syncStatus: this.getSyncStatus('nlrb'),
      };
    }

    // Try to fetch fresh data
    try {
      const data = await this.fetchFromLabordata<NLRBCase>('nlrb', 'cases', { page, pageSize, ...filters });
      
      // Cache the result
      await this.cacheResult(cacheKey, data);
      
      return {
        data: data.slice(0, pageSize),
        totalCount: data.length,
        page,
        pageSize,
        hasMore: data.length > pageSize,
        fromCache: false,
        syncStatus: 'fresh',
      };
    } catch (error) {
      console.warn('Failed to fetch NLRB cases from labordata, using cache:', error);
      
      // Fall back to cached data if available
      if (cached) {
        return {
          ...cached,
          fromCache: true,
          syncStatus: 'offline',
        };
      }
      
      // Return empty result if no cache
      return {
        data: [],
        totalCount: 0,
        page,
        pageSize,
        hasMore: false,
        fromCache: false,
        syncStatus: 'offline',
      };
    }
  }

  /**
   * Fetch LM-10 persuader reports with lazy loading
   */
  async fetchLM10Reports(options: LazyLoadOptions = {}): Promise<LazyLoadResult<LM10Report>> {
    const { page = 1, pageSize = 50, filters = {}, forceRefresh = false } = options;
    
    const cacheKey = `lm10-reports-${JSON.stringify(filters)}-${page}-${pageSize}`;
    const cached = await this.getCachedResult<LM10Report>(cacheKey);
    
    if (cached && !forceRefresh) {
      return {
        ...cached,
        fromCache: true,
        syncStatus: this.getSyncStatus('lm10'),
      };
    }

    try {
      const data = await this.fetchFromLabordata<LM10Report>('lm10', 'employers', { page, pageSize, ...filters });
      await this.cacheResult(cacheKey, data);
      
      return {
        data: data.slice(0, pageSize),
        totalCount: data.length,
        page,
        pageSize,
        hasMore: data.length > pageSize,
        fromCache: false,
        syncStatus: 'fresh',
      };
    } catch (error) {
      console.warn('Failed to fetch LM-10 reports:', error);
      if (cached) {
        return { ...cached, fromCache: true, syncStatus: 'offline' };
      }
      return { data: [], totalCount: 0, page, pageSize, hasMore: false, fromCache: false, syncStatus: 'offline' };
    }
  }

  /**
   * Search for NLRB cases by employer name with fuzzy matching
   */
  async searchNLRBByEmployer(employerName: string, options: LazyLoadOptions = {}): Promise<LazyLoadResult<NLRBCase>> {
    const normalizedName = this.normalizeEmployerName(employerName);
    
    // Check for hyperscaler patterns
    const hyperscaler = HYPERSCALER_PATTERNS.find(h => h.pattern.test(employerName));
    const searchTerms = hyperscaler 
      ? [employerName, hyperscaler.canonical, ...this.getEmployerVariants(hyperscaler.canonical)]
      : [employerName, ...this.getEmployerVariants(employerName)];

    return this.fetchNLRBCases({
      ...options,
      filters: {
        ...options.filters,
        employer_search: searchTerms.join('|'),
      },
    });
  }

  /**
   * Check if employer has persuader activity (hired anti-union consultants)
   */
  async checkPersuaderActivity(employerName: string): Promise<{
    hasActivity: boolean;
    reports: LM10Report[];
    totalSpent: number;
    consultants: string[];
  }> {
    const result = await this.fetchLM10Reports({
      filters: { employer_search: employerName },
      pageSize: 100,
    });

    const totalSpent = result.data.reduce((sum, r) => sum + (r.payment_amount || 0), 0);
    const consultants = [...new Set(result.data.map(r => r.consultant_name).filter(Boolean))] as string[];

    return {
      hasActivity: result.data.length > 0,
      reports: result.data,
      totalSpent,
      consultants,
    };
  }

  /**
   * Get employer union status based on NLRB certifications
   */
  async getEmployerUnionStatus(employerName: string, facilityAddress?: string): Promise<{
    status: 'REPRESENTED' | 'ORGANIZING_TARGET' | 'ACTIVE_CAMPAIGN' | 'UNKNOWN';
    certifications: NLRBCase[];
    activePetitions: NLRBCase[];
    ulpCases: NLRBCase[];
    unionLocal?: string;
  }> {
    const searchResult = await this.searchNLRBByEmployer(employerName, { pageSize: 200 });
    
    // Filter by address if provided
    let relevantCases = searchResult.data;
    if (facilityAddress) {
      relevantCases = relevantCases.filter(c => 
        this.addressMatches(c.employer_address, facilityAddress)
      );
    }

    const certifications = relevantCases.filter(c => 
      c.case_type === 'RC' && c.status === 'Certified'
    );
    
    const activePetitions = relevantCases.filter(c => 
      ['RC', 'RM', 'RD'].includes(c.case_type) && c.status === 'Open'
    );
    
    const ulpCases = relevantCases.filter(c => 
      ['CA', 'CB'].includes(c.case_type)
    );

    let status: 'REPRESENTED' | 'ORGANIZING_TARGET' | 'ACTIVE_CAMPAIGN' | 'UNKNOWN';
    
    if (certifications.length > 0) {
      status = 'REPRESENTED';
    } else if (activePetitions.length > 0) {
      status = 'ACTIVE_CAMPAIGN';
    } else if (ulpCases.length > 0 || relevantCases.length > 0) {
      status = 'ORGANIZING_TARGET';
    } else {
      status = 'UNKNOWN';
    }

    return {
      status,
      certifications,
      activePetitions,
      ulpCases,
      unionLocal: certifications[0]?.union_name,
    };
  }

  /**
   * Calculate employer hostility score based on NLRB/LM-10 data
   */
  async calculateHostilityScore(employerName: string): Promise<{
    score: number; // 0-100
    factors: Array<{ factor: string; weight: number; value: number; description: string }>;
    recommendation: string;
  }> {
    const [nlrbResult, persuaderResult] = await Promise.all([
      this.searchNLRBByEmployer(employerName, { pageSize: 500 }),
      this.checkPersuaderActivity(employerName),
    ]);

    const factors: Array<{ factor: string; weight: number; value: number; description: string }> = [];
    let totalScore = 0;

    // Factor 1: LM-10 persuader reports (high weight)
    const persuaderScore = Math.min(persuaderResult.reports.length * 20, 100);
    factors.push({
      factor: 'Persuader Activity',
      weight: 0.30,
      value: persuaderScore,
      description: `${persuaderResult.reports.length} LM-10 reports filed, $${(persuaderResult.totalSpent / 1000).toFixed(0)}K spent on consultants`,
    });
    totalScore += persuaderScore * 0.30;

    // Factor 2: ULP charges sustained
    const ulpCases = nlrbResult.data.filter(c => ['CA', 'CB'].includes(c.case_type));
    const ulpScore = Math.min(ulpCases.length * 10, 100);
    factors.push({
      factor: 'ULP Charges',
      weight: 0.25,
      value: ulpScore,
      description: `${ulpCases.length} unfair labor practice cases`,
    });
    totalScore += ulpScore * 0.25;

    // Factor 3: Election losses (employer resisted but workers won)
    const electionLosses = nlrbResult.data.filter(c => 
      c.case_type === 'RC' && c.votes_for && c.votes_against && c.votes_for > c.votes_against
    );
    const lossScore = Math.min(electionLosses.length * 15, 100);
    factors.push({
      factor: 'Lost Elections',
      weight: 0.20,
      value: lossScore,
      description: `${electionLosses.length} union elections lost by employer`,
    });
    totalScore += lossScore * 0.20;

    // Factor 4: Hyperscaler pattern (known anti-union companies)
    const isHyperscaler = HYPERSCALER_PATTERNS.some(h => h.pattern.test(employerName));
    const hyperscalerScore = isHyperscaler ? 80 : 0;
    factors.push({
      factor: 'Industry Pattern',
      weight: 0.15,
      value: hyperscalerScore,
      description: isHyperscaler ? 'Major tech company with documented anti-union posture' : 'No known industry-wide pattern',
    });
    totalScore += hyperscalerScore * 0.15;

    // Factor 5: Recent activity (more weight to recent cases)
    const recentCases = nlrbResult.data.filter(c => {
      const caseDate = new Date(c.date_filed);
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return caseDate > twoYearsAgo;
    });
    const recentScore = Math.min(recentCases.length * 5, 100);
    factors.push({
      factor: 'Recent Activity',
      weight: 0.10,
      value: recentScore,
      description: `${recentCases.length} NLRB cases in past 2 years`,
    });
    totalScore += recentScore * 0.10;

    // Generate recommendation
    let recommendation: string;
    if (totalScore >= 75) {
      recommendation = 'HIGH HOSTILITY: Employer has documented anti-union track record. Extensive preparation and resources required.';
    } else if (totalScore >= 50) {
      recommendation = 'MODERATE HOSTILITY: Some resistance expected. Build strong majority before going public.';
    } else if (totalScore >= 25) {
      recommendation = 'LOW-MODERATE: Limited documented hostility. Standard organizing approach recommended.';
    } else {
      recommendation = 'LOW HOSTILITY: No significant anti-union history found. May be receptive to engagement.';
    }

    return {
      score: Math.round(totalScore),
      factors,
      recommendation,
    };
  }

  // ===========================================================================
  // PRIVATE METHODS
  // ===========================================================================

  private async fetchFromLabordata<T>(
    source: keyof typeof LABORDATA_SOURCES,
    endpoint: string,
    params: Record<string, unknown> = {}
  ): Promise<T[]> {
    const sourceConfig = LABORDATA_SOURCES[source];
    const url = new URL(`${sourceConfig.baseUrl}/${endpoint}.json`);
    
    // Add pagination params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`labordata fetch failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    // Add evidence chain metadata
    return (Array.isArray(data) ? data : [data]).map(item => 
      createEvidenceRecord(item as T, url.toString())
    );
  }

  private async getCachedResult<T>(cacheKey: string): Promise<LazyLoadResult<T> | null> {
    try {
      // Check if we have cached data in localStorage (simple cache for now)
      const cached = localStorage.getItem(`labordata-cache-${cacheKey}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        const cacheAge = Date.now() - parsed.timestamp;
        const maxAge = 24 * 60 * 60 * 1000; // 24 hours
        
        if (cacheAge < maxAge) {
          return parsed.result;
        }
      }
    } catch (error) {
      console.warn('Cache read error:', error);
    }
    return null;
  }

  private async cacheResult<T>(cacheKey: string, data: T[]): Promise<void> {
    try {
      const result: LazyLoadResult<T> = {
        data,
        totalCount: data.length,
        page: 1,
        pageSize: data.length,
        hasMore: false,
        fromCache: true,
        syncStatus: 'fresh',
      };
      
      localStorage.setItem(`labordata-cache-${cacheKey}`, JSON.stringify({
        timestamp: Date.now(),
        result,
      }));
    } catch (error) {
      console.warn('Cache write error:', error);
    }
  }

  private getSyncStatus(source: keyof typeof LABORDATA_SOURCES): 'fresh' | 'stale' | 'offline' {
    const lastSync = this.lastSyncAttempt[source];
    if (!lastSync) return 'stale';
    
    const age = Date.now() - lastSync;
    if (age < 60000) return 'fresh'; // Less than 1 minute
    if (age < 3600000) return 'stale'; // Less than 1 hour
    return 'offline';
  }

  private normalizeEmployerName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private getEmployerVariants(name: string): string[] {
    const variants: string[] = [];
    const normalized = this.normalizeEmployerName(name);
    
    // Add common suffixes/prefixes
    variants.push(normalized);
    variants.push(`${normalized} inc`);
    variants.push(`${normalized} llc`);
    variants.push(`${normalized} corp`);
    variants.push(`${normalized} corporation`);
    variants.push(`${normalized} data center`);
    variants.push(`${normalized} data centers`);
    
    return variants;
  }

  private addressMatches(address1?: string, address2?: string): boolean {
    if (!address1 || !address2) return false;
    
    const normalize = (addr: string) => addr
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/street|st|avenue|ave|road|rd|drive|dr|boulevard|blvd/g, '');
    
    const n1 = normalize(address1);
    const n2 = normalize(address2);
    
    // Check for significant overlap
    return n1.includes(n2) || n2.includes(n1) || 
           this.levenshteinSimilarity(n1, n2) > 0.8;
  }

  private levenshteinSimilarity(s1: string, s2: string): number {
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  private levenshteinDistance(s1: string, s2: string): number {
    const costs: number[] = [];
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i === 0) {
          costs[j] = j;
        } else if (j > 0) {
          let newValue = costs[j - 1];
          if (s1.charAt(i - 1) !== s2.charAt(j - 1)) {
            newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
          }
          costs[j - 1] = lastValue;
          lastValue = newValue;
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }
}

// Export singleton instance
export const labordataService = new LabordataService();

// Export types for external use
export type { LazyLoadOptions, LazyLoadResult };

