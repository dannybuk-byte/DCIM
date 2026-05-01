import React from 'react';

/**
 * Visible transparency near credibility outputs (Phase 1).
 */
export const CredibilityDemoBanner: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  return (
    <div
      className="rounded-lg border border-amber-600/50 bg-amber-950/50 px-3 py-2.5 text-xs text-amber-100 leading-relaxed"
      role="note"
    >
      This prototype currently uses demo or manually entered data. Scores are methodological demonstrations,
      not final compliance determinations.
    </div>
  );
};
