/**
 * Help Tooltip Component
 * Provides plain-language explanations for technical terms
 */

import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';

interface HelpTooltipProps {
  term: string;
  definition: string;
  example?: string;
  learnMoreUrl?: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  size?: 'sm' | 'md' | 'lg';
}

export function HelpTooltip({
  term,
  definition,
  example,
  learnMoreUrl,
  placement = 'top',
  size = 'sm',
}: HelpTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  const iconSizes = {
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className="text-cyan-500 hover:text-cyan-400 transition-colors cursor-help"
        aria-label={`Help: ${term}`}
      >
        <HelpCircle className={iconSizes[size]} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 w-72 bg-gray-800 border-2 border-cyan-600 rounded-lg shadow-2xl shadow-cyan-500/20 p-4 ${
            placement === 'top' ? 'bottom-full mb-2' : ''
          } ${placement === 'bottom' ? 'top-full mt-2' : ''} ${
            placement === 'left' ? 'right-full mr-2' : ''
          } ${placement === 'right' ? 'left-full ml-2' : ''}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-cyan-600 rounded flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-white" />
              </div>
              <h4 className="font-bold text-white text-sm">{term}</h4>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Definition */}
          <p className="text-xs text-gray-300 leading-relaxed mb-3">{definition}</p>

          {/* Example */}
          {example && (
            <div className="bg-gray-900 border border-gray-700 rounded p-2 mb-3">
              <div className="text-xs font-semibold text-cyan-400 mb-1">Example:</div>
              <p className="text-xs text-gray-400 leading-relaxed italic">{example}</p>
            </div>
          )}

          {/* Learn More */}
          {learnMoreUrl && (
            <a
              href={learnMoreUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 underline font-medium"
            >
              Learn more →
            </a>
          )}

          {/* Arrow indicator */}
          <div
            className={`absolute w-3 h-3 bg-gray-800 border-cyan-600 transform rotate-45 ${
              placement === 'top'
                ? 'bottom-0 translate-y-1/2 border-b-2 border-r-2'
                : ''
            } ${
              placement === 'bottom'
                ? 'top-0 -translate-y-1/2 border-t-2 border-l-2'
                : ''
            } ${
              placement === 'left' ? 'right-0 translate-x-1/2 border-r-2 border-t-2' : ''
            } ${
              placement === 'right'
                ? 'left-0 -translate-x-1/2 border-l-2 border-b-2'
                : ''
            }`}
          />
        </div>
      )}
    </div>
  );
}

// Glossary of common terms
export const GLOSSARY: Record<string, { definition: string; example?: string }> = {
  'Subsidy Gap': {
    definition: 'The difference between the government subsidies a company received and the jobs or economic activity they promised to create.',
    example: 'If a company received $10M in tax breaks but only created 50% of promised jobs, the subsidy gap is the value of those missing jobs.',
  },
  'Non-Compliant': {
    definition: 'A facility or company that is not meeting the requirements of their subsidy agreement or regulatory obligations.',
    example: 'Switch Michigan received subsidies for 1,000 jobs but only created 26, making them non-compliant with the agreement.',
  },
  'At Risk': {
    definition: 'A facility showing warning signs of potential future non-compliance, such as declining employment or missed reporting deadlines.',
    example: 'A facility that was compliant last year but has laid off 30% of workers this year is "at risk".',
  },
  'Compliance Rate': {
    definition: 'The percentage of facilities that are meeting all their subsidy and regulatory requirements.',
    example: 'If 5,292 out of 11,992 facilities are compliant, the compliance rate is 44.1%.',
  },
  'ARIMA Forecast': {
    definition: 'A statistical method for predicting future trends based on historical patterns. ARIMA stands for AutoRegressive Integrated Moving Average.',
    example: 'If the subsidy gap has been growing 5% per year, ARIMA can predict next year\'s gap.',
  },
  'Anomaly Detection': {
    definition: 'Automatically finding unusual patterns or outliers in data that don\'t match normal behavior.',
    example: 'A facility reporting 500 employees suddenly drops to 50 — the algorithm flags this as an anomaly.',
  },
  'Z-Score': {
    definition: 'A statistical measure showing how far a data point is from the average. A Z-score above 3 or below -3 is considered unusual.',
    example: 'If most facilities have 100-200 employees, a facility with 1,000 employees has a high Z-score.',
  },
  'Intent-Based Compliance': {
    definition: 'An approach where you define what outcome you want (the intent) and the system validates if reality matches that intent.',
    example: 'Intent: "All facilities must employ 200+ workers." The system checks actual employment and flags violations.',
  },
  'Correlation': {
    definition: 'When two things tend to change together. Correlation doesn\'t mean one causes the other, just that they\'re related.',
    example: 'Facilities with higher subsidy gaps tend to have more worker safety violations (they\'re correlated).',
  },
  'Root Cause Analysis': {
    definition: 'Tracing a problem back to its fundamental cause, not just treating symptoms.',
    example: 'Instead of just noting many facilities are non-compliant, find out if it\'s due to inadequate oversight, economic conditions, or other factors.',
  },
};



