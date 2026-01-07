/**
 * Good Jobs First Service
 * 
 * Integrates with Good Jobs First databases:
 * - Subsidy Tracker (722,000+ entries)
 * - Violation Tracker (690,000+ entries)
 * - Tax Break Tracker (4,000+ jurisdictions)
 * - Amazon Tracker ($11.6B documented subsidies)
 * 
 * Current: Web search wrapper for free access
 * Future: Full CSV/XML export with subscription (CIK/ISIN identifiers)
 * 
 * Note: Data centers have among the highest per-job subsidies ($1.95M average,
 * up to $6.4M per job for Apple NC)
 */

// ============================================================================
// TYPES
// ============================================================================

export interface SubsidyRecord {
  id?: string;
  company: string;
  parentCompany?: string;
  subsidyValue: number;
  subsidySource: string;
  programName?: string;
  projectDescription?: string;
  state: string;
  city?: string;
  county?: string;
  year?: number;
  jobsPromised?: number;
  jobsActual?: number;
  capitalInvestment?: number;
  naicsCode?: string;
  industry?: string;
  // Future subscription fields
  cikCode?: string; // SEC CIK for Edgar integration
  isinCode?: string;
  // Data source metadata
  sourceUrl: string;
  fetchedAt: string;
}

export interface ViolationRecord {
  id?: string;
  company: string;
  parentCompany?: string;
  penaltyAmount: number;
  agency: string;
  violationType: string;
  caseId?: string;
  offenseGroup?: string;
  state?: string;
  year?: number;
  naicsCode?: string;
  facilityName?: string;
  // Data source metadata
  sourceUrl: string;
  fetchedAt: string;
}

export interface DataCenterSubsidy {
  company: string;
  facility: string;
  state: string;
  subsidyValue: number;
  jobsPromised?: number;
  subsidyPerJob?: number;
  taxExemptionType?: string;
  approvalYear?: number;
  notes?: string;
}

export interface CompanyAccountability {
  company: string;
  totalSubsidies: number;
  totalViolationPenalties: number;
  subsidyCount: number;
  violationCount: number;
  dataCenterSubsidies: number;
  states: string[];
  recentSubsidies: SubsidyRecord[];
  recentViolations: ViolationRecord[];
  accountabilityGap: number;
}

export interface GJFSearchOptions {
  company?: string;
  parentCompany?: string;
  state?: string;
  minValue?: number;
  maxValue?: number;
  year?: number;
  naicsCode?: string;
  page?: number;
  pageSize?: number;
}

// ============================================================================
// GOOD JOBS FIRST DATA SOURCES
// ============================================================================

const GJF_SOURCES = {
  subsidyTracker: {
    name: 'Subsidy Tracker',
    webUrl: 'https://subsidytracker.goodjobsfirst.org',
    searchUrl: 'https://subsidytracker.goodjobsfirst.org/prog.php',
    totalRecords: 722000,
    description: 'State/local (582K) and federal (140K) subsidy awards',
  },
  violationTracker: {
    name: 'Violation Tracker',
    webUrl: 'https://violationtracker.goodjobsfirst.org',
    searchUrl: 'https://violationtracker.goodjobsfirst.org/prog.php',
    totalRecords: 690000,
    description: 'Civil/criminal cases from 450+ agencies, $1T+ in penalties',
  },
  taxBreakTracker: {
    name: 'Tax Break Tracker',
    webUrl: 'https://taxbreaktracker.goodjobsfirst.org',
    totalRecords: 4000,
    description: 'GASB 77 tax abatement disclosures (jurisdiction-specific, not company)',
  },
  amazonTracker: {
    name: 'Amazon Tracker',
    webUrl: 'https://amazontracker.goodjobsfirst.org',
    totalSubsidies: 11600000000, // $11.6B
    description: 'Curated Amazon subsidies across warehouses, DCs, film',
  },
} as const;

// ============================================================================
// KNOWN DATA CENTER SUBSIDY DEALS
// Manually curated from GJF "Shutting Down Data Center Subsidies" research
// ============================================================================

const DOCUMENTED_DC_SUBSIDIES: DataCenterSubsidy[] = [
  // Apple
  {
    company: 'Apple',
    facility: 'Maiden Data Center',
    state: 'NC',
    subsidyValue: 321000000,
    jobsPromised: 50,
    subsidyPerJob: 6420000, // Highest documented
    approvalYear: 2009,
    notes: 'Highest subsidy per job in data center history',
  },
  
  // Meta/Facebook
  {
    company: 'Meta',
    facility: 'Prineville Data Center',
    state: 'OR',
    subsidyValue: 30000000,
    taxExemptionType: 'Enterprise Zone',
    approvalYear: 2010,
  },
  {
    company: 'Meta',
    facility: 'Los Lunas Data Center',
    state: 'NM',
    subsidyValue: 30000000,
    jobsPromised: 50,
    taxExemptionType: 'LEDA',
    approvalYear: 2018,
    notes: 'Largest data center in New Mexico',
  },
  
  // Google
  {
    company: 'Google',
    facility: 'Pryor Creek Data Center',
    state: 'OK',
    subsidyValue: 15000000,
    approvalYear: 2007,
  },
  {
    company: 'Google',
    facility: 'Council Bluffs Data Center',
    state: 'IA',
    subsidyValue: 17000000,
    approvalYear: 2007,
  },
  {
    company: 'Google',
    facility: 'New Albany Data Center',
    state: 'OH',
    subsidyValue: 77800000,
    jobsPromised: 400,
    approvalYear: 2019,
  },
  
  // Amazon/AWS
  {
    company: 'Amazon Web Services',
    facility: 'Northern Virginia Campus',
    state: 'VA',
    subsidyValue: 550000000,
    taxExemptionType: 'Data Center Tax Exemption',
    notes: 'Cumulative exemptions for Loudoun County facilities',
  },
  {
    company: 'Amazon',
    facility: 'HQ2',
    state: 'VA',
    subsidyValue: 573000000,
    jobsPromised: 25000,
    approvalYear: 2018,
    notes: 'Includes office and data center components',
  },
  
  // Microsoft
  {
    company: 'Microsoft',
    facility: 'Quincy Data Center',
    state: 'WA',
    subsidyValue: 14000000,
    taxExemptionType: 'Rural County Tax Credit',
    approvalYear: 2006,
  },
  {
    company: 'Microsoft',
    facility: 'San Antonio Data Center',
    state: 'TX',
    subsidyValue: 68000000,
    approvalYear: 2017,
  },
  {
    company: 'Microsoft',
    facility: 'Phoenix Data Center',
    state: 'AZ',
    subsidyValue: 100000000,
    approvalYear: 2021,
    notes: 'Part of $12B Arizona investment',
  },
  
  // Switch
  {
    company: 'Switch',
    facility: 'The Citadel',
    state: 'NV',
    subsidyValue: 89000000,
    approvalYear: 2014,
  },
  
  // QTS
  {
    company: 'QTS',
    facility: 'Richmond Data Center',
    state: 'VA',
    subsidyValue: 18500000,
    approvalYear: 2016,
  },
];

// States with data center tax exemptions (36 states as of research)
const DC_TAX_EXEMPT_STATES = [
  'AL', 'AZ', 'CO', 'CT', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KY',
  'LA', 'ME', 'MD', 'MI', 'MN', 'MS', 'MO', 'NE', 'NV', 'NH', 'NJ', 'NM',
  'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'SC', 'TN', 'TX', 'UT', 'VA',
  'WA', 'WV', 'WI',
];

// Hyperscaler company name variations for matching
const COMPANY_ALIASES: Record<string, string[]> = {
  'Amazon Web Services': ['Amazon', 'AWS', 'AMZN', 'Amazon.com'],
  'Google Cloud': ['Google', 'Alphabet', 'GCP', 'GOOG', 'GOOGL'],
  'Microsoft Azure': ['Microsoft', 'MSFT', 'Azure'],
  'Meta Platforms': ['Meta', 'Facebook', 'FB', 'Goldframe LLC'],
  'Apple': ['Apple', 'AAPL'],
  'Oracle': ['Oracle', 'ORCL'],
  'IBM': ['IBM', 'International Business Machines'],
  'Equinix': ['Equinix', 'EQIX'],
  'Digital Realty': ['Digital Realty', 'DLR', 'DRT'],
};

// ============================================================================
// GOOD JOBS FIRST SERVICE
// ============================================================================

class GoodJobsFirstService {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private readonly CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

  // ===========================================================================
  // PUBLIC SEARCH METHODS (Free Web Access)
  // ===========================================================================

  /**
   * Generate a search URL for Subsidy Tracker (opens in browser)
   */
  getSubsidyTrackerSearchUrl(options: GJFSearchOptions): string {
    const url = new URL(GJF_SOURCES.subsidyTracker.searchUrl);
    
    if (options.company) {
      url.searchParams.set('company', options.company);
    }
    if (options.parentCompany) {
      url.searchParams.set('parent', options.parentCompany);
    }
    if (options.state) {
      url.searchParams.set('state', options.state);
    }
    if (options.minValue) {
      url.searchParams.set('minval', options.minValue.toString());
    }
    
    return url.toString();
  }

  /**
   * Generate a search URL for Violation Tracker
   */
  getViolationTrackerSearchUrl(options: GJFSearchOptions): string {
    const url = new URL(GJF_SOURCES.violationTracker.searchUrl);
    
    if (options.company) {
      url.searchParams.set('company', options.company);
    }
    if (options.parentCompany) {
      url.searchParams.set('parent', options.parentCompany);
    }
    if (options.state) {
      url.searchParams.set('state', options.state);
    }
    
    return url.toString();
  }

  /**
   * Get parent company profile URL
   */
  getCompanyProfileUrl(company: string): string {
    const normalizedName = this.normalizeCompanyName(company);
    return `${GJF_SOURCES.subsidyTracker.webUrl}/parent/${encodeURIComponent(normalizedName)}`;
  }

  // ===========================================================================
  // LOCAL DATA CENTER SUBSIDY DATA
  // ===========================================================================

  /**
   * Get documented data center subsidies by company
   */
  getDataCenterSubsidiesByCompany(company: string): DataCenterSubsidy[] {
    const aliases = this.getCompanyAliases(company);
    return DOCUMENTED_DC_SUBSIDIES.filter(s => 
      aliases.some(alias => 
        s.company.toLowerCase().includes(alias.toLowerCase()) ||
        alias.toLowerCase().includes(s.company.toLowerCase())
      )
    );
  }

  /**
   * Get documented data center subsidies by state
   */
  getDataCenterSubsidiesByState(state: string): DataCenterSubsidy[] {
    return DOCUMENTED_DC_SUBSIDIES.filter(s => 
      s.state.toUpperCase() === state.toUpperCase()
    );
  }

  /**
   * Get all documented data center subsidies
   */
  getAllDataCenterSubsidies(): DataCenterSubsidy[] {
    return [...DOCUMENTED_DC_SUBSIDIES];
  }

  /**
   * Calculate total documented subsidies for a company
   */
  getCompanyTotalSubsidies(company: string): number {
    return this.getDataCenterSubsidiesByCompany(company)
      .reduce((sum, s) => sum + s.subsidyValue, 0);
  }

  /**
   * Check if state has data center tax exemption
   */
  stateHasDCTaxExemption(state: string): boolean {
    return DC_TAX_EXEMPT_STATES.includes(state.toUpperCase());
  }

  /**
   * Get all states with DC tax exemptions
   */
  getDCTaxExemptStates(): string[] {
    return [...DC_TAX_EXEMPT_STATES];
  }

  // ===========================================================================
  // COMPANY ACCOUNTABILITY ANALYSIS
  // ===========================================================================

  /**
   * Build accountability profile for a company
   * Combines local data with GJF web search URLs
   */
  buildCompanyAccountability(company: string): {
    profile: Partial<CompanyAccountability>;
    searchUrls: {
      subsidies: string;
      violations: string;
      profile: string;
    };
    localData: {
      dataCenterSubsidies: DataCenterSubsidy[];
      totalDCSubsidies: number;
      subsidyPerJobAverage: number;
    };
  } {
    const dcSubsidies = this.getDataCenterSubsidiesByCompany(company);
    const totalDCSubsidies = dcSubsidies.reduce((sum, s) => sum + s.subsidyValue, 0);
    
    // Calculate average subsidy per job where data is available
    const withJobs = dcSubsidies.filter(s => s.jobsPromised && s.jobsPromised > 0);
    const subsidyPerJobAverage = withJobs.length > 0
      ? withJobs.reduce((sum, s) => sum + (s.subsidyValue / (s.jobsPromised || 1)), 0) / withJobs.length
      : 0;

    const states = [...new Set(dcSubsidies.map(s => s.state))];

    return {
      profile: {
        company,
        dataCenterSubsidies: totalDCSubsidies,
        subsidyCount: dcSubsidies.length,
        states,
      },
      searchUrls: {
        subsidies: this.getSubsidyTrackerSearchUrl({ company }),
        violations: this.getViolationTrackerSearchUrl({ company }),
        profile: this.getCompanyProfileUrl(company),
      },
      localData: {
        dataCenterSubsidies: dcSubsidies,
        totalDCSubsidies,
        subsidyPerJobAverage,
      },
    };
  }

  // ===========================================================================
  // FUTURE SUBSCRIPTION API PREPARATION
  // ===========================================================================

  /**
   * Placeholder for future bulk API access
   * Will use CSV/XML exports with CIK/ISIN codes
   */
  async fetchSubsidies(_options: GJFSearchOptions): Promise<SubsidyRecord[]> {
    console.warn('Bulk subsidy fetch requires GJF subscription. Using local data.');
    
    // Return local data center subsidies in SubsidyRecord format
    return DOCUMENTED_DC_SUBSIDIES.map(s => ({
      company: s.company,
      subsidyValue: s.subsidyValue,
      subsidySource: 'Good Jobs First - Data Center Research',
      state: s.state,
      jobsPromised: s.jobsPromised,
      industry: 'Data Centers',
      sourceUrl: GJF_SOURCES.subsidyTracker.webUrl,
      fetchedAt: new Date().toISOString(),
    }));
  }

  /**
   * Placeholder for future bulk API access
   */
  async fetchViolations(_options: GJFSearchOptions): Promise<ViolationRecord[]> {
    console.warn('Bulk violation fetch requires GJF subscription.');
    return [];
  }

  /**
   * Check if subscription features are available
   */
  hasSubscriptionAccess(): boolean {
    // Future: Check for API key or subscription token
    return false;
  }

  // ===========================================================================
  // UTILITY METHODS
  // ===========================================================================

  private normalizeCompanyName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim();
  }

  private getCompanyAliases(company: string): string[] {
    const normalized = company.toLowerCase();
    
    for (const [canonical, aliases] of Object.entries(COMPANY_ALIASES)) {
      if (canonical.toLowerCase().includes(normalized) ||
          aliases.some(a => a.toLowerCase().includes(normalized) || normalized.includes(a.toLowerCase()))) {
        return [canonical, ...aliases];
      }
    }
    
    return [company];
  }

  /**
   * Get database statistics
   */
  getStats(): {
    sources: typeof GJF_SOURCES;
    localData: {
      documentedSubsidies: number;
      totalSubsidyValue: number;
      taxExemptStates: number;
      companies: string[];
    };
    subscriptionRequired: string[];
  } {
    const totalValue = DOCUMENTED_DC_SUBSIDIES.reduce((sum, s) => sum + s.subsidyValue, 0);
    const companies = [...new Set(DOCUMENTED_DC_SUBSIDIES.map(s => s.company))];

    return {
      sources: GJF_SOURCES,
      localData: {
        documentedSubsidies: DOCUMENTED_DC_SUBSIDIES.length,
        totalSubsidyValue: totalValue,
        taxExemptStates: DC_TAX_EXEMPT_STATES.length,
        companies,
      },
      subscriptionRequired: [
        'Bulk CSV/XML exports',
        'CIK/ISIN identifiers for SEC integration',
        'Parent-at-time-of-penalty historical matching',
        'Full 722K+ subsidy records',
        'Full 690K+ violation records',
      ],
    };
  }
}

// Export singleton instance
export const goodJobsFirstService = new GoodJobsFirstService();

// Export types and constants
export { GJF_SOURCES, DOCUMENTED_DC_SUBSIDIES, DC_TAX_EXEMPT_STATES, COMPANY_ALIASES };
export type { SubsidyRecord, ViolationRecord, DataCenterSubsidy, CompanyAccountability, GJFSearchOptions };

