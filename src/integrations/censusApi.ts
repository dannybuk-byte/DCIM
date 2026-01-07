/**
 * US Census Bureau API Integration
 * 
 * Demographic and economic data for community impact analysis.
 * Track how data centers affect local communities.
 * 
 * @see https://api.census.gov
 * 
 * ✅ CORS: Allowed - Direct browser access works!
 * ✅ Auth: Free API key required (but generous limits without)
 */

import { circuitBreaker } from '../utils/circuitBreaker';

const CENSUS_BASE = 'https://api.census.gov/data';

export interface CountyDemographics {
  fips: string;
  countyName: string;
  stateName: string;
  stateCode: string;
  population: number;
  medianHouseholdIncome: number;
  medianAge: number;
  unemploymentRate: number;
  povertyRate: number;
  housingUnits: number;
  medianHomeValue: number;
  percentBachelorsOrHigher: number;
  laborForceParticipationRate: number;
}

export interface EconomicIndicators {
  fips: string;
  countyName: string;
  totalEmployment: number;
  annualPayroll: number;
  numberOfEstablishments: number;
  itSectorEmployment: number;
  itSectorPayroll: number;
  dataProcessingEmployment: number;
  dataProcessingPayroll: number;
}

// State FIPS codes
export const STATE_FIPS: Record<string, string> = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
  'CO': '08', 'CT': '09', 'DE': '10', 'FL': '12', 'GA': '13',
  'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18', 'IA': '19',
  'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23', 'MD': '24',
  'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28', 'MO': '29',
  'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33', 'NJ': '34',
  'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38', 'OH': '39',
  'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44', 'SC': '45',
  'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49', 'VT': '50',
  'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55', 'WY': '56',
};

// Key data center counties
export const DATA_CENTER_COUNTIES = [
  { state: 'VA', county: '107', name: 'Loudoun County' }, // Ashburn - "Data Center Alley"
  { state: 'VA', county: '059', name: 'Fairfax County' },
  { state: 'OR', county: '065', name: 'Wasco County' }, // The Dalles - Google
  { state: 'OR', county: '013', name: 'Crook County' }, // Prineville - Meta
  { state: 'WA', county: '025', name: 'Grant County' }, // Quincy - Microsoft
  { state: 'TX', county: '113', name: 'Dallas County' },
  { state: 'TX', county: '453', name: 'Travis County' }, // Austin
  { state: 'GA', county: '121', name: 'Fulton County' }, // Atlanta
  { state: 'AZ', county: '013', name: 'Maricopa County' }, // Phoenix/Mesa
  { state: 'NC', county: '035', name: 'Catawba County' }, // Maiden - Google/Apple
  { state: 'NV', county: '031', name: 'Washoe County' }, // Reno
  { state: 'IA', county: '049', name: 'Dallas County' }, // West Des Moines - Meta
];

/**
 * Get county demographics from ACS 5-year estimates
 */
export async function getCountyDemographics(
  stateCode: string,
  countyFips: string,
  year: number = 2022
): Promise<CountyDemographics | null> {
  try {
    const stateFips = STATE_FIPS[stateCode];
    if (!stateFips) {
      throw new Error(`Unknown state code: ${stateCode}`);
    }

    // ACS 5-Year Detailed Tables
    const variables = [
      'NAME',
      'B01003_001E', // Total population
      'B19013_001E', // Median household income
      'B01002_001E', // Median age
      'B23025_005E', // Unemployed
      'B23025_003E', // Labor force
      'B17001_002E', // Below poverty
      'B25001_001E', // Housing units
      'B25077_001E', // Median home value
      'B15003_022E', // Bachelor's degree
      'B15003_023E', // Master's degree
      'B15003_024E', // Professional degree
      'B15003_025E', // Doctorate
      'B15003_001E', // Total 25+ for education
    ].join(',');

    const url = `${CENSUS_BASE}/${year}/acs/acs5?get=${variables}&for=county:${countyFips}&in=state:${stateFips}`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Census API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.length < 2) {
      return null;
    }

    const values = data[1];
    const population = parseInt(values[1]) || 0;
    const laborForce = parseInt(values[6]) || 1;
    const unemployed = parseInt(values[5]) || 0;
    const belowPoverty = parseInt(values[7]) || 0;
    const total25Plus = parseInt(values[14]) || 1;
    const bachelorsPlus = (parseInt(values[11]) || 0) + (parseInt(values[12]) || 0) + 
                          (parseInt(values[13]) || 0) + (parseInt(values[14]) || 0);

    return {
      fips: `${stateFips}${countyFips}`,
      countyName: values[0]?.split(',')[0] || '',
      stateName: values[0]?.split(',')[1]?.trim() || '',
      stateCode,
      population,
      medianHouseholdIncome: parseInt(values[2]) || 0,
      medianAge: parseFloat(values[3]) || 0,
      unemploymentRate: (unemployed / laborForce) * 100,
      povertyRate: (belowPoverty / population) * 100,
      housingUnits: parseInt(values[8]) || 0,
      medianHomeValue: parseInt(values[9]) || 0,
      percentBachelorsOrHigher: (bachelorsPlus / total25Plus) * 100,
      laborForceParticipationRate: (laborForce / population) * 100,
    };
  } catch (error) {
    console.error('Census API error:', error);
    return null;
  }
}

/**
 * Get demographics for all major data center counties
 */
export async function getDataCenterCountyDemographics(): Promise<CountyDemographics[]> {
  const results: CountyDemographics[] = [];
  
  for (const county of DATA_CENTER_COUNTIES) {
    try {
      await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
      const demographics = await getCountyDemographics(county.state, county.county);
      if (demographics) {
        results.push(demographics);
      }
    } catch (error) {
      console.error(`Error fetching ${county.name}:`, error);
    }
  }
  
  return results;
}

/**
 * Get economic data from County Business Patterns
 */
export async function getCountyEconomicData(
  stateCode: string,
  countyFips: string,
  year: number = 2021
): Promise<EconomicIndicators | null> {
  try {
    const stateFips = STATE_FIPS[stateCode];
    if (!stateFips) {
      throw new Error(`Unknown state code: ${stateCode}`);
    }

    // County Business Patterns variables
    const variables = [
      'NAME',
      'EMP',        // Total employment
      'PAYANN',     // Annual payroll ($1000)
      'ESTAB',      // Number of establishments
    ].join(',');

    // All industries
    const url = `${CENSUS_BASE}/${year}/cbp?get=${variables}&for=county:${countyFips}&in=state:${stateFips}&NAICS2017=00`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Census CBP API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data || data.length < 2) {
      return null;
    }

    const values = data[1];

    // Also try to get IT sector data (NAICS 518 - Data Processing)
    let itEmployment = 0;
    let itPayroll = 0;
    let dpEmployment = 0;
    let dpPayroll = 0;

    try {
      const itUrl = `${CENSUS_BASE}/${year}/cbp?get=EMP,PAYANN&for=county:${countyFips}&in=state:${stateFips}&NAICS2017=518210`;
      const itResponse = await fetch(itUrl);
      if (itResponse.ok) {
        const itData = await itResponse.json();
        if (itData && itData.length >= 2) {
          dpEmployment = parseInt(itData[1][0]) || 0;
          dpPayroll = parseInt(itData[1][1]) || 0;
        }
      }
    } catch {
      // IT sector data not available for this county
    }

    return {
      fips: `${stateFips}${countyFips}`,
      countyName: values[0]?.split(',')[0] || '',
      totalEmployment: parseInt(values[1]) || 0,
      annualPayroll: (parseInt(values[2]) || 0) * 1000, // Convert from $1000
      numberOfEstablishments: parseInt(values[3]) || 0,
      itSectorEmployment: itEmployment,
      itSectorPayroll: itPayroll * 1000,
      dataProcessingEmployment: dpEmployment,
      dataProcessingPayroll: dpPayroll * 1000,
    };
  } catch (error) {
    console.error('Census CBP API error:', error);
    return null;
  }
}

/**
 * Analyze community impact of data centers
 */
export async function analyzeDataCenterCommunityImpact(): Promise<{
  counties: Array<CountyDemographics & { economicData?: EconomicIndicators }>;
  summary: {
    totalPopulation: number;
    averageIncome: number;
    averageUnemployment: number;
    averagePoverty: number;
    totalDataProcessingJobs: number;
  };
}> {
  const demographics = await getDataCenterCountyDemographics();
  
  // Get economic data for each county
  const enrichedCounties = await Promise.all(
    demographics.map(async (demo) => {
      const [state, county] = [demo.stateCode, demo.fips.slice(2)];
      const economicData = await getCountyEconomicData(state, county);
      return { ...demo, economicData: economicData || undefined };
    })
  );

  const totalPop = demographics.reduce((sum, d) => sum + d.population, 0);
  const totalDPJobs = enrichedCounties.reduce(
    (sum, c) => sum + (c.economicData?.dataProcessingEmployment || 0), 0
  );

  return {
    counties: enrichedCounties,
    summary: {
      totalPopulation: totalPop,
      averageIncome: demographics.reduce((sum, d) => sum + d.medianHouseholdIncome, 0) / demographics.length,
      averageUnemployment: demographics.reduce((sum, d) => sum + d.unemploymentRate, 0) / demographics.length,
      averagePoverty: demographics.reduce((sum, d) => sum + d.povertyRate, 0) / demographics.length,
      totalDataProcessingJobs: totalDPJobs,
    },
  };
}

// Circuit breaker wrapped versions
export const censusApi = {
  getCountyDemographics: circuitBreaker(getCountyDemographics, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  getDataCenterCountyDemographics: circuitBreaker(getDataCenterCountyDemographics, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  getCountyEconomicData: circuitBreaker(getCountyEconomicData, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  analyzeDataCenterCommunityImpact: circuitBreaker(analyzeDataCenterCommunityImpact, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
};

export default censusApi;

