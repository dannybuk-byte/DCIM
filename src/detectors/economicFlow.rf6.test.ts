/**
 * R-F6: economicFlow must DESIGN-label placeholder employment and must not
 * derive LM3 / economic-flow scores from it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateLocalMultiplier,
  DESIGN_PLACEHOLDER_EMPLOYMENT,
} from './economicFlow';

const getMock = vi.fn();
const firstMock = vi.fn();

vi.mock('../db/database', () => ({
  db: {
    facilities: {
      get: (...args: unknown[]) => getMock(...args),
    },
    subsidyAgreements: {
      where: () => ({
        equals: () => ({
          first: (...args: unknown[]) => firstMock(...args),
        }),
      }),
    },
  },
}));

describe('R-F6 economicFlow DESIGN employment quarantine', () => {
  beforeEach(() => {
    getMock.mockReset();
    firstMock.mockReset();
    getMock.mockResolvedValue({
      id: 42,
      name: 'Test Facility',
      subsidyGap: 5_000_000,
    });
    firstMock.mockResolvedValue({
      facilityId: 42,
      promisedInvestment: 100_000_000,
    });
  });

  it('labels employment DESIGN and withholds LM3 score derivation', async () => {
    const result = await calculateLocalMultiplier(42, '51107');
    expect(result).not.toBeNull();
    expect(result!.designWithheld).toBe(true);
    expect(result!.dataSource).toBe('DESIGN_WITHHELD');
    expect(result!.error).toMatch(/DESIGN placeholder/i);
    expect(result!.lm3Score).toBe(0);
    expect(result!.totalLocalImpact).toBe(0);
    expect(result!.round1Local).toBe(0);
    expect(result!.round2Local).toBe(0);
    expect(result!.round3Local).toBe(0);

    const employment = result!.assumptions.find((a) => a.name === 'Current employment');
    expect(employment?.value).toBe(DESIGN_PLACEHOLDER_EMPLOYMENT);
    expect(employment?.source).toMatch(/DESIGN · synthetic/);
    expect(employment?.source).not.toMatch(/OSINT|public sources/i);
  });
});
