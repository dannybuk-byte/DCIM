import { useState, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { db } from '../db/database';
import { Facility } from '../types';
import { formatCurrency } from '../utils/formatting';
import { Building2, MapPin, AlertTriangle } from 'lucide-react';

interface ContextualComparisonProps {
  facilityId: number;
}

interface ComparableFacility extends Facility {
  comparisonReason: string;
  differences: {
    jobs?: { current: number; comparable: number };
    subsidyGap?: { current: number; comparable: number };
    compliance?: { current: string; comparable: string };
  };
}

export function ContextualComparison({ facilityId }: ContextualComparisonProps) {
  const [currentFacility, setCurrentFacility] = useState<Facility | null>(null);
  const [comparableFacilities, setComparableFacilities] = useState<ComparableFacility[]>([]);
  const [_communityContext, setCommunityContext] = useState<{
    population?: number;
    medianIncome?: number;
    gridOperator?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadData() {
      try {
        setLoading(true);
        
        // Load current facility
        const facility = await db.facilities.get(facilityId);
        if (!facility || !isMounted || abortController.signal.aborted) {
          if (isMounted) {
            setLoading(false);
          }
          return;
        }
        setCurrentFacility(facility);

        // Load community context (would come from CommunityContext component in real implementation)
        // For now, we'll use placeholder values - in real implementation this would be fetched
        const context = {
          population: 420000, // Placeholder
          medianIncome: 85000, // Placeholder
          gridOperator: 'PJM' // Placeholder
        };
        setCommunityContext(context);

        // Find comparable facilities
        const allFacilities = await db.facilities.toArray();
        const comparable = findComparableFacilities(facility, allFacilities, context);
        setComparableFacilities(comparable);
      } catch (error) {
        console.error('Error loading comparison data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [facilityId]);

  function findComparableFacilities(
    current: Facility,
    allFacilities: Facility[],
    _context: { population?: number; medianIncome?: number; gridOperator?: string }
  ): ComparableFacility[] {
    const comparables: ComparableFacility[] = [];

    for (const facility of allFacilities) {
      if (facility.id === current.id) continue;

      let reason = '';
      let matchScore = 0;

      // Same state (geographic similarity)
      if (facility.state === current.state) {
        matchScore += 2;
        reason += 'Same state; ';
      }

      // Similar population context (would use actual community context in real implementation)
      // For now, we'll use a simple heuristic
      if (facility.city === current.city) {
        matchScore += 3;
        reason += 'Same city; ';
      }

      // Same operator (similar business model)
      if (facility.operator === current.operator) {
        matchScore += 2;
        reason += 'Same operator; ';
      }

      // Same facility type
      if (facility.type === current.type) {
        matchScore += 1;
        reason += 'Same type; ';
      }

      // Similar compliance status
      if (facility.complianceStatus === current.complianceStatus) {
        matchScore += 1;
        reason += 'Similar compliance status; ';
      }

      if (matchScore >= 3) {
        const differences = {
          jobs: {
            current: 0, // Would be from actual employment data
            comparable: 0
          },
          subsidyGap: {
            current: current.subsidyGap,
            comparable: facility.subsidyGap
          },
          compliance: {
            current: current.complianceStatus,
            comparable: facility.complianceStatus
          }
        };

        comparables.push({
          ...facility,
          comparisonReason: reason || 'Similar characteristics',
          differences
        });
      }
    }

    // Sort by match score and limit to top 5
    return comparables
      .sort((a, b) => {
        const scoreA = a.comparisonReason.split(';').length;
        const scoreB = b.comparisonReason.split(';').length;
        return scoreB - scoreA;
      })
      .slice(0, 5);
  }

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Contextual Comparison</h3>
          <div className="space-y-3">
            <div className="h-32 bg-gray-900 rounded animate-pulse" />
            <div className="h-32 bg-gray-900 rounded animate-pulse" />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!currentFacility || comparableFacilities.length === 0) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">Contextual Comparison</h3>
          <div className="text-sm text-gray-400">
            No comparable facilities found with similar community characteristics.
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-200">Contextual Comparison</h3>
        <p className="text-sm text-gray-400 mb-4">
          Comparing facilities in similar communities, not abstract rankings.
        </p>

        <div className="space-y-4">
          {comparableFacilities.map((facility) => (
            <div
              key={facility.id}
              className="p-4 bg-gray-900 border border-gray-700 rounded-lg"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Building2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium text-gray-200">{facility.name}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <MapPin className="w-3 h-3" />
                    <span>{facility.city}, {facility.state}</span>
                  </div>
                </div>
                <div className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
                  {facility.type}
                </div>
              </div>

              {/* Why comparable */}
              <div className="mb-3 p-2 bg-blue-900/20 border border-blue-700/50 rounded text-xs text-blue-200">
                <strong>Why comparable:</strong> {facility.comparisonReason}
              </div>

              {/* Key metrics comparison */}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-gray-400 mb-1">Subsidy Gap</div>
                  <div className="flex items-center gap-2">
                    <div className="text-gray-200">
                      {formatCurrency(facility.differences.subsidyGap?.current || 0)}
                    </div>
                    <span className="text-gray-500">vs</span>
                    <div className="text-gray-300">
                      {formatCurrency(facility.differences.subsidyGap?.comparable || 0)}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-xs text-gray-400 mb-1">Compliance</div>
                  <div className="flex items-center gap-2">
                    <div
                      className={`px-2 py-1 rounded text-xs ${
                        facility.differences.compliance?.current === 'Compliant'
                          ? 'bg-green-900/50 text-green-200'
                          : facility.differences.compliance?.current === 'Non-Compliant'
                          ? 'bg-red-900/50 text-red-200'
                          : 'bg-yellow-900/50 text-yellow-200'
                      }`}
                    >
                      {facility.differences.compliance?.current}
                    </div>
                    <span className="text-gray-500">vs</span>
                    <div
                      className={`px-2 py-1 rounded text-xs ${
                        facility.differences.compliance?.comparable === 'Compliant'
                          ? 'bg-green-900/50 text-green-200'
                          : facility.differences.compliance?.comparable === 'Non-Compliant'
                          ? 'bg-red-900/50 text-red-200'
                          : 'bg-yellow-900/50 text-yellow-200'
                      }`}
                    >
                      {facility.differences.compliance?.comparable}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Warning banner */}
        <div className="mt-6 p-4 bg-amber-900/20 border border-amber-700/50 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-200">
              <strong>Warning:</strong> Direct facility comparison without community context obscures local conditions that shape outcomes. 
              These comparisons are only meaningful when facilities operate in similar demographic, economic, and regulatory environments.
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

