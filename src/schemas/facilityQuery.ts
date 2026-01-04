/**
 * Facility Query Schemas
 * Zod schemas for structured facility queries
 * Used to parse natural language into structured database queries
 */

import { z } from 'zod';

/**
 * Compliance status enum
 */
export const ComplianceStatusSchema = z.enum(['Compliant', 'At Risk', 'Non-Compliant']);

/**
 * Facility type enum
 */
export const FacilityTypeSchema = z.enum([
  'Hyperscale',
  'Colocation',
  'Edge',
  'Enterprise',
  'POP',
  'CDN',
  'CORD',
  'Other'
]);

/**
 * Sort direction enum
 */
export const SortDirectionSchema = z.enum(['asc', 'desc']);

/**
 * Sort field enum
 */
export const SortFieldSchema = z.enum([
  'name',
  'subsidyGap',
  'subsidyReceived',
  'jobsPromised',
  'jobsCreated',
  'jobGap',
  'capacity',
  'openedDate',
  'complianceStatus'
]);

/**
 * Structured facility query schema
 * This is what the LLM will output
 */
export const FacilityQuerySchema = z.object({
  // Text filters
  name: z.string().optional().describe('Facility name (partial match)'),
  textSearch: z.string().optional().describe('Free text search across name, operator, city'),
  operator: z.array(z.string()).optional().describe('Operator/company names'),
  city: z.string().optional().describe('City name'),
  states: z.array(z.string()).optional().describe('US state codes (e.g., "TX", "CA")'),
  
  // Compliance filters
  complianceStatuses: z.array(ComplianceStatusSchema).optional().describe('Compliance status filters'),
  
  // Facility type filters
  facilityTypes: z.array(FacilityTypeSchema).optional().describe('Facility types'),
  
  // Numeric ranges - Subsidy
  subsidyMin: z.number().optional().describe('Minimum subsidy received (USD)'),
  subsidyMax: z.number().optional().describe('Maximum subsidy received (USD)'),
  subsidyGapMin: z.number().optional().describe('Minimum subsidy gap (USD)'),
  subsidyGapMax: z.number().optional().describe('Maximum subsidy gap (USD)'),
  
  // Numeric ranges - Jobs
  jobsPromisedMin: z.number().optional().describe('Minimum jobs promised'),
  jobsPromisedMax: z.number().optional().describe('Maximum jobs promised'),
  jobsCreatedMin: z.number().optional().describe('Minimum jobs created'),
  jobsCreatedMax: z.number().optional().describe('Maximum jobs created'),
  jobGapMin: z.number().optional().describe('Minimum job gap'),
  jobGapMax: z.number().optional().describe('Maximum job gap'),
  
  // Numeric ranges - Capacity
  capacityMin: z.number().optional().describe('Minimum capacity (MW)'),
  capacityMax: z.number().optional().describe('Maximum capacity (MW)'),
  
  // Date ranges
  openedAfter: z.string().optional().describe('Opened after date (ISO 8601)'),
  openedBefore: z.string().optional().describe('Opened before date (ISO 8601)'),
  
  // Sorting
  sortBy: SortFieldSchema.optional().describe('Field to sort by'),
  sortDirection: SortDirectionSchema.optional().describe('Sort direction (asc or desc)'),
  
  // Limit
  limit: z.number().int().positive().max(1000).optional().describe('Maximum number of results (default 100)')
});

export type FacilityQuery = z.infer<typeof FacilityQuerySchema>;
export type ComplianceStatus = z.infer<typeof ComplianceStatusSchema>;
export type FacilityType = z.infer<typeof FacilityTypeSchema>;
export type SortField = z.infer<typeof SortFieldSchema>;
export type SortDirection = z.infer<typeof SortDirectionSchema>;

/**
 * Example queries for testing
 */
export const EXAMPLE_QUERIES = [
  {
    nl: "Show me non-compliant facilities in Texas",
    structured: {
      states: ['TX'],
      complianceStatuses: ['Non-Compliant'],
      sortBy: 'subsidyGap',
      sortDirection: 'desc',
      limit: 100
    }
  },
  {
    nl: "Find Google facilities with over $50M in subsidies",
    structured: {
      operator: ['Google'],
      subsidyMin: 50_000_000,
      sortBy: 'subsidyReceived',
      sortDirection: 'desc',
      limit: 100
    }
  },
  {
    nl: "Which facilities created fewer than 100 jobs?",
    structured: {
      jobsCreatedMax: 100,
      sortBy: 'jobsCreated',
      sortDirection: 'asc',
      limit: 100
    }
  },
  {
    nl: "Show me Amazon data centers opened after 2020",
    structured: {
      operator: ['Amazon'],
      openedAfter: '2020-01-01',
      sortBy: 'openedDate',
      sortDirection: 'desc',
      limit: 100
    }
  },
  {
    nl: "Facilities in California or New York with high subsidy gaps",
    structured: {
      states: ['CA', 'NY'],
      subsidyGapMin: 10_000_000,
      sortBy: 'subsidyGap',
      sortDirection: 'desc',
      limit: 100
    }
  },
  {
    nl: "Find hyperscale facilities with capacity over 50 MW",
    structured: {
      facilityTypes: ['Hyperscale'],
      capacityMin: 50,
      sortBy: 'capacity',
      sortDirection: 'desc',
      limit: 100
    }
  }
];

/**
 * Validation helper
 */
export function validateFacilityQuery(query: unknown): FacilityQuery {
  return FacilityQuerySchema.parse(query);
}

/**
 * Check if query is empty (no filters applied)
 */
export function isEmptyQuery(query: FacilityQuery): boolean {
  const keys = Object.keys(query) as Array<keyof FacilityQuery>;
  // Exclude sortBy, sortDirection, and limit - these don't count as filters
  const filterKeys = keys.filter(k => k !== 'sortBy' && k !== 'sortDirection' && k !== 'limit');
  return filterKeys.length === 0;
}

/**
 * Generate a human-readable description of the query
 */
export function describeQuery(query: FacilityQuery): string {
  const parts: string[] = [];
  
  if (query.textSearch) parts.push(`matching "${query.textSearch}"`);
  if (query.name) parts.push(`name contains "${query.name}"`);
  if (query.operator?.length) parts.push(`operated by ${query.operator.join(' or ')}`);
  if (query.city) parts.push(`in ${query.city}`);
  if (query.states?.length) parts.push(`in ${query.states.join(', ')}`);
  if (query.complianceStatuses?.length) parts.push(`status: ${query.complianceStatuses.join(' or ')}`);
  if (query.facilityTypes?.length) parts.push(`type: ${query.facilityTypes.join(' or ')}`);
  
  if (query.subsidyMin) parts.push(`subsidy ≥ $${(query.subsidyMin / 1e6).toFixed(0)}M`);
  if (query.subsidyMax) parts.push(`subsidy ≤ $${(query.subsidyMax / 1e6).toFixed(0)}M`);
  if (query.subsidyGapMin) parts.push(`gap ≥ $${(query.subsidyGapMin / 1e6).toFixed(0)}M`);
  
  if (query.jobsPromisedMin) parts.push(`promised ≥ ${query.jobsPromisedMin} jobs`);
  if (query.jobsCreatedMax) parts.push(`created ≤ ${query.jobsCreatedMax} jobs`);
  if (query.jobGapMin) parts.push(`job gap ≥ ${query.jobGapMin}`);
  
  if (query.capacityMin) parts.push(`capacity ≥ ${query.capacityMin} MW`);
  if (query.openedAfter) parts.push(`opened after ${query.openedAfter.split('T')[0]}`);
  if (query.openedBefore) parts.push(`opened before ${query.openedBefore.split('T')[0]}`);
  
  if (parts.length === 0) return 'All facilities';
  
  let description = 'Facilities where ' + parts.join(', ');
  
  if (query.sortBy) {
    const sortLabel = query.sortBy === 'subsidyGap' ? 'subsidy gap' :
                      query.sortBy === 'jobGap' ? 'job gap' :
                      query.sortBy.replace(/([A-Z])/g, ' $1').toLowerCase();
    description += ` (sorted by ${sortLabel} ${query.sortDirection === 'asc' ? '↑' : '↓'})`;
  }
  
  if (query.limit && query.limit < 1000) {
    description += ` (max ${query.limit} results)`;
  }
  
  return description;
}

