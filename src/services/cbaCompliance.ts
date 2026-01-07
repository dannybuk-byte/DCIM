/**
 * Community Benefits Agreement (CBA) Compliance Monitor
 * 
 * Track CBA commitments vs. actual delivery.
 * Companies promise local hiring, prevailing wages, community funds -
 * then often fail to deliver. This service tracks the gaps.
 */

// === Types ===

export interface CommunityBenefitsAgreement {
  id: string;
  
  // Parties
  company: string;
  parentCompany?: string;
  communityPartners: string[];
  governmentParties: string[];
  
  // Agreement details
  title: string;
  facilityName: string;
  facilityAddress: string;
  city: string;
  state: string;
  signedDate: Date;
  effectiveDate: Date;
  expirationDate?: Date;
  
  // Document
  documentUrl?: string;
  documentHash?: string; // For integrity verification
  
  // Commitments
  commitments: CBACommitment[];
  
  // Status
  status: 'active' | 'expired' | 'terminated' | 'in-dispute';
  overallComplianceScore?: number; // 0-100
  lastReviewDate?: Date;
  
  // Verification
  verificationMethod: 'self-reported' | 'third-party-audit' | 'public-records' | 'community-verified';
  auditor?: string;
  
  // Notes
  notes: string[];
  disputes: CBADispute[];
}

export interface CBACommitment {
  id: string;
  category: CommitmentCategory;
  description: string;
  metric: string;
  targetValue: number | string;
  targetDate?: Date;
  isOngoing: boolean;
  
  // Progress
  currentValue?: number | string;
  lastUpdated?: Date;
  status: CommitmentStatus;
  percentComplete?: number;
  
  // Evidence
  evidenceRequired: string[];
  evidenceProvided: CommitmentEvidence[];
  
  // Verification
  verificationStatus: 'unverified' | 'verified' | 'disputed';
  verifiedBy?: string;
  verifiedDate?: Date;
}

export type CommitmentCategory =
  | 'local-hiring'
  | 'prevailing-wages'
  | 'apprenticeship'
  | 'local-procurement'
  | 'community-fund'
  | 'environmental'
  | 'infrastructure'
  | 'education-training'
  | 'affordable-housing'
  | 'first-source-hiring'
  | 'union-neutrality'
  | 'living-wage'
  | 'health-benefits'
  | 'other';

export type CommitmentStatus =
  | 'not-started'
  | 'in-progress'
  | 'on-track'
  | 'at-risk'
  | 'behind-schedule'
  | 'met'
  | 'exceeded'
  | 'failed'
  | 'waived';

export interface CommitmentEvidence {
  id: string;
  type: 'document' | 'report' | 'audit' | 'community-report' | 'news-article' | 'government-filing';
  title: string;
  description?: string;
  url?: string;
  dateSubmitted: Date;
  submittedBy: string;
  verified: boolean;
}

export interface CBADispute {
  id: string;
  commitmentId?: string;
  raisedBy: string;
  raisedDate: Date;
  description: string;
  status: 'open' | 'investigating' | 'resolved' | 'escalated';
  resolution?: string;
  resolvedDate?: Date;
}

// === Commitment Category Definitions ===

export const COMMITMENT_CATEGORIES: Record<CommitmentCategory, {
  label: string;
  description: string;
  typicalMetrics: string[];
  verificationMethods: string[];
}> = {
  'local-hiring': {
    label: 'Local Hiring',
    description: 'Commitment to hire workers from the local community',
    typicalMetrics: [
      '% of workforce from local zip codes',
      'Number of local hires',
      'Local hiring goals by trade',
    ],
    verificationMethods: [
      'Employee address verification',
      'Quarterly hiring reports',
      'Third-party audit',
    ],
  },
  'prevailing-wages': {
    label: 'Prevailing Wages',
    description: 'Commitment to pay prevailing or living wages',
    typicalMetrics: [
      'Minimum hourly wage',
      'Wage comparison to area median',
      'Benefits value included',
    ],
    verificationMethods: [
      'Certified payroll records',
      'DOL wage surveys',
      'Union contract verification',
    ],
  },
  'apprenticeship': {
    label: 'Apprenticeship Programs',
    description: 'Commitment to hire and train apprentices',
    typicalMetrics: [
      '% of workforce as apprentices',
      'Number of apprenticeship completions',
      'Partnerships with training programs',
    ],
    verificationMethods: [
      'Apprenticeship program records',
      'Joint training committee reports',
      'Completion certificates',
    ],
  },
  'local-procurement': {
    label: 'Local Procurement',
    description: 'Commitment to purchase from local businesses',
    typicalMetrics: [
      '% of contracts to local businesses',
      'Dollar amount to MBE/WBE firms',
      'Local supplier count',
    ],
    verificationMethods: [
      'Purchasing records',
      'Vendor certification verification',
      'Annual spending reports',
    ],
  },
  'community-fund': {
    label: 'Community Fund',
    description: 'Direct financial contributions to community',
    typicalMetrics: [
      'Total fund contribution',
      'Annual payment amounts',
      'Payment schedule compliance',
    ],
    verificationMethods: [
      'Bank records',
      'Fund accounting statements',
      'Payment receipts',
    ],
  },
  'environmental': {
    label: 'Environmental Commitments',
    description: 'Environmental protection and sustainability measures',
    typicalMetrics: [
      'Renewable energy percentage',
      'Water usage reduction',
      'Carbon offset purchases',
    ],
    verificationMethods: [
      'Utility records',
      'Environmental audits',
      'Renewable energy certificates',
    ],
  },
  'infrastructure': {
    label: 'Infrastructure Improvements',
    description: 'Road, utility, and public infrastructure investments',
    typicalMetrics: [
      'Dollar amount invested',
      'Infrastructure projects completed',
      'Timeline adherence',
    ],
    verificationMethods: [
      'Project completion certificates',
      'Government inspection records',
      'Engineering reports',
    ],
  },
  'education-training': {
    label: 'Education & Training',
    description: 'Investment in local education and workforce training',
    typicalMetrics: [
      'Scholarship fund size',
      'Training program participants',
      'School partnership programs',
    ],
    verificationMethods: [
      'Scholarship disbursement records',
      'Training completion records',
      'School partnership agreements',
    ],
  },
  'affordable-housing': {
    label: 'Affordable Housing',
    description: 'Contributions to affordable housing development',
    typicalMetrics: [
      'Housing fund contributions',
      'Units supported',
      'Partnership projects',
    ],
    verificationMethods: [
      'Housing authority records',
      'Fund contribution receipts',
      'Project completion records',
    ],
  },
  'first-source-hiring': {
    label: 'First Source Hiring',
    description: 'Priority hiring from targeted communities or programs',
    typicalMetrics: [
      'First source referrals received',
      'First source hires made',
      'Interview rates for first source candidates',
    ],
    verificationMethods: [
      'Referral records',
      'Hiring records by source',
      'Partnership agency reports',
    ],
  },
  'union-neutrality': {
    label: 'Union Neutrality',
    description: 'Commitment to remain neutral during organizing',
    typicalMetrics: [
      'No anti-union activity documented',
      'Card check recognition included',
      'Labor peace agreement in place',
    ],
    verificationMethods: [
      'NLRB records check',
      'Union verification',
      'Worker testimonials',
    ],
  },
  'living-wage': {
    label: 'Living Wage',
    description: 'Commitment to pay above minimum living wage',
    typicalMetrics: [
      'Minimum wage rate',
      'Comparison to living wage calculator',
      'Annual wage increase commitment',
    ],
    verificationMethods: [
      'Payroll records',
      'Annual wage surveys',
      'Third-party audit',
    ],
  },
  'health-benefits': {
    label: 'Health Benefits',
    description: 'Healthcare coverage for workers',
    typicalMetrics: [
      '% of workers with health coverage',
      'Employer premium contribution',
      'Coverage quality (bronze/silver/gold)',
    ],
    verificationMethods: [
      'Benefits enrollment records',
      'Insurance carrier verification',
      'Worker surveys',
    ],
  },
  'other': {
    label: 'Other Commitments',
    description: 'Other specific commitments not categorized above',
    typicalMetrics: [],
    verificationMethods: ['Custom verification required'],
  },
};

// === Sample CBAs ===

export const KNOWN_CBAS: CommunityBenefitsAgreement[] = [
  {
    id: 'google-mayes-2022',
    company: 'Google',
    parentCompany: 'Alphabet',
    communityPartners: ['Mayes County Economic Development', 'Local Schools Coalition'],
    governmentParties: ['Mayes County, Oklahoma'],
    title: 'Google Mayes County Data Center Community Agreement',
    facilityName: 'Google Mayes County Data Center',
    facilityAddress: 'Pryor, OK 74361',
    city: 'Pryor',
    state: 'Oklahoma',
    signedDate: new Date('2022-06-15'),
    effectiveDate: new Date('2022-07-01'),
    status: 'active',
    verificationMethod: 'self-reported',
    commitments: [
      {
        id: 'google-mayes-1',
        category: 'community-fund',
        description: 'Annual contribution to Mayes County community fund',
        metric: 'Annual payment amount',
        targetValue: 1000000,
        isOngoing: true,
        status: 'in-progress',
        evidenceRequired: ['Annual payment receipts', 'Fund accounting'],
        evidenceProvided: [],
        verificationStatus: 'unverified',
      },
      {
        id: 'google-mayes-2',
        category: 'local-hiring',
        description: 'Local workforce percentage commitment',
        metric: '% of workforce from Mayes County',
        targetValue: '25%',
        isOngoing: true,
        status: 'in-progress',
        evidenceRequired: ['Quarterly hiring reports', 'Employee residence verification'],
        evidenceProvided: [],
        verificationStatus: 'unverified',
      },
      {
        id: 'google-mayes-3',
        category: 'education-training',
        description: 'STEM education investment in local schools',
        metric: 'Annual STEM program investment',
        targetValue: 500000,
        isOngoing: true,
        status: 'in-progress',
        evidenceRequired: ['Grant disbursement records', 'Program participation data'],
        evidenceProvided: [],
        verificationStatus: 'unverified',
      },
    ],
    notes: [],
    disputes: [],
  },
  {
    id: 'meta-new-albany-2021',
    company: 'Meta',
    communityPartners: ['New Albany Community Foundation', 'Franklin County Jobs Corps'],
    governmentParties: ['City of New Albany', 'Franklin County, Ohio'],
    title: 'Meta New Albany Campus Community Benefits Agreement',
    facilityName: 'Meta New Albany Data Center',
    facilityAddress: 'New Albany, OH 43054',
    city: 'New Albany',
    state: 'Ohio',
    signedDate: new Date('2021-03-10'),
    effectiveDate: new Date('2021-04-01'),
    status: 'active',
    verificationMethod: 'self-reported',
    commitments: [
      {
        id: 'meta-na-1',
        category: 'community-fund',
        description: 'Community impact fund over 10 years',
        metric: 'Total fund commitment',
        targetValue: 10000000,
        isOngoing: true,
        status: 'in-progress',
        percentComplete: 30,
        evidenceRequired: ['Annual payment verification', 'Fund distribution reports'],
        evidenceProvided: [],
        verificationStatus: 'unverified',
      },
      {
        id: 'meta-na-2',
        category: 'local-procurement',
        description: 'Local and diverse business procurement target',
        metric: '% of operational spending to local/diverse businesses',
        targetValue: '15%',
        isOngoing: true,
        status: 'at-risk',
        currentValue: '8%',
        evidenceRequired: ['Procurement reports', 'Vendor certifications'],
        evidenceProvided: [],
        verificationStatus: 'unverified',
      },
      {
        id: 'meta-na-3',
        category: 'first-source-hiring',
        description: 'First source hiring from Franklin County workforce programs',
        metric: 'First source interviews conducted',
        targetValue: '100% of openings posted to first source',
        isOngoing: true,
        status: 'in-progress',
        evidenceRequired: ['Job posting records', 'Referral tracking'],
        evidenceProvided: [],
        verificationStatus: 'unverified',
      },
    ],
    notes: ['Annual review meeting held Q4'],
    disputes: [],
  },
];

// === Storage ===

import { db } from '../db/database';

export async function saveCBA(cba: CommunityBenefitsAgreement): Promise<void> {
  await db.table('communityBenefitsAgreements').put(cba);
}

export async function getCBAs(): Promise<CommunityBenefitsAgreement[]> {
  try {
    const stored = await db.table('communityBenefitsAgreements').toArray();
    return stored.length > 0 ? stored : KNOWN_CBAS;
  } catch {
    return KNOWN_CBAS;
  }
}

export async function getCBAById(id: string): Promise<CommunityBenefitsAgreement | undefined> {
  try {
    const stored = await db.table('communityBenefitsAgreements').get(id);
    return stored || KNOWN_CBAS.find(c => c.id === id);
  } catch {
    return KNOWN_CBAS.find(c => c.id === id);
  }
}

export async function getCBAsByCompany(company: string): Promise<CommunityBenefitsAgreement[]> {
  const cbas = await getCBAs();
  return cbas.filter(c => 
    c.company.toLowerCase().includes(company.toLowerCase()) ||
    c.parentCompany?.toLowerCase().includes(company.toLowerCase())
  );
}

export async function getCBAsByState(state: string): Promise<CommunityBenefitsAgreement[]> {
  const cbas = await getCBAs();
  return cbas.filter(c => c.state.toLowerCase() === state.toLowerCase());
}

// === Compliance Scoring ===

export function calculateComplianceScore(cba: CommunityBenefitsAgreement): {
  overallScore: number;
  byCategory: Record<CommitmentCategory, number>;
  atRiskCommitments: CBACommitment[];
  failedCommitments: CBACommitment[];
} {
  const byCategory: Record<string, { total: number; completed: number }> = {};
  const atRiskCommitments: CBACommitment[] = [];
  const failedCommitments: CBACommitment[] = [];
  
  for (const commitment of cba.commitments) {
    if (!byCategory[commitment.category]) {
      byCategory[commitment.category] = { total: 0, completed: 0 };
    }
    byCategory[commitment.category].total++;
    
    if (commitment.status === 'met' || commitment.status === 'exceeded') {
      byCategory[commitment.category].completed++;
    } else if (commitment.status === 'at-risk' || commitment.status === 'behind-schedule') {
      atRiskCommitments.push(commitment);
    } else if (commitment.status === 'failed') {
      failedCommitments.push(commitment);
    }
  }
  
  const categoryScores: Record<string, number> = {};
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const [category, stats] of Object.entries(byCategory)) {
    const score = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
    categoryScores[category] = score;
    totalWeight += stats.total;
    weightedSum += score * stats.total;
  }
  
  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;
  
  return {
    overallScore: Math.round(overallScore),
    byCategory: categoryScores as Record<CommitmentCategory, number>,
    atRiskCommitments,
    failedCommitments,
  };
}

// === Analytics ===

export async function getCBAStats(): Promise<{
  total: number;
  byStatus: Record<string, number>;
  byState: Record<string, number>;
  byCompany: Record<string, number>;
  averageComplianceScore: number;
  commitmentsByCategory: Record<CommitmentCategory, number>;
  atRiskCount: number;
  failedCount: number;
}> {
  const cbas = await getCBAs();
  
  const byStatus: Record<string, number> = {};
  const byState: Record<string, number> = {};
  const byCompany: Record<string, number> = {};
  const commitmentsByCategory: Record<string, number> = {};
  let totalScore = 0;
  let atRiskCount = 0;
  let failedCount = 0;
  
  for (const cba of cbas) {
    byStatus[cba.status] = (byStatus[cba.status] || 0) + 1;
    byState[cba.state] = (byState[cba.state] || 0) + 1;
    byCompany[cba.company] = (byCompany[cba.company] || 0) + 1;
    
    const { overallScore, atRiskCommitments, failedCommitments } = calculateComplianceScore(cba);
    totalScore += overallScore;
    atRiskCount += atRiskCommitments.length;
    failedCount += failedCommitments.length;
    
    for (const commitment of cba.commitments) {
      commitmentsByCategory[commitment.category] = (commitmentsByCategory[commitment.category] || 0) + 1;
    }
  }
  
  return {
    total: cbas.length,
    byStatus,
    byState,
    byCompany,
    averageComplianceScore: cbas.length > 0 ? Math.round(totalScore / cbas.length) : 0,
    commitmentsByCategory: commitmentsByCategory as Record<CommitmentCategory, number>,
    atRiskCount,
    failedCount,
  };
}

// === Alerts ===

export interface CBAAlert {
  id: string;
  cbaId: string;
  type: 'deadline-approaching' | 'commitment-at-risk' | 'verification-overdue' | 'new-dispute';
  title: string;
  description: string;
  severity: 'high' | 'medium' | 'low';
  date: Date;
  actionRequired: string;
}

export async function checkCBAAlerts(): Promise<CBAAlert[]> {
  const cbas = await getCBAs();
  const alerts: CBAAlert[] = [];
  const now = new Date();
  
  for (const cba of cbas) {
    // Check for expiring CBAs
    if (cba.expirationDate) {
      const daysUntilExpiration = Math.floor(
        (cba.expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiration <= 90 && daysUntilExpiration > 0) {
        alerts.push({
          id: `expire-${cba.id}`,
          cbaId: cba.id,
          type: 'deadline-approaching',
          title: `${cba.company} CBA expires in ${daysUntilExpiration} days`,
          description: `The ${cba.title} will expire on ${cba.expirationDate.toLocaleDateString()}. Review compliance status and prepare for renegotiation.`,
          severity: daysUntilExpiration <= 30 ? 'high' : 'medium',
          date: now,
          actionRequired: 'Schedule review meeting with community partners',
        });
      }
    }
    
    // Check for at-risk commitments
    for (const commitment of cba.commitments) {
      if (commitment.status === 'at-risk' || commitment.status === 'behind-schedule') {
        alerts.push({
          id: `risk-${commitment.id}`,
          cbaId: cba.id,
          type: 'commitment-at-risk',
          title: `${cba.company}: ${COMMITMENT_CATEGORIES[commitment.category].label} commitment at risk`,
          description: commitment.description,
          severity: 'high',
          date: now,
          actionRequired: 'Request status update from company; prepare escalation if needed',
        });
      }
    }
    
    // Check for overdue verifications
    if (cba.lastReviewDate) {
      const daysSinceReview = Math.floor(
        (now.getTime() - new Date(cba.lastReviewDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceReview > 180) {
        alerts.push({
          id: `review-${cba.id}`,
          cbaId: cba.id,
          type: 'verification-overdue',
          title: `${cba.company} CBA review overdue`,
          description: `Last review was ${daysSinceReview} days ago. Regular verification ensures accountability.`,
          severity: 'medium',
          date: now,
          actionRequired: 'Schedule compliance review meeting',
        });
      }
    }
  }
  
  return alerts.sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });
}

// === Report Generation ===

export function generateCBAReport(cba: CommunityBenefitsAgreement): string {
  const { overallScore, byCategory, atRiskCommitments, failedCommitments } = calculateComplianceScore(cba);
  
  const lines: string[] = [
    `# Community Benefits Agreement Compliance Report`,
    ``,
    `## ${cba.title}`,
    `**Company:** ${cba.company}`,
    `**Facility:** ${cba.facilityName}`,
    `**Location:** ${cba.city}, ${cba.state}`,
    `**Status:** ${cba.status}`,
    `**Signed:** ${new Date(cba.signedDate).toLocaleDateString()}`,
    cba.expirationDate ? `**Expires:** ${new Date(cba.expirationDate).toLocaleDateString()}` : '',
    ``,
    `## Overall Compliance Score: ${overallScore}%`,
    ``,
    `### Compliance by Category`,
    ``,
  ];
  
  for (const [category, score] of Object.entries(byCategory)) {
    const categoryInfo = COMMITMENT_CATEGORIES[category as CommitmentCategory];
    lines.push(`- **${categoryInfo?.label || category}:** ${score}%`);
  }
  
  lines.push(``);
  lines.push(`### Commitment Details`);
  lines.push(``);
  
  for (const commitment of cba.commitments) {
    const statusEmoji = {
      'met': '✅',
      'exceeded': '🌟',
      'on-track': '🟢',
      'in-progress': '🟡',
      'at-risk': '🟠',
      'behind-schedule': '🔴',
      'failed': '❌',
      'not-started': '⚪',
      'waived': '➖',
    }[commitment.status] || '❓';
    
    lines.push(`#### ${statusEmoji} ${COMMITMENT_CATEGORIES[commitment.category].label}`);
    lines.push(`- **Description:** ${commitment.description}`);
    lines.push(`- **Target:** ${commitment.targetValue}`);
    if (commitment.currentValue) {
      lines.push(`- **Current:** ${commitment.currentValue}`);
    }
    lines.push(`- **Status:** ${commitment.status}`);
    lines.push(``);
  }
  
  if (atRiskCommitments.length > 0) {
    lines.push(`### ⚠️ At-Risk Commitments`);
    for (const commitment of atRiskCommitments) {
      lines.push(`- ${commitment.description} (${commitment.status})`);
    }
    lines.push(``);
  }
  
  if (failedCommitments.length > 0) {
    lines.push(`### ❌ Failed Commitments`);
    for (const commitment of failedCommitments) {
      lines.push(`- ${commitment.description}`);
    }
    lines.push(``);
  }
  
  lines.push(`---`);
  lines.push(`*Generated by DCIM Compliance Dashboard on ${new Date().toLocaleDateString()}*`);
  
  return lines.join('\n');
}

