import React from 'react';
import {
  SIGNALS_DCIM_FRAMING_LINE,
  SIGNALS_DO_NOT_OVERCLAIM_ITEMS,
  SIGNALS_DO_NOT_OVERCLAIM_TITLE,
  SIGNALS_FUNDING_SECTION_BODY,
  SIGNALS_FUNDING_SECTION_TITLE,
  SIGNALS_PANEL_BULLETS,
  SIGNALS_PANEL_INTRO,
  SIGNALS_PANEL_TITLE,
  SIGNALS_REVIEWER_DISCLAIMER,
} from '../lib/signalsAlignment';

/**
 * Compact panel: DCIM as complementary physical-infrastructure accountability layer vs OpenAI Signals.
 */
export const SignalsAlignmentPanel: React.FC = () => {
  const fundingLines = SIGNALS_FUNDING_SECTION_BODY.split('\n');

  return (
    <div
      className="rounded border border-slate-700/80 bg-slate-950/60 px-2 py-2 space-y-2 text-[10px] text-gray-300 leading-snug"
      role="region"
      aria-label={SIGNALS_PANEL_TITLE}
    >
      <div className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">{SIGNALS_PANEL_TITLE}</div>

      <p className="text-[10px] text-slate-400 italic border-l-2 border-slate-600 pl-2">{SIGNALS_DCIM_FRAMING_LINE}</p>

      <p>{SIGNALS_PANEL_INTRO}</p>

      <ul className="list-disc list-inside space-y-0.5 text-gray-300">
        {SIGNALS_PANEL_BULLETS.map(line => (
          <li key={line}>{line}</li>
        ))}
      </ul>

      <p className="text-[10px] text-slate-400 border border-slate-800 rounded px-2 py-1.5 bg-slate-900/50">
        {SIGNALS_REVIEWER_DISCLAIMER}
      </p>

      <div>
        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-0.5">
          {SIGNALS_FUNDING_SECTION_TITLE}
        </div>
        {fundingLines.map(line => (
          <p key={line}>{line}</p>
        ))}
      </div>

      <div>
        <div className="text-[9px] font-bold text-amber-900/90 uppercase tracking-wide mb-0.5">
          {SIGNALS_DO_NOT_OVERCLAIM_TITLE}
        </div>
        <ul className="list-disc list-inside space-y-0.5 text-gray-400 text-[9px]">
          {SIGNALS_DO_NOT_OVERCLAIM_ITEMS.map(item => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};
