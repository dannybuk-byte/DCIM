/**
 * Data Integrity Validator - Corruption Detection
 * 
 * Validates data consistency and detects anomalies:
 * 1. Required field validation
 * 2. Data type checking
 * 3. Range validation
 * 4. Referential integrity
 * 5. Anomaly detection
 * 
 * ANTIFRAGILE: Detects problems early before they cascade
 */

import { db } from '../db/database';
import { Facility } from '../types';
import { logSystem, logError } from './actionHistory';

// ============================================================================
// TYPES
// ============================================================================

export type IssueSeverity = 'critical' | 'warning' | 'info';

export interface IntegrityIssue {
  id: string;
  severity: IssueSeverity;
  category: string;
  message: string;
  affectedRecords?: number;
  details?: Record<string, unknown>;
  suggestion?: string;
}

export interface IntegrityReport {
  timestamp: number;
  duration: number;
  totalRecords: number;
  validRecords: number;
  issues: IntegrityIssue[];
  score: number; // 0-100
  status: 'healthy' | 'degraded' | 'critical';
}

// ============================================================================
// VALIDATION RULES
// ============================================================================

const REQUIRED_FIELDS: (keyof Facility)[] = [
  'name',
  'operator',
  'state',
];

const NUMERIC_FIELDS: (keyof Facility)[] = [
  'powerCapacityMW',
  'jobsPromised',
  'jobsCreated',
  'subsidyGap',
  'taxIncentives',
];

const VALID_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP',
];

const VALID_STATUSES = ['Compliant', 'Non-Compliant', 'At Risk', 'Unknown'];

// ============================================================================
// CORE VALIDATION
// ============================================================================

/**
 * Run full data integrity check
 */
export async function runIntegrityCheck(): Promise<IntegrityReport> {
  const startTime = Date.now();
  const issues: IntegrityIssue[] = [];
  
  logSystem('Starting data integrity check');

  try {
    // Load all facilities
    const facilities = await db.facilities.toArray();
    const totalRecords = facilities.length;
    let validRecords = 0;

    // Check 1: Required fields
    const missingRequired = checkRequiredFields(facilities);
    issues.push(...missingRequired);

    // Check 2: Data types
    const typeIssues = checkDataTypes(facilities);
    issues.push(...typeIssues);

    // Check 3: Valid values (states, statuses)
    const valueIssues = checkValidValues(facilities);
    issues.push(...valueIssues);

    // Check 4: Range validation
    const rangeIssues = checkRanges(facilities);
    issues.push(...rangeIssues);

    // Check 5: Duplicate detection
    const duplicateIssues = checkDuplicates(facilities);
    issues.push(...duplicateIssues);

    // Check 6: Anomaly detection
    const anomalyIssues = detectAnomalies(facilities);
    issues.push(...anomalyIssues);

    // Check 7: Database health
    const dbIssues = await checkDatabaseHealth();
    issues.push(...dbIssues);

    // Calculate valid records (those without critical issues)
    const criticalFacilityIds = new Set(
      issues
        .filter(i => i.severity === 'critical' && i.details?.facilityId)
        .map(i => i.details?.facilityId)
    );
    validRecords = totalRecords - criticalFacilityIds.size;

    // Calculate health score
    const score = calculateHealthScore(totalRecords, issues);
    const status = score >= 90 ? 'healthy' : score >= 70 ? 'degraded' : 'critical';

    const duration = Date.now() - startTime;

    const report: IntegrityReport = {
      timestamp: Date.now(),
      duration,
      totalRecords,
      validRecords,
      issues,
      score,
      status,
    };

    logSystem('Data integrity check complete', { 
      score, 
      status, 
      issues: issues.length,
      duration 
    });

    return report;

  } catch (error) {
    logError('Data integrity check failed', { error: String(error) });
    
    return {
      timestamp: Date.now(),
      duration: Date.now() - startTime,
      totalRecords: 0,
      validRecords: 0,
      issues: [{
        id: 'check-failed',
        severity: 'critical',
        category: 'system',
        message: 'Integrity check failed to complete',
        details: { error: String(error) },
        suggestion: 'Try refreshing the page or clearing browser data',
      }],
      score: 0,
      status: 'critical',
    };
  }
}

// ============================================================================
// INDIVIDUAL CHECKS
// ============================================================================

/**
 * Check for missing required fields
 */
function checkRequiredFields(facilities: Facility[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const missing: Record<string, number> = {};

  for (const facility of facilities) {
    for (const field of REQUIRED_FIELDS) {
      const value = facility[field];
      if (value === undefined || value === null || value === '') {
        missing[field] = (missing[field] || 0) + 1;
      }
    }
  }

  for (const [field, count] of Object.entries(missing)) {
    issues.push({
      id: `missing-${field}`,
      severity: 'critical',
      category: 'required-fields',
      message: `${count} record(s) missing required field: ${field}`,
      affectedRecords: count,
      suggestion: `Review and update records missing ${field}`,
    });
  }

  return issues;
}

/**
 * Check data types are correct
 */
function checkDataTypes(facilities: Facility[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const typeErrors: Record<string, number> = {};

  for (const facility of facilities) {
    for (const field of NUMERIC_FIELDS) {
      const value = facility[field];
      if (value !== undefined && value !== null && typeof value !== 'number') {
        typeErrors[field] = (typeErrors[field] || 0) + 1;
      }
    }
  }

  for (const [field, count] of Object.entries(typeErrors)) {
    issues.push({
      id: `type-${field}`,
      severity: 'warning',
      category: 'data-types',
      message: `${count} record(s) have invalid type for: ${field}`,
      affectedRecords: count,
      suggestion: `Numeric fields should contain numbers only`,
    });
  }

  return issues;
}

/**
 * Check values are within valid sets
 */
function checkValidValues(facilities: Facility[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  let invalidStates = 0;
  let invalidStatuses = 0;
  const unknownStates = new Set<string>();

  for (const facility of facilities) {
    if (facility.state && !VALID_STATES.includes(facility.state)) {
      invalidStates++;
      unknownStates.add(facility.state);
    }
    if (facility.status && !VALID_STATUSES.includes(facility.status)) {
      invalidStatuses++;
    }
  }

  if (invalidStates > 0) {
    issues.push({
      id: 'invalid-states',
      severity: 'warning',
      category: 'valid-values',
      message: `${invalidStates} record(s) have unrecognized state codes`,
      affectedRecords: invalidStates,
      details: { unknownStates: Array.from(unknownStates) },
      suggestion: 'Use standard US state abbreviations (e.g., CA, TX, NY)',
    });
  }

  if (invalidStatuses > 0) {
    issues.push({
      id: 'invalid-statuses',
      severity: 'warning',
      category: 'valid-values',
      message: `${invalidStatuses} record(s) have invalid compliance status`,
      affectedRecords: invalidStatuses,
      suggestion: 'Status should be: Compliant, Non-Compliant, At Risk, or Unknown',
    });
  }

  return issues;
}

/**
 * Check numeric ranges are reasonable
 */
function checkRanges(facilities: Facility[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  let negativeJobs = 0;
  let negativeSubsidy = 0;
  let extremePower = 0;
  let jobsExceedPromised = 0;

  for (const facility of facilities) {
    if (facility.jobsCreated !== undefined && facility.jobsCreated < 0) {
      negativeJobs++;
    }
    if (facility.subsidyGap !== undefined && facility.subsidyGap < 0) {
      negativeSubsidy++;
    }
    if (facility.powerCapacityMW !== undefined && facility.powerCapacityMW > 10000) {
      extremePower++;
    }
    if (facility.jobsCreated !== undefined && 
        facility.jobsPromised !== undefined && 
        facility.jobsCreated > facility.jobsPromised * 2) {
      jobsExceedPromised++;
    }
  }

  if (negativeJobs > 0) {
    issues.push({
      id: 'negative-jobs',
      severity: 'warning',
      category: 'ranges',
      message: `${negativeJobs} record(s) have negative job counts`,
      affectedRecords: negativeJobs,
      suggestion: 'Job counts should be non-negative',
    });
  }

  if (extremePower > 0) {
    issues.push({
      id: 'extreme-power',
      severity: 'info',
      category: 'ranges',
      message: `${extremePower} record(s) have extremely high power capacity (>10GW)`,
      affectedRecords: extremePower,
      suggestion: 'Verify power capacity values for accuracy',
    });
  }

  if (jobsExceedPromised > 0) {
    issues.push({
      id: 'jobs-exceed-promised',
      severity: 'info',
      category: 'ranges',
      message: `${jobsExceedPromised} record(s) show jobs created exceeding 2x promised`,
      affectedRecords: jobsExceedPromised,
      suggestion: 'This might indicate data entry errors or exceptional success',
    });
  }

  return issues;
}

/**
 * Check for duplicate records
 */
function checkDuplicates(facilities: Facility[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];
  const seen = new Map<string, number>();
  let duplicates = 0;

  for (const facility of facilities) {
    // Create a key from name + operator + state
    const key = `${facility.name}|${facility.operator}|${facility.state}`.toLowerCase();
    const count = (seen.get(key) || 0) + 1;
    seen.set(key, count);
    if (count > 1) duplicates++;
  }

  const duplicateCount = Array.from(seen.values()).filter(v => v > 1).length;

  if (duplicateCount > 0) {
    issues.push({
      id: 'duplicates',
      severity: 'warning',
      category: 'duplicates',
      message: `${duplicateCount} potential duplicate record group(s) detected`,
      affectedRecords: duplicates,
      suggestion: 'Review and merge or remove duplicate entries',
    });
  }

  return issues;
}

/**
 * Detect statistical anomalies
 */
function detectAnomalies(facilities: Facility[]): IntegrityIssue[] {
  const issues: IntegrityIssue[] = [];

  // Check for suspiciously uniform data
  const subsidyGaps = facilities
    .map(f => f.subsidyGap)
    .filter((v): v is number => typeof v === 'number');

  if (subsidyGaps.length > 100) {
    const uniqueValues = new Set(subsidyGaps).size;
    const uniqueRatio = uniqueValues / subsidyGaps.length;

    if (uniqueRatio < 0.1) {
      issues.push({
        id: 'low-variance-subsidy',
        severity: 'info',
        category: 'anomalies',
        message: 'Subsidy gap values show unusually low variance',
        details: { uniqueValues, totalValues: subsidyGaps.length },
        suggestion: 'This may indicate synthetic or placeholder data',
      });
    }
  }

  // Check for suspicious patterns in names
  const names = facilities.map(f => f.name);
  const numberedNames = names.filter(n => /\d+$/.test(n)).length;
  const numberedRatio = numberedNames / names.length;

  if (numberedRatio > 0.8 && facilities.length > 100) {
    issues.push({
      id: 'sequential-names',
      severity: 'info',
      category: 'anomalies',
      message: `${Math.round(numberedRatio * 100)}% of facility names end with numbers`,
      details: { numberedNames, totalNames: names.length },
      suggestion: 'This pattern is common in auto-generated test data',
    });
  }

  return issues;
}

/**
 * Check database health
 */
async function checkDatabaseHealth(): Promise<IntegrityIssue[]> {
  const issues: IntegrityIssue[] = [];

  try {
    // Check table count
    const facilityCount = await db.facilities.count();
    
    if (facilityCount === 0) {
      issues.push({
        id: 'empty-database',
        severity: 'critical',
        category: 'database',
        message: 'Database contains no facility records',
        suggestion: 'Import data or check if database was cleared',
      });
    }

    // Estimate storage usage
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      const usagePercent = estimate.usage && estimate.quota 
        ? (estimate.usage / estimate.quota) * 100 
        : 0;
      
      if (usagePercent > 80) {
        issues.push({
          id: 'storage-high',
          severity: 'warning',
          category: 'database',
          message: `Storage usage is high (${Math.round(usagePercent)}%)`,
          details: { 
            usage: estimate.usage, 
            quota: estimate.quota,
            usagePercent: Math.round(usagePercent)
          },
          suggestion: 'Consider exporting and clearing old data',
        });
      }
    }

  } catch (error) {
    issues.push({
      id: 'db-check-failed',
      severity: 'warning',
      category: 'database',
      message: 'Could not complete database health check',
      details: { error: String(error) },
    });
  }

  return issues;
}

// ============================================================================
// SCORING
// ============================================================================

/**
 * Calculate overall health score (0-100)
 */
function calculateHealthScore(totalRecords: number, issues: IntegrityIssue[]): number {
  if (totalRecords === 0) return 0;

  let score = 100;

  for (const issue of issues) {
    const impact = issue.affectedRecords 
      ? (issue.affectedRecords / totalRecords) * 100
      : 5; // Default impact for non-record issues

    switch (issue.severity) {
      case 'critical':
        score -= Math.min(impact * 2, 30);
        break;
      case 'warning':
        score -= Math.min(impact, 15);
        break;
      case 'info':
        score -= Math.min(impact * 0.5, 5);
        break;
    }
  }

  return Math.max(0, Math.round(score));
}

// ============================================================================
// QUICK CHECK
// ============================================================================

/**
 * Run a quick integrity check (faster, less thorough)
 */
export async function runQuickCheck(): Promise<{ 
  healthy: boolean; 
  issues: number;
  score: number;
}> {
  try {
    const count = await db.facilities.count();
    
    if (count === 0) {
      return { healthy: false, issues: 1, score: 0 };
    }

    // Sample 100 records for quick check
    const sample = await db.facilities.limit(100).toArray();
    const issues = checkRequiredFields(sample);

    return {
      healthy: issues.length === 0,
      issues: issues.length,
      score: issues.length === 0 ? 100 : 70,
    };

  } catch {
    return { healthy: false, issues: 1, score: 0 };
  }
}

// ============================================================================
// FORMATTING
// ============================================================================

/**
 * Get severity color class
 */
export function getSeverityColor(severity: IssueSeverity): string {
  switch (severity) {
    case 'critical': return 'text-red-600 bg-red-50';
    case 'warning': return 'text-amber-600 bg-amber-50';
    case 'info': return 'text-blue-600 bg-blue-50';
  }
}

/**
 * Get status color class
 */
export function getStatusColor(status: IntegrityReport['status']): string {
  switch (status) {
    case 'healthy': return 'text-green-600 bg-green-50';
    case 'degraded': return 'text-amber-600 bg-amber-50';
    case 'critical': return 'text-red-600 bg-red-50';
  }
}

/**
 * Format report for display
 */
export function formatReportSummary(report: IntegrityReport): string {
  const criticalCount = report.issues.filter(i => i.severity === 'critical').length;
  const warningCount = report.issues.filter(i => i.severity === 'warning').length;
  const infoCount = report.issues.filter(i => i.severity === 'info').length;

  return `Score: ${report.score}/100 | ${criticalCount} critical, ${warningCount} warnings, ${infoCount} info`;
}

export default {
  runIntegrityCheck,
  runQuickCheck,
  getSeverityColor,
  getStatusColor,
  formatReportSummary,
};
