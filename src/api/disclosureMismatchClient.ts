/**
 * Client for WWW Disclosure Mismatch Engine (Express POC).
 * Dev: Vite proxies /signals-api → http://127.0.0.1:8787
 */

export interface DisclosureSource {
  id: string;
  company_id: string;
  type: string;
  date: string;
  text_excerpt: string;
  url: string;
  /** Optional display label from sourced packs */
  source_name?: string;
  classification_label?: string;
  ai_attribution_tier?: 'strong' | 'moderate' | 'weak' | 'irrelevant' | null;
  workers_affected?: number;
  ai_disclosed_in_warn?: boolean;
  ai_disclosed_in_legal?: boolean;
}

export interface ScoreComponent {
  source_id: string;
  type: string;
  classification: string;
  weight: number;
  contribution: number;
  workers_affected?: number;
}

export interface AxisBreakdown {
  total: number | null;
  components: ScoreComponent[];
}

export interface ScoreBreakdown {
  aas: AxisBreakdown;
  lss: AxisBreakdown;
  ds: AxisBreakdown;
}

export interface ConfidenceBreakdown {
  source_density: number;
  recency_avg: number;
  classification_certainty: number;
  channel_diversity: number;
  source_coverage_score?: number;
  independent_evidence_rows?: number;
  primary_channel_family_count?: number;
  secondary_channel_family_count?: number;
}

export interface CompanyScoresRow {
  id: string;
  name: string;
  sector: string;
  /** Present when corpus row is a curated sourced investigative pack */
  case_type?: string;
  reviewer_flag?: string;
  period_start: string | null;
  period_end: string | null;
  source_count: number;
  source_types_present: string[];
  missing_expected_sources: string[];
  aas: number | null;
  lss: number | null;
  ds: number | null;
  raw_mismatch_index: number | null;
  mismatch_index: number | null;
  bounded_mismatch_index: number | null;
  source_coverage_score?: number;
  confidence_score: number;
  confidence_breakdown: ConfidenceBreakdown;
  evidence_quality: 'low' | 'moderate' | 'high';
  risk_level: 'minimal' | 'low' | 'medium' | 'high';
  /** Risk tier when current review thresholds gate flagging (defensibility view). */
  risk_level_at_threshold?: 'minimal' | 'low' | 'medium' | 'high';
  /** True when bounded mismatch and confidence meet active threshold sliders. */
  flagged_at_threshold?: boolean;
  possible_false_positive?: boolean;
  possible_false_negative?: boolean;
  false_positive_reasons?: string[];
  false_negative_reasons?: string[];
  score_breakdown: ScoreBreakdown;
  warnings: string[];
  scores_suppressed: boolean;
  low_confidence_flag: boolean;
  /** Echoed when API scoped with ?from=&to= */
  period_query?: { from: string | null; to: string | null } | null;
}

export interface ThresholdParams {
  bounded_mismatch_minimum: number;
  confidence_minimum: number;
}

export interface PatternStabilitySummary {
  label: 'stable' | 'moderate' | 'fragile';
  mean_persistence_across_bounded_sweep: number;
  bounded_sweep_steps: number[];
  confidence_floor_used: number;
}

export interface RobustnessSummary {
  flagged_count_at_threshold: number;
  pattern_stability: PatternStabilitySummary;
  sensitivity_analysis: Record<string, unknown>;
  cross_case_consistency: Record<string, unknown>;
}

/** DME corpus origin — surfaced on API + export for non-developer provenance. */
export interface CorpusProvenance {
  corpus_mode: 'seeded' | 'pipeline' | 'mixed';
  artifact_path: string | null;
  artifact_mtime_iso: string | null;
  active_company_count: number;
  seed_baseline_company_count: number;
  fallback_reason?: string;
  pipeline_company_ids?: string[];
  pipeline_company_count?: number;
  seed_appended_ids?: string[];
  seed_skipped_duplicate_ids?: string[];
}

export interface CompaniesListResponse {
  disclaimers: string[];
  corpus_provenance: CorpusProvenance;
  period_query: { from: string | null; to: string | null } | null;
  threshold_params?: ThresholdParams;
  robustness_summary?: RobustnessSummary;
  companies: CompanyScoresRow[];
}

export interface CompanyDetailResponse {
  disclaimers: string[];
  corpus_provenance: CorpusProvenance;
  period_query: { from: string | null; to: string | null } | null;
  threshold_params?: ThresholdParams;
  company: {
    id: string;
    name: string;
    sector: string;
    case_type?: string;
    reviewer_flag?: string;
    scores: Omit<CompanyScoresRow, 'id' | 'name' | 'sector' | 'case_type' | 'reviewer_flag'>;
    flagged_at_threshold?: boolean;
    risk_level_at_threshold?: CompanyScoresRow['risk_level'];
    sources: DisclosureSource[];
  };
}

export interface FetchCompaniesOptions {
  mismatchThreshold?: number;
  confidenceThreshold?: number;
}

function thresholdQuery(opts?: FetchCompaniesOptions): string {
  const p = new URLSearchParams();
  if (opts?.mismatchThreshold !== undefined) {
    p.set('mismatch_threshold', String(opts.mismatchThreshold));
  }
  if (opts?.confidenceThreshold !== undefined) {
    p.set('confidence_threshold', String(opts.confidenceThreshold));
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}

export function getSignalsApiBase(): string {
  const raw = import.meta.env.VITE_SIGNALS_API_URL as string | undefined;
  if (raw && raw.length > 0) return raw.replace(/\/$/, '');
  return '/signals-api';
}

export async function fetchCompaniesList(
  signal?: AbortSignal,
  opts?: FetchCompaniesOptions,
): Promise<CompaniesListResponse> {
  const qs = thresholdQuery(opts);
  const res = await fetch(`${getSignalsApiBase()}/companies${qs}`, { signal });
  if (!res.ok) throw new Error(`signals /companies failed: ${res.status}`);
  return res.json() as Promise<CompaniesListResponse>;
}

export async function fetchCompanyDetail(
  id: string,
  signal?: AbortSignal,
  opts?: FetchCompaniesOptions,
): Promise<CompanyDetailResponse> {
  const qs = thresholdQuery(opts);
  const res = await fetch(`${getSignalsApiBase()}/companies/${encodeURIComponent(id)}${qs}`, { signal });
  if (!res.ok) throw new Error(`signals /companies/${id} failed: ${res.status}`);
  return res.json() as Promise<CompanyDetailResponse>;
}

export function exportSignalsJsonUrl(opts?: FetchCompaniesOptions): string {
  const qs = thresholdQuery(opts);
  return `${getSignalsApiBase()}/signals/export${qs}`;
}
