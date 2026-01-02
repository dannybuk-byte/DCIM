import { useState, useMemo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { Tooltip } from './shared/Tooltip';
import { AlertTriangle, TrendingUp, TrendingDown, Info, ChevronDown, ChevronRight } from 'lucide-react';
import { formatCurrency } from '../utils/formatting';

export interface EmbeddedAssumption {
  name: string;
  value: number | string;
  source: string;
  warnings: string[];
  alternatives: Array<{
    value: number | string;
    description: string;
    result: number;
  }>;
}

export interface Calculation {
  name: string;
  formula: string;
  result: number;
  embeddedAssumptions: EmbeddedAssumption[];
}

interface AssumptionPanelProps {
  calculation: Calculation;
  className?: string;
}

export function AssumptionPanel({ calculation, className = '' }: AssumptionPanelProps) {
  const [showSensitivity, setShowSensitivity] = useState(false);

  // Calculate sensitivity analysis
  const sensitivityData = useMemo(() => {
    if (!calculation.embeddedAssumptions || calculation.embeddedAssumptions.length === 0) {
      return null;
    }

    // For each assumption, calculate impact on result
    const impacts = calculation.embeddedAssumptions.map(assumption => {
      if (assumption.alternatives.length === 0) return null;

      const baseValue = typeof assumption.value === 'number' ? assumption.value : 0;
      const alternatives = assumption.alternatives.filter(alt => typeof alt.value === 'number');
      
      if (alternatives.length === 0) return null;

      const minAlt = alternatives.reduce((min, alt) => 
        typeof alt.value === 'number' && alt.value < (typeof min.value === 'number' ? min.value : Infinity) ? alt : min
      );
      const maxAlt = alternatives.reduce((max, alt) => 
        typeof alt.value === 'number' && alt.value > (typeof max.value === 'number' ? max.value : -Infinity) ? alt : max
      );

      return {
        assumption: assumption.name,
        baseValue,
        minResult: minAlt.result,
        maxResult: maxAlt.result,
        impact: Math.abs(maxAlt.result - minAlt.result)
      };
    }).filter(Boolean);

    // Sort by impact (highest first)
    impacts.sort((a, b) => (b?.impact || 0) - (a?.impact || 0));

    return impacts;
  }, [calculation.embeddedAssumptions]);

  return (
    <ErrorBoundary>
      <div className={`bg-gray-800 border border-gray-700 rounded-lg p-6 ${className}`}>
        <div className="mb-4">
          <div className="text-xs text-gray-400 italic mb-2">
            "Data and algorithms are entangled—understand the embedded assumptions."
          </div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-200">{calculation.name}</h3>
            <Tooltip content="This shows all the 'guesses' or assumptions that went into calculating this number. These aren't facts - they're choices made during the calculation. Click on each assumption to see how changing it would change the result.">
              <Info className="w-4 h-4 text-gray-400" />
            </Tooltip>
          </div>
        </div>

        {/* Formula and Result */}
        <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <div className="text-sm text-gray-400 mb-2">Formula</div>
          <div className="text-sm font-mono text-gray-200 mb-3">{calculation.formula}</div>
          <div className="text-2xl font-bold text-amber-400">
            {formatCurrency(calculation.result)}
          </div>
        </div>

        {/* Embedded Assumptions */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="text-sm font-medium text-gray-200">Embedded Assumptions</div>
            <Tooltip content="These are the 'guesses' or estimates used in the calculation. They're shown in yellow to remind you these are choices, not facts. Each one can be changed to see how it affects the final number.">
              <Info className="w-3 h-3 text-gray-400" />
            </Tooltip>
          </div>
          {calculation.embeddedAssumptions.map((assumption, index) => (
            <div
              key={index}
              className="p-4 bg-yellow-900/10 border border-yellow-700/30 rounded-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-200 mb-1">
                    {assumption.name}
                  </div>
                  <div className="text-xs text-gray-400">
                    Current value: <span className="text-gray-300 font-mono">
                      {typeof assumption.value === 'number' 
                        ? (typeof assumption.value === 'number' && assumption.value > 1000
                          ? formatCurrency(assumption.value)
                          : assumption.value.toLocaleString())
                        : assumption.value}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Source: {assumption.source}
                  </div>
                </div>
              </div>

              {/* Warnings */}
              {assumption.warnings && assumption.warnings.length > 0 && (
                <div className="mt-3 space-y-1">
                  {assumption.warnings.map((warning, wIndex) => (
                    <div key={wIndex} className="flex items-start gap-2 text-xs text-yellow-200">
                      <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                      <span>{warning}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Alternatives */}
              {assumption.alternatives && assumption.alternatives.length > 0 && (
                <div className="mt-3 pt-3 border-t border-yellow-700/30">
                  <div className="text-xs font-medium text-gray-300 mb-2">Alternative Values:</div>
                  <div className="space-y-2">
                    {assumption.alternatives.map((alt, altIndex) => {
                      const isHigher = alt.result > calculation.result;
                      const isLower = alt.result < calculation.result;
                      
                      return (
                        <div
                          key={altIndex}
                          className="p-2 bg-gray-900 rounded text-xs"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-300">{alt.description}</span>
                            <div className="flex items-center gap-1">
                              {isHigher && <TrendingUp className="w-3 h-3 text-red-400" />}
                              {isLower && <TrendingDown className="w-3 h-3 text-green-400" />}
                              <span className={`font-mono ${
                                isHigher ? 'text-red-400' : isLower ? 'text-green-400' : 'text-gray-300'
                              }`}>
                                {formatCurrency(alt.result)}
                              </span>
                            </div>
                          </div>
                          <div className="text-gray-500 text-xs">
                            Value: {typeof alt.value === 'number' 
                              ? (alt.value > 1000 ? formatCurrency(alt.value) : alt.value.toLocaleString())
                              : alt.value}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Sensitivity Analysis */}
        {sensitivityData && sensitivityData.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowSensitivity(!showSensitivity)}
              className="w-full flex items-center justify-between p-3 bg-gray-900 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-gray-400" />
                <span className="text-sm font-medium text-gray-200">Sensitivity Analysis</span>
              </div>
              {showSensitivity ? (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showSensitivity && (
              <div className="mt-3 p-4 bg-gray-900 rounded-lg">
                <div className="text-xs text-gray-400 mb-3">
                  Assumptions ranked by impact on result:
                </div>
                <div className="space-y-2">
                  {sensitivityData.map((impact, index) => (
                    <div key={index} className="flex items-center justify-between text-xs">
                      <span className="text-gray-300">{impact?.assumption}</span>
                      <span className="text-gray-400">
                        Impact: {formatCurrency(impact?.impact || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

