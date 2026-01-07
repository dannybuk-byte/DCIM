/**
 * Legislative Alert System
 * 
 * Track state legislation affecting data center subsidies.
 * New bills = new accountability opportunities.
 */

// === Types ===

export interface Bill {
  id: string;
  state: string;
  billNumber: string;
  title: string;
  summary: string;
  
  // Status
  status: BillStatus;
  lastAction: string;
  lastActionDate: Date;
  
  // Categorization
  category: BillCategory[];
  relevanceScore: number; // 0-100
  
  // Content analysis
  subsidyType?: string[];
  estimatedFiscalImpact?: number;
  jobRequirements?: string;
  clawbackProvisions?: boolean;
  disclosureRequirements?: boolean;
  
  // Key dates
  introducedDate: Date;
  hearingDates?: { date: Date; committee: string }[];
  voteDate?: Date;
  
  // Sponsors
  primarySponsor: string;
  cosponsors?: string[];
  
  // URLs
  billUrl: string;
  textUrl?: string;
  
  // Tracking
  tracked: boolean;
  notes: string[];
  alerts: LegislativeAlert[];
}

export type BillStatus = 
  | 'introduced'
  | 'in-committee'
  | 'passed-committee'
  | 'floor-action'
  | 'passed-one-chamber'
  | 'passed-both-chambers'
  | 'sent-to-governor'
  | 'signed'
  | 'vetoed'
  | 'failed'
  | 'withdrawn';

export type BillCategory =
  | 'tax-incentive'
  | 'tax-credit'
  | 'property-tax'
  | 'sales-tax'
  | 'job-creation'
  | 'disclosure'
  | 'clawback'
  | 'environmental'
  | 'labor-standards'
  | 'local-control'
  | 'utility-regulation'
  | 'data-privacy';

export interface LegislativeAlert {
  id: string;
  billId: string;
  type: AlertType;
  title: string;
  description: string;
  date: Date;
  actionNeeded?: string;
  deadline?: Date;
}

export type AlertType =
  | 'new-bill'
  | 'hearing-scheduled'
  | 'vote-scheduled'
  | 'amendment-added'
  | 'passed-chamber'
  | 'signed-into-law'
  | 'public-comment-period'
  | 'testimony-deadline';

// === Category Definitions ===

export const BILL_CATEGORIES: Record<BillCategory, {
  label: string;
  description: string;
  keywords: string[];
  impact: 'positive' | 'negative' | 'neutral';
}> = {
  'tax-incentive': {
    label: 'Tax Incentives',
    description: 'Bills creating or modifying tax incentives for data centers',
    keywords: ['incentive', 'tax break', 'economic development', 'abatement'],
    impact: 'negative',
  },
  'tax-credit': {
    label: 'Tax Credits',
    description: 'Bills providing tax credits for data center investments',
    keywords: ['tax credit', 'credit', 'investment credit'],
    impact: 'negative',
  },
  'property-tax': {
    label: 'Property Tax',
    description: 'Bills affecting property tax treatment of data centers',
    keywords: ['property tax', 'real property', 'personal property', 'assessment'],
    impact: 'neutral',
  },
  'sales-tax': {
    label: 'Sales Tax',
    description: 'Bills affecting sales tax exemptions for data center equipment',
    keywords: ['sales tax', 'use tax', 'equipment', 'exemption'],
    impact: 'negative',
  },
  'job-creation': {
    label: 'Job Creation Requirements',
    description: 'Bills with job creation mandates or requirements',
    keywords: ['job creation', 'employment', 'workforce', 'hiring'],
    impact: 'positive',
  },
  'disclosure': {
    label: 'Disclosure Requirements',
    description: 'Bills requiring transparency in incentive reporting',
    keywords: ['disclosure', 'reporting', 'transparency', 'public information'],
    impact: 'positive',
  },
  'clawback': {
    label: 'Clawback Provisions',
    description: 'Bills adding or strengthening clawback requirements',
    keywords: ['clawback', 'recapture', 'enforcement', 'performance'],
    impact: 'positive',
  },
  'environmental': {
    label: 'Environmental Standards',
    description: 'Bills addressing environmental impacts of data centers',
    keywords: ['environmental', 'energy', 'water', 'carbon', 'emissions', 'renewable'],
    impact: 'positive',
  },
  'labor-standards': {
    label: 'Labor Standards',
    description: 'Bills setting wage or labor requirements',
    keywords: ['wage', 'labor', 'prevailing wage', 'benefits', 'worker'],
    impact: 'positive',
  },
  'local-control': {
    label: 'Local Control',
    description: 'Bills affecting local government authority over data centers',
    keywords: ['local', 'county', 'city', 'municipal', 'zoning', 'land use'],
    impact: 'neutral',
  },
  'utility-regulation': {
    label: 'Utility Regulation',
    description: 'Bills affecting utility rates or interconnection for data centers',
    keywords: ['utility', 'electricity', 'power', 'rate', 'interconnection'],
    impact: 'neutral',
  },
  'data-privacy': {
    label: 'Data Privacy',
    description: 'Bills addressing data center data privacy requirements',
    keywords: ['privacy', 'data protection', 'security', 'personal data'],
    impact: 'neutral',
  },
};

// === Sample Bills ===

export const TRACKED_BILLS: Bill[] = [
  {
    id: 'va-hb1234-2026',
    state: 'Virginia',
    billNumber: 'HB 1234',
    title: 'Data Center Subsidy Transparency Act',
    summary: 'Requires annual reporting of jobs created and wages paid by data center incentive recipients',
    status: 'in-committee',
    lastAction: 'Referred to Commerce and Energy Committee',
    lastActionDate: new Date('2026-01-05'),
    category: ['disclosure', 'job-creation'],
    relevanceScore: 95,
    disclosureRequirements: true,
    introducedDate: new Date('2026-01-03'),
    hearingDates: [
      { date: new Date('2026-01-15'), committee: 'Commerce and Energy' }
    ],
    primarySponsor: 'Del. Jane Smith (D)',
    cosponsors: ['Del. John Doe (D)', 'Del. Sarah Johnson (R)'],
    billUrl: 'https://lis.virginia.gov/bills/HB1234',
    tracked: true,
    notes: ['Aligns with Good Jobs First recommendations', 'Would make Virginia first state to require actual job reporting'],
    alerts: [
      {
        id: 'alert-1',
        billId: 'va-hb1234-2026',
        type: 'hearing-scheduled',
        title: 'Committee hearing scheduled for HB 1234',
        description: 'Commerce and Energy Committee will hear testimony on the Data Center Subsidy Transparency Act',
        date: new Date('2026-01-08'),
        actionNeeded: 'Submit written testimony or prepare for in-person testimony',
        deadline: new Date('2026-01-14'),
      },
    ],
  },
  {
    id: 'tx-sb567-2026',
    state: 'Texas',
    billNumber: 'SB 567',
    title: 'Chapter 403 Data Center Incentive Expansion',
    summary: 'Expands property tax abatements for data center projects over $500 million',
    status: 'introduced',
    lastAction: 'Referred to Finance Committee',
    lastActionDate: new Date('2026-01-04'),
    category: ['tax-incentive', 'property-tax'],
    relevanceScore: 85,
    estimatedFiscalImpact: -500000000, // $500M fiscal impact
    jobRequirements: 'No specific requirements',
    clawbackProvisions: false,
    disclosureRequirements: false,
    introducedDate: new Date('2026-01-02'),
    primarySponsor: 'Sen. Bob Johnson (R)',
    billUrl: 'https://capitol.texas.gov/BillLookup/History.aspx?Bill=SB567',
    tracked: true,
    notes: ['No disclosure requirements', 'No job verification', 'Would cost taxpayers an estimated $500M'],
    alerts: [],
  },
  {
    id: 'oh-hb890-2026',
    state: 'Ohio',
    billNumber: 'HB 890',
    title: 'Data Center Worker Protection Act',
    summary: 'Requires data centers receiving incentives to pay prevailing wages and provide healthcare',
    status: 'in-committee',
    lastAction: 'Second hearing held',
    lastActionDate: new Date('2026-01-06'),
    category: ['labor-standards', 'job-creation'],
    relevanceScore: 90,
    jobRequirements: 'Prevailing wages + healthcare coverage',
    introducedDate: new Date('2025-12-15'),
    primarySponsor: 'Rep. Maria Garcia (D)',
    billUrl: 'https://www.legislature.ohio.gov/legislation/HB890',
    tracked: true,
    notes: ['Strong labor protections', 'Supported by building trades'],
    alerts: [
      {
        id: 'alert-2',
        billId: 'oh-hb890-2026',
        type: 'public-comment-period',
        title: 'Public comment period open for HB 890',
        description: 'The Ways and Means Committee is accepting written testimony',
        date: new Date('2026-01-06'),
        deadline: new Date('2026-01-20'),
      },
    ],
  },
];

// === Storage ===

import { db } from '../db/database';

export async function saveBill(bill: Bill): Promise<void> {
  await db.table('bills').put(bill);
}

export async function getBills(): Promise<Bill[]> {
  try {
    const stored = await db.table('bills').toArray();
    return stored.length > 0 ? stored : TRACKED_BILLS;
  } catch {
    return TRACKED_BILLS;
  }
}

export async function getTrackedBills(): Promise<Bill[]> {
  const bills = await getBills();
  return bills.filter(b => b.tracked);
}

export async function getBillsByState(state: string): Promise<Bill[]> {
  const bills = await getBills();
  return bills.filter(b => b.state.toLowerCase() === state.toLowerCase());
}

export async function getBillsByCategory(category: BillCategory): Promise<Bill[]> {
  const bills = await getBills();
  return bills.filter(b => b.category.includes(category));
}

// === Alert Generation ===

export async function getActiveAlerts(): Promise<LegislativeAlert[]> {
  const bills = await getTrackedBills();
  const now = new Date();
  const alerts: LegislativeAlert[] = [];
  
  for (const bill of bills) {
    // Include existing alerts that haven't passed their deadline
    for (const alert of bill.alerts) {
      if (!alert.deadline || alert.deadline >= now) {
        alerts.push(alert);
      }
    }
    
    // Generate new alerts for upcoming hearings
    if (bill.hearingDates) {
      for (const hearing of bill.hearingDates) {
        const daysUntil = Math.floor(
          (hearing.date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysUntil > 0 && daysUntil <= 14) {
          const existingAlert = alerts.find(a => 
            a.billId === bill.id && 
            a.type === 'hearing-scheduled' &&
            a.deadline?.getTime() === hearing.date.getTime()
          );
          if (!existingAlert) {
            alerts.push({
              id: `auto-hearing-${bill.id}-${hearing.date.getTime()}`,
              billId: bill.id,
              type: 'hearing-scheduled',
              title: `Hearing in ${daysUntil} days: ${bill.billNumber}`,
              description: `${bill.title} will be heard by ${hearing.committee}`,
              date: now,
              actionNeeded: 'Consider submitting testimony',
              deadline: hearing.date,
            });
          }
        }
      }
    }
    
    // Generate alerts for vote dates
    if (bill.voteDate) {
      const daysUntil = Math.floor(
        (bill.voteDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysUntil > 0 && daysUntil <= 7) {
        alerts.push({
          id: `auto-vote-${bill.id}`,
          billId: bill.id,
          type: 'vote-scheduled',
          title: `Vote in ${daysUntil} days: ${bill.billNumber}`,
          description: `${bill.title} is scheduled for a vote`,
          date: now,
          actionNeeded: 'Contact legislators before the vote',
          deadline: bill.voteDate,
        });
      }
    }
  }
  
  return alerts.sort((a, b) => {
    if (a.deadline && b.deadline) {
      return a.deadline.getTime() - b.deadline.getTime();
    }
    return 0;
  });
}

// === Testimony Generation ===

export function generateTestimonyTemplate(bill: Bill, position: 'support' | 'oppose' | 'amend'): string {
  const positionText = {
    support: 'IN SUPPORT OF',
    oppose: 'IN OPPOSITION TO',
    amend: 'REQUESTING AMENDMENTS TO',
  }[position];
  
  return `
TESTIMONY ${positionText} ${bill.billNumber}
${bill.title}
${bill.state} Legislature

Submitted by: [YOUR NAME]
Organization: [YOUR ORGANIZATION]
Date: ${new Date().toLocaleDateString()}

---

Dear Members of the Committee:

${position === 'support' ? `
I am writing in support of ${bill.billNumber}, which would ${bill.summary.toLowerCase()}.

[EXPLAIN WHY THIS BILL IS IMPORTANT]

[INCLUDE DATA AND EVIDENCE]
- According to Good Jobs First, no state currently requires verification of both promised AND actual jobs created.
- This bill would make ${bill.state} a national leader in subsidy accountability.

[PERSONAL OR ORGANIZATIONAL PERSPECTIVE]

I urge you to vote YES on ${bill.billNumber}.
` : position === 'oppose' ? `
I am writing in opposition to ${bill.billNumber}.

[EXPLAIN YOUR CONCERNS]

[INCLUDE DATA AND EVIDENCE]
- Studies show that data center tax incentives often fail to deliver promised economic benefits.
- States lose 52-70 cents on every dollar subsidized according to Good Jobs First research.

[SUGGEST ALTERNATIVES OR AMENDMENTS]

I urge you to vote NO on ${bill.billNumber}, or to significantly amend it to include accountability provisions.
` : `
I am writing to request amendments to ${bill.billNumber}.

[ACKNOWLEDGE ANY POSITIVE ASPECTS]

[EXPLAIN NEEDED AMENDMENTS]
- Require annual disclosure of actual jobs created
- Include clawback provisions if job targets are not met
- Mandate prevailing wage requirements

[EXPLAIN WHY AMENDMENTS ARE NECESSARY]

With these amendments, ${bill.billNumber} could serve as a model for responsible economic development.
`}

Thank you for your consideration.

Respectfully,
[YOUR NAME]
[YOUR TITLE/ORGANIZATION]
[CONTACT INFORMATION]
`;
}

// === Analytics ===

export async function getLegislativeStats(): Promise<{
  totalTracked: number;
  byState: Record<string, number>;
  byCategory: Record<BillCategory, number>;
  byStatus: Record<BillStatus, number>;
  upcomingDeadlines: number;
  positiveImpact: number;
  negativeImpact: number;
}> {
  const bills = await getTrackedBills();
  
  const byState: Record<string, number> = {};
  const byCategory: Record<string, number> = {};
  const byStatus: Record<string, number> = {};
  let positiveImpact = 0;
  let negativeImpact = 0;
  
  for (const bill of bills) {
    byState[bill.state] = (byState[bill.state] || 0) + 1;
    byStatus[bill.status] = (byStatus[bill.status] || 0) + 1;
    
    for (const category of bill.category) {
      byCategory[category] = (byCategory[category] || 0) + 1;
      const categoryInfo = BILL_CATEGORIES[category];
      if (categoryInfo.impact === 'positive') positiveImpact++;
      if (categoryInfo.impact === 'negative') negativeImpact++;
    }
  }
  
  const alerts = await getActiveAlerts();
  const upcomingDeadlines = alerts.filter(a => a.deadline).length;
  
  return {
    totalTracked: bills.length,
    byState,
    byCategory: byCategory as Record<BillCategory, number>,
    byStatus: byStatus as Record<BillStatus, number>,
    upcomingDeadlines,
    positiveImpact,
    negativeImpact,
  };
}

