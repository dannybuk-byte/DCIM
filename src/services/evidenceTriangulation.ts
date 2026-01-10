/**
 * Evidence Triangulation Service
 * 
 * Cross-references claims across multiple authoritative sources
 * to verify accuracy and detect inconsistencies. Based on:
 * - Episode #740: Networks of Networks verification patterns
 * - Good Jobs First methodology for subsidy verification
 * 
 * Sources and Weights:
 * - SEC EDGAR (40%) - Financial filings, ownership, compensation
 * - EPA ECHO (35%) - Environmental permits, violations, compliance
 * - BGP/RIPE RIS (15%) - Network infrastructure, facility presence
 * - CT Logs (10%) - Certificate activity, domain patterns
 * 
 * @module evidenceTriangulation
 */

import { legalEvidenceManager } from './legalEvidenceChain';
import { knowledgeGraph } from './knowledgeGraph';

// ============================================================================
// TYPES
// ============================================================================

export type SourceType = 'sec_edgar' | 'epa_echo' | 'bgp_ripe' | 'ct_logs' | 'state_records' | 'news_media';

export interface SourceResult {
  source: SourceType;
  found: boolean;
  confidence: number;
  data: unknown;
  retrievedAt: Date;
  evidenceId?: string;  // Link to legal evidence record
}

export interface TriangulationResult {
  claim: Claim;
  overallConfidence: number;
  verified: boolean;
  sources: SourceResult[];
  conflicts: Conflict[];
  recommendations: string[];
  legalReadiness: 'ready' | 'needs_review' | 'insufficient';
}

export interface Claim {
  subject: string;          // What/who the claim is about
  predicate: string;        // What relationship or property
  object: string;           // The claimed value or target
  claimedBy?: string;       // Who made the claim
  context?: string;         // Additional context
}

export interface Conflict {
  type: 'value_mismatch' | 'date_discrepancy' | 'entity_mismatch' | 'missing_corroboration';
  description: string;
  sources: SourceType[];
  values: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface SourceConfig {
  type: SourceType;
  weight: number;
  name: string;
  credibility: 'high' | 'medium' | 'low';
  verifyFn: (claim: Claim) => Promise<SourceResult>;
}

// ============================================================================
// SOURCE WEIGHTS
// ============================================================================

export const SOURCE_WEIGHTS: Record<SourceType, number> = {
  sec_edgar: 0.40,      // Highest credibility - legal filings
  epa_echo: 0.35,       // Government regulatory data
  bgp_ripe: 0.15,       // Technical infrastructure data
  ct_logs: 0.10,        // Certificate transparency
  state_records: 0.30,  // State-level government records
  news_media: 0.15,     // Verified news sources
};

// ============================================================================
// EVIDENCE TRIANGULATION SERVICE
// ============================================================================

class EvidenceTriangulationService {
  private sources: Map<SourceType, SourceConfig> = new Map();

  constructor() {
    this.initializeSources();
  }

  /**
   * Initialize source configurations
   */
  private initializeSources(): void {
    const configs: SourceConfig[] = [
      {
        type: 'sec_edgar',
        weight: SOURCE_WEIGHTS.sec_edgar,
        name: 'SEC EDGAR',
        credibility: 'high',
        verifyFn: this.verifySECEdgar.bind(this),
      },
      {
        type: 'epa_echo',
        weight: SOURCE_WEIGHTS.epa_echo,
        name: 'EPA ECHO',
        credibility: 'high',
        verifyFn: this.verifyEPAEcho.bind(this),
      },
      {
        type: 'bgp_ripe',
        weight: SOURCE_WEIGHTS.bgp_ripe,
        name: 'RIPE RIS',
        credibility: 'medium',
        verifyFn: this.verifyBGPRipe.bind(this),
      },
      {
        type: 'ct_logs',
        weight: SOURCE_WEIGHTS.ct_logs,
        name: 'Certificate Transparency',
        credibility: 'medium',
        verifyFn: this.verifyCTLogs.bind(this),
      },
      {
        type: 'state_records',
        weight: SOURCE_WEIGHTS.state_records,
        name: 'State Government Records',
        credibility: 'high',
        verifyFn: this.verifyStateRecords.bind(this),
      },
      {
        type: 'news_media',
        weight: SOURCE_WEIGHTS.news_media,
        name: 'Verified News Media',
        credibility: 'medium',
        verifyFn: this.verifyNewsMedia.bind(this),
      },
    ];

    for (const config of configs) {
      this.sources.set(config.type, config);
    }
  }

  // ============================================================================
  // MAIN TRIANGULATION
  // ============================================================================

  /**
   * Triangulate a claim across multiple sources
   */
  async triangulate(
    claim: Claim,
    sourcesToUse: SourceType[] = ['sec_edgar', 'epa_echo', 'bgp_ripe', 'ct_logs']
  ): Promise<TriangulationResult> {
    console.log(`[Triangulation] Verifying: ${claim.subject} ${claim.predicate} ${claim.object}`);

    const results: SourceResult[] = [];
    
    // Query all requested sources in parallel
    const sourcePromises = sourcesToUse.map(async (sourceType) => {
      const config = this.sources.get(sourceType);
      if (!config) return null;

      try {
        const result = await config.verifyFn(claim);
        return result;
      } catch (error) {
        console.warn(`[Triangulation] Source ${sourceType} failed:`, error);
        return {
          source: sourceType,
          found: false,
          confidence: 0,
          data: { error: error instanceof Error ? error.message : 'Unknown error' },
          retrievedAt: new Date(),
        };
      }
    });

    const sourceResults = await Promise.all(sourcePromises);
    results.push(...sourceResults.filter((r): r is SourceResult => r !== null));

    // Calculate weighted confidence
    const overallConfidence = this.calculateWeightedConfidence(results);
    
    // Detect conflicts between sources
    const conflicts = this.detectConflicts(results, claim);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(results, conflicts, overallConfidence);
    
    // Determine legal readiness
    const legalReadiness = this.assessLegalReadiness(results, conflicts, overallConfidence);
    
    // Verified if confidence > 70% and no critical conflicts
    const verified = overallConfidence >= 0.70 && 
      !conflicts.some(c => c.severity === 'critical');

    const result: TriangulationResult = {
      claim,
      overallConfidence,
      verified,
      sources: results,
      conflicts,
      recommendations,
      legalReadiness,
    };

    // Store triangulation in knowledge graph
    await this.storeTriangulationResult(result);

    return result;
  }

  /**
   * Triangulate facility subsidy claims
   */
  async triangulateSubsidyClaim(
    facilityId: number,
    subsidyAmount: number,
    jobsPromised: number,
    company: string
  ): Promise<TriangulationResult> {
    return await this.triangulate({
      subject: `facility:${facilityId}`,
      predicate: 'received_subsidy',
      object: `amount:${subsidyAmount}|jobs:${jobsPromised}`,
      claimedBy: company,
      context: 'subsidy_verification',
    });
  }

  /**
   * Triangulate corporate ownership claim
   */
  async triangulateOwnership(
    parent: string,
    subsidiary: string
  ): Promise<TriangulationResult> {
    return await this.triangulate({
      subject: `company:${parent}`,
      predicate: 'owns',
      object: `subsidiary:${subsidiary}`,
      context: 'ownership_verification',
    });
  }

  /**
   * Triangulate facility compliance status
   */
  async triangulateCompliance(
    facilityId: number,
    claimedStatus: 'compliant' | 'non-compliant'
  ): Promise<TriangulationResult> {
    return await this.triangulate({
      subject: `facility:${facilityId}`,
      predicate: 'compliance_status',
      object: claimedStatus,
      context: 'compliance_verification',
    }, ['epa_echo', 'state_records']);
  }

  // ============================================================================
  // SOURCE VERIFICATION METHODS
  // ============================================================================

  private async verifySECEdgar(claim: Claim): Promise<SourceResult> {
    // Extract company identifier from claim
    const companyMatch = claim.subject.match(/company:(.+)/);
    if (!companyMatch) {
      return this.notFoundResult('sec_edgar');
    }

    try {
      // Simulate SEC EDGAR lookup (would be real API call)
      // In production, this would call SEC EDGAR API
      const mockData = await this.mockSECLookup(companyMatch[1], claim);
      
      if (mockData.found) {
        // Capture as legal evidence
        const evidenceRecord = await legalEvidenceManager.captureEvidence(
          JSON.stringify(mockData.data),
          'SEC EDGAR',
          'triangulation-service',
          {
            sourceUrl: `https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(companyMatch[1])}`,
            method: 'api',
          }
        );

        return {
          source: 'sec_edgar',
          found: true,
          confidence: 0.95,
          data: mockData.data,
          retrievedAt: new Date(),
          evidenceId: evidenceRecord.id,
        };
      }

      return this.notFoundResult('sec_edgar');
    } catch (error) {
      return this.errorResult('sec_edgar', error);
    }
  }

  private async verifyEPAEcho(claim: Claim): Promise<SourceResult> {
    try {
      // Extract facility or company info from claim
      const facilityMatch = claim.subject.match(/facility:(\d+)/);
      
      const mockData = await this.mockEPALookup(
        facilityMatch ? facilityMatch[1] : claim.subject,
        claim
      );

      if (mockData.found) {
        const evidenceRecord = await legalEvidenceManager.captureEvidence(
          JSON.stringify(mockData.data),
          'EPA ECHO',
          'triangulation-service',
          {
            sourceUrl: `https://echo.epa.gov/detailed-facility-report`,
            method: 'api',
          }
        );

        return {
          source: 'epa_echo',
          found: true,
          confidence: 0.90,
          data: mockData.data,
          retrievedAt: new Date(),
          evidenceId: evidenceRecord.id,
        };
      }

      return this.notFoundResult('epa_echo');
    } catch (error) {
      return this.errorResult('epa_echo', error);
    }
  }

  private async verifyBGPRipe(claim: Claim): Promise<SourceResult> {
    try {
      // BGP data for network presence verification
      const mockData = await this.mockBGPLookup(claim);

      if (mockData.found) {
        return {
          source: 'bgp_ripe',
          found: true,
          confidence: 0.80,
          data: mockData.data,
          retrievedAt: new Date(),
        };
      }

      return this.notFoundResult('bgp_ripe');
    } catch (error) {
      return this.errorResult('bgp_ripe', error);
    }
  }

  private async verifyCTLogs(claim: Claim): Promise<SourceResult> {
    try {
      // CT log data for certificate activity
      const mockData = await this.mockCTLookup(claim);

      if (mockData.found) {
        return {
          source: 'ct_logs',
          found: true,
          confidence: 0.75,
          data: mockData.data,
          retrievedAt: new Date(),
        };
      }

      return this.notFoundResult('ct_logs');
    } catch (error) {
      return this.errorResult('ct_logs', error);
    }
  }

  private async verifyStateRecords(claim: Claim): Promise<SourceResult> {
    try {
      const mockData = await this.mockStateRecordsLookup(claim);

      if (mockData.found) {
        const evidenceRecord = await legalEvidenceManager.captureEvidence(
          JSON.stringify(mockData.data),
          'State Records',
          'triangulation-service',
          {
            method: 'api',
          }
        );

        return {
          source: 'state_records',
          found: true,
          confidence: 0.90,
          data: mockData.data,
          retrievedAt: new Date(),
          evidenceId: evidenceRecord.id,
        };
      }

      return this.notFoundResult('state_records');
    } catch (error) {
      return this.errorResult('state_records', error);
    }
  }

  private async verifyNewsMedia(claim: Claim): Promise<SourceResult> {
    try {
      const mockData = await this.mockNewsLookup(claim);

      if (mockData.found) {
        return {
          source: 'news_media',
          found: true,
          confidence: 0.70,
          data: mockData.data,
          retrievedAt: new Date(),
        };
      }

      return this.notFoundResult('news_media');
    } catch (error) {
      return this.errorResult('news_media', error);
    }
  }

  // ============================================================================
  // MOCK DATA (Replace with real API calls)
  // ============================================================================

  private async mockSECLookup(company: string, claim: Claim): Promise<{ found: boolean; data: unknown }> {
    // Simulates SEC EDGAR API response
    // In production, this would make actual API calls
    await this.simulateApiDelay();
    
    // Return mock data for demonstration
    if (claim.predicate === 'owns') {
      return {
        found: true,
        data: {
          cik: '0001234567',
          name: company,
          subsidiaries: [
            { name: claim.object.replace('subsidiary:', ''), relationship: 'subsidiary' }
          ],
          filings: [
            { form: '10-K', date: '2025-02-15', relevantSection: 'Exhibit 21' }
          ]
        }
      };
    }
    
    return { found: false, data: null };
  }

  private async mockEPALookup(identifier: string, claim: Claim): Promise<{ found: boolean; data: unknown }> {
    await this.simulateApiDelay();
    
    if (claim.predicate === 'compliance_status') {
      return {
        found: true,
        data: {
          facilityId: identifier,
          quarterlyStatus: 'In Compliance',
          lastInspection: '2025-09-15',
          violations: [],
          permits: ['CAA', 'CWA'],
        }
      };
    }
    
    return { found: false, data: null };
  }

  private async mockBGPLookup(claim: Claim): Promise<{ found: boolean; data: unknown }> {
    await this.simulateApiDelay();
    
    return {
      found: true,
      data: {
        prefixesAnnounced: 5,
        asn: 'AS16509',
        networkPresence: true,
      }
    };
  }

  private async mockCTLookup(claim: Claim): Promise<{ found: boolean; data: unknown }> {
    await this.simulateApiDelay();
    
    return {
      found: true,
      data: {
        certificates: 12,
        domains: ['example.com', 'facility.example.com'],
        lastIssuance: '2025-12-01',
      }
    };
  }

  private async mockStateRecordsLookup(claim: Claim): Promise<{ found: boolean; data: unknown }> {
    await this.simulateApiDelay();
    
    if (claim.context === 'subsidy_verification') {
      return {
        found: true,
        data: {
          program: 'Economic Development Grant',
          amount: 5000000,
          jobsCommitted: 150,
          agreementDate: '2023-03-15',
          clawbackProvision: true,
        }
      };
    }
    
    return { found: false, data: null };
  }

  private async mockNewsLookup(claim: Claim): Promise<{ found: boolean; data: unknown }> {
    await this.simulateApiDelay();
    
    return {
      found: true,
      data: {
        articles: [
          {
            source: 'Local News',
            date: '2025-06-15',
            headline: 'Data center expansion announced',
            relevance: 0.7,
          }
        ]
      }
    };
  }

  private async simulateApiDelay(): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
  }

  // ============================================================================
  // ANALYSIS METHODS
  // ============================================================================

  private calculateWeightedConfidence(results: SourceResult[]): number {
    const foundResults = results.filter(r => r.found);
    
    if (foundResults.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    for (const result of foundResults) {
      const weight = SOURCE_WEIGHTS[result.source] || 0.1;
      weightedSum += result.confidence * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  private detectConflicts(results: SourceResult[], claim: Claim): Conflict[] {
    const conflicts: Conflict[] = [];
    const foundResults = results.filter(r => r.found);

    // Check for missing corroboration
    if (foundResults.length < 2) {
      conflicts.push({
        type: 'missing_corroboration',
        description: 'Claim supported by fewer than 2 sources',
        sources: foundResults.map(r => r.source),
        values: [],
        severity: foundResults.length === 0 ? 'critical' : 'medium',
      });
    }

    // Check for value mismatches
    if (claim.predicate === 'received_subsidy') {
      const amounts = foundResults
        .map(r => (r.data as { amount?: number })?.amount)
        .filter((a): a is number => a !== undefined);

      if (amounts.length > 1) {
        const variance = Math.max(...amounts) - Math.min(...amounts);
        if (variance > Math.min(...amounts) * 0.1) {
          conflicts.push({
            type: 'value_mismatch',
            description: `Subsidy amounts differ by ${variance.toLocaleString()}`,
            sources: foundResults.map(r => r.source),
            values: amounts.map(a => `$${a.toLocaleString()}`),
            severity: variance > Math.min(...amounts) * 0.5 ? 'high' : 'medium',
          });
        }
      }
    }

    // Check for date discrepancies
    // Add more conflict detection as needed

    return conflicts;
  }

  private generateRecommendations(
    results: SourceResult[],
    conflicts: Conflict[],
    confidence: number
  ): string[] {
    const recommendations: string[] = [];

    // Missing sources
    const foundSources = new Set(results.filter(r => r.found).map(r => r.source));
    
    if (!foundSources.has('sec_edgar')) {
      recommendations.push('Add SEC EDGAR verification for highest credibility');
    }
    if (!foundSources.has('epa_echo') && foundSources.size < 3) {
      recommendations.push('Add EPA ECHO data for environmental compliance context');
    }

    // Confidence-based recommendations
    if (confidence < 0.70) {
      recommendations.push('Seek additional corroborating sources before citing');
    }
    if (confidence < 0.50) {
      recommendations.push('CAUTION: Low confidence - manual verification required');
    }

    // Conflict-based recommendations
    for (const conflict of conflicts) {
      if (conflict.severity === 'critical') {
        recommendations.push(`CRITICAL: ${conflict.description} - investigate before proceeding`);
      } else if (conflict.type === 'value_mismatch') {
        recommendations.push(`Verify correct ${conflict.description.toLowerCase()}`);
      }
    }

    return recommendations;
  }

  private assessLegalReadiness(
    results: SourceResult[],
    conflicts: Conflict[],
    confidence: number
  ): 'ready' | 'needs_review' | 'insufficient' {
    // Check for critical issues
    if (conflicts.some(c => c.severity === 'critical')) {
      return 'insufficient';
    }

    // Check for evidence records
    const hasEvidence = results.some(r => r.evidenceId);
    
    // Check confidence threshold
    if (confidence >= 0.85 && hasEvidence && conflicts.length === 0) {
      return 'ready';
    }
    
    if (confidence >= 0.70 && hasEvidence) {
      return 'needs_review';
    }

    return 'insufficient';
  }

  private async storeTriangulationResult(result: TriangulationResult): Promise<void> {
    // Store as knowledge graph triple
    await knowledgeGraph.addTriple(
      result.claim.subject,
      `verified_${result.claim.predicate}`,
      result.claim.object,
      {
        confidence: result.overallConfidence,
        sources: result.sources
          .filter(s => s.evidenceId)
          .map(s => s.evidenceId!),
        metadata: {
          verified: result.verified,
          triangulatedAt: new Date().toISOString(),
          conflicts: result.conflicts.length,
        },
      }
    );
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  private notFoundResult(source: SourceType): SourceResult {
    return {
      source,
      found: false,
      confidence: 0,
      data: null,
      retrievedAt: new Date(),
    };
  }

  private errorResult(source: SourceType, error: unknown): SourceResult {
    return {
      source,
      found: false,
      confidence: 0,
      data: { error: error instanceof Error ? error.message : 'Unknown error' },
      retrievedAt: new Date(),
    };
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const evidenceTriangulation = new EvidenceTriangulationService();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useCallback } from 'react';

export function useEvidenceTriangulation() {
  const [results, setResults] = useState<TriangulationResult[]>([]);
  const [loading, setLoading] = useState(false);

  const triangulate = useCallback(async (claim: Claim, sources?: SourceType[]) => {
    setLoading(true);
    try {
      const result = await evidenceTriangulation.triangulate(claim, sources);
      setResults(prev => [result, ...prev]);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const triangulateSubsidy = useCallback(async (
    facilityId: number,
    amount: number,
    jobs: number,
    company: string
  ) => {
    setLoading(true);
    try {
      const result = await evidenceTriangulation.triangulateSubsidyClaim(
        facilityId, amount, jobs, company
      );
      setResults(prev => [result, ...prev]);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const triangulateOwnership = useCallback(async (parent: string, subsidiary: string) => {
    setLoading(true);
    try {
      const result = await evidenceTriangulation.triangulateOwnership(parent, subsidiary);
      setResults(prev => [result, ...prev]);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setResults([]);
  }, []);

  return {
    results,
    loading,
    triangulate,
    triangulateSubsidy,
    triangulateOwnership,
    clearResults,
    resultCount: results.length,
  };
}
