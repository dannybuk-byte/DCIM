import { Facility, ComplianceStats } from '../types';

export function calculateStats(facilities: Facility[]): ComplianceStats {
  // Null safety
  if (!facilities || facilities.length === 0) {
    return {
      totalFacilities: 0,
      compliant: 0,
      nonCompliant: 0,
      atRisk: 0,
      unknown: 0,
      totalSubsidyGap: 0,
      totalIssues: 0,
      avgDaysSinceAudit: 0,
      overdueAudits: 0,
      medianSubsidyGap: 0,
      maxSubsidyGap: 0,
    };
  }

  const totalFacilities = facilities.length;
  const compliant = facilities.filter(f => f?.complianceStatus === 'Compliant').length;
  const nonCompliant = facilities.filter(f => f?.complianceStatus === 'Non-Compliant').length;
  const atRisk = facilities.filter(f => f?.complianceStatus === 'At Risk').length;
  const unknown = facilities.filter(f => f?.complianceStatus === 'Unknown').length;
  
  const totalSubsidyGap = facilities.reduce((sum, f) => {
    const gap = typeof f?.subsidyGap === 'number' && f.subsidyGap >= 0 ? f.subsidyGap : 0;
    return sum + gap;
  }, 0);
  
  // Total issues count
  const totalIssues = facilities.reduce((sum, f) => {
    return sum + (Array.isArray(f?.issues) ? f.issues.length : 0);
  }, 0);
  
  // Days since audit calculations
  const now = Date.now();
  const AUDIT_THRESHOLD_DAYS = 180; // 6 months
  let totalDaysSinceAudit = 0;
  let overdueAudits = 0;
  
  facilities.forEach(f => {
    if (f?.lastAuditDate) {
      const auditDate = new Date(f.lastAuditDate).getTime();
      const daysSince = Math.floor((now - auditDate) / (1000 * 60 * 60 * 24));
      totalDaysSinceAudit += daysSince;
      if (daysSince > AUDIT_THRESHOLD_DAYS) {
        overdueAudits++;
      }
    } else {
      // If no audit date, assume it's overdue
      overdueAudits++;
    }
  });
  
  const avgDaysSinceAudit = totalFacilities > 0 ? totalDaysSinceAudit / totalFacilities : 0;
  
  // Subsidy gap statistics
  const subsidyGaps = facilities
    .map(f => (typeof f?.subsidyGap === 'number' && f.subsidyGap >= 0) ? f.subsidyGap : 0)
    .sort((a, b) => a - b);
  
  const maxSubsidyGap = subsidyGaps.length > 0 ? subsidyGaps[subsidyGaps.length - 1] : 0;
  
  let medianSubsidyGap = 0;
  if (subsidyGaps.length > 0) {
    const mid = Math.floor(subsidyGaps.length / 2);
    medianSubsidyGap = subsidyGaps.length % 2 !== 0
      ? subsidyGaps[mid]
      : (subsidyGaps[mid - 1] + subsidyGaps[mid]) / 2;
  }

  return {
    totalFacilities,
    compliant,
    nonCompliant,
    atRisk,
    unknown,
    totalSubsidyGap,
    totalIssues,
    avgDaysSinceAudit,
    overdueAudits,
    medianSubsidyGap,
    maxSubsidyGap,
  };
}

