/**
 * Stats Utility Tests
 */

import { describe, it, expect } from 'vitest';
import { calculateStats } from './stats';
import { mockFacilities, createMockFacility } from '../test/utils';

describe('calculateStats', () => {
  it('should calculate total facilities correctly', () => {
    const stats = calculateStats(mockFacilities);
    expect(stats.totalFacilities).toBe(4);
  });

  it('should count compliant facilities correctly', () => {
    const stats = calculateStats(mockFacilities);
    expect(stats.compliant).toBe(1); // Only Equinix DC1
  });

  it('should count non-compliant facilities correctly', () => {
    const stats = calculateStats(mockFacilities);
    expect(stats.nonCompliant).toBe(1); // Switch SuperNAP
  });

  it('should count at-risk facilities correctly', () => {
    const stats = calculateStats(mockFacilities);
    expect(stats.atRisk).toBe(1); // Digital Realty
  });

  it('should count unknown facilities correctly', () => {
    const stats = calculateStats(mockFacilities);
    expect(stats.unknown).toBe(1); // Google Pryor Creek
  });

  it('should calculate total subsidy gap correctly', () => {
    const stats = calculateStats(mockFacilities);
    // 125M + 0 + 8.5M + 45M = 178.5M
    expect(stats.totalSubsidyGap).toBe(178500000);
  });

  it('should return zeros for empty array', () => {
    const stats = calculateStats([]);
    expect(stats).toEqual({
      totalFacilities: 0,
      compliant: 0,
      nonCompliant: 0,
      atRisk: 0,
      unknown: 0,
      totalSubsidyGap: 0,
      totalIssues: 0,
      avgDaysSinceAudit: 0,
      overdueAudits: 0,
      medianSubsidyGap: 0,
      maxSubsidyGap: 0,
    });
  });

  it('should handle facilities with no issues', () => {
    const facilities = [
      createMockFacility({ complianceStatus: 'Compliant', subsidyGap: 0 }),
      createMockFacility({ complianceStatus: 'Compliant', subsidyGap: 0 }),
    ];
    const stats = calculateStats(facilities);
    expect(stats.compliant).toBe(2);
    expect(stats.totalSubsidyGap).toBe(0);
  });

  it('should handle large subsidy gaps', () => {
    const facilities = [
      createMockFacility({ subsidyGap: 1_000_000_000 }), // 1B
      createMockFacility({ subsidyGap: 500_000_000 }),   // 500M
    ];
    const stats = calculateStats(facilities);
    expect(stats.totalSubsidyGap).toBe(1_500_000_000);
  });
});

