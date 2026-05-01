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
  Activity,
  RadioTower
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
  },

  // Demo BGP / network-risk (seeded fields only — no live ingestion)
  {
    id: 'bgp-highest-risk-providers',
    name: 'Highest BGP Risk Providers',
    description: 'Facilities under operators with the highest average demo BGP risk',
    icon: RadioTower,
    category: 'analysis',
    requiresFacility: false,
    execute: async () => {
      const all = await db.facilities.toArray();
      const agg = new Map<string, { sum: number; n: number }>();
      for (const f of all) {
        const op = f.operator || 'Unknown';
        const row = agg.get(op) || { sum: 0, n: 0 };
        row.sum += f.bgpRiskScore ?? 0;
        row.n += 1;
        agg.set(op, row);
      }
      const topOps = [...agg.entries()]
        .map(([operator, { sum, n }]) => ({ operator, avg: sum / Math.max(1, n) }))
        .sort((a, b) => b.avg - a.avg)
        .slice(0, 15)
        .map(r => r.operator);
      const allow = new Set(topOps);
      return all
        .filter(f => allow.has(f.operator))
        .sort((a, b) => (b.bgpRiskScore ?? 0) - (a.bgpRiskScore ?? 0))
        .slice(0, 100);
    },
  },
  {
    id: 'bgp-frequent-route-changes',
    name: 'Facilities With Frequent Route Changes',
    description: 'Highest demo route-change rates (routing instability proxy)',
    icon: RadioTower,
    category: 'tracking',
    requiresFacility: false,
    execute: async () => {
      return await db.facilities.orderBy('routeChangeRate').reverse().limit(60).toArray();
    },
  },
  {
    id: 'bgp-high-transit-dependency',
    name: 'High Transit Dependency Facilities',
    description: 'Demo transit dependency marked high',
    icon: RadioTower,
    category: 'tracking',
    requiresFacility: false,
    execute: async () => {
      const rows = await db.facilities.where('transitDependency').equals('high').toArray();
      return rows
        .sort((a, b) => (b.bgpRiskScore ?? 0) - (a.bgpRiskScore ?? 0))
        .slice(0, 60);
    },
  },
  {
    id: 'bgp-latency-anomaly-hotspots',
    name: 'Latency Anomaly Hotspots',
    description: 'Highest demo latency anomaly scores',
    icon: RadioTower,
    category: 'analysis',
    requiresFacility: false,
    execute: async () => {
      return await db.facilities.orderBy('latencyAnomalyScore').reverse().limit(60).toArray();
    },
  },
  {
    id: 'bgp-combined-compliance-routing-risk',
    name: 'Combined Compliance + Routing Risk',
    description: 'Highest infrastructure accountability risk (compliance + BGP + subsidy gap)',
    icon: RadioTower,
    category: 'analysis',
    requiresFacility: false,
    execute: async () => {
      return await db.facilities
        .orderBy('infrastructureAccountabilityRisk')
        .reverse()
        .limit(60)
        .toArray();
    },
  },
];

/** Short labels for "Showing:" above investigation results (fallback: template.description). */
const INVESTIGATION_SHOWING_LABELS: Record<string, string> = {
  'worst-offenders': 'Facilities with the largest subsidy shortfalls',
  'recent-additions': 'Recently opened facilities',
  'complete-failures': 'Facilities with severe job shortfalls',
  'highest-subsidies': 'Facilities receiving the largest subsidies',
  'major-employers': 'Facilities with major job promises',
  'gap-per-capita': 'Facilities with the worst gap per job created',
  'recent-non-compliant': 'Recently opened non-compliant facilities',
  'regional-comparison': 'Facilities in the same state as the selected site',
  'operator-track-record': 'Facilities operated by the same operator',
  'similar-scale': 'Facilities at a similar capacity scale',
  'bgp-highest-risk-providers': 'Operators with the highest demo BGP risk exposure',
  'bgp-frequent-route-changes': 'Facilities with the most frequent demo route changes',
  'bgp-high-transit-dependency': 'Facilities with high transit dependency (demo)',
  'bgp-latency-anomaly-hotspots': 'Facilities with the strongest latency anomaly signals (demo)',
  'bgp-combined-compliance-routing-risk': 'Combined compliance, BGP, and subsidy-gap accountability risk',
};

export function getInvestigationShowingLabel(template: InvestigationTemplate): string {
  return INVESTIGATION_SHOWING_LABELS[template.id] ?? template.description;
}

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

