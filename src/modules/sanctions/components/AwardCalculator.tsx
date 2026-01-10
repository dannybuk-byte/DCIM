/**
 * Whistleblower Award Calculator Component
 * Calculates potential awards under AMLA, SEC, and IRS programs
 * 
 * Features:
 * - Award estimation based on violation value
 * - Program eligibility breakdown
 * - Attorney referral network
 * - Anti-retaliation protections info
 */

import React, { useState, useMemo } from 'react';
import {
  Calculator,
  DollarSign,
  Shield,
  Users,
  Scale,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info,
  AlertTriangle,
} from 'lucide-react';
import { AwardCalculation, AttorneyFirm } from '../types/sanctions';
import {
  calculatePotentialAward,
  formatAwardAmount,
  getAttorneyNetwork,
  getAntiRetaliationProtections,
} from '../services/awardCalculator';

export const AwardCalculator: React.FC = () => {
  const [violationValue, setViolationValue] = useState<string>('');
  const [showAttorneys, setShowAttorneys] = useState(false);
  const [showProtections, setShowProtections] = useState(false);

  const calculation = useMemo<AwardCalculation | null>(() => {
    const value = parseFloat(violationValue.replace(/[^0-9.]/g, ''));
    if (isNaN(value) || value <= 0) return null;
    return calculatePotentialAward(value);
  }, [violationValue]);

  const attorneys = getAttorneyNetwork();
  const protections = getAntiRetaliationProtections();

  const formatInput = (value: string): string => {
    const num = value.replace(/[^0-9]/g, '');
    if (!num) return '';
    return parseInt(num, 10).toLocaleString();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatInput(e.target.value);
    setViolationValue(formatted);
  };

  const presetValues = [
    { label: '$1M', value: 1_000_000 },
    { label: '$5M', value: 5_000_000 },
    { label: '$10M', value: 10_000_000 },
    { label: '$50M', value: 50_000_000 },
    { label: '$100M', value: 100_000_000 },
  ];

  return (
    <div className="space-y-6">
      {/* Calculator Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-green-600/20 rounded">
            <Calculator className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Whistleblower Award Calculator</h3>
            <p className="text-sm text-slate-400">Estimate potential awards under federal programs</p>
          </div>
        </div>

        {/* Input Section */}
        <div className="mb-6">
          <label className="block text-sm text-slate-400 mb-2">
            Estimated Violation Value
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={violationValue}
              onChange={handleInputChange}
              placeholder="Enter estimated value..."
              className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-lg font-bold placeholder-slate-500 focus:outline-none focus:border-green-500"
            />
          </div>

          {/* Preset Values */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="text-xs text-slate-500">Quick presets:</span>
            {presetValues.map(({ label, value }) => (
              <button
                key={label}
                onClick={() => setViolationValue(value.toLocaleString())}
                className="px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Results */}
        {calculation && (
          <div className="space-y-4">
            {/* Summary */}
            <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg">
              <div className="text-sm text-green-400 mb-1">Potential Award Range</div>
              <div className="text-3xl font-bold text-green-300">
                {formatAwardAmount(calculation.totalMinAward)} - {formatAwardAmount(calculation.totalMaxAward)}
              </div>
              <div className="text-xs text-green-400/70 mt-1">
                Based on estimated violation of {formatAwardAmount(calculation.violations)}
              </div>
            </div>

            {/* Program Breakdown */}
            {calculation.programs.length > 0 ? (
              <div>
                <h4 className="text-sm font-semibold text-slate-300 mb-3">Applicable Programs</h4>
                <div className="space-y-3">
                  {calculation.programs.map((program, idx) => (
                    <div key={idx} className="p-3 bg-slate-800 border border-slate-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-white">{program.program}</div>
                        <div className="text-sm text-green-400">
                          {formatAwardAmount(program.minAward)} - {formatAwardAmount(program.maxAward)}
                        </div>
                      </div>
                      
                      <div className="text-xs text-slate-400 mb-2">Requirements:</div>
                      <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside mb-2">
                        {program.requirements.map((req, i) => (
                          <li key={i}>{req}</li>
                        ))}
                      </ul>

                      {program.protections && program.protections.length > 0 && (
                        <>
                          <div className="text-xs text-slate-400 mb-1">Protections:</div>
                          <ul className="text-xs text-green-400 space-y-1 list-disc list-inside">
                            {program.protections.map((prot, i) => (
                              <li key={i}>{prot}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {program.note && (
                        <div className="mt-2 text-xs text-amber-400 flex items-start gap-1">
                          <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                          {program.note}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-800 border border-slate-700 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-slate-300">
                    Estimated violation value is below program thresholds. 
                    Most federal whistleblower programs require violations exceeding $1M.
                  </div>
                </div>
              </div>
            )}

            {/* Stacking Note */}
            {calculation.programs.length > 1 && (
              <div className="p-3 bg-amber-900/30 border border-amber-700 rounded flex items-start gap-2">
                <Info className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-300">
                  <strong>Note:</strong> Multiple program awards may stack if the violation involves different 
                  regulatory regimes (e.g., sanctions violations with tax fraud component). Consult with a 
                  whistleblower attorney to maximize potential recovery.
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Attorney Network */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowAttorneys(!showAttorneys)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Scale className="w-5 h-5 text-violet-400" />
            <div className="text-left">
              <div className="font-semibold">Attorney Referral Network</div>
              <div className="text-xs text-slate-400">Specialized whistleblower law firms</div>
            </div>
          </div>
          {showAttorneys ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showAttorneys && (
          <div className="px-4 pb-4 space-y-3">
            {attorneys.map((attorney, idx) => (
              <div key={idx} className="p-3 bg-slate-800 border border-slate-700 rounded">
                <div className="flex items-center justify-between mb-1">
                  <div className="font-semibold text-white">{attorney.firm}</div>
                  <a
                    href={attorney.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-violet-400 hover:text-violet-300 flex items-center gap-1 text-xs"
                  >
                    Visit <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
                <div className="text-xs text-violet-400 mb-1">{attorney.specialty}</div>
                {attorney.contact && (
                  <div className="text-xs text-slate-400">Contact: {attorney.contact}</div>
                )}
                {attorney.notes && (
                  <div className="text-xs text-slate-500 mt-1">{attorney.notes}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Anti-Retaliation Protections */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        <button
          onClick={() => setShowProtections(!showProtections)}
          className="w-full p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-green-400" />
            <div className="text-left">
              <div className="font-semibold">Anti-Retaliation Protections</div>
              <div className="text-xs text-slate-400">Legal protections for whistleblowers</div>
            </div>
          </div>
          {showProtections ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showProtections && (
          <div className="px-4 pb-4">
            <ul className="space-y-2">
              {protections.map((protection, idx) => (
                <li key={idx} className="flex items-start gap-2 text-sm">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-slate-300">{protection}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Disclaimer */}
      <div className="p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
        <div className="text-xs text-slate-400">
          <strong>Disclaimer:</strong> This calculator provides estimates only and should not be considered 
          legal advice. Actual awards depend on many factors including the nature of violations, quality of 
          information provided, and enforcement actions taken. Consult with a qualified whistleblower attorney 
          for specific guidance on your situation.
        </div>
      </div>
    </div>
  );
};

