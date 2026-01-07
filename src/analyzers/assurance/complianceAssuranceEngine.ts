/**
 * Compliance Assurance Engine
 * 
 * Inspired by:
 * - Juniper Apstra's Intent-Based Networking
 * - HPE Marvis AIOps for continuous assurance
 * - Military-grade network monitoring
 * 
 * Continuously validates that compliance "intent" is being met
 * and predicts/alerts when drift occurs.
 */

import type { Facility } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Compliance Intent: What was promised in subsidy agreements
 */
export interface ComplianceIntent {
  facilityId: string;
  operator: string;
  state: string;
  
  // Job Creation Intent
  jobsPromised: number;
  jobsPromisedDate: Date;
  
  // Investment Intent
  investmentPromised: number;
  investmentTimeline: string;
  
  // Compliance Threshold
  minimumComplianceRate: number; // e.g., 70%
  
  // Audit Frequency
  auditFrequency: 'quarterly' | 'annually' | 'biannual';
  nextAuditDue: Date;
}

/**
 * Assurance Check Result
 */
export interface AssuranceResult {
  facilityId: string;
  timestamp: Date;
  status: 'COMPLIANT' | 'DRIFTING' | 'VIOLATED' | 'UNKNOWN';
  confidence: number; // 0-1
  
  // Metrics
  intentMet: boolean;
  complianceGap: number; // Percentage points below intent
  daysUntilViolation: number | null; // Predictive
  
  // Details
  checks: AssuranceCheck[];
  recommendations: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
}

export interface AssuranceCheck {
  category: 'jobs' | 'investment' | 'audit' | 'reporting';
  metric: string;
  expected: number | string;
  actual: number | string;
  passed: boolean;
  deviation: number; // Percentage
}

/**
 * Drift Alert: When a facility moves away from compliance intent
 */
export interface DriftAlert {
  id: string;
  facilityId: string;
  operator: string;
  severity: 'info' | 'warning' | 'critical';
  type: 'JOBS_SHORTFALL' | 'AUDIT_OVERDUE' | 'COMPLIANCE_DROP' | 'INVESTMENT_MISSING';
  message: string;
  detectedAt: Date;
  trendDirection: 'improving' | 'stable' | 'degrading';
  actionable: boolean;
  suggestedActions: string[];
}

// ============================================================================
// COMPLIANCE ASSURANCE ENGINE
// ============================================================================

export class ComplianceAssuranceEngine {
  private intents: Map<string, ComplianceIntent> = new Map();
  private historicalResults: Map<string, AssuranceResult[]> = new Map();
  
  /**
   * Register a compliance intent for a facility
   */
  registerIntent(intent: ComplianceIntent): void {
    this.intents.set(intent.facilityId, intent);
  }
  
  /**
   * Run assurance checks on a facility
   * (Like Juniper's continuous validation)
   */
  async runAssurance(facility: Facility): Promise<AssuranceResult> {
    const intent = this.intents.get(String(facility.id));
    
    if (!intent) {
      return this.createUnknownResult(facility);
    }
    
    const checks: AssuranceCheck[] = [];
    
    // Check 1: Job Creation
    const jobsCheck = this.checkJobsIntent(facility, intent);
    checks.push(jobsCheck);
    
    // Check 2: Audit Timeliness
    const auditCheck = this.checkAuditIntent(facility, intent);
    checks.push(auditCheck);
    
    // Check 3: Compliance Rate
    const complianceCheck = this.checkComplianceRate(facility, intent);
    checks.push(complianceCheck);
    
    // Determine overall status
    const status = this.determineStatus(checks);
    const intentMet = checks.every(c => c.passed);
    const complianceGap = this.calculateComplianceGap(facility, intent);
    
    // Predictive: Days until violation (using trend analysis)
    const daysUntilViolation = await this.predictViolation(facility);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(checks, facility, intent);
    
    // Determine urgency
    const urgency = this.calculateUrgency(status, daysUntilViolation, complianceGap);
    
    const result: AssuranceResult = {
      facilityId: String(facility.id),
      timestamp: new Date(),
      status,
      confidence: 0.85, // Based on data quality
      intentMet,
      complianceGap,
      daysUntilViolation,
      checks,
      recommendations,
      urgency,
    };
    
    // Store result for trend analysis
    this.storeResult(String(facility.id), result);
    
    return result;
  }
  
  /**
   * Detect compliance drift (like Marvis anomaly detection)
   */
  async detectDrift(facilities: Facility[]): Promise<DriftAlert[]> {
    const alerts: DriftAlert[] = [];
    
    for (const facility of facilities) {
      const result = await this.runAssurance(facility);
      const history = this.historicalResults.get(String(facility.id)) || [];
      
      // Trend analysis: Is compliance degrading?
      const trend = this.analyzeTrend(history);
      
      if (result.status === 'VIOLATED') {
        alerts.push({
          id: `drift-${facility.id}-${Date.now()}`,
          facilityId: String(facility.id),
          operator: facility.operator,
          severity: 'critical',
          type: 'COMPLIANCE_DROP',
          message: `${facility.name} has violated compliance intent`,
          detectedAt: new Date(),
          trendDirection: trend,
          actionable: true,
          suggestedActions: result.recommendations,
        });
      } else if (result.status === 'DRIFTING' && trend === 'degrading') {
        alerts.push({
          id: `drift-${facility.id}-${Date.now()}`,
          facilityId: String(facility.id),
          operator: facility.operator,
          severity: 'warning',
          type: 'COMPLIANCE_DROP',
          message: `${facility.name} is drifting from compliance (${result.complianceGap.toFixed(1)}% gap)`,
          detectedAt: new Date(),
          trendDirection: trend,
          actionable: true,
          suggestedActions: result.recommendations,
        });
      }
      
      // Check for overdue audits
      const intent = this.intents.get(String(facility.id));
      if (intent && new Date() > intent.nextAuditDue) {
        const daysOverdue = Math.floor((Date.now() - intent.nextAuditDue.getTime()) / (1000 * 60 * 60 * 24));
        alerts.push({
          id: `audit-${facility.id}-${Date.now()}`,
          facilityId: String(facility.id),
          operator: facility.operator,
          severity: daysOverdue > 90 ? 'critical' : 'warning',
          type: 'AUDIT_OVERDUE',
          message: `${facility.name} audit is ${daysOverdue} days overdue`,
          detectedAt: new Date(),
          trendDirection: 'stable',
          actionable: true,
          suggestedActions: [
            'File FOIA request for audit documentation',
            'Contact state compliance office',
            'Alert coalition partners',
          ],
        });
      }
    }
    
    return alerts.sort((a, b) => {
      const severityOrder = { critical: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }
  
  /**
   * Natural Language Query (Military command-style)
   * "Show me all facilities that failed job promises"
   */
  async queryIntent(naturalLanguage: string, facilities: Facility[]): Promise<Facility[]> {
    const query = naturalLanguage.toLowerCase();
    
    // Simple pattern matching (can be enhanced with LangChain.js)
    if (query.includes('failed job') || query.includes('job promise')) {
      return facilities.filter(f => {
        const intent = this.intents.get(String(f.id));
        return intent && (f.jobsCreated ?? 0) < intent.jobsPromised * 0.5; // <50% of promised
      });
    }
    
    if (query.includes('overdue audit')) {
      return facilities.filter(f => {
        const intent = this.intents.get(String(f.id));
        return intent && new Date() > intent.nextAuditDue;
      });
    }
    
    if (query.match(/received.*\$(\d+)M.*hired.*<\s*(\d+)/)) {
      const match = query.match(/\$(\d+)M.*<\s*(\d+)/);
      const subsidyThreshold = match ? parseInt(match[1]) * 1000000 : 100000000;
      const jobsThreshold = match ? parseInt(match[2]) : 50;
      
      return facilities.filter(f => 
        f.subsidyGap > subsidyThreshold && (f.jobsCreated ?? 0) < jobsThreshold
      );
    }
    
    // Default: return all non-compliant
    return facilities.filter(f => f.complianceStatus === 'Non-Compliant');
  }
  
  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================
  
  private checkJobsIntent(facility: Facility, intent: ComplianceIntent): AssuranceCheck {
    const jobsCreated = facility.jobsCreated ?? 0;
    const deviation = ((intent.jobsPromised - jobsCreated) / intent.jobsPromised) * 100;
    
    return {
      category: 'jobs',
      metric: 'Job Creation',
      expected: intent.jobsPromised,
      actual: jobsCreated,
      passed: jobsCreated >= intent.jobsPromised * 0.9, // 90% threshold
      deviation,
    };
  }
  
  private checkAuditIntent(facility: Facility, intent: ComplianceIntent): AssuranceCheck {
    const daysSinceAudit = Math.floor((Date.now() - new Date(facility.lastAuditDate).getTime()) / (1000 * 60 * 60 * 24));
    const maxDaysBetweenAudits = intent.auditFrequency === 'quarterly' ? 90 : 365;
    
    return {
      category: 'audit',
      metric: 'Audit Frequency',
      expected: `Every ${maxDaysBetweenAudits} days`,
      actual: `${daysSinceAudit} days ago`,
      passed: daysSinceAudit <= maxDaysBetweenAudits,
      deviation: ((daysSinceAudit - maxDaysBetweenAudits) / maxDaysBetweenAudits) * 100,
    };
  }
  
  private checkComplianceRate(facility: Facility, intent: ComplianceIntent): AssuranceCheck {
    const complianceRate = facility.complianceStatus === 'Compliant' ? 100 : 
                          facility.complianceStatus === 'At Risk' ? 60 : 30;
    
    return {
      category: 'reporting',
      metric: 'Compliance Rate',
      expected: intent.minimumComplianceRate,
      actual: complianceRate,
      passed: complianceRate >= intent.minimumComplianceRate,
      deviation: intent.minimumComplianceRate - complianceRate,
    };
  }
  
  private determineStatus(checks: AssuranceCheck[]): AssuranceResult['status'] {
    const failedChecks = checks.filter(c => !c.passed);
    
    if (failedChecks.length === 0) return 'COMPLIANT';
    if (failedChecks.length === checks.length) return 'VIOLATED';
    if (failedChecks.some(c => c.deviation > 50)) return 'VIOLATED';
    return 'DRIFTING';
  }
  
  private calculateComplianceGap(facility: Facility, intent: ComplianceIntent): number {
    const actualCompliance = facility.complianceStatus === 'Compliant' ? 100 : 
                            facility.complianceStatus === 'At Risk' ? 60 : 30;
    return Math.max(0, intent.minimumComplianceRate - actualCompliance);
  }
  
  private async predictViolation(facility: Facility): Promise<number | null> {
    const history = this.historicalResults.get(String(facility.id)) || [];
    
    if (history.length < 3) return null; // Need history for prediction
    
    // Simple linear regression on compliance gap
    const gaps = history.map(h => h.complianceGap);
    const avgIncrease = (gaps[gaps.length - 1] - gaps[0]) / gaps.length;
    
    if (avgIncrease <= 0) return null; // Improving or stable
    
    const latestGap = gaps[gaps.length - 1];
    const daysUntilCritical = Math.floor((50 - latestGap) / (avgIncrease / 30)); // 30 days per data point
    
    return daysUntilCritical > 0 ? daysUntilCritical : 0;
  }
  
  private generateRecommendations(
    checks: AssuranceCheck[],
    facility: Facility,
    intent: ComplianceIntent
  ): string[] {
    const recommendations: string[] = [];
    
    checks.forEach(check => {
      if (!check.passed) {
        switch (check.category) {
          case 'jobs':
            recommendations.push(`Request job creation report from ${facility.operator}`);
            recommendations.push(`File WARN Act request for ${facility.city}, ${facility.state}`);
            break;
          case 'audit':
            recommendations.push(`Contact state compliance office for overdue audit`);
            recommendations.push(`Escalate to coalition partners for public pressure`);
            break;
          case 'reporting':
            recommendations.push(`Review subsidy agreement for enforcement mechanisms`);
            recommendations.push(`Draft complaint to state attorney general`);
            break;
        }
      }
    });
    
    return recommendations;
  }
  
  private calculateUrgency(
    status: AssuranceResult['status'],
    daysUntilViolation: number | null,
    complianceGap: number
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (status === 'VIOLATED') return 'critical';
    if (daysUntilViolation !== null && daysUntilViolation < 30) return 'critical';
    if (complianceGap > 40) return 'high';
    if (status === 'DRIFTING') return 'medium';
    return 'low';
  }
  
  private analyzeTrend(history: AssuranceResult[]): 'improving' | 'stable' | 'degrading' {
    if (history.length < 2) return 'stable';
    
    const recent = history.slice(-3);
    const gaps = recent.map(r => r.complianceGap);
    
    const trend = gaps[gaps.length - 1] - gaps[0];
    
    if (trend > 5) return 'degrading';
    if (trend < -5) return 'improving';
    return 'stable';
  }
  
  private storeResult(facilityId: string, result: AssuranceResult): void {
    if (!this.historicalResults.has(facilityId)) {
      this.historicalResults.set(facilityId, []);
    }
    
    const history = this.historicalResults.get(facilityId)!;
    history.push(result);
    
    // Keep only last 12 results (1 year of quarterly checks)
    if (history.length > 12) {
      history.shift();
    }
  }
  
  private createUnknownResult(facility: Facility): AssuranceResult {
    return {
      facilityId: String(facility.id),
      timestamp: new Date(),
      status: 'UNKNOWN',
      confidence: 0,
      intentMet: false,
      complianceGap: 0,
      daysUntilViolation: null,
      checks: [],
      recommendations: ['Register compliance intent for this facility'],
      urgency: 'low',
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const complianceAssuranceEngine = new ComplianceAssuranceEngine();

