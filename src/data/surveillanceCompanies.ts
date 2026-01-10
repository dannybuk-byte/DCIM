/**
 * Known Surveillance Companies Database
 * 
 * This database tracks companies with known contracts to provide
 * surveillance, tracking, and data analysis services to ICE, CBP,
 * DHS, and other agencies involved in immigration enforcement.
 * 
 * Sources include:
 * - USAspending.gov contract records
 * - FOIA documents from immigrant rights organizations
 * - News investigations (404 Media, The Intercept, etc.)
 * - SEC filings and corporate disclosures
 * - Academic research and civil liberties reports
 * 
 * "Every data center is a potential node in the surveillance state"
 */

import { SurveillanceCompany, FederalContract, SurveillanceCapability } from '../types/surveillance';

// =============================================================================
// PRIMARY SURVEILLANCE CONTRACTORS
// =============================================================================

export const SURVEILLANCE_COMPANIES: SurveillanceCompany[] = [
  {
    id: 'palantir',
    name: 'Palantir Technologies',
    aliases: ['Palantir', 'Palantir USG'],
    description: 'Primary analytics platform provider for ICE. Developed FALCON system used for immigration enforcement, deportation targeting, and network analysis of immigrant communities.',
    foundedYear: 2003,
    headquarters: 'Denver, CO',
    capabilities: [
      {
        type: 'data_aggregation',
        description: 'Integrates data from hundreds of government and commercial sources',
        products: ['Gotham', 'Foundry', 'Apollo']
      },
      {
        type: 'social_network_analysis',
        description: 'Maps relationships between individuals, identifying family members and associates',
        products: ['FALCON', 'Gotham']
      },
      {
        type: 'predictive_policing',
        description: 'AI-driven targeting and prioritization of individuals for enforcement',
        products: ['Gotham', 'FALCON']
      }
    ],
    dataTypesProcessed: ['biometric', 'location', 'financial', 'communications', 'immigration', 'criminal', 'social_services'],
    knownAgencyClients: ['ICE', 'ERO', 'HSI', 'CBP', 'DHS', 'FBI', 'DOD', 'CIA'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: ['AWS', 'Azure', 'GCP'],
    sources: [
      {
        id: 'palantir-ice-contract-2019',
        type: 'contract_record',
        title: 'ICE-Palantir FALCON Contract',
        url: 'https://www.usaspending.gov',
        date: '2019-08-21',
        description: 'Multi-year contract for ICE Investigative Case Management system',
        reliability: 'verified'
      },
      {
        id: 'intercept-palantir-2017',
        type: 'news',
        title: 'Palantir Provided the Engine for Donald Trump\'s Deportation Machine',
        url: 'https://theintercept.com/2017/03/02/palantir-provided-the-engine-for-donald-trumps-deportation-machine/',
        date: '2017-03-02',
        publisher: 'The Intercept',
        description: 'Investigation into Palantir\'s role in immigration enforcement',
        reliability: 'verified'
      }
    ],
    riskLevel: 'confirmed',
    immigrantImpact: 'direct',
    hasUnionWorkers: false,
    laborViolations: 0,
    communityOpposition: true
  },
  
  {
    id: 'ai-solutions-87',
    name: 'AI Solutions 87',
    aliases: ['AI Solutions 87 LLC', 'AIS87'],
    description: 'Creates "AI agents" for skip tracing and bounty hunting. Contracted by ICE ERO to rapidly track down targets and map their family networks.',
    headquarters: 'Unknown',
    capabilities: [
      {
        type: 'skip_tracing',
        description: 'AI agents that "deliver rapid acceleration in finding persons of interest"',
        products: ['AI Skip Tracing Agents']
      },
      {
        type: 'social_network_analysis',
        description: 'Maps "entire network" of targets including family and associates',
        products: ['Network Mapping AI']
      },
      {
        type: 'ai_analysis',
        description: 'Autonomous AI agents for locating individuals',
        products: ['Bounty Hunter AI']
      }
    ],
    dataTypesProcessed: ['location', 'financial', 'utility', 'dmv', 'communications'],
    knownAgencyClients: ['ICE', 'ERO'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: [],
    sources: [
      {
        id: '404media-ai-solutions-2024',
        type: 'news',
        title: 'ICE Contracts Company Making Bounty Hunter AI Agents',
        url: 'https://www.404media.co/ice-contracts-company-making-bounty-hunter-ai-agents/',
        date: '2024-12-18',
        publisher: '404 Media',
        author: 'Joseph Cox',
        description: 'Reveals ICE contract with AI Solutions 87 for skip tracing AI',
        reliability: 'verified'
      }
    ],
    riskLevel: 'confirmed',
    immigrantImpact: 'direct',
    hasUnionWorkers: false,
    laborViolations: 0,
    communityOpposition: false
  },
  
  {
    id: 'thomson-reuters',
    name: 'Thomson Reuters',
    aliases: ['Thomson Reuters CLEAR', 'West Publishing', 'TR'],
    description: 'Provides CLEAR database to ICE for skip tracing, background checks, and locating individuals. One of the largest commercial data brokers.',
    foundedYear: 2008,
    headquarters: 'Toronto, Canada / New York, NY',
    capabilities: [
      {
        type: 'skip_tracing',
        description: 'Comprehensive skip tracing and people search',
        products: ['CLEAR', 'PeopleMap']
      },
      {
        type: 'database_access',
        description: 'Access to billions of records including utility, financial, and public records',
        products: ['CLEAR', 'Westlaw']
      },
      {
        type: 'data_aggregation',
        description: 'Aggregates data from thousands of sources',
        products: ['CLEAR Investigation']
      }
    ],
    dataTypesProcessed: ['location', 'financial', 'utility', 'dmv', 'criminal', 'employment'],
    knownAgencyClients: ['ICE', 'ERO', 'CBP', 'FBI', 'DOJ'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: ['AWS'],
    sources: [
      {
        id: 'tr-ice-contract',
        type: 'contract_record',
        title: 'ICE CLEAR Database Contract',
        date: '2020-01-01',
        description: 'Multi-million dollar contract for CLEAR database access',
        reliability: 'verified'
      }
    ],
    riskLevel: 'confirmed',
    immigrantImpact: 'direct',
    hasUnionWorkers: false,
    laborViolations: 0,
    communityOpposition: true
  },
  
  {
    id: 'lexisnexis',
    name: 'LexisNexis Risk Solutions',
    aliases: ['LexisNexis', 'RELX', 'Accurint'],
    description: 'Major data broker providing Accurint database to ICE for locating individuals. Aggregates data from utilities, credit bureaus, and public records.',
    foundedYear: 1970,
    headquarters: 'Alpharetta, GA',
    capabilities: [
      {
        type: 'skip_tracing',
        description: 'People search and location services',
        products: ['Accurint', 'Accurint for Law Enforcement']
      },
      {
        type: 'database_access',
        description: 'Access to billions of public and private records',
        products: ['Accurint', 'LexisNexis Public Records']
      },
      {
        type: 'social_network_analysis',
        description: 'Associates and relatives identification',
        products: ['Accurint', 'BatchIQ']
      }
    ],
    dataTypesProcessed: ['location', 'financial', 'utility', 'dmv', 'criminal', 'employment', 'social_services'],
    knownAgencyClients: ['ICE', 'ERO', 'CBP', 'FBI', 'DEA', 'DOJ'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: ['AWS', 'Azure'],
    sources: [],
    riskLevel: 'confirmed',
    immigrantImpact: 'direct',
    hasUnionWorkers: false,
    laborViolations: 0,
    communityOpposition: true
  },
  
  {
    id: 'babel-street',
    name: 'Babel Street',
    aliases: ['Babel Street Inc', 'Locate X'],
    description: 'Provides location intelligence using cell phone data. Locate X product enables warrantless tracking of individuals via commercial location data.',
    foundedYear: 2016,
    headquarters: 'Reston, VA',
    capabilities: [
      {
        type: 'location_tracking',
        description: 'Real-time and historical location tracking using commercial cell phone data',
        products: ['Locate X', 'Babel X']
      },
      {
        type: 'social_media_monitoring',
        description: 'Social media analysis and monitoring',
        products: ['Babel X']
      },
      {
        type: 'data_aggregation',
        description: 'Aggregates location data from mobile advertising ecosystem',
        products: ['Locate X']
      }
    ],
    dataTypesProcessed: ['location', 'communications', 'social_services'],
    knownAgencyClients: ['ICE', 'CBP', 'DHS', 'FBI', 'DOD'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: ['AWS'],
    sources: [
      {
        id: 'vice-locate-x',
        type: 'news',
        title: 'How the U.S. Military Buys Location Data from Ordinary Apps',
        url: 'https://www.vice.com/en/article/how-the-us-military-buys-location-data-from-ordinary-apps/',
        date: '2020-11-16',
        publisher: 'Vice Motherboard',
        description: 'Investigation into Babel Street Locate X',
        reliability: 'verified'
      }
    ],
    riskLevel: 'confirmed',
    immigrantImpact: 'direct',
    hasUnionWorkers: false,
    laborViolations: 0,
    communityOpposition: true
  },
  
  {
    id: 'clearview-ai',
    name: 'Clearview AI',
    aliases: ['Clearview AI Inc'],
    description: 'Facial recognition company that scraped billions of images from social media. Used by ICE for identification and tracking.',
    foundedYear: 2017,
    headquarters: 'New York, NY',
    capabilities: [
      {
        type: 'facial_recognition',
        description: 'Facial recognition using database of billions of scraped images',
        products: ['Clearview AI Search']
      },
      {
        type: 'biometric_collection',
        description: 'Biometric data collection and matching',
        products: ['Clearview AI Search']
      }
    ],
    dataTypesProcessed: ['biometric', 'communications'],
    knownAgencyClients: ['ICE', 'CBP', 'DHS', 'FBI'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: ['AWS'],
    sources: [
      {
        id: 'buzzfeed-clearview',
        type: 'news',
        title: 'ICE Used Clearview AI Facial Recognition',
        url: 'https://www.buzzfeednews.com/article/ryanmac/clearview-ai-fbi-ice-global-law-enforcement',
        date: '2020-02-27',
        publisher: 'BuzzFeed News',
        description: 'Documents ICE use of Clearview AI',
        reliability: 'verified'
      }
    ],
    riskLevel: 'confirmed',
    immigrantImpact: 'direct',
    hasUnionWorkers: false,
    laborViolations: 0,
    communityOpposition: true
  },
  
  {
    id: 'vigilant-solutions',
    name: 'Vigilant Solutions',
    aliases: ['Vigilant Solutions LLC', 'Motorola Solutions'],
    description: 'Operates largest commercial license plate reader (LPR) database. Provides location tracking through vehicle surveillance.',
    foundedYear: 2009,
    headquarters: 'Livermore, CA',
    capabilities: [
      {
        type: 'license_plate_reader',
        description: 'Largest commercial LPR database with billions of scans',
        products: ['LEARN', 'PlateSearch', 'Mobile LPR']
      },
      {
        type: 'location_tracking',
        description: 'Vehicle location tracking through LPR network',
        products: ['LEARN', 'FaceSearch']
      }
    ],
    dataTypesProcessed: ['location', 'dmv'],
    knownAgencyClients: ['ICE', 'CBP', 'DHS', 'FBI', 'DEA'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: ['AWS'],
    sources: [
      {
        id: 'aclu-vigilant',
        type: 'academic',
        title: 'Documents on ICE Access to License Plate Databases',
        url: 'https://www.aclu.org/issues/privacy-technology/surveillance-technologies/automatic-license-plate-readers',
        date: '2018-03-13',
        publisher: 'ACLU',
        description: 'FOIA documents on ICE-Vigilant contract',
        reliability: 'verified'
      }
    ],
    riskLevel: 'confirmed',
    immigrantImpact: 'direct',
    hasUnionWorkers: false,
    laborViolations: 0,
    communityOpposition: true
  },
  
  {
    id: 'securus',
    name: 'Securus Technologies',
    aliases: ['Securus', 'Securus Technologies Inc'],
    description: 'Prison phone company that also provides location tracking services to law enforcement through its LocationSmart subsidiary.',
    headquarters: 'Carrollton, TX',
    capabilities: [
      {
        type: 'location_tracking',
        description: 'Real-time cell phone location tracking',
        products: ['LocationSmart', 'Securus Location Services']
      },
      {
        type: 'communications',
        description: 'Prison phone call monitoring and recording',
        products: ['Securus Video Connect', 'JPay']
      }
    ],
    dataTypesProcessed: ['location', 'communications'],
    knownAgencyClients: ['ICE', 'CBP'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: [],
    sources: [
      {
        id: 'nyt-securus',
        type: 'news',
        title: 'Securus Sold Phone Location Data to Law Enforcement',
        date: '2018-05-10',
        publisher: 'New York Times',
        description: 'Investigation into Securus location tracking abuse',
        reliability: 'verified'
      }
    ],
    riskLevel: 'confirmed',
    immigrantImpact: 'indirect',
    hasUnionWorkers: false,
    laborViolations: 3,
    communityOpposition: true
  },
  
  {
    id: 'pen-link',
    name: 'Pen-Link',
    aliases: ['Pen-Link Ltd'],
    description: 'Provides communication surveillance tools to ICE for monitoring phone calls, text messages, and internet communications.',
    foundedYear: 1986,
    headquarters: 'Lincoln, NE',
    capabilities: [
      {
        type: 'communications',
        description: 'Wiretapping and communication interception',
        products: ['Lincoln', 'Pen-Link Analysis']
      },
      {
        type: 'social_network_analysis',
        description: 'Communication pattern analysis',
        products: ['Link Analysis']
      }
    ],
    dataTypesProcessed: ['communications', 'location'],
    knownAgencyClients: ['ICE', 'HSI', 'FBI', 'DEA'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: [],
    sources: [],
    riskLevel: 'confirmed',
    immigrantImpact: 'direct',
    hasUnionWorkers: false,
    laborViolations: 0,
    communityOpposition: false
  },
  
  {
    id: 'amazon-aws',
    name: 'Amazon Web Services',
    aliases: ['AWS', 'Amazon AWS', 'AWS GovCloud'],
    description: 'Cloud infrastructure provider hosting ICE systems including Palantir platforms. AWS GovCloud provides dedicated government infrastructure.',
    foundedYear: 2006,
    headquarters: 'Seattle, WA',
    capabilities: [
      {
        type: 'data_aggregation',
        description: 'Cloud hosting for government surveillance systems',
        products: ['AWS GovCloud', 'Amazon Rekognition', 'AWS Secret Region']
      },
      {
        type: 'facial_recognition',
        description: 'Commercial facial recognition available to government',
        products: ['Amazon Rekognition']
      }
    ],
    dataTypesProcessed: ['biometric', 'location', 'financial', 'communications', 'immigration', 'criminal'],
    knownAgencyClients: ['ICE', 'CBP', 'DHS', 'FBI', 'CIA', 'NSA', 'DOD'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: [],
    sources: [
      {
        id: 'aws-ice-contract',
        type: 'contract_record',
        title: 'ICE AWS GovCloud Blanket Purchase Agreement',
        date: '2021-01-01',
        description: 'Multi-year cloud services contract',
        reliability: 'verified'
      }
    ],
    riskLevel: 'confirmed',
    immigrantImpact: 'indirect',
    hasUnionWorkers: false,
    laborViolations: 12,
    communityOpposition: true
  },
  
  {
    id: 'microsoft-azure',
    name: 'Microsoft Azure',
    aliases: ['Azure', 'Microsoft Azure Government', 'Azure Gov'],
    description: 'Cloud infrastructure provider with government-specific regions. Hosts various ICE and DHS systems.',
    foundedYear: 2010,
    headquarters: 'Redmond, WA',
    capabilities: [
      {
        type: 'data_aggregation',
        description: 'Cloud hosting for government systems',
        products: ['Azure Government', 'Azure Government Secret', 'Azure Government Top Secret']
      },
      {
        type: 'facial_recognition',
        description: 'Azure Face API (though Microsoft has restricted some sales)',
        products: ['Azure Cognitive Services']
      }
    ],
    dataTypesProcessed: ['biometric', 'location', 'financial', 'communications', 'immigration', 'criminal'],
    knownAgencyClients: ['ICE', 'CBP', 'DHS', 'DOD', 'DOJ'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: [],
    sources: [],
    riskLevel: 'confirmed',
    immigrantImpact: 'indirect',
    hasUnionWorkers: false,
    laborViolations: 0,
    communityOpposition: true
  },
  
  {
    id: 'google-cloud',
    name: 'Google Cloud',
    aliases: ['GCP', 'Google Cloud Platform', 'Google Public Sector'],
    description: 'Cloud infrastructure provider. While Google withdrew from Project Maven, still provides services to various government agencies.',
    foundedYear: 2008,
    headquarters: 'Mountain View, CA',
    capabilities: [
      {
        type: 'data_aggregation',
        description: 'Cloud hosting and data analytics',
        products: ['Google Cloud for Government', 'BigQuery', 'Vertex AI']
      },
      {
        type: 'ai_analysis',
        description: 'AI/ML services available to government',
        products: ['Vertex AI', 'Cloud AI']
      }
    ],
    dataTypesProcessed: ['communications', 'location'],
    knownAgencyClients: ['CBP', 'DOD'],
    contractHistory: [],
    knownDataCenters: [],
    cloudProviders: [],
    sources: [],
    riskLevel: 'likely',
    immigrantImpact: 'indirect',
    hasUnionWorkers: false,
    laborViolations: 5,
    communityOpposition: true
  }
];

// =============================================================================
// GOVERNMENT CLOUD REGIONS
// =============================================================================

export const GOVERNMENT_CLOUD_REGIONS = [
  {
    id: 'aws-gov-west',
    provider: 'AWS' as const,
    regionName: 'AWS GovCloud (US-West)',
    regionCode: 'us-gov-west-1',
    classification: 'GovCloud' as const,
    approximateLocation: {
      state: 'OR',
      city: 'The Dalles'
    },
    knownAgencies: ['ICE', 'CBP', 'DHS', 'FBI', 'DOD'] as const,
    knownContractors: ['palantir', 'thomson-reuters'],
    servicesOffered: ['EC2', 'S3', 'RDS', 'Lambda'],
    sources: []
  },
  {
    id: 'aws-gov-east',
    provider: 'AWS' as const,
    regionName: 'AWS GovCloud (US-East)',
    regionCode: 'us-gov-east-1',
    classification: 'GovCloud' as const,
    approximateLocation: {
      state: 'VA',
      city: 'Northern Virginia'
    },
    knownAgencies: ['ICE', 'CBP', 'DHS', 'FBI', 'CIA', 'DOD'] as const,
    knownContractors: ['palantir', 'babel-street', 'lexisnexis'],
    servicesOffered: ['EC2', 'S3', 'RDS', 'Lambda', 'Rekognition'],
    sources: []
  },
  {
    id: 'azure-gov-virginia',
    provider: 'Azure' as const,
    regionName: 'Azure Government Virginia',
    regionCode: 'usgovvirginia',
    classification: 'FedRAMP_High' as const,
    approximateLocation: {
      state: 'VA',
      city: 'Ashburn'
    },
    knownAgencies: ['ICE', 'CBP', 'DHS', 'DOD', 'DOJ'] as const,
    knownContractors: [],
    servicesOffered: ['Virtual Machines', 'SQL Database', 'Blob Storage'],
    sources: []
  },
  {
    id: 'azure-gov-arizona',
    provider: 'Azure' as const,
    regionName: 'Azure Government Arizona',
    regionCode: 'usgovarizona',
    classification: 'FedRAMP_High' as const,
    approximateLocation: {
      state: 'AZ',
      city: 'Phoenix'
    },
    knownAgencies: ['DHS', 'DOD'] as const,
    knownContractors: [],
    servicesOffered: ['Virtual Machines', 'SQL Database', 'Blob Storage'],
    sources: []
  }
];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export function getCompanyById(id: string): SurveillanceCompany | undefined {
  return SURVEILLANCE_COMPANIES.find(c => c.id === id);
}

export function getCompaniesByAgency(agency: string): SurveillanceCompany[] {
  return SURVEILLANCE_COMPANIES.filter(c => 
    c.knownAgencyClients.includes(agency as any)
  );
}

export function getCompaniesByCapability(capability: SurveillanceCapability['type']): SurveillanceCompany[] {
  return SURVEILLANCE_COMPANIES.filter(c => 
    c.capabilities.some(cap => cap.type === capability)
  );
}

export function getCompaniesByDataType(dataType: string): SurveillanceCompany[] {
  return SURVEILLANCE_COMPANIES.filter(c => 
    c.dataTypesProcessed.includes(dataType as any)
  );
}

export function getConfirmedSurveillanceCompanies(): SurveillanceCompany[] {
  return SURVEILLANCE_COMPANIES.filter(c => c.riskLevel === 'confirmed');
}

export function getDirectImmigrantImpactCompanies(): SurveillanceCompany[] {
  return SURVEILLANCE_COMPANIES.filter(c => c.immigrantImpact === 'direct');
}

// Total known ICE spending
export function calculateTotalICESpending(): number {
  return SURVEILLANCE_COMPANIES.reduce((total, company) => {
    const iceContracts = company.contractHistory.filter(c => 
      c.agency === 'ICE' || c.agency === 'ERO'
    );
    return total + iceContracts.reduce((sum, c) => sum + c.amount, 0);
  }, 0);
}

