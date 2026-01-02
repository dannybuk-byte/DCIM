// Source Configuration System for Data Provenance
// Based on Loukissas Data Locality Framework

export type SourceType = 'GOV' | 'GOV-S' | 'SEC' | 'FOIA' | 'OSINT' | 'RESEARCH' | 'NEWS' | 'CALC';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM-HIGH' | 'MEDIUM' | 'LOW-MEDIUM' | 'DERIVED';

export interface SourceConfig {
  color: string;
  label: string;
  confidence: ConfidenceLevel;
  description: string;
  refreshRate: string;
}

export const SOURCE_CONFIG: Record<SourceType, SourceConfig> = {
  GOV: {
    color: '#22c55e',
    label: 'Government',
    confidence: 'HIGH',
    description: 'Official government data sources (BLS, Census, EIA)',
    refreshRate: 'Varies by agency'
  },
  'GOV-S': {
    color: '#16a34a',
    label: 'Government (State/Local)',
    confidence: 'MEDIUM-HIGH',
    description: 'State and local government data sources',
    refreshRate: 'Varies by jurisdiction'
  },
  SEC: {
    color: '#3b82f6',
    label: 'SEC Filings',
    confidence: 'HIGH',
    description: 'Securities and Exchange Commission public filings',
    refreshRate: 'Quarterly/Annual'
  },
  FOIA: {
    color: '#eab308',
    label: 'FOIA Request',
    confidence: 'MEDIUM-HIGH',
    description: 'Data obtained through Freedom of Information Act requests',
    refreshRate: 'On request'
  },
  OSINT: {
    color: '#f97316',
    label: 'Open Source Intelligence',
    confidence: 'MEDIUM',
    description: 'Publicly available information from open sources',
    refreshRate: 'Continuous'
  },
  RESEARCH: {
    color: '#a855f7',
    label: 'Research',
    confidence: 'MEDIUM',
    description: 'Academic or institutional research publications',
    refreshRate: 'Varies'
  },
  NEWS: {
    color: '#6b7280',
    label: 'News Media',
    confidence: 'LOW-MEDIUM',
    description: 'News articles and media reports',
    refreshRate: 'Continuous'
  },
  CALC: {
    color: '#6366f1',
    label: 'Calculated',
    confidence: 'DERIVED',
    description: 'Derived or calculated from other data sources',
    refreshRate: 'On recalculation'
  }
};

export function getSourceConfig(sourceType: SourceType): SourceConfig {
  const config = SOURCE_CONFIG[sourceType];
  if (!config) {
    throw new Error(`Invalid source type: ${sourceType}. Must be one of: ${Object.keys(SOURCE_CONFIG).join(', ')}`);
  }
  return config;
}

export function isValidSourceType(type: string): type is SourceType {
  return type in SOURCE_CONFIG;
}

export function getConfidenceLevel(sourceType: SourceType): ConfidenceLevel {
  return getSourceConfig(sourceType).confidence;
}

