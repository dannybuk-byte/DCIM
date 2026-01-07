/**
 * Test Utilities
 * Custom render function and test helpers
 */

import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';
import type { Facility, ComplianceStats } from '../types';

// Wrapper component for providers if needed
function AllTheProviders({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
    </>
  );
}

// Custom render function
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };

// ============================================================================
// TEST FIXTURES
// ============================================================================

/**
 * Mock facility data for testing
 */
export const mockFacilities: Facility[] = [
  {
    id: 1,
    name: 'Switch SuperNAP Las Vegas',
    type: 'Data Center',
    operator: 'Switch',
    country: 'USA',
    state: 'Nevada',
    city: 'Las Vegas',
    complianceStatus: 'Non-Compliant',
    subsidyGap: 125000000,
    lastAuditDate: '2024-01-15',
    issues: ['Job shortfall (97.4%)', 'Environmental violations'],
    latitude: 36.0765,
    longitude: -115.1498,
    powerCapacityMW: 400,
    jobsPromised: 1000,
    jobsCreated: 26,
    taxIncentives: 89000000,
    yearEstablished: 2015,
  },
  {
    id: 2,
    name: 'Equinix DC1',
    type: 'Data Center',
    operator: 'Equinix',
    country: 'USA',
    state: 'Virginia',
    city: 'Ashburn',
    complianceStatus: 'Compliant',
    subsidyGap: 0,
    lastAuditDate: '2024-03-20',
    issues: [],
    latitude: 39.0395,
    longitude: -77.4874,
    powerCapacityMW: 50,
    jobsPromised: 100,
    jobsCreated: 105,
    taxIncentives: 5000000,
    yearEstablished: 2012,
  },
  {
    id: 3,
    name: 'Digital Realty DFW10',
    type: 'Data Center',
    operator: 'Digital Realty',
    country: 'USA',
    state: 'Texas',
    city: 'Dallas',
    complianceStatus: 'At Risk',
    subsidyGap: 8500000,
    lastAuditDate: '2023-11-05',
    issues: ['Pending environmental review'],
    latitude: 32.8205,
    longitude: -96.8716,
    powerCapacityMW: 75,
    jobsPromised: 200,
    jobsCreated: 180,
    taxIncentives: 12000000,
    yearEstablished: 2019,
  },
  {
    id: 4,
    name: 'Google Pryor Creek',
    type: 'Data Center',
    operator: 'Google',
    country: 'USA',
    state: 'Oklahoma',
    city: 'Pryor Creek',
    complianceStatus: 'Unknown',
    subsidyGap: 45000000,
    lastAuditDate: '2023-06-01',
    issues: ['No public audit data'],
    latitude: 36.2849,
    longitude: -95.3047,
    powerCapacityMW: 300,
    jobsPromised: 500,
    jobsCreated: 0,
    taxIncentives: 120000000,
    yearEstablished: 2016,
  },
];

/**
 * Mock compliance stats
 */
export const mockStats: ComplianceStats = {
  totalFacilities: mockFacilities.length,
  compliant: mockFacilities.filter(f => f.complianceStatus === 'Compliant').length,
  nonCompliant: mockFacilities.filter(f => f.complianceStatus === 'Non-Compliant').length,
  atRisk: mockFacilities.filter(f => f.complianceStatus === 'At Risk').length,
  unknown: mockFacilities.filter(f => f.complianceStatus === 'Unknown').length,
  totalSubsidyGap: mockFacilities.reduce((sum, f) => sum + f.subsidyGap, 0),
  totalIssues: mockFacilities.reduce((sum, f) => sum + (f.issues?.length || 0), 0),
  avgDaysSinceAudit: 45,
  overdueAudits: 2,
  medianSubsidyGap: 3000000,
  maxSubsidyGap: 10000000,
};

/**
 * Create a mock facility with custom overrides
 */
export function createMockFacility(overrides: Partial<Facility> = {}): Facility {
  return {
    id: Math.random() * 100000,
    name: 'Test Facility',
    type: 'Data Center',
    operator: 'Test Operator',
    country: 'USA',
    state: 'California',
    city: 'San Francisco',
    complianceStatus: 'Compliant',
    subsidyGap: 0,
    lastAuditDate: new Date().toISOString().split('T')[0],
    issues: [],
    ...overrides,
  };
}

/**
 * Wait for async operations
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Mock fetch response helper
 */
export function mockFetchResponse(data: any, options: { ok?: boolean; status?: number } = {}) {
  const { ok = true, status = 200 } = options;
  
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
  });
}

