/**
 * Regulatory Data Sources for Municipal DCIM Intelligence
 * 
 * This module catalogs all publicly available data sources that municipal
 * and regulatory bodies can use to predict and monitor subsidy compliance.
 * 
 * KEY INSIGHT: Data center operators expose significant operational signals
 * through public records, filings, permits, and infrastructure registries.
 * Municipalities can cross-reference these signals against subsidy commitments
 * to identify compliance risks BEFORE violations occur.
 * 
 * Categories:
 * 1. Power & Energy Data - Usage patterns, utility filings
 * 2. Employment Signals - Jobs promised vs actual
 * 3. Corporate Structure - Shell companies, restructuring
 * 4. Property & Permits - Building activity, valuations
 * 5. Network Infrastructure - BGP, peering, certificates
 * 6. Financial Filings - SEC, state reports
 * 7. Environmental Compliance - EPA, state DEQ
 * 8. Federal Contracts - Government spending
 */

// ============================================================================
// DATA SOURCE DEFINITIONS
// ============================================================================

export interface DataSource {
  id: string;
  name: string;
  category: 'power' | 'employment' | 'corporate' | 'property' | 'network' | 'financial' | 'environmental' | 'contracts';
  
  // Access details
  type: 'api' | 'scraper' | 'bulk_download' | 'foia' | 'manual';
  url: string;
  apiEndpoint?: string;
  authRequired: boolean;
  rateLimit?: string;
  
  // Data characteristics
  updateFrequency: 'realtime' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  coverage: 'federal' | 'state' | 'local' | 'global';
  dataFormat: string[];
  
  // For subsidy monitoring
  subsidyRelevance: 'high' | 'medium' | 'low';
  predictiveSignals: string[];
  
  // Implementation
  implementationDifficulty: 'easy' | 'medium' | 'hard';
  estimatedCost: 'free' | 'low' | 'medium' | 'high';
  
  description: string;
  municipalUseCase: string;
}

export const REGULATORY_DATA_SOURCES: DataSource[] = [
  // =========================================================================
  // POWER & ENERGY DATA
  // =========================================================================
  {
    id: 'eia-860',
    name: 'EIA Form 860 - Generator Data',
    category: 'power',
    type: 'bulk_download',
    url: 'https://www.eia.gov/electricity/data/eia860/',
    authRequired: false,
    updateFrequency: 'annual',
    coverage: 'federal',
    dataFormat: ['xlsx', 'csv'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'New generator installations at data center sites',
      'Capacity expansions without proportional job growth',
      'Backup power installations indicating scale'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'Annual survey of electric generators including on-site generation at large facilities',
    municipalUseCase: 'Track power capacity growth vs job creation commitments'
  },
  {
    id: 'eia-861',
    name: 'EIA Form 861 - Utility Sales',
    category: 'power',
    type: 'bulk_download',
    url: 'https://www.eia.gov/electricity/data/eia861/',
    authRequired: false,
    updateFrequency: 'annual',
    coverage: 'federal',
    dataFormat: ['xlsx', 'csv'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'Large industrial customer additions',
      'Utility rate cases mentioning data centers',
      'Special rate agreements'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'Annual electric power industry report with utility customer data',
    municipalUseCase: 'Identify data center electricity consumption patterns'
  },
  {
    id: 'utility-rate-cases',
    name: 'State PUC Rate Case Filings',
    category: 'power',
    type: 'scraper',
    url: 'https://puc.texas.gov/', // Example - varies by state
    authRequired: false,
    updateFrequency: 'monthly',
    coverage: 'state',
    dataFormat: ['pdf', 'html'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'Special industrial rate requests',
      'Load growth projections',
      'Data center-specific tariffs',
      'Demand response program enrollments'
    ],
    implementationDifficulty: 'medium',
    estimatedCost: 'low',
    description: 'State utility commission filings including rate cases and load forecasts',
    municipalUseCase: 'Monitor utility negotiations that reveal actual power consumption'
  },
  {
    id: 'iso-load-data',
    name: 'ISO/RTO Load Data',
    category: 'power',
    type: 'api',
    url: 'https://www.ercot.com/gridinfo/load',
    apiEndpoint: 'https://www.ercot.com/api/1/load-data',
    authRequired: false,
    rateLimit: '100/hour',
    updateFrequency: 'realtime',
    coverage: 'state',
    dataFormat: ['json', 'csv'],
    subsidyRelevance: 'medium',
    predictiveSignals: [
      'Localized load growth patterns',
      'Industrial load zones',
      'Peak demand shifts'
    ],
    implementationDifficulty: 'medium',
    estimatedCost: 'free',
    description: 'Real-time and historical grid load data from ISOs (ERCOT, PJM, CAISO, etc.)',
    municipalUseCase: 'Detect data center operational patterns via grid load'
  },

  // =========================================================================
  // EMPLOYMENT SIGNALS
  // =========================================================================
  {
    id: 'bls-qcew',
    name: 'BLS Quarterly Census of Employment',
    category: 'employment',
    type: 'api',
    url: 'https://www.bls.gov/cew/',
    apiEndpoint: 'https://api.bls.gov/publicAPI/v2/timeseries/data/',
    authRequired: true, // Free registration
    rateLimit: '500/day',
    updateFrequency: 'quarterly',
    coverage: 'federal',
    dataFormat: ['json'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'NAICS 518210 (Data Processing) employment by county',
      'Wage levels vs job quality commitments',
      'Employment trends at subsidized locations'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'Quarterly employment and wages by industry and county',
    municipalUseCase: 'Verify job creation claims against actual employment data'
  },
  {
    id: 'state-workforce',
    name: 'State Workforce Agency Data',
    category: 'employment',
    type: 'foia',
    url: 'https://www.dol.gov/agencies/eta/unemployment-insurance/data',
    authRequired: false,
    updateFrequency: 'quarterly',
    coverage: 'state',
    dataFormat: ['csv', 'xlsx'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'UI claims at data center employers',
      'New hire reports (some states)',
      'Mass layoff notices (WARN Act)'
    ],
    implementationDifficulty: 'medium',
    estimatedCost: 'low',
    description: 'State-level employment data including new hires and separations',
    municipalUseCase: 'Track actual hiring/separation activity at subsidized facilities'
  },
  {
    id: 'warn-notices',
    name: 'WARN Act Layoff Notices',
    category: 'employment',
    type: 'scraper',
    url: 'https://www.dol.gov/agencies/eta/layoffs/warn',
    authRequired: false,
    updateFrequency: 'daily',
    coverage: 'federal',
    dataFormat: ['html', 'pdf'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'Mass layoff notices at subsidized facilities',
      'Plant closure announcements',
      'Reduction in force notifications'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'Worker Adjustment and Retraining Notification Act filings',
    municipalUseCase: 'Early warning of job losses that could trigger clawbacks'
  },
  {
    id: 'linkedin-job-posts',
    name: 'LinkedIn Jobs API / Scraper',
    category: 'employment',
    type: 'api',
    url: 'https://www.linkedin.com/jobs/',
    apiEndpoint: 'https://api.linkedin.com/v2/jobs',
    authRequired: true,
    rateLimit: '100/day',
    updateFrequency: 'daily',
    coverage: 'global',
    dataFormat: ['json'],
    subsidyRelevance: 'medium',
    predictiveSignals: [
      'Hiring velocity at specific locations',
      'Job type mix (ops vs engineering)',
      'Salary ranges vs commitment levels'
    ],
    implementationDifficulty: 'hard',
    estimatedCost: 'medium',
    description: 'Job posting data revealing hiring patterns',
    municipalUseCase: 'Monitor hiring activity to predict job creation compliance'
  },

  // =========================================================================
  // CORPORATE STRUCTURE
  // =========================================================================
  {
    id: 'opencorporates',
    name: 'OpenCorporates',
    category: 'corporate',
    type: 'api',
    url: 'https://opencorporates.com/',
    apiEndpoint: 'https://api.opencorporates.com/v0.4/',
    authRequired: true, // Free tier available
    rateLimit: '500/month free',
    updateFrequency: 'daily',
    coverage: 'global',
    dataFormat: ['json'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'New subsidiary formations',
      'Jurisdiction changes (Delaware shell companies)',
      'Officer changes indicating restructuring',
      'Inactive/dissolved entities'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'low',
    description: 'Global corporate registry aggregator with 200M+ companies',
    municipalUseCase: 'Track corporate restructuring that may precede subsidy violations'
  },
  {
    id: 'state-sos',
    name: 'State Secretary of State Filings',
    category: 'corporate',
    type: 'scraper',
    url: 'https://www.sos.state.tx.us/', // Example - varies by state
    authRequired: false,
    updateFrequency: 'daily',
    coverage: 'state',
    dataFormat: ['html', 'pdf'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'Certificate of formation filings',
      'Registered agent changes',
      'Annual report filings',
      'Merger/conversion notices'
    ],
    implementationDifficulty: 'medium',
    estimatedCost: 'free',
    description: 'State business entity filings and corporate records',
    municipalUseCase: 'Monitor corporate presence and legal status in jurisdiction'
  },
  {
    id: 'sec-edgar',
    name: 'SEC EDGAR',
    category: 'financial',
    type: 'api',
    url: 'https://www.sec.gov/edgar/',
    apiEndpoint: 'https://data.sec.gov/submissions/',
    authRequired: false,
    rateLimit: '10/second',
    updateFrequency: 'daily',
    coverage: 'federal',
    dataFormat: ['json', 'xml', 'html'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      '10-K mentions of tax incentives/subsidies',
      '8-K restructuring announcements',
      'Risk factor disclosures',
      'Geographic segment reporting'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'SEC filings including 10-K, 10-Q, 8-K for public companies',
    municipalUseCase: 'Search filings for subsidy disclosures and compliance risks'
  },

  // =========================================================================
  // PROPERTY & PERMITS
  // =========================================================================
  {
    id: 'county-assessor',
    name: 'County Assessor Property Records',
    category: 'property',
    type: 'scraper',
    url: 'https://www.co.santa-clara.ca.us/assessor/', // Example
    authRequired: false,
    updateFrequency: 'annual',
    coverage: 'local',
    dataFormat: ['html', 'csv'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'Property valuations vs abatement amounts',
      'Ownership transfers',
      'Improvement permits indicating expansion',
      'Special assessment districts'
    ],
    implementationDifficulty: 'medium',
    estimatedCost: 'free',
    description: 'Local property tax records and assessments',
    municipalUseCase: 'Verify property tax abatement compliance and valuations'
  },
  {
    id: 'building-permits',
    name: 'Local Building Permit Database',
    category: 'property',
    type: 'api',
    url: 'https://data.cityofchicago.org/Buildings/Building-Permits/',
    apiEndpoint: 'https://data.cityofchicago.org/resource/building-permits.json',
    authRequired: false,
    updateFrequency: 'daily',
    coverage: 'local',
    dataFormat: ['json', 'csv'],
    subsidyRelevance: 'medium',
    predictiveSignals: [
      'Construction activity levels',
      'Electrical permit loads (MW capacity)',
      'Generator installations',
      'Cooling system permits'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'Municipal building permit records (often via Socrata/CKAN)',
    municipalUseCase: 'Track facility expansion and investment commitments'
  },
  {
    id: 'real-estate-transactions',
    name: 'Commercial Real Estate Transactions',
    category: 'property',
    type: 'scraper',
    url: 'https://www.costar.com/', // Commercial, alternatives exist
    authRequired: true,
    updateFrequency: 'weekly',
    coverage: 'federal',
    dataFormat: ['json'],
    subsidyRelevance: 'medium',
    predictiveSignals: [
      'Property sales (may indicate exit)',
      'Lease terminations',
      'Market valuations',
      'Sale-leaseback transactions'
    ],
    implementationDifficulty: 'hard',
    estimatedCost: 'high',
    description: 'Commercial real estate transaction data',
    municipalUseCase: 'Detect property sales that may signal facility closure'
  },

  // =========================================================================
  // NETWORK INFRASTRUCTURE
  // =========================================================================
  {
    id: 'peeringdb',
    name: 'PeeringDB',
    category: 'network',
    type: 'api',
    url: 'https://www.peeringdb.com/',
    apiEndpoint: 'https://peeringdb.com/api/',
    authRequired: false,
    rateLimit: '100/minute',
    updateFrequency: 'realtime',
    coverage: 'global',
    dataFormat: ['json'],
    subsidyRelevance: 'medium',
    predictiveSignals: [
      'Facility presence and capacity',
      'Network interconnection density',
      'IX membership changes',
      'Facility closures/additions'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'Global database of networks, facilities, and exchange points',
    municipalUseCase: 'Track network infrastructure presence at subsidized locations'
  },
  {
    id: 'ripe-ris',
    name: 'RIPE RIS BGP Data',
    category: 'network',
    type: 'api',
    url: 'https://www.ripe.net/analyse/internet-measurements/routing-information-service-ris',
    apiEndpoint: 'wss://ris-live.ripe.net/v1/ws/',
    authRequired: false,
    updateFrequency: 'realtime',
    coverage: 'global',
    dataFormat: ['json'],
    subsidyRelevance: 'low',
    predictiveSignals: [
      'BGP routing changes indicating traffic shifts',
      'ASN announcements/withdrawals',
      'Prefix changes'
    ],
    implementationDifficulty: 'hard',
    estimatedCost: 'free',
    description: 'Real-time BGP routing data stream',
    municipalUseCase: 'Advanced: Detect traffic routing away from subsidized facilities'
  },
  {
    id: 'certificate-transparency',
    name: 'Certificate Transparency Logs',
    category: 'network',
    type: 'api',
    url: 'https://crt.sh/',
    apiEndpoint: 'https://crt.sh/?output=json',
    authRequired: false,
    updateFrequency: 'realtime',
    coverage: 'global',
    dataFormat: ['json'],
    subsidyRelevance: 'low',
    predictiveSignals: [
      'New SSL certificates for facility domains',
      'Certificate revocations',
      'Subdomain patterns indicating services'
    ],
    implementationDifficulty: 'medium',
    estimatedCost: 'free',
    description: 'Public log of all SSL/TLS certificates issued',
    municipalUseCase: 'Track digital infrastructure presence and activity'
  },

  // =========================================================================
  // ENVIRONMENTAL COMPLIANCE
  // =========================================================================
  {
    id: 'epa-echo',
    name: 'EPA ECHO (Enforcement & Compliance)',
    category: 'environmental',
    type: 'api',
    url: 'https://echo.epa.gov/',
    apiEndpoint: 'https://echodata.epa.gov/echo/',
    authRequired: false,
    updateFrequency: 'weekly',
    coverage: 'federal',
    dataFormat: ['json', 'csv'],
    subsidyRelevance: 'medium',
    predictiveSignals: [
      'Air permit applications (cooling, generators)',
      'Water discharge permits',
      'Compliance violations',
      'Inspection histories'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'EPA facility compliance and permit data',
    municipalUseCase: 'Monitor environmental permits that indicate facility operations'
  },
  {
    id: 'state-deq',
    name: 'State DEQ Permits',
    category: 'environmental',
    type: 'scraper',
    url: 'https://www.tceq.texas.gov/', // Example - varies by state
    authRequired: false,
    updateFrequency: 'weekly',
    coverage: 'state',
    dataFormat: ['html', 'pdf'],
    subsidyRelevance: 'medium',
    predictiveSignals: [
      'Air quality permits (diesel generators)',
      'Water withdrawal permits',
      'Wastewater discharge permits',
      'Hazardous materials storage'
    ],
    implementationDifficulty: 'medium',
    estimatedCost: 'free',
    description: 'State environmental quality permits and compliance',
    municipalUseCase: 'Track environmental permits that reveal operational scale'
  },

  // =========================================================================
  // FEDERAL CONTRACTS & SPENDING
  // =========================================================================
  {
    id: 'usaspending',
    name: 'USASpending.gov',
    category: 'contracts',
    type: 'api',
    url: 'https://www.usaspending.gov/',
    apiEndpoint: 'https://api.usaspending.gov/api/v2/',
    authRequired: false,
    rateLimit: '1000/hour',
    updateFrequency: 'daily',
    coverage: 'federal',
    dataFormat: ['json'],
    subsidyRelevance: 'medium',
    predictiveSignals: [
      'Federal contracts at subsidized facilities',
      'Grant awards',
      'Subcontracting patterns'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'Federal spending data including contracts and grants',
    municipalUseCase: 'Track federal business that may offset subsidy economics'
  },
  {
    id: 'sam-gov',
    name: 'SAM.gov Entity Registration',
    category: 'contracts',
    type: 'api',
    url: 'https://sam.gov/',
    apiEndpoint: 'https://api.sam.gov/entity-information/v2/',
    authRequired: true,
    rateLimit: '1000/day',
    updateFrequency: 'daily',
    coverage: 'federal',
    dataFormat: ['json'],
    subsidyRelevance: 'low',
    predictiveSignals: [
      'Entity registration status',
      'Business size classifications',
      'Exclusion records'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'Federal contractor registration and entity data',
    municipalUseCase: 'Verify entity status and federal contractor eligibility'
  },

  // =========================================================================
  // SUBSIDY TRACKING SPECIFIC
  // =========================================================================
  {
    id: 'good-jobs-first-subsidy-tracker',
    name: 'Good Jobs First Subsidy Tracker',
    category: 'financial',
    type: 'bulk_download',
    url: 'https://subsidytracker.goodjobsfirst.org/',
    authRequired: false,
    updateFrequency: 'quarterly',
    coverage: 'federal',
    dataFormat: ['csv', 'xlsx'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'Historical subsidy awards',
      'Subsidy values and types',
      'Parent company relationships',
      'Multi-state subsidy patterns'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'Database of state and local economic development subsidies',
    municipalUseCase: 'Compare your subsidies against industry benchmarks'
  },
  {
    id: 'tax-break-tracker',
    name: 'Good Jobs First Tax Break Tracker',
    category: 'financial',
    type: 'bulk_download',
    url: 'https://taxbreaktracker.goodjobsfirst.org/',
    authRequired: false,
    updateFrequency: 'annual',
    coverage: 'state',
    dataFormat: ['csv'],
    subsidyRelevance: 'high',
    predictiveSignals: [
      'State tax break program details',
      'Revenue costs',
      'Program transparency scores'
    ],
    implementationDifficulty: 'easy',
    estimatedCost: 'free',
    description: 'State-level tax incentive program database',
    municipalUseCase: 'Understand tax break landscape in your state'
  }
];

// ============================================================================
// INTEGRATION TEMPLATES
// ============================================================================

export interface ScraperTemplate {
  id: string;
  name: string;
  targetSource: string;
  language: 'python' | 'typescript' | 'shell';
  description: string;
  codeSnippet: string;
  dependencies: string[];
  schedule: string;
}

export const SCRAPER_TEMPLATES: ScraperTemplate[] = [
  {
    id: 'bls-employment-scraper',
    name: 'BLS Employment API Scraper',
    targetSource: 'bls-qcew',
    language: 'python',
    description: 'Fetch quarterly employment data for data center NAICS codes',
    dependencies: ['requests', 'pandas'],
    schedule: 'quarterly',
    codeSnippet: `
import requests
import pandas as pd

BLS_API_KEY = 'YOUR_API_KEY'  # Free registration
DATA_CENTER_NAICS = '518210'  # Data Processing

def fetch_county_employment(state_fips: str, county_fips: str):
    """Fetch QCEW employment for data center industry in a county."""
    series_id = f"ENU{state_fips}{county_fips}10{DATA_CENTER_NAICS}"
    
    response = requests.post(
        'https://api.bls.gov/publicAPI/v2/timeseries/data/',
        json={
            'seriesid': [series_id],
            'startyear': '2020',
            'endyear': '2024',
            'registrationkey': BLS_API_KEY
        }
    )
    
    data = response.json()
    return pd.DataFrame(data['Results']['series'][0]['data'])

# Example: Fetch Loudoun County, VA (data center hotspot)
employment = fetch_county_employment('51', '107')
print(f"Latest employment: {employment.iloc[0]['value']} jobs")
`
  },
  {
    id: 'sec-subsidy-search',
    name: 'SEC Filing Subsidy Mention Search',
    targetSource: 'sec-edgar',
    language: 'typescript',
    description: 'Search SEC filings for tax incentive and subsidy mentions',
    dependencies: ['node-fetch'],
    schedule: 'weekly',
    codeSnippet: `
const SUBSIDY_KEYWORDS = [
  'tax incentive', 'tax abatement', 'property tax exemption',
  'sales tax exemption', 'economic development', 'job creation',
  'clawback', 'performance requirement'
];

async function searchFilingsForSubsidies(cik: string) {
  const response = await fetch(
    \`https://efts.sec.gov/LATEST/search-index?q="\${SUBSIDY_KEYWORDS.join('" OR "')}"\` +
    \`&dateRange=custom&startdt=2020-01-01&forms=10-K,10-Q,8-K&ciks=\${cik}\`
  );
  
  const results = await response.json();
  
  return results.hits.hits.map(hit => ({
    accessionNumber: hit._source.accession_number,
    form: hit._source.form,
    filedAt: hit._source.file_date,
    excerpt: hit._source.display_name
  }));
}

// Example: Search Microsoft filings
const subsidyMentions = await searchFilingsForSubsidies('0000789019');
console.log(\`Found \${subsidyMentions.length} filings mentioning subsidies\`);
`
  },
  {
    id: 'warn-notice-monitor',
    name: 'WARN Act Layoff Notice Monitor',
    targetSource: 'warn-notices',
    language: 'python',
    description: 'Monitor state WARN notice pages for data center operator layoffs',
    dependencies: ['beautifulsoup4', 'requests', 'pandas'],
    schedule: 'daily',
    codeSnippet: `
import requests
from bs4 import BeautifulSoup
import pandas as pd

DATA_CENTER_OPERATORS = [
    'Amazon', 'Microsoft', 'Google', 'Meta', 'Apple',
    'Equinix', 'Digital Realty', 'CyrusOne', 'QTS'
]

def scrape_texas_warn():
    """Scrape Texas WARN notices for data center operators."""
    url = 'https://www.twc.texas.gov/businesses/worker-adjustment-and-retraining-notification-warn-notices'
    response = requests.get(url)
    soup = BeautifulSoup(response.text, 'html.parser')
    
    notices = []
    for row in soup.select('table tr')[1:]:  # Skip header
        cells = row.select('td')
        company = cells[0].text.strip()
        
        # Check if this is a data center operator
        if any(op.lower() in company.lower() for op in DATA_CENTER_OPERATORS):
            notices.append({
                'company': company,
                'location': cells[1].text.strip(),
                'employees': cells[2].text.strip(),
                'date': cells[3].text.strip()
            })
    
    return pd.DataFrame(notices)

# Run daily check
alerts = scrape_texas_warn()
if not alerts.empty:
    print(f"⚠️ ALERT: {len(alerts)} data center WARN notices found!")
`
  },
  {
    id: 'peeringdb-facility-tracker',
    name: 'PeeringDB Facility Presence Tracker',
    targetSource: 'peeringdb',
    language: 'typescript',
    description: 'Track network presence at subsidized data center locations',
    dependencies: ['node-fetch'],
    schedule: 'weekly',
    codeSnippet: `
interface PeeringDBFacility {
  id: number;
  name: string;
  city: string;
  state: string;
  net_count: number;
  ix_count: number;
}

async function getFacilitiesInState(state: string): Promise<PeeringDBFacility[]> {
  const response = await fetch(
    \`https://peeringdb.com/api/fac?state=\${state}&status=ok\`
  );
  const data = await response.json();
  return data.data;
}

async function trackNetworkPresence(facilityId: number) {
  const response = await fetch(
    \`https://peeringdb.com/api/netfac?fac_id=\${facilityId}\`
  );
  const data = await response.json();
  
  return {
    facilityId,
    networkCount: data.data.length,
    networks: data.data.map(n => ({
      name: n.name,
      asn: n.asn,
      speed: n.speed
    }))
  };
}

// Track facilities in Virginia (data center hub)
const vaFacilities = await getFacilitiesInState('VA');
console.log(\`Found \${vaFacilities.length} facilities in Virginia\`);
`
  },
  {
    id: 'property-tax-monitor',
    name: 'County Property Tax Abatement Monitor',
    targetSource: 'county-assessor',
    language: 'python',
    description: 'Monitor property tax records for abatement compliance',
    dependencies: ['selenium', 'pandas'],
    schedule: 'monthly',
    codeSnippet: `
from selenium import webdriver
from selenium.webdriver.common.by import By
import pandas as pd

def get_property_assessment(parcel_id: str, county_url: str):
    """Fetch property assessment data from county assessor site."""
    driver = webdriver.Chrome()
    driver.get(county_url)
    
    # Search for parcel (site-specific selectors needed)
    search_box = driver.find_element(By.ID, 'parcel-search')
    search_box.send_keys(parcel_id)
    search_box.submit()
    
    # Extract assessment data
    assessed_value = driver.find_element(By.CLASS_NAME, 'assessed-value').text
    taxable_value = driver.find_element(By.CLASS_NAME, 'taxable-value').text
    exemptions = driver.find_element(By.CLASS_NAME, 'exemptions').text
    
    driver.quit()
    
    return {
        'parcel_id': parcel_id,
        'assessed_value': assessed_value,
        'taxable_value': taxable_value,
        'exemptions': exemptions,
        'abatement_amount': float(assessed_value) - float(taxable_value)
    }

# Example: Track Google data center property in Council Bluffs, IA
# property = get_property_assessment('760804351002', 'https://beacon.schneidercorp.com')
`
  }
];

// ============================================================================
// MUNICIPAL INTEGRATION GUIDE
// ============================================================================

export interface IntegrationGuide {
  category: string;
  title: string;
  description: string;
  dataSources: string[];
  implementationSteps: string[];
  expectedOutcome: string;
  timeToImplement: string;
  costEstimate: string;
}

export const MUNICIPAL_INTEGRATION_GUIDES: IntegrationGuide[] = [
  {
    category: 'Job Creation Monitoring',
    title: 'Verify Job Creation Claims in Real-Time',
    description: 'Cross-reference subsidy job commitments against multiple employment data sources',
    dataSources: ['bls-qcew', 'state-workforce', 'warn-notices', 'linkedin-job-posts'],
    implementationSteps: [
      '1. Register for BLS API key (free)',
      '2. Set up quarterly QCEW data pull for your county',
      '3. Configure WARN notice scraper for your state',
      '4. Create dashboard comparing promised vs actual jobs',
      '5. Set alerts for >20% variance from commitments'
    ],
    expectedOutcome: 'Identify job creation shortfalls 6-12 months before compliance deadlines',
    timeToImplement: '2-4 weeks',
    costEstimate: '$0-5,000 (staff time only)'
  },
  {
    category: 'Investment Verification',
    title: 'Track Capital Investment Commitments',
    description: 'Monitor building permits, property records, and utility filings to verify investment',
    dataSources: ['building-permits', 'county-assessor', 'utility-rate-cases', 'eia-860'],
    implementationSteps: [
      '1. Export your building permit database to CSV',
      '2. Filter for data center-related permits (electrical >1MW, cooling)',
      '3. Cross-reference with property assessment increases',
      '4. Compare permit values against investment commitments',
      '5. Monitor utility filings for load additions'
    ],
    expectedOutcome: 'Verify investment claims through independent public records',
    timeToImplement: '4-6 weeks',
    costEstimate: '$0-10,000'
  },
  {
    category: 'Early Warning System',
    title: 'Detect Compliance Risks Before Violations',
    description: 'Combine multiple signals to identify facilities at risk of subsidy violations',
    dataSources: ['sec-edgar', 'opencorporates', 'warn-notices', 'peeringdb', 'certificate-transparency'],
    implementationSteps: [
      '1. Set up SEC filing monitor for subsidy-related keywords',
      '2. Track corporate restructuring via OpenCorporates',
      '3. Monitor WARN notices for your subsidized employers',
      '4. Track network infrastructure changes via PeeringDB',
      '5. Create weighted risk score from all signals'
    ],
    expectedOutcome: 'Receive early warnings 12-24 months before potential violations',
    timeToImplement: '6-8 weeks',
    costEstimate: '$5,000-20,000'
  },
  {
    category: 'Clawback Preparation',
    title: 'Document Violations for Clawback Enforcement',
    description: 'Build evidence packages for subsidy clawback proceedings',
    dataSources: ['bls-qcew', 'county-assessor', 'sec-edgar', 'state-sos'],
    implementationSteps: [
      '1. Establish baseline metrics at subsidy award date',
      '2. Create quarterly snapshot reports of all metrics',
      '3. Document any deviations with timestamped evidence',
      '4. Cross-reference company statements with public data',
      '5. Prepare summary report comparing commitments vs actuals'
    ],
    expectedOutcome: 'Court-ready documentation for clawback enforcement',
    timeToImplement: 'Ongoing',
    costEstimate: '$10,000-50,000 (legal review)'
  }
];

// Export helper functions
export function getSourcesByCategory(category: DataSource['category']): DataSource[] {
  return REGULATORY_DATA_SOURCES.filter(s => s.category === category);
}

export function getHighRelevanceSources(): DataSource[] {
  return REGULATORY_DATA_SOURCES.filter(s => s.subsidyRelevance === 'high');
}

export function getFreeSources(): DataSource[] {
  return REGULATORY_DATA_SOURCES.filter(s => s.estimatedCost === 'free');
}

export function getApiSources(): DataSource[] {
  return REGULATORY_DATA_SOURCES.filter(s => s.type === 'api');
}

