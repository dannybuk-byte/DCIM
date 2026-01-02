// Input Validation and Sanitization (Pattern 35)
// Prevents XSS, injection attacks, and invalid data

/**
 * Sanitize user input to prevent XSS
 */
export function sanitizeInput(input: string, maxLength: number = 500): string {
  if (typeof input !== 'string') {
    return '';
  }

  // Remove potentially dangerous characters
  let sanitized = input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim();

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.slice(0, maxLength);
  }

  return sanitized;
}

/**
 * Validate FIPS code format
 */
export function validateFIPS(fips: string, expectedLength: number): boolean {
  if (typeof fips !== 'string') return false;
  if (fips.length !== expectedLength) return false;
  return /^\d+$/.test(fips); // Only digits
}

/**
 * Validate ZIP code format
 */
export function validateZIP(zip: string): boolean {
  if (typeof zip !== 'string') return false;
  // US ZIP: 5 digits or 5+4 format
  return /^\d{5}(-\d{4})?$/.test(zip);
}

/**
 * Validate email format (if needed)
 */
export function validateEmail(email: string): boolean {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate search query
 */
export function validateSearchQuery(query: string): string {
  return sanitizeInput(query, 200);
}

/**
 * Validate facility ID
 */
export function validateFacilityId(id: any): id is number {
  return typeof id === 'number' && id > 0 && Number.isInteger(id);
}

