/**
 * Sanctions Overview Dashboard
 * Main dashboard for the OFAC Sanctions Monitor module
 * 
 * Features:
 * - Risk summary statistics
 * - High-risk facility list
 * - SDN search panel
 * - Quick reporting access
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle,
  Shield,
  Search,
  FileText,
  Phone,
  Building2,
  TrendingUp,
  Globe,
  Users,
  RefreshCw,
  Filter,
} from 'lucide-react';
import { ContextualNLPWidget, SectionNLPBar } from '../../../components/shared/ContextualNLPWidget';
import { NLPAction } from '../../../hooks/useSectionNLP';
import { HelpIcon } from '../../../components/shared/InlineHelpButton';
import { FacilityRiskCard } from './FacilityRiskCard';
import { AwardCalculator } from './AwardCalculator';
import { ReportingChannels } from './ReportingChannels';
import { SDNSearchPanel } from './SDNSearchPanel';
import { 
  FacilityRiskScore, 
  RiskLevel 
} from '../types/sanctions';
import { 
  calculateSanctionsRiskScore,
  getRiskLevel,
  getRiskLevelColor,
  getHighRiskFacilities,
} from '../services/riskScoring';
import { getSDNStats, fetchSDNList } from '../services/sdnService';
import { Facility } from '../../../types';

interface SanctionsOverviewProps {
  facilities: Facility[];
}

export const SanctionsOverview: React.FC<SanctionsOverviewProps> = ({ facilities }) => {
  const [riskScores, setRiskScores] = useState<FacilityRiskScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [sdnStats, setSdnStats] = useState<{
    totalEntries: number;
    byProgram: Record<string, number>;
    lastUpdated: string;
  } | null>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'search' | 'report' | 'awards'>('overview');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | 'ALL'>('ALL');
  const [selectedFacility, setSelectedFacility] = useState<string | null>(null);

  // Calculate risk scores on mount
  useEffect(() => {
    const calculateRisks = async () => {
      setLoading(true);
      try {
        // Fetch SDN stats
        const stats = await getSDNStats();
        setSdnStats(stats);

        // Calculate risk scores for facilities (sample for demo)
        const sampleFacilities = facilities.slice(0, 50).map((f) => ({
          facilityId: f.id.toString(),
          tenants: [f.operator], // Using operator as tenant for demo
          connectedASNs: [], // Would come from BGP monitoring
          trafficCountries: [], // Would come from network analysis
        }));

        const scores = await Promise.all(
          sampleFacilities.map((f) => calculateSanctionsRiskScore(f))
        );

        setRiskScores(scores);
      } catch (error) {
        console.error('Failed to calculate risk scores:', error);
      } finally {
        setLoading(false);
      }
    };

    calculateRisks();
  }, [facilities]);

  // Filter and sort risk scores
  const filteredScores = useMemo(() => {
    let filtered = [...riskScores];
    if (riskFilter !== 'ALL') {
      filtered = filtered.filter((s) => s.riskLevel === riskFilter);
    }
    return filtered.sort((a, b) => b.score - a.score);
  }, [riskScores, riskFilter]);

  // Risk distribution stats
  const riskDistribution = useMemo(() => {
    const dist = {
      CRITICAL: 0,
      HIGH: 0,
      MODERATE: 0,
      LOW: 0,
      MINIMAL: 0,
    };
    riskScores.forEach((s) => {
      dist[s.riskLevel]++;
    });
    return dist;
  }, [riskScores]);

  // High-risk count
  const highRiskCount = riskDistribution.CRITICAL + riskDistribution.HIGH;
  const avgScore = riskScores.length > 0 
    ? Math.round(riskScores.reduce((sum, s) => sum + s.score, 0) / riskScores.length)
    : 0;

  // Handle NLP actions
  const handleNLPAction = useCallback((action: NLPAction) => {
    console.log('Sanctions NLP Action:', action);
    if (action.type === 'filter') {
      const payload = action.payload as { riskLevel?: string };
      if (payload.riskLevel) {
        setRiskFilter(payload.riskLevel as RiskLevel);
      }
    } else if (action.type === 'navigate') {
      setSelectedTab('search');
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600 rounded-lg">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">OFAC Sanctions Monitor</h1>
              <p className="text-sm text-slate-400">Network Hygiene Enforcement Dashboard</p>
            </div>
          </div>
          {/* Inline NLP Search */}
          <div className="flex items-center gap-2">
            <div className="w-72">
              <SectionNLPBar 
                context="sanctions" 
                placeholder="Ask about sanctions risk..."
                onAction={handleNLPAction}
              />
            </div>
            <HelpIcon context="sanctions" />
          </div>
        </div>
        
        {/* Legal Disclaimer */}
        <div className="mt-4 p-3 bg-violet-900/30 border border-violet-700 rounded-lg">
          <p className="text-xs text-violet-300">
            <strong>Legal Basis:</strong> International Emergency Economic Powers Act (IEEPA) | 
            <strong> Liability Standard:</strong> STRICT (no knowledge/intent required) | 
            <strong> Whistleblower Awards:</strong> 10-30% of sanctions &gt; $1M (AMLA)
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 mb-6 border-b border-slate-800 pb-2">
        {[
          { id: 'overview', label: 'Overview', icon: TrendingUp },
          { id: 'search', label: 'SDN Search', icon: Search },
          { id: 'report', label: 'File Report', icon: FileText },
          { id: 'awards', label: 'Awards Calculator', icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setSelectedTab(id as typeof selectedTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-t text-sm font-medium transition-colors ${
              selectedTab === id
                ? 'bg-slate-800 text-white border-b-2 border-violet-500'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Facilities Monitored */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-600/20 rounded">
                  <Building2 className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{facilities.length.toLocaleString()}</div>
                  <div className="text-xs text-slate-400">Facilities Monitored</div>
                </div>
              </div>
            </div>

            {/* High Risk */}
            <div className="bg-slate-900 border border-red-900/50 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600/20 rounded">
                  <AlertTriangle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold text-red-400">{highRiskCount}</div>
                  <div className="text-xs text-slate-400">High Risk Facilities</div>
                </div>
              </div>
            </div>

            {/* SDN Entries */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-violet-600/20 rounded">
                  <Globe className="w-5 h-5 text-violet-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{sdnStats?.totalEntries.toLocaleString() || '—'}</div>
                  <div className="text-xs text-slate-400">SDN List Entries</div>
                </div>
              </div>
            </div>

            {/* Average Score */}
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-600/20 rounded">
                  <TrendingUp className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{avgScore}</div>
                  <div className="text-xs text-slate-400">Avg Risk Score</div>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Distribution */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-300 mb-3">Risk Distribution</h3>
            <div className="flex items-end gap-2 h-24">
              {(['MINIMAL', 'LOW', 'MODERATE', 'HIGH', 'CRITICAL'] as RiskLevel[]).map((level) => {
                const count = riskDistribution[level];
                const maxCount = Math.max(...Object.values(riskDistribution), 1);
                const height = (count / maxCount) * 100;
                return (
                  <div key={level} className="flex-1 flex flex-col items-center gap-1">
                    <div 
                      className="w-full rounded-t transition-all duration-500"
                      style={{ 
                        height: `${height}%`,
                        backgroundColor: getRiskLevelColor(level),
                        minHeight: count > 0 ? '8px' : '0',
                      }}
                    />
                    <div className="text-xs font-bold" style={{ color: getRiskLevelColor(level) }}>
                      {count}
                    </div>
                    <div className="text-[10px] text-slate-500">{level}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Facility Risk Cards */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Facility Risk Assessment</h3>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value as RiskLevel | 'ALL')}
                  className="bg-slate-800 border border-slate-700 rounded px-3 py-1 text-sm"
                >
                  <option value="ALL">All Risks</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="HIGH">High</option>
                  <option value="MODERATE">Moderate</option>
                  <option value="LOW">Low</option>
                  <option value="MINIMAL">Minimal</option>
                </select>
                <button
                  onClick={() => window.location.reload()}
                  className="p-2 bg-slate-800 hover:bg-slate-700 rounded transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-slate-800 rounded-lg p-4 animate-pulse">
                    <div className="h-4 bg-slate-700 rounded w-3/4 mb-2" />
                    <div className="h-3 bg-slate-700 rounded w-1/2 mb-4" />
                    <div className="h-2 bg-slate-700 rounded w-full" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredScores.slice(0, 10).map((score) => {
                  const facility = facilities.find((f) => f.id.toString() === score.facilityId);
                  if (!facility) return null;
                  return (
                    <FacilityRiskCard
                      key={score.facilityId}
                      facilityName={facility.name}
                      location={`${facility.city}, ${facility.state}`}
                      operator={facility.operator}
                      riskScore={score}
                      onFileReport={() => setSelectedTab('report')}
                      onViewDetails={() => setSelectedFacility(score.facilityId)}
                    />
                  );
                })}
              </div>
            )}

            {filteredScores.length === 0 && !loading && (
              <div className="text-center py-8 text-slate-400">
                No facilities match the selected filter
              </div>
            )}
          </div>

          {/* OFAC Contact */}
          <div className="bg-violet-900/20 border border-violet-700 rounded-lg p-4 flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-violet-300">Report Suspected Violations</h4>
              <p className="text-sm text-violet-400">OFAC Hotline: 1-800-540-6322</p>
            </div>
            <a
              href="tel:1-800-540-6322"
              className="px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg font-semibold text-sm flex items-center gap-2 transition-colors"
            >
              <Phone className="w-4 h-4" />
              Call OFAC
            </a>
          </div>
        </div>
      )}

      {/* SDN Search Tab */}
      {selectedTab === 'search' && (
        <SDNSearchPanel />
      )}

      {/* Report Tab */}
      {selectedTab === 'report' && (
        <ReportingChannels />
      )}

      {/* Awards Tab */}
      {selectedTab === 'awards' && (
        <AwardCalculator />
      )}
      
      {/* Floating NLP Assistant */}
      <ContextualNLPWidget
        context="sanctions"
        mode="floating"
        onAction={handleNLPAction}
        dataContext={{
          itemCount: riskScores.length,
          filters: { riskFilter },
        }}
      />
    </div>
  );
};

