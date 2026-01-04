import React, { useState, useMemo, useCallback, memo, useEffect, useRef } from 'react';
import { 
  Map as MapIcon, Layers, Filter, Clock, Save, Download, Maximize2, Minimize2,
  ChevronDown, ChevronUp, ChevronRight, X, RefreshCw, AlertTriangle,
  Building2, DollarSign, Users, Search, Eye, Shield, ShieldCheck, ShieldAlert,
  Network, Activity, GitBranch, Target, Database, Globe, FileSearch,
  Server, Lock, Unlock, Cable, Anchor, Share2, Radio, MapPin,
  Star, StarOff, List, Grid3X3, SortAsc, SortDesc, Scale, ArrowRight,
  CheckCircle2, TrendingUp, TrendingDown, BarChart3, Loader2, ExternalLink,
  Play, Pause, Plus
} from 'lucide-react';
import { Facility } from '../../types';
import { formatCurrency } from '../../utils/formatting';
import { getComplianceBadgeClasses } from '../../utils/classHelpers';
import { ErrorBoundary } from '../ErrorBoundary';
import { db, NetworkSecurity } from '../../db/database';
import { calculateStats } from '../../utils/stats';

interface ConnectographyTabProps {
  facilities: Facility[];
}

// ═══════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM (matching project colors)
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
  bg: '#0a0e17',
  bgCard: '#0d1219',
  bgElevated: '#141c28',
  border: '#1e2d42',
  borderActive: '#3b82f6',
  text: '#e8eef6',
  textSecondary: '#8b9dc3',
  textMuted: '#5a6d8a',
  cyan: '#00d2d3',
  blue: '#3742fa',
  green: '#2ed573',
  yellow: '#ffa502',
  red: '#ff4757',
  purple: '#a55eea',
};

// ═══════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// Simulated Map View (represents PhotorealisticGisView)
const MapView = memo(({ metric, facilities, selectedId, onSelect, stateFilter }: {
  metric: 'subsidyGap' | 'issuesCount' | 'complianceScore';
  facilities: Facility[];
  selectedId?: number | null;
  onSelect: (id: number) => void;
  stateFilter?: string[];
}) => {
  const filtered = useMemo(() => {
    if (!stateFilter || stateFilter.length === 0) return facilities;
    return facilities.filter(f => stateFilter.includes(f.state));
  }, [facilities, stateFilter]);

  const facilitiesWithCoords = useMemo(() => {
    return filtered.filter(f => f.latitude !== undefined && f.longitude !== undefined);
  }, [filtered]);

  const getColor = (facility: Facility) => {
    const value = metric === 'subsidyGap' ? Math.min(facility.subsidyGap / 156000000, 1) :
                  metric === 'issuesCount' ? Math.min((facility.issues?.length || 0) / 12, 1) :
                  metric === 'complianceScore' ? facility.complianceStatus === 'Compliant' ? 0 : 
                    facility.complianceStatus === 'Non-Compliant' ? 1 : 0.5 : 0.5;
    if (value > 0.7) return COLORS.red;
    if (value > 0.4) return COLORS.yellow;
    return COLORS.green;
  };

  return (
    <div className="relative w-full h-full bg-slate-900 overflow-hidden">
      {/* Map Background */}
      <div className="absolute inset-0 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 40%, ${COLORS.cyan}22 0%, transparent 50%),
                           radial-gradient(circle at 70% 60%, ${COLORS.purple}22 0%, transparent 50%)`,
        }}
      />
      
      {/* Grid */}
      <div className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(${COLORS.cyan}33 1px, transparent 1px),
                           linear-gradient(90deg, ${COLORS.cyan}33 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />
      
      {/* Facility Markers */}
      <div className="absolute inset-0 p-8">
        <div className="relative w-full h-full">
          {facilitiesWithCoords.map((facility) => {
            const x = ((facility.longitude! + 125) / 50) * 100;
            const y = ((50 - facility.latitude!) / 20) * 100;
            const isSelected = facility.id === selectedId;
            
            return (
              <div
                key={facility.id}
                onClick={() => onSelect(facility.id)}
                className="absolute cursor-pointer transform -translate-x-1/2 -translate-y-1/2 transition-all duration-200"
                style={{ left: `${Math.max(5, Math.min(95, x))}%`, top: `${Math.max(5, Math.min(95, y))}%` }}
              >
                <div 
                  className={`rounded-full transition-all ${isSelected ? 'ring-2 ring-white scale-125' : 'hover:scale-110'}`}
                  style={{
                    width: isSelected ? 20 : 14,
                    height: isSelected ? 20 : 14,
                    backgroundColor: getColor(facility),
                    boxShadow: `0 0 ${isSelected ? 20 : 10}px ${getColor(facility)}`,
                  }}
                />
                {isSelected && (
                  <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-800 px-2 py-1 rounded text-xs text-white border border-slate-600">
                    {facility.name}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg p-3 border border-slate-700">
          <div className="flex items-center gap-2 mb-2">
            <MapIcon className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-medium text-slate-200">{metric}</span>
          </div>
        <div className="flex items-center gap-1">
          <div className="w-16 h-2 rounded" style={{ background: `linear-gradient(to right, ${COLORS.green}, ${COLORS.yellow}, ${COLORS.red})` }} />
          <span className="text-xs text-slate-400 ml-2">Low → High</span>
        </div>
      </div>
      
      {/* Stats */}
      <div className="absolute top-4 left-4 bg-slate-800/90 backdrop-blur rounded-lg px-3 py-2 border border-slate-700">
        <span className="text-xs text-slate-400">Showing </span>
        <span className="text-sm font-bold text-cyan-400">{facilitiesWithCoords.length}</span>
        <span className="text-xs text-slate-400"> facilities</span>
      </div>
    </div>
  );
});

MapView.displayName = 'MapView';

// Connectography Feature Section Wrapper
const ConnectographySection = memo(({ title, subtitle, metric, facilities, stateFilter, onFacilitySelect }: {
  title: string;
  subtitle?: string;
  metric: 'subsidyGap' | 'issuesCount' | 'complianceScore';
  facilities: Facility[];
  stateFilter?: string[];
  onFacilitySelect?: (id: number) => void;
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<number | null>(null);
  const [showToolkit, setShowToolkit] = useState(false);

  const handleSelect = useCallback((id: number) => {
    setSelectedFacility(id);
    onFacilitySelect?.(id);
  }, [onFacilitySelect]);

  return (
    <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 bg-slate-800/80 border-b border-slate-700/50 cursor-pointer hover:bg-slate-800/90"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center">
            <MapIcon className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-100">{title}</h3>
            {subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            {metric}
          </span>
          {isCollapsed ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronUp className="w-4 h-4 text-slate-400" />}
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="relative" style={{ height: 400 }}>
          <MapView 
            metric={metric}
            facilities={facilities}
            selectedId={selectedFacility}
            onSelect={handleSelect}
            stateFilter={stateFilter}
          />
          
          {/* Controls */}
          <div className="absolute top-3 right-3 flex gap-2 z-10">
            <button
              onClick={(e) => { e.stopPropagation(); setShowToolkit(!showToolkit); }}
              className={`p-2 rounded-lg border transition-colors ${showToolkit ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400' : 'bg-slate-800/90 border-slate-600/50 text-slate-300 hover:text-white'}`}
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setIsFullscreen(!isFullscreen); }}
              className="p-2 bg-slate-800/90 hover:bg-slate-700/90 rounded-lg border border-slate-600/50 text-slate-300 hover:text-white"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          </div>

          {/* Toolkit Panel */}
          {showToolkit && (
            <div className="absolute top-0 right-0 h-full w-72 bg-slate-900/95 border-l border-slate-700/50 backdrop-blur-sm z-20 overflow-y-auto">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/50">
                <span className="font-semibold text-slate-200 text-sm">Toolkit</span>
                <button onClick={() => setShowToolkit(false)} className="p-1 text-slate-400 hover:text-slate-200">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 space-y-3">
                {['Facility Markers', 'Heatmap', 'Flow Lines', 'State Boundaries'].map(layer => (
                  <div key={layer} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                    <span className="text-sm text-slate-300">{layer}</span>
                    <Eye className="w-4 h-4 text-cyan-400" />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

ConnectographySection.displayName = 'ConnectographySection';

// ═══════════════════════════════════════════════════════════════════════════
// TAB COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// 1. Pattern Analysis Tab
const PatternAnalysisTab = memo(({ facilities }: { facilities: Facility[] }) => {
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);

  // Detect patterns from real data
  const patterns = useMemo(() => {
    const patterns: Array<{
      id: string;
      name: string;
      type: string;
      severity: number;
      facilityCount: number;
      description: string;
      affectedStates: string[];
    }> = [];

    // Pattern 1: High subsidy gap clustering by state
    const stateGaps = facilities.reduce((acc, f) => {
      if (!acc[f.state]) acc[f.state] = { total: 0, count: 0 };
      acc[f.state].total += f.subsidyGap;
      acc[f.state].count++;
      return acc;
    }, {} as Record<string, { total: number; count: number }>);

    const topGapState = Object.entries(stateGaps)
      .sort((a, b) => b[1].total - a[1].total)[0];
    
    if (topGapState && topGapState[1].total > 100000000) {
      patterns.push({
        id: 'pat-gap-cluster',
        name: 'Subsidy Gap Clustering',
        type: 'cluster',
        severity: Math.min(85, Math.floor((topGapState[1].total / 500000000) * 100)),
        facilityCount: topGapState[1].count,
        description: `Geographic clustering of high non-compliance in ${topGapState[0]}`,
        affectedStates: [topGapState[0]],
      });
    }

    // Pattern 2: Non-compliant facilities by operator
    const operatorNonCompliant = facilities.reduce((acc, f) => {
      if (f.complianceStatus === 'Non-Compliant') {
        if (!acc[f.operator]) acc[f.operator] = [];
        acc[f.operator].push(f);
      }
      return acc;
    }, {} as Record<string, Facility[]>);

    const topOperator = Object.entries(operatorNonCompliant)
      .sort((a, b) => b[1].length - a[1].length)[0];

    if (topOperator && topOperator[1].length > 20) {
      const states = [...new Set(topOperator[1].map(f => f.state))];
      patterns.push({
        id: 'pat-operator',
        name: `${topOperator[0]} Non-Compliance Pattern`,
        type: 'anomaly',
        severity: Math.min(90, Math.floor((topOperator[1].length / 100) * 100)),
        facilityCount: topOperator[1].length,
        description: `${topOperator[1].length} non-compliant facilities from ${topOperator[0]}`,
        affectedStates: states.slice(0, 5),
      });
    }

    // Pattern 3: At Risk facilities trend
    const atRiskCount = facilities.filter(f => f.complianceStatus === 'At Risk').length;
    if (atRiskCount > 50) {
      const atRiskStates = [...new Set(facilities.filter(f => f.complianceStatus === 'At Risk').map(f => f.state))];
      patterns.push({
        id: 'pat-at-risk',
        name: 'At Risk Facility Trend',
        type: 'trend',
        severity: Math.min(75, Math.floor((atRiskCount / 200) * 100)),
        facilityCount: atRiskCount,
        description: `${atRiskCount} facilities at risk across multiple states`,
        affectedStates: atRiskStates.slice(0, 5),
      });
    }

    return patterns;
  }, [facilities]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Detected Patterns', value: patterns.length, icon: Activity, color: 'cyan' },
          { label: 'High Severity', value: patterns.filter(p => p.severity >= 70).length, icon: AlertTriangle, color: 'red' },
          { label: 'Avg Severity', value: patterns.length > 0 ? `${Math.round(patterns.reduce((sum, p) => sum + p.severity, 0) / patterns.length)}%` : '0%', icon: BarChart3, color: 'yellow' },
          { label: 'Pattern Types', value: new Set(patterns.map(p => p.type)).size, icon: GitBranch, color: 'purple' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS[stat.color as keyof typeof COLORS]}22` }}>
                <stat.icon className="w-5 h-5" style={{ color: COLORS[stat.color as keyof typeof COLORS] }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pattern List */}
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Eye className="w-4 h-4 text-cyan-400" />
            Detected Patterns
          </h3>
          {patterns.length === 0 ? (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center text-slate-400 text-sm">
              No patterns detected
            </div>
          ) : (
            patterns.map(pattern => (
              <div
                key={pattern.id}
                onClick={() => setSelectedPattern(pattern.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedPattern === pattern.id
                    ? 'bg-cyan-500/10 border-cyan-500/50'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <span className="font-medium text-slate-100 text-sm">{pattern.name}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold border ${
                    pattern.severity >= 70 ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                  }`}>
                    {pattern.severity}%
                  </span>
                </div>
                <p className="text-xs text-slate-400">{pattern.description}</p>
                <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                  <Target className="w-3 h-3" />
                  {pattern.facilityCount} facilities
                </div>
              </div>
            ))
          )}
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          {selectedPattern ? (
            (() => {
              const pattern = patterns.find(p => p.id === selectedPattern);
              if (!pattern) return null;
              return (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-100">{pattern.name}</h3>
                  <p className="text-sm text-slate-400">{pattern.description}</p>
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Affected States</div>
                    <div className="flex gap-1 flex-wrap">
                      {pattern.affectedStates.map(state => (
                        <span key={state} className="px-2 py-0.5 bg-slate-700 rounded text-xs text-slate-300">{state}</span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <Target className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Select a pattern to view details</p>
            </div>
          )}
        </div>
      </div>

      {selectedPattern && (() => {
        const pattern = patterns.find(p => p.id === selectedPattern);
        if (!pattern) return null;
        return (
          <ConnectographySection
            title="Pattern Geographic Distribution"
            subtitle={`Showing: ${pattern.name}`}
            metric="subsidyGap"
            facilities={facilities}
            stateFilter={pattern.affectedStates}
          />
        );
      })()}
    </div>
  );
});

PatternAnalysisTab.displayName = 'PatternAnalysisTab';

// 2. Network Security Tab
const NetworkSecurityTab = memo(({ facilities }: { facilities: Facility[] }) => {
  const [selectedFacility, setSelectedFacility] = useState<number | null>(null);
  const [networkData, setNetworkData] = useState<NetworkSecurity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadNetworkData() {
      try {
        const data = await db.networkSecurity.toArray();
        if (isMounted && !abortController.signal.aborted) {
          setNetworkData(data);
        }
      } catch (error) {
        console.error('Error loading network security data:', error);
      } finally {
        if (isMounted && !abortController.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadNetworkData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  const normalizeRpkiStatus = (status?: string) => {
    const s = (status || 'Unknown').toLowerCase();
    if (s === 'valid' || s === 'safe') return 'Safe';
    if (s === 'invalid' || s === 'unsafe') return 'Unsafe';
    if (s === 'partially safe' || s === 'partial' || s === 'partially-safe') return 'Partially Safe';
    return 'Unknown';
  };

  const getRpkiBadge = (status: string) => {
    const normalized = normalizeRpkiStatus(status);
    const config: Record<string, { color: string; label: string; Icon: typeof ShieldCheck }> = {
      Safe: { color: COLORS.green, label: 'Safe', Icon: ShieldCheck },
      Unsafe: { color: COLORS.red, label: 'Unsafe', Icon: ShieldAlert },
      'Partially Safe': { color: COLORS.yellow, label: 'Partially Safe', Icon: Shield },
      Unknown: { color: COLORS.yellow, label: 'Unknown', Icon: Shield },
    };
    const { color, label, Icon } = config[normalized] || config.Unknown;
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium" style={{ backgroundColor: `${color}22`, color }}>
        <Icon className="w-3 h-3" />
        {label}
      </span>
    );
  };

  const facilitiesWithNetwork = useMemo(() => {
    return facilities.filter(f => networkData.some(n => n.facilityId === f.id));
  }, [facilities, networkData]);

  const networkStats = useMemo(() => {
    const safe = networkData.filter(d => normalizeRpkiStatus(d.rpkiStatus) === 'Safe').length;
    const unsafe = networkData.filter(d => normalizeRpkiStatus(d.rpkiStatus) === 'Unsafe').length;
    const highRisk = networkData.filter(d => (d.networkRiskScore || 0) >= 70).length;
    const avgRisk = networkData.length > 0 
      ? Math.round(networkData.reduce((sum, d) => sum + (d.networkRiskScore || 0), 0) / networkData.length)
      : 0;
    return { safe, unsafe, highRisk, avgRisk, total: networkData.length };
  }, [networkData]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Monitored', value: networkStats.total, icon: Server, color: 'cyan' },
          { label: 'High Risk', value: networkStats.highRisk, icon: ShieldAlert, color: 'red' },
          { label: 'RPKI Safe', value: networkStats.safe, icon: ShieldCheck, color: 'green' },
          { label: 'Avg Risk', value: networkStats.avgRisk.toString(), icon: Activity, color: 'yellow' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS[stat.color as keyof typeof COLORS]}22` }}>
                <stat.icon className="w-5 h-5" style={{ color: COLORS[stat.color as keyof typeof COLORS] }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Network Data Grid */}
      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Network className="w-4 h-4 text-cyan-400" />
            Network Security Status
          </h3>
          {loading ? (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
              Loading network data...
            </div>
          ) : facilitiesWithNetwork.length === 0 ? (
            <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 text-center text-slate-400 text-sm">
              No network security data available
            </div>
          ) : (
            facilitiesWithNetwork.slice(0, 20).map(facility => {
              const networkInfo = networkData.find(n => n.facilityId === facility.id);
              const riskScore = networkInfo?.networkRiskScore || 0;
              return (
                <div
                  key={facility.id}
                  onClick={() => setSelectedFacility(facility.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedFacility === facility.id
                      ? 'bg-cyan-500/10 border-cyan-500/50'
                      : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="font-medium text-slate-100 text-sm">{facility.name}</div>
                      <div className="text-xs text-slate-400">{facility.operator} • {facility.state}</div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                      riskScore >= 70 ? 'bg-red-500/20 text-red-400' :
                      riskScore >= 40 ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      Risk: {riskScore}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    {networkInfo && getRpkiBadge(networkInfo.rpkiStatus || 'unknown')}
                    <span className="text-xs text-slate-500">{networkInfo?.bgpAnomalies || 0} BGP anomalies</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          {selectedFacility ? (() => {
            const facility = facilities.find(f => f.id === selectedFacility);
            const networkInfo = networkData.find(n => n.facilityId === selectedFacility);
            if (!facility) return null;
            return (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-100">{facility.name}</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">RPKI Status</span>
                    {networkInfo && getRpkiBadge(networkInfo.rpkiStatus || 'unknown')}
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Risk Score</span>
                    <span className="text-white font-bold">{networkInfo?.networkRiskScore || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">BGP Anomalies</span>
                    <span className="text-white">{networkInfo?.bgpAnomalies || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">ASN</span>
                    <span className="text-white">{networkInfo?.asn || 'N/A'}</span>
                  </div>
                </div>
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <Shield className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Select facility for details</p>
            </div>
          )}
        </div>
      </div>

      <ConnectographySection
        title="Network Security Risk Map"
        subtitle="RPKI status, BGP anomalies, and security mitigations"
        metric="complianceScore"
        facilities={facilities}
      />
    </div>
  );
});

NetworkSecurityTab.displayName = 'NetworkSecurityTab';

// 3. OSINT Tools Tab
const OSINTToolsTab = memo(({ facilities }: { facilities: Facility[] }) => {
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState('');

  const OSINT_TOOLS = [
    { id: 'sec-edgar', name: 'SEC EDGAR', category: 'financial', corsBlocked: false },
    { id: 'epa-echo', name: 'EPA ECHO', category: 'environmental', corsBlocked: false },
    { id: 'ripe-ris', name: 'RIPE RIS Live', category: 'network', corsBlocked: false },
    { id: 'occrp-aleph', name: 'OCCRP Aleph', category: 'corporate', corsBlocked: true },
  ];

  const stats = useMemo(() => {
    return {
      total: OSINT_TOOLS.length,
      available: OSINT_TOOLS.filter(t => !t.corsBlocked).length,
      blocked: OSINT_TOOLS.filter(t => t.corsBlocked).length,
      recentQueries: 12, // Would come from search history
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total Tools', value: stats.total, icon: Eye, color: 'cyan' },
          { label: 'Available', value: stats.available, icon: CheckCircle2, color: 'green' },
          { label: 'CORS Blocked', value: stats.blocked, icon: Shield, color: 'red' },
          { label: 'Recent Queries', value: stats.recentQueries, icon: Clock, color: 'yellow' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS[stat.color as keyof typeof COLORS]}22` }}>
                <stat.icon className="w-5 h-5" style={{ color: COLORS[stat.color as keyof typeof COLORS] }} />
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-3 gap-6">
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
            <Database className="w-4 h-4 text-cyan-400" />
            OSINT Tools
          </h3>
          {OSINT_TOOLS.map(tool => (
            <div
              key={tool.id}
              onClick={() => setSelectedTool(tool.id)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedTool === tool.id
                  ? 'bg-cyan-500/10 border-cyan-500/50'
                  : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
              }`}
            >
              <div className="flex items-start justify-between">
                <span className="font-medium text-slate-100 text-sm">{tool.name}</span>
                {tool.corsBlocked && <Shield className="w-4 h-4 text-red-400" />}
              </div>
              <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block" style={{ backgroundColor: `${COLORS.blue}22`, color: COLORS.blue }}>
                {tool.category}
              </span>
            </div>
          ))}
        </div>

        <div className="col-span-2 bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
          {selectedTool ? (() => {
            const tool = OSINT_TOOLS.find(t => t.id === selectedTool);
            if (!tool) return null;
            return (
              <div className="space-y-4">
                <h3 className="font-semibold text-slate-100">{tool.name}</h3>
                {tool.corsBlocked ? (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                    <div className="flex items-center gap-2 text-red-400 text-sm">
                      <Shield className="w-4 h-4" />
                      <span className="font-medium">CORS Blocked</span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Direct queries not available</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={queryInput}
                      onChange={(e) => setQueryInput(e.target.value)}
                      placeholder={`Search ${tool.name}...`}
                      className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-sm"
                    />
                    <button className="w-full px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2">
                      <Search className="w-4 h-4" />
                      Run Query
                    </button>
                  </div>
                )}
              </div>
            );
          })() : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-500">
              <Eye className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">Select a tool to begin</p>
            </div>
          )}
        </div>
      </div>

      <ConnectographySection
        title="OSINT Query Geographic Context"
        subtitle="Visualize query targets and findings"
        metric="subsidyGap"
        facilities={facilities}
      />
    </div>
  );
});

OSINTToolsTab.displayName = 'OSINTToolsTab';

// 4. Explorer Tab
const ExplorerTab = memo(({ facilities }: { facilities: Facility[] }) => {
  const [selectedFacility, setSelectedFacility] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterState, setFilterState] = useState('all');
  const [starred, setStarred] = useState<Set<number>>(new Set());

  const filtered = useMemo(() => {
    return facilities.filter(f => {
      if (filterState !== 'all' && f.state !== filterState) return false;
      if (searchQuery && !f.name.toLowerCase().includes(searchQuery.toLowerCase()) && 
          !f.operator.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [facilities, searchQuery, filterState]);

  const toggleStar = useCallback((id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setStarred(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const totalGap = useMemo(() => {
    return filtered.reduce((sum, f) => sum + f.subsidyGap, 0);
  }, [filtered]);

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="flex items-center gap-6 p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-400" />
          <div>
            <div className="text-lg font-bold text-white">{filtered.length}</div>
            <div className="text-xs text-slate-400">facilities</div>
          </div>
        </div>
        <div className="h-8 w-px bg-slate-700" />
        <div className="flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-red-400" />
          <div>
            <div className="text-lg font-bold text-white">{formatCurrency(totalGap)}</div>
            <div className="text-xs text-slate-400">total gap</div>
          </div>
        </div>
        <div className="h-8 w-px bg-slate-700" />
        <div className="flex items-center gap-2">
          <Star className="w-5 h-5 text-yellow-400" />
          <div>
            <div className="text-lg font-bold text-white">{starred.size}</div>
            <div className="text-xs text-slate-400">starred</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search facilities..."
            className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
        <select
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
          className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 text-sm focus:outline-none focus:border-cyan-500"
        >
          <option value="all">All States</option>
          {[...new Set(facilities.map(f => f.state))].sort().map(state => (
            <option key={state} value={state}>{state}</option>
          ))}
        </select>
      </div>

      {/* Facility List */}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {filtered.slice(0, 50).map(facility => (
          <div
            key={facility.id}
            onClick={() => setSelectedFacility(facility.id)}
            className={`p-4 rounded-lg border cursor-pointer transition-all ${
              selectedFacility === facility.id
                ? 'bg-cyan-500/10 border-cyan-500/50'
                : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-slate-100">{facility.name}</span>
                <button onClick={(e) => toggleStar(facility.id, e)} className="text-slate-400 hover:text-yellow-400">
                  {starred.has(facility.id) ? (
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ) : (
                    <StarOff className="w-4 h-4" />
                  )}
                </button>
              </div>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${getComplianceBadgeClasses(facility.complianceStatus)}`}>
                {facility.complianceStatus}
              </span>
            </div>
            <div className="text-xs text-slate-400 mt-1">{facility.operator} • {facility.city}, {facility.state}</div>
            <div className="flex items-center gap-4 mt-2 text-xs">
              <span className="text-red-400 font-medium">{formatCurrency(facility.subsidyGap)} gap</span>
              <span className="text-slate-400">{facility.issues?.length || 0} issues</span>
            </div>
          </div>
        ))}
        {filtered.length > 50 && (
          <div className="text-center text-sm text-slate-400 py-2">
            Showing first 50 of {filtered.length} facilities
          </div>
        )}
      </div>

      <ConnectographySection
        title="Facility Explorer Map"
        subtitle={`Showing ${filtered.length} facilities${selectedFacility ? ` • Selected: ${facilities.find(f => f.id === selectedFacility)?.name}` : ''}`}
        metric="subsidyGap"
        facilities={facilities}
        stateFilter={filterState !== 'all' ? [filterState] : undefined}
        onFacilitySelect={(id) => setSelectedFacility(id)}
      />
    </div>
  );
});

ExplorerTab.displayName = 'ExplorerTab';

// 5. Compare Tab
const CompareTab = memo(({ facilities }: { facilities: Facility[] }) => {
  const operators = useMemo(() => {
    const operatorMap = facilities.reduce((acc, f) => {
      if (!acc[f.operator]) {
        acc[f.operator] = { facilities: [], totalGap: 0, issuesCount: 0, compliant: 0 };
      }
      acc[f.operator].facilities.push(f);
      acc[f.operator].totalGap += f.subsidyGap;
      acc[f.operator].issuesCount += f.issues?.length || 0;
      if (f.complianceStatus === 'Compliant') acc[f.operator].compliant++;
      return acc;
    }, {} as Record<string, { facilities: Facility[]; totalGap: number; issuesCount: number; compliant: number }>);

    return Object.entries(operatorMap)
      .map(([name, data]) => ({
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        type: 'operator' as const,
        subsidyGap: data.totalGap,
        issuesCount: data.issuesCount,
        complianceScore: data.facilities.length > 0 
          ? Math.round((data.compliant / data.facilities.length) * 100)
          : 0,
        facilityCount: data.facilities.length,
      }))
      .sort((a, b) => b.subsidyGap - a.subsidyGap)
      .slice(0, 10);
  }, [facilities]);

  const [entity1, setEntity1] = useState(operators[0] || null);
  const [entity2, setEntity2] = useState(operators[1] || null);

  const MetricRow = ({ label, value1, value2, format = (v: number) => v.toString(), lowerIsBetter = true }: {
    label: string;
    value1: number;
    value2: number;
    format?: (v: number) => string;
    lowerIsBetter?: boolean;
  }) => {
    const better1 = lowerIsBetter ? value1 < value2 : value1 > value2;
    const better2 = !better1 && value1 !== value2;
    
    return (
      <div className="grid grid-cols-3 gap-4 py-3 border-b border-slate-700/50">
        <div className={`text-right font-semibold ${better1 ? 'text-green-400' : better2 ? 'text-red-400' : 'text-slate-300'}`}>
          {format(value1)}
          {better1 && <TrendingUp className="w-3 h-3 inline ml-1" />}
        </div>
        <div className="text-center text-sm text-slate-400">{label}</div>
        <div className={`text-left font-semibold ${better2 ? 'text-green-400' : better1 ? 'text-red-400' : 'text-slate-300'}`}>
          {better2 && <TrendingUp className="w-3 h-3 inline mr-1" />}
          {format(value2)}
        </div>
      </div>
    );
  };

  if (operators.length < 2) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Scale className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>Need at least 2 operators to compare</p>
      </div>
    );
  }

  if (!entity1 || !entity2) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin opacity-50" />
        <p>Loading comparison data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Entity Selectors */}
      <div className="grid grid-cols-11 gap-4 items-center">
        <div className="col-span-5">
          <select
            value={entity1.id}
            onChange={(e) => setEntity1(operators.find(o => o.id === e.target.value) || entity1)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {operators.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        </div>
        <div className="col-span-1 flex justify-center">
          <button
            onClick={() => { const temp = entity1; setEntity1(entity2); setEntity2(temp); }}
            className="p-2 rounded-full bg-slate-700 hover:bg-slate-600"
          >
            <ArrowRight className="w-5 h-5 text-slate-300" />
          </button>
        </div>
        <div className="col-span-5">
          <select
            value={entity2.id}
            onChange={(e) => setEntity2(operators.find(o => o.id === e.target.value) || entity2)}
            className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-slate-100 focus:outline-none focus:border-cyan-500"
          >
            {operators.map(op => (
              <option key={op.id} value={op.id}>{op.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Comparison */}
      <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-6">
        <div className="grid grid-cols-3 gap-4 pb-4 border-b border-slate-600">
          <div className="text-right font-semibold text-slate-100">{entity1.name}</div>
          <div className="text-center"><Scale className="w-5 h-5 text-cyan-400 mx-auto" /></div>
          <div className="text-left font-semibold text-slate-100">{entity2.name}</div>
        </div>
        <div className="mt-4">
          <MetricRow label="Subsidy Gap" value1={entity1.subsidyGap} value2={entity2.subsidyGap} format={formatCurrency} />
          <MetricRow label="Issues" value1={entity1.issuesCount} value2={entity2.issuesCount} />
          <MetricRow label="Compliance" value1={entity1.complianceScore} value2={entity2.complianceScore} format={(v) => `${v}%`} lowerIsBetter={false} />
          <MetricRow label="Facilities" value1={entity1.facilityCount} value2={entity2.facilityCount} lowerIsBetter={false} />
        </div>
        <div className="mt-6 pt-4 border-t border-slate-700/50 text-center">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-medium">
              {entity1.complianceScore >= entity2.complianceScore ? entity1.name : entity2.name} has better compliance
            </span>
          </div>
        </div>
      </div>

      <ConnectographySection
        title="Comparison Geographic View"
        subtitle={`Comparing ${entity1.name} vs ${entity2.name}`}
        metric="complianceScore"
        facilities={facilities.filter(f => f.operator === entity1.name || f.operator === entity2.name)}
      />
    </div>
  );
});

CompareTab.displayName = 'CompareTab';

// 6. Infrastructure Tab
const InfrastructureTab = memo(({ facilities }: { facilities: Facility[] }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>('cables');

  // Mock infrastructure data (would come from database in production)
  const cables = [
    { id: 'marea', name: 'MAREA', length: '6,600 km', capacity: '160 Tbps', owners: ['Microsoft', 'Meta'] },
    { id: 'dunant', name: 'Dunant', length: '6,400 km', capacity: '250 Tbps', owners: ['Google'] },
    { id: 'havfrue', name: 'HAVFRUE', length: '7,200 km', capacity: '108 Tbps', owners: ['Google', 'Facebook'] },
  ];

  const ixps = [
    { id: 'decix-ny', name: 'DE-CIX New York', city: 'New York', participants: 485 },
    { id: 'equinix-ash', name: 'Equinix Ashburn', city: 'Ashburn', participants: 1200 },
    { id: 'coresite-la', name: 'CoreSite Any2 LA', city: 'Los Angeles', participants: 320 },
  ];

  const INFRASTRUCTURE_STATS = {
    submarineCables: 597,
    landingStations: 1712,
    ixps: 1205,
    facilities: facilities.length,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Submarine Cables', value: INFRASTRUCTURE_STATS.submarineCables, icon: Cable, color: 'cyan' },
          { label: 'Landing Stations', value: INFRASTRUCTURE_STATS.landingStations, icon: Anchor, color: 'blue' },
          { label: 'IXPs', value: INFRASTRUCTURE_STATS.ixps, icon: Share2, color: 'purple' },
          { label: 'Facilities', value: INFRASTRUCTURE_STATS.facilities.toLocaleString(), icon: Server, color: 'green' },
        ].map((stat, i) => (
          <div key={i} className="bg-slate-800/50 rounded-xl border border-slate-700/50 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS[stat.color as keyof typeof COLORS]}22` }}>
                <stat.icon className="w-5 h-5" style={{ color: COLORS[stat.color as keyof typeof COLORS] }} />
              </div>
              <div>
                <div className="text-xl font-bold text-white">{stat.value}</div>
                <div className="text-xs text-slate-400">{stat.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-4">
        {/* Cables */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'cables' ? null : 'cables')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/70"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS.cyan}22` }}>
                <Cable className="w-5 h-5" style={{ color: COLORS.cyan }} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-100">Submarine Cables</div>
                <div className="text-xs text-slate-400">{cables.length} sample entries</div>
              </div>
            </div>
            {expandedSection === 'cables' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          {expandedSection === 'cables' && (
            <div className="border-t border-slate-700/50 p-4 space-y-2">
              {cables.map(cable => (
                <div key={cable.id} className="p-3 bg-slate-700/30 rounded-lg">
                  <div className="flex justify-between">
                    <span className="font-medium text-slate-100">{cable.name}</span>
                    <span className="text-xs text-slate-400">{cable.capacity}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">{cable.length}</div>
                  <div className="flex gap-1 mt-2">
                    {cable.owners.map(owner => (
                      <span key={owner} className="px-1.5 py-0.5 rounded text-xs" style={{ backgroundColor: `${COLORS.cyan}22`, color: COLORS.cyan }}>
                        {owner}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* IXPs */}
        <div className="bg-slate-800/50 rounded-xl border border-slate-700/50 overflow-hidden">
          <button
            onClick={() => setExpandedSection(expandedSection === 'ixps' ? null : 'ixps')}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-800/70"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${COLORS.purple}22` }}>
                <Share2 className="w-5 h-5" style={{ color: COLORS.purple }} />
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-100">Internet Exchange Points</div>
                <div className="text-xs text-slate-400">{ixps.length} sample entries</div>
              </div>
            </div>
            {expandedSection === 'ixps' ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
          </button>
          {expandedSection === 'ixps' && (
            <div className="border-t border-slate-700/50 p-4 space-y-2">
              {ixps.map(ixp => (
                <div key={ixp.id} className="p-3 bg-slate-700/30 rounded-lg flex justify-between">
                  <div>
                    <div className="font-medium text-slate-100">{ixp.name}</div>
                    <div className="text-xs text-slate-400">{ixp.city}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium" style={{ color: COLORS.purple }}>{ixp.participants}</div>
                    <div className="text-xs text-slate-500">participants</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <ConnectographySection
        title="Infrastructure Topology Map"
        subtitle="Cables, IXPs, landing stations with facility overlay"
        metric="subsidyGap"
        facilities={facilities}
      />
    </div>
  );
});

InfrastructureTab.displayName = 'InfrastructureTab';

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

const ConnectographyTab = memo(function ConnectographyTab({ facilities }: ConnectographyTabProps) {
  const [activeSubTab, setActiveSubTab] = useState('patterns');

  const SUB_TABS = [
    { id: 'patterns', label: 'Pattern Analysis', icon: Activity, component: PatternAnalysisTab },
    { id: 'network', label: 'Network Security', icon: Shield, component: NetworkSecurityTab },
    { id: 'osint', label: 'OSINT Tools', icon: Eye, component: OSINTToolsTab },
    { id: 'explorer', label: 'Explorer', icon: Search, component: ExplorerTab },
    { id: 'compare', label: 'Compare', icon: Scale, component: CompareTab },
    { id: 'infrastructure', label: 'Infrastructure', icon: Network, component: InfrastructureTab },
  ];

  const ActiveComponent = SUB_TABS.find(t => t.id === activeSubTab)?.component || PatternAnalysisTab;

  return (
    <ErrorBoundary>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Connectography Analysis</h2>
          <p className="text-sm text-gray-400">
            Geographic intelligence, pattern detection, and infrastructure mapping
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="border-b border-slate-700/50">
          <div className="flex gap-1 overflow-x-auto py-2">
            {SUB_TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  activeSubTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sub-tab Content */}
        <div className="p-6 bg-slate-900/50 rounded-xl border border-slate-700/50">
          <ActiveComponent facilities={facilities} />
        </div>
      </div>
    </ErrorBoundary>
  );
});

export default ConnectographyTab;

