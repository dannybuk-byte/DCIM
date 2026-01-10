/**
 * Facility Risk Card Component
 * Displays sanctions risk assessment for individual facilities
 * 
 * Features:
 * - Risk score visualization (0-100)
 * - Risk factor breakdown
 * - SDN match alerts
 * - Quick action buttons
 */

import React, { useState } from 'react';
import { 
  AlertTriangle, 
  ChevronDown, 
  ChevronUp, 
  Shield, 
  Phone, 
  FileText,
  ExternalLink,
  Building2,
  Zap,
  DollarSign,
} from 'lucide-react';
import { FacilityRiskScore, RiskLevel } from '../types/sanctions';
import { getRiskLevelColor } from '../services/riskScoring';

interface FacilityRiskCardProps {
  facilityName: string;
  location: string;
  operator: string;
  riskScore: FacilityRiskScore;
  onFileReport?: () => void;
  onViewDetails?: () => void;
}

export const FacilityRiskCard: React.FC<FacilityRiskCardProps> = ({
  facilityName,
  location,
  operator,
  riskScore,
  onFileReport,
  onViewDetails,
}) => {
  const [expanded, setExpanded] = useState(false);

  const riskColor = getRiskLevelColor(riskScore.riskLevel);
  const isHighRisk = riskScore.riskLevel === 'CRITICAL' || riskScore.riskLevel === 'HIGH';

  const getRiskBgClass = (level: RiskLevel): string => {
    switch (level) {
      case 'CRITICAL': return 'bg-red-900/30 border-red-700';
      case 'HIGH': return 'bg-orange-900/30 border-orange-700';
      case 'MODERATE': return 'bg-yellow-900/30 border-yellow-700';
      case 'LOW': return 'bg-green-900/30 border-green-700';
      default: return 'bg-slate-800 border-slate-700';
    }
  };

  const getRiskTextClass = (level: RiskLevel): string => {
    switch (level) {
      case 'CRITICAL': return 'text-red-400';
      case 'HIGH': return 'text-orange-400';
      case 'MODERATE': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className={`rounded-lg border ${getRiskBgClass(riskScore.riskLevel)} overflow-hidden transition-all duration-200`}>
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Building2 className="w-4 h-4 text-slate-400" />
              <h3 className="font-semibold text-white">{facilityName}</h3>
              {isHighRisk && (
                <span className="px-2 py-0.5 text-xs font-bold rounded bg-red-600 text-white animate-pulse">
                  ⚠️ REVIEW REQUIRED
                </span>
              )}
            </div>
            <p className="text-sm text-slate-400">{location}</p>
            <p className="text-xs text-slate-500">Operator: {operator}</p>
          </div>

          {/* Risk Score Badge */}
          <div className="text-right">
            <div 
              className="text-3xl font-bold"
              style={{ color: riskColor }}
            >
              {riskScore.score}
            </div>
            <div className={`text-xs font-semibold ${getRiskTextClass(riskScore.riskLevel)}`}>
              {riskScore.riskLevel}
            </div>
          </div>
        </div>

        {/* Risk Progress Bar */}
        <div className="mt-3">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full rounded-full transition-all duration-500"
              style={{ 
                width: `${riskScore.score}%`,
                background: `linear-gradient(to right, ${riskColor}80, ${riskColor})`,
              }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0</span>
            <span>25</span>
            <span>50</span>
            <span>75</span>
            <span>100</span>
          </div>
        </div>

        {/* SDN Match Alert */}
        {riskScore.sdnMatches && riskScore.sdnMatches.length > 0 && (
          <div className="mt-3 p-2 bg-red-900/50 border border-red-700 rounded flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-semibold text-red-300">
                SDN List Match Detected
              </div>
              <div className="text-xs text-red-400">
                {riskScore.sdnMatches.length} potential match(es) found
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-3 flex items-center gap-2">
          {isHighRisk && (
            <button
              onClick={onFileReport}
              className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
            >
              <FileText className="w-4 h-4" />
              File Report
            </button>
          )}
          <button
            onClick={onViewDetails}
            className="flex-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded text-sm flex items-center justify-center gap-2 transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            View Details
          </button>
          {isHighRisk && (
            <a
              href="tel:1-800-540-6322"
              className="px-3 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded text-sm flex items-center gap-2 transition-colors"
              title="OFAC Hotline"
            >
              <Phone className="w-4 h-4" />
            </a>
          )}
        </div>

        {/* Expand/Collapse Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full mt-3 pt-2 border-t border-slate-700 flex items-center justify-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
        >
          {expanded ? (
            <>
              Hide Details <ChevronUp className="w-3 h-3" />
            </>
          ) : (
            <>
              Show Risk Factors <ChevronDown className="w-3 h-3" />
            </>
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-700/50">
          <div className="pt-3">
            <h4 className="text-sm font-semibold text-slate-300 mb-2">Risk Factors</h4>
            <div className="space-y-2">
              {riskScore.factors.length > 0 ? (
                riskScore.factors.map((factor, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                    <div className="flex items-center gap-2">
                      {factor.factor.includes('SDN') && <Shield className="w-4 h-4 text-red-400" />}
                      {factor.factor.includes('TRAFFIC') && <Zap className="w-4 h-4 text-orange-400" />}
                      {factor.factor.includes('PAYMENT') && <DollarSign className="w-4 h-4 text-yellow-400" />}
                      <div>
                        <div className="text-sm text-slate-200">
                          {factor.factor.replace(/_/g, ' ')}
                        </div>
                        {factor.description && (
                          <div className="text-xs text-slate-400">{factor.description}</div>
                        )}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-right" style={{ color: riskColor }}>
                      +{factor.points} pts
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-slate-400 italic">No risk factors detected</div>
              )}
            </div>
          </div>

          {/* SDN Match Details */}
          {riskScore.sdnMatches && riskScore.sdnMatches.length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-red-300 mb-2">SDN Matches</h4>
              <div className="space-y-2">
                {riskScore.sdnMatches.map((match, idx) => (
                  <div key={idx} className="p-2 bg-red-900/30 border border-red-800 rounded">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-red-200">
                        {match.tenant} → {match.sdnEntry.lastName}
                      </div>
                      <div className="text-xs text-red-400">
                        {(match.confidence * 100).toFixed(0)}% match
                      </div>
                    </div>
                    <div className="text-xs text-red-400 mt-1">
                      Type: {match.matchType} | Programs: {match.sdnEntry.programs.join(', ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div className="text-xs text-slate-500 text-right">
            Last assessed: {new Date(riskScore.timestamp).toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

