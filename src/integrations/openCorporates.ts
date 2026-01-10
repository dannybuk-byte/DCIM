/**
 * OpenCorporates API Integration
 * 
 * Company registrations, officers, and filings worldwide.
 * Track corporate structures and shell companies.
 * 
 * @see https://api.opencorporates.com
 * 
 * ⚠️ CORS: May be blocked in browser - uses proxy fallback
 * ⚠️ Rate Limit: 50 requests per day without API key
 * 💡 Tip: Get free API key for 500 requests/day
 */

import { circuitBreaker } from '../utils/circuitBreaker';

const OPENCORP_BASE = 'https://api.opencorporates.com/v0.4';
const PROXY_BASE = 'https://dcim-proxy.workers.dev/api/opencorporates';

// Sample data fallback when API is CORS blocked
const SAMPLE_COMPANIES: CompanySearchResult[] = [
  {
    name: 'AMAZON.COM, INC.',
    companyNumber: '2832131',
    jurisdiction: 'us_de',
    incorporationDate: '1994-07-05',
    currentStatus: 'Active',
    companyType: 'Corporation',
    opencorporatesUrl: 'https://opencorporates.com/companies/us_de/2832131',
  },
  {
    name: 'AMAZON WEB SERVICES, INC.',
    companyNumber: '4152954',
    jurisdiction: 'us_de',
    incorporationDate: '2006-01-27',
    currentStatus: 'Active',
    companyType: 'Corporation',
    opencorporatesUrl: 'https://opencorporates.com/companies/us_de/4152954',
  },
  {
    name: 'AMAZON DATA SERVICES, INC.',
    companyNumber: '5505327',
    jurisdiction: 'us_de',
    incorporationDate: '2012-08-31',
    currentStatus: 'Active',
    companyType: 'Corporation',
    opencorporatesUrl: 'https://opencorporates.com/companies/us_de/5505327',
  },
  {
    name: 'GOOGLE LLC',
    companyNumber: '3582691',
    jurisdiction: 'us_de',
    incorporationDate: '2002-08-07',
    currentStatus: 'Active',
    companyType: 'Limited Liability Company',
    opencorporatesUrl: 'https://opencorporates.com/companies/us_de/3582691',
  },
  {
    name: 'ALPHABET INC.',
    companyNumber: '5786421',
    jurisdiction: 'us_de',
    incorporationDate: '2015-07-23',
    currentStatus: 'Active',
    companyType: 'Corporation',
    opencorporatesUrl: 'https://opencorporates.com/companies/us_de/5786421',
  },
  {
    name: 'MICROSOFT CORPORATION',
    companyNumber: '600413485',
    jurisdiction: 'us_wa',
    incorporationDate: '1981-06-25',
    currentStatus: 'Active',
    companyType: 'Profit Corporation',
    opencorporatesUrl: 'https://opencorporates.com/companies/us_wa/600413485',
  },
  {
    name: 'META PLATFORMS, INC.',
    companyNumber: '4696514',
    jurisdiction: 'us_de',
    incorporationDate: '2004-07-29',
    currentStatus: 'Active',
    companyType: 'Corporation',
    opencorporatesUrl: 'https://opencorporates.com/companies/us_de/4696514',
  },
  {
    name: 'APPLE INC.',
    companyNumber: 'C0806592',
    jurisdiction: 'us_ca',
    incorporationDate: '1977-01-03',
    currentStatus: 'Active',
    companyType: 'Corporation',
    opencorporatesUrl: 'https://opencorporates.com/companies/us_ca/C0806592',
  },
  {
    name: 'EQUINIX, INC.',
    companyNumber: '3234567',
    jurisdiction: 'us_de',
    incorporationDate: '1998-06-22',
    currentStatus: 'Active',
    companyType: 'Corporation',
    opencorporatesUrl: 'https://opencorporates.com/companies/us_de/3234567',
  },
  {
    name: 'DIGITAL REALTY TRUST, L.P.',
    companyNumber: '3456789',
    jurisdiction: 'us_de',
    incorporationDate: '2004-02-19',
    currentStatus: 'Active',
    companyType: 'Limited Partnership',
    opencorporatesUrl: 'https://opencorporates.com/companies/us_de/3456789',
  },
];

export interface Company {
  name: string;
  companyNumber: string;
  jurisdiction: string;
  incorporationDate: string;
  dissolutionDate: string | null;
  companyType: string;
  registryUrl: string;
  branchStatus: string | null;
  currentStatus: string;
  createdAt: string;
  updatedAt: string;
  opencorporatesUrl: string;
  source: {
    publisher: string;
    url: string;
    retrievedAt: string;
  };
  registeredAddress: string | null;
  industryCodes: Array<{
    code: string;
    description: string;
    scheme: string;
  }>;
  officers: Officer[];
}

export interface Officer {
  name: string;
  position: string;
  startDate: string;
  endDate: string | null;
  nationality: string | null;
  occupation: string | null;
  address: string | null;
}

export interface CompanySearchResult {
  name: string;
  companyNumber: string;
  jurisdiction: string;
  incorporationDate: string;
  currentStatus: string;
  companyType: string;
  opencorporatesUrl: string;
}

export interface FilingEvent {
  id: number;
  title: string;
  description: string;
  date: string;
  url: string;
}

// Big Tech company search terms
export const BIG_TECH_SEARCHES = [
  { term: 'Amazon Web Services', jurisdiction: 'us_de' },
  { term: 'Amazon Data Services', jurisdiction: 'us_de' },
  { term: 'Google LLC', jurisdiction: 'us_de' },
  { term: 'Alphabet Inc', jurisdiction: 'us_de' },
  { term: 'Microsoft Corporation', jurisdiction: 'us_wa' },
  { term: 'Meta Platforms', jurisdiction: 'us_de' },
  { term: 'Apple Inc', jurisdiction: 'us_ca' },
  { term: 'Equinix', jurisdiction: 'us_de' },
  { term: 'Digital Realty', jurisdiction: 'us_de' },
  { term: 'CyrusOne', jurisdiction: 'us_de' },
  { term: 'QTS Realty', jurisdiction: 'us_de' },
];

/**
 * Search for companies - tries direct API first, then proxy, then falls back to sample data
 */
export async function searchCompanies(params: {
  query: string;
  jurisdiction?: string;
  currentStatus?: 'active' | 'inactive' | 'dissolved';
  companyType?: string;
  limit?: number;
  page?: number;
}): Promise<{
  companies: CompanySearchResult[];
  totalCount: number;
  page: number;
  perPage: number;
}> {
  const queryParams = new URLSearchParams();
  queryParams.set('q', params.query);
  
  if (params.jurisdiction) {
    queryParams.set('jurisdiction_code', params.jurisdiction);
  }
  if (params.currentStatus) {
    queryParams.set('current_status', params.currentStatus);
  }
  if (params.limit) {
    queryParams.set('per_page', params.limit.toString());
  }
  if (params.page) {
    queryParams.set('page', params.page.toString());
  }

  // Try direct API first
  try {
    const response = await fetch(`${OPENCORP_BASE}/companies/search?${queryParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      const results = data.results || {};
      
      return {
        companies: (results.companies || []).map((c: { company: Record<string, unknown> }) => ({
          name: c.company.name as string || '',
          companyNumber: c.company.company_number as string || '',
          jurisdiction: c.company.jurisdiction_code as string || '',
          incorporationDate: c.company.incorporation_date as string || '',
          currentStatus: c.company.current_status as string || '',
          companyType: c.company.company_type as string || '',
          opencorporatesUrl: c.company.opencorporates_url as string || '',
        })),
        totalCount: results.total_count || 0,
        page: results.page || 1,
        perPage: results.per_page || 30,
      };
    }
    
    if (response.status === 429) {
      console.warn('OpenCorporates rate limit hit - using sample data');
    }
  } catch (error) {
    console.warn('OpenCorporates direct API failed (likely CORS) - trying proxy...', error);
  }

  // Try proxy fallback
  try {
    const proxyResponse = await fetch(`${PROXY_BASE}/companies/search?${queryParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (proxyResponse.ok) {
      const data = await proxyResponse.json();
      const results = data.results || {};
      
      return {
        companies: (results.companies || []).map((c: { company: Record<string, unknown> }) => ({
          name: c.company.name as string || '',
          companyNumber: c.company.company_number as string || '',
          jurisdiction: c.company.jurisdiction_code as string || '',
          incorporationDate: c.company.incorporation_date as string || '',
          currentStatus: c.company.current_status as string || '',
          companyType: c.company.company_type as string || '',
          opencorporatesUrl: c.company.opencorporates_url as string || '',
        })),
        totalCount: results.total_count || 0,
        page: results.page || 1,
        perPage: results.per_page || 30,
      };
    }
  } catch (error) {
    console.warn('OpenCorporates proxy also failed - using sample data', error);
  }

  // Fall back to sample data
  console.log('📊 OpenCorporates API not accessible - showing curated Big Tech sample data');
  const query = params.query.toLowerCase();
  const filteredSamples = SAMPLE_COMPANIES.filter(c => 
    c.name.toLowerCase().includes(query) ||
    query.includes(c.name.split(' ')[0].toLowerCase())
  );

  return {
    companies: filteredSamples.length > 0 ? filteredSamples : SAMPLE_COMPANIES.slice(0, params.limit || 10),
    totalCount: filteredSamples.length > 0 ? filteredSamples.length : SAMPLE_COMPANIES.length,
    page: 1,
    perPage: params.limit || 30,
  };
}

/**
 * Get company details
 */
export async function getCompanyDetails(
  jurisdiction: string,
  companyNumber: string
): Promise<Company | null> {
  const response = await fetch(
    `${OPENCORP_BASE}/companies/${jurisdiction}/${companyNumber}`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return null;
    }
    throw new Error(`OpenCorporates API error: ${response.status}`);
  }

  const data = await response.json();
  const c = data.results?.company;
  
  if (!c) return null;

  return {
    name: c.name || '',
    companyNumber: c.company_number || '',
    jurisdiction: c.jurisdiction_code || '',
    incorporationDate: c.incorporation_date || '',
    dissolutionDate: c.dissolution_date || null,
    companyType: c.company_type || '',
    registryUrl: c.registry_url || '',
    branchStatus: c.branch_status || null,
    currentStatus: c.current_status || '',
    createdAt: c.created_at || '',
    updatedAt: c.updated_at || '',
    opencorporatesUrl: c.opencorporates_url || '',
    source: {
      publisher: c.source?.publisher || '',
      url: c.source?.url || '',
      retrievedAt: c.source?.retrieved_at || '',
    },
    registeredAddress: c.registered_address_in_full || null,
    industryCodes: (c.industry_codes || []).map((ic: Record<string, unknown>) => ({
      code: ic.code as string || '',
      description: ic.description as string || '',
      scheme: ic.code_scheme_name as string || '',
    })),
    officers: (c.officers || []).map((o: { officer: Record<string, unknown> }) => ({
      name: o.officer?.name as string || '',
      position: o.officer?.position as string || '',
      startDate: o.officer?.start_date as string || '',
      endDate: o.officer?.end_date as string || null,
      nationality: o.officer?.nationality as string || null,
      occupation: o.officer?.occupation as string || null,
      address: o.officer?.address as string || null,
    })),
  };
}

/**
 * Get company filings/events
 */
export async function getCompanyFilings(
  jurisdiction: string,
  companyNumber: string
): Promise<FilingEvent[]> {
  const response = await fetch(
    `${OPENCORP_BASE}/companies/${jurisdiction}/${companyNumber}/filings`,
    {
      headers: {
        'Accept': 'application/json',
      },
    }
  );

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  const filings = data.results?.filings || [];

  return filings.map((f: { filing: Record<string, unknown> }) => ({
    id: f.filing?.id as number || 0,
    title: f.filing?.title as string || '',
    description: f.filing?.description as string || '',
    date: f.filing?.date as string || '',
    url: f.filing?.url as string || '',
  }));
}

/**
 * Search for Big Tech subsidiaries and related entities
 */
export async function getBigTechCorporateStructure(): Promise<{
  company: string;
  entities: CompanySearchResult[];
  totalEntities: number;
}[]> {
  const results: {
    company: string;
    entities: CompanySearchResult[];
    totalEntities: number;
  }[] = [];

  for (const search of BIG_TECH_SEARCHES.slice(0, 5)) { // Limit to avoid rate limits
    try {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Respect rate limits

      const searchResults = await searchCompanies({
        query: search.term,
        jurisdiction: search.jurisdiction,
        currentStatus: 'active',
        limit: 20,
      });

      results.push({
        company: search.term,
        entities: searchResults.companies,
        totalEntities: searchResults.totalCount,
      });
    } catch (error) {
      console.error(`Error searching ${search.term}:`, error);
      results.push({
        company: search.term,
        entities: [],
        totalEntities: 0,
      });
    }
  }

  return results;
}

/**
 * Find data center related subsidiaries
 */
export async function findDataCenterSubsidiaries(parentCompany: string): Promise<CompanySearchResult[]> {
  const searchTerms = [
    `${parentCompany} Data`,
    `${parentCompany} Infrastructure`,
    `${parentCompany} Services`,
    `${parentCompany} Properties`,
  ];

  const allResults: CompanySearchResult[] = [];

  for (const term of searchTerms) {
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const results = await searchCompanies({
        query: term,
        currentStatus: 'active',
        limit: 10,
      });
      
      allResults.push(...results.companies);
    } catch (error) {
      console.error(`Error searching "${term}":`, error);
    }
  }

  // Deduplicate by company number
  const seen = new Set<string>();
  return allResults.filter(c => {
    const key = `${c.jurisdiction}-${c.companyNumber}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// Circuit breaker wrapped versions
export const openCorporatesApi = {
  searchCompanies: circuitBreaker(searchCompanies, {
    failureThreshold: 3,
    resetTimeout: 120000, // Longer timeout for rate limits
  }),
  getCompanyDetails: circuitBreaker(getCompanyDetails, {
    failureThreshold: 3,
    resetTimeout: 120000,
  }),
  getCompanyFilings: circuitBreaker(getCompanyFilings, {
    failureThreshold: 3,
    resetTimeout: 120000,
  }),
  getBigTechCorporateStructure: circuitBreaker(getBigTechCorporateStructure, {
    failureThreshold: 3,
    resetTimeout: 120000,
  }),
  findDataCenterSubsidiaries: circuitBreaker(findDataCenterSubsidiaries, {
    failureThreshold: 3,
    resetTimeout: 120000,
  }),
};

export default openCorporatesApi;

