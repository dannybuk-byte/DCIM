/**
 * Facility Verification Panel
 * 
 * Shows multi-source verification status for a facility:
 * - EPA ECHO (environmental permits, compliance)
 * - EIA (regional energy patterns)
 * - BGP/RPKI (network routing, if applicable)
 * 
 * Displays confidence scores and verification details.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldQuestion, Loader2, MapPin, Zap, Network } from 'lucide-react';
import { searchEpaByRadius, verifyFacilityLocation, type EPAFacility, type EPAVerificationResult } from '../services/epaVerification';
import { verifyFacilityRegion, isEiaProxyConfigured, type EIAVerificationResult } from '../services/eiaVerification';

interface FacilityVerificationPanelProps {
  facilityName: string;
  latitude?: number;
  longitude?: number;
  state?: string;
  className?: string;
}

type VerificationStatus = 'loading' | 'verified' | 'partial' | 'unverified' | 'error';

interface VerificationState {
  epa: {
    status: VerificationStatus;
    result?: EPAVerificationResult;
    matchingFacility?: EPAFacility;
  };
  eia: {
    status: VerificationStatus;
    result?: EIAVerificationResult;
  };
}

function getOverallStatus(state: VerificationState): VerificationStatus {
  const statuses = [state.epa.status, state.eia.status];
  if (statuses.every(s => s === 'loading')) return 'loading';
  if (statuses.some(s => s === 'error')) return 'partial';
  if (statuses.every(s => s === 'verified')) return 'verified';
  if (statuses.some(s => s === 'verified')) return 'partial';
  return 'unverified';
}

function getOverallConfidence(state: VerificationState): number {
  const confidences: number[] = [];
  if (state.epa.result?.confidence) confidences.push(state.epa.result.confidence);
  if (state.eia.result?.confidence) confidences.push(state.eia.result.confidence);
  if (confidences.length === 0) return 0;
  return confidences.reduce((a, b) => a + b, 0) / confidences.length;
}

function StatusIcon({ status, size = 16 }: { status: VerificationStatus; size?: number }) {
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

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const percent = Math.round(confidence * 100);
  const color = confidence >= 0.7 ? 'bg-green-100 text-green-800' :
                confidence >= 0.4 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800';
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${color}`}>
      {percent}%
    </span>
  );
}

export const FacilityVerificationPanel: React.FC<FacilityVerificationPanelProps> = ({
  facilityName,
  latitude,
  longitude,
  state,
  className = '',
}) => {
  const [verification, setVerification] = useState<VerificationState>({
    epa: { status: 'loading' },
    eia: { status: 'loading' },
  });
  const [expanded, setExpanded] = useState(false);

  const runVerification = useCallback(async () => {
    // EPA verification (browser-direct)
    if (latitude && longitude) {
      try {
        const epaResult = await verifyFacilityLocation(facilityName, latitude, longitude, 5);
        setVerification(prev => ({
          ...prev,
          epa: {
            status: epaResult.verified ? 'verified' : 'unverified',
            result: {
              verified: epaResult.verified,
              confidence: epaResult.confidence,
              facilities: epaResult.allNearby,
              searchParams: { lat: latitude, lng: longitude, radiusMiles: 5 },
              timestamp: Date.now(),
            },
            matchingFacility: epaResult.matchingFacility,
          },
        }));
      } catch {
        setVerification(prev => ({
          ...prev,
          epa: { status: 'error' },
        }));
      }
    } else {
      setVerification(prev => ({
        ...prev,
        epa: { status: 'unverified' },
      }));
    }

    // EIA verification (via proxy)
    if (state && isEiaProxyConfigured()) {
      try {
        const eiaResult = await verifyFacilityRegion(state);
        setVerification(prev => ({
          ...prev,
          eia: {
            status: eiaResult.verified ? 'verified' : 'unverified',
            result: eiaResult,
          },
        }));
      } catch {
        setVerification(prev => ({
          ...prev,
          eia: { status: 'error' },
        }));
      }
    } else if (!isEiaProxyConfigured()) {
      setVerification(prev => ({
        ...prev,
        eia: { status: 'error', result: { verified: false, confidence: 0, analysis: null, rawData: [], timestamp: Date.now(), error: 'EIA proxy not configured' } },
      }));
    } else {
      setVerification(prev => ({
        ...prev,
        eia: { status: 'unverified' },
      }));
    }
  }, [facilityName, latitude, longitude, state]);

  useEffect(() => {
    runVerification();
  }, [runVerification]);

  const overallStatus = getOverallStatus(verification);
  const overallConfidence = getOverallConfidence(verification);

  return (
    <div className={`bg-white border border-slate-200 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <StatusIcon status={overallStatus} size={20} />
          <div className="text-left">
            <div className="text-sm font-medium text-slate-900">
              Multi-Source Verification
            </div>
            <div className="text-xs text-slate-500">
              {overallStatus === 'loading' ? 'Checking sources...' :
               overallStatus === 'verified' ? 'All sources verified' :
               overallStatus === 'partial' ? 'Partially verified' :
               'Not verified'}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {overallStatus !== 'loading' && <ConfidenceBadge confidence={overallConfidence} />}
          <span className="text-slate-400 text-xs">{expanded ? '▲' : '▼'}</span>
        </div>
      </button>

      {/* Expanded Details */}
      {expanded && (
        <div className="border-t border-slate-200 px-4 py-3 space-y-3">
          {/* EPA */}
          <div className="flex items-start gap-3">
            <MapPin size={16} className="text-slate-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">EPA ECHO</span>
                <div className="flex items-center gap-2">
                  <StatusIcon status={verification.epa.status} size={14} />
                  {verification.epa.result && (
                    <ConfidenceBadge confidence={verification.epa.result.confidence} />
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {verification.epa.status === 'loading' ? 'Searching EPA registry...' :
                 verification.epa.matchingFacility ? (
                   <span className="text-green-700">
                     Match: {verification.epa.matchingFacility.facilityName}
                     {verification.epa.matchingFacility.hasAirPermit && ' • Air permit'}
                     {verification.epa.matchingFacility.hasRcraPermit && ' • RCRA permit'}
                   </span>
                 ) :
                 verification.epa.result?.facilities.length ? (
                   `${verification.epa.result.facilities.length} nearby facilities (no exact match)`
                 ) :
                 verification.epa.result?.error ? verification.epa.result.error :
                 'No EPA data found'}
              </div>
            </div>
          </div>

          {/* EIA */}
          <div className="flex items-start gap-3">
            <Zap size={16} className="text-slate-400 mt-0.5" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">EIA Energy</span>
                <div className="flex items-center gap-2">
                  <StatusIcon status={verification.eia.status} size={14} />
                  {verification.eia.result && (
                    <ConfidenceBadge confidence={verification.eia.result.confidence} />
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-500 mt-0.5">
                {verification.eia.status === 'loading' ? 'Analyzing regional energy...' :
                 verification.eia.result?.analysis ? (
                   <span className={verification.eia.result.analysis.dataCenterSignature !== 'none' ? 'text-green-700' : ''}>
                     {verification.eia.result.analysis.balancingAuthority}: {' '}
                     Load factor {(verification.eia.result.analysis.loadFactor * 100).toFixed(0)}% • {' '}
                     {verification.eia.result.analysis.dataCenterSignature} DC signature
                   </span>
                 ) :
                 verification.eia.result?.error ? verification.eia.result.error :
                 'No EIA data available'}
              </div>
            </div>
          </div>

          {/* Refresh button */}
          <button
            onClick={() => {
              setVerification({ epa: { status: 'loading' }, eia: { status: 'loading' } });
              runVerification();
            }}
            className="w-full mt-2 px-3 py-1.5 text-xs text-slate-600 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
          >
            Refresh verification
          </button>
        </div>
      )}
    </div>
  );
};

export default FacilityVerificationPanel;
