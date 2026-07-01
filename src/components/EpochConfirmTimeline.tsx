/**
 * S1 Stages C + D — timeline spine + honesty layer for the early-warning surface.
 *
 * Renders, per candidate:
 *   - the two-source gate outcome (corroborated vs. withheld, first-class either way);
 *   - the LIVE/DESIGN provenance badge (real / synthetic / mixed);
 *   - the Epoch AI lead-time ladder (per-site public-visibility vs. corpus detection),
 *     shown honestly — sites already public before detection are labeled, not hidden;
 *   - the CC-BY attribution wherever Epoch data is displayed.
 *
 * Purely presentational: it reads the fields the DME now returns
 * (`scores_suppressed`, `lead_time`, `provenance`) and adds no scoring logic. The floor
 * decision remains entirely server-side.
 */
import { CheckCircle2, EyeOff, Radar } from 'lucide-react';
import type { CompanyScoresRow, LeadTime } from '../api/disclosureMismatchClient';

const EPOCH_ATTRIBUTION =
  "Epoch AI, 'AI Data Centers' (CC-BY). epoch.ai/data/ai-data-centers";

/** One-line honest summary of the ladder — never a single cherry-picked number. */
export function leadTimeHeadline(lead: LeadTime | null | undefined): string {
  if (!lead || lead.epoch_site_count === 0) return 'No Epoch-confirmed site timeline.';
  const { sites_flagged_before_public: ahead, epoch_site_count: total, lead_days_range } = lead;
  const [lo, hi] = lead_days_range;
  return `${ahead}/${total} Epoch sites flagged before public visibility · lead ${lo}–${hi} days`;
}

function provenanceBadge(row: CompanyScoresRow) {
  const p = row.provenance?.provenance ?? 'real';
  const map = {
    real: { label: 'LIVE · real', cls: 'bg-emerald-900/40 text-emerald-300 border-emerald-700' },
    synthetic: { label: 'DESIGN · synthetic', cls: 'bg-amber-900/30 text-amber-300 border-amber-700' },
    mixed: { label: 'MIXED · real+synthetic', cls: 'bg-sky-900/30 text-sky-300 border-sky-700' },
  } as const;
  const { label, cls } = map[p];
  return (
    <span className={`px-2 py-0.5 rounded text-xs border ${cls}`} title="LIVE/DESIGN honesty layer">
      {label}
    </span>
  );
}

export function EpochConfirmTimeline({ row }: { row: CompanyScoresRow }) {
  const withheld = row.scores_suppressed;
  const lead = row.lead_time;

  return (
    <div className="rounded-lg border border-gray-700 bg-gray-900/60 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {withheld ? (
            <EyeOff className="w-4 h-4 text-gray-400" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span className="font-medium text-gray-100">{row.name}</span>
          <span className="text-xs text-gray-500">· {row.source_count} source{row.source_count === 1 ? '' : 's'}</span>
        </div>
        {provenanceBadge(row)}
      </div>

      {withheld ? (
        // Withheld candidates are first-class and visible (mirrors the console mechanic).
        <div className="flex items-start gap-2 rounded bg-gray-800/70 border border-gray-700 p-2">
          <EyeOff className="w-4 h-4 text-gray-400 mt-0.5" />
          <div className="text-sm text-gray-300">
            <span className="font-medium text-gray-200">Insufficient sources — signal withheld.</span>{' '}
            Below the two-source floor; the single signal is shown but no score is asserted.
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded bg-emerald-950/30 border border-emerald-800 p-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
          <div className="text-sm text-emerald-200">
            Corroborated by ≥2 independent sources — score eligible.
          </div>
        </div>
      )}

      {/* Lead-time ladder from the real Epoch public-visibility timeline. */}
      {lead && lead.epoch_site_count > 0 ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Radar className="w-3.5 h-3.5" />
            <span>{leadTimeHeadline(lead)}</span>
          </div>
          <ol className="space-y-1">
            {lead.ladder.slice(0, 6).map(rung => {
              const early = rung.lead_time_days > 0;
              return (
                <li
                  key={rung.site_name}
                  className="flex items-center justify-between text-xs px-2 py-1 rounded bg-gray-800/60"
                >
                  <span className="text-gray-300 truncate mr-2">{rung.site_name}</span>
                  <span className="text-gray-500 mr-2">{rung.public_visibility_date}</span>
                  <span className={early ? 'text-emerald-300' : 'text-gray-500'}>
                    {early ? `+${rung.lead_time_days}d lead` : `${rung.lead_time_days}d (already public)`}
                  </span>
                </li>
              );
            })}
          </ol>
          <div className="text-[10px] text-gray-500">detection: {lead.detection_date} · {EPOCH_ATTRIBUTION}</div>
        </div>
      ) : row.provenance?.has_epoch_confirm ? (
        <div className="text-xs text-gray-500">Epoch-confirmed, no public-visibility date — lead time unavailable.</div>
      ) : null}
    </div>
  );
}

export default EpochConfirmTimeline;
