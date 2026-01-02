/**
 * Investigation Templates
 * Pre-built queries for common compliance investigations
 * Zero AI needed - pure IndexedDB queries
 */

import { db } from '../db/database';
import { Facility } from '../types';
import {
  MapPin,
  Building,
  Scale,
  AlertTriangle,
  Calendar,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Activity
} from 'lucide-react';

export interface InvestigationTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: 'comparison' | 'tracking' | 'analysis';
  requiresFacility?: boolean; // If true, needs a facility context
  execute: (facility?: Facility) => Promise<Facility[]>;
}

/**
 * All available investigation templates
 */
export const INVESTIGATION_TEMPLATES: InvestigationTemplate[] = [
  // COMPARISON TEMPLATES
  {
    id: 'regional-comparison',
    name: 'Regional Comparison',
    description: 'Compare to other facilities in the same state',
    icon: MapPin,
    category: 'comparison',
    requiresFacility: true,
    execute: async (facility?: Facility) => {
      if (!facility) return [];
      return await db.facilities
        .where('state')
        .equals(facility.state)
        .and(f => f.id !== facility.id)
        .sortBy('subsidyGap')
        .then(results => results.reverse()); // Largest gaps first
    }
  },
  {
    id: 'operator-track-record',
    name: 'Operator Track Record',
    description: 'All facilities by this operator',
    icon: Building,
    category: 'tracking',
    requiresFacility: true,
    execute: async (facility?: Facility) => {
      if (!facility || !facility.operator) return [];
      return await db.facilities
        .where('operator')
        .equals(facility.operator)
        .sortBy('complianceStatus');
    }
  },
  {
    id: 'similar-scale',
    name: 'Similar Scale Facilities',
    description: 'Find facilities with similar capacity (±20%)',
    icon: Scale,
    category: 'comparison',
    requiresFacility: true,
    execute: async (facility?: Facility) => {
      if (!facility || !facility.capacity) return [];
      const min = facility.capacity * 0.8;
      const max = facility.capacity * 1.2;
      return await db.facilities
        .filter(f => 
          f.capacity && 
          f.capacity >= min && 
          f.capacity <= max && 
          f.id !== facility.id
        )
        .toArray();
    }
  },
  
  // TRACKING TEMPLATES (No facility required)
  {
    id: 'worst-offenders',
    name: 'Largest Subsidy Gaps',
    description: 'Top 50 facilities with biggest subsidy shortfalls',
    icon: AlertTriangle,
    category: 'tracking',
    requiresFacility: false,
    execute: async () => {
      return await db.facilities
        .orderBy('subsidyGap')
        .reverse()
        .limit(50)
        .toArray();
    }
  },
  {
    id: 'recent-additions',
    name: 'Recently Opened Facilities',
    description: 'Facilities opened in the last 2 years',
    icon: Calendar,
    category: 'tracking',
    requiresFacility: false,
    execute: async () => {
      const twoYearsAgo = new Date();
      twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
      return await db.facilities
        .where('openedDate')
        .above(twoYearsAgo.toISOString())
        .toArray();
    }
  },
  {
    id: 'complete-failures',
    name: 'Complete Job Failures',
    description: 'Facilities that created <10% of promised jobs',
    icon: TrendingDown,
    category: 'analysis',
    requiresFacility: false,
    execute: async () => {
      return await db.facilities
        .filter(f => {
          if (!f.jobsPromised || f.jobsPromised === 0) return false;
          const jobsCreated = f.jobsCreated || 0;
          const fulfillmentRate = jobsCreated / f.jobsPromised;
          return fulfillmentRate < 0.1; // Less than 10%
        })
        .toArray();
    }
  },
  {
    id: 'highest-subsidies',
    name: 'Highest Subsidy Recipients',
    description: 'Facilities that received >$100M in subsidies',
    icon: DollarSign,
    category: 'tracking',
    requiresFacility: false,
    execute: async () => {
      return await db.facilities
        .where('subsidyReceived')
        .above(100_000_000)
        .sortBy('subsidyReceived')
        .then(results => results.reverse());
    }
  },
  {
    id: 'major-employers',
    name: 'Major Employers',
    description: 'Facilities that promised >500 jobs',
    icon: Users,
    category: 'tracking',
    requiresFacility: false,
    execute: async () => {
      return await db.facilities
        .where('jobsPromised')
        .above(500)
        .sortBy('jobsPromised')
        .then(results => results.reverse());
    }
  },
  
  // ANALYSIS TEMPLATES
  {
    id: 'gap-per-capita',
    name: 'Highest Gap Per Job',
    description: 'Facilities with worst subsidy-to-jobs-created ratio',
    icon: Target,
    category: 'analysis',
    requiresFacility: false,
    execute: async () => {
      const facilities = await db.facilities.toArray();
      // Calculate gap per job created
      const withRatio = facilities
        .filter(f => (f.jobsCreated || 0) > 0 && f.subsidyGap)
        .map(f => ({
          ...f,
          gapPerJob: (f.subsidyGap || 0) / (f.jobsCreated || 1)
        }))
        .sort((a, b) => b.gapPerJob - a.gapPerJob)
        .slice(0, 50);
      
      return withRatio;
    }
  },
  {
    id: 'recent-non-compliant',
    name: 'Recent Non-Compliance',
    description: 'Facilities opened in last 3 years that are non-compliant',
    icon: Activity,
    category: 'analysis',
    requiresFacility: false,
    execute: async () => {
      const threeYearsAgo = new Date();
      threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3);
      
      return await db.facilities
        .filter(f => 
          f.openedDate && 
          new Date(f.openedDate) > threeYearsAgo &&
          f.complianceStatus === 'Non-Compliant'
        )
        .toArray();
    }
  }
];

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: 'comparison' | 'tracking' | 'analysis'): InvestigationTemplate[] {
  return INVESTIGATION_TEMPLATES.filter(t => t.category === category);
}

/**
 * Get templates that don't require a facility context
 */
export function getGlobalTemplates(): InvestigationTemplate[] {
  return INVESTIGATION_TEMPLATES.filter(t => !t.requiresFacility);
}

/**
 * Get templates that work with a facility context
 */
export function getFacilityTemplates(): InvestigationTemplate[] {
  return INVESTIGATION_TEMPLATES.filter(t => t.requiresFacility);
}

/**
 * Execute a template by ID
 */
export async function executeTemplate(
  templateId: string,
  facility?: Facility
): Promise<Facility[]> {
  const template = INVESTIGATION_TEMPLATES.find(t => t.id === templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }
  
  if (template.requiresFacility && !facility) {
    throw new Error(`Template "${template.name}" requires a facility context`);
  }
  
  return await template.execute(facility);
}

/**
 * Get template by ID
 */
export function getTemplate(templateId: string): InvestigationTemplate | undefined {
  return INVESTIGATION_TEMPLATES.find(t => t.id === templateId);
}

/**
 * Generate a summary for template results
 */
export function generateResultSummary(
  template: InvestigationTemplate,
  results: Facility[],
  facility?: Facility
): string {
  if (results.length === 0) {
    return `No facilities found matching "${template.name}"`;
  }
  
  const totalGap = results.reduce((sum, f) => sum + (f.subsidyGap || 0), 0);
  const nonCompliantCount = results.filter(f => f.complianceStatus === 'Non-Compliant').length;
  
  let summary = `Found ${results.length} facilities`;
  
  if (facility && template.requiresFacility) {
    summary += ` similar to ${facility.name}`;
  }
  
  summary += `. Total subsidy gap: $${(totalGap / 1e9).toFixed(2)}B`;
  
  if (nonCompliantCount > 0) {
    summary += `. ${nonCompliantCount} non-compliant (${((nonCompliantCount / results.length) * 100).toFixed(0)}%)`;
  }
  
  return summary;
}

