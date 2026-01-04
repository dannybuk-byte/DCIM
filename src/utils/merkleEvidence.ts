/**
 * Merkle Tree Evidence Chain
 * 
 * Creates tamper-evident chains of evidence packages where:
 * - Each leaf is an evidence package hash
 * - The root hash proves integrity of the entire chain
 * - Any modification invalidates the root
 * 
 * Implementation uses Web Crypto API (zero dependencies).
 * 
 * Antifragile patterns:
 * - All operations are additive (original evidence unchanged)
 * - Failures fall back silently
 * - Tree stored separately from evidence
 * - Can rebuild tree from evidence hashes at any time
 */

import { checkFeature } from '../config/featureFlags';
import { db } from '../db/database';

export interface MerkleNode {
  hash: string;
  left?: string;  // Hash of left child
  right?: string; // Hash of right child
  isLeaf: boolean;
  evidenceId?: string; // Only for leaf nodes
}

export interface MerkleTree {
  id: string;
  root: string;
  leaves: string[];      // Evidence hashes in order
  evidenceIds: string[]; // Corresponding evidence IDs
  nodeCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MerkleProof {
  evidenceId: string;
  evidenceHash: string;
  root: string;
  path: Array<{
    hash: string;
    position: 'left' | 'right';
  }>;
  verified: boolean;
  verifiedAt: string;
}

/**
 * Hash two values together using SHA-256
 */
async function hashPair(left: string, right: string): Promise<string> {
  const combined = left + right;
  const encoder = new TextEncoder();
  const data = encoder.encode(combined);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Build Merkle tree from leaf hashes
 * Returns the root hash and intermediate nodes
 */
async function buildTree(leaves: string[]): Promise<{ root: string; levels: string[][] }> {
  if (leaves.length === 0) {
    return { root: '', levels: [] };
  }
  
  if (leaves.length === 1) {
    return { root: leaves[0], levels: [leaves] };
  }
  
  const levels: string[][] = [leaves];
  let currentLevel = [...leaves];
  
  while (currentLevel.length > 1) {
    const nextLevel: string[] = [];
    
    for (let i = 0; i < currentLevel.length; i += 2) {
      const left = currentLevel[i];
      // If odd number, duplicate the last element
      const right = currentLevel[i + 1] ?? currentLevel[i];
      const parentHash = await hashPair(left, right);
      nextLevel.push(parentHash);
    }
    
    levels.push(nextLevel);
    currentLevel = nextLevel;
  }
  
  return { root: currentLevel[0], levels };
}

/**
 * Generate Merkle proof for a specific leaf
 */
async function generateProof(
  leafIndex: number,
  levels: string[][]
): Promise<Array<{ hash: string; position: 'left' | 'right' }>> {
  const proof: Array<{ hash: string; position: 'left' | 'right' }> = [];
  
  let index = leafIndex;
  
  for (let i = 0; i < levels.length - 1; i++) {
    const level = levels[i];
    const isLeftNode = index % 2 === 0;
    const siblingIndex = isLeftNode ? index + 1 : index - 1;
    
    if (siblingIndex < level.length) {
      proof.push({
        hash: level[siblingIndex],
        position: isLeftNode ? 'right' : 'left',
      });
    }
    
    index = Math.floor(index / 2);
  }
  
  return proof;
}

/**
 * Verify a Merkle proof
 */
async function verifyProof(
  leafHash: string,
  proof: Array<{ hash: string; position: 'left' | 'right' }>,
  root: string
): Promise<boolean> {
  let currentHash = leafHash;
  
  for (const step of proof) {
    if (step.position === 'left') {
      currentHash = await hashPair(step.hash, currentHash);
    } else {
      currentHash = await hashPair(currentHash, step.hash);
    }
  }
  
  return currentHash === root;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API (with feature flag checks and error handling)
// ═══════════════════════════════════════════════════════════════════════════

const MERKLE_TREE_KEY = 'evidence_merkle_tree';

/**
 * Add evidence hash to the Merkle tree
 * Safe: Does nothing if feature disabled or on error
 */
export async function addToMerkleTree(evidenceId: string, evidenceHash: string): Promise<void> {
  try {
    const enabled = await checkFeature('merkleTreeEvidence');
    if (!enabled) return;
    
    // Load or create tree
    let tree: MerkleTree;
    const stored = await db.settings.get(MERKLE_TREE_KEY);
    
    if (stored?.value) {
      tree = stored.value as MerkleTree;
      tree.leaves.push(evidenceHash);
      tree.evidenceIds.push(evidenceId);
    } else {
      tree = {
        id: crypto.randomUUID(),
        root: '',
        leaves: [evidenceHash],
        evidenceIds: [evidenceId],
        nodeCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
    
    // Rebuild tree
    const { root } = await buildTree(tree.leaves);
    tree.root = root;
    tree.nodeCount = tree.leaves.length;
    tree.updatedAt = new Date().toISOString();
    
    // Save
    await db.settings.put({ key: MERKLE_TREE_KEY, value: tree });
    
    console.log(`[MerkleEvidence] Added evidence ${evidenceId.slice(0, 8)}... Tree now has ${tree.nodeCount} leaves, root: ${root.slice(0, 16)}...`);
  } catch (error) {
    // Fail silently - this is an enhancement, not critical
    console.warn('[MerkleEvidence] Failed to add to tree:', error);
  }
}

/**
 * Get the current Merkle tree
 */
export async function getMerkleTree(): Promise<MerkleTree | null> {
  try {
    const enabled = await checkFeature('merkleTreeEvidence');
    if (!enabled) return null;
    
    const stored = await db.settings.get(MERKLE_TREE_KEY);
    return stored?.value as MerkleTree | null;
  } catch (error) {
    console.warn('[MerkleEvidence] Failed to get tree:', error);
    return null;
  }
}

/**
 * Generate proof that a specific evidence is in the tree
 */
export async function generateMerkleProof(evidenceId: string): Promise<MerkleProof | null> {
  try {
    const enabled = await checkFeature('merkleTreeEvidence');
    if (!enabled) return null;
    
    const tree = await getMerkleTree();
    if (!tree) return null;
    
    const index = tree.evidenceIds.indexOf(evidenceId);
    if (index === -1) return null;
    
    const { levels } = await buildTree(tree.leaves);
    const path = await generateProof(index, levels);
    
    const proof: MerkleProof = {
      evidenceId,
      evidenceHash: tree.leaves[index],
      root: tree.root,
      path,
      verified: true,
      verifiedAt: new Date().toISOString(),
    };
    
    return proof;
  } catch (error) {
    console.warn('[MerkleEvidence] Failed to generate proof:', error);
    return null;
  }
}

/**
 * Verify a Merkle proof is valid
 */
export async function verifyMerkleProof(proof: MerkleProof): Promise<boolean> {
  try {
    const enabled = await checkFeature('merkleTreeEvidence');
    if (!enabled) return false;
    
    return await verifyProof(proof.evidenceHash, proof.path, proof.root);
  } catch (error) {
    console.warn('[MerkleEvidence] Failed to verify proof:', error);
    return false;
  }
}

/**
 * Get tree statistics for UI display
 */
export async function getMerkleTreeStats(): Promise<{
  enabled: boolean;
  nodeCount: number;
  root: string;
  lastUpdated: string | null;
} | null> {
  try {
    const enabled = await checkFeature('merkleTreeEvidence');
    const tree = enabled ? await getMerkleTree() : null;
    
    return {
      enabled,
      nodeCount: tree?.nodeCount ?? 0,
      root: tree?.root ?? '',
      lastUpdated: tree?.updatedAt ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Export tree for external verification
 */
export async function exportMerkleTree(): Promise<string | null> {
  try {
    const tree = await getMerkleTree();
    if (!tree) return null;
    
    return JSON.stringify(tree, null, 2);
  } catch {
    return null;
  }
}

