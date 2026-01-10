/**
 * Facility Verification Panel
 * 
 * Shows unified multi-source verification using Dempster-Shafer evidence fusion:
 * - Combined confidence score from all sources
 * - Conflict indicator (sources agree/disagree)
 * - Individual source breakdown
 * 
 * This is the antifragile approach: multiple independent sources
 * cross-validate each other, and disagreement is surfaced explicitly.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, MapPin, Zap, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { runUnifiedVerification, summarizeVerification, interpretConflict, type UnifiedVerificationResult, type SourceVerification } from '../services/unifiedVerification';

interface FacilityVerificationPanelProps {
  facilityName: string;
  latitude?: number;
  longitude?: number;
  state?: string;
  className?: string;
}

type OverallStatus = 'loading' | 'verified' | 'partial' | 'unverified' | 'error';

function getOverallStatus(result: UnifiedVerificationResult | null, loading: boolean): OverallStatus {
  if (loading) return 'loading';
  if (!result) return 'error';
  if (result.overallVerified && result.conflictScore < 0.3) return 'verified';
  if (result.overallVerified || result.sources.some(s => s.verified)) return 'partial';
  return 'unverified';
}

function StatusIcon({ status, size = 16 }: { status: OverallStatus; size?: number }) {
  switch (status) {
    case 'loading':
      return <Loader2 size={size} className="animate-spin text-slate-400" />;
    case 'verified':
      return <ShieldCheck size={size} className="text-green-600" />;
    case 'partial':
      return <Shield size={size} className="text-yellow-600" />;
    case 'unverified':
      return <ShieldAlert size={size} className="text-red-600" />;
    case 'error':
      return <ShieldQuestion size={size} className="text-slate-400" />;
  }
}

function ConfidenceBadge({ confidence, large = false }: { confidence: number; large?: boolean }) {
  const percent = Math.round(confidence * 100);
  const color = confidence >= 0.7 ? 'bg-green-100 text-green-800 border-green-200' :
                confidence >= 0.4 ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                'bg-red-100 text-red-800 border-red-200';
  const sizeClass = large ? 'px-3 py-1 text-sm font-bold' : 'px-2 py-0.5 text-xs font-medium';
  return (
    <span className={`${sizeClass} rounded border ${color}`}>
      {percent}%
    </span>
  );
}

function ConflictBadge({ conflictScore }: { conflictScore: number }) {
  const level = interpretConflict(conflictScore);
  if (level === 'low') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
        <CheckCircle2 size={12} />
        Sources agree
      </span>
    );
  }
  if (level === 'moderate') {
    return (
      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
        <AlertTriangle size={12} />
        Some disagreement
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">
      <AlertTriangle size={12} />
      Sources conflict
    </span>
  );
}

function SourceIcon({ source }: { source: string }) {
  switch (source) {
    case 'epa':
      return <MapPin size={14} className="text-slate-400" />;
    case 'eia':
      return <Zap size={14} className="text-slate-400" />;
    default:
      return <Shield size={14} className="text-slate-400" />;
  }
}

function SourceRow({ source }: { source: SourceVerification }) {
  const statusColor = source.verified ? 'text-green-600' : source.error ? 'text-slate-400' : 'text-red-600';
  const statusText = source.verified ? 'Verified' : source.error ? 'Error' : 'Not verified';
  
  return (
    <div className="flex items-start gap-2 py-2 border-b border-slate-100 last:border-0">
      <SourceIcon source={source.source} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-700 uppercase">{source.source}</span>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${statusColor}`}>{statusText}</span>
            {!source.error && <ConfidenceBadge confidence={source.confidence} />}
          </div>
        </div>
        <div className="text-xs text-slate-500 mt-0.5 truncate">
          {source.error || source.details || 'No additional details'}
        </div>
      </div>
    </div>
  );
}

export const FacilityVerificationPanel: React.FC<FacilityVerificationPanelProps> = ({
  facilityName,
  latitude,
  longitude,
  state,
  className = '',
}) => {
  const [result, setResult] = useState<UnifiedVerificationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  const runVerification = useCallback(async () => {
    setLoading(true);
    try {
      const verificationResult = await runUnifiedVerification({
        facilityName,
        latitude,
        longitude,
        state,
      });
      setResult(verificationResult);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [facilityName, latitude, longitude, state]);

  useEffect(() => {
    runVerification();
  }, [runVerification]);

  const overallStatus = getOverallStatus(result, loading);

  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={overallStatus} size={24} />
          <div className="text-left">
            <div className="text-sm font-semibold text-slate-900">
              {loading ? 'Verifying...' : 
               result?.overallVerified ? 'Verified' : 'Not Verified'}
            </div>
            <div className="text-xs text-slate-500">
              {loading ? 'Checking multiple sources...' :
               result ? `${result.sources.filter(s => !s.error).length} sources checked` :
               'Verification failed'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {result && !loading && (
            <>
              <ConfidenceBadge confidence={result.overallConfidence} large />
              <ConflictBadge conflictScore={result.conflictScore} />
            </>
          )}
          <span className="text-slate-400 text-sm ml-2">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-200">
          {/* Combined Score Explanation */}
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="text-xs text-slate-600">
              <strong>Dempster-Shafer Evidence Fusion:</strong> Multiple independent sources 
              are mathematically combined. When sources agree, confidence increases. 
              Disagreement is flagged for investigation.
            </div>
            {result && (
              <div className="mt-2 grid grid-cols-3 gap-2 text-center">
                <div className="bg-white rounded p-2 border border-slate-200">
                  <div className="text-lg font-bold text-slate-800">
                    {Math.round(result.combinedMass.belief * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-500">Belief</div>
                </div>
                <div className="bg-white rounded p-2 border border-slate-200">
                  <div className="text-lg font-bold text-slate-800">
                    {Math.round(result.combinedMass.uncertainty * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-500">Uncertainty</div>
                </div>
                <div className="bg-white rounded p-2 border border-slate-200">
                  <div className="text-lg font-bold text-slate-800">
                    {Math.round(result.combinedMass.disbelief * 100)}%
                  </div>
                  <div className="text-[10px] text-slate-500">Disbelief</div>
                </div>
              </div>
            )}
          </div>

          {/* Individual Sources */}
          <div className="px-4 py-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
              Individual Sources
            </div>
            {result?.sources.map((source, i) => (
              <SourceRow key={i} source={source} />
            ))}
          </div>

          {/* Refresh button */}
          <div className="px-4 py-2 border-t border-slate-200">
            <button
              onClick={() => {
                setLoading(true);
                setResult(null);
                runVerification();
              }}
              disabled={loading}
              className="w-full px-3 py-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded transition-colors"
            >
              {loading ? 'Verifying...' : 'Refresh Verification'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FacilityVerificationPanel;
