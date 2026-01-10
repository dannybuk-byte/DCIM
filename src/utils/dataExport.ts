/**
 * Data Export Utilities - Antifragile Data Preservation
 * 
 * Enables users to export their facility data for:
 * - Backup/disaster recovery
 * - Sharing with coalition partners
 * - Offline analysis
 * - Legal/FOIA documentation
 * 
 * ANTIFRAGILE: This is purely additive - no existing code modified
 */

import { db } from '../db/database';
import { Facility } from '../types';
import { logExport, logError } from './actionHistory';

export interface ExportOptions {
  format: 'json' | 'csv' | 'xlsx';
  includeMetadata?: boolean;
  filterStates?: string[];
  filterOperators?: string[];
  filterStatus?: ('Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown')[];
}

export interface ExportResult {
  success: boolean;
  filename: string;
  recordCount: number;
  fileSize: number;
  error?: string;
}

/**
 * Export facilities to JSON format
 */
export async function exportToJSON(
  facilities: Facility[],
  options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  try {
    const data = options.includeMetadata ? {
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      recordCount: facilities.length,
      source: 'DCIM Compliance Dashboard',
      purpose: 'Labor organizing accountability data',
      facilities,
    } : facilities;

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `dcim-facilities-${new Date().toISOString().split('T')[0]}.json`;
    
    downloadBlob(blob, filename);
    
    // 🛡️ ANTIFRAGILE: Log successful export
    logExport('JSON', facilities.length, blob.size, true);

    return {
      success: true,
      filename,
      recordCount: facilities.length,
      fileSize: blob.size,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Export failed';
    logError(`JSON export failed: ${errorMsg}`);
    return {
      success: false,
      filename: '',
      recordCount: 0,
      fileSize: 0,
      error: errorMsg,
    };
  }
}

/**
 * Export facilities to CSV format
 */
export async function exportToCSV(
  facilities: Facility[],
  _options: Partial<ExportOptions> = {}
): Promise<ExportResult> {
  try {
    // CSV headers matching Facility type
    const headers = [
      'id', 'name', 'operator', 'state', 'city', 'address',
      'latitude', 'longitude', 'status', 'powerCapacityMW',
      'jobsPromised', 'jobsCreated', 'subsidyGap', 'taxIncentives',
      'constructionPermits', 'buildingPermits', 'specialUsePermits',
      'lastUpdated', 'notes'
    ];

    const csvRows = [headers.join(',')];

    for (const facility of facilities) {
      const row = headers.map(header => {
        const value = facility[header as keyof Facility];
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return String(value);
      });
      csvRows.push(row.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const filename = `dcim-facilities-${new Date().toISOString().split('T')[0]}.csv`;
    
    downloadBlob(blob, filename);
    
    // 🛡️ ANTIFRAGILE: Log successful export
    logExport('CSV', facilities.length, blob.size, true);

    return {
      success: true,
      filename,
      recordCount: facilities.length,
      fileSize: blob.size,
    };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Export failed';
    logError(`CSV export failed: ${errorMsg}`);
    return {
      success: false,
      filename: '',
      recordCount: 0,
      fileSize: 0,
      error: errorMsg,
    };
  }
}

/**
 * Export state-by-state summary
 */
export async function exportStateSummary(facilities: Facility[]): Promise<ExportResult> {
  try {
    const stateMap = new Map<string, {
      state: string;
      totalFacilities: number;
      compliant: number;
      nonCompliant: number;
      atRisk: number;
      totalSubsidyGap: number;
      totalJobsPromised: number;
      totalJobsCreated: number;
      jobsGap: number;
    }>();

    for (const f of facilities) {
      const existing = stateMap.get(f.state) || {
        state: f.state,
        totalFacilities: 0,
        compliant: 0,
        nonCompliant: 0,
        atRisk: 0,
        totalSubsidyGap: 0,
        totalJobsPromised: 0,
        totalJobsCreated: 0,
        jobsGap: 0,
      };

      existing.totalFacilities++;
      existing.totalSubsidyGap += f.subsidyGap || 0;
      existing.totalJobsPromised += f.jobsPromised || 0;
      existing.totalJobsCreated += f.jobsCreated || 0;
      
      if (f.status === 'Compliant') existing.compliant++;
      else if (f.status === 'Non-Compliant') existing.nonCompliant++;
      else if (f.status === 'At Risk') existing.atRisk++;

      stateMap.set(f.state, existing);
    }

    const summary = Array.from(stateMap.values())
      .map(s => ({ ...s, jobsGap: s.totalJobsPromised - s.totalJobsCreated }))
      .sort((a, b) => b.totalSubsidyGap - a.totalSubsidyGap);

    const data = {
      exportedAt: new Date().toISOString(),
      title: 'State-by-State Accountability Summary',
      totalStates: summary.length,
      summary,
    };

    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `dcim-state-summary-${new Date().toISOString().split('T')[0]}.json`;
    
    downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      recordCount: summary.length,
      fileSize: blob.size,
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      recordCount: 0,
      fileSize: 0,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

/**
 * Export full database backup (all tables)
 */
export async function exportFullBackup(): Promise<ExportResult> {
  try {
    const [facilities, approvals, evidence, graphTriples] = await Promise.all([
      db.facilities.toArray(),
      db.table('agentApprovals').toArray().catch(() => []),
      db.table('evidenceChain').toArray().catch(() => []),
      db.table('knowledgeGraphTriples').toArray().catch(() => []),
    ]);

    const backup = {
      exportedAt: new Date().toISOString(),
      appVersion: '1.0.0',
      format: 'DCIM_BACKUP_V1',
      tables: {
        facilities: { count: facilities.length, data: facilities },
        agentApprovals: { count: approvals.length, data: approvals },
        evidenceChain: { count: evidence.length, data: evidence },
        knowledgeGraphTriples: { count: graphTriples.length, data: graphTriples },
      },
    };

    const jsonString = JSON.stringify(backup, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const filename = `dcim-full-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    downloadBlob(blob, filename);

    return {
      success: true,
      filename,
      recordCount: facilities.length + approvals.length + evidence.length + graphTriples.length,
      fileSize: blob.size,
    };
  } catch (error) {
    return {
      success: false,
      filename: '',
      recordCount: 0,
      fileSize: 0,
      error: error instanceof Error ? error.message : 'Backup failed',
    };
  }
}

/**
 * Helper to trigger file download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
