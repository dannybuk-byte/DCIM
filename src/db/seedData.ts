import { Facility } from '../types';
import {
  buildPrinceWilliamClusterFacility,
  PRINCE_WILLIAM_CLUSTER_FACILITY_ID,
} from '../data/princeWilliamClusterFacility';
import { db } from './database';
import { isDemoMode } from './demoMode';
import { computeDemoBgpFields } from '../utils/bgpDemo';

// Global operators with their market presence by country
interface OperatorConfig {
  name: string;
  weight: number;
  types: Facility['type'][];
  countries: string[];
  // For US operators, specify states
  usStates?: string[];
  // For international operators, specify regions within countries
  regions?: Record<string, string[]>;
}

const operators: OperatorConfig[] = [
  // Hyperscalers (US-based, global presence)
  { 
    name: 'Amazon Web Services', 
    weight: 15, 
    types: ['Data Center', 'POP'], 
    countries: ['US', 'UK', 'Germany', 'Ireland', 'Japan', 'Singapore', 'Australia', 'India', 'Brazil', 'Canada', 'France', 'South Korea', 'Netherlands', 'Sweden', 'Italy', 'Spain', 'Mexico', 'UAE', 'South Africa'],
    usStates: ['VA', 'OH', 'OR', 'CA', 'TX', 'NC', 'GA', 'IL', 'NJ', 'AZ'],
    regions: {
      'UK': ['London'],
      'Germany': ['Frankfurt'],
      'Ireland': ['Dublin'],
      'Japan': ['Tokyo'],
      'Singapore': ['Singapore'],
      'Australia': ['Sydney'],
      'India': ['Mumbai'],
      'Brazil': ['São Paulo'],
      'Canada': ['Toronto'],
      'France': ['Paris'],
      'South Korea': ['Seoul'],
      'Netherlands': ['Amsterdam'],
      'Sweden': ['Stockholm'],
      'Italy': ['Milan'],
      'Spain': ['Madrid'],
      'Mexico': ['Mexico City'],
      'UAE': ['Dubai'],
      'South Africa': ['Cape Town'],
    }
  },
  { 
    name: 'Microsoft Azure', 
    weight: 14, 
    types: ['Data Center', 'POP'], 
    countries: ['US', 'UK', 'Germany', 'Ireland', 'Netherlands', 'Japan', 'Singapore', 'Australia', 'India', 'Brazil', 'Canada', 'France', 'South Korea', 'Sweden', 'Norway', 'Switzerland', 'Italy', 'Spain', 'Mexico', 'UAE'],
    usStates: ['VA', 'TX', 'WA', 'AZ', 'IL', 'GA', 'CA', 'IA', 'WY', 'NJ'],
    regions: {
      'UK': ['London'],
      'Germany': ['Frankfurt'],
      'Ireland': ['Dublin'],
      'Netherlands': ['Amsterdam'],
      'Japan': ['Tokyo'],
      'Singapore': ['Singapore'],
      'Australia': ['Sydney'],
      'India': ['Mumbai'],
      'Brazil': ['São Paulo'],
      'Canada': ['Toronto'],
      'France': ['Paris'],
      'South Korea': ['Seoul'],
      'Sweden': ['Stockholm'],
      'Norway': ['Oslo'],
      'Switzerland': ['Zurich'],
      'Italy': ['Milan'],
      'Spain': ['Madrid'],
      'Mexico': ['Mexico City'],
      'UAE': ['Dubai'],
    }
  },
  { 
    name: 'Google Cloud', 
    weight: 12, 
    types: ['Data Center', 'POP'], 
    countries: ['US', 'UK', 'Belgium', 'Netherlands', 'Germany', 'Japan', 'Singapore', 'Taiwan', 'Australia', 'India', 'Brazil', 'Canada', 'Ireland', 'Finland', 'Chile'],
    usStates: ['SC', 'NC', 'OK', 'IA', 'VA', 'NV', 'OR', 'TX', 'OH', 'NE'],
    regions: {
      'UK': ['London'],
      'Belgium': ['St. Ghislain'],
      'Netherlands': ['Eemshaven'],
      'Germany': ['Frankfurt'],
      'Japan': ['Tokyo'],
      'Singapore': ['Singapore'],
      'Taiwan': ['Changhua'],
      'Australia': ['Sydney'],
      'India': ['Mumbai'],
      'Brazil': ['São Paulo'],
      'Canada': ['Montreal'],
      'Ireland': ['Dublin'],
      'Finland': ['Hamina'],
      'Chile': ['Santiago'],
    }
  },
  { 
    name: 'Meta', 
    weight: 10, 
    types: ['Data Center'], 
    countries: ['US', 'Ireland', 'Denmark', 'Sweden', 'Singapore'],
    usStates: ['NC', 'TX', 'NM', 'UT', 'OH', 'GA', 'IA', 'VA', 'IN', 'AZ'],
    regions: {
      'Ireland': ['Clonee'],
      'Denmark': ['Odense'],
      'Sweden': ['Luleå'],
      'Singapore': ['Singapore'],
    }
  },
  { 
    name: 'Apple', 
    weight: 6, 
    types: ['Data Center'], 
    countries: ['US', 'Ireland', 'Denmark'],
    usStates: ['NC', 'AZ', 'NV', 'IA', 'OR', 'CA'],
    regions: {
      'Ireland': ['Athenry'],
      'Denmark': ['Viborg'],
    }
  },
  
  // Global Colocation Providers
  { 
    name: 'Equinix', 
    weight: 10, 
    types: ['Data Center', 'CO'], 
    countries: ['US', 'UK', 'Germany', 'Netherlands', 'France', 'Singapore', 'Japan', 'Hong Kong', 'Australia', 'Brazil', 'Canada', 'Ireland', 'Switzerland', 'Italy', 'Spain', 'Belgium', 'Sweden', 'UAE', 'Mexico', 'Colombia'],
    usStates: ['CA', 'TX', 'VA', 'NJ', 'IL', 'GA', 'WA', 'FL', 'NY', 'CO'],
    regions: {
      'UK': ['London', 'Manchester'],
      'Germany': ['Frankfurt', 'Munich'],
      'Netherlands': ['Amsterdam'],
      'France': ['Paris'],
      'Singapore': ['Singapore'],
      'Japan': ['Tokyo', 'Osaka'],
      'Hong Kong': ['Hong Kong'],
      'Australia': ['Sydney', 'Melbourne'],
      'Brazil': ['São Paulo'],
      'Canada': ['Toronto', 'Vancouver'],
      'Ireland': ['Dublin'],
      'Switzerland': ['Zurich'],
      'Italy': ['Milan'],
      'Spain': ['Madrid'],
      'Belgium': ['Brussels'],
      'Sweden': ['Stockholm'],
      'UAE': ['Dubai'],
      'Mexico': ['Mexico City'],
      'Colombia': ['Bogotá'],
    }
  },
  { 
    name: 'Digital Realty', 
    weight: 8, 
    types: ['Data Center', 'CO'], 
    countries: ['US', 'UK', 'Germany', 'Netherlands', 'France', 'Singapore', 'Japan', 'Australia', 'Ireland', 'Canada', 'Switzerland', 'Italy', 'Spain', 'Mexico', 'Brazil', 'South Africa'],
    usStates: ['VA', 'TX', 'CA', 'IL', 'GA', 'NJ', 'AZ', 'OR', 'OH', 'NY'],
    regions: {
      'UK': ['London'],
      'Germany': ['Frankfurt'],
      'Netherlands': ['Amsterdam'],
      'France': ['Paris'],
      'Singapore': ['Singapore'],
      'Japan': ['Tokyo'],
      'Australia': ['Sydney'],
      'Ireland': ['Dublin'],
      'Canada': ['Toronto'],
      'Switzerland': ['Zurich'],
      'Italy': ['Milan'],
      'Spain': ['Madrid'],
      'Mexico': ['Mexico City'],
      'Brazil': ['São Paulo'],
      'South Africa': ['Johannesburg'],
    }
  },
  
  // Global Telecom Operators
  { 
    name: 'NTT', 
    weight: 8, 
    types: ['Data Center', 'CO', 'Switch'], 
    countries: ['US', 'UK', 'Germany', 'Singapore', 'Japan', 'Hong Kong', 'Australia', 'India', 'Brazil', 'Canada', 'Indonesia', 'Malaysia', 'Thailand', 'Philippines', 'Vietnam', 'South Africa'],
    usStates: ['CA', 'VA', 'TX', 'IL', 'CO', 'OR', 'AZ'],
    regions: {
      'UK': ['London'],
      'Germany': ['Frankfurt'],
      'Singapore': ['Singapore'],
      'Japan': ['Tokyo', 'Osaka'],
      'Hong Kong': ['Hong Kong'],
      'Australia': ['Sydney', 'Melbourne'],
      'India': ['Mumbai', 'Bangalore'],
      'Brazil': ['São Paulo'],
      'Canada': ['Toronto'],
      'Indonesia': ['Jakarta'],
      'Malaysia': ['Kuala Lumpur'],
      'Thailand': ['Bangkok'],
      'Philippines': ['Manila'],
      'Vietnam': ['Ho Chi Minh City'],
      'South Africa': ['Johannesburg'],
    }
  },
  { 
    name: 'KDDI', 
    weight: 4, 
    types: ['Data Center', 'CO'], 
    countries: ['Japan', 'Singapore', 'Hong Kong', 'US', 'Thailand', 'Vietnam'],
    usStates: ['CA', 'VA'],
    regions: {
      'Japan': ['Tokyo', 'Osaka'],
      'Singapore': ['Singapore'],
      'Hong Kong': ['Hong Kong'],
      'Thailand': ['Bangkok'],
      'Vietnam': ['Ho Chi Minh City'],
    }
  },
  { 
    name: 'Telstra', 
    weight: 3, 
    types: ['Data Center', 'CO', 'Switch'], 
    countries: ['Australia', 'Singapore', 'Hong Kong', 'UK', 'New Zealand'],
    regions: {
      'Australia': ['Sydney', 'Melbourne', 'Perth'],
      'Singapore': ['Singapore'],
      'Hong Kong': ['Hong Kong'],
      'UK': ['London'],
      'New Zealand': ['Auckland'],
    }
  },
  
  // APAC Regional Operators
  { 
    name: 'STT GDC', 
    weight: 5, 
    types: ['Data Center', 'CO'], 
    countries: ['Singapore', 'India', 'China', 'Thailand', 'Indonesia', 'Philippines', 'Malaysia', 'Vietnam', 'UK'],
    regions: {
      'Singapore': ['Singapore'],
      'India': ['Mumbai', 'Bangalore', 'Chennai'],
      'China': ['Shanghai', 'Beijing'],
      'Thailand': ['Bangkok'],
      'Indonesia': ['Jakarta'],
      'Philippines': ['Manila'],
      'Malaysia': ['Kuala Lumpur'],
      'Vietnam': ['Ho Chi Minh City'],
      'UK': ['London'],
    }
  },
  { 
    name: 'AirTrunk', 
    weight: 4, 
    types: ['Data Center'], 
    countries: ['Australia', 'Singapore', 'Japan', 'Malaysia'],
    regions: {
      'Australia': ['Sydney', 'Melbourne'],
      'Singapore': ['Singapore'],
      'Japan': ['Tokyo'],
      'Malaysia': ['Kuala Lumpur'],
    }
  },
  { 
    name: 'NEXTDC', 
    weight: 3, 
    types: ['Data Center', 'CO'], 
    countries: ['Australia'],
    regions: {
      'Australia': ['Sydney', 'Melbourne', 'Perth', 'Brisbane'],
    }
  },
  
  // EMEA Regional Operators
  { 
    name: 'Interxion', 
    weight: 5, 
    types: ['Data Center', 'CO'], 
    countries: ['Netherlands', 'UK', 'Germany', 'France', 'Austria', 'Belgium', 'Denmark', 'Finland', 'Ireland', 'Italy', 'Norway', 'Poland', 'Portugal', 'Spain', 'Sweden', 'Switzerland', 'Czech Republic'],
    regions: {
      'Netherlands': ['Amsterdam'],
      'UK': ['London'],
      'Germany': ['Frankfurt', 'Munich', 'Düsseldorf'],
      'France': ['Paris', 'Marseille'],
      'Austria': ['Vienna'],
      'Belgium': ['Brussels'],
      'Denmark': ['Copenhagen'],
      'Finland': ['Helsinki'],
      'Ireland': ['Dublin'],
      'Italy': ['Milan'],
      'Norway': ['Oslo'],
      'Poland': ['Warsaw'],
      'Portugal': ['Lisbon'],
      'Spain': ['Madrid', 'Barcelona'],
      'Sweden': ['Stockholm'],
      'Switzerland': ['Zurich'],
      'Czech Republic': ['Prague'],
    }
  },
  { 
    name: 'Telehouse', 
    weight: 4, 
    types: ['Data Center', 'CO'], 
    countries: ['UK', 'France', 'Germany', 'US', 'Japan'],
    usStates: ['NY', 'CA'],
    regions: {
      'UK': ['London'],
      'France': ['Paris'],
      'Germany': ['Frankfurt'],
      'Japan': ['Tokyo'],
    }
  },
  { 
    name: 'Global Switch', 
    weight: 4, 
    types: ['Data Center'], 
    countries: ['UK', 'France', 'Germany', 'Netherlands', 'Singapore', 'Hong Kong', 'Australia', 'Spain'],
    regions: {
      'UK': ['London'],
      'France': ['Paris'],
      'Germany': ['Frankfurt'],
      'Netherlands': ['Amsterdam'],
      'Singapore': ['Singapore'],
      'Hong Kong': ['Hong Kong'],
      'Australia': ['Sydney'],
      'Spain': ['Madrid'],
    }
  },
  { 
    name: 'AtosOrigin', 
    weight: 3, 
    types: ['Data Center', 'CO'], 
    countries: ['France', 'Germany', 'UK', 'Netherlands', 'Belgium', 'Spain', 'Italy', 'Poland'],
    regions: {
      'France': ['Paris'],
      'Germany': ['Frankfurt'],
      'UK': ['London'],
      'Netherlands': ['Amsterdam'],
      'Belgium': ['Brussels'],
      'Spain': ['Madrid'],
      'Italy': ['Milan'],
      'Poland': ['Warsaw'],
    }
  },
  { 
    name: 'OVH', 
    weight: 5, 
    types: ['Data Center', 'CO'], 
    countries: ['France', 'UK', 'Germany', 'Poland', 'Canada', 'Singapore', 'Australia'],
    regions: {
      'France': ['Paris', 'Roubaix', 'Gravelines'],
      'UK': ['London'],
      'Germany': ['Frankfurt'],
      'Poland': ['Warsaw'],
      'Canada': ['Beauharnois'],
      'Singapore': ['Singapore'],
      'Australia': ['Sydney'],
    }
  },
  { 
    name: 'Hetzner', 
    weight: 3, 
    types: ['Data Center', 'CO'], 
    countries: ['Germany', 'Finland'],
    regions: {
      'Germany': ['Nuremberg', 'Falkenstein'],
      'Finland': ['Helsinki'],
    }
  },
  { 
    name: 'VIRTUS', 
    weight: 3, 
    types: ['Data Center'], 
    countries: ['UK'],
    regions: {
      'UK': ['London'],
    }
  },
  
  // LATAM Regional Operators
  { 
    name: 'Ascenty', 
    weight: 4, 
    types: ['Data Center', 'CO'], 
    countries: ['Brazil', 'Chile', 'Colombia', 'Argentina'],
    regions: {
      'Brazil': ['São Paulo', 'Rio de Janeiro', 'Fortaleza'],
      'Chile': ['Santiago'],
      'Colombia': ['Bogotá'],
      'Argentina': ['Buenos Aires'],
    }
  },
  { 
    name: 'ODATA', 
    weight: 3, 
    types: ['Data Center'], 
    countries: ['Brazil', 'Chile', 'Colombia', 'Mexico'],
    regions: {
      'Brazil': ['São Paulo'],
      'Chile': ['Santiago'],
      'Colombia': ['Bogotá'],
      'Mexico': ['Mexico City'],
    }
  },
  { 
    name: 'EdgeConneX', 
    weight: 4, 
    types: ['Data Center', 'POP'], 
    countries: ['US', 'Canada', 'Mexico', 'Brazil', 'Chile', 'Colombia', 'Argentina', 'UK', 'Netherlands', 'Germany', 'France', 'Italy', 'Poland', 'Japan', 'Singapore', 'Australia', 'India'],
    usStates: ['VA', 'TX', 'CA', 'IL', 'FL', 'NY', 'WA'],
    regions: {
      'Canada': ['Toronto'],
      'Mexico': ['Mexico City'],
      'Brazil': ['São Paulo'],
      'Chile': ['Santiago'],
      'Colombia': ['Bogotá'],
      'Argentina': ['Buenos Aires'],
      'UK': ['London'],
      'Netherlands': ['Amsterdam'],
      'Germany': ['Frankfurt'],
      'France': ['Paris'],
      'Italy': ['Milan'],
      'Poland': ['Warsaw'],
      'Japan': ['Tokyo'],
      'Singapore': ['Singapore'],
      'Australia': ['Sydney'],
      'India': ['Mumbai'],
    }
  },
  { 
    name: 'Scala Data Centers', 
    weight: 3, 
    types: ['Data Center'], 
    countries: ['Brazil', 'Chile', 'Colombia'],
    regions: {
      'Brazil': ['São Paulo'],
      'Chile': ['Santiago'],
      'Colombia': ['Bogotá'],
    }
  },
  
  // MEA Regional Operators
  { 
    name: 'Teraco', 
    weight: 3, 
    types: ['Data Center', 'CO'], 
    countries: ['South Africa', 'Kenya'],
    regions: {
      'South Africa': ['Johannesburg', 'Cape Town'],
      'Kenya': ['Nairobi'],
    }
  },
  { 
    name: 'Gulf Data Hub', 
    weight: 2, 
    types: ['Data Center'], 
    countries: ['UAE', 'Saudi Arabia', 'Qatar', 'Bahrain'],
    regions: {
      'UAE': ['Dubai', 'Abu Dhabi'],
      'Saudi Arabia': ['Riyadh', 'Jeddah'],
      'Qatar': ['Doha'],
      'Bahrain': ['Manama'],
    }
  },
  { 
    name: 'Etisalat', 
    weight: 2, 
    types: ['Data Center', 'CO', 'Switch'], 
    countries: ['UAE', 'Saudi Arabia', 'Egypt'],
    regions: {
      'UAE': ['Dubai', 'Abu Dhabi'],
      'Saudi Arabia': ['Riyadh'],
      'Egypt': ['Cairo'],
    }
  },
  { 
    name: 'STC', 
    weight: 2, 
    types: ['Data Center', 'CO', 'Switch'], 
    countries: ['Saudi Arabia', 'UAE', 'Kuwait'],
    regions: {
      'Saudi Arabia': ['Riyadh', 'Jeddah'],
      'UAE': ['Dubai'],
      'Kuwait': ['Kuwait City'],
    }
  },
  
  // Asian Cloud Providers
  { 
    name: 'Tencent Cloud', 
    weight: 7, 
    types: ['Data Center', 'POP'], 
    countries: ['China', 'Singapore', 'India', 'South Korea', 'Japan', 'US', 'Germany', 'Brazil', 'Thailand', 'Malaysia', 'Indonesia'],
    usStates: ['CA', 'VA'],
    regions: {
      'Singapore': ['Singapore'],
      'India': ['Mumbai'],
      'South Korea': ['Seoul'],
      'Japan': ['Tokyo'],
      'Germany': ['Frankfurt'],
      'Brazil': ['São Paulo'],
      'Thailand': ['Bangkok'],
      'Malaysia': ['Kuala Lumpur'],
      'Indonesia': ['Jakarta'],
    }
  },
  { 
    name: 'Alibaba Cloud', 
    weight: 7, 
    types: ['Data Center', 'POP'], 
    countries: ['China', 'Singapore', 'India', 'Japan', 'Australia', 'US', 'UK', 'Germany', 'UAE', 'Malaysia', 'Indonesia'],
    usStates: ['CA', 'VA'],
    regions: {
      'Singapore': ['Singapore'],
      'India': ['Mumbai'],
      'Japan': ['Tokyo'],
      'Australia': ['Sydney'],
      'UK': ['London'],
      'Germany': ['Frankfurt'],
      'UAE': ['Dubai'],
      'Malaysia': ['Kuala Lumpur'],
      'Indonesia': ['Jakarta'],
    }
  },
  
  // US Telecom Operators
  { 
    name: 'Lumen (CenturyLink)', 
    weight: 6, 
    types: ['CO', 'POP', 'Switch'], 
    countries: ['US', 'UK', 'Canada', 'Mexico'],
    usStates: ['CO', 'TX', 'CA', 'FL', 'GA', 'IL', 'NJ', 'VA', 'WA', 'AZ'],
    regions: {
      'UK': ['London'],
      'Canada': ['Toronto'],
      'Mexico': ['Mexico City'],
    }
  },
  { 
    name: 'AT&T', 
    weight: 5, 
    types: ['CO', 'POP', 'Switch'], 
    countries: ['US', 'UK', 'Mexico'],
    usStates: ['TX', 'CA', 'GA', 'FL', 'IL', 'NJ', 'NY', 'OH', 'PA', 'VA'],
    regions: {
      'UK': ['London'],
      'Mexico': ['Mexico City'],
    }
  },
  { 
    name: 'Verizon', 
    weight: 5, 
    types: ['CO', 'POP', 'Switch'], 
    countries: ['US', 'UK'],
    usStates: ['NJ', 'NY', 'TX', 'CA', 'VA', 'FL', 'GA', 'IL', 'PA', 'MA'],
    regions: {
      'UK': ['London'],
    }
  },
  
  // Regional US Operators
  { 
    name: 'Switch Inc', 
    weight: 4, 
    types: ['Switch', 'Data Center'], 
    countries: ['US'],
    usStates: ['NV', 'MI', 'GA', 'TX'],
  },
  { 
    name: 'CyrusOne', 
    weight: 5, 
    types: ['Data Center'], 
    countries: ['US', 'UK'],
    usStates: ['TX', 'AZ', 'OH', 'GA', 'NJ', 'VA', 'IL'],
    regions: {
      'UK': ['London'],
    }
  },
  { 
    name: 'QTS Realty', 
    weight: 5, 
    types: ['Data Center'], 
    countries: ['US'],
    usStates: ['VA', 'TX', 'GA', 'IL', 'NJ', 'OR', 'KS'],
  },
  { 
    name: 'CoreSite', 
    weight: 4, 
    types: ['Data Center', 'CO'], 
    countries: ['US'],
    usStates: ['CA', 'CO', 'VA', 'IL', 'MA', 'NJ', 'OH'],
  },
  { 
    name: 'Vantage Data Centers', 
    weight: 4, 
    types: ['Data Center'], 
    countries: ['US', 'Canada'],
    usStates: ['CA', 'VA', 'AZ', 'OH', 'TX', 'IL'],
    regions: {
      'Canada': ['Montreal'],
    }
  },
  { 
    name: 'DataBank', 
    weight: 3, 
    types: ['Data Center', 'CO'], 
    countries: ['US'],
    usStates: ['TX', 'MN', 'CO', 'UT', 'KS', 'IN', 'PA'],
  },
  { 
    name: 'Flexential', 
    weight: 3, 
    types: ['Data Center', 'CO'], 
    countries: ['US'],
    usStates: ['CO', 'TX', 'OR', 'GA', 'FL', 'NC', 'PA', 'OH'],
  },
  { 
    name: 'TierPoint', 
    weight: 3, 
    types: ['Data Center', 'CO'], 
    countries: ['US'],
    usStates: ['TX', 'MD', 'PA', 'WA', 'MO', 'OK', 'TN', 'NC'],
  },
  { 
    name: 'Iron Mountain', 
    weight: 3, 
    types: ['Data Center'], 
    countries: ['US', 'UK', 'Netherlands'],
    usStates: ['PA', 'NJ', 'MA', 'AZ', 'CO', 'KS', 'VA'],
    regions: {
      'UK': ['London'],
      'Netherlands': ['Amsterdam'],
    }
  },
  
  // Edge/CDN (mostly US with global POPs)
  { 
    name: 'Cloudflare', 
    weight: 2, 
    types: ['POP', 'Other'], 
    countries: ['US', 'UK', 'Germany', 'Netherlands', 'Singapore', 'Japan', 'Australia', 'Canada', 'France', 'Brazil', 'India', 'South Korea', 'Mexico', 'Italy', 'Spain'],
    usStates: ['CA', 'TX', 'VA', 'IL', 'GA', 'WA', 'NY', 'FL', 'NJ', 'AZ'],
    regions: {
      'UK': ['London'],
      'Germany': ['Frankfurt'],
      'Netherlands': ['Amsterdam'],
      'Singapore': ['Singapore'],
      'Japan': ['Tokyo'],
      'Australia': ['Sydney'],
      'Canada': ['Toronto'],
      'France': ['Paris'],
      'Brazil': ['São Paulo'],
      'India': ['Mumbai'],
      'South Korea': ['Seoul'],
      'Mexico': ['Mexico City'],
      'Italy': ['Milan'],
      'Spain': ['Madrid'],
    }
  },
  { 
    name: 'Akamai', 
    weight: 2, 
    types: ['POP', 'Other'], 
    countries: ['US', 'UK', 'Germany', 'Netherlands', 'Singapore', 'Japan', 'Australia', 'Canada', 'France'],
    usStates: ['MA', 'CA', 'TX', 'VA', 'IL', 'GA', 'WA', 'NY', 'FL', 'NJ'],
    regions: {
      'UK': ['London'],
      'Germany': ['Frankfurt'],
      'Netherlands': ['Amsterdam'],
      'Singapore': ['Singapore'],
      'Japan': ['Tokyo'],
      'Australia': ['Sydney'],
      'Canada': ['Toronto'],
      'France': ['Paris'],
    }
  },
  { 
    name: 'Fastly', 
    weight: 1, 
    types: ['POP', 'Other'], 
    countries: ['US', 'UK', 'Netherlands', 'Japan', 'Australia'],
    usStates: ['CA', 'TX', 'VA', 'IL', 'GA', 'WA', 'NY', 'NJ'],
    regions: {
      'UK': ['London'],
      'Netherlands': ['Amsterdam'],
      'Japan': ['Tokyo'],
      'Australia': ['Sydney'],
    }
  },
  
  // Other Tech Giants
  { 
    name: 'Oracle', 
    weight: 3, 
    types: ['Data Center'], 
    countries: ['US', 'UK', 'Germany', 'Japan', 'Australia', 'Canada'],
    usStates: ['TX', 'CA', 'VA', 'AZ', 'IL', 'NJ', 'UT'],
    regions: {
      'UK': ['London'],
      'Germany': ['Frankfurt'],
      'Japan': ['Tokyo'],
      'Australia': ['Sydney'],
      'Canada': ['Toronto'],
    }
  },
  { 
    name: 'IBM', 
    weight: 2, 
    types: ['Data Center', 'CO'], 
    countries: ['US', 'UK', 'Germany', 'Japan'],
    usStates: ['TX', 'NC', 'CO', 'CA', 'VA', 'NY'],
    regions: {
      'UK': ['London'],
      'Germany': ['Frankfurt'],
      'Japan': ['Tokyo'],
    }
  },
  { 
    name: 'Salesforce', 
    weight: 1, 
    types: ['Data Center'], 
    countries: ['US', 'UK', 'Japan', 'Australia'],
    usStates: ['CA', 'VA', 'TX', 'IL', 'WA'],
    regions: {
      'UK': ['London'],
      'Japan': ['Tokyo'],
      'Australia': ['Sydney'],
    }
  },
];

// Cities by country/region for realistic placement
const citiesByCountry: Record<string, Record<string, string[]>> = {
  'US': {
    'VA': ['Ashburn', 'Richmond', 'Manassas', 'Sterling', 'Reston', 'Herndon', 'Chantilly'],
    'TX': ['Dallas', 'Austin', 'Houston', 'San Antonio', 'Fort Worth', 'Plano', 'Irving'],
    'CA': ['San Jose', 'Los Angeles', 'San Francisco', 'Sacramento', 'Santa Clara', 'Fremont', 'Oakland'],
    'AZ': ['Phoenix', 'Mesa', 'Chandler', 'Tempe', 'Goodyear', 'Scottsdale'],
    'GA': ['Atlanta', 'Lithia Springs', 'Douglasville', 'College Park', 'Kennesaw'],
    'IL': ['Chicago', 'Aurora', 'Elk Grove Village', 'Northlake', 'Franklin Park'],
    'NC': ['Charlotte', 'Durham', 'Raleigh', 'Maiden', 'Forest City', 'Lenoir'],
    'OH': ['Columbus', 'New Albany', 'Dublin', 'Hilliard', 'Powell'],
    'NJ': ['Newark', 'Secaucus', 'Piscataway', 'Clifton', 'Weehawken'],
    'OR': ['Portland', 'Hillsboro', 'The Dalles', 'Prineville', 'Boardman'],
    'NV': ['Las Vegas', 'Reno', 'Henderson', 'North Las Vegas'],
    'WA': ['Seattle', 'Quincy', 'Moses Lake', 'Wenatchee', 'Tacoma'],
    'IA': ['Des Moines', 'Council Bluffs', 'Altoona', 'West Des Moines'],
    'NY': ['New York', 'Buffalo', 'Syracuse', 'Albany', 'White Plains'],
    'FL': ['Miami', 'Jacksonville', 'Tampa', 'Orlando', 'Fort Lauderdale'],
    'CO': ['Denver', 'Colorado Springs', 'Aurora', 'Boulder', 'Centennial'],
    'MA': ['Boston', 'Cambridge', 'Somerville', 'Andover', 'Marlborough'],
    'PA': ['Philadelphia', 'Pittsburgh', 'King of Prussia', 'Allentown'],
    'MI': ['Grand Rapids', 'Detroit', 'Lansing', 'Ann Arbor'],
    'UT': ['Salt Lake City', 'Eagle Mountain', 'West Jordan', 'Lehi'],
    'NM': ['Los Lunas', 'Albuquerque', 'Santa Fe', 'Rio Rancho'],
    'SC': ['Berkeley County', 'Charleston', 'Moncks Corner', 'Goose Creek'],
    'OK': ['Pryor Creek', 'Oklahoma City', 'Tulsa', 'Mayes County'],
    'NE': ['Papillion', 'Omaha', 'Lincoln', 'La Vista'],
    'IN': ['Indianapolis', 'Fort Wayne', 'New Albany', 'Jeffersonville'],
    'WY': ['Cheyenne', 'Casper', 'Laramie'],
    'KS': ['Kansas City', 'Lenexa', 'Overland Park', 'Olathe'],
    'MN': ['Minneapolis', 'Shakopee', 'Eagan', 'Eden Prairie'],
    'MO': ['Kansas City', 'St. Louis', 'Springfield'],
    'TN': ['Nashville', 'Memphis', 'Clarksville', 'Knoxville'],
    'MD': ['Baltimore', 'Columbia', 'Rockville', 'Annapolis'],
    'WI': ['Milwaukee', 'Madison', 'Green Bay', 'Kenosha'],
    'CT': ['Hartford', 'Stamford', 'New Haven', 'Bridgeport'],
    'AL': ['Birmingham', 'Huntsville', 'Mobile', 'Montgomery'],
    'MS': ['Jackson', 'Gulfport', 'Southaven', 'Hattiesburg'],
    'LA': ['New Orleans', 'Baton Rouge', 'Shreveport', 'Lafayette'],
    'AR': ['Little Rock', 'Fayetteville', 'Fort Smith', 'Jonesboro'],
    'KY': ['Louisville', 'Lexington', 'Bowling Green', 'Owensboro'],
    'WV': ['Charleston', 'Huntington', 'Morgantown', 'Parkersburg'],
    'DC': ['Washington'],
    'RI': ['Providence', 'Warwick', 'Cranston'],
    'DE': ['Wilmington', 'Dover', 'Newark'],
    'NH': ['Manchester', 'Nashua', 'Concord'],
    'ME': ['Portland', 'Lewiston', 'Bangor'],
    'VT': ['Burlington', 'Essex', 'South Burlington'],
    'AK': ['Anchorage', 'Fairbanks', 'Juneau'],
    'HI': ['Honolulu', 'Hilo', 'Kailua-Kona'],
    'ID': ['Boise', 'Nampa', 'Meridian'],
    'MT': ['Billings', 'Missoula', 'Great Falls'],
    'ND': ['Fargo', 'Bismarck', 'Grand Forks'],
    'SD': ['Sioux Falls', 'Rapid City', 'Aberdeen'],
  },
  // Americas
  'Canada': {
    'Ontario': ['Toronto', 'Ottawa'],
    'Quebec': ['Montreal', 'Beauharnois'],
    'British Columbia': ['Vancouver', 'Burnaby'],
    'Alberta': ['Calgary', 'Edmonton'],
  },
  'Brazil': {
    'São Paulo': ['São Paulo', 'Barueri', 'Cotia'],
    'Rio de Janeiro': ['Rio de Janeiro', 'Duque de Caxias'],
    'Minas Gerais': ['Belo Horizonte'],
    'Ceará': ['Fortaleza'],
  },
  'Mexico': {
    'Mexico City': ['Mexico City', 'Naucalpan'],
    'Jalisco': ['Guadalajara'],
    'Nuevo León': ['Monterrey'],
  },
  'Chile': {
    'Santiago': ['Santiago', 'Quilicura'],
    'Valparaíso': ['Valparaíso'],
  },
  'Colombia': {
    'Bogotá': ['Bogotá'],
    'Antioquia': ['Medellín'],
    'Valle del Cauca': ['Cali'],
  },
  'Argentina': {
    'Buenos Aires': ['Buenos Aires'],
    'Córdoba': ['Córdoba'],
  },
  // Europe
  'UK': {
    'England': ['London', 'Manchester', 'Slough', 'Reading', 'Maidstone'],
    'Scotland': ['Edinburgh', 'Glasgow'],
  },
  'Germany': {
    'Bavaria': ['Munich'],
    'Hesse': ['Frankfurt'],
    'Berlin': ['Berlin'],
    'Saxony': ['Falkenstein'],
    'North Rhine-Westphalia': ['Düsseldorf'],
    'Bavaria2': ['Nuremberg'],
  },
  'Netherlands': {
    'North Holland': ['Amsterdam'],
    'Groningen': ['Groningen', 'Eemshaven'],
  },
  'France': {
    'Île-de-France': ['Paris'],
    'Hauts-de-France': ['Roubaix', 'Gravelines'],
    'Provence-Alpes-Côte d\'Azur': ['Marseille'],
  },
  'Ireland': {
    'Dublin': ['Dublin', 'Clonee', 'Louth'],
    'Cork': ['Cork'],
    'Galway': ['Athenry'],
  },
  'Sweden': {
    'Stockholm': ['Stockholm'],
    'Norrbotten': ['Luleå'],
  },
  'Switzerland': {
    'Zurich': ['Zurich'],
    'Geneva': ['Geneva'],
  },
  'Spain': {
    'Madrid': ['Madrid'],
    'Catalonia': ['Barcelona'],
  },
  'Italy': {
    'Lombardy': ['Milan'],
    'Lazio': ['Rome'],
  },
  'Poland': {
    'Masovian': ['Warsaw'],
    'Silesian': ['Katowice'],
  },
  'Denmark': {
    'Central Jutland': ['Odense'],
    'North Jutland': ['Viborg'],
  },
  'Norway': {
    'Oslo': ['Oslo'],
    'Akershus': ['Bærum'],
  },
  'Finland': {
    'Uusimaa': ['Helsinki'],
    'Kymenlaakso': ['Hamina'],
  },
  'Belgium': {
    'Brussels': ['Brussels'],
    'Hainaut': ['St. Ghislain'],
  },
  'Austria': {
    'Vienna': ['Vienna'],
  },
  'Portugal': {
    'Lisbon': ['Lisbon'],
  },
  'Czech Republic': {
    'Prague': ['Prague'],
  },
  // Asia-Pacific
  'Japan': {
    'Tokyo': ['Tokyo', 'Chiba'],
    'Osaka': ['Osaka'],
  },
  'Singapore': {
    'Singapore': ['Singapore'],
  },
  'Hong Kong': {
    'Hong Kong': ['Hong Kong'],
  },
  'Australia': {
    'New South Wales': ['Sydney'],
    'Victoria': ['Melbourne'],
    'Western Australia': ['Perth'],
    'Queensland': ['Brisbane'],
  },
  'India': {
    'Maharashtra': ['Mumbai', 'Pune'],
    'Karnataka': ['Bangalore'],
    'Delhi': ['New Delhi'],
    'Tamil Nadu': ['Chennai'],
  },
  'South Korea': {
    'Seoul': ['Seoul'],
    'Gyeonggi': ['Goyang'],
  },
  'China': {
    'Beijing': ['Beijing'],
    'Shanghai': ['Shanghai'],
    'Guangdong': ['Shenzhen', 'Guangzhou'],
  },
  'Taiwan': {
    'Changhua': ['Changhua'],
    'Taipei': ['Taipei'],
  },
  'Indonesia': {
    'Jakarta': ['Jakarta'],
    'West Java': ['Bekasi'],
  },
  'Malaysia': {
    'Kuala Lumpur': ['Kuala Lumpur'],
    'Selangor': ['Cyberjaya'],
  },
  'Thailand': {
    'Bangkok': ['Bangkok'],
    'Samut Prakan': ['Samut Prakan'],
  },
  'Philippines': {
    'Manila': ['Manila'],
    'Metro Manila': ['Makati'],
  },
  'Vietnam': {
    'Ho Chi Minh City': ['Ho Chi Minh City'],
    'Hanoi': ['Hanoi'],
  },
  'New Zealand': {
    'Auckland': ['Auckland'],
    'Wellington': ['Wellington'],
  },
  // Middle East & Africa
  'UAE': {
    'Dubai': ['Dubai'],
    'Abu Dhabi': ['Abu Dhabi'],
  },
  'Saudi Arabia': {
    'Riyadh': ['Riyadh'],
    'Makkah': ['Jeddah'],
  },
  'Israel': {
    'Tel Aviv': ['Tel Aviv'],
    'Jerusalem': ['Jerusalem'],
  },
  'South Africa': {
    'Gauteng': ['Johannesburg'],
    'Western Cape': ['Cape Town'],
  },
  'Kenya': {
    'Nairobi': ['Nairobi'],
    'Mombasa': ['Mombasa'],
  },
  'Nigeria': {
    'Lagos': ['Lagos'],
    'Abuja': ['Abuja'],
  },
  'Egypt': {
    'Cairo': ['Cairo'],
    'Alexandria': ['Alexandria'],
  },
  'Qatar': {
    'Doha': ['Doha'],
  },
  'Bahrain': {
    'Manama': ['Manama'],
  },
};

// Default cities for countries/regions not in the detailed list
const defaultCities: Record<string, string[]> = {
  'US': ['Metro Area', 'Industrial Park', 'Tech Center', 'Business District'],
  'default': ['City Center', 'Business District', 'Industrial Zone'],
};

// Country to state/region mapping for non-US countries
const countryRegions: Record<string, string[]> = {
  // Americas
  'Canada': ['Ontario', 'Quebec', 'British Columbia', 'Alberta'],
  'Brazil': ['São Paulo', 'Rio de Janeiro', 'Minas Gerais', 'Ceará'],
  'Mexico': ['Mexico City', 'Jalisco', 'Nuevo León'],
  'Chile': ['Santiago', 'Valparaíso'],
  'Colombia': ['Bogotá', 'Antioquia', 'Valle del Cauca'],
  'Argentina': ['Buenos Aires', 'Córdoba'],
  // Europe
  'UK': ['England', 'Scotland'],
  'Germany': ['Bavaria', 'Hesse', 'Berlin', 'Saxony', 'North Rhine-Westphalia', 'Bavaria2'],
  'Netherlands': ['North Holland', 'Groningen'],
  'France': ['Île-de-France', 'Hauts-de-France', 'Provence-Alpes-Côte d\'Azur'],
  'Ireland': ['Dublin', 'Cork', 'Galway'],
  'Sweden': ['Stockholm', 'Norrbotten'],
  'Switzerland': ['Zurich', 'Geneva'],
  'Spain': ['Madrid', 'Catalonia'],
  'Italy': ['Lombardy', 'Lazio'],
  'Poland': ['Masovian', 'Silesian'],
  'Denmark': ['Central Jutland', 'North Jutland'],
  'Norway': ['Oslo', 'Akershus'],
  'Finland': ['Uusimaa', 'Kymenlaakso'],
  'Belgium': ['Brussels', 'Hainaut'],
  'Austria': ['Vienna'],
  'Portugal': ['Lisbon'],
  'Czech Republic': ['Prague'],
  // Asia-Pacific
  'Japan': ['Tokyo', 'Osaka'],
  'Singapore': ['Singapore'],
  'Hong Kong': ['Hong Kong'],
  'Australia': ['New South Wales', 'Victoria', 'Western Australia', 'Queensland'],
  'India': ['Maharashtra', 'Karnataka', 'Delhi', 'Tamil Nadu'],
  'South Korea': ['Seoul', 'Gyeonggi'],
  'China': ['Beijing', 'Shanghai', 'Guangdong'],
  'Taiwan': ['Changhua', 'Taipei'],
  'Indonesia': ['Jakarta', 'West Java'],
  'Malaysia': ['Kuala Lumpur', 'Selangor'],
  'Thailand': ['Bangkok', 'Samut Prakan'],
  'Philippines': ['Manila', 'Metro Manila'],
  'Vietnam': ['Ho Chi Minh City', 'Hanoi'],
  'New Zealand': ['Auckland', 'Wellington'],
  // Middle East & Africa
  'UAE': ['Dubai', 'Abu Dhabi'],
  'Saudi Arabia': ['Riyadh', 'Makkah'],
  'Israel': ['Tel Aviv', 'Jerusalem'],
  'South Africa': ['Gauteng', 'Western Cape'],
  'Kenya': ['Nairobi', 'Mombasa'],
  'Nigeria': ['Lagos', 'Abuja'],
  'Egypt': ['Cairo', 'Alexandria'],
  'Qatar': ['Doha'],
  'Bahrain': ['Manama'],
};

// Market distribution weights (proportional to real market presence)
// Distribution: US ~50%, Europe ~25%, APAC ~20%, LATAM ~3%, MEA ~2%
const countryWeights: Record<string, number> = {
  // Americas (56% total)
  'US': 50,
  'Canada': 3,
  'Brazil': 1.5,
  'Mexico': 0.8,
  'Chile': 0.3,
  'Colombia': 0.3,
  'Argentina': 0.1,
  // Europe (25% total)
  'UK': 6,
  'Germany': 5,
  'Netherlands': 2.5,
  'France': 2.5,
  'Ireland': 1.5,
  'Sweden': 1.5,
  'Switzerland': 1.2,
  'Spain': 1.2,
  'Italy': 1.2,
  'Poland': 0.8,
  'Denmark': 0.5,
  'Norway': 0.5,
  'Finland': 0.5,
  'Belgium': 0.5,
  'Austria': 0.3,
  'Portugal': 0.3,
  'Czech Republic': 0.2,
  // Asia-Pacific (16% total)
  'Japan': 4,
  'Singapore': 3,
  'Australia': 2,
  'India': 2,
  'Hong Kong': 1,
  'South Korea': 1,
  'China': 1.5,
  'Taiwan': 0.5,
  'Indonesia': 0.3,
  'Malaysia': 0.3,
  'Thailand': 0.2,
  'Philippines': 0.2,
  'Vietnam': 0.2,
  'New Zealand': 0.2,
  // Middle East & Africa (3% total)
  'UAE': 1,
  'Saudi Arabia': 0.6,
  'Israel': 0.4,
  'South Africa': 0.5,
  'Kenya': 0.2,
  'Nigeria': 0.2,
  'Egypt': 0.1,
  'Qatar': 0.1,
  'Bahrain': 0.1,
};

const issueTypes = [
  'Missing documentation',
  'Outdated equipment',
  'Safety violations',
  'Environmental concerns',
  'Regulatory gaps',
  'Maintenance overdue',
  'Job creation shortfall',
  'Investment commitment gap',
  'Local hiring violation',
  'Energy efficiency non-compliance',
  'Tax incentive misuse',
  'Reporting deadline missed',
];

// Compliance profiles by operator type
const complianceProfiles: Record<string, { compliant: number; nonCompliant: number; atRisk: number; unknown: number }> = {
  'Meta': { compliant: 0.3, nonCompliant: 0.4, atRisk: 0.2, unknown: 0.1 },
  'Amazon Web Services': { compliant: 0.5, nonCompliant: 0.25, atRisk: 0.15, unknown: 0.1 },
  'Microsoft Azure': { compliant: 0.55, nonCompliant: 0.2, atRisk: 0.15, unknown: 0.1 },
  'Google Cloud': { compliant: 0.5, nonCompliant: 0.25, atRisk: 0.15, unknown: 0.1 },
  'Switch Inc': { compliant: 0.15, nonCompliant: 0.6, atRisk: 0.2, unknown: 0.05 },
  'Equinix': { compliant: 0.6, nonCompliant: 0.15, atRisk: 0.15, unknown: 0.1 },
  'Digital Realty': { compliant: 0.55, nonCompliant: 0.2, atRisk: 0.15, unknown: 0.1 },
  'NTT': { compliant: 0.55, nonCompliant: 0.2, atRisk: 0.15, unknown: 0.1 },
  'STT GDC': { compliant: 0.5, nonCompliant: 0.2, atRisk: 0.2, unknown: 0.1 },
  'Tencent Cloud': { compliant: 0.45, nonCompliant: 0.25, atRisk: 0.2, unknown: 0.1 },
  'Alibaba Cloud': { compliant: 0.45, nonCompliant: 0.25, atRisk: 0.2, unknown: 0.1 },
  'OVH': { compliant: 0.5, nonCompliant: 0.2, atRisk: 0.2, unknown: 0.1 },
  'Interxion': { compliant: 0.55, nonCompliant: 0.2, atRisk: 0.15, unknown: 0.1 },
  'Ascenty': { compliant: 0.5, nonCompliant: 0.2, atRisk: 0.2, unknown: 0.1 },
  'Teraco': { compliant: 0.5, nonCompliant: 0.2, atRisk: 0.2, unknown: 0.1 },
  'default': { compliant: 0.4, nonCompliant: 0.3, atRisk: 0.2, unknown: 0.1 },
};

// Subsidy gap ranges by operator (in USD)
const subsidyGapProfiles: Record<string, { min: number; max: number; nonCompliantMultiplier: number }> = {
  'Meta': { min: 50000, max: 2000000, nonCompliantMultiplier: 3 },
  'Amazon Web Services': { min: 25000, max: 1500000, nonCompliantMultiplier: 2.5 },
  'Microsoft Azure': { min: 25000, max: 1500000, nonCompliantMultiplier: 2.5 },
  'Google Cloud': { min: 30000, max: 1800000, nonCompliantMultiplier: 2.5 },
  'Switch Inc': { min: 100000, max: 5000000, nonCompliantMultiplier: 4 },
  'Equinix': { min: 10000, max: 500000, nonCompliantMultiplier: 2 },
  'Digital Realty': { min: 15000, max: 600000, nonCompliantMultiplier: 2 },
  'NTT': { min: 20000, max: 800000, nonCompliantMultiplier: 2.5 },
  'STT GDC': { min: 20000, max: 700000, nonCompliantMultiplier: 2.5 },
  'Tencent Cloud': { min: 30000, max: 1000000, nonCompliantMultiplier: 2.5 },
  'Alibaba Cloud': { min: 30000, max: 1000000, nonCompliantMultiplier: 2.5 },
  'OVH': { min: 15000, max: 500000, nonCompliantMultiplier: 2 },
  'Interxion': { min: 15000, max: 500000, nonCompliantMultiplier: 2 },
  'Ascenty': { min: 15000, max: 400000, nonCompliantMultiplier: 2 },
  'Teraco': { min: 15000, max: 400000, nonCompliantMultiplier: 2 },
  'default': { min: 5000, max: 500000, nonCompliantMultiplier: 2 },
};

// Approximate coordinates for major markets
const countryCoordinates: Record<string, Record<string, { lat: number; lng: number; spread: number }>> = {
  // Americas
  'US': {
    'VA': { lat: 39.0, lng: -77.4, spread: 0.5 },
    'TX': { lat: 32.8, lng: -96.8, spread: 2.0 },
    'CA': { lat: 37.4, lng: -122.0, spread: 1.5 },
    'AZ': { lat: 33.4, lng: -112.1, spread: 1.0 },
    'GA': { lat: 33.8, lng: -84.4, spread: 1.0 },
    'IL': { lat: 41.9, lng: -87.6, spread: 1.0 },
    'NC': { lat: 35.2, lng: -80.8, spread: 1.0 },
    'OH': { lat: 39.9, lng: -82.9, spread: 1.0 },
    'NJ': { lat: 40.7, lng: -74.2, spread: 0.5 },
    'OR': { lat: 45.5, lng: -122.7, spread: 1.0 },
    'NV': { lat: 36.2, lng: -115.1, spread: 1.0 },
    'WA': { lat: 47.6, lng: -122.3, spread: 1.0 },
    'IA': { lat: 41.6, lng: -93.6, spread: 1.0 },
    'NY': { lat: 40.7, lng: -74.0, spread: 1.0 },
    'FL': { lat: 25.8, lng: -80.2, spread: 2.0 },
    'CO': { lat: 39.7, lng: -105.0, spread: 1.0 },
    'MA': { lat: 42.4, lng: -71.1, spread: 0.5 },
    'PA': { lat: 40.0, lng: -75.2, spread: 1.0 },
    'MI': { lat: 42.3, lng: -83.0, spread: 1.0 },
    'UT': { lat: 40.8, lng: -111.9, spread: 0.5 },
    'NM': { lat: 35.1, lng: -106.6, spread: 0.5 },
    'SC': { lat: 32.8, lng: -79.9, spread: 1.0 },
    'OK': { lat: 35.5, lng: -97.5, spread: 1.0 },
    'NE': { lat: 41.3, lng: -96.0, spread: 0.5 },
    'IN': { lat: 39.8, lng: -86.1, spread: 0.5 },
    'WY': { lat: 41.1, lng: -104.8, spread: 1.0 },
    'KS': { lat: 39.1, lng: -94.6, spread: 0.5 },
    'MN': { lat: 44.9, lng: -93.2, spread: 0.5 },
    'MO': { lat: 39.1, lng: -94.6, spread: 0.5 },
    'TN': { lat: 36.2, lng: -86.8, spread: 1.0 },
    'MD': { lat: 39.3, lng: -76.6, spread: 0.5 },
    'WI': { lat: 43.1, lng: -87.9, spread: 0.5 },
    'CT': { lat: 41.8, lng: -72.7, spread: 0.5 },
    'AL': { lat: 33.5, lng: -86.8, spread: 0.5 },
    'MS': { lat: 32.3, lng: -90.2, spread: 0.5 },
    'LA': { lat: 30.0, lng: -90.1, spread: 0.5 },
    'AR': { lat: 34.7, lng: -92.3, spread: 0.5 },
    'KY': { lat: 38.3, lng: -85.7, spread: 0.5 },
    'WV': { lat: 38.4, lng: -81.6, spread: 0.5 },
    'DC': { lat: 38.9, lng: -77.0, spread: 0.2 },
    'RI': { lat: 41.8, lng: -71.4, spread: 0.3 },
    'DE': { lat: 39.2, lng: -75.5, spread: 0.3 },
    'NH': { lat: 42.9, lng: -71.4, spread: 0.3 },
    'ME': { lat: 43.7, lng: -70.3, spread: 0.3 },
    'VT': { lat: 44.3, lng: -73.2, spread: 0.3 },
    'AK': { lat: 61.2, lng: -149.9, spread: 0.5 },
    'HI': { lat: 21.3, lng: -157.8, spread: 0.5 },
    'ID': { lat: 43.6, lng: -116.2, spread: 0.5 },
    'MT': { lat: 46.0, lng: -112.5, spread: 1.0 },
    'ND': { lat: 46.8, lng: -96.8, spread: 0.5 },
    'SD': { lat: 43.5, lng: -96.7, spread: 0.5 },
    'default': { lat: 39.0, lng: -98.0, spread: 5.0 },
  },
  'Canada': { 'default': { lat: 43.7, lng: -79.4, spread: 3.0 } },
  'Brazil': { 'default': { lat: -23.6, lng: -46.6, spread: 2.0 } },
  'Mexico': { 'default': { lat: 19.4, lng: -99.1, spread: 1.5 } },
  'Chile': { 'default': { lat: -33.4, lng: -70.6, spread: 1.0 } },
  'Colombia': { 'default': { lat: 4.7, lng: -74.1, spread: 1.0 } },
  'Argentina': { 'default': { lat: -34.6, lng: -58.4, spread: 1.0 } },
  // Europe
  'UK': { 'default': { lat: 51.5, lng: -0.1, spread: 2.0 } },
  'Germany': { 'default': { lat: 50.1, lng: 8.7, spread: 3.0 } },
  'Netherlands': { 'default': { lat: 52.4, lng: 4.9, spread: 1.0 } },
  'France': { 'default': { lat: 48.9, lng: 2.4, spread: 1.5 } },
  'Ireland': { 'default': { lat: 53.3, lng: -6.3, spread: 1.0 } },
  'Sweden': { 'default': { lat: 59.3, lng: 18.1, spread: 1.5 } },
  'Switzerland': { 'default': { lat: 47.4, lng: 8.5, spread: 1.0 } },
  'Spain': { 'default': { lat: 40.4, lng: -3.7, spread: 2.0 } },
  'Italy': { 'default': { lat: 45.5, lng: 9.2, spread: 1.5 } },
  'Poland': { 'default': { lat: 52.2, lng: 21.0, spread: 1.0 } },
  'Denmark': { 'default': { lat: 55.7, lng: 12.6, spread: 1.0 } },
  'Norway': { 'default': { lat: 59.9, lng: 10.8, spread: 1.0 } },
  'Finland': { 'default': { lat: 60.2, lng: 24.9, spread: 1.5 } },
  'Belgium': { 'default': { lat: 50.8, lng: 4.3, spread: 0.5 } },
  'Austria': { 'default': { lat: 48.2, lng: 16.4, spread: 0.5 } },
  'Portugal': { 'default': { lat: 38.7, lng: -9.1, spread: 0.5 } },
  'Czech Republic': { 'default': { lat: 50.1, lng: 14.4, spread: 0.5 } },
  // Asia-Pacific
  'Japan': { 'default': { lat: 35.7, lng: 139.7, spread: 1.5 } },
  'Singapore': { 'default': { lat: 1.3, lng: 103.8, spread: 0.2 } },
  'Hong Kong': { 'default': { lat: 22.3, lng: 114.2, spread: 0.3 } },
  'Australia': { 'default': { lat: -33.9, lng: 151.2, spread: 2.0 } },
  'India': { 'default': { lat: 19.1, lng: 72.9, spread: 2.0 } },
  'South Korea': { 'default': { lat: 37.6, lng: 127.0, spread: 1.0 } },
  'China': { 'default': { lat: 39.9, lng: 116.4, spread: 2.0 } },
  'Taiwan': { 'default': { lat: 25.0, lng: 121.5, spread: 1.0 } },
  'Indonesia': { 'default': { lat: -6.2, lng: 106.8, spread: 1.0 } },
  'Malaysia': { 'default': { lat: 3.1, lng: 101.7, spread: 0.5 } },
  'Thailand': { 'default': { lat: 13.8, lng: 100.5, spread: 1.0 } },
  'Philippines': { 'default': { lat: 14.6, lng: 120.9, spread: 0.5 } },
  'Vietnam': { 'default': { lat: 10.8, lng: 106.6, spread: 0.5 } },
  'New Zealand': { 'default': { lat: -36.8, lng: 174.8, spread: 1.0 } },
  // Middle East & Africa
  'UAE': { 'default': { lat: 25.2, lng: 55.3, spread: 0.5 } },
  'Saudi Arabia': { 'default': { lat: 24.7, lng: 46.7, spread: 1.0 } },
  'Israel': { 'default': { lat: 32.1, lng: 34.8, spread: 0.5 } },
  'South Africa': { 'default': { lat: -26.2, lng: 28.0, spread: 1.5 } },
  'Kenya': { 'default': { lat: -1.3, lng: 36.8, spread: 0.5 } },
  'Nigeria': { 'default': { lat: 6.5, lng: 3.4, spread: 0.5 } },
  'Egypt': { 'default': { lat: 30.0, lng: 31.2, spread: 0.5 } },
  'Qatar': { 'default': { lat: 25.3, lng: 51.5, spread: 0.2 } },
  'Bahrain': { 'default': { lat: 26.2, lng: 50.6, spread: 0.2 } },
};

function getWeightedRandomCountry(): string {
  const totalWeight = Object.values(countryWeights).reduce((sum, w) => sum + w, 0);
  let random = Math.random() * totalWeight;
  
  for (const [country, weight] of Object.entries(countryWeights)) {
    random -= weight;
    if (random <= 0) {
      return country;
    }
  }
  return 'US';
}

function getWeightedRandomOperator(): OperatorConfig {
  const totalWeight = operators.reduce((sum, op) => sum + op.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const operator of operators) {
    random -= operator.weight;
    if (random <= 0) {
      return operator;
    }
  }
  return operators[0];
}

function getCountryForOperator(operator: OperatorConfig, targetCountry?: string): string {
  if (targetCountry && operator.countries.includes(targetCountry)) {
    return targetCountry;
  }
  
  // Weighted selection based on operator presence
  const availableCountries = operator.countries;
  if (availableCountries.length === 0) return 'US';
  
  // Simple weighted selection (can be enhanced)
  const index = Math.floor(Math.random() * availableCountries.length);
  return availableCountries[index];
}

// All 50 US states + DC for comprehensive coverage
const ALL_US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY', 'DC'
];

function getStateOrRegion(country: string, operator: OperatorConfig): string {
  if (country === 'US') {
    // First try operator-specific states (for realistic distribution)
    if (operator.usStates && operator.usStates.length > 0) {
      // 70% chance to use operator-specific state, 30% chance to use any US state
      if (Math.random() < 0.7) {
        return operator.usStates[Math.floor(Math.random() * operator.usStates.length)];
      }
    }
    // Fallback to any US state for comprehensive coverage
    return ALL_US_STATES[Math.floor(Math.random() * ALL_US_STATES.length)];
  }
  
  // For non-US countries, use regions
  const regions = countryRegions[country] || [];
  if (regions.length > 0) {
    return regions[Math.floor(Math.random() * regions.length)];
  }
  
  // Fallback: use country name as region
  return country;
}

// Default city names for states without specific cities
const getDefaultCityForState = (state: string): string => {
  const defaultCityMap: Record<string, string[]> = {
    'AL': ['Birmingham', 'Montgomery', 'Huntsville'],
    'MS': ['Jackson', 'Gulfport', 'Biloxi'],
    'LA': ['New Orleans', 'Baton Rouge', 'Lafayette'],
    'AR': ['Little Rock', 'Fayetteville', 'Springdale'],
    'KY': ['Louisville', 'Lexington', 'Bowling Green'],
    'WV': ['Charleston', 'Huntington', 'Morgantown'],
    'DC': ['Washington'],
    'RI': ['Providence', 'Warwick', 'Cranston'],
    'DE': ['Wilmington', 'Dover', 'Newark'],
    'NH': ['Manchester', 'Nashua', 'Concord'],
    'ME': ['Portland', 'Lewiston', 'Bangor'],
    'VT': ['Burlington', 'Essex', 'Rutland'],
    'AK': ['Anchorage', 'Fairbanks', 'Juneau'],
    'HI': ['Honolulu', 'Hilo', 'Kailua'],
    'ID': ['Boise', 'Nampa', 'Meridian'],
    'MT': ['Billings', 'Missoula', 'Great Falls'],
    'ND': ['Fargo', 'Bismarck', 'Grand Forks'],
    'SD': ['Sioux Falls', 'Rapid City', 'Aberdeen'],
  };
  const cities = defaultCityMap[state];
  if (cities && cities.length > 0) {
    return cities[Math.floor(Math.random() * cities.length)];
  }
  // Generic fallback
  return `${state} City`;
};

function getCity(country: string, stateOrRegion: string, operator: OperatorConfig): string {
  const countryCities = citiesByCountry[country];
  
  // For US states, check if we have cities for this state
  if (country === 'US' && countryCities) {
    const stateCities = countryCities[stateOrRegion];
    if (stateCities && stateCities.length > 0) {
      return stateCities[Math.floor(Math.random() * stateCities.length)];
    }
    // Use default city generator for US states without specific cities
    return getDefaultCityForState(stateOrRegion);
  }
  
  if (!countryCities) {
    const defaults = defaultCities[country] || defaultCities['default'];
    return defaults[Math.floor(Math.random() * defaults.length)];
  }
  
  // Check if operator has specific regions for this country
  if (operator.regions && operator.regions[country]) {
    const operatorCities = operator.regions[country];
    if (operatorCities.length > 0) {
      return operatorCities[Math.floor(Math.random() * operatorCities.length)];
    }
  }
  
  const stateCities = countryCities[stateOrRegion];
  if (stateCities && stateCities.length > 0) {
    return stateCities[Math.floor(Math.random() * stateCities.length)];
  }
  
  const defaults = defaultCities[country] || defaultCities['default'];
  return defaults[Math.floor(Math.random() * defaults.length)];
}

function getComplianceStatus(operatorName: string): Facility['complianceStatus'] {
  const profile = complianceProfiles[operatorName] || complianceProfiles['default'];
  const random = Math.random();
  
  if (random < profile.compliant) return 'Compliant';
  if (random < profile.compliant + profile.nonCompliant) return 'Non-Compliant';
  if (random < profile.compliant + profile.nonCompliant + profile.atRisk) return 'At Risk';
  return 'Unknown';
}

function getSubsidyGap(operatorName: string, complianceStatus: Facility['complianceStatus']): number {
  const profile = subsidyGapProfiles[operatorName] || subsidyGapProfiles['default'];
  let baseGap = Math.floor(Math.random() * (profile.max - profile.min)) + profile.min;
  
  if (complianceStatus === 'Compliant') {
    return 0;
  } else if (complianceStatus === 'Non-Compliant') {
    return Math.floor(baseGap * profile.nonCompliantMultiplier);
  } else if (complianceStatus === 'At Risk') {
    return Math.floor(baseGap * 0.5);
  }
  return Math.floor(baseGap * 0.25);
}

function getCoordinates(country: string, stateOrRegion: string): { lat: number; lng: number } {
  const countryCoords = countryCoordinates[country];
  if (!countryCoords) {
    return { lat: 0, lng: 0 };
  }
  
  const stateCoords = countryCoords[stateOrRegion] || countryCoords['default'];
  if (!stateCoords) {
    return { lat: 0, lng: 0 };
  }
  
  const latitude = stateCoords.lat + (Math.random() - 0.5) * stateCoords.spread * 2;
  const longitude = stateCoords.lng + (Math.random() - 0.5) * stateCoords.spread * 2;
  
  return { lat: latitude, lng: longitude };
}

function generateFacility(id: number): Facility {
  // First determine target country (weighted by market presence)
  const targetCountry = getWeightedRandomCountry();
  
  // Get operator that operates in that country
  const operator = getWeightedRandomOperator();
  const country = getCountryForOperator(operator, targetCountry);
  
  const stateOrRegion = getStateOrRegion(country, operator);
  const city = getCity(country, stateOrRegion, operator);
  const type = operator.types[Math.floor(Math.random() * operator.types.length)] as Facility['type'];
  const complianceStatus = getComplianceStatus(operator.name);
  const subsidyGap = getSubsidyGap(operator.name, complianceStatus);
  
  const issueCount = complianceStatus === 'Compliant' ? 0 : Math.floor(Math.random() * 4) + 1;
  const issues = Array.from({ length: issueCount }, () =>
    issueTypes[Math.floor(Math.random() * issueTypes.length)]
  );

  const daysAgo = Math.floor(Math.random() * 365);
  const lastAuditDate = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const coords = getCoordinates(country, stateOrRegion);

  // Generate realistic facility name
  const facilityNumber = (id % 100) + 1;
  const name = `${operator.name} ${city} ${type} ${facilityNumber}`;

  const bgp = computeDemoBgpFields(id, subsidyGap, complianceStatus);

  return {
    id,
    name,
    type,
    operator: operator.name,
    country,
    state: stateOrRegion, // For US this is state code, for others it's region name
    city,
    complianceStatus,
    subsidyGap,
    lastAuditDate,
    issues,
    latitude: coords.lat,
    longitude: coords.lng,
    ...bgp,
  };
}

export interface SeedResult {
  seeded: boolean;
  reason: 'live-mode-noop' | 'demo-already-populated' | 'demo-seeded' | 'demo-replaced';
}

export interface SeedOptions {
  /**
   * Explicit, deliberate replacement of an existing demo dataset. Never set
   * from startup paths; only a direct user action may pass this.
   */
  replaceExisting?: boolean;
}

/**
 * R-F1: safe seeding.
 *
 * - Startup NEVER seeds or clears the live store: outside explicit demo mode
 *   this function is a strict no-op (no reads promoted to writes, no
 *   count/coverage heuristics that can trigger a clear).
 * - Demo data lives only in the explicitly-selected demo namespace
 *   (VITE_DEMO_MODE=true opens 'ComplianceDatabase_demo'; see demoMode.ts).
 * - A populated demo store is never cleared implicitly; replacement requires
 *   the explicit `replaceExisting` option and happens in ONE transaction.
 * - The fixed-ID curated row (11992) is written only as part of that seed
 *   transaction via add(); no existing primary key is overwritten.
 */
export async function seedDatabase(options: SeedOptions = {}): Promise<SeedResult> {
  if (!isDemoMode()) {
    return { seeded: false, reason: 'live-mode-noop' };
  }

  const count = await db.facilities.count();
  if (count > 0 && !options.replaceExisting) {
    return { seeded: false, reason: 'demo-already-populated' };
  }

  // Generated rows occupy IDs 1..11991; the curated case-study row holds the
  // reserved fixed ID 11992, for a total of 11992 demo rows.
  const facilities: Facility[] = [];
  for (let i = 1; i < PRINCE_WILLIAM_CLUSTER_FACILITY_ID; i++) {
    facilities.push(generateFacility(i));
  }

  await db.transaction('rw', db.facilities, async () => {
    if (options.replaceExisting) {
      await db.facilities.clear();
    }
    await db.facilities.bulkAdd(facilities);
    await db.facilities.add(buildPrinceWilliamClusterFacility());
  });

  return { seeded: true, reason: options.replaceExisting ? 'demo-replaced' : 'demo-seeded' };
}
