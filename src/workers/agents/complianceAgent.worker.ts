/**
 * Compliance Monitoring Agent Worker
 * 
 * Tracks subsidy compliance, job creation promises, and regulatory requirements:
 * - Monitors job creation commitments vs actual employment
 * - Tracks clawback triggers and deadlines
 * - Validates environmental compliance
 * - Monitors tax incentive conditions
 */

import { BaseAgentWorker, AgentTask, generateId } from './baseAgent.worker';

interface ComplianceCheck {
  id: string;
  facilityId: number;
  type: 'job_creation' | 'clawback' | 'environmental' | 'tax_incentive' | 'cba_compliance';
  status: 'compliant' | 'non_compliant' | 'at_risk' | 'unknown';
  details: string;
  gap?: number;
  deadline?: number;
  evidence: string[];
  recommendations: string[];
}

interface SubsidyAgreement {
  id: string;
  facilityId: number;
  company: string;
  state: string;
  subsidyAmount: number;
  jobsPromised: number;
  jobsCreated: number;
  deadline: number;
  clawbackTriggers: string[];
}

class ComplianceMonitorAgent extends BaseAgentWorker {
  private complianceCache = new Map<number, ComplianceCheck[]>();
  private activeMonitors = new Set<number>();

  constructor() {
    super(`compliance-${generateId()}`, 'compliance');
  }

  protected async processTask(task: AgentTask): Promise<unknown> {
    switch (task.type) {
      case 'check_subsidy_compliance':
        return this.checkSubsidyCompliance(task.parameters);
      case 'calculate_clawback':
        return this.calculateClawback(task.parameters);
      case 'audit_job_creation':
        return this.auditJobCreation(task.parameters);
      case 'generate_compliance_report':
        return this.generateComplianceReport(task.parameters);
      case 'monitor_deadlines':
        return this.monitorDeadlines(task.parameters);
      default:
        throw new Error(`Unknown task type: ${task.type}`);
    }
  }

  private async checkSubsidyCompliance(params: Record<string, unknown>): Promise<ComplianceCheck[]> {
    const facilityIds = params.facilityIds as number[] || [];
    const checks: ComplianceCheck[] = [];

    for (const facilityId of facilityIds) {
      // Simulate subsidy compliance check
      const jobsPromised = Math.floor(Math.random() * 500) + 100;
      const jobsActual = Math.floor(jobsPromised * (0.4 + Math.random() * 0.8));
      const gap = jobsPromised - jobsActual;
      const complianceRatio = jobsActual / jobsPromised;

      const status = complianceRatio >= 0.9 ? 'compliant' :
                    complianceRatio >= 0.7 ? 'at_risk' : 'non_compliant';

      const check: ComplianceCheck = {
        id: generateId(),
        facilityId,
        type: 'job_creation',
        status,
        details: `Job creation: ${jobsActual} of ${jobsPromised} promised (${(complianceRatio * 100).toFixed(1)}%)`,
        gap,
        deadline: Date.now() + Math.random() * 365 * 24 * 60 * 60 * 1000, // Random deadline within year
        evidence: [
          `BLS QCEW data shows ${jobsActual} employees`,
          `Subsidy agreement requires ${jobsPromised} jobs`,
          `Verification date: ${new Date().toISOString().split('T')[0]}`,
        ],
        recommendations: status === 'non_compliant' ? [
          'File FOIA request for employment records',
          'Calculate clawback amount',
          'Notify state economic development office',
          'Prepare press release',
        ] : status === 'at_risk' ? [
          'Monitor closely for next 90 days',
          'Request quarterly employment reports',
          'Prepare contingency communications',
        ] : [
          'Continue regular monitoring',
          'Document for annual report',
        ],
      };

      checks.push(check);
      this.cacheComplianceCheck(facilityId, check);

      // For non-compliant facilities, request approval for public action
      if (status === 'non_compliant' && gap > 50) {
        const approval = await this.requestApproval({
          id: generateId(),
          action: 'Generate public accountability report',
          impact: 'critical',
          confidence: 0.9,
          reasoning: `Facility ${facilityId} has created only ${jobsActual} of ${jobsPromised} promised jobs (${gap} job shortfall). This represents a significant breach of subsidy agreement.`,
          parameters: { facilityId, check },
          evidence: check.evidence,
        });

        if (approval.approved) {
          console.log(`[ComplianceAgent] Public report approved for facility ${facilityId}`);
          check.recommendations.push('PUBLIC REPORT APPROVED - Generate and distribute');
        }
      }
    }

    return checks;
  }

  private async calculateClawback(params: Record<string, unknown>): Promise<{
    facilityId: number;
    subsidyAmount: number;
    clawbackAmount: number;
    clawbackPercentage: number;
    triggers: string[];
    legalBasis: string[];
  }> {
    const facilityId = params.facilityId as number;
    const subsidyAmount = params.subsidyAmount as number || Math.random() * 50_000_000 + 10_000_000;
    
    // Simulate clawback calculation
    const jobsPromised = params.jobsPromised as number || Math.floor(Math.random() * 500) + 100;
    const jobsActual = params.jobsActual as number || Math.floor(jobsPromised * 0.6);
    const shortfallRatio = (jobsPromised - jobsActual) / jobsPromised;
    
    // Most clawback formulas are proportional
    const clawbackPercentage = Math.min(shortfallRatio * 1.5, 1); // Up to 150% of shortfall ratio, capped at 100%
    const clawbackAmount = subsidyAmount * clawbackPercentage;
    
    const triggers: string[] = [];
    if (jobsActual < jobsPromised * 0.8) triggers.push('Job creation shortfall >20%');
    if (jobsActual < jobsPromised * 0.5) triggers.push('Major job creation failure >50%');
    if (Math.random() > 0.7) triggers.push('Wage requirement not met');
    if (Math.random() > 0.8) triggers.push('Benefits requirement not met');
    
    return {
      facilityId,
      subsidyAmount,
      clawbackAmount,
      clawbackPercentage: clawbackPercentage * 100,
      triggers,
      legalBasis: [
        'State Economic Development Agreement §4.2',
        'Tax Increment Financing Agreement §7.1',
        'Community Benefits Agreement §3.4',
      ],
    };
  }

  private async auditJobCreation(params: Record<string, unknown>): Promise<{
    facilityId: number;
    auditFindings: {
      source: string;
      jobCount: number;
      confidence: number;
      notes: string;
    }[];
    triangulatedEstimate: number;
    confidence: number;
  }> {
    const facilityId = params.facilityId as number;
    
    // Simulate multi-source job audit
    const baseJobCount = Math.floor(Math.random() * 400) + 50;
    const findings = [
      {
        source: 'BLS QCEW (Official)',
        jobCount: baseJobCount + Math.floor(Math.random() * 20) - 10,
        confidence: 0.95,
        notes: 'Official quarterly census data',
      },
      {
        source: 'LinkedIn Analysis',
        jobCount: baseJobCount + Math.floor(Math.random() * 50) - 25,
        confidence: 0.7,
        notes: 'Employee profiles claiming facility location',
      },
      {
        source: 'Glassdoor Reviews',
        jobCount: Math.floor(baseJobCount * (0.8 + Math.random() * 0.4)),
        confidence: 0.5,
        notes: 'Extrapolated from review volume and sentiment',
      },
      {
        source: 'Permit Applications',
        jobCount: baseJobCount + Math.floor(Math.random() * 30),
        confidence: 0.6,
        notes: 'Parking permits and badge counts from FOIA',
      },
    ];
    
    // Weighted average for triangulated estimate
    const totalWeight = findings.reduce((sum, f) => sum + f.confidence, 0);
    const triangulatedEstimate = Math.round(
      findings.reduce((sum, f) => sum + f.jobCount * f.confidence, 0) / totalWeight
    );
    
    return {
      facilityId,
      auditFindings: findings,
      triangulatedEstimate,
      confidence: Math.min(...findings.map(f => f.confidence)) + 0.1,
    };
  }

  private async generateComplianceReport(params: Record<string, unknown>): Promise<{
    reportId: string;
    generatedAt: number;
    summary: string;
    facilities: number;
    compliant: number;
    nonCompliant: number;
    atRisk: number;
    totalGap: number;
    totalClawbackEligible: number;
  }> {
    const facilityIds = params.facilityIds as number[] || [];
    
    // Run compliance checks for all facilities
    const checks = await this.checkSubsidyCompliance({ facilityIds });
    
    const compliant = checks.filter(c => c.status === 'compliant').length;
    const nonCompliant = checks.filter(c => c.status === 'non_compliant').length;
    const atRisk = checks.filter(c => c.status === 'at_risk').length;
    const totalGap = checks.reduce((sum, c) => sum + (c.gap || 0), 0);
    
    // Estimate clawback for non-compliant facilities
    let totalClawbackEligible = 0;
    for (const check of checks.filter(c => c.status === 'non_compliant')) {
      const clawback = await this.calculateClawback({
        facilityId: check.facilityId,
        subsidyAmount: Math.random() * 30_000_000 + 5_000_000,
      });
      totalClawbackEligible += clawback.clawbackAmount;
    }

    return {
      reportId: generateId(),
      generatedAt: Date.now(),
      summary: `Compliance report for ${facilityIds.length} facilities: ${compliant} compliant, ${nonCompliant} non-compliant, ${atRisk} at risk`,
      facilities: facilityIds.length,
      compliant,
      nonCompliant,
      atRisk,
      totalGap,
      totalClawbackEligible,
    };
  }

  private async monitorDeadlines(_params: Record<string, unknown>): Promise<{
    upcomingDeadlines: {
      facilityId: number;
      deadline: number;
      daysRemaining: number;
      type: string;
      action: string;
    }[];
  }> {
    const deadlines: {
      facilityId: number;
      deadline: number;
      daysRemaining: number;
      type: string;
      action: string;
    }[] = [];

    // Check all cached compliance checks for deadlines
    for (const [facilityId, checks] of this.complianceCache) {
      for (const check of checks) {
        if (check.deadline) {
          const daysRemaining = Math.floor((check.deadline - Date.now()) / (24 * 60 * 60 * 1000));
          if (daysRemaining <= 90 && daysRemaining > 0) {
            deadlines.push({
              facilityId,
              deadline: check.deadline,
              daysRemaining,
              type: check.type,
              action: daysRemaining <= 30 
                ? 'URGENT: Prepare clawback filing'
                : daysRemaining <= 60
                ? 'Draft preliminary report'
                : 'Monitor and document',
            });
          }
        }
      }
    }

    // Sort by urgency
    deadlines.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return { upcomingDeadlines: deadlines };
  }

  private cacheComplianceCheck(facilityId: number, check: ComplianceCheck): void {
    const existing = this.complianceCache.get(facilityId) || [];
    existing.push(check);
    // Keep only last 10 checks per facility
    this.complianceCache.set(facilityId, existing.slice(-10));
  }
}

// Initialize agent when worker starts
const agent = new ComplianceMonitorAgent();
agent.start();

// Handle worker termination
self.onmessage = (event) => {
  if (event.data.type === 'shutdown') {
    agent.stop();
    self.close();
  }
};
