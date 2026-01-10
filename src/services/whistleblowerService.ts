/**
 * Whistleblower Portal Service
 * 
 * Secure reporting channel for data center workers to report:
 * - Safety hazards (OSHA jurisdiction)
 * - Environmental violations (EPA jurisdiction)
 * - Labor law violations (NLRB/DOL jurisdiction)
 * - Network security incidents (CISA)
 * 
 * Inspired by maritime whistleblower protections (Seaman's Protection Act)
 */

// =============================================================================
// TYPES
// =============================================================================

export type ReportCategory = 
  | 'safety'           // OSHA - Occupational Safety
  | 'environmental'    // EPA - Environmental Protection
  | 'labor'           // NLRB/DOL - Labor Law
  | 'securities'      // SEC - Securities Fraud
  | 'infrastructure'  // CISA - Critical Infrastructure
  | 'network'         // Multi-agency - Network Security
  | 'retaliation';    // OSHA 11(c) - Whistleblower Retaliation

export type AnonymityLevel = 
  | 'anonymous'       // No contact info collected
  | 'confidential'    // Identity protected, agency can contact
  | 'public';         // Willing to be identified/testify

export type ReportSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface WhistleblowerReport {
  id: string;
  createdAt: string;
  
  // Category and jurisdiction
  category: ReportCategory;
  suggestedAgency: string;
  
  // Facility info
  facility: {
    name: string;
    operator: string;
    location: string;
    facilityId?: number;
  };
  
  // Incident details
  incident: {
    date: string;
    description: string;
    severity: ReportSeverity;
    ongoingRisk: boolean;
    witnessCount: number;
  };
  
  // Evidence
  evidence: {
    files: EvidenceFile[];
    hasPhotoVideo: boolean;
    hasDocuments: boolean;
    hasWitnesses: boolean;
  };
  
  // Reporter info (based on anonymity level)
  reporter: {
    anonymityLevel: AnonymityLevel;
    contactMethod?: 'email' | 'phone' | 'signal' | 'none';
    contactInfo?: string; // Encrypted
    isCurrentEmployee: boolean;
    position?: string;
    employmentDuration?: string;
  };
  
  // Union support
  unionNotification: {
    notifyUnion: boolean;
    unions: string[];
  };
  
  // Submission metadata
  submission: {
    ipHash?: string; // Hashed, not stored
    userAgent?: string;
    submissionHash: string; // SHA-256 for integrity
  };
}

export interface EvidenceFile {
  id: string;
  name: string;
  type: string;
  size: number;
  sha256Hash: string;
  uploadedAt: string;
  description?: string;
}

export interface AgencyInfo {
  id: string;
  name: string;
  fullName: string;
  jurisdiction: string;
  reportTypes: ReportCategory[];
  website: string;
  reportingUrl: string;
  phone: string;
  protections: string[];
  responseTime: string;
}

export interface ProtectionInfo {
  statute: string;
  description: string;
  coverage: string;
  remedies: string[];
  filingDeadline: string;
  enforcer: string;
}

// =============================================================================
// AGENCY DATABASE
// =============================================================================

export const REGULATORY_AGENCIES: AgencyInfo[] = [
  {
    id: 'osha',
    name: 'OSHA',
    fullName: 'Occupational Safety and Health Administration',
    jurisdiction: 'Workplace safety and health',
    reportTypes: ['safety', 'retaliation'],
    website: 'https://www.osha.gov',
    reportingUrl: 'https://www.osha.gov/workers/file-complaint',
    phone: '1-800-321-OSHA (6742)',
    protections: [
      'Section 11(c) whistleblower protection',
      'Reinstatement with back pay',
      'Protection from retaliation',
      'Confidential complaint process',
    ],
    responseTime: 'Critical hazards: 24 hours; Other: 30 days',
  },
  {
    id: 'epa',
    name: 'EPA',
    fullName: 'Environmental Protection Agency',
    jurisdiction: 'Environmental law compliance',
    reportTypes: ['environmental'],
    website: 'https://www.epa.gov',
    reportingUrl: 'https://www.epa.gov/tips',
    phone: '1-888-372-7341',
    protections: [
      'Clean Air Act Section 7622',
      'Clean Water Act Section 507',
      'CERCLA Section 110',
      'Multiple environmental statutes',
    ],
    responseTime: 'Emergency: immediate; Other: varies by statute',
  },
  {
    id: 'nlrb',
    name: 'NLRB',
    fullName: 'National Labor Relations Board',
    jurisdiction: 'Union organizing and unfair labor practices',
    reportTypes: ['labor'],
    website: 'https://www.nlrb.gov',
    reportingUrl: 'https://www.nlrb.gov/about-nlrb/what-we-do/investigate-charges',
    phone: '1-866-667-NLRB (6572)',
    protections: [
      'Section 7 rights protection',
      'Anti-retaliation provisions',
      'Reinstatement remedies',
      'Back pay awards',
    ],
    responseTime: 'Initial investigation: 7-14 weeks',
  },
  {
    id: 'dol-whd',
    name: 'DOL-WHD',
    fullName: 'Department of Labor - Wage and Hour Division',
    jurisdiction: 'Wage theft, overtime, misclassification',
    reportTypes: ['labor'],
    website: 'https://www.dol.gov/agencies/whd',
    reportingUrl: 'https://www.dol.gov/agencies/whd/contact/complaints',
    phone: '1-866-487-9243',
    protections: [
      'FLSA anti-retaliation (Section 15(a)(3))',
      'Back wages recovery',
      'Liquidated damages',
      'Protection from discharge',
    ],
    responseTime: 'Complaint acknowledgment: 5 days',
  },
  {
    id: 'sec',
    name: 'SEC',
    fullName: 'Securities and Exchange Commission',
    jurisdiction: 'Securities fraud and financial misconduct',
    reportTypes: ['securities'],
    website: 'https://www.sec.gov',
    reportingUrl: 'https://www.sec.gov/whistleblower',
    phone: '1-833-732-2297',
    protections: [
      'Dodd-Frank whistleblower program',
      'Monetary awards (10-30% of sanctions)',
      'Anti-retaliation protection',
      'Confidentiality provisions',
    ],
    responseTime: 'Award decisions: 6-24 months after enforcement',
  },
  {
    id: 'cisa',
    name: 'CISA',
    fullName: 'Cybersecurity and Infrastructure Security Agency',
    jurisdiction: 'Critical infrastructure protection',
    reportTypes: ['infrastructure', 'network'],
    website: 'https://www.cisa.gov',
    reportingUrl: 'https://www.cisa.gov/report',
    phone: '1-888-282-0870',
    protections: [
      'Critical infrastructure protection act',
      'Information sharing protections',
      'Limited liability for good-faith reports',
    ],
    responseTime: 'Critical incidents: immediate response',
  },
];

// =============================================================================
// WHISTLEBLOWER PROTECTIONS DATABASE
// =============================================================================

export const WHISTLEBLOWER_PROTECTIONS: ProtectionInfo[] = [
  {
    statute: 'OSHA Section 11(c)',
    description: 'General protection for workers who report safety hazards or exercise safety rights',
    coverage: 'All private sector employees under OSHA jurisdiction',
    remedies: [
      'Reinstatement to former position',
      'Back pay with interest',
      'Compensatory damages',
      'Attorneys fees and costs',
    ],
    filingDeadline: '30 days from adverse action',
    enforcer: 'OSHA',
  },
  {
    statute: 'National Labor Relations Act Section 8(a)(4)',
    description: 'Protection for workers who file charges or testify in NLRB proceedings',
    coverage: 'Private sector employees (excluding supervisors)',
    remedies: [
      'Reinstatement',
      'Back pay',
      'Posting of notice',
      'Cease and desist order',
    ],
    filingDeadline: '6 months from unfair labor practice',
    enforcer: 'NLRB',
  },
  {
    statute: 'Clean Air Act Section 7622',
    description: 'Protection for workers who report CAA violations or participate in proceedings',
    coverage: 'Employees who report air pollution violations',
    remedies: [
      'Reinstatement',
      'Back pay',
      'Compensatory damages',
      'Abatement of violation',
    ],
    filingDeadline: '30 days from adverse action',
    enforcer: 'OSHA (delegated by EPA)',
  },
  {
    statute: 'Dodd-Frank Act Section 922',
    description: 'SEC whistleblower program with monetary awards',
    coverage: 'Any person with original information about securities violations',
    remedies: [
      '10-30% of monetary sanctions over $1M',
      'Employment retaliation protection',
      'Double back pay',
      'Reinstatement',
    ],
    filingDeadline: '6 years for retaliation claims',
    enforcer: 'SEC',
  },
  {
    statute: 'Sarbanes-Oxley Section 806',
    description: 'Protection for employees of public companies reporting fraud',
    coverage: 'Employees of publicly traded companies',
    remedies: [
      'Reinstatement',
      'Back pay with interest',
      'Compensatory damages',
      'Attorneys fees',
    ],
    filingDeadline: '180 days from adverse action',
    enforcer: 'OSHA (initial), DOL ALJ (hearing)',
  },
];

// =============================================================================
// SECURITY UTILITIES
// =============================================================================

/**
 * Generate SHA-256 hash for evidence integrity
 */
export async function hashFile(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate report ID
 */
export function generateReportId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `WB-${timestamp}-${randomPart}`.toUpperCase();
}

/**
 * Hash submission for integrity verification
 */
export async function hashSubmission(report: Partial<WhistleblowerReport>): Promise<string> {
  const content = JSON.stringify({
    category: report.category,
    facility: report.facility,
    incident: report.incident,
    timestamp: new Date().toISOString(),
  });
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// =============================================================================
// REPORT GENERATION
// =============================================================================

/**
 * Get suggested agency based on report category
 */
export function getSuggestedAgency(category: ReportCategory): AgencyInfo | undefined {
  return REGULATORY_AGENCIES.find(a => a.reportTypes.includes(category));
}

/**
 * Get all applicable protections for a report
 */
export function getApplicableProtections(category: ReportCategory): ProtectionInfo[] {
  const protectionMap: Record<ReportCategory, string[]> = {
    safety: ['OSHA Section 11(c)'],
    environmental: ['Clean Air Act Section 7622'],
    labor: ['National Labor Relations Act Section 8(a)(4)'],
    securities: ['Dodd-Frank Act Section 922', 'Sarbanes-Oxley Section 806'],
    infrastructure: ['OSHA Section 11(c)'],
    network: ['OSHA Section 11(c)'],
    retaliation: ['OSHA Section 11(c)', 'National Labor Relations Act Section 8(a)(4)'],
  };
  
  const applicable = protectionMap[category] || [];
  return WHISTLEBLOWER_PROTECTIONS.filter(p => applicable.includes(p.statute));
}

/**
 * Generate external report URL for agency
 */
export function getAgencyReportUrl(agencyId: string): string {
  const agency = REGULATORY_AGENCIES.find(a => a.id === agencyId);
  return agency?.reportingUrl || '';
}

/**
 * Determine severity based on incident details
 */
export function determineSeverity(
  isOngoing: boolean,
  hasImmediateRisk: boolean,
  affectedWorkers: number
): ReportSeverity {
  if (hasImmediateRisk || (isOngoing && affectedWorkers > 10)) {
    return 'critical';
  }
  if (isOngoing || affectedWorkers > 5) {
    return 'high';
  }
  if (affectedWorkers > 1) {
    return 'medium';
  }
  return 'low';
}

/**
 * Create a new whistleblower report
 */
export async function createReport(
  category: ReportCategory,
  facility: WhistleblowerReport['facility'],
  incident: Omit<WhistleblowerReport['incident'], 'severity'> & { severity?: ReportSeverity },
  reporter: WhistleblowerReport['reporter'],
  evidence: Omit<WhistleblowerReport['evidence'], 'files'>,
  unionNotification: WhistleblowerReport['unionNotification']
): Promise<WhistleblowerReport> {
  const id = generateReportId();
  const suggestedAgency = getSuggestedAgency(category);
  
  const report: WhistleblowerReport = {
    id,
    createdAt: new Date().toISOString(),
    category,
    suggestedAgency: suggestedAgency?.name || 'Multiple',
    facility,
    incident: {
      ...incident,
      severity: incident.severity || determineSeverity(
        incident.ongoingRisk,
        incident.ongoingRisk,
        incident.witnessCount
      ),
    },
    reporter,
    evidence: {
      ...evidence,
      files: [],
    },
    unionNotification,
    submission: {
      submissionHash: await hashSubmission({ category, facility, incident }),
    },
  };
  
  return report;
}

/**
 * Get unions to notify based on location/trade
 */
export function getUnionsToNotify(state: string): string[] {
  const unionsByState: Record<string, string[]> = {
    'VA': ['CWA Local 2201', 'IBEW Local 26'],
    'MD': ['CWA Local 2108', 'IBEW Local 26'],
    'DC': ['CWA Local 2336', 'IBEW Local 26'],
    'TX': ['CWA Local 6215', 'IBEW Local 20'],
    'AZ': ['CWA Local 7019', 'IBEW Local 640'],
    'GA': ['CWA Local 3204', 'IBEW Local 613'],
    'IL': ['CWA Local 4250', 'IBEW Local 134'],
  };
  
  return unionsByState[state] || ['CODE-CWA National'];
}

/**
 * Generate retaliation warning text
 */
export function getRetaliationWarning(): string {
  return `
⚠️ RETALIATION PROTECTION NOTICE

Filing this report is protected activity under federal and state law. If you experience any adverse action as a result of filing this report, including:

• Termination or suspension
• Demotion or reduction in pay
• Transfer to less desirable position
• Threats or intimidation
• Negative performance reviews
• Exclusion from meetings or projects

You should:

1. Document all incidents in writing with dates, times, and witnesses
2. Preserve all evidence (emails, texts, performance reviews)
3. File a retaliation complaint within the statutory deadline
4. Contact a union representative or employment attorney
5. Report to the same agency where you filed the original complaint

Deadlines for retaliation claims are short (often 30-180 days), so act quickly if you experience retaliation.

Legal Resources:
• National Employment Law Project: nelp.org
• Government Accountability Project: whistleblower.org
• National Whistleblower Center: whistleblowers.org
`.trim();
}

/**
 * Generate evidence handling guidelines
 */
export function getEvidenceGuidelines(): string {
  return `
📋 EVIDENCE HANDLING GUIDELINES

To ensure your evidence can be used in investigations and potential legal proceedings, follow these guidelines:

DIGITAL EVIDENCE:
• Take screenshots with visible timestamps
• Preserve original files (don't edit)
• Note file metadata (creation date, author)
• Use SHA-256 hashing to prove integrity
• Store copies in multiple secure locations

DOCUMENTS:
• Photograph/scan original documents
• Preserve originals if possible
• Note where and when you obtained them
• Don't remove company property without authorization

WITNESS INFORMATION:
• Record names and contact info of witnesses
• Note their position and what they observed
• Ask if they're willing to provide statements
• Don't pressure anyone to participate

CHAIN OF CUSTODY:
• Document when you created/obtained evidence
• Note any copies made and to whom
• Keep a log of who has accessed evidence
• Store securely with limited access

For FRE 902(13)-(14) compliance, all digital evidence should be hashed using SHA-256 and the hash recorded at the time of collection.
`.trim();
}

// =============================================================================
// REPORT CATEGORIES METADATA
// =============================================================================

export const REPORT_CATEGORIES: Record<ReportCategory, {
  name: string;
  description: string;
  examples: string[];
  agency: string;
  icon: string;
}> = {
  safety: {
    name: 'Safety Hazard',
    description: 'Workplace safety violations that could cause injury or death',
    examples: [
      'Disabled fire suppression during maintenance',
      'Arc flash hazards without proper PPE',
      'Blocked emergency exits',
      'Heat stress without adequate breaks',
      'Improper lockout/tagout procedures',
    ],
    agency: 'OSHA',
    icon: '⚠️',
  },
  environmental: {
    name: 'Environmental Violation',
    description: 'Violations of environmental laws affecting air, water, or soil',
    examples: [
      'Unpermitted diesel generator emissions',
      'Improper cooling water discharge',
      'Hazardous waste storage violations',
      'Unreported chemical spills',
      'Excessive noise beyond permitted levels',
    ],
    agency: 'EPA',
    icon: '🌍',
  },
  labor: {
    name: 'Labor Law Violation',
    description: 'Violations of worker rights, wages, or organizing rights',
    examples: [
      'Retaliation for union organizing',
      'Wage theft or unpaid overtime',
      'Contractor misclassification',
      'Interference with protected concerted activity',
      'Unlawful interrogation about union support',
    ],
    agency: 'NLRB / DOL',
    icon: '⚖️',
  },
  securities: {
    name: 'Securities Fraud',
    description: 'Financial fraud affecting publicly traded companies',
    examples: [
      'Misrepresentation of facility capacity',
      'Hidden environmental liabilities',
      'Fraudulent job creation claims for subsidies',
      'Undisclosed regulatory violations',
      'Accounting irregularities',
    ],
    agency: 'SEC',
    icon: '💰',
  },
  infrastructure: {
    name: 'Critical Infrastructure Risk',
    description: 'Threats to critical infrastructure security or resilience',
    examples: [
      'Physical security vulnerabilities',
      'Inadequate backup power systems',
      'Network single points of failure',
      'Insufficient disaster recovery',
      'Cybersecurity gaps',
    ],
    agency: 'CISA',
    icon: '🔒',
  },
  network: {
    name: 'Network Security Incident',
    description: 'Cybersecurity incidents or vulnerabilities',
    examples: [
      'BGP hijacking or route leaks',
      'DDoS attack patterns',
      'Unauthorized access attempts',
      'Unpatched critical vulnerabilities',
      'Data exfiltration',
    ],
    agency: 'CISA / FBI',
    icon: '🌐',
  },
  retaliation: {
    name: 'Whistleblower Retaliation',
    description: 'Adverse action taken against someone who reported violations',
    examples: [
      'Fired after reporting safety hazard',
      'Demoted after filing NLRB charge',
      'Negative review after raising concerns',
      'Excluded from meetings after speaking up',
      'Schedule changes as punishment',
    ],
    agency: 'OSHA / Original Agency',
    icon: '🛡️',
  },
};

