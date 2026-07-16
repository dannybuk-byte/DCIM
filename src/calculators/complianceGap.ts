// Compliance Gap Calculator with Full Assumption Transparency
// Calculates compliance gaps while making all embedded assumptions visible

import { db } from '../db/database';

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
  /** R-F6: true when gap $ withheld because employment is DESIGN placeholder */
  designWithheld?: boolean;
}

/** R-F6: synthetic placeholder — not OSINT, not facility-sourced. Do not derive gap $. */
export const DESIGN_PLACEHOLDER_EMPLOYMENT = 23 as const;

const DESIGN_WITHHOLD_REASON =
  'Not computed — employment figure is DESIGN placeholder, not live observed data.';

/**
 * Calculate compliance gap with full assumption transparency.
 * R-F6: unsourced DESIGN employment must not drive compliance-gap dollars.
 */
export async function calculateComplianceGap(
  facilityId: number
): Promise<ComplianceGapResult | null> {
  try {
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

    // R-F6 DESIGN quarantine — no jobGap × wage × years derivation from placeholder.
    return {
      result: 0,
      formula: 'WITHHELD',
      formulaExpanded: DESIGN_WITHHOLD_REASON,
      embeddedAssumptions: [
        {
          name: 'Current Employment',
          value: DESIGN_PLACEHOLDER_EMPLOYMENT,
          source: 'DESIGN · synthetic / placeholder',
          warnings: [
            'Synthetic placeholder — not OSINT, not facility-sourced',
            'Compliance-gap dollars are not derived from this value',
            'Requires a dated source warrant before any gap formula may run',
          ],
          alternatives: [],
        },
      ],
      sensitivityMatrix: { variables: [], scenarios: [] },
      error: DESIGN_WITHHOLD_REASON,
      designWithheld: true,
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
