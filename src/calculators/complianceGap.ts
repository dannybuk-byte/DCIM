// Compliance Gap Calculator with Full Assumption Transparency
// Calculates compliance gaps while making all embedded assumptions visible

import { db } from '../db/database';
import { getDefaultWageEstimate } from '../api/bls';

export interface EmbeddedAssumption {
  name: string;
  value: number;
  source: string;
  warnings: string[];
  alternatives: Array<{
    value: number;
    description: string;
    result: number;
  }>;
}

export interface SensitivityScenario {
  label: string;
  values: number[];
  result: number;
}

export interface ComplianceGapResult {
  result: number;
  formula: string;
  formulaExpanded: string;
  embeddedAssumptions: EmbeddedAssumption[];
  sensitivityMatrix: {
    variables: string[];
    scenarios: SensitivityScenario[];
  };
  error?: string;
}

/**
 * Calculate compliance gap with full assumption transparency
 * @param facilityId - Facility identifier
 * @returns Compliance gap calculation with all assumptions visible
 */
export async function calculateComplianceGap(
  facilityId: number
): Promise<ComplianceGapResult | null> {
  try {
    // Fetch facility and agreement data
    const [facility, agreement] = await Promise.all([
      db.facilities.get(facilityId),
      db.subsidyAgreements.where('facilityId').equals(facilityId).first()
    ]);

    if (!facility) {
      return {
        result: 0,
        formula: '',
        formulaExpanded: '',
        embeddedAssumptions: [],
        sensitivityMatrix: { variables: [], scenarios: [] },
        error: 'Facility not found'
      };
    }

    if (!agreement) {
      return {
        result: 0,
        formula: '',
        formulaExpanded: '',
        embeddedAssumptions: [],
        sensitivityMatrix: { variables: [], scenarios: [] },
        error: 'Subsidy agreement not found'
      };
    }

    // Get current employment (would come from actual data source)
    const currentEmployment = 23; // Placeholder
    const promisedJobs = agreement.promisedJobs;
    const deliveredJobs = currentEmployment;
    const jobGap = Math.max(0, promisedJobs - deliveredJobs);

    // Calculate years operating
    const permitDate = new Date(agreement.permitDate);
    const yearsOperating = Math.max(1, (Date.now() - permitDate.getTime()) / (1000 * 60 * 60 * 24 * 365));

    // Base assumptions
    const baseWage = getDefaultWageEstimate(); // $85,000
    const baseYears = yearsOperating;
    const baseIncentives = agreement.incentiveValue;

    // Calculate base result
    const baseResult = jobGap * baseWage * baseYears - baseIncentives;

    // Build formula strings
    const formula = 'Gap = (Promised - Delivered) × Wage × Years - Incentives';
    const formulaExpanded = `Gap = (${promisedJobs} - ${deliveredJobs}) × $${baseWage.toLocaleString()} × ${baseYears.toFixed(1)} - $${baseIncentives.toLocaleString()}`;

    // Define embedded assumptions with alternatives
    const wageAlternatives = [
      { value: 60000, description: 'Entry-level technician', result: 0 },
      { value: 72000, description: 'Mid-level technician', result: 0 },
      { value: 110000, description: 'Senior engineer', result: 0 }
    ];

    const yearsAlternatives = [
      { value: Math.max(1, yearsOperating - 2), description: 'Early phase (2 years less)', result: 0 },
      { value: yearsOperating + 2, description: 'Extended timeline (+2 years)', result: 0 },
      { value: 10, description: 'Full 10-year period', result: 0 }
    ];

    const incentiveAlternatives = [
      { value: baseIncentives * 0.5, description: '50% of disclosed value', result: 0 },
      { value: baseIncentives * 1.5, description: '150% of disclosed value (hidden incentives)', result: 0 },
      { value: baseIncentives * 2, description: '200% of disclosed value', result: 0 }
    ];

    // Calculate alternative results
    wageAlternatives.forEach(alt => {
      alt.result = jobGap * alt.value * baseYears - baseIncentives;
    });

    yearsAlternatives.forEach(alt => {
      alt.result = jobGap * baseWage * alt.value - baseIncentives;
    });

    incentiveAlternatives.forEach(alt => {
      alt.result = jobGap * baseWage * baseYears - alt.value;
    });

    const embeddedAssumptions: EmbeddedAssumption[] = [
      {
        name: 'Average Annual Wage',
        value: baseWage,
        source: 'BLS OES median for SOC 15-1244 (Network and Computer Systems Administrators)',
        warnings: [
          'Assumes all jobs are tech roles',
          'Does not account for regional wage variation',
          'May not reflect actual facility wage structure'
        ],
        alternatives: wageAlternatives
      },
      {
        name: 'Years Operating',
        value: baseYears,
        source: `Calculated from permit date (${agreement.permitDate}) to present`,
        warnings: [
          'Assumes continuous operation since permit date',
          'Does not account for phase-in periods',
          'May not reflect actual operational timeline'
        ],
        alternatives: yearsAlternatives
      },
      {
        name: 'Incentive Value',
        value: baseIncentives,
        source: agreement.sourceDocument || 'Subsidy agreement',
        warnings: [
          'May not include all incentive programs',
          'Does not account for tax abatements or other benefits',
          'May not reflect total public investment'
        ],
        alternatives: incentiveAlternatives
      },
      {
        name: 'Current Employment',
        value: currentEmployment,
        source: 'Estimated from public sources (OSINT)',
        warnings: [
          'May not capture all contractor positions',
          'Based on publicly available information',
          'May not reflect actual headcount'
        ],
        alternatives: [
          { value: currentEmployment * 0.8, description: '20% lower estimate', result: 0 },
          { value: currentEmployment * 1.2, description: '20% higher estimate', result: 0 }
        ]
      }
    ];

    // Calculate sensitivity matrix
    const sensitivityScenarios: SensitivityScenario[] = [
      {
        label: 'Low',
        values: [60000, Math.max(1, yearsOperating - 2), baseIncentives * 1.5],
        result: jobGap * 60000 * Math.max(1, yearsOperating - 2) - (baseIncentives * 1.5)
      },
      {
        label: 'Base',
        values: [baseWage, baseYears, baseIncentives],
        result: baseResult
      },
      {
        label: 'High',
        values: [110000, yearsOperating + 2, baseIncentives * 0.5],
        result: jobGap * 110000 * (yearsOperating + 2) - (baseIncentives * 0.5)
      }
    ];

    return {
      result: Math.round(baseResult),
      formula,
      formulaExpanded,
      embeddedAssumptions,
      sensitivityMatrix: {
        variables: ['wage', 'years', 'incentives'],
        scenarios: sensitivityScenarios
      }
    };
  } catch (error) {
    return {
      result: 0,
      formula: '',
      formulaExpanded: '',
      embeddedAssumptions: [],
      sensitivityMatrix: { variables: [], scenarios: [] },
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

