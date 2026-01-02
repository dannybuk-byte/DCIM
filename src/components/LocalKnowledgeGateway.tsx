import { useState, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { getKnowledgeGapsForFacility } from '../analyzers/knowledgeGaps';
import { generateFOIATemplate } from '../generators/foiaTemplate';
import { db } from '../db/database';
import { KnowledgeGap } from '../analyzers/knowledgeGaps';
import { FileText, ExternalLink, Lock } from 'lucide-react';

interface LocalKnowledgeGatewayProps {
  facilityId: number;
  countyFips: string;
}

interface LocalOrganization {
  id: number;
  name: string;
  type: 'government' | 'environmental' | 'journalism' | 'labor';
  website?: string;
  relevance: string;
}

export function LocalKnowledgeGateway({ facilityId, countyFips }: LocalKnowledgeGatewayProps) {
  const [knowledgeGaps, setKnowledgeGaps] = useState<KnowledgeGap[]>([]);
  const [organizations, setOrganizations] = useState<LocalOrganization[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGap, setSelectedGap] = useState<KnowledgeGap | null>(null);
  const [foiaTemplate, setFoiaTemplate] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        
        // Load knowledge gaps
        const gaps = await getKnowledgeGapsForFacility(facilityId);
        
        if (isMounted && !abortController.signal.aborted) {
          setKnowledgeGaps(gaps);
        }

        // Load local organizations (would be from IndexedDB)
        const orgs = await db.localOrganizations
          .where('countyFips')
          .equals(countyFips)
          .toArray();
        setOrganizations(orgs as LocalOrganization[]);

      } catch (error) {
        console.error('Error loading knowledge gateway data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [facilityId, countyFips]);

  const handleGenerateFOIA = async (gap: KnowledgeGap) => {
    if (!gap.foiaTemplate) {
      return;
    }

    try {
      const template = await generateFOIATemplate(gap.foiaTemplate as any, facilityId);
      if (template) {
        setFoiaTemplate(template.body);
        setSelectedGap(gap);
      }
    } catch (error) {
      console.error('Error generating FOIA template:', error);
    }
  };

  const getOrgIcon = (type: string) => {
    switch (type) {
      case 'government': return '🏛️';
      case 'environmental': return '🌿';
      case 'journalism': return '📰';
      case 'labor': return '👷';
      default: return '📋';
    }
  };

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <div className="space-y-3">
            <div className="h-8 bg-gray-900 rounded animate-pulse" />
            <div className="h-32 bg-gray-900 rounded animate-pulse" />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2 text-gray-200">Local Knowledge Gateway</h3>
          <p className="text-sm text-gray-400 italic">
            "All our amassed records are no more than indexes to local knowledge."
          </p>
          <p className="text-xs text-gray-500 mt-1">— Yanni Loukissas</p>
        </div>

        {/* Community Organizations */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-200 mb-3">Community Organizations</h4>
          {organizations.length > 0 ? (
            <div className="space-y-2">
              {organizations.map((org) => (
                <div
                  key={org.id}
                  className="p-3 bg-gray-900 rounded-lg border border-gray-700"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{getOrgIcon(org.type)}</span>
                        <span className="text-sm font-medium text-gray-200">{org.name}</span>
                        <span className="text-xs text-gray-500 capitalize">({org.type})</span>
                      </div>
                      <div className="text-xs text-gray-400">{org.relevance}</div>
                    </div>
                    {org.website && (
                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 p-3 bg-gray-900 rounded">
              No local organizations found for this county. Organizations can be added to help connect users with local knowledge sources.
            </div>
          )}
        </div>

        {/* Knowledge Gaps */}
        <div className="mb-6">
          <h4 className="text-sm font-medium text-gray-200 mb-3">Knowledge Gaps</h4>
          {knowledgeGaps.length > 0 ? (
            <div className="space-y-3">
              {knowledgeGaps.map((gap, index) => (
                <div
                  key={index}
                  className="p-4 bg-gray-900 rounded-lg border border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          gap.priority === 'HIGH' ? 'bg-red-900/50 text-red-200' :
                          gap.priority === 'MEDIUM' ? 'bg-yellow-900/50 text-yellow-200' :
                          'bg-gray-700 text-gray-300'
                        }`}>
                          {gap.priority}
                        </span>
                        <span className="text-sm font-medium text-gray-200">{gap.question}</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Investigation approach: {gap.investigationApproach}
                      </div>
                    </div>
                  </div>
                  {gap.foiaTemplate && (
                    <button
                      onClick={() => handleGenerateFOIA(gap)}
                      className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs flex items-center gap-1"
                    >
                      <FileText className="w-3 h-3" />
                      Generate FOIA Template
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-gray-400 p-3 bg-gray-900 rounded">
              No knowledge gaps identified. All key data points are available.
            </div>
          )}
        </div>

        {/* FOIA Template Modal */}
        {foiaTemplate && selectedGap && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
            <div className="bg-gray-800 border border-gray-700 rounded-lg max-w-2xl w-full max-h-[80vh] overflow-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-lg font-semibold text-gray-200">FOIA Request Template</h4>
                  <button
                    onClick={() => {
                      setFoiaTemplate(null);
                      setSelectedGap(null);
                    }}
                    className="text-gray-400 hover:text-gray-200"
                  >
                    ✕
                  </button>
                </div>
                <div className="mb-4">
                  <div className="text-sm text-gray-400 mb-2">Question: {selectedGap.question}</div>
                  <div className="p-4 bg-gray-900 rounded border border-gray-700">
                    <pre className="text-xs text-gray-300 whitespace-pre-wrap font-sans">
                      {foiaTemplate}
                    </pre>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(foiaTemplate);
                    }}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm"
                  >
                    Copy to Clipboard
                  </button>
                  <button
                    onClick={() => {
                      setFoiaTemplate(null);
                      setSelectedGap(null);
                    }}
                    className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Contribute Section */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg border border-gray-700">
          <h4 className="text-sm font-medium text-gray-200 mb-2">Contribute</h4>
          <p className="text-sm text-gray-400 mb-3">
            Do you have information about this facility?
          </p>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Submit via Secure Form
            </button>
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-sm flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Generate FOIA Request
            </button>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

