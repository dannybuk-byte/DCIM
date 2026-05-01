import React from 'react';
import { X } from 'lucide-react';
import type { Facility } from '../types';
import { ReviewerFacilityBrief } from './ReviewerFacilityBrief';
import { SignalsAlignmentPanel } from './SignalsAlignmentPanel';

export interface ReviewerModeProps {
  open: boolean;
  onClose: () => void;
  facility: Facility | null;
  facilities: Facility[];
  onSelectFacility: (f: Facility) => void;
  /** In-document embed (dashboard debug) vs fullscreen modal */
  layout?: 'overlay' | 'inline';
}

export const ReviewerMode: React.FC<ReviewerModeProps> = ({
  open,
  onClose,
  facility,
  facilities,
  onSelectFacility,
  layout = 'overlay',
}) => {
  if (!open) return null;

  const picker =
    layout === 'inline' ? facilities : facilities.slice(0, 48);

  const listScrollClass = layout === 'inline' ? 'max-h-72' : 'max-h-56';
  const pickerIntro =
    layout === 'inline'
      ? `Select a facility for the reviewer brief (${picker.length} in current list). Use Natural Language Search above to narrow the list.`
      : `Select a facility to load the reviewer brief. Showing up to ${picker.length} rows from the current filter.`;

  const facilitySection = !facility ? (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-400 leading-snug">{pickerIntro}</p>
      <div
        className={`${listScrollClass} overflow-y-auto rounded border border-gray-800 divide-y divide-gray-800`}
      >
        {picker.map(f => (
          <button
            key={f.id}
            type="button"
            onClick={() => onSelectFacility(f)}
            className="w-full text-left px-2 py-1.5 hover:bg-gray-900 text-[11px]"
          >
            <div className="text-white font-medium truncate">{f.name}</div>
            <div className="text-[10px] text-gray-500 truncate">
              {f.city}, {f.state} · {f.operator}
            </div>
          </button>
        ))}
      </div>
      {facilities.length === 0 ? (
        <p className="text-[11px] text-gray-500">No facilities available.</p>
      ) : null}
    </div>
  ) : (
    <ReviewerFacilityBrief facility={facility} />
  );

  const methodologyOptional = (
    <details className="rounded border border-slate-700/80 bg-slate-950/40">
      <summary className="cursor-pointer px-2 py-2 text-[11px] font-bold uppercase tracking-wide text-slate-400 hover:text-slate-200">
        Methodology & OpenAI Signals alignment (optional)
      </summary>
      <div className="border-t border-slate-800 px-2 pb-2 pt-1">
        <SignalsAlignmentPanel />
      </div>
    </details>
  );

  const cardOuterClass =
    layout === 'inline'
      ? 'w-full max-w-none rounded-lg border border-gray-700 bg-gray-950 shadow-2xl shadow-black/60'
      : 'w-full max-w-xl rounded-lg border border-gray-700 bg-gray-950 shadow-2xl shadow-black/60';

  const card = (
    <div className={cardOuterClass}>
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 px-3 py-2">
        <div>
          <div className="text-xs font-bold text-white uppercase tracking-wide">Reviewer Mode</div>
          <div className="text-[10px] text-gray-500">One-screen facility brief · audit-oriented</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded border border-gray-700 text-gray-400 hover:text-white hover:bg-gray-800"
          aria-label="Close reviewer mode"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="max-h-[min(88vh,920px)] overflow-y-auto p-3 space-y-3">
        {layout === 'inline' ? (
          <>
            {facilitySection}
            {methodologyOptional}
          </>
        ) : (
          <>
            <SignalsAlignmentPanel />
            {facilitySection}
          </>
        )}
      </div>
    </div>
  );

  if (layout === 'inline') {
    return (
      <div className="w-full" role="region" aria-label="Reviewer Mode">
        {card}
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/75 px-3 py-6"
      role="dialog"
      aria-modal="true"
      aria-label="Reviewer Mode"
    >
      {card}
    </div>
  );
};
