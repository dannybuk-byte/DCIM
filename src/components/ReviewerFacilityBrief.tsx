import React, { useMemo, useState, useCallback } from 'react';
import { Clipboard, Check, ChevronDown } from 'lucide-react';
import type { Facility } from '../types';
import {
  buildReviewerBrief,
  formatClipboardBrief,
  type ReviewerBriefEvidenceRow,
} from '../lib/reviewerBriefs';
import { CredibilityDemoBanner } from './CredibilityDemoBanner';
import { MethodologyDrawer } from './MethodologyDrawer';

interface ReviewerFacilityBriefProps {
  facility: Facility;
}

type BriefTab = 'overview' | 'evidence' | 'audit' | 'followup';

const TAB_ORDER: BriefTab[] = ['overview', 'evidence', 'audit', 'followup'];

const TAB_LABELS: Record<BriefTab, string> = {
  overview: 'Overview',
  evidence: 'Key evidence',
  audit: 'Score & audit',
  followup: 'Next steps',
};

async function copyTextToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

function flagChip(flag: string): string {
  if (flag === 'Flag for Review') return 'bg-red-950/60 text-red-200 border-red-700/70';
  if (flag === 'Monitor') return 'bg-amber-950/60 text-amber-200 border-amber-700/70';
  if (flag === 'Appears Compliant') return 'bg-green-950/50 text-green-200 border-green-700/70';
  return 'bg-gray-800 text-gray-200 border-gray-600';
}

function SectionHeading({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <div className="text-xs font-bold text-cyan-400/95 uppercase tracking-wider mb-2">{children}</div>
  );
}

function SectionCard({ children }: { children: React.ReactNode }): React.ReactElement {
  return (
    <section className="rounded-xl border border-gray-700/90 bg-gray-900/55 p-4 md:p-5 shadow-lg shadow-black/20 transition-colors hover:border-gray-600/90">
      {children}
    </section>
  );
}

function EvidenceRowBlock({ e, index }: { e: ReviewerBriefEvidenceRow; index: number }): React.ReactElement {
  return (
    <li className="rounded-lg border border-gray-800 bg-gray-950/40 p-3 md:p-4">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-base font-bold text-white">{index + 1}.</span>
        <span className="text-base font-semibold text-white">{e.title}</span>
      </div>
      <p className="mt-2 text-sm text-gray-300 leading-relaxed">{e.claimOrMetric}</p>
      <p className="mt-2 text-xs text-gray-500">
        Confidence {e.confidence.toFixed(2)}
        {e.date ? ` · date ${e.date}` : ''}
      </p>
      {e.url ? (
        <a
          href={e.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex max-w-full items-center gap-1 text-sm font-medium text-cyan-400 underline decoration-cyan-600/50 underline-offset-2 hover:text-cyan-300 hover:decoration-cyan-400 break-all"
        >
          Open source link
        </a>
      ) : null}
    </li>
  );
}

export const ReviewerFacilityBrief: React.FC<ReviewerFacilityBriefProps> = ({ facility }) => {
  const brief = useMemo(() => buildReviewerBrief(facility), [facility]);
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState<BriefTab>('overview');

  const handleCopy = useCallback(async () => {
    const ok = await copyTextToClipboard(formatClipboardBrief(brief));
    setCopied(ok);
    window.setTimeout(() => setCopied(false), 2000);
  }, [brief]);

  const tabBtnClass = useCallback(
    (id: BriefTab): string => {
      const base =
        'min-h-[44px] px-4 py-2.5 rounded-lg border text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-gray-950';
      if (tab === id) {
        return `${base} border-cyan-500/80 bg-cyan-950/50 text-white shadow-md shadow-cyan-950/40`;
      }
      return `${base} border-gray-700 bg-gray-900/40 text-gray-400 hover:border-gray-500 hover:bg-gray-800/60 hover:text-gray-100`;
    },
    [tab],
  );

  return (
    <div className="rounded-2xl border border-gray-700/90 bg-gray-950/90 p-4 md:p-6 space-y-5 text-sm md:text-base text-gray-200 leading-relaxed">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl md:text-2xl font-bold text-white leading-tight tracking-tight">
            {brief.facilityName}
          </h2>
          <div className="mt-1 text-sm text-gray-400">{brief.location}</div>
          <div className="text-sm text-gray-400">Developer / operator: {brief.developer}</div>
          <div className="mt-2 text-xs text-gray-500">
            Last updated: <span className="text-gray-300">{brief.lastUpdated}</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="min-h-[44px] shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 border-cyan-600/60 bg-cyan-950/50 text-sm font-bold text-cyan-200 hover:bg-cyan-900/50 hover:border-cyan-500 active:scale-[0.98] transition-all"
        >
          {copied ? <Check className="w-5 h-5" /> : <Clipboard className="w-5 h-5" />}
          {copied ? 'Copied' : 'Copy brief'}
        </button>
      </div>

      <CredibilityDemoBanner show={brief.snapshot.isDemoDerived} />

      <div className="flex flex-wrap gap-2 md:gap-3 items-center">
        <span className={`px-3 py-1.5 rounded-lg border text-sm font-bold ${flagChip(brief.statusFlag)}`}>
          {brief.statusFlag}
        </span>
        <span className="px-3 py-1.5 rounded-lg border border-gray-600 bg-gray-900 font-mono text-sm text-white">
          Review {brief.overallReviewScore}
        </span>
        <span className="px-3 py-1.5 rounded-lg border border-gray-600 bg-gray-900 font-mono text-sm text-gray-200">
          Conf {brief.confidence.toFixed(2)}
        </span>
        <span className="text-sm text-gray-400">
          Subsidy exposure: <span className="text-gray-100 font-medium">{brief.subsidyExposureLabel}</span>
        </span>
      </div>

      <div
        role="tablist"
        aria-label="Reviewer brief sections"
        className="flex flex-wrap gap-2 p-2 rounded-xl bg-gray-900/70 border border-gray-800"
      >
        {TAB_ORDER.map(id => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            id={`brief-tab-${id}`}
            aria-controls={`brief-panel-${id}`}
            onClick={() => setTab(id)}
            className={tabBtnClass(id)}
          >
            {TAB_LABELS[id]}
          </button>
        ))}
      </div>

      <div className="min-h-[12rem]">
        {tab === 'overview' ? (
          <div
            role="tabpanel"
            id="brief-panel-overview"
            aria-labelledby="brief-tab-overview"
            className="space-y-4 animate-in fade-in duration-200"
          >
            <SectionCard>
              <SectionHeading>Why this matters</SectionHeading>
              <p className="text-base md:text-lg text-gray-200 leading-relaxed">{brief.whyThisMatters}</p>
            </SectionCard>
            <SectionCard>
              <SectionHeading>Main finding</SectionHeading>
              <p className="text-base md:text-lg text-gray-200 leading-relaxed">{brief.mainFinding}</p>
            </SectionCard>
          </div>
        ) : null}

        {tab === 'evidence' ? (
          <div
            role="tabpanel"
            id="brief-panel-evidence"
            aria-labelledby="brief-tab-evidence"
            className="space-y-4 animate-in fade-in duration-200"
          >
            <SectionCard>
              <SectionHeading>Key evidence</SectionHeading>
              <ol className="list-none space-y-3">
                {brief.evidenceRows.map((e, i) => (
                  <EvidenceRowBlock key={`${e.title}-${i}`} e={e} index={i} />
                ))}
              </ol>
            </SectionCard>
            <SectionCard>
              <SectionHeading>Contradiction highlight</SectionHeading>
              <p className="text-base text-gray-200 leading-relaxed">{brief.contradictionHighlight}</p>
            </SectionCard>
          </div>
        ) : null}

        {tab === 'audit' ? (
          <div
            role="tabpanel"
            id="brief-panel-audit"
            aria-labelledby="brief-tab-audit"
            className="space-y-4 animate-in fade-in duration-200"
          >
            <details open className="group rounded-xl border border-gray-700 bg-gray-900/55 overflow-hidden">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 md:py-4 bg-gray-900/80 hover:bg-gray-800/80 border-b border-gray-800">
                <span className="text-sm font-bold uppercase tracking-wide text-cyan-400">
                  Compliance components
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180 shrink-0" />
              </summary>
              <div className="p-4 md:p-5 space-y-4">
                <ul className="space-y-4">
                  {brief.complianceAudit.components.map(c => (
                    <li
                      key={c.id}
                      className="rounded-lg border-l-4 border-cyan-600/70 bg-gray-950/50 pl-4 pr-3 py-3"
                    >
                      <div className="text-base font-semibold text-white">
                        {c.label}{' '}
                        <span className="text-sm font-normal text-gray-400">({c.weightPercent}% weight)</span>
                      </div>
                      <p className="mt-2 text-sm text-gray-300 leading-relaxed">
                        Raw index {c.rawUnitScore} · contributes ~{c.contributionPoints.toFixed(1)} pts pre-penalty —{' '}
                        {c.affectsScoreHow}
                      </p>
                    </li>
                  ))}
                </ul>
                <p className="text-sm text-gray-400 leading-relaxed border-t border-gray-800 pt-4">
                  {brief.complianceAudit.penaltiesExplain}
                </p>
              </div>
            </details>

            <details className="group rounded-xl border border-gray-700 bg-gray-900/55 overflow-hidden">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 md:py-4 bg-gray-900/80 hover:bg-gray-800/80 border-b border-gray-800">
                <span className="text-sm font-bold uppercase tracking-wide text-orange-400/95">
                  Contradictions & gaps
                </span>
                <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180 shrink-0" />
              </summary>
              <div className="p-4 md:p-5">
                {brief.contradictionPairs.length === 0 ? (
                  <p className="text-sm text-gray-500">No paired rows.</p>
                ) : (
                  <ul className="space-y-3">
                    {brief.contradictionPairs.map(p => (
                      <li
                        key={`${p.claimId}-${p.outcomeId}`}
                        className="rounded-lg border-l-4 border-orange-600/60 bg-orange-950/20 pl-4 pr-3 py-3"
                      >
                        <span className="text-base font-medium text-gray-200">
                          Claim vs observed ({p.observedMetric})
                        </span>
                        <p className="mt-2 text-sm text-gray-300 leading-relaxed">
                          Gap {p.gapAbsolute} · severity {p.severity} · confidence {p.confidence.toFixed(2)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </details>

            <details className="group rounded-xl border border-gray-700 bg-gray-900/55 overflow-hidden">
              <summary className="cursor-pointer list-none flex items-center justify-between gap-2 px-4 py-3 md:py-4 bg-gray-900/80 hover:bg-gray-800/80 border-b border-gray-800">
                <span className="text-sm font-bold uppercase tracking-wide text-gray-400">Risk signals</span>
                <ChevronDown className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-180 shrink-0" />
              </summary>
              <div className="p-4 md:p-5">
                <ul className="space-y-2">
                  {brief.riskAuditLines.map((line, i) => (
                    <li
                      key={i}
                      className="text-sm md:text-base border-l-4 border-gray-600 pl-4 py-2 text-gray-300 leading-relaxed"
                    >
                      {line}
                    </li>
                  ))}
                </ul>
              </div>
            </details>

            <SectionCard>
              <SectionHeading>Missing critical data</SectionHeading>
              {brief.missingCritical.length === 0 ? (
                <p className="text-base text-gray-300">No critical missing fields detected in the current record.</p>
              ) : (
                <ul className="list-disc list-inside space-y-2 text-base text-amber-100/95 marker:text-amber-400">
                  {brief.missingCritical.map(m => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        ) : null}

        {tab === 'followup' ? (
          <div
            role="tabpanel"
            id="brief-panel-followup"
            aria-labelledby="brief-tab-followup"
            className="space-y-4 animate-in fade-in duration-200"
          >
            <SectionCard>
              <SectionHeading>Reviewer assessment</SectionHeading>
              <p className="text-base md:text-lg text-gray-200 leading-relaxed">{brief.reviewerAssessment}</p>
            </SectionCard>
            <SectionCard>
              <SectionHeading>Recommended next step</SectionHeading>
              <p className="text-lg md:text-xl text-white font-semibold leading-relaxed">{brief.recommendedNextStep}</p>
            </SectionCard>
            <p className="text-sm text-gray-500 leading-relaxed px-1">
              Limitations: this prototype may include demo or manually entered data. Scores are methodological aids, not
              final legal or compliance determinations.
            </p>
            <MethodologyDrawer />
          </div>
        ) : null}
      </div>
    </div>
  );
};
