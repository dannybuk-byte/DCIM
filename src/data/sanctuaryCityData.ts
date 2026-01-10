/**
 * Sanctuary City Infrastructure Accountability Data
 * 
 * NYC ICE Data Infrastructure: REIT Exposure and Mayoral Authority
 * Source: Mayor Mamdani Transition Team Report | January 2026
 */

import type {
  CarrierHotel,
  DataCenterREIT,
  EnforcementMechanism,
  ExecutiveOrderProvision,
  ICEDataFlowPath,
  CoalitionPartner,
  StateLevelCoordination,
  ResearchResource,
  LegalPrecedent,
  SanctuaryCityStats
} from '../types/sanctuaryCity';

// ============================================================================
// NYC METRO DATA CENTER STATISTICS
// ============================================================================

export const SANCTUARY_CITY_STATS: SanctuaryCityStats = {
  totalNYCMetroDataCenters: 257,
  criticalCarrierHotels: 3,
  reitsTotalRevenue: 14.29, // billions (Equinix $8.74B + Digital Realty $5.55B)
  totalFederalContractsAtRisk: 2500000000, // $2.5B+ federal contracts ecosystem
  facilitiesWithNYCIDABenefits: 12, // estimated
  facilitiesRequiringFranchise: 8, // estimated
  complianceRate: 0, // unknown - needs disclosure
  pendingEnforcementActions: 0 // none yet
};

// ============================================================================
// CRITICAL NYC CARRIER HOTELS
// ============================================================================

export const NYC_CARRIER_HOTELS: CarrierHotel[] = [
  {
    id: 'ny9-111-8th',
    name: '111 8th Avenue',
    address: '111 8th Avenue, Chelsea, Manhattan',
    borough: 'Manhattan',
    operator: 'Equinix / Digital Realty / Google',
    facilityCode: 'NY9 / JFK10',
    squareFeet: 35894,
    networkCount: 100, // estimated
    isCarrierHotel: true,
    fismaLevel: 'High',
    certifications: ['FISMA High', 'NIST 800-53', 'ISO 27001', 'SOC 1/2'],
    awsDirectConnect: true,
    azureExpressRoute: true,
    googleCloudInterconnect: true,
    iceDataFlowRisk: 'Critical',
    federalTenantLikelihood: 'Likely',
    nycidaBenefits: true,
    franchiseRequired: true,
    notes: 'Equinix NY9 holds FISMA High certification for federal workloads. Google is co-tenant. AWS peering location.'
  },
  {
    id: 'nyc1-60-hudson',
    name: '60 Hudson Street',
    address: '60 Hudson Street, Tribeca, Manhattan',
    borough: 'Manhattan',
    operator: 'Digital Realty / DataBank',
    facilityCode: 'NYC1',
    squareFeet: 973000,
    networkCount: 150,
    isCarrierHotel: true,
    transatlanticCables: 5,
    fismaLevel: 'Unknown',
    certifications: ['SOC 1/2', 'ISO 27001'],
    awsDirectConnect: true,
    azureExpressRoute: true,
    googleCloudInterconnect: false,
    iceDataFlowRisk: 'Critical',
    federalTenantLikelihood: 'Likely',
    nycidaBenefits: true,
    franchiseRequired: true,
    notes: 'Premier carrier hotel with 150+ networks. Transatlantic cable hub. DataBank manages meet-me room.'
  },
  {
    id: 'ny1-32-aoa',
    name: '32 Avenue of the Americas',
    address: '32 Avenue of the Americas, Manhattan',
    borough: 'Manhattan',
    operator: 'CoreSite (American Tower)',
    facilityCode: 'NY1',
    squareFeet: 365000,
    networkCount: 85,
    isCarrierHotel: true,
    fismaLevel: 'Unknown',
    certifications: ['SOC 1/2', 'ISO 27001', 'HIPAA'],
    awsDirectConnect: true,
    azureExpressRoute: true,
    googleCloudInterconnect: false,
    iceDataFlowRisk: 'High',
    federalTenantLikelihood: 'Possible',
    nycidaBenefits: true,
    franchiseRequired: true,
    notes: 'AT&T Long Lines building. 85+ network connections.'
  },
  {
    id: 'ny-secaucus',
    name: '800 Secaucus Road',
    address: '800 Secaucus Road, Secaucus, NJ',
    borough: 'NJ Metro',
    operator: 'Equinix',
    facilityCode: 'NY2/NY4/NY5/NY6',
    squareFeet: 126869,
    networkCount: 80,
    isCarrierHotel: true,
    fismaLevel: 'Moderate',
    certifications: ['NIST 800-53', 'ISO 27001', 'SOC 1/2'],
    awsDirectConnect: true,
    azureExpressRoute: true,
    googleCloudInterconnect: true,
    iceDataFlowRisk: 'Critical',
    federalTenantLikelihood: 'Likely',
    nycidaBenefits: false, // NJ jurisdiction
    franchiseRequired: false,
    notes: 'Major AWS Direct Connect location. Cloud on-ramp for federal workloads.'
  },
  {
    id: 'h5-325-hudson',
    name: '325 Hudson Street',
    address: '325 Hudson Street, Manhattan',
    borough: 'Manhattan',
    operator: 'H5 Data Centers',
    facilityCode: 'H5-NYC',
    networkCount: 40,
    isCarrierHotel: false,
    transatlanticCables: 5,
    fismaLevel: 'Unknown',
    certifications: ['SOC 2', 'ISO 27001'],
    awsDirectConnect: false,
    azureExpressRoute: false,
    googleCloudInterconnect: false,
    iceDataFlowRisk: 'Medium',
    federalTenantLikelihood: 'Unlikely',
    nycidaBenefits: false,
    franchiseRequired: true,
    notes: '40+ carriers, 5 transatlantic cables, DE-CIX NY access.'
  },
  {
    id: 'sabey-375-pearl',
    name: '375 Pearl Street',
    address: '375 Pearl Street, Manhattan',
    borough: 'Manhattan',
    operator: 'Sabey Data Centers',
    facilityCode: 'Intergate.Manhattan',
    networkCount: 20,
    isCarrierHotel: false,
    fismaLevel: 'Unknown',
    certifications: ['SOC 2', 'ISO 27001'],
    awsDirectConnect: false,
    azureExpressRoute: false,
    googleCloudInterconnect: false,
    iceDataFlowRisk: 'Low',
    federalTenantLikelihood: 'Unlikely',
    nycidaBenefits: true,
    franchiseRequired: true,
    notes: "NYC's only purpose-built data center."
  }
];

// ============================================================================
// PUBLIC REITS WITH ICE EXPOSURE
// ============================================================================

export const DATA_CENTER_REITS: DataCenterREIT[] = [
  {
    id: 'eqix',
    name: 'Equinix',
    ticker: 'EQIX',
    exchange: 'NASDAQ',
    revenue2024: 8.74,
    usMarketShare: 20,
    federalCertifications: ['FISMA High', 'NIST 800-53', 'ISO 27001', 'SOC 1/2'],
    governmentSolutionsDivision: 'Equinix Government Solutions',
    federalContractsEcosystem: 2500000000,
    nycFacilities: [
      {
        facilityId: 'ny9-111-8th',
        facilityCode: 'NY9',
        address: '111 8th Avenue, Manhattan',
        keyFeatures: ['FISMA High certified', 'AWS peering', '35,894 sqft colocation']
      },
      {
        facilityId: 'ny-secaucus',
        facilityCode: 'NY2/NY4/NY5/NY6',
        address: '800 Secaucus Road, NJ',
        keyFeatures: ['AWS Direct Connect', '126,869+ sqft', 'Major cloud on-ramp']
      }
    ],
    iceConnectionType: 'Indirect',
    iceConnectionDescription: 'Hosts AWS Direct Connect infrastructure; AWS GovCloud hosts ICE systems (Palantir ICM, HART)',
    shareholderEngagementVectors: [
      'Request disclosure of federal law enforcement tenant relationships',
      'Propose ESG policy on immigration enforcement contracts',
      'Support proxy for human rights due diligence in government business'
    ],
    nycPensionExposure: true,
    website: 'https://www.equinix.com'
  },
  {
    id: 'dlr',
    name: 'Digital Realty',
    ticker: 'DLR',
    exchange: 'NYSE',
    revenue2024: 5.55,
    usMarketShare: 15,
    federalCertifications: ['SOC 1/2', 'ISO 27001'],
    nycFacilities: [
      {
        facilityId: 'nyc1-60-hudson',
        facilityCode: 'NYC1',
        address: '60 Hudson Street, Tribeca',
        keyFeatures: ['Premier carrier hotel', '150+ networks', 'Transatlantic cable hub']
      },
      {
        facilityId: 'ny9-111-8th',
        facilityCode: 'JFK10/NYC2',
        address: '111 8th Avenue, Chelsea',
        keyFeatures: ['Hudson Street fiber corridor', 'Google building co-tenant']
      }
    ],
    iceConnectionType: 'Indirect',
    iceConnectionDescription: 'Hosts network infrastructure used by AWS/Azure for government workloads',
    shareholderEngagementVectors: [
      'Request disclosure of government tenant concentration',
      'Propose sanctuary-aligned facilities policy',
      'Engage on carrier-neutral facility use for immigration enforcement'
    ],
    nycPensionExposure: true,
    website: 'https://www.digitalrealty.com'
  },
  {
    id: 'amt',
    name: 'American Tower (CoreSite parent)',
    ticker: 'AMT',
    exchange: 'NYSE',
    revenue2024: 11.2,
    federalCertifications: ['SOC 1/2', 'ISO 27001', 'HIPAA'],
    nycFacilities: [
      {
        facilityId: 'ny1-32-aoa',
        facilityCode: 'NY1',
        address: '32 Avenue of the Americas',
        keyFeatures: ['85+ network connections', 'AT&T Long Lines building']
      }
    ],
    iceConnectionType: 'Unknown',
    iceConnectionDescription: 'CoreSite NY1 federal business not disclosed',
    shareholderEngagementVectors: [
      'Engage on CoreSite NY1 federal business',
      'Request transparency on FISMA-certified facility tenants'
    ],
    nycPensionExposure: true,
    website: 'https://www.americantower.com'
  }
];

// ============================================================================
// ICE DATA FLOW PATH
// ============================================================================

export const ICE_DATA_FLOW: ICEDataFlowPath = {
  name: 'ICE Deportation Infrastructure Data Flow',
  description: 'How ICE data flows from field operations through NYC infrastructure',
  nodes: [
    {
      id: 'ice-field',
      label: 'ICE Field Operations',
      type: 'source',
      details: 'Arrests, Biometric Capture at 68,400+ Detainees'
    },
    {
      id: 'palantir',
      label: 'Palantir ICM / ImmigrationOS',
      type: 'software',
      details: '$95.9M + $59.9M contracts (USASpending.gov)'
    },
    {
      id: 'aws-govcloud',
      label: 'AWS GovCloud',
      type: 'cloud',
      location: 'US-East: Virginia | US-West: Oregon',
      details: 'FedRAMP-authorized, FISMA High compliance'
    },
    {
      id: 'aws-directconnect',
      label: 'AWS Direct Connect',
      type: 'interconnect',
      location: 'Equinix DC2/DC11 (Ashburn, VA)',
      latencyMs: 5
    },
    {
      id: 'regional-network',
      label: 'Regional Network Interconnection',
      type: 'interconnect',
      latencyMs: 8
    },
    {
      id: 'nyc-carrier-hotels',
      label: 'NYC Carrier Hotels',
      type: 'carrier_hotel',
      location: '111 8th Ave, 60 Hudson St, 32 Ave of Americas, 800 Secaucus Rd',
      details: 'Critical Interconnection Points with FISMA HIGH facilities'
    },
    {
      id: 'ice-endpoints',
      label: 'End Users',
      type: 'endpoint',
      details: 'ICE Agents (9,000+ with database access), 280+ Field Offices'
    }
  ],
  connections: [
    { from: 'ice-field', to: 'palantir', description: 'Arrest data, biometrics' },
    { from: 'palantir', to: 'aws-govcloud', description: 'Hosted infrastructure (~$600K/month)' },
    { from: 'aws-govcloud', to: 'aws-directconnect', description: 'Cloud on-ramp' },
    { from: 'aws-directconnect', to: 'regional-network', description: 'East Coast backbone' },
    { from: 'regional-network', to: 'nyc-carrier-hotels', description: 'Interconnection hub' },
    { from: 'nyc-carrier-hotels', to: 'ice-endpoints', description: 'Field office access' }
  ],
  nycTouchpoints: ['ny9-111-8th', 'nyc1-60-hudson', 'ny1-32-aoa', 'ny-secaucus']
};

// ============================================================================
// MAYORAL ENFORCEMENT MECHANISMS
// ============================================================================

export const ENFORCEMENT_MECHANISMS: EnforcementMechanism[] = [
  {
    id: 'phase1-eo',
    phase: 1,
    name: 'Education & Transparency Requirements',
    authority: 'Executive Order',
    description: 'Establish expectations, require reporting on federal tenant relationships',
    impact: 'Creates disclosure baseline and public awareness',
    requiresLegislation: false,
    timeToImplement: 'Immediate'
  },
  {
    id: 'phase2-nycida',
    phase: 2,
    name: 'NYCIDA Benefit Conditions + DCWP Fines',
    authority: 'Board Policy + Admin Code',
    description: 'Tie tax benefits to sanctuary compliance; administrative fines for non-disclosure',
    impact: 'Financial pressure on non-compliant facilities',
    penaltyRange: { min: 1000, max: 10000, unit: 'per_violation' },
    requiresLegislation: false,
    timeToImplement: '30_days'
  },
  {
    id: 'phase3-franchise',
    phase: 3,
    name: 'Franchise Liquidated Damages',
    authority: 'Charter § 363',
    description: 'Liquidated damages for sanctuary violations; tax benefit suspension/recapture',
    impact: 'Significant financial penalties',
    penaltyRange: { min: 100000, max: 500000, unit: 'per_incident' },
    requiresLegislation: false,
    timeToImplement: '90_days'
  },
  {
    id: 'phase4-revocation',
    phase: 4,
    name: 'Franchise Non-Renewal/Revocation',
    authority: 'Charter § 363',
    description: 'Nuclear option: data centers cannot operate without fiber connectivity',
    impact: 'Existential threat to non-compliant facilities',
    requiresLegislation: false,
    timeToImplement: '180_days'
  }
];

// ============================================================================
// EXECUTIVE ORDER FRAMEWORK
// ============================================================================

export const EXECUTIVE_ORDER_PROVISIONS: ExecutiveOrderProvision[] = [
  {
    id: 'eo-disclosure',
    title: 'Disclosure Requirement',
    description: 'All data center operators receiving NYCIDA benefits or using city rights-of-way shall disclose federal law enforcement tenant relationships',
    targetEntities: ['Data center operators', 'Colocation providers', 'Carrier hotels'],
    complianceDeadlineDays: 90
  },
  {
    id: 'eo-certification',
    title: 'Sanctuary Compliance Certification',
    description: 'New NYCIDA applications require certification of no voluntary data sharing with ICE without judicial warrants',
    targetEntities: ['NYCIDA benefit applicants', 'New development projects'],
    complianceDeadlineDays: 0 // Immediate for new applications
  },
  {
    id: 'eo-procurement',
    title: 'Procurement Standards',
    description: 'NYC technology contracts over $500K require sanctuary compliance scoring (15% weight in evaluation)',
    targetEntities: ['City contractors', 'Technology vendors', 'Cloud providers'],
    complianceDeadlineDays: 30
  },
  {
    id: 'eo-audit',
    title: 'Franchise Review',
    description: 'DoITT to audit all telecommunications franchises for data center interconnection relationships',
    targetEntities: ['Telecommunications franchise holders', 'Fiber providers'],
    complianceDeadlineDays: 180
  }
];

// ============================================================================
// COALITION PARTNERS
// ============================================================================

export const COALITION_PARTNERS: CoalitionPartner[] = [
  {
    id: 'cwa',
    name: 'CWA (Communications Workers of America)',
    type: 'Union',
    focusAreas: ['Telecommunications workers', 'Tech worker organizing', 'Data center employment'],
    relevantVictories: ['2021 franchise worker safety requirements'],
    website: 'https://cwa-union.org'
  },
  {
    id: 'twc-code',
    name: 'Tech Workers Coalition / CODE-CWA',
    type: 'Tech_Workers',
    focusAreas: ['Palantir campaigns', 'Amazon ICE contracts', 'Microsoft employee organizing'],
    relevantVictories: ['Amazon employee ICE petition', 'Microsoft GitHub ICE protests'],
    website: 'https://techworkerscoalition.org'
  },
  {
    id: 'no-tech-ice',
    name: 'No Tech for ICE Coalition',
    type: 'Advocacy',
    focusAreas: ['Thomson Reuters targeting', 'LexisNexis campaigns', 'Palantir divestment'],
    website: 'https://notechforice.com'
  },
  {
    id: 'nyc-dsa-tech',
    name: 'NYC DSA Tech Action Working Group',
    type: 'Advocacy',
    focusAreas: ['Algorithmic accountability', 'Local tech policy', 'Surveillance reform'],
    website: 'https://www.socialists.nyc'
  },
  {
    id: 'uprose',
    name: 'UPROSE',
    type: 'Environmental_Justice',
    focusAreas: ['Environmental justice', 'Community power', 'Infrastructure accountability'],
    relevantVictories: ['Industry City victory'],
    website: 'https://www.uprose.org'
  }
];

export const STATE_LEVEL_COORDINATION: StateLevelCoordination[] = [
  {
    official: 'Senator Kristen Gonzalez',
    title: 'NY State Senator',
    relevance: 'S6394A Sustainable Data Centers Act creates energy disclosure framework',
    keyActions: ['Energy disclosure requirements', 'Environmental impact reporting']
  },
  {
    official: 'AG Letitia James',
    title: 'NY Attorney General',
    relevance: 'Tech antitrust experience, defending sanctuary policies',
    keyActions: ['Antitrust enforcement', 'Sanctuary policy defense']
  },
  {
    official: 'Comptroller Brad Lander',
    title: 'NYC Comptroller',
    relevance: 'Shareholder activism through NYC pension funds ($266B+ assets)',
    keyActions: ['REIT shareholder engagement', 'ESG proxy proposals']
  }
];

// ============================================================================
// RESEARCH RESOURCES
// ============================================================================

export const RESEARCH_RESOURCES: ResearchResource[] = [
  // Federal Contract Tracking
  {
    id: 'usaspending',
    name: 'USASpending.gov',
    category: 'Federal_Contracts',
    url: 'https://www.usaspending.gov',
    description: 'Track ICE/DHS contract awards, filter by vendor',
    updateFrequency: 'Daily'
  },
  {
    id: 'fpds',
    name: 'FPDS.gov',
    category: 'Federal_Contracts',
    url: 'https://www.fpds.gov',
    description: 'Federal Procurement Data System - detailed contract info',
    updateFrequency: 'Daily'
  },
  {
    id: 'sam',
    name: 'SAM.gov',
    category: 'Federal_Contracts',
    url: 'https://sam.gov',
    description: 'Upcoming contract solicitations, Statements of Work',
    updateFrequency: 'Real-time'
  },
  {
    id: 'dhs-apfs',
    name: 'DHS APFS',
    category: 'Federal_Contracts',
    url: 'https://apfs-cloud.dhs.gov/forecast/',
    description: 'DHS Acquisition Planning Forecast - upcoming contracts >$350K',
    updateFrequency: 'Monthly'
  },
  {
    id: 'fedramp',
    name: 'FedRAMP Marketplace',
    category: 'Federal_Contracts',
    url: 'https://marketplace.fedramp.gov',
    description: 'Authorized cloud providers for government',
    updateFrequency: 'Weekly'
  },
  // Data Center Infrastructure
  {
    id: 'baxtel',
    name: 'Baxtel',
    category: 'Data_Center_Infrastructure',
    url: 'https://baxtel.com',
    description: 'Data center facility details, tenant tracking',
    updateFrequency: 'Weekly'
  },
  {
    id: 'datacenterhawk',
    name: 'DataCenterHawk',
    category: 'Data_Center_Infrastructure',
    url: 'https://datacenterhawk.com',
    description: 'Colocation market intelligence',
    updateFrequency: 'Weekly'
  },
  {
    id: 'peeringdb',
    name: 'PeeringDB',
    category: 'Data_Center_Infrastructure',
    url: 'https://www.peeringdb.com',
    description: 'Network interconnection data, facility carrier presence',
    updateFrequency: 'Real-time'
  },
  {
    id: 'aws-directconnect',
    name: 'AWS Direct Connect Locations',
    category: 'Data_Center_Infrastructure',
    url: 'https://aws.amazon.com/directconnect/locations/',
    description: 'Cloud on-ramp facilities for federal workloads',
    updateFrequency: 'Monthly'
  },
  // Civil Rights Monitoring
  {
    id: 'eff-dhs',
    name: 'EFF DHS Tech Vendors Dataset',
    category: 'Civil_Rights_Monitoring',
    url: 'https://www.eff.org/document/us-border-homeland-security-tech-vendors-dataset',
    description: 'Comprehensive vendor database (Excel/Google Sheets)',
    updateFrequency: 'Annual'
  },
  {
    id: 'nijc',
    name: 'NIJC Transparency Project',
    category: 'Civil_Rights_Monitoring',
    url: 'https://immigrantjustice.org/transparency',
    description: 'ICE detention contracts and inspections',
    updateFrequency: 'Monthly'
  },
  {
    id: 'vera',
    name: 'Vera Institute ICE Detention Trends',
    category: 'Civil_Rights_Monitoring',
    url: 'https://www.vera.org/ice-detention-trends',
    description: 'FOIA-obtained detention facility data',
    updateFrequency: 'Monthly'
  },
  {
    id: 'epic-foia',
    name: 'EPIC FOIA Gallery',
    category: 'Civil_Rights_Monitoring',
    url: 'https://epic.org/foia-gallery-2022/',
    description: 'ICE surveillance system FOIA documents',
    updateFrequency: 'Static'
  }
];

// ============================================================================
// LEGAL PRECEDENTS
// ============================================================================

export const LEGAL_PRECEDENTS: LegalPrecedent[] = [
  {
    id: 'sf-v-trump',
    caseName: 'San Francisco v. Trump',
    court: '9th Circuit',
    year: 2018,
    category: 'Sanctuary_City',
    holdings: [
      '10th Amendment anti-commandeering doctrine prohibits federal government from forcing local officials to enforce federal laws'
    ],
    dataCenterApplicability: 'Constitutional foundation for sanctuary city data center policies',
    relevanceLevel: 'High'
  },
  {
    id: 'sb54-scotus',
    caseName: 'California Values Act (SB 54) SCOTUS Challenge',
    court: 'Supreme Court',
    year: 2020,
    category: 'Sanctuary_City',
    holdings: [
      'SCOTUS declined Trump administration challenge to California sanctuary law'
    ],
    dataCenterApplicability: 'State-level sanctuary protections survive federal challenge',
    relevanceLevel: 'High'
  },
  {
    id: 'orrick-2025',
    caseName: '2025 Sanctuary City Litigation',
    court: 'Federal District Court (Judge Orrick)',
    year: 2025,
    category: 'Sanctuary_City',
    holdings: [
      'Trump administration orders "likely violate the Constitution"'
    ],
    dataCenterApplicability: 'Recent precedent supporting local sanctuary authority',
    relevanceLevel: 'High'
  },
  {
    id: 'germany-enefg',
    caseName: 'Germany Energy Efficiency Act (EnEfG)',
    court: 'German Parliament',
    year: 2024,
    category: 'Infrastructure_Regulation',
    holdings: [
      'Mandates 100% renewable energy for data centers by 2027'
    ],
    dataCenterApplicability: 'Proves infrastructure conditioning on social policy is legally viable',
    relevanceLevel: 'Medium'
  },
  {
    id: 'barcelona-data',
    caseName: 'Barcelona Municipal Data Sovereignty',
    court: 'Barcelona City Council',
    year: 2020,
    category: 'Data_Sovereignty',
    holdings: [
      'City-level data governance requirements for municipal contractors'
    ],
    dataCenterApplicability: 'International precedent for municipal data infrastructure authority',
    relevanceLevel: 'Medium'
  }
];

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getCarrierHotelById(id: string): CarrierHotel | undefined {
  return NYC_CARRIER_HOTELS.find(ch => ch.id === id);
}

export function getCarrierHotelsByRiskLevel(risk: CarrierHotel['iceDataFlowRisk']): CarrierHotel[] {
  return NYC_CARRIER_HOTELS.filter(ch => ch.iceDataFlowRisk === risk);
}

export function getFISMAHighFacilities(): CarrierHotel[] {
  return NYC_CARRIER_HOTELS.filter(ch => ch.fismaLevel === 'High');
}

export function getREITByTicker(ticker: string): DataCenterREIT | undefined {
  return DATA_CENTER_REITS.find(r => r.ticker === ticker);
}

export function getTotalREITRevenue(): number {
  return DATA_CENTER_REITS.reduce((sum, reit) => sum + reit.revenue2024, 0);
}

export function getEnforcementByPhase(phase: number): EnforcementMechanism[] {
  return ENFORCEMENT_MECHANISMS.filter(em => em.phase === phase);
}

export function getResourcesByCategory(category: ResearchResource['category']): ResearchResource[] {
  return RESEARCH_RESOURCES.filter(r => r.category === category);
}
