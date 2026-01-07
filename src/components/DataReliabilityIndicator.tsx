/**
 * Data Reliability Indicator
 * 
 * Shows users exactly what data is real vs synthetic
 * Critical for a labor organizing tool - we can't spread misinformation
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  XCircle, 
  Info,
  ChevronDown,
  ChevronUp,
  Shield,
  Database,
  Globe,
  Users,
  FileText
} from 'lucide-react';

interface DataSourceInfo {
  name: string;
  reliability: 'verified' | 'partial' | 'synthetic' | 'demo';
  percentage: number;
  source: string;
  canCite: boolean;
  details: string;
  icon: React.ReactNode;
}

const DATA_SOURCES: DataSourceInfo[] = [
  {
    name: 'Good Jobs First Subsidies',
    reliability: 'verified',
    percentage: 100,
    source: 'goodjobsfirst.org - manually verified',
    canCite: true,
    details: 'Real documented subsidy deals from GJF research. Apple NC ($6.4M/job), Switch NV, Meta NM, etc.',
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  },
  {
    name: 'Union Jurisdiction Data',
    reliability: 'verified',
    percentage: 90,
    source: 'OLMS + union directories',
    canCite: true,
    details: 'IBEW, SMART, UA, IUOE, CWA local numbers and jurisdictions for major data center corridors.',
    icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
  },
  {
    name: 'labordata NLRB Cases',
    reliability: 'partial',
    percentage: 70,
    source: 'github.com/labordata (infrastructure ready)',
    canCite: true,
    details: 'Points to real NLRB data. Pipeline built but not actively fetching yet.',
    icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  },
  {
    name: 'Census Bureau Demographics',
    reliability: 'partial',
    percentage: 70,
    source: 'census.gov API',
    canCite: true,
    details: 'Real API integration, works when online. County demographics, income data.',
    icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  },
  {
    name: 'EPA/OSHA Data',
    reliability: 'partial',
    percentage: 30,
    source: 'CORS blocked - falls back to samples',
    canCite: false,
    details: 'Real APIs exist but browser security blocks direct access. Shows sample data.',
    icon: <AlertTriangle className="w-4 h-4 text-yellow-500" />,
  },
  {
    name: '11,992 Facility Records',
    reliability: 'synthetic',
    percentage: 0,
    source: 'generateFacility() algorithm',
    canCite: false,
    details: 'GENERATED DATA. Real operator names + real cities, but compliance status, subsidy gaps, and specific facilities are randomly generated.',
    icon: <XCircle className="w-4 h-4 text-red-500" />,
  },
  {
    name: 'Compliance Status/Subsidy Gaps',
    reliability: 'synthetic',
    percentage: 0,
    source: 'Random assignment in seed script',
    canCite: false,
    details: 'NOT REAL. Compliance status and dollar amounts are randomly calculated, not from any real audit.',
    icon: <XCircle className="w-4 h-4 text-red-500" />,
  },
  {
    name: 'Proximity Locator',
    reliability: 'demo',
    percentage: 0,
    source: 'Simulated for demonstration',
    canCite: false,
    details: 'DEMO ONLY. Facilities, violations, union activity are all simulated for demonstration purposes.',
    icon: <XCircle className="w-4 h-4 text-red-500" />,
  },
  {
    name: 'Worker Feedback (Glassdoor/etc)',
    reliability: 'demo',
    percentage: 0,
    source: 'Randomly generated',
    canCite: false,
    details: 'FAKE DATA. Ratings, reviews, sentiment are all randomly generated. Not from real workers.',
    icon: <XCircle className="w-4 h-4 text-red-500" />,
  },
];

const RELIABILITY_COLORS = {
  verified: 'bg-green-500',
  partial: 'bg-yellow-500',
  synthetic: 'bg-red-500',
  demo: 'bg-red-400',
};

const RELIABILITY_LABELS = {
  verified: 'Verified',
  partial: 'Partial',
  synthetic: 'Synthetic',
  demo: 'Demo Only',
};

interface DataReliabilityIndicatorProps {
  compact?: boolean;
}

export const DataReliabilityIndicator: React.FC<DataReliabilityIndicatorProps> = ({ compact = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [selectedSource, setSelectedSource] = useState<DataSourceInfo | null>(null);

  const verifiedCount = DATA_SOURCES.filter(d => d.reliability === 'verified').length;
  const partialCount = DATA_SOURCES.filter(d => d.reliability === 'partial').length;
  const syntheticCount = DATA_SOURCES.filter(d => d.reliability === 'synthetic' || d.reliability === 'demo').length;

  const overallReliability = Math.round(
    (DATA_SOURCES.reduce((sum, d) => sum + d.percentage, 0) / DATA_SOURCES.length)
  );

  if (compact) {
    return (
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-yellow-700 hover:bg-yellow-500/20 transition-colors"
      >
        <AlertTriangle className="w-4 h-4" />
        <span className="text-sm font-medium">Data: {overallReliability}% Verified</span>
        <Info className="w-3 h-3" />
      </button>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-yellow-500/20 rounded-lg">
            <Shield className="w-5 h-5 text-yellow-400" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-white">Data Reliability Audit</h3>
            <p className="text-sm text-slate-400">
              {verifiedCount} verified • {partialCount} partial • {syntheticCount} synthetic
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-2xl font-bold text-yellow-400">{overallReliability}%</div>
            <div className="text-xs text-slate-400">Overall</div>
          </div>
          {expanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Reliability Bar */}
      <div className="px-4 pb-4">
        <div className="flex rounded-full overflow-hidden h-2 bg-slate-700">
          <div 
            className="bg-green-500 transition-all"
            style={{ width: `${(verifiedCount / DATA_SOURCES.length) * 100}%` }}
          />
          <div 
            className="bg-yellow-500 transition-all"
            style={{ width: `${(partialCount / DATA_SOURCES.length) * 100}%` }}
          />
          <div 
            className="bg-red-500 transition-all"
            style={{ width: `${(syntheticCount / DATA_SOURCES.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-xs text-slate-400">
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" /> Verified
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500" /> Partial
          </span>
          <span className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" /> Synthetic
          </span>
        </div>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-700">
          {/* Warning Banner */}
          <div className="bg-red-500/10 border-b border-red-500/30 p-4">
            <div className="flex gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-300">Important: Not All Data Is Real</h4>
                <p className="text-sm text-red-200/80 mt-1">
                  Some data in this app is synthetic/demo. Before citing any statistic in organizing 
                  materials, legal filings, or public communications, check the reliability score below.
                </p>
              </div>
            </div>
          </div>

          {/* Data Sources List */}
          <div className="divide-y divide-slate-700">
            {DATA_SOURCES.map((source, idx) => (
              <div
                key={idx}
                className={`p-4 hover:bg-slate-800/50 cursor-pointer transition-colors ${
                  selectedSource?.name === source.name ? 'bg-slate-800' : ''
                }`}
                onClick={() => setSelectedSource(selectedSource?.name === source.name ? null : source)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {source.icon}
                    <div>
                      <div className="font-medium text-white">{source.name}</div>
                      <div className="text-xs text-slate-400">{source.source}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      source.reliability === 'verified' ? 'bg-green-500/20 text-green-400' :
                      source.reliability === 'partial' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-red-500/20 text-red-400'
                    }`}>
                      {source.percentage}%
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      source.canCite 
                        ? 'bg-green-500/20 text-green-400' 
                        : 'bg-red-500/20 text-red-400'
                    }`}>
                      {source.canCite ? '✓ Citable' : '✗ Not Citable'}
                    </span>
                  </div>
                </div>
                
                {selectedSource?.name === source.name && (
                  <div className="mt-3 p-3 bg-slate-700/50 rounded-lg text-sm text-slate-300">
                    {source.details}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* What You CAN Cite */}
          <div className="border-t border-slate-700 p-4 bg-green-500/5">
            <h4 className="font-semibold text-green-400 flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4" />
              What You CAN Cite (Verified)
            </h4>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>• <strong>Apple NC:</strong> $321M subsidy for 50 jobs ($6.4M/job) - GJF verified</li>
              <li>• <strong>Switch NV:</strong> $89M for 1,000 jobs, only 26 created - GJF verified</li>
              <li>• <strong>Data centers:</strong> $1.95M+ average subsidy per job - GJF research</li>
              <li>• <strong>Amazon:</strong> $11.6B+ total documented subsidies - GJF Amazon Tracker</li>
              <li>• <strong>Union jurisdictions:</strong> IBEW, SMART locals by county - OLMS data</li>
            </ul>
          </div>

          {/* What You CANNOT Cite */}
          <div className="border-t border-slate-700 p-4 bg-red-500/5">
            <h4 className="font-semibold text-red-400 flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4" />
              What You CANNOT Cite (Synthetic)
            </h4>
            <ul className="text-sm text-slate-300 space-y-2">
              <li>• "11,992 facilities tracked" - synthetic count</li>
              <li>• "$4.75B subsidy gap" - calculated from fake data</li>
              <li>• "3,251 non-compliant facilities" - randomly assigned</li>
              <li>• Any specific facility's compliance status</li>
              <li>• Any worker ratings or feedback</li>
              <li>• Any "nearby facilities" from Proximity Locator</li>
            </ul>
          </div>

          {/* Documentation Link */}
          <div className="border-t border-slate-700 p-4 text-center">
            <a 
              href="/docs/DATA_RELIABILITY_AUDIT.md"
              className="text-sm text-blue-400 hover:text-blue-300"
            >
              View Full Data Reliability Audit →
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Compact badge for inline use
 */
export const DataReliabilityBadge: React.FC<{
  reliability: 'verified' | 'partial' | 'synthetic' | 'demo';
  label?: string;
}> = ({ reliability, label }) => {
  const config = {
    verified: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle2 },
    partial: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: AlertTriangle },
    synthetic: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
    demo: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
  };

  const { color, icon: Icon } = config[reliability];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs ${color}`}>
      <Icon className="w-3 h-3" />
      {label || RELIABILITY_LABELS[reliability]}
    </span>
  );
};

export default DataReliabilityIndicator;

