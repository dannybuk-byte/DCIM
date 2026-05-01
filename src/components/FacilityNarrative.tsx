import React from 'react';

interface FacilityNarrativeProps {
  text: string;
}

export const FacilityNarrative: React.FC<FacilityNarrativeProps> = ({ text }) => (
  <div className="rounded border border-gray-700 bg-gray-900/30 px-2 py-1.5">
    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wide mb-1">Brief</div>
    <p className="text-[10px] text-gray-300 leading-snug">{text}</p>
  </div>
);
