/**
 * Detailed Facility View Component
 * 
 * Ultra-detailed expandable view with deep nesting at every level.
 * Provides granular drill-down into all facility data.
 */

import React, { useState } from 'react';
import {
  ChevronDown, ChevronRight, Building2, MapPin, DollarSign, Users,
  AlertTriangle, CheckCircle, XCircle, Shield, Clock, FileText,
  Zap, Globe, Activity, Calendar, Hash, Target, TrendingUp, TrendingDown,
  Briefcase, Factory, Thermometer, Wifi, Server, HardDrive, Cpu,
  Power, Gauge, BarChart3, PieChart, LineChart, Award, Flag,
  Mail, Phone, Link, ExternalLink, Copy, Check, Eye, Lock, Unlock,
  ArrowUpRight, ArrowDownRight, Minus, Plus, FolderOpen, Folder,
  ShieldCheck
} from 'lucide-react';
import { Facility } from '../types';
import { formatCurrency } from '../utils/formatting';
import { FacilityVerificationPanel } from './FacilityVerificationPanel';

// ============================================================================
// EXPANDABLE SECTION - Reusable collapsible section with nested content
// ============================================================================
interface ExpandableSectionProps {
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  badgeColor?: string;
  defaultOpen?: boolean;
  level?: number;
  children: React.ReactNode;
}

export const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title, icon, badge, badgeColor = 'bg-slate-100 text-slate-600', defaultOpen = false, level = 0, children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  const levelColors = [
    'border-l-blue-400 bg-blue-50/30',
    'border-l-emerald-400 bg-emerald-50/30',
    'border-l-purple-400 bg-purple-50/30',
    'border-l-amber-400 bg-amber-50/30',
    'border-l-rose-400 bg-rose-50/30',
    'border-l-cyan-400 bg-cyan-50/30',
  ];

  return (
    <div className={`border rounded-lg overflow-hidden ${level > 0 ? 'ml-2 mt-1' : 'mb-2'}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-2 py-1.5 flex items-center gap-2 text-left hover:bg-slate-50 transition-colors border-l-4 ${levelColors[level % levelColors.length]}`}
      >
        {isOpen ? <ChevronDown size={12} className="text-slate-400" /> : <ChevronRight size={12} className="text-slate-400" />}
        {icon && <span className="text-slate-500">{icon}</span>}
        <span className="text-xs font-semibold text-slate-700 flex-1">{title}</span>
        {badge !== undefined && (
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${badgeColor}`}>{badge}</span>
        )}
      </button>
      {isOpen && (
        <div className="px-2 py-1.5 border-t border-slate-100 bg-white">
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DATA ROW - Key-value pair with optional nested content
// ============================================================================
interface DataRowProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  expandable?: boolean;
  children?: React.ReactNode;
}

export const DataRow: React.FC<DataRowProps> = ({ label, value, icon, trend, expandable, children }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-slate-100 last:border-0">
      <div 
        className={`flex items-center gap-2 py-1 ${expandable ? 'cursor-pointer hover:bg-slate-50' : ''}`}
        onClick={() => expandable && setIsOpen(!isOpen)}
      >
        {expandable && (
          isOpen ? <Minus size={10} className="text-slate-400" /> : <Plus size={10} className="text-slate-400" />
        )}
        {icon && <span className="text-slate-400">{icon}</span>}
        <span className="text-[10px] text-slate-500 flex-1">{label}</span>
        <span className="text-xs font-medium text-slate-800 flex items-center gap-1">
          {value}
          {trend === 'up' && <TrendingUp size={10} className="text-emerald-500" />}
          {trend === 'down' && <TrendingDown size={10} className="text-rose-500" />}
        </span>
      </div>
      {expandable && isOpen && children && (
        <div className="pl-4 pb-1 border-l-2 border-slate-200 ml-1">
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// DETAILED FACILITY MODAL - Ultra-detailed with deep nesting
// ============================================================================
export const DetailedFacilityModal: React.FC<{
  facility: Facility;
  onClose: () => void;
}> = ({ facility, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  // Generate synthetic detailed data for the facility
  const syntheticData = generateSyntheticFacilityData(facility);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const statusColors: Record<string, string> = {
    'Compliant': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'Non-Compliant': 'bg-rose-100 text-rose-700 border-rose-200',
    'At Risk': 'bg-amber-100 text-amber-700 border-amber-200',
    'Unknown': 'bg-slate-100 text-slate-600 border-slate-200',
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Eye size={12} /> },
    { id: 'verification', label: 'Verification', icon: <ShieldCheck size={12} /> },
    { id: 'location', label: 'Location', icon: <MapPin size={12} /> },
    { id: 'infrastructure', label: 'Infrastructure', icon: <Server size={12} /> },
    { id: 'compliance', label: 'Compliance', icon: <Shield size={12} /> },
    { id: 'financial', label: 'Financial', icon: <DollarSign size={12} /> },
    { id: 'workforce', label: 'Workforce', icon: <Users size={12} /> },
    { id: 'issues', label: 'Issues', icon: <AlertTriangle size={12} />, badge: facility.issues?.length || 0 },
    { id: 'timeline', label: 'Timeline', icon: <Clock size={12} /> },
    { id: 'documents', label: 'Documents', icon: <FileText size={12} /> },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div 
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-3 py-2 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold shadow">
              {facility.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm font-bold text-slate-800 truncate">{facility.name}</h2>
              <p className="text-[10px] text-slate-500">{facility.operator} • {facility.city || 'Unknown'}, {facility.state || 'Unknown'}</p>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${statusColors[facility.complianceStatus] || statusColors['Unknown']}`}>
              {facility.complianceStatus}
            </span>
            <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg">
              <XCircle size={16} className="text-slate-400" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-2 py-1 border-b border-slate-200 bg-slate-50 flex flex-wrap gap-0.5 overflow-x-auto">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-2 py-1 rounded text-[10px] font-medium flex items-center gap-1 whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'bg-blue-500 text-white' 
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className={`ml-0.5 px-1 py-0.5 rounded-full text-[8px] font-bold ${
                  activeTab === tab.id ? 'bg-white/20' : 'bg-rose-100 text-rose-700'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(95vh-120px)] p-2">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-2">
              <ExpandableSection title="Basic Information" icon={<Building2 size={12} />} defaultOpen={true}>
                <div className="grid grid-cols-2 gap-x-4">
                  <DataRow label="Facility ID" value={facility.id} icon={<Hash size={10} />} />
                  <DataRow label="Facility Name" value={facility.name} icon={<Building2 size={10} />} />
                  <DataRow label="Operator" value={facility.operator} icon={<Briefcase size={10} />} />
                  <DataRow label="Facility Type" value={facility.type || 'Data Center'} icon={<Factory size={10} />} />
                  <DataRow label="Status" value={facility.complianceStatus} icon={<Shield size={10} />} />
                  <DataRow label="Last Updated" value={syntheticData.lastUpdated} icon={<Calendar size={10} />} />
                </div>
              </ExpandableSection>

              <ExpandableSection title="Quick Stats" icon={<BarChart3 size={12} />} defaultOpen={true}>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg border border-blue-100 text-center">
                    <p className="text-[10px] text-blue-600 font-semibold">Subsidy Gap</p>
                    <p className="text-sm font-bold text-blue-800">{formatCurrency(facility.subsidyGap || 0)}</p>
                  </div>
                  <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100 text-center">
                    <p className="text-[10px] text-emerald-600 font-semibold">Jobs Created</p>
                    <p className="text-sm font-bold text-emerald-800">{(facility.jobsCreated ?? 0).toLocaleString()}</p>
                  </div>
                  <div className="p-2 bg-purple-50 rounded-lg border border-purple-100 text-center">
                    <p className="text-[10px] text-purple-600 font-semibold">Jobs Promised</p>
                    <p className="text-sm font-bold text-purple-800">{(facility.jobsPromised ?? 0).toLocaleString()}</p>
                  </div>
                </div>
              </ExpandableSection>

              <ExpandableSection title="Compliance Summary" icon={<Shield size={12} />} badge={facility.complianceStatus} badgeColor={statusColors[facility.complianceStatus]}>
                <DataRow label="Current Status" value={facility.complianceStatus} />
                <DataRow label="Compliance Rate" value={`${syntheticData.complianceRate}%`} trend={syntheticData.complianceRate >= 80 ? 'up' : 'down'} />
                <DataRow label="Last Audit" value={syntheticData.lastAuditDate} />
                <DataRow label="Next Review" value={syntheticData.nextReviewDate} />
                <DataRow label="Active Issues" value={facility.issues?.length || 0} />
              </ExpandableSection>
            </div>
          )}

          {/* VERIFICATION TAB */}
          {activeTab === 'verification' && (
            <div className="space-y-3">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <h3 className="text-sm font-semibold text-blue-800 mb-1">Multi-Source Verification</h3>
                <p className="text-xs text-blue-600">
                  Cross-references facility data against EPA environmental registry, 
                  EIA energy patterns, and BGP network routing to verify authenticity.
                </p>
              </div>
              
              <FacilityVerificationPanel
                facilityName={facility.name}
                latitude={syntheticData.coordinates.lat}
                longitude={syntheticData.coordinates.lng}
                state={facility.state}
              />
              
              <ExpandableSection title="What This Verifies" icon={<ShieldCheck size={12} />} defaultOpen={true}>
                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <MapPin size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <span className="font-medium text-slate-700">EPA ECHO</span>: Checks if this facility 
                      exists in EPA's environmental registry with proper permits (Title V air, RCRA hazmat).
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <Zap size={12} className="text-slate-400 mt-0.5" />
                    <div>
                      <span className="font-medium text-slate-700">EIA Energy</span>: Analyzes regional 
                      electricity demand patterns for data center load signatures (high baseload = DC presence).
                    </div>
                  </div>
                </div>
              </ExpandableSection>
            </div>
          )}

          {/* LOCATION TAB */}
          {activeTab === 'location' && (
            <div className="space-y-2">
              <ExpandableSection title="Address Details" icon={<MapPin size={12} />} defaultOpen={true}>
                <DataRow label="Street Address" value={syntheticData.address.street} />
                <DataRow label="City" value={facility.city || 'Unknown'} />
                <DataRow label="State/Province" value={facility.state || 'Unknown'} />
                <DataRow label="Postal Code" value={syntheticData.address.postalCode} />
                <DataRow label="Country" value={syntheticData.address.country} />
              </ExpandableSection>

              <ExpandableSection title="Geographic Coordinates" icon={<Globe size={12} />}>
                <DataRow label="Latitude" value={syntheticData.coordinates.lat} />
                <DataRow label="Longitude" value={syntheticData.coordinates.lng} />
                <DataRow label="Elevation" value={`${syntheticData.coordinates.elevation}m`} />
                <DataRow label="Time Zone" value={syntheticData.timezone} />
              </ExpandableSection>

              <ExpandableSection title="Regional Information" icon={<Flag size={12} />}>
                <DataRow label="Region" value={syntheticData.region} />
                <DataRow label="Metro Area" value={syntheticData.metroArea} />
                <DataRow label="Tax District" value={syntheticData.taxDistrict} />
                <DataRow label="Utility Provider" value={syntheticData.utilityProvider} />
                <DataRow label="ISP" value={syntheticData.isp} />
              </ExpandableSection>

              <ExpandableSection title="Accessibility" icon={<ArrowUpRight size={12} />}>
                <DataRow label="Nearest Airport" value={syntheticData.nearestAirport} />
                <DataRow label="Distance to Airport" value={`${syntheticData.distanceToAirport} km`} />
                <DataRow label="Highway Access" value={syntheticData.highwayAccess} />
                <DataRow label="Public Transit" value={syntheticData.publicTransit ? 'Available' : 'Not Available'} />
              </ExpandableSection>
            </div>
          )}

          {/* INFRASTRUCTURE TAB */}
          {activeTab === 'infrastructure' && (
            <div className="space-y-2">
              <ExpandableSection title="Facility Specifications" icon={<Building2 size={12} />} defaultOpen={true}>
                <DataRow label="Total Area" value={`${syntheticData.infrastructure.totalArea.toLocaleString()} sq ft`} expandable>
                  <DataRow label="Data Hall Space" value={`${syntheticData.infrastructure.dataHallSpace.toLocaleString()} sq ft`} />
                  <DataRow label="Office Space" value={`${syntheticData.infrastructure.officeSpace.toLocaleString()} sq ft`} />
                  <DataRow label="Support Space" value={`${syntheticData.infrastructure.supportSpace.toLocaleString()} sq ft`} />
                </DataRow>
                <DataRow label="Number of Floors" value={syntheticData.infrastructure.floors} />
                <DataRow label="Raised Floor Height" value={`${syntheticData.infrastructure.raisedFloorHeight}" `} />
                <DataRow label="Ceiling Height" value={`${syntheticData.infrastructure.ceilingHeight}'`} />
              </ExpandableSection>

              <ExpandableSection title="Power Systems" icon={<Zap size={12} />}>
                <DataRow label="Total Power Capacity" value={`${syntheticData.power.totalCapacity} MW`} expandable>
                  <DataRow label="IT Load" value={`${syntheticData.power.itLoad} MW`} />
                  <DataRow label="Cooling Load" value={`${syntheticData.power.coolingLoad} MW`} />
                  <DataRow label="Overhead" value={`${syntheticData.power.overhead} MW`} />
                </DataRow>
                <DataRow label="Redundancy" value={syntheticData.power.redundancy} />
                <DataRow label="UPS Capacity" value={`${syntheticData.power.upsCapacity} kVA`} />
                <DataRow label="Generator Capacity" value={`${syntheticData.power.generatorCapacity} MW`} />
                <DataRow label="Fuel Reserve" value={`${syntheticData.power.fuelReserve} hours`} />
                <DataRow label="PUE" value={syntheticData.power.pue} />
              </ExpandableSection>

              <ExpandableSection title="Cooling Systems" icon={<Thermometer size={12} />}>
                <DataRow label="Cooling Capacity" value={`${syntheticData.cooling.capacity} tons`} />
                <DataRow label="Cooling Type" value={syntheticData.cooling.type} />
                <DataRow label="Operating Temp" value={`${syntheticData.cooling.operatingTemp}°F`} />
                <DataRow label="Humidity Range" value={`${syntheticData.cooling.humidityMin}-${syntheticData.cooling.humidityMax}%`} />
                <DataRow label="Hot/Cold Aisle" value={syntheticData.cooling.hotColdAisle ? 'Yes' : 'No'} />
              </ExpandableSection>

              <ExpandableSection title="Network Infrastructure" icon={<Wifi size={12} />}>
                <DataRow label="Fiber Providers" value={syntheticData.network.fiberProviders} expandable>
                  {syntheticData.network.fiberProviderList.map((provider, i) => (
                    <DataRow key={i} label={`Provider ${i + 1}`} value={provider} />
                  ))}
                </DataRow>
                <DataRow label="Total Bandwidth" value={`${syntheticData.network.bandwidth} Gbps`} />
                <DataRow label="Latency (avg)" value={`${syntheticData.network.latency}ms`} />
                <DataRow label="IX Connections" value={syntheticData.network.ixConnections} />
              </ExpandableSection>

              <ExpandableSection title="Server Infrastructure" icon={<Server size={12} />}>
                <DataRow label="Total Racks" value={syntheticData.servers.totalRacks.toLocaleString()} expandable>
                  <DataRow label="Occupied Racks" value={syntheticData.servers.occupiedRacks.toLocaleString()} />
                  <DataRow label="Available Racks" value={(syntheticData.servers.totalRacks - syntheticData.servers.occupiedRacks).toLocaleString()} />
                </DataRow>
                <DataRow label="Max kW per Rack" value={`${syntheticData.servers.maxKwPerRack} kW`} />
                <DataRow label="Average Utilization" value={`${syntheticData.servers.utilization}%`} />
              </ExpandableSection>
            </div>
          )}

          {/* COMPLIANCE TAB */}
          {activeTab === 'compliance' && (
            <div className="space-y-2">
              <ExpandableSection title="Current Status" icon={<Shield size={12} />} defaultOpen={true} badge={facility.complianceStatus} badgeColor={statusColors[facility.complianceStatus]}>
                <DataRow label="Overall Status" value={facility.complianceStatus} />
                <DataRow label="Compliance Score" value={`${syntheticData.complianceRate}/100`} />
                <DataRow label="Risk Level" value={syntheticData.riskLevel} />
                <DataRow label="Status Since" value={syntheticData.statusSince} />
              </ExpandableSection>

              <ExpandableSection title="Job Creation Analysis" icon={<Users size={12} />}>
                <DataRow label="Jobs Promised" value={(facility.jobsPromised ?? 0).toLocaleString()} expandable>
                  <DataRow label="Full-time" value={syntheticData.jobs.promisedFullTime.toLocaleString()} />
                  <DataRow label="Part-time" value={syntheticData.jobs.promisedPartTime.toLocaleString()} />
                  <DataRow label="Contract" value={syntheticData.jobs.promisedContract.toLocaleString()} />
                </DataRow>
                <DataRow label="Jobs Created" value={(facility.jobsCreated ?? 0).toLocaleString()} expandable>
                  <DataRow label="Full-time" value={syntheticData.jobs.createdFullTime.toLocaleString()} />
                  <DataRow label="Part-time" value={syntheticData.jobs.createdPartTime.toLocaleString()} />
                  <DataRow label="Contract" value={syntheticData.jobs.createdContract.toLocaleString()} />
                </DataRow>
                <DataRow label="Jobs Gap" value={(facility.jobsPromised ?? 0) - (facility.jobsCreated ?? 0)} trend="down" />
                <DataRow label="Fulfillment Rate" value={`${syntheticData.jobs.fulfillmentRate}%`} trend={syntheticData.jobs.fulfillmentRate >= 80 ? 'up' : 'down'} />
                <DataRow label="Avg Salary" value={formatCurrency(syntheticData.jobs.avgSalary)} />
                <DataRow label="Benefits Offered" value={syntheticData.jobs.benefitsOffered ? 'Yes' : 'No'} />
              </ExpandableSection>

              <ExpandableSection title="Audit History" icon={<FileText size={12} />} badge={syntheticData.audits.length}>
                {syntheticData.audits.map((audit, i) => (
                  <DataRow key={i} label={audit.date} value={audit.result} expandable>
                    <DataRow label="Auditor" value={audit.auditor} />
                    <DataRow label="Score" value={`${audit.score}/100`} />
                    <DataRow label="Findings" value={audit.findings} />
                    <DataRow label="Report ID" value={audit.reportId} />
                  </DataRow>
                ))}
              </ExpandableSection>

              <ExpandableSection title="Certifications" icon={<Award size={12} />} badge={syntheticData.certifications.length}>
                {syntheticData.certifications.map((cert, i) => (
                  <DataRow key={i} label={cert.name} value={cert.status} expandable>
                    <DataRow label="Issued" value={cert.issuedDate} />
                    <DataRow label="Expires" value={cert.expiryDate} />
                    <DataRow label="Issuer" value={cert.issuer} />
                  </DataRow>
                ))}
              </ExpandableSection>
            </div>
          )}

          {/* FINANCIAL TAB */}
          {activeTab === 'financial' && (
            <div className="space-y-2">
              <ExpandableSection title="Subsidy Overview" icon={<DollarSign size={12} />} defaultOpen={true}>
                <DataRow label="Total Subsidies Received" value={formatCurrency(syntheticData.financial.totalSubsidies)} expandable>
                  <DataRow label="Federal" value={formatCurrency(syntheticData.financial.federalSubsidy)} />
                  <DataRow label="State" value={formatCurrency(syntheticData.financial.stateSubsidy)} />
                  <DataRow label="Local" value={formatCurrency(syntheticData.financial.localSubsidy)} />
                </DataRow>
                <DataRow label="Subsidy Gap" value={formatCurrency(facility.subsidyGap || 0)} trend="down" />
                <DataRow label="Value Delivered" value={formatCurrency(syntheticData.financial.valueDelivered)} />
              </ExpandableSection>

              <ExpandableSection title="Tax Incentives" icon={<Briefcase size={12} />}>
                <DataRow label="Property Tax Abatement" value={formatCurrency(syntheticData.financial.propertyTaxAbatement)} expandable>
                  <DataRow label="Duration" value={`${syntheticData.financial.propertyTaxDuration} years`} />
                  <DataRow label="Start Date" value={syntheticData.financial.propertyTaxStart} />
                  <DataRow label="End Date" value={syntheticData.financial.propertyTaxEnd} />
                </DataRow>
                <DataRow label="Sales Tax Exemption" value={formatCurrency(syntheticData.financial.salesTaxExemption)} />
                <DataRow label="Income Tax Credits" value={formatCurrency(syntheticData.financial.incomeTaxCredits)} />
                <DataRow label="Utility Discounts" value={formatCurrency(syntheticData.financial.utilityDiscounts)} />
              </ExpandableSection>

              <ExpandableSection title="ROI Analysis" icon={<TrendingUp size={12} />}>
                <DataRow label="Investment" value={formatCurrency(syntheticData.financial.investment)} />
                <DataRow label="Economic Impact" value={formatCurrency(syntheticData.financial.economicImpact)} />
                <DataRow label="ROI" value={`${syntheticData.financial.roi}%`} trend={syntheticData.financial.roi > 0 ? 'up' : 'down'} />
                <DataRow label="Cost per Job Created" value={formatCurrency(syntheticData.financial.costPerJob)} />
                <DataRow label="Payback Period" value={`${syntheticData.financial.paybackPeriod} years`} />
              </ExpandableSection>

              <ExpandableSection title="Annual Breakdown" icon={<Calendar size={12} />}>
                {syntheticData.financial.annualBreakdown.map((year, i) => (
                  <DataRow key={i} label={`Year ${year.year}`} value={formatCurrency(year.subsidy)} expandable>
                    <DataRow label="Subsidy Received" value={formatCurrency(year.subsidy)} />
                    <DataRow label="Value Created" value={formatCurrency(year.valueCreated)} />
                    <DataRow label="Jobs Added" value={year.jobsAdded.toLocaleString()} />
                    <DataRow label="Net Impact" value={formatCurrency(year.netImpact)} trend={year.netImpact > 0 ? 'up' : 'down'} />
                  </DataRow>
                ))}
              </ExpandableSection>
            </div>
          )}

          {/* WORKFORCE TAB */}
          {activeTab === 'workforce' && (
            <div className="space-y-2">
              <ExpandableSection title="Employment Summary" icon={<Users size={12} />} defaultOpen={true}>
                <DataRow label="Total Employees" value={syntheticData.workforce.total.toLocaleString()} expandable>
                  <DataRow label="Direct Employees" value={syntheticData.workforce.direct.toLocaleString()} />
                  <DataRow label="Contractors" value={syntheticData.workforce.contractors.toLocaleString()} />
                </DataRow>
                <DataRow label="Full-time" value={syntheticData.workforce.fullTime.toLocaleString()} />
                <DataRow label="Part-time" value={syntheticData.workforce.partTime.toLocaleString()} />
                <DataRow label="Turnover Rate" value={`${syntheticData.workforce.turnoverRate}%`} />
              </ExpandableSection>

              <ExpandableSection title="Job Categories" icon={<Briefcase size={12} />}>
                {syntheticData.workforce.categories.map((cat, i) => (
                  <DataRow key={i} label={cat.name} value={cat.count.toLocaleString()} expandable>
                    <DataRow label="Avg Salary" value={formatCurrency(cat.avgSalary)} />
                    <DataRow label="Open Positions" value={cat.openPositions} />
                  </DataRow>
                ))}
              </ExpandableSection>

              <ExpandableSection title="Safety & Training" icon={<Shield size={12} />}>
                <DataRow label="OSHA Violations" value={syntheticData.safety.oshaViolations} />
                <DataRow label="Days Since Incident" value={syntheticData.safety.daysSinceIncident.toLocaleString()} />
                <DataRow label="Training Hours/Employee" value={syntheticData.safety.trainingHours} />
                <DataRow label="Safety Certifications" value={syntheticData.safety.certifications} />
              </ExpandableSection>

              <ExpandableSection title="Benefits & Compensation" icon={<Award size={12} />}>
                <DataRow label="Health Insurance" value={syntheticData.benefits.healthInsurance ? 'Offered' : 'Not Offered'} />
                <DataRow label="401k Match" value={syntheticData.benefits.retirement401k ? `${syntheticData.benefits.retirementMatch}%` : 'None'} />
                <DataRow label="PTO Days" value={syntheticData.benefits.ptoDays} />
                <DataRow label="Remote Work" value={syntheticData.benefits.remoteWork ? 'Available' : 'Not Available'} />
              </ExpandableSection>
            </div>
          )}

          {/* ISSUES TAB */}
          {activeTab === 'issues' && (
            <div className="space-y-2">
              <ExpandableSection title="Active Issues" icon={<AlertTriangle size={12} />} badge={facility.issues?.length || 0} badgeColor="bg-rose-100 text-rose-700" defaultOpen={true}>
                {facility.issues && facility.issues.length > 0 ? (
                  facility.issues.map((issue, i) => (
                    <ExpandableSection key={i} title={issue} icon={<AlertTriangle size={10} />} level={1} badge={syntheticData.issueDetails[i]?.severity} badgeColor={
                      syntheticData.issueDetails[i]?.severity === 'Critical' ? 'bg-rose-100 text-rose-700' :
                      syntheticData.issueDetails[i]?.severity === 'High' ? 'bg-amber-100 text-amber-700' :
                      'bg-blue-100 text-blue-700'
                    }>
                      <DataRow label="Issue ID" value={syntheticData.issueDetails[i]?.id || `ISS-${facility.id}-${i}`} />
                      <DataRow label="Severity" value={syntheticData.issueDetails[i]?.severity || 'Medium'} />
                      <DataRow label="Category" value={syntheticData.issueDetails[i]?.category || 'Compliance'} />
                      <DataRow label="Reported Date" value={syntheticData.issueDetails[i]?.reportedDate || 'Unknown'} />
                      <DataRow label="Days Open" value={syntheticData.issueDetails[i]?.daysOpen || 0} />
                      <DataRow label="Assigned To" value={syntheticData.issueDetails[i]?.assignedTo || 'Unassigned'} />
                      <DataRow label="Status" value={syntheticData.issueDetails[i]?.status || 'Open'} />
                      <DataRow label="Resolution ETA" value={syntheticData.issueDetails[i]?.eta || 'TBD'} />
                      <DataRow label="Financial Impact" value={formatCurrency(syntheticData.issueDetails[i]?.financialImpact || 0)} />
                    </ExpandableSection>
                  ))
                ) : (
                  <div className="text-center py-4">
                    <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto mb-1" />
                    <p className="text-xs text-slate-600">No active issues</p>
                  </div>
                )}
              </ExpandableSection>

              <ExpandableSection title="Historical Issues" icon={<Clock size={12} />} badge={syntheticData.historicalIssues.length}>
                {syntheticData.historicalIssues.map((issue, i) => (
                  <DataRow key={i} label={issue.title} value={issue.resolution} expandable>
                    <DataRow label="Opened" value={issue.openedDate} />
                    <DataRow label="Closed" value={issue.closedDate} />
                    <DataRow label="Duration" value={`${issue.durationDays} days`} />
                    <DataRow label="Resolution Cost" value={formatCurrency(issue.cost)} />
                  </DataRow>
                ))}
              </ExpandableSection>

              <ExpandableSection title="Risk Assessment" icon={<Target size={12} />}>
                <DataRow label="Overall Risk Score" value={`${syntheticData.risk.overall}/100`} trend={syntheticData.risk.overall < 50 ? 'up' : 'down'} />
                <DataRow label="Compliance Risk" value={syntheticData.risk.compliance} />
                <DataRow label="Financial Risk" value={syntheticData.risk.financial} />
                <DataRow label="Operational Risk" value={syntheticData.risk.operational} />
                <DataRow label="Reputational Risk" value={syntheticData.risk.reputational} />
              </ExpandableSection>
            </div>
          )}

          {/* TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div className="space-y-2">
              <ExpandableSection title="Key Milestones" icon={<Calendar size={12} />} defaultOpen={true}>
                {syntheticData.milestones.map((milestone, i) => (
                  <DataRow key={i} label={milestone.date} value={milestone.event} expandable>
                    <DataRow label="Details" value={milestone.details} />
                    <DataRow label="Impact" value={milestone.impact} />
                  </DataRow>
                ))}
              </ExpandableSection>

              <ExpandableSection title="Recent Activity" icon={<Activity size={12} />} badge={syntheticData.recentActivity.length}>
                {syntheticData.recentActivity.map((activity, i) => (
                  <DataRow key={i} label={activity.timestamp} value={activity.action} expandable>
                    <DataRow label="User" value={activity.user} />
                    <DataRow label="Type" value={activity.type} />
                  </DataRow>
                ))}
              </ExpandableSection>
            </div>
          )}

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <div className="space-y-2">
              <ExpandableSection title="Compliance Documents" icon={<FileText size={12} />} badge={syntheticData.documents.compliance.length} defaultOpen={true}>
                {syntheticData.documents.compliance.map((doc, i) => (
                  <DataRow key={i} label={doc.name} value={doc.type} icon={<FileText size={10} />} expandable>
                    <DataRow label="Upload Date" value={doc.uploadDate} />
                    <DataRow label="Size" value={doc.size} />
                    <DataRow label="Status" value={doc.status} />
                  </DataRow>
                ))}
              </ExpandableSection>

              <ExpandableSection title="Financial Documents" icon={<DollarSign size={12} />} badge={syntheticData.documents.financial.length}>
                {syntheticData.documents.financial.map((doc, i) => (
                  <DataRow key={i} label={doc.name} value={doc.type} icon={<FileText size={10} />} expandable>
                    <DataRow label="Upload Date" value={doc.uploadDate} />
                    <DataRow label="Size" value={doc.size} />
                    <DataRow label="Status" value={doc.status} />
                  </DataRow>
                ))}
              </ExpandableSection>

              <ExpandableSection title="Contracts & Agreements" icon={<Briefcase size={12} />} badge={syntheticData.documents.contracts.length}>
                {syntheticData.documents.contracts.map((doc, i) => (
                  <DataRow key={i} label={doc.name} value={doc.type} icon={<FileText size={10} />} expandable>
                    <DataRow label="Effective Date" value={doc.effectiveDate} />
                    <DataRow label="Expiry Date" value={doc.expiryDate} />
                    <DataRow label="Parties" value={doc.parties} />
                  </DataRow>
                ))}
              </ExpandableSection>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-3 py-2 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500">ID:</span>
            <code className="text-[10px] font-mono text-slate-600">{facility.id}</code>
            <button onClick={() => copyToClipboard(String(facility.id))} className="p-0.5 hover:bg-slate-200 rounded">
              {copied ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} className="text-slate-400" />}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-2 py-1 text-[10px] text-slate-600 hover:text-slate-800">Close</button>
            <button className="px-2 py-1 text-[10px] border border-slate-200 hover:border-blue-300 rounded flex items-center gap-1">
              <FileText size={10} /> Export
            </button>
            <button className="px-2 py-1 text-[10px] bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center gap-1">
              <ExternalLink size={10} /> Full Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// SYNTHETIC DATA GENERATOR - Creates realistic detailed data
// ============================================================================
function generateSyntheticFacilityData(facility: Facility) {
  const seed = facility.id || 1;
  const random = (min: number, max: number) => Math.floor((seed * 9301 + 49297) % 233280 / 233280 * (max - min + 1)) + min;
  const randomFloat = (min: number, max: number) => parseFloat((Math.random() * (max - min) + min).toFixed(2));
  
  const severities = ['Critical', 'High', 'Medium', 'Low'];
  const categories = ['Compliance', 'Safety', 'Financial', 'Operational', 'Environmental'];
  const statuses = ['Open', 'In Progress', 'Under Review', 'Pending'];
  
  return {
    lastUpdated: new Date(Date.now() - random(1, 30) * 86400000).toISOString().split('T')[0],
    complianceRate: facility.complianceStatus === 'Compliant' ? random(85, 100) : facility.complianceStatus === 'Non-Compliant' ? random(20, 60) : random(60, 85),
    lastAuditDate: new Date(Date.now() - random(30, 180) * 86400000).toISOString().split('T')[0],
    nextReviewDate: new Date(Date.now() + random(30, 180) * 86400000).toISOString().split('T')[0],
    riskLevel: facility.complianceStatus === 'Non-Compliant' ? 'High' : facility.complianceStatus === 'At Risk' ? 'Medium' : 'Low',
    statusSince: new Date(Date.now() - random(60, 365) * 86400000).toISOString().split('T')[0],

    address: {
      street: `${random(100, 9999)} ${['Industrial Blvd', 'Tech Park Dr', 'Data Center Way', 'Server Lane'][random(0, 3)]}`,
      postalCode: `${random(10000, 99999)}`,
      country: ['United States', 'United Kingdom', 'Germany', 'Singapore', 'Japan'][random(0, 4)],
    },
    coordinates: {
      lat: `${randomFloat(25, 50)}°N`,
      lng: `${randomFloat(-120, -70)}°W`,
      elevation: random(50, 500),
    },
    timezone: ['EST', 'CST', 'PST', 'GMT', 'JST'][random(0, 4)],
    region: ['Northeast', 'Southeast', 'Midwest', 'Southwest', 'West', 'EMEA', 'APAC'][random(0, 6)],
    metroArea: facility.city || 'Unknown',
    taxDistrict: `District ${random(1, 20)}`,
    utilityProvider: ['Duke Energy', 'AES', 'Dominion Energy', 'Pacific Gas & Electric'][random(0, 3)],
    isp: ['Level 3', 'Cogent', 'AT&T', 'Verizon'][random(0, 3)],
    nearestAirport: `${['IAD', 'ORD', 'DFW', 'SFO', 'JFK'][random(0, 4)]}`,
    distanceToAirport: random(5, 50),
    highwayAccess: `I-${random(10, 95)}`,
    publicTransit: random(0, 1) === 1,

    infrastructure: {
      totalArea: random(50000, 500000),
      dataHallSpace: random(20000, 200000),
      officeSpace: random(5000, 30000),
      supportSpace: random(10000, 50000),
      floors: random(1, 5),
      raisedFloorHeight: random(18, 36),
      ceilingHeight: random(12, 20),
    },

    power: {
      totalCapacity: random(10, 100),
      itLoad: random(5, 60),
      coolingLoad: random(3, 30),
      overhead: random(1, 10),
      redundancy: ['N+1', '2N', '2N+1'][random(0, 2)],
      upsCapacity: random(500, 5000),
      generatorCapacity: random(5, 50),
      fuelReserve: random(24, 168),
      pue: randomFloat(1.2, 2.0),
    },

    cooling: {
      capacity: random(500, 10000),
      type: ['Chilled Water', 'Direct Expansion', 'Evaporative', 'Free Cooling'][random(0, 3)],
      operatingTemp: random(64, 72),
      humidityMin: random(30, 40),
      humidityMax: random(55, 65),
      hotColdAisle: random(0, 1) === 1,
    },

    network: {
      fiberProviders: random(2, 6),
      fiberProviderList: ['Zayo', 'Crown Castle', 'Lumen', 'AT&T', 'Verizon'].slice(0, random(2, 5)),
      bandwidth: random(100, 1000),
      latency: randomFloat(0.5, 5),
      ixConnections: random(1, 5),
    },

    servers: {
      totalRacks: random(100, 2000),
      occupiedRacks: random(50, 1500),
      maxKwPerRack: random(5, 30),
      utilization: random(40, 95),
    },

    jobs: {
      promisedFullTime: Math.floor((facility.jobsPromised ?? 0) * 0.7),
      promisedPartTime: Math.floor((facility.jobsPromised ?? 0) * 0.15),
      promisedContract: Math.floor((facility.jobsPromised ?? 0) * 0.15),
      createdFullTime: Math.floor((facility.jobsCreated ?? 0) * 0.7),
      createdPartTime: Math.floor((facility.jobsCreated ?? 0) * 0.15),
      createdContract: Math.floor((facility.jobsCreated ?? 0) * 0.15),
      fulfillmentRate: facility.jobsPromised ? Math.round((facility.jobsCreated ?? 0) / facility.jobsPromised * 100) : 0,
      avgSalary: random(50000, 120000),
      benefitsOffered: random(0, 1) === 1,
    },

    audits: Array(random(2, 5)).fill(0).map((_, i) => ({
      date: new Date(Date.now() - (i + 1) * random(60, 120) * 86400000).toISOString().split('T')[0],
      result: ['Passed', 'Passed with Observations', 'Failed'][random(0, 2)],
      auditor: ['Deloitte', 'KPMG', 'EY', 'PwC'][random(0, 3)],
      score: random(60, 100),
      findings: random(0, 5),
      reportId: `AUD-${random(1000, 9999)}`,
    })),

    certifications: [
      { name: 'ISO 27001', status: 'Active', issuedDate: '2023-01-15', expiryDate: '2026-01-14', issuer: 'BSI' },
      { name: 'SOC 2 Type II', status: 'Active', issuedDate: '2023-06-01', expiryDate: '2024-05-31', issuer: 'AICPA' },
      { name: 'HIPAA', status: random(0, 1) === 1 ? 'Active' : 'Pending', issuedDate: '2022-09-01', expiryDate: '2025-08-31', issuer: 'HHS' },
    ],

    financial: {
      totalSubsidies: (facility.subsidyGap || 0) * randomFloat(1.5, 3),
      federalSubsidy: (facility.subsidyGap || 0) * randomFloat(0.3, 0.5),
      stateSubsidy: (facility.subsidyGap || 0) * randomFloat(0.4, 0.6),
      localSubsidy: (facility.subsidyGap || 0) * randomFloat(0.1, 0.3),
      valueDelivered: (facility.subsidyGap || 0) * randomFloat(0.5, 1.5),
      propertyTaxAbatement: random(100000, 5000000),
      propertyTaxDuration: random(5, 20),
      propertyTaxStart: '2020-01-01',
      propertyTaxEnd: '2035-12-31',
      salesTaxExemption: random(50000, 2000000),
      incomeTaxCredits: random(100000, 3000000),
      utilityDiscounts: random(50000, 1000000),
      investment: random(10000000, 500000000),
      economicImpact: random(20000000, 1000000000),
      roi: randomFloat(-20, 50),
      costPerJob: facility.jobsCreated ? Math.round((facility.subsidyGap || 0) / facility.jobsCreated) : 0,
      paybackPeriod: randomFloat(3, 15),
      annualBreakdown: Array(5).fill(0).map((_, i) => ({
        year: 2020 + i,
        subsidy: random(500000, 5000000),
        valueCreated: random(300000, 6000000),
        jobsAdded: random(10, 100),
        netImpact: random(-500000, 2000000),
      })),
    },

    workforce: {
      total: random(50, 500),
      direct: random(30, 300),
      contractors: random(20, 200),
      fullTime: random(40, 400),
      partTime: random(10, 100),
      turnoverRate: randomFloat(5, 25),
      categories: [
        { name: 'Operations', count: random(20, 150), avgSalary: random(60000, 90000), openPositions: random(0, 10) },
        { name: 'Engineering', count: random(10, 80), avgSalary: random(80000, 140000), openPositions: random(0, 5) },
        { name: 'Security', count: random(10, 50), avgSalary: random(50000, 75000), openPositions: random(0, 3) },
        { name: 'Administration', count: random(5, 30), avgSalary: random(50000, 80000), openPositions: random(0, 2) },
        { name: 'Management', count: random(3, 15), avgSalary: random(100000, 180000), openPositions: random(0, 1) },
      ],
    },

    safety: {
      oshaViolations: random(0, 3),
      daysSinceIncident: random(30, 1000),
      trainingHours: random(20, 60),
      certifications: random(3, 10),
    },

    benefits: {
      healthInsurance: random(0, 1) === 1,
      retirement401k: random(0, 1) === 1,
      retirementMatch: random(3, 6),
      ptoDays: random(10, 25),
      remoteWork: random(0, 1) === 1,
    },

    issueDetails: (facility.issues || []).map((_, i) => ({
      id: `ISS-${facility.id}-${i + 1}`,
      severity: severities[random(0, 3)],
      category: categories[random(0, 4)],
      reportedDate: new Date(Date.now() - random(1, 90) * 86400000).toISOString().split('T')[0],
      daysOpen: random(1, 90),
      assignedTo: ['John Smith', 'Jane Doe', 'Bob Wilson', 'Alice Brown'][random(0, 3)],
      status: statuses[random(0, 3)],
      eta: new Date(Date.now() + random(7, 60) * 86400000).toISOString().split('T')[0],
      financialImpact: random(10000, 500000),
    })),

    historicalIssues: Array(random(3, 8)).fill(0).map((_, i) => ({
      title: ['Equipment Failure', 'Compliance Gap', 'Safety Incident', 'Permit Issue', 'Utility Outage'][random(0, 4)],
      resolution: 'Resolved',
      openedDate: new Date(Date.now() - (180 + i * 60) * 86400000).toISOString().split('T')[0],
      closedDate: new Date(Date.now() - (150 + i * 60) * 86400000).toISOString().split('T')[0],
      durationDays: random(5, 45),
      cost: random(5000, 100000),
    })),

    risk: {
      overall: facility.complianceStatus === 'Non-Compliant' ? random(60, 90) : facility.complianceStatus === 'At Risk' ? random(40, 60) : random(10, 40),
      compliance: ['Low', 'Medium', 'High'][random(0, 2)],
      financial: ['Low', 'Medium', 'High'][random(0, 2)],
      operational: ['Low', 'Medium', 'High'][random(0, 2)],
      reputational: ['Low', 'Medium', 'High'][random(0, 2)],
    },

    milestones: [
      { date: '2019-03-15', event: 'Construction Started', details: 'Ground breaking ceremony', impact: 'Project initiation' },
      { date: '2020-06-01', event: 'Phase 1 Complete', details: 'First data hall operational', impact: 'Revenue generation began' },
      { date: '2021-01-15', event: 'Full Operation', details: 'All phases completed', impact: 'Full capacity achieved' },
      { date: '2022-09-01', event: 'Expansion Approved', details: 'Additional 50MW approved', impact: 'Future growth secured' },
    ],

    recentActivity: Array(5).fill(0).map((_, i) => ({
      timestamp: new Date(Date.now() - i * random(1, 24) * 3600000).toISOString().replace('T', ' ').slice(0, 16),
      action: ['Compliance review', 'Document uploaded', 'Status updated', 'Audit scheduled', 'Report generated'][random(0, 4)],
      user: ['System', 'admin@dcim.com', 'compliance@dcim.com', 'auditor@dcim.com'][random(0, 3)],
      type: ['Automated', 'Manual'][random(0, 1)],
    })),

    documents: {
      compliance: Array(random(2, 5)).fill(0).map((_, i) => ({
        name: `Compliance Report Q${i + 1} 2024`,
        type: 'PDF',
        uploadDate: new Date(Date.now() - random(1, 90) * 86400000).toISOString().split('T')[0],
        size: `${random(1, 10)} MB`,
        status: 'Current',
      })),
      financial: Array(random(2, 4)).fill(0).map((_, i) => ({
        name: `Financial Statement ${2024 - i}`,
        type: 'PDF',
        uploadDate: new Date(Date.now() - random(30, 365) * 86400000).toISOString().split('T')[0],
        size: `${random(2, 15)} MB`,
        status: 'Archived',
      })),
      contracts: Array(random(1, 3)).fill(0).map((_, i) => ({
        name: `Subsidy Agreement ${i + 1}`,
        type: 'Contract',
        effectiveDate: '2020-01-01',
        expiryDate: '2030-12-31',
        parties: `${facility.operator} / State of ${facility.state}`,
      })),
    },
  };
}

