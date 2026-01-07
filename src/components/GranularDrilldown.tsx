/**
 * Granular Detail Drilldown Component
 * 
 * Progressive disclosure system allowing infinite expansion
 * to reveal increasingly detailed facility information.
 * 
 * Levels:
 * 1. Overview (basic stats)
 * 2. Compliance Details (job metrics, subsidies)
 * 3. Infrastructure Details (technical specs)
 * 4. Network Intelligence (DNS, IPs, ASN)
 * 5. Security Posture (vulnerabilities, certificates)
 * 6. Expansion Timeline (historical changes)
 * 7. Raw Data (JSON export)
 */

import React, { useState } from 'react';
import { 
  ChevronRight, 
  ChevronDown, 
  Building, 
  DollarSign, 
  Users, 
  Server,
  Network,
  Shield,
  TrendingUp,
  FileJson,
  Info,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import type { Facility } from '../types';

interface DrilldownLevel {
  id: string;
  title: string;
  icon: React.ElementType;
  depth: number;
  children?: DrilldownLevel[];
}

interface GranularDrilldownProps {
  facility: Facility;
  className?: string;
}

export const GranularDrilldown: React.FC<GranularDrilldownProps> = ({ facility, className = '' }) => {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['overview']));

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const isExpanded = (id: string) => expanded.has(id);

  // Calculate indentation based on depth
  const getIndent = (depth: number) => depth * 16;

  return (
    <div className={`bg-slate-900 border border-slate-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-slate-800/50 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-400" />
          <h3 className="text-sm font-bold text-white">See All Details</h3>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Click any section to expand and reveal deeper details
        </p>
      </div>

      {/* Expandable Tree */}
      <div className="p-4 space-y-1 max-h-96 overflow-y-auto">
        {/* Level 1: Overview */}
        <DrilldownSection
          id="overview"
          title="📊 Overview"
          depth={0}
          isExpanded={isExpanded('overview')}
          onToggle={() => toggleExpand('overview')}
        >
          <div className="space-y-2 mt-2">
            <DetailRow label="Facility Name" value={facility.name} />
            <DetailRow label="Location" value={`${facility.city}, ${facility.state}`} />
            <DetailRow label="Operator" value={facility.operator} />
            <DetailRow 
              label="Compliance Status" 
              value={facility.complianceStatus}
              valueColor={
                facility.complianceStatus === 'Compliant' ? 'text-green-400' :
                facility.complianceStatus === 'Non-Compliant' ? 'text-red-400' :
                'text-yellow-400'
              }
            />
          </div>

          {/* Level 2: Compliance Breakdown */}
          <DrilldownSection
            id="compliance"
            title="💼 Compliance Breakdown"
            depth={1}
            isExpanded={isExpanded('compliance')}
            onToggle={() => toggleExpand('compliance')}
          >
            <div className="space-y-2 mt-2">
              <DetailRow 
                label="Jobs Promised" 
                value={facility.jobsPromised?.toLocaleString() || 'N/A'}
              />
              <DetailRow 
                label="Jobs Created" 
                value={facility.jobsCreated?.toLocaleString() || 'N/A'}
              />
              <DetailRow 
                label="Job Gap" 
                value={((facility.jobsPromised || 0) - (facility.jobsCreated || 0)).toLocaleString()}
                valueColor="text-red-400"
              />
              <DetailRow 
                label="Subsidy Gap" 
                value={`$${(facility.subsidyGap / 1e6).toFixed(2)}M`}
                valueColor="text-red-400"
              />

              {/* Level 3: Financial Details */}
              <DrilldownSection
                id="financial"
                title="💰 Financial Details"
                depth={2}
                isExpanded={isExpanded('financial')}
                onToggle={() => toggleExpand('financial')}
              >
                <div className="space-y-2 mt-2">
                  <DetailRow 
                    label="Subsidy Gap (Exact)" 
                    value={`$${facility.subsidyGap.toLocaleString()}`}
                  />
                  <DetailRow 
                    label="Per Job Gap" 
                    value={`$${Math.round(facility.subsidyGap / Math.max(facility.jobsCreated || 1, 1)).toLocaleString()}`}
                  />
                  <DetailRow 
                    label="Compliance %" 
                    value={`${Math.round(((facility.jobsCreated || 0) / Math.max(facility.jobsPromised || 1, 1)) * 100)}%`}
                  />
                  <DetailRow 
                    label="Status" 
                    value={facility.subsidyGap > 1000000 ? 'Major Violation' : facility.subsidyGap > 100000 ? 'Violation' : 'Minor Gap'}
                    valueColor={facility.subsidyGap > 1000000 ? 'text-red-400' : facility.subsidyGap > 100000 ? 'text-orange-400' : 'text-yellow-400'}
                  />
                </div>
              </DrilldownSection>
            </div>
          </DrilldownSection>

          {/* Level 2: Infrastructure Details */}
          <DrilldownSection
            id="infrastructure"
            title="🏗️ Infrastructure"
            depth={1}
            isExpanded={isExpanded('infrastructure')}
            onToggle={() => toggleExpand('infrastructure')}
          >
            <div className="space-y-2 mt-2">
              <DetailRow label="Facility Type" value={facility.type} />
              <DetailRow label="Provider" value={facility.operator} />
              <DetailRow label="Latitude" value={(facility.latitude ?? 0).toFixed(6)} />
              <DetailRow label="Longitude" value={(facility.longitude ?? 0).toFixed(6)} />

              {/* Level 3: Geographic Details */}
              <DrilldownSection
                id="geographic"
                title="🗺️ Geographic Details"
                depth={2}
                isExpanded={isExpanded('geographic')}
                onToggle={() => toggleExpand('geographic')}
              >
                <div className="space-y-2 mt-2">
                  <DetailRow label="Country" value={facility.country} />
                  <DetailRow label="State/Province" value={facility.state} />
                  <DetailRow label="City" value={facility.city} />
                  <DetailRow label="Postal Code" value={facility.address || 'N/A'} />
                  <DetailRow label="Metro Area" value={facility.city || 'N/A'} />
                  <DetailRow label="Coordinates" value={`${facility.latitude ?? 0}, ${facility.longitude ?? 0}`} />
                  
                  {/* Level 4: Coordinate System Details */}
                  <DrilldownSection
                    id="coords"
                    title="📍 Coordinate System"
                    depth={3}
                    isExpanded={isExpanded('coords')}
                    onToggle={() => toggleExpand('coords')}
                  >
                    <div className="space-y-2 mt-2">
                      <DetailRow label="Format" value="Decimal Degrees (DD)" />
                      <DetailRow label="Datum" value="WGS84" />
                      <DetailRow label="Latitude (N)" value={`${(facility.latitude ?? 0).toFixed(8)}°`} />
                      <DetailRow label="Longitude (W)" value={`${(facility.longitude ?? 0).toFixed(8)}°`} />
                      <DetailRow 
                        label="DMS Lat" 
                        value={convertToDMS(facility.latitude ?? 0, true)}
                      />
                      <DetailRow 
                        label="DMS Lng" 
                        value={convertToDMS(facility.longitude ?? 0, false)}
                      />
                    </div>
                  </DrilldownSection>
                </div>
              </DrilldownSection>

              {/* Level 3: Technical Specs */}
              <DrilldownSection
                id="technical"
                title="⚙️ Technical Specifications"
                depth={2}
                isExpanded={isExpanded('technical')}
                onToggle={() => toggleExpand('technical')}
              >
                <div className="space-y-2 mt-2">
                  <DetailRow label="Facility ID" value={facility.id} />
                  <DetailRow label="Power Capacity" value={facility.powerCapacityMW ? `${facility.powerCapacityMW} MW` : 'N/A'} />
                  <DetailRow label="Year Established" value={facility.yearEstablished?.toString() || 'N/A'} />
                  <DetailRow label="Tax Incentives" value={facility.taxIncentives ? `$${facility.taxIncentives.toLocaleString()}` : 'N/A'} />
                  <DetailRow label="Compliance Status" value={facility.complianceStatus || 'Unknown'} />
                </div>
              </DrilldownSection>
            </div>
          </DrilldownSection>

          {/* Level 2: Raw JSON Export */}
          <DrilldownSection
            id="raw"
            title="📄 Raw Data (JSON)"
            depth={1}
            isExpanded={isExpanded('raw')}
            onToggle={() => toggleExpand('raw')}
          >
            <div className="mt-2">
              <pre className="text-xs text-slate-300 bg-slate-950 p-3 rounded border border-slate-700 overflow-x-auto">
                {JSON.stringify(facility, null, 2)}
              </pre>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(facility, null, 2));
                  alert('JSON copied to clipboard!');
                }}
                className="mt-2 px-3 py-1.5 text-xs bg-blue-500/20 border border-blue-500/50 rounded hover:bg-blue-500/30 transition-colors text-blue-300"
              >
                📋 Copy to Clipboard
              </button>
            </div>
          </DrilldownSection>
        </DrilldownSection>
      </div>
    </div>
  );
};

// Helper component for drilldown sections
interface DrilldownSectionProps {
  id: string;
  title: string;
  depth: number;
  isExpanded: boolean;
  onToggle: () => void;
  children?: React.ReactNode;
}

const DrilldownSection: React.FC<DrilldownSectionProps> = ({
  title,
  depth,
  isExpanded,
  onToggle,
  children,
}) => {
  const indent = depth * 16;

  return (
    <div className="select-none">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 py-2 px-2 rounded hover:bg-slate-800/50 transition-colors text-left group"
        style={{ paddingLeft: `${indent + 8}px` }}
      >
        {isExpanded ? (
          <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
        )}
        <span className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
          {title}
        </span>
      </button>
      
      {isExpanded && (
        <div style={{ paddingLeft: `${indent + 24}px` }}>
          {children}
        </div>
      )}
    </div>
  );
};

// Helper component for detail rows
interface DetailRowProps {
  label: string;
  value: string | number;
  valueColor?: string;
}

const DetailRow: React.FC<DetailRowProps> = ({ label, value, valueColor = 'text-slate-300' }) => {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5 px-2 rounded hover:bg-slate-800/30">
      <span className="text-xs text-slate-400 flex-shrink-0">{label}:</span>
      <span className={`text-xs font-medium ${valueColor} text-right break-words`}>
        {value}
      </span>
    </div>
  );
};

// Helper function to convert decimal degrees to DMS
function convertToDMS(decimal: number, isLatitude: boolean): string {
  const absolute = Math.abs(decimal);
  const degrees = Math.floor(absolute);
  const minutesDecimal = (absolute - degrees) * 60;
  const minutes = Math.floor(minutesDecimal);
  const seconds = ((minutesDecimal - minutes) * 60).toFixed(2);
  
  const direction = isLatitude 
    ? (decimal >= 0 ? 'N' : 'S')
    : (decimal >= 0 ? 'E' : 'W');
  
  return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
}

export default GranularDrilldown;

