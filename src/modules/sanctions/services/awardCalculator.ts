/**
 * Whistleblower Award Calculator
 * Calculates potential awards under AMLA, SEC, and IRS programs
 * 
 * Programs:
 * - AMLA/FinCEN: 10-30% of sanctions > $1M
 * - IRS Whistleblower: 15-30% of tax underpayment > $2M
 * - SEC Whistleblower: 10-30% of securities violations > $1M
 */

import { WhistleblowerProgram, AwardCalculation, AttorneyFirm, ReportingChannel } from '../types/sanctions';

/**
 * Calculate potential whistleblower awards
 */
export function calculatePotentialAward(estimatedViolationValue: number): AwardCalculation {
  const results: AwardCalculation = {
    violations: estimatedViolationValue,
    programs: [],
    totalMinAward: 0,
    totalMaxAward: 0,
  };

  // AMLA/FinCEN Whistleblower (10-30% of sanctions > $1M)
  if (estimatedViolationValue >= 1_000_000) {
    results.programs.push({
      program: 'AMLA/FinCEN Whistleblower',
      minAward: estimatedViolationValue * 0.10,
      maxAward: estimatedViolationValue * 0.30,
      requirements: [
        'Original information not previously known to the government',
        'Information leads to successful enforcement action',
        'Collected sanctions must exceed $1 million',
      ],
      protections: [
        'Anti-retaliation protections (reinstatement, back pay, attorney fees)',
        'Anonymous filing through attorney permitted',
        'Confidentiality protections for whistleblower identity',
        'Double back pay for retaliation victims',
      ],
    });
  }

  // IRS Whistleblower (15-30% of tax underpayment > $2M)
  if (estimatedViolationValue >= 2_000_000) {
    results.programs.push({
      program: 'IRS Whistleblower (Form 211)',
      minAward: estimatedViolationValue * 0.15,
      maxAward: estimatedViolationValue * 0.30,
      requirements: [
        'Tax, penalty, interest, and other amounts in dispute exceed $2 million',
        'Specific and credible information about tax underpayment',
        'Information must proceed to examination or collection',
        'If individual taxpayer, gross income must exceed $200,000',
      ],
      note: 'Can stack with AMLA award if tax fraud component exists',
    });
  }

  // SEC Whistleblower (10-30% of securities violations > $1M)
  if (estimatedViolationValue >= 1_000_000) {
    results.programs.push({
      program: 'SEC Whistleblower (Rule 21F)',
      minAward: estimatedViolationValue * 0.10,
      maxAward: estimatedViolationValue * 0.30,
      requirements: [
        'Securities law violation (applies to publicly traded companies)',
        'Original information provided to SEC',
        'Information leads to successful enforcement action > $1M',
        'Voluntary submission before investigation or litigation',
      ],
      protections: [
        'Employment retaliation protections under Dodd-Frank',
        'Anonymous reporting permitted (via attorney)',
        'Anti-retaliation: double back pay + reinstatement',
      ],
      note: 'Applicable if publicly traded data center operator involved',
    });
  }

  // CFTC Whistleblower for commodities/derivatives violations
  if (estimatedViolationValue >= 1_000_000) {
    results.programs.push({
      program: 'CFTC Whistleblower',
      minAward: estimatedViolationValue * 0.10,
      maxAward: estimatedViolationValue * 0.30,
      requirements: [
        'Commodities or derivatives law violation',
        'Original information leading to enforcement > $1M',
        'Often applies to crypto-related violations',
      ],
      note: 'Relevant for cryptocurrency mining sanctions violations',
    });
  }

  // Calculate totals
  results.totalMinAward = results.programs.reduce((sum, p) => sum + p.minAward, 0);
  results.totalMaxAward = results.programs.reduce((sum, p) => sum + p.maxAward, 0);

  return results;
}

/**
 * Format currency for display
 */
export function formatAwardAmount(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  }
  if (amount >= 1_000_000) {
    return `$${(amount / 1_000_000).toFixed(2)}M`;
  }
  if (amount >= 1_000) {
    return `$${(amount / 1_000).toFixed(1)}K`;
  }
  return `$${amount.toLocaleString()}`;
}

/**
 * Get attorney referral network for sanctions whistleblowing
 */
export function getAttorneyNetwork(): AttorneyFirm[] {
  return [
    {
      firm: 'Kohn, Kohn & Colapinto',
      specialty: 'OFAC/Sanctions Whistleblower',
      url: 'https://kkc.com/',
      contact: 'whistleblower@kkc.com',
      notes: 'Leading sanctions whistleblower practice; pioneered AML/sanctions whistleblowing',
    },
    {
      firm: 'Constantine Cannon',
      specialty: 'Qui Tam / Whistleblower',
      url: 'https://constantinecannon.com/',
      contact: 'whistleblower@constantinecannon.com',
      notes: 'Largest qui tam recoveries in history; multi-program expertise',
    },
    {
      firm: 'Phillips & Cohen',
      specialty: 'Multi-program Whistleblower',
      url: 'https://www.phillipsandcohen.com/',
      notes: 'SEC, IRS, OFAC combined filings; strong track record',
    },
    {
      firm: 'Zuckerman Law',
      specialty: 'Whistleblower Retaliation Defense',
      url: 'https://www.zuckermanlaw.com/',
      notes: 'Strong anti-retaliation practice; employment law expertise',
    },
    {
      firm: 'National Whistleblower Center',
      specialty: 'Whistleblower Advocacy & Referrals',
      url: 'https://www.whistleblowers.org/',
      notes: 'Non-profit; provides referrals and advocacy support',
    },
    {
      firm: 'Government Accountability Project',
      specialty: 'Public Interest Whistleblowing',
      url: 'https://whistleblower.org/',
      notes: 'Non-profit; focuses on public interest cases',
    },
  ];
}

/**
 * Get official reporting channels
 */
export function getReportingChannels(): ReportingChannel[] {
  return [
    {
      name: 'OFAC Hotline',
      type: 'GOVERNMENT',
      phone: '1-800-540-6322',
      email: 'ofac_feedback@treasury.gov',
      address: 'Office of Foreign Assets Control, U.S. Department of the Treasury, 1500 Pennsylvania Avenue NW, Washington, DC 20220',
      notes: 'Direct reporting to Treasury Department OFAC',
    },
    {
      name: 'FinCEN Tips',
      type: 'GOVERNMENT',
      phone: '1-800-767-2825',
      url: 'https://www.fincen.gov/contact',
      notes: 'For AML/sanctions violations; whistleblower awards under AMLA',
    },
    {
      name: 'SEC Office of the Whistleblower',
      type: 'GOVERNMENT',
      url: 'https://www.sec.gov/whistleblower',
      notes: 'For securities law violations; online tip submission',
    },
    {
      name: 'IRS Whistleblower Office',
      type: 'GOVERNMENT',
      url: 'https://www.irs.gov/compliance/whistleblower-office',
      address: 'Internal Revenue Service, Whistleblower Office, SE:WO, 1111 Constitution Ave., NW, Washington, DC 20224',
      notes: 'Form 211 for tax fraud > $2M',
    },
    {
      name: 'FBI Internet Crime Complaint Center',
      type: 'GOVERNMENT',
      url: 'https://www.ic3.gov/',
      notes: 'For cyber-enabled sanctions evasion',
    },
  ];
}

/**
 * Get union contacts for worker support
 */
export function getUnionContacts(): ReportingChannel[] {
  return [
    {
      name: 'Communications Workers of America (CWA)',
      type: 'UNION',
      url: 'https://cwa-union.org/',
      notes: 'Represents tech and telecom workers',
      specialty: 'Tech worker organizing',
    },
    {
      name: 'IBEW (International Brotherhood of Electrical Workers)',
      type: 'UNION',
      url: 'https://www.ibew.org/',
      notes: 'Represents data center electricians and technicians',
      specialty: 'Electrical and technical workers',
    },
    {
      name: 'IUOE (International Union of Operating Engineers)',
      type: 'UNION',
      url: 'https://www.iuoe.org/',
      notes: 'Represents facility operators and engineers',
      specialty: 'Facility operations',
    },
    {
      name: 'CODE-CWA (Coalition to Organize Digital Employees)',
      type: 'UNION',
      url: 'https://code-cwa.org/',
      notes: 'Tech worker organizing initiative',
      specialty: 'Tech industry organizing',
    },
    {
      name: 'Tech Workers Coalition',
      type: 'UNION',
      url: 'https://techworkerscoalition.org/',
      notes: 'Grassroots tech worker organization',
      specialty: 'Worker solidarity and advocacy',
    },
  ];
}

/**
 * Estimate violation value based on facility characteristics
 */
export function estimateViolationValue(facilityData: {
  monthlyRevenue?: number;
  annualPowerCost?: number;
  spaceLeased?: number; // sq ft
  ratePerSqFt?: number;
  durationMonths?: number;
}): number {
  let estimate = 0;

  // Method 1: Direct revenue
  if (facilityData.monthlyRevenue && facilityData.durationMonths) {
    estimate = facilityData.monthlyRevenue * facilityData.durationMonths;
  }

  // Method 2: Space-based calculation
  if (facilityData.spaceLeased && facilityData.ratePerSqFt && facilityData.durationMonths) {
    const spaceValue = facilityData.spaceLeased * facilityData.ratePerSqFt * facilityData.durationMonths;
    estimate = Math.max(estimate, spaceValue);
  }

  // Method 3: Power cost proxy (crypto mining facilities)
  if (facilityData.annualPowerCost) {
    // Assume 2x multiplier for total violation value
    const powerBasedEstimate = facilityData.annualPowerCost * 2;
    estimate = Math.max(estimate, powerBasedEstimate);
  }

  return estimate;
}

/**
 * Generate award summary for display
 */
export function generateAwardSummary(calculation: AwardCalculation): string {
  if (calculation.programs.length === 0) {
    return 'Estimated violation value is below program thresholds ($1M for most programs).';
  }

  const lines = [
    `Estimated Violation Value: ${formatAwardAmount(calculation.violations)}`,
    '',
    `Potential Award Range: ${formatAwardAmount(calculation.totalMinAward)} - ${formatAwardAmount(calculation.totalMaxAward)}`,
    '',
    'Applicable Programs:',
    ...calculation.programs.map((p) => 
      `  • ${p.program}: ${formatAwardAmount(p.minAward)} - ${formatAwardAmount(p.maxAward)}`
    ),
    '',
    'Note: Multiple program awards may stack if applicable violations exist.',
  ];

  return lines.join('\n');
}

/**
 * Get anti-retaliation protections summary
 */
export function getAntiRetaliationProtections(): string[] {
  return [
    'AMLA: Double back pay for retaliation victims',
    'AMLA: Reinstatement to former position',
    'AMLA: Attorney fees and litigation costs covered',
    'AMLA: Compensatory damages for harm suffered',
    'Dodd-Frank: Employment protections for SEC/CFTC whistleblowers',
    'Dodd-Frank: Up to 10 years to file retaliation complaint',
    'SOX: Protections for reporting securities fraud',
    'Anonymous filing permitted through attorney',
    'Confidential identity protection by government agencies',
    'State-level whistleblower protections may also apply',
  ];
}

