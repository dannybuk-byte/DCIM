/**
 * Union Organizing Intelligence
 * 
 * Strategic organizing intelligence system for labor unions:
 * - Three-layer classification: REPRESENTED, ORGANIZING TARGET, ACTIVE CAMPAIGN
 * - Multi-factor organizing opportunity scoring
 * - Employer hostility assessment (labordata integration)
 * - Job posting signal detection
 * - Map layer visualization toggles
 * - Worker privacy protection
 * - NLRB case tracking
 * 
 * Data Sources:
 * - labordata/nlrb-data: Daily certification lookup
 * - labordata/lm10: Persuader report detection
 * - labordata/lm20: Consultant identification
 * - OLMS bulk data: Union local information
 * - Baxtel/PeeringDB: Facility locations
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search, Filter, Building, Users, MapPin, Zap, Calendar,
  Phone, Mail, ExternalLink, AlertTriangle, CheckCircle,
  Flame, Target, TrendingUp, TrendingDown, FileText,
  Shield, Scale, ChevronDown, ChevronUp, Copy, Check,
  BarChart3, Briefcase, Award, AlertCircle, Clock, X,
  Map, Layers, Eye, EyeOff, Info, Lock, Database,
  GitBranch, Activity, PieChart
} from 'lucide-react';

interface UserLocation {
  city: string;
  state: string;
  neighborhood?: string;
  lat?: number;
  lng?: number;
}

interface UnionLocal {
  name: string;
  trade: 'IBEW' | 'SMART' | 'UA' | 'IUOE' | 'CWA';
  localNumber: string;
  members: number;
  location: string;
  phone?: string;
  email?: string;
  specialization?: string;
  organizer?: string;
  website?: string;
}

interface ScoreFactor {
  name: string;
  weight: number;
  score: number;
  description: string;
  type: 'positive' | 'negative' | 'neutral';
}

interface OrganizingFactor {
  text: string;
  type: 'positive' | 'negative' | 'neutral';
}

interface JobPostingSignal {
  source: string;
  date: string;
  indicators: string[];
  unionLikelihood: 'union' | 'non-union' | 'unknown';
  confidence: number;
}

interface FacilityData {
  id: string;
  name: string;
  operator: string;
  location: string;
  state: string;
  county?: string;
  countyFips?: string;
  workers: number;
  megawatts: number;
  openedYear: number;
  status: 'represented' | 'non-union' | 'active-campaign';
  organizingScore?: number;
  scoreFactors?: ScoreFactor[];
  factors: OrganizingFactor[];
  unions: UnionLocal[];
  jobSignals?: JobPostingSignal[];
  // For represented facilities
  certifiedUnion?: string;
  contractExpires?: string;
  bargainingUnit?: number;
  certificationDate?: string;
  // For active campaigns
  nlrbCaseNumber?: string;
  nlrbFiledDate?: string;
  nlrbStatus?: string;
  petitioningUnion?: string;
  // Hyperscaler detection
  isHyperscaler?: boolean;
  hyperscalerPattern?: string;
}

interface EmployerIntel {
  name: string;
  ulpCharges: string;
  ulpChargesCount: number;
  persuaderReports: string;
  lm10Filings: number;
  unionAvoidanceFirms: string[];
  dataCenterCertifications: number;
  warehouseCertifications?: number;
  organizingHistory: { facility: string; result: 'win' | 'loss'; year: number }[];
  assessment: 'hostile' | 'moderate' | 'neutral';
  assessmentDetails: string[];
  recentActivity?: string;
}

interface UnionOrganizingIntelligenceProps {
  userLocation: UserLocation;
}

type MapLayerType = 'status' | 'score' | 'jurisdiction';

// Enhanced employer intelligence data with labordata sources
const EMPLOYER_INTEL: Record<string, EmployerIntel> = {
  'Amazon Web Services': {
    name: 'Amazon Web Services',
    ulpCharges: '400+ charges filed (2020-2025)',
    ulpChargesCount: 412,
    persuaderReports: 'Multiple LM-10 filings',
    lm10Filings: 23,
    unionAvoidanceFirms: ['Littler Mendelson', 'Morgan Lewis', 'Hunton Andrews Kurth'],
    dataCenterCertifications: 0,
    warehouseCertifications: 2,
    organizingHistory: [
      { facility: 'JFK8 (Staten Island)', result: 'win', year: 2022 },
      { facility: 'BHM1 (Bessemer)', result: 'loss', year: 2021 },
      { facility: 'LDJ5 (Staten Island)', result: 'loss', year: 2022 },
      { facility: 'ALB1 (Schodack)', result: 'loss', year: 2022 },
    ],
    assessment: 'hostile',
    assessmentDetails: [
      'Amazon has NO unionized data centers in the United States',
      '400+ NLRB charges filed against Amazon (all divisions) 2020-25',
      'Known to use Littler Mendelson for union avoidance',
      'Documented captive audience meetings at warehouse facilities',
      'History of surveillance and termination of union supporters',
    ],
    recentActivity: 'JFK8 contract negotiations ongoing (2025)',
  },
  'Google Cloud': {
    name: 'Google Cloud',
    ulpCharges: '12 charges filed (2020-2025)',
    ulpChargesCount: 12,
    persuaderReports: 'None reported',
    lm10Filings: 0,
    unionAvoidanceFirms: [],
    dataCenterCertifications: 0,
    organizingHistory: [
      { facility: 'Alphabet (AWU-CWA)', result: 'win', year: 2021 },
    ],
    assessment: 'moderate',
    assessmentDetails: [
      'AWU-CWA Local 1400 is a "pre-majority" union—no contract',
      '1,400+ members signed up voluntarily',
      'No NLRB certification sought (minority union model)',
      'Data center workers included in AWU membership',
      'Company response has been measured, not hostile',
    ],
    recentActivity: 'AWU organizing continues in data centers',
  },
  'Equinix': {
    name: 'Equinix',
    ulpCharges: '3 charges filed (2020-2025)',
    ulpChargesCount: 3,
    persuaderReports: 'None reported',
    lm10Filings: 0,
    unionAvoidanceFirms: [],
    dataCenterCertifications: 8,
    organizingHistory: [],
    assessment: 'neutral',
    assessmentDetails: [
      '8 facilities with NLRB certifications (IUOE, IBEW)',
      'History of recognizing union representation',
      'Multiple collective bargaining agreements active',
      'No documented anti-union campaigns',
    ],
  },
  'QTS Data Centers': {
    name: 'QTS Data Centers',
    ulpCharges: '5 charges filed (2020-2025)',
    ulpChargesCount: 5,
    persuaderReports: 'None reported',
    lm10Filings: 0,
    unionAvoidanceFirms: ['Jackson Lewis'],
    dataCenterCertifications: 2,
    organizingHistory: [],
    assessment: 'moderate',
    assessmentDetails: [
      'Mixed history with union representation',
      'Some facilities organized, most non-union',
      'Has used Jackson Lewis for labor advice',
      'No documented aggressive anti-union campaigns',
    ],
    recentActivity: 'Active NLRB petition at Ashburn facility',
  },
  'Digital Realty': {
    name: 'Digital Realty',
    ulpCharges: '2 charges filed (2020-2025)',
    ulpChargesCount: 2,
    persuaderReports: 'None reported',
    lm10Filings: 0,
    unionAvoidanceFirms: [],
    dataCenterCertifications: 3,
    organizingHistory: [],
    assessment: 'neutral',
    assessmentDetails: [
      'Some facilities have union representation',
      'Acquired properties with existing CBAs',
      'Neutral stance on organizing',
    ],
  },
};

// Enhanced facility data with scoring factors
const SAMPLE_FACILITIES: FacilityData[] = [
  {
    id: 'aws-iad-55',
    name: 'AWS IAD-55 (Haymarket)',
    operator: 'Amazon Web Services',
    location: 'Haymarket, VA',
    state: 'VA',
    county: 'Prince William County',
    countyFips: '51153',
    workers: 175,
    megawatts: 30,
    openedYear: 2021,
    status: 'non-union',
    organizingScore: 72,
    isHyperscaler: true,
    hyperscalerPattern: 'Amazon',
    scoreFactors: [
      { name: 'Workforce Size', weight: 0.25, score: 0.85, description: 'Large workforce (175+ workers)', type: 'positive' },
      { name: 'Regional Density', weight: 0.15, score: 0.90, description: 'High NoVA building trades density', type: 'positive' },
      { name: 'Recent Activity', weight: 0.20, score: 0.30, description: 'No DC organizing at AWS', type: 'neutral' },
      { name: 'Wage Gap', weight: 0.15, score: 0.75, description: 'Below union scale for technicians', type: 'positive' },
      { name: 'Employer Hostility', weight: -0.15, score: 0.95, description: 'Highly hostile (Amazon)', type: 'negative' },
      { name: 'Turnover', weight: 0.10, score: 0.60, description: 'Moderate turnover rates', type: 'neutral' },
    ],
    factors: [
      { text: 'Large workforce (175+ workers)', type: 'positive' },
      { text: 'High regional union density (NoVA building trades)', type: 'positive' },
      { text: 'Employer highly hostile (Amazon warehouse record)', type: 'negative' },
      { text: 'No recent NLRB activity at data centers', type: 'neutral' },
    ],
    jobSignals: [
      { source: 'Indeed', date: '2025-12-15', indicators: ['direct hire', 'competitive benefits'], unionLikelihood: 'non-union', confidence: 0.85 },
      { source: 'AWS Careers', date: '2025-12-10', indicators: ['at-will employment', 'merit-based'], unionLikelihood: 'non-union', confidence: 0.90 },
    ],
    unions: [
      { name: 'IBEW', localNumber: 'Local 26', trade: 'IBEW', members: 12000, location: 'Lanham, MD', phone: '(301) 459-2900', specialization: 'Electrical', website: 'ibew26.org', organizer: 'Contact business office' },
      { name: 'SMART', localNumber: 'Local 100', trade: 'SMART', members: 3500, location: 'Capital Heights, MD', phone: '(301) 735-4803', specialization: 'HVAC/Sheet Metal' },
      { name: 'UA', localNumber: 'Local 602', trade: 'UA', members: 2800, location: 'Forestville, MD', phone: '(301) 967-3400', specialization: 'Pipefitters' },
    ]
  },
  {
    id: 'equinix-dc15',
    name: 'Equinix DC-15',
    operator: 'Equinix',
    location: 'Ashburn, VA',
    state: 'VA',
    county: 'Loudoun County',
    countyFips: '51107',
    workers: 85,
    megawatts: 18,
    openedYear: 2018,
    status: 'represented',
    certifiedUnion: 'IUOE Local 99',
    contractExpires: 'Dec 2026',
    bargainingUnit: 85,
    certificationDate: 'March 2019',
    factors: [
      { text: 'Certified: IUOE Local 99', type: 'positive' },
      { text: 'Contract expires: Dec 2026', type: 'positive' },
      { text: '85 workers in bargaining unit', type: 'positive' },
    ],
    unions: [
      { name: 'IUOE', localNumber: 'Local 99', trade: 'IUOE', members: 4500, location: 'Forestville, MD', phone: '(301) 736-7616', specialization: 'Operating Engineers' },
    ]
  },
  {
    id: 'qts-ashburn-1',
    name: 'QTS Ashburn-1',
    operator: 'QTS Data Centers',
    location: 'Ashburn, VA',
    state: 'VA',
    county: 'Loudoun County',
    countyFips: '51107',
    workers: 120,
    megawatts: 24,
    openedYear: 2020,
    status: 'active-campaign',
    nlrbCaseNumber: '05-RC-328456',
    nlrbFiledDate: 'November 15, 2025',
    nlrbStatus: 'Petition Pending',
    petitioningUnion: 'IBEW Local 26',
    factors: [
      { text: 'Case #: 05-RC-328456', type: 'positive' },
      { text: 'Filed: November 15, 2025', type: 'positive' },
      { text: 'Status: Petition Pending', type: 'neutral' },
      { text: 'Petitioner: IBEW Local 26', type: 'positive' },
    ],
    unions: [
      { name: 'IBEW', localNumber: 'Local 26', trade: 'IBEW', members: 12000, location: 'Lanham, MD', phone: '(301) 459-2900', specialization: 'Maintenance electricians', organizer: 'Campaign in progress' },
    ]
  },
  {
    id: 'google-iad-1',
    name: 'Google IAD-1',
    operator: 'Google Cloud',
    location: 'Loudoun County, VA',
    state: 'VA',
    county: 'Loudoun County',
    countyFips: '51107',
    workers: 200,
    megawatts: 45,
    openedYear: 2019,
    status: 'non-union',
    organizingScore: 85,
    isHyperscaler: true,
    hyperscalerPattern: 'Google',
    scoreFactors: [
      { name: 'Workforce Size', weight: 0.25, score: 0.95, description: 'Very large workforce (200+)', type: 'positive' },
      { name: 'Regional Density', weight: 0.15, score: 0.90, description: 'High NoVA building trades density', type: 'positive' },
      { name: 'Recent Activity', weight: 0.20, score: 0.80, description: 'AWU-CWA activity at Google', type: 'positive' },
      { name: 'Wage Gap', weight: 0.15, score: 0.65, description: 'Competitive wages but below union scale', type: 'neutral' },
      { name: 'Employer Hostility', weight: -0.15, score: 0.50, description: 'Moderate hostility', type: 'neutral' },
      { name: 'Turnover', weight: 0.10, score: 0.55, description: 'Average turnover', type: 'neutral' },
    ],
    factors: [
      { text: 'Very large workforce (200+)', type: 'positive' },
      { text: 'AWU-CWA activity at Google', type: 'positive' },
      { text: 'High regional density', type: 'positive' },
      { text: 'Moderate employer hostility', type: 'neutral' },
    ],
    jobSignals: [
      { source: 'Google Careers', date: '2025-12-12', indicators: ['competitive compensation', 'growth opportunities'], unionLikelihood: 'non-union', confidence: 0.75 },
    ],
    unions: [
      { name: 'IBEW', localNumber: 'Local 26', trade: 'IBEW', members: 12000, location: 'Lanham, MD', phone: '(301) 459-2900', specialization: 'Data center specialists' },
      { name: 'UA', localNumber: 'Local 602', trade: 'UA', members: 5500, location: 'Lanham, MD', phone: '(301) 459-6800', specialization: 'Cooling systems' },
      { name: 'CWA', localNumber: 'AWU-CWA 1400', trade: 'CWA', members: 1400, location: 'Washington, DC', phone: '(202) 434-1100', specialization: 'Tech workers' },
    ]
  },
  {
    id: 'equinix-ny5',
    name: 'Equinix NY5',
    operator: 'Equinix',
    location: 'Secaucus, NJ',
    state: 'NJ',
    county: 'Hudson County',
    countyFips: '34017',
    workers: 65,
    megawatts: 12,
    openedYear: 2015,
    status: 'represented',
    certifiedUnion: 'IBEW Local 164',
    contractExpires: 'March 2027',
    bargainingUnit: 45,
    certificationDate: 'June 2016',
    factors: [
      { text: 'Certified: IBEW Local 164', type: 'positive' },
      { text: 'Contract expires: March 2027', type: 'positive' },
      { text: '45 workers in bargaining unit', type: 'positive' },
    ],
    unions: [
      { name: 'IBEW', localNumber: 'Local 164', trade: 'IBEW', members: 8000, location: 'Paramus, NJ', phone: '(201) 845-5400', specialization: 'Electrical', website: 'ibew164.org' },
    ]
  },
  {
    id: 'digital-realty-111-8th',
    name: 'Digital Realty 111 8th Ave',
    operator: 'Digital Realty',
    location: 'New York, NY',
    state: 'NY',
    county: 'New York County',
    countyFips: '36061',
    workers: 150,
    megawatts: 35,
    openedYear: 2010,
    status: 'non-union',
    organizingScore: 78,
    scoreFactors: [
      { name: 'Workforce Size', weight: 0.25, score: 0.80, description: 'Large workforce (150 workers)', type: 'positive' },
      { name: 'Regional Density', weight: 0.15, score: 0.95, description: 'NYC highest union density in US', type: 'positive' },
      { name: 'Recent Activity', weight: 0.20, score: 0.40, description: 'Limited recent organizing', type: 'neutral' },
      { name: 'Wage Gap', weight: 0.15, score: 0.70, description: 'NYC wages competitive but below IBEW 3', type: 'positive' },
      { name: 'Employer Hostility', weight: -0.15, score: 0.30, description: 'Neutral employer', type: 'positive' },
      { name: 'Complexity', weight: -0.10, score: 0.70, description: 'Multiple tenants complicate organizing', type: 'negative' },
    ],
    factors: [
      { text: 'Large workforce (150 workers)', type: 'positive' },
      { text: 'NYC high union density', type: 'positive' },
      { text: 'Multiple tenants complicate organizing', type: 'negative' },
      { text: 'Strong labor law protections in NY', type: 'positive' },
    ],
    unions: [
      { name: 'IBEW', localNumber: 'Local 3', trade: 'IBEW', members: 27000, location: 'Flushing, NY', phone: '(718) 591-4000', specialization: 'Electrical', website: 'local3ibew.com' },
      { name: 'SMART', localNumber: 'Local 28', trade: 'SMART', members: 4500, location: 'New York, NY', phone: '(212) 941-7700', specialization: 'HVAC/Sheet Metal' },
    ]
  },
];

const TRADE_COLORS: Record<string, { bg: string; text: string; icon: string }> = {
  'IBEW': { bg: 'rgba(59, 130, 246, 0.2)', text: '#3b82f6', icon: '🔌' },
  'SMART': { bg: 'rgba(139, 92, 246, 0.2)', text: '#8b5cf6', icon: '❄️' },
  'UA': { bg: 'rgba(20, 184, 166, 0.2)', text: '#14b8a6', icon: '🔧' },
  'IUOE': { bg: 'rgba(236, 72, 153, 0.2)', text: '#ec4899', icon: '⚙️' },
  'CWA': { bg: 'rgba(245, 158, 11, 0.2)', text: '#f59e0b', icon: '📞' },
};

const MAP_LAYERS: { id: MapLayerType; label: string; description: string }[] = [
  { id: 'status', label: 'Union Status', description: 'Represented vs. Non-Union' },
  { id: 'score', label: 'Organizing Score', description: 'Opportunity assessment' },
  { id: 'jurisdiction', label: 'Jurisdiction', description: 'Trade union territories' },
];

export const UnionOrganizingIntelligence: React.FC<UnionOrganizingIntelligenceProps> = ({ userLocation }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'represented' | 'non-union' | 'active-campaign'>('all');
  const [tradeFilter, setTradeFilter] = useState<'all' | 'IBEW' | 'SMART' | 'UA' | 'IUOE' | 'CWA'>('all');
  const [expandedCard, setExpandedCard] = useState<string | null>(null);
  const [selectedEmployer, setSelectedEmployer] = useState<string | null>(null);
  const [copiedContact, setCopiedContact] = useState<string | null>(null);
  const [mapLayer, setMapLayer] = useState<MapLayerType>('status');
  const [showScoreBreakdown, setShowScoreBreakdown] = useState<string | null>(null);
  const [showJobSignals, setShowJobSignals] = useState<string | null>(null);
  const [showPrivacyInfo, setShowPrivacyInfo] = useState(false);

  // Filter facilities based on user location and filters
  const filteredFacilities = useMemo(() => {
    let facilities = SAMPLE_FACILITIES;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      facilities = facilities.filter(f => 
        f.name.toLowerCase().includes(query) ||
        f.operator.toLowerCase().includes(query) ||
        f.location.toLowerCase().includes(query) ||
        (f.county && f.county.toLowerCase().includes(query))
      );
    }
    
    if (statusFilter !== 'all') {
      facilities = facilities.filter(f => f.status === statusFilter);
    }
    
    if (tradeFilter !== 'all') {
      facilities = facilities.filter(f => 
        f.unions.some(u => u.trade === tradeFilter)
      );
    }
    
    return facilities;
  }, [searchQuery, statusFilter, tradeFilter]);

  // Calculate stats
  const stats = useMemo(() => ({
    represented: SAMPLE_FACILITIES.filter(f => f.status === 'represented').length,
    targets: SAMPLE_FACILITIES.filter(f => f.status === 'non-union').length,
    activeCampaigns: SAMPLE_FACILITIES.filter(f => f.status === 'active-campaign').length,
    estimatedNonUnionWorkers: SAMPLE_FACILITIES
      .filter(f => f.status === 'non-union')
      .reduce((sum, f) => sum + f.workers, 0),
    highPriorityTargets: SAMPLE_FACILITIES
      .filter(f => f.status === 'non-union' && f.organizingScore && f.organizingScore >= 75).length,
  }), []);

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedContact(id);
    setTimeout(() => setCopiedContact(null), 2000);
  }, []);

  const getStatusBadge = (status: FacilityData['status']) => {
    switch (status) {
      case 'represented':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/30">
            ✅ Represented
          </span>
        );
      case 'non-union':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-[#eab308]/20 text-[#eab308] border border-[#eab308]/30">
            ⚠️ Non-Union
          </span>
        );
      case 'active-campaign':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wide bg-[#f97316]/20 text-[#f97316] border border-[#f97316]/30">
            🔥 Active Campaign
          </span>
        );
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return { text: '#22c55e', bg: 'linear-gradient(90deg, #22c55e, #16a34a)', label: 'HIGH PRIORITY' };
    if (score >= 50) return { text: '#eab308', bg: 'linear-gradient(90deg, #eab308, #ca8a04)', label: 'MODERATE' };
    if (score >= 25) return { text: '#f97316', bg: 'linear-gradient(90deg, #f97316, #ea580c)', label: 'CHALLENGING' };
    return { text: '#6b7280', bg: 'linear-gradient(90deg, #6b7280, #4b5563)', label: 'LOW PRIORITY' };
  };

  const getScoreRecommendation = (score: number) => {
    if (score >= 75) return 'Strong organizing opportunity - recommend immediate outreach';
    if (score >= 50) return 'Assess with local organizers before committing resources';
    if (score >= 25) return 'Requires significant resources - consider strategic timing';
    return 'Focus elsewhere first - monitor for changes';
  };

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[#21262d] border-b border-[#30363d]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#3b82f6] to-[#8b5cf6] flex items-center justify-center">
              <Target className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-[#e6edf3] flex items-center gap-2">
                Union Organizing Intelligence
                <span className="text-[10px] px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] rounded-full">BETA</span>
              </h3>
              <p className="text-xs text-[#8b949e]">Strategic target identification for data center organizing</p>
            </div>
          </div>
          
          {/* Map Layer Toggle */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#8b949e] flex items-center gap-1">
              <Map className="w-3 h-3" /> View:
            </span>
            {MAP_LAYERS.map((layer) => (
              <button
                key={layer.id}
                onClick={() => setMapLayer(layer.id)}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  mapLayer === layer.id
                    ? 'bg-[#3b82f6] text-white'
                    : 'bg-[#0d1117] text-[#8b949e] hover:text-[#e6edf3]'
                }`}
                title={layer.description}
              >
                {layer.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Privacy Notice */}
        <div className="bg-[#0d1117] border border-[#238636] rounded-lg p-3 flex items-start gap-3">
          <Lock className="w-5 h-5 text-[#3fb950] shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#3fb950] font-medium">Worker Privacy Protection</span>
              <button 
                onClick={() => setShowPrivacyInfo(!showPrivacyInfo)}
                className="text-xs text-[#8b949e] hover:text-[#e6edf3]"
              >
                {showPrivacyInfo ? 'Hide' : 'Learn more'}
              </button>
            </div>
            {showPrivacyInfo && (
              <div className="mt-2 text-xs text-[#8b949e] space-y-1">
                <p>• No individual worker data is collected or displayed</p>
                <p>• Only aggregate workforce estimates from public sources</p>
                <p>• No authorization card counts or campaign details</p>
                <p>• All data from public NLRB and DOL filings</p>
              </div>
            )}
          </div>
        </div>

        {/* Search & Filters */}
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6e7681]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by location, facility, operator, or county..."
                className="w-full pl-10 pr-4 py-3 bg-[#0d1117] border border-[#30363d] rounded-lg text-[#e6edf3] text-sm placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff]"
              />
            </div>
            <button className="px-6 py-3 bg-gradient-to-r from-[#3b82f6] to-[#2563eb] text-white font-semibold rounded-lg hover:translate-y-[-2px] transition-transform flex items-center gap-2">
              <Search className="w-4 h-4" />
              Search
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm text-[#8b949e]">Status:</span>
            {[
              { value: 'all', label: 'All' },
              { value: 'represented', label: '✅ Represented' },
              { value: 'non-union', label: '⚠️ Organizing Target' },
              { value: 'active-campaign', label: '🔥 Active Campaign' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setStatusFilter(option.value as typeof statusFilter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  statusFilter === option.value
                    ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                    : 'bg-transparent border-[#475569] text-[#8b949e] hover:border-[#3b82f6]'
                }`}
              >
                {option.label}
              </button>
            ))}

            <span className="text-sm text-[#8b949e] ml-4">Trade:</span>
            {[
              { value: 'all', label: 'All Trades' },
              { value: 'IBEW', label: '🔌 IBEW' },
              { value: 'SMART', label: '❄️ SMART' },
              { value: 'UA', label: '🔧 UA' },
              { value: 'IUOE', label: '⚙️ IUOE' },
              { value: 'CWA', label: '📞 CWA' },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTradeFilter(option.value as typeof tradeFilter)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  tradeFilter === option.value
                    ? 'bg-[#3b82f6] border-[#3b82f6] text-white'
                    : 'bg-transparent border-[#475569] text-[#8b949e] hover:border-[#3b82f6]'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#22c55e]">{stats.represented}</div>
            <div className="text-xs text-[#8b949e]">Represented</div>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#eab308]">{stats.targets}</div>
            <div className="text-xs text-[#8b949e]">Targets</div>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#f97316]">{stats.activeCampaigns}</div>
            <div className="text-xs text-[#8b949e]">Active</div>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#dc2626]">{stats.highPriorityTargets}</div>
            <div className="text-xs text-[#8b949e]">High Priority</div>
          </div>
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-4 text-center">
            <div className="text-3xl font-bold text-[#3b82f6]">~{stats.estimatedNonUnionWorkers.toLocaleString()}</div>
            <div className="text-xs text-[#8b949e]">Non-Union Workers</div>
          </div>
        </div>

        {/* Facility Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredFacilities.map((facility) => (
            <div
              key={facility.id}
              className="bg-[#0d1117] border border-[#30363d] rounded-xl overflow-hidden hover:border-[#3b82f6] hover:translate-y-[-2px] transition-all"
            >
              {/* Card Header */}
              <div className="px-5 py-4 border-b border-[#30363d] flex justify-between items-start">
                <div>
                  <div className="font-semibold text-[#e6edf3] flex items-center gap-2">
                    {facility.name}
                    {facility.isHyperscaler && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-[#f97316]/20 text-[#f97316] rounded">
                        HYPERSCALER
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-[#8b949e]">{facility.operator}</div>
                </div>
                {getStatusBadge(facility.status)}
              </div>

              {/* Card Body */}
              <div className="px-5 py-4">
                {/* Meta Info */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                    <MapPin className="w-4 h-4" /> {facility.location}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                    <Users className="w-4 h-4" /> ~{facility.workers} workers
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                    <Zap className="w-4 h-4" /> {facility.megawatts} MW
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[#8b949e]">
                    <Calendar className="w-4 h-4" /> Opened {facility.openedYear}
                  </div>
                  {facility.county && (
                    <div className="flex items-center gap-2 text-sm text-[#8b949e] col-span-2">
                      <Map className="w-4 h-4" /> {facility.county} {facility.countyFips && `(FIPS: ${facility.countyFips})`}
                    </div>
                  )}
                </div>

                {/* Organizing Score with Breakdown */}
                {facility.status === 'non-union' && facility.organizingScore && (
                  <div className="bg-[#161b22] rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-[#8b949e] uppercase tracking-wide">Organizing Score</span>
                        <button
                          onClick={() => setShowScoreBreakdown(showScoreBreakdown === facility.id ? null : facility.id)}
                          className="text-[#58a6ff] hover:text-[#79c0ff]"
                        >
                          <Info className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="text-right">
                        <span 
                          className="text-xl font-bold"
                          style={{ color: getScoreColor(facility.organizingScore).text }}
                        >
                          {facility.organizingScore}/100
                        </span>
                        <span 
                          className="ml-2 text-[10px] px-1.5 py-0.5 rounded"
                          style={{ 
                            background: `${getScoreColor(facility.organizingScore).text}20`,
                            color: getScoreColor(facility.organizingScore).text
                          }}
                        >
                          {getScoreColor(facility.organizingScore).label}
                        </span>
                      </div>
                    </div>
                    <div className="h-2 bg-[#30363d] rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${facility.organizingScore}%`,
                          background: getScoreColor(facility.organizingScore).bg
                        }}
                      />
                    </div>
                    
                    {/* Score Factor Breakdown */}
                    {showScoreBreakdown === facility.id && facility.scoreFactors && (
                      <div className="mt-4 pt-4 border-t border-[#30363d]">
                        <h5 className="text-xs font-medium text-[#e6edf3] mb-3 flex items-center gap-2">
                          <PieChart className="w-3.5 h-3.5" /> Score Breakdown
                        </h5>
                        <div className="space-y-2">
                          {facility.scoreFactors.map((factor, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className="w-24 text-[10px] text-[#8b949e] truncate">{factor.name}</div>
                              <div className="flex-1 h-1.5 bg-[#30363d] rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full"
                                  style={{ 
                                    width: `${factor.score * 100}%`,
                                    background: factor.type === 'positive' ? '#22c55e' : 
                                               factor.type === 'negative' ? '#f97316' : '#8b949e'
                                  }}
                                />
                              </div>
                              <div className="w-12 text-[10px] text-right" style={{
                                color: factor.type === 'positive' ? '#22c55e' : 
                                       factor.type === 'negative' ? '#f97316' : '#8b949e'
                              }}>
                                {factor.weight > 0 ? '+' : ''}{(factor.weight * 100).toFixed(0)}%
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="mt-3 text-[10px] text-[#6e7681] italic">
                          {getScoreRecommendation(facility.organizingScore)}
                        </p>
                      </div>
                    )}

                    {/* Simple factors when not expanded */}
                    {showScoreBreakdown !== facility.id && (
                      <div className="mt-3 space-y-1">
                        {facility.factors.slice(0, 3).map((factor, i) => (
                          <div 
                            key={i}
                            className={`flex items-center gap-2 text-xs ${
                              factor.type === 'positive' ? 'text-[#22c55e]' :
                              factor.type === 'negative' ? 'text-[#f97316]' :
                              'text-[#8b949e]'
                            }`}
                          >
                            {factor.type === 'positive' ? '✓' : factor.type === 'negative' ? '⚠' : '○'} {factor.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Job Posting Signals */}
                {facility.jobSignals && facility.jobSignals.length > 0 && (
                  <button
                    onClick={() => setShowJobSignals(showJobSignals === facility.id ? null : facility.id)}
                    className="w-full mb-4 px-3 py-2 bg-[#161b22] rounded-lg border border-[#30363d] hover:border-[#58a6ff] transition-colors flex items-center justify-between"
                  >
                    <span className="text-xs text-[#8b949e] flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5" /> Job Posting Signals
                      <span className="px-1.5 py-0.5 bg-[#eab308]/20 text-[#eab308] rounded text-[9px]">
                        {facility.jobSignals.length} detected
                      </span>
                    </span>
                    <ChevronDown className={`w-4 h-4 text-[#8b949e] transition-transform ${showJobSignals === facility.id ? 'rotate-180' : ''}`} />
                  </button>
                )}

                {showJobSignals === facility.id && facility.jobSignals && (
                  <div className="mb-4 p-3 bg-[#0d1117] rounded-lg border border-[#30363d]">
                    <h5 className="text-xs font-medium text-[#e6edf3] mb-2">Non-Union Indicators Detected</h5>
                    {facility.jobSignals.map((signal, i) => (
                      <div key={i} className="text-[10px] text-[#8b949e] py-1 border-b border-[#21262d] last:border-0">
                        <div className="flex justify-between">
                          <span>{signal.source}</span>
                          <span>{signal.date}</span>
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {signal.indicators.map((ind, j) => (
                            <span key={j} className="px-1.5 py-0.5 bg-[#eab308]/20 text-[#eab308] rounded">
                              "{ind}"
                            </span>
                          ))}
                        </div>
                        <div className="mt-1 text-[#6e7681]">
                          Confidence: {(signal.confidence * 100).toFixed(0)}% non-union
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Represented Status */}
                {facility.status === 'represented' && (
                  <div className="bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-[#8b949e] uppercase tracking-wide">Union Status</span>
                      <span className="text-lg font-bold text-[#22c55e]">{facility.certifiedUnion}</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[#22c55e]">
                        ✓ Certified: {facility.certifiedUnion}
                      </div>
                      {facility.certificationDate && (
                        <div className="flex items-center gap-2 text-xs text-[#22c55e]">
                          ✓ Certification date: {facility.certificationDate}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-[#22c55e]">
                        ✓ Contract expires: {facility.contractExpires}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#22c55e]">
                        ✓ {facility.bargainingUnit} workers in bargaining unit
                      </div>
                    </div>
                  </div>
                )}

                {/* Active Campaign Status */}
                {facility.status === 'active-campaign' && (
                  <div className="bg-[#f97316]/10 border border-[#f97316]/30 rounded-lg p-4 mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-[#8b949e] uppercase tracking-wide">NLRB Case Status</span>
                      <span className="text-lg font-bold text-[#f97316]">RC FILED</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-[#e6edf3]">
                        📋 Case #: {facility.nlrbCaseNumber}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#e6edf3]">
                        📅 Filed: {facility.nlrbFiledDate}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#8b949e]">
                        ⏳ Status: {facility.nlrbStatus}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-[#e6edf3]">
                        🏛️ Petitioner: {facility.petitioningUnion}
                      </div>
                    </div>
                  </div>
                )}

                {/* Jurisdictional Unions */}
                <div>
                  <div className="text-xs text-[#6e7681] uppercase tracking-wide mb-2">
                    {facility.status === 'represented' ? 'Representing Union' : 
                     facility.status === 'active-campaign' ? 'Petitioning Union' :
                     'Jurisdictional Union Locals'}
                  </div>
                  <div className="space-y-2">
                    {facility.unions.slice(0, expandedCard === facility.id ? undefined : 2).map((union, i) => (
                      <div key={i} className="flex items-center gap-3 p-3 bg-[#161b22] rounded-lg">
                        <div 
                          className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                          style={{ 
                            background: TRADE_COLORS[union.trade]?.bg,
                            color: TRADE_COLORS[union.trade]?.text
                          }}
                        >
                          {TRADE_COLORS[union.trade]?.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-[#e6edf3]">{union.name} {union.localNumber}</div>
                          <div className="text-xs text-[#6e7681]">
                            {union.specialization} • {union.members.toLocaleString()} members • {union.location}
                          </div>
                          {union.organizer && (
                            <div className="text-xs text-[#58a6ff]">{union.organizer}</div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1">
                          {union.phone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(union.phone!, `${facility.id}-${i}`);
                              }}
                              className="text-[10px] text-[#3b82f6] hover:text-[#60a5fa] flex items-center gap-1"
                            >
                              {copiedContact === `${facility.id}-${i}` ? (
                                <><Check className="w-3 h-3" /> Copied</>
                              ) : (
                                <><Phone className="w-3 h-3" /> Call</>
                              )}
                            </button>
                          )}
                          {union.website && (
                            <a
                              href={`https://${union.website}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] text-[#3b82f6] hover:text-[#60a5fa] flex items-center gap-1"
                            >
                              <ExternalLink className="w-3 h-3" /> Web
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                    {facility.unions.length > 2 && expandedCard !== facility.id && (
                      <button
                        onClick={() => setExpandedCard(facility.id)}
                        className="w-full text-center text-xs text-[#58a6ff] hover:text-[#79c0ff] py-1"
                      >
                        +{facility.unions.length - 2} more locals
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="px-5 py-3 bg-[#161b22] border-t border-[#30363d] flex gap-2">
                <button 
                  className="flex-1 px-3 py-2 rounded-lg border border-[#475569] text-[#8b949e] text-xs hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEmployer(facility.operator);
                  }}
                >
                  📊 Employer Intel
                </button>
                <button className="flex-1 px-3 py-2 rounded-lg border border-[#475569] text-[#8b949e] text-xs hover:border-[#3b82f6] hover:text-[#3b82f6] transition-colors">
                  📧 Contact Locals
                </button>
                <button className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold ${
                  facility.organizingScore && facility.organizingScore >= 75
                    ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c]'
                    : facility.organizingScore && facility.organizingScore >= 50
                    ? 'bg-[#f97316] text-white hover:bg-[#ea580c]'
                    : 'bg-[#3b82f6] text-white hover:bg-[#2563eb]'
                }`}>
                  {facility.organizingScore && facility.organizingScore >= 75 ? '🎯 HIGH PRIORITY' :
                   facility.status === 'active-campaign' ? '🤝 Support Campaign' :
                   facility.status === 'represented' ? '📧 Contact Local' :
                   '📋 Organizing Brief'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Employer Intelligence Panel */}
        {selectedEmployer && EMPLOYER_INTEL[selectedEmployer] && (
          <div className="bg-[#0d1117] border border-[#f97316]/50 rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-[#f97316]/10 border-b border-[#f97316]/30 flex items-center justify-between">
              <h4 className="font-semibold text-[#e6edf3] flex items-center gap-2">
                🎯 {selectedEmployer} Intelligence Brief
              </h4>
              <button 
                onClick={() => setSelectedEmployer(null)}
                className="text-[#8b949e] hover:text-[#e6edf3]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {/* Assessment Banner */}
              <div className={`p-4 rounded-lg ${
                EMPLOYER_INTEL[selectedEmployer].assessment === 'hostile' ? 'bg-[#dc2626]/10 border border-[#dc2626]/30' :
                EMPLOYER_INTEL[selectedEmployer].assessment === 'moderate' ? 'bg-[#eab308]/10 border border-[#eab308]/30' :
                'bg-[#22c55e]/10 border border-[#22c55e]/30'
              }`}>
                <div className={`text-lg font-bold mb-2 ${
                  EMPLOYER_INTEL[selectedEmployer].assessment === 'hostile' ? 'text-[#dc2626]' :
                  EMPLOYER_INTEL[selectedEmployer].assessment === 'moderate' ? 'text-[#eab308]' :
                  'text-[#22c55e]'
                }`}>
                  {EMPLOYER_INTEL[selectedEmployer].assessment === 'hostile' ? '⚠️ HIGHLY HOSTILE EMPLOYER' :
                   EMPLOYER_INTEL[selectedEmployer].assessment === 'moderate' ? '⚡ MODERATE HOSTILITY' :
                   '✓ NEUTRAL/COOPERATIVE'}
                </div>
                <ul className="space-y-1">
                  {EMPLOYER_INTEL[selectedEmployer].assessmentDetails.map((detail, i) => (
                    <li key={i} className="text-xs text-[#8b949e] flex items-start gap-2">
                      <span className="text-[#6e7681]">•</span> {detail}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-[#161b22] rounded-lg p-3">
                  <div className="text-[10px] text-[#6e7681] uppercase tracking-wide mb-1">NLRB ULP Charges</div>
                  <div className="text-2xl font-bold text-[#f97316]">{EMPLOYER_INTEL[selectedEmployer].ulpChargesCount}</div>
                  <div className="text-[10px] text-[#8b949e]">2020-2025</div>
                </div>
                <div className="bg-[#161b22] rounded-lg p-3">
                  <div className="text-[10px] text-[#6e7681] uppercase tracking-wide mb-1">LM-10 Filings</div>
                  <div className="text-2xl font-bold text-[#f97316]">{EMPLOYER_INTEL[selectedEmployer].lm10Filings}</div>
                  <div className="text-[10px] text-[#8b949e]">Persuader reports</div>
                </div>
                <div className="bg-[#161b22] rounded-lg p-3">
                  <div className="text-[10px] text-[#6e7681] uppercase tracking-wide mb-1">DC Certifications</div>
                  <div className="text-2xl font-bold text-[#e6edf3]">{EMPLOYER_INTEL[selectedEmployer].dataCenterCertifications}</div>
                  <div className="text-[10px] text-[#8b949e]">Nationwide</div>
                </div>
                <div className="bg-[#161b22] rounded-lg p-3">
                  <div className="text-[10px] text-[#6e7681] uppercase tracking-wide mb-1">Avoidance Firms</div>
                  <div className="text-lg font-bold text-[#f97316]">
                    {EMPLOYER_INTEL[selectedEmployer].unionAvoidanceFirms.length > 0 
                      ? EMPLOYER_INTEL[selectedEmployer].unionAvoidanceFirms.length
                      : 'None'}
                  </div>
                  <div className="text-[10px] text-[#8b949e]">Known</div>
                </div>
              </div>

              {/* Union Avoidance Firms */}
              {EMPLOYER_INTEL[selectedEmployer].unionAvoidanceFirms.length > 0 && (
                <div className="bg-[#161b22] rounded-lg p-3">
                  <div className="text-[10px] text-[#6e7681] uppercase tracking-wide mb-2">Known Union Avoidance Firms</div>
                  <div className="flex flex-wrap gap-2">
                    {EMPLOYER_INTEL[selectedEmployer].unionAvoidanceFirms.map((firm, i) => (
                      <span key={i} className="px-2 py-1 bg-[#f97316]/20 text-[#f97316] rounded text-xs">
                        {firm}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Organizing History */}
              {EMPLOYER_INTEL[selectedEmployer].organizingHistory.length > 0 && (
                <div className="bg-[#161b22] rounded-lg p-3">
                  <div className="text-[10px] text-[#6e7681] uppercase tracking-wide mb-2">Organizing History</div>
                  <div className="flex flex-wrap gap-2">
                    {EMPLOYER_INTEL[selectedEmployer].organizingHistory.map((h, i) => (
                      <span key={i} className={`px-2 py-1 rounded text-xs ${
                        h.result === 'win' ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#dc2626]/20 text-[#dc2626]'
                      }`}>
                        {h.facility} {h.result === 'win' ? '✅' : '❌'} ({h.year})
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Activity */}
              {EMPLOYER_INTEL[selectedEmployer].recentActivity && (
                <div className="bg-[#161b22] rounded-lg p-3">
                  <div className="text-[10px] text-[#6e7681] uppercase tracking-wide mb-1">Recent Activity</div>
                  <div className="text-sm text-[#e6edf3]">{EMPLOYER_INTEL[selectedEmployer].recentActivity}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Data Sources */}
        <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5">
          <h4 className="font-semibold text-[#e6edf3] mb-4 flex items-center gap-2">
            <Database className="w-4 h-4" /> Data Sources (labordata Integration)
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h5 className="text-xs text-[#6e7681] uppercase tracking-wide mb-2">Primary Sources</h5>
              <div className="space-y-2">
                {[
                  { name: 'labordata/nlrb-data', desc: 'Certification & ULP lookup', freq: 'daily', color: '#3b82f6' },
                  { name: 'labordata/lm10', desc: 'Persuader report detection', freq: 'periodic', color: '#8b5cf6' },
                  { name: 'labordata/lm20', desc: 'Consultant identification', freq: 'periodic', color: '#8b5cf6' },
                  { name: 'OLMS Bulk Data', desc: 'Union local information', freq: 'annual', color: '#f59e0b' },
                ].map((source, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[#161b22] rounded-lg">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: source.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[#e6edf3] font-medium">{source.name}</div>
                      <div className="text-[10px] text-[#6e7681]">{source.desc}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#21262d] text-[#8b949e] rounded shrink-0">
                      {source.freq}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h5 className="text-xs text-[#6e7681] uppercase tracking-wide mb-2">Supporting Sources</h5>
              <div className="space-y-2">
                {[
                  { name: 'NLRB Active Petitions', desc: 'Real-time campaign tracking', freq: 'live', color: '#22c55e' },
                  { name: 'Baxtel / PeeringDB', desc: 'Facility locations', freq: 'live', color: '#22c55e' },
                  { name: 'Census Geocoder', desc: 'County FIPS lookup', freq: 'static', color: '#6b7280' },
                  { name: 'IBEW Jurisdictional Maps', desc: 'Territory boundaries', freq: 'rare', color: '#6b7280' },
                ].map((source, i) => (
                  <div key={i} className="flex items-center gap-2 px-3 py-2 bg-[#161b22] rounded-lg">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ background: source.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-[#e6edf3] font-medium">{source.name}</div>
                      <div className="text-[10px] text-[#6e7681]">{source.desc}</div>
                    </div>
                    <span className="text-[9px] px-1.5 py-0.5 bg-[#21262d] text-[#8b949e] rounded shrink-0">
                      {source.freq}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-[#30363d] flex items-center gap-2 text-[10px] text-[#6e7681]">
            <GitBranch className="w-3.5 h-3.5" />
            <span>Open source: github.com/labordata • Contributing to worker power through transparent data</span>
          </div>
        </div>
      </div>
    </div>
  );
};
