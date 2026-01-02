import { useState, useEffect, useRef } from 'react';
import { SourceType } from '../config/sourceTypes';

export interface ProvenanceMetadata {
  capturedAt: string;
  sourceType: SourceType;
  sourceDescription: string;
  collectionMethod: string;
  stalenessHours: number;
}

export interface UseWithProvenanceResult<T> {
  data: T | null;
  provenance: ProvenanceMetadata | null;
  isLoading: boolean;
  error: Error | null;
}

interface SourceConfig {
  sourceType: SourceType;
  sourceDescription: string;
  collectionMethod: string;
}

export function useWithProvenance<T>(
  fetchFn: () => Promise<T>,
  sourceConfig: SourceConfig
): UseWithProvenanceResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [provenance, setProvenance] = useState<ProvenanceMetadata | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let isMounted = true;
    // Create new AbortController for this fetch
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    async function fetchData() {
      setIsLoading(true);
      setError(null);

      try {
        const capturedAt = new Date().toISOString();
        const result = await fetchFn();

        // Check if fetch was aborted or component unmounted
        if (signal.aborted || !isMounted) {
          return;
        }

        // Calculate staleness (will be 0 for fresh data)
        const stalenessHours = 0;

        const provenanceData: ProvenanceMetadata = {
          capturedAt,
          sourceType: sourceConfig.sourceType,
          sourceDescription: sourceConfig.sourceDescription,
          collectionMethod: sourceConfig.collectionMethod,
          stalenessHours
        };

        if (isMounted) {
          setData(result);
          setProvenance(provenanceData);
        }
      } catch (err) {
        if (signal.aborted || !isMounted) {
          return;
        }
        const error = err instanceof Error ? err : new Error('Unknown error occurred');
        if (isMounted) {
          setError(error);
          setData(null);
          setProvenance(null);
        }
      } finally {
        if (!signal.aborted && isMounted) {
          setIsLoading(false);
        }
      }
    }

    fetchData();

    // Cleanup function
    return () => {
      isMounted = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFn, sourceConfig.sourceType, sourceConfig.sourceDescription, sourceConfig.collectionMethod]);

  return { data, provenance, isLoading, error };
}

