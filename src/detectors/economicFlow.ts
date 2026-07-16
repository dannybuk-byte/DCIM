// LM3 (Local Multiplier 3) Economic Flow Calculator
// Calculates local economic impact using New Economics Foundation methodology

import { db } from '../db/database';

export type LM3Signature = 'high_leakage' | 'moderate_circulation' | 'strong_local_circulation';

export interface LM3Result {
  signature: LM3Signature;
  lm3Score: number;
  round1Local: number;
  round2Local: number;
  round3Local: number;
  totalLocalImpact: number;
  leakagePercentage: number;
  assumptions: Array<{
    name: string;
    value: number | string;
    source: string;
  }>;
  confidence: 'LOW'; // Always low for estimates
  dataSource: 'CALCULATED' | 'DESIGN_WITHHELD';
  error?: string;
  /** R-F6: true when LM3 withheld because employment is DESIGN placeholder */
  designWithheld?: boolean;
}

/** R-F6: synthetic placeholder — not OSINT, not facility-sourced. Do not derive LM3. */
export const DESIGN_PLACEHOLDER_EMPLOYMENT = 23 as const;

const DESIGN_WITHHOLD_REASON =
  'Not computed — employment figure is DESIGN placeholder, not live observed data.';

/**
 * Calculate Local Multiplier 3 (LM3) score.
 * R-F6: unsourced DESIGN employment must not drive LM3 / economic-flow scores.
 */
export async function calculateLocalMultiplier(
  facilityId: number,
  _countyFips: string
): Promise<LM3Result | null> {
  try {
    const facility = await db.facilities.get(facilityId);
    if (!facility) {
      return {
        signature: 'high_leakage',
        lm3Score: 0,
        round1Local: 0,
        round2Local: 0,
        round3Local: 0,
        totalLocalImpact: 0,
        leakagePercentage: 100,
        assumptions: [],
        confidence: 'LOW',
        dataSource: 'CALCULATED',
        error: 'Facility not found'
      };
    }

    // Confirm facility exists; agreement unused while employment is DESIGN-withheld.
    await db.subsidyAgreements.where('facilityId').equals(facilityId).first();

    // R-F6 DESIGN quarantine — no wages × rounds / LM3 derivation from placeholder.
    return {
      signature: 'high_leakage',
      lm3Score: 0,
      round1Local: 0,
      round2Local: 0,
      round3Local: 0,
      totalLocalImpact: 0,
      leakagePercentage: 0,
      assumptions: [
        {
          name: 'Current employment',
          value: DESIGN_PLACEHOLDER_EMPLOYMENT,
          source: 'DESIGN · synthetic / placeholder',
        },
      ],
      confidence: 'LOW',
      dataSource: 'DESIGN_WITHHELD',
      error: DESIGN_WITHHOLD_REASON,
      designWithheld: true,
    };
  } catch (error) {
    return {
      signature: 'high_leakage',
      lm3Score: 0,
      round1Local: 0,
      round2Local: 0,
      round3Local: 0,
      totalLocalImpact: 0,
      leakagePercentage: 100,
      assumptions: [],
      confidence: 'LOW',
      dataSource: 'CALCULATED',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
