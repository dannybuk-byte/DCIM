import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { CredibilityProjectSnapshot } from '../lib/credibilityInputs';
import type { CredibilityScoreBundle } from '../lib/scoring';
import { CredibilityDemoBanner } from './CredibilityDemoBanner';
import { ScoreBreakdown } from './ScoreBreakdown';
import { ContradictionPanel } from './ContradictionPanel';

interface CredibilityEvidencePanelProps {
  snapshot: CredibilityProjectSnapshot;
  bundle: CredibilityScoreBundle;
}

const STATIC_DISCLAIMER =
  'Scores are generated from structured fields and cited evidence. Missing or uncertain fields reduce confidence. This dashboard does not treat absence of evidence as proof of compliance or noncompliance.';

export const CredibilityEvidencePanel: React.FC<CredibilityEvidencePanelProps> = ({
  snapshot,
  bundle,
}) => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(o => !o), []);

  const knownLines = [
    `Structured jobs (ledger): promised ${snapshot.promisedJobs}, recorded ${snapshot.actualJobs}`,
    `Modeled subsidy association: $${(snapshot.subsidyAmountUsd / 1_000_000).toFixed(1)}M`,
    snapshot.agreementDate ? `Agreement / anchor date present: ${snapshot.agreementDate}` : null,
    snapshot.reportingDeadline ? `Reporting deadline on file: ${snapshot.reportingDeadline}` : null,
  ].filter(Boolean) as string[];

  const inferredLines = [
    'Weighted compliance, evidence, contradiction, and public-risk composites (deterministic formulas)',
    'Action posture derived from score thresholds — not a legal determination',
  ];

  const missingLines =
    snapshot.missingStructuredFields.length > 0
      ? snapshot.missingStructuredFields
      : ['No additional structured gaps flagged beyond demo placeholders'];

  return (
    <div className="rounded border border-gray-700 bg-gray-900/20">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-1.5 px-2 py-1.5 text-left hover:bg-gray-800/50 transition-colors"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-3 h-3 text-cyan-500 shrink-0" />
        ) : (
          <ChevronRight className="w-3 h-3 text-cyan-500 shrink-0" />
        )}
        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">
          Evidence &amp; Assumptions
        </span>
        <span className="text-[9px] text-gray-500 ml-auto">Why?</span>
      </button>

      {open ? (
        <div className="px-2 pb-2 space-y-2 border-t border-gray-800 pt-2">
          <CredibilityDemoBanner show={snapshot.isDemoDerived} />
          <p className="text-[10px] text-gray-400 leading-snug">{STATIC_DISCLAIMER}</p>

          <ScoreBreakdown bundle={bundle} />

          <div className="grid gap-2 text-[10px]">
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">What is known</div>
              <ul className="list-disc list-inside text-gray-300 space-y-0.5">
                {knownLines.map(l => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">What is inferred</div>
              <ul className="list-disc list-inside text-gray-300 space-y-0.5">
                {inferredLines.map(l => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
            <div>
              <div className="text-[9px] font-bold text-gray-500 uppercase mb-0.5">What is missing</div>
              <ul className="list-disc list-inside text-amber-200/90 space-y-0.5">
                {missingLines.map(l => (
                  <li key={l}>{l}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="text-[10px] text-gray-400">
            <span className="text-gray-500">Confidence (overall): </span>
            <span className="font-mono text-white">{bundle.overallReviewScore.confidence.toFixed(2)}</span>
            <span className="text-gray-600"> · </span>
            <span className="text-gray-500">Last updated (record): </span>
            <span className="text-gray-300">{snapshot.lastUpdated ?? 'Not set'}</span>
          </div>

          <div>
            <div className="text-[9px] font-bold text-gray-500 uppercase mb-1">Sources on file</div>
            {snapshot.sources.length === 0 ? (
              <p className="text-[10px] text-gray-500">None listed.</p>
            ) : (
              <ul className="space-y-1 text-[10px] text-gray-300">
                {snapshot.sources.map(s => (
                  <li key={s.id} className="border-l border-gray-700 pl-2">
                    <span className="text-white">{s.title}</span>
                    <span className="text-gray-500"> ({s.sourceType})</span>
                    {s.url ? (
                      <span className="block text-[9px] text-cyan-600/90 truncate" title={s.url}>
                        {s.url}
                      </span>
                    ) : null}
                    <span className="text-gray-500 text-[9px] block">
                      confidence {s.confidence.toFixed(2)}
                      {s.notes ? ` — ${s.notes}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <ContradictionPanel pairs={bundle.contradictionPairs} />
        </div>
      ) : null}
    </div>
  );
};
