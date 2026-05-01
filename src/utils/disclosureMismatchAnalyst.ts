/**
 * Analyst-layer helpers: timelines, narratives, skepticism, case-report payload.
 * Keeps DisclosureMismatchView thin and logic testable.
 */

import type {
  CompanyScoresRow,
  DisclosureSource,
  RobustnessSummary,
  ThresholdParams,
} from '../api/disclosureMismatchClient';

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

/** Disruption rows shown on the timeline (includes reported reductions without WARN excerpts). */
const WARN_DISRUPTION_TYPES = new Set([
  'warn_filing',
  'layoff_announcement',
  'workforce_disruption_signal',
]);

const WARN_PAIRED_DISCLOSURE_TYPES = new Set(['warn_filing', 'layoff_announcement']);

const DISCLOSURE_GAP_ANNOTATION = 'disclosure_gap_annotation';

/** Shared skepticism copy for all `sourced_case` packs — falsifiability without diluting case-specific nuance. */
export const SOURCED_CASE_PACK_SKEPTICISM: string[] = [
  'AI statements may reflect strategy, product positioning, or long-term mix — not immediate layoffs or verified net employment effects.',
  'Workforce changes may have multiple causes (macro, restructuring, geography, performance) independent of how public remarks emphasize AI.',
  'Disclosure systems may not require granular AI attribution even when public narratives highlight automation.',
  'Data coverage in this bundle may be incomplete; absence of a disclosure row is not proof of absence in the full regulatory record.',
];

const LEGAL_TYPES = new Set(['legal_notice', 'severance_communication', 'annual_report']);

export type TimelineKind = 'public_ai_statement' | 'workforce_disruption' | 'disclosure_check';

export interface TimelineEvent {
  kind: TimelineKind;
  date: string;
  excerpt: string;
  url: string;
  source_id: string;
  /** Short UI label */
  phase_label: string;
}

const KIND_SORT: Record<TimelineKind, number> = {
  public_ai_statement: 0,
  workforce_disruption: 1,
  disclosure_check: 2,
};

function disclosureCheckExcerpt(s: DisclosureSource): string {
  if (s.ai_disclosed_in_warn === true) {
    return 'Review flag: available filing text suggests AI-related cause language may be present — verify primary source.';
  }
  if (s.ai_disclosed_in_warn === false) {
    return 'Disclosure check: excerpt reviewed in corpus does not attribute reductions to AI (jurisdiction and completeness limits apply).';
  }
  return 'Disclosure check: AI causation not verified from available filing text in this bundle.';
}

function phaseLabel(kind: TimelineKind): string {
  if (kind === 'public_ai_statement') return 'Public AI signal';
  if (kind === 'workforce_disruption') return 'Workforce disruption';
  return 'Disclosure check';
}

function publicAiPhaseLabel(sourceType: string): string {
  if (sourceType === 'public_ai_statement') return 'Public AI statement (official)';
  if (sourceType === 'secondary_public_report') return 'Public AI statement (secondary report)';
  return 'Public AI signal';
}

function disruptionPhaseLabel(sourceType: string): string {
  if (sourceType === 'workforce_disruption_signal') return 'Reported workforce reduction';
  return 'Workforce disruption (WARN / layoff)';
}

export function buildTimelineFromSources(sources: DisclosureSource[]): TimelineEvent[] {
  const out: TimelineEvent[] = [];

  for (const s of sources) {
    if (PUBLIC_AI_TYPES.has(s.type)) {
      out.push({
        kind: 'public_ai_statement',
        date: s.date,
        excerpt: s.text_excerpt,
        url: s.url,
        source_id: s.id,
        phase_label: publicAiPhaseLabel(s.type),
      });
    }
  }

  for (const s of sources) {
    if (WARN_DISRUPTION_TYPES.has(s.type)) {
      out.push({
        kind: 'workforce_disruption',
        date: s.date,
        excerpt: s.text_excerpt,
        url: s.url,
        source_id: s.id,
        phase_label: disruptionPhaseLabel(s.type),
      });
    }
  }

  for (const s of sources) {
    if (WARN_PAIRED_DISCLOSURE_TYPES.has(s.type)) {
      out.push({
        kind: 'disclosure_check',
        date: s.date,
        excerpt: disclosureCheckExcerpt(s),
        url: s.url,
        source_id: `${s.id}__disclosure_check`,
        phase_label: phaseLabel('disclosure_check'),
      });
    }
  }

  for (const s of sources) {
    if (LEGAL_TYPES.has(s.type)) {
      out.push({
        kind: 'disclosure_check',
        date: s.date,
        excerpt: s.ai_disclosed_in_legal
          ? 'Legal / SEC-style row: AI-related workforce language may be present — verify filing.'
          : 'Legal / formal row reviewed: AI-specific workforce causation not observed in excerpt.',
        url: s.url,
        source_id: s.id,
        phase_label: 'Formal disclosure review',
      });
    }
  }

  for (const s of sources) {
    if (s.type === DISCLOSURE_GAP_ANNOTATION) {
      out.push({
        kind: 'disclosure_check',
        date: s.date,
        excerpt: s.text_excerpt,
        url: s.url || '',
        source_id: s.id,
        phase_label: 'Disclosure check (attached records)',
      });
    }
  }

  return out.sort((a, b) => {
    const ta = Date.parse(a.date);
    const tb = Date.parse(b.date);
    if (ta !== tb && !Number.isNaN(ta) && !Number.isNaN(tb)) return ta - tb;
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return KIND_SORT[a.kind] - KIND_SORT[b.kind];
  });
}

export type ConfidenceBandLabel = 'Low' | 'Medium' | 'High';

export function confidenceBandFromEvidence(eq: CompanyScoresRow['evidence_quality']): ConfidenceBandLabel {
  if (eq === 'high') return 'High';
  if (eq === 'moderate') return 'Medium';
  return 'Low';
}

export function confidenceBandBadgeClasses(band: ConfidenceBandLabel): string {
  if (band === 'High') return 'border-emerald-700/60 bg-emerald-950/50 text-emerald-100';
  if (band === 'Medium') return 'border-amber-700/55 bg-amber-950/45 text-amber-100';
  return 'border-zinc-600 bg-zinc-900 text-zinc-300';
}

export function explainConfidence(row: CompanyScoresRow): string {
  const b = row.confidence_breakdown;
  const cov = b.source_coverage_score ?? 0;
  const ind = b.independent_evidence_rows ?? row.source_count;
  const parts = [
    `Numeric confidence score ${row.confidence_score}/100 blends five internal factors (prototype).`,
    `Source density (${b.source_density}/100): reflects how many sourced items entered the bundle.`,
    `Recency (${b.recency_avg}/100): average freshness of dated rows versus the scoring reference date.`,
    `Classification certainty (${b.classification_certainty}/100): strength of AI-attribution tiers where applicable.`,
    `Channel diversity (${b.channel_diversity}/100): presence of public AI, WARN/layoff, and legal-formal channels.`,
    `Source coverage (${cov}/100): independent evidence rows (${ind}) plus primary vs secondary channel-family mix.`,
  ];
  if (row.low_confidence_flag) parts.push('Model flagged low-confidence — interpret cautiously.');
  if (row.scores_suppressed) parts.push('Scores suppressed — confidence narrative may not apply.');
  return parts.join(' ');
}

export function buildSkepticismBullets(row: CompanyScoresRow, sources: DisclosureSource[]): string[] {
  const bullets: string[] = [
    'AI attribution in public remarks may reflect long-term strategy, efficiency rhetoric, or investor framing — not necessarily contemporaneous layoff causes.',
    'WARN filings and notices vary by jurisdiction; cause fields may be omitted, summarized, or non-specific.',
    'Workforce changes may be driven by macroeconomic conditions, restructuring, M&A, or site strategy independent of AI tooling.',
    'Source coverage in this corpus may be incomplete; absence of a row is not proof of absence in the real world.',
  ];

  const hasStrongAi = sources.some(
    s => PUBLIC_AI_TYPES.has(s.type) && (s.ai_attribution_tier === 'strong' || s.ai_attribution_tier === 'moderate'),
  );
  if (!hasStrongAi && !row.scores_suppressed) {
    bullets.push('Public AI attribution tiers are mixed or weak — the narrative may be softer than headline mismatch suggests.');
  }

  const warnN = sources.filter(s => WARN_DISRUPTION_TYPES.has(s.type)).length;
  if (warnN === 0 && (row.lss ?? 0) > 0) {
    bullets.push('Disruption score derives from bundled WARN logic; if no WARN rows display, verify API payload sync.');
  }

  if (row.missing_expected_sources.length > 0) {
    bullets.push(
      `Expected channel gaps flagged: ${row.missing_expected_sources.join(', ')} — increases risk of one-sided comparison.`,
    );
  }

  if (row.source_count < 4) {
    bullets.push('Few primary sources — confidence and mismatch should be treated as provisional.');
  }

  return bullets;
}

export function buildLimitations(row: CompanyScoresRow, sources: DisclosureSource[]): string[] {
  return [
    'Prototype corpus and classification rules — not a regulatory filing or legal conclusion.',
    'Timelines reflect dated seed rows only; real-world event order may differ.',
    `Bundle contains ${sources.length} source rows (${row.source_types_present.join(', ') || 'none listed'}).`,
    'Disclosure check reflects excerpt-level review flags in data — not full docket review.',
  ];
}

export function generateCaseSummary(name: string, row: CompanyScoresRow, sources: DisclosureSource[]): string {
  if (row.scores_suppressed) {
    return `${name}: Scores are withheld because the model requires more independent sources; treat any narrative as incomplete pending coverage.`;
  }

  const aiN = sources.filter(s => PUBLIC_AI_TYPES.has(s.type)).length;
  const warnN = sources.filter(s => WARN_DISRUPTION_TYPES.has(s.type)).length;
  const ds = row.ds ?? 0;
  const mi = row.mismatch_index ?? 0;

  let signalStrength = 'a modest disclosure mismatch signal';
  if (mi >= 72) signalStrength = 'a comparatively strong disclosure mismatch signal';
  else if (mi >= 48) signalStrength = 'a moderate disclosure mismatch signal';

  const aiSentence =
    aiN > 0
      ? `${name} has publicly indicated — in sourced materials — that AI or automation relates to workforce or productivity expectations.`
      : `The bundled sources include limited explicit public AI attribution rows for ${name}.`;

  const disruptSentence =
    warnN > 0
      ? 'Workforce disruption signals (WARN filings or layoff announcements) appear on the timeline.'
      : 'This bundle includes few or no WARN/layoff rows; disruption scores may draw on sparse formal signals.';

  const discSentence =
    ds === 0
      ? 'Available formal-disclosure axis scoring suggests no verified AI-specific cause language in matched notices — implying potential under-disclosure relative to public AI rhetoric, subject to skepticism panel limits.'
      : 'Some formal disclosure contribution is present; any gap versus public AI rhetoric should be read narrowly and verified outside this tool.';

  return `${aiSentence} ${disruptSentence} ${discSentence} Together this yields ${signalStrength} (${row.evidence_quality} evidence quality in model terms) for structured review — not a finding of wrongdoing or legal non-compliance.`;
}

export interface CaseReportPayload {
  report_schema_version: string;
  generated_at: string;
  case_type?: string;
  reviewer_flag?: string;
  company: { id: string; name: string; sector: string };
  period: { start: string | null; end: string | null };
  mismatch_index: number | null;
  raw_mismatch_index: number | null;
  bounded_mismatch_index: number | null;
  confidence: number;
  confidence_band: ConfidenceBandLabel;
  evidence_quality: CompanyScoresRow['evidence_quality'];
  risk_level: CompanyScoresRow['risk_level'];
  risk_level_at_threshold?: CompanyScoresRow['risk_level'];
  flagged_at_threshold?: boolean;
  threshold_params?: ThresholdParams;
  false_positive_hints?: { possible: boolean; reasons: string[] };
  false_negative_hints?: { possible: boolean; reasons: string[] };
  source_coverage_score?: number;
  summary: string;
  timeline: TimelineEvent[];
  key_sources: Array<{
    id: string;
    type: string;
    date: string;
    excerpt: string;
    url: string;
  }>;
  explanation: {
    why_flagged: string;
    confidence_rationale: string;
    policy_note: string;
  };
  limitations: string[];
  disclaimers: string[];
  robustness_checks?: {
    threshold_sensitivity_summary: string;
    alternative_explanations: string[];
    evidence_limitations: string[];
    pattern_stability?: RobustnessSummary['pattern_stability'];
    cross_case_consistency?: RobustnessSummary['cross_case_consistency'];
  };
}

function buildRobustnessChecksSection(
  row: CompanyScoresRow,
  sources: DisclosureSource[],
  robustnessSummary: RobustnessSummary | undefined,
  thresholdParams: ThresholdParams | undefined,
): CaseReportPayload['robustness_checks'] {
  const alt: string[] = [...SOURCED_CASE_PACK_SKEPTICISM.slice(0, 3)];
  if (row.possible_false_positive) {
    alt.push(
      'Possible false-positive path: strong public AI rhetoric with a comparatively thin formal disruption axis — verify WARN/legal primaries.',
    );
  }
  if (row.possible_false_negative) {
    alt.push(
      'Possible false-negative path: disruption signals without strong tiered public AI rows — corpus may omit executive statements filed elsewhere.',
    );
  }
  const evLimit = buildLimitations(row, sources);
  const th = thresholdParams
    ? `Active review gates: bounded mismatch ≥ ${thresholdParams.bounded_mismatch_minimum}, confidence ≥ ${thresholdParams.confidence_minimum}.`
    : 'Threshold defaults: bounded mismatch ≥ 50, confidence ≥ 35 (server defaults).';
  const flagged =
    row.flagged_at_threshold === true
      ? 'Flagged at the stated thresholds.'
      : row.flagged_at_threshold === false
        ? 'Not flagged at the stated thresholds.'
        : 'Threshold-gated flag status not included in this payload.';
  const stab = robustnessSummary?.pattern_stability;
  const stabLine = stab
    ? `Pattern stability (sweep): ${stab.label} — mean persistence ${stab.mean_persistence_across_bounded_sweep} across bounded thresholds ${stab.bounded_sweep_steps.join(', ')} with confidence floor ${stab.confidence_floor_used}.`
    : 'Pattern stability sweep not attached — export full signals JSON with threshold query for system-level block.';

  const sens = robustnessSummary?.sensitivity_analysis as
    | { retention_ratio_low_to_high?: number | null; flagged_counts_by_bounded_threshold?: Record<string, number> }
    | undefined;
  const ret = sens?.retention_ratio_low_to_high;
  const sensLine =
    ret === null || ret === undefined
      ? ''
      : ` Retention of flagged count from lowest to highest bounded sweep step: ${ret}.`;

  return {
    threshold_sensitivity_summary: `${th} ${flagged} ${stabLine}${sensLine}`,
    alternative_explanations: alt,
    evidence_limitations: evLimit,
    pattern_stability: robustnessSummary?.pattern_stability,
    cross_case_consistency: robustnessSummary?.cross_case_consistency,
  };
}

export function buildCaseReportPayload(
  id: string,
  name: string,
  sector: string,
  row: CompanyScoresRow,
  sources: DisclosureSource[],
  disclaimers: string[],
  extras?: {
    thresholdParams?: ThresholdParams;
    robustnessSummary?: RobustnessSummary;
  },
): CaseReportPayload {
  const summary = generateCaseSummary(name, row, sources);
  const timeline = buildTimelineFromSources(sources);
  const key_sources = sources.slice(0, 12).map(s => ({
    id: s.id,
    type: s.type,
    date: s.date,
    excerpt: s.text_excerpt,
    url: s.url,
  }));

  const why =
    row.scores_suppressed
      ? 'Insufficient corroborating sources — scores suppressed.'
      : row.flagged_at_threshold === false && extras?.thresholdParams
        ? 'At the active review thresholds, this employer is not flagged — base scores still shown for transparency.'
        : 'Public-channel AI attribution and disruption signals exceed formal AI disclosure scoring in this corpus, producing a mismatch index for diligence.';

  return {
    report_schema_version: '1.1',
    generated_at: new Date().toISOString(),
    ...(row.case_type ? { case_type: row.case_type } : {}),
    ...(row.reviewer_flag ? { reviewer_flag: row.reviewer_flag } : {}),
    company: { id, name, sector },
    period: { start: row.period_start, end: row.period_end },
    mismatch_index: row.mismatch_index,
    raw_mismatch_index: row.raw_mismatch_index,
    bounded_mismatch_index: row.bounded_mismatch_index,
    confidence: row.confidence_score,
    confidence_band: confidenceBandFromEvidence(row.evidence_quality),
    evidence_quality: row.evidence_quality,
    risk_level: row.risk_level,
    risk_level_at_threshold: row.risk_level_at_threshold,
    flagged_at_threshold: row.flagged_at_threshold,
    threshold_params: extras?.thresholdParams,
    false_positive_hints: {
      possible: row.possible_false_positive ?? false,
      reasons: row.false_positive_reasons ?? [],
    },
    false_negative_hints: {
      possible: row.possible_false_negative ?? false,
      reasons: row.false_negative_reasons ?? [],
    },
    source_coverage_score: row.source_coverage_score,
    summary,
    timeline,
    key_sources,
    explanation: {
      why_flagged: why,
      confidence_rationale: explainConfidence(row),
      policy_note:
        'If similar divergence appears across many employers, labor-market statistics, regulatory visibility, worker transition planning, and public understanding of AI’s economic effects may all be affected — absent proof of legal fault in any single case.',
    },
    limitations: buildLimitations(row, sources),
    disclaimers: disclaimers.length ? disclaimers : ['Signal for review, not a verdict.'],
    robustness_checks: buildRobustnessChecksSection(row, sources, extras?.robustnessSummary, extras?.thresholdParams),
  };
}

export function downloadJsonReport(filename: string, payload: CaseReportPayload): void {
  const body = JSON.stringify(payload, null, 2);
  const blob = new Blob([body], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Printable HTML including robustness checks — use browser Print → Save as PDF. */
export function openCaseReportHtmlWindow(payload: CaseReportPayload): void {
  const rc = payload.robustness_checks;
  const rcBlock =
    rc &&
    `<section class="block"><h2>Robustness checks</h2>
    <p>${escapeHtml(rc.threshold_sensitivity_summary)}</p>
    ${
      rc.pattern_stability
        ? `<p><strong>Pattern stability (${escapeHtml(rc.pattern_stability.label)}).</strong></p>`
        : ''
    }
    ${
      rc.cross_case_consistency && typeof rc.cross_case_consistency === 'object'
        ? `<p><strong>Cross-case consistency.</strong> ${escapeHtml(
            JSON.stringify(rc.cross_case_consistency).slice(0, 400),
          )}</p>`
        : ''
    }
    <h3>Alternative explanations</h3><ul>${rc.alternative_explanations
      .map(e => `<li>${escapeHtml(e)}</li>`)
      .join('')}</ul>
    <h3>Evidence limitations</h3><ul>${rc.evidence_limitations.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>
    </section>`;

  const fp = payload.false_positive_hints;
  const fn = payload.false_negative_hints;
  const hintsBlock = `<section class="block"><h2>Heuristic skepticism flags</h2>
    <p><strong>Possible false positive.</strong> ${fp?.possible ? 'Flagged' : 'Not flagged'} —
    ${escapeHtml((fp?.reasons || []).join('; ') || 'n/a')}</p>
    <p><strong>Possible false negative.</strong> ${fn?.possible ? 'Flagged' : 'Not flagged'} —
    ${escapeHtml((fn?.reasons || []).join('; ') || 'n/a')}</p></section>`;

  const body = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${escapeHtml(
    payload.company.name,
  )} — disclosure case sheet</title>
  <style>
    body{font-family:system-ui,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#111;background:#fafafa;line-height:1.45;}
    h1{font-size:1.35rem;margin-bottom:0.25rem;}
    h2{font-size:1.05rem;margin-top:1.25rem;border-bottom:1px solid #ccc;padding-bottom:4px;}
    h3{font-size:0.95rem;margin-top:1rem;}
    .meta{color:#555;font-size:0.85rem;}
    .block{margin-top:1rem;}
    ul{padding-left:1.1rem;}
    button{margin-top:16px;padding:10px 16px;font-weight:600;cursor:pointer;}
    @media print{button{display:none;}}
  </style></head><body>
  <h1>${escapeHtml(payload.company.name)}</h1>
  <p class="meta">${escapeHtml(payload.company.sector)} · ${escapeHtml(payload.generated_at)} · schema ${escapeHtml(
    payload.report_schema_version,
  )}</p>
  <section class="block"><h2>Summary</h2><p>${escapeHtml(payload.summary)}</p></section>
  <section class="block"><h2>Scores</h2>
  <p>Raw mismatch: ${payload.mismatch_index ?? '—'} · Bounded: ${payload.bounded_mismatch_index ?? '—'} ·
  Confidence: ${payload.confidence}/100 · Coverage: ${payload.source_coverage_score ?? '—'} ·
  Risk (model): ${escapeHtml(payload.risk_level)} · Risk at threshold: ${escapeHtml(
    payload.risk_level_at_threshold ?? payload.risk_level,
  )}</p></section>
  ${hintsBlock}
  ${rcBlock || ''}
  <section class="block"><h2>Timeline</h2><ol>${payload.timeline
    .map(
      ev =>
        `<li><time>${escapeHtml(ev.date)}</time> — ${escapeHtml(ev.phase_label)}: ${escapeHtml(
          ev.excerpt.slice(0, 280),
        )}${ev.excerpt.length > 280 ? '…' : ''}</li>`,
    )
    .join('')}</ol></section>
  <section class="block"><h2>Disclaimer</h2><ul>${payload.disclaimers
    .map(d => `<li>${escapeHtml(d)}</li>`)
    .join('')}</ul></section>
  <button type="button" onclick="window.print()">Print / Save as PDF</button>
  </body></html>`;

  const w = window.open('', '_blank', 'noopener,noreferrer');
  if (!w) return;
  w.document.write(body);
  w.document.close();
}
