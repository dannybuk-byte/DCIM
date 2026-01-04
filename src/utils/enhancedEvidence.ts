/**
 * Enhanced Evidence Layer
 * 
 * Wraps the existing evidenceIntegrity.ts with additional capabilities:
 * - Merkle tree chaining
 * - OpenTimestamps anchoring
 * - Content-addressed storage (CID generation)
 * 
 * Design principles:
 * 1. ADDITIVE ONLY - Never modifies existing evidence packages
 * 2. GRACEFUL DEGRADATION - Enhancements fail silently
 * 3. FEATURE FLAGGED - Each capability can be disabled
 * 4. BACKWARD COMPATIBLE - Works with existing evidence
 * 
 * The existing evidenceIntegrity.ts remains the source of truth.
 * This layer adds optional enhancements on top.
 */

import {
  EvidencePackage,
  createEvidencePackage,
  verifyIntegrity,
} from './evidenceIntegrity';
import { addToMerkleTree, generateMerkleProof, MerkleProof } from './merkleEvidence';
import { requestTimestamp, getTimestampProof, TimestampProof } from './openTimestamps';
import { checkFeature, loadFeatureFlags } from '../config/featureFlags';
import { trackError } from './errorTracking';
import type { Facility } from '../types';

export interface EnhancedEvidencePackage extends EvidencePackage {
  // Enhanced metadata (all optional - added when features enabled)
  merkle?: {
    treeRoot: string;
    leafIndex: number;
    proofGenerated: boolean;
  };
  timestamp?: {
    requested: boolean;
    calendarUrl?: string;
    pending: boolean;
  };
  cid?: {
    v1: string; // CIDv1 content identifier
    codec: string;
  };
}

export interface EvidenceEnhancements {
  merkleProof: MerkleProof | null;
  timestampProof: TimestampProof | null;
  cid: string | null;
}

/**
 * Generate CIDv1-style content identifier
 * Uses SHA-256 with multicodec/multibase encoding
 * Note: This is a simplified CID for local use, not full IPFS CID
 */
async function generateContentId(data: unknown): Promise<string> {
  try {
    const json = JSON.stringify(data, Object.keys(data as object).sort());
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(json));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // Simplified CIDv1 format: base32 encoding with sha2-256 prefix
    // Format: b<base32-encoded-multihash>
    // Multihash: <hash-function><digest-length><digest>
    // sha2-256 = 0x12, length = 0x20 (32 bytes)
    const multihash = [0x12, 0x20, ...hashArray];
    
    // Base32 encode (simplified - using hex for readability)
    const cidHex = 'bafy' + multihash.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return cidHex;
  } catch {
    return '';
  }
}

/**
 * Create evidence package with enhancements
 * 
 * This wraps the existing createEvidencePackage and adds:
 * - Merkle tree insertion
 * - Timestamp request
 * - Content ID generation
 * 
 * All enhancements are non-blocking and fail silently.
 */
export async function createEnhancedEvidencePackage(
  facilityData: Partial<Facility>,
  sourceUrls: string[],
  collectionMethod: 'automated' | 'manual' | 'osint' = 'automated'
): Promise<EnhancedEvidencePackage> {
  // First, create the base evidence package (existing functionality)
  const basePackage = await createEvidencePackage(facilityData, sourceUrls, collectionMethod);
  
  // Enhance with additional features (all optional, non-blocking)
  const enhanced: EnhancedEvidencePackage = { ...basePackage };
  
  // Load feature flags once
  await loadFeatureFlags();
  
  // Run enhancements in parallel for speed
  const enhancements = await Promise.allSettled([
    // Merkle tree
    (async () => {
      if (await checkFeature('merkleTreeEvidence')) {
        await addToMerkleTree(basePackage.evidenceId, basePackage.dataHash);
        const proof = await generateMerkleProof(basePackage.evidenceId);
        if (proof) {
          enhanced.merkle = {
            treeRoot: proof.root,
            leafIndex: -1, // Will be determined by tree
            proofGenerated: true,
          };
        }
      }
    })(),
    
    // OpenTimestamps
    (async () => {
      if (await checkFeature('openTimestamps')) {
        const timestamp = await requestTimestamp(basePackage.evidenceId, basePackage.dataHash);
        enhanced.timestamp = {
          requested: true,
          calendarUrl: timestamp?.calendarUrl,
          pending: timestamp?.pending ?? true,
        };
      }
    })(),
    
    // Content-addressed storage
    (async () => {
      if (await checkFeature('contentAddressedStorage')) {
        const cid = await generateContentId(basePackage);
        if (cid) {
          enhanced.cid = {
            v1: cid,
            codec: 'dag-json',
          };
        }
      }
    })(),
  ]);
  
  // Log any enhancement failures (but don't throw)
  enhancements.forEach((result, index) => {
    if (result.status === 'rejected') {
      const featureNames = ['merkleTree', 'openTimestamps', 'contentAddressed'];
      console.warn(`[EnhancedEvidence] ${featureNames[index]} enhancement failed:`, result.reason);
    }
  });
  
  return enhanced;
}

/**
 * Get all enhancements for an existing evidence package
 */
export async function getEvidenceEnhancements(evidenceId: string): Promise<EvidenceEnhancements> {
  const [merkleProof, timestampProof] = await Promise.all([
    generateMerkleProof(evidenceId),
    getTimestampProof(evidenceId),
  ]);
  
  return {
    merkleProof,
    timestampProof,
    cid: null, // CID is embedded in package, not stored separately
  };
}

/**
 * Verify enhanced evidence package
 * Checks base integrity + all enabled enhancements
 */
export async function verifyEnhancedEvidence(
  evidence: EnhancedEvidencePackage
): Promise<{
  baseValid: boolean;
  merkleValid: boolean | null;
  timestampValid: boolean | null;
  cidValid: boolean | null;
  overallValid: boolean;
}> {
  try {
    // Base verification (existing system)
    const baseResult = await verifyIntegrity(evidence);
    const baseValid = baseResult.isValid;
    
    // Merkle verification
    let merkleValid: boolean | null = null;
    if (evidence.merkle?.proofGenerated) {
      const proof = await generateMerkleProof(evidence.evidenceId);
      if (proof) {
        merkleValid = proof.verified && proof.root === evidence.merkle.treeRoot;
      }
    }
    
    // Timestamp verification (check proof exists and matches)
    let timestampValid: boolean | null = null;
    if (evidence.timestamp?.requested) {
      const proof = await getTimestampProof(evidence.evidenceId);
      timestampValid = proof !== null && proof.hash === evidence.dataHash;
    }
    
    // CID verification
    let cidValid: boolean | null = null;
    if (evidence.cid?.v1) {
      const computedCid = await generateContentId(evidence);
      cidValid = computedCid === evidence.cid.v1;
    }
    
    // Overall: base must be valid, enhancements must be valid if present
    const overallValid = baseValid 
      && (merkleValid === null || merkleValid)
      && (timestampValid === null || timestampValid)
      && (cidValid === null || cidValid);
    
    return {
      baseValid,
      merkleValid,
      timestampValid,
      cidValid,
      overallValid,
    };
  } catch (error) {
    trackError(error instanceof Error ? error : new Error(String(error)), {
      context: 'enhancedEvidence.verify',
      evidenceId: evidence.evidenceId,
    });
    
    return {
      baseValid: false,
      merkleValid: null,
      timestampValid: null,
      cidValid: null,
      overallValid: false,
    };
  }
}

/**
 * Export evidence with all proofs for external verification
 */
export async function exportEvidenceWithProofs(
  evidence: EnhancedEvidencePackage
): Promise<{
  evidence: EnhancedEvidencePackage;
  merkleProof: MerkleProof | null;
  timestampProof: TimestampProof | null;
  exportedAt: string;
  exportFormat: string;
}> {
  const enhancements = await getEvidenceEnhancements(evidence.evidenceId);
  
  return {
    evidence,
    merkleProof: enhancements.merkleProof,
    timestampProof: enhancements.timestampProof,
    exportedAt: new Date().toISOString(),
    exportFormat: 'dcim-evidence-v2',
  };
}

/**
 * Get enhancement status summary for UI
 */
export async function getEnhancementStatus(): Promise<{
  merkleTree: { enabled: boolean; nodeCount: number };
  openTimestamps: { enabled: boolean; proofCount: number; pendingCount: number };
  contentAddressed: { enabled: boolean };
}> {
  const flags = await loadFeatureFlags();
  
  // Import dynamically to avoid circular dependencies
  const { getMerkleTreeStats } = await import('./merkleEvidence');
  const { getTimestampStats } = await import('./openTimestamps');
  
  const [merkleStats, timestampStats] = await Promise.all([
    getMerkleTreeStats(),
    getTimestampStats(),
  ]);
  
  return {
    merkleTree: {
      enabled: flags.merkleTreeEvidence,
      nodeCount: merkleStats?.nodeCount ?? 0,
    },
    openTimestamps: {
      enabled: flags.openTimestamps,
      proofCount: timestampStats.totalProofs,
      pendingCount: timestampStats.pendingCount,
    },
    contentAddressed: {
      enabled: flags.contentAddressedStorage,
    },
  };
}

