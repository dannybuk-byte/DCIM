import { useState, useEffect, useRef } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import { ProvenanceBadge } from './shared/ProvenanceBadge';
import { Tooltip } from './shared/Tooltip';
import { getCountyDemographics } from '../api/census';
import { getEJScreenData } from '../api/epa';
import { useWithProvenance } from '../hooks/useWithProvenance';
import { SourceType } from '../config/sourceTypes';
import { validateFIPS } from '../utils/validation';
import { Info } from 'lucide-react';

interface CommunityContextProps {
  facilityId: number;
  countyFips: string;
  onContextLoaded?: (loaded: boolean) => void;
}

interface ContextData {
  countyName: string;
  population: number;
  medianIncome: number;
  ejIndex: number;
  gridOperator: string;
  waterAuthority: string;
}

export function CommunityContext({ facilityId: _facilityId, countyFips, onContextLoaded }: CommunityContextProps) {
  const [contextData, setContextData] = useState<Partial<ContextData>>({});
  const [loadingStates, setLoadingStates] = useState({
    demographics: true,
    ejScreen: true,
    gridOperator: false,
    waterAuthority: false
  });
  const [errors, setErrors] = useState<Record<string, Error | null>>({});
  const abortControllerRef = useRef<AbortController | null>(null);

  // Validate countyFips input
  const isValidFIPS = validateFIPS(countyFips, 5);

  // Fetch county demographics with error handling and abort signal
  const { data: demographics, provenance: demogProvenance } = useWithProvenance(
    () => {
      if (!isValidFIPS) {
        throw new Error('Invalid county FIPS code');
      }
      abortControllerRef.current = new AbortController();
      return getCountyDemographics(countyFips, abortControllerRef.current.signal).catch(err => {
        console.warn('Failed to fetch demographics:', err);
        setErrors(prev => ({ ...prev, demographics: err instanceof Error ? err : new Error('Unknown error') }));
        return null;
      });
    },
    {
      sourceType: 'GOV' as SourceType,
      sourceDescription: 'US Census Bureau American Community Survey 5-year estimates',
      collectionMethod: 'API call to api.census.gov'
    }
  );

  // Fetch EJScreen data with error handling and abort signal
  const { data: ejData, provenance: ejProvenance } = useWithProvenance(
    () => {
      if (!isValidFIPS) {
        return Promise.resolve({ ejIndex: 0, demographicIndex: 0, supplementalIndexes: {} });
      }
      if (!abortControllerRef.current) {
        abortControllerRef.current = new AbortController();
      }
      return getEJScreenData(countyFips, abortControllerRef.current.signal).catch(err => {
        console.warn('Failed to fetch EJScreen data:', err);
        setErrors(prev => ({ ...prev, ejScreen: err instanceof Error ? err : new Error('Unknown error') }));
        return { ejIndex: 0, demographicIndex: 0, supplementalIndexes: {} };
      });
    },
    {
      sourceType: 'GOV' as SourceType,
      sourceDescription: 'EPA EJScreen Environmental Justice indicators',
      collectionMethod: 'API call to ejscreen.epa.gov'
    }
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  useEffect(() => {
    if (demographics) {
      setContextData(prev => ({
        ...prev,
        countyName: demographics.name,
        population: demographics.population,
        medianIncome: demographics.medianIncome
      }));
      setLoadingStates(prev => ({ ...prev, demographics: false }));
    }
  }, [demographics]);

  useEffect(() => {
    if (ejData) {
      setContextData(prev => ({
        ...prev,
        ejIndex: ejData.ejIndex
      }));
      setLoadingStates(prev => ({ ...prev, ejScreen: false }));
    }
  }, [ejData]);

  // Grid operator and water authority would typically come from facility data or separate API
  // For now, we'll set defaults or leave empty
  useEffect(() => {
    // These would be fetched from facility-specific data or regional databases
    setContextData(prev => ({
      ...prev,
      gridOperator: 'Unknown', // Would be populated from facility data
      waterAuthority: 'Unknown' // Would be populated from facility data
    }));
    setLoadingStates(prev => ({
      ...prev,
      gridOperator: false,
      waterAuthority: false
    }));
  }, []);

  // Notify parent when all data is loaded
  useEffect(() => {
    const allLoaded = Object.values(loadingStates).every(loaded => !loaded);
    onContextLoaded?.(allLoaded);
  }, [loadingStates, onContextLoaded]);

  const isLoading = Object.values(loadingStates).some(loading => loading);

  return (
    <ErrorBoundary>
      <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-lg font-semibold text-gray-200">PLACE CONTEXT</h3>
          <Tooltip content="This shows the local community where the facility is located. Understanding the place helps explain why certain outcomes happen - like why job promises might not materialize in a rural area vs. an urban one.">
            <Info className="w-4 h-4 text-gray-400" />
          </Tooltip>
        </div>

        {isLoading && (
          <div className="space-y-3 mb-4">
            {loadingStates.demographics && (
              <div className="h-16 bg-gray-900 rounded animate-pulse" />
            )}
            {loadingStates.ejScreen && (
              <div className="h-16 bg-gray-900 rounded animate-pulse" />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* County Name */}
          {contextData.countyName && (
            <div className="p-3 bg-gray-900 rounded">
              <div className="text-xs text-gray-400 mb-1">County</div>
              <div className="text-sm font-medium text-gray-200">{contextData.countyName}</div>
              {demogProvenance && (
                <div className="mt-2">
                  <ProvenanceBadge
                    sourceType={demogProvenance.sourceType as SourceType}
                    sourceDescription={demogProvenance.sourceDescription}
                    lastUpdated={demogProvenance.capturedAt}
                    collectionMethod={demogProvenance.collectionMethod}
                  />
                </div>
              )}
            </div>
          )}

          {/* Population */}
          {contextData.population !== undefined && (
            <div className="p-3 bg-gray-900 rounded">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                Population
                <Tooltip content="Total number of people living in this county. This helps understand the local labor market and community size.">
                  <Info className="w-3 h-3" />
                </Tooltip>
              </div>
              <div className="text-sm font-medium text-gray-200">
                {contextData.population.toLocaleString()}
              </div>
              {demogProvenance && (
                <div className="mt-2">
                  <ProvenanceBadge
                    sourceType={demogProvenance.sourceType as SourceType}
                    sourceDescription={demogProvenance.sourceDescription}
                    lastUpdated={demogProvenance.capturedAt}
                    collectionMethod={demogProvenance.collectionMethod}
                  />
                </div>
              )}
            </div>
          )}

          {/* Median Income */}
          {contextData.medianIncome !== undefined && (
            <div className="p-3 bg-gray-900 rounded">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                Median Household Income
                <Tooltip content="The middle income level for families in this county. Half make more, half make less. This shows the economic context of the community.">
                  <Info className="w-3 h-3" />
                </Tooltip>
              </div>
              <div className="text-sm font-medium text-gray-200">
                ${contextData.medianIncome.toLocaleString()}
              </div>
              {demogProvenance && (
                <div className="mt-2">
                  <ProvenanceBadge
                    sourceType={demogProvenance.sourceType as SourceType}
                    sourceDescription={demogProvenance.sourceDescription}
                    lastUpdated={demogProvenance.capturedAt}
                    collectionMethod={demogProvenance.collectionMethod}
                  />
                </div>
              )}
            </div>
          )}

          {/* Environmental Justice Index */}
          {contextData.ejIndex !== undefined && (
            <div className="p-3 bg-gray-900 rounded">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                Environmental Justice Percentile
                <Tooltip content="A score from 0-100 showing how much this area is affected by environmental pollution and social factors. Higher numbers mean more environmental burden. This helps understand if the facility is in a community already dealing with pollution.">
                  <Info className="w-3 h-3" />
                </Tooltip>
              </div>
              <div className="text-sm font-medium text-gray-200">{contextData.ejIndex}</div>
              {ejProvenance && (
                <div className="mt-2">
                  <ProvenanceBadge
                    sourceType={ejProvenance.sourceType as SourceType}
                    sourceDescription={ejProvenance.sourceDescription}
                    lastUpdated={ejProvenance.capturedAt}
                    collectionMethod={ejProvenance.collectionMethod}
                  />
                </div>
              )}
            </div>
          )}

          {/* Grid Operator */}
          {contextData.gridOperator && (
            <div className="p-3 bg-gray-900 rounded">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                Grid Operator Zone
                <Tooltip content="The company that manages the electrical grid in this area. This affects energy prices and availability.">
                  <Info className="w-3 h-3" />
                </Tooltip>
              </div>
              <div className="text-sm font-medium text-gray-200">{contextData.gridOperator}</div>
            </div>
          )}

          {/* Water Authority */}
          {contextData.waterAuthority && (
            <div className="p-3 bg-gray-900 rounded">
              <div className="text-xs text-gray-400 mb-1 flex items-center gap-1">
                Water Authority
                <Tooltip content="The organization that provides water to this area. This is who you'd contact about water usage records.">
                  <Info className="w-3 h-3" />
                </Tooltip>
              </div>
              <div className="text-sm font-medium text-gray-200">{contextData.waterAuthority}</div>
            </div>
          )}
        </div>

        {Object.keys(errors).length > 0 && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-900/50 rounded text-sm text-red-200">
            <div className="font-medium mb-1">Some data unavailable:</div>
            <ul className="list-disc list-inside space-y-1">
              {Object.entries(errors).map(([key, error]) => (
                <li key={key}>{key}: {error?.message || 'Unknown error'}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
}

