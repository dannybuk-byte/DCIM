/**
 * RealityObserved render sampling for step-1 surface attributes.
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

describe('RealityObserved rendered frames', () => {
  beforeEach(() => {
    getMock.mockReset();
    firstMock.mockReset();
  });

  it('(f) Loading → Empty for missing facility; never error chrome', async () => {
    let resolveGet: (v: unknown) => void = () => undefined;
    getMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveGet = resolve;
        }),
    );
    firstMock.mockResolvedValue(undefined);

    const frames: string[] = [];
    const { container } = render(<RealityObserved facilityId={7} />);
    const sample = () => {
      const el = container.querySelector('[data-query-surface]');
      if (el) frames.push(el.getAttribute('data-query-surface') || '');
    };
    sample();
    expect(frames[0]).toBe('loading');

    resolveGet(undefined);
    await waitFor(() => {
      expect(container.querySelector('[data-query-surface="empty"]')).toBeTruthy();
    });
    sample();
    expect(frames.includes('error')).toBe(false);
    expect(screen.getByText(/No facility record/i)).toBeTruthy();
  });

  it('(b) failure renders error, not empty', async () => {
    getMock.mockRejectedValue(new Error('read failed'));
    firstMock.mockResolvedValue(undefined);

    const { container } = render(<RealityObserved facilityId={8} />);
    await waitFor(() => {
      expect(container.querySelector('[data-query-surface="error"]')).toBeTruthy();
    });
    expect(container.querySelector('[data-query-surface="empty"]')).toBeNull();
    expect(screen.getByText(/read failed/i)).toBeTruthy();
  });

  it('(c) rapid facilityId change does not keep prior facility attribution', async () => {
    getMock.mockImplementation(async (id: number) => {
      if (id === 1) {
        await new Promise((r) => setTimeout(r, 30));
        return { id: 1, name: 'Alpha', operator: 'A', state: 'TX', type: 'hyperscale', country: 'US', city: 'X', complianceStatus: 'unknown', subsidyGap: 0 };
      }
      return { id: 2, name: 'Beta', operator: 'B', state: 'VA', type: 'hyperscale', country: 'US', city: 'Y', complianceStatus: 'unknown', subsidyGap: 0 };
    });
    firstMock.mockResolvedValue(undefined);

    const { container, rerender } = render(<RealityObserved facilityId={1} />);
    rerender(<RealityObserved facilityId={2} />);

    await waitFor(() => {
      const el = container.querySelector('[data-query-surface="ready"]');
      expect(el).toBeTruthy();
      expect(el?.getAttribute('data-facility-id')).toBe('2');
      expect(el?.getAttribute('data-entity-key')).toBe('2');
    });
  });
});
