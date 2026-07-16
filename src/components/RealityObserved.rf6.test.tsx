/**
 * R-F6: DESIGN quarantine for placeholder employment — no OSINT chrome,
 * no compliance / job-delivery math derived from the unsourced figure.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { RealityObserved } from '../components/RealityObserved';

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

describe('R-F6 RealityObserved DESIGN employment quarantine', () => {
  beforeEach(() => {
    getMock.mockReset();
    firstMock.mockReset();
    getMock.mockResolvedValue({
      id: 42,
      name: 'Test Facility',
      operator: 'Op',
      state: 'VA',
      type: 'hyperscale',
      country: 'US',
      city: 'Ashburn',
      complianceStatus: 'unknown',
      subsidyGap: 0,
    });
    firstMock.mockResolvedValue({
      facilityId: 42,
      promisedJobs: 100,
      permitDate: '2020-01-01',
      incentiveValue: 1_000_000,
    });
  });

  it('labels employment DESIGN and does not claim OSINT', async () => {
    const { container } = render(<RealityObserved facilityId={42} />);

    await waitFor(() => {
      expect(container.querySelector('[data-query-surface="ready"]')).toBeTruthy();
    });

    expect(container.querySelector('[data-design-placeholder="employment"]')).toBeTruthy();
    expect(container.querySelector('[data-design-badge="employment"]')?.textContent).toMatch(
      /DESIGN · synthetic/,
    );
    expect(screen.queryByText(/Open Source Intelligence/i)).toBeNull();
    expect(screen.queryByText(/Estimated from public sources/i)).toBeNull();
  });

  it('withholds job-delivery rate and compliance-gap math from the placeholder', async () => {
    const { container } = render(<RealityObserved facilityId={42} />);

    await waitFor(() => {
      expect(container.querySelector('[data-design-withheld="compliance-gap"]')).toBeTruthy();
    });

    expect(container.querySelector('[data-design-withheld="job-delivery-rate"]')).toBeTruthy();
    expect(screen.getByText(/Not computed — employment figure is DESIGN placeholder/i)).toBeTruthy();
    expect(screen.queryByText(/of 100 promised jobs/i)).toBeNull();
    // No dollar compliance-gap derived from placeholder × wage
    expect(screen.queryByText(/BLS median for tech roles/i)).toBeNull();
    expect(container.textContent).not.toMatch(/\$[\d,]+.*jobs ×/);
  });
});
