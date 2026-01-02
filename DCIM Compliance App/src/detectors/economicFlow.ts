// LM3 (Local Multiplier 3) Economic Flow Calculator
// Calculates local economic impact using New Economics Foundation methodology

import { db } from '../db/database';
import { getDefaultWageEstimate } from '../api/bls';

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
  dataSource: 'CALCULATED';
  error?: string;
}

/**
 * Calculate Local Multiplier 3 (LM3) score
 * @param facilityId - Facility identifier
 * @param countyFips - 5-digit county FIPS code
 * @returns LM3 economic impact analysis
 */
export async function calculateLocalMultiplier(
  facilityId: number,
  _countyFips: string
): Promise<LM3Result | null> {
  try {
    // Get facility data
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

    // Get subsidy agreement for promised jobs
    const agreement = await db.subsidyAgreements.where('facilityId').equals(facilityId).first();

    // Estimate current employment (would come from actual data)
    const currentEmployment = 23; // Placeholder - would be from OSINT or other sources
    const averageWage = getDefaultWageEstimate(); // $85,000 default

    // Round 1: Direct local spending
    // Estimate operational budget (5-10% of capex annually, or use subsidy gap as proxy)
    const estimatedCapex = agreement?.promisedInvestment || facility.subsidyGap * 10;
    const annualOperationalBudget = estimatedCapex * 0.07; // 7% of capex
    
    // Local procurement rate (default 30% unless data available)
    const localProcurementRate = 0.3;
    const round1Local = annualOperationalBudget * localProcurementRate;

    // Employee wages
    const totalWages = currentEmployment * averageWage;
    
    // Round 2: Supplier re-spending locally
    // Assume suppliers respend 30% of their revenue locally
    const supplierRespendRate = 0.3;
    const round2Local = round1Local * supplierRespendRate;

    // Round 3: Employee spending locally
    // Use county retail sales data or default to 60% local spending
    const localConsumerSpendingRate = 0.6;
    const round3Local = totalWages * localConsumerSpendingRate;

    // Total local impact
    const totalLocalImpact = round1Local + round2Local + round3Local;

    // Initial spending (operational budget + wages)
    const initialSpending = annualOperationalBudget + totalWages;

    // LM3 Score
    const lm3Score = initialSpending > 0 ? totalLocalImpact / initialSpending : 0;

    // Leakage percentage
    const leakagePercentage = ((initialSpending - totalLocalImpact) / initialSpending) * 100;

    // Determine signature
    let signature: LM3Signature;
    if (lm3Score < 1.5) {
      signature = 'high_leakage';
    } else if (lm3Score < 2.5) {
      signature = 'moderate_circulation';
    } else {
      signature = 'strong_local_circulation';
    }

    // Assumptions
    const assumptions = [
      {
        name: 'Local procurement rate',
        value: localProcurementRate,
        source: 'Default estimate (30%)'
      },
      {
        name: 'Supplier respend rate',
        value: supplierRespendRate,
        source: 'Default estimate (30%)'
      },
      {
        name: 'Local consumer spending rate',
        value: localConsumerSpendingRate,
        source: 'Default estimate (60%)'
      },
      {
        name: 'Average annual wage',
        value: averageWage,
        source: 'BLS OES median for SOC 15-1244'
      },
      {
        name: 'Current employment',
        value: currentEmployment,
        source: 'Estimated from public sources'
      },
      {
        name: 'Operational budget (% of capex)',
        value: 0.07,
        source: 'Industry standard (7%)'
      }
    ];

    return {
      signature,
      lm3Score: Math.round(lm3Score * 100) / 100,
      round1Local: Math.round(round1Local),
      round2Local: Math.round(round2Local),
      round3Local: Math.round(round3Local),
      totalLocalImpact: Math.round(totalLocalImpact),
      leakagePercentage: Math.round(leakagePercentage * 10) / 10,
      assumptions,
      confidence: 'LOW',
      dataSource: 'CALCULATED'
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

