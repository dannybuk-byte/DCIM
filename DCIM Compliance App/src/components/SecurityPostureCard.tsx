/**
 * Security Posture Card Component
 * 
 * Displays security posture score and risk factors for a facility.
 * Implements Jason Haddix's offensive security methodology for risk assessment.
 * 
 * Antifragility Features:
 * - Error boundary wrapped
 * - Graceful degradation with fallback UI
 * - Memoized for performance
 * - No external API dependencies
 */

import React, { useMemo } from 'react';
import { Shield, AlertTriangle, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { 
  calculateSecurityPosture, 
  getRiskLevelColor,
  type SecurityPosture,
  type RiskFactor
} from '../utils/securityPosture';
import type { Facility } from '../types';

interface SecurityPostureCardProps {
  facility: Facility;
  compact?: boolean;
  className?: string;
}

/**
 * Main Security Posture Card Component
 */
export const SecurityPostureCard: React.FC<SecurityPostureCardProps> = React.memo(({ 
  facility, 
  compact = false,
  className = '' 
}) => {
  const [expanded, setExpanded] = React.useState(false);

  // Calculate posture (memoized and cached internally)
  const posture = useMemo(() => {
    try {
      return calculateSecurityPosture(facility);
    } catch (error) {
      console.error('[SecurityPostureCard] Calculation error:', error);
      return null;
    }
  }, [facility]);

  if (!posture) {
    return <SecurityPostureUnavailable />;
  }

  const colors = getRiskLevelColor(posture.riskLevel);

  if (compact) {
    return <CompactSecurityBadge posture={posture} />;
  }

  return (
    <div className={`bg-slate-900/50 border ${colors.border} rounded-lg p-4 ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg ${colors.bg} flex items-center justify-center`}>
            <Shield className={`w-6 h-6 ${colors.text}`} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Security Posture</h3>
            <p className="text-sm text-slate-400">Based on Haddix methodology</p>
          </div>
        </div>
        
        {/* Score Display */}
        <div className="text-right">
          <div className={`text-3xl font-bold ${colors.text}`}>
            {posture.score}
          </div>
          <div className="text-xs text-slate-400">/ 100</div>
        </div>
      </div>

      {/* Risk Level Indicator */}
      <div className={`px-3 py-2 ${colors.bg} border ${colors.border} rounded-md mb-4`}>
        <div className="flex items-center justify-between">
          <span className={`text-sm font-semibold ${colors.text} uppercase tracking-wider`}>
            {posture.riskLevel} Risk
          </span>
          <span className="text-xs text-slate-400">
            {posture.riskFactors.length} factor{posture.riskFactors.length !== 1 ? 's' : ''} identified
          </span>
        </div>
      </div>

      {/* Risk Factors */}
      {posture.riskFactors.length > 0 && (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 text-sm font-semibold text-slate-300 hover:text-white transition-colors mb-2 w-full"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            Risk Factors ({posture.riskFactors.length})
          </button>

          {expanded && (
            <div className="space-y-2 mt-3">
              {posture.riskFactors.map((factor, idx) => (
                <RiskFactorItem key={idx} factor={factor} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-slate-700 flex items-center gap-2 text-xs text-slate-500">
        <Info className="w-3 h-3" />
        <span>Last assessed: {posture.lastAssessment.toLocaleString()}</span>
      </div>
    </div>
  );
});

SecurityPostureCard.displayName = 'SecurityPostureCard';

/**
 * Compact badge for inline display in facility cards
 */
export const CompactSecurityBadge: React.FC<{ posture: SecurityPosture }> = React.memo(({ posture }) => {
  const colors = getRiskLevelColor(posture.riskLevel);

  return (
    <div 
      className={`inline-flex items-center gap-2 px-3 py-1.5 ${colors.bg} border ${colors.border} rounded-md`}
      title={`Security Score: ${posture.score}/100 - ${posture.riskLevel.toUpperCase()} risk`}
    >
      <Shield className={`w-4 h-4 ${colors.text}`} />
      <span className={`text-sm font-semibold ${colors.text}`}>
        {posture.score}
      </span>
      <span className="text-xs text-slate-400">/100</span>
    </div>
  );
});

CompactSecurityBadge.displayName = 'CompactSecurityBadge';

/**
 * Individual Risk Factor Display
 */
const RiskFactorItem: React.FC<{ factor: RiskFactor }> = React.memo(({ factor }) => {
  const severityColors = {
    low: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
    medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
    high: 'text-orange-400 bg-orange-500/10 border-orange-500/30',
    critical: 'text-red-400 bg-red-500/10 border-red-500/30',
  };

  const categoryIcons = {
    compliance: '⚖️',
    'data-quality': '📊',
    provider: '🏢',
    disclosure: '🔍',
    infrastructure: '🖥️',
  };

  return (
    <div className="p-3 bg-slate-800/50 border border-slate-700 rounded-md">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-lg">{categoryIcons[factor.category]}</span>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${severityColors[factor.severity]}`}>
              {factor.severity}
            </span>
            <span className="text-xs text-slate-500">-{factor.impact} pts</span>
          </div>
          <p className="text-sm text-slate-300">{factor.description}</p>
        </div>
      </div>
      
      {factor.recommendation && (
        <div className="mt-2 pt-2 border-t border-slate-700">
          <div className="flex items-start gap-2">
            <Info className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-slate-400 italic">{factor.recommendation}</p>
          </div>
        </div>
      )}
    </div>
  );
});

RiskFactorItem.displayName = 'RiskFactorItem';

/**
 * Fallback UI when security posture cannot be calculated
 */
export const SecurityPostureUnavailable: React.FC = () => (
  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
    <div className="flex items-center gap-3 text-slate-400">
      <AlertTriangle className="w-5 h-5" />
      <div>
        <p className="text-sm font-semibold">Security Posture Unavailable</p>
        <p className="text-xs">Unable to calculate score for this facility</p>
      </div>
    </div>
  </div>
);

export default SecurityPostureCard;

