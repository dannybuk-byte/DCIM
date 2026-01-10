/**
 * Coalition Coordination Hub
 * 
 * Connect 188+ organizations tracking data centers.
 * Share intelligence, coordinate campaigns, build power.
 */

// === Types ===

export interface CoalitionPartner {
  id: string;
  name: string;
  shortName?: string;
  type: PartnerType;
  
  // Description
  description: string;
  mission: string;
  
  // Focus areas
  focusAreas: FocusArea[];
  geographicScope: 'national' | 'regional' | 'state' | 'local';
  statesActive?: string[];
  
  // Capabilities
  dataCapabilities: DataCapability[];
  organizingCapacity: string[];
  policyInfluence: string[];
  
  // Contact
  website?: string;
  contactEmail?: string;
  socialMedia?: { platform: string; handle: string }[];
  
  // Engagement
  engagementStatus: EngagementStatus;
  partnershipLevel: PartnershipLevel;
  lastContact?: Date;
  notes: string[];
  
  // Shared resources
  sharedWatchlists?: string[];
  contributedData?: ContributedData[];
}

export type PartnerType =
  | 'labor-union'
  | 'environmental'
  | 'community-org'
  | 'think-tank'
  | 'legal'
  | 'media'
  | 'academic'
  | 'government'
  | 'coalition';

export type FocusArea =
  | 'labor-organizing'
  | 'subsidy-accountability'
  | 'environmental-justice'
  | 'data-privacy'
  | 'energy-policy'
  | 'land-use'
  | 'community-benefits'
  | 'corporate-accountability'
  | 'worker-rights';

export type DataCapability =
  | 'facility-tracking'
  | 'subsidy-data'
  | 'employment-data'
  | 'environmental-data'
  | 'corporate-research'
  | 'legal-analysis'
  | 'community-mapping';

export type EngagementStatus =
  | 'active-partner'
  | 'data-sharing'
  | 'in-discussions'
  | 'potential'
  | 'declined'
  | 'inactive';

export type PartnershipLevel =
  | 'strategic' // Deep collaboration, shared resources
  | 'data-sharing' // Exchange data and research
  | 'information' // Share updates, no formal partnership
  | 'none';

export interface ContributedData {
  type: string;
  description: string;
  dateContributed: Date;
  recordCount?: number;
  attribution: boolean;
}

export interface SharedWatchlist {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  partners: string[];
  facilities: WatchlistFacility[];
  campaigns?: string[];
  lastUpdated: Date;
  accessLevel: 'public' | 'partners-only' | 'private';
}

export interface WatchlistFacility {
  facilityId: string;
  facilityName: string;
  operator: string;
  location: { city: string; state: string };
  watchReason: string;
  priority: 'high' | 'medium' | 'low';
  addedBy: string;
  addedDate: Date;
  notes: string[];
  updates: FacilityUpdate[];
}

export interface FacilityUpdate {
  id: string;
  date: Date;
  type: 'status-change' | 'news' | 'campaign-activity' | 'data-update';
  title: string;
  description: string;
  source?: string;
  addedBy: string;
}

export interface Campaign {
  id: string;
  name: string;
  description: string;
  targetCompany?: string;
  targetFacility?: string;
  leadOrganization: string;
  partners: string[];
  status: 'planning' | 'active' | 'paused' | 'completed' | 'won' | 'lost';
  goals: string[];
  startDate: Date;
  endDate?: Date;
  milestones: CampaignMilestone[];
  resources: CampaignResource[];
}

export interface CampaignMilestone {
  id: string;
  title: string;
  targetDate: Date;
  completedDate?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'missed';
  notes?: string;
}

export interface CampaignResource {
  type: 'document' | 'website' | 'contact' | 'data';
  title: string;
  description?: string;
  url?: string;
  accessLevel: 'public' | 'partners-only' | 'private';
}

// === Known Coalition Partners ===

export const COALITION_PARTNERS: CoalitionPartner[] = [
  // Labor Unions
  {
    id: 'ibew-26',
    name: 'IBEW Local 26',
    shortName: 'Local 26',
    type: 'labor-union',
    description: 'Largest data center electrical workforce in the US',
    mission: 'Represent electrical workers in Northern Virginia and D.C.',
    focusAreas: ['labor-organizing', 'worker-rights'],
    geographicScope: 'regional',
    statesActive: ['Virginia', 'Maryland', 'District of Columbia'],
    dataCapabilities: ['facility-tracking', 'employment-data'],
    organizingCapacity: [
      '14,700 members',
      '80%+ of VA data center investment',
      'Apprenticeship programs',
    ],
    policyInfluence: ['Virginia labor policy', 'PLA requirements'],
    website: 'https://www.ibewlocal26.org/',
    engagementStatus: 'potential',
    partnershipLevel: 'none',
    notes: ['Key partner for NoVA corridor intelligence'],
  },
  {
    id: 'cwa-awu',
    name: 'Alphabet Workers Union (CWA Local 1400)',
    shortName: 'AWU',
    type: 'labor-union',
    description: 'Union for Google/Alphabet workers including data center staff',
    mission: 'Organize tech workers and advocate for workplace improvements',
    focusAreas: ['labor-organizing', 'worker-rights', 'corporate-accountability'],
    geographicScope: 'national',
    dataCapabilities: ['employment-data'],
    organizingCapacity: [
      '1,400 members',
      'Inside access to Alphabet operations',
      'Contractor organizing model',
    ],
    policyInfluence: ['Tech labor standards', 'Contractor transparency'],
    website: 'https://alphabetworkersunion.org/',
    engagementStatus: 'potential',
    partnershipLevel: 'none',
    notes: ['Key for Google data center intelligence', 'Won COVID hazard pay reinstatement'],
  },
  
  // Environmental/EJ Organizations
  {
    id: 'mediajustice',
    name: 'MediaJustice',
    type: 'environmental',
    description: 'Racial justice organization fighting for equitable tech infrastructure',
    mission: 'Build a future where everyone has access to just and accountable technology',
    focusAreas: ['environmental-justice', 'corporate-accountability', 'community-benefits'],
    geographicScope: 'national',
    statesActive: ['Georgia', 'Louisiana', 'Texas', 'North Carolina'],
    dataCapabilities: ['community-mapping'],
    organizingCapacity: [
      'Southern coalition network',
      'Community organizing training',
      'Policy advocacy',
    ],
    policyInfluence: ['Federal EJ policy', 'Data center siting'],
    website: 'https://mediajustice.org/',
    engagementStatus: 'potential',
    partnershipLevel: 'none',
    notes: ['Published "The People Say No" report on Southern data centers'],
  },
  {
    id: 'pecva',
    name: 'Piedmont Environmental Council',
    shortName: 'PEC',
    type: 'environmental',
    description: 'Leads Virginia Data Center Reform Coalition (50+ organizations)',
    mission: 'Protect Virginia\'s natural and historic resources',
    focusAreas: ['environmental-justice', 'land-use', 'corporate-accountability', 'subsidy-accountability'],
    geographicScope: 'state',
    statesActive: ['Virginia'],
    dataCapabilities: ['facility-tracking', 'environmental-data'],
    organizingCapacity: [
      '50+ organization coalition',
      'Policy expertise',
      'Media reach',
    ],
    policyInfluence: ['Virginia data center policy', 'Four Pillars framework'],
    website: 'https://piedmont.org/',
    engagementStatus: 'potential',
    partnershipLevel: 'none',
    notes: ['21 GW Dominion contracts tracked', '250% Loudoun Water increase documented'],
  },
  {
    id: 'cja',
    name: 'Climate Justice Alliance',
    shortName: 'CJA',
    type: 'coalition',
    description: 'National coalition of frontline community organizations',
    mission: 'Build a Just Transition away from extractive systems',
    focusAreas: ['environmental-justice', 'community-benefits'],
    geographicScope: 'national',
    dataCapabilities: ['community-mapping'],
    organizingCapacity: [
      'National coalition network',
      'Community organizing training',
      'Just Transition framework',
    ],
    policyInfluence: ['Federal EJ policy', 'Just Transition advocacy'],
    website: 'https://climatejusticealliance.org/',
    engagementStatus: 'potential',
    partnershipLevel: 'none',
    notes: ['Has ad-hoc data center committee'],
  },
  
  // Think Tanks & Research
  {
    id: 'good-jobs-first',
    name: 'Good Jobs First',
    shortName: 'GJF',
    type: 'think-tank',
    description: 'Leading subsidy accountability organization with 670K+ records',
    mission: 'Make economic development subsidies more accountable and transparent',
    focusAreas: ['subsidy-accountability', 'corporate-accountability'],
    geographicScope: 'national',
    dataCapabilities: ['subsidy-data', 'corporate-research'],
    organizingCapacity: [
      'Subsidy Tracker database',
      'Policy research',
      'Campaign support',
    ],
    policyInfluence: [
      'State subsidy disclosure laws',
      'Federal subsidy transparency',
      'Clawback legislation',
    ],
    website: 'https://www.goodjobsfirst.org/',
    engagementStatus: 'active-partner',
    partnershipLevel: 'data-sharing',
    notes: ['Primary source for subsidy data', 'March 2025 report on data center subsidies'],
    contributedData: [
      {
        type: 'Subsidy records',
        description: 'Data center-related subsidy records from Subsidy Tracker',
        dateContributed: new Date('2025-01-01'),
        recordCount: 670000,
        attribution: true,
      },
    ],
  },
  
  // Legal
  {
    id: 'national-employment-law',
    name: 'National Employment Law Project',
    shortName: 'NELP',
    type: 'legal',
    description: 'Workers\' rights advocacy organization',
    mission: 'Build a just and inclusive economy where all workers have expansive rights',
    focusAreas: ['worker-rights', 'labor-organizing'],
    geographicScope: 'national',
    dataCapabilities: ['legal-analysis'],
    organizingCapacity: ['Legal support', 'Policy advocacy'],
    policyInfluence: ['Federal labor policy', 'Wage standards'],
    website: 'https://www.nelp.org/',
    engagementStatus: 'potential',
    partnershipLevel: 'none',
    notes: ['Potential legal support for worker campaigns'],
  },
];

// === Sample Shared Watchlist ===

export const SAMPLE_WATCHLISTS: SharedWatchlist[] = [
  {
    id: 'watchlist-1',
    name: 'NoVA Expansion Projects',
    description: 'Tracking new data center construction in Northern Virginia corridor',
    createdBy: 'DCIM Dashboard',
    partners: ['ibew-26', 'pecva'],
    facilities: [
      {
        facilityId: 'nova-1',
        facilityName: 'AWS Manassas Expansion',
        operator: 'Amazon Web Services',
        location: { city: 'Manassas', state: 'Virginia' },
        watchReason: 'Major expansion with organizing window during construction',
        priority: 'high',
        addedBy: 'DCIM Dashboard',
        addedDate: new Date('2025-12-01'),
        notes: ['200+ construction workers expected'],
        updates: [],
      },
    ],
    lastUpdated: new Date(),
    accessLevel: 'partners-only',
  },
];

// === Storage ===

import { db } from '../db/database';

export async function savePartner(partner: CoalitionPartner): Promise<void> {
  await db.table('coalitionPartners').put(partner);
}

export async function getPartners(): Promise<CoalitionPartner[]> {
  try {
    const stored = await db.table('coalitionPartners').toArray();
    return stored.length > 0 ? stored : COALITION_PARTNERS;
  } catch {
    return COALITION_PARTNERS;
  }
}

export async function saveWatchlist(watchlist: SharedWatchlist): Promise<void> {
  await db.table('sharedWatchlists').put(watchlist);
}

export async function getWatchlists(): Promise<SharedWatchlist[]> {
  try {
    const stored = await db.table('sharedWatchlists').toArray();
    return stored.length > 0 ? stored : SAMPLE_WATCHLISTS;
  } catch {
    return SAMPLE_WATCHLISTS;
  }
}

export async function saveCampaign(campaign: Campaign): Promise<void> {
  await db.table('campaigns').put(campaign);
}

export async function getCampaigns(): Promise<Campaign[]> {
  try {
    return await db.table('campaigns').toArray();
  } catch {
    return [];
  }
}

// === Analytics ===

export async function getCoalitionStats(): Promise<{
  totalPartners: number;
  byType: Record<PartnerType, number>;
  byEngagement: Record<EngagementStatus, number>;
  byFocusArea: Record<FocusArea, number>;
  activeWatchlists: number;
  activeCampaigns: number;
}> {
  const partners = await getPartners();
  const watchlists = await getWatchlists();
  const campaigns = await getCampaigns();
  
  const byType: Record<string, number> = {};
  const byEngagement: Record<string, number> = {};
  const byFocusArea: Record<string, number> = {};
  
  for (const partner of partners) {
    byType[partner.type] = (byType[partner.type] || 0) + 1;
    byEngagement[partner.engagementStatus] = (byEngagement[partner.engagementStatus] || 0) + 1;
    for (const area of partner.focusAreas) {
      byFocusArea[area] = (byFocusArea[area] || 0) + 1;
    }
  }
  
  return {
    totalPartners: partners.length,
    byType: byType as Record<PartnerType, number>,
    byEngagement: byEngagement as Record<EngagementStatus, number>,
    byFocusArea: byFocusArea as Record<FocusArea, number>,
    activeWatchlists: watchlists.length,
    activeCampaigns: campaigns.filter(c => c.status === 'active').length,
  };
}

// === Partner Matching ===

export async function findPartnersByCapability(capability: DataCapability): Promise<CoalitionPartner[]> {
  const partners = await getPartners();
  return partners.filter(p => p.dataCapabilities.includes(capability));
}

export async function findPartnersByState(state: string): Promise<CoalitionPartner[]> {
  const partners = await getPartners();
  return partners.filter(p => 
    p.geographicScope === 'national' ||
    p.statesActive?.some(s => s.toLowerCase() === state.toLowerCase())
  );
}

export async function findPartnersByFocusArea(area: FocusArea): Promise<CoalitionPartner[]> {
  const partners = await getPartners();
  return partners.filter(p => p.focusAreas.includes(area));
}

// === Notification System ===

export interface CoalitionNotification {
  id: string;
  type: 'campaign-update' | 'data-shared' | 'partner-request' | 'watchlist-alert' | 'meeting-scheduled';
  title: string;
  description: string;
  from: string;
  date: Date;
  read: boolean;
  actionUrl?: string;
}

export async function getNotifications(): Promise<CoalitionNotification[]> {
  // In production, this would fetch from a real notification system
  return [
    {
      id: 'notif-1',
      type: 'data-shared',
      title: 'Good Jobs First shared new subsidy data',
      description: '47 new data center subsidy records added to Subsidy Tracker',
      from: 'Good Jobs First',
      date: new Date(),
      read: false,
    },
    {
      id: 'notif-2',
      type: 'watchlist-alert',
      title: 'NoVA Watchlist: Permit filed for AWS expansion',
      description: 'Prince William County building permit filed for 150MW expansion',
      from: 'System',
      date: new Date(),
      read: false,
      actionUrl: '/watchlists/watchlist-1',
    },
  ];
}

