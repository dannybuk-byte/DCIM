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
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Activity, Target, HelpCircle } from 'lucide-react';
import { 
  batchCalculateSecurityPosture, 
  getAggregateSecurityStats,
  getRiskLevelColor,
  type SecurityPosture 
} from '../utils/securityPosture';
import { getRiskLevelInfo, formatForOrganizers, getContextualHelp } from '../utils/plainLanguage'; // NEW: Plain language utilities
import type { Facility } from '../types';

interface SecurityOverviewProps {
  facilities: Facility[];
  className?: string;
}

export const SecurityOverview: React.FC<SecurityOverviewProps> = React.memo(({ facilities, className = '' }) => {
  const [showHelp, setShowHelp] = React.useState(false);

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
      {/* Header with Help */}
      <div className="group bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-2 border-blue-500/30 rounded-lg p-6 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/30 transition-all duration-500">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3 group-hover:text-blue-300 transition-colors duration-300">
              <Shield className="w-8 h-8 text-blue-400 group-hover:scale-125 group-hover:rotate-12 group-hover:text-blue-300 transition-all duration-500" />
              Facility Accountability Overview
            </h2>
            <p className="text-lg text-slate-300 group-hover:text-white transition-colors duration-300">
              Which data centers are keeping their job creation promises?
            </p>
          </div>
          <button
            onClick={() => setShowHelp(!showHelp)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors hover:scale-110 transition-all duration-300"
            title="What am I looking at?"
          >
            <HelpCircle className="w-6 h-6 text-blue-400 hover:text-blue-300 hover:rotate-12 transition-all duration-300" />
          </button>
        </div>

        {showHelp && (
          <div className="mt-4 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <h3 className="text-sm font-bold text-white mb-2">What am I looking at?</h3>
            <p className="text-sm text-slate-300 mb-3">
              This dashboard shows which data centers are breaking their promises. When companies get tax breaks
              or subsidies, they promise to create jobs. This tracks whether they're keeping those promises.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-400 font-bold">✓</span>
                <span className="text-slate-300"><strong className="text-white">Good Standing:</strong> Meeting job promises</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-yellow-400 font-bold">⚠</span>
                <span className="text-slate-300"><strong className="text-white">Needs Attention:</strong> Falling behind</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-red-400 font-bold">🚨</span>
                <span className="text-slate-300"><strong className="text-white">Major Violation:</strong> Broken promises - hold them accountable</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Average Score */}
        <div className="group bg-slate-900 border-2 border-slate-700 rounded-lg p-4 hover:border-blue-500 hover:shadow-lg hover:shadow-blue-500/30 hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 group-hover:bg-blue-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
              <Shield className="w-5 h-5 text-blue-400 group-hover:text-blue-300 group-hover:rotate-12 transition-all duration-300" />
            </div>
            <div>
              <p className="text-sm text-slate-400 group-hover:text-white transition-colors duration-300">Average Accountability</p>
              <p className="text-2xl font-bold text-white group-hover:text-blue-300 group-hover:scale-110 transition-all duration-300">{stats.averageScore}/100</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors duration-300">
            Tracking {postures.length.toLocaleString()} facilities
          </div>
        </div>

        {/* Good Standing */}
        <div className="group bg-slate-900 border-2 border-green-500/30 rounded-lg p-4 hover:border-green-500 hover:shadow-lg hover:shadow-green-500/30 hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-green-500/10 group-hover:bg-green-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300">
              <TrendingUp className="w-5 h-5 text-green-400 group-hover:text-green-300 group-hover:translate-y-[-4px] transition-all duration-300" />
            </div>
            <div>
              <p className="text-sm text-slate-400 group-hover:text-white transition-colors duration-300">Good Standing</p>
              <p className="text-2xl font-bold text-green-400 group-hover:text-green-300 group-hover:scale-110 transition-all duration-300">{stats.riskDistribution.low}</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors duration-300">
            Meeting job promises
          </div>
        </div>

        {/* Needs Attention */}
        <div className="group bg-slate-900 border-2 border-yellow-500/30 rounded-lg p-4 hover:border-yellow-500 hover:shadow-lg hover:shadow-yellow-500/30 hover:scale-105 transition-all duration-300 cursor-pointer">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/10 group-hover:bg-yellow-500/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <AlertTriangle className="w-5 h-5 text-yellow-400 group-hover:text-yellow-300 transition-all duration-300" />
            </div>
            <div>
              <p className="text-sm text-slate-400 group-hover:text-white transition-colors duration-300">Needs Attention</p>
              <p className="text-2xl font-bold text-yellow-400 group-hover:text-yellow-300 group-hover:scale-110 transition-all duration-300">{stats.riskDistribution.medium}</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors duration-300">
            Falling behind on commitments
          </div>
        </div>

        {/* Major Violations */}
        <div className="group bg-slate-900 border-2 border-red-500/30 rounded-lg p-4 hover:border-red-500 hover:shadow-lg hover:shadow-red-500/30 hover:scale-105 transition-all duration-300 cursor-pointer animate-pulse hover:animate-none">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-lg bg-red-500/10 group-hover:bg-red-500/30 flex items-center justify-center group-hover:scale-110 group-hover:rotate-[-12deg] transition-all duration-300">
              <AlertTriangle className="w-5 h-5 text-red-400 group-hover:text-red-300 transition-all duration-300" />
            </div>
            <div>
              <p className="text-sm text-slate-400 group-hover:text-white transition-colors duration-300">Major Violations</p>
              <p className="text-2xl font-bold text-red-400 group-hover:text-red-300 group-hover:scale-110 transition-all duration-300">{stats.riskDistribution.high + stats.riskDistribution.critical}</p>
            </div>
          </div>
          <div className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors duration-300">
            Broken promises - need accountability
          </div>
        </div>
      </div>

      {/* Risk Distribution Chart */}
      <div className="group bg-slate-900 border-2 border-slate-700 rounded-lg p-6 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20 transition-all duration-300">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2 group-hover:text-cyan-300 transition-colors duration-300">
          <Activity className="w-5 h-5 text-cyan-400 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300" />
          How Many Facilities Are in Each Category?
        </h3>
        
        <div className="space-y-3">
          <RiskBar 
            label="✅ Good Standing (Meeting Promises)" 
            count={stats.riskDistribution.low} 
            total={postures.length} 
            color="green"
          />
          <RiskBar 
            label="⚠️ Needs Attention (Falling Behind)" 
            count={stats.riskDistribution.medium} 
            total={postures.length} 
            color="yellow"
          />
          <RiskBar 
            label="⚠️ Serious Concern (Significant Shortfalls)" 
            count={stats.riskDistribution.high} 
            total={postures.length} 
            color="orange"
          />
          <RiskBar 
            label="🚨 Major Violation (Broken Promises)" 
            count={stats.riskDistribution.critical} 
            total={postures.length} 
            color="red"
          />
        </div>
      </div>

      {/* Top Problems */}
      {stats.topRiskFactors.length > 0 && (
        <div className="bg-slate-900 border border-slate-700 rounded-lg p-6">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-400" />
            Most Common Problems
          </h3>
          <p className="text-sm text-slate-400 mb-4">
            These are the issues affecting the most facilities. Click to learn more.
          </p>
          
          <div className="space-y-2">
            {stats.topRiskFactors.map((factor, idx) => {
              const problemLabels: Record<string, string> = {
                'compliance': 'Job Creation Shortfalls',
                'data-quality': 'Outdated Information',
                'provider': 'Unverified Companies',
                'disclosure': 'Hidden Facilities',
                'infrastructure': 'Security Concerns',
              };
              
              return (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-md hover:bg-slate-800 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getCategoryIcon(factor.category)}</span>
                    <span className="text-sm font-semibold text-slate-300">
                      {problemLabels[factor.category] || factor.category}
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
              );
            })}
          </div>
        </div>
      )}

      {/* Action Items */}
      <div className="bg-gradient-to-r from-orange-900/50 to-red-900/50 border-2 border-orange-500/30 rounded-lg p-6">
        <h3 className="text-lg font-bold text-white mb-3 flex items-center gap-2">
          <Target className="w-5 h-5 text-orange-400" />
          What Should I Do Next?
        </h3>
        <div className="space-y-3">
          <div className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
            <span className="text-2xl">🔴</span>
            <div>
              <p className="text-sm font-semibold text-white mb-1">1. Focus on Major Violations First</p>
              <p className="text-xs text-slate-300">
                Click on facilities marked in red. These have the most serious broken promises and are your strongest cases.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
            <span className="text-2xl">📋</span>
            <div>
              <p className="text-sm font-semibold text-white mb-1">2. Document the Evidence</p>
              <p className="text-xs text-slate-300">
                Use the Evidence Panel (bottom-right) to collect and export proof of broken promises for your campaign.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-black/20 rounded-lg">
            <span className="text-2xl">👥</span>
            <div>
              <p className="text-sm font-semibold text-white mb-1">3. Share with Your Team</p>
              <p className="text-xs text-slate-300">
                Export reports and data to share findings with organizers, workers, and community members.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Methodology Attribution - Simplified */}
      <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-white mb-1">
              How This Works
            </p>
            <p className="text-xs text-slate-300 leading-relaxed">
              This accountability tracker uses professional security research methods to verify company claims.
              It combines public records, job data, and company disclosures to calculate an accountability score for each facility.
              <strong className="text-white"> Lower scores = broken promises.</strong>
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

  const glowClasses = {
    green: 'hover:shadow-green-500/50',
    yellow: 'hover:shadow-yellow-500/50',
    orange: 'hover:shadow-orange-500/50',
    red: 'hover:shadow-red-500/50',
  };

  return (
    <div className="group cursor-pointer hover:scale-102 transition-all duration-300">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm text-slate-300 group-hover:text-white group-hover:translate-x-1 transition-all duration-300">{label}</span>
        <span className="text-sm text-slate-400 group-hover:text-white group-hover:scale-110 transition-all duration-300">
          {count} ({percentage.toFixed(1)}%)
        </span>
      </div>
      <div className="h-3 bg-slate-800 rounded-full overflow-hidden group-hover:h-4 transition-all duration-300">
        <div 
          className={`h-full ${colorClasses[color]} group-hover:shadow-lg ${glowClasses[color]} transition-all duration-500`}
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

