/**
 * Security Overview Dashboard
 * 
 * Aggregate view of security posture across all facilities.
 * Displays portfolio-wide security metrics and risk distribution.
 * 
 * Antifragility Features:
 * - Works with 0 facilities (graceful empty state)
 * - Error boundaries around calculations
 * - Progressive enhancement (no required dependencies)
 * - Performance optimized with memoization
 */

import React, { useMemo } from 'react';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Activity, Target } from 'lucide-react';
import { 
  batchCalculateSecurityPosture, 
  getAggregateSecurityStats,
  getRiskLevelColor,
  type SecurityPosture 
} from '../utils/securityPosture';
import type { Facility } from '../types';

interface SecurityOverviewProps {
  facilities: Facility[];
  className?: string;
}

export const SecurityOverview: React.FC<SecurityOverviewProps> = React.memo(({ facilities, className = '' }) => {
  // Calculate all security postures (memoized)
  const postures = useMemo(() => {
    try {
      return batchCalculateSecurityPosture(facilities);
    } catch (error) {
      console.error('[SecurityOverview] Batch calculation error:', error);
      return [];
    }
  }, [facilities]);

  // Calculate aggregate statistics
  const stats = useMemo(() => {
    try {
      return getAggregateSecurityStats(postures);
    } catch (error) {
      console.error('[SecurityOverview] Stats calculation error:', error);
      return {
        averageScore: 0,
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
        topRiskFactors: [],
      };
    }
  }, [postures]);

  if (facilities.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Average Score */}
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Average Score</p>
              <p className="text-2xl font-bold text-white">{stats.averageScore}</p>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            Across {postures.length.toLocaleString()} facilities
          </div>
        </div>

        {/* Low Risk */}
        <RiskDistributionCard 
          riskLevel="low" 
          count={stats.riskDistribution.low} 
          total={postures.length}
        />

        {/* Medium Risk */}
        <RiskDistributionCard 
          riskLevel="medium" 
          count={stats.riskDistribution.medium} 
          total={postures.length}
        />

        {/* High/Critical Risk */}
        <div className="bg-slate-900 border border-red-500/30 rounded-lg p-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <p className="text-sm text-slate-400">High/Critical</p>
              <p className="text-2xl font-bold text-red-400">
                {stats.riskDistribution.high + stats.riskDistribution.critical}
              </p>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            {((stats.riskDistribution.high + stats.riskDistribution.critical) / postures.length * 100).toFixed(1)}% of portfolio
          </div>
        </div>
      </div>

      {/* Risk Distribution Chart */}
      <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5 text-cyan-400" />
          Risk Distribution
        </h3>
        
        <div className="space-y-3">
          <RiskBar 
            label="Low Risk" 
            count={stats.riskDistribution.low} 
            total={postures.length} 
            color="green"
          />
          <RiskBar 
            label="Medium Risk" 
            count={stats.riskDistribution.medium} 
            total={postures.length} 
            color="yellow"
          />
          <RiskBar 
            label="High Risk" 
            count={stats.riskDistribution.high} 
            total={postures.length} 
            color="orange"
          />
          <RiskBar 
            label="Critical Risk" 
            count={stats.riskDistribution.critical} 
            total={postures.length} 
            color="red"
          />
        </div>
      </div>

      {/* Top Risk Factors */}
      {stats.topRiskFactors.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-400" />
            Top Risk Factors
          </h3>
          
          <div className="space-y-2">
            {stats.topRiskFactors.map((factor, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-md">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryIcon(factor.category)}</span>
                  <span className="text-sm font-semibold text-slate-300 capitalize">
                    {factor.category.replace('-', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-400">
                    {factor.count} facilities affected
                  </span>
                  <div className="px-2 py-1 bg-orange-500/10 border border-orange-500/30 rounded text-xs font-semibold text-orange-400">
                    {((factor.count / postures.length) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Methodology Attribution */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white mb-1">
              Security Posture Methodology
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              Based on <strong>Jason Haddix's offensive security framework</strong> (Arcanum Security, former Ubisoft CISO).
              Scores incorporate compliance risk, data quality, provider verification, disclosure transparency, and infrastructure
              pattern analysis. Uses client-side reconnaissance techniques from The Bug Hunter's Methodology (TBHM).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
});

SecurityOverview.displayName = 'SecurityOverview';

/**
 * Risk Distribution Card Component
 */
const RiskDistributionCard: React.FC<{
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  total: number;
}> = React.memo(({ riskLevel, count, total }) => {
  const colors = getRiskLevelColor(riskLevel);
  const percentage = total > 0 ? (count / total * 100).toFixed(1) : '0';

  return (
    <div className={`bg-slate-900 border ${colors.border} rounded-lg p-4`}>
      <div className="flex items-center gap-3 mb-2">
        <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center`}>
          <TrendingUp className={`w-5 h-5 ${colors.text}`} />
        </div>
        <div>
          <p className="text-sm text-slate-400 capitalize">{riskLevel} Risk</p>
          <p className={`text-2xl font-bold ${colors.text}`}>{count}</p>
        </div>
      </div>
      <div className="text-xs text-slate-500">
        {percentage}% of portfolio
      </div>
    </div>
  );
});

RiskDistributionCard.displayName = 'RiskDistributionCard';

/**
 * Risk Bar Chart Component
 */
const RiskBar: React.FC<{
  label: string;
  count: number;
  total: number;
  color: 'green' | 'yellow' | 'orange' | 'red';
}> = React.memo(({ label, count, total, color }) => {
  const percentage = total > 0 ? (count / total * 100) : 0;

  const colorClasses = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-300">{label}</span>
        <span className="text-sm text-slate-400">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div 
          className={`h-full ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
});

RiskBar.displayName = 'RiskBar';

/**
 * Empty State Component
 */
const EmptyState: React.FC = () => (
  <div className="bg-slate-900 border border-slate-700 rounded-lg p-12 text-center">
    <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
    <h3 className="text-xl font-bold text-white mb-2">No Facilities to Analyze</h3>
    <p className="text-sm text-slate-400">
      Load facility data to see security posture analysis
    </p>
  </div>
);

/**
 * Get emoji icon for risk category
 */
function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'compliance': '⚖️',
    'data-quality': '📊',
    'provider': '🏢',
    'disclosure': '🔍',
    'infrastructure': '🖥️',
  };
  return icons[category] || '📋';
}

/**
 * Info icon import
 */
import { Info } from 'lucide-react';

export default SecurityOverview;

