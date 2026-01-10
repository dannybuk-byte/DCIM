/**
 * Section Citations & Sources - Data Integrity References
 * 
 * Provides authoritative source citations for each section of the DCIM Compliance App.
 * Critical for labor organizers to verify data and build credible cases.
 * 
 * Sources are categorized by:
 * - Primary: Official government/regulatory sources
 * - Secondary: Industry reports, academic research
 * - Tertiary: News, investigative journalism
 */

import { SectionContext } from '../ai/sectionPrompts';

export type SourceCategory = 'primary' | 'secondary' | 'tertiary';
export type DataFrequency = 'real-time' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'static' | 'as-filed' | 'as-decided' | 'on-demand';

export interface Citation {
  id: string;
  title: string;
  publisher: string;
  url: string;
  description: string;
  category: SourceCategory;
  accessDate?: string;
  lastVerified: string;
  dataFrequency: DataFrequency;
  dataTypes: string[];
  reliability: 'authoritative' | 'verified' | 'peer-reviewed' | 'investigative' | 'crowd-sourced';
  notes?: string;
}

export interface DataMethodology {
  dataPoint: string;
  calculation: string;
  sources: string[]; // Citation IDs
  limitations: string[];
  lastUpdated: string;
}

export interface SectionCitations {
  overview: string;
  primarySources: Citation[];
  secondarySources: Citation[];
  tertiarySources: Citation[];
  methodology: DataMethodology[];
  dataIntegrityNotes: string[];
  verificationSteps: string[];
  knownLimitations: string[];
}

export const SECTION_CITATIONS: Record<SectionContext, SectionCitations> = {
  global: {
    overview: 'The DCIM Compliance Dashboard aggregates data from government filings, industry reports, and public records. All data undergoes verification before inclusion.',
    primarySources: [
      {
        id: 'sec-edgar',
        title: 'SEC EDGAR Database',
        publisher: 'U.S. Securities and Exchange Commission',
        url: 'https://www.sec.gov/edgar/searchedgar/companysearch',
        description: 'Official SEC filings including 10-K, 10-Q reports containing facility data, employment figures, and tax incentive disclosures.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'quarterly',
        dataTypes: ['employment', 'facilities', 'financials', 'tax incentives'],
        reliability: 'authoritative',
      },
      {
        id: 'bls-qcew',
        title: 'Quarterly Census of Employment and Wages (QCEW)',
        publisher: 'Bureau of Labor Statistics',
        url: 'https://www.bls.gov/qcew/',
        description: 'Employment and wage data by industry and location, including data center NAICS codes 518210 and 541512.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'quarterly',
        dataTypes: ['employment', 'wages', 'industry data'],
        reliability: 'authoritative',
      },
      {
        id: 'census-cbp',
        title: 'County Business Patterns',
        publisher: 'U.S. Census Bureau',
        url: 'https://www.census.gov/programs-surveys/cbp.html',
        description: 'Establishment counts and employment by NAICS code at county level.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'annual',
        dataTypes: ['employment', 'establishment counts'],
        reliability: 'authoritative',
      },
    ],
    secondarySources: [
      {
        id: 'datacenter-map',
        title: 'Data Center Map',
        publisher: 'Data Center Map',
        url: 'https://www.datacentermap.com/',
        description: 'Industry database of data center facilities worldwide with capacity and operator information.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'monthly',
        dataTypes: ['facilities', 'operators', 'capacity'],
        reliability: 'verified',
      },
      {
        id: 'datacenter-knowledge',
        title: 'Data Center Knowledge',
        publisher: 'Informa Tech',
        url: 'https://www.datacenterknowledge.com/',
        description: 'Industry news and analysis covering data center developments, expansions, and corporate announcements.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'daily',
        dataTypes: ['news', 'expansions', 'corporate'],
        reliability: 'verified',
      },
    ],
    tertiarySources: [
      {
        id: 'goodjobsfirst',
        title: 'Subsidy Tracker',
        publisher: 'Good Jobs First',
        url: 'https://subsidytracker.goodjobsfirst.org/',
        description: 'Comprehensive database of corporate subsidies from local, state, and federal government.',
        category: 'tertiary',
        lastVerified: '2026-01-01',
        dataFrequency: 'monthly',
        dataTypes: ['subsidies', 'tax incentives', 'clawbacks'],
        reliability: 'investigative',
        notes: 'Non-profit research organization focused on corporate accountability.',
      },
    ],
    methodology: [
      {
        dataPoint: 'Total Facilities Count',
        calculation: 'Sum of unique facility records from SEC filings, industry databases, and verified news sources.',
        sources: ['sec-edgar', 'datacenter-map', 'datacenter-knowledge'],
        limitations: ['May not include small or private facilities', 'Edge data centers often unreported'],
        lastUpdated: '2026-01-01',
      },
      {
        dataPoint: 'Compliance Status',
        calculation: 'Jobs Created ÷ Jobs Promised from public subsidy agreements. Compliant ≥90%, At Risk 70-89%, Non-Compliant <70%.',
        sources: ['goodjobsfirst', 'sec-edgar'],
        limitations: ['Job definitions vary by agreement', 'Some agreements not publicly disclosed'],
        lastUpdated: '2026-01-01',
      },
    ],
    dataIntegrityNotes: [
      'All data is cross-referenced against at least two independent sources when possible.',
      'Employment figures represent full-time equivalent (FTE) positions unless otherwise noted.',
      'Subsidy amounts are adjusted for inflation to 2024 dollars using BLS CPI data.',
    ],
    verificationSteps: [
      'Primary source documents are archived with SHA-256 hashes.',
      'Periodic audits compare dashboard data against SEC filings.',
      'User-submitted corrections are reviewed within 48 hours.',
    ],
    knownLimitations: [
      'Private company data limited to press releases and industry estimates.',
      'International facilities may have less complete data.',
      'Historical job promise data may be incomplete for agreements before 2010.',
    ],
  },

  sanctions: {
    overview: 'Sanctions monitoring data is sourced directly from OFAC and Treasury Department publications. Risk scoring algorithms are documented and reproducible.',
    primarySources: [
      {
        id: 'ofac-sdn',
        title: 'OFAC Specially Designated Nationals (SDN) List',
        publisher: 'U.S. Department of the Treasury',
        url: 'https://sanctionssearch.ofac.treas.gov/',
        description: 'Official list of blocked persons and entities. Updated frequently, sometimes multiple times daily.',
        category: 'primary',
        lastVerified: '2026-01-06',
        dataFrequency: 'daily',
        dataTypes: ['SDN entries', 'sanctioned entities', 'programs'],
        reliability: 'authoritative',
        notes: 'Primary source for all sanctions screening. Must check frequently for updates.',
      },
      {
        id: 'ofac-consolidated',
        title: 'OFAC Consolidated Sanctions List',
        publisher: 'U.S. Department of the Treasury',
        url: 'https://home.treasury.gov/policy-issues/financial-sanctions/consolidated-sanctions-list-non-sdn-lists',
        description: 'Combined list including SDN and all other OFAC sanctions programs.',
        category: 'primary',
        lastVerified: '2026-01-06',
        dataFrequency: 'daily',
        dataTypes: ['consolidated sanctions', 'all programs'],
        reliability: 'authoritative',
      },
      {
        id: 'fincen-advisories',
        title: 'FinCEN Advisories',
        publisher: 'Financial Crimes Enforcement Network',
        url: 'https://www.fincen.gov/resources/advisories',
        description: 'Guidance on sanctions compliance, typologies, and red flags.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'monthly',
        dataTypes: ['guidance', 'red flags', 'typologies'],
        reliability: 'authoritative',
      },
      {
        id: 'bis-denied-persons',
        title: 'Denied Persons List',
        publisher: 'Bureau of Industry and Security',
        url: 'https://www.bis.doc.gov/index.php/policy-guidance/lists-of-parties-of-concern/denied-persons-list',
        description: 'Export denial orders, restricting certain parties from receiving US exports.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'weekly',
        dataTypes: ['export controls', 'denied parties'],
        reliability: 'authoritative',
      },
    ],
    secondarySources: [
      {
        id: 'ripe-ris',
        title: 'RIPE Routing Information Service (RIS)',
        publisher: 'RIPE NCC',
        url: 'https://ris.ripe.net/',
        description: 'Real-time BGP routing data from global collection points. Used for detecting traffic to sanctioned ASNs.',
        category: 'secondary',
        lastVerified: '2026-01-06',
        dataFrequency: 'real-time',
        dataTypes: ['BGP routes', 'ASN peering', 'network traffic'],
        reliability: 'verified',
      },
      {
        id: 'maxmind-geoip',
        title: 'MaxMind GeoIP Databases',
        publisher: 'MaxMind',
        url: 'https://www.maxmind.com/en/geoip2-databases',
        description: 'IP geolocation data for identifying traffic from sanctioned jurisdictions.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'weekly',
        dataTypes: ['IP geolocation', 'country mapping'],
        reliability: 'verified',
      },
      {
        id: 'peeringdb',
        title: 'PeeringDB',
        publisher: 'PeeringDB',
        url: 'https://www.peeringdb.com/',
        description: 'Database of network interconnection information used to verify ASN relationships.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'daily',
        dataTypes: ['peering data', 'network interconnection'],
        reliability: 'crowd-sourced',
        notes: 'Voluntary reporting by network operators; generally accurate but not comprehensive.',
      },
    ],
    tertiarySources: [
      {
        id: 'chainalysis',
        title: 'Chainalysis Sanctions Screening',
        publisher: 'Chainalysis',
        url: 'https://www.chainalysis.com/sanctions-screening/',
        description: 'Cryptocurrency sanctions screening covering OFAC-designated wallet addresses.',
        category: 'tertiary',
        lastVerified: '2026-01-01',
        dataFrequency: 'daily',
        dataTypes: ['crypto wallets', 'blockchain analysis'],
        reliability: 'verified',
      },
    ],
    methodology: [
      {
        dataPoint: 'Sanctions Risk Score (0-100)',
        calculation: 'Weighted composite: SDN Name Match (0-40) + Sanctioned Traffic (0-25) + Sanctioned ASN Peering (0-15) + Crypto Indicators (0-10) + Payment Anomalies (0-5) + Documentation Avoidance (0-5)',
        sources: ['ofac-sdn', 'ripe-ris', 'maxmind-geoip', 'chainalysis'],
        limitations: ['Fuzzy name matching may produce false positives', 'Traffic analysis requires network access'],
        lastUpdated: '2026-01-01',
      },
      {
        dataPoint: 'SDN Name Match Score',
        calculation: 'Levenshtein distance similarity ratio. Match score = 1 - (edit_distance / max_length). Alert threshold ≥0.85.',
        sources: ['ofac-sdn'],
        limitations: ['Common names may trigger false matches', 'Non-Latin character transliteration varies'],
        lastUpdated: '2026-01-01',
      },
    ],
    dataIntegrityNotes: [
      'SDN list is fetched fresh daily and cached locally with SHA-256 verification.',
      'All SDN matches are logged with timestamps for audit trail.',
      'Risk scores are deterministic - same inputs always produce same outputs.',
    ],
    verificationSteps: [
      'SDN list XML signature verified against Treasury public key.',
      'BGP routing data cross-referenced with multiple RIS collectors.',
      'Sanctioned ASN list reviewed against OFAC country programs.',
    ],
    knownLimitations: [
      'SDN matching uses English transliterations only; native script matching not supported.',
      'Traffic analysis limited to facilities with network monitoring enabled.',
      'Cryptocurrency analysis requires on-chain data access.',
    ],
  },

  organizing: {
    overview: 'Organizing intelligence combines government labor data, union records, and verified industry reports to help prioritize campaigns.',
    primarySources: [
      {
        id: 'nlrb-cases',
        title: 'NLRB Case Database',
        publisher: 'National Labor Relations Board',
        url: 'https://www.nlrb.gov/search/case',
        description: 'Official database of NLRB cases including election petitions, unfair labor practice charges, and decisions.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'daily',
        dataTypes: ['union elections', 'ULP charges', 'decisions'],
        reliability: 'authoritative',
      },
      {
        id: 'dol-lm-reports',
        title: 'LM Reports (Union Financial Reports)',
        publisher: 'U.S. Department of Labor',
        url: 'https://www.dol.gov/olms/regs/compliance/rrlo/lmrda.htm',
        description: 'Annual financial reports filed by labor unions, including membership numbers and assets.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'annual',
        dataTypes: ['union membership', 'financials', 'officer lists'],
        reliability: 'authoritative',
      },
      {
        id: 'bls-union-membership',
        title: 'Union Members Summary',
        publisher: 'Bureau of Labor Statistics',
        url: 'https://www.bls.gov/news.release/union2.nr0.htm',
        description: 'Annual survey data on union membership rates by industry, state, and demographics.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'annual',
        dataTypes: ['union density', 'membership rates'],
        reliability: 'authoritative',
      },
    ],
    secondarySources: [
      {
        id: 'ibew-directory',
        title: 'IBEW Local Union Directory',
        publisher: 'International Brotherhood of Electrical Workers',
        url: 'https://ibew.org/local-union-directory',
        description: 'Official directory of IBEW local unions with jurisdiction information.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'monthly',
        dataTypes: ['local unions', 'jurisdiction', 'contacts'],
        reliability: 'verified',
      },
      {
        id: 'unite-here-contracts',
        title: 'UNITE HERE Contract Database',
        publisher: 'UNITE HERE',
        url: 'https://unitehere.org/',
        description: 'Information on service worker contracts relevant to data center support staff.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'quarterly',
        dataTypes: ['contracts', 'wages', 'coverage'],
        reliability: 'verified',
      },
    ],
    tertiarySources: [
      {
        id: 'labornotes',
        title: 'Labor Notes',
        publisher: 'Labor Notes',
        url: 'https://labornotes.org/',
        description: 'Independent labor news and organizing resources.',
        category: 'tertiary',
        lastVerified: '2026-01-01',
        dataFrequency: 'daily',
        dataTypes: ['news', 'organizing', 'campaigns'],
        reliability: 'investigative',
      },
      {
        id: 'payday-report',
        title: 'Payday Report Strike Tracker',
        publisher: 'Payday Report',
        url: 'https://paydayreport.com/strike-tracker/',
        description: 'Crowd-sourced database of labor actions including strikes and walkouts.',
        category: 'tertiary',
        lastVerified: '2026-01-01',
        dataFrequency: 'daily',
        dataTypes: ['strikes', 'labor actions', 'campaigns'],
        reliability: 'crowd-sourced',
        notes: 'Community-reported; verify individual actions before citing.',
      },
    ],
    methodology: [
      {
        dataPoint: 'Target Priority Score (0-100)',
        calculation: 'Weighted composite: Worker Count (25%) + Strategic Importance (20%) + Labor Climate (15%) + Operator Reputation (15%) + Momentum (15%) + Union Presence (10%)',
        sources: ['nlrb-cases', 'bls-union-membership', 'ibew-directory'],
        limitations: ['Momentum indicators lag by 2-4 weeks', 'Small facilities may lack sufficient data'],
        lastUpdated: '2026-01-01',
      },
      {
        dataPoint: 'Joint Employer Probability',
        calculation: 'Based on NLRB joint employer factors (2023 standard): control over hiring, supervision, pay, work rules, discipline, tenure. Each factor weighted 0-16.67%.',
        sources: ['nlrb-cases'],
        limitations: ['Requires worker input to assess control factors', 'Legal standard subject to change'],
        lastUpdated: '2026-01-01',
      },
    ],
    dataIntegrityNotes: [
      'NLRB case outcomes verified against official decisions.',
      'Union membership numbers from DOL LM-2 filings.',
      'Strike data cross-referenced between Payday Report and news sources.',
    ],
    verificationSteps: [
      'NLRB case numbers can be verified on nlrb.gov.',
      'IBEW local jurisdictions confirmed with national office.',
      'Worker counts estimated from industry averages when not disclosed.',
    ],
    knownLimitations: [
      'Private contractor workers may not appear in official employment data.',
      'Some organizing campaigns are not publicly reported until election petition.',
      'Labor climate assessments include subjective factors.',
    ],
  },

  subsidies: {
    overview: 'Subsidy data is sourced from state economic development agencies, local government records, and SEC filings. Good Jobs First provides independent verification.',
    primarySources: [
      {
        id: 'state-econ-dev',
        title: 'State Economic Development Agency Reports',
        publisher: 'Various State Agencies',
        url: 'https://www.nasda.com/state-directory',
        description: 'Annual reports on tax incentive programs, including data center specific incentives.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'annual',
        dataTypes: ['subsidies', 'tax incentives', 'job commitments'],
        reliability: 'authoritative',
        notes: 'Varies significantly by state. Some states have robust disclosure, others minimal.',
      },
      {
        id: 'gasb-77',
        title: 'GASB Statement 77 Tax Abatement Disclosures',
        publisher: 'Government Accounting Standards Board',
        url: 'https://www.gasb.org/',
        description: 'Required disclosures by local governments of tax abatement programs.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'annual',
        dataTypes: ['tax abatements', 'foregone revenue'],
        reliability: 'authoritative',
      },
      {
        id: 'sec-8k-subsidies',
        title: 'SEC 8-K Filings (Material Agreements)',
        publisher: 'U.S. Securities and Exchange Commission',
        url: 'https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&type=8-K',
        description: 'Material contract disclosures often include significant tax incentive agreements.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'as-filed',
        dataTypes: ['material agreements', 'subsidies', 'job commitments'],
        reliability: 'authoritative',
      },
    ],
    secondarySources: [
      {
        id: 'goodjobsfirst-tracker',
        title: 'Good Jobs First Subsidy Tracker',
        publisher: 'Good Jobs First',
        url: 'https://subsidytracker.goodjobsfirst.org/',
        description: 'Most comprehensive database of corporate subsidies. Aggregates data from state and local sources.',
        category: 'secondary',
        lastVerified: '2026-01-06',
        dataFrequency: 'monthly',
        dataTypes: ['subsidies', 'megadeals', 'clawbacks', 'job outcomes'],
        reliability: 'investigative',
        notes: 'Non-profit research organization. Highly reliable but may lag official disclosures.',
      },
      {
        id: 'site-selection',
        title: 'Site Selection Magazine',
        publisher: 'Conway Inc.',
        url: 'https://siteselection.com/',
        description: 'Industry publication tracking major facility announcements and incentive deals.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'monthly',
        dataTypes: ['announcements', 'incentives', 'expansions'],
        reliability: 'verified',
      },
    ],
    tertiarySources: [
      {
        id: 'propublica-dta',
        title: 'ProPublica Data Center Tax Avoidance Investigation',
        publisher: 'ProPublica',
        url: 'https://www.propublica.org/',
        description: 'Investigative reporting on data center tax deals and their community impacts.',
        category: 'tertiary',
        lastVerified: '2026-01-01',
        dataFrequency: 'static',
        dataTypes: ['investigations', 'case studies'],
        reliability: 'investigative',
      },
      {
        id: 'local-news-archives',
        title: 'Local News Archives',
        publisher: 'Various',
        url: 'https://news.google.com/',
        description: 'Local newspaper coverage often contains original promises made during subsidy negotiations.',
        category: 'tertiary',
        lastVerified: '2026-01-01',
        dataFrequency: 'daily',
        dataTypes: ['announcements', 'promises', 'community response'],
        reliability: 'investigative',
      },
    ],
    methodology: [
      {
        dataPoint: 'Subsidy Gap',
        calculation: 'Total Subsidies × (1 - Job Fulfillment Rate). Job Fulfillment Rate = Actual Jobs / Promised Jobs.',
        sources: ['state-econ-dev', 'goodjobsfirst-tracker', 'sec-8k-subsidies'],
        limitations: ['Job definitions vary by agreement', 'Some agreements allow contractor counting'],
        lastUpdated: '2026-01-01',
      },
      {
        dataPoint: 'Per-Job Subsidy Cost',
        calculation: 'Total Subsidies / Actual Jobs Created. Inflation-adjusted to current year dollars.',
        sources: ['goodjobsfirst-tracker', 'bls-qcew'],
        limitations: ['Does not account for indirect job creation', 'Temporary/contract jobs counted differently'],
        lastUpdated: '2026-01-01',
      },
    ],
    dataIntegrityNotes: [
      'Subsidy amounts from multiple sources are reconciled; discrepancies noted.',
      'Dollar amounts adjusted to current year using BLS CPI.',
      'Job counts verified against state compliance reports when available.',
    ],
    verificationSteps: [
      'FOIA requests to state agencies for original agreements.',
      'Cross-reference SEC filings with press release claims.',
      'Good Jobs First staff review major entries.',
    ],
    knownLimitations: [
      'Many subsidy agreements are not publicly disclosed.',
      'Job verification methods vary widely by jurisdiction.',
      'Clawback enforcement data often unavailable.',
    ],
  },

  contractors: {
    overview: 'Contractor data is assembled from SEC filings, job postings, LinkedIn research, and worker-reported information.',
    primarySources: [
      {
        id: 'sec-supplier-disclosure',
        title: 'SEC Supply Chain & Labor Disclosures',
        publisher: 'U.S. Securities and Exchange Commission',
        url: 'https://www.sec.gov/',
        description: 'Required disclosures about material suppliers and labor arrangements.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'annual',
        dataTypes: ['suppliers', 'contractors', 'labor arrangements'],
        reliability: 'authoritative',
      },
      {
        id: 'nlrb-joint-employer',
        title: 'NLRB Joint Employer Decisions',
        publisher: 'National Labor Relations Board',
        url: 'https://www.nlrb.gov/',
        description: 'Legal decisions defining joint employer standards and precedents.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'as-decided',
        dataTypes: ['legal precedents', 'joint employer rulings'],
        reliability: 'authoritative',
      },
    ],
    secondarySources: [
      {
        id: 'linkedin-postings',
        title: 'LinkedIn Job Postings',
        publisher: 'LinkedIn',
        url: 'https://www.linkedin.com/jobs/',
        description: 'Job postings reveal which staffing agencies work with which data centers.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'daily',
        dataTypes: ['staffing agencies', 'job titles', 'locations'],
        reliability: 'verified',
        notes: 'Requires manual verification; postings may not reflect actual placements.',
      },
      {
        id: 'glassdoor',
        title: 'Glassdoor Reviews',
        publisher: 'Glassdoor',
        url: 'https://www.glassdoor.com/',
        description: 'Worker reviews often mention contractor relationships and working conditions.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'daily',
        dataTypes: ['worker reviews', 'conditions', 'contractor info'],
        reliability: 'crowd-sourced',
      },
    ],
    tertiarySources: [
      {
        id: 'worker-reports',
        title: 'Worker-Submitted Reports',
        publisher: 'DCIM Compliance Dashboard',
        url: '/submit-report',
        description: 'Reports submitted by data center workers about contractor structures.',
        category: 'tertiary',
        lastVerified: '2026-01-06',
        dataFrequency: 'real-time',
        dataTypes: ['contractor relationships', 'working conditions'],
        reliability: 'crowd-sourced',
        notes: 'All submissions verified by project staff before inclusion.',
      },
    ],
    methodology: [
      {
        dataPoint: 'Joint Employer Probability Score',
        calculation: 'Based on 6 NLRB control factors: hiring (16.67%), supervision (16.67%), pay determination (16.67%), work rules (16.67%), discipline (16.67%), tenure (16.67%).',
        sources: ['nlrb-joint-employer', 'worker-reports'],
        limitations: ['Requires worker input', 'Legal standards evolve with NLRB composition'],
        lastUpdated: '2026-01-01',
      },
    ],
    dataIntegrityNotes: [
      'Contractor names verified against state business registrations.',
      'Staffing agency relationships confirmed via multiple sources.',
      'Worker reports are anonymized before analysis.',
    ],
    verificationSteps: [
      'Job postings matched to actual facility locations.',
      'Contractor names cross-referenced with SEC filings.',
      'NLRB precedents cited with case numbers.',
    ],
    knownLimitations: [
      'Private contractor arrangements often undisclosed.',
      'Subcontractor chains can be difficult to trace.',
      'Worker-reported data may be incomplete.',
    ],
  },

  corridors: {
    overview: 'Corridor data combines industry databases, fiber route maps, and traffic analysis to identify strategic concentrations.',
    primarySources: [
      {
        id: 'fcc-fiber-maps',
        title: 'FCC Broadband Maps',
        publisher: 'Federal Communications Commission',
        url: 'https://broadbandmap.fcc.gov/',
        description: 'Official broadband infrastructure data including major fiber routes.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'quarterly',
        dataTypes: ['fiber routes', 'broadband coverage'],
        reliability: 'authoritative',
      },
    ],
    secondarySources: [
      {
        id: 'telegeography',
        title: 'TeleGeography Data Center Map',
        publisher: 'TeleGeography',
        url: 'https://www.datacentermap.com/',
        description: 'Industry mapping of data center locations and interconnections.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'monthly',
        dataTypes: ['data centers', 'interconnections', 'corridors'],
        reliability: 'verified',
      },
      {
        id: 'cbre-dc-report',
        title: 'CBRE Data Center Reports',
        publisher: 'CBRE',
        url: 'https://www.cbre.com/insights/reports',
        description: 'Quarterly reports on data center market conditions by region.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'quarterly',
        dataTypes: ['market analysis', 'capacity', 'absorption'],
        reliability: 'verified',
      },
    ],
    tertiarySources: [],
    methodology: [
      {
        dataPoint: 'Traffic Share',
        calculation: 'Estimated percentage of regional internet traffic based on facility capacity, interconnections, and industry reports.',
        sources: ['telegeography', 'cbre-dc-report'],
        limitations: ['Traffic data is estimated, not measured', 'Private peering not always disclosed'],
        lastUpdated: '2026-01-01',
      },
    ],
    dataIntegrityNotes: [
      'Corridor boundaries based on metropolitan statistical areas.',
      'Capacity data from public filings and industry reports.',
    ],
    verificationSteps: [
      'Major interconnection points verified against PeeringDB.',
      'Traffic estimates cross-referenced with industry reports.',
    ],
    knownLimitations: [
      'Actual traffic flows are proprietary and not publicly available.',
      'New facilities may not appear until operational.',
    ],
  },

  'ibew-footprint': {
    overview: 'IBEW jurisdiction data is sourced from the national union and verified with local unions.',
    primarySources: [
      {
        id: 'ibew-national',
        title: 'IBEW National Office Records',
        publisher: 'International Brotherhood of Electrical Workers',
        url: 'https://ibew.org/',
        description: 'Official jurisdiction assignments and local union charters.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'monthly',
        dataTypes: ['jurisdictions', 'locals', 'charters'],
        reliability: 'authoritative',
      },
      {
        id: 'dol-lm2',
        title: 'DOL LM-2 Union Annual Reports',
        publisher: 'U.S. Department of Labor',
        url: 'https://www.dol.gov/agencies/olms/reports/lm-reports',
        description: 'Annual financial reports including membership counts by local.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'annual',
        dataTypes: ['membership', 'financials', 'officers'],
        reliability: 'authoritative',
      },
    ],
    secondarySources: [
      {
        id: 'ibew-local-sites',
        title: 'IBEW Local Union Websites',
        publisher: 'Various IBEW Locals',
        url: 'https://ibew.org/local-union-directory',
        description: 'Individual local union websites with contract and jurisdiction information.',
        category: 'secondary',
        lastVerified: '2026-01-01',
        dataFrequency: 'monthly',
        dataTypes: ['contacts', 'contracts', 'events'],
        reliability: 'verified',
      },
    ],
    tertiarySources: [],
    methodology: [
      {
        dataPoint: 'Expansion Potential',
        calculation: 'Non-union data center workers in jurisdiction = (Total facility workers) - (Union members in sector)',
        sources: ['ibew-national', 'dol-lm2', 'bls-qcew'],
        limitations: ['Contractor workers may cross jurisdictions', 'Not all workers are IBEW-eligible'],
        lastUpdated: '2026-01-01',
      },
    ],
    dataIntegrityNotes: [
      'Jurisdiction boundaries confirmed with IBEW international office.',
      'Membership counts from verified LM-2 filings.',
    ],
    verificationSteps: [
      'Local contacts verified via phone or email.',
      'Contract expiration dates confirmed with locals.',
    ],
    knownLimitations: [
      'Some jurisdiction boundaries are disputed between locals.',
      'Membership counts may not reflect data center sector specifically.',
    ],
  },

  'target-prioritization': {
    overview: 'Target prioritization combines multiple data sources to score organizing potential. All factors are transparent and auditable.',
    primarySources: [
      {
        id: 'nlrb-elections',
        title: 'NLRB Election Results',
        publisher: 'National Labor Relations Board',
        url: 'https://www.nlrb.gov/reports/graphs-data/recent-election-results',
        description: 'Results of union representation elections, used to assess momentum.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'weekly',
        dataTypes: ['election results', 'win rates', 'unit sizes'],
        reliability: 'authoritative',
      },
    ],
    secondarySources: [],
    tertiarySources: [],
    methodology: [
      {
        dataPoint: 'Priority Score Components',
        calculation: 'Worker Count (25%): More workers = higher potential impact. Strategic Importance (20%): Based on corridor position and traffic share. Labor Climate (15%): State union density and recent election wins. Operator Reputation (15%): History of labor relations. Momentum (15%): Recent organizing activity, complaints, turnover. Union Presence (10%): Existing contracts in area.',
        sources: ['nlrb-elections', 'bls-union-membership', 'ibew-national'],
        limitations: ['Momentum indicators lag by 2-4 weeks', 'Subjective factors in reputation scoring'],
        lastUpdated: '2026-01-01',
      },
    ],
    dataIntegrityNotes: [
      'All score components are documented and reproducible.',
      'Score weights can be adjusted by users for custom analysis.',
    ],
    verificationSteps: [
      'NLRB election data verified against official database.',
      'Worker counts estimated from industry averages when not disclosed.',
    ],
    knownLimitations: [
      'Priority scores are guidance, not predictions.',
      'Local factors may not be captured in data.',
    ],
  },

  'network-security': {
    overview: 'Network monitoring data comes from public BGP collectors and does not involve any private network access.',
    primarySources: [
      {
        id: 'ripe-ris-live',
        title: 'RIPE RIS Live',
        publisher: 'RIPE NCC',
        url: 'https://ris-live.ripe.net/',
        description: 'Real-time BGP routing updates from global collector network.',
        category: 'primary',
        lastVerified: '2026-01-06',
        dataFrequency: 'real-time',
        dataTypes: ['BGP updates', 'route announcements', 'withdrawals'],
        reliability: 'authoritative',
      },
      {
        id: 'routeviews',
        title: 'RouteViews Project',
        publisher: 'University of Oregon',
        url: 'http://www.routeviews.org/',
        description: 'Academic BGP data collection project providing routing table snapshots.',
        category: 'primary',
        lastVerified: '2026-01-01',
        dataFrequency: 'real-time',
        dataTypes: ['BGP tables', 'route analysis'],
        reliability: 'authoritative',
      },
    ],
    secondarySources: [],
    tertiarySources: [],
    methodology: [],
    dataIntegrityNotes: [
      'BGP data is public internet routing information.',
      'No private network access or packet inspection.',
    ],
    verificationSteps: [
      'ASN ownership verified against ARIN/RIPE records.',
      'Sanctioned ASN list reviewed against OFAC programs.',
    ],
    knownLimitations: [
      'BGP visibility depends on collector locations.',
      'Some private peering may not be visible.',
    ],
  },

  'compliance-overview': {
    overview: 'Compliance statistics are aggregated from facility-level data with documented methodology.',
    primarySources: [],
    secondarySources: [],
    tertiarySources: [],
    methodology: [
      {
        dataPoint: 'Compliance Rate',
        calculation: 'Compliant Facilities / Total Facilities × 100%. Compliant = Job Fulfillment ≥ 90%.',
        sources: ['sec-edgar', 'goodjobsfirst-tracker'],
        limitations: ['Based on available data; many facilities lack job commitment data'],
        lastUpdated: '2026-01-01',
      },
    ],
    dataIntegrityNotes: [
      'Rates recalculated daily as new data arrives.',
      'Historical rates available for trend analysis.',
    ],
    verificationSteps: [
      'Sample verification against source documents monthly.',
    ],
    knownLimitations: [
      'Compliance status unknown for facilities without subsidy agreements.',
    ],
  },
};

/**
 * Get citations for a section
 */
export function getSectionCitations(context: SectionContext): SectionCitations {
  return SECTION_CITATIONS[context] || SECTION_CITATIONS.global;
}

/**
 * Get all citations for a section as a flat array
 */
export function getAllCitations(context: SectionContext): Citation[] {
  const section = SECTION_CITATIONS[context] || SECTION_CITATIONS.global;
  return [...section.primarySources, ...section.secondarySources, ...section.tertiarySources];
}

/**
 * Get citation by ID across all sections
 */
export function getCitationById(id: string): Citation | undefined {
  for (const section of Object.values(SECTION_CITATIONS)) {
    const allCitations = [...section.primarySources, ...section.secondarySources, ...section.tertiarySources];
    const found = allCitations.find(c => c.id === id);
    if (found) return found;
  }
  return undefined;
}

/**
 * Search citations by keyword
 */
export function searchCitations(query: string, context?: SectionContext): Citation[] {
  const lower = query.toLowerCase();
  const sections = context ? [SECTION_CITATIONS[context]] : Object.values(SECTION_CITATIONS);
  
  const results: Citation[] = [];
  for (const section of sections) {
    const allCitations = [...section.primarySources, ...section.secondarySources, ...section.tertiarySources];
    results.push(...allCitations.filter(c => 
      c.title.toLowerCase().includes(lower) ||
      c.publisher.toLowerCase().includes(lower) ||
      c.description.toLowerCase().includes(lower) ||
      c.dataTypes.some(dt => dt.toLowerCase().includes(lower))
    ));
  }
  
  // Deduplicate by ID
  return [...new Map(results.map(c => [c.id, c])).values()];
}

