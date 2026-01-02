import { useState } from 'react';
import { ErrorBoundary } from '../ErrorBoundary';
import { getSourceConfig, SourceType } from '../../config/sourceTypes';
import { ChevronDown, ChevronRight, AlertCircle, Info } from 'lucide-react';
import { Tooltip } from './Tooltip';

export interface ProvenanceData {
  sourceType: SourceType;
  sourceDescription: string;
  confidence: string;
  lastUpdated: string;
  variance?: string;
  limitations?: string[];
  alternativeSources?: ProvenanceData[];
  collectionMethod?: string;
}

interface ProvenanceBadgeProps {
  sourceType: SourceType;
  sourceDescription: string;
  confidence?: string;
  lastUpdated: string;
  variance?: string;
  limitations?: string[];
  alternativeSources?: ProvenanceData[];
  collectionMethod?: string;
  className?: string;
}

export function ProvenanceBadge({
  sourceType,
  sourceDescription,
  confidence,
  lastUpdated,
  variance,
  limitations,
  alternativeSources,
  collectionMethod,
  className = ''
}: ProvenanceBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const config = getSourceConfig(sourceType);
  const displayConfidence = confidence || config.confidence;

  return (
    <ErrorBoundary>
      <div className={`inline-block ${className}`}>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: `${config.color}20`, color: config.color, border: `1px solid ${config.color}40` }}
          title={`Click to see where this data came from and how reliable it is`}
        >
          {isExpanded ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          <span>{config.label}</span>
          {displayConfidence === 'DERIVED' && (
            <Tooltip content="This number was calculated from other data, not directly measured. Click to see the assumptions used.">
              <AlertCircle className="w-3 h-3" />
            </Tooltip>
          )}
        </button>

        {isExpanded && (
          <div
            className="mt-2 p-4 rounded-lg border text-sm"
            style={{
              backgroundColor: '#0d1219',
              borderColor: `${config.color}40`,
              maxWidth: '500px'
            }}
          >
            <div className="space-y-3">
              <div>
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  Where This Data Came From
                  <Tooltip content="The original source of this information, such as a government database or public records request.">
                    <Info className="w-3 h-3" />
                  </Tooltip>
                </div>
                <div className="text-gray-200">{sourceDescription}</div>
              </div>

              {collectionMethod && (
                <div>
                  <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                    How It Was Collected
                    <Tooltip content="The method used to gather this data, like an API call to a government website or a public records request.">
                      <Info className="w-3 h-3" />
                    </Tooltip>
                  </div>
                  <div className="text-gray-200">{collectionMethod}</div>
                </div>
              )}

              <div>
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  When It Was Last Updated
                  <Tooltip content="The date this data was collected. Older data may be less accurate if things have changed.">
                    <Info className="w-3 h-3" />
                  </Tooltip>
                </div>
                <div className="text-gray-200">{new Date(lastUpdated).toLocaleDateString()}</div>
              </div>

              <div>
                <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                  How Reliable This Is
                  <Tooltip content="HIGH = Official government data. MEDIUM = Public records or research. LOW = Estimates or unverified sources. DERIVED = Calculated from other numbers.">
                    <Info className="w-3 h-3" />
                  </Tooltip>
                </div>
                <div className="text-gray-200">{displayConfidence}</div>
              </div>

              {variance && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Variance/Uncertainty</div>
                  <div className="text-gray-200">{variance}</div>
                </div>
              )}

              {limitations && limitations.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-1">Limitations</div>
                  <ul className="list-disc list-inside text-gray-200 space-y-1">
                    {limitations.map((limitation, idx) => (
                      <li key={idx} className="text-xs">{limitation}</li>
                    ))}
                  </ul>
                </div>
              )}

              {alternativeSources && alternativeSources.length > 0 && (
                <div>
                  <div className="text-xs text-gray-400 mb-2">Alternative Sources</div>
                  <div className="space-y-2">
                    {alternativeSources.map((alt, idx) => (
                      <div key={idx} className="pl-2 border-l-2" style={{ borderColor: `${config.color}40` }}>
                        <ProvenanceBadge
                          sourceType={alt.sourceType}
                          sourceDescription={alt.sourceDescription}
                          confidence={alt.confidence}
                          lastUpdated={alt.lastUpdated}
                          variance={alt.variance}
                          limitations={alt.limitations}
                          collectionMethod={alt.collectionMethod}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

