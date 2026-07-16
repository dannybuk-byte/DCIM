/**
 * R-F6: LifecycleTimeline must DESIGN-label steady-state 23 and must not
 * derive employment-drop % from it.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor, screen } from '@testing-library/react';
import { LifecycleTimeline } from '../components/LifecycleTimeline';

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

describe('R-F6 LifecycleTimeline DESIGN employment quarantine', () => {
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

  it('labels steady-state DESIGN and withholds employment-drop %', async () => {
    const { container } = render(<LifecycleTimeline facilityId={42} />);

    await waitFor(() => {
      expect(container.querySelector('[data-design-badge="employment"]')).toBeTruthy();
    });

    expect(container.querySelector('[data-design-placeholder="employment"]')?.textContent).toMatch(
      /23/,
    );
    expect(container.querySelector('[data-design-badge="employment"]')?.textContent).toMatch(
      /DESIGN · synthetic/,
    );
    expect(container.querySelector('[data-design-withheld="employment-drop"]')).toBeTruthy();
    expect(screen.getByText(/Not computed — steady-state employment is DESIGN placeholder/i)).toBeTruthy();
    expect(container.textContent).not.toMatch(/\d+\.\d+% reduction/);
  });
});
