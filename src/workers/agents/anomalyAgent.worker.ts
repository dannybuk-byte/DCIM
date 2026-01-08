/**
 * Anomaly Detection Agent Worker
 * 
 * Monitors BGP routes, CT logs, power consumption, and workforce patterns
 * to detect anomalies that might indicate:
 * - Infrastructure changes (new data centers, expansions)
 * - Security incidents (BGP hijacks, certificate issues)
 * - Subsidy violations (job cuts after receiving incentives)
 * - Corporate restructuring (ownership changes, shell companies)
 */

import { BaseAgentWorker, AgentTask, generateId } from './baseAgent.worker';

interface AnomalyDetection {
  id: string;
  type: 'bgp' | 'ct_logs' | 'power' | 'workforce' | 'financial' | 'ownership';
  severity: 'critical' | 'high' | 'medium' | 'low';
  facilityId?: number;
  description: string;
  evidence: string[];
  confidence: number;
  timestamp: number;
  suggestedActions: string[];
}

interface BGPAnomaly {
  asn: string;
  prefix: string;
  type: 'hijack' | 'leak' | 'origin_change' | 'path_anomaly';
  affectedPrefixes: number;
  detectedAt: number;
}

interface CTLogAnomaly {
  domain: string;
  issuer: string;
  type: 'unexpected_ca' | 'short_validity' | 'wildcard_abuse' | 'transparency_gap';
  certCount: number;
  detectedAt: number;
}

class AnomalyDetectionAgent extends BaseAgentWorker {
  private monitoringIntervals: number[] = [];
  private recentAnomalies: AnomalyDetection[] = [];
  private thresholds = {
    bgpPathChange: 3, // Alert if AS path changes more than 3 hops
    ctCertBurst: 10, // Alert if >10 certs issued in 24h
    powerSpike: 0.15, // 15% power increase triggers alert
    workforceDropThreshold: 0.1, // 10% workforce reduction
  };

  constructor() {
    super(`anomaly-${generateId()}`, 'anomaly');
  }

  protected async processTask(task: AgentTask): Promise<unknown> {
    switch (task.type) {
      case 'monitor_bgp':
        return this.monitorBGP(task.parameters);
      case 'monitor_ct_logs':
        return this.monitorCTLogs(task.parameters);
      case 'analyze_power_patterns':
        return this.analyzePowerPatterns(task.parameters);
      case 'detect_workforce_changes':
        return this.detectWorkforceChanges(task.parameters);
      case 'scan_all':
        return this.runFullScan(task.parameters);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async monitorBGP(params: Record<string, unknown>): Promise<BGPAnomaly[]> {
    const asns = params.asns as string[] || [];
    const anomalies: BGPAnomaly[] = [];

    // Simulate BGP monitoring (in production, would query RIPE RIS, RouteViews, etc.)
    for (const asn of asns) {
      // Check for path anomalies
      const pathStability = Math.random();
      if (pathStability < 0.1) {
        const anomaly: BGPAnomaly = {
          asn,
          prefix: `${Math.floor(Math.random() * 256)}.${Math.floor(Math.random() * 256)}.0.0/16`,
          type: Math.random() > 0.5 ? 'origin_change' : 'path_anomaly',
          affectedPrefixes: Math.floor(Math.random() * 50) + 1,
          detectedAt: Date.now(),
        };
        anomalies.push(anomaly);

        // Create detection record
        await this.recordAnomaly({
          id: generateId(),
          type: 'bgp',
          severity: anomaly.affectedPrefixes > 20 ? 'critical' : 'high',
          description: `BGP ${anomaly.type} detected for AS${asn}: ${anomaly.affectedPrefixes} prefixes affected`,
          evidence: [
            `AS Path change detected at ${new Date(anomaly.detectedAt).toISOString()}`,
            `Affected prefix: ${anomaly.prefix}`,
            `Upstream providers notified: ${Math.random() > 0.5 ? 'Yes' : 'No'}`,
          ],
          confidence: 0.85 + Math.random() * 0.15,
          timestamp: Date.now(),
          suggestedActions: [
            'Verify with upstream provider',
            'Check RPKI ROA validity',
            'Document for compliance report',
          ],
        });
      }
    }

    return anomalies;
  }

  private async monitorCTLogs(params: Record<string, unknown>): Promise<CTLogAnomaly[]> {
    const domains = params.domains as string[] || [];
    const anomalies: CTLogAnomaly[] = [];

    for (const domain of domains) {
      // Simulate CT log monitoring
      const certActivity = Math.random();
      if (certActivity > 0.8) {
        const anomaly: CTLogAnomaly = {
          domain,
          issuer: ['Let\'s Encrypt', 'DigiCert', 'Sectigo', 'Unknown CA'][Math.floor(Math.random() * 4)],
          type: Math.random() > 0.7 ? 'unexpected_ca' : 'wildcard_abuse',
          certCount: Math.floor(Math.random() * 30) + 5,
          detectedAt: Date.now(),
        };
        anomalies.push(anomaly);

        const severity = anomaly.issuer === 'Unknown CA' ? 'critical' : 
                        anomaly.certCount > 20 ? 'high' : 'medium';

        await this.recordAnomaly({
          id: generateId(),
          type: 'ct_logs',
          severity,
          description: `Certificate transparency anomaly for ${domain}: ${anomaly.certCount} certs from ${anomaly.issuer}`,
          evidence: [
            `${anomaly.certCount} certificates issued in last 24h`,
            `Issuing CA: ${anomaly.issuer}`,
            `Anomaly type: ${anomaly.type}`,
          ],
          confidence: 0.75 + Math.random() * 0.2,
          timestamp: Date.now(),
          suggestedActions: [
            'Review certificate purposes',
            'Check for unauthorized issuance',
            'Verify domain ownership',
          ],
        });
      }
    }

    return anomalies;
  }

  private async analyzePowerPatterns(params: Record<string, unknown>): Promise<AnomalyDetection[]> {
    const facilityIds = params.facilityIds as number[] || [];
    const detections: AnomalyDetection[] = [];

    for (const facilityId of facilityIds) {
      // Simulate power analysis
      const powerChange = (Math.random() - 0.5) * 0.4; // -20% to +20%
      
      if (Math.abs(powerChange) > this.thresholds.powerSpike) {
        const detection: AnomalyDetection = {
          id: generateId(),
          type: 'power',
          severity: Math.abs(powerChange) > 0.25 ? 'high' : 'medium',
          facilityId,
          description: `${powerChange > 0 ? 'Increase' : 'Decrease'} of ${Math.abs(powerChange * 100).toFixed(1)}% in power consumption`,
          evidence: [
            `Baseline: ${(Math.random() * 50 + 20).toFixed(1)} MW`,
            `Current: ${(Math.random() * 50 + 20).toFixed(1)} MW`,
            `Change detected over 7-day rolling average`,
          ],
          confidence: 0.7 + Math.random() * 0.25,
          timestamp: Date.now(),
          suggestedActions: powerChange > 0 
            ? ['Check for new workload deployment', 'Verify capacity expansion permits', 'Update power tracking']
            : ['Investigate potential job cuts', 'Check for facility consolidation', 'Review subsidy compliance'],
        };
        detections.push(detection);
        await this.recordAnomaly(detection);
      }
    }

    return detections;
  }

  private async detectWorkforceChanges(params: Record<string, unknown>): Promise<AnomalyDetection[]> {
    const facilityIds = params.facilityIds as number[] || [];
    const detections: AnomalyDetection[] = [];

    for (const facilityId of facilityIds) {
      // Simulate workforce monitoring
      const workforceChange = (Math.random() - 0.4) * 0.3; // Bias toward reductions
      
      if (workforceChange < -this.thresholds.workforceDropThreshold) {
        const detection: AnomalyDetection = {
          id: generateId(),
          type: 'workforce',
          severity: 'critical', // Job losses are always critical for organizers
          facilityId,
          description: `Potential workforce reduction of ${Math.abs(workforceChange * 100).toFixed(1)}% detected`,
          evidence: [
            `LinkedIn job postings down ${Math.floor(Math.random() * 80) + 20}%`,
            `Glassdoor reviews mention layoffs`,
            `Local news reports ${Math.random() > 0.5 ? 'confirmed' : 'unconfirmed'}`,
          ],
          confidence: 0.6 + Math.random() * 0.3,
          timestamp: Date.now(),
          suggestedActions: [
            'Cross-reference with subsidy agreements',
            'Calculate clawback eligibility',
            'Alert coalition partners',
            'Prepare FOIA request for job commitments',
          ],
        };
        detections.push(detection);
        
        // This is high-stakes - request human approval before alerting
        if (detection.severity === 'critical') {
          const approval = await this.requestApproval({
            id: generateId(),
            action: 'Send coalition alert about potential layoffs',
            impact: 'high',
            confidence: detection.confidence,
            reasoning: `Detected potential ${Math.abs(workforceChange * 100).toFixed(1)}% workforce reduction at facility ${facilityId}. Multiple signals corroborate this finding.`,
            parameters: { facilityId, detection },
            evidence: detection.evidence,
          });
          
          if (approval.approved) {
            console.log(`[AnomalyAgent] Coalition alert approved for facility ${facilityId}`);
            // Would send actual alert here
          } else {
            console.log(`[AnomalyAgent] Coalition alert rejected: ${approval.feedback}`);
          }
        }
        
        await this.recordAnomaly(detection);
      }
    }

    return detections;
  }

  private async runFullScan(params: Record<string, unknown>): Promise<{ summary: string; anomalies: AnomalyDetection[] }> {
    const allAnomalies: AnomalyDetection[] = [];
    
    // Run all monitors
    const bgpResults = await this.monitorBGP({ asns: params.asns || ['13335', '16509', '15169'] });
    const ctResults = await this.monitorCTLogs({ domains: params.domains || ['amazon.com', 'microsoft.com', 'google.com'] });
    const powerResults = await this.analyzePowerPatterns({ facilityIds: params.facilityIds || [1, 2, 3, 4, 5] });
    const workforceResults = await this.detectWorkforceChanges({ facilityIds: params.facilityIds || [1, 2, 3, 4, 5] });
    
    allAnomalies.push(...powerResults, ...workforceResults);
    
    return {
      summary: `Full scan complete: ${bgpResults.length} BGP, ${ctResults.length} CT, ${powerResults.length} power, ${workforceResults.length} workforce anomalies detected`,
      anomalies: allAnomalies,
    };
  }

  private async recordAnomaly(detection: AnomalyDetection): Promise<void> {
    this.recentAnomalies.push(detection);
    
    // Keep only last 100 anomalies in memory
    if (this.recentAnomalies.length > 100) {
      this.recentAnomalies = this.recentAnomalies.slice(-100);
    }
    
    // Broadcast to other agents
    this.sendMessage('result', {
      type: 'anomaly_detected',
      detection,
    });
  }
}

// Initialize agent when worker starts
const agent = new AnomalyDetectionAgent();
agent.start();

// Handle worker termination
self.onmessage = (event) => {
  if (event.data.type === 'shutdown') {
    agent.stop();
    self.close();
  }
};
