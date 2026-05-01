import React from 'react';
import type { CredibilityScoreBundle } from '../lib/scoring';

interface ScoreBreakdownProps {
  bundle: CredibilityScoreBundle;
}

const Row: React.FC<{ title: string; score: number; label: string; confidence: number }> = ({
  title,
  score,
  label,
  confidence,
}) => (
  <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5 text-[10px] border-b border-gray-700/60 last:border-b-0 py-1">
    <span className="text-gray-500 shrink-0">{title}</span>
    <span className="text-gray-200 text-right">
      <span className="font-mono text-white">{score}</span>
      <span className="text-gray-500"> · </span>
      <span>{label}</span>
      <span className="text-gray-500"> · conf </span>
      <span className="font-mono">{confidence.toFixed(2)}</span>
    </span>
  </div>
);

export const ScoreBreakdown: React.FC<ScoreBreakdownProps> = ({ bundle }) => {
  return (
    <div className="rounded border border-gray-700 bg-gray-900/40 px-2 py-1">
      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1">Score breakdown</div>
      <Row
        title="Compliance"
        score={bundle.complianceScore.score}
        label={bundle.complianceScore.label}
        confidence={bundle.complianceScore.confidence}
      />
      <Row
        title="Evidence confidence"
        score={bundle.evidenceConfidenceScore.score}
        label={bundle.evidenceConfidenceScore.label}
        confidence={bundle.evidenceConfidenceScore.confidence}
      />
      <Row
        title="Contradiction pressure"
        score={bundle.contradictionScore.score}
        label={bundle.contradictionScore.label}
        confidence={bundle.contradictionScore.confidence}
      />
      <Row
        title="Public risk"
        score={bundle.publicRiskScore.score}
        label={bundle.publicRiskScore.label}
        confidence={bundle.publicRiskScore.confidence}
      />
      <Row
        title="Overall review"
        score={bundle.overallReviewScore.score}
        label={bundle.overallReviewScore.label}
        confidence={bundle.overallReviewScore.confidence}
      />
    </div>
  );
};
