/**
 * Facility Query Executor
 * Executes structured queries against IndexedDB
 */

import { db } from '../db/database';
import { Facility } from '../types';
import type { FacilityQuery } from '../schemas/facilityQuery';

/**
 * Execute a structured facility query against IndexedDB
 */
export async function executeQuery(query: FacilityQuery): Promise<Facility[]> {
  try {
    // Start with all facilities
    let collection = db.facilities.toCollection();
    
    // Apply filters using Dexie's where clauses when possible
    // For complex filters, we'll use .filter() with custom predicates
    
    // State filter (use index)
    if (query.states && query.states.length > 0) {
      collection = db.facilities.where('state').anyOf(query.states);
    }
    
    // Compliance status filter
    if (query.complianceStatuses && query.complianceStatuses.length > 0) {
      const statusSet = new Set(query.complianceStatuses);
      collection = collection.filter(f => 
        f.complianceStatus && statusSet.has(f.complianceStatus)
      );
    }
    
    // Get all matching facilities (we'll filter more in memory)
    let facilities = await collection.toArray();
    
    // Apply remaining filters in memory
    facilities = facilities.filter(facility => {
      // Name filter (case-insensitive partial match)
      if (query.name) {
        const nameMatch = facility.name?.toLowerCase().includes(query.name.toLowerCase());
        if (!nameMatch) return false;
      }
      
      // Operator filter (case-insensitive, any match)
      if (query.operator && query.operator.length > 0) {
        const operatorMatch = query.operator.some(op => 
          facility.operator?.toLowerCase().includes(op.toLowerCase())
        );
        if (!operatorMatch) return false;
      }
      
      // City filter (case-insensitive partial match)
      if (query.city) {
        const cityMatch = facility.city?.toLowerCase().includes(query.city.toLowerCase());
        if (!cityMatch) return false;
      }
      
      // Facility type filter
      if (query.facilityTypes && query.facilityTypes.length > 0) {
        if (!facility.type || !query.facilityTypes.includes(facility.type)) {
          return false;
        }
      }
      
      // Subsidy filters
      if (query.subsidyMin !== undefined && (facility.subsidyReceived || 0) < query.subsidyMin) {
        return false;
      }
      if (query.subsidyMax !== undefined && (facility.subsidyReceived || 0) > query.subsidyMax) {
        return false;
      }
      if (query.subsidyGapMin !== undefined && (facility.subsidyGap || 0) < query.subsidyGapMin) {
        return false;
      }
      if (query.subsidyGapMax !== undefined && (facility.subsidyGap || 0) > query.subsidyGapMax) {
        return false;
      }
      
      // Jobs filters
      if (query.jobsPromisedMin !== undefined && (facility.jobsPromised || 0) < query.jobsPromisedMin) {
        return false;
      }
      if (query.jobsPromisedMax !== undefined && (facility.jobsPromised || 0) > query.jobsPromisedMax) {
        return false;
      }
      if (query.jobsCreatedMin !== undefined && (facility.jobsCreated || 0) < query.jobsCreatedMin) {
        return false;
      }
      if (query.jobsCreatedMax !== undefined && (facility.jobsCreated || 0) > query.jobsCreatedMax) {
        return false;
      }
      if (query.jobGapMin !== undefined && (facility.jobGap || 0) < query.jobGapMin) {
        return false;
      }
      if (query.jobGapMax !== undefined && (facility.jobGap || 0) > query.jobGapMax) {
        return false;
      }
      
      // Capacity filters
      if (query.capacityMin !== undefined && (facility.capacity || 0) < query.capacityMin) {
        return false;
      }
      if (query.capacityMax !== undefined && (facility.capacity || 0) > query.capacityMax) {
        return false;
      }
      
      // Date filters
      if (query.openedAfter && facility.openedDate) {
        if (new Date(facility.openedDate) <= new Date(query.openedAfter)) {
          return false;
        }
      }
      if (query.openedBefore && facility.openedDate) {
        if (new Date(facility.openedDate) >= new Date(query.openedBefore)) {
          return false;
        }
      }
      
      return true;
    });
    
    // Apply sorting
    if (query.sortBy) {
      facilities.sort((a, b) => {
        const field = query.sortBy!;
        let aVal: any = a[field];
        let bVal: any = b[field];
        
        // Handle null/undefined values
        if (aVal === null || aVal === undefined) aVal = 0;
        if (bVal === null || bVal === undefined) bVal = 0;
        
        // Compare
        let comparison = 0;
        if (typeof aVal === 'string' && typeof bVal === 'string') {
          comparison = aVal.localeCompare(bVal);
        } else if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }
        
        // Apply sort direction
        return query.sortDirection === 'desc' ? -comparison : comparison;
      });
    }
    
    // Apply limit
    if (query.limit) {
      facilities = facilities.slice(0, query.limit);
    }
    
    return facilities;
  } catch (error) {
    console.error('Query execution error:', error);
    throw new Error('Failed to execute query against database');
  }
}

/**
 * Count facilities matching a query (without limit)
 */
export async function countQuery(query: FacilityQuery): Promise<number> {
  const queryWithoutLimit = { ...query };
  delete queryWithoutLimit.limit;
  
  const results = await executeQuery(queryWithoutLimit);
  return results.length;
}

/**
 * Get query statistics
 */
export interface QueryStats {
  total: number;
  compliant: number;
  atRisk: number;
  nonCompliant: number;
  totalSubsidyGap: number;
  totalSubsidyReceived: number;
  avgJobFulfillment: number;
}

export async function getQueryStats(query: FacilityQuery): Promise<QueryStats> {
  const queryWithoutLimit = { ...query };
  delete queryWithoutLimit.limit;
  
  const facilities = await executeQuery(queryWithoutLimit);
  
  let compliant = 0;
  let atRisk = 0;
  let nonCompliant = 0;
  let totalSubsidyGap = 0;
  let totalSubsidyReceived = 0;
  let totalJobFulfillment = 0;
  let jobFulfillmentCount = 0;
  
  for (const facility of facilities) {
    if (facility.complianceStatus === 'Compliant') compliant++;
    else if (facility.complianceStatus === 'At Risk') atRisk++;
    else if (facility.complianceStatus === 'Non-Compliant') nonCompliant++;
    
    totalSubsidyGap += facility.subsidyGap || 0;
    totalSubsidyReceived += facility.subsidyReceived || 0;
    
    if (facility.jobsPromised && facility.jobsPromised > 0) {
      const fulfillment = (facility.jobsCreated || 0) / facility.jobsPromised;
      totalJobFulfillment += fulfillment;
      jobFulfillmentCount++;
    }
  }
  
  return {
    total: facilities.length,
    compliant,
    atRisk,
    nonCompliant,
    totalSubsidyGap,
    totalSubsidyReceived,
    avgJobFulfillment: jobFulfillmentCount > 0 ? totalJobFulfillment / jobFulfillmentCount : 0
  };
}

/**
 * Execute query with pagination
 */
export interface PaginatedResults {
  facilities: Facility[];
  page: number;
  pageSize: number;
  totalResults: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export async function executeQueryPaginated(
  query: FacilityQuery,
  page: number = 1,
  pageSize: number = 50
): Promise<PaginatedResults> {
  // Get all results (without limit)
  const queryWithoutLimit = { ...query };
  delete queryWithoutLimit.limit;
  
  const allResults = await executeQuery(queryWithoutLimit);
  const totalResults = allResults.length;
  const totalPages = Math.ceil(totalResults / pageSize);
  
  // Calculate pagination
  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const facilities = allResults.slice(startIndex, endIndex);
  
  return {
    facilities,
    page,
    pageSize,
    totalResults,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1
  };
}

/**
 * Test query performance
 */
export async function benchmarkQuery(query: FacilityQuery): Promise<number> {
  const startTime = performance.now();
  await executeQuery(query);
  const endTime = performance.now();
  return endTime - startTime;
}

