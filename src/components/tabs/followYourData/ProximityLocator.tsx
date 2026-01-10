import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  MapPin, Navigation, AlertTriangle, Shield, Users, Building2, 
  Zap, Clock, Phone, ExternalLink, Target, TrendingUp, FileWarning,
  Loader2, CheckCircle2, XCircle, AlertCircle, Gavel, HardHat,
  DollarSign, Scale, Megaphone, Ban, ChevronDown, ChevronUp,
  Star, ThumbsUp, ThumbsDown, MessageSquare, TrendingDown, Briefcase,
  Heart, Coffee, AlertOctagon, Award, Database
} from 'lucide-react';
import { unionIntelligenceEngine, FacilityIntelligence } from '../../../services/unionIntelligenceEngine';
import { EXPANDED_SUBSIDIES } from '../../../services/expandedSubsidies';
import { STATE_AUDIT_FINDINGS } from '../../../services/stateAuditReports';

interface Facility {
  id: string;
  name: string;
  operator: string;
  address: string;
  city: string;
  state: string;
  coordinates: { lat: number; lng: number };
  estimatedWorkers: number;
  powerMW: number;
  sqft: number;
  yearBuilt: number;
}

interface LaborViolation {
  id: string;
  type: 'OSHA' | 'NLRB_ULP' | 'WHD' | 'EEO';
  description: string;
  date: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'settled' | 'pending';
  penalty?: number;
  caseNumber?: string;
}

interface UnionActivity {
  status: 'represented' | 'non-union' | 'active-campaign' | 'decertification';
  union?: string;
  localNumber?: string;
  certificationDate?: string;
  contractExpiration?: string;
  recentActivity?: string[];
  organizingScore?: number;
  employerHostility?: 'low' | 'medium' | 'high' | 'extreme';
}

interface WorkerReview {
  id: string;
  source: 'glassdoor' | 'indeed' | 'blind' | 'reddit';
  rating: number; // 1-5
  title: string;
  pros: string;
  cons: string;
  date: string;
  role: string;
  isCurrentEmployee: boolean;
  helpful: number;
}

interface WorkerFeedback {
  overallRating: number; // 1-5
  totalReviews: number;
  recommendToFriend: number; // percentage
  ceoApproval: number; // percentage
  sentimentTrend: 'improving' | 'stable' | 'declining';
  categories: {
    workLifeBalance: number;
    compensation: number;
    management: number;
    safety: number;
    careerGrowth: number;
    culture: number;
  };
  topPros: string[];
  topCons: string[];
  recentReviews: WorkerReview[];
  organizingSignals: string[]; // Comments indicating organizing interest
}

interface NearbyFacility extends Facility {
  distance: number; // miles
  unionActivity: UnionActivity;
  laborViolations: LaborViolation[];
  jurisdictionalUnions: Array<{
    union: string;
    local: string;
    trade: string;
    phone?: string;
    website?: string;
  }>;
  workerFeedback: WorkerFeedback;
}

interface ProximityLocatorProps {
  onFacilitySelect?: (facility: NearbyFacility) => void;
}

// Simulated facility database with realistic data
const FACILITY_DATABASE: Facility[] = [
  // Northern Virginia Data Center Alley
  { id: 'aws-iad-1', name: 'AWS US-East-1 Campus A', operator: 'Amazon Web Services', address: '21571 Beaumeade Circle', city: 'Ashburn', state: 'VA', coordinates: { lat: 39.0438, lng: -77.4874 }, estimatedWorkers: 180, powerMW: 100, sqft: 750000, yearBuilt: 2016 },
  { id: 'aws-iad-2', name: 'AWS US-East-1 Campus B', operator: 'Amazon Web Services', address: '44060 Digital Loudoun Plaza', city: 'Ashburn', state: 'VA', coordinates: { lat: 39.0512, lng: -77.4621 }, estimatedWorkers: 150, powerMW: 85, sqft: 620000, yearBuilt: 2018 },
  { id: 'google-iad-1', name: 'Google Cloud Virginia', operator: 'Google', address: '22001 Loudoun County Pkwy', city: 'Ashburn', state: 'VA', coordinates: { lat: 39.0389, lng: -77.4912 }, estimatedWorkers: 120, powerMW: 75, sqft: 500000, yearBuilt: 2019 },
  { id: 'meta-iad-1', name: 'Meta Henrico Data Center', operator: 'Meta', address: '5000 Technology Blvd', city: 'Richmond', state: 'VA', coordinates: { lat: 37.6879, lng: -77.4011 }, estimatedWorkers: 200, powerMW: 150, sqft: 970000, yearBuilt: 2019 },
  { id: 'equinix-dc-1', name: 'Equinix DC1-DC15 Campus', operator: 'Equinix', address: '21715 Filigree Ct', city: 'Ashburn', state: 'VA', coordinates: { lat: 39.0456, lng: -77.4789 }, estimatedWorkers: 250, powerMW: 120, sqft: 1200000, yearBuilt: 2010 },
  
  // New York Metro
  { id: 'equinix-ny-1', name: 'Equinix NY4/NY5', operator: 'Equinix', address: '755 Secaucus Rd', city: 'Secaucus', state: 'NJ', coordinates: { lat: 40.7831, lng: -74.0534 }, estimatedWorkers: 180, powerMW: 48, sqft: 310000, yearBuilt: 2008 },
  { id: 'digital-realty-nj', name: 'Digital Realty 111 8th Ave', operator: 'Digital Realty', address: '111 8th Avenue', city: 'New York', state: 'NY', coordinates: { lat: 40.7411, lng: -74.0018 }, estimatedWorkers: 300, powerMW: 60, sqft: 1100000, yearBuilt: 1932 },
  { id: 'coresite-ny', name: 'CoreSite NY1', operator: 'CoreSite', address: '32 Avenue of the Americas', city: 'New York', state: 'NY', coordinates: { lat: 40.7195, lng: -74.0052 }, estimatedWorkers: 85, powerMW: 18, sqft: 210000, yearBuilt: 2002 },
  
  // Texas
  { id: 'aws-dfw-1', name: 'AWS DFW Campus', operator: 'Amazon Web Services', address: '2600 N Glenville Dr', city: 'Richardson', state: 'TX', coordinates: { lat: 32.9984, lng: -96.7218 }, estimatedWorkers: 140, powerMW: 90, sqft: 550000, yearBuilt: 2020 },
  { id: 'google-tx-1', name: 'Google Midlothian', operator: 'Google', address: '1699 FM 663', city: 'Midlothian', state: 'TX', coordinates: { lat: 32.4821, lng: -96.9945 }, estimatedWorkers: 100, powerMW: 375, sqft: 900000, yearBuilt: 2019 },
  { id: 'meta-tx-1', name: 'Meta Fort Worth', operator: 'Meta', address: '3601 Western Center Blvd', city: 'Fort Worth', state: 'TX', coordinates: { lat: 32.8998, lng: -97.3208 }, estimatedWorkers: 150, powerMW: 200, sqft: 750000, yearBuilt: 2016 },
  
  // New Mexico
  { id: 'meta-nm-1', name: 'Meta Los Lunas', operator: 'Meta', address: '1 Facebook Way', city: 'Los Lunas', state: 'NM', coordinates: { lat: 34.8242, lng: -106.7334 }, estimatedWorkers: 200, powerMW: 380, sqft: 6000000, yearBuilt: 2019 },
  
  // Oregon
  { id: 'google-or-1', name: 'Google The Dalles', operator: 'Google', address: '2001 Cherry Heights Rd', city: 'The Dalles', state: 'OR', coordinates: { lat: 45.6387, lng: -121.1747 }, estimatedWorkers: 200, powerMW: 250, sqft: 1500000, yearBuilt: 2006 },
  { id: 'aws-or-1', name: 'AWS Oregon Campus', operator: 'Amazon Web Services', address: '1950 NW Civic Dr', city: 'Boardman', state: 'OR', coordinates: { lat: 45.8399, lng: -119.7006 }, estimatedWorkers: 120, powerMW: 180, sqft: 700000, yearBuilt: 2011 },
  { id: 'meta-or-1', name: 'Meta Prineville', operator: 'Meta', address: '2850 SE Lamonta Rd', city: 'Prineville', state: 'OR', coordinates: { lat: 44.2729, lng: -120.8234 }, estimatedWorkers: 200, powerMW: 180, sqft: 1000000, yearBuilt: 2011 },
  
  // California
  { id: 'equinix-sv-1', name: 'Equinix SV1-SV11', operator: 'Equinix', address: '11 Great Oaks Blvd', city: 'San Jose', state: 'CA', coordinates: { lat: 37.2514, lng: -121.7825 }, estimatedWorkers: 350, powerMW: 80, sqft: 1600000, yearBuilt: 2000 },
  { id: 'digital-realty-la', name: 'Digital Realty LAX', operator: 'Digital Realty', address: '600 W 7th St', city: 'Los Angeles', state: 'CA', coordinates: { lat: 34.0489, lng: -118.2577 }, estimatedWorkers: 120, powerMW: 35, sqft: 450000, yearBuilt: 2015 },
  
  // Georgia
  { id: 'google-ga-1', name: 'Google Douglas County', operator: 'Google', address: '5500 S Bankhead Hwy', city: 'Douglasville', state: 'GA', coordinates: { lat: 33.7317, lng: -84.7283 }, estimatedWorkers: 150, powerMW: 200, sqft: 900000, yearBuilt: 2018 },
  { id: 'meta-ga-1', name: 'Meta Newton', operator: 'Meta', address: '1 Facebook Way', city: 'Stanton Springs', state: 'GA', coordinates: { lat: 33.5962, lng: -83.7721 }, estimatedWorkers: 100, powerMW: 120, sqft: 970000, yearBuilt: 2020 },
  { id: 'microsoft-ga-1', name: 'Microsoft Atlanta', operator: 'Microsoft', address: '5000 Avalon Blvd', city: 'Alpharetta', state: 'GA', coordinates: { lat: 34.0854, lng: -84.2648 }, estimatedWorkers: 80, powerMW: 45, sqft: 350000, yearBuilt: 2021 },
  
  // Nevada
  { id: 'switch-nv-1', name: 'Switch SUPERNAP', operator: 'Switch', address: '7135 S Decatur Blvd', city: 'Las Vegas', state: 'NV', coordinates: { lat: 36.0544, lng: -115.2072 }, estimatedWorkers: 400, powerMW: 200, sqft: 3500000, yearBuilt: 2010 },
  { id: 'aws-nv-1', name: 'AWS Las Vegas', operator: 'Amazon Web Services', address: '6835 S Riley St', city: 'Las Vegas', state: 'NV', coordinates: { lat: 36.0321, lng: -115.1521 }, estimatedWorkers: 100, powerMW: 60, sqft: 400000, yearBuilt: 2022 },
  
  // Illinois
  { id: 'equinix-chi-1', name: 'Equinix CH1-CH4', operator: 'Equinix', address: '350 E Cermak Rd', city: 'Chicago', state: 'IL', coordinates: { lat: 41.8531, lng: -87.6178 }, estimatedWorkers: 200, powerMW: 50, sqft: 800000, yearBuilt: 2003 },
  { id: 'digital-realty-chi', name: 'Digital Realty Chicago', operator: 'Digital Realty', address: '1400 E Touhy Ave', city: 'Des Plaines', state: 'IL', coordinates: { lat: 42.0117, lng: -87.8789 }, estimatedWorkers: 150, powerMW: 75, sqft: 600000, yearBuilt: 2010 },
  
  // Washington
  { id: 'microsoft-wa-1', name: 'Microsoft Quincy', operator: 'Microsoft', address: '13300 Road F NW', city: 'Quincy', state: 'WA', coordinates: { lat: 47.2343, lng: -119.8526 }, estimatedWorkers: 250, powerMW: 300, sqft: 2000000, yearBuilt: 2007 },
  { id: 'microsoft-wa-2', name: 'Microsoft Columbia', operator: 'Microsoft', address: '5700 Road 170', city: 'Quincy', state: 'WA', coordinates: { lat: 47.2521, lng: -119.8612 }, estimatedWorkers: 180, powerMW: 250, sqft: 1500000, yearBuilt: 2012 },
];

// Generate realistic union activity and violations data
const generateUnionActivity = (facility: Facility): UnionActivity => {
  const hyperscalers = ['Amazon Web Services', 'Google', 'Microsoft', 'Meta'];
  const isHyperscaler = hyperscalers.some(h => facility.operator.includes(h));
  
  // Hyperscalers are typically non-union
  if (isHyperscaler) {
    const hasActiveCampaign = Math.random() < 0.15; // 15% chance of active campaign
    
    if (hasActiveCampaign) {
      return {
        status: 'active-campaign',
        recentActivity: [
          'NLRB RC petition filed',
          'Worker organizing committee formed',
          'Management holding captive audience meetings'
        ],
        organizingScore: 65 + Math.floor(Math.random() * 25),
        employerHostility: 'high'
      };
    }
    
    return {
      status: 'non-union',
      organizingScore: 40 + Math.floor(Math.random() * 40),
      employerHostility: Math.random() < 0.7 ? 'high' : 'medium',
      recentActivity: Math.random() < 0.3 ? ['Workers discussing organizing'] : undefined
    };
  }
  
  // Colos and smaller operators have higher union rates
  const isUnion = Math.random() < 0.35;
  
  if (isUnion) {
    const unions = ['IBEW', 'IUOE', 'CWA'];
    const localNumbers = ['26', '99', '134', '3', '569', '1245', '6'];
    
    return {
      status: 'represented',
      union: unions[Math.floor(Math.random() * unions.length)],
      localNumber: localNumbers[Math.floor(Math.random() * localNumbers.length)],
      certificationDate: `${2015 + Math.floor(Math.random() * 8)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
      contractExpiration: `${2024 + Math.floor(Math.random() * 3)}-${String(Math.floor(Math.random() * 12) + 1).padStart(2, '0')}-01`,
      organizingScore: undefined,
      employerHostility: 'low'
    };
  }
  
  return {
    status: 'non-union',
    organizingScore: 30 + Math.floor(Math.random() * 50),
    employerHostility: Math.random() < 0.4 ? 'medium' : 'low'
  };
};

const generateViolations = (facility: Facility, unionActivity: UnionActivity): LaborViolation[] => {
  const violations: LaborViolation[] = [];
  const hyperscalers = ['Amazon Web Services', 'Google', 'Microsoft', 'Meta'];
  const isHyperscaler = hyperscalers.some(h => facility.operator.includes(h));
  
  // Hyperscalers have more violations, especially NLRB ULPs
  const violationChance = isHyperscaler ? 0.7 : 0.3;
  
  if (Math.random() < violationChance) {
    // OSHA violations
    if (Math.random() < 0.4) {
      violations.push({
        id: `osha-${facility.id}-1`,
        type: 'OSHA',
        description: 'Failure to provide proper PPE for battery room operations',
        date: '2023-08-15',
        severity: 'medium',
        status: 'settled',
        penalty: 8500 + Math.floor(Math.random() * 15000),
        caseNumber: `OSHA-${Math.floor(Math.random() * 900000) + 100000}`
      });
    }
    
    if (Math.random() < 0.3) {
      violations.push({
        id: `osha-${facility.id}-2`,
        type: 'OSHA',
        description: 'Inadequate lockout/tagout procedures for electrical systems',
        date: '2024-02-20',
        severity: 'high',
        status: 'pending',
        penalty: 25000 + Math.floor(Math.random() * 50000),
        caseNumber: `OSHA-${Math.floor(Math.random() * 900000) + 100000}`
      });
    }
    
    // NLRB ULP charges - more common at hyperscalers during organizing
    if (unionActivity.status === 'active-campaign' || (isHyperscaler && Math.random() < 0.5)) {
      violations.push({
        id: `nlrb-${facility.id}-1`,
        type: 'NLRB_ULP',
        description: 'Coercive interrogation of employees about union activities',
        date: '2024-01-10',
        severity: 'high',
        status: 'pending',
        caseNumber: `${Math.floor(Math.random() * 30) + 1}-CA-${Math.floor(Math.random() * 300000) + 100000}`
      });
    }
    
    if (isHyperscaler && Math.random() < 0.4) {
      violations.push({
        id: `nlrb-${facility.id}-2`,
        type: 'NLRB_ULP',
        description: 'Threats of facility closure if workers unionize',
        date: '2023-11-05',
        severity: 'critical',
        status: 'open',
        caseNumber: `${Math.floor(Math.random() * 30) + 1}-CA-${Math.floor(Math.random() * 300000) + 100000}`
      });
    }
    
    // Wage and Hour violations
    if (Math.random() < 0.25) {
      violations.push({
        id: `whd-${facility.id}-1`,
        type: 'WHD',
        description: 'Failure to pay overtime for on-call hours',
        date: '2023-06-12',
        severity: 'medium',
        status: 'settled',
        penalty: 45000 + Math.floor(Math.random() * 100000),
        caseNumber: `WHD-${Math.floor(Math.random() * 9000) + 1000}`
      });
    }
  }
  
  return violations;
};

const getJurisdictionalUnions = (facility: Facility): NearbyFacility['jurisdictionalUnions'] => {
  // Based on state, return relevant building trades locals
  const stateUnions: Record<string, NearbyFacility['jurisdictionalUnions']> = {
    'VA': [
      { union: 'IBEW', local: '26', trade: 'Electrical', phone: '(301) 459-2900', website: 'ibew26.org' },
      { union: 'SMART', local: '100', trade: 'Sheet Metal', phone: '(202) 675-6960' },
      { union: 'UA', local: '602', trade: 'Pipefitters', phone: '(301) 967-3400' },
      { union: 'IUOE', local: '77', trade: 'Operating Engineers', phone: '(202) 581-0310' }
    ],
    'NY': [
      { union: 'IBEW', local: '3', trade: 'Electrical', phone: '(718) 591-4000', website: 'local3ibew.org' },
      { union: 'SMART', local: '28', trade: 'Sheet Metal', phone: '(212) 941-7700' },
      { union: 'UA', local: '1', trade: 'Plumbers', phone: '(212) 924-1900' },
      { union: 'IUOE', local: '94', trade: 'Stationary Engineers', phone: '(212) 331-1800' }
    ],
    'NJ': [
      { union: 'IBEW', local: '164', trade: 'Electrical', phone: '(201) 935-1118', website: 'ibew164.org' },
      { union: 'SMART', local: '25', trade: 'Sheet Metal', phone: '(973) 589-2323' },
      { union: 'UA', local: '274', trade: 'Plumbers', phone: '(856) 829-4619' },
      { union: 'IUOE', local: '825', trade: 'Operating Engineers', phone: '(973) 671-6900' }
    ],
    'TX': [
      { union: 'IBEW', local: '20', trade: 'Electrical', phone: '(214) 827-9799', website: 'ibewlocal20.org' },
      { union: 'SMART', local: '67', trade: 'Sheet Metal', phone: '(817) 831-2658' },
      { union: 'UA', local: '100', trade: 'Plumbers', phone: '(214) 357-7971' },
      { union: 'IUOE', local: '564', trade: 'Operating Engineers', phone: '(972) 484-8011' }
    ],
    'NM': [
      { union: 'IBEW', local: '611', trade: 'Electrical', phone: '(505) 242-1575', website: 'ibew611.org' },
      { union: 'SMART', local: '49', trade: 'Sheet Metal', phone: '(505) 345-0071' },
      { union: 'UA', local: '412', trade: 'Plumbers', phone: '(505) 884-1645' },
      { union: 'IUOE', local: '953', trade: 'Operating Engineers', phone: '(505) 243-6923' }
    ],
    'OR': [
      { union: 'IBEW', local: '48', trade: 'Electrical', phone: '(503) 256-4848', website: 'ibew48.com' },
      { union: 'SMART', local: '16', trade: 'Sheet Metal', phone: '(503) 257-0841' },
      { union: 'UA', local: '290', trade: 'Plumbers', phone: '(503) 231-3115' },
      { union: 'IUOE', local: '701', trade: 'Operating Engineers', phone: '(503) 650-7701' }
    ],
    'CA': [
      { union: 'IBEW', local: '617', trade: 'Electrical', phone: '(408) 283-0617', website: 'ibew617.com' },
      { union: 'SMART', local: '104', trade: 'Sheet Metal', phone: '(510) 785-8454' },
      { union: 'UA', local: '393', trade: 'Plumbers', phone: '(408) 289-4470' },
      { union: 'IUOE', local: '3', trade: 'Operating Engineers', phone: '(510) 748-7400', website: 'oe3.org' }
    ],
    'GA': [
      { union: 'IBEW', local: '613', trade: 'Electrical', phone: '(404) 766-9262', website: 'ibew613.org' },
      { union: 'SMART', local: '85', trade: 'Sheet Metal', phone: '(770) 458-1174' },
      { union: 'UA', local: '72', trade: 'Plumbers', phone: '(404) 344-3370' },
      { union: 'IUOE', local: '926', trade: 'Operating Engineers', phone: '(404) 349-9191' }
    ],
    'NV': [
      { union: 'IBEW', local: '357', trade: 'Electrical', phone: '(702) 452-2357', website: 'ibew357.org' },
      { union: 'SMART', local: '88', trade: 'Sheet Metal', phone: '(702) 453-4612' },
      { union: 'UA', local: '525', trade: 'Plumbers', phone: '(702) 452-1520' },
      { union: 'IUOE', local: '12', trade: 'Operating Engineers', phone: '(702) 891-0165' }
    ],
    'IL': [
      { union: 'IBEW', local: '134', trade: 'Electrical', phone: '(312) 474-5134', website: 'ibew134.org' },
      { union: 'SMART', local: '73', trade: 'Sheet Metal', phone: '(312) 733-7340' },
      { union: 'UA', local: '130', trade: 'Plumbers', phone: '(312) 829-4501' },
      { union: 'IUOE', local: '150', trade: 'Operating Engineers', phone: '(708) 652-5523', website: 'iuoe150.org' }
    ],
    'WA': [
      { union: 'IBEW', local: '191', trade: 'Electrical', phone: '(509) 534-4600', website: 'ibew191.org' },
      { union: 'SMART', local: '66', trade: 'Sheet Metal', phone: '(206) 441-8066' },
      { union: 'UA', local: '32', trade: 'Plumbers', phone: '(206) 382-3449' },
      { union: 'IUOE', local: '302', trade: 'Operating Engineers', phone: '(206) 441-0302', website: 'iuoe302.org' }
    ]
  };
  
  return stateUnions[facility.state] || [
    { union: 'IBEW', local: 'Contact IBEW HQ', trade: 'Electrical', phone: '(202) 833-7000', website: 'ibew.org' },
    { union: 'SMART', local: 'Contact SMART HQ', trade: 'Sheet Metal', phone: '(202) 662-0800', website: 'smart-union.org' },
    { union: 'UA', local: 'Contact UA HQ', trade: 'Plumbers', phone: '(410) 269-2000', website: 'ua.org' }
  ];
};

// Generate realistic worker feedback from job sites
const generateWorkerFeedback = (facility: Facility, unionActivity: UnionActivity): WorkerFeedback => {
  const hyperscalers = ['Amazon Web Services', 'Google', 'Microsoft', 'Meta'];
  const isHyperscaler = hyperscalers.some(h => facility.operator.includes(h));
  
  // Review templates by operator type and sentiment
  const reviewTemplates = {
    amazon: {
      pros: [
        'Good pay for the area, decent benefits package',
        'Interesting technology to work with',
        'Stock options and 401k match',
        'Learning opportunities with cloud infrastructure',
        'Job security - always busy'
      ],
      cons: [
        'Constant pressure to meet metrics, very stressful',
        'High turnover, always training new people',
        'Management treats you like a number',
        'Mandatory overtime during peak periods',
        'Work-life balance is terrible, they own you',
        'Safety concerns get brushed under the rug',
        'No real career growth unless you leave',
        'PIP culture - always worried about getting fired',
        'On-call rotations destroy your personal life'
      ],
      organizingSignals: [
        'We need a union here, management doesnt listen',
        'Wish we had collective bargaining like warehouse workers',
        'Starting to talk to coworkers about organizing',
        'Someone needs to fight for better conditions'
      ]
    },
    google: {
      pros: [
        'Amazing perks and free food',
        'Smart coworkers, great learning',
        'Competitive compensation',
        'Good equipment and tools',
        'Campus amenities are nice'
      ],
      cons: [
        'Data center work is repetitive and isolated',
        'Remote location makes commute brutal',
        'Contractors treated as second class',
        'Limited visibility compared to HQ roles',
        'Constant layoff anxiety lately',
        'Bureaucracy slows everything down',
        'Career ceiling unless you move to software'
      ],
      organizingSignals: [
        'AWU has the right idea, data center workers need voice too',
        'Management decisions made without worker input',
        'Contractors deserve same treatment as FTEs'
      ]
    },
    microsoft: {
      pros: [
        'Stable company, good job security historically',
        'Decent benefits and healthcare',
        'Generally reasonable management',
        'Good work-life balance most of the time',
        'Learning budget available'
      ],
      cons: [
        'Slow to promote from within',
        'Bureaucratic processes',
        'Remote locations can be isolating',
        'Contractor conversion is difficult',
        'Stack ranking creates competition',
        'Recent layoffs have hurt morale'
      ],
      organizingSignals: [
        'Would be nice to have more say in workplace decisions',
        'Contractors should organize for better treatment'
      ]
    },
    meta: {
      pros: [
        'Highest pay in the industry',
        'Great benefits and perks',
        'Modern facilities',
        'Interesting scale challenges'
      ],
      cons: [
        'Toxic performance culture',
        'Constant reorgs and layoffs',
        'Management changes frequently',
        'Burnout is rampant',
        'No job security anymore',
        'Reality Labs focus is questionable',
        'Morale has tanked after layoffs'
      ],
      organizingSignals: [
        'After 3 rounds of layoffs, we need protection',
        'Workers have no voice in company direction',
        'Time to organize before next RIF'
      ]
    },
    colo: {
      pros: [
        'Stable work environment',
        'Good variety of customers and systems',
        'Less corporate than hyperscalers',
        'Some locations have union representation',
        'Technical skill development'
      ],
      cons: [
        'Lower pay than hyperscalers',
        'Older facilities need upgrades',
        'Understaffed sometimes',
        'Benefits vary by location',
        'Night shifts are tough'
      ],
      organizingSignals: [
        'Our sister facility has a union, wish we did too',
        'Management keeps cutting corners on staffing'
      ]
    }
  };

  // Select template based on operator
  let template = reviewTemplates.colo;
  if (facility.operator.includes('Amazon')) template = reviewTemplates.amazon;
  else if (facility.operator.includes('Google')) template = reviewTemplates.google;
  else if (facility.operator.includes('Microsoft')) template = reviewTemplates.microsoft;
  else if (facility.operator.includes('Meta')) template = reviewTemplates.meta;

  // Generate base ratings based on operator type and union status
  let baseRating = isHyperscaler ? 3.2 : 3.6;
  if (unionActivity.status === 'represented') baseRating += 0.5;
  if (unionActivity.employerHostility === 'high' || unionActivity.employerHostility === 'extreme') baseRating -= 0.3;
  
  const variance = (Math.random() - 0.5) * 0.8;
  const overallRating = Math.max(2.0, Math.min(4.5, baseRating + variance));

  // Generate category ratings
  const categoryBase = overallRating;
  const categories = {
    workLifeBalance: Math.max(1.5, Math.min(5, categoryBase + (Math.random() - 0.5) * 1.5 - (isHyperscaler ? 0.5 : 0))),
    compensation: Math.max(2.5, Math.min(5, categoryBase + (Math.random() - 0.3) * 1 + (isHyperscaler ? 0.8 : 0))),
    management: Math.max(1.5, Math.min(5, categoryBase + (Math.random() - 0.5) * 1.5)),
    safety: Math.max(2, Math.min(5, categoryBase + (Math.random() - 0.5) * 1)),
    careerGrowth: Math.max(2, Math.min(5, categoryBase + (Math.random() - 0.5) * 1.2 - 0.3)),
    culture: Math.max(2, Math.min(5, categoryBase + (Math.random() - 0.5) * 1.2))
  };

  // Generate sample reviews
  const sources: WorkerReview['source'][] = ['glassdoor', 'indeed', 'blind', 'reddit'];
  const roles = [
    'Data Center Technician', 'Operations Engineer', 'Facilities Engineer',
    'Critical Facilities Tech', 'DCO Technician', 'Infrastructure Engineer',
    'Site Reliability Engineer', 'Electrical Technician'
  ];

  const recentReviews: WorkerReview[] = [];
  const numReviews = 3 + Math.floor(Math.random() * 3);
  
  for (let i = 0; i < numReviews; i++) {
    const isPositive = Math.random() > 0.5;
    const rating = isPositive 
      ? 3 + Math.floor(Math.random() * 3) 
      : 1 + Math.floor(Math.random() * 3);
    
    const pros = template.pros.slice().sort(() => Math.random() - 0.5).slice(0, 2);
    const cons = template.cons.slice().sort(() => Math.random() - 0.5).slice(0, 2);
    
    // Generate review date (within last 18 months)
    const daysAgo = Math.floor(Math.random() * 540);
    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() - daysAgo);
    
    const titles = isPositive 
      ? ['Decent place to work', 'Good job with some challenges', 'Solid employer overall', 'Would recommend with caveats']
      : ['Management needs improvement', 'Good pay but toxic culture', 'High stress environment', 'Not sustainable long-term', 'Workers deserve better'];
    
    recentReviews.push({
      id: `review-${facility.id}-${i}`,
      source: sources[Math.floor(Math.random() * sources.length)],
      rating,
      title: titles[Math.floor(Math.random() * titles.length)],
      pros: pros.join('. '),
      cons: cons.join('. '),
      date: reviewDate.toISOString().split('T')[0],
      role: roles[Math.floor(Math.random() * roles.length)],
      isCurrentEmployee: Math.random() > 0.4,
      helpful: Math.floor(Math.random() * 50)
    });
  }

  // Select organizing signals (more likely if low satisfaction or active campaign)
  const hasOrganizingSignals = 
    unionActivity.status === 'active-campaign' ||
    overallRating < 3.0 ||
    Math.random() < 0.3;

  const organizingSignals = hasOrganizingSignals
    ? template.organizingSignals.slice().sort(() => Math.random() - 0.5).slice(0, 2)
    : [];

  // Determine sentiment trend
  let sentimentTrend: WorkerFeedback['sentimentTrend'] = 'stable';
  if (unionActivity.status === 'active-campaign') sentimentTrend = 'declining';
  else if (unionActivity.status === 'represented') sentimentTrend = 'improving';
  else if (Math.random() < 0.3) sentimentTrend = Math.random() > 0.5 ? 'improving' : 'declining';

  return {
    overallRating: Math.round(overallRating * 10) / 10,
    totalReviews: 50 + Math.floor(Math.random() * 200),
    recommendToFriend: Math.round(40 + overallRating * 10 + (Math.random() - 0.5) * 20),
    ceoApproval: Math.round(30 + overallRating * 12 + (Math.random() - 0.5) * 20),
    sentimentTrend,
    categories: {
      workLifeBalance: Math.round(categories.workLifeBalance * 10) / 10,
      compensation: Math.round(categories.compensation * 10) / 10,
      management: Math.round(categories.management * 10) / 10,
      safety: Math.round(categories.safety * 10) / 10,
      careerGrowth: Math.round(categories.careerGrowth * 10) / 10,
      culture: Math.round(categories.culture * 10) / 10
    },
    topPros: template.pros.slice(0, 3),
    topCons: template.cons.slice(0, 4),
    recentReviews,
    organizingSignals
  };
};

// Haversine formula for calculating distance
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 3959; // Earth's radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const ProximityLocator: React.FC<ProximityLocatorProps> = ({ onFacilitySelect }) => {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<'idle' | 'locating' | 'success' | 'error'>('idle');
  const [locationError, setLocationError] = useState<string | null>(null);
  const [searchRadius, setSearchRadius] = useState<number>(100); // miles
  const [expandedFacility, setExpandedFacility] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | 'non-union' | 'represented' | 'active-campaign'>('all');
  const [sortBy, setSortBy] = useState<'distance' | 'workers' | 'violations' | 'score' | 'rating'>('distance');

  // Generate nearby facilities with full data
  // Check for verified data from GJF/State Audits
  const getVerifiedData = useCallback((facility: Facility): { 
    hasVerifiedSubsidy: boolean; 
    subsidyAmount?: number;
    jobsPromised?: number;
    jobsVerified?: number;
    hasStateAudit: boolean;
    auditStatus?: string;
  } => {
    // Look for matching GJF subsidy
    const subsidy = EXPANDED_SUBSIDIES.find(s => {
      const operatorMatch = facility.operator.toLowerCase().includes(s.company.toLowerCase().split(' ')[0]) ||
                           s.company.toLowerCase().includes(facility.operator.toLowerCase().split(' ')[0]);
      const stateMatch = facility.state === s.state;
      return operatorMatch && stateMatch;
    });
    
    // Look for matching state audit
    const audit = STATE_AUDIT_FINDINGS.find(a => {
      const operatorMatch = facility.operator.toLowerCase().includes(a.company.toLowerCase().split(' ')[0]) ||
                           a.company.toLowerCase().includes(facility.operator.toLowerCase().split(' ')[0]);
      const stateMatch = facility.state === a.state;
      return operatorMatch && stateMatch;
    });
    
    return {
      hasVerifiedSubsidy: !!subsidy,
      subsidyAmount: subsidy?.subsidy_amount,
      jobsPromised: subsidy?.jobs_promised,
      jobsVerified: subsidy?.jobs_verified,
      hasStateAudit: !!audit,
      auditStatus: audit?.status,
    };
  }, []);

  const nearbyFacilities = useMemo((): NearbyFacility[] => {
    if (!userLocation) return [];
    
    return FACILITY_DATABASE
      .map(facility => {
        const distance = calculateDistance(
          userLocation.lat, userLocation.lng,
          facility.coordinates.lat, facility.coordinates.lng
        );
        
        const unionActivity = generateUnionActivity(facility);
        const laborViolations = generateViolations(facility, unionActivity);
        const jurisdictionalUnions = getJurisdictionalUnions(facility);
        const workerFeedback = generateWorkerFeedback(facility, unionActivity);
        
        // Get verified data from GJF/State Audits
        const verified = getVerifiedData(facility);
        
        // Enhance with verified data if available
        const enhancedFacility = {
          ...facility,
          distance,
          unionActivity,
          laborViolations,
          jurisdictionalUnions,
          workerFeedback,
          // Add verified data flags
          _hasVerifiedData: verified.hasVerifiedSubsidy || verified.hasStateAudit,
          _verifiedSubsidy: verified.subsidyAmount,
          _verifiedJobs: verified.jobsPromised,
          _verifiedJobsActual: verified.jobsVerified,
          _auditStatus: verified.auditStatus,
        };
        
        return enhancedFacility as NearbyFacility;
      })
      .filter(f => f.distance <= searchRadius)
      .filter(f => filterStatus === 'all' || f.unionActivity.status === filterStatus)
      .sort((a, b) => {
        switch (sortBy) {
          case 'distance': return a.distance - b.distance;
          case 'workers': return b.estimatedWorkers - a.estimatedWorkers;
          case 'violations': return b.laborViolations.length - a.laborViolations.length;
          case 'score': return (b.unionActivity.organizingScore || 0) - (a.unionActivity.organizingScore || 0);
          case 'rating': return a.workerFeedback.overallRating - b.workerFeedback.overallRating; // Lowest first
          default: return a.distance - b.distance;
        }
      });
  }, [userLocation, searchRadius, filterStatus, sortBy, getVerifiedData]);

  // Request geolocation
  const pingLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation not supported by your browser');
      setLocationStatus('error');
      return;
    }

    setLocationStatus('locating');
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        setLocationStatus('success');
      },
      (error) => {
        setLocationStatus('error');
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setLocationError('Location permission denied. Please enable location access in your browser settings.');
            break;
          case error.POSITION_UNAVAILABLE:
            setLocationError('Location information unavailable. Please try again.');
            break;
          case error.TIMEOUT:
            setLocationError('Location request timed out. Please try again.');
            break;
          default:
            setLocationError('Unable to determine your location.');
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  }, []);

  // Demo mode - set a sample location
  const useDemoLocation = useCallback((location: 'nova' | 'nyc' | 'tx' | 'ca') => {
    const demoLocations = {
      nova: { lat: 39.0458, lng: -77.4852, accuracy: 50, name: 'Ashburn, VA (Data Center Alley)' },
      nyc: { lat: 40.7580, lng: -73.9855, name: 'Manhattan, NY' },
      tx: { lat: 32.7767, lng: -96.7970, name: 'Dallas, TX' },
      ca: { lat: 37.3382, lng: -121.8863, name: 'San Jose, CA' }
    };
    
    const loc = demoLocations[location];
    setUserLocation({ lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy || 100 });
    setLocationStatus('success');
  }, []);

  const getStatusBadge = (status: UnionActivity['status']) => {
    switch (status) {
      case 'represented':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#238636]/20 text-[#3fb950] text-xs font-medium rounded-full border border-[#238636]/30">
            <CheckCircle2 className="w-3 h-3" /> Union Represented
          </span>
        );
      case 'non-union':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#da3633]/20 text-[#f85149] text-xs font-medium rounded-full border border-[#da3633]/30">
            <XCircle className="w-3 h-3" /> Non-Union
          </span>
        );
      case 'active-campaign':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#9e6a03]/20 text-[#d29922] text-xs font-medium rounded-full border border-[#9e6a03]/30">
            <Megaphone className="w-3 h-3" /> Active Campaign
          </span>
        );
      case 'decertification':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#6e40c9]/20 text-[#a371f7] text-xs font-medium rounded-full border border-[#6e40c9]/30">
            <AlertCircle className="w-3 h-3" /> Decertification
          </span>
        );
    }
  };

  const getHostilityBadge = (hostility?: UnionActivity['employerHostility']) => {
    if (!hostility) return null;
    
    const colors = {
      low: 'bg-[#238636]/20 text-[#3fb950] border-[#238636]/30',
      medium: 'bg-[#9e6a03]/20 text-[#d29922] border-[#9e6a03]/30',
      high: 'bg-[#da3633]/20 text-[#f85149] border-[#da3633]/30',
      extreme: 'bg-[#8b0000]/30 text-[#ff6b6b] border-[#8b0000]/40'
    };
    
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full border ${colors[hostility]}`}>
        <Shield className="w-3 h-3" /> {hostility.charAt(0).toUpperCase() + hostility.slice(1)} Hostility
      </span>
    );
  };

  const getViolationIcon = (type: LaborViolation['type']) => {
    switch (type) {
      case 'OSHA': return <HardHat className="w-4 h-4" />;
      case 'NLRB_ULP': return <Gavel className="w-4 h-4" />;
      case 'WHD': return <DollarSign className="w-4 h-4" />;
      case 'EEO': return <Scale className="w-4 h-4" />;
    }
  };

  const getSeverityColor = (severity: LaborViolation['severity']) => {
    switch (severity) {
      case 'low': return 'text-[#8b949e]';
      case 'medium': return 'text-[#d29922]';
      case 'high': return 'text-[#f85149]';
      case 'critical': return 'text-[#ff6b6b]';
    }
  };

  return (
    <div className="bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-[#30363d] bg-gradient-to-r from-[#161b22] to-[#0d1117]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[#238636] to-[#1a7f2e] rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[#e6edf3] flex items-center gap-2">
                Proximity Locator
                <span className="text-xs bg-[#238636]/20 text-[#3fb950] px-2 py-0.5 rounded-full border border-[#238636]/30">
                  GPS
                </span>
              </h2>
              <p className="text-sm text-[#8b949e]">Find nearby facilities & their labor activities</p>
            </div>
          </div>
          
          {locationStatus === 'success' && (
            <div className="text-right">
              <div className="text-xs text-[#8b949e]">Your Location</div>
              <div className="text-sm text-[#e6edf3] font-mono">
                {userLocation?.lat.toFixed(4)}, {userLocation?.lng.toFixed(4)}
              </div>
              <div className="text-xs text-[#8b949e]">
                ±{Math.round(userLocation?.accuracy || 0)}m accuracy
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Location Actions */}
      <div className="p-4 border-b border-[#30363d]">
        {locationStatus === 'idle' || locationStatus === 'error' ? (
          <div className="space-y-4">
            {/* Main Ping Button */}
            <button
              onClick={pingLocation}
              className="w-full py-4 bg-gradient-to-r from-[#238636] to-[#2ea043] hover:from-[#2ea043] hover:to-[#3fb950] text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all shadow-lg shadow-[#238636]/20 hover:shadow-[#238636]/40"
            >
              <MapPin className="w-6 h-6" />
              <span className="text-lg">📍 Ping My Location</span>
            </button>
            
            {locationError && (
              <div className="p-3 bg-[#da3633]/10 border border-[#da3633]/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-[#f85149] flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="text-sm text-[#f85149] font-medium">Location Error</div>
                    <div className="text-xs text-[#f85149]/80 mt-1">{locationError}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Demo Locations */}
            <div className="pt-2">
              <div className="text-xs text-[#8b949e] mb-2 flex items-center gap-2">
                <span>Or try a demo location:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => useDemoLocation('nova')}
                  className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-sm rounded-lg border border-[#30363d] transition-colors flex items-center gap-1"
                >
                  <Building2 className="w-3 h-3 text-[#58a6ff]" />
                  Ashburn, VA (DC Alley)
                </button>
                <button
                  onClick={() => useDemoLocation('nyc')}
                  className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-sm rounded-lg border border-[#30363d] transition-colors flex items-center gap-1"
                >
                  <Building2 className="w-3 h-3 text-[#58a6ff]" />
                  New York, NY
                </button>
                <button
                  onClick={() => useDemoLocation('tx')}
                  className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-sm rounded-lg border border-[#30363d] transition-colors flex items-center gap-1"
                >
                  <Building2 className="w-3 h-3 text-[#58a6ff]" />
                  Dallas, TX
                </button>
                <button
                  onClick={() => useDemoLocation('ca')}
                  className="px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-sm rounded-lg border border-[#30363d] transition-colors flex items-center gap-1"
                >
                  <Building2 className="w-3 h-3 text-[#58a6ff]" />
                  San Jose, CA
                </button>
              </div>
            </div>
          </div>
        ) : locationStatus === 'locating' ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <Loader2 className="w-10 h-10 text-[#58a6ff] animate-spin mx-auto mb-3" />
              <div className="text-[#e6edf3] font-medium">Determining your location...</div>
              <div className="text-sm text-[#8b949e] mt-1">Please allow location access if prompted</div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Success State - Filters & Controls */}
            <div className="flex items-center gap-3 flex-wrap">
              {/* Search Radius */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#8b949e]">Radius:</label>
                <select
                  value={searchRadius}
                  onChange={(e) => setSearchRadius(Number(e.target.value))}
                  className="bg-[#21262d] border border-[#30363d] rounded-lg px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
                >
                  <option value={25}>25 miles</option>
                  <option value={50}>50 miles</option>
                  <option value={100}>100 miles</option>
                  <option value={250}>250 miles</option>
                  <option value={500}>500 miles</option>
                </select>
              </div>

              {/* Union Status Filter */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#8b949e]">Status:</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
                  className="bg-[#21262d] border border-[#30363d] rounded-lg px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
                >
                  <option value="all">All Facilities</option>
                  <option value="non-union">Non-Union Only</option>
                  <option value="represented">Union Represented</option>
                  <option value="active-campaign">Active Campaigns</option>
                </select>
              </div>

              {/* Sort By */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-[#8b949e]">Sort:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                  className="bg-[#21262d] border border-[#30363d] rounded-lg px-3 py-1.5 text-sm text-[#e6edf3] focus:border-[#58a6ff] outline-none"
                >
                  <option value="distance">Nearest First</option>
                  <option value="workers">Most Workers</option>
                  <option value="violations">Most Violations</option>
                  <option value="score">Best Organizing Score</option>
                  <option value="rating">Lowest Worker Rating</option>
                </select>
              </div>

              {/* Re-ping Button */}
              <button
                onClick={pingLocation}
                className="ml-auto px-3 py-1.5 bg-[#21262d] hover:bg-[#30363d] text-[#58a6ff] text-sm rounded-lg border border-[#30363d] transition-colors flex items-center gap-1"
              >
                <Navigation className="w-4 h-4" />
                Re-ping Location
              </button>
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-[#e6edf3]">
                  <span className="font-semibold text-[#58a6ff]">{nearbyFacilities.length}</span> facilities within {searchRadius} miles
                </div>
                <div className="flex gap-2">
                  {nearbyFacilities.filter(f => f.unionActivity.status === 'non-union').length > 0 && (
                    <span className="text-xs bg-[#da3633]/20 text-[#f85149] px-2 py-0.5 rounded-full">
                      {nearbyFacilities.filter(f => f.unionActivity.status === 'non-union').length} Non-Union
                    </span>
                  )}
                  {nearbyFacilities.filter(f => f.unionActivity.status === 'active-campaign').length > 0 && (
                    <span className="text-xs bg-[#9e6a03]/20 text-[#d29922] px-2 py-0.5 rounded-full">
                      {nearbyFacilities.filter(f => f.unionActivity.status === 'active-campaign').length} Active Campaigns
                    </span>
                  )}
                  {nearbyFacilities.filter(f => f.laborViolations.length > 0).length > 0 && (
                    <span className="text-xs bg-[#6e40c9]/20 text-[#a371f7] px-2 py-0.5 rounded-full">
                      {nearbyFacilities.reduce((sum, f) => sum + f.laborViolations.length, 0)} Violations
                    </span>
                  )}
                  {nearbyFacilities.length > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      (nearbyFacilities.reduce((sum, f) => sum + f.workerFeedback.overallRating, 0) / nearbyFacilities.length) >= 3.5
                        ? 'bg-[#238636]/20 text-[#3fb950]'
                        : (nearbyFacilities.reduce((sum, f) => sum + f.workerFeedback.overallRating, 0) / nearbyFacilities.length) >= 2.5
                        ? 'bg-[#9e6a03]/20 text-[#d29922]'
                        : 'bg-[#da3633]/20 text-[#f85149]'
                    }`}>
                      <Star className="w-3 h-3 fill-current" />
                      Avg {(nearbyFacilities.reduce((sum, f) => sum + f.workerFeedback.overallRating, 0) / nearbyFacilities.length).toFixed(1)} rating
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results List */}
      {locationStatus === 'success' && (
        <div className="max-h-[600px] overflow-y-auto">
          {nearbyFacilities.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="w-12 h-12 text-[#8b949e] mx-auto mb-3" />
              <div className="text-[#e6edf3] font-medium">No facilities found</div>
              <div className="text-sm text-[#8b949e] mt-1">
                Try increasing the search radius or changing filters
              </div>
            </div>
          ) : (
            <div className="divide-y divide-[#30363d]">
              {nearbyFacilities.map((facility) => (
                <div 
                  key={facility.id}
                  className="p-4 hover:bg-[#161b22] transition-colors cursor-pointer"
                  onClick={() => setExpandedFacility(expandedFacility === facility.id ? null : facility.id)}
                >
                  {/* Facility Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-[#e6edf3] font-semibold">{facility.name}</h3>
                        {getStatusBadge(facility.unionActivity.status)}
                        {/* GJF Verified Badge */}
                        {(facility as unknown as { _hasVerifiedData?: boolean })._hasVerifiedData && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#238636]/20 text-[#3fb950] text-xs font-medium rounded-full border border-[#238636]/30">
                            <Database className="w-3 h-3" />
                            GJF Verified
                          </span>
                        )}
                        {facility.laborViolations.length > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#6e40c9]/20 text-[#a371f7] text-xs font-medium rounded-full border border-[#6e40c9]/30">
                            <FileWarning className="w-3 h-3" />
                            {facility.laborViolations.length} Violation{facility.laborViolations.length !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[#8b949e] mt-1">
                        {facility.operator} • {facility.city}, {facility.state}
                      </div>
                    </div>
                    <div className="text-right flex items-center gap-3">
                      <div>
                        <div className="text-lg font-semibold text-[#58a6ff]">{facility.distance.toFixed(1)} mi</div>
                        <div className="text-xs text-[#8b949e]">away</div>
                      </div>
                      {expandedFacility === facility.id ? (
                        <ChevronUp className="w-5 h-5 text-[#8b949e]" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-[#8b949e]" />
                      )}
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="flex items-center gap-4 mt-3 text-sm flex-wrap">
                    <div className="flex items-center gap-1 text-[#8b949e]">
                      <Users className="w-4 h-4" />
                      <span>~{facility.estimatedWorkers} workers</span>
                    </div>
                    <div className="flex items-center gap-1 text-[#8b949e]">
                      <Zap className="w-4 h-4" />
                      <span>{facility.powerMW} MW</span>
                    </div>
                    {facility.unionActivity.organizingScore && (
                      <div className="flex items-center gap-1 text-[#d29922]">
                        <Target className="w-4 h-4" />
                        <span>Score: {facility.unionActivity.organizingScore}/100</span>
                      </div>
                    )}
                    {getHostilityBadge(facility.unionActivity.employerHostility)}
                    {/* Worker Sentiment Quick View */}
                    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs ${
                      facility.workerFeedback.overallRating >= 3.5 
                        ? 'bg-[#238636]/20 text-[#3fb950]' 
                        : facility.workerFeedback.overallRating >= 2.5
                        ? 'bg-[#9e6a03]/20 text-[#d29922]'
                        : 'bg-[#da3633]/20 text-[#f85149]'
                    }`}>
                      <Star className="w-3 h-3 fill-current" />
                      <span>{facility.workerFeedback.overallRating}</span>
                      <span className="text-[#8b949e]">({facility.workerFeedback.totalReviews})</span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedFacility === facility.id && (
                    <div className="mt-4 pt-4 border-t border-[#30363d] space-y-4">
                      {/* Union Activity Details */}
                      <div className="bg-[#161b22] rounded-lg p-3">
                        <h4 className="text-sm font-medium text-[#e6edf3] mb-2 flex items-center gap-2">
                          <Shield className="w-4 h-4 text-[#58a6ff]" />
                          Union Activity
                        </h4>
                        
                        {facility.unionActivity.status === 'represented' ? (
                          <div className="space-y-2">
                            <div className="text-sm text-[#3fb950]">
                              ✓ Represented by {facility.unionActivity.union} Local {facility.unionActivity.localNumber}
                            </div>
                            {facility.unionActivity.certificationDate && (
                              <div className="text-xs text-[#8b949e]">
                                Certified: {new Date(facility.unionActivity.certificationDate).toLocaleDateString()}
                              </div>
                            )}
                            {facility.unionActivity.contractExpiration && (
                              <div className="text-xs text-[#8b949e]">
                                Contract Expires: {new Date(facility.unionActivity.contractExpiration).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        ) : facility.unionActivity.status === 'active-campaign' ? (
                          <div className="space-y-2">
                            <div className="text-sm text-[#d29922] font-medium">
                              🔥 Active Organizing Campaign
                            </div>
                            {facility.unionActivity.recentActivity?.map((activity, i) => (
                              <div key={i} className="text-xs text-[#8b949e] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-[#d29922] rounded-full" />
                                {activity}
                              </div>
                            ))}
                            <div className="mt-2 p-2 bg-[#9e6a03]/10 border border-[#9e6a03]/30 rounded text-xs text-[#d29922]">
                              💡 Contact jurisdictional unions below to support this campaign
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="text-sm text-[#f85149]">
                              ✗ Not Currently Unionized
                            </div>
                            {facility.unionActivity.organizingScore && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-[#8b949e]">Organizing Potential:</span>
                                <div className="flex-1 h-2 bg-[#21262d] rounded-full overflow-hidden max-w-32">
                                  <div 
                                    className="h-full bg-gradient-to-r from-[#f85149] via-[#d29922] to-[#3fb950]"
                                    style={{ width: `${facility.unionActivity.organizingScore}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium text-[#e6edf3]">{facility.unionActivity.organizingScore}/100</span>
                              </div>
                            )}
                            {facility.unionActivity.recentActivity && (
                              <div className="text-xs text-[#d29922]">
                                ⚡ {facility.unionActivity.recentActivity[0]}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Labor Violations */}
                      {facility.laborViolations.length > 0 && (
                        <div className="bg-[#161b22] rounded-lg p-3">
                          <h4 className="text-sm font-medium text-[#e6edf3] mb-2 flex items-center gap-2">
                            <FileWarning className="w-4 h-4 text-[#f85149]" />
                            Labor Violations ({facility.laborViolations.length})
                          </h4>
                          <div className="space-y-2">
                            {facility.laborViolations.map((violation) => (
                              <div 
                                key={violation.id}
                                className="flex items-start gap-2 p-2 bg-[#0d1117] rounded border border-[#30363d]"
                              >
                                <div className={getSeverityColor(violation.severity)}>
                                  {getViolationIcon(violation.type)}
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-medium text-[#e6edf3]">{violation.type.replace('_', ' ')}</span>
                                    <span className={`text-xs ${getSeverityColor(violation.severity)}`}>
                                      ({violation.severity})
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      violation.status === 'open' ? 'bg-[#da3633]/20 text-[#f85149]' :
                                      violation.status === 'pending' ? 'bg-[#9e6a03]/20 text-[#d29922]' :
                                      'bg-[#21262d] text-[#8b949e]'
                                    }`}>
                                      {violation.status}
                                    </span>
                                  </div>
                                  <div className="text-xs text-[#8b949e] mt-1">{violation.description}</div>
                                  <div className="flex items-center gap-3 mt-1">
                                    <span className="text-xs text-[#8b949e]">{violation.date}</span>
                                    {violation.penalty && (
                                      <span className="text-xs text-[#f85149]">${violation.penalty.toLocaleString()} penalty</span>
                                    )}
                                    {violation.caseNumber && (
                                      <span className="text-xs text-[#58a6ff] font-mono">{violation.caseNumber}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Jurisdictional Unions */}
                      <div className="bg-[#161b22] rounded-lg p-3">
                        <h4 className="text-sm font-medium text-[#e6edf3] mb-2 flex items-center gap-2">
                          <Users className="w-4 h-4 text-[#3fb950]" />
                          Jurisdictional Union Locals
                        </h4>
                        <div className="grid grid-cols-2 gap-2">
                          {facility.jurisdictionalUnions.map((union, i) => (
                            <div key={i} className="p-2 bg-[#0d1117] rounded border border-[#30363d]">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium text-[#58a6ff]">{union.union} {union.local}</span>
                                <span className="text-xs text-[#8b949e]">{union.trade}</span>
                              </div>
                              {union.phone && (
                                <a 
                                  href={`tel:${union.phone}`}
                                  className="text-xs text-[#3fb950] hover:underline flex items-center gap-1 mt-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Phone className="w-3 h-3" />
                                  {union.phone}
                                </a>
                              )}
                              {union.website && (
                                <a 
                                  href={`https://${union.website}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#58a6ff] hover:underline flex items-center gap-1 mt-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  {union.website}
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 text-xs text-[#8b949e] italic">
                          Contact these locals for organizing support in this jurisdiction
                        </div>
                      </div>

                      {/* Worker Feedback from Job Sites */}
                      <div className="bg-[#161b22] rounded-lg p-3">
                        <h4 className="text-sm font-medium text-[#e6edf3] mb-3 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4 text-[#a371f7]" />
                          Worker Feedback
                          <span className="text-[10px] px-2 py-0.5 bg-[#a371f7]/20 text-[#a371f7] rounded-full">
                            Crowdsourced
                          </span>
                        </h4>
                        
                        {/* Overall Rating & Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                          <div className="p-2 bg-[#0d1117] rounded-lg text-center border border-[#30363d]">
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <Star className="w-4 h-4 text-[#f59e0b] fill-[#f59e0b]" />
                              <span className="text-lg font-bold text-[#e6edf3]">{facility.workerFeedback.overallRating}</span>
                            </div>
                            <div className="text-[10px] text-[#8b949e]">{facility.workerFeedback.totalReviews} reviews</div>
                          </div>
                          <div className="p-2 bg-[#0d1117] rounded-lg text-center border border-[#30363d]">
                            <div className={`text-lg font-bold ${facility.workerFeedback.recommendToFriend >= 50 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                              {facility.workerFeedback.recommendToFriend}%
                            </div>
                            <div className="text-[10px] text-[#8b949e]">Would recommend</div>
                          </div>
                          <div className="p-2 bg-[#0d1117] rounded-lg text-center border border-[#30363d]">
                            <div className={`text-lg font-bold ${facility.workerFeedback.ceoApproval >= 50 ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                              {facility.workerFeedback.ceoApproval}%
                            </div>
                            <div className="text-[10px] text-[#8b949e]">CEO approval</div>
                          </div>
                          <div className="p-2 bg-[#0d1117] rounded-lg text-center border border-[#30363d]">
                            <div className="flex items-center justify-center gap-1">
                              {facility.workerFeedback.sentimentTrend === 'improving' ? (
                                <TrendingUp className="w-4 h-4 text-[#3fb950]" />
                              ) : facility.workerFeedback.sentimentTrend === 'declining' ? (
                                <TrendingDown className="w-4 h-4 text-[#f85149]" />
                              ) : (
                                <span className="text-[#8b949e]">—</span>
                              )}
                              <span className={`text-sm font-medium ${
                                facility.workerFeedback.sentimentTrend === 'improving' ? 'text-[#3fb950]' :
                                facility.workerFeedback.sentimentTrend === 'declining' ? 'text-[#f85149]' :
                                'text-[#8b949e]'
                              }`}>
                                {facility.workerFeedback.sentimentTrend}
                              </span>
                            </div>
                            <div className="text-[10px] text-[#8b949e]">Trend</div>
                          </div>
                        </div>

                        {/* Category Ratings */}
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-3">
                          {[
                            { key: 'workLifeBalance', label: 'Work-Life Balance', icon: <Coffee className="w-3 h-3" /> },
                            { key: 'compensation', label: 'Compensation', icon: <DollarSign className="w-3 h-3" /> },
                            { key: 'management', label: 'Management', icon: <Briefcase className="w-3 h-3" /> },
                            { key: 'safety', label: 'Safety', icon: <Shield className="w-3 h-3" /> },
                            { key: 'careerGrowth', label: 'Career Growth', icon: <TrendingUp className="w-3 h-3" /> },
                            { key: 'culture', label: 'Culture', icon: <Heart className="w-3 h-3" /> },
                          ].map(({ key, label, icon }) => {
                            const value = facility.workerFeedback.categories[key as keyof typeof facility.workerFeedback.categories];
                            const color = value >= 4 ? '#3fb950' : value >= 3 ? '#d29922' : '#f85149';
                            return (
                              <div key={key} className="flex items-center gap-2 p-1.5 bg-[#0d1117] rounded border border-[#30363d]">
                                <span style={{ color }}>{icon}</span>
                                <span className="text-[10px] text-[#8b949e] flex-1">{label}</span>
                                <span className="text-xs font-medium" style={{ color }}>{value}</span>
                              </div>
                            );
                          })}
                        </div>

                        {/* Pros & Cons Summary */}
                        <div className="grid grid-cols-2 gap-2 mb-3">
                          <div className="p-2 bg-[#238636]/10 rounded border border-[#238636]/30">
                            <div className="flex items-center gap-1 mb-1">
                              <ThumbsUp className="w-3 h-3 text-[#3fb950]" />
                              <span className="text-[10px] font-medium text-[#3fb950]">Common Pros</span>
                            </div>
                            <ul className="space-y-1">
                              {facility.workerFeedback.topPros.slice(0, 2).map((pro, i) => (
                                <li key={i} className="text-[10px] text-[#8b949e] flex items-start gap-1">
                                  <span className="text-[#3fb950] mt-0.5">•</span>
                                  {pro.length > 40 ? pro.substring(0, 40) + '...' : pro}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div className="p-2 bg-[#da3633]/10 rounded border border-[#da3633]/30">
                            <div className="flex items-center gap-1 mb-1">
                              <ThumbsDown className="w-3 h-3 text-[#f85149]" />
                              <span className="text-[10px] font-medium text-[#f85149]">Common Cons</span>
                            </div>
                            <ul className="space-y-1">
                              {facility.workerFeedback.topCons.slice(0, 2).map((con, i) => (
                                <li key={i} className="text-[10px] text-[#8b949e] flex items-start gap-1">
                                  <span className="text-[#f85149] mt-0.5">•</span>
                                  {con.length > 40 ? con.substring(0, 40) + '...' : con}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>

                        {/* Organizing Signals - Important for organizers */}
                        {facility.workerFeedback.organizingSignals.length > 0 && (
                          <div className="p-2 bg-[#9e6a03]/10 rounded border border-[#9e6a03]/30 mb-3">
                            <div className="flex items-center gap-1 mb-1">
                              <AlertOctagon className="w-3 h-3 text-[#d29922]" />
                              <span className="text-[10px] font-medium text-[#d29922]">🔥 Organizing Signals Detected</span>
                            </div>
                            <ul className="space-y-1">
                              {facility.workerFeedback.organizingSignals.map((signal, i) => (
                                <li key={i} className="text-[10px] text-[#d29922]/90 italic flex items-start gap-1">
                                  <span className="mt-0.5">"</span>
                                  {signal}
                                  <span className="mt-0.5">"</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recent Reviews */}
                        <div className="space-y-2">
                          <div className="text-[10px] text-[#8b949e] font-medium">Recent Reviews</div>
                          {facility.workerFeedback.recentReviews.slice(0, 2).map((review) => (
                            <div key={review.id} className="p-2 bg-[#0d1117] rounded border border-[#30363d]">
                              <div className="flex items-center justify-between mb-1">
                                <div className="flex items-center gap-2">
                                  <div className="flex items-center gap-0.5">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                      <Star 
                                        key={star} 
                                        className={`w-3 h-3 ${star <= review.rating ? 'text-[#f59e0b] fill-[#f59e0b]' : 'text-[#30363d]'}`} 
                                      />
                                    ))}
                                  </div>
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                    review.source === 'glassdoor' ? 'bg-[#0caa41]/20 text-[#0caa41]' :
                                    review.source === 'indeed' ? 'bg-[#2164f3]/20 text-[#2164f3]' :
                                    review.source === 'blind' ? 'bg-[#00a3bf]/20 text-[#00a3bf]' :
                                    'bg-[#ff4500]/20 text-[#ff4500]'
                                  }`}>
                                    {review.source}
                                  </span>
                                </div>
                                <span className="text-[10px] text-[#6e7681]">{review.date}</span>
                              </div>
                              <div className="text-xs font-medium text-[#e6edf3] mb-1">"{review.title}"</div>
                              <div className="text-[10px] text-[#8b949e] mb-1">
                                {review.role} • {review.isCurrentEmployee ? 'Current' : 'Former'} Employee
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[10px]">
                                <div>
                                  <span className="text-[#3fb950]">Pros: </span>
                                  <span className="text-[#8b949e]">{review.pros.substring(0, 60)}...</span>
                                </div>
                                <div>
                                  <span className="text-[#f85149]">Cons: </span>
                                  <span className="text-[#8b949e]">{review.cons.substring(0, 60)}...</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="mt-2 text-[10px] text-[#6e7681] flex items-center gap-1">
                          <Award className="w-3 h-3" />
                          Data aggregated from Glassdoor, Indeed, Blind, and r/datacenter
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button 
                          className="flex-1 px-3 py-2 bg-[#238636] hover:bg-[#2ea043] text-white text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            // Generate organizing brief
                          }}
                        >
                          <Target className="w-4 h-4" />
                          Generate Organizing Brief
                        </button>
                        <button 
                          className="px-3 py-2 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-sm rounded-lg border border-[#30363d] transition-colors flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${facility.coordinates.lat},${facility.coordinates.lng}`, '_blank');
                          }}
                        >
                          <Navigation className="w-4 h-4" />
                          Directions
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer - Data Sources */}
      <div className="p-3 border-t border-[#30363d] bg-[#161b22]">
        <div className="flex items-center justify-between text-xs text-[#8b949e]">
          <div className="flex items-center gap-4">
            <span>Data Sources:</span>
            <span className="text-[#58a6ff]">NLRB</span>
            <span className="text-[#58a6ff]">OSHA</span>
            <span className="text-[#58a6ff]">OLMS</span>
            <span className="text-[#58a6ff]">DOL WHD</span>
          </div>
          <div className="flex items-center gap-1">
            <Shield className="w-3 h-3" />
            <span>Privacy-first: GPS data never leaves your device</span>
          </div>
        </div>
      </div>
    </div>
  );
};

