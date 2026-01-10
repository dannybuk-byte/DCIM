/**
 * Worker Incident Reporting Portal
 * 
 * Anonymous incident tracking for labor violations at data centers.
 * Creates the CONDITIONS layer of: SUBSIDIES → EMPLOYMENT → CONDITIONS → UNIONS
 * 
 * Types of incidents tracked:
 * - Wage theft (unpaid overtime, misclassification)
 * - Safety violations (OSHA-reportable)
 * - Contractor abuse (temp worker exploitation)
 * - Retaliation (anti-organizing activity)
 * - Discrimination
 */

// === Types ===

export interface WorkerIncident {
  id: string;
  // Anonymous identification
  submitterToken: string; // Hashed token for follow-up without identity
  
  // Location
  facility?: {
    id?: string;
    name: string;
    operator?: string;
    address?: string;
    city: string;
    state: string;
    coordinates?: { lat: number; lng: number };
  };
  
  // Incident details
  incidentType: IncidentType;
  incidentSubtype?: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  dateOccurred: Date;
  dateReported: Date;
  ongoing: boolean;
  
  // Description
  title: string;
  description: string;
  workersAffected?: number;
  
  // Employment context
  employmentType: EmploymentType;
  contractor?: string;
  staffingAgency?: string;
  jobTitle?: string;
  department?: string;
  
  // Evidence
  evidence: IncidentEvidence[];
  witnesses?: number;
  
  // Status
  status: IncidentStatus;
  verificationLevel: VerificationLevel;
  
  // Actions
  filedWithOSHA?: boolean;
  oshaComplaintNumber?: string;
  filedWithNLRB?: boolean;
  nlrbCaseNumber?: string;
  filedWithDOL?: boolean;
  lawyerContacted?: boolean;
  unionContacted?: boolean;
  mediaContacted?: boolean;
  
  // Internal
  reviewNotes?: string[];
  linkedIncidents?: string[];
  tags: string[];
  
  // Pattern detection
  patternFlags?: PatternFlag[];
}

export type IncidentType =
  | 'wage-theft'
  | 'safety-violation'
  | 'contractor-abuse'
  | 'retaliation'
  | 'discrimination'
  | 'harassment'
  | 'misclassification'
  | 'benefits-denial'
  | 'unsafe-conditions'
  | 'other';

export type EmploymentType =
  | 'direct-employee'
  | 'contractor'
  | 'temp-agency'
  | 'subcontractor'
  | 'construction'
  | 'unknown';

export type IncidentStatus =
  | 'submitted'
  | 'under-review'
  | 'verified'
  | 'needs-info'
  | 'escalated'
  | 'resolved'
  | 'referred'
  | 'closed';

export type VerificationLevel =
  | 'unverified'
  | 'location-verified'
  | 'employment-verified'
  | 'document-verified'
  | 'multi-source-verified';

export interface IncidentEvidence {
  id: string;
  type: 'photo' | 'document' | 'screenshot' | 'video' | 'audio' | 'pay-stub' | 'email' | 'other';
  filename: string;
  description?: string;
  uploadedAt: Date;
  verified: boolean;
  redacted: boolean;
}

export interface PatternFlag {
  type: string;
  description: string;
  relatedIncidents: string[];
  confidence: number;
}

// === Incident Type Definitions ===

export const INCIDENT_TYPES: Record<IncidentType, {
  label: string;
  description: string;
  subtypes: string[];
  suggestedActions: string[];
  filingAgencies: string[];
}> = {
  'wage-theft': {
    label: 'Wage Theft',
    description: 'Unpaid wages, overtime violations, illegal deductions',
    subtypes: [
      'Unpaid overtime',
      'Unpaid regular hours',
      'Illegal paycheck deductions',
      'Minimum wage violations',
      'Final paycheck withheld',
      'Tip theft',
      'Off-the-clock work required',
    ],
    suggestedActions: [
      'Document all hours worked',
      'Keep copies of pay stubs',
      'File complaint with state labor department',
      'Contact DOL Wage and Hour Division',
    ],
    filingAgencies: ['Department of Labor', 'State Labor Commissioner'],
  },
  'safety-violation': {
    label: 'Safety Violation',
    description: 'Hazardous conditions, inadequate training, missing PPE',
    subtypes: [
      'Inadequate PPE provided',
      'Electrical hazards',
      'Fall protection missing',
      'Chemical exposure',
      'Extreme temperatures',
      'Insufficient training',
      'Emergency exit blocked',
      'Fire safety violations',
    ],
    suggestedActions: [
      'Document with photos if safe',
      'Report to supervisor in writing',
      'File OSHA complaint',
      'Contact union safety rep',
    ],
    filingAgencies: ['OSHA', 'State OSHA'],
  },
  'contractor-abuse': {
    label: 'Contractor Abuse',
    description: 'Exploitation of temp/contract workers, unequal treatment',
    subtypes: [
      'Lower pay for same work as direct employees',
      'No benefits while working alongside benefited workers',
      'Permanent temp status (perma-temp)',
      'Unsafe assignments given to temps only',
      'Retaliation for complaints',
      'Excessive quotas',
      'Unpaid training periods',
    ],
    suggestedActions: [
      'Document disparate treatment',
      'Connect with other contract workers',
      'File joint complaint with NLRB',
      'Contact temp worker advocacy orgs',
    ],
    filingAgencies: ['NLRB', 'EEOC', 'State Labor Commissioner'],
  },
  'retaliation': {
    label: 'Retaliation',
    description: 'Punishment for reporting issues, organizing, or exercising rights',
    subtypes: [
      'Fired for reporting safety issue',
      'Hours reduced after complaint',
      'Transferred to worse position',
      'Negative evaluation after organizing',
      'Threatened for discussing wages',
      'Blacklisted from assignments',
    ],
    suggestedActions: [
      'Document timeline of events',
      'Save all communications',
      'File NLRB charge if union-related',
      'File OSHA 11(c) if safety-related',
      'Consult employment lawyer',
    ],
    filingAgencies: ['NLRB', 'OSHA', 'EEOC'],
  },
  'discrimination': {
    label: 'Discrimination',
    description: 'Unequal treatment based on protected characteristics',
    subtypes: [
      'Race/ethnicity discrimination',
      'Gender discrimination',
      'Age discrimination',
      'Disability discrimination',
      'National origin discrimination',
      'Religious discrimination',
      'Pregnancy discrimination',
    ],
    suggestedActions: [
      'Document incidents with dates',
      'Identify witnesses',
      'File EEOC charge within 180 days',
      'Consult civil rights attorney',
    ],
    filingAgencies: ['EEOC', 'State Civil Rights Agency'],
  },
  'harassment': {
    label: 'Harassment',
    description: 'Hostile work environment, sexual harassment',
    subtypes: [
      'Sexual harassment',
      'Hostile work environment',
      'Bullying by supervisors',
      'Racial harassment',
      'Gender-based harassment',
    ],
    suggestedActions: [
      'Document all incidents',
      'Report to HR in writing',
      'File EEOC charge',
      'Consult attorney',
    ],
    filingAgencies: ['EEOC', 'State Civil Rights Agency'],
  },
  'misclassification': {
    label: 'Misclassification',
    description: 'Wrongly classified as independent contractor or exempt',
    subtypes: [
      'Treated as 1099 but working as W-2',
      'Wrongly classified as exempt from overtime',
      'Forced to work as "volunteer"',
      'Unpaid internship violations',
    ],
    suggestedActions: [
      'Compare duties to classification tests',
      'File SS-8 with IRS',
      'File DOL complaint',
      'Contact state labor agency',
    ],
    filingAgencies: ['IRS', 'Department of Labor', 'State Labor Board'],
  },
  'benefits-denial': {
    label: 'Benefits Denial',
    description: 'Denied healthcare, leave, or other benefits',
    subtypes: [
      'FMLA leave denied',
      'Healthcare enrollment blocked',
      'Sick leave denied',
      'Workers comp claim rejected',
      'Retirement benefits withheld',
    ],
    suggestedActions: [
      'Request denial in writing',
      'File ERISA complaint if applicable',
      'Contact state insurance commissioner',
      'File DOL complaint',
    ],
    filingAgencies: ['Department of Labor', 'State Insurance Commission'],
  },
  'unsafe-conditions': {
    label: 'Unsafe Conditions',
    description: 'Ongoing dangerous work environment',
    subtypes: [
      'Excessive heat in facility',
      'Inadequate cooling/ventilation',
      'Exposed electrical wiring',
      'Missing safety guards',
      'Overcrowded workspace',
      'Inadequate emergency procedures',
    ],
    suggestedActions: [
      'Document conditions with photos',
      'File OSHA complaint online',
      'Request OSHA inspection',
      'Contact local fire marshal if fire hazards',
    ],
    filingAgencies: ['OSHA', 'State OSHA', 'Fire Marshal'],
  },
  'other': {
    label: 'Other',
    description: 'Other workplace issues not listed above',
    subtypes: [],
    suggestedActions: [
      'Document the issue thoroughly',
      'Identify which agency has jurisdiction',
      'Consult with worker advocacy organization',
    ],
    filingAgencies: [],
  },
};

// === Storage ===

import { db } from '../db/database';

export async function submitIncident(incident: Omit<WorkerIncident, 'id' | 'submitterToken' | 'dateReported' | 'status' | 'verificationLevel'>): Promise<string> {
  const id = `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const submitterToken = await generateAnonymousToken();
  
  const fullIncident: WorkerIncident = {
    ...incident,
    id,
    submitterToken,
    dateReported: new Date(),
    status: 'submitted',
    verificationLevel: 'unverified',
    tags: incident.tags || [],
    evidence: incident.evidence || [],
  };
  
  await db.table('workerIncidents').put(fullIncident);
  return id;
}

export async function getIncidents(filters?: {
  state?: string;
  operator?: string;
  type?: IncidentType;
  status?: IncidentStatus;
  startDate?: Date;
  endDate?: Date;
}): Promise<WorkerIncident[]> {
  try {
    let query = db.table('workerIncidents').toCollection();
    
    const incidents = await query.toArray();
    
    return incidents.filter(incident => {
      if (filters?.state && incident.facility?.state !== filters.state) return false;
      if (filters?.operator && incident.facility?.operator !== filters.operator) return false;
      if (filters?.type && incident.incidentType !== filters.type) return false;
      if (filters?.status && incident.status !== filters.status) return false;
      if (filters?.startDate && new Date(incident.dateOccurred) < filters.startDate) return false;
      if (filters?.endDate && new Date(incident.dateOccurred) > filters.endDate) return false;
      return true;
    });
  } catch {
    return [];
  }
}

export async function getIncidentsByFacility(facilityId: string): Promise<WorkerIncident[]> {
  try {
    return await db.table('workerIncidents')
      .filter(incident => incident.facility?.id === facilityId)
      .toArray();
  } catch {
    return [];
  }
}

export async function getIncidentsByContractor(contractor: string): Promise<WorkerIncident[]> {
  try {
    return await db.table('workerIncidents')
      .filter(incident => 
        incident.contractor?.toLowerCase().includes(contractor.toLowerCase()) ||
        incident.staffingAgency?.toLowerCase().includes(contractor.toLowerCase())
      )
      .toArray();
  } catch {
    return [];
  }
}

// === Pattern Detection ===

export async function detectPatterns(): Promise<PatternFlag[]> {
  const incidents = await getIncidents();
  const patterns: PatternFlag[] = [];
  
  // Pattern 1: Same contractor, multiple incidents
  const byContractor: Record<string, WorkerIncident[]> = {};
  for (const incident of incidents) {
    if (incident.contractor) {
      if (!byContractor[incident.contractor]) byContractor[incident.contractor] = [];
      byContractor[incident.contractor].push(incident);
    }
  }
  
  for (const [contractor, contractorIncidents] of Object.entries(byContractor)) {
    if (contractorIncidents.length >= 3) {
      patterns.push({
        type: 'repeat-contractor',
        description: `${contractor} has ${contractorIncidents.length} reported incidents across facilities`,
        relatedIncidents: contractorIncidents.map(i => i.id),
        confidence: Math.min(0.9, 0.5 + (contractorIncidents.length * 0.1)),
      });
    }
  }
  
  // Pattern 2: Same facility, multiple incidents
  const byFacility: Record<string, WorkerIncident[]> = {};
  for (const incident of incidents) {
    if (incident.facility?.name) {
      const key = `${incident.facility.name}-${incident.facility.state}`;
      if (!byFacility[key]) byFacility[key] = [];
      byFacility[key].push(incident);
    }
  }
  
  for (const [facility, facilityIncidents] of Object.entries(byFacility)) {
    if (facilityIncidents.length >= 2) {
      patterns.push({
        type: 'repeat-facility',
        description: `${facility} has ${facilityIncidents.length} reported incidents`,
        relatedIncidents: facilityIncidents.map(i => i.id),
        confidence: Math.min(0.85, 0.4 + (facilityIncidents.length * 0.15)),
      });
    }
  }
  
  // Pattern 3: Same incident type, same operator
  const byOperatorType: Record<string, WorkerIncident[]> = {};
  for (const incident of incidents) {
    if (incident.facility?.operator) {
      const key = `${incident.facility.operator}-${incident.incidentType}`;
      if (!byOperatorType[key]) byOperatorType[key] = [];
      byOperatorType[key].push(incident);
    }
  }
  
  for (const [key, typeIncidents] of Object.entries(byOperatorType)) {
    if (typeIncidents.length >= 3) {
      const [operator, type] = key.split('-');
      patterns.push({
        type: 'systematic-issue',
        description: `${operator} has systematic ${type} issues (${typeIncidents.length} incidents)`,
        relatedIncidents: typeIncidents.map(i => i.id),
        confidence: Math.min(0.95, 0.6 + (typeIncidents.length * 0.1)),
      });
    }
  }
  
  return patterns;
}

// === Analytics ===

export async function getIncidentStats(): Promise<{
  total: number;
  byType: Record<IncidentType, number>;
  byStatus: Record<IncidentStatus, number>;
  bySeverity: Record<string, number>;
  byState: Record<string, number>;
  byOperator: Record<string, number>;
  recentTrend: { date: string; count: number }[];
}> {
  const incidents = await getIncidents();
  
  const byType: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};
  const byState: Record<string, number> = {};
  const byOperator: Record<string, number> = {};
  
  for (const incident of incidents) {
    byType[incident.incidentType] = (byType[incident.incidentType] || 0) + 1;
    byStatus[incident.status] = (byStatus[incident.status] || 0) + 1;
    bySeverity[incident.severity] = (bySeverity[incident.severity] || 0) + 1;
    
    if (incident.facility?.state) {
      byState[incident.facility.state] = (byState[incident.facility.state] || 0) + 1;
    }
    if (incident.facility?.operator) {
      byOperator[incident.facility.operator] = (byOperator[incident.facility.operator] || 0) + 1;
    }
  }
  
  // Calculate 30-day trend
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  
  const recentIncidents = incidents.filter(i => new Date(i.dateReported) >= thirtyDaysAgo);
  const byDate: Record<string, number> = {};
  
  for (const incident of recentIncidents) {
    const date = new Date(incident.dateReported).toISOString().split('T')[0];
    byDate[date] = (byDate[date] || 0) + 1;
  }
  
  const recentTrend = Object.entries(byDate)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
  
  return {
    total: incidents.length,
    byType: byType as Record<IncidentType, number>,
    byStatus: byStatus as Record<IncidentStatus, number>,
    bySeverity,
    byState,
    byOperator,
    recentTrend,
  };
}

// === Export for Agencies ===

export function generateOSHAComplaint(incident: WorkerIncident): string {
  return `OSHA Online Complaint Form Data

WORKPLACE INFORMATION:
Employer Name: ${incident.facility?.operator || 'Unknown'}
Workplace Address: ${incident.facility?.address || `${incident.facility?.city}, ${incident.facility?.state}`}
Type of Business: Data Center Operations

HAZARD DESCRIPTION:
${incident.description}

Type of Hazard: ${INCIDENT_TYPES[incident.incidentType]?.label || incident.incidentType}
${incident.incidentSubtype ? `Specific Issue: ${incident.incidentSubtype}` : ''}

Date hazard observed: ${new Date(incident.dateOccurred).toLocaleDateString()}
Is hazard ongoing: ${incident.ongoing ? 'Yes' : 'No'}
Number of workers affected: ${incident.workersAffected || 'Unknown'}

WORKER STATUS:
Employment type: ${incident.employmentType}
${incident.contractor ? `Contractor: ${incident.contractor}` : ''}
${incident.staffingAgency ? `Staffing Agency: ${incident.staffingAgency}` : ''}

EVIDENCE:
${incident.evidence.length > 0 ? incident.evidence.map(e => `- ${e.type}: ${e.filename}`).join('\n') : 'No evidence attached'}

---
Generated by DCIM Compliance Dashboard
This form should be submitted at: https://www.osha.gov/workers/file-complaint
`;
}

export function generateNLRBCharge(incident: WorkerIncident): string {
  return `NLRB Unfair Labor Practice Charge Information

EMPLOYER INFORMATION:
Name: ${incident.facility?.operator || 'Unknown'}
Address: ${incident.facility?.address || `${incident.facility?.city}, ${incident.facility?.state}`}
Type of Business: Data Center Operations

CHARGE DETAILS:
Type: ${INCIDENT_TYPES[incident.incidentType]?.label || incident.incidentType}

Description of Unfair Labor Practice:
${incident.description}

Date(s) of occurrence: ${new Date(incident.dateOccurred).toLocaleDateString()}
${incident.ongoing ? '(Ongoing violation)' : ''}

CHARGING PARTY STATUS:
Employment type: ${incident.employmentType}
${incident.contractor ? `Employer contractor: ${incident.contractor}` : ''}

Number of workers affected: ${incident.workersAffected || 'Unknown'}
Witnesses available: ${incident.witnesses || 'Unknown'}

---
Generated by DCIM Compliance Dashboard
File charge at: https://www.nlrb.gov/about-nlrb/what-we-do/investigate-charges
IMPORTANT: NLRB charges must be filed within 6 months of the violation.
`;
}

// === Helper Functions ===

async function generateAnonymousToken(): Promise<string> {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

