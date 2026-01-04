/**
 * OpenTimestamps Integration
 * 
 * Creates Bitcoin-anchored timestamps proving evidence existed at a specific time.
 * Uses free public calendar servers (no cryptocurrency required).
 * 
 * How it works:
 * 1. Hash evidence → Submit to calendar servers
 * 2. Servers batch hashes → Anchor to Bitcoin blockchain
 * 3. Retrieve proof (.ots file) → Store with evidence
 * 
 * Antifragile patterns:
 * - Network failures don't block evidence collection
 * - Proofs stored separately (enhancement layer)
 * - Multiple calendar servers for redundancy
 * - Local pending queue for retry
 */

import { checkFeature } from '../config/featureFlags';
import { db } from '../db/database';
import { trackError } from './errorTracking';

// Public OpenTimestamps calendar servers (free, no auth required)
const CALENDAR_SERVERS = [
  'https://a.pool.opentimestamps.org',
  'https://b.pool.opentimestamps.org',
  'https://a.pool.eternitywall.com',
  'https://ots.btc.catallaxy.com',
];

export interface TimestampRequest {
  evidenceId: string;
  hash: string;           // SHA-256 hex
  requestedAt: string;    // ISO timestamp
  calendarUrl: string;
}

export interface TimestampProof {
  evidenceId: string;
  hash: string;
  requestedAt: string;
  confirmedAt?: string;   // When Bitcoin block confirmed
  calendarUrl: string;
  commitment: string;     // Calendar server commitment
  pending: boolean;       // True until Bitcoin confirmation
  blockHeight?: number;
  txId?: string;
  otsProof?: string;      // Base64 encoded .ots proof file
}

export interface PendingTimestamp {
  id: string;
  evidenceId: string;
  hash: string;
  requestedAt: string;
  retryCount: number;
  lastRetryAt?: string;
  error?: string;
}

const TIMESTAMPS_KEY = 'evidence_timestamps';
const PENDING_KEY = 'pending_timestamps';

/**
 * Submit hash to a calendar server
 * Returns commitment or null on failure
 */
async function submitToCalendar(hash: string, calendarUrl: string): Promise<string | null> {
  try {
    // Convert hex hash to bytes
    const hashBytes = new Uint8Array(
      hash.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) ?? []
    );
    
    const response = await fetch(`${calendarUrl}/digest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/vnd.opentimestamps.v1',
      },
      body: hashBytes,
      signal: AbortSignal.timeout(10000), // 10s timeout
    });
    
    if (!response.ok) {
      return null;
    }
    
    // Calendar returns binary OTS data
    const otsData = await response.arrayBuffer();
    const commitment = btoa(String.fromCharCode(...new Uint8Array(otsData)));
    
    return commitment;
  } catch (error) {
    // Network error - expected, handled gracefully
    return null;
  }
}

/**
 * Try multiple calendar servers for redundancy
 */
async function submitToCalendars(hash: string): Promise<{ calendarUrl: string; commitment: string } | null> {
  // Try servers in random order for load distribution
  const shuffled = [...CALENDAR_SERVERS].sort(() => Math.random() - 0.5);
  
  for (const calendarUrl of shuffled) {
    const commitment = await submitToCalendar(hash, calendarUrl);
    if (commitment) {
      return { calendarUrl, commitment };
    }
  }
  
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// Public API (with feature flag checks and error handling)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Request a timestamp for evidence hash
 * Non-blocking - queues for background processing if network unavailable
 */
export async function requestTimestamp(evidenceId: string, hash: string): Promise<TimestampProof | null> {
  try {
    const enabled = await checkFeature('openTimestamps');
    if (!enabled) return null;
    
    const requestedAt = new Date().toISOString();
    
    // Try to submit to calendar servers
    const result = await submitToCalendars(hash);
    
    if (result) {
      const proof: TimestampProof = {
        evidenceId,
        hash,
        requestedAt,
        calendarUrl: result.calendarUrl,
        commitment: result.commitment,
        pending: true, // Until Bitcoin confirmation
      };
      
      // Store proof
      await storeTimestampProof(proof);
      
      console.log(`[OpenTimestamps] Submitted ${evidenceId.slice(0, 8)}... to ${result.calendarUrl}`);
      return proof;
    } else {
      // Network unavailable - queue for later
      await queuePendingTimestamp(evidenceId, hash, requestedAt);
      console.log(`[OpenTimestamps] Queued ${evidenceId.slice(0, 8)}... for later (network unavailable)`);
      return null;
    }
  } catch (error) {
    console.warn('[OpenTimestamps] Failed to request timestamp:', error);
    trackError(error instanceof Error ? error : new Error(String(error)), {
      context: 'openTimestamps.requestTimestamp',
      evidenceId,
    });
    return null;
  }
}

/**
 * Store timestamp proof
 */
async function storeTimestampProof(proof: TimestampProof): Promise<void> {
  try {
    const stored = await db.settings.get(TIMESTAMPS_KEY);
    const proofs: TimestampProof[] = (stored?.value as TimestampProof[]) || [];
    
    // Update or add
    const index = proofs.findIndex(p => p.evidenceId === proof.evidenceId);
    if (index >= 0) {
      proofs[index] = proof;
    } else {
      proofs.push(proof);
    }
    
    await db.settings.put({ key: TIMESTAMPS_KEY, value: proofs });
  } catch (error) {
    console.warn('[OpenTimestamps] Failed to store proof:', error);
  }
}

/**
 * Queue failed timestamp for retry
 */
async function queuePendingTimestamp(evidenceId: string, hash: string, requestedAt: string): Promise<void> {
  try {
    const stored = await db.settings.get(PENDING_KEY);
    const pending: PendingTimestamp[] = (stored?.value as PendingTimestamp[]) || [];
    
    // Don't duplicate
    if (pending.some(p => p.evidenceId === evidenceId)) return;
    
    pending.push({
      id: crypto.randomUUID(),
      evidenceId,
      hash,
      requestedAt,
      retryCount: 0,
    });
    
    await db.settings.put({ key: PENDING_KEY, value: pending });
  } catch (error) {
    console.warn('[OpenTimestamps] Failed to queue pending:', error);
  }
}

/**
 * Get timestamp proof for evidence
 */
export async function getTimestampProof(evidenceId: string): Promise<TimestampProof | null> {
  try {
    const enabled = await checkFeature('openTimestamps');
    if (!enabled) return null;
    
    const stored = await db.settings.get(TIMESTAMPS_KEY);
    const proofs: TimestampProof[] = (stored?.value as TimestampProof[]) || [];
    
    return proofs.find(p => p.evidenceId === evidenceId) ?? null;
  } catch (error) {
    console.warn('[OpenTimestamps] Failed to get proof:', error);
    return null;
  }
}

/**
 * Retry pending timestamps (call periodically or on reconnect)
 */
export async function retryPendingTimestamps(): Promise<number> {
  try {
    const enabled = await checkFeature('openTimestamps');
    if (!enabled) return 0;
    
    const stored = await db.settings.get(PENDING_KEY);
    const pending: PendingTimestamp[] = (stored?.value as PendingTimestamp[]) || [];
    
    if (pending.length === 0) return 0;
    
    let succeeded = 0;
    const remaining: PendingTimestamp[] = [];
    
    for (const item of pending) {
      // Max 5 retries
      if (item.retryCount >= 5) {
        item.error = 'Max retries exceeded';
        remaining.push(item);
        continue;
      }
      
      const result = await submitToCalendars(item.hash);
      
      if (result) {
        const proof: TimestampProof = {
          evidenceId: item.evidenceId,
          hash: item.hash,
          requestedAt: item.requestedAt,
          calendarUrl: result.calendarUrl,
          commitment: result.commitment,
          pending: true,
        };
        await storeTimestampProof(proof);
        succeeded++;
        console.log(`[OpenTimestamps] Retry succeeded for ${item.evidenceId.slice(0, 8)}...`);
      } else {
        item.retryCount++;
        item.lastRetryAt = new Date().toISOString();
        remaining.push(item);
      }
    }
    
    await db.settings.put({ key: PENDING_KEY, value: remaining });
    
    return succeeded;
  } catch (error) {
    console.warn('[OpenTimestamps] Failed to retry pending:', error);
    return 0;
  }
}

/**
 * Get timestamp statistics for UI
 */
export async function getTimestampStats(): Promise<{
  enabled: boolean;
  totalProofs: number;
  pendingCount: number;
  confirmedCount: number;
}> {
  try {
    const enabled = await checkFeature('openTimestamps');
    
    if (!enabled) {
      return { enabled: false, totalProofs: 0, pendingCount: 0, confirmedCount: 0 };
    }
    
    const proofsStored = await db.settings.get(TIMESTAMPS_KEY);
    const pendingStored = await db.settings.get(PENDING_KEY);
    
    const proofs: TimestampProof[] = (proofsStored?.value as TimestampProof[]) || [];
    const pending: PendingTimestamp[] = (pendingStored?.value as PendingTimestamp[]) || [];
    
    return {
      enabled: true,
      totalProofs: proofs.length,
      pendingCount: pending.length + proofs.filter(p => p.pending).length,
      confirmedCount: proofs.filter(p => !p.pending).length,
    };
  } catch {
    return { enabled: false, totalProofs: 0, pendingCount: 0, confirmedCount: 0 };
  }
}

/**
 * Export all timestamp proofs
 */
export async function exportTimestampProofs(): Promise<string | null> {
  try {
    const stored = await db.settings.get(TIMESTAMPS_KEY);
    const proofs = stored?.value || [];
    return JSON.stringify(proofs, null, 2);
  } catch {
    return null;
  }
}

