/**
 * Data Center Tracking Ecosystem
 * 
 * Maps the fragmented landscape of data center intelligence sources,
 * tracking integration status and strategic partnership opportunities.
 * 
 * Based on ecosystem analysis: January 2026
 * 
 * KEY INSIGHT: No organization systematically connects:
 * - Subsidy promises → Actual employment → Labor conditions → Union status
 * This is our differentiation point.
 */

// === Types ===

export type IntegrationStatus = 
  | 'integrated'      // ✅ Live in app
  | 'planned'         // 🔜 In roadmap
  | 'evaluating'      // 🔍 Researching
  | 'blocked'         // ❌ Access/legal issues
  | 'not-applicable'; // ➖ Not relevant to mission

export type DataLicense = 
  | 'cc-by'           // Creative Commons Attribution
  | 'cc-by-sa'        // CC Attribution-ShareAlike
  | 'public-domain'   // No restrictions
  | 'proprietary'     // Paid/restricted
  | 'foia-required'   // Need to file FOIA requests
  | 'partnership'     // Requires formal partnership
  | 'unknown';

export type OrganizationType =
  | 'nonprofit'
  | 'government'
  | 'academic'
  | 'union'
  | 'advocacy'
  | 'coalition'
  | 'commercial'
  | 'media';

export interface DataSource {
  id: string;
  name: string;
  shortName?: string;
  organization: string;
  organizationType: OrganizationType;
  description: string;
  
  // Integration details
  status: IntegrationStatus;
  license: DataLicense;
  accessUrl?: string;
  apiAvailable: boolean;
  downloadFormats: string[];
  updateFrequency: string;
  
  // Coverage
  geographicScope: string;
  facilityCount?: number;
  recordCount?: number;
  
  // Relevance to mission
  missionAlignment: 'high' | 'medium' | 'low';
  relevantCategories: string[];
  
  // Strategic value
  uniqueData: string[];
  limitations: string[];
  
  // Contact/partnership
  keyContacts?: string[];
  partnershipNotes?: string;
}

export interface StrategicPartner {
  id: string;
  name: string;
  type: OrganizationType;
  description: string;
  memberCount?: number;
  geographicFocus: string;
  
  // Partnership value
  dataAssets: string[];
  organizingCapacity: string[];
  policyInfluence: string[];
  
  // Engagement status
  engagementStatus: 'active' | 'potential' | 'approached' | 'declined';
  notes?: string;
}

export interface EcosystemGap {
  id: string;
  area: string;
  description: string;
  currentState: string;
  dcimOpportunity: string;
  requiredData: string[];
  potentialSources: string[];
  implementationComplexity: 'low' | 'medium' | 'high';
  impactPotential: 'high' | 'medium' | 'low';
}

// === Data Sources ===

export const DATA_SOURCES: DataSource[] = [
  // ============================================
  // AI INFRASTRUCTURE TRACKING
  // ============================================
  {
    id: 'epoch-ai',
    name: 'Frontier Data Centers Hub',
    shortName: 'Epoch AI',
    organization: 'Epoch AI',
    organizationType: 'nonprofit',
    description: 'Satellite-verified tracking of 17 largest AI data centers. Power capacity, compute estimates, construction timelines.',
    status: 'integrated', // ✅ We built this!
    license: 'cc-by',
    accessUrl: 'https://epoch.ai/data/data-centers',
    apiAvailable: false,
    downloadFormats: ['CSV', 'JSON'],
    updateFrequency: 'Monthly',
    geographicScope: 'United States',
    facilityCount: 17,
    missionAlignment: 'medium',
    relevantCategories: ['infrastructure', 'power', 'construction'],
    uniqueData: [
      'Satellite-verified facility locations',
      'Power capacity (MW) with cooling model',
      'Construction timelines for organizing windows',
      'H100-equivalent compute estimates',
      'Owner vs. user relationships',
    ],
    limitations: [
      'US-only, frontier AI facilities only',
      '±50-200% uncertainty on power estimates',
      'No labor or subsidy data',
      'Only 14% include water usage',
    ],
    partnershipNotes: 'Open data, no partnership needed. Methodology documented.',
  },
  
  // ============================================
  // SUBSIDY ACCOUNTABILITY
  // ============================================
  {
    id: 'good-jobs-first',
    name: 'Subsidy Tracker Database',
    shortName: 'Good Jobs First',
    organization: 'Good Jobs First',
    organizationType: 'nonprofit',
    description: 'Most comprehensive subsidy accountability database. 670,000+ entries. March 2025 report found $1-2M subsidy per permanent job.',
    status: 'planned',
    license: 'public-domain',
    accessUrl: 'https://www.goodjobsfirst.org/subsidy-tracker',
    apiAvailable: false,
    downloadFormats: ['CSV', 'Excel'],
    updateFrequency: 'Quarterly',
    geographicScope: 'United States (all 50 states)',
    recordCount: 670000,
    missionAlignment: 'high',
    relevantCategories: ['subsidies', 'accountability', 'jobs-promised'],
    uniqueData: [
      'Subsidy amounts by company and program',
      'Jobs promised vs. methodology gaps',
      '36 states with data center subsidies tracked',
      '$1B/year Texas/Virginia foregone revenue',
      '52-70 cents lost per dollar subsidized',
    ],
    limitations: [
      'No actual job verification (no state reports both promised AND actual)',
      'Only 11 of 36 states disclose recipients',
      'Only Nevada discloses actual wages (~$31/hr)',
      'Manual data entry, some lag',
    ],
    partnershipNotes: 'Strong mission alignment. Potential campaign partner.',
  },
  
  // ============================================
  // ENERGY DATA
  // ============================================
  {
    id: 'lbnl',
    name: 'US Data Center Energy Usage Report',
    shortName: 'Berkeley Lab',
    organization: 'Lawrence Berkeley National Laboratory',
    organizationType: 'government',
    description: 'Gold standard for US data center energy. 2024 report: 176 TWh (4.4% of US electricity), projected 325-580 TWh by 2028.',
    status: 'evaluating',
    license: 'public-domain',
    accessUrl: 'https://github.com/LBNL-Data-Centers',
    apiAvailable: false,
    downloadFormats: ['GitHub datasets', 'Excel'],
    updateFrequency: 'Biannual',
    geographicScope: 'United States',
    missionAlignment: 'medium',
    relevantCategories: ['energy', 'grid-impact', 'projections'],
    uniqueData: [
      'Bottom-up technology modeling',
      'Server shipment data integration',
      'Grid impact projections',
      'PUE trends over time',
    ],
    limitations: [
      'Aggregate data, not facility-level',
      'Energy focus, no labor data',
      'Delayed release (1-2 years)',
    ],
    keyContacts: ['Arman Shehabi'],
  },
  {
    id: 'iea',
    name: 'Energy and AI Report',
    shortName: 'IEA',
    organization: 'International Energy Agency',
    organizationType: 'government',
    description: 'Global analysis: 415 TWh (2024) → 945 TWh (2030). US and China account for ~80% of growth.',
    status: 'evaluating',
    license: 'cc-by',
    accessUrl: 'https://www.iea.org/data-and-statistics',
    apiAvailable: true,
    downloadFormats: ['CSV', 'API'],
    updateFrequency: 'Annual',
    geographicScope: 'Global',
    missionAlignment: 'low',
    relevantCategories: ['energy', 'global-context'],
    uniqueData: [
      'Global consumption estimates',
      'Country-level projections',
      'Cross-sector comparisons',
    ],
    limitations: [
      'Global focus, less US granularity',
      'Energy only, no labor/subsidy',
    ],
  },
  
  // ============================================
  // GEOSPATIAL DATA
  // ============================================
  {
    id: 'pnnl',
    name: 'IM3 Data Center Atlas',
    shortName: 'PNNL',
    organization: 'Pacific Northwest National Laboratory',
    organizationType: 'government',
    description: 'Most accessible geospatial dataset. OSM-derived locations with county/state data and 2035 projections.',
    status: 'planned',
    license: 'public-domain',
    accessUrl: 'https://www.osti.gov/dataexplorer',
    apiAvailable: false,
    downloadFormats: ['GeoJSON', 'CSV'],
    updateFrequency: 'Annual',
    geographicScope: 'United States',
    missionAlignment: 'medium',
    relevantCategories: ['geospatial', 'water', 'projections'],
    uniqueData: [
      'Facility area measurements',
      'County-level aggregation',
      'Water demand scenarios',
      '2035 projection models',
    ],
    limitations: [
      'OSM-derived (crowdsourced quality)',
      'No owner/operator data',
      'No labor or subsidy linkage',
    ],
  },
  {
    id: 'fractracker',
    name: 'National Data Centers Tracker',
    shortName: 'FracTracker',
    organization: 'FracTracker Alliance',
    organizationType: 'nonprofit',
    description: 'Maps facilities with environmental justice indicators. Strong correlation between siting and social vulnerability.',
    status: 'planned',
    license: 'cc-by',
    accessUrl: 'https://www.fractracker.org/',
    apiAvailable: false,
    downloadFormats: ['Interactive map', 'CSV export'],
    updateFrequency: 'Quarterly',
    geographicScope: 'United States',
    missionAlignment: 'high',
    relevantCategories: ['environmental-justice', 'community-impact', 'mapping'],
    uniqueData: [
      'EJ indicator overlays',
      'Social vulnerability metrics',
      'Community impact mapping',
      'Siting pattern analysis',
    ],
    limitations: [
      'Focus on environmental, not labor',
      'Limited facility operational data',
    ],
    partnershipNotes: 'Strong EJ mission alignment. Data sharing candidate.',
  },
  
  // ============================================
  // CORPORATE ACCOUNTABILITY
  // ============================================
  {
    id: 'greenpeace-clicking-clean',
    name: 'Clicking Clean Scorecard',
    shortName: 'Greenpeace',
    organization: 'Greenpeace',
    organizationType: 'advocacy',
    description: 'Most widely-cited corporate accountability scorecards. A-F grades on renewable energy commitment.',
    status: 'evaluating',
    license: 'public-domain',
    accessUrl: 'https://www.greenpeace.org/usa/',
    apiAvailable: false,
    downloadFormats: ['PDF report'],
    updateFrequency: 'Biannual',
    geographicScope: 'Global',
    missionAlignment: 'medium',
    relevantCategories: ['corporate-accountability', 'renewable-energy', 'grades'],
    uniqueData: [
      'Corporate energy grades (A-F)',
      'Renewable energy commitments',
      'Transparency assessments',
    ],
    limitations: [
      'Company-level, not facility-level',
      'No labor or subsidy data',
      'Self-reported data concerns',
    ],
  },
  {
    id: 'nrdc-grid-impact',
    name: 'PJM Grid Impact Analysis',
    shortName: 'NRDC',
    organization: 'Natural Resources Defense Council',
    organizationType: 'advocacy',
    description: 'Detailed grid impact: PJM data centers caused $9.4B+ in additional capacity auction costs.',
    status: 'evaluating',
    license: 'public-domain',
    accessUrl: 'https://www.nrdc.org/',
    apiAvailable: false,
    downloadFormats: ['PDF report'],
    updateFrequency: 'Ad-hoc',
    geographicScope: 'PJM region (Mid-Atlantic)',
    missionAlignment: 'medium',
    relevantCategories: ['grid-impact', 'ratepayer-costs', 'policy'],
    uniqueData: [
      '$9.4B+ capacity auction cost increase',
      'Regional grid stress analysis',
      'Ratepayer impact quantification',
    ],
    limitations: [
      'PJM region only',
      'Policy focus, limited facility data',
    ],
  },
  
  // ============================================
  // REGIONAL COALITIONS
  // ============================================
  {
    id: 'pecva',
    name: 'Virginia Data Center Reform Coalition',
    shortName: 'PECVA Coalition',
    organization: 'Piedmont Environmental Council',
    organizationType: 'coalition',
    description: '50+ organizations. Interactive map, 21 GW Dominion contracts, 250% Loudoun Water increase. Four Pillars framework.',
    status: 'planned',
    license: 'partnership',
    accessUrl: 'https://piedmont.org/',
    apiAvailable: false,
    downloadFormats: ['Interactive map', 'Reports'],
    updateFrequency: 'Monthly',
    geographicScope: 'Virginia',
    missionAlignment: 'high',
    relevantCategories: ['regional', 'policy', 'organizing', 'water'],
    uniqueData: [
      '21 GW contracted Dominion electricity',
      '250% Loudoun Water increase data',
      '50+ organization coalition contacts',
      'Four Pillars policy framework',
      'Virginia-specific regulatory tracking',
    ],
    limitations: [
      'Virginia only',
      'Requires coalition relationship',
    ],
    partnershipNotes: 'Key regional partner. Model for other state coalitions.',
  },
  
  // ============================================
  // ENVIRONMENTAL JUSTICE
  // ============================================
  {
    id: 'mediajustice',
    name: 'The People Say No Report',
    shortName: 'MediaJustice',
    organization: 'MediaJustice',
    organizationType: 'advocacy',
    description: 'First comprehensive analysis of data center impacts in American South. Connects siting to environmental racism.',
    status: 'evaluating',
    license: 'public-domain',
    accessUrl: 'https://mediajustice.org/',
    apiAvailable: false,
    downloadFormats: ['PDF report'],
    updateFrequency: 'Ad-hoc',
    geographicScope: 'Southern United States',
    missionAlignment: 'high',
    relevantCategories: ['environmental-justice', 'southern-strategy', 'community'],
    uniqueData: [
      'Southern data center mapping',
      'Environmental racism analysis',
      'Cancer Alley connections',
      'Community organizing frameworks',
    ],
    limitations: [
      'Southern focus',
      'Qualitative research, limited datasets',
    ],
    partnershipNotes: 'Strong EJ alignment. Coalition partner.',
  },
  {
    id: 'naacp-ej',
    name: 'Stop Dirty Data Centers Campaign',
    shortName: 'NAACP EJ',
    organization: 'NAACP Center for Environmental and Climate Justice',
    organizationType: 'advocacy',
    description: 'Community organizing infrastructure. Summits, reporting tool, national reach.',
    status: 'evaluating',
    license: 'partnership',
    accessUrl: 'https://naacp.org/',
    apiAvailable: false,
    downloadFormats: ['Reports', 'Reporting tool'],
    updateFrequency: 'Ongoing',
    geographicScope: 'United States',
    missionAlignment: 'high',
    relevantCategories: ['environmental-justice', 'community-organizing', 'national'],
    uniqueData: [
      'Community incident reporting',
      'National organizing network',
      'Policy advocacy reach',
    ],
    limitations: [
      'Organizing focus, limited quantitative data',
    ],
    partnershipNotes: 'Key community organizing partner.',
  },
  
  // ============================================
  // EMISSIONS & VERIFICATION
  // ============================================
  {
    id: 'climate-trace',
    name: 'Global Emissions Tracker',
    shortName: 'Climate TRACE',
    organization: 'Climate TRACE (Al Gore coalition)',
    organizationType: 'nonprofit',
    description: 'Satellite + AI tracking of 745 million emission sources. Independent verification of power plant emissions.',
    status: 'evaluating',
    license: 'cc-by',
    accessUrl: 'https://climatetrace.org/',
    apiAvailable: true,
    downloadFormats: ['API', 'CSV', 'GeoJSON'],
    updateFrequency: 'Continuous',
    geographicScope: 'Global',
    missionAlignment: 'medium',
    relevantCategories: ['emissions', 'verification', 'satellite'],
    uniqueData: [
      '745M emission sources tracked',
      'Power plant emissions verification',
      'Independent of self-reporting',
      'Satellite-based measurement',
    ],
    limitations: [
      'Emissions focus, no direct data center tracking',
      'Power plant level, not facility level',
    ],
  },
];

// === Strategic Partners ===

export const STRATEGIC_PARTNERS: StrategicPartner[] = [
  // ============================================
  // LABOR UNIONS
  // ============================================
  {
    id: 'ibew-26',
    name: 'IBEW Local 26',
    type: 'union',
    description: 'Northern Virginia. Grown from 7,500 to 14,700 members. Claims 80%+ of VA post-COVID data center investment.',
    memberCount: 14700,
    geographicFocus: 'Northern Virginia',
    dataAssets: [
      'Membership by facility/contractor',
      'Project pipeline intelligence',
      'Contractor relationships',
      'Wage and benefits data',
    ],
    organizingCapacity: [
      'Largest data center electrical workforce',
      'Direct access to construction sites',
      'Apprenticeship pipeline (30,000 new)',
    ],
    policyInfluence: [
      'Virginia labor policy',
      'PLA requirements',
      'Apprenticeship standards',
    ],
    engagementStatus: 'potential',
    notes: 'Primary target for NoVA corridor intelligence.',
  },
  {
    id: 'ibew-24',
    name: 'IBEW Local 24',
    type: 'union',
    description: 'Maryland. $49.50-59.50/hour data center rates. Google.org partnership for 100,000 worker training.',
    geographicFocus: 'Maryland',
    dataAssets: [
      'Wage rate data ($49.50-59.50/hr)',
      'Maryland facility mapping',
      'Google partnership details',
    ],
    organizingCapacity: [
      'Google.org training partnership',
      'Maryland construction access',
    ],
    policyInfluence: [
      'Maryland labor standards',
    ],
    engagementStatus: 'potential',
  },
  {
    id: 'cwa-awu',
    name: 'Alphabet Workers Union (CWA Local 1400)',
    type: 'union',
    description: '~1,400 Google/Alphabet workers including data center staff and contractors. Won COVID hazard pay reinstatement.',
    memberCount: 1400,
    geographicFocus: 'National (Google facilities)',
    dataAssets: [
      'Google data center worker conditions',
      'Contractor abuse documentation',
      'Internal policy intelligence',
    ],
    organizingCapacity: [
      'Inside access to Alphabet operations',
      'Contractor organizing model',
      'Tech worker solidarity network',
    ],
    policyInfluence: [
      'Tech labor standards',
      'Contractor transparency',
    ],
    engagementStatus: 'potential',
    notes: 'Key for contractor transparency and worker condition data.',
  },
  
  // ============================================
  // ADVOCACY COALITIONS
  // ============================================
  {
    id: 'cja',
    name: 'Climate Justice Alliance',
    type: 'coalition',
    description: 'Ad-hoc data center committee. National EJ coalition with frontline community focus.',
    geographicFocus: 'National',
    dataAssets: [
      'Frontline community mapping',
      'EJ indicator frameworks',
    ],
    organizingCapacity: [
      'National coalition network',
      'Community organizing training',
      'Just Transition framework',
    ],
    policyInfluence: [
      'Federal EJ policy',
      'Just Transition advocacy',
    ],
    engagementStatus: 'potential',
  },
];

// === Ecosystem Gaps ===

export const ECOSYSTEM_GAPS: EcosystemGap[] = [
  {
    id: 'subsidy-compliance',
    area: 'Subsidy Compliance Verification',
    description: 'No organization verifies actual job creation against subsidy promises',
    currentState: 'Good Jobs First tracks grants/exemptions, but no state reports both promised AND actual jobs',
    dcimOpportunity: 'Build compliance monitoring linking subsidy agreements to employment verification',
    requiredData: [
      'Subsidy agreements with job promises',
      'Actual employment data (BLS, state agencies)',
      'Facility-to-company mapping',
    ],
    potentialSources: ['good-jobs-first', 'state-employment-agencies', 'union-membership'],
    implementationComplexity: 'high',
    impactPotential: 'high',
  },
  {
    id: 'wage-verification',
    area: 'Wage Verification',
    description: 'Only Nevada discloses actual wages; industry claims are unverified',
    currentState: 'Industry claims high wages, Nevada data shows ~$31/hr (lower than claims)',
    dcimOpportunity: 'Collect actual wage data from workers/unions vs. subsidy promises',
    requiredData: [
      'Actual wage data from workers',
      'Union contract rates',
      'BLS occupational data',
      'Subsidy wage commitments',
    ],
    potentialSources: ['ibew-locals', 'cwa-awu', 'bls-api', 'state-disclosures'],
    implementationComplexity: 'medium',
    impactPotential: 'high',
  },
  {
    id: 'labor-conditions',
    area: 'Labor Conditions Tracking',
    description: 'No systematic tracking of labor violations and contractor abuses',
    currentState: 'AWU documents some issues; OSHA data scattered; no incident database',
    dcimOpportunity: 'Create incident database for labor violations, contractor abuses',
    requiredData: [
      'OSHA violation data',
      'Worker complaints',
      'Union grievances',
      'News reports',
    ],
    potentialSources: ['osha-api', 'union-grievances', 'media-monitoring', 'worker-reports'],
    implementationComplexity: 'medium',
    impactPotential: 'high',
  },
  {
    id: 'union-corridor-mapping',
    area: 'Union Corridor Mapping',
    description: 'IBEW locals track membership; no public geographic analysis',
    currentState: 'Union density by facility, contractor, region not publicly mapped',
    dcimOpportunity: 'Map union density for organizing intelligence and target prioritization',
    requiredData: [
      'IBEW local membership by region',
      'Facility labor agreements',
      'Contractor union status',
      'PLA requirements',
    ],
    potentialSources: ['ibew-locals', 'pla-databases', 'state-labor-agencies'],
    implementationComplexity: 'low',
    impactPotential: 'high',
  },
  {
    id: 'cba-tracking',
    area: 'Community Benefits Agreement Compliance',
    description: 'Columbia Law catalogs CBAs; no database tracking compliance',
    currentState: 'CBAs signed but commitments vs. actual delivery not tracked',
    dcimOpportunity: 'Monitor CBA commitments vs. actual delivery',
    requiredData: [
      'CBA agreement texts',
      'Commitment timelines',
      'Delivery verification',
      'Community feedback',
    ],
    potentialSources: ['columbia-cba-database', 'community-organizations', 'local-governments'],
    implementationComplexity: 'high',
    impactPotential: 'medium',
  },
  {
    id: 'contractor-transparency',
    area: 'Contractor Transparency',
    description: 'No organization tracks which contractors build which facilities',
    currentState: 'Construction intelligence is siloed in unions and trade press',
    dcimOpportunity: 'Link facilities to general contractors, electrical subs, labor agreements',
    requiredData: [
      'Permit data with contractor names',
      'Union contractor lists',
      'Project announcements',
      'Trade press coverage',
    ],
    potentialSources: ['permit-scraping', 'ibew-contractor-lists', 'construction-news'],
    implementationComplexity: 'medium',
    impactPotential: 'high',
  },
];

// === Helper Functions ===

export function getIntegratedSources(): DataSource[] {
  return DATA_SOURCES.filter(s => s.status === 'integrated');
}

export function getPlannedSources(): DataSource[] {
  return DATA_SOURCES.filter(s => s.status === 'planned');
}

export function getHighAlignmentSources(): DataSource[] {
  return DATA_SOURCES.filter(s => s.missionAlignment === 'high');
}

export function getOpenLicenseSources(): DataSource[] {
  return DATA_SOURCES.filter(s => 
    s.license === 'cc-by' || 
    s.license === 'cc-by-sa' || 
    s.license === 'public-domain'
  );
}

export function getGapsByImpact(): EcosystemGap[] {
  return [...ECOSYSTEM_GAPS].sort((a, b) => {
    const impactOrder = { high: 0, medium: 1, low: 2 };
    return impactOrder[a.impactPotential] - impactOrder[b.impactPotential];
  });
}

export function getGapsByComplexity(): EcosystemGap[] {
  return [...ECOSYSTEM_GAPS].sort((a, b) => {
    const complexityOrder = { low: 0, medium: 1, high: 2 };
    return complexityOrder[a.implementationComplexity] - complexityOrder[b.implementationComplexity];
  });
}

// === Integration Priority Matrix ===

export const INTEGRATION_PRIORITIES = {
  immediate: [
    {
      sourceId: 'good-jobs-first',
      rationale: 'Core subsidy accountability data. 670K+ records. Direct mission alignment.',
      effort: 'medium',
      impact: 'high',
    },
  ],
  shortTerm: [
    {
      sourceId: 'pnnl',
      rationale: 'Geospatial foundation. Public domain. Easy integration.',
      effort: 'low',
      impact: 'medium',
    },
    {
      sourceId: 'fractracker',
      rationale: 'EJ indicators complement labor focus. CC-BY license.',
      effort: 'low',
      impact: 'medium',
    },
  ],
  mediumTerm: [
    {
      sourceId: 'pecva',
      rationale: 'Model for state-level tracking. Requires partnership.',
      effort: 'medium',
      impact: 'high',
    },
    {
      sourceId: 'climate-trace',
      rationale: 'Independent emissions verification. API available.',
      effort: 'medium',
      impact: 'medium',
    },
  ],
  longTerm: [
    {
      sourceId: 'union-data',
      rationale: 'Requires union partnerships. High value but sensitive.',
      effort: 'high',
      impact: 'high',
    },
  ],
};

// === Differentiation Statement ===

export const DIFFERENTIATION = {
  statement: `
    No existing organization systematically connects:
    • Which companies receive what subsidies
    • Actual employment at which facilities  
    • Labor conditions and union status
    
    This integration point—connecting SUBSIDIES → EMPLOYMENT → CONDITIONS → UNIONS—
    represents significant unexplored territory for accountability campaigns.
  `,
  competitors: {
    epochAI: 'Tracks compute capacity—not labor',
    dataCenterWatch: 'Tracks opposition—from industry perspective',
    environmentalGroups: 'Track emissions—not employment',
    goodJobsFirst: 'Tracks subsidies—not facility operations',
    unions: 'Track membership—not cross-facility patterns',
  },
  uniqueValue: [
    'Subsidy compliance verification',
    'Promise vs. reality tracking',
    'Union density mapping',
    'Contractor transparency',
    'Worker condition aggregation',
  ],
};

