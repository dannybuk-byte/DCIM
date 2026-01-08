/**
 * FRE 902(14) Legal Evidence Chain Manager
 * 
 * Implements Federal Rules of Evidence 902(13) and 902(14) compliant
 * self-authenticating electronic evidence with proper certification.
 * 
 * Key Features:
 * - SHA-256 hashing via SubtleCrypto for tamper detection
 * - Complete chain of custody tracking
 * - Export format suitable for court submission
 * - Verification with detailed audit trail
 * 
 * @see https://www.law.cornell.edu/rules/fre/rule_902
 */

import { db } from '../db/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CustodyEntry {
  timestamp: string;           // ISO 8601
  action: 'CAPTURE' | 'ACCESS' | 'EXPORT' | 'VERIFY' | 'TRANSFER' | 'MODIFICATION_ATTEMPT';
  actor: string;               // Who performed the action
  previousHash: string;        // Hash before this action
  newHash: string;             // Hash after this action (same if read-only)
  systemInfo: string;          // Browser/system info
  notes?: string;              // Optional notes
}

export interface EvidenceRecord {
  id: string;
  dataHash: string;            // SHA-256 of the evidence data
  captureTimestamp: string;    // ISO 8601 when evidence was captured
  sourceIdentifier: string;    // e.g., 'SEC EDGAR', 'EPA ECHO', 'BGP RIPE'
  sourceUrl?: string;          // Original URL if applicable
  facilityId?: number;         // Related facility if applicable
  chainOfCustody: CustodyEntry[];
  metadata: {
    collector: string;         // Who collected the evidence
    method: 'automated' | 'manual' | 'osint' | 'api';
    systemInfo: string;
    contentType: string;       // MIME type
    contentLength: number;     // Size in bytes
    jurisdiction?: string;     // Legal jurisdiction
    caseReference?: string;    // Case/investigation reference
  };
  // The actual evidence data (stored separately for performance)
  dataRef?: string;            // Reference to blob storage
}

export interface VerificationReport {
  recordId: string;
  verified: boolean;
  timestamp: string;
  originalHash: string;
  currentHash: string;
  chainIntegrity: boolean;
  custodyEntries: number;
  discrepancies: string[];
  legalStatement: string;
}

export interface EvidenceExport {
  version: '1.0';
  exportTimestamp: string;
  exporter: string;
  records: EvidenceRecord[];
  verification: VerificationReport[];
  certification: {
    statement: string;
    fre902Compliance: boolean;
    hashAlgorithm: 'SHA-256';
    exportHash: string;
  };
}

// ============================================================================
// EVIDENCE MANAGER CLASS
// ============================================================================

class LegalEvidenceManager {
  private encoder = new TextEncoder();
  
  /**
   * Capture evidence with full chain of custody initialization
   */
  async captureEvidence(
    data: ArrayBuffer | string,
    source: string,
    collector: string,
    options: {
      sourceUrl?: string;
      facilityId?: number;
      contentType?: string;
      method?: 'automated' | 'manual' | 'osint' | 'api';
      jurisdiction?: string;
      caseReference?: string;
    } = {}
  ): Promise<EvidenceRecord> {
    // Convert string to ArrayBuffer if needed
    const dataBuffer = typeof data === 'string' 
      ? this.encoder.encode(data).buffer 
      : data;
    
    // Generate SHA-256 hash per FRE 902(14) requirements
    const dataHash = await this.generateHash(dataBuffer);
    const timestamp = new Date().toISOString();
    const systemInfo = this.getSystemInfo();
    
    const record: EvidenceRecord = {
      id: `ev_${crypto.randomUUID()}`,
      dataHash,
      captureTimestamp: timestamp,
      sourceIdentifier: source,
      sourceUrl: options.sourceUrl,
      facilityId: options.facilityId,
      chainOfCustody: [{
        timestamp,
        action: 'CAPTURE',
        actor: collector,
        previousHash: '',
        newHash: dataHash,
        systemInfo,
        notes: `Initial capture from ${source}`,
      }],
      metadata: {
        collector,
        method: options.method ?? 'automated',
        systemInfo,
        contentType: options.contentType ?? 'application/octet-stream',
        contentLength: dataBuffer.byteLength,
        jurisdiction: options.jurisdiction,
        caseReference: options.caseReference,
      },
    };

    // Persist to IndexedDB
    await this.persistRecord(record);
    
    // Store the actual data as a blob
    await this.storeDataBlob(record.id, dataBuffer);
    
    console.log(`[LegalEvidence] Captured evidence: ${record.id} from ${source}`);
    
    return record;
  }

  /**
   * Verify evidence integrity against stored hash
   */
  async verifyIntegrity(
    recordId: string, 
    currentData?: ArrayBuffer
  ): Promise<VerificationReport> {
    const record = await this.getRecord(recordId);
    const timestamp = new Date().toISOString();
    
    if (!record) {
      return {
        recordId,
        verified: false,
        timestamp,
        originalHash: '',
        currentHash: '',
        chainIntegrity: false,
        custodyEntries: 0,
        discrepancies: ['Record not found in evidence store'],
        legalStatement: 'VERIFICATION FAILED: Evidence record not found.',
      };
    }

    // If no data provided, retrieve from blob storage
    const dataToVerify = currentData ?? await this.retrieveDataBlob(recordId);
    
    if (!dataToVerify) {
      return {
        recordId,
        verified: false,
        timestamp,
        originalHash: record.dataHash,
        currentHash: '',
        chainIntegrity: false,
        custodyEntries: record.chainOfCustody.length,
        discrepancies: ['Evidence data blob not found'],
        legalStatement: 'VERIFICATION FAILED: Evidence data not retrievable.',
      };
    }

    const currentHash = await this.generateHash(dataToVerify);
    const hashMatch = currentHash === record.dataHash;
    const chainIntegrity = this.verifyChainIntegrity(record.chainOfCustody);
    
    const discrepancies: string[] = [];
    if (!hashMatch) {
      discrepancies.push(`Hash mismatch: expected ${record.dataHash}, computed ${currentHash}`);
    }
    if (!chainIntegrity) {
      discrepancies.push('Chain of custody integrity check failed');
    }

    // Log this verification in the chain
    await this.addCustodyEntry(recordId, {
      timestamp,
      action: 'VERIFY',
      actor: 'system',
      previousHash: record.dataHash,
      newHash: record.dataHash,
      systemInfo: this.getSystemInfo(),
      notes: hashMatch ? 'Verification successful' : 'Verification FAILED - hash mismatch',
    });

    const verified = hashMatch && chainIntegrity;
    
    return {
      recordId,
      verified,
      timestamp,
      originalHash: record.dataHash,
      currentHash,
      chainIntegrity,
      custodyEntries: record.chainOfCustody.length,
      discrepancies,
      legalStatement: verified
        ? `VERIFIED: Evidence integrity confirmed per FRE 902(14). Hash ${record.dataHash} verified at ${timestamp}. Chain of custody intact with ${record.chainOfCustody.length} entries.`
        : `VERIFICATION FAILED: Evidence integrity could not be confirmed. ${discrepancies.join('; ')}`,
    };
  }

  /**
   * Export evidence package for legal submission
   */
  async exportForCourt(
    recordIds: string[],
    exporter: string,
    caseReference?: string
  ): Promise<EvidenceExport> {
    const records: EvidenceRecord[] = [];
    const verifications: VerificationReport[] = [];
    
    for (const id of recordIds) {
      const record = await this.getRecord(id);
      if (record) {
        records.push(record);
        
        // Verify each record
        const verification = await this.verifyIntegrity(id);
        verifications.push(verification);
        
        // Log export in chain
        await this.addCustodyEntry(id, {
          timestamp: new Date().toISOString(),
          action: 'EXPORT',
          actor: exporter,
          previousHash: record.dataHash,
          newHash: record.dataHash,
          systemInfo: this.getSystemInfo(),
          notes: `Exported for legal submission${caseReference ? `: ${caseReference}` : ''}`,
        });
      }
    }

    const exportTimestamp = new Date().toISOString();
    const allVerified = verifications.every(v => v.verified);
    
    // Generate hash of the entire export package
    const exportContent = JSON.stringify({ records, verifications });
    const exportHash = await this.generateHash(this.encoder.encode(exportContent).buffer);

    const exportPackage: EvidenceExport = {
      version: '1.0',
      exportTimestamp,
      exporter,
      records,
      verification: verifications,
      certification: {
        statement: this.generateCertificationStatement(records.length, allVerified, exporter, exportTimestamp),
        fre902Compliance: allVerified,
        hashAlgorithm: 'SHA-256',
        exportHash,
      },
    };

    return exportPackage;
  }

  /**
   * Generate certification statement per FRE 902(14)
   */
  private generateCertificationStatement(
    recordCount: number, 
    allVerified: boolean,
    exporter: string,
    timestamp: string
  ): string {
    if (!allVerified) {
      return `CERTIFICATION CANNOT BE ISSUED: One or more evidence records failed integrity verification.`;
    }

    return `
CERTIFICATION OF AUTHENTICITY
Pursuant to Federal Rules of Evidence 902(14)

I, ${exporter}, certify under penalty of perjury that:

1. The ${recordCount} electronic record(s) attached hereto are true and accurate copies of 
   data captured and maintained by the DCIM Compliance Dashboard system.

2. Each record's SHA-256 cryptographic hash has been verified against the original 
   capture hash, confirming data integrity has been maintained.

3. A complete chain of custody has been maintained for each record from initial 
   capture through this export.

4. The electronic data was produced by an electronic process or system that produces 
   an accurate result, as certified by the system's integrity verification mechanisms.

5. This certification is made in accordance with 18 U.S.C. § 1746 and Federal Rules 
   of Evidence 902(13) and 902(14).

Generated: ${timestamp}
Hash Algorithm: SHA-256
Export Package Hash: [See certification.exportHash]

This certification accompanies the evidence package and should be maintained with it.
    `.trim();
  }

  /**
   * Add entry to chain of custody
   */
  async addCustodyEntry(recordId: string, entry: Omit<CustodyEntry, 'systemInfo'> & { systemInfo?: string }): Promise<void> {
    const record = await this.getRecord(recordId);
    if (!record) {
      throw new Error(`Evidence record not found: ${recordId}`);
    }

    const fullEntry: CustodyEntry = {
      ...entry,
      systemInfo: entry.systemInfo ?? this.getSystemInfo(),
    };

    record.chainOfCustody.push(fullEntry);
    await this.persistRecord(record);
  }

  /**
   * Get all evidence records
   */
  async getAllRecords(): Promise<EvidenceRecord[]> {
    try {
      const records = await db.table('evidenceRecords').toArray();
      return records;
    } catch {
      // Table might not exist yet
      return [];
    }
  }

  /**
   * Get single evidence record
   */
  async getRecord(recordId: string): Promise<EvidenceRecord | undefined> {
    try {
      return await db.table('evidenceRecords').get(recordId);
    } catch {
      return undefined;
    }
  }

  /**
   * Get records by source
   */
  async getRecordsBySource(source: string): Promise<EvidenceRecord[]> {
    try {
      return await db.table('evidenceRecords')
        .where('sourceIdentifier')
        .equals(source)
        .toArray();
    } catch {
      return [];
    }
  }

  /**
   * Get records by facility
   */
  async getRecordsByFacility(facilityId: number): Promise<EvidenceRecord[]> {
    try {
      return await db.table('evidenceRecords')
        .where('facilityId')
        .equals(facilityId)
        .toArray();
    } catch {
      return [];
    }
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  /**
   * Generate SHA-256 hash using SubtleCrypto
   */
  private async generateHash(data: ArrayBuffer): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verify chain of custody integrity
   */
  private verifyChainIntegrity(chain: CustodyEntry[]): boolean {
    if (chain.length === 0) return false;
    
    // First entry should have empty previousHash (it's the capture)
    if (chain[0].action !== 'CAPTURE') return false;
    
    // Each entry should reference the previous hash correctly
    for (let i = 1; i < chain.length; i++) {
      // For read-only operations, hashes should match
      if (['ACCESS', 'VERIFY', 'EXPORT'].includes(chain[i].action)) {
        if (chain[i].previousHash !== chain[i - 1].newHash) {
          return false;
        }
      }
    }
    
    return true;
  }

  /**
   * Get system info for audit trail
   */
  private getSystemInfo(): string {
    return `${navigator.userAgent} | ${new Date().toISOString()}`;
  }

  /**
   * Persist record to IndexedDB
   */
  private async persistRecord(record: EvidenceRecord): Promise<void> {
    await db.table('evidenceRecords').put(record);
  }

  /**
   * Store data blob
   */
  private async storeDataBlob(recordId: string, data: ArrayBuffer): Promise<void> {
    await db.table('evidenceBlobs').put({
      id: recordId,
      data: new Blob([data]),
      storedAt: new Date().toISOString(),
    });
  }

  /**
   * Retrieve data blob
   */
  private async retrieveDataBlob(recordId: string): Promise<ArrayBuffer | null> {
    try {
      const blob = await db.table('evidenceBlobs').get(recordId);
      if (blob?.data) {
        return await blob.data.arrayBuffer();
      }
      return null;
    } catch {
      return null;
    }
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const legalEvidenceManager = new LegalEvidenceManager();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

export function useLegalEvidence() {
  const [records, setRecords] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const allRecords = await legalEvidenceManager.getAllRecords();
    setRecords(allRecords);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const capture = useCallback(async (
    data: ArrayBuffer | string,
    source: string,
    collector: string,
    options?: Parameters<typeof legalEvidenceManager.captureEvidence>[3]
  ) => {
    const record = await legalEvidenceManager.captureEvidence(data, source, collector, options);
    await refresh();
    return record;
  }, [refresh]);

  const verify = useCallback(async (recordId: string, currentData?: ArrayBuffer) => {
    return await legalEvidenceManager.verifyIntegrity(recordId, currentData);
  }, []);

  const exportForCourt = useCallback(async (
    recordIds: string[],
    exporter: string,
    caseReference?: string
  ) => {
    return await legalEvidenceManager.exportForCourt(recordIds, exporter, caseReference);
  }, []);

  const getByFacility = useCallback(async (facilityId: number) => {
    return await legalEvidenceManager.getRecordsByFacility(facilityId);
  }, []);

  const getBySource = useCallback(async (source: string) => {
    return await legalEvidenceManager.getRecordsBySource(source);
  }, []);

  return {
    records,
    loading,
    refresh,
    capture,
    verify,
    exportForCourt,
    getByFacility,
    getBySource,
    recordCount: records.length,
  };
}
