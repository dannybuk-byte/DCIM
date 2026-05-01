import React, { useMemo } from 'react';
import type { Facility } from '../types';
import { buildCredibilitySnapshot } from '../lib/credibilityInputs';
import { computeCredibilityScoreBundle } from '../lib/scoring';
import { resolveActionFlag } from '../lib/actionFlags';
import { buildFacilityCredibilityNarrative } from '../lib/narratives';
import { CredibilityDemoBanner } from './CredibilityDemoBanner';
import { FacilityNarrative } from './FacilityNarrative';
import { CredibilityEvidencePanel } from './CredibilityEvidencePanel';

interface FacilityCredibilitySectionProps {
  facility: Facility;
  /** Larger typography / spacing for explorer-style panels */
  variant?: 'compact' | 'comfortable';
}

function flagSurface(flag: string): string {
  if (flag === 'Flag for Review') {
    return 'bg-red-950/50 text-red-200 border-red-800/60';
  }
  if (flag === 'Monitor') {
    return 'bg-amber-950/50 text-amber-200 border-amber-800/60';
  }
  if (flag === 'Appears Compliant') {
    return 'bg-green-950/40 text-green-200 border-green-800/60';
  }
  return 'bg-gray-800 text-gray-200 border-gray-600';
}

export const FacilityCredibilitySection: React.FC<FacilityCredibilitySectionProps> = ({
  facility,
  variant = 'compact',
}) => {
  const snapshot = useMemo(() => buildCredibilitySnapshot(facility), [facility]);
  const bundle = useMemo(() => computeCredibilityScoreBundle(snapshot), [snapshot]);
  const action = useMemo(() => resolveActionFlag(bundle, snapshot), [bundle, snapshot]);
  const narrative = useMemo(
    () => buildFacilityCredibilityNarrative(snapshot, bundle, action),
    [snapshot, bundle, action],
  );

  const pad = variant === 'comfortable' ? 'p-3' : 'p-2';
  const titleSize = variant === 'comfortable' ? 'text-xs' : 'text-[10px]';

  return (
    <div className={`space-y-2 ${pad} rounded border border-gray-700 bg-gray-900/30`}>
      <div className={`font-bold text-gray-400 uppercase tracking-wide ${titleSize}`}>
        Credibility review
      </div>

      <CredibilityDemoBanner show={snapshot.isDemoDerived} />

      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`px-2 py-0.5 rounded border text-[10px] font-bold ${flagSurface(action.flag)}`}
        >
          {action.flag}
        </span>
        <span className="text-[10px] text-gray-400">
          Compliance{' '}
          <span className="font-mono text-white">{bundle.complianceScore.score}</span>
          <span className="text-gray-600"> · </span>
          Confidence{' '}
          <span className="font-mono text-white">{bundle.overallReviewScore.confidence.toFixed(2)}</span>
        </span>
      </div>

      <div className="text-[10px] text-gray-300 leading-snug">
        <span className="text-gray-500">Main driver: </span>
        {bundle.complianceScore.explanation}
      </div>

      <FacilityNarrative text={narrative} />

      <div>
        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1">
          Recommended next steps
        </div>
        <ul className="list-disc list-inside text-[10px] text-gray-300 space-y-0.5">
          {action.recommendedNextSteps.map(step => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      </div>

      <CredibilityEvidencePanel snapshot={snapshot} bundle={bundle} />
    </div>
  );
};
