/**
 * DataSovereigntyHub.tsx
 * 
 * Inspired by Cory Doctorow's 39C3 talk on adversarial interoperability
 * and building an enshittification-resistant internet.
 * 
 * @see https://archive.org/details/doctorow-39c3
 * 
 * Core Principles:
 * 1. Data Sovereignty - You own your data, not Big Tech
 * 2. Adversarial Interoperability - Tools to break free from platform lock-in
 * 3. Decentralization - No single point of failure or control
 * 4. Enshittification Resistance - Design against platform degradation
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Shield, Download, Upload, Share2, Lock, Unlock, Database, Globe,
  Server, Cloud, CloudOff, Key, FileJson, FileText, Code, GitBranch,
  Users, Zap, AlertTriangle, CheckCircle, ExternalLink, Copy, Check,
  Layers, Network, HardDrive, Wifi, WifiOff, RefreshCw, Terminal,
  Eye, EyeOff, Fingerprint, Hash, Link2, Unlink, Activity, Cpu,
  ChevronDown, ChevronUp, ChevronRight, Info, Sparkles, Heart
} from 'lucide-react';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface DataExportFormat {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  interoperable: boolean;
  decentralized: boolean;
}

interface InteroperabilityTool {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'available' | 'coming-soon';
  category: 'scraper' | 'api' | 'bridge' | 'export' | 'import';
  adversarial: boolean;
}

interface DecentralizationOption {
  id: string;
  name: string;
  description: string;
  protocol: string;
  status: 'connected' | 'available' | 'offline';
  sovereignty: number; // 0-100 data sovereignty score
}

interface EnshittificationMetric {
  platform: string;
  score: number; // 0-100, higher = more enshittified
  trend: 'improving' | 'stable' | 'degrading';
  lastIncident: string;
  incidents: number;
}

// ============================================================================
// DATA
// ============================================================================

const EXPORT_FORMATS: DataExportFormat[] = [
  {
    id: 'json-ld',
    name: 'JSON-LD',
    description: 'Linked Data for semantic interoperability',
    icon: <FileJson size={16} />,
    interoperable: true,
    decentralized: true
  },
  {
    id: 'csv',
    name: 'CSV',
    description: 'Universal spreadsheet format',
    icon: <FileText size={16} />,
    interoperable: true,
    decentralized: false
  },
  {
    id: 'rdf',
    name: 'RDF/XML',
    description: 'W3C Resource Description Framework',
    icon: <Code size={16} />,
    interoperable: true,
    decentralized: true
  },
  {
    id: 'sqlite',
    name: 'SQLite',
    description: 'Portable local database',
    icon: <Database size={16} />,
    interoperable: true,
    decentralized: true
  },
  {
    id: 'ipfs',
    name: 'IPFS Bundle',
    description: 'Content-addressed decentralized storage',
    icon: <Globe size={16} />,
    interoperable: true,
    decentralized: true
  }
];

const INTEROP_TOOLS: InteroperabilityTool[] = [
  {
    id: 'sec-scraper',
    name: 'SEC Filing Scraper',
    description: 'Extract Big Tech subsidy disclosures from SEC EDGAR',
    status: 'active',
    category: 'scraper',
    adversarial: true
  },
  {
    id: 'epa-bridge',
    name: 'EPA Data Bridge',
    description: 'Import environmental compliance data',
    status: 'active',
    category: 'bridge',
    adversarial: false
  },
  {
    id: 'bls-connector',
    name: 'BLS Jobs API',
    description: 'Bureau of Labor Statistics employment data',
    status: 'available',
    category: 'api',
    adversarial: false
  },
  {
    id: 'linkedin-alt',
    name: 'LinkedIn Alt-Client',
    description: 'Track actual hiring vs promises (adversarial)',
    status: 'coming-soon',
    category: 'scraper',
    adversarial: true
  },
  {
    id: 'glassdoor-import',
    name: 'Glassdoor Import',
    description: 'Worker reviews and wage data',
    status: 'coming-soon',
    category: 'import',
    adversarial: true
  },
  {
    id: 'activitypub',
    name: 'ActivityPub Federation',
    description: 'Share findings across federated instances',
    status: 'available',
    category: 'bridge',
    adversarial: false
  }
];

const DECENTRALIZATION_OPTIONS: DecentralizationOption[] = [
  {
    id: 'local-first',
    name: 'Local-First Storage',
    description: 'All data stored locally in IndexedDB',
    protocol: 'IndexedDB + CRDTs',
    status: 'connected',
    sovereignty: 100
  },
  {
    id: 'ipfs',
    name: 'IPFS Network',
    description: 'Distributed content-addressed storage',
    protocol: 'IPFS / Helia',
    status: 'available',
    sovereignty: 95
  },
  {
    id: 'nostr',
    name: 'Nostr Relays',
    description: 'Censorship-resistant event publishing',
    protocol: 'NIP-01',
    status: 'available',
    sovereignty: 90
  },
  {
    id: 'solid',
    name: 'Solid Pods',
    description: 'Tim Berners-Lee\'s decentralized data pods',
    protocol: 'Solid Protocol',
    status: 'available',
    sovereignty: 95
  },
  {
    id: 'p2p-sync',
    name: 'Peer-to-Peer Sync',
    description: 'Direct sync between organizer devices',
    protocol: 'WebRTC + Y.js',
    status: 'offline',
    sovereignty: 100
  }
];

const ENSHITTIFICATION_METRICS: EnshittificationMetric[] = [
  { platform: 'Meta/Facebook', score: 87, trend: 'degrading', lastIncident: '2026-01-02', incidents: 147 },
  { platform: 'X/Twitter', score: 94, trend: 'degrading', lastIncident: '2026-01-03', incidents: 203 },
  { platform: 'Google', score: 72, trend: 'degrading', lastIncident: '2025-12-28', incidents: 89 },
  { platform: 'Amazon', score: 68, trend: 'stable', lastIncident: '2025-12-15', incidents: 56 },
  { platform: 'Microsoft', score: 61, trend: 'stable', lastIncident: '2025-11-30', incidents: 42 },
  { platform: 'Apple', score: 58, trend: 'improving', lastIncident: '2025-10-22', incidents: 31 },
];

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const SovereigntyScore: React.FC<{ score: number }> = ({ score }) => {
  const getColor = (s: number) => {
    if (s >= 90) return 'text-emerald-600 bg-emerald-50';
    if (s >= 70) return 'text-blue-600 bg-blue-50';
    if (s >= 50) return 'text-amber-600 bg-amber-50';
    return 'text-rose-600 bg-rose-50';
  };

  return (
    <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold ${getColor(score)}`}>
      <Shield size={10} />
      {score}%
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    'connected': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'active': 'bg-emerald-100 text-emerald-700 border-emerald-200',
    'available': 'bg-blue-100 text-blue-700 border-blue-200',
    'coming-soon': 'bg-slate-100 text-slate-600 border-slate-200',
    'offline': 'bg-slate-100 text-slate-500 border-slate-200'
  };

  return (
    <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full border ${styles[status] || styles.available}`}>
      {status.replace('-', ' ').toUpperCase()}
    </span>
  );
};

const EnshittificationBar: React.FC<{ score: number; trend: string }> = ({ score, trend }) => {
  const getColor = (s: number) => {
    if (s >= 80) return 'bg-rose-500';
    if (s >= 60) return 'bg-amber-500';
    if (s >= 40) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  const trendIcon = trend === 'degrading' ? '📉' : trend === 'improving' ? '📈' : '➡️';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div 
          className={`h-full ${getColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono">{score}</span>
      <span className="text-sm">{trendIcon}</span>
    </div>
  );
};

interface ExpandableSectionProps {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const ExpandableSection: React.FC<ExpandableSectionProps> = ({
  title, icon, badge, defaultOpen = false, children
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
            {icon}
          </div>
          <span className="font-semibold text-slate-800">{title}</span>
          {badge}
        </div>
        {isOpen ? <ChevronUp size={20} className="text-slate-400" /> : <ChevronDown size={20} className="text-slate-400" />}
      </button>
      {isOpen && (
        <div className="p-4 border-t border-slate-200 bg-slate-50">
          {children}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const DataSovereigntyHub: React.FC = () => {
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedExports, setSelectedExports] = useState<Set<string>>(new Set(['json-ld', 'csv']));
  const [isExporting, setIsExporting] = useState(false);
  const [localDataSize, setLocalDataSize] = useState('127.4 MB');
  const [lastSync, setLastSync] = useState(new Date());

  const copyToClipboard = useCallback((text: string, id: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  }, []);

  const toggleExportFormat = (formatId: string) => {
    setSelectedExports(prev => {
      const next = new Set(prev);
      if (next.has(formatId)) {
        next.delete(formatId);
      } else {
        next.add(formatId);
      }
      return next;
    });
  };

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    // Simulate export
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsExporting(false);
    alert(`Exported data in ${selectedExports.size} formats: ${Array.from(selectedExports).join(', ')}`);
  }, [selectedExports]);

  // Calculate overall sovereignty score
  const overallSovereignty = Math.round(
    DECENTRALIZATION_OPTIONS
      .filter(o => o.status === 'connected')
      .reduce((acc, o) => acc + o.sovereignty, 0) / 
    Math.max(1, DECENTRALIZATION_OPTIONS.filter(o => o.status === 'connected').length)
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield size={24} />
              <h1 className="text-2xl font-bold">Data Sovereignty Hub</h1>
            </div>
            <p className="text-white/80 max-w-2xl text-sm">
              Inspired by <a href="https://archive.org/details/doctorow-39c3" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">
                Cory Doctorow's 39C3 talk
              </a> on building an enshittification-resistant internet. 
              <strong className="text-white"> Your data. Your rules. Your fight.</strong>
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold">{overallSovereignty}%</div>
            <div className="text-white/70 text-xs">Data Sovereignty Score</div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <HardDrive size={12} />
              Local Data
            </div>
            <div className="text-xl font-bold">{localDataSize}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <CloudOff size={12} />
              Cloud-Free
            </div>
            <div className="text-xl font-bold">100%</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <Zap size={12} />
              Interop Tools
            </div>
            <div className="text-xl font-bold">{INTEROP_TOOLS.filter(t => t.status === 'active').length} Active</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-white/70 text-xs mb-1">
              <RefreshCw size={12} />
              Last Sync
            </div>
            <div className="text-xl font-bold">{lastSync.toLocaleTimeString()}</div>
          </div>
        </div>
      </div>

      {/* Doctorow Quote Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-amber-100 rounded-lg">
            <Sparkles size={20} className="text-amber-600" />
          </div>
          <div>
            <p className="text-amber-900 italic text-sm">
              "Enshittification wasn't an accident. It also wasn't inevitable... Enshittification was a choice: 
              named individuals, in living memory, enacted policies that created the enshittogenic environment."
            </p>
            <p className="text-amber-700 text-xs mt-2 font-semibold">
              — Cory Doctorow, 39C3 (December 2025)
            </p>
          </div>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Data Export */}
        <ExpandableSection
          title="Data Export & Portability"
          icon={<Download size={18} />}
          badge={<span className="text-xs text-slate-500">{selectedExports.size} formats selected</span>}
          defaultOpen={true}
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-600 mb-3">
              Export your facility data in interoperable formats. <strong>No lock-in. No hostages.</strong>
            </p>
            
            {EXPORT_FORMATS.map(format => (
              <label
                key={format.id}
                className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedExports.has(format.id)
                    ? 'bg-blue-50 border-blue-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedExports.has(format.id)}
                    onChange={() => toggleExportFormat(format.id)}
                    className="w-4 h-4 text-blue-600 rounded"
                  />
                  <div className="p-1.5 rounded bg-slate-100">
                    {format.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm text-slate-800">{format.name}</div>
                    <div className="text-xs text-slate-500">{format.description}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {format.interoperable && (
                    <span className="px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-700 rounded-full">
                      Interoperable
                    </span>
                  )}
                  {format.decentralized && (
                    <span className="px-2 py-0.5 text-[10px] bg-purple-100 text-purple-700 rounded-full">
                      Decentralized
                    </span>
                  )}
                </div>
              </label>
            ))}

            <button
              onClick={handleExport}
              disabled={selectedExports.size === 0 || isExporting}
              className="w-full mt-4 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold flex items-center justify-center gap-2 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isExporting ? (
                <>
                  <RefreshCw size={16} className="animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download size={16} />
                  Export All Facility Data
                </>
              )}
            </button>
          </div>
        </ExpandableSection>

        {/* Adversarial Interoperability */}
        <ExpandableSection
          title="Adversarial Interoperability"
          icon={<Zap size={18} />}
          badge={
            <span className="px-2 py-0.5 text-[10px] bg-rose-100 text-rose-700 rounded-full font-semibold">
              🔓 Break Free
            </span>
          }
          defaultOpen={true}
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-600 mb-3">
              Tools to extract, scrape, and liberate data from Big Tech platforms. 
              <strong className="text-rose-600"> "Felony contempt of business-model"</strong> tools.
            </p>

            {INTEROP_TOOLS.map(tool => (
              <div
                key={tool.id}
                className={`p-3 rounded-lg border ${
                  tool.status === 'active' ? 'bg-emerald-50 border-emerald-200' :
                  tool.status === 'available' ? 'bg-white border-slate-200' :
                  'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-800">{tool.name}</span>
                      {tool.adversarial && (
                        <span className="px-1.5 py-0.5 text-[9px] bg-rose-100 text-rose-700 rounded font-bold">
                          ⚡ ADVERSARIAL
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{tool.description}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <StatusBadge status={tool.status} />
                    <span className="text-[10px] text-slate-400 capitalize">{tool.category}</span>
                  </div>
                </div>
                {tool.status === 'active' && (
                  <button className="mt-2 w-full py-1.5 text-xs font-medium text-emerald-700 bg-emerald-100 rounded-lg hover:bg-emerald-200 transition-colors">
                    Run Scraper →
                  </button>
                )}
                {tool.status === 'available' && (
                  <button className="mt-2 w-full py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
                    Enable Tool →
                  </button>
                )}
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* Decentralization Options */}
        <ExpandableSection
          title="Decentralized Storage"
          icon={<Network size={18} />}
          badge={<SovereigntyScore score={overallSovereignty} />}
          defaultOpen={true}
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-600 mb-3">
              Store your data across decentralized networks. <strong>No single point of failure. No corporate control.</strong>
            </p>

            {DECENTRALIZATION_OPTIONS.map(option => (
              <div
                key={option.id}
                className={`p-3 rounded-lg border ${
                  option.status === 'connected' ? 'bg-emerald-50 border-emerald-200' :
                  option.status === 'available' ? 'bg-white border-slate-200' :
                  'bg-slate-50 border-slate-200 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm text-slate-800">{option.name}</span>
                      <SovereigntyScore score={option.sovereignty} />
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">{option.protocol}</p>
                  </div>
                  <StatusBadge status={option.status} />
                </div>
                {option.status === 'connected' && (
                  <div className="mt-2 flex items-center gap-2 text-emerald-600">
                    <CheckCircle size={12} />
                    <span className="text-xs font-medium">Connected & Syncing</span>
                  </div>
                )}
                {option.status === 'available' && (
                  <button className="mt-2 w-full py-1.5 text-xs font-medium text-blue-700 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
                    Connect →
                  </button>
                )}
              </div>
            ))}
          </div>
        </ExpandableSection>

        {/* Enshittification Tracker */}
        <ExpandableSection
          title="Enshittification Tracker"
          icon={<AlertTriangle size={18} />}
          badge={
            <span className="px-2 py-0.5 text-[10px] bg-rose-100 text-rose-700 rounded-full font-semibold">
              📉 Tracking
            </span>
          }
          defaultOpen={true}
        >
          <div className="space-y-3">
            <p className="text-xs text-slate-600 mb-3">
              Monitor Big Tech platforms for <strong className="text-rose-600">enshittification</strong> — 
              the process of platform degradation for profit extraction.
            </p>

            {ENSHITTIFICATION_METRICS.map(metric => (
              <div key={metric.platform} className="p-3 bg-white rounded-lg border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm text-slate-800">{metric.platform}</span>
                  <span className="text-xs text-slate-500">{metric.incidents} incidents</span>
                </div>
                <EnshittificationBar score={metric.score} trend={metric.trend} />
                <div className="flex items-center justify-between mt-2 text-[10px] text-slate-400">
                  <span>Last incident: {metric.lastIncident}</span>
                  <span className={
                    metric.trend === 'degrading' ? 'text-rose-500' :
                    metric.trend === 'improving' ? 'text-emerald-500' : ''
                  }>
                    {metric.trend === 'degrading' ? '⬆️ Getting worse' :
                     metric.trend === 'improving' ? '⬇️ Improving' : '➡️ Stable'}
                  </span>
                </div>
              </div>
            ))}

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-800">
                <strong>Why track this?</strong> Enshittified platforms break their promises. 
                Data centers built by these companies often fail to deliver jobs and benefits they promised.
              </p>
            </div>
          </div>
        </ExpandableSection>
      </div>

      {/* Self-Hosting Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl">
              <Server size={28} />
            </div>
            <div>
              <h3 className="text-lg font-bold">Self-Host Your Instance</h3>
              <p className="text-slate-300 text-sm">
                Run DCIM Compliance on your own infrastructure. No cloud dependency. Full sovereignty.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
              <Terminal size={16} />
              Docker Compose
            </button>
            <button className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2">
              <GitBranch size={16} />
              Clone Repo
            </button>
          </div>
        </div>
      </div>

      {/* Federation Section */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Users size={20} className="text-purple-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Federation Network</h3>
            <p className="text-sm text-slate-500">Connect with other labor organizers</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center">
            <div className="text-2xl font-bold text-purple-700">12</div>
            <div className="text-xs text-purple-600">Connected Instances</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center">
            <div className="text-2xl font-bold text-purple-700">847</div>
            <div className="text-xs text-purple-600">Shared Reports</div>
          </div>
          <div className="p-4 bg-purple-50 rounded-xl border border-purple-200 text-center">
            <div className="text-2xl font-bold text-purple-700">23</div>
            <div className="text-xs text-purple-600">Active Campaigns</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
          <div className="flex items-center gap-2 text-sm">
            <Heart size={14} className="text-rose-500" />
            <span className="text-slate-600">
              Powered by <strong className="text-slate-800">ActivityPub</strong> — 
              the same protocol as Mastodon. Decentralized. Federated. Worker-owned.
            </span>
          </div>
        </div>
      </div>

      {/* Footer Quote */}
      <div className="text-center py-6">
        <p className="text-slate-500 text-sm italic max-w-2xl mx-auto">
          "We are at a turning point in the decades-long war on general-purpose computing. 
          Geopolitics are up for grabs. <strong className="text-slate-700">The future is ours to seize.</strong>"
        </p>
        <p className="text-slate-400 text-xs mt-2">
          — Cory Doctorow, 39C3 • <a href="https://archive.org/details/doctorow-39c3" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-500">Watch the full talk</a>
        </p>
      </div>
    </div>
  );
};

export default DataSovereigntyHub;

