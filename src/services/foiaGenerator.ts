/**
 * FOIA Request Generator & Tracker
 * 
 * Systematically unlock hidden subsidy data from "dark states"
 * through state-specific public records requests.
 * 
 * Mission: Crack open the 25 states that don't voluntarily disclose
 * data center subsidy recipients.
 */

// === Types ===

export interface FOIATemplate {
  id: string;
  state: string;
  lawName: string; // e.g., "Texas Public Information Act"
  lawCitation: string; // e.g., "Tex. Gov't Code § 552"
  agencyTypes: AgencyType[];
  responseDeadline: number; // days
  appealDeadline: number; // days
  feeWaiverAvailable: boolean;
  expeditedProcessing: boolean;
  electronicSubmission: boolean;
  submissionUrl?: string;
  templateText: string;
  requiredFields: string[];
  tips: string[];
}

export type AgencyType = 
  | 'economic-development'
  | 'revenue'
  | 'comptroller'
  | 'commerce'
  | 'labor'
  | 'utility-commission'
  | 'county'
  | 'city';

export interface FOIARequest {
  id: string;
  templateId: string;
  state: string;
  agency: string;
  agencyEmail?: string;
  agencyAddress?: string;
  subject: string;
  requestText: string;
  targetCompany?: string;
  targetFacility?: string;
  dataRequested: DataRequestType[];
  status: FOIAStatus;
  createdAt: Date;
  submittedAt?: Date;
  responseDeadline?: Date;
  appealDeadline?: Date;
  responseSummary?: string;
  documents?: FOIADocument[];
  notes: string[];
  costEstimate?: number;
  costPaid?: number;
}

export type FOIAStatus = 
  | 'draft'
  | 'submitted'
  | 'acknowledged'
  | 'processing'
  | 'partial-response'
  | 'completed'
  | 'denied'
  | 'appealed'
  | 'litigation';

export type DataRequestType =
  | 'subsidy-recipients'
  | 'job-promises'
  | 'actual-employment'
  | 'wage-data'
  | 'clawback-triggers'
  | 'tax-abatements'
  | 'infrastructure-costs'
  | 'utility-rates'
  | 'permit-applications'
  | 'environmental-reviews'
  | 'community-agreements';

export interface FOIADocument {
  id: string;
  filename: string;
  fileType: string;
  uploadedAt: Date;
  extractedData?: Record<string, unknown>;
  notes?: string;
}

export interface StateSuccessRate {
  state: string;
  totalRequests: number;
  completed: number;
  denied: number;
  averageResponseDays: number;
  successRate: number;
}

// === State Templates ===

export const STATE_FOIA_TEMPLATES: FOIATemplate[] = [
  {
    id: 'tx-pia',
    state: 'Texas',
    lawName: 'Texas Public Information Act',
    lawCitation: 'Tex. Gov\'t Code § 552',
    agencyTypes: ['economic-development', 'comptroller'],
    responseDeadline: 10,
    appealDeadline: 10,
    feeWaiverAvailable: true,
    expeditedProcessing: false,
    electronicSubmission: true,
    submissionUrl: 'https://www.texasattorneygeneral.gov/open-government',
    templateText: `Dear Public Information Officer,

Pursuant to the Texas Public Information Act, Texas Government Code Chapter 552, I request copies of the following records:

1. All applications for data center tax incentives, property tax abatements, or economic development grants submitted by [COMPANY_NAME] or related entities from [START_DATE] to present.

2. All agreements, contracts, or memoranda of understanding between the State of Texas (or any Texas county/city) and [COMPANY_NAME] regarding data center development incentives.

3. All reports, correspondence, or documentation regarding:
   - Jobs promised in incentive applications
   - Actual jobs created or verified
   - Wage levels promised vs. actual
   - Any clawback provisions triggered or waived

4. All tax abatement values, property tax exemptions, or other fiscal impacts related to [COMPANY_NAME] data center facilities.

5. Any audits, compliance reviews, or enforcement actions related to the above incentive agreements.

I request that responsive records be provided electronically in their native format where possible.

I am requesting a waiver of fees pursuant to § 552.267 as this information will primarily benefit the general public by increasing transparency regarding the use of public funds for economic development incentives.

If any portion of this request is denied, please cite the specific exemption(s) and provide the name and title of the person responsible for the denial.

Thank you for your prompt attention to this request.`,
    requiredFields: ['COMPANY_NAME', 'START_DATE'],
    tips: [
      'Texas has weak disclosure requirements for economic development incentives',
      'The Comptroller may have more data than local economic development offices',
      'Chapter 313 agreements (expired 2022) should still have records',
      'Request utility interconnection data from ERCOT as well',
    ],
  },
  {
    id: 'va-foia',
    state: 'Virginia',
    lawName: 'Virginia Freedom of Information Act',
    lawCitation: 'Va. Code § 2.2-3700 et seq.',
    agencyTypes: ['economic-development', 'commerce', 'county'],
    responseDeadline: 5,
    appealDeadline: 30,
    feeWaiverAvailable: true,
    expeditedProcessing: true,
    electronicSubmission: true,
    submissionUrl: 'https://www.vedp.org/',
    templateText: `Dear FOIA Officer,

Pursuant to the Virginia Freedom of Information Act, Va. Code § 2.2-3700 et seq., I request copies of the following public records:

1. All applications submitted by [COMPANY_NAME] for data center equipment sales and use tax exemptions under Va. Code § 58.1-609.3(18).

2. Documentation of investment amounts and job creation commitments for [COMPANY_NAME] data center facilities qualifying for exemptions.

3. All annual reports or compliance documentation submitted by [COMPANY_NAME] regarding:
   - Investment thresholds met
   - New full-time job creation
   - Wage levels of created positions
   - Location and capacity of facilities

4. Any correspondence between VEDP, Virginia Tax, or local economic development authorities regarding [COMPANY_NAME] incentive compliance.

5. Total estimated fiscal impact (foregone revenue) from [COMPANY_NAME] data center exemptions.

I request electronic delivery in native formats. Per § 2.2-3704(F), I ask that you provide an estimate of charges prior to processing if costs will exceed $200.

As this request seeks information about the expenditure of public funds, I request a fee waiver in the public interest.

Please respond within five working days as required by law.`,
    requiredFields: ['COMPANY_NAME'],
    tips: [
      'Virginia VEDP is the primary source for incentive data',
      'Loudoun County has its own economic development records',
      'Data center exemption requires $150M investment + 50 jobs',
      'Request from both state AND county for complete picture',
    ],
  },
  {
    id: 'nv-npra',
    state: 'Nevada',
    lawName: 'Nevada Public Records Act',
    lawCitation: 'NRS Chapter 239',
    agencyTypes: ['economic-development'],
    responseDeadline: 5,
    appealDeadline: 5,
    feeWaiverAvailable: true,
    expeditedProcessing: false,
    electronicSubmission: true,
    submissionUrl: 'https://goed.nv.gov/',
    templateText: `Dear Records Custodian,

Pursuant to the Nevada Public Records Act, NRS Chapter 239, I request copies of the following public records:

1. All applications for economic development incentives submitted by [COMPANY_NAME] to the Governor's Office of Economic Development (GOED).

2. All incentive agreements, including:
   - Tax abatement terms and values
   - Job creation requirements and timelines
   - Wage thresholds and verification methods
   - Clawback provisions

3. All quarterly or annual compliance reports submitted by [COMPANY_NAME], including:
   - Actual jobs created
   - Actual wages paid
   - Investment amounts verified

4. Any audit reports, compliance reviews, or enforcement actions regarding [COMPANY_NAME] incentive agreements.

5. Aggregated data on data center incentive recipients, including total jobs promised vs. delivered across all recipients.

Nevada is notably transparent in disclosing actual wage data. I specifically request any wage verification reports that compare promised vs. actual compensation.

Please provide records electronically in native format. Per NRS 239.0107, please respond within five business days.`,
    requiredFields: ['COMPANY_NAME'],
    tips: [
      'Nevada is the ONLY state that discloses actual wages (~$31/hr disclosed)',
      'GOED publishes incentive recipient data quarterly',
      'Use Nevada as a benchmark for what other states should disclose',
      'Request includes clawback enforcement history',
    ],
  },
  {
    id: 'oh-pra',
    state: 'Ohio',
    lawName: 'Ohio Public Records Act',
    lawCitation: 'Ohio Rev. Code § 149.43',
    agencyTypes: ['economic-development', 'revenue'],
    responseDeadline: 0, // "reasonable" - no specific deadline
    appealDeadline: 0,
    feeWaiverAvailable: false,
    expeditedProcessing: false,
    electronicSubmission: true,
    submissionUrl: 'https://development.ohio.gov/',
    templateText: `Dear Public Records Officer,

Pursuant to the Ohio Public Records Act, Ohio Revised Code § 149.43, I request copies of the following public records:

1. All applications for Job Creation Tax Credits (JCTC) submitted by [COMPANY_NAME] for data center projects.

2. All tax credit agreements with [COMPANY_NAME], including:
   - Credit amounts and terms
   - Job creation commitments and timelines
   - Payroll thresholds
   - Clawback provisions

3. All compliance reports and job creation verification documents for [COMPANY_NAME] incentive agreements.

4. Any correspondence regarding extensions, amendments, or waivers of incentive requirements for [COMPANY_NAME].

5. Summary data on all data center-related incentives issued by the Ohio Development Services Agency in the past 10 years.

Per § 149.43(B), I request that you provide records promptly. If any records are withheld, please cite the specific statutory exemption.

I request electronic delivery in native format to minimize copying costs.`,
    requiredFields: ['COMPANY_NAME'],
    tips: [
      'Ohio has no fixed response deadline - follow up at 7 days',
      'Development Services Agency is primary source',
      'Columbus/New Albany area has significant data center concentration',
      'Cross-reference with county-level TIF agreements',
    ],
  },
  {
    id: 'ga-ora',
    state: 'Georgia',
    lawName: 'Georgia Open Records Act',
    lawCitation: 'O.C.G.A. § 50-18-70 et seq.',
    agencyTypes: ['economic-development', 'revenue', 'county'],
    responseDeadline: 3,
    appealDeadline: 0,
    feeWaiverAvailable: false,
    expeditedProcessing: false,
    electronicSubmission: true,
    submissionUrl: 'https://www.georgia.org/industries/data-centers',
    templateText: `Dear Open Records Officer,

Pursuant to the Georgia Open Records Act, O.C.G.A. § 50-18-70 et seq., I request copies of the following public records:

1. All applications for data center sales tax exemptions under O.C.G.A. § 48-8-3(68) submitted by [COMPANY_NAME].

2. Certification documentation showing [COMPANY_NAME] met the minimum investment ($100M) and job creation (20 jobs) thresholds.

3. Any annual recertification or compliance documentation for [COMPANY_NAME] data center exemptions.

4. Total estimated sales tax exemption value for [COMPANY_NAME] data center equipment purchases.

5. Any correspondence, audits, or reviews regarding [COMPANY_NAME] compliance with exemption requirements.

6. Aggregated data on all data center exemption recipients, including total investment claimed and jobs reported.

Per O.C.G.A. § 50-18-71(b)(1)(A), please respond within three business days indicating whether you will provide the records.

I request electronic delivery in native format.`,
    requiredFields: ['COMPANY_NAME'],
    tips: [
      'Georgia has a very low job threshold (20 jobs) for exemptions',
      'Douglas County and Coweta County have major facilities',
      'Request from both Georgia Dept of Economic Development AND county',
      'Meta/Facebook has significant presence - good test case',
    ],
  },
];

// === Helper Functions ===

export function getTemplateForState(state: string): FOIATemplate | undefined {
  return STATE_FOIA_TEMPLATES.find(t => t.state.toLowerCase() === state.toLowerCase());
}

export function generateRequest(
  template: FOIATemplate,
  params: Record<string, string>
): string {
  let text = template.templateText;
  for (const [key, value] of Object.entries(params)) {
    text = text.replace(new RegExp(`\\[${key}\\]`, 'g'), value);
  }
  return text;
}

export function calculateDeadlines(submittedAt: Date, template: FOIATemplate): {
  responseDeadline: Date;
  appealDeadline: Date;
} {
  const responseDeadline = new Date(submittedAt);
  responseDeadline.setDate(responseDeadline.getDate() + template.responseDeadline);
  
  const appealDeadline = new Date(submittedAt);
  appealDeadline.setDate(appealDeadline.getDate() + template.appealDeadline);
  
  return { responseDeadline, appealDeadline };
}

export function getDataRequestLabels(): Record<DataRequestType, string> {
  return {
    'subsidy-recipients': 'Subsidy Recipients List',
    'job-promises': 'Job Creation Promises',
    'actual-employment': 'Actual Employment Verification',
    'wage-data': 'Wage/Compensation Data',
    'clawback-triggers': 'Clawback Provisions & Enforcement',
    'tax-abatements': 'Tax Abatement Values',
    'infrastructure-costs': 'Infrastructure/Utility Costs',
    'utility-rates': 'Special Utility Rate Agreements',
    'permit-applications': 'Building Permit Applications',
    'environmental-reviews': 'Environmental Impact Reviews',
    'community-agreements': 'Community Benefits Agreements',
  };
}

// === Request Storage (IndexedDB) ===

import { db } from '../db/database';

export async function saveRequest(request: FOIARequest): Promise<string> {
  const id = request.id || `foia-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  await db.table('foiaRequests').put({ ...request, id });
  return id;
}

export async function getRequests(): Promise<FOIARequest[]> {
  try {
    return await db.table('foiaRequests').toArray();
  } catch {
    return [];
  }
}

export async function getRequestsByState(state: string): Promise<FOIARequest[]> {
  try {
    return await db.table('foiaRequests').where('state').equals(state).toArray();
  } catch {
    return [];
  }
}

export async function updateRequestStatus(
  id: string, 
  status: FOIAStatus,
  notes?: string
): Promise<void> {
  const request = await db.table('foiaRequests').get(id);
  if (request) {
    request.status = status;
    if (notes) {
      request.notes = [...(request.notes || []), `${new Date().toISOString()}: ${notes}`];
    }
    await db.table('foiaRequests').put(request);
  }
}

// === Analytics ===

export async function getStateSuccessRates(): Promise<StateSuccessRate[]> {
  const requests = await getRequests();
  const byState: Record<string, FOIARequest[]> = {};
  
  for (const req of requests) {
    if (!byState[req.state]) byState[req.state] = [];
    byState[req.state].push(req);
  }
  
  return Object.entries(byState).map(([state, reqs]) => {
    const completed = reqs.filter(r => r.status === 'completed').length;
    const denied = reqs.filter(r => r.status === 'denied').length;
    
    // Calculate average response time for completed requests
    const completedWithDates = reqs.filter(r => 
      r.status === 'completed' && r.submittedAt
    );
    const avgDays = completedWithDates.length > 0
      ? completedWithDates.reduce((sum, r) => {
          const days = Math.floor(
            (Date.now() - new Date(r.submittedAt!).getTime()) / (1000 * 60 * 60 * 24)
          );
          return sum + days;
        }, 0) / completedWithDates.length
      : 0;
    
    return {
      state,
      totalRequests: reqs.length,
      completed,
      denied,
      averageResponseDays: Math.round(avgDays),
      successRate: reqs.length > 0 ? (completed / reqs.length) * 100 : 0,
    };
  });
}

// === Export for organizing ===

export function generateCampaignPacket(requests: FOIARequest[]): string {
  const lines: string[] = [
    '# FOIA Campaign Progress Report',
    `Generated: ${new Date().toLocaleDateString()}`,
    '',
    '## Summary',
    `Total Requests: ${requests.length}`,
    `Completed: ${requests.filter(r => r.status === 'completed').length}`,
    `Pending: ${requests.filter(r => ['submitted', 'processing'].includes(r.status)).length}`,
    `Denied: ${requests.filter(r => r.status === 'denied').length}`,
    '',
    '## Requests by State',
    '',
  ];
  
  const byState: Record<string, FOIARequest[]> = {};
  for (const req of requests) {
    if (!byState[req.state]) byState[req.state] = [];
    byState[req.state].push(req);
  }
  
  for (const [state, reqs] of Object.entries(byState)) {
    lines.push(`### ${state}`);
    for (const req of reqs) {
      lines.push(`- **${req.subject}** (${req.status})`);
      lines.push(`  - Agency: ${req.agency}`);
      lines.push(`  - Submitted: ${req.submittedAt?.toLocaleDateString() || 'Not submitted'}`);
      if (req.responseSummary) {
        lines.push(`  - Response: ${req.responseSummary}`);
      }
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

