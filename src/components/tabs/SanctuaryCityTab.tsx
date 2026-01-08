/**
 * Sanctuary City Infrastructure Accountability Tab
 * 
 * Tracks ICE data flows through NYC infrastructure, REIT exposure,
 * and Mayoral regulatory authority for sanctuary city enforcement.
 * 
 * Source: NYC ICE Data Infrastructure Report for Mayor Mamdani Transition Team
 */

import React, { useState, useMemo } from 'react';
import {
  Shield,
  Building2,
  Network,
  Scale,
  Users,
  FileText,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Database,
  TrendingUp,
  DollarSign,
  MapPin,
  Gavel,
  BookOpen,
  Target,
  Eye,
  Zap,
  Server,
  Globe,
  Lock,
  Unlock,
  Info,
  ArrowRight,
  Copy,
  Check
} from 'lucide-react';

import {
  NYC_CARRIER_HOTELS,
  DATA_CENTER_REITS,
  ICE_DATA_FLOW,
  ENFORCEMENT_MECHANISMS,
  EXECUTIVE_ORDER_PROVISIONS,
  COALITION_PARTNERS,
  STATE_LEVEL_COORDINATION,
  RESEARCH_RESOURCES,
  LEGAL_PRECEDENTS,
  SANCTUARY_CITY_STATS,
  getCarrierHotelsByRiskLevel,
  getFISMAHighFacilities
} from '../../data/sanctuaryCityData';

import type { CarrierHotel, DataCenterREIT, EnforcementMechanism } from '../../types/sanctuaryCity';

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const StatCard: React.FC<{
  value: string | number;
  label: string;
  icon: React.ReactNode;
  color?: string;
  subtext?: string;
}> = ({ value, label, icon, color = '#f97316', subtext }) => (
  <div className="bg-gradient-to-br from-[#1e293b] to-[#0f172a] border border-[#334155] rounded-xl p-4">
    <div className="flex items-center gap-3 mb-2">
      <div className="p-2 rounded-lg" style={{ backgroundColor: `${color}20` }}>
        {React.cloneElement(icon as React.ReactElement, { className: 'w-5 h-5', style: { color } })}
      </div>
      <span className="text-2xl font-bold" style={{ color }}>{value}</span>
    </div>
    <p className="text-sm text-[#94a3b8]">{label}</p>
    {subtext && <p className="text-xs text-[#64748b] mt-1">{subtext}</p>}
  </div>
);

const RiskBadge: React.FC<{ risk: CarrierHotel['iceDataFlowRisk'] }> = ({ risk }) => {
  const config = {
    Critical: { bg: '#ef4444', text: 'CRITICAL' },
    High: { bg: '#f97316', text: 'HIGH' },
    Medium: { bg: '#eab308', text: 'MEDIUM' },
    Low: { bg: '#22c55e', text: 'LOW' },
    Unknown: { bg: '#64748b', text: 'UNKNOWN' }
  };
  const { bg, text } = config[risk];
  return (
    <span 
      className="px-2 py-0.5 rounded text-xs font-bold text-white"
      style={{ backgroundColor: bg }}
    >
      {text}
    </span>
  );
};

const FISMABadge: React.FC<{ level?: string }> = ({ level }) => {
  if (!level || level === 'None' || level === 'Unknown') return null;
  const colors = {
    High: '#ef4444',
    Moderate: '#f97316',
    Low: '#22c55e'
  };
  return (
    <span 
      className="px-2 py-0.5 rounded text-xs font-bold text-white ml-2"
      style={{ backgroundColor: colors[level as keyof typeof colors] || '#64748b' }}
    >
      FISMA {level.toUpperCase()}
    </span>
  );
};

const CarrierHotelCard: React.FC<{ hotel: CarrierHotel; expanded: boolean; onToggle: () => void }> = ({
  hotel,
  expanded,
  onToggle
}) => (
  <div className="bg-[#0f172a] border border-[#334155] rounded-lg overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full p-4 flex items-center justify-between hover:bg-[#1e293b] transition-colors"
    >
      <div className="flex items-center gap-3">
        <Server className="w-5 h-5 text-[#38bdf8]" />
        <div className="text-left">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#e2e8f0]">{hotel.name}</span>
            <span className="text-xs text-[#64748b]">({hotel.facilityCode})</span>
            <RiskBadge risk={hotel.iceDataFlowRisk} />
            <FISMABadge level={hotel.fismaLevel} />
          </div>
          <p className="text-sm text-[#94a3b8]">{hotel.operator}</p>
        </div>
      </div>
      {expanded ? <ChevronDown className="w-5 h-5 text-[#64748b]" /> : <ChevronRight className="w-5 h-5 text-[#64748b]" />}
    </button>
    
    {expanded && (
      <div className="px-4 pb-4 border-t border-[#334155] bg-[#0f172a]">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <div>
            <p className="text-xs text-[#64748b]">Address</p>
            <p className="text-sm text-[#e2e8f0] flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {hotel.address}
            </p>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Networks</p>
            <p className="text-sm text-[#e2e8f0]">{hotel.networkCount}+ POPs</p>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">Federal Likelihood</p>
            <p className="text-sm text-[#e2e8f0]">{hotel.federalTenantLikelihood}</p>
          </div>
          <div>
            <p className="text-xs text-[#64748b]">NYC Leverage</p>
            <div className="flex gap-2 mt-1">
              {hotel.nycidaBenefits && (
                <span className="px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] rounded text-xs">NYCIDA</span>
              )}
              {hotel.franchiseRequired && (
                <span className="px-2 py-0.5 bg-[#3b82f6]/20 text-[#3b82f6] rounded text-xs">Franchise</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-xs text-[#64748b] mb-2">Cloud Connections</p>
          <div className="flex gap-2 flex-wrap">
            {hotel.awsDirectConnect && (
              <span className="px-2 py-1 bg-[#f97316]/20 text-[#f97316] rounded text-xs flex items-center gap-1">
                <Database className="w-3 h-3" /> AWS Direct Connect
              </span>
            )}
            {hotel.azureExpressRoute && (
              <span className="px-2 py-1 bg-[#3b82f6]/20 text-[#3b82f6] rounded text-xs flex items-center gap-1">
                <Database className="w-3 h-3" /> Azure ExpressRoute
              </span>
            )}
            {hotel.googleCloudInterconnect && (
              <span className="px-2 py-1 bg-[#22c55e]/20 text-[#22c55e] rounded text-xs flex items-center gap-1">
                <Database className="w-3 h-3" /> Google Interconnect
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-4">
          <p className="text-xs text-[#64748b] mb-2">Certifications</p>
          <div className="flex gap-2 flex-wrap">
            {hotel.certifications.map((cert, i) => (
              <span key={i} className="px-2 py-0.5 bg-[#334155] text-[#94a3b8] rounded text-xs">
                {cert}
              </span>
            ))}
          </div>
        </div>
        
        {hotel.notes && (
          <div className="mt-4 p-3 bg-[#1e293b] rounded-lg">
            <p className="text-xs text-[#94a3b8] flex items-start gap-2">
              <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {hotel.notes}
            </p>
          </div>
        )}
      </div>
    )}
  </div>
);

const REITCard: React.FC<{ reit: DataCenterREIT }> = ({ reit }) => {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[#1e293b] transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#7c3aed]/20 rounded-lg">
            <TrendingUp className="w-5 h-5 text-[#7c3aed]" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#e2e8f0]">{reit.name}</span>
              <span className="px-2 py-0.5 bg-[#7c3aed]/20 text-[#7c3aed] rounded text-xs font-mono">
                {reit.exchange}: {reit.ticker}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold text-white ${
                reit.iceConnectionType === 'Direct' ? 'bg-[#ef4444]' :
                reit.iceConnectionType === 'Indirect' ? 'bg-[#f97316]' :
                'bg-[#64748b]'
              }`}>
                {reit.iceConnectionType} ICE
              </span>
            </div>
            <p className="text-sm text-[#94a3b8]">${reit.revenue2024}B Revenue (2024)</p>
          </div>
        </div>
        {expanded ? <ChevronDown className="w-5 h-5 text-[#64748b]" /> : <ChevronRight className="w-5 h-5 text-[#64748b]" />}
      </button>
      
      {expanded && (
        <div className="px-4 pb-4 border-t border-[#334155]">
          <div className="mt-4">
            <p className="text-xs text-[#64748b] mb-2">ICE Connection</p>
            <p className="text-sm text-[#e2e8f0] p-3 bg-[#1e293b] rounded-lg border-l-4 border-[#f97316]">
              {reit.iceConnectionDescription}
            </p>
          </div>
          
          <div className="mt-4">
            <p className="text-xs text-[#64748b] mb-2">NYC Facilities</p>
            <div className="space-y-2">
              {reit.nycFacilities.map((facility, i) => (
                <div key={i} className="p-3 bg-[#1e293b] rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <Server className="w-4 h-4 text-[#38bdf8]" />
                    <span className="font-medium text-[#e2e8f0]">{facility.facilityCode}</span>
                    <span className="text-xs text-[#64748b]">{facility.address}</span>
                  </div>
                  <div className="flex gap-2 flex-wrap mt-2">
                    {facility.keyFeatures.map((feature, j) => (
                      <span key={j} className="px-2 py-0.5 bg-[#334155] text-[#94a3b8] rounded text-xs">
                        {feature}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-xs text-[#64748b] mb-2">Shareholder Engagement Vectors</p>
            <ul className="space-y-2">
              {reit.shareholderEngagementVectors.map((vector, i) => (
                <li key={i} className="text-sm text-[#e2e8f0] flex items-start gap-2">
                  <Target className="w-4 h-4 text-[#22c55e] flex-shrink-0 mt-0.5" />
                  {vector}
                </li>
              ))}
            </ul>
          </div>
          
          {reit.nycPensionExposure && (
            <div className="mt-4 p-3 bg-[#22c55e]/10 border border-[#22c55e]/30 rounded-lg">
              <p className="text-sm text-[#22c55e] flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                NYC Pension Fund Exposure - Shareholder leverage available
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const DataFlowVisualization: React.FC = () => {
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const selectedNodeData = ICE_DATA_FLOW.nodes.find(n => n.id === selectedNode);
  
  return (
    <div className="bg-[#0f172a] border border-[#334155] rounded-lg p-4">
      <h4 className="text-lg font-semibold text-[#e2e8f0] mb-4 flex items-center gap-2">
        <Network className="w-5 h-5 text-[#f97316]" />
        ICE Data Flow Through NYC Infrastructure
      </h4>
      
      <div className="space-y-2 font-mono text-sm">
        {ICE_DATA_FLOW.nodes.map((node, i) => (
          <React.Fragment key={node.id}>
            <button
              onClick={() => setSelectedNode(selectedNode === node.id ? null : node.id)}
              className={`w-full text-left p-3 rounded-lg transition-all ${
                selectedNode === node.id 
                  ? 'bg-[#f97316]/20 border border-[#f97316]' 
                  : 'bg-[#1e293b] hover:bg-[#334155]'
              } ${node.type === 'carrier_hotel' ? 'border-2 border-[#ef4444]' : ''}`}
            >
              <div className="flex items-center gap-2">
                <span className={`px-2 py-0.5 rounded text-xs ${
                  node.type === 'source' ? 'bg-[#ef4444] text-white' :
                  node.type === 'software' ? 'bg-[#8b5cf6] text-white' :
                  node.type === 'cloud' ? 'bg-[#f97316] text-white' :
                  node.type === 'interconnect' ? 'bg-[#3b82f6] text-white' :
                  node.type === 'carrier_hotel' ? 'bg-[#ef4444] text-white animate-pulse' :
                  'bg-[#22c55e] text-white'
                }`}>
                  {node.type.replace('_', ' ').toUpperCase()}
                </span>
                <span className="text-[#38bdf8]">{node.label}</span>
                {node.location && (
                  <span className="text-[#a78bfa] text-xs">({node.location})</span>
                )}
              </div>
              {node.details && (
                <p className="text-xs text-[#64748b] mt-1 ml-6">{node.details}</p>
              )}
            </button>
            {i < ICE_DATA_FLOW.nodes.length - 1 && (
              <div className="flex items-center justify-center py-1">
                <div className="text-[#f97316] font-bold">↓</div>
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      
      {selectedNodeData && selectedNodeData.type === 'carrier_hotel' && (
        <div className="mt-4 p-4 bg-[#7f1d1d]/30 border border-[#ef4444] rounded-lg">
          <h5 className="text-[#fca5a5] font-semibold mb-2 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            NYC CARRIER HOTELS - MAYORAL AUTHORITY APPLIES
          </h5>
          <ul className="text-sm text-[#e2e8f0] space-y-1">
            <li>• 111 8th Avenue → Equinix NY9 (FISMA HIGH) + Digital Realty</li>
            <li>• 60 Hudson Street → Digital Realty NYC1 + DataBank</li>
            <li>• 32 Ave of Americas → CoreSite NY1</li>
            <li>• 800 Secaucus Rd (NJ) → Equinix NY2/NY4/NY5/NY6</li>
          </ul>
        </div>
      )}
    </div>
  );
};

const EnforcementPyramid: React.FC = () => {
  const [expandedPhase, setExpandedPhase] = useState<number | null>(null);
  
  return (
    <div className="space-y-3">
      {ENFORCEMENT_MECHANISMS.map((mech) => (
        <div
          key={mech.id}
          className={`bg-[#0f172a] border rounded-lg overflow-hidden ${
            mech.phase === 4 ? 'border-[#ef4444]' :
            mech.phase === 3 ? 'border-[#f97316]' :
            mech.phase === 2 ? 'border-[#eab308]' :
            'border-[#22c55e]'
          }`}
        >
          <button
            onClick={() => setExpandedPhase(expandedPhase === mech.phase ? null : mech.phase)}
            className="w-full p-4 flex items-center justify-between hover:bg-[#1e293b] transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                mech.phase === 4 ? 'bg-[#ef4444]' :
                mech.phase === 3 ? 'bg-[#f97316]' :
                mech.phase === 2 ? 'bg-[#eab308]' :
                'bg-[#22c55e]'
              }`}>
                {mech.phase}
              </div>
              <div className="text-left">
                <span className="font-semibold text-[#e2e8f0]">{mech.name}</span>
                <p className="text-xs text-[#64748b]">{mech.authority}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!mech.requiresLegislation && (
                <span className="px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] rounded text-xs">
                  No Legislation Required
                </span>
              )}
              {expandedPhase === mech.phase ? <ChevronDown className="w-5 h-5 text-[#64748b]" /> : <ChevronRight className="w-5 h-5 text-[#64748b]" />}
            </div>
          </button>
          
          {expandedPhase === mech.phase && (
            <div className="px-4 pb-4 border-t border-[#334155]">
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div>
                  <p className="text-xs text-[#64748b]">Description</p>
                  <p className="text-sm text-[#e2e8f0]">{mech.description}</p>
                </div>
                <div>
                  <p className="text-xs text-[#64748b]">Impact</p>
                  <p className="text-sm text-[#e2e8f0]">{mech.impact}</p>
                </div>
              </div>
              {mech.penaltyRange && (
                <div className="mt-4 p-3 bg-[#1e293b] rounded-lg">
                  <p className="text-sm text-[#f97316] font-semibold">
                    Penalty Range: ${mech.penaltyRange.min.toLocaleString()} - ${mech.penaltyRange.max.toLocaleString()} {mech.penaltyRange.unit.replace('_', ' ')}
                  </p>
                </div>
              )}
              <div className="mt-4">
                <p className="text-xs text-[#64748b]">Time to Implement</p>
                <p className="text-sm text-[#e2e8f0]">{mech.timeToImplement.replace('_', ' ')}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const ExecutiveOrderTemplate: React.FC = () => {
  const [copied, setCopied] = useState(false);
  
  const eoText = `EXECUTIVE ORDER: DIGITAL SANCTUARY COMPLIANCE

1. DISCLOSURE REQUIREMENT
   All data center operators receiving NYCIDA benefits or using
   city rights-of-way shall disclose federal law enforcement
   tenant relationships within 90 days

2. SANCTUARY COMPLIANCE CERTIFICATION
   New NYCIDA applications require certification of no
   voluntary data sharing with ICE without judicial warrants

3. PROCUREMENT STANDARDS
   NYC technology contracts over $500K require sanctuary
   compliance scoring (15% weight in evaluation)

4. FRANCHISE REVIEW
   DoITT to audit all telecommunications franchises for
   data center interconnection relationships`;

  const handleCopy = () => {
    navigator.clipboard.writeText(eoText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="bg-[#0f172a] border-2 border-[#f97316] rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-semibold text-[#f97316] flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Day 1 Executive Order Framework
        </h4>
        <button
          onClick={handleCopy}
          className="px-3 py-1 bg-[#1e293b] hover:bg-[#334155] rounded text-sm flex items-center gap-2 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-[#22c55e]" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      
      <pre className="bg-[#0a0a0a] p-4 rounded font-mono text-sm text-[#f97316] overflow-x-auto whitespace-pre-wrap">
        {eoText}
      </pre>
      
      <div className="mt-4 space-y-3">
        {EXECUTIVE_ORDER_PROVISIONS.map((provision) => (
          <div key={provision.id} className="p-3 bg-[#1e293b] rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="font-semibold text-[#e2e8f0]">{provision.title}</h5>
              <span className="px-2 py-0.5 bg-[#f97316]/20 text-[#f97316] rounded text-xs">
                {provision.complianceDeadlineDays === 0 ? 'Immediate' : `${provision.complianceDeadlineDays} Days`}
              </span>
            </div>
            <p className="text-sm text-[#94a3b8]">{provision.description}</p>
            <div className="flex gap-2 mt-2 flex-wrap">
              {provision.targetEntities.map((entity, i) => (
                <span key={i} className="px-2 py-0.5 bg-[#334155] text-[#64748b] rounded text-xs">
                  {entity}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const SanctuaryCityTab: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'overview' | 'carriers' | 'reits' | 'dataflow' | 'enforcement' | 'coalition' | 'resources' | 'legal'>('overview');
  const [expandedHotels, setExpandedHotels] = useState<Set<string>>(new Set());
  
  const criticalHotels = useMemo(() => getCarrierHotelsByRiskLevel('Critical'), []);
  const fismaHighFacilities = useMemo(() => getFISMAHighFacilities(), []);
  
  const toggleHotel = (id: string) => {
    setExpandedHotels(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  
  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Shield className="w-4 h-4" /> },
    { id: 'carriers', label: 'Carrier Hotels', icon: <Server className="w-4 h-4" /> },
    { id: 'reits', label: 'REIT Exposure', icon: <TrendingUp className="w-4 h-4" /> },
    { id: 'dataflow', label: 'ICE Data Flow', icon: <Network className="w-4 h-4" /> },
    { id: 'enforcement', label: 'Mayoral Authority', icon: <Gavel className="w-4 h-4" /> },
    { id: 'coalition', label: 'Coalition', icon: <Users className="w-4 h-4" /> },
    { id: 'resources', label: 'Research Tools', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'legal', label: 'Legal Precedents', icon: <Scale className="w-4 h-4" /> }
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#7f1d1d] to-[#450a0a] border-b border-[#ef4444]/30 p-4">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-[#ef4444]/20 rounded-lg">
            <Shield className="w-6 h-6 text-[#ef4444]" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#fca5a5]">🏛️ Sanctuary City Infrastructure Accountability</h1>
            <p className="text-sm text-[#f87171]">NYC ICE Data Infrastructure • REIT Exposure • Mayoral Regulatory Authority</p>
          </div>
        </div>
        <p className="text-xs text-[#fecaca] mt-2 p-2 bg-[#450a0a] rounded border border-[#ef4444]/30">
          <strong>EXECUTIVE SUMMARY:</strong> ICE's deportation infrastructure—including Palantir's ICM system, the HART biometric database, and ImmigrationOS—processes data through NYC facilities via AWS Direct Connect. Mayor has regulatory authority through NYC Charter Section 363 franchise authority, NYCIDA tax benefits, and procurement power.
        </p>
      </div>
      
      {/* Navigation */}
      <div className="bg-[#0f172a] border-b border-[#334155] p-2 flex gap-2 overflow-x-auto">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id as typeof activeSection)}
            className={`px-3 py-2 rounded-lg text-sm flex items-center gap-2 whitespace-nowrap transition-colors ${
              activeSection === item.id
                ? 'bg-[#ef4444] text-white'
                : 'bg-[#1e293b] text-[#94a3b8] hover:bg-[#334155]'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-auto p-4">
        {/* Overview */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                value={SANCTUARY_CITY_STATS.totalNYCMetroDataCenters}
                label="NYC Metro Data Centers"
                icon={<Building2 />}
                color="#38bdf8"
              />
              <StatCard
                value={SANCTUARY_CITY_STATS.criticalCarrierHotels}
                label="Critical Carrier Hotels with ICE Data Flow"
                icon={<Server />}
                color="#ef4444"
              />
              <StatCard
                value={`$${SANCTUARY_CITY_STATS.reitsTotalRevenue.toFixed(2)}B`}
                label="Total REIT Revenue (2024)"
                icon={<TrendingUp />}
                color="#7c3aed"
                subtext="Equinix + Digital Realty"
              />
              <StatCard
                value={`$${(SANCTUARY_CITY_STATS.totalFederalContractsAtRisk / 1e9).toFixed(1)}B+`}
                label="Federal Contracts Ecosystem"
                icon={<DollarSign />}
                color="#f97316"
              />
            </div>
            
            {/* Critical Finding */}
            <div className="bg-gradient-to-r from-[#7f1d1d] to-[#450a0a] border-l-4 border-[#ef4444] p-4 rounded-r-lg">
              <h3 className="text-[#fca5a5] font-bold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                ⚠️ CRITICAL FINDING: TENANT CONFIDENTIALITY
              </h3>
              <p className="text-sm text-[#fecaca]">
                Data center operators (Equinix, Digital Realty, CoreSite) <strong>do not publicly disclose tenant lists</strong> for security and competitive reasons. However, we can document the technical infrastructure chain that connects ICE systems to NYC facilities.
              </p>
            </div>
            
            {/* Why NYC Matters */}
            <div className="bg-[#1e3a5f] border border-[#3b82f6] p-4 rounded-lg">
              <h3 className="text-[#38bdf8] font-bold mb-3 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Why NYC Matters for ICE Data
              </h3>
              <ul className="space-y-2 text-sm text-[#e2e8f0]">
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0 mt-0.5" />
                  <span><strong>150+ networks</strong> have Points of Presence at 60 Hudson Street alone</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0 mt-0.5" />
                  <span><strong>All transatlantic submarine cables</strong> land in nearby NJ/Long Island and route through NYC fiber</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0 mt-0.5" />
                  <span><strong>"Almost all New England Internet traffic runs through NY"</strong>—telecommunications infrastructure analyses</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0 mt-0.5" />
                  <span>AWS Direct Connect locations in NYC metro provide <strong>cloud on-ramps</strong> for federal customers</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0 mt-0.5" />
                  <span>Equinix NY9 at 111 8th Avenue holds <strong>FISMA High certification</strong> for federal workloads</span>
                </li>
              </ul>
            </div>
            
            {/* Quick Actions */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveSection('carriers')}
                className="p-4 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-left transition-colors"
              >
                <Server className="w-6 h-6 text-[#ef4444] mb-2" />
                <p className="font-semibold text-[#e2e8f0]">View Carrier Hotels</p>
                <p className="text-xs text-[#64748b]">{criticalHotels.length} critical risk facilities</p>
              </button>
              <button
                onClick={() => setActiveSection('reits')}
                className="p-4 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-left transition-colors"
              >
                <TrendingUp className="w-6 h-6 text-[#7c3aed] mb-2" />
                <p className="font-semibold text-[#e2e8f0]">REIT Exposure</p>
                <p className="text-xs text-[#64748b]">{DATA_CENTER_REITS.length} public REITs</p>
              </button>
              <button
                onClick={() => setActiveSection('enforcement')}
                className="p-4 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-left transition-colors"
              >
                <Gavel className="w-6 h-6 text-[#22c55e] mb-2" />
                <p className="font-semibold text-[#e2e8f0]">Enforcement Tools</p>
                <p className="text-xs text-[#64748b]">4-phase authority pyramid</p>
              </button>
              <button
                onClick={() => setActiveSection('dataflow')}
                className="p-4 bg-[#1e293b] hover:bg-[#334155] border border-[#334155] rounded-lg text-left transition-colors"
              >
                <Network className="w-6 h-6 text-[#f97316] mb-2" />
                <p className="font-semibold text-[#e2e8f0]">ICE Data Flow</p>
                <p className="text-xs text-[#64748b]">Palantir → AWS → NYC</p>
              </button>
            </div>
          </div>
        )}
        
        {/* Carrier Hotels */}
        {activeSection === 'carriers' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-[#e2e8f0] flex items-center gap-2">
                <Server className="w-6 h-6 text-[#ef4444]" />
                NYC Critical Carrier Hotels
              </h2>
              <div className="flex gap-2">
                <span className="px-3 py-1 bg-[#ef4444]/20 text-[#ef4444] rounded text-sm">
                  {criticalHotels.length} Critical
                </span>
                <span className="px-3 py-1 bg-[#f97316]/20 text-[#f97316] rounded text-sm">
                  {fismaHighFacilities.length} FISMA High
                </span>
              </div>
            </div>
            
            <div className="space-y-3">
              {NYC_CARRIER_HOTELS.map(hotel => (
                <CarrierHotelCard
                  key={hotel.id}
                  hotel={hotel}
                  expanded={expandedHotels.has(hotel.id)}
                  onToggle={() => toggleHotel(hotel.id)}
                />
              ))}
            </div>
          </div>
        )}
        
        {/* REIT Exposure */}
        {activeSection === 'reits' && (
          <div className="space-y-4">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#e2e8f0] flex items-center gap-2">
                <TrendingUp className="w-6 h-6 text-[#7c3aed]" />
                Public REIT Exposure to ICE Infrastructure
              </h2>
              <p className="text-sm text-[#94a3b8] mt-2">
                Data center REITs are publicly traded companies subject to SEC disclosure, shareholder activism, and ESG scrutiny.
                NYC pension funds (holding $266B+ in assets) can leverage shareholder power.
              </p>
            </div>
            
            <div className="space-y-3">
              {DATA_CENTER_REITS.map(reit => (
                <REITCard key={reit.id} reit={reit} />
              ))}
            </div>
          </div>
        )}
        
        {/* Data Flow */}
        {activeSection === 'dataflow' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-[#e2e8f0] flex items-center gap-2 mb-4">
              <Network className="w-6 h-6 text-[#f97316]" />
              The Indirect Connection Chain
            </h2>
            
            <div className="bg-[#7f1d1d]/30 border border-[#ef4444] p-4 rounded-lg mb-4">
              <p className="text-sm text-[#fecaca]">
                While <strong>ICE does not directly lease space</strong> at NYC data centers, the <strong>technology infrastructure on which ICE operations depend</strong> (Palantir systems + AWS cloud + network interconnection) <strong>does process data through NYC-region infrastructure</strong>.
              </p>
            </div>
            
            <DataFlowVisualization />
            
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-[#1e293b] border border-[#334155] p-4 rounded-lg">
                <h4 className="font-semibold text-[#e2e8f0] mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#f97316]" />
                  AWS as Leverage Point
                </h4>
                <ul className="text-sm text-[#94a3b8] space-y-1">
                  <li>• $billions in ICE/DHS contracts</li>
                  <li>• NYC infrastructure presence (Local Zone, Direct Connect)</li>
                  <li>• Tenant at FISMA-certified NYC facilities</li>
                  <li>• <strong className="text-[#f97316]">Advocacy angle:</strong> "AWS processes ICE deportation data through NYC infrastructure"</li>
                </ul>
              </div>
              <div className="bg-[#1e293b] border border-[#334155] p-4 rounded-lg">
                <h4 className="font-semibold text-[#e2e8f0] mb-2 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#8b5cf6]" />
                  Palantir as Software Layer
                </h4>
                <ul className="text-sm text-[#94a3b8] space-y-1">
                  <li>• <strong>NYC office presence</strong>: 110 East End Ave</li>
                  <li>• "Sole source" designation for ICE systems</li>
                  <li>• Hosts entirely on AWS → two-layer dependency</li>
                  <li>• <strong className="text-[#8b5cf6]">Advocacy angle:</strong> "Palantir's NYC operations coordinate mass deportation software"</li>
                </ul>
              </div>
            </div>
          </div>
        )}
        
        {/* Enforcement */}
        {activeSection === 'enforcement' && (
          <div className="space-y-6">
            <div className="mb-4">
              <h2 className="text-xl font-bold text-[#e2e8f0] flex items-center gap-2">
                <Gavel className="w-6 h-6 text-[#22c55e]" />
                Mayor's Regulatory Authority
              </h2>
              <div className="bg-gradient-to-r from-[#14532d] to-[#052e16] border-l-4 border-[#22c55e] p-4 rounded-r-lg mt-4">
                <h4 className="text-[#4ade80] font-bold mb-2">✅ LEGAL FOUNDATION: NYC HAS EXISTING TOOLS</h4>
                <p className="text-sm text-[#86efac]">
                  Mayor inherits multiple enforcement mechanisms to regulate data center operations—<strong>no new legislation required</strong> for initial actions. Charter Section 363 franchise authority, NYCIDA tax benefits, and procurement powers create layered pressure.
                </p>
              </div>
            </div>
            
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-[#e2e8f0] mb-3">Enforcement Pyramid</h3>
              <EnforcementPyramid />
            </div>
            
            <ExecutiveOrderTemplate />
          </div>
        )}
        
        {/* Coalition */}
        {activeSection === 'coalition' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[#e2e8f0] flex items-center gap-2 mb-4">
              <Users className="w-6 h-6 text-[#38bdf8]" />
              Coalition Building for Infrastructure Accountability
            </h2>
            
            <div>
              <h3 className="text-lg font-semibold text-[#e2e8f0] mb-3">Existing Allies</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {COALITION_PARTNERS.map(partner => (
                  <div key={partner.id} className="bg-[#1e293b] border border-[#334155] rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        partner.type === 'Union' ? 'bg-[#ef4444] text-white' :
                        partner.type === 'Tech_Workers' ? 'bg-[#8b5cf6] text-white' :
                        partner.type === 'Advocacy' ? 'bg-[#3b82f6] text-white' :
                        partner.type === 'Environmental_Justice' ? 'bg-[#22c55e] text-white' :
                        'bg-[#64748b] text-white'
                      }`}>
                        {partner.type.replace('_', ' ')}
                      </span>
                      <span className="font-semibold text-[#e2e8f0]">{partner.name}</span>
                    </div>
                    <div className="flex gap-2 flex-wrap mb-2">
                      {partner.focusAreas.map((area, i) => (
                        <span key={i} className="px-2 py-0.5 bg-[#334155] text-[#94a3b8] rounded text-xs">
                          {area}
                        </span>
                      ))}
                    </div>
                    {partner.relevantVictories && (
                      <p className="text-xs text-[#22c55e]">
                        ✓ Victories: {partner.relevantVictories.join(', ')}
                      </p>
                    )}
                    {partner.website && (
                      <a
                        href={partner.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-[#38bdf8] hover:underline flex items-center gap-1 mt-2"
                      >
                        Visit Website <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-[#e2e8f0] mb-3">State-Level Coordination</h3>
              <div className="space-y-3">
                {STATE_LEVEL_COORDINATION.map((official, i) => (
                  <div key={i} className="bg-[#1e293b] border border-[#334155] rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-semibold text-[#e2e8f0]">{official.official}</span>
                        <span className="text-sm text-[#64748b] ml-2">({official.title})</span>
                      </div>
                    </div>
                    <p className="text-sm text-[#94a3b8] mb-2">{official.relevance}</p>
                    <div className="flex gap-2 flex-wrap">
                      {official.keyActions.map((action, j) => (
                        <span key={j} className="px-2 py-0.5 bg-[#22c55e]/20 text-[#22c55e] rounded text-xs">
                          {action}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Resources */}
        {activeSection === 'resources' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[#e2e8f0] flex items-center gap-2 mb-4">
              <BookOpen className="w-6 h-6 text-[#38bdf8]" />
              Research Tools for Ongoing Monitoring
            </h2>
            
            {['Federal_Contracts', 'Data_Center_Infrastructure', 'Civil_Rights_Monitoring'].map(category => (
              <div key={category}>
                <h3 className="text-lg font-semibold text-[#e2e8f0] mb-3">
                  {category.replace(/_/g, ' ')}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {RESEARCH_RESOURCES.filter(r => r.category === category).map(resource => (
                    <a
                      key={resource.id}
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-[#1e293b] border border-[#334155] rounded-lg p-4 hover:bg-[#334155] transition-colors group"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-[#e2e8f0] group-hover:text-[#38bdf8]">
                          {resource.name}
                        </span>
                        <ExternalLink className="w-4 h-4 text-[#64748b] group-hover:text-[#38bdf8]" />
                      </div>
                      <p className="text-sm text-[#94a3b8]">{resource.description}</p>
                      {resource.updateFrequency && (
                        <span className="inline-block mt-2 px-2 py-0.5 bg-[#334155] text-[#64748b] rounded text-xs">
                          Updates: {resource.updateFrequency}
                        </span>
                      )}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {/* Legal Precedents */}
        {activeSection === 'legal' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-[#e2e8f0] flex items-center gap-2 mb-4">
              <Scale className="w-6 h-6 text-[#a78bfa]" />
              Legal Precedent for Infrastructure-Based Enforcement
            </h2>
            
            {['Sanctuary_City', 'Infrastructure_Regulation', 'Data_Sovereignty'].map(category => {
              const precedents = LEGAL_PRECEDENTS.filter(p => p.category === category);
              if (precedents.length === 0) return null;
              
              return (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-[#e2e8f0] mb-3">
                    {category.replace(/_/g, ' ')} Precedents
                  </h3>
                  <div className="space-y-4">
                    {precedents.map(precedent => (
                      <div key={precedent.id} className="bg-[#1e293b] border border-[#334155] rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <span className="font-semibold text-[#e2e8f0]">{precedent.caseName}</span>
                            <span className="text-sm text-[#64748b] ml-2">
                              {precedent.court} • {precedent.year}
                            </span>
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                            precedent.relevanceLevel === 'High' ? 'bg-[#22c55e] text-white' :
                            precedent.relevanceLevel === 'Medium' ? 'bg-[#eab308] text-black' :
                            'bg-[#64748b] text-white'
                          }`}>
                            {precedent.relevanceLevel} Relevance
                          </span>
                        </div>
                        <div className="mb-3">
                          <p className="text-xs text-[#64748b] mb-1">Key Holdings:</p>
                          <ul className="space-y-1">
                            {precedent.holdings.map((holding, i) => (
                              <li key={i} className="text-sm text-[#94a3b8] flex items-start gap-2">
                                <CheckCircle className="w-4 h-4 text-[#22c55e] flex-shrink-0 mt-0.5" />
                                {holding}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div className="p-3 bg-[#0f172a] rounded-lg border-l-4 border-[#a78bfa]">
                          <p className="text-xs text-[#64748b] mb-1">Data Center Applicability:</p>
                          <p className="text-sm text-[#e2e8f0]">{precedent.dataCenterApplicability}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
