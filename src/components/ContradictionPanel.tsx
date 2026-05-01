import React from 'react';
import type { ContradictionPair } from '../lib/contradictions';

interface ContradictionPanelProps {
  pairs: ContradictionPair[];
}

export const ContradictionPanel: React.FC<ContradictionPanelProps> = ({ pairs }) => {
  if (pairs.length === 0) {
    return (
      <div className="text-[10px] text-gray-500 py-1">
        No paired public claims and observed outcomes were available for contradiction review.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide">
        Public claim vs observed outcome
      </div>
      {pairs.map(p => (
        <div
          key={`${p.claimId}-${p.outcomeId}`}
          className="rounded border border-orange-900/40 bg-orange-950/20 px-2 py-1.5 space-y-1 text-[10px]"
        >
          <div className="text-gray-300">
            <span className="text-gray-500">Claim: </span>
            {p.claimText}
          </div>
          <div className="text-gray-300">
            <span className="text-gray-500">Observed ({p.observedMetric}): </span>
            <span className="font-mono text-white">{p.observedValue}</span>
            <span className="text-gray-500"> vs cited </span>
            <span className="font-mono text-white">{p.claimedValue}</span>
          </div>
          <div className="text-gray-400">
            Gap: <span className="font-mono text-orange-200">{p.gapAbsolute}</span>
            <span className="text-gray-600"> ({Math.round(p.gapRatio * 100)}% ratio)</span>
            {' · '}
            Severity{' '}
            <span className="font-mono text-orange-300">{p.severity}</span>
            {' · '}
            Confidence <span className="font-mono">{p.confidence.toFixed(2)}</span>
          </div>
          {(p.claimSourceUrl || p.outcomeSourceUrl) && (
            <div className="flex flex-col gap-0.5 text-[9px] text-cyan-600/90">
              {p.claimSourceUrl ? (
                <span className="truncate" title={p.claimSourceUrl}>
                  Claim source: {p.claimSourceUrl}
                </span>
              ) : null}
              {p.outcomeSourceUrl ? (
                <span className="truncate" title={p.outcomeSourceUrl}>
                  Outcome source: {p.outcomeSourceUrl}
                </span>
              ) : null}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
