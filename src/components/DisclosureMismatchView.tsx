import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  Download,
  ExternalLink,
  FileText,
  Gavel,
  Radar,
  RefreshCw,
  Sparkles,
  Users,
} from 'lucide-react';
import {
  exportSignalsJsonUrl,
  fetchCompaniesList,
  fetchCompanyDetail,
  type AxisBreakdown,
  type CompanyScoresRow,
  type CorpusProvenance,
  type DisclosureSource,
  type RobustnessSummary,
  type ThresholdParams,
} from '../api/disclosureMismatchClient';
import { EpochConfirmTimeline } from './EpochConfirmTimeline';
import {
  SOURCED_CASE_PACK_SKEPTICISM,
  buildCaseReportPayload,
  buildSkepticismBullets,
  buildTimelineFromSources,
  confidenceBandBadgeClasses,
  confidenceBandFromEvidence,
  downloadJsonReport,
  explainConfidence,
  generateCaseSummary,
  openCaseReportHtmlWindow,
  type TimelineEvent,
} from '../utils/disclosureMismatchAnalyst';

interface DisclosureMismatchViewProps {
  isFullscreen?: boolean;
}

/** Raw mismatch threshold for “Disclosure Gap Pattern” badge & pattern counts. */
const PATTERN_RAW_MI_THRESHOLD = 60;

const AMAZON_CASE_ID = 'amazon';

/** High-signal strip order — structural pattern cases (seed corpus). */
const PATTERN_CASE_IDS = ['amazon', 'klarna', 'ibm', 'salesforce', 'duolingo'] as const;

const PATTERN_STRIP_LINE: Record<string, string> = {
  amazon: 'AI expected to reduce workforce — no verified disclosure',
  klarna: 'AI replacing support roles — disclosure gap unverified',
  ibm: 'AI replacing back-office roles — disclosure not observed',
  salesforce: 'Hiring slowdown + AI productivity emphasis — disclosure gap suggested',
  duolingo: 'AI replacing contractor workflows — formal attribution not observed',
};

/** Verified URLs — Amazon sourced case pack (primary + journalism). */
const AMAZON_OFFICIAL_GENAI_POST =
  'https://www.aboutamazon.com/news/company-news/amazon-ceo-andy-jassy-on-generative-ai';
const AMAZON_REUTERS_GENAI_JUNE_2025 =
  'https://www.reuters.com/business/retail-consumer/amazons-workforce-reduce-rollout-generative-ai-agents-2025-06-17/';
const AMAZON_REUTERS_LAYOFFS_OCT_2025 =
  'https://www.reuters.com/sustainability/amazon-lay-off-about-14000-roles-2025-10-28/';

/** Paraphrase aligned to official post — signal for review, not a legal finding. */
const AMAZON_PUBLIC_QUOTE =
  'As Amazon rolls out more generative AI and agents, it expects this will reduce its total corporate workforce over the next few years.';
const AMAZON_PUBLIC_ATTRIBUTION = 'Andy Jassy — Amazon CEO (official company post, June 2025)';

const PUBLIC_AI_TYPES = new Set([
  'earnings_call',
  'sec_filing',
  'ceo_interview',
  'investor_deck',
  'press_release',
  'blog_post',
  'hiring_announcement',
  'restructuring_announcement',
  'public_ai_statement',
  'secondary_public_report',
]);

const WARN_TYPES = new Set(['warn_filing', 'layoff_announcement', 'workforce_disruption_signal']);

function partitionSources(sources: DisclosureSource[]): {
  aiStatements: DisclosureSource[];
  warnSignals: DisclosureSource[];
} {
  const aiStatements = sources.filter(s => PUBLIC_AI_TYPES.has(s.type));
  const warnSignals = sources.filter(s => WARN_TYPES.has(s.type));
  return { aiStatements, warnSignals };
}

/** One-line signal for table — derived from scores (list endpoint has no excerpts). */
function keySignalLine(row: CompanyScoresRow): string {
  if (row.scores_suppressed) return 'Insufficient sources — signal withheld.';
  const aas = row.aas ?? 0;
  const lss = row.lss ?? 0;
  const ds = row.ds ?? 0;
  if (aas >= 55 && lss >= 28 && ds < 15) {
    return 'Strong AI attribution + disruption; no AI named in formal filings.';
  }
  if (aas >= 40 && lss >= 20 && ds === 0) {
    return 'AI-linked workforce rhetoric + WARN/layoff records; disclosure gap.';
  }
  if (aas >= 28 && lss >= 15) {
    return 'Public AI productivity narrative overlaps with restructuring signals.';
  }
  return 'Cross-channel disclosure comparison — review AI vs formal causes.';
}

function riskBadgeClasses(level: CompanyScoresRow['risk_level']): string {
  if (level === 'high') return 'bg-red-950/90 text-red-100 border-red-600/80';
  if (level === 'medium') return 'bg-orange-950/80 text-orange-100 border-orange-600/70';
  if (level === 'low') return 'bg-yellow-950/70 text-yellow-100 border-yellow-700/60';
  return 'bg-gray-900 text-gray-400 border-gray-600';
}

function showsDisclosureGapPattern(row: CompanyScoresRow): boolean {
  if (row.scores_suppressed) return false;
  const mi = row.mismatch_index ?? 0;
  const ds = row.ds ?? 0;
  return mi > PATTERN_RAW_MI_THRESHOLD && ds === 0;
}

/** Same gate as the disclosure-gap badge — used to count multi-employer structural signals. */
function countStructuralMismatchEmployers(rows: CompanyScoresRow[]): number {
  return rows.filter(r => !r.scores_suppressed && showsDisclosureGapPattern(r)).length;
}

type PatternStrengthLabel = 'Emerging' | 'Moderate' | 'Strong';

function computePatternStrength(stats: PatternSummaryStats): {
  label: PatternStrengthLabel;
  rationale: string;
} {
  const { companiesAboveThreshold, flaggedAtThreshold, pctNoAiDisclosure, avgMismatchIndex, scoredCount } = stats;
  if (scoredCount === 0) {
    return {
      label: 'Emerging',
      rationale: 'No scored employers in corpus yet — pattern strength not estimable.',
    };
  }

  let pts = 0;
  if (flaggedAtThreshold >= 6) pts += 3;
  else if (flaggedAtThreshold >= 4) pts += 2;
  else if (flaggedAtThreshold >= 2) pts += 1;
  else if (companiesAboveThreshold >= 2) pts += 1;

  if (avgMismatchIndex >= 85) pts += 3;
  else if (avgMismatchIndex >= 65) pts += 2;
  else if (avgMismatchIndex >= 45) pts += 1;

  if (pctNoAiDisclosure >= 78) pts += 3;
  else if (pctNoAiDisclosure >= 55) pts += 2;
  else if (pctNoAiDisclosure >= 35) pts += 1;

  let label: PatternStrengthLabel = 'Emerging';
  if (pts >= 7) label = 'Strong';
  else if (pts >= 4) label = 'Moderate';

  return {
    label,
    rationale: `At the active review gates, ${flaggedAtThreshold} of ${scoredCount} scored employers are flagged. Legacy disclosure-gap heuristic: ${companiesAboveThreshold} exceed raw mismatch > ${PATTERN_RAW_MI_THRESHOLD} with DS = 0 where applicable. Average raw mismatch index ~${avgMismatchIndex}; ${pctNoAiDisclosure}% with DS = 0. Indicative — not a statistical proof.`,
  };
}

function mismatchCellClasses(level: CompanyScoresRow['risk_level'], suppressed: boolean): string {
  if (suppressed) return 'text-gray-500';
  if (level === 'high') return 'text-red-400';
  if (level === 'medium') return 'text-orange-400';
  if (level === 'low') return 'text-yellow-300';
  return 'text-gray-300';
}

interface AmazonFeaturedAlertCardProps {
  amazon: CompanyScoresRow | undefined;
  onLayoffSignalsClick: () => void;
  /** When ≥2 employers meet disclosure-gap criteria — allows structural-pattern wording. */
  multiCompanyStructuralPattern: boolean;
}

function AmazonFeaturedAlertCard({
  amazon,
  onLayoffSignalsClick,
  multiCompanyStructuralPattern,
}: AmazonFeaturedAlertCardProps): React.ReactElement {
  const suppressed = !amazon || amazon.scores_suppressed;
  const mi = amazon?.mismatch_index;
  const conf = amazon?.confidence_score ?? 0;
  const risk = amazon?.risk_level_at_threshold ?? amazon?.risk_level ?? 'minimal';

  return (
    <section
      className="dme-amazon-alert-enter max-w-none w-full rounded-2xl border-2 border-amber-500/45 bg-gradient-to-b from-amber-950/35 via-zinc-950 to-zinc-950 px-5 py-6 md:px-8 md:py-8 shadow-[0_0_48px_-12px_rgba(251,191,36,0.28)] ring-1 ring-amber-400/25"
      aria-labelledby="dme-amazon-alert-title"
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2
            id="dme-amazon-alert-title"
            className="text-xl md:text-2xl font-black text-white tracking-tight flex items-center gap-2"
          >
            <span className="text-amber-400" aria-hidden>
              ⚠️
            </span>
            AI Workforce Disclosure Signal Detected
          </h2>
          <p className="mt-3 text-base md:text-lg text-zinc-100 leading-relaxed max-w-4xl font-medium">
            <span className="text-amber-100/95">Public AI workforce attribution detected</span> in primary and secondary
            public sources. <span className="text-zinc-100">Workforce reduction signal present</span> in reporting.
            Formal WARN/legal AI disclosure{' '}
            <span className="text-zinc-200 font-semibold">not verified in attached records</span> —{' '}
            <span className="text-amber-100/90">signal, not verdict</span>;{' '}
            <span className="text-rose-200/90 font-semibold">human review required</span>.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          {amazon?.case_type === 'sourced_case' ? (
            <span className="inline-flex items-center px-3 py-1.5 rounded-md border border-teal-600/65 bg-teal-950/75 text-[11px] font-black uppercase tracking-wide text-teal-100">
              Sourced Case
            </span>
          ) : null}
          <span className="inline-flex items-center px-3 py-1.5 rounded-md border border-rose-600/70 bg-rose-950/80 text-[11px] font-black uppercase tracking-wide text-rose-100">
            Human Review Recommended
          </span>
          <span className={`inline-flex items-center px-3 py-1.5 rounded-md border text-[11px] font-black uppercase tracking-wide ${riskBadgeClasses(risk)}`}>
            Risk: {risk}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 lg:gap-8">
        <div className="rounded-xl border border-amber-600/35 bg-black/40 p-5 md:p-6">
          <div className="text-[10px] font-black uppercase tracking-widest text-amber-500/90 mb-3">
            Public AI workforce attribution (detected)
          </div>
          <blockquote className="text-xl md:text-2xl lg:text-[1.65rem] font-semibold text-amber-50 leading-snug tracking-tight">
            “{AMAZON_PUBLIC_QUOTE}”
          </blockquote>
          <footer className="mt-4 text-sm text-amber-200/80 font-medium">— {AMAZON_PUBLIC_ATTRIBUTION}</footer>
        </div>
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/60 p-5 md:p-6 flex flex-col">
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
            Formal disclosure (attached records)
          </div>
          <p className="text-lg md:text-xl text-zinc-200 font-semibold leading-snug flex-1">
            Formal WARN/legal AI disclosure not verified in attached records — attach filings to validate.
          </p>
          <div className="mt-5 flex flex-col gap-2 items-start">
            <span className="inline-flex px-3 py-2 rounded-lg border-2 border-orange-600/70 bg-orange-950/65 text-sm font-black uppercase tracking-wide text-orange-100">
              Verification gap — corpus only
            </span>
            {multiCompanyStructuralPattern ? (
              <span className="inline-flex px-3 py-2 rounded-lg border border-violet-600/55 bg-violet-950/50 text-xs font-black uppercase tracking-wide text-violet-100 leading-snug max-w-md">
                Potential structural under-disclosure pattern — multi-company signal (hypothesis, not a verdict)
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-zinc-700/90 bg-zinc-950/50 px-4 py-4">
        <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
          Analyst timeline (summary)
        </div>
        <ul className="space-y-2 text-sm text-zinc-200 leading-snug">
          <li>
            <span className="font-mono text-xs text-zinc-500 mr-2">June 2025</span>
            Public AI workforce statement — official post plus Reuters reporting on the same theme.
          </li>
          <li>
            <span className="font-mono text-xs text-zinc-500 mr-2">October 2025</span>
            Reported corporate workforce reduction (~14,000 roles) — journalism describes AI as one contributing factor,
            not sole cause.
          </li>
          <li>
            <span className="font-mono text-xs text-zinc-500 mr-2">Disclosure check</span>
            No verified AI-specific WARN/legal disclosure attached — human validation required before conclusions.
          </li>
        </ul>
      </div>

      <p className="mt-6 text-sm md:text-base text-zinc-300 leading-relaxed border-t border-amber-900/30 pt-6">
        This engine compares public AI attribution signals with formal disclosure text in the corpus — it suggests
        where channels diverge; it does not prove wrongdoing or causation.
      </p>

      <div className="mt-6 flex flex-wrap items-end justify-between gap-6 border-t border-amber-900/25 pt-6">
        <div>
          <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1">
            Mismatch Index
          </div>
          <div className="text-5xl md:text-6xl font-black tabular-nums text-amber-400 leading-none tracking-tight">
            {suppressed || mi === null ? '—' : mi}
          </div>
          <div className="mt-3 text-sm text-zinc-500">
            Confidence{' '}
            <span className="text-zinc-300 font-mono font-semibold">{suppressed ? '—' : conf}</span>
            {amazon?.bounded_mismatch_index !== null && amazon?.bounded_mismatch_index !== undefined ? (
              <span className="text-zinc-600 ml-3">
                · Bounded index <span className="text-zinc-400 font-mono">{amazon.bounded_mismatch_index}</span>
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={AMAZON_OFFICIAL_GENAI_POST}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-amber-600/50 bg-amber-950/50 text-xs font-bold text-amber-100 hover:bg-amber-950/80 transition-colors"
          >
            Official CEO post
            <ExternalLink className="w-3.5 h-3.5 opacity-80" aria-hidden />
          </a>
          <a
            href={AMAZON_REUTERS_GENAI_JUNE_2025}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-600 bg-zinc-900 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Reuters — AI workforce (Jun 2025)
            <ExternalLink className="w-3.5 h-3.5 opacity-80" aria-hidden />
          </a>
          <a
            href={AMAZON_REUTERS_LAYOFFS_OCT_2025}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-orange-700/60 bg-orange-950/40 text-xs font-bold text-orange-100 hover:bg-orange-950/70 transition-colors"
          >
            Reuters — layoffs (Oct 2025)
            <ExternalLink className="w-3.5 h-3.5 opacity-80" aria-hidden />
          </a>
          <button
            type="button"
            onClick={onLayoffSignalsClick}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border border-zinc-600 bg-zinc-900 text-xs font-bold text-zinc-200 hover:bg-zinc-800 transition-colors"
          >
            Open case in table
          </button>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-zinc-800/80 text-[11px] text-zinc-500 leading-relaxed space-y-1">
        <p>Signal, not verdict — not a claim of legal violation or intentional concealment.</p>
        <p>No definitive causation for any specific layoff is asserted from this pack alone.</p>
        <p>Human review required — attach WARN/legal primaries to complete disclosure verification.</p>
      </div>
    </section>
  );
}

interface PatternSummaryStats {
  companiesAboveThreshold: number;
  flaggedAtThreshold: number;
  pctNoAiDisclosure: number;
  avgMismatchIndex: number;
  scoredCount: number;
}

function patternStabilityBadgeClasses(label: string): string {
  if (label === 'stable') return 'border-emerald-700/60 bg-emerald-950/50 text-emerald-100';
  if (label === 'moderate') return 'border-amber-700/55 bg-amber-950/45 text-amber-100';
  if (label === 'fragile') return 'border-rose-700/55 bg-rose-950/45 text-rose-100';
  return 'border-zinc-600 bg-zinc-900 text-zinc-400';
}

function ThresholdReviewToolbar(props: {
  bounded: number;
  confidence: number;
  flaggedCount: number;
  onBounded: (v: number) => void;
  onConfidence: (v: number) => void;
}): React.ReactElement {
  const mismatchPresets = [40, 50, 60, 70, 80];
  const confPresets = [25, 35, 45, 55, 60];
  return (
    <section
      className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-4 py-4 md:px-5"
      aria-labelledby="dme-threshold-title"
    >
      <h2 id="dme-threshold-title" className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-3">
        Mismatch threshold (defensibility)
      </h2>
      <p className="text-xs text-zinc-400 mb-3 leading-relaxed">
        Bounded mismatch floor (0–100) and confidence floor gate which employers count as{' '}
        <span className="text-zinc-200 font-semibold">flagged</span> and which{' '}
        <span className="text-zinc-200 font-semibold">risk@threshold</span> tier applies. Pattern stability sweeps the same
        gates across a fixed step ladder server-side.
      </p>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 w-full sm:w-auto">Bounded min</span>
        {mismatchPresets.map(v => (
          <button
            key={`m-${v}`}
            type="button"
            onClick={() => props.onBounded(v)}
            className={`px-3 py-1.5 rounded-md border text-xs font-bold ${
              props.bounded === v
                ? 'border-amber-500/80 bg-amber-950/50 text-amber-100'
                : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 items-center mb-3">
        <span className="text-[10px] font-bold uppercase tracking-wide text-zinc-500 w-full sm:w-auto">Confidence min</span>
        {confPresets.map(v => (
          <button
            key={`c-${v}`}
            type="button"
            onClick={() => props.onConfidence(v)}
            className={`px-3 py-1.5 rounded-md border text-xs font-bold ${
              props.confidence === v
                ? 'border-sky-600/80 bg-sky-950/45 text-sky-100'
                : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:bg-zinc-800'
            }`}
          >
            {v}
          </button>
        ))}
      </div>
      <p className="text-sm text-zinc-200 font-semibold">
        Current gates: bounded ≥ <span className="text-amber-200 font-mono">{props.bounded}</span>, confidence ≥{' '}
        <span className="text-sky-200 font-mono">{props.confidence}</span>
        <span className="text-zinc-500 font-normal"> · </span>
        <span className="text-white">{props.flaggedCount}</span>
        <span className="text-zinc-500 font-normal"> employers flagged at this level</span>
      </p>
    </section>
  );
}

function PatternStrengthIndicator(props: {
  strength: { label: PatternStrengthLabel; rationale: string };
  stability: { label: string; persistence: number } | null;
}): React.ReactElement {
  const { strength, stability } = props;
  const tiers: PatternStrengthLabel[] = ['Emerging', 'Moderate', 'Strong'];
  return (
    <section
      className="rounded-xl border border-indigo-900/40 bg-gradient-to-r from-indigo-950/35 via-zinc-950 to-zinc-950 px-5 py-4 md:py-5"
      aria-labelledby="dme-pattern-strength-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2
            id="dme-pattern-strength-title"
            className="text-[10px] font-black uppercase tracking-widest text-indigo-400/90"
          >
            Pattern strength (system-level hypothesis)
          </h2>
          <p className="mt-1 text-xl md:text-2xl font-black text-white tracking-tight">{strength.label}</p>
          <p className="mt-1 text-[11px] text-zinc-500 uppercase tracking-wide">
            Emerging · Moderate · Strong — read left to right
          </p>
          {stability ? (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                Pattern stability (threshold sweep)
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-wide ${patternStabilityBadgeClasses(stability.label)}`}
              >
                {stability.label} · persistence {Math.round(stability.persistence * 100)}%
              </span>
            </div>
          ) : null}
        </div>
        <div className="flex gap-2 items-center shrink-0" aria-hidden>
          {tiers.map(t => (
            <div
              key={t}
              title={t}
              className={`h-2.5 w-14 sm:w-20 rounded-full ${
                t === strength.label ? 'bg-indigo-500 shadow-[0_0_12px_rgba(99,102,241,0.4)]' : 'bg-zinc-800'
              }`}
            />
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-zinc-400 leading-relaxed max-w-3xl">{strength.rationale}</p>
      <p className="mt-2 text-[11px] text-zinc-600 leading-relaxed max-w-3xl">
        Describes repeatability of structured signals in this corpus — not proof of intent, wrongdoing, or how the
        broader labor market behaves outside this bundle.
      </p>
    </section>
  );
}

function WhatThisSuggestsPanel(): React.ReactElement {
  return (
    <section
      className="rounded-xl border border-sky-900/35 bg-sky-950/15 px-5 py-5 md:px-6"
      aria-labelledby="dme-what-suggests-title"
    >
      <h2 id="dme-what-suggests-title" className="text-lg font-black text-white tracking-tight">
        What this suggests
      </h2>
      <p className="mt-3 text-sm text-sky-100/90 leading-relaxed max-w-3xl">
        This case reflects a broader pattern observed across multiple companies:
      </p>
      <ul className="mt-3 space-y-2 text-sm text-zinc-300 leading-relaxed list-disc list-inside max-w-3xl">
        <li>Public statements increasingly link AI to workforce reduction or restructuring</li>
        <li>Workforce disruption signals are observable</li>
        <li>Formal labor disclosures rarely include AI as a stated cause</li>
      </ul>
      <p className="mt-4 text-sm text-zinc-400 leading-relaxed max-w-3xl">
        This system flags these cases as potential disclosure mismatches for further review.
      </p>
    </section>
  );
}

function CrossCaseComparisonSnapshot(props: {
  rowsById: Map<string, CompanyScoresRow>;
  onPick: (id: string) => void;
}): React.ReactElement {
  const { rowsById, onPick } = props;

  const fmt = (r: CompanyScoresRow | undefined, v: number | null | undefined): string => {
    if (!r || r.scores_suppressed) return '—';
    if (v === null || v === undefined) return '—';
    return String(v);
  };

  return (
    <section className="rounded-xl border border-zinc-700 bg-zinc-900/25 px-4 py-4" aria-labelledby="dme-cross-case-title">
      <h2 id="dme-cross-case-title" className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-2">
        Cross-case comparison snapshot
      </h2>
      <p className="text-[11px] text-zinc-500 mb-3 max-w-2xl leading-relaxed">
        Compact axis view across highlighted employers — meant to show repeatability of the same measurement structure,
        not to equate each company’s facts.
      </p>
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full text-left text-xs">
          <thead className="bg-zinc-900/90 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="px-3 py-2">Company</th>
              <th className="px-3 py-2 text-right">AAS</th>
              <th className="px-3 py-2 text-right">LSS</th>
              <th className="px-3 py-2 text-right">DS</th>
              <th className="px-3 py-2 text-right">MI</th>
            </tr>
          </thead>
          <tbody>
            {PATTERN_CASE_IDS.map(caseId => {
              const r = rowsById.get(caseId);
              return (
                <tr
                  key={caseId}
                  onClick={() => {
                    if (r) onPick(caseId);
                  }}
                  className={`border-t border-zinc-800/90 ${r ? 'cursor-pointer hover:bg-zinc-800/60' : ''}`}
                >
                  <td className="px-3 py-2 font-bold text-zinc-100">{r?.name ?? caseId}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300 tabular-nums">{fmt(r, r?.aas ?? null)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300 tabular-nums">{fmt(r, r?.lss ?? null)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300 tabular-nums">{fmt(r, r?.ds ?? null)}</td>
                  <td className="px-3 py-2 text-right font-mono text-zinc-300 tabular-nums">
                    {fmt(r, r?.mismatch_index ?? null)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function WhatWouldChangeAssessmentPanel(): React.ReactElement {
  return (
    <section
      className="rounded-xl border border-emerald-900/30 bg-emerald-950/10 px-5 py-5 md:px-6"
      aria-labelledby="dme-falsify-title"
    >
      <h2 id="dme-falsify-title" className="text-lg font-black text-white tracking-tight">
        What would change this assessment
      </h2>
      <p className="mt-3 text-sm text-zinc-400 leading-relaxed">This pattern would weaken if:</p>
      <ul className="mt-2 space-y-2 text-sm text-zinc-300 leading-relaxed list-disc list-inside max-w-3xl">
        <li>Companies begin explicitly attributing AI in WARN or legal disclosures</li>
        <li>Additional data shows layoffs unrelated to AI despite public statements</li>
        <li>Broader datasets show consistent alignment between AI attribution and formal reporting</li>
      </ul>
      <p className="mt-4 text-sm text-zinc-500 leading-relaxed max-w-3xl">
        This system is designed to update as new evidence becomes available.
      </p>
    </section>
  );
}

function PatternSummaryPanel({
  stats,
  multiCompanyStructuralPattern,
}: {
  stats: PatternSummaryStats;
  multiCompanyStructuralPattern: boolean;
}): React.ReactElement {
  return (
    <section
      className="rounded-xl border border-violet-900/45 bg-gradient-to-br from-violet-950/30 via-zinc-950 to-zinc-950 px-5 py-6 md:px-7 md:py-7"
      aria-labelledby="dme-pattern-summary-title"
    >
      <h2 id="dme-pattern-summary-title" className="text-lg md:text-xl font-black text-white tracking-tight">
        Emerging Pattern: AI Attribution vs Disclosure
      </h2>
      <p className="mt-2 text-sm text-zinc-400 leading-relaxed max-w-3xl">
        The same structure repeats across firms: public AI attribution coexists with little or no AI naming in formal
        notices reviewed here — a <span className="text-zinc-200">signal for review</span>, not evidence of
        wrongdoing.
      </p>
      {multiCompanyStructuralPattern ? (
        <p className="mt-3 text-xs text-violet-200/95 leading-relaxed max-w-3xl border-l-2 border-violet-600/55 pl-3">
          <span className="font-bold text-violet-100">Potential structural under-disclosure pattern</span> — several
          scored employers jointly exhibit high mismatch with DS = 0; framed as an empirical hypothesis for review, not
          an accusation of intent or violation.
        </p>
      ) : null}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-zinc-800 bg-black/45 px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Flagged at current gates
          </div>
          <div className="mt-1 text-3xl font-black text-emerald-200/90 tabular-nums leading-none">
            {stats.scoredCount === 0 ? '—' : stats.flaggedAtThreshold}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Bounded mismatch + confidence floors from toolbar ({stats.scoredCount} scored)
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/45 px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Legacy raw mismatch heuristic
          </div>
          <div className="mt-1 text-3xl font-black text-violet-300 tabular-nums leading-none">
            {stats.scoredCount === 0 ? '—' : stats.companiesAboveThreshold}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            Raw mismatch index &gt; {PATTERN_RAW_MI_THRESHOLD} (DS = 0 disclosure-gap strip)
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/45 px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Share with no AI disclosure score
          </div>
          <div className="mt-1 text-3xl font-black text-amber-300 tabular-nums leading-none">
            {stats.scoredCount === 0 ? '—' : `${stats.pctNoAiDisclosure}%`}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">
            DS = 0 in model (no verified AI cause in formal disclosure axis)
          </div>
        </div>
        <div className="rounded-lg border border-zinc-800 bg-black/45 px-4 py-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-zinc-500">
            Average mismatch index
          </div>
          <div className="mt-1 text-3xl font-black text-white tabular-nums leading-none">
            {stats.scoredCount === 0 ? '—' : stats.avgMismatchIndex}
          </div>
          <div className="text-[11px] text-zinc-500 mt-1">Across scored companies (prototype scale)</div>
        </div>
      </div>
    </section>
  );
}

function MultiCaseStrip(props: {
  rowsById: Map<string, CompanyScoresRow>;
  onPick: (id: string) => void;
}): React.ReactElement {
  const { rowsById, onPick } = props;
  return (
    <section className="space-y-3" aria-label="Cross-company pattern cases">
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <h2 className="text-sm font-black uppercase tracking-widest text-zinc-400">Multi-case pattern strip</h2>
        <span className="text-[11px] text-zinc-500">Select a card to jump to the row</span>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {PATTERN_CASE_IDS.map(caseId => {
          const row = rowsById.get(caseId);
          const tagline = PATTERN_STRIP_LINE[caseId] ?? 'Cross-channel comparison — signal for review.';
          const suppressed = row?.scores_suppressed ?? true;
          const mi = row?.mismatch_index;
          const risk = row?.risk_level_at_threshold ?? row?.risk_level ?? 'unknown';
          return (
            <button
              key={caseId}
              type="button"
              onClick={() => onPick(caseId)}
              disabled={!row}
              className={`snap-start shrink-0 w-[min(100%,280px)] text-left rounded-xl border px-4 py-4 transition-colors ${
                risk === 'high'
                  ? 'border-red-800/70 bg-red-950/25 hover:bg-red-950/40'
                  : risk === 'medium'
                    ? 'border-orange-800/60 bg-orange-950/20 hover:bg-orange-950/35'
                    : 'border-zinc-700 bg-zinc-900/50 hover:bg-zinc-900/70'
              } ${!row ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Case</div>
              <div className="mt-1 text-lg font-black text-white leading-tight">{row?.name ?? caseId}</div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-3xl font-black tabular-nums text-zinc-100 leading-none">
                  {suppressed || mi === null || mi === undefined ? '—' : mi}
                </span>
                <span className="text-[10px] font-bold uppercase text-zinc-500">mismatch</span>
              </div>
              <p className="mt-3 text-xs text-zinc-300 leading-snug">{tagline}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function CommonPatternBlock(): React.ReactElement {
  return (
    <section
      className="rounded-xl border border-zinc-700/80 bg-zinc-900/35 px-5 py-5 md:px-6"
      aria-labelledby="dme-common-pattern-title"
    >
      <h2 id="dme-common-pattern-title" className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-3">
        Common structure (cross-company)
      </h2>
      <p className="text-sm text-zinc-300 leading-relaxed">
        These cases share a common structure:
      </p>
      <ol className="mt-3 list-decimal list-inside space-y-2 text-sm text-zinc-300 leading-relaxed">
        <li>Public attribution of workforce change to AI (as stated or reported)</li>
        <li>Observable workforce disruption or restructuring signals in the corpus</li>
        <li>Limited or absent AI attribution in formal disclosures reviewed here</li>
      </ol>
      <p className="mt-4 text-xs text-zinc-500 leading-relaxed">
        This system flags overlap for further review — not proof of violation or causation.
      </p>
    </section>
  );
}

function SystemLimitsFooter(): React.ReactElement {
  return (
    <footer
      className="rounded-lg border border-zinc-700/80 bg-zinc-950/80 px-4 py-3 text-[11px] text-zinc-400 leading-relaxed"
      aria-label="System limits"
    >
      <div className="font-bold text-zinc-300 uppercase tracking-wide text-[10px] mb-1">System limits</div>
      <p>
        This system generates signals for review, not findings of causation or legal non-compliance.
      </p>
      <p className="mt-2">
        Results depend on: available public data, source coverage in this corpus, and classification assumptions baked
        into the scoring prototype.
      </p>
    </footer>
  );
}

function PolicyWhyMattersBlock(): React.ReactElement {
  return (
    <section
      className="rounded-xl border border-slate-700/60 bg-slate-950/40 px-4 py-4"
      aria-labelledby="dme-policy-why-title"
    >
      <h2 id="dme-policy-why-title" className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
        Why this matters
      </h2>
      <p className="text-xs text-slate-200/95 leading-relaxed">
        This system identifies cases where public AI-related workforce narratives may not align with formal labor
        disclosures in the sourced record.
      </p>
      <p className="mt-3 text-xs text-slate-400 leading-relaxed">
        If this pattern holds at scale, it could affect:
      </p>
      <ul className="mt-2 list-disc list-inside space-y-1.5 text-xs text-slate-300 leading-relaxed">
        <li>Labor market measurement accuracy</li>
        <li>Regulatory visibility into AI-driven displacement</li>
        <li>Worker transition planning</li>
        <li>Public understanding of AI’s economic impact</li>
      </ul>
      <p className="mt-3 text-[11px] text-slate-500 leading-relaxed">
        Framing is intentionally neutral — a hypothesis-testing aid for analysts and advocates, not an accusation.
      </p>
    </section>
  );
}

function ConfidenceExplained({ row }: { row: CompanyScoresRow }): React.ReactElement {
  const band = confidenceBandFromEvidence(row.evidence_quality);
  const tip = explainConfidence(row);
  return (
    <span className="inline-flex flex-col items-end gap-1 max-w-[14rem]" title={tip}>
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-black uppercase tracking-wide ${confidenceBandBadgeClasses(band)}`}
      >
        Confidence: {band}
      </span>
      <span className="font-mono text-sm text-zinc-300 tabular-nums">{row.confidence_score}</span>
      <span className="text-[10px] text-zinc-500 text-right leading-snug">Hover for factor breakdown</span>
    </span>
  );
}

function timelineNodeClasses(kind: TimelineEvent['kind']): string {
  if (kind === 'public_ai_statement') return 'border-amber-700/50 bg-amber-950/20';
  if (kind === 'workforce_disruption') return 'border-orange-800/50 bg-orange-950/15';
  return 'border-violet-800/45 bg-violet-950/15';
}

function SignalTimeline({ events }: { events: TimelineEvent[] }): React.ReactElement {
  if (events.length === 0) {
    return <p className="text-xs text-zinc-500">No dated timeline rows in this bundle.</p>;
  }
  return (
    <div className="space-y-3" aria-label="Signal timeline">
      <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
        Sequence view — read left to right on wide screens
      </div>
      <div className="flex flex-col md:flex-row md:items-stretch md:flex-nowrap gap-3 md:gap-0 overflow-x-auto pb-1">
        {events.map((ev, i) => (
          <React.Fragment key={`${ev.source_id}-${i}`}>
            {i > 0 ? (
              <div className="hidden md:flex items-center justify-center px-0.5 text-zinc-600 shrink-0 self-center">
                <ArrowRight className="w-4 h-4" aria-hidden />
              </div>
            ) : null}
            <div
              className={`shrink-0 w-full md:w-[min(100%,220px)] rounded-lg border px-3 py-3 flex flex-col gap-2 ${timelineNodeClasses(ev.kind)}`}
            >
              <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">{ev.phase_label}</div>
              <div className="text-[10px] text-zinc-500 font-mono">{ev.date}</div>
              <p className="text-xs text-zinc-200 leading-snug flex-1">{ev.excerpt}</p>
              {ev.url ? (
                <a
                  href={ev.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-sky-400 hover:text-sky-300 mt-1"
                >
                  Source
                  <ExternalLink className="w-3 h-3 opacity-80" aria-hidden />
                </a>
              ) : (
                <span className="text-[10px] text-zinc-600 mt-1">Annotation — no external URL</span>
              )}
            </div>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function SkepticismPanel({
  row,
  sources,
  overrideBullets,
}: {
  row: CompanyScoresRow;
  sources: DisclosureSource[];
  overrideBullets?: string[] | null;
}): React.ReactElement {
  const bullets = useMemo(
    () => overrideBullets ?? buildSkepticismBullets(row, sources),
    [overrideBullets, row, sources],
  );
  const confBand = confidenceBandFromEvidence(row.evidence_quality);
  return (
    <details className="rounded-lg border border-zinc-700 bg-zinc-950/60 group">
      <summary className="cursor-pointer list-none px-3 py-3 flex items-center justify-between gap-2 text-xs font-black uppercase tracking-wide text-zinc-400">
        <span>How could this signal be wrong?</span>
        <span className="text-[10px] text-zinc-600 group-open:hidden">Open</span>
        <span className="text-[10px] text-zinc-600 hidden group-open:inline">Close</span>
      </summary>
      <div className="px-3 pb-3 pt-0 space-y-3 border-t border-zinc-800/80">
        <ul className="mt-3 space-y-2 text-xs text-zinc-300 leading-relaxed list-disc list-inside">
          {bullets.map(b => (
            <li key={b}>{b}</li>
          ))}
        </ul>
        <div className="rounded-md border border-zinc-800 bg-black/30 px-3 py-2 text-[11px] text-zinc-400 leading-relaxed">
          <span className="font-bold text-zinc-300">Confidence ({confBand} band): </span>
          {explainConfidence(row)}
        </div>
      </div>
    </details>
  );
}

function BreakdownBlock({ title, block }: { title: string; block: AxisBreakdown }): React.ReactElement {
  return (
    <details className="rounded-lg border border-gray-800 bg-zinc-950/80 p-3 group">
      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wide text-zinc-500 list-none flex items-center justify-between">
        <span>
          {title} · total {block.total === null ? '—' : block.total}
        </span>
        <span className="text-[10px] text-zinc-600 group-open:hidden">Show</span>
      </summary>
      {block.components.length === 0 ? (
        <p className="text-xs text-zinc-500 mt-2">No contributing sources.</p>
      ) : (
        <ul className="space-y-2 text-xs text-zinc-300 mt-2">
          {block.components.map((c, i) => (
            <li key={`${c.source_id}-${i}`} className="border-l-2 border-zinc-700 pl-2">
              <span className="text-zinc-200 font-mono text-[10px]">{c.source_id}</span>{' '}
              <span className="text-zinc-500">{c.type}</span> · contribution{' '}
              <span className="text-amber-400/90">{c.contribution}</span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}

export const DisclosureMismatchView: React.FC<DisclosureMismatchViewProps> = ({
  isFullscreen = false,
}) => {
  const [rows, setRows] = useState<CompanyScoresRow[]>([]);
  const [corpusProvenance, setCorpusProvenance] = useState<CorpusProvenance | null>(null);
  const [disclaimers, setDisclaimers] = useState<string[]>([]);
  const [robustnessSummary, setRobustnessSummary] = useState<RobustnessSummary | null>(null);
  const [thresholdParams, setThresholdParams] = useState<ThresholdParams | null>(null);
  const [boundedMismatchThreshold, setBoundedMismatchThreshold] = useState(50);
  const [confidenceThreshold, setConfidenceThreshold] = useState(35);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailSources, setDetailSources] = useState<DisclosureSource[] | null>(null);
  const [detailScores, setDetailScores] = useState<CompanyScoresRow | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const amazonTableRowRef = useRef<HTMLTableRowElement | null>(null);

  const amazonRow = useMemo(() => rows.find(r => r.id === AMAZON_CASE_ID), [rows]);

  const rowsById = useMemo(() => {
    const m = new Map<string, CompanyScoresRow>();
    for (const r of rows) m.set(r.id, r);
    return m;
  }, [rows]);

  const focusAmazonLayoffSignals = useCallback(() => {
    setSelectedId(AMAZON_CASE_ID);
    window.requestAnimationFrame(() => {
      amazonTableRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const pickCompanyFromStrip = useCallback((id: string) => {
    setSelectedId(id);
    window.requestAnimationFrame(() => {
      document.getElementById(`dme-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }, []);

  const loadList = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCompaniesList(signal, {
        mismatchThreshold: boundedMismatchThreshold,
        confidenceThreshold,
      });
      setDisclaimers(data.disclaimers);
      setCorpusProvenance(data.corpus_provenance);
      setRows(data.companies);
      setRobustnessSummary(data.robustness_summary ?? null);
      setThresholdParams(data.threshold_params ?? null);
      setSelectedId(prev => {
        if (prev && data.companies.some(c => c.id === prev)) return prev;
        const firstScored = data.companies.find(c => !c.scores_suppressed);
        return firstScored?.id ?? data.companies[0]?.id ?? null;
      });
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      setCorpusProvenance(null);
      setError(
        (e as Error).message ||
          'Signals API unreachable. Run `npm run signals-server` with `npm run dev`, or `npm run dev:with-signals`.',
      );
    } finally {
      setLoading(false);
    }
  }, [boundedMismatchThreshold, confidenceThreshold]);

  const exportHref = useMemo(
    () =>
      exportSignalsJsonUrl({
        mismatchThreshold: boundedMismatchThreshold,
        confidenceThreshold,
      }),
    [boundedMismatchThreshold, confidenceThreshold],
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadList(ac.signal);
    return () => ac.abort();
  }, [loadList]);

  useEffect(() => {
    if (!selectedId) {
      setDetailSources(null);
      setDetailScores(null);
      return;
    }
    const ac = new AbortController();
    setDetailLoading(true);
    fetchCompanyDetail(selectedId, ac.signal, {
      mismatchThreshold: boundedMismatchThreshold,
      confidenceThreshold,
    })
      .then(d => {
        setDetailSources(d.company.sources);
        setDetailScores({
          id: d.company.id,
          name: d.company.name,
          sector: d.company.sector,
          ...(d.company.case_type ? { case_type: d.company.case_type } : {}),
          ...(d.company.reviewer_flag ? { reviewer_flag: d.company.reviewer_flag } : {}),
          ...d.company.scores,
          ...(d.company.flagged_at_threshold !== undefined
            ? { flagged_at_threshold: d.company.flagged_at_threshold }
            : {}),
          ...(d.company.risk_level_at_threshold !== undefined
            ? { risk_level_at_threshold: d.company.risk_level_at_threshold }
            : {}),
        });
      })
      .catch(() => {
        setDetailSources([]);
        setDetailScores(null);
      })
      .finally(() => setDetailLoading(false));
    return () => ac.abort();
  }, [selectedId, boundedMismatchThreshold, confidenceThreshold]);

  const patternSummaryStats = useMemo((): PatternSummaryStats => {
    const scored = rows.filter(r => !r.scores_suppressed && r.mismatch_index !== null);
    const n = scored.length;
    const companiesAboveThreshold = scored.filter(
      r => (r.mismatch_index ?? 0) > PATTERN_RAW_MI_THRESHOLD,
    ).length;
    const flaggedAtThreshold =
      robustnessSummary?.flagged_count_at_threshold ??
      scored.filter(r => r.flagged_at_threshold === true).length;
    const dsZero = scored.filter(r => (r.ds ?? 0) === 0).length;
    const pctNoAiDisclosure = n === 0 ? 0 : Math.round((dsZero / n) * 100);
    const avgMismatchIndex =
      n === 0 ? 0 : Math.round(scored.reduce((s, r) => s + (r.mismatch_index ?? 0), 0) / n);
    return {
      companiesAboveThreshold,
      flaggedAtThreshold,
      pctNoAiDisclosure,
      avgMismatchIndex,
      scoredCount: n,
    };
  }, [rows, robustnessSummary]);

  const structuralMismatchEmployerCount = useMemo(() => countStructuralMismatchEmployers(rows), [rows]);
  const multiCompanyStructuralPattern = structuralMismatchEmployerCount >= 2;
  const patternStrength = useMemo(() => computePatternStrength(patternSummaryStats), [patternSummaryStats]);

  const tableRows = useMemo(() => {
    return [...rows].sort((a, b) => {
      if (a.scores_suppressed !== b.scores_suppressed) return a.scores_suppressed ? 1 : -1;
      const miDiff = (b.mismatch_index ?? -9999) - (a.mismatch_index ?? -9999);
      if (miDiff !== 0) return miDiff;
      return (b.confidence_score ?? 0) - (a.confidence_score ?? 0);
    });
  }, [rows]);

  const selectedRow = useMemo(
    () => rows.find(r => r.id === selectedId) ?? null,
    [rows, selectedId],
  );

  const drillScores = detailScores ?? selectedRow;
  const drillPartition = useMemo(
    () => partitionSources(detailSources ?? []),
    [detailSources],
  );

  const detailTimeline = useMemo(() => {
    if (!detailSources) return [];
    return buildTimelineFromSources(detailSources);
  }, [detailSources]);

  const reportExtras = useMemo(
    () => ({
      thresholdParams: thresholdParams ?? {
        bounded_mismatch_minimum: boundedMismatchThreshold,
        confidence_minimum: confidenceThreshold,
      },
      robustnessSummary: robustnessSummary ?? undefined,
    }),
    [
      thresholdParams,
      robustnessSummary,
      boundedMismatchThreshold,
      confidenceThreshold,
    ],
  );

  const handleExportCaseReport = useCallback(() => {
    if (!selectedRow || !drillScores || !detailSources || detailLoading) return;
    const payload = buildCaseReportPayload(
      selectedRow.id,
      selectedRow.name,
      selectedRow.sector,
      drillScores,
      detailSources,
      disclaimers,
      reportExtras,
    );
    downloadJsonReport(`disclosure-case-report-${selectedRow.id}.json`, payload);
  }, [detailLoading, detailSources, disclaimers, drillScores, reportExtras, selectedRow]);

  const handleOpenCaseReportHtml = useCallback(() => {
    if (!selectedRow || !drillScores || !detailSources || detailLoading) return;
    const payload = buildCaseReportPayload(
      selectedRow.id,
      selectedRow.name,
      selectedRow.sector,
      drillScores,
      detailSources,
      disclaimers,
      reportExtras,
    );
    openCaseReportHtmlWindow(payload);
  }, [detailLoading, detailSources, disclaimers, drillScores, reportExtras, selectedRow]);

  const pad = isFullscreen ? 'p-5' : 'p-6 md:p-8';

  return (
    <div className={`min-h-0 h-full overflow-auto ${pad} bg-zinc-950 text-zinc-100`}>
      <style>{`
        @keyframes dme-amazon-alert-in {
          from {
            opacity: 0;
            transform: translateY(14px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .dme-amazon-alert-enter {
          animation: dme-amazon-alert-in 0.6s ease-out both;
        }
      `}</style>
      <div className="max-w-6xl mx-auto space-y-6 pb-10">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-red-900/30 pb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-red-500/90">
              <Radar className="w-5 h-5 shrink-0" aria-hidden />
              <span className="text-xs font-bold uppercase tracking-widest">Watchdog signal</span>
            </div>
            <p className="mt-2 text-sm md:text-base text-zinc-300 font-semibold leading-snug max-w-xl">
              This is not just Amazon — this is a structural pattern in AI labor reporting (hypothesis-scale).
            </p>
            {!loading && !error && multiCompanyStructuralPattern ? (
              <p className="mt-2 text-xs text-zinc-500 leading-relaxed max-w-xl">
                Several scored employers jointly match a disclosure-gap signature — framed as an emerging empirical finding
                for review, not a verdict on any one firm.
              </p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void loadList()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-zinc-700 bg-zinc-900 text-xs font-semibold text-zinc-200 hover:bg-zinc-800"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <a
              href={exportHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-red-900/50 bg-red-950/40 text-xs font-semibold text-red-200 hover:bg-red-950/60"
            >
              <Download className="w-3.5 h-3.5" />
              Export all signals
            </a>
          </div>
        </div>

        {!loading && !error && corpusProvenance ? (
          <div
            className="rounded-md border border-amber-900/40 bg-amber-950/25 px-3 py-2 text-[11px] text-amber-100/90 leading-relaxed"
            role="status"
            aria-label="Signals corpus provenance"
          >
            <span className="font-bold text-amber-200">Corpus source: </span>
            <span className="font-mono text-amber-100">{corpusProvenance.corpus_mode}</span>
            <span className="text-zinc-500"> · </span>
            {corpusProvenance.corpus_mode === 'seeded' ? (
              <span>
                Built-in seed ({corpusProvenance.active_company_count} employers)
                {corpusProvenance.fallback_reason ? (
                  <span className="text-zinc-500"> — {corpusProvenance.fallback_reason}</span>
                ) : null}
              </span>
            ) : (
              <span className="font-mono break-all text-amber-50/90">
                {corpusProvenance.artifact_path ?? '—'}
              </span>
            )}
            <span className="text-zinc-500"> · </span>
            <span className="font-mono text-zinc-400">
              active={corpusProvenance.active_company_count} · baseline_seed=
              {corpusProvenance.seed_baseline_company_count}
            </span>
            {corpusProvenance.corpus_mode === 'mixed' &&
            (corpusProvenance.seed_appended_ids?.length ||
              corpusProvenance.seed_skipped_duplicate_ids?.length) ? (
              <span className="block mt-1 text-[10px] text-zinc-500 font-mono">
                appended_ids: {(corpusProvenance.seed_appended_ids ?? []).join(', ') || '—'} · skipped_dup:{' '}
                {(corpusProvenance.seed_skipped_duplicate_ids ?? []).join(', ') || '—'}
              </span>
            ) : null}
          </div>
        ) : null}

        {!loading && !error ? (
          <>
            <ThresholdReviewToolbar
              bounded={boundedMismatchThreshold}
              confidence={confidenceThreshold}
              flaggedCount={patternSummaryStats.flaggedAtThreshold}
              onBounded={setBoundedMismatchThreshold}
              onConfidence={setConfidenceThreshold}
            />
            <PatternStrengthIndicator
              strength={patternStrength}
              stability={
                robustnessSummary?.pattern_stability
                  ? {
                      label: robustnessSummary.pattern_stability.label,
                      persistence: robustnessSummary.pattern_stability.mean_persistence_across_bounded_sweep,
                    }
                  : null
              }
            />
          </>
        ) : null}

        {!loading && !error && amazonRow ? (
          <AmazonFeaturedAlertCard
            amazon={amazonRow}
            onLayoffSignalsClick={focusAmazonLayoffSignals}
            multiCompanyStructuralPattern={multiCompanyStructuralPattern}
          />
        ) : null}

        {!loading && !error ? (
          <>
            <WhatThisSuggestsPanel />
            <CrossCaseComparisonSnapshot rowsById={rowsById} onPick={pickCompanyFromStrip} />
            <WhatWouldChangeAssessmentPanel />
            <PatternSummaryPanel
              stats={patternSummaryStats}
              multiCompanyStructuralPattern={multiCompanyStructuralPattern}
            />
            <MultiCaseStrip rowsById={rowsById} onPick={pickCompanyFromStrip} />
            <CommonPatternBlock />
          </>
        ) : null}

        {/* How it works */}
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-5 py-5" aria-labelledby="how-works">
          <h2 id="how-works" className="text-sm font-black uppercase tracking-widest text-zinc-400 mb-4">
            How this works
          </h2>
          <div className="flex flex-col md:flex-row md:items-stretch gap-4 md:gap-2">
            <div className="flex flex-1 gap-3 rounded-lg border border-zinc-800 bg-black/30 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-950/80 border border-amber-700/50 text-sm font-black text-amber-200">
                1
              </div>
              <div>
                <div className="flex items-center gap-2 text-amber-200 font-bold text-sm">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  AI workforce statements
                </div>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Detect earnings, press, and exec language attributing roles or productivity to AI and automation.
                </p>
              </div>
            </div>
            <div className="flex md:flex-col items-center justify-center text-zinc-600 py-1 md:py-0 md:px-1 shrink-0">
              <ArrowRight className="w-6 h-6 md:rotate-0 rotate-90" aria-hidden />
            </div>
            <div className="flex flex-1 gap-3 rounded-lg border border-zinc-800 bg-black/30 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-950/80 border border-orange-700/50 text-sm font-black text-orange-200">
                2
              </div>
              <div>
                <div className="flex items-center gap-2 text-orange-200 font-bold text-sm">
                  <Users className="w-4 h-4 shrink-0" />
                  Layoffs &amp; WARN
                </div>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Stack workforce disruption signals: WARN filings and formal layoff announcements.
                </p>
              </div>
            </div>
            <div className="flex md:flex-col items-center justify-center text-zinc-600 py-1 md:py-0 md:px-1 shrink-0">
              <ArrowRight className="w-6 h-6 md:rotate-0 rotate-90" aria-hidden />
            </div>
            <div className="flex flex-1 gap-3 rounded-lg border border-zinc-800 bg-black/30 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-950/80 border border-red-800/50 text-sm font-black text-red-200">
                3
              </div>
              <div>
                <div className="flex items-center gap-2 text-red-200 font-bold text-sm">
                  <Gavel className="w-4 h-4 shrink-0" />
                  Legal disclosure gap
                </div>
                <p className="mt-1 text-xs text-zinc-400 leading-relaxed">
                  Compare to formal texts: is AI named as a cause where rules allow? Low disclosure inflates mismatch.
                </p>
              </div>
            </div>
          </div>
        </section>

        {loading ? <p className="text-zinc-500 text-sm">Loading ranked signals…</p> : null}
        {error ? (
          <div className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-200">{error}</div>
        ) : null}

        {!loading && !error ? (
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
            {/* 2. Main table */}
            <div className="xl:col-span-3 space-y-3">
              {/* S1 Stage C/D — early-warning timeline spine + LIVE/DESIGN honesty layer.
                  Withheld candidates are shown first-class; corroborated candidates show
                  the Epoch AI lead-time ladder (CC-BY). */}
              <section className="space-y-2">
                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <h2 className="text-lg font-black text-white tracking-tight">
                    Early-warning timeline · two-source gate
                  </h2>
                  <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-wide">
                    Epoch AI confirm feed · CC-BY
                  </span>
                </div>
                <div className="space-y-2">
                  {tableRows.map(row => (
                    <EpochConfirmTimeline key={`ewt-${row.id}`} row={row} />
                  ))}
                </div>
              </section>

              <div className="flex items-baseline justify-between gap-2 flex-wrap">
                <h2 className="text-lg font-black text-white tracking-tight">Cross-company corpus</h2>
                <span className="text-[11px] text-zinc-500 uppercase font-bold tracking-wide">
                  Sort: mismatch index (desc), then confidence (desc)
                </span>
              </div>
              <div className="rounded-xl border border-zinc-800 overflow-hidden bg-black/60 shadow-xl shadow-black/40">
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-zinc-900/95 text-[10px] font-black uppercase tracking-wider text-zinc-500 border-b border-zinc-800">
                      <tr>
                        <th className="px-4 py-3">Company</th>
                        <th className="px-4 py-3 text-right">Mismatch</th>
                        <th className="px-4 py-3">Risk @gate</th>
                        <th className="px-4 py-3 text-right">Confidence</th>
                        <th className="px-4 py-3 min-w-[200px]">Key signal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tableRows.map(row => (
                        <tr
                          key={row.id}
                          ref={row.id === AMAZON_CASE_ID ? amazonTableRowRef : undefined}
                          id={`dme-row-${row.id}`}
                          onClick={() => setSelectedId(row.id)}
                          className={`border-t border-zinc-800/90 cursor-pointer transition-colors hover:bg-zinc-900/80 ${
                            selectedId === row.id ? 'bg-red-950/15' : ''
                          } ${row.id === AMAZON_CASE_ID ? 'ring-1 ring-inset ring-amber-600/25 bg-amber-950/5' : ''}`}
                        >
                          <td className="px-4 py-4 align-top">
                            <div className="font-bold text-white">{row.name}</div>
                            <div className="text-[11px] text-zinc-500">{row.sector}</div>
                            <div className="flex flex-wrap gap-1.5 mt-1">
                              {row.case_type === 'sourced_case' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded border border-teal-600/55 bg-teal-950/65 text-[10px] font-black uppercase tracking-wide text-teal-100">
                                  Sourced Case
                                </span>
                              ) : null}
                              {row.reviewer_flag === 'human_review_required' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded border border-rose-700/50 bg-rose-950/55 text-[10px] font-black uppercase tracking-wide text-rose-100">
                                  Human review
                                </span>
                              ) : null}
                              {row.case_type === 'control_case' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded border border-slate-600/60 bg-slate-900/70 text-[10px] font-black uppercase tracking-wide text-slate-200">
                                  Control case
                                </span>
                              ) : null}
                              {row.possible_false_positive ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded border border-orange-700/50 bg-orange-950/50 text-[10px] font-black uppercase tracking-wide text-orange-100">
                                  Possible FP
                                </span>
                              ) : null}
                              {row.possible_false_negative ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded border border-cyan-800/55 bg-cyan-950/40 text-[10px] font-black uppercase tracking-wide text-cyan-100">
                                  Possible FN
                                </span>
                              ) : null}
                              {showsDisclosureGapPattern(row) ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded border border-violet-600/55 bg-violet-950/65 text-[10px] font-black uppercase tracking-wide text-violet-100">
                                  Disclosure Gap Pattern
                                </span>
                              ) : null}
                              {multiCompanyStructuralPattern && showsDisclosureGapPattern(row) ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded border border-violet-500/35 bg-violet-950/40 text-[10px] font-bold uppercase tracking-wide text-violet-200/90">
                                  Structural pattern
                                </span>
                              ) : null}
                              {row.scores_suppressed ? (
                                <span className="inline-flex items-center text-[10px] text-zinc-500">Signal withheld</span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top text-right">
                            <span
                              className={`text-2xl md:text-3xl font-black tabular-nums leading-none ${mismatchCellClasses(row.risk_level, row.scores_suppressed)}`}
                            >
                              {row.mismatch_index === null ? '—' : row.mismatch_index}
                            </span>
                            <div className="text-[10px] text-zinc-600 mt-1 font-mono">
                              BMI {row.bounded_mismatch_index ?? '—'}
                            </div>
                          </td>
                          <td className="px-4 py-4 align-top">
                            <span
                              className={`inline-flex px-2.5 py-1 rounded-md border text-[10px] font-black uppercase tracking-wide ${riskBadgeClasses(
                                row.risk_level_at_threshold ?? row.risk_level,
                              )}`}
                            >
                              {row.risk_level_at_threshold ?? row.risk_level}
                            </span>
                            {!row.scores_suppressed &&
                            row.risk_level_at_threshold &&
                            row.risk_level_at_threshold !== row.risk_level ? (
                              <div className="text-[9px] text-zinc-600 mt-1 font-mono">model: {row.risk_level}</div>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 align-top text-right">
                            {row.scores_suppressed ? (
                              <span className="text-sm text-zinc-500">—</span>
                            ) : (
                              <div className="inline-flex flex-col items-end gap-1">
                                <ConfidenceExplained row={row} />
                                {typeof row.source_coverage_score === 'number' ? (
                                  <span className="text-[9px] text-zinc-600 font-mono">
                                    coverage {row.source_coverage_score}
                                  </span>
                                ) : null}
                                {row.low_confidence_flag ? (
                                  <span className="text-[10px] text-amber-600 font-sans">Low model flag</span>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-4 align-top text-xs text-zinc-300 leading-snug max-w-xs">
                            {keySignalLine(row)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <p className="text-[11px] text-zinc-600 leading-relaxed">
                Labels describe <span className="text-zinc-400">potential under-disclosure</span> for review — not proof
                of wrongdoing. <span className="text-zinc-400">Mismatch ≠ causation.</span>
              </p>
            </div>

            {/* 4. Why flagged drilldown */}
            <div className="xl:col-span-2">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 flex flex-col min-h-[280px] xl:sticky xl:top-4 max-h-[calc(100vh-6rem)]">
                <div className="px-4 py-3 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-xs font-black uppercase tracking-widest text-zinc-400">Case investigation</span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      disabled={
                        detailLoading ||
                        !detailSources ||
                        detailSources.length === 0 ||
                        !selectedRow ||
                        !drillScores
                      }
                      onClick={handleExportCaseReport}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-sky-800/55 bg-sky-950/35 text-xs font-semibold text-sky-100 hover:bg-sky-950/55 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      Export JSON
                    </button>
                    <button
                      type="button"
                      disabled={
                        detailLoading ||
                        !detailSources ||
                        detailSources.length === 0 ||
                        !selectedRow ||
                        !drillScores
                      }
                      onClick={handleOpenCaseReportHtml}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md border border-amber-800/50 bg-amber-950/30 text-xs font-semibold text-amber-100 hover:bg-amber-950/50 disabled:opacity-40 disabled:pointer-events-none"
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" aria-hidden />
                      Print / PDF sheet
                    </button>
                  </div>
                </div>
                {selectedRow && drillScores ? (
                  <div className="p-4 space-y-4 flex-1 overflow-y-auto min-h-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-lg font-black text-white">{drillScores.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">
                          {drillScores.period_start} → {drillScores.period_end}
                        </div>
                        {showsDisclosureGapPattern(drillScores) ? (
                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-1 rounded border border-violet-600/55 bg-violet-950/65 text-[10px] font-black uppercase tracking-wide text-violet-100">
                              Disclosure Gap Pattern
                            </span>
                            {multiCompanyStructuralPattern ? (
                              <span className="block mt-1 text-[10px] text-violet-300/90 leading-snug">
                                Potential structural under-disclosure pattern — multi-employer hypothesis; not proof of
                                wrongdoing.
                              </span>
                            ) : (
                              <span className="block mt-1 text-[10px] text-zinc-500">
                                High mismatch with DS = 0 — signal for review, not a finding.
                              </span>
                            )}
                          </div>
                        ) : null}
                      </div>
                      {!drillScores.scores_suppressed ? <ConfidenceExplained row={drillScores} /> : null}
                    </div>

                    {detailSources && !detailLoading ? (
                      <div className="rounded-lg border border-zinc-700/80 bg-black/25 px-3 py-3">
                        <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500 mb-2">
                          Summary narrative (auto-generated)
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed">
                          {generateCaseSummary(drillScores.name, drillScores, detailSources)}
                        </p>
                      </div>
                    ) : null}

                    <section className="rounded-lg border border-zinc-700/90 bg-zinc-950/40 px-3 py-3">
                      <div className="text-[10px] font-black uppercase tracking-wide text-zinc-400 mb-2">
                        Timeline
                      </div>
                      {detailLoading ? (
                        <p className="text-zinc-500 text-sm">Loading timeline sources…</p>
                      ) : (
                        <SignalTimeline events={detailTimeline} />
                      )}
                    </section>

                    {drillScores.case_type === 'sourced_case' && detailSources ? (
                      <div className="rounded-lg border border-zinc-700 bg-black/30 px-3 py-3 space-y-2">
                        <div className="text-[10px] font-black uppercase tracking-wide text-zinc-500">
                          Sourced pack — open linked rows
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {detailSources
                            .filter(
                              s =>
                                typeof s.url === 'string' &&
                                s.url.length > 0 &&
                                s.type !== 'disclosure_gap_annotation',
                            )
                            .map(s => (
                              <a
                                key={s.id}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md border border-zinc-600 bg-zinc-900 text-[11px] font-bold text-zinc-200 hover:bg-zinc-800 max-w-[14rem]"
                              >
                                <span className="truncate">
                                  {s.source_name ?? s.type.replace(/_/g, ' ')}
                                </span>
                                <ExternalLink className="w-3 h-3 shrink-0 opacity-80" aria-hidden />
                              </a>
                            ))}
                        </div>
                        {detailSources.filter(s => s.url && s.url.length > 0 && s.type !== 'disclosure_gap_annotation')
                          .length === 0 ? (
                          <p className="text-[11px] text-zinc-500">No URLs on corpus rows — add primaries to enable links.</p>
                        ) : null}
                      </div>
                    ) : null}

                    <PolicyWhyMattersBlock />

                    <div className="rounded-lg border border-amber-900/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-100/95 leading-relaxed">
                      <strong className="text-amber-200">Potential under-disclosure:</strong> Public channels show AI
                      attribution tied to workforce or efficiency, while matched formal notices in this corpus{' '}
                      <strong className="text-white">do not state AI as a cause</strong> (prototype scope).
                    </div>

                    {detailLoading ? (
                      <p className="text-zinc-500 text-sm">Loading source bundle…</p>
                    ) : (
                      <>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wide text-amber-500/90 mb-2">
                            AI attribution detected (trace)
                          </div>
                          {drillPartition.aiStatements.length === 0 ? (
                            <p className="text-xs text-zinc-500">No public AI statements in bundle.</p>
                          ) : (
                            <ul className="space-y-2">
                              {drillPartition.aiStatements.slice(0, 8).map(s => (
                                <li
                                  key={s.id}
                                  className="rounded-md border border-amber-800/30 bg-amber-950/10 px-3 py-2 text-xs text-amber-50/95 leading-relaxed"
                                >
                                  <span className="text-[10px] uppercase text-amber-600/90 font-bold">{s.type}</span>{' '}
                                  <span className="text-zinc-500">{s.date}</span>
                                  {s.source_name ? (
                                    <div className="mt-1 text-[11px] font-semibold text-amber-200/90">{s.source_name}</div>
                                  ) : null}
                                  <p className="mt-1 text-amber-50">{s.text_excerpt}</p>
                                  {s.url ? (
                                    <a
                                      href={s.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-sky-400"
                                    >
                                      Link
                                      <ExternalLink className="w-3 h-3 opacity-80" aria-hidden />
                                    </a>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wide text-orange-500/90 mb-2">
                            Workforce disruption (WARN / layoff)
                          </div>
                          {drillPartition.warnSignals.length === 0 ? (
                            <p className="text-xs text-zinc-500">No WARN/layoff rows in bundle.</p>
                          ) : (
                            <ul className="space-y-2">
                              {drillPartition.warnSignals.map(s => (
                                <li
                                  key={s.id}
                                  className="rounded-md border border-orange-900/40 bg-orange-950/15 px-3 py-2 text-xs text-orange-50/95"
                                >
                                  <span className="text-[10px] uppercase font-bold text-orange-400">{s.type}</span>{' '}
                                  {typeof s.workers_affected === 'number' ? (
                                    <span className="text-zinc-400">· ~{s.workers_affected} workers cited</span>
                                  ) : null}
                                  <p className="mt-1">{s.text_excerpt}</p>
                                  {s.url ? (
                                    <a
                                      href={s.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 mt-2 text-[11px] font-bold text-sky-400"
                                    >
                                      Link
                                      <ExternalLink className="w-3 h-3 opacity-80" aria-hidden />
                                    </a>
                                  ) : null}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>

                        <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-3 text-xs text-red-100/90 leading-relaxed">
                          <strong className="text-red-300">No corresponding legal disclosure (in corpus):</strong>{' '}
                          WARN excerpts reviewed here{' '}
                          <strong className="text-white">do not attribute reductions to AI</strong>. Formal disclosure
                          score (DS) is {(drillScores.ds ?? 0) === 0 ? 'zero' : String(drillScores.ds)} — contrast with
                          public AI attribution score {(drillScores.aas ?? 0)} and disruption {(drillScores.lss ?? 0)}.
                          <span className="block mt-2 text-red-200/80">
                            → That gap drives the mismatch index — a diligence signal, not a verdict.
                          </span>
                        </div>

                        {detailSources ? (
                          <SkepticismPanel
                            row={drillScores}
                            sources={detailSources}
                            overrideBullets={
                              drillScores.case_type === 'sourced_case' ? SOURCED_CASE_PACK_SKEPTICISM : null
                            }
                          />
                        ) : null}

                        {drillScores.warnings.length > 0 ? (
                          <ul className="text-[11px] text-orange-300/90 space-y-1 list-disc list-inside">
                            {drillScores.warnings.map(w => (
                              <li key={w}>{w}</li>
                            ))}
                          </ul>
                        ) : null}

                        <div className="pt-2 border-t border-zinc-800 space-y-2">
                          <div className="text-[10px] font-black uppercase text-zinc-600">Technical trace (optional)</div>
                          <BreakdownBlock title="AI attribution (AAS)" block={drillScores.score_breakdown.aas} />
                          <BreakdownBlock title="Disruption (LSS)" block={drillScores.score_breakdown.lss} />
                          <BreakdownBlock title="Formal disclosure (DS)" block={drillScores.score_breakdown.ds} />
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="p-4 text-zinc-500 text-sm">Select a company in the table.</p>
                )}
              </div>
            </div>
          </div>
        ) : null}

        <div className="pt-2">
          <SystemLimitsFooter />
        </div>

        {/* Disclaimers — bottom, compact */}
        {!loading && !error ? (
          <footer className="rounded-lg border border-zinc-800 bg-black/40 px-4 py-3 text-[11px] text-zinc-500 leading-relaxed space-y-1">
            <div className="font-bold text-zinc-400 uppercase tracking-wide text-[10px]">Legal &amp; methods</div>
            <ul className="list-disc list-inside space-y-0.5">
              {(disclaimers.length ? disclaimers : ['Signal, not verdict.']).map(line => (
                <li key={line}>{line}</li>
              ))}
              <li>WARN ≠ full layoff census; many cuts never appear in WARN data.</li>
              <li>Mismatch ≠ causation — indicates channels disagree, not that AI “caused” a specific layoff.</li>
              <li>
                <span className="text-zinc-400">Export all signals</span> honors the same threshold query string as the
                toolbar. <span className="text-zinc-400">Export JSON</span> is one-employer structured data;{' '}
                <span className="text-zinc-400">Print / PDF sheet</span> opens an HTML case sheet with robustness checks
                (use browser print to PDF).
              </li>
            </ul>
          </footer>
        ) : null}
      </div>
    </div>
  );
};
