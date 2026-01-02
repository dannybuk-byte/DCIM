import { useState, useMemo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { AlertTriangle, HelpCircle, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

interface DataPoint {
  value: number;
  timestamp: string;
  label?: string;
}

interface AnomalyInvestigatorProps {
  dataPoints: DataPoint[];
  historicalData?: DataPoint[];
  metricName: string;
}

interface Anomaly {
  observation: string;
  type: 'sudden_change' | 'outlier' | 'missing_data';
  value: number;
  previousValue?: number;
  changePercentage?: number;
  timestamp: string;
  possibleExplanations: string[];
  investigationQuestions: string[];
}

export function AnomalyInvestigator({
  dataPoints,
  historicalData = [],
  metricName
}: AnomalyInvestigatorProps) {
  const [expandedAnomalies, setExpandedAnomalies] = useState<Set<number>>(new Set());

  const anomalies = useMemo(() => {
    const detected: Anomaly[] = [];
    const allData = [...historicalData, ...dataPoints].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    if (allData.length < 2) return [];

    // Calculate mean and standard deviation
    const values = allData.map(d => d.value);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Detect anomalies
    for (let i = 1; i < allData.length; i++) {
      const current = allData[i];
      const previous = allData[i - 1];
      const change = Math.abs(current.value - previous.value);
      const changePercentage = (change / previous.value) * 100;

      // Sudden change detection (>30% change)
      if (changePercentage > 30) {
        detected.push({
          observation: `${metricName} changed by ${changePercentage.toFixed(1)}% from ${previous.value.toLocaleString()} to ${current.value.toLocaleString()}`,
          type: 'sudden_change',
          value: current.value,
          previousValue: previous.value,
          changePercentage,
          timestamp: current.timestamp,
          possibleExplanations: getPossibleExplanations(metricName, changePercentage > 0),
          investigationQuestions: getInvestigationQuestions(metricName)
        });
      }

      // Outlier detection (>2 standard deviations)
      if (Math.abs(current.value - mean) > 2 * stdDev) {
        detected.push({
          observation: `${metricName} value of ${current.value.toLocaleString()} is ${((Math.abs(current.value - mean) / stdDev)).toFixed(1)} standard deviations from the mean`,
          type: 'outlier',
          value: current.value,
          timestamp: current.timestamp,
          possibleExplanations: getPossibleExplanations(metricName, current.value > mean),
          investigationQuestions: getInvestigationQuestions(metricName)
        });
      }
    }

    // Missing data detection (gaps > expected interval)
    const expectedInterval = calculateExpectedInterval(allData);
    for (let i = 1; i < allData.length; i++) {
      const gap = new Date(allData[i].timestamp).getTime() - new Date(allData[i - 1].timestamp).getTime();
      if (gap > expectedInterval * 2) {
        detected.push({
          observation: `Data gap of ${Math.floor(gap / (1000 * 60 * 60 * 24))} days detected between ${allData[i - 1].timestamp} and ${allData[i].timestamp}`,
          type: 'missing_data',
          value: 0,
          timestamp: allData[i].timestamp,
          possibleExplanations: [
            'Data collection interruption',
            'Reporting period change',
            'Facility operational pause'
          ],
          investigationQuestions: [
            'Was there a change in reporting requirements?',
            'Did the facility experience operational changes?',
            'Are there known data collection issues for this period?'
          ]
        });
      }
    }

    return detected;
  }, [dataPoints, historicalData, metricName]);

  function calculateExpectedInterval(data: DataPoint[]): number {
    if (data.length < 2) return 30 * 24 * 60 * 60 * 1000; // Default 30 days

    const intervals: number[] = [];
    for (let i = 1; i < data.length; i++) {
      intervals.push(
        new Date(data[i].timestamp).getTime() - new Date(data[i - 1].timestamp).getTime()
      );
    }

    // Return median interval
    intervals.sort((a, b) => a - b);
    return intervals[Math.floor(intervals.length / 2)];
  }

  function getPossibleExplanations(metric: string, isIncrease: boolean): string[] {
    const explanations: Record<string, string[]> = {
      employment: isIncrease
        ? ['Construction phase hiring', 'Expansion project', 'Seasonal workforce increase']
        : ['Construction phase ended', 'Automation upgrade', 'Contractor workforce not captured', 'Layoffs or downsizing'],
      energy: isIncrease
        ? ['Facility expansion', 'Increased cooling demand', 'New equipment installation']
        : ['Efficiency improvements', 'Equipment shutdown', 'Seasonal variation'],
      water: isIncrease
        ? ['Cooling system expansion', 'Increased operations', 'Leak or system issue']
        : ['Water recycling system', 'Reduced operations', 'System efficiency improvement']
    };

    return explanations[metric.toLowerCase()] || [
      isIncrease ? 'Operational increase' : 'Operational decrease',
      'Data collection change',
      'Reporting methodology change'
    ];
  }

  function getInvestigationQuestions(metric: string): string[] {
    const questions: Record<string, string[]> = {
      employment: [
        'What phase is this facility in?',
        'Were technology upgrades announced?',
        'Is this a construction vs. operations transition?',
        'Are contractor positions included in the count?'
      ],
      energy: [
        'What is the facility capacity vs. actual load?',
        'Were efficiency upgrades implemented?',
        'Is this seasonal variation expected?',
        'Are backup generators included?'
      ],
      water: [
        'What is the cooling system type?',
        'Are there water recycling systems?',
        'Is this within permitted limits?',
        'Are there known leaks or issues?'
      ]
    };

    return questions[metric.toLowerCase()] || [
      'What operational changes occurred?',
      'Is this data collection or actual change?',
      'Are there known reporting issues?'
    ];
  }

  const toggleAnomaly = (index: number) => {
    setExpandedAnomalies(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  if (anomalies.length === 0) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Anomaly Investigator</h3>
          <div className="text-sm text-gray-400">
            No anomalies detected in {metricName} data. All observations fall within expected patterns.
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-2 text-gray-200">Anomaly Investigator</h3>
          <p className="text-sm text-gray-400 italic">
            "Data dirt is really data out of place—data from contexts we don't understand."
          </p>
          <p className="text-xs text-gray-500 mt-1">— Yanni Loukissas</p>
        </div>

        <div className="space-y-3">
          {anomalies.map((anomaly, index) => (
            <div
              key={index}
              className="border border-amber-700/50 rounded-lg bg-amber-900/10"
            >
              <button
                onClick={() => toggleAnomaly(index)}
                className="w-full p-4 text-left flex items-start justify-between hover:bg-amber-900/20 transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <span className="text-sm font-medium text-amber-200">
                      {anomaly.type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(anomaly.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-sm text-gray-300">{anomaly.observation}</div>
                </div>
                <div className="ml-4 text-amber-400">
                  {expandedAnomalies.has(index) ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </button>

              {expandedAnomalies.has(index) && (
                <div className="px-4 pb-4 border-t border-amber-700/30">
                  <div className="mt-4 space-y-4">
                    {/* Possible Explanations */}
                    <div>
                      <div className="text-xs font-medium text-amber-200 mb-2">
                        Possible Local Explanations:
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                        {anomaly.possibleExplanations.map((explanation, i) => (
                          <li key={i}>{explanation}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Investigation Questions */}
                    <div>
                      <div className="text-xs font-medium text-amber-200 mb-2 flex items-center gap-1">
                        <HelpCircle className="w-3 h-3" />
                        Investigation Questions:
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-sm text-gray-300">
                        {anomaly.investigationQuestions.map((question, i) => (
                          <li key={i}>{question}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Links to investigate */}
                    <div className="pt-2 border-t border-amber-700/30">
                      <div className="text-xs text-gray-400 mb-2">Investigate further:</div>
                      <div className="flex flex-wrap gap-2">
                        <button className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          FOIA Request
                        </button>
                        <button className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          Local Records
                        </button>
                        <button className="text-xs px-2 py-1 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 flex items-center gap-1">
                          <ExternalLink className="w-3 h-3" />
                          News Archive
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-4 p-3 bg-gray-900/50 rounded text-xs text-gray-400">
          <strong>Note:</strong> Anomalies are preserved and highlighted, not cleaned or smoothed. 
          Each anomaly represents a signal to investigate local context, not noise to remove.
        </div>
      </div>
    </ErrorBoundary>
  );
}

