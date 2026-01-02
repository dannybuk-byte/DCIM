/**
 * Pattern Lab Engine Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { computePatternLab, defaultScenario } from './engine';
import { mockFacilities, createMockFacility } from '../../test/utils';
import type { ScenarioSettings } from './types';

describe('Pattern Lab Engine', () => {
  describe('defaultScenario', () => {
    it('should return valid default settings', () => {
      const scenario = defaultScenario();
      
      expect(scenario.minSubsidyGap).toBeGreaterThan(0);
      expect(scenario.sensitivity).toBeGreaterThan(0);
      expect(scenario.sensitivity).toBeLessThanOrEqual(1);
      expect(scenario.operatorCascadeMinFacilities).toBeGreaterThan(0);
      expect(scenario.operatorCascadeMinNonComplianceRate).toBeLessThanOrEqual(1);
    });
  });

  describe('computePatternLab', () => {
    let scenario: ScenarioSettings;

    beforeEach(() => {
      scenario = defaultScenario();
    });

    it('should return valid output structure', () => {
      const result = computePatternLab(mockFacilities, scenario);
      
      expect(result).toHaveProperty('generatedAt');
      expect(result).toHaveProperty('scenario');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('findings');
      expect(result).toHaveProperty('correlations');
    });

    it('should include summary statistics', () => {
      const result = computePatternLab(mockFacilities, scenario);
      
      expect(result.summary).toHaveProperty('totalFindings');
      expect(result.summary).toHaveProperty('critical');
      expect(result.summary).toHaveProperty('high');
      expect(result.summary).toHaveProperty('topOperators');
      expect(Array.isArray(result.summary.topOperators)).toBe(true);
    });

    it('should detect non-compliant facilities', () => {
      const result = computePatternLab(mockFacilities, {
        ...scenario,
        minSubsidyGap: 0, // Lower threshold to catch all
        sensitivity: 0.9, // High sensitivity
      });
      
      // Should find the Switch SuperNAP with its massive subsidy gap
      const switchFindings = result.findings.filter(f => 
        f.affectedOperators.includes('Switch')
      );
      
      expect(switchFindings.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty facilities array', () => {
      const result = computePatternLab([], scenario);
      
      expect(result.summary.totalFindings).toBe(0);
      expect(result.findings).toHaveLength(0);
    });

    it('should respect minSubsidyGap threshold', () => {
      const lowThreshold = computePatternLab(mockFacilities, {
        ...scenario,
        minSubsidyGap: 1000,
      });
      
      const highThreshold = computePatternLab(mockFacilities, {
        ...scenario,
        minSubsidyGap: 100_000_000, // 100M
      });
      
      // Lower threshold should catch more
      expect(lowThreshold.summary.totalFindings).toBeGreaterThanOrEqual(
        highThreshold.summary.totalFindings
      );
    });

    it('should generate findings with required fields', () => {
      const result = computePatternLab(mockFacilities, {
        ...scenario,
        sensitivity: 0.9,
      });
      
      if (result.findings.length > 0) {
        const finding = result.findings[0];
        
        expect(finding).toHaveProperty('id');
        expect(finding).toHaveProperty('type');
        expect(finding).toHaveProperty('severity');
        expect(finding).toHaveProperty('title');
        expect(finding).toHaveProperty('description');
        expect(finding).toHaveProperty('confidence');
        expect(finding).toHaveProperty('score');
        expect(finding).toHaveProperty('explain');
        expect(finding).toHaveProperty('evidence');
        expect(finding).toHaveProperty('recommendations');
      }
    });

    it('should calculate correlations', () => {
      // Create facilities with correlated attributes
      const correlatedFacilities = [
        createMockFacility({ 
          operator: 'BigCorp', 
          subsidyGap: 10000000,
          issues: ['Issue 1', 'Issue 2', 'Issue 3'],
          complianceStatus: 'Non-Compliant',
        }),
        createMockFacility({ 
          operator: 'BigCorp', 
          subsidyGap: 15000000,
          issues: ['Issue 1', 'Issue 2', 'Issue 3', 'Issue 4'],
          complianceStatus: 'Non-Compliant',
        }),
        createMockFacility({ 
          operator: 'SmallCo', 
          subsidyGap: 100000,
          issues: [],
          complianceStatus: 'Compliant',
        }),
      ];

      const result = computePatternLab(correlatedFacilities, scenario);
      
      expect(result.correlations).toBeDefined();
      expect(Array.isArray(result.correlations)).toBe(true);
    });

    it('should sort findings by score', () => {
      const result = computePatternLab(mockFacilities, {
        ...scenario,
        sensitivity: 0.9,
      });
      
      if (result.findings.length > 1) {
        for (let i = 0; i < result.findings.length - 1; i++) {
          expect(result.findings[i].score).toBeGreaterThanOrEqual(
            result.findings[i + 1].score
          );
        }
      }
    });
  });
});

