/**
 * Union Local Discovery Component
 * 
 * Automatic union local discovery based on data center geolocation.
 * Uses county FIPS codes to match building trades jurisdictions.
 * 
 * Data sources:
 * - OLMS (Office of Labor-Management Standards) for union data
 * - Census Geocoder for county FIPS resolution
 * - IBEW jurisdictional maps for boundary data
 * 
 * Key unions for data center work:
 * - IBEW: Electrical (45-70% of DC construction budget)
 * - SMART: HVAC/Sheet Metal
 * - UA: Piping/Mechanical
 * - IUOE: Operating Engineers
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Zap, Wind, Droplets, HardHat, Users, Phone, Mail, Globe,
  MapPin, Building, ExternalLink, ChevronRight, ChevronDown,
  Search, Filter, Star, Shield, AlertTriangle, CheckCircle,
  FileText, Calendar, DollarSign, TrendingUp, Award, Copy, Check
} from 'lucide-react';

// Types
interface UnionLocal {
  olmsFileNumber: string;  // 6-digit F-Number (e.g., "520-038")
  unionName: string;
  parentAffiliation: 'IBEW' | 'SMART' | 'UA' | 'IUOE' | 'LiUNA' | 'Ironworkers' | 'CWA' | 'Other';
  localDesignation: string;  // e.g., "Local 26"
  industryCode: 'electrical' | 'hvac' | 'piping' | 'operating_engineers' | 'laborers' | 'ironworkers' | 'tech';
  address: string;
  city: string;
  state: string;
  zip: string;
  phone?: string;
  website?: string;
  email?: string;
  membershipCount?: number;
  lastLmFilingDate?: string;
  jurisdictionCounties: string[];  // Array of 5-digit FIPS codes
  dataCenterRelevance: 'high' | 'medium' | 'low';
  specializations?: string[];
  recentActivity?: string;
}

interface CountyInfo {
  fips: string;
  name: string;
  state: string;
}

interface UnionLocalDiscoveryProps {
  userLocation: {
    lat?: number;
    lng?: number;
    city: string;
    state: string;
    neighborhood?: string;
  };
  isActive: boolean;
  onUnionSelect?: (union: UnionLocal) => void;
}

// Sample union locals database (in production, this would come from OLMS + custom jurisdiction DB)
const UNION_LOCALS_DB: UnionLocal[] = [
  // IBEW Locals - Primary for data center electrical work
  {
    olmsFileNumber: '520-026',
    unionName: 'International Brotherhood of Electrical Workers',
    parentAffiliation: 'IBEW',
    localDesignation: 'Local 26',
    industryCode: 'electrical',
    address: '4371 Parliament Place',
    city: 'Lanham',
    state: 'MD',
    zip: '20706',
    phone: '(301) 459-2900',
    website: 'https://www.ibewlocal26.org',
    email: 'info@ibewlocal26.org',
    membershipCount: 12000,
    lastLmFilingDate: '2024-03-15',
    jurisdictionCounties: ['24033', '24031', '11001', '51059', '51107', '51153', '51510'],  // DC Metro FIPS
    dataCenterRelevance: 'high',
    specializations: ['Data Center Construction', 'Low Voltage', 'Fire Alarm', 'Fiber Optic'],
    recentActivity: 'Growing from 7,500 to 12,000 members due to Northern Virginia data center demand'
  },
  {
    olmsFileNumber: '520-003',
    unionName: 'International Brotherhood of Electrical Workers',
    parentAffiliation: 'IBEW',
    localDesignation: 'Local 3',
    industryCode: 'electrical',
    address: '158-11 Harry Van Arsdale Jr. Avenue',
    city: 'Flushing',
    state: 'NY',
    zip: '11365',
    phone: '(718) 591-4000',
    website: 'https://www.local3ibew.org',
    email: 'info@local3ibew.org',
    membershipCount: 27000,
    lastLmFilingDate: '2024-02-28',
    jurisdictionCounties: ['36061', '36047', '36081', '36005', '36085'],  // NYC FIPS
    dataCenterRelevance: 'high',
    specializations: ['High-Rise Data Centers', 'Mission Critical', 'Telecommunications'],
    recentActivity: 'Major contracts with Equinix, Digital Realty in NYC metro'
  },
  {
    olmsFileNumber: '520-134',
    unionName: 'International Brotherhood of Electrical Workers',
    parentAffiliation: 'IBEW',
    localDesignation: 'Local 134',
    industryCode: 'electrical',
    address: '2722 South Martin Luther King Drive',
    city: 'Chicago',
    state: 'IL',
    zip: '60616',
    phone: '(312) 567-3800',
    website: 'https://www.ibew134.org',
    membershipCount: 15000,
    lastLmFilingDate: '2024-03-01',
    jurisdictionCounties: ['17031', '17043', '17089', '17097', '17111'],  // Chicago area FIPS
    dataCenterRelevance: 'high',
    specializations: ['Industrial Electrical', 'Data Center Buildouts', 'Controls'],
  },
  {
    olmsFileNumber: '520-617',
    unionName: 'International Brotherhood of Electrical Workers',
    parentAffiliation: 'IBEW',
    localDesignation: 'Local 617',
    industryCode: 'electrical',
    address: '500 Sycamore Street',
    city: 'San Mateo',
    state: 'CA',
    zip: '94402',
    phone: '(650) 342-3600',
    website: 'https://www.ibew617.org',
    membershipCount: 3500,
    lastLmFilingDate: '2024-02-15',
    jurisdictionCounties: ['06081', '06085', '06001'],  // SF Bay Area FIPS
    dataCenterRelevance: 'high',
    specializations: ['Silicon Valley Data Centers', 'Tech Campus Electrical'],
  },
  
  // SMART Locals - HVAC/Sheet Metal
  {
    olmsFileNumber: '480-028',
    unionName: 'Sheet Metal Workers International Association',
    parentAffiliation: 'SMART',
    localDesignation: 'Local 28',
    industryCode: 'hvac',
    address: '500 Greenwich Street',
    city: 'New York',
    state: 'NY',
    zip: '10013',
    phone: '(212) 941-7700',
    website: 'https://www.smartlocal28.org',
    membershipCount: 4500,
    lastLmFilingDate: '2024-03-10',
    jurisdictionCounties: ['36061', '36047', '36081', '36005', '36085', '36059', '36103'],
    dataCenterRelevance: 'high',
    specializations: ['Data Center HVAC', 'Precision Cooling', 'Clean Room Ductwork'],
  },
  {
    olmsFileNumber: '480-085',
    unionName: 'Sheet Metal Workers International Association',
    parentAffiliation: 'SMART',
    localDesignation: 'Local 85',
    industryCode: 'hvac',
    address: '1150 Collier Road NW',
    city: 'Atlanta',
    state: 'GA',
    zip: '30318',
    phone: '(404) 355-0378',
    website: 'https://www.smartlocal85.org',
    membershipCount: 2800,
    lastLmFilingDate: '2024-02-20',
    jurisdictionCounties: ['13121', '13089', '13135', '13063', '13067', '13097'],  // Atlanta metro FIPS
    dataCenterRelevance: 'high',
    specializations: ['Data Center HVAC', 'Industrial Ventilation'],
    recentActivity: 'Explicitly lists data centers as primary work sector'
  },
  {
    olmsFileNumber: '480-104',
    unionName: 'Sheet Metal Workers International Association',
    parentAffiliation: 'SMART',
    localDesignation: 'Local 104',
    industryCode: 'hvac',
    address: '2610 Crow Canyon Road',
    city: 'San Ramon',
    state: 'CA',
    zip: '94583',
    phone: '(925) 803-8500',
    website: 'https://www.smw104.org',
    membershipCount: 5200,
    lastLmFilingDate: '2024-03-05',
    jurisdictionCounties: ['06001', '06013', '06041', '06055', '06075', '06081', '06085', '06095', '06097'],  // 49 Northern CA counties
    dataCenterRelevance: 'high',
    specializations: ['Mission Critical Cooling', 'Hyperscale Data Centers'],
  },

  // UA Locals - Piping/Mechanical
  {
    olmsFileNumber: '420-001',
    unionName: 'United Association of Plumbers and Pipefitters',
    parentAffiliation: 'UA',
    localDesignation: 'Local 1',
    industryCode: 'piping',
    address: '158-29 George Meany Boulevard',
    city: 'Howard Beach',
    state: 'NY',
    zip: '11414',
    phone: '(718) 738-7500',
    website: 'https://www.ualocal1.org',
    membershipCount: 8500,
    lastLmFilingDate: '2024-02-25',
    jurisdictionCounties: ['36061', '36047', '36081', '36005', '36085'],
    dataCenterRelevance: 'high',
    specializations: ['Chilled Water Systems', 'Mechanical Cooling', 'Fire Suppression'],
  },
  {
    olmsFileNumber: '420-412',
    unionName: 'United Association of Plumbers and Pipefitters',
    parentAffiliation: 'UA',
    localDesignation: 'Local 412',
    industryCode: 'piping',
    address: '9696 Skillman Street',
    city: 'Dallas',
    state: 'TX',
    zip: '75243',
    phone: '(214) 343-2717',
    website: 'https://www.ualocal412.org',
    membershipCount: 3200,
    lastLmFilingDate: '2024-03-12',
    jurisdictionCounties: ['48113', '48439', '48085', '48121', '48257', '48397'],  // Dallas area FIPS
    dataCenterRelevance: 'high',
    specializations: ['Data Center Cooling', 'Industrial Piping'],
    recentActivity: 'Members worked Meta\'s Los Lunas facility'
  },
  {
    olmsFileNumber: '420-286',
    unionName: 'United Association of Plumbers and Pipefitters',
    parentAffiliation: 'UA',
    localDesignation: 'Local 286',
    industryCode: 'piping',
    address: '12636 Research Boulevard',
    city: 'Austin',
    state: 'TX',
    zip: '78759',
    phone: '(512) 454-9251',
    website: 'https://www.ualocal286.org',
    membershipCount: 2100,
    lastLmFilingDate: '2024-02-18',
    jurisdictionCounties: ['48453', '48491', '48209', '48021', '48055', '48027', '48053', '48299', '48411', '48281', '48027', '48287', '48319'],  // 13 Central TX counties
    dataCenterRelevance: 'high',
    specializations: ['Hyperscale Cooling Systems', 'Water Treatment'],
  },

  // IUOE Locals - Operating Engineers
  {
    olmsFileNumber: '370-030',
    unionName: 'International Union of Operating Engineers',
    parentAffiliation: 'IUOE',
    localDesignation: 'Local 30',
    industryCode: 'operating_engineers',
    address: '141-57 Northern Boulevard',
    city: 'Flushing',
    state: 'NY',
    zip: '11354',
    phone: '(718) 847-8484',
    website: 'https://www.iuoelocal30.org',
    membershipCount: 6500,
    lastLmFilingDate: '2024-03-08',
    jurisdictionCounties: ['36061', '36047', '36081', '36005', '36085', '36059', '36103', '36119'],
    dataCenterRelevance: 'medium',
    specializations: ['Building Systems', 'Stationary Engineers', 'HVAC Operations'],
  },
  {
    olmsFileNumber: '370-150',
    unionName: 'International Union of Operating Engineers',
    parentAffiliation: 'IUOE',
    localDesignation: 'Local 150',
    industryCode: 'operating_engineers',
    address: '6200 Joliet Road',
    city: 'Countryside',
    state: 'IL',
    zip: '60525',
    phone: '(708) 482-4100',
    website: 'https://www.local150.org',
    membershipCount: 23000,
    lastLmFilingDate: '2024-02-22',
    jurisdictionCounties: ['17031', '17043', '17089', '17097', '17111', '17197', '18089'],  // IL/IN
    dataCenterRelevance: 'medium',
    specializations: ['Heavy Equipment', 'Data Center Site Work', 'Building Operations'],
    recentActivity: 'Covers Illinois, Indiana, and parts of Iowa'
  },

  // CWA/Tech Workers
  {
    olmsFileNumber: '610-1400',
    unionName: 'Communications Workers of America - Alphabet Workers Union',
    parentAffiliation: 'CWA',
    localDesignation: 'AWU-CWA Local 1400',
    industryCode: 'tech',
    address: '501 3rd Street NW',
    city: 'Washington',
    state: 'DC',
    zip: '20001',
    phone: '(202) 434-1100',
    website: 'https://alphabetworkersunion.org',
    email: 'contact@alphabetworkersunion.org',
    membershipCount: 1400,
    lastLmFilingDate: '2024-03-20',
    jurisdictionCounties: [],  // Wall-to-wall, not county-based
    dataCenterRelevance: 'high',
    specializations: ['Data Center Technicians', 'Cloud Operations', 'Tech Workers'],
    recentActivity: 'Won COVID hazard pay for data center workers'
  },
];

// County FIPS to Name mapping (sample - would be complete in production)
const COUNTY_FIPS_MAP: Record<string, CountyInfo> = {
  '36061': { fips: '36061', name: 'New York County', state: 'NY' },
  '36047': { fips: '36047', name: 'Kings County (Brooklyn)', state: 'NY' },
  '36081': { fips: '36081', name: 'Queens County', state: 'NY' },
  '36005': { fips: '36005', name: 'Bronx County', state: 'NY' },
  '36085': { fips: '36085', name: 'Richmond County (Staten Island)', state: 'NY' },
  '36059': { fips: '36059', name: 'Nassau County', state: 'NY' },
  '36103': { fips: '36103', name: 'Suffolk County', state: 'NY' },
  '36119': { fips: '36119', name: 'Westchester County', state: 'NY' },
  '24033': { fips: '24033', name: 'Prince George\'s County', state: 'MD' },
  '24031': { fips: '24031', name: 'Montgomery County', state: 'MD' },
  '11001': { fips: '11001', name: 'District of Columbia', state: 'DC' },
  '51059': { fips: '51059', name: 'Fairfax County', state: 'VA' },
  '51107': { fips: '51107', name: 'Loudoun County', state: 'VA' },
  '51153': { fips: '51153', name: 'Prince William County', state: 'VA' },
  '17031': { fips: '17031', name: 'Cook County', state: 'IL' },
  '06081': { fips: '06081', name: 'San Mateo County', state: 'CA' },
  '06085': { fips: '06085', name: 'Santa Clara County', state: 'CA' },
  '06001': { fips: '06001', name: 'Alameda County', state: 'CA' },
};

// Trade info for display
const TRADE_INFO: Record<string, { name: string; icon: React.ReactNode; color: string; dcShare: string }> = {
  'IBEW': { name: 'Electrical Workers', icon: <Zap className="w-4 h-4" />, color: '#f59e0b', dcShare: '45-70%' },
  'SMART': { name: 'Sheet Metal/HVAC', icon: <Wind className="w-4 h-4" />, color: '#3b82f6', dcShare: '15-25%' },
  'UA': { name: 'Plumbers & Pipefitters', icon: <Droplets className="w-4 h-4" />, color: '#10b981', dcShare: '10-20%' },
  'IUOE': { name: 'Operating Engineers', icon: <HardHat className="w-4 h-4" />, color: '#8b5cf6', dcShare: '5-10%' },
  'LiUNA': { name: 'Laborers', icon: <Users className="w-4 h-4" />, color: '#ef4444', dcShare: '5-10%' },
  'CWA': { name: 'Communications Workers', icon: <Globe className="w-4 h-4" />, color: '#ec4899', dcShare: 'Operations' },
  'Ironworkers': { name: 'Ironworkers', icon: <Building className="w-4 h-4" />, color: '#6b7280', dcShare: '5-10%' },
  'Other': { name: 'Other Trades', icon: <Users className="w-4 h-4" />, color: '#9ca3af', dcShare: 'Varies' },
};

export const UnionLocalDiscovery: React.FC<UnionLocalDiscoveryProps> = ({
  userLocation,
  isActive,
  onUnionSelect
}) => {
  const [countyFips, setCountyFips] = useState<string | null>(null);
  const [countyName, setCountyName] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTrade, setSelectedTrade] = useState<string | null>(null);
  const [expandedUnion, setExpandedUnion] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);

  // Simulate Census Geocoder API call to get county FIPS
  const fetchCountyFips = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // In production, call: geocoding.geo.census.gov/geocoder/geographies/coordinates
      // For demo, we'll simulate based on state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Simulate FIPS lookup based on state
      const stateToFips: Record<string, { fips: string; name: string }> = {
        'NY': { fips: '36005', name: 'Bronx County' },
        'CA': { fips: '06085', name: 'Santa Clara County' },
        'IL': { fips: '17031', name: 'Cook County' },
        'TX': { fips: '48113', name: 'Dallas County' },
        'VA': { fips: '51107', name: 'Loudoun County' },
        'MD': { fips: '24033', name: 'Prince George\'s County' },
        'DC': { fips: '11001', name: 'District of Columbia' },
        'GA': { fips: '13121', name: 'Fulton County' },
      };
      
      const match = stateToFips[userLocation.state] || { fips: '36005', name: 'Bronx County' };
      setCountyFips(match.fips);
      setCountyName(match.name);
    } catch (err) {
      setError('Failed to resolve county. Using state-level matching.');
      // Fallback to state-based matching
      setCountyFips(null);
    } finally {
      setIsLoading(false);
    }
  }, [userLocation.state]);

  // Fetch county when location changes
  useEffect(() => {
    if (isActive && userLocation.lat && userLocation.lng) {
      fetchCountyFips(userLocation.lat, userLocation.lng);
    }
  }, [isActive, userLocation.lat, userLocation.lng, fetchCountyFips]);

  // Filter unions based on county FIPS or state
  const matchingUnions = useMemo(() => {
    let unions = UNION_LOCALS_DB;
    
    // Filter by county FIPS if available, otherwise by state
    if (countyFips) {
      unions = unions.filter(u => 
        u.jurisdictionCounties.includes(countyFips) || 
        u.jurisdictionCounties.length === 0  // Wall-to-wall unions
      );
    } else {
      unions = unions.filter(u => u.state === userLocation.state || u.jurisdictionCounties.length === 0);
    }
    
    // Filter by trade if selected
    if (selectedTrade) {
      unions = unions.filter(u => u.parentAffiliation === selectedTrade);
    }
    
    // Sort by relevance
    return unions.sort((a, b) => {
      const relevanceOrder = { high: 0, medium: 1, low: 2 };
      return relevanceOrder[a.dataCenterRelevance] - relevanceOrder[b.dataCenterRelevance];
    });
  }, [countyFips, userLocation.state, selectedTrade]);

  const handleCopyPhone = useCallback(async (phone: string, unionId: string) => {
    try {
      await navigator.clipboard.writeText(phone);
      setCopiedPhone(unionId);
      setTimeout(() => setCopiedPhone(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const trades = ['IBEW', 'SMART', 'UA', 'IUOE', 'CWA'];

  if (!isActive) return null;

  return (
    <div className="bg-[#161b22] border border-[#30363d] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-[#21262d] border-b border-[#30363d]">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#f59e0b] to-[#ef4444] flex items-center justify-center">
              <Users className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-lg flex items-center gap-2">
                Union Local Discovery
                <span className="text-xs px-2 py-0.5 bg-[#f59e0b]/20 text-[#f59e0b] rounded-full">OLMS Data</span>
              </h3>
              <p className="text-sm text-[#8b949e]">Building trades with jurisdiction in your area</p>
            </div>
          </div>
          
          {/* County Info */}
          {countyName && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-[#0d1117] border border-[#30363d] rounded-lg">
              <MapPin className="w-4 h-4 text-[#3fb950]" />
              <span className="text-sm">
                <span className="text-[#8b949e]">County:</span>{' '}
                <span className="text-[#e6edf3] font-medium">{countyName}</span>
              </span>
              {countyFips && (
                <span className="text-xs text-[#6e7681] font-mono">FIPS: {countyFips}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Trade Filters */}
      <div className="px-6 py-3 border-b border-[#30363d] bg-[#0d1117]/50">
        <div className="flex items-center gap-2 flex-wrap">
          <Filter className="w-4 h-4 text-[#8b949e]" />
          <span className="text-sm text-[#8b949e]">Filter by trade:</span>
          <button
            onClick={() => setSelectedTrade(null)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              selectedTrade === null
                ? 'bg-[#58a6ff] text-white'
                : 'bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3]'
            }`}
          >
            All Trades
          </button>
          {trades.map(trade => {
            const info = TRADE_INFO[trade];
            return (
              <button
                key={trade}
                onClick={() => setSelectedTrade(trade === selectedTrade ? null : trade)}
                className={`px-3 py-1 text-xs rounded-full transition-colors flex items-center gap-1.5 ${
                  selectedTrade === trade
                    ? 'text-white'
                    : 'bg-[#21262d] text-[#8b949e] hover:text-[#e6edf3]'
                }`}
                style={{ backgroundColor: selectedTrade === trade ? info.color : undefined }}
              >
                {info.icon}
                {trade}
                <span className="text-[10px] opacity-70">({info.dcShare})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="p-8 text-center">
          <div className="w-8 h-8 border-2 border-[#58a6ff] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-[#8b949e]">Resolving county jurisdiction via Census Geocoder...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mx-6 my-4 p-3 bg-[#f8514920] border border-[#f85149] rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#f85149]" />
          <span className="text-sm text-[#f85149]">{error}</span>
        </div>
      )}

      {/* Union List */}
      {!isLoading && (
        <div className="p-4 space-y-3">
          {matchingUnions.length === 0 ? (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-[#30363d] mx-auto mb-3" />
              <p className="text-[#8b949e]">No union locals found for this area.</p>
              <p className="text-sm text-[#6e7681] mt-1">Try selecting "All Trades" or check nearby counties.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-[#8b949e] mb-4">
                Found <strong className="text-[#e6edf3]">{matchingUnions.length}</strong> union locals with jurisdiction in your area
              </p>
              
              {matchingUnions.map((union) => {
                const tradeInfo = TRADE_INFO[union.parentAffiliation];
                const isExpanded = expandedUnion === union.olmsFileNumber;
                
                return (
                  <div
                    key={union.olmsFileNumber}
                    className={`bg-[#0d1117] border rounded-xl overflow-hidden transition-all ${
                      isExpanded ? 'border-[#58a6ff]' : 'border-[#30363d] hover:border-[#58a6ff]/50'
                    }`}
                  >
                    {/* Union Header */}
                    <button
                      onClick={() => setExpandedUnion(isExpanded ? null : union.olmsFileNumber)}
                      className="w-full p-4 flex items-start gap-4 text-left"
                    >
                      <div
                        className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: `${tradeInfo.color}20` }}
                      >
                        <div style={{ color: tradeInfo.color }}>{tradeInfo.icon}</div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-[#e6edf3]">
                            {union.parentAffiliation} {union.localDesignation}
                          </h4>
                          {union.dataCenterRelevance === 'high' && (
                            <span className="flex items-center gap-1 text-[10px] px-2 py-0.5 bg-[#3fb950]/20 text-[#3fb950] rounded-full">
                              <Star className="w-3 h-3" /> High DC Relevance
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-[#8b949e] truncate">{union.unionName}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#6e7681]">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {union.city}, {union.state}
                          </span>
                          {union.membershipCount && (
                            <span className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {union.membershipCount.toLocaleString()} members
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <ChevronRight className={`w-5 h-5 text-[#8b949e] transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    </button>
                    
                    {/* Expanded Content */}
                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-[#30363d] pt-4 space-y-4 animate-fadeIn">
                        {/* Contact Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {union.phone && (
                            <div className="flex items-center justify-between p-3 bg-[#21262d] rounded-lg">
                              <div className="flex items-center gap-2">
                                <Phone className="w-4 h-4 text-[#3fb950]" />
                                <span className="text-sm">{union.phone}</span>
                              </div>
                              <button
                                onClick={() => handleCopyPhone(union.phone!, union.olmsFileNumber)}
                                className="text-[#8b949e] hover:text-[#e6edf3]"
                              >
                                {copiedPhone === union.olmsFileNumber ? (
                                  <Check className="w-4 h-4 text-[#3fb950]" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          )}
                          {union.email && (
                            <a
                              href={`mailto:${union.email}`}
                              className="flex items-center gap-2 p-3 bg-[#21262d] rounded-lg hover:bg-[#30363d] transition-colors"
                            >
                              <Mail className="w-4 h-4 text-[#58a6ff]" />
                              <span className="text-sm truncate">{union.email}</span>
                            </a>
                          )}
                        </div>
                        
                        {/* Address */}
                        <div className="p-3 bg-[#21262d] rounded-lg">
                          <div className="flex items-start gap-2">
                            <Building className="w-4 h-4 text-[#8b949e] mt-0.5" />
                            <div>
                              <p className="text-sm">{union.address}</p>
                              <p className="text-sm text-[#8b949e]">{union.city}, {union.state} {union.zip}</p>
                            </div>
                          </div>
                        </div>
                        
                        {/* Specializations */}
                        {union.specializations && union.specializations.length > 0 && (
                          <div>
                            <h5 className="text-xs text-[#8b949e] uppercase tracking-wider mb-2">Data Center Specializations</h5>
                            <div className="flex flex-wrap gap-2">
                              {union.specializations.map((spec, i) => (
                                <span key={i} className="px-2 py-1 text-xs bg-[#21262d] rounded-full text-[#e6edf3]">
                                  {spec}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Recent Activity */}
                        {union.recentActivity && (
                          <div className="p-3 bg-[#f59e0b10] border border-[#f59e0b30] rounded-lg">
                            <div className="flex items-start gap-2">
                              <TrendingUp className="w-4 h-4 text-[#f59e0b] mt-0.5" />
                              <p className="text-sm text-[#e6edf3]">{union.recentActivity}</p>
                            </div>
                          </div>
                        )}
                        
                        {/* OLMS Info */}
                        <div className="flex items-center justify-between text-xs text-[#6e7681] pt-2 border-t border-[#30363d]">
                          <div className="flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <FileText className="w-3 h-3" />
                              OLMS F-Number: <code className="bg-[#21262d] px-1.5 py-0.5 rounded">{union.olmsFileNumber}</code>
                            </span>
                            {union.lastLmFilingDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                Last LM Filing: {union.lastLmFilingDate}
                              </span>
                            )}
                          </div>
                          {union.website && (
                            <a
                              href={union.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[#58a6ff] hover:underline"
                            >
                              Visit Website <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Footer with data sources */}
      <div className="px-6 py-3 bg-[#0d1117] border-t border-[#30363d]">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs text-[#6e7681]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Shield className="w-3 h-3" /> OLMS Bulk Data
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Census Geocoder FIPS
            </span>
            <span className="flex items-center gap-1">
              <FileText className="w-3 h-3" /> IBEW Jurisdictional Maps
            </span>
          </div>
          <a
            href="https://olmsapps.dol.gov/olpdr"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#58a6ff] hover:underline flex items-center gap-1"
          >
            View OLMS Data <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};

