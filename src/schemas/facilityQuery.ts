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
  'complianceStatus',
  'bgpRiskScore',
  'routeChangeRate',
  'latencyAnomalyScore',
  'infrastructureAccountabilityRisk',
]);

export const TransitDependencyLevelSchema = z.enum(['low', 'medium', 'high']);

/**
 * Structured facility query schema
 * This is what the LLM will output
 */
export const FacilityQuerySchema = z.object({
  // Text filters
  name: z.string().optional().describe('Facility name (partial match)'),
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

  // Demo BGP / network-risk filters (seeded indicators; not live BGP)
  bgpRiskMin: z.number().optional().describe('Minimum demo BGP risk score (0–100)'),
  routeChangeRateMin: z.number().optional().describe('Minimum route-change rate (demo)'),
  latencyAnomalyMin: z.number().optional().describe('Minimum latency anomaly score (demo)'),
  transitDependencyLevels: z
    .array(TransitDependencyLevelSchema)
    .optional()
    .describe('Transit dependency tiers to include'),
  infrastructureRiskMin: z
    .number()
    .optional()
    .describe('Minimum combined infrastructure accountability risk (demo, 0–100)'),
  
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
export type TransitDependencyLevel = z.infer<typeof TransitDependencyLevelSchema>;

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
  const appendSortAndLimit = (description: string): string => {
    let out = description;
    if (query.sortBy) {
      const sortLabel =
        query.sortBy === 'subsidyGap'
          ? 'subsidy gap'
          : query.sortBy === 'jobGap'
            ? 'job gap'
            : query.sortBy === 'bgpRiskScore'
              ? 'BGP risk'
              : query.sortBy === 'routeChangeRate'
                ? 'route change rate'
                : query.sortBy === 'latencyAnomalyScore'
                  ? 'latency anomaly'
                  : query.sortBy === 'infrastructureAccountabilityRisk'
                    ? 'infrastructure accountability risk'
                    : query.sortBy.replace(/([A-Z])/g, ' $1').toLowerCase();
      out += ` (sorted by ${sortLabel} ${query.sortDirection === 'asc' ? '↑' : '↓'})`;
    }
    if (query.limit && query.limit < 1000) {
      out += ` (max ${query.limit} results)`;
    }
    return out;
  };

  let head = 'Facilities';

  if (query.operator?.length) {
    head += ` operated by ${query.operator.join(' or ')}`;
  }

  if (query.city && query.states?.length) {
    head += ` in ${query.city}, ${query.states.join(', ')}`;
  } else if (query.city) {
    head += ` in ${query.city}`;
  } else if (query.states?.length) {
    head += ` in ${query.states.join(', ')}`;
  }

  const withParts: string[] = [];

  if (query.name) withParts.push(`name contains "${query.name}"`);
  if (query.complianceStatuses?.length) {
    withParts.push(`status ${query.complianceStatuses.join(' or ')}`);
  }
  if (query.facilityTypes?.length) {
    withParts.push(`type ${query.facilityTypes.join(' or ')}`);
  }
  if (query.subsidyMin) {
    withParts.push(`subsidy received ≥ $${(query.subsidyMin / 1e6).toFixed(0)}M`);
  }
  if (query.subsidyMax) {
    withParts.push(`subsidy received ≤ $${(query.subsidyMax / 1e6).toFixed(0)}M`);
  }
  if (query.subsidyGapMin) {
    withParts.push(`subsidy gap ≥ $${(query.subsidyGapMin / 1e6).toFixed(0)}M`);
  }
  if (query.jobsPromisedMin) {
    withParts.push(`jobs promised ≥ ${query.jobsPromisedMin}`);
  }
  if (query.jobsCreatedMax) {
    withParts.push(`jobs created ≤ ${query.jobsCreatedMax}`);
  }
  if (query.jobGapMin) {
    withParts.push(`job gap ≥ ${query.jobGapMin}`);
  }
  if (query.capacityMin) {
    withParts.push(`capacity ≥ ${query.capacityMin} MW`);
  }
  if (query.openedAfter) {
    withParts.push(`opened after ${query.openedAfter.split('T')[0]}`);
  }
  if (query.openedBefore) {
    withParts.push(`opened before ${query.openedBefore.split('T')[0]}`);
  }
  if (query.bgpRiskMin != null) {
    withParts.push(`demo BGP risk ≥ ${query.bgpRiskMin}`);
  }
  if (query.routeChangeRateMin != null) {
    withParts.push(`route change rate ≥ ${query.routeChangeRateMin}`);
  }
  if (query.latencyAnomalyMin != null) {
    withParts.push(`latency anomaly score ≥ ${query.latencyAnomalyMin}`);
  }
  if (query.transitDependencyLevels?.length) {
    withParts.push(`transit dependency: ${query.transitDependencyLevels.join(' or ')}`);
  }
  if (query.infrastructureRiskMin != null) {
    withParts.push(`combined infrastructure risk ≥ ${query.infrastructureRiskMin}`);
  }

  const hasLocationOrOperator =
    (query.operator?.length ?? 0) > 0 || !!query.city || (query.states?.length ?? 0) > 0;

  if (!hasLocationOrOperator && withParts.length === 0) {
    return appendSortAndLimit('All facilities');
  }

  let description = head;
  if (withParts.length > 0) {
    description += ` with ${withParts.join(', ')}`;
  }

  return appendSortAndLimit(description);
}

