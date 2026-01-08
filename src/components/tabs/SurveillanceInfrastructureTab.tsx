/**
 * Surveillance Infrastructure Tab
 * 
 * Dashboard for tracking ICE, DHS, and government surveillance
 * infrastructure in data centers. Exposes the connection between
 * Big Tech and the deportation machine.
 * 
 * "The same workers building these data centers are from communities being surveilled"
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Eye, Shield, AlertTriangle, DollarSign, Building2, MapPin,
  Users, FileText, ExternalLink, ChevronDown, ChevronRight,
  Search, Filter, Download, Info, Zap, Database, Globe,
  Radio, Camera, Fingerprint, Phone, Car, CreditCard,
  Activity, Target, AlertCircle, CheckCircle, XCircle, Server
} from 'lucide-react';
import { 
  SURVEILLANCE_COMPANIES, 
  GOVERNMENT_CLOUD_REGIONS,
  getCompanyById,
  getCompaniesByAgency,
  getDirectImmigrantImpactCompanies
} from '../../data/surveillanceCompanies';
import {
  getSurveillanceContractStats,
  getAllSurveillanceContracts,
  getImmigrantTargetingContracts,
  calculateTotalICESurveillanceSpending,
  findContractsForFacility
} from '../../services/federalContractsService';
import { SurveillanceCompany, FederalContract, SurveillanceDataType, FederalAgency } from '../../types/surveillance';
import { db } from '../../db/database';
import { Facility } from '../../types';

// =============================================================================
// KNOWN ICE/DHS CLOUD LOCATIONS
// =============================================================================

// States with known AWS GovCloud or Azure Gov data centers
const GOVCLOUD_STATES = ['VA', 'OR', 'AZ', 'TX', 'OH'];

// Operators known to have federal/government contracts
const FEDERAL_CONTRACTOR_OPERATORS = [
  'Amazon Web Services',
  'AWS',
  'Microsoft',
  'Microsoft Azure',
  'Google',
  'Google Cloud',
  'Oracle',
  'IBM',
  'Equinix',
  'Digital Realty',
  'CyrusOne',
  'QTS',
  'CoreSite',
  'Vantage',
  'COPT'
];

// Known ICE facility locations (from public records)
const KNOWN_ICE_FACILITY_CITIES = [
  { city: 'Ashburn', state: 'VA' },  // AWS GovCloud East
  { city: 'The Dalles', state: 'OR' },  // AWS GovCloud West
  { city: 'Phoenix', state: 'AZ' },  // Azure Government
  { city: 'San Antonio', state: 'TX' },  // Azure Government
  { city: 'Boydton', state: 'VA' },  // Microsoft
  { city: 'Manassas', state: 'VA' },  // AWS
  { city: 'Sterling', state: 'VA' },  // Multiple providers
];

interface FlaggedFacility extends Facility {
  riskLevel: 'confirmed' | 'likely' | 'possible';
  riskReasons: string[];
  matchedContracts: FederalContract[];
}

// =============================================================================
// ICON MAPPINGS
// =============================================================================

const DATA_TYPE_ICONS: Record<SurveillanceDataType, React.ReactNode> = {
  biometric: <Fingerprint className="w-4 h-4" />,
  location: <MapPin className="w-4 h-4" />,
  financial: <CreditCard className="w-4 h-4" />,
  medical: <Activity className="w-4 h-4" />,
  communications: <Phone className="w-4 h-4" />,
  immigration: <Globe className="w-4 h-4" />,
  utility: <Zap className="w-4 h-4" />,
  dmv: <Car className="w-4 h-4" />,
  employment: <Users className="w-4 h-4" />,
  social_services: <Users className="w-4 h-4" />,
  education: <FileText className="w-4 h-4" />,
  criminal: <Shield className="w-4 h-4" />,
  network_traffic: <Radio className="w-4 h-4" />,
  unknown: <Database className="w-4 h-4" />
};

const AGENCY_COLORS: Record<FederalAgency, string> = {
  ICE: 'bg-red-500',
  ERO: 'bg-red-600',
  HSI: 'bg-red-400',
  CBP: 'bg-orange-500',
  DHS: 'bg-yellow-500',
  FBI: 'bg-blue-500',
  DEA: 'bg-green-500',
  ATF: 'bg-purple-500',
  USCIS: 'bg-cyan-500',
  DOJ: 'bg-indigo-500',
  DOD: 'bg-gray-600',
  NSA: 'bg-gray-700',
  CIA: 'bg-gray-800',
  OTHER: 'bg-gray-500'
};

// =============================================================================
// COMPONENT
// =============================================================================

export const SurveillanceInfrastructureTab: React.FC = () => {
  // State
  const [activeSection, setActiveSection] = useState<'overview' | 'companies' | 'contracts' | 'facilities' | 'alerts'>('overview');
  const [selectedAgency, setSelectedAgency] = useState<FederalAgency | 'all'>('all');
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [expandedFacilities, setExpandedFacilities] = useState<Set<number>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [facilities, setFacilities] = useState<Facility[]>([]);
  const [isLoadingFacilities, setIsLoadingFacilities] = useState(true);
  
  // Load facilities from database
  useEffect(() => {
    const loadFacilities = async () => {
      try {
        const allFacilities = await db.facilities.toArray();
        setFacilities(allFacilities);
      } catch (error) {
        console.error('Failed to load facilities:', error);
      } finally {
        setIsLoadingFacilities(false);
      }
    };
    loadFacilities();
  }, []);
  
  // Data
  const stats = useMemo(() => getSurveillanceContractStats(), []);
  const allContracts = useMemo(() => getAllSurveillanceContracts(), []);
  const iceContracts = useMemo(() => getImmigrantTargetingContracts(), []);
  const directImpactCompanies = useMemo(() => getDirectImmigrantImpactCompanies(), []);
  
  // Cross-reference facilities with surveillance infrastructure
  const flaggedFacilities = useMemo((): FlaggedFacility[] => {
    return facilities.map(facility => {
      const riskReasons: string[] = [];
      let riskLevel: 'confirmed' | 'likely' | 'possible' = 'possible';
      
      // Check if operator is a known federal contractor
      const operatorLower = facility.operator.toLowerCase();
      const isFederalContractor = FEDERAL_CONTRACTOR_OPERATORS.some(
        fc => operatorLower.includes(fc.toLowerCase())
      );
      if (isFederalContractor) {
        riskReasons.push('Operator has known federal/government contracts');
        riskLevel = 'likely';
      }
      
      // Check if in GovCloud state
      if (GOVCLOUD_STATES.includes(facility.state)) {
        riskReasons.push(`Located in ${facility.state} - hosts AWS GovCloud or Azure Government regions`);
        if (riskLevel === 'possible') riskLevel = 'likely';
      }
      
      // Check if near known ICE facility
      const nearKnownICE = KNOWN_ICE_FACILITY_CITIES.some(
        loc => facility.city?.toLowerCase() === loc.city.toLowerCase() && facility.state === loc.state
      );
      if (nearKnownICE) {
        riskReasons.push('Located in city with known government cloud data centers');
        riskLevel = 'confirmed';
      }
      
      // Check specific operators
      if (operatorLower.includes('amazon') || operatorLower.includes('aws')) {
        riskReasons.push('AWS has $28M+ ICE contract for GovCloud hosting');
        if (facility.state === 'VA' || facility.state === 'OR') {
          riskLevel = 'confirmed';
          riskReasons.push('AWS GovCloud region location');
        }
      }
      if (operatorLower.includes('microsoft') || operatorLower.includes('azure')) {
        riskReasons.push('Microsoft Azure has ICE/DHS government cloud contracts');
      }
      if (operatorLower.includes('palantir')) {
        riskLevel = 'confirmed';
        riskReasons.push('Palantir operates FALCON system for ICE targeting');
      }
      
      // Get matched contracts
      const matchedContracts = findContractsForFacility(facility.state, facility.operator);
      if (matchedContracts.length > 0) {
        riskReasons.push(`${matchedContracts.length} related federal contracts identified`);
        if (matchedContracts.some(c => c.immigrantTargeting)) {
          riskLevel = 'confirmed';
          riskReasons.push('Contracts specifically target immigrant communities');
        }
      }
      
      return {
        ...facility,
        riskLevel: riskReasons.length > 0 ? riskLevel : 'possible',
        riskReasons,
        matchedContracts
      };
    })
    .filter(f => f.riskReasons.length > 0)
    .sort((a, b) => {
      const levels = { confirmed: 0, likely: 1, possible: 2 };
      return levels[a.riskLevel] - levels[b.riskLevel];
    });
  }, [facilities]);
  
  // Filter companies
  const filteredCompanies = useMemo(() => {
    let companies = SURVEILLANCE_COMPANIES;
    
    if (selectedAgency !== 'all') {
      companies = getCompaniesByAgency(selectedAgency);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      companies = companies.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.description.toLowerCase().includes(query) ||
        c.capabilities.some(cap => cap.type.toLowerCase().includes(query))
      );
    }
    
    return companies;
  }, [selectedAgency, searchQuery]);
  
  // Toggle company expansion
  const toggleCompany = (id: string) => {
    setExpandedCompanies(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  
  // Format currency
  const formatCurrency = (amount: number) => {
    if (amount >= 1_000_000_000) {
      return `$${(amount / 1_000_000_000).toFixed(2)}B`;
    }
    if (amount >= 1_000_000) {
      return `$${(amount / 1_000_000).toFixed(1)}M`;
    }
    if (amount >= 1_000) {
      return `$${(amount / 1_000).toFixed(0)}K`;
    }
    return `$${amount}`;
  };

  // =============================================================================
  // RENDER SECTIONS
  // =============================================================================

  const renderHeader = () => (
    <div className="bg-gradient-to-r from-red-900/90 via-red-800/80 to-orange-900/70 rounded-xl p-6 mb-6 border border-red-500/30">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-red-500/20 rounded-xl">
            <Eye className="w-10 h-10 text-red-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Surveillance Infrastructure Tracker</h1>
            <p className="text-red-200 text-lg mt-1">
              Exposing Big Tech's role in the deportation machine
            </p>
          </div>
        </div>
        
        {/* Key Stats */}
        <div className="flex gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-400">{formatCurrency(calculateTotalICESurveillanceSpending())}</div>
            <div className="text-sm text-red-200">ICE Surveillance Spending</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">{directImpactCompanies.length}</div>
            <div className="text-sm text-orange-200">Direct Impact Companies</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-yellow-400">{iceContracts.length}</div>
            <div className="text-sm text-yellow-200">Active Contracts</div>
          </div>
        </div>
      </div>
      
      {/* Warning Banner */}
      <div className="mt-4 p-3 bg-red-950/50 rounded-lg border border-red-500/20 flex items-center gap-3">
        <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0" />
        <p className="text-red-200 text-sm">
          <strong>Purpose:</strong> This tool helps labor organizers and immigrant rights activists identify 
          and expose the infrastructure enabling mass surveillance and deportation. 
          Every data center facility in our database may be connected to this system.
        </p>
      </div>
    </div>
  );

  const renderNavigation = () => (
    <div className="flex gap-2 mb-6 flex-wrap">
      {[
        { id: 'overview', label: 'Overview', icon: <Activity className="w-4 h-4" /> },
        { id: 'facilities', label: `🎯 Flagged Facilities (${flaggedFacilities.filter(f => f.riskLevel === 'confirmed' || f.riskLevel === 'likely').length})`, icon: <Server className="w-4 h-4" /> },
        { id: 'companies', label: 'Surveillance Companies', icon: <Building2 className="w-4 h-4" /> },
        { id: 'contracts', label: 'Federal Contracts', icon: <DollarSign className="w-4 h-4" /> },
        { id: 'alerts', label: 'Community Alerts', icon: <AlertTriangle className="w-4 h-4" /> },
      ].map(tab => (
        <button
          key={tab.id}
          onClick={() => setActiveSection(tab.id as typeof activeSection)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeSection === tab.id
              ? 'bg-red-600 text-white'
              : 'bg-[#21262d] text-gray-300 hover:bg-[#30363d] hover:text-white'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      {/* How It Works */}
      <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d]">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Info className="w-5 h-5 text-blue-400" />
          How the Surveillance System Works
        </h2>
        
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <div className="flex items-center gap-2 mb-2">
              <Database className="w-6 h-6 text-blue-400" />
              <span className="font-bold text-white">1. Data Collection</span>
            </div>
            <p className="text-gray-400 text-sm">
              Companies like Thomson Reuters, LexisNexis aggregate data from utilities, DMV, 
              credit bureaus, social media, and more.
            </p>
          </div>
          
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-6 h-6 text-orange-400" />
              <span className="font-bold text-white">2. Target Identification</span>
            </div>
            <p className="text-gray-400 text-sm">
              AI systems like Palantir FALCON analyze data to identify and prioritize 
              individuals for enforcement actions.
            </p>
          </div>
          
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-6 h-6 text-red-400" />
              <span className="font-bold text-white">3. Location Tracking</span>
            </div>
            <p className="text-gray-400 text-sm">
              Skip tracing services, LPR databases, and cell phone tracking pinpoint 
              exact locations of individuals and their families.
            </p>
          </div>
          
          <div className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d]">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-6 h-6 text-red-500" />
              <span className="font-bold text-white">4. Enforcement</span>
            </div>
            <p className="text-gray-400 text-sm">
              ICE ERO uses this intelligence for workplace raids, home arrests, 
              and deportations—often without warrants.
            </p>
          </div>
        </div>
      </div>
      
      {/* Spending by Agency */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#161b22] rounded-xl p-6 border border-red-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">ICE Spending</h3>
            <span className={`px-2 py-1 text-xs font-bold rounded ${AGENCY_COLORS.ICE} text-white`}>ICE</span>
          </div>
          <div className="text-4xl font-bold text-red-400">{formatCurrency(stats.byAgency.ICE)}</div>
          <div className="text-sm text-gray-400 mt-2">
            {allContracts.filter(c => c.agency === 'ICE').length} contracts
          </div>
          <div className="mt-4 pt-4 border-t border-[#30363d]">
            <div className="text-sm text-gray-400">Top uses:</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">FALCON</span>
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">Skip Tracing</span>
              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">Facial Recognition</span>
            </div>
          </div>
        </div>
        
        <div className="bg-[#161b22] rounded-xl p-6 border border-orange-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">CBP Spending</h3>
            <span className={`px-2 py-1 text-xs font-bold rounded ${AGENCY_COLORS.CBP} text-white`}>CBP</span>
          </div>
          <div className="text-4xl font-bold text-orange-400">{formatCurrency(stats.byAgency.CBP)}</div>
          <div className="text-sm text-gray-400 mt-2">
            {allContracts.filter(c => c.agency === 'CBP').length} contracts
          </div>
          <div className="mt-4 pt-4 border-t border-[#30363d]">
            <div className="text-sm text-gray-400">Top uses:</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">Border Analytics</span>
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">Biometrics</span>
            </div>
          </div>
        </div>
        
        <div className="bg-[#161b22] rounded-xl p-6 border border-yellow-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-white">DHS (Other)</h3>
            <span className={`px-2 py-1 text-xs font-bold rounded ${AGENCY_COLORS.DHS} text-black`}>DHS</span>
          </div>
          <div className="text-4xl font-bold text-yellow-400">{formatCurrency(stats.byAgency.DHS)}</div>
          <div className="text-sm text-gray-400 mt-2">
            {allContracts.filter(c => c.agency === 'DHS').length} contracts
          </div>
          <div className="mt-4 pt-4 border-t border-[#30363d]">
            <div className="text-sm text-gray-400">Includes:</div>
            <div className="flex flex-wrap gap-1 mt-2">
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">Data Integration</span>
              <span className="px-2 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">Cloud Infrastructure</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Data Types Being Collected */}
      <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d]">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-purple-400" />
          What Data Is Being Collected
        </h2>
        
        <div className="grid grid-cols-4 gap-3">
          {[
            { type: 'biometric' as const, label: 'Biometric', desc: 'Facial recognition, fingerprints', count: directImpactCompanies.filter(c => c.dataTypesProcessed.includes('biometric')).length },
            { type: 'location' as const, label: 'Location', desc: 'GPS, cell tower, LPR data', count: directImpactCompanies.filter(c => c.dataTypesProcessed.includes('location')).length },
            { type: 'financial' as const, label: 'Financial', desc: 'Bank records, wire transfers', count: directImpactCompanies.filter(c => c.dataTypesProcessed.includes('financial')).length },
            { type: 'medical' as const, label: 'Medical', desc: 'Medicaid, health records', count: directImpactCompanies.filter(c => c.dataTypesProcessed.includes('medical')).length },
            { type: 'communications' as const, label: 'Communications', desc: 'Phone, social media', count: directImpactCompanies.filter(c => c.dataTypesProcessed.includes('communications')).length },
            { type: 'utility' as const, label: 'Utility', desc: 'Power, water, internet', count: directImpactCompanies.filter(c => c.dataTypesProcessed.includes('utility')).length },
            { type: 'dmv' as const, label: 'DMV', desc: 'License, vehicle registration', count: directImpactCompanies.filter(c => c.dataTypesProcessed.includes('dmv')).length },
            { type: 'employment' as const, label: 'Employment', desc: 'I-9, payroll records', count: directImpactCompanies.filter(c => c.dataTypesProcessed.includes('employment')).length },
          ].map(dt => (
            <div key={dt.type} className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d] hover:border-purple-500/50 transition-colors cursor-pointer">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400">
                  {DATA_TYPE_ICONS[dt.type]}
                </div>
                <div>
                  <div className="font-bold text-white">{dt.label}</div>
                  <div className="text-xs text-gray-400">{dt.count} companies</div>
                </div>
              </div>
              <p className="text-sm text-gray-400">{dt.desc}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Recent News Alert */}
      <div className="bg-[#161b22] rounded-xl p-6 border border-red-500/50">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-400" />
          Recent Intelligence
        </h2>
        
        <div className="space-y-3">
          <div className="bg-[#0d1117] rounded-lg p-4 border-l-4 border-red-500">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white">ICE Contracts Company Making Bounty Hunter AI Agents</h3>
                <p className="text-gray-400 text-sm mt-1">
                  AI Solutions 87 creates "AI agents" that "deliver rapid acceleration in finding persons of interest 
                  and mapping their entire network." ICE ERO paid hundreds of thousands for skip tracing services.
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs">ICE ERO</span>
                  <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded text-xs">Skip Tracing</span>
                  <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">AI</span>
                </div>
              </div>
              <a 
                href="https://www.404media.co/ice-contracts-company-making-bounty-hunter-ai-agents/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                404 Media
              </a>
            </div>
            <div className="text-xs text-gray-500 mt-2">December 18, 2024</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCompanies = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-red-500"
          />
        </div>
        
        <select
          value={selectedAgency}
          onChange={(e) => setSelectedAgency(e.target.value as FederalAgency | 'all')}
          className="px-4 py-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-white focus:outline-none focus:border-red-500"
        >
          <option value="all">All Agencies</option>
          <option value="ICE">ICE</option>
          <option value="CBP">CBP</option>
          <option value="DHS">DHS</option>
          <option value="FBI">FBI</option>
        </select>
        
        <div className="text-sm text-gray-400">
          {filteredCompanies.length} companies
        </div>
      </div>
      
      {/* Company List */}
      <div className="space-y-3">
        {filteredCompanies.map(company => (
          <div 
            key={company.id}
            className="bg-[#161b22] rounded-xl border border-[#30363d] overflow-hidden"
          >
            {/* Company Header */}
            <div 
              onClick={() => toggleCompany(company.id)}
              className="p-4 cursor-pointer hover:bg-[#1c2128] transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {expandedCompanies.has(company.id) 
                    ? <ChevronDown className="w-5 h-5 text-gray-400" />
                    : <ChevronRight className="w-5 h-5 text-gray-400" />
                  }
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{company.name}</h3>
                      <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                        company.riskLevel === 'confirmed' ? 'bg-red-500/20 text-red-400' :
                        company.riskLevel === 'likely' ? 'bg-orange-500/20 text-orange-400' :
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {company.riskLevel.toUpperCase()}
                      </span>
                      {company.immigrantImpact === 'direct' && (
                        <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-600 text-white">
                          IMMIGRANT TARGETING
                        </span>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{company.description}</p>
                  </div>
                </div>
                
                {/* Agency Badges */}
                <div className="flex gap-1">
                  {company.knownAgencyClients.slice(0, 4).map(agency => (
                    <span 
                      key={agency}
                      className={`px-2 py-0.5 text-xs font-bold rounded text-white ${AGENCY_COLORS[agency]}`}
                    >
                      {agency}
                    </span>
                  ))}
                  {company.knownAgencyClients.length > 4 && (
                    <span className="px-2 py-0.5 text-xs font-bold rounded bg-gray-600 text-white">
                      +{company.knownAgencyClients.length - 4}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Expanded Details */}
            {expandedCompanies.has(company.id) && (
              <div className="border-t border-[#30363d] p-4 bg-[#0d1117]">
                <div className="grid grid-cols-3 gap-6">
                  {/* Capabilities */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-300 uppercase mb-3">Capabilities</h4>
                    <div className="space-y-2">
                      {company.capabilities.map((cap, idx) => (
                        <div key={idx} className="bg-[#161b22] rounded-lg p-3">
                          <div className="font-medium text-white capitalize">
                            {cap.type.replace(/_/g, ' ')}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{cap.description}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {cap.products.map(p => (
                              <span key={p} className="px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Data Types */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-300 uppercase mb-3">Data Collected</h4>
                    <div className="flex flex-wrap gap-2">
                      {company.dataTypesProcessed.map(dt => (
                        <div 
                          key={dt}
                          className="flex items-center gap-2 px-3 py-2 bg-[#161b22] rounded-lg"
                        >
                          <div className="text-purple-400">{DATA_TYPE_ICONS[dt]}</div>
                          <span className="text-white capitalize text-sm">{dt.replace(/_/g, ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {/* Sources */}
                  <div>
                    <h4 className="text-sm font-bold text-gray-300 uppercase mb-3">Evidence Sources</h4>
                    <div className="space-y-2">
                      {company.sources.length > 0 ? company.sources.map(source => (
                        <a
                          key={source.id}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block bg-[#161b22] rounded-lg p-3 hover:bg-[#1c2128] transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <ExternalLink className="w-4 h-4 text-blue-400" />
                            <span className="text-blue-400 text-sm">{source.title}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {source.publisher} • {source.date}
                          </div>
                        </a>
                      )) : (
                        <div className="text-gray-500 text-sm">No public sources documented yet</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderContracts = () => (
    <div className="space-y-4">
      {/* Contract Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#161b22] rounded-xl p-4 border border-[#30363d]">
          <div className="text-2xl font-bold text-white">{stats.totalContracts}</div>
          <div className="text-sm text-gray-400">Total Contracts</div>
        </div>
        <div className="bg-[#161b22] rounded-xl p-4 border border-[#30363d]">
          <div className="text-2xl font-bold text-green-400">{formatCurrency(stats.totalValue)}</div>
          <div className="text-sm text-gray-400">Total Value</div>
        </div>
        <div className="bg-[#161b22] rounded-xl p-4 border border-[#30363d]">
          <div className="text-2xl font-bold text-red-400">{stats.immigrantTargeting}</div>
          <div className="text-sm text-gray-400">Immigrant Targeting</div>
        </div>
        <div className="bg-[#161b22] rounded-xl p-4 border border-[#30363d]">
          <div className="text-2xl font-bold text-purple-400">{stats.uniqueContractors}</div>
          <div className="text-sm text-gray-400">Unique Contractors</div>
        </div>
      </div>
      
      {/* Contract List */}
      <div className="bg-[#161b22] rounded-xl border border-[#30363d] overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-[#0d1117] text-sm text-gray-400 font-semibold uppercase">
          <div className="col-span-3">Contractor</div>
          <div className="col-span-2">Agency</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-2 text-right">Amount</div>
          <div className="col-span-2 text-right">Date</div>
        </div>
        
        {allContracts.map(contract => (
          <div 
            key={contract.id}
            className="grid grid-cols-12 gap-2 px-4 py-3 border-t border-[#21262d] hover:bg-[#1c2128] transition-colors"
          >
            <div className="col-span-3">
              <div className="font-medium text-white">{contract.contractor}</div>
              {contract.contractNumber && (
                <div className="text-xs text-gray-500 font-mono">{contract.contractNumber}</div>
              )}
            </div>
            <div className="col-span-2">
              <span className={`px-2 py-0.5 text-xs font-bold rounded text-white ${AGENCY_COLORS[contract.agency]}`}>
                {contract.agency}
              </span>
              {contract.agencySubdivision && (
                <span className="ml-1 text-xs text-gray-400">({contract.agencySubdivision})</span>
              )}
            </div>
            <div className="col-span-3 text-sm text-gray-400 truncate" title={contract.description}>
              {contract.description}
            </div>
            <div className="col-span-2 text-right">
              <div className="font-bold text-green-400">{formatCurrency(contract.amount)}</div>
              {contract.potentialValue && contract.potentialValue > contract.amount && (
                <div className="text-xs text-gray-500">up to {formatCurrency(contract.potentialValue)}</div>
              )}
            </div>
            <div className="col-span-2 text-right text-sm text-gray-400">
              {new Date(contract.awardDate).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderAlerts = () => (
    <div className="space-y-6">
      <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6">
        <h2 className="text-xl font-bold text-yellow-400 mb-2 flex items-center gap-2">
          <AlertTriangle className="w-6 h-6" />
          Community Alert System
        </h2>
        <p className="text-yellow-200">
          This section will allow communities to report and track ICE activity, raids, checkpoints, 
          and surveillance sightings. Coming soon.
        </p>
        
        <div className="mt-4 grid grid-cols-2 gap-4">
          <button className="px-4 py-3 bg-yellow-500/20 text-yellow-400 rounded-lg font-medium hover:bg-yellow-500/30 transition-colors flex items-center justify-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Report ICE Activity
          </button>
          <button className="px-4 py-3 bg-blue-500/20 text-blue-400 rounded-lg font-medium hover:bg-blue-500/30 transition-colors flex items-center justify-center gap-2">
            <MapPin className="w-5 h-5" />
            View Activity Map
          </button>
        </div>
      </div>
      
      {/* Resources */}
      <div className="bg-[#161b22] rounded-xl p-6 border border-[#30363d]">
        <h2 className="text-xl font-bold text-white mb-4">Know Your Rights Resources</h2>
        
        <div className="grid grid-cols-2 gap-4">
          <a 
            href="https://www.aclu.org/know-your-rights/immigrants-rights" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d] hover:border-blue-500/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="font-bold text-white">ACLU - Know Your Rights</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Comprehensive guide to immigrant rights when encountering ICE or police
            </p>
          </a>
          
          <a 
            href="https://unitedwedream.org/protect-yourself/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="bg-[#0d1117] rounded-lg p-4 border border-[#30363d] hover:border-blue-500/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-green-400" />
              <span className="font-bold text-white">United We Dream</span>
            </div>
            <p className="text-sm text-gray-400 mt-2">
              Resources for undocumented immigrants and their families
            </p>
          </a>
        </div>
      </div>
    </div>
  );

  // Toggle facility expansion
  const toggleFacility = (id: number | undefined) => {
    if (id === undefined) return;
    setExpandedFacilities(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const renderFlaggedFacilities = () => (
    <div className="space-y-4">
      {/* Flagged Facilities Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-[#161b22] rounded-xl p-4 border border-red-500/50">
          <div className="text-3xl font-bold text-red-400">
            {flaggedFacilities.filter(f => f.riskLevel === 'confirmed').length}
          </div>
          <div className="text-sm text-gray-400">🔴 Confirmed ICE/DHS</div>
        </div>
        <div className="bg-[#161b22] rounded-xl p-4 border border-orange-500/50">
          <div className="text-3xl font-bold text-orange-400">
            {flaggedFacilities.filter(f => f.riskLevel === 'likely').length}
          </div>
          <div className="text-sm text-gray-400">🟠 Likely Connected</div>
        </div>
        <div className="bg-[#161b22] rounded-xl p-4 border border-yellow-500/50">
          <div className="text-3xl font-bold text-yellow-400">
            {flaggedFacilities.filter(f => f.riskLevel === 'possible').length}
          </div>
          <div className="text-sm text-gray-400">🟡 Possible Link</div>
        </div>
        <div className="bg-[#161b22] rounded-xl p-4 border border-[#30363d]">
          <div className="text-3xl font-bold text-white">{facilities.length}</div>
          <div className="text-sm text-gray-400">Total Facilities Scanned</div>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
        <h3 className="text-blue-400 font-bold flex items-center gap-2">
          <Info className="w-5 h-5" />
          How We Identify ICE-Connected Facilities
        </h3>
        <p className="text-blue-200 text-sm mt-2">
          We cross-reference your facility database against: (1) Known AWS GovCloud and Azure Government regions,
          (2) Operators with documented federal contracts, (3) Cities with known ICE data processing centers,
          (4) Public contract records from USAspending.gov. Facilities are flagged as <strong>Confirmed</strong> (direct evidence),
          <strong>Likely</strong> (multiple indicators), or <strong>Possible</strong> (single indicator).
        </p>
      </div>

      {/* Loading State */}
      {isLoadingFacilities && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500"></div>
          <span className="ml-3 text-gray-400">Scanning facility database...</span>
        </div>
      )}

      {/* No Results */}
      {!isLoadingFacilities && flaggedFacilities.length === 0 && (
        <div className="bg-[#161b22] rounded-xl p-8 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-white">No Flagged Facilities Found</h3>
          <p className="text-gray-400 mt-2">
            None of the facilities in your database match known ICE/DHS infrastructure indicators.
            This doesn't mean they're not connected—it means we haven't found public evidence.
          </p>
        </div>
      )}

      {/* Flagged Facility List */}
      {!isLoadingFacilities && flaggedFacilities.length > 0 && (
        <div className="space-y-3">
          {flaggedFacilities.map(facility => (
            <div 
              key={facility.id}
              className={`bg-[#161b22] rounded-xl border overflow-hidden ${
                facility.riskLevel === 'confirmed' ? 'border-red-500/50' :
                facility.riskLevel === 'likely' ? 'border-orange-500/50' :
                'border-yellow-500/30'
              }`}
            >
              {/* Facility Header */}
              <div 
                onClick={() => toggleFacility(facility.id)}
                className="p-4 cursor-pointer hover:bg-[#1c2128] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {expandedFacilities.has(facility.id ?? -1) 
                      ? <ChevronDown className="w-5 h-5 text-gray-400" />
                      : <ChevronRight className="w-5 h-5 text-gray-400" />
                    }
                    
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                          facility.riskLevel === 'confirmed' ? 'bg-red-500 text-white' :
                          facility.riskLevel === 'likely' ? 'bg-orange-500 text-white' :
                          'bg-yellow-500 text-black'
                        }`}>
                          {facility.riskLevel.toUpperCase()}
                        </span>
                        <h3 className="text-lg font-bold text-white">{facility.name}</h3>
                      </div>
                      <div className="text-sm text-gray-400 mt-1">
                        {facility.operator} • {facility.city}, {facility.state}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm text-gray-400">
                      {facility.riskReasons.length} risk indicator{facility.riskReasons.length !== 1 ? 's' : ''}
                    </div>
                    {facility.matchedContracts.length > 0 && (
                      <div className="text-xs text-red-400">
                        {facility.matchedContracts.length} matching contract{facility.matchedContracts.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Expanded Details */}
              {expandedFacilities.has(facility.id ?? -1) && (
                <div className="border-t border-[#30363d] p-4 bg-[#0d1117]">
                  <div className="grid grid-cols-2 gap-6">
                    {/* Risk Reasons */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-300 uppercase mb-3">
                        Why This Facility Is Flagged
                      </h4>
                      <ul className="space-y-2">
                        {facility.riskReasons.map((reason, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-sm">
                            <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-300">{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    {/* Matched Contracts */}
                    <div>
                      <h4 className="text-sm font-bold text-gray-300 uppercase mb-3">
                        Related Federal Contracts
                      </h4>
                      {facility.matchedContracts.length > 0 ? (
                        <div className="space-y-2">
                          {facility.matchedContracts.map(contract => (
                            <div key={contract.id} className="bg-[#161b22] rounded-lg p-3">
                              <div className="flex items-center justify-between">
                                <span className="font-medium text-white">{contract.contractor}</span>
                                <span className="text-green-400 font-bold">{formatCurrency(contract.amount)}</span>
                              </div>
                              <div className="text-xs text-gray-400 mt-1">{contract.description}</div>
                              <div className="flex items-center gap-2 mt-2">
                                <span className={`px-2 py-0.5 text-xs font-bold rounded text-white ${AGENCY_COLORS[contract.agency]}`}>
                                  {contract.agency}
                                </span>
                                {contract.immigrantTargeting && (
                                  <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-600 text-white">
                                    IMMIGRANT TARGETING
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">
                          No specific contracts matched, but facility meets other risk criteria.
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="mt-4 pt-4 border-t border-[#30363d] flex gap-2">
                    <button className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Report Community Concern
                    </button>
                    <button className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      File FOIA Request
                    </button>
                    <button className="px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-medium hover:bg-purple-500/30 transition-colors flex items-center gap-2">
                      <ExternalLink className="w-4 h-4" />
                      View Full Facility
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // =============================================================================
  // MAIN RENDER
  // =============================================================================

  return (
    <div className="min-h-full p-4">
      {renderHeader()}
      {renderNavigation()}
      
      {activeSection === 'overview' && renderOverview()}
      {activeSection === 'facilities' && renderFlaggedFacilities()}
      {activeSection === 'companies' && renderCompanies()}
      {activeSection === 'contracts' && renderContracts()}
      {activeSection === 'alerts' && renderAlerts()}
    </div>
  );
};

export default SurveillanceInfrastructureTab;

