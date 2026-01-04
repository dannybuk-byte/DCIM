/**
 * React Hook for Evidence Integrity Management
 * 
 * Provides a clean interface for creating, verifying, and managing
 * evidence packages in React components.
 */

import { useState, useCallback } from 'react';
import {
  EvidencePackage,
  VerificationResult,
  createEvidencePackage,
  verifyIntegrity,
  exportEvidenceChain,
} from '../utils/evidenceIntegrity';
import { Facility } from '../types';

interface UseEvidenceReturn {
  packages: EvidencePackage[];
  createPackage: (
    facilityData: Partial<Facility>,
    sourceUrls: string[],
    collectionMethod?: 'automated' | 'manual' | 'osint'
  ) => Promise<EvidencePackage>;
  verifyPackage: (evidence: EvidencePackage) => Promise<VerificationResult>;
  exportPackages: (evidenceIds?: string[]) => void;
  clearPackages: () => void;
  removePackage: (evidenceId: string) => void;
  getPackage: (evidenceId: string) => EvidencePackage | undefined;
  packageCount: number;
}

/**
 * Hook for managing evidence packages
 * Stores packages in React state (not persisted to IndexedDB by default)
 */
export const useEvidence = (): UseEvidenceReturn => {
  const [packages, setPackages] = useState<EvidencePackage[]>([]);

  const createPackage = useCallback(
    async (
      facilityData: Partial<Facility>,
      sourceUrls: string[],
      collectionMethod: 'automated' | 'manual' | 'osint' = 'automated'
    ): Promise<EvidencePackage> => {
      const evidence = await createEvidencePackage(
        facilityData,
        sourceUrls,
        collectionMethod
      );
      
      setPackages(prev => [...prev, evidence]);
      
      return evidence;
    },
    []
  );

  const verifyPackage = useCallback(
    async (evidence: EvidencePackage): Promise<VerificationResult> => {
      return await verifyIntegrity(evidence);
    },
    []
  );

  const exportPackages = useCallback(
    (evidenceIds?: string[]) => {
      const toExport = evidenceIds
        ? packages.filter(pkg => evidenceIds.includes(pkg.evidenceId))
        : packages;
      
      if (toExport.length === 0) {
        console.warn('[useEvidence] No packages to export');
        return;
      }
      
      exportEvidenceChain(toExport);
    },
    [packages]
  );

  const clearPackages = useCallback(() => {
    setPackages([]);
  }, []);

  const removePackage = useCallback((evidenceId: string) => {
    setPackages(prev => prev.filter(pkg => pkg.evidenceId !== evidenceId));
  }, []);

  const getPackage = useCallback(
    (evidenceId: string) => {
      return packages.find(pkg => pkg.evidenceId === evidenceId);
    },
    [packages]
  );

  return {
    packages,
    createPackage,
    verifyPackage,
    exportPackages,
    clearPackages,
    removePackage,
    getPackage,
    packageCount: packages.length,
  };
};

