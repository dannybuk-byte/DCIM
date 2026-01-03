/**
 * Evidence Integrity Layer - FRE 902(13)-(14) Compliance
 * 
 * Implements cryptographic verification for evidence chains suitable for
 * federal court submission under Federal Rules of Evidence 902(13)-(14).
 * 
 * All operations use browser-native Web Crypto API (no external dependencies).
 */

import { Facility } from '../types';

export interface EvidenceMetadata {
  userAgent: string;
  timezone: string;
  screenResolution: string;
  pageUrl: string;
  timestamp: string;
}

export interface ChainOfCustody {
  collectedBy: 'system' | 'user';
  collectedAt: string;
  verifiedAt?: string;
  exportedAt?: string;
  modifications: string[];
}

export interface EvidencePackage {
  evidenceId: string;
  facilityId: number;
  facilityName: string;
  collectedAt: string; // ISO 8601
  dataHash: string; // SHA-256 hex string
  sourceUrls: string[];
  collectionMethod: 'automated' | 'manual' | 'osint';
  data: Partial<Facility>;
  metadata: EvidenceMetadata;
  chainOfCustody: ChainOfCustody;
}

export interface VerificationResult {
  isValid: boolean;
  originalHash: string;
  computedHash: string;
  discrepancies: string[];
  verifiedAt: string;
}

/**
 * Generate a unique evidence ID using Web Crypto API
 * Format: 32-character hex string
 */
export const generateEvidenceId = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Hash data using SHA-256 via Web Crypto API
 * Returns hex string representation
 */
export const hashEvidence = async (data: unknown): Promise<string> => {
  // Normalize data to ensure consistent hashing
  const normalized = JSON.stringify(data, Object.keys(data as object).sort());
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(normalized);
  
  // Hash using SHA-256
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  
  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
};

/**
 * Capture browser metadata for provenance tracking
 */
export const captureMetadata = (): EvidenceMetadata => {
  return {
    userAgent: navigator.userAgent,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    pageUrl: window.location.href,
    timestamp: new Date().toISOString()
  };
};

/**
 * Create a complete evidence package with hash and metadata
 */
export const createEvidencePackage = async (
  facilityData: Partial<Facility>,
  sourceUrls: string[],
  collectionMethod: 'automated' | 'manual' | 'osint' = 'automated'
): Promise<EvidencePackage> => {
  const evidenceId = generateEvidenceId();
  const collectedAt = new Date().toISOString();
  const metadata = captureMetadata();
  
  // Create the data object to hash (excluding the hash itself)
  const dataToHash = {
    facilityData,
    sourceUrls,
    collectionMethod,
    collectedAt,
    metadata
  };
  
  const dataHash = await hashEvidence(dataToHash);
  
  const chainOfCustody: ChainOfCustody = {
    collectedBy: collectionMethod === 'manual' ? 'user' : 'system',
    collectedAt,
    modifications: []
  };
  
  return {
    evidenceId,
    facilityId: facilityData.id || 0,
    facilityName: facilityData.name || 'Unknown',
    collectedAt,
    dataHash,
    sourceUrls,
    collectionMethod,
    data: facilityData,
    metadata,
    chainOfCustody
  };
};

/**
 * Verify integrity by recomputing hash and comparing
 */
export const verifyIntegrity = async (
  evidence: EvidencePackage
): Promise<VerificationResult> => {
  const discrepancies: string[] = [];
  
  // Reconstruct the original data object
  const dataToHash = {
    facilityData: evidence.data,
    sourceUrls: evidence.sourceUrls,
    collectionMethod: evidence.collectionMethod,
    collectedAt: evidence.collectedAt,
    metadata: evidence.metadata
  };
  
  // Recompute hash
  const computedHash = await hashEvidence(dataToHash);
  const isValid = computedHash === evidence.dataHash;
  
  if (!isValid) {
    discrepancies.push('Hash mismatch detected - data may have been tampered with');
  }
  
  // Additional integrity checks
  if (!evidence.evidenceId || evidence.evidenceId.length !== 32) {
    discrepancies.push('Invalid evidence ID format');
  }
  
  if (!evidence.collectedAt || isNaN(Date.parse(evidence.collectedAt))) {
    discrepancies.push('Invalid collection timestamp');
  }
  
  if (!evidence.metadata || !evidence.metadata.userAgent) {
    discrepancies.push('Missing metadata');
  }
  
  return {
    isValid,
    originalHash: evidence.dataHash,
    computedHash,
    discrepancies,
    verifiedAt: new Date().toISOString()
  };
};

/**
 * Export evidence chain as JSON for legal submission
 * Downloads as file with timestamp
 */
export const exportEvidenceChain = (
  evidence: EvidencePackage | EvidencePackage[]
): void => {
  const packages = Array.isArray(evidence) ? evidence : [evidence];
  
  const exportData = {
    exportedAt: new Date().toISOString(),
    version: '1.0',
    format: 'FRE-902-13-14',
    packageCount: packages.length,
    packages: packages.map(pkg => ({
      ...pkg,
      chainOfCustody: {
        ...pkg.chainOfCustody,
        exportedAt: new Date().toISOString()
      }
    }))
  };
  
  const jsonString = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = `evidence-chain-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Truncate hash for display purposes
 */
export const truncateHash = (hash: string, length = 16): string => {
  if (hash.length <= length) return hash;
  const halfLength = Math.floor(length / 2);
  return `${hash.slice(0, halfLength)}...${hash.slice(-halfLength)}`;
};

/**
 * Validate evidence package structure
 */
export const isValidEvidencePackage = (obj: unknown): obj is EvidencePackage => {
  if (!obj || typeof obj !== 'object') return false;
  
  const pkg = obj as Partial<EvidencePackage>;
  
  return !!(
    pkg.evidenceId &&
    pkg.facilityId !== undefined &&
    pkg.collectedAt &&
    pkg.dataHash &&
    pkg.sourceUrls &&
    pkg.collectionMethod &&
    pkg.data &&
    pkg.metadata &&
    pkg.chainOfCustody
  );
};

