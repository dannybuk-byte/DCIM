/**
 * Formatting Utility Tests
 */

import { describe, it, expect } from 'vitest';
import { formatCurrency } from './formatting';

describe('formatCurrency', () => {
  it('should format small numbers correctly', () => {
    expect(formatCurrency(1000)).toBe('$1K');
    expect(formatCurrency(5000)).toBe('$5K');
  });

  it('should format millions correctly', () => {
    expect(formatCurrency(1000000)).toBe('$1M');
    expect(formatCurrency(5500000)).toBe('$5.5M');
    expect(formatCurrency(125000000)).toBe('$125M');
  });

  it('should format billions correctly', () => {
    expect(formatCurrency(1000000000)).toBe('$1B');
    expect(formatCurrency(2480000000)).toBe('$2.48B');
  });

  it('should handle zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('should handle negative numbers', () => {
    expect(formatCurrency(-1000000)).toBe('-$1M');
  });

  it('should handle decimals in thousands', () => {
    expect(formatCurrency(1500)).toBe('$1.5K');
    expect(formatCurrency(12345)).toBe('$12.3K');
  });

  it('should handle very large numbers', () => {
    expect(formatCurrency(1000000000000)).toBe('$1000B');
  });
});

