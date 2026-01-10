/**
 * Epoch AI Frontier Data Centers Integration
 * 
 * Integrates with Epoch AI's open database of large AI data centers,
 * using satellite and permit data to track compute, power use, and construction timelines.
 * 
 * Source: https://epoch.ai/data/data-centers
 * License: Creative Commons Attribution (CC-BY)
 * Updated: January 7, 2026
 * 
 * Value for Labor Organizing:
 * - Real power consumption data for Big Tech accountability
 * - Construction timelines for organizing windows
 * - Owner/User relationships exposing corporate partnerships
 * - Satellite-verified facility locations
 * - Projected capacity for future organizing efforts
 */

import { CircuitBreaker } from '../utils/circuitBreaker';

// Create a circuit breaker for Epoch AI API calls
const epochCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  resetTimeout: 60000, // 1 minute
});

// === Types ===

export interface EpochDataCenter {
  name: string;
  location: string;
  city: string;
  state?: string;
  country: string;
  owner: string;
  users: EpochDataCenterUser[];
  currentCapacityMW: number;
  projectedCapacityMW: number;
  operationalDate: string;
  latitude?: number;
  longitude?: number;
  // Organizing-relevant derived fields
  powerGrowthFactor: number;
  isGigawattScale: boolean;
  constructionStatus: 'operational' | 'under-construction' | 'planned';
}

export interface EpochDataCenterUser {
  name: string;
  confidence: 'confirmed' | 'likely' | 'speculative';
}

export interface EpochDataCenterTimeline {
  name: string;
  date: string;
  powerMW: number;
  computeH100e?: number;
  costUSD?: number;
  milestone?: string;
}

export interface EpochCoolingData {
  dataCenter: string;
  equipmentType: 'chiller' | 'cooling-tower';
  manufacturer?: string;
  capacity?: number;
  count?: number;
  waterUsageEstimate?: number;
}

// === Data URLs ===

const EPOCH_DATA_URLS = {
  dataCenters: 'https://epoch.ai/data/data_centers/data_centers.csv',
  timelines: 'https://epoch.ai/data/data_centers/data_center_timelines.csv',
  chillers: 'https://epoch.ai/data/data_centers/data_center_chillers.csv',
  coolingTowers: 'https://epoch.ai/data/data_centers/data_center_cooling_towers.csv',
  allDataZip: 'https://epoch.ai/data/data_centers/data_centers.zip',
  methodology: 'https://epoch.ai/data/data-centers-documentation',
  satelliteExplorer: 'https://epoch.ai/data/data-centers/satellite-explorer',
};

// === Known Facilities (Hardcoded from latest Epoch AI data) ===

/**
 * Current frontier AI data centers tracked by Epoch AI as of January 2026
 * This serves as a fallback if API fetch fails
 */
export const EPOCH_KNOWN_FACILITIES: EpochDataCenter[] = [
  {
    name: 'Meta Prometheus',
    location: 'New Albany, OH',
    city: 'New Albany',
    state: 'OH',
    country: 'USA',
    owner: 'Meta',
    users: [{ name: 'Meta', confidence: 'confirmed' }],
    currentCapacityMW: 691,
    projectedCapacityMW: 1400,
    operationalDate: '2020-05-19',
    powerGrowthFactor: 2.03,
    isGigawattScale: true,
    constructionStatus: 'operational',
  },
  {
    name: 'Microsoft Fairwater Atlanta',
    location: 'Fayetteville, GA',
    city: 'Fayetteville',
    state: 'GA',
    country: 'USA',
    owner: 'Microsoft',
    users: [{ name: 'OpenAI', confidence: 'speculative' }],
    currentCapacityMW: 615,
    projectedCapacityMW: 1100,
    operationalDate: '2024-12-25',
    powerGrowthFactor: 1.79,
    isGigawattScale: true,
    constructionStatus: 'operational',
  },
  {
    name: 'Google New Albany',
    location: 'New Albany, OH',
    city: 'New Albany',
    state: 'OH',
    country: 'USA',
    owner: 'Google Cloud',
    users: [{ name: 'Google DeepMind', confidence: 'likely' }],
    currentCapacityMW: 543,
    projectedCapacityMW: 679,
    operationalDate: '2021-08-27',
    powerGrowthFactor: 1.25,
    isGigawattScale: false,
    constructionStatus: 'operational',
  },
  {
    name: 'xAI Colossus 1',
    location: 'Memphis, TN',
    city: 'Memphis',
    state: 'TN',
    country: 'USA',
    owner: 'xAI',
    users: [{ name: 'xAI', confidence: 'confirmed' }],
    currentCapacityMW: 498,
    projectedCapacityMW: 498,
    operationalDate: '2024-08-11',
    powerGrowthFactor: 1.0,
    isGigawattScale: false,
    constructionStatus: 'operational',
  },
  {
    name: 'Anthropic-Amazon New Carlisle',
    location: 'New Carlisle, IN',
    city: 'New Carlisle',
    state: 'IN',
    country: 'USA',
    owner: 'Amazon',
    users: [{ name: 'Anthropic', confidence: 'confirmed' }],
    currentCapacityMW: 478,
    projectedCapacityMW: 1200,
    operationalDate: '2025-06-23',
    powerGrowthFactor: 2.51,
    isGigawattScale: true,
    constructionStatus: 'operational',
  },
  {
    name: 'Alibaba Zhangbei',
    location: 'Zhangjiakou, Hebei',
    city: 'Zhangjiakou',
    country: 'China',
    owner: 'Alibaba',
    users: [{ name: 'Alibaba', confidence: 'likely' }],
    currentCapacityMW: 432,
    projectedCapacityMW: 432,
    operationalDate: '2018-01-28',
    powerGrowthFactor: 1.0,
    isGigawattScale: false,
    constructionStatus: 'operational',
  },
  {
    name: 'Amazon Madison Mega Site',
    location: 'Canton, MS',
    city: 'Canton',
    state: 'MS',
    country: 'USA',
    owner: 'Amazon',
    users: [{ name: 'Anthropic', confidence: 'speculative' }],
    currentCapacityMW: 341,
    projectedCapacityMW: 819,
    operationalDate: '2025-06-23',
    powerGrowthFactor: 2.40,
    isGigawattScale: false,
    constructionStatus: 'operational',
  },
  {
    name: 'OpenAI Stargate Abilene',
    location: 'Abilene, TX',
    city: 'Abilene',
    state: 'TX',
    country: 'USA',
    owner: 'Oracle',
    users: [{ name: 'OpenAI', confidence: 'confirmed' }],
    currentCapacityMW: 295,
    projectedCapacityMW: 2100,
    operationalDate: '2025-06-28',
    powerGrowthFactor: 7.12,
    isGigawattScale: true,
    constructionStatus: 'operational',
  },
  {
    name: 'xAI Colossus 2',
    location: 'Memphis, TN',
    city: 'Memphis',
    state: 'TN',
    country: 'USA',
    owner: 'xAI',
    users: [{ name: 'xAI', confidence: 'confirmed' }],
    currentCapacityMW: 276,
    projectedCapacityMW: 1400,
    operationalDate: '2025-10-19',
    powerGrowthFactor: 5.07,
    isGigawattScale: true,
    constructionStatus: 'operational',
  },
  {
    name: 'Google Pryor',
    location: 'Pryor, OK',
    city: 'Pryor',
    state: 'OK',
    country: 'USA',
    owner: 'Google Cloud',
    users: [{ name: 'Google DeepMind', confidence: 'likely' }],
    currentCapacityMW: 195,
    projectedCapacityMW: 584,
    operationalDate: '2021-05-20',
    powerGrowthFactor: 2.99,
    isGigawattScale: false,
    constructionStatus: 'operational',
  },
  {
    name: 'Google Omaha',
    location: 'Omaha, NE',
    city: 'Omaha',
    state: 'NE',
    country: 'USA',
    owner: 'Google Cloud',
    users: [{ name: 'Google DeepMind', confidence: 'likely' }],
    currentCapacityMW: 189,
    projectedCapacityMW: 474,
    operationalDate: '2024-04-08',
    powerGrowthFactor: 2.51,
    isGigawattScale: false,
    constructionStatus: 'operational',
  },
  {
    name: 'Amazon Ridgeland',
    location: 'Ridgeland, MS',
    city: 'Ridgeland',
    state: 'MS',
    country: 'USA',
    owner: 'Amazon',
    users: [{ name: 'Anthropic', confidence: 'speculative' }],
    currentCapacityMW: 0,
    projectedCapacityMW: 1000,
    operationalDate: '2026-05-19',
    powerGrowthFactor: Infinity,
    isGigawattScale: true,
    constructionStatus: 'under-construction',
  },
  {
    name: 'Goodnight',
    location: 'Claude, TX',
    city: 'Claude',
    state: 'TX',
    country: 'USA',
    owner: 'Unknown',
    users: [{ name: 'Google DeepMind', confidence: 'speculative' }],
    currentCapacityMW: 0,
    projectedCapacityMW: 928,
    operationalDate: '2026-06-15',
    powerGrowthFactor: Infinity,
    isGigawattScale: false,
    constructionStatus: 'under-construction',
  },
  {
    name: 'Meta Hyperion',
    location: 'Holly Ridge, LA',
    city: 'Holly Ridge',
    state: 'LA',
    country: 'USA',
    owner: 'Meta',
    users: [{ name: 'Meta', confidence: 'confirmed' }],
    currentCapacityMW: 0,
    projectedCapacityMW: 2300,
    operationalDate: '2028-01-01',
    powerGrowthFactor: Infinity,
    isGigawattScale: true,
    constructionStatus: 'planned',
  },
  {
    name: 'Microsoft Fairwater Wisconsin',
    location: 'Mount Pleasant, WI',
    city: 'Mount Pleasant',
    state: 'WI',
    country: 'USA',
    owner: 'Microsoft',
    users: [
      { name: 'OpenAI', confidence: 'likely' },
      { name: 'Microsoft', confidence: 'likely' },
    ],
    currentCapacityMW: 0,
    projectedCapacityMW: 3300,
    operationalDate: '2026-03-31',
    powerGrowthFactor: Infinity,
    isGigawattScale: true,
    constructionStatus: 'under-construction',
  },
  {
    name: 'OpenAI Stargate UAE',
    location: 'Abu Dhabi, UAE',
    city: 'Abu Dhabi',
    country: 'UAE',
    owner: 'G42',
    users: [{ name: 'OpenAI', confidence: 'confirmed' }],
    currentCapacityMW: 0,
    projectedCapacityMW: 1400,
    operationalDate: '2026-12-01',
    powerGrowthFactor: Infinity,
    isGigawattScale: true,
    constructionStatus: 'under-construction',
  },
  {
    name: 'Coreweave Helios',
    location: 'Afton, OK',
    city: 'Afton',
    state: 'OK',
    country: 'USA',
    owner: 'Coreweave',
    users: [{ name: 'Microsoft', confidence: 'speculative' }],
    currentCapacityMW: 0,
    projectedCapacityMW: 800,
    operationalDate: '2026-06-30',
    powerGrowthFactor: Infinity,
    isGigawattScale: false,
    constructionStatus: 'under-construction',
  },
];

// === Service Functions ===

/**
 * Parse CSV data from Epoch AI
 */
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows: Record<string, string>[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

/**
 * Fetch and parse data centers from Epoch AI
 */
export async function fetchEpochDataCenters(): Promise<EpochDataCenter[]> {
  const fetchFn = async (): Promise<EpochDataCenter[]> => {
    try {
      const response = await fetch(EPOCH_DATA_URLS.dataCenters);
      if (!response.ok) {
        throw new Error(`Failed to fetch Epoch data: ${response.status}`);
      }
      
      const csvText = await response.text();
      const rows = parseCSV(csvText);
      
      return rows.map(row => ({
        name: row.name || row.Name || '',
        location: `${row.city || row.City}, ${row.state || row.State || row.country || row.Country}`,
        city: row.city || row.City || '',
        state: row.state || row.State,
        country: row.country || row.Country || 'USA',
        owner: row.owner || row.Owner || '',
        users: parseUsers(row.users || row.Users || row.user || row.User || ''),
        currentCapacityMW: parseFloat(row.current_power_mw || row.currentCapacityMW || '0'),
        projectedCapacityMW: parseFloat(row.projected_power_mw || row.projectedCapacityMW || '0'),
        operationalDate: row.operational_date || row.operationalDate || '',
        latitude: parseFloat(row.latitude || row.lat || '0') || undefined,
        longitude: parseFloat(row.longitude || row.lng || row.lon || '0') || undefined,
        powerGrowthFactor: calculateGrowthFactor(row),
        isGigawattScale: parseFloat(row.projected_power_mw || row.projectedCapacityMW || '0') >= 1000,
        constructionStatus: determineStatus(row),
      }));
    } catch (error) {
      console.warn('Epoch AI fetch failed, using fallback data:', error);
      return EPOCH_KNOWN_FACILITIES;
    }
  };
  
  return epochCircuitBreaker.execute(fetchFn, () => EPOCH_KNOWN_FACILITIES);
}

/**
 * Parse user string into structured array
 */
function parseUsers(userString: string): EpochDataCenterUser[] {
  if (!userString) return [];
  
  return userString.split(';').map(u => {
    const trimmed = u.trim();
    let confidence: 'confirmed' | 'likely' | 'speculative' = 'confirmed';
    let name = trimmed;
    
    if (trimmed.includes('(Speculative)')) {
      confidence = 'speculative';
      name = trimmed.replace('(Speculative)', '').trim();
    } else if (trimmed.includes('(Likely)')) {
      confidence = 'likely';
      name = trimmed.replace('(Likely)', '').trim();
    }
    
    return { name, confidence };
  });
}

/**
 * Calculate power growth factor
 */
function calculateGrowthFactor(row: Record<string, string>): number {
  const current = parseFloat(row.current_power_mw || row.currentCapacityMW || '0');
  const projected = parseFloat(row.projected_power_mw || row.projectedCapacityMW || '0');
  
  if (current === 0) return Infinity;
  return projected / current;
}

/**
 * Determine construction status from dates
 */
function determineStatus(row: Record<string, string>): 'operational' | 'under-construction' | 'planned' {
  const current = parseFloat(row.current_power_mw || row.currentCapacityMW || '0');
  const opDate = new Date(row.operational_date || row.operationalDate || '');
  const now = new Date();
  
  if (current > 0) return 'operational';
  if (opDate > now && opDate.getTime() - now.getTime() < 365 * 24 * 60 * 60 * 1000) {
    return 'under-construction';
  }
  return 'planned';
}

// === Organizing Intelligence Functions ===

/**
 * Get facilities in construction window (best time for organizing)
 */
export function getFacilitiesInConstructionWindow(): EpochDataCenter[] {
  return EPOCH_KNOWN_FACILITIES.filter(f => 
    f.constructionStatus === 'under-construction'
  );
}

/**
 * Get gigawatt-scale facilities (highest impact targets)
 */
export function getGigawattScaleFacilities(): EpochDataCenter[] {
  return EPOCH_KNOWN_FACILITIES.filter(f => f.isGigawattScale);
}

/**
 * Get facilities by owner for corporate accountability research
 */
export function getFacilitiesByOwner(owner: string): EpochDataCenter[] {
  return EPOCH_KNOWN_FACILITIES.filter(f => 
    f.owner.toLowerCase().includes(owner.toLowerCase())
  );
}

/**
 * Get facilities by state for regional organizing
 */
export function getFacilitiesByState(state: string): EpochDataCenter[] {
  return EPOCH_KNOWN_FACILITIES.filter(f => 
    f.state?.toLowerCase() === state.toLowerCase()
  );
}

/**
 * Calculate total power consumption by owner
 */
export function getPowerByOwner(): Record<string, { current: number; projected: number }> {
  const result: Record<string, { current: number; projected: number }> = {};
  
  EPOCH_KNOWN_FACILITIES.forEach(f => {
    if (!result[f.owner]) {
      result[f.owner] = { current: 0, projected: 0 };
    }
    result[f.owner].current += f.currentCapacityMW;
    result[f.owner].projected += f.projectedCapacityMW;
  });
  
  return result;
}

/**
 * Get total frontier AI power consumption
 */
export function getTotalPowerConsumption(): { current: number; projected: number } {
  return EPOCH_KNOWN_FACILITIES.reduce(
    (acc, f) => ({
      current: acc.current + f.currentCapacityMW,
      projected: acc.projected + f.projectedCapacityMW,
    }),
    { current: 0, projected: 0 }
  );
}

/**
 * Compare data center power to city equivalents
 */
export function getPowerCityComparisons(powerMW: number): string[] {
  const comparisons: string[] = [];
  
  // Los Angeles uses ~2,400 MW average
  if (powerMW >= 2400) {
    comparisons.push(`More power than Los Angeles (${(powerMW / 2400).toFixed(1)}x)`);
  }
  
  // San Francisco uses ~900 MW average
  if (powerMW >= 900) {
    comparisons.push(`More power than San Francisco (${(powerMW / 900).toFixed(1)}x)`);
  }
  
  // Nuclear reactor produces ~1,000 MW
  if (powerMW >= 1000) {
    comparisons.push(`Equivalent to ${(powerMW / 1000).toFixed(1)} nuclear reactors`);
  }
  
  // Average US home uses ~1.2 kW
  const homes = Math.round(powerMW * 1000 / 1.2);
  comparisons.push(`Could power ${homes.toLocaleString()} homes`);
  
  return comparisons;
}

// === Export URLs for transparency ===

export const EPOCH_SOURCES = EPOCH_DATA_URLS;

/**
 * Attribution text required by CC-BY license
 */
export const EPOCH_ATTRIBUTION = 
  "Data from Epoch AI's Frontier Data Centers database. " +
  "Licensed under Creative Commons Attribution (CC-BY). " +
  "https://epoch.ai/data/data-centers";

