/**
 * R-F6: complianceGap must DESIGN-label placeholder employment and must not
 * derive compliance-gap dollars from it (no false OSINT source).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateComplianceGap,
  DESIGN_PLACEHOLDER_EMPLOYMENT,
} from './complianceGap';

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

describe('R-F6 complianceGap DESIGN employment quarantine', () => {
  beforeEach(() => {
    getMock.mockReset();
    firstMock.mockReset();
    getMock.mockResolvedValue({
      id: 42,
      name: 'Test Facility',
      subsidyGap: 0,
    });
    firstMock.mockResolvedValue({
      facilityId: 42,
      promisedJobs: 100,
      permitDate: '2020-01-01',
      incentiveValue: 1_000_000,
    });
  });

  it('labels employment DESIGN and withholds gap dollars (no OSINT warrant)', async () => {
    const result = await calculateComplianceGap(42);
    expect(result).not.toBeNull();
    expect(result!.designWithheld).toBe(true);
    expect(result!.result).toBe(0);
    expect(result!.formula).toBe('WITHHELD');
    expect(result!.error).toMatch(/DESIGN placeholder/i);
    expect(result!.formulaExpanded).toMatch(/DESIGN placeholder/i);

    const employment = result!.embeddedAssumptions.find((a) => a.name === 'Current Employment');
    expect(employment?.value).toBe(DESIGN_PLACEHOLDER_EMPLOYMENT);
    expect(employment?.source).toMatch(/DESIGN · synthetic/);
    expect(employment?.source).not.toMatch(/OSINT/i);
    expect(result!.sensitivityMatrix.scenarios).toHaveLength(0);
  });
});
