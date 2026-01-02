import { useState, useEffect } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ProvenanceBadge } from './shared/ProvenanceBadge';
import { Tooltip } from './shared/Tooltip';
import { db, SubsidyAgreement } from '../db/database';
import { formatCurrency } from '../utils/formatting';
import { Info } from 'lucide-react';

interface PromisesMadeProps {
  facilityId: number;
}

export function PromisesMade({ facilityId }: PromisesMadeProps) {
  const [agreement, setAgreement] = useState<SubsidyAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadAgreement() {
      try {
        setLoading(true);
        const result = await db.subsidyAgreements
          .where('facilityId')
          .equals(facilityId)
          .first();

        if (isMounted && !abortController.signal.aborted) {
          setAgreement(result || null);
          setError(null);
        }
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to load subsidy agreement'));
      } finally {
        setLoading(false);
      }
    }

    loadAgreement();
  }, [facilityId]);

  if (loading) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">PROMISES MADE</h3>
          <div className="space-y-3">
            <div className="h-12 bg-gray-900 rounded animate-pulse" />
            <div className="h-12 bg-gray-900 rounded animate-pulse" />
            <div className="h-12 bg-gray-900 rounded animate-pulse" />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (error) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">PROMISES MADE</h3>
          <div className="p-3 bg-red-900/20 border border-red-900/50 rounded text-sm text-red-200">
            Error loading subsidy agreement: {error.message}
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (!agreement) {
    return (
      <ErrorBoundary>
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4 text-gray-200">PROMISES MADE</h3>
          <div className="text-sm text-gray-400">Not disclosed</div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-200">PROMISES MADE</h3>
          <Tooltip content="These are the commitments the company made when they received public subsidies or tax breaks. This is what they promised to deliver in exchange for public money.">
            <Info className="w-4 h-4 text-gray-400" />
          </Tooltip>
        </div>

        <div className="space-y-4">
          {/* Permitting Date */}
          <div className="flex justify-between items-start py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400">Permitting Date</div>
            <div className="text-sm font-medium text-gray-200 text-right">
              {agreement.permitDate ? new Date(agreement.permitDate).toLocaleDateString() : 'Not disclosed'}
            </div>
          </div>

          {/* Promised Jobs */}
          <div className="flex justify-between items-start py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400 flex items-center gap-1">
              Promised Jobs
              <Tooltip content="The number of jobs the company said they would create when they received public subsidies. Compare this to 'Reality Observed' to see if they delivered.">
                <Info className="w-3 h-3" />
              </Tooltip>
            </div>
            <div className="text-sm font-medium text-gray-200 text-right">
              {agreement.promisedJobs.toLocaleString()}
            </div>
          </div>

          {/* Promised Investment */}
          <div className="flex justify-between items-start py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400 flex items-center gap-1">
              Promised Investment
              <Tooltip content="How much money the company said they would spend building the facility. This is what they committed to invest in the community.">
                <Info className="w-3 h-3" />
              </Tooltip>
            </div>
            <div className="text-sm font-medium text-gray-200 text-right">
              {formatCurrency(agreement.promisedInvestment)}
            </div>
          </div>

          {/* Tax Incentives */}
          <div className="flex justify-between items-start py-2 border-b border-gray-700">
            <div className="text-sm text-gray-400 flex items-center gap-1">
              Tax Incentives Received
              <Tooltip content="The amount of public money (tax breaks, grants, etc.) the company received. This is what taxpayers gave them in exchange for their promises.">
                <Info className="w-3 h-3" />
              </Tooltip>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-200">
                {formatCurrency(agreement.incentiveValue)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{agreement.incentiveType}</div>
            </div>
          </div>

          {/* Source Document */}
          <div className="flex justify-between items-start py-2">
            <div className="text-sm text-gray-400">Source Document</div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-200 mb-2">
                {agreement.sourceDocument || 'Not disclosed'}
              </div>
              {agreement.sourceDocument && (
                <ProvenanceBadge
                  sourceType={agreement.sourceType}
                  sourceDescription={`Subsidy agreement document: ${agreement.sourceDocument}`}
                  lastUpdated={agreement.permitDate}
                  collectionMethod="FOIA request or public records"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}

