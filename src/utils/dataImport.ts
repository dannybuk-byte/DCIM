/**
 * Data Import Utilities - Antifragile Disaster Recovery
 * 
 * Restores data from backup files created by dataExport.ts
 * - Validates data before import
 * - Supports JSON and full database backups
 * - Preview mode to see what will be imported
 * - Merge or replace options
 * 
 * ANTIFRAGILE: All operations validate data integrity
 * App works normally even if import fails
 */

import { db } from '../db/database';
import { Facility } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface ImportOptions {
  mode: 'replace' | 'merge';
  validateOnly?: boolean;  // Preview without actually importing
}

export interface ImportValidation {
  isValid: boolean;
  fileType: 'facilities-json' | 'full-backup' | 'unknown';
  errors: string[];
  warnings: string[];
  preview: {
    facilityCount?: number;
    tables?: string[];
    exportDate?: string;
    version?: string;
  };
}

export interface ImportResult {
  success: boolean;
  message: string;
  imported: {
    facilities?: number;
    tables?: Record<string, number>;
  };
  errors: string[];
}

// ============================================================================
// VALIDATION
// ============================================================================

/**
 * Validate and preview an import file without actually importing
 */
export async function validateImportFile(file: File): Promise<ImportValidation> {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  try {
    // Check file type
    if (!file.name.endsWith('.json')) {
      return {
        isValid: false,
        fileType: 'unknown',
        errors: ['File must be a JSON file (.json)'],
        warnings: [],
        preview: {}
      };
    }

    // Check file size (max 50MB)
    if (file.size > 50 * 1024 * 1024) {
      return {
        isValid: false,
        fileType: 'unknown',
        errors: ['File is too large (max 50MB)'],
        warnings: [],
        preview: {}
      };
    }

    // Read and parse file
    const text = await file.text();
    let data: unknown;
    
    try {
      data = JSON.parse(text);
    } catch {
      return {
        isValid: false,
        fileType: 'unknown',
        errors: ['Invalid JSON format'],
        warnings: [],
        preview: {}
      };
    }

    // Detect file type
    if (isFullBackup(data)) {
      return validateFullBackup(data, errors, warnings);
    } else if (isFacilitiesExport(data)) {
      return validateFacilitiesExport(data, errors, warnings);
    } else {
      return {
        isValid: false,
        fileType: 'unknown',
        errors: ['Unrecognized file format. Expected DCIM export or backup file.'],
        warnings: [],
        preview: {}
      };
    }
  } catch (error) {
    return {
      isValid: false,
      fileType: 'unknown',
      errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: [],
      preview: {}
    };
  }
}

function isFullBackup(data: unknown): data is FullBackupData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'metadata' in data &&
    'tables' in data &&
    typeof (data as FullBackupData).metadata === 'object' &&
    (data as FullBackupData).metadata?.type === 'full-backup'
  );
}

function isFacilitiesExport(data: unknown): data is FacilitiesExportData {
  return (
    typeof data === 'object' &&
    data !== null &&
    'metadata' in data &&
    'facilities' in data &&
    Array.isArray((data as FacilitiesExportData).facilities)
  );
}

interface FullBackupData {
  metadata: {
    type: string;
    exportDate: string;
    version: string;
    tables: string[];
  };
  tables: Record<string, unknown[]>;
}

interface FacilitiesExportData {
  metadata: {
    exportDate: string;
    totalFacilities: number;
    version?: string;
  };
  facilities: unknown[];
}

function validateFullBackup(
  data: FullBackupData, 
  errors: string[], 
  warnings: string[]
): ImportValidation {
  const { metadata, tables } = data;
  
  // Check required fields
  if (!metadata.exportDate) {
    warnings.push('Missing export date in metadata');
  }
  
  if (!metadata.tables || metadata.tables.length === 0) {
    errors.push('No tables found in backup');
  }

  // Count records per table
  const tableCounts: Record<string, number> = {};
  let totalRecords = 0;
  
  for (const tableName of metadata.tables || []) {
    const tableData = tables[tableName];
    if (Array.isArray(tableData)) {
      tableCounts[tableName] = tableData.length;
      totalRecords += tableData.length;
    } else {
      warnings.push(`Table "${tableName}" has invalid data`);
    }
  }

  if (totalRecords === 0) {
    errors.push('Backup contains no records');
  }

  return {
    isValid: errors.length === 0,
    fileType: 'full-backup',
    errors,
    warnings,
    preview: {
      facilityCount: tableCounts['facilities'] || 0,
      tables: Object.keys(tableCounts),
      exportDate: metadata.exportDate,
      version: metadata.version
    }
  };
}

function validateFacilitiesExport(
  data: FacilitiesExportData,
  errors: string[],
  warnings: string[]
): ImportValidation {
  const { metadata, facilities } = data;

  if (!Array.isArray(facilities)) {
    errors.push('Invalid facilities data - expected array');
    return {
      isValid: false,
      fileType: 'facilities-json',
      errors,
      warnings,
      preview: {}
    };
  }

  if (facilities.length === 0) {
    warnings.push('File contains no facilities');
  }

  // Validate facility structure (sample first few)
  const sampleSize = Math.min(5, facilities.length);
  for (let i = 0; i < sampleSize; i++) {
    const facility = facilities[i] as Record<string, unknown>;
    if (!facility.name) {
      warnings.push(`Facility at index ${i} is missing 'name' field`);
    }
    if (!facility.state && !facility.location) {
      warnings.push(`Facility at index ${i} is missing location data`);
    }
  }

  // Check for expected count match
  if (metadata.totalFacilities !== facilities.length) {
    warnings.push(`Metadata says ${metadata.totalFacilities} facilities but file contains ${facilities.length}`);
  }

  return {
    isValid: errors.length === 0,
    fileType: 'facilities-json',
    errors,
    warnings,
    preview: {
      facilityCount: facilities.length,
      exportDate: metadata.exportDate,
      version: metadata.version
    }
  };
}

// ============================================================================
// IMPORT FUNCTIONS
// ============================================================================

/**
 * Import facilities from a JSON export file
 */
export async function importFacilities(
  file: File, 
  options: ImportOptions = { mode: 'merge' }
): Promise<ImportResult> {
  const errors: string[] = [];
  
  try {
    // Validate first
    const validation = await validateImportFile(file);
    if (!validation.isValid) {
      return {
        success: false,
        message: 'Validation failed',
        imported: {},
        errors: validation.errors
      };
    }

    if (options.validateOnly) {
      return {
        success: true,
        message: 'Validation passed (preview only)',
        imported: { facilities: validation.preview.facilityCount },
        errors: []
      };
    }

    // Parse file
    const text = await file.text();
    const data = JSON.parse(text);

    if (validation.fileType === 'full-backup') {
      return await importFullBackup(data as FullBackupData, options);
    } else if (validation.fileType === 'facilities-json') {
      return await importFacilitiesJson(data as FacilitiesExportData, options);
    }

    return {
      success: false,
      message: 'Unknown file type',
      imported: {},
      errors: ['Could not determine import type']
    };
  } catch (error) {
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    return {
      success: false,
      message: 'Import failed',
      imported: {},
      errors
    };
  }
}

async function importFacilitiesJson(
  data: FacilitiesExportData,
  options: ImportOptions
): Promise<ImportResult> {
  const { facilities } = data;
  
  try {
    if (options.mode === 'replace') {
      // Clear existing facilities
      await db.facilities.clear();
    }

    // Map and insert facilities
    const mappedFacilities = facilities.map(f => mapImportedFacility(f as Record<string, unknown>));
    
    if (options.mode === 'merge') {
      // Use bulkPut for merge (updates existing, adds new)
      await db.facilities.bulkPut(mappedFacilities);
    } else {
      // Use bulkAdd for replace (all new)
      await db.facilities.bulkAdd(mappedFacilities);
    }

    return {
      success: true,
      message: `Successfully imported ${mappedFacilities.length} facilities`,
      imported: { facilities: mappedFacilities.length },
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      message: 'Failed to import facilities',
      imported: {},
      errors: [error instanceof Error ? error.message : 'Database error']
    };
  }
}

async function importFullBackup(
  data: FullBackupData,
  options: ImportOptions
): Promise<ImportResult> {
  const { tables } = data;
  const imported: Record<string, number> = {};
  const errors: string[] = [];

  try {
    // Import each table
    for (const [tableName, records] of Object.entries(tables)) {
      if (!Array.isArray(records) || records.length === 0) continue;

      try {
        const table = db.table(tableName);
        
        if (options.mode === 'replace') {
          await table.clear();
          await table.bulkAdd(records);
        } else {
          await table.bulkPut(records);
        }
        
        imported[tableName] = records.length;
      } catch (tableError) {
        errors.push(`Failed to import table "${tableName}": ${tableError instanceof Error ? tableError.message : 'Unknown error'}`);
      }
    }

    const totalImported = Object.values(imported).reduce((sum, n) => sum + n, 0);
    
    return {
      success: errors.length === 0,
      message: errors.length === 0 
        ? `Successfully restored ${totalImported} records across ${Object.keys(imported).length} tables`
        : `Partially restored with ${errors.length} errors`,
      imported: { tables: imported },
      errors
    };
  } catch (error) {
    return {
      success: false,
      message: 'Full backup restore failed',
      imported: { tables: imported },
      errors: [...errors, error instanceof Error ? error.message : 'Unknown error']
    };
  }
}

/**
 * Map imported facility data to our Facility type
 */
function mapImportedFacility(f: Record<string, unknown>): Facility {
  return {
    id: f.id as number | undefined,
    name: String(f.name || 'Unknown Facility'),
    operator: String(f.operator || f.provider || 'Unknown'),
    state: String(f.state || ''),
    city: String(f.city || ''),
    country: String(f.country || 'USA'),
    latitude: Number(f.latitude) || 0,
    longitude: Number(f.longitude) || 0,
    jobsPromised: Number(f.jobsPromised) || 0,
    jobsCreated: Number(f.jobsCreated || f.jobsActual) || 0,
    subsidyAmount: Number(f.subsidyAmount) || 0,
    subsidySource: String(f.subsidySource || ''),
    yearPromised: Number(f.yearPromised) || new Date().getFullYear(),
    deadline: String(f.deadline || ''),
    powerCapacityMW: Number(f.powerCapacityMW || f.capacity) || 0,
    complianceStatus: validateComplianceStatus(f.complianceStatus || f.status),
    sqFootage: Number(f.sqFootage) || 0,
    notes: String(f.notes || ''),
    lastUpdated: String(f.lastUpdated || new Date().toISOString()),
    dataSource: String(f.dataSource || 'import'),
    // Extended fields
    region: String(f.region || ''),
    tier: String(f.tier || ''),
    renewableEnergy: Number(f.renewableEnergy) || 0,
    waterUsage: Number(f.waterUsage) || 0,
    carbonFootprint: Number(f.carbonFootprint) || 0,
    buildingType: String(f.buildingType || ''),
    coolingType: String(f.coolingType || ''),
    backupPower: String(f.backupPower || ''),
    networkProviders: Array.isArray(f.networkProviders) ? f.networkProviders as string[] : [],
    certifications: Array.isArray(f.certifications) ? f.certifications as string[] : [],
    parentCompany: String(f.parentCompany || ''),
    acquisitionDate: f.acquisitionDate ? String(f.acquisitionDate) : undefined,
    employeeCount: Number(f.employeeCount) || 0,
    unionStatus: String(f.unionStatus || ''),
    safetyIncidents: Number(f.safetyIncidents) || 0,
    communityBenefits: String(f.communityBenefits || ''),
    taxIncentives: Number(f.taxIncentives) || 0,
    environmentalPermits: Array.isArray(f.environmentalPermits) ? f.environmentalPermits as string[] : [],
    expansionPlanned: Boolean(f.expansionPlanned),
    constructionStatus: String(f.constructionStatus || ''),
    openDate: f.openDate ? String(f.openDate) : undefined,
  };
}

function validateComplianceStatus(status: unknown): 'Compliant' | 'Non-Compliant' | 'At Risk' | 'Unknown' {
  const normalized = String(status || '').toLowerCase().replace(/[^a-z]/g, '');
  
  if (normalized.includes('compliant') && !normalized.includes('non')) return 'Compliant';
  if (normalized.includes('noncompliant') || normalized.includes('non')) return 'Non-Compliant';
  if (normalized.includes('risk') || normalized.includes('atrisk')) return 'At Risk';
  return 'Unknown';
}

// ============================================================================
// FILE PICKER UTILITY
// ============================================================================

/**
 * Open file picker dialog and return selected file
 */
export function openFilePicker(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0] || null;
      resolve(file);
    };
    
    input.oncancel = () => resolve(null);
    
    input.click();
  });
}

export default {
  validateImportFile,
  importFacilities,
  openFilePicker,
};
