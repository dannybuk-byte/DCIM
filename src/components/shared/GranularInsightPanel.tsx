/**
 * Granular Insight Panel
 * Provides maximum detail for pattern analysis insights
 * Includes facility drill-down, evidence timeline, raw data, and export
 * FULLSCREEN OVERLAY MODE: Click to expand and take over entire dashboard
 */

import React, { useState, useMemo, memo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  ChevronDown,
  ChevronRight,
  Building2,
  TrendingUp,
  TrendingDown,
  Clock,
  FileText,
  Download,
  ExternalLink,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  MapPin,
  DollarSign,
  Calendar,
  Target,
  Zap,
  BookOpen,
  Copy,
  Filter,
  Maximize2,
  Minimize2,
  X,
  ChevronLeft,
  BarChart3,
  Users,
  Globe
} from 'lucide-react';
import { Tooltip } from './Tooltip';
import { Facility } from '../../types';

export interface InsightEvidence {
  metric: string;
  beforeValue: number;
  afterValue: number;
  changePercent: number;
  timeframe: string;
}

export interface GranularInsightPanelProps {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  affectedFacilityIds: number[];
  facilities: Facility[];
  confidence: number;
  detectedAt: string;
  evidence: InsightEvidence[];
  recommendations: string[];
  sourcesCited: number[];
  onExport?: (insight: any) => void;
  onFacilityClick?: (facility: Facility) => void;
}

export const GranularInsightPanel = memo(function GranularInsightPanel({
  id,
  type,
  severity,
  title,
  description,
  affectedFacilityIds,
  facilities,
  confidence,
  detectedAt,
  evidence,
  recommendations,
  sourcesCited,
  onExport,
  onFacilityClick
}: GranularInsightPanelProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState<'overview' | 'facilities' | 'evidence' | 'raw' | 'recommendations'>('overview');
  const [facilitySearch, setFacilitySearch] = useState('');
  const [facilitySort, setFacilitySort] = useState<'name' | 'gap' | 'status'>('gap');
  const [selectedFacilityDetail, setSelectedFacilityDetail] = useState<Facility | null>(null);

  // Lock body scroll when fullscreen
  useEffect(() => {
    if (isFullscreen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

  // ESC key to close fullscreen
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setSelectedFacilityDetail(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  // Get full facility objects for affected facilities
  const affectedFacilities = useMemo(() => {
    return affectedFacilityIds
      .map(id => facilities.find(f => f.id === id))
      .filter((f): f is Facility => f !== undefined);
  }, [affectedFacilityIds, facilities]);

  // Filter and sort facilities
  const filteredFacilities = useMemo(() => {
    let result = affectedFacilities;
    
    if (facilitySearch) {
      const search = facilitySearch.toLowerCase();
      result = result.filter(f => 
        f.name.toLowerCase().includes(search) ||
        f.operator.toLowerCase().includes(search) ||
        f.state.toLowerCase().includes(search) ||
        f.city.toLowerCase().includes(search)
      );
    }
    
    return result.sort((a, b) => {
      switch (facilitySort) {
        case 'name': return a.name.localeCompare(b.name);
        case 'gap': return b.subsidyGap - a.subsidyGap;
        case 'status': return a.complianceStatus.localeCompare(b.complianceStatus);
        default: return 0;
      }
    });
  }, [affectedFacilities, facilitySearch, facilitySort]);

  // Calculate aggregated statistics
  const aggregatedStats = useMemo(() => {
    const total = affectedFacilities.length;
    const totalGap = affectedFacilities.reduce((sum, f) => sum + f.subsidyGap, 0);
    const avgGap = total > 0 ? totalGap / total : 0;
    const byStatus = {
      compliant: affectedFacilities.filter(f => f.complianceStatus === 'Compliant').length,
      nonCompliant: affectedFacilities.filter(f => f.complianceStatus === 'Non-Compliant').length,
      atRisk: affectedFacilities.filter(f => f.complianceStatus === 'At Risk').length,
      unknown: affectedFacilities.filter(f => f.complianceStatus === 'Unknown').length
    };
    const byState = new Map<string, number>();
    const byOperator = new Map<string, number>();
    affectedFacilities.forEach(f => {
      byState.set(f.state, (byState.get(f.state) || 0) + 1);
      byOperator.set(f.operator, (byOperator.get(f.operator) || 0) + 1);
    });
    return { total, totalGap, avgGap, byStatus, byState, byOperator };
  }, [affectedFacilities]);

  // Severity colors
  const severityColors = {
    critical: { bg: 'bg-red-900/30', border: 'border-red-700', text: 'text-red-400', badge: 'bg-red-500' },
    high: { bg: 'bg-orange-900/30', border: 'border-orange-700', text: 'text-orange-400', badge: 'bg-orange-500' },
    medium: { bg: 'bg-yellow-900/30', border: 'border-yellow-700', text: 'text-yellow-400', badge: 'bg-yellow-500' },
    low: { bg: 'bg-blue-900/30', border: 'border-blue-700', text: 'text-blue-400', badge: 'bg-blue-500' }
  };

  const colors = severityColors[severity];

  // Format currency
  const formatCurrency = (value: number) => {
    if (value >= 1e9) return `$${(value / 1e9).toFixed(2)}B`;
    if (value >= 1e6) return `$${(value / 1e6).toFixed(2)}M`;
    if (value >= 1e3) return `$${(value / 1e3).toFixed(1)}K`;
    return `$${value.toFixed(0)}`;
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Export insight as JSON
  const handleExport = () => {
    const exportData = {
      id,
      type,
      severity,
      title,
      description,
      affectedFacilities: affectedFacilities.map(f => ({
        id: f.id,
        name: f.name,
        operator: f.operator,
        state: f.state,
        city: f.city,
        complianceStatus: f.complianceStatus,
        subsidyGap: f.subsidyGap
      })),
      aggregatedStats,
      confidence,
      detectedAt,
      evidence,
      recommendations,
      sourcesCited,
      exportedAt: new Date().toISOString()
    };
    
    if (onExport) {
      onExport(exportData);
    } else {
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `insight-${id}-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  // Export as CSV
  const exportCSV = () => {
    const headers = ['Facility Name', 'Operator', 'State', 'City', 'Compliance Status', 'Subsidy Gap', 'Last Audit'];
    const rows = affectedFacilities.map(f => [
      f.name,
      f.operator,
      f.state,
      f.city,
      f.complianceStatus,
      f.subsidyGap,
      f.lastAuditDate
    ]);
    
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `insight-${id}-facilities.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Render the compact card (clickable to open fullscreen)
  const compactCard = (
    <div
      className={`border rounded-lg overflow-hidden transition-all duration-300 cursor-pointer hover:scale-[1.01] hover:shadow-lg hover:shadow-cyan-900/20 ${colors.bg} ${colors.border}`}
      onClick={() => {
        console.log('🚀 Opening fullscreen overlay');
        setIsFullscreen(true);
      }}
    >
      <div className="p-4">
        <div className="flex items-start gap-4">
          {/* Expand Icon */}
          <div className="mt-1">
            <Maximize2 className="w-5 h-5 text-cyan-400" />
          </div>

          {/* Severity Badge */}
          <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${colors.badge} text-white`}>
            {severity}
          </div>

          {/* Title and Description */}
          <div className="flex-1 min-w-0">
            <h3 className={`text-lg font-semibold ${colors.text}`}>{title}</h3>
            <p className="text-sm text-gray-400 mt-1 line-clamp-2">{description}</p>
          </div>

          {/* Quick Stats */}
          <div className="flex items-center gap-4 text-sm">
            <Tooltip content="Affected Facilities">
              <div className="flex items-center gap-1 text-gray-400">
                <Building2 className="w-4 h-4" />
                <span className="font-semibold">{aggregatedStats.total}</span>
              </div>
            </Tooltip>
            <Tooltip content="Total Subsidy Gap">
              <div className="flex items-center gap-1 text-yellow-400">
                <DollarSign className="w-4 h-4" />
                <span className="font-semibold">{formatCurrency(aggregatedStats.totalGap)}</span>
              </div>
            </Tooltip>
            <Tooltip content={`Confidence: ${Math.round(confidence * 100)}%`}>
              <div className="flex items-center gap-1 text-cyan-400">
                <Target className="w-4 h-4" />
                <span className="font-semibold">{Math.round(confidence * 100)}%</span>
              </div>
            </Tooltip>
          </div>

          {/* Click to expand hint */}
          <div className="text-xs text-gray-500 flex items-center gap-1">
            <span>Click to expand</span>
            <Maximize2 className="w-3 h-3" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {compactCard}
      {isFullscreen && createPortal(
        <div 
          id="fullscreen-insight-overlay"
        >
          {/* Header Bar */}
          <div className={`sticky top-0 z-10 ${colors.bg} border-b ${colors.border} px-6 py-4`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => {
                    setIsFullscreen(false);
                    setSelectedFacilityDetail(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors flex items-center gap-2 text-gray-400 hover:text-white"
                >
                  <ChevronLeft className="w-5 h-5" />
                  <span className="text-sm">Back</span>
                </button>
                <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${colors.badge} text-white`}>
                  {severity}
                </div>
                <h1 className={`text-2xl font-bold ${colors.text}`}>{title}</h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExport}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Export
                </button>
                <button
                  onClick={() => {
                    setIsFullscreen(false);
                    setSelectedFacilityDetail(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6 text-gray-400 hover:text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Main Content Area */}
          <div className="h-[calc(100vh-80px)] overflow-y-auto">
            <div className="max-w-7xl mx-auto p-6 space-y-6">
              {/* Description */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <p className="text-lg text-gray-300 leading-relaxed">{description}</p>
                <div className="flex items-center gap-4 mt-4 text-sm text-gray-500">
                  <span>Detected: {new Date(detectedAt).toLocaleString()}</span>
                  <span>•</span>
                  <span>Confidence: {Math.round(confidence * 100)}%</span>
                  <span>•</span>
                  <span>Type: {type.replace(/_/g, ' ').toUpperCase()}</span>
                </div>
              </div>

              {/* Key Metrics Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-cyan-700 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Building2 className="w-5 h-5" />
                    <span className="text-sm">Facilities</span>
                  </div>
                  <div className="text-3xl font-bold text-white">{aggregatedStats.total}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-yellow-700 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <DollarSign className="w-5 h-5" />
                    <span className="text-sm">Total Gap</span>
                  </div>
                  <div className="text-3xl font-bold text-yellow-400">{formatCurrency(aggregatedStats.totalGap)}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-orange-700 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <BarChart3 className="w-5 h-5" />
                    <span className="text-sm">Avg Gap</span>
                  </div>
                  <div className="text-3xl font-bold text-orange-400">{formatCurrency(aggregatedStats.avgGap)}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-red-700 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <XCircle className="w-5 h-5" />
                    <span className="text-sm">Non-Compliant</span>
                  </div>
                  <div className="text-3xl font-bold text-red-400">{aggregatedStats.byStatus.nonCompliant}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-purple-700 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Globe className="w-5 h-5" />
                    <span className="text-sm">States</span>
                  </div>
                  <div className="text-3xl font-bold text-purple-400">{aggregatedStats.byState.size}</div>
                </div>
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-cyan-700 transition-colors">
                  <div className="flex items-center gap-2 text-gray-400 mb-2">
                    <Users className="w-5 h-5" />
                    <span className="text-sm">Operators</span>
                  </div>
                  <div className="text-3xl font-bold text-cyan-400">{aggregatedStats.byOperator.size}</div>
                </div>
              </div>

              {/* Detail Tabs */}
              <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                <div className="flex border-b border-gray-800 overflow-x-auto">
                  {(['overview', 'facilities', 'evidence', 'raw', 'recommendations'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setActiveDetailTab(tab)}
                      className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                        activeDetailTab === tab
                          ? 'text-cyan-400 border-b-2 border-cyan-400 bg-cyan-900/20'
                          : 'text-gray-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      {tab === 'overview' && <><BarChart3 className="w-4 h-4 inline mr-2" />Overview</>}
                      {tab === 'facilities' && <><Building2 className="w-4 h-4 inline mr-2" />Facilities ({filteredFacilities.length})</>}
                      {tab === 'evidence' && <><FileText className="w-4 h-4 inline mr-2" />Evidence ({evidence.length})</>}
                      {tab === 'raw' && <><Info className="w-4 h-4 inline mr-2" />Raw Data</>}
                      {tab === 'recommendations' && <><Target className="w-4 h-4 inline mr-2" />Actions ({recommendations.length})</>}
                    </button>
                  ))}
                </div>

                <div className="p-6">
                  {/* Overview Tab */}
                  {activeDetailTab === 'overview' && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* By Status Breakdown */}
                      <div className="bg-gray-800/50 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-white mb-4">Compliance Status Breakdown</h3>
                        <div className="space-y-3">
                          {[
                            { label: 'Compliant', count: aggregatedStats.byStatus.compliant, color: 'bg-green-500' },
                            { label: 'Non-Compliant', count: aggregatedStats.byStatus.nonCompliant, color: 'bg-red-500' },
                            { label: 'At Risk', count: aggregatedStats.byStatus.atRisk, color: 'bg-yellow-500' },
                            { label: 'Unknown', count: aggregatedStats.byStatus.unknown, color: 'bg-gray-500' }
                          ].map(item => (
                            <div key={item.label} className="flex items-center gap-3">
                              <div className={`w-3 h-3 rounded-full ${item.color}`} />
                              <span className="text-gray-300 flex-1">{item.label}</span>
                              <span className="text-white font-semibold">{item.count}</span>
                              <span className="text-gray-500 text-sm w-16 text-right">
                                {aggregatedStats.total > 0 ? ((item.count / aggregatedStats.total) * 100).toFixed(1) : 0}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top States */}
                      <div className="bg-gray-800/50 rounded-xl p-5">
                        <h3 className="text-lg font-semibold text-white mb-4">Top Affected States</h3>
                        <div className="space-y-3">
                          {Array.from(aggregatedStats.byState.entries())
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 5)
                            .map(([state, count]) => (
                              <div key={state} className="flex items-center gap-3">
                                <span className="text-gray-300 flex-1">{state}</span>
                                <div className="flex-1 bg-gray-700 rounded-full h-2 max-w-[200px]">
                                  <div
                                    className="bg-purple-500 h-full rounded-full"
                                    style={{ width: `${(count / Math.max(...Array.from(aggregatedStats.byState.values()))) * 100}%` }}
                                  />
                                </div>
                                <span className="text-white font-semibold w-12 text-right">{count}</span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Top Operators */}
                      <div className="bg-gray-800/50 rounded-xl p-5 lg:col-span-2">
                        <h3 className="text-lg font-semibold text-white mb-4">Top Affected Operators</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {Array.from(aggregatedStats.byOperator.entries())
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 8)
                            .map(([operator, count]) => (
                              <div key={operator} className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                                <div className="text-sm text-gray-400 truncate">{operator}</div>
                                <div className="text-2xl font-bold text-cyan-400">{count}</div>
                              </div>
                            ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Facilities Tab */}
                  {activeDetailTab === 'facilities' && (
                    <div className="space-y-4">
                      {/* Search and Filter */}
                      <div className="flex flex-wrap gap-3 items-center">
                        <div className="flex-1 min-w-[300px]">
                          <input
                            type="text"
                            placeholder="Search by name, operator, state, or city..."
                            value={facilitySearch}
                            onChange={e => setFacilitySearch(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">Sort:</span>
                          {(['name', 'gap', 'status'] as const).map(sort => (
                            <button
                              key={sort}
                              onClick={() => setFacilitySort(sort)}
                              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                                facilitySort === sort
                                  ? 'bg-cyan-600 text-white'
                                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                              }`}
                            >
                              {sort === 'gap' ? 'Subsidy Gap' : sort.charAt(0).toUpperCase() + sort.slice(1)}
                            </button>
                          ))}
                        </div>
                        <button
                          onClick={exportCSV}
                          className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Export CSV
                        </button>
                      </div>

                      {/* Results count */}
                      <div className="text-sm text-gray-400">
                        Showing {filteredFacilities.length} of {affectedFacilities.length} facilities
                      </div>

                      {/* Facilities Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {filteredFacilities.map(facility => (
                          <div
                            key={facility.id}
                            className="bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-cyan-600 transition-all cursor-pointer hover:scale-[1.02]"
                            onClick={() => setSelectedFacilityDetail(facility)}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="font-semibold text-white text-lg truncate flex-1">{facility.name}</div>
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                facility.complianceStatus === 'Compliant' ? 'bg-green-900/50 text-green-400' :
                                facility.complianceStatus === 'Non-Compliant' ? 'bg-red-900/50 text-red-400' :
                                facility.complianceStatus === 'At Risk' ? 'bg-yellow-900/50 text-yellow-400' :
                                'bg-gray-700 text-gray-400'
                              }`}>
                                {facility.complianceStatus}
                              </span>
                            </div>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center gap-2 text-gray-400">
                                <Building2 className="w-4 h-4" />
                                <span className="truncate">{facility.operator}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-400">
                                <MapPin className="w-4 h-4" />
                                <span>{facility.city}, {facility.state}</span>
                              </div>
                              <div className="flex items-center gap-2 text-yellow-400">
                                <DollarSign className="w-4 h-4" />
                                <span className="font-bold text-lg">{formatCurrency(facility.subsidyGap)}</span>
                              </div>
                              <div className="flex items-center gap-2 text-gray-500 text-xs">
                                <Calendar className="w-3 h-3" />
                                <span>Last audit: {new Date(facility.lastAuditDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {filteredFacilities.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          No facilities match your search criteria.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Evidence Tab */}
                  {activeDetailTab === 'evidence' && (
                    <div className="space-y-6">
                      <div className="relative">
                        <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-cyan-500/50 to-transparent" />
                        {evidence.map((item, index) => (
                          <div key={index} className="relative pl-16 pb-8">
                            <div className="absolute left-4 w-5 h-5 rounded-full bg-cyan-500 border-4 border-gray-900 shadow-lg shadow-cyan-500/30" />
                            <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
                              <div className="flex items-start justify-between mb-4">
                                <h4 className="text-xl font-semibold text-white">{item.metric}</h4>
                                <span className="px-3 py-1 bg-gray-700 rounded-full text-xs text-gray-400">{item.timeframe}</span>
                              </div>
                              <div className="grid grid-cols-3 gap-6">
                                <div>
                                  <div className="text-sm text-gray-400 mb-2">Before</div>
                                  <div className="text-2xl font-bold text-gray-300">
                                    {typeof item.beforeValue === 'number' && item.beforeValue > 10000
                                      ? formatCurrency(item.beforeValue)
                                      : item.beforeValue.toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-400 mb-2">After</div>
                                  <div className="text-2xl font-bold text-white">
                                    {typeof item.afterValue === 'number' && item.afterValue > 10000
                                      ? formatCurrency(item.afterValue)
                                      : item.afterValue.toLocaleString()}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-400 mb-2">Change</div>
                                  <div className={`text-2xl font-bold flex items-center gap-2 ${
                                    item.changePercent > 0 ? 'text-red-400' : item.changePercent < 0 ? 'text-green-400' : 'text-gray-400'
                                  }`}>
                                    {item.changePercent > 0 ? <TrendingUp className="w-6 h-6" /> : item.changePercent < 0 ? <TrendingDown className="w-6 h-6" /> : null}
                                    {item.changePercent > 0 ? '+' : ''}{item.changePercent === Infinity ? '∞' : item.changePercent.toFixed(1)}%
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {evidence.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          No evidence data available for this insight.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Raw Data Tab */}
                  {activeDetailTab === 'raw' && (
                    <div className="space-y-4">
                      <div className="bg-gray-800 rounded-xl p-6 font-mono text-sm overflow-x-auto max-h-[400px] overflow-y-auto">
                        <pre className="text-gray-300 whitespace-pre-wrap">
{JSON.stringify({
  id,
  type,
  severity,
  confidence,
  detectedAt,
  aggregatedStats: {
    totalFacilities: aggregatedStats.total,
    totalSubsidyGap: aggregatedStats.totalGap,
    avgSubsidyGap: aggregatedStats.avgGap,
    byStatus: aggregatedStats.byStatus,
    statesAffected: Array.from(aggregatedStats.byState.entries()),
    operatorsAffected: Array.from(aggregatedStats.byOperator.entries())
  },
  affectedFacilityIds,
  evidence,
  recommendations,
  sourcesCited
}, null, 2)}
                        </pre>
                      </div>
                      <div className="flex gap-3">
                        <button
                          onClick={() => copyToClipboard(JSON.stringify({ id, type, severity, confidence, detectedAt, aggregatedStats, affectedFacilityIds, evidence, recommendations, sourcesCited }, null, 2))}
                          className="px-5 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                          Copy JSON
                        </button>
                        <button
                          onClick={handleExport}
                          className="px-5 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
                        >
                          <Download className="w-4 h-4" />
                          Download Full Report
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Recommendations Tab */}
                  {activeDetailTab === 'recommendations' && (
                    <div className="space-y-6">
                      <div className="space-y-4">
                        {recommendations.map((rec, index) => (
                          <div
                            key={index}
                            className="flex items-start gap-4 bg-gray-800 border border-gray-700 rounded-xl p-5 hover:border-cyan-700 transition-colors"
                          >
                            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-cyan-900/50 text-cyan-400 flex items-center justify-center font-bold text-lg">
                              {index + 1}
                            </div>
                            <div className="flex-1">
                              <p className="text-gray-200 text-lg">{rec}</p>
                            </div>
                            <button
                              onClick={() => copyToClipboard(rec)}
                              className="p-3 hover:bg-white/10 rounded-lg transition-colors"
                            >
                              <Copy className="w-5 h-5 text-gray-400 hover:text-white" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Source Citations */}
                      {sourcesCited.length > 0 && (
                        <div className="mt-8 p-6 bg-purple-900/20 border border-purple-800 rounded-xl">
                          <h4 className="text-lg font-semibold text-purple-300 mb-4 flex items-center gap-2">
                            <BookOpen className="w-5 h-5" />
                            Source Citations
                          </h4>
                          <div className="flex flex-wrap gap-3">
                            {sourcesCited.map(sourceId => (
                              <span
                                key={sourceId}
                                className="px-4 py-2 bg-purple-900/50 text-purple-300 rounded-full text-sm font-medium hover:bg-purple-800/50 cursor-pointer transition-colors"
                              >
                                [Source {sourceId}]
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {recommendations.length === 0 && (
                        <div className="text-center py-12 text-gray-400">
                          No recommendations available for this insight.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Facility Detail Slide-over */}
          {selectedFacilityDetail && (
            <div
              className="fixed inset-y-0 right-0 w-full md:w-[600px] bg-gray-900 border-l border-gray-700 shadow-2xl z-[10000] overflow-y-auto"
            >
              <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-xl font-bold text-white">{selectedFacilityDetail.name}</h2>
                  <p className="text-sm text-gray-400">{selectedFacilityDetail.operator}</p>
                </div>
                <button
                  onClick={() => setSelectedFacilityDetail(null)}
                  className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Status */}
                <div className="flex items-center gap-4">
                  <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                    selectedFacilityDetail.complianceStatus === 'Compliant' ? 'bg-green-900/50 text-green-400' :
                    selectedFacilityDetail.complianceStatus === 'Non-Compliant' ? 'bg-red-900/50 text-red-400' :
                    selectedFacilityDetail.complianceStatus === 'At Risk' ? 'bg-yellow-900/50 text-yellow-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {selectedFacilityDetail.complianceStatus}
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Subsidy Gap</div>
                    <div className="text-2xl font-bold text-yellow-400">
                      {formatCurrency(selectedFacilityDetail.subsidyGap)}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Location</div>
                    <div className="text-lg font-semibold text-white">
                      {selectedFacilityDetail.city}, {selectedFacilityDetail.state}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Last Audit</div>
                    <div className="text-lg font-semibold text-white">
                      {new Date(selectedFacilityDetail.lastAuditDate).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="bg-gray-800 rounded-lg p-4">
                    <div className="text-xs text-gray-400 mb-1">Facility Type</div>
                    <div className="text-lg font-semibold text-white">
                      {selectedFacilityDetail.facilityType || 'Data Center'}
                    </div>
                  </div>
                </div>

                {/* Full Details */}
                <div className="bg-gray-800 rounded-lg p-5 space-y-4">
                  <h3 className="text-lg font-semibold text-white border-b border-gray-700 pb-2">Full Details</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Address: </span>
                      <span className="text-white">{selectedFacilityDetail.address || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Power Capacity: </span>
                      <span className="text-white">{selectedFacilityDetail.powerCapacityMW ? `${selectedFacilityDetail.powerCapacityMW} MW` : 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Jobs Promised: </span>
                      <span className="text-white">{selectedFacilityDetail.jobsPromised?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Jobs Created: </span>
                      <span className="text-white">{selectedFacilityDetail.jobsCreated?.toLocaleString() || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Tax Incentives: </span>
                      <span className="text-white">
                        {selectedFacilityDetail.taxIncentives ? formatCurrency(selectedFacilityDetail.taxIncentives) : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400">Year Established: </span>
                      <span className="text-white">{selectedFacilityDetail.yearEstablished || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {selectedFacilityDetail.issues && selectedFacilityDetail.issues.length > 0 && (
                  <div className="bg-red-900/20 border border-red-800 rounded-lg p-5">
                    <h3 className="text-lg font-semibold text-red-400 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Active Issues
                    </h3>
                    <ul className="space-y-2">
                      {selectedFacilityDetail.issues.map((issue, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-red-300">
                          <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
});

export default GranularInsightPanel;

