/**
 * Bureau of Labor Statistics (BLS) API Integration
 * 
 * Real integration with the BLS Public Data API to fetch
 * employment statistics for data center and tech industries.
 * 
 * @see https://www.bls.gov/developers/
 * 
 * Rate Limits:
 * - Without API key: 25 requests per day
 * - With API key: 500 requests per day (free registration)
 * 
 * To get an API key, register at: https://data.bls.gov/registrationEngine/
 */

import { circuitBreaker } from '../utils/circuitBreaker';

const BLS_API_URL = 'https://api.bls.gov/publicAPI/v2';

// BLS Series IDs for relevant industries
export const BLS_SERIES = {
  // Data Processing, Hosting, and Related Services (NAICS 518)
  dataProcessingEmployment: 'CEU6051800001', // All employees
  dataProcessingAvgHourlyEarnings: 'CEU6051800003', // Avg hourly earnings
  dataProcessingAvgWeeklyHours: 'CEU6051800002', // Avg weekly hours
  
  // Computer Systems Design (NAICS 5415)
  computerSystemsEmployment: 'CEU6054150001',
  computerSystemsAvgHourlyEarnings: 'CEU6054150003',
  
  // Information Sector (NAICS 51)
  informationSectorEmployment: 'CEU5000000001',
  informationSectorAvgHourlyEarnings: 'CEU5000000003',
  
  // Software Publishers (NAICS 5112)
  softwarePublishersEmployment: 'CEU5051120001',
  
  // Telecommunications (NAICS 517)
  telecomEmployment: 'CEU5051700001',
  
  // National unemployment rate
  unemploymentRate: 'LNS14000000',
  
  // Total nonfarm employment
  totalNonfarmEmployment: 'CEU0000000001',
};

// State area codes for state-level data
export const STATE_CODES: Record<string, string> = {
  'AL': '01', 'AK': '02', 'AZ': '04', 'AR': '05', 'CA': '06',
  'CO': '08', 'CT': '09', 'DE': '10', 'DC': '11', 'FL': '12',
  'GA': '13', 'HI': '15', 'ID': '16', 'IL': '17', 'IN': '18',
  'IA': '19', 'KS': '20', 'KY': '21', 'LA': '22', 'ME': '23',
  'MD': '24', 'MA': '25', 'MI': '26', 'MN': '27', 'MS': '28',
  'MO': '29', 'MT': '30', 'NE': '31', 'NV': '32', 'NH': '33',
  'NJ': '34', 'NM': '35', 'NY': '36', 'NC': '37', 'ND': '38',
  'OH': '39', 'OK': '40', 'OR': '41', 'PA': '42', 'RI': '44',
  'SC': '45', 'SD': '46', 'TN': '47', 'TX': '48', 'UT': '49',
  'VT': '50', 'VA': '51', 'WA': '53', 'WV': '54', 'WI': '55',
  'WY': '56',
};

export interface BLSDataPoint {
  year: string;
  period: string;
  periodName: string;
  value: string;
  footnotes: Array<{ code: string; text: string }>;
}

export interface BLSSeriesData {
  seriesID: string;
  data: BLSDataPoint[];
  catalog?: {
    series_title?: string;
    seasonality?: string;
    survey_name?: string;
    measure_data_type?: string;
  };
}

export interface BLSResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: BLSSeriesData[];
  };
}

export interface EmploymentData {
  industry: string;
  seriesId: string;
  latestValue: number;
  latestPeriod: string;
  yearOverYearChange: number;
  yearOverYearChangePercent: number;
  historicalData: Array<{
    year: string;
    month: string;
    value: number;
  }>;
}

/**
 * Fetch data from BLS API
 */
export async function fetchBLSData(
  seriesIds: string[],
  startYear?: number,
  endYear?: number,
  apiKey?: string
): Promise<BLSResponse> {
  const currentYear = new Date().getFullYear();
  const start = startYear || currentYear - 5;
  const end = endYear || currentYear;

  const payload: Record<string, unknown> = {
    seriesid: seriesIds,
    startyear: start.toString(),
    endyear: end.toString(),
    catalog: true,
    calculations: true,
    annualaverage: true,
  };

  if (apiKey) {
    payload.registrationkey = apiKey;
  }

  const response = await fetch(`${BLS_API_URL}/timeseries/data/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`BLS API error: ${response.status}`);
  }

  return response.json();
}

/**
 * Get employment data for data center industry
 */
export async function getDataCenterEmployment(apiKey?: string): Promise<EmploymentData | null> {
  try {
    const response = await fetchBLSData(
      [BLS_SERIES.dataProcessingEmployment],
      undefined,
      undefined,
      apiKey
    );

    if (response.status !== 'REQUEST_SUCCEEDED' || !response.Results?.series?.length) {
      return null;
    }

    const series = response.Results.series[0];
    const data = series.data.sort((a, b) => {
      const dateA = `${a.year}${a.period}`;
      const dateB = `${b.year}${b.period}`;
      return dateB.localeCompare(dateA);
    });

    if (data.length < 2) return null;

    const latest = data[0];
    const latestValue = parseFloat(latest.value);
    
    // Find same month last year
    const lastYearData = data.find(
      d => d.year === (parseInt(latest.year) - 1).toString() && d.period === latest.period
    );
    
    const lastYearValue = lastYearData ? parseFloat(lastYearData.value) : latestValue;
    const change = latestValue - lastYearValue;
    const changePercent = (change / lastYearValue) * 100;

    return {
      industry: 'Data Processing, Hosting, and Related Services',
      seriesId: series.seriesID,
      latestValue: latestValue * 1000, // BLS reports in thousands
      latestPeriod: `${latest.periodName} ${latest.year}`,
      yearOverYearChange: change * 1000,
      yearOverYearChangePercent: changePercent,
      historicalData: data.map(d => ({
        year: d.year,
        month: d.periodName,
        value: parseFloat(d.value) * 1000,
      })),
    };
  } catch (error) {
    console.error('Error fetching data center employment:', error);
    return null;
  }
}

/**
 * Get tech industry employment overview
 */
export async function getTechEmploymentOverview(apiKey?: string): Promise<EmploymentData[]> {
  const results: EmploymentData[] = [];
  
  const seriesIds = [
    BLS_SERIES.dataProcessingEmployment,
    BLS_SERIES.computerSystemsEmployment,
    BLS_SERIES.softwarePublishersEmployment,
    BLS_SERIES.telecomEmployment,
  ];

  const industryNames: Record<string, string> = {
    [BLS_SERIES.dataProcessingEmployment]: 'Data Processing & Hosting',
    [BLS_SERIES.computerSystemsEmployment]: 'Computer Systems Design',
    [BLS_SERIES.softwarePublishersEmployment]: 'Software Publishers',
    [BLS_SERIES.telecomEmployment]: 'Telecommunications',
  };

  try {
    const response = await fetchBLSData(seriesIds, undefined, undefined, apiKey);

    if (response.status !== 'REQUEST_SUCCEEDED') {
      console.error('BLS API error:', response.message);
      return results;
    }

    for (const series of response.Results.series) {
      const data = series.data.sort((a, b) => {
        const dateA = `${a.year}${a.period}`;
        const dateB = `${b.year}${b.period}`;
        return dateB.localeCompare(dateA);
      });

      if (data.length < 2) continue;

      const latest = data[0];
      const latestValue = parseFloat(latest.value);
      
      const lastYearData = data.find(
        d => d.year === (parseInt(latest.year) - 1).toString() && d.period === latest.period
      );
      
      const lastYearValue = lastYearData ? parseFloat(lastYearData.value) : latestValue;
      const change = latestValue - lastYearValue;
      const changePercent = (change / lastYearValue) * 100;

      results.push({
        industry: industryNames[series.seriesID] || series.catalog?.series_title || series.seriesID,
        seriesId: series.seriesID,
        latestValue: latestValue * 1000,
        latestPeriod: `${latest.periodName} ${latest.year}`,
        yearOverYearChange: change * 1000,
        yearOverYearChangePercent: changePercent,
        historicalData: data.slice(0, 24).map(d => ({
          year: d.year,
          month: d.periodName,
          value: parseFloat(d.value) * 1000,
        })),
      });
    }
  } catch (error) {
    console.error('Error fetching tech employment:', error);
  }

  return results;
}

/**
 * Get average wages for data center industry
 */
export async function getDataCenterWages(apiKey?: string): Promise<{
  avgHourlyEarnings: number;
  avgWeeklyHours: number;
  estimatedAnnualSalary: number;
  period: string;
} | null> {
  try {
    const response = await fetchBLSData(
      [BLS_SERIES.dataProcessingAvgHourlyEarnings, BLS_SERIES.dataProcessingAvgWeeklyHours],
      undefined,
      undefined,
      apiKey
    );

    if (response.status !== 'REQUEST_SUCCEEDED' || response.Results.series.length < 2) {
      return null;
    }

    const earningsSeries = response.Results.series.find(
      s => s.seriesID === BLS_SERIES.dataProcessingAvgHourlyEarnings
    );
    const hoursSeries = response.Results.series.find(
      s => s.seriesID === BLS_SERIES.dataProcessingAvgWeeklyHours
    );

    if (!earningsSeries?.data?.length || !hoursSeries?.data?.length) {
      return null;
    }

    const latestEarnings = parseFloat(earningsSeries.data[0].value);
    const latestHours = parseFloat(hoursSeries.data[0].value);
    const period = `${earningsSeries.data[0].periodName} ${earningsSeries.data[0].year}`;

    return {
      avgHourlyEarnings: latestEarnings,
      avgWeeklyHours: latestHours,
      estimatedAnnualSalary: latestEarnings * latestHours * 52,
      period,
    };
  } catch (error) {
    console.error('Error fetching wage data:', error);
    return null;
  }
}

// Create circuit breaker wrapped versions
export const blsApi = {
  fetchBLSData: circuitBreaker(fetchBLSData, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  getDataCenterEmployment: circuitBreaker(getDataCenterEmployment, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  getTechEmploymentOverview: circuitBreaker(getTechEmploymentOverview, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
  getDataCenterWages: circuitBreaker(getDataCenterWages, {
    failureThreshold: 3,
    resetTimeout: 60000,
  }),
};

export default blsApi;

