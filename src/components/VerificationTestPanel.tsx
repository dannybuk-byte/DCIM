/**
 * VerificationTestPanel
 * 
 * Development/testing panel for validating verification pipeline behavior.
 * Allows forcing degraded mode and emitting test events to prove defensive layers work.
 * 
 * IMPORTANT: This is for testing only. In production, consider hiding behind a feature flag.
 */

import React, { useState } from 'react';
import { Beaker, AlertTriangle, CheckCircle2, XCircle, Zap } from 'lucide-react';
import { telemetryBus } from '../services/telemetryBus';
import { verificationDegradedMode } from '../services/verificationDegradedMode';
import { useVerificationDegraded } from '../hooks/useVerificationDegraded';

export interface VerificationTestPanelProps {
  /** Whether to show the panel (default: true in dev, false in prod) */
  enabled?: boolean;
}

export const VerificationTestPanel: React.FC<VerificationTestPanelProps> = ({
  enabled = import.meta.env.DEV,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);
  const { isDegraded, reason } = useVerificationDegraded();

  if (!enabled) return null;

  const emitTestEvent = async (verified: boolean, severity: 'medium' | 'critical') => {
    const correlationId = `bgp:origin_change:192.0.2.0/24:64496`;
    const payload = {
      prefix: '192.0.2.0/24',
      asn: '64496',
      anomalyType: 'origin_change',
      rpkiState: verified ? 'valid' : 'not_found',
      corroborationStatus: verified ? 'confirmed' : 'pending',
      testEvent: true,
    };

    await telemetryBus.emit({
      source: 'bgp',
      type: 'bgp_anomaly',
      severity,
      title: `[TEST] ${verified ? 'Verified' : 'Unverified'} ${severity} BGP anomaly`,
      summary: `Test event: ${verified ? 'RouteViews confirmed + RPKI valid' : 'Unverified (no corroboration)'}`,
      correlationId,
      payload,
    });

    const expectedOutcome = verified && severity === 'critical' && !isDegraded
      ? 'Should auto-create confirmed incident'
      : 'Should stay as telemetry only (or suspected if promoted)';

    setLastAction(`Emitted ${verified ? 'verified' : 'unverified'} ${severity} event. ${expectedOutcome}`);
  };

  const forceHealthCheck = async () => {
    const result = await verificationDegradedMode.checkHealth();
    setLastAction(`Health check: ${result.status} - ${result.reason}`);
  };

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-3 hover:bg-amber-100 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Beaker size={16} className="text-amber-600" />
          <span className="text-sm font-medium text-amber-800">Verification Test Panel</span>
          <span className="text-xs text-amber-600">(dev only)</span>
        </div>
        <span className="text-xs text-amber-600">{isExpanded ? '▲' : '▼'}</span>
      </button>

      {isExpanded && (
        <div className="p-3 border-t border-amber-200 space-y-3">
          {/* Current Status */}
          <div className="flex items-center gap-2 text-xs">
            <span className="text-amber-700">Degraded Mode:</span>
            {isDegraded ? (
              <span className="flex items-center gap-1 text-rose-600">
                <AlertTriangle size={12} /> YES - {reason}
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-600">
                <CheckCircle2 size={12} /> No - {reason}
              </span>
            )}
          </div>

          {/* Test Actions */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => emitTestEvent(true, 'critical')}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded text-xs hover:bg-emerald-200"
            >
              <CheckCircle2 size={12} />
              Verified + Critical
            </button>
            <button
              onClick={() => emitTestEvent(false, 'critical')}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-rose-100 text-rose-700 border border-rose-200 rounded text-xs hover:bg-rose-200"
            >
              <XCircle size={12} />
              Unverified + Critical
            </button>
            <button
              onClick={() => emitTestEvent(true, 'medium')}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-blue-100 text-blue-700 border border-blue-200 rounded text-xs hover:bg-blue-200"
            >
              <CheckCircle2 size={12} />
              Verified + Medium
            </button>
            <button
              onClick={() => emitTestEvent(false, 'medium')}
              className="flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-100 text-slate-700 border border-slate-200 rounded text-xs hover:bg-slate-200"
            >
              <XCircle size={12} />
              Unverified + Medium
            </button>
          </div>

          {/* Health Check */}
          <button
            onClick={forceHealthCheck}
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-100 text-amber-700 border border-amber-200 rounded text-xs hover:bg-amber-200"
          >
            <Zap size={12} />
            Force Health Check
          </button>

          {/* Last Action */}
          {lastAction && (
            <div className="text-xs text-amber-700 bg-amber-100 p-2 rounded">
              <strong>Last action:</strong> {lastAction}
            </div>
          )}

          {/* Expected Behavior Guide */}
          <div className="text-xs text-amber-700 space-y-1">
            <div className="font-medium">Expected behavior:</div>
            <ul className="list-disc list-inside space-y-0.5 text-amber-600">
              <li><strong>Verified + Critical</strong>: Auto-creates confirmed incident (unless degraded)</li>
              <li><strong>Unverified + Critical</strong>: Stays as telemetry, suspected if promoted</li>
              <li><strong>Medium severity</strong>: Never auto-creates (any verification)</li>
              <li><strong>Degraded mode ON</strong>: Blocks all auto-create</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificationTestPanel;
