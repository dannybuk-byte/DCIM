/**
 * Input Sanitization Utilities
 * Prevents XSS, injection attacks, and invalid data
 */

/**
 * Sanitize search query input
 */
export function sanitizeSearchQuery(query: string): string {
  if (typeof query !== 'string') return '';
  
  return query
    .trim()
    .slice(0, 500) // Max length
    .replace(/[<>]/g, '') // Remove potential XSS
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, ''); // Remove event handlers
}

/**
 * Sanitize facility name
 */
export function sanitizeFacilityName(name: string): string {
  if (typeof name !== 'string') return '';
  
  return name
    .trim()
    .slice(0, 200) // Max length
    .replace(/[<>]/g, '')
    .replace(/javascript:/gi, '');
}

/**
 * Sanitize operator name
 */
export function sanitizeOperatorName(operator: string): string {
  if (typeof operator !== 'string') return '';
  
  return operator
    .trim()
    .slice(0, 100)
    .replace(/[<>]/g, '');
}

/**
 * Sanitize numeric input
 */
export function sanitizeNumber(value: any, defaultValue: number = 0, min?: number, max?: number): number {
  const num = Number(value);
  
  if (!Number.isFinite(num)) {
    return defaultValue;
  }
  
  let result = num;
  
  if (min !== undefined && result < min) {
    result = min;
  }
  
  if (max !== undefined && result > max) {
    result = max;
  }
  
  return result;
}

/**
 * Sanitize state code (2-letter uppercase)
 */
export function sanitizeStateCode(state: string): string | null {
  if (typeof state !== 'string') return null;
  
  const cleaned = state.trim().toUpperCase().slice(0, 2);
  
  // Valid US state codes
  const validStates = new Set([
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
    'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
    'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
    'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
  ]);
  
  return validStates.has(cleaned) ? cleaned : null;
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string | null {
  if (typeof url !== 'string') return null;
  
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

/**
 * Sanitize object keys (prevent prototype pollution)
 */
export function sanitizeObjectKeys<T extends Record<string, any>>(obj: T): T {
  const sanitized = {} as T;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      // Skip dangerous keys
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = obj[key];
    }
  }
  
  return sanitized;
}





