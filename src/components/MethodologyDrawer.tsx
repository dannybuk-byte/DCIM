import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import {
  SIGNALS_DCIM_FRAMING_LINE,
  SIGNALS_METHODOLOGY_RELATION_BODY,
  SIGNALS_METHODOLOGY_RELATION_TITLE,
} from '../lib/signalsAlignment';

export const MethodologyDrawer: React.FC = () => {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen(o => !o), []);

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-900/40 mt-2 overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full min-h-[44px] flex items-center gap-2 px-4 py-3 text-left hover:bg-gray-800/60 transition-colors"
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown className="w-5 h-5 text-gray-400 shrink-0" />
        ) : (
          <ChevronRight className="w-5 h-5 text-gray-400 shrink-0" />
        )}
        <span className="text-sm font-bold text-gray-200 uppercase tracking-wide">
          Methodology &amp; Limitations
        </span>
      </button>

      {open ? (
        <div className="px-4 pb-4 pt-2 border-t border-gray-800 space-y-4 text-sm text-gray-300 leading-relaxed">
          <section>
            <div className="font-bold text-gray-100 mb-2 text-base">What the dashboard evaluates</div>
            <p>
              This dashboard evaluates whether publicly subsidized data center or infrastructure projects appear to be
              meeting stated public-benefit commitments, based on structured project data and cited evidence.
            </p>
          </section>

          <section>
            <div className="font-bold text-gray-100 mb-2 text-base">What the dashboard does not do</div>
            <ul className="list-disc list-inside space-y-1.5 text-gray-400">
              <li>Does not make legal determinations</li>
              <li>Does not prove noncompliance</li>
              <li>Does not infer wrongdoing from missing data</li>
              <li>Does not replace agency audits</li>
              <li>Does not currently use live ingestion or backend verification</li>
            </ul>
          </section>

          <section>
            <div className="font-bold text-gray-100 mb-2 text-base">Scoring model (plain language)</div>
            <p className="text-gray-400 mb-1">
              <span className="text-gray-200">Compliance score:</span> job fulfillment 40%, capital investment fulfillment
              20%, timeline adherence 20%, disclosure integrity 20%.
            </p>
            <p className="text-gray-400 mb-1">
              <span className="text-gray-200">Confidence score:</span> reflects completeness of structured fields,
              adjusted by source confidence and reduced when key evidence is missing.
            </p>
            <p className="text-gray-400 mb-1">
              <span className="text-gray-200">Contradiction score:</span> compares public claims against observed outcomes;
              larger gaps increase severity; pairing confidence depends on cited source quality.
            </p>
            <p className="text-gray-400">
              <span className="text-gray-200">Action flags:</span> Flag for Review, Monitor, Appears Compliant, Insufficient
              Data — derived from thresholds on those scores, not from accusations.
            </p>
          </section>

          <section>
            <div className="font-bold text-gray-100 mb-2 text-base">{SIGNALS_METHODOLOGY_RELATION_TITLE}</div>
            <p className="text-gray-400 mb-1">{SIGNALS_METHODOLOGY_RELATION_BODY}</p>
            <p className="text-xs text-gray-500 italic border-l-2 border-gray-700 pl-3">{SIGNALS_DCIM_FRAMING_LINE}</p>
          </section>

          <section>
            <div className="font-bold text-gray-100 mb-2 text-base">Evidence categories</div>
            <ul className="space-y-2">
              <li>
                <span className="text-emerald-400/90">Observed:</span> directly supported by a structured record entry or cited source.
              </li>
              <li>
                <span className="text-sky-400/90">Reported:</span> stated by a company, agency, or document summarized in the row.
              </li>
              <li>
                <span className="text-amber-400/90">Inferred:</span> derived from comparisons or the scoring model — always labeled as such.
              </li>
              <li>
                <span className="text-gray-500">Missing:</span> needed for a confident assessment but not currently available.
              </li>
            </ul>
          </section>

          <section className="rounded-lg border border-amber-800/40 bg-amber-950/25 px-3 py-3 text-sm text-amber-100/95 leading-relaxed">
            Demo-mode caveat: this prototype may use demo or manually entered data. Scores demonstrate a methodology and
            should not be treated as final compliance findings.
          </section>
        </div>
      ) : null}
    </div>
  );
};
